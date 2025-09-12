/**
 * Infrastructure Layer Database Schema Tests for Unified Node System
 * 
 * These tests validate that the database schema supports the unified node architecture
 * without requiring complex type coercion or fragmented persistence patterns.
 * 
 * TDD RED PHASE: Tests define the expected database schema behavior
 * 
 * TARGET SCHEMA ARCHITECTURE:
 * - Single `node_type` field with unified NodeType enum values
 * - Type-specific JSON fields (io_data, stage_data, tether_data, kb_data, container_data)
 * - Consistent column mapping for all node types
 * - No legacy type coercion between ContainerNodeType/ActionNodeType
 * - Clean constraint definitions and foreign key relationships
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createIntegrationTestContext, IntegrationTestContext } from '../../utils/integration-test-database';
import { NodeType } from '../../../lib/domain/enums';

describe('Infrastructure Layer - Database Schema Integration Tests', () => {
  let context: IntegrationTestContext;
  let testModelId: string;

  beforeEach(async () => {
    context = await createIntegrationTestContext();
    testModelId = crypto.randomUUID();
    
    // Create test model for foreign key validation
    const { error: modelError } = await context.supabase
      .from('function_models')
      .insert({
        model_id: testModelId,
        name: 'Test Model for Schema Tests',
        version: '1.0.0',
        status: 'draft',
        current_version: '1.0.0',
        version_count: 1,
        metadata: {},
        permissions: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_saved_at: new Date().toISOString()
      });
    expect(modelError).toBeNull();
  });

  afterEach(async () => {
    await context.cleanup();
  });

  describe('Schema Structure Validation', () => {
    
    test('tableSchema_FunctionModelNodes_HasUnifiedColumns', async () => {
      // Query the table schema to validate unified structure
      const { data: columns, error } = await context.supabase
        .rpc('get_table_schema', { table_name: 'function_model_nodes' });
      
      // If RPC doesn't exist, use information_schema query
      if (error) {
        const { data: schemaData, error: schemaError } = await context.supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_name', 'function_model_nodes');
        
        expect(schemaError).toBeNull();
        expect(schemaData).toBeDefined();
        
        const columnNames = schemaData?.map(col => col.column_name) || [];
        
        // Unified schema requirements
        expect(columnNames).toContain('node_id');
        expect(columnNames).toContain('model_id');
        expect(columnNames).toContain('node_type'); // Single unified field
        expect(columnNames).toContain('name');
        expect(columnNames).toContain('description');
        expect(columnNames).toContain('position_x');
        expect(columnNames).toContain('position_y');
        expect(columnNames).toContain('dependencies');
        expect(columnNames).toContain('execution_type');
        expect(columnNames).toContain('status');
        expect(columnNames).toContain('timeout');
        expect(columnNames).toContain('metadata');
        expect(columnNames).toContain('visual_properties');
        
        // Type-specific JSON fields
        expect(columnNames).toContain('io_data');
        expect(columnNames).toContain('stage_data');
        expect(columnNames).toContain('tether_data');
        expect(columnNames).toContain('kb_data');
        expect(columnNames).toContain('container_data');
        
        // Should NOT have legacy fragmented fields
        expect(columnNames).not.toContain('action_specific_data');
        expect(columnNames).not.toContain('type_specific_data');
      }
    });

    test('nodeTypeField_AcceptsAllUnifiedValues_RejectsInvalidValues', async () => {
      const validNodeTypes = Object.values(NodeType);
      
      // Test valid node types
      for (const nodeType of validNodeTypes) {
        const { error } = await context.supabase
          .from('function_model_nodes')
          .insert({
            node_id: crypto.randomUUID(),
            model_id: testModelId,
            node_type: nodeType,
            name: `Test ${nodeType} Node`,
            position_x: 0,
            position_y: 0,
            dependencies: [],
            execution_type: 'sequential',
            status: 'draft',
            metadata: {},
            visual_properties: {}
          });
        
        expect(error).toBeNull();
      }
      
      // Test invalid node types
      const invalidNodeTypes = [
        'invalidType',
        'container',
        'action', 
        '',
        null,
        undefined
      ];
      
      for (const invalidType of invalidNodeTypes) {
        const { error } = await context.supabase
          .from('function_model_nodes')
          .insert({
            node_id: crypto.randomUUID(),
            model_id: testModelId,
            node_type: invalidType,
            name: 'Invalid Type Node',
            position_x: 0,
            position_y: 0,
            dependencies: [],
            execution_type: 'sequential',
            status: 'draft',
            metadata: {},
            visual_properties: {}
          });
        
        expect(error).toBeDefined();
        expect(error!.message).toMatch(/constraint|check|invalid/i);
      }
    });

    test('typeSpecificFields_StoreJSONCorrectly_AllowNullForOtherTypes', async () => {
      // Insert IO Node with io_data, others null
      const ioNodeId = crypto.randomUUID();
      const { error: ioError } = await context.supabase
        .from('function_model_nodes')
        .insert({
          node_id: ioNodeId,
          model_id: testModelId,
          node_type: NodeType.IO_NODE,
          name: 'IO Test Node',
          position_x: 0,
          position_y: 0,
          dependencies: [],
          execution_type: 'sequential',
          status: 'draft',
          metadata: {},
          visual_properties: {},
          io_data: {
            boundaryType: 'input',
            inputDataContract: { type: 'string' }
          },
          stage_data: null,
          tether_data: null,
          kb_data: null,
          container_data: null
        });
      
      expect(ioError).toBeNull();
      
      // Verify data was stored correctly
      const { data: ioNode, error: fetchError } = await context.supabase
        .from('function_model_nodes')
        .select('*')
        .eq('node_id', ioNodeId)
        .single();
      
      expect(fetchError).toBeNull();
      expect(ioNode.io_data.boundaryType).toBe('input');
      expect(ioNode.io_data.inputDataContract.type).toBe('string');
      expect(ioNode.stage_data).toBeNull();
      expect(ioNode.tether_data).toBeNull();
      expect(ioNode.kb_data).toBeNull();
      expect(ioNode.container_data).toBeNull();
    });

    test('complexJSONData_SerializationRoundtrip_PreservesDataTypes', async () => {
      const complexData = {
        nested: {
          array: [1, 2, 3, "string", true, null],
          object: {
            number: 42.5,
            boolean: false,
            nullValue: null,
            emptyString: ""
          }
        },
        schema: {
          type: "object",
          properties: {
            timestamp: { type: "string", format: "date-time" },
            metadata: {
              type: "object",
              additionalProperties: true
            }
          },
          required: ["timestamp"]
        }
      };
      
      const nodeId = crypto.randomUUID();
      const { error: insertError } = await context.supabase
        .from('function_model_nodes')
        .insert({
          node_id: nodeId,
          model_id: testModelId,
          node_type: NodeType.STAGE_NODE,
          name: 'Complex Data Node',
          position_x: 0,
          position_y: 0,
          dependencies: [],
          execution_type: 'sequential',
          status: 'draft',
          metadata: {},
          visual_properties: {},
          stage_data: { processingConfig: complexData }
        });
      
      expect(insertError).toBeNull();
      
      // Retrieve and verify no data loss
      const { data: retrieved, error: fetchError } = await context.supabase
        .from('function_model_nodes')
        .select('stage_data')
        .eq('node_id', nodeId)
        .single();
      
      expect(fetchError).toBeNull();
      const retrievedConfig = retrieved.stage_data.processingConfig;
      
      // Verify complex nested data
      expect(retrievedConfig.nested.array).toEqual([1, 2, 3, "string", true, null]);
      expect(retrievedConfig.nested.object.number).toBe(42.5);
      expect(retrievedConfig.nested.object.boolean).toBe(false);
      expect(retrievedConfig.nested.object.nullValue).toBeNull();
      expect(retrievedConfig.nested.object.emptyString).toBe("");
      
      // Verify schema data
      expect(retrievedConfig.schema.properties.timestamp.format).toBe("date-time");
      expect(retrievedConfig.schema.required).toEqual(["timestamp"]);
    });
  });

  describe('Constraint Validation', () => {
    
    test('primaryKeyConstraint_NodeId_EnforcesUniqueness', async () => {
      const duplicateNodeId = crypto.randomUUID();
      
      // Insert first node
      const { error: firstError } = await context.supabase
        .from('function_model_nodes')
        .insert({
          node_id: duplicateNodeId,
          model_id: testModelId,
          node_type: NodeType.IO_NODE,
          name: 'First Node',
          position_x: 0,
          position_y: 0,
          dependencies: [],
          execution_type: 'sequential',
          status: 'draft',
          metadata: {},
          visual_properties: {}
        });
      
      expect(firstError).toBeNull();
      
      // Attempt duplicate
      const { error: duplicateError } = await context.supabase
        .from('function_model_nodes')
        .insert({
          node_id: duplicateNodeId, // Same ID
          model_id: testModelId,
          node_type: NodeType.STAGE_NODE,
          name: 'Duplicate Node',
          position_x: 100,
          position_y: 100,
          dependencies: [],
          execution_type: 'sequential',
          status: 'draft',
          metadata: {},
          visual_properties: {}
        });
      
      expect(duplicateError).toBeDefined();
      expect(duplicateError!.code).toBe('23505'); // Unique constraint violation
    });

    test('foreignKeyConstraint_ModelId_EnforcesRelationship', async () => {
      const nonExistentModelId = crypto.randomUUID();
      
      const { error } = await context.supabase
        .from('function_model_nodes')
        .insert({
          node_id: crypto.randomUUID(),
          model_id: nonExistentModelId, // Non-existent model
          node_type: NodeType.IO_NODE,
          name: 'Orphaned Node',
          position_x: 0,
          position_y: 0,
          dependencies: [],
          execution_type: 'sequential',
          status: 'draft',
          metadata: {},
          visual_properties: {}
        });
      
      expect(error).toBeDefined();
      expect(error!.code).toBe('23503'); // Foreign key constraint violation
    });

    test('notNullConstraints_RequiredFields_EnforcePresence', async () => {
      const requiredFields = [
        { field: 'node_id', value: null },
        { field: 'model_id', value: null },
        { field: 'node_type', value: null },
        { field: 'name', value: null }
      ];
      
      for (const { field, value } of requiredFields) {
        const nodeData = {
          node_id: crypto.randomUUID(),
          model_id: testModelId,
          node_type: NodeType.IO_NODE,
          name: 'Test Node',
          position_x: 0,
          position_y: 0,
          dependencies: [],
          execution_type: 'sequential',
          status: 'draft',
          metadata: {},
          visual_properties: {}
        };
        
        // Override the field being tested
        (nodeData as any)[field] = value;
        
        const { error } = await context.supabase
          .from('function_model_nodes')
          .insert(nodeData);
        
        expect(error).toBeDefined();
        expect(error!.code).toBe('23502'); // Not null constraint violation
      }
    });

    test('checkConstraints_NodeTypeEnum_ValidatesValues', async () => {
      // This test ensures the database has proper enum constraints
      const { error } = await context.supabase
        .from('function_model_nodes')
        .insert({
          node_id: crypto.randomUUID(),
          model_id: testModelId,
          node_type: 'invalidNodeType',
          name: 'Invalid Node',
          position_x: 0,
          position_y: 0,
          dependencies: [],
          execution_type: 'sequential',
          status: 'draft',
          metadata: {},
          visual_properties: {}
        });
      
      expect(error).toBeDefined();
      expect(error!.message).toMatch(/constraint|check|enum|invalid/i);
    });
  });

  describe('Index Performance Validation', () => {
    
    test('queryPerformance_ModelIdIndex_FastRetrieval', async () => {
      // Insert multiple nodes for different models
      const otherModelIds = [crypto.randomUUID(), crypto.randomUUID()];
      const nodeCount = 20;
      
      // Insert nodes for test model
      for (let i = 0; i < nodeCount; i++) {
        await context.supabase
          .from('function_model_nodes')
          .insert({
            node_id: crypto.randomUUID(),
            model_id: testModelId,
            node_type: NodeType.STAGE_NODE,
            name: `Node ${i}`,
            position_x: i * 10,
            position_y: i * 10,
            dependencies: [],
            execution_type: 'sequential',
            status: 'draft',
            metadata: { index: i },
            visual_properties: {}
          });
      }
      
      // Insert nodes for other models  
      for (const modelId of otherModelIds) {
        // Create model first
        await context.supabase
          .from('function_models')
          .insert({
            model_id: modelId,
            name: `Other Model ${modelId.slice(0, 8)}`,
            version: '1.0.0',
            status: 'draft',
            current_version: '1.0.0',
            version_count: 1,
            metadata: {},
            permissions: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_saved_at: new Date().toISOString()
          });
        
        for (let i = 0; i < nodeCount; i++) {
          await context.supabase
            .from('function_model_nodes')
            .insert({
              node_id: crypto.randomUUID(),
              model_id: modelId,
              node_type: NodeType.IO_NODE,
              name: `Other Node ${i}`,
              position_x: i * 10,
              position_y: i * 10,
              dependencies: [],
              execution_type: 'sequential',
              status: 'draft',
              metadata: { index: i },
              visual_properties: {}
            });
        }
      }
      
      // Query for specific model nodes with timing
      const startTime = performance.now();
      const { data, error } = await context.supabase
        .from('function_model_nodes')
        .select('*')
        .eq('model_id', testModelId);
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(data).toHaveLength(nodeCount);
      expect(queryTime).toBeLessThan(100); // Should be fast with proper indexing
    });

    test('queryPerformance_NodeTypeFilter_EfficientFiltering', async () => {
      const nodeTypes = Object.values(NodeType);
      const nodesPerType = 5;
      
      // Insert nodes of each type
      for (const nodeType of nodeTypes) {
        for (let i = 0; i < nodesPerType; i++) {
          await context.supabase
            .from('function_model_nodes')
            .insert({
              node_id: crypto.randomUUID(),
              model_id: testModelId,
              node_type: nodeType,
              name: `${nodeType} Node ${i}`,
              position_x: i * 10,
              position_y: i * 10,
              dependencies: [],
              execution_type: 'sequential',
              status: 'draft',
              metadata: { type: nodeType, index: i },
              visual_properties: {}
            });
        }
      }
      
      // Query for specific node type with timing
      const startTime = performance.now();
      const { data, error } = await context.supabase
        .from('function_model_nodes')
        .select('*')
        .eq('model_id', testModelId)
        .eq('node_type', NodeType.STAGE_NODE);
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      expect(error).toBeNull();
      expect(data).toHaveLength(nodesPerType);
      expect(data.every(node => node.node_type === NodeType.STAGE_NODE)).toBe(true);
      expect(queryTime).toBeLessThan(50); // Should be efficient with compound index
    });
  });

  describe('Migration Compatibility', () => {
    
    test('legacyDataMigration_OldNodeTypes_MapsToUnifiedTypes', async () => {
      // Test that legacy data can be migrated to unified schema
      const legacyMappings = [
        { legacy: 'ioNode', unified: NodeType.IO_NODE },
        { legacy: 'stageNode', unified: NodeType.STAGE_NODE },
        { legacy: 'tetherNode', unified: NodeType.TETHER_NODE },
        { legacy: 'kbNode', unified: NodeType.KB_NODE },
        { legacy: 'functionModelContainer', unified: NodeType.FUNCTION_MODEL_CONTAINER }
      ];
      
      for (const { legacy, unified } of legacyMappings) {
        // Simulate migrated data
        const { error } = await context.supabase
          .from('function_model_nodes')
          .insert({
            node_id: crypto.randomUUID(),
            model_id: testModelId,
            node_type: unified, // Should use unified enum value
            name: `Migrated ${legacy} Node`,
            position_x: 0,
            position_y: 0,
            dependencies: [],
            execution_type: 'sequential',
            status: 'draft',
            metadata: { migrated: true, originalType: legacy },
            visual_properties: {}
          });
        
        expect(error).toBeNull();
      }
      
      // Verify all migrated nodes can be queried
      const { data, error } = await context.supabase
        .from('function_model_nodes')
        .select('*')
        .eq('model_id', testModelId)
        .eq('metadata->>migrated', 'true');
      
      expect(error).toBeNull();
      expect(data).toHaveLength(legacyMappings.length);
    });

    test('backwardCompatibility_ExistingQueries_StillWork', async () => {
      // Insert nodes using unified schema
      const nodeTypes = [NodeType.IO_NODE, NodeType.STAGE_NODE, NodeType.KB_NODE];
      
      for (const nodeType of nodeTypes) {
        await context.supabase
          .from('function_model_nodes')
          .insert({
            node_id: crypto.randomUUID(),
            model_id: testModelId,
            node_type: nodeType,
            name: `Compatibility Test ${nodeType}`,
            position_x: 0,
            position_y: 0,
            dependencies: [],
            execution_type: 'sequential',
            status: 'draft',
            metadata: {},
            visual_properties: {}
          });
      }
      
      // Test various query patterns that should work
      const queryPatterns = [
        // Simple type filter
        context.supabase
          .from('function_model_nodes')
          .select('*')
          .eq('node_type', NodeType.IO_NODE),
        
        // Multiple type filter
        context.supabase
          .from('function_model_nodes')
          .select('*')
          .in('node_type', [NodeType.IO_NODE, NodeType.STAGE_NODE]),
        
        // Join with model
        context.supabase
          .from('function_model_nodes')
          .select('*, function_models(*)')
          .eq('model_id', testModelId),
        
        // Metadata filtering
        context.supabase
          .from('function_model_nodes')
          .select('*')
          .eq('model_id', testModelId)
          .order('name')
      ];
      
      for (const query of queryPatterns) {
        const { error } = await query;
        expect(error).toBeNull();
      }
    });
  });
});

/**
 * SCHEMA VALIDATION SUMMARY
 * 
 * These tests validate that the database schema supports:
 * 
 * 1. UNIFIED NODE TYPE SYSTEM:
 *    - Single node_type field with enum constraint
 *    - All 5 node types supported: IO, Stage, Tether, KB, Container
 *    - No legacy type coercion required
 * 
 * 2. TYPE-SPECIFIC DATA STORAGE:
 *    - Separate JSON columns for each node type's data
 *    - Complex nested JSON serialization/deserialization
 *    - No data loss in roundtrip operations
 * 
 * 3. PROPER CONSTRAINTS:
 *    - Primary key uniqueness on node_id
 *    - Foreign key relationship to function_models
 *    - Not null constraints on required fields
 *    - Check constraints on enum values
 * 
 * 4. PERFORMANCE OPTIMIZATION:
 *    - Efficient indexing on model_id and node_type
 *    - Fast query performance for filtering operations
 *    - Scalable for large node collections
 * 
 * 5. MIGRATION SUPPORT:
 *    - Backward compatibility with existing queries
 *    - Clean migration path from fragmented schema
 *    - No breaking changes for existing functionality
 */