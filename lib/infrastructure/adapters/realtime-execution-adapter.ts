import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Result } from '../../domain/shared/result';
import { ILogger } from '../../domain/interfaces/logger.interface';
import { 
  IRealtimeExecutionAdapter, 
  ExecutionEvent, 
  ExecutionStartedEvent, 
  ExecutionProgressEvent, 
  ExecutionCompletedEvent, 
  ExecutionFailedEvent,
  Subscription,
  SubscriptionConfig,
  SubscriptionStatus,
  RealtimeExecutionError 
} from '../types/realtime-types';

export class RealtimeExecutionAdapter implements IRealtimeExecutionAdapter {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private executionState: Map<string, any> = new Map();

  constructor(
    private supabase: SupabaseClient,
    private logger: ILogger
  ) {}

  /**
   * Subscribe to execution events for a specific execution
   */
  async subscribeToExecution(
    executionId: string, 
    callback: (event: ExecutionEvent) => void
  ): Promise<Result<Subscription>> {
    try {
      const channelName = `execution:${executionId}`;
      
      if (this.subscriptions.has(channelName)) {
        return Result.ok(this.subscriptions.get(channelName)!);
      }

      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'function_model_executions',
            filter: `id=eq.${executionId}`
          },
          (payload) => this.handleExecutionChange(payload, callback)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'execution_progress',
            filter: `execution_id=eq.${executionId}`
          },
          (payload) => this.handleProgressUpdate(payload, callback)
        )
        .on('broadcast', { event: 'execution_control' }, (payload) => {
          this.handleExecutionControl(payload, callback);
        });

      const subscribeResult = await new Promise<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>((resolve) => {
        channel.subscribe((status) => resolve(status));
        setTimeout(() => resolve('TIMED_OUT'), 10000);
      });

      if (subscribeResult !== 'SUBSCRIBED') {
        this.logger.error(`Failed to subscribe to execution ${executionId}: ${subscribeResult}`);
        return Result.fail(`Execution subscription failed: ${subscribeResult}`);
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
      
      this.logger.info(`Successfully subscribed to execution ${executionId}`);
      return Result.ok(subscription);

    } catch (error) {
      this.logger.error('Failed to subscribe to execution', error);
      return Result.fail(`Execution subscription error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Subscribe to all executions for a specific model
   */
  async subscribeToModelExecutions(
    modelId: string, 
    callback: (event: ExecutionEvent) => void
  ): Promise<Result<Subscription>> {
    try {
      const channelName = `model_executions:${modelId}`;
      
      if (this.subscriptions.has(channelName)) {
        return Result.ok(this.subscriptions.get(channelName)!);
      }

      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'function_model_executions',
            filter: `model_id=eq.${modelId}`
          },
          (payload) => this.handleExecutionChange(payload, callback)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'execution_progress'
          },
          (payload) => this.handleModelExecutionProgress(payload, modelId, callback)
        );

      const subscribeResult = await new Promise<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>((resolve) => {
        channel.subscribe((status) => resolve(status));
        setTimeout(() => resolve('TIMED_OUT'), 10000);
      });

      if (subscribeResult !== 'SUBSCRIBED') {
        this.logger.error(`Failed to subscribe to model executions ${modelId}: ${subscribeResult}`);
        return Result.fail(`Model execution subscription failed: ${subscribeResult}`);
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
      
      this.logger.info(`Successfully subscribed to model executions ${modelId}`);
      return Result.ok(subscription);

    } catch (error) {
      this.logger.error('Failed to subscribe to model executions', error);
      return Result.fail(`Model execution subscription error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Broadcast execution event to subscribers
   */
  async broadcastExecutionEvent(event: ExecutionEvent): Promise<Result<void>> {
    try {
      const channelName = `execution:${event.executionId}`;
      const channel = this.channels.get(channelName);
      
      if (!channel) {
        return Result.fail('No active subscription for execution');
      }

      await channel.send({
        type: 'broadcast',
        event: 'execution_event',
        payload: event
      });

      // Also broadcast to model-level subscribers
      const modelChannelName = `model_executions:${event.modelId}`;
      const modelChannel = this.channels.get(modelChannelName);
      
      if (modelChannel) {
        await modelChannel.send({
          type: 'broadcast',
          event: 'execution_event',
          payload: event
        });
      }

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to broadcast execution event', error);
      return Result.fail(`Broadcast error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current execution progress
   */
  async getExecutionProgress(executionId: string): Promise<Result<ExecutionProgressEvent>> {
    try {
      const { data, error } = await this.supabase
        .from('execution_progress')
        .select('*')
        .eq('execution_id', executionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return Result.fail(`Failed to get execution progress: ${error.message}`);
      }

      const progressEvent: ExecutionProgressEvent = {
        id: `progress_${data.id}`,
        type: 'execution_progress',
        timestamp: new Date(data.created_at),
        userId: data.updated_by || 'system',
        modelId: data.model_id,
        executionId: data.execution_id,
        progress: {
          currentStep: data.current_step,
          completedSteps: data.completed_steps,
          totalSteps: data.total_steps,
          percentage: data.percentage,
          currentNodeId: data.current_node_id,
          processingTime: data.processing_time
        }
      };

      return Result.ok(progressEvent);
    } catch (error) {
      this.logger.error('Failed to get execution progress', error);
      return Result.fail(`Progress query error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pause execution
   */
  async pauseExecution(executionId: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('function_model_executions')
        .update({ 
          status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('id', executionId);

      if (error) {
        return Result.fail(`Failed to pause execution: ${error.message}`);
      }

      // Broadcast pause event
      await this.broadcastExecutionControl(executionId, 'pause');
      
      this.logger.info(`Execution ${executionId} paused`);
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to pause execution', error);
      return Result.fail(`Pause error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resume execution
   */
  async resumeExecution(executionId: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('function_model_executions')
        .update({ 
          status: 'running',
          updated_at: new Date().toISOString()
        })
        .eq('id', executionId);

      if (error) {
        return Result.fail(`Failed to resume execution: ${error.message}`);
      }

      // Broadcast resume event
      await this.broadcastExecutionControl(executionId, 'resume');
      
      this.logger.info(`Execution ${executionId} resumed`);
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to resume execution', error);
      return Result.fail(`Resume error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('function_model_executions')
        .update({ 
          status: 'cancelled',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', executionId);

      if (error) {
        return Result.fail(`Failed to cancel execution: ${error.message}`);
      }

      // Broadcast cancel event
      await this.broadcastExecutionControl(executionId, 'cancel');
      
      this.logger.info(`Execution ${executionId} cancelled`);
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to cancel execution', error);
      return Result.fail(`Cancel error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle execution database changes
   */
  private handleExecutionChange(payload: any, callback: (event: ExecutionEvent) => void): void {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      let event: ExecutionEvent | null = null;
      const record = newRecord || oldRecord;
      
      switch (eventType) {
        case 'INSERT':
          if (record.status === 'running') {
            event = {
              id: `started_${record.id}`,
              type: 'execution_started',
              timestamp: new Date(record.started_at),
              userId: record.created_by || 'system',
              modelId: record.model_id,
              executionId: record.id,
              context: {
                triggeredBy: record.triggered_by || 'manual',
                inputData: record.input_data,
                estimatedDuration: record.estimated_duration
              }
            } as ExecutionStartedEvent;
          }
          break;
          
        case 'UPDATE':
          if (newRecord.status === 'completed') {
            event = {
              id: `completed_${record.id}`,
              type: 'execution_completed',
              timestamp: new Date(record.ended_at),
              userId: record.updated_by || 'system',
              modelId: record.model_id,
              executionId: record.id,
              result: {
                success: true,
                outputData: record.output_data,
                executionTime: record.execution_time,
                stepsCompleted: record.steps_completed,
                errors: record.errors
              }
            } as ExecutionCompletedEvent;
          } else if (newRecord.status === 'failed') {
            event = {
              id: `failed_${record.id}`,
              type: 'execution_failed',
              timestamp: new Date(record.ended_at),
              userId: record.updated_by || 'system',
              modelId: record.model_id,
              executionId: record.id,
              error: {
                code: record.error_code || 'EXECUTION_FAILED',
                message: record.error_message || 'Execution failed',
                nodeId: record.failed_node_id,
                step: record.failed_step,
                stack: record.error_stack,
                recoverable: record.is_recoverable || false
              }
            } as ExecutionFailedEvent;
          }
          break;
      }
      
      if (event) {
        callback(event);
      }
    } catch (error) {
      this.logger.error('Error handling execution change', error);
    }
  }

  /**
   * Handle execution progress updates
   */
  private handleProgressUpdate(payload: any, callback: (event: ExecutionEvent) => void): void {
    try {
      const { eventType, new: newRecord } = payload;
      
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const event: ExecutionProgressEvent = {
          id: `progress_${newRecord.id}`,
          type: 'execution_progress',
          timestamp: new Date(newRecord.created_at),
          userId: newRecord.updated_by || 'system',
          modelId: newRecord.model_id,
          executionId: newRecord.execution_id,
          progress: {
            currentStep: newRecord.current_step,
            completedSteps: newRecord.completed_steps,
            totalSteps: newRecord.total_steps,
            percentage: newRecord.percentage,
            currentNodeId: newRecord.current_node_id,
            processingTime: newRecord.processing_time
          }
        };
        
        callback(event);
      }
    } catch (error) {
      this.logger.error('Error handling progress update', error);
    }
  }

  /**
   * Handle model execution progress (filter by model)
   */
  private handleModelExecutionProgress(
    payload: any, 
    modelId: string, 
    callback: (event: ExecutionEvent) => void
  ): void {
    const { new: newRecord } = payload;
    if (newRecord && newRecord.model_id === modelId) {
      this.handleProgressUpdate(payload, callback);
    }
  }

  /**
   * Handle execution control events
   */
  private handleExecutionControl(payload: any, callback: (event: ExecutionEvent) => void): void {
    try {
      const { action, executionId, userId, timestamp } = payload.payload;
      
      // Emit corresponding events based on control action
      const event: ExecutionEvent = {
        id: `${action}_${executionId}`,
        type: action === 'pause' ? 'execution_paused' : 'execution_resumed',
        timestamp: new Date(timestamp),
        userId: userId || 'system',
        modelId: this.executionState.get(executionId)?.modelId || '',
        executionId
      } as ExecutionEvent;
      
      callback(event);
    } catch (error) {
      this.logger.error('Error handling execution control', error);
    }
  }

  /**
   * Broadcast execution control events
   */
  private async broadcastExecutionControl(executionId: string, action: 'pause' | 'resume' | 'cancel'): Promise<void> {
    const channelName = `execution:${executionId}`;
    const channel = this.channels.get(channelName);
    
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'execution_control',
        payload: {
          action,
          executionId,
          userId: 'system',
          timestamp: new Date().toISOString()
        }
      });
    }
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
  }

  /**
   * Cleanup all subscriptions
   */
  async cleanup(): Promise<void> {
    const channelNames = Array.from(this.channels.keys());
    await Promise.all(
      channelNames.map(channelName => this.disposeSubscription(channelName))
    );
    this.executionState.clear();
  }
}