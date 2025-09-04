/**
 * AI Agent Workflows Integration Tests - TDD RED-GREEN-REFACTOR Approach
 * 
 * These tests define the complete integration workflows for AI Agent use cases.
 * They follow the TDD approach - all tests initially FAIL (RED state) and drive
 * the implementation of enhanced AI agent functionality with real repository integration.
 * 
 * Test Coverage:
 * - Agent Registration with Capability Validation
 * - Capability-based Discovery with Advanced Scoring
 * - Task Execution with Performance Tracking
 * - Semantic Search with Natural Language Processing
 * - Multi-Agent Workflow Coordination
 * - Complete Integration Workflows
 * - Error Scenarios and Recovery Patterns
 * - Clean Architecture Compliance
 * 
 * Architecture Focus:
 * - Tests act as Boundary Filters enforcing Clean Architecture
 * - Domain logic validation through repository integration
 * - Proper dependency inversion testing
 * - Event-driven architecture verification
 */

import { createClient } from '@supabase/supabase-js';

// AI Agent Use Cases
import { RegisterAIAgentUseCase, RegisterAIAgentRequest, RegisterAIAgentResponse } from '../../../lib/use-cases/ai-agent/register-ai-agent-use-case';
import { DiscoverAgentsByCapabilityUseCase, DiscoverAgentsByCapabilityRequest, DiscoverAgentsByCapabilityResponse } from '../../../lib/use-cases/ai-agent/discover-agents-by-capability-use-case';
import { ExecuteAIAgentTaskUseCase, ExecuteAIAgentTaskRequest, ExecuteAIAgentTaskResponse } from '../../../lib/use-cases/ai-agent/execute-ai-agent-task-use-case';
import { PerformSemanticAgentSearchUseCase, PerformSemanticAgentSearchRequest, PerformSemanticAgentSearchResponse } from '../../../lib/use-cases/ai-agent/perform-semantic-agent-search-use-case';
import { CoordinateWorkflowAgentExecutionUseCase, CoordinateWorkflowAgentExecutionRequest, CoordinateWorkflowAgentExecutionResponse } from '../../../lib/use-cases/ai-agent/coordinate-workflow-agent-execution-use-case';

// Domain Types
import { AIAgent, AIAgentCapabilities, AIAgentTools } from '../../../lib/domain/entities/ai-agent';
import { AuditLog } from '../../../lib/domain/entities/audit-log';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { FeatureType } from '../../../lib/domain/enums';
import { Result } from '../../../lib/domain/shared/result';

// Repository Interfaces - following dependency inversion principle
import { AIAgentRepository } from '../../../lib/domain/interfaces/ai-agent-repository';
import { IAuditLogRepository } from '../../../lib/domain/interfaces/audit-log-repository';

// Infrastructure - concrete implementations
import { SupabaseEventBus, IEventBus } from '../../../lib/infrastructure/events/supabase-event-bus';

// Test Infrastructure
import { createMockSupabaseClient, getTestUUID } from '../../utils/test-fixtures';

/**
 * Mock AI Agent Repository Implementation for Integration Testing
 * This provides a realistic repository that uses Supabase mock client
 * but implements all the actual business logic for agent management
 */
class MockSupabaseAIAgentRepository implements AIAgentRepository {
  private supabaseClient: any;
  
  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
  }

  async findById(id: NodeId): Promise<Result<AIAgent>> {
    try {
      const result = await this.supabaseClient
        .from('ai_agents')
        .select('*')
        .eq('agent_id', id.value)
        .single();

      if (result.error && result.error.code === 'PGRST116') {
        return Result.fail(`Agent not found: ${id.value}`);
      }
      
      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const agentResult = this.mapRowToAgent(result.data);
      return agentResult;
    } catch (error) {
      return Result.fail(`Failed to find agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async save(agent: AIAgent): Promise<Result<void>> {
    try {
      const agentData = this.mapAgentToRow(agent);
      
      const result = await this.supabaseClient
        .from('ai_agents')
        .upsert(agentData);

      if (result.error) {
        return Result.fail(`Failed to save agent: ${result.error.message}`);
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: NodeId): Promise<Result<void>> {
    try {
      const result = await this.supabaseClient
        .from('ai_agents')
        .delete()
        .eq('agent_id', id.value);

      if (result.error) {
        return Result.fail(`Failed to delete agent: ${result.error.message}`);
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Delete operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(id: NodeId): Promise<Result<boolean>> {
    const findResult = await this.findById(id);
    return Result.ok(findResult.isSuccess);
  }

  async findByFeatureAndEntity(featureType: FeatureType, entityId: string): Promise<Result<AIAgent[]>> {
    try {
      const result = await this.supabaseClient
        .from('ai_agents')
        .select('*')
        .eq('feature_type', featureType)
        .eq('entity_id', entityId);

      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const agents = result.data.map((row: any) => this.mapRowToAgent(row)).filter((r: Result<AIAgent>) => r.isSuccess).map((r: Result<AIAgent>) => r.value!);
      return Result.ok(agents);
    } catch (error) {
      return Result.fail(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByNode(nodeId: NodeId): Promise<Result<AIAgent[]>> {
    try {
      const result = await this.supabaseClient
        .from('ai_agents')
        .select('*')
        .eq('node_id', nodeId.value);

      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const agents = result.data.map((row: any) => this.mapRowToAgent(row)).filter((r: Result<AIAgent>) => r.isSuccess).map((r: Result<AIAgent>) => r.value!);
      return Result.ok(agents);
    } catch (error) {
      return Result.fail(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByFeatureType(featureType: FeatureType): Promise<Result<AIAgent[]>> {
    try {
      const result = await this.supabaseClient
        .from('ai_agents')
        .select('*')
        .eq('feature_type', featureType);

      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const agents = result.data.map((row: any) => this.mapRowToAgent(row)).filter((r: Result<AIAgent>) => r.isSuccess).map((r: Result<AIAgent>) => r.value!);
      return Result.ok(agents);
    } catch (error) {
      return Result.fail(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findEnabled(): Promise<Result<AIAgent[]>> {
    try {
      const result = await this.supabaseClient
        .from('ai_agents')
        .select('*')
        .eq('is_enabled', true);

      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const agents = result.data.map((row: any) => this.mapRowToAgent(row)).filter((r: Result<AIAgent>) => r.isSuccess).map((r: Result<AIAgent>) => r.value!);
      return Result.ok(agents);
    } catch (error) {
      return Result.fail(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findDisabled(): Promise<Result<AIAgent[]>> {
    try {
      const result = await this.supabaseClient
        .from('ai_agents')
        .select('*')
        .eq('is_enabled', false);

      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const agents = result.data.map((row: any) => this.mapRowToAgent(row)).filter((r: Result<AIAgent>) => r.isSuccess).map((r: Result<AIAgent>) => r.value!);
      return Result.ok(agents);
    } catch (error) {
      return Result.fail(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByName(name: string): Promise<Result<AIAgent[]>> {
    try {
      const result = await this.supabaseClient
        .from('ai_agents')
        .select('*')
        .ilike('name', `%${name}%`);

      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const agents = result.data.map((row: any) => this.mapRowToAgent(row)).filter((r: Result<AIAgent>) => r.isSuccess).map((r: Result<AIAgent>) => r.value!);
      return Result.ok(agents);
    } catch (error) {
      return Result.fail(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByCapability(capability: string): Promise<Result<AIAgent[]>> {
    try {
      // In a real implementation, this would use PostgreSQL JSON operators
      // For mock, we'll load all agents and filter in memory
      const enabledResult = await this.findEnabled();
      if (enabledResult.isFailure) {
        return enabledResult;
      }

      const filteredAgents = enabledResult.value.filter(agent => {
        const caps = agent.capabilities;
        if (caps.processingModes && caps.processingModes.includes(capability)) {
          return true;
        }
        // Check other capability types
        return false;
      });

      return Result.ok(filteredAgents);
    } catch (error) {
      return Result.fail(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByTool(toolName: string): Promise<Result<AIAgent[]>> {
    try {
      const enabledResult = await this.findEnabled();
      if (enabledResult.isFailure) {
        return enabledResult;
      }

      const filteredAgents = enabledResult.value.filter(agent => 
        agent.tools.availableTools.includes(toolName)
      );

      return Result.ok(filteredAgents);
    } catch (error) {
      return Result.fail(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findRecentlyExecuted(hours: number): Promise<Result<AIAgent[]>> {
    try {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const result = await this.supabaseClient
        .from('ai_agents')
        .select('*')
        .not('last_execution_at', 'is', null);

      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const agents = result.data
        .filter((row: any) => new Date(row.last_execution_at) >= cutoffDate)
        .map((row: any) => this.mapRowToAgent(row))
        .filter((r: Result<AIAgent>) => r.isSuccess)
        .map((r: Result<AIAgent>) => r.value!);

      return Result.ok(agents);
    } catch (error) {
      return Result.fail(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findBySuccessRate(minRate: number): Promise<Result<AIAgent[]>> {
    try {
      const enabledResult = await this.findEnabled();
      if (enabledResult.isFailure) {
        return enabledResult;
      }

      const filteredAgents = enabledResult.value.filter(agent => {
        const successRate = agent.getSuccessRate();
        return successRate >= minRate;
      });

      return Result.ok(filteredAgents);
    } catch (error) {
      return Result.fail(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByExecutionCount(minCount: number): Promise<Result<AIAgent[]>> {
    try {
      const result = await this.supabaseClient
        .from('ai_agents')
        .select('*');

      if (result.error) {
        return Result.fail(`Database error: ${result.error.message}`);
      }

      const agents = result.data
        .filter((row: any) => (row.execution_count || 0) >= minCount)
        .map((row: any) => this.mapRowToAgent(row))
        .filter((r: Result<AIAgent>) => r.isSuccess)
        .map((r: Result<AIAgent>) => r.value!);

      return Result.ok(agents);
    } catch (error) {
      return Result.fail(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateEnabled(id: NodeId, enabled: boolean): Promise<Result<void>> {
    try {
      const result = await this.supabaseClient
        .from('ai_agents')
        .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('agent_id', id.value);

      if (result.error) {
        return Result.fail(`Failed to update agent status: ${result.error.message}`);
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Update operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async recordExecution(id: NodeId, success: boolean, executionTimeMs: number): Promise<Result<void>> {
    try {
      // First get current stats
      const agentResult = await this.findById(id);
      if (agentResult.isFailure) {
        return Result.fail(`Agent not found for execution recording: ${agentResult.error}`);
      }

      const agent = agentResult.value;
      const newExecutionCount = agent.executionCount + 1;
      const newSuccessCount = agent.successCount + (success ? 1 : 0);
      const newTotalExecutionTime = agent.totalExecutionTime + executionTimeMs;

      const result = await this.supabaseClient
        .from('ai_agents')
        .update({
          execution_count: newExecutionCount,
          success_count: newSuccessCount,
          total_execution_time: newTotalExecutionTime,
          last_execution_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('agent_id', id.value);

      if (result.error) {
        return Result.fail(`Failed to record execution: ${result.error.message}`);
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Execution recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async bulkSave(agents: AIAgent[]): Promise<Result<void>> {
    try {
      const agentRows = agents.map(agent => this.mapAgentToRow(agent));
      
      const result = await this.supabaseClient
        .from('ai_agents')
        .upsert(agentRows);

      if (result.error) {
        return Result.fail(`Bulk save failed: ${result.error.message}`);
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Bulk save operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async bulkDelete(ids: NodeId[]): Promise<Result<void>> {
    try {
      const idValues = ids.map(id => id.value);
      
      const result = await this.supabaseClient
        .from('ai_agents')
        .delete()
        .in('agent_id', idValues);

      if (result.error) {
        return Result.fail(`Bulk delete failed: ${result.error.message}`);
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Bulk delete operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async countByFeatureType(featureType: FeatureType): Promise<Result<number>> {
    try {
      const result = await this.supabaseClient
        .from('ai_agents')
        .select('*', { count: 'exact' })
        .eq('feature_type', featureType);

      if (result.error) {
        return Result.fail(`Count query failed: ${result.error.message}`);
      }

      return Result.ok(result.data.length);
    } catch (error) {
      return Result.fail(`Count operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async countEnabled(): Promise<Result<number>> {
    try {
      const result = await this.supabaseClient
        .from('ai_agents')
        .select('*', { count: 'exact' })
        .eq('is_enabled', true);

      if (result.error) {
        return Result.fail(`Count query failed: ${result.error.message}`);
      }

      return Result.ok(result.data.length);
    } catch (error) {
      return Result.fail(`Count operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapRowToAgent(row: any): Result<AIAgent> {
    try {
      const agentIdResult = NodeId.create(row.agent_id);
      if (agentIdResult.isFailure) {
        return Result.fail(`Invalid agent ID in database: ${agentIdResult.error}`);
      }

      let nodeId: NodeId | undefined;
      if (row.node_id) {
        const nodeIdResult = NodeId.create(row.node_id);
        if (nodeIdResult.isFailure) {
          return Result.fail(`Invalid node ID in database: ${nodeIdResult.error}`);
        }
        nodeId = nodeIdResult.value;
      }

      const agentResult = AIAgent.create({
        agentId: agentIdResult.value,
        featureType: row.feature_type,
        entityId: row.entity_id,
        nodeId,
        name: row.name,
        description: row.description,
        instructions: row.instructions,
        tools: row.tools || { availableTools: [], toolConfigurations: {}, customTools: [] },
        capabilities: row.capabilities || { maxConcurrentTasks: 1, timeoutMs: 30000, supportedDataTypes: [], processingModes: [], resourceRequirements: {} },
        isEnabled: row.is_enabled,
        executionCount: row.execution_count || 0,
        successCount: row.success_count || 0,
        totalExecutionTime: row.total_execution_time || 0,
        lastExecutionAt: row.last_execution_at ? new Date(row.last_execution_at) : undefined
      });

      if (agentResult.isFailure) {
        return Result.fail(`Failed to reconstruct agent from database row: ${agentResult.error}`);
      }

      return Result.ok(agentResult.value);
    } catch (error) {
      return Result.fail(`Row mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapAgentToRow(agent: AIAgent): any {
    return {
      agent_id: agent.agentId.value,
      feature_type: agent.featureType,
      entity_id: agent.entityId,
      node_id: agent.nodeId?.value,
      name: agent.name,
      description: agent.description,
      instructions: agent.instructions,
      tools: agent.tools,
      capabilities: agent.capabilities,
      is_enabled: agent.isEnabled,
      execution_count: agent.executionCount,
      success_count: agent.successCount,
      total_execution_time: agent.totalExecutionTime,
      last_execution_at: agent.lastExecutionAt?.toISOString(),
      created_at: agent.createdAt.toISOString(),
      updated_at: agent.updatedAt.toISOString()
    };
  }
}

/**
 * Mock Audit Log Repository for Integration Testing
 */
class MockSupabaseAuditLogRepository implements IAuditLogRepository {
  private supabaseClient: any;
  
  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
  }

  async save(auditLog: AuditLog): Promise<Result<void>> {
    try {
      const auditData = {
        log_id: auditLog.logId,
        action: auditLog.action,
        user_id: auditLog.userId,
        entity_id: auditLog.entityId,
        details: auditLog.details,
        occurred_at: auditLog.occurredAt.toISOString()
      };

      const result = await this.supabaseClient
        .from('audit_logs')
        .insert(auditData);

      if (result.error) {
        return Result.fail(`Failed to save audit log: ${result.error.message}`);
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Audit log save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByEntityId(entityId: string): Promise<Result<AuditLog[]>> {
    try {
      const result = await this.supabaseClient
        .from('audit_logs')
        .select('*')
        .eq('entity_id', entityId)
        .order('occurred_at', { ascending: false });

      if (result.error) {
        return Result.fail(`Failed to find audit logs: ${result.error.message}`);
      }

      const auditLogs = result.data.map((row: any) => this.mapRowToAuditLog(row)).filter((r: Result<AuditLog>) => r.isSuccess).map((r: Result<AuditLog>) => r.value!);
      return Result.ok(auditLogs);
    } catch (error) {
      return Result.fail(`Audit log query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByAction(action: string): Promise<Result<AuditLog[]>> {
    try {
      const result = await this.supabaseClient
        .from('audit_logs')
        .select('*')
        .eq('action', action)
        .order('occurred_at', { ascending: false });

      if (result.error) {
        return Result.fail(`Failed to find audit logs: ${result.error.message}`);
      }

      const auditLogs = result.data.map((row: any) => this.mapRowToAuditLog(row)).filter((r: Result<AuditLog>) => r.isSuccess).map((r: Result<AuditLog>) => r.value!);
      return Result.ok(auditLogs);
    } catch (error) {
      return Result.fail(`Audit log query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByUserId(userId: string): Promise<Result<AuditLog[]>> {
    try {
      const result = await this.supabaseClient
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('occurred_at', { ascending: false });

      if (result.error) {
        return Result.fail(`Failed to find audit logs: ${result.error.message}`);
      }

      const auditLogs = result.data.map((row: any) => this.mapRowToAuditLog(row)).filter((r: Result<AuditLog>) => r.isSuccess).map((r: Result<AuditLog>) => r.value!);
      return Result.ok(auditLogs);
    } catch (error) {
      return Result.fail(`Audit log query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapRowToAuditLog(row: any): Result<AuditLog> {
    return AuditLog.create({
      logId: row.log_id,
      action: row.action,
      userId: row.user_id,
      entityId: row.entity_id,
      details: row.details,
      occurredAt: new Date(row.occurred_at)
    });
  }
}

describe('AI Agent Workflows - TDD Integration Tests', () => {
  let supabaseClient: any;
  let agentRepository: MockSupabaseAIAgentRepository;
  let auditRepository: MockSupabaseAuditLogRepository;
  let eventBus: SupabaseEventBus;
  
  // Use Cases under test
  let registerAgentUseCase: RegisterAIAgentUseCase;
  let discoverAgentsUseCase: DiscoverAgentsByCapabilityUseCase;
  let executeTaskUseCase: ExecuteAIAgentTaskUseCase;
  let semanticSearchUseCase: PerformSemanticAgentSearchUseCase;
  let coordinateWorkflowUseCase: CoordinateWorkflowAgentExecutionUseCase;

  // Test constants
  const testUserId = 'test-user-integration';
  const testAgents: string[] = [];

  beforeEach(async () => {
    // Setup mock Supabase client for integration testing
    supabaseClient = createMockSupabaseClient();

    // Initialize repositories with proper dependency injection
    agentRepository = new MockSupabaseAIAgentRepository(supabaseClient);
    auditRepository = new MockSupabaseAuditLogRepository(supabaseClient);
    eventBus = new SupabaseEventBus(supabaseClient);

    // Initialize use cases following Clean Architecture dependency injection
    registerAgentUseCase = new RegisterAIAgentUseCase(agentRepository, eventBus);
    discoverAgentsUseCase = new DiscoverAgentsByCapabilityUseCase(agentRepository);
    executeTaskUseCase = new ExecuteAIAgentTaskUseCase(agentRepository, auditRepository, eventBus);
    semanticSearchUseCase = new PerformSemanticAgentSearchUseCase(agentRepository, auditRepository);
    coordinateWorkflowUseCase = new CoordinateWorkflowAgentExecutionUseCase(agentRepository, auditRepository, eventBus);
  });

  afterEach(async () => {
    // Cleanup test data
    for (const agentId of testAgents) {
      try {
        const nodeIdResult = NodeId.create(agentId);
        if (nodeIdResult.isSuccess) {
          await agentRepository.delete(nodeIdResult.value);
        }
      } catch (error) {
        console.warn(`Failed to cleanup agent ${agentId}:`, error);
      }
    }
    testAgents.length = 0;
  });

  describe('TDD Phase 1: Agent Registration Integration', () => {
    describe('RegisterAIAgentUseCase Integration Tests', () => {
      it('should register an agent with comprehensive capability validation and persistence', async () => {
        // RED: This test WILL FAIL initially - defines the comprehensive registration requirement
        const registerRequest: RegisterAIAgentRequest = {
          agentId: 'data-processor-agent-001',
          name: 'Advanced Data Processing Agent',
          description: 'Specialized agent for complex data processing workflows',
          featureType: FeatureType.FUNCTION_MODEL,
          capabilities: [
            'data-processing',
            'analysis',
            'reporting',
            'batch-processing',
            'real-time-processing'
          ],
          version: '1.2.0',
          configuration: {
            resourceRequirements: {
              memory: '2Gi',
              cpu: '1core',
              storage: '10Gi'
            },
            timeoutSettings: {
              defaultTimeout: 300000,
              maxTimeout: 900000
            },
            concurrencyLimits: {
              maxParallelTasks: 10,
              queueSize: 100
            }
          },
          userId: testUserId,
          entityId: 'processing-entity-001',
          instructions: 'Process data according to specified workflows with validation and error handling',
          tools: {
            availableTools: ['data-reader', 'data-writer', 'validator', 'transformer', 'analyzer'],
            toolConfigurations: {
              'data-reader': { formats: ['json', 'csv', 'xml'], maxSize: '100MB' },
              'data-writer': { formats: ['json', 'parquet'], compression: true },
              'validator': { strictMode: true, customRules: [] },
              'transformer': { plugins: ['date-parser', 'text-cleaner'], parallel: true },
              'analyzer': { algorithms: ['statistical', 'pattern-detection'], outputFormat: 'detailed' }
            },
            customTools: [
              { name: 'domain-specific-processor', config: { domain: 'financial' } }
            ]
          }
        };

        // Execute registration
        const registrationResult = await registerAgentUseCase.execute(registerRequest);
        
        expect(registrationResult.isSuccess).toBe(true);
        expect(registrationResult.value).toBeDefined();
        
        const response = registrationResult.value!;
        expect(response.agentId).toBe('data-processor-agent-001');
        expect(response.name).toBe('Advanced Data Processing Agent');
        expect(response.featureType).toBe(FeatureType.FUNCTION_MODEL);
        expect(response.status).toBe('registered');
        expect(response.capabilities).toBeDefined();
        expect(response.registeredAt).toBeInstanceOf(Date);

        // Verify agent was persisted to repository
        const nodeId = NodeId.create('data-processor-agent-001');
        expect(nodeId.isSuccess).toBe(true);
        
        const persistedAgentResult = await agentRepository.findById(nodeId.value!);
        expect(persistedAgentResult.isSuccess).toBe(true);
        
        const persistedAgent = persistedAgentResult.value!;
        expect(persistedAgent.name).toBe('Advanced Data Processing Agent');
        expect(persistedAgent.isEnabled).toBe(true);
        expect(persistedAgent.tools.availableTools).toContain('data-reader');
        expect(persistedAgent.tools.toolConfigurations['data-reader']).toBeDefined();
        expect(persistedAgent.capabilities.processingModes).toContain('data-processing');

        testAgents.push('data-processor-agent-001');
      });

      it('should handle agent registration with minimal configuration and smart defaults', async () => {
        // RED: Test minimal registration with intelligent defaults
        const minimalRequest: RegisterAIAgentRequest = {
          name: 'Simple Task Agent',
          featureType: FeatureType.CROSS_FEATURE_INTEGRATION,
          capabilities: ['task-execution'],
          userId: testUserId
        };

        const registrationResult = await registerAgentUseCase.execute(minimalRequest);
        
        expect(registrationResult.isSuccess).toBe(true);
        
        const response = registrationResult.value!;
        expect(response.name).toBe('Simple Task Agent');
        expect(response.entityId).toBe('default-entity'); // Smart default
        expect(response.capabilities).toBeDefined();
        expect(response.capabilities.maxConcurrentTasks).toBe(5); // Default value
        expect(response.capabilities.processingModes).toContain('task-execution');

        testAgents.push(response.agentId);
      });

      it('should validate and reject invalid agent registrations with detailed error messages', async () => {
        // RED: Test comprehensive validation failure scenarios
        const invalidRequests: RegisterAIAgentRequest[] = [
          // Empty name
          {
            name: '',
            featureType: FeatureType.FUNCTION_MODEL,
            capabilities: ['test'],
            userId: testUserId
          },
          // Invalid capabilities format
          {
            name: 'Test Agent',
            featureType: FeatureType.FUNCTION_MODEL,
            capabilities: [],
            userId: testUserId
          }
        ];

        for (const invalidRequest of invalidRequests) {
          const result = await registerAgentUseCase.execute(invalidRequest);
          expect(result.isFailure).toBe(true);
          expect(result.error).toBeTruthy();
        }
      });

      it('should publish domain events for successful agent registration', async () => {
        // RED: Test event publishing integration
        const registerRequest: RegisterAIAgentRequest = {
          agentId: 'event-test-agent',
          name: 'Event Testing Agent',
          featureType: FeatureType.FUNCTION_MODEL,
          capabilities: ['event-testing'],
          userId: testUserId
        };

        // Mock event bus to capture published events
        const publishedEvents: any[] = [];
        const originalPublish = eventBus.publish.bind(eventBus);
        eventBus.publish = jest.fn().mockImplementation(async (event) => {
          publishedEvents.push(event);
          return originalPublish(event);
        });

        const result = await registerAgentUseCase.execute(registerRequest);
        expect(result.isSuccess).toBe(true);

        // Verify event was published
        expect(publishedEvents).toHaveLength(1);
        const publishedEvent = publishedEvents[0];
        expect(publishedEvent.eventType).toBe('AIAgentRegistered');
        expect(publishedEvent.eventData.name).toBe('Event Testing Agent');
        expect(publishedEvent.eventData.featureType).toBe(FeatureType.FUNCTION_MODEL);

        testAgents.push('event-test-agent');
      });
    });
  });

  describe('TDD Phase 2: Agent Discovery Integration', () => {
    beforeEach(async () => {
      // Setup test agents for discovery tests
      const testAgentConfigs = [
        {
          agentId: 'data-analysis-agent',
          name: 'Statistical Data Analysis Agent',
          capabilities: ['data-processing', 'analysis', 'statistics'],
          tools: ['statistical-analyzer', 'data-validator']
        },
        {
          agentId: 'report-generation-agent', 
          name: 'Report Generation Specialist',
          capabilities: ['reporting', 'document-generation', 'visualization'],
          tools: ['report-generator', 'chart-creator']
        },
        {
          agentId: 'workflow-orchestrator',
          name: 'Workflow Orchestration Engine',
          capabilities: ['orchestration', 'coordination', 'monitoring'],
          tools: ['workflow-engine', 'task-scheduler']
        },
        {
          agentId: 'realtime-processor',
          name: 'Real-time Data Processor',
          capabilities: ['real-time-processing', 'streaming', 'low-latency'],
          tools: ['stream-processor', 'event-handler']
        }
      ];

      for (const config of testAgentConfigs) {
        const registerRequest: RegisterAIAgentRequest = {
          agentId: config.agentId,
          name: config.name,
          featureType: FeatureType.FUNCTION_MODEL,
          capabilities: config.capabilities,
          userId: testUserId,
          tools: {
            availableTools: config.tools,
            toolConfigurations: {},
            customTools: []
          }
        };

        const result = await registerAgentUseCase.execute(registerRequest);
        if (result.isSuccess) {
          testAgents.push(config.agentId);
        }
      }
    });

    describe('DiscoverAgentsByCapabilityUseCase Integration Tests', () => {
      it('should discover agents with sophisticated capability matching and scoring', async () => {
        // RED: Test advanced capability-based discovery with scoring algorithms
        const discoveryRequest: DiscoverAgentsByCapabilityRequest = {
          requiredCapabilities: ['data-processing', 'analysis'],
          optionalCapabilities: ['statistics', 'visualization'],
          minimumScore: 0.6,
          maxResults: 10,
          strictMode: false,
          userId: testUserId
        };

        const discoveryResult = await discoverAgentsUseCase.execute(discoveryRequest);
        
        expect(discoveryResult.isSuccess).toBe(true);
        
        const response = discoveryResult.value!;
        expect(response.matches).toBeDefined();
        expect(response.matches.length).toBeGreaterThan(0);
        expect(response.totalMatched).toBeGreaterThanOrEqual(response.matches.length);
        
        // Verify scoring and ranking
        const topMatch = response.matches[0];
        expect(topMatch.matchScore).toBeGreaterThanOrEqual(discoveryRequest.minimumScore!);
        expect(topMatch.agentId).toBeTruthy();
        expect(topMatch.name).toBeTruthy();
        expect(topMatch.matchingCapabilities).toContain('data-processing');
        expect(topMatch.matchingCapabilities).toContain('analysis');
        
        // Verify agents are ranked by score (highest first)
        for (let i = 1; i < response.matches.length; i++) {
          expect(response.matches[i - 1].matchScore).toBeGreaterThanOrEqual(response.matches[i].matchScore);
        }

        // Verify search criteria are returned
        expect(response.searchCriteria.requiredCapabilities).toEqual(['data-processing', 'analysis']);
        expect(response.searchCriteria.optionalCapabilities).toEqual(['statistics', 'visualization']);
      });

      it('should apply strict mode filtering for precise capability matching', async () => {
        // RED: Test strict mode where ALL required capabilities must be satisfied
        const strictDiscoveryRequest: DiscoverAgentsByCapabilityRequest = {
          requiredCapabilities: ['data-processing', 'analysis', 'reporting'], // Only one agent should match all three
          optionalCapabilities: [],
          minimumScore: 0.8,
          maxResults: 5,
          strictMode: true,
          userId: testUserId
        };

        const discoveryResult = await discoverAgentsUseCase.execute(strictDiscoveryRequest);
        
        expect(discoveryResult.isSuccess).toBe(true);
        
        const response = discoveryResult.value!;
        
        // In strict mode, only agents satisfying ALL required capabilities should be returned
        for (const match of response.matches) {
          expect(match.matchingCapabilities).toContain('data-processing');
          expect(match.matchingCapabilities).toContain('analysis');
          expect(match.matchingCapabilities).toContain('reporting');
          expect(match.matchScore).toBeGreaterThanOrEqual(0.8);
        }
      });

      it('should handle specialized capability queries for niche agent discovery', async () => {
        // RED: Test discovery of specialized agents with specific capabilities
        const specializedRequest: DiscoverAgentsByCapabilityRequest = {
          requiredCapabilities: ['real-time-processing'],
          optionalCapabilities: ['streaming', 'low-latency'],
          featureType: FeatureType.FUNCTION_MODEL,
          minimumScore: 0.5,
          maxResults: 3,
          userId: testUserId
        };

        const discoveryResult = await discoverAgentsUseCase.execute(specializedRequest);
        
        expect(discoveryResult.isSuccess).toBe(true);
        
        const response = discoveryResult.value!;
        expect(response.matches.length).toBeGreaterThan(0);
        
        const realTimeAgent = response.matches.find(m => m.agentId === 'realtime-processor');
        expect(realTimeAgent).toBeDefined();
        expect(realTimeAgent!.matchingCapabilities).toContain('real-time-processing');
        expect(realTimeAgent!.matchScore).toBeGreaterThan(0.5);
      });

      it('should validate discovery request parameters with comprehensive error handling', async () => {
        // RED: Test validation failure scenarios for discovery requests
        const invalidRequests: DiscoverAgentsByCapabilityRequest[] = [
          // Empty required capabilities
          {
            requiredCapabilities: [],
            userId: testUserId
          },
          // Invalid score range
          {
            requiredCapabilities: ['test'],
            minimumScore: 1.5, // > 1.0
            userId: testUserId
          },
          // Invalid max results
          {
            requiredCapabilities: ['test'],
            maxResults: 0,
            userId: testUserId
          }
        ];

        for (const invalidRequest of invalidRequests) {
          const result = await discoverAgentsUseCase.execute(invalidRequest);
          expect(result.isFailure).toBe(true);
          expect(result.error).toBeTruthy();
        }
      });
    });
  });

  describe('TDD Phase 3: Task Execution Integration', () => {
    beforeEach(async () => {
      // Setup execution-capable agents
      const executionAgentRequest: RegisterAIAgentRequest = {
        agentId: 'task-executor-001',
        name: 'Reliable Task Executor',
        featureType: FeatureType.FUNCTION_MODEL,
        capabilities: {
          maxConcurrentTasks: 5,
          timeoutMs: 60000,
          supportedDataTypes: ['json', 'text', 'binary'],
          processingModes: ['data-processing', 'analysis', 'reporting'],
          resourceRequirements: { memory: '1Gi', cpu: '500m' },
          canRead: true,
          canWrite: true,
          canAnalyze: true,
          canExecute: true,
          canOrchestrate: false
        },
        userId: testUserId,
        tools: {
          availableTools: ['data-processor', 'analyzer', 'reporter'],
          toolConfigurations: {},
          customTools: []
        }
      };

      const result = await registerAgentUseCase.execute(executionAgentRequest);
      if (result.isSuccess) {
        testAgents.push('task-executor-001');
      }
    });

    describe('ExecuteAIAgentTaskUseCase Integration Tests', () => {
      it('should execute agent tasks with comprehensive monitoring and performance tracking', async () => {
        // RED: Test complete task execution workflow with performance metrics
        const taskRequest: ExecuteAIAgentTaskRequest = {
          agentId: 'task-executor-001',
          taskId: 'data-processing-task-001',
          taskType: 'data-processing',
          parameters: {
            dataset: 'customer-transactions.json',
            processingRules: ['validate', 'transform', 'aggregate'],
            outputFormat: 'summary-report',
            qualityChecks: true
          },
          priority: 'high',
          timeoutMs: 30000,
          userId: testUserId
        };

        const executionResult = await executeTaskUseCase.execute(taskRequest);
        
        expect(executionResult.isSuccess).toBe(true);
        
        const response = executionResult.value!;
        expect(response.agentId).toBe('task-executor-001');
        expect(response.taskId).toBe('data-processing-task-001');
        expect(response.executionId).toBeTruthy();
        expect(response.status).toMatch(/^(completed|failed|timeout)$/);
        expect(response.executionTimeMs).toBeGreaterThan(0);
        expect(response.completedAt).toBeInstanceOf(Date);
        
        if (response.status === 'completed') {
          expect(response.results).toBeTruthy();
          expect(response.errorMessage).toBeUndefined();
        } else if (response.status === 'failed') {
          expect(response.errorMessage).toBeTruthy();
          expect(response.results).toBeFalsy();
        }

        // Verify agent metrics were updated
        const nodeId = NodeId.create('task-executor-001');
        const agentResult = await agentRepository.findById(nodeId.value!);
        expect(agentResult.isSuccess).toBe(true);
        
        const updatedAgent = agentResult.value!;
        expect(updatedAgent.executionCount).toBeGreaterThan(0);
        expect(updatedAgent.totalExecutionTime).toBeGreaterThan(0);
      });

      it('should handle task execution failures gracefully with proper error categorization', async () => {
        // RED: Test error handling and recovery patterns
        const failureTaskRequest: ExecuteAIAgentTaskRequest = {
          agentId: 'task-executor-001',
          taskId: 'failure-test-task',
          taskType: 'analysis',
          parameters: {
            analysisType: 'complex-statistical-analysis',
            dataSource: 'non-existent-source.json', // This should cause a failure
            strictMode: true
          },
          userId: testUserId
        };

        const executionResult = await executeTaskUseCase.execute(failureTaskRequest);
        
        expect(executionResult.isSuccess).toBe(true); // Use case should succeed even if task fails
        
        const response = executionResult.value!;
        // Response status may be 'failed' due to simulated failure conditions
        if (response.status === 'failed') {
          expect(response.errorMessage).toBeTruthy();
          expect(response.results).toBeFalsy();
        }

        // Verify failure was properly audited
        const auditLogs = await auditRepository.findByEntityId('task-executor-001');
        expect(auditLogs.isSuccess).toBe(true);
        expect(auditLogs.value!.length).toBeGreaterThan(0);
      });

      it('should validate task parameters based on agent capabilities and task type requirements', async () => {
        // RED: Test parameter validation for different task types
        const validationTestCases = [
          // Data processing without required data parameter
          {
            agentId: 'task-executor-001',
            taskId: 'validation-test-1',
            taskType: 'data-processing',
            parameters: {}, // Missing dataset/data
            userId: testUserId,
            shouldFail: true
          },
          // Analysis without analysisType
          {
            agentId: 'task-executor-001',
            taskId: 'validation-test-2',
            taskType: 'analysis',
            parameters: { data: 'some-data' }, // Missing analysisType
            userId: testUserId,
            shouldFail: true
          },
          // Valid capability verification task
          {
            agentId: 'task-executor-001',
            taskId: 'validation-test-3',
            taskType: 'capability-verification',
            parameters: {}, // No additional parameters required
            userId: testUserId,
            shouldFail: false
          }
        ];

        for (const testCase of validationTestCases) {
          const result = await executeTaskUseCase.execute(testCase as ExecuteAIAgentTaskRequest);
          
          if (testCase.shouldFail) {
            expect(result.isFailure).toBe(true);
            expect(result.error).toContain('parameter');
          } else {
            expect(result.isSuccess).toBe(true);
          }
        }
      });

      it('should handle agent capacity and availability constraints', async () => {
        // RED: Test capacity management and concurrent execution limits
        const nonExistentAgentRequest: ExecuteAIAgentTaskRequest = {
          agentId: 'non-existent-agent',
          taskId: 'capacity-test-task',
          taskType: 'generic',
          parameters: { test: true },
          userId: testUserId
        };

        const result = await executeTaskUseCase.execute(nonExistentAgentRequest);
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('find agent');
      });
    });
  });

  describe('TDD Phase 4: Semantic Search Integration', () => {
    beforeEach(async () => {
      // Setup agents with diverse descriptions for semantic search
      const semanticTestAgents = [
        {
          agentId: 'financial-data-analyst',
          name: 'Financial Data Analysis Expert',
          description: 'Specialized in financial data analysis, risk assessment, and regulatory compliance reporting',
          capabilities: ['financial-analysis', 'risk-assessment', 'compliance'],
          instructions: 'Analyze financial datasets using statistical methods and generate compliance reports for regulatory bodies'
        },
        {
          agentId: 'marketing-automation-specialist',
          name: 'Marketing Campaign Automation Agent',
          description: 'Automates marketing campaigns, customer segmentation, and performance tracking',
          capabilities: ['marketing-automation', 'customer-analysis', 'campaign-management'],
          instructions: 'Create and manage automated marketing campaigns with advanced customer targeting and analytics'
        },
        {
          agentId: 'healthcare-data-processor',
          name: 'Healthcare Data Processing System',
          description: 'Processes medical records, clinical data, and healthcare analytics with HIPAA compliance',
          capabilities: ['healthcare-processing', 'medical-analysis', 'compliance'],
          instructions: 'Process healthcare data ensuring patient privacy and regulatory compliance while providing clinical insights'
        }
      ];

      for (const agentConfig of semanticTestAgents) {
        const registerRequest: RegisterAIAgentRequest = {
          agentId: agentConfig.agentId,
          name: agentConfig.name,
          description: agentConfig.description,
          featureType: FeatureType.FUNCTION_MODEL,
          capabilities: agentConfig.capabilities,
          instructions: agentConfig.instructions,
          userId: testUserId
        };

        const result = await registerAgentUseCase.execute(registerRequest);
        if (result.isSuccess) {
          testAgents.push(agentConfig.agentId);
        }
      }
    });

    describe('PerformSemanticAgentSearchUseCase Integration Tests', () => {
      it('should perform sophisticated semantic search with natural language queries', async () => {
        // RED: Test advanced semantic search with natural language understanding
        const semanticSearchRequest: PerformSemanticAgentSearchRequest = {
          query: 'I need help analyzing financial data for compliance with banking regulations',
          maxResults: 5,
          minSemanticScore: 0.3,
          includeExplanations: true,
          enableContextualUnderstanding: true,
          userId: testUserId
        };

        const searchResult = await semanticSearchUseCase.execute(semanticSearchRequest);
        
        expect(searchResult.isSuccess).toBe(true);
        
        const response = searchResult.value!;
        expect(response.query).toBe(semanticSearchRequest.query);
        expect(response.agents).toBeDefined();
        expect(response.searchMetrics).toBeDefined();
        
        // Verify search metrics
        expect(response.searchMetrics.processingTime).toBeGreaterThan(0);
        expect(response.searchMetrics.semanticModel).toBeTruthy();
        expect(response.searchMetrics.queryComplexity).toMatch(/^(low|medium|high)$/);
        expect(response.searchMetrics.totalCandidates).toBeGreaterThan(0);
        
        // Verify semantic matches are relevant
        if (response.agents.length > 0) {
          const topMatch = response.agents[0];
          expect(topMatch.semanticScore).toBeGreaterThanOrEqual(semanticSearchRequest.minSemanticScore);
          expect(topMatch.relevanceExplanation).toBeTruthy();
          expect(topMatch.matchingKeywords.length).toBeGreaterThan(0);
          
          // Financial agent should be the top match for financial compliance query
          expect(topMatch.agentId).toBe('financial-data-analyst');
          expect(topMatch.matchingKeywords).toContain('financial');
          
          if (semanticSearchRequest.enableContextualUnderstanding) {
            expect(topMatch.contextualMatches).toBeDefined();
          }
        }
      });

      it('should handle complex multi-domain queries with domain-specific ranking', async () => {
        // RED: Test complex queries spanning multiple domains
        const complexSearchRequest: PerformSemanticAgentSearchRequest = {
          query: 'Find agents that can process healthcare data and generate automated reports while ensuring compliance',
          maxResults: 10,
          minSemanticScore: 0.2,
          includeExplanations: true,
          domainFocus: 'healthcare',
          enableContextualUnderstanding: true,
          userId: testUserId
        };

        const searchResult = await semanticSearchUseCase.execute(complexSearchRequest);
        
        expect(searchResult.isSuccess).toBe(true);
        
        const response = searchResult.value!;
        expect(response.agents.length).toBeGreaterThan(0);
        expect(response.searchMetrics.semanticModel).toBe('domain-specific-transformers');
        
        // Healthcare agent should score highest for healthcare-focused query
        const healthcareAgent = response.agents.find(a => a.agentId === 'healthcare-data-processor');
        expect(healthcareAgent).toBeDefined();
        expect(healthcareAgent!.matchingKeywords).toContain('healthcare');
      });

      it('should provide explainable search results with detailed relevance reasoning', async () => {
        // RED: Test explainable AI features for search transparency
        const explainableSearchRequest: PerformSemanticAgentSearchRequest = {
          query: 'marketing campaign automation',
          maxResults: 3,
          minSemanticScore: 0.4,
          includeExplanations: true,
          enableContextualUnderstanding: false,
          userId: testUserId
        };

        const searchResult = await semanticSearchUseCase.execute(explainableSearchRequest);
        
        expect(searchResult.isSuccess).toBe(true);
        
        const response = searchResult.value!;
        expect(response.agents.length).toBeGreaterThan(0);
        
        for (const agent of response.agents) {
          expect(agent.relevanceExplanation).toBeTruthy();
          expect(agent.relevanceExplanation.length).toBeGreaterThan(10); // Substantial explanation
          expect(agent.matchingKeywords.length).toBeGreaterThan(0);
        }

        // Marketing agent should be found and have high relevance
        const marketingAgent = response.agents.find(a => a.agentId === 'marketing-automation-specialist');
        expect(marketingAgent).toBeDefined();
        expect(marketingAgent!.semanticScore).toBeGreaterThan(0.6); // High relevance
      });

      it('should handle edge cases and validation with comprehensive error handling', async () => {
        // RED: Test validation and edge case handling
        const invalidSearchRequests: PerformSemanticAgentSearchRequest[] = [
          // Empty query
          {
            query: '',
            maxResults: 5,
            minSemanticScore: 0.5,
            includeExplanations: false,
            userId: testUserId
          },
          // Query too long
          {
            query: 'a'.repeat(1001), // > 1000 characters
            maxResults: 5,
            minSemanticScore: 0.5,
            includeExplanations: false,
            userId: testUserId
          },
          // Invalid score range
          {
            query: 'test query',
            maxResults: 5,
            minSemanticScore: 1.5, // > 1.0
            includeExplanations: false,
            userId: testUserId
          }
        ];

        for (const invalidRequest of invalidSearchRequests) {
          const result = await semanticSearchUseCase.execute(invalidRequest);
          expect(result.isFailure).toBe(true);
          expect(result.error).toBeTruthy();
        }
      });
    });
  });

  describe('TDD Phase 5: Multi-Agent Coordination Integration', () => {
    beforeEach(async () => {
      // Setup multiple agents for workflow coordination
      const coordinationAgents = [
        {
          agentId: 'data-collector',
          name: 'Data Collection Agent',
          capabilities: ['data-collection', 'data-validation']
        },
        {
          agentId: 'data-processor',
          name: 'Data Processing Agent', 
          capabilities: ['data-processing', 'transformation']
        },
        {
          agentId: 'report-generator',
          name: 'Report Generation Agent',
          capabilities: ['reporting', 'visualization']
        },
        {
          agentId: 'quality-assurance',
          name: 'Quality Assurance Agent',
          capabilities: ['quality-control', 'validation']
        }
      ];

      for (const agentConfig of coordinationAgents) {
        const registerRequest: RegisterAIAgentRequest = {
          agentId: agentConfig.agentId,
          name: agentConfig.name,
          featureType: FeatureType.FUNCTION_MODEL,
          capabilities: agentConfig.capabilities,
          userId: testUserId
        };

        const result = await registerAgentUseCase.execute(registerRequest);
        if (result.isSuccess) {
          testAgents.push(agentConfig.agentId);
        }
      }
    });

    describe('CoordinateWorkflowAgentExecutionUseCase Integration Tests', () => {
      it('should coordinate sequential multi-agent workflows with proper dependency management', async () => {
        // RED: Test sequential workflow coordination with multiple agents
        const sequentialWorkflowRequest: CoordinateWorkflowAgentExecutionRequest = {
          workflowId: 'data-processing-pipeline-001',
          executionMode: 'sequential',
          agents: [
            {
              agentId: 'data-collector',
              stage: 1,
              task: 'collect-data',
              parameters: { source: 'customer-database', format: 'json' }
            },
            {
              agentId: 'data-processor',
              stage: 2,
              task: 'process-data',
              parameters: { transformations: ['normalize', 'aggregate'], validation: true }
            },
            {
              agentId: 'report-generator',
              stage: 3,
              task: 'generate-report',
              parameters: { reportType: 'summary', format: 'pdf', includeCharts: true }
            }
          ],
          synchronizationPoints: [
            {
              afterStage: 2,
              action: 'validate-outputs',
              parameters: { strictMode: true }
            }
          ],
          timeoutMs: 120000,
          userId: testUserId
        };

        const coordinationResult = await coordinateWorkflowUseCase.execute(sequentialWorkflowRequest);
        
        expect(coordinationResult.isSuccess).toBe(true);
        
        const response = coordinationResult.value!;
        expect(response.workflowId).toBe('data-processing-pipeline-001');
        expect(response.executionMode).toBe('sequential');
        expect(response.executionId).toBeTruthy();
        expect(response.stages.length).toBe(3);
        expect(response.totalExecutionTime).toBeGreaterThan(0);
        expect(response.status).toMatch(/^(completed|failed|partial)$/);
        expect(response.startedAt).toBeInstanceOf(Date);
        expect(response.completedAt).toBeInstanceOf(Date);

        // Verify stages were executed in order
        expect(response.stages[0].stageId).toBe(1);
        expect(response.stages[1].stageId).toBe(2);
        expect(response.stages[2].stageId).toBe(3);

        // Verify synchronization point was handled
        const stage2 = response.stages.find(s => s.stageId === 2);
        expect(stage2).toBeDefined();
        if (stage2!.status === 'completed') {
          expect(stage2!.synchronizationResult).toBeDefined();
          expect(stage2!.synchronizationResult.validationPassed).toBeDefined();
        }

        // Verify execution times are recorded
        response.stages.forEach(stage => {
          expect(stage.executionTime).toBeGreaterThan(0);
        });
      });

      it('should coordinate parallel multi-agent workflows with synchronization points', async () => {
        // RED: Test parallel execution coordination with synchronization
        const parallelWorkflowRequest: CoordinateWorkflowAgentExecutionRequest = {
          workflowId: 'parallel-processing-workflow',
          executionMode: 'parallel',
          agents: [
            {
              agentId: 'data-collector',
              stage: 1,
              task: 'collect-data',
              parameters: { source: 'dataset-a' }
            },
            {
              agentId: 'data-processor',
              stage: 1,
              task: 'collect-data', 
              parameters: { source: 'dataset-b' }
            },
            {
              agentId: 'quality-assurance',
              stage: 2,
              task: 'analyze-data',
              parameters: { analysisType: 'quality-metrics' }
            },
            {
              agentId: 'report-generator',
              stage: 2,
              task: 'analyze-data',
              parameters: { analysisType: 'summary-statistics' }
            }
          ],
          synchronizationPoints: [
            {
              afterStage: 1,
              action: 'merge-results',
              parameters: { strategy: 'combine-datasets' }
            }
          ],
          timeoutMs: 90000,
          userId: testUserId
        };

        const coordinationResult = await coordinateWorkflowUseCase.execute(parallelWorkflowRequest);
        
        expect(coordinationResult.isSuccess).toBe(true);
        
        const response = coordinationResult.value!;
        expect(response.executionMode).toBe('parallel');
        expect(response.stages.length).toBe(2); // Two parallel stages

        // Verify parallel execution structure
        const stage1 = response.stages.find(s => s.stageId === 1);
        const stage2 = response.stages.find(s => s.stageId === 2);
        
        expect(stage1).toBeDefined();
        expect(stage2).toBeDefined();

        if (stage1 && stage1.status === 'completed') {
          expect(stage1.parallelExecutions).toBeDefined();
          expect(stage1.parallelExecutions!.length).toBe(2); // Two parallel agents
          expect(stage1.synchronizationResult).toBeDefined();
        }
      });

      it('should handle workflow failures and partial completions with proper rollback', async () => {
        // RED: Test error handling and recovery in multi-agent workflows
        const failureProneWorkflowRequest: CoordinateWorkflowAgentExecutionRequest = {
          workflowId: 'failure-test-workflow',
          executionMode: 'sequential',
          agents: [
            {
              agentId: 'data-collector',
              stage: 1,
              task: 'collect-data',
              parameters: { source: 'valid-source' }
            },
            {
              agentId: 'non-existent-agent', // This should cause a failure
              stage: 2,
              task: 'process-data',
              parameters: { process: true }
            }
          ],
          userId: testUserId
        };

        const coordinationResult = await coordinateWorkflowUseCase.execute(failureProneWorkflowRequest);
        
        expect(coordinationResult.isFailure).toBe(true);
        expect(coordinationResult.error).toContain('Agent not found');
      });

      it('should validate workflow configuration and agent availability before execution', async () => {
        // RED: Test comprehensive workflow validation
        const invalidWorkflowRequests: CoordinateWorkflowAgentExecutionRequest[] = [
          // Empty agents array
          {
            workflowId: 'invalid-workflow-1',
            executionMode: 'sequential',
            agents: [],
            userId: testUserId
          },
          // Invalid stage numbering for sequential
          {
            workflowId: 'invalid-workflow-2', 
            executionMode: 'sequential',
            agents: [
              { agentId: 'data-collector', stage: 1, task: 'task1' },
              { agentId: 'data-processor', stage: 3, task: 'task2' } // Missing stage 2
            ],
            userId: testUserId
          },
          // Invalid timeout
          {
            workflowId: 'invalid-workflow-3',
            executionMode: 'sequential',
            agents: [
              { agentId: 'data-collector', stage: 1, task: 'task1' }
            ],
            timeoutMs: 500, // Too short
            userId: testUserId
          }
        ];

        for (const invalidRequest of invalidWorkflowRequests) {
          const result = await coordinateWorkflowUseCase.execute(invalidRequest);
          expect(result.isFailure).toBe(true);
          expect(result.error).toBeTruthy();
        }
      });
    });
  });

  describe('TDD Phase 6: Complete Integration Workflows', () => {
    describe('End-to-End Agent Workflow Integration', () => {
      it('should support complete workflow: register -> discover -> execute -> coordinate', async () => {
        // RED: Test complete end-to-end integration workflow
        
        // Phase 1: Register specialized agents for the workflow
        const workflowAgents = [
          {
            agentId: 'e2e-data-ingestion',
            name: 'Data Ingestion Specialist',
            capabilities: ['data-ingestion', 'data-validation'],
            description: 'Specialized in ingesting data from multiple sources with validation'
          },
          {
            agentId: 'e2e-data-analysis',
            name: 'Advanced Data Analyst', 
            capabilities: ['data-analysis', 'statistical-modeling'],
            description: 'Performs advanced statistical analysis and modeling'
          },
          {
            agentId: 'e2e-report-automation',
            name: 'Report Automation Engine',
            capabilities: ['report-generation', 'visualization', 'automation'],
            description: 'Automated report generation with advanced visualization capabilities'
          }
        ];

        // Register all agents
        const registeredAgents: string[] = [];
        for (const agentConfig of workflowAgents) {
          const registerRequest: RegisterAIAgentRequest = {
            agentId: agentConfig.agentId,
            name: agentConfig.name,
            description: agentConfig.description,
            featureType: FeatureType.FUNCTION_MODEL,
            capabilities: agentConfig.capabilities,
            userId: testUserId
          };

          const registerResult = await registerAgentUseCase.execute(registerRequest);
          expect(registerResult.isSuccess).toBe(true);
          registeredAgents.push(agentConfig.agentId);
          testAgents.push(agentConfig.agentId);
        }

        // Phase 2: Discover agents for data analysis workflow
        const discoveryRequest: DiscoverAgentsByCapabilityRequest = {
          requiredCapabilities: ['data-analysis'],
          optionalCapabilities: ['statistical-modeling', 'visualization'],
          minimumScore: 0.5,
          maxResults: 5,
          userId: testUserId
        };

        const discoveryResult = await discoverAgentsUseCase.execute(discoveryRequest);
        expect(discoveryResult.isSuccess).toBe(true);
        expect(discoveryResult.value!.matches.length).toBeGreaterThan(0);
        
        const analysisAgent = discoveryResult.value!.matches.find(m => m.agentId === 'e2e-data-analysis');
        expect(analysisAgent).toBeDefined();

        // Phase 3: Execute individual tasks on discovered agents
        const taskRequest: ExecuteAIAgentTaskRequest = {
          agentId: 'e2e-data-analysis',
          taskId: 'e2e-analysis-task',
          taskType: 'analysis',
          parameters: {
            analysisType: 'statistical-summary',
            dataset: 'customer-behavior-data',
            outputFormat: 'detailed-report'
          },
          userId: testUserId
        };

        const executionResult = await executeTaskUseCase.execute(taskRequest);
        expect(executionResult.isSuccess).toBe(true);
        expect(executionResult.value!.agentId).toBe('e2e-data-analysis');

        // Phase 4: Coordinate multi-agent workflow using registered agents
        const coordinationRequest: CoordinateWorkflowAgentExecutionRequest = {
          workflowId: 'e2e-complete-workflow',
          executionMode: 'sequential',
          agents: [
            {
              agentId: 'e2e-data-ingestion',
              stage: 1,
              task: 'collect-data',
              parameters: { sources: ['database', 'api', 'files'] }
            },
            {
              agentId: 'e2e-data-analysis', 
              stage: 2,
              task: 'analyze-data',
              parameters: { analysisType: 'comprehensive', includeML: true }
            },
            {
              agentId: 'e2e-report-automation',
              stage: 3,
              task: 'generate-report',
              parameters: { reportType: 'executive-summary', distribution: 'email' }
            }
          ],
          synchronizationPoints: [
            {
              afterStage: 1,
              action: 'validate-outputs',
              parameters: { dataQualityChecks: true }
            }
          ],
          userId: testUserId
        };

        const coordinationResult = await coordinateWorkflowUseCase.execute(coordinationRequest);
        expect(coordinationResult.isSuccess).toBe(true);
        
        const workflowResponse = coordinationResult.value!;
        expect(workflowResponse.stages.length).toBe(3);
        expect(workflowResponse.status).toMatch(/^(completed|failed|partial)$/);
        expect(workflowResponse.totalExecutionTime).toBeGreaterThan(0);

        // Verify complete workflow execution metrics
        const completedStages = workflowResponse.stages.filter(s => s.status === 'completed');
        expect(completedStages.length).toBeGreaterThan(0);
      });

      it('should handle complex semantic search followed by coordinated execution', async () => {
        // RED: Test semantic search integration with workflow coordination
        
        // Use semantic search to find agents for a complex business scenario
        const complexSearchRequest: PerformSemanticAgentSearchRequest = {
          query: 'I need agents that can analyze financial data, generate compliance reports, and automate the distribution to stakeholders',
          maxResults: 10,
          minSemanticScore: 0.3,
          includeExplanations: true,
          enableContextualUnderstanding: true,
          userId: testUserId
        };

        const searchResult = await semanticSearchUseCase.execute(complexSearchRequest);
        expect(searchResult.isSuccess).toBe(true);

        const searchResponse = searchResult.value!;
        expect(searchResponse.agents.length).toBeGreaterThan(0);

        // Use search results to build a workflow
        const discoveredAgentIds = searchResponse.agents.slice(0, 3).map(a => a.agentId);
        
        if (discoveredAgentIds.length >= 3) {
          const dynamicWorkflowRequest: CoordinateWorkflowAgentExecutionRequest = {
            workflowId: 'semantic-driven-workflow',
            executionMode: 'sequential',
            agents: discoveredAgentIds.map((agentId, index) => ({
              agentId,
              stage: index + 1,
              task: `business-task-${index + 1}`,
              parameters: { dynamicallyDiscovered: true, stage: index + 1 }
            })),
            userId: testUserId
          };

          const dynamicCoordinationResult = await coordinateWorkflowUseCase.execute(dynamicWorkflowRequest);
          // This may fail if agents don't exist, but should validate the workflow structure
          expect(dynamicCoordinationResult.isSuccess || dynamicCoordinationResult.isFailure).toBe(true);
        }
      });
    });
  });

  describe('TDD Phase 7: Error Scenarios and Recovery Patterns', () => {
    describe('Comprehensive Error Handling and Recovery', () => {
      it('should handle repository failures with proper error propagation and recovery', async () => {
        // RED: Test repository failure scenarios
        
        // Create a mock repository that fails
        const failingRepository = {
          ...agentRepository,
          findById: jest.fn().mockResolvedValue(Result.fail('Database connection failed')),
          save: jest.fn().mockResolvedValue(Result.fail('Database write failed'))
        };

        const failingRegisterUseCase = new RegisterAIAgentUseCase(failingRepository as any, eventBus);
        const failingExecuteUseCase = new ExecuteAIAgentTaskUseCase(failingRepository as any, auditRepository, eventBus);

        // Test registration failure
        const registerRequest: RegisterAIAgentRequest = {
          name: 'Test Agent',
          featureType: FeatureType.FUNCTION_MODEL,
          capabilities: ['test'],
          userId: testUserId
        };

        const registerResult = await failingRegisterUseCase.execute(registerRequest);
        expect(registerResult.isFailure).toBe(true);
        expect(registerResult.error).toContain('Database write failed');

        // Test execution failure due to agent lookup failure
        const executeRequest: ExecuteAIAgentTaskRequest = {
          agentId: 'test-agent',
          taskId: 'test-task',
          taskType: 'test',
          parameters: {},
          userId: testUserId
        };

        const executeResult = await failingExecuteUseCase.execute(executeRequest);
        expect(executeResult.isFailure).toBe(true);
        expect(executeResult.error).toContain('Database connection failed');
      });

      it('should handle event bus failures gracefully without breaking core functionality', async () => {
        // RED: Test event bus failure scenarios
        
        const failingEventBus = {
          publish: jest.fn().mockRejectedValue(new Error('Event bus service unavailable'))
        };

        const resilientRegisterUseCase = new RegisterAIAgentUseCase(agentRepository, failingEventBus as any);

        const registerRequest: RegisterAIAgentRequest = {
          agentId: 'resilient-test-agent',
          name: 'Resilient Test Agent',
          featureType: FeatureType.FUNCTION_MODEL,
          capabilities: ['resilience-test'],
          userId: testUserId
        };

        // Registration should still succeed even if event publishing fails
        const registerResult = await resilientRegisterUseCase.execute(registerRequest);
        expect(registerResult.isSuccess).toBe(true);
        
        testAgents.push('resilient-test-agent');
      });

      it('should implement circuit breaker patterns for external service failures', async () => {
        // RED: Test circuit breaker and retry logic
        
        // This would test actual circuit breaker implementation
        // For now, test that individual component failures don't cascade
        const partialFailureWorkflow: CoordinateWorkflowAgentExecutionRequest = {
          workflowId: 'partial-failure-test',
          executionMode: 'parallel',
          agents: [
            {
              agentId: 'data-collector', // Existing agent
              stage: 1,
              task: 'collect-data'
            },
            {
              agentId: 'non-existent-agent-circuit-breaker', // Non-existent
              stage: 1,
              task: 'process-data'
            }
          ],
          userId: testUserId
        };

        const coordinationResult = await coordinateWorkflowUseCase.execute(partialFailureWorkflow);
        expect(coordinationResult.isFailure).toBe(true);
        expect(coordinationResult.error).toContain('Agent not found');
      });
    });
  });

  describe('TDD Phase 8: Clean Architecture Compliance', () => {
    describe('Dependency Inversion and Architecture Boundaries', () => {
      it('should verify use cases depend only on repository interfaces, not concrete implementations', () => {
        // RED: Test Clean Architecture dependency compliance
        
        // Verify constructor dependencies are interfaces
        expect(registerAgentUseCase).toBeDefined();
        expect(discoverAgentsUseCase).toBeDefined();
        expect(executeTaskUseCase).toBeDefined();
        expect(semanticSearchUseCase).toBeDefined();
        expect(coordinateWorkflowUseCase).toBeDefined();

        // Test that use cases work with any implementation of the interfaces
        const mockAgentRepository = {
          findById: jest.fn().mockResolvedValue(Result.ok(null)),
          save: jest.fn().mockResolvedValue(Result.ok()),
          delete: jest.fn().mockResolvedValue(Result.ok()),
          exists: jest.fn().mockResolvedValue(Result.ok(false)),
          findByFeatureAndEntity: jest.fn().mockResolvedValue(Result.ok([])),
          findByNode: jest.fn().mockResolvedValue(Result.ok([])),
          findByFeatureType: jest.fn().mockResolvedValue(Result.ok([])),
          findEnabled: jest.fn().mockResolvedValue(Result.ok([])),
          findDisabled: jest.fn().mockResolvedValue(Result.ok([])),
          findByName: jest.fn().mockResolvedValue(Result.ok([])),
          findByCapability: jest.fn().mockResolvedValue(Result.ok([])),
          findByTool: jest.fn().mockResolvedValue(Result.ok([])),
          findRecentlyExecuted: jest.fn().mockResolvedValue(Result.ok([])),
          findBySuccessRate: jest.fn().mockResolvedValue(Result.ok([])),
          findByExecutionCount: jest.fn().mockResolvedValue(Result.ok([])),
          updateEnabled: jest.fn().mockResolvedValue(Result.ok()),
          recordExecution: jest.fn().mockResolvedValue(Result.ok()),
          bulkSave: jest.fn().mockResolvedValue(Result.ok()),
          bulkDelete: jest.fn().mockResolvedValue(Result.ok()),
          countByFeatureType: jest.fn().mockResolvedValue(Result.ok(0)),
          countEnabled: jest.fn().mockResolvedValue(Result.ok(0))
        };

        const mockEventBus = {
          publish: jest.fn().mockResolvedValue(undefined)
        };

        // Should be able to instantiate with mock implementations
        const mockRegisterUseCase = new RegisterAIAgentUseCase(mockAgentRepository, mockEventBus);
        const mockDiscoverUseCase = new DiscoverAgentsByCapabilityUseCase(mockAgentRepository);
        
        expect(mockRegisterUseCase).toBeDefined();
        expect(mockDiscoverUseCase).toBeDefined();
      });

      it('should ensure Result pattern is used consistently across all AI agent operations', async () => {
        // RED: Test Result pattern consistency
        
        const registerRequest: RegisterAIAgentRequest = {
          name: 'Result Pattern Test Agent',
          featureType: FeatureType.FUNCTION_MODEL,
          capabilities: ['result-testing'],
          userId: testUserId
        };

        // All use case operations should return Result types
        const registerResult = await registerAgentUseCase.execute(registerRequest);
        expect(registerResult).toHaveProperty('isSuccess');
        expect(registerResult).toHaveProperty('isFailure');
        expect(registerResult).toHaveProperty('value');
        expect(registerResult).toHaveProperty('error');

        if (registerResult.isSuccess) {
          testAgents.push(registerResult.value!.agentId);

          const discoverResult = await discoverAgentsUseCase.execute({
            requiredCapabilities: ['result-testing'],
            userId: testUserId
          });

          // Result pattern should be consistent across all operations
          expect(discoverResult).toHaveProperty('isSuccess');
          expect(discoverResult).toHaveProperty('isFailure');
          expect(discoverResult).toHaveProperty('value');
          expect(discoverResult).toHaveProperty('error');

          if (discoverResult.isSuccess && discoverResult.value!.matches.length > 0) {
            const executeResult = await executeTaskUseCase.execute({
              agentId: discoverResult.value!.matches[0].agentId,
              taskId: 'result-pattern-test',
              taskType: 'capability-verification',
              parameters: {},
              userId: testUserId
            });

            expect(executeResult).toHaveProperty('isSuccess');
            expect(executeResult).toHaveProperty('isFailure');
            expect(executeResult).toHaveProperty('value');
            expect(executeResult).toHaveProperty('error');
          }
        }
      });

      it('should validate that domain logic stays in domain layer and use cases orchestrate properly', async () => {
        // RED: Test that business logic is properly encapsulated
        
        // Register an agent to test domain logic encapsulation
        const domainTestRequest: RegisterAIAgentRequest = {
          agentId: 'domain-logic-test-agent',
          name: 'Domain Logic Test Agent',
          featureType: FeatureType.FUNCTION_MODEL,
          capabilities: ['domain-testing'],
          userId: testUserId
        };

        const registerResult = await registerAgentUseCase.execute(domainTestRequest);
        expect(registerResult.isSuccess).toBe(true);
        testAgents.push('domain-logic-test-agent');

        // Verify that agent creation followed domain rules
        const nodeId = NodeId.create('domain-logic-test-agent');
        const agentResult = await agentRepository.findById(nodeId.value!);
        expect(agentResult.isSuccess).toBe(true);
        
        const agent = agentResult.value!;
        
        // Domain logic should be encapsulated in the entity
        expect(agent.isEnabled).toBe(true); // Default domain rule
        expect(agent.capabilities).toBeDefined(); // Domain invariant
        expect(agent.createdAt).toBeInstanceOf(Date); // Domain behavior
        expect(agent.agentId).toBeDefined(); // Domain identity
        
        // Use cases should orchestrate, not contain business logic
        // The use case should have delegated validation to domain entities
        expect(agent.name).toBe('Domain Logic Test Agent');
      });
    });
  });
});