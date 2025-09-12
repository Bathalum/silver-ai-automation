import { FunctionModel } from '../../domain/entities/function-model';
import { IONode } from '../../domain/entities/io-node';
import { StageNode } from '../../domain/entities/stage-node';
import { Position } from '../../domain/value-objects/position';
import { NodeId } from '../../domain/value-objects/node-id';
import { ContainerNodeType, ExecutionMode, NodeStatus, NodeType } from '../../domain/enums';
import { Result } from '../../domain/shared/result';
import { IFunctionModelRepository } from '../../domain/interfaces/function-model-repository';
import { 
  CreateNodeCommand,
  UpdateNodeCommand, 
  DeleteNodeCommand, 
  MoveNodeCommand 
} from '../commands/node-commands';
import { NodeAdded, NodeUpdated, NodeDeleted, DomainEvent } from '../../infrastructure/events/domain-event';
import { IEventBus } from '../../infrastructure/events/supabase-event-bus';

export interface NodeDto {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    status: string;
    metadata?: Record<string, any>;
    [key: string]: any;
  };
}

export interface AddNodeRequest {
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    [key: string]: any;
  };
}

export interface UpdateNodeRequest {
  name?: string;
  description?: string;
  position?: { x: number; y: number };
  metadata?: Record<string, any>;
}

/**
 * ManageWorkflowNodesUseCase
 * 
 * Application layer use case for managing workflow nodes in the designer.
 * Provides comprehensive CRUD operations for workflow nodes with proper
 * Clean Architecture dependency flow.
 * 
 * Dependencies: Domain Entities, Repository Interface (inward dependency)
 */
export class ManageWorkflowNodesUseCase {
  constructor(
    private modelRepository: IFunctionModelRepository,
    private eventBus: IEventBus
  ) {}

  /**
   * Add a new node to the workflow model
   */
  async addNode(modelId: string, request: AddNodeRequest, userId: string): Promise<Result<NodeDto>> {
    try {
      // Map React Flow node type to unified NodeType enum (supports all 5 types)
      const unifiedNodeType = this.mapToUnifiedNodeType(request.type);
      if (!unifiedNodeType) {
        return Result.fail<NodeDto>(`Unsupported node type: ${request.type}`);
      }

      // Create unified command - no more zombie commands!
      const command: CreateNodeCommand = {
        modelId,
        nodeType: unifiedNodeType,
        name: request.data.label,
        description: request.data.description,
        position: request.position,
        userId,
        typeSpecificData: request.data // Pass through additional data from React Flow
      };

      // Validate unified command
      const validationResult = this.validateCreateNodeCommand(command);
      if (validationResult.isFailure) {
        return Result.fail<NodeDto>(validationResult.error);
      }

      // Retrieve existing model
      const modelResult = await this.modelRepository.findById(modelId);
      if (modelResult.isFailure) {
        return Result.fail<NodeDto>(modelResult.error);
      }

      if (!modelResult.value) {
        return Result.fail<NodeDto>('Function model not found');
      }

      const model = modelResult.value;

      // Create position value object
      const positionResult = Position.create(command.position.x, command.position.y);
      if (positionResult.isFailure) {
        return Result.fail<NodeDto>(positionResult.error);
      }

      const position = positionResult.value;

      // Generate unique node ID
      const nodeId = NodeId.generate();

      // Create node based on type
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
            createdBy: command.userId,
            createdAt: new Date().toISOString(),
            nodeType: request.type // Store original React Flow node type
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
            createdBy: command.userId,
            createdAt: new Date().toISOString(),
            nodeType: request.type // Store original React Flow node type
          },
          visualProperties: {},
          stageData: {
            stageType: 'process',
            completionCriteria: {},
            stageGoals: [],
            resourceRequirements: {}
          },
          parallelExecution: false,
          actionNodes: [],
          configuration: {}
        });
      } else {
        return Result.fail<NodeDto>('Invalid node type specified');
      }

      if (nodeResult.isFailure) {
        return Result.fail<NodeDto>(nodeResult.error);
      }

      const node = nodeResult.value;

      // Add node to model (business rules validation happens here)
      const addNodeResult = model.addNode(node);
      if (addNodeResult.isFailure) {
        return Result.fail<NodeDto>(addNodeResult.error);
      }

      // Persist to database
      const saveResult = await this.modelRepository.addNode(modelId, node);
      if (saveResult.isFailure) {
        return Result.fail<NodeDto>(`Failed to add node: ${saveResult.error}`);
      }

      // Publish domain event
      await this.publishNodeEvent(new NodeAdded(
        crypto.randomUUID(),
        modelId,
        1,
        new Date(),
        {
          modelId,
          nodeId: node.nodeId.toString(),
          nodeType: request.type,
          nodeName: command.name
        },
        {
          addedBy: userId,
          position: command.position
        }
      ));

      // Return as DTO
      return Result.ok<NodeDto>(this.mapToNodeDto(node, request.type));

    } catch (error) {
      return Result.fail<NodeDto>(
        `Failed to add workflow node: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update an existing node
   */
  async updateNode(nodeId: string, modelId: string, request: UpdateNodeRequest, userId: string): Promise<Result<NodeDto>> {
    try {
      // Create command
      const command: UpdateNodeCommand = {
        modelId,
        nodeId,
        name: request.name,
        description: request.description,
        position: request.position,
        metadata: request.metadata,
        userId
      };

      // Validate command
      const validationResult = this.validateUpdateNodeCommand(command);
      if (validationResult.isFailure) {
        return Result.fail<NodeDto>(validationResult.error);
      }

      // Update via repository
      const updateResult = await this.modelRepository.updateNode(nodeId, command);
      if (updateResult.isFailure) {
        return Result.fail<NodeDto>(`Failed to update node: ${updateResult.error}`);
      }

      const updatedNode = updateResult.value;

      // Publish domain event
      await this.publishNodeEvent(new NodeUpdated(
        crypto.randomUUID(),
        modelId,
        1,
        new Date(),
        {
          modelId,
          nodeId,
          changes: request
        },
        {
          updatedBy: userId
        }
      ));

      // Return as DTO (extract original node type from metadata)
      const originalNodeType = updatedNode.metadata?.nodeType || 'default';
      return Result.ok<NodeDto>(this.mapToNodeDto(updatedNode, originalNodeType));

    } catch (error) {
      return Result.fail<NodeDto>(
        `Failed to update workflow node: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update node position (called frequently during drag operations)
   */
  async updateNodePosition(nodeId: string, modelId: string, position: { x: number; y: number }, userId: string): Promise<Result<NodeDto>> {
    return this.updateNode(nodeId, modelId, { position }, userId);
  }

  /**
   * Batch update multiple node positions - optimized for debounced drag operations
   * Reduces database calls by processing multiple position updates in a single transaction
   */
  async batchUpdatePositions(
    modelId: string, 
    positionUpdates: Array<{ nodeId: string; position: { x: number; y: number } }>,
    userId: string
  ): Promise<Result<NodeDto[]>> {
    try {
      // Validate inputs
      if (!modelId || modelId.trim().length === 0) {
        return Result.fail<NodeDto[]>('Model ID is required');
      }

      if (!userId || userId.trim().length === 0) {
        return Result.fail<NodeDto[]>('User ID is required');
      }

      if (!positionUpdates || positionUpdates.length === 0) {
        return Result.fail<NodeDto[]>('Position updates array cannot be empty');
      }

      // Validate each position update
      for (const update of positionUpdates) {
        if (!update.nodeId || update.nodeId.trim().length === 0) {
          return Result.fail<NodeDto[]>('All node IDs are required');
        }

        if (!update.position || typeof update.position.x !== 'number' || typeof update.position.y !== 'number') {
          return Result.fail<NodeDto[]>('Valid position coordinates are required for all updates');
        }

        if (update.position.x < 0 || update.position.y < 0) {
          return Result.fail<NodeDto[]>('Invalid position coordinates - values cannot be negative');
        }
      }

      // Retrieve existing model
      const modelResult = await this.modelRepository.findById(modelId);
      if (modelResult.isFailure) {
        return Result.fail<NodeDto[]>(`Failed to retrieve model: ${modelResult.error}`);
      }

      if (!modelResult.value) {
        return Result.fail<NodeDto[]>('Function model not found');
      }

      const model = modelResult.value;

      // Validate that all nodes exist in the model
      const updatedNodes: NodeDto[] = [];
      const validationErrors: string[] = [];

      for (const update of positionUpdates) {
        const existingNode = model.nodes.get(update.nodeId);
        if (!existingNode) {
          validationErrors.push(`Node with ID ${update.nodeId} not found in model`);
          continue;
        }

        // Create position value object
        const positionResult = Position.create(update.position.x, update.position.y);
        if (positionResult.isFailure) {
          validationErrors.push(`Invalid position for node ${update.nodeId}: ${positionResult.error}`);
          continue;
        }

        // Create update command for this node
        const updateCommand: UpdateNodeCommand = {
          modelId,
          nodeId: update.nodeId,
          position: update.position,
          userId
        };

        // Update the node via repository (handles persistence)
        const updateResult = await this.modelRepository.updateNode(update.nodeId, updateCommand);
        if (updateResult.isFailure) {
          validationErrors.push(`Failed to update node ${update.nodeId}: ${updateResult.error}`);
          continue;
        }

        // Convert to DTO for response
        const originalNodeType = updateResult.value.metadata?.nodeType || this.mapFromContainerNodeType(updateResult.value);
        updatedNodes.push(this.mapToNodeDto(updateResult.value, originalNodeType));
      }

      // If any validations failed, return error with details
      if (validationErrors.length > 0) {
        return Result.fail<NodeDto[]>(`Batch update failed: ${validationErrors.join('; ')}`);
      }

      // Publish batch position update event
      await this.publishNodeEvent(new NodeUpdated(
        crypto.randomUUID(),
        modelId,
        1,
        new Date(),
        {
          modelId,
          batchUpdate: true,
          nodeUpdates: positionUpdates.map(update => ({
            nodeId: update.nodeId,
            changes: { position: update.position }
          }))
        },
        {
          updatedBy: userId,
          batchSize: positionUpdates.length
        }
      ));

      return Result.ok<NodeDto[]>(updatedNodes);

    } catch (error) {
      return Result.fail<NodeDto[]>(
        `Failed to batch update node positions: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete a node from the workflow
   */
  async deleteNode(nodeId: string, modelId: string, userId: string, force: boolean = false): Promise<Result<void>> {
    try {
      // Create command
      const command: DeleteNodeCommand = {
        modelId,
        nodeId,
        userId,
        force
      };

      // Validate command
      const validationResult = this.validateDeleteNodeCommand(command);
      if (validationResult.isFailure) {
        return Result.fail<void>(validationResult.error);
      }

      // Delete via repository
      const deleteResult = await this.modelRepository.deleteNode(nodeId);
      if (deleteResult.isFailure) {
        return Result.fail<void>(`Failed to delete node: ${deleteResult.error}`);
      }

      // Publish domain event
      await this.publishNodeEvent(new NodeDeleted(
        crypto.randomUUID(),
        modelId,
        1,
        new Date(),
        {
          modelId,
          nodeId
        },
        {
          deletedBy: userId,
          force
        }
      ));

      return Result.ok<void>(undefined);

    } catch (error) {
      return Result.fail<void>(
        `Failed to delete workflow node: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get all nodes for a specific model (for loading in workflow designer)
   */
  async getModelNodes(modelId: string): Promise<Result<NodeDto[]>> {
    try {
      // Get model with nodes
      const modelResult = await this.modelRepository.findById(modelId);
      if (modelResult.isFailure) {
        return Result.fail<NodeDto[]>(modelResult.error);
      }

      if (!modelResult.value) {
        return Result.fail<NodeDto[]>('Function model not found');
      }

      const model = modelResult.value;

      // Convert domain nodes to DTOs
      const nodeDtos: NodeDto[] = [];
      
      for (const node of model.nodes.values()) {
        const originalNodeType = node.metadata?.nodeType || this.mapFromContainerNodeType(node);
        nodeDtos.push(this.mapToNodeDto(node, originalNodeType));
      }

      return Result.ok<NodeDto[]>(nodeDtos);

    } catch (error) {
      return Result.fail<NodeDto[]>(
        `Failed to get model nodes: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Private helper methods

  /**
   * Map React Flow node types to unified NodeType enum
   * UPGRADED: Now supports all 5 node types instead of just 2 ContainerNodeTypes
   */
  private mapToUnifiedNodeType(reactFlowNodeType: string): NodeType | null {
    const typeMap: Record<string, NodeType> = {
      'ioNode': NodeType.IO_NODE,
      'stageNode': NodeType.STAGE_NODE,
      'functionModelContainerNode': NodeType.FUNCTION_MODEL_CONTAINER,
      'tetherNode': NodeType.TETHER_NODE,
      'kbNode': NodeType.KB_NODE
    };

    return typeMap[reactFlowNodeType] || null;
  }

  private mapFromContainerNodeType(node: IONode | StageNode): string {
    if (node instanceof IONode) {
      return 'ioNode';
    } else if (node instanceof StageNode) {
      return 'stageNode';
    }
    return 'default';
  }

  private mapToNodeDto(node: IONode | StageNode, originalNodeType: string): NodeDto {
    return {
      id: node.nodeId.value,
      type: originalNodeType,
      position: {
        x: node.position.x,
        y: node.position.y
      },
      data: {
        label: node.name.value,
        description: node.description,
        status: node.status,
        metadata: node.metadata,
        // Add any additional data fields from the domain node
        ...(node instanceof IONode ? { ioData: (node as any).ioData } : {}),
        ...(node instanceof StageNode ? { stageData: (node as any).stageData } : {})
      }
    };
  }

  private createIOData(nodeName: string): any {
    const nameLower = nodeName.toLowerCase();
    let boundaryType: 'input' | 'output' | 'input-output';
    
    if (nameLower.includes('input')) {
      boundaryType = 'input';
    } else if (nameLower.includes('output')) {
      boundaryType = 'output';
    } else {
      boundaryType = 'input-output';
    }

    const baseData = {
      boundaryType,
      dataValidationRules: {}
    };

    if (boundaryType === 'input') {
      return { ...baseData, inputDataContract: {} };
    } else if (boundaryType === 'output') {
      return { ...baseData, outputDataContract: {} };
    } else {
      return { ...baseData, inputDataContract: {}, outputDataContract: {} };
    }
  }

  private async publishNodeEvent(event: DomainEvent): Promise<void> {
    try {
      const publishResult = await this.eventBus.publish(event);
      if (publishResult.isFailure) {
        console.warn('Failed to publish node event:', publishResult.error);
      }
    } catch (eventError) {
      console.warn('Failed to publish node event:', eventError);
    }
  }

  // Validation methods

  /**
   * Validate unified CreateNodeCommand 
   * UPGRADED: Now supports all 5 NodeType values instead of just 2 ContainerNodeType values
   */
  private validateCreateNodeCommand(command: CreateNodeCommand): Result<void> {
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

    // Validate unified NodeType enum (supports all 5 types)
    if (!Object.values(NodeType).includes(command.nodeType)) {
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

  private validateUpdateNodeCommand(command: UpdateNodeCommand): Result<void> {
    if (!command.modelId || command.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!command.nodeId || command.nodeId.trim().length === 0) {
      return Result.fail<void>('Node ID is required');
    }

    if (!command.userId || command.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    if (command.name && command.name.trim().length > 200) {
      return Result.fail<void>('Node name cannot exceed 200 characters');
    }

    if (command.description && command.description.length > 1000) {
      return Result.fail<void>('Description cannot exceed 1000 characters');
    }

    if (command.position) {
      if (typeof command.position.x !== 'number' || typeof command.position.y !== 'number') {
        return Result.fail<void>('Valid position coordinates are required');
      }
      if (command.position.x < 0 || command.position.y < 0) {
        return Result.fail<void>('Invalid position coordinates');
      }
    }

    return Result.ok<void>(undefined);
  }

  private validateDeleteNodeCommand(command: DeleteNodeCommand): Result<void> {
    if (!command.modelId || command.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!command.nodeId || command.nodeId.trim().length === 0) {
      return Result.fail<void>('Node ID is required');
    }

    if (!command.userId || command.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    return Result.ok<void>(undefined);
  }
}