import { NextRequest } from 'next/server';
import { 
  withAuth, 
  withErrorHandling, 
  withRateLimit,
  createSuccessResponse,
  createErrorResponse,
  AuthenticatedUser
} from '@/lib/api/middleware';
import { 
  PublishModelRequestSchema, 
  PublishModelRequest,
  ApiErrorCode,
  HttpStatus
} from '@/lib/api/types';
import { createFunctionModelContainer } from '@/lib/infrastructure/di/function-model-module';
import { createClient } from '@/lib/supabase/server';
import { ServiceTokens } from '@/lib/infrastructure/di/container';

interface RouteParams {
  params: {
    modelId: string;
  };
}

/**
 * POST /api/function-models/[modelId]/publish
 * Publish a function model to production
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  return withErrorHandling(
    withRateLimit(
      withAuth(async (req: NextRequest, user: AuthenticatedUser) => {
        try {
          const { modelId } = params;

          // Validate modelId format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(modelId)) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid model ID format',
              HttpStatus.BAD_REQUEST
            );
          }

          // Parse and validate request body
          const body = await request.json();
          const validationResult = PublishModelRequestSchema.safeParse(body);
          
          if (!validationResult.success) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid request data',
              HttpStatus.BAD_REQUEST,
              { validationErrors: validationResult.error.errors }
            );
          }

          const publishRequest: PublishModelRequest = validationResult.data;

          // Create container with dependencies
          const supabase = await createClient();
          const container = await createFunctionModelContainer(supabase);

          // Resolve use case
          const publishUseCaseResult = await container.resolve(ServiceTokens.PUBLISH_FUNCTION_MODEL_USE_CASE);
          if (publishUseCaseResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to initialize service',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const publishUseCase = publishUseCaseResult.value;

          // Execute use case
          const result = await publishUseCase.execute({
            modelId,
            version: publishRequest.version,
            userId: user.id,
            publishNotes: publishRequest.publishNotes
          });

          if (result.isFailure) {
            // Determine appropriate error response
            let errorCode = ApiErrorCode.INTERNAL_ERROR;
            let status = HttpStatus.INTERNAL_SERVER_ERROR;

            if (result.error.includes('not found')) {
              errorCode = ApiErrorCode.NOT_FOUND;
              status = HttpStatus.NOT_FOUND;
            } else if (result.error.includes('permission') || result.error.includes('forbidden')) {
              errorCode = ApiErrorCode.FORBIDDEN;
              status = HttpStatus.FORBIDDEN;
            } else if (result.error.includes('validation') || result.error.includes('invalid')) {
              errorCode = ApiErrorCode.VALIDATION_ERROR;
              status = HttpStatus.BAD_REQUEST;
            } else if (result.error.includes('already published')) {
              errorCode = ApiErrorCode.CONFLICT;
              status = HttpStatus.CONFLICT;
            }

            return createErrorResponse(errorCode, result.error, status);
          }

          // Convert domain model to DTO
          const model = result.value;
          const modelDto = {
            modelId: model.modelId,
            name: model.name.toString(),
            description: model.description,
            version: model.version.toString(),
            status: model.status,
            currentVersion: model.currentVersion.toString(),
            versionCount: model.versionCount,
            metadata: model.metadata,
            permissions: {
              owner: model.permissions.owner as string,
              editors: (model.permissions.editors as string[]) || [],
              viewers: (model.permissions.viewers as string[]) || []
            },
            createdAt: model.createdAt.toISOString(),
            updatedAt: model.updatedAt.toISOString(),
            lastSavedAt: model.lastSavedAt.toISOString(),
            publishedAt: new Date().toISOString() // Current timestamp as published time
          };

          return createSuccessResponse(modelDto, HttpStatus.OK, {
            message: `Function model published successfully as version ${publishRequest.version}`
          });

        } catch (error) {
          console.error('Publish model error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to publish function model',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 10, windowMs: 60000 } // 10 publishes per minute
    )
  )(request);
}