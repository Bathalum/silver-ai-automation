/**
 * Unit tests for TetherNode entity
 * Tests tether-specific business logic, data validation, and integration configuration
 */

import { TetherNode, TetherNodeData } from '@/lib/domain/entities/tether-node';
import { ActionNodeType, ActionStatus, ExecutionMode } from '@/lib/domain/enums';
import { NodeId, RetryPolicy, RACI } from '@/lib/domain/value-objects';
import { DateTestHelpers } from '../../../../utils/test-helpers';

describe('TetherNode', () => {
  let validTetherData: TetherNodeData;
  let validProps: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    validTetherData = {
      tetherReferenceId: 'tether-ref-123',
      executionParameters: { param1: 'value1', param2: 42 },
      outputMapping: { output1: 'result.data', output2: 'result.status' },
      executionTriggers: ['onDataReceived', 'onSchedule'],
      resourceRequirements: {
        cpu: 2,
        memory: 1024,
        timeout: 300
      },
      integrationConfig: {
        apiEndpoints: { primary: 'https://api.example.com/v1' },
        authentication: { type: 'bearer', token: 'secret' },
        headers: { 'Content-Type': 'application/json' }
      }
    };

    const nodeId = NodeId.create('test-tether-node-id');
    const parentNodeId = NodeId.create('test-parent-node-id');
    const retryPolicy = RetryPolicy.createDefault();
    const raci = RACI.create();

    validProps = {
      actionId: nodeId.value,
      parentNodeId: parentNodeId.value,
      modelId: 'test-model-id',
      name: 'Test Tether Node',
      description: 'A test tether node for automation',
      executionMode: ExecutionMode.SEQUENTIAL,
      executionOrder: 1,
      status: ActionStatus.CONFIGURED,
      priority: 5,
      estimatedDuration: 30,
      retryPolicy: retryPolicy.value,
      raci: raci.value,
      metadata: { testFlag: true },
      tetherData: validTetherData
    };
  });

  describe('creation and initialization', () => {
    it('should create tether node with valid properties', () => {
      // Act
      const result = TetherNode.create(validProps);
      
      // Assert
      expect(result).toBeValidResult();
      const tetherNode = result.value;
      
      expect(tetherNode.actionId.toString()).toBe('test-tether-node-id');
      expect(tetherNode.name).toBe('Test Tether Node');
      expect(tetherNode.getActionType()).toBe(ActionNodeType.TETHER_NODE);
      expect(tetherNode.tetherData.tetherReferenceId).toBe('tether-ref-123');
      expect(tetherNode.createdAt).toBeInstanceOf(Date);
      expect(tetherNode.updatedAt).toBeInstanceOf(Date);
    });

    it('should reject creation with missing tether reference ID', () => {
      // Arrange
      validProps.tetherData.tetherReferenceId = '';
      
      // Act
      const result = TetherNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Tether reference ID is required');
    });

    it('should reject creation with invalid CPU requirement', () => {
      // Arrange
      validProps.tetherData.resourceRequirements.cpu = 20; // > 16
      
      // Act
      const result = TetherNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('CPU requirement must be between 0 and 16');
    });

    it('should reject creation with invalid memory requirement', () => {
      // Arrange
      validProps.tetherData.resourceRequirements.memory = 40000; // > 32768
      
      // Act
      const result = TetherNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Memory requirement must be between 0 and 32768 MB');
    });

    it('should reject creation with invalid timeout', () => {
      // Arrange
      validProps.tetherData.resourceRequirements.timeout = 4000; // > 3600
      
      // Act
      const result = TetherNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Timeout must be between 0 and 3600 seconds');
    });

    it('should create node with minimal resource requirements', () => {
      // Arrange
      validProps.tetherData.resourceRequirements = {
        cpu: 0.5,
        memory: 128,
        timeout: 60
      };
      
      // Act
      const result = TetherNode.create(validProps);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.tetherData.resourceRequirements.cpu).toBe(0.5);
      expect(result.value.tetherData.resourceRequirements.memory).toBe(128);
      expect(result.value.tetherData.resourceRequirements.timeout).toBe(60);
    });
  });

  describe('tether reference management', () => {
    let tetherNode: TetherNode;

    beforeEach(() => {
      const result = TetherNode.create(validProps);
      tetherNode = result.value;
    });

    it('should update tether reference ID successfully', () => {
      // Act
      const result = tetherNode.updateTetherReferenceId('new-tether-ref-456');
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.tetherReferenceId).toBe('new-tether-ref-456');
    });

    it('should trim whitespace from tether reference ID', () => {
      // Act
      const result = tetherNode.updateTetherReferenceId('  spaced-ref-id  ');
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.tetherReferenceId).toBe('spaced-ref-id');
    });

    it('should reject empty tether reference ID', () => {
      // Act
      const result = tetherNode.updateTetherReferenceId('');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Tether reference ID cannot be empty');
    });

    it('should reject whitespace-only tether reference ID', () => {
      // Act
      const result = tetherNode.updateTetherReferenceId('   ');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Tether reference ID cannot be empty');
    });

    it('should update timestamp when reference ID changes', () => {
      // Arrange
      const originalUpdatedAt = tetherNode.updatedAt;
      const dateNowSpy = DateTestHelpers.mockDateNow(Date.now() + 1000);
      
      // Act
      tetherNode.updateTetherReferenceId('new-ref');
      
      // Assert
      expect(tetherNode.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      
      // Cleanup
      DateTestHelpers.restoreDateNow(dateNowSpy);
    });
  });

  describe('execution parameters management', () => {
    let tetherNode: TetherNode;

    beforeEach(() => {
      const result = TetherNode.create(validProps);
      tetherNode = result.value;
    });

    it('should update execution parameters successfully', () => {
      // Arrange
      const newParameters = { newParam: 'newValue', numberParam: 123 };
      
      // Act
      const result = tetherNode.updateExecutionParameters(newParameters);
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.executionParameters).toEqual(newParameters);
    });

    it('should replace all execution parameters', () => {
      // Arrange
      const originalParams = tetherNode.tetherData.executionParameters;
      const newParameters = { completelyNew: 'value' };
      
      // Act
      tetherNode.updateExecutionParameters(newParameters);
      
      // Assert
      expect(tetherNode.tetherData.executionParameters).toEqual(newParameters);
      expect(tetherNode.tetherData.executionParameters).not.toEqual(originalParams);
    });

    it('should handle empty parameters object', () => {
      // Act
      const result = tetherNode.updateExecutionParameters({});
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.executionParameters).toEqual({});
    });

    it('should create defensive copy of parameters', () => {
      // Arrange
      const params = { mutable: 'value' };
      tetherNode.updateExecutionParameters(params);
      
      // Act - Modify original object
      params.mutable = 'changed';
      
      // Assert - Internal state should be unchanged
      expect(tetherNode.tetherData.executionParameters.mutable).toBe('value');
    });
  });

  describe('output mapping management', () => {
    let tetherNode: TetherNode;

    beforeEach(() => {
      const result = TetherNode.create(validProps);
      tetherNode = result.value;
    });

    it('should update output mapping successfully', () => {
      // Arrange
      const newMapping = { result: 'data.result', status: 'meta.status' };
      
      // Act
      const result = tetherNode.updateOutputMapping(newMapping);
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.outputMapping).toEqual(newMapping);
    });

    it('should replace all output mappings', () => {
      // Arrange
      const newMapping = { singleOutput: 'data' };
      
      // Act
      tetherNode.updateOutputMapping(newMapping);
      
      // Assert
      expect(tetherNode.tetherData.outputMapping).toEqual(newMapping);
      expect(Object.keys(tetherNode.tetherData.outputMapping)).toHaveLength(1);
    });

    it('should handle empty mapping object', () => {
      // Act
      const result = tetherNode.updateOutputMapping({});
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.outputMapping).toEqual({});
    });

    it('should create defensive copy of mapping', () => {
      // Arrange
      const mapping = { output: 'path' };
      tetherNode.updateOutputMapping(mapping);
      
      // Act - Modify original object
      mapping.output = 'changed';
      
      // Assert - Internal state should be unchanged
      expect(tetherNode.tetherData.outputMapping.output).toBe('path');
    });
  });

  describe('execution triggers management', () => {
    let tetherNode: TetherNode;

    beforeEach(() => {
      const result = TetherNode.create(validProps);
      tetherNode = result.value;
    });

    it('should add execution trigger successfully', () => {
      // Act
      const result = tetherNode.addExecutionTrigger('onError');
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.executionTriggers).toContain('onError');
    });

    it('should trim whitespace from trigger', () => {
      // Act
      const result = tetherNode.addExecutionTrigger('  onTimeout  ');
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.executionTriggers).toContain('onTimeout');
    });

    it('should reject empty trigger', () => {
      // Act
      const result = tetherNode.addExecutionTrigger('');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Execution trigger cannot be empty');
    });

    it('should reject whitespace-only trigger', () => {
      // Act
      const result = tetherNode.addExecutionTrigger('   ');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Execution trigger cannot be empty');
    });

    it('should reject duplicate triggers', () => {
      // Arrange - Add initial trigger
      tetherNode.addExecutionTrigger('duplicateTrigger');
      
      // Act - Try to add same trigger
      const result = tetherNode.addExecutionTrigger('duplicateTrigger');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Execution trigger already exists');
    });

    it('should remove execution trigger successfully', () => {
      // Arrange - Add trigger first
      tetherNode.addExecutionTrigger('tempTrigger');
      expect(tetherNode.tetherData.executionTriggers).toContain('tempTrigger');
      
      // Act
      const result = tetherNode.removeExecutionTrigger('tempTrigger');
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.executionTriggers).not.toContain('tempTrigger');
    });

    it('should reject removing non-existent trigger', () => {
      // Act
      const result = tetherNode.removeExecutionTrigger('nonExistentTrigger');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Execution trigger does not exist');
    });

    it('should handle trigger removal with whitespace', () => {
      // Arrange
      tetherNode.addExecutionTrigger('spaceTrigger');
      
      // Act - Remove with extra spaces
      const result = tetherNode.removeExecutionTrigger('  spaceTrigger  ');
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.executionTriggers).not.toContain('spaceTrigger');
    });
  });

  describe('resource requirements management', () => {
    let tetherNode: TetherNode;

    beforeEach(() => {
      const result = TetherNode.create(validProps);
      tetherNode = result.value;
    });

    it('should update CPU requirement successfully', () => {
      // Act
      const result = tetherNode.updateResourceRequirements({ cpu: 4 });
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.resourceRequirements.cpu).toBe(4);
    });

    it('should update memory requirement successfully', () => {
      // Act
      const result = tetherNode.updateResourceRequirements({ memory: 2048 });
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.resourceRequirements.memory).toBe(2048);
    });

    it('should update timeout successfully', () => {
      // Act
      const result = tetherNode.updateResourceRequirements({ timeout: 600 });
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.resourceRequirements.timeout).toBe(600);
    });

    it('should update multiple requirements at once', () => {
      // Act
      const result = tetherNode.updateResourceRequirements({
        cpu: 8,
        memory: 4096,
        timeout: 1800
      });
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.resourceRequirements).toEqual({
        cpu: 8,
        memory: 4096,
        timeout: 1800
      });
    });

    it('should reject invalid CPU requirement (too high)', () => {
      // Act
      const result = tetherNode.updateResourceRequirements({ cpu: 20 });
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('CPU requirement must be between 0 and 16');
    });

    it('should reject invalid CPU requirement (too low)', () => {
      // Act
      const result = tetherNode.updateResourceRequirements({ cpu: -1 });
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('CPU requirement must be between 0 and 16');
    });

    it('should reject invalid memory requirement (too high)', () => {
      // Act
      const result = tetherNode.updateResourceRequirements({ memory: 40000 });
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Memory requirement must be between 0 and 32768 MB');
    });

    it('should reject invalid memory requirement (too low)', () => {
      // Act
      const result = tetherNode.updateResourceRequirements({ memory: -100 });
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Memory requirement must be between 0 and 32768 MB');
    });

    it('should reject invalid timeout (too high)', () => {
      // Act
      const result = tetherNode.updateResourceRequirements({ timeout: 4000 });
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Timeout must be between 0 and 3600 seconds');
    });

    it('should reject invalid timeout (too low)', () => {
      // Act
      const result = tetherNode.updateResourceRequirements({ timeout: -60 });
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Timeout must be between 0 and 3600 seconds');
    });

    it('should allow partial updates without affecting other values', () => {
      // Arrange
      const original = { ...tetherNode.tetherData.resourceRequirements };
      
      // Act
      tetherNode.updateResourceRequirements({ cpu: 1 });
      
      // Assert
      expect(tetherNode.tetherData.resourceRequirements.cpu).toBe(1);
      expect(tetherNode.tetherData.resourceRequirements.memory).toBe(original.memory);
      expect(tetherNode.tetherData.resourceRequirements.timeout).toBe(original.timeout);
    });
  });

  describe('integration configuration management', () => {
    let tetherNode: TetherNode;

    beforeEach(() => {
      const result = TetherNode.create(validProps);
      tetherNode = result.value;
    });

    it('should update API endpoints successfully', () => {
      // Arrange
      const newEndpoints = { 
        primary: 'https://new.api.com/v2',
        fallback: 'https://backup.api.com/v1' 
      };
      
      // Act
      const result = tetherNode.updateIntegrationConfig({ apiEndpoints: newEndpoints });
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.integrationConfig.apiEndpoints).toEqual(newEndpoints);
    });

    it('should update authentication config successfully', () => {
      // Arrange
      const newAuth = { type: 'oauth', clientId: 'client123', secret: 'secret456' };
      
      // Act
      const result = tetherNode.updateIntegrationConfig({ authentication: newAuth });
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.integrationConfig.authentication).toEqual(newAuth);
    });

    it('should update headers successfully', () => {
      // Arrange
      const newHeaders = { 
        'Authorization': 'Bearer token123',
        'X-Custom-Header': 'value' 
      };
      
      // Act
      const result = tetherNode.updateIntegrationConfig({ headers: newHeaders });
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.integrationConfig.headers).toEqual(newHeaders);
    });

    it('should update multiple config sections at once', () => {
      // Arrange
      const config = {
        apiEndpoints: { main: 'https://main.api.com' },
        authentication: { type: 'api-key', key: 'key123' },
        headers: { 'Content-Type': 'application/xml' }
      };
      
      // Act
      const result = tetherNode.updateIntegrationConfig(config);
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.integrationConfig.apiEndpoints).toEqual(config.apiEndpoints);
      expect(tetherNode.tetherData.integrationConfig.authentication).toEqual(config.authentication);
      expect(tetherNode.tetherData.integrationConfig.headers).toEqual(config.headers);
    });

    it('should handle undefined config sections', () => {
      // Act
      const result = tetherNode.updateIntegrationConfig({
        apiEndpoints: undefined,
        authentication: undefined,
        headers: undefined
      });
      
      // Assert
      expect(result).toBeValidResult();
      expect(tetherNode.tetherData.integrationConfig.apiEndpoints).toBeUndefined();
      expect(tetherNode.tetherData.integrationConfig.authentication).toBeUndefined();
      expect(tetherNode.tetherData.integrationConfig.headers).toBeUndefined();
    });

    it('should create defensive copies of config objects', () => {
      // Arrange
      const endpoints = { api: 'https://api.com' };
      const auth = { token: 'secret' };
      const headers = { header: 'value' };
      
      tetherNode.updateIntegrationConfig({
        apiEndpoints: endpoints,
        authentication: auth,
        headers: headers
      });
      
      // Act - Modify original objects
      endpoints.api = 'changed';
      auth.token = 'changed';
      headers.header = 'changed';
      
      // Assert - Internal state should be unchanged
      expect(tetherNode.tetherData.integrationConfig.apiEndpoints!.api).toBe('https://api.com');
      expect(tetherNode.tetherData.integrationConfig.authentication!.token).toBe('secret');
      expect(tetherNode.tetherData.integrationConfig.headers!.header).toBe('value');
    });
  });

  describe('data access and immutability', () => {
    let tetherNode: TetherNode;

    beforeEach(() => {
      const result = TetherNode.create(validProps);
      tetherNode = result.value;
    });

    it('should return readonly tether data', () => {
      // Act
      const tetherData = tetherNode.tetherData;
      
      // Assert
      expect(tetherData).toBeDefined();
      expect(tetherData.tetherReferenceId).toBe('tether-ref-123');
      
      // TypeScript should prevent modification, but we can test runtime behavior
      expect(() => {
        (tetherData as any).tetherReferenceId = 'should-not-work';
      }).toThrow();
    });

    it('should return correct action type', () => {
      // Act & Assert
      expect(tetherNode.getActionType()).toBe(ActionNodeType.TETHER_NODE);
    });
  });

  describe('timestamps and audit trail', () => {
    let tetherNode: TetherNode;

    beforeEach(() => {
      const result = TetherNode.create(validProps);
      tetherNode = result.value;
    });

    it('should update timestamp when tether data changes', () => {
      // Arrange
      const originalUpdatedAt = tetherNode.updatedAt;
      const dateNowSpy = DateTestHelpers.mockDateNow(Date.now() + 1000);
      
      // Act
      tetherNode.updateExecutionParameters({ new: 'param' });
      
      // Assert
      expect(tetherNode.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      
      // Cleanup
      DateTestHelpers.restoreDateNow(dateNowSpy);
    });

    it('should update timestamp when triggers change', () => {
      // Arrange
      const originalUpdatedAt = tetherNode.updatedAt;
      const dateNowSpy = DateTestHelpers.mockDateNow(Date.now() + 1000);
      
      // Act
      tetherNode.addExecutionTrigger('newTrigger');
      
      // Assert
      expect(tetherNode.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      
      // Cleanup
      DateTestHelpers.restoreDateNow(dateNowSpy);
    });

    it('should update timestamp when resource requirements change', () => {
      // Arrange
      const originalUpdatedAt = tetherNode.updatedAt;
      const dateNowSpy = DateTestHelpers.mockDateNow(Date.now() + 1000);
      
      // Act
      tetherNode.updateResourceRequirements({ cpu: 4 });
      
      // Assert
      expect(tetherNode.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      
      // Cleanup
      DateTestHelpers.restoreDateNow(dateNowSpy);
    });

    it('should update timestamp when integration config changes', () => {
      // Arrange
      const originalUpdatedAt = tetherNode.updatedAt;
      const dateNowSpy = DateTestHelpers.mockDateNow(Date.now() + 1000);
      
      // Act
      tetherNode.updateIntegrationConfig({ headers: { 'New-Header': 'value' } });
      
      // Assert
      expect(tetherNode.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      
      // Cleanup
      DateTestHelpers.restoreDateNow(dateNowSpy);
    });
  });
});