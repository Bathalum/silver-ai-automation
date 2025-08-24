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
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeExecutionStartedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'ActionNodeExecutionStarted';
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
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeExecutionCompletedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'ActionNodeExecutionCompleted';
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
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeExecutionFailedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'ActionNodeExecutionFailed';
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
    return 'ActionNodeExecutionOrderChanged';
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
    return 'ActionNodeExecutionOrderChanged';
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
  public readonly modelId: string;
  public readonly executionId: string;
  public readonly startedBy: string;
  public readonly context: Record<string, any>;
  public readonly startedAt: Date;

  // Support both constructor patterns: data object OR individual parameters
  constructor(
    aggregateIdOrData: string | ExecutionStartedData,
    modelId?: string,
    executionId?: string,
    startedBy?: string,
    context?: Record<string, any>,
    eventVersion = 1
  ) {
    if (typeof aggregateIdOrData === 'object') {
      // Data object pattern
      const data = aggregateIdOrData;
      super(data.modelId, eventVersion);
      this.modelId = data.modelId;
      this.executionId = data.executionId;
      this.startedBy = data.startedBy;
      this.context = data.context;
      this.startedAt = data.startedAt;
    } else {
      // Individual parameters pattern
      if (!modelId || !executionId || !startedBy || !context) {
        throw new Error('Individual parameters constructor requires aggregateId, modelId, executionId, startedBy, and context');
      }
      super(aggregateIdOrData, eventVersion);
      this.modelId = modelId;
      this.executionId = executionId;
      this.startedBy = startedBy;
      this.context = context;
      this.startedAt = new Date();
    }
  }

  public getEventName(): string {
    return 'ExecutionStarted';
  }

  public getEventData(): Record<string, any> {
    return {
      modelId: this.modelId,
      executionId: this.executionId,
      startedBy: this.startedBy,
      context: JSON.parse(JSON.stringify(this.context)),
      startedAt: this.startedAt.toISOString()
    };
  }
}

export class NodeExecuted extends DomainEvent {
  public readonly executionId: string;
  public readonly nodeId: string;
  public readonly nodeName: string;
  public readonly success: boolean;
  public readonly executionTime: number;
  public readonly executedAt: Date;
  public readonly output?: Record<string, any>;
  public readonly error?: string;

  // Support both constructor patterns: data object OR individual parameters
  constructor(
    aggregateIdOrData: string | NodeExecutedData,
    executionId?: string,
    nodeId?: string,
    nodeName?: string,
    success?: boolean,
    executionTime?: number,
    output?: Record<string, any>,
    error?: string,
    eventVersion = 1
  ) {
    if (typeof aggregateIdOrData === 'object') {
      // Data object pattern
      const data = aggregateIdOrData;
      super(data.executionId, eventVersion); // Use executionId as aggregateId for node executions
      this.executionId = data.executionId;
      this.nodeId = data.nodeId;
      this.nodeName = data.nodeName;
      this.success = data.success;
      this.executionTime = data.executionTime;
      this.executedAt = data.executedAt;
      this.output = data.output;
      this.error = data.error;
    } else {
      // Individual parameters pattern
      if (!executionId || !nodeId || !nodeName || success === undefined || executionTime === undefined) {
        throw new Error('Individual parameters constructor requires aggregateId, executionId, nodeId, nodeName, success, and executionTime');
      }
      super(aggregateIdOrData, eventVersion);
      this.executionId = executionId;
      this.nodeId = nodeId;
      this.nodeName = nodeName;
      this.success = success;
      this.executionTime = executionTime;
      this.output = output;
      this.error = error;
      this.executedAt = new Date();
    }
  }

  public getEventName(): string {
    return 'NodeExecuted';
  }

  public getEventData(): Record<string, any> {
    const data: Record<string, any> = {
      executionId: this.executionId,
      nodeId: this.nodeId,
      nodeName: this.nodeName,
      success: this.success,
      executionTime: this.executionTime,
      executedAt: this.executedAt.toISOString()
    };
    
    if (this.output !== undefined) {
      data.output = JSON.parse(JSON.stringify(this.output));
    }
    
    if (this.error !== undefined) {
      data.error = this.error;
    }
    
    return data;
  }
}

export class ActionNodeExecutionOrderChanged extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeExecutionOrderChangedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'ActionNodeExecutionOrderChanged';
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
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeExecutionModeChangedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'ActionNodeExecutionModeChanged';
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
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodePriorityChangedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'ActionNodePriorityChanged';
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