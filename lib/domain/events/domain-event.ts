export abstract class DomainEvent {
  public readonly occurredAt: Date;
  public readonly eventId: string;

  constructor(
    public readonly aggregateId: string,
    public readonly eventVersion: number = 1
  ) {
    this.occurredAt = new Date();
    this.eventId = crypto.randomUUID();
  }

  public abstract getEventName(): string;
  public abstract getEventData(): Record<string, any>;

  // Convenience getters for tests and backwards compatibility
  public get eventType(): string {
    return this.getEventName();
  }

  public equals(other: DomainEvent): boolean {
    return this.eventId === other.eventId;
  }

  public toObject(): {
    eventId: string;
    eventName: string;
    aggregateId: string;
    eventVersion: number;
    occurredAt: string;
    eventData: Record<string, any>;
  } {
    return {
      eventId: this.eventId,
      eventName: this.getEventName(),
      aggregateId: this.aggregateId,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      eventData: this.getEventData(),
    };
  }
}