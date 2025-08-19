import { Node } from '../entities/node';
import { ActionNode } from '../entities/action-node';
import { ValidationResult } from '../entities/function-model';
import { ExecutionContext } from '../value-objects/execution-context';
import { Result } from '../shared/result';

export interface ExecutionError {
  nodeId: string;
  nodeName: string;
  errorType: 'validation' | 'runtime' | 'timeout' | 'dependency' | 'permission';
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface ExecutionPrecondition {
  nodeId: string;
  type: 'dependency' | 'resource' | 'permission' | 'state';
  requirement: string;
  satisfied: boolean;
  reason?: string;
}

export class ExecutionRules {
  public static determineExecutionOrder(nodes: Node[]): Result<Node[]> {
    const nodeMap = new Map(nodes.map(node => [node.nodeId.toString(), node]));
    const visited = new Set<string>();
    const tempVisited = new Set<string>();
    const result: Node[] = [];

    const visit = (nodeId: string): boolean => {
      if (tempVisited.has(nodeId)) {
        return false; // Cycle detected
      }
      
      if (visited.has(nodeId)) {
        return true; // Already processed
      }

      const node = nodeMap.get(nodeId);
      if (!node) {
        return false; // Node not found
      }

      tempVisited.add(nodeId);

      // Visit all dependencies first (topological sort)
      for (const dependency of node.dependencies) {
        const depId = dependency.toString();
        if (!visit(depId)) {
          return false;
        }
      }

      tempVisited.delete(nodeId);
      visited.add(nodeId);
      result.push(node);
      
      return true;
    };

    // Process all nodes
    for (const node of nodes) {
      const nodeId = node.nodeId.toString();
      if (!visited.has(nodeId)) {
        if (!visit(nodeId)) {
          return Result.fail<Node[]>('Circular dependency detected in execution order calculation');
        }
      }
    }

    return Result.ok<Node[]>(result);
  }

  public static validateExecutionPreconditions(
    node: Node, 
    context: ExecutionContext,
    completedNodes: Set<string> = new Set()
  ): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const preconditions: ExecutionPrecondition[] = [];

    // Check dependency preconditions
    for (const dependency of node.dependencies) {
      const depId = dependency.toString();
      const satisfied = completedNodes.has(depId);
      
      preconditions.push({
        nodeId: node.nodeId.toString(),
        type: 'dependency',
        requirement: `Node ${depId} must be completed`,
        satisfied,
        reason: satisfied ? undefined : `Dependency ${depId} has not completed execution`
      });

      if (!satisfied) {
        errors.push(`Cannot execute node ${node.name}: dependency ${depId} not completed`);
      }
    }

    // Check resource requirements
    const resourceRequirements = node.metadata?.resourceRequirements as Record<string, any> | undefined;
    if (resourceRequirements) {
      for (const [resource, requirement] of Object.entries(resourceRequirements)) {
        const available = this.checkResourceAvailability(resource, requirement, context);
        
        preconditions.push({
          nodeId: node.nodeId.toString(),
          type: 'resource',
          requirement: `Resource ${resource}: ${JSON.stringify(requirement)}`,
          satisfied: available,
          reason: available ? undefined : `Resource ${resource} not available or insufficient`
        });

        if (!available) {
          errors.push(`Node ${node.name} requires ${resource} but it is not available`);
        }
      }
    }

    // Check permission requirements
    const requiredPermissions = node.metadata?.requiredPermissions as string[] | undefined;
    if (requiredPermissions && context.userId) {
      for (const permission of requiredPermissions) {
        const hasPermission = this.checkUserPermission(context.userId, permission);
        
        preconditions.push({
          nodeId: node.nodeId.toString(),
          type: 'permission',
          requirement: `Permission: ${permission}`,
          satisfied: hasPermission,
          reason: hasPermission ? undefined : `User lacks required permission: ${permission}`
        });

        if (!hasPermission) {
          errors.push(`Node ${node.name} requires permission ${permission} which user does not have`);
        }
      }
    }

    // Check execution environment requirements
    const environmentRequirements = node.metadata?.environmentRequirements as Record<string, any> | undefined;
    if (environmentRequirements) {
      const currentEnv = context.environment;
      const requiredEnv = environmentRequirements.environment;
      
      if (requiredEnv && requiredEnv !== currentEnv) {
        preconditions.push({
          nodeId: node.nodeId.toString(),
          type: 'state',
          requirement: `Environment: ${requiredEnv}`,
          satisfied: false,
          reason: `Current environment ${currentEnv} does not match required ${requiredEnv}`
        });

        errors.push(`Node ${node.name} requires ${requiredEnv} environment but running in ${currentEnv}`);
      }
    }

    // Check node state preconditions
    if (node.status === 'inactive') {
      errors.push(`Cannot execute inactive node: ${node.name}`);
    }

    if (node.status === 'error') {
      warnings.push(`Node ${node.name} was previously in error state`);
    }

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  public static handleExecutionErrors(error: ExecutionError): Result<{ shouldRetry: boolean; retryDelay?: number; shouldStop?: boolean }> {
    switch (error.errorType) {
      case 'timeout':
        return Result.ok({
          shouldRetry: true,
          retryDelay: 5000, // 5 second delay
          shouldStop: false
        });

      case 'dependency':
        return Result.ok({
          shouldRetry: false,
          shouldStop: true // Dependency errors usually require manual intervention
        });

      case 'permission':
        return Result.ok({
          shouldRetry: false,
          shouldStop: true // Permission errors require configuration changes
        });

      case 'runtime':
        // Determine if runtime error is retryable based on message
        const isRetryableError = this.isRetryableRuntimeError(error.message);
        return Result.ok({
          shouldRetry: isRetryableError,
          retryDelay: isRetryableError ? 1000 : undefined,
          shouldStop: !isRetryableError
        });

      case 'validation':
        return Result.ok({
          shouldRetry: false,
          shouldStop: true // Validation errors require model changes
        });

      default:
        return Result.ok({
          shouldRetry: false,
          shouldStop: true
        });
    }
  }

  public static validateActionExecutionOrder(actions: ActionNode[]): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate execution orders
    const orderCounts = new Map<number, number>();
    actions.forEach(action => {
      const count = orderCounts.get(action.executionOrder) || 0;
      orderCounts.set(action.executionOrder, count + 1);
    });

    const duplicateOrders = Array.from(orderCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([order, _]) => order);

    if (duplicateOrders.length > 0) {
      errors.push(`Duplicate execution orders found: ${duplicateOrders.join(', ')}`);
    }

    // Check for reasonable execution order ranges
    const orders = actions.map(a => a.executionOrder).sort((a, b) => a - b);
    if (orders.length > 0) {
      const minOrder = orders[0];
      const maxOrder = orders[orders.length - 1];
      
      if (minOrder < 1) {
        warnings.push('Execution orders should start from 1');
      }
      
      if (maxOrder - minOrder + 1 > orders.length * 2) {
        warnings.push('Large gaps in execution order sequence detected');
      }
    }

    // Validate parallel execution priorities
    const parallelActions = actions.filter(a => a.executionMode === 'parallel');
    if (parallelActions.length > 1) {
      const priorities = parallelActions.map(a => a.priority);
      const uniquePriorities = new Set(priorities);
      
      if (priorities.length !== uniquePriorities.size) {
        warnings.push('Multiple parallel actions have the same priority - execution order may be unpredictable');
      }
    }

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  private static checkResourceAvailability(
    resource: string, 
    requirement: any, 
    context: ExecutionContext
  ): boolean {
    // This would check actual resource availability
    // For now, return true as this requires infrastructure implementation
    return true;
  }

  private static checkUserPermission(userId: string, permission: string): boolean {
    // This would check actual user permissions
    // For now, return true as this requires infrastructure implementation
    return true;
  }

  private static isRetryableRuntimeError(errorMessage: string): boolean {
    const retryablePatterns = [
      /network.*error/i,
      /timeout/i,
      /connection.*reset/i,
      /service.*unavailable/i,
      /rate.*limit/i
    ];

    return retryablePatterns.some(pattern => pattern.test(errorMessage));
  }
}