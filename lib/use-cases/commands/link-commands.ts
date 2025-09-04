import { FeatureType, LinkType } from '../../domain/enums';

/**
 * Commands for cross-feature linking use cases
 * These commands define the interface contracts that use cases expect
 */

export interface CreateCrossFeatureLinkCommand {
  sourceFeature: FeatureType;
  targetFeature: FeatureType;
  sourceId: string;
  targetId: string;
  linkType: LinkType;
  initialStrength: number;
  nodeContext?: Record<string, any>;
  createdBy: string;
}

export interface CalculateLinkStrengthCommand {
  linkId: string;
  timeWindowHours: number;
  includeSemanticAnalysis?: boolean;
  includeContextAnalysis?: boolean;
}

export interface DetectRelationshipCyclesCommand {
  targetFeature?: FeatureType;
  includeAllFeatures: boolean;
  includeCriticalCyclesOnly?: boolean;
  maxCycleLength?: number;
  criticalLengthThreshold?: number;
}

export interface UpdateLinkStrengthCommand {
  linkId: string;
  newStrength: number;
  updatedBy: string;
  reason?: string;
}

export interface RemoveCrossFeatureLinkCommand {
  linkId: string;
  removedBy: string;
  reason?: string;
}