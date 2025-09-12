/**
 * Infrastructure Layer Tests for Unified Node Persistence
 * 
 * Tests define the target infrastructure layer that will replace the fragmented
 * repository system with a clean, unified approach to node persistence.
 * 
 * TDD RED PHASE: These tests will FAIL until the unified infrastructure is implemented.
 * They define the expected behavior that eliminates:
 * - Complex type coercion and hardcoded mappings
 * - Fragmented persistence logic across container/action nodes  
 * - Development hacks like in-memory stores for non-UUID modelIds
 * - Inconsistent error handling and serialization
 * 
 * TARGET INFRASTRUCTURE ARCHITECTURE:
 * - Single addUnifiedNode method that handles all 5 node types
 * - Clean database schema with unified NodeType enum values
 * - Type-specific data in JSON fields without coercion
 * - Proper UUID/development ID handling without hacks
 * - Clean error objects with readable messages
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createIntegrationTestContext, IntegrationTestContext, IntegrationTestAssertions } from '../../utils/integration-test-database';
import { UnifiedNode, NodeFactory, NodeType, IONodeData, StageNodeData, TetherNodeData, KBNodeData, FunctionModelContainerData } from '../../../lib/domain/entities/unified-node';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { Position } from '../../../lib/domain/value-objects/position';
import { ExecutionMode, NodeStatus } from '../../../lib/domain/enums';
import { Result } from '../../../lib/domain/shared/result';

// Interface defining the target unified repository architecture
interface UnifiedNodeRepository {
  addUnifiedNode(modelId: string, node: UnifiedNode): Promise<Result<void>>;
  getUnifiedNode(nodeId: string): Promise<Result<UnifiedNode | null>>;
  updateUnifiedNode(nodeId: string, node: UnifiedNode): Promise<Result<void>>;
  removeUnifiedNode(nodeId: string): Promise<Result<void>>;
  getUnifiedNodesByModel(modelId: string): Promise<Result<UnifiedNode[]>>;
  getUnifiedNodesByType(modelId: string, nodeType: NodeType): Promise<Result<UnifiedNode[]>>;
}

describe('Infrastructure Layer - Unified Node Repository Integration Tests', () => {
  let context: IntegrationTestContext;
  let testModelId: string;
  
  // These will fail until unified infrastructure is implemented
  let unifiedRepository: UnifiedNodeRepository;

  beforeEach(async () => {
    context = await createIntegrationTestContext();
    testModelId = `test-model-${Date.now()}`;
    
    // TODO: Replace with actual UnifiedNodeRepository when implemented
    // For now, this will cause tests to fail as intended (RED phase)
    unifiedRepository = {
      addUnifiedNode: async () => Result.fail("UnifiedNodeRepository not yet implemented"),
      getUnifiedNode: async () => Result.fail("UnifiedNodeRepository not yet implemented"),
      updateUnifiedNode: async () => Result.fail("UnifiedNodeRepository not yet implemented"),
      removeUnifiedNode: async () => Result.fail("UnifiedNodeRepository not yet implemented"),
      getUnifiedNodesByModel: async () => Result.fail("UnifiedNodeRepository not yet implemented"),
      getUnifiedNodesByType: async () => Result.fail("UnifiedNodeRepository not yet implemented")
    };
  });

  afterEach(async () => {
    await context.cleanup();
  });

  describe('Successful Persistence Tests - All 5 Node Types', () => {
    
    test('addUnifiedNode_IONodeWithBoundaryData_PersistsCorrectly', async () => {
      // Arrange
      const nodeId = NodeId.create();
      const position = Position.create(100, 200);
      const ioData: IONodeData = {
        boundaryType: 'input',
        inputDataContract: {
          schema: { type: 'object', properties: { data: { type: 'string' } } }
        }
      };
      
      const ioNodeResult = UnifiedNode.create({
        nodeId,
        modelId: testModelId,
        name: 'Test Input Node',
        nodeType: NodeType.IO_NODE,
        position,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: { testNode: true },
        visualProperties: { width: 200, height: 100 },
        ioData
      });
      expect(ioNodeResult.isSuccess).toBe(true);
      const ioNode = ioNodeResult.value;
      
      // Act
      const addResult = await unifiedRepository.addUnifiedNode(testModelId, ioNode);
      
      // Assert
      expect(addResult.isSuccess).toBe(true);
      
      // Verify persistence with correct data mapping
      const retrievedResult = await unifiedRepository.getUnifiedNode(nodeId.toString());
      expect(retrievedResult.isSuccess).toBe(true);
      expect(retrievedResult.value).not.toBeNull();
      
      const retrieved = retrievedResult.value!;
      expect(retrieved.getNodeType()).toBe(NodeType.IO_NODE);
      expect(retrieved.name).toBe('Test Input Node');
      expect(retrieved.position.x).toBe(100);
      expect(retrieved.position.y).toBe(200);
      expect(retrieved.isIONode()).toBe(true);
      
      const retrievedIOData = retrieved.getIOData();
      expect(retrievedIOData.boundaryType).toBe('input');
      expect(retrievedIOData.inputDataContract?.schema).toEqual({ 
        type: 'object', 
        properties: { data: { type: 'string' } } 
      });
    });

    test('addUnifiedNode_StageNodeWithProcessingConfig_PersistsCorrectly', async () => {
      // Arrange
      const nodeId = NodeId.create();
      const position = Position.create(300, 400);
      const stageData: StageNodeData = {
        processingConfig: {
          algorithm: 'linear-regression',
          parameters: { learningRate: 0.01, maxIterations: 1000 }
        }
      };
      
      const stageNodeResult = UnifiedNode.create({
        nodeId,
        modelId: testModelId,
        name: 'ML Processing Stage',
        nodeType: NodeType.STAGE_NODE,
        position,
        dependencies: [],
        executionType: ExecutionMode.PARALLEL,
        status: NodeStatus.CONFIGURED,
        timeout: 30000,
        metadata: { processingNode: true },
        visualProperties: { width: 250, height: 150 },
        stageData
      });
      expect(stageNodeResult.isSuccess).toBe(true);
      const stageNode = stageNodeResult.value;
      
      // Act
      const addResult = await unifiedRepository.addUnifiedNode(testModelId, stageNode);
      
      // Assert
      expect(addResult.isSuccess).toBe(true);
      
      // Verify type-specific data roundtrip
      const retrievedResult = await unifiedRepository.getUnifiedNode(nodeId.toString());
      expect(retrievedResult.isSuccess).toBe(true);
      
      const retrieved = retrievedResult.value!;
      expect(retrieved.getNodeType()).toBe(NodeType.STAGE_NODE);
      expect(retrieved.isStageNode()).toBe(true);
      expect(retrieved.timeout).toBe(30000);
      
      const retrievedConfig = retrieved.getStageConfiguration();
      expect(retrievedConfig.algorithm).toBe('linear-regression');
      expect(retrievedConfig.parameters.learningRate).toBe(0.01);
    });

    test('addUnifiedNode_TetherNodeWithConnectionSettings_PersistsCorrectly', async () => {
      // Arrange
      const nodeId = NodeId.create();
      const position = Position.create(500, 600);
      const tetherData: TetherNodeData = {
        connectionConfig: {
          endpoint: 'https://api.external.com/v1/data',
          authentication: { type: 'bearer', token: 'test-token' },
          retryPolicy: { maxRetries: 3, backoffMs: 1000 }
        }
      };
      
      const tetherNodeResult = UnifiedNode.create({
        nodeId,
        modelId: testModelId,
        name: 'External API Tether',
        nodeType: NodeType.TETHER_NODE,
        position,
        dependencies: [],
        executionType: ExecutionMode.CONDITIONAL,
        status: NodeStatus.ACTIVE,
        metadata: { external: true },
        visualProperties: { color: '#FF6B6B' },
        tetherData
      });
      expect(tetherNodeResult.isSuccess).toBe(true);
      const tetherNode = tetherNodeResult.value;
      
      // Act
      const addResult = await unifiedRepository.addUnifiedNode(testModelId, tetherNode);
      
      // Assert
      expect(addResult.isSuccess).toBe(true);
      
      // Verify connection configuration persistence
      const retrievedResult = await unifiedRepository.getUnifiedNode(nodeId.toString());
      expect(retrievedResult.isSuccess).toBe(true);
      
      const retrieved = retrievedResult.value!;
      expect(retrieved.getNodeType()).toBe(NodeType.TETHER_NODE);
      expect(retrieved.isTetherNode()).toBe(true);
      
      // Verify tether-specific data (this will be accessible through private field testing)
      expect(retrieved.metadata.external).toBe(true);
    });

    test('addUnifiedNode_KBNodeWithKnowledgeSource_PersistsCorrectly', async () => {
      // Arrange
      const nodeId = NodeId.create();
      const position = Position.create(700, 800);
      const kbData: KBNodeData = {
        knowledgeSourceConfig: {
          sourceType: 'vector-database',
          connectionString: 'pinecone://api-key@environment/index',
          embeddingModel: 'text-embedding-3-small',
          maxResults: 10
        }
      };
      
      const kbNodeResult = UnifiedNode.create({
        nodeId,
        modelId: testModelId,
        name: 'Knowledge Retrieval',
        nodeType: NodeType.KB_NODE,
        position,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.CONFIGURED,
        metadata: { knowledgeBase: true },
        visualProperties: { icon: 'database' },
        kbData
      });
      expect(kbNodeResult.isSuccess).toBe(true);
      const kbNode = kbNodeResult.value;
      
      // Act
      const addResult = await unifiedRepository.addUnifiedNode(testModelId, kbNode);
      
      // Assert
      expect(addResult.isSuccess).toBe(true);
      
      // Verify knowledge source configuration
      const retrievedResult = await unifiedRepository.getUnifiedNode(nodeId.toString());
      expect(retrievedResult.isSuccess).toBe(true);
      
      const retrieved = retrievedResult.value!;
      expect(retrieved.getNodeType()).toBe(NodeType.KB_NODE);
      expect(retrieved.isKBNode()).toBe(true);
      expect(retrieved.canStore()).toBe(true);
      
      const retrievedKBConfig = retrieved.getKBSourceConfiguration();
      expect(retrievedKBConfig.sourceType).toBe('vector-database');
      expect(retrievedKBConfig.embeddingModel).toBe('text-embedding-3-small');
    });

    test('addUnifiedNode_FunctionModelContainerWithNestedModel_PersistsCorrectly', async () => {
      // Arrange
      const nodeId = NodeId.create();
      const position = Position.create(900, 1000);
      const containerData: FunctionModelContainerData = {
        nestedModelId: 'nested-function-model-uuid'
      };
      
      const containerNodeResult = UnifiedNode.create({
        nodeId,
        modelId: testModelId,
        name: 'Nested Function Model',
        nodeType: NodeType.FUNCTION_MODEL_CONTAINER,
        position,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: { nested: true },
        visualProperties: { expandable: true },
        containerData
      });
      expect(containerNodeResult.isSuccess).toBe(true);
      const containerNode = containerNodeResult.value;
      
      // Act
      const addResult = await unifiedRepository.addUnifiedNode(testModelId, containerNode);
      
      // Assert
      expect(addResult.isSuccess).toBe(true);
      
      // Verify nested model reference
      const retrievedResult = await unifiedRepository.getUnifiedNode(nodeId.toString());
      expect(retrievedResult.isSuccess).toBe(true);
      
      const retrieved = retrievedResult.value!;
      expect(retrieved.getNodeType()).toBe(NodeType.FUNCTION_MODEL_CONTAINER);
      expect(retrieved.isFunctionModelContainer()).toBe(true);
      expect(retrieved.canNest()).toBe(true);
      expect(retrieved.canProcess()).toBe(true);
    });
  });

  describe('Database Schema Consistency Tests', () => {
    
    test('databaseMapping_AllNodeTypes_UseSingleNodeTypeField', async () => {
      // Test that all node types map to a single consistent node_type field
      const nodeTypes = [
        NodeType.IO_NODE,
        NodeType.STAGE_NODE, 
        NodeType.TETHER_NODE,
        NodeType.KB_NODE,
        NodeType.FUNCTION_MODEL_CONTAINER
      ];
      
      const nodes: UnifiedNode[] = [];
      
      for (const nodeType of nodeTypes) {
        const nodeResult = NodeFactory.createUnifiedNode(nodeType, {
          modelId: testModelId,
          name: `Test ${nodeType} Node`,
          position: Position.create(0, 0),
          userId: 'test-user'
        });
        expect(nodeResult.isSuccess).toBe(true);
        nodes.push(nodeResult.value);
      }
      
      // Persist all nodes
      for (const node of nodes) {
        const addResult = await unifiedRepository.addUnifiedNode(testModelId, node);
        expect(addResult.isSuccess).toBe(true);
      }
      
      // Verify database schema consistency
      const { data: dbRows, error } = await context.supabase
        .from('function_model_nodes')
        .select('node_type, io_data, stage_data, tether_data, kb_data, container_data')
        .eq('model_id', testModelId);
      
      expect(error).toBeNull();
      expect(dbRows).toHaveLength(5);
      
      // Verify each row has the correct unified node_type value
      const ioRow = dbRows.find(row => row.node_type === 'ioNode');
      const stageRow = dbRows.find(row => row.node_type === 'stageNode');
      const tetherRow = dbRows.find(row => row.node_type === 'tetherNode');
      const kbRow = dbRows.find(row => row.node_type === 'kbNode');
      const containerRow = dbRows.find(row => row.node_type === 'functionModelContainer');
      
      expect(ioRow).toBeDefined();
      expect(stageRow).toBeDefined();
      expect(tetherRow).toBeDefined();
      expect(kbRow).toBeDefined();
      expect(containerRow).toBeDefined();
      
      // Verify type-specific data is stored in correct JSON fields
      expect(ioRow.io_data).toBeDefined();
      expect(ioRow.stage_data).toBeNull();
      
      expect(stageRow.stage_data).toBeDefined();
      expect(stageRow.io_data).toBeNull();
      
      expect(tetherRow.tether_data).toBeDefined();
      expect(tetherRow.kb_data).toBeNull();
    });

    test('jsonSerialization_TypeSpecificData_NoCoercionRequired', async () => {
      // Test that type-specific data roundtrips without type coercion
      const complexData = {
        nested: {
          array: [1, 2, 3],
          boolean: true,
          nullValue: null,
          string: "test"
        },
        schema: {
          type: "object",
          properties: {
            timestamp: { type: "string", format: "date-time" }
          }
        }
      };
      
      const nodeResult = UnifiedNode.create({
        nodeId: NodeId.create(),
        modelId: testModelId,
        name: 'Complex Data Node',
        nodeType: NodeType.STAGE_NODE,
        position: Position.create(0, 0),
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        stageData: { processingConfig: complexData }
      });
      expect(nodeResult.isSuccess).toBe(true);
      
      const addResult = await unifiedRepository.addUnifiedNode(testModelId, nodeResult.value);
      expect(addResult.isSuccess).toBe(true);
      
      // Verify no data loss or type coercion
      const retrievedResult = await unifiedRepository.getUnifiedNode(nodeResult.value.nodeId.toString());
      expect(retrievedResult.isSuccess).toBe(true);
      
      const retrievedConfig = retrievedResult.value!.getStageConfiguration();
      expect(retrievedConfig.nested.array).toEqual([1, 2, 3]);
      expect(retrievedConfig.nested.boolean).toBe(true);
      expect(retrievedConfig.nested.nullValue).toBeNull();
      expect(retrievedConfig.schema.properties.timestamp.format).toBe("date-time");
    });
  });

  describe('Repository Behavior Tests', () => {
    
    test('updateUnifiedNode_ModifyTypeSpecificData_UpdatesCorrectly', async () => {
      // Create initial node
      const nodeResult = NodeFactory.createUnifiedNode(NodeType.IO_NODE, {
        modelId: testModelId,
        name: 'Updatable IO Node',
        position: Position.create(100, 100),
        userId: 'test-user',
        typeSpecificData: {
          boundaryType: 'input',
          dataContract: {
            inputSchema: { type: 'string' }
          }
        }
      });
      expect(nodeResult.isSuccess).toBe(true);
      const originalNode = nodeResult.value;
      
      await unifiedRepository.addUnifiedNode(testModelId, originalNode);
      
      // Update with new data contract
      const updatedNodeResult = originalNode.updateInputDataContract({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        }
      });
      expect(updatedNodeResult.isSuccess).toBe(true);
      
      // Act
      const updateResult = await unifiedRepository.updateUnifiedNode(
        originalNode.nodeId.toString(),
        updatedNodeResult.value
      );
      
      // Assert
      expect(updateResult.isSuccess).toBe(true);
      
      const retrievedResult = await unifiedRepository.getUnifiedNode(originalNode.nodeId.toString());
      expect(retrievedResult.isSuccess).toBe(true);
      
      const retrieved = retrievedResult.value!;
      const ioData = retrieved.getIOData();
      expect(ioData.inputDataContract.properties.name.type).toBe('string');
      expect(ioData.inputDataContract.properties.age.type).toBe('number');
    });

    test('getUnifiedNodesByType_FilterByNodeType_ReturnsCorrectNodes', async () => {
      // Create nodes of different types
      const ioNodeResult = NodeFactory.createUnifiedNode(NodeType.IO_NODE, {
        modelId: testModelId,
        name: 'IO Node 1',
        position: Position.create(0, 0),
        userId: 'test-user'
      });
      
      const stageNodeResult = NodeFactory.createUnifiedNode(NodeType.STAGE_NODE, {
        modelId: testModelId,
        name: 'Stage Node 1',
        position: Position.create(100, 100),
        userId: 'test-user'
      });
      
      const anotherIONodeResult = NodeFactory.createUnifiedNode(NodeType.IO_NODE, {
        modelId: testModelId,
        name: 'IO Node 2',
        position: Position.create(200, 200),
        userId: 'test-user'
      });
      
      // Add all nodes
      await unifiedRepository.addUnifiedNode(testModelId, ioNodeResult.value);
      await unifiedRepository.addUnifiedNode(testModelId, stageNodeResult.value);
      await unifiedRepository.addUnifiedNode(testModelId, anotherIONodeResult.value);
      
      // Act
      const ioNodesResult = await unifiedRepository.getUnifiedNodesByType(testModelId, NodeType.IO_NODE);
      
      // Assert
      expect(ioNodesResult.isSuccess).toBe(true);
      expect(ioNodesResult.value).toHaveLength(2);
      expect(ioNodesResult.value.every(node => node.isIONode())).toBe(true);
      
      const nodeNames = ioNodesResult.value.map(node => node.name);
      expect(nodeNames).toContain('IO Node 1');
      expect(nodeNames).toContain('IO Node 2');
      expect(nodeNames).not.toContain('Stage Node 1');
    });
  });

  describe('Error Handling Tests', () => {
    
    test('addUnifiedNode_DatabaseConstraintViolation_ReturnsCleanError', async () => {
      // Create node with duplicate ID
      const nodeId = NodeId.create();
      const firstNodeResult = UnifiedNode.create({
        nodeId,
        modelId: testModelId,
        name: 'First Node',
        nodeType: NodeType.IO_NODE,
        position: Position.create(0, 0),
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {}
      });
      
      await unifiedRepository.addUnifiedNode(testModelId, firstNodeResult.value);
      
      // Attempt to add another node with same ID
      const duplicateNodeResult = UnifiedNode.create({
        nodeId, // Same nodeId
        modelId: testModelId,
        name: 'Duplicate Node',
        nodeType: NodeType.STAGE_NODE,
        position: Position.create(100, 100),
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {}
      });
      
      // Act
      const result = await unifiedRepository.addUnifiedNode(testModelId, duplicateNodeResult.value);
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('node already exists');
      expect(result.error).not.toContain('[object Object]');
      expect(result.error).toMatch(/node.*already.*exists/i);
    });

    test('getUnifiedNode_InvalidNodeId_ReturnsCleanError', async () => {
      // Act
      const result = await unifiedRepository.getUnifiedNode('invalid-node-id');
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('not found');
      expect(result.error).not.toContain('undefined');
      expect(result.error).not.toContain('[object Object]');
    });

    test('addUnifiedNode_SerializationError_ReturnsInformativeError', async () => {
      // Create node with circular reference in metadata (will cause serialization error)
      const circularRef: any = { name: 'circular' };
      circularRef.self = circularRef;
      
      const nodeResult = UnifiedNode.create({
        nodeId: NodeId.create(),
        modelId: testModelId,
        name: 'Problem Node',
        nodeType: NodeType.STAGE_NODE,
        position: Position.create(0, 0),
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: { circular: circularRef },
        visualProperties: {}
      });
      
      // Act
      const result = await unifiedRepository.addUnifiedNode(testModelId, nodeResult.value);
      
      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/serializ|circular|convert/i);
      expect(result.error).not.toContain('[object Object]');
    });
  });

  describe('Environment Handling Tests', () => {
    
    test('addUnifiedNode_DevelopmentEnvironment_HandlesNonUUIDModelIds', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        const developmentModelId = 'dev-model-123';
        
        const nodeResult = NodeFactory.createUnifiedNode(NodeType.IO_NODE, {
          modelId: developmentModelId,
          name: 'Development Node',
          position: Position.create(0, 0),
          userId: 'dev-user'
        });
        
        // Act
        const result = await unifiedRepository.addUnifiedNode(developmentModelId, nodeResult.value);
        
        // Assert
        expect(result.isSuccess).toBe(true);
        
        // Should be able to retrieve it
        const retrievedResult = await unifiedRepository.getUnifiedNode(nodeResult.value.nodeId.toString());
        expect(retrievedResult.isSuccess).toBe(true);
        expect(retrievedResult.value!.modelId).toBe(developmentModelId);
        
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('addUnifiedNode_ProductionEnvironment_RequiresValidUUIDs', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      try {
        const invalidModelId = 'invalid-model-id';
        
        const nodeResult = NodeFactory.createUnifiedNode(NodeType.IO_NODE, {
          modelId: invalidModelId,
          name: 'Production Node',
          position: Position.create(0, 0),
          userId: 'prod-user'
        });
        
        // Act
        const result = await unifiedRepository.addUnifiedNode(invalidModelId, nodeResult.value);
        
        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toMatch(/model.*not.*found|invalid.*model/i);
        
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('nodeIdValidation_AlwaysRequiresValidFormat_RejectsInvalidIds', async () => {
      const invalidNodeIds = [
        '',
        'invalid',
        '123',
        'node-with-spaces',
        'node/with/slashes'
      ];
      
      for (const invalidId of invalidNodeIds) {
        // Creating NodeId should fail for invalid formats
        const nodeIdResult = NodeId.create(invalidId);
        if (nodeIdResult.isSuccess) {
          // If NodeId creation succeeds, repository should still validate
          const nodeResult = UnifiedNode.create({
            nodeId: nodeIdResult.value,
            modelId: testModelId,
            name: 'Test Node',
            nodeType: NodeType.IO_NODE,
            position: Position.create(0, 0),
            dependencies: [],
            executionType: ExecutionMode.SEQUENTIAL,
            status: NodeStatus.DRAFT,
            metadata: {},
            visualProperties: {}
          });
          
          if (nodeResult.isSuccess) {
            const result = await unifiedRepository.addUnifiedNode(testModelId, nodeResult.value);
            expect(result.isFailure).toBe(true);
            expect(result.error).toMatch(/invalid.*id|node.*id/i);
          }
        }
      }
    });
  });

  describe('Integration Testing Scenarios', () => {
    
    test('completeWorkflow_CreateUpdateRetrieveDelete_AllNodeTypes', async () => {
      const nodeTypes = Object.values(NodeType);
      const createdNodes: UnifiedNode[] = [];
      
      // Create one node of each type
      for (const nodeType of nodeTypes) {
        const nodeResult = NodeFactory.createUnifiedNode(nodeType, {
          modelId: testModelId,
          name: `Workflow ${nodeType} Node`,
          position: Position.create(Math.random() * 1000, Math.random() * 1000),
          userId: 'workflow-user'
        });
        expect(nodeResult.isSuccess).toBe(true);
        createdNodes.push(nodeResult.value);
        
        // Create
        const createResult = await unifiedRepository.addUnifiedNode(testModelId, nodeResult.value);
        expect(createResult.isSuccess).toBe(true);
      }
      
      // Retrieve all nodes
      const allNodesResult = await unifiedRepository.getUnifiedNodesByModel(testModelId);
      expect(allNodesResult.isSuccess).toBe(true);
      expect(allNodesResult.value).toHaveLength(nodeTypes.length);
      
      // Update each node
      for (const node of createdNodes) {
        const updatedResult = node.updateName(`Updated ${node.name}`);
        expect(updatedResult.isSuccess).toBe(true);
        
        const updateResult = await unifiedRepository.updateUnifiedNode(
          node.nodeId.toString(),
          updatedResult.value
        );
        expect(updateResult.isSuccess).toBe(true);
      }
      
      // Verify updates
      for (const node of createdNodes) {
        const retrievedResult = await unifiedRepository.getUnifiedNode(node.nodeId.toString());
        expect(retrievedResult.isSuccess).toBe(true);
        expect(retrievedResult.value!.name).toContain('Updated');
      }
      
      // Delete all nodes
      for (const node of createdNodes) {
        const deleteResult = await unifiedRepository.removeUnifiedNode(node.nodeId.toString());
        expect(deleteResult.isSuccess).toBe(true);
      }
      
      // Verify deletion
      const finalNodesResult = await unifiedRepository.getUnifiedNodesByModel(testModelId);
      expect(finalNodesResult.isSuccess).toBe(true);
      expect(finalNodesResult.value).toHaveLength(0);
    });

    test('performanceTest_BulkNodeOperations_CompletesWithinReasonableTime', async () => {
      const nodeCount = 50;
      const startTime = performance.now();
      
      // Create nodes in bulk
      const nodes: UnifiedNode[] = [];
      for (let i = 0; i < nodeCount; i++) {
        const nodeType = Object.values(NodeType)[i % Object.values(NodeType).length];
        const nodeResult = NodeFactory.createUnifiedNode(nodeType, {
          modelId: testModelId,
          name: `Bulk Node ${i}`,
          position: Position.create(i * 10, i * 10),
          userId: 'perf-user'
        });
        expect(nodeResult.isSuccess).toBe(true);
        nodes.push(nodeResult.value);
      }
      
      // Add all nodes
      for (const node of nodes) {
        const result = await unifiedRepository.addUnifiedNode(testModelId, node);
        expect(result.isSuccess).toBe(true);
      }
      
      // Retrieve all at once
      const retrieveResult = await unifiedRepository.getUnifiedNodesByModel(testModelId);
      expect(retrieveResult.isSuccess).toBe(true);
      expect(retrieveResult.value).toHaveLength(nodeCount);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(10000); // 10 seconds
      console.log(`Bulk operations (${nodeCount} nodes) completed in ${duration.toFixed(2)}ms`);
    });
  });
});

/**
 * TEST ARCHITECTURE VALIDATION
 * 
 * These tests define the target infrastructure layer that will:
 * 
 * 1. ELIMINATE FRAGMENTATION:
 *    - Single addUnifiedNode method for all node types
 *    - No separate container/action node handling
 *    - Unified database schema with single node_type field
 * 
 * 2. ELIMINATE TYPE COERCION:
 *    - Direct UnifiedNode domain entity persistence  
 *    - Type-specific data in dedicated JSON fields
 *    - No hardcoded mapping or conversion logic
 * 
 * 3. ELIMINATE DEVELOPMENT HACKS:
 *    - Clean UUID validation without special cases
 *    - No in-memory stores for non-UUID IDs
 *    - Consistent behavior across environments
 * 
 * 4. PROVIDE CLEAN ERROR HANDLING:
 *    - Readable error messages without "[object Object]"
 *    - Proper serialization error detection
 *    - Clear constraint violation messages
 * 
 * 5. ENSURE ARCHITECTURAL COMPLIANCE:
 *    - Repository handles only infrastructure concerns
 *    - Domain entities remain pure
 *    - Clean separation of persistence and business logic
 * 
 * TDD PROCESS:
 * RED: All these tests will FAIL until UnifiedNodeRepository is implemented
 * GREEN: Implement minimal UnifiedNodeRepository to make tests pass
 * REFACTOR: Clean up implementation while keeping tests passing
 */