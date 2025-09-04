import { FunctionModel } from '../../domain/entities/function-model';
import { StageNode } from '../../domain/entities/stage-node';
import { TetherNode } from '../../domain/entities/tether-node';
import { KBNode } from '../../domain/entities/kb-node';
import { FunctionModelContainerNode } from '../../domain/entities/function-model-container-node';
import { NodeId } from '../../domain/value-objects/node-id';
import { RetryPolicy } from '../../domain/value-objects/retry-policy';
import { RACI } from '../../domain/value-objects/raci';
import { ActionNodeType, ExecutionMode, ActionStatus } from '../../domain/enums';
import { Result } from '../../domain/shared/result';
import { IFunctionModelRepository } from '../../domain/interfaces/function-model-repository';
import { NodeRepository } from '../../domain/interfaces/node-repository';
import { AddActionNodeCommand } from '../commands/node-commands';

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

export interface AddActionNodeResult {
  actionId: string;
  parentNodeId: string;
  name: string;
  actionType: ActionNodeType;
  addedAt: Date;
}

export class AddActionNodeToContainerUseCase {
  constructor(
    private modelRepository: IFunctionModelRepository,
    private nodeRepository: NodeRepository,
    private eventBus: IEventBus
  ) {}

  async execute(command: AddActionNodeCommand): Promise<Result<AddActionNodeResult>> {
    try {
      // Validate command
      const validationResult = this.validateCommand(command);
      if (validationResult.isFailure) {
        return Result.fail<AddActionNodeResult>(validationResult.error);
      }

      // Retrieve existing model
      const modelResult = await this.modelRepository.findById(command.modelId);
      if (modelResult.isFailure) {
        return Result.fail<AddActionNodeResult>(modelResult.error);
      }

      if (!modelResult.value) {
        return Result.fail<AddActionNodeResult>('Function model not found');
      }

      const model = modelResult.value;

      // Find the parent container node (must be a StageNode)
      const parentNode = model.nodes.get(command.parentNodeId);
      if (!parentNode) {
        return Result.fail<AddActionNodeResult>('Parent container node not found');
      }

      if (!(parentNode instanceof StageNode)) {
        return Result.fail<AddActionNodeResult>('Parent node must be a StageNode to contain action nodes');
      }

      // Generate unique action ID
      const actionId = NodeId.generate();

      // Create action node based on type
      let actionNodeResult: Result<TetherNode | KBNode | FunctionModelContainerNode>;
      
      if (command.actionType === ActionNodeType.TETHER_NODE) {
        actionNodeResult = TetherNode.create({
          actionId,
          parentNodeId: command.parentNodeId,
          modelId: command.modelId,
          name: command.name.trim(),
          description: command.description?.trim(),
          actionType: ActionNodeType.TETHER_NODE,
          executionMode: command.executionMode || ExecutionMode.SEQUENTIAL,
          executionOrder: command.executionOrder || 1,
          status: ActionStatus.ACTIVE,
          priority: command.priority || 5,
          estimatedDuration: command.estimatedDuration || 30,
          retryPolicy: command.retryPolicy || RetryPolicy.createDefault().value,
          tetherData: command.configuration || {
            tetherReference: 'default-tether',
            tetherReferenceId: 'default-tether-id',
            executionParameters: {},
            outputMapping: {},
            executionTriggers: [],
            resourceRequirements: { cpu: '100m', memory: '128Mi', timeout: 300 },
            integrationConfig: {
              endpoint: 'https://api.example.com',
              authentication: {},
              headers: {}
            }
          }
        });
      } else if (command.actionType === ActionNodeType.KB_NODE) {
        const raci = RACI.create(['system']).value;
        actionNodeResult = KBNode.create({
          actionId: actionId.value,
          parentNodeId: command.parentNodeId,
          modelId: command.modelId,
          name: command.name.trim(),
          description: command.description?.trim(),
          executionMode: command.executionMode || ExecutionMode.SEQUENTIAL,
          executionOrder: command.executionOrder || 1,
          status: ActionStatus.ACTIVE,
          priority: command.priority || 5,
          estimatedDuration: command.estimatedDuration || 0,
          retryPolicy: (command.retryPolicy || RetryPolicy.createDefault().value).toObject(),
          raci: raci.toObject(),
          metadata: {},
          kbData: command.configuration || {
            kbReferenceId: 'default-kb-ref',
            shortDescription: 'Default knowledge base reference',
            searchKeywords: ['default'],
            accessPermissions: {
              view: ['developer-team'],
              edit: ['tech-lead']
            }
          }
        });
      } else if (command.actionType === ActionNodeType.FUNCTION_MODEL_CONTAINER) {
        actionNodeResult = FunctionModelContainerNode.create({
          actionId,
          parentNodeId: command.parentNodeId,
          modelId: command.modelId,
          name: command.name.trim(),
          description: command.description?.trim(),
          actionType: ActionNodeType.FUNCTION_MODEL_CONTAINER,
          executionMode: command.executionMode || ExecutionMode.SEQUENTIAL,
          executionOrder: command.executionOrder || 1,
          status: ActionStatus.ACTIVE,
          priority: command.priority || 5,
          estimatedDuration: command.estimatedDuration || 600,
          retryPolicy: command.retryPolicy,
          configuration: command.configuration || {
            nestedModelId: 'nested-model-placeholder',
            contextMapping: {
              'input': 'parent.input',
              'config': 'parent.config'
            },
            outputExtraction: {
              'result': 'nested.output',
              'status': 'nested.executionStatus'
            }
          }
        });
      } else {
        return Result.fail<AddActionNodeResult>('Invalid action node type specified');
      }

      if (actionNodeResult.isFailure) {
        return Result.fail<AddActionNodeResult>(actionNodeResult.error);
      }

      const actionNode = actionNodeResult.value;

      // Add action node to model (business rules validation happens here)
      const addActionResult = model.addActionNode(actionNode);
      if (addActionResult.isFailure) {
        return Result.fail<AddActionNodeResult>(addActionResult.error);
      }

      // Use enhanced repository method for atomic action node addition
      const saveResult = await this.modelRepository.addActionNode(command.modelId, actionNode);
      if (saveResult.isFailure) {
        return Result.fail<AddActionNodeResult>(`Failed to add action node: ${saveResult.error}`);
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
            addedBy: command.userId
          },
          userId: command.userId,
          timestamp: new Date()
        });
      } catch (eventError) {
        // Log event publishing failure but don't fail the operation
        console.warn('Failed to publish ActionNodeAdded event:', eventError);
      }

      // Return success result
      return Result.ok<AddActionNodeResult>({
        actionId: actionNode.actionId.value,
        parentNodeId: command.parentNodeId,
        name: command.name,
        actionType: command.actionType,
        addedAt: new Date()
      });

    } catch (error) {
      return Result.fail<AddActionNodeResult>(
        `Failed to add action node: ${error instanceof Error ? error.message : String(error)}`
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
      return Result.fail<void>('Action node name is required');
    }

    if (!command.actionType) {
      return Result.fail<void>('Action node type is required');
    }

    if (!command.userId || command.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    if (command.description && command.description.length > 1000) {
      return Result.fail<void>('Action node description cannot exceed 1000 characters');
    }

    if (command.executionOrder !== undefined && command.executionOrder < 1) {
      return Result.fail<void>('Execution order must be positive');
    }

    if (command.priority !== undefined && (command.priority < 1 || command.priority > 10)) {
      return Result.fail<void>('Priority must be between 1 and 10');
    }

    if (command.estimatedDuration !== undefined && command.estimatedDuration < 0) {
      return Result.fail<void>('Estimated duration cannot be negative');
    }

    return Result.ok<void>(undefined);
  }
}