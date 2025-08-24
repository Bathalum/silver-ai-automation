import { DomainEvent } from './domain-event';

export interface ContainerNodeAddedData {
  modelId: string;
  nodeId: string;
  nodeType: string;
  nodeName: string;
  position: { x: number; y: number };
  addedBy: string;
  addedAt: Date;
}

export interface ContainerNodeRemovedData {
  modelId: string;
  nodeId: string;
  nodeType: string;
  nodeName: string;
  removedBy: string;
  removedAt: Date;
  cascadedActions: string[];
}

export interface ContainerNodeUpdatedData {
  modelId: string;
  nodeId: string;
  nodeType: string;
  nodeName: string;
  changes: Record<string, any>;
  updatedBy: string;
  updatedAt: Date;
}

export interface ActionNodeAddedData {
  modelId: string;
  actionId: string;
  parentNodeId: string;
  actionType: string;
  actionName: string;
  executionOrder: number;
  addedBy: string;
  addedAt: Date;
}

export interface ActionNodeRemovedData {
  modelId: string;
  actionId: string;
  parentNodeId: string;
  actionType: string;
  actionName: string;
  removedBy: string;
  removedAt: Date;
  reason?: string;
}

export interface ActionNodeUpdatedData {
  modelId: string;
  actionId: string;
  actionType: string;
  actionName: string;
  changes: Record<string, any>;
  updatedBy: string;
  updatedAt: Date;
}

export class ContainerNodeAdded extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: ContainerNodeAddedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'ContainerNodeAdded';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      addedAt: this.data.addedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get nodeId(): string { return this.data.nodeId; }
  public get nodeType(): string { return this.data.nodeType; }
  public get nodeName(): string { return this.data.nodeName; }
  public get position(): { x: number; y: number } { return this.data.position; }
  public get addedBy(): string { return this.data.addedBy; }
  public get addedAt(): Date { return this.data.addedAt; }
}

export class ContainerNodeRemoved extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: ContainerNodeRemovedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'ContainerNodeRemoved';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      removedAt: this.data.removedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get nodeId(): string { return this.data.nodeId; }
  public get nodeType(): string { return this.data.nodeType; }
  public get nodeName(): string { return this.data.nodeName; }
  public get removedBy(): string { return this.data.removedBy; }
  public get removedAt(): Date { return this.data.removedAt; }
  public get cascadedActions(): string[] { return this.data.cascadedActions; }
}

export class ContainerNodeUpdated extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: ContainerNodeUpdatedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'ContainerNodeUpdated';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      updatedAt: this.data.updatedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get nodeId(): string { return this.data.nodeId; }
  public get nodeType(): string { return this.data.nodeType; }
  public get nodeName(): string { return this.data.nodeName; }
  public get changes(): Record<string, any> { return this.data.changes; }
  public get updatedBy(): string { return this.data.updatedBy; }
  public get updatedAt(): Date { return this.data.updatedAt; }
}

export class ActionNodeAdded extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeAddedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'ActionNodeAdded';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      addedAt: this.data.addedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get actionId(): string { return this.data.actionId; }
  public get parentNodeId(): string { return this.data.parentNodeId; }
  public get actionType(): string { return this.data.actionType; }
  public get actionName(): string { return this.data.actionName; }
  public get executionOrder(): number { return this.data.executionOrder; }
  public get addedBy(): string { return this.data.addedBy; }
  public get addedAt(): Date { return this.data.addedAt; }
}

export class ActionNodeRemoved extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeRemovedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'ActionNodeRemoved';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      removedAt: this.data.removedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get actionId(): string { return this.data.actionId; }
  public get parentNodeId(): string { return this.data.parentNodeId; }
  public get actionType(): string { return this.data.actionType; }
  public get actionName(): string { return this.data.actionName; }
  public get removedBy(): string { return this.data.removedBy; }
  public get removedAt(): Date { return this.data.removedAt; }
  public get reason(): string | undefined { return this.data.reason; }
}

export class ActionNodeUpdated extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: ActionNodeUpdatedData) {
    super(data.modelId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'ActionNodeUpdated';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      updatedAt: this.data.updatedAt.toISOString()
    };
  }

  public get modelId(): string { return this.data.modelId; }
  public get actionId(): string { return this.data.actionId; }
  public get actionType(): string { return this.data.actionType; }
  public get actionName(): string { return this.data.actionName; }
  public get changes(): Record<string, any> { return this.data.changes; }
  public get updatedBy(): string { return this.data.updatedBy; }
  public get updatedAt(): Date { return this.data.updatedAt; }
}