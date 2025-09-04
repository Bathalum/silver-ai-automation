/**
 * TDD Test Specification: Container Service Resolution
 * 
 * Defines expected behavior for proper service resolution with dependency wiring
 * These tests act as Boundary Filters ensuring dependencies are correctly resolved
 * 
 * RED PHASE: All tests should FAIL initially - this validates expected behavior before implementation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  Container, 
  ContainerScope,
  ServiceTokens
} from '@/lib/infrastructure/di/container';
import { FunctionModelModule, createFunctionModelContainer } from '@/lib/infrastructure/di/function-model-module';
import { Result } from '@/lib/domain/shared/result';

describe('Container Service Resolution - TDD Specification', () => {
  let container: Container;
  let scope: ContainerScope;

  beforeEach(() => {
    container = new Container();
    scope = container.createScope();
  });

  describe('resolve_RegisteredService_ShouldReturnSuccessResult', () => {
    it('should resolve simple service without dependencies', async () => {
      // Arrange: Register simple service
      const testToken = Symbol('SimpleService');
      const expectedService = { name: 'SimpleService', value: 42 };
      container.registerSingleton(testToken, () => expectedService);

      // Act: Resolve service
      const result = await container.resolve(testToken);

      // Assert: Should return success with correct service
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(expectedService);
      expect(result.value.name).toBe('SimpleService');
      expect(result.value.value).toBe(42);
    });

    it('should resolve service with single dependency', async () => {
      // Arrange: Register dependent services
      const dependencyToken = Symbol('Dependency');
      const serviceToken = Symbol('Service');
      
      const dependency = { name: 'Dependency', data: 'dependency-data' };
      const serviceFactory = async (container: Container) => {
        const dep = await container.resolve(dependencyToken);
        if (dep.isFailure) throw new Error('Failed to resolve dependency');
        
        return {
          name: 'Service',
          dependency: dep.value,
          process: (input: string) => `${dep.value.data}-${input}`
        };
      };

      container.registerSingleton(dependencyToken, () => dependency);
      container.registerTransient(serviceToken, serviceFactory);

      // Act: Resolve service
      const result = await container.resolve(serviceToken);

      // Assert: Should resolve with dependency injected
      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('Service');
      expect(result.value.dependency).toBe(dependency);
      expect(result.value.process('test')).toBe('dependency-data-test');
    });

    it('should resolve service with multiple dependencies', async () => {
      // Arrange: Register service with multiple dependencies
      const dep1Token = Symbol('Dependency1');
      const dep2Token = Symbol('Dependency2');
      const dep3Token = Symbol('Dependency3');
      const serviceToken = Symbol('ComplexService');

      const dep1 = { name: 'Dep1', value: 'first' };
      const dep2 = { name: 'Dep2', value: 'second' };
      const dep3 = { name: 'Dep3', value: 'third' };

      const serviceFactory = async (container: Container) => {
        const [result1, result2, result3] = await Promise.all([
          container.resolve(dep1Token),
          container.resolve(dep2Token),
          container.resolve(dep3Token)
        ]);

        if (result1.isFailure || result2.isFailure || result3.isFailure) {
          throw new Error('Failed to resolve dependencies');
        }

        return {
          name: 'ComplexService',
          dependencies: [result1.value, result2.value, result3.value],
          combine: () => `${result1.value.value}-${result2.value.value}-${result3.value.value}`
        };
      };

      container.registerSingleton(dep1Token, () => dep1);
      container.registerSingleton(dep2Token, () => dep2);
      container.registerSingleton(dep3Token, () => dep3);
      container.registerTransient(serviceToken, serviceFactory);

      // Act: Resolve complex service
      const result = await container.resolve(serviceToken);

      // Assert: Should resolve with all dependencies
      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('ComplexService');
      expect(result.value.dependencies).toHaveLength(3);
      expect(result.value.combine()).toBe('first-second-third');
    });
  });

  describe('resolve_UnregisteredService_ShouldReturnFailureResult', () => {
    it('should return failure for unregistered service', async () => {
      // Arrange: Token for service that was never registered
      const unregisteredToken = Symbol('UnregisteredService');

      // Act: Attempt to resolve unregistered service
      const result = await container.resolve(unregisteredToken);

      // Assert: Should return failure
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Service not registered');
      expect(result.error).toContain('UnregisteredService');
    });

    it('should return failure when dependency fails to resolve', async () => {
      // Arrange: Service with unresolvable dependency
      const missingDepToken = Symbol('MissingDependency');
      const serviceToken = Symbol('ServiceWithMissingDep');
      
      const serviceFactory = async (container: Container) => {
        const dep = await container.resolve(missingDepToken);
        if (dep.isFailure) throw new Error(`Dependency resolution failed: ${dep.error}`);
        return { name: 'Service', dependency: dep.value };
      };

      container.registerTransient(serviceToken, serviceFactory);

      // Act: Resolve service with missing dependency
      const result = await container.resolve(serviceToken);

      // Assert: Should return failure due to missing dependency
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Failed to create transient instance');
      expect(result.error).toContain('Dependency resolution failed');
    });
  });

  describe('resolve_CircularDependency_ShouldHandleGracefully', () => {
    it('should detect and handle circular dependencies', async () => {
      // Arrange: Create circular dependency scenario
      const serviceAToken = Symbol('ServiceA');
      const serviceBToken = Symbol('ServiceB');

      const serviceAFactory = async (container: Container) => {
        const serviceB = await container.resolve(serviceBToken);
        if (serviceB.isFailure) throw new Error('ServiceA needs ServiceB');
        return { name: 'ServiceA', dependsOn: serviceB.value };
      };

      const serviceBFactory = async (container: Container) => {
        const serviceA = await container.resolve(serviceAToken);
        if (serviceA.isFailure) throw new Error('ServiceB needs ServiceA');
        return { name: 'ServiceB', dependsOn: serviceA.value };
      };

      container.registerTransient(serviceAToken, serviceAFactory);
      container.registerTransient(serviceBToken, serviceBFactory);

      // Act: Attempt to resolve circular dependency
      const resultA = await container.resolve(serviceAToken);
      const resultB = await container.resolve(serviceBToken);

      // Assert: Should fail gracefully (implementation detail - could be timeout, stack overflow detection, etc.)
      expect(resultA.isFailure || resultB.isFailure).toBe(true);
      // Note: Actual circular dependency detection strategy will be defined during implementation
    });
  });

  describe('resolve_AsyncServiceFactory_ShouldHandleAsyncResolution', () => {
    it('should resolve services with async factories', async () => {
      // Arrange: Service with async initialization
      const serviceToken = Symbol('AsyncService');
      const asyncFactory = async (container: Container) => {
        // Simulate async initialization (e.g., database connection)
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          name: 'AsyncService',
          initialized: true,
          timestamp: Date.now()
        };
      };

      container.registerSingleton(serviceToken, asyncFactory);

      // Act: Resolve async service
      const result = await container.resolve(serviceToken);

      // Assert: Should resolve successfully
      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('AsyncService');
      expect(result.value.initialized).toBe(true);
      expect(typeof result.value.timestamp).toBe('number');
    });

    it('should handle async factory errors gracefully', async () => {
      // Arrange: Async factory that throws
      const serviceToken = Symbol('FailingAsyncService');
      const failingFactory = async (container: Container) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async initialization failed');
      };

      container.registerTransient(serviceToken, failingFactory);

      // Act: Resolve failing async service
      const result = await container.resolve(serviceToken);

      // Assert: Should return failure
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Failed to create transient instance');
      expect(result.error).toContain('Async initialization failed');
    });
  });

  describe('resolve_WithScope_ShouldRespectScopeLifetime', () => {
    it('should resolve scoped services within scope', async () => {
      // Arrange: Register scoped service
      const scopedToken = Symbol('ScopedService');
      let instanceCount = 0;
      
      const scopedFactory = (container: Container) => ({
        name: 'ScopedService',
        instanceId: ++instanceCount,
        getValue: () => `instance-${instanceCount}`
      });

      container.registerScoped(scopedToken, scopedFactory);

      // Act: Resolve within scope
      const result = await scope.resolve(scopedToken);

      // Assert: Should resolve successfully
      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('ScopedService');
      expect(result.value.instanceId).toBe(1);
      expect(result.value.getValue()).toBe('instance-1');
    });

    it('should share scoped instance within same scope', async () => {
      // Arrange: Register scoped service
      const scopedToken = Symbol('ScopedService');
      let instanceCount = 0;
      
      container.registerScoped(scopedToken, () => ({ 
        name: 'ScopedService', 
        instanceId: ++instanceCount 
      }));

      // Act: Resolve twice within same scope
      const result1 = await scope.resolve(scopedToken);
      const result2 = await scope.resolve(scopedToken);

      // Assert: Should return same instance
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value).toBe(result2.value); // Same object reference
      expect(result1.value.instanceId).toBe(1); // Only one instance created
    });

    it('should isolate scoped instances between different scopes', async () => {
      // Arrange: Register scoped service
      const scopedToken = Symbol('ScopedService');
      let instanceCount = 0;
      
      container.registerScoped(scopedToken, () => ({ 
        name: 'ScopedService', 
        instanceId: ++instanceCount 
      }));

      const scope1 = container.createScope();
      const scope2 = container.createScope();

      // Act: Resolve in different scopes
      const result1 = await scope1.resolve(scopedToken);
      const result2 = await scope2.resolve(scopedToken);

      // Assert: Should create different instances
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value).not.toBe(result2.value); // Different object references
      expect(result1.value.instanceId).toBe(1);
      expect(result2.value.instanceId).toBe(2);
    });
  });

  describe('resolve_ParentChildContainers_ShouldResolveFromCorrectContainer', () => {
    it('should resolve from child container first, then fallback to parent', async () => {
      // Arrange: Setup parent and child containers
      const serviceToken = Symbol('Service');
      
      // Parent container service
      container.registerSingleton(serviceToken, () => ({ source: 'parent', value: 'parent-value' }));
      
      // Child container
      const childContainer = container.createChild();

      // Act: Resolve from child (should get parent's service)
      const result = await childContainer.resolve(serviceToken);

      // Assert: Should resolve parent's service
      expect(result.isSuccess).toBe(true);
      expect(result.value.source).toBe('parent');
      expect(result.value.value).toBe('parent-value');
    });

    it('should prefer child registration over parent', async () => {
      // Arrange: Register in both parent and child
      const serviceToken = Symbol('Service');
      
      container.registerSingleton(serviceToken, () => ({ source: 'parent' }));
      const childContainer = container.createChild();
      childContainer.registerSingleton(serviceToken, () => ({ source: 'child' }));

      // Act: Resolve from child
      const childResult = await childContainer.resolve(serviceToken);
      const parentResult = await container.resolve(serviceToken);

      // Assert: Child should use its own registration, parent unchanged
      expect(childResult.isSuccess).toBe(true);
      expect(childResult.value.source).toBe('child');
      
      expect(parentResult.isSuccess).toBe(true);
      expect(parentResult.value.source).toBe('parent');
    });

    it('should resolve dependencies from correct container in hierarchy', async () => {
      // Arrange: Complex dependency resolution across containers
      const depToken = Symbol('Dependency');
      const serviceToken = Symbol('Service');

      // Register dependency in parent
      container.registerSingleton(depToken, () => ({ name: 'ParentDependency' }));

      // Register service in child that depends on parent's dependency
      const childContainer = container.createChild();
      const serviceFactory = async (container: Container) => {
        const dep = await container.resolve(depToken);
        if (dep.isFailure) throw new Error('Failed to resolve dependency');
        return { name: 'ChildService', dependency: dep.value };
      };
      childContainer.registerTransient(serviceToken, serviceFactory);

      // Act: Resolve from child
      const result = await childContainer.resolve(serviceToken);

      // Assert: Should resolve child service with parent dependency
      expect(result.isSuccess).toBe(true);
      expect(result.value.name).toBe('ChildService');
      expect(result.value.dependency.name).toBe('ParentDependency');
    });
  });
});

/**
 * FUNCTION MODEL INTEGRATION RESOLUTION TESTS
 * Tests specific to resolving services from the Function Model module
 */
describe('Function Model Service Resolution - TDD Specification', () => {
  let container: Container;
  let mockSupabaseClient: any;

  beforeEach(() => {
    container = new Container();
    
    // Create mock Supabase client with all necessary methods
    mockSupabaseClient = {
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
  });

  describe('resolveFunctionModelUseCases_WithValidDependencies_ShouldResolveSuccessfully', () => {
    it('should resolve CreateFunctionModelUseCase with all dependencies', async () => {
      // Arrange: Setup container with Function Model module
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      
      const functionModelModule = new FunctionModelModule();
      functionModelModule.register(container);
      
      const scope = container.createScope();

      // Act: Resolve use case
      const result = await scope.resolve(ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE);

      // Assert: Should resolve with all dependencies
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('execute');
      expect(typeof result.value.execute).toBe('function');
    });

    it('should resolve UpdateFunctionModelUseCase with repository and event bus', async () => {
      // Arrange: Setup container
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      
      const functionModelModule = new FunctionModelModule();
      functionModelModule.register(container);
      
      const scope = container.createScope();

      // Act: Resolve use case
      const result = await scope.resolve(ServiceTokens.UPDATE_FUNCTION_MODEL_USE_CASE);

      // Assert: Should resolve successfully
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('execute');
    });

    it('should resolve PublishFunctionModelUseCase with all validation services', async () => {
      // Arrange: Setup container
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      
      const functionModelModule = new FunctionModelModule();
      functionModelModule.register(container);
      
      const scope = container.createScope();

      // Act: Resolve use case
      const result = await scope.resolve(ServiceTokens.PUBLISH_FUNCTION_MODEL_USE_CASE);

      // Assert: Should resolve successfully
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('execute');
    });

    it('should resolve ValidateWorkflowStructureUseCase with all validation services', async () => {
      // Arrange: Setup container
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      
      const functionModelModule = new FunctionModelModule();
      functionModelModule.register(container);
      
      const scope = container.createScope();

      // Act: Resolve complex use case with many dependencies
      const result = await scope.resolve(ServiceTokens.VALIDATE_WORKFLOW_STRUCTURE_USE_CASE);

      // Assert: Should resolve with all validation services
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('execute');
    });
  });

  describe('resolveInfrastructureServices_WithConfiguration_ShouldResolveWithCorrectSettings', () => {
    it('should resolve FunctionModelRepository with Supabase client', async () => {
      // Arrange: Setup container
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      
      const functionModelModule = new FunctionModelModule();
      functionModelModule.register(container);
      
      const scope = container.createScope();

      // Act: Resolve repository
      const result = await scope.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);

      // Assert: Should resolve with Supabase client
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('save');
      expect(result.value).toHaveProperty('findById');
      expect(result.value).toHaveProperty('findByUserId');
    });

    it('should resolve CacheService with configuration', async () => {
      // Arrange: Setup container
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      
      const functionModelModule = new FunctionModelModule();
      functionModelModule.register(container);

      // Act: Resolve cache service
      const result = await container.resolve(ServiceTokens.CACHE_SERVICE);

      // Assert: Should resolve with configuration
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('get');
      expect(result.value).toHaveProperty('set');
      expect(result.value).toHaveProperty('delete');
      expect(result.value).toHaveProperty('clear');
    });

    it('should resolve EventBus with Supabase client', async () => {
      // Arrange: Setup container
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      
      const functionModelModule = new FunctionModelModule();
      functionModelModule.register(container);

      // Act: Resolve event bus
      const result = await container.resolve(ServiceTokens.EVENT_BUS);

      // Assert: Should resolve with Supabase integration
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('publish');
      expect(result.value).toHaveProperty('subscribe');
    });
  });

  describe('resolveDomainServices_TransientLifetime_ShouldCreateNewInstances', () => {
    it('should resolve validation services as transient instances', async () => {
      // Arrange: Setup container
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      
      const functionModelModule = new FunctionModelModule();
      functionModelModule.register(container);

      // Act: Resolve same service twice
      const result1 = await container.resolve(ServiceTokens.BUSINESS_RULE_VALIDATION_SERVICE);
      const result2 = await container.resolve(ServiceTokens.BUSINESS_RULE_VALIDATION_SERVICE);

      // Assert: Should be different instances (transient)
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value).not.toBe(result2.value); // Different object references
      expect(result1.value).toHaveProperty('validate');
      expect(result2.value).toHaveProperty('validate');
    });

    it('should resolve orchestration services with correct interfaces', async () => {
      // Arrange: Setup container
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      
      const functionModelModule = new FunctionModelModule();
      functionModelModule.register(container);

      // Act: Resolve orchestration services
      const workflowService = await container.resolve(ServiceTokens.WORKFLOW_ORCHESTRATION_SERVICE);
      const nodeService = await container.resolve(ServiceTokens.NODE_DEPENDENCY_SERVICE);

      // Assert: Should resolve with expected interfaces
      expect(workflowService.isSuccess).toBe(true);
      expect(nodeService.isSuccess).toBe(true);
      expect(workflowService.value).toHaveProperty('orchestrate');
      expect(nodeService.value).toHaveProperty('resolveDependencies');
    });
  });

  describe('createFunctionModelContainer_WithSupabaseClient_ShouldResolveAllServices', () => {
    it('should create fully configured container with helper function', async () => {
      // Arrange & Act: Use helper function to create container
      const configuredContainer = await createFunctionModelContainer(mockSupabaseClient);
      const scope = configuredContainer.createScope();

      // Assert: All major services should be registered and resolvable
      const repositoryResult = await scope.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
      const cacheResult = await configuredContainer.resolve(ServiceTokens.CACHE_SERVICE);
      const eventBusResult = await configuredContainer.resolve(ServiceTokens.EVENT_BUS);
      const createUseCaseResult = await scope.resolve(ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE);

      expect(repositoryResult.isSuccess).toBe(true);
      expect(cacheResult.isSuccess).toBe(true);
      expect(eventBusResult.isSuccess).toBe(true);
      expect(createUseCaseResult.isSuccess).toBe(true);

      // All services should have expected interfaces
      expect(repositoryResult.value).toHaveProperty('save');
      expect(cacheResult.value).toHaveProperty('get');
      expect(eventBusResult.value).toHaveProperty('publish');
      expect(createUseCaseResult.value).toHaveProperty('execute');
    });
  });
});