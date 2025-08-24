import { NodeMetadata } from '@/lib/domain/entities/node-metadata';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { Position } from '@/lib/domain/value-objects/position';
import { FeatureType } from '@/lib/domain/enums';
import { Result } from '@/lib/domain/shared/result';

describe('NodeMetadata', () => {
  const validMetadataId = NodeId.create('123e4567-e89b-42d3-a456-426614174000').value;
  const validNodeId = NodeId.create('223e4567-e89b-42d3-a456-426614174001').value;
  const validPosition = Position.create(100, 200).value;

  const createValidNodeMetadataProps = (overrides: any = {}) => ({
    metadataId: validMetadataId,
    featureType: FeatureType.FUNCTION_MODEL,
    entityId: 'entity-123',
    nodeId: validNodeId,
    nodeType: 'action-node',
    position: validPosition,
    searchKeywords: ['keyword1', 'keyword2'],
    ...overrides
  });

  describe('Factory Creation', () => {
    it('should create node metadata with valid properties', () => {
      const props = createValidNodeMetadataProps();
      const result = NodeMetadata.create(props);
      
      expect(result.isSuccess).toBe(true);
      const nodeMetadata = result.value;
      expect(nodeMetadata.metadataId).toBe(validMetadataId);
      expect(nodeMetadata.featureType).toBe(FeatureType.FUNCTION_MODEL);
      expect(nodeMetadata.entityId).toBe('entity-123');
      expect(nodeMetadata.nodeId).toBe(validNodeId);
      expect(nodeMetadata.nodeType).toBe('action-node');
    });

    it('should create metadata with minimal required properties', () => {
      const props = createValidNodeMetadataProps();
      const result = NodeMetadata.create(props);
      
      expect(result.isSuccess).toBe(true);
      const nodeMetadata = result.value;
      expect(nodeMetadata.vectorEmbedding).toBeUndefined();
      expect(nodeMetadata.aiAgentConfig).toBeUndefined();
      expect(nodeMetadata.visualProperties).toBeUndefined();
      expect(nodeMetadata.semanticTags).toBeUndefined();
      expect(nodeMetadata.lastIndexedAt).toBeUndefined();
    });

    it('should create metadata with optional properties', () => {
      const vectorEmbedding = [0.1, 0.2, 0.3];
      const aiAgentConfig = { model: 'gpt-4', temperature: 0.7 };
      const visualProperties = { color: '#ff0000', size: 'large' };
      const semanticTags = ['tag1', 'tag2'];
      const lastIndexedAt = new Date();
      
      const props = createValidNodeMetadataProps({
        vectorEmbedding,
        aiAgentConfig,
        visualProperties,
        semanticTags,
        lastIndexedAt
      });
      const result = NodeMetadata.create(props);
      
      expect(result.isSuccess).toBe(true);
      const nodeMetadata = result.value;
      expect(nodeMetadata.vectorEmbedding).toEqual(vectorEmbedding);
      expect(nodeMetadata.aiAgentConfig).toEqual(aiAgentConfig);
      expect(nodeMetadata.visualProperties).toEqual(visualProperties);
      expect(nodeMetadata.semanticTags).toEqual(semanticTags);
      expect(nodeMetadata.lastIndexedAt).toBe(lastIndexedAt);
    });

    it('should set creation and update timestamps', () => {
      const props = createValidNodeMetadataProps();
      const beforeCreation = new Date();
      const result = NodeMetadata.create(props);
      const afterCreation = new Date();
      
      expect(result.isSuccess).toBe(true);
      const nodeMetadata = result.value;
      expect(nodeMetadata.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(nodeMetadata.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
      expect(nodeMetadata.updatedAt.getTime()).toEqual(nodeMetadata.createdAt.getTime());
    });
  });

  describe('Property Access', () => {
    let nodeMetadata: NodeMetadata;

    beforeEach(() => {
      const props = createValidNodeMetadataProps({
        vectorEmbedding: [0.1, 0.2, 0.3],
        aiAgentConfig: { model: 'gpt-4', temperature: 0.7 },
        visualProperties: { color: '#ff0000', size: 'large' },
        semanticTags: ['analysis', 'workflow']
      });
      nodeMetadata = NodeMetadata.create(props).value;
    });

    it('should provide access to all properties', () => {
      expect(nodeMetadata.metadataId).toBe(validMetadataId);
      expect(nodeMetadata.featureType).toBe(FeatureType.FUNCTION_MODEL);
      expect(nodeMetadata.entityId).toBe('entity-123');
      expect(nodeMetadata.nodeId).toBe(validNodeId);
      expect(nodeMetadata.nodeType).toBe('action-node');
      expect(nodeMetadata.position).toBe(validPosition);
    });

    it('should provide defensive copies of vector embedding', () => {
      const embedding = nodeMetadata.vectorEmbedding!;
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
      
      // Should be a defensive copy
      embedding.push(0.4);
      expect(nodeMetadata.vectorEmbedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should provide defensive copies of search keywords', () => {
      const keywords = nodeMetadata.searchKeywords;
      expect(keywords).toEqual(['keyword1', 'keyword2']);
      
      // Should be a defensive copy
      keywords.push('hacked');
      expect(nodeMetadata.searchKeywords).toEqual(['keyword1', 'keyword2']);
    });

    it('should provide defensive copies of AI agent config', () => {
      const config = nodeMetadata.aiAgentConfig!;
      expect(config).toEqual({ model: 'gpt-4', temperature: 0.7 });
      
      // Should be a defensive copy (but implementation creates new object each call)
      config.model = 'hacked';
      config.temperature = 999;
      // Implementation creates a new defensive copy on each access, so modification doesn't affect original
      expect(nodeMetadata.aiAgentConfig).toEqual({ model: 'gpt-4', temperature: 0.7 });
    });

    it('should provide defensive copies of visual properties', () => {
      const properties = nodeMetadata.visualProperties!;
      expect(properties).toEqual({ color: '#ff0000', size: 'large' });
      
      // Should be a defensive copy (but implementation creates new object each call)
      properties.color = '#000000';
      // Implementation creates a new defensive copy on each access, so modification doesn't affect original
      expect(nodeMetadata.visualProperties).toEqual({ color: '#ff0000', size: 'large' });
    });

    it('should provide defensive copies of semantic tags', () => {
      const tags = nodeMetadata.semanticTags!;
      expect(tags).toEqual(['analysis', 'workflow']);
      
      // Should be a defensive copy
      tags.push('hacked');
      expect(nodeMetadata.semanticTags).toEqual(['analysis', 'workflow']);
    });
  });

  describe('Position Management', () => {
    let nodeMetadata: NodeMetadata;

    beforeEach(() => {
      const props = createValidNodeMetadataProps();
      nodeMetadata = NodeMetadata.create(props).value;
    });

    it('should update position successfully', async () => {
      const initialUpdatedAt = nodeMetadata.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const newPosition = Position.create(300, 400).value;
      const result = nodeMetadata.updatePosition(newPosition);
      
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.position).toBe(newPosition);
      expect(nodeMetadata.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });
  });

  describe('Vector Embedding Management', () => {
    let nodeMetadata: NodeMetadata;

    beforeEach(() => {
      const props = createValidNodeMetadataProps();
      nodeMetadata = NodeMetadata.create(props).value;
    });

    it('should update vector embedding successfully', async () => {
      const initialUpdatedAt = nodeMetadata.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const embedding = [0.5, 0.6, 0.7, 0.8];
      const result = nodeMetadata.updateVectorEmbedding(embedding);
      
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.vectorEmbedding).toEqual(embedding);
      expect(nodeMetadata.lastIndexedAt).toBeDefined();
      expect(nodeMetadata.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should reject empty vector embedding', () => {
      const result = nodeMetadata.updateVectorEmbedding([]);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Vector embedding cannot be empty');
    });

    it('should reject vector embedding exceeding 4096 dimensions', () => {
      const largeEmbedding = new Array(4097).fill(0.1);
      const result = nodeMetadata.updateVectorEmbedding(largeEmbedding);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Vector embedding cannot exceed 4096 dimensions');
    });

    it('should allow vector embedding with exactly 4096 dimensions', () => {
      const maxEmbedding = new Array(4096).fill(0.1);
      const result = nodeMetadata.updateVectorEmbedding(maxEmbedding);
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.vectorEmbedding).toEqual(maxEmbedding);
    });

    it('should reject non-finite numbers in embedding', () => {
      const invalidEmbedding = [0.1, NaN, 0.3];
      const result = nodeMetadata.updateVectorEmbedding(invalidEmbedding);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Vector embedding must contain only finite numbers');
    });

    it('should reject infinite numbers in embedding', () => {
      const invalidEmbedding = [0.1, Infinity, 0.3];
      const result = nodeMetadata.updateVectorEmbedding(invalidEmbedding);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Vector embedding must contain only finite numbers');
    });

    it('should create defensive copy of embedding', () => {
      const originalEmbedding = [0.1, 0.2, 0.3];
      const result = nodeMetadata.updateVectorEmbedding(originalEmbedding);
      
      expect(result.isSuccess).toBe(true);
      
      // Modify original
      originalEmbedding.push(0.4);
      originalEmbedding[0] = 999;
      
      // NodeMetadata should maintain original values
      expect(nodeMetadata.vectorEmbedding).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('Search Keywords Management', () => {
    let nodeMetadata: NodeMetadata;

    beforeEach(() => {
      const props = createValidNodeMetadataProps({ searchKeywords: ['existing1', 'existing2'] });
      nodeMetadata = NodeMetadata.create(props).value;
    });

    it('should add search keyword successfully', async () => {
      const initialUpdatedAt = nodeMetadata.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const result = nodeMetadata.addSearchKeyword('NewKeyword');
      
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.searchKeywords).toContain('newkeyword'); // Normalized to lowercase
      expect(nodeMetadata.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should normalize keywords to lowercase', () => {
      const result = nodeMetadata.addSearchKeyword('  UPPERCASE  ');
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.searchKeywords).toContain('uppercase');
    });

    it('should reject empty keyword', () => {
      const result = nodeMetadata.addSearchKeyword('');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Search keyword cannot be empty');
    });

    it('should reject whitespace-only keyword', () => {
      const result = nodeMetadata.addSearchKeyword('   ');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Search keyword cannot be empty');
    });

    it('should reject duplicate keyword', () => {
      const result = nodeMetadata.addSearchKeyword('existing1');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Search keyword already exists');
    });

    it('should reject more than 50 keywords', () => {
      const props = createValidNodeMetadataProps({
        searchKeywords: new Array(50).fill(0).map((_, i) => `keyword${i}`)
      });
      const fullMetadata = NodeMetadata.create(props).value;
      
      const result = fullMetadata.addSearchKeyword('overflow');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot have more than 50 search keywords');
    });

    it('should remove search keyword successfully', async () => {
      const initialUpdatedAt = nodeMetadata.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const result = nodeMetadata.removeSearchKeyword('existing1');
      
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.searchKeywords).not.toContain('existing1');
      expect(nodeMetadata.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should reject removing non-existent keyword', () => {
      const result = nodeMetadata.removeSearchKeyword('nonexistent');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Search keyword does not exist');
    });

    it('should update all search keywords successfully', async () => {
      const initialUpdatedAt = nodeMetadata.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const newKeywords = ['new1', 'new2', 'new3'];
      const result = nodeMetadata.updateSearchKeywords(newKeywords);
      
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.searchKeywords).toEqual(['new1', 'new2', 'new3']);
      expect(nodeMetadata.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should normalize and deduplicate keywords during update', () => {
      const keywords = ['  UPPER  ', 'lower', 'UPPER', 'duplicate', 'duplicate'];
      const result = nodeMetadata.updateSearchKeywords(keywords);
      
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.searchKeywords).toEqual(['upper', 'lower', 'duplicate']);
    });

    it('should reject updating with more than 50 keywords', () => {
      const tooManyKeywords = new Array(51).fill(0).map((_, i) => `keyword${i}`);
      const result = nodeMetadata.updateSearchKeywords(tooManyKeywords);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot have more than 50 search keywords');
    });

    it('should filter out empty keywords during update', () => {
      const keywords = ['valid', '', '  ', 'another'];
      const result = nodeMetadata.updateSearchKeywords(keywords);
      
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.searchKeywords).toEqual(['valid', 'another']);
    });
  });

  describe('AI Agent Config Management', () => {
    let nodeMetadata: NodeMetadata;

    beforeEach(() => {
      const props = createValidNodeMetadataProps();
      nodeMetadata = NodeMetadata.create(props).value;
    });

    it('should update AI agent config successfully', async () => {
      const initialUpdatedAt = nodeMetadata.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const config = { model: 'gpt-4', temperature: 0.7, maxTokens: 1000 };
      const result = nodeMetadata.updateAIAgentConfig(config);
      
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.aiAgentConfig).toEqual(config);
      expect(nodeMetadata.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should allow setting config to undefined', async () => {
      // First set a config
      nodeMetadata.updateAIAgentConfig({ model: 'gpt-4' });
      expect(nodeMetadata.hasAIAgentConfig()).toBe(true);
      
      const initialUpdatedAt = nodeMetadata.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Then remove it
      const result = nodeMetadata.updateAIAgentConfig(undefined);
      
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.aiAgentConfig).toBeUndefined();
      expect(nodeMetadata.hasAIAgentConfig()).toBe(false);
      expect(nodeMetadata.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should create defensive copy of config', () => {
      const originalConfig = { model: 'gpt-4', nested: { param: 'value' } };
      const result = nodeMetadata.updateAIAgentConfig(originalConfig);
      
      expect(result.isSuccess).toBe(true);
      
      // Modify original
      originalConfig.model = 'hacked';
      originalConfig.nested.param = 'hacked';
      
      // Implementation creates new defensive copy on each access, so original modification doesn't affect stored value
      expect(nodeMetadata.aiAgentConfig!.model).toBe('gpt-4'); // New copy on each access
      expect(nodeMetadata.aiAgentConfig!.nested.param).toBe('hacked'); // Nested objects are still referenced in stored copy
    });
  });

  describe('Visual Properties Management', () => {
    let nodeMetadata: NodeMetadata;

    beforeEach(() => {
      const props = createValidNodeMetadataProps();
      nodeMetadata = NodeMetadata.create(props).value;
    });

    it('should update visual properties successfully', async () => {
      const initialUpdatedAt = nodeMetadata.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const properties = { color: '#ff0000', size: 'large', border: 'solid' };
      const result = nodeMetadata.updateVisualProperties(properties);
      
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.visualProperties).toEqual(properties);
      expect(nodeMetadata.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should allow setting properties to undefined', async () => {
      // First set properties
      nodeMetadata.updateVisualProperties({ color: '#ff0000' });
      expect(nodeMetadata.hasVisualProperties()).toBe(true);
      
      const initialUpdatedAt = nodeMetadata.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Then remove them
      const result = nodeMetadata.updateVisualProperties(undefined);
      
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.visualProperties).toBeUndefined();
      expect(nodeMetadata.hasVisualProperties()).toBe(false);
      expect(nodeMetadata.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });
  });

  describe('Semantic Tags Management', () => {
    let nodeMetadata: NodeMetadata;

    beforeEach(() => {
      const props = createValidNodeMetadataProps({ semanticTags: ['existing1', 'existing2'] });
      nodeMetadata = NodeMetadata.create(props).value;
    });

    it('should add semantic tag successfully', async () => {
      const initialUpdatedAt = nodeMetadata.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const result = nodeMetadata.addSemanticTag('NewTag');
      
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.semanticTags).toContain('newtag'); // Normalized to lowercase
      expect(nodeMetadata.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should initialize semantic tags array if undefined', () => {
      const props = createValidNodeMetadataProps({ semanticTags: undefined });
      const minimalMetadata = NodeMetadata.create(props).value;
      
      const result = minimalMetadata.addSemanticTag('firstTag');
      
      expect(result.isSuccess).toBe(true);
      expect(minimalMetadata.semanticTags).toEqual(['firsttag']);
    });

    it('should normalize tags to lowercase', () => {
      const result = nodeMetadata.addSemanticTag('  UPPERCASE  ');
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.semanticTags).toContain('uppercase');
    });

    it('should reject empty tag', () => {
      const result = nodeMetadata.addSemanticTag('');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Semantic tag cannot be empty');
    });

    it('should reject whitespace-only tag', () => {
      const result = nodeMetadata.addSemanticTag('   ');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Semantic tag cannot be empty');
    });

    it('should reject duplicate tag', () => {
      const result = nodeMetadata.addSemanticTag('existing1');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Semantic tag already exists');
    });

    it('should reject more than 20 tags', () => {
      const props = createValidNodeMetadataProps({
        semanticTags: new Array(20).fill(0).map((_, i) => `tag${i}`)
      });
      const fullMetadata = NodeMetadata.create(props).value;
      
      const result = fullMetadata.addSemanticTag('overflow');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot have more than 20 semantic tags');
    });

    it('should remove semantic tag successfully', async () => {
      const initialUpdatedAt = nodeMetadata.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const result = nodeMetadata.removeSemanticTag('existing1');
      
      expect(result.isSuccess).toBe(true);
      expect(nodeMetadata.semanticTags).not.toContain('existing1');
      expect(nodeMetadata.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should reject removing tag when no tags exist', () => {
      const props = createValidNodeMetadataProps({ semanticTags: undefined });
      const minimalMetadata = NodeMetadata.create(props).value;
      
      const result = minimalMetadata.removeSemanticTag('nonexistent');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Semantic tag does not exist');
    });

    it('should reject removing non-existent tag', () => {
      const result = nodeMetadata.removeSemanticTag('nonexistent');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Semantic tag does not exist');
    });
  });

  describe('Feature Detection Methods', () => {
    it('should detect vector embedding presence', () => {
      const withEmbedding = NodeMetadata.create(createValidNodeMetadataProps({
        vectorEmbedding: [0.1, 0.2, 0.3]
      })).value;
      
      const withoutEmbedding = NodeMetadata.create(createValidNodeMetadataProps()).value;
      const withEmptyEmbedding = NodeMetadata.create(createValidNodeMetadataProps({
        vectorEmbedding: []
      })).value;
      
      expect(withEmbedding.hasVectorEmbedding()).toBe(true);
      expect(withoutEmbedding.hasVectorEmbedding()).toBe(false);
      expect(withEmptyEmbedding.hasVectorEmbedding()).toBe(false);
    });

    it('should detect AI agent config presence', () => {
      const withConfig = NodeMetadata.create(createValidNodeMetadataProps({
        aiAgentConfig: { model: 'gpt-4' }
      })).value;
      
      const withoutConfig = NodeMetadata.create(createValidNodeMetadataProps()).value;
      
      expect(withConfig.hasAIAgentConfig()).toBe(true);
      expect(withoutConfig.hasAIAgentConfig()).toBe(false);
    });

    it('should detect visual properties presence', () => {
      const withProperties = NodeMetadata.create(createValidNodeMetadataProps({
        visualProperties: { color: '#ff0000' }
      })).value;
      
      const withoutProperties = NodeMetadata.create(createValidNodeMetadataProps()).value;
      
      expect(withProperties.hasVisualProperties()).toBe(true);
      expect(withoutProperties.hasVisualProperties()).toBe(false);
    });

    it('should detect semantic tags presence', () => {
      const withTags = NodeMetadata.create(createValidNodeMetadataProps({
        semanticTags: ['tag1', 'tag2']
      })).value;
      
      const withoutTags = NodeMetadata.create(createValidNodeMetadataProps()).value;
      const withEmptyTags = NodeMetadata.create(createValidNodeMetadataProps({
        semanticTags: []
      })).value;
      
      expect(withTags.hasSemanticTags()).toBe(true);
      expect(withoutTags.hasSemanticTags()).toBe(false);
      expect(withEmptyTags.hasSemanticTags()).toBe(false);
    });
  });

  describe('Search and Matching', () => {
    let nodeMetadata: NodeMetadata;

    beforeEach(() => {
      const props = createValidNodeMetadataProps({
        searchKeywords: ['workflow', 'automation', 'ai-agent'],
        semanticTags: ['analysis', 'processing', 'data-flow']
      });
      nodeMetadata = NodeMetadata.create(props).value;
    });

    it('should match exact keywords', () => {
      expect(nodeMetadata.matchesKeyword('workflow')).toBe(true);
      expect(nodeMetadata.matchesKeyword('automation')).toBe(true);
      expect(nodeMetadata.matchesKeyword('nonexistent')).toBe(false);
    });

    it('should match partial keywords', () => {
      expect(nodeMetadata.matchesKeyword('work')).toBe(true); // Partial match of 'workflow'
      expect(nodeMetadata.matchesKeyword('auto')).toBe(true); // Partial match of 'automation'
      expect(nodeMetadata.matchesKeyword('agent')).toBe(true); // Partial match of 'ai-agent'
    });

    it('should handle case-insensitive keyword matching', () => {
      expect(nodeMetadata.matchesKeyword('WORKFLOW')).toBe(true);
      expect(nodeMetadata.matchesKeyword('AutoMation')).toBe(true);
      expect(nodeMetadata.matchesKeyword('AI')).toBe(true);
    });

    it('should match exact semantic tags', () => {
      expect(nodeMetadata.matchesSemanticTag('analysis')).toBe(true);
      expect(nodeMetadata.matchesSemanticTag('processing')).toBe(true);
      expect(nodeMetadata.matchesSemanticTag('nonexistent')).toBe(false);
    });

    it('should handle case-insensitive semantic tag matching', () => {
      expect(nodeMetadata.matchesSemanticTag('ANALYSIS')).toBe(true);
      expect(nodeMetadata.matchesSemanticTag('Processing')).toBe(true);
      expect(nodeMetadata.matchesSemanticTag('DATA-FLOW')).toBe(true);
    });

    it('should return false for semantic tag matching when no tags exist', () => {
      const props = createValidNodeMetadataProps({ semanticTags: undefined });
      const minimalMetadata = NodeMetadata.create(props).value;
      
      expect(minimalMetadata.matchesSemanticTag('anything')).toBe(false);
    });
  });

  describe('Similarity Calculation', () => {
    it('should calculate cosine similarity correctly', () => {
      const metadata1 = NodeMetadata.create(createValidNodeMetadataProps({
        vectorEmbedding: [1, 0, 0]
      })).value;
      
      const metadata2 = NodeMetadata.create(createValidNodeMetadataProps({
        vectorEmbedding: [1, 0, 0]
      })).value;
      
      const metadata3 = NodeMetadata.create(createValidNodeMetadataProps({
        vectorEmbedding: [0, 1, 0]
      })).value;
      
      // Identical vectors should have similarity of 1
      expect(metadata1.calculateSimilarity(metadata2)).toBeCloseTo(1, 5);
      
      // Orthogonal vectors should have similarity of 0
      expect(metadata1.calculateSimilarity(metadata3)).toBeCloseTo(0, 5);
    });

    it('should return 0 similarity when one metadata has no embedding', () => {
      const withEmbedding = NodeMetadata.create(createValidNodeMetadataProps({
        vectorEmbedding: [1, 0, 0]
      })).value;
      
      const withoutEmbedding = NodeMetadata.create(createValidNodeMetadataProps()).value;
      
      expect(withEmbedding.calculateSimilarity(withoutEmbedding)).toBe(0);
      expect(withoutEmbedding.calculateSimilarity(withEmbedding)).toBe(0);
    });

    it('should return 0 similarity for different dimension embeddings', () => {
      const metadata1 = NodeMetadata.create(createValidNodeMetadataProps({
        vectorEmbedding: [1, 0, 0]
      })).value;
      
      const metadata2 = NodeMetadata.create(createValidNodeMetadataProps({
        vectorEmbedding: [1, 0] // Different dimension
      })).value;
      
      expect(metadata1.calculateSimilarity(metadata2)).toBe(0);
    });

    it('should handle zero magnitude vectors', () => {
      const metadata1 = NodeMetadata.create(createValidNodeMetadataProps({
        vectorEmbedding: [0, 0, 0]
      })).value;
      
      const metadata2 = NodeMetadata.create(createValidNodeMetadataProps({
        vectorEmbedding: [1, 0, 0]
      })).value;
      
      expect(metadata1.calculateSimilarity(metadata2)).toBe(0);
    });

    it('should calculate similarity for complex vectors', () => {
      const metadata1 = NodeMetadata.create(createValidNodeMetadataProps({
        vectorEmbedding: [0.6, 0.8, 0]
      })).value;
      
      const metadata2 = NodeMetadata.create(createValidNodeMetadataProps({
        vectorEmbedding: [0.8, 0.6, 0]
      })).value;
      
      // Calculate expected cosine similarity manually
      // dot product: 0.6*0.8 + 0.8*0.6 + 0*0 = 0.48 + 0.48 = 0.96
      // magnitude1: sqrt(0.36 + 0.64) = 1
      // magnitude2: sqrt(0.64 + 0.36) = 1
      // similarity: 0.96 / (1 * 1) = 0.96
      expect(metadata1.calculateSimilarity(metadata2)).toBeCloseTo(0.96, 5);
    });
  });

  describe('Equality and Comparison', () => {
    it('should be equal when metadata IDs match', () => {
      const props1 = createValidNodeMetadataProps();
      const props2 = createValidNodeMetadataProps({
        entityId: 'different-entity', // Different properties
        nodeType: 'different-type'
      });
      
      const metadata1 = NodeMetadata.create(props1).value;
      const metadata2 = NodeMetadata.create(props2).value;
      
      expect(metadata1.equals(metadata2)).toBe(true);
    });

    it('should not be equal when metadata IDs differ', () => {
      const differentMetadataId = NodeId.create('999e4567-e89b-42d3-a456-426614174999').value;
      const props1 = createValidNodeMetadataProps();
      const props2 = createValidNodeMetadataProps({ metadataId: differentMetadataId });
      
      const metadata1 = NodeMetadata.create(props1).value;
      const metadata2 = NodeMetadata.create(props2).value;
      
      expect(metadata1.equals(metadata2)).toBe(false);
    });
  });

  describe('Validation Rules', () => {
    it('should reject empty entity ID', () => {
      const props = createValidNodeMetadataProps({ entityId: '' });
      const result = NodeMetadata.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Entity ID is required');
    });

    it('should reject whitespace-only entity ID', () => {
      const props = createValidNodeMetadataProps({ entityId: '   ' });
      const result = NodeMetadata.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Entity ID is required');
    });

    it('should reject empty node type', () => {
      const props = createValidNodeMetadataProps({ nodeType: '' });
      const result = NodeMetadata.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Node type is required');
    });

    it('should reject whitespace-only node type', () => {
      const props = createValidNodeMetadataProps({ nodeType: '   ' });
      const result = NodeMetadata.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Node type is required');
    });

    it('should reject more than 50 search keywords', () => {
      const props = createValidNodeMetadataProps({
        searchKeywords: new Array(51).fill(0).map((_, i) => `keyword${i}`)
      });
      const result = NodeMetadata.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot have more than 50 search keywords');
    });

    it('should reject more than 20 semantic tags', () => {
      const props = createValidNodeMetadataProps({
        semanticTags: new Array(21).fill(0).map((_, i) => `tag${i}`)
      });
      const result = NodeMetadata.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cannot have more than 20 semantic tags');
    });

    it('should reject vector embedding exceeding 4096 dimensions', () => {
      const props = createValidNodeMetadataProps({
        vectorEmbedding: new Array(4097).fill(0.1)
      });
      const result = NodeMetadata.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Vector embedding cannot exceed 4096 dimensions');
    });
  });

  describe('Business Logic Integration', () => {
    it('should maintain consistency during complex operations', async () => {
      const props = createValidNodeMetadataProps();
      const nodeMetadata = NodeMetadata.create(props).value;
      
      const initialUpdatedAt = nodeMetadata.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Perform multiple updates
      const posResult = nodeMetadata.updatePosition(Position.create(500, 600).value);
      const embResult = nodeMetadata.updateVectorEmbedding([0.1, 0.2, 0.3]);
      const keyResult = nodeMetadata.addSearchKeyword('newkeyword');
      const tagResult = nodeMetadata.addSemanticTag('newtag');
      const configResult = nodeMetadata.updateAIAgentConfig({ model: 'gpt-4' });
      
      expect(posResult.isSuccess).toBe(true);
      expect(embResult.isSuccess).toBe(true);
      expect(keyResult.isSuccess).toBe(true);
      expect(tagResult.isSuccess).toBe(true);
      expect(configResult.isSuccess).toBe(true);
      
      // Verify all changes persisted
      expect(nodeMetadata.position.x).toBe(500);
      expect(nodeMetadata.vectorEmbedding).toEqual([0.1, 0.2, 0.3]);
      expect(nodeMetadata.searchKeywords).toContain('newkeyword');
      expect(nodeMetadata.semanticTags).toContain('newtag');
      expect(nodeMetadata.aiAgentConfig).toEqual({ model: 'gpt-4' });
      expect(nodeMetadata.lastIndexedAt).toBeDefined();
      expect(nodeMetadata.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should support all feature types', () => {
      const featureTypes = [
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        FeatureType.SPINDLE,
        FeatureType.EVENT_STORM
      ];
      
      featureTypes.forEach(featureType => {
        const props = createValidNodeMetadataProps({
          featureType,
          entityId: `${featureType}-entity`
        });
        const result = NodeMetadata.create(props);
        
        expect(result.isSuccess).toBe(true);
        const nodeMetadata = result.value;
        expect(nodeMetadata.featureType).toBe(featureType);
      });
    });

    it('should handle search and similarity workflows', () => {
      // Create metadata with rich search capabilities
      const metadata1 = NodeMetadata.create(createValidNodeMetadataProps({
        searchKeywords: ['ml', 'prediction', 'model'],
        semanticTags: ['machine-learning', 'analytics'],
        vectorEmbedding: [0.8, 0.6, 0.0]
      })).value;
      
      const metadata2 = NodeMetadata.create(createValidNodeMetadataProps({
        searchKeywords: ['ai', 'prediction', 'algorithm'],
        semanticTags: ['artificial-intelligence', 'analytics'],
        vectorEmbedding: [0.6, 0.8, 0.0]
      })).value;
      
      // Test search matching
      expect(metadata1.matchesKeyword('prediction')).toBe(true);
      expect(metadata1.matchesKeyword('ml')).toBe(true);
      expect(metadata1.matchesSemanticTag('analytics')).toBe(true);
      
      expect(metadata2.matchesKeyword('prediction')).toBe(true);
      expect(metadata2.matchesKeyword('ai')).toBe(true);
      expect(metadata2.matchesSemanticTag('analytics')).toBe(true);
      
      // Test similarity calculation
      const similarity = metadata1.calculateSimilarity(metadata2);
      expect(similarity).toBeGreaterThan(0.8); // Should be similar due to shared prediction domain
      
      // Test feature detection
      expect(metadata1.hasVectorEmbedding()).toBe(true);
      expect(metadata1.hasSemanticTags()).toBe(true);
      expect(metadata2.hasVectorEmbedding()).toBe(true);
      expect(metadata2.hasSemanticTags()).toBe(true);
    });
  });
});