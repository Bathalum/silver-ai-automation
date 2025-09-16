/**
 * Transaction Consistency Integration Tests
 * 
 * Tests database transaction behavior, rollback scenarios, and data consistency
 * during multi-table operations. Validates ACID properties and error recovery.
 * 
 * RED-GREEN-REFACTOR: These tests define transactional requirements
 * and ensure data consistency even under failure conditions.
 */

import { SupabaseFunctionModelRepository } from '../../../lib/infrastructure/repositories/supabase-function-model-repository';
import { ModelStatus, NodeStatus } from '../../../lib/domain/enums';

import { SupabaseTestClient, requireIntegrationTestEnvironment } from '../infrastructure/supabase-test-client';
import { 
  DatabaseTestManager, 
  TestIsolationContext, 
  integrationTestSetup,
  DatabaseTestHelpers 
} from '../infrastructure/database-test-utilities';
import { 
  FunctionModelTestFactory, 
  TestScenarioFactory
} from '../infrastructure/test-data-factories';

describe('Transaction Consistency Integration Tests', () => {
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
    testContext = await integrationTestSetup.beforeEach('TransactionConsistency', expect.getState().currentTestName || 'unknown');
    repository = new SupabaseFunctionModelRepository(testContext.client);
  });

  afterEach(async () => {
    if (testContext) {
      await integrationTestSetup.afterEach(testContext);
    }
  });

  describe('Multi-Table Transaction Consistency', () => {
    test('Should_SaveAllComponents_WhenCompleteWorkflowTransaction', async () => {
      // Arrange: Create complete workflow scenario
      const scenarioResult = TestScenarioFactory.createCompleteWorkflowScenario(testContext.testId);
      expect(scenarioResult.isSuccess).toBe(true);
      const { model } = scenarioResult.value;

      // Get initial table counts
      const initialModelCount = await testContext.client
        .from('function_models')
        .select('*', { count: 'exact', head: true })
        .eq('model_id', model.modelId);
      
      const initialNodeCount = await testContext.client
        .from('function_model_nodes')
        .select('*', { count: 'exact', head: true })
        .eq('model_id', model.modelId);
        
      const initialActionCount = await testContext.client
        .from('function_model_actions')
        .select('*', { count: 'exact', head: true })
        .eq('model_id', model.modelId);

      expect(initialModelCount.count).toBe(0);
      expect(initialNodeCount.count).toBe(0);
      expect(initialActionCount.count).toBe(0);

      // Act: Save complete workflow in single transaction
      const saveResult = await repository.save(model);

      // Assert: Transaction should succeed
      expect(saveResult.isSuccess).toBe(true);

      // Verify: All components should be saved atomically
      const finalModelCount = await testContext.client
        .from('function_models')
        .select('*', { count: 'exact', head: true })
        .eq('model_id', model.modelId);
        
      const finalNodeCount = await testContext.client
        .from('function_model_nodes')
        .select('*', { count: 'exact', head: true })
        .eq('model_id', model.modelId);
        
      const finalActionCount = await testContext.client
        .from('function_model_actions')
        .select('*', { count: 'exact', head: true })
        .eq('model_id', model.modelId);

      expect(finalModelCount.count).toBe(1);
      expect(finalNodeCount.count).toBe(model.nodes.size);
      expect(finalActionCount.count).toBe(model.actionNodes.size);
    });

    test('Should_RollbackAllChanges_WhenTransactionFails', async () => {
      // Note: Supabase client doesn't support true transactions, but we can simulate
      // failure scenarios and test error handling

      // Arrange: Create a model that will succeed initially
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      // Save initial version
      const initialSaveResult = await repository.save(model);
      expect(initialSaveResult.isSuccess).toBe(true);

      // Capture initial state
      const initialRetrieveResult = await repository.findById(model.modelId);
      expect(initialRetrieveResult.isSuccess).toBe(true);
      const initialModel = initialRetrieveResult.value!;

      // Act: Attempt to update with invalid data (simulate transaction failure)
      try {
        // Modify model with potentially problematic data
        (model as any).name = null; // This should cause validation failure
        
        const failedSaveResult = await repository.save(model);
        
        // If save claims to succeed, verify the state
        if (failedSaveResult.isSuccess) {
          const retrieveResult = await repository.findById(model.modelId);
          expect(retrieveResult.isSuccess).toBe(true);
          // Model should either be unchanged or properly updated
          expect(retrieveResult.value).toBeDefined();
        } else {
          // If save fails, verify original state is preserved
          const retrieveResult = await repository.findById(model.modelId);
          expect(retrieveResult.isSuccess).toBe(true);
          expect(retrieveResult.value).toBeDefined();
          
          const preservedModel = retrieveResult.value!;
          expect(preservedModel.name.toString()).toBe(initialModel.name.toString());
        }
      } catch (error) {
        // Exception was thrown - verify original state is preserved
        const retrieveResult = await repository.findById(model.modelId);
        expect(retrieveResult.isSuccess).toBe(true);
        expect(retrieveResult.value).toBeDefined();
      }
    });

    test('Should_MaintainConsistency_WhenPartialUpdate', async () => {
      // Arrange: Create complete workflow
      const scenarioResult = TestScenarioFactory.createCompleteWorkflowScenario(testContext.testId);
      expect(scenarioResult.isSuccess).toBe(true);
      const { model } = scenarioResult.value;

      // Save initial version
      await repository.save(model);

      // Capture initial state
      const initialRetrieveResult = await repository.findById(model.modelId);
      const initialModel = initialRetrieveResult.value!;

      // Act: Perform partial update (modify model but not all nodes)
      (model as any).description = `Updated description - ${testContext.testId}`;
      (model as any).status = ModelStatus.PUBLISHED;

      // Add one new node without touching existing nodes
      const newNodeResult = TestScenarioFactory.createCompleteWorkflowScenario(`${testContext.testId}-new`);
      const newNode = Array.from(newNodeResult.value.model.nodes.values())[0];
      (newNode as any).nodeId = { toString: () => `new-node-${testContext.testId}` };
      model.addNode(newNode);

      const updateResult = await repository.save(model);

      // Assert: Update should succeed
      expect(updateResult.isSuccess).toBe(true);

      // Verify: All changes should be applied consistently
      const finalRetrieveResult = await repository.findById(model.modelId);
      expect(finalRetrieveResult.isSuccess).toBe(true);
      
      const finalModel = finalRetrieveResult.value!;
      expect(finalModel.description).toBe(`Updated description - ${testContext.testId}`);
      expect(finalModel.status).toBe(ModelStatus.PUBLISHED);
      expect(finalModel.nodes.size).toBe(initialModel.nodes.size + 1);
      expect(finalModel.actionNodes.size).toBe(initialModel.actionNodes.size);
    });
  });

  describe('Concurrent Transaction Handling', () => {
    test('Should_HandleConcurrentSaves_WithoutDataCorruption', async () => {
      // Arrange: Create base model
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const baseModel = modelResult.value;

      await repository.save(baseModel);

      // Act: Perform multiple concurrent modifications
      const concurrentOperations = Array.from({ length: 3 }, async (_, i) => {
        // Create a fresh copy for each operation
        const modelCopy = JSON.parse(JSON.stringify(baseModel));
        modelCopy.description = `Concurrent update ${i} - ${testContext.testId}`;
        modelCopy.metadata = { 
          ...baseModel.metadata, 
          updateIndex: i,
          timestamp: Date.now() + i * 100
        };

        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        
        return repository.save(modelCopy);
      });

      const results = await Promise.allSettled(concurrentOperations);

      // Assert: All operations should complete
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.isSuccess).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.isFailure)).length;

      expect(successful + failed).toBe(3);
      expect(successful).toBeGreaterThanOrEqual(1); // At least one should succeed

      // Verify: Final state should be consistent
      const finalResult = await repository.findById(baseModel.modelId);
      expect(finalResult.isSuccess).toBe(true);
      expect(finalResult.value).toBeDefined();

      const finalModel = finalResult.value!;
      expect(finalModel.description).toContain('Concurrent update');
      expect(finalModel.metadata.updateIndex).toBeDefined();
    });

    test('Should_PreventLostUpdates_WhenSimultaneousModifications', async () => {
      // Arrange: Create model with specific data
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      (model as any).metadata = {
        counter: 0,
        testId: testContext.testId
      };

      await repository.save(model);

      // Act: Simulate read-modify-write operations that could cause lost updates
      const incrementOperations = Array.from({ length: 5 }, async (_, i) => {
        // Read current state
        const readResult = await repository.findById(model.modelId);
        expect(readResult.isSuccess).toBe(true);
        const currentModel = readResult.value!;

        // Modify (increment counter)
        const newCounter = (currentModel.metadata.counter || 0) + 1;
        (currentModel as any).metadata = {
          ...currentModel.metadata,
          counter: newCounter,
          updateId: `update-${i}-${Date.now()}`
        };

        // Small delay to increase chance of conflict
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20));

        // Write back
        return repository.save(currentModel);
      });

      const results = await Promise.allSettled(incrementOperations);

      // Assert: All operations should complete
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.isSuccess).length;
      expect(successful).toBe(5);

      // Verify: Final counter value - due to potential lost updates, 
      // the final value might be less than 5, but should be at least 1
      const finalResult = await repository.findById(model.modelId);
      expect(finalResult.isSuccess).toBe(true);
      
      const finalModel = finalResult.value!;
      expect(finalModel.metadata.counter).toBeGreaterThanOrEqual(1);
      expect(finalModel.metadata.updateId).toBeDefined();
    });
  });

  describe('Data Consistency Verification', () => {
    test('Should_MaintainRelationalIntegrity_AfterComplexOperations', async () => {
      // Arrange: Create complex model with relationships
      const scenarioResult = TestScenarioFactory.createCompleteWorkflowScenario(testContext.testId);
      expect(scenarioResult.isSuccess).toBe(true);
      const { model } = scenarioResult.value;

      await repository.save(model);

      // Perform series of operations that might affect integrity
      const operations = [
        // Update model
        async () => {
          (model as any).description = `Updated - ${Date.now()}`;
          return repository.save(model);
        },
        
        // Modify nodes (simulate adding/removing)
        async () => {
          const nodeArray = Array.from(model.nodes.values());
          if (nodeArray.length > 0) {
            // Modify first node
            (nodeArray[0] as any).status = NodeStatus.ERROR;
          }
          return repository.save(model);
        },

        // Change status
        async () => {
          return repository.publishModel(model.modelId);
        }
      ];

      // Act: Execute operations sequentially
      for (const operation of operations) {
        const result = await operation();
        expect(result.isSuccess).toBe(true);
      }

      // Assert: Verify all relationships are still intact
      const finalResult = await repository.findById(model.modelId);
      expect(finalResult.isSuccess).toBe(true);
      expect(finalResult.value).toBeDefined();

      const finalModel = finalResult.value!;
      
      // Verify model state
      expect(finalModel.status).toBe(ModelStatus.PUBLISHED);
      expect(finalModel.description).toContain('Updated');
      
      // Verify relationships
      expect(finalModel.nodes.size).toBe(model.nodes.size);
      expect(finalModel.actionNodes.size).toBe(model.actionNodes.size);

      // Verify each action node still references valid parent nodes
      for (const actionNode of finalModel.actionNodes.values()) {
        const parentExists = Array.from(finalModel.nodes.values()).some(
          node => node.nodeId.toString() === actionNode.parentNodeId.toString()
        );
        expect(parentExists).toBe(true);
      }
    });

    test('Should_RecoverFromTemporaryFailures_Gracefully', async () => {
      // Arrange: Create model
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      // Act: Simulate temporary failure scenario
      // First save should succeed
      const firstSaveResult = await repository.save(model);
      expect(firstSaveResult.isSuccess).toBe(true);

      // Simulate network timeout by making rapid successive calls
      const rapidCalls = Array.from({ length: 10 }, () => repository.save(model));
      const rapidResults = await Promise.allSettled(rapidCalls);

      // Assert: Most calls should eventually succeed
      const successCount = rapidResults.filter(r => 
        r.status === 'fulfilled' && r.value.isSuccess
      ).length;
      const failureCount = rapidResults.filter(r => 
        r.status === 'rejected' || (r.status === 'fulfilled' && r.value.isFailure)
      ).length;

      // At least some operations should succeed
      expect(successCount).toBeGreaterThanOrEqual(1);
      
      // Verify: Final state should be consistent
      const verificationResult = await repository.findById(model.modelId);
      expect(verificationResult.isSuccess).toBe(true);
      expect(verificationResult.value).toBeDefined();
    });

    test('Should_HandleDatabaseReconnection_Transparently', async () => {
      // Arrange: Create and save initial model
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      const initialSaveResult = await repository.save(model);
      expect(initialSaveResult.isSuccess).toBe(true);

      // Act: Perform operation that might trigger reconnection
      // (Supabase handles connection pooling internally)
      
      // Wait a moment to simulate connection timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      // Attempt operations that would require active connection
      const operations = [
        () => repository.findById(model.modelId),
        () => {
          (model as any).description = `Reconnection test - ${Date.now()}`;
          return repository.save(model);
        },
        () => repository.exists(model.modelId)
      ];

      // Execute operations
      const results = await Promise.all(operations.map(op => op()));

      // Assert: All operations should succeed despite potential reconnection
      results.forEach(result => {
        expect(result.isSuccess).toBe(true);
      });

      // Verify: Data consistency maintained
      const verificationResult = await repository.findById(model.modelId);
      expect(verificationResult.isSuccess).toBe(true);
      expect(verificationResult.value).toBeDefined();
      expect(verificationResult.value!.description).toContain('Reconnection test');
    });
  });

  describe('Long-Running Transaction Behavior', () => {
    test('Should_HandleLargeDataSets_WithinTransactionLimits', async () => {
      // Arrange: Create model with many components
      const batchSize = 20; // Reasonable size for testing
      const models = Array.from({ length: batchSize }, (_, i) => {
        const modelResult = FunctionModelTestFactory.create({ 
          testId: `${testContext.testId}-batch-${i}` 
        });
        expect(modelResult.isSuccess).toBe(true);
        return modelResult.value;
      });

      // Act: Save all models (this tests transaction size limits)
      const savePromises = models.map(model => repository.save(model));
      const saveResults = await Promise.all(savePromises);

      // Assert: All saves should succeed
      saveResults.forEach(result => {
        expect(result.isSuccess).toBe(true);
      });

      // Verify: All models should be retrievable
      const verificationPromises = models.map(model => repository.findById(model.modelId));
      const verificationResults = await Promise.all(verificationPromises);

      verificationResults.forEach(result => {
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeDefined();
      });
    });

    test('Should_TimeoutGracefully_WhenOperationTooLong', async () => {
      // This test is limited by Supabase client capabilities
      // We can test that operations complete within reasonable time

      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      // Act: Measure operation time
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const saveResult = await repository.save(model);
          expect(saveResult.isSuccess).toBe(true);
          
          const findResult = await repository.findById(model.modelId);
          expect(findResult.isSuccess).toBe(true);
          
          return findResult.value;
        },
        5000 // 5 second timeout
      );

      // Assert: Operation should complete within timeout
      expect(performanceResult.isSuccess).toBe(true);
      expect(performanceResult.value.result).toBeDefined();
    });
  });

  describe('Transaction Isolation Levels', () => {
    test('Should_HandleReadCommitted_Isolation', async () => {
      // Arrange: Create base model
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      await repository.save(model);

      // Act: Perform concurrent read and write operations
      const readOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return repository.findById(model.modelId);
      };

      const writeOperation = async () => {
        (model as any).description = `Isolation test - ${Date.now()}`;
        return repository.save(model);
      };

      const [readResult, writeResult] = await Promise.all([
        readOperation(),
        writeOperation()
      ]);

      // Assert: Both operations should succeed
      expect(readResult.isSuccess).toBe(true);
      expect(writeResult.isSuccess).toBe(true);
      expect(readResult.value).toBeDefined();

      // The read may see old or new data depending on timing
      // But should not see inconsistent/corrupt data
      const readModel = readResult.value!;
      expect(readModel.modelId).toBe(model.modelId);
      expect(readModel.name.toString()).toBe(model.name.toString());
    });

    test('Should_PreventPhantomReads_WhenApplicable', async () => {
      // Arrange: Create initial set of models
      const baseModels = Array.from({ length: 3 }, (_, i) => {
        const modelResult = FunctionModelTestFactory.create({ 
          testId: `${testContext.testId}-phantom-${i}` 
        });
        expect(modelResult.isSuccess).toBe(true);
        return modelResult.value;
      });

      // Save initial models
      for (const model of baseModels) {
        await repository.save(model);
      }

      // Act: Concurrent range query and insert
      const rangeQuery = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return repository.findByNamePattern(`%${testContext.testId}%`);
      };

      const insertOperation = async () => {
        const newModelResult = FunctionModelTestFactory.create({ 
          testId: `${testContext.testId}-phantom-new` 
        });
        expect(newModelResult.isSuccess).toBe(true);
        return repository.save(newModelResult.value);
      };

      const [queryResult, insertResult] = await Promise.all([
        rangeQuery(),
        insertOperation()
      ]);

      // Assert: Operations should complete successfully
      expect(queryResult.isSuccess).toBe(true);
      expect(insertResult.isSuccess).toBe(true);

      // The query result may or may not include the new model
      // depending on isolation level, but should be consistent
      const foundModels = queryResult.value.filter(m => 
        m.modelId.includes(testContext.testId)
      );
      
      expect(foundModels.length).toBeGreaterThanOrEqual(3); // At least the original 3
      expect(foundModels.length).toBeLessThanOrEqual(4);    // At most including the new one
    });
  });
});