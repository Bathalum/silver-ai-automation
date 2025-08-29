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
  timeout?: number;
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

  public get id(): string {
    return this.props.nodeId.toString();
  }

  public get type(): string {
    return this.getNodeType();
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

  public get timeout(): number | undefined {
    return this.props.timeout;
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

  public updatePosition(position: Position): Result<void>;
  public updatePosition(x: number, y: number): Result<void>;
  public updatePosition(positionOrX: Position | number, y?: number): Result<void> {
    let newPosition: Position;
    
    if (typeof positionOrX === 'number' && typeof y === 'number') {
      // Handle x, y coordinates
      if (positionOrX < 0 || y < 0) {
        return Result.fail<void>('Position coordinates must be non-negative');
      }
      
      // Check maximum canvas boundaries
      const MAX_CANVAS_SIZE = 50000;
      if (positionOrX > MAX_CANVAS_SIZE || y > MAX_CANVAS_SIZE) {
        return Result.fail<void>('Position exceeds maximum canvas boundaries');
      }
      
      const positionResult = Position.create(positionOrX, y);
      if (positionResult.isFailure) {
        return Result.fail<void>(positionResult.error);
      }
      newPosition = positionResult.value;
    } else if (positionOrX instanceof Position) {
      // Handle Position object
      newPosition = positionOrX;
    } else {
      return Result.fail<void>('Invalid position parameters');
    }

    this.props.position = newPosition;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateTimeout(timeout: number): Result<void> {
    if (timeout < 0) {
      return Result.fail<void>('Timeout must be a positive value');
    }

    // Set reasonable maximum limit (24 hours in milliseconds)
    const MAX_TIMEOUT = 24 * 60 * 60 * 1000;
    if (timeout > MAX_TIMEOUT) {
      return Result.fail<void>('Timeout value exceeds maximum allowed limit');
    }

    this.props.timeout = timeout;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addDependency(nodeId: NodeId | string): Result<void> {
    // Convert string to NodeId if needed
    let nodeIdObj: NodeId;
    if (typeof nodeId === 'string') {
      const nodeIdResult = NodeId.create(nodeId);
      if (nodeIdResult.isFailure) {
        return Result.fail<void>(nodeIdResult.error);
      }
      nodeIdObj = nodeIdResult.value;
    } else {
      nodeIdObj = nodeId;
    }

    if (this.props.dependencies.some(dep => dep.equals(nodeIdObj))) {
      return Result.fail<void>('Dependency already exists');
    }

    if (nodeIdObj.equals(this.nodeId)) {
      return Result.fail<void>('Node cannot depend on itself');
    }

    this.props.dependencies.push(nodeIdObj);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeDependency(nodeId: NodeId | string): Result<void> {
    // Convert string to NodeId if needed
    let nodeIdObj: NodeId;
    if (typeof nodeId === 'string') {
      const nodeIdResult = NodeId.create(nodeId);
      if (nodeIdResult.isFailure) {
        return Result.fail<void>(nodeIdResult.error);
      }
      nodeIdObj = nodeIdResult.value;
    } else {
      nodeIdObj = nodeId;
    }

    const index = this.props.dependencies.findIndex(dep => dep.equals(nodeIdObj));
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
        return [NodeStatus.CONFIGURED, NodeStatus.ACTIVE, NodeStatus.ARCHIVED].includes(newStatus);
      case NodeStatus.CONFIGURED:
        return [NodeStatus.ACTIVE, NodeStatus.INACTIVE, NodeStatus.ARCHIVED].includes(newStatus);
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