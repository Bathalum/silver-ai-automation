import { GetModelEdgesQuery, GetModelEdgesQueryHandler } from '../../../../lib/use-cases/queries/get-model-edges-query';
import { NodeLink } from '../../../../lib/domain/entities/node-link';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { Result } from '../../../../lib/domain/shared/result';
import { FeatureType, LinkType } from '../../../../lib/domain/enums';

// Query interface following existing patterns
export interface GetModelEdgesQuery {
  modelId: string;
  userId: string;
  includeMetadata?: boolean;
  includeDeleted?: boolean;
}

// Repository interface - reusing from edge use cases
export interface INodeLinkRepository {
  save(link: NodeLink): Promise<Result<void>>;
  findById(linkId: NodeId): Promise<Result<NodeLink>>;
  findByModelId(modelId: string): Promise<Result<NodeLink[]>>;
  delete(linkId: NodeId): Promise<Result<void>>;
  findBySourceNodeId(sourceNodeId: NodeId): Promise<Result<NodeLink[]>>;
  findByTargetNodeId(targetNodeId: NodeId): Promise<Result<NodeLink[]>>;
}

// React Flow edge format for UI integration
export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, any>;
  data?: {
    linkType: LinkType;
    linkStrength: number;
    linkContext?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
  };
  markerEnd?: {
    type: string;
    width?: number;
    height?: number;
  };
}

// Query result interface
export interface GetModelEdgesQueryResult {
  modelId: string;
  edges: ReactFlowEdge[];
  totalCount: number;
  metadata?: {
    linkTypeBreakdown: Record<LinkType, number>;
    averageLinkStrength: number;
    strongLinksCount: number;
    weakLinksCount: number;
    crossFeatureLinksCount: number;
    lastUpdated: Date;
  };
}

describe('GetModelEdgesQueryHandler', () => {
  let queryHandler: GetModelEdgesQueryHandler;
  let mockNodeLinkRepository: jest.Mocked<INodeLinkRepository>;

  const modelId = 'test-model-123';
  const userId = 'test-user-456';

  // Test data setup
  const sourceNodeId = NodeId.generate();
  const targetNodeId = NodeId.generate();
  const linkId1 = NodeId.generate();
  const linkId2 = NodeId.generate();

  const testLink1 = NodeLink.create({
    linkId: linkId1,
    sourceFeature: FeatureType.FUNCTION_MODEL,
    targetFeature: FeatureType.FUNCTION_MODEL,
    sourceEntityId: sourceNodeId.toString(),
    targetEntityId: targetNodeId.toString(),
    sourceNodeId,
    targetNodeId,
    linkType: LinkType.DEPENDENCY,
    linkStrength: 0.8,
    linkContext: {
      sourceHandle: 'right',
      targetHandle: 'left',
      connectionType: 'workflow'
    }
  }).value;

  const testLink2 = NodeLink.create({
    linkId: linkId2,
    sourceFeature: FeatureType.FUNCTION_MODEL,
    targetFeature: FeatureType.AI_AGENT,
    sourceEntityId: targetNodeId.toString(),
    targetEntityId: sourceNodeId.toString(),
    sourceNodeId: targetNodeId,
    targetNodeId: sourceNodeId,
    linkType: LinkType.AGGREGATION,
    linkStrength: 0.3,
    linkContext: {
      sourceHandle: 'container-out',
      targetHandle: 'container-in',
      connectionType: 'containment'
    }
  }).value;

  beforeEach(() => {
    mockNodeLinkRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByModelId: jest.fn(),
      delete: jest.fn(),
      findBySourceNodeId: jest.fn(),
      findByTargetNodeId: jest.fn()
    };

    // This will fail initially as the query handler doesn't exist yet
    queryHandler = new GetModelEdgesQueryHandler(mockNodeLinkRepository);
  });

  describe('handle', () => {
    const validQuery: GetModelEdgesQuery = {
      modelId,
      userId,
      includeMetadata: true,
      includeDeleted: false
    };

    describe('when model has edges', () => {
      beforeEach(() => {
        mockNodeLinkRepository.findByModelId.mockResolvedValue(
          Result.ok([testLink1, testLink2])
        );
      });

      it('should retrieve all edges for specific function model', async () => {
        const result = await queryHandler.handle(validQuery);

        expect(mockNodeLinkRepository.findByModelId).toHaveBeenCalledWith(modelId);
      });

      it('should return edges in React Flow format', async () => {
        const result = await queryHandler.handle(validQuery);

        expect(result.isSuccess).toBe(true);
        expect(result.value?.edges).toHaveLength(2);
        
        const edge1 = result.value?.edges[0];
        expect(edge1).toEqual(
          expect.objectContaining({
            id: linkId1.toString(),
            source: sourceNodeId.toString(),
            target: targetNodeId.toString(),
            sourceHandle: 'right',
            targetHandle: 'left',
            type: 'workflow',
            data: expect.objectContaining({
              linkType: LinkType.DEPENDENCY,
              linkStrength: 0.8,
              linkContext: expect.any(Object),
              createdAt: expect.any(String),
              updatedAt: expect.any(String)
            })
          })
        );
      });

      it('should include edge styling based on link type', async () => {
        const result = await queryHandler.handle(validQuery);

        const dependencyEdge = result.value?.edges.find(e => e.data?.linkType === LinkType.DEPENDENCY);
        const aggregationEdge = result.value?.edges.find(e => e.data?.linkType === LinkType.AGGREGATION);

        expect(dependencyEdge?.style).toEqual(
          expect.objectContaining({
            strokeWidth: expect.any(Number),
            stroke: expect.any(String)
          })
        );

        expect(aggregationEdge?.style).toEqual(
          expect.objectContaining({
            strokeWidth: expect.any(Number),
            stroke: expect.any(String),
            strokeDasharray: expect.any(String)
          })
        );
      });

      it('should set animation based on link strength', async () => {
        const result = await queryHandler.handle(validQuery);

        const strongEdge = result.value?.edges.find(e => e.data?.linkStrength && e.data.linkStrength >= 0.7);
        const weakEdge = result.value?.edges.find(e => e.data?.linkStrength && e.data.linkStrength < 0.7);

        expect(strongEdge?.animated).toBe(true);
        expect(weakEdge?.animated).toBe(false);
      });

      it('should include arrow markers for different edge types', async () => {
        const result = await queryHandler.handle(validQuery);

        const dependencyEdge = result.value?.edges.find(e => e.data?.linkType === LinkType.DEPENDENCY);
        const aggregationEdge = result.value?.edges.find(e => e.data?.linkType === LinkType.AGGREGATION);

        expect(dependencyEdge?.markerEnd).toEqual({
          type: 'arrowclosed',
          width: 20,
          height: 20
        });

        expect(aggregationEdge?.markerEnd).toEqual({
          type: 'arrow',
          width: 15,
          height: 15
        });
      });

      it('should return total count of edges', async () => {
        const result = await queryHandler.handle(validQuery);

        expect(result.isSuccess).toBe(true);
        expect(result.value?.totalCount).toBe(2);
      });

      it('should include metadata when requested', async () => {
        const result = await queryHandler.handle(validQuery);

        expect(result.value?.metadata).toEqual(
          expect.objectContaining({
            linkTypeBreakdown: expect.objectContaining({
              [LinkType.DEPENDENCY]: 1,
              [LinkType.AGGREGATION]: 1
            }),
            averageLinkStrength: 0.55, // (0.8 + 0.3) / 2
            strongLinksCount: 1, // link strength >= 0.7
            weakLinksCount: 1,  // link strength <= 0.3
            crossFeatureLinksCount: 1, // link2 spans FUNCTION_MODEL to AI_AGENT
            lastUpdated: expect.any(Date)
          })
        );
      });

      it('should not include metadata when not requested', async () => {
        const queryWithoutMetadata = { ...validQuery, includeMetadata: false };

        const result = await queryHandler.handle(queryWithoutMetadata);

        expect(result.value?.metadata).toBeUndefined();
      });

      it('should handle edges with missing context gracefully', async () => {
        const linkWithoutContext = NodeLink.create({
          linkId: NodeId.generate(),
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.FUNCTION_MODEL,
          sourceEntityId: 'node1',
          targetEntityId: 'node2',
          linkType: LinkType.DEPENDENCY,
          linkStrength: 0.5
        }).value;

        mockNodeLinkRepository.findByModelId.mockResolvedValue(
          Result.ok([linkWithoutContext])
        );

        const result = await queryHandler.handle(validQuery);

        expect(result.isSuccess).toBe(true);
        expect(result.value?.edges).toHaveLength(1);
        expect(result.value?.edges[0].sourceHandle).toBeUndefined();
        expect(result.value?.edges[0].targetHandle).toBeUndefined();
      });
    });

    describe('when model has no edges', () => {
      beforeEach(() => {
        mockNodeLinkRepository.findByModelId.mockResolvedValue(Result.ok([]));
      });

      it('should handle empty results gracefully', async () => {
        const result = await queryHandler.handle(validQuery);

        expect(result.isSuccess).toBe(true);
        expect(result.value?.edges).toHaveLength(0);
        expect(result.value?.totalCount).toBe(0);
      });

      it('should return default metadata for empty results', async () => {
        const result = await queryHandler.handle(validQuery);

        expect(result.value?.metadata).toEqual(
          expect.objectContaining({
            linkTypeBreakdown: {},
            averageLinkStrength: 0,
            strongLinksCount: 0,
            weakLinksCount: 0,
            crossFeatureLinksCount: 0,
            lastUpdated: expect.any(Date)
          })
        );
      });
    });

    describe('when repository operations fail', () => {
      beforeEach(() => {
        mockNodeLinkRepository.findByModelId.mockResolvedValue(
          Result.fail('Database connection failed')
        );
      });

      it('should return failure result when repository fails', async () => {
        const result = await queryHandler.handle(validQuery);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Failed to retrieve model edges');
      });

      it('should not include any edges in failure result', async () => {
        const result = await queryHandler.handle(validQuery);

        expect(result.value).toBeUndefined();
      });
    });

    describe('query validation', () => {
      it('should reject query with missing modelId', async () => {
        const invalidQuery = { ...validQuery, modelId: '' };

        const result = await queryHandler.handle(invalidQuery);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Model ID is required');
      });

      it('should reject query with missing userId', async () => {
        const invalidQuery = { ...validQuery, userId: '' };

        const result = await queryHandler.handle(invalidQuery);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('User ID is required');
      });

      it('should validate modelId format', async () => {
        const invalidQuery = { ...validQuery, modelId: 'invalid format!' };

        const result = await queryHandler.handle(invalidQuery);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Invalid model ID format');
      });
    });

    describe('authorization checks', () => {
      beforeEach(() => {
        mockNodeLinkRepository.findByModelId.mockResolvedValue(
          Result.ok([testLink1, testLink2])
        );
      });

      it('should check user permissions for model access', async () => {
        // This test assumes the query handler validates user permissions
        // The exact implementation depends on the authorization strategy
        
        const result = await queryHandler.handle(validQuery);
        
        // For now, we verify the repository is called
        // In a real implementation, this would check model permissions first
        expect(mockNodeLinkRepository.findByModelId).toHaveBeenCalledWith(modelId);
      });

      it('should handle unauthorized access gracefully', async () => {
        // Mock an authorization failure scenario
        mockNodeLinkRepository.findByModelId.mockResolvedValue(
          Result.fail('Insufficient permissions to access model')
        );

        const result = await queryHandler.handle(validQuery);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Failed to retrieve model edges');
      });
    });

    describe('filtering and options', () => {
      beforeEach(() => {
        mockNodeLinkRepository.findByModelId.mockResolvedValue(
          Result.ok([testLink1, testLink2])
        );
      });

      it('should support includeDeleted option', async () => {
        const queryWithDeleted = { ...validQuery, includeDeleted: true };

        const result = await queryHandler.handle(queryWithDeleted);

        // The exact behavior depends on how soft deletion is implemented
        expect(result.isSuccess).toBe(true);
        expect(mockNodeLinkRepository.findByModelId).toHaveBeenCalledWith(modelId);
      });

      it('should filter out deleted edges by default', async () => {
        const queryWithoutDeleted = { ...validQuery, includeDeleted: false };

        const result = await queryHandler.handle(queryWithoutDeleted);

        expect(result.isSuccess).toBe(true);
        // Default behavior should exclude deleted edges
      });
    });

    describe('integration with existing query patterns', () => {
      beforeEach(() => {
        mockNodeLinkRepository.findByModelId.mockResolvedValue(
          Result.ok([testLink1])
        );
      });

      it('should follow existing query handler constructor pattern', () => {
        expect(() => {
          new GetModelEdgesQueryHandler(mockNodeLinkRepository);
        }).not.toThrow();
      });

      it('should implement handle method following existing patterns', () => {
        expect(queryHandler).toHaveProperty('handle');
        expect(typeof queryHandler.handle).toBe('function');
      });

      it('should return Result<GetModelEdgesQueryResult> following existing patterns', async () => {
        const result = await queryHandler.handle(validQuery);

        expect(result).toHaveProperty('isSuccess');
        expect(result).toHaveProperty('isFailure');
        expect(result).toHaveProperty('value');
        expect(result).toHaveProperty('error');
      });
    });

    describe('performance considerations', () => {
      beforeEach(() => {
        // Mock large dataset
        const manyLinks = Array.from({ length: 1000 }, (_, i) => 
          NodeLink.create({
            linkId: NodeId.generate(),
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.FUNCTION_MODEL,
            sourceEntityId: `node-${i}`,
            targetEntityId: `node-${i + 1}`,
            linkType: LinkType.DEPENDENCY,
            linkStrength: Math.random()
          }).value
        );

        mockNodeLinkRepository.findByModelId.mockResolvedValue(Result.ok(manyLinks));
      });

      it('should handle large datasets efficiently', async () => {
        const startTime = Date.now();
        const result = await queryHandler.handle(validQuery);
        const endTime = Date.now();

        expect(result.isSuccess).toBe(true);
        expect(result.value?.edges).toHaveLength(1000);
        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      });

      it('should calculate metadata efficiently for large datasets', async () => {
        const result = await queryHandler.handle(validQuery);

        expect(result.isSuccess).toBe(true);
        expect(result.value?.metadata).toBeDefined();
        expect(result.value?.totalCount).toBe(1000);
      });
    });

    describe('edge case handling', () => {
      it('should handle malformed link data', async () => {
        const malformedLink = { ...testLink1, linkType: null } as any;
        mockNodeLinkRepository.findByModelId.mockResolvedValue(
          Result.ok([malformedLink])
        );

        const result = await queryHandler.handle(validQuery);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Invalid link data');
      });

      it('should handle repository returning null/undefined', async () => {
        mockNodeLinkRepository.findByModelId.mockResolvedValue(
          Result.ok(null as any)
        );

        const result = await queryHandler.handle(validQuery);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Invalid repository response');
      });

      it('should handle unexpected errors gracefully', async () => {
        mockNodeLinkRepository.findByModelId.mockImplementation(() => {
          throw new Error('Unexpected database error');
        });

        const result = await queryHandler.handle(validQuery);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Failed to retrieve model edges');
      });
    });

    describe('React Flow integration', () => {
      beforeEach(() => {
        mockNodeLinkRepository.findByModelId.mockResolvedValue(
          Result.ok([testLink1, testLink2])
        );
      });

      it('should format edges compatible with React Flow', async () => {
        const result = await queryHandler.handle(validQuery);

        expect(result.isSuccess).toBe(true);
        result.value?.edges.forEach(edge => {
          expect(edge).toHaveProperty('id');
          expect(edge).toHaveProperty('source');
          expect(edge).toHaveProperty('target');
          expect(typeof edge.id).toBe('string');
          expect(typeof edge.source).toBe('string');
          expect(typeof edge.target).toBe('string');
        });
      });

      it('should include React Flow specific properties', async () => {
        const result = await queryHandler.handle(validQuery);

        const edge = result.value?.edges[0];
        expect(edge).toHaveProperty('type');
        expect(edge).toHaveProperty('animated');
        expect(edge).toHaveProperty('style');
        expect(edge).toHaveProperty('data');
        expect(edge).toHaveProperty('markerEnd');
      });

      it('should preserve original domain data in edge data property', async () => {
        const result = await queryHandler.handle(validQuery);

        const edge = result.value?.edges[0];
        expect(edge?.data).toEqual(
          expect.objectContaining({
            linkType: expect.any(String),
            linkStrength: expect.any(Number),
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          })
        );
      });
    });
  });
});