import { 
  CrossFeatureLinkingService, 
  LinkValidationResult, 
  LinkStrengthCalculation, 
  RelationshipCycle 
} from '@/lib/domain/services/cross-feature-linking-service';
import { NodeLink } from '@/lib/domain/entities/node-link';
import { CrossFeatureLink } from '@/lib/domain/entities/cross-feature-link';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { FeatureType, LinkType } from '@/lib/domain/enums';
import { Result } from '@/lib/domain/shared/result';

// Mock CrossFeatureLink implementation for testing
class MockCrossFeatureLink extends CrossFeatureLink {
  public static createMock(
    sourceFeature: FeatureType,
    targetFeature: FeatureType,
    sourceId: string,
    targetId: string,
    linkType: LinkType = LinkType.REFERENCES,
    linkStrength: number = 0.5
  ): Result<MockCrossFeatureLink> {
    const linkId = NodeId.generate();
    
    const mockLink = new MockCrossFeatureLink({
      linkId,
      sourceFeature,
      targetFeature,
      sourceId,
      targetId,
      linkType,
      linkStrength,
      nodeContext: {},
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return Result.ok(mockLink);
  }

  public updateLinkStrength(newStrength: number): Result<void> {
    // Use parent class method which properly updates props
    return super.updateLinkStrength(newStrength);
  }
}

// Mock NodeLink implementation for testing
class MockNodeLink extends NodeLink {
  public static createMock(
    sourceFeature: FeatureType,
    targetFeature: FeatureType,
    sourceEntityId: string,
    targetEntityId: string,
    sourceNodeId: NodeId,
    targetNodeId: NodeId,
    linkType: LinkType = LinkType.REFERENCES,
    linkStrength: number = 0.5
  ): Result<MockNodeLink> {
    const linkId = NodeId.generate();
    
    const mockLink = new MockNodeLink({
      linkId,
      sourceFeature,
      targetFeature,
      sourceEntityId,
      targetEntityId,
      sourceNodeId,
      targetNodeId,
      linkType,
      linkStrength,
      linkContext: {},
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return Result.ok(mockLink);
  }

  public updateLinkStrength(newStrength: number): Result<void> {
    // Use parent class method which properly updates props
    return super.updateLinkStrength(newStrength);
  }
}

describe('CrossFeatureLinkingService', () => {
  let service: CrossFeatureLinkingService;

  beforeEach(() => {
    service = new CrossFeatureLinkingService();
    
    // Mock the static create methods
    jest.spyOn(CrossFeatureLink, 'create').mockImplementation((params: any) => {
      return MockCrossFeatureLink.createMock(
        params.sourceFeature,
        params.targetFeature,
        params.sourceId,
        params.targetId,
        params.linkType,
        params.linkStrength
      );
    });

    jest.spyOn(NodeLink, 'create').mockImplementation((params: any) => {
      return MockNodeLink.createMock(
        params.sourceFeature,
        params.targetFeature,
        params.sourceEntityId,
        params.targetEntityId,
        params.sourceNodeId,
        params.targetNodeId,
        params.linkType,
        params.linkStrength
      );
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Cross-Feature Link Creation', () => {
    it('should create a cross-feature link successfully', () => {
      // Arrange
      const sourceFeature = FeatureType.FUNCTION_MODEL;
      const targetFeature = FeatureType.KNOWLEDGE_BASE;
      const sourceId = 'func-model-1';
      const targetId = 'kb-doc-1';
      const linkType = LinkType.DOCUMENTS;

      // Act
      const result = service.createCrossFeatureLink(
        sourceFeature,
        targetFeature,
        sourceId,
        targetId,
        linkType
      );

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value.sourceFeature).toBe(sourceFeature);
      expect(result.value.targetFeature).toBe(targetFeature);
      expect(result.value.linkType).toBe(linkType);
    });

    it('should reject invalid link types for feature combinations', () => {
      // Arrange
      const sourceFeature = FeatureType.FUNCTION_MODEL;
      const targetFeature = FeatureType.KNOWLEDGE_BASE;
      const sourceId = 'func-model-1';
      const targetId = 'kb-doc-1';
      const linkType = LinkType.IMPLEMENTS; // Invalid for this combination

      // Act
      const result = service.createCrossFeatureLink(
        sourceFeature,
        targetFeature,
        sourceId,
        targetId,
        linkType
      );

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('not allowed between');
    });

    it('should prevent duplicate link creation', () => {
      // Arrange
      const sourceFeature = FeatureType.FUNCTION_MODEL;
      const targetFeature = FeatureType.KNOWLEDGE_BASE;
      const sourceId = 'func-model-1';
      const targetId = 'kb-doc-1';
      const linkType = LinkType.DOCUMENTS;

      // Act
      const firstResult = service.createCrossFeatureLink(
        sourceFeature,
        targetFeature,
        sourceId,
        targetId,
        linkType
      );
      const secondResult = service.createCrossFeatureLink(
        sourceFeature,
        targetFeature,
        sourceId,
        targetId,
        linkType
      );

      // Assert
      expect(firstResult.isSuccess).toBe(true);
      expect(secondResult.isSuccess).toBe(false);
      expect(secondResult.error).toContain('Link already exists');
    });

    it('should set custom initial strength', () => {
      // Arrange
      const sourceFeature = FeatureType.FUNCTION_MODEL;
      const targetFeature = FeatureType.KNOWLEDGE_BASE;
      const sourceId = 'func-model-1';
      const targetId = 'kb-doc-1';
      const linkType = LinkType.DOCUMENTS;
      const customStrength = 0.8;

      // Act
      const result = service.createCrossFeatureLink(
        sourceFeature,
        targetFeature,
        sourceId,
        targetId,
        linkType,
        customStrength
      );

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.linkStrength).toBe(customStrength);
    });
  });

  describe('Node Link Creation', () => {
    it('should create a node link successfully', () => {
      // Arrange
      const sourceFeature = FeatureType.FUNCTION_MODEL;
      const targetFeature = FeatureType.ACTION_NODE;
      const sourceEntityId = 'entity-1';
      const targetEntityId = 'entity-2';
      const sourceNodeId = NodeId.generate();
      const targetNodeId = NodeId.generate();
      const linkType = LinkType.TRIGGERS;

      // Act
      const result = service.createNodeLink(
        sourceFeature,
        targetFeature,
        sourceEntityId,
        targetEntityId,
        sourceNodeId,
        targetNodeId,
        linkType
      );

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value.sourceFeature).toBe(sourceFeature);
      expect(result.value.targetFeature).toBe(targetFeature);
      expect(result.value.linkType).toBe(linkType);
    });

    it('should set custom initial strength for node links', () => {
      // Arrange
      const sourceFeature = FeatureType.FUNCTION_MODEL;
      const targetFeature = FeatureType.ACTION_NODE;
      const sourceEntityId = 'entity-1';
      const targetEntityId = 'entity-2';
      const sourceNodeId = NodeId.generate();
      const targetNodeId = NodeId.generate();
      const linkType = LinkType.TRIGGERS;
      const customStrength = 0.7;

      // Act
      const result = service.createNodeLink(
        sourceFeature,
        targetFeature,
        sourceEntityId,
        targetEntityId,
        sourceNodeId,
        targetNodeId,
        linkType,
        customStrength
      );

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.linkStrength).toBe(customStrength);
    });
  });

  describe('Link Strength Calculation', () => {
    let testLinkId: NodeId;

    beforeEach(() => {
      const link = service.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        'func-1',
        'kb-1',
        LinkType.DOCUMENTS,
        0.3
      );
      testLinkId = link.value.linkId;
    });

    it('should calculate link strength correctly', () => {
      // Arrange
      const interactionFrequency = 50; // Should give 0.1 bonus
      const semanticSimilarity = 0.8; // Should give 0.24 bonus
      const contextRelevance = 0.6; // Should give 0.12 bonus

      // Act
      const result = service.calculateLinkStrength(
        testLinkId,
        interactionFrequency,
        semanticSimilarity,
        contextRelevance
      );

      // Assert
      expect(result.isSuccess).toBe(true);
      const calculation = result.value;
      expect(calculation.baseStrength).toBe(0.3);
      expect(calculation.frequencyBonus).toBe(0.1);
      expect(calculation.semanticBonus).toBe(0.24);
      expect(calculation.contextBonus).toBe(0.12);
      expect(calculation.finalStrength).toBe(0.76);
    });

    it('should cap frequency bonus at 0.2', () => {
      // Arrange
      const interactionFrequency = 200; // Should cap at 0.2
      const semanticSimilarity = 0;
      const contextRelevance = 0;

      // Act
      const result = service.calculateLinkStrength(
        testLinkId,
        interactionFrequency,
        semanticSimilarity,
        contextRelevance
      );

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.frequencyBonus).toBe(0.2);
    });

    it('should cap semantic bonus at 0.3', () => {
      // Arrange
      const interactionFrequency = 0;
      const semanticSimilarity = 2.0; // Should cap at 0.3
      const contextRelevance = 0;

      // Act
      const result = service.calculateLinkStrength(
        testLinkId,
        interactionFrequency,
        semanticSimilarity,
        contextRelevance
      );

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.semanticBonus).toBe(0.3);
    });

    it('should cap final strength at 1.0', () => {
      // Arrange
      const interactionFrequency = 200;
      const semanticSimilarity = 2.0;
      const contextRelevance = 2.0;

      // Act
      const result = service.calculateLinkStrength(
        testLinkId,
        interactionFrequency,
        semanticSimilarity,
        contextRelevance
      );

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.finalStrength).toBe(1.0);
    });

    it('should fail for non-existent link', () => {
      // Arrange
      const nonExistentLinkId = NodeId.generate();

      // Act
      const result = service.calculateLinkStrength(
        nonExistentLinkId,
        50,
        0.8,
        0.6
      );

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Link not found');
    });
  });

  describe('Relationship Cycle Detection', () => {
    beforeEach(() => {
      // Create a potential cycle: A -> B -> C -> A
      service.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        'A',
        'B',
        LinkType.DOCUMENTS
      );
      service.createCrossFeatureLink(
        FeatureType.KNOWLEDGE_BASE,
        FeatureType.SPINDLE,
        'B',
        'C',
        LinkType.SUPPORTS
      );
      service.createCrossFeatureLink(
        FeatureType.SPINDLE,
        FeatureType.FUNCTION_MODEL,
        'C',
        'A',
        LinkType.IMPLEMENTS
      );
    });

    it('should detect relationship cycles', () => {
      // Act
      const result = service.detectRelationshipCycles();

      // Assert
      expect(result.isSuccess).toBe(true);
      const cycles = result.value;
      expect(cycles.length).toBeGreaterThan(0);
      
      const cycle = cycles[0];
      expect(cycle.cycleLength).toBeGreaterThan(0);
      expect(cycle.cycleNodes.length).toBe(cycle.cycleLength);
      expect(cycle.linkTypes.length).toBeGreaterThan(0);
    });

    it('should handle networks without cycles', () => {
      // Arrange - Create new service with no cycles
      const noCycleService = new CrossFeatureLinkingService();
      
      // Mock the static create method for this instance
      jest.spyOn(CrossFeatureLink, 'create').mockImplementation((params: any) => {
        return MockCrossFeatureLink.createMock(
          params.sourceFeature,
          params.targetFeature,
          params.sourceId,
          params.targetId,
          params.linkType,
          params.linkStrength
        );
      });

      noCycleService.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        'A',
        'B',
        LinkType.DOCUMENTS
      );
      noCycleService.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.SPINDLE,
        'A',
        'C',
        LinkType.IMPLEMENTS
      );

      // Act
      const result = noCycleService.detectRelationshipCycles();

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.length).toBe(0);
    });
  });

  describe('Link Constraint Validation', () => {
    it('should validate allowed link types between features', () => {
      // Arrange
      const sourceFeature = FeatureType.FUNCTION_MODEL;
      const targetFeature = FeatureType.KNOWLEDGE_BASE;
      const linkType = LinkType.DOCUMENTS; // Allowed

      // Act
      const result = service.validateLinkConstraints(sourceFeature, targetFeature, linkType);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(true);
      expect(result.value.errors.length).toBe(0);
    });

    it('should reject disallowed link types', () => {
      // Arrange
      const sourceFeature = FeatureType.FUNCTION_MODEL;
      const targetFeature = FeatureType.KNOWLEDGE_BASE;
      const linkType = LinkType.IMPLEMENTS; // Not allowed

      // Act
      const result = service.validateLinkConstraints(sourceFeature, targetFeature, linkType);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors.length).toBeGreaterThan(0);
    });

    it('should generate warnings for excessive connections', () => {
      // Arrange - Create many connections for one feature
      const sourceFeature = FeatureType.FUNCTION_MODEL;
      for (let i = 0; i < 12; i++) {
        service.createCrossFeatureLink(
          sourceFeature,
          FeatureType.KNOWLEDGE_BASE,
          'func-1',
          `kb-${i}`,
          LinkType.DOCUMENTS
        );
      }

      // Act
      const result = service.validateLinkConstraints(
        sourceFeature,
        FeatureType.KNOWLEDGE_BASE,
        LinkType.DOCUMENTS
      );

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.warnings.length).toBeGreaterThan(0);
      expect(result.value.warnings.some(w => w.includes('many connections'))).toBe(true);
    });

    it('should warn about trigger performance issues', () => {
      // Arrange - Create multiple trigger connections
      const sourceFeature = FeatureType.FUNCTION_MODEL;
      for (let i = 0; i < 6; i++) {
        service.createCrossFeatureLink(
          sourceFeature,
          FeatureType.SPINDLE,
          'func-1',
          `spindle-${i}`,
          LinkType.TRIGGERS
        );
      }

      // Act
      const result = service.validateLinkConstraints(
        sourceFeature,
        FeatureType.SPINDLE,
        LinkType.TRIGGERS
      );

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.warnings.some(w => w.includes('trigger relationships'))).toBe(true);
    });
  });

  describe('Feature Link Queries', () => {
    beforeEach(() => {
      // Create test links
      service.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        'func-1',
        'kb-1',
        LinkType.DOCUMENTS
      );
      service.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.SPINDLE,
        'func-1',
        'spindle-1',
        LinkType.IMPLEMENTS
      );
      service.createNodeLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.ACTION_NODE,
        'entity-1',
        'entity-2',
        NodeId.generate(),
        NodeId.generate(),
        LinkType.TRIGGERS
      );
    });

    it('should get all links for a feature', () => {
      // Act
      const links = service.getFeatureLinks(FeatureType.FUNCTION_MODEL);

      // Assert
      expect(links.length).toBe(3);
      expect(links.every(link => 
        link.sourceFeature === FeatureType.FUNCTION_MODEL || 
        link.targetFeature === FeatureType.FUNCTION_MODEL
      )).toBe(true);
    });

    it('should get links by type', () => {
      // Act
      const triggerLinks = service.getLinksByType(LinkType.TRIGGERS);

      // Assert
      expect(triggerLinks.length).toBe(1);
      expect(triggerLinks[0].linkType).toBe(LinkType.TRIGGERS);
    });

    it('should return empty array for feature with no links', () => {
      // Act
      const links = service.getFeatureLinks(FeatureType.EVENT_STORM);

      // Assert
      expect(links.length).toBe(0);
    });
  });

  describe('Network Metrics', () => {
    beforeEach(() => {
      // Create test network
      service.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        'func-1',
        'kb-1',
        LinkType.DOCUMENTS,
        0.8
      );
      service.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.SPINDLE,
        'func-1',
        'spindle-1',
        LinkType.IMPLEMENTS,
        0.6
      );
      service.createCrossFeatureLink(
        FeatureType.KNOWLEDGE_BASE,
        FeatureType.SPINDLE,
        'kb-1',
        'spindle-1',
        LinkType.SUPPORTS,
        0.4
      );
    });

    it('should calculate network metrics correctly', () => {
      // Act
      const metrics = service.calculateNetworkMetrics();

      // Assert
      expect(metrics.totalLinks).toBe(3);
      expect(metrics.averageLinkStrength).toBe(0.6); // (0.8 + 0.6 + 0.4) / 3
      expect(metrics.strongestConnection).toBe(0.8);
      expect(metrics.weakestConnection).toBe(0.4);
      expect(metrics.featureConnectivity).toBeDefined();
    });

    it('should handle empty network', () => {
      // Arrange
      const emptyService = new CrossFeatureLinkingService();

      // Act
      const metrics = emptyService.calculateNetworkMetrics();

      // Assert
      expect(metrics.totalLinks).toBe(0);
      expect(metrics.averageLinkStrength).toBe(0);
      expect(metrics.strongestConnection).toBe(0);
      expect(metrics.weakestConnection).toBe(0);
    });

    it('should calculate feature connectivity', () => {
      // Act
      const metrics = service.calculateNetworkMetrics();

      // Assert
      expect(metrics.featureConnectivity[FeatureType.FUNCTION_MODEL]).toBe(2);
      expect(metrics.featureConnectivity[FeatureType.KNOWLEDGE_BASE]).toBe(2);
      expect(metrics.featureConnectivity[FeatureType.SPINDLE]).toBe(2);
      expect(metrics.featureConnectivity[FeatureType.EVENT_STORM]).toBe(0);
    });
  });

  describe('Link Removal', () => {
    let testLinkId: NodeId;

    beforeEach(() => {
      const link = service.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        'func-1',
        'kb-1',
        LinkType.DOCUMENTS
      );
      testLinkId = link.value.linkId;
    });

    it('should remove link successfully', () => {
      // Act
      const result = service.removeLink(testLinkId);

      // Assert
      expect(result.isSuccess).toBe(true);
      
      // Verify link is removed
      const metrics = service.calculateNetworkMetrics();
      expect(metrics.totalLinks).toBe(0);
    });

    it('should fail to remove non-existent link', () => {
      // Arrange
      const nonExistentLinkId = NodeId.generate();

      // Act
      const result = service.removeLink(nonExistentLinkId);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Link not found');
    });

    it('should update feature connections after removal', () => {
      // Arrange - Create a fresh service for this test to avoid interference from other tests
      const freshService = new CrossFeatureLinkingService();
      
      // Mock the static create methods for the fresh service
      jest.spyOn(CrossFeatureLink, 'create').mockImplementation((params: any) => {
        return MockCrossFeatureLink.createMock(
          params.sourceFeature,
          params.targetFeature,
          params.sourceId,
          params.targetId,
          params.linkType,
          params.linkStrength
        );
      });
      
      // Create a link in the fresh service
      const freshLink = freshService.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        'func-test',
        'kb-test',
        LinkType.DOCUMENTS
      );
      const freshTestLinkId = freshLink.value.linkId;
      
      const metricsBefore = freshService.calculateNetworkMetrics();
      expect(metricsBefore.featureConnectivity[FeatureType.FUNCTION_MODEL]).toBe(1);

      // Act
      freshService.removeLink(freshTestLinkId);

      // Assert
      const metricsAfter = freshService.calculateNetworkMetrics();
      // After removing the last link for FUNCTION_MODEL, it should either be 0 or not present in the map
      expect(metricsAfter.featureConnectivity[FeatureType.FUNCTION_MODEL] || 0).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle bidirectional feature compatibility', () => {
      // Test both directions of a valid feature pair
      
      // Act & Assert - Forward direction
      const result1 = service.validateLinkConstraints(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        LinkType.DOCUMENTS
      );
      expect(result1.isSuccess).toBe(true);
      expect(result1.value.isValid).toBe(true);

      // Act & Assert - Reverse direction
      const result2 = service.validateLinkConstraints(
        FeatureType.KNOWLEDGE_BASE,
        FeatureType.FUNCTION_MODEL,
        LinkType.DOCUMENTS
      );
      expect(result2.isSuccess).toBe(true);
      expect(result2.value.isValid).toBe(true);
    });

    it('should handle unknown feature combinations gracefully', () => {
      // Arrange - Mock a custom feature type that's not in compatibility rules
      const customFeature = 'CUSTOM_FEATURE' as FeatureType;

      // Act
      const result = service.validateLinkConstraints(
        customFeature,
        FeatureType.FUNCTION_MODEL,
        LinkType.REFERENCES
      );

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(true); // Should allow unknown combinations
    });

    it('should handle strength calculation with zero values', () => {
      // Arrange
      const link = service.createCrossFeatureLink(
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        'func-1',
        'kb-1',
        LinkType.DOCUMENTS,
        0.0
      );

      // Act
      const result = service.calculateLinkStrength(
        link.value.linkId,
        0, // No interactions
        0, // No semantic similarity
        0  // No context relevance
      );

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.finalStrength).toBe(0.0);
    });

    it('should handle large networks efficiently', () => {
      // Arrange - Create a large network
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        service.createCrossFeatureLink(
          FeatureType.FUNCTION_MODEL,
          FeatureType.KNOWLEDGE_BASE,
          `func-${i}`,
          `kb-${i}`,
          LinkType.DOCUMENTS
        );
      }

      // Act
      const metrics = service.calculateNetworkMetrics();
      const cycles = service.detectRelationshipCycles();
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Assert
      expect(metrics.totalLinks).toBe(100);
      expect(cycles.isSuccess).toBe(true);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});