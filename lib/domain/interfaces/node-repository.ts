import { Result } from '../shared/result';
import { Node } from '../entities/node';
import { NodeId } from '../value-objects/node-id';
import { NodeStatus } from '../enums';

export interface NodeRepository {
  save(node: Node): Promise<Result<Node>>;
  findById(nodeId: NodeId): Promise<Result<Node | null>>;
  findByModelId(modelId: string): Promise<Result<Node[]>>;
  findByType(nodeType: string): Promise<Result<Node[]>>;
  delete(nodeId: NodeId): Promise<Result<void>>;
  exists(nodeId: NodeId): Promise<Result<boolean>>;
  findByStatus(status: NodeStatus): Promise<Result<Node[]>>;
  findByStatusInModel(modelId: string, status: NodeStatus): Promise<Result<Node[]>>;
  findDependents(nodeId: NodeId): Promise<Result<Node[]>>;
  findDependencies(nodeId: NodeId): Promise<Result<Node[]>>;
  findByName(modelId: string, name: string): Promise<Result<Node[]>>;
  findByNamePattern(modelId: string, pattern: string): Promise<Result<Node[]>>;
  updateStatus(id: NodeId, status: NodeStatus): Promise<Result<void>>;
  bulkSave(nodes: Node[]): Promise<Result<void>>;
  bulkDelete(ids: NodeId[]): Promise<Result<void>>;
  countByModelAndStatus(modelId: string, status: NodeStatus): Promise<Result<number>>;
}