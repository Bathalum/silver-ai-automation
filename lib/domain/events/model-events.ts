import { DomainEvent } from './domain-event';
import { ModelStatus } from '../enums';

export class ModelCreated extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly modelName: string,
    public readonly version: string,
    public readonly createdBy: string,
    eventVersion = 1
  ) {
    super(aggregateId, eventVersion);
  }

  public getEventName(): string {
    return 'ModelCreated';
  }

  public getEventData(): Record<string, any> {
    return {
      modelName: this.modelName,
      version: this.version,
      createdBy: this.createdBy,
    };
  }
}

export class ModelUpdated extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly changes: Record<string, any>,
    public readonly updatedBy: string,
    eventVersion = 1
  ) {
    super(aggregateId, eventVersion);
  }

  public getEventName(): string {
    return 'ModelUpdated';
  }

  public getEventData(): Record<string, any> {
    return {
      changes: this.changes,
      updatedBy: this.updatedBy,
    };
  }
}

export class ModelPublished extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly version: string,
    public readonly publishedBy: string,
    eventVersion = 1
  ) {
    super(aggregateId, eventVersion);
  }

  public getEventName(): string {
    return 'ModelPublished';
  }

  public getEventData(): Record<string, any> {
    return {
      version: this.version,
      publishedBy: this.publishedBy,
    };
  }
}

export class ModelArchived extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly previousStatus: ModelStatus,
    public readonly archivedBy: string,
    public readonly reason?: string,
    eventVersion = 1
  ) {
    super(aggregateId, eventVersion);
  }

  public getEventName(): string {
    return 'ModelArchived';
  }

  public getEventData(): Record<string, any> {
    return {
      previousStatus: this.previousStatus,
      archivedBy: this.archivedBy,
      reason: this.reason,
    };
  }
}

export class ModelDeleted extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly deletedBy: string,
    public readonly hardDelete: boolean = false,
    eventVersion = 1
  ) {
    super(aggregateId, eventVersion);
  }

  public getEventName(): string {
    return 'ModelDeleted';
  }

  public getEventData(): Record<string, any> {
    return {
      deletedBy: this.deletedBy,
      hardDelete: this.hardDelete,
    };
  }
}

export class VersionCreated extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly newVersion: string,
    public readonly previousVersion: string,
    public readonly createdBy: string,
    eventVersion = 1
  ) {
    super(aggregateId, eventVersion);
  }

  public getEventName(): string {
    return 'VersionCreated';
  }

  public getEventData(): Record<string, any> {
    return {
      newVersion: this.newVersion,
      previousVersion: this.previousVersion,
      createdBy: this.createdBy,
    };
  }
}