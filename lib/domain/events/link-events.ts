import { DomainEvent } from './domain-event';
import { FeatureType, LinkType } from '../enums';

export interface NodeLinkCreatedData {
  linkId: string;
  sourceFeature: FeatureType;
  targetFeature: FeatureType;
  sourceEntityId: string;
  targetEntityId: string;
  sourceNodeId: string;
  targetNodeId: string;
  linkType: LinkType;
  linkStrength: number;
  createdBy: string;
  createdAt: Date;
}

export interface CrossFeatureLinkCreatedData {
  linkId: string;
  sourceFeature: FeatureType;
  targetFeature: FeatureType;
  sourceId: string;
  targetId: string;
  linkType: LinkType;
  linkStrength: number;
  metadata: Record<string, any>;
  createdBy: string;
  createdAt: Date;
}

export interface CrossFeatureLinkEstablishedData {
  linkId: string;
  sourceFeature: FeatureType;
  targetFeature: FeatureType;
  linkType: LinkType;
  linkStrength: number;
  establishedBy: string;
  establishedAt: Date;
}

export interface CrossFeatureLinkBrokenData {
  linkId: string;
  brokenBy: string;
  brokenAt: Date;
  reason?: string;
}

export class NodeLinkCreated extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: NodeLinkCreatedData) {
    super(data.linkId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'NodeLinkCreated';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      createdAt: this.data.createdAt.toISOString()
    };
  }

  public get linkId(): string { return this.data.linkId; }
  public get sourceFeature(): FeatureType { return this.data.sourceFeature; }
  public get targetFeature(): FeatureType { return this.data.targetFeature; }
  public get sourceEntityId(): string { return this.data.sourceEntityId; }
  public get targetEntityId(): string { return this.data.targetEntityId; }
  public get sourceNodeId(): string { return this.data.sourceNodeId; }
  public get targetNodeId(): string { return this.data.targetNodeId; }
  public get linkType(): LinkType { return this.data.linkType; }
  public get linkStrength(): number { return this.data.linkStrength; }
  public get createdBy(): string { return this.data.createdBy; }
  public get createdAt(): Date { return this.data.createdAt; }
}

export class NodeLinkRemoved extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: { linkId: string; removedBy: string; removedAt: Date; reason?: string }) {
    super(data.linkId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'NodeLinkRemoved';
  }

  public getEventData(): Record<string, any> {
    return this.data;
  }
}

export class NodeLinkUpdated extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: { linkId: string; changes: Record<string, any>; updatedBy: string; updatedAt: Date }) {
    super(data.linkId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'NodeLinkUpdated';
  }

  public getEventData(): Record<string, any> {
    return this.data;
  }
}

export class CrossFeatureLinkCreated extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: CrossFeatureLinkCreatedData) {
    super(data.linkId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'CrossFeatureLinkCreated';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      createdAt: this.data.createdAt.toISOString()
    };
  }
}

export class CrossFeatureLinkRemoved extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: { linkId: string; removedBy: string; removedAt: Date; reason?: string }) {
    super(data.linkId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'CrossFeatureLinkRemoved';
  }

  public getEventData(): Record<string, any> {
    return this.data;
  }
}

export class CrossFeatureLinkEstablished extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: CrossFeatureLinkEstablishedData) {
    super(data.linkId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'CrossFeatureLinkEstablished';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      establishedAt: this.data.establishedAt.toISOString()
    };
  }

  public get linkId(): string { return this.data.linkId; }
  public get sourceFeature(): FeatureType { return this.data.sourceFeature; }
  public get targetFeature(): FeatureType { return this.data.targetFeature; }
  public get linkType(): LinkType { return this.data.linkType; }
  public get linkStrength(): number { return this.data.linkStrength; }
  public get establishedBy(): string { return this.data.establishedBy; }
  public get establishedAt(): Date { return this.data.establishedAt; }
}

export class CrossFeatureLinkBroken extends DomainEvent {
  public readonly occurredAt: Date;

  constructor(public readonly data: CrossFeatureLinkBrokenData) {
    super(data.linkId);
    this.occurredAt = new Date();
  }

  public getEventName(): string {
    return 'CrossFeatureLinkBroken';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      brokenAt: this.data.brokenAt.toISOString()
    };
  }

  public get linkId(): string { return this.data.linkId; }
  public get brokenBy(): string { return this.data.brokenBy; }
  public get brokenAt(): Date { return this.data.brokenAt; }
  public get reason(): string | undefined { return this.data.reason; }
}