/**
 * Execute AI Agent Task Use Case (UC-019)
 * 
 * Handles the execution of tasks by AI agents with comprehensive monitoring,
 * error handling, and performance tracking. This use case coordinates task
 * execution while maintaining agent state and performance metrics.
 * 
 * Business Rules:
 * - Only enabled agents can execute tasks
 * - Agent must have capacity for additional tasks
 * - Task parameters must be validated before execution
 * - Execution results must be properly captured
 * - Agent performance metrics must be updated
 * 
 * Architecture Compliance:
 * - Uses domain entities for agent management
 * - Implements comprehensive error handling
 * - Updates agent state through domain methods
 * - Publishes execution events for monitoring
 */

import { AIAgent } from '../../domain/entities/ai-agent';
import { AIAgentRepository } from '../../domain/interfaces/ai-agent-repository';
import { IAuditLogRepository } from '../../domain/interfaces/audit-log-repository';
import { IEventBus } from '../../infrastructure/events/supabase-event-bus';
import { NodeId } from '../../domain/value-objects/node-id';
import { Result } from '../../domain/shared/result';
import { AuditLog } from '../../domain/entities/audit-log';

export interface ExecuteAIAgentTaskRequest {
  agentId: string;
  taskId: string;
  taskType: string;
  parameters: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  timeoutMs?: number;
  userId: string;
}

export interface ExecuteAIAgentTaskResponse {
  agentId: string;
  taskId: string;
  executionId: string;
  status: 'completed' | 'failed' | 'timeout';
  results: any;
  executionTimeMs: number;
  completedAt: Date;
  errorMessage?: string;
}

export class ExecuteAIAgentTaskUseCase {
  constructor(
    private readonly agentRepository: AIAgentRepository,
    private readonly auditRepository: IAuditLogRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(request: ExecuteAIAgentTaskRequest): Promise<Result<ExecuteAIAgentTaskResponse>> {
    const startTime = Date.now();
    let agent: AIAgent | null = null;

    try {
      // Validate request
      const validationResult = this.validateRequest(request);
      if (validationResult.isFailure) {
        await this.auditExecutionFailure(request, validationResult.error, 0);
        return Result.fail(validationResult.error);
      }

      // Get and validate agent
      const agentResult = await this.getAndValidateAgent(request.agentId);
      if (agentResult.isFailure) {
        await this.auditExecutionFailure(request, agentResult.error, 0);
        return Result.fail(agentResult.error);
      }

      agent = agentResult.value;

      // Check agent capacity
      const capacityResult = this.checkAgentCapacity(agent);
      if (capacityResult.isFailure) {
        await this.auditExecutionFailure(request, capacityResult.error, 0);
        return Result.fail(capacityResult.error);
      }

      // Validate task parameters
      const parameterValidationResult = await this.validateTaskParameters(agent, request);
      if (parameterValidationResult.isFailure) {
        await this.auditExecutionFailure(request, parameterValidationResult.error, 0);
        return Result.fail(parameterValidationResult.error);
      }

      // Publish execution started event
      await this.publishExecutionStarted(request, agent);

      // Execute the task
      const executionResult = await this.executeTask(agent, request);
      const executionTime = Date.now() - startTime;

      // Update agent performance metrics
      const updateResult = await this.updateAgentMetrics(agent, executionResult.isSuccess, executionTime);
      if (updateResult.isFailure) {
        // Log but don't fail the main operation
        console.warn(`Failed to update agent metrics: ${updateResult.error}`);
      }

      if (executionResult.isFailure) {
        const response: ExecuteAIAgentTaskResponse = {
          agentId: request.agentId,
          taskId: request.taskId,
          executionId: this.generateExecutionId(),
          status: 'failed',
          results: null,
          executionTimeMs: executionTime,
          completedAt: new Date(),
          errorMessage: executionResult.error
        };

        await this.auditExecutionFailure(request, executionResult.error, executionTime);
        await this.publishExecutionCompleted(response);
        return Result.ok(response); // Return success with failed status
      }

      const response: ExecuteAIAgentTaskResponse = {
        agentId: request.agentId,
        taskId: request.taskId,
        executionId: this.generateExecutionId(),
        status: 'completed',
        results: executionResult.value,
        executionTimeMs: executionTime,
        completedAt: new Date()
      };

      // Audit successful execution
      await this.auditSuccessfulExecution(request, response);
      await this.publishExecutionCompleted(response);

      return Result.ok(response);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during task execution';
      
      // Update agent metrics for system error
      if (agent) {
        await this.updateAgentMetrics(agent, false, executionTime);
      }

      await this.auditExecutionFailure(request, errorMessage, executionTime);
      return Result.fail(`Task execution failed: ${errorMessage}`);
    }
  }

  private validateRequest(request: ExecuteAIAgentTaskRequest): Result<void> {
    if (!request.agentId || request.agentId.trim().length === 0) {
      return Result.fail('Agent ID is required');
    }

    if (!request.taskId || request.taskId.trim().length === 0) {
      return Result.fail('Task ID is required');
    }

    if (!request.taskType || request.taskType.trim().length === 0) {
      return Result.fail('Task type is required');
    }

    if (!request.parameters || typeof request.parameters !== 'object') {
      return Result.fail('Task parameters must be provided as an object');
    }

    if (request.timeoutMs && (request.timeoutMs < 1000 || request.timeoutMs > 300000)) {
      return Result.fail('Timeout must be between 1000ms and 300000ms (5 minutes)');
    }

    return Result.ok();
  }

  private async getAndValidateAgent(agentId: string): Promise<Result<AIAgent>> {
    const nodeIdResult = NodeId.create(agentId);
    if (nodeIdResult.isFailure) {
      return Result.fail(`Invalid agent ID format: ${nodeIdResult.error}`);
    }

    const agentResult = await this.agentRepository.findById(nodeIdResult.value);
    if (agentResult.isFailure) {
      return Result.fail(`Failed to find agent: ${agentResult.error}`);
    }

    const agent = agentResult.value;

    if (!agent.isEnabled) {
      return Result.fail('Agent is not enabled for task execution');
    }

    return Result.ok(agent);
  }

  private checkAgentCapacity(agent: AIAgent): Result<void> {
    const maxConcurrentTasks = agent.capabilities.maxConcurrentTasks;
    
    // For this implementation, we'll assume current load is manageable
    // In a real implementation, this would check against actual running tasks
    if (maxConcurrentTasks < 1) {
      return Result.fail('Agent has no available task capacity');
    }

    return Result.ok();
  }

  private async validateTaskParameters(agent: AIAgent, request: ExecuteAIAgentTaskRequest): Promise<Result<void>> {
    // Validate required task-specific parameters
    switch (request.taskType) {
      case 'data-processing':
        if (!request.parameters.dataset && !request.parameters.data) {
          return Result.fail('Data processing tasks require "dataset" or "data" parameter');
        }
        break;

      case 'analysis':
        if (!request.parameters.analysisType) {
          return Result.fail('Analysis tasks require "analysisType" parameter');
        }
        break;

      case 'report-generation':
        if (!request.parameters.reportType && !request.parameters.template) {
          return Result.fail('Report generation tasks require "reportType" or "template" parameter');
        }
        break;

      case 'capability-verification':
        // No additional parameters required for verification tasks
        break;

      default:
        // Generic tasks are allowed with any parameters
        break;
    }

    // Validate agent has required capabilities for task type
    const capabilityValidation = this.validateAgentCapabilitiesForTask(agent, request.taskType);
    if (capabilityValidation.isFailure) {
      return capabilityValidation;
    }

    return Result.ok();
  }

  private validateAgentCapabilitiesForTask(agent: AIAgent, taskType: string): Result<void> {
    const capabilities = agent.capabilities;

    switch (taskType) {
      case 'data-processing':
        if (!capabilities.canRead || !capabilities.canWrite) {
          return Result.fail('Agent lacks required read/write capabilities for data processing');
        }
        break;

      case 'analysis':
        if (!capabilities.canAnalyze) {
          return Result.fail('Agent lacks analysis capability');
        }
        break;

      case 'orchestration':
        if (!capabilities.canOrchestrate) {
          return Result.fail('Agent lacks orchestration capability');
        }
        break;

      case 'execution':
        if (!capabilities.canExecute) {
          return Result.fail('Agent lacks execution capability');
        }
        break;
    }

    return Result.ok();
  }

  private async executeTask(agent: AIAgent, request: ExecuteAIAgentTaskRequest): Promise<Result<any>> {
    try {
      // Simulate task execution based on task type
      const results = await this.performTaskExecution(agent, request);
      return Result.ok(results);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Task execution failed');
    }
  }

  private async performTaskExecution(agent: AIAgent, request: ExecuteAIAgentTaskRequest): Promise<any> {
    // This is a simulation of task execution
    // In a real implementation, this would interface with actual AI systems

    const timeout = request.timeoutMs || 30000; // Default 30 seconds
    const executionPromise = new Promise((resolve, reject) => {
      // Simulate execution time based on task complexity
      const baseExecutionTime = this.calculateExecutionTime(request.taskType, request.parameters);
      
      setTimeout(() => {
        // Simulate success/failure based on agent reliability
        const successRate = agent.getSuccessRate() || 0.8; // Default 80% success rate
        const willSucceed = Math.random() < successRate;

        if (willSucceed) {
          resolve(this.generateTaskResults(request.taskType, request.parameters));
        } else {
          reject(new Error(this.generateFailureReason(request.taskType)));
        }
      }, baseExecutionTime);
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Task execution timeout')), timeout);
    });

    return Promise.race([executionPromise, timeoutPromise]);
  }

  private calculateExecutionTime(taskType: string, parameters: Record<string, any>): number {
    // Base execution times by task type (in milliseconds)
    const baseTimeouts: Record<string, number> = {
      'data-processing': 2000,
      'analysis': 1500,
      'report-generation': 3000,
      'orchestration': 1000,
      'capability-verification': 500,
      'generic': 1000
    };

    const baseTime = baseTimeouts[taskType] || baseTimeouts['generic'];
    
    // Add variance based on parameter complexity
    const complexityFactor = Object.keys(parameters).length * 100;
    
    return baseTime + complexityFactor + Math.random() * 500; // Add random variance
  }

  private generateTaskResults(taskType: string, parameters: Record<string, any>): any {
    switch (taskType) {
      case 'data-processing':
        return {
          processedRecords: Math.floor(Math.random() * 1000) + 100,
          format: 'processed',
          metadata: { processingTime: Date.now(), parameters }
        };

      case 'analysis':
        return {
          analysisResult: 'completed',
          insights: ['Pattern detected', 'Anomaly found'],
          confidence: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
          metadata: { analysisType: parameters.analysisType }
        };

      case 'report-generation':
        return {
          reportGenerated: true,
          format: 'pdf',
          pageCount: Math.floor(Math.random() * 50) + 10,
          reportId: `report-${Date.now()}`
        };

      case 'capability-verification':
        return {
          verified: true,
          capabilities: ['canRead', 'canWrite', 'canAnalyze'],
          verificationTime: Date.now()
        };

      default:
        return {
          output: `Task ${taskType} completed successfully`,
          executionTime: Date.now(),
          parameters
        };
    }
  }

  private generateFailureReason(taskType: string): string {
    const failureReasons: Record<string, string[]> = {
      'data-processing': [
        'Invalid data format',
        'Data corruption detected',
        'Insufficient memory for processing'
      ],
      'analysis': [
        'Analysis model unavailable',
        'Insufficient data for analysis',
        'Analysis timeout exceeded'
      ],
      'report-generation': [
        'Template not found',
        'Report generation service unavailable',
        'Invalid report parameters'
      ],
      'orchestration': [
        'Orchestration service unavailable',
        'Invalid workflow configuration',
        'Dependency service failure'
      ],
      'generic': [
        'Task execution failed',
        'Resource unavailable',
        'System error'
      ]
    };

    const reasons = failureReasons[taskType] || failureReasons['generic'];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  private async updateAgentMetrics(agent: AIAgent, success: boolean, executionTimeMs: number): Promise<Result<void>> {
    try {
      const updateResult = agent.recordExecution(success, executionTimeMs);
      if (updateResult.isFailure) {
        return updateResult;
      }

      const saveResult = await this.agentRepository.save(agent);
      return saveResult;
    } catch (error) {
      return Result.fail(`Failed to update agent metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async publishExecutionStarted(request: ExecuteAIAgentTaskRequest, agent: AIAgent): Promise<void> {
    try {
      await this.eventBus.publish({
        eventType: 'AIAgentTaskStarted',
        aggregateId: request.agentId,
        eventData: {
          taskId: request.taskId,
          taskType: request.taskType,
          agentName: agent.name,
          startedAt: new Date()
        },
        occurredAt: new Date()
      });
    } catch (error) {
      console.warn('Failed to publish execution started event:', error);
    }
  }

  private async publishExecutionCompleted(response: ExecuteAIAgentTaskResponse): Promise<void> {
    try {
      await this.eventBus.publish({
        eventType: 'AIAgentTaskCompleted',
        aggregateId: response.agentId,
        eventData: {
          taskId: response.taskId,
          executionId: response.executionId,
          status: response.status,
          executionTime: response.executionTimeMs,
          completedAt: response.completedAt
        },
        occurredAt: new Date()
      });
    } catch (error) {
      console.warn('Failed to publish execution completed event:', error);
    }
  }

  private async auditSuccessfulExecution(request: ExecuteAIAgentTaskRequest, response: ExecuteAIAgentTaskResponse): Promise<void> {
    try {
      const auditLog = AuditLog.create({
        action: 'AI_AGENT_TASK_EXECUTED',
        userId: request.userId,
        entityId: request.agentId,
        details: {
          taskId: request.taskId,
          taskType: request.taskType,
          executionId: response.executionId,
          status: response.status,
          executionTimeMs: response.executionTimeMs,
          success: response.status === 'completed'
        }
      });

      if (auditLog.isSuccess) {
        await this.auditRepository.save(auditLog.value);
      }
    } catch (error) {
      console.error('Failed to audit task execution:', error);
    }
  }

  private async auditExecutionFailure(request: ExecuteAIAgentTaskRequest, error: string, executionTimeMs: number): Promise<void> {
    try {
      const auditLog = AuditLog.create({
        action: 'AI_AGENT_TASK_FAILED',
        userId: request.userId,
        entityId: request.agentId,
        details: {
          taskId: request.taskId,
          taskType: request.taskType,
          error: error,
          executionTimeMs: executionTimeMs,
          failureReason: 'execution_error'
        }
      });

      if (auditLog.isSuccess) {
        await this.auditRepository.save(auditLog.value);
      }
    } catch (auditError) {
      console.error('Failed to audit task execution failure:', auditError);
    }
  }
}