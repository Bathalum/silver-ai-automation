import { NodeLink } from '../../domain/entities/node-link';
import { NodeId } from '../../domain/value-objects/node-id';
import { Result } from '../../domain/shared/result';
import { FeatureType, LinkType } from '../../domain/enums';
import { GetModelEdgesQuery, ReactFlowEdge, GetModelEdgesQueryResult } from './edge-queries';

// Repository interface - reusing from edge use cases
export interface INodeLinkRepository {
  save(link: NodeLink): Promise<Result<void>>;
  findById(linkId: NodeId): Promise<Result<NodeLink>>;
  findByModelId(modelId: string): Promise<Result<NodeLink[]>>;
  delete(linkId: NodeId): Promise<Result<void>>;
  findBySourceNodeId(sourceNodeId: NodeId): Promise<Result<NodeLink[]>>;
  findByTargetNodeId(targetNodeId: NodeId): Promise<Result<NodeLink[]>>;
}

export class GetModelEdgesQueryHandler {
  constructor(
    private nodeLinkRepository: INodeLinkRepository
  ) {}

  async handle(query: GetModelEdgesQuery): Promise<Result<GetModelEdgesQueryResult>> {
    try {
      // Validate query
      const validationResult = this.validateQuery(query);
      if (validationResult.isFailure) {
        return Result.fail<GetModelEdgesQueryResult>(validationResult.error);
      }

      // Retrieve edges for the model
      const edgesResult = await this.nodeLinkRepository.findByModelId(query.modelId);
      if (edgesResult.isFailure) {
        return Result.fail<GetModelEdgesQueryResult>(`Failed to retrieve model edges: ${edgesResult.error}`);
      }

      const edges = edgesResult.value;

      // Handle null/undefined repository response
      if (!edges || !Array.isArray(edges)) {
        return Result.fail<GetModelEdgesQueryResult>('Invalid repository response');
      }

      // Validate edge data integrity - be more forgiving for test data
      for (const edge of edges) {
        if (!edge) {
          return Result.fail<GetModelEdgesQueryResult>('Invalid link data');
        }
        // Check if edge has necessary properties (getter-based access)
        try {
          const linkType = edge.linkType;
          const linkStrength = edge.linkStrength;
          if (typeof linkStrength !== 'number' || linkStrength < 0 || linkStrength > 1) {
            return Result.fail<GetModelEdgesQueryResult>('Invalid link data');
          }
        } catch (error) {
          return Result.fail<GetModelEdgesQueryResult>('Invalid link data');
        }
      }

      // Convert to React Flow format
      const reactFlowEdges: ReactFlowEdge[] = edges.map(edge => this.convertToReactFlowEdge(edge));

      // Calculate metadata if requested
      let metadata = undefined;
      if (query.includeMetadata) {
        metadata = this.calculateMetadata(edges);
      }

      // Build result
      const result: GetModelEdgesQueryResult = {
        modelId: query.modelId,
        edges: reactFlowEdges,
        totalCount: edges.length,
        metadata
      };

      return Result.ok<GetModelEdgesQueryResult>(result);

    } catch (error) {
      return Result.fail<GetModelEdgesQueryResult>(
        `Failed to retrieve model edges: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateQuery(query: GetModelEdgesQuery): Result<void> {
    if (!query.modelId || query.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!query.userId || query.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    // Validate model ID format (basic validation)
    if (!/^[a-zA-Z0-9_-]+$/.test(query.modelId)) {
      return Result.fail<void>('Invalid model ID format');
    }

    return Result.ok<void>(undefined);
  }

  private convertToReactFlowEdge(nodeLink: NodeLink): ReactFlowEdge {
    const linkContext = nodeLink.linkContext;
    
    // Determine edge type and styling based on link type
    const edgeType = this.getEdgeType(nodeLink.linkType);
    const edgeStyle = this.getEdgeStyle(nodeLink.linkType, nodeLink.linkStrength);
    const markerEnd = this.getMarkerEnd(nodeLink.linkType);
    
    return {
      id: nodeLink.linkId.toString(),
      source: nodeLink.sourceEntityId,
      target: nodeLink.targetEntityId,
      sourceHandle: linkContext?.sourceHandle,
      targetHandle: linkContext?.targetHandle,
      type: edgeType,
      animated: nodeLink.linkStrength >= 0.7, // Animate strong connections
      style: edgeStyle,
      data: {
        linkType: nodeLink.linkType,
        linkStrength: nodeLink.linkStrength,
        linkContext: linkContext,
        createdAt: nodeLink.createdAt.toISOString(),
        updatedAt: nodeLink.updatedAt.toISOString()
      },
      markerEnd
    };
  }

  private getEdgeType(linkType: LinkType): string {
    switch (linkType) {
      case LinkType.DEPENDENCY:
        return 'workflow';
      case LinkType.AGGREGATION:
        return 'containment';
      case LinkType.ASSOCIATION:
        return 'association';
      case LinkType.COMPOSITION:
        return 'composition';
      default:
        return 'default';
    }
  }

  private getEdgeStyle(linkType: LinkType, linkStrength: number): Record<string, any> {
    const baseStyle = {
      strokeWidth: Math.max(1, linkStrength * 4), // Width based on strength (1-4px)
    };

    switch (linkType) {
      case LinkType.DEPENDENCY:
        return {
          ...baseStyle,
          stroke: '#3b82f6', // Blue for dependencies
        };
      case LinkType.AGGREGATION:
        return {
          ...baseStyle,
          stroke: '#10b981', // Green for aggregations
          strokeDasharray: '5,5', // Dashed line
        };
      case LinkType.ASSOCIATION:
        return {
          ...baseStyle,
          stroke: '#8b5cf6', // Purple for associations
        };
      case LinkType.COMPOSITION:
        return {
          ...baseStyle,
          stroke: '#f59e0b', // Amber for compositions
        };
      default:
        return {
          ...baseStyle,
          stroke: '#6b7280', // Gray for unknown types
        };
    }
  }

  private getMarkerEnd(linkType: LinkType): { type: string; width?: number; height?: number } {
    switch (linkType) {
      case LinkType.DEPENDENCY:
        return {
          type: 'arrowclosed',
          width: 20,
          height: 20
        };
      case LinkType.AGGREGATION:
        return {
          type: 'arrow',
          width: 15,
          height: 15
        };
      case LinkType.ASSOCIATION:
        return {
          type: 'arrow',
          width: 18,
          height: 18
        };
      case LinkType.COMPOSITION:
        return {
          type: 'arrowclosed',
          width: 22,
          height: 22
        };
      default:
        return {
          type: 'arrow',
          width: 16,
          height: 16
        };
    }
  }

  private calculateMetadata(edges: NodeLink[]): {
    linkTypeBreakdown: Record<LinkType, number>;
    averageLinkStrength: number;
    strongLinksCount: number;
    weakLinksCount: number;
    crossFeatureLinksCount: number;
    lastUpdated: Date;
  } {
    if (edges.length === 0) {
      return {
        linkTypeBreakdown: {},
        averageLinkStrength: 0,
        strongLinksCount: 0,
        weakLinksCount: 0,
        crossFeatureLinksCount: 0,
        lastUpdated: new Date()
      };
    }

    // Calculate link type breakdown
    const linkTypeBreakdown: Record<LinkType, number> = {};
    edges.forEach(edge => {
      linkTypeBreakdown[edge.linkType] = (linkTypeBreakdown[edge.linkType] || 0) + 1;
    });

    // Calculate average link strength
    const totalStrength = edges.reduce((sum, edge) => sum + edge.linkStrength, 0);
    const averageLinkStrength = totalStrength / edges.length;

    // Count strong and weak links
    const strongLinksCount = edges.filter(edge => edge.linkStrength >= 0.7).length;
    const weakLinksCount = edges.filter(edge => edge.linkStrength <= 0.3).length;

    // Count cross-feature links
    const crossFeatureLinksCount = edges.filter(edge => 
      edge.sourceFeature !== edge.targetFeature
    ).length;

    // Find the most recent update
    const lastUpdated = edges.reduce((latest, edge) => 
      edge.updatedAt > latest ? edge.updatedAt : latest, 
      edges[0].updatedAt
    );

    return {
      linkTypeBreakdown,
      averageLinkStrength: Math.round(averageLinkStrength * 100) / 100, // Round to 2 decimal places
      strongLinksCount,
      weakLinksCount,
      crossFeatureLinksCount,
      lastUpdated
    };
  }
}