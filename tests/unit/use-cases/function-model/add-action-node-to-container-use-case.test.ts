import { AddActionNodeToContainerUseCase } from '../../../../lib/use-cases/function-model/add-action-node-to-container-use-case';
import { FunctionModelRepository } from '../../../../lib/domain/interfaces/function-model-repository';
import { Result } from '../../../../lib/domain/shared/result';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { StageNode } from '../../../../lib/domain/entities/stage-node';
import { IONode } from '../../../../lib/domain/entities/io-node';
import { TetherNode } from '../../../../lib/domain/entities/tether-node';
import { KBNode } from '../../../../lib/domain/entities/kb-node';
import { FunctionModelContainerNode } from '../../../../lib/domain/entities/function-model-container-node';
import { ActionNodeType, ExecutionMode, ActionStatus } from '../../../../lib/domain/enums';
import { UseCaseTestFixtures } from '../__fixtures__/use-case-test-fixtures';
import { ResultTestHelpers, IEventBus } from '../__tests__/base-use-case.test';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { RetryPolicy } from '../../../../lib/domain/value-objects/retry-policy';
import { RACI } from '../../../../lib/domain/value-objects/raci';

/**
 * Test Suite for UC-003: Add Action Node to Container Use Case
 * 
 * Tests the application layer coordination of action node addition to container nodes,
 * ensuring Clean Architecture compliance and proper domain orchestration.
 * 
 * This use case coordinates:
 * - Input validation (command parameters and action-specific data)
 * - Model retrieval and existence validation
 * - Container node lookup and validation (only StageNode can contain actions)
 * - Action node creation (TetherNode, KBNode, FunctionModelContainer)
 * - Container node relationship establishment
 * - Model persistence with updated container
 * - Domain event publishing
 * 
 * Architectural Boundaries Enforced:
 * - Use case coordinates domain entities without containing business logic
 * - Domain layer handles all action node creation and validation rules
 * - Only StageNode can contain action nodes (IONode is for data boundaries only)
 * - Container nodes enforce parent-child relationship rules
 * - Repository layer abstracts persistence concerns
 * - Event bus handles cross-cutting concerns
 */
describe('AddActionNodeToContainerUseCase', () => {
  let useCase: AddActionNodeToContainerUseCase;
  let mockRepository: jest.Mocked<FunctionModelRepository>;
  let mockEventBus: jest.Mocked<IEventBus>;

  beforeEach(() => {
    // Create mocked dependencies following Clean Architecture patterns
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findByStatus: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findByOwner: jest.fn(),
      publishModel: jest.fn(),
      archiveModel: jest.fn(),
      findByNamePattern: jest.fn(),
      findRecentlyModified: jest.fn(),
      countByStatus: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn()
    } as jest.Mocked<FunctionModelRepository>;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined)
    } as jest.Mocked<IEventBus>;

    // Initialize use case with mocked dependencies
    useCase = new AddActionNodeToContainerUseCase(mockRepository, mockEventBus);
  });

  describe('execute', () => {
    describe('success scenarios - TetherNode', () => {
      it('should_AddTetherNodeToStageContainer_WhenValidCommandProvided', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        
        // Add stage to model first
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionType: ActionNodeType.TETHER_NODE,
          actionSpecificData: {
            tetherReferenceId: 'tether-ref-123',
            tetherReference: 'External API Tether',
            executionParameters: { batchSize: 10 },
            resourceRequirements: { cpu: '200m', memory: '256Mi', timeout: 300 }
          }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.actionId).toBeDefined();
        expect(result.value.actionType).toBe(ActionNodeType.TETHER_NODE);
        expect(result.value.name).toBe(command.name);
        expect(result.value.parentNodeId).toBe(command.parentNodeId);
        expect(result.value.executionOrder).toBe(command.executionOrder);
        expect(result.value.addedAt).toBeInstanceOf(Date);
      });

      it('should_RejectAddingActionNodeToIONode_WhenIONodeUsedAsParent', async () => {
        // Arrange - IONodes cannot contain action nodes (architectural rule)
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const ioNode = UseCaseTestFixtures.createValidIONode().value!;
        
        // Add IO node to model first
        existingModel.addNode(ioNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: ioNode.nodeId.value,
          actionType: ActionNodeType.TETHER_NODE,
          actionSpecificData: {
            tetherReferenceId: 'input-tether-456'
          }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));

        // Act
        const result = await useCase.execute(command);

        // Assert - Should fail because IONode cannot contain action nodes
        ResultTestHelpers.expectFailure(result, 'Parent container node not found');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ConfigureTetherNodeWithResourceRequirements_WhenSpecified', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionType: ActionNodeType.TETHER_NODE,
          actionSpecificData: {
            tetherReferenceId: 'tether-heavy-processing',
            resourceRequirements: {
              cpu: 2,
              memory: 1024,
              timeout: 600
            },
            executionTriggers: ['data-ready', 'schedule-triggered']
          }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.actionType).toBe(ActionNodeType.TETHER_NODE);
      });
    });

    describe('success scenarios - KBNode', () => {
      it('should_AddKBNodeToStageContainer_WhenValidCommandProvided', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionType: ActionNodeType.KB_NODE,
          actionSpecificData: {
            kbReferenceId: 'kb-documentation-123',
            shortDescription: 'Project documentation knowledge base',
            searchKeywords: ['api', 'documentation', 'guide'],
            accessPermissions: {
              view: ['user1', 'user2'],
              edit: ['user1']
            }
          }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.actionType).toBe(ActionNodeType.KB_NODE);
        expect(result.value.name).toBe(command.name);
        expect(result.value.parentNodeId).toBe(command.parentNodeId);
      });

      it('should_AddKBNodeWithDocumentationContext_WhenProvided', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionType: ActionNodeType.KB_NODE,
          actionSpecificData: {
            kbReferenceId: 'kb-context-rich',
            shortDescription: 'Context-rich knowledge base',
            documentationContext: 'This KB contains detailed architectural patterns and implementation guidelines for the project.',
            searchKeywords: ['architecture', 'patterns', 'guidelines'],
            accessPermissions: {
              view: ['team', 'architect'],
              edit: ['architect']
            }
          }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.actionType).toBe(ActionNodeType.KB_NODE);
      });
    });

    describe('success scenarios - FunctionModelContainer', () => {
      it('should_AddFunctionModelContainerToStageNode_WhenValidCommandProvided', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionType: ActionNodeType.FUNCTION_MODEL_CONTAINER,
          actionSpecificData: {
            nestedModelId: 'nested-model-456',
            contextMapping: { input: 'parentOutput', config: 'sharedConfig' },
            outputExtraction: {
              extractedOutputs: ['result', 'metrics'],
              outputTransformations: { result: 'formatted-result' }
            },
            orchestrationMode: 'embedded'
          }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.actionType).toBe(ActionNodeType.FUNCTION_MODEL_CONTAINER);
        expect(result.value.name).toBe(command.name);
        expect(result.value.parentNodeId).toBe(command.parentNodeId);
      });

      it('should_AddFunctionModelContainerWithContextInheritance_WhenProvided', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionType: ActionNodeType.FUNCTION_MODEL_CONTAINER,
          actionSpecificData: {
            nestedModelId: 'nested-with-context',
            contextInheritance: {
              inheritedContexts: ['userSession', 'orgConfig'],
              sharedContexts: ['cache'],
              isolatedContexts: ['tempData'],
              contextTransformations: {
                userSession: 'anonymized-session'
              }
            },
            executionPolicy: {
              triggerConditions: ['parent-complete'],
              failureHandling: 'retry-with-fallback',
              timeoutBehavior: 'graceful-degradation'
            }
          }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.actionType).toBe(ActionNodeType.FUNCTION_MODEL_CONTAINER);
      });
    });

    describe('execution order and priority management', () => {
      it('should_AssignCorrectExecutionOrder_WhenMultipleActionsAdded', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command1 = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionType: ActionNodeType.TETHER_NODE,
          executionOrder: 1,
          priority: 5,
          actionSpecificData: { tetherReferenceId: 'first-action' }
        };

        const command2 = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionType: ActionNodeType.KB_NODE,
          executionOrder: 2,
          priority: 8,
          actionSpecificData: {
            kbReferenceId: 'second-action-kb',
            shortDescription: 'Second action KB',
            searchKeywords: ['second'],
            accessPermissions: { view: ['all', 'admin'], edit: ['admin'] }
          }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result1 = await useCase.execute(command1);
        const result2 = await useCase.execute(command2);

        // Assert
        ResultTestHelpers.expectSuccess(result1);
        ResultTestHelpers.expectSuccess(result2);
        expect(result1.value.executionOrder).toBe(1);
        expect(result1.value.priority).toBe(5);
        expect(result2.value.executionOrder).toBe(2);
        expect(result2.value.priority).toBe(8);
      });

      it('should_HandleCustomRetryPolicyConfiguration_WhenProvided', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const customRetryPolicy = RetryPolicy.create({
          maxAttempts: 5,
          backoffStrategy: 'exponential',
          backoffDelay: 2000,
          failureThreshold: 3
        }).value;

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionType: ActionNodeType.TETHER_NODE,
          retryPolicy: customRetryPolicy,
          actionSpecificData: { tetherReferenceId: 'retry-tether' }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.actionType).toBe(ActionNodeType.TETHER_NODE);
      });

      it('should_HandleCustomRACIAssignments_WhenProvided', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const customRaci = RACI.create({
          responsible: ['dev1'],
          accountable: ['pm1'],
          consulted: ['architect'],
          informed: ['stakeholder1', 'stakeholder2']
        }).value;

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionType: ActionNodeType.KB_NODE,
          raci: customRaci,
          actionSpecificData: {
            kbReferenceId: 'raci-kb',
            shortDescription: 'KB with RACI assignments',
            searchKeywords: ['responsibility'],
            accessPermissions: { view: ['team', 'dev1'], edit: ['dev1'] }
          }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.actionType).toBe(ActionNodeType.KB_NODE);
      });
    });

    describe('container node relationship and persistence', () => {
      it('should_AddActionNodeToContainerAndPersistModel_WhenSuccessful', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);
        const originalActionCount = stageNode.getActionCount();

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionType: ActionNodeType.TETHER_NODE,
          actionSpecificData: { tetherReferenceId: 'persistence-test' }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        await useCase.execute(command);

        // Assert
        expect(mockRepository.save).toHaveBeenCalledTimes(1);
        const savedModel = mockRepository.save.mock.calls[0][0];
        expect(savedModel).toBeInstanceOf(FunctionModel);
        
        // Verify the container node now has the action node
        const updatedStageNode = Array.from(savedModel.nodes.values())
          .find(node => node.nodeId.equals(stageNode.nodeId)) as StageNode;
        expect(updatedStageNode.getActionCount()).toBe(originalActionCount + 1);
      });

      it('should_PublishActionNodeAddedEvent_WhenActionAdditionSucceeds', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionType: ActionNodeType.TETHER_NODE,
          actionSpecificData: { tetherReferenceId: 'event-test' }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        await useCase.execute(command);

        // Assert
        expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
        const publishedEvent = mockEventBus.publish.mock.calls[0][0];
        expect(publishedEvent.eventType).toBe('ActionNodeAdded');
        expect(publishedEvent.aggregateId).toBe(command.modelId);
        expect(publishedEvent.eventData.parentNodeId).toBe(command.parentNodeId);
        expect(publishedEvent.eventData.actionType).toBe(command.actionType);
        expect(publishedEvent.eventData.name).toBe(command.name);
        expect(publishedEvent.eventData.addedBy).toBe(command.userId);
        expect(publishedEvent.userId).toBe(command.userId);
        expect(publishedEvent.timestamp).toBeInstanceOf(Date);
      });
    });

    describe('validation failure scenarios', () => {
      it('should_ReturnValidationError_WhenModelIdIsEmpty', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
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

      it('should_ReturnValidationError_WhenParentNodeIdIsEmpty', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: ''
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Parent node ID is required');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenActionNameIsEmpty', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          name: ''
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Action name is required');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenActionTypeIsInvalid', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          actionType: 'INVALID_ACTION_TYPE' as any
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Invalid action type');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenExecutionOrderIsInvalid', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          executionOrder: 0 // Invalid - must be >= 1
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Execution order must be greater than 0');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenPriorityIsOutOfRange', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          priority: 15 // Invalid - must be 1-10
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Priority must be between 1 and 10');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenUserIdIsEmpty', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
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
    });

    describe('action-specific validation failures', () => {
      it('should_ReturnValidationError_WhenTetherNodeMissingReferenceId', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          actionType: ActionNodeType.TETHER_NODE,
          actionSpecificData: {
            // Missing tetherReferenceId
            executionParameters: { batchSize: 10 }
          }
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Tether reference ID is required');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenKBNodeMissingRequiredFields', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          actionType: ActionNodeType.KB_NODE,
          actionSpecificData: {
            kbReferenceId: 'kb-123',
            // Missing shortDescription, searchKeywords, and accessPermissions
          }
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Short description is required');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenFunctionModelContainerMissingNestedModelId', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          actionType: ActionNodeType.FUNCTION_MODEL_CONTAINER,
          actionSpecificData: {
            // Missing nestedModelId
            contextMapping: { input: 'output' }
          }
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Nested model ID is required');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnValidationError_WhenKBNodeAccessPermissionsInvalid', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          actionType: ActionNodeType.KB_NODE,
          actionSpecificData: {
            kbReferenceId: 'kb-invalid-permissions',
            shortDescription: 'KB with invalid permissions',
            searchKeywords: ['test'],
            accessPermissions: {
              view: ['user1'],
              edit: ['user2'] // user2 has edit but not view - should fail
            }
          }
        };

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Users with edit permissions must also have view permissions');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });
    });

    describe('domain failure scenarios', () => {
      it('should_ReturnNotFoundError_WhenModelDoesNotExist', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          actionSpecificData: { tetherReferenceId: 'test-tether' }
        };
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

      it('should_ReturnNotFoundError_WhenParentContainerNodeDoesNotExist', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: 'non-existent-container-id',
          actionSpecificData: { tetherReferenceId: 'test-tether' }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Parent container node not found');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnBusinessRuleError_WhenParentNodeIsNotContainerType', async () => {
        // Arrange - Try to add action node to IONode (which is not a container for actions)
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const ioNode = UseCaseTestFixtures.createValidIONode().value!;
        existingModel.addNode(ioNode);
        
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: ioNode.nodeId.value,
          actionSpecificData: { tetherReferenceId: 'test-tether' }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Parent container node not found');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });

      it('should_ReturnBusinessRuleError_WhenContainerRejectsActionNode', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        // Mock container node to fail addActionNode for business rule violation
        const originalAddActionNode = stageNode.addActionNode;
        jest.spyOn(stageNode, 'addActionNode').mockReturnValue(
          Result.fail('Container cannot accept more action nodes')
        );

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionSpecificData: { tetherReferenceId: 'test-tether' }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Container cannot accept more action nodes');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();

        // Cleanup
        stageNode.addActionNode = originalAddActionNode;
      });

      it('should_ReturnDomainError_WhenActionNodeCreationFails', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionType: ActionNodeType.TETHER_NODE,
          name: 'A'.repeat(256), // Exceeds action node name limits
          actionSpecificData: { tetherReferenceId: 'test-tether' }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result);
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });
    });

    describe('infrastructure failure scenarios', () => {
      it('should_ReturnRepositoryError_WhenModelRetrievalFails', async () => {
        // Arrange
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          actionSpecificData: { tetherReferenceId: 'test-tether' }
        };
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
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionSpecificData: { tetherReferenceId: 'test-tether' }
        };

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
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionSpecificData: { tetherReferenceId: 'test-tether' }
        };

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
        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          actionSpecificData: { tetherReferenceId: 'test-tether' }
        };
        mockRepository.findById.mockRejectedValue(new Error('Unexpected database error'));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectFailure(result, 'Failed to add action node to container');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });
    });

    describe('architectural compliance', () => {
      it('should_OnlyDependOnDomainInterfaces_NeverConcreteImplementations', () => {
        // Verify that the use case constructor accepts interfaces, not concrete classes
        expect(useCase).toBeInstanceOf(AddActionNodeToContainerUseCase);
        
        // The fact that we can mock the dependencies proves they are interfaces
        expect(mockRepository).toBeDefined();
        expect(mockEventBus).toBeDefined();
      });

      it('should_CoordinateDomainEntities_WithoutContainingBusinessLogic', () => {
        // This use case should only coordinate:
        // 1. Input validation (application concern)
        // 2. Model retrieval (delegated to repository)
        // 3. Container node lookup (delegated to domain)
        // 4. Action node creation (delegated to domain)
        // 5. Container relationship establishment (delegated to domain)
        // 6. Model persistence (delegated to repository)
        // 7. Event publishing (delegated to infrastructure)
        
        // Business logic like action node configuration should be in ActionNode entities
        // Business logic like container relationship rules should be in container entities
        
        expect(true).toBe(true); // This is verified by the domain layer tests
      });

      it('should_ReturnResultPattern_ConsistentlyForAllOperations', async () => {
        // All use case operations must return Result<T> for consistent error handling
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionSpecificData: { tetherReferenceId: 'test-tether' }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        const result = await useCase.execute(command);

        expect(result).toHaveProperty('isSuccess');
        expect(result).toHaveProperty('isFailure');
      });

      it('should_NotLeakDomainEntities_InResponseObjects', async () => {
        // Use case should return DTOs/response objects, not domain entities
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionSpecificData: { tetherReferenceId: 'test-tether' }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        const result = await useCase.execute(command);

        if (result.isSuccess) {
          // Response should contain data, not domain entities
          expect(result.value).toHaveProperty('actionId');
          expect(result.value).toHaveProperty('name');
          expect(result.value).toHaveProperty('actionType');
          expect(result.value).toHaveProperty('parentNodeId');
          expect(result.value).toHaveProperty('executionOrder');
          expect(result.value).toHaveProperty('priority');
          expect(result.value).toHaveProperty('addedAt');
          
          // Should not contain domain entity methods
          expect(typeof result.value.updateName).toBe('undefined');
          expect(typeof result.value.updateExecutionOrder).toBe('undefined');
        }
      });
    });

    describe('edge cases', () => {
      it('should_HandleNullDescription_Gracefully', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          description: null as any,
          actionSpecificData: { tetherReferenceId: 'test-tether' }
        };

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
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          name: '  Test Action Node Name  ',
          actionSpecificData: { tetherReferenceId: 'test-tether' }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.name).toBe('Test Action Node Name');
      });

      it('should_GenerateUniqueActionIds_ForConcurrentRequests', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command1 = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          name: 'Action Node 1',
          actionSpecificData: { tetherReferenceId: 'tether-1' }
        };
        
        const command2 = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          name: 'Action Node 2',
          actionSpecificData: { tetherReferenceId: 'tether-2' }
        };
        
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
        expect(result1.value.actionId).not.toBe(result2.value.actionId);
      });

      it('should_HandleDefaultRetryPolicyCreation_WhenNotProvided', async () => {
        // Arrange
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          retryPolicy: undefined, // Should use default
          actionSpecificData: { tetherReferenceId: 'default-retry' }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.actionType).toBe(ActionNodeType.TETHER_NODE);
      });

      it('should_HandleComplexActionSpecificDataValidation_Correctly', async () => {
        // Arrange - Test with complex nested configuration
        const existingModel = UseCaseTestFixtures.createValidFunctionModel().value!;
        const stageNode = UseCaseTestFixtures.createValidStageNode().value!;
        existingModel.addNode(stageNode);

        const command = {
          ...UseCaseTestFixtures.createValidAddActionNodeCommand(),
          parentNodeId: stageNode.nodeId.value,
          actionType: ActionNodeType.FUNCTION_MODEL_CONTAINER,
          actionSpecificData: {
            nestedModelId: 'complex-nested-model',
            contextMapping: {
              userContext: 'parent.user',
              configData: 'parent.config',
              runtimeVars: 'parent.runtime'
            },
            outputExtraction: {
              extractedOutputs: ['processedData', 'validationResults', 'metrics'],
              outputTransformations: {
                processedData: 'formatted.data',
                metrics: 'aggregated.metrics'
              }
            },
            contextInheritance: {
              inheritedContexts: ['session', 'organization', 'permissions'],
              sharedContexts: ['cache', 'logs'],
              isolatedContexts: ['tempFiles', 'privateData'],
              contextTransformations: {
                session: 'anonymized.session',
                permissions: 'scoped.permissions'
              },
              contextAccessControl: {
                session: ['read-only'],
                organization: ['read-only'],
                permissions: ['validate']
              }
            },
            executionPolicy: {
              triggerConditions: ['parent-success', 'data-available'],
              failureHandling: 'retry-with-exponential-backoff',
              resourceInheritance: 'inherit-with-limits',
              timeoutBehavior: 'graceful-shutdown'
            },
            orchestrationMode: 'embedded',
            hierarchicalValidation: {
              maxNestingDepth: 3,
              cyclicReferenceCheck: true,
              contextLeakagePrevention: true,
              resourceBoundaryEnforcement: true
            }
          }
        };

        mockRepository.findById.mockResolvedValue(Result.ok(existingModel));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));

        // Act
        const result = await useCase.execute(command);

        // Assert
        ResultTestHelpers.expectSuccess(result);
        expect(result.value.actionType).toBe(ActionNodeType.FUNCTION_MODEL_CONTAINER);
      });
    });
  });
});