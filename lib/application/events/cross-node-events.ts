// Cross-Node Events
// This file contains application events for cross-node operations

export interface CrossNodeLinkCreatedEvent {
  linkId: string
  sourceNodeType: string
  sourceNodeId: string
  targetNodeType: string
  targetNodeId: string
  linkType: string
  createdBy: string
  createdAt: Date
}

export interface CrossNodeWorkflowExecutedEvent {
  workflowId: string
  sourceNodeType: string
  sourceNodeId: string
  targetNodeType: string
  targetNodeId: string
  executionResult: any
  executedBy: string
  executedAt: Date
  duration: number
  success: boolean
}

// Function Model specific cross-node events
export interface FunctionModelNodeLinkCreatedEvent extends CrossNodeLinkCreatedEvent {
  modelId: string
  featureType: 'function-model'
  sourceHandle?: string
  targetHandle?: string
  linkStrength?: number
  linkContext?: Record<string, any>
}

export interface FunctionModelCrossFeatureLinkCreatedEvent {
  linkId: string
  sourceFeature: string
  sourceId: string
  sourceNodeId?: string
  targetFeature: string
  targetId: string
  targetNodeId?: string
  linkType: string
  linkContext?: Record<string, any>
  createdBy: string
  createdAt: Date
}

export interface FunctionModelWorkflowExecutedEvent extends CrossNodeWorkflowExecutedEvent {
  modelId: string
  featureType: 'function-model'
  workflowType: 'node-execution' | 'cross-feature' | 'version-control'
  executionContext: {
    inputData?: any
    outputData?: any
    dependencies?: string[]
    crossFeatureLinks?: string[]
  }
}

export interface FunctionModelVersionCreatedEvent {
  modelId: string
  version: string
  versionData: any
  authorId: string
  createdAt: Date
  isPublished: boolean
  changes: string[]
}

export interface FunctionModelVersionRollbackEvent {
  modelId: string
  fromVersion: string
  toVersion: string
  rollbackBy: string
  rollbackAt: Date
  reason?: string
} 