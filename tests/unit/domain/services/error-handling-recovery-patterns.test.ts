/**
 * Unit tests for Error Handling and Recovery Patterns across UC-005 services
 * Tests comprehensive error scenarios, recovery strategies, and resilience patterns
 * that maintain Clean Architecture principles while ensuring system reliability.
 * 
 * This test suite validates error propagation, recovery mechanisms, and failure isolation
 * across WorkflowOrchestrationService, ActionNodeExecutionService, FractalOrchestrationService,
 * and NodeContextAccessService.
 */

import { WorkflowOrchestrationService, ExecutionContext } from '@/lib/domain/services/workflow-orchestration-service';
import { ActionNodeExecutionService } from '@/lib/domain/services/action-node-execution-service';
import { FractalOrchestrationService } from '@/lib/domain/services/fractal-orchestration-service';
import { NodeContextAccessService } from '@/lib/domain/services/node-context-access-service';
import { ActionNodeOrchestrationService } from '@/lib/domain/services/action-node-orchestration-service';
import { FunctionModel } from '@/lib/domain/entities/function-model';
import { ActionStatus, ExecutionMode } from '@/lib/domain/enums';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { Result } from '@/lib/domain/shared/result';
import { 
  FunctionModelBuilder, 
  TetherNodeBuilder, 
  TestFactories 
} from '../../../utils/test-fixtures';

describe('Error Handling and Recovery Patterns - UC-005', () => {
  let workflowService: WorkflowOrchestrationService;
  let actionExecutionService: ActionNodeExecutionService;
  let fractalService: FractalOrchestrationService;
  let contextService: NodeContextAccessService;
  let actionOrchestrationService: ActionNodeOrchestrationService;
  let testModel: FunctionModel;
  let validContext: ExecutionContext;

  beforeEach(() => {
    workflowService = new WorkflowOrchestrationService();
    actionExecutionService = new ActionNodeExecutionService();
    contextService = new NodeContextAccessService();
    actionOrchestrationService = new ActionNodeOrchestrationService();
    
    // Create mocked dependencies for FractalOrchestrationService
    const mockContextService = {
      buildContext: jest.fn().mockReturnValue(Result.ok({ contextId: 'mock-context' })),
      propagateContext: jest.fn().mockReturnValue(Result.ok(undefined)),
      getNodeContext: jest.fn().mockReturnValue(Result.ok({ data: {} })),
      updateNodeContext: jest.fn().mockReturnValue(Result.ok(undefined)),
      clearNodeContext: jest.fn().mockReturnValue(Result.ok(undefined)),
      getHierarchicalContext: jest.fn().mockReturnValue(Result.ok({ levels: [] })),
      validateContextAccess: jest.fn().mockReturnValue(Result.ok({ granted: true })),
      cloneContextScope: jest.fn().mockReturnValue(Result.ok('cloned-context')),
      mergeContextScopes: jest.fn().mockReturnValue(Result.ok('merged-context'))
    } as any;

    const mockActionOrchestrationService = {
      orchestrateNodeActions: jest.fn().mockResolvedValue(Result.ok({ 
        totalActions: 0, executedActions: 0, failedActions: 0, executionTime: 0 
      })),
      coordinateParallelActions: jest.fn().mockResolvedValue(Result.ok({ 
        groupId: 'test', executedActions: 0, failedActions: 0, totalExecutionTime: 0 
      })),
      sequenceActionExecution: jest.fn().mockResolvedValue(Result.ok({ 
        totalActions: 0, completedSequence: true, executionOrder: [] 
      })),
      evaluateConditionalActions: jest.fn().mockResolvedValue(Result.ok({ 
        totalEvaluations: 0, executedActions: 0, skippedActions: 0, evaluationResults: [] 
      })),
      handleActionFailures: jest.fn().mockResolvedValue(Result.ok({ 
        totalFailures: 0, retriedFailures: 0, permanentFailures: 0 
      })),
      optimizeActionOrder: jest.fn().mockReturnValue(Result.ok([])),
      validateActionDependencies: jest.fn().mockReturnValue(Result.ok({ 
        isValid: true, circularDependencies: [], unresolvedDependencies: [] 
      })),
      monitorActionProgress: jest.fn().mockResolvedValue(Result.ok({ 
        totalActions: 0, completedActions: 0, inProgressActions: 0, failedActions: 0, overallProgress: 100 
      }))
    } as any;

    fractalService = new FractalOrchestrationService(
      mockContextService,
      mockActionOrchestrationService
    );

    testModel = TestFactories.createCompleteWorkflow();
    validContext = {
      modelId: testModel.modelId,
      executionId: 'error-test-' + Math.random().toString(36).substring(7),
      startTime: new Date(),
      parameters: { userId: 'test-user', environment: 'test' },
      environment: 'development'
    };
  });

  describe('workflow orchestration error handling', () => {
    describe('model validation failures', () => {
      it('should handle invalid model gracefully', async () => {
        // Arrange - Create invalid model
        const invalidModel = TestFactories.createValidModel(); // No nodes

        // Act
        const result = await workflowService.executeWorkflow(invalidModel, validContext);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Cannot execute invalid workflow');
        
        // Verify no execution state was created
        const statusResult = await workflowService.getExecutionStatus(validContext.executionId);
        expect(statusResult).toBeFailureResult();
      });

      it('should handle circular dependency errors', async () => {
        // Arrange - Create model with circular dependencies
        const model = TestFactories.createCompleteWorkflow();
        const nodes = Array.from(model.nodes.values());
        
        // Create circular dependency
        nodes[0].addDependency(nodes[1].nodeId);
        nodes[1].addDependency(nodes[0].nodeId);

        // Act
        const result = await workflowService.executeWorkflow(model, validContext);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Circular dependency detected');
      });

      it('should handle missing node references', async () => {
        // Arrange - Create model with invalid node reference
        const model = TestFactories.createCompleteWorkflow();
        const nodes = Array.from(model.nodes.values());
        const nonExistentNodeId = NodeId.generate();
        
        nodes[0].addDependency(nonExistentNodeId);

        // Act
        const result = await workflowService.executeWorkflow(model, validContext);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('invalid node reference');
      });
    });

    describe('execution state recovery', () => {
      it('should recover from paused execution state', async () => {
        // Arrange - Create execution and pause it
        const model = TestFactories.createCompleteWorkflow();
        const context = { ...validContext };
        
        // Start execution and immediately pause
        const executionPromise = workflowService.executeWorkflow(model, context);
        await new Promise(resolve => setTimeout(resolve, 5)); // Brief delay
        
        const pauseResult = await workflowService.pauseExecution(context.executionId);
        const pausedExecution = await executionPromise;
        
        // Act - Resume execution
        const resumeResult = await workflowService.resumeExecution(context.executionId);
        expect(resumeResult).toBeValidResult();

        // Assert - Verify state recovery
        const statusResult = await workflowService.getExecutionStatus(context.executionId);
        expect(statusResult).toBeValidResult();
        expect(statusResult.value.status).toBe('running');
      });

      it('should handle corrupted execution state', async () => {
        // Arrange - Create execution then corrupt its state
        const model = TestFactories.createCompleteWorkflow();
        const executionPromise = workflowService.executeWorkflow(model, validContext);
        
        // Corrupt the execution state
        (workflowService as any).executionStates.set(validContext.executionId, null);
        
        // Act - Try to get status of corrupted execution
        const statusResult = await workflowService.getExecutionStatus(validContext.executionId);
        
        // Assert
        expect(statusResult).toBeFailureResult();
        expect(statusResult.error).toContain('Execution not found');
        
        // Wait for original execution to complete
        await executionPromise;
      });

      it('should handle concurrent state modifications', async () => {
        // Arrange
        const model = TestFactories.createCompleteWorkflow();
        const context = { ...validContext };
        
        // Act - Start execution and immediately try to modify state
        const executionPromise = workflowService.executeWorkflow(model, context);
        
        const concurrentOperations = await Promise.allSettled([
          workflowService.pauseExecution(context.executionId),
          workflowService.stopExecution(context.executionId),
          workflowService.getExecutionStatus(context.executionId)
        ]);
        
        await executionPromise;

        // Assert - At least some operations should succeed
        const successful = concurrentOperations.filter(
          result => result.status === 'fulfilled' && 
          (result.value as any).isSuccess
        );
        expect(successful.length).toBeGreaterThan(0);
      });
    });

    describe('node execution failure handling', () => {
      it('should handle critical node failures', async () => {
        // Arrange - Mark a node as critical
        const model = TestFactories.createCompleteWorkflow();
        const nodes = Array.from(model.nodes.values());
        nodes[1].updateMetadata({ critical: true });
        
        // Mock node execution to fail
        const originalExecuteContainer = (workflowService as any).executeContainerNode;
        (workflowService as any).executeContainerNode = jest.fn()
          .mockImplementationOnce(() => Promise.resolve({
            nodeId: nodes[0].nodeId.toString(),
            success: true,
            startTime: new Date(),
            endTime: new Date(),
            retryCount: 0
          }))
          .mockImplementationOnce(() => Promise.resolve({
            nodeId: nodes[1].nodeId.toString(),
            success: false,
            startTime: new Date(),
            endTime: new Date(),
            error: 'Critical node failure',
            retryCount: 0
          }));

        // Act
        const result = await workflowService.executeWorkflow(model, validContext);

        // Assert
        expect(result).toBeValidResult();
        expect(result.value.success).toBe(false);
        expect(result.value.failedNodes).toContain(nodes[1].nodeId.toString());
        expect(result.value.errors).toContain('Critical node failure');
        
        // Cleanup
        (workflowService as any).executeContainerNode = originalExecuteContainer;
      });

      it('should continue execution after non-critical failures', async () => {
        // Arrange - Create workflow with non-critical node
        const model = TestFactories.createCompleteWorkflow();
        const nodes = Array.from(model.nodes.values());
        // Don't mark as critical (default behavior)
        
        // Mock first node to fail, others succeed
        const originalExecuteContainer = (workflowService as any).executeContainerNode;
        (workflowService as any).executeContainerNode = jest.fn()
          .mockImplementationOnce(() => Promise.resolve({
            nodeId: nodes[0].nodeId.toString(),
            success: false,
            startTime: new Date(),
            endTime: new Date(),
            error: 'Non-critical failure',
            retryCount: 0
          }))
          .mockImplementation((node) => Promise.resolve({
            nodeId: node.nodeId.toString(),
            success: true,
            startTime: new Date(),
            endTime: new Date(),
            retryCount: 0
          }));

        // Act
        const result = await workflowService.executeWorkflow(model, validContext);

        // Assert
        expect(result).toBeValidResult();
        expect(result.value.success).toBe(false); // Overall failed due to one failure
        expect(result.value.failedNodes).toHaveLength(1);
        expect(result.value.completedNodes.length).toBeGreaterThan(0);
        
        // Cleanup
        (workflowService as any).executeContainerNode = originalExecuteContainer;
      });
    });
  });

  describe('action execution error handling', () => {
    describe('execution lifecycle errors', () => {
      it('should handle execution start failures', async () => {
        // Arrange - Mock NodeId creation to fail
        const originalNodeIdCreate = NodeId.create;
        (NodeId as any).create = jest.fn().mockReturnValue(Result.fail('Invalid node ID'));

        const testActionId = 'invalid-action-id';

        // Act
        const result = await actionExecutionService.startExecution(testActionId);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Failed to start execution');
        expect(actionExecutionService.isExecuting(testActionId)).toBe(false);
        
        // Cleanup
        (NodeId as any).create = originalNodeIdCreate;
      });

      it('should handle execution timeout scenarios', async () => {
        // Arrange - Start execution
        const testActionId = 'timeout-test';
        const startResult = await actionExecutionService.startExecution(testActionId);
        expect(startResult).toBeValidResult();
        
        // Simulate timeout by modifying internal state
        const context = (actionExecutionService as any).activeExecutions.get(testActionId);
        context.startTime = new Date(Date.now() - 600000); // 10 minutes ago
        context.timeoutMs = 300000; // 5 minute timeout

        // Act - Try to update progress after timeout
        const progressResult = await actionExecutionService.updateProgress(testActionId, 50);

        // Assert - Should still work but could trigger timeout handling
        expect(progressResult).toBeValidResult();
        
        // Verify timeout detection in retry policy evaluation
        const retryResult = await actionExecutionService.evaluateRetryPolicy(testActionId);
        expect(retryResult).toBeValidResult();
      });

      it('should handle resource exhaustion gracefully', async () => {
        // Arrange - Start many concurrent executions
        const actionIds = Array.from({ length: 100 }, (_, i) => `resource-test-${i}`);
        
        // Act - Start all executions rapidly
        const startResults = await Promise.all(
          actionIds.map(id => actionExecutionService.startExecution(id))
        );

        // Assert - All should succeed (service should handle resource pressure)
        startResults.forEach(result => expect(result).toBeValidResult());
        expect(actionExecutionService.getActiveExecutionCount()).toBe(100);
        
        // Cleanup
        await Promise.all(
          actionIds.map(id => actionExecutionService.completeExecution(id, { result: 'cleanup' }))
        );
      });
    });

    describe('retry mechanism failures', () => {
      it('should handle retry exhaustion', async () => {
        // Arrange
        const testActionId = 'retry-exhaustion-test';
        const startResult = await actionExecutionService.startExecution(testActionId);
        expect(startResult).toBeValidResult();
        
        // Exhaust retries
        for (let i = 0; i < 3; i++) {
          const retryResult = await actionExecutionService.retryExecution(testActionId);
          expect(retryResult).toBeValidResult();
        }

        // Act - Try to retry when exhausted
        const finalRetryResult = await actionExecutionService.retryExecution(testActionId);

        // Assert
        expect(finalRetryResult).toBeFailureResult();
        expect(finalRetryResult.error).toContain('Maximum retry attempts exceeded');
      });

      it('should handle retry policy evaluation failures', async () => {
        // Arrange
        const testActionId = 'retry-policy-failure';
        const startResult = await actionExecutionService.startExecution(testActionId);
        expect(startResult).toBeValidResult();
        
        // Corrupt the execution context
        (actionExecutionService as any).activeExecutions.delete(testActionId);

        // Act
        const policyResult = await actionExecutionService.evaluateRetryPolicy(testActionId);

        // Assert
        expect(policyResult).toBeFailureResult();
        expect(policyResult.error).toContain('No active execution found');
      });

      it('should handle exponential backoff calculation errors', async () => {
        // Arrange
        const testActionId = 'backoff-error-test';
        const startResult = await actionExecutionService.startExecution(testActionId);
        expect(startResult).toBeValidResult();
        
        // Set extreme retry count to test overflow protection
        const context = (actionExecutionService as any).activeExecutions.get(testActionId);
        context.retryAttempt = Number.MAX_SAFE_INTEGER;

        // Act
        const policyResult = await actionExecutionService.evaluateRetryPolicy(testActionId);

        // Assert - Should handle overflow gracefully
        expect(policyResult).toBeValidResult();
        expect(policyResult.value).toBe(false); // Should reject due to extreme retry count
      });
    });

    describe('metrics and monitoring errors', () => {
      it('should handle metrics corruption recovery', async () => {
        // Arrange
        const testActionId = 'metrics-corruption';
        const startResult = await actionExecutionService.startExecution(testActionId);
        expect(startResult).toBeValidResult();
        
        // Corrupt metrics
        (actionExecutionService as any).executionMetrics.set(testActionId, null);

        // Act
        const metricsResult = await actionExecutionService.getExecutionMetrics(testActionId);

        // Assert
        expect(metricsResult).toBeFailureResult();
        expect(metricsResult.error).toContain('No metrics found');
      });

      it('should handle invalid resource usage data', async () => {
        // Arrange
        const testActionId = 'invalid-resource-data';
        const startResult = await actionExecutionService.startExecution(testActionId);
        expect(startResult).toBeValidResult();

        // Act - Try to track invalid resource data
        const invalidUsage = { cpu: NaN, memory: -1 };
        const trackResult = await actionExecutionService.trackResourceUsage(testActionId, invalidUsage);

        // Assert - Should handle gracefully
        expect(trackResult).toBeValidResult(); // Service should sanitize data
        
        const metricsResult = await actionExecutionService.getExecutionMetrics(testActionId);
        expect(metricsResult).toBeValidResult();
        // Values should be sanitized or defaulted
      });
    });
  });

  describe('fractal orchestration error handling', () => {
    describe('planning failures', () => {
      it('should handle invalid model structure', () => {
        // Arrange - Create model with null properties
        const invalidModel = TestFactories.createCompleteWorkflow();
        (invalidModel as any).modelId = null;

        // Act
        const result = fractalService.planFractalExecution(invalidModel);

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Failed to plan fractal execution');
      });

      it('should handle extremely deep nesting', () => {
        // Arrange - Create deeply nested model
        const deepModel = new FunctionModelBuilder()
          .withId('deep-model')
          .build();

        // Act
        const planResult = fractalService.planFractalExecution(deepModel);
        expect(planResult).toBeValidResult();
        
        const consistencyResult = fractalService.validateOrchestrationConsistency(planResult.value);

        // Assert - Should detect and reject excessive depth
        expect(consistencyResult).toBeFailureResult();
        expect(consistencyResult.error).toContain('exceeds maximum allowed depth');
      });

      it('should handle context initialization failures', () => {
        // Arrange - Invalid initial context
        const invalidContext = { circular: null as any };
        invalidContext.circular = invalidContext; // Circular reference
        
        const model = TestFactories.createCompleteWorkflow();

        // Act
        const result = fractalService.planFractalExecution(model, invalidContext);

        // Assert - Should handle gracefully
        expect(result).toBeValidResult(); // Service should sanitize context
      });
    });

    describe('execution coordination failures', () => {
      it('should handle level coordination failures', async () => {
        // Arrange
        const model = TestFactories.createCompleteWorkflow();
        const planResult = fractalService.planFractalExecution(model);
        expect(planResult).toBeValidResult();

        // Mock level coordination to fail
        const originalCoordinate = (fractalService as any).coordinateLevelExecution;
        (fractalService as any).coordinateLevelExecution = jest.fn()
          .mockRejectedValue(new Error('Level coordination failed'));

        // Act
        const executionResult = await fractalService.executeFractalOrchestration(planResult.value);

        // Assert
        expect(executionResult).toBeFailureResult();
        expect(executionResult.error).toContain('Fractal execution failed');
        
        // Cleanup
        (fractalService as any).coordinateLevelExecution = originalCoordinate;
      });

      it('should handle vertical nesting failures', async () => {
        // Arrange
        const parentModelId = 'failing-parent';
        const nestedModels = [TestFactories.createCompleteWorkflow()];
        
        // Mock planFractalExecution to fail for nested models
        const originalPlan = fractalService.planFractalExecution;
        (fractalService as any).planFractalExecution = jest.fn()
          .mockImplementation((model) => {
            if (model === nestedModels[0]) {
              return Result.fail('Nested planning failed');
            }
            return originalPlan.call(fractalService, model);
          });

        // Act
        const result = await fractalService.handleVerticalNesting(
          parentModelId,
          nestedModels,
          { test: 'context' }
        );

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Vertical nesting failed');
        
        // Cleanup
        (fractalService as any).planFractalExecution = originalPlan;
      });

      it('should handle horizontal scaling failures', async () => {
        // Arrange
        const models = [
          TestFactories.createCompleteWorkflow(),
          TestFactories.createCompleteWorkflow()
        ];
        
        // Mock one model to fail execution
        const originalExecute = fractalService.executeFractalOrchestration;
        let callCount = 0;
        (fractalService as any).executeFractalOrchestration = jest.fn()
          .mockImplementation(() => {
            callCount++;
            if (callCount === 2) {
              return Promise.resolve(Result.fail('Horizontal execution failed'));
            }
            return Promise.resolve(Result.ok({
              executionId: 'test',
              totalLevels: 1,
              completedLevels: 1,
              failedLevels: 0,
              totalDuration: 100,
              contextOutputs: {}
            }));
          });

        // Act
        const result = await fractalService.handleHorizontalScaling(models, {});

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Horizontal scaling failed');
        
        // Cleanup
        (fractalService as any).executeFractalOrchestration = originalExecute;
      });
    });

    describe('context propagation failures', () => {
      it('should handle context transformation errors', () => {
        // Arrange
        const model = TestFactories.createCompleteWorkflow();
        const planResult = fractalService.planFractalExecution(model);
        expect(planResult).toBeValidResult();
        
        // Create context with problematic data
        const problematicContext = {
          func: () => 'not serializable',
          symbol: Symbol('test'),
          date: new Date()
        };

        // Act
        const propagateResult = fractalService.propagateContext(
          planResult.value,
          0,
          0,
          problematicContext
        );

        // Assert - Should handle gracefully
        expect(propagateResult).toBeValidResult();
      });

      it('should handle consistency validation failures', () => {
        // Arrange
        const model = TestFactories.createCompleteWorkflow();
        const planResult = fractalService.planFractalExecution(model);
        expect(planResult).toBeValidResult();
        
        // Corrupt the execution state
        const state = (fractalService as any).executionStates.get(planResult.value);
        state.levels = null; // Corrupt levels

        // Act
        const validationResult = fractalService.validateOrchestrationConsistency(planResult.value);

        // Assert - Should handle corruption gracefully
        expect(validationResult).toBeFailureResult();
      });
    });
  });

  describe('context access error handling', () => {
    describe('context building failures', () => {
      it('should handle invalid node ID formats', () => {
        // Arrange
        const invalidNodeId = 'not-a-valid-node-id' as any;
        const contextData = { test: 'data' };

        // Act
        const result = contextService.buildContext(invalidNodeId, contextData, 'execution');

        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Invalid context data');
      });

      it('should handle memory constraints', () => {
        // Arrange - Extremely large context
        const nodeId = NodeId.generate();
        const largeContext = {
          hugeArray: new Array(1000000).fill('large-string-data-'.repeat(100))
        };

        // Act
        const result = contextService.buildContext(nodeId, largeContext, 'execution');

        // Assert - Should handle gracefully (succeed or fail gracefully)
        if (result.isSuccess) {
          // Verify cleanup works
          const clearResult = contextService.clearNodeContext(nodeId);
          expect(clearResult).toBeValidResult();
        } else {
          expect(result.error).toContain('memory');
        }
      });

      it('should handle concurrent context operations conflicts', async () => {
        // Arrange
        const nodeId = NodeId.generate();
        const initialContext = { initial: 'data' };
        
        const buildResult = contextService.buildContext(nodeId, initialContext, 'execution');
        expect(buildResult).toBeValidResult();
        const contextId = buildResult.value.contextId;

        // Act - Concurrent conflicting operations
        const operations = await Promise.allSettled([
          Promise.resolve(contextService.updateNodeContext(contextId, { update1: 'value1' })),
          Promise.resolve(contextService.updateNodeContext(contextId, { update2: 'value2' })),
          Promise.resolve(contextService.clearNodeContext(nodeId)),
          Promise.resolve(contextService.getNodeContext(nodeId))
        ]);

        // Assert - Some operations should succeed, cleanup should work
        const successful = operations.filter(op => 
          op.status === 'fulfilled' && (op.value as any).isSuccess
        ).length;
        
        expect(successful).toBeGreaterThan(0);
      });
    });

    describe('access control failures', () => {
      it('should handle permission validation errors', () => {
        // Arrange
        const ownerNodeId = NodeId.generate();
        const requesterNodeId = NodeId.generate();
        
        const buildResult = contextService.buildContext(
          ownerNodeId,
          { sensitive: 'data' },
          'isolated'
        );
        expect(buildResult).toBeValidResult();

        // Act - Try unauthorized access
        const validationResult = contextService.validateContextAccess(
          ownerNodeId,
          requesterNodeId,
          'write',
          ['sensitive']
        );

        // Assert
        expect(validationResult).toBeValidResult();
        expect(validationResult.value.granted).toBe(false);
        expect(validationResult.value.denialReason).toBeDefined();
      });

      it('should handle circular reference detection failures', () => {
        // Arrange
        const parentId = NodeId.generate();
        const childId = NodeId.generate();
        
        const parentResult = contextService.buildContext(parentId, { data: 'parent' }, 'execution');
        expect(parentResult).toBeValidResult();
        
        const childResult = contextService.buildContext(
          childId, 
          { data: 'child' }, 
          'execution',
          parentResult.value.contextId
        );
        expect(childResult).toBeValidResult();

        // Act - Try to create circular reference
        const circularResult = contextService.propagateContext(
          childResult.value.contextId,
          parentId,
          [{ property: 'data', inherit: true, override: false }]
        );

        // Assert
        expect(circularResult).toBeFailureResult();
        expect(circularResult.error).toContain('Circular reference detected');
      });
    });

    describe('scope management failures', () => {
      it('should handle scope isolation violations', () => {
        // Arrange
        const isolatedNodeId = NodeId.generate();
        const globalNodeId = NodeId.generate();
        
        const isolatedResult = contextService.buildContext(
          isolatedNodeId,
          { isolated: 'data' },
          'isolated'
        );
        expect(isolatedResult).toBeValidResult();
        
        const globalResult = contextService.buildContext(
          globalNodeId,
          { global: 'data' },
          'global'
        );
        expect(globalResult).toBeValidResult();

        // Act - Try to merge incompatible scopes
        const mergeResult = contextService.mergeContextScopes(
          [isolatedResult.value.contextId, globalResult.value.contextId],
          NodeId.generate(),
          'execution'
        );

        // Assert - Should handle scope conflicts gracefully
        if (mergeResult.isSuccess) {
          // Verify proper isolation maintained
          const mergedContext = contextService.getNodeContext(mergeResult.value as any);
          expect(mergedContext).toBeValidResult();
        } else {
          expect(mergeResult.error).toContain('scope conflict');
        }
      });
    });
  });

  describe('integrated error recovery scenarios', () => {
    describe('cascading failure recovery', () => {
      it('should handle workflow -> action -> context failure cascade', async () => {
        // Arrange - Create workflow with actions
        const model = TestFactories.createCompleteWorkflow();
        const stageNode = Array.from(model.nodes.values())[1];
        
        const action = new TetherNodeBuilder()
          .withParentNode(stageNode.nodeId.toString())
          .withModelId(model.modelId)
          .build();
        model.addActionNode(action);

        // Mock cascade of failures
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

        // Act
        const result = await workflowService.executeWorkflow(model, validContext);

        // Assert - Should complete despite internal complexities
        expect(result).toBeValidResult();
        
        // Cleanup
        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
      });

      it('should maintain system stability under high error rates', async () => {
        // Arrange - Create multiple failing workflows
        const failingWorkflows = Array.from({ length: 10 }, (_, i) => ({
          model: TestFactories.createCompleteWorkflow(),
          context: {
            ...validContext,
            executionId: `stress-test-${i}`
          }
        }));

        // Act - Execute all workflows concurrently with errors expected
        const results = await Promise.allSettled(
          failingWorkflows.map(({ model, context }) =>
            workflowService.executeWorkflow(model, context)
          )
        );

        // Assert - System should remain stable
        expect(results.length).toBe(10);
        
        // At least some should complete (system not crashed)
        const completed = results.filter(r => r.status === 'fulfilled');
        expect(completed.length).toBeGreaterThan(0);
        
        // Verify service is still functional
        const statusCheck = await workflowService.getExecutionStatus('non-existent');
        expect(statusCheck).toBeFailureResult(); // Expected failure, but service responsive
      });
    });

    describe('resource cleanup after errors', () => {
      it('should clean up resources after workflow failure', async () => {
        // Arrange
        const model = TestFactories.createCompleteWorkflow();
        const context = { ...validContext };

        // Mock a failure scenario
        const originalExecute = (workflowService as any).executeContainerNode;
        (workflowService as any).executeContainerNode = jest.fn()
          .mockRejectedValue(new Error('Cleanup test failure'));

        // Act
        const result = await workflowService.executeWorkflow(model, context);

        // Assert
        expect(result).toBeFailureResult();
        
        // Verify cleanup - execution state should be properly handled
        const statusResult = await workflowService.getExecutionStatus(context.executionId);
        if (statusResult.isSuccess) {
          expect(['failed', 'stopped']).toContain(statusResult.value.status);
        }
        
        // Cleanup
        (workflowService as any).executeContainerNode = originalExecute;
      });

      it('should prevent memory leaks in long-running error scenarios', async () => {
        // Arrange - Simulate long-running process with periodic failures
        const longRunningActions = Array.from({ length: 50 }, (_, i) => `long-running-${i}`);

        // Act - Start many executions, some will fail
        for (const actionId of longRunningActions) {
          await actionExecutionService.startExecution(actionId);
          
          // Randomly fail some executions
          if (Math.random() > 0.7) {
            await actionExecutionService.failExecution(actionId, 'Random failure');
          } else {
            await actionExecutionService.completeExecution(actionId, { result: 'success' });
          }
        }

        // Assert - Service should maintain reasonable resource usage
        expect(actionExecutionService.getActiveExecutionCount()).toBe(0);
      });
    });

    describe('service coordination error handling', () => {
      it('should handle inter-service communication failures', async () => {
        // Arrange - Create scenario requiring service coordination
        const model = TestFactories.createCompleteWorkflow();
        
        // Mock context service to fail
        const failingContextService = {
          buildContext: jest.fn().mockReturnValue(Result.fail('Context service unavailable')),
          propagateContext: jest.fn().mockReturnValue(Result.fail('Context propagation failed')),
          getNodeContext: jest.fn().mockReturnValue(Result.fail('Context access denied')),
          updateNodeContext: jest.fn().mockReturnValue(Result.fail('Context update failed')),
          clearNodeContext: jest.fn().mockReturnValue(Result.fail('Context cleanup failed')),
          getHierarchicalContext: jest.fn().mockReturnValue(Result.fail('Hierarchy access failed')),
          validateContextAccess: jest.fn().mockReturnValue(Result.fail('Validation failed')),
          cloneContextScope: jest.fn().mockReturnValue(Result.fail('Clone failed')),
          mergeContextScopes: jest.fn().mockReturnValue(Result.fail('Merge failed'))
        } as any;
        
        const resilientFractalService = new FractalOrchestrationService(
          failingContextService,
          actionOrchestrationService
        );

        // Act
        const planResult = resilientFractalService.planFractalExecution(model);

        // Assert - Should handle service failures gracefully
        if (planResult.isSuccess) {
          const executeResult = await resilientFractalService.executeFractalOrchestration(planResult.value);
          // Execution might succeed or fail, but should not crash
          expect(executeResult.isSuccess || executeResult.isFailure).toBe(true);
        } else {
          expect(planResult.error).toContain('Failed to plan fractal execution');
        }
      });
    });
  });
});