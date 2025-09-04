import { DetectRelationshipCyclesUseCase } from '../../../lib/use-cases/cross-feature/detect-relationship-cycles-use-case';
import { DetectRelationshipCyclesCommand } from '../../../lib/use-cases/commands/link-commands';
import { CrossFeatureLinkingService, RelationshipCycle } from '../../../lib/domain/services/cross-feature-linking-service';
import { CrossFeatureLink } from '../../../lib/domain/entities/cross-feature-link';
import { FeatureType, LinkType } from '../../../lib/domain/enums';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { Result } from '../../../lib/domain/shared/result';

// Mock interfaces following Clean Architecture
interface ICrossFeatureLinkRepository {
  findAll(): Promise<Result<CrossFeatureLink[]>>;
  findByFeature(featureType: FeatureType): Promise<Result<CrossFeatureLink[]>>;
  findByLinkType(linkType: LinkType): Promise<Result<CrossFeatureLink[]>>;
}

interface IDomainEventPublisher {
  publish(event: any): Promise<Result<void>>;
}

export interface CycleDetectionResult {
  cycles: RelationshipCycle[];
  totalCycles: number;
  cyclesByType: Record<string, number>;
  strongestCycleStrength: number;
  averageCycleLength: number;
  criticalCycles: RelationshipCycle[];
  warnings: string[];
}

describe('UC-016: DetectRelationshipCyclesUseCase', () => {
  let useCase: DetectRelationshipCyclesUseCase;
  let mockRepository: jest.Mocked<ICrossFeatureLinkRepository>;
  let mockEventPublisher: jest.Mocked<IDomainEventPublisher>;
  let mockLinkingService: jest.Mocked<CrossFeatureLinkingService>;

  beforeEach(() => {
    // Mock dependencies following dependency inversion principle
    mockRepository = {
      findAll: jest.fn(),
      findByFeature: jest.fn(),
      findByLinkType: jest.fn()
    };

    mockEventPublisher = {
      publish: jest.fn().mockResolvedValue(Result.ok(undefined))
    };

    mockLinkingService = {
      detectRelationshipCycles: jest.fn()
    } as any;

    useCase = new DetectRelationshipCyclesUseCase(
      mockRepository,
      mockEventPublisher,
      mockLinkingService
    );
  });

  describe('execute_WithCycles_DetectsCyclesSuccessfully', () => {
    it('should detect multiple cycles and categorize them properly', async () => {
      // Arrange
      const command: DetectRelationshipCyclesCommand = {
        includeAllFeatures: true,
        includeCriticalCyclesOnly: false,
        maxCycleLength: 10
      };

      const mockLinks = createMockLinksWithCycles();
      const detectedCycles: RelationshipCycle[] = [
        {
          cycleNodes: ['function-model:model-1', 'knowledge-base:kb-1', 'function-model:model-1'],
          cycleLength: 2,
          linkTypes: [LinkType.DOCUMENTS, LinkType.REFERENCES]
        },
        {
          cycleNodes: ['function-model:model-2', 'spindle:spindle-1', 'event-storm:event-1', 'function-model:model-2'],
          cycleLength: 3,
          linkTypes: [LinkType.TRIGGERS, LinkType.CONSUMES, LinkType.PRODUCES]
        }
      ];

      const expectedResult: CycleDetectionResult = {
        cycles: detectedCycles,
        totalCycles: 2,
        cyclesByType: {
          'DOCUMENTS-REFERENCES': 1,
          'TRIGGERS-CONSUMES-PRODUCES': 1
        },
        strongestCycleStrength: 0.85,
        averageCycleLength: 2.5,
        criticalCycles: [detectedCycles[1]], // Length > 2 is critical
        warnings: ['Cycle detected with TRIGGERS link type may cause execution loops']
      };

      mockRepository.findAll.mockResolvedValue(Result.ok(mockLinks));
      mockLinkingService.detectRelationshipCycles.mockResolvedValue(Result.ok(detectedCycles));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(expectedResult);
      
      // Verify domain service was called
      expect(mockLinkingService.detectRelationshipCycles).toHaveBeenCalled();
      
      // Verify all links were loaded
      expect(mockRepository.findAll).toHaveBeenCalled();
      
      // Verify event was published for detected cycles
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalCycles: 2,
            criticalCycles: 1,
            detectedAt: expect.any(Date)
          })
        })
      );
    });
  });

  describe('execute_NoCycles_ReturnsEmptyResult', () => {
    it('should return empty result when no cycles are detected', async () => {
      // Arrange
      const command: DetectRelationshipCyclesCommand = {
        includeAllFeatures: true
      };

      const mockLinks = createMockLinksWithoutCycles();
      const detectedCycles: RelationshipCycle[] = [];

      const expectedResult: CycleDetectionResult = {
        cycles: [],
        totalCycles: 0,
        cyclesByType: {},
        strongestCycleStrength: 0,
        averageCycleLength: 0,
        criticalCycles: [],
        warnings: []
      };

      mockRepository.findAll.mockResolvedValue(Result.ok(mockLinks));
      mockLinkingService.detectRelationshipCycles.mockResolvedValue(Result.ok(detectedCycles));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(expectedResult);
      expect(mockEventPublisher.publish).not.toHaveBeenCalled(); // No events for no cycles
    });
  });

  describe('execute_SpecificFeature_FiltersByFeature', () => {
    it('should only analyze cycles involving specific feature', async () => {
      // Arrange
      const command: DetectRelationshipCyclesCommand = {
        targetFeature: FeatureType.FUNCTION_MODEL,
        includeAllFeatures: false
      };

      const mockLinks = createMockLinksForFeature(FeatureType.FUNCTION_MODEL);
      const detectedCycles: RelationshipCycle[] = [
        {
          cycleNodes: ['function-model:model-1', 'function-model:model-2', 'function-model:model-1'],
          cycleLength: 2,
          linkTypes: [LinkType.REFERENCES, LinkType.IMPLEMENTS]
        }
      ];

      mockRepository.findByFeature.mockResolvedValue(Result.ok(mockLinks));
      mockLinkingService.detectRelationshipCycles.mockResolvedValue(Result.ok(detectedCycles));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.totalCycles).toBe(1);
      expect(mockRepository.findByFeature).toHaveBeenCalledWith(FeatureType.FUNCTION_MODEL);
      expect(mockRepository.findAll).not.toHaveBeenCalled();
    });
  });

  describe('execute_CriticalCyclesOnly_FiltersResults', () => {
    it('should only return critical cycles when filter is enabled', async () => {
      // Arrange
      const command: DetectRelationshipCyclesCommand = {
        includeAllFeatures: true,
        includeCriticalCyclesOnly: true,
        criticalLengthThreshold: 3
      };

      const mockLinks = createMockLinksWithCycles();
      const allDetectedCycles: RelationshipCycle[] = [
        {
          cycleNodes: ['function-model:model-1', 'knowledge-base:kb-1', 'function-model:model-1'],
          cycleLength: 2,
          linkTypes: [LinkType.DOCUMENTS, LinkType.REFERENCES]
        },
        {
          cycleNodes: ['function-model:model-2', 'spindle:spindle-1', 'event-storm:event-1', 'function-model:model-2'],
          cycleLength: 3,
          linkTypes: [LinkType.TRIGGERS, LinkType.CONSUMES, LinkType.PRODUCES]
        },
        {
          cycleNodes: ['function-model:model-3', 'knowledge-base:kb-2', 'spindle:spindle-2', 'event-storm:event-2', 'function-model:model-3'],
          cycleLength: 4,
          linkTypes: [LinkType.DOCUMENTS, LinkType.SUPPORTS, LinkType.TRIGGERS, LinkType.PRODUCES]
        }
      ];

      mockRepository.findAll.mockResolvedValue(Result.ok(mockLinks));
      mockLinkingService.detectRelationshipCycles.mockResolvedValue(Result.ok(allDetectedCycles));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.totalCycles).toBe(3); // Total found
      expect(result.value.cycles.length).toBe(2); // Only >= 3 length returned (critical ones)
      expect(result.value.criticalCycles.length).toBe(2);
      expect(result.value.cycles.every(cycle => cycle.cycleLength >= 3)).toBe(true);
    });
  });

  describe('execute_MaxCycleLengthLimit_FiltersLongCycles', () => {
    it('should exclude cycles longer than maximum length', async () => {
      // Arrange
      const command: DetectRelationshipCyclesCommand = {
        includeAllFeatures: true,
        maxCycleLength: 3
      };

      const mockLinks = createMockLinksWithCycles();
      const allDetectedCycles: RelationshipCycle[] = [
        {
          cycleNodes: ['function-model:model-1', 'knowledge-base:kb-1', 'function-model:model-1'],
          cycleLength: 2,
          linkTypes: [LinkType.DOCUMENTS, LinkType.REFERENCES]
        },
        {
          cycleNodes: ['function-model:model-2', 'spindle:spindle-1', 'event-storm:event-1', 'function-model:model-2'],
          cycleLength: 3,
          linkTypes: [LinkType.TRIGGERS, LinkType.CONSUMES, LinkType.PRODUCES]
        },
        {
          cycleNodes: ['a', 'b', 'c', 'd', 'e', 'a'],
          cycleLength: 5, // Too long
          linkTypes: [LinkType.DOCUMENTS, LinkType.SUPPORTS, LinkType.TRIGGERS, LinkType.PRODUCES, LinkType.REFERENCES]
        }
      ];

      mockRepository.findAll.mockResolvedValue(Result.ok(mockLinks));
      mockLinkingService.detectRelationshipCycles.mockResolvedValue(Result.ok(allDetectedCycles));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.cycles.length).toBe(2); // Long cycle filtered out
      expect(result.value.cycles.every(cycle => cycle.cycleLength <= 3)).toBe(true);
    });
  });

  describe('execute_TriggerLinkCycles_GeneratesWarnings', () => {
    it('should generate warnings for cycles with trigger link types', async () => {
      // Arrange
      const command: DetectRelationshipCyclesCommand = {
        includeAllFeatures: true
      };

      const mockLinks = createMockLinksWithCycles();
      const detectedCycles: RelationshipCycle[] = [
        {
          cycleNodes: ['function-model:model-1', 'spindle:spindle-1', 'function-model:model-1'],
          cycleLength: 2,
          linkTypes: [LinkType.TRIGGERS, LinkType.CONSUMES]
        },
        {
          cycleNodes: ['event-storm:event-1', 'function-model:model-2', 'event-storm:event-1'],
          cycleLength: 2,
          linkTypes: [LinkType.PRODUCES, LinkType.TRIGGERS]
        }
      ];

      mockRepository.findAll.mockResolvedValue(Result.ok(mockLinks));
      mockLinkingService.detectRelationshipCycles.mockResolvedValue(Result.ok(detectedCycles));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.warnings.length).toBeGreaterThan(0);
      expect(result.value.warnings.some(warning => 
        warning.includes('TRIGGERS') && warning.includes('execution loop')
      )).toBe(true);
    });
  });

  describe('execute_RepositoryFailure_ReturnsFailure', () => {
    it('should fail when repository cannot load links', async () => {
      // Arrange
      const command: DetectRelationshipCyclesCommand = {
        includeAllFeatures: true
      };

      mockRepository.findAll.mockResolvedValue(Result.fail('Database connection error'));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Database connection error');
      expect(mockLinkingService.detectRelationshipCycles).not.toHaveBeenCalled();
    });
  });

  describe('execute_DomainServiceFailure_ReturnsFailure', () => {
    it('should fail when domain service cycle detection fails', async () => {
      // Arrange
      const command: DetectRelationshipCyclesCommand = {
        includeAllFeatures: true
      };

      const mockLinks = createMockLinksWithCycles();
      mockRepository.findAll.mockResolvedValue(Result.ok(mockLinks));
      mockLinkingService.detectRelationshipCycles.mockResolvedValue(
        Result.fail('Cycle detection algorithm failed')
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Cycle detection algorithm failed');
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('execute_EmptyLinkSet_ReturnsNoCycles', () => {
    it('should handle empty link dataset gracefully', async () => {
      // Arrange
      const command: DetectRelationshipCyclesCommand = {
        includeAllFeatures: true
      };

      mockRepository.findAll.mockResolvedValue(Result.ok([]));
      mockLinkingService.detectRelationshipCycles.mockResolvedValue(Result.ok([]));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.totalCycles).toBe(0);
      expect(result.value.cycles.length).toBe(0);
    });
  });

  describe('execute_ComplexCyclePatterns_CalculatesMetricsCorrectly', () => {
    it('should calculate cycle metrics correctly for complex patterns', async () => {
      // Arrange
      const command: DetectRelationshipCyclesCommand = {
        includeAllFeatures: true
      };

      const mockLinks = createMockLinksWithComplexCycles();
      const detectedCycles: RelationshipCycle[] = [
        {
          cycleNodes: ['a', 'b', 'a'],
          cycleLength: 2,
          linkTypes: [LinkType.DOCUMENTS, LinkType.REFERENCES]
        },
        {
          cycleNodes: ['c', 'd', 'e', 'c'],
          cycleLength: 3,
          linkTypes: [LinkType.SUPPORTS, LinkType.IMPLEMENTS, LinkType.TRIGGERS]
        },
        {
          cycleNodes: ['f', 'g', 'h', 'i', 'f'],
          cycleLength: 4,
          linkTypes: [LinkType.PRODUCES, LinkType.CONSUMES, LinkType.TRIGGERS, LinkType.REFERENCES]
        }
      ];

      mockRepository.findAll.mockResolvedValue(Result.ok(mockLinks));
      mockLinkingService.detectRelationshipCycles.mockResolvedValue(Result.ok(detectedCycles));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.totalCycles).toBe(3);
      expect(result.value.averageCycleLength).toBe(3); // (2 + 3 + 4) / 3
      expect(result.value.criticalCycles.length).toBe(2); // Length >= 3
      expect(Object.keys(result.value.cyclesByType).length).toBe(3);
    });
  });

  // Helper functions to create mock data
  function createMockLinksWithCycles(): CrossFeatureLink[] {
    return [
      createMockLink('link-1', FeatureType.FUNCTION_MODEL, FeatureType.KNOWLEDGE_BASE, 'model-1', 'kb-1', LinkType.DOCUMENTS),
      createMockLink('link-2', FeatureType.KNOWLEDGE_BASE, FeatureType.FUNCTION_MODEL, 'kb-1', 'model-1', LinkType.REFERENCES),
      createMockLink('link-3', FeatureType.FUNCTION_MODEL, FeatureType.SPINDLE, 'model-2', 'spindle-1', LinkType.TRIGGERS),
      createMockLink('link-4', FeatureType.SPINDLE, FeatureType.EVENT_STORM, 'spindle-1', 'event-1', LinkType.CONSUMES),
      createMockLink('link-5', FeatureType.EVENT_STORM, FeatureType.FUNCTION_MODEL, 'event-1', 'model-2', LinkType.PRODUCES)
    ];
  }

  function createMockLinksWithoutCycles(): CrossFeatureLink[] {
    return [
      createMockLink('link-1', FeatureType.FUNCTION_MODEL, FeatureType.KNOWLEDGE_BASE, 'model-1', 'kb-1', LinkType.DOCUMENTS),
      createMockLink('link-2', FeatureType.FUNCTION_MODEL, FeatureType.SPINDLE, 'model-2', 'spindle-1', LinkType.IMPLEMENTS),
      createMockLink('link-3', FeatureType.KNOWLEDGE_BASE, FeatureType.EVENT_STORM, 'kb-2', 'event-1', LinkType.REFERENCES)
    ];
  }

  function createMockLinksForFeature(featureType: FeatureType): CrossFeatureLink[] {
    return [
      createMockLink('link-1', featureType, featureType, 'entity-1', 'entity-2', LinkType.REFERENCES),
      createMockLink('link-2', featureType, featureType, 'entity-2', 'entity-1', LinkType.IMPLEMENTS)
    ];
  }

  function createMockLinksWithComplexCycles(): CrossFeatureLink[] {
    return [
      createMockLink('link-1', FeatureType.FUNCTION_MODEL, FeatureType.KNOWLEDGE_BASE, 'a', 'b', LinkType.DOCUMENTS),
      createMockLink('link-2', FeatureType.KNOWLEDGE_BASE, FeatureType.FUNCTION_MODEL, 'b', 'a', LinkType.REFERENCES),
      createMockLink('link-3', FeatureType.SPINDLE, FeatureType.EVENT_STORM, 'c', 'd', LinkType.SUPPORTS),
      createMockLink('link-4', FeatureType.EVENT_STORM, FeatureType.FUNCTION_MODEL, 'd', 'e', LinkType.IMPLEMENTS),
      createMockLink('link-5', FeatureType.FUNCTION_MODEL, FeatureType.SPINDLE, 'e', 'c', LinkType.TRIGGERS)
    ];
  }

  function createMockLink(
    linkId: string,
    sourceFeature: FeatureType,
    targetFeature: FeatureType,
    sourceId: string,
    targetId: string,
    linkType: LinkType,
    strength: number = 0.7
  ): CrossFeatureLink {
    // Convert simple test IDs to valid UUIDs
    const uuidMap: Record<string, string> = {
      'link-1': '00000001-0000-4000-8000-000000000001',
      'link-2': '00000002-0000-4000-8000-000000000002', 
      'link-3': '00000003-0000-4000-8000-000000000003',
      'link-4': '00000004-0000-4000-8000-000000000004',
      'link-5': '00000005-0000-4000-8000-000000000005',
      'a': '0000000a-0000-4000-8000-00000000000a',
      'b': '0000000b-0000-4000-8000-00000000000b',
      'c': '0000000c-0000-4000-8000-00000000000c',
      'd': '0000000d-0000-4000-8000-00000000000d',
      'e': '0000000e-0000-4000-8000-00000000000e',
      'f': '0000000f-0000-4000-8000-00000000000f',
      'g': '00000010-0000-4000-8000-000000000010',
      'h': '00000011-0000-4000-8000-000000000011',
      'i': '00000012-0000-4000-8000-000000000012'
    };
    
    const validUuid = uuidMap[linkId] || linkId;
      
    return {
      linkId: NodeId.create(validUuid).value,
      sourceFeature,
      targetFeature,
      sourceId,
      targetId,
      linkType,
      linkStrength: strength
    } as any;
  }
});

/**
 * Test Plan Summary for UC-016: Detect Relationship Cycles
 * 
 * This test suite validates:
 * 1. Complete cycle detection with proper categorization and metrics
 * 2. Feature-specific cycle analysis when targeting specific features
 * 3. Critical cycle filtering based on length thresholds
 * 4. Maximum cycle length filtering to avoid performance issues
 * 5. Warning generation for problematic cycle patterns (e.g., TRIGGERS)
 * 6. Proper handling of empty datasets and no-cycle scenarios
 * 7. Complex cycle pattern analysis with accurate metric calculations
 * 8. Repository failure handling and domain service error management
 * 9. Event publishing for cycle detection results
 * 10. Architectural boundary compliance between layers
 * 
 * Architecture Compliance:
 * - Use case orchestrates link loading and domain service coordination
 * - Domain service encapsulates cycle detection algorithm
 * - Repository provides data access abstraction
 * - Result pattern ensures consistent error handling
 * - Domain events published for integration with other contexts
 * - Proper separation of cycle detection logic from data management
 * - Clean interfaces between use case and infrastructure concerns
 */