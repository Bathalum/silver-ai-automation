import { NodeId } from '../value-objects/node-id';
import { FeatureType, LinkType } from '../enums';
import { Result } from '../shared/result';

export interface NodeLinkProps {
  linkId: NodeId;
  sourceFeature: FeatureType;
  targetFeature: FeatureType;
  sourceEntityId: string;
  targetEntityId: string;
  sourceNodeId?: NodeId;
  targetNodeId?: NodeId;
  linkType: LinkType;
  linkStrength: number;
  linkContext?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * NodeLink represents granular relationships between individual nodes across or within features.
 * Supports both entity-level and node-level linking with semantic relationship types.
 */
export class NodeLink {
  private constructor(private props: NodeLinkProps) {}

  public static create(props: Omit<NodeLinkProps, 'createdAt' | 'updatedAt'>): Result<NodeLink> {
    const now = new Date();
    const linkProps: NodeLinkProps = {
      ...props,
      createdAt: now,
      updatedAt: now,
    };

    // Validate business rules
    const validationResult = NodeLink.validate(linkProps);
    if (validationResult.isFailure) {
      return Result.fail<NodeLink>(validationResult.error);
    }

    return Result.ok<NodeLink>(new NodeLink(linkProps));
  }

  public get linkId(): NodeId {
    return this.props.linkId;
  }

  public get sourceFeature(): FeatureType {
    return this.props.sourceFeature;
  }

  public get targetFeature(): FeatureType {
    return this.props.targetFeature;
  }

  public get sourceEntityId(): string {
    return this.props.sourceEntityId;
  }

  public get targetEntityId(): string {
    return this.props.targetEntityId;
  }

  public get sourceNodeId(): NodeId | undefined {
    return this.props.sourceNodeId;
  }

  public get targetNodeId(): NodeId | undefined {
    return this.props.targetNodeId;
  }

  public get linkType(): LinkType {
    return this.props.linkType;
  }

  public get linkStrength(): number {
    return this.props.linkStrength;
  }

  public get linkContext(): Readonly<Record<string, any>> | undefined {
    return this.props.linkContext ? { ...this.props.linkContext } : undefined;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public updateLinkStrength(strength: number): Result<void> {
    if (strength < 0 || strength > 1) {
      return Result.fail<void>('Link strength must be between 0.0 and 1.0');
    }

    this.props.linkStrength = strength;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateLinkContext(context?: Record<string, any>): Result<void> {
    this.props.linkContext = context ? { ...context } : undefined;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateLinkType(linkType: LinkType): Result<void> {
    this.props.linkType = linkType;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public isNodeLevel(): boolean {
    return !!(this.props.sourceNodeId || this.props.targetNodeId);
  }

  public isEntityLevel(): boolean {
    return !this.isNodeLevel();
  }

  public isSelfLink(): boolean {
    return this.props.sourceFeature === this.props.targetFeature &&
           this.props.sourceEntityId === this.props.targetEntityId;
  }

  public isCrossFeatureLink(): boolean {
    return this.props.sourceFeature !== this.props.targetFeature;
  }

  public hasStrongLink(): boolean {
    return this.props.linkStrength >= 0.7;
  }

  public hasWeakLink(): boolean {
    return this.props.linkStrength <= 0.3;
  }

  public equals(other: NodeLink): boolean {
    return this.linkId.equals(other.linkId);
  }

  private static validate(props: NodeLinkProps): Result<void> {
    // Prevent self-links
    if (props.sourceFeature === props.targetFeature &&
        props.sourceEntityId === props.targetEntityId &&
        props.sourceNodeId?.equals(props.targetNodeId || props.sourceNodeId)) {
      return Result.fail<void>('Self-links are prohibited');
    }

    // Validate link strength range
    if (props.linkStrength < 0 || props.linkStrength > 1) {
      return Result.fail<void>('Link strength must be between 0.0 and 1.0');
    }

    // Validate entity IDs
    if (!props.sourceEntityId || props.sourceEntityId.trim().length === 0) {
      return Result.fail<void>('Source entity ID cannot be empty');
    }

    if (!props.targetEntityId || props.targetEntityId.trim().length === 0) {
      return Result.fail<void>('Target entity ID cannot be empty');
    }

    // Validate node-level constraints
    if (props.sourceNodeId && !props.targetNodeId) {
      return Result.fail<void>('If source node is specified, target node must also be specified');
    }

    if (props.targetNodeId && !props.sourceNodeId) {
      return Result.fail<void>('If target node is specified, source node must also be specified');
    }

    return Result.ok<void>(undefined);
  }
}