// Function Model Node Types
// This file defines the FunctionModelNode interface that extends BaseNode with function model specific properties

import { BaseNode, NodeMetadata, NodeRelationship } from './unified-node-types'

export interface FunctionModelNode extends BaseNode {
  type: 'function-model'
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainerNode'
  modelId: string
  
  // Preserve ALL existing data structures
  functionModelData: {
    stage?: Stage
    action?: ActionItem
    io?: DataPort
    container?: FunctionModelContainer
  }
  
  // Preserve complex business logic
  businessLogic: {
    sla?: number
    kpis?: string[]
    complexity?: 'simple' | 'moderate' | 'complex'
    estimatedDuration?: number
  }
  
  // Preserve process behavior
  processBehavior: {
    executionType: 'sequential' | 'parallel' | 'conditional'
    dependencies?: string[]
    triggers?: string[]
  }
  
  // Preserve React Flow specific data
  reactFlowData: {
    parentNode?: string
    extent?: 'parent' | [number, number, number, number]
    draggable?: boolean
    selectable?: boolean
    deletable?: boolean
    width?: number
    height?: number
  }
  
  // Preserve complex relationships
  relationships: NodeRelationship[]
}

// Preserve ALL existing complex types
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
  type: 'action' | 'action-group'
  linkedEntities?: NodeLinkedEntity[]
  modes?: {
    actions: { rows: any[] }
    dataChanges: { rows: any[] }
    boundaryCriteria: { rows: any[] }
  }
}

export interface DataPort {
  id: string
  name: string
  description: string
  mode: 'input' | 'output'
  masterData: string[]
  referenceData: string[]
  transactionData: string[]
}

export interface FunctionModelContainer {
  id: string
  name: string
  description: string
  childNodes: string[]
  containerType: 'process' | 'subprocess' | 'decision'
}

export interface RACIMatrix {
  inform: string[]
  consult: string[]
  accountable: string[]
  responsible: string[]
}

// Preserve complex relationship system
export interface NodeLinkedEntity {
  id: string
  type: 'knowledge-base' | 'event-storm' | 'spindle' | 'function-model'
  name: string
  description: string
  linkType: 'input' | 'output' | 'reference' | 'dependency'
  context?: Record<string, any>
}

// Preserve complex relationship system
export interface FunctionModelNodeRelationship extends NodeRelationship {
  id: string
  sourceNodeId: string
  targetNodeId: string
  sourceHandle: string
  targetHandle: string
  type: 'parent-child' | 'sibling'
  sourceNodeType: 'stageNode' | 'actionTableNode' | 'ioNode'
  targetNodeType: 'stageNode' | 'actionTableNode' | 'ioNode'
  createdAt: Date
}

// Validation types for node updates
export interface NodeUpdateValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Node creation options
export interface FunctionModelNodeOptions {
  description?: string
  businessLogic?: Partial<FunctionModelNode['businessLogic']>
  processBehavior?: Partial<FunctionModelNode['processBehavior']>
  reactFlowData?: Partial<FunctionModelNode['reactFlowData']>
  metadata?: Partial<NodeMetadata>
} 