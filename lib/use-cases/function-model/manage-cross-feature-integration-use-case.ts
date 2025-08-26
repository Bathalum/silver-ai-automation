/**
 * @fileoverview
 * UC-014, UC-015, UC-016: Cross-Feature Integration Use Cases
 * 
 * CLEAN ARCHITECTURE COMPLIANCE:
 * - Use Case orchestrates Domain Services and enforces business workflows
 * - Depends on abstractions (interfaces) not concretions
 * - Domain entities and services handle business logic
 * - Repository interfaces abstract infrastructure concerns
 * - Event publishing follows domain event patterns
 * 
 * RESPONSIBILITIES:
 * - UC-014: Create Cross-Feature Link - Establish relationships between features
 * - UC-015: Calculate Link Strength - Analyze and update relationship strength
 * - UC-016: Detect Relationship Cycles - Identify circular dependencies
 * 
 * ARCHITECTURAL BOUNDARIES:
 * - Domain Layer: CrossFeatureLinkingService, entities, value objects
 * - Application Layer: This use case orchestrates workflows
 * - Infrastructure Layer: Repository implementations and event bus
 */

import { Result } from '../../domain/shared/result';
import { FeatureType, LinkType } from '../../domain/enums';
import { NodeId } from '../../domain/value-objects/node-id';
import { CrossFeatureLink } from '../../domain/entities/cross-feature-link';
import { NodeLink } from '../../domain/entities/node-link';
import { CrossFeatureLinkingService, LinkStrengthCalculation, RelationshipCycle } from '../../domain/services/cross-feature-linking-service';
import { DomainEventPublisher } from '../../domain/events/domain-event-publisher';
import { CrossFeatureLinkEstablished } from '../../domain/events/model-events';

// Repository interfaces - Define contracts for infrastructure layer
export interface ICrossFeatureLinkRepository {
  save(link: CrossFeatureLink): Promise<void>;
  findById(linkId: NodeId): Promise<Result<CrossFeatureLink>>;
  findByFeaturePair(sourceFeature: FeatureType, targetFeature: FeatureType): Promise<CrossFeatureLink[]>;
  remove(linkId: NodeId): Promise<void>;
}

export interface INodeLinkRepository {
  save(link: NodeLink): Promise<void>;
  findById(linkId: NodeId): Promise<Result<NodeLink>>;
  findByNodeIds(sourceNodeId: NodeId, targetNodeId: NodeId): Promise<NodeLink[]>;
  remove(linkId: NodeId): Promise<void>;
}

// Request/Response DTOs for use case boundaries
export interface CreateCrossFeatureLinkRequest {
  sourceFeature: FeatureType;
  targetFeature: FeatureType;
  sourceId: string;
  targetId: string;
  linkType: LinkType;
  initialStrength?: number;
  nodeContext?: Record<string, any>;
  createdBy: string;
}

export interface CreateNodeLinkRequest {
  sourceFeature: FeatureType;
  targetFeature: FeatureType;
  sourceEntityId: string;
  targetEntityId: string;
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
  linkType: LinkType;
  initialStrength?: number;
  linkContext?: Record<string, any>;
  createdBy: string;
}

export interface CalculateLinkStrengthRequest {
  linkId: NodeId;
  interactionFrequency: number;
  semanticSimilarity: number;
  contextRelevance: number;
}

/**
 * ManageCrossFeatureIntegrationUseCase
 * 
 * Orchestrates cross-feature relationship management across the platform.
 * Implements three main use cases for comprehensive integration management.
 */
export class ManageCrossFeatureIntegrationUseCase {
  constructor(
    private crossFeatureLinkingService: CrossFeatureLinkingService,
    private crossFeatureLinkRepository: ICrossFeatureLinkRepository,
    private nodeLinkRepository: INodeLinkRepository,
    private eventPublisher: DomainEventPublisher
  ) {}

  /**
   * UC-014: Create Cross-Feature Link
   * 
   * Main Success Scenario:
   * 1. System validates link creation request
   * 2. System checks feature compatibility for link type
   * 3. System creates CrossFeatureLink entity
   * 4. System calculates initial link strength
   * 5. System validates link constraints
   * 6. System persists link through repository
   * 7. System raises CrossFeatureLinkEstablished event
   */
  async createCrossFeatureLink(request: CreateCrossFeatureLinkRequest): Promise<Result<CrossFeatureLink>> {
    try {
      // Step 1: System validates link creation request
      if (!request.sourceId || !request.targetId || !request.createdBy) {
        return Result.fail<CrossFeatureLink>('Missing required fields for link creation');
      }

      // Step 2: System checks feature compatibility for link type
      const compatibilityResult = this.crossFeatureLinkingService.validateLinkConstraints(
        request.sourceFeature,
        request.targetFeature,
        request.linkType
      );

      if (compatibilityResult.isFailure) {
        return Result.fail<CrossFeatureLink>(`Feature compatibility check failed: ${compatibilityResult.error}`);
      }

      const validation = compatibilityResult.value;
      if (!validation.isValid) {
        return Result.fail<CrossFeatureLink>(`Link validation failed: ${validation.errors.join('; ')}`);
      }

      // Step 3: System creates CrossFeatureLink entity
      // Steps 4 & 5: Calculate initial strength and validate constraints (handled by service)
      const linkResult = this.crossFeatureLinkingService.createCrossFeatureLink(
        request.sourceFeature,
        request.targetFeature,
        request.sourceId,
        request.targetId,
        request.linkType,
        request.initialStrength || 0.5,
        request.nodeContext
      );

      if (linkResult.isFailure) {
        return Result.fail<CrossFeatureLink>(`Link creation failed: ${linkResult.error}`);
      }

      const link = linkResult.value;

      // Step 6: System persists link through repository
      await this.crossFeatureLinkRepository.save(link);

      // Step 7: System raises CrossFeatureLinkEstablished event
      const linkEstablishedEvent = new CrossFeatureLinkEstablished(
        link.linkId.value,
        link.linkId.value,
        link.sourceFeature,
        link.targetFeature,
        link.linkType,
        link.linkStrength,
        request.createdBy
      );

      await this.eventPublisher.publish(linkEstablishedEvent);

      return Result.ok<CrossFeatureLink>(link);

    } catch (error) {
      return Result.fail<CrossFeatureLink>(`Cross-feature link creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * UC-015: Calculate Link Strength
   * 
   * Main Success Scenario:
   * 1. System analyzes interaction frequency
   * 2. System calculates semantic similarity
   * 3. System evaluates context relevance
   * 4. System applies bonuses and caps:
   *    - Frequency bonus: max 0.2
   *    - Semantic bonus: max 0.3
   *    - Context bonus: max 0.2
   * 5. System caps final strength at 1.0
   * 6. System returns LinkStrengthCalculation
   */
  async calculateLinkStrength(request: CalculateLinkStrengthRequest): Promise<Result<LinkStrengthCalculation>> {
    try {
      // Steps 1-6: System analyzes metrics, applies bonuses/caps, returns calculation
      const calculationResult = this.crossFeatureLinkingService.calculateLinkStrength(
        request.linkId,
        request.interactionFrequency,
        request.semanticSimilarity,
        request.contextRelevance
      );

      if (calculationResult.isFailure) {
        return Result.fail<LinkStrengthCalculation>(`Link strength calculation failed: ${calculationResult.error}`);
      }

      return calculationResult;

    } catch (error) {
      return Result.fail<LinkStrengthCalculation>(`Link strength calculation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * UC-016: Detect Relationship Cycles
   * 
   * Main Success Scenario:
   * 1. System builds relationship graph
   * 2. System performs cycle detection algorithm
   * 3. System identifies cycle paths and lengths
   * 4. System categorizes cycle types
   * 5. System returns cycle information for resolution
   */
  async detectRelationshipCycles(): Promise<Result<RelationshipCycle[]>> {
    try {
      // Steps 1-5: System builds graph, detects cycles, categorizes types, returns info
      const cycleDetectionResult = this.crossFeatureLinkingService.detectRelationshipCycles();

      if (cycleDetectionResult.isFailure) {
        return Result.fail<RelationshipCycle[]>(`Cycle detection failed: ${cycleDetectionResult.error}`);
      }

      return cycleDetectionResult;

    } catch (error) {
      return Result.fail<RelationshipCycle[]>(`Cycle detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create Node Link (supporting operation)
   * 
   * Creates node-level relationships between features, providing more
   * granular linking than cross-feature links.
   */
  async createNodeLink(request: CreateNodeLinkRequest): Promise<Result<NodeLink>> {
    try {
      const linkResult = this.crossFeatureLinkingService.createNodeLink(
        request.sourceFeature,
        request.targetFeature,
        request.sourceEntityId,
        request.targetEntityId,
        request.sourceNodeId,
        request.targetNodeId,
        request.linkType,
        request.initialStrength || 0.5,
        request.linkContext
      );

      if (linkResult.isFailure) {
        return linkResult;
      }

      const link = linkResult.value;
      await this.nodeLinkRepository.save(link);

      return Result.ok<NodeLink>(link);

    } catch (error) {
      return Result.fail<NodeLink>(`Node link creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get Cross-Feature Links by Feature
   * 
   * Retrieves all links associated with a specific feature type.
   */
  async getLinksByFeature(featureType: FeatureType): Promise<Result<(CrossFeatureLink | NodeLink)[]>> {
    try {
      const links = this.crossFeatureLinkingService.getFeatureLinks(featureType);
      return Result.ok<(CrossFeatureLink | NodeLink)[]>(links);

    } catch (error) {
      return Result.fail<(CrossFeatureLink | NodeLink)[]>(`Failed to retrieve links: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get Network Metrics
   * 
   * Calculates comprehensive metrics about the cross-feature link network.
   */
  async getNetworkMetrics(): Promise<Result<{
    totalLinks: number;
    averageLinkStrength: number;
    strongestConnection: number;
    weakestConnection: number;
    featureConnectivity: Record<string, number>;
  }>> {
    try {
      const metrics = this.crossFeatureLinkingService.calculateNetworkMetrics();
      return Result.ok(metrics);

    } catch (error) {
      return Result.fail(`Failed to calculate network metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Remove Cross-Feature Link
   * 
   * Removes a link from the network and updates caches.
   */
  async removeCrossFeatureLink(linkId: NodeId): Promise<Result<void>> {
    try {
      // Remove from domain service first
      const removalResult = this.crossFeatureLinkingService.removeLink(linkId);
      if (removalResult.isFailure) {
        return Result.fail<void>(`Failed to remove link from service: ${removalResult.error}`);
      }

      // Remove from repository
      await this.crossFeatureLinkRepository.remove(linkId);

      return Result.ok<void>(undefined);

    } catch (error) {
      return Result.fail<void>(`Failed to remove cross-feature link: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}