export abstract class DomainEvent {
  public readonly occurredOn: Date;
  public readonly eventId: string;

  constructor(
    public readonly aggregateId: string,
    public readonly eventVersion: number = 1
  ) {
    this.occurredOn = new Date();
    this.eventId = crypto.randomUUID();
  }

  public abstract getEventName(): string;
  public abstract getEventData(): Record<string, any>;

  public equals(other: DomainEvent): boolean {
    return this.eventId === other.eventId;
  }

  public toObject(): {
    eventId: string;
    eventName: string;
    aggregateId: string;
    eventVersion: number;
    occurredOn: string;
    eventData: Record<string, any>;
  } {
    return {
      eventId: this.eventId,
      eventName: this.getEventName(),
      aggregateId: this.aggregateId,
      eventVersion: this.eventVersion,
      occurredOn: this.occurredOn.toISOString(),
      eventData: this.getEventData(),
    };
  }
}