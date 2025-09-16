import { SupabaseClient } from '@supabase/supabase-js';
import { Container, ServiceModule, ServiceTokens, ServiceRegistration } from './container';
import { SupabaseFunctionModelRepository } from '../repositories/supabase-function-model-repository';
import { SupabaseAuditLogRepository } from '../repositories/supabase-audit-log-repository';
import { SupabaseEventBus } from '../events/supabase-event-bus';
import { MemoryCacheService, FunctionModelCacheService } from '../cache/cache-service';
import { OpenAIServiceAdapter } from '../external/ai-service-adapter';
import { SupabaseNotificationServiceAdapter } from '../external/notification-service-adapter';
import { CreateFunctionModelUseCase } from '../../use-cases/function-model/create-function-model-use-case';
import { UpdateFunctionModelUseCase } from '../../use-cases/function-model/update-function-model-use-case';
import { PublishFunctionModelUseCase } from '../../use-cases/function-model/publish-function-model-use-case';
import { ArchiveFunctionModelUseCase } from '../../use-cases/function-model/archive-function-model-use-case';
import { ExecuteFunctionModelUseCase } from '../../use-cases/function-model/execute-function-model-use-case';
import { ManageWorkflowNodesUseCase } from '../../use-cases/function-model/manage-workflow-nodes-use-case';
import { GetFunctionModelQueryHandler } from '../../use-cases/queries/get-function-model-query';
import { ListFunctionModelsQueryHandler } from '../../use-cases/queries/list-function-models-query';
import { GetModelNodesQueryHandler } from '../../use-cases/queries/get-model-nodes-query';
import { WorkflowOrchestrationService } from '../../domain/services/workflow-orchestration-service';
import { NodeDependencyService } from '../../domain/services/node-dependency-service';
import { CrossFeatureLinkingService } from '../../domain/services/cross-feature-linking-service';
import { ActionNodeExecutionService } from '../../domain/services/action-node-execution-service';
import { FractalOrchestrationService } from '../../domain/services/fractal-orchestration-service';
import { ActionNodeOrchestrationService } from '../../domain/services/action-node-orchestration-service';
import { NodeContextAccessService } from '../../domain/services/node-context-access-service';
import { WorkflowStructuralValidationService } from '../../domain/services/workflow-structural-validation-service';
import { BusinessRuleValidationService } from '../../domain/services/business-rule-validation-service';
import { ExecutionReadinessValidationService } from '../../domain/services/execution-readiness-validation-service';
import { ContextValidationService } from '../../domain/services/context-validation-service';
import { CrossFeatureValidationService } from '../../domain/services/cross-feature-validation-service';
import { ValidateWorkflowStructureUseCase } from '../../use-cases/function-model/validate-workflow-structure-use-case';
import { CreateUnifiedNodeUseCase } from '../../use-cases/function-model/create-unified-node-use-case';
import { EdgeValidationService } from '../../domain/services/edge-validation-service';
import { CreateEdgeUseCase } from '../../use-cases/edges/create-edge-use-case';
import { DeleteEdgeUseCase } from '../../use-cases/edges/delete-edge-use-case';
import { GetModelEdgesQueryHandler } from '../../use-cases/queries/get-model-edges-query';
import { SupabaseNodeLinkRepository } from '../repositories/supabase-node-link-repository';

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
        const configResult = await c.resolve(ServiceTokens.CACHE_CONFIG);
        if (configResult.isFailure) {
          throw new Error(`Failed to resolve cache config: ${configResult.error}`);
        }
        return new MemoryCacheService(configResult.value);
      }
    ));

    // Register function model cache service
    container.register(ServiceRegistration.singleton(
      ServiceTokens.FUNCTION_MODEL_CACHE_SERVICE,
      async (c) => {
        const cacheServiceResult = await c.resolve(ServiceTokens.CACHE_SERVICE);
        if (cacheServiceResult.isFailure) {
          throw new Error(`Failed to resolve cache service: ${cacheServiceResult.error}`);
        }
        
        return new FunctionModelCacheService(cacheServiceResult.value, {
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
        const supabaseClientResult = await c.resolve(ServiceTokens.SUPABASE_CLIENT);
        if (supabaseClientResult.isFailure) {
          throw new Error(`Failed to resolve Supabase client: ${supabaseClientResult.error}`);
        }
        return new SupabaseEventBus(supabaseClientResult.value);
      }
    ));
  }

  private registerRepositories(container: Container): void {
    // Register function model repository (transient for per-request lifecycle)
    container.register(ServiceRegistration.transient(
      ServiceTokens.FUNCTION_MODEL_REPOSITORY,
      async (c) => {
        const supabaseClientResult = await c.resolve(ServiceTokens.SUPABASE_CLIENT);
        if (supabaseClientResult.isFailure) {
          throw new Error(`Failed to resolve Supabase client: ${supabaseClientResult.error}`);
        }
        return new SupabaseFunctionModelRepository(supabaseClientResult.value);
      }
    ));

    // Register audit log repository
    container.register(ServiceRegistration.transient(
      ServiceTokens.AUDIT_LOG_REPOSITORY,
      async (c) => {
        const supabaseClientResult = await c.resolve(ServiceTokens.SUPABASE_CLIENT);
        if (supabaseClientResult.isFailure) {
          throw new Error(`Failed to resolve Supabase client: ${supabaseClientResult.error}`);
        }
        return new SupabaseAuditLogRepository(supabaseClientResult.value);
      }
    ));

    // Register node link repository (for edge operations)
    container.register(ServiceRegistration.transient(
      ServiceTokens.NODE_LINK_REPOSITORY,
      async (c) => {
        const supabaseClientResult = await c.resolve(ServiceTokens.SUPABASE_CLIENT);
        if (supabaseClientResult.isFailure) {
          throw new Error(`Failed to resolve Supabase client: ${supabaseClientResult.error}`);
        }
        return new SupabaseNodeLinkRepository(supabaseClientResult.value);
      }
    ));
  }

  private registerExternalServices(container: Container): void {
    // Register AI service adapter
    container.register(ServiceRegistration.singleton(
      ServiceTokens.AI_SERVICE_ADAPTER,
      async (c) => {
        const configResult = await c.resolve(ServiceTokens.AI_CONFIG);
        if (configResult.isFailure) {
          throw new Error(`Failed to resolve AI config: ${configResult.error}`);
        }
        return new OpenAIServiceAdapter(
          configResult.value.openAI.apiKey,
          configResult.value.openAI.baseUrl
        );
      }
    ));

    // Register notification service adapter
    container.register(ServiceRegistration.singleton(
      ServiceTokens.NOTIFICATION_SERVICE_ADAPTER,
      async (c) => {
        const configResult = await c.resolve(ServiceTokens.NOTIFICATION_CONFIG);
        if (configResult.isFailure) {
          throw new Error(`Failed to resolve notification config: ${configResult.error}`);
        }
        return new SupabaseNotificationServiceAdapter(
          configResult.value.supabase.url,
          configResult.value.supabase.key
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

    // Register cross-feature linking service
    container.register(ServiceRegistration.transient(
      'CrossFeatureLinkingService',
      async (c) => {
        return new CrossFeatureLinkingService();
      }
    ));

    // Register action node execution service
    container.register(ServiceRegistration.transient(
      'ActionNodeExecutionService',
      async (c) => {
        return new ActionNodeExecutionService();
      }
    ));

    // Register fractal orchestration service
    container.register(ServiceRegistration.transient(
      'FractalOrchestrationService',
      async (c) => {
        return new FractalOrchestrationService();
      }
    ));

    // Register action node orchestration service
    container.register(ServiceRegistration.transient(
      'ActionNodeOrchestrationService',
      async (c) => {
        return new ActionNodeOrchestrationService();
      }
    ));

    // Register node context access service
    container.register(ServiceRegistration.transient(
      'NodeContextAccessService',
      async (c) => {
        return new NodeContextAccessService();
      }
    ));

    // Register validation services
    container.register(ServiceRegistration.transient(
      ServiceTokens.WORKFLOW_VALIDATION_SERVICE,
      async (c) => {
        return new WorkflowStructuralValidationService();
      }
    ));

    container.register(ServiceRegistration.transient(
      ServiceTokens.BUSINESS_RULE_VALIDATION_SERVICE,
      async (c) => {
        return new BusinessRuleValidationService();
      }
    ));

    container.register(ServiceRegistration.transient(
      ServiceTokens.EXECUTION_READINESS_VALIDATION_SERVICE,
      async (c) => {
        return new ExecutionReadinessValidationService();
      }
    ));

    container.register(ServiceRegistration.transient(
      ServiceTokens.CONTEXT_VALIDATION_SERVICE,
      async (c) => {
        return new ContextValidationService();
      }
    ));

    container.register(ServiceRegistration.transient(
      ServiceTokens.CROSS_FEATURE_VALIDATION_SERVICE,
      async (c) => {
        return new CrossFeatureValidationService();
      }
    ));

    // Register edge validation service
    container.register(ServiceRegistration.transient(
      ServiceTokens.EDGE_VALIDATION_SERVICE,
      async (c) => {
        return new EdgeValidationService();
      }
    ));
  }

  private registerUseCases(container: Container): void {
    // Register create function model use case
    container.register(ServiceRegistration.transient(
      ServiceTokens.CREATE_FUNCTION_MODEL_USE_CASE,
      async (c) => {
        const repositoryResult = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const eventBusResult = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (repositoryResult.isFailure) {
          throw new Error(`Failed to resolve function model repository: ${repositoryResult.error}`);
        }
        if (eventBusResult.isFailure) {
          throw new Error(`Failed to resolve event bus: ${eventBusResult.error}`);
        }
        
        return new CreateFunctionModelUseCase(repositoryResult.value, eventBusResult.value);
      }
    ));

    // Register update function model use case
    container.register(ServiceRegistration.transient(
      ServiceTokens.UPDATE_FUNCTION_MODEL_USE_CASE,
      async (c) => {
        const repositoryResult = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const eventBusResult = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (repositoryResult.isFailure) {
          throw new Error(`Failed to resolve function model repository: ${repositoryResult.error}`);
        }
        if (eventBusResult.isFailure) {
          throw new Error(`Failed to resolve event bus: ${eventBusResult.error}`);
        }
        
        return new UpdateFunctionModelUseCase(repositoryResult.value, eventBusResult.value);
      }
    ));

    // Register publish function model use case
    container.register(ServiceRegistration.transient(
      ServiceTokens.PUBLISH_FUNCTION_MODEL_USE_CASE,
      async (c) => {
        const repositoryResult = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const eventBusResult = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (repositoryResult.isFailure) {
          throw new Error(`Failed to resolve function model repository: ${repositoryResult.error}`);
        }
        if (eventBusResult.isFailure) {
          throw new Error(`Failed to resolve event bus: ${eventBusResult.error}`);
        }
        
        return new PublishFunctionModelUseCase(repositoryResult.value, eventBusResult.value);
      }
    ));

    // Register archive function model use case
    container.register(ServiceRegistration.transient(
      ServiceTokens.ARCHIVE_FUNCTION_MODEL_USE_CASE,
      async (c) => {
        const repositoryResult = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const eventBusResult = await c.resolve(ServiceTokens.EVENT_BUS);
        const nodeDependencyServiceResult = await c.resolve(ServiceTokens.NODE_DEPENDENCY_SERVICE);
        const crossFeatureLinkingServiceResult = await c.resolve('CrossFeatureLinkingService');
        
        if (repositoryResult.isFailure) {
          throw new Error(`Failed to resolve function model repository: ${repositoryResult.error}`);
        }
        if (eventBusResult.isFailure) {
          throw new Error(`Failed to resolve event bus: ${eventBusResult.error}`);
        }
        if (nodeDependencyServiceResult.isFailure) {
          throw new Error(`Failed to resolve node dependency service: ${nodeDependencyServiceResult.error}`);
        }
        if (crossFeatureLinkingServiceResult.isFailure) {
          throw new Error(`Failed to resolve cross feature linking service: ${crossFeatureLinkingServiceResult.error}`);
        }
        
        return new ArchiveFunctionModelUseCase(
          repositoryResult.value,
          eventBusResult.value,
          nodeDependencyServiceResult.value,
          crossFeatureLinkingServiceResult.value
        );
      }
    ));

    // Register execute function model use case
    container.register(ServiceRegistration.transient(
      ServiceTokens.EXECUTE_FUNCTION_MODEL_USE_CASE,
      async (c) => {
        const repositoryResult = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const eventBusResult = await c.resolve(ServiceTokens.EVENT_BUS);
        const workflowOrchestrationServiceResult = await c.resolve(ServiceTokens.WORKFLOW_ORCHESTRATION_SERVICE);
        const actionNodeExecutionServiceResult = await c.resolve('ActionNodeExecutionService');
        const fractalOrchestrationServiceResult = await c.resolve('FractalOrchestrationService');
        const actionNodeOrchestrationServiceResult = await c.resolve('ActionNodeOrchestrationService');
        const nodeContextAccessServiceResult = await c.resolve('NodeContextAccessService');
        
        if (repositoryResult.isFailure) {
          throw new Error(`Failed to resolve function model repository: ${repositoryResult.error}`);
        }
        if (eventBusResult.isFailure) {
          throw new Error(`Failed to resolve event bus: ${eventBusResult.error}`);
        }
        if (workflowOrchestrationServiceResult.isFailure) {
          throw new Error(`Failed to resolve workflow orchestration service: ${workflowOrchestrationServiceResult.error}`);
        }
        if (actionNodeExecutionServiceResult.isFailure) {
          throw new Error(`Failed to resolve action node execution service: ${actionNodeExecutionServiceResult.error}`);
        }
        if (fractalOrchestrationServiceResult.isFailure) {
          throw new Error(`Failed to resolve fractal orchestration service: ${fractalOrchestrationServiceResult.error}`);
        }
        if (actionNodeOrchestrationServiceResult.isFailure) {
          throw new Error(`Failed to resolve action node orchestration service: ${actionNodeOrchestrationServiceResult.error}`);
        }
        if (nodeContextAccessServiceResult.isFailure) {
          throw new Error(`Failed to resolve node context access service: ${nodeContextAccessServiceResult.error}`);
        }
        
        return new ExecuteFunctionModelUseCase(
          repositoryResult.value,
          eventBusResult.value,
          workflowOrchestrationServiceResult.value,
          actionNodeExecutionServiceResult.value,
          fractalOrchestrationServiceResult.value,
          actionNodeOrchestrationServiceResult.value,
          nodeContextAccessServiceResult.value
        );
      }
    ));


    // Register manage workflow nodes use case
    container.register(ServiceRegistration.transient(
      ServiceTokens.MANAGE_WORKFLOW_NODES_USE_CASE,
      async (c) => {
        const repositoryResult = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const eventBusResult = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (repositoryResult.isFailure) {
          throw new Error(`Failed to resolve function model repository: ${repositoryResult.error}`);
        }
        if (eventBusResult.isFailure) {
          throw new Error(`Failed to resolve event bus: ${eventBusResult.error}`);
        }
        
        return new ManageWorkflowNodesUseCase(repositoryResult.value, eventBusResult.value);
      }
    ));

    // Register validate workflow structure use case
    container.register(ServiceRegistration.transient(
      ServiceTokens.VALIDATE_WORKFLOW_STRUCTURE_USE_CASE,
      async (c) => {
        const repositoryResult = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const workflowValidationServiceResult = await c.resolve(ServiceTokens.WORKFLOW_VALIDATION_SERVICE);
        const businessRuleValidationServiceResult = await c.resolve(ServiceTokens.BUSINESS_RULE_VALIDATION_SERVICE);
        const executionReadinessServiceResult = await c.resolve(ServiceTokens.EXECUTION_READINESS_VALIDATION_SERVICE);
        const contextValidationServiceResult = await c.resolve(ServiceTokens.CONTEXT_VALIDATION_SERVICE);
        const crossFeatureValidationServiceResult = await c.resolve(ServiceTokens.CROSS_FEATURE_VALIDATION_SERVICE);
        
        if (repositoryResult.isFailure) {
          throw new Error(`Failed to resolve function model repository: ${repositoryResult.error}`);
        }
        if (workflowValidationServiceResult.isFailure) {
          throw new Error(`Failed to resolve workflow validation service: ${workflowValidationServiceResult.error}`);
        }
        if (businessRuleValidationServiceResult.isFailure) {
          throw new Error(`Failed to resolve business rule validation service: ${businessRuleValidationServiceResult.error}`);
        }
        if (executionReadinessServiceResult.isFailure) {
          throw new Error(`Failed to resolve execution readiness service: ${executionReadinessServiceResult.error}`);
        }
        if (contextValidationServiceResult.isFailure) {
          throw new Error(`Failed to resolve context validation service: ${contextValidationServiceResult.error}`);
        }
        if (crossFeatureValidationServiceResult.isFailure) {
          throw new Error(`Failed to resolve cross feature validation service: ${crossFeatureValidationServiceResult.error}`);
        }
        
        return new ValidateWorkflowStructureUseCase(
          repositoryResult.value,
          workflowValidationServiceResult.value,
          businessRuleValidationServiceResult.value,
          executionReadinessServiceResult.value,
          contextValidationServiceResult.value,
          crossFeatureValidationServiceResult.value
        );
      }
    ));

    // Register create unified node use case (TDD specification)
    container.register(ServiceRegistration.transient(
      ServiceTokens.CREATE_UNIFIED_NODE_USE_CASE,
      async (c) => {
        const repositoryResult = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        const eventBusResult = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (repositoryResult.isFailure) {
          throw new Error(`Failed to resolve function model repository: ${repositoryResult.error}`);
        }
        if (eventBusResult.isFailure) {
          throw new Error(`Failed to resolve event bus: ${eventBusResult.error}`);
        }
        
        return new CreateUnifiedNodeUseCase(repositoryResult.value, eventBusResult.value);
      }
    ));

    // Register edge use cases
    container.register(ServiceRegistration.transient(
      ServiceTokens.CREATE_EDGE_USE_CASE,
      async (c) => {
        const edgeValidationServiceResult = await c.resolve(ServiceTokens.EDGE_VALIDATION_SERVICE);
        const nodeLinkRepositoryResult = await c.resolve(ServiceTokens.NODE_LINK_REPOSITORY);
        const eventBusResult = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (edgeValidationServiceResult.isFailure) {
          throw new Error(`Failed to resolve edge validation service: ${edgeValidationServiceResult.error}`);
        }
        if (nodeLinkRepositoryResult.isFailure) {
          throw new Error(`Failed to resolve node link repository: ${nodeLinkRepositoryResult.error}`);
        }
        if (eventBusResult.isFailure) {
          throw new Error(`Failed to resolve event bus: ${eventBusResult.error}`);
        }
        
        return new CreateEdgeUseCase(
          edgeValidationServiceResult.value,
          nodeLinkRepositoryResult.value,
          eventBusResult.value
        );
      }
    ));

    container.register(ServiceRegistration.transient(
      ServiceTokens.DELETE_EDGE_USE_CASE,
      async (c) => {
        const nodeLinkRepositoryResult = await c.resolve(ServiceTokens.NODE_LINK_REPOSITORY);
        const eventBusResult = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (nodeLinkRepositoryResult.isFailure) {
          throw new Error(`Failed to resolve node link repository: ${nodeLinkRepositoryResult.error}`);
        }
        if (eventBusResult.isFailure) {
          throw new Error(`Failed to resolve event bus: ${eventBusResult.error}`);
        }
        
        return new DeleteEdgeUseCase(
          nodeLinkRepositoryResult.value,
          eventBusResult.value
        );
      }
    ));
  }

  private registerQueryHandlers(container: Container): void {
    // Register get function model query handler
    container.register(ServiceRegistration.transient(
      ServiceTokens.GET_FUNCTION_MODEL_QUERY_HANDLER,
      async (c) => {
        const repositoryResult = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        
        if (repositoryResult.isFailure) {
          throw new Error(`Failed to resolve function model repository: ${repositoryResult.error}`);
        }
        
        return new GetFunctionModelQueryHandler(repositoryResult.value);
      }
    ));

    // Register list function models query handler
    container.register(ServiceRegistration.transient(
      ServiceTokens.LIST_FUNCTION_MODELS_QUERY_HANDLER,
      async (c) => {
        const repositoryResult = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        
        if (repositoryResult.isFailure) {
          throw new Error(`Failed to resolve function model repository: ${repositoryResult.error}`);
        }
        
        return new ListFunctionModelsQueryHandler(repositoryResult.value);
      }
    ));

    // Register get model nodes query handler
    container.register(ServiceRegistration.transient(
      ServiceTokens.GET_MODEL_NODES_QUERY_HANDLER,
      async (c) => {
        const repositoryResult = await c.resolve(ServiceTokens.FUNCTION_MODEL_REPOSITORY);
        
        if (repositoryResult.isFailure) {
          throw new Error(`Failed to resolve function model repository: ${repositoryResult.error}`);
        }
        
        return new GetModelNodesQueryHandler(repositoryResult.value);
      }
    ));

    // Register get model edges query handler
    container.register(ServiceRegistration.transient(
      ServiceTokens.GET_MODEL_EDGES_QUERY_HANDLER,
      async (c) => {
        const nodeLinkRepositoryResult = await c.resolve(ServiceTokens.NODE_LINK_REPOSITORY);
        
        if (nodeLinkRepositoryResult.isFailure) {
          throw new Error(`Failed to resolve node link repository: ${nodeLinkRepositoryResult.error}`);
        }
        
        return new GetModelEdgesQueryHandler(nodeLinkRepositoryResult.value);
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
  const functionModelModule = new FunctionModelModule();
  functionModelModule.register(container);
  
  return container;
}

/**
 * Setup DI container with proper Supabase client for both production and test environments
 * This function can be used by server actions and tests
 */
export async function setupContainer(): Promise<Container> {
  try {
    // Try to create server client first (for production)
    const { createClient } = await import('../../supabase/server');
    const supabase = await createClient();
    return await createFunctionModelContainer(supabase);
  } catch (error) {
    // In test environment, create a client with environment variables
    if (process.env.NODE_ENV === 'test' || (error instanceof Error && error.message.includes('cookies'))) {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
      );
      return await createFunctionModelContainer(supabase);
    }
    
    // Re-throw other errors
    throw error;
  }
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