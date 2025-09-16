import { LinkType } from '../../domain/enums';

/**
 * Queries for edge operations in the function model workflow designer
 */

export interface GetModelEdgesQuery {
  modelId: string;
  userId: string;
  includeMetadata?: boolean;
  includeDeleted?: boolean;
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