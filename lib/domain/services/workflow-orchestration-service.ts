import { FunctionModel, ExecutionResult } from '../entities/function-model';
import { ActionNode } from '../entities/action-node';
import { Node } from '../entities/node';
import { TetherNode } from '../entities/tether-node';
import { KBNode } from '../entities/kb-node';
import { FunctionModelContainerNode } from '../entities/function-model-container-node';
import { ExecutionMode, ActionStatus } from '../enums';
import { Result } from '../shared/result';

export interface ExecutionContext {
  modelId: string;
  executionId: string;
  startTime: Date;
  parameters: Record<string, any>;
  userId?: string;
  environment: 'development' | 'staging' | 'production';
}

export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  output?: any;
  error?: string;
  retryCount: number;
}

export interface IWorkflowOrchestrationService {
  executeWorkflow(model: FunctionModel, context: ExecutionContext): Promise<Result<ExecutionResult>>;
  orchestrate(model: FunctionModel, context: ExecutionContext): Promise<Result<ExecutionResult>>;
  pauseExecution(executionId: string): Promise<Result<void>>;
  resumeExecution(executionId: string): Promise<Result<void>>;
  stopExecution(executionId: string): Promise<Result<void>>;
  getExecutionStatus(executionId: string): Promise<Result<ExecutionStatus>>;
}

export interface ExecutionStatus {
  executionId: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'stopped';
  progress: number; // 0-100
  currentNodes: string[];
  completedNodes: string[];
  failedNodes: string[];
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export class WorkflowOrchestrationService implements IWorkflowOrchestrationService {
  private executionStates = new Map<string, ExecutionStatus>();
  private pausedExecutions = new Set<string>();
  private eventBus?: any; // IEventBus interface

  constructor(private nodeDependencyService?: any, eventBus?: any) {
    this.eventBus = eventBus;
  }

  setEventBus(eventBus: any): void {
    this.eventBus = eventBus;
  }

  // Alias method for interface compatibility
  async orchestrate(model: FunctionModel, context: ExecutionContext): Promise<Result<ExecutionResult>> {
    return this.executeWorkflow(model, context);
  }

  async executeWorkflow(model: FunctionModel, context: ExecutionContext): Promise<Result<ExecutionResult>> {
    try {
      // Validate model can be executed
      const validationResult = model.validateWorkflow();
      if (validationResult.isFailure) {
        return Result.fail<ExecutionResult>(`Workflow validation failed: ${validationResult.error}`);
      }

      const validation = validationResult.value;
      if (!validation.isValid) {
        return Result.fail<ExecutionResult>(`Cannot execute invalid workflow: ${validation.errors.join(', ')}`);
      }

      // Initialize execution state
      const executionStatus: ExecutionStatus = {
        executionId: context.executionId,
        status: 'running',
        progress: 0,
        currentNodes: [],
        completedNodes: [],
        failedNodes: [],
        startTime: context.startTime,
      };
      
      this.executionStates.set(context.executionId, executionStatus);

      // Publish workflow execution started event
      if (this.eventBus) {
        await this.eventBus.publish({
          eventType: 'WorkflowExecutionStarted',
          aggregateId: context.modelId,
          eventData: {
            executionId: context.executionId,
            modelId: context.modelId,
            userId: context.userId,
            startTime: context.startTime,
            totalNodes: Array.from(model.nodes.values()).length
          },
          userId: context.userId,
          timestamp: context.startTime
        });
      }

      // Calculate execution order
      const executionOrder = this.calculateExecutionOrder(Array.from(model.nodes.values()));
      if (executionOrder.isFailure) {
        return Result.fail<ExecutionResult>(`Failed to calculate execution order: ${executionOrder.error}`);
      }

      const nodeOrder = executionOrder.value;
      const totalNodes = nodeOrder.length;
      const nodeResults = new Map<string, NodeExecutionResult>();

      // Execute nodes in order
      for (let i = 0; i < nodeOrder.length; i++) {
        if (this.pausedExecutions.has(context.executionId)) {
          executionStatus.status = 'paused';
          return Result.ok<ExecutionResult>({
            success: false,
            completedNodes: executionStatus.completedNodes,
            failedNodes: executionStatus.failedNodes,
            executionTime: Date.now() - context.startTime.getTime(),
            errors: ['Execution was paused']
          });
        }

        const node = nodeOrder[i];
        const nodeId = node.nodeId.toString();
        
        executionStatus.currentNodes = [nodeId];
        executionStatus.progress = (i / totalNodes) * 100;

        // Publish node execution started event
        if (this.eventBus) {
          await this.eventBus.publish({
            eventType: 'NodeExecutionStarted',
            aggregateId: nodeId,
            eventData: {
              executionId: context.executionId,
              modelId: context.modelId,
              nodeId: nodeId,
              nodeName: node.name,
              startedAt: new Date()
            },
            userId: context.userId,
            timestamp: new Date()
          });
        }

        // Execute container node (orchestrate its actions)
        const nodeResult = await this.executeContainerNode(node, model, context);
        nodeResults.set(nodeId, nodeResult);

        if (nodeResult.success) {
          executionStatus.completedNodes.push(nodeId);
          
          // Publish node completion event
          if (this.eventBus) {
            await this.eventBus.publish({
              eventType: 'NodeExecutionCompleted',
              aggregateId: nodeId,
              eventData: {
                executionId: context.executionId,
                modelId: context.modelId,
                nodeId: nodeId,
                nodeName: node.name,
                success: true,
                completedAt: nodeResult.endTime,
                executionTime: nodeResult.endTime.getTime() - nodeResult.startTime.getTime(),
                output: nodeResult.output
              },
              userId: context.userId,
              timestamp: nodeResult.endTime
            });
          }
        } else {
          executionStatus.failedNodes.push(nodeId);
          
          // Publish node failure event
          if (this.eventBus) {
            await this.eventBus.publish({
              eventType: 'NodeExecutionFailed',
              aggregateId: nodeId,
              eventData: {
                executionId: context.executionId,
                modelId: context.modelId,
                nodeId: nodeId,
                nodeName: node.name,
                success: false,
                failedAt: nodeResult.endTime,
                error: nodeResult.error,
                retryCount: nodeResult.retryCount
              },
              userId: context.userId,
              timestamp: nodeResult.endTime
            });
          }
          
          // Check if this is a critical failure
          if (this.isCriticalNode(node)) {
            executionStatus.status = 'failed';
            executionStatus.endTime = new Date();
            executionStatus.error = nodeResult.error;
            
            // Publish workflow failure event
            if (this.eventBus) {
              await this.eventBus.publish({
                eventType: 'WorkflowExecutionFailed',
                aggregateId: context.modelId,
                eventData: {
                  executionId: context.executionId,
                  modelId: context.modelId,
                  success: false,
                  failedAt: executionStatus.endTime,
                  error: nodeResult.error,
                  completedNodes: executionStatus.completedNodes.length,
                  failedNodes: executionStatus.failedNodes.length
                },
                userId: context.userId,
                timestamp: executionStatus.endTime
              });
            }
            
            return Result.ok<ExecutionResult>({
              success: false,
              completedNodes: executionStatus.completedNodes,
              failedNodes: executionStatus.failedNodes,
              executionTime: Date.now() - context.startTime.getTime(),
              errors: [nodeResult.error || 'Critical node execution failed']
            });
          }
        }
      }

      // Execution completed
      executionStatus.status = 'completed';
      executionStatus.progress = 100;
      executionStatus.endTime = new Date();
      executionStatus.currentNodes = [];

      const success = executionStatus.failedNodes.length === 0;

      // Publish workflow completion event
      if (this.eventBus) {
        await this.eventBus.publish({
          eventType: success ? 'WorkflowExecutionCompleted' : 'WorkflowExecutionFailed',
          aggregateId: context.modelId,
          eventData: {
            executionId: context.executionId,
            modelId: context.modelId,
            success: success,
            completedAt: executionStatus.endTime,
            totalExecutionTime: Date.now() - context.startTime.getTime(),
            completedNodes: executionStatus.completedNodes.length,
            failedNodes: executionStatus.failedNodes.length,
            errors: executionStatus.failedNodes.map(nodeId => {
              const result = nodeResults.get(nodeId);
              return result?.error || `Node ${nodeId} failed`;
            })
          },
          userId: context.userId,
          timestamp: executionStatus.endTime
        });
      }

      return Result.ok<ExecutionResult>({
        success: success,
        completedNodes: executionStatus.completedNodes,
        failedNodes: executionStatus.failedNodes,
        executionTime: Date.now() - context.startTime.getTime(),
        errors: executionStatus.failedNodes.map(nodeId => {
          const result = nodeResults.get(nodeId);
          return result?.error || `Node ${nodeId} failed`;
        })
      });

    } catch (error) {
      return Result.fail<ExecutionResult>(`Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async pauseExecution(executionId: string): Promise<Result<void>> {
    const executionState = this.executionStates.get(executionId);
    if (!executionState) {
      return Result.fail<void>('Execution not found');
    }

    if (executionState.status !== 'running') {
      return Result.fail<void>('Can only pause running executions');
    }

    this.pausedExecutions.add(executionId);
    executionState.status = 'paused';
    
    return Result.ok<void>(undefined);
  }

  async resumeExecution(executionId: string): Promise<Result<void>> {
    const executionState = this.executionStates.get(executionId);
    if (!executionState) {
      return Result.fail<void>('Execution not found');
    }

    if (executionState.status !== 'paused') {
      return Result.fail<void>('Can only resume paused executions');
    }

    this.pausedExecutions.delete(executionId);
    executionState.status = 'running';
    
    return Result.ok<void>(undefined);
  }

  async stopExecution(executionId: string): Promise<Result<void>> {
    const executionState = this.executionStates.get(executionId);
    if (!executionState) {
      return Result.fail<void>('Execution not found');
    }

    if (executionState.status === 'completed' || executionState.status === 'stopped') {
      return Result.fail<void>('Execution is already completed or stopped');
    }

    this.pausedExecutions.delete(executionId);
    executionState.status = 'stopped';
    executionState.endTime = new Date();
    
    return Result.ok<void>(undefined);
  }

  async getExecutionStatus(executionId: string): Promise<Result<ExecutionStatus>> {
    const executionState = this.executionStates.get(executionId);
    if (!executionState) {
      return Result.fail<ExecutionStatus>('Execution not found');
    }

    return Result.ok<ExecutionStatus>({ ...executionState });
  }

  private calculateExecutionOrder(nodes: Node[]): Result<Node[]> {
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

      // Visit all dependencies first
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
          return Result.fail<Node[]>('Circular dependency detected or invalid node reference');
        }
      }
    }

    return Result.ok<Node[]>(result);
  }

  private async executeContainerNode(
    containerNode: Node, 
    model: FunctionModel, 
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = new Date();
    const nodeId = containerNode.nodeId.toString();

    try {
      // Get action nodes for this container
      const actionNodes = Array.from(model.actionNodes.values())
        .filter(action => action.parentNodeId.equals(containerNode.nodeId))
        .sort((a, b) => a.executionOrder - b.executionOrder);

      if (actionNodes.length === 0) {
        // Container with no actions - just mark as completed
        return {
          nodeId,
          success: true,
          startTime,
          endTime: new Date(),
          retryCount: 0
        };
      }

      // Execute actions based on their execution modes
      const actionResults = await this.executeActions(actionNodes, context);
      
      const failedActions = actionResults.filter(result => !result.success);
      const success = failedActions.length === 0;

      return {
        nodeId,
        success,
        startTime,
        endTime: new Date(),
        output: actionResults.map(r => r.output).filter(o => o !== undefined),
        error: success ? undefined : `Failed actions: ${failedActions.map(a => a.error).join(', ')}`,
        retryCount: 0
      };

    } catch (error) {
      return {
        nodeId,
        success: false,
        startTime,
        endTime: new Date(),
        error: error instanceof Error ? error.message : String(error),
        retryCount: 0
      };
    }
  }

  private async executeActions(
    actionNodes: ActionNode[], 
    context: ExecutionContext
  ): Promise<NodeExecutionResult[]> {
    const results: NodeExecutionResult[] = [];

    // Group actions by execution mode and order
    const sequentialActions = actionNodes.filter(a => a.executionMode === ExecutionMode.SEQUENTIAL);
    const parallelActions = actionNodes.filter(a => a.executionMode === ExecutionMode.PARALLEL);
    const conditionalActions = actionNodes.filter(a => a.executionMode === ExecutionMode.CONDITIONAL);

    // Execute sequential actions first
    for (const action of sequentialActions) {
      const result = await this.executeActionNode(action, context);
      results.push(result);
      
      if (!result.success && this.isCriticalAction(action)) {
        break; // Stop on critical failure
      }
    }

    // Execute parallel actions
    if (parallelActions.length > 0) {
      const parallelResults = await Promise.all(
        parallelActions.map(action => this.executeActionNode(action, context))
      );
      results.push(...parallelResults);
    }

    // Execute conditional actions based on previous results
    for (const action of conditionalActions) {
      const shouldExecute = this.evaluateActionConditions(action, results, context);
      if (shouldExecute) {
        const result = await this.executeActionNode(action, context);
        results.push(result);
      }
    }

    return results;
  }

  private async executeActionNode(
    actionNode: ActionNode, 
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = new Date();
    const nodeId = actionNode.actionId.toString();

    try {
      // Update action status
      await actionNode.updateStatus(ActionStatus.EXECUTING);

      // Publish action started event
      if (this.eventBus) {
        await this.eventBus.publish({
          eventType: 'ActionExecutionStarted',
          aggregateId: nodeId,
          eventData: {
            executionId: context.executionId,
            modelId: context.modelId,
            actionId: nodeId,
            actionName: actionNode.name,
            actionType: actionNode.getActionType(),
            startedAt: startTime
          },
          userId: context.userId,
          timestamp: startTime
        });
      }

      let result: any;
      
      if (actionNode instanceof TetherNode) {
        result = await this.executeTetherNode(actionNode, context);
      } else if (actionNode instanceof KBNode) {
        result = await this.executeKBNode(actionNode, context);
      } else if (actionNode instanceof FunctionModelContainerNode) {
        result = await this.executeFunctionModelContainer(actionNode, context);
      } else {
        throw new Error(`Unsupported action node type: ${actionNode.getActionType()}`);
      }

      // Update status to completed
      await actionNode.updateStatus(ActionStatus.COMPLETED);

      const endTime = new Date();

      // Publish action completed event
      if (this.eventBus) {
        await this.eventBus.publish({
          eventType: 'ActionExecutionCompleted',
          aggregateId: nodeId,
          eventData: {
            executionId: context.executionId,
            modelId: context.modelId,
            actionId: nodeId,
            actionName: actionNode.name,
            actionType: actionNode.getActionType(),
            success: true,
            completedAt: endTime,
            executionTime: endTime.getTime() - startTime.getTime(),
            result: result
          },
          userId: context.userId,
          timestamp: endTime
        });
      }

      return {
        nodeId,
        success: true,
        startTime,
        endTime,
        output: result,
        retryCount: 0
      };

    } catch (error) {
      // Update status to failed
      await actionNode.updateStatus(ActionStatus.FAILED);
      
      const endTime = new Date();

      // Publish action failed event
      if (this.eventBus) {
        await this.eventBus.publish({
          eventType: 'ActionExecutionFailed',
          aggregateId: nodeId,
          eventData: {
            executionId: context.executionId,
            modelId: context.modelId,
            actionId: nodeId,
            actionName: actionNode.name,
            actionType: actionNode.getActionType(),
            success: false,
            failedAt: endTime,
            error: error instanceof Error ? error.message : String(error),
            executionTime: endTime.getTime() - startTime.getTime()
          },
          userId: context.userId,
          timestamp: endTime
        });
      }
      
      return {
        nodeId,
        success: false,
        startTime,
        endTime,
        error: error instanceof Error ? error.message : String(error),
        retryCount: 0
      };
    }
  }

  private async executeTetherNode(node: TetherNode, context: ExecutionContext): Promise<any> {
    // Simulate tether execution
    // In real implementation, this would call the actual Spindle tether
    console.log(`Executing Tether Node: ${node.name}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      tetherReferenceId: node.tetherData.tetherReferenceId,
      executionParameters: node.tetherData.executionParameters,
      result: 'Tether execution completed successfully'
    };
  }

  private async executeKBNode(node: KBNode, context: ExecutionContext): Promise<any> {
    // Simulate KB node processing
    console.log(`Processing KB Node: ${node.name}`);
    
    return {
      kbReferenceId: node.kbData.kbReferenceId,
      shortDescription: node.kbData.shortDescription,
      searchKeywords: node.kbData.searchKeywords,
      result: 'KB content accessed successfully'
    };
  }

  private async executeFunctionModelContainer(node: FunctionModelContainerNode, context: ExecutionContext): Promise<any> {
    // Simulate nested function model execution
    // Execute nested function model
    
    // In real implementation, this would recursively call executeWorkflow
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      nestedModelId: node.containerData.nestedModelId,
      extractedOutputs: node.containerData.outputExtraction?.extractedOutputs || {},
      result: 'Nested function model completed successfully'
    };
  }

  private evaluateActionConditions(
    action: ActionNode, 
    previousResults: NodeExecutionResult[], 
    context: ExecutionContext
  ): boolean {
    // Simple condition evaluation - in real implementation, this would be more sophisticated
    // For now, execute conditional actions only if all previous actions succeeded
    return previousResults.every(result => result.success);
  }

  private isCriticalNode(node: Node): boolean {
    // Determine if a node failure should stop the entire workflow
    // This could be based on node metadata, type, or configuration
    return node.metadata?.critical === true;
  }

  private isCriticalAction(action: ActionNode): boolean {
    // Determine if an action failure should stop container execution
    return action.priority >= 8 || action.metadata?.critical === true;
  }
}