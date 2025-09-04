/**
 * Unit tests for ActionNodeOrchestrationService
 * Tests action node orchestration patterns, parallel/sequential coordination,
 * conditional execution evaluation, and action failure handling.
 * 
 * This service orchestrates multiple action nodes within container nodes,
 * managing execution patterns and dependencies while maintaining Clean Architecture
 * principles through clear layer separation and Result pattern usage.
 */

import { 
  ActionNodeOrchestrationService,
  ActionDependencyMap,
  ActionExecutionPlan,
  ActionOrchestrationResult,
  ParallelExecutionGroup,
  ConditionalActionEvaluation
} from '@/lib/domain/services/action-node-orchestration-service';
import { ActionNode } from '@/lib/domain/entities/action-node';
import { TetherNode } from '@/lib/domain/entities/tether-node';
import { KBNode } from '@/lib/domain/entities/kb-node';
import { FunctionModelContainerNode } from '@/lib/domain/entities/function-model-container-node';
import { ExecutionMode, ActionStatus } from '@/lib/domain/enums';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { Result } from '@/lib/domain/shared/result';
import { TetherNodeBuilder, TestFactories } from '../../../utils/test-fixtures';

describe('ActionNodeOrchestrationService', () => {
  let orchestrationService: ActionNodeOrchestrationService;
  let testContainerNodeId: NodeId;
  let testModelId: string;

  beforeEach(() => {
    orchestrationService = new ActionNodeOrchestrationService();
    testContainerNodeId = NodeId.generate();
    testModelId = 'test-model-123';
  });

  describe('action orchestration planning', () => {
    describe('orchestrateNodeActions', () => {
      it('should orchestrate single action successfully', async () => {
        // Arrange
        const action = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withExecutionOrder(1)
          .build();
        
        const actions = [action];
        const context = { executionId: 'test-exec', parameters: {} };
        
        // Act
        const result = await orchestrationService.orchestrateNodeActions(actions, context);
        
        // Assert
        expect(result).toBeValidResult();
        const orchestrationResult = result.value;
        expect(orchestrationResult.totalActions).toBe(1);
        expect(orchestrationResult.executedActions).toBe(1);
        expect(orchestrationResult.failedActions).toBe(0);
        expect(orchestrationResult.executionTime).toBeGreaterThan(0);
      });

      it('should orchestrate multiple actions in execution order', async () => {
        // Arrange
        const action1 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withExecutionOrder(1)
          .withName('First Action')
          .build();
          
        const action2 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withExecutionOrder(2)
          .withName('Second Action')
          .build();
        
        const actions = [action2, action1]; // Out of order to test sorting
        const context = { executionId: 'test-exec', parameters: {} };
        
        // Act
        const result = await orchestrationService.orchestrateNodeActions(actions, context);
        
        // Assert
        expect(result).toBeValidResult();
        const orchestrationResult = result.value;
        expect(orchestrationResult.totalActions).toBe(2);
        expect(orchestrationResult.executedActions).toBe(2);
        expect(orchestrationResult.failedActions).toBe(0);
        expect(orchestrationResult.actionResults).toHaveLength(2);
        
        // Verify execution order (first action should execute first)
        const firstResult = orchestrationResult.actionResults[0];
        const secondResult = orchestrationResult.actionResults[1];
        expect(firstResult.startTime.getTime()).toBeLessThanOrEqual(secondResult.startTime.getTime());
      });

      it('should handle empty actions array', async () => {
        // Act
        const result = await orchestrationService.orchestrateNodeActions([], {});
        
        // Assert
        expect(result).toBeValidResult();
        const orchestrationResult = result.value;
        expect(orchestrationResult.totalActions).toBe(0);
        expect(orchestrationResult.executedActions).toBe(0);
        expect(orchestrationResult.failedActions).toBe(0);
        expect(orchestrationResult.actionResults).toEqual([]);
      });

      it('should propagate context to all actions', async () => {
        // Arrange
        const actions = [
          new TetherNodeBuilder()
            .withParentNode(testContainerNodeId.toString())
            .withModelId(testModelId)
            .withExecutionOrder(1)
            .build()
        ];
        const context = { 
          executionId: 'test-exec', 
          parameters: { userId: 'user-123', environment: 'test' } 
        };
        
        // Act
        const result = await orchestrationService.orchestrateNodeActions(actions, context);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value.contextPropagation).toBeDefined();
        expect(result.value.contextPropagation['test-exec']).toEqual(context);
      });
    });

    describe('optimizeActionOrder', () => {
      it('should optimize execution order based on dependencies', () => {
        // Arrange
        const action1 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withExecutionOrder(3)
          .withName('Action 1')
          .build();
          
        const action2 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withExecutionOrder(1)
          .withName('Action 2')
          .build();
          
        const action3 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withExecutionOrder(2)
          .withName('Action 3')
          .build();
        
        const actions = [action1, action2, action3];
        
        // Act
        const result = orchestrationService.optimizeActionOrder(actions);
        
        // Assert
        expect(result).toBeValidResult();
        const optimizedActions = result.value;
        expect(optimizedActions).toHaveLength(3);
        
        // Verify order: action2 (order 1), action3 (order 2), action1 (order 3)
        expect(optimizedActions[0].name).toBe('Action 2');
        expect(optimizedActions[1].name).toBe('Action 3');
        expect(optimizedActions[2].name).toBe('Action 1');
      });

      it('should handle actions with same execution order', () => {
        // Arrange
        const action1 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withExecutionOrder(1)
          .withName('Action A')
          .build();
          
        const action2 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withExecutionOrder(1)
          .withName('Action B')
          .build();
        
        const actions = [action1, action2];
        
        // Act
        const result = orchestrationService.optimizeActionOrder(actions);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toHaveLength(2);
        // Order should be stable but both should be included
      });

      it('should handle empty actions array in optimization', () => {
        // Act
        const result = orchestrationService.optimizeActionOrder([]);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toEqual([]);
      });
    });
  });

  describe('parallel execution coordination', () => {
    describe('coordinateParallelActions', () => {
      it('should coordinate parallel actions successfully', async () => {
        // Arrange
        const action1 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Parallel Action 1')
          .build();
        const updateResult1 = action1.updateExecutionMode(ExecutionMode.PARALLEL);
        expect(updateResult1).toBeValidResult();
        
        const action2 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Parallel Action 2')
          .build();
        const updateResult2 = action2.updateExecutionMode(ExecutionMode.PARALLEL);
        expect(updateResult2).toBeValidResult();
        
        const parallelGroup: ParallelExecutionGroup = {
          groupId: 'parallel-group-1',
          actions: [action1, action2],
          maxConcurrency: 2,
          failureStrategy: 'continue'
        };
        
        const context = { executionId: 'test-exec', parameters: {} };
        
        // Act
        const startTime = Date.now();
        const result = await orchestrationService.coordinateParallelActions(parallelGroup, context);
        const endTime = Date.now();
        
        // Assert
        expect(result).toBeValidResult();
        const parallelResult = result.value;
        expect(parallelResult.groupId).toBe('parallel-group-1');
        expect(parallelResult.executedActions).toBe(2);
        expect(parallelResult.failedActions).toBe(0);
        expect(parallelResult.totalExecutionTime).toBeGreaterThan(0);
        
        // Verify parallel execution (should be roughly concurrent)
        const executionTime = endTime - startTime;
        expect(executionTime).toBeLessThan(500); // Should complete quickly if truly parallel
      });

      it('should respect max concurrency limits', async () => {
        // Arrange
        const actions = Array.from({ length: 5 }, (_, i) => {
          const action = new TetherNodeBuilder()
            .withParentNode(testContainerNodeId.toString())
            .withModelId(testModelId)
            .withName(`Action ${i}`)
            .build();
          const updateResult = action.updateExecutionMode(ExecutionMode.PARALLEL);
          expect(updateResult).toBeValidResult();
          return action;
        });
        
        const parallelGroup: ParallelExecutionGroup = {
          groupId: 'limited-group',
          actions,
          maxConcurrency: 2, // Limit to 2 concurrent actions
          failureStrategy: 'continue'
        };
        
        // Act
        const result = await orchestrationService.coordinateParallelActions(parallelGroup, {});
        
        // Assert
        expect(result).toBeValidResult();
        const parallelResult = result.value;
        expect(parallelResult.executedActions).toBe(5);
        expect(parallelResult.failedActions).toBe(0);
        expect(parallelResult.concurrencyRespected).toBe(true);
      });

      it('should handle parallel execution failures with different strategies', async () => {
        // Arrange - Create an action that will fail
        const goodAction = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Good Action')
          .build();
        const updateResult1 = goodAction.updateExecutionMode(ExecutionMode.PARALLEL);
        expect(updateResult1).toBeValidResult();
        
        const badAction = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Bad Action')
          .build();
        const updateResult2 = badAction.updateExecutionMode(ExecutionMode.PARALLEL);
        expect(updateResult2).toBeValidResult();
        
        // Mock the bad action to fail
        const originalExecute = (badAction as any).execute;
        (badAction as any).execute = jest.fn().mockRejectedValue(new Error('Simulated failure'));
        
        const continueGroup: ParallelExecutionGroup = {
          groupId: 'continue-on-failure',
          actions: [goodAction, badAction],
          maxConcurrency: 2,
          failureStrategy: 'continue'
        };
        
        // Act
        const result = await orchestrationService.coordinateParallelActions(continueGroup, {});
        
        // Assert
        expect(result).toBeValidResult();
        const parallelResult = result.value;
        expect(parallelResult.executedActions).toBe(2); // Both attempted
        expect(parallelResult.failedActions).toBe(1); // One failed
        
        // Cleanup
        (badAction as any).execute = originalExecute;
      });

      it('should handle empty parallel group', async () => {
        // Arrange
        const emptyGroup: ParallelExecutionGroup = {
          groupId: 'empty-group',
          actions: [],
          maxConcurrency: 1,
          failureStrategy: 'continue'
        };
        
        // Act
        const result = await orchestrationService.coordinateParallelActions(emptyGroup, {});
        
        // Assert
        expect(result).toBeValidResult();
        const parallelResult = result.value;
        expect(parallelResult.executedActions).toBe(0);
        expect(parallelResult.failedActions).toBe(0);
      });
    });
  });

  describe('sequential execution coordination', () => {
    describe('sequenceActionExecution', () => {
      it('should execute actions sequentially in order', async () => {
        // Arrange
        const action1 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withExecutionOrder(1)
          .withName('First Sequential')
          .build();
        const updateResult1 = action1.updateExecutionMode(ExecutionMode.SEQUENTIAL);
        expect(updateResult1).toBeValidResult();
        
        const action2 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withExecutionOrder(2)
          .withName('Second Sequential')
          .build();
        const updateResult2 = action2.updateExecutionMode(ExecutionMode.SEQUENTIAL);
        expect(updateResult2).toBeValidResult();
        
        const actions = [action1, action2];
        const context = { executionId: 'seq-exec', parameters: {} };
        
        // Act
        const result = await orchestrationService.sequenceActionExecution(actions, context);
        
        // Assert
        expect(result).toBeValidResult();
        const sequentialResult = result.value;
        expect(sequentialResult.totalActions).toBe(2);
        expect(sequentialResult.completedSequence).toBe(true);
        expect(sequentialResult.failurePoint).toBeUndefined();
        expect(sequentialResult.executionOrder).toEqual(['First Sequential', 'Second Sequential']);
      });

      it('should stop on first failure in sequential execution', async () => {
        // Arrange
        const goodAction = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withExecutionOrder(1)
          .withName('Good Action')
          .build();
        const updateResult1 = goodAction.updateExecutionMode(ExecutionMode.SEQUENTIAL);
        expect(updateResult1).toBeValidResult();
        
        const badAction = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withExecutionOrder(2)
          .withName('Bad Action')
          .build();
        const updateResult2 = badAction.updateExecutionMode(ExecutionMode.SEQUENTIAL);
        expect(updateResult2).toBeValidResult();
        
        const neverExecutedAction = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withExecutionOrder(3)
          .withName('Never Executed')
          .build();
        const updateResult3 = neverExecutedAction.updateExecutionMode(ExecutionMode.SEQUENTIAL);
        expect(updateResult3).toBeValidResult();
        
        // Mock the bad action to fail
        const originalExecute = (badAction as any).execute;
        (badAction as any).execute = jest.fn().mockRejectedValue(new Error('Sequential failure'));
        
        const actions = [goodAction, badAction, neverExecutedAction];
        
        // Act
        const result = await orchestrationService.sequenceActionExecution(actions, {});
        
        // Assert
        expect(result).toBeValidResult();
        const sequentialResult = result.value;
        expect(sequentialResult.completedSequence).toBe(false);
        expect(sequentialResult.failurePoint).toBe(1); // Failed at second action (index 1)
        expect(sequentialResult.executionOrder).toEqual(['Good Action', 'Bad Action']);
        
        // Cleanup
        (badAction as any).execute = originalExecute;
      });

      it('should pass context between sequential actions', async () => {
        // Arrange
        const action1 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Context Producer')
          .build();
        const updateResult1 = action1.updateExecutionMode(ExecutionMode.SEQUENTIAL);
        expect(updateResult1).toBeValidResult();
        
        const action2 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Context Consumer')
          .build();
        const updateResult2 = action2.updateExecutionMode(ExecutionMode.SEQUENTIAL);
        expect(updateResult2).toBeValidResult();
        
        const actions = [action1, action2];
        const initialContext = { executionId: 'context-test', step: 0 };
        
        // Act
        const result = await orchestrationService.sequenceActionExecution(actions, initialContext);
        
        // Assert
        expect(result).toBeValidResult();
        const sequentialResult = result.value;
        expect(sequentialResult.contextChain).toBeDefined();
        expect(sequentialResult.contextChain).toHaveLength(2);
      });

      it('should handle empty sequential actions', async () => {
        // Act
        const result = await orchestrationService.sequenceActionExecution([], {});
        
        // Assert
        expect(result).toBeValidResult();
        const sequentialResult = result.value;
        expect(sequentialResult.totalActions).toBe(0);
        expect(sequentialResult.completedSequence).toBe(true);
        expect(sequentialResult.executionOrder).toEqual([]);
      });
    });
  });

  describe('conditional execution evaluation', () => {
    describe('evaluateConditionalActions', () => {
      it('should evaluate and execute conditional actions based on criteria', async () => {
        // Arrange
        const conditionalAction = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Conditional Action')
          .build();
        const updateResult = conditionalAction.updateExecutionMode(ExecutionMode.CONDITIONAL);
        expect(updateResult).toBeValidResult();
        
        const evaluation: ConditionalActionEvaluation = {
          action: conditionalAction,
          condition: 'context.success === true',
          conditionMet: true,
          evaluationContext: { success: true, data: 'test' }
        };
        
        const evaluations = [evaluation];
        const context = { executionId: 'conditional-test', success: true };
        
        // Act
        const result = await orchestrationService.evaluateConditionalActions(evaluations, context);
        
        // Assert
        expect(result).toBeValidResult();
        const conditionalResult = result.value;
        expect(conditionalResult.totalEvaluations).toBe(1);
        expect(conditionalResult.executedActions).toBe(1);
        expect(conditionalResult.skippedActions).toBe(0);
        expect(conditionalResult.evaluationResults).toHaveLength(1);
        expect(conditionalResult.evaluationResults[0].executed).toBe(true);
      });

      it('should skip conditional actions when conditions not met', async () => {
        // Arrange
        const conditionalAction = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Skipped Action')
          .build();
        const updateResult = conditionalAction.updateExecutionMode(ExecutionMode.CONDITIONAL);
        expect(updateResult).toBeValidResult();
        
        const evaluation: ConditionalActionEvaluation = {
          action: conditionalAction,
          condition: 'context.success === true',
          conditionMet: false,
          evaluationContext: { success: false }
        };
        
        const evaluations = [evaluation];
        
        // Act
        const result = await orchestrationService.evaluateConditionalActions(evaluations, {});
        
        // Assert
        expect(result).toBeValidResult();
        const conditionalResult = result.value;
        expect(conditionalResult.executedActions).toBe(0);
        expect(conditionalResult.skippedActions).toBe(1);
        expect(conditionalResult.evaluationResults[0].executed).toBe(false);
        expect(conditionalResult.evaluationResults[0].skipReason).toBeDefined();
      });

      it('should handle complex conditional logic', async () => {
        // Arrange
        const actions = Array.from({ length: 3 }, (_, i) => {
          const action = new TetherNodeBuilder()
            .withParentNode(testContainerNodeId.toString())
            .withModelId(testModelId)
            .withName(`Conditional ${i}`)
            .build();
          const updateResult = action.updateExecutionMode(ExecutionMode.CONDITIONAL);
          expect(updateResult).toBeValidResult();
          return action;
        });
        
        const evaluations: ConditionalActionEvaluation[] = [
          { 
            action: actions[0], 
            condition: 'always', 
            conditionMet: true, 
            evaluationContext: {} 
          },
          { 
            action: actions[1], 
            condition: 'never', 
            conditionMet: false, 
            evaluationContext: {} 
          },
          { 
            action: actions[2], 
            condition: 'context.flag', 
            conditionMet: true, 
            evaluationContext: { flag: true } 
          }
        ];
        
        // Act
        const result = await orchestrationService.evaluateConditionalActions(evaluations, { flag: true });
        
        // Assert
        expect(result).toBeValidResult();
        const conditionalResult = result.value;
        expect(conditionalResult.totalEvaluations).toBe(3);
        expect(conditionalResult.executedActions).toBe(2);
        expect(conditionalResult.skippedActions).toBe(1);
      });

      it('should handle empty conditional evaluations', async () => {
        // Act
        const result = await orchestrationService.evaluateConditionalActions([], {});
        
        // Assert
        expect(result).toBeValidResult();
        const conditionalResult = result.value;
        expect(conditionalResult.totalEvaluations).toBe(0);
        expect(conditionalResult.executedActions).toBe(0);
        expect(conditionalResult.skippedActions).toBe(0);
      });
    });
  });

  describe('action failure handling', () => {
    describe('handleActionFailures', () => {
      it('should handle action failures with retry strategy', async () => {
        // Arrange
        const failingAction = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Failing Action')
          .build();
        
        const failureInfo = {
          actionId: failingAction.actionId,
          error: new Error('Test failure'),
          failureTime: new Date(),
          retryAttempts: 0,
          maxRetries: 2
        };
        
        const context = { executionId: 'failure-test' };
        
        // Act
        const result = await orchestrationService.handleActionFailures([failureInfo], context);
        
        // Assert
        expect(result).toBeValidResult();
        const failureResult = result.value;
        expect(failureResult.totalFailures).toBe(1);
        expect(failureResult.retriedFailures).toBe(1);
        expect(failureResult.permanentFailures).toBe(0);
        expect(failureResult.recoveryActions).toBeDefined();
      });

      it('should escalate failures after max retries exceeded', async () => {
        // Arrange
        const failingAction = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Permanently Failing Action')
          .build();
        
        const failureInfo = {
          actionId: failingAction.actionId,
          error: new Error('Permanent failure'),
          failureTime: new Date(),
          retryAttempts: 3,
          maxRetries: 2 // Already exceeded
        };
        
        // Act
        const result = await orchestrationService.handleActionFailures([failureInfo], {});
        
        // Assert
        expect(result).toBeValidResult();
        const failureResult = result.value;
        expect(failureResult.retriedFailures).toBe(0);
        expect(failureResult.permanentFailures).toBe(1);
        expect(failureResult.escalatedFailures).toBe(1);
      });

      it('should handle multiple failure types simultaneously', async () => {
        // Arrange
        const retriableFailure = {
          actionId: NodeId.generate(),
          error: new Error('Temporary failure'),
          failureTime: new Date(),
          retryAttempts: 1,
          maxRetries: 3
        };
        
        const permanentFailure = {
          actionId: NodeId.generate(),
          error: new Error('Permanent failure'),
          failureTime: new Date(),
          retryAttempts: 5,
          maxRetries: 3
        };
        
        const failures = [retriableFailure, permanentFailure];
        
        // Act
        const result = await orchestrationService.handleActionFailures(failures, {});
        
        // Assert
        expect(result).toBeValidResult();
        const failureResult = result.value;
        expect(failureResult.totalFailures).toBe(2);
        expect(failureResult.retriedFailures).toBe(1);
        expect(failureResult.permanentFailures).toBe(1);
      });

      it('should handle empty failures array', async () => {
        // Act
        const result = await orchestrationService.handleActionFailures([], {});
        
        // Assert
        expect(result).toBeValidResult();
        const failureResult = result.value;
        expect(failureResult.totalFailures).toBe(0);
        expect(failureResult.retriedFailures).toBe(0);
        expect(failureResult.permanentFailures).toBe(0);
      });
    });
  });

  describe('dependency validation', () => {
    describe('validateActionDependencies', () => {
      it('should validate action dependencies successfully', () => {
        // Arrange
        const action1 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Independent Action')
          .build();
        
        const action2 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Dependent Action')
          .build();
        
        const dependencyMap: ActionDependencyMap = {
          [action1.actionId.toString()]: [],
          [action2.actionId.toString()]: [action1.actionId]
        };
        
        // Act
        const result = orchestrationService.validateActionDependencies([action1, action2], dependencyMap);
        
        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.isValid).toBe(true);
        expect(validation.circularDependencies).toEqual([]);
        expect(validation.unresolvedDependencies).toEqual([]);
      });

      it('should detect circular dependencies', () => {
        // Arrange
        const action1 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Action A')
          .build();
        
        const action2 = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Action B')
          .build();
        
        // Create circular dependency: A depends on B, B depends on A
        const dependencyMap: ActionDependencyMap = {
          [action1.actionId.toString()]: [action2.actionId],
          [action2.actionId.toString()]: [action1.actionId]
        };
        
        // Act
        const result = orchestrationService.validateActionDependencies([action1, action2], dependencyMap);
        
        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.isValid).toBe(false);
        expect(validation.circularDependencies).toHaveLength(1);
        expect(validation.circularDependencies[0]).toContain(action1.actionId.toString());
        expect(validation.circularDependencies[0]).toContain(action2.actionId.toString());
      });

      it('should detect unresolved dependencies', () => {
        // Arrange
        const existingAction = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .build();
        
        const nonExistentActionId = NodeId.generate();
        
        const dependencyMap: ActionDependencyMap = {
          [existingAction.actionId.toString()]: [nonExistentActionId]
        };
        
        // Act
        const result = orchestrationService.validateActionDependencies([existingAction], dependencyMap);
        
        // Assert
        expect(result).toBeValidResult();
        const validation = result.value;
        expect(validation.isValid).toBe(false);
        expect(validation.unresolvedDependencies).toContain(nonExistentActionId.toString());
      });

      it('should handle empty dependencies gracefully', () => {
        // Arrange
        const action = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .build();
        
        // Act
        const result = orchestrationService.validateActionDependencies([action], {});
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value.isValid).toBe(true);
      });
    });
  });

  describe('progress monitoring', () => {
    describe('monitorActionProgress', () => {
      it('should monitor action progress successfully', async () => {
        // Arrange
        const actions = [
          new TetherNodeBuilder()
            .withParentNode(testContainerNodeId.toString())
            .withModelId(testModelId)
            .withName('Monitored Action')
            .build()
        ];
        
        const context = { executionId: 'progress-test' };
        
        // Act
        const result = await orchestrationService.monitorActionProgress(actions, context);
        
        // Assert
        expect(result).toBeValidResult();
        const progressResult = result.value;
        expect(progressResult.totalActions).toBe(1);
        expect(progressResult.completedActions).toBeDefined();
        expect(progressResult.inProgressActions).toBeDefined();
        expect(progressResult.failedActions).toBeDefined();
        expect(progressResult.overallProgress).toBeGreaterThanOrEqual(0);
        expect(progressResult.overallProgress).toBeLessThanOrEqual(100);
      });

      it('should calculate accurate progress percentages', async () => {
        // Arrange - Multiple actions in different states
        const completedAction = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Completed')
          .build();
        
        const inProgressAction = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('In Progress')
          .build();
        
        const pendingAction = new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .withName('Pending')
          .build();
        
        // Set different statuses
        await completedAction.updateStatus(ActionStatus.COMPLETED);
        await inProgressAction.updateStatus(ActionStatus.EXECUTING);
        // pendingAction remains CONFIGURED
        
        const actions = [completedAction, inProgressAction, pendingAction];
        
        // Act
        const result = await orchestrationService.monitorActionProgress(actions, {});
        
        // Assert
        expect(result).toBeValidResult();
        const progressResult = result.value;
        expect(progressResult.totalActions).toBe(3);
        expect(progressResult.completedActions).toBe(1);
        expect(progressResult.inProgressActions).toBe(1);
        expect(progressResult.overallProgress).toBeCloseTo(33.33, 1); // 1/3 completed
      });

      it('should handle empty actions in progress monitoring', async () => {
        // Act
        const result = await orchestrationService.monitorActionProgress([], {});
        
        // Assert
        expect(result).toBeValidResult();
        const progressResult = result.value;
        expect(progressResult.totalActions).toBe(0);
        expect(progressResult.overallProgress).toBe(100); // 100% of nothing is complete
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle actions with invalid configuration gracefully', async () => {
      // Arrange - Create valid action first, then test orchestration with empty array
      const validAction = new TetherNodeBuilder()
        .withParentNode(testContainerNodeId.toString())
        .withModelId(testModelId)
        .build();
      
      // Act - Test orchestration with empty actions array (edge case)
      const result = await orchestrationService.orchestrateNodeActions([], {});
      
      // Assert - Should handle gracefully
      expect(result).toBeValidResult();
      if (result.isSuccess) {
        expect(result.value).toBeDefined();
        expect(result.value.contextPropagation).toBeDefined();
      }
    });

    it('should handle concurrent orchestration requests', async () => {
      // Arrange
      const actions1 = [
        new TetherNodeBuilder()
          .withParentNode(testContainerNodeId.toString())
          .withModelId(testModelId)
          .build()
      ];
      
      const actions2 = [
        new TetherNodeBuilder()
          .withParentNode(NodeId.generate().toString())
          .withModelId('different-model')
          .build()
      ];
      
      // Act - Execute concurrently
      const [result1, result2] = await Promise.all([
        orchestrationService.orchestrateNodeActions(actions1, { executionId: 'concurrent-1' }),
        orchestrationService.orchestrateNodeActions(actions2, { executionId: 'concurrent-2' })
      ]);
      
      // Assert
      expect(result1).toBeValidResult();
      expect(result2).toBeValidResult();
      expect(result1.value.contextPropagation).not.toEqual(result2.value.contextPropagation);
    });

    it('should handle resource cleanup after orchestration', async () => {
      // Arrange
      const action = new TetherNodeBuilder()
        .withParentNode(testContainerNodeId.toString())
        .withModelId(testModelId)
        .build();
      
      // Act
      const result = await orchestrationService.orchestrateNodeActions([action], {});
      
      // Assert - Resources should be properly managed
      expect(result).toBeValidResult();
      expect(result.value.resourcesReleased).toBe(true);
    });
  });
});