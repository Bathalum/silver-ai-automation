// Node Lifecycle Events
// This file contains application events for node lifecycle changes

export interface NodeCreatedApplicationEvent {
  nodeId: string
  nodeType: string
  name: string
  createdBy: string
  createdAt: Date
  metadata: Record<string, any>
}

export interface NodeUpdatedApplicationEvent {
  nodeId: string
  nodeType: string
  changes: Record<string, any>
  updatedBy: string
  updatedAt: Date
}

export interface NodeDeletedApplicationEvent {
  nodeId: string
  nodeType: string
  deletedBy: string
  deletedAt: Date
}

export interface NodeExecutedApplicationEvent {
  nodeId: string
  nodeType: string
  executionResult: any
  executedBy: string
  executedAt: Date
  duration: number
  success: boolean
}

// Function Model specific events
export interface FunctionModelNodeCreatedEvent extends NodeCreatedApplicationEvent {
  modelId: string
  featureType: 'function-model'
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
  position: { x: number; y: number }
  processBehavior: {
    executionType: string
    dependencies: string[]
  }
  businessLogic: {
    raciMatrix?: any
    sla?: any
    kpis?: any[]
  }
}

export interface FunctionModelNodeUpdatedEvent extends NodeUpdatedApplicationEvent {
  modelId: string
  featureType: 'function-model'
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
  functionModelData?: {
    stage?: any
    action?: any
    io?: any
    container?: any
  }
}

export interface FunctionModelNodeDeletedEvent extends NodeDeletedApplicationEvent {
  modelId: string
  featureType: 'function-model'
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
}

export interface FunctionModelNodeExecutedEvent extends NodeExecutedApplicationEvent {
  modelId: string
  featureType: 'function-model'
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
  executionContext: {
    inputData?: any
    outputData?: any
    dependencies?: string[]
  }
} 