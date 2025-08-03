// Base Node Architecture Types
// This file defines the foundational BaseNode interface and supporting types for the unified node-based architecture

export interface BaseNode {
  id: string
  featureType: FeatureType
  nodeType: string
  name: string
  description?: string
  position: { x: number; y: number }
  visualProperties: VisualProperties
  metadata: NodeMetadata
  createdAt: Date
  updatedAt: Date
  status: NodeStatus
}

export interface VisualProperties {
  color?: string
  icon?: string
  size?: 'small' | 'medium' | 'large'
  style?: Record<string, any>
  featureSpecific?: Record<string, any>
}

export interface NodeMetadata {
  tags: string[]
  aiAgent?: AIAgentConfig
  vectorEmbedding?: number[]
  searchKeywords: string[]
  crossFeatureLinks?: CrossFeatureLinkMetadata[]
}

export interface AIAgentConfig {
  agentId: string
  instructions: string
  tools: string[]
  capabilities: Record<string, any>
  isActive: boolean
}

export interface CrossFeatureLinkMetadata {
  linkId: string
  targetFeature: FeatureType
  targetEntityId: string
  targetNodeId?: string
  linkType: LinkType
  linkStrength: number
  context: Record<string, any>
}

export type NodeStatus = 'active' | 'inactive' | 'draft' | 'archived' | 'error'
export type FeatureType = 'function-model' | 'knowledge-base' | 'spindle'
export type LinkType = 'documents' | 'implements' | 'references' | 'supports' | 'nested' | 'triggers' | 'consumes' | 'produces'

// Factory function for creating base nodes
export function createBaseNode(
  featureType: FeatureType,
  nodeType: string,
  name: string,
  position: { x: number; y: number },
  options: Partial<BaseNode> = {}
): Omit<BaseNode, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    featureType,
    nodeType,
    name,
    description: options.description || '',
    position,
    visualProperties: {
      color: options.visualProperties?.color || '#3b82f6',
      icon: options.visualProperties?.icon || '📊',
      size: options.visualProperties?.size || 'medium',
      style: options.visualProperties?.style || {},
      featureSpecific: options.visualProperties?.featureSpecific || {}
    },
    metadata: {
      tags: options.metadata?.tags || [],
      searchKeywords: options.metadata?.searchKeywords || [],
      crossFeatureLinks: options.metadata?.crossFeatureLinks || [],
      aiAgent: options.metadata?.aiAgent,
      vectorEmbedding: options.metadata?.vectorEmbedding
    },
    status: options.status || 'active'
  }
}

// Type guard for BaseNode validation
export function isValidBaseNode(node: any): node is BaseNode {
  return (
    typeof node === 'object' &&
    typeof node.id === 'string' &&
    ['function-model', 'knowledge-base', 'spindle'].includes(node.featureType) &&
    typeof node.nodeType === 'string' &&
    typeof node.name === 'string' &&
    typeof node.position === 'object' &&
    typeof node.position.x === 'number' &&
    typeof node.position.y === 'number' &&
    typeof node.visualProperties === 'object' &&
    typeof node.metadata === 'object' &&
    node.createdAt instanceof Date &&
    node.updatedAt instanceof Date &&
    ['active', 'inactive', 'draft', 'archived', 'error'].includes(node.status)
  )
}

// Utility functions for node operations
export function getNodeDisplayName(node: BaseNode): string {
  return node.name || `Unnamed ${node.nodeType}`
}

export function getNodeIcon(node: BaseNode): string {
  return node.visualProperties.icon || '📊'
}

export function getNodeColor(node: BaseNode): string {
  return node.visualProperties.color || '#3b82f6'
}

export function isNodeActive(node: BaseNode): boolean {
  return node.status === 'active'
}

export function canNodeExecute(node: BaseNode): boolean {
  return node.status === 'active' && !node.metadata.aiAgent?.isActive
}

export function getNodeTags(node: BaseNode): string[] {
  return node.metadata.tags || []
}

export function hasNodeLinks(node: BaseNode): boolean {
  return (node.metadata.crossFeatureLinks?.length || 0) > 0
} 