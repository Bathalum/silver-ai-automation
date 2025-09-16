import { NodeLink } from '../../domain/entities/node-link';
import { NodeId } from '../../domain/value-objects/node-id';
import { Result } from '../../domain/shared/result';
import { EdgeDeleted } from '../../domain/events/edge-events';
import { DeleteEdgeCommand } from '../commands/edge-commands';

// Repository interface - reusing from create use case
export interface INodeLinkRepository {
  save(link: NodeLink): Promise<Result<void>>;
  findById(linkId: NodeId): Promise<Result<NodeLink>>;
  findByModelId(modelId: string): Promise<Result<NodeLink[]>>;
  delete(linkId: NodeId): Promise<Result<void>>;
  findBySourceNodeId(sourceNodeId: NodeId): Promise<Result<NodeLink[]>>;
  findByTargetNodeId(targetNodeId: NodeId): Promise<Result<NodeLink[]>>;
}

// Event bus interface - reusing from create use case
export interface IEventBus {
  publish(event: any): Promise<void>;
}

// Delete edge result interface
export interface DeleteEdgeResult {
  linkId: string;
  sourceNodeId: string;
  targetNodeId: string;
  deletedAt: Date;
  reason?: string;
}

export class DeleteEdgeUseCase {
  constructor(
    private nodeLinkRepository: INodeLinkRepository,
    private eventBus: IEventBus
  ) {}

  async execute(command: DeleteEdgeCommand): Promise<Result<DeleteEdgeResult>> {
    try {
      // Validate command
      const commandValidationResult = this.validateCommand(command);
      if (commandValidationResult.isFailure) {
        return Result.fail<DeleteEdgeResult>(commandValidationResult.error);
      }

      // Create NodeId instance
      const linkIdResult = NodeId.create(command.linkId);
      if (linkIdResult.isFailure) {
        return Result.fail<DeleteEdgeResult>('Invalid link ID format');
      }
      const linkId = linkIdResult.value;

      // Validate edge exists before deletion
      const existingEdgeResult = await this.nodeLinkRepository.findById(linkId);
      if (existingEdgeResult.isFailure) {
        return Result.fail<DeleteEdgeResult>(`Edge not found: ${existingEdgeResult.error}`);
      }

      const existingEdge = existingEdgeResult.value;

      // Validate edge data integrity
      if (!existingEdge.sourceNodeId || !existingEdge.targetNodeId) {
        return Result.fail<DeleteEdgeResult>('Invalid edge data: missing node references');
      }

      // Remove edge via repository
      const deleteResult = await this.nodeLinkRepository.delete(linkId);
      if (deleteResult.isFailure) {
        return Result.fail<DeleteEdgeResult>(`Failed to delete edge: ${deleteResult.error}`);
      }

      const deletedAt = new Date();

      // Create and publish domain event
      const event = new EdgeDeleted(
        linkId.toString(),
        existingEdge.sourceNodeId.toString(),
        existingEdge.targetNodeId.toString(),
        command.modelId,
        command.userId,
        deletedAt
      );

      // Publish event (failure should not fail the primary operation)
      try {
        await this.eventBus.publish(event);
      } catch (eventError) {
        // Log event publishing failure but don't fail the operation
        console.warn('Failed to publish EdgeDeleted event:', eventError);
      }

      // Return success result
      return Result.ok<DeleteEdgeResult>({
        linkId: linkId.toString(),
        sourceNodeId: existingEdge.sourceNodeId.toString(),
        targetNodeId: existingEdge.targetNodeId.toString(),
        deletedAt,
        reason: command.reason
      });

    } catch (error) {
      return Result.fail<DeleteEdgeResult>(
        `Failed to delete edge: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateCommand(command: DeleteEdgeCommand): Result<void> {
    if (!command.linkId || command.linkId.trim().length === 0) {
      return Result.fail<void>('Link ID is required');
    }

    if (!command.modelId || command.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!command.userId || command.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    // Validate reason length if provided
    if (command.reason && command.reason.length > 1000) {
      return Result.fail<void>('Deletion reason cannot exceed 1000 characters');
    }

    return Result.ok<void>(undefined);
  }
}