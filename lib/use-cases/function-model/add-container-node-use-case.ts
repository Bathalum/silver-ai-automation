import { FunctionModel } from '../../domain/entities/function-model';
import { IONode } from '../../domain/entities/io-node';
import { StageNode } from '../../domain/entities/stage-node';
import { Position } from '../../domain/value-objects/position';
import { NodeId } from '../../domain/value-objects/node-id';
import { ContainerNodeType, ExecutionMode, NodeStatus } from '../../domain/enums';
import { Result } from '../../domain/shared/result';
import { IFunctionModelRepository } from '../../domain/interfaces/function-model-repository';
import { AddContainerNodeCommand } from '../commands/node-commands';
import { NodeAdded, DomainEvent } from '../../infrastructure/events/domain-event';
import { IEventBus } from '../../infrastructure/events/supabase-event-bus';

export interface AddContainerNodeResult {
  nodeId: string;
  name: string;
  nodeType: ContainerNodeType;
  description?: string;
  position: { x: number; y: number };
  addedAt: Date;
}

export class AddContainerNodeUseCase {
  constructor(
    private modelRepository: IFunctionModelRepository,
    private eventBus: IEventBus
  ) {}

  async execute(command: AddContainerNodeCommand): Promise<Result<AddContainerNodeResult>> {
    try {
      // Validate command
      const validationResult = this.validateCommand(command);
      if (validationResult.isFailure) {
        return Result.fail<AddContainerNodeResult>(validationResult.error);
      }

      // Retrieve existing model
      const modelResult = await this.modelRepository.findById(command.modelId);
      if (modelResult.isFailure) {
        return Result.fail<AddContainerNodeResult>(modelResult.error);
      }

      if (!modelResult.value) {
        return Result.fail<AddContainerNodeResult>('Function model not found');
      }

      const model = modelResult.value;

      // Create position value object
      const positionResult = Position.create(command.position.x, command.position.y);
      if (positionResult.isFailure) {
        return Result.fail<AddContainerNodeResult>(positionResult.error);
      }

      const position = positionResult.value;

      // Generate unique node ID
      const nodeId = NodeId.generate();

      // Create container node based on type
      let nodeResult: Result<IONode | StageNode>;
      
      if (command.nodeType === ContainerNodeType.IO_NODE) {
        nodeResult = IONode.create({
          nodeId,
          modelId: command.modelId,
          name: command.name.trim(),
          description: command.description?.trim(),
          position,
          dependencies: [],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.DRAFT,
          metadata: {
            createdBy: command.userId
          },
          visualProperties: {},
          ioData: this.createIOData(command.name)
        });
      } else if (command.nodeType === ContainerNodeType.STAGE_NODE) {
        nodeResult = StageNode.create({
          nodeId,
          modelId: command.modelId,
          name: command.name.trim(),
          description: command.description?.trim(),
          position,
          dependencies: [],
          executionType: ExecutionMode.SEQUENTIAL,
          status: NodeStatus.DRAFT,
          metadata: {
            createdBy: command.userId
          },
          visualProperties: {},
          stageData: {
            stageType: 'process', // Default
            completionCriteria: {},
            stageGoals: [],
            resourceRequirements: {}
          },
          parallelExecution: false,
          actionNodes: [],
          configuration: {}
        });
      } else {
        return Result.fail<AddContainerNodeResult>('Invalid node type specified');
      }

      if (nodeResult.isFailure) {
        return Result.fail<AddContainerNodeResult>(nodeResult.error);
      }

      const node = nodeResult.value;

      // Add node to model (business rules validation happens here)
      const addNodeResult = model.addNode(node);
      if (addNodeResult.isFailure) {
        return Result.fail<AddContainerNodeResult>(addNodeResult.error);
      }

      // Use enhanced repository method for atomic node addition
      const saveResult = await this.modelRepository.addNode(command.modelId, node);
      if (saveResult.isFailure) {
        return Result.fail<AddContainerNodeResult>(`Failed to add node: ${saveResult.error}`);
      }

      // Publish domain event (failure should not fail the primary operation)
      try {
        const domainEvent = new NodeAdded(
          crypto.randomUUID(), // eventId
          command.modelId, // aggregateId
          1, // aggregateVersion - should be retrieved from model
          new Date(), // occurredOn
          {
            modelId: command.modelId,
            nodeId: node.nodeId.toString(),
            nodeType: command.nodeType.toString(),
            nodeName: command.name
          },
          {
            addedBy: command.userId,
            position: command.position
          }
        );

        const publishResult = await this.eventBus.publish(domainEvent);
        if (publishResult.isFailure) {
          console.warn('Failed to publish NodeAdded event:', publishResult.error);
        }
      } catch (eventError) {
        // Log event publishing failure but don't fail the operation
        console.warn('Failed to publish NodeAdded event:', eventError);
      }

      // Return success result
      return Result.ok<AddContainerNodeResult>({
        nodeId: node.nodeId.value,
        name: command.name.trim(),
        nodeType: command.nodeType,
        description: command.description?.trim(),
        position: command.position,
        addedAt: new Date()
      });

    } catch (error) {
      return Result.fail<AddContainerNodeResult>(
        `Failed to add container node: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private inferBoundaryType(nodeName: string): 'input' | 'output' | 'input-output' {
    const nameLower = nodeName.toLowerCase();
    
    if (nameLower.includes('input')) {
      return 'input';
    } else if (nameLower.includes('output')) {
      return 'output';
    } else {
      // Default to input-output for generic IO nodes
      return 'input-output';
    }
  }

  private createIOData(nodeName: string): any {
    const boundaryType = this.inferBoundaryType(nodeName);
    const baseData = {
      boundaryType,
      dataValidationRules: {}
    };

    // Add appropriate data contracts based on boundary type
    if (boundaryType === 'input') {
      return {
        ...baseData,
        inputDataContract: {}
      };
    } else if (boundaryType === 'output') {
      return {
        ...baseData,
        outputDataContract: {}
      };
    } else {
      // input-output has both contracts
      return {
        ...baseData,
        inputDataContract: {},
        outputDataContract: {}
      };
    }
  }

  private validateCommand(command: AddContainerNodeCommand): Result<void> {
    if (!command.modelId || command.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!command.name || command.name.trim().length === 0) {
      return Result.fail<void>('Node name is required');
    }

    if (command.name.trim().length > 200) {
      return Result.fail<void>('Node name cannot exceed 200 characters');
    }

    if (!command.userId || command.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    if (!Object.values(ContainerNodeType).includes(command.nodeType)) {
      return Result.fail<void>('Invalid node type specified');
    }

    if (!command.position || typeof command.position.x !== 'number' || typeof command.position.y !== 'number') {
      return Result.fail<void>('Valid position coordinates are required');
    }

    if (command.position.x < 0 || command.position.y < 0) {
      return Result.fail<void>('Invalid position coordinates');
    }

    if (command.description && command.description.length > 1000) {
      return Result.fail<void>('Description cannot exceed 1000 characters');
    }

    return Result.ok<void>(undefined);
  }
}