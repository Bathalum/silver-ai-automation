import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { IONode } from '../../../../lib/domain/entities/io-node';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { Position } from '../../../../lib/domain/value-objects/position';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { ModelStatus } from '../../../../lib/domain/enums';
import { Result } from '../../../../lib/domain/shared/result';

describe('FunctionModel - Archive Lifecycle', () => {
  let model: FunctionModel;

  beforeEach(() => {
    const modelNameResult = ModelName.create('Test Archive Model');
    const versionResult = Version.create('1.0.0');
    
    expect(modelNameResult.isSuccess).toBe(true);
    expect(versionResult.isSuccess).toBe(true);

    // Create nodes for publishable model
    const inputNodeId = NodeId.generate();
    const outputNodeId = NodeId.generate();
    const positionResult = Position.create(100, 100);
    expect(positionResult.isSuccess).toBe(true);

    const inputNode = IONode.create({
      nodeId: inputNodeId,
      modelId: 'test-archive-model-id',
      name: 'Input Node',
      description: 'Test input',
      position: positionResult.value,
      dependencies: [],
      ioData: {
        boundaryType: 'input',
        dataType: 'text',
        required: true
      }
    });

    const outputNode = IONode.create({
      nodeId: outputNodeId,
      modelId: 'test-archive-model-id',
      name: 'Output Node', 
      description: 'Test output',
      position: positionResult.value,
      dependencies: [inputNodeId],
      ioData: {
        boundaryType: 'output',
        dataType: 'json',
        required: true
      }
    });

    expect(inputNode.isSuccess).toBe(true);
    expect(outputNode.isSuccess).toBe(true);

    const nodes = new Map();
    nodes.set(inputNodeId.toString(), inputNode.value);
    nodes.set(outputNodeId.toString(), outputNode.value);

    const modelResult = FunctionModel.create({
      modelId: 'test-archive-model-id',
      name: modelNameResult.value,
      version: versionResult.value,
      status: ModelStatus.DRAFT,
      currentVersion: versionResult.value,
      nodes,
      actionNodes: new Map(),
      metadata: {},
      permissions: {}
    });

    expect(modelResult.isSuccess).toBe(true);
    model = modelResult.value;
  });

  describe('archive() - State Transition Rules', () => {
    it('should archive a DRAFT model successfully', () => {
      // Arrange - model is already DRAFT

      // Act
      const result = model.archive();

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(model.status).toBe(ModelStatus.ARCHIVED);
      expect(model.updatedAt).toBeDefined();
    });

    it('should archive a PUBLISHED model successfully', () => {
      // Arrange - publish the model first
      const publishResult = model.publish();
      expect(publishResult.isSuccess).toBe(true);
      expect(model.status).toBe(ModelStatus.PUBLISHED);

      // Act
      const archiveResult = model.archive();

      // Assert
      expect(archiveResult.isSuccess).toBe(true);
      expect(model.status).toBe(ModelStatus.ARCHIVED);
      expect(model.updatedAt).toBeDefined();
    });

    it('should fail to archive already ARCHIVED model', () => {
      // Arrange - archive the model first
      const firstArchiveResult = model.archive();
      expect(firstArchiveResult.isSuccess).toBe(true);
      expect(model.status).toBe(ModelStatus.ARCHIVED);

      // Act
      const secondArchiveResult = model.archive();

      // Assert
      expect(secondArchiveResult.isFailure).toBe(true);
      expect(secondArchiveResult.error).toBe('Model is already archived');
      expect(model.status).toBe(ModelStatus.ARCHIVED); // Status unchanged
    });
  });

  describe('archive() - Audit Trail Requirements', () => {
    it('should update the updatedAt timestamp when archiving', async () => {
      // Arrange
      const originalUpdatedAt = model.updatedAt;
      
      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));

      // Act
      const result = model.archive();

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(model.updatedAt).toBeInstanceOf(Date);
      expect(model.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should preserve original creation metadata when archiving', () => {
      // Arrange
      const originalCreatedAt = model.createdAt;
      const originalModelId = model.modelId;
      const originalName = model.name;
      const originalVersion = model.version;

      // Act
      const result = model.archive();

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(model.createdAt).toEqual(originalCreatedAt);
      expect(model.modelId).toBe(originalModelId);
      expect(model.name).toEqual(originalName);
      expect(model.version).toEqual(originalVersion);
    });
  });

  describe('archive() - Data Preservation Requirements', () => {
    it('should preserve all node and action data when archiving', () => {
      // Arrange - add nodes and actions to model
      // (This would require setup of actual nodes, simplified for test structure)
      const originalNodeCount = model.nodes.size;
      const originalActionCount = model.actionNodes.size;
      const originalMetadata = { ...model.metadata };
      const originalPermissions = { ...model.permissions };

      // Act
      const result = model.archive();

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(model.nodes.size).toBe(originalNodeCount);
      expect(model.actionNodes.size).toBe(originalActionCount);
      expect(model.metadata).toEqual(originalMetadata);
      expect(model.permissions).toEqual(originalPermissions);
    });

    it('should preserve version history when archiving', () => {
      // Arrange
      const originalVersion = model.version;
      const originalCurrentVersion = model.currentVersion;
      const originalVersionCount = model.versionCount;

      // Act
      const result = model.archive();

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(model.version).toEqual(originalVersion);
      expect(model.currentVersion).toEqual(originalCurrentVersion);
      expect(model.versionCount).toBe(originalVersionCount);
    });
  });

  describe('Archived Model - Modification Prevention', () => {
    beforeEach(() => {
      // Archive the model for all tests in this describe block
      const archiveResult = model.archive();
      expect(archiveResult.isSuccess).toBe(true);
      expect(model.status).toBe(ModelStatus.ARCHIVED);
    });

    it('should prevent publishing archived model', () => {
      // Act
      const result = model.publish();

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot publish archived model');
      expect(model.status).toBe(ModelStatus.ARCHIVED); // Status unchanged
    });

    it('should prevent name updates on archived model', () => {
      // Arrange
      const newNameResult = ModelName.create('New Archive Name');
      expect(newNameResult.isSuccess).toBe(true);
      const originalName = model.name;

      // Act
      const result = model.updateName(newNameResult.value);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot modify archived model');
      expect(model.name).toEqual(originalName);
    });

    it('should prevent description updates on archived model', () => {
      // Arrange
      const newDescription = 'Updated description for archived model';
      const originalDescription = model.description;

      // Act
      const result = model.updateDescription(newDescription);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot modify archived model');
      expect(model.description).toBe(originalDescription);
    });

    it('should prevent node additions to archived model', () => {
      // Act - This would require a valid Node instance
      // Testing the pattern with addContainerNode which has explicit archived check
      const mockNode = {} as any; // Simplified for test structure
      const result = model.addContainerNode(mockNode);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot modify archived model');
    });
  });

  describe('Archived Model - Soft Delete Integration', () => {
    it('should preserve original status when soft deleting for audit purposes', () => {
      // Arrange - model starts as DRAFT
      expect(model.status).toBe(ModelStatus.DRAFT);
      expect(model.isDeleted()).toBe(false);

      // Act
      const result = model.softDelete('test-user');

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(model.status).toBe(ModelStatus.DRAFT); // Status preserved for audit
      expect(model.isDeleted()).toBe(true);
      expect(model.deletedAt).toBeDefined();
      expect(model.deletedBy).toBe('test-user');
    });

    it('should handle soft delete without deletedBy parameter', () => {
      // Act
      const result = model.softDelete();

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(model.status).toBe(ModelStatus.DRAFT); // Status preserved for audit
      expect(model.isDeleted()).toBe(true);
      expect(model.deletedAt).toBeDefined();
      expect(model.deletedBy).toBeUndefined();
    });

    it('should prevent double soft delete', () => {
      // Arrange - soft delete first time
      const firstDeleteResult = model.softDelete('test-user');
      expect(firstDeleteResult.isSuccess).toBe(true);

      // Act - attempt second soft delete
      const secondDeleteResult = model.softDelete('different-user');

      // Assert
      expect(secondDeleteResult.isFailure).toBe(true);
      expect(secondDeleteResult.error).toBe('Model is already deleted');
      expect(model.deletedBy).toBe('test-user'); // Unchanged from first delete
    });
  });

  describe('Archive - Business Rule Validation', () => {
    it('should maintain referential integrity after archiving', () => {
      // Act
      const result = model.archive();

      // Assert
      expect(result.isSuccess).toBe(true);
      // Model should still be accessible for read operations
      expect(model.modelId).toBeDefined();
      expect(model.name).toBeDefined();
      expect(model.version).toBeDefined();
      // But modification should be prevented (tested above)
    });

    it('should support statistical analysis on archived models', () => {
      // Arrange - archive the model
      const archiveResult = model.archive();
      expect(archiveResult.isSuccess).toBe(true);

      // Act - calculate statistics should still work
      const stats = model.calculateStatistics();

      // Assert
      expect(stats).toBeDefined();
      expect(stats.totalNodes).toBeDefined();
      expect(stats.totalActions).toBeDefined();
      expect(stats.nodeTypeBreakdown).toBeDefined();
      expect(stats.actionTypeBreakdown).toBeDefined();
    });

    it('should support workflow validation on archived models for audit purposes', () => {
      // Arrange - archive the model
      const archiveResult = model.archive();
      expect(archiveResult.isSuccess).toBe(true);

      // Act - validation should still work for audit purposes
      const validationResult = model.validateWorkflow();

      // Assert
      expect(validationResult.isSuccess).toBe(true);
      expect(validationResult.value).toBeDefined();
      expect(validationResult.value.isValid).toBeDefined();
      expect(validationResult.value.errors).toBeDefined();
      expect(validationResult.value.warnings).toBeDefined();
    });
  });
});