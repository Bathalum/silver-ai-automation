/**
 * Unit tests for ExecutionRules
 * Tests advanced execution validation, precondition checking, and error handling
 */

import { ExecutionRules, ExecutionError, ExecutionPrecondition } from '@/lib/domain/rules/execution-rules';
import { FunctionModel } from '@/lib/domain/entities/function-model';
import { IONode } from '@/lib/domain/entities/io-node';
import { ExecutionContext } from '@/lib/domain/value-objects/execution-context';
import { ModelStatus, NodeStatus, ActionStatus } from '@/lib/domain/enums';
import { TestFactories, FunctionModelBuilder, IONodeBuilder, StageNodeBuilder, TetherNodeBuilder, getTestUUID } from '../../../utils/test-fixtures';

describe('ExecutionRules', () => {
  let executionRules: ExecutionRules;
  let validModel: FunctionModel;
  let validContext: ExecutionContext;

  beforeEach(() => {
    executionRules = new ExecutionRules();
    validModel = TestFactories.createCompleteWorkflow();
    validContext = ExecutionContext.create('production', { userId: 'test-user' }).value;
  });

  describe('model validation', () => {
    it('should validate executable published model', () => {
      // Arrange
      validModel.publish();
      
      // Add an action to the stage node to remove warnings
      const stageNode = Array.from(validModel.nodes.values())
        .find(node => node.name === 'Process');
      
      const testAction = new TetherNodeBuilder()
        .withParentNode(stageNode!.nodeId.toString())
        .withModelId(validModel.modelId)
        .withName('Test Action')
        .build();
      
      validModel.addActionNode(testAction);
      
      // Act
      const result = executionRules.validateModelForExecution(validModel);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.canExecute).toBe(true);
      expect(result.value.errors).toHaveLength(0);
      // Note: May have warnings about stage nodes without actions, which is expected
    });

    it('should reject draft models for execution', () => {
      // Arrange - validModel is draft by default
      
      // Act
      const result = executionRules.validateModelForExecution(validModel);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.canExecute).toBe(false);
      expect(result.value.errors).toContain('Model must be published to execute');
    });

    it('should reject archived models for execution', () => {
      // Arrange
      validModel.publish();
      validModel.archive();
      
      // Act
      const result = executionRules.validateModelForExecution(validModel);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.canExecute).toBe(false);
      expect(result.value.errors).toContain('Cannot execute archived model');
    });

    it('should reject deleted models for execution', () => {
      // Arrange
      validModel.publish();
      validModel.softDelete('test-user');
      
      // Act
      const result = executionRules.validateModelForExecution(validModel);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.canExecute).toBe(false);
      expect(result.value.errors).toContain('Cannot execute deleted model');
    });

    it('should detect models with no input nodes', () => {
      // Arrange
      const modelWithoutInput = new FunctionModelBuilder().build();
      
      // Add only output and stage nodes
      const outputNode = new IONodeBuilder()
        .withModelId(modelWithoutInput.modelId)
        .asOutput()
        .build();
      const stageNode = new StageNodeBuilder()
        .withModelId(modelWithoutInput.modelId)
        .build();
      
      modelWithoutInput.addNode(outputNode);
      modelWithoutInput.addNode(stageNode);
      modelWithoutInput.publish();
      
      // Act
      const result = executionRules.validateModelForExecution(modelWithoutInput);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.canExecute).toBe(false);
      expect(result.value.errors).toContain('Model must have at least one input node');
    });

    it('should detect models with no output nodes', () => {
      // Arrange
      const modelWithoutOutput = new FunctionModelBuilder().build();
      
      // Add only input and stage nodes
      const inputNode = new IONodeBuilder()
        .withModelId(modelWithoutOutput.modelId)
        .asInput()
        .build();
      const stageNode = new StageNodeBuilder()
        .withModelId(modelWithoutOutput.modelId)
        .build();
      
      modelWithoutOutput.addNode(inputNode);
      modelWithoutOutput.addNode(stageNode);
      modelWithoutOutput.publish();
      
      // Act
      const result = executionRules.validateModelForExecution(modelWithoutOutput);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.canExecute).toBe(false);
      expect(result.value.errors).toContain('Model must have at least one output node');
    });

    it('should warn about nodes without actions', () => {
      // Arrange - Create a model with nodes but no actions
      const modelWithoutActions = new FunctionModelBuilder().build();
      
      const inputNode = new IONodeBuilder()
        .withModelId(modelWithoutActions.modelId)
        .withId('input-node')
        .asInput()
        .build();
      const stageNode = new StageNodeBuilder()
        .withModelId(modelWithoutActions.modelId)
        .withName('Process')
        .build();
      const outputNode = new IONodeBuilder()
        .withModelId(modelWithoutActions.modelId)
        .withId('output-node')
        .asOutput()
        .build();
      
      modelWithoutActions.addNode(inputNode);
      modelWithoutActions.addNode(stageNode);
      modelWithoutActions.addNode(outputNode);
      // Force publish by setting status directly since validation would fail
      (modelWithoutActions as any).props.status = ModelStatus.PUBLISHED;
      
      // Act
      const result = executionRules.validateModelForExecution(modelWithoutActions);
      
      
      // Assert
      expect(result.isSuccess).toBe(true);
      // Should be able to execute but with warnings
      expect(result.value.canExecute).toBe(true);
      expect(result.value.warnings.some(w => w.includes('has no actions'))).toBe(true);
    });

    it('should detect nodes with validation errors', () => {
      // Arrange - Create a model that will have validation errors
      const invalidModel = new FunctionModelBuilder().build();
      
      // Create a node that will cause workflow validation to fail
      // (No input nodes should cause validation errors)
      (invalidModel as any)._status = ModelStatus.PUBLISHED; // Force publish to bypass validation
      
      // Act
      const result = executionRules.validateModelForExecution(invalidModel);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.canExecute).toBe(false);
      expect(result.value.errors.some(e => e.includes('Model must have at least one input node'))).toBe(true);
    });
  });

  describe('precondition validation', () => {
    it('should validate all preconditions successfully', () => {
      // Arrange
      const preconditions: ExecutionPrecondition[] = [
        {
          id: 'auth-check',
          description: 'User must be authenticated',
          validator: (model, context) => context.hasParameter('userId'),
          errorMessage: 'User authentication required'
        },
        {
          id: 'resource-check',
          description: 'Sufficient resources available',
          validator: () => true,
          errorMessage: 'Insufficient resources'
        }
      ];
      
      // Act
      const result = executionRules.validatePreconditions(validModel, validContext, preconditions);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.allPassed).toBe(true);
      expect(result.value.failedPreconditions).toHaveLength(0);
    });

    it('should detect failed preconditions', () => {
      // Arrange
      const preconditions: ExecutionPrecondition[] = [
        {
          id: 'auth-check',
          description: 'User must be authenticated',
          validator: (model, context) => context.hasParameter('adminUser'),
          errorMessage: 'Admin authentication required'
        },
        {
          id: 'valid-model',
          description: 'Model must be valid',
          validator: (model) => model.status === ModelStatus.PUBLISHED,
          errorMessage: 'Model must be published'
        }
      ];
      
      // validContext only has 'userId', not 'adminUser'
      // validModel is draft, not published
      
      // Act
      const result = executionRules.validatePreconditions(validModel, validContext, preconditions);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.allPassed).toBe(false);
      expect(result.value.failedPreconditions).toHaveLength(2);
      expect(result.value.failedPreconditions[0].id).toBe('auth-check');
      expect(result.value.failedPreconditions[1].id).toBe('valid-model');
    });

    it('should handle precondition validator exceptions', () => {
      // Arrange
      const preconditions: ExecutionPrecondition[] = [
        {
          id: 'throwing-validator',
          description: 'Validator that throws',
          validator: () => { throw new Error('Validator error'); },
          errorMessage: 'Validation failed'
        }
      ];
      
      // Act
      const result = executionRules.validatePreconditions(validModel, validContext, preconditions);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.allPassed).toBe(false);
      expect(result.value.failedPreconditions).toHaveLength(1);
      expect(result.value.failedPreconditions[0].error).toContain('Validator error');
    });

    it('should handle empty preconditions list', () => {
      // Act
      const result = executionRules.validatePreconditions(validModel, validContext, []);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.allPassed).toBe(true);
      expect(result.value.failedPreconditions).toHaveLength(0);
    });
  });

  describe('node execution order validation', () => {
    it('should validate correct execution order', () => {
      // Arrange
      validModel.publish();
      
      // Add some action nodes to create execution order
      const stageNode = Array.from(validModel.nodes.values())
        .find(node => node.name === 'Process');
      
      const action1 = new TetherNodeBuilder()
        .withParentNode(stageNode!.nodeId.toString())
        .withModelId(validModel.modelId)
        .withName('Action 1')
        .withExecutionOrder(1)
        .build();
            
      const action2 = new TetherNodeBuilder()
        .withParentNode(stageNode!.nodeId.toString())
        .withModelId(validModel.modelId)
        .withName('Action 2')
        .withExecutionOrder(2)
        .build();
            
      validModel.addActionNode(action1);
      validModel.addActionNode(action2);
      
      // Act
      const result = executionRules.validateExecutionOrder(validModel);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(true);
      expect(result.value.errors).toHaveLength(0);
    });

    it('should detect duplicate execution orders', () => {
      // Arrange - Use fresh model to avoid state pollution
      const testModel = TestFactories.createCompleteWorkflow();
      const stageNode = Array.from(testModel.nodes.values())
        .find(node => node.name === 'Process');
      
      const action1 = new TetherNodeBuilder()
        .withId(getTestUUID('action-1-' + Date.now()))
        .withParentNode(stageNode!.nodeId.toString())
        .withModelId(testModel.modelId)
        .withName('Action 1')
        .withExecutionOrder(1)
        .build();
            
      const action2 = new TetherNodeBuilder()
        .withId(getTestUUID('action-2-' + Date.now()))
        .withParentNode(stageNode!.nodeId.toString())
        .withModelId(testModel.modelId)
        .withName('Action 2')
        .withExecutionOrder(1) // Same execution order - should cause error
        .build();
            
      testModel.addActionNode(action1);
      testModel.addActionNode(action2);
      
      // Act
      const result = executionRules.validateExecutionOrder(testModel);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Duplicate execution order detected: 1');
    });

    it('should detect gaps in execution order', () => {
      // Arrange - Use fresh model to avoid state pollution
      const testModel = TestFactories.createCompleteWorkflow();
      const stageNode = Array.from(testModel.nodes.values())
        .find(node => node.name === 'Process');
      
      const action1 = new TetherNodeBuilder()
        .withId(getTestUUID('action-gap-1-' + Date.now()))
        .withParentNode(stageNode!.nodeId.toString())
        .withModelId(testModel.modelId)
        .withName('Action 1')
        .withExecutionOrder(1)
        .build();
            
      const action2 = new TetherNodeBuilder()
        .withId(getTestUUID('action-gap-2-' + Date.now()))
        .withParentNode(stageNode!.nodeId.toString())
        .withModelId(testModel.modelId)
        .withName('Action 2')
        .withExecutionOrder(3) // Skip order 2 - should cause gap error
        .build();
            
      testModel.addActionNode(action1);
      testModel.addActionNode(action2);
      
      // Act
      const result = executionRules.validateExecutionOrder(testModel);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Execution order gap detected: missing order 2');
    });

    it('should validate execution order starting from 1', () => {
      // Arrange - Use fresh model to avoid state pollution
      const testModel = TestFactories.createCompleteWorkflow();
      const stageNode = Array.from(testModel.nodes.values())
        .find(node => node.name === 'Process');
      
      const action = new TetherNodeBuilder()
        .withId(getTestUUID('action-order-0-' + Date.now()))
        .withParentNode(stageNode!.nodeId.toString())
        .withModelId(testModel.modelId)
        .withName('Action')
        .withExecutionOrder(0) // Start from 0 instead of 1 - should cause error
        .build();
            
      testModel.addActionNode(action);
      
      // Act
      const result = executionRules.validateExecutionOrder(testModel);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Execution order must start from 1');
    });
  });

  describe('resource requirements validation', () => {
    it('should validate sufficient resources', () => {
      // Arrange
      const resourceLimits = {
        maxCpu: 16,
        maxMemory: 536870912, // 512 MB in bytes
        maxExecutionTime: 3600
      };
      
      validModel.publish();
      
      // Act
      const result = executionRules.validateResourceRequirements(validModel, resourceLimits);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(true);
      expect(result.value.errors).toHaveLength(0);
    });

    it('should detect CPU requirement exceeding limits', () => {
      // Arrange
      const resourceLimits = {
        maxCpu: 1, // Low limit
        maxMemory: 32768,
        maxExecutionTime: 3600
      };
      
      const stageNode = Array.from(validModel.nodes.values())
        .find(node => node.name === 'Process');
      
      const highCpuAction = new TetherNodeBuilder()
        .withId(getTestUUID('high-cpu-action-' + Date.now()))
        .withParentNode(stageNode!.nodeId.toString())
        .withModelId(validModel.modelId)
        .withResourceRequirements({ cpu: 4 }) // Exceeds limit of 1
        .build();
      
      validModel.addActionNode(highCpuAction);
      
      // Act
      const result = executionRules.validateResourceRequirements(validModel, resourceLimits);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors.some(e => e.includes('CPU requirement exceeds limit'))).toBe(true);
    });

    it('should detect memory requirement exceeding limits', () => {
      // Arrange
      const resourceLimits = {
        maxCpu: 16,
        maxMemory: 512, // Low limit
        maxExecutionTime: 3600
      };
      
      const stageNode = Array.from(validModel.nodes.values())
        .find(node => node.name === 'Process');
      
      const highMemoryAction = new TetherNodeBuilder()
        .withId(getTestUUID('high-memory-action-' + Date.now()))
        .withParentNode(stageNode!.nodeId.toString())
        .withModelId(validModel.modelId)
        .withResourceRequirements({ memory: 2048 }) // Exceeds limit of 512
        .build();
      
      validModel.addActionNode(highMemoryAction);
      
      // Act
      const result = executionRules.validateResourceRequirements(validModel, resourceLimits);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors.some(e => e.includes('Memory requirement exceeds limit'))).toBe(true);
    });

    it('should calculate total resource requirements', () => {
      // Arrange - Create a clean model without default actions
      const cleanModel = new FunctionModelBuilder().build();
      
      // Add nodes without actions first
      const inputNode = new IONodeBuilder()
        .withModelId(cleanModel.modelId)
        .asInput()
        .build();
      const stageNode = new StageNodeBuilder()
        .withModelId(cleanModel.modelId)
        .withName('Process')
        .build();
      const outputNode = new IONodeBuilder()
        .withModelId(cleanModel.modelId)
        .asOutput()
        .build();
      
      cleanModel.addNode(inputNode);
      cleanModel.addNode(stageNode);
      cleanModel.addNode(outputNode);
      
      const action1 = new TetherNodeBuilder()
        .withId(getTestUUID('calc-action-1-' + Date.now()))
        .withParentNode(stageNode.nodeId.toString())
        .withModelId(cleanModel.modelId)
        .withResourceRequirements({ cpu: 2, memory: 1024, timeout: 300 })
        .build();
      
      const action2 = new TetherNodeBuilder()
        .withId(getTestUUID('calc-action-2-' + (Date.now() + 1)))
        .withParentNode(stageNode.nodeId.toString())
        .withModelId(cleanModel.modelId)
        .withResourceRequirements({ cpu: 4, memory: 2048, timeout: 600 })
        .build();
      
      cleanModel.addActionNode(action1);
      cleanModel.addActionNode(action2);
      cleanModel.publish();
      
      const resourceLimits = {
        maxCpu: 16,
        maxMemory: 32768,
        maxExecutionTime: 3600
      };
      
      // Act
      const result = executionRules.validateResourceRequirements(cleanModel, resourceLimits);
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(true);
      expect(result.value.totalRequirements).toEqual({
        cpu: 6,
        memory: 3072,
        executionTime: 900
      });
    });
  });

  describe('execution error handling', () => {
    it('should create execution error with context', () => {
      // Act
      const error = ExecutionRules.createExecutionError(
        'TEST_ERROR',
        'Test error occurred',
        { nodeId: 'test-node', step: 'validation' }
      );
      
      // Assert
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error occurred');
      expect(error.context?.nodeId).toBe('test-node');
      expect(error.context?.step).toBe('validation');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create execution error without context', () => {
      // Act
      const error = ExecutionRules.createExecutionError(
        'SIMPLE_ERROR',
        'Simple error'
      );
      
      // Assert
      expect(error.code).toBe('SIMPLE_ERROR');
      expect(error.message).toBe('Simple error');
      expect(error.context).toEqual({});
    });

    it('should format execution errors consistently', () => {
      // Arrange
      const error = ExecutionRules.createExecutionError(
        'FORMAT_TEST',
        'Formatting test',
        { detail: 'extra info' }
      );
      
      // Act
      const formatted = ExecutionRules.formatExecutionError(error);
      
      // Assert
      expect(formatted).toContain('FORMAT_TEST');
      expect(formatted).toContain('Formatting test');
      expect(formatted).toContain('extra info');
      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}/); // Date format
    });
  });

  describe('comprehensive execution validation', () => {
    it('should perform complete execution validation successfully', () => {
      // Arrange
      validModel.publish();
      
      const preconditions: ExecutionPrecondition[] = [
        {
          id: 'user-auth',
          description: 'User authenticated',
          validator: (model, context) => context.hasParameter('userId'),
          errorMessage: 'Authentication required'
        }
      ];
      
      const resourceLimits = {
        maxCpu: 16,
        maxMemory: 536870912, // 512 MB in bytes
        maxExecutionTime: 3600
      };
      
      // Act
      const result = executionRules.validateCompleteExecution(
        validModel,
        validContext,
        preconditions,
        resourceLimits
      );
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.canExecute).toBe(true);
      expect(result.value.validationSummary.modelValidation.canExecute).toBe(true);
      expect(result.value.validationSummary.preconditionValidation.allPassed).toBe(true);
      expect(result.value.validationSummary.executionOrderValidation.isValid).toBe(true);
      expect(result.value.validationSummary.resourceValidation.isValid).toBe(true);
    });

    it('should fail complete validation when any check fails', () => {
      // Arrange - Use draft model (will fail model validation)
      const preconditions: ExecutionPrecondition[] = [];
      const resourceLimits = {
        maxCpu: 16,
        maxMemory: 32768,
        maxExecutionTime: 3600
      };
      
      // Act
      const result = executionRules.validateCompleteExecution(
        validModel, // Still draft
        validContext,
        preconditions,
        resourceLimits
      );
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.canExecute).toBe(false);
      expect(result.value.validationSummary.modelValidation.canExecute).toBe(false);
    });

    it('should collect all validation errors in summary', () => {
      // Arrange
      const modelWithIssues = new FunctionModelBuilder().build();
      
      const failingPreconditions: ExecutionPrecondition[] = [
        {
          id: 'fail-check',
          description: 'Always fails',
          validator: () => false,
          errorMessage: 'Precondition failed'
        }
      ];
      
      const restrictiveResourceLimits = {
        maxCpu: 0.1, // Very low
        maxMemory: 64, // Very low
        maxExecutionTime: 10 // Very low
      };
      
      // Act
      const result = executionRules.validateCompleteExecution(
        modelWithIssues,
        validContext,
        failingPreconditions,
        restrictiveResourceLimits
      );
      
      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.canExecute).toBe(false);
      
      // Should have errors from multiple validation types
      const allErrors = result.value.allErrors;
      expect(allErrors.length).toBeGreaterThan(1);
      expect(allErrors.some(e => e.includes('published'))).toBe(true); // Model validation
      expect(allErrors.some(e => e.includes('Precondition failed'))).toBe(true); // Precondition validation
    });
  });
});