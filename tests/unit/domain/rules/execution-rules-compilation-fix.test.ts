/**
 * Test for Execution Rules Compilation Fix
 * TDD Test to fix type mismatches in execution rules
 * Focus: Type consistency for resource validation results
 */

import { describe, it, expect } from '@jest/globals';
import { ExecutionRules } from '@/lib/domain/rules/execution-rules';
import { FunctionModel } from '@/lib/domain/entities/function-model';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { ModelName } from '@/lib/domain/value-objects/model-name';
import { ExecutionContext } from '@/lib/domain/value-objects/execution-context';

describe('Execution Rules - Compilation Fix', () => {
  describe('Resource validation type consistency', () => {
    it('should return consistent totalRequirements type structure', () => {
      // Arrange - Create minimal function model for testing
      const modelId = NodeId.create('test-model').value!;
      const modelName = ModelName.create('Test Model').value!;
      
      const modelProps = {
        modelId,
        modelName,
        description: 'Test model',
        userId: 'user-123'
      };
      
      const model = FunctionModel.create(modelProps).value!;
      const resourceLimits = {
        maxCpu: 100,
        maxMemory: 1000,
        maxExecutionTime: 60000
      };

      // Act
      const result = ExecutionRules.validateResourceRequirements(model, resourceLimits);

      // Assert - totalRequirements should have specific structure, not Record<string, number>
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.totalRequirements).toBeDefined();
      
      // Should have specific properties, not generic Record
      expect(typeof result.value!.totalRequirements.cpu).toBe('number');
      expect(typeof result.value!.totalRequirements.memory).toBe('number');
      expect(typeof result.value!.totalRequirements.executionTime).toBe('number');
    });
  });

  describe('Execution precondition type consistency', () => {
    it('should handle ExecutionPrecondition objects correctly', () => {
      // Arrange
      const modelId = NodeId.create('test-model').value!;
      const modelName = ModelName.create('Test Model').value!;
      
      const modelProps = {
        modelId,
        modelName,
        description: 'Test model',
        userId: 'user-123'
      };
      
      const model = FunctionModel.create(modelProps).value!;
      
      const executionContext = ExecutionContext.create({
        contextId: 'context-123',
        modelId: modelId.value,
        // userId property should exist on ExecutionContext
        userId: 'user-123',
        contextData: { test: 'data' }
      }).value!;

      // Act - This should not cause compilation errors
      const result = ExecutionRules.validateExecutionReadiness(model, executionContext);

      // Assert
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Execution context type consistency', () => {
    it('should access userId property on ExecutionContext without errors', () => {
      // Arrange
      const contextData = {
        contextId: 'context-123',
        modelId: 'model-123',
        userId: 'user-123', // This should be accessible
        contextData: { test: 'data' }
      };

      // Act
      const executionContext = ExecutionContext.create(contextData).value!;

      // Assert - userId should be accessible
      expect(executionContext.userId).toBe('user-123');
    });
  });
});