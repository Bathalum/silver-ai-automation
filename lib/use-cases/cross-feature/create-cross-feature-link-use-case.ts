import { CreateCrossFeatureLinkCommand } from '../commands/link-commands';
import { CrossFeatureLink } from '../../domain/entities/cross-feature-link';
import { CrossFeatureLinkingService } from '../../domain/services/cross-feature-linking-service';
import { CrossFeatureLinkCreated } from '../../domain/events/link-events';
import { Result } from '../../domain/shared/result';
import { FeatureType } from '../../domain/enums';
import { NodeId } from '../../domain/value-objects/node-id';

/**
 * Repository interface for cross-feature links
 * Following dependency inversion principle - inner layer defines interface
 */
export interface ICrossFeatureLinkRepository {
  save(link: CrossFeatureLink): Promise<Result<void>>;
  findBySourceAndTarget(sourceFeature: FeatureType, targetFeature: FeatureType, sourceId: string, targetId: string): Promise<Result<CrossFeatureLink | null>>;
  findById(linkId: NodeId): Promise<Result<CrossFeatureLink | null>>;
}

/**
 * Domain event publisher interface
 * Following dependency inversion principle - inner layer defines interface
 */
export interface IDomainEventPublisher {
  publish(event: any): Promise<Result<void>>;
}

/**
 * UC-014: Create Cross-Feature Link Use Case
 * 
 * Coordinates the creation of cross-feature links by orchestrating:
 * - Domain service validation and link creation
 * - Repository persistence
 * - Domain event publishing
 * 
 * Clean Architecture compliance:
 * - Use case orchestrates but doesn't contain business logic
 * - Depends on domain service for business rules
 * - Uses dependency injection for repository and event publisher
 * - Returns Result pattern for consistent error handling
 */
export class CreateCrossFeatureLinkUseCase {
  constructor(
    private readonly repository: ICrossFeatureLinkRepository,
    private readonly eventPublisher: IDomainEventPublisher,
    private readonly linkingService: CrossFeatureLinkingService
  ) {}

  /**
   * Execute the use case to create a cross-feature link
   * 
   * @param command - The creation command with all necessary parameters
   * @returns Result containing the created link or failure reason
   */
  public async execute(command: CreateCrossFeatureLinkCommand): Promise<Result<CrossFeatureLink>> {
    try {
      
      // Input validation
      if (!command.sourceId || command.sourceId.trim() === '') {
        console.log('Validation failed: Source entity ID cannot be empty');
        return Result.fail<CrossFeatureLink>('Source entity ID cannot be empty');
      }
      
      if (!command.targetId || command.targetId.trim() === '') {
        return Result.fail<CrossFeatureLink>('Target entity ID cannot be empty');
      }
      
      if (command.initialStrength < 0 || command.initialStrength > 1) {
        return Result.fail<CrossFeatureLink>('Link strength must be between 0.0 and 1.0');
      }
      
      if (command.sourceFeature === command.targetFeature && command.sourceId === command.targetId) {
        return Result.fail<CrossFeatureLink>('Self-linking at entity level is prohibited');
      }
      
      if (!command.createdBy || command.createdBy.trim() === '') {
        return Result.fail<CrossFeatureLink>('Created by is required');
      }
      // Step 1: Delegate business logic to domain service
      const linkResult = await Promise.resolve(this.linkingService.createCrossFeatureLink(
        command.sourceFeature,
        command.targetFeature,
        command.sourceId,
        command.targetId,
        command.linkType,
        command.initialStrength,
        command.nodeContext
      ));
      
      if (!linkResult || linkResult.isFailure) {
        return Result.fail<CrossFeatureLink>(linkResult?.error || 'Unknown error creating link');
      }

      const link = linkResult.value;

      // Step 1.5: Check for duplicate links
      const duplicateResult = await this.repository.findBySourceAndTarget(
        command.sourceFeature,
        command.targetFeature,
        command.sourceId,
        command.targetId
      );
      
      if (duplicateResult.isFailure) {
        return Result.fail<CrossFeatureLink>(`Failed to check for duplicates: ${duplicateResult.error}`);
      }
      
      if (duplicateResult.value) {
        return Result.fail<CrossFeatureLink>('Cross-feature link already exists between these entities');
      }

      // Step 2: Persist the link
      const saveResult = await this.repository.save(link);
      if (saveResult.isFailure) {
        return Result.fail<CrossFeatureLink>(saveResult.error);
      }

      // Step 3: Publish domain event (fire and forget - domain consistency maintained)
      try {
        const linkIdValue = link.linkId?.value || 'mock-link-id';
        
        const event = {
          eventId: `link-created-${linkIdValue}`,
          eventType: 'CrossFeatureLinkCreated',
          aggregateId: linkIdValue,
          aggregateType: 'CrossFeatureLink',
          aggregateVersion: 1,
          occurredOn: new Date(),
          data: {
            linkId: linkIdValue,
            sourceFeature: command.sourceFeature,
            targetFeature: command.targetFeature,
            sourceId: command.sourceId,
            targetId: command.targetId,
            linkType: command.linkType,
            linkStrength: command.initialStrength,
            metadata: command.nodeContext || {},
            createdBy: command.createdBy,
            createdAt: new Date()
          }
        };

        const publishResult = await this.eventPublisher.publish(event);
        if (publishResult.isFailure) {
          console.warn('Failed to publish CrossFeatureLinkCreated event:', publishResult.error);
        }
      } catch (eventError) {
        // Event publishing failure doesn't break domain consistency
        // Link has been created and persisted successfully
        console.warn('Failed to publish CrossFeatureLinkCreated event:', eventError);
      }

      return Result.ok<CrossFeatureLink>(link);
    } catch (error) {
      return Result.fail<CrossFeatureLink>(`Failed to create cross-feature link: ${error}`);
    }
  }
}