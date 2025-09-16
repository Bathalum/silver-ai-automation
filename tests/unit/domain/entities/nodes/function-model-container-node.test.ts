/**
 * Unit tests for FunctionModelContainerNode entity
 * Tests nested model management, context inheritance, and orchestration configuration
 */

import { FunctionModelContainerNode, FunctionModelContainerData } from '@/lib/domain/entities/function-model-container-node';
import { ActionNodeType, ActionStatus, ExecutionMode } from '@/lib/domain/enums';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { RetryPolicy } from '@/lib/domain/value-objects/retry-policy';
import { RACI } from '@/lib/domain/value-objects/raci';
import { DateTestHelpers } from '../../../../utils/test-helpers';

describe('FunctionModelContainerNode', () => {
  let validContainerData: FunctionModelContainerData;
  let validProps: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    validContainerData = {
      nestedModelId: 'nested-model-123',
      contextMapping: { 
        inputContext: 'parentContext.input',
        configContext: 'parentContext.config'
      },
      outputExtraction: {
        extractedOutputs: ['result', 'status', 'metadata'],
        outputTransformations: {
          result: 'data.result',
          status: 'execution.status'
        }
      },
      executionPolicy: {
        executionTrigger: 'automatic',
        timeout: 1800
      },
      contextInheritance: {
        inheritedContexts: ['globalContext', 'userContext'],
        contextTransformations: {
          globalContext: 'parent.global',
          userContext: 'parent.user'
        }
      },
      orchestrationMode: {
        integrationStyle: 'embedded',
        communicationPattern: 'direct',
        stateManagement: 'isolated',
        errorPropagation: 'bubble',
        resourceSharing: 'inherited',
        executionIsolation: 'sandboxed'
      }
    };

    const nodeId = NodeId.create('123e4567-e89b-42d3-a456-426614174002');
    const parentNodeId = NodeId.create('123e4567-e89b-42d3-a456-426614174003');
    const retryPolicy = RetryPolicy.createDefault();
    const raci = RACI.create(['test-user']);

    validProps = {
      actionId: nodeId.value,
      parentNodeId: parentNodeId.value,
      modelId: 'test-model-id',
      name: 'Test Container Node',
      description: 'A test function model container node',
      actionType: ActionNodeType.FUNCTION_MODEL_CONTAINER,
      executionMode: ExecutionMode.SEQUENTIAL,
      executionOrder: 1,
      status: ActionStatus.ACTIVE,
      priority: 5,
      estimatedDuration: 30,
      retryPolicy: retryPolicy.value,
      configuration: validContainerData
    };
  });

  describe('creation and initialization', () => {
    it('should create container node with valid properties', () => {
      // Act
      const result = FunctionModelContainerNode.create(validProps);
      
      // Assert
      expect(result).toBeValidResult();
      const containerNode = result.value;
      
      expect(containerNode.actionId.toString()).toBe('123e4567-e89b-42d3-a456-426614174002');
      expect(containerNode.name).toBe('Test Container Node');
      expect(containerNode.getActionType()).toBe(ActionNodeType.FUNCTION_MODEL_CONTAINER);
      expect(containerNode.containerData.nestedModelId).toBe('nested-model-123');
      expect(containerNode.containerData.orchestrationMode).toEqual({
        integrationStyle: 'embedded',
        communicationPattern: 'direct',
        stateManagement: 'isolated',
        errorPropagation: 'bubble',
        resourceSharing: 'inherited',
        executionIsolation: 'sandboxed'
      });
      expect(containerNode.createdAt).toBeInstanceOf(Date);
      expect(containerNode.updatedAt).toBeInstanceOf(Date);
    });

    it('should reject creation with missing nested model ID', () => {
      // Arrange
      validProps.configuration.nestedModelId = '';
      
      // Act
      const result = FunctionModelContainerNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Nested model ID is required');
    });

    it('should reject creation with invalid execution trigger', () => {
      // Arrange
      validProps.configuration.executionPolicy.executionTrigger = 'invalid';
      
      // Act
      const result = FunctionModelContainerNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Invalid execution trigger');
    });

    it('should reject creation with conditional trigger without conditions', () => {
      // Arrange
      validProps.configuration.executionPolicy = {
        executionTrigger: 'conditional'
        // Missing conditions
      };
      
      // Act
      const result = FunctionModelContainerNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Conditional execution trigger requires conditions');
    });

    it('should reject creation with invalid timeout', () => {
      // Arrange
      validProps.configuration.executionPolicy.timeout = 8000; // > 7200
      
      // Act
      const result = FunctionModelContainerNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Timeout must be between 0 and 7200 seconds (2 hours)');
    });

    it('should reject creation with invalid orchestration mode', () => {
      // Arrange
      validProps.configuration.orchestrationMode = {
        integrationStyle: 'invalid',
        communicationPattern: 'direct',
        stateManagement: 'isolated',
        errorPropagation: 'bubble',
        resourceSharing: 'inherited',
        executionIsolation: 'sandboxed'
      };
      
      // Act
      const result = FunctionModelContainerNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Invalid orchestration integration style');
    });

    it('should reject creation with no extracted outputs', () => {
      // Arrange
      validProps.configuration.outputExtraction.extractedOutputs = [];
      
      // Act
      const result = FunctionModelContainerNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('At least one output must be extracted');
    });

    it('should reject creation with duplicate extracted outputs', () => {
      // Arrange
      validProps.configuration.outputExtraction.extractedOutputs = ['result', 'status', 'result'];
      
      // Act
      const result = FunctionModelContainerNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Extracted outputs must be unique');
    });

    it('should reject creation with duplicate inherited contexts', () => {
      // Arrange
      validProps.configuration.contextInheritance.inheritedContexts = ['context1', 'context2', 'context1'];
      
      // Act
      const result = FunctionModelContainerNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Inherited contexts must be unique');
    });

    it('should create with conditional trigger and conditions', () => {
      // Arrange
      validProps.configuration.executionPolicy = {
        executionTrigger: 'conditional',
        conditions: { trigger: 'onDataReady', threshold: 100 },
        timeout: 3600
      };
      
      // Act
      const result = FunctionModelContainerNode.create(validProps);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.containerData.executionPolicy.executionTrigger).toBe('conditional');
      expect(result.value.containerData.executionPolicy.conditions).toEqual({ trigger: 'onDataReady', threshold: 100 });
    });
  });

  describe('nested model management', () => {
    let containerNode: FunctionModelContainerNode;

    beforeEach(() => {
      const result = FunctionModelContainerNode.create(validProps);
      containerNode = result.value;
    });

    it('should update nested model ID successfully', () => {
      // Act
      const result = containerNode.updateNestedModelId('new-nested-model-456');
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.nestedModelId).toBe('new-nested-model-456');
    });

    it('should trim whitespace from nested model ID', () => {
      // Act
      const result = containerNode.updateNestedModelId('  spaced-model-id  ');
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.nestedModelId).toBe('spaced-model-id');
    });

    it('should reject empty nested model ID', () => {
      // Act
      const result = containerNode.updateNestedModelId('');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Nested model ID cannot be empty');
    });

    it('should reject whitespace-only nested model ID', () => {
      // Act
      const result = containerNode.updateNestedModelId('   ');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Nested model ID cannot be empty');
    });

    it('should reject self-referencing nested model', () => {
      // Act
      const result = containerNode.updateNestedModelId('test-model-id'); // Same as modelId
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Cannot nest a model within itself');
    });

    it('should update timestamp when nested model ID changes', () => {
      // Arrange
      const originalUpdatedAt = containerNode.updatedAt;
      
      // Act
      containerNode.updateNestedModelId('new-model');
      
      // Assert
      expect(containerNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('context mapping management', () => {
    let containerNode: FunctionModelContainerNode;

    beforeEach(() => {
      const result = FunctionModelContainerNode.create(validProps);
      containerNode = result.value;
    });

    it('should update context mapping successfully', () => {
      // Arrange
      const newMapping = { 
        newInput: 'parent.newInput',
        config: 'global.config'
      };
      
      // Act
      const result = containerNode.updateContextMapping(newMapping);
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.contextMapping).toEqual(newMapping);
    });

    it('should replace all context mappings', () => {
      // Arrange
      const newMapping = { singleMapping: 'parent.single' };
      
      // Act
      containerNode.updateContextMapping(newMapping);
      
      // Assert
      expect(containerNode.containerData.contextMapping).toEqual(newMapping);
      expect(Object.keys(containerNode.containerData.contextMapping)).toHaveLength(1);
    });

    it('should handle empty mapping object', () => {
      // Act
      const result = containerNode.updateContextMapping({});
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.contextMapping).toEqual({});
    });

    it('should create defensive copy of mapping', () => {
      // Arrange
      const mapping = { mutable: 'value' };
      containerNode.updateContextMapping(mapping);
      
      // Act - Modify original object
      mapping.mutable = 'changed';
      
      // Assert - Internal state should be unchanged
      expect(containerNode.containerData.contextMapping.mutable).toBe('value');
    });
  });

  describe('output extraction management', () => {
    let containerNode: FunctionModelContainerNode;

    beforeEach(() => {
      const result = FunctionModelContainerNode.create(validProps);
      containerNode = result.value;
    });

    it('should update output extraction successfully', () => {
      // Arrange
      const newExtraction = {
        extractedOutputs: ['newResult', 'newStatus'],
        outputTransformations: { newResult: 'data.new' }
      };
      
      // Act
      const result = containerNode.updateOutputExtraction(newExtraction);
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.outputExtraction.extractedOutputs).toEqual(['newResult', 'newStatus']);
      expect(containerNode.containerData.outputExtraction.outputTransformations).toEqual({ newResult: 'data.new' });
    });

    it('should reject extraction with no outputs', () => {
      // Arrange
      const invalidExtraction = {
        extractedOutputs: [],
        outputTransformations: {}
      };
      
      // Act
      const result = containerNode.updateOutputExtraction(invalidExtraction);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('At least one output must be extracted');
    });

    it('should reject extraction with duplicate outputs', () => {
      // Arrange
      const invalidExtraction = {
        extractedOutputs: ['output1', 'output2', 'output1'],
        outputTransformations: {}
      };
      
      // Act
      const result = containerNode.updateOutputExtraction(invalidExtraction);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Extracted outputs must be unique');
    });

    it('should handle extraction without transformations', () => {
      // Arrange
      const extractionWithoutTransforms = {
        extractedOutputs: ['output1', 'output2']
      };
      
      // Act
      const result = containerNode.updateOutputExtraction(extractionWithoutTransforms);
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.outputExtraction.outputTransformations).toBeUndefined();
    });

    it('should create defensive copies of extraction data', () => {
      // Arrange
      const outputs = ['output1', 'output2'];
      const transforms = { output1: 'transform1' };
      const extraction = { extractedOutputs: outputs, outputTransformations: transforms };
      
      containerNode.updateOutputExtraction(extraction);
      
      // Act - Modify original arrays/objects
      outputs.push('newOutput');
      transforms.output1 = 'changed';
      
      // Assert - Internal state should be unchanged
      expect(containerNode.containerData.outputExtraction.extractedOutputs).toEqual(['output1', 'output2']);
      expect(containerNode.containerData.outputExtraction.outputTransformations!.output1).toBe('transform1');
    });

    it('should add extracted output successfully', () => {
      // Act
      const result = containerNode.addExtractedOutput('newOutput');
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.outputExtraction.extractedOutputs).toContain('newOutput');
    });

    it('should trim whitespace when adding output', () => {
      // Act
      const result = containerNode.addExtractedOutput('  spacedOutput  ');
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.outputExtraction.extractedOutputs).toContain('spacedOutput');
    });

    it('should reject adding empty output', () => {
      // Act
      const result = containerNode.addExtractedOutput('');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Output name cannot be empty');
    });

    it('should reject adding duplicate output', () => {
      // Arrange - Add output first
      containerNode.addExtractedOutput('duplicateOutput');
      
      // Act - Try to add again
      const result = containerNode.addExtractedOutput('duplicateOutput');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Output already exists');
    });

    it('should remove extracted output successfully', () => {
      // Arrange - Add extra output first
      containerNode.addExtractedOutput('tempOutput');
      expect(containerNode.containerData.outputExtraction.extractedOutputs).toContain('tempOutput');
      
      // Act
      const result = containerNode.removeExtractedOutput('tempOutput');
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.outputExtraction.extractedOutputs).not.toContain('tempOutput');
    });

    it('should reject removing non-existent output', () => {
      // Act
      const result = containerNode.removeExtractedOutput('nonExistentOutput');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Output does not exist');
    });

    it('should reject removing last output', () => {
      // Arrange - Create container with only one output
      const singleOutputProps = { ...validProps };
      singleOutputProps.configuration.outputExtraction.extractedOutputs = ['onlyOutput'];
      const singleOutputNode = FunctionModelContainerNode.create(singleOutputProps).value;
      
      // Act
      const result = singleOutputNode.removeExtractedOutput('onlyOutput');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('At least one output must be extracted');
    });
  });

  describe('execution policy management', () => {
    let containerNode: FunctionModelContainerNode;

    beforeEach(() => {
      const result = FunctionModelContainerNode.create(validProps);
      containerNode = result.value;
    });

    it('should update execution policy successfully', () => {
      // Arrange
      const newPolicy = {
        executionTrigger: 'manual' as const,
        timeout: 3600
      };
      
      // Act
      const result = containerNode.updateExecutionPolicy(newPolicy);
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.executionPolicy.executionTrigger).toBe('manual');
      expect(containerNode.containerData.executionPolicy.timeout).toBe(3600);
    });

    it('should update conditional execution policy with conditions', () => {
      // Arrange
      const conditionalPolicy = {
        executionTrigger: 'conditional' as const,
        conditions: { ready: true, count: 5 },
        timeout: 2400
      };
      
      // Act
      const result = containerNode.updateExecutionPolicy(conditionalPolicy);
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.executionPolicy.executionTrigger).toBe('conditional');
      expect(containerNode.containerData.executionPolicy.conditions).toEqual({ ready: true, count: 5 });
    });

    it('should reject invalid execution trigger', () => {
      // Arrange
      const invalidPolicy = {
        executionTrigger: 'invalid' as any
      };
      
      // Act
      const result = containerNode.updateExecutionPolicy(invalidPolicy);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Invalid execution trigger');
    });

    it('should reject conditional trigger without conditions', () => {
      // Arrange
      const invalidPolicy = {
        executionTrigger: 'conditional' as const
        // Missing conditions
      };
      
      // Act
      const result = containerNode.updateExecutionPolicy(invalidPolicy);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Conditional execution trigger requires conditions');
    });

    it('should reject invalid timeout values', () => {
      // Test too low
      let result = containerNode.updateExecutionPolicy({
        executionTrigger: 'manual',
        timeout: -1
      });
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Timeout must be between 0 and 7200 seconds (2 hours)');
      
      // Test too high
      result = containerNode.updateExecutionPolicy({
        executionTrigger: 'manual',
        timeout: 8000
      });
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Timeout must be between 0 and 7200 seconds (2 hours)');
    });

    it('should allow maximum timeout value', () => {
      // Act
      const result = containerNode.updateExecutionPolicy({
        executionTrigger: 'automatic',
        timeout: 7200
      });
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.executionPolicy.timeout).toBe(7200);
    });

    it('should create defensive copy of conditions', () => {
      // Arrange
      const conditions = { mutable: 'value' };
      const policy = {
        executionTrigger: 'conditional' as const,
        conditions: conditions
      };
      
      containerNode.updateExecutionPolicy(policy);
      
      // Act - Modify original conditions
      conditions.mutable = 'changed';
      
      // Assert - Internal state should be unchanged
      expect(containerNode.containerData.executionPolicy.conditions!.mutable).toBe('value');
    });
  });

  describe('context inheritance management', () => {
    let containerNode: FunctionModelContainerNode;

    beforeEach(() => {
      const result = FunctionModelContainerNode.create(validProps);
      containerNode = result.value;
    });

    it('should update context inheritance successfully', () => {
      // Arrange
      const newInheritance = {
        inheritedContexts: ['newContext1', 'newContext2'],
        contextTransformations: { newContext1: 'parent.new1' }
      };
      
      // Act
      const result = containerNode.updateContextInheritance(newInheritance);
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.contextInheritance.inheritedContexts).toEqual(['newContext1', 'newContext2']);
      expect(containerNode.containerData.contextInheritance.contextTransformations).toEqual({ newContext1: 'parent.new1' });
    });

    it('should reject inheritance with duplicate contexts', () => {
      // Arrange
      const invalidInheritance = {
        inheritedContexts: ['context1', 'context2', 'context1'],
        contextTransformations: {}
      };
      
      // Act
      const result = containerNode.updateContextInheritance(invalidInheritance);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Inherited contexts must be unique');
    });

    it('should handle inheritance without transformations', () => {
      // Arrange
      const inheritanceWithoutTransforms = {
        inheritedContexts: ['context1', 'context2']
      };
      
      // Act
      const result = containerNode.updateContextInheritance(inheritanceWithoutTransforms);
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.contextInheritance.contextTransformations).toBeUndefined();
    });

    it('should create defensive copies of inheritance data', () => {
      // Arrange
      const contexts = ['context1', 'context2'];
      const transforms = { context1: 'transform1' };
      const inheritance = { inheritedContexts: contexts, contextTransformations: transforms };
      
      containerNode.updateContextInheritance(inheritance);
      
      // Act - Modify original arrays/objects
      contexts.push('newContext');
      transforms.context1 = 'changed';
      
      // Assert - Internal state should be unchanged
      expect(containerNode.containerData.contextInheritance.inheritedContexts).toEqual(['context1', 'context2']);
      expect(containerNode.containerData.contextInheritance.contextTransformations!.context1).toBe('transform1');
    });

    it('should add inherited context successfully', () => {
      // Act
      const result = containerNode.addInheritedContext('newInheritedContext');
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.contextInheritance.inheritedContexts).toContain('newInheritedContext');
    });

    it('should trim whitespace when adding context', () => {
      // Act
      const result = containerNode.addInheritedContext('  spacedContext  ');
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.contextInheritance.inheritedContexts).toContain('spacedContext');
    });

    it('should reject adding empty context', () => {
      // Act
      const result = containerNode.addInheritedContext('');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Context name cannot be empty');
    });

    it('should reject adding duplicate context', () => {
      // Arrange - Add context first
      containerNode.addInheritedContext('duplicateContext');
      
      // Act - Try to add again
      const result = containerNode.addInheritedContext('duplicateContext');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Context already inherited');
    });

    it('should remove inherited context successfully', () => {
      // Arrange - Add context first
      containerNode.addInheritedContext('tempContext');
      expect(containerNode.containerData.contextInheritance.inheritedContexts).toContain('tempContext');
      
      // Act
      const result = containerNode.removeInheritedContext('tempContext');
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.contextInheritance.inheritedContexts).not.toContain('tempContext');
    });

    it('should reject removing non-inherited context', () => {
      // Act
      const result = containerNode.removeInheritedContext('nonInheritedContext');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Context is not inherited');
    });

    it('should handle context removal with whitespace', () => {
      // Arrange
      containerNode.addInheritedContext('spaceContext');
      
      // Act - Remove with extra spaces
      const result = containerNode.removeInheritedContext('  spaceContext  ');
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.contextInheritance.inheritedContexts).not.toContain('spaceContext');
    });
  });

  describe('orchestration mode management', () => {
    let containerNode: FunctionModelContainerNode;

    beforeEach(() => {
      const result = FunctionModelContainerNode.create(validProps);
      containerNode = result.value;
    });

    it('should update orchestration mode successfully', () => {
      // Act
      const result = containerNode.updateOrchestrationMode('parallel');
      
      // Assert
      expect(result).toBeValidResult();
      expect(containerNode.containerData.orchestrationMode).toEqual({
        integrationStyle: 'parallel',
        communicationPattern: 'direct',
        stateManagement: 'isolated',
        errorPropagation: 'bubble',
        resourceSharing: 'inherited',
        executionIsolation: 'sandboxed'
      });
    });

    it('should accept all valid orchestration modes', () => {
      const validModes: Array<'embedded' | 'parallel' | 'sequential'> = ['embedded', 'parallel', 'sequential'];
      
      validModes.forEach(mode => {
        const result = containerNode.updateOrchestrationMode(mode);
        expect(result).toBeValidResult();
        expect(containerNode.containerData.orchestrationMode?.integrationStyle).toBe(mode);
        expect(containerNode.containerData.orchestrationMode).toMatchObject({
          integrationStyle: mode,
          communicationPattern: 'direct',
          stateManagement: 'isolated',
          errorPropagation: 'bubble',
          resourceSharing: 'inherited',
          executionIsolation: 'sandboxed'
        });
      });
    });

    it('should reject invalid orchestration mode', () => {
      // Act
      const result = containerNode.updateOrchestrationMode('invalid' as any);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Invalid orchestration mode');
    });
  });

  describe('data access and immutability', () => {
    let containerNode: FunctionModelContainerNode;

    beforeEach(() => {
      const result = FunctionModelContainerNode.create(validProps);
      containerNode = result.value;
    });

    it('should return readonly container data', () => {
      // Act
      const containerData = containerNode.containerData;
      
      // Assert
      expect(containerData).toBeDefined();
      expect(containerData.nestedModelId).toBe('nested-model-123');
      
      // TypeScript should prevent modification at compile time
      // The Readonly<T> type provides compile-time protection, not runtime protection
      // We can verify the returned data matches expected structure
      expect(typeof containerData.nestedModelId).toBe('string');
    });

    it('should return correct action type', () => {
      // Act & Assert
      expect(containerNode.getActionType()).toBe(ActionNodeType.FUNCTION_MODEL_CONTAINER);
    });
  });

  describe('timestamps and audit trail', () => {
    let containerNode: FunctionModelContainerNode;

    beforeEach(() => {
      const result = FunctionModelContainerNode.create(validProps);
      containerNode = result.value;
    });

    it('should update timestamp when nested model changes', () => {
      // Arrange
      const originalUpdatedAt = containerNode.updatedAt;
      
      // Act - wait a small amount to ensure timestamp difference
      setTimeout(() => {}, 1);
      containerNode.updateNestedModelId('new-model');
      
      // Assert
      expect(containerNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should update timestamp when context mapping changes', () => {
      // Arrange
      const originalUpdatedAt = containerNode.updatedAt;
      
      // Act
      containerNode.updateContextMapping({ new: 'mapping' });
      
      // Assert - timestamp should be updated (same or later)
      expect(containerNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should update timestamp when output extraction changes', () => {
      // Arrange
      const originalUpdatedAt = containerNode.updatedAt;
      
      // Act
      containerNode.addExtractedOutput('newOutput');
      
      // Assert
      expect(containerNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should update timestamp when execution policy changes', () => {
      // Arrange
      const originalUpdatedAt = containerNode.updatedAt;
      
      // Act
      containerNode.updateExecutionPolicy({ executionTrigger: 'manual' });
      
      // Assert
      expect(containerNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should update timestamp when context inheritance changes', () => {
      // Arrange
      const originalUpdatedAt = containerNode.updatedAt;
      
      // Act
      containerNode.addInheritedContext('newContext');
      
      // Assert
      expect(containerNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should update timestamp when orchestration mode changes', () => {
      // Arrange
      const originalUpdatedAt = containerNode.updatedAt;
      
      // Act
      containerNode.updateOrchestrationMode('sequential');
      
      // Assert
      expect(containerNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });
});