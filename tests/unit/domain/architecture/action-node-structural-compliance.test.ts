/**
 * ActionNode Structural Compliance Tests
 * 
 * Ensures ActionNode entities have the structural properties required by domain services
 * and outer layers. These tests enforce the interface contracts that prevent compilation errors.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TetherNode } from '../../../../lib/domain/entities/tether-node';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { RetryPolicy } from '../../../../lib/domain/value-objects/retry-policy';
import { RACI } from '../../../../lib/domain/value-objects/raci';
import { ExecutionMode, ActionStatus, RACIRole } from '../../../../lib/domain/enums';

describe('ActionNode Structural Compliance Tests', () => {
  describe('ActionNode Interface Consistency', () => {
    let tetherNode: TetherNode;

    beforeEach(() => {
      const tetherNodeResult = TetherNode.create({
        actionId: NodeId.create('12345678-0000-4000-8000-123456780000').value,
        parentNodeId: NodeId.create('87654321-0000-4000-8000-876543210000').value,
        modelId: 'model-123',
        name: 'Test Tether Node',
        description: 'Test action node description',
        executionMode: ExecutionMode.SEQUENTIAL,
        executionOrder: 1,
        status: ActionStatus.DRAFT,
        priority: 1,
        retryPolicy: RetryPolicy.create({
          maxAttempts: 3,
          baseDelay: 1000,
          strategy: 'exponential',
          maxDelay: 30000,
        }).value,
        raci: RACI.create({
          responsible: RACIRole.RESPONSIBLE,
          accountable: RACIRole.ACCOUNTABLE,
          consulted: RACIRole.CONSULTED,
          informed: RACIRole.INFORMED
        }).value,
        metadata: {},
        tetherData: {
          connection: {
            sourceNodeId: NodeId.create('11111111-0000-4000-8000-111111110000').value,
            targetNodeId: NodeId.create('22222222-0000-4000-8000-222222220000').value,
            connectionType: 'data-flow',
          },
          transformationRules: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(tetherNodeResult.isSuccess).toBe(true);
      tetherNode = tetherNodeResult.value;
    });

    it('should have nodeId property for service compatibility', () => {
      // STRUCTURAL REQUIREMENT: Services expect ActionNode to have nodeId
      expect(tetherNode).toHaveProperty('nodeId');
      expect(tetherNode.nodeId).toBeDefined();
      expect(tetherNode.nodeId.toString()).toBe('12345678-0000-4000-8000-123456780000');
    });

    it('should have id property for outer layer compatibility', () => {
      // STRUCTURAL REQUIREMENT: Outer layers expect ActionNode to have id
      expect(tetherNode).toHaveProperty('id');
      expect(typeof tetherNode.id).toBe('string');
      expect(tetherNode.id).toBe('12345678-0000-4000-8000-123456780000');
    });

    it('should have type property for action identification', () => {
      // STRUCTURAL REQUIREMENT: Services need type property to identify action types
      expect(tetherNode).toHaveProperty('type');
      expect(typeof tetherNode.type).toBe('string');
      expect(tetherNode.type).toBe(tetherNode.getActionType());
      expect(tetherNode.type).toBe('tetherNode');
    });

    it('should maintain backward compatibility with actionId', () => {
      // STRUCTURAL REQUIREMENT: actionId should remain functional
      expect(tetherNode).toHaveProperty('actionId');
      expect(tetherNode.actionId.toString()).toBe(tetherNode.nodeId.toString());
      expect(tetherNode.actionId.toString()).toBe(tetherNode.id);
    });

    it('should have consistent id, nodeId, and actionId values', () => {
      // STRUCTURAL REQUIREMENT: All ID properties should reference the same value
      expect(tetherNode.id).toBe(tetherNode.nodeId.toString());
      expect(tetherNode.id).toBe(tetherNode.actionId.toString());
      expect(tetherNode.nodeId.equals(tetherNode.actionId)).toBe(true);
    });

    it('should expose all required properties for domain services', () => {
      // STRUCTURAL REQUIREMENT: Domain services need these properties
      const requiredProperties = [
        'nodeId',
        'id', 
        'type',
        'actionId',
        'parentNodeId',
        'modelId',
        'name',
        'executionMode',
        'executionOrder',
        'status',
        'priority',
        'retryPolicy',
        'raci',
        'metadata'
      ];

      requiredProperties.forEach(property => {
        expect(tetherNode).toHaveProperty(property);
        expect((tetherNode as any)[property]).toBeDefined();
      });
    });
  });
});