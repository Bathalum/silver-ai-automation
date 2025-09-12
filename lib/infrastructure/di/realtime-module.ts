import { Container, ServiceModule, ServiceTokens } from './container';
import { createLogger } from '../logging/console-logger';
import { createRealtimeService } from '../services/realtime-service';
import { RealtimeModelAdapter } from '../adapters/realtime-model-adapter';
import { RealtimeExecutionAdapter } from '../adapters/realtime-execution-adapter';
import { RealtimeStatisticsAdapter } from '../adapters/realtime-statistics-adapter';
import { CollaborationManager } from '../services/collaboration-manager';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Real-time services module for dependency injection
 * Registers all real-time adapters and services with proper dependency injection
 */
export class RealtimeModule implements ServiceModule {
  register(container: Container): void {
    // Register real-time service as singleton
    container.registerSingleton(
      ServiceTokens.REALTIME_SERVICE,
      async (c) => {
        const loggerResult = await c.resolve(ServiceTokens.LOGGER || 'logger');
        const logger = loggerResult.isSuccess ? loggerResult.value : createLogger();
        
        return createRealtimeService(logger, {
          enabled: true,
          autoReconnect: true,
          maxReconnectAttempts: 5,
          reconnectDelayMs: 1000,
          heartbeatIntervalMs: 30000,
          presenceTracking: true,
          conflictResolution: 'lastWriteWins',
          debugMode: process.env.NODE_ENV === 'development'
        });
      }
    );

    // Register real-time model adapter as singleton
    container.registerSingleton(
      ServiceTokens.REALTIME_MODEL_ADAPTER,
      async (c) => {
        const supabaseResult = await c.resolve<SupabaseClient>(ServiceTokens.SUPABASE_CLIENT);
        const loggerResult = await c.resolve(ServiceTokens.LOGGER || 'logger');
        
        if (supabaseResult.isFailure) {
          throw new Error(`Failed to resolve Supabase client: ${supabaseResult.error}`);
        }
        
        const logger = loggerResult.isSuccess ? loggerResult.value : createLogger();
        return new RealtimeModelAdapter(supabaseResult.value, logger);
      }
    );

    // Register real-time execution adapter as singleton
    container.registerSingleton(
      ServiceTokens.REALTIME_EXECUTION_ADAPTER,
      async (c) => {
        const supabaseResult = await c.resolve<SupabaseClient>(ServiceTokens.SUPABASE_CLIENT);
        const loggerResult = await c.resolve(ServiceTokens.LOGGER || 'logger');
        
        if (supabaseResult.isFailure) {
          throw new Error(`Failed to resolve Supabase client: ${supabaseResult.error}`);
        }
        
        const logger = loggerResult.isSuccess ? loggerResult.value : createLogger();
        return new RealtimeExecutionAdapter(supabaseResult.value, logger);
      }
    );

    // Register real-time statistics adapter as singleton
    container.registerSingleton(
      ServiceTokens.REALTIME_STATISTICS_ADAPTER,
      async (c) => {
        const supabaseResult = await c.resolve<SupabaseClient>(ServiceTokens.SUPABASE_CLIENT);
        const loggerResult = await c.resolve(ServiceTokens.LOGGER || 'logger');
        
        if (supabaseResult.isFailure) {
          throw new Error(`Failed to resolve Supabase client: ${supabaseResult.error}`);
        }
        
        const logger = loggerResult.isSuccess ? loggerResult.value : createLogger();
        return new RealtimeStatisticsAdapter(supabaseResult.value, logger);
      }
    );

    // Register collaboration manager as singleton
    container.registerSingleton(
      ServiceTokens.COLLABORATION_MANAGER,
      async (c) => {
        const supabaseResult = await c.resolve<SupabaseClient>(ServiceTokens.SUPABASE_CLIENT);
        const loggerResult = await c.resolve(ServiceTokens.LOGGER || 'logger');
        
        if (supabaseResult.isFailure) {
          throw new Error(`Failed to resolve Supabase client: ${supabaseResult.error}`);
        }
        
        const logger = loggerResult.isSuccess ? loggerResult.value : createLogger();
        return new CollaborationManager(supabaseResult.value, logger);
      }
    );
  }
}