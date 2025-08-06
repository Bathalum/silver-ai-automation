// Cross Feature Link Types
// This file defines the types for cross-feature linking between nodes

export interface CrossFeatureLink {
  linkId: string
  sourceNodeId: string
  targetNodeId: string
  sourceNodeType: string
  targetNodeType: string
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