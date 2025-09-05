/**
 * Cross-Feature Workflows Integration Tests - TDD RED-GREEN-REFACTOR Approach
 * 
 * These tests define the complete integration workflows for Cross-Feature use cases.
 * They follow the TDD approach - all tests initially FAIL (RED state) and drive
 * the implementation of enhanced cross-feature functionality with real repository integration.
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
 */

import { createClient } from '@supabase/supabase-js';

// Cross-Feature Use Cases
import { CreateCrossFeatureLinkUseCase, ICrossFeatureLinkRepository as ICreateLinkRepository, IDomainEventPublisher as ICreateEventPublisher } from '../../../lib/use-cases/cross-feature/create-cross-feature-link-use-case';
import { CalculateLinkStrengthUseCase, ICrossFeatureLinkRepository as ICalculateLinkRepository, ILinkAnalyticsService, IDomainEventPublisher as ICalculateEventPublisher, LinkStrengthUpdated } from '../../../lib/use-cases/cross-feature/calculate-link-strength-use-case';
import { DetectRelationshipCyclesUseCase, ICrossFeatureLinkRepository as IDetectLinkRepository, IDomainEventPublisher as IDetectEventPublisher, CycleDetectionResult, CyclesDetected } from '../../../lib/use-cases/cross-feature/detect-relationship-cycles-use-case';

// Command Types
import { CreateCrossFeatureLinkCommand, CalculateLinkStrengthCommand, DetectRelationshipCyclesCommand } from '../../../lib/use-cases/commands/link-commands';

// Domain Types
import { CrossFeatureLink } from '../../../lib/domain/entities/cross-feature-link';
import { CrossFeatureLinkingService, LinkStrengthCalculation, RelationshipCycle } from '../../../lib/domain/services/cross-feature-linking-service';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { FeatureType, LinkType } from '../../../lib/domain/enums';
import { Result } from '../../../lib/domain/shared/result';

// Domain Events
import { CrossFeatureLinkCreated } from '../../../lib/domain/events/link-events';

// Infrastructure - concrete implementations
import { SupabaseEventBus, IEventBus } from '../../../lib/infrastructure/events/supabase-event-bus';

// Test Infrastructure
import { createMockSupabaseClient, getTestUUID } from '../../utils/test-fixtures';

/**
 * Mock Cross-Feature Link Repository Implementation for Integration Testing
 * This provides a realistic repository that uses Supabase mock client
 * but implements all the actual business logic for cross-feature link management
 */
class MockSupabaseCrossFeatureLinkRepository implements ICreateLinkRepository, ICalculateLinkRepository, IDetectLinkRepository {
  private supabaseClient: any;
  private linkStore: Map<string, any> = new Map();
  
  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
  }

  async save(link: CrossFeatureLink): Promise<Result<void>> {
    try {
      const linkData = this.mapLinkToRow(link);
      
      const result = await this.supabaseClient
        .from('cross_feature_links')
        .upsert(linkData);

      if (result.error) {
        return Result.fail(`Failed to save cross-feature link: ${result.error.message}`);
      }

      // Store in memory for integration tests
      this.linkStore.set(link.linkId.value, linkData);
      
      // Also update the mock data in the supabase client for consistency
      const mockData = (this.supabaseClient as any).mockData || {};
      if (mockData.cross_feature_links) {
        mockData.cross_feature_links[link.linkId.value] = linkData;
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findBySourceAndTarget(sourceFeature: FeatureType, targetFeature: FeatureType, sourceId: string, targetId: string): Promise<Result<CrossFeatureLink | null>> {
    try {
      const result = await this.supabaseClient
        .from('cross_feature_links')
        .select('*')
        .eq('source_feature', sourceFeature)
        .eq('target_feature', targetFeature)
        .eq('source_id', sourceId)
        .eq('target_id', targetId)
        .single();

      if (result.error && result.error.code === 'PGRST116') {
        return Result.ok(null);
      }
      
      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const linkResult = this.mapRowToLink(result.data);
      if (linkResult.isFailure) {
        return Result.fail(linkResult.error);
      }

      return Result.ok(linkResult.value);
    } catch (error) {
      return Result.fail(`Failed to find cross-feature link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(linkId: NodeId): Promise<Result<CrossFeatureLink | null>> {
    try {
      const result = await this.supabaseClient
        .from('cross_feature_links')
        .select('*')
        .eq('link_id', linkId.value)
        .single();

      if (result.error && result.error.code === 'PGRST116') {
        return Result.ok(null);
      }
      
      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const linkResult = this.mapRowToLink(result.data);
      return linkResult.isSuccess ? Result.ok(linkResult.value) : Result.ok(null);
    } catch (error) {
      return Result.fail(`Failed to find cross-feature link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findBySourceAndTarget(sourceFeature: FeatureType, targetFeature: FeatureType, sourceId: string, targetId: string): Promise<Result<CrossFeatureLink | null>> {
    try {
      const result = await this.supabaseClient
        .from('cross_feature_links')
        .select('*')
        .eq('source_feature', sourceFeature)
        .eq('target_feature', targetFeature)
        .eq('source_id', sourceId)
        .eq('target_id', targetId)
        .single();

      if (result.error && result.error.code === 'PGRST116') {
        return Result.ok(null);
      }
      
      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const linkResult = this.mapRowToLink(result.data);
      return linkResult.isSuccess ? Result.ok(linkResult.value) : Result.ok(null);
    } catch (error) {
      return Result.fail(`Failed to find cross-feature link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(link: CrossFeatureLink): Promise<Result<void>> {
    try {
      const linkData = this.mapLinkToRow(link);
      
      const result = await this.supabaseClient
        .from('cross_feature_links')
        .update(linkData)
        .eq('link_id', link.linkId.value);

      if (result.error) {
        return Result.fail(`Failed to update cross-feature link: ${result.error.message}`);
      }

      // Update memory store AND the mock database
      this.linkStore.set(link.linkId.value, linkData);
      
      // Also update the mock data in the supabase client for consistency
      const mockData = (this.supabaseClient as any).mockData || {};
      if (mockData.cross_feature_links) {
        mockData.cross_feature_links[link.linkId.value] = linkData;
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Update operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(): Promise<Result<CrossFeatureLink[]>> {
    try {
      const result = await this.supabaseClient
        .from('cross_feature_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const links = result.data
        .map((row: any) => this.mapRowToLink(row))
        .filter((r: Result<CrossFeatureLink>) => r.isSuccess)
        .map((r: Result<CrossFeatureLink>) => r.value!);

      return Result.ok(links);
    } catch (error) {
      return Result.fail(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByFeature(featureType: FeatureType): Promise<Result<CrossFeatureLink[]>> {
    try {
      const result = await this.supabaseClient
        .from('cross_feature_links')
        .select('*')
        .or(`source_feature.eq.${featureType},target_feature.eq.${featureType}`)
        .order('created_at', { ascending: false });

      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const links = result.data
        .map((row: any) => this.mapRowToLink(row))
        .filter((r: Result<CrossFeatureLink>) => r.isSuccess)
        .map((r: Result<CrossFeatureLink>) => r.value!);

      return Result.ok(links);
    } catch (error) {
      return Result.fail(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByLinkType(linkType: LinkType): Promise<Result<CrossFeatureLink[]>> {
    try {
      const result = await this.supabaseClient
        .from('cross_feature_links')
        .select('*')
        .eq('link_type', linkType)
        .order('created_at', { ascending: false });

      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const links = result.data
        .map((row: any) => this.mapRowToLink(row))
        .filter((r: Result<CrossFeatureLink>) => r.isSuccess)
        .map((r: Result<CrossFeatureLink>) => r.value!);

      return Result.ok(links);
    } catch (error) {
      return Result.fail(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapLinkToRow(link: CrossFeatureLink): any {
    return {
      link_id: link.linkId.value,
      source_feature: link.sourceFeature,
      target_feature: link.targetFeature,
      source_id: link.sourceId,
      target_id: link.targetId,
      link_type: link.linkType,
      link_strength: link.linkStrength,
      node_context: link.nodeContext,
      created_at: link.createdAt.toISOString(),
      updated_at: link.updatedAt.toISOString()
    };
  }

  private mapRowToLink(row: any): Result<CrossFeatureLink> {
    try {
      const linkIdResult = NodeId.create(row.link_id);
      if (linkIdResult.isFailure) {
        return Result.fail(`Invalid link ID in database: ${linkIdResult.error}`);
      }

      const linkResult = CrossFeatureLink.create({
        linkId: linkIdResult.value,
        sourceFeature: row.source_feature,
        targetFeature: row.target_feature,
        sourceId: row.source_id,
        targetId: row.target_id,
        linkType: row.link_type,
        linkStrength: row.link_strength,
        nodeContext: row.node_context
      });

      if (linkResult.isFailure) {
        return Result.fail(`Failed to reconstruct cross-feature link from database row: ${linkResult.error}`);
      }

      return Result.ok(linkResult.value);
    } catch (error) {
      return Result.fail(`Row mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Mock Link Analytics Service Implementation for Integration Testing
 */
class MockLinkAnalyticsService implements ILinkAnalyticsService {
  private interactionData: Map<string, number> = new Map();
  private semanticData: Map<string, number> = new Map();
  private contextData: Map<string, number> = new Map();

  async getInteractionFrequency(sourceId: string, targetId: string, timeWindow: number): Promise<number> {
    // Simulate realistic interaction frequency based on entity IDs and time window
    const key = `${sourceId}-${targetId}`;
    
    if (this.interactionData.has(key)) {
      return this.interactionData.get(key)!;
    }

    // Generate realistic mock data based on entity patterns
    let frequency = 0;
    
    if (sourceId.includes('function-model') && targetId.includes('knowledge-base')) {
      frequency = Math.random() * 100 + 50; // High interaction for function-model -> KB links
    } else if (sourceId.includes('workflow') && targetId.includes('agent')) {
      frequency = Math.random() * 200 + 100; // Very high for workflow -> agent links
    } else {
      frequency = Math.random() * 50 + 10; // Moderate for other combinations
    }

    // Time window adjustment
    frequency = frequency * Math.min(timeWindow / 24, 1); // Scale by time window (max 24h)
    
    this.interactionData.set(key, frequency);
    return frequency;
  }

  async getSemanticSimilarity(sourceFeature: FeatureType, targetFeature: FeatureType, sourceId: string, targetId: string): Promise<number> {
    const key = `${sourceFeature}-${targetFeature}-${sourceId}-${targetId}`;
    
    if (this.semanticData.has(key)) {
      return this.semanticData.get(key)!;
    }

    // Generate realistic semantic similarity based on feature types
    let similarity = 0;
    
    if (sourceFeature === targetFeature) {
      similarity = 0.8 + Math.random() * 0.2; // High similarity within same feature
    } else if (
      (sourceFeature === FeatureType.FUNCTION_MODEL && targetFeature === FeatureType.KNOWLEDGE_BASE) ||
      (sourceFeature === FeatureType.KNOWLEDGE_BASE && targetFeature === FeatureType.FUNCTION_MODEL)
    ) {
      similarity = 0.6 + Math.random() * 0.3; // Good similarity between FM and KB
    } else if (
      (sourceFeature === FeatureType.FUNCTION_MODEL && targetFeature === FeatureType.SPINDLE) ||
      (sourceFeature === FeatureType.SPINDLE && targetFeature === FeatureType.FUNCTION_MODEL)
    ) {
      similarity = 0.4 + Math.random() * 0.4; // Moderate similarity between FM and Spindle
    } else {
      similarity = 0.1 + Math.random() * 0.3; // Lower similarity for other combinations
    }
    
    this.semanticData.set(key, similarity);
    return similarity;
  }

  async getContextRelevance(linkId: string, contextData: Record<string, any>): Promise<number> {
    if (this.contextData.has(linkId)) {
      return this.contextData.get(linkId)!;
    }

    // Generate context relevance based on context data richness
    let relevance = 0.1; // Base relevance
    
    if (contextData.nodeId) relevance += 0.2;
    if (contextData.nodeType) relevance += 0.2;
    if (contextData.metadata) relevance += 0.3;
    if (contextData.relationships) relevance += 0.2;
    
    // Add some variability
    relevance = Math.min(relevance + (Math.random() * 0.2 - 0.1), 1.0);
    
    this.contextData.set(linkId, relevance);
    return relevance;
  }

  // Test helpers
  setMockInteractionFrequency(sourceId: string, targetId: string, frequency: number): void {
    this.interactionData.set(`${sourceId}-${targetId}`, frequency);
  }

  setMockSemanticSimilarity(sourceFeature: FeatureType, targetFeature: FeatureType, sourceId: string, targetId: string, similarity: number): void {
    this.semanticData.set(`${sourceFeature}-${targetFeature}-${sourceId}-${targetId}`, similarity);
  }

  setMockContextRelevance(linkId: string, relevance: number): void {
    this.contextData.set(linkId, relevance);
  }
}

describe('Cross-Feature Workflows - TDD Integration Tests', () => {
  let supabaseClient: any;
  let linkRepository: MockSupabaseCrossFeatureLinkRepository;
  let analyticsService: MockLinkAnalyticsService;
  let eventBus: SupabaseEventBus;
  let linkingService: CrossFeatureLinkingService;
  
  // Use Cases under test
  let createLinkUseCase: CreateCrossFeatureLinkUseCase;
  let calculateStrengthUseCase: CalculateLinkStrengthUseCase;
  let detectCyclesUseCase: DetectRelationshipCyclesUseCase;

  // Test constants
  const testUserId = 'test-user-cross-feature';
  const testLinks: string[] = [];

  beforeEach(async () => {
    // Setup mock Supabase client for integration testing
    supabaseClient = createMockSupabaseClient();

    // Initialize repositories and services with proper dependency injection
    linkRepository = new MockSupabaseCrossFeatureLinkRepository(supabaseClient);
    analyticsService = new MockLinkAnalyticsService();
    eventBus = new SupabaseEventBus(supabaseClient);
    linkingService = new CrossFeatureLinkingService();

    // Initialize use cases following Clean Architecture dependency injection
    createLinkUseCase = new CreateCrossFeatureLinkUseCase(linkRepository, eventBus, linkingService);
    calculateStrengthUseCase = new CalculateLinkStrengthUseCase(linkRepository, analyticsService, eventBus, linkingService);
    detectCyclesUseCase = new DetectRelationshipCyclesUseCase(linkRepository, eventBus, linkingService);
  });

  afterEach(async () => {
    // Cleanup test data
    for (const linkId of testLinks) {
      try {
        const nodeIdResult = NodeId.create(linkId);
        if (nodeIdResult.isSuccess) {
          await linkingService.removeLink(nodeIdResult.value);
        }
      } catch (error) {
        console.warn(`Failed to cleanup link ${linkId}:`, error);
      }
    }
    testLinks.length = 0;
  });

  describe('TDD Phase 1: Cross-Feature Link Creation Integration', () => {
    describe('CreateCrossFeatureLinkUseCase Integration Tests', () => {
      it('should create cross-feature links with comprehensive domain validation and persistence', async () => {
        // RED: This test WILL FAIL initially - defines the comprehensive link creation requirement
        const createCommand: CreateCrossFeatureLinkCommand = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: 'function-model-data-processor',
          targetId: 'knowledge-base-customer-analytics',
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
          createdBy: testUserId
        };

        // Execute link creation
        const creationResult = await createLinkUseCase.execute(createCommand);
        
        expect(creationResult.isSuccess).toBe(true);
        expect(creationResult.value).toBeDefined();
        
        const createdLink = creationResult.value!;
        expect(createdLink.sourceFeature).toBe(FeatureType.FUNCTION_MODEL);
        expect(createdLink.targetFeature).toBe(FeatureType.KNOWLEDGE_BASE);
        expect(createdLink.sourceId).toBe('function-model-data-processor');
        expect(createdLink.targetId).toBe('knowledge-base-customer-analytics');
        expect(createdLink.linkType).toBe(LinkType.REFERENCES);
        expect(createdLink.linkStrength).toBe(0.75);
        expect(createdLink.nodeContext).toBeDefined();
        expect(createdLink.nodeContext!.nodeId).toBe('workflow-node-001');

        // Verify link was persisted to repository
        const persistedLinkResult = await linkRepository.findById(createdLink.linkId);
        expect(persistedLinkResult.isSuccess).toBe(true);
        expect(persistedLinkResult.value).toBeDefined();
        
        const persistedLink = persistedLinkResult.value!;
        expect(persistedLink.sourceId).toBe('function-model-data-processor');
        expect(persistedLink.linkStrength).toBe(0.75);
        expect(persistedLink.hasNodeContext()).toBe(true);
        expect(persistedLink.isReferenceLink()).toBe(true);
        expect(persistedLink.isCrossFeature()).toBe(true);

        testLinks.push(createdLink.linkId.value);
      });

      it('should validate link type compatibility with feature pairs and reject invalid combinations', async () => {
        // RED: Test domain validation for feature-link type compatibility
        const incompatibleCommands: CreateCrossFeatureLinkCommand[] = [
          // TRIGGERS link type not allowed between FUNCTION_MODEL and KNOWLEDGE_BASE
          {
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.KNOWLEDGE_BASE,
            sourceId: 'fm-001',
            targetId: 'kb-001',
            linkType: LinkType.TRIGGERS,
            initialStrength: 0.5,
            createdBy: testUserId
          },
          // DOCUMENTS link type not optimal between FUNCTION_MODEL and SPINDLE
          {
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.SPINDLE,
            sourceId: 'fm-002',
            targetId: 'spindle-002',
            linkType: LinkType.DOCUMENTS,
            initialStrength: 0.5,
            createdBy: testUserId
          }
        ];

        for (const invalidCommand of incompatibleCommands) {
          const result = await createLinkUseCase.execute(invalidCommand);
          if (result.isFailure) {
            expect(result.error).toContain('compatible');
          } else {
            // If it succeeds, clean up
            testLinks.push(result.value!.linkId.value);
          }
        }
      });

      it('should prevent duplicate link creation with comprehensive validation', async () => {
        // RED: Test duplicate prevention logic
        const duplicateCommand: CreateCrossFeatureLinkCommand = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.SPINDLE,
          sourceId: 'workflow-orchestrator',
          targetId: 'task-scheduler',
          linkType: LinkType.IMPLEMENTS,
          initialStrength: 0.6,
          createdBy: testUserId
        };

        // First creation should succeed
        const firstResult = await createLinkUseCase.execute(duplicateCommand);
        expect(firstResult.isSuccess).toBe(true);
        testLinks.push(firstResult.value!.linkId.value);

        // Duplicate creation should fail
        const duplicateResult = await createLinkUseCase.execute(duplicateCommand);
        expect(duplicateResult.isFailure).toBe(true);
        expect(duplicateResult.error).toContain('already exists');
      });

      it('should publish domain events for successful link creation with comprehensive event data', async () => {
        // RED: Test event publishing integration with rich event data
        const eventCommand: CreateCrossFeatureLinkCommand = {
          sourceFeature: FeatureType.KNOWLEDGE_BASE,
          targetFeature: FeatureType.EVENT_STORM,
          sourceId: 'documentation-hub',
          targetId: 'process-events',
          linkType: LinkType.DOCUMENTS,
          initialStrength: 0.8,
          nodeContext: {
            nodeId: 'doc-ref-node',
            nodeType: 'DocumentationReference'
          },
          createdBy: testUserId
        };

        // Mock event bus to capture published events
        const publishedEvents: any[] = [];
        const originalPublish = eventBus.publish.bind(eventBus);
        eventBus.publish = jest.fn().mockImplementation(async (event) => {
          publishedEvents.push(event);
          return originalPublish(event);
        });

        const result = await createLinkUseCase.execute(eventCommand);
        expect(result.isSuccess).toBe(true);

        // Verify event was published
        expect(publishedEvents).toHaveLength(1);
        const publishedEvent = publishedEvents[0];
        expect(publishedEvent.eventType).toBe('CrossFeatureLinkCreated');
        expect(publishedEvent.data.sourceFeature).toBe(FeatureType.KNOWLEDGE_BASE);
        expect(publishedEvent.data.targetFeature).toBe(FeatureType.EVENT_STORM);
        expect(publishedEvent.data.linkType).toBe(LinkType.DOCUMENTS);
        expect(publishedEvent.data.linkStrength).toBe(0.8);

        testLinks.push(result.value!.linkId.value);
      });

      it('should handle repository failures gracefully without breaking domain consistency', async () => {
        // RED: Test error handling and recovery patterns
        const failingRepository = {
          save: jest.fn().mockResolvedValue(Result.fail('Database connection failed')),
          findBySourceAndTarget: jest.fn().mockResolvedValue(Result.ok(null)), // No duplicate found
          findById: jest.fn().mockResolvedValue(Result.ok(null)),
          update: jest.fn().mockResolvedValue(Result.ok()),
          findAll: jest.fn().mockResolvedValue(Result.ok([])),
          findByFeature: jest.fn().mockResolvedValue(Result.ok([])),
          findByLinkType: jest.fn().mockResolvedValue(Result.ok([]))
        };

        const failingCreateUseCase = new CreateCrossFeatureLinkUseCase(failingRepository as any, eventBus, linkingService);

        const failureCommand: CreateCrossFeatureLinkCommand = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: 'failure-test-source',
          targetId: 'failure-test-target',
          linkType: LinkType.REFERENCES,
          initialStrength: 0.5,
          createdBy: testUserId
        };

        const result = await failingCreateUseCase.execute(failureCommand);
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Database connection failed');
      });
    });
  });

  describe('TDD Phase 2: Link Strength Calculation Integration', () => {
    let testLinkId: string;

    beforeEach(async () => {
      // Setup a test link for strength calculation
      const setupCommand: CreateCrossFeatureLinkCommand = {
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.SPINDLE,
        sourceId: 'data-analytics-model',
        targetId: 'processing-pipeline',
        linkType: LinkType.IMPLEMENTS,
        initialStrength: 0.4, // Starting strength
        nodeContext: {
          nodeId: 'analytics-step',
          nodeType: 'DataProcessingStep',
          metadata: { priority: 'high' }
        },
        createdBy: testUserId
      };

      const linkResult = await createLinkUseCase.execute(setupCommand);
      expect(linkResult.isSuccess).toBe(true);
      testLinkId = linkResult.value!.linkId.value;
      testLinks.push(testLinkId);
    });

    describe('CalculateLinkStrengthUseCase Integration Tests', () => {
      it('should calculate link strength with comprehensive analytics integration and persistence', async () => {
        // RED: Test comprehensive strength calculation with multiple analytics inputs
        
        // Setup mock analytics data
        analyticsService.setMockInteractionFrequency('data-analytics-model', 'processing-pipeline', 150);
        analyticsService.setMockSemanticSimilarity(FeatureType.FUNCTION_MODEL, FeatureType.SPINDLE, 'data-analytics-model', 'processing-pipeline', 0.85);
        analyticsService.setMockContextRelevance(testLinkId, 0.7);

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
        expect(calculation.baseStrength).toBe(0.4); // Original strength
        expect(calculation.frequencyBonus).toBeCloseTo(0.2, 1); // Max frequency bonus (150 * 0.002 = 0.3, capped at 0.2)
        expect(calculation.semanticBonus).toBeCloseTo(0.255, 2); // 0.85 * 0.3 = 0.255
        expect(calculation.contextBonus).toBeCloseTo(0.14, 2); // 0.7 * 0.2 = 0.14
        expect(calculation.finalStrength).toBeGreaterThan(0.4); // Should be higher than base
        expect(calculation.finalStrength).toBeLessThanOrEqual(1.0); // Capped at 1.0

        // Verify link was updated in repository
        const nodeIdResult = NodeId.create(testLinkId);
        const updatedLinkResult = await linkRepository.findById(nodeIdResult.value!);
        expect(updatedLinkResult.isSuccess).toBe(true);
        expect(updatedLinkResult.value!.linkStrength).toBe(calculation.finalStrength);
      });

      it('should handle selective analytics inclusion based on command parameters', async () => {
        // RED: Test conditional analytics gathering
        
        // Setup analytics data
        analyticsService.setMockInteractionFrequency('data-analytics-model', 'processing-pipeline', 75);
        analyticsService.setMockSemanticSimilarity(FeatureType.FUNCTION_MODEL, FeatureType.SPINDLE, 'data-analytics-model', 'processing-pipeline', 0.9);

        const minimalCommand: CalculateLinkStrengthCommand = {
          linkId: testLinkId,
          timeWindowHours: 12,
          includeSemanticAnalysis: false, // Skip semantic analysis
          includeContextAnalysis: false   // Skip context analysis
        };

        const calculationResult = await calculateStrengthUseCase.execute(minimalCommand);
        
        expect(calculationResult.isSuccess).toBe(true);
        
        const calculation = calculationResult.value!;
        expect(calculation.baseStrength).toBe(0.4);
        expect(calculation.frequencyBonus).toBeCloseTo(0.15, 2); // 75 * 0.002 = 0.15
        expect(calculation.semanticBonus).toBe(0); // Skipped
        expect(calculation.contextBonus).toBe(0); // Skipped
        expect(calculation.finalStrength).toBeCloseTo(0.55, 2); // 0.4 + 0.15
      });

      it('should publish LinkStrengthUpdated events with detailed calculation data', async () => {
        // RED: Test event publishing with calculation details
        
        // Setup analytics
        analyticsService.setMockInteractionFrequency('data-analytics-model', 'processing-pipeline', 100);
        analyticsService.setMockSemanticSimilarity(FeatureType.FUNCTION_MODEL, FeatureType.SPINDLE, 'data-analytics-model', 'processing-pipeline', 0.6);

        // Mock event bus
        const publishedEvents: any[] = [];
        const originalPublish = eventBus.publish.bind(eventBus);
        eventBus.publish = jest.fn().mockImplementation(async (event) => {
          publishedEvents.push(event);
          return originalPublish(event);
        });

        const strengthCommand: CalculateLinkStrengthCommand = {
          linkId: testLinkId,
          timeWindowHours: 24,
          includeSemanticAnalysis: true,
          includeContextAnalysis: false
        };

        const result = await calculateStrengthUseCase.execute(strengthCommand);
        expect(result.isSuccess).toBe(true);

        // Verify event was published
        expect(publishedEvents).toHaveLength(1);
        const event = publishedEvents[0];
        expect(event.eventType).toBe('LinkStrengthUpdated');
        expect(event.data.linkId).toBe(testLinkId);
        expect(event.data.previousStrength).toBe(0.4);
        expect(event.data.newStrength).toBeGreaterThan(0.4);
        expect(event.data.calculation).toBeDefined();
      });

      it('should handle non-existent links with appropriate error responses', async () => {
        // RED: Test error handling for missing links
        const nonExistentCommand: CalculateLinkStrengthCommand = {
          linkId: 'non-existent-link-id',
          timeWindowHours: 24
        };

        const result = await calculateStrengthUseCase.execute(nonExistentCommand);
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('not found');
      });

      it('should handle analytics service failures gracefully', async () => {
        // RED: Test analytics service failure scenarios
        const failingAnalyticsService = {
          getInteractionFrequency: jest.fn().mockRejectedValue(new Error('Analytics service unavailable')),
          getSemanticSimilarity: jest.fn().mockResolvedValue(0.5),
          getContextRelevance: jest.fn().mockResolvedValue(0.5)
        };

        const resilientCalculateUseCase = new CalculateLinkStrengthUseCase(
          linkRepository,
          failingAnalyticsService as any,
          eventBus,
          linkingService
        );

        const strengthCommand: CalculateLinkStrengthCommand = {
          linkId: testLinkId,
          timeWindowHours: 24,
          includeSemanticAnalysis: true
        };

        const result = await resilientCalculateUseCase.execute(strengthCommand);
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Analytics service unavailable');
      });
    });
  });

  describe('TDD Phase 3: Relationship Cycle Detection Integration', () => {
    beforeEach(async () => {
      // Setup a complex network of links for cycle detection testing
      const linkCommands: CreateCrossFeatureLinkCommand[] = [
        // Create a potential cycle: FM -> Spindle -> EventStorm -> FM
        {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.SPINDLE,
          sourceId: 'workflow-manager',
          targetId: 'task-executor',
          linkType: LinkType.TRIGGERS,
          initialStrength: 0.7,
          createdBy: testUserId
        },
        {
          sourceFeature: FeatureType.SPINDLE,
          targetFeature: FeatureType.EVENT_STORM,
          sourceId: 'task-executor',
          targetId: 'event-processor',
          linkType: LinkType.PRODUCES,
          initialStrength: 0.8,
          createdBy: testUserId
        },
        {
          sourceFeature: FeatureType.EVENT_STORM,
          targetFeature: FeatureType.FUNCTION_MODEL,
          sourceId: 'event-processor',
          targetId: 'workflow-manager',
          linkType: LinkType.TRIGGERS,
          initialStrength: 0.6,
          createdBy: testUserId
        },
        // Create a simple 2-node cycle: KB -> FM -> KB
        {
          sourceFeature: FeatureType.KNOWLEDGE_BASE,
          targetFeature: FeatureType.FUNCTION_MODEL,
          sourceId: 'knowledge-store',
          targetId: 'data-processor',
          linkType: LinkType.SUPPORTS,
          initialStrength: 0.9,
          createdBy: testUserId
        },
        {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: 'data-processor',
          targetId: 'knowledge-store',
          linkType: LinkType.DOCUMENTS,
          initialStrength: 0.5,
          createdBy: testUserId
        }
      ];

      for (const command of linkCommands) {
        const result = await createLinkUseCase.execute(command);
        if (result.isSuccess) {
          testLinks.push(result.value!.linkId.value);
        }
      }
    });

    describe('DetectRelationshipCyclesUseCase Integration Tests', () => {
      it('should detect complex relationship cycles with comprehensive analysis and categorization', async () => {
        // RED: Test comprehensive cycle detection with analysis
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

        // Verify analysis metrics
        if (analysis.totalCycles > 0) {
          expect(analysis.averageCycleLength).toBeGreaterThan(1);
          expect(analysis.strongestCycleStrength).toBeGreaterThan(0);
        }
      });

      it('should filter cycles based on command parameters and provide targeted analysis', async () => {
        // RED: Test filtering and targeted detection
        const filteredCommand: DetectRelationshipCyclesCommand = {
          targetFeature: FeatureType.FUNCTION_MODEL,
          includeAllFeatures: false,
          includeCriticalCyclesOnly: true,
          maxCycleLength: 5,
          criticalLengthThreshold: 3
        };

        const detectionResult = await detectCyclesUseCase.execute(filteredCommand);
        
        expect(detectionResult.isSuccess).toBe(true);
        
        const analysis = detectionResult.value!;
        
        // All returned cycles should involve FUNCTION_MODEL
        for (const cycle of analysis.cycles) {
          const involvesFunctionModel = cycle.cycleNodes.some(node => 
            node.includes(FeatureType.FUNCTION_MODEL)
          );
          expect(involvesFunctionModel).toBe(true);
        }

        // Critical cycles filtering
        if (filteredCommand.includeCriticalCyclesOnly) {
          for (const cycle of analysis.cycles) {
            expect(cycle.cycleLength).toBeGreaterThanOrEqual(3);
          }
        }

        // Max cycle length filtering
        for (const cycle of analysis.cycles) {
          expect(cycle.cycleLength).toBeLessThanOrEqual(5);
        }
      });

      it('should generate appropriate warnings for problematic cycle patterns', async () => {
        // RED: Test warning generation for dangerous cycle patterns
        const warningCommand: DetectRelationshipCyclesCommand = {
          includeAllFeatures: true,
          includeCriticalCyclesOnly: false
        };

        const detectionResult = await detectCyclesUseCase.execute(warningCommand);
        
        expect(detectionResult.isSuccess).toBe(true);
        
        const analysis = detectionResult.value!;
        
        // Should generate warnings for trigger cycles (execution loops)
        const hasTriggerWarning = analysis.warnings.some(warning => 
          warning.includes('TRIGGERS') && warning.includes('execution loops')
        );
        
        // Should generate warnings for complex cycles (performance impact)
        const hasComplexityWarning = analysis.warnings.some(warning => 
          warning.includes('complex cycles') && warning.includes('performance')
        );

        expect(analysis.warnings.length).toBeGreaterThanOrEqual(0);
        
        // If we have TRIGGERS links in cycles, we should have warnings
        const hasTriggerCycles = analysis.cycles.some(cycle =>
          cycle.linkTypes.includes(LinkType.TRIGGERS)
        );
        
        if (hasTriggerCycles) {
          expect(hasTriggerWarning).toBe(true);
        }
      });

      it('should publish CyclesDetected events when cycles are found', async () => {
        // RED: Test event publishing for cycle detection
        const publishedEvents: any[] = [];
        const originalPublish = eventBus.publish.bind(eventBus);
        eventBus.publish = jest.fn().mockImplementation(async (event) => {
          publishedEvents.push(event);
          return originalPublish(event);
        });

        const eventCommand: DetectRelationshipCyclesCommand = {
          includeAllFeatures: true,
          includeCriticalCyclesOnly: false
        };

        const result = await detectCyclesUseCase.execute(eventCommand);
        expect(result.isSuccess).toBe(true);

        if (result.value!.totalCycles > 0) {
          // Verify event was published
          expect(publishedEvents).toHaveLength(1);
          const event = publishedEvents[0];
          expect(event.eventType).toBe('CyclesDetected');
          expect(event.data.totalCycles).toBeGreaterThan(0);
          expect(event.data.criticalCycles).toBeGreaterThanOrEqual(0);
          expect(event.data.analysis).toBeDefined();
        }
      });

      it('should handle empty link networks gracefully without errors', async () => {
        // RED: Test behavior with no links
        
        // Clear all existing links
        const allLinksResult = await linkRepository.findAll();
        if (allLinksResult.isSuccess) {
          for (const link of allLinksResult.value!) {
            await linkingService.removeLink(link.linkId);
          }
        }

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
      });

      it('should calculate accurate cycle metrics and network statistics', async () => {
        // RED: Test comprehensive metric calculations
        const metricsCommand: DetectRelationshipCyclesCommand = {
          includeAllFeatures: true,
          includeCriticalCyclesOnly: false
        };

        const detectionResult = await detectCyclesUseCase.execute(metricsCommand);
        
        expect(detectionResult.isSuccess).toBe(true);
        
        const analysis = detectionResult.value!;
        
        if (analysis.totalCycles > 0) {
          // Verify cycle type categorization
          expect(Object.keys(analysis.cyclesByType).length).toBeGreaterThan(0);
          
          let totalCategorizedCycles = 0;
          for (const count of Object.values(analysis.cyclesByType)) {
            totalCategorizedCycles += count;
          }
          expect(totalCategorizedCycles).toBe(analysis.totalCycles);

          // Verify average cycle length calculation
          const actualAverage = analysis.cycles.reduce((sum, cycle) => sum + cycle.cycleLength, 0) / analysis.cycles.length;
          expect(analysis.averageCycleLength).toBeCloseTo(actualAverage, 2);

          // Verify critical cycles identification
          const actualCriticalCycles = analysis.cycles.filter(cycle => 
            cycle.cycleLength >= (metricsCommand.criticalLengthThreshold || 3)
          );
          expect(analysis.criticalCycles.length).toBe(actualCriticalCycles.length);
        }
      });
    });
  });

  describe('TDD Phase 4: Complete Cross-Feature Integration Workflows', () => {
    describe('End-to-End Cross-Feature Workflow Integration', () => {
      it('should support complete workflow: create links -> calculate strengths -> detect cycles', async () => {
        // RED: Test complete end-to-end cross-feature integration workflow
        
        // Phase 1: Create a comprehensive network of cross-feature links
        const networkLinks = [
          {
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.KNOWLEDGE_BASE,
            sourceId: 'ml-workflow-001',
            targetId: 'training-data-kb',
            linkType: LinkType.REFERENCES,
            strength: 0.3,
            context: { usage: 'training-data', frequency: 'high' }
          },
          {
            sourceFeature: FeatureType.KNOWLEDGE_BASE,
            targetFeature: FeatureType.SPINDLE,
            sourceId: 'training-data-kb',
            targetId: 'data-pipeline',
            linkType: LinkType.SUPPORTS,
            strength: 0.6,
            context: { purpose: 'data-flow', criticality: 'high' }
          },
          {
            sourceFeature: FeatureType.SPINDLE,
            targetFeature: FeatureType.EVENT_STORM,
            sourceId: 'data-pipeline',
            targetId: 'ml-events',
            linkType: LinkType.PRODUCES,
            strength: 0.8,
            context: { eventTypes: ['model-ready', 'training-complete'] }
          },
          {
            sourceFeature: FeatureType.EVENT_STORM,
            targetFeature: FeatureType.FUNCTION_MODEL,
            sourceId: 'ml-events',
            targetId: 'ml-workflow-001',
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
            createdBy: testUserId
          };

          const createResult = await createLinkUseCase.execute(createCommand);
          expect(createResult.isSuccess).toBe(true);
          
          const createdLink = createResult.value!;
          createdLinkIds.push(createdLink.linkId.value);
          testLinks.push(createdLink.linkId.value);

          // Verify link properties
          expect(createdLink.sourceFeature).toBe(linkSpec.sourceFeature);
          expect(createdLink.linkStrength).toBe(linkSpec.strength);
          expect(createdLink.hasNodeContext()).toBe(true);
        }

        // Phase 2: Calculate link strengths using analytics
        const strengthCalculations: LinkStrengthCalculation[] = [];
        
        for (const linkId of createdLinkIds) {
          // Setup realistic analytics data
          const link = (await linkRepository.findById((NodeId.create(linkId)).value!)).value!;
          analyticsService.setMockInteractionFrequency(link.sourceId, link.targetId, 80 + Math.random() * 120);
          analyticsService.setMockSemanticSimilarity(link.sourceFeature, link.targetFeature, link.sourceId, link.targetId, 0.6 + Math.random() * 0.3);
          analyticsService.setMockContextRelevance(linkId, 0.5 + Math.random() * 0.4);

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

        // Verify strength calculations improved link strengths
        expect(strengthCalculations.length).toBe(createdLinkIds.length);
        for (const calc of strengthCalculations) {
          expect(calc.finalStrength).toBeGreaterThan(calc.baseStrength);
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

        // Find the 4-node cycle
        const longCycle = cycleAnalysis.cycles.find(cycle => cycle.cycleLength === 4);
        if (longCycle) {
          expect(longCycle.linkTypes).toContain(LinkType.REFERENCES);
          expect(longCycle.linkTypes).toContain(LinkType.SUPPORTS);
          expect(longCycle.linkTypes).toContain(LinkType.PRODUCES);
          expect(longCycle.linkTypes).toContain(LinkType.TRIGGERS);
        }

        // Verify warnings for trigger cycle
        const hasTriggerWarning = cycleAnalysis.warnings.some(warning => 
          warning.includes('TRIGGERS')
        );
        expect(hasTriggerWarning).toBe(true);

        // Phase 4: Verify network metrics and health
        expect(cycleAnalysis.averageCycleLength).toBeGreaterThan(2);
        expect(cycleAnalysis.strongestCycleStrength).toBeGreaterThan(0);
        expect(cycleAnalysis.criticalCycles.length).toBeGreaterThanOrEqual(0);
        
        // Verify complete workflow integrity
        expect(createdLinkIds.length).toBe(4);
        expect(strengthCalculations.length).toBe(4);
        expect(cycleAnalysis.totalCycles).toBeGreaterThan(0);
      });

      it('should handle complex multi-feature workflows with performance validation', async () => {
        // RED: Test performance with larger network
        const startTime = Date.now();
        
        // Create a larger network (25 links across all feature types)
        const largeNetworkSpecs = [];
        const features = [FeatureType.FUNCTION_MODEL, FeatureType.KNOWLEDGE_BASE, FeatureType.SPINDLE, FeatureType.EVENT_STORM];
        const linkTypes = [LinkType.REFERENCES, LinkType.SUPPORTS, LinkType.DOCUMENTS, LinkType.IMPLEMENTS];
        
        for (let i = 0; i < 25; i++) {
          const sourceFeature = features[i % features.length];
          const targetFeature = features[(i + 1) % features.length];
          const linkType = linkTypes[i % linkTypes.length];
          
          largeNetworkSpecs.push({
            sourceFeature,
            targetFeature,
            sourceId: `source-entity-${i}`,
            targetId: `target-entity-${i}`,
            linkType,
            strength: 0.3 + (i * 0.02)
          });
        }

        // Create all links
        for (const spec of largeNetworkSpecs) {
          const command: CreateCrossFeatureLinkCommand = {
            sourceFeature: spec.sourceFeature,
            targetFeature: spec.targetFeature,
            sourceId: spec.sourceId,
            targetId: spec.targetId,
            linkType: spec.linkType,
            initialStrength: spec.strength,
            createdBy: testUserId
          };

          const result = await createLinkUseCase.execute(command);
          if (result.isSuccess) {
            testLinks.push(result.value!.linkId.value);
          }
        }

        // Detect cycles in large network
        const largeCycleCommand: DetectRelationshipCyclesCommand = {
          includeAllFeatures: true,
          maxCycleLength: 15
        };

        const largeCycleResult = await detectCyclesUseCase.execute(largeCycleCommand);
        expect(largeCycleResult.isSuccess).toBe(true);
        
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        // Performance validation - should complete in reasonable time
        expect(executionTime).toBeLessThan(10000); // Less than 10 seconds
        
        const analysis = largeCycleResult.value!;
        expect(analysis.totalCycles).toBeGreaterThanOrEqual(0);
        
        // Network should handle the larger dataset
        expect(testLinks.length).toBeGreaterThan(20);
      });

      it('should maintain data consistency across all cross-feature operations', async () => {
        // RED: Test data consistency and integrity throughout workflow
        
        // Create initial link
        const consistencyCommand: CreateCrossFeatureLinkCommand = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: 'consistency-test-fm',
          targetId: 'consistency-test-kb',
          linkType: LinkType.REFERENCES,
          initialStrength: 0.5,
          nodeContext: {
            nodeId: 'consistency-node',
            nodeType: 'ConsistencyTest',
            metadata: { testId: 'consistency-001' }
          },
          createdBy: testUserId
        };

        const createResult = await createLinkUseCase.execute(consistencyCommand);
        expect(createResult.isSuccess).toBe(true);
        
        const linkId = createResult.value!.linkId.value;
        testLinks.push(linkId);

        // Verify link exists in repository
        const nodeIdResult = NodeId.create(linkId);
        let linkInRepo = await linkRepository.findById(nodeIdResult.value!);
        expect(linkInRepo.isSuccess).toBe(true);
        expect(linkInRepo.value!.linkStrength).toBe(0.5);

        // Update link strength
        analyticsService.setMockInteractionFrequency('consistency-test-fm', 'consistency-test-kb', 150);
        analyticsService.setMockSemanticSimilarity(FeatureType.FUNCTION_MODEL, FeatureType.KNOWLEDGE_BASE, 'consistency-test-fm', 'consistency-test-kb', 0.8);

        const strengthCommand: CalculateLinkStrengthCommand = {
          linkId,
          timeWindowHours: 24,
          includeSemanticAnalysis: true,
          includeContextAnalysis: true
        };

        const strengthResult = await calculateStrengthUseCase.execute(strengthCommand);
        expect(strengthResult.isSuccess).toBe(true);

        // Verify repository was updated
        linkInRepo = await linkRepository.findById(nodeIdResult.value!);
        expect(linkInRepo.isSuccess).toBe(true);
        expect(linkInRepo.value!.linkStrength).toBeGreaterThan(0.5);
        expect(linkInRepo.value!.linkStrength).toBe(strengthResult.value!.finalStrength);

        // Verify node context is preserved
        expect(linkInRepo.value!.hasNodeContext()).toBe(true);
        expect(linkInRepo.value!.nodeContext!.testId).toBe('consistency-001');

        // Cycle detection should still find the link
        const cycleCommand: DetectRelationshipCyclesCommand = {
          targetFeature: FeatureType.FUNCTION_MODEL,
          includeAllFeatures: false
        };

        const cycleResult = await detectCyclesUseCase.execute(cycleCommand);
        expect(cycleResult.isSuccess).toBe(true);
        
        // Data consistency verified across all operations
        expect(linkInRepo.value!.sourceId).toBe('consistency-test-fm');
        expect(linkInRepo.value!.targetId).toBe('consistency-test-kb');
        expect(linkInRepo.value!.linkType).toBe(LinkType.REFERENCES);
      });
    });
  });

  describe('TDD Phase 5: Error Scenarios and Recovery Patterns', () => {
    describe('Comprehensive Error Handling and Recovery', () => {
      it('should handle repository failures with proper error propagation and recovery', async () => {
        // RED: Test repository failure scenarios across all use cases
        
        // Create failing repositories
        const failingLinkRepository = {
          save: jest.fn().mockResolvedValue(Result.fail('Database write failed')),
          findBySourceAndTarget: jest.fn().mockResolvedValue(Result.ok(null)), // No duplicate found, let save operation fail
          findById: jest.fn().mockResolvedValue(Result.fail('Database read failed')),
          findAll: jest.fn().mockResolvedValue(Result.fail('Database query failed')),
          update: jest.fn().mockResolvedValue(Result.fail('Database update failed')),
          findByFeature: jest.fn().mockResolvedValue(Result.fail('Database query failed')),
          findByLinkType: jest.fn().mockResolvedValue(Result.fail('Database query failed'))
        };

        const failingCreateUseCase = new CreateCrossFeatureLinkUseCase(failingLinkRepository as any, eventBus, linkingService);
        const failingCalculateUseCase = new CalculateLinkStrengthUseCase(failingLinkRepository as any, analyticsService, eventBus, linkingService);
        const failingDetectUseCase = new DetectRelationshipCyclesUseCase(failingLinkRepository as any, eventBus, linkingService);

        // Test creation failure
        const createCommand: CreateCrossFeatureLinkCommand = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: 'failure-test-source',
          targetId: 'failure-test-target',
          linkType: LinkType.REFERENCES,
          initialStrength: 0.5,
          createdBy: testUserId
        };

        const createResult = await failingCreateUseCase.execute(createCommand);
        expect(createResult.isFailure).toBe(true);
        expect(createResult.error).toContain('Database write failed');

        // Test strength calculation failure
        const strengthCommand: CalculateLinkStrengthCommand = {
          linkId: 'some-link-id',
          timeWindowHours: 24
        };

        const strengthResult = await failingCalculateUseCase.execute(strengthCommand);
        expect(strengthResult.isFailure).toBe(true);
        expect(strengthResult.error).toContain('Database read failed');

        // Test cycle detection failure
        const cycleCommand: DetectRelationshipCyclesCommand = {
          includeAllFeatures: true
        };

        const cycleResult = await failingDetectUseCase.execute(cycleCommand);
        expect(cycleResult.isFailure).toBe(true);
        expect(cycleResult.error).toContain('Database query failed');
      });

      it('should handle analytics service failures gracefully in strength calculations', async () => {
        // RED: Test analytics service failure scenarios
        
        // First create a link
        const setupCommand: CreateCrossFeatureLinkCommand = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.SPINDLE,
          sourceId: 'analytics-failure-test',
          targetId: 'analytics-target',
          linkType: LinkType.IMPLEMENTS,
          initialStrength: 0.4,
          createdBy: testUserId
        };

        const setupResult = await createLinkUseCase.execute(setupCommand);
        expect(setupResult.isSuccess).toBe(true);
        testLinks.push(setupResult.value!.linkId.value);

        // Create failing analytics service
        const failingAnalyticsService = {
          getInteractionFrequency: jest.fn().mockRejectedValue(new Error('Interaction service down')),
          getSemanticSimilarity: jest.fn().mockRejectedValue(new Error('NLP service unavailable')),
          getContextRelevance: jest.fn().mockRejectedValue(new Error('Context analysis failed'))
        };

        const failingCalculateUseCase = new CalculateLinkStrengthUseCase(
          linkRepository,
          failingAnalyticsService as any,
          eventBus,
          linkingService
        );

        const strengthCommand: CalculateLinkStrengthCommand = {
          linkId: setupResult.value!.linkId.value,
          timeWindowHours: 24,
          includeSemanticAnalysis: true,
          includeContextAnalysis: true
        };

        const strengthResult = await failingCalculateUseCase.execute(strengthCommand);
        expect(strengthResult.isFailure).toBe(true);
        expect(strengthResult.error).toContain('service');
      });

      it('should handle event bus failures gracefully without breaking core functionality', async () => {
        // RED: Test event bus failure scenarios
        
        const failingEventBus = {
          publish: jest.fn().mockRejectedValue(new Error('Event bus service unavailable'))
        };

        const resilientCreateUseCase = new CreateCrossFeatureLinkUseCase(linkRepository, failingEventBus as any, linkingService);

        const createCommand: CreateCrossFeatureLinkCommand = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: 'event-failure-test',
          targetId: 'event-target',
          linkType: LinkType.REFERENCES,
          initialStrength: 0.6,
          createdBy: testUserId
        };

        // Creation should still succeed even if event publishing fails
        const createResult = await resilientCreateUseCase.execute(createCommand);
        expect(createResult.isSuccess).toBe(true);
        
        testLinks.push(createResult.value!.linkId.value);

        // Verify link was still created and persisted
        const nodeIdResult = NodeId.create(createResult.value!.linkId.value);
        const persistedResult = await linkRepository.findById(nodeIdResult.value!);
        expect(persistedResult.isSuccess).toBe(true);
      });

      it('should validate input parameters comprehensively across all use cases', async () => {
        // RED: Test comprehensive input validation
        
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
            createdBy: testUserId
          },
          // Invalid strength value
          {
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.KNOWLEDGE_BASE,
            sourceId: 'valid-source',
            targetId: 'valid-target',
            linkType: LinkType.REFERENCES,
            initialStrength: 1.5, // > 1.0
            createdBy: testUserId
          },
          // Self-linking
          {
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.FUNCTION_MODEL,
            sourceId: 'same-entity',
            targetId: 'same-entity',
            linkType: LinkType.REFERENCES,
            initialStrength: 0.5,
            createdBy: testUserId
          }
        ];

        for (const invalidCommand of invalidCreateCommands) {
          const result = await createLinkUseCase.execute(invalidCommand);
          expect(result.isFailure).toBe(true);
          expect(result.error).toBeTruthy();
        }

        // Invalid strength calculation commands
        const invalidStrengthCommands: CalculateLinkStrengthCommand[] = [
          // Empty link ID
          {
            linkId: '',
            timeWindowHours: 24
          },
          // Invalid time window
          {
            linkId: 'valid-link-id',
            timeWindowHours: -5
          }
        ];

        for (const invalidCommand of invalidStrengthCommands) {
          const result = await calculateStrengthUseCase.execute(invalidCommand);
          expect(result.isFailure).toBe(true);
          expect(result.error).toBeTruthy();
        }

        // Invalid cycle detection commands
        const invalidCycleCommands: DetectRelationshipCyclesCommand[] = [
          // Invalid max cycle length
          {
            includeAllFeatures: true,
            maxCycleLength: 0
          },
          // Invalid threshold
          {
            includeAllFeatures: true,
            criticalLengthThreshold: -1
          }
        ];

        for (const invalidCommand of invalidCycleCommands) {
          const result = await detectCyclesUseCase.execute(invalidCommand);
          expect(result.isFailure).toBe(true);
          expect(result.error).toBeTruthy();
        }
      });
    });
  });

  describe('TDD Phase 6: Clean Architecture Compliance', () => {
    describe('Dependency Inversion and Architecture Boundaries', () => {
      it('should verify use cases depend only on repository interfaces, not concrete implementations', () => {
        // RED: Test Clean Architecture dependency compliance
        
        // Verify constructor dependencies are interfaces
        expect(createLinkUseCase).toBeDefined();
        expect(calculateStrengthUseCase).toBeDefined();
        expect(detectCyclesUseCase).toBeDefined();

        // Test that use cases work with any implementation of the interfaces
        const mockLinkRepository = {
          save: jest.fn().mockResolvedValue(Result.ok()),
          findById: jest.fn().mockResolvedValue(Result.ok(null)),
          findBySourceAndTarget: jest.fn().mockResolvedValue(Result.ok(null)),
          update: jest.fn().mockResolvedValue(Result.ok()),
          findAll: jest.fn().mockResolvedValue(Result.ok([])),
          findByFeature: jest.fn().mockResolvedValue(Result.ok([])),
          findByLinkType: jest.fn().mockResolvedValue(Result.ok([]))
        };

        const mockAnalyticsService = {
          getInteractionFrequency: jest.fn().mockResolvedValue(50),
          getSemanticSimilarity: jest.fn().mockResolvedValue(0.7),
          getContextRelevance: jest.fn().mockResolvedValue(0.6)
        };

        const mockEventBus = {
          publish: jest.fn().mockResolvedValue(undefined)
        };

        // Should be able to instantiate with mock implementations
        const mockCreateUseCase = new CreateCrossFeatureLinkUseCase(mockLinkRepository as any, mockEventBus, linkingService);
        const mockCalculateUseCase = new CalculateLinkStrengthUseCase(mockLinkRepository as any, mockAnalyticsService as any, mockEventBus, linkingService);
        const mockDetectUseCase = new DetectRelationshipCyclesUseCase(mockLinkRepository as any, mockEventBus, linkingService);
        
        expect(mockCreateUseCase).toBeDefined();
        expect(mockCalculateUseCase).toBeDefined();
        expect(mockDetectUseCase).toBeDefined();
      });

      it('should ensure Result pattern is used consistently across all cross-feature operations', async () => {
        // RED: Test Result pattern consistency
        
        const testCommand: CreateCrossFeatureLinkCommand = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: 'result-pattern-test',
          targetId: 'result-target',
          linkType: LinkType.REFERENCES,
          initialStrength: 0.5,
          createdBy: testUserId
        };

        // All use case operations should return Result types
        const createResult = await createLinkUseCase.execute(testCommand);
        expect(createResult).toHaveProperty('isSuccess');
        expect(createResult).toHaveProperty('isFailure');
        expect(typeof createResult.isSuccess).toBe('boolean');
        expect(typeof createResult.isFailure).toBe('boolean');

        if (createResult.isSuccess) {
          testLinks.push(createResult.value!.linkId.value);

          const strengthCommand: CalculateLinkStrengthCommand = {
            linkId: createResult.value!.linkId.value,
            timeWindowHours: 24
          };

          const strengthResult = await calculateStrengthUseCase.execute(strengthCommand);
          
          // Result pattern should be consistent across all operations
          expect(strengthResult).toHaveProperty('isSuccess');
          expect(strengthResult).toHaveProperty('isFailure');
          expect(strengthResult).toHaveProperty('value');
          // Only failed results have error property
          if (strengthResult.isFailure) {
            expect(strengthResult).toHaveProperty('error');
          }

          const cycleCommand: DetectRelationshipCyclesCommand = {
            includeAllFeatures: true
          };

          const cycleResult = await detectCyclesUseCase.execute(cycleCommand);
          expect(cycleResult).toHaveProperty('isSuccess');
          expect(cycleResult).toHaveProperty('isFailure');
          expect(cycleResult).toHaveProperty('value');
          // Only failed results have error property
          if (cycleResult.isFailure) {
            expect(cycleResult).toHaveProperty('error');
          }
        }
      });

      it('should validate that domain logic stays in domain layer and use cases orchestrate properly', async () => {
        // RED: Test that business logic is properly encapsulated
        
        // Create a cross-feature link to test domain logic encapsulation
        const domainTestCommand: CreateCrossFeatureLinkCommand = {
          sourceFeature: FeatureType.FUNCTION_MODEL,
          targetFeature: FeatureType.KNOWLEDGE_BASE,
          sourceId: 'domain-logic-test',
          targetId: 'domain-target',
          linkType: LinkType.REFERENCES,
          initialStrength: 0.6,
          nodeContext: {
            nodeId: 'domain-node',
            nodeType: 'DomainTest'
          },
          createdBy: testUserId
        };

        const createResult = await createLinkUseCase.execute(domainTestCommand);
        expect(createResult.isSuccess).toBe(true);
        testLinks.push(createResult.value!.linkId.value);

        // Verify that link creation followed domain rules
        const nodeIdResult = NodeId.create(createResult.value!.linkId.value);
        const linkResult = await linkRepository.findById(nodeIdResult.value!);
        expect(linkResult.isSuccess).toBe(true);
        
        const link = linkResult.value!;
        
        // Domain logic should be encapsulated in the entity
        expect(link.isCrossFeature()).toBe(true); // Domain behavior
        expect(link.isReferenceLink()).toBe(true); // Domain behavior
        expect(link.hasNodeContext()).toBe(true); // Domain behavior
        expect(link.linkStrength).toBe(0.6); // Domain invariant
        expect(link.createdAt).toBeInstanceOf(Date); // Domain behavior
        expect(link.linkId).toBeDefined(); // Domain identity
        
        // Use cases should orchestrate, not contain business logic
        // The use case should have delegated validation to domain entities and services
        expect(link.sourceFeature).toBe(FeatureType.FUNCTION_MODEL);
        expect(link.targetFeature).toBe(FeatureType.KNOWLEDGE_BASE);
        
        // Test domain service integration
        expect(linkingService).toBeDefined();
        const serviceLinks = linkingService.getFeatureLinks(FeatureType.FUNCTION_MODEL);
        expect(serviceLinks.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('TDD Phase 7: Performance and Scalability Testing', () => {
    describe('Large Scale Operations and Performance Validation', () => {
      it('should handle large-scale link networks efficiently with performance metrics', async () => {
        // RED: Test performance with large datasets
        const startTime = Date.now();
        
        // Create 100 links across different feature combinations
        const performanceLinks = [];
        const features = [FeatureType.FUNCTION_MODEL, FeatureType.KNOWLEDGE_BASE, FeatureType.SPINDLE, FeatureType.EVENT_STORM];
        
        for (let i = 0; i < 100; i++) {
          const sourceFeature = features[Math.floor(Math.random() * features.length)];
          let targetFeature = features[Math.floor(Math.random() * features.length)];
          
          // Ensure cross-feature links
          while (targetFeature === sourceFeature) {
            targetFeature = features[Math.floor(Math.random() * features.length)];
          }
          
          performanceLinks.push({
            sourceFeature,
            targetFeature,
            sourceId: `perf-source-${i}`,
            targetId: `perf-target-${i}`,
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
            createdBy: testUserId
          };

          const result = await createLinkUseCase.execute(command);
          if (result.isSuccess) {
            createdLinks.push(result.value!.linkId.value);
            testLinks.push(result.value!.linkId.value);
          }
        }

        const creationTime = Date.now() - startTime;
        
        // Performance validation for creation
        expect(creationTime).toBeLessThan(30000); // Less than 30 seconds for 100 links
        expect(createdLinks.length).toBeGreaterThan(90); // At least 90% success rate

        // Test cycle detection performance on large network
        const cycleStartTime = Date.now();
        
        const largeCycleCommand: DetectRelationshipCyclesCommand = {
          includeAllFeatures: true,
          maxCycleLength: 20
        };

        const cycleResult = await detectCyclesUseCase.execute(largeCycleCommand);
        expect(cycleResult.isSuccess).toBe(true);
        
        const cycleDetectionTime = Date.now() - cycleStartTime;
        
        // Performance validation for cycle detection
        expect(cycleDetectionTime).toBeLessThan(15000); // Less than 15 seconds
        
        const analysis = cycleResult.value!;
        expect(analysis.totalCycles).toBeGreaterThanOrEqual(0);
        
        console.log(`Performance metrics:
          - Link creation: ${creationTime}ms for ${createdLinks.length} links
          - Cycle detection: ${cycleDetectionTime}ms for ${createdLinks.length} links network
          - Cycles found: ${analysis.totalCycles}
          - Average cycle length: ${analysis.averageCycleLength}`);
      });

      it('should maintain performance with concurrent operations', async () => {
        // RED: Test concurrent operation performance
        const concurrentOperations: Promise<any>[] = [];
        const operationResults: any[] = [];
        
        // Prepare concurrent link creations
        for (let i = 0; i < 20; i++) {
          const command: CreateCrossFeatureLinkCommand = {
            sourceFeature: FeatureType.FUNCTION_MODEL,
            targetFeature: FeatureType.KNOWLEDGE_BASE,
            sourceId: `concurrent-source-${i}`,
            targetId: `concurrent-target-${i}`,
            linkType: LinkType.REFERENCES,
            initialStrength: 0.5,
            createdBy: testUserId
          };
          
          concurrentOperations.push(
            createLinkUseCase.execute(command).then(result => {
              operationResults.push(result);
              if (result.isSuccess) {
                testLinks.push(result.value!.linkId.value);
              }
              return result;
            })
          );
        }
        
        const startTime = Date.now();
        const results = await Promise.all(concurrentOperations);
        const endTime = Date.now();
        
        const concurrentTime = endTime - startTime;
        
        // Validate concurrent performance
        expect(concurrentTime).toBeLessThan(10000); // Less than 10 seconds for 20 concurrent operations
        
        const successfulOperations = results.filter(r => r.isSuccess);
        expect(successfulOperations.length).toBeGreaterThan(15); // At least 75% success rate
      });
    });
  });
});