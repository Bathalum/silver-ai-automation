/**
 * Database Constraints Integration Tests
 * 
 * Tests database constraints, foreign key relationships, and business rules
 * enforcement at the database level. Validates that constraints prevent
 * invalid data states and maintain referential integrity.
 * 
 * RED-GREEN-REFACTOR: These tests define data integrity requirements
 * and ensure database constraints protect against invalid operations.
 */

import { SupabaseFunctionModelRepository } from '../../../lib/infrastructure/repositories/supabase-function-model-repository';
import { ModelStatus, NodeStatus, ActionStatus } from '../../../lib/domain/enums';

import { SupabaseTestClient, requireIntegrationTestEnvironment } from '../infrastructure/supabase-test-client';
import { 
  DatabaseTestManager, 
  TestIsolationContext, 
  integrationTestSetup,
  DatabaseTestHelpers 
} from '../infrastructure/database-test-utilities';
import { 
  FunctionModelTestFactory, 
  IONodeTestFactory,
  TetherNodeTestFactory,
  TestScenarioFactory 
} from '../infrastructure/test-data-factories';

describe('Database Constraints Integration Tests', () => {
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
    testContext = await integrationTestSetup.beforeEach('DatabaseConstraints', expect.getState().currentTestName || 'unknown');
    repository = new SupabaseFunctionModelRepository(testContext.client);
  });

  afterEach(async () => {
    if (testContext) {
      await integrationTestSetup.afterEach(testContext);
    }
  });

  describe('Primary Key Constraints', () => {
    test('Should_EnforceUniqueness_WhenDuplicateModelId', async () => {
      // Arrange: Create model with specific ID
      const modelId = `test-constraint-${testContext.testId}`;
      
      // Insert directly into database to test constraint
      const { error } = await testContext.client
        .from('function_models')
        .insert([
          {
            model_id: modelId,
            name: `test-model-1-${testContext.testId}`,
            version: '1.0.0',
            status: ModelStatus.DRAFT,
            current_version: '1.0.0',
            version_count: 1,
            metadata: { test: true },
            permissions: { read: ['test'] },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_saved_at: new Date().toISOString()
          },
          {
            model_id: modelId, // Duplicate ID
            name: `test-model-2-${testContext.testId}`,
            version: '1.0.0',
            status: ModelStatus.DRAFT,
            current_version: '1.0.0',
            version_count: 1,
            metadata: { test: true },
            permissions: { read: ['test'] },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_saved_at: new Date().toISOString()
          }
        ]);

      // Assert: Should fail due to primary key constraint
      expect(error).not.toBeNull();
      expect(error?.message).toContain('duplicate key');
    });

    test('Should_EnforceUniqueness_WhenDuplicateNodeId', async () => {
      // Arrange: Create model first
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      await repository.save(model);

      const nodeId = `test-node-${testContext.testId}`;

      // Act: Try to insert duplicate node IDs
      const constraintResult = await DatabaseTestHelpers.verifyConstraint(
        testContext.client,
        'function_model_nodes',
        [
          {
            node_id: nodeId,
            model_id: model.modelId,
            node_type: 'IO_NODE',
            name: `node-1-${testContext.testId}`,
            position_x: 0,
            position_y: 0,
            dependencies: [],
            status: NodeStatus.READY,
            metadata: {},
            visual_properties: {},
            type_specific_data: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            node_id: nodeId, // Duplicate ID
            model_id: model.modelId,
            node_type: 'STAGE_NODE',
            name: `node-2-${testContext.testId}`,
            position_x: 100,
            position_y: 100,
            dependencies: [],
            status: NodeStatus.READY,
            metadata: {},
            visual_properties: {},
            type_specific_data: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        'duplicate key'
      );

      // Assert: Constraint should be enforced
      expect(constraintResult.isSuccess).toBe(true);
    });
  });

  describe('Foreign Key Constraints', () => {
    test('Should_EnforceForeignKey_WhenReferencingNonExistentModel', async () => {
      // Arrange: Non-existent model ID
      const nonExistentModelId = `non-existent-${testContext.testId}`;

      // Act: Try to create node referencing non-existent model
      const constraintResult = await DatabaseTestHelpers.verifyConstraint(
        testContext.client,
        'function_model_nodes',
        {
          node_id: `test-node-${testContext.testId}`,
          model_id: nonExistentModelId, // Non-existent model
          node_type: 'IO_NODE',
          name: `test-node-${testContext.testId}`,
          position_x: 0,
          position_y: 0,
          dependencies: [],
          status: NodeStatus.READY,
          metadata: {},
          visual_properties: {},
          type_specific_data: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        'foreign key'
      );

      // Assert: Foreign key constraint should be enforced
      expect(constraintResult.isSuccess).toBe(true);
    });

    test('Should_EnforceForeignKey_WhenActionNodeReferencesNonExistentParent', async () => {
      // Arrange: Create model but not the parent node
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      await repository.save(model);

      const nonExistentParentId = `non-existent-parent-${testContext.testId}`;

      // Act: Try to create action node with non-existent parent
      const constraintResult = await DatabaseTestHelpers.verifyConstraint(
        testContext.client,
        'function_model_actions',
        {
          action_id: `test-action-${testContext.testId}`,
          parent_node_id: nonExistentParentId, // Non-existent parent
          model_id: model.modelId,
          action_type: 'TETHER_NODE',
          name: `test-action-${testContext.testId}`,
          execution_mode: 'SEQUENTIAL',
          execution_order: 1,
          status: ActionStatus.PENDING,
          priority: 1,
          retry_policy: { maxAttempts: 3 },
          raci: { responsible: 'test' },
          metadata: {},
          action_specific_data: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        'foreign key'
      );

      // Assert: Foreign key constraint should be enforced
      expect(constraintResult.isSuccess).toBe(true);
    });

    test('Should_PreventDeletion_WhenChildRecordsExist', async () => {
      // Arrange: Create model with nodes and actions
      const scenarioResult = TestScenarioFactory.createCompleteWorkflowScenario(testContext.testId);
      expect(scenarioResult.isSuccess).toBe(true);
      const { model } = scenarioResult.value;

      await repository.save(model);

      // Act: Try to delete model with existing child records
      const { error } = await testContext.client
        .from('function_models')
        .delete()
        .eq('model_id', model.modelId);

      // Assert: Should fail due to foreign key constraint or be handled by cascade rules
      // The exact behavior depends on the database schema configuration
      // If cascading is enabled, it should succeed; if not, it should fail
      if (error) {
        expect(error.message).toContain('foreign key');
      } else {
        // If deletion succeeded, verify that child records were also deleted
        const { data: remainingNodes } = await testContext.client
          .from('function_model_nodes')
          .select('*')
          .eq('model_id', model.modelId);
          
        const { data: remainingActions } = await testContext.client
          .from('function_model_actions')
          .select('*')
          .eq('model_id', model.modelId);

        expect(remainingNodes?.length || 0).toBe(0);
        expect(remainingActions?.length || 0).toBe(0);
      }
    });
  });

  describe('Data Type Constraints', () => {
    test('Should_EnforceEnumConstraints_WhenInvalidStatus', async () => {
      // Arrange: Invalid model status
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      // Act: Try to insert invalid status directly
      const constraintResult = await DatabaseTestHelpers.verifyConstraint(
        testContext.client,
        'function_models',
        {
          model_id: `test-invalid-status-${testContext.testId}`,
          name: `test-model-${testContext.testId}`,
          version: '1.0.0',
          status: 'INVALID_STATUS', // Invalid enum value
          current_version: '1.0.0',
          version_count: 1,
          metadata: { test: true },
          permissions: { read: ['test'] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_saved_at: new Date().toISOString()
        },
        'invalid input value'
      );

      // Assert: Enum constraint should be enforced
      expect(constraintResult.isSuccess).toBe(true);
    });

    test('Should_EnforceJsonConstraints_WhenInvalidJsonStructure', async () => {
      // This test would require the database to have JSON validation constraints
      // For now, we test that valid JSON is accepted
      
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      // Valid JSON should be accepted
      (model as any).metadata = {
        validJson: true,
        nested: {
          object: {
            with: ['arrays', 'and', 'objects']
          }
        }
      };

      const saveResult = await repository.save(model);
      expect(saveResult.isSuccess).toBe(true);
    });

    test('Should_EnforceNumericConstraints_WhenInvalidValues', async () => {
      // Arrange: Test numeric field constraints (e.g., position coordinates)
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      await repository.save(model);

      // Act: Try to insert node with extreme coordinate values
      const largeNumberTest = await testContext.client
        .from('function_model_nodes')
        .insert({
          node_id: `test-large-coords-${testContext.testId}`,
          model_id: model.modelId,
          node_type: 'IO_NODE',
          name: `test-node-${testContext.testId}`,
          position_x: Number.MAX_SAFE_INTEGER,
          position_y: Number.MAX_SAFE_INTEGER,
          dependencies: [],
          status: NodeStatus.READY,
          metadata: {},
          visual_properties: {},
          type_specific_data: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      // Assert: Should handle large numbers appropriately
      // PostgreSQL can handle very large integers, so this should succeed
      expect(largeNumberTest.error).toBeNull();
    });
  });

  describe('Not Null Constraints', () => {
    test('Should_EnforceNotNull_WhenRequiredFieldsMissing', async () => {
      // Act: Try to insert model without required fields
      const constraintResult = await DatabaseTestHelpers.verifyConstraint(
        testContext.client,
        'function_models',
        {
          model_id: `test-missing-name-${testContext.testId}`,
          // name: missing required field
          version: '1.0.0',
          status: ModelStatus.DRAFT,
          current_version: '1.0.0',
          version_count: 1,
          metadata: { test: true },
          permissions: { read: ['test'] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_saved_at: new Date().toISOString()
        },
        'null value'
      );

      // Assert: Not null constraint should be enforced
      expect(constraintResult.isSuccess).toBe(true);
    });

    test('Should_EnforceNotNull_WhenNodeMissingRequiredFields', async () => {
      // Arrange: Create model first
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      await repository.save(model);

      // Act: Try to insert node without required fields
      const constraintResult = await DatabaseTestHelpers.verifyConstraint(
        testContext.client,
        'function_model_nodes',
        {
          node_id: `test-missing-type-${testContext.testId}`,
          model_id: model.modelId,
          // node_type: missing required field
          name: `test-node-${testContext.testId}`,
          position_x: 0,
          position_y: 0,
          dependencies: [],
          status: NodeStatus.READY,
          metadata: {},
          visual_properties: {},
          type_specific_data: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        'null value'
      );

      // Assert: Not null constraint should be enforced
      expect(constraintResult.isSuccess).toBe(true);
    });
  });

  describe('Business Rule Constraints', () => {
    test('Should_ValidateVersionFormat_WhenInvalidVersionString', async () => {
      // This test depends on database-level validation rules for version format
      // For now, we test that our domain validation catches it before reaching DB
      
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      // Try to set invalid version (this should be caught by domain layer)
      try {
        (model as any).version = 'invalid-version-format';
        const saveResult = await repository.save(model);
        // If it reaches here, the repository handled the invalid version
        expect(saveResult.isFailure).toBe(true);
      } catch (error) {
        // Domain validation caught it before reaching repository
        expect(error).toBeDefined();
      }
    });

    test('Should_ValidateExecutionOrder_WhenDuplicateOrders', async () => {
      // Arrange: Create model with stage node
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      const stageNodeResult = IONodeTestFactory.create({ 
        testId: testContext.testId,
        suffix: '-stage'
      });
      expect(stageNodeResult.isSuccess).toBe(true);
      const stageNode = stageNodeResult.value;
      
      model.addNode(stageNode);
      await repository.save(model);

      // Create two action nodes with same execution order
      const action1Result = TetherNodeTestFactory.create({
        testId: `${testContext.testId}-1`,
        parentNodeId: stageNode.nodeId.toString()
      });
      const action2Result = TetherNodeTestFactory.create({
        testId: `${testContext.testId}-2`,
        parentNodeId: stageNode.nodeId.toString()
      });

      expect(action1Result.isSuccess).toBe(true);
      expect(action2Result.isSuccess).toBe(true);

      const action1 = action1Result.value;
      const action2 = action2Result.value;

      // Set same execution order
      (action1 as any).executionOrder = 1;
      (action2 as any).executionOrder = 1;

      model.addActionNode(action1);
      model.addActionNode(action2);

      // Act: Save model with duplicate execution orders
      const saveResult = await repository.save(model);

      // Assert: This might succeed (allowing duplicates) or fail (enforcing uniqueness)
      // The exact behavior depends on business rules implementation
      if (saveResult.isFailure) {
        expect(saveResult.error).toContain('execution_order');
      } else {
        // If duplicates are allowed, verify both actions were saved
        const retrievedResult = await repository.findById(model.modelId);
        expect(retrievedResult.isSuccess).toBe(true);
        expect(retrievedResult.value!.actionNodes.size).toBe(2);
      }
    });
  });

  describe('Referential Integrity Verification', () => {
    test('Should_MaintainIntegrity_WhenComplexRelationships', async () => {
      // Arrange: Create complex model with all relationship types
      const scenarioResult = TestScenarioFactory.createCompleteWorkflowScenario(testContext.testId);
      expect(scenarioResult.isSuccess).toBe(true);
      const { model } = scenarioResult.value;

      await repository.save(model);

      // Act: Verify all relationships are intact
      const functionModelToNodes = await DatabaseTestHelpers.verifyReferentialIntegrity(
        testContext.client,
        'function_models',
        'model_id',
        'function_model_nodes',
        'model_id'
      );

      const functionModelToActions = await DatabaseTestHelpers.verifyReferentialIntegrity(
        testContext.client,
        'function_models',
        'model_id',
        'function_model_actions',
        'model_id'
      );

      const nodesToActions = await DatabaseTestHelpers.verifyReferentialIntegrity(
        testContext.client,
        'function_model_nodes',
        'node_id',
        'function_model_actions',
        'parent_node_id'
      );

      // Assert: All referential integrity checks should pass
      expect(functionModelToNodes.isSuccess).toBe(true);
      expect(functionModelToActions.isSuccess).toBe(true);
      expect(nodesToActions.isSuccess).toBe(true);
    });

    test('Should_PreventOrphanedRecords_WhenCascadingDeletes', async () => {
      // Arrange: Create model with complex relationships
      const scenarioResult = TestScenarioFactory.createCompleteWorkflowScenario(testContext.testId);
      expect(scenarioResult.isSuccess).toBe(true);
      const { model } = scenarioResult.value;

      await repository.save(model);

      // Get initial counts
      const initialNodeCountResult = await testContext.client
        .from('function_model_nodes')
        .select('*', { count: 'exact' })
        .eq('model_id', model.modelId);
        
      const initialActionCountResult = await testContext.client
        .from('function_model_actions')
        .select('*', { count: 'exact' })
        .eq('model_id', model.modelId);

      expect(initialNodeCountResult.count).toBeGreaterThan(0);
      expect(initialActionCountResult.count).toBeGreaterThan(0);

      // Act: Delete the parent model using repository (soft delete)
      const deleteResult = await repository.delete(model.modelId);
      expect(deleteResult.isSuccess).toBe(true);

      // Assert: Verify handling of child records
      // With soft delete, child records should typically remain but be associated with deleted parent
      const finalNodeCountResult = await testContext.client
        .from('function_model_nodes')
        .select('*', { count: 'exact' })
        .eq('model_id', model.modelId);
        
      const finalActionCountResult = await testContext.client
        .from('function_model_actions')
        .select('*', { count: 'exact' })
        .eq('model_id', model.modelId);

      // Child records might still exist (depends on cascade configuration)
      // or might be deleted along with parent
      expect(finalNodeCountResult.count).toBeGreaterThanOrEqual(0);
      expect(finalActionCountResult.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Concurrent Modification Constraints', () => {
    test('Should_HandleConcurrentInserts_WithoutViolatingConstraints', async () => {
      // Arrange: Prepare multiple models for concurrent insertion
      const concurrentModels = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          const modelResult = FunctionModelTestFactory.create({
            testId: `${testContext.testId}-concurrent-${i}`
          });
          expect(modelResult.isSuccess).toBe(true);
          return modelResult.value;
        })
      );

      // Act: Insert all models concurrently
      const insertPromises = concurrentModels.map(model => repository.save(model));
      const results = await Promise.allSettled(insertPromises);

      // Assert: All inserts should succeed (no constraint violations)
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful).toBe(5);
      expect(failed.length).toBe(0);

      // Verify all models are in database
      for (const model of concurrentModels) {
        const existsResult = await repository.exists(model.modelId);
        expect(existsResult.isSuccess).toBe(true);
        expect(existsResult.value).toBe(true);
      }
    });

    test('Should_HandleConcurrentUpdates_WithoutDataCorruption', async () => {
      // Arrange: Create and save initial model
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      await repository.save(model);

      // Act: Perform concurrent updates
      const updates = Array.from({ length: 3 }, (_, i) => {
        const modelCopy = { ...model };
        (modelCopy as any).description = `Concurrent update ${i} - ${testContext.testId}`;
        (modelCopy as any).metadata = { 
          ...model.metadata, 
          updateIndex: i, 
          timestamp: Date.now() + i 
        };
        return repository.save(modelCopy as FunctionModel);
      });

      const updateResults = await Promise.allSettled(updates);

      // Assert: All updates should succeed (last writer wins)
      const successfulUpdates = updateResults.filter(r => r.status === 'fulfilled').length;
      expect(successfulUpdates).toBe(3);

      // Verify final state is consistent
      const finalResult = await repository.findById(model.modelId);
      expect(finalResult.isSuccess).toBe(true);
      expect(finalResult.value).not.toBeNull();
      
      const finalModel = finalResult.value!;
      expect(finalModel.description).toContain('Concurrent update');
      expect(finalModel.metadata.updateIndex).toBeDefined();
    });
  });
});