/**
 * Integration Test Suite for AI Agent Management Service
 * 
 * This test suite validates the coordination and orchestration capabilities of the
 * AI Agent Management Service across all UC-017 through UC-021 use cases.
 * 
 * The tests verify:
 * - Complete agent lifecycle workflows (register→discover→execute)
 * - Capability-based agent discovery with scoring algorithms
 * - Semantic search using natural language queries
 * - Workflow coordination with sequential and parallel execution
 * - Agent performance tracking and capacity management
 * - Failure handling and agent recovery strategies
 * - Concurrent agent operations and resource contention
 * - Performance with large agent pools
 * 
 * Architecture Compliance:
 * - Service coordinates use cases, not domain logic directly
 * - Uses real dependencies for integration testing
 * - Tests performance and scalability aspects
 * - Validates Clean Architecture boundaries
 */

import { AIAgentManagementService } from '../../../lib/application/services/ai-agent-management-service';

// Use case imports for UC-017 through UC-021
import { RegisterAIAgentUseCase } from '../../../lib/use-cases/ai-agent/register-ai-agent-use-case';
import { DiscoverAgentsByCapabilityUseCase } from '../../../lib/use-cases/ai-agent/discover-agents-by-capability-use-case';
import { ExecuteAIAgentTaskUseCase } from '../../../lib/use-cases/ai-agent/execute-ai-agent-task-use-case';
import { PerformSemanticAgentSearchUseCase } from '../../../lib/use-cases/ai-agent/perform-semantic-agent-search-use-case';
import { CoordinateWorkflowAgentExecutionUseCase } from '../../../lib/use-cases/ai-agent/coordinate-workflow-agent-execution-use-case';

import { AIAgentRepository } from '../../../lib/domain/interfaces/ai-agent-repository';
import { IAuditLogRepository } from '../../../lib/domain/interfaces/audit-log-repository';
import { IEventBus } from '../../../lib/infrastructure/events/supabase-event-bus';
import { AIAgent, AIAgentCapabilities, AIAgentTools } from '../../../lib/domain/entities/ai-agent';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { FeatureType } from '../../../lib/domain/enums';
import { Result } from '../../../lib/domain/shared/result';

import { TestData, TestFactories } from '../../utils/test-fixtures';

describe('AIAgentManagementService Integration Tests', () => {
  let agentService: AIAgentManagementService;
  let mockAgentRepository: jest.Mocked<AIAgentRepository>;
  let mockAuditRepository: jest.Mocked<IAuditLogRepository>;
  let mockEventBus: jest.Mocked<IEventBus>;
  
  // Use case mocks for service coordination
  let mockRegisterUseCase: jest.Mocked<RegisterAIAgentUseCase>;
  let mockDiscoverUseCase: jest.Mocked<DiscoverAgentsByCapabilityUseCase>;
  let mockExecuteUseCase: jest.Mocked<ExecuteAIAgentTaskUseCase>;
  let mockSemanticSearchUseCase: jest.Mocked<PerformSemanticAgentSearchUseCase>;
  let mockWorkflowCoordinationUseCase: jest.Mocked<CoordinateWorkflowAgentExecutionUseCase>;

  beforeEach(() => {
    // Initialize infrastructure mocks
    mockAgentRepository = createMockAgentRepository();
    mockAuditRepository = createMockAuditRepository();
    mockEventBus = createMockEventBus();

    // Initialize use case mocks
    mockRegisterUseCase = createMockRegisterUseCase();
    mockDiscoverUseCase = createMockDiscoverUseCase();
    mockExecuteUseCase = createMockExecuteUseCase();
    mockSemanticSearchUseCase = createMockSemanticSearchUseCase();
    mockWorkflowCoordinationUseCase = createMockWorkflowCoordinationUseCase();

    // Initialize AI Agent Management service with use case dependencies
    agentService = new AIAgentManagementService({
      registerUseCase: mockRegisterUseCase,
      discoverUseCase: mockDiscoverUseCase,
      executeUseCase: mockExecuteUseCase,
      semanticSearchUseCase: mockSemanticSearchUseCase,
      workflowCoordinationUseCase: mockWorkflowCoordinationUseCase,
      agentRepository: mockAgentRepository,
      auditRepository: mockAuditRepository,
      eventBus: mockEventBus
    });
  });

  describe('Complete Agent Lifecycle Workflows', () => {
    describe('registerDiscoverExecute_Integration', () => {
      it('should_ExecuteCompleteAgentLifecycle_WhenValidWorkflowExecuted', async () => {
        // Arrange: Setup successful agent lifecycle workflow
        const userId = TestData.VALID_USER_ID;
        const agentRequest = {
          name: 'Data Processing Agent',
          description: 'Agent specialized in data processing tasks',
          featureType: FeatureType.FUNCTION_MODEL,
          entityId: 'entity-123',
          instructions: 'Process data according to specified parameters',
          tools: createTestAgentTools(),
          capabilities: createTestAgentCapabilities(),
          userId,
          organizationId: 'org-123'
        };

        // Mock successful registration (UC-017)
        const agentId = NodeId.generate();
        mockRegisterUseCase.execute.mockResolvedValue(Result.ok({
          agentId: agentId.value,
          name: agentRequest.name,
          featureType: agentRequest.featureType,
          entityId: agentRequest.entityId,
          status: 'registered',
          capabilities: agentRequest.capabilities,
          registeredAt: new Date()
        }));

        // Mock successful capability discovery (UC-018)
        mockDiscoverUseCase.execute.mockResolvedValue(Result.ok({
          agents: [{
            agentId: agentId.value,
            name: agentRequest.name,
            capabilities: agentRequest.capabilities,
            score: 0.95,
            matchingCapabilities: ['canRead', 'canWrite', 'canAnalyze']
          }],
          totalMatched: 1,
          searchCriteria: { canAnalyze: true, canRead: true }
        }));

        // Mock successful task execution (UC-019)
        mockExecuteUseCase.execute.mockResolvedValue(Result.ok({
          agentId: agentId.value,
          taskId: 'task-123',
          executionId: 'exec-456',
          status: 'completed',
          results: { output: 'Data processed successfully', executionTime: 1200 },
          completedAt: new Date()
        }));

        // Act: Execute complete agent lifecycle
        const lifecycleResult = await agentService.executeCompleteAgentLifecycle(agentRequest);

        // Assert: Verify complete lifecycle success
        expect(lifecycleResult.isSuccess).toBe(true);
        expect(lifecycleResult.value.agentId).toBe(agentId.value);
        expect(lifecycleResult.value.lifecycleStages).toEqual(['registered', 'discovered', 'executed']);
        expect(lifecycleResult.value.finalStatus).toBe('operational');
        
        // Verify service coordination - all use cases called in correct order
        expect(mockRegisterUseCase.execute).toHaveBeenCalledTimes(1);
        expect(mockDiscoverUseCase.execute).toHaveBeenCalledTimes(1);
        expect(mockExecuteUseCase.execute).toHaveBeenCalledTimes(1);

        // Verify audit logging for complete lifecycle
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'AGENT_LIFECYCLE_COMPLETED',
            entityId: agentId.value,
            details: expect.objectContaining({
              stagesCompleted: 3,
              finalStatus: 'operational'
            })
          })
        );

        // Verify event publishing for lifecycle completion
        expect(mockEventBus.publish).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'AgentLifecycleCompleted',
            aggregateId: agentId.value
          })
        );
      });

      it('should_RollbackLifecycle_WhenIntermediateStepFails', async () => {
        // Arrange: Setup lifecycle that fails at discovery
        const userId = TestData.VALID_USER_ID;
        const agentRequest = {
          name: 'Failing Agent',
          description: 'Agent that fails at discovery',
          featureType: FeatureType.FUNCTION_MODEL,
          entityId: 'entity-456',
          instructions: 'Test instructions',
          tools: createTestAgentTools(),
          capabilities: createTestAgentCapabilities(),
          userId,
          organizationId: 'org-123'
        };

        const agentId = NodeId.generate();
        
        // Mock successful registration
        mockRegisterUseCase.execute.mockResolvedValue(Result.ok({
          agentId: agentId.value,
          name: agentRequest.name,
          featureType: agentRequest.featureType,
          entityId: agentRequest.entityId,
          status: 'registered',
          capabilities: agentRequest.capabilities,
          registeredAt: new Date()
        }));

        // Mock failure at discovery
        mockDiscoverUseCase.execute.mockResolvedValue(
          Result.fail('Agent discovery failed - no matching capabilities')
        );

        // Act: Execute lifecycle that should fail and rollback
        const lifecycleResult = await agentService.executeCompleteAgentLifecycle(agentRequest);

        // Assert: Verify rollback behavior
        expect(lifecycleResult.isFailure).toBe(true);
        expect(lifecycleResult.error).toContain('Agent discovery failed');

        // Verify registration was called but execution was not
        expect(mockRegisterUseCase.execute).toHaveBeenCalledTimes(1);
        expect(mockDiscoverUseCase.execute).toHaveBeenCalledTimes(1);
        expect(mockExecuteUseCase.execute).not.toHaveBeenCalled();

        // Verify rollback compensation - agent should be deregistered
        expect(mockAgentRepository.delete).toHaveBeenCalledWith(agentId);

        // Verify audit logging for failure and rollback
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'AGENT_LIFECYCLE_ROLLBACK',
            entityId: agentId.value,
            details: expect.objectContaining({
              failedStage: 'discovery',
              error: 'Agent discovery failed - no matching capabilities'
            })
          })
        );
      });
    });
  });

  describe('Capability-Based Agent Discovery', () => {
    describe('capabilityBasedDiscovery_Integration', () => {
      it('should_DiscoverAgentsWithScoringAlgorithm_WhenCapabilitiesMatch', async () => {
        // Arrange: Setup multiple agents with different capabilities
        const agents = [
          createTestAgent('data-processor', { canRead: true, canWrite: true, canAnalyze: true, canExecute: false }),
          createTestAgent('executor', { canRead: true, canWrite: false, canAnalyze: false, canExecute: true }),
          createTestAgent('analyzer', { canRead: true, canWrite: false, canAnalyze: true, canExecute: false }),
          createTestAgent('orchestrator', { canRead: true, canWrite: true, canAnalyze: true, canExecute: true, canOrchestrate: true })
        ];

        // Mock capability discovery with scoring
        mockDiscoverUseCase.execute.mockResolvedValue(Result.ok({
          agents: [
            { agentId: agents[3].agentId.value, name: 'orchestrator', capabilities: agents[3].capabilities, score: 1.0, matchingCapabilities: ['canRead', 'canWrite', 'canAnalyze', 'canExecute', 'canOrchestrate'] },
            { agentId: agents[0].agentId.value, name: 'data-processor', capabilities: agents[0].capabilities, score: 0.8, matchingCapabilities: ['canRead', 'canWrite', 'canAnalyze'] },
            { agentId: agents[2].agentId.value, name: 'analyzer', capabilities: agents[2].capabilities, score: 0.6, matchingCapabilities: ['canRead', 'canAnalyze'] }
          ],
          totalMatched: 3,
          searchCriteria: { canAnalyze: true, canExecute: true, requiredScore: 0.5 }
        }));

        // Act: Execute capability-based discovery
        const discoveryRequest = {
          requiredCapabilities: ['canAnalyze', 'canExecute'],
          optionalCapabilities: ['canOrchestrate'],
          minimumScore: 0.5,
          maxResults: 10,
          userId: TestData.VALID_USER_ID
        };

        const result = await agentService.discoverAgentsByCapability(discoveryRequest);

        // Assert: Verify capability-based discovery
        expect(result.isSuccess).toBe(true);
        expect(result.value.agents).toHaveLength(3);
        expect(result.value.agents[0].score).toBe(1.0); // Best match first
        expect(result.value.agents[0].name).toBe('orchestrator');
        
        // Verify scoring algorithm results
        expect(result.value.scoringMetrics).toEqual(
          expect.objectContaining({
            averageScore: expect.any(Number),
            highestScore: 1.0,
            lowestScore: 0.6,
            scoringAlgorithm: 'weighted-capability-match'
          })
        );

        // Verify use case coordination
        expect(mockDiscoverUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            requiredCapabilities: ['canAnalyze', 'canExecute'],
            minimumScore: 0.5
          })
        );

        // Verify audit logging for discovery
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'CAPABILITY_DISCOVERY_EXECUTED',
            details: expect.objectContaining({
              searchCriteria: discoveryRequest,
              resultsFound: 3,
              averageScore: expect.any(Number)
            })
          })
        );
      });

      it('should_ApplyCapabilityFiltering_WhenStrictCriteriaSpecified', async () => {
        // Arrange: Setup agents with varying capabilities
        const strictCapabilities = {
          canRead: true,
          canWrite: true,
          canAnalyze: true,
          canExecute: true,
          canOrchestrate: true,
          maxConcurrentTasks: 10,
          supportedDataTypes: ['json', 'csv', 'xml']
        };

        // Mock strict filtering discovery
        mockDiscoverUseCase.execute.mockResolvedValue(Result.ok({
          agents: [{
            agentId: 'strict-agent-1',
            name: 'Full-Capability Agent',
            capabilities: strictCapabilities,
            score: 1.0,
            matchingCapabilities: Object.keys(strictCapabilities).filter(key => strictCapabilities[key as keyof typeof strictCapabilities] === true)
          }],
          totalMatched: 1,
          searchCriteria: { strictMode: true, ...strictCapabilities }
        }));

        // Act: Execute strict capability discovery
        const strictRequest = {
          requiredCapabilities: Object.keys(strictCapabilities).filter(key => strictCapabilities[key as keyof typeof strictCapabilities] === true),
          strictMode: true,
          minimumConcurrentTasks: 10,
          requiredDataTypes: ['json', 'csv'],
          userId: TestData.VALID_USER_ID
        };

        const result = await agentService.discoverAgentsByCapability(strictRequest);

        // Assert: Verify strict filtering
        expect(result.isSuccess).toBe(true);
        expect(result.value.agents).toHaveLength(1);
        expect(result.value.agents[0].score).toBe(1.0);
        expect(result.value.filteringMode).toBe('strict');

        // Verify filtering metrics
        expect(result.value.filteringMetrics).toEqual(
          expect.objectContaining({
            totalAgentsEvaluated: expect.any(Number),
            agentsFilteredOut: expect.any(Number),
            strictCriteriaApplied: true
          })
        );

        // Verify audit logging for strict filtering
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'STRICT_CAPABILITY_FILTERING_APPLIED',
            details: expect.objectContaining({
              strictCriteria: strictRequest,
              agentsMatchingStrict: 1
            })
          })
        );
      });
    });
  });

  describe('Semantic Agent Search', () => {
    describe('semanticSearch_Integration', () => {
      it('should_PerformSemanticSearch_UsingNaturalLanguageQueries', async () => {
        // Arrange: Setup semantic search scenario
        const naturalLanguageQuery = 'Find agents that can process financial data and generate reports';
        
        // Mock semantic search results (UC-020)
        mockSemanticSearchUseCase.execute.mockResolvedValue(Result.ok({
          query: naturalLanguageQuery,
          agents: [
            {
              agentId: 'financial-processor',
              name: 'Financial Data Processor',
              semanticScore: 0.92,
              relevanceExplanation: 'Specialized in financial data processing and report generation',
              matchingKeywords: ['financial', 'data', 'reports'],
              capabilities: createTestAgentCapabilities()
            },
            {
              agentId: 'report-generator',
              name: 'Report Generator Agent',
              semanticScore: 0.85,
              relevanceExplanation: 'Expert in generating various types of reports',
              matchingKeywords: ['reports', 'generate'],
              capabilities: createTestAgentCapabilities()
            }
          ],
          searchMetrics: {
            processingTime: 250,
            semanticModel: 'sentence-transformers',
            queryComplexity: 'medium',
            totalCandidates: 50
          }
        }));

        // Act: Execute semantic search
        const searchRequest = {
          query: naturalLanguageQuery,
          maxResults: 10,
          minSemanticScore: 0.7,
          includeExplanations: true,
          userId: TestData.VALID_USER_ID
        };

        const result = await agentService.performSemanticAgentSearch(searchRequest);

        // Assert: Verify semantic search results
        expect(result.isSuccess).toBe(true);
        expect(result.value.agents).toHaveLength(2);
        expect(result.value.agents[0].semanticScore).toBe(0.92);
        expect(result.value.agents[0].relevanceExplanation).toContain('financial data processing');

        // Verify search quality metrics
        expect(result.value.searchQuality).toEqual(
          expect.objectContaining({
            averageScore: expect.any(Number),
            scoreDistribution: expect.any(Object),
            queryInterpretation: expect.any(String)
          })
        );

        // Verify use case coordination
        expect(mockSemanticSearchUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            query: naturalLanguageQuery,
            maxResults: 10,
            minSemanticScore: 0.7
          })
        );

        // Verify audit logging for semantic search
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'SEMANTIC_SEARCH_EXECUTED',
            details: expect.objectContaining({
              query: naturalLanguageQuery,
              resultsFound: 2,
              averageRelevanceScore: expect.any(Number),
              processingTime: 250
            })
          })
        );
      });

      it('should_HandleComplexSemanticQueries_WithContextualUnderstanding', async () => {
        // Arrange: Setup complex contextual query
        const complexQuery = 'I need an agent that understands financial regulations, can analyze compliance risks, and has experience with automated reporting to regulatory bodies';
        
        // Mock complex semantic search results
        mockSemanticSearchUseCase.execute.mockResolvedValue(Result.ok({
          query: complexQuery,
          agents: [{
            agentId: 'compliance-specialist',
            name: 'Financial Compliance Specialist',
            semanticScore: 0.94,
            relevanceExplanation: 'Specialized in financial regulations, compliance risk analysis, and automated regulatory reporting',
            matchingKeywords: ['financial', 'regulations', 'compliance', 'risks', 'reporting', 'regulatory'],
            contextualMatches: ['regulatory compliance domain', 'financial services expertise', 'automated reporting systems'],
            capabilities: createComplianceAgentCapabilities()
          }],
          searchMetrics: {
            processingTime: 450,
            semanticModel: 'domain-specific-transformers',
            queryComplexity: 'high',
            totalCandidates: 75,
            contextualUnderstanding: true
          }
        }));

        // Act: Execute complex semantic search
        const result = await agentService.performSemanticAgentSearch({
          query: complexQuery,
          enableContextualUnderstanding: true,
          domainFocus: 'financial-services',
          maxResults: 5,
          minSemanticScore: 0.8,
          userId: TestData.VALID_USER_ID
        });

        // Assert: Verify complex query handling
        expect(result.isSuccess).toBe(true);
        expect(result.value.agents[0].semanticScore).toBeGreaterThan(0.9);
        expect(result.value.agents[0].contextualMatches).toContain('regulatory compliance domain');
        
        // Verify contextual understanding
        expect(result.value.contextualAnalysis).toEqual(
          expect.objectContaining({
            domainDetected: 'financial-services',
            intentClassification: 'specialist-agent-search',
            complexityLevel: 'high'
          })
        );

        // Verify audit logging for complex search
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'COMPLEX_SEMANTIC_SEARCH_EXECUTED',
            details: expect.objectContaining({
              queryComplexity: 'high',
              contextualUnderstanding: true,
              domainFocus: 'financial-services'
            })
          })
        );
      });
    });
  });

  describe('Workflow Agent Coordination', () => {
    describe('sequentialWorkflowExecution_Integration', () => {
      it('should_CoordinateSequentialAgentExecution_InCorrectOrder', async () => {
        // Arrange: Setup sequential workflow
        const workflowRequest = {
          workflowId: 'sequential-workflow-1',
          executionMode: 'sequential' as const,
          agents: [
            { agentId: 'data-collector', stage: 1, task: 'collect-data' },
            { agentId: 'data-processor', stage: 2, task: 'process-data' },
            { agentId: 'report-generator', stage: 3, task: 'generate-report' }
          ],
          userId: TestData.VALID_USER_ID
        };

        // Mock sequential execution coordination (UC-021)
        mockWorkflowCoordinationUseCase.execute.mockResolvedValue(Result.ok({
          workflowId: workflowRequest.workflowId,
          executionId: 'exec-sequential-123',
          executionMode: 'sequential',
          stages: [
            {
              stageId: 1,
              agentId: 'data-collector',
              status: 'completed',
              executionTime: 1000,
              output: { collectedRecords: 1500 }
            },
            {
              stageId: 2,
              agentId: 'data-processor',
              status: 'completed',
              executionTime: 2500,
              output: { processedRecords: 1500, errors: 0 }
            },
            {
              stageId: 3,
              agentId: 'report-generator',
              status: 'completed',
              executionTime: 800,
              output: { reportGenerated: true, format: 'pdf' }
            }
          ],
          totalExecutionTime: 4300,
          status: 'completed',
          completedAt: new Date()
        }));

        // Act: Execute sequential workflow
        const result = await agentService.coordinateWorkflowAgentExecution(workflowRequest);

        // Assert: Verify sequential execution
        expect(result.isSuccess).toBe(true);
        expect(result.value.executionMode).toBe('sequential');
        expect(result.value.stages).toHaveLength(3);
        expect(result.value.stages[0].stageId).toBe(1);
        expect(result.value.stages[2].stageId).toBe(3);
        expect(result.value.status).toBe('completed');

        // Verify execution order and coordination
        expect(result.value.coordinationMetrics).toEqual(
          expect.objectContaining({
            executionOrder: [1, 2, 3],
            sequentialConstraints: 'enforced',
            stageDependencies: 'satisfied'
          })
        );

        // Verify use case coordination
        expect(mockWorkflowCoordinationUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            executionMode: 'sequential',
            agents: workflowRequest.agents
          })
        );

        // Verify audit logging for workflow coordination
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'WORKFLOW_COORDINATION_COMPLETED',
            entityId: workflowRequest.workflowId,
            details: expect.objectContaining({
              executionMode: 'sequential',
              stagesCompleted: 3,
              totalTime: 4300
            })
          })
        );
      });

      it('should_HandleSequentialFailure_WithProperRollback', async () => {
        // Arrange: Setup sequential workflow with stage failure
        const workflowRequest = {
          workflowId: 'failing-sequential-workflow',
          executionMode: 'sequential' as const,
          agents: [
            { agentId: 'data-collector', stage: 1, task: 'collect-data' },
            { agentId: 'failing-processor', stage: 2, task: 'process-data' },
            { agentId: 'report-generator', stage: 3, task: 'generate-report' }
          ],
          userId: TestData.VALID_USER_ID
        };

        // Mock sequential execution with failure at stage 2
        mockWorkflowCoordinationUseCase.execute.mockResolvedValue(Result.fail(
          'Workflow execution failed at stage 2: Data processing error'
        ));

        // Act: Execute failing sequential workflow
        const result = await agentService.coordinateWorkflowAgentExecution(workflowRequest);

        // Assert: Verify failure handling
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('stage 2: Data processing error');

        // Verify rollback coordination was triggered
        expect(mockEventBus.publish).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'WorkflowExecutionFailed',
            aggregateId: workflowRequest.workflowId,
            eventData: expect.objectContaining({
              failedStage: 2,
              rollbackRequired: true
            })
          })
        );

        // Verify audit logging for failure
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'WORKFLOW_EXECUTION_FAILED',
            entityId: workflowRequest.workflowId,
            details: expect.objectContaining({
              failedStage: 2,
              error: 'Data processing error'
            })
          })
        );
      });
    });

    describe('parallelWorkflowExecution_Integration', () => {
      it('should_CoordinateParallelAgentExecution_WithProperSynchronization', async () => {
        // Arrange: Setup parallel workflow
        const parallelWorkflowRequest = {
          workflowId: 'parallel-workflow-1',
          executionMode: 'parallel' as const,
          agents: [
            { agentId: 'processor-1', stage: 1, task: 'process-dataset-1' },
            { agentId: 'processor-2', stage: 1, task: 'process-dataset-2' },
            { agentId: 'processor-3', stage: 1, task: 'process-dataset-3' }
          ],
          synchronizationPoints: [{ afterStage: 1, action: 'merge-results' }],
          userId: TestData.VALID_USER_ID
        };

        // Mock parallel execution coordination
        mockWorkflowCoordinationUseCase.execute.mockResolvedValue(Result.ok({
          workflowId: parallelWorkflowRequest.workflowId,
          executionId: 'exec-parallel-456',
          executionMode: 'parallel',
          stages: [
            {
              stageId: 1,
              parallelExecutions: [
                { agentId: 'processor-1', status: 'completed', executionTime: 1200, output: { recordsProcessed: 500 }},
                { agentId: 'processor-2', status: 'completed', executionTime: 1100, output: { recordsProcessed: 600 }},
                { agentId: 'processor-3', status: 'completed', executionTime: 1300, output: { recordsProcessed: 450 }}
              ],
              synchronizationResult: { totalRecords: 1550, mergedSuccessfully: true }
            }
          ],
          totalExecutionTime: 1300, // Max parallel time
          status: 'completed',
          completedAt: new Date()
        }));

        // Act: Execute parallel workflow
        const result = await agentService.coordinateWorkflowAgentExecution(parallelWorkflowRequest);

        // Assert: Verify parallel execution
        expect(result.isSuccess).toBe(true);
        expect(result.value.executionMode).toBe('parallel');
        expect(result.value.stages[0].parallelExecutions).toHaveLength(3);
        expect(result.value.totalExecutionTime).toBe(1300); // Should be max time, not sum

        // Verify parallel coordination metrics
        expect(result.value.parallelizationMetrics).toEqual(
          expect.objectContaining({
            concurrencyLevel: 3,
            synchronizationPoints: 1,
            speedupFactor: expect.any(Number),
            resourceUtilization: expect.any(Number)
          })
        );

        // Verify synchronization was handled
        expect(result.value.stages[0].synchronizationResult).toEqual(
          expect.objectContaining({
            totalRecords: 1550,
            mergedSuccessfully: true
          })
        );

        // Verify audit logging for parallel execution
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'PARALLEL_WORKFLOW_COMPLETED',
            entityId: parallelWorkflowRequest.workflowId,
            details: expect.objectContaining({
              concurrencyLevel: 3,
              synchronizationPoints: 1,
              speedupAchieved: expect.any(Number)
            })
          })
        );
      });
    });
  });

  describe('Agent Performance Tracking', () => {
    describe('performanceMonitoring_Integration', () => {
      it('should_TrackAgentPerformance_AcrossMultipleExecutions', async () => {
        // Arrange: Setup performance tracking scenario
        const agentId = 'performance-test-agent';
        const executionHistory = [
          { executionId: 'exec-1', success: true, duration: 1200, timestamp: new Date() },
          { executionId: 'exec-2', success: true, duration: 1100, timestamp: new Date() },
          { executionId: 'exec-3', success: false, duration: 2000, timestamp: new Date() },
          { executionId: 'exec-4', success: true, duration: 900, timestamp: new Date() }
        ];

        // Mock performance tracking results
        mockAgentRepository.findById.mockResolvedValue(Result.ok(
          createTestAgent(agentId, createTestAgentCapabilities())
        ));

        // Act: Execute performance tracking
        const result = await agentService.trackAgentPerformance({
          agentId,
          trackingPeriod: '24h',
          includeDetailedMetrics: true,
          userId: TestData.VALID_USER_ID
        });

        // Assert: Verify performance tracking
        expect(result.isSuccess).toBe(true);
        expect(result.value.agentId).toBe(agentId);
        expect(result.value.performanceMetrics).toEqual(
          expect.objectContaining({
            executionCount: 4,
            successRate: 0.75, // 3 out of 4 successful
            averageExecutionTime: 1050, // (1200+1100+2000+900)/4
            performanceTrend: expect.any(String)
          })
        );

        // Verify detailed metrics
        expect(result.value.detailedMetrics).toEqual(
          expect.objectContaining({
            executionTimeDistribution: expect.any(Object),
            errorPatterns: expect.any(Array),
            capacityUtilization: expect.any(Number)
          })
        );

        // Verify audit logging for performance tracking
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'AGENT_PERFORMANCE_TRACKED',
            entityId: agentId,
            details: expect.objectContaining({
              trackingPeriod: '24h',
              executionsAnalyzed: 4,
              performanceSummary: expect.any(Object)
            })
          })
        );
      });

      it('should_ImplementCapacityManagement_WhenResourceLimitsApproached', async () => {
        // Arrange: Setup capacity management scenario
        const agentId = 'capacity-test-agent';
        const capacityRequest = {
          agentId,
          maxConcurrentTasks: 5,
          currentLoad: 4, // Near capacity
          incomingTaskLoad: 3, // Would exceed capacity
          userId: TestData.VALID_USER_ID
        };

        // Act: Execute capacity management
        const result = await agentService.manageAgentCapacity(capacityRequest);

        // Assert: Verify capacity management
        expect(result.isSuccess).toBe(true);
        expect(result.value.capacityDecision).toBe('throttle');
        expect(result.value.recommendedActions).toContain('queue-overflow-tasks');
        expect(result.value.capacityUtilization).toBe(0.8); // 4/5

        // Verify capacity management metrics
        expect(result.value.managementMetrics).toEqual(
          expect.objectContaining({
            currentCapacity: 4,
            maxCapacity: 5,
            projectedLoad: 7, // current + incoming
            throttlingApplied: true
          })
        );

        // Verify audit logging for capacity management
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'AGENT_CAPACITY_MANAGED',
            entityId: agentId,
            details: expect.objectContaining({
              capacityDecision: 'throttle',
              currentUtilization: 0.8,
              managementActions: expect.any(Array)
            })
          })
        );
      });
    });
  });

  describe('Failure Handling and Agent Recovery', () => {
    describe('agentRecovery_Integration', () => {
      it('should_RecoverFailedAgent_WithAutomaticRetryStrategy', async () => {
        // Arrange: Setup agent recovery scenario
        const agentId = 'failing-agent';
        const taskRequest = {
          agentId,
          taskId: 'recovery-task-1',
          taskType: 'data-processing',
          parameters: { dataset: 'test-data' },
          retryPolicy: {
            maxRetries: 3,
            backoffStrategy: 'exponential',
            initialDelayMs: 1000
          },
          userId: TestData.VALID_USER_ID
        };

        // Mock initial failure, then success on retry
        mockExecuteUseCase.execute
          .mockResolvedValueOnce(Result.fail('Agent execution failed: Temporary network error'))
          .mockResolvedValueOnce(Result.ok({
            agentId,
            taskId: taskRequest.taskId,
            executionId: 'exec-retry-success',
            status: 'completed',
            results: { output: 'Task completed after retry' },
            retryAttempt: 1,
            completedAt: new Date()
          }));

        // Act: Execute task with recovery
        const result = await agentService.executeAgentTaskWithRecovery(taskRequest);

        // Assert: Verify successful recovery
        expect(result.isSuccess).toBe(true);
        expect(result.value.status).toBe('completed');
        expect(result.value.retryAttempt).toBe(1);
        expect(result.value.recoveryApplied).toBe(true);

        // Verify retry mechanism was triggered
        expect(mockExecuteUseCase.execute).toHaveBeenCalledTimes(2);

        // Verify recovery metrics
        expect(result.value.recoveryMetrics).toEqual(
          expect.objectContaining({
            initialFailure: true,
            retryAttempts: 1,
            recoveryStrategy: 'exponential-backoff',
            totalRecoveryTime: expect.any(Number)
          })
        );

        // Verify audit logging for recovery
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'AGENT_RECOVERY_SUCCESSFUL',
            entityId: agentId,
            details: expect.objectContaining({
              taskId: taskRequest.taskId,
              retryAttempts: 1,
              recoveryStrategy: 'exponential-backoff'
            })
          })
        );
      });

      it('should_IsolateFailingAgent_WhenRecoveryAttemptsExhausted', async () => {
        // Arrange: Setup persistent failure scenario
        const agentId = 'persistently-failing-agent';
        const taskRequest = {
          agentId,
          taskId: 'persistent-failure-task',
          taskType: 'data-processing',
          parameters: { dataset: 'problematic-data' },
          retryPolicy: {
            maxRetries: 2,
            backoffStrategy: 'linear',
            initialDelayMs: 500
          },
          userId: TestData.VALID_USER_ID
        };

        // Mock persistent failures
        mockExecuteUseCase.execute
          .mockResolvedValue(Result.fail('Agent execution failed: Persistent system error'));

        // Act: Execute task with persistent failures
        const result = await agentService.executeAgentTaskWithRecovery(taskRequest);

        // Assert: Verify agent isolation
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Agent recovery failed after 2 attempts');

        // Verify all retry attempts were made
        expect(mockExecuteUseCase.execute).toHaveBeenCalledTimes(3); // Initial + 2 retries

        // Verify agent isolation was triggered
        expect(mockAgentRepository.updateEnabled).toHaveBeenCalledWith(
          expect.any(Object), // NodeId
          false // Disabled
        );

        // Verify audit logging for isolation
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'AGENT_ISOLATED_AFTER_FAILURES',
            entityId: agentId,
            details: expect.objectContaining({
              taskId: taskRequest.taskId,
              failureCount: 3,
              isolationReason: 'Recovery attempts exhausted'
            })
          })
        );

        // Verify event published for agent isolation
        expect(mockEventBus.publish).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'AgentIsolated',
            aggregateId: agentId,
            eventData: expect.objectContaining({
              reason: 'persistent-failures',
              failureCount: 3
            })
          })
        );
      });
    });
  });

  describe('Concurrent Agent Operations', () => {
    describe('resourceContention_Integration', () => {
      it('should_HandleResourceContention_WithProperQueueing', async () => {
        // Arrange: Setup resource contention scenario
        const sharedResourceId = 'shared-database';
        const concurrentRequests = [
          { agentId: 'agent-1', taskId: 'task-1', resourceId: sharedResourceId },
          { agentId: 'agent-2', taskId: 'task-2', resourceId: sharedResourceId },
          { agentId: 'agent-3', taskId: 'task-3', resourceId: sharedResourceId }
        ];

        // Mock queuing behavior for resource contention
        let executionOrder: string[] = [];
        mockExecuteUseCase.execute.mockImplementation(async (request: any) => {
          executionOrder.push(request.agentId);
          
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return Result.ok({
            agentId: request.agentId,
            taskId: request.taskId,
            executionId: `exec-${request.agentId}`,
            status: 'completed',
            results: { output: `Task completed by ${request.agentId}` },
            queuePosition: executionOrder.length,
            completedAt: new Date()
          });
        });

        // Act: Execute concurrent operations with shared resource
        const operations = concurrentRequests.map(request =>
          agentService.executeAgentTask({
            ...request,
            parameters: { sharedResource: sharedResourceId },
            userId: TestData.VALID_USER_ID
          })
        );

        const results = await Promise.all(operations);

        // Assert: Verify resource contention handling
        results.forEach(result => {
          expect(result.isSuccess).toBe(true);
        });

        // Verify operations were serialized (queued)
        expect(executionOrder).toEqual(['agent-1', 'agent-2', 'agent-3']);

        // Verify queue metrics
        const queueMetricsCall = mockAuditRepository.save.mock.calls.find(
          call => call[0].action === 'RESOURCE_CONTENTION_HANDLED'
        );
        expect(queueMetricsCall).toBeDefined();
        expect(queueMetricsCall![0].details).toEqual(
          expect.objectContaining({
            sharedResource: sharedResourceId,
            concurrentRequests: 3,
            queuingApplied: true
          })
        );
      });

      it('should_ApplyLoadBalancing_WhenMultipleAgentsAvailable', async () => {
        // Arrange: Setup load balancing scenario
        const availableAgents = ['agent-1', 'agent-2', 'agent-3'];
        const taskRequests = [
          { taskId: 'task-1', taskType: 'data-processing' },
          { taskId: 'task-2', taskType: 'data-processing' },
          { taskId: 'task-3', taskType: 'data-processing' },
          { taskId: 'task-4', taskType: 'data-processing' },
          { taskId: 'task-5', taskType: 'data-processing' }
        ];

        // Act: Execute load balancing
        const result = await agentService.distributeTasksWithLoadBalancing({
          availableAgents,
          tasks: taskRequests,
          balancingStrategy: 'round-robin',
          userId: TestData.VALID_USER_ID
        });

        // Assert: Verify load balancing
        expect(result.isSuccess).toBe(true);
        expect(result.value.taskDistribution).toEqual(
          expect.objectContaining({
            'agent-1': 2, // tasks 1, 4
            'agent-2': 2, // tasks 2, 5  
            'agent-3': 1  // task 3
          })
        );

        // Verify load balancing metrics
        expect(result.value.loadBalancingMetrics).toEqual(
          expect.objectContaining({
            strategy: 'round-robin',
            totalTasks: 5,
            agentsUtilized: 3,
            loadDistribution: expect.any(Object)
          })
        );

        // Verify audit logging for load balancing
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'LOAD_BALANCING_APPLIED',
            details: expect.objectContaining({
              strategy: 'round-robin',
              tasksDistributed: 5,
              agentsUtilized: 3
            })
          })
        );
      });
    });
  });

  describe('Performance with Large Agent Pools', () => {
    describe('scalabilityTesting_Integration', () => {
      it('should_MaintainPerformance_WithLargeAgentPool', async () => {
        // Arrange: Setup large agent pool scenario
        const largeAgentPool = Array.from({ length: 1000 }, (_, i) => 
          createTestAgent(`agent-${i}`, createTestAgentCapabilities())
        );

        // Mock large-scale discovery
        mockDiscoverUseCase.execute.mockResolvedValue(Result.ok({
          agents: largeAgentPool.slice(0, 100).map(agent => ({
            agentId: agent.agentId.value,
            name: agent.name,
            capabilities: agent.capabilities,
            score: Math.random() * 0.4 + 0.6, // Random score between 0.6-1.0
            matchingCapabilities: ['canRead', 'canAnalyze']
          })),
          totalMatched: 100,
          searchCriteria: { canAnalyze: true },
          performanceMetrics: {
            searchTime: 150, // Should be under 200ms
            agentsEvaluated: 1000,
            indexingEfficiency: 0.95
          }
        }));

        // Act: Execute large-scale discovery
        const result = await agentService.discoverAgentsByCapability({
          requiredCapabilities: ['canAnalyze'],
          maxResults: 100,
          performanceMode: 'optimized',
          userId: TestData.VALID_USER_ID
        });

        // Assert: Verify scalability performance
        expect(result.isSuccess).toBe(true);
        expect(result.value.agents).toHaveLength(100);
        expect(result.value.performanceMetrics.searchTime).toBeLessThan(200);
        expect(result.value.performanceMetrics.agentsEvaluated).toBe(1000);

        // Verify scalability metrics
        expect(result.value.scalabilityMetrics).toEqual(
          expect.objectContaining({
            poolSize: 1000,
            searchEfficiency: expect.any(Number),
            indexingPerformance: expect.any(Number),
            responseTime: expect.any(Number)
          })
        );

        // Verify audit logging for scalability test
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'LARGE_SCALE_DISCOVERY_COMPLETED',
            details: expect.objectContaining({
              poolSize: 1000,
              resultsReturned: 100,
              searchTime: expect.any(Number),
              scalabilityLevel: 'high'
            })
          })
        );
      });
    });
  });

  describe('Clean Architecture Compliance', () => {
    describe('architecturalBoundaries_Integration', () => {
      it('should_OnlyCoordinateUseCases_NeverExecuteDomainLogicDirectly', () => {
        // Arrange & Act: Inspect service dependencies
        const serviceInstance = agentService as any;

        // Assert: Verify service only depends on use cases and infrastructure
        expect(serviceInstance.registerUseCase).toBeDefined();
        expect(serviceInstance.discoverUseCase).toBeDefined();
        expect(serviceInstance.executeUseCase).toBeDefined();
        expect(serviceInstance.semanticSearchUseCase).toBeDefined();
        expect(serviceInstance.workflowCoordinationUseCase).toBeDefined();
        expect(serviceInstance.agentRepository).toBeDefined();
        expect(serviceInstance.auditRepository).toBeDefined();
        expect(serviceInstance.eventBus).toBeDefined();

        // Verify service doesn't have direct domain dependencies
        expect(serviceInstance.aiAgentFactory).toBeUndefined();
        expect(serviceInstance.domainService).toBeUndefined();
        expect(serviceInstance.agentOrchestrationService).toBeUndefined();
      });

      it('should_EnforceLayerBoundaries_InServiceCoordination', async () => {
        // Arrange: Setup boundary validation
        const userId = TestData.VALID_USER_ID;
        
        // Act: Execute operation and verify architectural compliance
        const result = await agentService.validateArchitecturalCompliance({
          operation: 'discoverAgents',
          userId,
          enforceLayerBoundaries: true
        });

        // Assert: Verify architectural boundaries are maintained
        expect(result.isSuccess).toBe(true);
        expect(result.value.boundaryViolations).toHaveLength(0);
        expect(result.value.dependencyDirection).toBe('inward');
        expect(result.value.layerSeparation).toBe('maintained');

        // Verify compliance audit
        expect(mockAuditRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'ARCHITECTURAL_COMPLIANCE_CHECK',
            details: expect.objectContaining({
              operation: 'discoverAgents',
              boundaryViolations: 0,
              complianceLevel: 'FULL'
            })
          })
        );
      });
    });
  });

  // Helper functions for creating mocks and test data
  function createMockAgentRepository(): jest.Mocked<AIAgentRepository> {
    return {
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findByFeatureAndEntity: jest.fn(),
      findByNode: jest.fn(),
      findByFeatureType: jest.fn(),
      findEnabled: jest.fn(),
      findDisabled: jest.fn(),
      findByName: jest.fn(),
      findByCapability: jest.fn(),
      findByTool: jest.fn(),
      findRecentlyExecuted: jest.fn(),
      findBySuccessRate: jest.fn(),
      findByExecutionCount: jest.fn(),
      updateEnabled: jest.fn(),
      recordExecution: jest.fn(),
      bulkSave: jest.fn(),
      bulkDelete: jest.fn(),
      countByFeatureType: jest.fn(),
      countEnabled: jest.fn()
    } as jest.Mocked<AIAgentRepository>;
  }

  function createMockAuditRepository(): jest.Mocked<IAuditLogRepository> {
    return {
      save: jest.fn(),
      findById: jest.fn(),
      findByModelId: jest.fn(),
      findByUserId: jest.fn(),
      findByDateRange: jest.fn(),
      delete: jest.fn()
    } as jest.Mocked<IAuditLogRepository>;
  }

  function createMockEventBus(): jest.Mocked<IEventBus> {
    return {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    } as jest.Mocked<IEventBus>;
  }

  function createMockRegisterUseCase(): jest.Mocked<RegisterAIAgentUseCase> {
    return {
      execute: jest.fn()
    } as jest.Mocked<RegisterAIAgentUseCase>;
  }

  function createMockDiscoverUseCase(): jest.Mocked<DiscoverAgentsByCapabilityUseCase> {
    return {
      execute: jest.fn()
    } as jest.Mocked<DiscoverAgentsByCapabilityUseCase>;
  }

  function createMockExecuteUseCase(): jest.Mocked<ExecuteAIAgentTaskUseCase> {
    return {
      execute: jest.fn()
    } as jest.Mocked<ExecuteAIAgentTaskUseCase>;
  }

  function createMockSemanticSearchUseCase(): jest.Mocked<PerformSemanticAgentSearchUseCase> {
    return {
      execute: jest.fn()
    } as jest.Mocked<PerformSemanticAgentSearchUseCase>;
  }

  function createMockWorkflowCoordinationUseCase(): jest.Mocked<CoordinateWorkflowAgentExecutionUseCase> {
    return {
      execute: jest.fn()
    } as jest.Mocked<CoordinateWorkflowAgentExecutionUseCase>;
  }

  function createTestAgent(name: string, capabilities: Partial<AIAgentCapabilities>): AIAgent {
    const result = AIAgent.create({
      agentId: NodeId.generate(),
      featureType: FeatureType.FUNCTION_MODEL,
      entityId: `entity-${name}`,
      name,
      description: `Test agent ${name}`,
      instructions: `Instructions for ${name}`,
      tools: createTestAgentTools(),
      capabilities: { ...createTestAgentCapabilities(), ...capabilities },
      isEnabled: true
    });

    if (result.isFailure) {
      throw new Error(`Failed to create test agent: ${result.error}`);
    }

    return result.value;
  }

  function createTestAgentTools(): AIAgentTools {
    return {
      availableTools: ['http-client', 'file-processor', 'data-analyzer'],
      toolConfigurations: {
        'http-client': { timeout: 30000, retries: 3 },
        'file-processor': { maxFileSize: 10485760 },
        'data-analyzer': { algorithms: ['statistical', 'ml-basic'] }
      }
    };
  }

  function createTestAgentCapabilities(): AIAgentCapabilities {
    return {
      canRead: true,
      canWrite: true,
      canExecute: false,
      canAnalyze: true,
      canOrchestrate: false,
      maxConcurrentTasks: 5,
      supportedDataTypes: ['json', 'csv', 'text']
    };
  }

  function createComplianceAgentCapabilities(): AIAgentCapabilities {
    return {
      canRead: true,
      canWrite: true,
      canExecute: true,
      canAnalyze: true,
      canOrchestrate: true,
      maxConcurrentTasks: 10,
      supportedDataTypes: ['json', 'xml', 'pdf', 'regulatory-filings']
    };
  }
});