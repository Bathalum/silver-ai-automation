import { NextRequest } from 'next/server';
import { 
  withAuth, 
  withValidation, 
  withErrorHandling, 
  withRateLimit,
  createSuccessResponse,
  createErrorResponse,
  AuthenticatedUser
} from '@/lib/api/middleware';
import { 
  CreateModelRequestSchema, 
  CreateModelRequest,
  ListModelsQuerySchema,
  ListModelsQuery,
  ModelDto,
  ApiErrorCode,
  HttpStatus
} from '@/lib/api/types';
import { createFunctionModelContainer } from '@/lib/infrastructure/di/function-model-module';
import { createClient } from '@/lib/supabase/server';
import { ServiceTokens } from '@/lib/infrastructure/di/container';

/**
 * POST /api/function-models
 * Create a new function model
 */
export const POST = withErrorHandling(
  withRateLimit(
    withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
      try {
        // Parse and validate request body
        const body = await request.json();
        const validationResult = CreateModelRequestSchema.safeParse(body);
        
        if (!validationResult.success) {
          return createErrorResponse(
            ApiErrorCode.VALIDATION_ERROR,
            'Invalid request data',
            HttpStatus.BAD_REQUEST,
            { validationErrors: validationResult.error.errors }
          );
        }

        const createRequest: CreateModelRequest = validationResult.data;

        // Create container with dependencies
        const supabase = await createClient();
        const container = await createFunctionModelContainer(supabase);

        // Resolve use case
        const createUseCaseResult = await container.resolve(ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE);
        if (createUseCaseResult.isFailure) {
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to initialize service',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }

        const createUseCase = createUseCaseResult.value;

        // Execute use case
        const result = await createUseCase.execute({
          name: createRequest.name,
          description: createRequest.description,
          templateId: createRequest.templateId,
          userId: user.id
        });

        if (result.isFailure) {
          // Determine appropriate error code and status
          const errorCode = result.error.includes('already exists') 
            ? ApiErrorCode.CONFLICT 
            : ApiErrorCode.VALIDATION_ERROR;
          const status = result.error.includes('already exists') 
            ? HttpStatus.CONFLICT 
            : HttpStatus.BAD_REQUEST;

          return createErrorResponse(errorCode, result.error, status);
        }

        // Convert domain model to DTO
        const model = result.value;
        const modelDto: ModelDto = {
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
          lastSavedAt: model.lastSavedAt.toISOString()
        };

        return createSuccessResponse(modelDto, HttpStatus.CREATED);

      } catch (error) {
        console.error('Create model error:', error);
        return createErrorResponse(
          ApiErrorCode.INTERNAL_ERROR,
          'Failed to create function model',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }),
    { maxRequests: 20, windowMs: 60000 } // 20 creates per minute
  )
);

/**
 * GET /api/function-models
 * List function models for the authenticated user
 */
const getHandler = withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
      try {
        // Parse and validate query parameters
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const validationResult = ListModelsQuerySchema.safeParse(queryParams);

        if (!validationResult.success) {
          return createErrorResponse(
            ApiErrorCode.VALIDATION_ERROR,
            'Invalid query parameters',
            HttpStatus.BAD_REQUEST,
            { validationErrors: validationResult.error.errors }
          );
        }

        const query: ListModelsQuery = validationResult.data;

        // Create container with dependencies
        const supabase = await createClient();
        const container = await createFunctionModelContainer(supabase);

        // Resolve list query handler
        const queryHandlerResult = await container.resolve(ServiceTokens.LIST_FUNCTION_MODELS_QUERY_HANDLER);
        if (queryHandlerResult.isFailure) {
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to initialize service',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }

        const queryHandler = queryHandlerResult.value;

        // Build query
        const listQuery = {
          userId: user.id,
          status: query.status ? [query.status] : undefined,
          searchTerm: query.search,
          limit: query.pageSize,
          offset: (query.page - 1) * query.pageSize,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder
        };

        // Execute query
        const result = await queryHandler.handle(listQuery);
        if (result.isFailure) {
          return createErrorResponse(
            ApiErrorCode.DATABASE_ERROR,
            'Failed to retrieve function models',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }

        const queryResult = result.value;
        const models = queryResult.models;

        // Convert to DTOs
        const modelDtos: ModelDto[] = models.map(model => ({
          modelId: model.modelId,
          name: model.name,
          description: model.description,
          version: model.version,
          status: model.status,
          currentVersion: model.currentVersion,
          versionCount: model.versionCount,
          metadata: model.metadata,
          permissions: model.permissions,
          createdAt: model.createdAt.toISOString(),
          updatedAt: model.updatedAt.toISOString(),
          lastSavedAt: model.lastSavedAt.toISOString()
        }));

        return createSuccessResponse({
          models: modelDtos,
          pagination: queryResult.pagination
        }, HttpStatus.OK);

      } catch (error) {
        console.error('List models error:', error);
        return createErrorResponse(
          ApiErrorCode.INTERNAL_ERROR,
          'Failed to retrieve function models',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    });

export const GET = withErrorHandling(
  withRateLimit(
    getHandler,
    { maxRequests: 100, windowMs: 60000 } // 100 reads per minute
  )
);