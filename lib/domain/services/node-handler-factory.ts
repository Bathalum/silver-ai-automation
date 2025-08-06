// Node Handler Factory
// This file contains the factory pattern for creating node handlers based on node type

import type { NodeBehavior, ValidationResult, ExecutionResult, ExecutionContext } from '../entities/node-behavior-types'
import type { BaseNode } from '../entities/base-node-types'
import type { FunctionModelNode } from '../entities/function-model-node-types'
import { NodeValidationError, InvalidOperationError } from '../exceptions/domain-exceptions'

export interface NodeHandler {
  validate(): ValidationResult
  execute(context: ExecutionContext): Promise<ExecutionResult>
  getDependencies(): string[]
  getOutputs(): any[]
  getBehaviorType(): string
  getBehaviorConfig(): Record<string, any>
}

// Domain-specific handlers
export interface ProcessNodeHandler extends NodeHandler {
  rollback(): Promise<void>
  getExecutionPath(): string[]
}

export interface ContentNodeHandler extends NodeHandler {
  render(): string
  search(query: string): any[]
  version(): any
}

export interface IntegrationNodeHandler extends NodeHandler {
  connect(): Promise<any>
  transform(data: any): Promise<any>
  handleError(error: Error): Promise<any>
}

export interface DomainNodeHandler extends NodeHandler {
  handleCommand(command: any): Promise<any[]>
  applyEvent(event: any): void
  getState(): any
}

export class NodeHandlerFactory {
  private static handlers: Map<string, new (node: BaseNode) => NodeHandler> = new Map()

  static registerHandler(nodeType: string, handlerClass: new (node: BaseNode) => NodeHandler): void {
    this.handlers.set(nodeType, handlerClass)
  }

  static createHandler(node: BaseNode): NodeHandler {
    const handlerClass = this.handlers.get(node.nodeType)
    
    if (!handlerClass) {
      throw new InvalidOperationError(
        `No handler found for node type: ${node.nodeType}`,
        'createHandler'
      )
    }

    return new handlerClass(node)
  }

  static getSupportedNodeTypes(): string[] {
    return Array.from(this.handlers.keys())
  }

  static hasHandler(nodeType: string): boolean {
    return this.handlers.has(nodeType)
  }
}

// Concrete handler implementations
export class FunctionModelNodeHandler implements ProcessNodeHandler {
  private node: FunctionModelNode

  constructor(node: FunctionModelNode) {
    this.node = node
  }

  async validate(): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate basic properties
    if (!this.node.name?.trim()) {
      errors.push('Node name is required')
    }

    if (!this.node.nodeType) {
      errors.push('Node type is required')
    }

    if (!this.node.position || typeof this.node.position.x !== 'number' || typeof this.node.position.y !== 'number') {
      errors.push('Valid position is required')
    }

    // Validate process behavior
    if (this.node.processBehavior) {
      if (this.node.processBehavior.timeout && this.node.processBehavior.timeout < 0) {
        errors.push('Timeout must be non-negative')
      }

      if (this.node.processBehavior.dependencies && this.node.processBehavior.dependencies.length > 100) {
        errors.push('Cannot have more than 100 dependencies')
      }
    }

    // Validate business logic
    if (this.node.businessLogic?.raciMatrix) {
      const raci = this.node.businessLogic.raciMatrix
      if ((!raci.responsible || raci.responsible.length === 0) && 
          (!raci.accountable || raci.accountable.length === 0)) {
        errors.push('At least one responsible or accountable person is required')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now()
    
    try {
      // Validate before execution
      const validation = await this.validate()
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
          executionTime: Date.now() - startTime,
          metadata: {
            nodeId: this.node.nodeId,
            nodeType: this.node.nodeType,
            validationErrors: validation.errors
          }
        }
      }

      // Execute based on node type
      let output: any
      switch (this.node.nodeType) {
        case 'stageNode':
          output = await this.executeStageNode(context)
          break
        case 'actionTableNode':
          output = await this.executeActionNode(context)
          break
        case 'ioNode':
          output = await this.executeIONode(context)
          break
        case 'functionModelContainer':
          output = await this.executeContainerNode(context)
          break
        default:
          throw new Error(`Unknown node type: ${this.node.nodeType}`)
      }

      return {
        success: true,
        output,
        executionTime: Date.now() - startTime,
        metadata: {
          nodeId: this.node.nodeId,
          nodeType: this.node.nodeType,
          executionType: this.node.processBehavior?.executionType
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        metadata: {
          nodeId: this.node.nodeId,
          nodeType: this.node.nodeType
        }
      }
    }
  }

  getDependencies(): string[] {
    return this.node.processBehavior?.dependencies || []
  }

  getOutputs(): any[] {
    // Return outputs based on node type
    switch (this.node.nodeType) {
      case 'stageNode':
        return this.node.functionModelData.stage?.actions || []
      case 'actionTableNode':
        return [this.node.functionModelData.action]
      case 'ioNode':
        return [this.node.functionModelData.io]
      case 'functionModelContainer':
        return this.node.functionModelData.container?.childNodes || []
      default:
        return []
    }
  }

  getBehaviorType(): string {
    return 'process'
  }

  getBehaviorConfig(): Record<string, any> {
    return {
      executionType: this.node.processBehavior?.executionType,
      timeout: this.node.processBehavior?.timeout,
      retryPolicy: this.node.processBehavior?.retryPolicy,
      dependencies: this.node.processBehavior?.dependencies
    }
  }

  async rollback(): Promise<void> {
    // Implement rollback logic for process nodes
    console.log(`Rolling back node: ${this.node.nodeId}`)
  }

  getExecutionPath(): string[] {
    // Return the execution path for this node
    return [this.node.nodeId, ...this.getDependencies()]
  }

  private async executeStageNode(context: ExecutionContext): Promise<any> {
    // Execute stage node logic
    return {
      stageId: this.node.nodeId,
      stageName: this.node.name,
      actions: this.node.functionModelData.stage?.actions || [],
      dataChanges: this.node.functionModelData.stage?.dataChange || [],
      boundaryCriteria: this.node.functionModelData.stage?.boundaryCriteria || []
    }
  }

  private async executeActionNode(context: ExecutionContext): Promise<any> {
    // Execute action node logic
    return {
      actionId: this.node.nodeId,
      actionName: this.node.name,
      actionType: this.node.functionModelData.action?.type,
      responsible: this.node.businessLogic?.raciMatrix?.responsible || [],
      accountable: this.node.businessLogic?.raciMatrix?.accountable || []
    }
  }

  private async executeIONode(context: ExecutionContext): Promise<any> {
    // Execute IO node logic
    return {
      portId: this.node.nodeId,
      portName: this.node.name,
      dataType: this.node.functionModelData.io?.dataType,
      dataFormat: this.node.functionModelData.io?.dataFormat,
      isRequired: this.node.functionModelData.io?.isRequired
    }
  }

  private async executeContainerNode(context: ExecutionContext): Promise<any> {
    // Execute container node logic
    return {
      containerId: this.node.nodeId,
      containerName: this.node.name,
      containerType: this.node.functionModelData.container?.containerType,
      childNodes: this.node.functionModelData.container?.childNodes || []
    }
  }
}

// Register handlers
NodeHandlerFactory.registerHandler('stageNode', FunctionModelNodeHandler)
NodeHandlerFactory.registerHandler('actionTableNode', FunctionModelNodeHandler)
NodeHandlerFactory.registerHandler('ioNode', FunctionModelNodeHandler)
NodeHandlerFactory.registerHandler('functionModelContainer', FunctionModelNodeHandler) 