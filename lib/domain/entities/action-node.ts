import { NodeId } from '../value-objects/node-id';
import { RetryPolicy } from '../value-objects/retry-policy';
import { RACI } from '../value-objects/raci';
import { ExecutionMode, ActionStatus } from '../enums';
import { Result } from '../shared/result';

export interface ActionNodeProps {
  actionId: NodeId;
  parentNodeId: NodeId;
  modelId: string;
  name: string;
  description?: string;
  executionMode: ExecutionMode;
  executionOrder: number;
  status: ActionStatus;
  priority: number;
  estimatedDuration?: number;
  retryPolicy: RetryPolicy;
  raci: RACI;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export abstract class ActionNode {
  protected constructor(protected props: ActionNodeProps) {}

  public get actionId(): NodeId {
    return this.props.actionId;
  }

  public get nodeId(): NodeId {
    return this.props.actionId;
  }

  public get id(): string {
    return this.props.actionId.toString();
  }

  public get type(): string {
    return this.getActionType();
  }

  public get parentNodeId(): NodeId {
    return this.props.parentNodeId;
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

  public get executionMode(): ExecutionMode {
    return this.props.executionMode;
  }

  public get executionOrder(): number {
    return this.props.executionOrder;
  }

  public get status(): ActionStatus {
    return this.props.status;
  }

  public get priority(): number {
    return this.props.priority;
  }

  public get estimatedDuration(): number | undefined {
    return this.props.estimatedDuration;
  }

  public get retryPolicy(): RetryPolicy {
    return this.props.retryPolicy;
  }

  public get raci(): RACI {
    return this.props.raci;
  }

  public get metadata(): Readonly<Record<string, any>> {
    return this.props.metadata;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public updateName(name: string): Result<void> {
    if (!name || name.trim().length === 0) {
      return Result.fail<void>('Action node name cannot be empty');
    }

    if (name.trim().length > 200) {
      return Result.fail<void>('Action node name cannot exceed 200 characters');
    }

    this.props.name = name.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateDescription(description?: string): Result<void> {
    if (description && description.length > 1000) {
      return Result.fail<void>('Action node description cannot exceed 1000 characters');
    }

    this.props.description = description?.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateExecutionMode(executionMode: ExecutionMode): Result<void> {
    this.props.executionMode = executionMode;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateExecutionOrder(executionOrder: number): Result<void> {
    if (executionOrder < 1) {
      return Result.fail<void>('Execution order must be greater than 0');
    }

    this.props.executionOrder = executionOrder;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateStatus(status: ActionStatus): Result<void> {
    if (!this.canTransitionTo(status)) {
      return Result.fail<void>(`Invalid status transition from ${this.props.status} to ${status}`);
    }

    this.props.status = status;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updatePriority(priority: number): Result<void> {
    if (priority < 1 || priority > 10) {
      return Result.fail<void>('Priority must be between 1 and 10');
    }

    this.props.priority = priority;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateEstimatedDuration(duration?: number): Result<void> {
    if (duration !== undefined && duration <= 0) {
      return Result.fail<void>('Estimated duration must be positive');
    }

    this.props.estimatedDuration = duration;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateRetryPolicy(retryPolicy: RetryPolicy): Result<void> {
    this.props.retryPolicy = retryPolicy;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateRaci(raci: RACI): Result<void> {
    this.props.raci = raci;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateMetadata(metadata: Record<string, any>): Result<void> {
    this.props.metadata = { ...metadata };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  private canTransitionTo(newStatus: ActionStatus): boolean {
    const currentStatus = this.props.status;
    
    switch (currentStatus) {
      case ActionStatus.DRAFT:
        return [ActionStatus.ACTIVE, ActionStatus.ARCHIVED].includes(newStatus);
      case ActionStatus.ACTIVE:
        return [ActionStatus.INACTIVE, ActionStatus.EXECUTING, ActionStatus.ARCHIVED, ActionStatus.ERROR].includes(newStatus);
      case ActionStatus.INACTIVE:
        return [ActionStatus.ACTIVE, ActionStatus.ARCHIVED].includes(newStatus);
      case ActionStatus.EXECUTING:
        return [ActionStatus.COMPLETED, ActionStatus.FAILED, ActionStatus.RETRYING, ActionStatus.ERROR].includes(newStatus);
      case ActionStatus.COMPLETED:
        return [ActionStatus.ACTIVE, ActionStatus.ARCHIVED].includes(newStatus);
      case ActionStatus.FAILED:
        return [ActionStatus.RETRYING, ActionStatus.ACTIVE, ActionStatus.ARCHIVED, ActionStatus.ERROR].includes(newStatus);
      case ActionStatus.RETRYING:
        return [ActionStatus.EXECUTING, ActionStatus.FAILED, ActionStatus.ERROR].includes(newStatus);
      case ActionStatus.ARCHIVED:
        return false; // No transitions from archived
      case ActionStatus.ERROR:
        return [ActionStatus.ACTIVE, ActionStatus.INACTIVE, ActionStatus.ARCHIVED].includes(newStatus);
      default:
        return false;
    }
  }

  public abstract getActionType(): string;

  public equals(other: ActionNode): boolean {
    return this.actionId.equals(other.actionId);
  }
}