import { PublishFunctionModelUseCase, PublishModelResult } from '../../../../lib/use-cases/function-model/publish-function-model-use-case';
import { PublishModelCommand } from '../../../../lib/use-cases/commands/model-commands';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ModelStatus } from '../../../../lib/domain/enums';
import { Version } from '../../../../lib/domain/value-objects/version';
import { Result } from '../../../../lib/domain/shared/result';
import { IFunctionModelRepository, IEventBus } from '../../../../lib/use-cases/function-model/create-function-model-use-case';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';

describe('PublishFunctionModelUseCase', () => {
  let useCase: PublishFunctionModelUseCase;
  let mockRepository: jest.Mocked<IFunctionModelRepository>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let validCommand: PublishModelCommand;
  let mockModel: FunctionModel;

  beforeEach(() => {
    // Setup mock repository
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findByName: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
    };

    // Setup mock event bus
    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    // Create use case instance
    useCase = new PublishFunctionModelUseCase(mockRepository, mockEventBus);

    // Setup valid command
    validCommand = {
      modelId: 'test-model-123',
      version: '1.1.0',
      userId: 'user-123',
      publishNotes: 'Ready for production deployment',
    };

    // Create mock model in draft state
    const modelNameResult = ModelName.create('Test Model');
    if (modelNameResult.isFailure) throw new Error('Failed to create model name');
    
    const versionResult = Version.create('1.0.0');
    if (versionResult.isFailure) throw new Error('Failed to create version');

    const modelResult = FunctionModel.create({
      modelId: validCommand.modelId,
      name: modelNameResult.value,
      description: 'Test model for publication',
      version: versionResult.value,
      status: ModelStatus.DRAFT,
      currentVersion: versionResult.value,
      nodes: new Map(),
      actionNodes: new Map(),
      metadata: { environment: 'test', purpose: 'publication-testing' },
      permissions: {
        owner: validCommand.userId,
        editors: [],
        viewers: []
      }
    });

    if (modelResult.isFailure) throw new Error('Failed to create test model');
    mockModel = modelResult.value;
  });

  describe('Command Validation', () => {
    it('should fail when modelId is missing', async () => {
      // Arrange
      const invalidCommand = { ...validCommand, modelId: '' };

      // Act
      const result = await useCase.execute(invalidCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Model ID is required');
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should fail when userId is missing', async () => {
      // Arrange
      const invalidCommand = { ...validCommand, userId: '' };

      // Act
      const result = await useCase.execute(invalidCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('User ID is required');
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should fail when version is missing', async () => {
      // Arrange
      const invalidCommand = { ...validCommand, version: '' };

      // Act
      const result = await useCase.execute(invalidCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Version is required');
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should fail when version is missing with enforceValidation', async () => {
      // Arrange
      const invalidCommand = { ...validCommand, version: '', enforceValidation: true };

      // Act
      const result = await useCase.execute(invalidCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('validation');
      expect(result.error).toBe('Version validation failed: Version is required');
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should fail when publishNotes exceed 2000 characters', async () => {
      // Arrange
      const longNotes = 'x'.repeat(2001);
      const invalidCommand = { ...validCommand, publishNotes: longNotes };

      // Act
      const result = await useCase.execute(invalidCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Publish notes cannot exceed 2000 characters');
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should fail when publishNotes exceed 2000 characters with enforceValidation', async () => {
      // Arrange
      const longNotes = 'x'.repeat(2001);
      const invalidCommand = { ...validCommand, publishNotes: longNotes, enforceValidation: true };

      // Act
      const result = await useCase.execute(invalidCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('validation');
      expect(result.error).toBe('Publish notes validation failed: Publish notes cannot exceed 2000 characters');
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('Model Retrieval', () => {
    it('should fail when model is not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(
        Result.fail<FunctionModel>('Model not found')
      );

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Function model not found');
      expect(mockRepository.findById).toHaveBeenCalledWith(validCommand.modelId);
    });

    it('should fail when repository throws error', async () => {
      // Arrange
      mockRepository.findById.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Failed to publish function model: Database connection failed');
    });
  });

  describe('Permission Validation', () => {
    it('should fail when user is not owner, editor, or publisher', async () => {
      // Arrange
      mockModel['props'].permissions = {
        owner: 'different-user',
        editors: ['other-user-1'],
        publishers: ['other-user-2'],
        viewers: [validCommand.userId], // User only has view permission
      };
      
      mockRepository.findById.mockResolvedValue(Result.ok(mockModel));

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Insufficient permissions to publish this model');
    });

    it('should succeed when user is owner', async () => {
      // Arrange
      mockModel['props'].permissions.owner = validCommand.userId;
      mockRepository.findById.mockResolvedValue(Result.ok(mockModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // Mock workflow validation
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      jest.spyOn(mockModel, 'publish').mockReturnValue(Result.ok(undefined));
      jest.spyOn(mockModel, 'incrementVersionCount').mockImplementation();
      jest.spyOn(mockModel, 'markSaved').mockImplementation();

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isSuccess).toBe(true);
    });

    it('should succeed when user is editor', async () => {
      // Arrange
      mockModel['props'].permissions = {
        owner: 'different-user',
        editors: [validCommand.userId],
        publishers: [],
        viewers: [],
      };
      
      mockRepository.findById.mockResolvedValue(Result.ok(mockModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // Mock workflow validation
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      jest.spyOn(mockModel, 'publish').mockReturnValue(Result.ok(undefined));
      jest.spyOn(mockModel, 'incrementVersionCount').mockImplementation();
      jest.spyOn(mockModel, 'markSaved').mockImplementation();

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isSuccess).toBe(true);
    });

    it('should succeed when user is explicit publisher', async () => {
      // Arrange
      mockModel['props'].permissions = {
        owner: 'different-user',
        editors: [],
        publishers: [validCommand.userId],
        viewers: [],
      };
      
      mockRepository.findById.mockResolvedValue(Result.ok(mockModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // Mock workflow validation
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      jest.spyOn(mockModel, 'publish').mockReturnValue(Result.ok(undefined));
      jest.spyOn(mockModel, 'incrementVersionCount').mockImplementation();
      jest.spyOn(mockModel, 'markSaved').mockImplementation();

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Model State Validation', () => {
    beforeEach(() => {
      mockRepository.findById.mockResolvedValue(Result.ok(mockModel));
    });

    it('should fail when model is already published', async () => {
      // Arrange
      mockModel['props'].status = ModelStatus.PUBLISHED;

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Model is already published');
    });

    it('should fail when model is archived', async () => {
      // Arrange
      mockModel['props'].status = ModelStatus.ARCHIVED;

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot publish archived model');
    });

    it('should fail when model is deleted', async () => {
      // Arrange
      mockModel['props'].deletedAt = new Date();

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot publish deleted model');
    });
  });

  describe('Version Validation', () => {
    beforeEach(() => {
      mockRepository.findById.mockResolvedValue(Result.ok(mockModel));
    });

    it('should fail with invalid version format', async () => {
      // Arrange
      const invalidCommand = { ...validCommand, version: 'invalid-version' };

      // Act
      const result = await useCase.execute(invalidCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invalid version format:');
    });

    it('should fail when new version is not greater than current', async () => {
      // Arrange
      const sameVersionCommand = { ...validCommand, version: '1.0.0' }; // Same as current

      // Act
      const result = await useCase.execute(sameVersionCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('New version must be greater than current version');
    });

    it('should fail when new version is lower than current', async () => {
      // Arrange
      const lowerVersionCommand = { ...validCommand, version: '0.9.0' }; // Lower than current 1.0.0

      // Act
      const result = await useCase.execute(lowerVersionCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('New version must be greater than current version');
    });

    it('should succeed with valid higher version', async () => {
      // Arrange
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      
      // Mock workflow validation
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      jest.spyOn(mockModel, 'publish').mockReturnValue(Result.ok(undefined));
      jest.spyOn(mockModel, 'incrementVersionCount').mockImplementation();
      jest.spyOn(mockModel, 'markSaved').mockImplementation();

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Workflow Validation', () => {
    beforeEach(() => {
      mockRepository.findById.mockResolvedValue(Result.ok(mockModel));
    });

    it('should fail when workflow validation fails', async () => {
      // Arrange
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.fail('Validation service error')
      );

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Workflow validation failed: Validation service error');
    });

    it('should fail when workflow has validation errors', async () => {
      // Arrange
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Missing input node', 'Missing output node'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Cannot publish model with validation errors:');
      expect(result.error).toContain('Missing input node');
      expect(result.error).toContain('Missing output node');
    });

    it('should fail when workflow has critical warnings', async () => {
      // Arrange
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['No input connections detected', 'Unreachable nodes found'] 
        })
      );

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Cannot publish model with critical warnings:');
      expect(result.error).toContain('No input');
      expect(result.error).toContain('Unreachable');
    });

    it('should succeed with non-critical warnings', async () => {
      // Arrange
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Performance optimization recommended'] 
        })
      );
      jest.spyOn(mockModel, 'publish').mockReturnValue(Result.ok(undefined));
      jest.spyOn(mockModel, 'incrementVersionCount').mockImplementation();
      jest.spyOn(mockModel, 'markSaved').mockImplementation();

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Domain Publication', () => {
    beforeEach(() => {
      mockRepository.findById.mockResolvedValue(Result.ok(mockModel));
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
    });

    it('should fail when domain publish method fails', async () => {
      // Arrange
      jest.spyOn(mockModel, 'publish').mockReturnValue(
        Result.fail('Domain validation failed')
      );

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Domain validation failed');
    });

    it('should call domain publish method when valid', async () => {
      // Arrange
      const publishSpy = jest.spyOn(mockModel, 'publish').mockReturnValue(Result.ok(undefined));
      const incrementSpy = jest.spyOn(mockModel, 'incrementVersionCount').mockImplementation();
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      jest.spyOn(mockModel, 'markSaved').mockImplementation();

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(publishSpy).toHaveBeenCalled();
      expect(incrementSpy).toHaveBeenCalled();
    });
  });

  describe('Repository Operations', () => {
    beforeEach(() => {
      mockRepository.findById.mockResolvedValue(Result.ok(mockModel));
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      jest.spyOn(mockModel, 'publish').mockReturnValue(Result.ok(undefined));
      jest.spyOn(mockModel, 'incrementVersionCount').mockImplementation();
    });

    it('should fail when repository save fails', async () => {
      // Arrange
      mockRepository.save.mockResolvedValue(
        Result.fail('Database save failed')
      );

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Failed to save published model: Database save failed');
    });

    it('should call markSaved after successful repository save', async () => {
      // Arrange
      const markSavedSpy = jest.spyOn(mockModel, 'markSaved').mockImplementation();
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledWith(mockModel);
      expect(markSavedSpy).toHaveBeenCalled();
    });
  });

  describe('Event Publishing', () => {
    beforeEach(() => {
      mockRepository.findById.mockResolvedValue(Result.ok(mockModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: ['Performance warning'] })
      );
      jest.spyOn(mockModel, 'publish').mockReturnValue(Result.ok(undefined));
      jest.spyOn(mockModel, 'incrementVersionCount').mockImplementation();
      jest.spyOn(mockModel, 'markSaved').mockImplementation();
    });

    it('should publish FunctionModelPublished event with correct data', async () => {
      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'FunctionModelPublished',
          aggregateId: validCommand.modelId,
          eventData: expect.objectContaining({
            modelId: validCommand.modelId,
            version: validCommand.version,
            publishedBy: validCommand.userId,
            publishNotes: validCommand.publishNotes,
            validationWarnings: ['Performance warning'],
          }),
          userId: validCommand.userId,
          timestamp: expect.any(Date),
        })
      );
    });

    it('should publish FunctionModelVersionCreated event with correct version type', async () => {
      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'FunctionModelVersionCreated',
          aggregateId: validCommand.modelId,
          eventData: expect.objectContaining({
            modelId: validCommand.modelId,
            version: validCommand.version,
            versionType: 'minor', // 1.0.0 -> 1.1.0 is minor
            createdBy: validCommand.userId,
          }),
          userId: validCommand.userId,
          timestamp: expect.any(Date),
        })
      );
    });

    it('should determine major version type correctly', async () => {
      // Arrange
      const majorVersionCommand = { ...validCommand, version: '2.0.0' };

      // Act
      const result = await useCase.execute(majorVersionCommand);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventData: expect.objectContaining({
            versionType: 'major',
          }),
        })
      );
    });

    it('should determine patch version type correctly', async () => {
      // Arrange
      const patchVersionCommand = { ...validCommand, version: '1.0.1' };

      // Act
      const result = await useCase.execute(patchVersionCommand);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventData: expect.objectContaining({
            versionType: 'patch',
          }),
        })
      );
    });
  });

  describe('Success Scenarios', () => {
    beforeEach(() => {
      mockRepository.findById.mockResolvedValue(Result.ok(mockModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      jest.spyOn(mockModel, 'incrementVersionCount').mockImplementation();
      jest.spyOn(mockModel, 'markSaved').mockImplementation();

      // Mock publish method to simulate successful publication
      jest.spyOn(mockModel, 'publish').mockImplementation(() => {
        // Simulate what the real publish method does
        mockModel['props'].status = ModelStatus.PUBLISHED;
        mockModel['props'].updatedAt = new Date('2024-01-15T10:30:00Z');
        return Result.ok(undefined);
      });
    });

    it('should return correct PublishModelResult on success', async () => {
      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual<PublishModelResult>({
        modelId: validCommand.modelId,
        version: validCommand.version,
        status: ModelStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      });
    });

    it('should execute complete publication workflow', async () => {
      // Act
      const result = await useCase.execute(validCommand);

      // Assert - Verify complete workflow execution
      expect(result.isSuccess).toBe(true);
      
      // Verify all steps were called in order
      expect(mockRepository.findById).toHaveBeenCalledWith(validCommand.modelId);
      expect(mockModel.validateWorkflow).toHaveBeenCalled();
      expect(mockModel.publish).toHaveBeenCalled();
      expect(mockModel.incrementVersionCount).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalledWith(mockModel);
      expect(mockModel.markSaved).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2); // Two events
    });

    it('should handle optional publishNotes correctly', async () => {
      // Arrange
      const commandWithoutNotes = { ...validCommand, publishNotes: undefined };

      // Act
      const result = await useCase.execute(commandWithoutNotes);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventData: expect.objectContaining({
            publishNotes: undefined,
          }),
        })
      );
    });
  });

  describe('Critical Warning Filtering', () => {
    beforeEach(() => {
      mockRepository.findById.mockResolvedValue(Result.ok(mockModel));
    });

    it('should block publication with no input warning', async () => {
      // Arrange
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['No input connections found'] 
        })
      );

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('critical warnings');
    });

    it('should block publication with no output warning', async () => {
      // Arrange
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['No output nodes detected'] 
        })
      );

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('critical warnings');
    });

    it('should block publication with unreachable nodes warning', async () => {
      // Arrange
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Unreachable nodes detected'] 
        })
      );

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('critical warnings');
    });

    it('should block publication with infinite loop warning', async () => {
      // Arrange
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Infinite loop detected'] 
        })
      );

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('critical warnings');
    });

    it('should block publication with circular dependency warning', async () => {
      // Arrange
      jest.spyOn(mockModel, 'validateWorkflow').mockReturnValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Circular dependency detected'] 
        })
      );

      // Act
      const result = await useCase.execute(validCommand);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('critical warnings');
    });
  });
});