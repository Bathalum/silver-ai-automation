import { Result } from '../shared/result';
import { FunctionModel } from '../entities/function-model';
import { Node } from '../entities/node';
import { ActionNode } from '../entities/action-node';
import { UnifiedNode } from '../entities/unified-node';
import { ModelStatus } from '../enums';

export interface IFunctionModelRepository {
  save(model: FunctionModel): Promise<Result<void>>;
  findById(id: string): Promise<Result<FunctionModel | null>>;
  findByName(name: string): Promise<Result<FunctionModel[]>>;
  findByStatus(status: ModelStatus[]): Promise<Result<FunctionModel[]>>;
  findAll(): Promise<Result<FunctionModel[]>>;
  delete(id: string): Promise<Result<void>>;
  exists(id: string): Promise<Result<boolean>>;
  findByOwner(ownerId: string): Promise<Result<FunctionModel[]>>;
  publishModel(id: string): Promise<Result<void>>;
  archiveModel(id: string): Promise<Result<void>>;
  findByNamePattern(pattern: string): Promise<Result<FunctionModel[]>>;
  findRecentlyModified(limit: number): Promise<Result<FunctionModel[]>>;
  countByStatus(status: ModelStatus): Promise<Result<number>>;
  softDelete(id: string, deletedBy: string): Promise<Result<void>>;
  restore(id: string): Promise<Result<void>>;
  findDeleted(): Promise<Result<FunctionModel[]>>;
  findPublishedVersions(): Promise<Result<FunctionModel[]>>;
  findDraftVersions(): Promise<Result<FunctionModel[]>>;

  // Enhanced methods for Phase 2
  addNode(modelId: string, node: Node): Promise<Result<void>>;
  addActionNode(modelId: string, actionNode: ActionNode): Promise<Result<void>>;
  
  // UNIFIED NODE SUPPORT - TDD Specification
  // These methods are defined by the tests to support unified node operations
  addUnifiedNode(modelId: string, node: import('../entities/unified-node').UnifiedNode): Promise<Result<void>>;
  getUnifiedNode(nodeId: string): Promise<Result<import('../entities/unified-node').UnifiedNode | null>>;
  updateUnifiedNode(nodeId: string, node: import('../entities/unified-node').UnifiedNode): Promise<Result<void>>;
  removeUnifiedNode(nodeId: string): Promise<Result<void>>;
  getUnifiedNodesByModel(modelId: string): Promise<Result<import('../entities/unified-node').UnifiedNode[]>>;
  getUnifiedNodesByType(modelId: string, nodeType: import('../enums').NodeType): Promise<Result<import('../entities/unified-node').UnifiedNode[]>>;
  searchModelsByNodeContent(query: string): Promise<Result<FunctionModel[]>>;
  findModelsWithComplexFilters(filters: {
    status?: ModelStatus[];
    namePattern?: string;
    hasNodes?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Result<FunctionModel[]>>;
}

// Keep backwards compatibility
export interface FunctionModelRepository extends IFunctionModelRepository {}