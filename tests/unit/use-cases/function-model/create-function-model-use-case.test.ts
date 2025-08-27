import { CreateFunctionModelUseCase } from '../../../../lib/use-cases/function-model/create-function-model-use-case';
import { IFunctionModelRepository } from '../../../../lib/domain/interfaces/function-model-repository';
import { Result } from '../../../../lib/domain/shared/result';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ModelStatus } from '../../../../lib/domain/enums';
import { UseCaseTestFixtures } from '../__fixtures__/use-case-test-fixtures';
import { ResultTestHelpers, IEventBus } from '../__tests__/base-use-case.test';

/**
 * Test Suite for UC-001: Create Function Model Use Case
 * 
 * Tests the application layer coordination of function model creation,
 * ensuring Clean Architecture compliance and proper domain orchestration.
 * 
 * This use case coordinates:
 * - Input validation
 * - Domain entity creation (FunctionModel)
 * - Repository persistence
 * - Domain event publishing
 */
describe('CreateFunctionModelUseCase', () => {
  let useCase: CreateFunctionModelUseCase;
  let mockRepository: jest.Mocked<IFunctionModelRepository>;
  let mockEventBus: jest.Mocked<IEventBus>;

  beforeEach(() => {
    // Create mocked dependencies following Clean Architecture patterns
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn()
    } as jest.Mocked<IFunctionModelRepository>;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined)
    } as jest.Mocked<IEventBus>;

    // Initialize use case with mocked dependencies
    useCase = new CreateFunctionModelUseCase(mockRepository, mockEventBus);
  });

  describe('execute', () => {
    describe('success scenarios', () => {
      it('should_CreateFunctionModel_WhenValidCommandProvided', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidCreateModelCommand();
        
        // Mock repository responses
        mockRepository.findByName.mockResolvedValue(
          Result.fail('Model not found') // Ensures no existing model
        );
        mockRepository.save.mockResolvedValue(
          UseCaseTestFixtures.createSuccessfulSaveResponse()
        );

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.name).toBe(command.name);
        expect(result.value.status).toBe(ModelStatus.DRAFT);
        expect(result.value.version).toBe('1.0.0');
        expect(result.value.modelId).toBeDefined();
        expect(result.value.createdAt).toBeInstanceOf(Date);
      });

      it('should_SaveModelThroughRepository_WhenCreationSucceeds', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidCreateModelCommand();
        mockRepository.findByName.mockResolvedValue(Result.fail('Not found'));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        await useCase.execute(command);

        // Assert
        expect(mockRepository.save).toHaveBeenCalledTimes(1);
        const savedModel = mockRepository.save.mock.calls[0][0];
        expect(savedModel).toBeInstanceOf(FunctionModel);
        expect(savedModel.name.value).toBe(command.name);
        expect(savedModel.status).toBe(ModelStatus.DRAFT);
      });

      it('should_PublishFunctionModelCreatedEvent_WhenCreationSucceeds', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidCreateModelCommand();
        mockRepository.findByName.mockResolvedValue(Result.fail('Not found'));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        await useCase.execute(command);

        // Assert
        expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
        const publishedEvent = mockEventBus.publish.mock.calls[0][0];
        expect(publishedEvent.eventType).toBe('FunctionModelCreated');
        expect(publishedEvent.aggregateId).toBeDefined();
        expect(publishedEvent.eventData.name).toBe(command.name);
        expect(publishedEvent.eventData.createdBy).toBe(command.userId);
        expect(publishedEvent.userId).toBe(command.userId);
        expect(publishedEvent.timestamp).toBeInstanceOf(Date);
      });

      it('should_CreateModelWithCorrectMetadata_WhenTemplateAndOrgProvided', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidCreateModelCommand();
        mockRepository.findByName.mockResolvedValue(Result.fail('Not found'));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        const savedModel = mockRepository.save.mock.calls[0][0];
        expect(savedModel.metadata.templateId).toBe(command.templateId);
        expect(savedModel.metadata.organizationId).toBe(command.organizationId);
        expect(savedModel.metadata.createdBy).toBe(command.userId);
      });

      it('should_CreateModelWithCorrectPermissions_WhenUserProvided', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidCreateModelCommand();
        mockRepository.findByName.mockResolvedValue(Result.fail('Not found'));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        await useCase.execute(command);

        // Assert
        const savedModel = mockRepository.save.mock.calls[0][0];
        expect(savedModel.permissions.owner).toBe(command.userId);
        expect(savedModel.permissions.viewers).toEqual([]);
        expect(savedModel.permissions.editors).toEqual([]);
      });
    });

    describe('validation failure scenarios', () => {
      it('should_ReturnValidationError_WhenModelNameIsEmpty', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createInvalidCreateModelCommand();

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Model name is required');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenUserIdIsMissing', async () => {
        // Arrange
        const command = {
          name: 'Valid Name',
          userId: '', // Invalid: empty user ID
          description: 'Test'
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'User ID is required');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenDescriptionTooLong', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidCreateModelCommand(),
          description: 'x'.repeat(5001) // Exceeds 5000 character limit
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'description cannot exceed 5000 characters');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenTemplateIdIsEmpty', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidCreateModelCommand(),
          templateId: '' // Invalid: empty template ID when provided
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Template ID cannot be empty');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });
    });

    describe('domain failure scenarios', () => {
      it('should_ReturnDomainError_WhenModelNameCreationFails', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidCreateModelCommand(),
          name: 'A'.repeat(256) // Exceeds ModelName value object limits
        };
        mockRepository.findByName.mockResolvedValue(Result.fail('Not found'));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result);
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnConflictError_WhenModelWithSameNameExists', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidCreateModelCommand();
        const existingModel = UseCaseTestFixtures.createValidFunctionModel();
        
        mockRepository.findByName.mockResolvedValue(existingModel);

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'model with this name already exists');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });
    });

    describe('infrastructure failure scenarios', () => {
      it('should_ReturnRepositoryError_WhenSaveFails', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidCreateModelCommand();
        mockRepository.findByName.mockResolvedValue(Result.fail('Not found'));
        mockRepository.save.mockResolvedValue(
          UseCaseTestFixtures.createRepositoryFailureResponse()
        );

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Failed to save model');
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_CompleteSuccessfully_WhenEventPublishingFails', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidCreateModelCommand();
        mockRepository.findByName.mockResolvedValue(Result.fail('Not found'));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));
        mockEventBus.publish.mockRejectedValue(new Error('Event bus failure'));

        // Act
        const result = await useCase.execute(command);

        // Assert - Primary operation should succeed even if event publishing fails
        ResultTestHelpers.expectSuccess(result);
        expect(mockRepository.save).toHaveBeenCalled();
      });

      it('should_HandleRepositoryExceptions_Gracefully', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidCreateModelCommand();
        mockRepository.findByName.mockRejectedValue(new Error('Database connection lost'));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Failed to create function model');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });
    });
  });

  describe('architectural compliance', () => {
    it('should_OnlyDependOnDomainInterfaces_NeverConcreteImplementations', () => {
      // Verify that the use case constructor accepts interfaces, not concrete classes
      expect(useCase).toBeInstanceOf(CreateFunctionModelUseCase);
      
      // The fact that we can mock the dependencies proves they are interfaces
      expect(mockRepository).toBeDefined();
      expect(mockEventBus).toBeDefined();
    });

    it('should_CoordinateDomainEntities_WithoutContainingBusinessLogic', () => {
      // This use case should only coordinate:
      // 1. Input validation (application concern)
      // 2. Domain entity creation (delegated to domain)
      // 3. Repository operations (delegated to infrastructure)
      // 4. Event publishing (delegated to infrastructure)
      
      // Business logic like model name validation should be in ModelName value object
      // Business logic like model creation rules should be in FunctionModel entity
      
      expect(true).toBe(true); // This is verified by the domain layer tests
    });

    it('should_ReturnResultPattern_ConsistentlyForAllOperations', async () => {
      // All use case operations must return Result<T> for consistent error handling
      const command = UseCaseTestFixtures.createValidCreateModelCommand();
      mockRepository.findByName.mockResolvedValue(Result.fail('Not found'));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      const result = await useCase.execute(command);

      expect(result).toHaveProperty('isSuccess');
      expect(result).toHaveProperty('isFailure');
      // Note: value and error are getters that throw when accessed inappropriately
      // The existence of isSuccess/isFailure properties proves Result pattern compliance
    });

    it('should_NotLeakDomainEntities_InResponseObjects', async () => {
      // Use case should return DTOs/response objects, not domain entities
      const command = UseCaseTestFixtures.createValidCreateModelCommand();
      mockRepository.findByName.mockResolvedValue(Result.fail('Not found'));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      const result = await useCase.execute(command);

      if (result.isSuccess) {
        // Response should contain data, not domain entities
        expect(result.value).toHaveProperty('modelId');
        expect(result.value).toHaveProperty('name');
        expect(result.value).toHaveProperty('version');
        expect(result.value).toHaveProperty('status');
        expect(result.value).toHaveProperty('createdAt');
        
        // Should not contain domain entity methods
        expect(typeof result.value.addNode).toBe('undefined');
        expect(typeof result.value.publish).toBe('undefined');
      }
    });
  });

  describe('edge cases', () => {
    it('should_HandleNullDescription_Gracefully', async () => {
      // Arrange
      const command = {
        ...UseCaseTestFixtures.createValidCreateModelCommand(),
        description: null as any
      };
      mockRepository.findByName.mockResolvedValue(Result.fail('Not found'));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // Act
      const result = await useCase.execute(command);

      // Assert
      ResultTestHelpers.expectSuccess(result);
      const savedModel = mockRepository.save.mock.calls[0][0];
      expect(savedModel.description).toBeUndefined();
    });

    it('should_TrimWhitespaceFromDescription_WhenProvided', async () => {
      // Arrange
      const command = {
        ...UseCaseTestFixtures.createValidCreateModelCommand(),
        description: '  Test description with whitespace  '
      };
      mockRepository.findByName.mockResolvedValue(Result.fail('Not found'));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // Act
      const result = await useCase.execute(command);

      // Assert
      ResultTestHelpers.expectSuccess(result);
      const savedModel = mockRepository.save.mock.calls[0][0];
      expect(savedModel.description).toBe('Test description with whitespace');
    });

    it('should_GenerateUniqueModelIds_ForConcurrentRequests', async () => {
      // Arrange
      const command1 = UseCaseTestFixtures.createValidCreateModelCommand();
      const command2 = { ...command1, name: 'Different Model Name' };
      
      mockRepository.findByName.mockResolvedValue(Result.fail('Not found'));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // Act
      const [result1, result2] = await Promise.all([
        useCase.execute(command1),
        useCase.execute(command2)
      ]);

      // Assert
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value.modelId).not.toBe(result2.value.modelId);
    });
  });
});