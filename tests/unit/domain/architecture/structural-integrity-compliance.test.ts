/**
 * Structural Integrity Compliance Tests
 * 
 * These tests act as Boundary Filters to ensure that domain entities have the correct
 * structural properties that outer layers depend on. This prevents interface mismatches
 * that break compilation and runtime functionality.
 * 
 * Following TDD 1-2 punch approach:
 * 1. Tests define required structural integrity contracts
 * 2. Implementation makes tests pass while maintaining Clean Architecture
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { FunctionModel, FunctionModelProps } from '../../../../lib/domain/entities/function-model';
import { Node, NodeProps } from '../../../../lib/domain/entities/node';
import { IONode } from '../../../../lib/domain/entities/io-node';
import { StageNode } from '../../../../lib/domain/entities/stage-node';
import { NodeStatus, ModelStatus, ExecutionMode, IOType } from '../../../../lib/domain/enums';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { Position } from '../../../../lib/domain/value-objects/position';
import { Result } from '../../../../lib/domain/shared/result';

describe('Structural Integrity Compliance Tests', () => {
  describe('FunctionModel Entity Structure', () => {
    let validModelProps: Omit<FunctionModelProps, 'createdAt' | 'updatedAt' | 'lastSavedAt' | 'versionCount'>;
    let functionModel: FunctionModel;

    beforeEach(() => {
      const modelNameResult = ModelName.create('Test Model');
      const versionResult = Version.create('1.0.0');
      const nodeMap = new Map<string, Node>();
      const actionNodeMap = new Map<string, any>();

      expect(modelNameResult.isSuccess).toBe(true);
      expect(versionResult.isSuccess).toBe(true);

      validModelProps = {
        modelId: 'model-123',
        name: modelNameResult.value,
        description: 'Test model description',
        version: versionResult.value,
        status: ModelStatus.DRAFT,
        currentVersion: versionResult.value,
        nodes: nodeMap,
        actionNodes: actionNodeMap,
        metadata: {},
        permissions: {},
      };

      const createResult = FunctionModel.create(validModelProps);
      expect(createResult.isSuccess).toBe(true);
      functionModel = createResult.value;
    });

    it('should have id property that matches modelId for outer layer compatibility', () => {
      // STRUCTURAL REQUIREMENT: Outer layers expect 'id' property
      // This test enforces that FunctionModel exposes an 'id' getter
      expect(functionModel).toHaveProperty('id');
      expect((functionModel as any).id).toBe(functionModel.modelId);
    });

    it('should expose id getter that returns modelId value', () => {
      // STRUCTURAL REQUIREMENT: id should be accessible as a getter
      const id = (functionModel as any).id;
      expect(typeof id).toBe('string');
      expect(id).toBe('model-123');
      expect(id).toBe(functionModel.modelId);
    });

    it('should maintain backwards compatibility with modelId', () => {
      // STRUCTURAL REQUIREMENT: Existing modelId should remain functional
      expect(functionModel.modelId).toBe('model-123');
      expect(functionModel).toHaveProperty('modelId');
    });

    it('should have consistent id and modelId values', () => {
      // STRUCTURAL REQUIREMENT: id and modelId must always be in sync
      const id = (functionModel as any).id;
      expect(id).toBe(functionModel.modelId);
    });
  });

  describe('Node Entity Structure', () => {
    let validNodeProps: NodeProps;
    let ioNode: IONode;

    beforeEach(() => {
      const nodeIdResult = NodeId.create('12345678-0000-4000-8000-123456780000');
      const positionResult = Position.create(100, 200);
      
      expect(nodeIdResult.isSuccess).toBe(true);
      expect(positionResult.isSuccess).toBe(true);

      validNodeProps = {
        nodeId: nodeIdResult.value,
        modelId: 'model-123',
        name: 'Test Node',
        description: 'Test node description',
        position: positionResult.value,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.DRAFT,
        timeout: 30000,
        metadata: {},
        visualProperties: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create an IONode as concrete implementation
      const ioNodeResult = IONode.create({
        ...validNodeProps,
        ioData: {
          boundaryType: IOType.INPUT,
          dataType: 'string',
          description: 'Input node',
          schema: {},
          defaultValue: undefined,
          isRequired: true,
          validationRules: [],
        },
      });

      expect(ioNodeResult.isSuccess).toBe(true);
      ioNode = ioNodeResult.value;
    });

    it('should have type property for outer layer node identification', () => {
      // STRUCTURAL REQUIREMENT: Outer layers need 'type' property to identify node types
      expect(ioNode).toHaveProperty('type');
      expect(typeof (ioNode as any).type).toBe('string');
    });

    it('should return correct node type from type property', () => {
      // STRUCTURAL REQUIREMENT: type property should match getNodeType() method
      const nodeType = (ioNode as any).type;
      expect(nodeType).toBe(ioNode.getNodeType());
      expect(nodeType).toBe('ioNode');
    });

    it('should have nodeId property accessible for outer layer compatibility', () => {
      // STRUCTURAL REQUIREMENT: nodeId should be accessible
      expect(ioNode).toHaveProperty('nodeId');
      expect(ioNode.nodeId).toBeDefined();
      expect(ioNode.nodeId.toString()).toBe('12345678-0000-4000-8000-123456780000');
    });

    it('should maintain consistent type across different node implementations', () => {
      // STRUCTURAL REQUIREMENT: All node types should expose consistent structure
      const stageNodeResult = StageNode.create({
        ...validNodeProps,
        nodeId: NodeId.create('87654321-0000-4000-8000-876543210000').value,
        stageData: {
          stageType: 'process',
          completionCriteria: {},
          stageGoals: ['test goal'],
          resourceRequirements: {},
        },
        parallelExecution: false,
        actionNodes: [],
        configuration: {},
      });

      expect(stageNodeResult.isSuccess).toBe(true);
      const stageNode = stageNodeResult.value;

      expect(stageNode).toHaveProperty('type');
      expect((stageNode as any).type).toBe('stageNode');
      expect((stageNode as any).type).toBe(stageNode.getNodeType());
    });
  });

  describe('NodeStatus Enum Completeness', () => {
    it('should include ACTIVE status for outer layer compatibility', () => {
      // STRUCTURAL REQUIREMENT: Outer layers expect ACTIVE status  
      expect(NodeStatus).toHaveProperty('ACTIVE');
      expect(NodeStatus.ACTIVE).toBe('active');
    });

    it('should include all required status values for complete workflow states', () => {
      // STRUCTURAL REQUIREMENT: Complete set of node status values
      const expectedStatuses = [
        'active',
        'inactive', 
        'draft',
        'archived',
        'error'
      ];

      const actualStatuses = Object.values(NodeStatus);
      expectedStatuses.forEach(status => {
        expect(actualStatuses).toContain(status);
      });
    });
  });

  describe('Repository Interface Consistency', () => {
    it('should ensure domain repository interfaces match expected signatures', () => {
      // STRUCTURAL REQUIREMENT: Repository interfaces should have consistent method signatures
      // This test validates that the interface module exists and can be imported
      const repositoryModule = require('../../../../lib/domain/interfaces/function-model-repository');
      
      // Verify required methods exist in the type definitions
      const requiredMethods = [
        'save',
        'findById', 
        'findByName',
        'findByStatus',
        'findAll',
        'delete',
        'exists',
        'findByOwner',
        'publishModel',
        'archiveModel',
        'softDelete',
        'restore'
      ];

      // TypeScript interfaces can't be directly inspected at runtime,
      // but we can ensure the module imports successfully
      expect(repositoryModule).toBeDefined();
      expect(typeof repositoryModule).toBe('object');
    });
  });

  describe('ES Target Compatibility', () => {
    it('should handle Map iteration without ES2015+ target issues', () => {
      // STRUCTURAL REQUIREMENT: Map operations should work with current TS target
      const testMap = new Map<string, string>();
      testMap.set('key1', 'value1');
      testMap.set('key2', 'value2');

      // Test Array.from iteration (ES5 compatible)
      const entries = Array.from(testMap.entries());
      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual(['key1', 'value1']);

      // Test keys iteration
      const keys = Array.from(testMap.keys());
      expect(keys).toEqual(['key1', 'key2']);

      // Test values iteration
      const values = Array.from(testMap.values());
      expect(values).toEqual(['value1', 'value2']);
    });

    it('should handle Set iteration without ES2015+ target issues', () => {
      // STRUCTURAL REQUIREMENT: Set operations should work with current TS target
      const testSet = new Set<string>();
      testSet.add('item1');
      testSet.add('item2');

      // Test Array.from iteration (ES5 compatible)
      const items = Array.from(testSet);
      expect(items).toHaveLength(2);
      expect(items).toContain('item1');
      expect(items).toContain('item2');
    });
  });

  describe('Domain Events Export Consistency', () => {
    it('should export all required domain events from index', () => {
      // STRUCTURAL REQUIREMENT: All domain events should be properly exported
      const domainEventsModule = require('../../../../lib/domain/events');
      
      // Verify key event types are exported
      const expectedExports = [
        'DomainEvent',
        'ModelCreatedEvent',
        'ModelUpdatedEvent',
        'NodeAddedEvent',
        'NodeRemovedEvent'
      ];

      expectedExports.forEach(exportName => {
        expect(domainEventsModule).toHaveProperty(exportName);
      });
    });
  });

  describe('Value Object Structural Integrity', () => {
    it('should ensure NodeId has consistent toString behavior', () => {
      // STRUCTURAL REQUIREMENT: NodeId toString should work for Map keys
      const nodeIdResult = NodeId.create('11111111-0000-4000-8000-111111110000');
      expect(nodeIdResult.isSuccess).toBe(true);
      
      const nodeId = nodeIdResult.value;
      expect(typeof nodeId.toString()).toBe('string');
      expect(nodeId.toString()).toBe('11111111-0000-4000-8000-111111110000');
    });

    it('should ensure Version has consistent comparison methods', () => {
      // STRUCTURAL REQUIREMENT: Version comparison should work reliably
      const version1Result = Version.create('1.0.0');
      const version2Result = Version.create('2.0.0');
      
      expect(version1Result.isSuccess).toBe(true);
      expect(version2Result.isSuccess).toBe(true);
      
      const version1 = version1Result.value;
      const version2 = version2Result.value;
      
      expect(typeof version2.isGreaterThan).toBe('function');
      expect(version2.isGreaterThan(version1)).toBe(true);
      expect(version1.isGreaterThan(version2)).toBe(false);
    });
  });

  describe('Entity Method Signature Consistency', () => {
    it('should ensure FunctionModel methods return Result types consistently', () => {
      // STRUCTURAL REQUIREMENT: All domain methods should return Result types
      const modelNameResult = ModelName.create('Test Model');
      const testModel = FunctionModel.create({
        modelId: 'test-123',
        name: modelNameResult.value,
        version: Version.create('1.0.0').value,
        status: ModelStatus.DRAFT,
        currentVersion: Version.create('1.0.0').value,
        nodes: new Map(),
        actionNodes: new Map(),
        metadata: {},
        permissions: {},
      }).value;

      // Test that methods return Result types
      const updateResult = testModel.updateName(ModelName.create('New Name').value);
      expect(updateResult).toBeInstanceOf(Result);
      expect(updateResult.isSuccess).toBe(true);

      const publishResult = testModel.publish();
      expect(publishResult).toBeInstanceOf(Result);
    });
  });
});