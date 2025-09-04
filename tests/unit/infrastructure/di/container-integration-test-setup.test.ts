/**
 * TDD Test Specification: Container Integration Test Setup
 * 
 * Defines expected behavior for DI container in test environments
 * These tests ensure proper test setup, mocking, and Clean Architecture compliance
 * 
 * RED PHASE: All tests should FAIL initially - this validates expected behavior before implementation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  Container, 
  ContainerBuilder,
  ServiceTokens,
  ServiceModule
} from '@/lib/infrastructure/di/container';
import { FunctionModelModule, createFunctionModelContainer } from '@/lib/infrastructure/di/function-model-module';
import { TestData, TestFactories } from '@/tests/utils/test-fixtures';
import { Result } from '@/lib/domain/shared/result';

describe('Container Integration Test Setup - TDD Specification', () => {
  let container: Container;
  let testScope: any;

  beforeEach(() => {
    container = new Container();
    testScope = container.createScope();
  });

  afterEach(async () => {
    if (testScope?.dispose) {
      await testScope.dispose();
    }
    if (container?.dispose) {
      await container.dispose();
    }
  });

  describe('createTestContainer_WithMockDependencies_ShouldProvideCleanTestEnvironment', () => {
    it('should create isolated test container with mock implementations', async () => {
      // Arrange: Create test container with mocks
      const testContainer = createTestContainerWithMocks();

      // Act: Resolve core services
      const repositoryResult = await testContainer.createScope().resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
      const eventBusResult = await testContainer.resolve(ServiceTokens.EVENT_BUS);
      const cacheResult = await testContainer.resolve(ServiceTokens.CACHE_SERVICE);

      // Assert: All services should resolve with mock implementations
      expect(repositoryResult.isSuccess).toBe(true);
      expect(eventBusResult.isSuccess).toBe(true);
      expect(cacheResult.isSuccess).toBe(true);

      // Should be mock implementations (not real ones)
      expect(repositoryResult.value).toHaveProperty('save');
      expect(repositoryResult.value).toHaveProperty('findById');
      expect(repositoryResult.value._isMock).toBe(true); // Test marker

      expect(eventBusResult.value).toHaveProperty('publish');
      expect(eventBusResult.value).toHaveProperty('subscribe');
      expect(eventBusResult.value._isMock).toBe(true); // Test marker
    });

    it('should support dependency injection in test scenarios', async () => {
      // Arrange: Test container with specific test doubles
      const testContainer = new Container();
      
      // Mock repository that tracks calls
      const mockCalls: string[] = [];
      const mockRepository = {
        _isMock: true,
        save: jest.fn().mockImplementation(async (model) => {
          mockCalls.push(`save:${model.modelId}`);
          return Result.ok({ id: model.modelId });
        }),
        findById: jest.fn().mockImplementation(async (id) => {
          mockCalls.push(`findById:${id}`);
          return Result.ok(TestFactories.createValidModel());
        }),
        findByUserId: jest.fn().mockResolvedValue(Result.ok([])),
        update: jest.fn().mockResolvedValue(Result.ok({})),
        delete: jest.fn().mockResolvedValue(Result.ok(true))
      };

      // Mock event bus that tracks events
      const publishedEvents: any[] = [];
      const mockEventBus = {
        _isMock: true,
        publish: jest.fn().mockImplementation(async (event) => {
          publishedEvents.push(event);
          return Result.ok(undefined);
        }),
        subscribe: jest.fn().mockResolvedValue(Result.ok(() => {}))
      };

      // Register mocks
      testContainer.registerInstance(ServiceTokens.FUNCTION_MODEL_REPOSITORY, mockRepository);
      testContainer.registerInstance(ServiceTokens.EVENT_BUS, mockEventBus);

      // Create use case with mocked dependencies
      testContainer.registerTransient(ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE, async (c) => {
        const repo = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const events = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (repo.isFailure || events.isFailure) {
          throw new Error('Failed to resolve test dependencies');
        }

        return {
          execute: async (command: any) => {
            const model = TestFactories.createValidModel();
            const saveResult = await repo.value.save(model);
            if (saveResult.isSuccess) {
              await events.value.publish({ type: 'ModelCreated', modelId: model.modelId });
            }
            return saveResult;
          }
        };
      });

      const scope = testContainer.createScope();

      // Act: Execute use case
      const useCase = await scope.resolve(ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE);
      expect(useCase.isSuccess).toBe(true);
      
      const result = await useCase.value.execute({ name: 'Test Model' });

      // Assert: Should interact with mocks correctly
      expect(result.isSuccess).toBe(true);
      expect(mockCalls).toContain(expect.stringContaining('save:'));
      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0].type).toBe('ModelCreated');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should isolate tests from external dependencies', async () => {
      // Arrange: Test container without real external services
      const testContainer = new Container();
      
      // Mock external services to avoid real API calls
      const mockAIService = {
        _isMock: true,
        generateResponse: jest.fn().mockResolvedValue(Result.ok('Mock AI Response')),
        validateInput: jest.fn().mockResolvedValue(Result.ok(true))
      };

      const mockNotificationService = {
        _isMock: true,
        sendNotification: jest.fn().mockResolvedValue(Result.ok(true)),
        subscribe: jest.fn().mockResolvedValue(Result.ok(() => {}))
      };

      testContainer.registerInstance(ServiceTokens.AI_SERVICE_ADAPTER, mockAIService);
      testContainer.registerInstance(ServiceTokens.NOTIFICATION_SERVICE_ADAPTER, mockNotificationService);

      // Act: Resolve external services
      const aiResult = await testContainer.resolve(ServiceTokens.AI_SERVICE_ADAPTER);
      const notificationResult = await testContainer.resolve(ServiceTokens.NOTIFICATION_SERVICE_ADAPTER);

      // Assert: Should get mock implementations
      expect(aiResult.isSuccess).toBe(true);
      expect(notificationResult.isSuccess).toBe(true);
      expect(aiResult.value._isMock).toBe(true);
      expect(notificationResult.value._isMock).toBe(true);
      
      // Mock services should be functional
      const aiResponse = await aiResult.value.generateResponse('test prompt');
      expect(aiResponse.isSuccess).toBe(true);
      expect(aiResponse.value).toBe('Mock AI Response');
    });
  });

  describe('containerTestLifecycle_ProperSetupAndTeardown_ShouldManageResourcesCorrectly', () => {
    it('should properly setup container for each test', async () => {
      // Arrange: Fresh container for test
      const freshContainer = new Container();
      
      // Register test services
      const serviceToken = Symbol('TestService');
      let setupCount = 0;
      
      freshContainer.registerTransient(serviceToken, () => ({
        name: 'TestService',
        setupId: ++setupCount,
        isSetup: true
      }));

      // Act: Use container in test
      const result = await freshContainer.resolve(serviceToken);

      // Assert: Should have fresh setup
      expect(result.isSuccess).toBe(true);
      expect(result.value.setupId).toBe(1);
      expect(result.value.isSetup).toBe(true);
    });

    it('should properly dispose test resources after test', async () => {
      // Arrange: Container with disposable resources
      const testContainer = new Container();
      const disposedResources: string[] = [];
      
      const disposableToken = Symbol('DisposableResource');
      testContainer.registerSingleton(disposableToken, () => ({
        name: 'DisposableResource',
        id: 'test-resource-123',
        dispose: async function(this: any) {
          disposedResources.push(this.id);
        }
      }));

      // Act: Use resource then dispose container
      const result = await testContainer.resolve(disposableToken);
      expect(result.isSuccess).toBe(true);
      
      await testContainer.dispose();

      // Assert: Resource should be disposed
      expect(disposedResources).toContain('test-resource-123');
    });

    it('should handle scope lifecycle in integration tests', async () => {
      // Arrange: Scoped services for integration test
      const integrationContainer = createTestContainerWithMocks();
      const testScope = integrationContainer.createScope();
      
      const scopeTracker: string[] = [];
      const scopedToken = Symbol('ScopedTestService');
      
      integrationContainer.registerScoped(scopedToken, () => ({
        name: 'ScopedTestService',
        scopeId: Math.random().toString(36),
        dispose: async function(this: any) {
          scopeTracker.push(`disposed:${this.scopeId}`);
        }
      }));

      // Act: Use scoped service then dispose scope
      const result = await testScope.resolve(scopedToken);
      expect(result.isSuccess).toBe(true);
      
      const scopeId = result.value.scopeId;
      await testScope.dispose();

      // Assert: Scoped service should be disposed
      expect(scopeTracker).toContain(`disposed:${scopeId}`);
    });
  });

  describe('mockServiceRegistration_TestDoubles_ShouldReplaceRealImplementations', () => {
    it('should allow easy registration of test doubles', () => {
      // Arrange: Create builder for test container
      const testBuilder = new ContainerBuilder();
      
      // Test doubles for external dependencies
      const mockSupabaseClient = createMockSupabaseClient();
      const mockCacheService = createMockCacheService();
      const mockEventBus = createMockEventBus();

      // Act: Register test doubles
      testBuilder
        .registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient)
        .registerInstance(ServiceTokens.CACHE_SERVICE, mockCacheService)
        .registerInstance(ServiceTokens.EVENT_BUS, mockEventBus);

      const testContainer = testBuilder.build();

      // Assert: Test doubles should be registered
      expect(testContainer.isRegistered(ServiceTokens.SUPABASE_CLIENT)).toBe(true);
      expect(testContainer.isRegistered(ServiceTokens.CACHE_SERVICE)).toBe(true);
      expect(testContainer.isRegistered(ServiceTokens.EVENT_BUS)).toBe(true);
    });

    it('should support partial mocking with real domain services', async () => {
      // Arrange: Mix of real domain services and mock infrastructure
      const testContainer = new Container();
      
      // Real domain services (no mocking needed - pure functions)
      const module = new FunctionModelModule();
      
      // Mock infrastructure dependencies
      const mockSupabaseClient = createMockSupabaseClient();
      testContainer.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      
      // Register domain services (these stay real)
      module.register(testContainer);

      // Act: Resolve mixed services
      const domainService = await testContainer.resolve(ServiceTokens.BUSINESS_RULE_VALIDATION_SERVICE);
      const infraService = await testContainer.createScope().resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);

      // Assert: Domain service should be real, infrastructure mocked
      expect(domainService.isSuccess).toBe(true);
      expect(infraService.isSuccess).toBe(true);
      expect(domainService.value).toHaveProperty('validate');
      expect(infraService.value._isMock).toBe(true); // Should be mocked
    });

    it('should enable spy and stub patterns for behavior testing', async () => {
      // Arrange: Create spies for behavior verification
      const testContainer = new Container();
      
      // Create spy repository that tracks method calls
      const repositorySpies = {
        save: jest.fn().mockResolvedValue(Result.ok({ id: 'saved-id' })),
        findById: jest.fn().mockResolvedValue(Result.ok(TestFactories.createValidModel())),
        findByUserId: jest.fn().mockResolvedValue(Result.ok([])),
        update: jest.fn().mockResolvedValue(Result.ok({})),
        delete: jest.fn().mockResolvedValue(Result.ok(true)),
        _isMock: true
      };

      // Create stub event bus with preset responses
      const eventBusStub = {
        publish: jest.fn().mockResolvedValue(Result.ok(undefined)),
        subscribe: jest.fn().mockResolvedValue(Result.ok(() => {})),
        _isMock: true
      };

      testContainer.registerInstance(ServiceTokens.FUNCTION_MODEL_REPOSITORY, repositorySpies);
      testContainer.registerInstance(ServiceTokens.EVENT_BUS, eventBusStub);

      // Create use case with spied dependencies
      testContainer.registerTransient(ServiceTokens.UPDATE_FUNCTION_MODEL_USE_CASE, async (c) => {
        const repo = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const events = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (repo.isFailure || events.isFailure) {
          throw new Error('Failed to resolve dependencies');
        }

        return {
          execute: async (command: any) => {
            const model = TestFactories.createValidModel();
            const updateResult = await repo.value.update(model);
            if (updateResult.isSuccess) {
              await events.value.publish({ type: 'ModelUpdated', modelId: model.modelId });
            }
            return updateResult;
          }
        };
      });

      const scope = testContainer.createScope();

      // Act: Execute use case to test behavior
      const useCase = await scope.resolve(ServiceTokens.UPDATE_FUNCTION_MODEL_USE_CASE);
      expect(useCase.isSuccess).toBe(true);
      
      await useCase.value.execute({ modelId: 'test-id', changes: {} });

      // Assert: Should verify correct interaction patterns
      expect(repositorySpies.update).toHaveBeenCalledTimes(1);
      expect(eventBusStub.publish).toHaveBeenCalledTimes(1);
      expect(eventBusStub.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ModelUpdated',
          modelId: expect.any(String)
        })
      );
    });
  });

  describe('integrationTestScenarios_CompleteWorkflows_ShouldExecuteEndToEnd', () => {
    it('should support complete use case integration testing', async () => {
      // Arrange: Full integration test setup
      const integrationContainer = createTestContainerWithMocks();
      const integrationScope = integrationContainer.createScope();

      // Override specific mocks with test behavior
      const mockRepository = await integrationContainer.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
      const mockEventBus = await integrationContainer.resolve(ServiceTokens.EVENT_BUS);

      expect(mockRepository.isSuccess).toBe(true);
      expect(mockEventBus.isSuccess).toBe(true);

      // Setup test data expectations
      const testModel = TestFactories.createValidModel();
      mockRepository.value.save.mockResolvedValue(Result.ok(testModel));

      // Register complete use case with all dependencies
      integrationContainer.registerTransient(ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE, async (c) => {
        const repo = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const events = await c.resolve(ServiceTokens.EVENT_BUS);
        const validation = await c.resolve(ServiceTokens.BUSINESS_RULE_VALIDATION_SERVICE);
        
        if (repo.isFailure || events.isFailure || validation.isFailure) {
          throw new Error('Failed to resolve dependencies');
        }

        return {
          execute: async (command: any) => {
            // Validation step
            const validationResult = validation.value.validate(command);
            if (validationResult.isFailure) return validationResult;

            // Persistence step  
            const model = TestFactories.createValidModel();
            const saveResult = await repo.value.save(model);
            
            // Event publishing step
            if (saveResult.isSuccess) {
              await events.value.publish({ 
                type: 'ModelCreated', 
                modelId: model.modelId,
                userId: command.userId
              });
            }
            
            return saveResult;
          }
        };
      });

      // Act: Execute complete workflow
      const useCase = await integrationScope.resolve(ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE);
      expect(useCase.isSuccess).toBe(true);

      const result = await useCase.value.execute({
        name: TestData.VALID_MODEL_NAME,
        description: 'Integration test model',
        userId: TestData.VALID_USER_ID
      });

      // Assert: Complete workflow should execute successfully
      expect(result.isSuccess).toBe(true);
      expect(mockRepository.value.save).toHaveBeenCalledTimes(1);
      expect(mockEventBus.value.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ModelCreated',
          userId: TestData.VALID_USER_ID
        })
      );
    });

    it('should handle error scenarios in integration tests', async () => {
      // Arrange: Integration container with failure scenarios
      const integrationContainer = createTestContainerWithMocks();
      const integrationScope = integrationContainer.createScope();

      // Setup repository to fail
      const mockRepository = await integrationContainer.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
      expect(mockRepository.isSuccess).toBe(true);
      mockRepository.value.save.mockResolvedValue(Result.fail('Database connection failed'));

      // Create use case that should handle errors gracefully
      integrationContainer.registerTransient(ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE, async (c) => {
        const repo = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const events = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (repo.isFailure || events.isFailure) {
          throw new Error('Failed to resolve dependencies');
        }

        return {
          execute: async (command: any) => {
            const model = TestFactories.createValidModel();
            const saveResult = await repo.value.save(model);
            
            // Should not publish events on failure
            if (saveResult.isSuccess) {
              await events.value.publish({ type: 'ModelCreated', modelId: model.modelId });
            }
            
            return saveResult;
          }
        };
      });

      // Act: Execute workflow with failure
      const useCase = await integrationScope.resolve(ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE);
      expect(useCase.isSuccess).toBe(true);

      const result = await useCase.value.execute({
        name: TestData.VALID_MODEL_NAME,
        userId: TestData.VALID_USER_ID
      });

      // Assert: Should handle failure gracefully
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Database connection failed');
      
      // Event should not be published on failure
      const mockEventBus = await integrationContainer.resolve(ServiceTokens.EVENT_BUS);
      expect(mockEventBus.value.publish).not.toHaveBeenCalled();
    });
  });
});

/**
 * TEST UTILITY FUNCTIONS
 * Helper functions for creating consistent test setups
 */

function createTestContainerWithMocks(): Container {
  const testContainer = new Container();

  // Mock Supabase client
  const mockSupabaseClient = createMockSupabaseClient();
  testContainer.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);

  // Mock repository
  const mockRepository = {
    _isMock: true,
    save: jest.fn().mockResolvedValue(Result.ok({ id: 'mock-id' })),
    findById: jest.fn().mockResolvedValue(Result.ok(TestFactories.createValidModel())),
    findByUserId: jest.fn().mockResolvedValue(Result.ok([])),
    update: jest.fn().mockResolvedValue(Result.ok({})),
    delete: jest.fn().mockResolvedValue(Result.ok(true))
  };
  testContainer.registerInstance(ServiceTokens.FUNCTION_MODEL_REPOSITORY, mockRepository);

  // Mock event bus
  const mockEventBus = createMockEventBus();
  testContainer.registerInstance(ServiceTokens.EVENT_BUS, mockEventBus);

  // Mock cache service
  const mockCacheService = createMockCacheService();
  testContainer.registerInstance(ServiceTokens.CACHE_SERVICE, mockCacheService);

  // Register real domain services (these don't need mocking)
  const functionModelModule = new FunctionModelModule();
  functionModelModule.register(testContainer);

  return testContainer;
}

function createMockSupabaseClient() {
  return {
    _isMock: true,
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          limit: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null })
    },
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockResolvedValue({ error: null })
    })
  };
}

function createMockEventBus() {
  return {
    _isMock: true,
    publish: jest.fn().mockResolvedValue(Result.ok(undefined)),
    subscribe: jest.fn().mockResolvedValue(Result.ok(() => {}))
  };
}

function createMockCacheService() {
  const mockCache = new Map();
  return {
    _isMock: true,
    get: jest.fn().mockImplementation((key: string) => mockCache.get(key)),
    set: jest.fn().mockImplementation((key: string, value: any) => {
      mockCache.set(key, value);
      return Promise.resolve();
    }),
    delete: jest.fn().mockImplementation((key: string) => {
      mockCache.delete(key);
      return Promise.resolve(true);
    }),
    clear: jest.fn().mockImplementation(() => {
      mockCache.clear();
      return Promise.resolve();
    }),
    has: jest.fn().mockImplementation((key: string) => mockCache.has(key)),
    size: jest.fn().mockImplementation(() => mockCache.size)
  };
}