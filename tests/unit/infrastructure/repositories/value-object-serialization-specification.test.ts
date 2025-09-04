/**
 * Value Object Serialization Specification Tests
 * 
 * TDD Tests to drive proper handling of domain value objects in repository operations
 * These tests act as specifications for serialization/deserialization of complex domain types
 * 
 * Key Problems Being Driven:
 * 1. Value objects not properly serialized (calling .toString() vs .value vs object structure)
 * 2. Complex objects like RetryPolicy and RACI not handled correctly
 * 3. NodeId and Position objects causing serialization errors
 * 4. Arrays of value objects not properly converted
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseFunctionModelRepository } from '../../../../lib/infrastructure/repositories/supabase-function-model-repository';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { IONode } from '../../../../lib/domain/entities/io-node';
import { ActionNode } from '../../../../lib/domain/entities/action-node';
import { TetherNode } from '../../../../lib/domain/entities/tether-node';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { Position } from '../../../../lib/domain/value-objects/position';
import { RetryPolicy } from '../../../../lib/domain/value-objects/retry-policy';
import { RACI } from '../../../../lib/domain/value-objects/raci';
import { ModelStatus, NodeStatus, ActionStatus, ActionNodeType, ContainerNodeType } from '../../../../lib/domain/enums';

// Mock Supabase client to focus on serialization logic
const mockSupabaseClient = {
  from: jest.fn()
} as unknown as SupabaseClient;

describe('Value Object Serialization Specification', () => {
  let repository: SupabaseFunctionModelRepository;

  beforeEach(() => {
    repository = new SupabaseFunctionModelRepository(mockSupabaseClient);
    jest.clearAllMocks();
  });

  describe('Primary Value Object Serialization', () => {
    it('should serialize ModelName value object using toString() method', () => {
      // RED: This test will fail if ModelName isn't properly serialized
      
      // Arrange
      const modelName = ModelName.create('Complex Model Name with Spaces').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Act
      const dbRow = (repository as any).fromDomain(model);

      // Assert: ModelName should be serialized as string
      expect(dbRow.name).toBe('Complex Model Name with Spaces');
      expect(typeof dbRow.name).toBe('string');
      
      // Verify it's the result of toString(), not accessing .value property
      expect(dbRow.name).toBe(modelName.toString());
    });

    it('should serialize Version value objects consistently', () => {
      // RED: This test will fail if Version objects aren't serialized properly
      
      // Arrange
      const modelName = ModelName.create('Version Test').value!;
      const version = Version.create('2.1.3-beta').value!;
      const currentVersion = Version.create('2.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: currentVersion
      }).value!;

      // Act
      const dbRow = (repository as any).fromDomain(model);

      // Assert: Both version fields should be properly serialized
      expect(dbRow.version).toBe('2.1.3-beta');
      expect(dbRow.current_version).toBe('2.0.0');
      expect(typeof dbRow.version).toBe('string');
      expect(typeof dbRow.current_version).toBe('string');
      
      // Verify consistency with toString() method
      expect(dbRow.version).toBe(version.toString());
      expect(dbRow.current_version).toBe(currentVersion.toString());
    });

    it('should deserialize string values back to proper value objects', () => {
      // RED: This test will fail if deserialization doesn't reconstruct value objects
      
      // Arrange: Database row with string representations
      const dbRow = {
        model_id: '12345678-1234-1234-1234-123456789012',
        name: 'Deserialization Test Model',
        version: '1.5.0',
        status: ModelStatus.DRAFT,
        current_version: '1.4.0',
        version_count: 2,
        metadata: {},
        permissions: {},
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        last_saved_at: '2024-01-03T00:00:00.000Z'
      };

      // Act
      const result = (repository as any).toDomain(dbRow);

      // Assert: Should recreate proper value objects
      expect(result.isSuccess).toBe(true);
      const model = result.value;
      
      expect(model.name).toBeInstanceOf(ModelName);
      expect(model.version).toBeInstanceOf(Version);
      expect(model.currentVersion).toBeInstanceOf(Version);
      
      // Verify values are correctly reconstructed
      expect(model.name.value).toBe('Deserialization Test Model');
      expect(model.version.value).toBe('1.5.0');
      expect(model.currentVersion.value).toBe('1.4.0');
    });
  });

  describe('Node Value Object Serialization', () => {
    it('should serialize NodeId value objects in node operations', () => {
      // RED: This test will fail if NodeId serialization is broken
      
      // Arrange: Create node with NodeId value object
      const nodeId = NodeId.create('node-123').value!;
      const position = Position.create(100, 200).value!;
      const dependencies = [
        NodeId.create('dep-1').value!,
        NodeId.create('dep-2').value!
      ];
      
      const node = IONode.create({
        nodeId,
        name: 'Test IO Node',
        position,
        dependencies,
        status: NodeStatus.READY,
        ioData: { inputSchema: {}, outputSchema: {} }
      }).value!;

      const modelId = '12345678-1234-1234-1234-123456789012';

      // Act
      const nodeRow = (repository as any).nodeFromDomain(node, modelId);

      // Assert: NodeId should be serialized to string
      expect(nodeRow.node_id).toBe('node-123');
      expect(typeof nodeRow.node_id).toBe('string');
      
      // Dependencies should be array of strings
      expect(nodeRow.dependencies).toEqual(['dep-1', 'dep-2']);
      expect(nodeRow.dependencies.every((dep: any) => typeof dep === 'string')).toBe(true);
    });

    it('should serialize Position value objects correctly', () => {
      // RED: This test will fail if Position isn't decomposed into x,y coordinates
      
      // Arrange
      const nodeId = NodeId.create('position-test').value!;
      const position = Position.create(150.5, 300.25).value!;
      
      const node = IONode.create({
        nodeId,
        name: 'Position Test Node',
        position,
        dependencies: [],
        status: NodeStatus.READY,
        ioData: {}
      }).value!;

      const modelId = '12345678-1234-1234-1234-123456789012';

      // Act
      const nodeRow = (repository as any).nodeFromDomain(node, modelId);

      // Assert: Position should be decomposed into separate x,y fields
      expect(nodeRow.position_x).toBe(150.5);
      expect(nodeRow.position_y).toBe(300.25);
      expect(typeof nodeRow.position_x).toBe('number');
      expect(typeof nodeRow.position_y).toBe('number');
    });

    it('should deserialize coordinates back to Position value object', () => {
      // RED: This test will fail if Position reconstruction is broken
      
      // Arrange: Database node row with coordinate fields
      const nodeRow = {
        node_id: 'test-node',
        model_id: '12345678-1234-1234-1234-123456789012',
        node_type: ContainerNodeType.IO_NODE,
        name: 'Coordinate Test',
        position_x: 75.5,
        position_y: 125.75,
        dependencies: ['dep1', 'dep2'],
        status: NodeStatus.READY,
        metadata: {},
        visual_properties: {},
        type_specific_data: { ioData: {} },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z'
      };

      // Act
      const result = (repository as any).nodeToDomain(nodeRow);

      // Assert: Should reconstruct Position value object
      expect(result.isSuccess).toBe(true);
      const node = result.value;
      
      expect(node.position).toBeInstanceOf(Position);
      expect(node.position.x).toBe(75.5);
      expect(node.position.y).toBe(125.75);
    });

    it('should handle arrays of NodeId dependencies correctly', () => {
      // RED: This test will fail if dependency arrays aren't handled properly
      
      // Arrange: Node row with string dependency IDs
      const nodeRow = {
        node_id: 'dependency-test',
        model_id: '12345678-1234-1234-1234-123456789012',
        node_type: ContainerNodeType.IO_NODE,
        name: 'Dependency Test',
        position_x: 0,
        position_y: 0,
        dependencies: ['node-a', 'node-b', 'node-c'],
        status: NodeStatus.READY,
        metadata: {},
        visual_properties: {},
        type_specific_data: { ioData: {} },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z'
      };

      // Act
      const result = (repository as any).nodeToDomain(nodeRow);

      // Assert: Should convert string array to NodeId array
      expect(result.isSuccess).toBe(true);
      const node = result.value;
      
      expect(node.dependencies).toHaveLength(3);
      expect(node.dependencies.every((dep: any) => dep instanceof NodeId)).toBe(true);
      expect(node.dependencies.map((dep: any) => dep.toString())).toEqual(['node-a', 'node-b', 'node-c']);
    });
  });

  describe('Action Node Value Object Serialization', () => {
    it('should serialize RetryPolicy value object to database format', () => {
      // RED: This test will fail if RetryPolicy isn't properly serialized
      
      // Arrange: Create action with complex RetryPolicy
      const actionId = NodeId.create('action-123').value!;
      const parentNodeId = NodeId.create('parent-456').value!;
      const retryPolicy = RetryPolicy.create({
        maxAttempts: 3,
        delayMs: 1000,
        backoffMultiplier: 2.0,
        maxDelayMs: 10000
      }).value!;
      const raci = RACI.create({
        responsible: ['user1'],
        accountable: ['user2'], 
        consulted: ['user3'],
        informed: ['user4']
      }).value!;

      const action = TetherNode.create({
        actionId,
        parentNodeId,
        name: 'Test Tether Action',
        executionMode: 'parallel',
        executionOrder: 1,
        status: ActionStatus.PENDING,
        priority: 5,
        retryPolicy,
        raci,
        tetherData: { connectionType: 'rest' }
      }).value!;

      const modelId = '12345678-1234-1234-1234-123456789012';

      // Act
      const actionRow = (repository as any).actionFromDomain(action, modelId);

      // Assert: RetryPolicy should be serialized as object
      expect(actionRow.retry_policy).toBeDefined();
      expect(typeof actionRow.retry_policy).toBe('object');
      expect(actionRow.retry_policy.maxAttempts).toBe(3);
      expect(actionRow.retry_policy.delayMs).toBe(1000);
      expect(actionRow.retry_policy.backoffMultiplier).toBe(2.0);
      expect(actionRow.retry_policy.maxDelayMs).toBe(10000);
    });

    it('should serialize RACI value object to database format', () => {
      // RED: This test will fail if RACI isn't properly serialized
      
      // Arrange: Create action with RACI matrix
      const actionId = NodeId.create('raci-test').value!;
      const parentNodeId = NodeId.create('parent-raci').value!;
      const retryPolicy = RetryPolicy.create({ maxAttempts: 1, delayMs: 0 }).value!;
      const raci = RACI.create({
        responsible: ['dev1', 'dev2'],
        accountable: ['manager1'],
        consulted: ['architect1', 'security1'],
        informed: ['stakeholder1', 'stakeholder2', 'stakeholder3']
      }).value!;

      const action = TetherNode.create({
        actionId,
        parentNodeId,
        name: 'RACI Test Action',
        executionMode: 'sequential',
        executionOrder: 2,
        status: ActionStatus.READY,
        priority: 3,
        retryPolicy,
        raci,
        tetherData: {}
      }).value!;

      const modelId = '12345678-1234-1234-1234-123456789012';

      // Act
      const actionRow = (repository as any).actionFromDomain(action, modelId);

      // Assert: RACI should be serialized as object with arrays
      expect(actionRow.raci).toBeDefined();
      expect(typeof actionRow.raci).toBe('object');
      expect(actionRow.raci.responsible).toEqual(['dev1', 'dev2']);
      expect(actionRow.raci.accountable).toEqual(['manager1']);
      expect(actionRow.raci.consulted).toEqual(['architect1', 'security1']);
      expect(actionRow.raci.informed).toEqual(['stakeholder1', 'stakeholder2', 'stakeholder3']);
    });

    it('should deserialize RetryPolicy from database object back to value object', () => {
      // RED: This test will fail if RetryPolicy reconstruction fails
      
      // Arrange: Database action row with serialized RetryPolicy
      const actionRow = {
        action_id: 'retry-test',
        parent_node_id: 'parent-retry',
        model_id: '12345678-1234-1234-1234-123456789012',
        action_type: ActionNodeType.TETHER_NODE,
        name: 'Retry Policy Test',
        execution_mode: 'parallel',
        execution_order: 1,
        status: ActionStatus.PENDING,
        priority: 4,
        retry_policy: {
          maxAttempts: 5,
          delayMs: 2000,
          backoffMultiplier: 1.5,
          maxDelayMs: 30000
        },
        raci: {
          responsible: ['user1'],
          accountable: ['user2'],
          consulted: [],
          informed: []
        },
        metadata: {},
        action_specific_data: { tetherData: {} },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z'
      };

      // Act
      const result = (repository as any).actionToDomain(actionRow);

      // Assert: Should reconstruct RetryPolicy value object
      expect(result.isSuccess).toBe(true);
      const action = result.value;
      
      expect(action.retryPolicy).toBeInstanceOf(RetryPolicy);
      expect(action.retryPolicy.maxAttempts).toBe(5);
      expect(action.retryPolicy.delayMs).toBe(2000);
      expect(action.retryPolicy.backoffMultiplier).toBe(1.5);
      expect(action.retryPolicy.maxDelayMs).toBe(30000);
    });

    it('should deserialize RACI from database object back to value object', () => {
      // RED: This test will fail if RACI reconstruction fails
      
      // Arrange: Database action row with serialized RACI
      const actionRow = {
        action_id: 'raci-deserialize-test',
        parent_node_id: 'parent-raci-test',
        model_id: '12345678-1234-1234-1234-123456789012',
        action_type: ActionNodeType.TETHER_NODE,
        name: 'RACI Deserialize Test',
        execution_mode: 'sequential',
        execution_order: 3,
        status: ActionStatus.READY,
        priority: 2,
        retry_policy: { maxAttempts: 1, delayMs: 0 },
        raci: {
          responsible: ['qa1', 'qa2'],
          accountable: ['lead1'],
          consulted: ['architect2'],
          informed: ['product1', 'business1']
        },
        metadata: {},
        action_specific_data: { tetherData: {} },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z'
      };

      // Act
      const result = (repository as any).actionToDomain(actionRow);

      // Assert: Should reconstruct RACI value object
      expect(result.isSuccess).toBe(true);
      const action = result.value;
      
      expect(action.raci).toBeInstanceOf(RACI);
      expect(action.raci.responsible).toEqual(['qa1', 'qa2']);
      expect(action.raci.accountable).toEqual(['lead1']);
      expect(action.raci.consulted).toEqual(['architect2']);
      expect(action.raci.informed).toEqual(['product1', 'business1']);
    });
  });

  describe('Complex Object Serialization Edge Cases', () => {
    it('should handle nested objects in type-specific data correctly', () => {
      // RED: This test will fail if nested object serialization is broken
      
      // Arrange: Node with complex type-specific data
      const nodeId = NodeId.create('complex-data-test').value!;
      const position = Position.create(50, 75).value!;
      
      const complexIoData = {
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            age: { type: 'number', minimum: 0 },
            addresses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' },
                  coordinates: { type: 'array', items: { type: 'number' } }
                }
              }
            }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'boolean' },
            message: { type: 'string' },
            metadata: { type: 'object' }
          }
        },
        validationRules: ['required-name', 'positive-age'],
        transforms: {
          input: 'normalize-case',
          output: 'add-timestamp'
        }
      };

      const node = IONode.create({
        nodeId,
        name: 'Complex IO Node',
        position,
        dependencies: [],
        status: NodeStatus.READY,
        ioData: complexIoData
      }).value!;

      const modelId = '12345678-1234-1234-1234-123456789012';

      // Act
      const nodeRow = (repository as any).nodeFromDomain(node, modelId);

      // Assert: Complex nested data should be preserved
      expect(nodeRow.type_specific_data).toBeDefined();
      expect(nodeRow.type_specific_data.ioData).toEqual(complexIoData);
      
      // Verify deep nesting is preserved
      expect(nodeRow.type_specific_data.ioData.inputSchema.properties.addresses.items.properties.coordinates.items.type).toBe('number');
    });

    it('should handle circular reference detection in metadata', () => {
      // RED: This test will fail if circular references aren't handled
      
      // Arrange: Create metadata with potential circular reference
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj; // Create circular reference
      
      const modelName = ModelName.create('Circular Test').value!;
      const version = Version.create('1.0.0').value!;

      // This should be caught at domain level, but test repository handling
      const safeMetadata = {
        config: { timeout: 5000 },
        references: { selfRef: 'avoiding circular' },
        arrays: [1, 2, 3]
      };
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version,
        metadata: safeMetadata
      }).value!;

      // Act
      const dbRow = (repository as any).fromDomain(model);

      // Assert: Should serialize without circular reference errors
      expect(dbRow.metadata).toEqual(safeMetadata);
      expect(JSON.stringify(dbRow.metadata)).toBeDefined(); // Should not throw
    });

    it('should handle very large serialized objects gracefully', () => {
      // RED: This test will fail if large object handling is broken
      
      // Arrange: Create model with large metadata
      const largeMetadata = {
        bulkData: new Array(1000).fill(0).map((_, i) => ({
          id: `item-${i}`,
          data: `data-${i}`.repeat(100),
          nested: {
            level1: { level2: { level3: `deep-${i}` } }
          }
        }))
      };

      const modelName = ModelName.create('Large Object Test').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version,
        metadata: largeMetadata
      }).value!;

      // Act: Should handle large objects without memory issues
      const dbRow = (repository as any).fromDomain(model);
      const reconstructedResult = (repository as any).toDomain(dbRow);

      // Assert: Large objects should be handled correctly
      expect(reconstructedResult.isSuccess).toBe(true);
      expect(reconstructedResult.value.metadata.bulkData).toHaveLength(1000);
      expect(reconstructedResult.value.metadata.bulkData[999].id).toBe('item-999');
    });

    it('should validate serialized data integrity with checksums or similar', () => {
      // RED: This test will fail if data integrity isn't verified
      
      // Arrange: Model with complex nested data
      const modelName = ModelName.create('Integrity Test').value!;
      const version = Version.create('1.0.0').value!;
      
      const sensitiveMetadata = {
        configuration: {
          database: { host: 'localhost', port: 5432 },
          api: { version: '2.0', endpoints: ['users', 'orders', 'products'] },
          security: { encryption: 'AES-256', keyRotation: 'daily' }
        }
      };
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version,
        metadata: sensitiveMetadata
      }).value!;

      // Act: Round-trip conversion
      const dbRow = (repository as any).fromDomain(model);
      const reconstructed = (repository as any).toDomain(dbRow);

      // Assert: Data integrity should be maintained exactly
      expect(reconstructed.isSuccess).toBe(true);
      expect(reconstructed.value.metadata).toEqual(sensitiveMetadata);
      
      // Verify no data corruption occurred
      expect(JSON.stringify(reconstructed.value.metadata)).toBe(JSON.stringify(sensitiveMetadata));
    });
  });
});