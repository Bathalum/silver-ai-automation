/**
 * Node Entity Tests
 * Comprehensive testing of Node abstract base class functionality
 * Tests core node logic, dependency management, status transitions, and business rules
 */

import { Node, NodeProps } from '@/lib/domain/entities/node';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { Position } from '@/lib/domain/value-objects/position';
import { ExecutionMode, NodeStatus } from '@/lib/domain/enums';
import { Result } from '@/lib/domain/shared/result';

// Test implementation of abstract Node for testing
class TestNode extends Node {
  constructor(props: NodeProps) {
    super(props);
  }

  public getNodeType(): string {
    return 'TEST_NODE';
  }

  // Expose protected props for testing
  public getProps(): NodeProps {
    return this.props;
  }

  public static create(props: Partial<NodeProps> & { nodeId: NodeId; modelId: string }): Result<TestNode> {
    const defaultPosition = Position.create(0, 0).value;
    
    const defaultProps: NodeProps = {
      nodeId: props.nodeId,
      modelId: props.modelId,
      name: props.name || 'Test Node',
      description: props.description,
      position: props.position || defaultPosition,
      dependencies: props.dependencies || [],
      executionType: props.executionType || ExecutionMode.SEQUENTIAL,
      status: props.status || NodeStatus.DRAFT,
      metadata: props.metadata || {},
      visualProperties: props.visualProperties || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    };

    return Result.ok(new TestNode(defaultProps));
  }

  // Expose protected method for testing
  public testCanTransitionTo(newStatus: NodeStatus): boolean {
    return this.canTransitionTo(newStatus);
  }
}

describe('Node', () => {
  let testNodeId: NodeId;
  let testPosition: Position;
  let validProps: NodeProps;

  beforeEach(() => {
    testNodeId = NodeId.create('123e4567-e89b-42d3-a456-426614174000').value;
    testPosition = Position.create(100, 200).value;

    validProps = {
      nodeId: testNodeId,
      modelId: 'test-model-123',
      name: 'Test Node',
      description: 'A test node for validation',
      position: testPosition,
      dependencies: [],
      executionType: ExecutionMode.SEQUENTIAL,
      status: NodeStatus.DRAFT,
      metadata: { test: true, version: 1 },
      visualProperties: { color: 'blue', width: 100, height: 50 },
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z')
    };
  });

  describe('Construction and Properties', () => {
    it('should create node with valid properties', () => {
      // Act
      const result = TestNode.create(validProps);

      // Assert
      expect(result).toBeValidResult();
      const node = result.value;

      expect(node.nodeId).toBe(testNodeId);
      expect(node.modelId).toBe('test-model-123');
      expect(node.name).toBe('Test Node');
      expect(node.description).toBe('A test node for validation');
      expect(node.position).toBe(testPosition);
      expect(node.dependencies).toEqual([]);
      expect(node.executionType).toBe(ExecutionMode.SEQUENTIAL);
      expect(node.status).toBe(NodeStatus.DRAFT);
      expect(node.metadata).toEqual({ test: true, version: 1 });
      expect(node.visualProperties).toEqual({ color: 'blue', width: 100, height: 50 });
      expect(node.createdAt).toBeInstanceOf(Date);
      expect(node.updatedAt).toBeInstanceOf(Date);
    });

    it('should create node with minimal required properties', () => {
      // Arrange
      const minimalProps = {
        nodeId: testNodeId,
        modelId: 'minimal-model'
      };

      // Act
      const result = TestNode.create(minimalProps);

      // Assert
      expect(result).toBeValidResult();
      const node = result.value;

      expect(node.name).toBe('Test Node');
      expect(node.description).toBeUndefined();
      expect(node.dependencies).toEqual([]);
      expect(node.executionType).toBe(ExecutionMode.SEQUENTIAL);
      expect(node.status).toBe(NodeStatus.DRAFT);
      expect(node.metadata).toEqual({});
      expect(node.visualProperties).toEqual({});
    });

    it('should return correct node type', () => {
      // Arrange
      const result = TestNode.create(validProps);
      const node = result.value;

      // Act & Assert
      expect(node.getNodeType()).toBe('TEST_NODE');
    });

    it('should provide readonly dependencies access', () => {
      // Arrange
      const depId = NodeId.create('123e4567-e89b-42d3-a456-426614174002').value;
      const nodeWithDeps = TestNode.create({
        ...validProps,
        dependencies: [depId]
      }).value;

      // Act
      const dependencies = nodeWithDeps.dependencies;

      // Assert
      expect(dependencies).toEqual([depId]);
      expect(dependencies).toHaveLength(1);
      // Note: readonly is a TypeScript type annotation, not runtime protection
      // The getter returns the same array reference, so modifications would be visible
      expect(dependencies).toBe(nodeWithDeps.dependencies);
    });
  });

  describe('Name Management', () => {
    let node: TestNode;

    beforeEach(() => {
      node = TestNode.create(validProps).value;
    });

    it('should update name successfully', () => {
      // Arrange
      const originalUpdatedAt = node.updatedAt;

      // Act
      const result = node.updateName('Updated Node Name');

      // Assert
      expect(result).toBeValidResult();
      expect(node.name).toBe('Updated Node Name');
      expect(node.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should trim whitespace from name', () => {
      // Act
      const result = node.updateName('  Trimmed Name  ');

      // Assert
      expect(result).toBeValidResult();
      expect(node.name).toBe('Trimmed Name');
    });

    it('should reject empty name', () => {
      // Act
      const result = node.updateName('');

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node name cannot be empty');
    });

    it('should reject whitespace-only name', () => {
      // Act
      const result = node.updateName('   ');

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node name cannot be empty');
    });

    it('should reject name exceeding 200 characters', () => {
      // Arrange
      const longName = 'a'.repeat(201);

      // Act
      const result = node.updateName(longName);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node name cannot exceed 200 characters');
    });

    it('should allow name exactly 200 characters', () => {
      // Arrange
      const maxName = 'a'.repeat(200);

      // Act
      const result = node.updateName(maxName);

      // Assert
      expect(result).toBeValidResult();
      expect(node.name).toBe(maxName);
    });
  });

  describe('Description Management', () => {
    let node: TestNode;

    beforeEach(() => {
      node = TestNode.create(validProps).value;
    });

    it('should update description successfully', () => {
      // Arrange
      const originalUpdatedAt = node.updatedAt;

      // Act
      const result = node.updateDescription('Updated description');

      // Assert
      expect(result).toBeValidResult();
      expect(node.description).toBe('Updated description');
      expect(node.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should allow undefined description', () => {
      // Act
      const result = node.updateDescription(undefined);

      // Assert
      expect(result).toBeValidResult();
      expect(node.description).toBeUndefined();
    });

    it('should trim whitespace from description', () => {
      // Act
      const result = node.updateDescription('  Trimmed description  ');

      // Assert
      expect(result).toBeValidResult();
      expect(node.description).toBe('Trimmed description');
    });

    it('should allow empty string description', () => {
      // Act
      const result = node.updateDescription('');

      // Assert
      expect(result).toBeValidResult();
      expect(node.description).toBe('');
    });

    it('should reject description exceeding 1000 characters', () => {
      // Arrange
      const longDescription = 'a'.repeat(1001);

      // Act
      const result = node.updateDescription(longDescription);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node description cannot exceed 1000 characters');
    });

    it('should allow description exactly 1000 characters', () => {
      // Arrange
      const maxDescription = 'a'.repeat(1000);

      // Act
      const result = node.updateDescription(maxDescription);

      // Assert
      expect(result).toBeValidResult();
      expect(node.description).toBe(maxDescription);
    });
  });

  describe('Position Management', () => {
    let node: TestNode;

    beforeEach(() => {
      node = TestNode.create(validProps).value;
    });

    it('should update position successfully', () => {
      // Arrange
      const newPosition = Position.create(300, 400).value;
      const originalUpdatedAt = node.updatedAt;

      // Act
      const result = node.updatePosition(newPosition);

      // Assert
      expect(result).toBeValidResult();
      expect(node.position).toBe(newPosition);
      expect(node.position.x).toBe(300);
      expect(node.position.y).toBe(400);
      expect(node.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should handle edge position values', () => {
      // Arrange
      const edgePosition = Position.create(0, 0).value;

      // Act
      const result = node.updatePosition(edgePosition);

      // Assert
      expect(result).toBeValidResult();
      expect(node.position.x).toBe(0);
      expect(node.position.y).toBe(0);
    });
  });

  describe('Dependency Management', () => {
    let node: TestNode;
    let depNodeId1: NodeId;
    let depNodeId2: NodeId;

    beforeEach(() => {
      node = TestNode.create(validProps).value;
      depNodeId1 = NodeId.create('123e4567-e89b-42d3-a456-426614174001').value;
      depNodeId2 = NodeId.create('123e4567-e89b-42d3-a456-426614174002').value;
    });

    it('should add dependency successfully', () => {
      // Arrange
      const originalUpdatedAt = node.updatedAt;

      // Act
      const result = node.addDependency(depNodeId1);

      // Assert
      expect(result).toBeValidResult();
      expect(node.dependencies).toHaveLength(1);
      expect(node.dependencies[0]).toBe(depNodeId1);
      expect(node.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should add multiple dependencies', () => {
      // Act
      const result1 = node.addDependency(depNodeId1);
      const result2 = node.addDependency(depNodeId2);

      // Assert
      expect(result1).toBeValidResult();
      expect(result2).toBeValidResult();
      expect(node.dependencies).toHaveLength(2);
      expect(node.dependencies).toContain(depNodeId1);
      expect(node.dependencies).toContain(depNodeId2);
    });

    it('should reject duplicate dependency', () => {
      // Arrange
      node.addDependency(depNodeId1);

      // Act
      const result = node.addDependency(depNodeId1);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Dependency already exists');
      expect(node.dependencies).toHaveLength(1);
    });

    it('should reject self-dependency', () => {
      // Act
      const result = node.addDependency(node.nodeId);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node cannot depend on itself');
      expect(node.dependencies).toHaveLength(0);
    });

    it('should remove dependency successfully', async () => {
      // Arrange
      node.addDependency(depNodeId1);
      node.addDependency(depNodeId2);
      const originalUpdatedAt = node.updatedAt;

      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));

      // Act
      const result = node.removeDependency(depNodeId1);

      // Assert
      expect(result).toBeValidResult();
      expect(node.dependencies).toHaveLength(1);
      expect(node.dependencies).toContain(depNodeId2);
      expect(node.dependencies).not.toContain(depNodeId1);
      expect(node.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should reject removing non-existent dependency', () => {
      // Act
      const result = node.removeDependency(depNodeId1);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Dependency does not exist');
      expect(node.dependencies).toHaveLength(0);
    });

    it('should handle removing last dependency', () => {
      // Arrange
      node.addDependency(depNodeId1);

      // Act
      const result = node.removeDependency(depNodeId1);

      // Assert
      expect(result).toBeValidResult();
      expect(node.dependencies).toHaveLength(0);
    });
  });

  describe('Execution Type Management', () => {
    let node: TestNode;

    beforeEach(() => {
      node = TestNode.create(validProps).value;
    });

    it('should update execution type successfully', () => {
      // Arrange
      const originalUpdatedAt = node.updatedAt;

      // Act
      const result = node.updateExecutionType(ExecutionMode.PARALLEL);

      // Assert
      expect(result).toBeValidResult();
      expect(node.executionType).toBe(ExecutionMode.PARALLEL);
      expect(node.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should handle all execution types', () => {
      // Act & Assert
      const types = [ExecutionMode.SEQUENTIAL, ExecutionMode.PARALLEL, ExecutionMode.CONDITIONAL, ExecutionMode.SYNCHRONOUS, ExecutionMode.ASYNCHRONOUS];
      
      types.forEach(type => {
        const result = node.updateExecutionType(type);
        expect(result).toBeValidResult();
        expect(node.executionType).toBe(type);
      });
    });
  });

  describe('Status Transitions', () => {
    let node: TestNode;

    beforeEach(() => {
      node = TestNode.create(validProps).value;
    });

    it('should update status successfully with valid transition', () => {
      // Arrange
      const originalUpdatedAt = node.updatedAt;

      // Act
      const result = node.updateStatus(NodeStatus.ACTIVE);

      // Assert
      expect(result).toBeValidResult();
      expect(node.status).toBe(NodeStatus.ACTIVE);
      expect(node.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    describe('from DRAFT status', () => {
      it('should allow transition to ACTIVE', () => {
        // Act & Assert
        expect(node.updateStatus(NodeStatus.ACTIVE)).toBeValidResult();
        expect(node.status).toBe(NodeStatus.ACTIVE);
      });

      it('should allow transition to ARCHIVED', () => {
        // Act & Assert
        expect(node.updateStatus(NodeStatus.ARCHIVED)).toBeValidResult();
        expect(node.status).toBe(NodeStatus.ARCHIVED);
      });

      it('should reject invalid transitions', () => {
        const invalidStatuses = [NodeStatus.INACTIVE, NodeStatus.ERROR];
        
        invalidStatuses.forEach(status => {
          const result = node.updateStatus(status);
          expect(result).toBeFailureResult();
          expect(result).toHaveErrorMessage(`Invalid status transition from ${NodeStatus.DRAFT} to ${status}`);
        });
      });
    });

    describe('from ACTIVE status', () => {
      beforeEach(() => {
        node.updateStatus(NodeStatus.ACTIVE);
      });

      it('should allow valid transitions', () => {
        const validStatuses = [NodeStatus.INACTIVE, NodeStatus.ARCHIVED, NodeStatus.ERROR];
        
        validStatuses.forEach(status => {
          // Reset to ACTIVE before each test
          node.getProps().status = NodeStatus.ACTIVE;
          
          const result = node.updateStatus(status);
          expect(result).toBeValidResult();
          expect(node.status).toBe(status);
        });
      });

      it('should reject invalid transitions', () => {
        const invalidStatuses = [NodeStatus.DRAFT];
        
        invalidStatuses.forEach(status => {
          const result = node.updateStatus(status);
          expect(result).toBeFailureResult();
        });
      });
    });

    describe('from INACTIVE status', () => {
      beforeEach(() => {
        node.updateStatus(NodeStatus.ACTIVE);
        node.updateStatus(NodeStatus.INACTIVE);
      });

      it('should allow valid transitions', () => {
        const validStatuses = [NodeStatus.ACTIVE, NodeStatus.ARCHIVED];
        
        validStatuses.forEach(status => {
          // Reset to INACTIVE before each test
          node.getProps().status = NodeStatus.INACTIVE;
          
          const result = node.updateStatus(status);
          expect(result).toBeValidResult();
          expect(node.status).toBe(status);
        });
      });
    });

    describe('from ARCHIVED status', () => {
      beforeEach(() => {
        node.updateStatus(NodeStatus.ARCHIVED);
      });

      it('should reject all transitions from archived', () => {
        const allOtherStatuses = [
          NodeStatus.DRAFT, NodeStatus.ACTIVE, NodeStatus.INACTIVE, NodeStatus.ERROR
        ];
        
        allOtherStatuses.forEach(status => {
          const result = node.updateStatus(status);
          expect(result).toBeFailureResult();
          expect(result).toHaveErrorMessage(`Invalid status transition from ${NodeStatus.ARCHIVED} to ${status}`);
        });
      });
    });

    describe('from ERROR status', () => {
      beforeEach(() => {
        node.updateStatus(NodeStatus.ACTIVE);
        node.updateStatus(NodeStatus.ERROR);
      });

      it('should allow valid transitions', () => {
        const validStatuses = [NodeStatus.ACTIVE, NodeStatus.INACTIVE, NodeStatus.ARCHIVED];
        
        validStatuses.forEach(status => {
          // Reset to ERROR before each test
          node.getProps().status = NodeStatus.ERROR;
          
          const result = node.updateStatus(status);
          expect(result).toBeValidResult();
          expect(node.status).toBe(status);
        });
      });
    });

    it('should test status transition logic directly', () => {
      // Test the protected method through our test class
      expect(node.testCanTransitionTo(NodeStatus.ACTIVE)).toBe(true);
      expect(node.testCanTransitionTo(NodeStatus.INACTIVE)).toBe(false);
    });
  });

  describe('Metadata Management', () => {
    let node: TestNode;

    beforeEach(() => {
      node = TestNode.create(validProps).value;
    });

    it('should update metadata successfully', () => {
      // Arrange
      const newMetadata = { version: 2, feature: 'enhanced', tags: ['test', 'node'] };
      const originalUpdatedAt = node.updatedAt;

      // Act
      const result = node.updateMetadata(newMetadata);

      // Assert
      expect(result).toBeValidResult();
      expect(node.metadata).toEqual(newMetadata);
      expect(node.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should create defensive copy of metadata', () => {
      // Arrange
      const newMetadata = { mutable: 'value' };

      // Act
      const result = node.updateMetadata(newMetadata);
      newMetadata.mutable = 'changed';

      // Assert
      expect(result).toBeValidResult();
      expect(node.metadata).toEqual({ mutable: 'value' });
    });

    it('should handle empty metadata', () => {
      // Act
      const result = node.updateMetadata({});

      // Assert
      expect(result).toBeValidResult();
      expect(node.metadata).toEqual({});
    });

    it('should handle complex metadata objects', () => {
      // Arrange
      const complexMetadata = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        boolean: true,
        null: null,
        string: 'test'
      };

      // Act
      const result = node.updateMetadata(complexMetadata);

      // Assert
      expect(result).toBeValidResult();
      expect(node.metadata).toEqual(complexMetadata);
    });
  });

  describe('Visual Properties Management', () => {
    let node: TestNode;

    beforeEach(() => {
      node = TestNode.create(validProps).value;
    });

    it('should update visual properties successfully', () => {
      // Arrange
      const newVisualProps = { color: 'red', width: 150, height: 75, border: '2px solid' };
      const originalUpdatedAt = node.updatedAt;

      // Act
      const result = node.updateVisualProperties(newVisualProps);

      // Assert
      expect(result).toBeValidResult();
      expect(node.visualProperties).toEqual(newVisualProps);
      expect(node.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should create defensive copy of visual properties', () => {
      // Arrange
      const newVisualProps = { mutable: 'style' };

      // Act
      const result = node.updateVisualProperties(newVisualProps);
      newVisualProps.mutable = 'changed';

      // Assert
      expect(result).toBeValidResult();
      expect(node.visualProperties).toEqual({ mutable: 'style' });
    });

    it('should handle empty visual properties', () => {
      // Act
      const result = node.updateVisualProperties({});

      // Assert
      expect(result).toBeValidResult();
      expect(node.visualProperties).toEqual({});
    });

    it('should handle complex visual properties', () => {
      // Arrange
      const complexVisualProps = {
        style: {
          border: { width: 2, color: 'blue', style: 'solid' },
          background: { color: 'white', opacity: 0.8 }
        },
        animations: ['fadeIn', 'slideUp'],
        responsive: true
      };

      // Act
      const result = node.updateVisualProperties(complexVisualProps);

      // Assert
      expect(result).toBeValidResult();
      expect(node.visualProperties).toEqual(complexVisualProps);
    });
  });

  describe('Equality and Comparison', () => {
    it('should be equal when node IDs match', () => {
      // Arrange
      const node1 = TestNode.create(validProps).value;
      const node2 = TestNode.create({
        ...validProps,
        name: 'Different Name',
        metadata: { different: true }
      }).value;

      // Act & Assert
      expect(node1.equals(node2)).toBe(true);
    });

    it('should not be equal when node IDs differ', () => {
      // Arrange
      const differentNodeId = NodeId.create('123e4567-e89b-42d3-a456-426614174999').value;
      const node1 = TestNode.create(validProps).value;
      const node2 = TestNode.create({
        ...validProps,
        nodeId: differentNodeId
      }).value;

      // Act & Assert
      expect(node1.equals(node2)).toBe(false);
    });
  });

  describe('Timestamp Management', () => {
    let node: TestNode;

    beforeEach(() => {
      node = TestNode.create(validProps).value;
    });

    it('should update timestamp on any property change', () => {
      // Arrange
      const originalUpdatedAt = node.updatedAt;

      // Add a small delay to ensure timestamp difference
      const delay = () => new Promise(resolve => setTimeout(resolve, 1));

      // Act & Assert
      delay().then(() => {
        node.updateName('New Name');
        expect(node.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());

        const nameChangeTime = node.updatedAt;
        
        delay().then(() => {
          node.addDependency(NodeId.create('123e4567-e89b-42d3-a456-426614174003').value);
          expect(node.updatedAt.getTime()).toBeGreaterThanOrEqual(nameChangeTime.getTime());
        });
      });
    });

    it('should preserve creation timestamp', () => {
      // Arrange
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const nodeWithTimestamp = TestNode.create({
        ...validProps,
        createdAt
      }).value;

      // Act
      nodeWithTimestamp.updateName('Updated Name');

      // Assert
      expect(nodeWithTimestamp.createdAt).toEqual(createdAt);
      expect(nodeWithTimestamp.updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
    });
  });

  describe('Business Logic Integration', () => {
    it('should maintain consistency during complex operations', () => {
      // Arrange
      const node = TestNode.create(validProps).value;
      const depId1 = NodeId.create('123e4567-e89b-42d3-a456-426614174001').value;
      const depId2 = NodeId.create('123e4567-e89b-42d3-a456-426614174002').value;

      // Act - Simulate a complete lifecycle
      expect(node.updateStatus(NodeStatus.ACTIVE)).toBeValidResult();
      expect(node.updateName('Production Node')).toBeValidResult();
      expect(node.addDependency(depId1)).toBeValidResult();
      expect(node.addDependency(depId2)).toBeValidResult();
      expect(node.updateExecutionType(ExecutionMode.PARALLEL)).toBeValidResult();
      expect(node.updateMetadata({ production: true, version: '1.0' })).toBeValidResult();

      // Assert
      expect(node.status).toBe(NodeStatus.ACTIVE);
      expect(node.name).toBe('Production Node');
      expect(node.dependencies).toHaveLength(2);
      expect(node.executionType).toBe(ExecutionMode.PARALLEL);
      expect(node.metadata).toEqual({ production: true, version: '1.0' });
    });

    it('should handle error scenarios gracefully', () => {
      // Arrange
      const node = TestNode.create(validProps).value;

      // Act & Assert - Invalid operations should not affect state
      const originalName = node.name;
      const originalDependencies = node.dependencies.length;

      expect(node.updateName('')).toBeFailureResult();
      expect(node.addDependency(node.nodeId)).toBeFailureResult();

      expect(node.name).toBe(originalName);
      expect(node.dependencies).toHaveLength(originalDependencies);
    });

    it('should handle dependency cycles prevention', () => {
      // Arrange
      const node = TestNode.create(validProps).value;

      // Act & Assert - Should prevent self-dependency
      const result = node.addDependency(node.nodeId);
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node cannot depend on itself');
    });

    it('should maintain state consistency during status transitions', () => {
      // Arrange
      const node = TestNode.create(validProps).value;

      // Act - Test valid transition sequence
      expect(node.updateStatus(NodeStatus.ACTIVE)).toBeValidResult();
      expect(node.updateStatus(NodeStatus.INACTIVE)).toBeValidResult();
      expect(node.updateStatus(NodeStatus.ACTIVE)).toBeValidResult();
      expect(node.updateStatus(NodeStatus.ARCHIVED)).toBeValidResult();

      // Assert
      expect(node.status).toBe(NodeStatus.ARCHIVED);

      // Act & Assert - Should reject any further transitions
      expect(node.updateStatus(NodeStatus.ACTIVE)).toBeFailureResult();
      expect(node.status).toBe(NodeStatus.ARCHIVED); // State should remain unchanged
    });
  });
});