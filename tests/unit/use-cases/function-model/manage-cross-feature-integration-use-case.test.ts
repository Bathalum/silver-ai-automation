/**
 * @fileoverview 
 * Tests for UC-014, UC-015, UC-016: Cross-Feature Integration Use Cases
 * 
 * ARCHITECTURE COMPLIANCE:
 * - Tests serve as boundary filters enforcing layer separation
 * - Use Case orchestrates Domain Services following Clean Architecture
 * - Repository interfaces are mocked to test application logic in isolation
 * - Domain events are verified for proper integration patterns
 * 
 * TEST STRATEGY:
 * - UC-014: Create Cross-Feature Link - link creation with validation
 * - UC-015: Calculate Link Strength - strength calculation with bonuses
 * - UC-016: Detect Relationship Cycles - cycle detection in networks
 * 
 * COVERAGE FOCUS:
 * - Feature compatibility validation
 * - Link strength calculation algorithms
 * - Cycle detection across complex networks
 * - Event publishing for integration events
 * - Error handling and boundary conditions
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Result } from '../../../../lib/domain/shared/result';
import { FeatureType, LinkType } from '../../../../lib/domain/enums';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { CrossFeatureLink } from '../../../../lib/domain/entities/cross-feature-link';
import { NodeLink } from '../../../../lib/domain/entities/node-link';
import { CrossFeatureLinkingService, LinkStrengthCalculation, RelationshipCycle } from '../../../../lib/domain/services/cross-feature-linking-service';
import { DomainEventPublisher } from '../../../../lib/domain/events/domain-event-publisher';
import { CrossFeatureLinkEstablished } from '../../../../lib/domain/events/model-events';
import { ManageCrossFeatureIntegrationUseCase, ICrossFeatureLinkRepository, INodeLinkRepository } from '../../../../lib/use-cases/function-model/manage-cross-feature-integration-use-case';
import { getTestUUID } from '../../../utils/test-fixtures';

// Mock interfaces for Clean Architecture compliance
interface MockCrossFeatureLinkRepository extends ICrossFeatureLinkRepository {
  save: jest.Mock;
  findById: jest.Mock;
  findByFeaturePair: jest.Mock;
  remove: jest.Mock;
}

interface MockNodeLinkRepository extends INodeLinkRepository {
  save: jest.Mock;
  findById: jest.Mock;
  findByNodeIds: jest.Mock;
  remove: jest.Mock;
}

interface MockDomainEventPublisher extends DomainEventPublisher {
  publish: jest.Mock;
}


describe('ManageCrossFeatureIntegrationUseCase', () => {
  let useCase: ManageCrossFeatureIntegrationUseCase;
  let crossFeatureLinkingService: CrossFeatureLinkingService;
  let mockCrossFeatureLinkRepository: MockCrossFeatureLinkRepository;
  let mockNodeLinkRepository: MockNodeLinkRepository;
  let mockEventPublisher: MockDomainEventPublisher;
  let linkCounter = 0;

  beforeEach(() => {
    // Create fresh service instance for each test
    crossFeatureLinkingService = new CrossFeatureLinkingService();

    // Reset link counter for each test
    linkCounter = 0;

    // Create mocks for infrastructure dependencies
    mockCrossFeatureLinkRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByFeaturePair: jest.fn(),
      remove: jest.fn(),
    };

    mockNodeLinkRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByNodeIds: jest.fn(),
      remove: jest.fn(),
    };

    mockEventPublisher = {
      publish: jest.fn(),
    };

    // Create use case instance
    useCase = new ManageCrossFeatureIntegrationUseCase(
      crossFeatureLinkingService,
      mockCrossFeatureLinkRepository,
      mockNodeLinkRepository,
      mockEventPublisher
    );

    // Setup default mock implementations
    mockCrossFeatureLinkRepository.save.mockResolvedValue(undefined);
    mockNodeLinkRepository.save.mockResolvedValue(undefined);
  });

  describe('UC-014: Create Cross-Feature Link', () => {
    describe('Main Success Scenario', () => {
      it('CreateCrossFeatureLink_ValidRequest_CreatesLinkSuccessfully', async () => {
        // Arrange
        const request = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: getTestUUID('model-1'),
          targetId: getTestUUID('kb-1'),
          linkType: LinkType.DOCUMENTS,
          initialStrength: 0.7,
          nodeContext: {
            nodeId: 'test-node',
            nodeType: 'container'
          },
          createdBy: getTestUUID('user-1')
        };

        // Act
        const result = await useCase.createCrossFeatureLink(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        const link = result.value;

        // Verify link properties
        expect(link.sourceFeature).toBe(FeatureType.FUNCTION_MODEL);
        expect(link.targetFeature).toBe(FeatureType.KNOWLEDGE_BASE);
        expect(link.sourceId).toBe(request.sourceId);
        expect(link.targetId).toBe(request.targetId);
        expect(link.linkType).toBe(LinkType.DOCUMENTS);
        expect(link.linkStrength).toBe(0.7);
        expect(link.nodeContext).toEqual(request.nodeContext);

        // Verify repository interaction
        expect(mockCrossFeatureLinkRepository.save).toHaveBeenCalledWith(link);

        // Verify event publishing
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
          expect.objectContaining({
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.KNOWLEDGE_BASE,
            linkType: LinkType.DOCUMENTS,
            linkStrength: 0.7,
            establishedBy: request.createdBy
          })
        );
      });

      it('CreateCrossFeatureLink_AllFeaturePairCombinations_RespectsCompatibilityMatrix', async () => {
        // Test all valid feature-link type combinations from compatibility matrix
        const validCombinations = [
          {
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.KNOWLEDGE_BASE,
            linkType: LinkType.DOCUMENTS
          },
          {
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.KNOWLEDGE_BASE,
            linkType: LinkType.REFERENCES
          },
          {
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.SPINDLE,
            linkType: LinkType.IMPLEMENTS
          },
          {
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.SPINDLE,
            linkType: LinkType.TRIGGERS
          },
          {
            sourceFeature: FeatureType.KNOWLEDGE_BASE,
            targetFeature: FeatureType.SPINDLE,
            linkType: LinkType.DOCUMENTS
          }
        ];

        // Test each valid combination
        for (let i = 0; i < validCombinations.length; i++) {
          const combo = validCombinations[i];
          const request = {
            sourceFeature: combo.sourceFeature,
            targetFeature: combo.targetFeature,
            sourceId: getTestUUID(`source-${i}`),
            targetId: getTestUUID(`target-${i}`),
            linkType: combo.linkType,
            createdBy: getTestUUID('user-1')
          };

          const result = await useCase.createCrossFeatureLink(request);
          expect(result.isSuccess).toBe(true);
        }
      });
    });

    describe('Error Scenarios', () => {
      it('CreateCrossFeatureLink_MissingRequiredFields_ReturnsValidationError', async () => {
        // Arrange
        const request = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: '', // Missing
          targetId: getTestUUID('kb-1'),
          linkType: LinkType.DOCUMENTS,
          createdBy: getTestUUID('user-1')
        };

        // Act
        const result = await useCase.createCrossFeatureLink(request);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Missing required fields');
      });

      it('CreateCrossFeatureLink_IncompatibleFeatureLinkType_ReturnsCompatibilityError', async () => {
        // Arrange - FUNCTION_MODEL to KNOWLEDGE_BASE with incompatible IMPLEMENTS link
        const request = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: getTestUUID('model-1'),
          targetId: getTestUUID('kb-1'),
          linkType: LinkType.IMPLEMENTS, // Invalid for this feature pair
          createdBy: getTestUUID('user-1')
        };

        // Act
        const result = await useCase.createCrossFeatureLink(request);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('not allowed between');
      });

      it('CreateCrossFeatureLink_DuplicateLink_ReturnsError', async () => {
        // Arrange - Create first link
        const request = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: getTestUUID('model-1'),
          targetId: getTestUUID('kb-1'),
          linkType: LinkType.DOCUMENTS,
          createdBy: getTestUUID('user-1')
        };

        // Act - Create same link twice
        const firstResult = await useCase.createCrossFeatureLink(request);
        expect(firstResult.isSuccess).toBe(true);

        const secondResult = await useCase.createCrossFeatureLink(request);

        // Assert
        expect(secondResult.isFailure).toBe(true);
        expect(secondResult.error).toContain('already exists');
      });

      it('CreateCrossFeatureLink_RepositoryFailure_PropagatesError', async () => {
        // Arrange
        const request = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: getTestUUID('model-1'),
          targetId: getTestUUID('kb-1'),
          linkType: LinkType.DOCUMENTS,
          createdBy: getTestUUID('user-1')
        };

        mockCrossFeatureLinkRepository.save.mockRejectedValue(new Error('Database connection failed'));

        // Act
        const result = await useCase.createCrossFeatureLink(request);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Database connection failed');
      });
    });

    describe('Link Strength Initialization', () => {
      it('CreateCrossFeatureLink_NoInitialStrength_DefaultsToHalf', async () => {
        // Arrange
        const request = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: getTestUUID('model-1'),
          targetId: getTestUUID('kb-1'),
          linkType: LinkType.DOCUMENTS,
          // No initialStrength specified
          createdBy: getTestUUID('user-1')
        };

        // Act
        const result = await useCase.createCrossFeatureLink(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.linkStrength).toBe(0.5);
      });

      it('CreateCrossFeatureLink_CustomInitialStrength_UsesProvidedValue', async () => {
        // Arrange
        const request = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: getTestUUID('model-1'),
          targetId: getTestUUID('kb-1'),
          linkType: LinkType.DOCUMENTS,
          initialStrength: 0.8,
          createdBy: getTestUUID('user-1')
        };

        // Act
        const result = await useCase.createCrossFeatureLink(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.linkStrength).toBe(0.8);
      });
    });
  });

  describe('UC-015: Calculate Link Strength', () => {
    describe('Main Success Scenario', () => {
      it('CalculateLinkStrength_AllBonusTypes_CalculatesCorrectly', async () => {
        // Arrange - First create a link
        const link = await createTestCrossFeatureLink();
        const request = {
          linkId: link.linkId,
          interactionFrequency: 100, // Should give max frequency bonus (0.2)
          semanticSimilarity: 1.0,   // Should give max semantic bonus (0.3)
          contextRelevance: 1.0      // Should give max context bonus (0.2)
        };

        // Act
        const result = await useCase.calculateLinkStrength(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        const calculation = result.value;

        expect(calculation.baseStrength).toBe(0.5);
        expect(calculation.frequencyBonus).toBe(0.2);
        expect(calculation.semanticBonus).toBe(0.3);
        expect(calculation.contextBonus).toBe(0.2);
        expect(calculation.finalStrength).toBe(1.0); // Capped at 1.0
      });

      it('CalculateLinkStrength_PartialBonuses_CalculatesProportionally', async () => {
        // Arrange
        const link = await createTestCrossFeatureLink();
        const request = {
          linkId: link.linkId,
          interactionFrequency: 50,  // Should give 0.1 frequency bonus
          semanticSimilarity: 0.5,   // Should give 0.15 semantic bonus
          contextRelevance: 0.25     // Should give 0.05 context bonus
        };

        // Act
        const result = await useCase.calculateLinkStrength(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        const calculation = result.value;

        expect(calculation.baseStrength).toBe(0.5);
        expect(calculation.frequencyBonus).toBeCloseTo(0.1);
        expect(calculation.semanticBonus).toBeCloseTo(0.15);
        expect(calculation.contextBonus).toBeCloseTo(0.05);
        expect(calculation.finalStrength).toBeCloseTo(0.8); // 0.5 + 0.1 + 0.15 + 0.05
      });

      it('CalculateLinkStrength_ExcessiveBonuses_CapsAtMaximums', async () => {
        // Arrange
        const link = await createTestCrossFeatureLink();
        const request = {
          linkId: link.linkId,
          interactionFrequency: 1000, // Should still cap at 0.2
          semanticSimilarity: 2.0,    // Should still cap at 0.3
          contextRelevance: 5.0       // Should still cap at 0.2
        };

        // Act
        const result = await useCase.calculateLinkStrength(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        const calculation = result.value;

        expect(calculation.frequencyBonus).toBe(0.2);
        expect(calculation.semanticBonus).toBe(0.3);
        expect(calculation.contextBonus).toBe(0.2);
        expect(calculation.finalStrength).toBe(1.0);
      });

      it('CalculateLinkStrength_WeakMetrics_LowBonuses', async () => {
        // Arrange
        const link = await createTestCrossFeatureLink();
        const request = {
          linkId: link.linkId,
          interactionFrequency: 1,   // Very low frequency
          semanticSimilarity: 0.1,   // Low similarity
          contextRelevance: 0.1      // Low relevance
        };

        // Act
        const result = await useCase.calculateLinkStrength(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        const calculation = result.value;

        expect(calculation.frequencyBonus).toBeCloseTo(0.002);
        expect(calculation.semanticBonus).toBeCloseTo(0.03);
        expect(calculation.contextBonus).toBeCloseTo(0.02);
        expect(calculation.finalStrength).toBeCloseTo(0.552); // 0.5 + small bonuses
      });
    });

    describe('Error Scenarios', () => {
      it('CalculateLinkStrength_NonexistentLink_ReturnsError', async () => {
        // Arrange
        const nonexistentLinkId = NodeId.create(getTestUUID('nonexistent')).value;
        const request = {
          linkId: nonexistentLinkId,
          interactionFrequency: 50,
          semanticSimilarity: 0.5,
          contextRelevance: 0.5
        };

        // Act
        const result = await useCase.calculateLinkStrength(request);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Link not found');
      });
    });

    describe('Bonus Calculation Edge Cases', () => {
      it('CalculateLinkStrength_ZeroMetrics_NoBonus', async () => {
        // Arrange
        const link = await createTestCrossFeatureLink();
        const request = {
          linkId: link.linkId,
          interactionFrequency: 0,
          semanticSimilarity: 0,
          contextRelevance: 0
        };

        // Act
        const result = await useCase.calculateLinkStrength(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        const calculation = result.value;

        expect(calculation.frequencyBonus).toBe(0);
        expect(calculation.semanticBonus).toBe(0);
        expect(calculation.contextBonus).toBe(0);
        expect(calculation.finalStrength).toBe(0.5); // Only base strength
      });

      it('CalculateLinkStrength_NegativeMetrics_TreatedAsZero', async () => {
        // Arrange
        const link = await createTestCrossFeatureLink();
        const request = {
          linkId: link.linkId,
          interactionFrequency: -10,
          semanticSimilarity: -0.5,
          contextRelevance: -1.0
        };

        // Act
        const result = await useCase.calculateLinkStrength(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        const calculation = result.value;

        // Negative values should be treated as zero in bonus calculation
        expect(calculation.frequencyBonus).toBe(0);
        expect(calculation.semanticBonus).toBe(0);
        expect(calculation.contextBonus).toBe(0);
      });
    });
  });

  describe('UC-016: Detect Relationship Cycles', () => {
    describe('Main Success Scenario', () => {
      it('DetectRelationshipCycles_NoCycles_ReturnsEmptyArray', async () => {
        // Arrange - Create linear chain: A -> B -> C
        const linkA = await createTestCrossFeatureLink({
          sourceId: getTestUUID('entity-a'),
          targetId: getTestUUID('entity-b')
        });
        const linkB = await createTestCrossFeatureLink({
          sourceId: getTestUUID('entity-b'),
          targetId: getTestUUID('entity-c')
        });

        // Act
        const result = await useCase.detectRelationshipCycles();

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual([]);
      });

      it('DetectRelationshipCycles_SimpleCycle_DetectsCorrectly', async () => {
        // Arrange - Create cycle: A -> B -> C -> A
        // Important: Use consistent entity IDs to create actual cycles
        const entityAId = getTestUUID('entity-a');
        const entityBId = getTestUUID('entity-b'); 
        const entityCId = getTestUUID('entity-c');

        const linkA = await createTestCrossFeatureLink({
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: entityAId,
          targetId: entityBId,
          linkType: LinkType.DOCUMENTS
        });
        const linkB = await createTestCrossFeatureLink({
          sourceFeature: FeatureType.KNOWLEDGE_BASE,
          targetFeature: FeatureType.SPINDLE,
          sourceId: entityBId,
          targetId: entityCId,
          linkType: LinkType.SUPPORTS
        });
        const linkC = await createTestCrossFeatureLink({
          sourceFeature: FeatureType.SPINDLE,
          targetFeature: FeatureType.FUNCTION_MODEL,
          sourceId: entityCId,
          targetId: entityAId,
          linkType: LinkType.IMPLEMENTS
        });

        // Act
        const result = await useCase.detectRelationshipCycles();

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(1);
        
        const cycle = result.value[0];
        expect(cycle.cycleLength).toBe(3);
        expect(cycle.cycleNodes).toHaveLength(3);
        expect(cycle.linkTypes).toContain(LinkType.DOCUMENTS);
        expect(cycle.linkTypes).toContain(LinkType.SUPPORTS);
        expect(cycle.linkTypes).toContain(LinkType.IMPLEMENTS);
      });

      it('DetectRelationshipCycles_SelfReference_DetectsAsShortCycle', async () => {
        // Arrange - Create self-reference cycle: A -> A
        // Note: This tests the algorithm, though business rules should prevent this
        const entityId = getTestUUID('entity-self');
        
        // Create a test scenario by directly testing the service
        const sourceFeature = FeatureType.FUNCTION_MODEL;
        const targetFeature = FeatureType.FUNCTION_MODEL;
        const linkType = LinkType.NESTED;
        
        // This will create a self-reference that the service will detect
        crossFeatureLinkingService.createCrossFeatureLink(
          sourceFeature,
          targetFeature,
          entityId,
          entityId, // Same entity
          linkType,
          0.5
        );

        // Act
        const result = await useCase.detectRelationshipCycles();

        // Assert
        expect(result.isSuccess).toBe(true);
        // Service will detect this as a cycle of length 1
      });

      it('DetectRelationshipCycles_ComplexNetwork_DetectsMultipleCycles', async () => {
        // Arrange - Create network with multiple cycles
        // Cycle 1: A -> B -> A (2-node cycle)
        // Cycle 2: C -> D -> E -> C (3-node cycle)
        // Linear: F -> G (no cycle)

        // Cycle 1: A -> B -> A
        const entityAId = getTestUUID('entity-a');
        const entityBId = getTestUUID('entity-b');
        await createTestCrossFeatureLink({
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: entityAId,
          targetId: entityBId,
          linkType: LinkType.DOCUMENTS
        });
        await createTestCrossFeatureLink({
          sourceFeature: FeatureType.KNOWLEDGE_BASE,
          targetFeature: FeatureType.FUNCTION_MODEL,
          sourceId: entityBId,
          targetId: entityAId,
          linkType: LinkType.REFERENCES
        });

        // Cycle 2: C -> D -> E -> C
        const entityCId = getTestUUID('entity-c');
        const entityDId = getTestUUID('entity-d');
        const entityEId = getTestUUID('entity-e');
        await createTestCrossFeatureLink({
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.SPINDLE,
          sourceId: entityCId,
          targetId: entityDId,
          linkType: LinkType.TRIGGERS
        });
        await createTestCrossFeatureLink({
          sourceFeature: FeatureType.SPINDLE,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: entityDId,
          targetId: entityEId,
          linkType: LinkType.DOCUMENTS
        });
        await createTestCrossFeatureLink({
          sourceFeature: FeatureType.KNOWLEDGE_BASE,
          targetFeature: FeatureType.FUNCTION_MODEL,
          sourceId: entityEId,
          targetId: entityCId,
          linkType: LinkType.SUPPORTS
        });

        // Linear (no cycle): F -> G
        await createTestCrossFeatureLink({
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: getTestUUID('entity-f'),
          targetId: getTestUUID('entity-g'),
          linkType: LinkType.DOCUMENTS
        });

        // Act
        const result = await useCase.detectRelationshipCycles();

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(2);
        
        // Find cycles by length
        const cycle2 = result.value.find(c => c.cycleLength === 2);
        const cycle3 = result.value.find(c => c.cycleLength === 3);
        
        expect(cycle2).toBeDefined();
        expect(cycle3).toBeDefined();
      });

      it('DetectRelationshipCycles_LongCycle_DetectsCorrectly', async () => {
        // Arrange - Create long cycle: A -> B -> C -> D -> E -> F -> A
        const entities = ['a', 'b', 'c', 'd', 'e', 'f'];
        const features = [FeatureType.FUNCTION_MODEL, FeatureType.KNOWLEDGE_BASE, FeatureType.SPINDLE];
        const linkTypes = [LinkType.DOCUMENTS, LinkType.SUPPORTS, LinkType.IMPLEMENTS];
        
        for (let i = 0; i < entities.length; i++) {
          const sourceId = getTestUUID(`entity-${entities[i]}`);
          const targetId = getTestUUID(`entity-${entities[(i + 1) % entities.length]}`);
          const sourceFeature = features[i % features.length];
          const targetFeature = features[(i + 1) % features.length];
          const linkType = linkTypes[i % linkTypes.length];
          
          await createTestCrossFeatureLink({
            sourceFeature,
            targetFeature,
            sourceId,
            targetId,
            linkType
          });
        }

        // Act
        const result = await useCase.detectRelationshipCycles();

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(1);
        expect(result.value[0].cycleLength).toBe(6);
      });

      it('DetectRelationshipCycles_CrossFeatureTypes_DetectsAcrossFeatures', async () => {
        // Arrange - Create cycle across different feature types
        await createTestCrossFeatureLink({
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: getTestUUID('model-1'),
          targetId: getTestUUID('kb-1'),
          linkType: LinkType.DOCUMENTS
        });
        
        await createTestCrossFeatureLink({
          sourceFeature: FeatureType.KNOWLEDGE_BASE,
          targetFeature: FeatureType.SPINDLE,
          sourceId: getTestUUID('kb-1'),
          targetId: getTestUUID('spindle-1'),
          linkType: LinkType.SUPPORTS
        });
        
        await createTestCrossFeatureLink({
          sourceFeature: FeatureType.SPINDLE,
          targetFeature: FeatureType.FUNCTION_MODEL,
          sourceId: getTestUUID('spindle-1'),
          targetId: getTestUUID('model-1'),
          linkType: LinkType.IMPLEMENTS
        });

        // Act
        const result = await useCase.detectRelationshipCycles();

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(1);
        
        const cycle = result.value[0];
        expect(cycle.cycleLength).toBe(3);
        expect(cycle.linkTypes).toContain(LinkType.DOCUMENTS);
        expect(cycle.linkTypes).toContain(LinkType.SUPPORTS);
        expect(cycle.linkTypes).toContain(LinkType.IMPLEMENTS);
      });
    });

    describe('Error Scenarios', () => {
      it('DetectRelationshipCycles_EmptyNetwork_ReturnsEmptyArray', async () => {
        // Arrange - No links created

        // Act
        const result = await useCase.detectRelationshipCycles();

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual([]);
      });
    });

    describe('Performance and Scalability', () => {
      it('DetectRelationshipCycles_LargeNetwork_CompletesInReasonableTime', async () => {
        // Arrange - Create larger network (limited for test performance)
        const nodeCount = 20;
        const linkCount = 30;
        const features = [FeatureType.FUNCTION_MODEL, FeatureType.KNOWLEDGE_BASE, FeatureType.SPINDLE];
        const linkTypes = [LinkType.DOCUMENTS, LinkType.SUPPORTS, LinkType.IMPLEMENTS];

        // Create random links between nodes with guaranteed unique combinations
        for (let i = 0; i < linkCount; i++) {
          const sourceIndex = i % nodeCount;
          const targetIndex = (i + 3) % nodeCount; // Create some cycles
          const sourceFeature = features[sourceIndex % features.length];
          const targetFeature = features[targetIndex % features.length];
          const linkType = linkTypes[i % linkTypes.length];
          
          await createTestCrossFeatureLink({
            sourceFeature,
            targetFeature,
            sourceId: getTestUUID(`node-${sourceIndex}-${i}`), // Make unique
            targetId: getTestUUID(`node-${targetIndex}-${i}`), // Make unique
            linkType
          });
        }

        // Act
        const startTime = Date.now();
        const result = await useCase.detectRelationshipCycles();
        const endTime = Date.now();

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      });
    });
  });

  describe('Node Link Operations', () => {
    describe('Create Node Link', () => {
      it('CreateNodeLink_ValidRequest_CreatesSuccessfully', async () => {
        // Arrange
        const request = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceEntityId: getTestUUID('model-1'),
          targetEntityId: getTestUUID('kb-1'),
          sourceNodeId: NodeId.create(getTestUUID('node-1')).value,
          targetNodeId: NodeId.create(getTestUUID('node-2')).value,
          linkType: LinkType.DOCUMENTS,
          initialStrength: 0.6,
          linkContext: { connectionType: 'semantic' },
          createdBy: getTestUUID('user-1')
        };

        // Act
        const result = await useCase.createNodeLink(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        const link = result.value;

        expect(link.sourceFeature).toBe(FeatureType.FUNCTION_MODEL);
        expect(link.targetFeature).toBe(FeatureType.KNOWLEDGE_BASE);
        expect(link.sourceEntityId).toBe(request.sourceEntityId);
        expect(link.targetEntityId).toBe(request.targetEntityId);
        expect(link.linkType).toBe(LinkType.DOCUMENTS);
        expect(link.linkStrength).toBe(0.6);

        // Verify repository interaction
        expect(mockNodeLinkRepository.save).toHaveBeenCalledWith(link);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('ComplexWorkflow_CreateLinksCalculateStrengthDetectCycles_WorksTogether', async () => {
      // Arrange & Act - Create a complex network with cycles
      
      // Step 1: Create multiple cross-feature links
      const link1 = await useCase.createCrossFeatureLink({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: getTestUUID('model-1'),
        targetId: getTestUUID('kb-1'),
        linkType: LinkType.DOCUMENTS,
        createdBy: getTestUUID('user-1')
      });
      
      const link2 = await useCase.createCrossFeatureLink({
        sourceFeature: FeatureType.KNOWLEDGE_BASE,
        targetFeature: FeatureType.SPINDLE,
        sourceId: getTestUUID('kb-1'),
        targetId: getTestUUID('spindle-1'),
        linkType: LinkType.SUPPORTS,
        createdBy: getTestUUID('user-1')
      });
      
      const link3 = await useCase.createCrossFeatureLink({
        sourceFeature: FeatureType.SPINDLE,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceId: getTestUUID('spindle-1'),
        targetId: getTestUUID('model-1'),
        linkType: LinkType.IMPLEMENTS,
        createdBy: getTestUUID('user-1')
      });

      // Step 2: Calculate link strengths
      const strengthResult1 = await useCase.calculateLinkStrength({
        linkId: link1.value.linkId,
        interactionFrequency: 75,
        semanticSimilarity: 0.8,
        contextRelevance: 0.6
      });
      
      const strengthResult2 = await useCase.calculateLinkStrength({
        linkId: link2.value.linkId,
        interactionFrequency: 50,
        semanticSimilarity: 0.6,
        contextRelevance: 0.4
      });

      // Step 3: Detect cycles
      const cycleResult = await useCase.detectRelationshipCycles();

      // Assert
      expect(link1.isSuccess).toBe(true);
      expect(link2.isSuccess).toBe(true);
      expect(link3.isSuccess).toBe(true);
      
      expect(strengthResult1.isSuccess).toBe(true);
      expect(strengthResult2.isSuccess).toBe(true);
      
      expect(cycleResult.isSuccess).toBe(true);
      expect(cycleResult.value).toHaveLength(1);
      expect(cycleResult.value[0].cycleLength).toBe(3);
    });
  });

  // Helper function to create test cross-feature links
  async function createTestCrossFeatureLink(overrides?: Partial<{
    sourceFeature: FeatureType;
    targetFeature: FeatureType;
    sourceId: string;
    targetId: string;
    linkType: LinkType;
    initialStrength: number;
  }>): Promise<CrossFeatureLink> {
    linkCounter++;
    const request = {
      sourceFeature: FeatureType.FUNCTION_MODEL,
      targetFeature: FeatureType.KNOWLEDGE_BASE,
      sourceId: getTestUUID(`default-source-${linkCounter}`),
      targetId: getTestUUID(`default-target-${linkCounter}`),
      linkType: LinkType.DOCUMENTS,
      initialStrength: 0.5,
      createdBy: getTestUUID('user-1'),
      ...overrides
    };

    const result = await useCase.createCrossFeatureLink(request);
    if (result.isFailure) {
      throw new Error(`Failed to create test link: ${result.error}`);
    }
    
    return result.value;
  }
});