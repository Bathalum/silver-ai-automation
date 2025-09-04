import { FunctionModel, ExecutionResult } from '../../domain/entities/function-model';
import { Result } from '../../domain/shared/result';
import { ExecuteWorkflowCommand } from '../commands/execution-commands';
import { WorkflowOrchestrationService, ExecutionContext, ExecutionStatus } from '../../domain/services/workflow-orchestration-service';
import { ActionNodeExecutionService } from '../../domain/services/action-node-execution-service';
import { FractalOrchestrationService } from '../../domain/services/fractal-orchestration-service';
import { ActionNodeOrchestrationService } from '../../domain/services/action-node-orchestration-service';
import { NodeContextAccessService } from '../../domain/services/node-context-access-service';
import { IFunctionModelRepository, IEventBus } from './create-function-model-use-case';
import { ModelStatus } from '../../domain/enums';

export interface ExecuteWorkflowResult {
  executionId: string;
  modelId: string;
  status: 'completed' | 'failed' | 'running';
  completedNodes: string[];
  failedNodes: string[];
  executionTime: number;
  errors: string[];
  outputs?: Record<string, any>;
}

/**
 * UC-005: Execute Function Model Workflow
 * 
 * This use case orchestrates the execution of a function model workflow by coordinating
 * multiple domain services while maintaining Clean Architecture principles:
 * - Uses WorkflowOrchestrationService for high-level workflow execution
 * - Delegates to ActionNodeExecutionService for individual action execution
 * - Leverages FractalOrchestrationService for nested function models
 * - Uses ActionNodeOrchestrationService for action coordination within containers
 * - Uses NodeContextAccessService for hierarchical context management
 */
export class ExecuteFunctionModelUseCase {
  constructor(
    private modelRepository: IFunctionModelRepository,
    private eventBus: IEventBus,
    private workflowOrchestrationService: WorkflowOrchestrationService,
    private actionNodeExecutionService: ActionNodeExecutionService,
    private fractalOrchestrationService: FractalOrchestrationService,
    private actionNodeOrchestrationService: ActionNodeOrchestrationService,
    private nodeContextAccessService: NodeContextAccessService
  ) {}

  async execute(command: ExecuteWorkflowCommand): Promise<Result<ExecuteWorkflowResult>> {
    try {
      // Basic command validation (without environment)
      if (!command.modelId || command.modelId.trim().length === 0) {
        return Result.fail<ExecuteWorkflowResult>('Model ID is required');
      }

      if (!command.userId || command.userId.trim().length === 0) {
        return Result.fail<ExecuteWorkflowResult>('User ID is required');
      }

      // Retrieve the function model
      const modelResult = await this.modelRepository.findById(command.modelId);
      if (modelResult.isFailure) {
        return Result.fail<ExecuteWorkflowResult>('Function model not found');
      }

      const model = modelResult.value;
      if (!model) {
        return Result.fail<ExecuteWorkflowResult>('Function model not found');
      }

      // Check if user has execution permission
      if (!this.hasExecutionPermission(model, command.userId)) {
        return Result.fail<ExecuteWorkflowResult>('Insufficient permissions to execute this workflow');
      }

      // Check if model can be executed
      if (model.deletedAt) {
        return Result.fail<ExecuteWorkflowResult>('Cannot execute deleted model');
      }

      // BUSINESS RULE: Check publication status FIRST
      if (model.status !== ModelStatus.PUBLISHED) {
        return Result.fail<ExecuteWorkflowResult>('Function model must be published before execution');
      }

      // Set default environment if not provided and validate
      const environment = command.environment || 'development';
      if (!['development', 'staging', 'production'].includes(environment)) {
        return Result.fail<ExecuteWorkflowResult>('Valid environment is required (development, staging, production)');
      }

      // Validate the workflow before execution
      const workflowValidation = model.validateWorkflow();
      if (workflowValidation.isFailure) {
        return Result.fail<ExecuteWorkflowResult>(`Workflow validation failed: ${workflowValidation.error}`);
      }

      const validation = workflowValidation.value;
      if (!validation.isValid) {
        const errorMessage = `Cannot execute invalid workflow: ${validation.errors.join(', ')}`;
        return Result.fail<ExecuteWorkflowResult>(errorMessage);
      }

      // Handle dry run mode
      if (command.dryRun) {
        return this.performDryRun(model, command);
      }

      // Create execution context
      const executionContext: ExecutionContext = {
        modelId: command.modelId,
        executionId: this.generateExecutionId(),
        startTime: new Date(),
        parameters: command.parameters || {},
        userId: command.userId,
        environment: environment
      };

      // Publish execution started event
      await this.eventBus.publish({
        eventType: 'WorkflowExecutionStarted',
        aggregateId: command.modelId,
        eventData: {
          executionId: executionContext.executionId,
          modelId: command.modelId,
          userId: command.userId,
          environment: environment,
          parameters: command.parameters
        },
        userId: command.userId,
        timestamp: executionContext.startTime
      });

      // Inject event bus into orchestration service if not already set
      if (this.workflowOrchestrationService && typeof this.workflowOrchestrationService.setEventBus === 'function') {
        this.workflowOrchestrationService.setEventBus(this.eventBus);
      }

      // Execute the workflow using orchestration service
      const executionResult = await this.workflowOrchestrationService.executeWorkflow(model, executionContext);
      
      if (executionResult.isFailure) {
        // Publish execution failed event
        await this.eventBus.publish({
          eventType: 'WorkflowExecutionFailed',
          aggregateId: command.modelId,
          eventData: {
            executionId: executionContext.executionId,
            modelId: command.modelId,
            userId: command.userId,
            error: executionResult.error,
            failedAt: new Date()
          },
          userId: command.userId,
          timestamp: new Date()
        });

        return Result.fail<ExecuteWorkflowResult>(`Workflow execution failed: ${executionResult.error}`);
      }

      const execution = executionResult.value;

      // Map domain execution result to use case result
      const result: ExecuteWorkflowResult = {
        executionId: executionContext.executionId,
        modelId: command.modelId,
        status: execution.success ? 'completed' : 'failed',
        completedNodes: execution.completedNodes,
        failedNodes: execution.failedNodes,
        executionTime: execution.executionTime,
        errors: execution.errors,
        outputs: this.extractExecutionOutputs(model, execution)
      };

      // Publish appropriate completion event
      const eventType = execution.success ? 'WorkflowExecutionCompleted' : 'WorkflowExecutionFailed';
      await this.eventBus.publish({
        eventType,
        aggregateId: command.modelId,
        eventData: {
          executionId: executionContext.executionId,
          modelId: command.modelId,
          userId: command.userId,
          result,
          completedAt: new Date()
        },
        userId: command.userId,
        timestamp: new Date()
      });

      return Result.ok<ExecuteWorkflowResult>(result);

    } catch (error) {
      return Result.fail<ExecuteWorkflowResult>(
        `Failed to execute function model workflow: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get the execution status of a running workflow
   */
  async getExecutionStatus(executionId: string): Promise<Result<ExecutionStatus>> {
    return this.workflowOrchestrationService.getExecutionStatus(executionId);
  }

  /**
   * Pause a running execution
   */
  async pauseExecution(executionId: string): Promise<Result<void>> {
    return this.workflowOrchestrationService.pauseExecution(executionId);
  }

  /**
   * Resume a paused execution
   */
  async resumeExecution(executionId: string): Promise<Result<void>> {
    return this.workflowOrchestrationService.resumeExecution(executionId);
  }

  /**
   * Stop a running execution
   */
  async stopExecution(executionId: string): Promise<Result<void>> {
    return this.workflowOrchestrationService.stopExecution(executionId);
  }


  private hasExecutionPermission(model: FunctionModel, userId: string): boolean {
    const permissions = model.permissions;
    
    // Owner always has permission
    if (permissions.owner === userId) {
      return true;
    }

    // Check if user is in editors list (editors can execute)
    const editors = permissions.editors as string[] || [];
    if (editors.includes(userId)) {
      return true;
    }

    // Check if user is in viewers list (viewers can execute in development)
    const viewers = permissions.viewers as string[] || [];
    if (viewers.includes(userId)) {
      return true; // Viewers can execute workflows
    }

    // Check for explicit execution permissions
    const executors = permissions.executors as string[] || [];
    if (executors.includes(userId)) {
      return true;
    }

    return false;
  }

  private async performDryRun(
    model: FunctionModel, 
    command: ExecuteWorkflowCommand
  ): Promise<Result<ExecuteWorkflowResult>> {
    // For dry run, we validate the workflow and return estimated execution plan
    const workflowValidation = model.validateWorkflow();
    if (workflowValidation.isFailure) {
      return Result.fail<ExecuteWorkflowResult>(`Dry run validation failed: ${workflowValidation.error}`);
    }

    const validation = workflowValidation.value;
    
    // Calculate estimated execution time based on node count and estimated durations
    const nodeCount = model.nodes.size + model.actionNodes.size;
    const estimatedTime = nodeCount * 1000; // 1 second per node as rough estimate

    return Result.ok<ExecuteWorkflowResult>({
      executionId: 'dry-run-' + this.generateExecutionId(),
      modelId: command.modelId,
      status: 'completed',
      completedNodes: [],
      failedNodes: [],
      executionTime: estimatedTime,
      errors: validation.warnings, // Include warnings as informational errors
      outputs: {
        dryRun: true,
        nodeCount,
        estimatedDuration: estimatedTime,
        validationResults: validation
      }
    });
  }

  private extractExecutionOutputs(model: FunctionModel, execution: ExecutionResult): Record<string, any> {
    // Extract outputs from output nodes
    const outputs: Record<string, any> = {};
    
    // Find all output nodes and their final values
    for (const [nodeId, node] of model.nodes) {
      if (node.name.toLowerCase().includes('output')) {
        outputs[node.name] = {
          nodeId: nodeId,
          status: execution.completedNodes.includes(nodeId) ? 'completed' : 'failed',
          // In a real implementation, this would contain actual output data
          data: `Output from ${node.name}`
        };
      }
    }

    return {
      ...outputs,
      executionSummary: {
        totalNodes: execution.completedNodes.length + execution.failedNodes.length,
        successfulNodes: execution.completedNodes.length,
        failedNodes: execution.failedNodes.length,
        overallSuccess: execution.success
      }
    };
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}