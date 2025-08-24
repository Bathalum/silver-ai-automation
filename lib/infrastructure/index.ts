// Repository exports
export { BaseRepository } from './repositories/base-repository';
export { SupabaseFunctionModelRepository } from './repositories/supabase-function-model-repository';

// Event system exports
export { 
  DomainEvent,
  FunctionModelCreated,
  FunctionModelUpdated,
  FunctionModelPublished,
  FunctionModelArchived,
  FunctionModelDeleted,
  NodeAdded,
  ActionNodeAdded,
  WorkflowExecutionStarted,
  WorkflowExecutionCompleted
} from './events/domain-event';
export { SupabaseEventBus } from './events/supabase-event-bus';

// Cache exports
export { 
  ICacheService,
  CacheStats,
  CacheConfig,
  MemoryCacheService,
  FunctionModelCacheService
} from './cache/cache-service';

// External service exports
export { 
  IAIServiceAdapter,
  AIActionConfig,
  AIActionResult,
  AIModel,
  CostEstimate,
  OpenAIServiceAdapter
} from './external/ai-service-adapter';
export { 
  INotificationServiceAdapter,
  NotificationConfig,
  EmailNotificationConfig,
  PushNotificationConfig,
  SMSNotificationConfig,
  SlackNotificationConfig,
  NotificationResult,
  NotificationTemplate,
  SupabaseNotificationServiceAdapter,
  MultiProviderNotificationServiceAdapter
} from './external/notification-service-adapter';

// Dependency injection exports
export { 
  Container,
  ContainerScope,
  ServiceDescriptor,
  ServiceLifetime,
  ServiceModule,
  ServiceRegistration,
  ServiceTokens,
  ContainerBuilder
} from './di/container';
export { 
  FunctionModelModule,
  createFunctionModelContainer,
  FunctionModelContainerExtensions
} from './di/function-model-module';

// Re-export existing infrastructure
export { createClient as createSupabaseClient } from '../supabase/client';
export { createClient as createSupabaseServerClient } from '../supabase/server';