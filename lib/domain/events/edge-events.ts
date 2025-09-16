import { DomainEvent } from './domain-event';

// Domain event for edge creation
export class EdgeCreated extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly sourceNodeId: string,
    public readonly targetNodeId: string,
    public readonly sourceHandle: string,
    public readonly targetHandle: string,
    public readonly modelId: string,
    public readonly userId: string
  ) {
    super(aggregateId);
  }

  public getEventName(): string {
    return 'EdgeCreated';
  }

  public getEventData(): Record<string, any> {
    return {
      sourceNodeId: this.sourceNodeId,
      targetNodeId: this.targetNodeId,
      sourceHandle: this.sourceHandle,
      targetHandle: this.targetHandle,
      modelId: this.modelId,
      userId: this.userId
    };
  }
}

// Domain event for edge deletion
export class EdgeDeleted extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly sourceNodeId: string,
    public readonly targetNodeId: string,
    public readonly modelId: string,
    public readonly userId: string,
    public readonly deletedAt: Date
  ) {
    super(aggregateId);
  }

  public getEventName(): string {
    return 'EdgeDeleted';
  }

  public getEventData(): Record<string, any> {
    return {
      sourceNodeId: this.sourceNodeId,
      targetNodeId: this.targetNodeId,
      modelId: this.modelId,
      userId: this.userId,
      deletedAt: this.deletedAt.toISOString()
    };
  }
}