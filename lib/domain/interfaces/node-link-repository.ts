import { Result } from '../shared/result';
import { NodeLink } from '../entities/node-link';
import { CrossFeatureLink } from '../entities/cross-feature-link';
import { NodeId } from '../value-objects/node-id';
import { FeatureType, LinkType } from '../enums';

export interface NodeLinkRepository {
  findById(id: NodeId): Promise<Result<NodeLink>>;
  save(link: NodeLink): Promise<Result<void>>;
  delete(id: NodeId): Promise<Result<void>>;
  exists(id: NodeId): Promise<Result<boolean>>;
  findBySourceEntity(featureType: FeatureType, entityId: string): Promise<Result<NodeLink[]>>;
  findByTargetEntity(featureType: FeatureType, entityId: string): Promise<Result<NodeLink[]>>;
  findBySourceNode(nodeId: NodeId): Promise<Result<NodeLink[]>>;
  findByTargetNode(nodeId: NodeId): Promise<Result<NodeLink[]>>;
  findByLinkType(linkType: LinkType): Promise<Result<NodeLink[]>>;
  findCrossFeatureLinks(): Promise<Result<CrossFeatureLink[]>>;
  findByFeaturePair(sourceFeature: FeatureType, targetFeature: FeatureType): Promise<Result<NodeLink[]>>;
  findStrongLinks(threshold?: number): Promise<Result<NodeLink[]>>;
  findWeakLinks(threshold?: number): Promise<Result<NodeLink[]>>;
  findBidirectionalLinks(sourceEntity: string, targetEntity: string): Promise<Result<NodeLink[]>>;
  bulkSave(links: NodeLink[]): Promise<Result<void>>;
  bulkDelete(ids: NodeId[]): Promise<Result<void>>;
  countByLinkType(linkType: LinkType): Promise<Result<number>>;
  countCrossFeatureLinks(): Promise<Result<number>>;
  findByModelId(modelId: string): Promise<Result<NodeLink[]>>;
}