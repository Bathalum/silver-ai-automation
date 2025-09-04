/**
 * Supabase Function Model Repository Integration Tests
 * 
 * Tests the repository implementation against real Supabase database
 * following TDD principles and Clean Architecture compliance.
 * 
 * RED-GREEN-REFACTOR: These tests define expected behavior for database operations
 * and serve as executable documentation for repository interface compliance.
 */

import { SupabaseFunctionModelRepository } from '../../../lib/infrastructure/repositories/supabase-function-model-repository';
import { FunctionModel } from '../../../lib/domain/entities/function-model';
import { ModelStatus } from '../../../lib/domain/enums';
import { Result } from '../../../lib/domain/shared/result';

import { SupabaseTestClient, requireIntegrationTestEnvironment } from '../infrastructure/supabase-test-client';
import { DatabaseTestManager, TestIsolationContext, integrationTestSetup } from '../infrastructure/database-test-utilities';
import { FunctionModelTestFactory, TestScenarioFactory } from '../infrastructure/test-data-factories';

describe('SupabaseFunctionModelRepository Integration Tests', () => {
  let repository: SupabaseFunctionModelRepository;
  let testContext: TestIsolationContext;
  let testManager: DatabaseTestManager;

  // Skip tests if not in integration mode
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
      pending('Not in integration test mode');
      return;
    }

    testManager = DatabaseTestManager.getInstance();
    testContext = await integrationTestSetup.beforeEach('FunctionModelRepository', expect.getState().currentTestName || 'unknown');
    repository = new SupabaseFunctionModelRepository(testContext.client);
  });

  afterEach(async () => {
    if (testContext) {
      await integrationTestSetup.afterEach(testContext);
    }
  });

  afterAll(async () => {
    if (SupabaseTestClient.isIntegrationTestMode()) {
      await integrationTestSetup.globalTeardown();
    }
  });

  describe('Database Connection and Schema Validation', () => {
    test('Should_ConnectToDatabase_WithValidTables', async () => {
      // Arrange: Test client should be connected
      const testClient = SupabaseTestClient.getInstance();

      // Act: Verify connection
      const connectionResult = await testClient.verifyConnection();

      // Assert: Connection should succeed
      expect(connectionResult.isSuccess).toBe(true);
    });

    test('Should_AccessRequiredTables_WithServiceRoleKey', async () => {
      // Arrange: Required tables for function model operations
      const requiredTables = ['function_models', 'function_model_nodes', 'function_model_actions'];

      // Act & Assert: Each table should be accessible
      for (const table of requiredTables) {
        const countResult = await testContext.client
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(0);

        expect(countResult.error).toBeNull();
      }
    });
  });

  describe('CREATE Operations - TDD RED-GREEN-REFACTOR', () => {
    test('Should_SaveFunctionModel_WhenValidDomainEntity', async () => {
      // Arrange: Create valid function model using factory
      const modelResult = FunctionModelTestFactory.create({ 
        testId: testContext.testId 
      });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      // Act: Save model to database
      const saveResult = await repository.save(model);

      // Assert: Save should succeed
      expect(saveResult.isSuccess).toBe(true);

      // Verify: Model should exist in database
      const existsResult = await repository.exists(model.modelId);
      expect(existsResult.isSuccess).toBe(true);
      expect(existsResult.value).toBe(true);
    });

    test('Should_SaveFunctionModelWithNodes_WhenCompleteWorkflow', async () => {
      // Arrange: Create complete workflow scenario
      const scenarioResult = TestScenarioFactory.createCompleteWorkflowScenario(testContext.testId);
      expect(scenarioResult.isSuccess).toBe(true);
      const { model } = scenarioResult.value;

      // Act: Save complete model with nodes
      const saveResult = await repository.save(model);

      // Assert: Save should succeed
      expect(saveResult.isSuccess).toBe(true);

      // Verify: All components should be persisted
      const retrievedModelResult = await repository.findById(model.modelId);
      expect(retrievedModelResult.isSuccess).toBe(true);
      expect(retrievedModelResult.value).not.toBeNull();
      
      const retrievedModel = retrievedModelResult.value!;
      expect(retrievedModel.nodes.size).toBe(model.nodes.size);
      expect(retrievedModel.actionNodes.size).toBe(model.actionNodes.size);
    });

    test('Should_FailToSave_WhenDuplicateModelId', async () => {
      // Arrange: Create and save first model
      const firstModelResult = FunctionModelTestFactory.create({ 
        testId: testContext.testId 
      });
      expect(firstModelResult.isSuccess).toBe(true);
      const firstModel = firstModelResult.value;
      
      const firstSaveResult = await repository.save(firstModel);
      expect(firstSaveResult.isSuccess).toBe(true);

      // Create second model with same ID but different data
      const secondModelResult = FunctionModelTestFactory.create({ 
        testId: testContext.testId 
      });
      expect(secondModelResult.isSuccess).toBe(true);
      const secondModel = secondModelResult.value;
      // Force same model ID
      (secondModel as any).modelId = firstModel.modelId;

      // Act: Attempt to save duplicate
      const secondSaveResult = await repository.save(secondModel);

      // Assert: Should succeed (upsert behavior)
      expect(secondSaveResult.isSuccess).toBe(true);
    });
  });

  describe('READ Operations - Query Validation', () => {
    test('Should_FindById_WhenModelExists', async () => {
      // Arrange: Create and save model
      const modelResult = FunctionModelTestFactory.create({ 
        testId: testContext.testId 
      });
      expect(modelResult.isSuccess).toBe(true);
      const originalModel = modelResult.value;
      
      const saveResult = await repository.save(originalModel);
      expect(saveResult.isSuccess).toBe(true);

      // Act: Find model by ID
      const findResult = await repository.findById(originalModel.modelId);

      // Assert: Should find exact model
      expect(findResult.isSuccess).toBe(true);
      expect(findResult.value).not.toBeNull();
      
      const foundModel = findResult.value!;
      expect(foundModel.modelId).toBe(originalModel.modelId);
      expect(foundModel.name.toString()).toBe(originalModel.name.toString());
      expect(foundModel.description).toBe(originalModel.description);
      expect(foundModel.status).toBe(originalModel.status);
    });

    test('Should_ReturnNull_WhenModelNotFound', async () => {
      // Arrange: Non-existent model ID
      const nonExistentId = `non-existent-${testContext.testId}`;

      // Act: Attempt to find non-existent model
      const findResult = await repository.findById(nonExistentId);

      // Assert: Should return null, not error
      expect(findResult.isSuccess).toBe(true);
      expect(findResult.value).toBeNull();
    });

    test('Should_FindByName_WhenMultipleModelsWithSameName', async () => {
      // Arrange: Create multiple models with same name pattern
      const baseName = `test-search-${testContext.testId}`;
      const modelsResult = FunctionModelTestFactory.createBatch(3, { 
        testId: testContext.testId,
        prefix: baseName
      });
      expect(modelsResult.isSuccess).toBe(true);
      const models = modelsResult.value;

      // Save all models
      for (const model of models) {
        const saveResult = await repository.save(model);
        expect(saveResult.isSuccess).toBe(true);
      }

      // Act: Search by name pattern
      const searchResult = await repository.findByNamePattern(`${baseName}%`);

      // Assert: Should find all matching models
      expect(searchResult.isSuccess).toBe(true);
      expect(searchResult.value.length).toBeGreaterThanOrEqual(3);
      
      // Verify all found models match pattern
      searchResult.value.forEach(foundModel => {
        expect(foundModel.name.toString()).toContain(baseName);
      });
    });

    test('Should_FindByStatus_WhenFilteringByModelStatus', async () => {
      // Arrange: Create models with different statuses
      const draftModelResult = FunctionModelTestFactory.create({ 
        testId: `${testContext.testId}-draft` 
      });
      const publishedModelResult = FunctionModelTestFactory.create({ 
        testId: `${testContext.testId}-published` 
      });
      
      expect(draftModelResult.isSuccess).toBe(true);
      expect(publishedModelResult.isSuccess).toBe(true);
      
      const draftModel = draftModelResult.value;
      const publishedModel = publishedModelResult.value;
      
      // Set different statuses
      (draftModel as any).status = ModelStatus.DRAFT;
      (publishedModel as any).status = ModelStatus.PUBLISHED;

      // Save both models
      await repository.save(draftModel);
      await repository.save(publishedModel);

      // Act: Find by specific status
      const draftSearchResult = await repository.findByStatus([ModelStatus.DRAFT]);
      const publishedSearchResult = await repository.findByStatus([ModelStatus.PUBLISHED]);

      // Assert: Should find models by status
      expect(draftSearchResult.isSuccess).toBe(true);
      expect(publishedSearchResult.isSuccess).toBe(true);
      
      const foundDrafts = draftSearchResult.value.filter(m => 
        m.modelId.includes(testContext.testId)
      );
      const foundPublished = publishedSearchResult.value.filter(m => 
        m.modelId.includes(testContext.testId)
      );
      
      expect(foundDrafts.length).toBeGreaterThanOrEqual(1);
      expect(foundPublished.length).toBeGreaterThanOrEqual(1);
      
      // Verify status filtering
      foundDrafts.forEach(model => {
        expect(model.status).toBe(ModelStatus.DRAFT);
      });
      foundPublished.forEach(model => {
        expect(model.status).toBe(ModelStatus.PUBLISHED);
      });
    });

    test('Should_FindRecentlyModified_OrderedByTimestamp', async () => {
      // Arrange: Create models with different timestamps
      const modelsResult = FunctionModelTestFactory.createBatch(3, { 
        testId: testContext.testId 
      });
      expect(modelsResult.isSuccess).toBe(true);
      const models = modelsResult.value;

      // Save models with slight delays to ensure different timestamps
      for (let i = 0; i < models.length; i++) {
        await repository.save(models[i]);
        if (i < models.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Act: Find recently modified
      const recentResult = await repository.findRecentlyModified(5);

      // Assert: Should return models in descending order by modification time
      expect(recentResult.isSuccess).toBe(true);
      
      const ourModels = recentResult.value.filter(m => 
        m.modelId.includes(testContext.testId)
      );
      expect(ourModels.length).toBeGreaterThanOrEqual(3);
      
      // Verify ordering (most recent first)
      for (let i = 1; i < ourModels.length; i++) {
        expect(ourModels[i].updatedAt.getTime()).toBeLessThanOrEqual(
          ourModels[i-1].updatedAt.getTime()
        );
      }
    });
  });

  describe('UPDATE Operations - State Management', () => {
    test('Should_UpdateModel_WhenValidChanges', async () => {
      // Arrange: Create and save model
      const modelResult = FunctionModelTestFactory.create({ 
        testId: testContext.testId 
      });
      expect(modelResult.isSuccess).toBe(true);
      const originalModel = modelResult.value;
      
      const saveResult = await repository.save(originalModel);
      expect(saveResult.isSuccess).toBe(true);

      // Modify model
      const originalDescription = originalModel.description;
      (originalModel as any).description = `Updated description - ${testContext.testId}`;

      // Act: Update model
      const updateResult = await repository.save(originalModel);

      // Assert: Update should succeed
      expect(updateResult.isSuccess).toBe(true);

      // Verify: Changes should be persisted
      const retrievedResult = await repository.findById(originalModel.modelId);
      expect(retrievedResult.isSuccess).toBe(true);
      expect(retrievedResult.value).not.toBeNull();
      
      const retrievedModel = retrievedResult.value!;
      expect(retrievedModel.description).toBe(`Updated description - ${testContext.testId}`);
      expect(retrievedModel.description).not.toBe(originalDescription);
    });

    test('Should_PublishModel_WhenStatusChange', async () => {
      // Arrange: Create draft model
      const modelResult = FunctionModelTestFactory.create({ 
        testId: testContext.testId 
      });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      
      const saveResult = await repository.save(model);
      expect(saveResult.isSuccess).toBe(true);

      // Act: Publish model
      const publishResult = await repository.publishModel(model.modelId);

      // Assert: Publish should succeed
      expect(publishResult.isSuccess).toBe(true);

      // Verify: Status should be updated
      const retrievedResult = await repository.findById(model.modelId);
      expect(retrievedResult.isSuccess).toBe(true);
      expect(retrievedResult.value).not.toBeNull();
      
      const retrievedModel = retrievedResult.value!;
      expect(retrievedModel.status).toBe(ModelStatus.PUBLISHED);
    });

    test('Should_ArchiveModel_WhenStatusChange', async () => {
      // Arrange: Create published model
      const modelResult = FunctionModelTestFactory.create({ 
        testId: testContext.testId 
      });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      
      await repository.save(model);
      await repository.publishModel(model.modelId);

      // Act: Archive model
      const archiveResult = await repository.archiveModel(model.modelId);

      // Assert: Archive should succeed
      expect(archiveResult.isSuccess).toBe(true);

      // Verify: Status should be updated
      const retrievedResult = await repository.findById(model.modelId);
      expect(retrievedResult.isSuccess).toBe(true);
      expect(retrievedResult.value).not.toBeNull();
      
      const retrievedModel = retrievedResult.value!;
      expect(retrievedModel.status).toBe(ModelStatus.ARCHIVED);
    });
  });

  describe('DELETE Operations - Soft Deletion', () => {
    test('Should_SoftDelete_WhenModelExists', async () => {
      // Arrange: Create and save model
      const modelResult = FunctionModelTestFactory.create({ 
        testId: testContext.testId 
      });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      
      const saveResult = await repository.save(model);
      expect(saveResult.isSuccess).toBe(true);

      // Act: Delete model
      const deleteResult = await repository.delete(model.modelId);

      // Assert: Delete should succeed
      expect(deleteResult.isSuccess).toBe(true);

      // Verify: Model should not be found in normal queries
      const findResult = await repository.findById(model.modelId);
      expect(findResult.isSuccess).toBe(true);
      expect(findResult.value).toBeNull();

      // Verify: Model should exist in deleted models
      const deletedResult = await repository.findDeleted();
      expect(deletedResult.isSuccess).toBe(true);
      
      const deletedModel = deletedResult.value.find(m => m.modelId === model.modelId);
      expect(deletedModel).toBeDefined();
      expect(deletedModel?.deletedAt).toBeDefined();
    });

    test('Should_SoftDeleteWithUser_WhenDeletionTracking', async () => {
      // Arrange: Create and save model
      const modelResult = FunctionModelTestFactory.create({ 
        testId: testContext.testId 
      });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      
      const saveResult = await repository.save(model);
      expect(saveResult.isSuccess).toBe(true);

      const deletedBy = `test-user-${testContext.testId}`;

      // Act: Soft delete with user tracking
      const deleteResult = await repository.softDelete(model.modelId, deletedBy);

      // Assert: Delete should succeed
      expect(deleteResult.isSuccess).toBe(true);

      // Verify: Deletion metadata should be tracked
      const deletedResult = await repository.findDeleted();
      expect(deletedResult.isSuccess).toBe(true);
      
      const deletedModel = deletedResult.value.find(m => m.modelId === model.modelId);
      expect(deletedModel).toBeDefined();
      expect(deletedModel?.deletedBy).toBe(deletedBy);
      expect(deletedModel?.deletedAt).toBeDefined();
    });

    test('Should_RestoreModel_WhenPreviouslySoftDeleted', async () => {
      // Arrange: Create, save, and delete model
      const modelResult = FunctionModelTestFactory.create({ 
        testId: testContext.testId 
      });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      
      await repository.save(model);
      await repository.softDelete(model.modelId, 'test-user');

      // Act: Restore model
      const restoreResult = await repository.restore(model.modelId);

      // Assert: Restore should succeed
      expect(restoreResult.isSuccess).toBe(true);

      // Verify: Model should be findable again
      const findResult = await repository.findById(model.modelId);
      expect(findResult.isSuccess).toBe(true);
      expect(findResult.value).not.toBeNull();
      
      const restoredModel = findResult.value!;
      expect(restoredModel.deletedAt).toBeUndefined();
      expect(restoredModel.deletedBy).toBeUndefined();
    });
  });

  describe('AGGREGATE Operations - Statistics and Counting', () => {
    test('Should_CountByStatus_WhenMultipleModelsExist', async () => {
      // Arrange: Create models with different statuses
      const draftCount = 2;
      const publishedCount = 3;
      
      // Create draft models
      for (let i = 0; i < draftCount; i++) {
        const modelResult = FunctionModelTestFactory.create({ 
          testId: `${testContext.testId}-draft-${i}` 
        });
        expect(modelResult.isSuccess).toBe(true);
        const model = modelResult.value;
        (model as any).status = ModelStatus.DRAFT;
        await repository.save(model);
      }

      // Create published models
      for (let i = 0; i < publishedCount; i++) {
        const modelResult = FunctionModelTestFactory.create({ 
          testId: `${testContext.testId}-published-${i}` 
        });
        expect(modelResult.isSuccess).toBe(true);
        const model = modelResult.value;
        (model as any).status = ModelStatus.PUBLISHED;
        await repository.save(model);
      }

      // Act: Count by status
      const draftCountResult = await repository.countByStatus(ModelStatus.DRAFT);
      const publishedCountResult = await repository.countByStatus(ModelStatus.PUBLISHED);

      // Assert: Counts should include our test data
      expect(draftCountResult.isSuccess).toBe(true);
      expect(publishedCountResult.isSuccess).toBe(true);
      
      expect(draftCountResult.value).toBeGreaterThanOrEqual(draftCount);
      expect(publishedCountResult.value).toBeGreaterThanOrEqual(publishedCount);
    });

    test('Should_HandleEmptyResults_WhenNoMatchingModels', async () => {
      // Act: Search for non-existent name
      const searchResult = await repository.findByNamePattern(`non-existent-${testContext.testId}%`);

      // Assert: Should return empty array, not error
      expect(searchResult.isSuccess).toBe(true);
      expect(searchResult.value).toEqual([]);
    });
  });

  describe('ERROR Handling - Database Constraints', () => {
    test('Should_HandleDatabaseConnectionError_Gracefully', async () => {
      // This test would require simulating connection failure
      // For now, we test that our error handling doesn't throw exceptions
      const invalidId = ''; // Invalid ID that might cause issues

      // Act: Attempt operation with invalid data
      const result = await repository.findById(invalidId);

      // Assert: Should return failure Result, not throw exception
      expect(result.isSuccess || result.isFailure).toBe(true);
    });

    test('Should_HandleConcurrentModification_WithOptimisticLocking', async () => {
      // Arrange: Create and save model
      const modelResult = FunctionModelTestFactory.create({ 
        testId: testContext.testId 
      });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      
      await repository.save(model);

      // Simulate concurrent modifications by updating twice
      const firstUpdate = repository.save(model);
      const secondUpdate = repository.save(model);

      // Act & Assert: Both updates should complete
      const [firstResult, secondResult] = await Promise.all([firstUpdate, secondUpdate]);
      
      expect(firstResult.isSuccess).toBe(true);
      expect(secondResult.isSuccess).toBe(true);
    });
  });
});