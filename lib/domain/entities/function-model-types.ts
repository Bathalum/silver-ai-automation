export interface FunctionModel {
  id: string
  name: string
  description: string
  input: DataPort
  output: DataPort
  stages: Stage[]
  relationships?: NodeRelationship[]
  // New: React Flow specific properties
  reactFlowData?: ReactFlowData
  metadata?: FunctionModelMetadata
}

// New: React Flow specific data structure
export interface ReactFlowData {
  nodes: ReactFlowNode[]
  edges: ReactFlowEdge[]
  viewport: { x: number; y: number; zoom: number }
}

// New: React Flow node with parent-child support
export interface ReactFlowNode {
  id: string
  type: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
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

// New: React Flow edge
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

// New: Node data interface
export interface NodeData {
  label: string
  type: 'stage' | 'action' | 'input' | 'output' | 'container'
  description?: string
  stageData?: Stage
  actionData?: ActionItem
  portData?: DataPort
  containerData?: FunctionModelContainer
}

// New: Function Model Container for grouping
export interface FunctionModelContainer {
  id: string
  name: string
  description: string
  type: 'sub-process' | 'module' | 'component'
  parentFunctionModelId?: string // For linking to other function models
  childFunctionModelIds?: string[] // For containing other function models
  metadata?: Record<string, any>
}

// New: Function Model metadata for persistence and linking
export interface FunctionModelMetadata {
  createdAt: Date
  updatedAt: Date
  version: string
  tags: string[]
  category?: string
  dependencies?: string[] // IDs of other function models this depends on
  references?: string[] // IDs of other function models that reference this
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

export interface DataPort {
  id: string
  name: string
  description: string
  mode?: "input" | "output"
  masterData: string[]
  referenceData: string[]
  transactionData: string[]
}

export interface Stage {
  id: string
  name: string
  description: string
  position: { x: number; y: number }
  actions: string[]
  dataChange: string[]
  boundaryCriteria: string[]
  raci: RACIMatrix
}

export interface ActionItem {
  id: string
  name: string
  description: string
  type: "action" | "action-group"
}

export interface RACIMatrix {
  inform: string[]
  consult: string[]
  accountable: string[]
  responsible: string[]
}

export interface BoundFilter {
  id: string
  fromStage: string
  toStage: string
  criteria: string[]
}

// Relationship tracking
export interface NodeRelationship {
  id: string
  sourceNodeId: string
  targetNodeId: string
  sourceHandle: string
  targetHandle: string
  type: "parent-child" | "sibling"
  sourceNodeType: "stageNode" | "actionTableNode" | "ioNode"
  targetNodeType: "stageNode" | "actionTableNode" | "ioNode"
  createdAt: Date
}

export type TabType = "details" | "knowledge-base" | "event-storm" | "spindle" | "function-model"

export interface ModalData {
  type: "function" | "stage" | "action" | "input" | "output"
  data: FunctionModel | Stage | ActionItem | DataPort
} 