import { EdgeValidationService } from '../../domain/services/edge-validation-service';
import { NodeLink } from '../../domain/entities/node-link';
import { NodeId } from '../../domain/value-objects/node-id';
import { Result } from '../../domain/shared/result';
import { FeatureType, LinkType } from '../../domain/enums';
import { EdgeCreated } from '../../domain/events/edge-events';
import { CreateEdgeCommand } from '../commands/edge-commands';
import { NodeLinkRepository } from '../../domain/interfaces/node-link-repository';

// Event bus interface following existing patterns
export interface IEventBus {
  publish(event: any): Promise<void>;
}

// Create edge result interface
export interface CreateEdgeResult {
  linkId: string;
  sourceNodeId: string;
  targetNodeId: string;
  linkType: LinkType;
  linkStrength: number;
  createdAt: Date;
}

export class CreateEdgeUseCase {
  constructor(
    private edgeValidationService: EdgeValidationService,
    private nodeLinkRepository: NodeLinkRepository,
    private eventBus: IEventBus
  ) {}

  async execute(command: CreateEdgeCommand): Promise<Result<CreateEdgeResult>> {
    try {
      // Validate command
      const commandValidationResult = this.validateCommand(command);
      if (commandValidationResult.isFailure) {
        return Result.fail<CreateEdgeResult>(commandValidationResult.error);
      }

      // Create NodeId instances
      const sourceNodeIdResult = NodeId.create(command.sourceNodeId);
      if (sourceNodeIdResult.isFailure) {
        return Result.fail<CreateEdgeResult>('Invalid source node ID format');
      }
      const sourceNodeId = sourceNodeIdResult.value;

      const targetNodeIdResult = NodeId.create(command.targetNodeId);
      if (targetNodeIdResult.isFailure) {
        return Result.fail<CreateEdgeResult>('Invalid target node ID format');
      }
      const targetNodeId = targetNodeIdResult.value;

      // Validate connection using EdgeValidationService
      const connectionValidationResult = this.edgeValidationService.validateConnection({
        sourceNodeId,
        targetNodeId,
        sourceHandle: command.sourceHandle,
        targetHandle: command.targetHandle,
        sourceNodeType: command.sourceNodeType,
        targetNodeType: command.targetNodeType
      });

      if (connectionValidationResult.isFailure) {
        return Result.fail<CreateEdgeResult>(`Edge validation failed: ${connectionValidationResult.error}`);
      }

      const validationData = connectionValidationResult.value;
      if (!validationData.isValid) {
        return Result.fail<CreateEdgeResult>(validationData.errors.join(', '));
      }

      // Get existing connections for circular dependency check
      const existingConnectionsResult = await this.nodeLinkRepository.findByModelId(command.modelId);
      if (existingConnectionsResult.isFailure) {
        return Result.fail<CreateEdgeResult>(`Failed to retrieve existing connections: ${existingConnectionsResult.error}`);
      }

      const existingConnections = existingConnectionsResult.value;

      // Check for circular dependencies
      const circularValidationResult = this.edgeValidationService.validateCircularDependency(
        sourceNodeId,
        targetNodeId,
        existingConnections
      );

      if (circularValidationResult.isFailure) {
        return Result.fail<CreateEdgeResult>(`Circular dependency validation failed: ${circularValidationResult.error}`);
      }

      const circularValidationData = circularValidationResult.value;
      if (!circularValidationData.isValid) {
        return Result.fail<CreateEdgeResult>(circularValidationData.errors.join(', '));
      }

      // Create NodeLink entity
      const linkId = NodeId.generate();
      const nodeLinkResult = NodeLink.create({
        linkId,
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceEntityId: sourceNodeId.toString(),
        targetEntityId: targetNodeId.toString(),
        sourceNodeId,
        targetNodeId,
        linkType: LinkType.REFERENCES, // Use valid LinkType instead of DEPENDENCY
        linkStrength: 0.8, // Default strength for workflow connections
        linkContext: {
          sourceHandle: command.sourceHandle,
          targetHandle: command.targetHandle,
          connectionType: 'workflow'
        }
      });

      if (nodeLinkResult.isFailure) {
        return Result.fail<CreateEdgeResult>(`Failed to create node link: ${nodeLinkResult.error}`);
      }

      const nodeLink = nodeLinkResult.value;

      // Persist via repository
      const saveResult = await this.nodeLinkRepository.save(nodeLink);
      if (saveResult.isFailure) {
        return Result.fail<CreateEdgeResult>(`Failed to save edge: ${saveResult.error}`);
      }

      // Create and publish domain event
      const event = new EdgeCreated(
        linkId.toString(),
        sourceNodeId.toString(),
        targetNodeId.toString(),
        command.sourceHandle,
        command.targetHandle,
        command.modelId,
        command.userId
      );

      // Publish event (failure should not fail the primary operation)
      try {
        await this.eventBus.publish(event);
      } catch (eventError) {
        // Log event publishing failure but don't fail the operation
        console.warn('Failed to publish EdgeCreated event:', eventError);
      }

      // Return success result
      return Result.ok<CreateEdgeResult>({
        linkId: linkId.toString(),
        sourceNodeId: sourceNodeId.toString(),
        targetNodeId: targetNodeId.toString(),
        linkType: LinkType.DEPENDENCY,
        linkStrength: 0.8,
        createdAt: nodeLink.createdAt
      });

    } catch (error) {
      return Result.fail<CreateEdgeResult>(
        `Failed to create edge: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateCommand(command: CreateEdgeCommand): Result<void> {
    if (!command.sourceNodeId || command.sourceNodeId.trim().length === 0) {
      return Result.fail<void>('Source node ID is required');
    }

    if (!command.targetNodeId || command.targetNodeId.trim().length === 0) {
      return Result.fail<void>('Target node ID is required');
    }

    if (!command.modelId || command.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!command.userId || command.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    // Prevent self-connections
    if (command.sourceNodeId === command.targetNodeId) {
      return Result.fail<void>('Self-connections are not allowed');
    }

    return Result.ok<void>(undefined);
  }
}