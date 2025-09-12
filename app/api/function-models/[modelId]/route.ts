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
  UpdateModelRequestSchema, 
  UpdateModelRequest,
  GetModelQuerySchema,
  GetModelQuery,
  ModelDto,
  NodeDto,
  ActionNodeDto,
  ModelStatisticsDto,
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
 * GET /api/function-models/[modelId]
 * Get a specific function model
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { modelId } = params;
    const url = new URL(request.url);
    
    // Parse query parameters
    const includeNodes = url.searchParams.get('includeNodes') === 'true';
    const includeActionNodes = url.searchParams.get('includeActionNodes') === 'true';
    const includeStatistics = url.searchParams.get('includeStatistics') === 'true';

    // Return mock data for now
    const mockModel: ModelDto & { 
      nodes?: any[]; 
      actionNodes?: any[]; 
      statistics?: any; 
    } = {
      modelId: modelId,
      name: `Test Model ${modelId}`,
      description: 'Mock model for testing workflow designer',
      version: '1.0.0',
      status: 'draft',
      currentVersion: '1.0.0',
      versionCount: 1,
      metadata: {
        category: 'Test',
        tags: ['mock', 'testing'],
        author: 'System'
      },
      permissions: {
        owner: 'test-user',
        editors: [],
        viewers: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString()
    };

    // Add optional data based on query parameters
    if (includeNodes) {
      mockModel.nodes = [
        {
          id: 'node-1',
          type: 'input',
          position: { x: 100, y: 100 },
          data: { label: 'Input Node', dataType: 'string' }
        }
      ];
    }

    if (includeActionNodes) {
      mockModel.actionNodes = [
        { id: 'action-1', type: 'trigger', name: 'Start Process', enabled: true }
      ];
    }

    if (includeStatistics) {
      mockModel.statistics = {
        totalExecutions: 42,
        successfulExecutions: 38,
        failedExecutions: 4,
        averageExecutionTime: 2.5,
        lastExecutedAt: new Date(Date.now() - 3600000).toISOString()
      };
    }

    return createSuccessResponse(mockModel, HttpStatus.OK);

  } catch (error) {
    console.error('Get model error:', error);
    return createErrorResponse(
      ApiErrorCode.INTERNAL_ERROR,
      'Failed to retrieve function model',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * PUT /api/function-models/[modelId]
 * Update a function model
 */
export async function PUT(
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
          const validationResult = UpdateModelRequestSchema.safeParse(body);
          
          if (!validationResult.success) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid request data',
              HttpStatus.BAD_REQUEST,
              { validationErrors: validationResult.error.errors }
            );
          }

          const updateRequest: UpdateModelRequest = validationResult.data;

          // Create container with dependencies
          const supabase = await createClient();
          const container = await createFunctionModelContainer(supabase);

          // Resolve use case
          const updateUseCaseResult = await container.resolve(ServiceTokens.UPDATE_FUNCTION_MODEL_USE_CASE);
          if (updateUseCaseResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to initialize service',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const updateUseCase = updateUseCaseResult.value;

          // Execute use case
          const result = await updateUseCase.execute({
            modelId,
            name: updateRequest.name,
            description: updateRequest.description,
            metadata: updateRequest.metadata,
            userId: user.id
          });

          if (result.isFailure) {
            const errorCode = result.error.includes('not found') 
              ? ApiErrorCode.NOT_FOUND 
              : result.error.includes('permission') 
              ? ApiErrorCode.FORBIDDEN
              : ApiErrorCode.VALIDATION_ERROR;
            
            const status = result.error.includes('not found')
              ? HttpStatus.NOT_FOUND
              : result.error.includes('permission')
              ? HttpStatus.FORBIDDEN
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

          return createSuccessResponse(modelDto, HttpStatus.OK);

        } catch (error) {
          console.error('Update model error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to update function model',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 50, windowMs: 60000 } // 50 updates per minute
    )
  )(request);
}

/**
 * DELETE /api/function-models/[modelId]
 * Delete (soft delete) a function model
 */
export async function DELETE(
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

          // Create container with dependencies
          const supabase = await createClient();
          const container = await createFunctionModelContainer(supabase);

          // Resolve repository for delete operation
          const repositoryResult = await container.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
          if (repositoryResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to initialize service',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const repository = repositoryResult.value;

          // Check if model exists and user has permission
          const modelResult = await repository.findById(modelId);
          if (modelResult.isFailure || !modelResult.value) {
            return createErrorResponse(
              ApiErrorCode.NOT_FOUND,
              'Function model not found',
              HttpStatus.NOT_FOUND
            );
          }

          const model = modelResult.value;

          // Check ownership (only owner can delete)
          if (model.permissions.owner !== user.id) {
            return createErrorResponse(
              ApiErrorCode.FORBIDDEN,
              'Only the owner can delete this model',
              HttpStatus.FORBIDDEN
            );
          }

          // Perform soft delete
          const deleteResult = await repository.delete(modelId);
          if (deleteResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to delete function model',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          return createSuccessResponse(
            { message: 'Function model deleted successfully' }, 
            HttpStatus.NO_CONTENT
          );

        } catch (error) {
          console.error('Delete model error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to delete function model',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 10, windowMs: 60000 } // 10 deletes per minute
    )
  )(request);
}