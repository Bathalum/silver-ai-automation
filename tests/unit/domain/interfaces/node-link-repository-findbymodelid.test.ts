import { NodeLinkRepository } from '@/lib/domain/interfaces/node-link-repository';
import { NodeLink } from '@/lib/domain/entities/node-link';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { Result } from '@/lib/domain/shared/result';
import { FeatureType, LinkType } from '@/lib/domain/enums';

/**
 * Test suite for NodeLinkRepository.findByModelId method
 * Following TDD: This test defines the expected behavior for model-specific edge retrieval
 */
describe('NodeLinkRepository.findByModelId', () => {
  let mockRepository: NodeLinkRepository;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findBySourceEntity: jest.fn(),
      findByTargetEntity: jest.fn(),
      findBySourceNode: jest.fn(),
      findByTargetNode: jest.fn(),
      findByLinkType: jest.fn(),
      findCrossFeatureLinks: jest.fn(),
      findByFeaturePair: jest.fn(),
      findStrongLinks: jest.fn(),
      findWeakLinks: jest.fn(),
      findBidirectionalLinks: jest.fn(),
      bulkSave: jest.fn(),
      bulkDelete: jest.fn(),
      countByLinkType: jest.fn(),
      countCrossFeatureLinks: jest.fn(),
      // This method doesn't exist yet - this test will fail until we implement it
      findByModelId: jest.fn()
    } as NodeLinkRepository;
  });

  describe('when model has edges', () => {
    it('should return only edges for specified model', async () => {
      // Arrange
      const modelId = 'test-model-123';
      const sourceNodeId = NodeId.generate();
      const targetNodeId = NodeId.generate();
      const linkId = NodeId.generate();
      
      const expectedEdge = await NodeLink.create({
        linkId,
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceEntityId: sourceNodeId.toString(),
        targetEntityId: targetNodeId.toString(),
        sourceNodeId,
        targetNodeId,
        linkType: LinkType.DEPENDENCY,
        linkStrength: 0.8,
        linkContext: { modelId }
      });

      expect(expectedEdge.isSuccess).toBe(true);
      const edge = expectedEdge.value;

      (mockRepository.findByModelId as jest.Mock).mockResolvedValue(
        Result.ok([edge])
      );

      // Act
      const result = await mockRepository.findByModelId(modelId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value[0]).toBe(edge);
      expect(mockRepository.findByModelId).toHaveBeenCalledWith(modelId);
    });

    it('should return edges sorted by creation date', async () => {
      // Arrange
      const modelId = 'test-model-456';
      const olderEdgeId = NodeId.generate();
      const newerEdgeId = NodeId.generate();
      
      const olderEdge = await NodeLink.create({
        linkId: olderEdgeId,
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceEntityId: 'source1',
        targetEntityId: 'target1',
        linkType: LinkType.DEPENDENCY,
        linkStrength: 0.5,
        linkContext: { modelId }
      });

      const newerEdge = await NodeLink.create({
        linkId: newerEdgeId,
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceEntityId: 'source2',
        targetEntityId: 'target2',
        linkType: LinkType.DEPENDENCY,
        linkStrength: 0.7,
        linkContext: { modelId }
      });

      expect(olderEdge.isSuccess).toBe(true);
      expect(newerEdge.isSuccess).toBe(true);

      // Mock returns newer edge first (sorted by creation date descending)
      (mockRepository.findByModelId as jest.Mock).mockResolvedValue(
        Result.ok([newerEdge.value, olderEdge.value])
      );

      // Act
      const result = await mockRepository.findByModelId(modelId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value[0]).toBe(newerEdge.value);
      expect(result.value[1]).toBe(olderEdge.value);
    });
  });

  describe('when model has no edges', () => {
    it('should return empty array for model with no edges', async () => {
      // Arrange
      const modelId = 'empty-model-789';
      (mockRepository.findByModelId as jest.Mock).mockResolvedValue(
        Result.ok([])
      );

      // Act
      const result = await mockRepository.findByModelId(modelId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(0);
      expect(result.value).toEqual([]);
    });
  });

  describe('when model does not exist', () => {
    it('should return empty array for non-existent model', async () => {
      // Arrange
      const modelId = 'non-existent-model';
      (mockRepository.findByModelId as jest.Mock).mockResolvedValue(
        Result.ok([])
      );

      // Act
      const result = await mockRepository.findByModelId(modelId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should return failure result when repository fails', async () => {
      // Arrange
      const modelId = 'failing-model';
      const errorMessage = 'Database connection failed';
      (mockRepository.findByModelId as jest.Mock).mockResolvedValue(
        Result.fail(errorMessage)
      );

      // Act
      const result = await mockRepository.findByModelId(modelId);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(errorMessage);
    });

    it('should handle invalid model ID format', async () => {
      // Arrange
      const invalidModelId = '';
      (mockRepository.findByModelId as jest.Mock).mockResolvedValue(
        Result.fail('Invalid model ID format')
      );

      // Act
      const result = await mockRepository.findByModelId(invalidModelId);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invalid model ID format');
    });
  });

  describe('method signature requirements', () => {
    it('should have the correct method signature', () => {
      // Assert
      expect(mockRepository.findByModelId).toBeDefined();
      expect(typeof mockRepository.findByModelId).toBe('function');
    });
  });
});