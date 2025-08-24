import { DomainEvent } from './domain-event';
import { FeatureType } from '../enums';

export interface AIAgentConfiguredData {
  agentId: string;
  featureType: FeatureType;
  entityId: string;
  nodeId?: string;
  agentName: string;
  instructions: string;
  tools: string[];
  capabilities: Record<string, any>;
  configuredBy: string;
  configuredAt: Date;
}

export interface AIAgentExecutionStartedData {
  agentId: string;
  executionId: string;
  agentName: string;
  trigger: {
    eventType: string;
    eventId: string;
    triggeredBy: string;
  };
  executionContext: {
    availableTools: string[];
    executionMode: string;
    timeoutMs: number;
  };
  startedAt: Date;
}

export interface AIAgentExecutionCompletedData {
  agentId: string;
  executionId: string;
  agentName: string;
  result: {
    success: boolean;
    output: Record<string, any>;
    duration: number;
    toolsUsed: string[];
  };
  completedAt: Date;
}

export interface AIAgentExecutionFailedData {
  agentId: string;
  executionId: string;
  agentName: string;
  error: {
    code: string;
    message: string;
    category: string;
  };
  failedAt: Date;
}

export interface AIAgentConfigurationUpdatedData {
  agentId: string;
  configuration: Record<string, any>;
  updatedBy: string;
  updatedAt: Date;
}

export interface AIAgentTaskStartedData {
  agentId: string;
  taskId: string;
  taskType: string;
  startedBy: string;
  startedAt: Date;
}

export interface AIAgentTaskCompletedData {
  agentId: string;
  taskId: string;
  result: Record<string, any>;
  duration: number;
  completedAt: Date;
}

export interface AIAgentTaskFailedData {
  agentId: string;
  taskId: string;
  error: string;
  duration: number;
  failedAt: Date;
}

export class AIAgentConfigured extends DomainEvent {
  public readonly eventType = 'AIAgentConfigured';
  public readonly occurredAt: Date;

  constructor(public readonly data: AIAgentConfiguredData) {
    super(data.agentId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      configuredAt: this.data.configuredAt.toISOString()
    };
  }

  public get agentId(): string { return this.data.agentId; }
  public get featureType(): FeatureType { return this.data.featureType; }
  public get entityId(): string { return this.data.entityId; }
  public get nodeId(): string | undefined { return this.data.nodeId; }
  public get agentName(): string { return this.data.agentName; }
  public get instructions(): string { return this.data.instructions; }
  public get tools(): string[] { return this.data.tools; }
  public get capabilities(): Record<string, any> { return this.data.capabilities; }
  public get configuredBy(): string { return this.data.configuredBy; }
  public get configuredAt(): Date { return this.data.configuredAt; }
}

export class AIAgentExecutionStarted extends DomainEvent {
  public readonly eventType = 'AIAgentExecutionStarted';
  public readonly occurredAt: Date;

  constructor(public readonly data: AIAgentExecutionStartedData) {
    super(data.agentId);
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

  public get agentId(): string { return this.data.agentId; }
  public get executionId(): string { return this.data.executionId; }
  public get agentName(): string { return this.data.agentName; }
  public get trigger(): { eventType: string; eventId: string; triggeredBy: string } { return this.data.trigger; }
  public get executionContext(): { availableTools: string[]; executionMode: string; timeoutMs: number } { return this.data.executionContext; }
  public get startedAt(): Date { return this.data.startedAt; }
}

export class AIAgentExecutionCompleted extends DomainEvent {
  public readonly eventType = 'AIAgentExecutionCompleted';
  public readonly occurredAt: Date;

  constructor(public readonly data: AIAgentExecutionCompletedData) {
    super(data.agentId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      completedAt: this.data.completedAt.toISOString()
    };
  }
}

export class AIAgentExecutionFailed extends DomainEvent {
  public readonly eventType = 'AIAgentExecutionFailed';
  public readonly occurredAt: Date;

  constructor(public readonly data: AIAgentExecutionFailedData) {
    super(data.agentId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      failedAt: this.data.failedAt.toISOString()
    };
  }
}

export class AIAgentConfigurationUpdated extends DomainEvent {
  public readonly eventType = 'AIAgentConfigurationUpdated';
  public readonly occurredAt: Date;

  constructor(public readonly data: AIAgentConfigurationUpdatedData) {
    super(data.agentId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      updatedAt: this.data.updatedAt.toISOString()
    };
  }

  public get agentId(): string { return this.data.agentId; }
  public get configuration(): Record<string, any> { return JSON.parse(JSON.stringify(this.data.configuration)); }
  public get updatedBy(): string { return this.data.updatedBy; }
  public get updatedAt(): Date { return this.data.updatedAt; }
}

export class AIAgentTaskStarted extends DomainEvent {
  public readonly eventType = 'AIAgentTaskStarted';
  public readonly occurredAt: Date;

  constructor(public readonly data: AIAgentTaskStartedData) {
    super(data.agentId);
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

  public get agentId(): string { return this.data.agentId; }
  public get taskId(): string { return this.data.taskId; }
  public get taskType(): string { return this.data.taskType; }
  public get startedBy(): string { return this.data.startedBy; }
  public get startedAt(): Date { return this.data.startedAt; }
}

export class AIAgentTaskCompleted extends DomainEvent {
  public readonly eventType = 'AIAgentTaskCompleted';
  public readonly occurredAt: Date;

  constructor(public readonly data: AIAgentTaskCompletedData) {
    super(data.agentId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      completedAt: this.data.completedAt.toISOString()
    };
  }

  public get agentId(): string { return this.data.agentId; }
  public get taskId(): string { return this.data.taskId; }
  public get result(): Record<string, any> { return JSON.parse(JSON.stringify(this.data.result)); }
  public get duration(): number { return this.data.duration; }
  public get completedAt(): Date { return this.data.completedAt; }
}

export class AIAgentTaskFailed extends DomainEvent {
  public readonly eventType = 'AIAgentTaskFailed';
  public readonly occurredAt: Date;

  constructor(public readonly data: AIAgentTaskFailedData) {
    super(data.agentId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return this.eventType;
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      failedAt: this.data.failedAt.toISOString()
    };
  }

  public get agentId(): string { return this.data.agentId; }
  public get taskId(): string { return this.data.taskId; }
  public get error(): string { return this.data.error; }
  public get duration(): number { return this.data.duration; }
  public get failedAt(): Date { return this.data.failedAt; }
}