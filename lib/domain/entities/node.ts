import { NodeId } from '../value-objects/node-id';
import { Position } from '../value-objects/position';
import { ExecutionMode, NodeStatus } from '../enums';
import { Result } from '../shared/result';

export interface NodeProps {
  nodeId: NodeId;
  modelId: string;
  name: string;
  description?: string;
  position: Position;
  dependencies: NodeId[];
  executionType: ExecutionMode;
  status: NodeStatus;
  metadata: Record<string, any>;
  visualProperties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export abstract class Node {
  protected constructor(protected props: NodeProps) {}

  public get nodeId(): NodeId {
    return this.props.nodeId;
  }

  public get modelId(): string {
    return this.props.modelId;
  }

  public get name(): string {
    return this.props.name;
  }

  public get description(): string | undefined {
    return this.props.description;
  }

  public get position(): Position {
    return this.props.position;
  }

  public get dependencies(): readonly NodeId[] {
    return this.props.dependencies;
  }

  public get executionType(): ExecutionMode {
    return this.props.executionType;
  }

  public get status(): NodeStatus {
    return this.props.status;
  }

  public get metadata(): Readonly<Record<string, any>> {
    return this.props.metadata;
  }

  public get visualProperties(): Readonly<Record<string, any>> {
    return this.props.visualProperties;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public updateName(name: string): Result<void> {
    if (!name || name.trim().length === 0) {
      return Result.fail<void>('Node name cannot be empty');
    }

    if (name.trim().length > 200) {
      return Result.fail<void>('Node name cannot exceed 200 characters');
    }

    this.props.name = name.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateDescription(description?: string): Result<void> {
    if (description && description.length > 1000) {
      return Result.fail<void>('Node description cannot exceed 1000 characters');
    }

    this.props.description = description?.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updatePosition(position: Position): Result<void> {
    this.props.position = position;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addDependency(nodeId: NodeId): Result<void> {
    if (this.props.dependencies.some(dep => dep.equals(nodeId))) {
      return Result.fail<void>('Dependency already exists');
    }

    if (nodeId.equals(this.nodeId)) {
      return Result.fail<void>('Node cannot depend on itself');
    }

    this.props.dependencies.push(nodeId);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeDependency(nodeId: NodeId): Result<void> {
    const index = this.props.dependencies.findIndex(dep => dep.equals(nodeId));
    if (index === -1) {
      return Result.fail<void>('Dependency does not exist');
    }

    this.props.dependencies.splice(index, 1);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateExecutionType(executionType: ExecutionMode): Result<void> {
    this.props.executionType = executionType;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateStatus(status: NodeStatus): Result<void> {
    if (!this.canTransitionTo(status)) {
      return Result.fail<void>(`Invalid status transition from ${this.props.status} to ${status}`);
    }

    this.props.status = status;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateMetadata(metadata: Record<string, any>): Result<void> {
    this.props.metadata = { ...metadata };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateVisualProperties(visualProperties: Record<string, any>): Result<void> {
    this.props.visualProperties = { ...visualProperties };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  protected canTransitionTo(newStatus: NodeStatus): boolean {
    const currentStatus = this.props.status;
    
    switch (currentStatus) {
      case NodeStatus.DRAFT:
        return [NodeStatus.ACTIVE, NodeStatus.ARCHIVED].includes(newStatus);
      case NodeStatus.ACTIVE:
        return [NodeStatus.INACTIVE, NodeStatus.ARCHIVED, NodeStatus.ERROR].includes(newStatus);
      case NodeStatus.INACTIVE:
        return [NodeStatus.ACTIVE, NodeStatus.ARCHIVED].includes(newStatus);
      case NodeStatus.ARCHIVED:
        return false; // No transitions from archived
      case NodeStatus.ERROR:
        return [NodeStatus.ACTIVE, NodeStatus.INACTIVE, NodeStatus.ARCHIVED].includes(newStatus);
      default:
        return false;
    }
  }

  public abstract getNodeType(): string;

  public equals(other: Node): boolean {
    return this.nodeId.equals(other.nodeId);
  }
}