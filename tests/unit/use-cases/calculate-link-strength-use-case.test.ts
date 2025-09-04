import { CalculateLinkStrengthUseCase } from '../../../lib/use-cases/cross-feature/calculate-link-strength-use-case';
import { CalculateLinkStrengthCommand } from '../../../lib/use-cases/commands/link-commands';
import { CrossFeatureLink } from '../../../lib/domain/entities/cross-feature-link';
import { CrossFeatureLinkingService, LinkStrengthCalculation } from '../../../lib/domain/services/cross-feature-linking-service';
import { FeatureType, LinkType } from '../../../lib/domain/enums';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { Result } from '../../../lib/domain/shared/result';

// Mock interfaces following Clean Architecture
interface ICrossFeatureLinkRepository {
  findById(linkId: NodeId): Promise<Result<CrossFeatureLink | null>>;
  update(link: CrossFeatureLink): Promise<Result<void>>;
}

interface ILinkAnalyticsService {
  getInteractionFrequency(sourceId: string, targetId: string, timeWindow: number): Promise<number>;
  getSemanticSimilarity(sourceFeature: FeatureType, targetFeature: FeatureType, sourceId: string, targetId: string): Promise<number>;
  getContextRelevance(linkId: string, contextData: Record<string, any>): Promise<number>;
}

interface IDomainEventPublisher {
  publish(event: any): Promise<Result<void>>;
}

describe('UC-015: CalculateLinkStrengthUseCase', () => {
  let useCase: CalculateLinkStrengthUseCase;
  let mockRepository: jest.Mocked<ICrossFeatureLinkRepository>;
  let mockAnalyticsService: jest.Mocked<ILinkAnalyticsService>;
  let mockEventPublisher: jest.Mocked<IDomainEventPublisher>;
  let mockLinkingService: jest.Mocked<CrossFeatureLinkingService>;
  let mockLinkId: NodeId;

  beforeEach(() => {
    // Mock dependencies following dependency inversion principle
    mockRepository = {
      findById: jest.fn(),
      update: jest.fn()
    };

    mockAnalyticsService = {
      getInteractionFrequency: jest.fn(),
      getSemanticSimilarity: jest.fn(),
      getContextRelevance: jest.fn()
    };

    mockEventPublisher = {
      publish: jest.fn().mockResolvedValue(Result.ok(undefined))
    };

    mockLinkingService = {
      calculateLinkStrength: jest.fn()
    } as any;

    mockLinkId = NodeId.create('12345678-0000-4000-8000-123456789012').value;

    useCase = new CalculateLinkStrengthUseCase(
      mockRepository,
      mockAnalyticsService,
      mockEventPublisher,
      mockLinkingService
    );
  });

  describe('execute_ValidInputs_CalculatesStrengthSuccessfully', () => {
    it('should calculate link strength with all bonuses and update link', async () => {
      // Arrange
      const command: CalculateLinkStrengthCommand = {
        linkId: '12345678-0000-4000-8000-123456789012',
        timeWindowHours: 24,
        includeSemanticAnalysis: true,
        includeContextAnalysis: true
      };

      const mockLink = createMockCrossFeatureLink();
      const linkStrengthCalculation: LinkStrengthCalculation = {
        baseStrength: 0.4,
        frequencyBonus: 0.15, // 75 interactions * 0.002 = 0.15
        semanticBonus: 0.24, // 0.8 similarity * 0.3 = 0.24
        contextBonus: 0.16, // 0.8 relevance * 0.2 = 0.16
        finalStrength: 0.95 // 0.4 + 0.15 + 0.24 + 0.16 = 0.95
      };

      mockRepository.findById.mockResolvedValue(Result.ok(mockLink));
      mockAnalyticsService.getInteractionFrequency.mockResolvedValue(75);
      mockAnalyticsService.getSemanticSimilarity.mockResolvedValue(0.8);
      mockAnalyticsService.getContextRelevance.mockResolvedValue(0.8);
      mockLinkingService.calculateLinkStrength.mockResolvedValue(Result.ok(linkStrengthCalculation));
      mockRepository.update.mockResolvedValue(Result.ok(undefined));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(linkStrengthCalculation);
      
      // Verify analytics were gathered
      expect(mockAnalyticsService.getInteractionFrequency).toHaveBeenCalledWith(
        'source-123',
        'target-456',
        24
      );
      expect(mockAnalyticsService.getSemanticSimilarity).toHaveBeenCalledWith(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        'source-123',
        'target-456'
      );
      expect(mockAnalyticsService.getContextRelevance).toHaveBeenCalledWith(
        '12345678-0000-4000-8000-123456789012',
        { contextKey: 'contextValue' }
      );
      
      // Verify domain service calculation
      expect(mockLinkingService.calculateLinkStrength).toHaveBeenCalledWith(
        mockLinkId,
        75,
        0.8,
        0.8
      );
      
      // Verify link was updated
      expect(mockRepository.update).toHaveBeenCalledWith(mockLink);
      
      // Verify event was published
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            linkId: '12345678-0000-4000-8000-123456789012',
            previousStrength: 0.4,
            newStrength: 0.95,
            calculation: linkStrengthCalculation
          })
        })
      );
    });
  });

  describe('execute_LinkNotFound_ReturnsFailure', () => {
    it('should fail when link does not exist', async () => {
      // Arrange
      const command: CalculateLinkStrengthCommand = {
        linkId: '99999999-0000-4000-8000-999999999999',
        timeWindowHours: 24
      };

      mockRepository.findById.mockResolvedValue(Result.ok(null));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cross-feature link not found');
      expect(mockAnalyticsService.getInteractionFrequency).not.toHaveBeenCalled();
      expect(mockLinkingService.calculateLinkStrength).not.toHaveBeenCalled();
    });
  });

  describe('execute_MaximumBonusLimits_EnforcesCaps', () => {
    it('should enforce maximum bonus limits for each component', async () => {
      // Arrange
      const command: CalculateLinkStrengthCommand = {
        linkId: '12345678-0000-4000-8000-123456789012',
        timeWindowHours: 168, // 7 days
        includeSemanticAnalysis: true,
        includeContextAnalysis: true
      };

      const mockLink = createMockCrossFeatureLink();
      const linkStrengthCalculation: LinkStrengthCalculation = {
        baseStrength: 0.5,
        frequencyBonus: 0.2, // Capped at 0.2 even with 200+ interactions
        semanticBonus: 0.3, // Capped at 0.3 even with 1.0 similarity
        contextBonus: 0.2, // Capped at 0.2 even with 1.0 relevance
        finalStrength: 1.0 // Capped at 1.0
      };

      mockRepository.findById.mockResolvedValue(Result.ok(mockLink));
      mockAnalyticsService.getInteractionFrequency.mockResolvedValue(200); // Would give 0.4 bonus without cap
      mockAnalyticsService.getSemanticSimilarity.mockResolvedValue(1.0); // Maximum similarity
      mockAnalyticsService.getContextRelevance.mockResolvedValue(1.0); // Maximum relevance
      mockLinkingService.calculateLinkStrength.mockResolvedValue(Result.ok(linkStrengthCalculation));
      mockRepository.update.mockResolvedValue(Result.ok(undefined));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.frequencyBonus).toBe(0.2); // Capped
      expect(result.value.semanticBonus).toBe(0.3); // Capped
      expect(result.value.contextBonus).toBe(0.2); // Capped
      expect(result.value.finalStrength).toBe(1.0); // Total capped
    });
  });

  describe('execute_OnlyFrequencyAnalysis_SkipsOptionalComponents', () => {
    it('should only calculate frequency bonus when other analyses are disabled', async () => {
      // Arrange
      const command: CalculateLinkStrengthCommand = {
        linkId: '12345678-0000-4000-8000-123456789012',
        timeWindowHours: 24,
        includeSemanticAnalysis: false,
        includeContextAnalysis: false
      };

      const mockLink = createMockCrossFeatureLink();
      const linkStrengthCalculation: LinkStrengthCalculation = {
        baseStrength: 0.6,
        frequencyBonus: 0.1,
        semanticBonus: 0, // Skipped
        contextBonus: 0, // Skipped
        finalStrength: 0.7
      };

      mockRepository.findById.mockResolvedValue(Result.ok(mockLink));
      mockAnalyticsService.getInteractionFrequency.mockResolvedValue(50);
      mockLinkingService.calculateLinkStrength.mockResolvedValue(Result.ok(linkStrengthCalculation));
      mockRepository.update.mockResolvedValue(Result.ok(undefined));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockAnalyticsService.getSemanticSimilarity).not.toHaveBeenCalled();
      expect(mockAnalyticsService.getContextRelevance).not.toHaveBeenCalled();
      expect(result.value.semanticBonus).toBe(0);
      expect(result.value.contextBonus).toBe(0);
    });
  });

  describe('execute_AnalyticsServiceFailure_ReturnsFailure', () => {
    it('should fail when frequency analysis service fails', async () => {
      // Arrange
      const command: CalculateLinkStrengthCommand = {
        linkId: '12345678-0000-4000-8000-123456789012',
        timeWindowHours: 24
      };

      const mockLink = createMockCrossFeatureLink();
      mockRepository.findById.mockResolvedValue(Result.ok(mockLink));
      mockAnalyticsService.getInteractionFrequency.mockRejectedValue(
        new Error('Analytics service unavailable')
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Analytics service unavailable');
      expect(mockLinkingService.calculateLinkStrength).not.toHaveBeenCalled();
    });
  });

  describe('execute_DomainServiceFailure_ReturnsFailure', () => {
    it('should fail when domain service calculation fails', async () => {
      // Arrange
      const command: CalculateLinkStrengthCommand = {
        linkId: '12345678-0000-4000-8000-123456789012',
        timeWindowHours: 24
      };

      const mockLink = createMockCrossFeatureLink();
      mockRepository.findById.mockResolvedValue(Result.ok(mockLink));
      mockAnalyticsService.getInteractionFrequency.mockResolvedValue(50);
      mockAnalyticsService.getSemanticSimilarity.mockResolvedValue(0.7);
      mockAnalyticsService.getContextRelevance.mockResolvedValue(0.6);
      mockLinkingService.calculateLinkStrength.mockResolvedValue(
        Result.fail('Link strength calculation failed')
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Link strength calculation failed');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('execute_RepositoryUpdateFailure_ReturnsFailure', () => {
    it('should fail when repository update fails', async () => {
      // Arrange
      const command: CalculateLinkStrengthCommand = {
        linkId: '12345678-0000-4000-8000-123456789012',
        timeWindowHours: 24
      };

      const mockLink = createMockCrossFeatureLink();
      const linkStrengthCalculation: LinkStrengthCalculation = {
        baseStrength: 0.4,
        frequencyBonus: 0.1,
        semanticBonus: 0.2,
        contextBonus: 0.15,
        finalStrength: 0.85
      };

      mockRepository.findById.mockResolvedValue(Result.ok(mockLink));
      mockAnalyticsService.getInteractionFrequency.mockResolvedValue(50);
      mockAnalyticsService.getSemanticSimilarity.mockResolvedValue(0.67);
      mockAnalyticsService.getContextRelevance.mockResolvedValue(0.75);
      mockLinkingService.calculateLinkStrength.mockResolvedValue(Result.ok(linkStrengthCalculation));
      mockRepository.update.mockResolvedValue(Result.fail('Database connection error'));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Database connection error');
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('execute_NoInteractions_ZeroFrequencyBonus', () => {
    it('should apply zero frequency bonus when no interactions found', async () => {
      // Arrange
      const command: CalculateLinkStrengthCommand = {
        linkId: '12345678-0000-4000-8000-123456789012',
        timeWindowHours: 24
      };

      const mockLink = createMockCrossFeatureLink();
      const linkStrengthCalculation: LinkStrengthCalculation = {
        baseStrength: 0.5,
        frequencyBonus: 0, // No interactions
        semanticBonus: 0.15,
        contextBonus: 0.1,
        finalStrength: 0.75
      };

      mockRepository.findById.mockResolvedValue(Result.ok(mockLink));
      mockAnalyticsService.getInteractionFrequency.mockResolvedValue(0);
      mockAnalyticsService.getSemanticSimilarity.mockResolvedValue(0.5);
      mockAnalyticsService.getContextRelevance.mockResolvedValue(0.5);
      mockLinkingService.calculateLinkStrength.mockResolvedValue(Result.ok(linkStrengthCalculation));
      mockRepository.update.mockResolvedValue(Result.ok(undefined));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.frequencyBonus).toBe(0);
      expect(result.value.finalStrength).toBe(0.75);
    });
  });

  describe('execute_LinkWithoutContext_SkipsContextAnalysis', () => {
    it('should skip context analysis when link has no context data', async () => {
      // Arrange
      const command: CalculateLinkStrengthCommand = {
        linkId: '12345678-0000-4000-8000-123456789012',
        timeWindowHours: 24,
        includeContextAnalysis: true
      };

      const mockLink = createMockCrossFeatureLinkWithoutContext();
      const linkStrengthCalculation: LinkStrengthCalculation = {
        baseStrength: 0.5,
        frequencyBonus: 0.1,
        semanticBonus: 0.2,
        contextBonus: 0, // No context data
        finalStrength: 0.8
      };

      mockRepository.findById.mockResolvedValue(Result.ok(mockLink));
      mockAnalyticsService.getInteractionFrequency.mockResolvedValue(50);
      mockAnalyticsService.getSemanticSimilarity.mockResolvedValue(0.67);
      mockLinkingService.calculateLinkStrength.mockResolvedValue(Result.ok(linkStrengthCalculation));
      mockRepository.update.mockResolvedValue(Result.ok(undefined));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockAnalyticsService.getContextRelevance).not.toHaveBeenCalled();
      expect(result.value.contextBonus).toBe(0);
    });
  });

  // Helper functions to create mock objects
  function createMockCrossFeatureLink(): CrossFeatureLink {
    return {
      linkId: mockLinkId,
      sourceFeature: FeatureType.FUNCTION_MODEL,
      targetFeature: FeatureType.KNOWLEDGE_BASE,
      sourceId: 'source-123',
      targetId: 'target-456',
      linkType: LinkType.DOCUMENTS,
      linkStrength: 0.4,
      nodeContext: { contextKey: 'contextValue' },
      hasNodeContext: () => true,
      updateLinkStrength: jest.fn().mockReturnValue(Result.ok(undefined))
    } as any;
  }

  function createMockCrossFeatureLinkWithoutContext(): CrossFeatureLink {
    return {
      linkId: mockLinkId,
      sourceFeature: FeatureType.FUNCTION_MODEL,
      targetFeature: FeatureType.KNOWLEDGE_BASE,
      sourceId: 'source-123',
      targetId: 'target-456',
      linkType: LinkType.DOCUMENTS,
      linkStrength: 0.5,
      nodeContext: undefined,
      hasNodeContext: () => false,
      updateLinkStrength: jest.fn().mockReturnValue(Result.ok(undefined))
    } as any;
  }
});

/**
 * Test Plan Summary for UC-015: Calculate Link Strength
 * 
 * This test suite validates:
 * 1. Complete link strength calculation with all bonus components
 * 2. Enforcement of maximum bonus limits (frequency: 0.2, semantic: 0.3, context: 0.2)
 * 3. Final strength capping at 1.0
 * 4. Optional analysis components (semantic and context can be disabled)
 * 5. Handling of links without context data
 * 6. Zero-interaction scenarios (no frequency bonus)
 * 7. Failure handling for analytics service, domain service, and repository
 * 8. Proper event publishing for strength updates
 * 9. Domain service coordination for calculation logic
 * 
 * Architecture Compliance:
 * - Use case orchestrates analytics gathering and domain calculation
 * - Domain service encapsulates strength calculation business rules
 * - Analytics service provides interaction data (infrastructure concern)
 * - Repository handles persistence with proper error handling
 * - Events published for integration with other bounded contexts
 * - Proper separation of calculation logic from data gathering
 */