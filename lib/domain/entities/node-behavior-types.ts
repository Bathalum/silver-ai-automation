// Node Behavior Types
// This file defines the node behavior abstraction system for the unified node-based architecture

import type { BaseNode } from './base-node-types'
import type { FunctionModelNode } from './function-model-node-types'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface ExecutionResult {
  success: boolean
  output: any
  error?: string
  executionTime: number
  metadata: Record<string, any>
}

export interface NodeBehavior {
  canExecute(): boolean
  getDependencies(): string[]
  getOutputs(): any[]
  validate(): ValidationResult
}

export interface ProcessNodeBehavior extends NodeBehavior {
  execute(): Promise<ExecutionResult>
  rollback(): Promise<void>
  getExecutionPath(): string[]
}

export interface ContentNodeBehavior extends NodeBehavior {
  getContent(): string
  updateContent(content: string): Promise<void>
  getContentType(): string
  getContentSize(): number
}

export interface IntegrationNodeBehavior extends NodeBehavior {
  connect(): Promise<boolean>
  disconnect(): Promise<void>
  getConnectionStatus(): 'connected' | 'disconnected' | 'error'
  sendMessage(message: any): Promise<void>
}

// Base behavior implementation
export abstract class BaseNodeBehavior implements NodeBehavior {
  protected node: BaseNode

  constructor(node: BaseNode) {
    this.node = node
  }

  canExecute(): boolean {
    return this.node.status === 'active'
  }

  getDependencies(): string[] {
    return []
  }

  getOutputs(): any[] {
    return []
  }

  validate(): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!this.node.name.trim()) {
      errors.push('Node name is required')
    }

    if (this.node.position.x < 0 || this.node.position.y < 0) {
      warnings.push('Node position should be positive')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}

// Function Model Node Behavior
export class FunctionModelNodeBehavior extends BaseNodeBehavior implements ProcessNodeBehavior {
  private functionModelNode: FunctionModelNode

  constructor(node: FunctionModelNode) {
    super(node)
    this.functionModelNode = node
  }

  async execute(): Promise<ExecutionResult> {
    const startTime = Date.now()
    
    try {
      // Validate before execution
      const validation = this.validate()
      if (!validation.isValid) {
        return {
          success: false,
          output: null,
          error: validation.errors.join(', '),
          executionTime: Date.now() - startTime,
          metadata: { validationErrors: validation.errors }
        }
      }

      // Check dependencies
      const dependencies = this.getDependencies()
      if (dependencies.length > 0) {
        // TODO: Implement dependency resolution
        console.log('Dependencies to resolve:', dependencies)
      }

      // Execute based on node type
      let output: any
      switch (this.functionModelNode.nodeType) {
        case 'stageNode':
          output = await this.executeStageNode()
          break
        case 'actionTableNode':
          output = await this.executeActionTableNode()
          break
        case 'ioNode':
          output = await this.executeIONode()
          break
        case 'functionModelContainer':
          output = await this.executeContainerNode()
          break
        default:
          throw new Error(`Unknown node type: ${this.functionModelNode.nodeType}`)
      }

      return {
        success: true,
        output,
        executionTime: Date.now() - startTime,
        metadata: {
          nodeType: this.functionModelNode.nodeType,
          executionType: this.functionModelNode.processBehavior.executionType
        }
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        metadata: { nodeType: this.functionModelNode.nodeType }
      }
    }
  }

  async rollback(): Promise<void> {
    // TODO: Implement rollback logic
    console.log('Rolling back function model node:', this.functionModelNode.id)
  }

  getExecutionPath(): string[] {
    const path: string[] = []
    
    // Add current node
    path.push(this.functionModelNode.id)
    
    // Add dependencies
    path.push(...this.getDependencies())
    
    return path
  }

  getDependencies(): string[] {
    return this.functionModelNode.processBehavior.dependencies
  }

  getOutputs(): any[] {
    // Return outputs based on node type
    switch (this.functionModelNode.nodeType) {
      case 'stageNode':
        return this.functionModelNode.functionModelData.stage?.actions || []
      case 'actionTableNode':
        return this.functionModelNode.functionModelData.action ? [this.functionModelNode.functionModelData.action] : []
      case 'ioNode':
        return this.functionModelNode.functionModelData.io ? [this.functionModelNode.functionModelData.io] : []
      case 'functionModelContainer':
        return this.functionModelNode.functionModelData.container ? [this.functionModelNode.functionModelData.container] : []
      default:
        return []
    }
  }

  validate(): ValidationResult {
    const baseValidation = super.validate()
    const errors = [...baseValidation.errors]
    const warnings = [...baseValidation.warnings]

    // Validate function model specific properties
    if (!this.functionModelNode.functionModelData) {
      errors.push('Function model data is required')
    }

    // Validate process behavior
    if (!['sequential', 'parallel', 'conditional'].includes(this.functionModelNode.processBehavior.executionType)) {
      errors.push('Invalid execution type')
    }

    // Validate timeout if set
    if (this.functionModelNode.processBehavior.timeout !== undefined && this.functionModelNode.processBehavior.timeout <= 0) {
      errors.push('Timeout must be positive')
    }

    // Validate retry policy if set
    const retryPolicy = this.functionModelNode.processBehavior.retryPolicy
    if (retryPolicy) {
      if (retryPolicy.maxRetries < 0) {
        errors.push('Max retries must be non-negative')
      }
      if (retryPolicy.retryDelay < 0) {
        errors.push('Retry delay must be non-negative')
      }
      if (retryPolicy.backoffMultiplier < 1) {
        errors.push('Backoff multiplier must be at least 1')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private async executeStageNode(): Promise<any> {
    const stage = this.functionModelNode.functionModelData.stage
    if (!stage) {
      throw new Error('Stage data not found')
    }

    // TODO: Implement stage execution logic
    console.log('Executing stage:', stage.name)
    return { stageId: stage.id, actions: stage.actions }
  }

  private async executeActionTableNode(): Promise<any> {
    const action = this.functionModelNode.functionModelData.action
    if (!action) {
      throw new Error('Action data not found')
    }

    // TODO: Implement action execution logic
    console.log('Executing action:', action.name)
    return { actionId: action.id, type: action.type }
  }

  private async executeIONode(): Promise<any> {
    const io = this.functionModelNode.functionModelData.io
    if (!io) {
      throw new Error('I/O data not found')
    }

    // TODO: Implement I/O execution logic
    console.log('Executing I/O node:', io.name)
    return { ioId: io.id, mode: io.mode }
  }

  private async executeContainerNode(): Promise<any> {
    const container = this.functionModelNode.functionModelData.container
    if (!container) {
      throw new Error('Container data not found')
    }

    // TODO: Implement container execution logic
    console.log('Executing container:', container.name)
    return { containerId: container.id, type: container.type }
  }
}

// Knowledge Base Node Behavior (placeholder)
export class KnowledgeBaseNodeBehavior extends BaseNodeBehavior implements ContentNodeBehavior {
  getContent(): string {
    // TODO: Implement content retrieval
    return ''
  }

  async updateContent(content: string): Promise<void> {
    // TODO: Implement content update
    console.log('Updating knowledge base content')
  }

  getContentType(): string {
    return 'text'
  }

  getContentSize(): number {
    return 0
  }
}

// Spindle Node Behavior (placeholder)
export class SpindleNodeBehavior extends BaseNodeBehavior implements IntegrationNodeBehavior {
  async connect(): Promise<boolean> {
    // TODO: Implement connection logic
    console.log('Connecting spindle node')
    return true
  }

  async disconnect(): Promise<void> {
    // TODO: Implement disconnection logic
    console.log('Disconnecting spindle node')
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'error' {
    // TODO: Implement connection status check
    return 'disconnected'
  }

  async sendMessage(message: any): Promise<void> {
    // TODO: Implement message sending
    console.log('Sending message to spindle node:', message)
  }
}

// Node Behavior Factory
export class NodeBehaviorFactory {
  static createBehavior(node: BaseNode): NodeBehavior {
    switch (node.featureType) {
      case 'function-model':
        return new FunctionModelNodeBehavior(node as FunctionModelNode)
      case 'knowledge-base':
        return new KnowledgeBaseNodeBehavior(node)
      case 'spindle':
        return new SpindleNodeBehavior(node)
      default:
        throw new Error(`Unknown feature type: ${node.featureType}`)
    }
  }

  static createProcessBehavior(node: BaseNode): ProcessNodeBehavior {
    if (node.featureType === 'function-model') {
      return new FunctionModelNodeBehavior(node as FunctionModelNode)
    }
    throw new Error(`Node type ${node.featureType} does not support process behavior`)
  }

  static createContentBehavior(node: BaseNode): ContentNodeBehavior {
    if (node.featureType === 'knowledge-base') {
      return new KnowledgeBaseNodeBehavior(node)
    }
    throw new Error(`Node type ${node.featureType} does not support content behavior`)
  }

  static createIntegrationBehavior(node: BaseNode): IntegrationNodeBehavior {
    if (node.featureType === 'spindle') {
      return new SpindleNodeBehavior(node)
    }
    throw new Error(`Node type ${node.featureType} does not support integration behavior`)
  }
} 