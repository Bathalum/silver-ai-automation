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