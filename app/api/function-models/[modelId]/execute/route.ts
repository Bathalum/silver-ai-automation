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
  ExecuteWorkflowRequestSchema,
  ExecuteWorkflowRequest,
  WorkflowExecutionDto,
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
 * POST /api/function-models/[modelId]/execute
 * Execute a function model workflow
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
          const validationResult = ExecuteWorkflowRequestSchema.safeParse(body);
          
          if (!validationResult.success) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid execution request data',
              HttpStatus.BAD_REQUEST,
              { validationErrors: validationResult.error.errors }
            );
          }

          const executeRequest: ExecuteWorkflowRequest = validationResult.data;

          // Create container with dependencies
          const supabase = await createClient();
          const container = await createFunctionModelContainer(supabase);

          // Get repository to check model exists and user has permission
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

          // Check if user has execution permission (owner, editor, or viewer can execute)
          const hasExecutePermission = 
            model.permissions.owner === user.id ||
            (model.permissions.editors as string[] || []).includes(user.id) ||
            (model.permissions.viewers as string[] || []).includes(user.id);

          if (!hasExecutePermission) {
            return createErrorResponse(
              ApiErrorCode.FORBIDDEN,
              'Insufficient permissions to execute this model',
              HttpStatus.FORBIDDEN
            );
          }

          // Check if model is published (only published models can be executed)
          if (model.status !== 'published') {
            return createErrorResponse(
              ApiErrorCode.CONFLICT,
              'Only published models can be executed',
              HttpStatus.CONFLICT
            );
          }

          // For demonstration, we'll simulate workflow execution
          // In a real implementation, you would:
          // 1. Resolve an ExecuteWorkflowUseCase
          // 2. Create a workflow execution context
          // 3. Process nodes in dependency order
          // 4. Handle parallel/sequential execution modes
          // 5. Store execution state and results

          const executionId = crypto.randomUUID();
          const startTime = new Date();

          // Simulate execution logic
          const nodes = Array.from(model.nodes.values());
          const actionNodes = Array.from(model.actionNodes.values());

          // Calculate estimated duration
          const estimatedDuration = actionNodes.reduce((sum, action) => {
            return sum + (action.estimatedDuration || 0);
          }, 0);

          // Create execution steps based on nodes and actions
          const executionSteps = nodes.map(node => {
            const nodeActions = actionNodes.filter(action => 
              action.parentNodeId.toString() === node.nodeId.toString()
            );

            return {
              stepId: crypto.randomUUID(),
              nodeId: node.nodeId.toString(),
              nodeName: node.name,
              nodeType: node.getNodeType(),
              actions: nodeActions.map(action => ({
                actionId: action.actionId.toString(),
                actionName: action.name,
                actionType: action.getActionType(),
                status: 'pending' as const,
                estimatedDuration: action.estimatedDuration
              })),
              status: 'pending' as const,
              startedAt: null,
              completedAt: null
            };
          });

          // In async mode, we would store this execution and return immediately
          // In sync mode, we would process the execution and return results
          const isAsyncExecution = executeRequest.executionMode === 'async';

          if (isAsyncExecution) {
            // Store execution state in database for async processing
            const supabase = await createClient();
            
            const executionRecord = {
              execution_id: executionId,
              model_id: modelId,
              user_id: user.id,
              status: 'running',
              input_data: executeRequest.inputData,
              execution_context: executeRequest.executionContext,
              started_at: startTime.toISOString(),
              estimated_duration: estimatedDuration,
              execution_steps: executionSteps,
              metadata: {
                dryRun: executeRequest.dryRun,
                executionMode: executeRequest.executionMode,
                priority: executeRequest.priority || 'normal'
              }
            };

            const { error: insertError } = await supabase
              .from('workflow_executions')
              .insert(executionRecord);

            if (insertError) {
              console.error('Failed to store execution:', insertError);
              return createErrorResponse(
                ApiErrorCode.INTERNAL_ERROR,
                'Failed to initialize workflow execution',
                HttpStatus.INTERNAL_SERVER_ERROR
              );
            }

            // Return execution started response
            const executionDto: WorkflowExecutionDto = {
              executionId,
              modelId,
              status: 'running',
              startedAt: startTime.toISOString(),
              estimatedDuration,
              progress: {
                totalSteps: executionSteps.length,
                completedSteps: 0,
                currentStep: executionSteps[0]?.stepId || null,
                percentage: 0
              },
              inputData: executeRequest.inputData,
              executionContext: executeRequest.executionContext,
              metadata: {
                dryRun: executeRequest.dryRun || false,
                executionMode: executeRequest.executionMode,
                priority: executeRequest.priority || 'normal'
              }
            };

            return createSuccessResponse(executionDto, HttpStatus.ACCEPTED, {
              message: 'Workflow execution started',
              executionUrl: `/api/function-models/${modelId}/executions/${executionId}`
            });

          } else {
            // Synchronous execution (simulate for demonstration)
            // In a real implementation, this would process each step
            
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing

            const completedAt = new Date();
            const actualDuration = (completedAt.getTime() - startTime.getTime()) / 1000 / 60; // minutes

            const executionDto: WorkflowExecutionDto = {
              executionId,
              modelId,
              status: executeRequest.dryRun ? 'dry_run_completed' : 'completed',
              startedAt: startTime.toISOString(),
              completedAt: completedAt.toISOString(),
              actualDuration,
              estimatedDuration,
              progress: {
                totalSteps: executionSteps.length,
                completedSteps: executionSteps.length,
                currentStep: null,
                percentage: 100
              },
              results: {
                success: true,
                outputData: executeRequest.dryRun ? 
                  { message: 'Dry run completed successfully', simulatedResults: true } :
                  { message: 'Workflow executed successfully', processedNodes: nodes.length },
                executionSummary: {
                  totalNodes: nodes.length,
                  totalActions: actionNodes.length,
                  successfulActions: actionNodes.length,
                  failedActions: 0
                }
              },
              inputData: executeRequest.inputData,
              executionContext: executeRequest.executionContext,
              metadata: {
                dryRun: executeRequest.dryRun || false,
                executionMode: executeRequest.executionMode,
                priority: executeRequest.priority || 'normal'
              }
            };

            return createSuccessResponse(executionDto, HttpStatus.OK, {
              message: executeRequest.dryRun ? 
                'Dry run completed successfully' : 
                'Workflow executed successfully'
            });
          }

        } catch (error) {
          console.error('Execute workflow error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to execute workflow',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 10, windowMs: 60000 } // 10 executions per minute
    )
  )(request);
}

/**
 * GET /api/function-models/[modelId]/execute
 * Get execution status and results
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
          const url = new URL(request.url);
          const executionId = url.searchParams.get('executionId');

          if (!executionId) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Execution ID is required',
              HttpStatus.BAD_REQUEST
            );
          }

          // Validate modelId format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(modelId) || !uuidRegex.test(executionId)) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid ID format',
              HttpStatus.BAD_REQUEST
            );
          }

          // Get execution from database
          const supabase = await createClient();
          
          const { data: execution, error } = await supabase
            .from('workflow_executions')
            .select('*')
            .eq('execution_id', executionId)
            .eq('model_id', modelId)
            .eq('user_id', user.id)
            .single();

          if (error || !execution) {
            return createErrorResponse(
              ApiErrorCode.NOT_FOUND,
              'Execution not found',
              HttpStatus.NOT_FOUND
            );
          }

          // Convert to DTO
          const executionDto: WorkflowExecutionDto = {
            executionId: execution.execution_id,
            modelId: execution.model_id,
            status: execution.status,
            startedAt: execution.started_at,
            completedAt: execution.completed_at,
            actualDuration: execution.actual_duration,
            estimatedDuration: execution.estimated_duration,
            progress: execution.progress || {
              totalSteps: 0,
              completedSteps: 0,
              currentStep: null,
              percentage: 0
            },
            results: execution.results,
            inputData: execution.input_data,
            executionContext: execution.execution_context,
            metadata: execution.metadata,
            errorDetails: execution.error_details
          };

          return createSuccessResponse(executionDto, HttpStatus.OK);

        } catch (error) {
          console.error('Get execution status error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to retrieve execution status',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 200, windowMs: 60000 } // 200 status checks per minute
    )
  )(request);
}