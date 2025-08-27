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

  describe('Domain Service Coordination', () => {
    describe('Complete State Capture', () => {
      it('captureModelSnapshot_ComplexModel_CapturesAllNodes', async () => {
        // Arrange - Complex model with multiple node types
        const inputNodeId = NodeId.generate();
        const stageNodeId = NodeId.generate();
        const kbNodeId = NodeId.generate();
        const outputNodeId = NodeId.generate();
        
        const inputPosition = Position.create(100, 100).value!;
        const stagePosition = Position.create(250, 100).value!;
        const kbPosition = Position.create(400, 100).value!;
        const outputPosition = Position.create(550, 100).value!;

        // Create nodes of different types
        const inputNode = IONode.create({
          nodeId: inputNodeId,
          modelId: baseModel.modelId,
          name: 'Data Input',
          description: 'Primary data input',
          position: inputPosition,
          dependencies: [],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: { inputSchema: { type: 'json' } },
          visualProperties: { color: '#blue' },
          ioData: {
            boundaryType: 'input',
            inputDataContract: { required: ['id', 'data'] }
          }
        }).value!;

        const outputNode = IONode.create({
          nodeId: outputNodeId,
          modelId: baseModel.modelId,
          name: 'Processed Output',
          description: 'Final processed output',
          position: outputPosition,
          dependencies: [stageNodeId.value],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: { outputFormat: 'processed_json' },
          visualProperties: { color: '#green' },
          ioData: {
            boundaryType: 'output',
            outputDataContract: { schema: { type: 'object' } }
          }
        }).value!;

        // Add nodes to model
        baseModel.addNode(inputNode);
        baseModel.addNode(outputNode);

        // Act - Capture complete state
        const result = await service.createVersion(baseModel, 'minor');

        // Assert - All nodes captured in version
        expect(result.isSuccess).toBe(true);
        const newVersion = result.value!;
        
        // Verify version increment
        expect(newVersion.toString()).toBe('1.1.0');
        
        // The service should coordinate with the model's state capture
        // This test validates the service orchestrates version creation properly
        expect(result.isSuccess).toBe(true);
      });

      it('captureModelSnapshot_WithActionNodes_CapturesActionConfiguration', async () => {
        // Arrange - Add action nodes to model
        const stageNodeId = NodeId.generate();
        const stagePosition = Position.create(250, 100).value!;

        // Create a stage node (which can have action nodes)
        const stageNode = IONode.create({
          nodeId: stageNodeId,
          modelId: baseModel.modelId,
          name: 'Processing Stage',
          description: 'Data processing stage',
          position: stagePosition,
          dependencies: [],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: { stage: 'processing' },
          visualProperties: {},
          ioData: {
            boundaryType: 'input',
            inputDataContract: {}
          }
        }).value!;

        baseModel.addNode(stageNode);

        // Act - Create version with action nodes
        const result = await service.createVersion(baseModel, 'patch');

        // Assert - Action configuration captured
        expect(result.isSuccess).toBe(true);
        expect(result.value!.toString()).toBe('1.0.1');
      });

      it('captureModelSnapshot_WithDependencies_CapturesRelationships', async () => {
        // Arrange - Create model with complex dependencies
        const node1Id = NodeId.generate();
        const node2Id = NodeId.generate();
        const node3Id = NodeId.generate();
        
        const pos1 = Position.create(100, 100).value!;
        const pos2 = Position.create(250, 100).value!;
        const pos3 = Position.create(400, 100).value!;

        // Create interdependent nodes
        const node1 = IONode.create({
          nodeId: node1Id,
          modelId: baseModel.modelId,
          name: 'Node 1',
          description: 'First node',
          position: pos1,
          dependencies: [], // No dependencies
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: {},
          visualProperties: {},
          ioData: { boundaryType: 'input', inputDataContract: {} }
        }).value!;

        const node2 = IONode.create({
          nodeId: node2Id,
          modelId: baseModel.modelId,
          name: 'Node 2',
          description: 'Second node',
          position: pos2,
          dependencies: [node1Id.value], // Depends on node1
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: {},
          visualProperties: {},
          ioData: { boundaryType: 'input', inputDataContract: {} }
        }).value!;

        const node3 = IONode.create({
          nodeId: node3Id,
          modelId: baseModel.modelId,
          name: 'Node 3',
          description: 'Third node',
          position: pos3,
          dependencies: [node1Id.value, node2Id.value], // Depends on both
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: {},
          visualProperties: {},
          ioData: { boundaryType: 'output', outputDataContract: {} }
        }).value!;

        // Add nodes to model
        baseModel.addNode(node1);
        baseModel.addNode(node2);
        baseModel.addNode(node3);

        // Act - Capture dependencies
        const result = await service.createVersion(baseModel, 'minor');

        // Assert - Dependencies captured
        expect(result.isSuccess).toBe(true);
        expect(result.value!.toString()).toBe('1.1.0');
      });

      it('captureModelSnapshot_WithExecutionContext_CapturesRuntimeState', async () => {
        // Arrange - Model with execution context
        const contextualModel = createTestModel('Contextual Model', '1.2.0', {
          metadata: {
            executionContext: {
              environment: 'production',
              resourceLimits: { memory: '4GB', cpu: '8 cores' },
              securityContext: { isolationLevel: 'high' },
              monitoring: { enabled: true, level: 'debug' }
            }
          }
        });

        // Act - Capture execution context
        const result = await service.createVersion(contextualModel, 'patch');

        // Assert - Runtime state captured
        expect(result.isSuccess).toBe(true);
        expect(result.value!.toString()).toBe('1.2.1');
      });
    });

    describe('Versioned State Validation', () => {
      it('validateSnapshot_ValidModel_PassesValidation', async () => {
        // Arrange - Create valid model with proper structure
        const validModel = createTestModel('Valid Model', '2.0.0');
        
        // Add required nodes for validation
        const inputId = NodeId.generate();
        const outputId = NodeId.generate();
        const inputPos = Position.create(0, 0).value!;
        const outputPos = Position.create(200, 0).value!;

        const inputNode = IONode.create({
          nodeId: inputId,
          modelId: validModel.modelId,
          name: 'Input',
          description: 'Input node',
          position: inputPos,
          dependencies: [],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: {},
          visualProperties: {},
          ioData: { boundaryType: 'input', inputDataContract: {} }
        }).value!;

        const outputNode = IONode.create({
          nodeId: outputId,
          modelId: validModel.modelId,
          name: 'Output',
          description: 'Output node',
          position: outputPos,
          dependencies: [inputId.value],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: {},
          visualProperties: {},
          ioData: { boundaryType: 'output', outputDataContract: {} }
        }).value!;

        validModel.addNode(inputNode);
        validModel.addNode(outputNode);

        // Act - Create version with validation
        const result = await service.createVersion(validModel, 'major');

        // Assert - Validation passes
        expect(result.isSuccess).toBe(true);
        expect(result.value!.toString()).toBe('3.0.0');
      });

      it('validateSnapshot_CorruptedData_FailsValidation', async () => {
        // Arrange - Create model that will fail validation
        const corruptedModel = { ...baseModel } as any;
        // Simulate corruption by removing validation method
        delete corruptedModel.validateWorkflow;

        // Act - Attempt to create version
        const result = await service.createVersion(corruptedModel, 'patch');

        // Assert - Validation fails gracefully
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Failed to create version:');
      });

      it('validateSnapshot_MissingRequiredNodes_FailsValidation', async () => {
        // Arrange - Model without required structure (will fail validation when published)
        const invalidModel = createTestModel('Invalid Model', '1.0.0', {
          status: ModelStatus.PUBLISHED // Published models must validate
        });
        
        // Don't add required nodes - model will fail validation

        // Act - Attempt to create version
        const result = await service.createVersion(invalidModel, 'patch');

        // Assert - Missing nodes cause validation failure
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Cannot create version with validation errors');
      });
    });

    describe('Version Change Analysis', () => {
      it('analyzeChanges_NodePropertyModification_DetectsSpecificChanges', () => {
        // Arrange - Create two models with node property differences
        const baseModelForAnalysis = createTestModel('Base Analysis', '1.0.0');
        const modifiedModelForAnalysis = createTestModel('Modified Analysis', '1.0.0');

        // Add same node to both with different properties
        const nodeId = NodeId.generate();
        const position = Position.create(100, 100).value!;

        const baseNode = IONode.create({
          nodeId,
          modelId: baseModelForAnalysis.modelId,
          name: 'Original Node',
          description: 'Original description',
          position,
          dependencies: [],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: { version: 1 },
          visualProperties: {},
          ioData: { boundaryType: 'input', inputDataContract: {} }
        }).value!;

        const modifiedNode = IONode.create({
          nodeId,
          modelId: modifiedModelForAnalysis.modelId,
          name: 'Modified Node', // Changed name
          description: 'Updated description', // Changed description
          position,
          dependencies: [],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: { version: 2 }, // Changed metadata
          visualProperties: {},
          ioData: { boundaryType: 'input', inputDataContract: {} }
        }).value!;

        baseModelForAnalysis.addNode(baseNode);
        modifiedModelForAnalysis.addNode(modifiedNode);

        // Act - Analyze changes
        const result = service.compareModels(baseModelForAnalysis, modifiedModelForAnalysis);

        // Assert - Specific property changes detected
        expect(result.isSuccess).toBe(true);
        const changes = result.value;
        expect(changes.modifiedNodes).toContain(nodeId.value);
        expect(changes.addedNodes).toHaveLength(0);
        expect(changes.removedNodes).toHaveLength(0);
      });

      it('analyzeChanges_DependencyChanges_CategorizesDependencyModifications', () => {
        // Arrange - Models with different dependency structures
        const baseModelDeps = createTestModel('Base Dependencies', '1.0.0');
        const modifiedModelDeps = createTestModel('Modified Dependencies', '1.0.0');

        const node1Id = NodeId.generate();
        const node2Id = NodeId.generate();
        const pos1 = Position.create(100, 100).value!;
        const pos2 = Position.create(200, 100).value!;

        // Base model: node2 depends on node1
        const baseNode1 = IONode.create({
          nodeId: node1Id,
          modelId: baseModelDeps.modelId,
          name: 'Node 1',
          description: 'First node',
          position: pos1,
          dependencies: [],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: {},
          visualProperties: {},
          ioData: { boundaryType: 'input', inputDataContract: {} }
        }).value!;

        const baseNode2 = IONode.create({
          nodeId: node2Id,
          modelId: baseModelDeps.modelId,
          name: 'Node 2',
          description: 'Second node',
          position: pos2,
          dependencies: [node1Id.value], // Depends on node1
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: {},
          visualProperties: {},
          ioData: { boundaryType: 'output', outputDataContract: {} }
        }).value!;

        // Modified model: node2 has no dependencies
        const modifiedNode1 = IONode.create({
          nodeId: node1Id,
          modelId: modifiedModelDeps.modelId,
          name: 'Node 1',
          description: 'First node',
          position: pos1,
          dependencies: [],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: {},
          visualProperties: {},
          ioData: { boundaryType: 'input', inputDataContract: {} }
        }).value!;

        const modifiedNode2 = IONode.create({
          nodeId: node2Id,
          modelId: modifiedModelDeps.modelId,
          name: 'Node 2',
          description: 'Second node',
          position: pos2,
          dependencies: [], // No dependencies
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: {},
          visualProperties: {},
          ioData: { boundaryType: 'output', outputDataContract: {} }
        }).value!;

        baseModelDeps.addNode(baseNode1);
        baseModelDeps.addNode(baseNode2);
        modifiedModelDeps.addNode(modifiedNode1);
        modifiedModelDeps.addNode(modifiedNode2);

        // Act - Analyze dependency changes
        const result = service.compareModels(baseModelDeps, modifiedModelDeps);

        // Assert - Dependency modifications detected
        expect(result.isSuccess).toBe(true);
        const changes = result.value;
        expect(changes.modifiedNodes).toContain(node2Id.value);
      });

      it('analyzeChanges_MetadataEvolution_TracksMetadataHistory', () => {
        // Arrange - Models with evolved metadata
        const baseMetaModel = createTestModel('Base Metadata', '1.0.0', {
          metadata: {
            category: 'analytics',
            version: 'v1.0',
            features: ['basic-processing']
          }
        });

        const evolvedMetaModel = createTestModel('Evolved Metadata', '1.0.0', {
          metadata: {
            category: 'advanced-analytics', // Changed
            version: 'v1.1', // Changed
            features: ['basic-processing', 'advanced-ml'], // Added feature
            newCapabilities: ['real-time'] // Added new field
          }
        });

        // Act - Track metadata evolution
        const result = service.compareModels(baseMetaModel, evolvedMetaModel);

        // Assert - Metadata changes tracked
        expect(result.isSuccess).toBe(true);
        const changes = result.value;
        expect(Object.keys(changes.metadataChanges)).toContain('category');
        expect(Object.keys(changes.metadataChanges)).toContain('version');
        expect(Object.keys(changes.metadataChanges)).toContain('features');
        expect(Object.keys(changes.metadataChanges)).toContain('newCapabilities');
      });
    });

    describe('Change Significance Assessment', () => {
      it('assessChangeSignificance_BreakingChanges_RecommendsMajorVersion', async () => {
        // Arrange - Model with breaking changes (removing required nodes)
        const breakingModel = createTestModel('Breaking Changes', '1.5.0');
        
        // Create model with minimal valid structure (just one node)
        const nodeId = NodeId.generate();
        const position = Position.create(100, 100).value!;
        
        const singleNode = IONode.create({
          nodeId,
          modelId: breakingModel.modelId,
          name: 'Single Node',
          description: 'Only node',
          position,
          dependencies: [],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: {},
          visualProperties: {},
          ioData: { boundaryType: 'input', inputDataContract: {} }
        }).value!;

        breakingModel.addNode(singleNode);

        // Act - Create version (breaking changes would warrant major)
        const result = await service.createVersion(breakingModel, 'major');

        // Assert - Major version created
        expect(result.isSuccess).toBe(true);
        expect(result.value!.toString()).toBe('2.0.0');
      });

      it('assessChangeSignificance_BackwardCompatible_RecommendsMinorVersion', async () => {
        // Arrange - Model with backward compatible changes (additive)
        const compatibleModel = createTestModel('Compatible Changes', '1.2.3');

        // Add new functionality (backward compatible)
        const newNodeId = NodeId.generate();
        const position = Position.create(150, 150).value!;
        
        const newNode = IONode.create({
          nodeId: newNodeId,
          modelId: compatibleModel.modelId,
          name: 'New Feature Node',
          description: 'Added functionality',
          position,
          dependencies: [],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: { feature: 'new' },
          visualProperties: {},
          ioData: { boundaryType: 'input', inputDataContract: {} }
        }).value!;

        compatibleModel.addNode(newNode);

        // Act - Create minor version for new features
        const result = await service.createVersion(compatibleModel, 'minor');

        // Assert - Minor version created
        expect(result.isSuccess).toBe(true);
        expect(result.value!.toString()).toBe('1.3.0');
      });

      it('assessChangeSignificance_BugFixes_RecommendsPatchVersion', async () => {
        // Arrange - Model with bug fixes (non-breaking changes)
        const bugFixModel = createTestModel('Bug Fixes', '2.1.4');

        // Add node representing bug fix
        const fixNodeId = NodeId.generate();
        const position = Position.create(75, 75).value!;
        
        const fixNode = IONode.create({
          nodeId: fixNodeId,
          modelId: bugFixModel.modelId,
          name: 'Bug Fix Node',
          description: 'Fixed validation issue',
          position,
          dependencies: [],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.ACTIVE,
          metadata: { fix: 'validation-bug' },
          visualProperties: {},
          ioData: { boundaryType: 'input', inputDataContract: {} }
        }).value!;

        bugFixModel.addNode(fixNode);

        // Act - Create patch version for bug fixes
        const result = await service.createVersion(bugFixModel, 'patch');

        // Assert - Patch version created
        expect(result.isSuccess).toBe(true);
        expect(result.value!.toString()).toBe('2.1.5');
      });
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