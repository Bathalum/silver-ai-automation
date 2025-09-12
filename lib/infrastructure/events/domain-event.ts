/**
 * Base interface for all domain events
 */
export interface DomainEvent {
  /** Unique identifier for the event */
  eventId: string;
  
  /** Type of the event */
  eventType: string;
  
  /** ID of the aggregate that generated the event */
  aggregateId: string;
  
  /** Type of the aggregate */
  aggregateType: string;
  
  /** Version of the aggregate when event was generated */
  aggregateVersion: number;
  
  /** When the event occurred */
  occurredOn: Date;
  
  /** Event data payload */
  data: Record<string, any>;
  
  /** Optional metadata */
  metadata?: Record<string, any>;
}

/**
 * Function Model specific domain events
 */
export class FunctionModelCreated implements DomainEvent {
  readonly eventType = 'FunctionModelCreated';
  readonly aggregateType = 'FunctionModel';

  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly occurredOn: Date,
    public readonly data: {
      modelId: string;
      name: string;
      userId: string;
      version: string;
    },
    public readonly metadata?: Record<string, any>
  ) {}
}

export class FunctionModelUpdated implements DomainEvent {
  readonly eventType = 'FunctionModelUpdated';
  readonly aggregateType = 'FunctionModel';

  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly occurredOn: Date,
    public readonly data: {
      modelId: string;
      previousVersion: string;
      newVersion: string;
      changes: string[];
    },
    public readonly metadata?: Record<string, any>
  ) {}
}

export class FunctionModelPublished implements DomainEvent {
  readonly eventType = 'FunctionModelPublished';
  readonly aggregateType = 'FunctionModel';

  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly occurredOn: Date,
    public readonly data: {
      modelId: string;
      publishedVersion: string;
      previousStatus: string;
    },
    public readonly metadata?: Record<string, any>
  ) {}
}

export class FunctionModelArchived implements DomainEvent {
  readonly eventType = 'FunctionModelArchived';
  readonly aggregateType = 'FunctionModel';

  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly occurredOn: Date,
    public readonly data: {
      modelId: string;
      archivedVersion: string;
      reason?: string;
    },
    public readonly metadata?: Record<string, any>
  ) {}
}

export class FunctionModelDeleted implements DomainEvent {
  readonly eventType = 'FunctionModelDeleted';
  readonly aggregateType = 'FunctionModel';

  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly occurredOn: Date,
    public readonly data: {
      modelId: string;
      deletedVersion: string;
      softDelete: boolean;
    },
    public readonly metadata?: Record<string, any>
  ) {}
}

export class NodeAdded implements DomainEvent {
  readonly eventType = 'NodeAdded';
  readonly aggregateType = 'FunctionModel';

  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly occurredOn: Date,
    public readonly data: {
      modelId: string;
      nodeId: string;
      nodeType: string;
      nodeName: string;
    },
    public readonly metadata?: Record<string, any>
  ) {}
}

export class NodeUpdated implements DomainEvent {
  readonly eventType = 'NodeUpdated';
  readonly aggregateType = 'FunctionModel';

  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly occurredOn: Date,
    public readonly data: {
      modelId: string;
      nodeId: string;
      changes: string[];
      previousValues: Record<string, any>;
      newValues: Record<string, any>;
    },
    public readonly metadata?: Record<string, any>
  ) {}
}

export class NodeDeleted implements DomainEvent {
  readonly eventType = 'NodeDeleted';
  readonly aggregateType = 'FunctionModel';

  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly occurredOn: Date,
    public readonly data: {
      modelId: string;
      nodeId: string;
      nodeName: string;
      nodeType: string;
      softDelete: boolean;
    },
    public readonly metadata?: Record<string, any>
  ) {}
}

export class ActionNodeAdded implements DomainEvent {
  readonly eventType = 'ActionNodeAdded';
  readonly aggregateType = 'FunctionModel';

  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly occurredOn: Date,
    public readonly data: {
      modelId: string;
      actionId: string;
      parentNodeId: string;
      actionType: string;
      actionName: string;
    },
    public readonly metadata?: Record<string, any>
  ) {}
}

export class WorkflowExecutionStarted implements DomainEvent {
  readonly eventType = 'WorkflowExecutionStarted';
  readonly aggregateType = 'FunctionModel';

  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly occurredOn: Date,
    public readonly data: {
      modelId: string;
      executionId: string;
      startedBy: string;
      context: Record<string, any>;
    },
    public readonly metadata?: Record<string, any>
  ) {}
}

export class WorkflowExecutionCompleted implements DomainEvent {
  readonly eventType = 'WorkflowExecutionCompleted';
  readonly aggregateType = 'FunctionModel';

  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly occurredOn: Date,
    public readonly data: {
      modelId: string;
      executionId: string;
      result: 'success' | 'failure' | 'cancelled';
      duration: number;
      summary: Record<string, any>;
    },
    public readonly metadata?: Record<string, any>
  ) {}
}

/**
 * NodeCreated event - for unified node creation system
 * This event is published when a unified node is successfully created
 */
export class NodeCreated implements DomainEvent {
  readonly eventType = 'NodeCreated';
  readonly aggregateType = 'FunctionModel';

  constructor(
    public readonly eventId: string,
    public readonly aggregateId: string,
    public readonly aggregateVersion: number,
    public readonly occurredOn: Date,
    public readonly data: {
      nodeId: string;
      nodeType: string;
      nodeName: string;
      position: { x: number; y: number };
      createdAt: Date;
      typeSpecificData?: Record<string, any>;
    },
    public readonly metadata?: Record<string, any>
  ) {}
}