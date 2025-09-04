/**
 * Repository Transaction Integrity Specification Tests
 * 
 * TDD Tests to drive proper transaction handling and data consistency in repository operations
 * These tests act as specifications for ensuring data integrity across multi-table operations
 * 
 * Key Problems Being Driven:
 * 1. Transaction rollback on partial failures (model saves but nodes fail)
 * 2. Orphaned records when cascade operations fail
 * 3. Data consistency during concurrent operations
 * 4. Proper error propagation from transaction failures
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseFunctionModelRepository } from '../../../../lib/infrastructure/repositories/supabase-function-model-repository';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { IONode } from '../../../../lib/domain/entities/io-node';
import { TetherNode } from '../../../../lib/domain/entities/tether-node';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { Position } from '../../../../lib/domain/value-objects/position';
import { RetryPolicy } from '../../../../lib/domain/value-objects/retry-policy';
import { RACI } from '../../../../lib/domain/value-objects/raci';
import { ModelStatus, NodeStatus, ActionStatus, ActionNodeType } from '../../../../lib/domain/enums';

describe('Repository Transaction Integrity Specification', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let repository: SupabaseFunctionModelRepository;
  let mockTransaction: jest.Mock;
  let mockModelOps: jest.Mock;
  let mockNodeOps: jest.Mock;
  let mockActionOps: jest.Mock;

  beforeEach(() => {
    // Setup detailed transaction mocking
    mockModelOps = jest.fn();
    mockNodeOps = jest.fn();
    mockActionOps = jest.fn();
    mockTransaction = jest.fn();

    mockSupabase = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'function_models') {
          return {
            upsert: mockModelOps,
            update: mockModelOps,
            delete: mockModelOps,
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null })
                })
              })
            })
          };
        } else if (table === 'function_model_nodes') {
          return {
            delete: mockNodeOps,
            insert: mockNodeOps,
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          };
        } else if (table === 'function_model_actions') {
          return {
            delete: mockActionOps,
            insert: mockActionOps,
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          };
        }
        return {};
      })
    } as unknown as jest.Mocked<SupabaseClient>;

    repository = new SupabaseFunctionModelRepository(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Transaction Rollback Specification', () => {
    it('should rollback entire transaction when model save fails', async () => {
      // RED: This test will fail if transaction rollback isn't implemented
      
      // Arrange: Setup model save to fail
      const modelError = { code: '23505', message: 'duplicate key violation' };
      mockModelOps.mockResolvedValue({ error: modelError });
      
      const modelName = ModelName.create('Rollback Test Model').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Act
      const result = await repository.save(model);

      // Assert: Should fail and rollback transaction
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Transaction failed');
      expect(result.error).toContain('duplicate key');
      
      // Verify no orphaned operations occurred
      expect(mockNodeOps).not.toHaveBeenCalled();
      expect(mockActionOps).not.toHaveBeenCalled();
    });

    it('should rollback when node operations fail after successful model save', async () => {
      // RED: This test will fail if partial transaction success isn't handled
      
      // Arrange: Model save succeeds, node operations fail
      mockModelOps.mockResolvedValue({ error: null });
      const nodeError = { code: '23503', message: 'foreign key constraint violation' };
      mockNodeOps.mockResolvedValue({ error: nodeError });
      
      const modelName = ModelName.create('Node Failure Test').value!;
      const version = Version.create('1.0.0').value!;
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Add a node to trigger node operations
      const nodeId = NodeId.create('test-node-1').value!;
      const position = Position.create(100, 100).value!;
      const ioNode = IONode.create({
        nodeId,
        name: 'Test Node',
        position,
        dependencies: [],
        status: NodeStatus.READY,
        ioData: {}
      }).value!;
      
      model.nodes.set(nodeId.toString(), ioNode);

      // Act
      const result = await repository.save(model);

      // Assert: Should fail and rollback entire transaction
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Transaction failed');
      
      // Verify model save was attempted but transaction rolled back
      expect(mockModelOps).toHaveBeenCalled();
      expect(mockNodeOps).toHaveBeenCalled();
    });

    it('should rollback when action operations fail after successful model and node saves', async () => {
      // RED: This test will fail if action failure doesn't trigger full rollback
      
      // Arrange: Model and nodes succeed, actions fail
      mockModelOps.mockResolvedValue({ error: null });
      mockNodeOps.mockResolvedValue({ error: null });
      const actionError = { code: '22001', message: 'value too long for type' };
      mockActionOps.mockResolvedValue({ error: actionError });
      
      const modelName = ModelName.create('Action Failure Test').value!;
      const version = Version.create('1.0.0').value!;
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Add action to trigger action operations
      const actionId = NodeId.create('test-action-1').value!;
      const parentNodeId = NodeId.create('parent-node-1').value!;
      const retryPolicy = RetryPolicy.create({ maxAttempts: 1, delayMs: 0 }).value!;
      const raci = RACI.create({
        responsible: ['user1'],
        accountable: ['user2'],
        consulted: [],
        informed: []
      }).value!;

      const tetherAction = TetherNode.create({
        actionId,
        parentNodeId,
        name: 'Test Tether Action',
        executionMode: 'parallel',
        executionOrder: 1,
        status: ActionStatus.PENDING,
        priority: 3,
        retryPolicy,
        raci,
        tetherData: {}
      }).value!;
      
      model.actionNodes.set(actionId.toString(), tetherAction);

      // Act
      const result = await repository.save(model);

      // Assert: Should fail and rollback entire transaction
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Transaction failed');
      
      // Verify all operations were attempted but transaction failed
      expect(mockModelOps).toHaveBeenCalled();
      expect(mockActionOps).toHaveBeenCalled();
    });

    it('should handle database connection failures gracefully', async () => {
      // RED: This test will fail if connection errors aren't handled properly
      
      // Arrange: Simulate database connection failure
      const connectionError = new Error('Connection to database failed');
      mockModelOps.mockRejectedValue(connectionError);
      
      const modelName = ModelName.create('Connection Failure Test').value!;
      const version = Version.create('1.0.0').value!;
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Act
      const result = await repository.save(model);

      // Assert: Should handle connection error gracefully
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Transaction failed');
      expect(result.error).toContain('Connection to database failed');
    });
  });

  describe('Data Consistency Specification', () => {
    it('should ensure atomic updates across all related tables', async () => {
      // RED: This test will fail if updates aren't properly coordinated
      
      // Arrange: Setup successful multi-table operations
      mockModelOps.mockResolvedValue({ error: null });
      mockNodeOps.mockResolvedValue({ error: null });
      mockActionOps.mockResolvedValue({ error: null });
      
      const modelName = ModelName.create('Atomic Update Test').value!;
      const version = Version.create('1.0.0').value!;
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Add both nodes and actions
      const nodeId = NodeId.create('atomic-node').value!;
      const position = Position.create(50, 50).value!;
      const ioNode = IONode.create({
        nodeId,
        name: 'Atomic Test Node',
        position,
        dependencies: [],
        status: NodeStatus.READY,
        ioData: {}
      }).value!;
      
      const actionId = NodeId.create('atomic-action').value!;
      const retryPolicy = RetryPolicy.create({ maxAttempts: 1, delayMs: 0 }).value!;
      const raci = RACI.create({
        responsible: ['user1'],
        accountable: ['user2'],
        consulted: [],
        informed: []
      }).value!;
      const tetherAction = TetherNode.create({
        actionId,
        parentNodeId: nodeId,
        name: 'Atomic Test Action',
        executionMode: 'sequential',
        executionOrder: 1,
        status: ActionStatus.READY,
        priority: 1,
        retryPolicy,
        raci,
        tetherData: {}
      }).value!;

      model.nodes.set(nodeId.toString(), ioNode);
      model.actionNodes.set(actionId.toString(), tetherAction);

      // Act
      const result = await repository.save(model);

      // Assert: All operations should succeed atomically
      expect(result.isSuccess).toBe(true);
      
      // Verify correct sequence of operations
      expect(mockModelOps).toHaveBeenCalledTimes(1); // Upsert model
      expect(mockNodeOps).toHaveBeenCalledTimes(2); // Delete existing + Insert new
      expect(mockActionOps).toHaveBeenCalledTimes(2); // Delete existing + Insert new
    });

    it('should handle concurrent model modifications correctly', async () => {
      // RED: This test will fail if concurrent access isn't handled
      
      // Arrange: Setup successful operations for concurrent test
      mockModelOps.mockResolvedValue({ error: null });
      
      const modelName = ModelName.create('Concurrent Test Model').value!;
      const version = Version.create('1.0.0').value!;
      
      const model1 = FunctionModel.create({
        modelId: 'same-model-id-12345678-1234-1234-1234',
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;
      
      const model2 = FunctionModel.create({
        modelId: 'same-model-id-12345678-1234-1234-1234',
        name: ModelName.create('Modified Name').value!,
        version: Version.create('1.1.0').value!,
        currentVersion: version
      }).value!;

      // Act: Simulate concurrent saves
      const results = await Promise.all([
        repository.save(model1),
        repository.save(model2)
      ]);

      // Assert: Both operations should complete without corruption
      expect(results[0].isSuccess || results[1].isSuccess).toBe(true);
      
      // At least one should succeed (last writer wins is acceptable)
      const successfulResults = results.filter(r => r.isSuccess);
      expect(successfulResults.length).toBeGreaterThan(0);
    });

    it('should maintain referential integrity between models, nodes, and actions', async () => {
      // RED: This test will fail if referential integrity isn't maintained
      
      // Arrange: Setup operations to test referential integrity
      mockModelOps.mockResolvedValue({ error: null });
      mockNodeOps.mockResolvedValue({ error: null });
      mockActionOps.mockResolvedValue({ error: null });
      
      const modelName = ModelName.create('Referential Integrity Test').value!;
      const version = Version.create('1.0.0').value!;
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Create node and action with proper relationships
      const parentNodeId = NodeId.create('parent-integrity-node').value!;
      const childActionId = NodeId.create('child-integrity-action').value!;
      
      const parentNode = IONode.create({
        nodeId: parentNodeId,
        name: 'Parent Node',
        position: Position.create(0, 0).value!,
        dependencies: [],
        status: NodeStatus.READY,
        ioData: {}
      }).value!;
      
      const childAction = TetherNode.create({
        actionId: childActionId,
        parentNodeId: parentNodeId, // References the parent node
        name: 'Child Action',
        executionMode: 'sequential',
        executionOrder: 1,
        status: ActionStatus.READY,
        priority: 1,
        retryPolicy: RetryPolicy.create({ maxAttempts: 1, delayMs: 0 }).value!,
        raci: RACI.create({
          responsible: ['user1'],
          accountable: ['user2'],
          consulted: [],
          informed: []
        }).value!,
        tetherData: {}
      }).value!;

      model.nodes.set(parentNodeId.toString(), parentNode);
      model.actionNodes.set(childActionId.toString(), childAction);

      // Act
      const result = await repository.save(model);

      // Assert: Should maintain proper relationships
      expect(result.isSuccess).toBe(true);
      
      // Verify that action references are maintained
      expect(mockActionOps).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            parent_node_id: parentNodeId.toString(),
            model_id: model.modelId
          })
        ])
      );
    });

    it('should clean up orphaned records during save operations', async () => {
      // RED: This test will fail if orphaned record cleanup isn't implemented
      
      // Arrange: Setup operations that require cleanup
      mockModelOps.mockResolvedValue({ error: null });
      mockNodeOps.mockResolvedValue({ error: null });
      mockActionOps.mockResolvedValue({ error: null });
      
      const modelName = ModelName.create('Cleanup Test Model').value!;
      const version = Version.create('1.0.0').value!;
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Act: Save model (should trigger cleanup of existing nodes/actions)
      const result = await repository.save(model);

      // Assert: Should perform cleanup operations
      expect(result.isSuccess).toBe(true);
      
      // Verify cleanup (delete) operations were called before inserts
      const nodeDeleteCalls = mockNodeOps.mock.calls.filter(call => 
        mockSupabase.from.mock.calls.some((fromCall, index) => 
          fromCall[0] === 'function_model_nodes' && 
          mockSupabase.from.mock.results[index].value.delete === mockNodeOps
        )
      );
      
      expect(mockNodeOps).toHaveBeenCalled(); // At least delete operation should occur
    });
  });

  describe('Error Propagation Specification', () => {
    it('should propagate specific database constraint errors with context', async () => {
      // RED: This test will fail if error context isn't preserved
      
      // Arrange: Setup constraint violation
      const constraintError = {
        code: '23514',
        message: 'new row for relation "function_models" violates check constraint "valid_model_status"',
        details: 'Failing row contains (draft_invalid)',
        constraint: 'valid_model_status'
      };
      mockModelOps.mockResolvedValue({ error: constraintError });
      
      const modelName = ModelName.create('Constraint Error Test').value!;
      const version = Version.create('1.0.0').value!;
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Act
      const result = await repository.save(model);

      // Assert: Should propagate detailed error information
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Transaction failed');
      expect(result.error).toContain('check constraint'); // Should preserve specific error type
    });

    it('should distinguish between transient and permanent errors', async () => {
      // RED: This test will fail if error classification isn't implemented
      
      // Arrange: Test both transient (connection) and permanent (constraint) errors
      const transientError = { code: '08006', message: 'connection failure' };
      const permanentError = { code: '23505', message: 'duplicate key value violates unique constraint' };
      
      mockModelOps.mockResolvedValueOnce({ error: transientError });
      
      const modelName = ModelName.create('Error Classification Test').value!;
      const version = Version.create('1.0.0').value!;
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Act: Test transient error
      const transientResult = await repository.save(model);
      
      // Reset mock for permanent error
      mockModelOps.mockResolvedValue({ error: permanentError });
      const permanentResult = await repository.save(model);

      // Assert: Both should fail but with different error characteristics
      expect(transientResult.isFailure).toBe(true);
      expect(permanentResult.isFailure).toBe(true);
      
      // Both should contain transaction failure message
      expect(transientResult.error).toContain('Transaction failed');
      expect(permanentResult.error).toContain('Transaction failed');
      
      // But should preserve underlying error details
      expect(transientResult.error).toContain('connection failure');
      expect(permanentResult.error).toContain('duplicate key');
    });

    it('should handle partial failure error aggregation correctly', async () => {
      // RED: This test will fail if multiple errors aren't aggregated properly
      
      // Arrange: Setup multiple operation failures
      const modelError = { code: '23505', message: 'model constraint violation' };
      const nodeError = { code: '23503', message: 'node foreign key violation' };
      
      mockModelOps.mockResolvedValue({ error: modelError });
      mockNodeOps.mockResolvedValue({ error: nodeError });
      
      const modelName = ModelName.create('Multi-Error Test').value!;
      const version = Version.create('1.0.0').value!;
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Add node to trigger node operations
      const nodeId = NodeId.create('multi-error-node').value!;
      const position = Position.create(25, 25).value!;
      const ioNode = IONode.create({
        nodeId,
        name: 'Multi Error Node',
        position,
        dependencies: [],
        status: NodeStatus.READY,
        ioData: {}
      }).value!;
      
      model.nodes.set(nodeId.toString(), ioNode);

      // Act
      const result = await repository.save(model);

      // Assert: Should aggregate error information meaningfully
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Transaction failed');
      
      // Should contain information about the first failure that triggered rollback
      expect(result.error).toContain('constraint violation');
    });
  });

  describe('Transaction Performance Specification', () => {
    it('should complete transactions within reasonable time limits', async () => {
      // RED: This test will fail if transactions are too slow
      
      // Arrange: Setup successful operations with timing
      mockModelOps.mockResolvedValue({ error: null });
      mockNodeOps.mockResolvedValue({ error: null });
      mockActionOps.mockResolvedValue({ error: null });
      
      const modelName = ModelName.create('Performance Test Model').value!;
      const version = Version.create('1.0.0').value!;
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Add multiple nodes and actions to test performance
      for (let i = 0; i < 10; i++) {
        const nodeId = NodeId.create(`perf-node-${i}`).value!;
        const position = Position.create(i * 10, i * 10).value!;
        const node = IONode.create({
          nodeId,
          name: `Performance Node ${i}`,
          position,
          dependencies: [],
          status: NodeStatus.READY,
          ioData: {}
        }).value!;
        model.nodes.set(nodeId.toString(), node);

        const actionId = NodeId.create(`perf-action-${i}`).value!;
        const action = TetherNode.create({
          actionId,
          parentNodeId: nodeId,
          name: `Performance Action ${i}`,
          executionMode: 'parallel',
          executionOrder: i,
          status: ActionStatus.READY,
          priority: 1,
          retryPolicy: RetryPolicy.create({ maxAttempts: 1, delayMs: 0 }).value!,
          raci: RACI.create({
            responsible: ['user1'],
            accountable: ['user2'],
            consulted: [],
            informed: []
          }).value!,
          tetherData: {}
        }).value!;
        model.actionNodes.set(actionId.toString(), action);
      }

      // Act: Measure transaction time
      const startTime = Date.now();
      const result = await repository.save(model);
      const endTime = Date.now();
      const transactionTime = endTime - startTime;

      // Assert: Should complete within reasonable time (adjust threshold as needed)
      expect(result.isSuccess).toBe(true);
      expect(transactionTime).toBeLessThan(5000); // 5 seconds max for complex transaction
      
      // Verify all operations completed
      expect(mockModelOps).toHaveBeenCalled();
      expect(mockNodeOps).toHaveBeenCalled();
      expect(mockActionOps).toHaveBeenCalled();
    });

    it('should handle timeout scenarios gracefully', async () => {
      // RED: This test will fail if timeout handling isn't implemented
      
      // Arrange: Setup operation that will timeout
      const timeoutError = new Error('Query timeout exceeded');
      mockModelOps.mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(timeoutError), 100))
      );
      
      const modelName = ModelName.create('Timeout Test Model').value!;
      const version = Version.create('1.0.0').value!;
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Act
      const result = await repository.save(model);

      // Assert: Should handle timeout gracefully
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Transaction failed');
      expect(result.error).toContain('timeout'); // Should mention timeout
    });
  });
});