import { ModelVersioningService, ModelChanges, VersionComparison } from '@/lib/domain/services/model-versioning-service';
import { FunctionModel } from '@/lib/domain/entities/function-model';
import { Version } from '@/lib/domain/value-objects/version';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { ModelName } from '@/lib/domain/value-objects/model-name';
import { IONode } from '@/lib/domain/entities/io-node';
import { Position } from '@/lib/domain/value-objects/position';
import { Result } from '@/lib/domain/shared/result';
import { ModelStatus, ExecutionMode, NodeStatus } from '@/lib/domain/enums';

describe('ModelVersioningService', () => {
  let service: ModelVersioningService;
  let baseModel: FunctionModel;

  // Helper function to create valid FunctionModel for testing
  const createTestModel = (modelName: string, versionStr: string, overrides: any = {}) => {
    const modelId = NodeId.generate();
    const name = ModelName.create(modelName).value!;
    const version = Version.create(versionStr).value!;
    
    // Create a basic IO node to satisfy validation requirements
    const nodeId = NodeId.generate();
    const position = Position.create(0, 0).value!;
    const ioNodeResult = IONode.create({
      nodeId,
      modelId: modelId.value,
      name: 'Test Input',
      description: 'Test input node',
      position,
      dependencies: [],
      executionType: ExecutionMode.SEQUENTIAL,
      status: NodeStatus.ACTIVE,
      metadata: {},
      visualProperties: {},
      ioData: {
        boundaryType: 'input',
        inputDataContract: {}
      }
    });
    
    if (ioNodeResult.isFailure) {
      throw new Error(`Failed to create IONode: ${ioNodeResult.error}`);
    }
    const ioNode = ioNodeResult.value;
    
    const nodes = new Map();
    nodes.set(nodeId.value, ioNode);
    
    return FunctionModel.create({
      modelId: modelId.value,
      name,
      version,
      status: ModelStatus.DRAFT,
      currentVersion: version,
      nodes,
      actionNodes: new Map(),
      description: `Test model - ${modelName}`,
      metadata: { category: 'test' },
      permissions: {},
      ...overrides
    }).value!;
  };

  beforeEach(() => {
    service = new ModelVersioningService();
    baseModel = createTestModel('Test Model', '1.0.0');
  });

  describe('Version Creation', () => {
    it('should create major version successfully', async () => {
      const result = await service.createVersion(baseModel, 'major');
      
      expect(result.isSuccess).toBe(true);
      const newVersion = result.value;
      expect(newVersion.major).toBe(2);
      expect(newVersion.minor).toBe(0);
      expect(newVersion.patch).toBe(0);
    });

    it('should create minor version successfully', async () => {
      const result = await service.createVersion(baseModel, 'minor');
      
      expect(result.isSuccess).toBe(true);
      const newVersion = result.value;
      expect(newVersion.major).toBe(1);
      expect(newVersion.minor).toBe(1);
      expect(newVersion.patch).toBe(0);
    });

    it('should create patch version successfully', async () => {
      const result = await service.createVersion(baseModel, 'patch');
      
      expect(result.isSuccess).toBe(true);
      const newVersion = result.value;
      expect(newVersion.major).toBe(1);
      expect(newVersion.minor).toBe(0);
      expect(newVersion.patch).toBe(1);
    });

    it('should reject invalid version type', async () => {
      const result = await service.createVersion(baseModel, 'invalid' as any);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid version type. Must be major, minor, or patch');
    });

    it('should handle version creation from higher starting version', async () => {
      // Create model with higher starting version
      const highVersionModel = createTestModel('High Version Model', '2.5.3');

      const majorResult = await service.createVersion(highVersionModel, 'major');
      const minorResult = await service.createVersion(highVersionModel, 'minor');
      const patchResult = await service.createVersion(highVersionModel, 'patch');

      expect(majorResult.value!.toString()).toBe('3.0.0');
      expect(minorResult.value!.toString()).toBe('2.6.0');
      expect(patchResult.value!.toString()).toBe('2.5.4');
    });

    it('should handle models with prerelease versions', async () => {
      const prereleaseModel = createTestModel('Prerelease Model', '1.0.0-alpha.1');

      const result = await service.createVersion(prereleaseModel, 'patch');
      
      expect(result.isSuccess).toBe(true);
      expect(result.value!.toString()).toBe('1.0.1');
    });
  });

  describe('Version Comparison', () => {
    it('should correctly identify newer version', () => {
      const v1 = Version.create('2.0.0').value!;
      const v2 = Version.create('1.0.0').value!;
      
      const comparison = service.compareVersions(v1, v2);
      
      expect(comparison.isNewer).toBe(true);
      expect(comparison.isOlder).toBe(false);
      expect(comparison.isEqual).toBe(false);
      expect(comparison.difference).toBeGreaterThan(0);
    });

    it('should correctly identify older version', () => {
      const v1 = Version.create('1.0.0').value!;
      const v2 = Version.create('2.0.0').value!;
      
      const comparison = service.compareVersions(v1, v2);
      
      expect(comparison.isNewer).toBe(false);
      expect(comparison.isOlder).toBe(true);
      expect(comparison.isEqual).toBe(false);
      expect(comparison.difference).toBeLessThan(0);
    });

    it('should correctly identify equal versions', () => {
      const v1 = Version.create('1.2.3').value!;
      const v2 = Version.create('1.2.3').value!;
      
      const comparison = service.compareVersions(v1, v2);
      
      expect(comparison.isNewer).toBe(false);
      expect(comparison.isOlder).toBe(false);
      expect(comparison.isEqual).toBe(true);
      expect(comparison.difference).toBe(0);
    });

    it('should handle complex version comparisons', () => {
      const testCases = [
        { v1: '2.0.0', v2: '1.9.9', expectedNewer: true },
        { v1: '1.1.0', v2: '1.0.9', expectedNewer: true },
        { v1: '1.0.1', v2: '1.0.0', expectedNewer: true },
        { v1: '1.0.0-alpha', v2: '1.0.0', expectedNewer: false },
        { v1: '1.0.0', v2: '1.0.0-beta', expectedNewer: true }
      ];

      testCases.forEach(({ v1, v2, expectedNewer }) => {
        const version1 = Version.create(v1).value!;
        const version2 = Version.create(v2).value!;
        const comparison = service.compareVersions(version1, version2);
        
        expect(comparison.isNewer).toBe(expectedNewer);
      });
    });
  });

  describe('Model Comparison', () => {
    it('should detect no changes between identical models', () => {
      const comparison = service.compareModels(baseModel, baseModel);
      
      expect(comparison.isSuccess).toBe(true);
      const changes = comparison.value;
      expect(changes.addedNodes).toHaveLength(0);
      expect(changes.removedNodes).toHaveLength(0);
      expect(changes.modifiedNodes).toHaveLength(0);
      expect(changes.addedActionNodes).toHaveLength(0);
      expect(changes.removedActionNodes).toHaveLength(0);
      expect(changes.modifiedActionNodes).toHaveLength(0);
      expect(Object.keys(changes.metadataChanges)).toHaveLength(0);
    });

    it('should detect added nodes', () => {
      // Create model with additional node
      const modelId = NodeId.generate();
      const modelName = ModelName.create('Modified Model').value!;
      const version = Version.create('1.0.0').value!;
      
      const modifiedModel = FunctionModel.create({
        modelId: modelId.value,
        name: modelName,
        version,
        status: ModelStatus.DRAFT,
        currentVersion: version,
        nodes: new Map(),
        actionNodes: new Map(),
        description: 'Modified model',
        metadata: { category: 'test' },
        permissions: {}
      }).value!;

      // Add a node to the modified model
      const nodeId = NodeId.generate();
      const position = Position.create(100, 100).value!;
      const newNode = IONode.create({
        nodeId,
        modelId: modelId.value,
        name: 'New Input Node',
        description: 'New input node',
        position,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.ACTIVE,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: 'input',
          inputDataContract: { schema: {} }
        }
      }).value!;

      modifiedModel.addNode(newNode);

      const comparison = service.compareModels(baseModel, modifiedModel);
      
      expect(comparison.isSuccess).toBe(true);
      const changes = comparison.value;
      expect(changes.addedNodes).toHaveLength(1);
      expect(changes.addedNodes[0]).toBe(nodeId.value);
    });

    it('should detect removed nodes', () => {
      // Create base model with a node
      const nodeId = NodeId.generate();
      const position = Position.create(100, 100).value!;
      const node = IONode.create({
        nodeId,
        modelId: baseModel.modelId,
        name: 'Input Node',
        description: 'Input node',
        position,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.ACTIVE,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: 'input',
          inputDataContract: { schema: {} }
        }
      }).value!;

      baseModel.addNode(node);

      // Create comparison model without the node
      const modelId = NodeId.generate();
      const modelName = ModelName.create('Modified Model').value!;
      const version = Version.create('1.0.0').value!;
      
      const modifiedModel = FunctionModel.create({
        modelId: modelId.value,
        name: modelName,
        version,
        status: ModelStatus.DRAFT,
        currentVersion: version,
        nodes: new Map(),
        actionNodes: new Map(),
        description: 'Modified model',
        metadata: { category: 'test' },
        permissions: {}
      }).value!;

      const comparison = service.compareModels(baseModel, modifiedModel);
      
      expect(comparison.isSuccess).toBe(true);
      const changes = comparison.value;
      expect(changes.removedNodes).toHaveLength(2); // baseModel has 2 nodes: one from helper + one we added
      expect(changes.removedNodes).toContain(nodeId.value);
    });

    it('should detect metadata changes', () => {
      // Create model with different metadata
      const modelId = NodeId.generate();
      const modelName = ModelName.create('Modified Model').value!;
      const version = Version.create('1.0.0').value!;
      
      const modifiedModel = FunctionModel.create({
        modelId: modelId.value,
        name: modelName,
        version,
        status: ModelStatus.DRAFT,
        currentVersion: version,
        nodes: new Map(),
        actionNodes: new Map(),
        description: 'Modified model',
        metadata: { 
          category: 'production', // Changed from 'test'
          newField: 'added value'  // Added field
        },
        permissions: {}
      }).value!;

      const comparison = service.compareModels(baseModel, modifiedModel);
      
      expect(comparison.isSuccess).toBe(true);
      const changes = comparison.value;
      expect(Object.keys(changes.metadataChanges)).toContain('category');
      expect(Object.keys(changes.metadataChanges)).toContain('newField');
    });

    it('should handle complex model differences', () => {
      // Create base model with nodes
      const baseNodeId = NodeId.generate();
      const basePosition = Position.create(100, 100).value!;
      const baseNode = IONode.create({
        nodeId: baseNodeId,
        modelId: baseModel.modelId,
        name: 'Base Node',
        description: 'Base node',
        position: basePosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.ACTIVE,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: 'input',
          inputDataContract: { schema: {} }
        }
      }).value!;

      baseModel.addNode(baseNode);

      // Create modified model with different nodes
      const modelId = NodeId.generate();
      const modelName = ModelName.create('Complex Modified Model').value!;
      const version = Version.create('1.0.0').value!;
      
      const modifiedModel = FunctionModel.create({
        modelId: modelId.value,
        name: modelName,
        version,
        status: ModelStatus.DRAFT,
        currentVersion: version,
        nodes: new Map(),
        actionNodes: new Map(),
        description: 'Complex modified model',
        metadata: { 
          category: 'production',
          complexity: 'high'
        },
        permissions: {}
      }).value!;

      // Add different node
      const newNodeId = NodeId.generate();
      const newPosition = Position.create(200, 200).value!;
      const newNode = IONode.create({
        nodeId: newNodeId,
        modelId: modelId.value,
        name: 'New Node',
        description: 'New node',
        position: newPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.ACTIVE,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: 'output',
          outputDataContract: { schema: { type: 'object' } }
        }
      }).value!;

      modifiedModel.addNode(newNode);

      const comparison = service.compareModels(baseModel, modifiedModel);
      
      expect(comparison.isSuccess).toBe(true);
      const changes = comparison.value;
      
      // Should detect removed nodes (baseModel has 2: original + added) and one added node (new)
      expect(changes.removedNodes).toHaveLength(2); // baseModel has 2 nodes total
      expect(changes.addedNodes).toHaveLength(1);
      expect(changes.removedNodes).toContain(baseNodeId.value);
      expect(changes.addedNodes[0]).toBe(newNodeId.value);
      
      // Should detect metadata changes
      expect(Object.keys(changes.metadataChanges)).toContain('category');
      expect(Object.keys(changes.metadataChanges)).toContain('complexity');
    });
  });

  describe('Version Validation', () => {
    it('should allow valid version increments', () => {
      const currentVersion = Version.create('1.2.3').value!;
      const model = FunctionModel.create({
        modelId: NodeId.generate().value,
        name: ModelName.create('Test Model').value!,
        version: currentVersion,
        status: ModelStatus.DRAFT,
        currentVersion: currentVersion,
        nodes: new Map(),
        actionNodes: new Map(),
        description: 'Test',
        metadata: {},
        permissions: {}
      }).value!;

      const validTargets = [
        Version.create('2.0.0').value!, // Major increment
        Version.create('1.3.0').value!, // Minor increment
        Version.create('1.2.4').value!  // Patch increment
      ];

      validTargets.forEach(targetVersion => {
        const result = service.canCreateVersion(model, targetVersion);
        expect(result.isSuccess).toBe(true);
      });
    });

    it('should reject older target versions', () => {
      const currentVersion = Version.create('2.0.0').value!;
      const model = FunctionModel.create({
        modelId: NodeId.generate().value,
        name: ModelName.create('Test Model').value!,
        version: currentVersion,
        status: ModelStatus.DRAFT,
        currentVersion: currentVersion,
        nodes: new Map(),
        actionNodes: new Map(),
        description: 'Test',
        metadata: {},
        permissions: {}
      }).value!;

      const olderVersion = Version.create('1.9.9').value!;
      const result = service.canCreateVersion(model, olderVersion);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Target version must be newer than current version');
    });

    it('should reject equal target versions', () => {
      const currentVersion = Version.create('1.2.3').value!;
      const model = FunctionModel.create({
        modelId: NodeId.generate().value,
        name: ModelName.create('Test Model').value!,
        version: currentVersion,
        status: ModelStatus.DRAFT,
        currentVersion: currentVersion,
        nodes: new Map(),
        actionNodes: new Map(),
        description: 'Test',
        metadata: {},
        permissions: {}
      }).value!;

      const sameVersion = Version.create('1.2.3').value!;
      const result = service.canCreateVersion(model, sameVersion);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Target version must be newer than current version');
    });

    it('should reject major version with non-zero minor/patch', () => {
      const currentVersion = Version.create('1.0.0').value!;
      const model = FunctionModel.create({
        modelId: NodeId.generate().value,
        name: ModelName.create('Test Model').value!,
        version: currentVersion,
        status: ModelStatus.DRAFT,
        currentVersion: currentVersion,
        nodes: new Map(),
        actionNodes: new Map(),
        description: 'Test',
        metadata: {},
        permissions: {}
      }).value!;

      const invalidMajor = Version.create('2.1.0').value!;
      const result = service.canCreateVersion(model, invalidMajor);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Major version increment should reset minor and patch to 0');
    });

    it('should reject minor version with non-zero patch', () => {
      const currentVersion = Version.create('1.0.0').value!;
      const model = FunctionModel.create({
        modelId: NodeId.generate().value,
        name: ModelName.create('Test Model').value!,
        version: currentVersion,
        status: ModelStatus.DRAFT,
        currentVersion: currentVersion,
        nodes: new Map(),
        actionNodes: new Map(),
        description: 'Test',
        metadata: {},
        permissions: {}
      }).value!;

      const invalidMinor = Version.create('1.1.1').value!;
      const result = service.canCreateVersion(model, invalidMinor);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Minor version increment should reset patch to 0');
    });

    it('should reject skipped version numbers', () => {
      const currentVersion = Version.create('1.0.0').value!;
      const model = FunctionModel.create({
        modelId: NodeId.generate().value,
        name: ModelName.create('Test Model').value!,
        version: currentVersion,
        status: ModelStatus.DRAFT,
        currentVersion: currentVersion,
        nodes: new Map(),
        actionNodes: new Map(),
        description: 'Test',
        metadata: {},
        permissions: {}
      }).value!;

      const skippedVersions = [
        Version.create('3.0.0').value!, // Skipped major
        Version.create('1.2.0').value!, // Skipped minor
        Version.create('1.0.2').value!  // Skipped patch
      ];

      skippedVersions.forEach(targetVersion => {
        const result = service.canCreateVersion(model, targetVersion);
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Cannot skip version numbers');
      });
    });
  });

  describe('Model Merging', () => {
    it('should indicate merge not implemented', () => {
      const changes: ModelChanges = {
        addedNodes: ['node1'],
        removedNodes: [],
        modifiedNodes: [],
        addedActionNodes: [],
        removedActionNodes: [],
        modifiedActionNodes: [],
        metadataChanges: {}
      };

      const result = service.mergeChanges(baseModel, changes);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Model merging not yet implemented - requires complex state reconstruction');
    });
  });

  describe('Version History', () => {
    it('should return empty version history', async () => {
      const result = await service.getVersionHistory('test-model-id');
      
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('should handle version history for any model ID', async () => {
      const modelIds = ['model-1', 'model-2', 'non-existent-model'];
      
      for (const modelId of modelIds) {
        const result = await service.getVersionHistory(modelId);
        expect(result.isSuccess).toBe(true);
        expect(Array.isArray(result.value)).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid model gracefully', async () => {
      // Create an invalid model by manipulating its state
      const invalidModel = { ...baseModel } as any;
      delete invalidModel.validateWorkflow;

      const result = await service.createVersion(invalidModel, 'major');
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Failed to create version:');
    });

    it('should handle comparison errors gracefully', () => {
      const invalidModel = { nodes: null, actionNodes: null, metadata: null } as any;
      
      const result = service.compareModels(baseModel, invalidModel);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Failed to compare models:');
    });
  });

  describe('Business Logic Integration', () => {
    it('should create versions for models with validation', async () => {
      // Add nodes to create a more complex model
      const inputNodeId = NodeId.generate();
      const outputNodeId = NodeId.generate();
      const inputPosition = Position.create(100, 100).value!;
      const outputPosition = Position.create(300, 100).value!;

      const inputNode = IONode.create({
        nodeId: inputNodeId,
        modelId: baseModel.modelId.toString(),
        name: 'Input',
        description: 'Test input node',
        position: inputPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.ACTIVE,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: 'input',
          inputDataContract: { schema: {} }
        }
      }).value!;

      const outputNode = IONode.create({
        nodeId: outputNodeId,
        modelId: baseModel.modelId.toString(),
        name: 'Output',
        description: 'Test output node',
        position: outputPosition,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.ACTIVE,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: 'output',
          outputDataContract: { schema: {} }
        }
      }).value!;

      baseModel.addNode(inputNode);
      baseModel.addNode(outputNode);

      const result = await service.createVersion(baseModel, 'minor');
      
      expect(result.isSuccess).toBe(true);
      expect(result.value!.toString()).toBe('1.1.0');
    });

    it('should handle complex model state transitions', async () => {
      // Test version creation through multiple iterations
      const versionHistory: string[] = [];

      const iterations = [
        { type: 'patch', expected: '1.0.1' },
        { type: 'patch', expected: '1.0.2' },
        { type: 'minor', expected: '1.1.0' },
        { type: 'patch', expected: '1.1.1' },
        { type: 'major', expected: '2.0.0' }
      ];

      // Just test that version increments work correctly in sequence
      // using the existing baseModel which has version 1.0.0
      for (const { type, expected } of iterations) {
        const result = await service.createVersion(baseModel, type as any);
        expect(result.isSuccess).toBe(true);
        
        const newVersion = result.value!;
        expect(newVersion.toString()).toBe(expected);
        versionHistory.push(newVersion.toString());
        
        // Update the baseModel's version for next iteration
        // This simulates how the model version would be updated
        (baseModel as any).props.version = newVersion;
        (baseModel as any).props.currentVersion = newVersion;
      }

      expect(versionHistory).toEqual(['1.0.1', '1.0.2', '1.1.0', '1.1.1', '2.0.0']);
    });
  });

  describe('Metadata Change Detection', () => {
    it('should detect all types of metadata changes', () => {
      const baseMetadata = {
        category: 'test',
        version: '1.0.0',
        tags: ['tag1', 'tag2'],
        config: { setting1: 'value1' }
      };

      const modifiedMetadata = {
        category: 'production', // Modified
        tags: ['tag1', 'tag3'],  // Modified array
        config: { setting1: 'newValue', setting2: 'value2' }, // Modified nested object
        newField: 'added'        // Added field
        // version removed
      };

      const baseModelId = NodeId.generate().value;
      const baseModelName = ModelName.create('Base Model').value!;
      const version = Version.create('1.0.0').value!;
      
      const baseModelWithMetadata = FunctionModel.create({
        modelId: baseModelId,
        name: baseModelName,
        version,
        status: ModelStatus.DRAFT,
        currentVersion: version,
        nodes: new Map(),
        actionNodes: new Map(),
        description: 'Base model',
        metadata: baseMetadata,
        permissions: {}
      }).value!;

      const modifiedModelId = NodeId.generate().value;
      const modifiedModelName = ModelName.create('Modified Model').value!;
      
      const modifiedModelWithMetadata = FunctionModel.create({
        modelId: modifiedModelId,
        name: modifiedModelName,
        version,
        status: ModelStatus.DRAFT,
        currentVersion: version,
        nodes: new Map(),
        actionNodes: new Map(),
        description: 'Modified model',
        metadata: modifiedMetadata,
        permissions: {}
      }).value!;

      const comparison = service.compareModels(baseModelWithMetadata, modifiedModelWithMetadata);
      
      expect(comparison.isSuccess).toBe(true);
      const changes = comparison.value.metadataChanges;
      
      expect(changes.category).toBeDefined();
      expect(changes.category.type).toBe('added_or_modified');
      expect(changes.category.value).toBe('production');
      
      expect(changes.newField).toBeDefined();
      expect(changes.newField.type).toBe('added_or_modified');
      
      expect(changes.version).toBeDefined();
      expect(changes.version.type).toBe('removed');
    });
  });
});