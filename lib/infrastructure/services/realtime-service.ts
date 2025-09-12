import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Result } from '../../domain/shared/result';
import { ILogger } from '../../domain/interfaces/logger.interface';
import { 
  IRealtimeService, 
  IRealtimeModelAdapter, 
  IRealtimeExecutionAdapter, 
  IRealtimeStatisticsAdapter, 
  ICollaborationManager,
  SubscriptionConfig,
  SubscriptionStatus,
  DefaultRealtimeConfig,
  RealtimeConfig
} from '../types/realtime-types';
import { RealtimeModelAdapter } from '../adapters/realtime-model-adapter';
import { RealtimeExecutionAdapter } from '../adapters/realtime-execution-adapter';
import { RealtimeStatisticsAdapter } from '../adapters/realtime-statistics-adapter';
import { CollaborationManager } from './collaboration-manager';

export class RealtimeService implements IRealtimeService {
  private isInitialized = false;
  private supabaseClient: SupabaseClient | null = null;
  private modelAdapter: IRealtimeModelAdapter | null = null;
  private executionAdapter: IRealtimeExecutionAdapter | null = null;
  private statisticsAdapter: IRealtimeStatisticsAdapter | null = null;
  private collaborationManager: ICollaborationManager | null = null;
  private channels: Map<string, RealtimeChannel> = new Map();
  private connectionStatus: SubscriptionStatus;
  private config: RealtimeConfig;

  constructor(
    private logger: ILogger,
    config?: Partial<RealtimeConfig>
  ) {
    this.config = { ...DefaultRealtimeConfig, ...config };
    this.connectionStatus = {
      isConnected: false,
      reconnectAttempts: 0
    };
  }

  /**
   * Initialize the real-time service with Supabase client
   */
  async initialize(supabaseClient: SupabaseClient): Promise<Result<void>> {
    try {
      if (this.isInitialized) {
        return Result.ok(undefined);
      }

      if (!this.config.enabled) {
        this.logger.info('Real-time service is disabled by configuration');
        return Result.ok(undefined);
      }

      this.supabaseClient = supabaseClient;

      // Initialize adapters
      this.modelAdapter = new RealtimeModelAdapter(supabaseClient, this.logger);
      this.executionAdapter = new RealtimeExecutionAdapter(supabaseClient, this.logger);
      this.statisticsAdapter = new RealtimeStatisticsAdapter(
        supabaseClient, 
        this.logger,
        this.config.heartbeatIntervalMs / 6 // Aggregate metrics every 5 seconds by default
      );
      this.collaborationManager = new CollaborationManager(supabaseClient, this.logger);

      // Test connection
      const connectionTest = await this.testConnection();
      if (connectionTest.isFailure) {
        return Result.fail(`Real-time service initialization failed: ${connectionTest.error}`);
      }

      this.isInitialized = true;
      this.connectionStatus = {
        isConnected: true,
        connectionId: 'realtime-service',
        connectedAt: new Date(),
        reconnectAttempts: 0
      };

      this.logger.info('Real-time service initialized successfully');
      return Result.ok(undefined);

    } catch (error) {
      this.logger.error('Failed to initialize real-time service', error);
      return Result.fail(`Initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get model adapter instance
   */
  getModelAdapter(): IRealtimeModelAdapter {
    if (!this.isInitialized || !this.modelAdapter) {
      throw new Error('Real-time service not initialized. Call initialize() first.');
    }
    return this.modelAdapter;
  }

  /**
   * Get execution adapter instance
   */
  getExecutionAdapter(): IRealtimeExecutionAdapter {
    if (!this.isInitialized || !this.executionAdapter) {
      throw new Error('Real-time service not initialized. Call initialize() first.');
    }
    return this.executionAdapter;
  }

  /**
   * Get statistics adapter instance
   */
  getStatisticsAdapter(): IRealtimeStatisticsAdapter {
    if (!this.isInitialized || !this.statisticsAdapter) {
      throw new Error('Real-time service not initialized. Call initialize() first.');
    }
    return this.statisticsAdapter;
  }

  /**
   * Get collaboration manager instance
   */
  getCollaborationManager(): ICollaborationManager {
    if (!this.isInitialized || !this.collaborationManager) {
      throw new Error('Real-time service not initialized. Call initialize() first.');
    }
    return this.collaborationManager;
  }

  /**
   * Create a custom real-time channel
   */
  async createChannel(
    name: string, 
    config?: Partial<SubscriptionConfig>
  ): Promise<Result<RealtimeChannel>> {
    try {
      if (!this.isInitialized || !this.supabaseClient) {
        return Result.fail('Real-time service not initialized');
      }

      if (this.channels.has(name)) {
        return Result.ok(this.channels.get(name)!);
      }

      const channelConfig = {
        ...this.getDefaultChannelConfig(),
        ...config
      };

      const channel = this.supabaseClient.channel(name, {
        config: {
          broadcast: { self: channelConfig.enabled },
          presence: { key: name }
        }
      });

      // Auto-reconnect handling
      if (channelConfig.autoReconnect) {
        this.setupChannelReconnection(channel, name, channelConfig);
      }

      const subscribeResult = await new Promise<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>((resolve) => {
        channel.subscribe((status) => resolve(status));
        setTimeout(() => resolve('TIMED_OUT'), 10000);
      });

      if (subscribeResult !== 'SUBSCRIBED') {
        this.logger.error(`Failed to create channel ${name}: ${subscribeResult}`);
        return Result.fail(`Channel creation failed: ${subscribeResult}`);
      }

      this.channels.set(name, channel);
      this.logger.info(`Created real-time channel: ${name}`);
      
      return Result.ok(channel);

    } catch (error) {
      this.logger.error('Failed to create channel', error);
      return Result.fail(`Channel creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Destroy a real-time channel
   */
  async destroyChannel(name: string): Promise<Result<void>> {
    try {
      const channel = this.channels.get(name);
      if (!channel) {
        return Result.fail('Channel not found');
      }

      await channel.unsubscribe();
      this.channels.delete(name);
      
      this.logger.info(`Destroyed real-time channel: ${name}`);
      return Result.ok(undefined);

    } catch (error) {
      this.logger.error('Failed to destroy channel', error);
      return Result.fail(`Channel destruction error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): SubscriptionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Test real-time connection
   */
  private async testConnection(): Promise<Result<void>> {
    try {
      if (!this.supabaseClient) {
        return Result.fail('Supabase client not available');
      }

      // Create a test channel to verify connection
      const testChannel = this.supabaseClient.channel('connection_test');
      
      const subscribeResult = await new Promise<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>((resolve) => {
        testChannel.subscribe((status) => resolve(status));
        setTimeout(() => resolve('TIMED_OUT'), 5000);
      });

      // Clean up test channel
      await testChannel.unsubscribe();

      if (subscribeResult !== 'SUBSCRIBED') {
        return Result.fail(`Connection test failed: ${subscribeResult}`);
      }

      return Result.ok(undefined);

    } catch (error) {
      return Result.fail(`Connection test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get default channel configuration
   */
  private getDefaultChannelConfig(): SubscriptionConfig {
    return {
      channelName: '',
      enabled: this.config.enabled,
      autoReconnect: this.config.autoReconnect,
      maxReconnectAttempts: this.config.maxReconnectAttempts,
      reconnectDelay: this.config.reconnectDelayMs,
      heartbeatInterval: this.config.heartbeatIntervalMs,
      presenceTracking: this.config.presenceTracking,
      conflictResolution: this.config.conflictResolution
    };
  }

  /**
   * Setup auto-reconnection for a channel
   */
  private setupChannelReconnection(
    channel: RealtimeChannel,
    name: string,
    config: SubscriptionConfig
  ): void {
    let reconnectAttempts = 0;

    const reconnect = async () => {
      if (reconnectAttempts >= config.maxReconnectAttempts) {
        this.logger.error(`Max reconnection attempts reached for channel ${name}`);
        this.connectionStatus.error = 'Max reconnection attempts reached';
        return;
      }

      reconnectAttempts++;
      this.connectionStatus.reconnectAttempts = reconnectAttempts;

      try {
        await new Promise(resolve => setTimeout(resolve, config.reconnectDelay));
        
        const subscribeResult = await new Promise<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>((resolve) => {
          channel.subscribe((status) => resolve(status));
          setTimeout(() => resolve('TIMED_OUT'), 5000);
        });

        if (subscribeResult === 'SUBSCRIBED') {
          reconnectAttempts = 0;
          this.connectionStatus.reconnectAttempts = 0;
          delete this.connectionStatus.error;
          this.logger.info(`Successfully reconnected channel ${name}`);
        } else {
          this.logger.warn(`Reconnection attempt ${reconnectAttempts} failed for channel ${name}`);
          setTimeout(reconnect, config.reconnectDelay * Math.pow(2, reconnectAttempts)); // Exponential backoff
        }
      } catch (error) {
        this.logger.error(`Reconnection error for channel ${name}`, error);
        setTimeout(reconnect, config.reconnectDelay * Math.pow(2, reconnectAttempts)); // Exponential backoff
      }
    };

    // Listen for connection issues
    channel.on('system', {}, (payload) => {
      if (payload.status === 'CHANNEL_ERROR' || payload.status === 'CLOSED') {
        this.logger.warn(`Channel ${name} disconnected, attempting reconnection...`);
        this.connectionStatus.isConnected = false;
        reconnect();
      }
    });
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(status: Partial<SubscriptionStatus>): void {
    this.connectionStatus = {
      ...this.connectionStatus,
      ...status,
      lastHeartbeat: new Date()
    };
  }

  /**
   * Cleanup and dispose all resources
   */
  async dispose(): Promise<void> {
    try {
      this.logger.info('Disposing real-time service...');

      // Dispose all adapters
      if (this.modelAdapter) {
        await this.modelAdapter.cleanup();
      }

      if (this.executionAdapter) {
        await this.executionAdapter.cleanup();
      }

      if (this.statisticsAdapter) {
        await this.statisticsAdapter.cleanup();
      }

      if (this.collaborationManager) {
        await this.collaborationManager.cleanup();
      }

      // Destroy all channels
      const channelNames = Array.from(this.channels.keys());
      await Promise.all(
        channelNames.map(name => this.destroyChannel(name))
      );

      // Reset state
      this.isInitialized = false;
      this.supabaseClient = null;
      this.modelAdapter = null;
      this.executionAdapter = null;
      this.statisticsAdapter = null;
      this.collaborationManager = null;
      this.channels.clear();

      this.connectionStatus = {
        isConnected: false,
        reconnectAttempts: 0
      };

      this.logger.info('Real-time service disposed successfully');

    } catch (error) {
      this.logger.error('Error disposing real-time service', error);
    }
  }
}

// Export singleton instance factory
export function createRealtimeService(
  logger: ILogger,
  config?: Partial<RealtimeConfig>
): RealtimeService {
  return new RealtimeService(logger, config);
}