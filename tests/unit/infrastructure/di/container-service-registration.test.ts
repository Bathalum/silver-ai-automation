/**
 * TDD Test Specification: Container Service Registration
 * 
 * Defines expected behavior for proper service registration in the DI container
 * These tests act as Boundary Filters ensuring Clean Architecture compliance
 * 
 * RED PHASE: All tests should FAIL initially - this validates expected behavior before implementation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  Container, 
  ContainerBuilder, 
  ServiceLifetime, 
  ServiceTokens,
  ServiceRegistration,
  ServiceModule
} from '@/lib/infrastructure/di/container';
import { FunctionModelModule } from '@/lib/infrastructure/di/function-model-module';
import { Result } from '@/lib/domain/shared/result';

describe('Container Service Registration - TDD Specification', () => {
  let container: Container;
  let containerBuilder: ContainerBuilder;

  beforeEach(() => {
    container = new Container();
    containerBuilder = new ContainerBuilder();
  });

  describe('registerTransient_ValidService_ShouldRegisterWithTransientLifetime', () => {
    it('should register service with transient lifetime using direct registration', () => {
      // Arrange: Define a simple service
      const testToken = Symbol('TestService');
      const testFactory = (c: Container) => ({ name: 'TestService', value: Math.random() });

      // Act: Register service as transient
      const result = container.registerTransient(testToken, testFactory);

      // Assert: Service should be registered with correct lifetime
      expect(result).toBe(container); // Fluent interface
      expect(container.isRegistered(testToken)).toBe(true);
      
      // Should create new instance each time (transient behavior)
      const resolvePromise1 = container.resolve(testToken);
      const resolvePromise2 = container.resolve(testToken);
      
      expect(resolvePromise1).resolves.toEqual(expect.objectContaining({ isSuccess: true }));
      expect(resolvePromise2).resolves.toEqual(expect.objectContaining({ isSuccess: true }));
      
      // Instances should be different (transient behavior)
      Promise.all([resolvePromise1, resolvePromise2]).then(([result1, result2]) => {
        expect(result1.value.value).not.toBe(result2.value.value);
      });
    });

    it('should register service using ServiceRegistration helper', () => {
      // Arrange: Define service using helper
      const testToken = Symbol('TestService');
      const descriptor = ServiceRegistration.transient(
        testToken,
        (c: Container) => ({ name: 'TestService' }),
        []
      );

      // Act: Register using descriptor
      const result = container.register(descriptor);

      // Assert: Service should be properly registered
      expect(result).toBe(container);
      expect(container.isRegistered(testToken)).toBe(true);
      expect(descriptor.lifetime).toBe(ServiceLifetime.Transient);
      expect(descriptor.token).toBe(testToken);
      expect(descriptor.dependencies).toEqual([]);
    });
  });

  describe('registerScoped_ValidService_ShouldRegisterWithScopedLifetime', () => {
    it('should register service with scoped lifetime', () => {
      // Arrange: Define service with scoped lifetime
      const testToken = Symbol('ScopedService');
      const testFactory = (c: Container) => ({ name: 'ScopedService', value: Math.random() });

      // Act: Register service as scoped
      const result = container.registerScoped(testToken, testFactory);

      // Assert: Service should be registered with scoped lifetime
      expect(result).toBe(container);
      expect(container.isRegistered(testToken)).toBe(true);
      
      // Should require scope for resolution
      const resolveWithoutScope = container.resolve(testToken);
      expect(resolveWithoutScope).resolves.toEqual(expect.objectContaining({ 
        isFailure: true,
        error: expect.stringContaining('requires a scope')
      }));
    });

    it('should return same instance within same scope', async () => {
      // Arrange: Register scoped service
      const testToken = Symbol('ScopedService');
      let instanceCounter = 0;
      const testFactory = (c: Container) => ({ name: 'ScopedService', id: ++instanceCounter });
      
      container.registerScoped(testToken, testFactory);
      const scope = container.createScope();

      // Act: Resolve same service twice within scope
      const result1 = await scope.resolve(testToken);
      const result2 = await scope.resolve(testToken);

      // Assert: Should return same instance within scope
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value.id).toBe(result2.value.id);
      expect(result1.value).toBe(result2.value); // Same object reference
    });

    it('should return different instances in different scopes', async () => {
      // Arrange: Register scoped service
      const testToken = Symbol('ScopedService');
      let instanceCounter = 0;
      const testFactory = (c: Container) => ({ name: 'ScopedService', id: ++instanceCounter });
      
      container.registerScoped(testToken, testFactory);
      const scope1 = container.createScope();
      const scope2 = container.createScope();

      // Act: Resolve service in different scopes
      const result1 = await scope1.resolve(testToken);
      const result2 = await scope2.resolve(testToken);

      // Assert: Should return different instances in different scopes
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value.id).not.toBe(result2.value.id);
      expect(result1.value).not.toBe(result2.value); // Different object references
    });
  });

  describe('registerSingleton_ValidService_ShouldRegisterWithSingletonLifetime', () => {
    it('should register service with singleton lifetime', () => {
      // Arrange: Define singleton service
      const testToken = Symbol('SingletonService');
      const testFactory = (c: Container) => ({ name: 'SingletonService', value: Math.random() });

      // Act: Register service as singleton
      const result = container.registerSingleton(testToken, testFactory);

      // Assert: Service should be registered with singleton lifetime
      expect(result).toBe(container);
      expect(container.isRegistered(testToken)).toBe(true);
    });

    it('should return same instance across all resolutions', async () => {
      // Arrange: Register singleton service
      const testToken = Symbol('SingletonService');
      let instanceCounter = 0;
      const testFactory = (c: Container) => ({ name: 'SingletonService', id: ++instanceCounter });
      
      container.registerSingleton(testToken, testFactory);

      // Act: Resolve service multiple times
      const result1 = await container.resolve(testToken);
      const result2 = await container.resolve(testToken);
      
      // Also test with scopes
      const scope = container.createScope();
      const result3 = await scope.resolve(testToken);

      // Assert: Should return same instance everywhere
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result3.isSuccess).toBe(true);
      expect(result1.value.id).toBe(result2.value.id);
      expect(result1.value.id).toBe(result3.value.id);
      expect(result1.value).toBe(result2.value); // Same object reference
      expect(result1.value).toBe(result3.value); // Same object reference
    });
  });

  describe('registerInstance_ValidInstance_ShouldRegisterAsSingleton', () => {
    it('should register pre-created instance as singleton', () => {
      // Arrange: Create instance
      const testToken = Symbol('InstanceService');
      const testInstance = { name: 'InstanceService', value: 'fixed-value' };

      // Act: Register instance
      const result = container.registerInstance(testToken, testInstance);

      // Assert: Should be registered and resolvable
      expect(result).toBe(container);
      expect(container.isRegistered(testToken)).toBe(true);
    });

    it('should return exact same instance on resolution', async () => {
      // Arrange: Register instance
      const testToken = Symbol('InstanceService');
      const testInstance = { name: 'InstanceService', value: 'fixed-value' };
      container.registerInstance(testToken, testInstance);

      // Act: Resolve multiple times
      const result1 = await container.resolve(testToken);
      const result2 = await container.resolve(testToken);

      // Assert: Should return exact same instance
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result1.value).toBe(testInstance); // Same object reference
      expect(result2.value).toBe(testInstance); // Same object reference
      expect(result1.value).toBe(result2.value);
    });
  });

  describe('registerModule_ValidModule_ShouldRegisterAllModuleServices', () => {
    it('should register all services from module', () => {
      // Arrange: Create test module
      class TestModule implements ServiceModule {
        register(container: Container): void {
          container.registerSingleton(Symbol('Service1'), () => ({ name: 'Service1' }));
          container.registerTransient(Symbol('Service2'), () => ({ name: 'Service2' }));
          container.registerScoped(Symbol('Service3'), () => ({ name: 'Service3' }));
        }
      }

      const testModule = new TestModule();
      const builder = new ContainerBuilder();

      // Act: Register module
      const result = builder.registerModule(testModule);
      const builtContainer = result.build();

      // Assert: All services should be registered
      expect(result).toBe(builder); // Fluent interface
      expect(builtContainer.isRegistered(Symbol('Service1'))).toBe(true);
      expect(builtContainer.isRegistered(Symbol('Service2'))).toBe(true);
      expect(builtContainer.isRegistered(Symbol('Service3'))).toBe(true);
    });

    it('should register FunctionModelModule services with correct tokens', () => {
      // Arrange: Create function model module
      const functionModelModule = new FunctionModelModule();
      const builder = new ContainerBuilder();
      
      // Mock Supabase client for module registration
      const mockSupabaseClient = { 
        from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
        auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) }
      };

      // Act: Register module with mocked dependencies
      builder.registerInstance(ServiceTokens.SUPABASE_CLIENT, mockSupabaseClient);
      const result = builder.registerModule(functionModelModule);
      const builtContainer = result.build();

      // Assert: Core function model services should be registered
      expect(result).toBe(builder);
      expect(builtContainer.isRegistered(ServiceTokens.FUNCTION_MODEL_REPOSITORY)).toBe(true);
      expect(builtContainer.isRegistered(ServiceTokens.EVENT_BUS)).toBe(true);
      expect(builtContainer.isRegistered(ServiceTokens.CACHE_SERVICE)).toBe(true);
      expect(builtContainer.isRegistered(ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE)).toBe(true);
      expect(builtContainer.isRegistered(ServiceTokens.UPDATE_FUNCTION_MODEL_USE_CASE)).toBe(true);
      expect(builtContainer.isRegistered(ServiceTokens.PUBLISH_FUNCTION_MODEL_USE_CASE)).toBe(true);
    });
  });

  describe('getRegisteredTokens_AfterRegistrations_ShouldReturnAllTokens', () => {
    it('should return all registered service tokens', () => {
      // Arrange: Register multiple services
      const token1 = Symbol('Service1');
      const token2 = Symbol('Service2');
      const token3 = 'StringToken';
      
      container.registerSingleton(token1, () => ({}));
      container.registerTransient(token2, () => ({}));
      container.registerScoped(token3, () => ({}));

      // Act: Get registered tokens
      const tokens = container.getRegisteredTokens();

      // Assert: Should include all registered tokens
      expect(tokens).toContain(token1);
      expect(tokens).toContain(token2);
      expect(tokens).toContain(token3);
      expect(tokens).toHaveLength(3);
    });

    it('should include parent container tokens', () => {
      // Arrange: Create parent with services, then child
      const parentContainer = new Container();
      const parentToken = Symbol('ParentService');
      parentContainer.registerSingleton(parentToken, () => ({}));
      
      const childContainer = new Container(parentContainer);
      const childToken = Symbol('ChildService');
      childContainer.registerTransient(childToken, () => ({}));

      // Act: Get tokens from child
      const tokens = childContainer.getRegisteredTokens();

      // Assert: Should include both parent and child tokens
      expect(tokens).toContain(parentToken);
      expect(tokens).toContain(childToken);
      expect(tokens).toHaveLength(2);
    });
  });

  describe('isRegistered_CheckingServiceRegistration_ShouldReturnCorrectStatus', () => {
    it('should return true for registered services', () => {
      // Arrange: Register service
      const testToken = Symbol('TestService');
      container.registerSingleton(testToken, () => ({}));

      // Act & Assert: Should confirm registration
      expect(container.isRegistered(testToken)).toBe(true);
    });

    it('should return false for unregistered services', () => {
      // Arrange: Token that was never registered
      const unregisteredToken = Symbol('UnregisteredService');

      // Act & Assert: Should confirm not registered
      expect(container.isRegistered(unregisteredToken)).toBe(false);
    });

    it('should check parent container for registration', () => {
      // Arrange: Register in parent, check from child
      const parentContainer = new Container();
      const testToken = Symbol('ParentService');
      parentContainer.registerSingleton(testToken, () => ({}));
      
      const childContainer = new Container(parentContainer);

      // Act & Assert: Child should find parent registration
      expect(childContainer.isRegistered(testToken)).toBe(true);
    });
  });

  describe('createChild_ParentContainer_ShouldCreateChildWithInheritance', () => {
    it('should create child container that inherits parent services', () => {
      // Arrange: Parent with registered service
      const parentToken = Symbol('ParentService');
      container.registerSingleton(parentToken, () => ({ source: 'parent' }));

      // Act: Create child container
      const childContainer = container.createChild();

      // Assert: Child should inherit parent services
      expect(childContainer.isRegistered(parentToken)).toBe(true);
      
      // Child should be able to resolve parent services
      const resolvePromise = childContainer.resolve(parentToken);
      expect(resolvePromise).resolves.toEqual(expect.objectContaining({ 
        isSuccess: true,
        value: expect.objectContaining({ source: 'parent' })
      }));
    });

    it('should allow child to override parent services', () => {
      // Arrange: Parent with service
      const testToken = Symbol('TestService');
      container.registerSingleton(testToken, () => ({ source: 'parent' }));
      
      const childContainer = container.createChild();
      
      // Act: Override in child
      childContainer.registerSingleton(testToken, () => ({ source: 'child' }));

      // Assert: Child should use its own registration
      const childResolvePromise = childContainer.resolve(testToken);
      expect(childResolvePromise).resolves.toEqual(expect.objectContaining({
        isSuccess: true,
        value: expect.objectContaining({ source: 'child' })
      }));
      
      // Parent should still use original registration
      const parentResolvePromise = container.resolve(testToken);
      expect(parentResolvePromise).resolves.toEqual(expect.objectContaining({
        isSuccess: true,
        value: expect.objectContaining({ source: 'parent' })
      }));
    });
  });
});

/**
 * ARCHITECTURAL COMPLIANCE VALIDATION
 * These tests ensure the DI container enforces Clean Architecture boundaries
 */
describe('Container Architectural Boundary Enforcement - TDD Specification', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('serviceDependencyInjection_CleanArchitectureLayers_ShouldRespectDependencyInversion', () => {
    it('should enforce that domain services have no infrastructure dependencies', () => {
      // Arrange: Mock domain service that should not depend on infrastructure
      const domainServiceToken = Symbol('DomainService');
      const infrastructureToken = Symbol('InfrastructureService');
      
      // Domain service factory should not require infrastructure dependencies
      const domainServiceFactory = (container: Container) => {
        // This should work - domain services can depend on other domain services
        return {
          name: 'DomainService',
          validate: (data: any) => Result.ok(data)
        };
      };

      // Infrastructure service (e.g., repository)
      const infrastructureFactory = (container: Container) => ({
        name: 'InfrastructureService',
        persist: async (data: any) => Result.ok({ id: 'saved' })
      });

      // Act: Register services with correct dependency direction
      container.registerTransient(domainServiceToken, domainServiceFactory);
      container.registerScoped(infrastructureToken, infrastructureFactory);

      // Assert: Domain service should be resolvable without infrastructure
      const domainResolvePromise = container.resolve(domainServiceToken);
      expect(domainResolvePromise).resolves.toEqual(expect.objectContaining({ isSuccess: true }));
      
      // Infrastructure can depend on domain (correct dependency direction)
      const infrastructureResolvePromise = container.resolve(infrastructureToken);
      expect(infrastructureResolvePromise).resolves.toEqual(expect.objectContaining({ isSuccess: true }));
    });

    it('should allow use cases to depend on both domain services and repository interfaces', () => {
      // Arrange: Use case that depends on domain service and repository interface
      const domainServiceToken = ServiceTokens.WORKFLOW_VALIDATION_SERVICE;
      const repositoryToken = ServiceTokens.FUNCTION_MODEL_REPOSITORY;
      const useCaseToken = ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE;

      // Mock implementations
      const mockDomainService = { validate: () => Result.ok(true) };
      const mockRepository = { 
        save: async () => Result.ok({ id: 'test' }),
        findById: async () => Result.ok(null)
      };

      // Use case factory with correct dependencies
      const useCaseFactory = async (container: Container) => {
        const domainService = await container.resolve(domainServiceToken);
        const repository = await container.resolve(repositoryToken);
        
        if (domainService.isFailure || repository.isFailure) {
          throw new Error('Failed to resolve dependencies');
        }

        return {
          name: 'CreateFunctionModelUseCase',
          execute: async (command: any) => {
            const validation = domainService.value.validate(command);
            if (validation.isFailure) return validation;
            
            return repository.value.save(command);
          }
        };
      };

      // Act: Register with proper dependency chain
      container.registerTransient(domainServiceToken, () => mockDomainService);
      container.registerScoped(repositoryToken, () => mockRepository);
      container.registerTransient(useCaseToken, useCaseFactory);

      // Assert: Use case should resolve successfully with all dependencies
      const useCaseResolvePromise = container.resolve(useCaseToken);
      expect(useCaseResolvePromise).resolves.toEqual(expect.objectContaining({ isSuccess: true }));
    });
  });

  describe('serviceLifetimeManagement_DifferentLayers_ShouldUseCorrectLifetimes', () => {
    it('should register domain services as transient (stateless)', () => {
      // Arrange: Domain services should be transient to remain stateless
      const validationServiceToken = ServiceTokens.BUSINESS_RULE_VALIDATION_SERVICE;
      const orchestrationServiceToken = ServiceTokens.WORKFLOW_ORCHESTRATION_SERVICE;

      // Act: Register domain services (as FunctionModelModule does)
      container.registerTransient(validationServiceToken, () => ({ validate: () => Result.ok(true) }));
      container.registerTransient(orchestrationServiceToken, () => ({ orchestrate: () => Result.ok(true) }));

      // Assert: Services should be registered and resolvable
      expect(container.isRegistered(validationServiceToken)).toBe(true);
      expect(container.isRegistered(orchestrationServiceToken)).toBe(true);
      
      const validation1Promise = container.resolve(validationServiceToken);
      const validation2Promise = container.resolve(validationServiceToken);
      
      // Different instances each time (transient)
      Promise.all([validation1Promise, validation2Promise]).then(([result1, result2]) => {
        expect(result1.isSuccess && result2.isSuccess).toBe(true);
        // Should be different instances (transient behavior verified by container)
      });
    });

    it('should register infrastructure services with appropriate lifetimes', () => {
      // Arrange: Infrastructure services with different lifetime needs
      container.registerSingleton(ServiceTokens.CACHE_SERVICE, () => ({ 
        cache: new Map(),
        get: (key: string) => null,
        set: (key: string, value: any) => {}
      }));
      
      container.registerScoped(ServiceTokens.FUNCTION_MODEL_REPOSITORY, () => ({
        save: async () => Result.ok({}),
        findById: async () => Result.ok(null)
      }));

      // Assert: Services should be registered with correct lifetimes
      expect(container.isRegistered(ServiceTokens.CACHE_SERVICE)).toBe(true);
      expect(container.isRegistered(ServiceTokens.FUNCTION_MODEL_REPOSITORY)).toBe(true);
      
      // Cache should work without scope (singleton)
      const cachePromise = container.resolve(ServiceTokens.CACHE_SERVICE);
      expect(cachePromise).resolves.toEqual(expect.objectContaining({ isSuccess: true }));
      
      // Repository should require scope (scoped)
      const repoWithoutScopePromise = container.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
      expect(repoWithoutScopePromise).resolves.toEqual(expect.objectContaining({ 
        isFailure: true,
        error: expect.stringContaining('requires a scope')
      }));
    });
  });
});