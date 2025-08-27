/**
 * Comprehensive TDD Test Suite for AI Agent Orchestration Use Cases UC-017 through UC-021
 * 
 * This test suite validates the ManageAiAgentOrchestrationUseCase implementation,
 * ensuring compliance with Clean Architecture principles and the Result pattern.
 * Each test acts as both a specification and boundary filter for the use case layer.
 * 
 * Test Coverage:
 * - UC-017: Register AI Agent
 * - UC-018: Discover Agents by Capability 
 * - UC-019: Execute AI Agent Task
 * - UC-020: Perform Semantic Agent Search
 * - UC-021: Coordinate Workflow Agent Execution
 */

import { NodeId } from '@/lib/domain/value-objects/node-id';
import { Position } from '@/lib/domain/value-objects/position';
import { AIAgent, AIAgentCapabilities, AIAgentTools } from '@/lib/domain/entities/ai-agent';
import { NodeMetadata } from '@/lib/domain/entities/node-metadata';
import { FeatureType } from '@/lib/domain/enums';
import { 
  AIAgentOrchestrationService,
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentCapabilityMatch,
  AgentPerformanceMetrics
} from '@/lib/domain/services/ai-agent-orchestration-service';
import { NodeContextAccessService } from '@/lib/domain/services/node-context-access-service';
import { 
  ManageAiAgentOrchestrationUseCase,
  RegisterAgentRequest,
  DiscoverAgentsRequest,
  SemanticSearchRequest,
  WorkflowExecutionRequest
} from '@/lib/use-cases/function-model/manage-ai-agent-orchestration-use-case';
import { Result } from '@/lib/domain/shared/result';
import { getTestUUID } from '@/tests/utils/test-fixtures';

describe('ManageAiAgentOrchestrationUseCase', () => {
  let useCase: ManageAiAgentOrchestrationUseCase;
  let mockOrchestrationService: jest.Mocked<AIAgentOrchestrationService>;
  let mockContextAccessService: jest.Mocked<NodeContextAccessService>;

  // Test fixtures
  const testAgentId = NodeId.create(getTestUUID('test-agent')).value;
  const testNodeId = NodeId.create(getTestUUID('test-node')).value;
  const testMetadataId = NodeId.create(getTestUUID('test-metadata')).value;
  const testPosition = Position.create(100, 200).value;

  const validAgentCapabilities: AIAgentCapabilities = {
    canRead: true,
    canWrite: true,
    canExecute: true,
    canAnalyze: false,
    canOrchestrate: false,
    maxConcurrentTasks: 3,
    supportedDataTypes: ['text', 'json']
  };

  const validAgentTools: AIAgentTools = {
    availableTools: ['file-reader', 'data-processor', 'api-client'],
    toolConfigurations: {
      'file-reader': { maxFileSize: '10MB' },
      'data-processor': { timeout: 30000 },
      'api-client': { retries: 3 }
    },
    customTools: {
      'custom-analyzer': { version: '1.0.0' }
    }
  };

  const validRegisterRequest: RegisterAgentRequest = {
    agentId: testAgentId,
    featureType: FeatureType.FUNCTION_MODEL,
    entityId: 'test-entity-123',
    nodeId: testNodeId,
    name: 'Test Analytics Agent',
    description: 'An agent for data analysis tasks',
    instructions: 'Analyze data files and generate insights using available tools.',
    tools: validAgentTools,
    capabilities: validAgentCapabilities,
    isEnabled: true
  };

  beforeEach(() => {
    // Create mocked services with default return values
    mockOrchestrationService = {
      registerAgent: jest.fn().mockReturnValue(Result.ok<void>(undefined)),
      registerNodeMetadata: jest.fn().mockReturnValue(Result.ok<void>(undefined)),
      discoverAgents: jest.fn().mockReturnValue(Result.ok<AgentCapabilityMatch[]>([])),
      executeTask: jest.fn().mockResolvedValue(Result.ok<string>('mock-execution-id')),
      getExecutionResult: jest.fn().mockReturnValue(Result.fail<AgentExecutionResult>('Not found')),
      getAgentMetrics: jest.fn().mockReturnValue(Result.fail<AgentPerformanceMetrics>('Not found')),
      handleAgentFailure: jest.fn().mockResolvedValue(Result.ok<void>(undefined)),
      performSemanticAgentSearch: jest.fn().mockReturnValue(Result.ok<AgentCapabilityMatch[]>([])),
      coordinateWorkflowExecution: jest.fn().mockResolvedValue(Result.ok<AgentExecutionResult[]>([]))
    } as any;

    mockContextAccessService = {
      getNodeContext: jest.fn(),
      requestContextAccess: jest.fn(),
      validateContextAccess: jest.fn()
    } as any;

    // Initialize use case with mocked dependencies
    useCase = new ManageAiAgentOrchestrationUseCase(
      mockOrchestrationService,
      mockContextAccessService
    );
  });

  describe('UC-017: Register AI Agent', () => {
    describe('registerAgent_ValidRequest_ReturnsAgentId', () => {
      it('should successfully register agent when all parameters are valid', async () => {
        // Arrange
        mockOrchestrationService.registerAgent.mockReturnValue(Result.ok<void>(undefined));

        // Act
        const result = await useCase.registerAgent(validRegisterRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(testAgentId);
        expect(mockOrchestrationService.registerAgent).toHaveBeenCalledTimes(1);
        
        // Verify agent was created with correct properties
        const registerCall = mockOrchestrationService.registerAgent.mock.calls[0][0] as AIAgent;
        expect(registerCall.agentId.equals(testAgentId)).toBe(true);
        expect(registerCall.featureType).toBe(FeatureType.FUNCTION_MODEL);
        expect(registerCall.entityId).toBe('test-entity-123');
        expect(registerCall.name).toBe('Test Analytics Agent');
        expect(registerCall.isEnabled).toBe(true);
        expect(registerCall.tools.availableTools).toEqual(['file-reader', 'data-processor', 'api-client']);
      });

      it('should initialize agent performance metrics during registration', async () => {
        // Arrange
        mockOrchestrationService.registerAgent.mockReturnValue(Result.ok<void>(undefined));

        // Act
        const result = await useCase.registerAgent(validRegisterRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        const registeredAgent = mockOrchestrationService.registerAgent.mock.calls[0][0] as AIAgent;
        expect(registeredAgent.executionCount).toBe(0);
        expect(registeredAgent.successCount).toBe(0);
        expect(registeredAgent.failureCount).toBe(0);
      });

      it('should register agent without nodeId for feature-level agents', async () => {
        // Arrange
        const featureLevelRequest = {
          ...validRegisterRequest,
          nodeId: undefined
        };
        mockOrchestrationService.registerAgent.mockReturnValue(Result.ok<void>(undefined));

        // Act
        const result = await useCase.registerAgent(featureLevelRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        const registeredAgent = mockOrchestrationService.registerAgent.mock.calls[0][0] as AIAgent;
        expect(registeredAgent.nodeId).toBeUndefined();
        expect(registeredAgent.isFeatureLevel()).toBe(true);
      });
    });

    describe('registerAgent_InvalidRequest_ReturnsFailure', () => {
      it('should fail when agent name is empty', async () => {
        // Arrange
        const invalidRequest = {
          ...validRegisterRequest,
          name: ''
        };

        // Act
        const result = await useCase.registerAgent(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Agent name is required');
        expect(mockOrchestrationService.registerAgent).not.toHaveBeenCalled();
      });

      it('should fail when agent instructions are empty', async () => {
        // Arrange
        const invalidRequest = {
          ...validRegisterRequest,
          instructions: '   '
        };

        // Act
        const result = await useCase.registerAgent(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Agent instructions are required');
        expect(mockOrchestrationService.registerAgent).not.toHaveBeenCalled();
      });

      it('should fail when agent has no available tools', async () => {
        // Arrange
        const invalidRequest = {
          ...validRegisterRequest,
          tools: {
            ...validAgentTools,
            availableTools: []
          }
        };

        // Act
        const result = await useCase.registerAgent(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Agent must have at least one available tool');
        expect(mockOrchestrationService.registerAgent).not.toHaveBeenCalled();
      });

      it('should fail when agent entity creation fails due to invalid entity ID', async () => {
        // Arrange - use an empty entity ID which should fail validation
        const invalidRequest = {
          ...validRegisterRequest,
          entityId: '' // Invalid - empty string
        };

        // Act
        const result = await useCase.registerAgent(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Failed to create agent');
        expect(mockOrchestrationService.registerAgent).not.toHaveBeenCalled();
      });

      it('should fail when orchestration service registration fails', async () => {
        // Arrange
        mockOrchestrationService.registerAgent.mockReturnValue(
          Result.fail<void>('Agent ID already exists')
        );

        // Act
        const result = await useCase.registerAgent(validRegisterRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Failed to register agent: Agent ID already exists');
      });
    });
  });

  describe('UC-018: Discover Agents by Capability', () => {
    describe('discoverAgentsByCapability_ValidRequest_ReturnsMatches', () => {
      it('should discover agents with matching capabilities sorted by score', async () => {
        // Arrange
        const discoverRequest: DiscoverAgentsRequest = {
          requiredCapabilities: ['file-reader', 'data-processor'],
          featureType: FeatureType.FUNCTION_MODEL,
          entityId: 'test-entity-123',
          contextKeywords: ['analysis', 'data']
        };

        const expectedMatches: AgentCapabilityMatch[] = [
          {
            agentId: testAgentId,
            matchScore: 0.85,
            availableCapabilities: ['file-reader', 'data-processor', 'api-client'],
            missingCapabilities: [],
            currentLoad: 0.2
          },
          {
            agentId: NodeId.create(getTestUUID('agent-2')).value,
            matchScore: 0.65,
            availableCapabilities: ['file-reader', 'text-processor'],
            missingCapabilities: ['data-processor'],
            currentLoad: 0.1
          }
        ];

        mockOrchestrationService.discoverAgents.mockReturnValue(
          Result.ok<AgentCapabilityMatch[]>(expectedMatches)
        );

        // Act
        const result = await useCase.discoverAgentsByCapability(discoverRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(2);
        expect(result.value[0].matchScore).toBeGreaterThan(result.value[1].matchScore);
        expect(result.value[0].missingCapabilities).toHaveLength(0);
        expect(result.value[1].missingCapabilities).toContain('data-processor');

        expect(mockOrchestrationService.discoverAgents).toHaveBeenCalledWith(
          ['file-reader', 'data-processor'],
          FeatureType.FUNCTION_MODEL,
          'test-entity-123',
          undefined,
          ['analysis', 'data']
        );
      });

      it('should filter out agents with low match scores', async () => {
        // Arrange
        const discoverRequest: DiscoverAgentsRequest = {
          requiredCapabilities: ['specialized-tool'],
          featureType: FeatureType.FUNCTION_MODEL
        };

        const allMatches: AgentCapabilityMatch[] = [
          {
            agentId: testAgentId,
            matchScore: 0.8,
            availableCapabilities: ['specialized-tool'],
            missingCapabilities: [],
            currentLoad: 0.0
          },
          {
            agentId: NodeId.create(getTestUUID('low-score-agent')).value,
            matchScore: 0.2, // Below threshold
            availableCapabilities: ['basic-tool'],
            missingCapabilities: ['specialized-tool'],
            currentLoad: 0.0
          }
        ];

        mockOrchestrationService.discoverAgents.mockReturnValue(
          Result.ok<AgentCapabilityMatch[]>(allMatches)
        );

        // Act
        const result = await useCase.discoverAgentsByCapability(discoverRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(1);
        expect(result.value[0].matchScore).toBeGreaterThanOrEqual(0.3);
      });

      it('should discover agents by node-specific filtering', async () => {
        // Arrange
        const discoverRequest: DiscoverAgentsRequest = {
          requiredCapabilities: ['node-specific-tool'],
          nodeId: testNodeId
        };

        const expectedMatches: AgentCapabilityMatch[] = [
          {
            agentId: testAgentId,
            matchScore: 0.9,
            availableCapabilities: ['node-specific-tool'],
            missingCapabilities: [],
            currentLoad: 0.0
          }
        ];

        mockOrchestrationService.discoverAgents.mockReturnValue(
          Result.ok<AgentCapabilityMatch[]>(expectedMatches)
        );

        // Act
        const result = await useCase.discoverAgentsByCapability(discoverRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(1);
        expect(mockOrchestrationService.discoverAgents).toHaveBeenCalledWith(
          ['node-specific-tool'],
          undefined,
          undefined,
          testNodeId,
          undefined
        );
      });
    });

    describe('discoverAgentsByCapability_InvalidRequest_ReturnsFailure', () => {
      it('should fail when no capabilities are specified', async () => {
        // Arrange
        const invalidRequest: DiscoverAgentsRequest = {
          requiredCapabilities: []
        };

        // Act
        const result = await useCase.discoverAgentsByCapability(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('At least one capability requirement must be specified');
        expect(mockOrchestrationService.discoverAgents).not.toHaveBeenCalled();
      });

      it('should fail when orchestration service discovery fails', async () => {
        // Arrange
        const discoverRequest: DiscoverAgentsRequest = {
          requiredCapabilities: ['invalid-capability']
        };

        mockOrchestrationService.discoverAgents.mockReturnValue(
          Result.fail<AgentCapabilityMatch[]>('No agents registered')
        );

        // Act
        const result = await useCase.discoverAgentsByCapability(discoverRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Agent discovery failed: No agents registered');
      });
    });
  });

  describe('UC-019: Execute AI Agent Task', () => {
    describe('executeAgentTask_ValidRequest_ReturnsExecutionId', () => {
      it('should execute task and return execution request ID', async () => {
        // Arrange
        const executionRequest: AgentExecutionRequest = {
          agentId: testAgentId,
          task: 'Analyze the sales data and generate insights',
          context: {
            dataSource: 'sales_q3_2024.csv',
            format: 'csv',
            expectedColumns: ['date', 'amount', 'region']
          },
          priority: 7,
          timeout: 300000,
          requiredCapabilities: ['file-reader', 'data-processor']
        };

        const expectedExecutionId = 'exec_1234567890_abc123def';
        mockOrchestrationService.executeTask.mockResolvedValue(
          Result.ok<string>(expectedExecutionId)
        );

        // Act
        const result = await useCase.executeAgentTask(executionRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBe(expectedExecutionId);
        expect(mockOrchestrationService.executeTask).toHaveBeenCalledWith(executionRequest);
      });

      it('should execute task with minimal required parameters', async () => {
        // Arrange
        const minimalRequest: AgentExecutionRequest = {
          agentId: testAgentId,
          task: 'Simple task execution',
          context: {},
          priority: 5
        };

        const executionId = 'exec_minimal_123';
        mockOrchestrationService.executeTask.mockResolvedValue(
          Result.ok<string>(executionId)
        );

        // Act
        const result = await useCase.executeAgentTask(minimalRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBe(executionId);
      });

      it('should handle queued execution when at capacity', async () => {
        // Arrange
        const executionRequest: AgentExecutionRequest = {
          agentId: testAgentId,
          task: 'Task for queued execution',
          context: {},
          priority: 3
        };

        const queuedExecutionId = 'exec_1234567890_abc123def_queued';
        mockOrchestrationService.executeTask.mockResolvedValue(
          Result.ok<string>(queuedExecutionId)
        );

        // Act
        const result = await useCase.executeAgentTask(executionRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBe(queuedExecutionId);
      });
    });

    describe('executeAgentTask_InvalidRequest_ReturnsFailure', () => {
      it('should fail when task description is empty', async () => {
        // Arrange
        const invalidRequest: AgentExecutionRequest = {
          agentId: testAgentId,
          task: '',
          context: {},
          priority: 5
        };

        // Act
        const result = await useCase.executeAgentTask(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Task description is required');
        expect(mockOrchestrationService.executeTask).not.toHaveBeenCalled();
      });

      it('should fail when agent ID is not provided', async () => {
        // Arrange
        const invalidRequest: AgentExecutionRequest = {
          agentId: null as any,
          task: 'Valid task description',
          context: {},
          priority: 5
        };

        // Act
        const result = await useCase.executeAgentTask(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Agent ID is required');
        expect(mockOrchestrationService.executeTask).not.toHaveBeenCalled();
      });

      it('should fail when priority is out of valid range', async () => {
        // Arrange
        const invalidRequest: AgentExecutionRequest = {
          agentId: testAgentId,
          task: 'Valid task description',
          context: {},
          priority: 15 // Out of range (0-10)
        };

        // Act
        const result = await useCase.executeAgentTask(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Priority must be between 0 and 10');
        expect(mockOrchestrationService.executeTask).not.toHaveBeenCalled();
      });

      it('should fail when orchestration service execution fails', async () => {
        // Arrange
        const executionRequest: AgentExecutionRequest = {
          agentId: testAgentId,
          task: 'Task that will fail',
          context: {},
          priority: 5
        };

        mockOrchestrationService.executeTask.mockResolvedValue(
          Result.fail<string>('No suitable agents found for the task')
        );

        // Act
        const result = await useCase.executeAgentTask(executionRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Task execution failed: No suitable agents found for the task');
      });
    });
  });

  describe('UC-020: Perform Semantic Agent Search', () => {
    describe('performSemanticAgentSearch_ValidQuery_ReturnsRankedResults', () => {
      it('should perform semantic search with natural language query', async () => {
        // Arrange
        const searchRequest: SemanticSearchRequest = {
          query: 'find agents that can analyze financial data and generate reports',
          featureType: FeatureType.FUNCTION_MODEL,
          maxResults: 5
        };

        const expectedResults: AgentCapabilityMatch[] = [
          {
            agentId: testAgentId,
            matchScore: 0.92,
            availableCapabilities: ['data-analysis', 'financial-modeling', 'report-generation'],
            missingCapabilities: [],
            currentLoad: 0.1
          },
          {
            agentId: NodeId.create(getTestUUID('finance-agent')).value,
            matchScore: 0.87,
            availableCapabilities: ['financial-analysis', 'excel-processing'],
            missingCapabilities: ['report-generation'],
            currentLoad: 0.0
          }
        ];

        mockOrchestrationService.performSemanticAgentSearch.mockReturnValue(
          Result.ok<AgentCapabilityMatch[]>(expectedResults)
        );

        // Act
        const result = await useCase.performSemanticAgentSearch(searchRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(2);
        expect(result.value[0].matchScore).toBeGreaterThan(result.value[1].matchScore);
        expect(mockOrchestrationService.performSemanticAgentSearch).toHaveBeenCalledWith(
          'find agents that can analyze financial data and generate reports',
          FeatureType.FUNCTION_MODEL,
          5
        );
      });

      it('should use default max results when not specified', async () => {
        // Arrange
        const searchRequest: SemanticSearchRequest = {
          query: 'data processing agents'
        };

        const expectedResults: AgentCapabilityMatch[] = [];
        mockOrchestrationService.performSemanticAgentSearch.mockReturnValue(
          Result.ok<AgentCapabilityMatch[]>(expectedResults)
        );

        // Act
        const result = await useCase.performSemanticAgentSearch(searchRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockOrchestrationService.performSemanticAgentSearch).toHaveBeenCalledWith(
          'data processing agents',
          undefined,
          10 // Default value
        );
      });

      it('should filter agents by feature type in semantic search', async () => {
        // Arrange
        const searchRequest: SemanticSearchRequest = {
          query: 'workflow automation agents',
          featureType: FeatureType.FUNCTION_MODEL,
          maxResults: 3
        };

        const expectedResults: AgentCapabilityMatch[] = [
          {
            agentId: testAgentId,
            matchScore: 0.78,
            availableCapabilities: ['workflow-engine', 'task-scheduler'],
            missingCapabilities: [],
            currentLoad: 0.3
          }
        ];

        mockOrchestrationService.performSemanticAgentSearch.mockReturnValue(
          Result.ok<AgentCapabilityMatch[]>(expectedResults)
        );

        // Act
        const result = await useCase.performSemanticAgentSearch(searchRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(1);
        expect(mockOrchestrationService.performSemanticAgentSearch).toHaveBeenCalledWith(
          'workflow automation agents',
          FeatureType.FUNCTION_MODEL,
          3
        );
      });
    });

    describe('performSemanticAgentSearch_InvalidQuery_ReturnsFailure', () => {
      it('should fail when search query is empty', async () => {
        // Arrange
        const invalidRequest: SemanticSearchRequest = {
          query: ''
        };

        // Act
        const result = await useCase.performSemanticAgentSearch(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Search query is required');
        expect(mockOrchestrationService.performSemanticAgentSearch).not.toHaveBeenCalled();
      });

      it('should fail when query is too short', async () => {
        // Arrange
        const invalidRequest: SemanticSearchRequest = {
          query: 'ai'
        };

        // Act
        const result = await useCase.performSemanticAgentSearch(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Search query must be at least 3 characters long');
        expect(mockOrchestrationService.performSemanticAgentSearch).not.toHaveBeenCalled();
      });

      it('should fail when max results is out of range', async () => {
        // Arrange
        const invalidRequest: SemanticSearchRequest = {
          query: 'valid query',
          maxResults: 100 // Out of range (1-50)
        };

        // Act
        const result = await useCase.performSemanticAgentSearch(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Max results must be between 1 and 50');
        expect(mockOrchestrationService.performSemanticAgentSearch).not.toHaveBeenCalled();
      });

      it('should fail when orchestration service search fails', async () => {
        // Arrange
        const searchRequest: SemanticSearchRequest = {
          query: 'valid search query'
        };

        mockOrchestrationService.performSemanticAgentSearch.mockReturnValue(
          Result.fail<AgentCapabilityMatch[]>('Semantic search service unavailable')
        );

        // Act
        const result = await useCase.performSemanticAgentSearch(searchRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Semantic search failed: Semantic search service unavailable');
      });
    });
  });

  describe('UC-021: Coordinate Workflow Agent Execution', () => {
    describe('coordinateWorkflowExecution_ValidRequest_ReturnsAggregatedResults', () => {
      it('should execute sequential workflow and aggregate results', async () => {
        // Arrange
        const workflowTasks: AgentExecutionRequest[] = [
          {
            agentId: testAgentId,
            task: 'Parse input data',
            context: { input: 'data.csv' },
            priority: 8
          },
          {
            agentId: NodeId.create(getTestUUID('agent-2')).value,
            task: 'Analyze parsed data',
            context: { format: 'json' },
            priority: 7
          },
          {
            agentId: NodeId.create(getTestUUID('agent-3')).value,
            task: 'Generate final report',
            context: { template: 'report.html' },
            priority: 6
          }
        ];

        const workflowRequest: WorkflowExecutionRequest = {
          tasks: workflowTasks,
          executionMode: 'sequential'
        };

        const expectedResults: AgentExecutionResult[] = [
          {
            requestId: 'exec_1_123',
            agentId: testAgentId,
            success: true,
            output: { parsedRows: 1000 },
            executionTime: 2000,
            capabilitiesUsed: ['file-reader'],
            contextAccessed: ['input'],
            timestamp: new Date()
          },
          {
            requestId: 'exec_2_124',
            agentId: NodeId.create(getTestUUID('agent-2')).value,
            success: true,
            output: { insights: ['trend1', 'trend2'] },
            executionTime: 3500,
            capabilitiesUsed: ['data-analyzer'],
            contextAccessed: ['format'],
            timestamp: new Date()
          },
          {
            requestId: 'exec_3_125',
            agentId: NodeId.create(getTestUUID('agent-3')).value,
            success: true,
            output: { reportPath: '/reports/analysis_2024.html' },
            executionTime: 1500,
            capabilitiesUsed: ['report-generator'],
            contextAccessed: ['template'],
            timestamp: new Date()
          }
        ];

        mockOrchestrationService.coordinateWorkflowExecution.mockResolvedValue(
          Result.ok<AgentExecutionResult[]>(expectedResults)
        );

        // Act
        const result = await useCase.coordinateWorkflowExecution(workflowRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(3);
        expect(result.value.every(r => r.success)).toBe(true);
        expect(mockOrchestrationService.coordinateWorkflowExecution).toHaveBeenCalledWith(
          workflowTasks,
          'sequential'
        );
      });

      it('should execute parallel workflow and aggregate results', async () => {
        // Arrange
        const parallelTasks: AgentExecutionRequest[] = [
          {
            agentId: testAgentId,
            task: 'Process dataset A',
            context: { dataset: 'A' },
            priority: 5
          },
          {
            agentId: NodeId.create(getTestUUID('agent-2')).value,
            task: 'Process dataset B',
            context: { dataset: 'B' },
            priority: 5
          }
        ];

        const workflowRequest: WorkflowExecutionRequest = {
          tasks: parallelTasks,
          executionMode: 'parallel'
        };

        const expectedResults: AgentExecutionResult[] = [
          {
            requestId: 'exec_parallel_1',
            agentId: testAgentId,
            success: true,
            output: { processedA: true },
            executionTime: 4000,
            capabilitiesUsed: ['data-processor'],
            contextAccessed: ['dataset'],
            timestamp: new Date()
          },
          {
            requestId: 'exec_parallel_2',
            agentId: NodeId.create(getTestUUID('agent-2')).value,
            success: true,
            output: { processedB: true },
            executionTime: 3800,
            capabilitiesUsed: ['data-processor'],
            contextAccessed: ['dataset'],
            timestamp: new Date()
          }
        ];

        mockOrchestrationService.coordinateWorkflowExecution.mockResolvedValue(
          Result.ok<AgentExecutionResult[]>(expectedResults)
        );

        // Act
        const result = await useCase.coordinateWorkflowExecution(workflowRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(2);
        expect(result.value.every(r => r.success)).toBe(true);
        expect(mockOrchestrationService.coordinateWorkflowExecution).toHaveBeenCalledWith(
          parallelTasks,
          'parallel'
        );
      });

      it('should handle workflow with mixed success and failure results', async () => {
        // Arrange
        const workflowTasks: AgentExecutionRequest[] = [
          {
            agentId: testAgentId,
            task: 'Successful task',
            context: {},
            priority: 5
          },
          {
            agentId: NodeId.create(getTestUUID('failing-agent')).value,
            task: 'Task that will fail',
            context: {},
            priority: 5
          }
        ];

        const workflowRequest: WorkflowExecutionRequest = {
          tasks: workflowTasks,
          executionMode: 'sequential'
        };

        const mixedResults: AgentExecutionResult[] = [
          {
            requestId: 'exec_success_1',
            agentId: testAgentId,
            success: true,
            output: { result: 'completed' },
            executionTime: 1000,
            capabilitiesUsed: ['basic-tool'],
            contextAccessed: [],
            timestamp: new Date()
          },
          {
            requestId: 'exec_fail_2',
            agentId: NodeId.create(getTestUUID('failing-agent')).value,
            success: false,
            error: 'Agent execution timeout',
            executionTime: 30000,
            capabilitiesUsed: [],
            contextAccessed: [],
            timestamp: new Date()
          }
        ];

        mockOrchestrationService.coordinateWorkflowExecution.mockResolvedValue(
          Result.ok<AgentExecutionResult[]>(mixedResults)
        );

        // Act
        const result = await useCase.coordinateWorkflowExecution(workflowRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(2);
        expect(result.value[0].success).toBe(true);
        expect(result.value[1].success).toBe(false);
        expect(result.value[1].error).toBe('Agent execution timeout');
      });
    });

    describe('coordinateWorkflowExecution_InvalidRequest_ReturnsFailure', () => {
      it('should fail when workflow has no tasks', async () => {
        // Arrange
        const invalidRequest: WorkflowExecutionRequest = {
          tasks: [],
          executionMode: 'sequential'
        };

        // Act
        const result = await useCase.coordinateWorkflowExecution(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Workflow must contain at least one task');
        expect(mockOrchestrationService.coordinateWorkflowExecution).not.toHaveBeenCalled();
      });

      it('should fail when workflow exceeds maximum tasks', async () => {
        // Arrange
        const tooManyTasks = Array.from({ length: 25 }, (_, i) => ({
          agentId: NodeId.create(getTestUUID(`agent-${i}`)).value,
          task: `Task ${i}`,
          context: {},
          priority: 5
        }));

        const invalidRequest: WorkflowExecutionRequest = {
          tasks: tooManyTasks,
          executionMode: 'parallel'
        };

        // Act
        const result = await useCase.coordinateWorkflowExecution(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Workflow cannot exceed 20 tasks');
        expect(mockOrchestrationService.coordinateWorkflowExecution).not.toHaveBeenCalled();
      });

      it('should fail when execution mode is invalid', async () => {
        // Arrange
        const invalidRequest: WorkflowExecutionRequest = {
          tasks: [
            {
              agentId: testAgentId,
              task: 'Valid task',
              context: {},
              priority: 5
            }
          ],
          executionMode: 'invalid-mode' as any
        };

        // Act
        const result = await useCase.coordinateWorkflowExecution(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Execution mode must be either "sequential" or "parallel"');
        expect(mockOrchestrationService.coordinateWorkflowExecution).not.toHaveBeenCalled();
      });

      it('should fail when task has empty description', async () => {
        // Arrange
        const invalidRequest: WorkflowExecutionRequest = {
          tasks: [
            {
              agentId: testAgentId,
              task: '',
              context: {},
              priority: 5
            }
          ],
          executionMode: 'sequential'
        };

        // Act
        const result = await useCase.coordinateWorkflowExecution(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Task 1 description is required');
        expect(mockOrchestrationService.coordinateWorkflowExecution).not.toHaveBeenCalled();
      });

      it('should fail when task has no agent ID', async () => {
        // Arrange
        const invalidRequest: WorkflowExecutionRequest = {
          tasks: [
            {
              agentId: null as any,
              task: 'Valid task description',
              context: {},
              priority: 5
            }
          ],
          executionMode: 'sequential'
        };

        // Act
        const result = await useCase.coordinateWorkflowExecution(invalidRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Task 1 agent ID is required');
        expect(mockOrchestrationService.coordinateWorkflowExecution).not.toHaveBeenCalled();
      });

      it('should fail when result count does not match task count', async () => {
        // Arrange
        const workflowTasks: AgentExecutionRequest[] = [
          {
            agentId: testAgentId,
            task: 'Task 1',
            context: {},
            priority: 5
          },
          {
            agentId: NodeId.create(getTestUUID('agent-2')).value,
            task: 'Task 2',
            context: {},
            priority: 5
          }
        ];

        const workflowRequest: WorkflowExecutionRequest = {
          tasks: workflowTasks,
          executionMode: 'sequential'
        };

        // Return only one result for two tasks
        const incompleteResults: AgentExecutionResult[] = [
          {
            requestId: 'exec_1_123',
            agentId: testAgentId,
            success: true,
            output: {},
            executionTime: 1000,
            capabilitiesUsed: [],
            contextAccessed: [],
            timestamp: new Date()
          }
        ];

        mockOrchestrationService.coordinateWorkflowExecution.mockResolvedValue(
          Result.ok<AgentExecutionResult[]>(incompleteResults)
        );

        // Act
        const result = await useCase.coordinateWorkflowExecution(workflowRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Expected 2 results, but got 1');
      });

      it('should fail when orchestration service coordination fails', async () => {
        // Arrange
        const workflowRequest: WorkflowExecutionRequest = {
          tasks: [
            {
              agentId: testAgentId,
              task: 'Task that will fail coordination',
              context: {},
              priority: 5
            }
          ],
          executionMode: 'sequential'
        };

        mockOrchestrationService.coordinateWorkflowExecution.mockResolvedValue(
          Result.fail<AgentExecutionResult[]>('Agent capacity exceeded')
        );

        // Act
        const result = await useCase.coordinateWorkflowExecution(workflowRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Workflow coordination failed: Agent capacity exceeded');
      });
    });
  });

  describe('Complex Orchestration Scenarios', () => {
    describe('multiAgentWorkflow_ComplexScenario_HandlesAllCases', () => {
      it('should handle complete multi-agent orchestration lifecycle', async () => {
        // Arrange - Register multiple agents
        const agents = [
          { ...validRegisterRequest, agentId: NodeId.create(getTestUUID('data-agent')).value },
          { 
            ...validRegisterRequest, 
            agentId: NodeId.create(getTestUUID('analysis-agent')).value,
            name: 'Analysis Agent',
            tools: {
              availableTools: ['statistical-analyzer', 'ml-predictor'],
              toolConfigurations: {},
              customTools: {}
            }
          },
          { 
            ...validRegisterRequest, 
            agentId: NodeId.create(getTestUUID('report-agent')).value,
            name: 'Report Agent',
            tools: {
              availableTools: ['report-generator', 'chart-creator'],
              toolConfigurations: {},
              customTools: {}
            }
          }
        ];

        // Mock successful agent registration
        mockOrchestrationService.registerAgent.mockReturnValue(Result.ok<void>(undefined));

        // Register all agents
        const registrationResults = await Promise.all(
          agents.map(agent => useCase.registerAgent(agent))
        );
        
        expect(registrationResults.every(r => r.isSuccess)).toBe(true);

        // Mock agent discovery
        const discoveredAgents: AgentCapabilityMatch[] = agents.map((agent, index) => ({
          agentId: agent.agentId,
          matchScore: 0.9 - (index * 0.1),
          availableCapabilities: agent.tools.availableTools,
          missingCapabilities: [],
          currentLoad: 0.1
        }));

        mockOrchestrationService.discoverAgents.mockReturnValue(
          Result.ok<AgentCapabilityMatch[]>(discoveredAgents)
        );

        // Discover agents
        const discoveryResult = await useCase.discoverAgentsByCapability({
          requiredCapabilities: ['file-reader', 'data-processor']
        });
        
        expect(discoveryResult.isSuccess).toBe(true);
        expect(discoveryResult.value).toHaveLength(3);

        // Mock semantic search
        mockOrchestrationService.performSemanticAgentSearch.mockReturnValue(
          Result.ok<AgentCapabilityMatch[]>(discoveredAgents.slice(0, 2))
        );

        // Perform semantic search
        const searchResult = await useCase.performSemanticAgentSearch({
          query: 'find agents for data analysis and reporting'
        });
        
        expect(searchResult.isSuccess).toBe(true);
        expect(searchResult.value).toHaveLength(2);

        // Mock workflow execution
        const workflowResults: AgentExecutionResult[] = agents.map((agent, index) => ({
          requestId: `exec_workflow_${index}`,
          agentId: agent.agentId,
          success: true,
          output: { step: index + 1, completed: true },
          executionTime: 2000 + (index * 500),
          capabilitiesUsed: agent.tools.availableTools.slice(0, 1),
          contextAccessed: ['input'],
          timestamp: new Date()
        }));

        mockOrchestrationService.coordinateWorkflowExecution.mockResolvedValue(
          Result.ok<AgentExecutionResult[]>(workflowResults)
        );

        // Execute workflow
        const workflowTasks: AgentExecutionRequest[] = agents.map((agent, index) => ({
          agentId: agent.agentId,
          task: `Workflow step ${index + 1}`,
          context: { step: index + 1 },
          priority: 8 - index
        }));

        const workflowResult = await useCase.coordinateWorkflowExecution({
          tasks: workflowTasks,
          executionMode: 'sequential'
        });

        expect(workflowResult.isSuccess).toBe(true);
        expect(workflowResult.value).toHaveLength(3);
        expect(workflowResult.value.every(r => r.success)).toBe(true);

        // Verify all orchestration service methods were called
        expect(mockOrchestrationService.registerAgent).toHaveBeenCalledTimes(3);
        expect(mockOrchestrationService.discoverAgents).toHaveBeenCalledTimes(1);
        expect(mockOrchestrationService.performSemanticAgentSearch).toHaveBeenCalledTimes(1);
        expect(mockOrchestrationService.coordinateWorkflowExecution).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Supporting Operations', () => {
    describe('registerNodeMetadata_ValidMetadata_ReturnsSuccess', () => {
      it('should register node metadata for semantic search', async () => {
        // Arrange
        const metadataResult = NodeMetadata.create({
          metadataId: testMetadataId,
          featureType: FeatureType.FUNCTION_MODEL,
          entityId: 'test-entity-123',
          nodeId: testNodeId,
          nodeType: 'data-processor',
          position: testPosition,
          searchKeywords: ['data', 'analysis', 'processing'],
          semanticTags: ['analytics', 'finance', 'reporting'],
          vectorEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5]
        });

        expect(metadataResult.isSuccess).toBe(true);
        const metadata = metadataResult.value;

        mockOrchestrationService.registerNodeMetadata.mockReturnValue(Result.ok<void>(undefined));

        // Act
        const result = await useCase.registerNodeMetadata(metadata);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(mockOrchestrationService.registerNodeMetadata).toHaveBeenCalledWith(metadata);
      });

      it('should fail when orchestration service metadata registration fails', async () => {
        // Arrange
        const metadataResult = NodeMetadata.create({
          metadataId: testMetadataId,
          featureType: FeatureType.FUNCTION_MODEL,
          entityId: 'test-entity-123',
          nodeId: testNodeId,
          nodeType: 'data-processor',
          position: testPosition,
          searchKeywords: ['data']
        });

        const metadata = metadataResult.value;
        mockOrchestrationService.registerNodeMetadata.mockReturnValue(
          Result.fail<void>('Metadata already exists')
        );

        // Act
        const result = await useCase.registerNodeMetadata(metadata);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Failed to register node metadata: Metadata already exists');
      });
    });

    describe('getExecutionResult_ValidRequestId_ReturnsResult', () => {
      it('should return execution result when request ID is valid', async () => {
        // Arrange
        const requestId = 'exec_1234567890_abc123def';
        const expectedResult: AgentExecutionResult = {
          requestId,
          agentId: testAgentId,
          success: true,
          output: { processed: true },
          executionTime: 2500,
          capabilitiesUsed: ['data-processor'],
          contextAccessed: ['input'],
          timestamp: new Date()
        };

        mockOrchestrationService.getExecutionResult.mockReturnValue(
          Result.ok<AgentExecutionResult>(expectedResult)
        );

        // Act
        const result = await useCase.getExecutionResult(requestId);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(expectedResult);
        expect(mockOrchestrationService.getExecutionResult).toHaveBeenCalledWith(requestId);
      });

      it('should fail when request ID is empty', async () => {
        // Act
        const result = await useCase.getExecutionResult('');

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Request ID is required');
        expect(mockOrchestrationService.getExecutionResult).not.toHaveBeenCalled();
      });
    });

    describe('getAgentPerformanceMetrics_ValidAgentId_ReturnsMetrics', () => {
      it('should return agent performance metrics', async () => {
        // Arrange
        const expectedMetrics: AgentPerformanceMetrics = {
          totalExecutions: 25,
          successfulExecutions: 23,
          failedExecutions: 2,
          averageExecutionTime: 2750,
          averageMatchScore: 0.85,
          lastExecutionTime: new Date(),
          currentLoad: 0.2
        };

        mockOrchestrationService.getAgentMetrics.mockReturnValue(
          Result.ok<AgentPerformanceMetrics>(expectedMetrics)
        );

        // Act
        const result = await useCase.getAgentPerformanceMetrics(testAgentId);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual(expectedMetrics);
        expect(mockOrchestrationService.getAgentMetrics).toHaveBeenCalledWith(testAgentId);
      });
    });
  });
});