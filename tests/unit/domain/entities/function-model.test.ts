/**
 * Unit tests for FunctionModel aggregate root
 * Tests core business logic, lifecycle management, and domain rules
 */

import { FunctionModel } from '@/lib/domain/entities/function-model';
import { ModelStatus } from '@/lib/domain/enums';
import { 
  FunctionModelBuilder, 
  IONodeBuilder, 
  StageNodeBuilder, 
  TetherNodeBuilder,
  TestData,
  TestFactories 
} from '../../../utils/test-fixtures';
import { ResultTestHelpers, DateTestHelpers, UuidTestHelpers } from '../../../utils/test-helpers';

describe('FunctionModel', () => {
  beforeEach(() => {
    UuidTestHelpers.resetCounter();
    jest.clearAllMocks();
  });

  describe('creation and initialization', () => {
    it('should create function model with valid properties', () => {
      // Act
      const model = TestFactories.createValidModel();
      
      // Assert
      expect(model.modelId).toBeDefined();
      expect(model.name.toString()).toBe(TestData.VALID_MODEL_NAME);
      expect(model.version.toString()).toBe(TestData.VALID_VERSION);
      expect(model.status).toBe(ModelStatus.DRAFT);
      expect(model.nodes.size).toBe(0);
      expect(model.actionNodes.size).toBe(0);
      expect(model.versionCount).toBe(1);
      expect(model.createdAt).toBeInstanceOf(Date);
      expect(model.updatedAt).toBeInstanceOf(Date);
      expect(model.lastSavedAt).toBeInstanceOf(Date);
    });

    it('should create model with custom properties', () => {
      // Arrange & Act
      const model = new FunctionModelBuilder()
        .withName('Custom Model')
        .withDescription('Custom description')
        .withVersion('2.1.0')
        .withStatus(ModelStatus.PUBLISHED)
        .withOwner('custom-owner-id')
        .build();
      
      // Assert
      expect(model.name.toString()).toBe('Custom Model');
      expect(model.description).toBe('Custom description');
      expect(model.version.toString()).toBe('2.1.0');
      expect(model.status).toBe(ModelStatus.PUBLISHED);
      expect(model.permissions.owner).toBe('custom-owner-id');
    });

    it('should initialize with default metadata', () => {
      // Act
      const model = TestFactories.createValidModel();
      
      // Assert
      expect(model.metadata).toBeDefined();
      expect(typeof model.metadata).toBe('object');
    });

    it('should have proper permission structure', () => {
      // Act
      const model = new FunctionModelBuilder()
        .withOwner('owner-123')
        .withEditors(['editor-1', 'editor-2'])
        .build();
      
      // Assert
      expect(model.permissions.owner).toBe('owner-123');
      expect(model.permissions.editors).toEqual(['editor-1', 'editor-2']);
      expect(model.permissions.viewers).toEqual([]);
    });
  });

  describe('container node management', () => {
    it('should add container node successfully', () => {
      // Arrange
      const model = TestFactories.createValidModel();
      const ioNode = new IONodeBuilder()
        .withModelId(model.modelId)
        .withName('Input Node')
        .build();
      
      // Act
      const result = model.addContainerNode(ioNode);
      
      // Assert
      expect(result).toBeValidResult();
      expect(model.nodes.size).toBe(1);
      expect(model.nodes.get(ioNode.nodeId.toString())).toBe(ioNode);
    });

    it('should reject adding duplicate node IDs', () => {
      // Arrange
      const model = TestFactories.createValidModel();
      const nodeId = 'duplicate-node-id';
      
      const node1 = new IONodeBuilder()
        .withId(nodeId)
        .withModelId(model.modelId)
        .build();
      
      const node2 = new StageNodeBuilder()
        .withId(nodeId) // Same ID
        .withModelId(model.modelId)
        .build();
      
      // Act
      model.addContainerNode(node1);
      const result = model.addContainerNode(node2);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node with this ID already exists');
      expect(model.nodes.size).toBe(1);
    });

    it('should reject adding node from different model', () => {
      // Arrange
      const model = TestFactories.createValidModel();
      const nodeFromOtherModel = new IONodeBuilder()
        .withModelId('different-model-id')
        .build();
      
      // Act
      const result = model.addContainerNode(nodeFromOtherModel);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node belongs to different model');
    });

    it('should remove container node and its actions', () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const stageNode = Array.from(model.nodes.values())
        .find(node => node.name === 'Process');
      
      // Add an action to the stage node
      const tetherAction = new TetherNodeBuilder()
        .withParentNode(stageNode!.nodeId.toString())
        .build();
      model.addActionNode(tetherAction);
      
      expect(model.nodes.size).toBe(3);
      expect(model.actionNodes.size).toBe(1);
      
      // Act
      const result = model.removeContainerNode(stageNode!.nodeId);
      
      // Assert
      expect(result).toBeValidResult();
      expect(model.nodes.size).toBe(2);
      expect(model.actionNodes.size).toBe(0); // Action should be removed too
    });

    it('should not remove non-existent node', () => {
      // Arrange
      const model = TestFactories.createValidModel();
      const nonExistentNodeId = 'non-existent-id';
      
      // Act
      const result = model.removeContainerNode(nonExistentNodeId);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node not found');
    });
  });

  describe('action node management', () => {
    it('should add action node to container', () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const stageNode = Array.from(model.nodes.values())
        .find(node => node.name === 'Process');
      
      const tetherAction = new TetherNodeBuilder()
        .withParentNode(stageNode!.nodeId.toString())
        .withModelId(model.modelId)
        .build();
      
      // Act
      const result = model.addActionNode(tetherAction);
      
      // Assert
      expect(result).toBeValidResult();
      expect(model.actionNodes.size).toBe(1);
      expect(model.actionNodes.get(tetherAction.actionId.toString())).toBe(tetherAction);
    });

    it('should reject action node with non-existent parent', () => {
      // Arrange
      const model = TestFactories.createValidModel();
      const actionWithInvalidParent = new TetherNodeBuilder()
        .withParentNode('non-existent-parent-id')
        .withModelId(model.modelId)
        .build();
      
      // Act
      const result = model.addActionNode(actionWithInvalidParent);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Parent node not found');
    });

    it('should reject duplicate action IDs', () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const stageNode = Array.from(model.nodes.values())[1];
      const actionId = 'duplicate-action-id';
      
      const action1 = new TetherNodeBuilder()
        .withId(actionId)
        .withParentNode(stageNode.nodeId.toString())
        .withModelId(model.modelId)
        .build();
      
      const action2 = new TetherNodeBuilder()
        .withId(actionId) // Same ID
        .withParentNode(stageNode.nodeId.toString())
        .withModelId(model.modelId)
        .build();
      
      // Act
      model.addActionNode(action1);
      const result = model.addActionNode(action2);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Action with this ID already exists');
    });

    it('should remove action node', () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const stageNode = Array.from(model.nodes.values())[1];
      const tetherAction = new TetherNodeBuilder()
        .withParentNode(stageNode.nodeId.toString())
        .withModelId(model.modelId)
        .build();
      
      model.addActionNode(tetherAction);
      expect(model.actionNodes.size).toBe(1);
      
      // Act
      const result = model.removeActionNode(tetherAction.actionId);
      
      // Assert
      expect(result).toBeValidResult();
      expect(model.actionNodes.size).toBe(0);
    });
  });

  describe('workflow validation', () => {
    it('should validate complete workflow successfully', () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      
      // Act
      const result = model.validateWorkflow();
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(true);
      expect(result.value.errors).toHaveLength(0);
      expect(result.value.warnings).toHaveLength(0);
    });

    it('should detect missing IO nodes', () => {
      // Arrange
      const model = TestFactories.createValidModel();
      
      // Add only a stage node, no IO nodes
      const stageNode = new StageNodeBuilder()
        .withModelId(model.modelId)
        .build();
      model.addContainerNode(stageNode);
      
      // Act
      const result = model.validateWorkflow();
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Workflow must have at least one input node');
      expect(result.value.errors).toContain('Workflow must have at least one output node');
    });

    it('should detect circular dependencies', () => {
      // Arrange
      const model = TestFactories.createValidModel();
      
      const nodeA = new StageNodeBuilder()
        .withId('node-a')
        .withModelId(model.modelId)
        .build();
      
      const nodeB = new StageNodeBuilder()
        .withId('node-b')  
        .withModelId(model.modelId)
        .build();
      
      // Create circular dependency: A -> B -> A
      nodeA.addDependency('node-b');
      nodeB.addDependency('node-a');
      
      model.addContainerNode(nodeA);
      model.addContainerNode(nodeB);
      
      // Act
      const result = model.validateWorkflow();
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Circular dependency detected');
    });

    it('should detect orphaned nodes', () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      
      // Add an orphaned node with no connections
      const orphanedNode = new StageNodeBuilder()
        .withModelId(model.modelId)
        .withName('Orphaned Node')
        .withPosition(1000, 1000) // Far from others
        .build();
      
      model.addContainerNode(orphanedNode);
      
      // Act
      const result = model.validateWorkflow();
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.warnings).toContain('Node "Orphaned Node" has no connections');
    });

    it('should warn about nodes without actions', () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      
      // Stage nodes should have actions
      // Act
      const result = model.validateWorkflow();
      
      // Assert  
      expect(result).toBeValidResult();
      expect(result.value.warnings.some(w => w.includes('has no actions'))).toBe(true);
    });
  });

  describe('publishing workflow', () => {
    it('should publish valid draft model', () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      expect(model.status).toBe(ModelStatus.DRAFT);
      
      // Act
      const result = model.publish();
      
      // Assert
      expect(result).toBeValidResult();
      expect(model.status).toBe(ModelStatus.PUBLISHED);
      expect(model.versionCount).toBe(1); // Still first version
    });

    it('should reject publishing invalid workflow', () => {
      // Arrange  
      const model = TestFactories.createValidModel(); // No nodes
      
      // Act
      const result = model.publish();
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Cannot publish invalid workflow');
    });

    it('should reject publishing already published model', () => {
      // Arrange
      const model = new FunctionModelBuilder()
        .withStatus(ModelStatus.PUBLISHED)
        .build();
      
      // Act
      const result = model.publish();
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Model is already published');
    });

    it('should reject publishing archived model', () => {
      // Arrange
      const model = new FunctionModelBuilder()
        .withStatus(ModelStatus.ARCHIVED)
        .build();
      
      // Act
      const result = model.publish();
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Cannot publish archived model');
    });
  });

  describe('version management', () => {
    it('should create new version from published model', () => {
      // Arrange
      const publishedModel = new FunctionModelBuilder()
        .withStatus(ModelStatus.PUBLISHED)
        .withVersion('1.0.0')
        .build();
      
      // Act
      const result = publishedModel.createVersion('1.1.0');
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.version.toString()).toBe('1.1.0');
      expect(result.value.status).toBe(ModelStatus.DRAFT);
      expect(result.value.versionCount).toBe(2);
      expect(result.value.modelId).toBe(publishedModel.modelId); // Same model ID
    });

    it('should reject invalid version progression', () => {
      // Arrange
      const model = new FunctionModelBuilder()
        .withStatus(ModelStatus.PUBLISHED)
        .withVersion('2.0.0')
        .build();
      
      // Act - Try to create version 1.5.0 (backwards)
      const result = model.createVersion('1.5.0');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('New version must be greater than current version');
    });

    it('should only create version from published model', () => {
      // Arrange
      const draftModel = new FunctionModelBuilder()
        .withStatus(ModelStatus.DRAFT)
        .build();
      
      // Act
      const result = draftModel.createVersion('1.1.0');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Can only create version from published model');
    });
  });

  describe('archival workflow', () => {
    it('should archive published model', () => {
      // Arrange
      const publishedModel = new FunctionModelBuilder()
        .withStatus(ModelStatus.PUBLISHED)
        .build();
      
      // Act
      const result = publishedModel.archive();
      
      // Assert
      expect(result).toBeValidResult();
      expect(publishedModel.status).toBe(ModelStatus.ARCHIVED);
    });

    it('should archive draft model', () => {
      // Arrange
      const draftModel = TestFactories.createValidModel();
      
      // Act  
      const result = draftModel.archive();
      
      // Assert
      expect(result).toBeValidResult();
      expect(draftModel.status).toBe(ModelStatus.ARCHIVED);
    });

    it('should reject archiving already archived model', () => {
      // Arrange
      const archivedModel = new FunctionModelBuilder()
        .withStatus(ModelStatus.ARCHIVED)
        .build();
      
      // Act
      const result = archivedModel.archive();
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Model is already archived');
    });
  });

  describe('soft delete workflow', () => {
    it('should soft delete model', () => {
      // Arrange
      const model = TestFactories.createValidModel();
      
      // Act
      const result = model.softDelete();
      
      // Assert
      expect(result).toBeValidResult();
      expect(model.deletedAt).toBeInstanceOf(Date);
      expect(model.isDeleted()).toBe(true);
    });

    it('should reject operations on deleted model', () => {
      // Arrange
      const model = TestFactories.createValidModel();
      model.softDelete();
      
      const newNode = new IONodeBuilder()
        .withModelId(model.modelId)
        .build();
      
      // Act
      const result = model.addContainerNode(newNode);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Cannot modify deleted model');
    });

    it('should not soft delete already deleted model', () => {
      // Arrange
      const model = TestFactories.createValidModel();
      model.softDelete();
      
      // Act
      const result = model.softDelete();
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Model is already deleted');
    });
  });

  describe('model statistics', () => {
    it('should calculate model statistics correctly', () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      
      // Add some actions
      const stageNode = Array.from(model.nodes.values())[1]; // Get stage node
      const tetherAction = new TetherNodeBuilder()
        .withParentNode(stageNode.nodeId.toString())
        .withModelId(model.modelId)
        .build();
      
      model.addActionNode(tetherAction);
      
      // Act
      const stats = model.calculateStatistics();
      
      // Assert
      expect(stats.totalNodes).toBe(3); // 2 IO + 1 Stage
      expect(stats.containerNodeCount).toBe(3);
      expect(stats.actionNodeCount).toBe(1);
      expect(stats.nodeTypeBreakdown).toHaveProperty('ioNode', 2);
      expect(stats.nodeTypeBreakdown).toHaveProperty('stageNode', 1);
      expect(stats.actionTypeBreakdown).toHaveProperty('tetherNode', 1);
    });

    it('should calculate complexity metrics', () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      
      // Act
      const stats = model.calculateStatistics();
      
      // Assert
      expect(typeof stats.averageComplexity).toBe('number');
      expect(stats.averageComplexity).toBeGreaterThanOrEqual(0);
      expect(typeof stats.maxDependencyDepth).toBe('number');
      expect(stats.maxDependencyDepth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('timestamps and audit trail', () => {
    it('should update timestamps on modifications', () => {
      // Arrange
      const model = TestFactories.createValidModel();
      const originalUpdatedAt = model.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      const dateNowSpy = DateTestHelpers.mockDateNow(Date.now() + 1000);
      
      const newNode = new IONodeBuilder()
        .withModelId(model.modelId)
        .build();
      
      // Act
      model.addContainerNode(newNode);
      
      // Assert
      expect(model.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      
      // Cleanup
      DateTestHelpers.restoreDateNow(dateNowSpy);
    });

    it('should track last saved timestamp', () => {
      // Arrange
      const model = TestFactories.createValidModel();
      const saveTime = new Date();
      
      // Act
      model.updateLastSaved(saveTime);
      
      // Assert
      expect(model.lastSavedAt).toBe(saveTime);
    });
  });

  describe('equality and identity', () => {
    it('should be equal when model IDs match', () => {
      // Arrange
      const modelId = 'same-model-id';
      const model1 = new FunctionModelBuilder().withId(modelId).build();
      const model2 = new FunctionModelBuilder().withId(modelId).build();
      
      // Act & Assert
      expect(model1.equals(model2)).toBe(true);
    });

    it('should not be equal when model IDs differ', () => {
      // Arrange
      const model1 = new FunctionModelBuilder().withId('model-1').build();
      const model2 = new FunctionModelBuilder().withId('model-2').build();
      
      // Act & Assert
      expect(model1.equals(model2)).toBe(false);
    });
  });

  describe('business rules enforcement', () => {
    it('should enforce immutability of published models', () => {
      // Arrange
      const publishedModel = new FunctionModelBuilder()
        .withStatus(ModelStatus.PUBLISHED)
        .build();
      
      const newNode = new IONodeBuilder()
        .withModelId(publishedModel.modelId)
        .build();
      
      // Act
      const result = publishedModel.addContainerNode(newNode);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Cannot modify published model');
    });

    it('should allow viewing but not editing archived models', () => {
      // Arrange
      const archivedModel = new FunctionModelBuilder()
        .withStatus(ModelStatus.ARCHIVED)
        .build();
      
      // Act - Should be able to read properties
      expect(archivedModel.name).toBeDefined();
      expect(archivedModel.status).toBe(ModelStatus.ARCHIVED);
      
      // But not modify
      const newNode = new IONodeBuilder()
        .withModelId(archivedModel.modelId)
        .build();
      
      const result = archivedModel.addContainerNode(newNode);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Cannot modify archived model');
    });
  });
});