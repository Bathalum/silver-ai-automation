import { CalculateLinkStrengthCommand } from '../commands/link-commands';
import { CrossFeatureLink } from '../../domain/entities/cross-feature-link';
import { CrossFeatureLinkingService, LinkStrengthCalculation } from '../../domain/services/cross-feature-linking-service';
import { NodeId } from '../../domain/value-objects/node-id';
import { FeatureType } from '../../domain/enums';
import { Result } from '../../domain/shared/result';

/**
 * Repository interface for cross-feature links
 * Following dependency inversion principle - inner layer defines interface
 */
export interface ICrossFeatureLinkRepository {
  findById(linkId: NodeId): Promise<Result<CrossFeatureLink | null>>;
  update(link: CrossFeatureLink): Promise<Result<void>>;
}

/**
 * Analytics service interface for gathering link interaction data
 * Following dependency inversion principle - inner layer defines interface
 */
export interface ILinkAnalyticsService {
  getInteractionFrequency(sourceId: string, targetId: string, timeWindow: number): Promise<number>;
  getSemanticSimilarity(sourceFeature: FeatureType, targetFeature: FeatureType, sourceId: string, targetId: string): Promise<number>;
  getContextRelevance(linkId: string, contextData: Record<string, any>): Promise<number>;
}

/**
 * Domain event publisher interface
 * Following dependency inversion principle - inner layer defines interface
 */
export interface IDomainEventPublisher {
  publish(event: any): Promise<Result<void>>;
}

/**
 * Event for link strength updates
 */
export class LinkStrengthUpdated {
  constructor(
    public readonly data: {
      linkId: string;
      previousStrength: number;
      newStrength: number;
      calculation: LinkStrengthCalculation;
      updatedAt: Date;
    }
  ) {}

  public getEventName(): string {
    return 'LinkStrengthUpdated';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      updatedAt: this.data.updatedAt.toISOString()
    };
  }
}

/**
 * UC-015: Calculate Link Strength Use Case
 * 
 * Coordinates the calculation and update of cross-feature link strength by:
 * - Loading the target link
 * - Gathering analytics data from external services
 * - Delegating calculation to domain service
 * - Persisting the updated link
 * - Publishing domain events
 * 
 * Clean Architecture compliance:
 * - Use case orchestrates but doesn't contain business logic
 * - Analytics gathering is separated from calculation logic
 * - Domain service contains strength calculation business rules
 * - Uses dependency injection for all external concerns
 * - Returns Result pattern for consistent error handling
 */
export class CalculateLinkStrengthUseCase {
  constructor(
    private readonly repository: ICrossFeatureLinkRepository,
    private readonly analyticsService: ILinkAnalyticsService,
    private readonly eventPublisher: IDomainEventPublisher,
    private readonly linkingService: CrossFeatureLinkingService
  ) {}

  /**
   * Execute the use case to calculate and update link strength
   * 
   * @param command - The calculation command with analysis parameters
   * @returns Result containing the calculation details or failure reason
   */
  public async execute(command: CalculateLinkStrengthCommand): Promise<Result<LinkStrengthCalculation>> {
    try {
      // Input validation
      if (!command.linkId || command.linkId.trim() === '') {
        return Result.fail<LinkStrengthCalculation>('Link ID is required and cannot be empty');
      }
      
      if (command.timeWindowHours && command.timeWindowHours <= 0) {
        return Result.fail<LinkStrengthCalculation>('Time window must be positive');
      }
      // Step 1: Load the link
      const linkIdResult = NodeId.create(command.linkId);
      if (linkIdResult.isFailure) {
        return Result.fail<LinkStrengthCalculation>(`Invalid link ID: ${linkIdResult.error}`);
      }

      const linkId = linkIdResult.value;
      const linkResult = await this.repository.findById(linkId);
      if (linkResult.isFailure) {
        return Result.fail<LinkStrengthCalculation>(linkResult.error);
      }

      const link = linkResult.value;
      if (!link) {
        return Result.fail<LinkStrengthCalculation>('Cross-feature link not found');
      }

      // Step 2: Gather analytics data
      const previousStrength = link.linkStrength;

      // Always gather interaction frequency
      const interactionFrequency = await this.analyticsService.getInteractionFrequency(
        link.sourceId,
        link.targetId,
        command.timeWindowHours
      );

      // Conditionally gather semantic analysis
      let semanticSimilarity = 0;
      if (command.includeSemanticAnalysis !== false) { // Default to true if not specified
        semanticSimilarity = await this.analyticsService.getSemanticSimilarity(
          link.sourceFeature,
          link.targetFeature,
          link.sourceId,
          link.targetId
        );
      }

      // Conditionally gather context analysis
      let contextRelevance = 0;
      if (command.includeContextAnalysis !== false && link.hasNodeContext()) { // Default to true if not specified and has context
        contextRelevance = await this.analyticsService.getContextRelevance(
          command.linkId,
          link.nodeContext!
        );
      }

      // Step 3: Delegate calculation to domain service
      const calculationResult = await Promise.resolve(this.linkingService.calculateLinkStrength(
        linkId,
        interactionFrequency,
        semanticSimilarity,
        contextRelevance
      ));

      if (!calculationResult || calculationResult.isFailure) {
        return Result.fail<LinkStrengthCalculation>(calculationResult?.error || 'Domain service calculation failed');
      }

      const calculation = calculationResult.value;

      // Step 4: Update the link entity with new strength
      const strengthUpdateResult = link.updateLinkStrength(calculation.finalStrength);
      if (strengthUpdateResult.isFailure) {
        return Result.fail<LinkStrengthCalculation>(strengthUpdateResult.error);
      }

      // Step 5: Update the persisted link
      const updateResult = await this.repository.update(link);
      if (updateResult.isFailure) {
        return Result.fail<LinkStrengthCalculation>(updateResult.error);
      }

      // Step 6: Publish domain event
      try {
        const event = {
          eventId: `link-strength-updated-${command.linkId}`,
          eventType: 'LinkStrengthUpdated',
          aggregateId: command.linkId,
          aggregateType: 'CrossFeatureLink',
          aggregateVersion: 1,
          occurredOn: new Date(),
          data: {
            linkId: command.linkId,
            previousStrength,
            newStrength: calculation.finalStrength,
            calculation,
            updatedAt: new Date()
          }
        };

        const publishResult = await this.eventPublisher.publish(event);
        if (publishResult.isFailure) {
          console.warn('Failed to publish LinkStrengthUpdated event:', publishResult.error);
        }
      } catch (eventError) {
        // Event publishing failure doesn't break domain consistency
        console.warn('Failed to publish LinkStrengthUpdated event:', eventError);
      }

      return Result.ok<LinkStrengthCalculation>(calculation);
    } catch (error) {
      return Result.fail<LinkStrengthCalculation>(`Failed to calculate link strength: ${error}`);
    }
  }
}