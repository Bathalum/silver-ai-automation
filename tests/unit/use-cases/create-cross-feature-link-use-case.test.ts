import { CreateCrossFeatureLinkUseCase } from '../../../lib/use-cases/cross-feature/create-cross-feature-link-use-case';
import { CreateCrossFeatureLinkCommand } from '../../../lib/use-cases/commands/link-commands';
import { CrossFeatureLink } from '../../../lib/domain/entities/cross-feature-link';
import { CrossFeatureLinkingService } from '../../../lib/domain/services/cross-feature-linking-service';
import { FeatureType, LinkType } from '../../../lib/domain/enums';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { Result } from '../../../lib/domain/shared/result';

// Mock interfaces following Clean Architecture
interface ICrossFeatureLinkRepository {
  save(link: CrossFeatureLink): Promise<Result<void>>;
  findBySourceAndTarget(sourceFeature: FeatureType, targetFeature: FeatureType, sourceId: string, targetId: string): Promise<Result<CrossFeatureLink | null>>;
  findById(linkId: NodeId): Promise<Result<CrossFeatureLink | null>>;
}

interface IDomainEventPublisher {
  publish(event: any): Promise<Result<void>>;
}

describe('UC-014: CreateCrossFeatureLinkUseCase', () => {
  let useCase: CreateCrossFeatureLinkUseCase;
  let mockRepository: jest.Mocked<ICrossFeatureLinkRepository>;
  let mockEventPublisher: jest.Mocked<IDomainEventPublisher>;
  let mockLinkingService: jest.Mocked<CrossFeatureLinkingService>;

  beforeEach(() => {
    // Mock dependencies following dependency inversion principle
    mockRepository = {
      save: jest.fn(),
      findBySourceAndTarget: jest.fn(),
      findById: jest.fn()
    };

    mockEventPublisher = {
      publish: jest.fn()
    };

    mockLinkingService = {
      createCrossFeatureLink: jest.fn(),
      validateLinkConstraints: jest.fn(),
      calculateLinkStrength: jest.fn(),
      detectRelationshipCycles: jest.fn()
    } as any;

    useCase = new CreateCrossFeatureLinkUseCase(
      mockRepository,
      mockEventPublisher,
      mockLinkingService
    );
  });

  describe('execute_ValidCommand_CreatesLinkSuccessfully', () => {
    it('should create cross-feature link with valid inputs and publish events', async () => {
      // Arrange
      const command: CreateCrossFeatureLinkCommand = {
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: 'function-model-123',
        targetId: 'kb-456',
        linkType: LinkType.DOCUMENTS,
        initialStrength: 0.7,
        nodeContext: { contextKey: 'contextValue' },
        createdBy: 'user-789'
      };

      const mockLink = {} as CrossFeatureLink;
      const linkResult = Result.ok(mockLink);
      
      mockLinkingService.createCrossFeatureLink.mockReturnValue(linkResult);
      mockRepository.findBySourceAndTarget.mockResolvedValue(Result.ok(null)); // No duplicate
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockEventPublisher.publish.mockResolvedValue(Result.ok(undefined));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(mockLink);
      
      // Verify domain service was called with correct parameters
      expect(mockLinkingService.createCrossFeatureLink).toHaveBeenCalledWith(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        'function-model-123',
        'kb-456',
        LinkType.DOCUMENTS,
        0.7,
        { contextKey: 'contextValue' }
      );
      
      // Verify link was persisted
      expect(mockRepository.save).toHaveBeenCalledWith(mockLink);
      
      // Verify domain event was published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.KNOWLEDGE_BASE,
            linkType: LinkType.DOCUMENTS,
            createdBy: 'user-789'
          })
        })
      );
    });
  });

  describe('execute_IncompatibleFeatures_ReturnsFailure', () => {
    it('should fail when creating incompatible feature link', async () => {
      // Arrange
      const command: CreateCrossFeatureLinkCommand = {
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: 'function-model-123',
        targetId: 'kb-456',
        linkType: LinkType.TRIGGERS, // Invalid link type for these features
        initialStrength: 0.5,
        createdBy: 'user-789'
      };

      const errorResult = Result.fail<CrossFeatureLink>('Link type TRIGGERS is not compatible with features function-model and knowledge-base');
      mockLinkingService.createCrossFeatureLink.mockReturnValue(errorResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('not compatible with features');
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('execute_DuplicateLink_ReturnsFailure', () => {
    it('should fail when attempting to create duplicate link', async () => {
      // Arrange
      const command: CreateCrossFeatureLinkCommand = {
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: 'function-model-123',
        targetId: 'kb-456',
        linkType: LinkType.DOCUMENTS,
        initialStrength: 0.5,
        createdBy: 'user-789'
      };

      const errorResult = Result.fail<CrossFeatureLink>('Link already exists between these entities');
      mockLinkingService.createCrossFeatureLink.mockReturnValue(errorResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Link already exists between these entities');
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('execute_InvalidLinkStrength_ReturnsFailure', () => {
    it('should fail when link strength is out of valid range', async () => {
      // Arrange
      const command: CreateCrossFeatureLinkCommand = {
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: 'function-model-123',
        targetId: 'kb-456',
        linkType: LinkType.DOCUMENTS,
        initialStrength: 1.5, // Invalid: > 1.0
        createdBy: 'user-789'
      };

      const errorResult = Result.fail<CrossFeatureLink>('Link strength must be between 0.0 and 1.0');
      mockLinkingService.createCrossFeatureLink.mockReturnValue(errorResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Link strength must be between 0.0 and 1.0');
    });
  });

  describe('execute_RepositoryFailure_ReturnsFailure', () => {
    it('should fail when repository save operation fails', async () => {
      // Arrange
      const command: CreateCrossFeatureLinkCommand = {
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: 'function-model-123',
        targetId: 'kb-456',
        linkType: LinkType.DOCUMENTS,
        initialStrength: 0.5,
        createdBy: 'user-789'
      };

      const mockLink = {} as CrossFeatureLink;
      mockLinkingService.createCrossFeatureLink.mockReturnValue(Result.ok(mockLink));
      mockRepository.findBySourceAndTarget.mockResolvedValue(Result.ok(null)); // No duplicate
      mockRepository.save.mockResolvedValue(Result.fail('Database connection error'));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Database connection error');
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('execute_EmptyEntityIds_ReturnsFailure', () => {
    it('should fail when source or target entity IDs are empty', async () => {
      // Arrange
      const command: CreateCrossFeatureLinkCommand = {
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: '', // Empty source ID
        targetId: 'kb-456',
        linkType: LinkType.DOCUMENTS,
        initialStrength: 0.5,
        createdBy: 'user-789'
      };

      const errorResult = Result.fail<CrossFeatureLink>('Source entity ID cannot be empty');
      mockLinkingService.createCrossFeatureLink.mockReturnValue(errorResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Source entity ID cannot be empty');
    });
  });

  describe('execute_SelfLinking_ReturnsFailure', () => {
    it('should fail when attempting to link entity to itself', async () => {
      // Arrange
      const command: CreateCrossFeatureLinkCommand = {
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceId: 'function-model-123',
        targetId: 'function-model-123', // Same as source
        linkType: LinkType.REFERENCES,
        initialStrength: 0.5,
        createdBy: 'user-789'
      };

      const errorResult = Result.fail<CrossFeatureLink>('Self-linking at entity level is prohibited');
      mockLinkingService.createCrossFeatureLink.mockReturnValue(errorResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Self-linking at entity level is prohibited');
    });
  });

  describe('execute_ValidContextData_IncludesContextInLink', () => {
    it('should include valid node context in the created link', async () => {
      // Arrange
      const nodeContext = {
        nodeId: 'node-123',
        nodeType: 'stage',
        metadata: { key: 'value' }
      };

      const command: CreateCrossFeatureLinkCommand = {
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: 'function-model-123',
        targetId: 'kb-456',
        linkType: LinkType.DOCUMENTS,
        initialStrength: 0.6,
        nodeContext,
        createdBy: 'user-789'
      };

      const mockLink = {} as CrossFeatureLink;
      mockLinkingService.createCrossFeatureLink.mockReturnValue(Result.ok(mockLink));
      mockRepository.findBySourceAndTarget.mockResolvedValue(Result.ok(null)); // No duplicate
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockLinkingService.createCrossFeatureLink).toHaveBeenCalledWith(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        'function-model-123',
        'kb-456',
        LinkType.DOCUMENTS,
        0.6,
        nodeContext
      );
    });
  });

  describe('execute_EventPublishingFailure_StillReturnsSuccess', () => {
    it('should still return success even if event publishing fails', async () => {
      // Arrange
      const command: CreateCrossFeatureLinkCommand = {
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: 'function-model-123',
        targetId: 'kb-456',
        linkType: LinkType.DOCUMENTS,
        initialStrength: 0.5,
        createdBy: 'user-789'
      };

      const mockLink = {} as CrossFeatureLink;
      mockLinkingService.createCrossFeatureLink.mockReturnValue(Result.ok(mockLink));
      mockRepository.findBySourceAndTarget.mockResolvedValue(Result.ok(null)); // No duplicate
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockEventPublisher.publish.mockResolvedValue(Result.fail('Event bus error'));

      // Act
      const result = await useCase.execute(command);

      // Assert - Domain consistency is maintained even if events fail
      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledWith(mockLink);
      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });
  });
});

/**
 * Test Plan Summary for UC-014: Create Cross-Feature Link
 * 
 * This test suite validates:
 * 1. Successful cross-feature link creation with proper domain coordination
 * 2. Validation of feature compatibility using domain service
 * 3. Prevention of duplicate links and self-linking
 * 4. Proper strength validation and boundary enforcement
 * 5. Repository persistence with proper error handling
 * 6. Domain event publishing following Clean Architecture
 * 7. Node context validation and inclusion
 * 8. Resilience to infrastructure failures (event publishing)
 * 
 * Architecture Compliance:
 * - Use case coordinates domain services and infrastructure
 * - Domain logic remains in CrossFeatureLinkingService
 * - Repository interface abstracts persistence concerns
 * - Domain events maintain loose coupling
 * - Result pattern provides consistent error handling
 */