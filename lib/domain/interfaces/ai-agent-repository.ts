import { Result } from '../shared/result';
import { AIAgent } from '../entities/ai-agent';
import { NodeId } from '../value-objects/node-id';
import { FeatureType } from '../enums';

export interface AIAgentRepository {
  findById(id: NodeId): Promise<Result<AIAgent>>;
  save(agent: AIAgent): Promise<Result<void>>;
  delete(id: NodeId): Promise<Result<void>>;
  exists(id: NodeId): Promise<Result<boolean>>;
  findByFeatureAndEntity(featureType: FeatureType, entityId: string): Promise<Result<AIAgent[]>>;
  findByNode(nodeId: NodeId): Promise<Result<AIAgent[]>>;
  findByFeatureType(featureType: FeatureType): Promise<Result<AIAgent[]>>;
  findEnabled(): Promise<Result<AIAgent[]>>;
  findDisabled(): Promise<Result<AIAgent[]>>;
  findByName(name: string): Promise<Result<AIAgent[]>>;
  findByCapability(capability: string): Promise<Result<AIAgent[]>>;
  findByTool(toolName: string): Promise<Result<AIAgent[]>>;
  findRecentlyExecuted(hours: number): Promise<Result<AIAgent[]>>;
  findBySuccessRate(minRate: number): Promise<Result<AIAgent[]>>;
  findByExecutionCount(minCount: number): Promise<Result<AIAgent[]>>;
  updateEnabled(id: NodeId, enabled: boolean): Promise<Result<void>>;
  recordExecution(id: NodeId, success: boolean, executionTimeMs: number): Promise<Result<void>>;
  bulkSave(agents: AIAgent[]): Promise<Result<void>>;
  bulkDelete(ids: NodeId[]): Promise<Result<void>>;
  countByFeatureType(featureType: FeatureType): Promise<Result<number>>;
  countEnabled(): Promise<Result<number>>;
}