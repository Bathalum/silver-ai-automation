/**
 * TDD Test Specification: Container Lifetime Management
 * 
 * Defines expected behavior for proper lifetime management (Scoped vs Singleton vs Transient)
 * These tests ensure services are created, cached, and disposed according to their lifetime
 * 
 * RED PHASE: All tests should FAIL initially - this validates expected behavior before implementation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  Container, 
  ContainerScope,
  ServiceLifetime,
  ServiceTokens
} from '@/lib/infrastructure/di/container';
import { FunctionModelModule } from '@/lib/infrastructure/di/function-model-module';

describe('Container Lifetime Management - TDD Specification', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('SingletonLifetime_ServiceResolution_ShouldReuseInstances', () => {
    it('should create singleton instance only once across all resolutions', async () => {
      // Arrange: Singleton service with instance tracking
      const serviceToken = Symbol('SingletonService');
      let instanceCount = 0;
      let creationTimestamps: number[] = [];
      
      const singletonFactory = (container: Container) => {
        const timestamp = Date.now();
        creationTimestamps.push(timestamp);
        return {
          name: 'SingletonService',
          instanceId: ++instanceCount,
          createdAt: timestamp,
          getValue: () => `singleton-${instanceCount}`
        };
      };

      container.registerSingleton(serviceToken, singletonFactory);

      // Act: Resolve multiple times from container
      const result1 = await container.resolve(serviceToken);
      const result2 = await container.resolve(serviceToken);
      const result3 = await container.resolve(serviceToken);

      // Assert: Should return same instance every time
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result3.isSuccess).toBe(true);

      expect(result1.value).toBe(result2.value); // Same object reference
      expect(result2.value).toBe(result3.value); // Same object reference
      expect(result1.value.instanceId).toBe(1); // Only one instance created
      expect(creationTimestamps).toHaveLength(1); // Factory called only once
    });

    it('should return same singleton instance across different scopes', async () => {
      // Arrange: Singleton service
      const serviceToken = Symbol('SingletonService');
      let instanceCount = 0;
      
      container.registerSingleton(serviceToken, () => ({
        name: 'SingletonService',
        instanceId: ++instanceCount
      }));

      const scope1 = container.createScope();
      const scope2 = container.createScope();

      // Act: Resolve from different scopes
      const result1 = await scope1.resolve(serviceToken);
      const result2 = await scope2.resolve(serviceToken);
      const result3 = await container.resolve(serviceToken);

      // Assert: Should return same instance from all scopes and container
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result3.isSuccess).toBe(true);

      expect(result1.value).toBe(result2.value); // Same across scopes
      expect(result2.value).toBe(result3.value); // Same as container instance
      expect(result1.value.instanceId).toBe(1); // Only one instance created
    });

    it('should persist singleton across container hierarchy', async () => {
      // Arrange: Singleton in parent, resolve from child
      const serviceToken = Symbol('SingletonService');
      let instanceCount = 0;
      
      container.registerSingleton(serviceToken, () => ({
        name: 'SingletonService',
        instanceId: ++instanceCount,
        source: 'parent'
      }));

      const childContainer = container.createChild();

      // Act: Resolve from parent and child
      const parentResult = await container.resolve(serviceToken);
      const childResult = await childContainer.resolve(serviceToken);

      // Assert: Should return same instance from both containers
      expect(parentResult.isSuccess).toBe(true);
      expect(childResult.isSuccess).toBe(true);
      expect(parentResult.value).toBe(childResult.value); // Same object reference
      expect(parentResult.value.instanceId).toBe(1);
      expect(parentResult.value.source).toBe('parent');
    });
  });

  describe('ScopedLifetime_ServiceResolution_ShouldRespectScopeBoundaries', () => {
    it('should return same instance within single scope', async () => {
      // Arrange: Scoped service with instance tracking
      const serviceToken = Symbol('ScopedService');
      let instanceCount = 0;
      
      const scopedFactory = (container: Container) => ({
        name: 'ScopedService',
        instanceId: ++instanceCount,
        getValue: () => `scoped-${instanceCount}`
      });

      container.registerScoped(serviceToken, scopedFactory);
      const scope = container.createScope();

      // Act: Resolve multiple times within same scope
      const result1 = await scope.resolve(serviceToken);
      const result2 = await scope.resolve(serviceToken);
      const result3 = await scope.resolve(serviceToken);

      // Assert: Should return same instance within scope
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result3.isSuccess).toBe(true);

      expect(result1.value).toBe(result2.value); // Same object reference
      expect(result2.value).toBe(result3.value); // Same object reference
      expect(result1.value.instanceId).toBe(1); // Only one instance in scope
    });

    it('should create different instances for different scopes', async () => {
      // Arrange: Scoped service
      const serviceToken = Symbol('ScopedService');
      let instanceCount = 0;
      
      container.registerScoped(serviceToken, () => ({
        name: 'ScopedService',
        instanceId: ++instanceCount,
        scopeId: Math.random().toString(36)
      }));

      const scope1 = container.createScope();
      const scope2 = container.createScope();
      const scope3 = container.createScope();

      // Act: Resolve from different scopes
      const result1 = await scope1.resolve(serviceToken);
      const result2 = await scope2.resolve(serviceToken);
      const result3 = await scope3.resolve(serviceToken);

      // Assert: Should create different instances for each scope
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result3.isSuccess).toBe(true);

      expect(result1.value).not.toBe(result2.value); // Different objects
      expect(result2.value).not.toBe(result3.value); // Different objects
      expect(result1.value.instanceId).toBe(1);
      expect(result2.value.instanceId).toBe(2);
      expect(result3.value.instanceId).toBe(3);
    });

    it('should fail when resolving scoped service without scope', async () => {
      // Arrange: Scoped service
      const serviceToken = Symbol('ScopedService');
      container.registerScoped(serviceToken, () => ({ name: 'ScopedService' }));

      // Act: Attempt to resolve without scope
      const result = await container.resolve(serviceToken);

      // Assert: Should fail with appropriate error
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('requires a scope');
      expect(result.error).toContain('ScopedService');
    });

    it('should handle nested scoped dependencies correctly', async () => {
      // Arrange: Scoped service that depends on another scoped service
      const depToken = Symbol('ScopedDependency');
      const serviceToken = Symbol('ScopedService');
      let depInstanceCount = 0;
      let serviceInstanceCount = 0;

      const depFactory = (container: Container) => ({
        name: 'ScopedDependency',
        instanceId: ++depInstanceCount
      });

      const serviceFactory = async (container: Container) => {
        const dep = await container.resolve(depToken);
        if (dep.isFailure) throw new Error('Failed to resolve dependency');
        
        return {
          name: 'ScopedService',
          instanceId: ++serviceInstanceCount,
          dependency: dep.value
        };
      };

      container.registerScoped(depToken, depFactory);
      container.registerScoped(serviceToken, serviceFactory);
      
      const scope = container.createScope();

      // Act: Resolve service (should also resolve dependency within same scope)
      const result = await scope.resolve(serviceToken);

      // Assert: Should resolve with scoped dependency
      expect(result.isSuccess).toBe(true);
      expect(result.value.instanceId).toBe(1);
      expect(result.value.dependency.instanceId).toBe(1);

      // Resolve again in same scope - should reuse both instances
      const result2 = await scope.resolve(serviceToken);
      expect(result2.isSuccess).toBe(true);
      expect(result2.value).toBe(result.value); // Same service instance
      expect(result2.value.dependency).toBe(result.value.dependency); // Same dependency instance
    });
  });

  describe('TransientLifetime_ServiceResolution_ShouldCreateNewInstances', () => {
    it('should create new instance for every resolution', async () => {
      // Arrange: Transient service with instance tracking
      const serviceToken = Symbol('TransientService');
      let instanceCount = 0;
      const creationTimestamps: number[] = [];
      
      const transientFactory = (container: Container) => {
        const timestamp = Date.now();
        creationTimestamps.push(timestamp);
        return {
          name: 'TransientService',
          instanceId: ++instanceCount,
          createdAt: timestamp
        };
      };

      container.registerTransient(serviceToken, transientFactory);

      // Act: Resolve multiple times
      const result1 = await container.resolve(serviceToken);
      const result2 = await container.resolve(serviceToken);
      const result3 = await container.resolve(serviceToken);

      // Assert: Should create new instance every time
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result3.isSuccess).toBe(true);

      expect(result1.value).not.toBe(result2.value); // Different objects
      expect(result2.value).not.toBe(result3.value); // Different objects
      expect(result1.value.instanceId).toBe(1);
      expect(result2.value.instanceId).toBe(2);
      expect(result3.value.instanceId).toBe(3);
      expect(creationTimestamps).toHaveLength(3); // Factory called three times
    });

    it('should create new instances across scopes', async () => {
      // Arrange: Transient service
      const serviceToken = Symbol('TransientService');
      let instanceCount = 0;
      
      container.registerTransient(serviceToken, () => ({
        name: 'TransientService',
        instanceId: ++instanceCount
      }));

      const scope1 = container.createScope();
      const scope2 = container.createScope();

      // Act: Resolve from different scopes and container
      const containerResult = await container.resolve(serviceToken);
      const scope1Result1 = await scope1.resolve(serviceToken);
      const scope1Result2 = await scope1.resolve(serviceToken);
      const scope2Result = await scope2.resolve(serviceToken);

      // Assert: All should be different instances
      expect(containerResult.isSuccess).toBe(true);
      expect(scope1Result1.isSuccess).toBe(true);
      expect(scope1Result2.isSuccess).toBe(true);
      expect(scope2Result.isSuccess).toBe(true);

      expect(containerResult.value.instanceId).toBe(1);
      expect(scope1Result1.value.instanceId).toBe(2);
      expect(scope1Result2.value.instanceId).toBe(3); // New even within same scope
      expect(scope2Result.value.instanceId).toBe(4);

      // All should be different object references
      expect(containerResult.value).not.toBe(scope1Result1.value);
      expect(scope1Result1.value).not.toBe(scope1Result2.value);
      expect(scope1Result2.value).not.toBe(scope2Result.value);
    });
  });

  describe('MixedLifetimes_ComplexDependencies_ShouldRespectEachLifetime', () => {
    it('should handle mixed singleton, scoped, and transient dependencies', async () => {
      // Arrange: Complex dependency graph with mixed lifetimes
      const singletonToken = Symbol('SingletonService');
      const scopedToken = Symbol('ScopedService');
      const transientToken = Symbol('TransientService');
      const complexToken = Symbol('ComplexService');

      let singletonCount = 0;
      let scopedCount = 0;
      let transientCount = 0;
      let complexCount = 0;

      // Singleton dependency
      container.registerSingleton(singletonToken, () => ({
        name: 'SingletonService',
        instanceId: ++singletonCount,
        type: 'singleton'
      }));

      // Scoped dependency
      container.registerScoped(scopedToken, () => ({
        name: 'ScopedService',
        instanceId: ++scopedCount,
        type: 'scoped'
      }));

      // Transient dependency
      container.registerTransient(transientToken, () => ({
        name: 'TransientService',
        instanceId: ++transientCount,
        type: 'transient'
      }));

      // Complex service depending on all three
      const complexFactory = async (container: Container) => {
        const [singleton, scoped, transient] = await Promise.all([
          container.resolve(singletonToken),
          container.resolve(scopedToken),
          container.resolve(transientToken)
        ]);

        if (singleton.isFailure || scoped.isFailure || transient.isFailure) {
          throw new Error('Failed to resolve dependencies');
        }

        return {
          name: 'ComplexService',
          instanceId: ++complexCount,
          dependencies: {
            singleton: singleton.value,
            scoped: scoped.value,
            transient: transient.value
          }
        };
      };

      container.registerTransient(complexToken, complexFactory);
      
      const scope1 = container.createScope();
      const scope2 = container.createScope();

      // Act: Resolve complex service from different scopes
      const result1 = await scope1.resolve(complexToken);
      const result2 = await scope1.resolve(complexToken);
      const result3 = await scope2.resolve(complexToken);

      // Assert: Dependencies should follow their respective lifetimes
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result3.isSuccess).toBe(true);

      // Complex service should be transient (new each time)
      expect(result1.value.instanceId).toBe(1);
      expect(result2.value.instanceId).toBe(2);
      expect(result3.value.instanceId).toBe(3);

      // Singleton should be same across all resolutions
      expect(result1.value.dependencies.singleton).toBe(result2.value.dependencies.singleton);
      expect(result2.value.dependencies.singleton).toBe(result3.value.dependencies.singleton);
      expect(result1.value.dependencies.singleton.instanceId).toBe(1);

      // Scoped should be same within scope, different across scopes
      expect(result1.value.dependencies.scoped).toBe(result2.value.dependencies.scoped); // Same scope
      expect(result2.value.dependencies.scoped).not.toBe(result3.value.dependencies.scoped); // Different scope
      expect(result1.value.dependencies.scoped.instanceId).toBe(1);
      expect(result3.value.dependencies.scoped.instanceId).toBe(2);

      // Transient should be different for each resolution
      expect(result1.value.dependencies.transient).not.toBe(result2.value.dependencies.transient);
      expect(result2.value.dependencies.transient).not.toBe(result3.value.dependencies.transient);
      expect(result1.value.dependencies.transient.instanceId).toBe(1);
      expect(result2.value.dependencies.transient.instanceId).toBe(2);
      expect(result3.value.dependencies.transient.instanceId).toBe(3);
    });
  });

  describe('ScopeDisposal_DisposableServices_ShouldDisposeCorrectly', () => {
    it('should dispose scoped services when scope is disposed', async () => {
      // Arrange: Scoped service with disposal tracking
      const serviceToken = Symbol('DisposableService');
      const disposedServices: string[] = [];
      
      const disposableFactory = (container: Container) => ({
        name: 'DisposableService',
        id: Math.random().toString(36),
        dispose: async function(this: any) {
          disposedServices.push(this.id);
        }
      });

      container.registerScoped(serviceToken, disposableFactory);
      const scope = container.createScope();

      // Act: Resolve service then dispose scope
      const result = await scope.resolve(serviceToken);
      expect(result.isSuccess).toBe(true);
      
      const serviceId = result.value.id;
      await scope.dispose();

      // Assert: Service should have been disposed
      expect(disposedServices).toContain(serviceId);
      expect(disposedServices).toHaveLength(1);
    });

    it('should not dispose singleton services when scope is disposed', async () => {
      // Arrange: Singleton service with disposal tracking
      const serviceToken = Symbol('DisposableSingleton');
      const disposedServices: string[] = [];
      
      const singletonFactory = (container: Container) => ({
        name: 'DisposableSingleton',
        id: Math.random().toString(36),
        dispose: async function(this: any) {
          disposedServices.push(this.id);
        }
      });

      container.registerSingleton(serviceToken, singletonFactory);
      const scope = container.createScope();

      // Act: Resolve singleton through scope then dispose scope
      const result = await scope.resolve(serviceToken);
      expect(result.isSuccess).toBe(true);
      
      await scope.dispose();

      // Assert: Singleton should NOT be disposed when scope is disposed
      expect(disposedServices).toHaveLength(0);
      
      // Singleton should still be resolvable
      const result2 = await container.resolve(serviceToken);
      expect(result2.isSuccess).toBe(true);
      expect(result2.value).toBe(result.value); // Same instance
    });

    it('should dispose singleton services when container is disposed', async () => {
      // Arrange: Singleton service with disposal tracking
      const serviceToken = Symbol('DisposableSingleton');
      const disposedServices: string[] = [];
      
      const singletonFactory = (container: Container) => ({
        name: 'DisposableSingleton',
        id: Math.random().toString(36),
        dispose: async function(this: any) {
          disposedServices.push(this.id);
        }
      });

      container.registerSingleton(serviceToken, singletonFactory);

      // Act: Resolve singleton then dispose container
      const result = await container.resolve(serviceToken);
      expect(result.isSuccess).toBe(true);
      
      const serviceId = result.value.id;
      await container.dispose();

      // Assert: Singleton should be disposed when container is disposed
      expect(disposedServices).toContain(serviceId);
      expect(disposedServices).toHaveLength(1);
    });
  });
});

/**
 * FUNCTION MODEL MODULE LIFETIME COMPLIANCE TESTS
 * Validates that Function Model services are registered with correct lifetimes
 */
describe('Function Model Module Lifetime Compliance - TDD Specification', () => {
  let container: Container;
  let mockSupabaseClient: any;

  beforeEach(() => {
    container = new Container();
    
    mockSupabaseClient = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      }),
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null })
      },
      channel: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockResolvedValue({ error: null })
      })
    };
  });

  describe('infrastructureServices_CorrectLifetimes_ShouldFollowArchitecturalPatterns', () => {
    it('should register cache services as singletons (shared state)', async () => {
      // Arrange: Register Function Model module
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      const module = new FunctionModelModule();
      module.register(container);

      // Act: Resolve cache service multiple times
      const result1 = await container.resolve(ServiceTokens.CACHE_SERVICE);
      const result2 = await container.resolve(ServiceTokens.CACHE_SERVICE);

      // Assert: Should return same instance (singleton behavior)
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value).toBe(result2.value); // Same object reference
    });

    it('should register event bus as singleton (shared message bus)', async () => {
      // Arrange: Register Function Model module
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      const module = new FunctionModelModule();
      module.register(container);

      // Act: Resolve event bus multiple times
      const result1 = await container.resolve(ServiceTokens.EVENT_BUS);
      const result2 = await container.resolve(ServiceTokens.EVENT_BUS);

      // Assert: Should return same instance (singleton behavior)
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value).toBe(result2.value); // Same object reference
    });

    it('should register repositories as scoped (per-request lifetime)', async () => {
      // Arrange: Register Function Model module
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      const module = new FunctionModelModule();
      module.register(container);

      // Act: Try to resolve repository without scope (should fail)
      const resultWithoutScope = await container.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);

      // Assert: Should fail without scope
      expect(resultWithoutScope.isFailure).toBe(true);
      expect(resultWithoutScope.error).toContain('requires a scope');

      // Act: Resolve with scopes
      const scope1 = container.createScope();
      const scope2 = container.createScope();
      
      const result1a = await scope1.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
      const result1b = await scope1.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
      const result2 = await scope2.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);

      // Assert: Same within scope, different across scopes
      expect(result1a.isSuccess).toBe(true);
      expect(result1b.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1a.value).toBe(result1b.value); // Same within scope
      expect(result1a.value).not.toBe(result2.value); // Different across scopes
    });
  });

  describe('domainServices_TransientLifetime_ShouldRemainStateless', () => {
    it('should register validation services as transient (stateless)', async () => {
      // Arrange: Register Function Model module
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      const module = new FunctionModelModule();
      module.register(container);

      // Act: Resolve validation services multiple times
      const result1 = await container.resolve(ServiceTokens.BUSINESS_RULE_VALIDATION_SERVICE);
      const result2 = await container.resolve(ServiceTokens.BUSINESS_RULE_VALIDATION_SERVICE);
      const result3 = await container.resolve(ServiceTokens.EXECUTION_READINESS_VALIDATION_SERVICE);
      const result4 = await container.resolve(ServiceTokens.EXECUTION_READINESS_VALIDATION_SERVICE);

      // Assert: Should create new instances each time (transient behavior)
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result3.isSuccess).toBe(true);
      expect(result4.isSuccess).toBe(true);
      
      expect(result1.value).not.toBe(result2.value); // Different instances
      expect(result3.value).not.toBe(result4.value); // Different instances
    });

    it('should register orchestration services as transient (stateless)', async () => {
      // Arrange: Register Function Model module
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      const module = new FunctionModelModule();
      module.register(container);

      // Act: Resolve orchestration services multiple times
      const workflow1 = await container.resolve(ServiceTokens.WORKFLOW_ORCHESTRATION_SERVICE);
      const workflow2 = await container.resolve(ServiceTokens.WORKFLOW_ORCHESTRATION_SERVICE);
      const node1 = await container.resolve(ServiceTokens.NODE_DEPENDENCY_SERVICE);
      const node2 = await container.resolve(ServiceTokens.NODE_DEPENDENCY_SERVICE);

      // Assert: Should create new instances each time
      expect(workflow1.isSuccess).toBe(true);
      expect(workflow2.isSuccess).toBe(true);
      expect(node1.isSuccess).toBe(true);
      expect(node2.isSuccess).toBe(true);
      
      expect(workflow1.value).not.toBe(workflow2.value);
      expect(node1.value).not.toBe(node2.value);
    });
  });

  describe('useCases_TransientLifetime_ShouldSupportStatelessExecution', () => {
    it('should register use cases as transient (stateless execution)', async () => {
      // Arrange: Register Function Model module
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      const module = new FunctionModelModule();
      module.register(container);
      
      const scope = container.createScope(); // Use cases need scoped dependencies

      // Act: Resolve use cases multiple times
      const create1 = await scope.resolve(ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE);
      const create2 = await scope.resolve(ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE);
      const update1 = await scope.resolve(ServiceTokens.UPDATE_FUNCTION_MODEL_USE_CASE);
      const update2 = await scope.resolve(ServiceTokens.UPDATE_FUNCTION_MODEL_USE_CASE);

      // Assert: Should create new instances each time (transient behavior)
      expect(create1.isSuccess).toBe(true);
      expect(create2.isSuccess).toBe(true);
      expect(update1.isSuccess).toBe(true);
      expect(update2.isSuccess).toBe(true);
      
      expect(create1.value).not.toBe(create2.value);
      expect(update1.value).not.toBe(update2.value);
    });

    it('should register query handlers as transient (stateless queries)', async () => {
      // Arrange: Register Function Model module
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      const module = new FunctionModelModule();
      module.register(container);
      
      const scope = container.createScope();

      // Act: Resolve query handlers multiple times
      const query1 = await scope.resolve(ServiceTokens.GET_FUNCTION_MODEL_QUERY_HANDLER);
      const query2 = await scope.resolve(ServiceTokens.GET_FUNCTION_MODEL_QUERY_HANDLER);

      // Assert: Should create new instances each time
      expect(query1.isSuccess).toBe(true);
      expect(query2.isSuccess).toBe(true);
      expect(query1.value).not.toBe(query2.value);
    });
  });

  describe('externalServices_SingletonLifetime_ShouldReuseConnections', () => {
    it('should register external service adapters as singletons (connection reuse)', async () => {
      // Arrange: Register Function Model module
      container.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      const module = new FunctionModelModule();
      module.register(container);

      // Act: Resolve external services multiple times
      const ai1 = await container.resolve(ServiceTokens.AI_SERVICE_ADAPTER);
      const ai2 = await container.resolve(ServiceTokens.AI_SERVICE_ADAPTER);
      const notification1 = await container.resolve(ServiceTokens.NOTIFICATION_SERVICE_ADAPTER);
      const notification2 = await container.resolve(ServiceTokens.NOTIFICATION_SERVICE_ADAPTER);

      // Assert: Should return same instances (singleton behavior for connection reuse)
      expect(ai1.isSuccess).toBe(true);
      expect(ai2.isSuccess).toBe(true);
      expect(notification1.isSuccess).toBe(true);
      expect(notification2.isSuccess).toBe(true);
      
      expect(ai1.value).toBe(ai2.value); // Same instance
      expect(notification1.value).toBe(notification2.value); // Same instance
    });
  });
});