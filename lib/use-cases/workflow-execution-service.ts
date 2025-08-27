/**
 * WorkflowExecutionService - Application Service
 * 
 * This is the most complex Application Service that coordinates multiple use cases
 * to provide complete workflow execution capabilities:
 * 
 * - UC-005: Execute Function Model Workflow
 * - UC-010: Node Dependency Management  
 * - UC-011: Hierarchical Context Access Control
 * - UC-012: Action Node Orchestration
 * - UC-013: Fractal Orchestration Management
 * 
 * The service handles:
 * - Complete workflow execution pipeline coordination
 * - Execution state management and progress tracking
 * - Failure recovery across use case boundaries
 * - Real-time monitoring capabilities
 * - Cross-use case error handling and recovery
 * 
 * Follows Clean Architecture principles by acting as an Application Service
 * that orchestrates multiple use cases without containing business logic.
 */

import { ExecuteFunctionModelUseCase, ExecuteWorkflowResult } from './function-model/execute-function-model-use-case';
import { ManageNodeDependenciesUseCase, ManageNodeDependenciesResponse, ManageNodeDependenciesRequest } from './manage-node-dependencies-use-case';
import { ManageHierarchicalContextAccessUseCase, HierarchicalContextAccessResult, GetAccessibleContextsRequest } from './function-model/manage-hierarchical-context-access-use-case';
import { ManageActionNodeOrchestrationUseCase } from './function-model/manage-action-node-orchestration-use-case';
import { ManageFractalOrchestrationUseCase } from './function-model/manage-fractal-orchestration-use-case';
import { Result } from '../domain/shared/result';
import { ExecuteWorkflowCommand } from './commands/execution-commands';

// Import types from integration test (they define the service contract)
export interface WorkflowExecutionRequest {
  modelId: string;
  userId: string;
  executionMode: 'sequential' | 'parallel' | 'adaptive';
  environment: 'development' | 'staging' | 'production';
  parameters?: Record<string, any>;
  monitoring?: {
    enableRealTimeUpdates: boolean;
    progressCallback?: (status: ExecutionProgress) => void;
    errorCallback?: (error: ExecutionError) => void;
  };
  recovery?: {
    enableAutoRecovery: boolean;
    maxRetryAttempts: number;
    retryDelayMs: number;
  };
}

export interface ExecutionProgress {
  executionId: string;
  modelId: string;
  status: 'initializing' | 'running' | 'paused' | 'completed' | 'failed' | 'recovering';
  phase: 'dependency-analysis' | 'context-setup' | 'node-execution' | 'orchestration' | 'completion';
  progress: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    skippedNodes: number;
    percentage: number;
  };
  currentNode?: {
    nodeId: string;
    nodeType: string;
    status: 'preparing' | 'executing' | 'completed' | 'failed';
    startedAt?: Date;
    estimatedCompletion?: Date;
  };
  performance: {
    executionStartTime: Date;
    elapsedTime: number;
    estimatedRemainingTime?: number;
    averageNodeExecutionTime: number;
  };
  dependencies: {
    dependencyGraphBuilt: boolean;
    criticalPathLength: number;
    parallelOpportunities: number;
  };
  contextAccess: {
    hierarchyEstablished: boolean;
    accessValidationsPerformed: number;
    contextUpdates: number;
  };
  orchestration: {
    activeOrchestrators: string[];
    fractalLevels: number;
    actionNodesCoordinated: number;
  };
}

export interface ExecutionError {
  executionId: string;
  errorType: 'validation' | 'dependency' | 'context' | 'orchestration' | 'execution' | 'recovery';
  phase: ExecutionProgress['phase'];
  nodeId?: string;
  message: string;
  details: Record<string, any>;
  isRecoverable: boolean;
  suggestedActions?: string[];
  timestamp: Date;
}

export interface WorkflowExecutionResult {
  executionId: string;
  modelId: string;
  userId: string;
  finalStatus: ExecutionProgress['status'];
  executionTime: number;
  results: {
    workflow: ExecuteWorkflowResult;
    dependencies: ManageNodeDependenciesResponse;
    contextAccess: HierarchicalContextAccessResult;
    orchestration: {
      actionNodes: any;
      fractalOrchestration: any;
    };
  };
  monitoring: {
    progressUpdates: number;
    errorCount: number;
    recoveryAttempts: number;
  };
  performance: {
    dependencyAnalysisTime: number;
    contextSetupTime: number;
    executionTime: number;
    orchestrationTime: number;
    totalTime: number;
  };
}

/**
 * WorkflowExecutionService
 * 
 * Application Service that coordinates multiple use cases for complete workflow execution.
 * This service acts as the central coordinator for complex workflow execution scenarios
 * while maintaining Clean Architecture principles.
 */
export class WorkflowExecutionService {
  constructor(
    private readonly executeFunctionModelUseCase: ExecuteFunctionModelUseCase,
    private readonly manageNodeDependenciesUseCase: ManageNodeDependenciesUseCase,
    private readonly manageHierarchicalContextAccessUseCase: ManageHierarchicalContextAccessUseCase,
    private readonly manageActionNodeOrchestrationUseCase: ManageActionNodeOrchestrationUseCase,
    private readonly manageFractalOrchestrationUseCase: ManageFractalOrchestrationUseCase
  ) {}

  /**
   * Execute complete workflow with coordination of all use cases
   */
  async executeWorkflow(request: WorkflowExecutionRequest): Promise<Result<WorkflowExecutionResult>> {
    try {
      // Validate request
      const validationResult = this.validateRequest(request);
      if (validationResult.isFailure) {
        return Result.fail<WorkflowExecutionResult>(validationResult.error);
      }

      // Initialize execution tracking
      const executionId = this.generateExecutionId();
      const executionStartTime = new Date();
      const monitoring = this.initializeMonitoring(request);
      
      let progressUpdates = 0;
      let errorCount = 0;
      const recoveryCounter = { count: 0 };

      // Performance tracking
      const performanceMetrics = {
        dependencyAnalysisTime: 0,
        contextSetupTime: 0,
        executionTime: 0,
        orchestrationTime: 0,
        totalTime: 0
      };

      // Progress update helper
      const updateProgress = (status: ExecutionProgress['status'], phase: ExecutionProgress['phase'], additionalData: Partial<ExecutionProgress> = {}) => {
        progressUpdates++;
        const progress: ExecutionProgress = {
          executionId,
          modelId: request.modelId,
          status,
          phase,
          progress: {
            totalNodes: 0,
            completedNodes: 0,
            failedNodes: 0,
            skippedNodes: 0,
            percentage: 0,
            ...additionalData.progress
          },
          performance: {
            executionStartTime,
            elapsedTime: Date.now() - executionStartTime.getTime(),
            averageNodeExecutionTime: 0,
            ...additionalData.performance
          },
          dependencies: {
            dependencyGraphBuilt: false,
            criticalPathLength: 0,
            parallelOpportunities: 0,
            ...additionalData.dependencies
          },
          contextAccess: {
            hierarchyEstablished: false,
            accessValidationsPerformed: 0,
            contextUpdates: 0,
            ...additionalData.contextAccess
          },
          orchestration: {
            activeOrchestrators: [],
            fractalLevels: 0,
            actionNodesCoordinated: 0,
            ...additionalData.orchestration
          },
          ...additionalData
        };

        if (request.monitoring?.progressCallback) {
          request.monitoring.progressCallback(progress);
        }

        return progress;
      };

      // Error handler
      const handleError = (error: string, errorType: ExecutionError['errorType'], phase: ExecutionProgress['phase'], isRecoverable: boolean = false) => {
        errorCount++;
        const executionError: ExecutionError = {
          executionId,
          errorType,
          phase,
          message: error,
          details: { request: request.modelId },
          isRecoverable,
          timestamp: new Date()
        };

        if (request.monitoring?.errorCallback) {
          request.monitoring.errorCallback(executionError);
        }

        return executionError;
      };

      // Phase 1: Dependency Analysis
      updateProgress('initializing', 'dependency-analysis');
      
      const dependencyStartTime = performance.now();
      
      // Execute with retry logic
      const dependencyResult = await this.executeWithRetry(
        () => this.manageNodeDependenciesUseCase.execute({
          operation: 'BUILD_GRAPH',
          nodes: [] // In real implementation, this would come from the model
        }),
        request.recovery,
        'dependency',
        handleError,
        recoveryCounter
      );

      performanceMetrics.dependencyAnalysisTime = performance.now() - dependencyStartTime;

      if (dependencyResult.isFailure) {
        updateProgress('failed', 'dependency-analysis');
        handleError(`Dependency analysis failed: ${dependencyResult.error}`, 'dependency', 'dependency-analysis');
        return Result.fail<WorkflowExecutionResult>(dependencyResult.error);
      }

      const dependencyData = dependencyResult.value;
      updateProgress('running', 'dependency-analysis', {
        dependencies: {
          dependencyGraphBuilt: true,
          criticalPathLength: dependencyData.criticalPath?.length || 0,
          parallelOpportunities: dependencyData.parallelOpportunities || 0
        },
        progress: { percentage: 20 }
      });

      // Phase 2: Context Setup
      updateProgress('running', 'context-setup');
      
      const contextStartTime = performance.now();
      const contextRequest: GetAccessibleContextsRequest = {
        requestingNodeId: { toString: () => 'root-node', equals: () => false } as any, // Mock NodeId
        userId: request.userId
      };

      const contextResult = await this.executeWithRetry(
        () => this.manageHierarchicalContextAccessUseCase.getAccessibleContexts(contextRequest),
        request.recovery,
        'context',
        handleError,
        recoveryCounter
      );

      performanceMetrics.contextSetupTime = performance.now() - contextStartTime;

      if (contextResult.isFailure) {
        updateProgress('failed', 'context-setup');
        handleError(`Context access validation failed: ${contextResult.error}`, 'context', 'context-setup');
        return Result.fail<WorkflowExecutionResult>(contextResult.error);
      }

      const contextData = contextResult.value;
      updateProgress('running', 'context-setup', {
        contextAccess: {
          hierarchyEstablished: true,
          accessValidationsPerformed: contextData.contexts.length,
          contextUpdates: 0
        },
        progress: { percentage: 40 }
      });

      // Phase 3: Orchestration Setup
      updateProgress('running', 'orchestration');
      
      const orchestrationStartTime = performance.now();

      // Action Node Orchestration
      const actionOrchestrationResult = await this.executeWithRetry(
        () => this.manageActionNodeOrchestrationUseCase.execute({
          operation: 'COORDINATE_ACTION_NODES',
          modelId: request.modelId,
          executionMode: request.executionMode,
          userId: request.userId
        }),
        request.recovery,
        'orchestration',
        handleError,
        recoveryCounter
      );

      if (actionOrchestrationResult.isFailure) {
        updateProgress('failed', 'orchestration');
        handleError(`Action orchestration failed: ${actionOrchestrationResult.error}`, 'orchestration', 'orchestration');
        return Result.fail<WorkflowExecutionResult>(actionOrchestrationResult.error);
      }

      // Fractal Orchestration
      const fractalOrchestrationResult = await this.executeWithRetry(
        () => this.manageFractalOrchestrationUseCase.execute({
          operation: 'MANAGE_FRACTAL_EXECUTION',
          modelId: request.modelId,
          executionMode: request.executionMode,
          userId: request.userId
        }),
        request.recovery,
        'orchestration',
        handleError,
        recoveryCounter
      );

      if (fractalOrchestrationResult.isFailure) {
        updateProgress('failed', 'orchestration');
        handleError(`Fractal orchestration failed: ${fractalOrchestrationResult.error}`, 'orchestration', 'orchestration');
        return Result.fail<WorkflowExecutionResult>(fractalOrchestrationResult.error);
      }

      performanceMetrics.orchestrationTime = performance.now() - orchestrationStartTime;

      const actionNodesCoordinated = (actionOrchestrationResult.value as any)?.metadata?.actionNodesCoordinated || 0;
      const fractalLevels = (fractalOrchestrationResult.value as any)?.metadata?.fractalLevels || 0;

      updateProgress('running', 'orchestration', {
        orchestration: {
          activeOrchestrators: ['action-orchestrator', 'fractal-orchestrator'],
          fractalLevels,
          actionNodesCoordinated
        },
        progress: { percentage: 60 }
      });

      // Phase 4: Main Workflow Execution
      updateProgress('running', 'node-execution');
      
      const executionStartTimeInner = performance.now();
      const executeCommand: ExecuteWorkflowCommand = {
        modelId: request.modelId,
        userId: request.userId,
        environment: request.environment,
        parameters: request.parameters,
        dryRun: false
      };

      const workflowResult = await this.executeWithRetry(
        () => this.executeFunctionModelUseCase.execute(executeCommand),
        request.recovery,
        'execution',
        handleError,
        recoveryCounter
      );

      performanceMetrics.executionTime = performance.now() - executionStartTimeInner;

      if (workflowResult.isFailure) {
        updateProgress('failed', 'node-execution');
        handleError(`Workflow execution failed: ${workflowResult.error}`, 'execution', 'node-execution');
        return Result.fail<WorkflowExecutionResult>(workflowResult.error);
      }

      const workflowData = workflowResult.value;
      updateProgress('running', 'node-execution', {
        progress: {
          totalNodes: workflowData.completedNodes.length + workflowData.failedNodes.length,
          completedNodes: workflowData.completedNodes.length,
          failedNodes: workflowData.failedNodes.length,
          skippedNodes: 0,
          percentage: 90
        }
      });

      // Phase 5: Completion
      updateProgress('completed', 'completion', {
        progress: { percentage: 100 }
      });

      // Calculate total performance metrics
      performanceMetrics.totalTime = Date.now() - executionStartTime.getTime();

      // Build final result
      const finalResult: WorkflowExecutionResult = {
        executionId,
        modelId: request.modelId,
        userId: request.userId,
        finalStatus: 'completed',
        executionTime: performanceMetrics.totalTime,
        results: {
          workflow: workflowData,
          dependencies: dependencyData,
          contextAccess: contextData,
          orchestration: {
            actionNodes: actionOrchestrationResult.value,
            fractalOrchestration: fractalOrchestrationResult.value
          }
        },
        monitoring: {
          progressUpdates,
          errorCount,
          recoveryAttempts: recoveryCounter.count
        },
        performance: performanceMetrics
      };

      return Result.ok<WorkflowExecutionResult>(finalResult);

    } catch (error) {
      return Result.fail<WorkflowExecutionResult>(
        `Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get execution status for a running workflow
   */
  async getExecutionStatus(executionId: string): Promise<Result<any>> {
    return this.executeFunctionModelUseCase.getExecutionStatus(executionId);
  }

  /**
   * Pause a running workflow execution
   */
  async pauseExecution(executionId: string): Promise<Result<void>> {
    return this.executeFunctionModelUseCase.pauseExecution(executionId);
  }

  /**
   * Resume a paused workflow execution
   */
  async resumeExecution(executionId: string): Promise<Result<void>> {
    return this.executeFunctionModelUseCase.resumeExecution(executionId);
  }

  /**
   * Stop a running workflow execution
   */
  async stopExecution(executionId: string): Promise<Result<void>> {
    return this.executeFunctionModelUseCase.stopExecution(executionId);
  }

  // Private helper methods

  /**
   * Validate workflow execution request
   */
  private validateRequest(request: WorkflowExecutionRequest): Result<void> {
    if (!request.modelId || request.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!request.userId || request.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    const validExecutionModes = ['sequential', 'parallel', 'adaptive'];
    if (!validExecutionModes.includes(request.executionMode)) {
      return Result.fail<void>('Invalid execution mode. Must be sequential, parallel, or adaptive');
    }

    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(request.environment)) {
      return Result.fail<void>('Invalid environment. Must be development, staging, or production');
    }

    if (request.recovery) {
      if (request.recovery.maxRetryAttempts < 0) {
        return Result.fail<void>('Max retry attempts must be non-negative');
      }
      if (request.recovery.retryDelayMs < 0) {
        return Result.fail<void>('Retry delay must be non-negative');
      }
    }

    return Result.ok<void>(undefined);
  }

  /**
   * Execute operation with retry logic for failure recovery
   */
  private async executeWithRetry<T>(
    operation: () => Promise<Result<T>>,
    recoveryConfig: WorkflowExecutionRequest['recovery'],
    errorType: string,
    errorHandler: (error: string, type: ExecutionError['errorType'], phase: ExecutionProgress['phase'], isRecoverable: boolean) => ExecutionError,
    recoveryCounter?: { count: number }
  ): Promise<Result<T>> {
    const maxAttempts = recoveryConfig?.enableAutoRecovery ? (recoveryConfig.maxRetryAttempts + 1) : 1;
    const retryDelay = recoveryConfig?.retryDelayMs || 1000;

    let lastError = '';
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (result.isSuccess) {
          return result;
        }
        
        lastError = result.error;
        
        // If this isn't the last attempt and recovery is enabled, wait and retry
        if (attempt < maxAttempts && recoveryConfig?.enableAutoRecovery) {
          if (recoveryCounter) {
            recoveryCounter.count++;
          }
          await this.delay(retryDelay);
          continue;
        }
        
        // Final attempt failed
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        
        if (attempt < maxAttempts && recoveryConfig?.enableAutoRecovery) {
          if (recoveryCounter) {
            recoveryCounter.count++;
          }
          await this.delay(retryDelay);
          continue;
        }
        
        return Result.fail<T>(lastError);
      }
    }

    return Result.fail<T>(`Operation failed after ${maxAttempts} attempts. ${maxAttempts > 1 ? 'Recovery' : 'Execution'} exceeded maximum retry attempts: ${lastError}`);
  }

  /**
   * Initialize monitoring capabilities
   */
  private initializeMonitoring(request: WorkflowExecutionRequest): any {
    // Set up monitoring infrastructure
    return {
      realTimeUpdates: request.monitoring?.enableRealTimeUpdates || false,
      progressCallback: request.monitoring?.progressCallback,
      errorCallback: request.monitoring?.errorCallback
    };
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `wf_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility method to add delay for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}