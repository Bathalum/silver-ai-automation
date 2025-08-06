// Function Model Node Types
// This file defines the FunctionModelNode interface for the node-based architecture

import type { BaseNode } from './base-node-types'
import type { 
  Stage as StageValueObject, 
  ActionItem as ActionItemValueObject, 
  DataPort as DataPortValueObject, 
  RACIMatrix as RACIMatrixValueObject, 
  DataChange, 
  BoundaryCriteria,
  ExecutionType,
  RetryPolicy as RetryPolicyValueObject
} from '../value-objects/function-model-value-objects'

// FunctionModelNode extends BaseNode according to node-based architecture
export interface FunctionModelNode extends BaseNode {
  featureType: 'function-model'
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
  
  // Function Model specific properties
  functionModelData: {
    stage?: StageValueObject
    action?: ActionItemValueObject
    io?: DataPortValueObject
    container?: FunctionModelContainer
  }
  
  // Process-specific behavior
  processBehavior: {
    executionType: ExecutionType
    dependencies: string[] // IDs of dependent nodes
    timeout?: number
    retryPolicy?: RetryPolicyValueObject
  }
  
  // Business logic properties
  businessLogic: {
    raciMatrix?: RACIMatrixValueObject
    sla?: ServiceLevelAgreement
    kpis?: KeyPerformanceIndicator[]
  }
  
  // Relationships with other nodes (using nodeLinks for clarity)
  nodeLinks: FunctionModelNodeLink[]
}

// Preserve ALL existing complex types for backward compatibility
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

// Cross-feature linking system
export interface NodeLinkedEntity {
  id: string
  type: 'knowledge-base' | 'event-storm' | 'spindle' | 'function-model'
  name: string
  description: string
  linkType: 'documents' | 'implements' | 'references' | 'supports' | 'nested' | 'triggers' | 'consumes' | 'produces'
  context?: Record<string, any>
}

// Node relationship system (renamed from FunctionModelNodeRelationship for clarity)
export interface FunctionModelNodeLink {
  linkId: string // Maps to node_links.link_id
  sourceNodeId: string // Maps to node_links.source_node_id
  targetNodeId: string // Maps to node_links.target_node_id
  sourceHandle?: string // Maps to node_links.source_handle
  targetHandle?: string // Maps to node_links.target_handle
  linkType: 'parent-child' | 'sibling' | 'references' | 'implements' | 'documents' | 'supports' | 'nested'
  sourceNodeType: 'stageNode' | 'actionTableNode' | 'ioNode'
  targetNodeType: 'stageNode' | 'actionTableNode' | 'ioNode'
  linkStrength?: number // Maps to node_links.link_strength
  linkContext?: Record<string, any> // Maps to node_links.link_context
  createdAt: Date // Maps to node_links.created_at
  createdBy?: string // Maps to node_links.created_by
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
  metadata?: Partial<FunctionModelNode['metadata']>
}

// Additional types for business logic
export interface ServiceLevelAgreement {
  responseTime: number
  availability: number
  uptime: number
}

export interface KeyPerformanceIndicator {
  name: string
  target: number
  current: number
  unit: string
}

export interface RetryPolicy {
  maxRetries: number
  backoff: 'linear' | 'exponential' | 'constant'
  delay: number
} 