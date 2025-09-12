import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Result } from '../../domain/shared/result';
import { ILogger } from '../../domain/interfaces/logger.interface';
import { 
  IRealtimeStatisticsAdapter, 
  StatisticsEvent, 
  StatisticsUpdatedEvent, 
  PerformanceMetricsEvent,
  Subscription,
  SubscriptionConfig,
  SubscriptionStatus 
} from '../types/realtime-types';

interface MetricsBucket {
  scope: string;
  entityId?: string;
  metrics: Map<string, any>;
  lastUpdated: Date;
}

export class RealtimeStatisticsAdapter implements IRealtimeStatisticsAdapter {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private metricsCache: Map<string, MetricsBucket> = new Map();
  private aggregationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private supabase: SupabaseClient,
    private logger: ILogger,
    private aggregationIntervalMs: number = 5000 // 5 seconds default
  ) {}

  /**
   * Subscribe to statistics updates
   */
  async subscribeToStatistics(
    scope: 'model' | 'user' | 'system',
    entityId?: string,
    callback?: (event: StatisticsEvent) => void
  ): Promise<Result<Subscription>> {
    try {
      const channelName = this.getChannelName(scope, entityId);
      
      if (this.subscriptions.has(channelName)) {
        return Result.ok(this.subscriptions.get(channelName)!);
      }

      const channel = this.supabase.channel(channelName);

      // Subscribe to different statistics tables based on scope
      switch (scope) {
        case 'model':
          await this.setupModelStatistics(channel, entityId, callback);
          break;
        case 'user':
          await this.setupUserStatistics(channel, entityId, callback);
          break;
        case 'system':
          await this.setupSystemStatistics(channel, callback);
          break;
      }

      // Subscribe to real-time metrics updates
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'performance_metrics',
          ...(entityId && { filter: `entity_id=eq.${entityId}` })
        },
        (payload) => this.handleMetricsUpdate(payload, scope, callback)
      );

      const subscribeResult = await new Promise<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>((resolve) => {
        channel.subscribe((status) => resolve(status));
        setTimeout(() => resolve('TIMED_OUT'), 10000);
      });

      if (subscribeResult !== 'SUBSCRIBED') {
        this.logger.error(`Failed to subscribe to statistics ${scope}:${entityId}: ${subscribeResult}`);
        return Result.fail(`Statistics subscription failed: ${subscribeResult}`);
      }

      const subscription: Subscription = {
        id: channelName,
        channel,
        config: {
          channelName,
          enabled: true,
          autoReconnect: true,
          maxReconnectAttempts: 5,
          reconnectDelay: 1000,
          heartbeatInterval: 30000
        },
        status: {
          isConnected: true,
          connectionId: channelName,
          connectedAt: new Date(),
          reconnectAttempts: 0
        },
        dispose: async () => {
          await this.disposeSubscription(channelName);
        }
      };

      this.channels.set(channelName, channel);
      this.subscriptions.set(channelName, subscription);
      
      // Start metrics aggregation for this scope
      this.startMetricsAggregation(scope, entityId);
      
      this.logger.info(`Successfully subscribed to statistics ${scope}:${entityId}`);
      return Result.ok(subscription);

    } catch (error) {
      this.logger.error('Failed to subscribe to statistics', error);
      return Result.fail(`Statistics subscription error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Broadcast statistics update
   */
  async broadcastStatisticsUpdate(event: StatisticsEvent): Promise<Result<void>> {
    try {
      const channelName = this.getChannelName(event.scope, event.entityId);
      const channel = this.channels.get(channelName);
      
      if (!channel) {
        return Result.fail('No active subscription for statistics scope');
      }

      await channel.send({
        type: 'broadcast',
        event: 'statistics_update',
        payload: event
      });

      // Update local cache
      this.updateMetricsCache(event);

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to broadcast statistics update', error);
      return Result.fail(`Broadcast error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get latest metrics for scope
   */
  async getLatestMetrics(
    scope: 'model' | 'user' | 'system',
    entityId?: string
  ): Promise<Result<PerformanceMetricsEvent>> {
    try {
      const query = this.supabase
        .from('performance_metrics')
        .select('*')
        .eq('scope', scope)
        .order('created_at', { ascending: false })
        .limit(1);

      if (entityId) {
        query.eq('entity_id', entityId);
      }

      const { data, error } = await query.single();

      if (error) {
        return Result.fail(`Failed to get latest metrics: ${error.message}`);
      }

      const metricsEvent: PerformanceMetricsEvent = {
        id: `metrics_${data.id}`,
        type: 'performance_metrics',
        timestamp: new Date(data.created_at),
        userId: data.updated_by || 'system',
        scope: data.scope,
        entityId: data.entity_id,
        performance: {
          executionTime: data.execution_time || 0,
          memoryUsage: data.memory_usage || 0,
          cpuUsage: data.cpu_usage || 0,
          throughput: data.throughput || 0,
          errorRate: data.error_rate || 0,
          successRate: data.success_rate || 100
        }
      };

      return Result.ok(metricsEvent);
    } catch (error) {
      this.logger.error('Failed to get latest metrics', error);
      return Result.fail(`Metrics query error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Aggregate metrics over time range
   */
  async aggregateMetrics(
    scope: string,
    timeRange: { start: Date; end: Date }
  ): Promise<Result<StatisticsEvent[]>> {
    try {
      const { data, error } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .eq('scope', scope)
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        return Result.fail(`Failed to aggregate metrics: ${error.message}`);
      }

      const aggregatedEvents = this.processAggregatedMetrics(data, scope);
      return Result.ok(aggregatedEvents);

    } catch (error) {
      this.logger.error('Failed to aggregate metrics', error);
      return Result.fail(`Aggregation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Setup model-specific statistics subscriptions
   */
  private async setupModelStatistics(
    channel: RealtimeChannel,
    modelId?: string,
    callback?: (event: StatisticsEvent) => void
  ): Promise<void> {
    // Subscribe to model execution statistics
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'function_model_executions',
        ...(modelId && { filter: `model_id=eq.${modelId}` })
      },
      (payload) => this.handleExecutionStatistics(payload, callback)
    );

    // Subscribe to model usage statistics
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'model_usage_statistics',
        ...(modelId && { filter: `model_id=eq.${modelId}` })
      },
      (payload) => this.handleUsageStatistics(payload, callback)
    );
  }

  /**
   * Setup user-specific statistics subscriptions
   */
  private async setupUserStatistics(
    channel: RealtimeChannel,
    userId?: string,
    callback?: (event: StatisticsEvent) => void
  ): Promise<void> {
    // Subscribe to user activity statistics
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_activity_logs',
        ...(userId && { filter: `user_id=eq.${userId}` })
      },
      (payload) => this.handleUserActivityStatistics(payload, callback)
    );
  }

  /**
   * Setup system-wide statistics subscriptions
   */
  private async setupSystemStatistics(
    channel: RealtimeChannel,
    callback?: (event: StatisticsEvent) => void
  ): Promise<void> {
    // Subscribe to system performance metrics
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'system_metrics'
      },
      (payload) => this.handleSystemMetrics(payload, callback)
    );
  }

  /**
   * Handle metrics updates from database
   */
  private handleMetricsUpdate(
    payload: any,
    scope: string,
    callback?: (event: StatisticsEvent) => void
  ): void {
    try {
      const { eventType, new: newRecord } = payload;
      
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const metricsEvent: PerformanceMetricsEvent = {
          id: `metrics_${newRecord.id}`,
          type: 'performance_metrics',
          timestamp: new Date(newRecord.created_at),
          userId: newRecord.updated_by || 'system',
          scope: newRecord.scope,
          entityId: newRecord.entity_id,
          performance: {
            executionTime: newRecord.execution_time || 0,
            memoryUsage: newRecord.memory_usage || 0,
            cpuUsage: newRecord.cpu_usage || 0,
            throughput: newRecord.throughput || 0,
            errorRate: newRecord.error_rate || 0,
            successRate: newRecord.success_rate || 100
          }
        };
        
        if (callback) {
          callback(metricsEvent);
        }
        
        this.updateMetricsCache(metricsEvent);
      }
    } catch (error) {
      this.logger.error('Error handling metrics update', error);
    }
  }

  /**
   * Handle execution statistics
   */
  private handleExecutionStatistics(payload: any, callback?: (event: StatisticsEvent) => void): void {
    try {
      const { eventType, new: newRecord } = payload;
      
      if (eventType === 'UPDATE' && newRecord.status === 'completed') {
        const statisticsEvent: StatisticsUpdatedEvent = {
          id: `execution_stats_${newRecord.id}`,
          type: 'statistics_updated',
          timestamp: new Date(newRecord.ended_at),
          userId: newRecord.updated_by || 'system',
          scope: 'model',
          entityId: newRecord.model_id,
          metrics: [
            {
              category: 'execution',
              name: 'completion_time',
              value: newRecord.execution_time,
              unit: 'ms',
              trend: 'stable'
            },
            {
              category: 'execution',
              name: 'steps_completed',
              value: newRecord.steps_completed,
              unit: 'count',
              trend: 'up'
            }
          ]
        };
        
        if (callback) {
          callback(statisticsEvent);
        }
      }
    } catch (error) {
      this.logger.error('Error handling execution statistics', error);
    }
  }

  /**
   * Handle usage statistics
   */
  private handleUsageStatistics(payload: any, callback?: (event: StatisticsEvent) => void): void {
    try {
      const { eventType, new: newRecord } = payload;
      
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const statisticsEvent: StatisticsUpdatedEvent = {
          id: `usage_stats_${newRecord.id}`,
          type: 'statistics_updated',
          timestamp: new Date(newRecord.updated_at),
          userId: 'system',
          scope: 'model',
          entityId: newRecord.model_id,
          metrics: [
            {
              category: 'usage',
              name: 'execution_count',
              value: newRecord.execution_count,
              unit: 'count',
              trend: newRecord.trend
            },
            {
              category: 'usage',
              name: 'avg_execution_time',
              value: newRecord.avg_execution_time,
              unit: 'ms',
              trend: newRecord.performance_trend
            }
          ]
        };
        
        if (callback) {
          callback(statisticsEvent);
        }
      }
    } catch (error) {
      this.logger.error('Error handling usage statistics', error);
    }
  }

  /**
   * Handle user activity statistics
   */
  private handleUserActivityStatistics(payload: any, callback?: (event: StatisticsEvent) => void): void {
    try {
      const { eventType, new: newRecord } = payload;
      
      if (eventType === 'INSERT') {
        const statisticsEvent: StatisticsUpdatedEvent = {
          id: `user_activity_${newRecord.id}`,
          type: 'statistics_updated',
          timestamp: new Date(newRecord.created_at),
          userId: newRecord.user_id,
          scope: 'user',
          entityId: newRecord.user_id,
          metrics: [
            {
              category: 'activity',
              name: 'action_count',
              value: 1,
              unit: 'count',
              trend: 'up'
            }
          ]
        };
        
        if (callback) {
          callback(statisticsEvent);
        }
      }
    } catch (error) {
      this.logger.error('Error handling user activity statistics', error);
    }
  }

  /**
   * Handle system metrics
   */
  private handleSystemMetrics(payload: any, callback?: (event: StatisticsEvent) => void): void {
    try {
      const { eventType, new: newRecord } = payload;
      
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const metricsEvent: PerformanceMetricsEvent = {
          id: `system_metrics_${newRecord.id}`,
          type: 'performance_metrics',
          timestamp: new Date(newRecord.created_at),
          userId: 'system',
          scope: 'system',
          performance: {
            executionTime: 0,
            memoryUsage: newRecord.memory_usage || 0,
            cpuUsage: newRecord.cpu_usage || 0,
            throughput: newRecord.throughput || 0,
            errorRate: newRecord.error_rate || 0,
            successRate: newRecord.success_rate || 100
          }
        };
        
        if (callback) {
          callback(metricsEvent);
        }
      }
    } catch (error) {
      this.logger.error('Error handling system metrics', error);
    }
  }

  /**
   * Process aggregated metrics data
   */
  private processAggregatedMetrics(data: any[], scope: string): StatisticsEvent[] {
    const events: StatisticsEvent[] = [];
    
    // Group metrics by time buckets and aggregate
    const timeBuckets = new Map<string, any[]>();
    
    data.forEach(record => {
      const bucket = this.getTimeBucket(new Date(record.created_at));
      if (!timeBuckets.has(bucket)) {
        timeBuckets.set(bucket, []);
      }
      timeBuckets.get(bucket)!.push(record);
    });
    
    // Create aggregated events for each bucket
    timeBuckets.forEach((records, bucket) => {
      const avgExecutionTime = records.reduce((sum, r) => sum + (r.execution_time || 0), 0) / records.length;
      const avgMemoryUsage = records.reduce((sum, r) => sum + (r.memory_usage || 0), 0) / records.length;
      const avgCpuUsage = records.reduce((sum, r) => sum + (r.cpu_usage || 0), 0) / records.length;
      const avgThroughput = records.reduce((sum, r) => sum + (r.throughput || 0), 0) / records.length;
      const avgErrorRate = records.reduce((sum, r) => sum + (r.error_rate || 0), 0) / records.length;
      const avgSuccessRate = records.reduce((sum, r) => sum + (r.success_rate || 100), 0) / records.length;
      
      const aggregatedEvent: PerformanceMetricsEvent = {
        id: `aggregated_${bucket}`,
        type: 'performance_metrics',
        timestamp: new Date(bucket),
        userId: 'system',
        scope: scope as 'model' | 'user' | 'system',
        performance: {
          executionTime: avgExecutionTime,
          memoryUsage: avgMemoryUsage,
          cpuUsage: avgCpuUsage,
          throughput: avgThroughput,
          errorRate: avgErrorRate,
          successRate: avgSuccessRate
        }
      };
      
      events.push(aggregatedEvent);
    });
    
    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get time bucket for aggregation (5-minute intervals)
   */
  private getTimeBucket(date: Date): string {
    const roundedMinutes = Math.floor(date.getMinutes() / 5) * 5;
    const bucketDate = new Date(date);
    bucketDate.setMinutes(roundedMinutes, 0, 0);
    return bucketDate.toISOString();
  }

  /**
   * Start metrics aggregation timer
   */
  private startMetricsAggregation(scope: string, entityId?: string): void {
    const key = `${scope}:${entityId || 'all'}`;
    
    if (this.aggregationTimers.has(key)) {
      return; // Already started
    }
    
    const timer = setInterval(() => {
      this.performMetricsAggregation(scope, entityId);
    }, this.aggregationIntervalMs);
    
    this.aggregationTimers.set(key, timer);
  }

  /**
   * Perform periodic metrics aggregation
   */
  private async performMetricsAggregation(scope: string, entityId?: string): Promise<void> {
    try {
      const cacheKey = `${scope}:${entityId || 'all'}`;
      const bucket = this.metricsCache.get(cacheKey);
      
      if (!bucket || bucket.metrics.size === 0) {
        return;
      }
      
      // Calculate aggregated metrics
      const aggregatedMetrics = this.calculateAggregatedMetrics(bucket.metrics);
      
      // Store in database
      await this.storeAggregatedMetrics(scope, entityId, aggregatedMetrics);
      
      // Clear cache
      bucket.metrics.clear();
      bucket.lastUpdated = new Date();
      
    } catch (error) {
      this.logger.error('Error performing metrics aggregation', error);
    }
  }

  /**
   * Calculate aggregated metrics from cache
   */
  private calculateAggregatedMetrics(metrics: Map<string, any>): any {
    const values = Array.from(metrics.values());
    const count = values.length;
    
    if (count === 0) return {};
    
    return {
      avgExecutionTime: values.reduce((sum, m) => sum + (m.executionTime || 0), 0) / count,
      avgMemoryUsage: values.reduce((sum, m) => sum + (m.memoryUsage || 0), 0) / count,
      avgCpuUsage: values.reduce((sum, m) => sum + (m.cpuUsage || 0), 0) / count,
      avgThroughput: values.reduce((sum, m) => sum + (m.throughput || 0), 0) / count,
      avgErrorRate: values.reduce((sum, m) => sum + (m.errorRate || 0), 0) / count,
      avgSuccessRate: values.reduce((sum, m) => sum + (m.successRate || 100), 0) / count,
      sampleCount: count,
      aggregatedAt: new Date().toISOString()
    };
  }

  /**
   * Store aggregated metrics in database
   */
  private async storeAggregatedMetrics(scope: string, entityId: string | undefined, metrics: any): Promise<void> {
    await this.supabase
      .from('performance_metrics')
      .insert({
        scope,
        entity_id: entityId,
        execution_time: metrics.avgExecutionTime,
        memory_usage: metrics.avgMemoryUsage,
        cpu_usage: metrics.avgCpuUsage,
        throughput: metrics.avgThroughput,
        error_rate: metrics.avgErrorRate,
        success_rate: metrics.avgSuccessRate,
        sample_count: metrics.sampleCount,
        is_aggregated: true,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Update metrics cache
   */
  private updateMetricsCache(event: StatisticsEvent): void {
    const cacheKey = `${event.scope}:${event.entityId || 'all'}`;
    
    let bucket = this.metricsCache.get(cacheKey);
    if (!bucket) {
      bucket = {
        scope: event.scope,
        entityId: event.entityId,
        metrics: new Map(),
        lastUpdated: new Date()
      };
      this.metricsCache.set(cacheKey, bucket);
    }
    
    bucket.metrics.set(event.id, event);
    bucket.lastUpdated = new Date();
  }

  /**
   * Get channel name for scope and entity
   */
  private getChannelName(scope: string, entityId?: string): string {
    return `statistics:${scope}${entityId ? `:${entityId}` : ''}`;
  }

  /**
   * Dispose subscription
   */
  private async disposeSubscription(channelName: string): Promise<void> {
    const channel = this.channels.get(channelName);
    if (channel) {
      await channel.unsubscribe();
      this.channels.delete(channelName);
      this.subscriptions.delete(channelName);
    }
    
    // Clean up aggregation timer
    for (const [key, timer] of this.aggregationTimers.entries()) {
      if (key.startsWith(channelName.replace('statistics:', ''))) {
        clearInterval(timer);
        this.aggregationTimers.delete(key);
      }
    }
  }

  /**
   * Cleanup all subscriptions and timers
   */
  async cleanup(): Promise<void> {
    const channelNames = Array.from(this.channels.keys());
    await Promise.all(
      channelNames.map(channelName => this.disposeSubscription(channelName))
    );
    
    // Clear all timers
    for (const timer of this.aggregationTimers.values()) {
      clearInterval(timer);
    }
    this.aggregationTimers.clear();
    
    // Clear cache
    this.metricsCache.clear();
  }
}