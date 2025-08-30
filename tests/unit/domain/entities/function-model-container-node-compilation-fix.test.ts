/**
 * Test for FunctionModelContainerNode Compilation Fix
 * TDD Test to fix compilation errors in FunctionModelContainerNode entity
 * Focus: Configuration object typing and property access
 */

import { describe, it, expect } from '@jest/globals';
import { FunctionModelContainerNode } from '@/lib/domain/entities/function-model-container-node';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { RetryPolicy } from '@/lib/domain/value-objects/retry-policy';
import { ActionStatus, ExecutionMode } from '@/lib/domain/enums';

describe('FunctionModelContainerNode Entity - Compilation Fix', () => {
  describe('Configuration object typing', () => {
    it('should handle executionPolicy configuration correctly', () => {
      // Arrange
      const nodeId = NodeId.create('test-container-node').value!;
      const parentId = NodeId.create('parent-node').value!;
      
      const retryPolicy = RetryPolicy.create({
        maxAttempts: 3,
        backoffStrategy: 'linear',
        backoffDelay: 1000,
        failureThreshold: 2
      }).value!;

      const createProps = {
        actionId: nodeId,
        parentNodeId: parentId,
        modelId: 'test-model-123',
        name: 'Test Container',
        actionType: 'function-model-container',
        executionOrder: 1,
        executionMode: ExecutionMode.MANUAL,
        status: ActionStatus.IDLE,
        priority: 1,
        retryPolicy,
        configuration: {
          executionPolicy: {
            triggerConditions: ['condition1'],
            failureHandling: 'retry',
            resourceInheritance: 'shared',
            timeoutBehavior: 'graceful'
          }
        }
      };

      // Act
      const result = FunctionModelContainerNode.create(createProps);

      // Assert
      if (result.isFailure) {
        console.log('Creation failed with error:', result.error);
      }
      expect(result.isSuccess).toBe(true);
      expect(result.value!.containerData.executionPolicy).toBeDefined();
      expect(result.value!.containerData.executionPolicy!.triggerConditions).toEqual(['condition1']);
    });

    it('should handle orchestrationMode as object not string', () => {
      // Arrange
      const nodeId = NodeId.create('test-container-node').value!;
      const parentId = NodeId.create('parent-node').value!;
      
      const retryPolicy = RetryPolicy.create({
        maxAttempts: 3,
        backoffStrategy: 'linear',
        backoffDelay: 1000,
        failureThreshold: 2
      }).value!;

      const createProps = {
        actionId: nodeId,
        parentNodeId: parentId,
        modelId: 'test-model-123',
        name: 'Test Container',
        actionType: 'function-model-container',
        executionOrder: 1,
        executionMode: ExecutionMode.MANUAL,
        status: ActionStatus.IDLE,
        priority: 1,
        retryPolicy,
        configuration: {
          orchestrationMode: {
            integrationStyle: 'embedded',
            communicationPattern: 'direct',
            stateManagement: 'isolated'
          }
        }
      };

      // Act
      const result = FunctionModelContainerNode.create(createProps);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value!.containerData.orchestrationMode).toBeDefined();
      expect(result.value!.containerData.orchestrationMode!.integrationStyle).toBe('embedded');
    });

    it('should handle contextInheritance with proper array initialization', () => {
      // Arrange
      const nodeId = NodeId.create('test-container-node').value!;
      const parentId = NodeId.create('parent-node').value!;
      
      const retryPolicy = RetryPolicy.create({
        maxAttempts: 3,
        backoffStrategy: 'linear',
        backoffDelay: 1000,
        failureThreshold: 2
      }).value!;

      const createProps = {
        actionId: nodeId,
        parentNodeId: parentId,
        modelId: 'test-model-123',
        name: 'Test Container',
        actionType: 'function-model-container',
        executionOrder: 1,
        executionMode: ExecutionMode.MANUAL,
        status: ActionStatus.IDLE,
        priority: 1,
        retryPolicy,
        configuration: {
          contextInheritance: {
            inheritedContexts: ['context1', 'context2'],
            isolatedContexts: ['isolated1'],
            sharedContexts: ['shared1']
          }
        }
      };

      // Act
      const result = FunctionModelContainerNode.create(createProps);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value!.containerData.contextInheritance).toBeDefined();
      expect(result.value!.containerData.contextInheritance!.inheritedContexts).toEqual(['context1', 'context2']);
    });
  });

  describe('Property update methods', () => {
    it('should update orchestration mode correctly', () => {
      // Arrange
      const nodeId = NodeId.create('test-container-node').value!;
      const parentId = NodeId.create('parent-node').value!;
      
      const createProps = {
        actionId: nodeId,
        parentNodeId: parentId,
        modelId: 'test-model-123',
        name: 'Test Container',
        actionType: 'function-model-container',
        executionOrder: 1,
        executionMode: ExecutionMode.MANUAL,
        status: ActionStatus.IDLE,
        priority: 1
      };

      const node = FunctionModelContainerNode.create(createProps).value!;

      // Act - This should work with the new typing
      const result = node.updateOrchestrationMode('embedded');

      // Assert
      expect(result.isSuccess).toBe(true);
      // The orchestrationMode should be updated as an object, not a string
      expect(node.containerData.orchestrationMode).toBeDefined();
    });

    it('should update execution policy without compilation errors', () => {
      // Arrange
      const nodeId = NodeId.create('test-container-node').value!;
      const parentId = NodeId.create('parent-node').value!;
      
      const createProps = {
        actionId: nodeId,
        parentNodeId: parentId,
        modelId: 'test-model-123',
        name: 'Test Container',
        actionType: 'function-model-container',
        executionOrder: 1,
        executionMode: ExecutionMode.MANUAL,
        status: ActionStatus.IDLE,
        priority: 1
      };

      const node = FunctionModelContainerNode.create(createProps).value!;

      // Act - This should work without compilation errors
      const result = node.updateExecutionPolicy({
        executionTrigger: 'manual',
        conditions: { test: true },
        timeout: 300
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(node.containerData.executionPolicy).toBeDefined();
    });
  });

  describe('Context inheritance operations', () => {
    it('should handle inherited context operations safely', () => {
      // Arrange
      const nodeId = NodeId.create('test-container-node').value!;
      const parentId = NodeId.create('parent-node').value!;
      
      const createProps = {
        actionId: nodeId,
        parentNodeId: parentId,
        modelId: 'test-model-123',
        name: 'Test Container',
        actionType: 'function-model-container',
        executionOrder: 1,
        executionMode: ExecutionMode.MANUAL,
        status: ActionStatus.IDLE,
        priority: 1
      };

      const node = FunctionModelContainerNode.create(createProps).value!;

      // Act - Add context without compilation errors
      const addResult = node.addInheritedContext('test-context');

      // Assert
      expect(addResult.isSuccess).toBe(true);
      expect(node.containerData.contextInheritance).toBeDefined();
      expect(node.containerData.contextInheritance!.inheritedContexts).toContain('test-context');
    });
  });
});