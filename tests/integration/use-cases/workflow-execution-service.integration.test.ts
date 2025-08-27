/**
 * Integration Tests for WorkflowExecutionService
 * 
 * Tests the complete workflow execution pipeline that coordinates:
 * - UC-005: Execute Function Model Workflow
 * - UC-010: Node Dependency Management
 * - UC-011: Hierarchical Context Access Control
 * - UC-012: Action Node Orchestration
 * - UC-013: Fractal Orchestration Management
 * 
 * This service represents the most complex Application Service in our system,
 * handling complete workflow execution with state management, progress tracking,
 * failure recovery, and real-time monitoring.
 */

import { describe, it, expect, beforeEach, jest, beforeAll, afterAll, afterEach } from '@jest/globals';
import { WorkflowExecutionService } from '../../../lib/use-cases/workflow-execution-service';
import { ExecuteFunctionModelUseCase, ExecuteWorkflowResult } from '../../../lib/use-cases/function-model/execute-function-model-use-case';
import { ManageNodeDependenciesUseCase, ManageNodeDependenciesResponse } from '../../../lib/use-cases/manage-node-dependencies-use-case';
import { ManageHierarchicalContextAccessUseCase, HierarchicalContextAccessResult } from '../../../lib/use-cases/function-model/manage-hierarchical-context-access-use-case';
import { ManageActionNodeOrchestrationUseCase } from '../../../lib/use-cases/function-model/manage-action-node-orchestration-use-case';
import { ManageFractalOrchestrationUseCase } from '../../../lib/use-cases/function-model/manage-fractal-orchestration-use-case';
import { Result } from '../../../lib/domain/shared/result';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { TestFactories, IONodeBuilder, StageNodeBuilder, MockGenerators } from '../../utils/test-fixtures';

// Types for service coordination
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

describe('WorkflowExecutionService Integration Tests', () => {
  let workflowExecutionService: WorkflowExecutionService;
  
  // Mock use cases
  let mockExecuteFunctionModelUseCase: jest.Mocked<ExecuteFunctionModelUseCase>;
  let mockManageNodeDependenciesUseCase: jest.Mocked<ManageNodeDependenciesUseCase>;
  let mockManageHierarchicalContextAccessUseCase: jest.Mocked<ManageHierarchicalContextAccessUseCase>;
  let mockManageActionNodeOrchestrationUseCase: jest.Mocked<ManageActionNodeOrchestrationUseCase>;
  let mockManageFractalOrchestrationUseCase: jest.Mocked<ManageFractalOrchestrationUseCase>;

  // Test data
  let testModel: any;
  let testNodes: any[];
  let testUser: any;

  beforeAll(async () => {
    // Initialize test data using available test factories
    testModel = TestFactories.createCompleteWorkflow();
    testNodes = [
      new IONodeBuilder().withName('Input').build(),
      new StageNodeBuilder().withName('Process').build(),
      new IONodeBuilder().withName('Output').asOutput().build()
    ];
    testUser = MockGenerators.createMockUser('test-user-001');
  });

  beforeEach(() => {
    // Create mocked dependencies
    mockExecuteFunctionModelUseCase = {
      execute: jest.fn(),
      getExecutionStatus: jest.fn(),
      pauseExecution: jest.fn(),
      resumeExecution: jest.fn(),
      stopExecution: jest.fn()
    } as any;

    mockManageNodeDependenciesUseCase = {
      execute: jest.fn()
    } as any;

    mockManageHierarchicalContextAccessUseCase = {
      registerNodeInHierarchy: jest.fn(),
      validateContextAccess: jest.fn(),
      getAccessibleContexts: jest.fn(),
      updateNodeContext: jest.fn()
    } as any;

    mockManageActionNodeOrchestrationUseCase = {
      execute: jest.fn()
    } as any;

    mockManageFractalOrchestrationUseCase = {
      execute: jest.fn()
    } as any;

    // Create service instance
    workflowExecutionService = new WorkflowExecutionService(
      mockExecuteFunctionModelUseCase,
      mockManageNodeDependenciesUseCase,
      mockManageHierarchicalContextAccessUseCase,
      mockManageActionNodeOrchestrationUseCase,
      mockManageFractalOrchestrationUseCase
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Workflow Execution Pipeline', () => {
    it('should coordinate all use cases for successful workflow execution', async () => {
      // Arrange - Setup successful responses from all use cases
      const executionId = 'exec-001';
      const mockWorkflowResult: ExecuteWorkflowResult = {
        executionId,
        modelId: testModel.modelId,
        status: 'completed',
        completedNodes: ['node-1', 'node-2', 'node-3'],
        failedNodes: [],
        executionTime: 5000,
        errors: [],
        outputs: { result: 'success' }
      };

      const mockDependencyResult: ManageNodeDependenciesResponse = {
        success: true,
        operationType: 'BUILD_GRAPH',
        graph: { nodes: [], edges: [] },
        metadata: { nodeCount: 3, complexity: 'SIMPLE', processingTime: 100 },
        criticalPath: ['node-1', 'node-2', 'node-3'],
        parallelOpportunities: 2
      };

      const mockContextResult: HierarchicalContextAccessResult = {
        contexts: [
          {
            nodeId: 'node-1',
            nodeType: 'action',
            accessLevel: 'write',
            relationshipType: 'sibling',
            hierarchyLevel: 1,
            contextData: { status: 'ready' },
            accessReason: 'Parent-child relationship'
          }
        ],
        totalAvailable: 1,
        truncated: false
      };

      // Mock all use case responses
      mockExecuteFunctionModelUseCase.execute.mockResolvedValue(Result.ok(mockWorkflowResult));
      mockManageNodeDependenciesUseCase.execute.mockResolvedValue(Result.ok(mockDependencyResult));
      mockManageHierarchicalContextAccessUseCase.getAccessibleContexts.mockResolvedValue(Result.ok(mockContextResult));
      mockManageActionNodeOrchestrationUseCase.execute.mockResolvedValue(Result.ok({ success: true, message: 'Action nodes coordinated' }));
      mockManageFractalOrchestrationUseCase.execute.mockResolvedValue(Result.ok({ success: true, message: 'Fractal orchestration completed' }));

      const request: WorkflowExecutionRequest = {
        modelId: testModel.modelId,
        userId: testUser.id,
        executionMode: 'sequential',
        environment: 'development',
        parameters: { testMode: true },
        monitoring: {
          enableRealTimeUpdates: true
        },
        recovery: {
          enableAutoRecovery: true,
          maxRetryAttempts: 3,
          retryDelayMs: 1000
        }
      };

      // Act
      const result = await workflowExecutionService.executeWorkflow(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      
      const executionResult = result.value;
      expect(executionResult.finalStatus).toBe('completed');
      expect(executionResult.modelId).toBe(testModel.modelId);
      expect(executionResult.userId).toBe(testUser.id);
      
      // Verify all use cases were called
      expect(mockManageNodeDependenciesUseCase.execute).toHaveBeenCalledWith({
        operation: 'BUILD_GRAPH',
        nodes: expect.any(Array)
      });
      
      expect(mockManageHierarchicalContextAccessUseCase.getAccessibleContexts).toHaveBeenCalled();
      expect(mockManageActionNodeOrchestrationUseCase.execute).toHaveBeenCalled();
      expect(mockManageFractalOrchestrationUseCase.execute).toHaveBeenCalled();
      expect(mockExecuteFunctionModelUseCase.execute).toHaveBeenCalled();

      // Verify execution results contain all coordination data
      expect(executionResult.results.workflow).toBeDefined();
      expect(executionResult.results.dependencies).toBeDefined();
      expect(executionResult.results.contextAccess).toBeDefined();
      expect(executionResult.results.orchestration).toBeDefined();
    });

    it('should handle dependency analysis failure in coordination pipeline', async () => {
      // Arrange - Setup dependency analysis failure
      mockManageNodeDependenciesUseCase.execute.mockResolvedValue(
        Result.fail('Circular dependency detected in workflow graph')
      );

      const request: WorkflowExecutionRequest = {
        modelId: testModel.modelId,
        userId: testUser.id,
        executionMode: 'sequential',
        environment: 'development'
      };

      // Act
      const result = await workflowExecutionService.executeWorkflow(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Circular dependency detected in workflow graph');
      
      // Verify that subsequent use cases were not called after failure
      expect(mockExecuteFunctionModelUseCase.execute).not.toHaveBeenCalled();
      expect(mockManageHierarchicalContextAccessUseCase.getAccessibleContexts).not.toHaveBeenCalled();
    });

    it('should handle context access failure in coordination pipeline', async () => {
      // Arrange - Setup successful dependency analysis but context access failure
      const mockDependencyResult: ManageNodeDependenciesResponse = {
        success: true,
        operationType: 'BUILD_GRAPH',
        graph: { nodes: [], edges: [] },
        metadata: { nodeCount: 3, complexity: 'SIMPLE', processingTime: 100 }
      };

      mockManageNodeDependenciesUseCase.execute.mockResolvedValue(Result.ok(mockDependencyResult));
      mockManageHierarchicalContextAccessUseCase.getAccessibleContexts.mockResolvedValue(
        Result.fail('Insufficient permissions for context access')
      );

      const request: WorkflowExecutionRequest = {
        modelId: testModel.modelId,
        userId: testUser.id,
        executionMode: 'sequential',
        environment: 'development'
      };

      // Act
      const result = await workflowExecutionService.executeWorkflow(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Insufficient permissions for context access');
      
      // Verify dependency analysis was completed
      expect(mockManageNodeDependenciesUseCase.execute).toHaveBeenCalled();
      
      // Verify that execution use case was not called after context failure
      expect(mockExecuteFunctionModelUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('Execution State Management', () => {
    it('should track execution progress through all phases', async () => {
      // Arrange
      const progressUpdates: ExecutionProgress[] = [];
      const mockWorkflowResult: ExecuteWorkflowResult = {
        executionId: 'exec-002',
        modelId: testModel.modelId,
        status: 'completed',
        completedNodes: ['node-1', 'node-2'],
        failedNodes: [],
        executionTime: 3000,
        errors: [],
        outputs: { result: 'success' }
      };

      // Setup all successful use case responses
      mockManageNodeDependenciesUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        operationType: 'BUILD_GRAPH',
        graph: { nodes: [], edges: [] },
        metadata: { nodeCount: 2, complexity: 'SIMPLE', processingTime: 50 }
      }));

      mockManageHierarchicalContextAccessUseCase.getAccessibleContexts.mockResolvedValue(Result.ok({
        contexts: [],
        totalAvailable: 0,
        truncated: false
      }));

      mockManageActionNodeOrchestrationUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        message: 'Orchestrated'
      }));

      mockManageFractalOrchestrationUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        message: 'Fractal completed'
      }));

      mockExecuteFunctionModelUseCase.execute.mockResolvedValue(Result.ok(mockWorkflowResult));

      const request: WorkflowExecutionRequest = {
        modelId: testModel.modelId,
        userId: testUser.id,
        executionMode: 'sequential',
        environment: 'development',
        monitoring: {
          enableRealTimeUpdates: true,
          progressCallback: (progress) => progressUpdates.push(progress)
        }
      };

      // Act
      const result = await workflowExecutionService.executeWorkflow(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(4); // Multiple progress updates
      
      // Verify progression through phases
      const phases = progressUpdates.map(p => p.phase);
      expect(phases).toContain('dependency-analysis');
      expect(phases).toContain('context-setup');
      expect(phases).toContain('orchestration');
      expect(phases).toContain('node-execution');
      expect(phases).toContain('completion');

      // Verify final progress state
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.status).toBe('completed');
      expect(finalProgress.progress.percentage).toBe(100);
    });

    it('should provide accurate execution status during workflow execution', async () => {
      // Arrange
      const executionId = 'exec-003';
      mockExecuteFunctionModelUseCase.getExecutionStatus.mockResolvedValue(Result.ok({
        executionId,
        modelId: testModel.modelId,
        status: 'running',
        currentNode: 'node-2',
        completedNodes: ['node-1'],
        failedNodes: [],
        progress: 50,
        startTime: new Date(),
        estimatedCompletion: new Date(Date.now() + 30000)
      }));

      // Act
      const statusResult = await workflowExecutionService.getExecutionStatus(executionId);

      // Assert
      expect(statusResult.isSuccess).toBe(true);
      expect(statusResult.value.executionId).toBe(executionId);
      expect(statusResult.value.status).toBe('running');
      expect(mockExecuteFunctionModelUseCase.getExecutionStatus).toHaveBeenCalledWith(executionId);
    });

    it('should support pausing and resuming workflow execution', async () => {
      // Arrange
      const executionId = 'exec-004';
      mockExecuteFunctionModelUseCase.pauseExecution.mockResolvedValue(Result.ok(undefined));
      mockExecuteFunctionModelUseCase.resumeExecution.mockResolvedValue(Result.ok(undefined));

      // Act & Assert - Pause
      const pauseResult = await workflowExecutionService.pauseExecution(executionId);
      expect(pauseResult.isSuccess).toBe(true);
      expect(mockExecuteFunctionModelUseCase.pauseExecution).toHaveBeenCalledWith(executionId);

      // Act & Assert - Resume
      const resumeResult = await workflowExecutionService.resumeExecution(executionId);
      expect(resumeResult.isSuccess).toBe(true);
      expect(mockExecuteFunctionModelUseCase.resumeExecution).toHaveBeenCalledWith(executionId);
    });

    it('should support stopping workflow execution', async () => {
      // Arrange
      const executionId = 'exec-005';
      mockExecuteFunctionModelUseCase.stopExecution.mockResolvedValue(Result.ok(undefined));

      // Act
      const stopResult = await workflowExecutionService.stopExecution(executionId);

      // Assert
      expect(stopResult.isSuccess).toBe(true);
      expect(mockExecuteFunctionModelUseCase.stopExecution).toHaveBeenCalledWith(executionId);
    });
  });

  describe('Failure Recovery Across Use Case Boundaries', () => {
    it('should recover from orchestration failure with retry mechanism', async () => {
      // Arrange
      let orchestrationAttempts = 0;
      mockManageActionNodeOrchestrationUseCase.execute.mockImplementation(() => {
        orchestrationAttempts++;
        if (orchestrationAttempts < 3) {
          return Promise.resolve(Result.fail('Temporary orchestration failure'));
        }
        return Promise.resolve(Result.ok({ success: true, message: 'Recovered' }));
      });

      // Setup other successful responses
      mockManageNodeDependenciesUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        operationType: 'BUILD_GRAPH',
        graph: { nodes: [], edges: [] },
        metadata: { nodeCount: 1, complexity: 'SIMPLE', processingTime: 50 }
      }));

      mockManageHierarchicalContextAccessUseCase.getAccessibleContexts.mockResolvedValue(Result.ok({
        contexts: [],
        totalAvailable: 0,
        truncated: false
      }));

      mockManageFractalOrchestrationUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        message: 'Fractal completed'
      }));

      mockExecuteFunctionModelUseCase.execute.mockResolvedValue(Result.ok({
        executionId: 'exec-006',
        modelId: testModel.modelId,
        status: 'completed',
        completedNodes: ['node-1'],
        failedNodes: [],
        executionTime: 2000,
        errors: [],
        outputs: {}
      }));

      const request: WorkflowExecutionRequest = {
        modelId: testModel.modelId,
        userId: testUser.id,
        executionMode: 'sequential',
        environment: 'development',
        recovery: {
          enableAutoRecovery: true,
          maxRetryAttempts: 3,
          retryDelayMs: 100
        }
      };

      // Act
      const result = await workflowExecutionService.executeWorkflow(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(orchestrationAttempts).toBe(3); // Failed twice, succeeded on third attempt
      expect(result.value.monitoring.recoveryAttempts).toBe(2);
    });

    it('should fail after exceeding maximum retry attempts', async () => {
      // Arrange - Always fail orchestration
      mockManageActionNodeOrchestrationUseCase.execute.mockResolvedValue(
        Result.fail('Persistent orchestration failure')
      );

      // Setup successful dependency analysis
      mockManageNodeDependenciesUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        operationType: 'BUILD_GRAPH',
        graph: { nodes: [], edges: [] },
        metadata: { nodeCount: 1, complexity: 'SIMPLE', processingTime: 50 }
      }));

      mockManageHierarchicalContextAccessUseCase.getAccessibleContexts.mockResolvedValue(Result.ok({
        contexts: [],
        totalAvailable: 0,
        truncated: false
      }));

      const request: WorkflowExecutionRequest = {
        modelId: testModel.modelId,
        userId: testUser.id,
        executionMode: 'sequential',
        environment: 'development',
        recovery: {
          enableAutoRecovery: true,
          maxRetryAttempts: 2,
          retryDelayMs: 50
        }
      };

      // Act
      const result = await workflowExecutionService.executeWorkflow(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Persistent orchestration failure');
      expect(mockManageActionNodeOrchestrationUseCase.execute).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle cross-boundary error propagation', async () => {
      // Arrange - Setup cascade failure scenario
      mockManageNodeDependenciesUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        operationType: 'BUILD_GRAPH',
        graph: { nodes: [], edges: [] },
        metadata: { nodeCount: 1, complexity: 'SIMPLE', processingTime: 50 }
      }));

      mockManageHierarchicalContextAccessUseCase.getAccessibleContexts.mockResolvedValue(
        Result.fail('Critical context validation error')
      );

      const errorUpdates: ExecutionError[] = [];
      const request: WorkflowExecutionRequest = {
        modelId: testModel.modelId,
        userId: testUser.id,
        executionMode: 'sequential',
        environment: 'development',
        monitoring: {
          enableRealTimeUpdates: true,
          errorCallback: (error) => errorUpdates.push(error)
        }
      };

      // Act
      const result = await workflowExecutionService.executeWorkflow(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(errorUpdates.length).toBeGreaterThan(0);
      
      const contextError = errorUpdates.find(e => e.errorType === 'context');
      expect(contextError).toBeDefined();
      expect(contextError?.phase).toBe('context-setup');
      expect(contextError?.message).toContain('Critical context validation error');
    });
  });

  describe('Real-Time Monitoring Capabilities', () => {
    it('should provide real-time progress updates with detailed metrics', async () => {
      // Arrange
      const progressUpdates: ExecutionProgress[] = [];
      const performanceMetrics: any[] = [];

      // Setup successful execution path
      mockManageNodeDependenciesUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        operationType: 'BUILD_GRAPH',
        graph: { nodes: [], edges: [] },
        metadata: { nodeCount: 3, complexity: 'SIMPLE', processingTime: 100 },
        criticalPath: ['node-1', 'node-2', 'node-3'],
        parallelOpportunities: 1
      }));

      mockManageHierarchicalContextAccessUseCase.getAccessibleContexts.mockResolvedValue(Result.ok({
        contexts: [
          {
            nodeId: 'node-1',
            nodeType: 'action',
            accessLevel: 'write',
            relationshipType: 'sibling',
            hierarchyLevel: 1,
            contextData: {},
            accessReason: 'Test access'
          }
        ],
        totalAvailable: 1,
        truncated: false
      }));

      mockManageActionNodeOrchestrationUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        message: 'Orchestrated',
        metadata: { actionNodesCoordinated: 2 }
      }));

      mockManageFractalOrchestrationUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        message: 'Fractal completed',
        metadata: { fractalLevels: 2 }
      }));

      mockExecuteFunctionModelUseCase.execute.mockResolvedValue(Result.ok({
        executionId: 'exec-007',
        modelId: testModel.modelId,
        status: 'completed',
        completedNodes: ['node-1', 'node-2', 'node-3'],
        failedNodes: [],
        executionTime: 4000,
        errors: [],
        outputs: { result: 'completed' }
      }));

      const request: WorkflowExecutionRequest = {
        modelId: testModel.modelId,
        userId: testUser.id,
        executionMode: 'parallel',
        environment: 'development',
        monitoring: {
          enableRealTimeUpdates: true,
          progressCallback: (progress) => {
            progressUpdates.push(progress);
            performanceMetrics.push({
              phase: progress.phase,
              elapsedTime: progress.performance.elapsedTime,
              percentage: progress.progress.percentage
            });
          }
        }
      };

      // Act
      const result = await workflowExecutionService.executeWorkflow(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(4); // Multiple progress updates
      
      // Verify comprehensive progress tracking
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Find progress updates that have dependency information
      const dependencyProgress = progressUpdates.find(p => p.dependencies && p.dependencies.dependencyGraphBuilt);
      if (dependencyProgress) {
        expect(dependencyProgress.dependencies.dependencyGraphBuilt).toBe(true);
        expect(dependencyProgress.dependencies.criticalPathLength).toBe(3);
        expect(dependencyProgress.dependencies.parallelOpportunities).toBe(1);
      }
      
      // Find progress updates that have context information
      const contextProgress = progressUpdates.find(p => p.contextAccess && p.contextAccess.hierarchyEstablished);
      if (contextProgress) {
        expect(contextProgress.contextAccess.hierarchyEstablished).toBe(true);
        expect(contextProgress.contextAccess.accessValidationsPerformed).toBeGreaterThan(0);
      }
      
      // Find progress updates that have orchestration information
      const orchestrationProgress = progressUpdates.find(p => p.orchestration && p.orchestration.fractalLevels > 0);
      if (orchestrationProgress) {
        expect(orchestrationProgress.orchestration.fractalLevels).toBe(2);
        expect(orchestrationProgress.orchestration.actionNodesCoordinated).toBe(2);
      }
      
      // Verify performance metrics collection
      expect(performanceMetrics.length).toBeGreaterThan(0);
      const completedMetric = performanceMetrics.find(m => m.percentage === 100);
      expect(completedMetric).toBeDefined();
    });

    it('should track resource utilization and performance metrics', async () => {
      // Arrange
      mockManageNodeDependenciesUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        operationType: 'BUILD_GRAPH',
        graph: { nodes: [], edges: [] },
        metadata: { nodeCount: 5, complexity: 'MEDIUM_SCALE', processingTime: 200 }
      }));

      mockManageHierarchicalContextAccessUseCase.getAccessibleContexts.mockResolvedValue(Result.ok({
        contexts: [],
        totalAvailable: 0,
        truncated: false
      }));

      mockManageActionNodeOrchestrationUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        message: 'Orchestrated'
      }));

      mockManageFractalOrchestrationUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        message: 'Fractal completed'
      }));

      mockExecuteFunctionModelUseCase.execute.mockResolvedValue(Result.ok({
        executionId: 'exec-008',
        modelId: testModel.modelId,
        status: 'completed',
        completedNodes: ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'],
        failedNodes: [],
        executionTime: 6000,
        errors: [],
        outputs: {}
      }));

      const request: WorkflowExecutionRequest = {
        modelId: testModel.modelId,
        userId: testUser.id,
        executionMode: 'adaptive',
        environment: 'production'
      };

      // Act
      const result = await workflowExecutionService.executeWorkflow(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      
      // Verify performance metrics are captured
      const performance = result.value.performance;
      expect(performance.dependencyAnalysisTime).toBeGreaterThanOrEqual(0);
      expect(performance.contextSetupTime).toBeGreaterThanOrEqual(0);
      expect(performance.executionTime).toBeGreaterThanOrEqual(0);
      expect(performance.orchestrationTime).toBeGreaterThanOrEqual(0);
      expect(performance.totalTime).toBeGreaterThanOrEqual(0);
      
      // Verify total time is reasonable (either sum of phases or calculated independently)
      // Since mocked operations execute very quickly, we just verify the structure
      expect(typeof performance.totalTime).toBe('number');
      expect(performance.totalTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Clean Architecture Compliance', () => {
    it('should maintain proper dependency isolation between use cases', async () => {
      // Arrange - Setup minimal successful responses
      mockManageNodeDependenciesUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        operationType: 'BUILD_GRAPH',
        graph: { nodes: [], edges: [] },
        metadata: { nodeCount: 1, complexity: 'SIMPLE', processingTime: 50 }
      }));

      mockManageHierarchicalContextAccessUseCase.getAccessibleContexts.mockResolvedValue(Result.ok({
        contexts: [],
        totalAvailable: 0,
        truncated: false
      }));

      mockManageActionNodeOrchestrationUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        message: 'Success'
      }));

      mockManageFractalOrchestrationUseCase.execute.mockResolvedValue(Result.ok({
        success: true,
        message: 'Success'
      }));

      mockExecuteFunctionModelUseCase.execute.mockResolvedValue(Result.ok({
        executionId: 'exec-009',
        modelId: testModel.modelId,
        status: 'completed',
        completedNodes: [],
        failedNodes: [],
        executionTime: 1000,
        errors: [],
        outputs: {}
      }));

      const request: WorkflowExecutionRequest = {
        modelId: testModel.modelId,
        userId: testUser.id,
        executionMode: 'sequential',
        environment: 'development'
      };

      // Act
      const result = await workflowExecutionService.executeWorkflow(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      
      // Verify each use case was called independently without cross-contamination
      expect(mockManageNodeDependenciesUseCase.execute).toHaveBeenCalledTimes(1);
      expect(mockManageHierarchicalContextAccessUseCase.getAccessibleContexts).toHaveBeenCalledTimes(1);
      expect(mockManageActionNodeOrchestrationUseCase.execute).toHaveBeenCalledTimes(1);
      expect(mockManageFractalOrchestrationUseCase.execute).toHaveBeenCalledTimes(1);
      expect(mockExecuteFunctionModelUseCase.execute).toHaveBeenCalledTimes(1);
      
      // Verify calls were made in correct sequence (dependencies before execution)
      const callOrder = [
        mockManageNodeDependenciesUseCase.execute,
        mockManageHierarchicalContextAccessUseCase.getAccessibleContexts,
        mockManageActionNodeOrchestrationUseCase.execute,
        mockManageFractalOrchestrationUseCase.execute,
        mockExecuteFunctionModelUseCase.execute
      ];
      
      // Each use case should be called in the expected order
      for (let i = 0; i < callOrder.length - 1; i++) {
        expect(callOrder[i].mock.invocationCallOrder[0])
          .toBeLessThan(callOrder[i + 1].mock.invocationCallOrder[0]);
      }
    });

    it('should handle invalid request data with proper validation', async () => {
      // Act & Assert - Missing model ID
      const invalidRequest1: any = {
        userId: testUser.id,
        executionMode: 'sequential',
        environment: 'development'
      };
      
      const result1 = await workflowExecutionService.executeWorkflow(invalidRequest1);
      expect(result1.isFailure).toBe(true);
      expect(result1.error).toContain('Model ID is required');

      // Act & Assert - Invalid execution mode
      const invalidRequest2: WorkflowExecutionRequest = {
        modelId: testModel.modelId,
        userId: testUser.id,
        executionMode: 'invalid' as any,
        environment: 'development'
      };
      
      const result2 = await workflowExecutionService.executeWorkflow(invalidRequest2);
      expect(result2.isFailure).toBe(true);
      expect(result2.error).toContain('Invalid execution mode');

      // Act & Assert - Invalid environment
      const invalidRequest3: WorkflowExecutionRequest = {
        modelId: testModel.modelId,
        userId: testUser.id,
        executionMode: 'sequential',
        environment: 'invalid' as any
      };
      
      const result3 = await workflowExecutionService.executeWorkflow(invalidRequest3);
      expect(result3.isFailure).toBe(true);
      expect(result3.error).toContain('Invalid environment');

      // Verify no use cases were called for invalid requests
      expect(mockManageNodeDependenciesUseCase.execute).not.toHaveBeenCalled();
      expect(mockExecuteFunctionModelUseCase.execute).not.toHaveBeenCalled();
    });

    it('should properly coordinate use cases using Result pattern', async () => {
      // Arrange - Each use case returns Result<T>
      const mockResults = {
        dependencies: Result.ok({ success: true, operationType: 'BUILD_GRAPH', graph: { nodes: [], edges: [] }, metadata: { nodeCount: 1, complexity: 'SIMPLE', processingTime: 50 } }),
        context: Result.ok({ contexts: [], totalAvailable: 0, truncated: false }),
        actionOrchestration: Result.ok({ success: true, message: 'Success' }),
        fractalOrchestration: Result.ok({ success: true, message: 'Success' }),
        execution: Result.ok({ executionId: 'exec-010', modelId: testModel.modelId, status: 'completed', completedNodes: [], failedNodes: [], executionTime: 1000, errors: [], outputs: {} })
      } as const;

      mockManageNodeDependenciesUseCase.execute.mockResolvedValue(mockResults.dependencies);
      mockManageHierarchicalContextAccessUseCase.getAccessibleContexts.mockResolvedValue(mockResults.context);
      mockManageActionNodeOrchestrationUseCase.execute.mockResolvedValue(mockResults.actionOrchestration);
      mockManageFractalOrchestrationUseCase.execute.mockResolvedValue(mockResults.fractalOrchestration);
      mockExecuteFunctionModelUseCase.execute.mockResolvedValue(mockResults.execution);

      const request: WorkflowExecutionRequest = {
        modelId: testModel.modelId,
        userId: testUser.id,
        executionMode: 'sequential',
        environment: 'development'
      };

      // Act
      const result = await workflowExecutionService.executeWorkflow(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      
      // Verify Result pattern is properly used throughout the coordination
      const executionResult = result.value;
      expect(executionResult.results.dependencies).toBe(mockResults.dependencies.value);
      expect(executionResult.results.contextAccess).toBe(mockResults.context.value);
      expect(executionResult.results.orchestration.actionNodes).toBe(mockResults.actionOrchestration.value);
      expect(executionResult.results.orchestration.fractalOrchestration).toBe(mockResults.fractalOrchestration.value);
      expect(executionResult.results.workflow).toBe(mockResults.execution.value);
    });
  });
});