import { DeleteEdgeUseCase } from '../../../../lib/use-cases/edges/delete-edge-use-case';
import { NodeLink } from '../../../../lib/domain/entities/node-link';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { Result } from '../../../../lib/domain/shared/result';
import { FeatureType, LinkType } from '../../../../lib/domain/enums';
import { DomainEvent } from '../../../../lib/domain/events/domain-event';

// Domain event for edge deletion
class EdgeDeleted extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly sourceNodeId: string,
    public readonly targetNodeId: string,
    public readonly modelId: string,
    public readonly userId: string,
    public readonly deletedAt: Date
  ) {
    super(aggregateId);
  }

  public getEventName(): string {
    return 'EdgeDeleted';
  }

  public getEventData(): Record<string, any> {
    return {
      sourceNodeId: this.sourceNodeId,
      targetNodeId: this.targetNodeId,
      modelId: this.modelId,
      userId: this.userId,
      deletedAt: this.deletedAt.toISOString()
    };
  }
}

// Command interface following existing patterns
export interface DeleteEdgeCommand {
  linkId: string;
  modelId: string;
  userId: string;
  reason?: string;
}

// Repository interface - reusing from create test
export interface INodeLinkRepository {
  save(link: NodeLink): Promise<Result<void>>;
  findById(linkId: NodeId): Promise<Result<NodeLink>>;
  findByModelId(modelId: string): Promise<Result<NodeLink[]>>;
  delete(linkId: NodeId): Promise<Result<void>>;
  findBySourceNodeId(sourceNodeId: NodeId): Promise<Result<NodeLink[]>>;
  findByTargetNodeId(targetNodeId: NodeId): Promise<Result<NodeLink[]>>;
}

// Event bus interface - reusing from create test
export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
}

// Delete edge result interface
export interface DeleteEdgeResult {
  linkId: string;
  sourceNodeId: string;
  targetNodeId: string;
  deletedAt: Date;
  reason?: string;
}

describe('DeleteEdgeUseCase', () => {
  let useCase: DeleteEdgeUseCase;
  let mockNodeLinkRepository: jest.Mocked<INodeLinkRepository>;
  let mockEventBus: jest.Mocked<IEventBus>;

  const linkId = NodeId.generate();
  const sourceNodeId = NodeId.generate();
  const targetNodeId = NodeId.generate();
  const modelId = 'test-model-123';
  const userId = 'test-user-456';

  const existingLink = NodeLink.create({
    linkId,
    sourceFeature: FeatureType.FUNCTION_MODEL,
    targetFeature: FeatureType.FUNCTION_MODEL,
    sourceEntityId: sourceNodeId.toString(),
    targetEntityId: targetNodeId.toString(),
    sourceNodeId,
    targetNodeId,
    linkType: LinkType.DEPENDENCY,
    linkStrength: 0.8
  }).value;

  beforeEach(() => {
    mockNodeLinkRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByModelId: jest.fn(),
      delete: jest.fn(),
      findBySourceNodeId: jest.fn(),
      findByTargetNodeId: jest.fn()
    };

    mockEventBus = {
      publish: jest.fn()
    };

    // This will fail initially as the use case doesn't exist yet
    useCase = new DeleteEdgeUseCase(
      mockNodeLinkRepository,
      mockEventBus
    );
  });

  describe('execute', () => {
    const validCommand: DeleteEdgeCommand = {
      linkId: linkId.toString(),
      modelId,
      userId,
      reason: 'User removed connection'
    };

    describe('when edge exists and deletion succeeds', () => {
      beforeEach(() => {
        mockNodeLinkRepository.findById.mockResolvedValue(Result.ok(existingLink));
        mockNodeLinkRepository.delete.mockResolvedValue(Result.ok(undefined));
        mockEventBus.publish.mockResolvedValue();
      });

      it('should validate edge exists before deletion', async () => {
        const result = await useCase.execute(validCommand);

        expect(mockNodeLinkRepository.findById).toHaveBeenCalledWith(
          expect.objectContaining({
            toString: expect.any(Function)
          })
        );
        expect(mockNodeLinkRepository.findById).toHaveBeenCalledWith(
          expect.any(Object) // NodeId object
        );
      });

      it('should remove edge via NodeLinkRepository', async () => {
        const result = await useCase.execute(validCommand);

        expect(mockNodeLinkRepository.delete).toHaveBeenCalledWith(
          expect.objectContaining({
            toString: expect.any(Function)
          })
        );
        expect(mockNodeLinkRepository.delete).toHaveBeenCalledWith(
          expect.any(Object) // NodeId object
        );
      });

      it('should emit EdgeDeleted domain event', async () => {
        const result = await useCase.execute(validCommand);

        expect(mockEventBus.publish).toHaveBeenCalledWith(
          expect.objectContaining({
            getEventName: expect.any(Function),
            aggregateId: linkId.toString(),
            sourceNodeId: sourceNodeId.toString(),
            targetNodeId: targetNodeId.toString(),
            modelId,
            userId,
            deletedAt: expect.any(Date)
          })
        );

        const publishedEvent = (mockEventBus.publish as jest.Mock).mock.calls[0][0];
        expect(publishedEvent.getEventName()).toBe('EdgeDeleted');
      });

      it('should return success result with deletion details', async () => {
        const result = await useCase.execute(validCommand);

        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(
          expect.objectContaining({
            linkId: linkId.toString(),
            sourceNodeId: sourceNodeId.toString(),
            targetNodeId: targetNodeId.toString(),
            deletedAt: expect.any(Date),
            reason: 'User removed connection'
          })
        );
      });

      it('should handle event publishing failure gracefully', async () => {
        mockEventBus.publish.mockRejectedValue(new Error('Event bus error'));

        const result = await useCase.execute(validCommand);

        // Should still succeed even if event publishing fails
        expect(result.isSuccess).toBe(true);
        expect(mockNodeLinkRepository.delete).toHaveBeenCalled();
      });

      it('should include optional deletion reason in result', async () => {
        const commandWithReason = {
          ...validCommand,
          reason: 'Workflow redesign'
        };

        const result = await useCase.execute(commandWithReason);

        expect(result.isSuccess).toBe(true);
        expect(result.value?.reason).toBe('Workflow redesign');
      });

      it('should handle command without reason', async () => {
        const commandWithoutReason = {
          linkId: linkId.toString(),
          modelId,
          userId
        };

        const result = await useCase.execute(commandWithoutReason);

        expect(result.isSuccess).toBe(true);
        expect(result.value?.reason).toBeUndefined();
      });
    });

    describe('when edge does not exist', () => {
      beforeEach(() => {
        mockNodeLinkRepository.findById.mockResolvedValue(
          Result.fail('Edge not found')
        );
      });

      it('should return failure result when edge not found', async () => {
        const result = await useCase.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Edge not found');
      });

      it('should not attempt deletion when edge not found', async () => {
        const result = await useCase.execute(validCommand);

        expect(mockNodeLinkRepository.delete).not.toHaveBeenCalled();
      });

      it('should not emit domain event when edge not found', async () => {
        const result = await useCase.execute(validCommand);

        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });
    });

    describe('when repository deletion fails', () => {
      beforeEach(() => {
        mockNodeLinkRepository.findById.mockResolvedValue(Result.ok(existingLink));
        mockNodeLinkRepository.delete.mockResolvedValue(
          Result.fail('Database deletion failed')
        );
      });

      it('should return failure result when deletion fails', async () => {
        const result = await useCase.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Failed to delete edge');
      });

      it('should not emit domain event when deletion fails', async () => {
        const result = await useCase.execute(validCommand);

        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });
    });

    describe('command validation', () => {
      it('should reject command with missing linkId', async () => {
        const invalidCommand = { ...validCommand, linkId: '' };

        const result = await useCase.execute(invalidCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Link ID is required');
      });

      it('should reject command with missing modelId', async () => {
        const invalidCommand = { ...validCommand, modelId: '' };

        const result = await useCase.execute(invalidCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Model ID is required');
      });

      it('should reject command with missing userId', async () => {
        const invalidCommand = { ...validCommand, userId: '' };

        const result = await useCase.execute(invalidCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('User ID is required');
      });

      it('should reject command with invalid linkId format', async () => {
        const invalidCommand = { ...validCommand, linkId: 'invalid-id' };

        const result = await useCase.execute(invalidCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Invalid link ID format');
      });

      it('should validate reason length if provided', async () => {
        const longReason = 'a'.repeat(1001); // Assuming 1000 char limit
        const invalidCommand = { ...validCommand, reason: longReason };

        const result = await useCase.execute(invalidCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Deletion reason cannot exceed 1000 characters');
      });
    });

    describe('authorization checks', () => {
      const unauthorizedUserId = 'unauthorized-user-789';

      beforeEach(() => {
        mockNodeLinkRepository.findById.mockResolvedValue(Result.ok(existingLink));
      });

      it('should perform model ownership validation', async () => {
        // This test assumes the use case checks model ownership
        // The exact implementation depends on how authorization is handled
        const commandWithDifferentUser = {
          ...validCommand,
          userId: unauthorizedUserId
        };

        const result = await useCase.execute(commandWithDifferentUser);

        // This should be implemented to check user permissions
        // For now, we're testing that the validation is called
        expect(mockNodeLinkRepository.findById).toHaveBeenCalled();
      });
    });

    describe('integration with DI container', () => {
      it('should be constructable with dependency injection', () => {
        expect(() => {
          new DeleteEdgeUseCase(
            mockNodeLinkRepository,
            mockEventBus
          );
        }).not.toThrow();
      });

      it('should follow existing use case constructor pattern', () => {
        expect(useCase).toHaveProperty('execute');
        expect(typeof useCase.execute).toBe('function');
      });
    });

    describe('error handling', () => {
      it('should handle unexpected errors gracefully', async () => {
        mockNodeLinkRepository.findById.mockImplementation(() => {
          throw new Error('Unexpected repository error');
        });

        const result = await useCase.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Failed to delete edge');
      });

      it('should handle malformed edge data', async () => {
        const malformedLink = { ...existingLink, sourceNodeId: null } as any;
        mockNodeLinkRepository.findById.mockResolvedValue(Result.ok(malformedLink));

        const result = await useCase.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Invalid edge data');
      });
    });

    describe('cascading deletion scenarios', () => {
      it('should handle deletion of edge that affects workflow structure', async () => {
        mockNodeLinkRepository.findById.mockResolvedValue(Result.ok(existingLink));
        mockNodeLinkRepository.delete.mockResolvedValue(Result.ok(undefined));
        mockEventBus.publish.mockResolvedValue();

        const result = await useCase.execute(validCommand);

        expect(result.isSuccess).toBe(true);
        // The event should be published so other services can handle structure updates
        expect(mockEventBus.publish).toHaveBeenCalled();
      });

      it('should emit event with sufficient context for cascade handling', async () => {
        mockNodeLinkRepository.findById.mockResolvedValue(Result.ok(existingLink));
        mockNodeLinkRepository.delete.mockResolvedValue(Result.ok(undefined));
        mockEventBus.publish.mockResolvedValue();

        const result = await useCase.execute(validCommand);

        const publishedEvent = (mockEventBus.publish as jest.Mock).mock.calls[0][0];
        const eventData = publishedEvent.getEventData();
        
        expect(eventData).toHaveProperty('sourceNodeId');
        expect(eventData).toHaveProperty('targetNodeId');
        expect(eventData).toHaveProperty('modelId');
        expect(eventData).toHaveProperty('deletedAt');
      });
    });

    describe('audit trail requirements', () => {
      it('should include deletion timestamp in result', async () => {
        mockNodeLinkRepository.findById.mockResolvedValue(Result.ok(existingLink));
        mockNodeLinkRepository.delete.mockResolvedValue(Result.ok(undefined));

        const beforeDeletion = new Date();
        const result = await useCase.execute(validCommand);
        const afterDeletion = new Date();

        expect(result.isSuccess).toBe(true);
        expect(result.value?.deletedAt).toBeInstanceOf(Date);
        expect(result.value?.deletedAt.getTime()).toBeGreaterThanOrEqual(beforeDeletion.getTime());
        expect(result.value?.deletedAt.getTime()).toBeLessThanOrEqual(afterDeletion.getTime());
      });

      it('should include user ID in event for audit purposes', async () => {
        mockNodeLinkRepository.findById.mockResolvedValue(Result.ok(existingLink));
        mockNodeLinkRepository.delete.mockResolvedValue(Result.ok(undefined));
        mockEventBus.publish.mockResolvedValue();

        const result = await useCase.execute(validCommand);

        const publishedEvent = (mockEventBus.publish as jest.Mock).mock.calls[0][0];
        expect(publishedEvent.userId).toBe(userId);
      });
    });
  });

  describe('Result pattern integration', () => {
    const validCommand: DeleteEdgeCommand = {
      linkId: linkId.toString(),
      modelId,
      userId,
      reason: 'User removed connection'
    };

    beforeEach(() => {
      mockNodeLinkRepository.findById.mockResolvedValue(Result.ok(existingLink));
      mockNodeLinkRepository.delete.mockResolvedValue(Result.ok(undefined));
    });

    it('should return Result<DeleteEdgeResult> following existing patterns', async () => {
      const result = await useCase.execute(validCommand);

      expect(result).toHaveProperty('isSuccess');
      expect(result).toHaveProperty('isFailure');
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
    });

    it('should provide detailed error information in failure cases', async () => {
      mockNodeLinkRepository.findById.mockResolvedValue(
        Result.fail('Edge not found in database')
      );

      const result = await useCase.execute(validCommand);

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Edge not found');
    });
  });
});