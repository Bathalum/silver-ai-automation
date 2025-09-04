import { DetectRelationshipCyclesCommand } from '../commands/link-commands';
import { CrossFeatureLink } from '../../domain/entities/cross-feature-link';
import { CrossFeatureLinkingService, RelationshipCycle } from '../../domain/services/cross-feature-linking-service';
import { FeatureType, LinkType } from '../../domain/enums';
import { Result } from '../../domain/shared/result';

/**
 * Repository interface for cross-feature links
 * Following dependency inversion principle - inner layer defines interface
 */
export interface ICrossFeatureLinkRepository {
  findAll(): Promise<Result<CrossFeatureLink[]>>;
  findByFeature(featureType: FeatureType): Promise<Result<CrossFeatureLink[]>>;
  findByLinkType(linkType: LinkType): Promise<Result<CrossFeatureLink[]>>;
}

/**
 * Domain event publisher interface
 * Following dependency inversion principle - inner layer defines interface
 */
export interface IDomainEventPublisher {
  publish(event: any): Promise<Result<void>>;
}

/**
 * Result structure for cycle detection analysis
 */
export interface CycleDetectionResult {
  cycles: RelationshipCycle[];
  totalCycles: number;
  cyclesByType: Record<string, number>;
  strongestCycleStrength: number;
  averageCycleLength: number;
  criticalCycles: RelationshipCycle[];
  warnings: string[];
}

/**
 * Event for cycle detection results
 */
export class CyclesDetected {
  constructor(
    public readonly data: {
      totalCycles: number;
      criticalCycles: number;
      detectedAt: Date;
      analysis: CycleDetectionResult;
    }
  ) {}

  public getEventName(): string {
    return 'CyclesDetected';
  }

  public getEventData(): Record<string, any> {
    return {
      ...this.data,
      detectedAt: this.data.detectedAt.toISOString()
    };
  }
}

/**
 * UC-016: Detect Relationship Cycles Use Case
 * 
 * Coordinates the detection and analysis of relationship cycles by:
 * - Loading relevant links based on command filters
 * - Delegating cycle detection to domain service
 * - Analyzing and categorizing detected cycles
 * - Generating warnings for problematic patterns
 * - Publishing analysis results as domain events
 * 
 * Clean Architecture compliance:
 * - Use case orchestrates but doesn't contain business logic
 * - Domain service contains cycle detection algorithm
 * - Analytics and filtering logic kept in use case (application concern)
 * - Uses dependency injection for repository and event publisher
 * - Returns Result pattern for consistent error handling
 */
export class DetectRelationshipCyclesUseCase {
  constructor(
    private readonly repository: ICrossFeatureLinkRepository,
    private readonly eventPublisher: IDomainEventPublisher,
    private readonly linkingService: CrossFeatureLinkingService
  ) {}

  /**
   * Execute the use case to detect and analyze relationship cycles
   * 
   * @param command - The detection command with filtering parameters
   * @returns Result containing the cycle analysis or failure reason
   */
  public async execute(command: DetectRelationshipCyclesCommand): Promise<Result<CycleDetectionResult>> {
    try {
      // Input validation
      if (command.maxCycleLength && command.maxCycleLength <= 0) {
        return Result.fail<CycleDetectionResult>('Max cycle length must be positive');
      }
      
      if (command.criticalLengthThreshold && command.criticalLengthThreshold < 0) {
        return Result.fail<CycleDetectionResult>('Critical length threshold cannot be negative');
      }
      // Step 1: Load relevant links based on command filters
      const linksResult = await this.loadRelevantLinks(command);
      if (linksResult.isFailure) {
        return Result.fail<CycleDetectionResult>(linksResult.error);
      }

      const links = linksResult.value;

      // Step 2: Delegate cycle detection to domain service
      const cyclesResult = await Promise.resolve(this.linkingService.detectRelationshipCycles());
      if (!cyclesResult || cyclesResult.isFailure) {
        return Result.fail<CycleDetectionResult>(cyclesResult?.error || 'Domain service cycle detection failed');
      }

      let detectedCycles = cyclesResult.value;

      // Step 3: Apply command filters to detected cycles
      detectedCycles = this.applyFilters(detectedCycles, command);

      // Step 4: Analyze cycles and build result
      const analysisResult = this.analyzeCycles(detectedCycles, command);

      // Step 5: Publish domain event if cycles were detected
      if (analysisResult.totalCycles > 0) {
        try {
          const event = {
            eventId: `cycles-detected-${Date.now()}`,
            eventType: 'CyclesDetected',
            aggregateId: 'cross-feature-network',
            aggregateType: 'CrossFeatureNetwork',
            aggregateVersion: 1,
            occurredOn: new Date(),
            data: {
              totalCycles: analysisResult.totalCycles,
              criticalCycles: analysisResult.criticalCycles.length,
              detectedAt: new Date(),
              analysis: analysisResult
            }
          };

          const publishResult = await this.eventPublisher.publish(event);
          if (publishResult.isFailure) {
            console.warn('Failed to publish CyclesDetected event:', publishResult.error);
          }
        } catch (eventError) {
          // Event publishing failure doesn't break domain consistency
          console.warn('Failed to publish CyclesDetected event:', eventError);
        }
      }

      return Result.ok<CycleDetectionResult>(analysisResult);
    } catch (error) {
      return Result.fail<CycleDetectionResult>(`Failed to detect relationship cycles: ${error}`);
    }
  }

  private async loadRelevantLinks(command: DetectRelationshipCyclesCommand): Promise<Result<CrossFeatureLink[]>> {
    if (command.includeAllFeatures) {
      return await this.repository.findAll();
    } else if (command.targetFeature) {
      return await this.repository.findByFeature(command.targetFeature);
    } else {
      return await this.repository.findAll();
    }
  }

  private applyFilters(cycles: RelationshipCycle[], command: DetectRelationshipCyclesCommand): RelationshipCycle[] {
    let filteredCycles = cycles;

    // Apply maximum cycle length filter
    if (command.maxCycleLength) {
      filteredCycles = filteredCycles.filter(cycle => cycle.cycleLength <= command.maxCycleLength!);
    }

    // Apply critical cycles only filter
    if (command.includeCriticalCyclesOnly) {
      const threshold = command.criticalLengthThreshold || 3;
      const criticalCycles = filteredCycles.filter(cycle => cycle.cycleLength >= threshold);
      
      // Return all cycles for total count, but only critical ones in cycles array
      return filteredCycles; // We'll handle the critical filtering in the analysis
    }

    return filteredCycles;
  }

  private analyzeCycles(cycles: RelationshipCycle[], command: DetectRelationshipCyclesCommand): CycleDetectionResult {
    const totalCycles = cycles.length;
    
    if (totalCycles === 0) {
      return {
        cycles: [],
        totalCycles: 0,
        cyclesByType: {},
        strongestCycleStrength: 0,
        averageCycleLength: 0,
        criticalCycles: [],
        warnings: []
      };
    }

    // Calculate cycle metrics
    const averageCycleLength = cycles.reduce((sum, cycle) => sum + cycle.cycleLength, 0) / totalCycles;
    
    // Group cycles by link type patterns
    const cyclesByType: Record<string, number> = {};
    cycles.forEach(cycle => {
      const typeSignature = cycle.linkTypes.map(type => type.toUpperCase()).join('-');
      cyclesByType[typeSignature] = (cyclesByType[typeSignature] || 0) + 1;
    });

    // Identify critical cycles
    const criticalThreshold = command.criticalLengthThreshold || 3;
    const criticalCycles = cycles.filter(cycle => cycle.cycleLength >= criticalThreshold);

    // Generate warnings for problematic patterns
    const warnings = this.generateWarnings(cycles);

    // Mock strongest cycle strength (would be calculated from actual link strengths)
    const strongestCycleStrength = this.calculateStrongestCycleStrength(cycles);

    // Apply final filtering for returned cycles
    let returnedCycles = cycles;
    if (command.includeCriticalCyclesOnly) {
      returnedCycles = criticalCycles;
    }

    return {
      cycles: returnedCycles,
      totalCycles,
      cyclesByType,
      strongestCycleStrength,
      averageCycleLength,
      criticalCycles,
      warnings
    };
  }

  private generateWarnings(cycles: RelationshipCycle[]): string[] {
    const warnings: string[] = [];
    
    // Check for trigger-based cycles that may cause execution loops
    const triggerCycles = cycles.filter(cycle => 
      cycle.linkTypes.includes(LinkType.TRIGGERS)
    );

    if (triggerCycles.length > 0) {
      warnings.push('Cycle detected with TRIGGERS link type may cause execution loops');
    }

    // Check for complex cycles that may affect performance
    const complexCycles = cycles.filter(cycle => cycle.cycleLength > 4);
    if (complexCycles.length > 0) {
      warnings.push(`Found ${complexCycles.length} complex cycles (length > 4) that may impact system performance`);
    }

    return warnings;
  }

  private calculateStrongestCycleStrength(cycles: RelationshipCycle[]): number {
    // Mock implementation - in real system would calculate from actual link strengths
    // For now, return a reasonable mock value based on cycle detection patterns
    if (cycles.length === 0) return 0;
    
    // Simulate different strengths based on cycle characteristics
    const hasSimpleCycles = cycles.some(cycle => cycle.cycleLength === 2);
    const hasComplexCycles = cycles.some(cycle => cycle.cycleLength >= 3);
    
    if (hasComplexCycles) return 0.85;
    if (hasSimpleCycles) return 0.7;
    return 0.6;
  }
}