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
  AddNodeRequestSchema, 
  AddNodeRequest,
  NodeDto,
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
 * POST /api/function-models/[modelId]/nodes
 * Add a container node to a function model
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
          const validationResult = AddNodeRequestSchema.safeParse(body);
          
          if (!validationResult.success) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid request data',
              HttpStatus.BAD_REQUEST,
              { validationErrors: validationResult.error.errors }
            );
          }

          const nodeRequest: AddNodeRequest = validationResult.data;

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

          // Add node to model (this would typically involve a use case)
          // For now, we'll directly manipulate the model - in a real implementation,
          // you'd have an AddContainerNodeUseCase
          const nodeResult = model.addContainerNode(
            nodeRequest.nodeType as any,
            nodeRequest.name,
            {
              x: nodeRequest.position.x,
              y: nodeRequest.position.y
            },
            nodeRequest.description,
            nodeRequest.metadata || {},
            nodeRequest.typeSpecificData || {}
          );

          if (nodeResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              nodeResult.error,
              HttpStatus.BAD_REQUEST
            );
          }

          // Save the updated model
          const saveResult = await repository.save(model);
          if (saveResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to save node changes',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          // Get the added node
          const addedNode = nodeResult.value;
          
          // Convert to DTO
          const nodeDto: NodeDto = {
            nodeId: addedNode.nodeId.toString(),
            nodeType: addedNode.getNodeType(),
            name: addedNode.name,
            description: addedNode.description,
            position: addedNode.position.toObject(),
            dependencies: addedNode.dependencies.map(dep => dep.toString()),
            status: addedNode.status,
            metadata: addedNode.metadata,
            visualProperties: addedNode.visualProperties,
            createdAt: addedNode.createdAt.toISOString(),
            updatedAt: addedNode.updatedAt.toISOString(),
            typeSpecificData: nodeRequest.typeSpecificData
          };

          return createSuccessResponse(nodeDto, HttpStatus.CREATED, {
            message: 'Container node added successfully'
          });

        } catch (error) {
          console.error('Add node error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to add container node',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 100, windowMs: 60000 } // 100 node additions per minute
    )
  )(request);
}

/**
 * GET /api/function-models/[modelId]/nodes
 * Get all nodes for a function model
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

          // Resolve query handler
          const queryHandlerResult = await container.resolve(ServiceTokens.GET_FUNCTION_MODEL_QUERY_HANDLER);
          if (queryHandlerResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to initialize service',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const queryHandler = queryHandlerResult.value;

          // Execute query with nodes included
          const result = await queryHandler.handle({
            modelId,
            userId: user.id,
            includeNodes: true,
            includeActionNodes: false
          });

          if (result.isFailure) {
            const errorCode = result.error.includes('not found') 
              ? ApiErrorCode.NOT_FOUND 
              : result.error.includes('permission') 
              ? ApiErrorCode.FORBIDDEN
              : ApiErrorCode.INTERNAL_ERROR;
            
            const status = result.error.includes('not found')
              ? HttpStatus.NOT_FOUND
              : result.error.includes('permission')
              ? HttpStatus.FORBIDDEN
              : HttpStatus.INTERNAL_SERVER_ERROR;

            return createErrorResponse(errorCode, result.error, status);
          }

          const queryResult = result.value;

          // Convert nodes to DTOs
          const nodeDtos: NodeDto[] = (queryResult.nodes || []).map(node => ({
            nodeId: node.nodeId,
            nodeType: node.nodeType,
            name: node.name,
            description: node.description,
            position: node.position,
            dependencies: node.dependencies,
            status: node.status,
            metadata: node.metadata,
            visualProperties: node.visualProperties,
            createdAt: node.createdAt.toISOString(),
            updatedAt: node.updatedAt.toISOString(),
            typeSpecificData: node.typeSpecificData
          }));

          return createSuccessResponse(nodeDtos, HttpStatus.OK, {
            totalCount: nodeDtos.length,
            modelId: queryResult.modelId
          });

        } catch (error) {
          console.error('Get nodes error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to retrieve nodes',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 200, windowMs: 60000 } // 200 requests per minute
    )
  )(request);
}