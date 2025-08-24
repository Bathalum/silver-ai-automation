import { NodeId } from '../value-objects/node-id';
import { FeatureType, LinkType } from '../enums';
import { Result } from '../shared/result';

export interface CrossFeatureLinkProps {
  linkId: NodeId;
  sourceFeature: FeatureType;
  targetFeature: FeatureType;
  sourceId: string;
  targetId: string;
  linkType: LinkType;
  linkStrength: number;
  nodeContext?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CrossFeatureLink represents high-level relationships between different feature entities.
 * Enforces feature-level relationship constraints and supports both entity and node-level contexts.
 */
export class CrossFeatureLink {
  private constructor(private props: CrossFeatureLinkProps) {}

  public static create(props: Omit<CrossFeatureLinkProps, 'createdAt' | 'updatedAt'> | (Omit<CrossFeatureLinkProps, 'createdAt' | 'updatedAt' | 'linkId'> & { linkId: string })): Result<CrossFeatureLink> {
    const now = new Date();
    
    // Handle string linkId by converting to NodeId
    let linkId: NodeId;
    if (typeof (props as any).linkId === 'string') {
      const linkIdResult = NodeId.create((props as any).linkId);
      if (linkIdResult.isFailure) {
        return Result.fail<CrossFeatureLink>(linkIdResult.error);
      }
      linkId = linkIdResult.value;
    } else {
      linkId = (props as CrossFeatureLinkProps).linkId;
    }
    
    const linkProps: CrossFeatureLinkProps = {
      ...(props as any),
      linkId,
      createdAt: now,
      updatedAt: now,
    };

    // Validate business rules
    const validationResult = CrossFeatureLink.validate(linkProps);
    if (validationResult.isFailure) {
      return Result.fail<CrossFeatureLink>(validationResult.error);
    }

    return Result.ok<CrossFeatureLink>(new CrossFeatureLink(linkProps));
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

  public get sourceId(): string {
    return this.props.sourceId;
  }

  public get targetId(): string {
    return this.props.targetId;
  }

  public get linkType(): LinkType {
    return this.props.linkType;
  }

  public get linkStrength(): number {
    return this.props.linkStrength;
  }

  public get nodeContext(): Readonly<Record<string, any>> | undefined {
    return this.props.nodeContext ? { ...this.props.nodeContext } : undefined;
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

  public updateNodeContext(context?: Record<string, any>): Result<void> {
    if (context) {
      const validationResult = this.validateNodeContext(context);
      if (validationResult.isFailure) {
        return validationResult;
      }
    }

    this.props.nodeContext = context ? { ...context } : undefined;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateLinkType(linkType: LinkType): Result<void> {
    // Validate link type compatibility with features
    const validationResult = this.validateLinkTypeCompatibility(linkType);
    if (validationResult.isFailure) {
      return validationResult;
    }

    this.props.linkType = linkType;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public isCrossFeature(): boolean {
    return this.props.sourceFeature !== this.props.targetFeature;
  }

  public hasNodeContext(): boolean {
    return !!this.props.nodeContext;
  }

  public isDocumentationLink(): boolean {
    return this.props.linkType === LinkType.DOCUMENTS;
  }

  public isImplementationLink(): boolean {
    return this.props.linkType === LinkType.IMPLEMENTS;
  }

  public isReferenceLink(): boolean {
    return this.props.linkType === LinkType.REFERENCES;
  }

  public isSupportLink(): boolean {
    return this.props.linkType === LinkType.SUPPORTS;
  }

  public isNestedLink(): boolean {
    return this.props.linkType === LinkType.NESTED;
  }

  public hasStrongLink(): boolean {
    return this.props.linkStrength >= 0.7;
  }

  public hasWeakLink(): boolean {
    return this.props.linkStrength <= 0.3;
  }

  public equals(other: CrossFeatureLink): boolean {
    return this.linkId.equals(other.linkId);
  }

  private validateNodeContext(context: Record<string, any>): Result<void> {
    // Validate node context structure and content
    const requiredFields = ['nodeId', 'nodeType'];
    for (const field of requiredFields) {
      if (!context[field]) {
        return Result.fail<void>(`Node context missing required field: ${field}`);
      }
    }

    return Result.ok<void>(undefined);
  }

  private validateLinkTypeCompatibility(linkType: LinkType): Result<void> {
    // Define feature compatibility matrix
    const compatibilityMatrix: Record<string, LinkType[]> = {
      [`${FeatureType.FUNCTION_MODEL}-${FeatureType.KNOWLEDGE_BASE}`]: [
        LinkType.DOCUMENTS, LinkType.REFERENCES, LinkType.SUPPORTS
      ],
      [`${FeatureType.FUNCTION_MODEL}-${FeatureType.SPINDLE}`]: [
        LinkType.IMPLEMENTS, LinkType.TRIGGERS, LinkType.CONSUMES, LinkType.PRODUCES
      ],
      [`${FeatureType.FUNCTION_MODEL}-${FeatureType.EVENT_STORM}`]: [
        LinkType.TRIGGERS, LinkType.CONSUMES, LinkType.PRODUCES
      ],
      [`${FeatureType.KNOWLEDGE_BASE}-${FeatureType.SPINDLE}`]: [
        LinkType.DOCUMENTS, LinkType.SUPPORTS
      ],
    };

    const featurePair = `${this.props.sourceFeature}-${this.props.targetFeature}`;
    const reversePair = `${this.props.targetFeature}-${this.props.sourceFeature}`;
    
    const allowedTypes = compatibilityMatrix[featurePair] || compatibilityMatrix[reversePair] || Object.values(LinkType);
    
    if (!allowedTypes.includes(linkType)) {
      return Result.fail<void>(`Link type ${linkType} is not compatible with features ${this.props.sourceFeature} and ${this.props.targetFeature}`);
    }

    return Result.ok<void>(undefined);
  }

  private static validate(props: CrossFeatureLinkProps): Result<void> {
    // Allow same feature type linking (different aggregates of same feature)
    // But prevent self-linking at entity level
    if (props.sourceId === props.targetId) {
      return Result.fail<void>('Self-linking at entity level is prohibited');
    }

    // Validate link strength range
    if (props.linkStrength < 0 || props.linkStrength > 1) {
      return Result.fail<void>('Link strength must be between 0.0 and 1.0');
    }

    // Validate entity IDs
    if (!props.sourceId || props.sourceId.trim().length === 0) {
      return Result.fail<void>('Source entity ID cannot be empty');
    }

    if (!props.targetId || props.targetId.trim().length === 0) {
      return Result.fail<void>('Target entity ID cannot be empty');
    }

    return Result.ok<void>(undefined);
  }
}