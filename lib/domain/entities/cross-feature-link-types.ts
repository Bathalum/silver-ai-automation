// Cross Feature Link Types
// This file defines the types for cross-feature linking between nodes

export interface CrossFeatureLink {
  linkId: string
  sourceNodeId: string
  targetNodeId: string
  sourceNodeType: string
  targetNodeType: string
  sourceFeature: string
  targetFeature: string
  sourceId: string
  targetId: string
  linkType: LinkType
  linkStrength: number
  linkContext: Record<string, any>
  visualProperties: {
    color?: string
    strokeWidth?: number
    strokeDasharray?: string
  }
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export type LinkType = 
  | 'documents' 
  | 'implements' 
  | 'references' 
  | 'supports' 
  | 'nested' 
  | 'triggers' 
  | 'consumes' 
  | 'produces'

export interface SearchResult {
  nodeId: string
  nodeType: string
  name: string
  description?: string
  featureType: string
}

export type FeatureType = 'function-model' | 'knowledge-base' | 'spindle' | 'event-storm'

export interface UniversalLinkContext {
  nodeId?: string
  targetNodeId?: string
  notes?: string
  priority?: 'high' | 'medium' | 'low'
  node?: {
    nodeId: string
    nodeType: string
  }
  [key: string]: any
}

export function getFeatureIcon(feature: FeatureType | string): string {
  switch (feature) {
    case 'function-model':
      return '📊'
    case 'knowledge-base':
      return '📚'
    case 'spindle':
      return '⚡'
    case 'event-storm':
      return '🌪️'
    default:
      return '🔗'
  }
}

export function getLinkIcon(linkType: LinkType | string): string {
  switch (linkType) {
    case 'documents':
      return '📄'
    case 'implements':
      return '⚙️'
    case 'references':
      return '🔗'
    case 'supports':
      return '🛠️'
    case 'nested':
      return '🔗'
    case 'triggers':
      return '⚡'
    case 'consumes':
      return '🍽️'
    case 'produces':
      return '📤'
    default:
      return '🔗'
  }
} 