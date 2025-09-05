import { AIAgent, AIAgentCapabilities, AIAgentTools } from '../../../lib/domain/entities/ai-agent';
import { AuditLog } from '../../../lib/domain/entities/audit-log';
import { SupabaseClient } from '@supabase/supabase-js';
import { FeatureType } from '../../../lib/domain/enums';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { Result } from '../../../lib/domain/shared/result';
import { IntegrationTestDatabase } from './integration-test-database';

/**
 * Real Test Data Factory
 * Creates actual domain entities using real constructors and persists to real database
 * NO MOCKS - All entities are real domain objects
 */

export class RealTestDataFactory {
  constructor(private testDb: IntegrationTestDatabase) {}

  /**
   * Create a real AI Agent domain entity
   * Uses AIAgent.create() - the actual domain factory method
   */
  async createRealAIAgent(overrides: Partial<{
    name: string;
    capabilities: AIAgentCapabilities;
    tools: AIAgentTools;
    attachedToFeatureType: FeatureType;
    attachedToEntityId: string;
  }> = {}): Promise<Result<AIAgent>> {
    const name = overrides.name || this.testDb.createTestId('test-agent');
    
    const defaultCapabilities: AIAgentCapabilities = {
      skills: ['data-processing', 'workflow-orchestration'],
      domains: ['financial-analysis', 'regulatory-compliance'],
      complexityLevel: 'intermediate',
      supportedLanguages: ['typescript', 'python'],
      integrationTypes: ['api', 'database']
    };

    const defaultTools: AIAgentTools = {
      required: ['database-connector', 'api-client'],
      optional: ['chart-generator', 'report-builder'],
      forbidden: ['file-system-access'],
      customTools: []
    };

    return AIAgent.create({
      name,
      description: `Integration test agent for ${this.testDb.getTestRunId()}`,
      capabilities: overrides.capabilities || defaultCapabilities,
      tools: overrides.tools || defaultTools,
      attachedToFeatureType: overrides.attachedToFeatureType || FeatureType.AI_AGENT,
      attachedToEntityId: overrides.attachedToEntityId || NodeId.generate().toString(),
      enabled: true,
      configuration: {
        maxRetries: 3,
        timeout: 30000,
        priority: 'medium'
      }
    });
  }

  /**
   * Create a real Audit Log domain entity
   * Uses AuditLog.create() - the actual domain factory method
   */
  async createRealAuditLog(overrides: Partial<{
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
  }> = {}): Promise<Result<AuditLog>> {
    return AuditLog.create({
      entityType: overrides.entityType || 'AIAgent',
      entityId: overrides.entityId || this.testDb.createTestId('test-entity'),
      action: overrides.action || 'CREATE',
      userId: overrides.userId || this.testDb.createTestId('test-user'),
      timestamp: new Date(),
      details: {
        testRun: this.testDb.getTestRunId(),
        operation: 'integration-test',
        realData: true
      }
    });
  }

  /**
   * Create multiple real AI agents for bulk testing
   * Each agent is a real domain entity
   */
  async createMultipleRealAIAgents(count: number): Promise<Result<AIAgent>[]> {
    const agents: Result<AIAgent>[] = [];

    for (let i = 0; i < count; i++) {
      const agentResult = await this.createRealAIAgent({
        name: this.testDb.createTestId(`bulk-agent-${i}`),
        capabilities: {
          skills: [`skill-${i}`, 'common-skill'],
          domains: [`domain-${i}`, 'testing'],
          complexityLevel: i % 2 === 0 ? 'basic' : 'advanced',
          supportedLanguages: ['typescript'],
          integrationTypes: ['api']
        }
      });
      
      agents.push(agentResult);
    }

    return agents;
  }

  /**
   * Persist a real AI agent to the real database
   * Uses actual repository save operation
   */
  async persistRealAIAgent(
    agent: AIAgent, 
    repository: any // Will be real SupabaseAIAgentRepository
  ): Promise<Result<void>> {
    return await repository.save(agent);
  }

  /**
   * Verify real AI agent exists in real database
   * Uses actual repository find operation
   */
  async verifyRealAIAgentInDatabase(
    agentId: string,
    repository: any // Will be real SupabaseAIAgentRepository
  ): Promise<Result<AIAgent>> {
    return await repository.findById(agentId);
  }

  /**
   * Persist a real audit log to the real database
   * Uses actual audit repository save operation
   */
  async persistRealAuditLog(
    auditLog: AuditLog,
    auditRepository: any // Will be real SupabaseAuditLogRepository
  ): Promise<Result<void>> {
    return await auditRepository.save(auditLog);
  }

  /**
   * Verify real audit log exists in real database
   * Uses actual audit repository find operation
   */
  async verifyRealAuditLogInDatabase(
    entityId: string,
    auditRepository: any // Will be real SupabaseAuditLogRepository
  ): Promise<Result<AuditLog[]>> {
    return await auditRepository.findByEntityId(entityId);
  }

  /**
   * Create test scenario data for capability-based discovery
   * All agents are real domain entities
   */
  async createCapabilityTestScenario(): Promise<{
    orchestratorAgent: Result<AIAgent>;
    processingAgent: Result<AIAgent>;
    reportingAgent: Result<AIAgent>;
  }> {
    const orchestratorAgent = await this.createRealAIAgent({
      name: this.testDb.createTestId('orchestrator'),
      capabilities: {
        skills: ['workflow-orchestration', 'task-coordination', 'resource-management'],
        domains: ['business-process', 'automation'],
        complexityLevel: 'advanced',
        supportedLanguages: ['typescript', 'python'],
        integrationTypes: ['api', 'queue', 'database']
      }
    });

    const processingAgent = await this.createRealAIAgent({
      name: this.testDb.createTestId('processor'),
      capabilities: {
        skills: ['data-processing', 'transformation', 'validation'],
        domains: ['financial-analysis', 'data-engineering'],
        complexityLevel: 'intermediate',
        supportedLanguages: ['python', 'sql'],
        integrationTypes: ['database', 'file']
      }
    });

    const reportingAgent = await this.createRealAIAgent({
      name: this.testDb.createTestId('reporter'),
      capabilities: {
        skills: ['report-generation', 'visualization', 'analysis'],
        domains: ['business-intelligence', 'reporting'],
        complexityLevel: 'basic',
        supportedLanguages: ['typescript', 'sql'],
        integrationTypes: ['api', 'file']
      }
    });

    return {
      orchestratorAgent,
      processingAgent,
      reportingAgent
    };
  }

  /**
   * Create performance testing scenario with large dataset
   * All entities are real domain objects
   */
  async createPerformanceTestScenario(agentCount: number = 100): Promise<{
    agents: Result<AIAgent>[];
    auditLogs: Result<AuditLog>[];
  }> {
    const agents = await this.createMultipleRealAIAgents(agentCount);
    const auditLogs: Result<AuditLog>[] = [];

    // Create audit log for each agent
    for (let i = 0; i < agentCount; i++) {
      const auditLogResult = await this.createRealAuditLog({
        entityType: 'AIAgent',
        entityId: this.testDb.createTestId(`perf-agent-${i}`),
        action: 'PERFORMANCE_TEST',
        userId: this.testDb.createTestId('perf-user')
      });
      
      auditLogs.push(auditLogResult);
    }

    return { agents, auditLogs };
  }

  /**
   * Clean up test data created by this factory
   * Removes real data from real database
   */
  async cleanupTestData(): Promise<void> {
    await this.testDb.cleanup();
  }
}

/**
 * Factory function to create a real test data factory
 */
export function createRealTestDataFactory(testDb: IntegrationTestDatabase): RealTestDataFactory {
  return new RealTestDataFactory(testDb);
}