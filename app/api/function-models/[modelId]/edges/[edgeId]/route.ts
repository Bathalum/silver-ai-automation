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
  UpdateEdgeRequestSchema, 
  UpdateEdgeRequest,
  EdgeResponseDto,
  ApiErrorCode,
  HttpStatus
} from '@/lib/api/types';
import { createFunctionModelContainer } from '@/lib/infrastructure/di/function-model-module';
import { createClient } from '@/lib/supabase/server';
import { ServiceTokens } from '@/lib/infrastructure/di/container';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { LinkType } from '@/lib/domain/enums';

interface RouteParams {
  params: {
    modelId: string;
    edgeId: string;
  };
}

/**
 * PUT /api/function-models/[modelId]/edges/[edgeId]
 * Update an existing edge in a function model
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  return withErrorHandling(
    withRateLimit(
      withAuth(async (req: NextRequest, user: AuthenticatedUser) => {
        try {
          const { modelId, edgeId } = params;

          // Validate modelId and edgeId format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(modelId) || !uuidRegex.test(edgeId)) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid model ID or edge ID format',
              HttpStatus.BAD_REQUEST
            );
          }

          // Parse and validate request body
          const body = await request.json();
          const validationResult = UpdateEdgeRequestSchema.safeParse(body);
          
          if (!validationResult.success) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid request data',
              HttpStatus.BAD_REQUEST,
              { validationErrors: validationResult.error.errors }
            );
          }

          const updateRequest: UpdateEdgeRequest = validationResult.data;

          // Create container with dependencies
          const supabase = await createClient();
          const container = await createFunctionModelContainer(supabase);

          // Get repository to first check if model exists and user has permission
          const repositoryResult = await container.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
          if (repositoryResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to initialize service',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const repository = repositoryResult.value;

          // Check if model exists and get permissions
          const modelResult = await repository.findById(modelId);
          if (modelResult.isFailure || !modelResult.value) {
            return createErrorResponse(
              ApiErrorCode.NOT_FOUND,
              'Function model not found',
              HttpStatus.NOT_FOUND
            );
          }

          const model = modelResult.value;

          // Check if user has edit permission
          const hasEditPermission = 
            model.permissions.owner === user.id ||
            (model.permissions.editors as string[] || []).includes(user.id);

          if (!hasEditPermission) {
            return createErrorResponse(
              ApiErrorCode.FORBIDDEN,
              'Insufficient permissions to modify this model',
              HttpStatus.FORBIDDEN
            );
          }

          // Check if model is not published (can't modify published models)
          if (model.status === 'published') {
            return createErrorResponse(
              ApiErrorCode.CONFLICT,
              'Cannot modify published models',
              HttpStatus.CONFLICT
            );
          }

          // Get edge repository to check if edge exists
          const edgeRepositoryResult = await container.resolve(ServiceTokens.NODE_LINK_REPOSITORY);
          if (edgeRepositoryResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to initialize edge service',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const edgeRepository = edgeRepositoryResult.value;

          // Check if edge exists
          const edgeId_nodeId = NodeId.fromString(edgeId);
          if (edgeId_nodeId.isFailure) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid edge ID format',
              HttpStatus.BAD_REQUEST
            );
          }

          const existingEdgeResult = await edgeRepository.findById(edgeId_nodeId.value);
          if (existingEdgeResult.isFailure || !existingEdgeResult.value) {
            return createErrorResponse(
              ApiErrorCode.NOT_FOUND,
              'Edge not found',
              HttpStatus.NOT_FOUND
            );
          }

          const existingEdge = existingEdgeResult.value;

          // Verify edge belongs to the model
          if (existingEdge.linkContext?.modelId !== modelId) {
            return createErrorResponse(
              ApiErrorCode.NOT_FOUND,
              'Edge not found in this model',
              HttpStatus.NOT_FOUND
            );
          }

          // Update edge properties
          const updates: any = {};
          
          if (updateRequest.linkType) {
            const linkTypeMap: Record<string, LinkType> = {
              'dependency': LinkType.DEPENDENCY,
              'data_flow': LinkType.DATA_FLOW,
              'control_flow': LinkType.CONTROL_FLOW,
              'aggregation': LinkType.AGGREGATION,
              'composition': LinkType.COMPOSITION
            };
            
            const linkType = linkTypeMap[updateRequest.linkType];
            if (!linkType) {
              return createErrorResponse(
                ApiErrorCode.VALIDATION_ERROR,
                'Invalid link type',
                HttpStatus.BAD_REQUEST
              );
            }
            updates.linkType = linkType;
          }

          if (updateRequest.linkStrength !== undefined) {
            updates.linkStrength = updateRequest.linkStrength;
          }

          if (updateRequest.linkContext) {
            updates.linkContext = { ...existingEdge.linkContext, ...updateRequest.linkContext };
          }

          if (updateRequest.metadata) {
            updates.metadata = { ...existingEdge.metadata, ...updateRequest.metadata };
          }

          // Update the edge
          const updatedEdge = existingEdge.update(updates);
          if (updatedEdge.isFailure) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              updatedEdge.error,
              HttpStatus.BAD_REQUEST
            );
          }

          // Save the updated edge
          const saveResult = await edgeRepository.save(updatedEdge.value);
          if (saveResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to update edge',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          // Convert to response DTO
          const edgeDto: EdgeResponseDto = {
            linkId: updatedEdge.value.linkId.toString(),
            sourceNodeId: updatedEdge.value.sourceNodeId.toString(),
            targetNodeId: updatedEdge.value.targetNodeId.toString(),
            linkType: updatedEdge.value.linkType.toLowerCase(),
            linkStrength: updatedEdge.value.linkStrength,
            sourceFeature: updatedEdge.value.sourceFeature.toString(),
            targetFeature: updatedEdge.value.targetFeature.toString(),
            sourceEntityId: updatedEdge.value.sourceEntityId,
            targetEntityId: updatedEdge.value.targetEntityId,
            linkContext: updatedEdge.value.linkContext,
            isBidirectional: updatedEdge.value.isBidirectional,
            createdAt: updatedEdge.value.createdAt.toISOString(),
            updatedAt: updatedEdge.value.updatedAt.toISOString(),
            metadata: updatedEdge.value.metadata
          };

          return createSuccessResponse(edgeDto, HttpStatus.OK, {
            message: 'Edge updated successfully'
          });

        } catch (error) {
          console.error('Update edge error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to update edge',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 100, windowMs: 60000 } // 100 updates per minute
    )
  )(request);
}

/**
 * DELETE /api/function-models/[modelId]/edges/[edgeId]
 * Delete an edge from a function model
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  return withErrorHandling(
    withRateLimit(
      withAuth(async (req: NextRequest, user: AuthenticatedUser) => {
        try {
          const { modelId, edgeId } = params;

          // Validate modelId and edgeId format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(modelId) || !uuidRegex.test(edgeId)) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid model ID or edge ID format',
              HttpStatus.BAD_REQUEST
            );
          }

          // Create container with dependencies
          const supabase = await createClient();
          const container = await createFunctionModelContainer(supabase);

          // Get repository to first check if model exists and user has permission
          const repositoryResult = await container.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
          if (repositoryResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to initialize service',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const repository = repositoryResult.value;

          // Check if model exists and get permissions
          const modelResult = await repository.findById(modelId);
          if (modelResult.isFailure || !modelResult.value) {
            return createErrorResponse(
              ApiErrorCode.NOT_FOUND,
              'Function model not found',
              HttpStatus.NOT_FOUND
            );
          }

          const model = modelResult.value;

          // Check if user has edit permission
          const hasEditPermission = 
            model.permissions.owner === user.id ||
            (model.permissions.editors as string[] || []).includes(user.id);

          if (!hasEditPermission) {
            return createErrorResponse(
              ApiErrorCode.FORBIDDEN,
              'Insufficient permissions to modify this model',
              HttpStatus.FORBIDDEN
            );
          }

          // Check if model is not published (can't modify published models)
          if (model.status === 'published') {
            return createErrorResponse(
              ApiErrorCode.CONFLICT,
              'Cannot modify published models',
              HttpStatus.CONFLICT
            );
          }

          // Delete edge using proper Clean Architecture flow through use case
          const deleteEdgeUseCaseResult = await container.resolve(ServiceTokens.DELETE_EDGE_USE_CASE);
          if (deleteEdgeUseCaseResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to initialize edge deletion service',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const deleteEdgeUseCase = deleteEdgeUseCaseResult.value;

          // Convert to NodeId
          const edgeId_nodeId = NodeId.fromString(edgeId);
          if (edgeId_nodeId.isFailure) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid edge ID format',
              HttpStatus.BAD_REQUEST
            );
          }

          // Delete the edge
          const deleteResult = await deleteEdgeUseCase.execute({
            edgeId: edgeId_nodeId.value,
            modelId,
            userId: user.id
          });

          if (deleteResult.isFailure) {
            const errorCode = deleteResult.error.includes('not found') 
              ? ApiErrorCode.NOT_FOUND 
              : ApiErrorCode.INTERNAL_ERROR;
            
            const status = deleteResult.error.includes('not found')
              ? HttpStatus.NOT_FOUND
              : HttpStatus.INTERNAL_SERVER_ERROR;

            return createErrorResponse(errorCode, deleteResult.error, status);
          }

          return createSuccessResponse(null, HttpStatus.NO_CONTENT, {
            message: 'Edge deleted successfully'
          });

        } catch (error) {
          console.error('Delete edge error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to delete edge',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 100, windowMs: 60000 } // 100 deletions per minute
    )
  )(request);
}

/**
 * GET /api/function-models/[modelId]/edges/[edgeId]
 * Get a specific edge by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  return withErrorHandling(
    withRateLimit(
      withAuth(async (req: NextRequest, user: AuthenticatedUser) => {
        try {
          const { modelId, edgeId } = params;

          // Validate modelId and edgeId format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(modelId) || !uuidRegex.test(edgeId)) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid model ID or edge ID format',
              HttpStatus.BAD_REQUEST
            );
          }

          // Create container with dependencies
          const supabase = await createClient();
          const container = await createFunctionModelContainer(supabase);

          // Get repository to first check if model exists and user has permission
          const repositoryResult = await container.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
          if (repositoryResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to initialize service',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const repository = repositoryResult.value;

          // Check if model exists and get permissions
          const modelResult = await repository.findById(modelId);
          if (modelResult.isFailure || !modelResult.value) {
            return createErrorResponse(
              ApiErrorCode.NOT_FOUND,
              'Function model not found',
              HttpStatus.NOT_FOUND
            );
          }

          const model = modelResult.value;

          // Check if user has read permission
          const hasReadPermission = 
            model.permissions.owner === user.id ||
            (model.permissions.editors as string[] || []).includes(user.id) ||
            (model.permissions.viewers as string[] || []).includes(user.id);

          if (!hasReadPermission) {
            return createErrorResponse(
              ApiErrorCode.FORBIDDEN,
              'Insufficient permissions to view this model',
              HttpStatus.FORBIDDEN
            );
          }

          // Get edge repository
          const edgeRepositoryResult = await container.resolve(ServiceTokens.NODE_LINK_REPOSITORY);
          if (edgeRepositoryResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to initialize edge service',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const edgeRepository = edgeRepositoryResult.value;

          // Get the edge
          const edgeId_nodeId = NodeId.fromString(edgeId);
          if (edgeId_nodeId.isFailure) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid edge ID format',
              HttpStatus.BAD_REQUEST
            );
          }

          const edgeResult = await edgeRepository.findById(edgeId_nodeId.value);
          if (edgeResult.isFailure || !edgeResult.value) {
            return createErrorResponse(
              ApiErrorCode.NOT_FOUND,
              'Edge not found',
              HttpStatus.NOT_FOUND
            );
          }

          const edge = edgeResult.value;

          // Verify edge belongs to the model
          if (edge.linkContext?.modelId !== modelId) {
            return createErrorResponse(
              ApiErrorCode.NOT_FOUND,
              'Edge not found in this model',
              HttpStatus.NOT_FOUND
            );
          }

          // Convert to response DTO
          const edgeDto: EdgeResponseDto = {
            linkId: edge.linkId.toString(),
            sourceNodeId: edge.sourceNodeId.toString(),
            targetNodeId: edge.targetNodeId.toString(),
            linkType: edge.linkType.toLowerCase(),
            linkStrength: edge.linkStrength,
            sourceFeature: edge.sourceFeature.toString(),
            targetFeature: edge.targetFeature.toString(),
            sourceEntityId: edge.sourceEntityId,
            targetEntityId: edge.targetEntityId,
            linkContext: edge.linkContext,
            isBidirectional: edge.isBidirectional,
            createdAt: edge.createdAt.toISOString(),
            updatedAt: edge.updatedAt.toISOString(),
            metadata: edge.metadata
          };

          return createSuccessResponse(edgeDto, HttpStatus.OK);

        } catch (error) {
          console.error('Get edge error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to retrieve edge',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 200, windowMs: 60000 } // 200 requests per minute
    )
  )(request);
}