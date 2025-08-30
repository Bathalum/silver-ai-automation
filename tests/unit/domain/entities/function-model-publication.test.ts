import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ModelStatus } from '../../../../lib/domain/enums';
import { Version } from '../../../../lib/domain/value-objects/version';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { IONode } from '../../../../lib/domain/entities/io-node';
import { StageNode } from '../../../../lib/domain/entities/stage-node';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { Position } from '../../../../lib/domain/value-objects/position';
import { IONodeBuilder, StageNodeBuilder, getTestUUID } from '../../../utils/test-fixtures';

describe('FunctionModel - Publication Domain Rules', () => {
  let model: FunctionModel;
  let modelName: ModelName;
  let version: Version;
  const userId = 'test-user-123';
  const modelId = 'test-model-123';

  beforeEach(() => {
    // Create valid model name and version
    const nameResult = ModelName.create('Test Function Model');
    if (nameResult.isFailure) throw new Error('Failed to create model name');
    modelName = nameResult.value;

    const versionResult = Version.create('1.0.0');
    if (versionResult.isFailure) throw new Error('Failed to create version');
    version = versionResult.value;

    // Create model in draft state
    const modelResult = FunctionModel.create({
      modelId,
      name: modelName,
      description: 'Test model for publication',
      version,
      status: ModelStatus.DRAFT,
      currentVersion: version,
      nodes: new Map(),
      actionNodes: new Map(),
      metadata: { environment: 'test', purpose: 'publication-validation' },
      permissions: {
        owner: userId,
        editors: [],
        viewers: []
      }
    });

    if (modelResult.isFailure) throw new Error('Failed to create test model');
    model = modelResult.value;
  });

  describe('publish() - State Transition Rules', () => {
    it('should transition from DRAFT to PUBLISHED when valid', () => {
      // Arrange - Model starts as DRAFT
      expect(model.status).toBe(ModelStatus.DRAFT);

      // Add minimum required nodes for valid workflow
      addValidWorkflowNodes(model);

      // Act
      const result = model.publish();

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(model.status).toBe(ModelStatus.PUBLISHED);
    });

    it('should fail when model is already PUBLISHED', () => {
      // Arrange
      addValidWorkflowNodes(model);
      model.publish(); // First publication
      expect(model.status).toBe(ModelStatus.PUBLISHED);

      // Act - Try to publish again
      const result = model.publish();

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Model is already published');
    });

    it('should fail when model is ARCHIVED', () => {
      // Arrange
      model['props'].status = ModelStatus.ARCHIVED;

      // Act
      const result = model.publish();

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot publish archived model');
    });

    it('should fail when model is not in DRAFT state', () => {
      // Arrange - Set to a non-draft, non-archived state
      model['props'].status = ModelStatus.PUBLISHED;

      // Act
      const result = model.publish();

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Model is already published');
    });

    it('should require valid workflow before publication', () => {
      // Arrange - Model with no nodes (invalid workflow)
      expect(model.nodes.size).toBe(0);

      // Act
      const result = model.publish();

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot publish invalid workflow');
    });
  });

  describe('validateWorkflow() - Publication Validation Rules', () => {
    it('should return validation errors for empty workflow', () => {
      // Act
      const result = model.validateWorkflow();

      // Assert
      expect(result.isSuccess).toBe(true);
      const validation = result.value;
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Workflow must have at least one input node');
      expect(validation.errors).toContain('Workflow must have at least one output node');
    });

    it('should return validation error when missing input nodes', () => {
      // Arrange - Add only output node
      const outputNode = new IONodeBuilder()
        .withModelId(model.modelId)
        .withName('Output Node')
        .withPosition(100, 100)
        .asOutput()
        .build();

      model.addNode(outputNode);

      // Act
      const result = model.validateWorkflow();

      // Assert
      expect(result.isSuccess).toBe(true);
      const validation = result.value;
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Workflow must have at least one input node');
      expect(validation.errors).not.toContain('Workflow must have at least one output node');
    });

    it('should return validation error when missing output nodes', () => {
      // Arrange - Add only input node
      const inputNode = new IONodeBuilder()
        .withModelId(model.modelId)
        .withName('Input Node')
        .withPosition(100, 100)
        .asInput()
        .build();

      model.addNode(inputNode);

      // Act
      const result = model.validateWorkflow();

      // Assert
      expect(result.isSuccess).toBe(true);
      const validation = result.value;
      expect(validation.isValid).toBe(false);
      expect(validation.errors).not.toContain('Workflow must have at least one input node');
      expect(validation.errors).toContain('Workflow must have at least one output node');
    });

    it('should validate successfully with input and output nodes', () => {
      // Arrange
      addValidWorkflowNodes(model);

      // Act
      const result = model.validateWorkflow();

      // Assert
      expect(result.isSuccess).toBe(true);
      const validation = result.value;
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should include warnings for isolated nodes', () => {
      // Arrange
      addValidWorkflowNodes(model);
      
      // Add an isolated stage node (no connections)
      const isolatedNode = new StageNodeBuilder()
        .withModelId(model.modelId)
        .withName('Isolated Stage')
        .withPosition(200, 200)
        .withDescription('This node has no connections')
        .build();

      model.addNode(isolatedNode);

      // Act
      const result = model.validateWorkflow();

      // Assert
      expect(result.isSuccess).toBe(true);
      const validation = result.value;
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('no connections') || w.includes('no actions'))).toBe(true);
    });

    it('should detect input-output boundary node correctly', () => {
      // Arrange - Add input-output boundary node  
      // Note: Creating input-output node by manually using IONode.create with input-output boundary
      const nodeId = NodeId.generate();
      const position = Position.create(100, 100);
      if (position.isFailure) throw new Error('Failed to create position');

      const boundaryNodeResult = IONode.create({
        nodeId: nodeId,
        modelId: model.modelId,
        name: 'Boundary Node',
        description: 'Input-Output boundary node',
        position: position.value,
        nodeType: 'ioNode',
        executionMode: 'sequential',
        status: 'draft',
        dependencies: [],
        ioData: {
          boundaryType: 'input-output',
          inputDataContract: { type: 'string' },
          outputDataContract: { type: 'string' }
        }
      });
      if (boundaryNodeResult.isFailure) throw new Error('Failed to create boundary node');

      model.addNode(boundaryNodeResult.value);

      // Act
      const result = model.validateWorkflow();

      // Assert
      expect(result.isSuccess).toBe(true);
      const validation = result.value;
      expect(validation.isValid).toBe(true); // Input-output node satisfies both requirements
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Business Rule Enforcement During Publication', () => {
    it('should prevent modification of published models', () => {
      // Arrange
      addValidWorkflowNodes(model);
      model.publish();
      expect(model.status).toBe(ModelStatus.PUBLISHED);

      // Create a new node to attempt adding
      const newNode = new StageNodeBuilder()
        .withModelId(model.modelId)
        .withName('New Stage')
        .withPosition(300, 300)
        .withDescription('Attempting to add to published model')
        .build();

      // Act
      const result = model.addNode(newNode);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot modify published model');
    });

    it('should prevent removal from published models', () => {
      // Arrange
      addValidWorkflowNodes(model);
      const nodeToRemove = Array.from(model.nodes.values())[0];
      
      model.publish();
      expect(model.status).toBe(ModelStatus.PUBLISHED);

      // Act
      const result = model.removeNode(nodeToRemove.nodeId);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot modify published model');
    });

    it('should maintain model integrity during publication process', async () => {
      // Arrange
      addValidWorkflowNodes(model);
      const originalNodeCount = model.nodes.size;
      const originalUpdateTime = model.updatedAt;

      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 5));

      // Act
      const result = model.publish();

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(model.status).toBe(ModelStatus.PUBLISHED);
      expect(model.nodes.size).toBe(originalNodeCount); // Node count unchanged
      expect(model.updatedAt.getTime()).toBeGreaterThan(originalUpdateTime.getTime()); // Updated timestamp
    });
  });

  describe('Publication Prerequisites', () => {
    it('should require minimum workflow structure', () => {
      // Arrange - Empty model
      expect(model.nodes.size).toBe(0);

      // Act
      const result = model.publish();

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot publish invalid workflow');
    });

    it('should allow publication with valid minimum structure', () => {
      // Arrange
      addValidWorkflowNodes(model);

      // Act
      const result = model.publish();

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(model.status).toBe(ModelStatus.PUBLISHED);
    });

    it('should update timestamp on successful publication', async () => {
      // Arrange
      addValidWorkflowNodes(model);
      const originalTime = model.updatedAt;

      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 5));

      // Act
      const result = model.publish();

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(model.updatedAt.getTime()).toBeGreaterThan(originalTime.getTime());
    });
  });

  describe('Publication Idempotency Rules', () => {
    it('should not change state on repeated publish attempts', () => {
      // Arrange
      addValidWorkflowNodes(model);
      model.publish();
      const firstPublishTime = model.updatedAt;
      const firstStatus = model.status;

      // Act - Try to publish again
      const result = model.publish();

      // Assert
      expect(result.isFailure).toBe(true);
      expect(model.status).toBe(firstStatus);
      expect(model.updatedAt).toEqual(firstPublishTime);
    });

    it('should maintain consistent error messages for invalid state', () => {
      // Arrange
      addValidWorkflowNodes(model);
      model.publish();

      // Act - Multiple attempts should return same error
      const result1 = model.publish();
      const result2 = model.publish();

      // Assert
      expect(result1.isFailure).toBe(true);
      expect(result2.isFailure).toBe(true);
      expect(result1.error).toBe(result2.error);
    });
  });

  // Helper function to add minimum valid workflow nodes
  function addValidWorkflowNodes(model: FunctionModel): void {
    // Add input node
    const inputNode = new IONodeBuilder()
      .withId(getTestUUID('input-pub-' + Date.now()))
      .withModelId(model.modelId)
      .withName('Input Node')
      .withPosition(50, 100)
      .asInput()
      .build();

    // Add output node
    const outputNode = new IONodeBuilder()
      .withId(getTestUUID('output-pub-' + Date.now()))
      .withModelId(model.modelId)
      .withName('Output Node')
      .withPosition(250, 100)
      .asOutput()
      .build();

    // Add nodes to model
    const addInputResult = model.addNode(inputNode);
    if (addInputResult.isFailure) throw new Error('Failed to add input node to model');

    const addOutputResult = model.addNode(outputNode);
    if (addOutputResult.isFailure) throw new Error('Failed to add output node to model');
  }
});