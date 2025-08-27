import { FunctionModel } from '../../domain/entities/function-model';
import { IONode } from '../../domain/entities/io-node';
import { StageNode } from '../../domain/entities/stage-node';
import { Position } from '../../domain/value-objects/position';
import { NodeId } from '../../domain/value-objects/node-id';
import { ContainerNodeType, ExecutionMode, NodeStatus } from '../../domain/enums';
import { Result } from '../../domain/shared/result';
import { AddContainerNodeCommand } from '../commands/node-commands';

export interface IFunctionModelRepository {
  save(model: FunctionModel): Promise<Result<void>>;
  findById(id: string): Promise<Result<FunctionModel>>;
  findByName(name: string, organizationId?: string): Promise<Result<FunctionModel>>;
  delete(id: string): Promise<Result<void>>;
  findAll(filter?: ModelFilter): Promise<Result<FunctionModel[]>>;
}

export interface ModelFilter {
  userId?: string;
  organizationId?: string;
  status?: string[];
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

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
          ioData: {
            boundaryType: 'input', // Default, will be determined by business rules
            inputDataContract: {}, // Only for input boundary type
            dataValidationRules: {}
          }
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

      // Save updated model to repository
      const saveResult = await this.modelRepository.save(model);
      if (saveResult.isFailure) {
        return Result.fail<AddContainerNodeResult>(`Failed to save model: ${saveResult.error}`);
      }

      // Publish domain event (failure should not fail the primary operation)
      try {
        await this.eventBus.publish({
          eventType: 'ContainerNodeAdded',
          aggregateId: command.modelId,
          eventData: {
            modelId: command.modelId,
            nodeId: node.nodeId.value,
            nodeType: command.nodeType,
            name: command.name,
            position: command.position,
            addedBy: command.userId
          },
          userId: command.userId,
          timestamp: new Date()
        });
      } catch (eventError) {
        // Log event publishing failure but don't fail the operation
        console.warn('Failed to publish ContainerNodeAdded event:', eventError);
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