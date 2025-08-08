// Version Control Types - Domain Layer
// This file defines the core domain entities for version control functionality

import { FunctionModelNode } from './function-model-node-types'
import { Edge } from 'reactflow'

export interface VersionEntry {
  id: string
  modelId: string
  version: string
  nodes: Array<{
    nodeId: string
    data: FunctionModelNode
    timestamp: Date
  }>
  edges: Array<{
    edgeId: string
    data: Edge
    timestamp: Date
  }>
  changeSummary: string
  createdAt: Date
  createdBy?: string
}

export interface VersionMetadata {
  totalNodes: number
  totalEdges: number
  nodeTypes: Record<string, number>
  executionTypes: Record<string, number>
  complexity: 'simple' | 'moderate' | 'complex'
  estimatedDuration: number
}

export interface VersionComparisonResult {
  addedNodes: FunctionModelNode[]
  removedNodes: FunctionModelNode[]
  modifiedNodes: Array<{ old: FunctionModelNode; new: FunctionModelNode }>
  addedEdges: Edge[]
  removedEdges: Edge[]
}

export interface VersionRestorationResult {
  success: boolean
  restoredNodes: number
  restoredEdges: number
  warnings: string[]
  errors: string[]
}

export interface VersionValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
} 