import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Result } from '../../domain/shared/result';
import { ILogger } from '../../domain/interfaces/logger.interface';
import { ModelDto } from '../../../app/actions/types';

export interface ModelUpdateCallback {
  (change: ModelChange): void;
}

export interface ModelChange {
  modelId: string;
  changeType: 'UPDATE' | 'DELETE' | 'INSERT';
  changes: Partial<ModelDto>;
  userId: string;
  timestamp: string;
  conflictResolution?: ConflictResolution;
}

export interface ConflictResolution {
  strategy: 'LAST_WRITE_WINS' | 'MERGE' | 'USER_CHOICE';
  mergedData?: Partial<ModelDto>;
  conflictedFields?: string[];
}

export interface UserPresence {
  userId: string;
  userName: string;
  cursor?: {
    x: number;
    y: number;
  };
  selection?: {
    nodeId?: string;
    fieldName?: string;
  };
  lastSeen: string;
  isActive: boolean;
}

export interface CollaborationSession {
  modelId: string;
  sessionId: string;
  users: UserPresence[];
  isActive: boolean;
}

export class RealtimeModelAdapter {
  private channels: Map<string, RealtimeChannel> = new Map();
  private presenceData: Map<string, UserPresence[]> = new Map();

  constructor(
    private supabase: SupabaseClient,
    private logger: ILogger
  ) {}

  /**
   * Subscribe to real-time model changes
   */
  async subscribeToModel(
    modelId: string, 
    callback: ModelUpdateCallback,
    userId: string
  ): Promise<Result<RealtimeChannel>> {
    try {
      const channelName = `model:${modelId}`;
      
      // Check if already subscribed
      if (this.channels.has(channelName)) {
        return Result.ok(this.channels.get(channelName)!);
      }

      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'function_models',
            filter: `model_id=eq.${modelId}`
          },
          (payload) => {
            this.handleModelChange(payload, callback, userId);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'nodes',
            filter: `model_id=eq.${modelId}`
          },
          (payload) => {
            this.handleNodeChange(payload, callback, modelId, userId);
          }
        )
        .on('presence', { event: 'sync' }, () => {
          this.handlePresenceSync(modelId);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.handlePresenceJoin(modelId, key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.handlePresenceLeave(modelId, key, leftPresences);
        });

      const subscribeResult = await new Promise<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>((resolve) => {
        channel.subscribe((status) => {
          resolve(status);
        });
        
        // Timeout after 10 seconds
        setTimeout(() => resolve('TIMED_OUT'), 10000);
      });

      if (subscribeResult !== 'SUBSCRIBED') {
        this.logger.error(`Failed to subscribe to model ${modelId}: ${subscribeResult}`);
        return Result.fail(`Subscription failed: ${subscribeResult}`);
      }

      // Join presence for collaboration
      await channel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
        model_id: modelId
      });

      this.channels.set(channelName, channel);
      this.logger.info(`Successfully subscribed to model ${modelId}`);
      
      return Result.ok(channel);
    } catch (error) {
      this.logger.error('Failed to subscribe to model', error);
      return Result.fail(`Subscription error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unsubscribe from model changes
   */
  async unsubscribeFromModel(modelId: string): Promise<Result<void>> {
    try {
      const channelName = `model:${modelId}`;
      const channel = this.channels.get(channelName);
      
      if (channel) {
        await channel.unsubscribe();
        this.channels.delete(channelName);
        this.presenceData.delete(modelId);
        this.logger.info(`Unsubscribed from model ${modelId}`);
      }
      
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to unsubscribe from model', error);
      return Result.fail(`Unsubscribe error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Broadcast model change to other users
   */
  async broadcastModelChange(
    modelId: string, 
    change: Omit<ModelChange, 'timestamp'>
  ): Promise<Result<void>> {
    try {
      const channelName = `model:${modelId}`;
      const channel = this.channels.get(channelName);
      
      if (!channel) {
        return Result.fail('Not subscribed to model channel');
      }

      const changeWithTimestamp: ModelChange = {
        ...change,
        timestamp: new Date().toISOString()
      };

      await channel.send({
        type: 'broadcast',
        event: 'model_change',
        payload: changeWithTimestamp
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to broadcast model change', error);
      return Result.fail(`Broadcast error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user presence (cursor, selection)
   */
  async updatePresence(
    modelId: string,
    userId: string,
    presence: Partial<UserPresence>
  ): Promise<Result<void>> {
    try {
      const channelName = `model:${modelId}`;
      const channel = this.channels.get(channelName);
      
      if (!channel) {
        return Result.fail('Not subscribed to model channel');
      }

      await channel.track({
        user_id: userId,
        ...presence,
        last_seen: new Date().toISOString()
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to update presence', error);
      return Result.fail(`Presence update error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current collaboration session
   */
  getCollaborationSession(modelId: string): CollaborationSession | null {
    const users = this.presenceData.get(modelId);
    if (!users) {
      return null;
    }

    return {
      modelId,
      sessionId: `session_${modelId}_${Date.now()}`,
      users,
      isActive: users.some(user => user.isActive)
    };
  }

  /**
   * Handle model database changes
   */
  private handleModelChange(
    payload: any,
    callback: ModelUpdateCallback,
    userId: string
  ): void {
    try {
      const change: ModelChange = {
        modelId: payload.new?.model_id || payload.old?.model_id,
        changeType: payload.eventType,
        changes: payload.new || payload.old,
        userId: payload.new?.updated_by || 'system',
        timestamp: new Date().toISOString()
      };

      // Don't notify the user who made the change
      if (change.userId !== userId) {
        callback(change);
      }
    } catch (error) {
      this.logger.error('Error handling model change', error);
    }
  }

  /**
   * Handle node database changes
   */
  private handleNodeChange(
    payload: any,
    callback: ModelUpdateCallback,
    modelId: string,
    userId: string
  ): void {
    try {
      const change: ModelChange = {
        modelId,
        changeType: payload.eventType,
        changes: {
          nodes: [payload.new || payload.old]
        },
        userId: payload.new?.updated_by || 'system',
        timestamp: new Date().toISOString()
      };

      // Don't notify the user who made the change
      if (change.userId !== userId) {
        callback(change);
      }
    } catch (error) {
      this.logger.error('Error handling node change', error);
    }
  }

  /**
   * Handle presence synchronization
   */
  private handlePresenceSync(modelId: string): void {
    try {
      const channelName = `model:${modelId}`;
      const channel = this.channels.get(channelName);
      
      if (channel) {
        const presenceState = channel.presenceState();
        const users: UserPresence[] = [];
        
        Object.entries(presenceState).forEach(([key, presences]) => {
          presences.forEach((presence: any) => {
            users.push({
              userId: presence.user_id,
              userName: presence.user_name || presence.user_id,
              cursor: presence.cursor,
              selection: presence.selection,
              lastSeen: presence.last_seen || presence.online_at,
              isActive: true
            });
          });
        });

        this.presenceData.set(modelId, users);
        this.logger.debug(`Presence sync for model ${modelId}: ${users.length} users`);
      }
    } catch (error) {
      this.logger.error('Error handling presence sync', error);
    }
  }

  /**
   * Handle user joining
   */
  private handlePresenceJoin(modelId: string, key: string, newPresences: any[]): void {
    try {
      const users = this.presenceData.get(modelId) || [];
      
      newPresences.forEach((presence) => {
        const user: UserPresence = {
          userId: presence.user_id,
          userName: presence.user_name || presence.user_id,
          cursor: presence.cursor,
          selection: presence.selection,
          lastSeen: presence.last_seen || presence.online_at,
          isActive: true
        };
        
        const existingIndex = users.findIndex(u => u.userId === user.userId);
        if (existingIndex >= 0) {
          users[existingIndex] = user;
        } else {
          users.push(user);
        }
      });

      this.presenceData.set(modelId, users);
      this.logger.info(`User joined collaboration for model ${modelId}`);
    } catch (error) {
      this.logger.error('Error handling presence join', error);
    }
  }

  /**
   * Handle user leaving
   */
  private handlePresenceLeave(modelId: string, key: string, leftPresences: any[]): void {
    try {
      const users = this.presenceData.get(modelId) || [];
      
      leftPresences.forEach((presence) => {
        const userIndex = users.findIndex(u => u.userId === presence.user_id);
        if (userIndex >= 0) {
          users[userIndex].isActive = false;
          users[userIndex].lastSeen = new Date().toISOString();
        }
      });

      this.presenceData.set(modelId, users);
      this.logger.info(`User left collaboration for model ${modelId}`);
    } catch (error) {
      this.logger.error('Error handling presence leave', error);
    }
  }

  /**
   * Cleanup all subscriptions
   */
  async cleanup(): Promise<void> {
    const channelNames = Array.from(this.channels.keys());
    await Promise.all(
      channelNames.map(channelName => {
        const modelId = channelName.replace('model:', '');
        return this.unsubscribeFromModel(modelId);
      })
    );
  }
}