// Visual Properties
// This file contains standardized visual properties for all node types

export interface VisualProperties {
  color?: string
  icon?: string
  size?: 'small' | 'medium' | 'large'
  style?: Record<string, any>
  featureSpecific?: Record<string, any>
}

export interface NodeVisualProperties {
  color?: string
  size?: number
  shape?: 'circle' | 'square' | 'diamond' | 'triangle'
  borderColor?: string
  borderWidth?: number
  opacity?: number
  label?: string
  icon?: string
}

// Function Model specific visual properties
export interface FunctionModelVisualProperties extends VisualProperties {
  featureSpecific?: {
    stageColor?: string
    actionColor?: string
    ioColor?: string
    containerColor?: string
    executionType?: 'sequential' | 'parallel' | 'conditional'
    status?: 'active' | 'inactive' | 'draft' | 'archived' | 'error'
  }
}

// Knowledge Base specific visual properties
export interface KnowledgeBaseVisualProperties extends VisualProperties {
  featureSpecific?: {
    contentType?: 'procedure' | 'guideline' | 'template' | 'reference'
    status?: 'draft' | 'published' | 'archived'
    complexity?: 'simple' | 'moderate' | 'complex'
  }
}

// Spindle specific visual properties
export interface SpindleVisualProperties extends VisualProperties {
  featureSpecific?: {
    integrationType?: 'api' | 'webhook' | 'database' | 'file' | 'custom'
    executionMode?: 'synchronous' | 'asynchronous' | 'batch'
    status?: 'active' | 'inactive' | 'error'
  }
}

// Event Storm specific visual properties
export interface EventStormVisualProperties extends VisualProperties {
  featureSpecific?: {
    eventType?: 'command' | 'event' | 'query'
    boundedContext?: string
    aggregateRoot?: string
  }
} 