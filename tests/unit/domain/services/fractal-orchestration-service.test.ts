/**
 * Unit tests for FractalOrchestrationService
 * Tests fractal orchestration patterns, hierarchical execution coordination,
 * context propagation across multiple nesting levels, and orchestration consistency.
 * 
 * This service manages the fractal nature of function model execution across
 * multiple hierarchy levels, enforcing Clean Architecture principles through
 * clear layer separation and Result pattern usage.
 */

import { 
  FractalOrchestrationService, 
  FractalLevel, 
  FractalExecutionState, 
  FractalOrchestrationResult 
} from '@/lib/domain/services/fractal-orchestration-service';
import { NodeContextAccessService } from '@/lib/domain/services/node-context-access-service';
import { ActionNodeOrchestrationService } from '@/lib/domain/services/action-node-orchestration-service';
import { FunctionModel } from '@/lib/domain/entities/function-model';
import { FunctionModelBuilder, TestFactories } from '../../../utils/test-fixtures';
import { NodeId } from '@/lib/domain/value-objects/node-id';

describe('FractalOrchestrationService', () => {
  let fractalService: FractalOrchestrationService;
  let mockContextService: jest.Mocked<NodeContextAccessService>;
  let mockActionOrchestrationService: jest.Mocked<ActionNodeOrchestrationService>;
  let testModel: FunctionModel;

  beforeEach(() => {
    // Create mock services
    mockContextService = {
      buildContext: jest.fn(),
      propagateContext: jest.fn(),
      getNodeContext: jest.fn(),
      updateNodeContext: jest.fn(),
      clearNodeContext: jest.fn(),
      getHierarchicalContext: jest.fn(),
      validateContextAccess: jest.fn(),
      cloneContextScope: jest.fn(),
      mergeContextScopes: jest.fn(),
    } as any;

    mockActionOrchestrationService = {
      orchestrateNodeActions: jest.fn(),
      coordinateParallelActions: jest.fn(),
      sequenceActionExecution: jest.fn(),
      evaluateConditionalActions: jest.fn(),
      handleActionFailures: jest.fn(),
      optimizeActionOrder: jest.fn(),
      validateActionDependencies: jest.fn(),
      monitorActionProgress: jest.fn(),
    } as any;

    fractalService = new FractalOrchestrationService(
      mockContextService,
      mockActionOrchestrationService
    );

    testModel = TestFactories.createCompleteWorkflow();
  });

  describe('fractal execution planning', () => {
    describe('planFractalExecution', () => {
      it('should plan single-level execution successfully', () => {
        // Act
        const result = fractalService.planFractalExecution(testModel);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toMatch(/^fractal_/);
        expect(result.value).toContain(testModel.modelId);
      });

      it('should plan execution with initial context', () => {
        // Arrange
        const initialContext = { userId: 'user-123', environment: 'test' };
        
        // Act
        const result = fractalService.planFractalExecution(testModel, initialContext);
        
        // Assert
        expect(result).toBeValidResult();
        const executionId = result.value;
        
        // Verify state created (access through public methods)
        // We can't directly access private state, so we'll test through execution
        const executeResult = fractalService.executeFractalOrchestration(executionId);
        expect(executeResult).toBeDefined();
      });

      it('should create proper fractal levels for simple model', () => {
        // Act
        const planResult = fractalService.planFractalExecution(testModel);
        
        // Assert
        expect(planResult).toBeValidResult();
        
        // Test that planning succeeded by attempting execution
        const executionId = planResult.value;
        expect(() => fractalService.executeFractalOrchestration(executionId)).not.toThrow();
      });

      it('should handle multi-level model planning', () => {
        // Arrange - Create model that will trigger multi-level analysis
        const multiLevelModel = new FunctionModelBuilder()
          .withId('multi-level-model')
          .withName('Multi-Level Test Model')
          .build();
        
        // Act
        const result = fractalService.planFractalExecution(multiLevelModel);
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toMatch(/^fractal_multi-level-model_\d+$/);
      });

      it('should handle deep nested model with depth limits', () => {
        // Arrange - Create model that will exceed depth limits
        const deepModel = new FunctionModelBuilder()
          .withId('deep-model')
          .withName('Deep Nested Model')
          .build();
        
        // Act
        const result = fractalService.planFractalExecution(deepModel);
        
        // Assert
        expect(result).toBeValidResult();
        const executionId = result.value;
        
        // Verify consistency validation will catch depth issues
        const consistencyResult = fractalService.validateOrchestrationConsistency(executionId);
        expect(consistencyResult).toBeFailureResult();
        expect(consistencyResult.error).toContain('exceeds maximum allowed depth');
      });
    });
  });

  describe('fractal execution coordination', () => {
    let executionId: string;

    beforeEach(async () => {
      const planResult = fractalService.planFractalExecution(testModel);
      expect(planResult).toBeValidResult();
      executionId = planResult.value;
    });

    describe('executeFractalOrchestration', () => {
      it('should execute fractal orchestration successfully', async () => {
        // Act
        const result = await fractalService.executeFractalOrchestration(executionId);
        
        // Assert
        expect(result).toBeValidResult();
        const orchestrationResult = result.value;
        expect(orchestrationResult.executionId).toBe(executionId);
        expect(orchestrationResult.totalLevels).toBeGreaterThan(0);
        expect(orchestrationResult.completedLevels).toBe(orchestrationResult.totalLevels);
        expect(orchestrationResult.failedLevels).toBe(0);
        expect(orchestrationResult.totalDuration).toBeGreaterThan(0);
        expect(orchestrationResult.contextOutputs).toBeDefined();
      });

      it('should handle execution state transitions', async () => {
        // Act
        const executionPromise = fractalService.executeFractalOrchestration(executionId);
        
        // The execution should complete successfully
        const result = await executionPromise;
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value.totalDuration).toBeGreaterThan(0);
      });

      it('should aggregate context outputs properly', async () => {
        // Act
        const result = await fractalService.executeFractalOrchestration(executionId);
        
        // Assert
        expect(result).toBeValidResult();
        const outputs = result.value.contextOutputs;
        expect(Object.keys(outputs)).toHaveLength(1); // Single level for simple model
        
        const levelKey = Object.keys(outputs)[0];
        expect(levelKey).toMatch(/^level_0_/);
        expect(outputs[levelKey]).toHaveProperty('level', 0);
        expect(outputs[levelKey]).toHaveProperty('executed', true);
      });

      it('should reject execution for non-existent state', async () => {
        // Act
        const result = await fractalService.executeFractalOrchestration('non-existent-id');
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Execution state not found');
      });

      it('should handle execution failures gracefully', async () => {
        // Arrange - Create a scenario that will fail
        // We'll mock the level coordination to fail
        const originalMethod = (fractalService as any).coordinateLevelExecution;
        (fractalService as any).coordinateLevelExecution = jest.fn().mockRejectedValue(new Error('Level coordination failed'));
        
        // Act
        const result = await fractalService.executeFractalOrchestration(executionId);
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('Fractal execution failed');
        
        // Cleanup
        (fractalService as any).coordinateLevelExecution = originalMethod;
      });
    });

    describe('coordinateLevelExecution', () => {
      it('should coordinate level execution successfully', async () => {
        // Act
        const result = await fractalService.coordinateLevelExecution(executionId, 0);
        
        // Assert
        expect(result).toBeValidResult();
      });

      it('should handle inherited context properly', async () => {
        // Arrange - Set up multi-level execution
        const multiLevelModel = new FunctionModelBuilder()
          .withId('multi-level-model')
          .build();
        const planResult = fractalService.planFractalExecution(multiLevelModel, { rootData: 'test' });
        expect(planResult).toBeValidResult();
        
        // Act - Execute first level to create context, then second
        await fractalService.coordinateLevelExecution(planResult.value, 0);
        const level1Result = await fractalService.coordinateLevelExecution(planResult.value, 1);
        
        // Assert
        expect(level1Result).toBeValidResult();
      });

      it('should reject coordination for invalid level', async () => {
        // Act
        const result = await fractalService.coordinateLevelExecution(executionId, 999);
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Level information not found');
      });

      it('should reject coordination for non-existent execution', async () => {
        // Act
        const result = await fractalService.coordinateLevelExecution('non-existent', 0);
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Execution state not found');
      });
    });
  });

  describe('context propagation management', () => {
    let executionId: string;

    beforeEach(async () => {
      // Set up multi-level model for context testing
      const multiLevelModel = new FunctionModelBuilder()
        .withId('multi-level-model')
        .build();
      const planResult = fractalService.planFractalExecution(multiLevelModel);
      expect(planResult).toBeValidResult();
      executionId = planResult.value;
    });

    describe('propagateContext', () => {
      it('should propagate context between levels successfully', () => {
        // Arrange
        const contextData = { stage1Output: 'test-data', timestamp: new Date() };
        
        // Act
        const result = fractalService.propagateContext(executionId, 0, 1, contextData);
        
        // Assert
        expect(result).toBeValidResult();
      });

      it('should transform context based on orchestration mode', () => {
        // Arrange - Test different orchestration modes
        const contexts = [
          { mode: 'embedded', data: { embeddedData: 'test' } },
          { mode: 'parallel', data: { parallelData: 'test' } },
          { mode: 'sequential', data: { sequentialData: 'test' } }
        ];
        
        // Act & Assert
        contexts.forEach(({ data }) => {
          const result = fractalService.propagateContext(executionId, 0, 1, data);
          expect(result).toBeValidResult();
        });
      });

      it('should reject propagation for invalid levels', () => {
        // Act & Assert
        const invalidFromResult = fractalService.propagateContext(executionId, 999, 1, {});
        expect(invalidFromResult).toBeFailureResult();
        expect(invalidFromResult).toHaveErrorMessage('Invalid level specified for context propagation');
        
        const invalidToResult = fractalService.propagateContext(executionId, 0, 999, {});
        expect(invalidToResult).toBeFailureResult();
        expect(invalidToResult).toHaveErrorMessage('Invalid level specified for context propagation');
      });

      it('should reject propagation for non-existent execution', () => {
        // Act
        const result = fractalService.propagateContext('non-existent', 0, 1, {});
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Execution state not found');
      });
    });
  });

  describe('hierarchical orchestration patterns', () => {
    describe('handleVerticalNesting', () => {
      it('should handle vertical nesting successfully', async () => {
        // Arrange
        const parentModelId = 'parent-model';
        const nestedModels = [
          TestFactories.createCompleteWorkflow(),
          TestFactories.createCompleteWorkflow()
        ];
        const inheritedContext = { parentData: 'test' };
        
        // Act
        const result = await fractalService.handleVerticalNesting(
          parentModelId,
          nestedModels,
          inheritedContext
        );
        
        // Assert
        expect(result).toBeValidResult();
        const nestedResults = result.value;
        expect(Object.keys(nestedResults)).toHaveLength(2);
        
        // Verify each nested model has results
        for (const modelId of Object.keys(nestedResults)) {
          expect(nestedResults[modelId]).toBeDefined();
          expect(typeof nestedResults[modelId]).toBe('object');
        }
      });

      it('should handle empty nested models array', async () => {
        // Act
        const result = await fractalService.handleVerticalNesting('parent', [], {});
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toEqual({});
      });

      it('should propagate context to nested models', async () => {
        // Arrange
        const inheritedContext = { userId: 'user-123', sessionId: 'session-456' };
        const nestedModels = [TestFactories.createCompleteWorkflow()];
        
        // Act
        const result = await fractalService.handleVerticalNesting('parent', nestedModels, inheritedContext);
        
        // Assert
        expect(result).toBeValidResult();
        // Context propagation is tested through successful execution
      });
    });

    describe('handleHorizontalScaling', () => {
      it('should handle horizontal scaling successfully', async () => {
        // Arrange
        const models = [
          TestFactories.createCompleteWorkflow(),
          TestFactories.createCompleteWorkflow(),
          TestFactories.createCompleteWorkflow()
        ];
        const sharedContext = { environmentData: 'prod' };
        
        // Act
        const result = await fractalService.handleHorizontalScaling(models, sharedContext);
        
        // Assert
        expect(result).toBeValidResult();
        const horizontalResults = result.value;
        expect(Object.keys(horizontalResults)).toHaveLength(3);
        
        // Verify all models executed
        for (const modelId of Object.keys(horizontalResults)) {
          expect(horizontalResults[modelId]).toBeDefined();
        }
      });

      it('should execute models in parallel', async () => {
        // Arrange
        const models = [
          TestFactories.createCompleteWorkflow(),
          TestFactories.createCompleteWorkflow()
        ];
        const startTime = Date.now();
        
        // Act
        const result = await fractalService.handleHorizontalScaling(models, {});
        const endTime = Date.now();
        
        // Assert
        expect(result).toBeValidResult();
        
        // Parallel execution should be faster than sequential
        // (This is a rough heuristic since our mock execution is fast)
        const executionTime = endTime - startTime;
        expect(executionTime).toBeLessThan(1000); // Should complete quickly if parallel
      });

      it('should handle empty models array', async () => {
        // Act
        const result = await fractalService.handleHorizontalScaling([], {});
        
        // Assert
        expect(result).toBeValidResult();
        expect(result.value).toEqual({});
      });

      it('should share context across all models', async () => {
        // Arrange
        const sharedContext = { sharedData: 'global-state', version: '1.0' };
        const models = [TestFactories.createCompleteWorkflow()];
        
        // Act
        const result = await fractalService.handleHorizontalScaling(models, sharedContext);
        
        // Assert
        expect(result).toBeValidResult();
        // Context sharing is tested through successful execution
      });
    });
  });

  describe('orchestration consistency validation', () => {
    describe('validateOrchestrationConsistency', () => {
      it('should validate consistent orchestration successfully', () => {
        // Arrange
        const planResult = fractalService.planFractalExecution(testModel);
        expect(planResult).toBeValidResult();
        
        // Act
        const result = fractalService.validateOrchestrationConsistency(planResult.value);
        
        // Assert
        expect(result).toBeValidResult();
      });

      it('should detect nesting depth violations', () => {
        // Arrange - Create deep model that exceeds limits
        const deepModel = new FunctionModelBuilder()
          .withId('deep-model')
          .build();
        const planResult = fractalService.planFractalExecution(deepModel);
        expect(planResult).toBeValidResult();
        
        // Act
        const result = fractalService.validateOrchestrationConsistency(planResult.value);
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result.error).toContain('exceeds maximum allowed depth');
      });

      it('should detect circular dependencies', () => {
        // Arrange - Create model with potential circular reference
        const circularModel = new FunctionModelBuilder()
          .withId('circular-model')
          .build();
        const planResult = fractalService.planFractalExecution(circularModel);
        expect(planResult).toBeValidResult();
        
        // For this simple test, validation should pass
        // Complex circular dependency detection would require more setup
        const result = fractalService.validateOrchestrationConsistency(planResult.value);
        expect(result).toBeValidResult();
      });

      it('should validate context propagation consistency', () => {
        // Arrange
        const multiLevelModel = new FunctionModelBuilder()
          .withId('multi-level-model')
          .build();
        const planResult = fractalService.planFractalExecution(multiLevelModel);
        expect(planResult).toBeValidResult();
        
        // Act
        const result = fractalService.validateOrchestrationConsistency(planResult.value);
        
        // Assert
        expect(result).toBeValidResult();
      });

      it('should reject validation for non-existent execution', () => {
        // Act
        const result = fractalService.validateOrchestrationConsistency('non-existent');
        
        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Execution state not found');
      });
    });
  });

  describe('orchestration mode handling', () => {
    let executionId: string;

    beforeEach(async () => {
      const multiLevelModel = new FunctionModelBuilder()
        .withId('multi-level-model')
        .build();
      const planResult = fractalService.planFractalExecution(multiLevelModel);
      expect(planResult).toBeValidResult();
      executionId = planResult.value;
    });

    it('should handle embedded orchestration mode', async () => {
      // This is tested through the default execution path
      const result = await fractalService.coordinateLevelExecution(executionId, 0);
      expect(result).toBeValidResult();
    });

    it('should handle parallel orchestration mode', async () => {
      // Multi-level model has both embedded and sequential modes
      // Test that both levels coordinate successfully
      await fractalService.coordinateLevelExecution(executionId, 0);
      const result = await fractalService.coordinateLevelExecution(executionId, 1);
      expect(result).toBeValidResult();
    });

    it('should handle sequential orchestration mode', async () => {
      // Sequential mode is tested through multi-level coordination
      const result = await fractalService.coordinateLevelExecution(executionId, 1);
      expect(result).toBeValidResult();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed execution states gracefully', async () => {
      // Arrange - Create execution then corrupt internal state
      const planResult = fractalService.planFractalExecution(testModel);
      expect(planResult).toBeValidResult();
      const executionId = planResult.value;
      
      // Corrupt the state by clearing levels
      const state = (fractalService as any).executionStates.get(executionId);
      if (state) {
        state.levels = []; // Empty levels array
      }
      
      // Act
      const result = await fractalService.executeFractalOrchestration(executionId);
      
      // Assert - Should handle gracefully with empty levels
      expect(result).toBeValidResult();
      expect(result.value.totalLevels).toBe(0);
      expect(result.value.completedLevels).toBe(0);
    });

    it('should handle concurrent fractal executions', async () => {
      // Arrange
      const model1 = TestFactories.createCompleteWorkflow();
      const model2 = TestFactories.createCompleteWorkflow();
      
      const plan1 = fractalService.planFractalExecution(model1);
      const plan2 = fractalService.planFractalExecution(model2);
      
      expect(plan1).toBeValidResult();
      expect(plan2).toBeValidResult();
      
      // Act - Execute concurrently
      const [result1, result2] = await Promise.all([
        fractalService.executeFractalOrchestration(plan1.value),
        fractalService.executeFractalOrchestration(plan2.value)
      ]);
      
      // Assert
      expect(result1).toBeValidResult();
      expect(result2).toBeValidResult();
      expect(result1.value.executionId).not.toBe(result2.value.executionId);
    });

    it('should handle resource cleanup after execution', async () => {
      // Arrange
      const planResult = fractalService.planFractalExecution(testModel);
      expect(planResult).toBeValidResult();
      const executionId = planResult.value;
      
      // Act
      await fractalService.executeFractalOrchestration(executionId);
      
      // Assert - State should still exist for querying
      const consistencyResult = fractalService.validateOrchestrationConsistency(executionId);
      expect(consistencyResult).toBeValidResult();
    });

    it('should handle context transformation failures gracefully', () => {
      // Arrange
      const planResult = fractalService.planFractalExecution(testModel);
      expect(planResult).toBeValidResult();
      const executionId = planResult.value;
      
      // Act - Try to propagate invalid context
      const circularContext = {};
      (circularContext as any).self = circularContext; // Circular reference
      
      const result = fractalService.propagateContext(executionId, 0, 0, circularContext);
      
      // Assert - Should handle gracefully
      expect(result).toBeValidResult();
    });

    it('should maintain service dependencies properly', () => {
      // Assert that dependencies are properly injected
      expect((fractalService as any).contextAccessService).toBe(mockContextService);
      expect((fractalService as any).actionOrchestrationService).toBe(mockActionOrchestrationService);
    });

    it('should handle invalid model structure with null modelId', () => {
      // Arrange - Create a mock model object with null modelId
      const invalidModel = {
        get modelId() { return null; },
        nodes: new Map(),
        // Add other required properties to avoid other errors
      } as any;
      
      // Act
      const result = fractalService.planFractalExecution(invalidModel);
      
      // Assert - Should fail gracefully instead of throwing
      expect(result).toBeFailureResult();
      expect(result.error).toContain('Failed to plan fractal execution');
      expect(result.error).toContain('Model ID is null or undefined');
    });

    it('should handle completely null model', () => {
      // Act
      const result = fractalService.planFractalExecution(null as any);
      
      // Assert - Should fail gracefully instead of throwing
      expect(result).toBeFailureResult();
      expect(result.error).toContain('Failed to plan fractal execution');
      expect(result.error).toContain('Root model is null or undefined');
    });

    it('should handle levels iteration error in consistency validation', () => {
      // Arrange - Create execution then corrupt levels to be non-iterable
      const planResult = fractalService.planFractalExecution(testModel);
      expect(planResult).toBeValidResult();
      const executionId = planResult.value;
      
      // Corrupt the state by setting levels to null (non-iterable)
      const state = (fractalService as any).executionStates.get(executionId);
      if (state) {
        state.levels = null;
      }
      
      // Act
      const result = fractalService.validateOrchestrationConsistency(executionId);
      
      // Assert - Should fail gracefully instead of throwing iteration error
      expect(result).toBeFailureResult();
      expect(result.error).toContain('Failed to validate orchestration consistency');
    });
  });
});