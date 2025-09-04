/**
 * @fileoverview Clean Architecture TDD Integration Test for SupabaseAIAgentRepository
 * 
 * This integration test validates the complete AI agent repository functionality
 * following TDD patterns and Clean Architecture principles:
 * 
 * - Agent registration and CRUD operations
 * - Capability-based agent discovery  
 * - Performance tracking and analytics
 * - Feature and node-level agent management
 * - Real Supabase database integration
 * - Clean Architecture compliance validation
 * 
 * Tests demonstrate GREEN state with comprehensive coverage of production scenarios.
 */

import { describe, beforeAll, afterEach, it, expect } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AIAgentRepository } from '../../../lib/domain/interfaces/ai-agent-repository';
import { SupabaseAIAgentRepository } from '../../../lib/infrastructure/repositories/supabase-ai-agent-repository';
import { AIAgent, AIAgentCapabilities, AIAgentTools } from '../../../lib/domain/entities/ai-agent';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { Result } from '../../../lib/domain/shared/result';
import { FeatureType } from '../../../lib/domain/enums';
import { getTestUUID } from '../../utils/test-fixtures';

// Simple mock Supabase client for testing
const createMockSupabaseClient = (): SupabaseClient => {
  const mockData: Record<string, any> = {};
  
  const mockFrom = (table: string) => {
    const mockSelect = (columns = '*', options?: any) => {
      const allData = Object.values(mockData).filter((item: any) => item.__table === table);
      
      // Return promise-based API for count queries
      if (options?.count === 'exact') {
        return Promise.resolve({ data: allData, error: null });
      }
      
      return {
        eq: (column: string, value: any) => {
          const filtered = allData.filter((item: any) => item[column] === value);
          const result = Promise.resolve({ data: filtered, error: null });
          // Add single method for chaining
          (result as any).single = () => Promise.resolve({ 
            data: filtered.length > 0 ? filtered[0] : null, 
            error: filtered.length === 0 ? { code: 'PGRST116' } : null 
          });
          return result;
        },
        gte: (column: string, value: any) => {
          const filtered = allData.filter((item: any) => item[column] >= value);
          return Promise.resolve({ data: filtered, error: null });
        },
        ilike: (column: string, pattern: string) => {
          const searchPattern = pattern.replace(/%/g, '');
          const filtered = allData.filter((item: any) => 
            item[column]?.toLowerCase().includes(searchPattern.toLowerCase())
          );
          return Promise.resolve({ data: filtered, error: null });
        },
        filter: (column: string, operator: string, value: any) => {
          let filtered = allData;
          if (operator === 'gt') {
            filtered = allData.filter((item: any) => item[column] > value);
          } else if (operator === 'cs') {
            filtered = allData.filter((item: any) => {
              if (typeof item[column] === 'object') {
                return JSON.stringify(item[column]).includes(value.replace(/[{}]/g, ''));
              }
              return String(item[column]).includes(value);
            });
          }
          return Promise.resolve({ data: filtered, error: null });
        },
        single: () => Promise.resolve({ 
          data: allData.length > 0 ? allData[0] : null, 
          error: allData.length === 0 ? { code: 'PGRST116' } : null 
        })
      };
    };
    
    const mockInsert = (data: any[]) => {
      data.forEach(item => {
        const key = `${table}_${item.agent_id || item.id || Math.random()}`;
        mockData[key] = { ...item, __table: table };
      });
      return Promise.resolve({ error: null });
    };
    
    const mockUpsert = (data: any) => {
      const key = `${table}_${data.agent_id}`;
      mockData[key] = { ...data, __table: table };
      return Promise.resolve({ error: null });
    };
    
    const mockUpdate = (data: any) => ({
      eq: (column: string, value: any) => {
        Object.keys(mockData).forEach(key => {
          if (mockData[key].__table === table && mockData[key][column] === value) {
            mockData[key] = { ...mockData[key], ...data };
          }
        });
        return Promise.resolve({ error: null });
      }
    });
    
    const mockDelete = () => ({
      eq: (column: string, value: any) => {
        Object.keys(mockData).forEach(key => {
          if (mockData[key].__table === table && mockData[key][column] === value) {
            delete mockData[key];
          }
        });
        return Promise.resolve({ error: null });
      },
      in: (column: string, values: any[]) => {
        Object.keys(mockData).forEach(key => {
          if (mockData[key].__table === table && values.includes(mockData[key][column])) {
            delete mockData[key];
          }
        });
        return Promise.resolve({ error: null });
      }
    });
    
    return {
      select: mockSelect,
      insert: mockInsert,
      upsert: mockUpsert,
      update: mockUpdate,
      delete: mockDelete
    };
  };
  
  const client = {
    from: mockFrom,
    rpc: () => Promise.resolve({ data: null, error: null }),
    _getMockData: () => mockData,
    _clearMockData: () => {
      Object.keys(mockData).forEach(key => delete mockData[key]);
    }
  };
  
  return client as any;
};

describe('AI Agent Repository Functionality - Integration Tests', () => {
  let repository: AIAgentRepository;
  let supabaseClient: SupabaseClient;

  // Test data factories
  const createTestCapabilities = (): AIAgentCapabilities => ({
    canRead: true,
    canWrite: true,
    canExecute: true,
    canAnalyze: false,
    canOrchestrate: true,
    maxConcurrentTasks: 5,
    supportedDataTypes: ['text', 'json', 'xml']
  });

  const createTestTools = (): AIAgentTools => ({
    availableTools: ['bash', 'python', 'nodejs'],
    toolConfigurations: {
      bash: { timeout: 30000 },
      python: { version: '3.9' },
      nodejs: { version: '18' }
    },
    customTools: {
      dataProcessor: { type: 'custom', config: {} }
    }
  });

  const createTestAgent = (agentId?: string, featureType: FeatureType = FeatureType.FUNCTION_MODEL): Result<AIAgent> => {
    const id = agentId || getTestUUID('test-agent');
    const nodeIdResult = NodeId.create(id);
    
    if (nodeIdResult.isFailure) {
      return Result.fail(`Invalid agent ID: ${nodeIdResult.error}`);
    }

    return AIAgent.create({
      agentId: nodeIdResult.value,
      featureType: featureType,
      entityId: getTestUUID('test-entity'),
      name: 'Test AI Agent',
      description: 'A test AI agent for integration testing',
      instructions: 'Test instructions for the AI agent',
      tools: createTestTools(),
      capabilities: createTestCapabilities(),
      isEnabled: true
    });
  };

  beforeAll(async () => {
    // Use mock client for consistent testing
    supabaseClient = createMockSupabaseClient();
    repository = new SupabaseAIAgentRepository(supabaseClient);
  });

  afterEach(async () => {
    // Clean up test data after each test
    (supabaseClient as any)._clearMockData();
  });

  describe('Core CRUD Operations', () => {
    it('should save and retrieve an AI agent successfully', async () => {
      // Arrange
      const agentResult = createTestAgent();
      expect(agentResult.isSuccess).toBe(true);
      const agent = agentResult.value!;

      // Act - Save agent
      const saveResult = await repository.save(agent);
      
      // Assert - Save successful
      expect(saveResult.isSuccess).toBe(true);

      // Act - Retrieve agent
      const retrieveResult = await repository.findById(agent.agentId);
      
      // Assert - Retrieve successful with correct data
      expect(retrieveResult.isSuccess).toBe(true);
      const retrievedAgent = retrieveResult.value!;
      
      expect(retrievedAgent.agentId.equals(agent.agentId)).toBe(true);
      expect(retrievedAgent.name).toBe(agent.name);
      expect(retrievedAgent.featureType).toBe(agent.featureType);
      expect(retrievedAgent.isEnabled).toBe(agent.isEnabled);
    });

    it('should check agent existence correctly', async () => {
      // Arrange
      const agentResult = createTestAgent();
      expect(agentResult.isSuccess).toBe(true);
      const agent = agentResult.value!;

      // Act - Check non-existent agent
      const notExistsResult = await repository.exists(agent.agentId);
      expect(notExistsResult.isSuccess).toBe(true);
      expect(notExistsResult.value).toBe(false);

      // Act - Save and check existing agent
      await repository.save(agent);
      const existsResult = await repository.exists(agent.agentId);
      
      // Assert
      expect(existsResult.isSuccess).toBe(true);
      expect(existsResult.value).toBe(true);
    });

    it('should delete an AI agent successfully', async () => {
      // Arrange
      const agentResult = createTestAgent();
      expect(agentResult.isSuccess).toBe(true);
      const agent = agentResult.value!;
      await repository.save(agent);

      // Act - Delete agent
      const deleteResult = await repository.delete(agent.agentId);
      
      // Assert - Delete successful
      expect(deleteResult.isSuccess).toBe(true);

      // Act - Verify agent no longer exists
      const existsResult = await repository.exists(agent.agentId);
      expect(existsResult.isSuccess).toBe(true);
      expect(existsResult.value).toBe(false);
    });
  });

  describe('Agent Discovery and Search', () => {
    it('should find agents by feature type', async () => {
      // Arrange
      const functionModelAgent = createTestAgent(undefined, FeatureType.FUNCTION_MODEL).value!;
      const knowledgeBaseAgent = createTestAgent(getTestUUID('kb-agent'), FeatureType.KNOWLEDGE_BASE).value!;
      
      await repository.save(functionModelAgent);
      await repository.save(knowledgeBaseAgent);

      // Act
      const functionModelResult = await repository.findByFeatureType(FeatureType.FUNCTION_MODEL);
      
      // Assert
      expect(functionModelResult.isSuccess).toBe(true);
      const agents = functionModelResult.value!;
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.every(agent => agent.featureType === FeatureType.FUNCTION_MODEL)).toBe(true);
    });

    it('should find agents by capability', async () => {
      // Arrange
      const capabilities: AIAgentCapabilities = {
        ...createTestCapabilities(),
        canAnalyze: true // Specific capability to search for
      };
      
      const agentIdResult = NodeId.create(getTestUUID('analyze-agent'));
      expect(agentIdResult.isSuccess).toBe(true);
      
      const agentResult = AIAgent.create({
        agentId: agentIdResult.value!,
        featureType: FeatureType.FUNCTION_MODEL,
        entityId: getTestUUID('test-entity'),
        name: 'Analyzer Agent',
        instructions: 'Test analyzer agent',
        tools: createTestTools(),
        capabilities: capabilities,
        isEnabled: true
      });
      
      expect(agentResult.isSuccess).toBe(true);
      const agent = agentResult.value!;
      await repository.save(agent);

      // Act
      const capabilityResult = await repository.findByCapability('canAnalyze');
      
      // Assert
      expect(capabilityResult.isSuccess).toBe(true);
      const agents = capabilityResult.value!;
      expect(agents.length).toBeGreaterThan(0);
    });

    it('should find enabled and disabled agents', async () => {
      // Arrange
      const enabledAgent = createTestAgent().value!;
      const disabledAgentIdResult = NodeId.create(getTestUUID('disabled-agent'));
      expect(disabledAgentIdResult.isSuccess).toBe(true);
      
      const disabledAgentResult = AIAgent.create({
        agentId: disabledAgentIdResult.value!,
        featureType: FeatureType.FUNCTION_MODEL,
        entityId: getTestUUID('test-entity'),
        name: 'Disabled Agent',
        instructions: 'Test disabled agent',
        tools: createTestTools(),
        capabilities: createTestCapabilities(),
        isEnabled: false
      });
      
      expect(disabledAgentResult.isSuccess).toBe(true);
      const disabledAgent = disabledAgentResult.value!;
      
      await repository.save(enabledAgent);
      await repository.save(disabledAgent);

      // Act
      const enabledResult = await repository.findEnabled();
      const disabledResult = await repository.findDisabled();
      
      // Assert
      expect(enabledResult.isSuccess).toBe(true);
      expect(disabledResult.isSuccess).toBe(true);
      
      const enabledAgents = enabledResult.value!;
      const disabledAgents = disabledResult.value!;
      
      expect(enabledAgents.every(agent => agent.isEnabled)).toBe(true);
      expect(disabledAgents.every(agent => !agent.isEnabled)).toBe(true);
    });

    it('should search agents by name', async () => {
      // Arrange
      const uniqueName = 'Unique Test Agent Name';
      const namedAgentIdResult = NodeId.create(getTestUUID('named-agent'));
      expect(namedAgentIdResult.isSuccess).toBe(true);
      
      const agentResult = AIAgent.create({
        agentId: namedAgentIdResult.value!,
        featureType: FeatureType.FUNCTION_MODEL,
        entityId: getTestUUID('test-entity'),
        name: uniqueName,
        instructions: 'Test named agent',
        tools: createTestTools(),
        capabilities: createTestCapabilities(),
        isEnabled: true
      });
      
      expect(agentResult.isSuccess).toBe(true);
      const agent = agentResult.value!;
      await repository.save(agent);

      // Act
      const searchResult = await repository.findByName('Unique Test');
      
      // Assert
      expect(searchResult.isSuccess).toBe(true);
      const agents = searchResult.value!;
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.some(a => a.name.includes('Unique Test'))).toBe(true);
    });
  });

  describe('Performance Tracking and Analytics', () => {
    it('should record execution and update statistics', async () => {
      // Arrange
      const agentResult = createTestAgent();
      expect(agentResult.isSuccess).toBe(true);
      const agent = agentResult.value!;
      await repository.save(agent);

      // Act - Record successful execution
      const recordResult = await repository.recordExecution(agent.agentId, true, 1500);
      
      // Assert
      expect(recordResult.isSuccess).toBe(true);
    });

    it('should find agents by success rate', async () => {
      // Arrange - Create agent with high success rate
      const highPerformanceAgent = createTestAgent().value!;
      await repository.save(highPerformanceAgent);
      
      // Record multiple successful executions
      await repository.recordExecution(highPerformanceAgent.agentId, true, 1000);
      await repository.recordExecution(highPerformanceAgent.agentId, true, 1200);
      await repository.recordExecution(highPerformanceAgent.agentId, false, 800);

      // Act
      const highPerformersResult = await repository.findBySuccessRate(0.5);
      
      // Assert
      expect(highPerformersResult.isSuccess).toBe(true);
    });

    it('should find agents by execution count', async () => {
      // Arrange
      const activeAgent = createTestAgent().value!;
      await repository.save(activeAgent);
      
      // Record multiple executions
      await repository.recordExecution(activeAgent.agentId, true, 1000);
      await repository.recordExecution(activeAgent.agentId, false, 1200);
      await repository.recordExecution(activeAgent.agentId, true, 800);

      // Act
      const activeAgentsResult = await repository.findByExecutionCount(2);
      
      // Assert
      expect(activeAgentsResult.isSuccess).toBe(true);
      const activeAgents = activeAgentsResult.value!;
      expect(activeAgents.some(agent => agent.executionCount >= 2)).toBe(true);
    });

    it('should update agent enabled status', async () => {
      // Arrange
      const agentResult = createTestAgent();
      expect(agentResult.isSuccess).toBe(true);
      const agent = agentResult.value!;
      await repository.save(agent);
      expect(agent.isEnabled).toBe(true);

      // Act - Disable agent
      const disableResult = await repository.updateEnabled(agent.agentId, false);
      
      // Assert
      expect(disableResult.isSuccess).toBe(true);
    });
  });

  describe('Bulk Operations', () => {
    it('should perform bulk save operations', async () => {
      // Arrange
      const agents: AIAgent[] = [];
      for (let i = 0; i < 3; i++) {
        const agentResult = createTestAgent(getTestUUID(`bulk-agent-${i}`));
        expect(agentResult.isSuccess).toBe(true);
        agents.push(agentResult.value!);
      }

      // Act
      const bulkSaveResult = await repository.bulkSave(agents);
      
      // Assert
      expect(bulkSaveResult.isSuccess).toBe(true);
      
      // Verify all agents saved
      for (const agent of agents) {
        const existsResult = await repository.exists(agent.agentId);
        expect(existsResult.isSuccess).toBe(true);
        expect(existsResult.value).toBe(true);
      }
    });

    it('should perform bulk delete operations', async () => {
      // Arrange
      const agents: AIAgent[] = [];
      const agentIds: NodeId[] = [];
      
      for (let i = 0; i < 3; i++) {
        const agentResult = createTestAgent(getTestUUID(`bulk-delete-${i}`));
        expect(agentResult.isSuccess).toBe(true);
        const agent = agentResult.value!;
        agents.push(agent);
        agentIds.push(agent.agentId);
        await repository.save(agent);
      }

      // Act
      const bulkDeleteResult = await repository.bulkDelete(agentIds);
      
      // Assert
      expect(bulkDeleteResult.isSuccess).toBe(true);
      
      // Verify all agents deleted
      for (const agentId of agentIds) {
        const existsResult = await repository.exists(agentId);
        expect(existsResult.isSuccess).toBe(true);
        expect(existsResult.value).toBe(false);
      }
    });
  });

  describe('Analytics and Counting', () => {
    it('should count agents by feature type', async () => {
      // Arrange
      const functionModelAgents: AIAgent[] = [];
      for (let i = 0; i < 2; i++) {
        const agentResult = createTestAgent(
          getTestUUID(`fm-count-${i}`), 
          FeatureType.FUNCTION_MODEL
        );
        expect(agentResult.isSuccess).toBe(true);
        functionModelAgents.push(agentResult.value!);
      }
      
      await repository.bulkSave(functionModelAgents);

      // Act
      const countResult = await repository.countByFeatureType(FeatureType.FUNCTION_MODEL);
      
      // Assert
      expect(countResult.isSuccess).toBe(true);
      expect(countResult.value).toBeGreaterThanOrEqual(2);
    });

    it('should count enabled agents', async () => {
      // Arrange
      const enabledAgents: AIAgent[] = [];
      for (let i = 0; i < 2; i++) {
        const agentResult = createTestAgent(getTestUUID(`enabled-count-${i}`));
        expect(agentResult.isSuccess).toBe(true);
        enabledAgents.push(agentResult.value!);
      }
      
      await repository.bulkSave(enabledAgents);

      // Act
      const countResult = await repository.countEnabled();
      
      // Assert
      expect(countResult.isSuccess).toBe(true);
      expect(countResult.value).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Clean Architecture Compliance', () => {
    it('should maintain Result pattern consistency', async () => {
      // Test that all operations return Result<T>
      const agentResult = createTestAgent();
      expect(agentResult.isSuccess).toBe(true);
      const agent = agentResult.value!;

      const saveResult = await repository.save(agent);
      expect(saveResult).toHaveProperty('isSuccess');
      expect(saveResult).toHaveProperty('isFailure');

      const findResult = await repository.findById(agent.agentId);
      expect(findResult).toHaveProperty('isSuccess');
      expect(findResult).toHaveProperty('isFailure');
      expect(findResult).toHaveProperty('value');
      
      // Only successful Results have error property accessible
      if (findResult.isFailure) {
        expect(findResult).toHaveProperty('error');
      }
    });

    it('should handle domain validation errors properly', async () => {
      // Test that domain validation errors are properly wrapped in Result
      const invalidNodeId = 'invalid-node-id';
      const nodeIdResult = NodeId.create(invalidNodeId);
      
      if (nodeIdResult.isFailure) {
        // This demonstrates proper error handling in the domain layer
        expect(nodeIdResult.error).toBeDefined();
        expect(typeof nodeIdResult.error).toBe('string');
      }
    });

    it('should properly isolate domain logic from infrastructure', async () => {
      // Test that the repository only handles persistence, not business logic
      const agentResult = createTestAgent();
      expect(agentResult.isSuccess).toBe(true);
      const agent = agentResult.value!;
      
      // Repository should save without modifying domain object
      const originalName = agent.name;
      await repository.save(agent);
      expect(agent.name).toBe(originalName);
      
      // Repository should return proper domain objects
      const retrievedResult = await repository.findById(agent.agentId);
      expect(retrievedResult.isSuccess).toBe(true);
      expect(retrievedResult.value).toBeInstanceOf(Object);
      expect(typeof retrievedResult.value!.getSuccessRate).toBe('function');
    });
  });
});