import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Result } from '../../domain/shared/result';
import { ILogger } from '../../domain/interfaces/logger.interface';
import { 
  ICollaborationManager, 
  CollaborationSession, 
  UserPresence, 
  CollaborationEvent,
  UserJoinedEvent,
  UserLeftEvent,
  CursorMovedEvent,
  SelectionChangedEvent,
  UserTypingEvent,
  Subscription,
  SubscriptionConfig
} from '../types/realtime-types';

interface SessionState {
  session: CollaborationSession;
  channel: RealtimeChannel;
  heartbeatInterval: NodeJS.Timeout;
  lastActivity: Date;
}

export class CollaborationManager implements ICollaborationManager {
  private activeSessions: Map<string, SessionState> = new Map();
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> sessionIds
  private channels: Map<string, RealtimeChannel> = new Map();
  private heartbeatIntervalMs = 30000; // 30 seconds
  private sessionTimeoutMs = 300000; // 5 minutes

  constructor(
    private supabase: SupabaseClient,
    private logger: ILogger
  ) {
    // Start cleanup timer for inactive sessions
    setInterval(() => this.cleanupInactiveSessions(), 60000); // Every minute
  }

  /**
   * Start collaboration session for a model
   */
  async startCollaborationSession(
    modelId: string, 
    userId: string
  ): Promise<Result<CollaborationSession>> {
    try {
      const sessionId = `collab_${modelId}_${Date.now()}`;
      const channelName = `collaboration:${sessionId}`;

      // Create Supabase channel
      const channel = this.supabase
        .channel(channelName, {
          config: {
            presence: { key: userId }
          }
        })
        .on('presence', { event: 'sync' }, () => {
          this.handlePresenceSync(sessionId);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.handleUserJoin(sessionId, key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.handleUserLeave(sessionId, key, leftPresences);
        })
        .on('broadcast', { event: 'collaboration' }, (payload) => {
          this.handleCollaborationBroadcast(sessionId, payload);
        });

      // Subscribe to channel
      const subscribeResult = await new Promise<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>((resolve) => {
        channel.subscribe((status) => resolve(status));
        setTimeout(() => resolve('TIMED_OUT'), 10000);
      });

      if (subscribeResult !== 'SUBSCRIBED') {
        this.logger.error(`Failed to start collaboration session ${sessionId}: ${subscribeResult}`);
        return Result.fail(`Collaboration session failed: ${subscribeResult}`);
      }

      // Track user presence
      await channel.track({
        user_id: userId,
        joined_at: new Date().toISOString(),
        model_id: modelId,
        status: 'active'
      });

      // Create session object
      const session: CollaborationSession = {
        sessionId,
        modelId,
        users: new Map(),
        startedAt: new Date(),
        lastActivity: new Date()
      };

      // Create heartbeat interval
      const heartbeatInterval = setInterval(() => {
        this.sendHeartbeat(sessionId, userId);
      }, this.heartbeatIntervalMs);

      // Store session state
      const sessionState: SessionState = {
        session,
        channel,
        heartbeatInterval,
        lastActivity: new Date()
      };

      this.activeSessions.set(sessionId, sessionState);
      this.channels.set(channelName, channel);
      
      // Track user sessions
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set());
      }
      this.userSessions.get(userId)!.add(sessionId);

      this.logger.info(`Started collaboration session ${sessionId} for model ${modelId} with user ${userId}`);
      return Result.ok(session);

    } catch (error) {
      this.logger.error('Failed to start collaboration session', error);
      return Result.fail(`Collaboration session error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * End collaboration session
   */
  async endCollaborationSession(sessionId: string, userId: string): Promise<Result<void>> {
    try {
      const sessionState = this.activeSessions.get(sessionId);
      if (!sessionState) {
        return Result.fail('Collaboration session not found');
      }

      // Broadcast user left event
      await this.broadcastCollaborationEvent(sessionId, {
        type: 'user_left',
        userId,
        userName: this.getUserName(sessionState.session, userId),
        timestamp: new Date()
      } as UserLeftEvent);

      // Remove user from session
      sessionState.session.users.delete(userId);

      // If no more users, end the session
      if (sessionState.session.users.size === 0) {
        await this.destroySession(sessionId);
      } else {
        // Update last activity
        sessionState.lastActivity = new Date();
        sessionState.session.lastActivity = new Date();
      }

      // Remove from user sessions tracking
      const userSessionIds = this.userSessions.get(userId);
      if (userSessionIds) {
        userSessionIds.delete(sessionId);
        if (userSessionIds.size === 0) {
          this.userSessions.delete(userId);
        }
      }

      this.logger.info(`User ${userId} left collaboration session ${sessionId}`);
      return Result.ok(undefined);

    } catch (error) {
      this.logger.error('Failed to end collaboration session', error);
      return Result.fail(`End session error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user presence in session
   */
  async updateUserPresence(
    sessionId: string, 
    userId: string, 
    presence: Partial<UserPresence>
  ): Promise<Result<void>> {
    try {
      const sessionState = this.activeSessions.get(sessionId);
      if (!sessionState) {
        return Result.fail('Collaboration session not found');
      }

      // Update user presence in session
      const existingPresence = sessionState.session.users.get(userId);
      if (existingPresence) {
        const updatedPresence: UserPresence = {
          ...existingPresence,
          ...presence,
          lastSeen: new Date()
        };
        sessionState.session.users.set(userId, updatedPresence);
      }

      // Update presence in Supabase channel
      await sessionState.channel.track({
        user_id: userId,
        ...presence,
        last_seen: new Date().toISOString()
      });

      // Update session activity
      sessionState.lastActivity = new Date();
      sessionState.session.lastActivity = new Date();

      return Result.ok(undefined);

    } catch (error) {
      this.logger.error('Failed to update user presence', error);
      return Result.fail(`Presence update error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Broadcast collaboration event
   */
  async broadcastCollaborationEvent(
    sessionId: string, 
    event: CollaborationEvent
  ): Promise<Result<void>> {
    try {
      const sessionState = this.activeSessions.get(sessionId);
      if (!sessionState) {
        return Result.fail('Collaboration session not found');
      }

      await sessionState.channel.send({
        type: 'broadcast',
        event: 'collaboration',
        payload: event
      });

      // Update session activity
      sessionState.lastActivity = new Date();
      sessionState.session.lastActivity = new Date();

      return Result.ok(undefined);

    } catch (error) {
      this.logger.error('Failed to broadcast collaboration event', error);
      return Result.fail(`Broadcast error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Subscribe to collaboration events
   */
  async subscribeToCollaboration(
    sessionId: string, 
    callback: (event: CollaborationEvent) => void
  ): Promise<Result<Subscription>> {
    try {
      const sessionState = this.activeSessions.get(sessionId);
      if (!sessionState) {
        return Result.fail('Collaboration session not found');
      }

      const channelName = `collaboration:${sessionId}`;
      
      // Add broadcast listener
      sessionState.channel.on('broadcast', { event: 'collaboration' }, (payload) => {
        try {
          callback(payload.payload as CollaborationEvent);
        } catch (error) {
          this.logger.error('Error in collaboration callback', error);
        }
      });

      const subscription: Subscription = {
        id: channelName,
        channel: sessionState.channel,
        config: {
          channelName,
          enabled: true,
          autoReconnect: true,
          maxReconnectAttempts: 5,
          reconnectDelay: 1000,
          heartbeatInterval: this.heartbeatIntervalMs,
          presenceTracking: true
        },
        status: {
          isConnected: true,
          connectionId: channelName,
          connectedAt: sessionState.session.startedAt,
          reconnectAttempts: 0
        },
        dispose: async () => {
          // Note: Don't dispose the main channel here as it's managed by session lifecycle
        }
      };

      return Result.ok(subscription);

    } catch (error) {
      this.logger.error('Failed to subscribe to collaboration', error);
      return Result.fail(`Subscription error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get active users in session
   */
  async getActiveUsers(sessionId: string): Promise<Result<UserPresence[]>> {
    try {
      const sessionState = this.activeSessions.get(sessionId);
      if (!sessionState) {
        return Result.fail('Collaboration session not found');
      }

      const activeUsers = Array.from(sessionState.session.users.values())
        .filter(user => user.status === 'active');

      return Result.ok(activeUsers);

    } catch (error) {
      this.logger.error('Failed to get active users', error);
      return Result.fail(`Get users error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle user disconnect
   */
  async handleUserDisconnect(userId: string): Promise<Result<void>> {
    try {
      const userSessionIds = this.userSessions.get(userId);
      if (!userSessionIds) {
        return Result.ok(undefined); // User not in any sessions
      }

      // End all sessions for the disconnected user
      const endSessionPromises = Array.from(userSessionIds).map(sessionId =>
        this.endCollaborationSession(sessionId, userId)
      );

      await Promise.allSettled(endSessionPromises);

      this.logger.info(`Handled disconnect for user ${userId}`);
      return Result.ok(undefined);

    } catch (error) {
      this.logger.error('Failed to handle user disconnect', error);
      return Result.fail(`Disconnect handling error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle presence synchronization
   */
  private handlePresenceSync(sessionId: string): void {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) return;

    try {
      const presenceState = sessionState.channel.presenceState();
      const users = new Map<string, UserPresence>();

      Object.entries(presenceState).forEach(([key, presences]) => {
        presences.forEach((presence: any) => {
          const userPresence: UserPresence = {
            userId: presence.user_id,
            userName: presence.user_name || presence.user_id,
            avatar: presence.avatar,
            role: presence.role,
            status: presence.status || 'active',
            joinedAt: new Date(presence.joined_at),
            lastSeen: new Date(presence.last_seen || presence.joined_at),
            currentActivity: presence.current_activity,
            cursor: presence.cursor
          };
          users.set(presence.user_id, userPresence);
        });
      });

      sessionState.session.users = users;
      this.logger.debug(`Presence sync for session ${sessionId}: ${users.size} users`);

    } catch (error) {
      this.logger.error('Error handling presence sync', error);
    }
  }

  /**
   * Handle user joining
   */
  private handleUserJoin(sessionId: string, key: string, newPresences: any[]): void {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) return;

    try {
      newPresences.forEach((presence) => {
        const userPresence: UserPresence = {
          userId: presence.user_id,
          userName: presence.user_name || presence.user_id,
          avatar: presence.avatar,
          role: presence.role,
          status: 'active',
          joinedAt: new Date(presence.joined_at),
          lastSeen: new Date(),
          currentActivity: presence.current_activity,
          cursor: presence.cursor
        };

        sessionState.session.users.set(presence.user_id, userPresence);

        // Broadcast user joined event
        const joinEvent: UserJoinedEvent = {
          type: 'user_joined',
          userId: presence.user_id,
          userName: userPresence.userName,
          userData: {
            userId: userPresence.userId,
            userName: userPresence.userName,
            avatar: userPresence.avatar,
            role: userPresence.role
          },
          modelId: sessionState.session.modelId,
          id: `join_${presence.user_id}_${Date.now()}`,
          timestamp: new Date(),
          sessionId
        };

        this.broadcastCollaborationEvent(sessionId, joinEvent);
      });

      this.logger.info(`Users joined collaboration session ${sessionId}`);

    } catch (error) {
      this.logger.error('Error handling user join', error);
    }
  }

  /**
   * Handle user leaving
   */
  private handleUserLeave(sessionId: string, key: string, leftPresences: any[]): void {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) return;

    try {
      leftPresences.forEach((presence) => {
        const userPresence = sessionState.session.users.get(presence.user_id);
        if (userPresence) {
          userPresence.status = 'away';
          userPresence.lastSeen = new Date();
        }

        // Broadcast user left event
        const leftEvent: UserLeftEvent = {
          type: 'user_left',
          userId: presence.user_id,
          userName: userPresence?.userName || presence.user_id,
          userData: {
            userId: presence.user_id,
            userName: userPresence?.userName || presence.user_id,
            avatar: userPresence?.avatar,
            role: userPresence?.role
          },
          modelId: sessionState.session.modelId,
          id: `leave_${presence.user_id}_${Date.now()}`,
          timestamp: new Date(),
          sessionId
        };

        this.broadcastCollaborationEvent(sessionId, leftEvent);
      });

      this.logger.info(`Users left collaboration session ${sessionId}`);

    } catch (error) {
      this.logger.error('Error handling user leave', error);
    }
  }

  /**
   * Handle collaboration broadcast events
   */
  private handleCollaborationBroadcast(sessionId: string, payload: any): void {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) return;

    try {
      const event = payload.payload as CollaborationEvent;
      
      // Update session activity
      sessionState.lastActivity = new Date();
      sessionState.session.lastActivity = new Date();

      // Handle specific event types
      switch (event.type) {
        case 'cursor_moved':
          this.handleCursorMoved(sessionState, event as CursorMovedEvent);
          break;
        case 'selection_changed':
          this.handleSelectionChanged(sessionState, event as SelectionChangedEvent);
          break;
        case 'user_typing':
          this.handleUserTyping(sessionState, event as UserTypingEvent);
          break;
      }

    } catch (error) {
      this.logger.error('Error handling collaboration broadcast', error);
    }
  }

  /**
   * Handle cursor movement
   */
  private handleCursorMoved(sessionState: SessionState, event: CursorMovedEvent): void {
    const userPresence = sessionState.session.users.get(event.userId);
    if (userPresence) {
      userPresence.cursor = {
        x: event.cursor.x,
        y: event.cursor.y,
        visible: true
      };
      userPresence.lastSeen = new Date();
    }
  }

  /**
   * Handle selection change
   */
  private handleSelectionChanged(sessionState: SessionState, event: SelectionChangedEvent): void {
    const userPresence = sessionState.session.users.get(event.userId);
    if (userPresence) {
      userPresence.currentActivity = {
        action: 'selecting',
        nodeId: event.selection.items[0],
        description: `Selected ${event.selection.items.length} items`
      };
      userPresence.lastSeen = new Date();
    }
  }

  /**
   * Handle user typing
   */
  private handleUserTyping(sessionState: SessionState, event: UserTypingEvent): void {
    const userPresence = sessionState.session.users.get(event.userId);
    if (userPresence) {
      userPresence.currentActivity = {
        action: 'typing',
        nodeId: event.target.nodeId,
        description: `Typing in ${event.target.field || 'field'}`
      };
      userPresence.lastSeen = new Date();
    }
  }

  /**
   * Send heartbeat for session
   */
  private async sendHeartbeat(sessionId: string, userId: string): Promise<void> {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) return;

    try {
      await sessionState.channel.track({
        user_id: userId,
        heartbeat: new Date().toISOString(),
        status: 'active'
      });
    } catch (error) {
      this.logger.error(`Heartbeat failed for session ${sessionId}`, error);
    }
  }

  /**
   * Get user name from session
   */
  private getUserName(session: CollaborationSession, userId: string): string {
    const user = session.users.get(userId);
    return user?.userName || userId;
  }

  /**
   * Destroy session completely
   */
  private async destroySession(sessionId: string): Promise<void> {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) return;

    try {
      // Clear heartbeat interval
      clearInterval(sessionState.heartbeatInterval);

      // Unsubscribe from channel
      await sessionState.channel.unsubscribe();

      // Remove from tracking
      this.activeSessions.delete(sessionId);
      this.channels.delete(`collaboration:${sessionId}`);

      this.logger.info(`Destroyed collaboration session ${sessionId}`);

    } catch (error) {
      this.logger.error(`Error destroying session ${sessionId}`, error);
    }
  }

  /**
   * Cleanup inactive sessions
   */
  private cleanupInactiveSessions(): void {
    const now = new Date();
    const sessionsToDestroy: string[] = [];

    for (const [sessionId, sessionState] of this.activeSessions.entries()) {
      const timeSinceLastActivity = now.getTime() - sessionState.lastActivity.getTime();
      
      if (timeSinceLastActivity > this.sessionTimeoutMs) {
        sessionsToDestroy.push(sessionId);
      }
    }

    sessionsToDestroy.forEach(sessionId => {
      this.logger.info(`Cleaning up inactive session ${sessionId}`);
      this.destroySession(sessionId);
    });
  }

  /**
   * Cleanup all sessions
   */
  async cleanup(): Promise<void> {
    const sessionIds = Array.from(this.activeSessions.keys());
    await Promise.all(
      sessionIds.map(sessionId => this.destroySession(sessionId))
    );
  }
}