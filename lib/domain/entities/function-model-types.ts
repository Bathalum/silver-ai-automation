// Enhanced Function Model Domain Entities for Persistence
// This file defines the core types for Function Model persistence with cross-feature linking

import type { CrossFeatureLink } from './cross-feature-link-types'
import type { VersionEntry, ChangeDescription, FunctionModelSnapshot } from './version-control-types'
import type { Node, Edge } from 'reactflow'

// NEW: Node-level linking types
export interface NodeLinkedEntity {
  entityId: string
  entityType: 'function-model' | 'knowledge-base' | 'spindle'
  linkType: 'documents' | 'implements' | 'references' | 'supports' | 'nested'
  linkContext: Record<string, any>
  linkId: string // Reference to cross_feature_links table
}

export interface FunctionModel {
  modelId: string
  name: string
  description: string
  version: string
  status: 'draft' | 'published' | 'archived'
  
  // Visual representation (React Flow data)
  nodesData: Node[]
  edgesData: Edge[]
  viewportData: Viewport
  
  // Function Model specific metadata
  processType?: string
  complexityLevel?: 'simple' | 'moderate' | 'complex'
  estimatedDuration?: number // in minutes
  tags: string[]
  
  // Relationships between nodes
  relationships: NodeRelationship[]
  
  // Persistence metadata
  metadata: FunctionModelMetadata
  permissions: FunctionModelPermissions
  
  // Version control
  versionHistory: VersionEntry[]
  currentVersion: string
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
  lastSavedAt: Date
}

// Function Model metadata for persistence
export interface FunctionModelMetadata {
  category: string
  dependencies: string[] // IDs of other function models
  references: string[] // IDs of referenced entities
  
  // Export settings
  exportSettings: {
    includeMetadata: boolean
    includeRelationships: boolean
    format: 'json' | 'xml' | 'yaml' | 'png' | 'svg'
    resolution: 'low' | 'medium' | 'high'
  }
  
  // Collaboration settings
  collaboration: {
    allowComments: boolean
    allowSuggestions: boolean
    requireApproval: boolean
    autoSave: boolean
    saveInterval: number // in seconds
  }
}

// Function Model permissions
export interface FunctionModelPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
  canExport: boolean
  canVersion: boolean
  canCollaborate: boolean
}

// React Flow specific data structures
export interface FunctionModelNode {
  id: string
  type: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
  position: { x: number; y: number }
  data: NodeData
  parentNode?: string
  extent?: 'parent' | [number, number, number, number]
  draggable?: boolean
  selectable?: boolean
  deletable?: boolean
  width?: number
  height?: number
  
  // NEW: Node-level linking data
  linkedEntities?: NodeLinkedEntity[]
}

export interface FunctionModelEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
  animated?: boolean
  style?: React.CSSProperties
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

// Node data interface
export interface NodeData {
  label: string
  type: 'stage' | 'action' | 'input' | 'output' | 'container'
  description?: string
  stageData?: Stage
  actionData?: ActionItem
  portData?: DataPort
  containerData?: FunctionModelContainer
}

// Function Model Container for grouping
export interface FunctionModelContainer {
  id: string
  name: string
  description: string
  type: 'sub-process' | 'module' | 'component'
  parentFunctionModelId?: string
  childFunctionModelIds?: string[]
  metadata?: Record<string, any>
}

// Legacy types for backward compatibility
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
  // NEW: Action-level linking
  linkedEntities?: NodeLinkedEntity[]
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

// Relationship tracking (for internal node relationships within a function model)
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

// UI and modal types
export type TabType = "details" | "knowledge-base" | "event-storm" | "spindle" | "function-model"

export interface ModalData {
  type: "function" | "stage" | "action" | "input" | "output"
  data: FunctionModel | Stage | ActionItem | DataPort
}

// Persistence operation types
export interface SaveOptions {
  autoVersion?: boolean
  changeSummary?: string
  includeMetadata?: boolean
  includeRelationships?: boolean
}

export interface LoadOptions {
  version?: string
  includeMetadata?: boolean
  includeRelationships?: boolean
}

export interface FunctionModelFilters {
  status?: 'draft' | 'published' | 'archived'
  processType?: string
  complexityLevel?: 'simple' | 'moderate' | 'complex'
  tags?: string[]
  category?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

// Factory functions for creating Function Model entities
export function createFunctionModel(
  name: string,
  description: string,
  options: Partial<FunctionModel> = {}
): Omit<FunctionModel, 'modelId' | 'createdAt' | 'updatedAt' | 'lastSavedAt'> {
  return {
    name,
    description,
    version: '1.0.0',
    status: 'draft',
    nodesData: [],
    edgesData: [],
    viewportData: { x: 0, y: 0, zoom: 1 },
    tags: [],
    metadata: {
      category: '',
      dependencies: [],
      references: [],
      exportSettings: {
        includeMetadata: true,
        includeRelationships: true,
        format: 'json',
        resolution: 'medium'
      },
      collaboration: {
        allowComments: true,
        allowSuggestions: true,
        requireApproval: false,
        autoSave: true,
        saveInterval: 30
      }
    },
    permissions: {
      canView: true,
      canEdit: true,
      canDelete: true,
      canShare: true,
      canExport: true,
      canVersion: true,
      canCollaborate: true
    },
    versionHistory: [],
    currentVersion: '1.0.0',
    ...options
  }
}

// Type guards for validation
export function isValidFunctionModel(model: any): model is FunctionModel {
  return (
    typeof model === 'object' &&
    typeof model.modelId === 'string' &&
    typeof model.name === 'string' &&
    typeof model.description === 'string' &&
    typeof model.version === 'string' &&
    ['draft', 'published', 'archived'].includes(model.status) &&
    Array.isArray(model.nodesData) &&
    Array.isArray(model.edgesData) &&
    typeof model.viewportData === 'object' &&
    Array.isArray(model.tags) &&
    typeof model.metadata === 'object' &&
    typeof model.permissions === 'object'
  )
}

// Re-export types for convenience
export type { CrossFeatureLink } from './cross-feature-link-types'
export type { VersionEntry, ChangeDescription, FunctionModelSnapshot } from './version-control-types' 