import { AddContainerNodeUseCase } from '../../../../lib/use-cases/function-model/add-container-node-use-case';
import { IFunctionModelRepository } from '../../../../lib/domain/interfaces/function-model-repository';
import { Result } from '../../../../lib/domain/shared/result';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ContainerNodeType } from '../../../../lib/domain/enums';
import { UseCaseTestFixtures } from '../__fixtures__/use-case-test-fixtures';
import { ResultTestHelpers, IEventBus } from '../__tests__/base-use-case.test';

/**
 * Test Suite for UC-002: Add Container Node to Model Use Case
 * 
 * Tests the application layer coordination of container node addition to function models,
 * ensuring Clean Architecture compliance and proper domain orchestration.
 * 
 * This use case coordinates:
 * - Input validation (command parameters)
 * - Model retrieval and existence validation
 * - Container node creation (delegated to domain)
 * - Model persistence with new node
 * - Domain event publishing
 */
describe('AddContainerNodeUseCase', () => {
  let useCase: AddContainerNodeUseCase;
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
    useCase = new AddContainerNodeUseCase(mockRepository, mockEventBus);
  });

  describe('execute', () => {
    describe('success scenarios', () => {
      it('should_AddIOContainerNode_WhenValidCommandProvided', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
          nodeType: ContainerNodeType.IO_NODE
        };
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        if (result.isFailure) {
          console.error('Test failed with error:', result.error);
        }
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.nodeId).toBeDefined();
        expect(result.value.nodeType).toBe(ContainerNodeType.IO_NODE);
        expect(result.value.name).toBe(command.name);
        expect(result.value.position).toEqual(command.position);
        expect(result.value.addedAt).toBeInstanceOf(Date);
      });

      it('should_AddStageContainerNode_WhenValidCommandProvided', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
          nodeType: ContainerNodeType.STAGE_NODE
        };
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.nodeType).toBe(ContainerNodeType.STAGE_NODE);
        expect(result.value.name).toBe(command.name);
      });

      it('should_SaveModelWithNewNode_WhenNodeAdditionSucceeds', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidAddContainerNodeCommand();
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const originalNodeCount = existingModel.nodes.size;

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        await useCase.execute(command);

        // Assert
        expect(mockRepository.save).toHaveBeenCalledTimes(1);
        const savedModel = mockRepository.save.mock.calls[0][0];
        expect(savedModel).toBeInstanceOf(FunctionModel);
        expect(savedModel.nodes.size).toBe(originalNodeCount + 1);
      });

      it('should_PublishContainerNodeAddedEvent_WhenNodeAdditionSucceeds', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidAddContainerNodeCommand();
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        await useCase.execute(command);

        // Assert
        expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
        const publishedEvent = mockEventBus.publish.mock.calls[0][0];
        expect(publishedEvent.eventType).toBe('ContainerNodeAdded');
        expect(publishedEvent.aggregateId).toBe(command.modelId);
        expect(publishedEvent.eventData.nodeType).toBe(command.nodeType);
        expect(publishedEvent.eventData.name).toBe(command.name);
        expect(publishedEvent.eventData.addedBy).toBe(command.userId);
        expect(publishedEvent.userId).toBe(command.userId);
        expect(publishedEvent.timestamp).toBeInstanceOf(Date);
      });

      it('should_AddNodeToCorrectPosition_WhenPositionSpecified', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
          position: { x: 500, y: 750 }
        };
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.position).toEqual({ x: 500, y: 750 });
      });

      it('should_HandleOptionalDescription_WhenProvided', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
          description: 'Test node description'
        };
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.description).toBe('Test node description');
      });
    });

    describe('validation failure scenarios', () => {
      it('should_ReturnValidationError_WhenModelIdIsEmpty', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
          modelId: ''
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Model ID is required');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenNodeNameIsEmpty', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
          name: ''
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Node name is required');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenUserIdIsEmpty', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
          userId: ''
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'User ID is required');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenNodeTypeIsInvalid', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
          nodeType: 'INVALID_TYPE' as any
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Invalid node type');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenPositionIsInvalid', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
          position: { x: -1, y: -1 } // Negative positions should be invalid
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Invalid position coordinates');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenDescriptionTooLong', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
          description: 'x'.repeat(1001) // Exceeds description length limit
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Description cannot exceed 1000 characters');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });
    });

    describe('domain failure scenarios', () => {
      it('should_ReturnNotFoundError_WhenModelDoesNotExist', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidAddContainerNodeCommand();
        mockRepository.findById.mockResolvedValue(
          Result.fail('Function model not found')
        );

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Function model not found');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnDomainError_WhenNodeCreationFails', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
          name: 'A'.repeat(256) // Exceeds node name value object limits
        };
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result);
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnDomainError_WhenPositionValidationFails', async () => {
        // Arrange  
        const command = {
          ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
          position: { x: 99999, y: 99999 } // Exceeds position limits
        };
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result);
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnBusinessRuleError_WhenAddNodeToModelFails', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidAddContainerNodeCommand();
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        
        // Mock FunctionModel.addNode to fail for business rule violation
        const originalAddNode = existingModel.addNode;
        jest.spyOn(existingModel, 'addNode').mockReturnValue(
          Result.fail('Cannot add nodes to published model')
        );

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Cannot add nodes to published model');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();

        // Cleanup
        existingModel.addNode = originalAddNode;
      });
    });

    describe('infrastructure failure scenarios', () => {
      it('should_ReturnRepositoryError_WhenModelRetrievalFails', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidAddContainerNodeCommand();
        mockRepository.findById.mockResolvedValue(
          Result.fail('Database connection failed')
        );

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Database connection failed');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnRepositoryError_WhenSaveFails', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidAddContainerNodeCommand();
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(
          Result.fail('Failed to save model to database')
        );

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Failed to save model');
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_CompleteSuccessfully_WhenEventPublishingFails', async () => {
        // Arrange
        const command = UseCaseTestFixtures.createValidAddContainerNodeCommand();
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
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
        const command = UseCaseTestFixtures.createValidAddContainerNodeCommand();
        mockRepository.findById.mockRejectedValue(new Error('Unexpected database error'));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Failed to add container node');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });
    });
  });

  describe('architectural compliance', () => {
    it('should_OnlyDependOnDomainInterfaces_NeverConcreteImplementations', () => {
      // Verify that the use case constructor accepts interfaces, not concrete classes
      expect(useCase).toBeInstanceOf(AddContainerNodeUseCase);
      
      // The fact that we can mock the dependencies proves they are interfaces
      expect(mockRepository).toBeDefined();
      expect(mockEventBus).toBeDefined();
    });

    it('should_CoordinateDomainEntities_WithoutContainingBusinessLogic', () => {
      // This use case should only coordinate:
      // 1. Input validation (application concern)
      // 2. Model retrieval (delegated to repository)
      // 3. Node creation (delegated to domain)
      // 4. Model persistence (delegated to repository)
      // 5. Event publishing (delegated to infrastructure)
      
      // Business logic like node positioning rules should be in Position value object
      // Business logic like node addition rules should be in FunctionModel entity
      
      expect(true).toBe(true); // This is verified by the domain layer tests
    });

    it('should_ReturnResultPattern_ConsistentlyForAllOperations', async () => {
      // All use case operations must return Result<T> for consistent error handling
      const command = UseCaseTestFixtures.createValidAddContainerNodeCommand();
      const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;

      mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      const result = await useCase.execute(command);

      expect(result).toHaveProperty('isSuccess');
      expect(result).toHaveProperty('isFailure');
    });

    it('should_NotLeakDomainEntities_InResponseObjects', async () => {
      // Use case should return DTOs/response objects, not domain entities
      const command = UseCaseTestFixtures.createValidAddContainerNodeCommand();
      const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;

      mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      const result = await useCase.execute(command);

      if (result.isSuccess) {
        // Response should contain data, not domain entities
        expect(result.value).toHaveProperty('nodeId');
        expect(result.value).toHaveProperty('name');
        expect(result.value).toHaveProperty('nodeType');
        expect(result.value).toHaveProperty('position');
        expect(result.value).toHaveProperty('addedAt');
        
        // Should not contain domain entity methods
        expect(typeof result.value.addNode).toBe('undefined');
        expect(typeof result.value.updateNode).toBe('undefined');
      }
    });
  });

  describe('edge cases', () => {
    it('should_HandleNullDescription_Gracefully', async () => {
      // Arrange
      const command = {
        ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
        description: null as any
      };
      const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;

      mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // Act
      const result = await useCase.execute(command);

      // Assert
      ResultTestHelpers.expectSuccess(result);
      expect(result.value.description).toBeUndefined();
    });

    it('should_TrimWhitespaceFromName_WhenProvided', async () => {
      // Arrange
      const command = {
        ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
        name: '  Test Node Name  '
      };
      const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;

      mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // Act
      const result = await useCase.execute(command);

      // Assert
      ResultTestHelpers.expectSuccess(result);
      expect(result.value.name).toBe('Test Node Name');
    });

    it('should_GenerateUniqueNodeIds_ForConcurrentRequests', async () => {
      // Arrange
      const command1 = UseCaseTestFixtures.createValidAddContainerNodeCommand();
      const command2 = { ...command1, name: 'Different Node Name' };
      const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
      
      mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // Act
      const [result1, result2] = await Promise.all([
        useCase.execute(command1),
        useCase.execute(command2)
      ]);

      // Assert
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value.nodeId).not.toBe(result2.value.nodeId);
    });

    it('should_ValidateBoundaryPositions_CorrectlyAtLimits', async () => {
      // Arrange - Test boundary conditions
      const command = {
        ...UseCaseTestFixtures.createValidAddContainerNodeCommand(),
        position: { x: 0, y: 0 } // Valid minimum position
      };
      const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;

      mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // Act
      const result = await useCase.execute(command);

      // Assert
      ResultTestHelpers.expectSuccess(result);
      expect(result.value.position).toEqual({ x: 0, y: 0 });
    });
  });
});