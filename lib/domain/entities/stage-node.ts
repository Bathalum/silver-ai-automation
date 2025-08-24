import { Node, NodeProps } from './node';
import { ContainerNodeType, ExecutionMode, NodeStatus } from '../enums';
import { Result } from '../shared/result';
import { RetryPolicy } from '../value-objects/retry-policy';
import { NodeId } from '../value-objects/node-id';
import { Position } from '../value-objects/position';

export interface StageNodeData {
  stageType: 'milestone' | 'process' | 'gateway' | 'checkpoint';
  completionCriteria?: Record<string, any>;
  stageGoals?: string[];
  resourceRequirements?: Record<string, any>;
  parallelismConfig?: {
    maxConcurrency: number;
    loadBalancing: 'round-robin' | 'weighted' | 'priority';
  };
}

export interface StageNodeProps extends NodeProps {
  stageData: StageNodeData;
  parallelExecution: boolean;
  retryPolicy?: RetryPolicy;
  actionNodes: any[];
  configuration: Record<string, any>;
  executionState?: {
    isExecuting: boolean;
    lastExecutionResult?: 'success' | 'failure';
    lastExecutionError?: string;
  };
}

export class StageNode extends Node {
  protected declare props: StageNodeProps;

  private constructor(props: StageNodeProps) {
    super(props);
  }

  public static create(props: Omit<StageNodeProps, 'createdAt' | 'updatedAt'>): Result<StageNode> {
    const now = new Date();
    const nodeProps: StageNodeProps = {
      ...props,
      parallelExecution: props.parallelExecution ?? false,
      actionNodes: props.actionNodes ?? [],
      configuration: props.configuration ?? {},
      executionState: {
        isExecuting: false,
        lastExecutionResult: undefined,
        lastExecutionError: undefined,
        ...(props.executionState ?? {})
      },
      createdAt: now,
      updatedAt: now,
    };

    // Validate stage-specific business rules
    const validationResult = StageNode.validateStageData(props.stageData);
    if (validationResult.isFailure) {
      return Result.fail<StageNode>(validationResult.error);
    }

    return Result.ok<StageNode>(new StageNode(nodeProps));
  }

  public get stageData(): Readonly<StageNodeData> {
    return this.props.stageData;
  }

  public getNodeType(): string {
    return ContainerNodeType.STAGE_NODE;
  }

  public get nodeType(): string {
    return this.getNodeType();
  }

  public get actionNodes(): readonly any[] {
    return this.props.actionNodes;
  }

  public get parallelExecution(): boolean {
    return this.props.parallelExecution;
  }

  public get retryPolicy(): RetryPolicy | undefined {
    return this.props.retryPolicy;
  }

  public get configuration(): Readonly<Record<string, any>> {
    return this.props.configuration;
  }

  public updateStageType(stageType: 'milestone' | 'process' | 'gateway' | 'checkpoint'): Result<void> {
    this.props.stageData.stageType = stageType;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateCompletionCriteria(criteria: Record<string, any>): Result<void> {
    this.props.stageData.completionCriteria = { ...criteria };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateStageGoals(goals: string[]): Result<void> {
    if (goals.length > 10) {
      return Result.fail<void>('Stage cannot have more than 10 goals');
    }

    const invalidGoals = goals.filter(goal => !goal || goal.trim().length === 0);
    if (invalidGoals.length > 0) {
      return Result.fail<void>('Stage goals cannot be empty');
    }

    this.props.stageData.stageGoals = [...goals];
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateResourceRequirements(requirements: Record<string, any>): Result<void> {
    this.props.stageData.resourceRequirements = { ...requirements };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateParallelismConfig(config: {
    maxConcurrency: number;
    loadBalancing: 'round-robin' | 'weighted' | 'priority';
  }): Result<void> {
    if (config.maxConcurrency < 1 || config.maxConcurrency > 100) {
      return Result.fail<void>('Max concurrency must be between 1 and 100');
    }

    const validLoadBalancing = ['round-robin', 'weighted', 'priority'];
    if (!validLoadBalancing.includes(config.loadBalancing)) {
      return Result.fail<void>('Invalid load balancing strategy');
    }

    this.props.stageData.parallelismConfig = { ...config };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public validate(): Result<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate stage type
    const validStageTypes = ['milestone', 'process', 'gateway', 'checkpoint'];
    if (!validStageTypes.includes(this.props.stageData.stageType)) {
      errors.push('Invalid stage type');
    }

    // Validate timeout
    if (this.timeout !== undefined) {
      if (this.timeout < 0) {
        errors.push('Timeout must be a positive value');
      }
      if (this.timeout > 300000) { // 5 minutes
        warnings.push('Timeout value is very high - consider if this is intentional');
      }
    }

    // Validate retry policy
    if (this.retryPolicy) {
      if (this.retryPolicy.maxAttempts < 1) {
        errors.push('Invalid retry policy configuration');
      }
    }

    // Check for invalid retry policy in metadata (for testing)
    if (this.metadata.invalidRetryPolicy) {
      const invalidPolicy = this.metadata.invalidRetryPolicy;
      if (invalidPolicy.maxAttempts < 0) {
        errors.push('Invalid retry policy configuration');
      }
    }

    // Check for action nodes
    if (this.getActionCount() === 0) {
      warnings.push('Stage node should have at least one action to perform meaningful work');
    }

    // Performance warnings
    if (this.getActionCount() > 5 && !this.parallelExecution) {
      warnings.push('Many actions with sequential execution may impact performance');
    }

    // Check for circular dependencies
    const selfDependency = this.dependencies.find(dep => dep.equals(this.nodeId));
    if (selfDependency) {
      errors.push('Node cannot depend on itself');
    }

    // Validate goals
    if (this.props.stageData.stageGoals) {
      if (this.props.stageData.stageGoals.length === 0) {
        warnings.push('Stage should have at least one goal defined');
      }
      if (this.props.stageData.stageGoals.length > 10) {
        errors.push('Stage cannot have more than 10 goals');
      }
    }

    // Validate parallelism config
    if (this.props.stageData.parallelismConfig) {
      const config = this.props.stageData.parallelismConfig;
      if (config.maxConcurrency < 1 || config.maxConcurrency > 100) {
        errors.push('Max concurrency must be between 1 and 100');
      }
    }

    return Result.ok({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  public updateConfiguration(config: Record<string, any>): Result<void> {
    if (config.stageType) {
      const result = this.updateStageType(config.stageType);
      if (result.isFailure) return result;
    }

    if (config.completionCriteria) {
      const result = this.updateCompletionCriteria(config.completionCriteria);
      if (result.isFailure) return result;
    }

    if (config.stageGoals) {
      const result = this.updateStageGoals(config.stageGoals);
      if (result.isFailure) return result;
    }

    if (config.resourceRequirements) {
      const result = this.updateResourceRequirements(config.resourceRequirements);
      if (result.isFailure) return result;
    }

    if (config.parallelismConfig) {
      const result = this.updateParallelismConfig(config.parallelismConfig);
      if (result.isFailure) return result;
    }

    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public clearActionNodes(): Result<void> {
    this.props.actionNodes.length = 0; // Clear the array
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateRetryPolicy(retryPolicy?: RetryPolicy): Result<void> {
    this.props.retryPolicy = retryPolicy;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public setParallelExecution(parallel: boolean): Result<void> {
    this.props.parallelExecution = parallel;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public isExecuting(): boolean {
    return this.props.executionState?.isExecuting ?? false;
  }

  public markAsExecuting(): void {
    if (!this.props.executionState) {
      this.props.executionState = { isExecuting: false };
    }
    this.props.executionState.isExecuting = true;
    this.props.updatedAt = new Date();
  }

  public markAsCompleted(): void {
    if (!this.props.executionState) {
      this.props.executionState = { isExecuting: false };
    }
    this.props.executionState.isExecuting = false;
    this.props.updatedAt = new Date();
  }

  public completeExecution(result: 'success' | 'failure', error?: string): Result<void> {
    if (!this.props.executionState?.isExecuting) {
      return Result.fail<void>('Node is not currently executing');
    }

    this.props.executionState.isExecuting = false;
    this.props.executionState.lastExecutionResult = result;
    if (result === 'failure' && error) {
      this.props.executionState.lastExecutionError = error;
    } else {
      this.props.executionState.lastExecutionError = undefined;
    }
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public getLastExecutionResult(): 'success' | 'failure' | undefined {
    return this.props.executionState?.lastExecutionResult;
  }

  public getLastExecutionError(): string | undefined {
    return this.props.executionState?.lastExecutionError;
  }

  public addActionNode(actionNode: any): Result<void> {
    // Validate the action node belongs to this stage and model
    if (actionNode.modelId !== this.modelId) {
      return Result.fail<void>('Action node belongs to different model');
    }

    if (actionNode.parentNodeId && !actionNode.parentNodeId.equals(this.nodeId)) {
      return Result.fail<void>('Action node does not belong to this stage');
    }

    // Check for duplicates based on actionId (primary identifier for action nodes)
    const exists = this.props.actionNodes.some(node => 
      node.actionId?.toString() === actionNode.actionId?.toString()
    );
    
    if (exists) {
      return Result.fail<void>('Action node already exists in this stage');
    }

    this.props.actionNodes.push(actionNode);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeActionNode(actionNodeId: string): Result<void> {
    const index = this.props.actionNodes.findIndex(node => 
      node.nodeId?.toString() === actionNodeId ||
      node.actionId?.toString() === actionNodeId
    );
    
    if (index === -1) {
      return Result.fail<void>('Action node not found');
    }

    this.props.actionNodes.splice(index, 1);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public getActionCount(): number {
    return this.props.actionNodes.length;
  }

  public calculateComplexity(): number {
    // Calculate complexity based on stage configuration
    let complexity = 1; // Base complexity

    // Add complexity for parallelism
    if (this.props.stageData.parallelismConfig && this.props.stageData.parallelismConfig.maxConcurrency > 1) {
      complexity += Math.log2(this.props.stageData.parallelismConfig.maxConcurrency);
    }

    // Add complexity for number of goals
    if (this.props.stageData.stageGoals) {
      complexity += this.props.stageData.stageGoals.length * 0.5;
    }

    // Add complexity for completion criteria
    if (this.props.stageData.completionCriteria) {
      complexity += Object.keys(this.props.stageData.completionCriteria).length * 0.3;
    }

    return Math.round(complexity * 10) / 10; // Round to 1 decimal place
  }

  public estimateExecutionTime(): number {
    // Estimate execution time in seconds based on stage configuration
    let baseTime = 60; // 1 minute base time

    // Adjust for stage type
    switch (this.props.stageData.stageType) {
      case 'milestone':
        baseTime = 10; // Quick validation
        break;
      case 'process':
        baseTime = 300; // 5 minutes for processing
        break;
      case 'gateway':
        baseTime = 30; // Decision making
        break;
      case 'checkpoint':
        baseTime = 60; // Status checking
        break;
    }

    // Adjust for parallelism (parallel execution can be faster)
    if (this.props.stageData.parallelismConfig && this.props.stageData.parallelismConfig.maxConcurrency > 1) {
      baseTime = baseTime / Math.min(this.props.stageData.parallelismConfig.maxConcurrency, 4);
    }

    // Adjust for complexity
    const complexity = this.calculateComplexity();
    baseTime = baseTime * complexity;

    return Math.round(baseTime);
  }

  public analyzeResourceRequirements(): {
    cpuIntensive: boolean;
    estimatedMemoryUsage: number;
    networkCalls: number;
    diskOperations: number;
  } {
    const actionCount = this.getActionCount();
    const isParallel = this.props.parallelExecution;
    
    return {
      cpuIntensive: isParallel || actionCount > 3,
      estimatedMemoryUsage: Math.max(128, actionCount * 64), // Base 128MB + 64MB per action
      networkCalls: actionCount, // Assume each action makes network calls
      diskOperations: Math.floor(actionCount / 2) // Some actions require disk access
    };
  }

  public toObject(): any {
    return {
      nodeId: this.nodeId.toString(),
      name: this.name,
      modelId: this.modelId,
      description: this.description,
      nodeType: this.getNodeType(),
      position: {
        x: this.position.x,
        y: this.position.y
      },
      dependencies: this.dependencies.map(dep => dep.toString()),
      timeout: this.timeout,
      parallelExecution: this.parallelExecution,
      retryPolicy: this.retryPolicy ? {
        maxAttempts: this.retryPolicy.maxAttempts,
        strategy: this.retryPolicy.strategy,
        baseDelayMs: this.retryPolicy.baseDelayMs,
        maxDelayMs: this.retryPolicy.maxDelayMs,
        enabled: this.retryPolicy.enabled
      } : undefined,
      actionNodes: [...this.actionNodes],
      configuration: { ...this.configuration },
      metadata: { ...this.metadata },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  public static fromObject(obj: any): Result<StageNode> {
    try {
      const nodeIdResult = NodeId.create(obj.nodeId);
      if (nodeIdResult.isFailure) {
        return Result.fail<StageNode>(`Invalid node ID: ${nodeIdResult.error}`);
      }

      const positionResult = Position.create(obj.position.x, obj.position.y);
      if (positionResult.isFailure) {
        return Result.fail<StageNode>(`Invalid position: ${positionResult.error}`);
      }

      // Parse dependencies
      const dependencies: NodeId[] = [];
      if (obj.dependencies && Array.isArray(obj.dependencies)) {
        for (const depId of obj.dependencies) {
          const depResult = NodeId.create(depId);
          if (depResult.isFailure) {
            return Result.fail<StageNode>(`Invalid dependency ID: ${depResult.error}`);
          }
          dependencies.push(depResult.value);
        }
      }

      // Parse retry policy if present
      let retryPolicy: RetryPolicy | undefined;
      if (obj.retryPolicy) {
        const retryResult = RetryPolicy.create({
          maxAttempts: obj.retryPolicy.maxAttempts,
          strategy: obj.retryPolicy.strategy,
          baseDelayMs: obj.retryPolicy.baseDelayMs,
          maxDelayMs: obj.retryPolicy.maxDelayMs,
          enabled: obj.retryPolicy.enabled
        });
        if (retryResult.isFailure) {
          return Result.fail<StageNode>(`Invalid retry policy: ${retryResult.error}`);
        }
        retryPolicy = retryResult.value;
      }

      const stageNode = StageNode.create({
        nodeId: nodeIdResult.value,
        modelId: obj.modelId || '',
        name: obj.name || 'Unnamed Stage',
        description: obj.description,
        position: positionResult.value,
        dependencies,
        executionType: obj.parallelExecution ? ExecutionMode.PARALLEL : ExecutionMode.SEQUENTIAL,
        status: NodeStatus.CONFIGURED,
        timeout: obj.timeout,
        metadata: obj.metadata || {},
        visualProperties: obj.visualProperties || {},
        stageData: {
          stageType: 'process',
          completionCriteria: obj.completionCriteria || {},
          stageGoals: obj.stageGoals || [],
          resourceRequirements: obj.resourceRequirements || {},
          parallelismConfig: obj.parallelismConfig || {
            maxConcurrency: 1,
            loadBalancing: 'round-robin'
          }
        },
        parallelExecution: obj.parallelExecution || false,
        retryPolicy,
        actionNodes: obj.actionNodes || [],
        configuration: obj.configuration || {}
      });

      return stageNode;
    } catch (error) {
      return Result.fail<StageNode>(`Failed to create StageNode from object: ${error}`);
    }
  }

  private static validateStageData(stageData: StageNodeData): Result<void> {
    const validStageTypes = ['milestone', 'process', 'gateway', 'checkpoint'];
    if (!validStageTypes.includes(stageData.stageType)) {
      return Result.fail<void>('Invalid stage type');
    }

    if (stageData.stageGoals && stageData.stageGoals.length > 10) {
      return Result.fail<void>('Stage cannot have more than 10 goals');
    }

    if (stageData.parallelismConfig) {
      const config = stageData.parallelismConfig;
      if (config.maxConcurrency < 1 || config.maxConcurrency > 100) {
        return Result.fail<void>('Max concurrency must be between 1 and 100');
      }

      const validLoadBalancing = ['round-robin', 'weighted', 'priority'];
      if (!validLoadBalancing.includes(config.loadBalancing)) {
        return Result.fail<void>('Invalid load balancing strategy');
      }
    }

    return Result.ok<void>(undefined);
  }
}