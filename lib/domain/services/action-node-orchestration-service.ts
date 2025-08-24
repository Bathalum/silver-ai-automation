import { NodeId } from '../value-objects/node-id';
import { ActionNode } from '../entities/action-node';
import { ExecutionMode, ActionStatus } from '../enums';
import { NodeContextAccessService } from './node-context-access-service';
import { Result } from '../shared/result';

export interface ExecutionPlan {
  containerId: NodeId;
  actionNodes: ActionNode[];
  executionGroups: ExecutionGroup[];
  totalEstimatedDuration: number;
}

export interface ExecutionGroup {
  groupId: string;
  executionMode: ExecutionMode;
  actionNodes: ActionNode[];
  dependencies: string[];
  estimatedDuration: number;
  priority: number;
}

export interface ExecutionResult {
  actionId: NodeId;
  success: boolean;
  duration: number;
  output?: any;
  error?: string;
  timestamp: Date;
}

export interface OrchestrationState {
  containerId: NodeId;
  status: 'planning' | 'executing' | 'paused' | 'completed' | 'failed';
  currentGroup?: string;
  completedGroups: string[];
  failedGroups: string[];
  results: ExecutionResult[];
  startTime?: Date;
  endTime?: Date;
}

/**
 * ActionNodeOrchestrationService manages the execution orchestration and flow control
 * of action nodes within containers, handling sequential, parallel, and conditional execution.
 */
export class ActionNodeOrchestrationService {
  private orchestrationStates: Map<string, OrchestrationState> = new Map();
  private contextAccessService: NodeContextAccessService;

  constructor(contextAccessService: NodeContextAccessService) {
    this.contextAccessService = contextAccessService;
  }

  /**
   * Create an execution plan for action nodes within a container
   */
  public createExecutionPlan(
    containerId: NodeId, 
    actionNodes: ActionNode[]
  ): Result<ExecutionPlan> {
    if (actionNodes.length === 0) {
      return Result.fail<ExecutionPlan>('Cannot create execution plan for empty action node list');
    }

    // Validate all action nodes belong to the same container
    const invalidNodes = actionNodes.filter(node => !node.parentNodeId.equals(containerId));
    if (invalidNodes.length > 0) {
      return Result.fail<ExecutionPlan>('All action nodes must belong to the specified container');
    }

    // Sort nodes by execution order
    const sortedNodes = [...actionNodes].sort((a, b) => a.executionOrder - b.executionOrder);

    // Group nodes by execution mode and priority
    const executionGroups = this.createExecutionGroups(sortedNodes);
    
    // Calculate total estimated duration
    const totalEstimatedDuration = this.calculateTotalDuration(executionGroups);

    const executionPlan: ExecutionPlan = {
      containerId,
      actionNodes: sortedNodes,
      executionGroups,
      totalEstimatedDuration
    };

    return Result.ok<ExecutionPlan>(executionPlan);
  }

  /**
   * Start orchestrated execution of action nodes
   */
  public async startExecution(executionPlan: ExecutionPlan): Promise<Result<string>> {
    const orchestrationId = `${executionPlan.containerId.value}_${Date.now()}`;
    
    const initialState: OrchestrationState = {
      containerId: executionPlan.containerId,
      status: 'planning',
      completedGroups: [],
      failedGroups: [],
      results: [],
      startTime: new Date()
    };

    this.orchestrationStates.set(orchestrationId, initialState);

    try {
      // Start execution
      const state = this.orchestrationStates.get(orchestrationId)!;
      state.status = 'executing';

      await this.executeGroups(orchestrationId, executionPlan.executionGroups);

      // Update final state
      const finalState = this.orchestrationStates.get(orchestrationId)!;
      finalState.status = finalState.failedGroups.length > 0 ? 'failed' : 'completed';
      finalState.endTime = new Date();

      return Result.ok<string>(orchestrationId);
    } catch (error) {
      const state = this.orchestrationStates.get(orchestrationId)!;
      state.status = 'failed';
      state.endTime = new Date();
      
      return Result.fail<string>(`Execution failed: ${error}`);
    }
  }

  /**
   * Pause ongoing execution
   */
  public pauseExecution(orchestrationId: string): Result<void> {
    const state = this.orchestrationStates.get(orchestrationId);
    if (!state) {
      return Result.fail<void>('Orchestration not found');
    }

    if (state.status !== 'executing') {
      return Result.fail<void>('Can only pause executing orchestration');
    }

    state.status = 'paused';
    return Result.ok<void>(undefined);
  }

  /**
   * Resume paused execution
   */
  public async resumeExecution(orchestrationId: string): Promise<Result<void>> {
    const state = this.orchestrationStates.get(orchestrationId);
    if (!state) {
      return Result.fail<void>('Orchestration not found');
    }

    if (state.status !== 'paused') {
      return Result.fail<void>('Can only resume paused orchestration');
    }

    state.status = 'executing';
    
    // Continue execution from where it left off
    // This would need to be implemented based on the current group state
    
    return Result.ok<void>(undefined);
  }

  /**
   * Get orchestration status and results
   */
  public getOrchestrationState(orchestrationId: string): Result<OrchestrationState> {
    const state = this.orchestrationStates.get(orchestrationId);
    if (!state) {
      return Result.fail<OrchestrationState>('Orchestration not found');
    }

    return Result.ok<OrchestrationState>({ ...state });
  }

  /**
   * Handle conditional execution logic
   */
  public evaluateConditionalExecution(
    actionNode: ActionNode,
    availableContext: Record<string, any>
  ): Result<boolean> {
    // This would implement condition evaluation logic
    // For now, return true as a placeholder
    return Result.ok<boolean>(true);
  }

  /**
   * Handle retry logic for failed actions
   */
  public async handleActionRetry(
    actionNode: ActionNode,
    failureReason: string
  ): Promise<Result<ExecutionResult>> {
    const retryPolicy = actionNode.retryPolicy;
    
    // Check if retries are available
    if (retryPolicy.currentAttempts >= retryPolicy.maxAttempts) {
      return Result.fail<ExecutionResult>('Maximum retry attempts exceeded');
    }

    // Update action status to retrying
    const statusUpdateResult = actionNode.updateStatus(ActionStatus.RETRYING);
    if (statusUpdateResult.isFailure) {
      return Result.fail<ExecutionResult>(statusUpdateResult.error);
    }

    // Calculate backoff delay
    const delay = this.calculateBackoffDelay(retryPolicy);
    
    // Wait for backoff period
    await new Promise(resolve => setTimeout(resolve, delay));

    // Attempt execution again
    const executionResult = await this.executeActionNode(actionNode);
    return Result.ok<ExecutionResult>(executionResult);
  }

  private createExecutionGroups(sortedNodes: ActionNode[]): ExecutionGroup[] {
    const groups: ExecutionGroup[] = [];
    const groupMap: Map<string, ActionNode[]> = new Map();

    // Group nodes by execution mode and priority
    for (const node of sortedNodes) {
      const groupKey = `${node.executionMode}_${node.priority}`;
      
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      
      groupMap.get(groupKey)!.push(node);
    }

    // Convert groups to execution groups
    let groupIndex = 0;
    for (const [groupKey, nodes] of groupMap.entries()) {
      const [mode, priority] = groupKey.split('_');
      
      const executionGroup: ExecutionGroup = {
        groupId: `group_${groupIndex++}`,
        executionMode: mode as ExecutionMode,
        actionNodes: nodes,
        dependencies: this.calculateGroupDependencies(nodes),
        estimatedDuration: this.calculateGroupDuration(nodes),
        priority: parseInt(priority)
      };
      
      groups.push(executionGroup);
    }

    // Sort groups by priority and dependencies
    return this.sortExecutionGroups(groups);
  }

  private calculateGroupDependencies(nodes: ActionNode[]): string[] {
    // This would implement dependency calculation logic
    // For now, return empty array
    return [];
  }

  private calculateGroupDuration(nodes: ActionNode[]): number {
    return nodes.reduce((total, node) => {
      return total + (node.estimatedDuration || 60); // Default 60 seconds
    }, 0);
  }

  private calculateTotalDuration(groups: ExecutionGroup[]): number {
    // For sequential groups, sum all durations
    // For parallel groups, take the maximum duration
    // This is a simplified calculation
    return groups.reduce((total, group) => total + group.estimatedDuration, 0);
  }

  private sortExecutionGroups(groups: ExecutionGroup[]): ExecutionGroup[] {
    // Sort by priority (higher number = higher priority) and handle dependencies
    return groups.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      
      // If same priority, consider dependencies
      if (a.dependencies.includes(b.groupId)) return 1;
      if (b.dependencies.includes(a.groupId)) return -1;
      
      return 0;
    });
  }

  private async executeGroups(orchestrationId: string, groups: ExecutionGroup[]): Promise<void> {
    const state = this.orchestrationStates.get(orchestrationId)!;

    for (const group of groups) {
      if (state.status === 'paused') {
        break;
      }

      state.currentGroup = group.groupId;
      
      try {
        await this.executeGroup(group);
        state.completedGroups.push(group.groupId);
      } catch (error) {
        state.failedGroups.push(group.groupId);
        throw error;
      }
    }
  }

  private async executeGroup(group: ExecutionGroup): Promise<void> {
    switch (group.executionMode) {
      case ExecutionMode.SEQUENTIAL:
        await this.executeSequentially(group.actionNodes);
        break;
      case ExecutionMode.PARALLEL:
        await this.executeInParallel(group.actionNodes);
        break;
      case ExecutionMode.CONDITIONAL:
        await this.executeConditionally(group.actionNodes);
        break;
    }
  }

  private async executeSequentially(actionNodes: ActionNode[]): Promise<void> {
    for (const node of actionNodes) {
      await this.executeActionNode(node);
    }
  }

  private async executeInParallel(actionNodes: ActionNode[]): Promise<void> {
    const promises = actionNodes.map(node => this.executeActionNode(node));
    await Promise.all(promises);
  }

  private async executeConditionally(actionNodes: ActionNode[]): Promise<void> {
    for (const node of actionNodes) {
      // Get available context for condition evaluation
      const contextResult = await this.getNodeExecutionContext(node);
      if (contextResult.isFailure) continue;

      const shouldExecute = this.evaluateConditionalExecution(node, contextResult.value);
      if (shouldExecute.isSuccess && shouldExecute.value) {
        await this.executeActionNode(node);
      }
    }
  }

  private async executeActionNode(actionNode: ActionNode): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Update status to executing
      await actionNode.updateStatus(ActionStatus.EXECUTING);
      
      // This would call the actual execution logic based on action type
      // For now, simulate execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update status to completed
      await actionNode.updateStatus(ActionStatus.COMPLETED);
      
      const duration = Date.now() - startTime;
      
      return {
        actionId: actionNode.actionId,
        success: true,
        duration,
        timestamp: new Date()
      };
    } catch (error) {
      // Update status to failed
      await actionNode.updateStatus(ActionStatus.FAILED);
      
      const duration = Date.now() - startTime;
      
      return {
        actionId: actionNode.actionId,
        success: false,
        duration,
        error: String(error),
        timestamp: new Date()
      };
    }
  }

  private async getNodeExecutionContext(actionNode: ActionNode): Promise<Result<Record<string, any>>> {
    // Get context from the context access service
    const contextResult = this.contextAccessService.getNodeContext(
      actionNode.actionId,
      actionNode.parentNodeId,
      'read'
    );

    if (contextResult.isFailure) {
      return Result.fail<Record<string, any>>(contextResult.error);
    }

    return Result.ok<Record<string, any>>(contextResult.value.contextData);
  }

  private calculateBackoffDelay(retryPolicy: any): number {
    // This would implement the actual backoff strategy calculation
    // For now, return a simple delay
    return 1000; // 1 second delay
  }
}