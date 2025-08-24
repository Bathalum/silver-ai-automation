import { NodeId } from '../value-objects/node-id';
import { Position } from '../value-objects/position';
import { FeatureType } from '../enums';
import { Result } from '../shared/result';

export interface NodeMetadataProps {
  metadataId: NodeId;
  featureType: FeatureType;
  entityId: string;
  nodeId: NodeId;
  nodeType: string;
  position: Position;
  vectorEmbedding?: number[];
  searchKeywords: string[];
  aiAgentConfig?: Record<string, any>;
  visualProperties?: Record<string, any>;
  semanticTags?: string[];
  lastIndexedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * NodeMetadata provides unified metadata management for all node types across features.
 * Supports searchable index, semantic search capabilities, and AI agent configuration.
 */
export class NodeMetadata {
  private constructor(private props: NodeMetadataProps) {}

  public static create(props: Omit<NodeMetadataProps, 'createdAt' | 'updatedAt'>): Result<NodeMetadata> {
    const now = new Date();
    const metadataProps: NodeMetadataProps = {
      ...props,
      createdAt: now,
      updatedAt: now,
    };

    // Validate business rules
    const validationResult = NodeMetadata.validate(metadataProps);
    if (validationResult.isFailure) {
      return Result.fail<NodeMetadata>(validationResult.error);
    }

    return Result.ok<NodeMetadata>(new NodeMetadata(metadataProps));
  }

  public get metadataId(): NodeId {
    return this.props.metadataId;
  }

  public get featureType(): FeatureType {
    return this.props.featureType;
  }

  public get entityId(): string {
    return this.props.entityId;
  }

  public get nodeId(): NodeId {
    return this.props.nodeId;
  }

  public get nodeType(): string {
    return this.props.nodeType;
  }

  public get position(): Position {
    return this.props.position;
  }

  public get vectorEmbedding(): Readonly<number[]> | undefined {
    return this.props.vectorEmbedding ? [...this.props.vectorEmbedding] : undefined;
  }

  public get searchKeywords(): Readonly<string[]> {
    return [...this.props.searchKeywords];
  }

  public get aiAgentConfig(): Readonly<Record<string, any>> | undefined {
    return this.props.aiAgentConfig ? { ...this.props.aiAgentConfig } : undefined;
  }

  public get visualProperties(): Readonly<Record<string, any>> | undefined {
    return this.props.visualProperties ? { ...this.props.visualProperties } : undefined;
  }

  public get semanticTags(): Readonly<string[]> | undefined {
    return this.props.semanticTags ? [...this.props.semanticTags] : undefined;
  }

  public get lastIndexedAt(): Date | undefined {
    return this.props.lastIndexedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public updatePosition(position: Position): Result<void> {
    this.props.position = position;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateVectorEmbedding(embedding: number[]): Result<void> {
    const validationResult = this.validateVectorEmbedding(embedding);
    if (validationResult.isFailure) {
      return validationResult;
    }

    this.props.vectorEmbedding = [...embedding];
    this.props.lastIndexedAt = new Date();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addSearchKeyword(keyword: string): Result<void> {
    if (!keyword || keyword.trim().length === 0) {
      return Result.fail<void>('Search keyword cannot be empty');
    }

    const normalizedKeyword = keyword.trim().toLowerCase();
    if (this.props.searchKeywords.includes(normalizedKeyword)) {
      return Result.fail<void>('Search keyword already exists');
    }

    if (this.props.searchKeywords.length >= 50) {
      return Result.fail<void>('Cannot have more than 50 search keywords');
    }

    this.props.searchKeywords.push(normalizedKeyword);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeSearchKeyword(keyword: string): Result<void> {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const index = this.props.searchKeywords.indexOf(normalizedKeyword);
    
    if (index === -1) {
      return Result.fail<void>('Search keyword does not exist');
    }

    this.props.searchKeywords.splice(index, 1);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateSearchKeywords(keywords: string[]): Result<void> {
    if (keywords.length > 50) {
      return Result.fail<void>('Cannot have more than 50 search keywords');
    }

    // Normalize and deduplicate keywords
    const normalizedKeywords = keywords
      .map(k => k.trim().toLowerCase())
      .filter((k, index, arr) => k.length > 0 && arr.indexOf(k) === index);

    this.props.searchKeywords = normalizedKeywords;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateAIAgentConfig(config?: Record<string, any>): Result<void> {
    this.props.aiAgentConfig = config ? { ...config } : undefined;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateVisualProperties(properties?: Record<string, any>): Result<void> {
    this.props.visualProperties = properties ? { ...properties } : undefined;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addSemanticTag(tag: string): Result<void> {
    if (!tag || tag.trim().length === 0) {
      return Result.fail<void>('Semantic tag cannot be empty');
    }

    if (!this.props.semanticTags) {
      this.props.semanticTags = [];
    }

    const normalizedTag = tag.trim().toLowerCase();
    if (this.props.semanticTags.includes(normalizedTag)) {
      return Result.fail<void>('Semantic tag already exists');
    }

    if (this.props.semanticTags.length >= 20) {
      return Result.fail<void>('Cannot have more than 20 semantic tags');
    }

    this.props.semanticTags.push(normalizedTag);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeSemanticTag(tag: string): Result<void> {
    if (!this.props.semanticTags) {
      return Result.fail<void>('Semantic tag does not exist');
    }

    const normalizedTag = tag.trim().toLowerCase();
    const index = this.props.semanticTags.indexOf(normalizedTag);
    
    if (index === -1) {
      return Result.fail<void>('Semantic tag does not exist');
    }

    this.props.semanticTags.splice(index, 1);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public hasVectorEmbedding(): boolean {
    return !!this.props.vectorEmbedding && this.props.vectorEmbedding.length > 0;
  }

  public hasAIAgentConfig(): boolean {
    return !!this.props.aiAgentConfig;
  }

  public hasVisualProperties(): boolean {
    return !!this.props.visualProperties;
  }

  public hasSemanticTags(): boolean {
    return !!this.props.semanticTags && this.props.semanticTags.length > 0;
  }

  public matchesKeyword(keyword: string): boolean {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return this.props.searchKeywords.some(k => k.includes(normalizedKeyword));
  }

  public matchesSemanticTag(tag: string): boolean {
    if (!this.props.semanticTags) return false;
    const normalizedTag = tag.trim().toLowerCase();
    return this.props.semanticTags.includes(normalizedTag);
  }

  public calculateSimilarity(other: NodeMetadata): number {
    if (!this.hasVectorEmbedding() || !other.hasVectorEmbedding()) {
      return 0;
    }

    const thisEmbedding = this.props.vectorEmbedding!;
    const otherEmbedding = other.props.vectorEmbedding!;

    if (thisEmbedding.length !== otherEmbedding.length) {
      return 0;
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let thisMagnitude = 0;
    let otherMagnitude = 0;

    for (let i = 0; i < thisEmbedding.length; i++) {
      dotProduct += thisEmbedding[i] * otherEmbedding[i];
      thisMagnitude += thisEmbedding[i] * thisEmbedding[i];
      otherMagnitude += otherEmbedding[i] * otherEmbedding[i];
    }

    const magnitude = Math.sqrt(thisMagnitude) * Math.sqrt(otherMagnitude);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  public equals(other: NodeMetadata): boolean {
    return this.metadataId.equals(other.metadataId);
  }

  private validateVectorEmbedding(embedding: number[]): Result<void> {
    if (embedding.length === 0) {
      return Result.fail<void>('Vector embedding cannot be empty');
    }

    if (embedding.length > 4096) {
      return Result.fail<void>('Vector embedding cannot exceed 4096 dimensions');
    }

    // Check for valid numbers
    for (const value of embedding) {
      if (typeof value !== 'number' || !isFinite(value)) {
        return Result.fail<void>('Vector embedding must contain only finite numbers');
      }
    }

    return Result.ok<void>(undefined);
  }

  private static validate(props: NodeMetadataProps): Result<void> {
    if (!props.entityId || props.entityId.trim().length === 0) {
      return Result.fail<void>('Entity ID is required');
    }

    if (!props.nodeType || props.nodeType.trim().length === 0) {
      return Result.fail<void>('Node type is required');
    }

    if (props.searchKeywords.length > 50) {
      return Result.fail<void>('Cannot have more than 50 search keywords');
    }

    if (props.semanticTags && props.semanticTags.length > 20) {
      return Result.fail<void>('Cannot have more than 20 semantic tags');
    }

    if (props.vectorEmbedding && props.vectorEmbedding.length > 4096) {
      return Result.fail<void>('Vector embedding cannot exceed 4096 dimensions');
    }

    return Result.ok<void>(undefined);
  }
}