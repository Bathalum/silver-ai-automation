import { SupabaseNodeLinkRepository } from '../../../lib/infrastructure/repositories/supabase-node-link-repository';
import { NodeLink } from '../../../lib/domain/entities/node-link';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { FeatureType, LinkType } from '../../../lib/domain/enums';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Integration test for SupabaseNodeLinkRepository.findByModelId method
 * Tests actual database queries with function_model_nodes join
 */
describe('SupabaseNodeLinkRepository.findByModelId Integration', () => {
  let repository: SupabaseNodeLinkRepository;
  let supabaseClient: any;
  const testModelId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
  const testModelId2 = 'b2c3d4e5-f6g7-8901-2345-678901bcdefg';

  beforeAll(async () => {
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    repository = new SupabaseNodeLinkRepository(supabaseClient);
  });

  beforeEach(async () => {
    // Clean up test data
    await supabaseClient.from('node_links').delete().neq('link_id', '00000000-0000-0000-0000-000000000000');
    await supabaseClient.from('function_model_nodes').delete().neq('node_id', '00000000-0000-0000-0000-000000000000');
    await supabaseClient.from('function_models').delete().neq('model_id', '00000000-0000-0000-0000-000000000000');
  });

  afterAll(async () => {
    // Final cleanup
    await supabaseClient.from('node_links').delete().neq('link_id', '00000000-0000-0000-0000-000000000000');
    await supabaseClient.from('function_model_nodes').delete().neq('node_id', '00000000-0000-0000-0000-000000000000');
    await supabaseClient.from('function_models').delete().neq('model_id', '00000000-0000-0000-0000-000000000000');
  });

  describe('when model has node links', () => {
    it('should return links where both nodes belong to same model', async () => {
      // Arrange: Create function models
      await supabaseClient.from('function_models').insert([
        { model_id: testModelId, name: 'Test Model 1', description: 'Test model' },
        { model_id: testModelId2, name: 'Test Model 2', description: 'Another test model' }
      ]);

      // Create nodes in model 1
      const sourceNodeId = '12345678-1234-4567-8901-123456789012';
      const targetNodeId = '12345678-1234-4567-8901-123456789013';
      await supabaseClient.from('function_model_nodes').insert([
        {
          node_id: sourceNodeId,
          model_id: testModelId,
          node_type: 'ioNode',
          name: 'Source Node'
        },
        {
          node_id: targetNodeId,
          model_id: testModelId,
          node_type: 'stageNode',
          name: 'Target Node'
        }
      ]);

      // Create a node in model 2 (should not be returned)
      const otherNodeId = '12345678-1234-4567-8901-123456789014';
      await supabaseClient.from('function_model_nodes').insert({
        node_id: otherNodeId,
        model_id: testModelId2,
        node_type: 'ioNode',
        name: 'Other Node'
      });

      // Create NodeLink between nodes in model 1
      const linkId = NodeId.generate();
      const sourceNodeIdObj = NodeId.create(sourceNodeId);
      const targetNodeIdObj = NodeId.create(targetNodeId);
      
      if (sourceNodeIdObj.isFailure || targetNodeIdObj.isFailure) {
        throw new Error(`Failed to create NodeId objects: ${sourceNodeIdObj.error || targetNodeIdObj.error}`);
      }

      const nodeLink = NodeLink.create({
        linkId,
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceEntityId: sourceNodeId,
        targetEntityId: targetNodeId,
        sourceNodeId: sourceNodeIdObj.value,
        targetNodeId: targetNodeIdObj.value,
        linkType: LinkType.DEPENDENCY,
        linkStrength: 0.8,
        linkContext: { connectionType: 'workflow' }
      });

      if (nodeLink.isFailure) {
        console.error('NodeLink creation failed:', nodeLink.error);
      }
      expect(nodeLink.isSuccess).toBe(true);
      
      const saveResult = await repository.save(nodeLink.value);
      if (saveResult.isFailure) {
        console.error('Save failed:', saveResult.error);
      }
      expect(saveResult.isSuccess).toBe(true);

      // Act: Find links by model ID
      const result = await repository.findByModelId(testModelId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      
      const foundLink = result.value[0];
      expect(foundLink.linkId.value).toBe(linkId.value);
      expect(foundLink.sourceEntityId).toBe(sourceNodeId);
      expect(foundLink.targetEntityId).toBe(targetNodeId);
    });

    it('should return empty array for model with no links', async () => {
      // Arrange: Create function model with no links
      await supabaseClient.from('function_models').insert({
        model_id: testModelId,
        name: 'Empty Model',
        description: 'Model with no links'
      });

      // Act: Find links by model ID
      const result = await repository.findByModelId(testModelId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(0);
    });

    it('should return links ordered by creation date descending', async () => {
      // Arrange: Create function model and nodes
      await supabaseClient.from('function_models').insert({
        model_id: testModelId,
        name: 'Test Model',
        description: 'Test model'
      });

      const sourceNodeId1 = '12345678-1234-4567-8901-123456789012';
      const targetNodeId1 = '12345678-1234-4567-8901-123456789013';
      const sourceNodeId2 = '12345678-1234-4567-8901-123456789014';
      const targetNodeId2 = '12345678-1234-4567-8901-123456789015';

      await supabaseClient.from('function_model_nodes').insert([
        { node_id: sourceNodeId1, model_id: testModelId, node_type: 'ioNode', name: 'Node 1' },
        { node_id: targetNodeId1, model_id: testModelId, node_type: 'stageNode', name: 'Node 2' },
        { node_id: sourceNodeId2, model_id: testModelId, node_type: 'ioNode', name: 'Node 3' },
        { node_id: targetNodeId2, model_id: testModelId, node_type: 'stageNode', name: 'Node 4' }
      ]);

      // Create first link (older)
      const linkId1 = NodeId.generate();
      const nodeLink1 = await NodeLink.create({
        linkId: linkId1,
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceEntityId: sourceNodeId1,
        targetEntityId: targetNodeId1,
        linkType: LinkType.DEPENDENCY,
        linkStrength: 0.5
      });

      expect(nodeLink1.isSuccess).toBe(true);
      await repository.save(nodeLink1.value);

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      // Create second link (newer)
      const linkId2 = NodeId.generate();
      const nodeLink2 = await NodeLink.create({
        linkId: linkId2,
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceEntityId: sourceNodeId2,
        targetEntityId: targetNodeId2,
        linkType: LinkType.DEPENDENCY,
        linkStrength: 0.7
      });

      expect(nodeLink2.isSuccess).toBe(true);
      await repository.save(nodeLink2.value);

      // Act: Find links by model ID
      const result = await repository.findByModelId(testModelId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      
      // Should be ordered by creation date descending (newer first)
      expect(result.value[0].linkId.value).toBe(linkId2.value);
      expect(result.value[1].linkId.value).toBe(linkId1.value);
    });
  });

  describe('error handling', () => {
    it('should handle invalid model ID format gracefully', async () => {
      // Act: Try to find links with invalid model ID
      const result = await repository.findByModelId('invalid-model-id');

      // Assert: Should still return successful empty result
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(0);
    });

    it('should handle database connection errors', async () => {
      // Arrange: Create repository with invalid client
      const invalidClient = createClient('https://invalid.supabase.co', 'invalid-key');
      const invalidRepository = new SupabaseNodeLinkRepository(invalidClient);

      // Act: Try to find links
      const result = await invalidRepository.findByModelId(testModelId);

      // Assert: Should return failure result
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('error');
    });
  });
});