// This file defines the node behavior abstraction system for the node-based architecture
// Provides interfaces and types for node execution, validation, and behavior management

export interface ExecutionContext {
  nodeId: string
  featureType: string
  entityId: string
  userId?: string
  sessionId?: string
  timestamp: Date
  parameters?: Record<string, any>
  environment?: 'development' | 'staging' | 'production'
}

export interface ExecutionResult {
  success: boolean
  output?: any
  error?: string
  executionTime: number
  metadata?: Record<string, any>
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata?: Record<string, any>
}

export interface NodeBehavior {
  execute(context: ExecutionContext): Promise<ExecutionResult>
  validate(context: ExecutionContext): Promise<ValidationResult>
  getBehaviorType(): string
  getBehaviorConfig(): Record<string, any>
}

// Function Model specific behavior interfaces
export interface ProcessNodeBehavior extends NodeBehavior {
  execute(): Promise<ExecutionResult>
  rollback(): Promise<void>
  getExecutionPath(): string[]
  getDependencies(): string[]
  getOutputs(): any[]
  validate(): ValidationResult
}

export interface ContentNodeBehavior extends NodeBehavior {
  render(): string
  search(query: string): SearchResult[]
  version(): VersionInfo
}

export interface IntegrationNodeBehavior extends NodeBehavior {
  connect(): Promise<ConnectionResult>
  transform(data: any): Promise<any>
  handleError(error: Error): Promise<ErrorHandlingResult>
}

export interface DomainNodeBehavior extends NodeBehavior {
  handleCommand(command: any): Promise<Event[]>
  applyEvent(event: any): void
  getState(): any
}

// Additional interfaces for function model behavior
export interface SearchResult {
  nodeId: string
  relevance: number
  content: string
  metadata: Record<string, any>
}

export interface VersionInfo {
  version: string
  createdAt: Date
  createdBy: string
  changes: string[]
}

export interface ConnectionResult {
  success: boolean
  connectionId?: string
  error?: string
  metadata?: Record<string, any>
}

export interface ErrorHandlingResult {
  handled: boolean
  retryCount: number
  nextRetry?: Date
  error: Error
}

export interface NodeBehaviorFactory {
  createBehavior(nodeType: string, config?: Record<string, any>): NodeBehavior
  getSupportedBehaviors(): string[]
}

export interface BehaviorRegistry {
  register(behaviorType: string, behaviorClass: new (config?: Record<string, any>) => NodeBehavior): void
  get(behaviorType: string): NodeBehavior | null
  list(): string[]
}

export interface ExecutionOptions {
  validateBeforeExecute?: boolean
  timeout?: number
  retryOnFailure?: boolean
  maxRetries?: number
  logExecution?: boolean
}

export interface BehaviorConfig {
  type: string
  parameters?: Record<string, any>
  validation?: {
    required?: string[]
    optional?: string[]
    rules?: Record<string, any>
  }
  execution?: {
    timeout?: number
    retryPolicy?: {
      maxRetries: number
      backoffMultiplier: number
      initialDelay: number
    }
  }
}

// Factory for creating appropriate behavior based on node type
export class NodeBehaviorFactory {
  static createBehavior(node: any): NodeBehavior {
    switch (node.featureType) {
      case 'function-model':
        return new ProcessNodeBehavior(node)
      case 'knowledge-base':
        return new ContentNodeBehavior(node)
      case 'spindle':
        return new IntegrationNodeBehavior(node)
      case 'event-storm':
        return new DomainNodeBehavior(node)
      default:
        throw new Error(`Unknown feature type: ${node.featureType}`)
    }
  }
} 