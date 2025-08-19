/**
 * Unit tests for StageNode entity
 * Tests processing stage business logic and workflow validation
 */

import { StageNode } from '@/lib/domain/entities/stage-node';
import { StageNodeBuilder, TetherNodeBuilder } from '../../../../utils/test-fixtures';
import { ResultTestHelpers, UuidTestHelpers } from '../../../../utils/test-helpers';

describe('StageNode', () => {
  beforeEach(() => {
    UuidTestHelpers.resetCounter();
    jest.clearAllMocks();
  });

  describe('creation', () => {
    it('should create stage node with valid properties', () => {
      // Act
      const node = new StageNodeBuilder()
        .withName('Processing Stage')
        .withModelId('test-model')
        .withDescription('Processes incoming data')
        .build();

      // Assert
      expect(node.nodeId).toBeDefined();
      expect(node.name).toBe('Processing Stage');
      expect(node.modelId).toBe('test-model');
      expect(node.description).toBe('Processes incoming data');
      expect(node.nodeType).toBe('stageNode');
      expect(node.position).toBeDefined();
      expect(node.actionNodes).toEqual([]);
      expect(node.createdAt).toBeInstanceOf(Date);
      expect(node.updatedAt).toBeInstanceOf(Date);
    });

    it('should create stage node with custom properties', () => {
      // Act
      const node = new StageNodeBuilder()
        .withId('custom-stage-id')
        .withName('Custom Stage')
        .withModelId('test-model')
        .withPosition(300, 400)
        .withTimeout(30000)
        .withParallelExecution(true)
        .withRetryPolicy({ maxAttempts: 5, strategy: 'exponential' })
        .build();

      // Assert
      expect(node.nodeId.toString()).toBe('custom-stage-id');
      expect(node.position.x).toBe(300);
      expect(node.position.y).toBe(400);
      expect(node.timeout).toBe(30000);
      expect(node.parallelExecution).toBe(true);
      expect(node.retryPolicy?.maxAttempts).toBe(5);
    });

    it('should initialize with empty action nodes', () => {
      // Act
      const node = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      // Assert
      expect(node.actionNodes).toEqual([]);
      expect(node.getActionCount()).toBe(0);
    });
  });

  describe('validation', () => {
    it('should validate successful stage node', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Valid Stage')
        .withModelId('test-model')
        .withDescription('A valid processing stage')
        .build();

      // Act
      const result = node.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(true);
      expect(result.value.errors).toHaveLength(0);
    });

    it('should detect invalid timeout values', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .withTimeout(-1000) // Negative timeout
        .build();

      // Act
      const result = node.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Timeout must be a positive value');
    });

    it('should warn about stages without action nodes', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Empty Stage')
        .withModelId('test-model')
        .build();

      // Act
      const result = node.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.warnings).toContain('Stage node should have at least one action to perform meaningful work');
    });

    it('should validate retry policy configuration', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .withRetryPolicy({ maxAttempts: -1, strategy: 'exponential' }) // Invalid retry policy
        .build();

      // Act
      const result = node.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Invalid retry policy configuration');
    });

    it('should warn about excessive timeout values', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .withTimeout(600000) // 10 minutes - very long
        .build();

      // Act
      const result = node.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.warnings).toContain('Timeout value is very high - consider if this is intentional');
    });
  });

  describe('action node management', () => {
    it('should add action node successfully', () => {
      // Arrange
      const stageNode = new StageNodeBuilder()
        .withId('stage-id')
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      const actionNode = new TetherNodeBuilder()
        .withParentNode('stage-id')
        .withModelId('test-model')
        .build();

      // Act
      const result = stageNode.addActionNode(actionNode);

      // Assert
      expect(result).toBeValidResult();
      expect(stageNode.actionNodes).toContain(actionNode);
      expect(stageNode.getActionCount()).toBe(1);
    });

    it('should reject action node from different model', () => {
      // Arrange
      const stageNode = new StageNodeBuilder()
        .withId('stage-id')
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      const actionNode = new TetherNodeBuilder()
        .withParentNode('stage-id')
        .withModelId('different-model') // Different model
        .build();

      // Act
      const result = stageNode.addActionNode(actionNode);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Action node belongs to different model');
    });

    it('should reject action node with different parent', () => {
      // Arrange
      const stageNode = new StageNodeBuilder()
        .withId('stage-id')
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      const actionNode = new TetherNodeBuilder()
        .withParentNode('different-parent-id') // Different parent
        .withModelId('test-model')
        .build();

      // Act
      const result = stageNode.addActionNode(actionNode);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Action node does not belong to this stage');
    });

    it('should prevent duplicate action nodes', () => {
      // Arrange
      const stageNode = new StageNodeBuilder()
        .withId('stage-id')
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      const actionNode = new TetherNodeBuilder()
        .withId('action-id')
        .withParentNode('stage-id')
        .withModelId('test-model')
        .build();

      stageNode.addActionNode(actionNode);

      // Act - Try to add the same action again
      const result = stageNode.addActionNode(actionNode);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Action node already exists in this stage');
    });

    it('should remove action node successfully', () => {
      // Arrange
      const stageNode = new StageNodeBuilder()
        .withId('stage-id')
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      const actionNode = new TetherNodeBuilder()
        .withId('action-id')
        .withParentNode('stage-id')
        .withModelId('test-model')
        .build();

      stageNode.addActionNode(actionNode);
      expect(stageNode.getActionCount()).toBe(1);

      // Act
      const result = stageNode.removeActionNode('action-id');

      // Assert
      expect(result).toBeValidResult();
      expect(stageNode.getActionCount()).toBe(0);
      expect(stageNode.actionNodes).not.toContain(actionNode);
    });

    it('should handle removing non-existent action node', () => {
      // Arrange
      const stageNode = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      // Act
      const result = stageNode.removeActionNode('non-existent-id');

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Action node not found');
    });

    it('should clear all action nodes', () => {
      // Arrange
      const stageNode = new StageNodeBuilder()
        .withId('stage-id')
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      // Add multiple actions
      const action1 = new TetherNodeBuilder().withParentNode('stage-id').withModelId('test-model').build();
      const action2 = new TetherNodeBuilder().withParentNode('stage-id').withModelId('test-model').build();
      
      stageNode.addActionNode(action1);
      stageNode.addActionNode(action2);
      expect(stageNode.getActionCount()).toBe(2);

      // Act
      stageNode.clearActionNodes();

      // Assert
      expect(stageNode.getActionCount()).toBe(0);
      expect(stageNode.actionNodes).toEqual([]);
    });
  });

  describe('execution configuration', () => {
    it('should update timeout successfully', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      // Act
      const result = node.updateTimeout(15000);

      // Assert
      expect(result).toBeValidResult();
      expect(node.timeout).toBe(15000);
    });

    it('should reject invalid timeout values', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      // Act
      const result = node.updateTimeout(-5000);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Timeout must be a positive value');
    });

    it('should update parallel execution setting', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .withParallelExecution(false)
        .build();

      // Act
      const result = node.setParallelExecution(true);

      // Assert
      expect(result).toBeValidResult();
      expect(node.parallelExecution).toBe(true);
    });

    it('should update retry policy', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      const newRetryPolicy = {
        maxAttempts: 3,
        strategy: 'linear' as const,
        baseDelayMs: 2000,
        maxDelayMs: 10000,
        enabled: true
      };

      // Act
      const result = node.updateRetryPolicy(newRetryPolicy);

      // Assert
      expect(result).toBeValidResult();
      expect(node.retryPolicy?.maxAttempts).toBe(3);
      expect(node.retryPolicy?.strategy).toBe('linear');
    });
  });

  describe('execution state management', () => {
    it('should track execution state correctly', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      expect(node.isExecuting()).toBe(false);

      // Act
      node.markAsExecuting();

      // Assert
      expect(node.isExecuting()).toBe(true);
    });

    it('should complete execution successfully', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      node.markAsExecuting();

      // Act
      const result = node.completeExecution('success');

      // Assert
      expect(result).toBeValidResult();
      expect(node.isExecuting()).toBe(false);
      expect(node.getLastExecutionResult()).toBe('success');
    });

    it('should handle execution failure', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      node.markAsExecuting();

      // Act
      const result = node.completeExecution('failure', 'Error occurred');

      // Assert
      expect(result).toBeValidResult();
      expect(node.isExecuting()).toBe(false);
      expect(node.getLastExecutionResult()).toBe('failure');
      expect(node.getLastExecutionError()).toBe('Error occurred');
    });

    it('should prevent completing execution when not executing', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      // Act - Try to complete without starting
      const result = node.completeExecution('success');

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node is not currently executing');
    });
  });

  describe('performance and complexity analysis', () => {
    it('should calculate stage complexity based on actions', () => {
      // Arrange
      const stageNode = new StageNodeBuilder()
        .withId('stage-id')
        .withName('Complex Stage')
        .withModelId('test-model')
        .build();

      // Add multiple actions to increase complexity
      for (let i = 0; i < 5; i++) {
        const action = new TetherNodeBuilder()
          .withParentNode('stage-id')
          .withModelId('test-model')
          .build();
        stageNode.addActionNode(action);
      }

      // Act
      const complexity = stageNode.calculateComplexity();

      // Assert
      expect(complexity).toBeGreaterThan(0);
      expect(typeof complexity).toBe('number');
    });

    it('should estimate execution time based on actions and configuration', () => {
      // Arrange
      const stageNode = new StageNodeBuilder()
        .withId('stage-id')
        .withName('Timed Stage')
        .withModelId('test-model')
        .withTimeout(30000)
        .build();

      // Add some actions
      const action = new TetherNodeBuilder()
        .withParentNode('stage-id')
        .withModelId('test-model')
        .build();
      stageNode.addActionNode(action);

      // Act
      const estimatedTime = stageNode.estimateExecutionTime();

      // Assert
      expect(estimatedTime).toBeGreaterThan(0);
      expect(estimatedTime).toBeLessThanOrEqual(30000); // Should not exceed timeout
    });

    it('should analyze resource requirements', () => {
      // Arrange
      const stageNode = new StageNodeBuilder()
        .withId('stage-id')
        .withName('Resource Intensive Stage')
        .withModelId('test-model')
        .withParallelExecution(true)
        .build();

      // Add multiple parallel actions
      for (let i = 0; i < 3; i++) {
        const action = new TetherNodeBuilder()
          .withParentNode('stage-id')
          .withModelId('test-model')
          .build();
        stageNode.addActionNode(action);
      }

      // Act
      const resourceAnalysis = stageNode.analyzeResourceRequirements();

      // Assert
      expect(resourceAnalysis).toBeDefined();
      expect(resourceAnalysis.cpuIntensive).toBe(true); // Parallel execution
      expect(resourceAnalysis.estimatedMemoryUsage).toBeGreaterThan(0);
      expect(resourceAnalysis.networkCalls).toBeGreaterThanOrEqual(0);
    });
  });

  describe('serialization', () => {
    it('should convert to object representation', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withId('stage-id')
        .withName('Test Stage')
        .withModelId('test-model')
        .withDescription('Test description')
        .withTimeout(20000)
        .withParallelExecution(true)
        .build();

      // Act
      const obj = node.toObject();

      // Assert
      expect(obj).toEqual({
        nodeId: 'stage-id',
        name: 'Test Stage',
        modelId: 'test-model',
        description: 'Test description',
        nodeType: 'stageNode',
        position: expect.any(Object),
        dependencies: [],
        timeout: 20000,
        parallelExecution: true,
        retryPolicy: undefined,
        actionNodes: [],
        configuration: {},
        metadata: {},
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should create from object representation', () => {
      // Arrange
      const obj = {
        nodeId: 'stage-id',
        name: 'Test Stage',
        modelId: 'test-model',
        description: 'Test description',
        nodeType: 'stageNode',
        position: { x: 100, y: 200 },
        dependencies: ['dep1'],
        timeout: 15000,
        parallelExecution: false,
        retryPolicy: {
          maxAttempts: 3,
          strategy: 'exponential',
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          enabled: true
        },
        actionNodes: [],
        configuration: { setting: 'value' },
        metadata: { version: 1 },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Act
      const result = StageNode.fromObject(obj);

      // Assert
      expect(result).toBeValidResult();
      const node = result.value;
      expect(node.nodeId.toString()).toBe('stage-id');
      expect(node.timeout).toBe(15000);
      expect(node.parallelExecution).toBe(false);
      expect(node.retryPolicy?.maxAttempts).toBe(3);
    });
  });

  describe('business rules enforcement', () => {
    it('should enforce stage naming conventions', () => {
      // Arrange & Act
      const validNames = [
        'Data Processing Stage',
        'Validation Phase',
        'Transform Step',
        'Integration Point'
      ];

      // Assert
      validNames.forEach(name => {
        const node = new StageNodeBuilder()
          .withName(name)
          .withModelId('test-model')
          .build();
        expect(node.validate()).toBeValidResult();
      });
    });

    it('should warn about performance anti-patterns', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Problematic Stage')
        .withModelId('test-model')
        .withTimeout(1000) // Very short timeout
        .withParallelExecution(false) // Sequential execution
        .build();

      // Add many actions that should be parallel
      for (let i = 0; i < 10; i++) {
        const action = new TetherNodeBuilder()
          .withParentNode(node.nodeId.toString())
          .withModelId('test-model')
          .build();
        node.addActionNode(action);
      }

      // Act
      const result = node.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.warnings).toContain('Many actions with sequential execution may impact performance');
    });

    it('should prevent circular dependencies in stage configuration', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withId('stage-id')
        .withName('Self Referencing Stage')
        .withModelId('test-model')
        .build();

      // Act - Try to add dependency to itself
      node.addDependency('stage-id');
      const result = node.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.errors).toContain('Node cannot depend on itself');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty action node arrays gracefully', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Empty Stage')
        .withModelId('test-model')
        .build();

      // Act & Assert
      expect(() => {
        node.clearActionNodes();
        node.getActionCount();
        node.calculateComplexity();
        node.estimateExecutionTime();
      }).not.toThrow();
    });

    it('should handle null/undefined retry policies', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      // Act & Assert
      expect(() => {
        node.updateRetryPolicy(undefined as any);
      }).not.toThrow();

      expect(node.retryPolicy).toBeUndefined();
    });

    it('should validate against extremely large timeout values', () => {
      // Arrange
      const node = new StageNodeBuilder()
        .withName('Test Stage')
        .withModelId('test-model')
        .build();

      // Act
      const result = node.updateTimeout(Number.MAX_SAFE_INTEGER);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Timeout value exceeds maximum allowed limit');
    });
  });
});