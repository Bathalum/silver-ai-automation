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
  CreateEdgeRequestSchema, 
  CreateEdgeRequest,
  EdgeResponseDto,
  ApiErrorCode,
  HttpStatus
} from '@/lib/api/types';
import { createFunctionModelContainer } from '@/lib/infrastructure/di/function-model-module';
import { createClient } from '@/lib/supabase/server';
import { ServiceTokens } from '@/lib/infrastructure/di/container';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { FeatureType, LinkType } from '@/lib/domain/enums';

interface RouteParams {
  params: {
    modelId: string;
  };
}

/**
 * POST /api/function-models/[modelId]/edges
 * Create a new edge between nodes in a function model
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
          const validationResult = CreateEdgeRequestSchema.safeParse(body);
          
          if (!validationResult.success) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid request data',
              HttpStatus.BAD_REQUEST,
              { validationErrors: validationResult.error.errors }
            );
          }

          const edgeRequest: CreateEdgeRequest = validationResult.data;

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

          // Create edge using proper Clean Architecture flow through use case
          const createEdgeUseCaseResult = await container.resolve(ServiceTokens.CREATE_EDGE_USE_CASE);
          if (createEdgeUseCaseResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to initialize edge creation service',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const createEdgeUseCase = createEdgeUseCaseResult.value;

          // Convert API types to domain types
          const sourceNodeId = NodeId.fromString(edgeRequest.sourceNodeId);
          const targetNodeId = NodeId.fromString(edgeRequest.targetNodeId);
          
          if (sourceNodeId.isFailure || targetNodeId.isFailure) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid node ID format',
              HttpStatus.BAD_REQUEST
            );
          }

          // Convert string linkType to domain enum
          const linkTypeMap: Record<string, LinkType> = {
            'dependency': LinkType.DEPENDENCY,
            'data_flow': LinkType.DATA_FLOW,
            'control_flow': LinkType.CONTROL_FLOW,
            'aggregation': LinkType.AGGREGATION,
            'composition': LinkType.COMPOSITION
          };

          const linkType = linkTypeMap[edgeRequest.linkType];
          if (!linkType) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid link type',
              HttpStatus.BAD_REQUEST
            );
          }

          // Create the edge
          const edgeResult = await createEdgeUseCase.execute({
            sourceNodeId: sourceNodeId.value,
            targetNodeId: targetNodeId.value,
            linkType,
            linkStrength: edgeRequest.linkStrength,
            linkContext: { ...edgeRequest.linkContext, modelId },
            metadata: edgeRequest.metadata || {}
          });

          if (edgeResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              edgeResult.error,
              HttpStatus.BAD_REQUEST
            );
          }

          const createdEdge = edgeResult.value;
          
          // Convert to response DTO
          const edgeDto: EdgeResponseDto = {
            linkId: createdEdge.linkId.toString(),
            sourceNodeId: createdEdge.sourceNodeId.toString(),
            targetNodeId: createdEdge.targetNodeId.toString(),
            linkType: edgeRequest.linkType,
            linkStrength: createdEdge.linkStrength,
            sourceFeature: createdEdge.sourceFeature.toString(),
            targetFeature: createdEdge.targetFeature.toString(),
            sourceEntityId: createdEdge.sourceEntityId,
            targetEntityId: createdEdge.targetEntityId,
            linkContext: createdEdge.linkContext,
            isBidirectional: createdEdge.isBidirectional,
            createdAt: createdEdge.createdAt.toISOString(),
            updatedAt: createdEdge.updatedAt.toISOString(),
            metadata: createdEdge.metadata
          };

          return createSuccessResponse(edgeDto, HttpStatus.CREATED, {
            message: 'Edge created successfully'
          });

        } catch (error) {
          console.error('Create edge error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to create edge',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 100, windowMs: 60000 } // 100 edge creations per minute
    )
  )(request);
}

/**
 * GET /api/function-models/[modelId]/edges
 * Get all edges for a function model
 */
export async function GET(
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

          // Get edges using query handler
          const queryHandlerResult = await container.resolve(ServiceTokens.GET_MODEL_EDGES_QUERY_HANDLER);
          if (queryHandlerResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to initialize query service',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const queryHandler = queryHandlerResult.value;

          // Execute query to get edges
          const edgesResult = await queryHandler.handle({ modelId });

          if (edgesResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              edgesResult.error,
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const edges = edgesResult.value;

          // Convert to response DTOs
          const edgeDtos: EdgeResponseDto[] = edges.map(edge => ({
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
          }));

          return createSuccessResponse(edgeDtos, HttpStatus.OK, {
            totalCount: edgeDtos.length,
            modelId
          });

        } catch (error) {
          console.error('Get edges error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to retrieve edges',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 200, windowMs: 60000 } // 200 requests per minute
    )
  )(request);
}