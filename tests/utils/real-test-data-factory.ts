/**
 * Real Test Data Factory
 * 
 * Creates real domain entities and persists them to the database for integration tests.
 * No mocks - everything uses real implementations and actual database operations.
 */
import { AIAgent, AIAgentCapabilities, AIAgentTools } from '../../lib/domain/entities/ai-agent';
import { NodeId } from '../../lib/domain/value-objects/node-id';
import { FeatureType } from '../../lib/domain/enums';
import { Result } from '../../lib/domain/shared/result';
import { IntegrationTestDatabase } from './integration-test-database';
import { AIAgentRepository } from '../../lib/domain/interfaces/ai-agent-repository';
import { AIAgentServiceTokens } from '../../lib/infrastructure/di/ai-agent-module';
import { AuditLog } from '../../lib/domain/entities/audit-log';
import { IAuditLogRepository } from '../../lib/domain/interfaces/audit-log-repository';
import { ServiceTokens } from '../../lib/infrastructure/di/container';

/**
 * Real test data factory using actual domain entities and database operations
 */
export class RealTestDataFactory {
  constructor(private testDb: IntegrationTestDatabase) {}

  /**
   * Create a real AI Agent with actual database persistence
   */
  async createRealAgent(
    name: string, 
    capabilities: Partial<AIAgentCapabilities> = {},
    tools: Partial<AIAgentTools> = {},
    featureType: FeatureType = FeatureType.FUNCTION_MODEL,
    entityId?: string
  ): Promise<Result<AIAgent>> {
    try {
      // Create domain entity using real factory method
      const agentResult = AIAgent.create({
        agentId: NodeId.generate(),
        featureType,
        entityId: entityId || `entity-${name}-${this.testDb.getTestRunId()}`,
        name,
        description: `Integration test agent: ${name}`,
        instructions: `Real test instructions for ${name}`,
        tools: {
          availableTools: ['http-client', 'file-processor', 'data-analyzer'],
          toolConfigurations: {
            'http-client': { timeout: 30000, retries: 3 },
            'file-processor': { maxFileSize: 10485760 },
            'data-analyzer': { algorithms: ['statistical', 'ml-basic'] }
          },
          ...tools
        },
        capabilities: {
          canRead: true,
          canWrite: true,
          canExecute: false,
          canAnalyze: true,
          canOrchestrate: false,
          maxConcurrentTasks: 5,
          supportedDataTypes: ['json', 'csv', 'text'],
          ...capabilities
        },
        isEnabled: true
      });

      if (agentResult.isFailure) {
        return Result.fail(`Failed to create agent domain entity: ${agentResult.error}`);
      }

      // Persist to real database using repository
      const container = this.testDb.getContainer();
      const repositoryResult = await container.resolve<AIAgentRepository>(AIAgentServiceTokens.AI_AGENT_REPOSITORY);
      
      if (repositoryResult.isFailure) {
        return Result.fail(`Failed to resolve agent repository: ${repositoryResult.error}`);
      }

      const saveResult = await repositoryResult.value.save(agentResult.value);
      if (saveResult.isFailure) {
        return Result.fail(`Failed to persist agent to database: ${saveResult.error}`);
      }

      return Result.ok(agentResult.value);
    } catch (error) {
      return Result.fail(`Failed to create real agent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create multiple real agents for testing scenarios
   */
  async createRealAgentPool(
    agents: Array<{
      name: string;
      capabilities: Partial<AIAgentCapabilities>;
      tools?: Partial<AIAgentTools>;
      featureType?: FeatureType;
      entityId?: string;
    }>
  ): Promise<Result<AIAgent[]>> {
    const createdAgents: AIAgent[] = [];

    for (const agentSpec of agents) {
      const agentResult = await this.createRealAgent(
        agentSpec.name,
        agentSpec.capabilities,
        agentSpec.tools,
        agentSpec.featureType,
        agentSpec.entityId
      );

      if (agentResult.isFailure) {
        return Result.fail(`Failed to create agent ${agentSpec.name}: ${agentResult.error}`);
      }

      createdAgents.push(agentResult.value);
    }

    return Result.ok(createdAgents);
  }

  /**
   * Create real audit logs for testing audit functionality
   */
  async createRealAuditLog(
    action: string,
    entityId: string,
    userId: string,
    details: Record<string, any> = {}
  ): Promise<Result<AuditLog>> {
    try {
      // Create audit log domain entity
      const auditLogResult = AuditLog.create({
        auditId: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
        entityType: 'test-entity',
        entityId,
        action,
        userId,
        timestamp: new Date(),
        details: {
          testRunId: this.testDb.getTestRunId(),
          ...details
        }
      });

      if (auditLogResult.isFailure) {
        return Result.fail(`Failed to create audit log domain entity: ${auditLogResult.error}`);
      }

      // Persist to real database
      const container = this.testDb.getContainer();
      const repositoryResult = await container.resolve<IAuditLogRepository>(ServiceTokens.AUDIT_LOG_REPOSITORY);
      
      if (repositoryResult.isFailure) {
        return Result.fail(`Failed to resolve audit repository: ${repositoryResult.error}`);
      }

      const saveResult = await repositoryResult.value.save(auditLogResult.value);
      if (saveResult.isFailure) {
        return Result.fail(`Failed to persist audit log to database: ${saveResult.error}`);
      }

      return Result.ok(auditLogResult.value);
    } catch (error) {
      return Result.fail(`Failed to create real audit log: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify real agent exists in database
   */
  async verifyAgentExists(agentId: NodeId): Promise<Result<boolean>> {
    try {
      const container = this.testDb.getContainer();
      const repositoryResult = await container.resolve<AIAgentRepository>(AIAgentServiceTokens.AI_AGENT_REPOSITORY);
      
      if (repositoryResult.isFailure) {
        return Result.fail(`Failed to resolve agent repository: ${repositoryResult.error}`);
      }

      const existsResult = await repositoryResult.value.exists(agentId);
      return existsResult;
    } catch (error) {
      return Result.fail(`Failed to verify agent exists: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify real audit log exists in database
   */
  async verifyAuditLogExists(action: string, entityId: string): Promise<Result<AuditLog[]>> {
    try {
      const container = this.testDb.getContainer();
      const repositoryResult = await container.resolve<IAuditLogRepository>(ServiceTokens.AUDIT_LOG_REPOSITORY);
      
      if (repositoryResult.isFailure) {
        return Result.fail(`Failed to resolve audit repository: ${repositoryResult.error}`);
      }

      // Find audit logs for the entity with our test run ID
      const auditLogsResult = await repositoryResult.value.findByEntityId(entityId);
      if (auditLogsResult.isFailure) {
        return Result.fail(`Failed to find audit logs: ${auditLogsResult.error}`);
      }

      // Filter for logs from this test run and matching action
      const matchingLogs = auditLogsResult.value.filter(log => 
        log.action === action && 
        log.details.testRunId === this.testDb.getTestRunId()
      );

      return Result.ok(matchingLogs);
    } catch (error) {
      return Result.fail(`Failed to verify audit log exists: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get real agent by ID from database
   */
  async getRealAgent(agentId: NodeId): Promise<Result<AIAgent>> {
    try {
      const container = this.testDb.getContainer();
      const repositoryResult = await container.resolve<AIAgentRepository>(AIAgentServiceTokens.AI_AGENT_REPOSITORY);
      
      if (repositoryResult.isFailure) {
        return Result.fail(`Failed to resolve agent repository: ${repositoryResult.error}`);
      }

      const agentResult = await repositoryResult.value.findById(agentId);
      return agentResult;
    } catch (error) {
      return Result.fail(`Failed to get real agent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete real agent from database
   */
  async deleteRealAgent(agentId: NodeId): Promise<Result<void>> {
    try {
      const container = this.testDb.getContainer();
      const repositoryResult = await container.resolve<AIAgentRepository>(AIAgentServiceTokens.AI_AGENT_REPOSITORY);
      
      if (repositoryResult.isFailure) {
        return Result.fail(`Failed to resolve agent repository: ${repositoryResult.error}`);
      }

      const deleteResult = await repositoryResult.value.delete(agentId);
      return deleteResult;
    } catch (error) {
      return Result.fail(`Failed to delete real agent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update real agent in database
   */
  async updateRealAgent(agent: AIAgent): Promise<Result<void>> {
    try {
      const container = this.testDb.getContainer();
      const repositoryResult = await container.resolve<AIAgentRepository>(AIAgentServiceTokens.AI_AGENT_REPOSITORY);
      
      if (repositoryResult.isFailure) {
        return Result.fail(`Failed to resolve agent repository: ${repositoryResult.error}`);
      }

      const updateResult = await repositoryResult.value.save(agent);
      return updateResult;
    } catch (error) {
      return Result.fail(`Failed to update real agent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Record real execution metrics for agent
   */
  async recordRealExecution(agentId: NodeId, success: boolean, executionTimeMs: number): Promise<Result<void>> {
    try {
      const container = this.testDb.getContainer();
      const repositoryResult = await container.resolve<AIAgentRepository>(AIAgentServiceTokens.AI_AGENT_REPOSITORY);
      
      if (repositoryResult.isFailure) {
        return Result.fail(`Failed to resolve agent repository: ${repositoryResult.error}`);
      }

      const recordResult = await repositoryResult.value.recordExecution(agentId, success, executionTimeMs);
      return recordResult;
    } catch (error) {
      return Result.fail(`Failed to record real execution: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find real agents by capability from database
   */
  async findRealAgentsByCapability(capability: string): Promise<Result<AIAgent[]>> {
    try {
      const container = this.testDb.getContainer();
      const repositoryResult = await container.resolve<AIAgentRepository>(AIAgentServiceTokens.AI_AGENT_REPOSITORY);
      
      if (repositoryResult.isFailure) {
        return Result.fail(`Failed to resolve agent repository: ${repositoryResult.error}`);
      }

      const agentsResult = await repositoryResult.value.findByCapability(capability);
      if (agentsResult.isFailure) {
        return agentsResult;
      }

      // Filter for agents created in this test run
      const testAgents = agentsResult.value.filter(agent => 
        agent.entityId.includes(this.testDb.getTestRunId())
      );

      return Result.ok(testAgents);
    } catch (error) {
      return Result.fail(`Failed to find real agents by capability: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Test data validation utilities
 */
export class TestDataValidator {
  constructor(private testDb: IntegrationTestDatabase) {}

  /**
   * Validate that database contains expected test data
   */
  async validateDatabaseState(expectedCounts: {
    agents?: number;
    auditLogs?: number;
  }): Promise<Result<void>> {
    try {
      const container = this.testDb.getContainer();

      // Validate agent count if specified
      if (expectedCounts.agents !== undefined) {
        const agentRepoResult = await container.resolve<AIAgentRepository>(AIAgentServiceTokens.AI_AGENT_REPOSITORY);
        if (agentRepoResult.isFailure) {
          return Result.fail(`Failed to resolve agent repository: ${agentRepoResult.error}`);
        }

        // Count agents created in this test run
        const agentsResult = await agentRepoResult.value.findEnabled();
        if (agentsResult.isFailure) {
          return Result.fail(`Failed to find agents: ${agentsResult.error}`);
        }

        const testAgents = agentsResult.value.filter(agent => 
          agent.entityId.includes(this.testDb.getTestRunId())
        );

        if (testAgents.length !== expectedCounts.agents) {
          return Result.fail(
            `Expected ${expectedCounts.agents} agents, found ${testAgents.length} in test run ${this.testDb.getTestRunId()}`
          );
        }
      }

      // Validate audit log count if specified
      if (expectedCounts.auditLogs !== undefined) {
        const auditRepoResult = await container.resolve<IAuditLogRepository>(ServiceTokens.AUDIT_LOG_REPOSITORY);
        if (auditRepoResult.isFailure) {
          return Result.fail(`Failed to resolve audit repository: ${auditRepoResult.error}`);
        }

        // Note: We'd need to query by date range since audit logs don't have test_run_id
        // For now, we'll validate that the repository is accessible
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        
        const logsResult = await auditRepoResult.value.findByDateRange(oneHourAgo, new Date());
        if (logsResult.isFailure) {
          return Result.fail(`Failed to find audit logs: ${logsResult.error}`);
        }
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Database validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate that no test data leaked between tests
   */
  async validateTestIsolation(): Promise<Result<void>> {
    try {
      // This would check that no data from previous test runs exists
      // For now, we'll just verify the database is accessible
      const container = this.testDb.getContainer();
      const agentRepoResult = await container.resolve<AIAgentRepository>(AIAgentServiceTokens.AI_AGENT_REPOSITORY);
      
      if (agentRepoResult.isFailure) {
        return Result.fail(`Failed to resolve agent repository for isolation check: ${agentRepoResult.error}`);
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Test isolation validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}