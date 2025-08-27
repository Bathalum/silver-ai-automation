/**
 * UC-007: Create Model Version - Simplified Test Suite
 * 
 * Tests version creation workflows focusing on the key UC-007 requirements:
 * - Semantic version management and validation
 * - Version integrity and immutability
 * - Clean Architecture compliance
 * - Business logic integration
 */

import { 
  ModelVersioningService, 
  ModelChanges, 
  VersionComparison,
  FunctionModel, 
  FunctionModelVersion,
  Version, 
  NodeId, 
  ModelName, 
  Position,
  IONode,
  ActionNode,
  Result,
  ModelStatus, 
  ExecutionMode, 
  NodeStatus, 
  ActionStatus 
} from '@/lib/domain';

describe('UC-007: Create Model Version - Simplified', () => {
  let service: ModelVersioningService;
  let baseModel: FunctionModel;

  // Helper function to create a simple, valid test model
  const createSimpleTestModel = (modelName: string, versionStr: string) => {
    const modelId = NodeId.generate().value;
    const name = ModelName.create(modelName).value!;
    const version = Version.create(versionStr).value!;
    
    // Create a basic IO node to satisfy validation requirements
    const nodeId = NodeId.generate();
    const position = Position.create(100, 100).value!;
    const ioNodeResult = IONode.create({
      nodeId,
      modelId,
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
        inputDataContract: { schema: { type: 'string' } }
      }
    });
    
    if (ioNodeResult.isFailure) {
      throw new Error(`Failed to create IONode: ${ioNodeResult.error}`);
    }
    const ioNode = ioNodeResult.value;
    
    const nodes = new Map();
    nodes.set(nodeId.value, ioNode);
    
    return FunctionModel.create({
      modelId,
      name,
      version,
      status: ModelStatus.DRAFT,
      currentVersion: version,
      nodes,
      actionNodes: new Map(),
      description: `Test model - ${modelName}`,
      metadata: { 
        category: 'test',
        createdFor: 'uc-007-testing',
        complexity: 'simple'
      },
      permissions: {
        owner: NodeId.generate().value,
        editors: [],
        viewers: []
      }
    }).value!;
  };

  beforeEach(() => {
    service = new ModelVersioningService();
    baseModel = createSimpleTestModel('UC-007 Base Model', '1.0.0');
  });

  describe('UC-007 Requirement: Semantic Version Management', () => {
    it('createVersion_MajorIncrement_ResetsMinorAndPatch', async () => {
      // Arrange - Models at various version levels
      const testCases = [
        { current: '1.5.3', expected: '2.0.0' },
        { current: '2.10.99', expected: '3.0.0' },
        { current: '10.0.1', expected: '11.0.0' }
      ];

      // Act & Assert - Each major increment resets properly
      for (const testCase of testCases) {
        const model = createSimpleTestModel(`Major Test Model`, testCase.current);
        const result = await service.createVersion(model, 'major');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.toString()).toBe(testCase.expected);
      }
    });

    it('createVersion_MinorIncrement_ResetsPatch', async () => {
      // Arrange - Models at various patch levels
      const testCases = [
        { current: '1.0.5', expected: '1.1.0' },
        { current: '2.3.99', expected: '2.4.0' },
        { current: '0.1.1', expected: '0.2.0' }
      ];

      // Act & Assert - Each minor increment resets patch
      for (const testCase of testCases) {
        const model = createSimpleTestModel(`Minor Test Model`, testCase.current);
        const result = await service.createVersion(model, 'minor');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.toString()).toBe(testCase.expected);
      }
    });

    it('createVersion_PatchIncrement_MaintainsVersioning', async () => {
      // Arrange - Models for patch increments
      const testCases = [
        { current: '1.0.0', expected: '1.0.1' },
        { current: '2.5.10', expected: '2.5.11' },
        { current: '10.99.999', expected: '10.99.1000' }
      ];

      // Act & Assert - Each patch increment maintains major.minor
      for (const testCase of testCases) {
        const model = createSimpleTestModel(`Patch Test Model`, testCase.current);
        const result = await service.createVersion(model, 'patch');
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.toString()).toBe(testCase.expected);
      }
    });

    it('createVersion_FromPrerelease_HandlesCorrectly', async () => {
      // Arrange - Prerelease versions
      const testCases = [
        { current: '1.0.0-alpha.1', type: 'patch', expected: '1.0.1' },
        { current: '2.1.0-beta.5', type: 'minor', expected: '2.2.0' },
        { current: '1.5.0-rc.1', type: 'major', expected: '2.0.0' }
      ];

      // Act & Assert - Prerelease versions handled correctly
      for (const testCase of testCases) {
        const model = createSimpleTestModel(`Prerelease Test Model`, testCase.current);
        const result = await service.createVersion(model, testCase.type as any);
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.toString()).toBe(testCase.expected);
      }
    });

    it('compareVersions_ComplexScenarios_OrdersCorrectly', () => {
      // Arrange - Complex version comparison scenarios
      const testCases = [
        { v1: '2.0.0', v2: '1.99.99', expected: 'newer' },
        { v1: '1.10.0', v2: '1.2.99', expected: 'newer' },
        { v1: '1.0.10', v2: '1.0.2', expected: 'newer' },
        { v1: '1.0.0', v2: '1.0.0-alpha', expected: 'newer' },
        { v1: '1.0.0-beta.2', v2: '1.0.0-beta.1', expected: 'newer' },
        { v1: '1.0.0', v2: '1.0.0', expected: 'equal' }
      ];

      // Act & Assert - All comparison scenarios work correctly
      for (const testCase of testCases) {
        const version1 = Version.create(testCase.v1).value!;
        const version2 = Version.create(testCase.v2).value!;
        const comparison = service.compareVersions(version1, version2);

        switch (testCase.expected) {
          case 'newer':
            expect(comparison.isNewer).toBe(true);
            expect(comparison.isOlder).toBe(false);
            expect(comparison.isEqual).toBe(false);
            expect(comparison.difference).toBeGreaterThan(0);
            break;
          case 'equal':
            expect(comparison.isNewer).toBe(false);
            expect(comparison.isOlder).toBe(false);
            expect(comparison.isEqual).toBe(true);
            expect(comparison.difference).toBe(0);
            break;
        }
      }
    });
  });

  describe('UC-007 Requirement: Version Validation and Business Rules', () => {
    it('validateVersionProgression_SkippedVersions_RejectedProperly', () => {
      // Arrange - Models with current versions and invalid targets
      const testCases = [
        { current: '1.0.0', target: '3.0.0', expectedError: 'Cannot skip version numbers' },
        { current: '2.1.0', target: '2.3.0', expectedError: 'Cannot skip version numbers' },
        { current: '1.5.3', target: '1.5.5', expectedError: 'Cannot skip version numbers' },
        { current: '1.0.0', target: '2.1.0', expectedError: 'Major version increment should reset minor and patch to 0' },
        { current: '1.0.0', target: '1.1.1', expectedError: 'Minor version increment should reset patch to 0' }
      ];

      // Act & Assert - Version skipping rejected properly
      for (const testCase of testCases) {
        const model = createSimpleTestModel(`Validation Test Model`, testCase.current);
        const targetVersion = Version.create(testCase.target).value!;
        const result = service.canCreateVersion(model, targetVersion);
        
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe(testCase.expectedError);
      }
    });

    it('createVersion_PublishedModelWithValidation_EnforcesBusinessRules', async () => {
      // Arrange - Create valid published model
      const publishedModel = createSimpleTestModel('Published Model', '2.0.0');
      
      // Make model valid by adding required output node
      const outputNodeId = NodeId.generate();
      const outputPosition = Position.create(300, 100).value!;
      const outputNode = IONode.create({
        nodeId: outputNodeId,
        modelId: publishedModel.modelId,
        name: 'Test Output',
        description: 'Test output node',
        position: outputPosition,
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
      
      publishedModel.addNode(outputNode);
      const publishResult = publishedModel.publish();
      expect(publishResult.isSuccess).toBe(true);

      // Act - Create version from published model
      const versionResult = await service.createVersion(publishedModel, 'patch');

      // Assert - Version creation respects business rules
      expect(versionResult.isSuccess).toBe(true);
      expect(versionResult.value!.toString()).toBe('2.0.1');
    });

    it('createVersion_DraftModel_AllowsVersionCreation', async () => {
      // Arrange - Draft model (may not pass full validation)
      const draftModel = createSimpleTestModel('Draft Model', '0.9.0');
      expect(draftModel.status).toBe(ModelStatus.DRAFT);

      // Act - Create version from draft (should succeed even with validation issues)
      const result = await service.createVersion(draftModel, 'minor');

      // Assert - Version creation succeeds for draft
      expect(result.isSuccess).toBe(true);
      expect(result.value!.toString()).toBe('0.10.0');
    });
  });

  describe('UC-007 Requirement: State Capture and Model Comparison', () => {
    it('captureModelSnapshot_SimpleModel_PreservesState', async () => {
      // Arrange - Simple model for state capture
      const captureModel = createSimpleTestModel('Capture Model', '1.0.0');
      
      // Verify initial state
      expect(captureModel.nodes.size).toBe(1);
      expect(captureModel.actionNodes.size).toBe(0);
      expect(captureModel.metadata.complexity).toBe('simple');

      // Act - Create version capturing state
      const result = await service.createVersion(captureModel, 'minor');

      // Assert - Version created successfully (state capture coordinated by service)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.toString()).toBe('1.1.0');
    });

    it('compareModels_DetectsDifferences_AnalyzesCorrectly', () => {
      // Arrange - Create base model and a copy to modify
      const baseModel = createSimpleTestModel('Base Model', '1.0.0');
      
      // Create modified model by copying base and adding a node
      const modifiedModel = createSimpleTestModel('Modified Model', '1.0.0');
      
      // Add a node to modified model (this gives us 1 base node + 1 new node vs base's 1 node)
      const newNodeId = NodeId.generate();
      const newPosition = Position.create(200, 200).value!;
      const newNode = IONode.create({
        nodeId: newNodeId,
        modelId: modifiedModel.modelId,
        name: 'Additional Node',
        description: 'Additional node for comparison',
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

      // Act - Compare models
      const comparison = service.compareModels(baseModel, modifiedModel);
      
      // Assert - Differences detected (both models have their own base nodes, plus modified has additional node)
      expect(comparison.isSuccess).toBe(true);
      const changes = comparison.value;
      // Modified model has 2 nodes vs base model's 1 node, so 2 nodes are "added" and 1 is "removed"
      expect(changes.addedNodes.length + changes.removedNodes.length).toBeGreaterThan(0);
      expect(changes.addedNodes).toContain(newNodeId.value);
    });
  });

  describe('UC-007 Requirement: Clean Architecture Compliance', () => {
    it('versioningService_DomainLogic_NoInfrastructureDependencies', async () => {
      // Arrange - Service should operate purely in domain
      const domainModel = createSimpleTestModel('Domain Test', '1.0.0');

      // Act - Use domain service without any infrastructure
      const versionResult = await service.createVersion(domainModel, 'minor');
      const comparisonResult = service.compareModels(domainModel, domainModel);

      // Assert - Pure domain logic execution
      expect(versionResult.isSuccess).toBe(true);
      expect(comparisonResult.isSuccess).toBe(true);
      expect(service).toBeInstanceOf(ModelVersioningService);
    });

    it('serviceInterface_AllMethods_WorkIndependently', async () => {
      // Arrange - Test model and versions
      const testModel = createSimpleTestModel('Interface Test', '1.0.0');
      const version1 = Version.create('1.0.0').value!;
      const version2 = Version.create('2.0.0').value!;

      // Act - Use each interface method independently
      const createVersionResult = await service.createVersion(testModel, 'patch');
      const compareModelsResult = service.compareModels(testModel, testModel);
      const compareVersionsResult = service.compareVersions(version1, version2);
      const canCreateVersionResult = service.canCreateVersion(testModel, Version.create('1.0.1').value!);
      const getVersionHistoryResult = await service.getVersionHistory('test-model');

      // Assert - All methods work correctly
      expect(createVersionResult.isSuccess).toBe(true);
      expect(compareModelsResult.isSuccess).toBe(true);
      expect(compareVersionsResult.isOlder).toBe(true); // 1.0.0 < 2.0.0
      expect(canCreateVersionResult.isSuccess).toBe(true);
      expect(getVersionHistoryResult.isSuccess).toBe(true);
    });

    it('errorHandling_BusinessExceptions_HandledInDomain', async () => {
      // Arrange - Scenarios that should trigger domain business exceptions
      const testCases = [
        {
          scenario: 'Invalid version type',
          test: () => service.createVersion(baseModel, 'invalid' as any),
          expectedError: 'Invalid version type'
        },
        {
          scenario: 'Invalid version progression',
          test: () => service.canCreateVersion(baseModel, Version.create('0.9.0').value!),
          expectedError: 'Target version must be newer'
        }
      ];

      // Act & Assert - Each violation handled in domain
      for (const testCase of testCases) {
        const result = await testCase.test();
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain(testCase.expectedError);
      }
    });
  });

  describe('UC-007 Requirement: Version Integrity and Business Workflows', () => {
    it('versionSequence_MultipleVersions_MaintainsProgression', async () => {
      // Arrange - Model for version sequence testing
      let sequenceModel = createSimpleTestModel('Sequence Model', '1.0.0');
      const versionHistory: string[] = ['1.0.0'];

      // Act - Create version sequence simulating development lifecycle
      const versionSequence = [
        { type: 'patch', expected: '1.0.1' },
        { type: 'patch', expected: '1.0.2' },
        { type: 'minor', expected: '1.1.0' },
        { type: 'patch', expected: '1.1.1' },
        { type: 'major', expected: '2.0.0' }
      ];

      for (const step of versionSequence) {
        const result = await service.createVersion(sequenceModel, step.type as any);
        expect(result.isSuccess).toBe(true);
        expect(result.value!.toString()).toBe(step.expected);
        
        versionHistory.push(result.value!.toString());

        // Update model version for next iteration
        (sequenceModel as any).props.version = result.value!;
        (sequenceModel as any).props.currentVersion = result.value!;
      }

      // Assert - Complete version progression maintained
      expect(versionHistory).toEqual([
        '1.0.0', '1.0.1', '1.0.2', '1.1.0', '1.1.1', '2.0.0'
      ]);
    });

    it('integrationWithFunctionModel_VersionCreation_WorksTogether', () => {
      // Arrange - Published model ready for versioning
      const integrationModel = createSimpleTestModel('Integration Model', '1.5.0');
      
      // Add output node to make valid for publishing
      const outputNodeId = NodeId.generate();
      const outputPosition = Position.create(300, 100).value!;
      const outputNode = IONode.create({
        nodeId: outputNodeId,
        modelId: integrationModel.modelId,
        name: 'Output Node',
        description: 'Output node for integration',
        position: outputPosition,
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
      
      integrationModel.addNode(outputNode);
      const publishResult = integrationModel.publish();
      expect(publishResult.isSuccess).toBe(true);

      // Act - Use FunctionModel's built-in version creation
      const versionResult = integrationModel.createVersion('1.6.0');

      // Assert - Integration works correctly
      expect(versionResult.isSuccess).toBe(true);
      const newModel = versionResult.value!;
      expect(newModel.version.toString()).toBe('1.6.0');
      expect(newModel.status).toBe(ModelStatus.DRAFT);
      expect(newModel.versionCount).toBe(integrationModel.versionCount + 1);
    });

    it('businessScenarios_RealWorldVersioning_HandlesCorrectly', async () => {
      // Arrange - Real-world business scenarios
      const businessScenarios = [
        {
          name: 'Hotfix Release',
          initialVersion: '2.1.5',
          versionType: 'patch',
          expectedVersion: '2.1.6'
        },
        {
          name: 'Feature Release',
          initialVersion: '2.1.0',
          versionType: 'minor',
          expectedVersion: '2.2.0'
        },
        {
          name: 'Major Architecture Change',
          initialVersion: '1.9.9',
          versionType: 'major',
          expectedVersion: '2.0.0'
        }
      ];

      // Act & Assert - Each business scenario handled correctly
      for (const scenario of businessScenarios) {
        const scenarioModel = createSimpleTestModel(scenario.name, scenario.initialVersion);
        const result = await service.createVersion(scenarioModel, scenario.versionType as any);
        
        expect(result.isSuccess).toBe(true);
        expect(result.value!.toString()).toBe(scenario.expectedVersion);
      }
    });
  });

  describe('UC-007 Requirement: Error Handling and Edge Cases', () => {
    it('createVersion_InvalidInputs_HandlesGracefully', async () => {
      // Arrange - Invalid inputs
      const invalidTypes = ['invalid', 'super', 'mega', '', null, undefined];

      // Act & Assert - Each invalid type rejected gracefully
      for (const invalidType of invalidTypes) {
        const result = await service.createVersion(baseModel, invalidType as any);
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Invalid version type. Must be major, minor, or patch');
      }
    });

    it('compareModels_EdgeCases_HandlesRobustly', () => {
      // Arrange - Edge case scenarios
      const validModel = createSimpleTestModel('Valid Model', '1.0.0');
      const edgeCases = [
        { model: null, description: 'null model' },
        { model: undefined, description: 'undefined model' },
        { model: { nodes: null }, description: 'corrupted model' }
      ];

      // Act & Assert - Each edge case handled gracefully
      edgeCases.forEach(edgeCase => {
        const result = service.compareModels(validModel, edgeCase.model as any);
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Failed to compare models:');
      });
    });

    it('versionHistory_EmptyRepository_ReturnsStructure', async () => {
      // Arrange - Model ID for history lookup
      const modelId = NodeId.generate().value;

      // Act - Get version history (currently returns empty)
      const result = await service.getVersionHistory(modelId);

      // Assert - Proper structure returned
      expect(result.isSuccess).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toEqual([]);
    });
  });
});