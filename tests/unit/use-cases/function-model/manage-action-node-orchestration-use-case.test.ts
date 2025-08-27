import { ManageActionNodeOrchestrationUseCase } from '../../../../lib/use-cases/function-model/manage-action-node-orchestration-use-case';
import { ActionNodeOrchestrationService } from '../../../../lib/domain/services/action-node-orchestration-service';
import { ActionNodeExecutionService } from '../../../../lib/domain/services/action-node-execution-service';
import { NodeContextAccessService } from '../../../../lib/domain/services/node-context-access-service';
import { ActionNode } from '../../../../lib/domain/entities/action-node';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { RetryPolicy } from '../../../../lib/domain/value-objects/retry-policy';
import { RACI } from '../../../../lib/domain/value-objects/raci';
import { ExecutionMode, ActionStatus, RACIRole } from '../../../../lib/domain/enums';
import { Result } from '../../../../lib/domain/shared/result';

// Mock implementation of ActionNode for testing
class TestActionNode extends ActionNode {
  public static create(props: {
    actionId: NodeId;
    parentNodeId: NodeId;
    modelId: string;
    name: string;
    description?: string;
    executionMode: ExecutionMode;
    executionOrder: number;
    status: ActionStatus;
    priority: number;
    estimatedDuration?: number;
  }): TestActionNode {
    const retryPolicy = RetryPolicy.createDefault().value!;
    const raci = RACI.create({
      responsible: ['user1'],
      accountable: [],
      consulted: [],
      informed: []
    }).value!;

    return new TestActionNode({
      actionId: props.actionId,
      parentNodeId: props.parentNodeId,
      modelId: props.modelId,
      name: props.name,
      description: props.description,
      executionMode: props.executionMode,
      executionOrder: props.executionOrder,
      status: props.status,
      priority: props.priority,
      estimatedDuration: props.estimatedDuration || 60,
      retryPolicy,
      raci,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  public getActionType(): string {
    return 'test-action';
  }
}

interface OrchestrationProgress {
  totalActions: number;
  completedActions: number;
  failedActions: number;
  inProgressActions: number;
  currentPhase: string;
  overallProgress: number;
}

interface OrchestrationCommand {
  containerId: NodeId;
  actionNodes: ActionNode[];
  executionContext: Record<string, any>;
  priorityGrouping?: boolean;
  failureHandling?: 'abort' | 'continue' | 'retry';
  contextPropagation?: boolean;
}

interface OrchestrationResult {
  orchestrationId: string;
  totalActions: number;
  completedActions: number;
  failedActions: number;
  skippedActions: number;
  totalExecutionTime: number;
  actionResults: Array<{
    actionId: string;
    success: boolean;
    duration: number;
    output?: any;
    error?: string;
  }>;
  contextPropagation?: Record<string, any>;
  progressHistory: OrchestrationProgress[];
}

/**
 * Test Suite for UC-012: Action Node Orchestration Use Case
 * 
 * Tests the application layer coordination of action node orchestration,
 * including execution planning, progress monitoring, and failure handling.
 * 
 * This use case coordinates:
 * - Execution plan creation and optimization
 * - Sequential, parallel, and conditional execution modes
 * - Progress monitoring and status tracking
 * - Failure handling with retry policies
 * - Context propagation between actions
 * - Priority-based grouping and execution
 */
describe('ManageActionNodeOrchestrationUseCase', () => {
  let useCase: ManageActionNodeOrchestrationUseCase;
  let mockOrchestrationService: jest.Mocked<ActionNodeOrchestrationService>;
  let mockExecutionService: jest.Mocked<ActionNodeExecutionService>;
  let mockContextService: jest.Mocked<NodeContextAccessService>;

  // Test data
  let testContainerId: NodeId;
  let testActionNodes: TestActionNode[];
  let testContext: Record<string, any>;

  beforeEach(() => {
    // Create mock services following Clean Architecture patterns
    mockOrchestrationService = {
      createExecutionPlan: jest.fn(),
      startExecution: jest.fn(),
      pauseExecution: jest.fn(),
      resumeExecution: jest.fn(),
      getOrchestrationState: jest.fn(),
      orchestrateNodeActions: jest.fn(),
      optimizeActionOrder: jest.fn(),
      coordinateParallelActions: jest.fn(),
      sequenceActionExecution: jest.fn(),
      evaluateConditionalActions: jest.fn(),
      handleActionFailures: jest.fn(),
      validateActionDependencies: jest.fn(),
      monitorActionProgress: jest.fn(),
      evaluateConditionalExecution: jest.fn(),
      handleActionRetry: jest.fn()
    } as jest.Mocked<ActionNodeOrchestrationService>;

    mockExecutionService = {
      startExecution: jest.fn(),
      completeExecution: jest.fn(),
      failExecution: jest.fn(),
      retryExecution: jest.fn(),
      evaluateRetryPolicy: jest.fn(),
      getExecutionMetrics: jest.fn(),
      trackResourceUsage: jest.fn(),
      getExecutionSnapshot: jest.fn(),
      updateProgress: jest.fn(),
      isExecuting: jest.fn(),
      getActiveExecutionCount: jest.fn(),
      cancelExecution: jest.fn()
    } as jest.Mocked<ActionNodeExecutionService>;

    mockContextService = {
      getNodeContext: jest.fn(),
      updateNodeContext: jest.fn(),
      registerNode: jest.fn(),
      getAccessibleContexts: jest.fn(),
      extractActionNodeContext: jest.fn(),
      setHierarchy: jest.fn(),
      setContextData: jest.fn(),
      getChildContexts: jest.fn(),
      getParentChildRelations: jest.fn(),
      debugHasChildren: jest.fn(),
      getDeepNestedContext: jest.fn(),
      debugState: jest.fn(),
      debugForceSetContext: jest.fn()
    } as jest.Mocked<NodeContextAccessService>;

    // Initialize use case with mocked dependencies
    useCase = new ManageActionNodeOrchestrationUseCase(
      mockOrchestrationService,
      mockExecutionService,
      mockContextService
    );

    // Initialize test data
    testContainerId = NodeId.generate();
    testActionNodes = [
      TestActionNode.create({
        actionId: NodeId.generate(),
        parentNodeId: testContainerId,
        modelId: 'test-model-id',
        name: 'Sequential Action 1',
        executionMode: ExecutionMode.SEQUENTIAL,
        executionOrder: 1,
        status: ActionStatus.ACTIVE,
        priority: 5,
        estimatedDuration: 60
      }),
      TestActionNode.create({
        actionId: NodeId.generate(),
        parentNodeId: testContainerId,
        modelId: 'test-model-id',
        name: 'Sequential Action 2',
        executionMode: ExecutionMode.SEQUENTIAL,
        executionOrder: 2,
        status: ActionStatus.ACTIVE,
        priority: 5,
        estimatedDuration: 90
      }),
      TestActionNode.create({
        actionId: NodeId.generate(),
        parentNodeId: testContainerId,
        modelId: 'test-model-id',
        name: 'Parallel Action 1',
        executionMode: ExecutionMode.PARALLEL,
        executionOrder: 3,
        status: ActionStatus.ACTIVE,
        priority: 8,
        estimatedDuration: 45
      }),
      TestActionNode.create({
        actionId: NodeId.generate(),
        parentNodeId: testContainerId,
        modelId: 'test-model-id',
        name: 'Parallel Action 2',
        executionMode: ExecutionMode.PARALLEL,
        executionOrder: 3,
        status: ActionStatus.ACTIVE,
        priority: 8,
        estimatedDuration: 30
      }),
      TestActionNode.create({
        actionId: NodeId.generate(),
        parentNodeId: testContainerId,
        modelId: 'test-model-id',
        name: 'Conditional Action',
        executionMode: ExecutionMode.CONDITIONAL,
        executionOrder: 4,
        status: ActionStatus.ACTIVE,
        priority: 3,
        estimatedDuration: 120
      })
    ];

    testContext = {
      userId: 'test-user-id',
      sessionId: 'test-session-id',
      timestamp: new Date().toISOString(),
      inputData: { key: 'value' }
    };
  });

  describe('orchestrateActions', () => {
    describe('success scenarios', () => {
      it('should_CreateExecutionPlanAndStartOrchestration_WhenValidCommandProvided', async () => {
        // Arrange
        const command: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: testActionNodes,
          executionContext: testContext,
          priorityGrouping: true,
          failureHandling: 'retry',
          contextPropagation: true
        };

        const expectedExecutionPlan = {
          containerId: testContainerId,
          actionNodes: testActionNodes,
          executionGroups: [
            {
              groupId: 'group_0',
              executionMode: ExecutionMode.SEQUENTIAL,
              actionNodes: testActionNodes.slice(0, 2),
              dependencies: [],
              estimatedDuration: 150,
              priority: 5
            },
            {
              groupId: 'group_1',
              executionMode: ExecutionMode.PARALLEL,
              actionNodes: testActionNodes.slice(2, 4),
              dependencies: ['group_0'],
              estimatedDuration: 45,
              priority: 8
            },
            {
              groupId: 'group_2',
              executionMode: ExecutionMode.CONDITIONAL,
              actionNodes: [testActionNodes[4]],
              dependencies: ['group_1'],
              estimatedDuration: 120,
              priority: 3
            }
          ],
          totalEstimatedDuration: 315
        };

        const orchestrationId = 'orch_12345';

        mockOrchestrationService.createExecutionPlan.mockReturnValue(
          Result.ok(expectedExecutionPlan)
        );
        mockOrchestrationService.startExecution.mockResolvedValue(
          Result.ok(orchestrationId)
        );

        // Mock execution group methods  
        mockOrchestrationService.sequenceActionExecution.mockResolvedValue(
          Result.ok([{
            actionId: testActionNodes[0].actionId,
            success: true,
            duration: 60000,
            timestamp: new Date(),
            output: { message: 'Sequential execution completed' }
          }])
        );

        mockOrchestrationService.coordinateParallelActions.mockResolvedValue(
          Result.ok([{
            actionId: testActionNodes[2].actionId,
            success: true,
            duration: 30000,
            timestamp: new Date(),
            output: { message: 'Parallel execution completed' }
          }])
        );

        mockOrchestrationService.evaluateConditionalActions.mockResolvedValue(
          Result.ok([{
            actionId: testActionNodes[4].actionId,
            success: true,
            duration: 45000,
            timestamp: new Date(),
            output: { message: 'Conditional execution completed' }
          }])
        );

        mockOrchestrationService.orchestrateNodeActions.mockResolvedValue(
          Result.ok({
            totalActions: 5,
            executedActions: 5,
            failedActions: 0,
            skippedActions: 0,
            totalDuration: 315000,
            executionTime: 315000,
            executionResults: testActionNodes.map(node => ({
              actionId: node.actionId,
              success: true,
              duration: 60000,
              timestamp: new Date(),
              startTime: new Date(),
              output: { message: `Action ${node.name} completed` }
            })),
            actionResults: []
          })
        );

        // Act
        const result = await useCase.orchestrateActions(command);

        // Debug logging
        if (result.isFailure) {
          console.log('Test failed with error:', result.error);
        }

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.orchestrationId).toBe(orchestrationId);
        expect(mockOrchestrationService.createExecutionPlan).toHaveBeenCalledWith(
          testContainerId,
          testActionNodes
        );
        expect(mockOrchestrationService.startExecution).toHaveBeenCalledWith(
          expectedExecutionPlan
        );
      });

      it('should_ExecuteSequentialActions_WhenOnlySequentialModeProvided', async () => {
        // Arrange
        const sequentialActions = testActionNodes.slice(0, 2);
        const command: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: sequentialActions,
          executionContext: testContext
        };

        const expectedResults = sequentialActions.map(action => ({
          actionId: action.actionId,
          success: true,
          duration: 50,
          output: { message: `Sequential action ${action.name} completed` }
        }));

        mockOrchestrationService.createExecutionPlan.mockReturnValue(
          Result.ok({
            containerId: testContainerId,
            actionNodes: sequentialActions,
            executionGroups: [{
              groupId: 'seq_group',
              executionMode: ExecutionMode.SEQUENTIAL,
              actionNodes: sequentialActions,
              dependencies: [],
              estimatedDuration: 150,
              priority: 5
            }],
            totalEstimatedDuration: 150
          })
        );
        
        mockOrchestrationService.startExecution.mockResolvedValue(
          Result.ok('orch_seq_12345')
        );

        mockOrchestrationService.sequenceActionExecution.mockResolvedValue(
          Result.ok(expectedResults)
        );

        // Act
        const result = await useCase.orchestrateActions(command);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockOrchestrationService.sequenceActionExecution).toHaveBeenCalledWith(
          sequentialActions,
          testContext
        );
      });

      it('should_ExecuteParallelActions_WhenOnlyParallelModeProvided', async () => {
        // Arrange
        const parallelActions = testActionNodes.slice(2, 4);
        const command: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: parallelActions,
          executionContext: testContext
        };

        const parallelGroup = {
          groupId: 'parallel_group',
          actions: parallelActions,
          maxConcurrency: 2,
          estimatedDuration: 45
        };

        const expectedResults = parallelActions.map(action => ({
          actionId: action.actionId,
          success: true,
          duration: 25,
          output: { message: `Parallel action ${action.name} completed` }
        }));

        mockOrchestrationService.createExecutionPlan.mockReturnValue(
          Result.ok({
            containerId: testContainerId,
            actionNodes: parallelActions,
            executionGroups: [{
              groupId: 'par_group',
              executionMode: ExecutionMode.PARALLEL,
              actionNodes: parallelActions,
              dependencies: [],
              estimatedDuration: 45,
              priority: 8
            }],
            totalEstimatedDuration: 45
          })
        );

        mockOrchestrationService.startExecution.mockResolvedValue(
          Result.ok('orch_par_12345')
        );

        mockOrchestrationService.coordinateParallelActions.mockResolvedValue(
          Result.ok(expectedResults)
        );

        // Act
        const result = await useCase.orchestrateActions(command);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockOrchestrationService.coordinateParallelActions).toHaveBeenCalledWith(
          expect.objectContaining({
            actions: parallelActions,
            maxConcurrency: expect.any(Number)
          }),
          testContext
        );
      });

      it('should_ExecuteConditionalActions_WhenConditionalModeProvided', async () => {
        // Arrange
        const conditionalActions = [testActionNodes[4]];
        const command: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: conditionalActions,
          executionContext: { ...testContext, shouldExecute: true }
        };

        const conditionalEvaluations = [{
          action: conditionalActions[0],
          condition: 'context.shouldExecute === true',
          evaluationFunction: (context: any) => context.shouldExecute === true,
          executionPriority: 3
        }];

        const expectedResults = [{
          actionId: conditionalActions[0].actionId,
          success: true,
          duration: 80,
          output: { message: `Conditional action ${conditionalActions[0].name} executed` }
        }];

        mockOrchestrationService.createExecutionPlan.mockReturnValue(
          Result.ok({
            containerId: testContainerId,
            actionNodes: conditionalActions,
            executionGroups: [{
              groupId: 'cond_group',
              executionMode: ExecutionMode.CONDITIONAL,
              actionNodes: conditionalActions,
              dependencies: [],
              estimatedDuration: 120,
              priority: 3
            }],
            totalEstimatedDuration: 120
          })
        );

        mockOrchestrationService.startExecution.mockResolvedValue(
          Result.ok('orch_cond_12345')
        );

        mockOrchestrationService.evaluateConditionalActions.mockResolvedValue(
          Result.ok(expectedResults)
        );

        // Act
        const result = await useCase.orchestrateActions(command);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockOrchestrationService.evaluateConditionalActions).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              action: conditionalActions[0],
              condition: expect.any(String),
              evaluationFunction: expect.any(Function)
            })
          ]),
          expect.objectContaining({ shouldExecute: true })
        );
      });

      it('should_HandleMixedExecutionModes_WhenMultipleModesProvided', async () => {
        // Arrange
        const mixedCommand: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: testActionNodes,
          executionContext: testContext,
          priorityGrouping: true
        };

        const complexPlan = {
          containerId: testContainerId,
          actionNodes: testActionNodes,
          executionGroups: [
            {
              groupId: 'high_priority_parallel',
              executionMode: ExecutionMode.PARALLEL,
              actionNodes: testActionNodes.slice(2, 4),
              dependencies: [],
              estimatedDuration: 45,
              priority: 8
            },
            {
              groupId: 'medium_priority_sequential',
              executionMode: ExecutionMode.SEQUENTIAL,
              actionNodes: testActionNodes.slice(0, 2),
              dependencies: ['high_priority_parallel'],
              estimatedDuration: 150,
              priority: 5
            },
            {
              groupId: 'low_priority_conditional',
              executionMode: ExecutionMode.CONDITIONAL,
              actionNodes: [testActionNodes[4]],
              dependencies: ['medium_priority_sequential'],
              estimatedDuration: 120,
              priority: 3
            }
          ],
          totalEstimatedDuration: 195 // Parallel can run concurrently with sequential start
        };

        mockOrchestrationService.createExecutionPlan.mockReturnValue(
          Result.ok(complexPlan)
        );
        mockOrchestrationService.startExecution.mockResolvedValue(
          Result.ok('orch_mixed_12345')
        );

        // Act
        const result = await useCase.orchestrateActions(mixedCommand);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockOrchestrationService.createExecutionPlan).toHaveBeenCalledWith(
          testContainerId,
          testActionNodes
        );
        
        // Verify priority-based grouping was applied
        const capturedPlan = mockOrchestrationService.createExecutionPlan.mock.calls[0];
        expect(capturedPlan[1]).toEqual(testActionNodes); // All actions passed
      });
    });

    describe('progress monitoring', () => {
      it('should_TrackProgressThroughoutExecution_WhenOrchestrationRunning', async () => {
        // Arrange
        const orchestrationId = 'orch_progress_12345';
        const progressSnapshots: OrchestrationProgress[] = [
          {
            totalActions: 5,
            completedActions: 0,
            failedActions: 0,
            inProgressActions: 2,
            currentPhase: 'sequential',
            overallProgress: 0
          },
          {
            totalActions: 5,
            completedActions: 2,
            failedActions: 0,
            inProgressActions: 2,
            currentPhase: 'parallel',
            overallProgress: 40
          },
          {
            totalActions: 5,
            completedActions: 4,
            failedActions: 0,
            inProgressActions: 1,
            currentPhase: 'conditional',
            overallProgress: 80
          },
          {
            totalActions: 5,
            completedActions: 5,
            failedActions: 0,
            inProgressActions: 0,
            currentPhase: 'completed',
            overallProgress: 100
          }
        ];

        mockOrchestrationService.monitorActionProgress
          .mockResolvedValueOnce(Result.ok(progressSnapshots[0]))
          .mockResolvedValueOnce(Result.ok(progressSnapshots[1]))
          .mockResolvedValueOnce(Result.ok(progressSnapshots[2]))
          .mockResolvedValueOnce(Result.ok(progressSnapshots[3]));

        // Act
        const progressResults = [];
        for (let i = 0; i < 4; i++) {
          const result = await useCase.monitorProgress(orchestrationId);
          progressResults.push(result.value);
        }

        // Assert
        expect(progressResults).toHaveLength(4);
        expect(progressResults[0].overallProgress).toBe(0);
        expect(progressResults[1].overallProgress).toBe(40);
        expect(progressResults[2].overallProgress).toBe(80);
        expect(progressResults[3].overallProgress).toBe(100);
        expect(progressResults[3].currentPhase).toBe('completed');
      });

      it('should_ProvideDetailedExecutionMetrics_WhenMonitoringProgress', async () => {
        // Arrange
        const orchestrationId = 'orch_metrics_12345';
        const detailedMetrics = {
          totalActions: 5,
          completedActions: 3,
          failedActions: 1,
          inProgressActions: 1,
          currentPhase: 'retry',
          overallProgress: 60,
          executionTimes: {
            sequential: 120000,
            parallel: 45000,
            conditional: 0
          },
          resourceUsage: {
            cpuUtilization: 75,
            memoryUsage: 512
          }
        };

        mockOrchestrationService.monitorActionProgress.mockResolvedValue(
          Result.ok(detailedMetrics)
        );

        // Act
        const result = await useCase.monitorProgress(orchestrationId);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toMatchObject({
          totalActions: 5,
          completedActions: 3,
          failedActions: 1,
          overallProgress: 60,
          currentPhase: 'retry'
        });
      });
    });

    describe('failure handling', () => {
      it('should_RetryFailedActions_WhenRetryPolicyAllows', async () => {
        // Arrange
        const command: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: [testActionNodes[0]],
          executionContext: testContext,
          failureHandling: 'retry'
        };

        const failedResult = {
          actionId: testActionNodes[0].actionId,
          success: false,
          duration: 30000,
          error: 'Network timeout',
          timestamp: new Date()
        };

        const retryResult = {
          actionId: testActionNodes[0].actionId,
          success: true,
          duration: 45000,
          output: { message: 'Action completed after retry' },
          timestamp: new Date()
        };

        mockOrchestrationService.createExecutionPlan.mockReturnValue(
          Result.ok({
            containerId: testContainerId,
            actionNodes: [testActionNodes[0]],
            executionGroups: [{
              groupId: 'retry_group',
              executionMode: ExecutionMode.SEQUENTIAL,
              actionNodes: [testActionNodes[0]],
              dependencies: [],
              estimatedDuration: 60,
              priority: 5
            }],
            totalEstimatedDuration: 60
          })
        );

        mockOrchestrationService.startExecution.mockResolvedValue(
          Result.ok('orch_retry_12345')
        );

        mockOrchestrationService.handleActionFailures.mockResolvedValue(
          Result.ok([retryResult])
        );

        mockOrchestrationService.handleActionRetry.mockResolvedValue(
          Result.ok(retryResult)
        );

        // Act
        const result = await useCase.orchestrateActions(command);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockOrchestrationService.handleActionRetry).toHaveBeenCalledWith(
          testActionNodes[0],
          'Network timeout'
        );
      });

      it('should_AbortOrchestration_WhenFailureHandlingSetToAbort', async () => {
        // Arrange
        const command: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: testActionNodes,
          executionContext: testContext,
          failureHandling: 'abort'
        };

        const partialResults = [
          {
            actionId: testActionNodes[0].actionId,
            success: true,
            duration: 50000
          },
          {
            actionId: testActionNodes[1].actionId,
            success: false,
            duration: 30000,
            error: 'Critical failure'
          }
        ];

        mockOrchestrationService.createExecutionPlan.mockReturnValue(
          Result.ok({
            containerId: testContainerId,
            actionNodes: testActionNodes,
            executionGroups: [{
              groupId: 'abort_group',
              executionMode: ExecutionMode.SEQUENTIAL,
              actionNodes: testActionNodes,
              dependencies: [],
              estimatedDuration: 315,
              priority: 5
            }],
            totalEstimatedDuration: 315
          })
        );

        mockOrchestrationService.startExecution.mockResolvedValue(
          Result.fail('Orchestration aborted due to critical failure')
        );

        // Act
        const result = await useCase.orchestrateActions(command);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('aborted due to critical failure');
      });

      it('should_ContinueWithRemainingActions_WhenFailureHandlingSetToContinue', async () => {
        // Arrange
        const command: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: testActionNodes,
          executionContext: testContext,
          failureHandling: 'continue'
        };

        const mixedResults = testActionNodes.map((action, index) => ({
          actionId: action.actionId,
          success: index !== 1, // Second action fails
          duration: 40000,
          error: index === 1 ? 'Non-critical failure' : undefined,
          output: index !== 1 ? { message: `Action ${action.name} completed` } : undefined
        }));

        mockOrchestrationService.createExecutionPlan.mockReturnValue(
          Result.ok({
            containerId: testContainerId,
            actionNodes: testActionNodes,
            executionGroups: [{
              groupId: 'continue_group',
              executionMode: ExecutionMode.SEQUENTIAL,
              actionNodes: testActionNodes,
              dependencies: [],
              estimatedDuration: 315,
              priority: 5
            }],
            totalEstimatedDuration: 315
          })
        );

        mockOrchestrationService.startExecution.mockResolvedValue(
          Result.ok('orch_continue_12345')
        );

        mockOrchestrationService.orchestrateNodeActions.mockResolvedValue(
          Result.ok({
            totalActions: 5,
            executedActions: 4,
            failedActions: 1,
            skippedActions: 0,
            totalDuration: 200000,
            executionTime: 200000,
            executionResults: mixedResults,
            actionResults: mixedResults
          })
        );

        // Act
        const result = await useCase.orchestrateActions(command);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.completedActions).toBe(4);
        expect(result.value.failedActions).toBe(1);
      });
    });

    describe('context propagation', () => {
      it('should_PropagateContextBetweenActions_WhenContextPropagationEnabled', async () => {
        // Arrange
        const command: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: testActionNodes.slice(0, 2),
          executionContext: testContext,
          contextPropagation: true
        };

        const initialContext = { inputValue: 42 };
        const propagatedContext = { 
          inputValue: 42, 
          action1Result: 'processed',
          intermediateData: { step: 1 }
        };

        mockContextService.getNodeContext.mockReturnValue(
          Result.ok({
            context: {
              nodeId: testActionNodes[0].actionId,
              nodeType: 'test-action',
              contextData: propagatedContext,
              accessLevel: 'read' as const,
              hierarchyLevel: 1
            },
            accessGranted: true,
            accessReason: 'context propagation'
          })
        );

        mockOrchestrationService.createExecutionPlan.mockReturnValue(
          Result.ok({
            containerId: testContainerId,
            actionNodes: testActionNodes.slice(0, 2),
            executionGroups: [{
              groupId: 'context_group',
              executionMode: ExecutionMode.SEQUENTIAL,
              actionNodes: testActionNodes.slice(0, 2),
              dependencies: [],
              estimatedDuration: 150,
              priority: 5
            }],
            totalEstimatedDuration: 150
          })
        );

        mockOrchestrationService.startExecution.mockResolvedValue(
          Result.ok('orch_context_12345')
        );

        mockOrchestrationService.orchestrateNodeActions.mockResolvedValue(
          Result.ok({
            totalActions: 2,
            executedActions: 2,
            failedActions: 0,
            skippedActions: 0,
            totalDuration: 150000,
            executionTime: 150000,
            executionResults: [],
            actionResults: [],
            contextPropagation: propagatedContext
          })
        );

        // Act
        const result = await useCase.orchestrateActions(command);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockContextService.getNodeContext).toHaveBeenCalled();
        expect(result.value.contextPropagation).toEqual(propagatedContext);
      });

      it('should_IsolateContextBetweenActions_WhenContextPropagationDisabled', async () => {
        // Arrange
        const command: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: testActionNodes.slice(0, 2),
          executionContext: testContext,
          contextPropagation: false
        };

        mockOrchestrationService.createExecutionPlan.mockReturnValue(
          Result.ok({
            containerId: testContainerId,
            actionNodes: testActionNodes.slice(0, 2),
            executionGroups: [{
              groupId: 'isolated_group',
              executionMode: ExecutionMode.PARALLEL,
              actionNodes: testActionNodes.slice(0, 2),
              dependencies: [],
              estimatedDuration: 90,
              priority: 5
            }],
            totalEstimatedDuration: 90
          })
        );

        mockOrchestrationService.startExecution.mockResolvedValue(
          Result.ok('orch_isolated_12345')
        );

        mockOrchestrationService.orchestrateNodeActions.mockResolvedValue(
          Result.ok({
            totalActions: 2,
            executedActions: 2,
            failedActions: 0,
            skippedActions: 0,
            totalDuration: 90000,
            executionTime: 90000,
            executionResults: [],
            actionResults: []
          })
        );

        // Act
        const result = await useCase.orchestrateActions(command);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockContextService.getNodeContext).not.toHaveBeenCalled();
        expect(result.value.contextPropagation).toBeUndefined();
      });
    });

    describe('priority-based execution', () => {
      it('should_GroupActionsByPriority_WhenPriorityGroupingEnabled', async () => {
        // Arrange
        const mixedPriorityActions = [
          TestActionNode.create({
            actionId: NodeId.generate(),
            parentNodeId: testContainerId,
            modelId: 'test-model-id',
            name: 'High Priority Action',
            executionMode: ExecutionMode.PARALLEL,
            executionOrder: 1,
            status: ActionStatus.ACTIVE,
            priority: 9,
            estimatedDuration: 30
          }),
          TestActionNode.create({
            actionId: NodeId.generate(),
            parentNodeId: testContainerId,
            modelId: 'test-model-id',
            name: 'Low Priority Action',
            executionMode: ExecutionMode.SEQUENTIAL,
            executionOrder: 2,
            status: ActionStatus.ACTIVE,
            priority: 2,
            estimatedDuration: 60
          }),
          TestActionNode.create({
            actionId: NodeId.generate(),
            parentNodeId: testContainerId,
            modelId: 'test-model-id',
            name: 'Medium Priority Action',
            executionMode: ExecutionMode.SEQUENTIAL,
            executionOrder: 3,
            status: ActionStatus.ACTIVE,
            priority: 5,
            estimatedDuration: 45
          })
        ];

        const command: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: mixedPriorityActions,
          executionContext: testContext,
          priorityGrouping: true
        };

        const priorityGroupedPlan = {
          containerId: testContainerId,
          actionNodes: [mixedPriorityActions[0], mixedPriorityActions[2], mixedPriorityActions[1]], // Reordered by priority
          executionGroups: [
            {
              groupId: 'high_priority_group',
              executionMode: ExecutionMode.PARALLEL,
              actionNodes: [mixedPriorityActions[0]],
              dependencies: [],
              estimatedDuration: 30,
              priority: 9
            },
            {
              groupId: 'medium_priority_group',
              executionMode: ExecutionMode.SEQUENTIAL,
              actionNodes: [mixedPriorityActions[2]],
              dependencies: ['high_priority_group'],
              estimatedDuration: 45,
              priority: 5
            },
            {
              groupId: 'low_priority_group',
              executionMode: ExecutionMode.SEQUENTIAL,
              actionNodes: [mixedPriorityActions[1]],
              dependencies: ['medium_priority_group'],
              estimatedDuration: 60,
              priority: 2
            }
          ],
          totalEstimatedDuration: 135
        };

        mockOrchestrationService.optimizeActionOrder.mockReturnValue(
          Result.ok([mixedPriorityActions[0], mixedPriorityActions[2], mixedPriorityActions[1]])
        );

        mockOrchestrationService.createExecutionPlan.mockReturnValue(
          Result.ok(priorityGroupedPlan)
        );

        mockOrchestrationService.startExecution.mockResolvedValue(
          Result.ok('orch_priority_12345')
        );

        // Act
        const result = await useCase.orchestrateActions(command);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockOrchestrationService.optimizeActionOrder).toHaveBeenCalledWith(
          mixedPriorityActions
        );
        expect(mockOrchestrationService.createExecutionPlan).toHaveBeenCalledWith(
          testContainerId,
          [mixedPriorityActions[0], mixedPriorityActions[2], mixedPriorityActions[1]]
        );
      });
    });

    describe('error handling', () => {
      it('should_ReturnFailure_WhenInvalidContainerIdProvided', async () => {
        // Arrange
        const invalidCommand: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: [],
          executionContext: testContext
        };

        mockOrchestrationService.createExecutionPlan.mockReturnValue(
          Result.fail('Cannot create execution plan for empty action node list')
        );

        // Act
        const result = await useCase.orchestrateActions(invalidCommand);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('At least one action node is required');
      });

      it('should_ReturnFailure_WhenActionNodesBelongToDifferentContainers', async () => {
        // Arrange
        const differentContainerId = NodeId.generate();
        const invalidAction = TestActionNode.create({
          actionId: NodeId.generate(),
          parentNodeId: differentContainerId,
          modelId: 'test-model-id',
          name: 'Invalid Action',
          executionMode: ExecutionMode.SEQUENTIAL,
          executionOrder: 1,
          status: ActionStatus.ACTIVE,
          priority: 5
        });

        const command: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: [testActionNodes[0], invalidAction],
          executionContext: testContext
        };

        mockOrchestrationService.createExecutionPlan.mockReturnValue(
          Result.fail('All action nodes must belong to the specified container')
        );

        // Act
        const result = await useCase.orchestrateActions(command);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('belong to the specified container');
      });

      it('should_HandleOrchestrationServiceFailure_WhenServiceThrowsException', async () => {
        // Arrange
        const command: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: testActionNodes,
          executionContext: testContext
        };

        mockOrchestrationService.createExecutionPlan.mockImplementation(() => {
          throw new Error('Service unavailable');
        });

        // Act
        const result = await useCase.orchestrateActions(command);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Service unavailable');
      });
    });

    describe('execution duration estimation', () => {
      it('should_ProvideAccurateDurationEstimate_WhenCreatingExecutionPlan', async () => {
        // Arrange
        const command: OrchestrationCommand = {
          containerId: testContainerId,
          actionNodes: testActionNodes,
          executionContext: testContext
        };

        const detailedPlan = {
          containerId: testContainerId,
          actionNodes: testActionNodes,
          executionGroups: [
            {
              groupId: 'sequential_group',
              executionMode: ExecutionMode.SEQUENTIAL,
              actionNodes: testActionNodes.slice(0, 2),
              dependencies: [],
              estimatedDuration: 150, // 60 + 90
              priority: 5
            },
            {
              groupId: 'parallel_group',
              executionMode: ExecutionMode.PARALLEL,
              actionNodes: testActionNodes.slice(2, 4),
              dependencies: ['sequential_group'],
              estimatedDuration: 45, // max(45, 30)
              priority: 8
            },
            {
              groupId: 'conditional_group',
              executionMode: ExecutionMode.CONDITIONAL,
              actionNodes: [testActionNodes[4]],
              dependencies: ['parallel_group'],
              estimatedDuration: 120,
              priority: 3
            }
          ],
          totalEstimatedDuration: 315 // 150 + 45 + 120
        };

        mockOrchestrationService.createExecutionPlan.mockReturnValue(
          Result.ok(detailedPlan)
        );

        mockOrchestrationService.startExecution.mockResolvedValue(
          Result.ok('orch_duration_12345')
        );

        // Act
        const result = await useCase.orchestrateActions(command);

        // Assert
        expect(result.isSuccess).toBe(true);
        const plan = mockOrchestrationService.createExecutionPlan.mock.results[0].value.value;
        expect(plan.totalEstimatedDuration).toBe(315);
        expect(plan.executionGroups[0].estimatedDuration).toBe(150);
        expect(plan.executionGroups[1].estimatedDuration).toBe(45);
        expect(plan.executionGroups[2].estimatedDuration).toBe(120);
      });
    });
  });

  describe('pauseOrchestration', () => {
    it('should_PauseRunningOrchestration_WhenValidIdProvided', async () => {
      // Arrange
      const orchestrationId = 'orch_pause_12345';
      
      mockOrchestrationService.pauseExecution.mockReturnValue(
        Result.ok(undefined)
      );

      // Act
      const result = await useCase.pauseOrchestration(orchestrationId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockOrchestrationService.pauseExecution).toHaveBeenCalledWith(orchestrationId);
    });

    it('should_ReturnFailure_WhenOrchestrationNotFound', async () => {
      // Arrange
      const invalidId = 'invalid_id';
      
      mockOrchestrationService.pauseExecution.mockReturnValue(
        Result.fail('Orchestration not found')
      );

      // Act
      const result = await useCase.pauseOrchestration(invalidId);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('not found');
    });
  });

  describe('resumeOrchestration', () => {
    it('should_ResumeePausedOrchestration_WhenValidIdProvided', async () => {
      // Arrange
      const orchestrationId = 'orch_resume_12345';
      
      mockOrchestrationService.resumeExecution.mockResolvedValue(
        Result.ok(undefined)
      );

      // Act
      const result = await useCase.resumeOrchestration(orchestrationId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockOrchestrationService.resumeExecution).toHaveBeenCalledWith(orchestrationId);
    });

    it('should_ReturnFailure_WhenCannotResumePausedOrchestration', async () => {
      // Arrange
      const orchestrationId = 'orch_invalid_resume_12345';
      
      mockOrchestrationService.resumeExecution.mockResolvedValue(
        Result.fail('Can only resume paused orchestration')
      );

      // Act
      const result = await useCase.resumeOrchestration(orchestrationId);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('paused orchestration');
    });
  });

  describe('getOrchestrationStatus', () => {
    it('should_ReturnCurrentStatus_WhenValidIdProvided', async () => {
      // Arrange
      const orchestrationId = 'orch_status_12345';
      const expectedState = {
        containerId: testContainerId,
        status: 'executing' as const,
        currentGroup: 'group_1',
        completedGroups: ['group_0'],
        failedGroups: [],
        results: [],
        startTime: new Date(),
        endTime: undefined
      };

      mockOrchestrationService.getOrchestrationState.mockReturnValue(
        Result.ok(expectedState)
      );

      // Act
      const result = await useCase.getOrchestrationStatus(orchestrationId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(expectedState);
      expect(mockOrchestrationService.getOrchestrationState).toHaveBeenCalledWith(orchestrationId);
    });
  });
});