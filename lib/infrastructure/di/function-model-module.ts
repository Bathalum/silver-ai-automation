import { SupabaseClient } from '@supabase/supabase-js';
import { Container, ServiceModule, ServiceTokens, ServiceRegistration } from './container';
import { SupabaseFunctionModelRepository } from '../repositories/supabase-function-model-repository';
import { SupabaseEventBus } from '../events/supabase-event-bus';
import { MemoryCacheService, FunctionModelCacheService } from '../cache/cache-service';
import { OpenAIServiceAdapter } from '../external/ai-service-adapter';
import { SupabaseNotificationServiceAdapter } from '../external/notification-service-adapter';
import { CreateFunctionModelUseCase } from '../../use-cases/function-model/create-function-model-use-case';
import { UpdateFunctionModelUseCase } from '../../use-cases/function-model/update-function-model-use-case';
import { PublishFunctionModelUseCase } from '../../use-cases/function-model/publish-function-model-use-case';
import { GetFunctionModelQueryHandler } from '../../use-cases/queries/get-function-model-query';
import { WorkflowOrchestrationService } from '../../domain/services/workflow-orchestration-service';
import { NodeDependencyService } from '../../domain/services/node-dependency-service';

/**
 * Service module for Function Model feature registration
 */
export class FunctionModelModule implements ServiceModule {
  register(container: Container): void {
    // Register configuration
    this.registerConfiguration(container);
    
    // Register infrastructure services
    this.registerInfrastructure(container);
    
    // Register repositories
    this.registerRepositories(container);
    
    // Register external services
    this.registerExternalServices(container);
    
    // Register domain services
    this.registerDomainServices(container);
    
    // Register use cases
    this.registerUseCases(container);
    
    // Register query handlers
    this.registerQueryHandlers(container);
  }

  private registerConfiguration(container: Container): void {
    // Cache configuration
    container.registerInstance(ServiceTokens.CACHE_CONFIG, {
      defaultTtl: 3600, // 1 hour
      maxEntries: 10000,
      keyPrefix: 'fm:',
      serializationFormat: 'json' as const,
      compressionEnabled: false
    });

    // AI configuration
    container.registerInstance(ServiceTokens.AI_CONFIG, {
      openAI: {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4',
        timeout: 30000
      }
    });

    // Notification configuration
    container.registerInstance(ServiceTokens.NOTIFICATION_CONFIG, {
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      },
      email: {
        provider: 'supabase',
        defaultSender: process.env.DEFAULT_EMAIL_SENDER || 'noreply@example.com'
      },
      push: {
        provider: 'supabase'
      },
      sms: {
        provider: 'supabase'
      },
      slack: {
        provider: 'supabase'
      }
    });
  }

  private registerInfrastructure(container: Container): void {
    // Register cache service
    container.register(ServiceRegistration.singleton(
      ServiceTokens.CACHE_SERVICE,
      async (c) => {
        const config = await c.resolve(ServiceTokens.CACHE_CONFIG);
        if (config.isFailure) {
          throw new Error('Failed to resolve cache config');
        }
        return new MemoryCacheService(config.value);
      }
    ));

    // Register function model cache service
    container.register(ServiceRegistration.singleton(
      ServiceTokens.FUNCTION_MODEL_CACHE_SERVICE,
      async (c) => {
        const cacheService = await c.resolve(ServiceTokens.CACHE_SERVICE);
        if (cacheService.isFailure) {
          throw new Error('Failed to resolve cache service');
        }
        
        return new FunctionModelCacheService(cacheService.value, {
          modelTtl: 3600,        // 1 hour
          listTtl: 600,          // 10 minutes
          statsTtl: 1800,        // 30 minutes
          permissionsTtl: 3600,  // 1 hour
          queryTtl: 300          // 5 minutes
        });
      }
    ));

    // Register event bus
    container.register(ServiceRegistration.singleton(
      ServiceTokens.EVENT_BUS,
      async (c) => {
        const supabaseClient = await c.resolve(ServiceTokens.SUPABASE_CLIENT);
        if (supabaseClient.isFailure) {
          throw new Error('Failed to resolve Supabase client');
        }
        return new SupabaseEventBus(supabaseClient.value);
      }
    ));
  }

  private registerRepositories(container: Container): void {
    // Register function model repository
    container.register(ServiceRegistration.scoped(
      ServiceTokens.FUNCTION_MODEL_REPOSITORY,
      async (c) => {
        const supabaseClient = await c.resolve(ServiceTokens.SUPABASE_CLIENT);
        if (supabaseClient.isFailure) {
          throw new Error('Failed to resolve Supabase client');
        }
        return new SupabaseFunctionModelRepository(supabaseClient.value);
      }
    ));
  }

  private registerExternalServices(container: Container): void {
    // Register AI service adapter
    container.register(ServiceRegistration.singleton(
      ServiceTokens.AI_SERVICE_ADAPTER,
      async (c) => {
        const config = await c.resolve(ServiceTokens.AI_CONFIG);
        if (config.isFailure) {
          throw new Error('Failed to resolve AI config');
        }
        return new OpenAIServiceAdapter(
          config.value.openAI.apiKey,
          config.value.openAI.baseUrl
        );
      }
    ));

    // Register notification service adapter
    container.register(ServiceRegistration.singleton(
      ServiceTokens.NOTIFICATION_SERVICE_ADAPTER,
      async (c) => {
        const config = await c.resolve(ServiceTokens.NOTIFICATION_CONFIG);
        if (config.isFailure) {
          throw new Error('Failed to resolve notification config');
        }
        return new SupabaseNotificationServiceAdapter(
          config.value.supabase.url,
          config.value.supabase.key
        );
      }
    ));
  }

  private registerDomainServices(container: Container): void {
    // Register workflow orchestration service
    container.register(ServiceRegistration.transient(
      ServiceTokens.WORKFLOW_ORCHESTRATION_SERVICE,
      async (c) => {
        return new WorkflowOrchestrationService();
      }
    ));

    // Register node dependency service
    container.register(ServiceRegistration.transient(
      ServiceTokens.NODE_DEPENDENCY_SERVICE,
      async (c) => {
        return new NodeDependencyService();
      }
    ));
  }

  private registerUseCases(container: Container): void {
    // Register create function model use case
    container.register(ServiceRegistration.transient(
      ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE,
      async (c) => {
        const repository = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const eventBus = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (repository.isFailure) {
          throw new Error('Failed to resolve function model repository');
        }
        if (eventBus.isFailure) {
          throw new Error('Failed to resolve event bus');
        }
        
        return new CreateFunctionModelUseCase(repository.value, eventBus.value);
      }
    ));

    // Register update function model use case
    container.register(ServiceRegistration.transient(
      ServiceTokens.UPDATE_FUNCTION_MODEL_USE_CASE,
      async (c) => {
        const repository = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const eventBus = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (repository.isFailure) {
          throw new Error('Failed to resolve function model repository');
        }
        if (eventBus.isFailure) {
          throw new Error('Failed to resolve event bus');
        }
        
        return new UpdateFunctionModelUseCase(repository.value, eventBus.value);
      }
    ));

    // Register publish function model use case
    container.register(ServiceRegistration.transient(
      ServiceTokens.PUBLISH_FUNCTION_MODEL_USE_CASE,
      async (c) => {
        const repository = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const eventBus = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (repository.isFailure) {
          throw new Error('Failed to resolve function model repository');
        }
        if (eventBus.isFailure) {
          throw new Error('Failed to resolve event bus');
        }
        
        return new PublishFunctionModelUseCase(repository.value, eventBus.value);
      }
    ));
  }

  private registerQueryHandlers(container: Container): void {
    // Register get function model query handler
    container.register(ServiceRegistration.transient(
      ServiceTokens.GET_FUNCTION_MODEL_QUERY_HANDLER,
      async (c) => {
        const repository = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        
        if (repository.isFailure) {
          throw new Error('Failed to resolve function model repository');
        }
        
        return new GetFunctionModelQueryHandler(repository.value);
      }
    ));
  }
}

/**
 * Helper function to create a configured container for the Function Model feature
 */
export async function createFunctionModelContainer(supabaseClient: SupabaseClient): Promise<Container> {
  const container = new Container();
  
  // Register Supabase client
  container.registerInstance(ServiceTokens.SUPABASE_CLIENT, supabaseClient);
  
  // Register the Function Model module
  const module = new FunctionModelModule();
  module.register(container);
  
  return container;
}

/**
 * Container extensions for common use cases
 */
export class FunctionModelContainerExtensions {
  /**
   * Resolve all use cases for dependency injection
   */
  static async resolveUseCases(container: Container) {
    const createUseCase = await container.resolve(ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE);
    const updateUseCase = await container.resolve(ServiceTokens.UPDATE_FUNCTION_MODEL_USE_CASE);
    const publishUseCase = await container.resolve(ServiceTokens.PUBLISH_FUNCTION_MODEL_USE_CASE);
    
    if (createUseCase.isFailure || updateUseCase.isFailure || publishUseCase.isFailure) {
      throw new Error('Failed to resolve use cases');
    }
    
    return {
      createUseCase: createUseCase.value,
      updateUseCase: updateUseCase.value,
      publishUseCase: publishUseCase.value
    };
  }

  /**
   * Resolve all query handlers for dependency injection
   */
  static async resolveQueryHandlers(container: Container) {
    const getFunctionModelHandler = await container.resolve(ServiceTokens.GET_FUNCTION_MODEL_QUERY_HANDLER);
    
    if (getFunctionModelHandler.isFailure) {
      throw new Error('Failed to resolve query handlers');
    }
    
    return {
      getFunctionModelHandler: getFunctionModelHandler.value
    };
  }

  /**
   * Resolve all services for manual usage
   */
  static async resolveServices(container: Container) {
    const repository = await container.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
    const eventBus = await container.resolve(ServiceTokens.EVENT_BUS);
    const cacheService = await container.resolve(ServiceTokens.FUNCTION_MODEL_CACHE_SERVICE);
    const aiService = await container.resolve(ServiceTokens.AI_SERVICE_ADAPTER);
    const notificationService = await container.resolve(ServiceTokens.NOTIFICATION_SERVICE_ADAPTER);
    
    if (repository.isFailure || eventBus.isFailure || cacheService.isFailure || 
        aiService.isFailure || notificationService.isFailure) {
      throw new Error('Failed to resolve services');
    }
    
    return {
      repository: repository.value,
      eventBus: eventBus.value,
      cacheService: cacheService.value,
      aiService: aiService.value,
      notificationService: notificationService.value
    };
  }
}