import { Node } from '../entities/node';
import { ActionNode } from '../entities/action-node';
import { FunctionModel, ValidationResult } from '../entities/function-model';
import { IONode } from '../entities/io-node';
import { TetherNode } from '../entities/tether-node';
import { ExecutionContext } from '../value-objects/execution-context';
import { ModelStatus } from '../enums';
import { Result } from '../shared/result';

export interface ExecutionError {
  code: string;
  nodeId: string;
  nodeName: string;
  errorType: 'validation' | 'runtime' | 'timeout' | 'dependency' | 'permission';
  message: string;
  context?: Record<string, any>;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface ExecutionPrecondition {
  id: string;
  description: string;
  validator: (model: FunctionModel, context: ExecutionContext) => boolean;
  errorMessage: string;
  nodeId?: string;
  type?: 'dependency' | 'resource' | 'permission' | 'state';
  requirement?: string;
  satisfied?: boolean;
  reason?: string;
  error?: string;
}

export class ExecutionRules {
  /**
   * Validates a FunctionModel for execution readiness
   */
  public validateModelForExecution(model: FunctionModel): Result<{
    canExecute: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const validationResult = ExecutionRules.validateModelForExecution(model);
    if (validationResult.isFailure) {
      return Result.fail(validationResult.error);
    }

    const validation = validationResult.value;
    return Result.ok({
      canExecute: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings
    });
  }

  /**
   * Validates preconditions for execution
   */
  public validatePreconditions(
    model: FunctionModel,
    context: ExecutionContext,
    preconditions: ExecutionPrecondition[]
  ): Result<{
    allPassed: boolean;
    failedPreconditions: ExecutionPrecondition[];
  }> {
    const failedPreconditions: ExecutionPrecondition[] = [];

    for (const precondition of preconditions) {
      try {
        const passed = precondition.validator(model, context);
        if (!passed) {
          failedPreconditions.push({ ...precondition, satisfied: false });
        }
      } catch (error) {
        failedPreconditions.push({
          ...precondition,
          satisfied: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return Result.ok({
      allPassed: failedPreconditions.length === 0,
      failedPreconditions
    });
  }

  /**
   * Validates execution order for a model
   */
  public validateExecutionOrder(model: FunctionModel): Result<ValidationResult> {
    const actionNodes = Array.from(model.actionNodes.values());
    return ExecutionRules.validateActionExecutionOrder(actionNodes);
  }

  /**
   * Validates resource requirements against limits
   */
  public validateResourceRequirements(
    model: FunctionModel,
    resourceLimits: Record<string, any>
  ): Result<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    totalRequirements: Record<string, number>;
  }> {
    const actionNodes = Array.from(model.actionNodes.values());
    const validation = ExecutionRules.validateResourceRequirements(actionNodes, resourceLimits);
    
    // Calculate total requirements
    let totalCpu = 0;
    let totalMemory = 0;
    let totalExecutionTime = 0;

    for (const action of actionNodes) {
      // ActionNodes can have different structures, check for TetherNode properties
      let requirements: Record<string, any> | undefined;
      
      if ('tetherData' in action) {
        const tetherAction = action as any;
        requirements = tetherAction.tetherData?.resourceRequirements;
      } else {
        requirements = action.metadata?.resourceRequirements as Record<string, any> | undefined;
      }
      
      if (requirements) {
        if (requirements.cpu !== undefined) {
          totalCpu += this.parseResourceValue(requirements.cpu);
        }
        if (requirements.memory !== undefined) {
          totalMemory += this.parseResourceValue(requirements.memory);
        }
        if (requirements.timeout !== undefined) {
          totalExecutionTime += requirements.timeout;
        }
      }
    }

    return Result.ok({
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      totalRequirements: {
        cpu: totalCpu,
        memory: totalMemory,
        executionTime: totalExecutionTime
      }
    });
  }

  /**
   * Performs comprehensive execution validation including model, context, and preconditions
   */
  public validateCompleteExecution(
    model: FunctionModel,
    context: ExecutionContext,
    preconditions: ExecutionPrecondition[] = [],
    resourceLimits?: Record<string, any>
  ): Result<{
    canExecute: boolean;
    validationSummary: {
      modelValidation: { canExecute: boolean; errors: string[]; warnings: string[] };
      preconditionValidation: { allPassed: boolean; failedPreconditions: ExecutionPrecondition[] };
      executionOrderValidation: ValidationResult;
      resourceValidation: { isValid: boolean; errors: string[]; warnings: string[]; totalRequirements: Record<string, number> };
    };
    allErrors: string[];
  }> {
    // Validate model
    const modelValidation = this.validateModelForExecution(model);
    if (modelValidation.isFailure) {
      return Result.fail(modelValidation.error);
    }

    // Validate preconditions
    const preconditionValidation = this.validatePreconditions(model, context, preconditions);
    if (preconditionValidation.isFailure) {
      return Result.fail(preconditionValidation.error);
    }

    // Validate execution order
    const executionOrderValidation = this.validateExecutionOrder(model);
    if (executionOrderValidation.isFailure) {
      return Result.fail(executionOrderValidation.error);
    }

    // Validate resource requirements if provided
    let resourceValidation = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      totalRequirements: { cpu: 0, memory: 0, executionTime: 0 }
    };

    if (resourceLimits) {
      const resourceResult = this.validateResourceRequirements(model, resourceLimits);
      if (resourceResult.isFailure) {
        return Result.fail(resourceResult.error);
      }
      resourceValidation = resourceResult.value;
    }

    const allErrors = [
      ...modelValidation.value.errors,
      ...preconditionValidation.value.failedPreconditions.map(p => p.errorMessage),
      ...executionOrderValidation.value.errors,
      ...resourceValidation.errors
    ];

    const canExecute = 
      modelValidation.value.canExecute &&
      preconditionValidation.value.allPassed &&
      executionOrderValidation.value.isValid &&
      resourceValidation.isValid;

    return Result.ok({
      canExecute,
      validationSummary: {
        modelValidation: modelValidation.value,
        preconditionValidation: preconditionValidation.value,
        executionOrderValidation: executionOrderValidation.value,
        resourceValidation
      },
      allErrors
    });
  }

  private parseResourceValue(value: string | number): number {
    return ExecutionRules.parseResourceValue(value);
  }
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
      duplicateOrders.forEach(order => {
        errors.push(`Duplicate execution order detected: ${order}`);
      });
    }

    // Check for gaps and starting order
    const orders = actions.map(a => a.executionOrder).sort((a, b) => a - b);
    if (orders.length > 0) {
      const minOrder = orders[0];
      const maxOrder = orders[orders.length - 1];
      
      if (minOrder < 1) {
        errors.push('Execution order must start from 1');
      }
      
      // Check for gaps in sequence
      for (let i = minOrder; i <= maxOrder; i++) {
        if (!orders.includes(i)) {
          errors.push(`Execution order gap detected: missing order ${i}`);
        }
      }
    }

    // Additional validation for parallel execution
    const parallelGroups = new Map<number, ActionNode[]>();
    actions.forEach(action => {
      if (!parallelGroups.has(action.executionOrder)) {
        parallelGroups.set(action.executionOrder, []);
      }
      parallelGroups.get(action.executionOrder)!.push(action);
    });

    // Validate parallel execution setup
    parallelGroups.forEach((group, order) => {
      if (group.length > 1) {
        const parallelActions = group.filter(a => a.executionMode === 'parallel');
        if (parallelActions.length !== group.length) {
          warnings.push(`Mixed execution modes in order ${order} - some actions may execute sequentially`);
        }
      }
    });

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

  /**
   * Validates a FunctionModel for execution readiness
   */
  public static validateModelForExecution(model: FunctionModel): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check model status
    if (model.status !== ModelStatus.PUBLISHED) {
      if (model.status === ModelStatus.DRAFT) {
        errors.push('Model must be published to execute');
      } else if (model.status === ModelStatus.ARCHIVED) {
        errors.push('Cannot execute archived model');
      } else {
        errors.push('Only published models can be executed');
      }
    }

    // Check if model is deleted
    if (model.deletedAt) {
      errors.push('Cannot execute deleted model');
    }

    // Check for required IO nodes
    const nodes = Array.from(model.nodes.values());
    const ioNodes = nodes.filter(node => node instanceof IONode);
    const inputNodes = ioNodes.filter(node => (node as IONode).ioData.boundaryType === 'input');
    const outputNodes = ioNodes.filter(node => (node as IONode).ioData.boundaryType === 'output');

    if (inputNodes.length === 0) {
      errors.push('Model must have at least one input node');
    }

    if (outputNodes.length === 0) {
      errors.push('Model must have at least one output node');
    }

    // Check for nodes without actions
    const actionNodes = Array.from(model.actionNodes.values());
    const containerNodes = nodes.filter(node => !(node instanceof IONode));
    
    for (const containerNode of containerNodes) {
      const nodeActions = actionNodes.filter(action => 
        action.parentNodeId.toString() === containerNode.nodeId.toString()
      );
      
      if (nodeActions.length === 0) {
        warnings.push(`Container node '${containerNode.name}' has no actions`);
      }
    }

    // Validate workflow structure
    try {
      const workflowValidation = model.validateWorkflow();
      if (workflowValidation.isSuccess) {
        const validationResult = workflowValidation.value;
        errors.push(...validationResult.errors);
        warnings.push(...validationResult.warnings);
      }
    } catch (error) {
      // If workflow validation throws, treat as validation error
      errors.push('Node validation failed: ' + (error instanceof Error ? error.message : String(error)));
    }

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  /**
   * Creates a standardized execution error
   */
  public static createExecutionError(
    code: string, 
    message: string, 
    context?: Record<string, any>
  ): ExecutionError {
    return {
      code,
      nodeId: context?.nodeId || 'unknown',
      nodeName: context?.nodeName || 'Unknown Node',
      errorType: context?.errorType || 'runtime',
      message,
      context: context || {},
      details: context,
      timestamp: new Date()
    };
  }

  /**
   * Formats an execution error for display
   */
  public static formatExecutionError(error: ExecutionError): string {
    const timestamp = error.timestamp.toISOString();
    const contextInfo = error.context && Object.keys(error.context).length > 0 
      ? ` | Context: ${JSON.stringify(error.context)}` 
      : '';
    
    return `[${error.code}] ${error.message} | Node: ${error.nodeName} (${error.nodeId}) | ${timestamp}${contextInfo}`;
  }

  /**
   * Performs comprehensive execution validation including model, context, and preconditions
   */
  public static validateCompleteExecution(
    model: FunctionModel,
    context: ExecutionContext,
    preconditions: ExecutionPrecondition[] = [],
    resourceLimits?: Record<string, any>
  ): Result<{
    canExecute: boolean;
    validationResults: ValidationResult[];
    preconditionResults: ExecutionPrecondition[];
    resourceValidation?: ValidationResult;
  }> {
    const validationResults: ValidationResult[] = [];
    const allPreconditions: ExecutionPrecondition[] = [...preconditions];
    
    // 1. Validate model for execution
    const modelValidation = this.validateModelForExecution(model);
    if (modelValidation.isSuccess) {
      validationResults.push(modelValidation.value);
    }

    // 2. Validate execution order
    const nodes = Array.from(model.nodes.values());
    const executionOrderResult = this.determineExecutionOrder(nodes);
    if (executionOrderResult.isFailure) {
      validationResults.push({
        isValid: false,
        errors: [executionOrderResult.error],
        warnings: []
      });
    }

    // 3. Validate action execution order
    const actionNodes = Array.from(model.actionNodes.values());
    const actionOrderValidation = this.validateActionExecutionOrder(actionNodes);
    if (actionOrderValidation.isSuccess) {
      validationResults.push(actionOrderValidation.value);
    }

    // 4. Validate node preconditions
    for (const node of nodes) {
      const preconditionValidation = this.validateExecutionPreconditions(node, context);
      if (preconditionValidation.isSuccess) {
        validationResults.push(preconditionValidation.value);
      }
    }

    // 5. Validate resource requirements
    let resourceValidation: ValidationResult | undefined;
    if (resourceLimits) {
      resourceValidation = this.validateResourceRequirements(actionNodes, resourceLimits);
    }

    // Determine overall execution readiness
    const allValid = validationResults.every(result => result.isValid);
    const allErrors = validationResults.flatMap(result => result.errors);
    const allWarnings = validationResults.flatMap(result => result.warnings);

    return Result.ok({
      canExecute: allValid && allErrors.length === 0,
      validationResults,
      preconditionResults: allPreconditions,
      resourceValidation
    });
  }

  /**
   * Validates resource requirements against limits
   */
  private static validateResourceRequirements(
    actionNodes: ActionNode[],
    resourceLimits: Record<string, any>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Calculate total resource requirements
    let totalCpu = 0;
    let totalMemory = 0;

    for (const action of actionNodes) {
      // ActionNodes can have different structures, check for TetherNode properties
      let requirements: Record<string, any> | undefined;
      
      if ('tetherData' in action) {
        const tetherAction = action as any;
        requirements = tetherAction.tetherData?.resourceRequirements;
      } else {
        requirements = action.metadata?.resourceRequirements as Record<string, any> | undefined;
      }
      
      if (requirements) {
        if (requirements.cpu !== undefined) {
          const cpuValue = ExecutionRules.parseResourceValue(requirements.cpu);
          totalCpu += cpuValue;
        }
        if (requirements.memory !== undefined) {
          const memoryValue = ExecutionRules.parseResourceValue(requirements.memory);
          totalMemory += memoryValue;
        }
      }
    }

    // Check against limits
    if (resourceLimits.maxCpu) {
      const cpuLimit = ExecutionRules.parseResourceValue(resourceLimits.maxCpu);
      if (totalCpu > cpuLimit) {
        errors.push(`CPU requirement exceeds limit: ${totalCpu} > ${cpuLimit}`);
      }
    }

    if (resourceLimits.maxMemory) {
      const memoryLimit = ExecutionRules.parseResourceValue(resourceLimits.maxMemory);
      if (totalMemory > memoryLimit) {
        errors.push(`Memory requirement exceeds limit: ${totalMemory} > ${memoryLimit}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Parses resource values like "100m", "1Gi", etc.
   */
  private static parseResourceValue(value: string | number): number {
    if (typeof value === 'number') return value;
    
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return 0;
    
    // Basic conversion for common units
    if (value.includes('m')) return numericValue / 1000; // millicores to cores
    if (value.includes('Mi')) return numericValue * 1024 * 1024; // MiB to bytes
    if (value.includes('Gi')) return numericValue * 1024 * 1024 * 1024; // GiB to bytes
    
    return numericValue;
  }
}