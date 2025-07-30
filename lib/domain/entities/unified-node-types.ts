// Unified Node Types for Node-Based Architecture
// This file defines the core types for the unified node system

export interface BaseNode {
  nodeId: string
  type: 'function-model' | 'event-storm' | 'spindle' | 'knowledge-base'
  nodeType: string
  name: string
  description: string
  position: { x: number; y: number }
  metadata: NodeMetadata
  createdAt: Date
  updatedAt: Date
}

export interface NodeMetadata {
  feature: string
  version: string
  tags: string[]
  aiAgent?: AIAgentConfig
  vectorEmbedding?: number[]
  graphProperties?: Record<string, any>
  // Feature-specific data
  functionModel?: FunctionModelData
  eventStorm?: EventStormData
  spindle?: SpindleData
  knowledgeBase?: KnowledgeBaseData
}

export interface AIAgentConfig {
  enabled: boolean
  instructions: string
  tools: AITool[]
  capabilities: {
    reasoning: boolean
    toolUse: boolean
    memory: boolean
    learning: boolean
  }
  metadata: {
    model: string
    temperature: number
    maxTokens: number
    contextWindow: number
  }
}

export interface AITool {
  name: string
  description: string
  parameters: Record<string, any>
  mcpServer?: string
}

export interface NodeRelationship {
  relationshipId: string
  sourceNodeId: string
  targetNodeId: string
  relationshipType: 'parent-child' | 'sibling' | 'reference' | 'dependency'
  metadata: {
    sourceHandle?: string
    targetHandle?: string
    strength: number
    bidirectional: boolean
  }
  createdAt: Date
}

// Feature-specific data interfaces
export interface FunctionModelData {
  stage?: Stage
  action?: ActionItem
  io?: DataPort
  container?: FunctionModelContainer
}

export interface EventStormData {
  domain?: Domain
  event?: Event
}

export interface SpindleData {
  label: string
  description?: string
}

export interface KnowledgeBaseData {
  sop?: SOP
  content: string
  category: string
  status: 'draft' | 'published' | 'archived'
}

// Import existing types for compatibility
import type { Stage, ActionItem, DataPort, FunctionModelContainer } from './function-model-types'
import type { Domain, Event } from './event-storm'
import type { SOP } from './knowledge-base-types'

// Node type constants for validation
export const NODE_TYPES = {
  FUNCTION_MODEL: {
    STAGE: 'stageNode',
    ACTION_TABLE: 'actionTableNode',
    IO: 'ioNode',
    CONTAINER: 'functionModelContainerNode'
  },
  EVENT_STORM: {
    DOMAIN: 'domainNode',
    EVENT: 'eventNode',
    CONTAINER: 'eventStormContainerNode'
  },
  SPINDLE: {
    INPUT: 'input',
    DEFAULT: 'default',
    OUTPUT: 'output',
    CUSTOM: 'custom'
  },
  KNOWLEDGE_BASE: {
    SOP: 'sop',
    CATEGORY: 'category',
    TEMPLATE: 'template'
  }
} as const

// Relationship type constants
export const RELATIONSHIP_TYPES = {
  PARENT_CHILD: 'parent-child',
  SIBLING: 'sibling',
  REFERENCE: 'reference',
  DEPENDENCY: 'dependency'
} as const

// Feature type constants
export const FEATURE_TYPES = {
  FUNCTION_MODEL: 'function-model',
  EVENT_STORM: 'event-storm',
  SPINDLE: 'spindle',
  KNOWLEDGE_BASE: 'knowledge-base'
} as const

// Utility types for type safety
export type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES][keyof typeof NODE_TYPES[keyof typeof NODE_TYPES]]
export type RelationshipType = typeof RELATIONSHIP_TYPES[keyof typeof RELATIONSHIP_TYPES]
export type FeatureType = typeof FEATURE_TYPES[keyof typeof FEATURE_TYPES]

// Type guards for runtime validation
export function isValidNodeType(type: string): type is NodeType {
  return Object.values(NODE_TYPES).some(featureTypes => 
    Object.values(featureTypes).includes(type as any)
  )
}

export function isValidRelationshipType(type: string): type is RelationshipType {
  return Object.values(RELATIONSHIP_TYPES).includes(type as any)
}

export function isValidFeatureType(type: string): type is FeatureType {
  return Object.values(FEATURE_TYPES).includes(type as any)
}

// Factory functions for creating nodes
export function createFunctionModelNode(
  nodeType: keyof typeof NODE_TYPES.FUNCTION_MODEL,
  name: string,
  description: string,
  position: { x: number; y: number },
  metadata: Partial<FunctionModelData> = {}
): Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'> {
  return {
    type: FEATURE_TYPES.FUNCTION_MODEL,
    nodeType: NODE_TYPES.FUNCTION_MODEL[nodeType],
    name,
    description,
    position,
    metadata: {
      feature: FEATURE_TYPES.FUNCTION_MODEL,
      version: '1.0',
      tags: [nodeType],
      functionModel: metadata
    }
  }
}

export function createEventStormNode(
  nodeType: keyof typeof NODE_TYPES.EVENT_STORM,
  name: string,
  description: string,
  position: { x: number; y: number },
  metadata: Partial<EventStormData> = {}
): Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'> {
  return {
    type: FEATURE_TYPES.EVENT_STORM,
    nodeType: NODE_TYPES.EVENT_STORM[nodeType],
    name,
    description,
    position,
    metadata: {
      feature: FEATURE_TYPES.EVENT_STORM,
      version: '1.0',
      tags: [nodeType],
      eventStorm: metadata
    }
  }
}

export function createSpindleNode(
  nodeType: keyof typeof NODE_TYPES.SPINDLE,
  name: string,
  description: string,
  position: { x: number; y: number },
  metadata: Partial<SpindleData> = {}
): Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'> {
  return {
    type: FEATURE_TYPES.SPINDLE,
    nodeType: NODE_TYPES.SPINDLE[nodeType],
    name,
    description,
    position,
    metadata: {
      feature: FEATURE_TYPES.SPINDLE,
      version: '1.0',
      tags: [nodeType],
      spindle: metadata as SpindleData
    }
  }
}

export function createKnowledgeBaseNode(
  nodeType: keyof typeof NODE_TYPES.KNOWLEDGE_BASE,
  name: string,
  description: string,
  position: { x: number; y: number },
  metadata: Partial<KnowledgeBaseData> = {}
): Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'> {
  return {
    type: FEATURE_TYPES.KNOWLEDGE_BASE,
    nodeType: NODE_TYPES.KNOWLEDGE_BASE[nodeType],
    name,
    description,
    position,
    metadata: {
      feature: FEATURE_TYPES.KNOWLEDGE_BASE,
      version: '1.0',
      tags: [nodeType],
      knowledgeBase: metadata as KnowledgeBaseData
    }
  }
}

// Conversion function from unified node to SOP
export function unifiedNodeToSOP(node: BaseNode): SOP {
  if (node.type !== 'knowledge-base') {
    throw new Error('Node is not a knowledge base item')
  }
  
  const knowledgeBaseData = node.metadata.knowledgeBase
  if (!knowledgeBaseData?.sop) {
    throw new Error('SOP data not found')
  }
  
  return {
    ...knowledgeBaseData.sop,
    id: node.nodeId,
    title: node.name,
    summary: node.description,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt
  }
} 