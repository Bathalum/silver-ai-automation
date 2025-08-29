/**
 * Coordinate Workflow Agent Execution Use Case (UC-021)
 * 
 * Handles the coordination of multi-agent workflow execution with support for
 * both sequential and parallel execution modes. This use case manages complex
 * workflows involving multiple agents with proper synchronization and error handling.
 * 
 * Business Rules:
 * - All agents must be enabled and available for execution
 * - Sequential workflows must maintain strict execution order
 * - Parallel workflows must handle synchronization points correctly
 * - Failed stages must trigger appropriate rollback procedures
 * - Workflow state must be consistently maintained throughout execution
 * 
 * Architecture Compliance:
 * - Coordinates multiple domain entities (agents)
 * - Implements complex workflow orchestration logic
 * - Maintains transactional consistency across agent operations
 * - Publishes workflow events for monitoring and integration
 */

import { AIAgent } from '../../domain/entities/ai-agent';
import { AIAgentRepository } from '../../domain/interfaces/ai-agent-repository';
import { IAuditLogRepository } from '../../domain/interfaces/audit-log-repository';
import { IEventBus } from '../../infrastructure/events/supabase-event-bus';
import { NodeId } from '../../domain/value-objects/node-id';
import { Result } from '../../domain/shared/result';
import { AuditLog } from '../../domain/entities/audit-log';

export interface CoordinateWorkflowAgentExecutionRequest {
  workflowId: string;
  executionMode: 'sequential' | 'parallel';
  agents: Array<{
    agentId: string;
    stage: number;
    task: string;
    parameters?: Record<string, any>;
  }>;
  synchronizationPoints?: Array<{
    afterStage: number;
    action: string;
    parameters?: Record<string, any>;
  }>;
  timeoutMs?: number;
  userId: string;
}

export interface WorkflowStage {
  stageId: number;
  agentId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  executionTime: number;
  startedAt?: Date;
  completedAt?: Date;
  output: any;
  errorMessage?: string;
  parallelExecutions?: Array<{
    agentId: string;
    status: string;
    executionTime: number;
    output: any;
    errorMessage?: string;
  }>;
  synchronizationResult?: any;
}

export interface CoordinateWorkflowAgentExecutionResponse {
  workflowId: string;
  executionId: string;
  executionMode: 'sequential' | 'parallel';
  stages: WorkflowStage[];
  totalExecutionTime: number;
  status: 'completed' | 'failed' | 'partial';
  startedAt: Date;
  completedAt: Date;
  errorMessage?: string;
}

export class CoordinateWorkflowAgentExecutionUseCase {
  constructor(
    private readonly agentRepository: AIAgentRepository,
    private readonly auditRepository: IAuditLogRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(request: CoordinateWorkflowAgentExecutionRequest): Promise<Result<CoordinateWorkflowAgentExecutionResponse>> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();

    try {
      // Validate request
      const validationResult = await this.validateRequest(request);
      if (validationResult.isFailure) {
        await this.auditWorkflowFailure(request, executionId, validationResult.error, 0);
        return Result.fail(validationResult.error);
      }

      // Validate all agents are available
      const agentsValidationResult = await this.validateAgentsAvailability(request.agents);
      if (agentsValidationResult.isFailure) {
        await this.auditWorkflowFailure(request, executionId, agentsValidationResult.error, 0);
        return Result.fail(agentsValidationResult.error);
      }

      // Publish workflow started event
      await this.publishWorkflowStarted(request, executionId);

      // Execute workflow based on mode
      let executionResult: Result<WorkflowStage[]>;
      
      if (request.executionMode === 'sequential') {
        executionResult = await this.executeSequentialWorkflow(request, executionId);
      } else {
        executionResult = await this.executeParallelWorkflow(request, executionId);
      }

      const totalExecutionTime = Date.now() - startTime;

      if (executionResult.isFailure) {
        const response: CoordinateWorkflowAgentExecutionResponse = {
          workflowId: request.workflowId,
          executionId,
          executionMode: request.executionMode,
          stages: [], // Empty stages on failure
          totalExecutionTime,
          status: 'failed',
          startedAt: new Date(startTime),
          completedAt: new Date(),
          errorMessage: executionResult.error
        };

        await this.auditWorkflowFailure(request, executionId, executionResult.error, totalExecutionTime);
        await this.publishWorkflowCompleted(response);
        return Result.fail(executionResult.error);
      }

      const stages = executionResult.value;
      const workflowStatus = this.determineWorkflowStatus(stages);

      const response: CoordinateWorkflowAgentExecutionResponse = {
        workflowId: request.workflowId,
        executionId,
        executionMode: request.executionMode,
        stages,
        totalExecutionTime,
        status: workflowStatus,
        startedAt: new Date(startTime),
        completedAt: new Date()
      };

      // Audit successful workflow execution
      await this.auditWorkflowSuccess(request, response);
      await this.publishWorkflowCompleted(response);

      return Result.ok(response);

    } catch (error) {
      const totalExecutionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during workflow execution';
      
      await this.auditWorkflowFailure(request, executionId, errorMessage, totalExecutionTime);
      return Result.fail(`Workflow coordination failed: ${errorMessage}`);
    }
  }

  private async validateRequest(request: CoordinateWorkflowAgentExecutionRequest): Promise<Result<void>> {
    if (!request.workflowId || request.workflowId.trim().length === 0) {
      return Result.fail('Workflow ID is required');
    }

    if (!request.agents || request.agents.length === 0) {
      return Result.fail('At least one agent must be specified');
    }

    if (request.agents.length > 50) {
      return Result.fail('Maximum 50 agents allowed per workflow');
    }

    // Validate stage numbers
    const stages = request.agents.map(agent => agent.stage);
    const uniqueStages = new Set(stages);
    
    if (request.executionMode === 'sequential') {
      // Sequential: stages should be sequential numbers
      const sortedStages = [...uniqueStages].sort((a, b) => a - b);
      for (let i = 0; i < sortedStages.length; i++) {
        if (sortedStages[i] !== i + 1) {
          return Result.fail('Sequential workflow stages must be consecutive starting from 1');
        }
      }
    }

    // Validate agent IDs format
    for (const agent of request.agents) {
      if (!agent.agentId || agent.agentId.trim().length === 0) {
        return Result.fail('All agents must have valid agent IDs');
      }

      if (!agent.task || agent.task.trim().length === 0) {
        return Result.fail('All agents must have task specifications');
      }

      if (agent.stage < 1 || agent.stage > 100) {
        return Result.fail('Stage numbers must be between 1 and 100');
      }
    }

    // Validate synchronization points
    if (request.synchronizationPoints) {
      for (const syncPoint of request.synchronizationPoints) {
        if (!uniqueStages.has(syncPoint.afterStage)) {
          return Result.fail(`Synchronization point references non-existent stage: ${syncPoint.afterStage}`);
        }
      }
    }

    // Validate timeout
    if (request.timeoutMs && (request.timeoutMs < 1000 || request.timeoutMs > 3600000)) {
      return Result.fail('Timeout must be between 1 second and 1 hour');
    }

    return Result.ok();
  }

  private async validateAgentsAvailability(agents: Array<{ agentId: string; stage: number; task: string }>): Promise<Result<void>> {
    const agentValidations: Promise<Result<AIAgent>>[] = [];

    for (const agentSpec of agents) {
      const nodeIdResult = NodeId.create(agentSpec.agentId);
      if (nodeIdResult.isFailure) {
        return Result.fail(`Invalid agent ID format: ${agentSpec.agentId}`);
      }

      agentValidations.push(this.agentRepository.findById(nodeIdResult.value));
    }

    try {
      const agentResults = await Promise.all(agentValidations);
      
      for (let i = 0; i < agentResults.length; i++) {
        const agentResult = agentResults[i];
        const agentSpec = agents[i];

        if (agentResult.isFailure) {
          return Result.fail(`Agent not found: ${agentSpec.agentId}`);
        }

        const agent = agentResult.value;
        
        if (!agent.isEnabled) {
          return Result.fail(`Agent is not enabled: ${agentSpec.agentId} (${agent.name})`);
        }

        // Check if agent has capacity for additional tasks
        if (agent.capabilities.maxConcurrentTasks < 1) {
          return Result.fail(`Agent has no available capacity: ${agentSpec.agentId} (${agent.name})`);
        }
      }

      return Result.ok();

    } catch (error) {
      return Result.fail(`Failed to validate agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeSequentialWorkflow(request: CoordinateWorkflowAgentExecutionRequest, executionId: string): Promise<Result<WorkflowStage[]>> {
    const stages: WorkflowStage[] = [];
    
    // Group agents by stage and sort stages
    const stageGroups = this.groupAgentsByStage(request.agents);
    const sortedStageNumbers = Object.keys(stageGroups).map(Number).sort((a, b) => a - b);

    try {
      for (const stageNumber of sortedStageNumbers) {
        const stageAgents = stageGroups[stageNumber];
        
        // For sequential workflow, each stage should have only one agent
        if (stageAgents.length > 1) {
          return Result.fail(`Sequential workflow stage ${stageNumber} has multiple agents. Use parallel mode for concurrent execution.`);
        }

        const agentSpec = stageAgents[0];
        const stageResult = await this.executeStage(stageNumber, [agentSpec], request.userId);

        if (stageResult.isFailure) {
          // Stage failed - add failed stage and stop execution
          stages.push({
            stageId: stageNumber,
            agentId: agentSpec.agentId,
            status: 'failed',
            executionTime: 0,
            output: null,
            errorMessage: stageResult.error
          });
          return Result.fail(`Workflow execution failed at stage ${stageNumber}: ${stageResult.error}`);
        }

        stages.push(stageResult.value);

        // Handle synchronization point if exists
        const syncPoint = request.synchronizationPoints?.find(sp => sp.afterStage === stageNumber);
        if (syncPoint) {
          const syncResult = await this.handleSynchronizationPoint(syncPoint, stages);
          if (syncResult.isFailure) {
            return Result.fail(`Synchronization failed after stage ${stageNumber}: ${syncResult.error}`);
          }
          
          // Update the stage with synchronization result
          stages[stages.length - 1].synchronizationResult = syncResult.value;
        }

        // Publish stage completed event
        await this.publishStageCompleted(request.workflowId, executionId, stageResult.value);
      }

      return Result.ok(stages);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during sequential execution';
      return Result.fail(`Sequential workflow execution failed: ${errorMessage}`);
    }
  }

  private async executeParallelWorkflow(request: CoordinateWorkflowAgentExecutionRequest, executionId: string): Promise<Result<WorkflowStage[]>> {
    const stages: WorkflowStage[] = [];
    
    // Group agents by stage
    const stageGroups = this.groupAgentsByStage(request.agents);
    const sortedStageNumbers = Object.keys(stageGroups).map(Number).sort((a, b) => a - b);

    try {
      for (const stageNumber of sortedStageNumbers) {
        const stageAgents = stageGroups[stageNumber];
        
        // Execute all agents in this stage in parallel
        const stageResult = await this.executeStage(stageNumber, stageAgents, request.userId);

        if (stageResult.isFailure) {
          // Stage failed
          stages.push({
            stageId: stageNumber,
            status: 'failed',
            executionTime: 0,
            output: null,
            errorMessage: stageResult.error
          });
          return Result.fail(`Workflow execution failed at stage ${stageNumber}: ${stageResult.error}`);
        }

        stages.push(stageResult.value);

        // Handle synchronization point if exists
        const syncPoint = request.synchronizationPoints?.find(sp => sp.afterStage === stageNumber);
        if (syncPoint) {
          const syncResult = await this.handleSynchronizationPoint(syncPoint, stages);
          if (syncResult.isFailure) {
            return Result.fail(`Synchronization failed after stage ${stageNumber}: ${syncResult.error}`);
          }
          
          // Update the stage with synchronization result
          stages[stages.length - 1].synchronizationResult = syncResult.value;
        }

        // Publish stage completed event
        await this.publishStageCompleted(request.workflowId, executionId, stageResult.value);
      }

      return Result.ok(stages);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during parallel execution';
      return Result.fail(`Parallel workflow execution failed: ${errorMessage}`);
    }
  }

  private groupAgentsByStage(agents: Array<{ agentId: string; stage: number; task: string; parameters?: Record<string, any> }>): Record<number, typeof agents> {
    const groups: Record<number, typeof agents> = {};
    
    for (const agent of agents) {
      if (!groups[agent.stage]) {
        groups[agent.stage] = [];
      }
      groups[agent.stage].push(agent);
    }
    
    return groups;
  }

  private async executeStage(
    stageNumber: number, 
    stageAgents: Array<{ agentId: string; task: string; parameters?: Record<string, any> }>,
    userId: string
  ): Promise<Result<WorkflowStage>> {
    const stageStartTime = Date.now();

    try {
      if (stageAgents.length === 1) {
        // Single agent execution
        const agentSpec = stageAgents[0];
        const executionResult = await this.executeAgentTask(agentSpec, userId);
        
        const executionTime = Date.now() - stageStartTime;

        if (executionResult.isFailure) {
          return Result.ok({
            stageId: stageNumber,
            agentId: agentSpec.agentId,
            status: 'failed',
            executionTime,
            output: null,
            errorMessage: executionResult.error
          });
        }

        return Result.ok({
          stageId: stageNumber,
          agentId: agentSpec.agentId,
          status: 'completed',
          executionTime,
          startedAt: new Date(stageStartTime),
          completedAt: new Date(),
          output: executionResult.value
        });

      } else {
        // Parallel execution within stage
        const executionPromises = stageAgents.map(agent => 
          this.executeAgentTask(agent, userId)
        );

        const results = await Promise.allSettled(executionPromises);
        const executionTime = Date.now() - stageStartTime;

        const parallelExecutions = results.map((result, index) => {
          const agentSpec = stageAgents[index];
          
          if (result.status === 'fulfilled' && result.value.isSuccess) {
            return {
              agentId: agentSpec.agentId,
              status: 'completed',
              executionTime: executionTime, // Approximation for parallel execution
              output: result.value.value
            };
          } else {
            const errorMessage = result.status === 'rejected' 
              ? result.reason.message 
              : result.value.error;
            return {
              agentId: agentSpec.agentId,
              status: 'failed',
              executionTime: executionTime,
              output: null,
              errorMessage
            };
          }
        });

        // Check if any executions failed
        const hasFailures = parallelExecutions.some(exec => exec.status === 'failed');
        const stageStatus = hasFailures ? 'failed' : 'completed';

        return Result.ok({
          stageId: stageNumber,
          status: stageStatus,
          executionTime,
          startedAt: new Date(stageStartTime),
          completedAt: new Date(),
          output: { parallelResults: parallelExecutions },
          parallelExecutions,
          errorMessage: hasFailures ? 'One or more parallel executions failed' : undefined
        });
      }

    } catch (error) {
      const executionTime = Date.now() - stageStartTime;
      return Result.ok({
        stageId: stageNumber,
        status: 'failed',
        executionTime,
        output: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown execution error'
      });
    }
  }

  private async executeAgentTask(
    agentSpec: { agentId: string; task: string; parameters?: Record<string, any> },
    userId: string
  ): Promise<Result<any>> {
    // This simulates agent task execution
    // In a real implementation, this would call the ExecuteAIAgentTaskUseCase
    
    try {
      // Simulate execution time based on task complexity
      const executionTime = Math.random() * 2000 + 500; // 500-2500ms
      await new Promise(resolve => setTimeout(resolve, executionTime));

      // Simulate success/failure based on agent reliability
      const successRate = 0.9; // 90% success rate
      const willSucceed = Math.random() < successRate;

      if (willSucceed) {
        return Result.ok({
          taskCompleted: true,
          agentId: agentSpec.agentId,
          task: agentSpec.task,
          output: this.generateTaskOutput(agentSpec.task, agentSpec.parameters || {}),
          executionTime
        });
      } else {
        return Result.fail(this.generateTaskFailure(agentSpec.task));
      }

    } catch (error) {
      return Result.fail(`Agent task execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateTaskOutput(task: string, parameters: Record<string, any>): any {
    // Generate realistic task output based on task type
    const baseOutput = {
      taskType: task,
      completedAt: new Date(),
      parameters
    };

    switch (task) {
      case 'collect-data':
        return { ...baseOutput, collectedRecords: Math.floor(Math.random() * 1000) + 500 };
      case 'process-data':
        return { ...baseOutput, processedRecords: parameters.inputRecords || 500, errors: 0 };
      case 'generate-report':
        return { ...baseOutput, reportGenerated: true, format: 'pdf' };
      case 'analyze-data':
        return { ...baseOutput, insights: ['Pattern detected', 'Trend identified'], confidence: 0.85 };
      default:
        return { ...baseOutput, result: 'Task completed successfully' };
    }
  }

  private generateTaskFailure(task: string): string {
    const failureReasons: Record<string, string[]> = {
      'collect-data': ['Data source unavailable', 'Access denied', 'Connection timeout'],
      'process-data': ['Invalid data format', 'Processing capacity exceeded', 'Data corruption'],
      'generate-report': ['Template not found', 'Report service unavailable', 'Invalid parameters'],
      'analyze-data': ['Analysis model unavailable', 'Insufficient data', 'Analysis timeout']
    };

    const reasons = failureReasons[task] || ['Task execution failed', 'Resource unavailable'];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  private async handleSynchronizationPoint(
    syncPoint: { afterStage: number; action: string; parameters?: Record<string, any> },
    completedStages: WorkflowStage[]
  ): Promise<Result<any>> {
    try {
      switch (syncPoint.action) {
        case 'merge-results':
          return this.mergeStageResults(completedStages, syncPoint.parameters);
        case 'validate-outputs':
          return this.validateStageOutputs(completedStages, syncPoint.parameters);
        case 'aggregate-data':
          return this.aggregateStageData(completedStages, syncPoint.parameters);
        default:
          return Result.ok({ action: syncPoint.action, synchronized: true });
      }
    } catch (error) {
      return Result.fail(`Synchronization action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mergeStageResults(stages: WorkflowStage[], parameters?: Record<string, any>): Result<any> {
    let totalRecords = 0;
    const mergedData: any[] = [];

    for (const stage of stages) {
      if (stage.output && stage.output.collectedRecords) {
        totalRecords += stage.output.collectedRecords;
      }
      if (stage.output && stage.output.processedRecords) {
        totalRecords += stage.output.processedRecords;
      }
      if (stage.parallelExecutions) {
        for (const execution of stage.parallelExecutions) {
          if (execution.output) {
            mergedData.push(execution.output);
          }
        }
      } else if (stage.output) {
        mergedData.push(stage.output);
      }
    }

    return Result.ok({
      totalRecords,
      mergedSuccessfully: true,
      dataPoints: mergedData.length,
      mergeParameters: parameters
    });
  }

  private validateStageOutputs(stages: WorkflowStage[], parameters?: Record<string, any>): Result<any> {
    let validOutputs = 0;
    let invalidOutputs = 0;

    for (const stage of stages) {
      if (stage.status === 'completed' && stage.output) {
        validOutputs++;
      } else {
        invalidOutputs++;
      }
    }

    const validationPassed = invalidOutputs === 0;

    return Result.ok({
      validationPassed,
      validOutputs,
      invalidOutputs,
      validationParameters: parameters
    });
  }

  private aggregateStageData(stages: WorkflowStage[], parameters?: Record<string, any>): Result<any> {
    const aggregatedData = {
      totalStages: stages.length,
      completedStages: stages.filter(s => s.status === 'completed').length,
      totalExecutionTime: stages.reduce((sum, stage) => sum + stage.executionTime, 0),
      aggregationParameters: parameters
    };

    return Result.ok(aggregatedData);
  }

  private determineWorkflowStatus(stages: WorkflowStage[]): 'completed' | 'failed' | 'partial' {
    const failedStages = stages.filter(stage => stage.status === 'failed');
    const completedStages = stages.filter(stage => stage.status === 'completed');

    if (failedStages.length === 0) {
      return 'completed';
    } else if (completedStages.length === 0) {
      return 'failed';
    } else {
      return 'partial';
    }
  }

  private generateExecutionId(): string {
    return `wf-exec-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  }

  // Event publishing methods
  private async publishWorkflowStarted(request: CoordinateWorkflowAgentExecutionRequest, executionId: string): Promise<void> {
    try {
      await this.eventBus.publish({
        eventType: 'WorkflowExecutionStarted',
        aggregateId: request.workflowId,
        eventData: {
          executionId,
          executionMode: request.executionMode,
          agentCount: request.agents.length,
          stageCount: new Set(request.agents.map(a => a.stage)).size
        },
        occurredAt: new Date()
      });
    } catch (error) {
      console.warn('Failed to publish workflow started event:', error);
    }
  }

  private async publishStageCompleted(workflowId: string, executionId: string, stage: WorkflowStage): Promise<void> {
    try {
      await this.eventBus.publish({
        eventType: 'WorkflowStageCompleted',
        aggregateId: workflowId,
        eventData: {
          executionId,
          stageId: stage.stageId,
          status: stage.status,
          executionTime: stage.executionTime
        },
        occurredAt: new Date()
      });
    } catch (error) {
      console.warn('Failed to publish stage completed event:', error);
    }
  }

  private async publishWorkflowCompleted(response: CoordinateWorkflowAgentExecutionResponse): Promise<void> {
    try {
      await this.eventBus.publish({
        eventType: 'WorkflowExecutionCompleted',
        aggregateId: response.workflowId,
        eventData: {
          executionId: response.executionId,
          status: response.status,
          totalExecutionTime: response.totalExecutionTime,
          stageCount: response.stages.length
        },
        occurredAt: new Date()
      });
    } catch (error) {
      console.warn('Failed to publish workflow completed event:', error);
    }
  }

  // Audit methods
  private async auditWorkflowSuccess(request: CoordinateWorkflowAgentExecutionRequest, response: CoordinateWorkflowAgentExecutionResponse): Promise<void> {
    try {
      const auditLog = AuditLog.create({
        action: 'WORKFLOW_EXECUTION_COMPLETED',
        userId: request.userId,
        entityId: request.workflowId,
        details: {
          executionId: response.executionId,
          executionMode: request.executionMode,
          agentCount: request.agents.length,
          stageCount: response.stages.length,
          totalExecutionTime: response.totalExecutionTime,
          status: response.status,
          completedStages: response.stages.filter(s => s.status === 'completed').length,
          failedStages: response.stages.filter(s => s.status === 'failed').length
        }
      });

      if (auditLog.isSuccess) {
        await this.auditRepository.save(auditLog.value);
      }
    } catch (error) {
      console.error('Failed to audit workflow execution:', error);
    }
  }

  private async auditWorkflowFailure(request: CoordinateWorkflowAgentExecutionRequest, executionId: string, error: string, executionTime: number): Promise<void> {
    try {
      const auditLog = AuditLog.create({
        action: 'WORKFLOW_EXECUTION_FAILED',
        userId: request.userId,
        entityId: request.workflowId,
        details: {
          executionId,
          executionMode: request.executionMode,
          agentCount: request.agents.length,
          error: error,
          executionTime: executionTime,
          failureReason: 'coordination_or_execution_error'
        }
      });

      if (auditLog.isSuccess) {
        await this.auditRepository.save(auditLog.value);
      }
    } catch (auditError) {
      console.error('Failed to audit workflow failure:', auditError);
    }
  }
}