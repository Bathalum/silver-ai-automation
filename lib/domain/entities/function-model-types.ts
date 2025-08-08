// Function Model Types
// This file defines the FunctionModel interface that represents actual function models

export interface FunctionModel {
  modelId: string
  name: string
  description?: string
  version: string
  status: 'draft' | 'published' | 'archived'
  currentVersion: string
  versionCount: number
  lastSavedAt: Date
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  deletedBy?: string
  aiAgentConfig?: Record<string, any>
  metadata?: Record<string, any>
  permissions?: Record<string, any>
}

export interface FunctionModelCreateOptions {
  name: string
  description?: string
  version?: string
  status?: 'draft' | 'published' | 'archived'
  aiAgentConfig?: Record<string, any>
  metadata?: Record<string, any>
  permissions?: Record<string, any>
}

export interface FunctionModelUpdateOptions {
  name?: string
  description?: string
  version?: string
  status?: 'draft' | 'published' | 'archived'
  currentVersion?: string
  aiAgentConfig?: Record<string, any>
  metadata?: Record<string, any>
  permissions?: Record<string, any>
}

// Edge-related interfaces for Domain layer
export interface FunctionModelEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
  metadata?: Record<string, any>
}

export interface EdgeRepository {
  getEdgesForModel(modelId: string): Promise<FunctionModelEdge[]>
  saveEdgesForModel(modelId: string, edges: FunctionModelEdge[]): Promise<void>
  deleteEdge(edgeId: string): Promise<void>
  updateEdge(edgeId: string, updates: Partial<FunctionModelEdge>): Promise<void>
} 