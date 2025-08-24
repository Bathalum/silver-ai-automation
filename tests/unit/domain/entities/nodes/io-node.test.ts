/**
 * Unit tests for IONode entity
 * Tests Input/Output node business logic and validation
 */

import { IONode } from '@/lib/domain/entities/io-node';
import { ContainerNodeType, IOType } from '@/lib/domain/enums';
import { IONodeBuilder, TestData } from '../../../../utils/test-fixtures';
import { ResultTestHelpers, UuidTestHelpers } from '../../../../utils/test-helpers';

describe('IONode', () => {
  beforeEach(() => {
    UuidTestHelpers.resetCounter();
    jest.clearAllMocks();
  });

  describe('creation', () => {
    it('should create input node with valid properties', () => {
      // Act
      const node = new IONodeBuilder()
        .withName('Input Node')
        .withModelId('test-model')
        .asInput()
        .build();

      // Assert
      expect(node.nodeId).toBeDefined();
      expect(node.name).toBe('Input Node');
      expect(node.modelId).toBe('test-model');
      expect(node.ioType).toBe(IOType.INPUT);
      expect(node.nodeType).toBe('ioNode');
      expect(node.position).toBeDefined();
      expect(node.createdAt).toBeInstanceOf(Date);
      expect(node.updatedAt).toBeInstanceOf(Date);
    });

    it('should create output node with valid properties', () => {
      // Act
      const node = new IONodeBuilder()
        .withName('Output Node')
        .withModelId('test-model')
        .asOutput()
        .build();

      // Assert
      expect(node.ioType).toBe(IOType.OUTPUT);
      expect(node.nodeType).toBe('ioNode');
    });

    it('should create node with custom properties', () => {
      // Act
      const customId = crypto.randomUUID();
      const node = new IONodeBuilder()
        .withId(customId)
        .withName('Custom Node')
        .withModelId('test-model')
        .withDescription('Custom description')
        .withPosition(100, 200)
        .asInput()
        .withMetadata({ custom: 'data' })
        .build();

      // Assert
      expect(node.nodeId.toString()).toBe(customId);
      expect(node.description).toBe('Custom description');
      expect(node.position.x).toBe(100);
      expect(node.position.y).toBe(200);
      expect(node.metadata).toEqual({ custom: 'data' });
    });
  });

  describe('validation', () => {
    it('should validate successful input node', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Valid Input')
        .withModelId('test-model')
        .asInput()
        .build();

      // Act
      const result = node.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(true);
      expect(result.value.errors).toHaveLength(0);
    });

    it('should validate successful output node', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Valid Output')
        .withModelId('test-model')
        .asOutput()
        .build();

      // Act
      const result = node.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(true);
      expect(result.value.errors).toHaveLength(0);
    });

    it('should detect invalid node name', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('') // Empty name
        .withModelId('test-model')
        .asInput()
        .build();

      // Act
      const result = node.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Node name cannot be empty');
    });

    it('should detect missing model ID', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Test Node')
        .withModelId('') // Empty model ID
        .asInput()
        .build();

      // Act
      const result = node.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Node must belong to a model');
    });

    it('should warn about nodes without descriptions', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Node Without Description')
        .withModelId('test-model')
        .withoutDescription()
        .asInput()
        .build();

      // Act
      const result = node.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.warnings).toContain('Node should have a description for better documentation');
    });
  });

  describe('IO type specific validation', () => {
    it('should validate input nodes cannot have circular dependencies', () => {
      // Arrange
      const inputNode = new IONodeBuilder()
        .withId('123e4567-e89b-42d3-a456-426614174001')
        .withName('Input Node')
        .withModelId('test-model')
        .asInput()
        .build();

      // Act - Try to add dependency to a different node (not self-reference)
      const addResult = inputNode.addDependency('223e4567-e89b-42d3-a456-426614174002');
      expect(addResult.isSuccess).toBe(true); // Dependency should be added successfully
      const result = inputNode.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Input nodes should not have dependencies on other nodes');
    });

    it('should validate output nodes must have at least one dependency', () => {
      // Arrange
      const outputNode = new IONodeBuilder()
        .withName('Output Node')
        .withModelId('test-model')
        .asOutput()
        .build();

      // Act
      const result = outputNode.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.warnings).toContain('Output nodes should have at least one dependency');
    });

    it('should allow output nodes with valid dependencies', () => {
      // Arrange
      const outputNode = new IONodeBuilder()
        .withName('Output Node')
        .withModelId('test-model')
        .asOutput()
        .build();

      outputNode.addDependency('input-node-id');

      // Act
      const result = outputNode.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(true);
    });
  });

  describe('dependency management', () => {
    it('should add dependencies successfully', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Test Node')
        .withModelId('test-model')
        .asOutput()
        .build();

      // Act
      const dependencyId = crypto.randomUUID();
      const result = node.addDependency(dependencyId);

      // Assert
      expect(result).toBeValidResult();
      expect(node.dependencies.some(dep => dep.toString() === dependencyId)).toBe(true);
    });

    it('should prevent duplicate dependencies', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Test Node')
        .withModelId('test-model')
        .asOutput()
        .build();

      const dependencyId = crypto.randomUUID();
      node.addDependency(dependencyId);

      // Act
      const result = node.addDependency(dependencyId);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Dependency already exists');
    });

    it('should remove dependencies successfully', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Test Node')
        .withModelId('test-model')
        .asOutput()
        .build();

      const dependencyId = crypto.randomUUID();
      node.addDependency(dependencyId);
      expect(node.dependencies.some(dep => dep.toString() === dependencyId)).toBe(true);

      // Act
      const result = node.removeDependency(dependencyId);

      // Assert
      expect(result).toBeValidResult();
      expect(node.dependencies.some(dep => dep.toString() === dependencyId)).toBe(false);
    });

    it('should handle removing non-existent dependency', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Test Node')
        .withModelId('test-model')
        .asOutput()
        .build();

      // Act
      const nonExistentId = crypto.randomUUID();
      const result = node.removeDependency(nonExistentId);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Dependency does not exist');
    });
  });

  describe('configuration management', () => {
    it('should update configuration successfully', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Test Node')
        .withModelId('test-model')
        .asInput()
        .build();

      const newConfig = {
        dataFormat: 'json',
        encoding: 'utf-8',
        validation: true
      };

      // Act
      const result = node.updateConfiguration(newConfig);

      // Assert
      expect(result).toBeValidResult();
      expect(node.configuration).toEqual(newConfig);
    });

    it('should validate configuration changes', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Test Node')
        .withModelId('test-model')
        .asInput()
        .build();

      const invalidConfig = {
        dataFormat: '', // Empty format
        maxSize: -1     // Invalid size
      };

      // Act
      const result = node.updateConfiguration(invalidConfig);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Invalid configuration: dataFormat cannot be empty');
    });
  });

  describe('position and layout', () => {
    it('should update position successfully', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Test Node')
        .withModelId('test-model')
        .asInput()
        .build();

      // Act
      const result = node.updatePosition(150, 250);

      // Assert
      expect(result).toBeValidResult();
      expect(node.position.x).toBe(150);
      expect(node.position.y).toBe(250);
    });

    it('should validate position boundaries', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Test Node')
        .withModelId('test-model')
        .asInput()
        .build();

      // Act - Try to set negative position
      const result = node.updatePosition(-10, -20);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Position coordinates must be non-negative');
    });

    it('should enforce maximum position limits', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Test Node')
        .withModelId('test-model')
        .asInput()
        .build();

      // Act - Try to set position beyond limits
      const result = node.updatePosition(100000, 100000);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Position exceeds maximum canvas boundaries');
    });
  });

  describe('equality and identity', () => {
    it('should be equal when node IDs match', () => {
      // Arrange
      const nodeId = '123e4567-e89b-42d3-a456-426614174001';
      const node1 = new IONodeBuilder().withId(nodeId).withModelId('test').asInput().build();
      const node2 = new IONodeBuilder().withId(nodeId).withModelId('test').asInput().build();

      // Act & Assert
      expect(node1.equals(node2)).toBe(true);
    });

    it('should not be equal when node IDs differ', () => {
      // Arrange
      const node1 = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174001').withModelId('test').asInput().build();
      const node2 = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174002').withModelId('test').asInput().build();

      // Act & Assert
      expect(node1.equals(node2)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to object representation', () => {
      // Arrange
      const testId = crypto.randomUUID();
      const node = new IONodeBuilder()
        .withId(testId)
        .withName('Test Node')
        .withModelId('test-model')
        .withDescription('Test description')
        .withPosition(100, 200)
        .asInput()
        .build();

      // Act
      const obj = node.toObject();

      // Assert
      expect(obj).toEqual({
        nodeId: testId,
        name: 'Test Node',
        modelId: 'test-model',
        description: 'Test description',
        nodeType: 'ioNode',
        ioType: IOType.INPUT,
        position: { x: 100, y: 200 },
        dependencies: [],
        configuration: {},
        metadata: {},
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should create from object representation', () => {
      // Arrange
      const testId = crypto.randomUUID();
      const depId = crypto.randomUUID();
      const obj = {
        nodeId: testId,
        name: 'Test Node',
        modelId: 'test-model',
        description: 'Test description',
        nodeType: 'ioNode',
        ioType: IOType.OUTPUT,
        position: { x: 150, y: 250 },
        dependencies: [depId],
        configuration: { format: 'json' },
        metadata: { version: 1 },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Act
      const result = IONode.fromObject(obj);

      // Assert
      expect(result).toBeValidResult();
      const node = result.value;
      expect(node.nodeId.toString()).toBe(testId);
      expect(node.name).toBe('Test Node');
      expect(node.ioType).toBe(IOType.OUTPUT);
      expect(node.dependencies.map(d => d.toString())).toContain(depId);
    });
  });

  describe('business rules enforcement', () => {
    it('should enforce input node business rules', () => {
      // Arrange
      const inputNode = new IONodeBuilder()
        .withName('Input Node')
        .withModelId('test-model')
        .asInput()
        .build();

      // Act - Input nodes should not accept dependencies
      const addResult = inputNode.addDependency('223e4567-e89b-42d3-a456-426614174002');
      expect(addResult.isSuccess).toBe(true); // Dependency should be added successfully
      const result = inputNode.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.errors).toContain('Input nodes should not have dependencies on other nodes');
    });

    it('should enforce output node business rules', () => {
      // Arrange
      const outputNode = new IONodeBuilder()
        .withName('Output Node')
        .withModelId('test-model')
        .asOutput()
        .build();

      // Act
      const result = outputNode.validate();

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.warnings).toContain('Output nodes should have at least one dependency');
    });

    it('should prevent modification of immutable properties', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Test Node')
        .withModelId('test-model')
        .asInput()
        .build();

      // Act & Assert - These should not be directly modifiable
      expect(() => {
        (node as any).nodeId = 'new-id';
      }).toThrow();

      expect(() => {
        (node as any).nodeType = 'different-type';
      }).toThrow();

      expect(() => {
        (node as any).createdAt = new Date();
      }).toThrow();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty dependency arrays', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Test Node')
        .withModelId('test-model')
        .asInput()
        .build();

      // Act & Assert - Should not throw
      expect(node.dependencies).toEqual([]);
      expect(() => node.validate()).not.toThrow();
    });

    it('should handle large configuration objects', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withName('Test Node')
        .withModelId('test-model')
        .asInput()
        .build();

      const largeConfig = {};
      for (let i = 0; i < 1000; i++) {
        largeConfig[`key${i}`] = `value${i}`;
      }

      // Act
      const result = node.updateConfiguration(largeConfig);

      // Assert
      expect(result).toBeValidResult();
      expect(Object.keys(node.configuration)).toHaveLength(1000);
    });

    it('should handle unicode in node names', () => {
      // Arrange & Act
      const node = new IONodeBuilder()
        .withName('测试节点 🔥')
        .withModelId('test-model')
        .asInput()
        .build();

      // Assert
      expect(node.name).toBe('测试节点 🔥');
      expect(node.validate()).toBeValidResult();
    });
  });
});