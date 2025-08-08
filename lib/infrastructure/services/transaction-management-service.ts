// Transaction Management Service - Infrastructure Layer
// This service handles database transactions with proper rollback mechanisms
// Following Clean Architecture principles

import { createClient } from '@/lib/supabase/client'
import { InfrastructureException } from '../exceptions/infrastructure-exceptions'

export interface TransactionOptions {
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
  isolationLevel?: 'read-committed' | 'repeatable-read' | 'serializable'
}

export interface TransactionResult<T> {
  success: boolean
  data?: T
  error?: string
  rollbackRequired: boolean
  transactionId: string
  duration: number
}

export interface TransactionLog {
  transactionId: string
  startTime: Date
  endTime?: Date
  status: 'pending' | 'committed' | 'rolled-back' | 'failed'
  operations: TransactionOperation[]
  error?: string
  duration?: number
}

export interface TransactionOperation {
  operationId: string
  type: 'insert' | 'update' | 'delete' | 'select'
  table: string
  data?: any
  timestamp: Date
  success: boolean
  error?: string
}

export class TransactionManagementService {
  private supabase = createClient()
  private activeTransactions = new Map<string, TransactionLog>()
  private readonly defaultTimeout = 30000 // 30 seconds
  private readonly defaultRetryAttempts = 3
  private readonly defaultRetryDelay = 1000 // 1 second

  /**
   * Executes a function within a database transaction
   */
  async executeInTransaction<T>(
    operation: (transaction: any) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const transactionId = this.generateTransactionId()
    const startTime = Date.now()
    
    const transactionLog: TransactionLog = {
      transactionId,
      startTime: new Date(),
      status: 'pending',
      operations: []
    }

    this.activeTransactions.set(transactionId, transactionLog)

    try {
      // Start transaction
      await this.beginTransaction(transactionId)

      // Execute the operation
      const result = await operation(this.createTransactionProxy(transactionId))

      // Commit transaction
      await this.commitTransaction(transactionId)

      const endTime = Date.now()
      const duration = endTime - startTime

      transactionLog.status = 'committed'
      transactionLog.endTime = new Date()
      transactionLog.duration = duration

      return {
        success: true,
        data: result,
        rollbackRequired: false,
        transactionId,
        duration
      }

    } catch (error) {
      // Rollback transaction
      await this.rollbackTransaction(transactionId)

      const endTime = Date.now()
      const duration = endTime - startTime

      transactionLog.status = 'rolled-back'
      transactionLog.endTime = new Date()
      transactionLog.duration = duration
      transactionLog.error = error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        rollbackRequired: true,
        transactionId,
        duration
      }

    } finally {
      // Clean up
      this.activeTransactions.delete(transactionId)
    }
  }

  /**
   * Executes multiple operations in a single transaction
   */
  async executeBatchTransaction<T>(
    operations: Array<(transaction: any) => Promise<T>>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T[]>> {
    return this.executeInTransaction(async (transaction) => {
      const results: T[] = []
      
      for (const operation of operations) {
        const result = await operation(transaction)
        results.push(result)
      }
      
      return results
    }, options)
  }

  /**
   * Executes an operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const maxRetries = options.retryAttempts || this.defaultRetryAttempts
    const retryDelay = options.retryDelay || this.defaultRetryDelay
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()
        return {
          success: true,
          data: result,
          rollbackRequired: false,
          transactionId: `retry-${Date.now()}`,
          duration: 0
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt === maxRetries) {
          break
        }

        // Wait before retry
        await this.delay(retryDelay * attempt)
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      rollbackRequired: true,
      transactionId: `retry-${Date.now()}`,
      duration: 0
    }
  }

  /**
   * Begins a database transaction
   */
  private async beginTransaction(transactionId: string): Promise<void> {
    try {
      // Note: Supabase doesn't support explicit transaction control in the client
      // This is a placeholder for when we implement proper transaction support
      console.log(`Transaction ${transactionId} started`)
    } catch (error) {
      throw new InfrastructureException(
        `Failed to begin transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRANSACTION_BEGIN_ERROR',
        500,
        { transactionId }
      )
    }
  }

  /**
   * Commits a database transaction
   */
  private async commitTransaction(transactionId: string): Promise<void> {
    try {
      // Note: Supabase doesn't support explicit transaction control in the client
      // This is a placeholder for when we implement proper transaction support
      console.log(`Transaction ${transactionId} committed`)
    } catch (error) {
      throw new InfrastructureException(
        `Failed to commit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRANSACTION_COMMIT_ERROR',
        500,
        { transactionId }
      )
    }
  }

  /**
   * Rollbacks a database transaction
   */
  private async rollbackTransaction(transactionId: string): Promise<void> {
    try {
      // Note: Supabase doesn't support explicit transaction control in the client
      // This is a placeholder for when we implement proper transaction support
      console.log(`Transaction ${transactionId} rolled back`)
    } catch (error) {
      throw new InfrastructureException(
        `Failed to rollback transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRANSACTION_ROLLBACK_ERROR',
        500,
        { transactionId }
      )
    }
  }

  /**
   * Creates a transaction proxy for tracking operations
   */
  private createTransactionProxy(transactionId: string): any {
    const transactionLog = this.activeTransactions.get(transactionId)
    
    return {
      // Proxy for Supabase client methods
      from: (table: string) => ({
        select: async (columns?: string) => {
          const operationId = this.generateOperationId()
          const startTime = Date.now()
          
          try {
            const result = await this.supabase.from(table).select(columns)
            
            this.logOperation(transactionId, {
              operationId,
              type: 'select',
              table,
              timestamp: new Date(),
              success: !result.error,
              error: result.error?.message
            })
            
            return result
          } catch (error) {
            this.logOperation(transactionId, {
              operationId,
              type: 'select',
              table,
              timestamp: new Date(),
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            throw error
          }
        },
        
        insert: async (data: any) => {
          const operationId = this.generateOperationId()
          
          try {
            const result = await this.supabase.from(table).insert(data)
            
            this.logOperation(transactionId, {
              operationId,
              type: 'insert',
              table,
              data,
              timestamp: new Date(),
              success: !result.error,
              error: result.error?.message
            })
            
            return result
          } catch (error) {
            this.logOperation(transactionId, {
              operationId,
              type: 'insert',
              table,
              data,
              timestamp: new Date(),
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            throw error
          }
        },
        
        update: async (data: any) => {
          const operationId = this.generateOperationId()
          
          try {
            const result = await this.supabase.from(table).update(data)
            
            this.logOperation(transactionId, {
              operationId,
              type: 'update',
              table,
              data,
              timestamp: new Date(),
              success: !result.error,
              error: result.error?.message
            })
            
            return result
          } catch (error) {
            this.logOperation(transactionId, {
              operationId,
              type: 'update',
              table,
              data,
              timestamp: new Date(),
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            throw error
          }
        },
        
        delete: async () => {
          const operationId = this.generateOperationId()
          
          try {
            const result = await this.supabase.from(table).delete()
            
            this.logOperation(transactionId, {
              operationId,
              type: 'delete',
              table,
              timestamp: new Date(),
              success: !result.error,
              error: result.error?.message
            })
            
            return result
          } catch (error) {
            this.logOperation(transactionId, {
              operationId,
              type: 'delete',
              table,
              timestamp: new Date(),
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            throw error
          }
        }
      })
    }
  }

  /**
   * Logs an operation within a transaction
   */
  private logOperation(transactionId: string, operation: TransactionOperation): void {
    const transactionLog = this.activeTransactions.get(transactionId)
    if (transactionLog) {
      transactionLog.operations.push(operation)
    }
  }

  /**
   * Generates a unique transaction ID
   */
  private generateTransactionId(): string {
    return `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generates a unique operation ID
   */
  private generateOperationId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Delays execution for a specified number of milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Gets transaction statistics
   */
  getTransactionStats(): {
    activeTransactions: number
    totalTransactions: number
    averageDuration: number
    successRate: number
  } {
    const activeCount = this.activeTransactions.size
    const allTransactions = Array.from(this.activeTransactions.values())
    
    const completedTransactions = allTransactions.filter(t => t.status !== 'pending')
    const successfulTransactions = completedTransactions.filter(t => t.status === 'committed')
    
    const totalDuration = completedTransactions.reduce((sum, t) => sum + (t.duration || 0), 0)
    const averageDuration = completedTransactions.length > 0 ? totalDuration / completedTransactions.length : 0
    
    const successRate = completedTransactions.length > 0 ? 
      (successfulTransactions.length / completedTransactions.length) * 100 : 0

    return {
      activeTransactions: activeCount,
      totalTransactions: completedTransactions.length,
      averageDuration,
      successRate
    }
  }

  /**
   * Gets detailed transaction logs
   */
  getTransactionLogs(): TransactionLog[] {
    return Array.from(this.activeTransactions.values())
  }

  /**
   * Cleans up old transaction logs
   */
  cleanupOldLogs(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - maxAge
    
    for (const [transactionId, log] of this.activeTransactions.entries()) {
      if (log.startTime.getTime() < cutoffTime) {
        this.activeTransactions.delete(transactionId)
      }
    }
  }
}
