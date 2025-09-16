import { CreateEdgeUseCase } from '../../../../lib/use-cases/edges/create-edge-use-case';
import { EdgeValidationService } from '../../../../lib/domain/services/edge-validation-service';
import { NodeLink } from '../../../../lib/domain/entities/node-link';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { Result } from '../../../../lib/domain/shared/result';
import { FeatureType, LinkType, ContainerNodeType } from '../../../../lib/domain/enums';
import { DomainEvent } from '../../../../lib/domain/events/domain-event';

// Domain event for edge creation
class EdgeCreated extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly sourceNodeId: string,
    public readonly targetNodeId: string,
    public readonly sourceHandle: string,
    public readonly targetHandle: string,
    public readonly modelId: string,
    public readonly userId: string
  ) {
    super(aggregateId);
  }

  public getEventName(): string {
    return 'EdgeCreated';
  }

  public getEventData(): Record<string, any> {
    return {
      sourceNodeId: this.sourceNodeId,
      targetNodeId: this.targetNodeId,
      sourceHandle: this.sourceHandle,
      targetHandle: this.targetHandle,
      modelId: this.modelId,
      userId: this.userId
    };
  }
}

// Command interface following existing patterns
export interface CreateEdgeCommand {
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
  targetHandle: string;
  sourceNodeType: ContainerNodeType | string;
  targetNodeType: ContainerNodeType | string;
  modelId: string;
  userId: string;
}

// Repository interface following existing patterns
export interface INodeLinkRepository {
  save(link: NodeLink): Promise<Result<void>>;
  findById(linkId: NodeId): Promise<Result<NodeLink>>;
  findByModelId(modelId: string): Promise<Result<NodeLink[]>>;
  delete(linkId: NodeId): Promise<Result<void>>;
  findBySourceNodeId(sourceNodeId: NodeId): Promise<Result<NodeLink[]>>;
  findByTargetNodeId(targetNodeId: NodeId): Promise<Result<NodeLink[]>>;
}

// Event bus interface following existing patterns
export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
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

describe('CreateEdgeUseCase', () => {
  let useCase: CreateEdgeUseCase;
  let mockValidationService: jest.Mocked<EdgeValidationService>;
  let mockNodeLinkRepository: jest.Mocked<INodeLinkRepository>;
  let mockEventBus: jest.Mocked<IEventBus>;

  const sourceNodeId = NodeId.generate();
  const targetNodeId = NodeId.generate();
  const modelId = 'test-model-123';
  const userId = 'test-user-456';

  beforeEach(() => {
    mockValidationService = {
      validateConnection: jest.fn(),
      validateCircularDependency: jest.fn(),
      validateWorkflowStructure: jest.fn()
    } as jest.Mocked<EdgeValidationService>;

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
    useCase = new CreateEdgeUseCase(
      mockValidationService,
      mockNodeLinkRepository,
      mockEventBus
    );
  });

  describe('execute', () => {
    const validCommand: CreateEdgeCommand = {
      sourceNodeId: sourceNodeId.toString(),
      targetNodeId: targetNodeId.toString(),
      sourceHandle: 'right',
      targetHandle: 'left',
      sourceNodeType: ContainerNodeType.IO_NODE,
      targetNodeType: ContainerNodeType.STAGE_NODE,
      modelId,
      userId
    };

    describe('when connection validation passes', () => {
      beforeEach(() => {
        mockValidationService.validateConnection.mockReturnValue(
          Result.ok({
            isValid: true,
            errors: [],
            warnings: []
          })
        );

        mockNodeLinkRepository.findByModelId.mockResolvedValue(
          Result.ok([])
        );

        mockValidationService.validateCircularDependency.mockReturnValue(
          Result.ok({
            isValid: true,
            errors: [],
            warnings: []
          })
        );

        mockNodeLinkRepository.save.mockResolvedValue(Result.ok(undefined));
        mockEventBus.publish.mockResolvedValue();
      });

      it('should validate connection using EdgeValidationService', async () => {
        const result = await useCase.execute(validCommand);

        expect(mockValidationService.validateConnection).toHaveBeenCalledWith({
          sourceNodeId: expect.objectContaining({
            toString: expect.any(Function)
          }),
          targetNodeId: expect.objectContaining({
            toString: expect.any(Function)
          }),
          sourceHandle: 'right',
          targetHandle: 'left',
          sourceNodeType: ContainerNodeType.IO_NODE,
          targetNodeType: ContainerNodeType.STAGE_NODE
        });
      });

      it('should check for circular dependencies using existing connections', async () => {
        const result = await useCase.execute(validCommand);

        expect(mockNodeLinkRepository.findByModelId).toHaveBeenCalledWith(modelId);
        expect(mockValidationService.validateCircularDependency).toHaveBeenCalledWith(
          expect.any(Object), // NodeId
          expect.any(Object), // NodeId
          []
        );
      });

      it('should persist valid edge via NodeLinkRepository', async () => {
        const result = await useCase.execute(validCommand);

        expect(mockNodeLinkRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            sourceEntityId: sourceNodeId.toString(),
            targetEntityId: targetNodeId.toString(),
            linkType: LinkType.DEPENDENCY,
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.FUNCTION_MODEL
          })
        );
      });

      it('should emit EdgeCreated domain event', async () => {
        const result = await useCase.execute(validCommand);

        expect(mockEventBus.publish).toHaveBeenCalledWith(
          expect.objectContaining({
            getEventName: expect.any(Function),
            aggregateId: expect.any(String),
            sourceNodeId: sourceNodeId.toString(),
            targetNodeId: targetNodeId.toString(),
            sourceHandle: 'right',
            targetHandle: 'left',
            modelId,
            userId
          })
        );
      });

      it('should return success result with edge details', async () => {
        const result = await useCase.execute(validCommand);

        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(
          expect.objectContaining({
            linkId: expect.any(String),
            sourceNodeId: sourceNodeId.toString(),
            targetNodeId: targetNodeId.toString(),
            linkType: LinkType.DEPENDENCY,
            linkStrength: expect.any(Number),
            createdAt: expect.any(Date)
          })
        );
      });

      it('should handle event publishing failure gracefully', async () => {
        mockEventBus.publish.mockRejectedValue(new Error('Event bus error'));

        const result = await useCase.execute(validCommand);

        // Should still succeed even if event publishing fails
        expect(result.isSuccess).toBe(true);
        expect(mockNodeLinkRepository.save).toHaveBeenCalled();
      });
    });

    describe('when validation fails', () => {
      beforeEach(() => {
        mockValidationService.validateConnection.mockReturnValue(
          Result.ok({
            isValid: false,
            errors: ['Invalid connection: Action nodes cannot connect directly'],
            warnings: []
          })
        );
      });

      it('should return failure result with validation errors', async () => {
        const result = await useCase.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Invalid connection: Action nodes cannot connect directly');
      });

      it('should not persist edge when validation fails', async () => {
        const result = await useCase.execute(validCommand);

        expect(mockNodeLinkRepository.save).not.toHaveBeenCalled();
      });

      it('should not emit domain event when validation fails', async () => {
        const result = await useCase.execute(validCommand);

        expect(mockEventBus.publish).not.toHaveBeenCalled();
      });
    });

    describe('when circular dependency detected', () => {
      beforeEach(() => {
        mockValidationService.validateConnection.mockReturnValue(
          Result.ok({
            isValid: true,
            errors: [],
            warnings: []
          })
        );

        mockNodeLinkRepository.findByModelId.mockResolvedValue(
          Result.ok([])
        );

        mockValidationService.validateCircularDependency.mockReturnValue(
          Result.ok({
            isValid: false,
            errors: ['Connection would create circular dependency'],
            warnings: []
          })
        );
      });

      it('should return failure result with circular dependency error', async () => {
        const result = await useCase.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Connection would create circular dependency');
      });

      it('should not persist edge when circular dependency detected', async () => {
        const result = await useCase.execute(validCommand);

        expect(mockNodeLinkRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('when repository operations fail', () => {
      beforeEach(() => {
        mockValidationService.validateConnection.mockReturnValue(
          Result.ok({
            isValid: true,
            errors: [],
            warnings: []
          })
        );

        mockNodeLinkRepository.findByModelId.mockResolvedValue(
          Result.ok([])
        );

        mockValidationService.validateCircularDependency.mockReturnValue(
          Result.ok({
            isValid: true,
            errors: [],
            warnings: []
          })
        );
      });

      it('should handle repository save failure', async () => {
        mockNodeLinkRepository.save.mockResolvedValue(
          Result.fail('Database connection failed')
        );

        const result = await useCase.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Failed to save edge');
      });

      it('should handle repository query failure', async () => {
        mockNodeLinkRepository.findByModelId.mockResolvedValue(
          Result.fail('Database query failed')
        );

        const result = await useCase.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Failed to retrieve existing connections');
      });
    });

    describe('command validation', () => {
      it('should reject command with missing sourceNodeId', async () => {
        const invalidCommand = { ...validCommand, sourceNodeId: '' };

        const result = await useCase.execute(invalidCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Source node ID is required');
      });

      it('should reject command with missing targetNodeId', async () => {
        const invalidCommand = { ...validCommand, targetNodeId: '' };

        const result = await useCase.execute(invalidCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Target node ID is required');
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

      it('should reject command with invalid NodeId format', async () => {
        const invalidCommand = { ...validCommand, sourceNodeId: 'invalid-id' };

        const result = await useCase.execute(invalidCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Invalid source node ID format');
      });

      it('should reject self-connections', async () => {
        const selfConnectionCommand = { 
          ...validCommand, 
          targetNodeId: validCommand.sourceNodeId 
        };

        const result = await useCase.execute(selfConnectionCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Self-connections are not allowed');
      });
    });

    describe('integration with DI container', () => {
      it('should be constructable with dependency injection', () => {
        expect(() => {
          new CreateEdgeUseCase(
            mockValidationService,
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
        mockValidationService.validateConnection.mockImplementation(() => {
          throw new Error('Unexpected validation error');
        });

        const result = await useCase.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Failed to create edge');
      });

      it('should handle malformed validation results', async () => {
        mockValidationService.validateConnection.mockReturnValue(
          Result.fail('Validation service error')
        );

        const result = await useCase.execute(validCommand);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Edge validation failed');
      });
    });
  });

  describe('Result pattern integration', () => {
    const validCommand: CreateEdgeCommand = {
      sourceNodeId: sourceNodeId.toString(),
      targetNodeId: targetNodeId.toString(),
      sourceHandle: 'right',
      targetHandle: 'left',
      sourceNodeType: ContainerNodeType.IO_NODE,
      targetNodeType: ContainerNodeType.STAGE_NODE,
      modelId,
      userId
    };

    it('should return Result<CreateEdgeResult> following existing patterns', async () => {
      mockValidationService.validateConnection.mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockNodeLinkRepository.findByModelId.mockResolvedValue(Result.ok([]));
      mockValidationService.validateCircularDependency.mockReturnValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockNodeLinkRepository.save.mockResolvedValue(Result.ok(undefined));

      const result = await useCase.execute(validCommand);

      expect(result).toHaveProperty('isSuccess');
      expect(result).toHaveProperty('isFailure');
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
    });

    it('should provide detailed error information in failure cases', async () => {
      mockValidationService.validateConnection.mockReturnValue(
        Result.ok({ isValid: false, errors: ['Connection not allowed'], warnings: [] })
      );

      const result = await useCase.execute(validCommand);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Connection not allowed');
    });
  });
});