/**
 * Real-time adapter types and interfaces for comprehensive Supabase real-time integration
 * 
 * CLEAN ARCHITECTURE BOUNDARY:
 * - Infrastructure Layer - Real-time type definitions and contracts
 * - Defines interfaces for real-time adapters and collaboration services
 * - No framework dependencies, pure TypeScript interfaces
 */

import { Result } from '../../domain/shared/result';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

// ================================================================
// CORE REAL-TIME EVENT TYPES
// ================================================================

export type RealtimeEventType = 
  // Model Events
  | 'model_created' | 'model_updated' | 'model_deleted' | 'model_published'
  // Node Events  
  | 'node_added' | 'node_updated' | 'node_deleted' | 'node_moved'
  // Action Events
  | 'action_added' | 'action_updated' | 'action_deleted' | 'action_configured'
  // Execution Events
  | 'execution_started' | 'execution_progress' | 'execution_completed' | 'execution_failed' | 'execution_paused' | 'execution_resumed'
  // Statistics Events
  | 'statistics_updated' | 'performance_metrics' | 'usage_metrics'
  // Collaboration Events
  | 'user_joined' | 'user_left' | 'user_typing' | 'cursor_moved' | 'selection_changed' | 'presence_updated';

export interface BaseRealtimeEvent {
  id: string;
  type: RealtimeEventType;
  timestamp: Date;
  userId: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

// ================================================================
// MODEL COLLABORATION EVENTS
// ================================================================

export interface ModelEvent extends BaseRealtimeEvent {
  modelId: string;
  version?: string;
}

export interface ModelCreatedEvent extends ModelEvent {
  type: 'model_created';
  modelData: {
    name: string;
    description?: string;
    status: string;
  };
}

export interface ModelUpdatedEvent extends ModelEvent {
  type: 'model_updated';
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  conflictResolution?: 'overwrite' | 'merge' | 'reject';
}

export interface ModelDeletedEvent extends ModelEvent {
  type: 'model_deleted';
  softDelete?: boolean;
}

export interface ModelPublishedEvent extends ModelEvent {
  type: 'model_published';
  publishedVersion: string;
}

// ================================================================
// NODE MANIPULATION EVENTS  
// ================================================================

export interface NodeEvent extends BaseRealtimeEvent {
  modelId: string;
  nodeId: string;
}

export interface NodeAddedEvent extends NodeEvent {
  type: 'node_added';
  nodeData: {
    nodeType: string;
    position: { x: number; y: number };
    configuration: Record<string, any>;
    parentId?: string;
  };
}

export interface NodeUpdatedEvent extends NodeEvent {
  type: 'node_updated';
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface NodeDeletedEvent extends NodeEvent {
  type: 'node_deleted';
  cascade?: boolean;
}

export interface NodeMovedEvent extends NodeEvent {
  type: 'node_moved';
  oldPosition: { x: number; y: number };
  newPosition: { x: number; y: number };
}

// ================================================================
// EXECUTION MONITORING EVENTS
// ================================================================

export interface ExecutionEvent extends BaseRealtimeEvent {
  modelId: string;
  executionId: string;
}

export interface ExecutionStartedEvent extends ExecutionEvent {
  type: 'execution_started';
  context: {
    triggeredBy: 'manual' | 'scheduled' | 'webhook';
    inputData?: Record<string, any>;
    estimatedDuration?: number;
  };
}

export interface ExecutionProgressEvent extends ExecutionEvent {
  type: 'execution_progress';
  progress: {
    currentStep: string;
    completedSteps: number;
    totalSteps: number;
    percentage: number;
    currentNodeId?: string;
    processingTime: number;
  };
}

export interface ExecutionCompletedEvent extends ExecutionEvent {
  type: 'execution_completed';
  result: {
    success: boolean;
    outputData?: Record<string, any>;
    executionTime: number;
    stepsCompleted: number;
    errors?: string[];
  };
}

export interface ExecutionFailedEvent extends ExecutionEvent {
  type: 'execution_failed';
  error: {
    code: string;
    message: string;
    nodeId?: string;
    step?: string;
    stack?: string;
    recoverable: boolean;
  };
}

// ================================================================
// STATISTICS AND ANALYTICS EVENTS
// ================================================================

export interface StatisticsEvent extends BaseRealtimeEvent {
  scope: 'model' | 'user' | 'system';
  entityId?: string;
}

export interface StatisticsUpdatedEvent extends StatisticsEvent {
  type: 'statistics_updated';
  metrics: {
    category: string;
    name: string;
    value: number;
    unit?: string;
    trend?: 'up' | 'down' | 'stable';
  }[];
}

export interface PerformanceMetricsEvent extends StatisticsEvent {
  type: 'performance_metrics';
  performance: {
    executionTime: number;
    memoryUsage: number;
    cpuUsage: number;
    throughput: number;
    errorRate: number;
    successRate: number;
  };
}

// ================================================================
// COLLABORATION AND PRESENCE EVENTS
// ================================================================

export interface CollaborationEvent extends BaseRealtimeEvent {
  modelId: string;
  userData: {
    userId: string;
    userName: string;
    avatar?: string;
    role?: string;
  };
}

export interface UserJoinedEvent extends CollaborationEvent {
  type: 'user_joined';
}

export interface UserLeftEvent extends CollaborationEvent {
  type: 'user_left';
}

export interface CursorMovedEvent extends CollaborationEvent {
  type: 'cursor_moved';
  cursor: {
    x: number;
    y: number;
    nodeId?: string;
    elementId?: string;
  };
}

export interface SelectionChangedEvent extends CollaborationEvent {
  type: 'selection_changed';
  selection: {
    type: 'node' | 'edge' | 'area';
    items: string[];
    bounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export interface UserTypingEvent extends CollaborationEvent {
  type: 'user_typing';
  target: {
    nodeId?: string;
    field?: string;
    text?: string;
  };
}

// ================================================================
// SUBSCRIPTION MANAGEMENT TYPES
// ================================================================

export interface SubscriptionConfig {
  channelName: string;
  enabled: boolean;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval?: number;
  presenceTracking?: boolean;
  conflictResolution?: 'lastWriteWins' | 'merge' | 'reject';
}

export interface SubscriptionStatus {
  isConnected: boolean;
  connectionId?: string;
  connectedAt?: Date;
  lastHeartbeat?: Date;
  reconnectAttempts: number;
  error?: string;
}

export interface Subscription {
  id: string;
  channel: RealtimeChannel;
  config: SubscriptionConfig;
  status: SubscriptionStatus;
  dispose(): Promise<void>;
}

// ================================================================
// PRESENCE AND USER MANAGEMENT
// ================================================================

export interface UserPresence {
  userId: string;
  userName: string;
  avatar?: string;
  role?: string;
  status: 'active' | 'idle' | 'away';
  joinedAt: Date;
  lastSeen: Date;
  currentActivity?: {
    action: string;
    nodeId?: string;
    description?: string;
  };
  cursor?: {
    x: number;
    y: number;
    visible: boolean;
  };
}

export interface CollaborationSession {
  sessionId: string;
  modelId: string;
  users: Map<string, UserPresence>;
  startedAt: Date;
  lastActivity: Date;
}

// ================================================================
// CONFLICT RESOLUTION TYPES
// ================================================================

export interface ConflictDetection {
  conflictId: string;
  type: 'field' | 'position' | 'structure';
  entityId: string;
  entityType: 'model' | 'node' | 'action';
  conflictingChanges: {
    userId: string;
    timestamp: Date;
    changes: any;
  }[];
}

export interface ConflictResolution {
  conflictId: string;
  strategy: 'auto' | 'manual' | 'merge';
  resolution: 'accept' | 'reject' | 'merge';
  resolvedBy?: string;
  resolvedAt?: Date;
  mergedResult?: any;
}

// ================================================================
// ADAPTER INTERFACES
// ================================================================

export interface IRealtimeModelAdapter {
  subscribeToModel(modelId: string, callback: (event: ModelEvent) => void): Promise<Result<Subscription>>;
  subscribeToModelNodes(modelId: string, callback: (event: NodeEvent) => void): Promise<Result<Subscription>>;
  broadcastModelChange(modelId: string, event: ModelEvent): Promise<Result<void>>;
  broadcastNodeChange(modelId: string, event: NodeEvent): Promise<Result<void>>;
  detectConflicts(modelId: string, changes: any[]): Promise<Result<ConflictDetection[]>>;
  resolveConflict(conflict: ConflictDetection, resolution: ConflictResolution): Promise<Result<void>>;
}

export interface IRealtimeExecutionAdapter {
  subscribeToExecution(executionId: string, callback: (event: ExecutionEvent) => void): Promise<Result<Subscription>>;
  subscribeToModelExecutions(modelId: string, callback: (event: ExecutionEvent) => void): Promise<Result<Subscription>>;
  broadcastExecutionEvent(event: ExecutionEvent): Promise<Result<void>>;
  getExecutionProgress(executionId: string): Promise<Result<ExecutionProgressEvent>>;
  pauseExecution(executionId: string): Promise<Result<void>>;
  resumeExecution(executionId: string): Promise<Result<void>>;
  cancelExecution(executionId: string): Promise<Result<void>>;
}

export interface IRealtimeStatisticsAdapter {
  subscribeToStatistics(scope: 'model' | 'user' | 'system', entityId?: string, callback?: (event: StatisticsEvent) => void): Promise<Result<Subscription>>;
  broadcastStatisticsUpdate(event: StatisticsEvent): Promise<Result<void>>;
  getLatestMetrics(scope: 'model' | 'user' | 'system', entityId?: string): Promise<Result<PerformanceMetricsEvent>>;
  aggregateMetrics(scope: string, timeRange: { start: Date; end: Date }): Promise<Result<StatisticsEvent[]>>;
}

export interface ICollaborationManager {
  startCollaborationSession(modelId: string, userId: string): Promise<Result<CollaborationSession>>;
  endCollaborationSession(sessionId: string, userId: string): Promise<Result<void>>;
  updateUserPresence(sessionId: string, userId: string, presence: Partial<UserPresence>): Promise<Result<void>>;
  broadcastCollaborationEvent(sessionId: string, event: CollaborationEvent): Promise<Result<void>>;
  subscribeToCollaboration(sessionId: string, callback: (event: CollaborationEvent) => void): Promise<Result<Subscription>>;
  getActiveUsers(sessionId: string): Promise<Result<UserPresence[]>>;
  handleUserDisconnect(userId: string): Promise<Result<void>>;
}

export interface IRealtimeService {
  initialize(supabaseClient: SupabaseClient): Promise<Result<void>>;
  getModelAdapter(): IRealtimeModelAdapter;
  getExecutionAdapter(): IRealtimeExecutionAdapter;
  getStatisticsAdapter(): IRealtimeStatisticsAdapter;
  getCollaborationManager(): ICollaborationManager;
  createChannel(name: string, config?: Partial<SubscriptionConfig>): Promise<Result<RealtimeChannel>>;
  destroyChannel(name: string): Promise<Result<void>>;
  getConnectionStatus(): SubscriptionStatus;
  dispose(): Promise<void>;
}

// ================================================================
// ERROR TYPES
// ================================================================

export interface RealtimeError extends Error {
  code: string;
  type: 'connection' | 'subscription' | 'conflict' | 'permission' | 'validation';
  retryable: boolean;
  metadata?: Record<string, any>;
}

export class RealtimeConnectionError extends Error implements RealtimeError {
  public readonly code = 'REALTIME_CONNECTION_ERROR';
  public readonly type = 'connection' as const;
  public readonly retryable = true;
  
  constructor(message: string, public readonly metadata?: Record<string, any>) {
    super(message);
    this.name = 'RealtimeConnectionError';
  }
}

export class RealtimeSubscriptionError extends Error implements RealtimeError {
  public readonly code = 'REALTIME_SUBSCRIPTION_ERROR';
  public readonly type = 'subscription' as const;
  public readonly retryable = true;
  
  constructor(message: string, public readonly metadata?: Record<string, any>) {
    super(message);
    this.name = 'RealtimeSubscriptionError';
  }
}

export class RealtimeConflictError extends Error implements RealtimeError {
  public readonly code = 'REALTIME_CONFLICT_ERROR';
  public readonly type = 'conflict' as const;
  public readonly retryable = false;
  
  constructor(message: string, public readonly metadata?: Record<string, any>) {
    super(message);
    this.name = 'RealtimeConflictError';
  }
}

// ================================================================
// UTILITY TYPES
// ================================================================

export type RealtimeEventUnion = 
  | ModelCreatedEvent | ModelUpdatedEvent | ModelDeletedEvent | ModelPublishedEvent
  | NodeAddedEvent | NodeUpdatedEvent | NodeDeletedEvent | NodeMovedEvent
  | ExecutionStartedEvent | ExecutionProgressEvent | ExecutionCompletedEvent | ExecutionFailedEvent
  | StatisticsUpdatedEvent | PerformanceMetricsEvent
  | UserJoinedEvent | UserLeftEvent | CursorMovedEvent | SelectionChangedEvent | UserTypingEvent;

export type EventCallback<T extends BaseRealtimeEvent = BaseRealtimeEvent> = (event: T) => void;

export interface RealtimeConfig {
  enabled: boolean;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelayMs: number;
  heartbeatIntervalMs: number;
  presenceTracking: boolean;
  conflictResolution: 'lastWriteWins' | 'merge' | 'reject';
  debugMode: boolean;
}

export const DefaultRealtimeConfig: RealtimeConfig = {
  enabled: true,
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelayMs: 1000,
  heartbeatIntervalMs: 30000,
  presenceTracking: true,
  conflictResolution: 'lastWriteWins',
  debugMode: false
};