import { Result } from '../../domain/shared/result';

/**
 * Service lifetime management
 */
export enum ServiceLifetime {
  /** New instance created for each resolution */
  Transient = 'transient',
  /** Single instance per container scope */
  Scoped = 'scoped',
  /** Single instance for the entire application */
  Singleton = 'singleton'
}

/**
 * Service descriptor
 */
export interface ServiceDescriptor<T = any> {
  /** Service token/identifier */
  token: string | symbol | Function;
  
  /** Service factory function */
  factory: (container: Container) => T | Promise<T>;
  
  /** Service lifetime */
  lifetime: ServiceLifetime;
  
  /** Service dependencies */
  dependencies?: (string | symbol | Function)[];
  
  /** Service metadata */
  metadata?: Record<string, any>;
}

/**
 * Container scope for scoped lifetime management
 */
export class ContainerScope {
  private scopedInstances = new Map<string | symbol | Function, any>();

  constructor(private readonly parent: Container) {}

  /**
   * Get service from scope
   */
  async resolve<T>(token: string | symbol | Function): Promise<Result<T>> {
    return this.parent.resolve<T>(token, this, undefined);
  }

  /**
   * Get scoped instance
   */
  getScopedInstance<T>(token: string | symbol | Function): T | undefined {
    return this.scopedInstances.get(token);
  }

  /**
   * Set scoped instance
   */
  setScopedInstance<T>(token: string | symbol | Function, instance: T): void {
    this.scopedInstances.set(token, instance);
  }

  /**
   * Dispose scope and all scoped instances
   */
  async dispose(): Promise<void> {
    // Dispose all disposable scoped instances
    for (const instance of Array.from(this.scopedInstances.values())) {
      if (instance && typeof instance.dispose === 'function') {
        try {
          await instance.dispose();
        } catch (error) {
          console.error('Error disposing scoped instance:', error);
        }
      }
    }
    
    this.scopedInstances.clear();
  }
}

/**
 * Dependency injection container
 */
export class Container {
  private services = new Map<string | symbol | Function, ServiceDescriptor>();
  private singletonInstances = new Map<string | symbol | Function, any>();
  private readonly parent?: Container;

  constructor(parent?: Container) {
    this.parent = parent;
  }

  /**
   * Register a service
   */
  register<T>(descriptor: ServiceDescriptor<T>): Container {
    this.services.set(descriptor.token, descriptor);
    return this;
  }

  /**
   * Register a transient service
   */
  registerTransient<T>(
    token: string | symbol | Function,
    factory: (container: Container) => T | Promise<T>,
    dependencies?: (string | symbol | Function)[]
  ): Container {
    return this.register({
      token,
      factory,
      lifetime: ServiceLifetime.Transient,
      dependencies
    });
  }

  /**
   * Register a scoped service
   */
  registerScoped<T>(
    token: string | symbol | Function,
    factory: (container: Container) => T | Promise<T>,
    dependencies?: (string | symbol | Function)[]
  ): Container {
    return this.register({
      token,
      factory,
      lifetime: ServiceLifetime.Scoped,
      dependencies
    });
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(
    token: string | symbol | Function,
    factory: (container: Container) => T | Promise<T>,
    dependencies?: (string | symbol | Function)[]
  ): Container {
    return this.register({
      token,
      factory,
      lifetime: ServiceLifetime.Singleton,
      dependencies
    });
  }

  /**
   * Register an instance as singleton
   */
  registerInstance<T>(token: string | symbol | Function, instance: T): Container {
    this.singletonInstances.set(token, instance);
    return this.register({
      token,
      factory: () => instance,
      lifetime: ServiceLifetime.Singleton
    });
  }

  /**
   * Resolve a service
   */
  async resolve<T>(token: string | symbol | Function, scope?: ContainerScope, resolutionStack?: Set<string | symbol | Function>): Promise<Result<T>> {
    try {
      // Initialize resolution stack for circular dependency detection
      if (!resolutionStack) {
        resolutionStack = new Set<string | symbol | Function>();
      }

      // Check for circular dependency
      const tokenKey = typeof token === 'symbol' ? token : token.toString();
      if (resolutionStack.has(tokenKey)) {
        return Result.fail(`Circular dependency detected: ${this.getResolutionChain(resolutionStack, tokenKey)}`);
      }

      const descriptor = this.findDescriptor(token);
      if (!descriptor) {
        return Result.fail(`Service not registered: ${String(token)}`);
      }

      // Add current token to resolution stack
      resolutionStack.add(tokenKey);

      try {
        // Handle different lifetimes
        switch (descriptor.lifetime) {
          case ServiceLifetime.Singleton:
            return await this.resolveSingleton<T>(descriptor, resolutionStack);
            
          case ServiceLifetime.Scoped:
            if (!scope) {
              return Result.fail(`Scoped service '${String(token)}' requires a scope`);
            }
            return await this.resolveScoped<T>(descriptor, scope, resolutionStack);
            
          case ServiceLifetime.Transient:
            return await this.resolveTransient<T>(descriptor, scope, resolutionStack);
            
          default:
            return Result.fail(`Unknown service lifetime: ${descriptor.lifetime}`);
        }
      } finally {
        // Remove from resolution stack when done
        resolutionStack.delete(tokenKey);
      }
    } catch (error) {
      return Result.fail(
        `Failed to resolve service '${String(token)}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create a new container scope
   */
  createScope(): ContainerScope {
    return new ContainerScope(this);
  }

  /**
   * Check if service is registered
   */
  isRegistered(token: string | symbol | Function): boolean {
    return this.services.has(token) || (this.parent?.isRegistered(token) ?? false);
  }

  /**
   * Get all registered service tokens
   */
  getRegisteredTokens(): (string | symbol | Function)[] {
    const tokens = Array.from(this.services.keys());
    if (this.parent) {
      tokens.push(...this.parent.getRegisteredTokens());
    }
    return tokens;
  }

  /**
   * Create child container
   */
  createChild(): Container {
    return new Container(this);
  }

  /**
   * Dispose container and all singleton instances
   */
  async dispose(): Promise<void> {
    // Dispose all disposable singleton instances
    for (const instance of Array.from(this.singletonInstances.values())) {
      if (instance && typeof instance.dispose === 'function') {
        try {
          await instance.dispose();
        } catch (error) {
          console.error('Error disposing singleton instance:', error);
        }
      }
    }
    
    this.singletonInstances.clear();
    this.services.clear();
  }

  /**
   * Get resolution chain for circular dependency error messages
   */
  private getResolutionChain(resolutionStack: Set<string | symbol | Function>, currentToken: string | symbol | Function): string {
    const chain = Array.from(resolutionStack).map(token => String(token));
    chain.push(String(currentToken));
    return chain.join(' -> ');
  }

  private findDescriptor(token: string | symbol | Function): ServiceDescriptor | undefined {
    const descriptor = this.services.get(token);
    if (descriptor) {
      return descriptor;
    }
    
    return this.parent?.findDescriptor(token);
  }

  private async resolveSingleton<T>(descriptor: ServiceDescriptor<T>, resolutionStack: Set<string | symbol | Function>): Promise<Result<T>> {
    // Check if instance exists in current container
    let instance = this.singletonInstances.get(descriptor.token);
    
    // If not found and has parent, check parent's singletons
    if (!instance && this.parent) {
      instance = this.parent.singletonInstances.get(descriptor.token);
      if (instance) {
        // Store reference to parent's singleton in child for faster subsequent access
        this.singletonInstances.set(descriptor.token, instance);
        return Result.ok(instance);
      }
    }
    
    // Create new instance if not found anywhere in hierarchy
    if (!instance) {
      try {
        instance = await descriptor.factory(new ResolutionContainer(this, resolutionStack));
        this.singletonInstances.set(descriptor.token, instance);
      } catch (error) {
        return Result.fail(`Failed to create singleton instance: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return Result.ok(instance);
  }

  private async resolveScoped<T>(descriptor: ServiceDescriptor<T>, scope: ContainerScope, resolutionStack: Set<string | symbol | Function>): Promise<Result<T>> {
    let instance = scope.getScopedInstance<T>(descriptor.token);
    
    if (!instance) {
      try {
        instance = await descriptor.factory(new ResolutionContainer(this, resolutionStack, scope));
        scope.setScopedInstance(descriptor.token, instance);
      } catch (error) {
        return Result.fail(`Failed to create scoped instance: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return Result.ok(instance);
  }

  private async resolveTransient<T>(descriptor: ServiceDescriptor<T>, scope?: ContainerScope, resolutionStack?: Set<string | symbol | Function>): Promise<Result<T>> {
    try {
      const resolutionContainer = resolutionStack ? new ResolutionContainer(this, resolutionStack, scope) : this;
      const instance = await descriptor.factory(resolutionContainer);
      return Result.ok(instance);
    } catch (error) {
      return Result.fail(`Failed to create transient instance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Service registration helpers
 */
export class ServiceRegistration {
  static transient<T>(
    token: string | symbol | Function,
    factory: (container: Container) => T | Promise<T>,
    dependencies?: (string | symbol | Function)[]
  ): ServiceDescriptor<T> {
    return {
      token,
      factory,
      lifetime: ServiceLifetime.Transient,
      dependencies
    };
  }

  static scoped<T>(
    token: string | symbol | Function,
    factory: (container: Container) => T | Promise<T>,
    dependencies?: (string | symbol | Function)[]
  ): ServiceDescriptor<T> {
    return {
      token,
      factory,
      lifetime: ServiceLifetime.Scoped,
      dependencies
    };
  }

  static singleton<T>(
    token: string | symbol | Function,
    factory: (container: Container) => T | Promise<T>,
    dependencies?: (string | symbol | Function)[]
  ): ServiceDescriptor<T> {
    return {
      token,
      factory,
      lifetime: ServiceLifetime.Singleton,
      dependencies
    };
  }

  static instance<T>(
    token: string | symbol | Function,
    instance: T
  ): ServiceDescriptor<T> {
    return {
      token,
      factory: () => instance,
      lifetime: ServiceLifetime.Singleton
    };
  }
}

/**
 * Service tokens for type safety
 */
export const ServiceTokens = {
  // Repository tokens
  FUNCTION_MODEL_REPOSITORY: Symbol('IFunctionModelRepository'),
  AUDIT_LOG_REPOSITORY: Symbol('IAuditLogRepository'),
  AI_AGENT_REPOSITORY: Symbol('AIAgentRepository'),
  
  // Event bus tokens
  EVENT_BUS: Symbol('IEventBus'),
  
  // Cache service tokens
  CACHE_SERVICE: Symbol('ICacheService'),
  FUNCTION_MODEL_CACHE_SERVICE: Symbol('FunctionModelCacheService'),
  
  // External service tokens
  AI_SERVICE_ADAPTER: Symbol('IAIServiceAdapter'),
  NOTIFICATION_SERVICE_ADAPTER: Symbol('INotificationServiceAdapter'),
  
  // Use case tokens
  CREATE_FUNCTION_MODEL_USE_CASE: Symbol('CreateFunctionModelUseCase'),
  UPDATE_FUNCTION_MODEL_USE_CASE: Symbol('UpdateFunctionModelUseCase'),
  PUBLISH_FUNCTION_MODEL_USE_CASE: Symbol('PublishFunctionModelUseCase'),
  ARCHIVE_FUNCTION_MODEL_USE_CASE: Symbol('ArchiveFunctionModelUseCase'),
  EXECUTE_FUNCTION_MODEL_USE_CASE: Symbol('ExecuteFunctionModelUseCase'),
  MANAGE_WORKFLOW_NODES_USE_CASE: Symbol('ManageWorkflowNodesUseCase'),
  CREATE_UNIFIED_NODE_USE_CASE: Symbol('CreateUnifiedNodeUseCase'),
  
  // AI Agent use case tokens
  REGISTER_AI_AGENT_USE_CASE: Symbol('RegisterAIAgentUseCase'),
  DISCOVER_AGENTS_BY_CAPABILITY_USE_CASE: Symbol('DiscoverAgentsByCapabilityUseCase'),
  EXECUTE_AI_AGENT_TASK_USE_CASE: Symbol('ExecuteAIAgentTaskUseCase'),
  PERFORM_SEMANTIC_AGENT_SEARCH_USE_CASE: Symbol('PerformSemanticAgentSearchUseCase'),
  COORDINATE_WORKFLOW_AGENT_EXECUTION_USE_CASE: Symbol('CoordinateWorkflowAgentExecutionUseCase'),
  
  // Application service tokens
  AI_AGENT_MANAGEMENT_SERVICE: Symbol('AIAgentManagementService'),
  
  // Query handler tokens
  GET_FUNCTION_MODEL_QUERY_HANDLER: Symbol('GetFunctionModelQueryHandler'),
  LIST_FUNCTION_MODELS_QUERY_HANDLER: Symbol('ListFunctionModelsQueryHandler'),
  GET_MODEL_NODES_QUERY_HANDLER: Symbol('GetModelNodesQueryHandler'),
  
  // Domain service tokens
  WORKFLOW_ORCHESTRATION_SERVICE: Symbol('IWorkflowOrchestrationService'),
  NODE_DEPENDENCY_SERVICE: Symbol('NodeDependencyService'),
  
  // Validation service tokens
  WORKFLOW_VALIDATION_SERVICE: Symbol('IWorkflowValidationService'),
  BUSINESS_RULE_VALIDATION_SERVICE: Symbol('IBusinessRuleValidationService'),
  EXECUTION_READINESS_VALIDATION_SERVICE: Symbol('IExecutionReadinessService'),
  CONTEXT_VALIDATION_SERVICE: Symbol('IContextValidationService'),
  CROSS_FEATURE_VALIDATION_SERVICE: Symbol('ICrossFeatureValidationService'),
  
  // Validation use case tokens
  VALIDATE_WORKFLOW_STRUCTURE_USE_CASE: Symbol('ValidateWorkflowStructureUseCase'),
  
  // Infrastructure tokens
  SUPABASE_CLIENT: Symbol('SupabaseClient'),
  
  // Configuration tokens
  CACHE_CONFIG: Symbol('CacheConfig'),
  NOTIFICATION_CONFIG: Symbol('NotificationConfig'),
  AI_CONFIG: Symbol('AIConfig'),
  
  // Real-time service tokens
  REALTIME_SERVICE: Symbol('IRealtimeService'),
  REALTIME_MODEL_ADAPTER: Symbol('IRealtimeModelAdapter'),
  REALTIME_EXECUTION_ADAPTER: Symbol('IRealtimeExecutionAdapter'),
  REALTIME_STATISTICS_ADAPTER: Symbol('IRealtimeStatisticsAdapter'),
  COLLABORATION_MANAGER: Symbol('ICollaborationManager')
} as const;

/**
 * Module for registering services
 */
export interface ServiceModule {
  register(container: Container): void;
}

/**
 * Resolution container that tracks circular dependencies
 */
class ResolutionContainer {
  constructor(
    private readonly container: Container, 
    private readonly resolutionStack: Set<string | symbol | Function>,
    private readonly currentScope?: ContainerScope
  ) {}

  async resolve<T>(token: string | symbol | Function): Promise<Result<T>> {
    return this.container.resolve<T>(token, this.currentScope, this.resolutionStack);
  }

  // Delegate other methods to the main container
  isRegistered(token: string | symbol | Function): boolean {
    return this.container.isRegistered(token);
  }

  getRegisteredTokens(): (string | symbol | Function)[] {
    return this.container.getRegisteredTokens();
  }

  createScope(): ContainerScope {
    return this.container.createScope();
  }

  createChild(): Container {
    return this.container.createChild();
  }
}

/**
 * Container builder for fluent registration
 */
export class ContainerBuilder {
  private container = new Container();

  /**
   * Register a service module
   */
  registerModule(module: ServiceModule): ContainerBuilder {
    module.register(this.container);
    return this;
  }

  /**
   * Register services from descriptors
   */
  registerServices(descriptors: ServiceDescriptor[]): ContainerBuilder {
    for (const descriptor of descriptors) {
      this.container.register(descriptor);
    }
    return this;
  }

  /**
   * Register a transient service
   */
  registerTransient<T>(
    token: string | symbol | Function,
    factory: (container: Container) => T | Promise<T>,
    dependencies?: (string | symbol | Function)[]
  ): ContainerBuilder {
    this.container.registerTransient(token, factory, dependencies);
    return this;
  }

  /**
   * Register a scoped service
   */
  registerScoped<T>(
    token: string | symbol | Function,
    factory: (container: Container) => T | Promise<T>,
    dependencies?: (string | symbol | Function)[]
  ): ContainerBuilder {
    this.container.registerScoped(token, factory, dependencies);
    return this;
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(
    token: string | symbol | Function,
    factory: (container: Container) => T | Promise<T>,
    dependencies?: (string | symbol | Function)[]
  ): ContainerBuilder {
    this.container.registerSingleton(token, factory, dependencies);
    return this;
  }

  /**
   * Register an instance as singleton
   */
  registerInstance<T>(token: string | symbol | Function, instance: T): ContainerBuilder {
    this.container.registerInstance(token, instance);
    return this;
  }

  /**
   * Build the container
   */
  build(): Container {
    return this.container;
  }
}