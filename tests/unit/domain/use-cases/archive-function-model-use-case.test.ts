import { ArchiveFunctionModelUseCase } from '../../../../lib/use-cases/function-model/archive-function-model-use-case';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { ModelStatus } from '../../../../lib/domain/enums';
import { ArchiveModelCommand } from '../../../../lib/use-cases/commands/model-commands';
import { NodeDependencyService } from '../../../../lib/domain/services/node-dependency-service';
import { CrossFeatureLinkingService } from '../../../../lib/domain/services/cross-feature-linking-service';
import { Result } from '../../../../lib/domain/shared/result';

// Mock interfaces and implementations
interface MockFunctionModelRepository {
  save: jest.Mock;
  findById: jest.Mock;
  findByName: jest.Mock;
  delete: jest.Mock;
  findAll: jest.Mock;
}

interface MockEventBus {
  publish: jest.Mock;
}

describe('ArchiveFunctionModelUseCase - UC-008', () => {
  let archiveUseCase: ArchiveFunctionModelUseCase;
  let mockRepository: MockFunctionModelRepository;
  let mockEventBus: MockEventBus;
  let mockNodeDependencyService: jest.Mocked<NodeDependencyService>;
  let mockCrossFeatureLinkingService: jest.Mocked<CrossFeatureLinkingService>;
  let testModel: FunctionModel;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn()
    };

    // Create mock event bus
    mockEventBus = {
      publish: jest.fn()
    };

    // Create mock services
    mockNodeDependencyService = {
      validateAcyclicity: jest.fn(),
      calculateExecutionOrder: jest.fn(),
      detectCircularDependencies: jest.fn(),
      optimizeExecutionPaths: jest.fn(),
      findCriticalPath: jest.fn(),
      buildDependencyGraph: jest.fn(),
      findReachableNodes: jest.fn(),
      getDependencyDepth: jest.fn()
    } as jest.Mocked<NodeDependencyService>;

    mockCrossFeatureLinkingService = {
      createCrossFeatureLink: jest.fn(),
      createNodeLink: jest.fn(),
      calculateLinkStrength: jest.fn(),
      detectRelationshipCycles: jest.fn(),
      validateLinkConstraints: jest.fn(),
      getFeatureLinks: jest.fn(),
      getLinksByType: jest.fn(),
      calculateNetworkMetrics: jest.fn(),
      removeLink: jest.fn()
    } as jest.Mocked<CrossFeatureLinkingService>;

    // Create test model
    const modelNameResult = ModelName.create('Test Archive Model');
    const versionResult = Version.create('1.0.0');
    expect(modelNameResult.isSuccess).toBe(true);
    expect(versionResult.isSuccess).toBe(true);

    const modelResult = FunctionModel.create({
      modelId: 'test-archive-model-id',
      name: modelNameResult.value,
      version: versionResult.value,
      status: ModelStatus.DRAFT,
      currentVersion: versionResult.value,
      nodes: new Map(),
      actionNodes: new Map(),
      metadata: { featureType: 'function-model', createdBy: 'test-user' },
      permissions: { owner: 'test-user', editors: [], viewers: [] }
    });

    expect(modelResult.isSuccess).toBe(true);
    testModel = modelResult.value;

    // Create use case instance
    archiveUseCase = new ArchiveFunctionModelUseCase(
      mockRepository as any,
      mockEventBus as any,
      mockNodeDependencyService,
      mockCrossFeatureLinkingService
    );
  });

  describe('Successful Archive Operations', () => {
    it('should successfully archive a DRAFT model', async () => {
      // Arrange
      const command: ArchiveModelCommand = {
        modelId: 'test-archive-model-id',
        userId: 'test-user',
        reason: 'End of development cycle'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(testModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockNodeDependencyService.validateAcyclicity.mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureLinkingService.getFeatureLinks.mockReturnValue([]);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.modelId).toBe('test-archive-model-id');
      expect(result.value.previousStatus).toBe(ModelStatus.DRAFT);
      expect(result.value.archivedBy).toBe('test-user');
      expect(result.value.dependencyImpact).toBeDefined();
      expect(result.value.dependencyImpact.riskLevel).toBe('low');

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      
      // Verify event data
      const publishCall = mockEventBus.publish.mock.calls[0][0];
      expect(publishCall.eventType).toBe('ModelArchived');
      expect(publishCall.aggregateId).toBe('test-archive-model-id');
    });

    it('should successfully archive a PUBLISHED model with warnings', async () => {
      // Arrange - publish the model first
      const publishResult = testModel.publish();
      expect(publishResult.isSuccess).toBe(true);

      const command: ArchiveModelCommand = {
        modelId: 'test-archive-model-id',
        userId: 'test-user',
        reason: 'Superseded by new version'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(testModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockNodeDependencyService.validateAcyclicity.mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: ['Deep dependency chain detected'] })
      );
      mockCrossFeatureLinkingService.getFeatureLinks.mockReturnValue([]);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.previousStatus).toBe(ModelStatus.PUBLISHED);
      expect(result.value.dependencyImpact.riskLevel).toBe('medium'); // Published model increases risk
    });

    it('should handle cross-feature link cleanup when requested', async () => {
      // Arrange
      const command: ArchiveModelCommand = {
        modelId: 'test-archive-model-id',
        userId: 'test-user',
        cleanupCrossFeatureLinks: true
      };

      const mockLink = {
        linkId: { value: 'test-link-id' },
        sourceId: 'test-archive-model-id',
        linkStrength: 0.5,
        linkType: 'references'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(testModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockNodeDependencyService.validateAcyclicity.mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureLinkingService.getFeatureLinks.mockReturnValue([mockLink as any]);
      mockCrossFeatureLinkingService.removeLink.mockResolvedValue(Result.ok(undefined));
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockCrossFeatureLinkingService.removeLink).toHaveBeenCalledTimes(1);
      expect(mockCrossFeatureLinkingService.removeLink).toHaveBeenCalledWith(mockLink.linkId);
    });
  });

  describe('Archive Validation and Business Rules', () => {
    it('should fail to archive already archived model', async () => {
      // Arrange - archive the model first
      const archiveResult = testModel.archive();
      expect(archiveResult.isSuccess).toBe(true);

      const command: ArchiveModelCommand = {
        modelId: 'test-archive-model-id',
        userId: 'test-user'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(testModel));

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Model is already archived');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should enforce permission checks for archive operation', async () => {
      // Arrange - create model with different owner
      const restrictedModelResult = FunctionModel.create({
        modelId: 'restricted-model-id',
        name: ModelName.create('Restricted Model').value,
        version: Version.create('1.0.0').value,
        status: ModelStatus.PUBLISHED,
        currentVersion: Version.create('1.0.0').value,
        nodes: new Map(),
        actionNodes: new Map(),
        metadata: {},
        permissions: { owner: 'different-user', editors: [], viewers: [] }
      });

      expect(restrictedModelResult.isSuccess).toBe(true);

      const command: ArchiveModelCommand = {
        modelId: 'restricted-model-id',
        userId: 'unauthorized-user'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(restrictedModelResult.value));

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Insufficient permissions to archive this model');
    });

    it('should allow editors to archive models', async () => {
      // Arrange - create model with editor permissions
      const editorModelResult = FunctionModel.create({
        modelId: 'editor-model-id',
        name: ModelName.create('Editor Model').value,
        version: Version.create('1.0.0').value,
        status: ModelStatus.DRAFT,
        currentVersion: Version.create('1.0.0').value,
        nodes: new Map(),
        actionNodes: new Map(),
        metadata: {},
        permissions: { owner: 'owner-user', editors: ['editor-user'], viewers: [] }
      });

      expect(editorModelResult.isSuccess).toBe(true);

      const command: ArchiveModelCommand = {
        modelId: 'editor-model-id',
        userId: 'editor-user'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(editorModelResult.value));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockNodeDependencyService.validateAcyclicity.mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureLinkingService.getFeatureLinks.mockReturnValue([]);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.archivedBy).toBe('editor-user');
    });
  });

  describe('Dependency Validation and Risk Assessment', () => {
    it('should block archive when circular dependencies exist', async () => {
      // Arrange
      const command: ArchiveModelCommand = {
        modelId: 'test-archive-model-id',
        userId: 'test-user'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(testModel));
      mockNodeDependencyService.validateAcyclicity.mockReturnValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Circular dependency detected: Node A → Node B → Node A'], 
          warnings: [] 
        })
      );

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('blocking dependencies');
      expect(result.error).toContain('Circular dependency detected');
    });

    it('should assess high risk and block when enforceRiskAssessment is true', async () => {
      // Arrange
      const command: ArchiveModelCommand = {
        modelId: 'test-archive-model-id',
        userId: 'test-user',
        enforceRiskAssessment: true
      };

      // Create a published model with many nodes (high risk scenario)
      testModel.publish();
      
      // Simulate large model with many cross-feature links
      const mockLinks = Array.from({ length: 15 }, (_, i) => ({
        linkId: { value: `link-${i}` },
        sourceId: 'test-archive-model-id',
        linkStrength: 0.8,
        linkType: 'implements'
      }));

      mockRepository.findById.mockResolvedValue(Result.ok(testModel));
      mockNodeDependencyService.validateAcyclicity.mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureLinkingService.getFeatureLinks.mockReturnValue(mockLinks as any);

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('High-risk archival blocked by policy');
    });

    it('should allow high risk archival when enforceRiskAssessment is false', async () => {
      // Arrange
      const command: ArchiveModelCommand = {
        modelId: 'test-archive-model-id',
        userId: 'test-user',
        enforceRiskAssessment: false // Allow high risk
      };

      // Create high-risk scenario but allow it
      const mockLinks = Array.from({ length: 12 }, (_, i) => ({
        linkId: { value: `link-${i}` },
        sourceId: 'test-archive-model-id',
        linkStrength: 0.9,
        linkType: 'triggers'
      }));

      mockRepository.findById.mockResolvedValue(Result.ok(testModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockNodeDependencyService.validateAcyclicity.mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureLinkingService.getFeatureLinks.mockReturnValue(mockLinks as any);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.dependencyImpact.riskLevel).toBe('high');
      expect(result.value.dependencyImpact.externalLinksAffected).toBe(12);
    });
  });

  describe('Command Validation', () => {
    it('should fail with empty modelId', async () => {
      // Arrange
      const command: ArchiveModelCommand = {
        modelId: '',
        userId: 'test-user'
      };

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Model ID is required');
    });

    it('should fail with empty userId', async () => {
      // Arrange
      const command: ArchiveModelCommand = {
        modelId: 'test-model-id',
        userId: ''
      };

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('User ID is required');
    });

    it('should fail when reason exceeds maximum length', async () => {
      // Arrange
      const longReason = 'x'.repeat(2001); // Over 2000 characters
      const command: ArchiveModelCommand = {
        modelId: 'test-model-id',
        userId: 'test-user',
        reason: longReason
      };

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Archive reason cannot exceed 2000 characters');
    });

    it('should handle model not found', async () => {
      // Arrange
      const command: ArchiveModelCommand = {
        modelId: 'non-existent-model',
        userId: 'test-user'
      };

      mockRepository.findById.mockResolvedValue(Result.fail('Model not found'));

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Function model not found');
    });
  });

  describe('Event Publishing and Audit Trail', () => {
    it('should publish ModelArchived event with complete audit data', async () => {
      // Arrange
      const command: ArchiveModelCommand = {
        modelId: 'test-archive-model-id',
        userId: 'audit-user',
        reason: 'Compliance requirement - SOX retention policy'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(testModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockNodeDependencyService.validateAcyclicity.mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureLinkingService.getFeatureLinks.mockReturnValue([]);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      
      const eventCall = mockEventBus.publish.mock.calls[0][0];
      expect(eventCall.eventType).toBe('ModelArchived');
      expect(eventCall.aggregateId).toBe('test-archive-model-id');
      expect(eventCall.userId).toBe('audit-user');
      
      const eventData = eventCall.eventData.data;
      expect(eventData.archivedBy).toBe('audit-user');
      expect(eventData.reason).toBe('Compliance requirement - SOX retention policy');
      expect(eventData.previousStatus).toBe('draft');
      expect(eventData.currentStatus).toBe('archived');
    });

    it('should continue operation even if event publishing fails', async () => {
      // Arrange
      const command: ArchiveModelCommand = {
        modelId: 'test-archive-model-id',
        userId: 'test-user'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(testModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockNodeDependencyService.validateAcyclicity.mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureLinkingService.getFeatureLinks.mockReturnValue([]);
      mockEventBus.publish.mockRejectedValue(new Error('Event bus unavailable'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true); // Operation should still succeed
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to publish ModelArchived event:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle model with complex node structure and dependencies', async () => {
      // Arrange - create complex model scenario
      const complexModel = testModel;
      
      // Add nodes to simulate complexity (simplified for testing)
      for (let i = 0; i < 25; i++) {
        complexModel.nodes.set(`node-${i}`, {} as any);
      }
      
      for (let i = 0; i < 60; i++) {
        complexModel.actionNodes.set(`action-${i}`, {} as any);
      }

      const command: ArchiveModelCommand = {
        modelId: 'test-archive-model-id',
        userId: 'test-user',
        reason: 'Complex model lifecycle completion'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(complexModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockNodeDependencyService.validateAcyclicity.mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: ['Model has high complexity'] })
      );
      mockCrossFeatureLinkingService.getFeatureLinks.mockReturnValue([]);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.dependencyImpact.internalNodesAffected).toBe(85); // 25 + 60
      expect(result.value.dependencyImpact.riskLevel).toBe('high');
    });

    it('should provide comprehensive dependency impact assessment', async () => {
      // Arrange
      const command: ArchiveModelCommand = {
        modelId: 'test-archive-model-id',
        userId: 'test-user'
      };

      const mockCrossLinks = [
        { linkId: { value: 'link-1' }, linkStrength: 0.9, linkType: 'implements' },
        { linkId: { value: 'link-2' }, linkStrength: 0.6, linkType: 'references' },
        { linkId: { value: 'link-3' }, linkStrength: 0.8, linkType: 'supports' }
      ];

      mockRepository.findById.mockResolvedValue(Result.ok(testModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockNodeDependencyService.validateAcyclicity.mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureLinkingService.getFeatureLinks.mockReturnValue(mockCrossLinks as any);
      mockEventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.dependencyImpact).toEqual({
        internalNodesAffected: 0, // Empty test model
        externalLinksAffected: 3,
        riskLevel: 'low'
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle repository save failures gracefully', async () => {
      // Arrange
      const command: ArchiveModelCommand = {
        modelId: 'test-archive-model-id',
        userId: 'test-user'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(testModel));
      mockRepository.save.mockResolvedValue(Result.fail('Database connection error'));
      mockNodeDependencyService.validateAcyclicity.mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureLinkingService.getFeatureLinks.mockReturnValue([]);

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Failed to save archived model: Database connection error');
    });

    it('should handle cross-feature link cleanup failures gracefully', async () => {
      // Arrange
      const command: ArchiveModelCommand = {
        modelId: 'test-archive-model-id',
        userId: 'test-user',
        cleanupCrossFeatureLinks: true
      };

      const mockLink = {
        linkId: { value: 'problematic-link' },
        sourceId: 'test-archive-model-id'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(testModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockNodeDependencyService.validateAcyclicity.mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureLinkingService.getFeatureLinks.mockReturnValue([mockLink as any]);
      mockCrossFeatureLinkingService.removeLink.mockRejectedValue(new Error('Link removal failed'));
      mockEventBus.publish.mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true); // Main operation should succeed
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to remove cross-feature link problematic-link:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle unexpected errors during execution', async () => {
      // Arrange
      const command: ArchiveModelCommand = {
        modelId: 'test-archive-model-id',
        userId: 'test-user'
      };

      mockRepository.findById.mockRejectedValue(new Error('Unexpected database error'));

      // Act
      const result = await archiveUseCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Failed to archive function model: Unexpected database error');
    });
  });
});