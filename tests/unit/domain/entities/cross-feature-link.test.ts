import { CrossFeatureLink } from '@/lib/domain/entities/cross-feature-link';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { FeatureType, LinkType } from '@/lib/domain/enums';
import { Result } from '@/lib/domain/shared/result';

describe('CrossFeatureLink', () => {
  const validLinkId = NodeId.create('123e4567-e89b-42d3-a456-426614174000').value;

  const createValidCrossFeatureLinkProps = (overrides: any = {}) => ({
    linkId: validLinkId,
    sourceFeature: FeatureType.FUNCTION_MODEL,
    targetFeature: FeatureType.KNOWLEDGE_BASE,
    sourceId: 'source-entity-123',
    targetId: 'target-entity-456',
    linkType: LinkType.REFERENCES,
    linkStrength: 0.5,
    ...overrides
  });

  describe('Factory Creation', () => {
    it('should create cross-feature link with valid properties', () => {
      const props = createValidCrossFeatureLinkProps();
      const result = CrossFeatureLink.create(props);
      
      expect(result.isSuccess).toBe(true);
      const crossFeatureLink = result.value;
      expect(crossFeatureLink.linkId).toBe(validLinkId);
      expect(crossFeatureLink.sourceFeature).toBe(FeatureType.FUNCTION_MODEL);
      expect(crossFeatureLink.targetFeature).toBe(FeatureType.KNOWLEDGE_BASE);
    });

    it('should create link without node context', () => {
      const props = createValidCrossFeatureLinkProps();
      const result = CrossFeatureLink.create(props);
      
      expect(result.isSuccess).toBe(true);
      const crossFeatureLink = result.value;
      expect(crossFeatureLink.hasNodeContext()).toBe(false);
      expect(crossFeatureLink.nodeContext).toBeUndefined();
    });

    it('should create link with node context', () => {
      const nodeContext = { nodeId: 'node-123', nodeType: 'action' };
      const props = createValidCrossFeatureLinkProps({ nodeContext });
      const result = CrossFeatureLink.create(props);
      
      expect(result.isSuccess).toBe(true);
      const crossFeatureLink = result.value;
      expect(crossFeatureLink.hasNodeContext()).toBe(true);
      expect(crossFeatureLink.nodeContext).toEqual(nodeContext);
    });

    it('should set creation and update timestamps', () => {
      const props = createValidCrossFeatureLinkProps();
      const beforeCreation = new Date();
      const result = CrossFeatureLink.create(props);
      const afterCreation = new Date();
      
      expect(result.isSuccess).toBe(true);
      const crossFeatureLink = result.value;
      expect(crossFeatureLink.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(crossFeatureLink.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
      expect(crossFeatureLink.updatedAt.getTime()).toEqual(crossFeatureLink.createdAt.getTime());
    });
  });

  describe('Property Access', () => {
    let crossFeatureLink: CrossFeatureLink;

    beforeEach(() => {
      const nodeContext = { nodeId: 'node-123', nodeType: 'action', metadata: { key: 'value' } };
      const props = createValidCrossFeatureLinkProps({ nodeContext });
      crossFeatureLink = CrossFeatureLink.create(props).value;
    });

    it('should provide access to all properties', () => {
      expect(crossFeatureLink.linkId).toBe(validLinkId);
      expect(crossFeatureLink.sourceFeature).toBe(FeatureType.FUNCTION_MODEL);
      expect(crossFeatureLink.targetFeature).toBe(FeatureType.KNOWLEDGE_BASE);
      expect(crossFeatureLink.sourceId).toBe('source-entity-123');
      expect(crossFeatureLink.targetId).toBe('target-entity-456');
      expect(crossFeatureLink.linkType).toBe(LinkType.REFERENCES);
      expect(crossFeatureLink.linkStrength).toBe(0.5);
    });

    it('should provide readonly access to node context', () => {
      const context = crossFeatureLink.nodeContext!;
      expect(context).toEqual({ nodeId: 'node-123', nodeType: 'action', metadata: { key: 'value' } });
      
      // Should be a defensive copy
      context.nodeId = 'modified';
      expect(crossFeatureLink.nodeContext).toEqual({ nodeId: 'node-123', nodeType: 'action', metadata: { key: 'value' } });
    });

    it('should return undefined for missing node context', () => {
      const props = createValidCrossFeatureLinkProps();
      const linkWithoutContext = CrossFeatureLink.create(props).value;
      expect(linkWithoutContext.nodeContext).toBeUndefined();
    });
  });

  describe('Link Strength Management', () => {
    let crossFeatureLink: CrossFeatureLink;

    beforeEach(() => {
      const props = createValidCrossFeatureLinkProps();
      crossFeatureLink = CrossFeatureLink.create(props).value;
    });

    it('should update link strength successfully', async () => {
      const initialUpdatedAt = crossFeatureLink.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const result = crossFeatureLink.updateLinkStrength(0.8);
      
      expect(result.isSuccess).toBe(true);
      expect(crossFeatureLink.linkStrength).toBe(0.8);
      expect(crossFeatureLink.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should allow minimum link strength (0.0)', () => {
      const result = crossFeatureLink.updateLinkStrength(0.0);
      expect(result.isSuccess).toBe(true);
      expect(crossFeatureLink.linkStrength).toBe(0.0);
    });

    it('should allow maximum link strength (1.0)', () => {
      const result = crossFeatureLink.updateLinkStrength(1.0);
      expect(result.isSuccess).toBe(true);
      expect(crossFeatureLink.linkStrength).toBe(1.0);
    });

    it('should reject negative link strength', () => {
      const result = crossFeatureLink.updateLinkStrength(-0.1);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Link strength must be between 0.0 and 1.0');
    });

    it('should reject link strength greater than 1.0', () => {
      const result = crossFeatureLink.updateLinkStrength(1.1);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Link strength must be between 0.0 and 1.0');
    });
  });

  describe('Node Context Management', () => {
    let crossFeatureLink: CrossFeatureLink;

    beforeEach(() => {
      const props = createValidCrossFeatureLinkProps();
      crossFeatureLink = CrossFeatureLink.create(props).value;
    });

    it('should update node context successfully', async () => {
      const initialUpdatedAt = crossFeatureLink.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const newContext = { nodeId: 'new-node-456', nodeType: 'container', priority: 'high' };
      const result = crossFeatureLink.updateNodeContext(newContext);
      
      expect(result.isSuccess).toBe(true);
      expect(crossFeatureLink.nodeContext).toEqual(newContext);
      expect(crossFeatureLink.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should allow setting context to undefined', async () => {
      // First set a context
      crossFeatureLink.updateNodeContext({ nodeId: 'node-123', nodeType: 'action' });
      expect(crossFeatureLink.hasNodeContext()).toBe(true);
      
      const initialUpdatedAt = crossFeatureLink.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Then remove it
      const result = crossFeatureLink.updateNodeContext(undefined);
      
      expect(result.isSuccess).toBe(true);
      expect(crossFeatureLink.nodeContext).toBeUndefined();
      expect(crossFeatureLink.hasNodeContext()).toBe(false);
      expect(crossFeatureLink.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should create defensive copy of context', () => {
      const originalContext = { nodeId: 'node-123', nodeType: 'action', nested: { prop: 123 } };
      crossFeatureLink.updateNodeContext(originalContext);
      
      // Modify original object
      originalContext.nodeId = 'modified';
      originalContext.nested.prop = 456;
      
      // CrossFeatureLink should maintain original values (shallow copy)
      expect(crossFeatureLink.nodeContext!.nodeId).toBe('node-123');
      expect(crossFeatureLink.nodeContext!.nested.prop).toBe(456); // Nested objects are referenced
    });

    it('should validate required fields in node context', () => {
      const invalidContext = { nodeType: 'action' }; // Missing nodeId
      const result = crossFeatureLink.updateNodeContext(invalidContext);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Node context missing required field: nodeId');
    });

    it('should reject context missing nodeType field', () => {
      const invalidContext = { nodeId: 'node-123' }; // Missing nodeType
      const result = crossFeatureLink.updateNodeContext(invalidContext);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Node context missing required field: nodeType');
    });

    it('should handle empty object context', () => {
      const result = crossFeatureLink.updateNodeContext({});
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Node context missing required field: nodeId');
    });
  });

  describe('Link Type Management', () => {
    let crossFeatureLink: CrossFeatureLink;

    beforeEach(() => {
      const props = createValidCrossFeatureLinkProps();
      crossFeatureLink = CrossFeatureLink.create(props).value;
    });

    it('should update link type successfully with compatible type', async () => {
      const initialUpdatedAt = crossFeatureLink.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const result = crossFeatureLink.updateLinkType(LinkType.DOCUMENTS);
      
      expect(result.isSuccess).toBe(true);
      expect(crossFeatureLink.linkType).toBe(LinkType.DOCUMENTS);
      expect(crossFeatureLink.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should handle FUNCTION_MODEL to KNOWLEDGE_BASE compatible types', () => {
      const compatibleTypes = [LinkType.DOCUMENTS, LinkType.REFERENCES, LinkType.SUPPORTS];
      
      compatibleTypes.forEach(linkType => {
        const result = crossFeatureLink.updateLinkType(linkType);
        expect(result.isSuccess).toBe(true);
        expect(crossFeatureLink.linkType).toBe(linkType);
      });
    });

    it('should reject incompatible link types for feature pair', () => {
      const result = crossFeatureLink.updateLinkType(LinkType.TRIGGERS);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(`Link type ${LinkType.TRIGGERS} is not compatible with features ${FeatureType.FUNCTION_MODEL} and ${FeatureType.KNOWLEDGE_BASE}`);
    });

    it('should handle FUNCTION_MODEL to SPINDLE compatible types', () => {
      const props = createValidCrossFeatureLinkProps({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.SPINDLE,
        linkType: LinkType.IMPLEMENTS
      });
      const spindleLink = CrossFeatureLink.create(props).value;
      
      const compatibleTypes = [LinkType.IMPLEMENTS, LinkType.TRIGGERS, LinkType.CONSUMES, LinkType.PRODUCES];
      
      compatibleTypes.forEach(linkType => {
        const result = spindleLink.updateLinkType(linkType);
        expect(result.isSuccess).toBe(true);
        expect(spindleLink.linkType).toBe(linkType);
      });
    });

    it('should handle bidirectional compatibility', () => {
      // Test reverse direction: KNOWLEDGE_BASE to FUNCTION_MODEL
      const props = createValidCrossFeatureLinkProps({
        sourceFeature: FeatureType.KNOWLEDGE_BASE,
        targetFeature: FeatureType.FUNCTION_MODEL,
        linkType: LinkType.DOCUMENTS
      });
      const reverseLink = CrossFeatureLink.create(props).value;
      
      const result = reverseLink.updateLinkType(LinkType.SUPPORTS);
      expect(result.isSuccess).toBe(true);
      expect(reverseLink.linkType).toBe(LinkType.SUPPORTS);
    });
  });

  describe('Link Classification Methods', () => {
    it('should identify cross-feature link correctly', () => {
      const props = createValidCrossFeatureLinkProps({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE
      });
      const crossFeatureLink = CrossFeatureLink.create(props).value;
      
      expect(crossFeatureLink.isCrossFeature()).toBe(true);
    });

    it('should identify different link types correctly', () => {
      const linkTypeTests = [
        { linkType: LinkType.DOCUMENTS, method: 'isDocumentationLink', expected: true },
        { linkType: LinkType.IMPLEMENTS, method: 'isImplementationLink', expected: true },
        { linkType: LinkType.REFERENCES, method: 'isReferenceLink', expected: true },
        { linkType: LinkType.SUPPORTS, method: 'isSupportLink', expected: true },
        { linkType: LinkType.NESTED, method: 'isNestedLink', expected: true },
        { linkType: LinkType.DOCUMENTS, method: 'isImplementationLink', expected: false },
      ];
      
      linkTypeTests.forEach(({ linkType, method, expected }) => {
        const props = createValidCrossFeatureLinkProps({ linkType });
        const crossFeatureLink = CrossFeatureLink.create(props).value;
        
        expect((crossFeatureLink as any)[method]()).toBe(expected);
      });
    });

    it('should identify strong link correctly', () => {
      const props = createValidCrossFeatureLinkProps({ linkStrength: 0.8 });
      const crossFeatureLink = CrossFeatureLink.create(props).value;
      
      expect(crossFeatureLink.hasStrongLink()).toBe(true);
      expect(crossFeatureLink.hasWeakLink()).toBe(false);
    });

    it('should identify weak link correctly', () => {
      const props = createValidCrossFeatureLinkProps({ linkStrength: 0.2 });
      const crossFeatureLink = CrossFeatureLink.create(props).value;
      
      expect(crossFeatureLink.hasWeakLink()).toBe(true);
      expect(crossFeatureLink.hasStrongLink()).toBe(false);
    });

    it('should handle boundary values for strong/weak links', () => {
      // Test strong link boundary (>= 0.7)
      const strongLink = CrossFeatureLink.create(createValidCrossFeatureLinkProps({ linkStrength: 0.7 })).value;
      expect(strongLink.hasStrongLink()).toBe(true);
      
      // Test weak link boundary (<= 0.3)
      const weakLink = CrossFeatureLink.create(createValidCrossFeatureLinkProps({ linkStrength: 0.3 })).value;
      expect(weakLink.hasWeakLink()).toBe(true);
      
      // Test medium strength
      const mediumLink = CrossFeatureLink.create(createValidCrossFeatureLinkProps({ linkStrength: 0.5 })).value;
      expect(mediumLink.hasStrongLink()).toBe(false);
      expect(mediumLink.hasWeakLink()).toBe(false);
    });

    it('should correctly identify node context presence', () => {
      const withContext = CrossFeatureLink.create(createValidCrossFeatureLinkProps({
        nodeContext: { nodeId: 'node-123', nodeType: 'action' }
      })).value;
      
      const withoutContext = CrossFeatureLink.create(createValidCrossFeatureLinkProps()).value;
      
      expect(withContext.hasNodeContext()).toBe(true);
      expect(withoutContext.hasNodeContext()).toBe(false);
    });
  });

  describe('Equality and Comparison', () => {
    it('should be equal when link IDs match', () => {
      const props1 = createValidCrossFeatureLinkProps();
      const props2 = createValidCrossFeatureLinkProps({
        sourceFeature: FeatureType.SPINDLE, // Different properties
        linkStrength: 0.9
      });
      
      const link1 = CrossFeatureLink.create(props1).value;
      const link2 = CrossFeatureLink.create(props2).value;
      
      expect(link1.equals(link2)).toBe(true);
    });

    it('should not be equal when link IDs differ', () => {
      const differentLinkId = NodeId.create('999e4567-e89b-42d3-a456-426614174999').value;
      const props1 = createValidCrossFeatureLinkProps();
      const props2 = createValidCrossFeatureLinkProps({ linkId: differentLinkId });
      
      const link1 = CrossFeatureLink.create(props1).value;
      const link2 = CrossFeatureLink.create(props2).value;
      
      expect(link1.equals(link2)).toBe(false);
    });
  });

  describe('Validation Rules', () => {
    it('should allow same feature links between different entities', () => {
      const props = createValidCrossFeatureLinkProps({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceId: 'function-model-1',
        targetId: 'function-model-2'
      });
      const result = CrossFeatureLink.create(props);
      
      expect(result.isSuccess).toBe(true);
      const link = result.value;
      expect(link.sourceFeature).toBe(FeatureType.FUNCTION_MODEL);
      expect(link.targetFeature).toBe(FeatureType.FUNCTION_MODEL);
    });

    it('should reject entity-level self-links', () => {
      const props = createValidCrossFeatureLinkProps({
        sourceId: 'same-entity',
        targetId: 'same-entity'
      });
      const result = CrossFeatureLink.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Self-linking at entity level is prohibited');
    });

    it('should reject empty source entity ID', () => {
      const props = createValidCrossFeatureLinkProps({ sourceId: '' });
      const result = CrossFeatureLink.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Source entity ID cannot be empty');
    });

    it('should reject whitespace-only source entity ID', () => {
      const props = createValidCrossFeatureLinkProps({ sourceId: '   ' });
      const result = CrossFeatureLink.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Source entity ID cannot be empty');
    });

    it('should reject empty target entity ID', () => {
      const props = createValidCrossFeatureLinkProps({ targetId: '' });
      const result = CrossFeatureLink.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Target entity ID cannot be empty');
    });

    it('should reject whitespace-only target entity ID', () => {
      const props = createValidCrossFeatureLinkProps({ targetId: '   ' });
      const result = CrossFeatureLink.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Target entity ID cannot be empty');
    });

    it('should reject invalid link strength during creation', () => {
      const props = createValidCrossFeatureLinkProps({ linkStrength: -0.5 });
      const result = CrossFeatureLink.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Link strength must be between 0.0 and 1.0');
    });

    it('should reject link strength greater than 1.0 during creation', () => {
      const props = createValidCrossFeatureLinkProps({ linkStrength: 1.5 });
      const result = CrossFeatureLink.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Link strength must be between 0.0 and 1.0');
    });
  });

  describe('Feature Compatibility Matrix', () => {
    it('should validate FUNCTION_MODEL to EVENT_STORM compatibility', () => {
      const props = createValidCrossFeatureLinkProps({
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.EVENT_STORM,
        linkType: LinkType.TRIGGERS
      });
      const link = CrossFeatureLink.create(props).value;
      
      const compatibleTypes = [LinkType.TRIGGERS, LinkType.CONSUMES, LinkType.PRODUCES];
      
      compatibleTypes.forEach(linkType => {
        const result = link.updateLinkType(linkType);
        expect(result.isSuccess).toBe(true);
      });
      
      // Test incompatible type
      const result = link.updateLinkType(LinkType.DOCUMENTS);
      expect(result.isFailure).toBe(true);
    });

    it('should validate KNOWLEDGE_BASE to SPINDLE compatibility', () => {
      const props = createValidCrossFeatureLinkProps({
        sourceFeature: FeatureType.KNOWLEDGE_BASE,
        targetFeature: FeatureType.SPINDLE,
        linkType: LinkType.DOCUMENTS
      });
      const link = CrossFeatureLink.create(props).value;
      
      const compatibleTypes = [LinkType.DOCUMENTS, LinkType.SUPPORTS];
      
      compatibleTypes.forEach(linkType => {
        const result = link.updateLinkType(linkType);
        expect(result.isSuccess).toBe(true);
      });
      
      // Test incompatible type
      const result = link.updateLinkType(LinkType.IMPLEMENTS);
      expect(result.isFailure).toBe(true);
    });

    it('should allow all link types for undefined feature pairs', () => {
      // Create a feature pair not in the compatibility matrix
      const props = createValidCrossFeatureLinkProps({
        sourceFeature: FeatureType.SPINDLE,
        targetFeature: FeatureType.EVENT_STORM,
        linkType: LinkType.NESTED // Any type should work
      });
      const link = CrossFeatureLink.create(props).value;
      
      // Should allow any link type for undefined pairs
      const allLinkTypes = Object.values(LinkType);
      
      allLinkTypes.forEach(linkType => {
        const result = link.updateLinkType(linkType);
        expect(result.isSuccess).toBe(true);
      });
    });
  });

  describe('Business Logic Integration', () => {
    it('should maintain consistency during complex operations', async () => {
      const props = createValidCrossFeatureLinkProps({
        nodeContext: { nodeId: 'initial-node', nodeType: 'action' },
        linkStrength: 0.5
      });
      const crossFeatureLink = CrossFeatureLink.create(props).value;
      
      const initialUpdatedAt = crossFeatureLink.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Perform multiple updates
      const strengthResult = crossFeatureLink.updateLinkStrength(0.8);
      const typeResult = crossFeatureLink.updateLinkType(LinkType.DOCUMENTS);
      const contextResult = crossFeatureLink.updateNodeContext({
        nodeId: 'updated-node',
        nodeType: 'container',
        priority: 'high'
      });
      
      expect(strengthResult.isSuccess).toBe(true);
      expect(typeResult.isSuccess).toBe(true);
      expect(contextResult.isSuccess).toBe(true);
      
      // Verify all changes persisted
      expect(crossFeatureLink.linkStrength).toBe(0.8);
      expect(crossFeatureLink.linkType).toBe(LinkType.DOCUMENTS);
      expect(crossFeatureLink.nodeContext).toEqual({
        nodeId: 'updated-node',
        nodeType: 'container',
        priority: 'high'
      });
      expect(crossFeatureLink.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should handle error scenarios gracefully', () => {
      const props = createValidCrossFeatureLinkProps();
      const crossFeatureLink = CrossFeatureLink.create(props).value;
      
      const originalStrength = crossFeatureLink.linkStrength;
      const originalType = crossFeatureLink.linkType;
      const originalUpdatedAt = crossFeatureLink.updatedAt;
      
      // Try invalid operations
      const strengthResult = crossFeatureLink.updateLinkStrength(1.5);
      const typeResult = crossFeatureLink.updateLinkType(LinkType.TRIGGERS);
      const contextResult = crossFeatureLink.updateNodeContext({ invalidField: 'value' });
      
      expect(strengthResult.isFailure).toBe(true);
      expect(typeResult.isFailure).toBe(true);
      expect(contextResult.isFailure).toBe(true);
      
      // Verify no changes occurred
      expect(crossFeatureLink.linkStrength).toBe(originalStrength);
      expect(crossFeatureLink.linkType).toBe(originalType);
      expect(crossFeatureLink.updatedAt).toEqual(originalUpdatedAt);
    });

    it('should support all feature combinations that require cross-feature links', () => {
      const featureCombinations = [
        { source: FeatureType.FUNCTION_MODEL, target: FeatureType.KNOWLEDGE_BASE },
        { source: FeatureType.FUNCTION_MODEL, target: FeatureType.SPINDLE },
        { source: FeatureType.FUNCTION_MODEL, target: FeatureType.EVENT_STORM },
        { source: FeatureType.KNOWLEDGE_BASE, target: FeatureType.SPINDLE },
        { source: FeatureType.KNOWLEDGE_BASE, target: FeatureType.EVENT_STORM },
        { source: FeatureType.SPINDLE, target: FeatureType.EVENT_STORM }
      ];
      
      featureCombinations.forEach(({ source, target }) => {
        const props = createValidCrossFeatureLinkProps({
          sourceFeature: source,
          targetFeature: target,
          sourceId: `${source}-entity`,
          targetId: `${target}-entity`
        });
        const result = CrossFeatureLink.create(props);
        
        expect(result.isSuccess).toBe(true);
        const crossFeatureLink = result.value;
        expect(crossFeatureLink.sourceFeature).toBe(source);
        expect(crossFeatureLink.targetFeature).toBe(target);
        expect(crossFeatureLink.isCrossFeature()).toBe(true);
      });
    });
  });

  describe('Link Strength Categories', () => {
    it('should correctly categorize various link strengths', () => {
      const testCases = [
        { strength: 0.0, isWeak: true, isStrong: false },
        { strength: 0.1, isWeak: true, isStrong: false },
        { strength: 0.3, isWeak: true, isStrong: false },
        { strength: 0.31, isWeak: false, isStrong: false },
        { strength: 0.5, isWeak: false, isStrong: false },
        { strength: 0.69, isWeak: false, isStrong: false },
        { strength: 0.7, isWeak: false, isStrong: true },
        { strength: 0.8, isWeak: false, isStrong: true },
        { strength: 1.0, isWeak: false, isStrong: true }
      ];
      
      testCases.forEach(({ strength, isWeak, isStrong }) => {
        const props = createValidCrossFeatureLinkProps({ linkStrength: strength });
        const crossFeatureLink = CrossFeatureLink.create(props).value;
        
        expect(crossFeatureLink.hasWeakLink()).toBe(isWeak);
        expect(crossFeatureLink.hasStrongLink()).toBe(isStrong);
      });
    });
  });
});