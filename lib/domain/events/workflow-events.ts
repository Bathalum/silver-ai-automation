import { DomainEvent } from './domain-event';

export interface WorkflowExecutionStartedData {
  modelId: string;
  executionId: string;
  modelName: string;
  startedBy: string;
  startedAt: Date;
  executionPlan: Record<string, any>;
}

export interface WorkflowExecutionCompletedData {
  modelId: string;
  executionId: string;
  modelName: string;
  result: {
    success: boolean;
    completedNodes: string[];
    duration: number;
    output: Record<string, any>;
  };
  completedAt: Date;
}

export interface WorkflowExecutionFailedData {
  modelId: string;
  executionId: string;
  modelName: string;
  error: {
    code: string;
    message: string;
    failedNode: string;
    context: Record<string, any>;
  };
  failedAt: Date;
}

export interface WorkflowValidationCompletedData {
  modelId: string;
  validationId: string;
  modelName: string;
  validationResult: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  validatedAt: Date;
  validatedBy: string;
}

export interface ContainerNodeOrchestrationStartedData {
  modelId: string;
  nodeId: string;
  actionCount: number;
  startedBy: string;
  startedAt: Date;
}

export interface ContainerNodeOrchestrationCompletedData {
  modelId: string;
  nodeId: string;
  successCount: number;
  failureCount: number;
  duration: number;
  completedAt: Date;
}

export interface FractalOrchestrationLevelChangedData {
  modelId: string;
  oldLevel: number;
  newLevel: number;
  changedBy: string;
  changedAt: Date;
}

export class WorkflowExecutionStarted extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: WorkflowExecutionStartedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'WorkflowExecutionStarted';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      startedAt: this.data.startedAt.toISOString()
    };
  }
}

export class WorkflowExecutionCompleted extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: WorkflowExecutionCompletedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'WorkflowExecutionCompleted';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      completedAt: this.data.completedAt.toISOString()
    };
  }
}

export class WorkflowExecutionFailed extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: WorkflowExecutionFailedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'WorkflowExecutionFailed';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      failedAt: this.data.failedAt.toISOString()
    };
  }
}

export class WorkflowValidationCompleted extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: WorkflowValidationCompletedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'WorkflowValidationCompleted';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      validatedAt: this.data.validatedAt.toISOString()
    };
  }
}

export class ContainerNodeOrchestrationStarted extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: ContainerNodeOrchestrationStartedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'ContainerNodeOrchestrationStarted';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      startedAt: this.data.startedAt.toISOString()
    };
  }

  public get nodeId(): string { return this.data.nodeId; }
  public get actionCount(): number { return this.data.actionCount; }
  public get startedBy(): string { return this.data.startedBy; }
  public get startedAt(): Date { return this.data.startedAt; }
}

export class ContainerNodeOrchestrationCompleted extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: ContainerNodeOrchestrationCompletedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'ContainerNodeOrchestrationCompleted';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      completedAt: this.data.completedAt.toISOString()
    };
  }

  public get nodeId(): string { return this.data.nodeId; }
  public get successCount(): number { return this.data.successCount; }
  public get failureCount(): number { return this.data.failureCount; }
  public get duration(): number { return this.data.duration; }
  public get completedAt(): Date { return this.data.completedAt; }
}

export class FractalOrchestrationLevelChanged extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: FractalOrchestrationLevelChangedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'FractalOrchestrationLevelChanged';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      changedAt: this.data.changedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get oldLevel(): number { return this.data.oldLevel; }
  public get newLevel(): number { return this.data.newLevel; }
  public get changedBy(): string { return this.data.changedBy; }
  public get changedAt(): Date { return this.data.changedAt; }
}