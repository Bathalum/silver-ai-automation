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
 * GET /api/function-models/[modelId]/statistics
 * Get comprehensive statistics for a function model
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

          // Execute query to get full model details
          const result = await queryHandler.handle({
            modelId,
            userId: user.id,
            includeNodes: true,
            includeActionNodes: true,
            includeStatistics: true
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

          // Calculate comprehensive statistics
          const nodes = queryResult.nodes || [];
          const actionNodes = queryResult.actionNodes || [];

          // Node type breakdown
          const nodeTypeBreakdown = nodes.reduce((acc, node) => {
            acc[node.nodeType] = (acc[node.nodeType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          // Action type breakdown
          const actionTypeBreakdown = actionNodes.reduce((acc, action) => {
            acc[action.actionType] = (acc[action.actionType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          // Calculate complexity metrics
          const totalConnections = nodes.reduce((sum, node) => sum + node.dependencies.length, 0);
          const averageComplexity = nodes.length > 0 ? totalConnections / nodes.length : 0;

          // Calculate maximum dependency depth
          const calculateMaxDepth = (nodeId: string, visited = new Set<string>()): number => {
            if (visited.has(nodeId)) return 0; // Circular dependency prevention
            visited.add(nodeId);
            
            const node = nodes.find(n => n.nodeId === nodeId);
            if (!node || node.dependencies.length === 0) return 1;
            
            const childDepths = node.dependencies.map(depId => 
              calculateMaxDepth(depId, new Set(visited))
            );
            return 1 + Math.max(...childDepths, 0);
          };

          const maxDependencyDepth = nodes.length > 0 
            ? Math.max(...nodes.map(node => calculateMaxDepth(node.nodeId)))
            : 0;

          // Calculate execution estimate (sum of estimated durations)
          const executionEstimate = actionNodes.reduce((sum, action) => {
            return sum + (action.estimatedDuration || 0);
          }, 0);

          // Additional advanced statistics
          const statusBreakdown = actionNodes.reduce((acc, action) => {
            acc[action.status] = (acc[action.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const priorityBreakdown = actionNodes.reduce((acc, action) => {
            const priority = action.priority.toString();
            acc[priority] = (acc[priority] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const executionModeBreakdown = actionNodes.reduce((acc, action) => {
            acc[action.executionMode] = (acc[action.executionMode] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          // Performance metrics
          const avgExecutionTime = actionNodes.length > 0 
            ? executionEstimate / actionNodes.length 
            : 0;

          const criticalPath = actionNodes
            .filter(action => action.priority >= 8)
            .reduce((sum, action) => sum + (action.estimatedDuration || 0), 0);

          // Create comprehensive statistics DTO
          const statisticsDto: ModelStatisticsDto & {
            // Extended statistics
            statusBreakdown: Record<string, number>;
            priorityBreakdown: Record<string, number>;
            executionModeBreakdown: Record<string, number>;
            performance: {
              avgExecutionTime: number;
              criticalPathDuration: number;
              parallelizationPotential: number;
            };
            modelHealth: {
              completenessScore: number;
              complexityScore: number;
              maintainabilityScore: number;
            };
          } = {
            totalNodes: nodes.length,
            containerNodeCount: nodes.length,
            actionNodeCount: actionNodes.length,
            nodeTypeBreakdown,
            actionTypeBreakdown,
            averageComplexity,
            maxDependencyDepth,
            executionEstimate,
            statusBreakdown,
            priorityBreakdown,
            executionModeBreakdown,
            performance: {
              avgExecutionTime,
              criticalPathDuration: criticalPath,
              parallelizationPotential: actionNodes.filter(a => a.executionMode === 'parallel').length
            },
            modelHealth: {
              completenessScore: actionNodes.length > 0 ? 
                (actionNodes.filter(a => a.status === 'configured').length / actionNodes.length) * 100 : 0,
              complexityScore: Math.min(averageComplexity * 20, 100), // Scale complexity to 0-100
              maintainabilityScore: Math.max(100 - (maxDependencyDepth * 10), 0) // Lower depth = higher maintainability
            }
          };

          return createSuccessResponse(statisticsDto, HttpStatus.OK, {
            modelId: queryResult.modelId,
            calculatedAt: new Date().toISOString(),
            dataVersion: queryResult.version
          });

        } catch (error) {
          console.error('Get model statistics error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to calculate model statistics',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 50, windowMs: 60000 } // 50 statistics requests per minute
    )
  )(request);
}