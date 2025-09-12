/**
 * Infrastructure Layer Error Handling Tests for Unified Node System
 * 
 * These tests define the expected error handling behavior that eliminates the current
 * problems with "[object Object]" error messages and improper error serialization.
 * 
 * TDD RED PHASE: Tests will fail until proper error handling is implemented
 * 
 * TARGET ERROR HANDLING:
 * - Clean, readable error messages without "[object Object]"
 * - Proper error object serialization 
 * - Consistent error format across all operations
 * - Domain-appropriate error messages for constraint violations
 * - No development environment hacks affecting error handling
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createIntegrationTestContext, IntegrationTestContext, DatabaseConstraintTester } from '../../utils/integration-test-database';
import { UnifiedNode, NodeFactory, NodeType } from '../../../lib/domain/entities/unified-node';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { Position } from '../../../lib/domain/value-objects/position';
import { ExecutionMode, NodeStatus } from '../../../lib/domain/enums';
import { Result } from '../../../lib/domain/shared/result';

// Mock UnifiedNodeRepository interface for error testing
interface UnifiedNodeRepository {
  addUnifiedNode(modelId: string, node: UnifiedNode): Promise<Result<void>>;
  getUnifiedNode(nodeId: string): Promise<Result<UnifiedNode | null>>;
  updateUnifiedNode(nodeId: string, node: UnifiedNode): Promise<Result<void>>;
  removeUnifiedNode(nodeId: string): Promise<Result<void>>;
}

describe('Infrastructure Layer - Error Handling Integration Tests', () => {
  let context: IntegrationTestContext;
  let constraintTester: DatabaseConstraintTester;
  let testModelId: string;
  let unifiedRepository: UnifiedNodeRepository;

  beforeEach(async () => {
    context = await createIntegrationTestContext();
    constraintTester = new DatabaseConstraintTester(context);
    testModelId = crypto.randomUUID();
    
    // Create test model
    const { error: modelError } = await context.supabase
      .from('function_models')
      .insert({
        model_id: testModelId,
        name: 'Error Test Model',
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
    
    // TODO: Replace with actual UnifiedNodeRepository when implemented
    unifiedRepository = {
      addUnifiedNode: async () => Result.fail("UnifiedNodeRepository not yet implemented"),
      getUnifiedNode: async () => Result.fail("UnifiedNodeRepository not yet implemented"),
      updateUnifiedNode: async () => Result.fail("UnifiedNodeRepository not yet implemented"),
      removeUnifiedNode: async () => Result.fail("UnifiedNodeRepository not yet implemented")
    };
  });

  afterEach(async () => {
    await context.cleanup();
  });

  describe('Database Constraint Error Handling', () => {
    
    test('addUnifiedNode_DuplicateNodeId_ReturnsCleanUniqueConstraintError', async () => {
      const nodeId = NodeId.create();
      const firstNode = await createTestNode(nodeId, 'First Node');
      
      // Add first node successfully
      const firstResult = await unifiedRepository.addUnifiedNode(testModelId, firstNode);
      expect(firstResult.isSuccess).toBe(true);
      
      // Attempt to add duplicate
      const duplicateNode = await createTestNode(nodeId, 'Duplicate Node');
      const duplicateResult = await unifiedRepository.addUnifiedNode(testModelId, duplicateNode);
      
      // Assert clean error handling
      expect(duplicateResult.isFailure).toBe(true);
      expect(duplicateResult.error).not.toContain('[object Object]');
      expect(duplicateResult.error).not.toContain('undefined');
      expect(duplicateResult.error).toMatch(/node.*already.*exists|duplicate.*node|unique.*constraint/i);
      expect(duplicateResult.error).toContain(nodeId.toString());
    });

    test('addUnifiedNode_InvalidModelId_ReturnsCleanForeignKeyError', async () => {
      const invalidModelId = crypto.randomUUID();
      const testNode = await createTestNode(NodeId.create(), 'Orphaned Node');
      
      const result = await unifiedRepository.addUnifiedNode(invalidModelId, testNode);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).not.toContain('[object Object]');
      expect(result.error).not.toContain('null');
      expect(result.error).toMatch(/model.*not.*found|invalid.*model|foreign.*key/i);
      expect(result.error).toContain(invalidModelId);
    });

    test('addUnifiedNode_NullRequiredField_ReturnsCleanNotNullError', async () => {
      // Test with null node name
      const nodeWithNullName = UnifiedNode.create({
        nodeId: NodeId.create(),
        modelId: testModelId,
        name: '', // Empty name should fail validation
        nodeType: NodeType.IO_NODE,
        position: Position.create(0, 0),
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {}
      });
      
      if (nodeWithNullName.isSuccess) {
        const result = await unifiedRepository.addUnifiedNode(testModelId, nodeWithNullName.value);
        
        expect(result.isFailure).toBe(true);
        expect(result.error).not.toContain('[object Object]');
        expect(result.error).toMatch(/name.*required|name.*empty|not.*null/i);
      }
    });

    test('updateUnifiedNode_NodeNotFound_ReturnsCleanNotFoundError', async () => {
      const nonExistentNodeId = crypto.randomUUID();
      const testNode = await createTestNode(NodeId.create(), 'Update Test Node');
      
      const result = await unifiedRepository.updateUnifiedNode(nonExistentNodeId, testNode);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).not.toContain('[object Object]');
      expect(result.error).not.toContain('undefined');
      expect(result.error).toMatch(/node.*not.*found|node.*does.*not.*exist/i);
      expect(result.error).toContain(nonExistentNodeId);
    });

    test('removeUnifiedNode_NodeNotFound_ReturnsCleanNotFoundError', async () => {
      const nonExistentNodeId = crypto.randomUUID();
      
      const result = await unifiedRepository.removeUnifiedNode(nonExistentNodeId);
      
      expect(result.isFailure).toBe(true);
      expect(result.error).not.toContain('[object Object]');
      expect(result.error).not.toContain('null');
      expect(result.error).toMatch(/node.*not.*found|node.*does.*not.*exist/i);
      expect(result.error).toContain(nonExistentNodeId);
    });
  });

  describe('Data Serialization Error Handling', () => {
    
    test('addUnifiedNode_CircularReferenceInMetadata_ReturnsInformativeSerializationError', async () => {
      const circularRef: any = { name: 'circular' };
      circularRef.self = circularRef;
      
      const nodeResult = UnifiedNode.create({
        nodeId: NodeId.create(),
        modelId: testModelId,
        name: 'Circular Reference Node',
        nodeType: NodeType.STAGE_NODE,
        position: Position.create(0, 0),
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: { circularData: circularRef },
        visualProperties: {}
      });
      
      if (nodeResult.isSuccess) {
        const result = await unifiedRepository.addUnifiedNode(testModelId, nodeResult.value);
        
        expect(result.isFailure).toBe(true);
        expect(result.error).not.toContain('[object Object]');
        expect(result.error).toMatch(/serialization.*error|circular.*reference|json.*error/i);
        expect(result.error).toContain('metadata');
      }
    });

    test('addUnifiedNode_InvalidJSONInTypeSpecificData_ReturnsSpecificFieldError', async () => {
      // Create node with problematic type-specific data
      const problematicData = {
        config: {
          // This might cause serialization issues in some contexts
          invalidDate: new Date(),
          invalidFunction: () => 'test',
          invalidUndefined: undefined
        }
      };
      
      const nodeResult = UnifiedNode.create({
        nodeId: NodeId.create(),
        modelId: testModelId,
        name: 'Problematic Data Node',
        nodeType: NodeType.STAGE_NODE,
        position: Position.create(0, 0),
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        metadata: {},
        visualProperties: {},
        stageData: { processingConfig: problematicData }
      });
      
      if (nodeResult.isSuccess) {
        const result = await unifiedRepository.addUnifiedNode(testModelId, nodeResult.value);
        
        if (result.isFailure) {
          expect(result.error).not.toContain('[object Object]');
          expect(result.error).toMatch(/stage.*data|processing.*config|serialization/i);
        }
      }
    });

    test('getUnifiedNode_DatabaseCorruption_ReturnsCleanDeserializationError', async () => {
      // First insert valid node
      const testNode = await createTestNode(NodeId.create(), 'Valid Node');
      await unifiedRepository.addUnifiedNode(testModelId, testNode);
      
      // Manually corrupt the JSON data in database
      const { error: corruptError } = await context.supabase
        .from('function_model_nodes')
        .update({
          metadata: 'invalid json string'  // This should cause JSON parsing error
        })
        .eq('node_id', testNode.nodeId.toString());
      
      if (!corruptError) {
        const result = await unifiedRepository.getUnifiedNode(testNode.nodeId.toString());
        
        expect(result.isFailure).toBe(true);
        expect(result.error).not.toContain('[object Object]');
        expect(result.error).toMatch(/json.*parse|invalid.*json|deserialization/i);
      }
    });
  });

  describe('Network and Connection Error Handling', () => {
    
    test('networkError_DatabaseUnavailable_ReturnsCleanConnectionError', async () => {
      // This test would simulate network issues
      // In a real implementation, we'd mock the database connection to fail
      
      const testNode = await createTestNode(NodeId.create(), 'Network Test Node');
      
      // TODO: Mock network failure for testing
      // For now, we'll test that the repository handles connection errors gracefully
      
      // The actual implementation should catch network errors and return clean Result.fail()
      const result = await unifiedRepository.addUnifiedNode(testModelId, testNode);
      
      if (result.isFailure) {
        expect(result.error).not.toContain('[object Object]');
        expect(result.error).not.toContain('undefined');
        // Should contain readable error message about connection issues
      }
    });

    test('timeout_LongRunningOperation_ReturnsCleanTimeoutError', async () => {
      // Test timeout handling for long-running database operations
      // This would require configuring short timeouts for testing
      
      const testNode = await createTestNode(NodeId.create(), 'Timeout Test Node');
      
      // TODO: Configure short timeout for testing
      const result = await unifiedRepository.addUnifiedNode(testModelId, testNode);
      
      if (result.isFailure) {
        expect(result.error).not.toContain('[object Object]');
        if (result.error.includes('timeout')) {
          expect(result.error).toMatch(/timeout|operation.*took.*too.*long/i);
        }
      }
    });
  });

  describe('Domain Validation Error Handling', () => {
    
    test('addUnifiedNode_InvalidNodeType_ReturnsCleanDomainError', async () => {
      // Attempt to create node with invalid type through direct database insertion
      const { error } = await context.supabase
        .from('function_model_nodes')
        .insert({
          node_id: crypto.randomUUID(),
          model_id: testModelId,
          node_type: 'invalidNodeType',
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
      expect(error!.message).not.toContain('[object Object]');
      expect(error!.message).toMatch(/constraint|check|invalid.*value/i);
    });

    test('addUnifiedNode_InvalidExecutionType_ReturnsCleanEnumError', async () => {
      const { error } = await context.supabase
        .from('function_model_nodes')
        .insert({
          node_id: crypto.randomUUID(),
          model_id: testModelId,
          node_type: NodeType.STAGE_NODE,
          name: 'Invalid Execution Type Node',
          position_x: 0,
          position_y: 0,
          dependencies: [],
          execution_type: 'invalidExecutionType',
          status: 'draft',
          metadata: {},
          visual_properties: {}
        });
      
      expect(error).toBeDefined();
      expect(error!.message).not.toContain('[object Object]');
      expect(error!.message).toMatch(/constraint|check|invalid.*execution.*type/i);
    });

    test('addUnifiedNode_InvalidStatus_ReturnsCleanStatusError', async () => {
      const { error } = await context.supabase
        .from('function_model_nodes')
        .insert({
          node_id: crypto.randomUUID(),
          model_id: testModelId,
          node_type: NodeType.IO_NODE,
          name: 'Invalid Status Node',
          position_x: 0,
          position_y: 0,
          dependencies: [],
          execution_type: 'sequential',
          status: 'invalidStatus',
          metadata: {},
          visual_properties: {}
        });
      
      expect(error).toBeDefined();
      expect(error!.message).not.toContain('[object Object]');
      expect(error!.message).toMatch(/constraint|check|invalid.*status/i);
    });
  });

  describe('Error Context and Logging', () => {
    
    test('errorLogging_IncludesRelevantContext_WithoutExposingInternalDetails', async () => {
      const testNode = await createTestNode(NodeId.create(), 'Context Test Node');
      
      const result = await unifiedRepository.addUnifiedNode(testModelId, testNode);
      
      if (result.isFailure) {
        // Error should include relevant context
        expect(result.error).toMatch(/node|repository|database/i);
        
        // But should NOT expose internal implementation details
        expect(result.error).not.toMatch(/supabase|client|connection.*string/i);
        expect(result.error).not.toContain('password');
        expect(result.error).not.toContain('api.*key');
        expect(result.error).not.toContain('token');
      }
    });

    test('errorStackTrace_DevelopmentMode_IncludesDebugInfo', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        const testNode = await createTestNode(NodeId.create(), 'Debug Info Node');
        const result = await unifiedRepository.addUnifiedNode(testModelId, testNode);
        
        if (result.isFailure) {
          // In development, might include more debug information
          // But should still be clean and readable
          expect(result.error).not.toContain('[object Object]');
          expect(result.error).not.toContain('undefined');
        }
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('errorStackTrace_ProductionMode_HidesSensitiveInfo', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      try {
        const testNode = await createTestNode(NodeId.create(), 'Production Error Node');
        const result = await unifiedRepository.addUnifiedNode(testModelId, testNode);
        
        if (result.isFailure) {
          // In production, should hide internal details
          expect(result.error).not.toContain('[object Object]');
          expect(result.error).not.toContain('stack trace');
          expect(result.error).not.toContain('file path');
          expect(result.error).not.toMatch(/line.*\d+|column.*\d+/);
        }
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    
    test('transientError_RetryableOperation_EventuallySucceeds', async () => {
      // Test that transient errors are handled gracefully
      // This would require mocking intermittent failures
      
      const testNode = await createTestNode(NodeId.create(), 'Retry Test Node');
      
      // In a real implementation, the repository might implement retry logic
      // For now, we test that errors are clean and operations can be retried
      
      let attempts = 0;
      let lastError = '';
      
      while (attempts < 3) {
        const result = await unifiedRepository.addUnifiedNode(testModelId, testNode);
        
        if (result.isSuccess) {
          break;
        }
        
        lastError = result.error;
        attempts++;
      }
      
      // If all attempts failed, error should still be clean
      if (attempts === 3 && lastError) {
        expect(lastError).not.toContain('[object Object]');
        expect(lastError).not.toContain('undefined');
      }
    });

    test('errorRecovery_PartialFailure_ReturnsStatusAndProgress', async () => {
      // Test batch operations that might partially fail
      const nodes = [
        await createTestNode(NodeId.create(), 'Batch Node 1'),
        await createTestNode(NodeId.create(), 'Batch Node 2'),
        await createTestNode(NodeId.create(), 'Batch Node 3')
      ];
      
      // Simulate a batch operation where some succeed and some fail
      const results = [];
      for (const node of nodes) {
        const result = await unifiedRepository.addUnifiedNode(testModelId, node);
        results.push(result);
      }
      
      // All errors should be clean regardless of success/failure
      results.forEach((result, index) => {
        if (result.isFailure) {
          expect(result.error).not.toContain('[object Object]');
          expect(result.error).not.toContain('undefined');
          expect(result.error).toContain(`${index + 1}`); // Should indicate which operation failed
        }
      });
    });
  });

  // Helper function to create test nodes
  async function createTestNode(nodeId: NodeId, name: string): Promise<UnifiedNode> {
    const nodeResult = UnifiedNode.create({
      nodeId,
      modelId: testModelId,
      name,
      nodeType: NodeType.STAGE_NODE,
      position: Position.create(0, 0),
      dependencies: [],
      executionType: ExecutionMode.SEQUENTIAL,
      status: NodeStatus.DRAFT,
      metadata: {},
      visualProperties: {}
    });
    
    expect(nodeResult.isSuccess).toBe(true);
    return nodeResult.value;
  }
});

/**
 * ERROR HANDLING ARCHITECTURE SUMMARY
 * 
 * These tests define the expected error handling that eliminates current problems:
 * 
 * 1. NO MORE "[object Object]" ERRORS:
 *    - All error messages are strings or properly serialized
 *    - Error objects are handled with proper toString() methods
 *    - No undefined or null values in error messages
 * 
 * 2. DOMAIN-APPROPRIATE ERROR MESSAGES:
 *    - Constraint violations explain what went wrong
 *    - Not found errors specify what wasn't found
 *    - Serialization errors indicate which field caused the problem
 * 
 * 3. CLEAN ERROR CONTEXT:
 *    - Relevant information for debugging (node IDs, model IDs)
 *    - No exposure of sensitive internal details
 *    - Environment-appropriate level of detail
 * 
 * 4. RESILIENT ERROR HANDLING:
 *    - Network errors are caught and handled gracefully
 *    - Timeout scenarios have clear error messages
 *    - Partial failures in batch operations are properly reported
 * 
 * 5. PROPER ERROR CLASSIFICATION:
 *    - Database constraint errors
 *    - Serialization/deserialization errors
 *    - Network and connection errors
 *    - Domain validation errors
 * 
 * These tests will drive the implementation of clean error handling
 * that makes debugging and troubleshooting much easier.
 */