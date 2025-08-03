import { NodeBehaviorFactory } from '@/lib/domain/entities/node-behavior-types'
import { UnifiedNodeOperations } from '@/lib/use-cases/unified-node-operations'
import type { ExecutionResult, ValidationResult } from '@/lib/domain/entities/node-behavior-types'

export interface ExecutionContext {
  userId: string
  sessionId: string
  timestamp: Date
  parameters?: Record<string, any>
  environment?: 'development' | 'staging' | 'production'
}

export interface ExecutionOptions {
  validateBeforeExecute?: boolean
  timeout?: number
  retryOnFailure?: boolean
  maxRetries?: number
  logExecution?: boolean
}

export class NodeExecutionService {
  private nodeOperations: UnifiedNodeOperations

  constructor() {
    this.nodeOperations = new UnifiedNodeOperations()
  }

  async executeNode(
    featureType: string,
    entityId: string,
    nodeId: string,
    context?: ExecutionContext,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      // Get the node
      const node = await this.nodeOperations.getNode(featureType, entityId, nodeId)
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`)
      }

      // Validate before execution if requested
      if (options?.validateBeforeExecute) {
        const validation = await this.nodeOperations.validateNode(featureType, entityId, nodeId)
        if (!validation.isValid) {
          throw new Error(`Node validation failed: ${validation.errors.join(', ')}`)
        }
      }

      // Create behavior
      const behavior = NodeBehaviorFactory.createBehavior(node)

      // Execute with timeout if specified
      let executionPromise = behavior.execute(context)
      
      if (options?.timeout) {
        executionPromise = Promise.race([
          executionPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Execution timeout')), options.timeout)
          )
        ])
      }

      const result = await executionPromise

      // Log execution if requested
      if (options?.logExecution) {
        this.logExecution(nodeId, result, Date.now() - startTime)
      }

      return {
        success: true,
        output: result,
        executionTime: Date.now() - startTime,
        metadata: {
          nodeId,
          featureType,
          entityId,
          context
        }
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        metadata: {
          nodeId,
          featureType,
          entityId,
          context
        }
      }
    }
  }

  async validateNode(
    featureType: string,
    entityId: string,
    nodeId: string
  ): Promise<ValidationResult> {
    return await this.nodeOperations.validateNode(featureType, entityId, nodeId)
  }

  async getNodeBehavior(
    featureType: string,
    entityId: string,
    nodeId: string
  ): Promise<any> {
    return await this.nodeOperations.getNodeBehavior(featureType, entityId, nodeId)
  }

  private logExecution(nodeId: string, result: any, executionTime: number) {
    console.log(`Node execution completed:`, {
      nodeId,
      result,
      executionTime,
      timestamp: new Date().toISOString()
    })
  }
} 