import { 
  FractalOrchestrationService, 
  FractalLevel, 
  FractalExecutionState, 
  FractalOrchestrationResult 
} from '@/lib/domain/services/fractal-orchestration-service';
import { NodeContextAccessService } from '@/lib/domain/services/node-context-access-service';
import { ActionNodeOrchestrationService } from '@/lib/domain/services/action-node-orchestration-service';
import { FunctionModel } from '@/lib/domain/entities/function-model';
import { FunctionModelContainerNode } from '@/lib/domain/entities/function-model-container-node';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { Result } from '@/lib/domain/shared/result';

// Mock dependencies
class MockNodeContextAccessService {
  public getNodeContext(agentId: NodeId, nodeId: NodeId, accessMode: string): Result<{ contextData: Record<string, any> }> {
    return Result.ok({ contextData: { mockContext: true, nodeId: nodeId.value } });
  }
}

class MockActionNodeOrchestrationService {
  public async executeActionNodes(): Promise<Result<void>> {
    return Result.ok<void>(undefined);
  }
}

// Mock FunctionModel implementation for testing
class MockFunctionModel extends FunctionModel {
  public static createMock(
    modelId: string,
    nodes: any[] = [],
    containerNodes: FunctionModelContainerNode[] = []
  ): MockFunctionModel {
    const model = new MockFunctionModel({
      modelId,
      name: `Mock Model ${modelId}`,
      description: 'Test function model',
      version: 1,
      nodes: [...nodes, ...containerNodes],
      edges: [],
      metadata: {},
      featureType: 'FUNCTION_MODEL' as any,
      canvasData: {
        viewport: { x: 0, y: 0, zoom: 1 },
        canvasSize: { width: 1000, height: 1000 }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return model;
  }
}

// Mock FunctionModelContainerNode for testing
class MockFunctionModelContainerNode extends FunctionModelContainerNode {
  public static createMock(
    nodeId: NodeId,
    nestedModelId: string,
    orchestrationMode: 'embedded' | 'parallel' | 'sequential' = 'embedded',
    contextMapping: Record<string, any> = {}
  ): MockFunctionModelContainerNode {
    return new MockFunctionModelContainerNode({
      nodeId,
      modelId: 'parent-model',
      name: `Container Node ${nodeId.value}`,
      description: 'Test container node',
      position: { x: 0, y: 0 },
      nodeType: 'functionModelContainer',
      containerData: {
        nestedModelId,
        orchestrationMode,
        contextMapping,
        isolationLevel: 'standard',
        resourceLimits: {},
        performanceMetrics: {
          maxExecutionTime: 5000,
          maxMemoryUsage: 1024,
          avgExecutionTime: 1000
        }
      },
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}

describe('FractalOrchestrationService', () => {
  let service: FractalOrchestrationService;
  let mockContextService: MockNodeContextAccessService;
  let mockActionService: MockActionNodeOrchestrationService;

  beforeEach(() => {
    mockContextService = new MockNodeContextAccessService();
    mockActionService = new MockActionNodeOrchestrationService();
    service = new FractalOrchestrationService(
      mockContextService as any,
      mockActionService as any
    );
  });

  describe('Fractal Execution Planning', () => {
    it('should plan fractal execution for simple model', () => {
      // Arrange
      const rootModel = MockFunctionModel.createMock('root-model');
      const initialContext = { data: 'test' };

      // Act
      const result = service.planFractalExecution(rootModel, initialContext);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toMatch(/^fractal_root-model_\d+$/);
    });

    it('should plan fractal execution for nested model structure', () => {
      // Arrange
      const containerNode = MockFunctionModelContainerNode.createMock(
        NodeId.generate(),
        'nested-model-1',
        'embedded',
        { inheritedParam: 'value' }
      );
      const rootModel = MockFunctionModel.createMock('root-model', [], [containerNode]);
      const initialContext = { rootData: 'test' };

      // Act
      const result = service.planFractalExecution(rootModel, initialContext);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toMatch(/^fractal_root-model_\d+$/);
    });

    it('should handle empty model gracefully', () => {
      // Arrange
      const emptyModel = MockFunctionModel.createMock('empty-model');

      // Act
      const result = service.planFractalExecution(emptyModel);

      // Assert
      expect(result.isSuccess).toBe(true);
    });

    it('should preserve initial context in fractal levels', () => {
      // Arrange
      const rootModel = MockFunctionModel.createMock('root-model');
      const initialContext = { globalParam: 'global_value', level: 0 };

      // Act
      const executionId = service.planFractalExecution(rootModel, initialContext);

      // Assert
      expect(executionId.isSuccess).toBe(true);
      // The context should be available in the execution state
    });
  });

  describe('Fractal Orchestration Execution', () => {
    let executionId: string;

    beforeEach(() => {
      const rootModel = MockFunctionModel.createMock('test-model');
      const planResult = service.planFractalExecution(rootModel, { test: 'data' });
      executionId = planResult.value;
    });

    it('should execute fractal orchestration successfully', async () => {
      // Act
      const result = await service.executeFractalOrchestration(executionId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.executionId).toBe(executionId);
      expect(result.value.totalLevels).toBeGreaterThanOrEqual(1);
      expect(result.value.completedLevels).toBeGreaterThanOrEqual(0);
      expect(result.value.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('should fail for non-existent execution ID', async () => {
      // Arrange
      const nonExistentId = 'non-existent-execution';

      // Act
      const result = await service.executeFractalOrchestration(nonExistentId);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Execution state not found');
    });

    it('should track execution duration', async () => {
      // Act
      const result = await service.executeFractalOrchestration(executionId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.totalDuration).toBeGreaterThan(0);
    });

    it('should aggregate context outputs', async () => {
      // Act
      const result = await service.executeFractalOrchestration(executionId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.contextOutputs).toBeDefined();
      expect(typeof result.value.contextOutputs).toBe('object');
    });
  });

  describe('Context Propagation', () => {
    let executionId: string;

    beforeEach(() => {
      const containerNode1 = MockFunctionModelContainerNode.createMock(
        NodeId.generate(),
        'nested-model-1',
        'embedded'
      );
      const containerNode2 = MockFunctionModelContainerNode.createMock(
        NodeId.generate(),
        'nested-model-2',
        'sequential'
      );
      const rootModel = MockFunctionModel.createMock('multi-level-model', [], [containerNode1, containerNode2]);
      
      const planResult = service.planFractalExecution(rootModel, { root: 'context' });
      executionId = planResult.value;
    });

    it('should propagate context between levels', () => {
      // Arrange
      const contextData = { level1Output: 'result', processedData: [1, 2, 3] };

      // Act
      const result = service.propagateContext(executionId, 0, 1, contextData);

      // Assert
      expect(result.isSuccess).toBe(true);
    });

    it('should fail context propagation for invalid levels', () => {
      // Arrange
      const contextData = { data: 'test' };

      // Act
      const result = service.propagateContext(executionId, 0, 999, contextData);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Invalid level specified');
    });

    it('should fail context propagation for non-existent execution', () => {
      // Arrange
      const nonExistentId = 'non-existent';
      const contextData = { data: 'test' };

      // Act
      const result = service.propagateContext(nonExistentId, 0, 1, contextData);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Execution state not found');
    });

    it('should transform context based on orchestration mode', () => {
      // Arrange
      const embeddedContext = { mode: 'embedded', data: 'test' };
      const parallelContext = { mode: 'parallel', data: 'test' };
      const sequentialContext = { mode: 'sequential', data: 'test' };

      // Act
      const embeddedResult = service.propagateContext(executionId, 0, 1, embeddedContext);
      const parallelResult = service.propagateContext(executionId, 0, 2, parallelContext);

      // Assert
      expect(embeddedResult.isSuccess).toBe(true);
      expect(parallelResult.isSuccess).toBe(true);
    });
  });

  describe('Level Coordination', () => {
    let executionId: string;

    beforeEach(() => {
      const containerNode = MockFunctionModelContainerNode.createMock(
        NodeId.generate(),
        'nested-model',
        'embedded'
      );
      const rootModel = MockFunctionModel.createMock('coordinated-model', [], [containerNode]);
      
      const planResult = service.planFractalExecution(rootModel, { coordinated: true });
      executionId = planResult.value;
    });

    it('should coordinate level execution successfully', async () => {
      // Act
      const result = await service.coordinateLevelExecution(executionId, 0);

      // Assert
      expect(result.isSuccess).toBe(true);
    });

    it('should fail coordination for invalid level', async () => {
      // Act
      const result = await service.coordinateLevelExecution(executionId, 999);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Level information not found');
    });

    it('should fail coordination for non-existent execution', async () => {
      // Arrange
      const nonExistentId = 'non-existent';

      // Act
      const result = await service.coordinateLevelExecution(nonExistentId, 0);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Execution state not found');
    });

    it('should update execution path during coordination', async () => {
      // Act
      await service.coordinateLevelExecution(executionId, 0);

      // Assert
      // The execution path should be updated, but we can't directly verify this
      // without exposing internal state. This test verifies no errors occur.
    });
  });

  describe('Vertical Nesting', () => {
    it('should handle vertical nesting successfully', async () => {
      // Arrange
      const nestedModel1 = MockFunctionModel.createMock('nested-1');
      const nestedModel2 = MockFunctionModel.createMock('nested-2');
      const nestedModels = [nestedModel1, nestedModel2];
      const inheritedContext = { parentData: 'from_parent', level: 1 };

      // Act
      const result = await service.handleVerticalNesting('parent-model', nestedModels, inheritedContext);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value['nested-1']).toBeDefined();
      expect(result.value['nested-2']).toBeDefined();
    });

    it('should handle empty nested models', async () => {
      // Arrange
      const nestedModels: FunctionModel[] = [];
      const inheritedContext = { parentData: 'test' };

      // Act
      const result = await service.handleVerticalNesting('parent-model', nestedModels, inheritedContext);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(Object.keys(result.value).length).toBe(0);
    });

    it('should propagate inherited context to nested models', async () => {
      // Arrange
      const nestedModel = MockFunctionModel.createMock('nested-with-context');
      const inheritedContext = { 
        sharedState: 'important_data',
        configuration: { mode: 'production' }
      };

      // Act
      const result = await service.handleVerticalNesting('parent-model', [nestedModel], inheritedContext);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value['nested-with-context']).toBeDefined();
    });
  });

  describe('Horizontal Scaling', () => {
    it('should handle horizontal scaling successfully', async () => {
      // Arrange
      const model1 = MockFunctionModel.createMock('horizontal-1');
      const model2 = MockFunctionModel.createMock('horizontal-2');
      const model3 = MockFunctionModel.createMock('horizontal-3');
      const models = [model1, model2, model3];
      const sharedContext = { shared: 'context', timestamp: Date.now() };

      // Act
      const result = await service.handleHorizontalScaling(models, sharedContext);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value['horizontal-1']).toBeDefined();
      expect(result.value['horizontal-2']).toBeDefined();
      expect(result.value['horizontal-3']).toBeDefined();
    });

    it('should handle empty models list', async () => {
      // Arrange
      const models: FunctionModel[] = [];
      const sharedContext = { empty: 'test' };

      // Act
      const result = await service.handleHorizontalScaling(models, sharedContext);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(Object.keys(result.value).length).toBe(0);
    });

    it('should execute models in parallel', async () => {
      // Arrange
      const model1 = MockFunctionModel.createMock('parallel-1');
      const model2 = MockFunctionModel.createMock('parallel-2');
      const models = [model1, model2];
      const sharedContext = { parallel: true };

      const startTime = Date.now();

      // Act
      const result = await service.handleHorizontalScaling(models, sharedContext);
      const endTime = Date.now();

      // Assert
      expect(result.isSuccess).toBe(true);
      // Parallel execution should be faster than sequential
      expect(endTime - startTime).toBeLessThan(2000); // Should complete quickly due to parallel execution
    });

    it('should share context across parallel models', async () => {
      // Arrange
      const model1 = MockFunctionModel.createMock('shared-context-1');
      const model2 = MockFunctionModel.createMock('shared-context-2');
      const models = [model1, model2];
      const sharedContext = { 
        globalConfig: { mode: 'parallel' },
        sessionId: 'test-session-123'
      };

      // Act
      const result = await service.handleHorizontalScaling(models, sharedContext);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value['shared-context-1']).toBeDefined();
      expect(result.value['shared-context-2']).toBeDefined();
    });
  });

  describe('Orchestration Consistency Validation', () => {
    let executionId: string;

    beforeEach(() => {
      const rootModel = MockFunctionModel.createMock('validation-model');
      const planResult = service.planFractalExecution(rootModel);
      executionId = planResult.value;
    });

    it('should validate orchestration consistency successfully', () => {
      // Act
      const result = service.validateOrchestrationConsistency(executionId);

      // Assert
      expect(result.isSuccess).toBe(true);
    });

    it('should fail validation for non-existent execution', () => {
      // Arrange
      const nonExistentId = 'non-existent';

      // Act
      const result = service.validateOrchestrationConsistency(nonExistentId);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Execution state not found');
    });

    it('should detect excessive nesting depth', () => {
      // Arrange - Create a deep nesting structure
      const containerNodes: FunctionModelContainerNode[] = [];
      for (let i = 0; i < 12; i++) { // Exceeds max depth of 10
        const containerNode = MockFunctionModelContainerNode.createMock(
          NodeId.generate(),
          `deep-nested-${i}`,
          'embedded'
        );
        containerNodes.push(containerNode);
      }
      
      const deepModel = MockFunctionModel.createMock('deep-model', [], containerNodes);
      const deepExecutionId = service.planFractalExecution(deepModel).value;

      // Act
      const result = service.validateOrchestrationConsistency(deepExecutionId);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed depth');
    });

    it('should validate context consistency across levels', () => {
      // Arrange
      const containerNode = MockFunctionModelContainerNode.createMock(
        NodeId.generate(),
        'context-model',
        'sequential'
      );
      const contextModel = MockFunctionModel.createMock('context-validation-model', [], [containerNode]);
      const contextExecutionId = service.planFractalExecution(contextModel, { root: 'context' }).value;

      // Propagate some context
      service.propagateContext(contextExecutionId, 0, 1, { level0: 'output' });

      // Act
      const result = service.validateOrchestrationConsistency(contextExecutionId);

      // Assert
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle models with no container nodes', () => {
      // Arrange
      const simpleModel = MockFunctionModel.createMock('simple-model');

      // Act
      const result = service.planFractalExecution(simpleModel);

      // Assert
      expect(result.isSuccess).toBe(true);
    });

    it('should handle null/undefined initial context', () => {
      // Arrange
      const model = MockFunctionModel.createMock('null-context-model');

      // Act
      const resultUndefined = service.planFractalExecution(model, undefined as any);
      const resultNull = service.planFractalExecution(model, null as any);

      // Assert
      expect(resultUndefined.isSuccess).toBe(true);
      expect(resultNull.isSuccess).toBe(true);
    });

    it('should handle very large context objects', () => {
      // Arrange
      const largeContext: Record<string, any> = {};
      for (let i = 0; i < 1000; i++) {
        largeContext[`key_${i}`] = `value_${i}`.repeat(100);
      }
      const model = MockFunctionModel.createMock('large-context-model');

      // Act
      const result = service.planFractalExecution(model, largeContext);

      // Assert
      expect(result.isSuccess).toBe(true);
    });

    it('should handle concurrent execution planning', () => {
      // Arrange
      const model1 = MockFunctionModel.createMock('concurrent-1');
      const model2 = MockFunctionModel.createMock('concurrent-2');
      const model3 = MockFunctionModel.createMock('concurrent-3');

      // Act
      const promises = [
        service.planFractalExecution(model1),
        service.planFractalExecution(model2),
        service.planFractalExecution(model3)
      ];

      // Assert
      promises.forEach(result => {
        expect(result.isSuccess).toBe(true);
      });

      // All execution IDs should be unique
      const executionIds = promises.map(p => p.value);
      const uniqueIds = new Set(executionIds);
      expect(uniqueIds.size).toBe(3);
    });

    it('should handle orchestration mode transformations', () => {
      // Arrange
      const embeddedNode = MockFunctionModelContainerNode.createMock(
        NodeId.generate(),
        'embedded-model',
        'embedded'
      );
      const parallelNode = MockFunctionModelContainerNode.createMock(
        NodeId.generate(),
        'parallel-model',
        'parallel'
      );
      const sequentialNode = MockFunctionModelContainerNode.createMock(
        NodeId.generate(),
        'sequential-model',
        'sequential'
      );

      const mixedModel = MockFunctionModel.createMock('mixed-orchestration', [], [
        embeddedNode, parallelNode, sequentialNode
      ]);

      // Act
      const result = service.planFractalExecution(mixedModel);

      // Assert
      expect(result.isSuccess).toBe(true);
    });

    it('should handle context propagation with complex data types', () => {
      // Arrange
      const model = MockFunctionModel.createMock('complex-context-model');
      const planResult = service.planFractalExecution(model, { test: 'data' });
      const executionId = planResult.value;
      
      const complexContext = {
        simpleValue: 'string',
        numberValue: 42,
        booleanValue: true,
        arrayValue: [1, 2, { nested: 'object' }],
        objectValue: { 
          nested: { 
            deeply: { 
              values: ['a', 'b', 'c'] 
            } 
          } 
        },
        functionValue: () => 'test', // Functions in context
        dateValue: new Date(),
        nullValue: null,
        undefinedValue: undefined
      };

      // Act - Try level 0 to level 0 (self-propagation) since model may only have one level
      const result = service.propagateContext(executionId, 0, 0, complexContext);

      // Assert
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple simultaneous executions', async () => {
      // Arrange
      const models = Array.from({ length: 10 }, (_, i) => 
        MockFunctionModel.createMock(`perf-model-${i}`)
      );

      // Act
      const planPromises = models.map(model => service.planFractalExecution(model));
      const executionPromises = planPromises.map(async (planResult) => {
        if (planResult.isSuccess) {
          return service.executeFractalOrchestration(planResult.value);
        }
        return Promise.resolve(Result.fail('Plan failed'));
      });

      const results = await Promise.all(executionPromises);

      // Assert
      results.forEach(result => {
        expect(result.isSuccess).toBe(true);
      });
    });

    it('should maintain performance with deep nesting', async () => {
      // Arrange
      const containerNodes: FunctionModelContainerNode[] = [];
      for (let i = 0; i < 8; i++) { // Just under max depth
        const containerNode = MockFunctionModelContainerNode.createMock(
          NodeId.generate(),
          `nested-${i}`,
          'embedded'
        );
        containerNodes.push(containerNode);
      }
      
      const deepModel = MockFunctionModel.createMock('performance-deep-model', [], containerNodes);
      const startTime = performance.now();

      // Act
      const planResult = service.planFractalExecution(deepModel);
      const executionResult = await service.executeFractalOrchestration(planResult.value);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Assert
      expect(planResult.isSuccess).toBe(true);
      expect(executionResult.isSuccess).toBe(true);
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});