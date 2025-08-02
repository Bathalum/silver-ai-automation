// Cross-Feature Link Domain Entities
// This file defines the core types for cross-feature linking between Function Model, Knowledge Base, and Spindle

export interface CrossFeatureLink {
  linkId: string
  sourceFeature: FeatureType
  sourceId: string
  targetFeature: FeatureType
  targetId: string
  linkType: LinkType
  linkContext: Record<string, any>
  linkStrength: number
  createdAt: Date
  createdBy?: string
}

export type FeatureType = 'function-model' | 'knowledge-base' | 'spindle'

export type LinkType = 'documents' | 'implements' | 'references' | 'supports' | 'nested'

// Enhanced link context for universal modal
export interface UniversalLinkContext {
  // Global linking
  global?: {
    sourceFeature: FeatureType
    sourceId: string
  }
  
  // Node-level linking
  node?: {
    nodeId: string
    nodeType: 'stageNode' | 'actionTableNode' | 'ioNode'
    position: { x: number; y: number }
    viewport: { x: number; y: number; zoom: number }
  }
  
  // Action-level linking
  action?: {
    actionId: string
    actionType: string
    nodeId: string
  }
  
  // General metadata
  notes?: string
  tags?: string[]
  priority?: 'low' | 'medium' | 'high'
}

// Link context types for different link types
export interface DocumentLinkContext {
  section?: string
  relevance?: 'high' | 'medium' | 'low'
  notes?: string
}

export interface ImplementationLinkContext {
  implementationType?: 'full' | 'partial' | 'planned'
  coverage?: number // percentage
  notes?: string
}

export interface ReferenceLinkContext {
  referenceType?: 'inspiration' | 'dependency' | 'similar'
  notes?: string
}

export interface SupportLinkContext {
  supportType?: 'prerequisite' | 'enabler' | 'constraint'
  impact?: 'high' | 'medium' | 'low'
  notes?: string
}

// NEW: Node-specific link context
export interface NodeLinkContext {
  nodeId: string
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode'
  actionId?: string // For action table nodes
  position: { x: number; y: number }
  viewport: { x: number; y: number; zoom: number }
}

// Link metadata for analytics and management
export interface LinkMetadata {
  lastAccessed?: Date
  accessCount: number
  userRating?: number
  isActive: boolean
  tags: string[]
}

// Link filters for querying
export interface CrossFeatureLinkFilters {
  sourceFeature?: FeatureType
  targetFeature?: FeatureType
  linkType?: LinkType
  linkStrength?: {
    min: number
    max: number
  }
  dateRange?: {
    start: Date
    end: Date
  }
  tags?: string[]
  isActive?: boolean
}

// Link analytics
export interface LinkAnalytics {
  totalLinks: number
  linksByType: Record<LinkType, number>
  linksByFeature: Record<FeatureType, number>
  averageStrength: number
  mostActiveLinks: CrossFeatureLink[]
  linkTrends: {
    period: string
    newLinks: number
    removedLinks: number
  }[]
}

// Factory functions
export function createCrossFeatureLink(
  sourceFeature: FeatureType,
  sourceId: string,
  targetFeature: FeatureType,
  targetId: string,
  linkType: LinkType,
  context?: Record<string, any>
): Omit<CrossFeatureLink, 'linkId' | 'createdAt'> {
  return {
    sourceFeature,
    sourceId,
    targetFeature,
    targetId,
    linkType,
    linkContext: context || {},
    linkStrength: 1.0
  }
}

export function createDocumentLink(
  sourceId: string,
  targetId: string,
  context?: DocumentLinkContext
): Omit<CrossFeatureLink, 'linkId' | 'createdAt'> {
  return createCrossFeatureLink(
    'function-model',
    sourceId,
    'knowledge-base',
    targetId,
    'documents',
    context
  )
}

export function createImplementationLink(
  sourceId: string,
  targetId: string,
  context?: ImplementationLinkContext
): Omit<CrossFeatureLink, 'linkId' | 'createdAt'> {
  return createCrossFeatureLink(
    'function-model',
    sourceId,
    'spindle',
    targetId,
    'implements',
    context
  )
}

export function createReferenceLink(
  sourceId: string,
  targetId: string,
  context?: ReferenceLinkContext
): Omit<CrossFeatureLink, 'linkId' | 'createdAt'> {
  return createCrossFeatureLink(
    'function-model',
    sourceId,
    'function-model',
    targetId,
    'references',
    context
  )
}

export function createSupportLink(
  sourceId: string,
  targetId: string,
  context?: SupportLinkContext
): Omit<CrossFeatureLink, 'linkId' | 'createdAt'> {
  return createCrossFeatureLink(
    'function-model',
    sourceId,
    'knowledge-base',
    targetId,
    'supports',
    context
  )
}

// Type guards
export function isValidFeatureType(type: string): type is FeatureType {
  return ['function-model', 'knowledge-base', 'spindle'].includes(type)
}

export function isValidLinkType(type: string): type is LinkType {
  return ['documents', 'implements', 'references', 'supports', 'nested'].includes(type)
}

export function isValidCrossFeatureLink(link: any): link is CrossFeatureLink {
  return (
    typeof link === 'object' &&
    typeof link.linkId === 'string' &&
    isValidFeatureType(link.sourceFeature) &&
    typeof link.sourceId === 'string' &&
    isValidFeatureType(link.targetFeature) &&
    typeof link.targetId === 'string' &&
    isValidLinkType(link.linkType) &&
    typeof link.linkContext === 'object' &&
    typeof link.linkStrength === 'number' &&
    link.createdAt instanceof Date
  )
}

// Utility functions
export function getLinkDescription(link: CrossFeatureLink): string {
  const descriptions = {
    documents: 'Documents',
    implements: 'Implements',
    references: 'References',
    supports: 'Supports',
    nested: 'Nested'
  }
  return `${descriptions[link.linkType]} ${link.targetFeature}`
}

export function getLinkIcon(linkType: LinkType): string {
  const icons = {
    documents: '📄',
    implements: '⚙️',
    references: '🔗',
    supports: '🛠️',
    nested: '🔗'
  }
  return icons[linkType]
}

export function getLinkColor(linkType: LinkType): string {
  const colors = {
    documents: 'blue',
    implements: 'green',
    references: 'purple',
    supports: 'orange',
    nested: 'indigo'
  }
  return colors[linkType]
}

// Utility function to get feature icon
export function getFeatureIcon(featureType: FeatureType): string {
  const icons = {
    'function-model': '📊',
    'knowledge-base': '📚',
    'spindle': '⚡'
  }
  return icons[featureType]
} 