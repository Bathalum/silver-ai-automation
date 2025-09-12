/**
 * @jest-environment node
 */

/**
 * Cross-Feature Workflows Integration Tests - Real Database Implementation
 * 
 * CONVERTED FROM MOCKS TO REAL SUPABASE DATABASE
 * 
 * These tests define the complete integration workflows for Cross-Feature use cases
 * using REAL Supabase database operations with NO MOCKS.
 * 
 * Test Coverage:
 * - Cross-Feature Link Creation with Domain Validation
 * - Link Strength Calculation with Analytics Integration
 * - Relationship Cycle Detection with Graph Algorithms
 * - Complete Cross-Feature Integration Workflows
 * - Error Scenarios and Recovery Patterns
 * - Clean Architecture Compliance and Boundary Validation
 * - Performance Testing for Large Graph Operations
 * 
 * Architecture Focus:
 * - Tests act as Boundary Filters enforcing Clean Architecture
 * - Domain logic validation through repository integration
 * - Proper dependency inversion testing
 * - Event-driven architecture verification
 * - Repository interfaces and domain service integration
 * 
 * NO MOCKS - Uses real Supabase database with proper cleanup
 */

import { createClient } from '@supabase/supabase-js';

// Cross-Feature Use Cases
import { CreateCrossFeatureLinkUseCase } from '../../../lib/use-cases/cross-feature/create-cross-feature-link-use-case';
import { CalculateLinkStrengthUseCase } from '../../../lib/use-cases/cross-feature/calculate-link-strength-use-case';
import { DetectRelationshipCyclesUseCase } from '../../../lib/use-cases/cross-feature/detect-relationship-cycles-use-case';

// Command Types
import { CreateCrossFeatureLinkCommand, CalculateLinkStrengthCommand, DetectRelationshipCyclesCommand } from '../../../lib/use-cases/commands/link-commands';

// Domain Types
import { CrossFeatureLink } from '../../../lib/domain/entities/cross-feature-link';
import { CrossFeatureLinkingService, LinkStrengthCalculation, RelationshipCycle } from '../../../lib/domain/services/cross-feature-linking-service';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { FeatureType, LinkType } from '../../../lib/domain/enums';
import { Result } from '../../../lib/domain/shared/result';

// Real Infrastructure Implementations - NO MOCKS
import { SupabaseCrossFeatureLinkRepository } from '../../../lib/infrastructure/repositories/supabase-cross-feature-link-repository';
import { LinkAnalyticsService } from '../../../lib/infrastructure/services/link-analytics-service';
import { SupabaseEventBus } from '../../../lib/infrastructure/events/supabase-event-bus';

/**
 * Integration Test Context for Real Database Operations
 */
interface IntegrationTestContext {
  supabase: any;
  linkRepository: SupabaseCrossFeatureLinkRepository;
  analyticsService: LinkAnalyticsService;
  eventBus: SupabaseEventBus;
  linkingService: CrossFeatureLinkingService;
  testPrefix: string;
  testUserId: string;
  createdLinkIds: string[];
  cleanup: () => Promise<void>;
}

/**
 * Create integration test context with real Supabase client
 */
async function createIntegrationTestContext(): Promise<IntegrationTestContext> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const testPrefix = `test-cross-feature-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const testUserId = `${testPrefix}-user`;
  const createdLinkIds: string[] = [];

  // Initialize real implementations
  const linkRepository = new SupabaseCrossFeatureLinkRepository(supabase);
  const analyticsService = new LinkAnalyticsService(supabase);
  const eventBus = new SupabaseEventBus(supabase);
  const linkingService = new CrossFeatureLinkingService();

  const cleanup = async () => {
    // Clean up all test data
    console.log(`Cleaning up ${createdLinkIds.length} test links...`);
    
    for (const linkId of createdLinkIds) {
      try {
        const nodeIdResult = NodeId.create(linkId);
        if (nodeIdResult.isSuccess) {
          const deleteResult = await linkRepository.delete(linkId);
          if (deleteResult.isFailure) {
            console.warn(`Failed to delete link ${linkId}:`, deleteResult.error);
          }
        }
      } catch (error) {
        console.warn(`Failed to cleanup link ${linkId}:`, error);
      }
    }
    
    // Additional cleanup by prefix
    try {
      await linkRepository.deleteByPrefix(testPrefix);
    } catch (error) {
      console.warn('Failed to cleanup by prefix:', error);
    }
  };

  return {
    supabase,
    linkRepository,
    analyticsService,
    eventBus,
    linkingService,
    testPrefix,
    testUserId,
    createdLinkIds,
    cleanup
  };
}

describe('Cross-Feature Workflows - Real Database Integration Tests', () => {
  let context: IntegrationTestContext;
  let createLinkUseCase: CreateCrossFeatureLinkUseCase;
  let calculateStrengthUseCase: CalculateLinkStrengthUseCase;
  let detectCyclesUseCase: DetectRelationshipCyclesUseCase;

  beforeAll(async () => {
    context = await createIntegrationTestContext();
    
    // Initialize use cases with real implementations
    createLinkUseCase = new CreateCrossFeatureLinkUseCase(
      context.linkRepository,
      context.eventBus,
      context.linkingService
    );
    
    calculateStrengthUseCase = new CalculateLinkStrengthUseCase(
      context.linkRepository,
      context.analyticsService,
      context.eventBus,
      context.linkingService
    );
    
    detectCyclesUseCase = new DetectRelationshipCyclesUseCase(
      context.linkRepository,
      context.eventBus,
      context.linkingService
    );
  }, 30000);

  afterAll(async () => {
    if (context) {
      await context.cleanup();
    }
  }, 30000);

  describe('Real Database Operations: Cross-Feature Link Creation', () => {
    it('should create cross-feature links with comprehensive domain validation and real database persistence', async () => {
      const createCommand: CreateCrossFeatureLinkCommand = {
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.KNOWLEDGE_BASE,
        sourceId: `${context.testPrefix}-function-model-data-processor`,
        targetId: `${context.testPrefix}-knowledge-base-customer-analytics`,
        linkType: LinkType.REFERENCES,
        initialStrength: 0.75,
        nodeContext: {
          nodeId: 'workflow-node-001',
          nodeType: 'ProcessingStep',
          metadata: {
            connectionType: 'data-flow',
            priority: 'high',
            automated: true
          },
          relationships: {
            upstream: ['data-ingestion-node'],
            downstream: ['reporting-node']
          }
        },
        createdBy: context.testUserId
      };

      // Execute link creation
      const creationResult = await createLinkUseCase.execute(createCommand);
      
      if (creationResult.isFailure) {
        console.error('Link creation failed:', creationResult.error);
        console.error('Full result:', JSON.stringify(creationResult, null, 2));
      }
      expect(creationResult.isSuccess).toBe(true);
      expect(creationResult.value).toBeDefined();
      
      const createdLink = creationResult.value!;
      expect(createdLink.sourceFeature).toBe(FeatureType.FUNCTION_MODEL);
      expect(createdLink.targetFeature).toBe(FeatureType.KNOWLEDGE_BASE);
      expect(createdLink.sourceId).toBe(`${context.testPrefix}-function-model-data-processor`);
      expect(createdLink.targetId).toBe(`${context.testPrefix}-knowledge-base-customer-analytics`);
      expect(createdLink.linkType).toBe(LinkType.REFERENCES);
      expect(createdLink.linkStrength).toBe(0.75);
      expect(createdLink.nodeContext).toBeDefined();
      expect(createdLink.nodeContext!.nodeId).toBe('workflow-node-001');

      // Verify link was persisted to real database
      const persistedLinkResult = await context.linkRepository.findById(createdLink.linkId.value);
      expect(persistedLinkResult.isSuccess).toBe(true);
      expect(persistedLinkResult.value).toBeDefined();
      
      const persistedLink = persistedLinkResult.value!;
      expect(persistedLink.sourceId).toBe(`${context.testPrefix}-function-model-data-processor`);
      expect(persistedLink.linkStrength).toBe(0.75);
      expect(persistedLink.hasNodeContext()).toBe(true);
      expect(persistedLink.isReferenceLink()).toBe(true);
      expect(persistedLink.isCrossFeature()).toBe(true);

      context.createdLinkIds.push(createdLink.linkId.value);
    }, 15000);

    it('should prevent duplicate link creation with real database constraint validation', async () => {
      const duplicateCommand: CreateCrossFeatureLinkCommand = {
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.SPINDLE,
        sourceId: `${context.testPrefix}-workflow-orchestrator`,
        targetId: `${context.testPrefix}-task-scheduler`,
        linkType: LinkType.IMPLEMENTS,
        initialStrength: 0.6,
        createdBy: context.testUserId
      };

      // First creation should succeed
      const firstResult = await createLinkUseCase.execute(duplicateCommand);
      expect(firstResult.isSuccess).toBe(true);
      context.createdLinkIds.push(firstResult.value!.linkId.value);

      // Duplicate creation should fail due to database constraint
      const duplicateResult = await createLinkUseCase.execute(duplicateCommand);
      expect(duplicateResult.isFailure).toBe(true);
      expect(duplicateResult.error).toContain('already exists');
    }, 10000);
  });

  describe('Real Database Operations: Link Strength Calculation with Analytics', () => {
    let testLinkId: string;

    beforeAll(async () => {
      // Setup a test link for strength calculation
      const setupCommand: CreateCrossFeatureLinkCommand = {
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.SPINDLE,
        sourceId: `${context.testPrefix}-data-analytics-model`,
        targetId: `${context.testPrefix}-processing-pipeline`,
        linkType: LinkType.IMPLEMENTS,
        initialStrength: 0.4,
        nodeContext: {
          nodeId: 'analytics-step',
          nodeType: 'DataProcessingStep',
          metadata: { priority: 'high' }
        },
        createdBy: context.testUserId
      };

      const linkResult = await createLinkUseCase.execute(setupCommand);
      expect(linkResult.isSuccess).toBe(true);
      testLinkId = linkResult.value!.linkId.value;
      context.createdLinkIds.push(testLinkId);
    }, 10000);

    it('should calculate link strength with real analytics integration and database persistence', async () => {
      const strengthCommand: CalculateLinkStrengthCommand = {
        linkId: testLinkId,
        timeWindowHours: 24,
        includeSemanticAnalysis: true,
        includeContextAnalysis: true
      };

      const calculationResult = await calculateStrengthUseCase.execute(strengthCommand);
      
      expect(calculationResult.isSuccess).toBe(true);
      expect(calculationResult.value).toBeDefined();
      
      const calculation = calculationResult.value!;
      expect(calculation.baseStrength).toBe(0.4);
      expect(calculation.frequencyBonus).toBeGreaterThanOrEqual(0);
      expect(calculation.semanticBonus).toBeGreaterThanOrEqual(0);
      expect(calculation.contextBonus).toBeGreaterThanOrEqual(0);
      expect(calculation.finalStrength).toBeGreaterThanOrEqual(0.4);
      expect(calculation.finalStrength).toBeLessThanOrEqual(1.0);

      // Verify link was updated in real database
      const updatedLinkResult = await context.linkRepository.findById(testLinkId);
      expect(updatedLinkResult.isSuccess).toBe(true);
      expect(updatedLinkResult.value!.linkStrength).toBe(calculation.finalStrength);
    }, 10000);

    it('should handle non-existent links with appropriate error responses', async () => {
      const nonExistentCommand: CalculateLinkStrengthCommand = {
        linkId: 'non-existent-link-id',
        timeWindowHours: 24
      };

      const result = await calculateStrengthUseCase.execute(nonExistentCommand);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('not found');
    }, 5000);
  });

  describe('Real Database Operations: Relationship Cycle Detection', () => {
    beforeAll(async () => {
      // Setup a complex network of links for cycle detection testing
      const linkCommands: CreateCrossFeatureLinkCommand[] = [
        // Create a potential cycle: FM -> Spindle -> EventStorm -> FM
        {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.SPINDLE,
          sourceId: `${context.testPrefix}-workflow-manager`,
          targetId: `${context.testPrefix}-task-executor`,
          linkType: LinkType.TRIGGERS,
          initialStrength: 0.7,
          createdBy: context.testUserId
        },
        {
          sourceFeature: FeatureType.SPINDLE,
          targetFeature: FeatureType.EVENT_STORM,
          sourceId: `${context.testPrefix}-task-executor`,
          targetId: `${context.testPrefix}-event-processor`,
          linkType: LinkType.PRODUCES,
          initialStrength: 0.8,
          createdBy: context.testUserId
        },
        {
          sourceFeature: FeatureType.EVENT_STORM,
          targetFeature: FeatureType.FUNCTION_MODEL,
          sourceId: `${context.testPrefix}-event-processor`,
          targetId: `${context.testPrefix}-workflow-manager`,
          linkType: LinkType.TRIGGERS,
          initialStrength: 0.6,
          createdBy: context.testUserId
        },
        // Create a simple 2-node cycle: KB -> FM -> KB
        {
          sourceFeature: FeatureType.KNOWLEDGE_BASE,
          targetFeature: FeatureType.FUNCTION_MODEL,
          sourceId: `${context.testPrefix}-knowledge-store`,
          targetId: `${context.testPrefix}-data-processor`,
          linkType: LinkType.SUPPORTS,
          initialStrength: 0.9,
          createdBy: context.testUserId
        },
        {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: `${context.testPrefix}-data-processor`,
          targetId: `${context.testPrefix}-knowledge-store`,
          linkType: LinkType.DOCUMENTS,
          initialStrength: 0.5,
          createdBy: context.testUserId
        }
      ];

      for (const command of linkCommands) {
        const result = await createLinkUseCase.execute(command);
        if (result.isSuccess) {
          context.createdLinkIds.push(result.value!.linkId.value);
        }
      }
    }, 15000);

    it('should detect complex relationship cycles with real database graph analysis', async () => {
      const detectionCommand: DetectRelationshipCyclesCommand = {
        includeAllFeatures: true,
        includeCriticalCyclesOnly: false,
        maxCycleLength: 10,
        criticalLengthThreshold: 3
      };

      const detectionResult = await detectCyclesUseCase.execute(detectionCommand);
      
      expect(detectionResult.isSuccess).toBe(true);
      expect(detectionResult.value).toBeDefined();
      
      const analysis = detectionResult.value!;
      expect(analysis.totalCycles).toBeGreaterThan(0);
      expect(analysis.cycles).toBeDefined();
      expect(analysis.cycles.length).toBeGreaterThan(0);
      expect(analysis.cyclesByType).toBeDefined();
      expect(analysis.averageCycleLength).toBeGreaterThan(0);
      expect(analysis.strongestCycleStrength).toBeGreaterThan(0);
      expect(analysis.criticalCycles).toBeDefined();
      expect(analysis.warnings).toBeDefined();

      // Verify cycle details
      const detectedCycle = analysis.cycles[0];
      expect(detectedCycle.cycleLength).toBeGreaterThanOrEqual(2);
      expect(detectedCycle.linkTypes).toBeDefined();
      expect(detectedCycle.linkTypes.length).toBe(detectedCycle.cycleLength);
    }, 15000);

    it('should handle empty link networks gracefully without errors', async () => {
      // Clear all existing links temporarily
      const beforeCleanup = [...context.createdLinkIds];
      for (const linkId of context.createdLinkIds) {
        await context.linkRepository.delete(linkId);
      }
      context.createdLinkIds = [];

      const emptyNetworkCommand: DetectRelationshipCyclesCommand = {
        includeAllFeatures: true
      };

      const result = await detectCyclesUseCase.execute(emptyNetworkCommand);
      expect(result.isSuccess).toBe(true);
      
      const analysis = result.value!;
      expect(analysis.totalCycles).toBe(0);
      expect(analysis.cycles).toEqual([]);
      expect(analysis.averageCycleLength).toBe(0);
      expect(analysis.strongestCycleStrength).toBe(0);

      // Restore the deleted links for cleanup
      context.createdLinkIds = beforeCleanup;
    }, 10000);
  });

  describe('Real Database Operations: Complete End-to-End Workflows', () => {
    it('should support complete workflow: create links -> calculate strengths -> detect cycles', async () => {
      // Phase 1: Create a comprehensive network of cross-feature links
      const networkLinks = [
        {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: `${context.testPrefix}-ml-workflow-001`,
          targetId: `${context.testPrefix}-training-data-kb`,
          linkType: LinkType.REFERENCES,
          strength: 0.3,
          context: { usage: 'training-data', frequency: 'high' }
        },
        {
          sourceFeature: FeatureType.KNOWLEDGE_BASE,
          targetFeature: FeatureType.SPINDLE,
          sourceId: `${context.testPrefix}-training-data-kb`,
          targetId: `${context.testPrefix}-data-pipeline`,
          linkType: LinkType.SUPPORTS,
          strength: 0.6,
          context: { purpose: 'data-flow', criticality: 'high' }
        },
        {
          sourceFeature: FeatureType.SPINDLE,
          targetFeature: FeatureType.EVENT_STORM,
          sourceId: `${context.testPrefix}-data-pipeline`,
          targetId: `${context.testPrefix}-ml-events`,
          linkType: LinkType.PRODUCES,
          strength: 0.8,
          context: { eventTypes: ['model-ready', 'training-complete'] }
        },
        {
          sourceFeature: FeatureType.EVENT_STORM,
          targetFeature: FeatureType.FUNCTION_MODEL,
          sourceId: `${context.testPrefix}-ml-events`,
          targetId: `${context.testPrefix}-ml-workflow-001`,
          linkType: LinkType.TRIGGERS,
          strength: 0.7,
          context: { triggerConditions: ['model-accuracy > 0.95'] }
        }
      ];

      const createdLinkIds: string[] = [];

      // Create all links
      for (const linkSpec of networkLinks) {
        const createCommand: CreateCrossFeatureLinkCommand = {
          sourceFeature: linkSpec.sourceFeature,
          targetFeature: linkSpec.targetFeature,
          sourceId: linkSpec.sourceId,
          targetId: linkSpec.targetId,
          linkType: linkSpec.linkType,
          initialStrength: linkSpec.strength,
          nodeContext: linkSpec.context,
          createdBy: context.testUserId
        };

        const createResult = await createLinkUseCase.execute(createCommand);
        expect(createResult.isSuccess).toBe(true);
        
        const createdLink = createResult.value!;
        createdLinkIds.push(createdLink.linkId.value);
        context.createdLinkIds.push(createdLink.linkId.value);

        expect(createdLink.sourceFeature).toBe(linkSpec.sourceFeature);
        expect(createdLink.linkStrength).toBe(linkSpec.strength);
        expect(createdLink.hasNodeContext()).toBe(true);
      }

      // Phase 2: Calculate link strengths using real analytics
      const strengthCalculations: LinkStrengthCalculation[] = [];
      
      for (const linkId of createdLinkIds) {
        const strengthCommand: CalculateLinkStrengthCommand = {
          linkId,
          timeWindowHours: 48,
          includeSemanticAnalysis: true,
          includeContextAnalysis: true
        };

        const strengthResult = await calculateStrengthUseCase.execute(strengthCommand);
        expect(strengthResult.isSuccess).toBe(true);
        
        strengthCalculations.push(strengthResult.value!);
      }

      // Verify strength calculations
      expect(strengthCalculations.length).toBe(createdLinkIds.length);
      for (const calc of strengthCalculations) {
        expect(calc.finalStrength).toBeGreaterThanOrEqual(calc.baseStrength);
      }

      // Phase 3: Detect cycles in the network
      const cycleCommand: DetectRelationshipCyclesCommand = {
        includeAllFeatures: true,
        includeCriticalCyclesOnly: false,
        maxCycleLength: 10,
        criticalLengthThreshold: 3
      };

      const cycleResult = await detectCyclesUseCase.execute(cycleCommand);
      expect(cycleResult.isSuccess).toBe(true);
      
      const cycleAnalysis = cycleResult.value!;
      
      // We should detect the cycle we created: FM -> KB -> Spindle -> EventStorm -> FM
      expect(cycleAnalysis.totalCycles).toBeGreaterThanOrEqual(1);
      expect(cycleAnalysis.cycles.length).toBeGreaterThan(0);

      // Verify complete workflow integrity
      expect(createdLinkIds.length).toBe(4);
      expect(strengthCalculations.length).toBe(4);
      expect(cycleAnalysis.totalCycles).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Real Database Operations: Error Scenarios and Recovery', () => {
    it('should handle invalid input parameters comprehensively', async () => {
      // Invalid create commands
      const invalidCreateCommands: CreateCrossFeatureLinkCommand[] = [
        // Empty source ID
        {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: '',
          targetId: 'valid-target',
          linkType: LinkType.REFERENCES,
          initialStrength: 0.5,
          createdBy: context.testUserId
        },
        // Invalid strength value
        {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: 'valid-source',
          targetId: 'valid-target',
          linkType: LinkType.REFERENCES,
          initialStrength: 1.5, // > 1.0
          createdBy: context.testUserId
        },
        // Self-linking
        {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.FUNCTION_MODEL,
          sourceId: 'same-entity',
          targetId: 'same-entity',
          linkType: LinkType.REFERENCES,
          initialStrength: 0.5,
          createdBy: context.testUserId
        }
      ];

      for (const invalidCommand of invalidCreateCommands) {
        const result = await createLinkUseCase.execute(invalidCommand);
        expect(result.isFailure).toBe(true);
        expect(result.error).toBeTruthy();
      }
    }, 5000);
  });

  describe('Real Database Operations: Performance and Scalability', () => {
    it('should handle moderate-scale link networks efficiently', async () => {
      const startTime = Date.now();
      
      // Create 25 links across different feature combinations
      const performanceLinks = [];
      const features = [FeatureType.FUNCTION_MODEL, FeatureType.KNOWLEDGE_BASE, FeatureType.SPINDLE, FeatureType.EVENT_STORM];
      
      for (let i = 0; i < 25; i++) {
        const sourceFeature = features[i % features.length];
        let targetFeature = features[(i + 1) % features.length];
        
        performanceLinks.push({
          sourceFeature,
          targetFeature,
          sourceId: `${context.testPrefix}-perf-source-${i}`,
          targetId: `${context.testPrefix}-perf-target-${i}`,
          linkType: LinkType.REFERENCES,
          initialStrength: 0.3 + (Math.random() * 0.4)
        });
      }

      // Batch create links and measure performance
      const createdLinks: string[] = [];
      for (const spec of performanceLinks) {
        const command: CreateCrossFeatureLinkCommand = {
          sourceFeature: spec.sourceFeature,
          targetFeature: spec.targetFeature,
          sourceId: spec.sourceId,
          targetId: spec.targetId,
          linkType: spec.linkType,
          initialStrength: spec.initialStrength,
          createdBy: context.testUserId
        };

        const result = await createLinkUseCase.execute(command);
        if (result.isSuccess) {
          createdLinks.push(result.value!.linkId.value);
          context.createdLinkIds.push(result.value!.linkId.value);
        }
      }

      const creationTime = Date.now() - startTime;
      
      // Performance validation for creation (generous limits for CI environment)
      expect(creationTime).toBeLessThan(60000); // Less than 60 seconds for 25 links
      expect(createdLinks.length).toBeGreaterThan(20); // At least 80% success rate

      // Test cycle detection performance on moderate network
      const cycleStartTime = Date.now();
      
      const largeCycleCommand: DetectRelationshipCyclesCommand = {
        includeAllFeatures: true,
        maxCycleLength: 20
      };

      const cycleResult = await detectCyclesUseCase.execute(largeCycleCommand);
      expect(cycleResult.isSuccess).toBe(true);
      
      const cycleDetectionTime = Date.now() - cycleStartTime;
      
      // Performance validation for cycle detection
      expect(cycleDetectionTime).toBeLessThan(30000); // Less than 30 seconds
      
      const analysis = cycleResult.value!;
      expect(analysis.totalCycles).toBeGreaterThanOrEqual(0);

      console.log(`Performance metrics:
        - Link creation: ${creationTime}ms for ${createdLinks.length} links
        - Cycle detection: ${cycleDetectionTime}ms for ${createdLinks.length} links network
        - Cycles found: ${analysis.totalCycles}
        - Average cycle length: ${analysis.averageCycleLength}`);
    }, 120000);
  });
});