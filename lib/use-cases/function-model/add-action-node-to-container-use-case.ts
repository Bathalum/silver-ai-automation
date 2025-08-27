import { FunctionModel } from '../../domain/entities/function-model';
import { StageNode } from '../../domain/entities/stage-node';
import { IONode } from '../../domain/entities/io-node';
import { TetherNode } from '../../domain/entities/tether-node';
import { KBNode } from '../../domain/entities/kb-node';
import { FunctionModelContainerNode } from '../../domain/entities/function-model-container-node';
import { ActionNodeType, ExecutionMode, ActionStatus } from '../../domain/enums';
import { NodeId } from '../../domain/value-objects/node-id';
import { RetryPolicy } from '../../domain/value-objects/retry-policy';
import { RACI } from '../../domain/value-objects/raci';
import { Result } from '../../domain/shared/result';
import { AddActionNodeCommand } from '../commands/node-commands';
import { FunctionModelRepository } from '../../domain/interfaces/function-model-repository';

export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
}

export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  eventData: any;
  userId?: string;
  timestamp: Date;
}

export interface AddActionNodeToContainerResult {
  actionId: string;
  name: string;
  actionType: ActionNodeType;
  parentNodeId: string;
  executionOrder: number;
  priority: number;
  description?: string;
  addedAt: Date;
}

/**
 * UC-003: Add Action Node to Container Use Case
 * 
 * Coordinates the addition of action nodes (Tether, KB, FunctionModelContainer) 
 * to existing container nodes (Stage, IO) within a function model.
 * 
 * Clean Architecture Responsibilities:
 * - Input validation (application concern)
 * - Model and container node retrieval (delegated to repository)
 * - Action node creation (delegated to domain entities)
 * - Container relationship establishment (delegated to domain)
 * - Model persistence (delegated to repository)
 * - Event publishing (delegated to infrastructure)
 * 
 * This use case enforces architectural boundaries by:
 * - Not containing business logic (delegated to domain layer)
 * - Using dependency inversion (interfaces only)
 * - Returning DTOs instead of domain entities
 * - Handling cross-cutting concerns through infrastructure
 */
export class AddActionNodeToContainerUseCase {
  constructor(
    private modelRepository: FunctionModelRepository,
    private eventBus: IEventBus
  ) {}

  async execute(command: AddActionNodeCommand): Promise<Result<AddActionNodeToContainerResult>> {
    try {
      // Validate command (application layer responsibility)
      const validationResult = this.validateCommand(command);
      if (validationResult.isFailure) {
        return Result.fail<AddActionNodeToContainerResult>(validationResult.error);
      }

      // Retrieve existing model (delegated to repository)
      const modelResult = await this.modelRepository.findById(command.modelId);
      if (modelResult.isFailure) {
        return Result.fail<AddActionNodeToContainerResult>(modelResult.error);
      }

      const model = modelResult.value;
      if (!model) {
        return Result.fail<AddActionNodeToContainerResult>('Function model not found');
      }

      // Find parent container node (delegated to domain)
      const containerNode = this.findContainerNode(model, command.parentNodeId);
      if (!containerNode) {
        return Result.fail<AddActionNodeToContainerResult>('Parent container node not found');
      }

      // Validate container node type (business rule)
      if (!this.isContainerNodeType(containerNode)) {
        return Result.fail<AddActionNodeToContainerResult>('Parent node is not a container type');
      }

      // Generate unique action ID
      const actionId = NodeId.generate();

      // Create action node based on type (delegated to domain entities)
      const actionNodeResult = await this.createActionNode(
        actionId,
        NodeId.create(command.parentNodeId).value,
        command
      );

      if (actionNodeResult.isFailure) {
        return Result.fail<AddActionNodeToContainerResult>(actionNodeResult.error);
      }

      const actionNode = actionNodeResult.value;

      // Add action node to container (delegated to domain)
      const addActionResult = containerNode.addActionNode(actionNode);
      if (addActionResult.isFailure) {
        return Result.fail<AddActionNodeToContainerResult>(addActionResult.error);
      }

      // Save updated model to repository
      const saveResult = await this.modelRepository.save(model);
      if (saveResult.isFailure) {
        return Result.fail<AddActionNodeToContainerResult>(`Failed to save model: ${saveResult.error}`);
      }

      // Publish domain event (failure should not fail the primary operation)
      try {
        await this.eventBus.publish({
          eventType: 'ActionNodeAdded',
          aggregateId: command.modelId,
          eventData: {
            modelId: command.modelId,
            actionId: actionNode.actionId.value,
            parentNodeId: command.parentNodeId,
            actionType: command.actionType,
            name: command.name,
            executionOrder: command.executionOrder,
            priority: command.priority,
            addedBy: command.userId
          },
          userId: command.userId,
          timestamp: new Date()
        });
      } catch (eventError) {
        // Log event publishing failure but don't fail the operation
        console.warn('Failed to publish ActionNodeAdded event:', eventError);
      }

      // Return success result (DTO - not domain entity)
      return Result.ok<AddActionNodeToContainerResult>({
        actionId: actionNode.actionId.value,
        name: command.name.trim(),
        actionType: command.actionType,
        parentNodeId: command.parentNodeId,
        executionOrder: command.executionOrder,
        priority: command.priority,
        description: command.description?.trim(),
        addedAt: new Date()
      });

    } catch (error) {
      return Result.fail<AddActionNodeToContainerResult>(
        `Failed to add action node to container: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateCommand(command: AddActionNodeCommand): Result<void> {
    if (!command.modelId || command.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!command.parentNodeId || command.parentNodeId.trim().length === 0) {
      return Result.fail<void>('Parent node ID is required');
    }

    if (!command.name || command.name.trim().length === 0) {
      return Result.fail<void>('Action name is required');
    }

    if (command.name.trim().length > 200) {
      return Result.fail<void>('Action name cannot exceed 200 characters');
    }

    if (!command.userId || command.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    if (!Object.values(ActionNodeType).includes(command.actionType)) {
      return Result.fail<void>('Invalid action type');
    }

    if (!command.executionMode || !Object.values(ExecutionMode).includes(command.executionMode)) {
      return Result.fail<void>('Invalid execution mode');
    }

    if (command.executionOrder < 1) {
      return Result.fail<void>('Execution order must be greater than 0');
    }

    if (command.priority < 1 || command.priority > 10) {
      return Result.fail<void>('Priority must be between 1 and 10');
    }

    if (command.description && command.description.length > 1000) {
      return Result.fail<void>('Description cannot exceed 1000 characters');
    }

    // Validate action-specific data
    return this.validateActionSpecificData(command.actionType, command.actionSpecificData);
  }

  private validateActionSpecificData(actionType: ActionNodeType, data: Record<string, any>): Result<void> {
    switch (actionType) {
      case ActionNodeType.TETHER_NODE:
        if (!data.tetherReferenceId || data.tetherReferenceId.trim().length === 0) {
          return Result.fail<void>('Tether reference ID is required');
        }
        break;

      case ActionNodeType.KB_NODE:
        if (!data.kbReferenceId || data.kbReferenceId.trim().length === 0) {
          return Result.fail<void>('KB reference ID is required');
        }
        if (!data.shortDescription || data.shortDescription.trim().length === 0) {
          return Result.fail<void>('Short description is required');
        }
        if (!data.searchKeywords || !Array.isArray(data.searchKeywords)) {
          return Result.fail<void>('Search keywords are required');
        }
        if (!data.accessPermissions || 
            !data.accessPermissions.view || !data.accessPermissions.edit ||
            !Array.isArray(data.accessPermissions.view) || !Array.isArray(data.accessPermissions.edit)) {
          return Result.fail<void>('Access permissions are required');
        }
        // Validate that edit users have view permissions
        const editUsers = data.accessPermissions.edit;
        const viewUsers = data.accessPermissions.view;
        const missingViewPermissions = editUsers.filter((user: string) => !viewUsers.includes(user));
        if (missingViewPermissions.length > 0) {
          return Result.fail<void>('Users with edit permissions must also have view permissions');
        }
        break;

      case ActionNodeType.FUNCTION_MODEL_CONTAINER:
        if (!data.nestedModelId || data.nestedModelId.trim().length === 0) {
          return Result.fail<void>('Nested model ID is required');
        }
        break;

      default:
        return Result.fail<void>('Unsupported action type');
    }

    return Result.ok<void>(undefined);
  }

  private findContainerNode(model: FunctionModel, parentNodeId: string): StageNode | null {
    // Find node in the model's nodes collection
    const nodeIdResult = NodeId.create(parentNodeId);
    if (nodeIdResult.isFailure) {
      return null;
    }

    const nodeId = nodeIdResult.value;
    const node = Array.from(model.nodes.values()).find(n => n.nodeId.equals(nodeId));
    
    if (!node) {
      return null;
    }

    // Check if it's a container type that can hold action nodes (only StageNode)
    if (node instanceof StageNode) {
      return node;
    }

    return null;
  }

  private isContainerNodeType(node: any): node is StageNode {
    return node instanceof StageNode;
  }

  private async createActionNode(
    actionId: NodeId, 
    parentNodeId: NodeId, 
    command: AddActionNodeCommand
  ): Promise<Result<TetherNode | KBNode | FunctionModelContainerNode>> {
    
    const baseProps = {
      actionId,
      parentNodeId,
      modelId: command.modelId,
      name: command.name.trim(),
      description: command.description?.trim(),
      executionMode: command.executionMode,
      executionOrder: command.executionOrder,
      status: ActionStatus.DRAFT,
      priority: command.priority,
      estimatedDuration: command.estimatedDuration,
      retryPolicy: command.retryPolicy,
    };

    switch (command.actionType) {
      case ActionNodeType.TETHER_NODE:
        return TetherNode.create({
          ...baseProps,
          actionType: ActionNodeType.TETHER_NODE,
          tetherData: {
            tetherReferenceId: command.actionSpecificData.tetherReferenceId,
            tetherReference: command.actionSpecificData.tetherReference,
            executionParameters: command.actionSpecificData.executionParameters,
            outputMapping: command.actionSpecificData.outputMapping,
            executionTriggers: command.actionSpecificData.executionTriggers,
            resourceRequirements: command.actionSpecificData.resourceRequirements,
            integrationConfig: command.actionSpecificData.integrationConfig,
            failureHandling: command.actionSpecificData.failureHandling
          }
        });

      case ActionNodeType.KB_NODE:
        const retryPolicy = command.retryPolicy || RetryPolicy.create({
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          backoffDelay: 1000,
          failureThreshold: 2
        }).value!;
        
        const raci = command.raci || RACI.empty();
        
        return KBNode.create({
          actionId: actionId.value,
          parentNodeId: parentNodeId.value,
          modelId: command.modelId,
          name: command.name.trim(),
          description: command.description?.trim(),
          executionMode: command.executionMode,
          executionOrder: command.executionOrder,
          status: ActionStatus.DRAFT,
          priority: command.priority,
          estimatedDuration: command.estimatedDuration || 0,
          retryPolicy,
          raci,
          metadata: {},
          kbData: {
            kbReferenceId: command.actionSpecificData.kbReferenceId,
            shortDescription: command.actionSpecificData.shortDescription,
            documentationContext: command.actionSpecificData.documentationContext,
            searchKeywords: command.actionSpecificData.searchKeywords,
            accessPermissions: command.actionSpecificData.accessPermissions
          }
        });

      case ActionNodeType.FUNCTION_MODEL_CONTAINER:
        return FunctionModelContainerNode.create({
          ...baseProps,
          actionType: ActionNodeType.FUNCTION_MODEL_CONTAINER,
          configuration: {
            nestedModelId: command.actionSpecificData.nestedModelId,
            contextMapping: command.actionSpecificData.contextMapping,
            outputExtraction: command.actionSpecificData.outputExtraction,
            contextInheritance: command.actionSpecificData.contextInheritance,
            executionPolicy: command.actionSpecificData.executionPolicy,
            orchestrationMode: command.actionSpecificData.orchestrationMode,
            hierarchicalValidation: command.actionSpecificData.hierarchicalValidation
          }
        });

      default:
        return Result.fail('Unsupported action type');
    }
  }
}