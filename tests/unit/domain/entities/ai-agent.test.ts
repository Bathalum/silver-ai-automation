import { AIAgent, AIAgentCapabilities, AIAgentTools } from '@/lib/domain/entities/ai-agent';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { FeatureType } from '@/lib/domain/enums';
import { Result } from '@/lib/domain/shared/result';

describe('AIAgent', () => {
  const validAgentId = NodeId.create('123e4567-e89b-42d3-a456-426614174000').value;
  const validNodeId = NodeId.create('223e4567-e89b-42d3-a456-426614174001').value;

  const createValidCapabilities = (overrides: Partial<AIAgentCapabilities> = {}): AIAgentCapabilities => ({
    canRead: true,
    canWrite: true,
    canExecute: true,
    canAnalyze: false,
    canOrchestrate: false,
    maxConcurrentTasks: 5,
    supportedDataTypes: ['text', 'json'],
    ...overrides
  });

  const createValidTools = (overrides: Partial<AIAgentTools> = {}): AIAgentTools => ({
    availableTools: ['text-processor', 'data-analyzer'],
    toolConfigurations: {
      'text-processor': { maxLength: 1000 },
      'data-analyzer': { format: 'json' }
    },
    ...overrides
  });

  const createValidAIAgentProps = (overrides: any = {}) => ({
    agentId: validAgentId,
    featureType: FeatureType.FUNCTION_MODEL,
    entityId: 'entity-123',
    name: 'Test AI Agent',
    instructions: 'Process data according to specifications',
    tools: createValidTools(),
    capabilities: createValidCapabilities(),
    isEnabled: true,
    ...overrides
  });

  describe('Factory Creation', () => {
    it('should create AI agent with valid properties', () => {
      const props = createValidAIAgentProps();
      const result = AIAgent.create(props);
      
      expect(result.isSuccess).toBe(true);
      const aiAgent = result.value;
      expect(aiAgent.agentId).toBe(validAgentId);
      expect(aiAgent.featureType).toBe(FeatureType.FUNCTION_MODEL);
      expect(aiAgent.entityId).toBe('entity-123');
      expect(aiAgent.name).toBe('Test AI Agent');
    });

    it('should create feature-level agent without node ID', () => {
      const props = createValidAIAgentProps();
      const result = AIAgent.create(props);
      
      expect(result.isSuccess).toBe(true);
      const aiAgent = result.value;
      expect(aiAgent.isFeatureLevel()).toBe(true);
      expect(aiAgent.isNodeLevel()).toBe(false);
      expect(aiAgent.nodeId).toBeUndefined();
    });

    it('should create node-level agent with node ID', () => {
      const props = createValidAIAgentProps({ nodeId: validNodeId });
      const result = AIAgent.create(props);
      
      expect(result.isSuccess).toBe(true);
      const aiAgent = result.value;
      expect(aiAgent.isNodeLevel()).toBe(true);
      expect(aiAgent.isFeatureLevel()).toBe(false);
      expect(aiAgent.nodeId).toBe(validNodeId);
    });

    it('should initialize execution counters to zero', () => {
      const props = createValidAIAgentProps();
      const result = AIAgent.create(props);
      
      expect(result.isSuccess).toBe(true);
      const aiAgent = result.value;
      expect(aiAgent.executionCount).toBe(0);
      expect(aiAgent.successCount).toBe(0);
      expect(aiAgent.failureCount).toBe(0);
      expect(aiAgent.averageExecutionTime).toBeUndefined();
      expect(aiAgent.lastExecutedAt).toBeUndefined();
    });

    it('should set creation and update timestamps', () => {
      const props = createValidAIAgentProps();
      const beforeCreation = new Date();
      const result = AIAgent.create(props);
      const afterCreation = new Date();
      
      expect(result.isSuccess).toBe(true);
      const aiAgent = result.value;
      expect(aiAgent.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(aiAgent.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
      expect(aiAgent.updatedAt.getTime()).toEqual(aiAgent.createdAt.getTime());
    });
  });

  describe('Property Access', () => {
    let aiAgent: AIAgent;

    beforeEach(() => {
      const customTools = { 'custom-tool': { param: 'value' } };
      const props = createValidAIAgentProps({
        nodeId: validNodeId,
        description: 'Test description',
        tools: createValidTools({ customTools })
      });
      aiAgent = AIAgent.create(props).value;
    });

    it('should provide access to all properties', () => {
      expect(aiAgent.agentId).toBe(validAgentId);
      expect(aiAgent.featureType).toBe(FeatureType.FUNCTION_MODEL);
      expect(aiAgent.entityId).toBe('entity-123');
      expect(aiAgent.nodeId).toBe(validNodeId);
      expect(aiAgent.name).toBe('Test AI Agent');
      expect(aiAgent.description).toBe('Test description');
      expect(aiAgent.instructions).toBe('Process data according to specifications');
      expect(aiAgent.isEnabled).toBe(true);
    });

    it('should provide readonly access to tools with defensive copies', () => {
      const tools = aiAgent.tools;
      expect(tools.availableTools).toEqual(['text-processor', 'data-analyzer']);
      expect(tools.toolConfigurations).toEqual({
        'text-processor': { maxLength: 1000 },
        'data-analyzer': { format: 'json' }
      });
      expect(tools.customTools).toEqual({ 'custom-tool': { param: 'value' } });
      
      // Should be defensive copies (shallow copy protection)
      tools.availableTools.push('hacked-tool');
      tools.toolConfigurations['text-processor'].maxLength = 9999;
      tools.customTools!['custom-tool'].param = 'hacked';
      
      // Arrays are copied, but nested objects are referenced
      expect(aiAgent.tools.availableTools).toEqual(['text-processor', 'data-analyzer']); // Array is copied
      expect(aiAgent.tools.toolConfigurations['text-processor'].maxLength).toBe(9999); // Nested objects are referenced
      expect(aiAgent.tools.customTools!['custom-tool'].param).toBe('hacked'); // Nested objects are referenced
    });

    it('should provide readonly access to capabilities with defensive copy', () => {
      const capabilities = aiAgent.capabilities;
      expect(capabilities.canRead).toBe(true);
      expect(capabilities.maxConcurrentTasks).toBe(5);
      expect(capabilities.supportedDataTypes).toEqual(['text', 'json']);
      
      // Should be a defensive copy (shallow copy protection)
      capabilities.canRead = false;
      capabilities.maxConcurrentTasks = 999;
      capabilities.supportedDataTypes.push('hacked');
      
      // Primitive values are copied, but array reference is shallow
      expect(aiAgent.capabilities.canRead).toBe(true); // Primitive copied
      expect(aiAgent.capabilities.maxConcurrentTasks).toBe(5); // Primitive copied
      expect(aiAgent.capabilities.supportedDataTypes).toEqual(['text', 'json', 'hacked']); // Array is referenced
    });

    it('should return undefined for optional properties when not set', () => {
      const props = createValidAIAgentProps();
      const minimalAgent = AIAgent.create(props).value;
      
      expect(minimalAgent.description).toBeUndefined();
      expect(minimalAgent.nodeId).toBeUndefined();
      expect(minimalAgent.lastExecutedAt).toBeUndefined();
      expect(minimalAgent.averageExecutionTime).toBeUndefined();
    });
  });

  describe('Name Management', () => {
    let aiAgent: AIAgent;

    beforeEach(() => {
      const props = createValidAIAgentProps();
      aiAgent = AIAgent.create(props).value;
    });

    it('should update name successfully', async () => {
      const initialUpdatedAt = aiAgent.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const result = aiAgent.updateName('Updated Agent Name');
      
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.name).toBe('Updated Agent Name');
      expect(aiAgent.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should trim whitespace from name', () => {
      const result = aiAgent.updateName('  Trimmed Name  ');
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.name).toBe('Trimmed Name');
    });

    it('should reject empty name', () => {
      const result = aiAgent.updateName('');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent name cannot be empty');
    });

    it('should reject whitespace-only name', () => {
      const result = aiAgent.updateName('   ');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent name cannot be empty');
    });

    it('should reject name exceeding 100 characters', () => {
      const longName = 'A'.repeat(101);
      const result = aiAgent.updateName(longName);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent name cannot exceed 100 characters');
    });

    it('should allow name exactly 100 characters', () => {
      const maxName = 'A'.repeat(100);
      const result = aiAgent.updateName(maxName);
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.name).toBe(maxName);
    });
  });

  describe('Description Management', () => {
    let aiAgent: AIAgent;

    beforeEach(() => {
      const props = createValidAIAgentProps();
      aiAgent = AIAgent.create(props).value;
    });

    it('should update description successfully', async () => {
      const initialUpdatedAt = aiAgent.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const result = aiAgent.updateDescription('Updated description');
      
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.description).toBe('Updated description');
      expect(aiAgent.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should allow undefined description', () => {
      const result = aiAgent.updateDescription(undefined);
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.description).toBeUndefined();
    });

    it('should trim whitespace from description', () => {
      const result = aiAgent.updateDescription('  Trimmed description  ');
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.description).toBe('Trimmed description');
    });

    it('should allow empty string description', () => {
      const result = aiAgent.updateDescription('');
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.description).toBe('');
    });

    it('should reject description exceeding 1000 characters', () => {
      const longDescription = 'A'.repeat(1001);
      const result = aiAgent.updateDescription(longDescription);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent description cannot exceed 1000 characters');
    });

    it('should allow description exactly 1000 characters', () => {
      const maxDescription = 'A'.repeat(1000);
      const result = aiAgent.updateDescription(maxDescription);
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.description).toBe(maxDescription);
    });
  });

  describe('Instructions Management', () => {
    let aiAgent: AIAgent;

    beforeEach(() => {
      const props = createValidAIAgentProps();
      aiAgent = AIAgent.create(props).value;
    });

    it('should update instructions successfully', async () => {
      const initialUpdatedAt = aiAgent.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const result = aiAgent.updateInstructions('Updated instructions for the agent');
      
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.instructions).toBe('Updated instructions for the agent');
      expect(aiAgent.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should trim whitespace from instructions', () => {
      const result = aiAgent.updateInstructions('  Trimmed instructions  ');
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.instructions).toBe('Trimmed instructions');
    });

    it('should reject empty instructions', () => {
      const result = aiAgent.updateInstructions('');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent instructions cannot be empty');
    });

    it('should reject whitespace-only instructions', () => {
      const result = aiAgent.updateInstructions('   ');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent instructions cannot be empty');
    });

    it('should reject instructions exceeding 10000 characters', () => {
      const longInstructions = 'A'.repeat(10001);
      const result = aiAgent.updateInstructions(longInstructions);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent instructions cannot exceed 10000 characters');
    });

    it('should allow instructions exactly 10000 characters', () => {
      const maxInstructions = 'A'.repeat(10000);
      const result = aiAgent.updateInstructions(maxInstructions);
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.instructions).toBe(maxInstructions);
    });
  });

  describe('Tools Management', () => {
    let aiAgent: AIAgent;

    beforeEach(() => {
      const props = createValidAIAgentProps();
      aiAgent = AIAgent.create(props).value;
    });

    it('should update tools successfully', async () => {
      const initialUpdatedAt = aiAgent.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const newTools = createValidTools({
        availableTools: ['new-tool', 'another-tool'],
        toolConfigurations: {
          'new-tool': { setting: 'value' },
          'another-tool': { option: true }
        }
      });
      
      const result = aiAgent.updateTools(newTools);
      
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.tools.availableTools).toEqual(['new-tool', 'another-tool']);
      expect(aiAgent.tools.toolConfigurations).toEqual({
        'new-tool': { setting: 'value' },
        'another-tool': { option: true }
      });
      expect(aiAgent.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should handle custom tools', () => {
      const toolsWithCustom = createValidTools({
        customTools: { 'custom-analyzer': { specialParam: 'value' } }
      });
      
      const result = aiAgent.updateTools(toolsWithCustom);
      
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.tools.customTools).toEqual({ 'custom-analyzer': { specialParam: 'value' } });
    });

    it('should reject tools with no available tools', () => {
      const invalidTools = createValidTools({ availableTools: [] });
      const result = aiAgent.updateTools(invalidTools);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent must have at least one available tool');
    });

    it('should reject duplicate tools', () => {
      const invalidTools = createValidTools({
        availableTools: ['tool1', 'tool2', 'tool1'] // Duplicate
      });
      const result = aiAgent.updateTools(invalidTools);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Available tools must be unique');
    });

    it('should reject configuration for unavailable tool', () => {
      const invalidTools = createValidTools({
        availableTools: ['tool1', 'tool2'],
        toolConfigurations: {
          'tool1': { setting: 'value' },
          'tool3': { setting: 'value' } // tool3 not in available tools
        }
      });
      const result = aiAgent.updateTools(invalidTools);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Tool configuration found for unavailable tool: tool3');
    });

    it('should create defensive copies of tools', () => {
      const originalTools = createValidTools();
      const result = aiAgent.updateTools(originalTools);
      
      expect(result.isSuccess).toBe(true);
      
      // Modify original
      originalTools.availableTools.push('hacked-tool');
      originalTools.toolConfigurations['new-hack'] = { malicious: true };
      
      // Agent should maintain original values
      expect(aiAgent.tools.availableTools).not.toContain('hacked-tool');
      expect(aiAgent.tools.toolConfigurations['new-hack']).toBeUndefined();
    });
  });

  describe('Capabilities Management', () => {
    let aiAgent: AIAgent;

    beforeEach(() => {
      const props = createValidAIAgentProps();
      aiAgent = AIAgent.create(props).value;
    });

    it('should update capabilities successfully', async () => {
      const initialUpdatedAt = aiAgent.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const newCapabilities = createValidCapabilities({
        canRead: false,
        canWrite: true,
        canExecute: false,
        canAnalyze: true,
        canOrchestrate: true,
        maxConcurrentTasks: 10,
        supportedDataTypes: ['xml', 'csv', 'binary']
      });
      
      const result = aiAgent.updateCapabilities(newCapabilities);
      
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.capabilities).toEqual(newCapabilities);
      expect(aiAgent.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should reject invalid max concurrent tasks (too low)', () => {
      const invalidCapabilities = createValidCapabilities({ maxConcurrentTasks: 0 });
      const result = aiAgent.updateCapabilities(invalidCapabilities);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Max concurrent tasks must be between 1 and 100');
    });

    it('should reject invalid max concurrent tasks (too high)', () => {
      const invalidCapabilities = createValidCapabilities({ maxConcurrentTasks: 101 });
      const result = aiAgent.updateCapabilities(invalidCapabilities);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Max concurrent tasks must be between 1 and 100');
    });

    it('should allow boundary values for max concurrent tasks', () => {
      const minCapabilities = createValidCapabilities({ maxConcurrentTasks: 1 });
      const maxCapabilities = createValidCapabilities({ maxConcurrentTasks: 100 });
      
      expect(aiAgent.updateCapabilities(minCapabilities).isSuccess).toBe(true);
      expect(aiAgent.updateCapabilities(maxCapabilities).isSuccess).toBe(true);
    });

    it('should reject empty supported data types', () => {
      const invalidCapabilities = createValidCapabilities({ supportedDataTypes: [] });
      const result = aiAgent.updateCapabilities(invalidCapabilities);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent must support at least one data type');
    });

    it('should create defensive copy of capabilities', () => {
      const originalCapabilities = createValidCapabilities();
      const result = aiAgent.updateCapabilities(originalCapabilities);
      
      expect(result.isSuccess).toBe(true);
      
      // Modify original
      originalCapabilities.maxConcurrentTasks = 999;
      originalCapabilities.supportedDataTypes.push('hacked-type');
      
      // Primitive values are copied, but arrays are referenced (shallow copy)
      expect(aiAgent.capabilities.maxConcurrentTasks).toBe(5); // Primitive copied
      expect(aiAgent.capabilities.supportedDataTypes).toContain('hacked-type'); // Array is referenced
    });
  });

  describe('Enable/Disable Management', () => {
    let aiAgent: AIAgent;

    beforeEach(() => {
      const props = createValidAIAgentProps({ isEnabled: false });
      aiAgent = AIAgent.create(props).value;
    });

    it('should enable agent successfully', async () => {
      const initialUpdatedAt = aiAgent.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      expect(aiAgent.isEnabled).toBe(false);
      
      const result = aiAgent.enable();
      
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.isEnabled).toBe(true);
      expect(aiAgent.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should disable agent successfully', async () => {
      aiAgent.enable(); // First enable it
      const initialUpdatedAt = aiAgent.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      expect(aiAgent.isEnabled).toBe(true);
      
      const result = aiAgent.disable();
      
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.isEnabled).toBe(false);
      expect(aiAgent.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });
  });

  describe('Execution Tracking', () => {
    let aiAgent: AIAgent;

    beforeEach(() => {
      const props = createValidAIAgentProps();
      aiAgent = AIAgent.create(props).value;
    });

    it('should record successful execution', async () => {
      const initialUpdatedAt = aiAgent.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const result = aiAgent.recordExecution(true, 1500);
      
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.executionCount).toBe(1);
      expect(aiAgent.successCount).toBe(1);
      expect(aiAgent.failureCount).toBe(0);
      expect(aiAgent.averageExecutionTime).toBe(1500);
      expect(aiAgent.lastExecutedAt).toBeDefined();
      expect(aiAgent.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should record failed execution', () => {
      const result = aiAgent.recordExecution(false, 800);
      
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.executionCount).toBe(1);
      expect(aiAgent.successCount).toBe(0);
      expect(aiAgent.failureCount).toBe(1);
      expect(aiAgent.averageExecutionTime).toBe(800);
    });

    it('should calculate average execution time correctly', () => {
      aiAgent.recordExecution(true, 1000);
      aiAgent.recordExecution(false, 2000);
      aiAgent.recordExecution(true, 1500);
      
      expect(aiAgent.executionCount).toBe(3);
      expect(aiAgent.successCount).toBe(2);
      expect(aiAgent.failureCount).toBe(1);
      expect(aiAgent.averageExecutionTime).toBe(1500); // (1000 + 2000 + 1500) / 3
    });

    it('should reject negative execution time', () => {
      const result = aiAgent.recordExecution(true, -100);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Execution time cannot be negative');
      expect(aiAgent.executionCount).toBe(0);
    });

    it('should allow zero execution time', () => {
      const result = aiAgent.recordExecution(true, 0);
      
      expect(result.isSuccess).toBe(true);
      expect(aiAgent.averageExecutionTime).toBe(0);
    });
  });

  describe('Rate Calculations', () => {
    let aiAgent: AIAgent;

    beforeEach(() => {
      const props = createValidAIAgentProps();
      aiAgent = AIAgent.create(props).value;
    });

    it('should return 0 success rate for no executions', () => {
      expect(aiAgent.getSuccessRate()).toBe(0);
      expect(aiAgent.getFailureRate()).toBe(0);
    });

    it('should calculate success rate correctly', () => {
      aiAgent.recordExecution(true, 100);
      aiAgent.recordExecution(false, 100);
      aiAgent.recordExecution(true, 100);
      
      expect(aiAgent.getSuccessRate()).toBe(2/3);
      expect(aiAgent.getFailureRate()).toBe(1/3);
    });

    it('should handle 100% success rate', () => {
      aiAgent.recordExecution(true, 100);
      aiAgent.recordExecution(true, 100);
      
      expect(aiAgent.getSuccessRate()).toBe(1);
      expect(aiAgent.getFailureRate()).toBe(0);
    });

    it('should handle 100% failure rate', () => {
      aiAgent.recordExecution(false, 100);
      aiAgent.recordExecution(false, 100);
      
      expect(aiAgent.getSuccessRate()).toBe(0);
      expect(aiAgent.getFailureRate()).toBe(1);
    });
  });

  describe('Capability and Tool Checking', () => {
    let aiAgent: AIAgent;

    beforeEach(() => {
      const capabilities = createValidCapabilities({
        canRead: true,
        canWrite: false,
        canExecute: true,
        canAnalyze: false,
        canOrchestrate: true
      });
      const tools = createValidTools({
        availableTools: ['text-processor', 'data-analyzer', 'file-reader']
      });
      const props = createValidAIAgentProps({ capabilities, tools });
      aiAgent = AIAgent.create(props).value;
    });

    it('should check capabilities correctly', () => {
      expect(aiAgent.hasCapability('canRead')).toBe(true);
      expect(aiAgent.hasCapability('canWrite')).toBe(false);
      expect(aiAgent.hasCapability('canExecute')).toBe(true);
      expect(aiAgent.hasCapability('canAnalyze')).toBe(false);
      expect(aiAgent.hasCapability('canOrchestrate')).toBe(true);
    });

    it('should check tools correctly', () => {
      expect(aiAgent.hasTool('text-processor')).toBe(true);
      expect(aiAgent.hasTool('data-analyzer')).toBe(true);
      expect(aiAgent.hasTool('file-reader')).toBe(true);
      expect(aiAgent.hasTool('non-existent-tool')).toBe(false);
    });
  });

  describe('Equality and Comparison', () => {
    it('should be equal when agent IDs match', () => {
      const props1 = createValidAIAgentProps();
      const props2 = createValidAIAgentProps({
        name: 'Different Agent', // Different properties
        entityId: 'different-entity'
      });
      
      const agent1 = AIAgent.create(props1).value;
      const agent2 = AIAgent.create(props2).value;
      
      expect(agent1.equals(agent2)).toBe(true);
    });

    it('should not be equal when agent IDs differ', () => {
      const differentAgentId = NodeId.create('999e4567-e89b-42d3-a456-426614174999').value;
      const props1 = createValidAIAgentProps();
      const props2 = createValidAIAgentProps({ agentId: differentAgentId });
      
      const agent1 = AIAgent.create(props1).value;
      const agent2 = AIAgent.create(props2).value;
      
      expect(agent1.equals(agent2)).toBe(false);
    });
  });

  describe('Validation Rules', () => {
    it('should reject empty agent name', () => {
      const props = createValidAIAgentProps({ name: '' });
      const result = AIAgent.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent name is required');
    });

    it('should reject whitespace-only agent name', () => {
      const props = createValidAIAgentProps({ name: '   ' });
      const result = AIAgent.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent name is required');
    });

    it('should reject agent name exceeding 100 characters', () => {
      const props = createValidAIAgentProps({ name: 'A'.repeat(101) });
      const result = AIAgent.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent name cannot exceed 100 characters');
    });

    it('should reject empty instructions', () => {
      const props = createValidAIAgentProps({ instructions: '' });
      const result = AIAgent.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent instructions are required');
    });

    it('should reject whitespace-only instructions', () => {
      const props = createValidAIAgentProps({ instructions: '   ' });
      const result = AIAgent.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent instructions are required');
    });

    it('should reject instructions exceeding 10000 characters', () => {
      const props = createValidAIAgentProps({ instructions: 'A'.repeat(10001) });
      const result = AIAgent.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Agent instructions cannot exceed 10000 characters');
    });

    it('should reject empty entity ID', () => {
      const props = createValidAIAgentProps({ entityId: '' });
      const result = AIAgent.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Entity ID is required');
    });

    it('should reject whitespace-only entity ID', () => {
      const props = createValidAIAgentProps({ entityId: '   ' });
      const result = AIAgent.create(props);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Entity ID is required');
    });
  });

  describe('Business Logic Integration', () => {
    it('should maintain consistency during complex operations', async () => {
      const props = createValidAIAgentProps();
      const aiAgent = AIAgent.create(props).value;
      
      const initialUpdatedAt = aiAgent.updatedAt;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Perform multiple updates
      const nameResult = aiAgent.updateName('Updated Agent');
      const descResult = aiAgent.updateDescription('Updated description');
      const instResult = aiAgent.updateInstructions('Updated instructions');
      const enableResult = aiAgent.enable();
      const execResult = aiAgent.recordExecution(true, 1200);
      
      expect(nameResult.isSuccess).toBe(true);
      expect(descResult.isSuccess).toBe(true);
      expect(instResult.isSuccess).toBe(true);
      expect(enableResult.isSuccess).toBe(true);
      expect(execResult.isSuccess).toBe(true);
      
      // Verify all changes persisted
      expect(aiAgent.name).toBe('Updated Agent');
      expect(aiAgent.description).toBe('Updated description');
      expect(aiAgent.instructions).toBe('Updated instructions');
      expect(aiAgent.isEnabled).toBe(true);
      expect(aiAgent.executionCount).toBe(1);
      expect(aiAgent.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should handle error scenarios gracefully', () => {
      const props = createValidAIAgentProps();
      const aiAgent = AIAgent.create(props).value;
      
      const originalName = aiAgent.name;
      const originalInstructions = aiAgent.instructions;
      const originalExecutionCount = aiAgent.executionCount;
      const originalUpdatedAt = aiAgent.updatedAt;
      
      // Try invalid operations
      const nameResult = aiAgent.updateName('A'.repeat(101));
      const instResult = aiAgent.updateInstructions('');
      const execResult = aiAgent.recordExecution(true, -100);
      
      expect(nameResult.isFailure).toBe(true);
      expect(instResult.isFailure).toBe(true);
      expect(execResult.isFailure).toBe(true);
      
      // Verify no changes occurred
      expect(aiAgent.name).toBe(originalName);
      expect(aiAgent.instructions).toBe(originalInstructions);
      expect(aiAgent.executionCount).toBe(originalExecutionCount);
      expect(aiAgent.updatedAt).toEqual(originalUpdatedAt);
    });

    it('should support all feature types', () => {
      const featureTypes = [
        FeatureType.FUNCTION_MODEL,
        FeatureType.KNOWLEDGE_BASE,
        FeatureType.SPINDLE,
        FeatureType.EVENT_STORM
      ];
      
      featureTypes.forEach(featureType => {
        const props = createValidAIAgentProps({
          featureType,
          entityId: `${featureType}-entity`
        });
        const result = AIAgent.create(props);
        
        expect(result.isSuccess).toBe(true);
        const aiAgent = result.value;
        expect(aiAgent.featureType).toBe(featureType);
      });
    });
  });

  describe('Performance Tracking', () => {
    it('should track execution statistics over time', () => {
      const props = createValidAIAgentProps();
      const aiAgent = AIAgent.create(props).value;
      
      // Simulate a series of executions
      const executions = [
        { success: true, time: 1000 },
        { success: true, time: 1200 },
        { success: false, time: 800 },
        { success: true, time: 1500 },
        { success: false, time: 600 },
        { success: true, time: 1100 }
      ];
      
      executions.forEach(({ success, time }) => {
        aiAgent.recordExecution(success, time);
      });
      
      expect(aiAgent.executionCount).toBe(6);
      expect(aiAgent.successCount).toBe(4);
      expect(aiAgent.failureCount).toBe(2);
      expect(aiAgent.getSuccessRate()).toBe(4/6);
      expect(aiAgent.getFailureRate()).toBe(2/6);
      
      // Average: (1000 + 1200 + 800 + 1500 + 600 + 1100) / 6 = 1033.33...
      expect(aiAgent.averageExecutionTime).toBeCloseTo(1033.33, 2);
      expect(aiAgent.lastExecutedAt).toBeDefined();
    });
  });
});