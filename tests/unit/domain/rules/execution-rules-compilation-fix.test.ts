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
import { Version } from '@/lib/domain/value-objects/version';
import { ExecutionContext } from '@/lib/domain/value-objects/execution-context';
import { ModelStatus } from '@/lib/domain/enums';

describe('Execution Rules - Compilation Fix', () => {
  describe('Resource validation type consistency', () => {
    it('should return consistent totalRequirements type structure', () => {
      // Arrange - Create minimal function model for testing
      const modelId = NodeId.generate().value; // Use proper UUID generation
      const modelName = ModelName.create('Test Model').value!;
      const version = Version.create('1.0.0').value!;
      
      const modelProps = {
        modelId,
        name: modelName,
        description: 'Test model',
        version,
        status: ModelStatus.DRAFT,
        currentVersion: version,
        nodes: new Map(),
        actionNodes: new Map(),
        aiAgentConfig: {},
        metadata: {},
        permissions: {}
      };
      
      const modelResult = FunctionModel.create(modelProps);
      expect(modelResult.isSuccess).toBe(true);
      if (modelResult.isFailure) return;
      
      const model = modelResult.value;
      const resourceLimits = {
        maxCpu: 100,
        maxMemory: 1000,
        maxExecutionTime: 60000
      };

      // Act
      const executionRules = new ExecutionRules();
      const result = executionRules.validateResourceRequirements(model, resourceLimits);

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
      const modelId = NodeId.generate().value;
      const modelName = ModelName.create('Test Model').value!;
      const version = Version.create('1.0.0').value!;
      
      const modelProps = {
        modelId,
        name: modelName,
        description: 'Test model',
        version,
        status: ModelStatus.DRAFT,
        currentVersion: version,
        nodes: new Map(),
        actionNodes: new Map(),
        aiAgentConfig: {},
        metadata: {},
        permissions: {}
      };
      
      const modelResult = FunctionModel.create(modelProps);
      expect(modelResult.isSuccess).toBe(true);
      if (modelResult.isFailure) return;
      
      const model = modelResult.value;
      
      const executionContext = ExecutionContext.create(
        'test', // environment
        { // parameters
          contextId: 'context-123',
          modelId: modelId,
          userId: 'user-123',
          contextData: { test: 'data' }
        },
        'session-123' // sessionId
      );
      
      expect(executionContext.isSuccess).toBe(true);
      if (executionContext.isFailure) return;
      
      const context = executionContext.value;

      // Act - This should not cause compilation errors
      const executionRules = new ExecutionRules();
      const result = executionRules.validateExecutionReadiness(model, context);

      // Assert
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Execution context type consistency', () => {
    it('should access userId property on ExecutionContext without errors', () => {
      // Arrange - Use correct ExecutionContext.create signature
      const environment = 'test';
      const parameters = {
        contextId: 'context-123',
        modelId: 'model-123', 
        userId: 'user-123', // This should be accessible
        contextData: { test: 'data' }
      };
      const sessionId = 'session-123';

      // Act
      const executionContextResult = ExecutionContext.create(environment, parameters, sessionId);
      expect(executionContextResult.isSuccess).toBe(true);
      if (executionContextResult.isFailure) return;
      
      const executionContext = executionContextResult.value;

      // Assert - userId should be accessible through parameters
      expect(executionContext.parameters.userId).toBe('user-123');
    });
  });
});