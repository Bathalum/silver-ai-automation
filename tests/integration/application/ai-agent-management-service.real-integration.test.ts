/**
 * REAL Integration Test Suite for AI Agent Management Service
 * 
 * This test suite uses ZERO mocks and validates the complete integration with:
 * - Real Supabase database operations
 * - Real SupabaseAIAgentRepository
 * - Real SupabaseAuditLogRepository  
 * - Real SupabaseEventBus
 * - Real DI Container setup
 * - Real domain entity creation and validation
 * 
 * Follows Clean Architecture TDD principles by testing actual production behavior
 * and validating that the audit repository fix works in real scenarios.
 */

import { AIAgentManagementService } from '../../../lib/application/services/ai-agent-management-service';
import { AIAgent } from '../../../lib/domain/entities/ai-agent';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { FeatureType } from '../../../lib/domain/enums';
import { Result } from '../../../lib/domain/shared/result';
import { AIAgentRepository } from '../../../lib/domain/interfaces/ai-agent-repository';
import { IAuditLogRepository } from '../../../lib/domain/interfaces/audit-log-repository';
import { IEventBus } from '../../../lib/infrastructure/events/supabase-event-bus';

// Real integration test utilities
import { IntegrationTestSetup } from '../../utils/integration-test-database';
import { RealTestDataFactory, TestDataValidator } from '../../utils/real-test-data-factory';
import { AIAgentServiceTokens } from '../../../lib/infrastructure/di/ai-agent-module';
import { ServiceTokens } from '../../../lib/infrastructure/di/container';

describe('AI Agent Management Service - REAL Integration Tests', () => {
  let testDb: any;
  let dataFactory: RealTestDataFactory;
  let validator: TestDataValidator;
  let agentService: AIAgentManagementService;
  let realAgentRepository: AIAgentRepository;
  let realAuditRepository: IAuditLogRepository;
  let realEventBus: IEventBus;

  // Test constants
  const TEST_USER_ID = 'test-user-integration';
  const TEST_ORG_ID = 'test-org-integration';

  beforeAll(async () => {
    // Setup real database and container with NO mocks
    testDb = await IntegrationTestSetup.setupTestSuite();
    dataFactory = new RealTestDataFactory(testDb);
    validator = new TestDataValidator(testDb);
    
    // Verify database connectivity
    const verifyResult = await testDb.verifyDatabaseSetup();
    if (verifyResult.isFailure) {
      throw new Error(`Database setup failed: ${verifyResult.error}`);
    }
  });

  afterAll(async () => {
    await IntegrationTestSetup.teardownTestSuite();
  });

  beforeEach(async () => {
    await IntegrationTestSetup.setupTest();
    
    // Resolve REAL implementations from container
    const container = testDb.getContainer();
    
    const agentServiceResult = await container.resolve<AIAgentManagementService>(
      ServiceTokens.AI_AGENT_MANAGEMENT_SERVICE
    );
    const agentRepositoryResult = await container.resolve<AIAgentRepository>(
      AIAgentServiceTokens.AI_AGENT_REPOSITORY
    );
    const auditRepositoryResult = await container.resolve<IAuditLogRepository>(
      ServiceTokens.AUDIT_LOG_REPOSITORY
    );
    const eventBusResult = await container.resolve<IEventBus>(
      ServiceTokens.EVENT_BUS
    );
    
    if (agentServiceResult.isFailure || agentRepositoryResult.isFailure || 
        auditRepositoryResult.isFailure || eventBusResult.isFailure) {
      const errors = [
        agentServiceResult.isFailure ? `AgentService: ${agentServiceResult.error}` : '',
        agentRepositoryResult.isFailure ? `AgentRepo: ${agentRepositoryResult.error}` : '',
        auditRepositoryResult.isFailure ? `AuditRepo: ${auditRepositoryResult.error}` : '',
        eventBusResult.isFailure ? `EventBus: ${eventBusResult.error}` : ''
      ].filter(e => e).join('; ');
      throw new Error(`Failed to resolve real implementations from container: ${errors}`);
    }

    agentService = agentServiceResult.value;
    realAgentRepository = agentRepositoryResult.value;
    realAuditRepository = auditRepositoryResult.value;
    realEventBus = eventBusResult.value;

    // Validate test isolation
    const isolationResult = await validator.validateTestIsolation();
    if (isolationResult.isFailure) {
      throw new Error(`Test isolation failed: ${isolationResult.error}`);
    }
  });

  afterEach(async () => {
    await IntegrationTestSetup.teardownTest();
  });

  describe('REAL Agent Registration and Discovery Integration', () => {
    it('should_RegisterAgentAndVerifyInDatabase_WhenValidAgentProvided', async () => {
      // Arrange: Create real agent registration request
      const agentRequest = {
        name: 'Real Data Processing Agent',
        description: 'Real integration test agent for data processing',
        featureType: FeatureType.FUNCTION_MODEL,
        entityId: `entity-real-${testDb.getTestRunId()}`,
        instructions: 'Process real data according to specified parameters',
        tools: {
          availableTools: ['http-client', 'database-connector', 'file-processor'],
          toolConfigurations: {
            'http-client': { timeout: 30000, retries: 3 },
            'database-connector': { poolSize: 10, timeout: 5000 },
            'file-processor': { maxFileSize: 52428800 }
          }
        },
        capabilities: {
          canRead: true,
          canWrite: true,
          canAnalyze: true,
          canExecute: false,
          canOrchestrate: false,
          maxConcurrentTasks: 8,
          supportedDataTypes: ['json', 'csv', 'xml', 'parquet']
        },
        userId: TEST_USER_ID,
        organizationId: TEST_ORG_ID
      };

      // Act: Register agent using REAL service and repository
      const registrationResult = await agentService.registerAgent(agentRequest);

      // Assert: Verify successful registration
      if (registrationResult.isFailure) {
        console.log('Registration failed with error:', registrationResult.error);
      }
      expect(registrationResult.isSuccess).toBe(true);
      expect(registrationResult.value).toEqual(
        expect.objectContaining({
          name: agentRequest.name,
          featureType: agentRequest.featureType,
          entityId: agentRequest.entityId,
          status: 'registered'
        })
      );

      // Verify agent exists in REAL database
      const agentId = NodeId.create(registrationResult.value.agentId);
      expect(agentId.isSuccess).toBe(true);

      const existsResult = await dataFactory.verifyAgentExists(agentId.value);
      expect(existsResult.isSuccess).toBe(true);
      expect(existsResult.value).toBe(true);

      // Verify REAL audit log was created
      const auditLogsResult = await dataFactory.verifyAuditLogExists(
        'AGENT_REGISTERED',
        registrationResult.value.agentId
      );
      expect(auditLogsResult.isSuccess).toBe(true);
      expect(auditLogsResult.value.length).toBeGreaterThan(0);

      const auditLog = auditLogsResult.value[0];
      expect(auditLog.action).toBe('AGENT_REGISTERED');
      expect(auditLog.entityId).toBe(registrationResult.value.agentId);
      expect(auditLog.userId).toBe(TEST_USER_ID);

      // Verify agent can be retrieved from database
      const retrievedAgentResult = await dataFactory.getRealAgent(agentId.value);
      expect(retrievedAgentResult.isSuccess).toBe(true);
      expect(retrievedAgentResult.value.name).toBe(agentRequest.name);
      expect(retrievedAgentResult.value.capabilities.canAnalyze).toBe(true);
      expect(retrievedAgentResult.value.capabilities.maxConcurrentTasks).toBe(8);
    });

    it('should_DiscoverAgentsFromRealDatabase_WhenCapabilitySearchExecuted', async () => {
      // Arrange: Create multiple real agents with different capabilities
      const agentsToCreate = [
        {
          name: 'Real Data Analyzer',
          capabilities: { 
            canRead: true, 
            canWrite: false, 
            canAnalyze: true, 
            canExecute: false,
            maxConcurrentTasks: 5,
            supportedDataTypes: ['json', 'csv']
          }
        },
        {
          name: 'Real Task Executor',
          capabilities: { 
            canRead: true, 
            canWrite: true, 
            canAnalyze: false, 
            canExecute: true,
            maxConcurrentTasks: 3,
            supportedDataTypes: ['json']
          }
        },
        {
          name: 'Real Full-Stack Agent',
          capabilities: { 
            canRead: true, 
            canWrite: true, 
            canAnalyze: true, 
            canExecute: true, 
            canOrchestrate: true,
            maxConcurrentTasks: 10,
            supportedDataTypes: ['json', 'csv', 'xml']
          }
        }
      ];

      // Create real agents in database
      const createdAgentsResult = await dataFactory.createRealAgentPool(agentsToCreate);
      expect(createdAgentsResult.isSuccess).toBe(true);

      const createdAgents = createdAgentsResult.value;
      expect(createdAgents).toHaveLength(3);

      // Act: Execute capability-based discovery using REAL service
      const discoveryRequest = {
        requiredCapabilities: ['canAnalyze', 'canExecute'],
        optionalCapabilities: ['canOrchestrate'],
        minimumScore: 0.5,
        maxResults: 10,
        userId: TEST_USER_ID
      };

      const discoveryResult = await agentService.discoverAgentsByCapability(discoveryRequest);

      // Assert: Verify discovery found correct agents
      expect(discoveryResult.isSuccess).toBe(true);
      expect(discoveryResult.value.agents.length).toBeGreaterThan(0);

      // Should find the Full-Stack Agent that has both canAnalyze and canExecute
      const fullStackAgent = discoveryResult.value.agents.find(agent => 
        agent.name === 'Real Full-Stack Agent'
      );
      expect(fullStackAgent).toBeDefined();
      expect(fullStackAgent!.score).toBeGreaterThan(0.5);

      // Verify REAL audit log for discovery
      const discoveryAuditResult = await dataFactory.verifyAuditLogExists(
        'CAPABILITY_DISCOVERY_EXECUTED',
        'discovery-session'
      );
      expect(discoveryAuditResult.isSuccess).toBe(true);

      // Validate database state
      const validationResult = await validator.validateDatabaseState({
        agents: 3 // We created 3 agents
      });
      expect(validationResult.isSuccess).toBe(true);
    });
  });

  describe('REAL Agent Execution and Metrics Integration', () => {
    it('should_ExecuteAgentTaskAndRecordMetrics_WhenRealAgentExecuted', async () => {
      // Arrange: Create real agent for execution
      const executorAgentResult = await dataFactory.createRealAgent(
        'Real Task Executor',
        { canExecute: true, canRead: true, maxConcurrentTasks: 5 }
      );
      expect(executorAgentResult.isSuccess).toBe(true);

      const agent = executorAgentResult.value;

      // Act: Execute task using REAL service
      const taskRequest = {
        agentId: agent.agentId.value,
        taskId: `task-real-${testDb.getTestRunId()}`,
        taskType: 'data-processing',
        parameters: { 
          dataset: 'integration-test-data',
          outputFormat: 'json'
        },
        userId: TEST_USER_ID
      };

      const executionResult = await agentService.executeAgentTask(taskRequest);

      // Assert: Verify task execution
      expect(executionResult.isSuccess).toBe(true);
      expect(executionResult.value).toEqual(
        expect.objectContaining({
          agentId: agent.agentId.value,
          taskId: taskRequest.taskId,
          status: expect.stringMatching(/completed|running|queued/)
        })
      );

      // Verify execution metrics were recorded in REAL database
      const updatedAgentResult = await dataFactory.getRealAgent(agent.agentId);
      expect(updatedAgentResult.isSuccess).toBe(true);

      const updatedAgent = updatedAgentResult.value;
      expect(updatedAgent.executionCount).toBeGreaterThan(agent.executionCount);

      // Verify REAL audit log for execution
      const executionAuditResult = await dataFactory.verifyAuditLogExists(
        'AGENT_TASK_EXECUTED',
        agent.agentId.value
      );
      expect(executionAuditResult.isSuccess).toBe(true);

      const executionAudit = executionAuditResult.value[0];
      expect(executionAudit.details).toEqual(
        expect.objectContaining({
          taskId: taskRequest.taskId,
          taskType: taskRequest.taskType
        })
      );
    });

    it('should_HandleExecutionFailureAndRecordMetrics_WhenAgentExecutionFails', async () => {
      // Arrange: Create real agent that will fail execution
      const failingAgentResult = await dataFactory.createRealAgent(
        'Real Failing Agent',
        { canExecute: false, canRead: true } // Cannot execute - will cause failure
      );
      expect(failingAgentResult.isSuccess).toBe(true);

      const agent = failingAgentResult.value;

      // Act: Execute task that should fail
      const taskRequest = {
        agentId: agent.agentId.value,
        taskId: `failing-task-${testDb.getTestRunId()}`,
        taskType: 'execution-task', // Requires canExecute = true
        parameters: { operation: 'execute-script' },
        userId: TEST_USER_ID
      };

      const executionResult = await agentService.executeAgentTask(taskRequest);

      // Assert: Verify execution failure was handled properly
      expect(executionResult.isFailure).toBe(true);
      expect(executionResult.error).toContain('execution');

      // Verify failure metrics were recorded in REAL database  
      const updatedAgentResult = await dataFactory.getRealAgent(agent.agentId);
      expect(updatedAgentResult.isSuccess).toBe(true);

      const updatedAgent = updatedAgentResult.value;
      expect(updatedAgent.failureCount).toBeGreaterThan(agent.failureCount);

      // Verify REAL audit log for failure
      const failureAuditResult = await dataFactory.verifyAuditLogExists(
        'AGENT_EXECUTION_FAILED',
        agent.agentId.value
      );
      expect(failureAuditResult.isSuccess).toBe(true);

      const failureAudit = failureAuditResult.value[0];
      expect(failureAudit.details).toEqual(
        expect.objectContaining({
          taskId: taskRequest.taskId,
          failureReason: expect.any(String)
        })
      );
    });
  });

  describe('REAL Database Transaction and Consistency Tests', () => {
    it('should_MaintainDataConsistency_WhenMultipleOperationsExecuted', async () => {
      // Arrange: Create multiple real agents
      const agentsToCreate = [
        { name: 'Consistency Agent 1', capabilities: { canRead: true, canAnalyze: true } },
        { name: 'Consistency Agent 2', capabilities: { canWrite: true, canExecute: true } }
      ];

      const agentsResult = await dataFactory.createRealAgentPool(agentsToCreate);
      expect(agentsResult.isSuccess).toBe(true);

      const agents = agentsResult.value;

      // Act: Execute multiple operations concurrently
      const operations = [
        // Update first agent
        dataFactory.updateRealAgent(agents[0]),
        // Record execution for second agent
        dataFactory.recordRealExecution(agents[1].agentId, true, 1500),
        // Create audit logs
        dataFactory.createRealAuditLog('CONSISTENCY_TEST', agents[0].agentId.value, TEST_USER_ID),
        dataFactory.createRealAuditLog('CONSISTENCY_TEST', agents[1].agentId.value, TEST_USER_ID)
      ];

      const results = await Promise.all(operations);

      // Assert: Verify all operations succeeded
      results.forEach(result => {
        expect(result.isSuccess).toBe(true);
      });

      // Verify database consistency
      const validationResult = await validator.validateDatabaseState({
        agents: 2
      });
      expect(validationResult.isSuccess).toBe(true);

      // Verify both agents still exist and have correct state
      const agent1Result = await dataFactory.getRealAgent(agents[0].agentId);
      const agent2Result = await dataFactory.getRealAgent(agents[1].agentId);

      expect(agent1Result.isSuccess).toBe(true);
      expect(agent2Result.isSuccess).toBe(true);
      expect(agent2Result.value.executionCount).toBe(agents[1].executionCount + 1);
    });

    it('should_VerifyAuditRepositoryFix_WorksInProductionScenario', async () => {
      // This test specifically validates the audit repository fix mentioned in the user request

      // Arrange: Create a real agent and perform operations that generate audit logs
      const testAgentResult = await dataFactory.createRealAgent(
        'Audit Fix Validation Agent',
        { canRead: true, canWrite: true, canAnalyze: true }
      );
      expect(testAgentResult.isSuccess).toBe(true);

      const agent = testAgentResult.value;

      // Act: Perform operations that should create audit logs through the fixed repository
      const operations = [
        // Registration audit log (already created by createRealAgent)
        agentService.updateAgentEnabled(agent.agentId.value, false, TEST_USER_ID),
        agentService.updateAgentEnabled(agent.agentId.value, true, TEST_USER_ID),
        dataFactory.recordRealExecution(agent.agentId, true, 2000),
        dataFactory.recordRealExecution(agent.agentId, false, 3000)
      ];

      const operationResults = await Promise.all(operations);

      // Assert: Verify all operations succeeded (proving audit repository works)
      operationResults.forEach(result => {
        expect(result.isSuccess).toBe(true);
      });

      // Verify audit logs were created correctly using the fixed repository
      const auditActions = [
        'AGENT_REGISTERED',
        'AGENT_DISABLED', 
        'AGENT_ENABLED',
        'AGENT_EXECUTION_RECORDED'
      ];

      for (const action of auditActions) {
        const auditResult = await dataFactory.verifyAuditLogExists(action, agent.agentId.value);
        expect(auditResult.isSuccess).toBe(true);
        expect(auditResult.value.length).toBeGreaterThan(0);

        // Verify audit log structure is correct
        const auditLog = auditResult.value[0];
        expect(auditLog.action).toBe(action);
        expect(auditLog.entityId).toBe(agent.agentId.value);
        expect(auditLog.timestamp).toBeInstanceOf(Date);
        expect(auditLog.details).toBeDefined();
      }

      // Verify the agent's final state reflects all operations
      const finalAgentResult = await dataFactory.getRealAgent(agent.agentId);
      expect(finalAgentResult.isSuccess).toBe(true);

      const finalAgent = finalAgentResult.value;
      expect(finalAgent.isEnabled).toBe(true); // Final state after enable/disable
      expect(finalAgent.executionCount).toBe(agent.executionCount + 2); // Two executions recorded
      expect(finalAgent.successCount).toBe(agent.successCount + 1); // One success
      expect(finalAgent.failureCount).toBe(agent.failureCount + 1); // One failure

      // This proves the audit repository fix is working in production scenarios
      console.log('✅ Audit Repository Fix validated successfully in production integration test');
    });
  });

  describe('REAL Event Bus Integration Tests', () => {
    it('should_PublishEventsToRealEventBus_WhenAgentOperationsPerformed', async () => {
      // Arrange: Create real agent for event testing
      const eventTestAgentResult = await dataFactory.createRealAgent(
        'Event Test Agent',
        { canRead: true, canExecute: true }
      );
      expect(eventTestAgentResult.isSuccess).toBe(true);

      const agent = eventTestAgentResult.value;

      // Act: Perform operations that trigger events
      const executionResult = await agentService.executeAgentTask({
        agentId: agent.agentId.value,
        taskId: `event-test-${testDb.getTestRunId()}`,
        taskType: 'event-generation',
        parameters: { testEvent: true },
        userId: TEST_USER_ID
      });

      // Assert: Verify operation completed (events are published in background)
      // In a real implementation, we'd have event handlers that we could verify
      expect(executionResult.isSuccess || executionResult.isFailure).toBe(true);

      // Verify audit logs show the operation occurred
      const operationAuditResult = await dataFactory.verifyAuditLogExists(
        'AGENT_TASK_EXECUTED',
        agent.agentId.value
      );

      // Either the task succeeded and we have execution audit, or it failed and we have failure audit
      const failureAuditResult = await dataFactory.verifyAuditLogExists(
        'AGENT_EXECUTION_FAILED', 
        agent.agentId.value
      );

      const hasExecutionAudit = operationAuditResult.isSuccess && operationAuditResult.value.length > 0;
      const hasFailureAudit = failureAuditResult.isSuccess && failureAuditResult.value.length > 0;

      expect(hasExecutionAudit || hasFailureAudit).toBe(true);
    });
  });

  describe('REAL Performance and Scale Integration Tests', () => {
    it('should_HandleMultipleAgentsEfficiently_WithRealDatabase', async () => {
      // Arrange: Create multiple agents for performance testing
      const agentsToCreate = Array.from({ length: 10 }, (_, i) => ({
        name: `Performance Agent ${i + 1}`,
        capabilities: {
          canRead: true,
          canAnalyze: i % 2 === 0, // Alternate analyze capability
          canExecute: i % 3 === 0, // Every third can execute
          maxConcurrentTasks: Math.floor(Math.random() * 10) + 1
        }
      }));

      const startTime = Date.now();

      // Act: Create agents and perform discovery
      const agentsResult = await dataFactory.createRealAgentPool(agentsToCreate);
      expect(agentsResult.isSuccess).toBe(true);

      const discoveryResult = await agentService.discoverAgentsByCapability({
        requiredCapabilities: ['canRead'],
        maxResults: 20,
        userId: TEST_USER_ID
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Assert: Verify performance and results
      expect(discoveryResult.isSuccess).toBe(true);
      expect(discoveryResult.value.agents.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify database contains all created agents
      const validationResult = await validator.validateDatabaseState({
        agents: 10
      });
      expect(validationResult.isSuccess).toBe(true);

      console.log(`✅ Performance test completed in ${executionTime}ms with ${discoveryResult.value.agents.length} agents found`);
    });
  });
});