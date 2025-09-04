/**
 * Performance Integration Tests
 * 
 * Tests query performance, indexing effectiveness, and database optimization
 * with real Supabase operations. Validates that database operations meet
 * performance requirements under various load conditions.
 * 
 * RED-GREEN-REFACTOR: These tests define performance requirements
 * and serve as regression detection for query optimization.
 */

import { SupabaseFunctionModelRepository } from '../../../lib/infrastructure/repositories/supabase-function-model-repository';
import { ModelStatus } from '../../../lib/domain/enums';

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

describe('Performance Integration Tests', () => {
  let repository: SupabaseFunctionModelRepository;
  let testContext: TestIsolationContext;
  
  // Performance thresholds (adjust based on requirements)
  const PERFORMANCE_THRESHOLDS = {
    SINGLE_INSERT: 1000,      // 1 second for single insert
    SINGLE_SELECT: 500,       // 500ms for single select by ID
    BULK_INSERT: 5000,        // 5 seconds for bulk insert (10 items)
    COMPLEX_QUERY: 2000,      // 2 seconds for complex queries
    BATCH_OPERATION: 3000,    // 3 seconds for batch operations
    INDEX_SCAN: 1000,         // 1 second for indexed searches
    FULL_SCAN: 5000          // 5 seconds for full table scans
  };

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

    const testManager = DatabaseTestManager.getInstance();
    testContext = await integrationTestSetup.beforeEach('Performance', expect.getState().currentTestName || 'unknown');
    repository = new SupabaseFunctionModelRepository(testContext.client);
  });

  afterEach(async () => {
    if (testContext) {
      await integrationTestSetup.afterEach(testContext);
    }
  });

  describe('Single Record Operations Performance', () => {
    test('Should_InsertSingleRecord_WithinPerformanceThreshold', async () => {
      // Arrange: Create test model
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;

      // Act & Assert: Measure insert performance
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const saveResult = await repository.save(model);
          expect(saveResult.isSuccess).toBe(true);
          return saveResult.value;
        },
        PERFORMANCE_THRESHOLDS.SINGLE_INSERT
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`Single insert took ${performanceResult.value.duration.toFixed(2)}ms`);
    });

    test('Should_SelectByPrimaryKey_WithinPerformanceThreshold', async () => {
      // Arrange: Create and save model
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      
      await repository.save(model);

      // Act & Assert: Measure select performance
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const findResult = await repository.findById(model.modelId);
          expect(findResult.isSuccess).toBe(true);
          expect(findResult.value).toBeDefined();
          return findResult.value;
        },
        PERFORMANCE_THRESHOLDS.SINGLE_SELECT
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`Single select took ${performanceResult.value.duration.toFixed(2)}ms`);
    });

    test('Should_UpdateSingleRecord_WithinPerformanceThreshold', async () => {
      // Arrange: Create and save model
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      
      await repository.save(model);

      // Modify model
      (model as any).description = `Updated description - ${testContext.testId}`;

      // Act & Assert: Measure update performance
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const updateResult = await repository.save(model);
          expect(updateResult.isSuccess).toBe(true);
          return updateResult.value;
        },
        PERFORMANCE_THRESHOLDS.SINGLE_INSERT
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`Single update took ${performanceResult.value.duration.toFixed(2)}ms`);
    });

    test('Should_DeleteSingleRecord_WithinPerformanceThreshold', async () => {
      // Arrange: Create and save model
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      
      await repository.save(model);

      // Act & Assert: Measure delete performance
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const deleteResult = await repository.delete(model.modelId);
          expect(deleteResult.isSuccess).toBe(true);
          return deleteResult.value;
        },
        PERFORMANCE_THRESHOLDS.SINGLE_SELECT
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`Single delete took ${performanceResult.value.duration.toFixed(2)}ms`);
    });
  });

  describe('Bulk Operations Performance', () => {
    test('Should_BulkInsertModels_WithinPerformanceThreshold', async () => {
      // Arrange: Create multiple test models
      const batchSize = 10;
      const modelsResult = FunctionModelTestFactory.createBatch(batchSize, { 
        testId: testContext.testId 
      });
      expect(modelsResult.isSuccess).toBe(true);
      const models = modelsResult.value;

      // Act & Assert: Measure bulk insert performance
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const savePromises = models.map(model => repository.save(model));
          const results = await Promise.all(savePromises);
          
          // Verify all succeeded
          results.forEach(result => {
            expect(result.isSuccess).toBe(true);
          });
          
          return results;
        },
        PERFORMANCE_THRESHOLDS.BULK_INSERT
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`Bulk insert of ${batchSize} models took ${performanceResult.value.duration.toFixed(2)}ms`);
      console.log(`Average per model: ${(performanceResult.value.duration / batchSize).toFixed(2)}ms`);
    });

    test('Should_BulkRetrieveModels_WithinPerformanceThreshold', async () => {
      // Arrange: Create and save multiple models
      const batchSize = 10;
      const modelsResult = FunctionModelTestFactory.createBatch(batchSize, { 
        testId: testContext.testId 
      });
      expect(modelsResult.isSuccess).toBe(true);
      const models = modelsResult.value;

      // Save all models first
      for (const model of models) {
        const saveResult = await repository.save(model);
        expect(saveResult.isSuccess).toBe(true);
      }

      // Act & Assert: Measure bulk retrieve performance
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const findPromises = models.map(model => repository.findById(model.modelId));
          const results = await Promise.all(findPromises);
          
          // Verify all found
          results.forEach(result => {
            expect(result.isSuccess).toBe(true);
            expect(result.value).toBeDefined();
          });
          
          return results;
        },
        PERFORMANCE_THRESHOLDS.BATCH_OPERATION
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`Bulk retrieve of ${batchSize} models took ${performanceResult.value.duration.toFixed(2)}ms`);
    });
  });

  describe('Complex Query Performance', () => {
    test('Should_SearchByNamePattern_WithinPerformanceThreshold', async () => {
      // Arrange: Create models with searchable names
      const searchableModels = await Promise.all(
        Array.from({ length: 15 }, async (_, i) => {
          const modelResult = FunctionModelTestFactory.create({ 
            testId: testContext.testId,
            prefix: `searchable-${i % 3}` // Create patterns for testing
          });
          expect(modelResult.isSuccess).toBe(true);
          const model = modelResult.value;
          await repository.save(model);
          return model;
        })
      );

      // Act & Assert: Measure search performance
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const searchResult = await repository.findByNamePattern(`searchable%${testContext.testId}%`);
          expect(searchResult.isSuccess).toBe(true);
          expect(searchResult.value.length).toBeGreaterThan(0);
          return searchResult.value;
        },
        PERFORMANCE_THRESHOLDS.INDEX_SCAN
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`Name pattern search took ${performanceResult.value.duration.toFixed(2)}ms`);
    });

    test('Should_FilterByStatus_WithinPerformanceThreshold', async () => {
      // Arrange: Create models with different statuses
      const statusModels = await Promise.all([
        ModelStatus.DRAFT,
        ModelStatus.PUBLISHED,
        ModelStatus.ARCHIVED,
        ModelStatus.ERROR
      ].flatMap(status => 
        Array.from({ length: 3 }, async (_, i) => {
          const modelResult = FunctionModelTestFactory.create({ 
            testId: `${testContext.testId}-${status}-${i}` 
          });
          expect(modelResult.isSuccess).toBe(true);
          const model = modelResult.value;
          (model as any).status = status;
          await repository.save(model);
          return model;
        })
      ));

      // Act & Assert: Measure status filter performance
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const filterResult = await repository.findByStatus([ModelStatus.PUBLISHED, ModelStatus.DRAFT]);
          expect(filterResult.isSuccess).toBe(true);
          return filterResult.value;
        },
        PERFORMANCE_THRESHOLDS.INDEX_SCAN
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`Status filter search took ${performanceResult.value.duration.toFixed(2)}ms`);
    });

    test('Should_FindRecentlyModified_WithinPerformanceThreshold', async () => {
      // Arrange: Create models with various timestamps
      const recentModels = await Promise.all(
        Array.from({ length: 20 }, async (_, i) => {
          const modelResult = FunctionModelTestFactory.create({ 
            testId: `${testContext.testId}-recent-${i}` 
          });
          expect(modelResult.isSuccess).toBe(true);
          const model = modelResult.value;
          await repository.save(model);
          
          // Introduce small delays to create different timestamps
          await new Promise(resolve => setTimeout(resolve, 10));
          return model;
        })
      );

      // Act & Assert: Measure recent query performance
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const recentResult = await repository.findRecentlyModified(10);
          expect(recentResult.isSuccess).toBe(true);
          return recentResult.value;
        },
        PERFORMANCE_THRESHOLDS.INDEX_SCAN
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`Recently modified query took ${performanceResult.value.duration.toFixed(2)}ms`);
    });
  });

  describe('Complex Workflow Performance', () => {
    test('Should_SaveCompleteWorkflow_WithinPerformanceThreshold', async () => {
      // Arrange: Create complete workflow with all components
      const scenarioResult = TestScenarioFactory.createCompleteWorkflowScenario(testContext.testId);
      expect(scenarioResult.isSuccess).toBe(true);
      const { model } = scenarioResult.value;

      // Act & Assert: Measure complete workflow save performance
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const saveResult = await repository.save(model);
          expect(saveResult.isSuccess).toBe(true);
          return saveResult.value;
        },
        PERFORMANCE_THRESHOLDS.COMPLEX_QUERY
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`Complete workflow save took ${performanceResult.value.duration.toFixed(2)}ms`);
    });

    test('Should_RetrieveCompleteWorkflow_WithinPerformanceThreshold', async () => {
      // Arrange: Create and save complete workflow
      const scenarioResult = TestScenarioFactory.createCompleteWorkflowScenario(testContext.testId);
      expect(scenarioResult.isSuccess).toBe(true);
      const { model } = scenarioResult.value;
      
      await repository.save(model);

      // Act & Assert: Measure complete workflow retrieval performance
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const retrieveResult = await repository.findById(model.modelId);
          expect(retrieveResult.isSuccess).toBe(true);
          expect(retrieveResult.value).toBeDefined();
          
          const retrievedModel = retrieveResult.value!;
          expect(retrievedModel.nodes.size).toBe(model.nodes.size);
          expect(retrievedModel.actionNodes.size).toBe(model.actionNodes.size);
          
          return retrievedModel;
        },
        PERFORMANCE_THRESHOLDS.COMPLEX_QUERY
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`Complete workflow retrieval took ${performanceResult.value.duration.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Access Performance', () => {
    test('Should_HandleConcurrentReads_WithinPerformanceThreshold', async () => {
      // Arrange: Create model for concurrent access
      const modelResult = FunctionModelTestFactory.create({ testId: testContext.testId });
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value;
      
      await repository.save(model);

      // Act & Assert: Measure concurrent read performance
      const concurrentReads = 10;
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const readPromises = Array.from({ length: concurrentReads }, () => 
            repository.findById(model.modelId)
          );
          
          const results = await Promise.all(readPromises);
          
          // Verify all reads succeeded
          results.forEach(result => {
            expect(result.isSuccess).toBe(true);
            expect(result.value).toBeDefined();
          });
          
          return results;
        },
        PERFORMANCE_THRESHOLDS.BATCH_OPERATION
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`${concurrentReads} concurrent reads took ${performanceResult.value.duration.toFixed(2)}ms`);
      console.log(`Average per read: ${(performanceResult.value.duration / concurrentReads).toFixed(2)}ms`);
    });

    test('Should_HandleConcurrentWrites_WithinPerformanceThreshold', async () => {
      // Arrange: Create base models for concurrent writes
      const concurrentWrites = 5;
      const models = Array.from({ length: concurrentWrites }, (_, i) => {
        const modelResult = FunctionModelTestFactory.create({ 
          testId: `${testContext.testId}-concurrent-${i}` 
        });
        expect(modelResult.isSuccess).toBe(true);
        return modelResult.value;
      });

      // Act & Assert: Measure concurrent write performance
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const writePromises = models.map(model => repository.save(model));
          const results = await Promise.all(writePromises);
          
          // Verify all writes succeeded
          results.forEach(result => {
            expect(result.isSuccess).toBe(true);
          });
          
          return results;
        },
        PERFORMANCE_THRESHOLDS.BATCH_OPERATION
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`${concurrentWrites} concurrent writes took ${performanceResult.value.duration.toFixed(2)}ms`);
    });

    test('Should_HandleMixedOperations_WithinPerformanceThreshold', async () => {
      // Arrange: Create models for mixed operations
      const existingModels = await Promise.all(
        Array.from({ length: 3 }, async (_, i) => {
          const modelResult = FunctionModelTestFactory.create({ 
            testId: `${testContext.testId}-existing-${i}` 
          });
          expect(modelResult.isSuccess).toBe(true);
          const model = modelResult.value;
          await repository.save(model);
          return model;
        })
      );

      const newModels = Array.from({ length: 2 }, (_, i) => {
        const modelResult = FunctionModelTestFactory.create({ 
          testId: `${testContext.testId}-new-${i}` 
        });
        expect(modelResult.isSuccess).toBe(true);
        return modelResult.value;
      });

      // Act & Assert: Measure mixed operations performance
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const operations = [
            // Reads
            ...existingModels.map(model => () => repository.findById(model.modelId)),
            // Writes
            ...newModels.map(model => () => repository.save(model)),
            // Updates
            ...existingModels.slice(0, 2).map(model => () => {
              (model as any).description = `Updated - ${Date.now()}`;
              return repository.save(model);
            })
          ];

          // Shuffle operations to simulate real-world access patterns
          const shuffledOps = operations.sort(() => Math.random() - 0.5);
          const results = await Promise.all(shuffledOps.map(op => op()));
          
          // Verify all operations succeeded
          results.forEach(result => {
            expect(result.isSuccess).toBe(true);
          });
          
          return results;
        },
        PERFORMANCE_THRESHOLDS.BATCH_OPERATION
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`Mixed operations took ${performanceResult.value.duration.toFixed(2)}ms`);
    });
  });

  describe('Scalability Testing', () => {
    test('Should_MaintainPerformance_WithIncreasingDataVolume', async () => {
      const dataSizes = [5, 10, 20];
      const performanceMetrics: Array<{ size: number; duration: number }> = [];

      for (const size of dataSizes) {
        // Arrange: Create data set of specified size
        const models = Array.from({ length: size }, (_, i) => {
          const modelResult = FunctionModelTestFactory.create({ 
            testId: `${testContext.testId}-scale-${size}-${i}` 
          });
          expect(modelResult.isSuccess).toBe(true);
          return modelResult.value;
        });

        // Save all models first
        for (const model of models) {
          await repository.save(model);
        }

        // Act: Measure query performance at this scale
        const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
          async () => {
            const searchResult = await repository.findByNamePattern(`%${testContext.testId}-scale-${size}%`);
            expect(searchResult.isSuccess).toBe(true);
            expect(searchResult.value.length).toBeGreaterThanOrEqual(size);
            return searchResult.value;
          },
          PERFORMANCE_THRESHOLDS.FULL_SCAN
        );

        expect(performanceResult.isSuccess).toBe(true);
        performanceMetrics.push({ size, duration: performanceResult.value.duration });
        
        console.log(`Query with ${size} records took ${performanceResult.value.duration.toFixed(2)}ms`);
      }

      // Assert: Performance should scale reasonably (not exponentially)
      // Check that performance degradation is reasonable
      for (let i = 1; i < performanceMetrics.length; i++) {
        const prev = performanceMetrics[i - 1];
        const curr = performanceMetrics[i];
        
        const scaleFactor = curr.size / prev.size;
        const performanceFactor = curr.duration / prev.duration;
        
        // Performance should not degrade more than quadratically with data size
        expect(performanceFactor).toBeLessThan(scaleFactor * scaleFactor);
        
        console.log(`Scale factor: ${scaleFactor.toFixed(2)}, Performance factor: ${performanceFactor.toFixed(2)}`);
      }
    });

    test('Should_HandleMemoryEfficientQueries_WithLargeResults', async () => {
      // Arrange: Create a reasonable number of models for memory testing
      const largeDatasetSize = 50;
      const models = await Promise.all(
        Array.from({ length: largeDatasetSize }, async (_, i) => {
          const modelResult = FunctionModelTestFactory.create({ 
            testId: `${testContext.testId}-memory-${i}` 
          });
          expect(modelResult.isSuccess).toBe(true);
          const model = modelResult.value;
          
          // Add some bulk to each model
          (model as any).metadata = {
            ...model.metadata,
            bulkData: Array.from({ length: 100 }, (_, j) => ({
              id: j,
              data: `bulk-data-item-${j}`,
              timestamp: Date.now() + j
            }))
          };
          
          await repository.save(model);
          return model;
        })
      );

      // Act & Assert: Measure memory-efficient query performance
      const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
        async () => {
          const findAllResult = await repository.findAll();
          expect(findAllResult.isSuccess).toBe(true);
          
          const ourModels = findAllResult.value.filter(m => 
            m.modelId.includes(`${testContext.testId}-memory`)
          );
          expect(ourModels.length).toBe(largeDatasetSize);
          
          return ourModels;
        },
        PERFORMANCE_THRESHOLDS.FULL_SCAN
      );

      expect(performanceResult.isSuccess).toBe(true);
      console.log(`Large result set query took ${performanceResult.value.duration.toFixed(2)}ms`);
    });
  });

  describe('Performance Regression Detection', () => {
    test('Should_DocumentBaselinePerformance_ForRegression', async () => {
      // This test establishes baseline metrics for future regression testing
      const baselineOperations = {
        singleInsert: async () => {
          const modelResult = FunctionModelTestFactory.create({ testId: `${testContext.testId}-baseline-insert` });
          return repository.save(modelResult.value);
        },
        
        singleSelect: async () => {
          const modelResult = FunctionModelTestFactory.create({ testId: `${testContext.testId}-baseline-select` });
          await repository.save(modelResult.value);
          return repository.findById(modelResult.value.modelId);
        },
        
        patternSearch: async () => {
          const modelResult = FunctionModelTestFactory.create({ testId: `${testContext.testId}-baseline-search` });
          await repository.save(modelResult.value);
          return repository.findByNamePattern(`%${testContext.testId}-baseline%`);
        }
      };

      const baselines: Record<string, number> = {};

      for (const [operation, func] of Object.entries(baselineOperations)) {
        const performanceResult = await DatabaseTestHelpers.measureQueryPerformance(
          func,
          10000 // Generous timeout for baseline
        );
        
        expect(performanceResult.isSuccess).toBe(true);
        baselines[operation] = performanceResult.value.duration;
        
        console.log(`Baseline ${operation}: ${performanceResult.value.duration.toFixed(2)}ms`);
      }

      // Store baselines for comparison (in a real scenario, these would be stored persistently)
      expect(baselines.singleInsert).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_INSERT);
      expect(baselines.singleSelect).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_SELECT);
      expect(baselines.patternSearch).toBeLessThan(PERFORMANCE_THRESHOLDS.INDEX_SCAN);
    });
  });
});