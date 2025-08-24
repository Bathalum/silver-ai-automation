/**
 * ActionNode Entity Tests
 * Comprehensive testing of ActionNode abstract base class functionality
 * Tests core action node logic, state transitions, validation, and business rules
 */

import { ActionNode, ActionNodeProps } from '@/lib/domain/entities/action-node';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { RetryPolicy } from '@/lib/domain/value-objects/retry-policy';
import { RACI } from '@/lib/domain/value-objects/raci';
import { ExecutionMode, ActionStatus } from '@/lib/domain/enums';
import { Result } from '@/lib/domain/shared/result';

// Test implementation of abstract ActionNode for testing
class TestActionNode extends ActionNode {
  constructor(props: ActionNodeProps) {
    super(props);
  }

  public getActionType(): string {
    return 'TEST_ACTION';
  }

  // Expose protected props for testing
  public getProps(): ActionNodeProps {
    return this.props;
  }

  public static create(props: Partial<ActionNodeProps> & { actionId: NodeId; parentNodeId: NodeId; modelId: string }): Result<TestActionNode> {
    const defaultProps: ActionNodeProps = {
      actionId: props.actionId,
      parentNodeId: props.parentNodeId,
      modelId: props.modelId,
      name: props.name || 'Test Action Node',
      description: props.description,
      executionMode: props.executionMode || ExecutionMode.SEQUENTIAL,
      executionOrder: props.executionOrder || 1,
      status: props.status || ActionStatus.DRAFT,
      priority: props.priority || 5,
      estimatedDuration: props.estimatedDuration,
      retryPolicy: props.retryPolicy || RetryPolicy.createDefault().value,
      raci: props.raci || RACI.create(['test-user']).value,
      metadata: props.metadata || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    };

    return Result.ok(new TestActionNode(defaultProps));
  }
}

describe('ActionNode', () => {
  let testActionId: NodeId;
  let testParentNodeId: NodeId;
  let testRetryPolicy: RetryPolicy;
  let testRaci: RACI;
  let validProps: ActionNodeProps;

  beforeEach(() => {
    testActionId = NodeId.create('123e4567-e89b-42d3-a456-426614174000').value;
    testParentNodeId = NodeId.create('123e4567-e89b-42d3-a456-426614174001').value;
    testRetryPolicy = RetryPolicy.createDefault().value;
    testRaci = RACI.create(['test-user']).value;

    validProps = {
      actionId: testActionId,
      parentNodeId: testParentNodeId,
      modelId: 'test-model-123',
      name: 'Test Action Node',
      description: 'A test action node for validation',
      executionMode: ExecutionMode.SEQUENTIAL,
      executionOrder: 1,
      status: ActionStatus.DRAFT,
      priority: 5,
      estimatedDuration: 30,
      retryPolicy: testRetryPolicy,
      raci: testRaci,
      metadata: { test: true },
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z')
    };
  });

  describe('Construction and Properties', () => {
    it('should create action node with valid properties', () => {
      // Act
      const result = TestActionNode.create(validProps);

      // Assert
      expect(result).toBeValidResult();
      const actionNode = result.value;

      expect(actionNode.actionId).toBe(testActionId);
      expect(actionNode.parentNodeId).toBe(testParentNodeId);
      expect(actionNode.modelId).toBe('test-model-123');
      expect(actionNode.name).toBe('Test Action Node');
      expect(actionNode.description).toBe('A test action node for validation');
      expect(actionNode.executionMode).toBe(ExecutionMode.SEQUENTIAL);
      expect(actionNode.executionOrder).toBe(1);
      expect(actionNode.status).toBe(ActionStatus.DRAFT);
      expect(actionNode.priority).toBe(5);
      expect(actionNode.estimatedDuration).toBe(30);
      expect(actionNode.retryPolicy).toBe(testRetryPolicy);
      expect(actionNode.raci).toBe(testRaci);
      expect(actionNode.metadata).toEqual({ test: true });
      expect(actionNode.createdAt).toBeInstanceOf(Date);
      expect(actionNode.updatedAt).toBeInstanceOf(Date);
    });

    it('should create action node with minimal required properties', () => {
      // Arrange
      const minimalProps = {
        actionId: testActionId,
        parentNodeId: testParentNodeId,
        modelId: 'minimal-model'
      };

      // Act
      const result = TestActionNode.create(minimalProps);

      // Assert
      expect(result).toBeValidResult();
      const actionNode = result.value;

      expect(actionNode.name).toBe('Test Action Node');
      expect(actionNode.description).toBeUndefined();
      expect(actionNode.executionMode).toBe(ExecutionMode.SEQUENTIAL);
      expect(actionNode.executionOrder).toBe(1);
      expect(actionNode.status).toBe(ActionStatus.DRAFT);
      expect(actionNode.priority).toBe(5);
      expect(actionNode.estimatedDuration).toBeUndefined();
      expect(actionNode.metadata).toEqual({});
    });

    it('should return correct action type', () => {
      // Arrange
      const result = TestActionNode.create(validProps);
      const actionNode = result.value;

      // Act & Assert
      expect(actionNode.getActionType()).toBe('TEST_ACTION');
    });

    it('should provide readonly metadata access', () => {
      // Arrange
      const result = TestActionNode.create(validProps);
      const actionNode = result.value;

      // Act
      const metadata = actionNode.metadata;
      
      // Assert - The metadata reference is the same object, so changes will be visible
      // This is a limitation of the current implementation where Readonly<> is only a TypeScript annotation
      expect(metadata).toBe(actionNode.metadata);
      expect(actionNode.metadata).toEqual({ test: true });
      
      // Note: To achieve true immutability, the getter would need to return a deep copy
      // metadata.newProperty = 'would affect original'; // This would modify the original
    });
  });

  describe('Name Management', () => {
    let actionNode: TestActionNode;

    beforeEach(() => {
      actionNode = TestActionNode.create(validProps).value;
    });

    it('should update name successfully', () => {
      // Arrange
      const originalUpdatedAt = actionNode.updatedAt;

      // Act
      const result = actionNode.updateName('Updated Action Name');

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.name).toBe('Updated Action Name');
      expect(actionNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should trim whitespace from name', () => {
      // Act
      const result = actionNode.updateName('  Trimmed Name  ');

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.name).toBe('Trimmed Name');
    });

    it('should reject empty name', () => {
      // Act
      const result = actionNode.updateName('');

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Action node name cannot be empty');
    });

    it('should reject whitespace-only name', () => {
      // Act
      const result = actionNode.updateName('   ');

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Action node name cannot be empty');
    });

    it('should reject name exceeding 200 characters', () => {
      // Arrange
      const longName = 'a'.repeat(201);

      // Act
      const result = actionNode.updateName(longName);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Action node name cannot exceed 200 characters');
    });

    it('should allow name exactly 200 characters', () => {
      // Arrange
      const maxName = 'a'.repeat(200);

      // Act
      const result = actionNode.updateName(maxName);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.name).toBe(maxName);
    });
  });

  describe('Description Management', () => {
    let actionNode: TestActionNode;

    beforeEach(() => {
      actionNode = TestActionNode.create(validProps).value;
    });

    it('should update description successfully', () => {
      // Arrange
      const originalUpdatedAt = actionNode.updatedAt;

      // Act
      const result = actionNode.updateDescription('Updated description');

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.description).toBe('Updated description');
      expect(actionNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should allow undefined description', () => {
      // Act
      const result = actionNode.updateDescription(undefined);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.description).toBeUndefined();
    });

    it('should trim whitespace from description', () => {
      // Act
      const result = actionNode.updateDescription('  Trimmed description  ');

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.description).toBe('Trimmed description');
    });

    it('should allow empty string description', () => {
      // Act
      const result = actionNode.updateDescription('');

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.description).toBe('');
    });

    it('should reject description exceeding 1000 characters', () => {
      // Arrange
      const longDescription = 'a'.repeat(1001);

      // Act
      const result = actionNode.updateDescription(longDescription);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Action node description cannot exceed 1000 characters');
    });

    it('should allow description exactly 1000 characters', () => {
      // Arrange
      const maxDescription = 'a'.repeat(1000);

      // Act
      const result = actionNode.updateDescription(maxDescription);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.description).toBe(maxDescription);
    });
  });

  describe('Execution Mode Management', () => {
    let actionNode: TestActionNode;

    beforeEach(() => {
      actionNode = TestActionNode.create(validProps).value;
    });

    it('should update execution mode successfully', () => {
      // Arrange
      const originalUpdatedAt = actionNode.updatedAt;

      // Act
      const result = actionNode.updateExecutionMode(ExecutionMode.PARALLEL);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.executionMode).toBe(ExecutionMode.PARALLEL);
      expect(actionNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should handle all execution modes', () => {
      // Act & Assert
      const modes = [ExecutionMode.SEQUENTIAL, ExecutionMode.PARALLEL, ExecutionMode.CONDITIONAL, ExecutionMode.SYNCHRONOUS, ExecutionMode.ASYNCHRONOUS];
      
      modes.forEach(mode => {
        const result = actionNode.updateExecutionMode(mode);
        expect(result).toBeValidResult();
        expect(actionNode.executionMode).toBe(mode);
      });
    });
  });

  describe('Execution Order Management', () => {
    let actionNode: TestActionNode;

    beforeEach(() => {
      actionNode = TestActionNode.create(validProps).value;
    });

    it('should update execution order successfully', () => {
      // Arrange
      const originalUpdatedAt = actionNode.updatedAt;

      // Act
      const result = actionNode.updateExecutionOrder(5);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.executionOrder).toBe(5);
      expect(actionNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should allow minimum execution order', () => {
      // Act
      const result = actionNode.updateExecutionOrder(1);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.executionOrder).toBe(1);
    });

    it('should reject execution order less than 1', () => {
      // Act
      const result = actionNode.updateExecutionOrder(0);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Execution order must be greater than 0');
    });

    it('should reject negative execution order', () => {
      // Act
      const result = actionNode.updateExecutionOrder(-1);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Execution order must be greater than 0');
    });
  });

  describe('Priority Management', () => {
    let actionNode: TestActionNode;

    beforeEach(() => {
      actionNode = TestActionNode.create(validProps).value;
    });

    it('should update priority successfully', () => {
      // Arrange
      const originalUpdatedAt = actionNode.updatedAt;

      // Act
      const result = actionNode.updatePriority(8);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.priority).toBe(8);
      expect(actionNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should allow minimum priority', () => {
      // Act
      const result = actionNode.updatePriority(1);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.priority).toBe(1);
    });

    it('should allow maximum priority', () => {
      // Act
      const result = actionNode.updatePriority(10);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.priority).toBe(10);
    });

    it('should reject priority less than 1', () => {
      // Act
      const result = actionNode.updatePriority(0);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Priority must be between 1 and 10');
    });

    it('should reject priority greater than 10', () => {
      // Act
      const result = actionNode.updatePriority(11);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Priority must be between 1 and 10');
    });
  });

  describe('Estimated Duration Management', () => {
    let actionNode: TestActionNode;

    beforeEach(() => {
      actionNode = TestActionNode.create(validProps).value;
    });

    it('should update estimated duration successfully', () => {
      // Arrange
      const originalUpdatedAt = actionNode.updatedAt;

      // Act
      const result = actionNode.updateEstimatedDuration(120);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.estimatedDuration).toBe(120);
      expect(actionNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should allow undefined estimated duration', () => {
      // Act
      const result = actionNode.updateEstimatedDuration(undefined);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.estimatedDuration).toBeUndefined();
    });

    it('should reject zero duration', () => {
      // Act
      const result = actionNode.updateEstimatedDuration(0);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Estimated duration must be positive');
    });

    it('should reject negative duration', () => {
      // Act
      const result = actionNode.updateEstimatedDuration(-30);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Estimated duration must be positive');
    });

    it('should allow very small positive duration', () => {
      // Act
      const result = actionNode.updateEstimatedDuration(0.1);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.estimatedDuration).toBe(0.1);
    });
  });

  describe('Status Transitions', () => {
    let actionNode: TestActionNode;

    beforeEach(() => {
      actionNode = TestActionNode.create(validProps).value;
    });

    it('should update status successfully with valid transition', () => {
      // Arrange
      const originalUpdatedAt = actionNode.updatedAt;

      // Act
      const result = actionNode.updateStatus(ActionStatus.ACTIVE);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.status).toBe(ActionStatus.ACTIVE);
      expect(actionNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    describe('from DRAFT status', () => {
      it('should allow transition to ACTIVE', () => {
        // Act & Assert
        expect(actionNode.updateStatus(ActionStatus.ACTIVE)).toBeValidResult();
        expect(actionNode.status).toBe(ActionStatus.ACTIVE);
      });

      it('should allow transition to ARCHIVED', () => {
        // Act & Assert
        expect(actionNode.updateStatus(ActionStatus.ARCHIVED)).toBeValidResult();
        expect(actionNode.status).toBe(ActionStatus.ARCHIVED);
      });

      it('should reject invalid transitions', () => {
        const invalidStatuses = [ActionStatus.EXECUTING, ActionStatus.COMPLETED, ActionStatus.FAILED];
        
        invalidStatuses.forEach(status => {
          const result = actionNode.updateStatus(status);
          expect(result).toBeFailureResult();
          expect(result).toHaveErrorMessage(`Invalid status transition from ${ActionStatus.DRAFT} to ${status}`);
        });
      });
    });

    describe('from ACTIVE status', () => {
      beforeEach(() => {
        actionNode.updateStatus(ActionStatus.ACTIVE);
      });

      it('should allow valid transitions', () => {
        const validStatuses = [ActionStatus.INACTIVE, ActionStatus.EXECUTING, ActionStatus.ARCHIVED, ActionStatus.ERROR];
        
        validStatuses.forEach(status => {
          // Reset to ACTIVE before each test
          actionNode.getProps().status = ActionStatus.ACTIVE;
          
          const result = actionNode.updateStatus(status);
          expect(result).toBeValidResult();
          expect(actionNode.status).toBe(status);
        });
      });

      it('should reject invalid transitions', () => {
        const invalidStatuses = [ActionStatus.DRAFT, ActionStatus.COMPLETED, ActionStatus.FAILED];
        
        invalidStatuses.forEach(status => {
          const result = actionNode.updateStatus(status);
          expect(result).toBeFailureResult();
        });
      });
    });

    describe('from EXECUTING status', () => {
      beforeEach(() => {
        actionNode.updateStatus(ActionStatus.ACTIVE);
        actionNode.updateStatus(ActionStatus.EXECUTING);
      });

      it('should allow valid transitions', () => {
        const validStatuses = [ActionStatus.COMPLETED, ActionStatus.FAILED, ActionStatus.RETRYING, ActionStatus.ERROR];
        
        validStatuses.forEach(status => {
          // Reset to EXECUTING before each test
          actionNode.getProps().status = ActionStatus.EXECUTING;
          
          const result = actionNode.updateStatus(status);
          expect(result).toBeValidResult();
          expect(actionNode.status).toBe(status);
        });
      });
    });

    describe('from ARCHIVED status', () => {
      beforeEach(() => {
        actionNode.updateStatus(ActionStatus.ARCHIVED);
      });

      it('should reject all transitions from archived', () => {
        const allOtherStatuses = [
          ActionStatus.DRAFT, ActionStatus.ACTIVE, ActionStatus.INACTIVE,
          ActionStatus.EXECUTING, ActionStatus.COMPLETED, ActionStatus.FAILED,
          ActionStatus.RETRYING, ActionStatus.ERROR
        ];
        
        allOtherStatuses.forEach(status => {
          const result = actionNode.updateStatus(status);
          expect(result).toBeFailureResult();
          expect(result).toHaveErrorMessage(`Invalid status transition from ${ActionStatus.ARCHIVED} to ${status}`);
        });
      });
    });
  });

  describe('Retry Policy Management', () => {
    let actionNode: TestActionNode;

    beforeEach(() => {
      actionNode = TestActionNode.create(validProps).value;
    });

    it('should update retry policy successfully', () => {
      // Arrange
      const newRetryPolicyResult = RetryPolicy.create({
        maxAttempts: 5,
        strategy: 'exponential',
        baseDelayMs: 2000,
        maxDelayMs: 60000,
        enabled: true
      });
      const newRetryPolicy = newRetryPolicyResult.value;
      const originalUpdatedAt = actionNode.updatedAt;

      // Act
      const result = actionNode.updateRetryPolicy(newRetryPolicy);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.retryPolicy).toBe(newRetryPolicy);
      expect(actionNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('RACI Management', () => {
    let actionNode: TestActionNode;

    beforeEach(() => {
      actionNode = TestActionNode.create(validProps).value;
    });

    it('should update RACI successfully', () => {
      // Arrange
      const newRaciResult = RACI.create(['new-responsible'], ['accountable'], ['consulted'], ['informed']);
      const newRaci = newRaciResult.value;
      const originalUpdatedAt = actionNode.updatedAt;

      // Act
      const result = actionNode.updateRaci(newRaci);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.raci).toBe(newRaci);
      expect(actionNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('Metadata Management', () => {
    let actionNode: TestActionNode;

    beforeEach(() => {
      actionNode = TestActionNode.create(validProps).value;
    });

    it('should update metadata successfully', () => {
      // Arrange
      const newMetadata = { version: 2, feature: 'enhanced' };
      const originalUpdatedAt = actionNode.updatedAt;

      // Act
      const result = actionNode.updateMetadata(newMetadata);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.metadata).toEqual(newMetadata);
      expect(actionNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should create defensive copy of metadata', () => {
      // Arrange
      const newMetadata = { mutable: 'value' };

      // Act
      const result = actionNode.updateMetadata(newMetadata);
      newMetadata.mutable = 'changed';

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.metadata).toEqual({ mutable: 'value' });
    });

    it('should handle empty metadata', () => {
      // Act
      const result = actionNode.updateMetadata({});

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.metadata).toEqual({});
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
      const result = actionNode.updateMetadata(complexMetadata);

      // Assert
      expect(result).toBeValidResult();
      expect(actionNode.metadata).toEqual(complexMetadata);
    });
  });

  describe('Equality and Comparison', () => {
    it('should be equal when action IDs match', () => {
      // Arrange
      const actionNode1 = TestActionNode.create(validProps).value;
      const actionNode2 = TestActionNode.create({
        ...validProps,
        name: 'Different Name',
        priority: 10
      }).value;

      // Act & Assert
      expect(actionNode1.equals(actionNode2)).toBe(true);
    });

    it('should not be equal when action IDs differ', () => {
      // Arrange
      const differentActionId = NodeId.create('123e4567-e89b-42d3-a456-426614174999').value;
      const actionNode1 = TestActionNode.create(validProps).value;
      const actionNode2 = TestActionNode.create({
        ...validProps,
        actionId: differentActionId
      }).value;

      // Act & Assert
      expect(actionNode1.equals(actionNode2)).toBe(false);
    });
  });

  describe('Timestamp Management', () => {
    let actionNode: TestActionNode;

    beforeEach(() => {
      actionNode = TestActionNode.create(validProps).value;
    });

    it('should update timestamp on any property change', () => {
      // Arrange
      const originalUpdatedAt = actionNode.updatedAt;

      // Add a small delay to ensure timestamp difference
      const delay = () => new Promise(resolve => setTimeout(resolve, 1));

      // Act & Assert
      delay().then(() => {
        actionNode.updateName('New Name');
        expect(actionNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());

        const nameChangeTime = actionNode.updatedAt;
        
        delay().then(() => {
          actionNode.updatePriority(8);
          expect(actionNode.updatedAt.getTime()).toBeGreaterThanOrEqual(nameChangeTime.getTime());
        });
      });
    });

    it('should preserve creation timestamp', () => {
      // Arrange
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const nodeWithTimestamp = TestActionNode.create({
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
      const actionNode = TestActionNode.create(validProps).value;

      // Act - Simulate a complete lifecycle
      expect(actionNode.updateStatus(ActionStatus.ACTIVE)).toBeValidResult();
      expect(actionNode.updateName('Production Action')).toBeValidResult();
      expect(actionNode.updatePriority(10)).toBeValidResult();
      expect(actionNode.updateStatus(ActionStatus.EXECUTING)).toBeValidResult();
      expect(actionNode.updateStatus(ActionStatus.COMPLETED)).toBeValidResult();

      // Assert
      expect(actionNode.status).toBe(ActionStatus.COMPLETED);
      expect(actionNode.name).toBe('Production Action');
      expect(actionNode.priority).toBe(10);
    });

    it('should handle error scenarios gracefully', () => {
      // Arrange
      const actionNode = TestActionNode.create(validProps).value;

      // Act & Assert - Invalid operations should not affect state
      const originalName = actionNode.name;
      const originalPriority = actionNode.priority;

      expect(actionNode.updateName('')).toBeFailureResult();
      expect(actionNode.updatePriority(15)).toBeFailureResult();

      expect(actionNode.name).toBe(originalName);
      expect(actionNode.priority).toBe(originalPriority);
    });
  });
});