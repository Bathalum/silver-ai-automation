// This file defines the foundational BaseNode interface and supporting types for the node-based architecture
// Provides common interfaces and types used across all node types

import type { VisualProperties } from './visual-properties'
import type { AIAgentConfig } from './ai-integration-types'

export interface BaseNode {
  nodeId: string
  featureType: FeatureType
  entityId: string
  nodeType: string
  name: string
  description?: string
  
  // Visual representation (for unified visualization)
  position: Position
  visualProperties: VisualProperties
  
  // Cross-feature connectivity
  metadata: NodeMetadata
  
  // Universal lifecycle
  createdAt: Date
  updatedAt: Date
  status: NodeStatus
}

export type FeatureType = 'function-model' | 'event-storm' | 'spindle' | 'knowledge-base'

export type NodeStatus = 'active' | 'inactive' | 'draft' | 'archived' | 'error'

export interface Position {
  x: number
  y: number
}

export interface NodeMetadata {
  tags: string[]
  aiAgent?: AIAgentConfig
  vectorEmbedding?: number[]
  searchKeywords: string[]
  crossFeatureLinks?: CrossFeatureLinkMetadata[]
}

export interface CrossFeatureLinkMetadata {
  linkId: string
  targetFeature: FeatureType
  targetEntityId: string
  targetNodeId?: string
  linkType: string
  linkStrength: number
}

export interface NodeVisualProperties {
  color?: string
  size?: number
  shape?: 'circle' | 'square' | 'diamond' | 'triangle'
  borderColor?: string
  borderWidth?: number
  opacity?: number
  label?: string
  icon?: string
}

export interface NodeExecutionConfig {
  timeout?: number
  retryPolicy?: {
    maxRetries: number
    retryDelay: number
    backoffMultiplier: number
  }
  dependencies?: string[]
  outputs?: string[]
}

export interface NodeValidationRule {
  field: string
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom'
  value?: any
  message?: string
  validator?: (value: any) => boolean
}

export interface NodeSearchCriteria {
  query?: string
  featureType?: FeatureType
  nodeType?: string
  status?: NodeStatus
  position?: {
    x: number
    y: number
    radius: number
  }
  metadata?: Record<string, any>
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface NodeSortCriteria {
  field: 'name' | 'createdAt' | 'updatedAt' | 'position.x' | 'position.y'
  direction: 'asc' | 'desc'
}

export interface NodeFilterOptions {
  search?: NodeSearchCriteria
  sort?: NodeSortCriteria
  limit?: number
  offset?: number
}

export interface NodeStatistics {
  totalNodes: number
  nodesByFeatureType: Record<FeatureType, number>
  nodesByStatus: Record<NodeStatus, number>
  nodesByType: Record<string, number>
  averagePosition: Position
  lastUpdated: Date
} 