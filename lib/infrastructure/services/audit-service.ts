// Audit Service - Infrastructure Layer
// This service provides comprehensive audit logging and monitoring
// Following Clean Architecture principles

import { createClient } from '@/lib/supabase/client'
import { InfrastructureException } from '../exceptions/infrastructure-exceptions'

export interface AuditLogEntry {
  auditId: string
  timestamp: Date
  userId?: string
  sessionId?: string
  operation: string
  resource: string
  resourceId: string
  action: 'create' | 'read' | 'update' | 'delete' | 'version' | 'restore'
  details: Record<string, any>
  metadata: {
    ipAddress?: string
    userAgent?: string
    source: 'api' | 'ui' | 'system'
    severity: 'low' | 'medium' | 'high' | 'critical'
  }
  result: 'success' | 'failure' | 'partial'
  error?: string
  duration?: number
}

export interface AuditQuery {
  userId?: string
  resource?: string
  resourceId?: string
  action?: string
  startDate?: Date
  endDate?: Date
  severity?: string
  result?: string
  limit?: number
  offset?: number
}

export interface AuditStats {
  totalOperations: number
  successRate: number
  averageDuration: number
  operationsByType: Record<string, number>
  operationsByUser: Record<string, number>
  operationsByResource: Record<string, number>
  errorRate: number
  criticalOperations: number
}

export class AuditService {
  private supabase = createClient()
  private readonly auditTable = 'audit_log'
  private readonly maxLogAge = 90 * 24 * 60 * 60 * 1000 // 90 days

  /**
   * Logs an audit entry
   */
  async logAuditEntry(entry: Omit<AuditLogEntry, 'auditId' | 'timestamp'>): Promise<string> {
    const auditId = this.generateAuditId()
    const timestamp = new Date()

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(auditId)) {
      console.error('Invalid UUID generated:', auditId)
      throw new InfrastructureException(
        'Generated audit ID is not a valid UUID format',
        'AUDIT_ID_GENERATION_ERROR',
        500,
        { auditId }
      )
    }

    // Validate and truncate operation name to fit database constraint
    const validatedOperation = this.validateAndTruncateOperation(entry.operation)
    
    // Log if truncation occurred for debugging purposes
    if (validatedOperation !== entry.operation) {
      console.warn(`Audit operation name truncated: "${entry.operation}" -> "${validatedOperation}"`)
    }

    const auditEntry: AuditLogEntry = {
      ...entry,
      auditId,
      timestamp,
      operation: validatedOperation
    }

    try {
      const { error } = await this.supabase
        .from(this.auditTable)
        .insert({
          audit_id: auditEntry.auditId,
          table_name: auditEntry.resource,
          operation: auditEntry.operation,
          record_id: auditEntry.resourceId,
          old_data: null,
          new_data: auditEntry.details,
          changed_by: auditEntry.userId,
          changed_at: auditEntry.timestamp.toISOString()
        })

      if (error) {
        throw new InfrastructureException(
          `Failed to log audit entry: ${error.message}`,
          'AUDIT_LOG_ERROR',
          500,
          { auditId, operation: entry.operation }
        )
      }

      return auditId
         } catch (error) {
       // Don't throw on audit logging failures to avoid breaking main operations
       console.error('Audit logging failed:', error)
       console.error('Audit entry details:', {
         auditId,
         operation: entry.operation,
         resource: entry.resource,
         resourceId: entry.resourceId
       })
       return auditId
     }
  }

  /**
   * Logs a function model save operation
   */
  async logFunctionModelSave(
    modelId: string,
    operation: string,
    details: Record<string, any>,
    userId?: string,
    sessionId?: string
  ): Promise<string> {
    return this.logAuditEntry({
      userId,
      sessionId,
      operation,
      resource: 'function-model',
      resourceId: modelId,
      action: 'update',
      details,
      metadata: {
        source: 'ui',
        severity: this.determineSeverity(operation, details),
        ipAddress: details.ipAddress,
        userAgent: details.userAgent
      },
      result: details.success ? 'success' : 'failure',
      error: details.error,
      duration: details.duration
    })
  }

  /**
   * Logs a function model version operation
   */
  async logFunctionModelVersion(
    modelId: string,
    version: string,
    operation: 'create' | 'restore',
    details: Record<string, any>,
    userId?: string,
    sessionId?: string
  ): Promise<string> {
    return this.logAuditEntry({
      userId,
      sessionId,
      operation: `function-model-version-${operation}`,
      resource: 'function-model-version',
      resourceId: `${modelId}-${version}`,
      action: operation === 'create' ? 'version' : 'restore',
      details,
      metadata: {
        source: 'ui',
        severity: 'high',
        ipAddress: details.ipAddress,
        userAgent: details.userAgent
      },
      result: details.success ? 'success' : 'failure',
      error: details.error,
      duration: details.duration
    })
  }

  /**
   * Logs a node operation
   */
  async logNodeOperation(
    modelId: string,
    nodeId: string,
    operation: 'create' | 'update' | 'delete',
    details: Record<string, any>,
    userId?: string,
    sessionId?: string
  ): Promise<string> {
    return this.logAuditEntry({
      userId,
      sessionId,
      operation: `node-${operation}`,
      resource: 'function-model-node',
      resourceId: nodeId,
      action: operation,
      details: {
        ...details,
        modelId,
        nodeId
      },
      metadata: {
        source: 'ui',
        severity: this.determineSeverity(`node-${operation}`, details),
        ipAddress: details.ipAddress,
        userAgent: details.userAgent
      },
      result: details.success ? 'success' : 'failure',
      error: details.error,
      duration: details.duration
    })
  }

  /**
   * Logs a connection operation
   */
  async logConnectionOperation(
    modelId: string,
    connectionId: string,
    operation: 'create' | 'delete',
    details: Record<string, any>,
    userId?: string,
    sessionId?: string
  ): Promise<string> {
    return this.logAuditEntry({
      userId,
      sessionId,
      operation: `connection-${operation}`,
      resource: 'function-model-connection',
      resourceId: connectionId,
      action: operation,
      details: {
        ...details,
        modelId,
        connectionId
      },
      metadata: {
        source: 'ui',
        severity: 'medium',
        ipAddress: details.ipAddress,
        userAgent: details.userAgent
      },
      result: details.success ? 'success' : 'failure',
      error: details.error,
      duration: details.duration
    })
  }

  /**
   * Logs a system operation
   */
  async logSystemOperation(
    operation: string,
    resource: string,
    resourceId: string,
    details: Record<string, any>
  ): Promise<string> {
    return this.logAuditEntry({
      operation,
      resource,
      resourceId,
      action: 'update',
      details,
      metadata: {
        source: 'system',
        severity: 'medium'
      },
      result: details.success ? 'success' : 'failure',
      error: details.error,
      duration: details.duration
    })
  }

  /**
   * Queries audit logs
   */
  async queryAuditLogs(query: AuditQuery): Promise<AuditLogEntry[]> {
    try {
      let supabaseQuery = this.supabase
        .from(this.auditTable)
        .select('*')

      if (query.userId) {
        supabaseQuery = supabaseQuery.eq('user_id', query.userId)
      }

      if (query.resource) {
        supabaseQuery = supabaseQuery.eq('resource', query.resource)
      }

      if (query.resourceId) {
        supabaseQuery = supabaseQuery.eq('resource_id', query.resourceId)
      }

      if (query.action) {
        supabaseQuery = supabaseQuery.eq('action', query.action)
      }

      if (query.startDate) {
        supabaseQuery = supabaseQuery.gte('timestamp', query.startDate.toISOString())
      }

      if (query.endDate) {
        supabaseQuery = supabaseQuery.lte('timestamp', query.endDate.toISOString())
      }

      if (query.severity) {
        supabaseQuery = supabaseQuery.eq('metadata->severity', query.severity)
      }

      if (query.result) {
        supabaseQuery = supabaseQuery.eq('result', query.result)
      }

      if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit)
      }

      if (query.offset) {
        supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit || 100) - 1)
      }

      supabaseQuery = supabaseQuery.order('timestamp', { ascending: false })

      const { data, error } = await supabaseQuery

      if (error) {
        throw new InfrastructureException(
          `Failed to query audit logs: ${error.message}`,
          'AUDIT_QUERY_ERROR',
          500,
          { query }
        )
      }

      return data.map(this.mapDbToAuditLogEntry)
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to query audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AUDIT_QUERY_ERROR',
        500,
        { query }
      )
    }
  }

  /**
   * Gets audit statistics
   */
  async getAuditStats(startDate?: Date, endDate?: Date): Promise<AuditStats> {
    try {
      const query: AuditQuery = {
        startDate,
        endDate,
        limit: 10000 // Get a large sample for stats
      }

      const logs = await this.queryAuditLogs(query)

      const totalOperations = logs.length
      const successfulOperations = logs.filter(log => log.result === 'success').length
      const successRate = totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 0

      const durations = logs.filter(log => log.duration).map(log => log.duration!)
      const averageDuration = durations.length > 0 ? 
        durations.reduce((sum, duration) => sum + duration, 0) / durations.length : 0

      const operationsByType: Record<string, number> = {}
      const operationsByUser: Record<string, number> = {}
      const operationsByResource: Record<string, number> = {}

      logs.forEach(log => {
        // Count by operation type
        operationsByType[log.operation] = (operationsByType[log.operation] || 0) + 1

        // Count by user
        if (log.userId) {
          operationsByUser[log.userId] = (operationsByUser[log.userId] || 0) + 1
        }

        // Count by resource
        operationsByResource[log.resource] = (operationsByResource[log.resource] || 0) + 1
      })

      const failedOperations = logs.filter(log => log.result === 'failure').length
      const errorRate = totalOperations > 0 ? (failedOperations / totalOperations) * 100 : 0

      const criticalOperations = logs.filter(log => 
        log.metadata.severity === 'critical' || log.metadata.severity === 'high'
      ).length

      return {
        totalOperations,
        successRate,
        averageDuration,
        operationsByType,
        operationsByUser,
        operationsByResource,
        errorRate,
        criticalOperations
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get audit stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AUDIT_STATS_ERROR',
        500
      )
    }
  }

  /**
   * Gets audit logs for a specific resource
   */
  async getResourceAuditLogs(
    resource: string,
    resourceId: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    return this.queryAuditLogs({
      resource,
      resourceId,
      limit
    })
  }

  /**
   * Gets audit logs for a specific user
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    return this.queryAuditLogs({
      userId,
      limit
    })
  }

  /**
   * Gets recent audit logs
   */
  async getRecentAuditLogs(hours: number = 24): Promise<AuditLogEntry[]> {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000)

    return this.queryAuditLogs({
      startDate,
      endDate,
      limit: 1000
    })
  }

  /**
   * Cleans up old audit logs
   */
  async cleanupOldAuditLogs(): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - this.maxLogAge)

      const { data, error } = await this.supabase
        .from(this.auditTable)
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .select('audit_id')

      if (error) {
        throw new InfrastructureException(
          `Failed to cleanup old audit logs: ${error.message}`,
          'AUDIT_CLEANUP_ERROR',
          500
        )
      }

      return data?.length || 0
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to cleanup old audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AUDIT_CLEANUP_ERROR',
        500
      )
    }
  }

  /**
   * Determines severity based on operation and details
   */
  private determineSeverity(operation: string, details: Record<string, any>): 'low' | 'medium' | 'high' | 'critical' {
    // Critical operations
    if (operation.includes('delete') || operation.includes('restore')) {
      return 'critical'
    }

    // High severity operations
    if (operation.includes('version') || operation.includes('create')) {
      return 'high'
    }

    // Medium severity operations
    if (operation.includes('update') || operation.includes('connection')) {
      return 'medium'
    }

    // Low severity operations
    return 'low'
  }

  /**
   * Validates and truncates an operation name to fit within a 20-character database constraint.
   * If the operation name is longer than 20 characters, it will be truncated intelligently
   * to preserve the most meaningful part of the operation name.
   */
  private validateAndTruncateOperation(operation: string): string {
    if (operation.length <= 20) {
      return operation
    }
    
    // For operations with underscores, try to preserve the action part
    if (operation.includes('_')) {
      const parts = operation.split('_')
      const action = parts[parts.length - 1] // Get the last part (usually the action)
      if (action.length <= 20) {
        return action
      }
    }
    
    // Fallback to simple truncation
    return operation.substring(0, 20)
  }

  /**
   * Generates a unique audit ID using proper UUID format
   */
  private generateAuditId(): string {
    // Use crypto.randomUUID() for proper UUID generation
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    
    // Fallback for environments without crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Maps database row to audit log entry
   */
  private mapDbToAuditLogEntry(row: any): AuditLogEntry {
    return {
      auditId: row.audit_id,
      timestamp: new Date(row.timestamp),
      userId: row.user_id,
      sessionId: row.session_id,
      operation: row.operation,
      resource: row.resource,
      resourceId: row.resource_id,
      action: row.action,
      details: row.details || {},
      metadata: row.metadata || {},
      result: row.result,
      error: row.error,
      duration: row.duration
    }
  }
}
