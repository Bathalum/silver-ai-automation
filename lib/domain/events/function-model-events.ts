// Function Model Domain Events
// This file contains domain events for function model state changes

import type { FunctionModelNode } from '../entities/function-model-node-types'
import type { CrossFeatureLink } from '../entities/cross-feature-link-types'
import type { AIAgentConfig } from '../entities/ai-integration-types'

// Base Event Interface
export interface DomainEvent {
  eventId: string
  eventType: string
  timestamp: Date
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
}

// Node Events
export interface NodeCreatedEvent extends DomainEvent {
  eventType: 'NodeCreated'
  nodeId: string
  featureType: string
  entityId: string
  nodeType: string
  nodeData: Partial<FunctionModelNode>
}

export interface NodeUpdatedEvent extends DomainEvent {
  eventType: 'NodeUpdated'
  nodeId: string
  featureType: string
  entityId: string
  nodeType: string
  previousData: Partial<FunctionModelNode>
  currentData: Partial<FunctionModelNode>
  changedFields: string[]
}

export interface NodeDeletedEvent extends DomainEvent {
  eventType: 'NodeDeleted'
  nodeId: string
  featureType: string
  entityId: string
  nodeType: string
  deletionReason?: string
  softDelete: boolean
}

export interface NodeExecutedEvent extends DomainEvent {
  eventType: 'NodeExecuted'
  nodeId: string
  featureType: string
  entityId: string
  nodeType: string
  executionResult: {
    success: boolean
    duration: number
    output?: any
    error?: string
  }
  executionContext: {
    parameters: Record<string, any>
    environment: string
    timestamp: Date
  }
}

export interface NodeValidatedEvent extends DomainEvent {
  eventType: 'NodeValidated'
  nodeId: string
  featureType: string
  entityId: string
  nodeType: string
  validationResult: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

// Cross-Feature Link Events
export interface LinkCreatedEvent extends DomainEvent {
  eventType: 'LinkCreated'
  linkId: string
  sourceFeature: string
  sourceEntityId: string
  sourceNodeId?: string
  targetFeature: string
  targetEntityId: string
  targetNodeId?: string
  linkType: string
  linkData: Partial<CrossFeatureLink>
}

export interface LinkUpdatedEvent extends DomainEvent {
  eventType: 'LinkUpdated'
  linkId: string
  sourceFeature: string
  sourceEntityId: string
  sourceNodeId?: string
  targetFeature: string
  targetEntityId: string
  targetNodeId?: string
  linkType: string
  previousData: Partial<CrossFeatureLink>
  currentData: Partial<CrossFeatureLink>
  changedFields: string[]
}

export interface LinkDeletedEvent extends DomainEvent {
  eventType: 'LinkDeleted'
  linkId: string
  sourceFeature: string
  sourceEntityId: string
  sourceNodeId?: string
  targetFeature: string
  targetEntityId: string
  targetNodeId?: string
  linkType: string
  deletionReason?: string
}

export interface LinkValidatedEvent extends DomainEvent {
  eventType: 'LinkValidated'
  linkId: string
  sourceFeature: string
  sourceEntityId: string
  sourceNodeId?: string
  targetFeature: string
  targetEntityId: string
  targetNodeId?: string
  linkType: string
  validationResult: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

// AI Agent Events
export interface AgentCreatedEvent extends DomainEvent {
  eventType: 'AgentCreated'
  agentId: string
  nodeId: string
  featureType: string
  entityId: string
  agentConfig: Partial<AIAgentConfig>
}

export interface AgentUpdatedEvent extends DomainEvent {
  eventType: 'AgentUpdated'
  agentId: string
  nodeId: string
  featureType: string
  entityId: string
  previousConfig: Partial<AIAgentConfig>
  currentConfig: Partial<AIAgentConfig>
  changedFields: string[]
}

export interface AgentExecutedEvent extends DomainEvent {
  eventType: 'AgentExecuted'
  agentId: string
  nodeId: string
  featureType: string
  entityId: string
  executionResult: {
    success: boolean
    response?: string
    error?: string
    duration: number
    tokensUsed?: number
  }
  executionContext: {
    input: string
    tools: string[]
    model: string
    temperature: number
    timestamp: Date
  }
}

export interface AgentEnabledEvent extends DomainEvent {
  eventType: 'AgentEnabled'
  agentId: string
  nodeId: string
  featureType: string
  entityId: string
  enabledBy: string
}

export interface AgentDisabledEvent extends DomainEvent {
  eventType: 'AgentDisabled'
  agentId: string
  nodeId: string
  featureType: string
  entityId: string
  disabledBy: string
  reason?: string
}

// Function Model Specific Events
export interface ModelCreatedEvent extends DomainEvent {
  eventType: 'ModelCreated'
  modelId: string
  modelName: string
  modelDescription?: string
  version: string
  status: string
}

export interface ModelUpdatedEvent extends DomainEvent {
  eventType: 'ModelUpdated'
  modelId: string
  modelName: string
  previousData: {
    name: string
    description?: string
    version: string
    status: string
  }
  currentData: {
    name: string
    description?: string
    version: string
    status: string
  }
  changedFields: string[]
}

export interface ModelPublishedEvent extends DomainEvent {
  eventType: 'ModelPublished'
  modelId: string
  modelName: string
  version: string
  publishedBy: string
  publishedAt: Date
}

export interface ModelArchivedEvent extends DomainEvent {
  eventType: 'ModelArchived'
  modelId: string
  modelName: string
  version: string
  archivedBy: string
  archivedAt: Date
  reason?: string
}

export interface ModelVersionCreatedEvent extends DomainEvent {
  eventType: 'ModelVersionCreated'
  modelId: string
  versionId: string
  versionNumber: string
  versionData: any
  createdBy: string
}

export interface ModelVersionPublishedEvent extends DomainEvent {
  eventType: 'ModelVersionPublished'
  modelId: string
  versionId: string
  versionNumber: string
  publishedBy: string
  publishedAt: Date
}

// Execution Events
export interface ProcessStartedEvent extends DomainEvent {
  eventType: 'ProcessStarted'
  processId: string
  modelId: string
  nodeId: string
  executionType: string
  parameters: Record<string, any>
}

export interface ProcessCompletedEvent extends DomainEvent {
  eventType: 'ProcessCompleted'
  processId: string
  modelId: string
  nodeId: string
  executionResult: {
    success: boolean
    duration: number
    output?: any
    error?: string
  }
}

export interface ProcessFailedEvent extends DomainEvent {
  eventType: 'ProcessFailed'
  processId: string
  modelId: string
  nodeId: string
  error: string
  retryCount: number
  maxRetries: number
}

// Validation Events
export interface ValidationStartedEvent extends DomainEvent {
  eventType: 'ValidationStarted'
  validationId: string
  nodeId: string
  featureType: string
  entityId: string
  validationType: 'node' | 'link' | 'model'
}

export interface ValidationCompletedEvent extends DomainEvent {
  eventType: 'ValidationCompleted'
  validationId: string
  nodeId: string
  featureType: string
  entityId: string
  validationType: 'node' | 'link' | 'model'
  validationResult: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

// Performance Events
export interface PerformanceMetricsEvent extends DomainEvent {
  eventType: 'PerformanceMetrics'
  nodeId: string
  featureType: string
  entityId: string
  metrics: {
    executionTime: number
    memoryUsage: number
    cpuUsage: number
    networkRequests: number
    errors: number
  }
  timestamp: Date
}

// Security Events
export interface SecurityAuditEvent extends DomainEvent {
  eventType: 'SecurityAudit'
  auditId: string
  action: string
  resource: string
  resourceType: string
  userId: string
  ipAddress?: string
  userAgent?: string
  success: boolean
  details?: Record<string, any>
}

// Event Factory
export class FunctionModelEventFactory {
  static createNodeCreatedEvent(
    nodeId: string,
    featureType: string,
    entityId: string,
    nodeType: string,
    nodeData: Partial<FunctionModelNode>,
    userId?: string,
    sessionId?: string
  ): NodeCreatedEvent {
    return {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'NodeCreated',
      timestamp: new Date(),
      userId,
      sessionId,
      nodeId,
      featureType,
      entityId,
      nodeType,
      nodeData
    }
  }

  static createNodeUpdatedEvent(
    nodeId: string,
    featureType: string,
    entityId: string,
    nodeType: string,
    previousData: Partial<FunctionModelNode>,
    currentData: Partial<FunctionModelNode>,
    changedFields: string[],
    userId?: string,
    sessionId?: string
  ): NodeUpdatedEvent {
    return {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'NodeUpdated',
      timestamp: new Date(),
      userId,
      sessionId,
      nodeId,
      featureType,
      entityId,
      nodeType,
      previousData,
      currentData,
      changedFields
    }
  }

  static createLinkCreatedEvent(
    linkId: string,
    sourceFeature: string,
    sourceEntityId: string,
    sourceNodeId: string | undefined,
    targetFeature: string,
    targetEntityId: string,
    targetNodeId: string | undefined,
    linkType: string,
    linkData: Partial<CrossFeatureLink>,
    userId?: string,
    sessionId?: string
  ): LinkCreatedEvent {
    return {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'LinkCreated',
      timestamp: new Date(),
      userId,
      sessionId,
      linkId,
      sourceFeature,
      sourceEntityId,
      sourceNodeId,
      targetFeature,
      targetEntityId,
      targetNodeId,
      linkType,
      linkData
    }
  }

  static createAgentExecutedEvent(
    agentId: string,
    nodeId: string,
    featureType: string,
    entityId: string,
    executionResult: {
      success: boolean
      response?: string
      error?: string
      duration: number
      tokensUsed?: number
    },
    executionContext: {
      input: string
      tools: string[]
      model: string
      temperature: number
      timestamp: Date
    },
    userId?: string,
    sessionId?: string
  ): AgentExecutedEvent {
    return {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'AgentExecuted',
      timestamp: new Date(),
      userId,
      sessionId,
      agentId,
      nodeId,
      featureType,
      entityId,
      executionResult,
      executionContext
    }
  }
}

// Event Type Union
export type FunctionModelEvent = 
  | NodeCreatedEvent
  | NodeUpdatedEvent
  | NodeDeletedEvent
  | NodeExecutedEvent
  | NodeValidatedEvent
  | LinkCreatedEvent
  | LinkUpdatedEvent
  | LinkDeletedEvent
  | LinkValidatedEvent
  | AgentCreatedEvent
  | AgentUpdatedEvent
  | AgentExecutedEvent
  | AgentEnabledEvent
  | AgentDisabledEvent
  | ModelCreatedEvent
  | ModelUpdatedEvent
  | ModelPublishedEvent
  | ModelArchivedEvent
  | ModelVersionCreatedEvent
  | ModelVersionPublishedEvent
  | ProcessStartedEvent
  | ProcessCompletedEvent
  | ProcessFailedEvent
  | ValidationStartedEvent
  | ValidationCompletedEvent
  | PerformanceMetricsEvent
  | SecurityAuditEvent 