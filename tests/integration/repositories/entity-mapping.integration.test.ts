/**
 * Entity Mapping Integration Tests
 * 
 * Tests domain entity ↔ database row conversion with real database operations.
 * Validates that all domain properties are correctly preserved through 
 * serialization/deserialization cycles.
 * 
 * RED-GREEN-REFACTOR: These tests define data integrity requirements
 * and serve as regression protection for mapping logic.
 */

import { SupabaseFunctionModelRepository } from '../../../lib/infrastructure/repositories/supabase-function-model-repository';
import { FunctionModel } from '../../../lib/domain/entities/function-model';
import { ModelStatus, NodeStatus, ActionStatus } from '../../../lib/domain/enums';
import { ModelName } from '../../../lib/domain/value-objects/model-name';
import { Version } from '../../../lib/domain/value-objects/version';

import { SupabaseTestClient, requireIntegrationTestEnvironment } from '../infrastructure/supabase-test-client';
import { DatabaseTestManager, TestIsolationContext, integrationTestSetup } from '../infrastructure/database-test-utilities';
import { 
  FunctionModelTestFactory, 
  IONodeTestFactory, 
  TetherNodeTestFactory,
  TestScenarioFactory 
} from '../infrastructure/test-data-factories';

describe('Entity Mapping Integration Tests', () => {
  let repository: SupabaseFunctionModelRepository;
  let testContext: TestIsolationContext;

  beforeAll(async () => {
    try {
      requireIntegrationTestEnvironment();
      await integrationTestSetup.globalSetup();
    } catch (error) {
      console.log('Skipping integration tests:', (error as Error).message);
      return;
    }
  });

  beforeEach(async () => {
    if (!SupabaseTestClient.isIntegrationTestMode()) {
      test.skip('Not in integration test mode');
      return;
    }

    const testManager = DatabaseTestManager.getInstance();
    testContext = await integrationTestSetup.beforeEach('EntityMapping', expect.getState().currentTestName || 'unknown');
    repository = new SupabaseFunctionModelRepository(testContext.client);
  });

  afterEach(async () => {
    if (testContext) {
      await integrationTestSetup.afterEach(testContext);
    }
  });

  describe('FunctionModel Entity Mapping', () => {
    test('Should_PreserveAllProperties_WhenRoundTripSerialization', async () => {
      // Arrange: Create function model with comprehensive data
      const modelResult = FunctionModelTestFactory.create({ 
        testId: testContext.testId 
      });
      expect(modelResult.isSuccess).toBe(true);
      const originalModel = modelResult.value;

      // Set specific values to test preservation
      (originalModel as any).description = `Test description with special chars: àáâã, 中文, émojis 🚀🔥`;
      (originalModel as any).metadata = {
        customField: 'customValue',
        nestedObject: {
          deeply: {
            nested: {
              value: 42,
              array: [1, 2, 3, 'test'],
              boolean: true,
              null: null
            }
          }
        },
        unicode: '这是中文测试',
        emoji: '🧪🔬📊'
      };
      (originalModel as any).permissions = {
        read: ['user1', 'user2', 'group:admins'],
        write: ['user1', 'group:editors'],
        execute: ['user1', 'user2', 'group:admins', 'group:executors'],
        admin: ['user1']
      };
      (originalModel as any).aiAgentConfig = {
        enabled: true,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2048,
        customPrompts: {
          system: 'You are a helpful assistant',
          user: 'Process this data: {input}'
        },
        features: ['summarization', 'analysis', 'generation']
      };

      // Act: Save and retrieve model
      const saveResult = await repository.save(originalModel);
      expect(saveResult.isSuccess).toBe(true);

      const retrievedResult = await repository.findById(originalModel.modelId);
      expect(retrievedResult.isSuccess).toBe(true);
      expect(retrievedResult.value).not.toBeNull();
      
      const retrievedModel = retrievedResult.value!;

      // Assert: All properties should be preserved exactly
      expect(retrievedModel.modelId).toBe(originalModel.modelId);
      expect(retrievedModel.name.toString()).toBe(originalModel.name.toString());
      expect(retrievedModel.description).toBe(originalModel.description);
      expect(retrievedModel.version.toString()).toBe(originalModel.version.toString());
      expect(retrievedModel.status).toBe(originalModel.status);
      expect(retrievedModel.currentVersion.toString()).toBe(originalModel.currentVersion.toString());
      expect(retrievedModel.versionCount).toBe(originalModel.versionCount);
      
      // Test deep equality of complex objects
      expect(retrievedModel.metadata).toEqual(originalModel.metadata);
      expect(retrievedModel.permissions).toEqual(originalModel.permissions);
      expect(retrievedModel.aiAgentConfig).toEqual(originalModel.aiAgentConfig);
      
      // Test timestamp preservation (within reasonable tolerance)
      expect(Math.abs(
        retrievedModel.createdAt.getTime() - originalModel.createdAt.getTime()
      )).toBeLessThan(1000);
      expect(Math.abs(
        retrievedModel.updatedAt.getTime() - originalModel.updatedAt.getTime()
      )).toBeLessThan(1000);
    });

    test('Should_HandleNullAndUndefinedValues_Correctly', async () => {
      // Arrange: Create model with null/undefined values
      const modelResult = FunctionModelTestFactory.create({ 
        testId: testContext.testId 
      });
      expect(modelResult.isSuccess).toBe(true);
      const originalModel = modelResult.value;

      // Set null/undefined values explicitly
      (originalModel as any).description = undefined;
      (originalModel as any).aiAgentConfig = null;
      (originalModel as any).deletedAt = undefined;
      (originalModel as any).deletedBy = undefined;

      // Act: Save and retrieve
      const saveResult = await repository.save(originalModel);
      expect(saveResult.isSuccess).toBe(true);

      const retrievedResult = await repository.findById(originalModel.modelId);
      expect(retrievedResult.isSuccess).toBe(true);
      const retrievedModel = retrievedResult.value!;

      // Assert: Null/undefined should be handled consistently
      expect(retrievedModel.description).toBeUndefined();
      expect(retrievedModel.aiAgentConfig).toBeNull();
      expect(retrievedModel.deletedAt).toBeUndefined();
      expect(retrievedModel.deletedBy).toBeUndefined();
    });

    test('Should_PreserveValueObjectIntegrity_WhenSerialized', async () => {
      // Arrange: Create model and modify value objects
      const modelResult = FunctionModelTestFactory.create({ 
        testId: testContext.testId 
      });
      expect(modelResult.isSuccess).toBe(true);
      const originalModel = modelResult.value;

      // Test specific value object serialization
      const customNameResult = ModelName.create(`special-name-${testContext.testId}-with-dashes_and_underscores`);
      const customVersionResult = Version.create('2.1.3-beta.1');
      
      expect(customNameResult.isSuccess).toBe(true);
      expect(customVersionResult.isSuccess).toBe(true);
      
      (originalModel as any).name = customNameResult.value;
      (originalModel as any).version = customVersionResult.value;
      (originalModel as any).currentVersion = customVersionResult.value;

      // Act: Save and retrieve
      await repository.save(originalModel);
      const retrievedResult = await repository.findById(originalModel.modelId);
      const retrievedModel = retrievedResult.value!;

      // Assert: Value objects should maintain their semantics
      expect(retrievedModel.name.toString()).toBe(customNameResult.value.toString());
      expect(retrievedModel.version.toString()).toBe(customVersionResult.value.toString());
      expect(retrievedModel.currentVersion.toString()).toBe(customVersionResult.value.toString());
    });

    test('Should_HandleAllModelStatuses_Correctly', async () => {
      const statuses = [
        ModelStatus.DRAFT,
        ModelStatus.PUBLISHED,
        ModelStatus.ARCHIVED,
        ModelStatus.ERROR
      ];

      for (const status of statuses) {
        // Arrange: Create model with specific status
        const modelResult = FunctionModelTestFactory.create({ 
          testId: `${testContext.testId}-${status}` 
        });
        expect(modelResult.isSuccess).toBe(true);
        const model = modelResult.value;
        (model as any).status = status;

        // Act: Save and retrieve
        await repository.save(model);
        const retrievedResult = await repository.findById(model.modelId);
        
        // Assert: Status should be preserved exactly
        expect(retrievedResult.isSuccess).toBe(true);
        expect(retrievedResult.value!.status).toBe(status);
      }
    });
  });

  describe('Node Entity Mapping', () => {
    test('Should_PreserveNodeData_WhenComplexNodeStructure', async () => {
      // Arrange: Create complete workflow with all node types
      const scenarioResult = TestScenarioFactory.createCompleteWorkflowScenario(testContext.testId);
      expect(scenarioResult.isSuccess).toBe(true);
      const { model, inputNode, outputNode, stageNode } = scenarioResult.value;

      // Enhance nodes with complex data
      (inputNode as any).metadata = {
        nodeSpecificData: 'input-specific',
        complexObject: {
          nested: {
            values: [1, 2, 3],
            settings: {
              enabled: true,
              threshold: 0.85
            }
          }
        }
      };

      (inputNode as any).visualProperties = {
        width: 250,
        height: 150,
        color: '#10b981',
        borderRadius: 8,
        shadow: true,
        animation: {
          type: 'pulse',
          duration: 2000
        }
      };

      // Act: Save and retrieve complete model
      await repository.save(model);
      const retrievedResult = await repository.findById(model.modelId);
      
      expect(retrievedResult.isSuccess).toBe(true);
      const retrievedModel = retrievedResult.value!;

      // Assert: All nodes should be preserved
      expect(retrievedModel.nodes.size).toBe(model.nodes.size);
      
      // Find corresponding nodes and verify data preservation
      const retrievedInputNode = Array.from(retrievedModel.nodes.values()).find(
        n => n.nodeId.toString().includes('input')
      );
      expect(retrievedInputNode).toBeDefined();
      expect(retrievedInputNode!.metadata).toEqual(inputNode.metadata);
      expect(retrievedInputNode!.visualProperties).toEqual(inputNode.visualProperties);
    });

    test('Should_PreserveNodeDependencies_WhenComplexGraph', async () => {
      // Arrange: Create nodes with dependencies
      const inputNodeResult = IONodeTestFactory.create({ 
        testId: testContext.testId, 
        nodeType: 'input' 
      });
      const processingNodeResult = IONodeTestFactory.create({ 
        testId: testContext.testId, 
        nodeType: 'output' 
      });
      const outputNodeResult = IONodeTestFactory.create({ 
        testId: testContext.testId, 
        suffix: '-final' 
      });

      expect(inputNodeResult.isSuccess).toBe(true);
      expect(processingNodeResult.isSuccess).toBe(true);
      expect(outputNodeResult.isSuccess).toBe(true);

      const inputNode = inputNodeResult.value;
      const processingNode = processingNodeResult.value;
      const outputNode = outputNodeResult.value;

      // Set up dependency chain: input -> processing -> output
      (processingNode as any).dependencies = [inputNode.nodeId];
      (outputNode as any).dependencies = [processingNode.nodeId, inputNode.nodeId];

      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      model.addNode(inputNode);
      model.addNode(processingNode);
      model.addNode(outputNode);

      // Act: Save and retrieve
      await repository.save(model);
      const retrievedResult = await repository.findById(model.modelId);
      
      const retrievedModel = retrievedResult.value!;

      // Assert: Dependencies should be preserved
      const retrievedNodes = Array.from(retrievedModel.nodes.values());
      const retrievedProcessing = retrievedNodes.find(n => 
        n.nodeId.toString() === processingNode.nodeId.toString()
      );
      const retrievedOutput = retrievedNodes.find(n => 
        n.nodeId.toString() === outputNode.nodeId.toString()
      );

      expect(retrievedProcessing!.dependencies).toHaveLength(1);
      expect(retrievedProcessing!.dependencies[0].toString()).toBe(inputNode.nodeId.toString());
      
      expect(retrievedOutput!.dependencies).toHaveLength(2);
      expect(retrievedOutput!.dependencies.map(d => d.toString())).toContain(
        processingNode.nodeId.toString()
      );
      expect(retrievedOutput!.dependencies.map(d => d.toString())).toContain(
        inputNode.nodeId.toString()
      );
    });
  });

  describe('ActionNode Entity Mapping', () => {
    test('Should_PreserveActionNodeData_WhenComplexConfiguration', async () => {
      // Arrange: Create tether node with complex configuration
      const tetherNodeResult = TetherNodeTestFactory.create({ 
        testId: testContext.testId,
        parentNodeId: `parent-${testContext.testId}`
      });
      expect(tetherNodeResult.isSuccess).toBe(true);
      const tetherNode = tetherNodeResult.value;

      // Enhance with complex data
      (tetherNode as any).metadata = {
        actionType: 'api_call',
        configuration: {
          authentication: {
            type: 'bearer',
            tokenProvider: 'oauth2',
            scopes: ['read', 'write', 'admin']
          },
          retry: {
            strategy: 'exponential_backoff',
            maxDelay: 30000,
            jitter: true
          },
          caching: {
            enabled: true,
            ttl: 300,
            key: 'custom-cache-key-{input.id}'
          }
        }
      };

      (tetherNode as any).tetherData = {
        connectionType: 'rest_api',
        endpoint: 'https://api.example.com/v2/process',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FunctionModel/1.0'
        },
        queryParams: {
          version: 'v2',
          format: 'json'
        },
        bodyTemplate: {
          data: '{input.data}',
          metadata: {
            source: 'function-model',
            timestamp: '{timestamp}',
            requestId: '{uuid}'
          }
        },
        responseMapping: {
          'result.data': 'output.processedData',
          'result.metadata.id': 'output.id',
          'result.status': 'output.status'
        },
        validation: {
          input: {
            required: ['data'],
            schema: {
              type: 'object',
              properties: {
                data: { type: 'string' }
              }
            }
          },
          output: {
            schema: {
              type: 'object',
              properties: {
                processedData: { type: 'string' },
                id: { type: 'string' },
                status: { type: 'string' }
              }
            }
          }
        }
      };

      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      model.addActionNode(tetherNode);

      // Act: Save and retrieve
      await repository.save(model);
      const retrievedResult = await repository.findById(model.modelId);
      
      const retrievedModel = retrievedResult.value!;

      // Assert: All complex action node data should be preserved
      expect(retrievedModel.actionNodes.size).toBe(1);
      
      const retrievedTether = Array.from(retrievedModel.actionNodes.values())[0];
      expect(retrievedTether.actionId.toString()).toBe(tetherNode.actionId.toString());
      expect(retrievedTether.parentNodeId.toString()).toBe(tetherNode.parentNodeId.toString());
      expect(retrievedTether.name).toBe(tetherNode.name);
      expect(retrievedTether.description).toBe(tetherNode.description);
      expect(retrievedTether.executionMode).toBe(tetherNode.executionMode);
      expect(retrievedTether.executionOrder).toBe(tetherNode.executionOrder);
      expect(retrievedTether.status).toBe(tetherNode.status);
      expect(retrievedTether.priority).toBe(tetherNode.priority);
      expect(retrievedTether.estimatedDuration).toBe(tetherNode.estimatedDuration);
      
      // Deep object comparison
      expect(retrievedTether.metadata).toEqual(tetherNode.metadata);
      expect((retrievedTether as any).tetherData).toEqual((tetherNode as any).tetherData);
    });

    test('Should_PreserveRetryPolicyAndRACIData_Correctly', async () => {
      // Arrange: Create action node with specific RACI and retry policy
      const tetherNodeResult = TetherNodeTestFactory.create({ 
        testId: testContext.testId,
        parentNodeId: `parent-${testContext.testId}`
      });
      expect(tetherNodeResult.isSuccess).toBe(true);
      const tetherNode = tetherNodeResult.value;

      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      const model = modelResult.value;
      model.addActionNode(tetherNode);

      // Act: Save and retrieve
      await repository.save(model);
      const retrievedResult = await repository.findById(model.modelId);
      
      const retrievedModel = retrievedResult.value!;
      const retrievedTether = Array.from(retrievedModel.actionNodes.values())[0];

      // Assert: Value objects should be correctly reconstructed
      expect(retrievedTether.retryPolicy.maxAttempts).toBe(tetherNode.retryPolicy.maxAttempts);
      expect(retrievedTether.retryPolicy.backoffMs).toBe(tetherNode.retryPolicy.backoffMs);
      expect(retrievedTether.retryPolicy.exponential).toBe(tetherNode.retryPolicy.exponential);
      
      expect(retrievedTether.raci.responsible).toBe(tetherNode.raci.responsible);
      expect(retrievedTether.raci.accountable).toBe(tetherNode.raci.accountable);
      expect(retrievedTether.raci.consulted).toEqual(tetherNode.raci.consulted);
      expect(retrievedTether.raci.informed).toEqual(tetherNode.raci.informed);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('Should_HandleMaximumDataSizes_WithoutTruncation', async () => {
      // Arrange: Create model with maximum size data
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      // Create very large description (but within reasonable limits)
      const largeDescription = 'A'.repeat(10000) + ` - Test ID: ${testContext.testId}`;
      (model as any).description = largeDescription;

      // Create large metadata object
      const largeMetadata = {
        largeArray: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: `item-${i}`,
          testId: testContext.testId
        })),
        largeString: 'B'.repeat(5000),
        nestedLevels: {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    data: 'deep-nested-data',
                    array: Array.from({ length: 100 }, (_, i) => `nested-${i}`)
                  }
                }
              }
            }
          }
        }
      };
      (model as any).metadata = largeMetadata;

      // Act: Save and retrieve
      const saveResult = await repository.save(model);
      expect(saveResult.isSuccess).toBe(true);

      const retrievedResult = await repository.findById(model.modelId);
      expect(retrievedResult.isSuccess).toBe(true);
      
      const retrievedModel = retrievedResult.value!;

      // Assert: Large data should be preserved without truncation
      expect(retrievedModel.description).toBe(largeDescription);
      expect(retrievedModel.metadata).toEqual(largeMetadata);
    });

    test('Should_HandleSpecialCharactersAndUnicode_Correctly', async () => {
      // Arrange: Model with special characters
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      const specialDescription = `Special chars test: áàâãäåæçéèêë ñóòôõö üúùûü ýÿ ÀÁÂÃÄÅ ÇÉÈÊË ÑÓÒÔÕÖ ÜÚÙÛÜ Ý
      Chinese: 中文测试 汉字 普通话
      Japanese: ひらがな カタカナ 漢字 
      Korean: 한글 테스트
      Arabic: اللغة العربية
      Russian: Русский язык тест
      Emojis: 🚀🔥💡⚡🌟🎯📊🧪🔬💻
      Math symbols: ∑∏∆∇∂∫√∞±≤≥≠≈
      Currency: $€£¥₹₽¢
      Special: @#$%^&*()_+-={}|[]\\:";'<>?,./
      Test ID: ${testContext.testId}`;

      (model as any).description = specialDescription;

      // Act: Save and retrieve
      await repository.save(model);
      const retrievedResult = await repository.findById(model.modelId);
      
      // Assert: All special characters should be preserved
      expect(retrievedResult.value!.description).toBe(specialDescription);
    });

    test('Should_MaintainDataConsistency_WhenPartialUpdates', async () => {
      // Arrange: Create model with complete data
      const scenarioResult = TestScenarioFactory.createCompleteWorkflowScenario(testContext.testId);
      expect(scenarioResult.isSuccess).toBe(true);
      const { model } = scenarioResult.value;

      // Save initial version
      await repository.save(model);

      // Modify only some properties
      const originalDescription = model.description;
      const originalMetadata = { ...model.metadata };
      
      (model as any).description = `Updated - ${testContext.testId}`;
      (model as any).metadata = { 
        ...originalMetadata, 
        updated: true, 
        timestamp: Date.now() 
      };

      // Act: Update model
      await repository.save(model);
      const retrievedResult = await repository.findById(model.modelId);
      
      const retrievedModel = retrievedResult.value!;

      // Assert: Updated fields should change, others should remain
      expect(retrievedModel.description).toBe(`Updated - ${testContext.testId}`);
      expect(retrievedModel.description).not.toBe(originalDescription);
      expect(retrievedModel.metadata.updated).toBe(true);
      expect(retrievedModel.metadata.testData).toBe(originalMetadata.testData); // Should remain
      
      // Complex relationships should be preserved
      expect(retrievedModel.nodes.size).toBe(model.nodes.size);
      expect(retrievedModel.actionNodes.size).toBe(model.actionNodes.size);
    });
  });
});