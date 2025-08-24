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
  AddActionRequestSchema, 
  AddActionRequest,
  ActionNodeDto,
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
 * POST /api/function-models/[modelId]/actions
 * Add an action node to a function model
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
          const validationResult = AddActionRequestSchema.safeParse(body);
          
          if (!validationResult.success) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid request data',
              HttpStatus.BAD_REQUEST,
              { validationErrors: validationResult.error.errors }
            );
          }

          const actionRequest: AddActionRequest = validationResult.data;

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

          // Verify parent node exists
          const parentNode = model.nodes.get(actionRequest.parentNodeId);
          if (!parentNode) {
            return createErrorResponse(
              ApiErrorCode.NOT_FOUND,
              'Parent node not found',
              HttpStatus.NOT_FOUND
            );
          }

          // Add action node to model
          const actionResult = model.addActionNode(
            actionRequest.parentNodeId as any, // NodeId conversion needed
            actionRequest.actionType as any,
            actionRequest.name,
            actionRequest.description,
            actionRequest.executionMode as any,
            actionRequest.priority,
            actionRequest.estimatedDuration,
            actionRequest.metadata || {},
            actionRequest.actionSpecificData || {}
          );

          if (actionResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              actionResult.error,
              HttpStatus.BAD_REQUEST
            );
          }

          // Save the updated model
          const saveResult = await repository.save(model);
          if (saveResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to save action changes',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          // Get the added action
          const addedAction = actionResult.value;
          
          // Convert to DTO
          const actionDto: ActionNodeDto = {
            actionId: addedAction.actionId.toString(),
            parentNodeId: addedAction.parentNodeId.toString(),
            actionType: addedAction.getActionType(),
            name: addedAction.name,
            description: addedAction.description,
            executionMode: addedAction.executionMode,
            executionOrder: addedAction.executionOrder,
            status: addedAction.status,
            priority: addedAction.priority,
            estimatedDuration: addedAction.estimatedDuration,
            retryPolicy: addedAction.retryPolicy.toObject(),
            raci: addedAction.raci.toObject(),
            metadata: addedAction.metadata,
            createdAt: addedAction.createdAt.toISOString(),
            updatedAt: addedAction.updatedAt.toISOString(),
            actionSpecificData: actionRequest.actionSpecificData
          };

          return createSuccessResponse(actionDto, HttpStatus.CREATED, {
            message: 'Action node added successfully'
          });

        } catch (error) {
          console.error('Add action error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to add action node',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 100, windowMs: 60000 } // 100 action additions per minute
    )
  )(request);
}

/**
 * GET /api/function-models/[modelId]/actions
 * Get all action nodes for a function model
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

          // Parse optional parent node filter
          const url = new URL(request.url);
          const parentNodeId = url.searchParams.get('parentNodeId');

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

          // Execute query with action nodes included
          const result = await queryHandler.handle({
            modelId,
            userId: user.id,
            includeNodes: false,
            includeActionNodes: true
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

          // Filter by parent node if specified
          let actionNodes = queryResult.actionNodes || [];
          if (parentNodeId) {
            actionNodes = actionNodes.filter(action => action.parentNodeId === parentNodeId);
          }

          // Convert action nodes to DTOs
          const actionDtos: ActionNodeDto[] = actionNodes.map(action => ({
            actionId: action.actionId,
            parentNodeId: action.parentNodeId,
            actionType: action.actionType,
            name: action.name,
            description: action.description,
            executionMode: action.executionMode,
            executionOrder: action.executionOrder,
            status: action.status,
            priority: action.priority,
            estimatedDuration: action.estimatedDuration,
            retryPolicy: action.retryPolicy,
            raci: action.raci,
            metadata: action.metadata,
            createdAt: action.createdAt.toISOString(),
            updatedAt: action.updatedAt.toISOString(),
            actionSpecificData: action.actionSpecificData
          }));

          return createSuccessResponse(actionDtos, HttpStatus.OK, {
            totalCount: actionDtos.length,
            modelId: queryResult.modelId,
            ...(parentNodeId && { filteredByParentNode: parentNodeId })
          });

        } catch (error) {
          console.error('Get actions error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to retrieve action nodes',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 200, windowMs: 60000 } // 200 requests per minute
    )
  )(request);
}