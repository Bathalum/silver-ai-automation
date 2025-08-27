/**
 * @fileoverview 
 * Comprehensive Integration Tests for Cross-Feature Integration Service
 * 
 * INTEGRATION TEST STRATEGY:
 * - Tests complete cross-feature linking workflows across all three use cases
 * - Tests real integration between all coordinated use cases (UC-014, UC-015, UC-016)
 * - Tests network analysis capabilities with complex relationship graphs
 * - Tests link integrity maintenance during feature modifications
 * - Tests cycle detection in multi-feature networks
 * - Tests link strength evolution over time with interaction tracking
 * - Tests concurrent link operations and data consistency
 * - Tests performance with large feature networks
 * 
 * ARCHITECTURE COMPLIANCE:
 * - Integration tests validate complete workflows across layer boundaries
 * - Service coordinates use cases following Clean Architecture patterns
 * - Real dependencies are used to test actual integration behavior
 * - Tests serve as boundary filters ensuring architectural compliance
 * 
 * COVERAGE FOCUS:
 * - Complete cross-feature integration workflows
 * - Network topology analysis and cycle detection
 * - Link integrity during feature lifecycle changes
 * - Concurrent operations and data consistency
 * - Performance characteristics with large networks
 * - Error handling and recovery patterns
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CrossFeatureIntegrationService } from '../../../lib/application/services/cross-feature-integration-service';
import { ManageCrossFeatureIntegrationUseCase } from '../../../lib/use-cases/function-model/manage-cross-feature-integration-use-case';
import { CrossFeatureLinkingService } from '../../../lib/domain/services/cross-feature-linking-service';
import { DomainEventPublisher } from '../../../lib/domain/events/domain-event-publisher';
import { Result } from '../../../lib/domain/shared/result';
import { FeatureType, LinkType } from '../../../lib/domain/enums';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { getTestUUID } from '../../utils/test-fixtures';

// Mock repositories for integration testing
class MockCrossFeatureLinkRepository {
  private links: Map<string, any> = new Map();

  async save(link: any): Promise<void> {
    this.links.set(link.linkId.value, link);
  }

  async findById(linkId: NodeId): Promise<Result<any>> {
    const link = this.links.get(linkId.value);
    return link ? Result.ok(link) : Result.fail('Link not found');
  }

  async findByFeaturePair(sourceFeature: FeatureType, targetFeature: FeatureType): Promise<any[]> {
    return Array.from(this.links.values()).filter(link => 
      (link.sourceFeature === sourceFeature && link.targetFeature === targetFeature) ||
      (link.sourceFeature === targetFeature && link.targetFeature === sourceFeature)
    );
  }

  async remove(linkId: NodeId): Promise<void> {
    this.links.delete(linkId.value);
  }

  // Helper for testing
  getAllLinks(): any[] {
    return Array.from(this.links.values());
  }

  clear(): void {
    this.links.clear();
  }
}

class MockNodeLinkRepository {
  private links: Map<string, any> = new Map();

  async save(link: any): Promise<void> {
    this.links.set(link.linkId.value, link);
  }

  async findById(linkId: NodeId): Promise<Result<any>> {
    const link = this.links.get(linkId.value);
    return link ? Result.ok(link) : Result.fail('Link not found');
  }

  async findByNodeIds(sourceNodeId: NodeId, targetNodeId: NodeId): Promise<any[]> {
    return Array.from(this.links.values()).filter(link => 
      link.sourceNodeId.equals(sourceNodeId) && link.targetNodeId.equals(targetNodeId)
    );
  }

  async remove(linkId: NodeId): Promise<void> {
    this.links.delete(linkId.value);
  }

  clear(): void {
    this.links.clear();
  }
}

class MockDomainEventPublisher implements DomainEventPublisher {
  private publishedEvents: any[] = [];

  async publish(event: any): Promise<void> {
    this.publishedEvents.push(event);
  }

  getPublishedEvents(): any[] {
    return this.publishedEvents;
  }

  clear(): void {
    this.publishedEvents = [];
  }
}

describe('CrossFeatureIntegrationService - Integration Tests', () => {
  let integrationService: CrossFeatureIntegrationService;
  let crossFeatureIntegrationUseCase: ManageCrossFeatureIntegrationUseCase;
  let crossFeatureLinkingService: CrossFeatureLinkingService;
  let mockCrossFeatureLinkRepository: MockCrossFeatureLinkRepository;
  let mockNodeLinkRepository: MockNodeLinkRepository;
  let mockEventPublisher: MockDomainEventPublisher;

  beforeEach(() => {
    // Create real domain service for integration testing
    crossFeatureLinkingService = new CrossFeatureLinkingService();
    
    // Create mock repositories
    mockCrossFeatureLinkRepository = new MockCrossFeatureLinkRepository();
    mockNodeLinkRepository = new MockNodeLinkRepository();
    mockEventPublisher = new MockDomainEventPublisher();

    // Create real use case with mocked repositories
    crossFeatureIntegrationUseCase = new ManageCrossFeatureIntegrationUseCase(
      crossFeatureLinkingService,
      mockCrossFeatureLinkRepository as any,
      mockNodeLinkRepository as any,
      mockEventPublisher as any
    );

    // Create integration service
    integrationService = new CrossFeatureIntegrationService({
      crossFeatureIntegrationUseCase
    });
  });

  afterEach(() => {
    // Clean up state between tests
    mockCrossFeatureLinkRepository.clear();
    mockNodeLinkRepository.clear();
    mockEventPublisher.clear();
  });

  describe('Complete Cross-Feature Integration Workflows', () => {
    it('CompleteWorkflow_CreateLinksCalculateStrengthDetectCycles_IntegratesAllUseCases', async () => {
      // Arrange & Act - Execute complete workflow across all three use cases

      // Step 1: UC-014 - Create multiple cross-feature links forming a cycle
      const link1Result = await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: getTestUUID('model-1'),
        targetId: getTestUUID('kb-1'),
        linkType: LinkType.DOCUMENTS,
        initialStrength: 0.6,
        createdBy: getTestUUID('user-1')
      });

      const link2Result = await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.KNOWLEDGE_BASE,
        targetFeature: FeatureType.SPINDLE,
        sourceId: getTestUUID('kb-1'),
        targetId: getTestUUID('spindle-1'),
        linkType: LinkType.SUPPORTS,
        initialStrength: 0.7,
        createdBy: getTestUUID('user-1')
      });

      const link3Result = await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.SPINDLE,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceId: getTestUUID('spindle-1'),
        targetId: getTestUUID('model-1'),
        linkType: LinkType.IMPLEMENTS,
        initialStrength: 0.5,
        createdBy: getTestUUID('user-1')
      });

      // Step 2: UC-015 - Calculate and update link strengths with evolution tracking
      const strengthResult1 = await integrationService.calculateAndUpdateLinkStrength({
        linkId: link1Result.value.linkId,
        interactionFrequency: 100,
        semanticSimilarity: 0.8,
        contextRelevance: 0.9
      });

      const strengthResult2 = await integrationService.calculateAndUpdateLinkStrength({
        linkId: link2Result.value.linkId,
        interactionFrequency: 50,
        semanticSimilarity: 0.6,
        contextRelevance: 0.7
      });

      // Step 3: UC-016 - Detect cycles in the network
      const cycleResult = await integrationService.detectAndAnalyzeCycles();

      // Step 4: Get comprehensive network metrics
      const metricsResult = await integrationService.getNetworkMetrics();

      // Assert - Verify complete integration
      
      // Verify link creation
      expect(link1Result.isSuccess).toBe(true);
      expect(link2Result.isSuccess).toBe(true);
      expect(link3Result.isSuccess).toBe(true);
      
      expect(link1Result.value.linkStrength).toBe(0.6);
      expect(link2Result.value.linkStrength).toBe(0.7);
      expect(link3Result.value.linkStrength).toBe(0.5);

      // Verify strength calculations with evolution tracking
      expect(strengthResult1.isSuccess).toBe(true);
      expect(strengthResult2.isSuccess).toBe(true);
      
      expect(strengthResult1.value.finalStrength).toBe(1.0); // Capped at maximum
      expect(strengthResult1.value.frequencyBonus).toBe(0.2);
      expect(strengthResult1.value.semanticBonus).toBeCloseTo(0.24); // 0.8 * 0.3
      expect(strengthResult1.value.contextBonus).toBeCloseTo(0.18); // 0.9 * 0.2

      // Verify cycle detection
      expect(cycleResult.isSuccess).toBe(true);
      expect(cycleResult.value.totalCycles).toBe(1);
      expect(cycleResult.value.cycles[0].cycleLength).toBe(3);
      expect(cycleResult.value.cycles[0].linkTypes).toContain(LinkType.DOCUMENTS);
      expect(cycleResult.value.cycles[0].linkTypes).toContain(LinkType.SUPPORTS);
      expect(cycleResult.value.cycles[0].linkTypes).toContain(LinkType.IMPLEMENTS);

      // Verify network metrics integration
      expect(metricsResult.isSuccess).toBe(true);
      expect(metricsResult.value.totalLinks).toBe(3);
      expect(metricsResult.value.networkDensity).toBeGreaterThan(0);
      expect(metricsResult.value.featureConnectivity[FeatureType.FUNCTION_MODEL]).toBeGreaterThan(0);
      expect(metricsResult.value.featureConnectivity[FeatureType.KNOWLEDGE_BASE]).toBeGreaterThan(0);
      expect(metricsResult.value.featureConnectivity[FeatureType.SPINDLE]).toBeGreaterThan(0);

      // Verify event publishing
      const publishedEvents = mockEventPublisher.getPublishedEvents();
      expect(publishedEvents).toHaveLength(3); // One for each link creation

      // Verify repository interactions
      const storedLinks = mockCrossFeatureLinkRepository.getAllLinks();
      expect(storedLinks).toHaveLength(3);
    });

    it('CompleteWorkflow_MultiFeatureNetwork_HandlesComplexTopology', async () => {
      // Arrange & Act - Create complex network across all feature types
      const featureTypes = [FeatureType.FUNCTION_MODEL, FeatureType.KNOWLEDGE_BASE, FeatureType.SPINDLE, FeatureType.EVENT_STORM];
      const linkTypes = [LinkType.DOCUMENTS, LinkType.SUPPORTS, LinkType.IMPLEMENTS, LinkType.TRIGGERS];

      // Create interconnected network
      const createdLinks: string[] = [];
      for (let i = 0; i < featureTypes.length; i++) {
        for (let j = 0; j < featureTypes.length; j++) {
          if (i !== j) {
            const result = await integrationService.createCrossFeatureLink({
              sourceFeature: featureTypes[i],
              targetFeature: featureTypes[j],
              sourceId: getTestUUID(`entity-${i}`),
              targetId: getTestUUID(`entity-${j}`),
              linkType: linkTypes[i % linkTypes.length],
              initialStrength: 0.5 + (i * 0.1),
              createdBy: getTestUUID('user-1')
            });
            
            if (result.isSuccess) {
              createdLinks.push(result.value.linkId);
            }
          }
        }
      }

      // Analyze the network
      const cycleResult = await integrationService.detectAndAnalyzeCycles();
      const metricsResult = await integrationService.getNetworkMetrics();

      // Assert
      expect(createdLinks.length).toBeGreaterThan(4); // Should have created multiple valid links
      expect(cycleResult.isSuccess).toBe(true);
      expect(cycleResult.value.totalCycles).toBeGreaterThan(0); // Should detect cycles in dense network
      
      expect(metricsResult.isSuccess).toBe(true);
      expect(metricsResult.value.totalLinks).toBeGreaterThan(4);
      expect(metricsResult.value.networkDensity).toBeGreaterThan(0.5); // Dense network
    });
  });

  describe('Network Analysis Capabilities with Complex Relationship Graphs', () => {
    it('NetworkAnalysis_ComplexGraph_DetectsMultipleCyclesAndMetrics', async () => {
      // Arrange - Create complex graph with multiple cycles and linear chains
      
      // Cycle 1: A -> B -> C -> A
      await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: getTestUUID('entity-a'),
        targetId: getTestUUID('entity-b'),
        linkType: LinkType.DOCUMENTS,
        createdBy: getTestUUID('user-1')
      });
      await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.KNOWLEDGE_BASE,
        targetFeature: FeatureType.SPINDLE,
        sourceId: getTestUUID('entity-b'),
        targetId: getTestUUID('entity-c'),
        linkType: LinkType.SUPPORTS,
        createdBy: getTestUUID('user-1')
      });
      await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.SPINDLE,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceId: getTestUUID('entity-c'),
        targetId: getTestUUID('entity-a'),
        linkType: LinkType.IMPLEMENTS,
        createdBy: getTestUUID('user-1')
      });

      // Cycle 2: D -> E -> D
      await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: getTestUUID('entity-d'),
        targetId: getTestUUID('entity-e'),
        linkType: LinkType.REFERENCES,
        createdBy: getTestUUID('user-1')
      });
      await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.KNOWLEDGE_BASE,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceId: getTestUUID('entity-e'),
        targetId: getTestUUID('entity-d'),
        linkType: LinkType.SUPPORTS,
        createdBy: getTestUUID('user-1')
      });

      // Linear chain: F -> G -> H (no cycle)
      await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.SPINDLE,
        sourceId: getTestUUID('entity-f'),
        targetId: getTestUUID('entity-g'),
        linkType: LinkType.TRIGGERS,
        createdBy: getTestUUID('user-1')
      });
      await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.SPINDLE,
        targetFeature: FeatureType.EVENT_STORM,
        sourceId: getTestUUID('entity-g'),
        targetId: getTestUUID('entity-h'),
        linkType: LinkType.CONSUMES,
        createdBy: getTestUUID('user-1')
      });

      // Act - Analyze the complex network
      const cycleResult = await integrationService.detectAndAnalyzeCycles();
      const metricsResult = await integrationService.getNetworkMetrics();

      // Assert
      expect(cycleResult.isSuccess).toBe(true);
      expect(cycleResult.value.totalCycles).toBe(2);
      
      // Find cycles by length
      const cycles = cycleResult.value.cycles;
      const threeCycle = cycles.find(c => c.cycleLength === 3);
      const twoCycle = cycles.find(c => c.cycleLength === 2);
      
      expect(threeCycle).toBeDefined();
      expect(twoCycle).toBeDefined();
      expect(cycleResult.value.maxCycleLength).toBe(3);

      // Verify comprehensive metrics
      expect(metricsResult.isSuccess).toBe(true);
      expect(metricsResult.value.totalLinks).toBe(7);
      expect(metricsResult.value.averageLinkStrength).toBeCloseTo(0.5);
      expect(metricsResult.value.networkDensity).toBeGreaterThan(0);
      
      // Verify feature connectivity
      expect(metricsResult.value.featureConnectivity[FeatureType.FUNCTION_MODEL]).toBeGreaterThan(0);
      expect(metricsResult.value.featureConnectivity[FeatureType.KNOWLEDGE_BASE]).toBeGreaterThan(0);
      expect(metricsResult.value.featureConnectivity[FeatureType.SPINDLE]).toBeGreaterThan(0);
      expect(metricsResult.value.featureConnectivity[FeatureType.EVENT_STORM]).toBeGreaterThan(0);
    });
  });

  describe('Link Integrity Maintenance During Feature Modifications', () => {
    it('LinkIntegrity_FeatureDeletion_DetectsAffectedLinksAndRecommendations', async () => {
      // Arrange - Create links involving a specific entity
      const entityToDelete = getTestUUID('model-to-delete');
      
      const link1 = await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: entityToDelete,
        targetId: getTestUUID('kb-1'),
        linkType: LinkType.DOCUMENTS,
        createdBy: getTestUUID('user-1')
      });

      const link2 = await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.SPINDLE,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceId: getTestUUID('spindle-1'),
        targetId: entityToDelete,
        linkType: LinkType.IMPLEMENTS,
        createdBy: getTestUUID('user-1')
      });

      // Create unaffected link
      await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.KNOWLEDGE_BASE,
        targetFeature: FeatureType.SPINDLE,
        sourceId: getTestUUID('kb-2'),
        targetId: getTestUUID('spindle-2'),
        linkType: LinkType.SUPPORTS,
        createdBy: getTestUUID('user-1')
      });

      // Act - Check integrity before deletion
      const integrityResult = await integrationService.checkLinkIntegrity({
        featureType: FeatureType.FUNCTION_MODEL,
        entityId: entityToDelete,
        operation: 'delete'
      });

      // Assert
      expect(integrityResult.isSuccess).toBe(true);
      expect(integrityResult.value.affectedLinks).toHaveLength(2);
      
      const affectedLinks = integrityResult.value.affectedLinks;
      expect(affectedLinks.every(link => link.integrityStatus === 'broken')).toBe(true);
      expect(affectedLinks.every(link => link.actionRequired === 'Remove or redirect link')).toBe(true);
      
      expect(integrityResult.value.integrityScore).toBeLessThan(1.0);
      expect(integrityResult.value.recommendedActions).toContain('Remove or redirect broken links before proceeding');
      expect(integrityResult.value.recommendedActions).toContain('Re-run cycle detection after changes');
    });

    it('LinkIntegrity_FeatureArchival_WeakensLinksAppropriately', async () => {
      // Arrange
      const entityToArchive = getTestUUID('model-to-archive');
      
      await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: entityToArchive,
        targetId: getTestUUID('kb-1'),
        linkType: LinkType.DOCUMENTS,
        createdBy: getTestUUID('user-1')
      });

      // Act
      const integrityResult = await integrationService.checkLinkIntegrity({
        featureType: FeatureType.FUNCTION_MODEL,
        entityId: entityToArchive,
        operation: 'archive'
      });

      // Assert
      expect(integrityResult.isSuccess).toBe(true);
      expect(integrityResult.value.affectedLinks).toHaveLength(1);
      expect(integrityResult.value.affectedLinks[0].integrityStatus).toBe('weakened');
      expect(integrityResult.value.affectedLinks[0].actionRequired).toBe('Consider archiving link');
      expect(integrityResult.value.integrityScore).toBeCloseTo(0.9); // Reduced by 0.1
    });
  });

  describe('Link Strength Evolution Over Time with Interaction Tracking', () => {
    it('LinkStrengthEvolution_MultipleUpdates_TracksHistoryAndTrends', async () => {
      // Arrange - Create link and track evolution over time
      const linkResult = await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: getTestUUID('model-1'),
        targetId: getTestUUID('kb-1'),
        linkType: LinkType.DOCUMENTS,
        initialStrength: 0.3,
        createdBy: getTestUUID('user-1')
      });

      const linkId = linkResult.value.linkId;
      const now = new Date();

      // Act - Multiple strength updates over time
      const update1 = await integrationService.calculateAndUpdateLinkStrength({
        linkId,
        interactionFrequency: 25,
        semanticSimilarity: 0.4,
        contextRelevance: 0.3
      });

      // Simulate time passing
      await new Promise(resolve => setTimeout(resolve, 10));

      const update2 = await integrationService.calculateAndUpdateLinkStrength({
        linkId,
        interactionFrequency: 75,
        semanticSimilarity: 0.7,
        contextRelevance: 0.8
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const update3 = await integrationService.calculateAndUpdateLinkStrength({
        linkId,
        interactionFrequency: 150,
        semanticSimilarity: 0.9,
        contextRelevance: 1.0
      });

      // Get evolution data
      const evolutionResult = await integrationService.getNetworkEvolution({
        fromTimestamp: new Date(now.getTime() - 1000),
        toTimestamp: new Date(now.getTime() + 1000)
      });

      // Assert
      expect(update1.isSuccess).toBe(true);
      expect(update2.isSuccess).toBe(true);
      expect(update3.isSuccess).toBe(true);

      // Verify strength progression
      expect(update1.value.finalStrength).toBeGreaterThan(0.3); // Should be higher than initial
      expect(update2.value.finalStrength).toBeGreaterThan(update1.value.finalStrength); // Should increase
      expect(update3.value.finalStrength).toBe(1.0); // Capped at maximum

      // Verify evolution tracking
      expect(evolutionResult.isSuccess).toBe(true);
      const strengthTrend = evolutionResult.value.strengthTrends.find(t => t.linkId === linkId);
      expect(strengthTrend).toBeDefined();
      expect(strengthTrend!.strengthHistory).toHaveLength(4); // Initial + 3 updates

      // Verify timeline events
      const strengthChangeEvents = evolutionResult.value.timelineEvents.filter(e => 
        e.eventType === 'strength_changed' && e.linkId === linkId
      );
      expect(strengthChangeEvents).toHaveLength(3);
    });

    it('LinkStrengthEvolution_NetworkEvolution_TracksTopologyChanges', async () => {
      // Arrange
      const startTime = new Date();

      // Act - Create links over time
      await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: getTestUUID('model-1'),
        targetId: getTestUUID('kb-1'),
        linkType: LinkType.DOCUMENTS,
        createdBy: getTestUUID('user-1')
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const link2 = await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.KNOWLEDGE_BASE,
        targetFeature: FeatureType.SPINDLE,
        sourceId: getTestUUID('kb-1'),
        targetId: getTestUUID('spindle-1'),
        linkType: LinkType.SUPPORTS,
        createdBy: getTestUUID('user-1')
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // Remove a link
      await integrationService.removeLinkWithIntegrityCheck(link2.value.linkId, getTestUUID('user-1'));

      const endTime = new Date();

      // Get network evolution
      const evolutionResult = await integrationService.getNetworkEvolution({
        fromTimestamp: startTime,
        toTimestamp: endTime
      });

      // Assert
      expect(evolutionResult.isSuccess).toBe(true);
      expect(evolutionResult.value.topologyChanges.linksAdded).toBe(2);
      expect(evolutionResult.value.topologyChanges.linksRemoved).toBe(1);

      // Verify timeline events
      const linkEvents = evolutionResult.value.timelineEvents.filter(e => 
        e.eventType === 'link_created' || e.eventType === 'link_removed'
      );
      expect(linkEvents).toHaveLength(3); // 2 created, 1 removed
    });
  });

  describe('Concurrent Link Operations and Data Consistency', () => {
    it('ConcurrentOperations_BatchLinkOperations_MaintainsConsistency', async () => {
      // Arrange - Prepare batch operations
      const batchId = getTestUUID('batch-1');
      const batchRequest = {
        operations: [
          {
            type: 'create' as const,
            linkData: {
              sourceFeature: FeatureType.FUNCTION_MODEL,
              targetFeature: FeatureType.KNOWLEDGE_BASE,
              sourceId: getTestUUID('model-1'),
              targetId: getTestUUID('kb-1'),
              linkType: LinkType.DOCUMENTS,
              createdBy: getTestUUID('user-1')
            }
          },
          {
            type: 'create' as const,
            linkData: {
              sourceFeature: FeatureType.KNOWLEDGE_BASE,
              targetFeature: FeatureType.SPINDLE,
              sourceId: getTestUUID('kb-1'),
              targetId: getTestUUID('spindle-1'),
              linkType: LinkType.SUPPORTS,
              createdBy: getTestUUID('user-1')
            }
          },
          {
            type: 'create' as const,
            linkData: {
              sourceFeature: FeatureType.SPINDLE,
              targetFeature: FeatureType.FUNCTION_MODEL,
              sourceId: getTestUUID('spindle-1'),
              targetId: getTestUUID('model-1'),
              linkType: LinkType.IMPLEMENTS,
              createdBy: getTestUUID('user-1')
            }
          }
        ],
        batchId,
        requestedBy: getTestUUID('user-1')
      };

      // Act
      const batchResult = await integrationService.executeBatchLinkOperations(batchRequest);

      // Verify network after batch operations
      const metricsResult = await integrationService.getNetworkMetrics();
      const cycleResult = await integrationService.detectAndAnalyzeCycles();

      // Assert
      expect(batchResult.isSuccess).toBe(true);
      expect(batchResult.value.operationsCompleted).toBe(3);
      expect(batchResult.value.operationsTotal).toBe(3);
      expect(batchResult.value.failures).toHaveLength(0);

      expect(metricsResult.isSuccess).toBe(true);
      expect(metricsResult.value.totalLinks).toBe(3);

      expect(cycleResult.isSuccess).toBe(true);
      expect(cycleResult.value.totalCycles).toBe(1);
      expect(cycleResult.value.cycles[0].cycleLength).toBe(3);
    });

    it('ConcurrentOperations_DuplicateBatchIds_PreventsConflicts', async () => {
      // Arrange
      const duplicateBatchId = getTestUUID('duplicate-batch');
      const batchRequest = {
        operations: [{
          type: 'create' as const,
          linkData: {
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.KNOWLEDGE_BASE,
            sourceId: getTestUUID('model-1'),
            targetId: getTestUUID('kb-1'),
            linkType: LinkType.DOCUMENTS,
            createdBy: getTestUUID('user-1')
          }
        }],
        batchId: duplicateBatchId,
        requestedBy: getTestUUID('user-1')
      };

      // Act - Execute same batch operation simultaneously
      const [result1, result2] = await Promise.all([
        integrationService.executeBatchLinkOperations(batchRequest),
        integrationService.executeBatchLinkOperations(batchRequest)
      ]);

      // Assert - One should succeed, one should fail with conflict
      const successResults = [result1, result2].filter(r => r.isSuccess);
      const failureResults = [result1, result2].filter(r => r.isFailure);

      expect(successResults).toHaveLength(1);
      expect(failureResults).toHaveLength(1);
      expect(failureResults[0].error).toContain('already in progress');
    });
  });

  describe('Performance with Large Feature Networks', () => {
    it('Performance_LargeNetwork_CompletesWithinReasonableTime', async () => {
      // Arrange - Create larger network for performance testing
      const networkSize = 50; // Reasonable size for integration test
      const linkPromises: Promise<any>[] = [];

      const startTime = Date.now();

      // Create interconnected network
      for (let i = 0; i < networkSize; i++) {
        const sourceFeature = Object.values(FeatureType)[i % 4];
        const targetFeature = Object.values(FeatureType)[(i + 1) % 4];
        const linkType = Object.values(LinkType)[i % Object.values(LinkType).length];

        linkPromises.push(
          integrationService.createCrossFeatureLink({
            sourceFeature: sourceFeature as FeatureType,
            targetFeature: targetFeature as FeatureType,
            sourceId: getTestUUID(`entity-${i}`),
            targetId: getTestUUID(`entity-${(i + 1) % networkSize}`),
            linkType: linkType as LinkType,
            initialStrength: 0.5 + (i % 10) * 0.05,
            createdBy: getTestUUID('user-1')
          })
        );
      }

      // Act - Execute all operations
      const linkResults = await Promise.all(linkPromises);
      const creationTime = Date.now() - startTime;

      // Test network analysis performance
      const analysisStartTime = Date.now();
      const [metricsResult, cycleResult] = await Promise.all([
        integrationService.getNetworkMetrics(),
        integrationService.detectAndAnalyzeCycles()
      ]);
      const analysisTime = Date.now() - analysisStartTime;

      // Assert
      const successfulLinks = linkResults.filter(r => r.isSuccess);
      expect(successfulLinks.length).toBeGreaterThan(networkSize * 0.3); // At least 30% should succeed due to compatibility restrictions

      expect(metricsResult.isSuccess).toBe(true);
      expect(metricsResult.value.totalLinks).toBeGreaterThan(networkSize * 0.3);

      expect(cycleResult.isSuccess).toBe(true);

      // Performance assertions
      expect(creationTime).toBeLessThan(5000); // Link creation should complete within 5 seconds
      expect(analysisTime).toBeLessThan(2000); // Network analysis should complete within 2 seconds

      console.log(`Performance Test Results:
        - Network Size: ${successfulLinks.length} links
        - Creation Time: ${creationTime}ms
        - Analysis Time: ${analysisTime}ms
        - Cycles Detected: ${cycleResult.value.totalCycles}
        - Network Density: ${metricsResult.value.networkDensity.toFixed(3)}
      `);
    });

    it('Performance_StrengthCalculations_ScalesWithNetworkSize', async () => {
      // Arrange - Create network and measure strength calculation performance
      const networkSize = 20;
      const linkIds: string[] = [];

      // Create links
      for (let i = 0; i < networkSize; i++) {
        const result = await integrationService.createCrossFeatureLink({
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: getTestUUID(`model-${i}`),
          targetId: getTestUUID(`kb-${i}`),
          linkType: LinkType.DOCUMENTS,
          createdBy: getTestUUID('user-1')
        });

        if (result.isSuccess) {
          linkIds.push(result.value.linkId);
        }
      }

      // Act - Measure strength calculation performance
      const strengthStartTime = Date.now();
      const strengthPromises = linkIds.map(linkId =>
        integrationService.calculateAndUpdateLinkStrength({
          linkId,
          interactionFrequency: 75,
          semanticSimilarity: 0.7,
          contextRelevance: 0.6
        })
      );

      const strengthResults = await Promise.all(strengthPromises);
      const strengthTime = Date.now() - strengthStartTime;

      // Assert
      expect(strengthResults.every(r => r.isSuccess)).toBe(true);
      expect(strengthTime).toBeLessThan(3000); // Should complete within 3 seconds

      // Verify all strengths were updated
      const metricsResult = await integrationService.getNetworkMetrics();
      expect(metricsResult.isSuccess).toBe(true);
      expect(metricsResult.value.averageLinkStrength).toBeGreaterThan(0.5);
    });
  });

  describe('Error Handling and Recovery Patterns', () => {
    it('ErrorHandling_RepositoryFailures_HandlesGracefully', async () => {
      // Arrange - Mock repository failure
      const originalSave = mockCrossFeatureLinkRepository.save;
      mockCrossFeatureLinkRepository.save = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: getTestUUID('model-1'),
        targetId: getTestUUID('kb-1'),
        linkType: LinkType.DOCUMENTS,
        createdBy: getTestUUID('user-1')
      });

      // Restore original method
      mockCrossFeatureLinkRepository.save = originalSave;

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database connection failed');
    });

    it('ErrorHandling_BatchOperationFailures_ReportsDetailedErrors', async () => {
      // Arrange - Batch with mix of valid and invalid operations
      const batchRequest = {
        operations: [
          {
            type: 'create' as const,
            linkData: {
              sourceFeature: FeatureType.FUNCTION_MODEL,
              targetFeature: FeatureType.KNOWLEDGE_BASE,
              sourceId: getTestUUID('model-1'),
              targetId: getTestUUID('kb-1'),
              linkType: LinkType.DOCUMENTS,
              createdBy: getTestUUID('user-1')
            }
          },
          {
            type: 'updateStrength' as const,
            strengthData: {
              linkId: 'nonexistent-link-id',
              interactionFrequency: 50,
              semanticSimilarity: 0.5,
              contextRelevance: 0.5
            }
          },
          {
            type: 'create' as const,
            linkData: {
              sourceFeature: FeatureType.FUNCTION_MODEL,
              targetFeature: FeatureType.KNOWLEDGE_BASE,
              sourceId: '', // Invalid empty source
              targetId: getTestUUID('kb-2'),
              linkType: LinkType.DOCUMENTS,
              createdBy: getTestUUID('user-1')
            }
          }
        ],
        batchId: getTestUUID('error-batch'),
        requestedBy: getTestUUID('user-1')
      };

      // Act
      const batchResult = await integrationService.executeBatchLinkOperations(batchRequest);

      // Assert
      expect(batchResult.isSuccess).toBe(true); // Batch operation itself succeeds
      expect(batchResult.value.operationsCompleted).toBe(1); // Only first operation should succeed
      expect(batchResult.value.failures).toHaveLength(2); // Two operations should fail
      
      expect(batchResult.value.failures[0].operationIndex).toBe(1);
      expect(batchResult.value.failures[1].operationIndex).toBe(2);
      expect(batchResult.value.failures[1].error).toContain('Missing required fields');
    });
  });

  describe('Real Integration Scenarios', () => {
    it('RealIntegration_CompleteFeatureLifecycle_MaintainsLinkIntegrity', async () => {
      // Arrange - Simulate complete feature lifecycle with cross-feature links
      const modelId = getTestUUID('lifecycle-model');
      const kbId = getTestUUID('lifecycle-kb');
      const spindleId = getTestUUID('lifecycle-spindle');

      // Step 1: Create initial links
      const link1 = await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: modelId,
        targetId: kbId,
        linkType: LinkType.DOCUMENTS,
        initialStrength: 0.6,
        createdBy: getTestUUID('user-1')
      });

      const link2 = await integrationService.createCrossFeatureLink({
        sourceFeature: FeatureType.KNOWLEDGE_BASE,
        targetFeature: FeatureType.SPINDLE,
        sourceId: kbId,
        targetId: spindleId,
        linkType: LinkType.SUPPORTS,
        initialStrength: 0.7,
        createdBy: getTestUUID('user-1')
      });

      // Step 2: Evolve link strengths through usage
      await integrationService.calculateAndUpdateLinkStrength({
        linkId: link1.value.linkId,
        interactionFrequency: 100,
        semanticSimilarity: 0.8,
        contextRelevance: 0.9
      });

      // Step 3: Check integrity before feature modification
      const integrityCheck = await integrationService.checkLinkIntegrity({
        featureType: FeatureType.KNOWLEDGE_BASE,
        entityId: kbId,
        operation: 'update'
      });

      // Step 4: Analyze network topology
      const networkAnalysis = await integrationService.getNetworkMetrics();
      const cycleAnalysis = await integrationService.detectAndAnalyzeCycles();

      // Step 5: Get evolution history
      const evolution = await integrationService.getNetworkEvolution({
        fromTimestamp: new Date(Date.now() - 60000), // Last minute
        toTimestamp: new Date()
      });

      // Assert - Comprehensive validation
      expect(link1.isSuccess).toBe(true);
      expect(link2.isSuccess).toBe(true);

      expect(integrityCheck.isSuccess).toBe(true);
      expect(integrityCheck.value.affectedLinks).toHaveLength(2);
      expect(integrityCheck.value.integrityScore).toBeLessThan(1.0);

      expect(networkAnalysis.isSuccess).toBe(true);
      expect(networkAnalysis.value.totalLinks).toBe(2);
      expect(networkAnalysis.value.featureConnectivity[FeatureType.KNOWLEDGE_BASE]).toBe(2);

      expect(cycleAnalysis.isSuccess).toBe(true);
      expect(cycleAnalysis.value.totalCycles).toBe(0); // No cycles in this linear setup

      expect(evolution.isSuccess).toBe(true);
      expect(evolution.value.timelineEvents.length).toBeGreaterThan(0);
      expect(evolution.value.strengthTrends.length).toBeGreaterThan(0);
      expect(evolution.value.topologyChanges.linksAdded).toBe(2);
    });
  });
});