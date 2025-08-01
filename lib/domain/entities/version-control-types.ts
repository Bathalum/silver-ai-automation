// Version Control Domain Entities
// This file defines the core types for Function Model version control

export interface VersionEntry {
  version: string
  timestamp: Date
  author: string
  changes: ChangeDescription[]
  snapshot: FunctionModelSnapshot
  isPublished: boolean
}

export interface ChangeDescription {
  type: ChangeType
  targetId: string
  description: string
  timestamp: Date
  metadata?: Record<string, any>
}

export type ChangeType = 
  | 'node-added' 
  | 'node-removed' 
  | 'node-modified' 
  | 'edge-added' 
  | 'edge-removed' 
  | 'edge-modified' 
  | 'metadata-changed'
  | 'viewport-changed'
  | 'permissions-changed'

export interface FunctionModelSnapshot {
  modelId: string
  version: string
  nodesData: any[]
  edgesData: any[]
  viewportData: any
  metadata: any
  // Additional fields for complete model reconstruction
  name?: string
  description?: string
  status?: string
  processType?: string
  complexityLevel?: string
  estimatedDuration?: number
  tags?: string[]
  permissions?: any
  relationships?: any[]
  createdAt?: Date
  updatedAt?: Date
  lastSavedAt?: Date
  timestamp: Date
}

export interface VersionMetadata {
  changeSummary: string
  tags: string[]
  isMajorVersion: boolean
  breakingChanges: boolean
  authorNotes?: string
}

export interface VersionFilters {
  author?: string
  dateRange?: {
    start: Date
    end: Date
  }
  isPublished?: boolean
  hasBreakingChanges?: boolean
  tags?: string[]
}

export interface VersionComparison {
  fromVersion: string
  toVersion: string
  changes: ChangeDescription[]
  addedNodes: string[]
  removedNodes: string[]
  modifiedNodes: string[]
  addedEdges: string[]
  removedEdges: string[]
  modifiedEdges: string[]
  metadataChanges: Record<string, any>
}

// Version control operations
export interface VersionControlOptions {
  autoVersion?: boolean
  changeSummary?: string
  isMajorVersion?: boolean
  breakingChanges?: boolean
  tags?: string[]
  authorNotes?: string
}

export interface PublishOptions {
  version: string
  publishNotes?: string
  notifyCollaborators?: boolean
  createRelease?: boolean
}

// Factory functions
export function createVersionEntry(
  version: string,
  author: string,
  changes: ChangeDescription[],
  snapshot: FunctionModelSnapshot,
  options: Partial<VersionEntry> = {}
): Omit<VersionEntry, 'timestamp'> {
  return {
    version,
    author,
    changes,
    snapshot,
    isPublished: false,
    ...options
  }
}

export function createChangeDescription(
  type: ChangeType,
  targetId: string,
  description: string,
  metadata?: Record<string, any>
): Omit<ChangeDescription, 'timestamp'> {
  return {
    type,
    targetId,
    description,
    metadata
  }
}

export function createFunctionModelSnapshot(
  modelId: string,
  version: string,
  nodesData: any[],
  edgesData: any[],
  viewportData: any,
  metadata: any,
  // Add additional model fields for complete reconstruction
  name?: string,
  description?: string,
  status?: string,
  processType?: string,
  complexityLevel?: string,
  estimatedDuration?: number,
  tags?: string[],
  permissions?: any,
  relationships?: any[],
  createdAt?: Date,
  updatedAt?: Date,
  lastSavedAt?: Date
): Omit<FunctionModelSnapshot, 'timestamp'> {
  return {
    modelId,
    version,
    nodesData,
    edgesData,
    viewportData,
    metadata,
    // Include additional fields for complete model reconstruction
    name,
    description,
    status,
    processType,
    complexityLevel,
    estimatedDuration,
    tags,
    permissions,
    relationships,
    createdAt,
    updatedAt,
    lastSavedAt
  }
}

// Version management utilities
export function incrementVersion(currentVersion: string, isMajor: boolean = false): string {
  const [major, minor, patch] = currentVersion.split('.').map(Number)
  
  if (isMajor) {
    return `${major + 1}.0.0`
  } else {
    return `${major}.${minor + 1}.0`
  }
}

export function compareVersions(version1: string, version2: string): number {
  const v1 = version1.split('.').map(Number)
  const v2 = version2.split('.').map(Number)
  
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0
    const num2 = v2[i] || 0
    
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  
  return 0
}

export function isValidVersion(version: string): boolean {
  const versionRegex = /^\d+\.\d+\.\d+$/
  return versionRegex.test(version)
}

export function getVersionType(version: string): 'major' | 'minor' | 'patch' {
  const [major, minor, patch] = version.split('.').map(Number)
  
  if (patch > 0) return 'patch'
  if (minor > 0) return 'minor'
  return 'major'
}

// Type guards
export function isValidChangeType(type: string): type is ChangeType {
  return [
    'node-added',
    'node-removed',
    'node-modified',
    'edge-added',
    'edge-removed',
    'edge-modified',
    'metadata-changed',
    'viewport-changed',
    'permissions-changed'
  ].includes(type)
}

export function isValidVersionEntry(entry: any): entry is VersionEntry {
  return (
    typeof entry === 'object' &&
    typeof entry.version === 'string' &&
    entry.timestamp instanceof Date &&
    typeof entry.author === 'string' &&
    Array.isArray(entry.changes) &&
    typeof entry.snapshot === 'object' &&
    typeof entry.isPublished === 'boolean'
  )
}

export function isValidChangeDescription(change: any): change is ChangeDescription {
  return (
    typeof change === 'object' &&
    isValidChangeType(change.type) &&
    typeof change.targetId === 'string' &&
    typeof change.description === 'string' &&
    change.timestamp instanceof Date
  )
}

// Utility functions
export function getChangeTypeDescription(type: ChangeType): string {
  const descriptions = {
    'node-added': 'Node Added',
    'node-removed': 'Node Removed',
    'node-modified': 'Node Modified',
    'edge-added': 'Connection Added',
    'edge-removed': 'Connection Removed',
    'edge-modified': 'Connection Modified',
    'metadata-changed': 'Metadata Changed',
    'viewport-changed': 'Viewport Changed',
    'permissions-changed': 'Permissions Changed'
  }
  return descriptions[type]
}

export function getChangeTypeIcon(type: ChangeType): string {
  const icons = {
    'node-added': '➕',
    'node-removed': '➖',
    'node-modified': '✏️',
    'edge-added': '🔗',
    'edge-removed': '🔗',
    'edge-modified': '🔗',
    'metadata-changed': '📝',
    'viewport-changed': '🔍',
    'permissions-changed': '🔐'
  }
  return icons[type]
}

export function getChangeTypeColor(type: ChangeType): string {
  const colors = {
    'node-added': 'green',
    'node-removed': 'red',
    'node-modified': 'blue',
    'edge-added': 'green',
    'edge-removed': 'red',
    'edge-modified': 'blue',
    'metadata-changed': 'yellow',
    'viewport-changed': 'gray',
    'permissions-changed': 'orange'
  }
  return colors[type]
} 