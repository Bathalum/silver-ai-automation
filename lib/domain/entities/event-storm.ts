export interface EventStorm {
  id: string
  name: string
  description: string
  domains: Domain[]
  relationships?: NodeRelationship[]
  // React Flow specific properties
  reactFlowData?: ReactFlowData
  metadata?: EventStormMetadata
}

// React Flow specific data structure
export interface ReactFlowData {
  nodes: ReactFlowNode[]
  edges: ReactFlowEdge[]
  viewport: { x: number; y: number; zoom: number }
}

// React Flow node with parent-child support
export interface ReactFlowNode {
  id: string
  type: 'domainNode' | 'eventNode'
  position: { x: number; y: number }
  data: NodeData
  parentNode?: string // React Flow's native parent-child
  extent?: 'parent' | [number, number, number, number] // For parent containment
  draggable?: boolean
  selectable?: boolean
  deletable?: boolean
  width?: number
  height?: number
}

// React Flow edge
export interface ReactFlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
  animated?: boolean
  style?: React.CSSProperties
}

// Node data interface
export interface NodeData {
  label: string
  type: 'domain' | 'event'
  description?: string
  domainData?: Domain
  eventData?: Event
}

// Event Storm metadata for persistence and linking
export interface EventStormMetadata {
  createdAt: Date
  updatedAt: Date
  version: string
  tags: string[]
  category?: string
  dependencies?: string[] // IDs of other event storms this depends on
  references?: string[] // IDs of other event storms that reference this
  permissions?: {
    canEdit: boolean
    canDelete: boolean
    canShare: boolean
    canExport: boolean
  }
  exportSettings?: {
    includeMetadata: boolean
    includeRelationships: boolean
    format: 'json' | 'xml' | 'yaml'
  }
}

export interface Domain {
  id: string
  name: string
  description: string
  position: { x: number; y: number }
  events: string[] // Array of event IDs that belong to this domain
  siblings: string[] // Array of sibling domain IDs
  metadata?: Record<string, any> // JSON object for additional data
}

export interface Event {
  id: string
  name: string
  description: string
  position: { x: number; y: number }
  parentDomainId: string // ID of the parent domain
  siblings: string[] // Array of sibling event IDs within the same domain
  metadata?: Record<string, any> // JSON object for additional data
}

// Relationship tracking
export interface NodeRelationship {
  id: string
  sourceNodeId: string
  targetNodeId: string
  sourceHandle: string
  targetHandle: string
  type: "parent-child" | "sibling"
  sourceNodeType: "domainNode" | "eventNode"
  targetNodeType: "domainNode" | "eventNode"
  createdAt: Date
}

// Legacy types for backward compatibility
export type NodeType =
  | "event"
  | "action"
  | "ztp"
  | "tool"
  | "function"
  | "input"
  | "output"
  | "command"
  | "aggregate"
  | "externalSystem"
  | "readModel"
  | "policy"
  | "ui"

export interface LegacyNodeData {
  label: string
  type: NodeType
  description?: string
}

export interface CustomNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: LegacyNodeData
}

export interface EventStormBoard {
  id: string
  name: string
  nodes: CustomNode[]
  edges: any[]
  createdAt: Date
  updatedAt: Date
}
