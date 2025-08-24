import { 
  AIAgentOrchestrationService, 
  AgentExecutionRequest, 
  AgentExecutionResult, 
  AgentCapabilityMatch,
  AgentPerformanceMetrics 
} from '@/lib/domain/services/ai-agent-orchestration-service';
import { NodeContextAccessService } from '@/lib/domain/services/node-context-access-service';
import { AIAgent } from '@/lib/domain/entities/ai-agent';
import { NodeMetadata } from '@/lib/domain/entities/node-metadata';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { FeatureType } from '@/lib/domain/enums';
import { Result } from '@/lib/domain/shared/result';

// Mock the NodeContextAccessService
class MockNodeContextAccessService {
  public getNodeContext(agentId: NodeId, nodeId: NodeId, accessMode: string): Result<{ contextData: Record<string, any> }> {
    return Result.ok({ contextData: { mockContext: true, nodeId: nodeId.value } });
  }
}

// Helper class for creating test AIAgent instances
class MockAIAgent {
  public static createMock(
    agentId: string,
    nodeId?: NodeId,
    featureType: FeatureType = FeatureType.FUNCTION_MODEL,
    entityId?: string,
    capabilities: string[] = ['basic'],
    isEnabled: boolean = true
  ): AIAgent {
    const id = NodeId.generate();
    
    const agentResult = AIAgent.create({
      agentId: id,
      nodeId,
      featureType,
      entityId: entityId || `entity-${agentId}`,
      name: `Mock Agent ${agentId}`,
      instructions: 'Test agent instructions for capability matching',
      capabilities: {
        canRead: true,
        canWrite: true,
        canExecute: true,
        canAnalyze: capabilities.includes('analysis') || capabilities.includes('nlp'),
        canOrchestrate: capabilities.includes('orchestration'),
        maxConcurrentTasks: 5,
        supportedDataTypes: capabilities
      },
      tools: {
        availableTools: capabilities,
        toolConfigurations: {}
      },
      isEnabled
    });

    if (agentResult.isFailure) {
      throw new Error(`Failed to create mock agent: ${agentResult.error}`);
    }

    return agentResult.value;
  }
}

// Mock NodeMetadata implementation for testing
class MockNodeMetadata extends NodeMetadata {
  public static createMock(
    nodeId: NodeId,
    featureType: FeatureType = FeatureType.FUNCTION_MODEL,
    keywords: string[] = ['test', 'mock'],
    semanticTags?: string[]
  ): MockNodeMetadata {
    return new MockNodeMetadata({
      nodeId,
      featureType,
      entityId: 'test-entity',
      name: 'Mock Node',
      description: 'Test node for semantic search',
      searchKeywords: keywords,
      semanticTags,
      version: 1,
      lastModified: new Date(),
      accessLevel: 'public'
    });
  }
}

describe('AIAgentOrchestrationService', () => {
  let service: AIAgentOrchestrationService;
  let mockContextService: MockNodeContextAccessService;

  beforeEach(() => {
    mockContextService = new MockNodeContextAccessService();
    service = new AIAgentOrchestrationService(mockContextService as any);
  });

  describe('Agent Registration', () => {
    it('should register an agent successfully', () => {
      // Arrange
      const agent = MockAIAgent.createMock('agent1');

      // Act
      const result = service.registerAgent(agent);

      // Assert
      expect(result.isSuccess).toBe(true);
    });

    it('should initialize performance metrics when registering agent', () => {
      // Arrange
      const agent = MockAIAgent.createMock('agent1');
      // Record some executions to create metrics
      agent.recordExecution(true, 100);
      agent.recordExecution(true, 150);
      agent.recordExecution(false, 75);

      // Act
      service.registerAgent(agent);
      const metricsResult = service.getAgentMetrics(agent.agentId);

      // Assert
      expect(metricsResult.isSuccess).toBe(true);
      const metrics = metricsResult.value;
      expect(metrics.totalExecutions).toBe(3);
      expect(metrics.successfulExecutions).toBe(2);
      expect(metrics.failedExecutions).toBe(1);
    });

    it('should register node metadata successfully', () => {
      // Arrange
      const nodeId = NodeId.generate();
      const metadata = MockNodeMetadata.createMock(nodeId);

      // Act
      const result = service.registerNodeMetadata(metadata);

      // Assert
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Agent Discovery', () => {
    beforeEach(() => {
      // Register test agents
      const agent1 = MockAIAgent.createMock('agent1', undefined, FeatureType.FUNCTION_MODEL, 'entity1', ['basic', 'advanced']);
      const agent2 = MockAIAgent.createMock('agent2', undefined, FeatureType.KNOWLEDGE_BASE, 'entity2', ['basic']);
      const agent3 = MockAIAgent.createMock('agent3', undefined, FeatureType.FUNCTION_MODEL, 'entity1', ['specialized'], false);

      service.registerAgent(agent1);
      service.registerAgent(agent2);
      service.registerAgent(agent3);
    });

    it('should discover agents based on required capabilities', () => {
      // Arrange
      const requiredCapabilities = ['basic'];

      // Act
      const result = service.discoverAgents(requiredCapabilities);

      // Assert
      expect(result.isSuccess).toBe(true);
      const matches = result.value;
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every(match => match.missingCapabilities.length === 0)).toBe(true);
    });

    it('should filter agents by feature type', () => {
      // Arrange
      const requiredCapabilities = ['basic'];
      const featureType = FeatureType.KNOWLEDGE_BASE;

      // Act
      const result = service.discoverAgents(requiredCapabilities, featureType);

      // Assert
      expect(result.isSuccess).toBe(true);
      const matches = result.value;
      
      
      expect(matches.length).toBe(1);
    });

    it('should filter agents by entity ID', () => {
      // Arrange
      const requiredCapabilities = ['basic'];
      const entityId = 'entity1';

      // Act
      const result = service.discoverAgents(requiredCapabilities, undefined, entityId);

      // Assert
      expect(result.isSuccess).toBe(true);
      const matches = result.value;
      expect(matches.length).toBe(1);
    });

    it('should exclude disabled agents', () => {
      // Arrange
      const requiredCapabilities = ['specialized'];

      // Act
      const result = service.discoverAgents(requiredCapabilities);

      // Assert
      expect(result.isSuccess).toBe(true);
      const matches = result.value;
      expect(matches.length).toBe(0); // Agent with 'specialized' capability is disabled
    });

    it('should sort matches by score in descending order', () => {
      // Arrange
      const requiredCapabilities = ['basic'];

      // Act
      const result = service.discoverAgents(requiredCapabilities);

      // Assert
      expect(result.isSuccess).toBe(true);
      const matches = result.value;
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i-1].matchScore).toBeGreaterThanOrEqual(matches[i].matchScore);
      }
    });

    it('should calculate capability match scores correctly', () => {
      // Arrange
      const requiredCapabilities = ['basic', 'advanced'];

      // Act
      const result = service.discoverAgents(requiredCapabilities);

      // Assert
      expect(result.isSuccess).toBe(true);
      const matches = result.value;
      const perfectMatch = matches.find(m => m.missingCapabilities.length === 0);
      const partialMatch = matches.find(m => m.missingCapabilities.length > 0);
      
      if (perfectMatch && partialMatch) {
        expect(perfectMatch.matchScore).toBeGreaterThan(partialMatch.matchScore);
      }
    });
  });

  describe('Task Execution', () => {
    let testAgent: AIAgent;

    beforeEach(() => {
      testAgent = MockAIAgent.createMock('test-agent', undefined, FeatureType.FUNCTION_MODEL, 'entity1', ['basic']);
      service.registerAgent(testAgent);
    });

    it('should execute task with suitable agent', async () => {
      // Arrange
      const request: AgentExecutionRequest = {
        agentId: testAgent.agentId,
        task: 'Test task',
        context: { test: true },
        priority: 1,
        requiredCapabilities: ['basic']
      };

      // Act
      const result = await service.executeTask(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeTruthy();
    });

    it('should fail when no suitable agents found', async () => {
      // Arrange
      const request: AgentExecutionRequest = {
        agentId: NodeId.generate(),
        task: 'Test task',
        context: {},
        priority: 1,
        requiredCapabilities: ['non-existent-capability']
      };

      // Act
      const result = await service.executeTask(request);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('No suitable agents found');
    });

    it('should queue tasks when at capacity', async () => {
      // Arrange
      const requests: AgentExecutionRequest[] = Array.from({ length: 15 }, (_, i) => ({
        agentId: testAgent.agentId,
        task: `Task ${i}`,
        context: {},
        priority: 1,
        requiredCapabilities: ['basic']
      }));

      // Act
      const results = await Promise.all(requests.map(req => service.executeTask(req)));

      // Assert
      const queuedResults = results.filter(r => r.isSuccess && r.value.endsWith('_queued'));
      expect(queuedResults.length).toBeGreaterThan(0);
    }, 15000);

    it('should update agent performance metrics after execution', async () => {
      // Arrange
      const request: AgentExecutionRequest = {
        agentId: testAgent.agentId,
        task: 'Test task',
        context: {},
        priority: 1,
        requiredCapabilities: ['basic']
      };

      const metricsBefore = service.getAgentMetrics(testAgent.agentId).value;

      // Act
      await service.executeTask(request);
      
      // Wait for execution to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      const metricsAfter = service.getAgentMetrics(testAgent.agentId).value;
      expect(metricsAfter.totalExecutions).toBeGreaterThan(metricsBefore.totalExecutions);
    });
  });

  describe('Execution Results', () => {
    let testAgent: AIAgent;

    beforeEach(() => {
      testAgent = MockAIAgent.createMock('test-agent', undefined, FeatureType.FUNCTION_MODEL, 'entity1', ['basic']);
      service.registerAgent(testAgent);
    });

    it('should retrieve execution result by request ID', async () => {
      // Arrange
      const request: AgentExecutionRequest = {
        agentId: testAgent.agentId,
        task: 'Test task',
        context: {},
        priority: 1,
        requiredCapabilities: ['basic']
      };

      // Act
      const executionResult = await service.executeTask(request);
      expect(executionResult.isSuccess).toBe(true);

      // Wait for execution to complete
      await new Promise(resolve => setTimeout(resolve, 3500));

      const result = service.getExecutionResult(executionResult.value);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.requestId).toBe(executionResult.value);
    }, 10000);

    it('should return error for non-existent request ID', () => {
      // Arrange
      const nonExistentId = 'non-existent-id';

      // Act
      const result = service.getExecutionResult(nonExistentId);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Execution result not found');
    });

    it('should return completed result for finished request', async () => {
      // Arrange
      const request: AgentExecutionRequest = {
        agentId: testAgent.agentId,
        task: 'Test task',
        context: {},
        priority: 1,
        requiredCapabilities: ['basic']
      };

      // Act
      const executionResult = await service.executeTask(request);
      expect(executionResult.isSuccess).toBe(true);

      // Check result (should be completed since executeTask awaits completion)
      const result = service.getExecutionResult(executionResult.value);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.success).toBe(true);
      expect(result.value.requestId).toBe(executionResult.value);
    });
  });

  describe('Agent Metrics', () => {
    it('should return agent metrics for registered agent', () => {
      // Arrange
      const agent = MockAIAgent.createMock('agent1');
      service.registerAgent(agent);

      // Act
      const result = service.getAgentMetrics(agent.agentId);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('totalExecutions');
      expect(result.value).toHaveProperty('successfulExecutions');
      expect(result.value).toHaveProperty('failedExecutions');
    });

    it('should return error for unregistered agent', () => {
      // Arrange
      const nonExistentAgentId = NodeId.generate();

      // Act
      const result = service.getAgentMetrics(nonExistentAgentId);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Agent metrics not found');
    });
  });

  describe('Agent Failure Handling', () => {
    let testAgent: AIAgent;

    beforeEach(() => {
      testAgent = MockAIAgent.createMock('test-agent');
      service.registerAgent(testAgent);
    });

    it('should handle agent failure with disable action', async () => {
      // Arrange
      const failureReason = 'Test failure';

      // Act
      const result = await service.handleAgentFailure(testAgent.agentId, failureReason, 'disable');

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(testAgent.isEnabled).toBe(false);
    });

    it('should handle agent failure with restart action', async () => {
      // Arrange
      const failureReason = 'Test failure';
      testAgent.disable();

      // Act
      const result = await service.handleAgentFailure(testAgent.agentId, failureReason, 'restart');

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(testAgent.isEnabled).toBe(true);
    });

    it('should handle agent failure with retry action', async () => {
      // Arrange
      const failureReason = 'Test failure';

      // Act
      const result = await service.handleAgentFailure(testAgent.agentId, failureReason, 'retry');

      // Assert
      expect(result.isSuccess).toBe(true);
    });

    it('should return error for non-existent agent', async () => {
      // Arrange
      const nonExistentAgentId = NodeId.generate();
      const failureReason = 'Test failure';

      // Act
      const result = await service.handleAgentFailure(nonExistentAgentId, failureReason, 'disable');

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Agent not found');
    });
  });

  describe('Semantic Agent Search', () => {
    let testAgent: AIAgent;
    let testNodeId: NodeId;

    beforeEach(() => {
      testNodeId = NodeId.generate();
      testAgent = MockAIAgent.createMock('semantic-agent', testNodeId, FeatureType.FUNCTION_MODEL, 'entity1', ['nlp', 'analysis']);
      const metadata = MockNodeMetadata.createMock(
        testNodeId, 
        FeatureType.FUNCTION_MODEL, 
        ['natural', 'language', 'processing'], 
        ['nlp', 'ai', 'text']
      );

      service.registerAgent(testAgent);
      service.registerNodeMetadata(metadata);
    });

    it('should find agents through semantic search', () => {
      // Arrange
      const query = 'natural language processing tasks';

      // Act
      const result = service.performSemanticAgentSearch(query);

      // Assert
      expect(result.isSuccess).toBe(true);
      const matches = result.value;
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].matchScore).toBeGreaterThan(0.2);
    });

    it('should filter semantic search by feature type', () => {
      // Arrange
      const query = 'language processing';
      const featureType = FeatureType.KNOWLEDGE_BASE;

      // Act
      const result = service.performSemanticAgentSearch(query, featureType);

      // Assert
      expect(result.isSuccess).toBe(true);
      const matches = result.value;
      expect(matches.length).toBe(0); // No AI_AGENT type agents registered
    });

    it('should limit semantic search results', () => {
      // Arrange
      const query = 'processing';
      const maxResults = 1;

      // Act
      const result = service.performSemanticAgentSearch(query, undefined, maxResults);

      // Assert
      expect(result.isSuccess).toBe(true);
      const matches = result.value;
      expect(matches.length).toBeLessThanOrEqual(maxResults);
    });

    it('should exclude disabled agents from semantic search', () => {
      // Arrange
      testAgent.disable();
      const query = 'natural language processing';

      // Act
      const result = service.performSemanticAgentSearch(query);

      // Assert
      expect(result.isSuccess).toBe(true);
      const matches = result.value;
      expect(matches.length).toBe(0);
    });
  });

  describe('Workflow Coordination', () => {
    let testAgent: AIAgent;

    beforeEach(() => {
      testAgent = MockAIAgent.createMock('workflow-agent', undefined, FeatureType.FUNCTION_MODEL, 'entity1', ['basic']);
      service.registerAgent(testAgent);
    });

    it('should coordinate sequential workflow execution', async () => {
      // Arrange
      const tasks: AgentExecutionRequest[] = [
        {
          agentId: testAgent.agentId,
          task: 'Task 1',
          context: {},
          priority: 1,
          requiredCapabilities: ['basic']
        },
        {
          agentId: testAgent.agentId,
          task: 'Task 2',
          context: {},
          priority: 1,
          requiredCapabilities: ['basic']
        }
      ];

      // Act
      const result = await service.coordinateWorkflowExecution(tasks, 'sequential');

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.length).toBe(2);
    }, 10000);

    it('should coordinate parallel workflow execution', async () => {
      // Arrange
      const tasks: AgentExecutionRequest[] = [
        {
          agentId: testAgent.agentId,
          task: 'Parallel Task 1',
          context: {},
          priority: 1,
          requiredCapabilities: ['basic']
        },
        {
          agentId: testAgent.agentId,
          task: 'Parallel Task 2',
          context: {},
          priority: 1,
          requiredCapabilities: ['basic']
        }
      ];

      // Act
      const result = await service.coordinateWorkflowExecution(tasks, 'parallel');

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.length).toBe(2);
    }, 10000);

    it('should handle workflow execution failure gracefully', async () => {
      // Arrange
      const tasks: AgentExecutionRequest[] = [
        {
          agentId: testAgent.agentId,
          task: 'Task 1',
          context: {},
          priority: 1,
          requiredCapabilities: ['non-existent']
        }
      ];

      // Act
      const result = await service.coordinateWorkflowExecution(tasks, 'sequential');

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Workflow execution failed');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty required capabilities gracefully', () => {
      // Arrange
      const agent = MockAIAgent.createMock('agent1', undefined, FeatureType.FUNCTION_MODEL, 'entity1', []);
      service.registerAgent(agent);

      // Act
      const result = service.discoverAgents([]);

      // Assert
      expect(result.isSuccess).toBe(true);
      const matches = result.value;
      expect(matches.length).toBe(1);
      expect(matches[0].matchScore).toBe(1.0); // Perfect match for empty requirements
    });

    it('should handle agents with no capabilities', () => {
      // Arrange
      const agent = MockAIAgent.createMock('agent1', undefined, FeatureType.FUNCTION_MODEL, 'entity1', []);
      service.registerAgent(agent);

      // Act
      const result = service.discoverAgents(['required-capability']);

      // Assert
      expect(result.isSuccess).toBe(true);
      const matches = result.value;
      expect(matches.length).toBe(0); // No match due to missing capabilities
    });

    it('should handle context keywords in capability matching', () => {
      // Arrange
      const agent = MockAIAgent.createMock('agent1', undefined, FeatureType.FUNCTION_MODEL, 'entity1', ['basic']);
      service.registerAgent(agent);

      // Act
      const result = service.discoverAgents(['basic'], undefined, undefined, undefined, ['test', 'capability']);

      // Assert
      expect(result.isSuccess).toBe(true);
      const matches = result.value;
      expect(matches.length).toBe(1);
      expect(matches[0].matchScore).toBeGreaterThan(1.0); // Boosted by context keywords
    });
  });
});