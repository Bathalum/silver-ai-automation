import { DomainEvent } from './domain-event';
import { ActionStatus, ExecutionMode } from '../enums';

export interface ActionExecutionContextData {
  executionMode: ExecutionMode;
  priority: number;
  estimatedDuration: number;
  retryPolicy?: {
    maxAttempts: number;
    backoffStrategy: string;
    backoffDelay: number;
    failureThreshold: number;
  };
}

export interface ActionNodeExecutionStartedData {
  modelId: string;
  actionId: string;
  executionId: string;
  actionType: string;
  actionName: string;
  parentNodeId: string;
  executionContext: ActionExecutionContextData;
  startedAt: Date;
  triggeredBy: string;
}

export interface ActionExecutionResultData {
  success: boolean;
  output: Record<string, any>;
  duration: number;
  resourceUsage: Record<string, any>;
}

export interface ActionNodeExecutionCompletedData {
  modelId: string;
  actionId: string;
  executionId: string;
  actionName: string;
  executionResult: ActionExecutionResultData;
  startedAt: Date;
  completedAt: Date;
}

export interface ActionExecutionErrorData {
  code: string;
  message: string;
  stackTrace: string;
  category: string;
}

export interface ActionNodeExecutionFailedData {
  modelId: string;
  actionId: string;
  executionId: string;
  actionName: string;
  error: ActionExecutionErrorData;
  retryAttempt: number;
  willRetry: boolean;
  startedAt: Date;
  failedAt: Date;
}

export interface ActionNodeExecutionRetriedData {
  modelId: string;
  actionId: string;
  executionId: string;
  actionName: string;
  retryAttempt: number;
  maxRetries: number;
  retryDelay: number;
  retriedAt: Date;
  reason: string;
}

export interface ActionNodeStatusChangedData {
  modelId: string;
  actionId: string;
  actionName: string;
  previousStatus: ActionStatus;
  currentStatus: ActionStatus;
  changedAt: Date;
  changedBy: string;
  reason?: string;
}

export interface ExecutionStartedData {
  modelId: string;
  executionId: string;
  startedBy: string;
  context: Record<string, any>;
  startedAt: Date;
}

export interface NodeExecutedData {
  executionId: string;
  nodeId: string;
  nodeName: string;
  success: boolean;
  executionTime: number;
  executedAt: Date;
  output?: Record<string, any>;
  error?: string;
}

export interface ActionNodeExecutionOrderChangedData {
  modelId: string;
  actionId: string;
  oldOrder: number;
  newOrder: number;
  changedBy: string;
  changedAt: Date;
}

export interface ActionNodeExecutionModeChangedData {
  modelId: string;
  actionId: string;
  oldMode: ExecutionMode;
  newMode: ExecutionMode;
  changedBy: string;
  changedAt: Date;
}

export interface ActionNodePriorityChangedData {
  modelId: string;
  actionId: string;
  oldPriority: number;
  newPriority: number;
  changedBy: string;
  changedAt: Date;
}

export class ActionNodeExecutionStarted extends DomainEvent {
  public readonly eventType = 'ActionNodeExecutionStarted';
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeExecutionStartedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      startedAt: this.data.startedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get actionId(): string { return this.data.actionId; }
  public get executionId(): string { return this.data.executionId; }
  public get actionType(): string { return this.data.actionType; }
  public get actionName(): string { return this.data.actionName; }
  public get parentNodeId(): string { return this.data.parentNodeId; }
  public get executionContext(): ActionExecutionContextData { return this.data.executionContext; }
  public get startedAt(): Date { return this.data.startedAt; }
  public get triggeredBy(): string { return this.data.triggeredBy; }
}

export class ActionNodeExecutionCompleted extends DomainEvent {
  public readonly eventType = 'ActionNodeExecutionCompleted';
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeExecutionCompletedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      startedAt: this.data.startedAt.toISOString(),
      completedAt: this.data.completedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get actionId(): string { return this.data.actionId; }
  public get executionId(): string { return this.data.executionId; }
  public get actionName(): string { return this.data.actionName; }
  public get executionResult(): ActionExecutionResultData { return this.data.executionResult; }
  public get startedAt(): Date { return this.data.startedAt; }
  public get completedAt(): Date { return this.data.completedAt; }
}

export class ActionNodeExecutionFailed extends DomainEvent {
  public readonly eventType = 'ActionNodeExecutionFailed';
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeExecutionFailedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      startedAt: this.data.startedAt.toISOString(),
      failedAt: this.data.failedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get actionId(): string { return this.data.actionId; }
  public get executionId(): string { return this.data.executionId; }
  public get actionName(): string { return this.data.actionName; }
  public get error(): ActionExecutionErrorData { return this.data.error; }
  public get retryAttempt(): number { return this.data.retryAttempt; }
  public get willRetry(): boolean { return this.data.willRetry; }
  public get startedAt(): Date { return this.data.startedAt; }
  public get failedAt(): Date { return this.data.failedAt; }
}

export class ActionNodeExecutionRetried extends DomainEvent {
  public readonly eventType = 'ActionNodeExecutionRetried';
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeExecutionRetriedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      retriedAt: this.data.retriedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get actionId(): string { return this.data.actionId; }
  public get executionId(): string { return this.data.executionId; }
  public get actionName(): string { return this.data.actionName; }
  public get retryAttempt(): number { return this.data.retryAttempt; }
  public get maxRetries(): number { return this.data.maxRetries; }
  public get retryDelay(): number { return this.data.retryDelay; }
  public get retriedAt(): Date { return this.data.retriedAt; }
  public get reason(): string { return this.data.reason; }
}

export class ActionNodeStatusChanged extends DomainEvent {
  public readonly eventType = 'ActionNodeStatusChanged';
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeStatusChangedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      changedAt: this.data.changedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get actionId(): string { return this.data.actionId; }
  public get actionName(): string { return this.data.actionName; }
  public get previousStatus(): ActionStatus { return this.data.previousStatus; }
  public get currentStatus(): ActionStatus { return this.data.currentStatus; }
  public get changedAt(): Date { return this.data.changedAt; }
  public get changedBy(): string { return this.data.changedBy; }
  public get reason(): string | undefined { return this.data.reason; }
}

export class ExecutionStarted extends DomainEvent {
  public readonly eventType = 'ExecutionStarted';
  public readonly occurredAt: Date;

  constructor(public readonly data: ExecutionStartedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      startedAt: this.data.startedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get executionId(): string { return this.data.executionId; }
  public get startedBy(): string { return this.data.startedBy; }
  public get context(): Record<string, any> { return JSON.parse(JSON.stringify(this.data.context)); }
  public get startedAt(): Date { return this.data.startedAt; }
}

export class NodeExecuted extends DomainEvent {
  public readonly eventType = 'NodeExecuted';
  public readonly occurredAt: Date;

  constructor(public readonly data: NodeExecutedData) {
    super(data.executionId); // Use executionId as aggregateId for node executions
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      executedAt: this.data.executedAt.toISOString()
    };
  }

  public get executionId(): string { return this.data.executionId; }
  public get nodeId(): string { return this.data.nodeId; }
  public get nodeName(): string { return this.data.nodeName; }
  public get success(): boolean { return this.data.success; }
  public get executionTime(): number { return this.data.executionTime; }
  public get executedAt(): Date { return this.data.executedAt; }
  public get output(): Record<string, any> | undefined { return this.data.output ? { ...this.data.output } : undefined; }
  public get error(): string | undefined { return this.data.error; }
}

export class ActionNodeExecutionOrderChanged extends DomainEvent {
  public readonly eventType = 'ActionNodeExecutionOrderChanged';
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeExecutionOrderChangedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      changedAt: this.data.changedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get actionId(): string { return this.data.actionId; }
  public get oldOrder(): number { return this.data.oldOrder; }
  public get newOrder(): number { return this.data.newOrder; }
  public get changedBy(): string { return this.data.changedBy; }
  public get changedAt(): Date { return this.data.changedAt; }
}

export class ActionNodeExecutionModeChanged extends DomainEvent {
  public readonly eventType = 'ActionNodeExecutionModeChanged';
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeExecutionModeChangedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      changedAt: this.data.changedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get actionId(): string { return this.data.actionId; }
  public get oldMode(): ExecutionMode { return this.data.oldMode; }
  public get newMode(): ExecutionMode { return this.data.newMode; }
  public get changedBy(): string { return this.data.changedBy; }
  public get changedAt(): Date { return this.data.changedAt; }
}

export class ActionNodePriorityChanged extends DomainEvent {
  public readonly eventType = 'ActionNodePriorityChanged';
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodePriorityChangedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      changedAt: this.data.changedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get actionId(): string { return this.data.actionId; }
  public get oldPriority(): number { return this.data.oldPriority; }
  public get newPriority(): number { return this.data.newPriority; }
  public get changedBy(): string { return this.data.changedBy; }
  public get changedAt(): Date { return this.data.changedAt; }
}