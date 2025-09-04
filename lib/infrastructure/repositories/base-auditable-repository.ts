import { SupabaseClient } from '@supabase/supabase-js';
import { Result } from '../../domain/shared/result';
import { BaseSupabaseRepository } from './base-supabase-repository';

/**
 * BaseAuditableRepository<TAuditable, TId>
 * 
 * Repository for managing auditable entities with complete audit trails and soft deletion capabilities.
 * Implements comprehensive audit logging, soft deletion with recovery, and compliance features.
 * 
 * ARCHITECTURAL BOUNDARIES:
 * - Implements comprehensive audit logging for all operations
 * - Provides soft deletion with recovery capabilities
 * - Tracks user context and operation metadata
 * - Maintains data retention and compliance requirements
 * - Ensures audit trail immutability and integrity
 * - Supports audit querying and reporting
 */

// Audit context information
interface AuditContext {
  userId: string;
  userRole: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  operation: string;
  reason?: string;
  metadata?: Record<string, any>;
}

// Audit log entry
interface AuditLogEntry {
  auditId: string;
  entityId: string;
  entityType: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'READ';
  oldValues?: any;
  newValues?: any;
  changedFields: string[];
  context: AuditContext;
  createdAt: Date;
  isSystemOperation: boolean;
}

// Repository interface for auditable entities
interface IAuditableRepository<TAuditable, TId> {
  // Core operations with audit context
  save(entity: TAuditable, context: AuditContext): Promise<Result<TAuditable>>;
  findById(id: TId, context: AuditContext, includeDeleted?: boolean): Promise<Result<TAuditable | null>>;
  findAll(criteria: any, context: AuditContext, includeDeleted?: boolean): Promise<Result<TAuditable[]>>;
  
  // Soft deletion operations
  softDelete(id: TId, context: AuditContext, reason?: string): Promise<Result<void>>;
  restore(id: TId, context: AuditContext): Promise<Result<TAuditable>>;
  hardDelete(id: TId, context: AuditContext): Promise<Result<void>>;
  
  // Audit operations
  getAuditTrail(id: TId, limit?: number): Promise<Result<AuditLogEntry[]>>;
  getAuditSummary(id: TId): Promise<Result<any>>;
  findByAuditCriteria(criteria: any): Promise<Result<AuditLogEntry[]>>;
  
  // Compliance and retention
  scheduleDataPurge(id: TId, purgeAfterDays: number, context: AuditContext): Promise<Result<void>>;
  findDeletedEntities(olderThanDays?: number): Promise<Result<TAuditable[]>>;
  validateDataRetention(id: TId): Promise<Result<boolean>>;
}

export abstract class BaseAuditableRepository<TAuditable, TId> 
  extends BaseSupabaseRepository<TAuditable, TId>
  implements IAuditableRepository<TAuditable, TId> {
  
  protected constructor(
    supabase: SupabaseClient,
    protected readonly entityTableName: string,
    protected readonly auditLogTableName: string,
    protected readonly entityTypeName: string
  ) {
    super(supabase, entityTableName);
  }

  // Implement base repository operations (not used directly - redirected to auditable versions)
  async save(entity: TAuditable, context?: AuditContext): Promise<Result<TAuditable>> {
    if (!context) {
      return Result.fail('Audit context is required for all operations on auditable entities');
    }
    return this.saveWithAudit(entity, context);
  }

  async findById(id: TId, context?: AuditContext, includeDeleted?: boolean): Promise<Result<TAuditable | null>> {
    if (!context) {
      return Result.fail('Audit context is required for all operations on auditable entities');
    }
    return this.findByIdWithAudit(id, context, includeDeleted);
  }

  async findAll(filter?: any, context?: AuditContext, includeDeleted?: boolean): Promise<Result<TAuditable[]>> {
    if (!context) {
      return Result.fail('Audit context is required for all operations on auditable entities');
    }
    return this.findAllWithAudit(filter || {}, context, includeDeleted);
  }

  async delete(id: TId, context?: AuditContext): Promise<Result<void>> {
    if (!context) {
      return Result.fail('Audit context is required for all operations on auditable entities');
    }
    return this.softDelete(id, context);
  }

  async exists(id: TId): Promise<Result<boolean>> {
    return this.performExists(id);
  }

  // Core auditable operations
  private async saveWithAudit(entity: TAuditable, context: AuditContext): Promise<Result<TAuditable>> {
    const contextValidation = this.validateAuditContext(context);
    if (contextValidation.isFailure) {
      return Result.fail(contextValidation.error);
    }

    return this.executeTransaction(async (client) => {
      // Check if entity exists to determine if this is CREATE or UPDATE
      const entityData = entity as any;
      const existingResult = await this.performFindById(entityData.id);
      const isUpdate = existingResult.isSuccess && existingResult.value !== null;
      const operation = isUpdate ? 'UPDATE' : 'CREATE';

      // Update audit fields
      const now = new Date();
      entityData.updatedAt = now;
      entityData.updatedBy = context.userId;
      if (!isUpdate) {
        entityData.createdAt = now;
        entityData.createdBy = context.userId;
        entityData.version = 1;
      } else {
        entityData.version = (existingResult.value as any).version + 1;
      }

      // Save entity
      const entityRow = this.fromDomain(entity);
      const { data: savedEntity, error } = await client
        .from(this.entityTableName)
        .upsert(entityRow)
        .select()
        .single();

      if (error) {
        throw new Error(this.translateDatabaseError(error));
      }

      // Create audit log entry
      const oldValues = isUpdate ? this.fromDomain(existingResult.value!) : undefined;
      const newValues = savedEntity;
      
      const auditResult = await this.createAuditLogEntry(
        entity, 
        operation, 
        context, 
        oldValues, 
        newValues
      );
      
      if (auditResult.isFailure) {
        throw new Error(`Audit logging failed: ${auditResult.error}`);
      }

      const domainResult = this.toDomain(savedEntity);
      if (domainResult.isFailure) {
        throw new Error(domainResult.error);
      }

      return domainResult.value;
    });
  }

  private async findByIdWithAudit(id: TId, context: AuditContext, includeDeleted: boolean = false): Promise<Result<TAuditable | null>> {
    const contextValidation = this.validateAuditContext(context);
    if (contextValidation.isFailure) {
      return Result.fail(contextValidation.error);
    }

    try {
      let query = this.supabase
        .from(this.entityTableName)
        .select('*')
        .eq('id', id);

      // Exclude soft-deleted entities unless explicitly requested
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return Result.ok(null);
        }
        return Result.fail(this.translateDatabaseError(error));
      }

      if (!data) {
        return Result.ok(null);
      }

      // Log READ operation for audit trail
      const entity = await this.toDomain(data);
      if (entity.isSuccess) {
        await this.createAuditLogEntry(
          entity.value,
          'READ',
          context
        );
      }

      return entity;
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  private async findAllWithAudit(criteria: any, context: AuditContext, includeDeleted: boolean = false): Promise<Result<TAuditable[]>> {
    const contextValidation = this.validateAuditContext(context);
    if (contextValidation.isFailure) {
      return Result.fail(contextValidation.error);
    }

    try {
      let query = this.supabase.from(this.entityTableName).select('*');

      // Exclude soft-deleted entities unless explicitly requested
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }

      // Apply filters safely
      if (criteria.name) {
        query = query.eq('name', criteria.name);
      }
      if (criteria.status) {
        query = query.eq('status', criteria.status);
      }

      // Apply pagination
      const limit = criteria.limit && criteria.limit <= 1000 ? criteria.limit : 100;
      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      if (!data) {
        return Result.ok([]);
      }

      // Convert to domain entities
      const entities: TAuditable[] = [];
      for (const row of data) {
        const entityResult = this.toDomain(row);
        if (entityResult.isFailure) {
          return Result.fail(entityResult.error);
        }
        entities.push(entityResult.value);
      }

      return Result.ok(entities);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  // Soft deletion operations
  async softDelete(id: TId, context: AuditContext, reason?: string): Promise<Result<void>> {
    const contextValidation = this.validateAuditContext(context);
    if (contextValidation.isFailure) {
      return Result.fail(contextValidation.error);
    }

    return this.executeTransaction(async (client) => {
      // Get entity before deletion for audit
      const entityResult = await this.performFindById(id);
      if (entityResult.isFailure || !entityResult.value) {
        throw new Error('Entity not found for soft deletion');
      }

      // Update entity with soft delete fields
      const now = new Date();
      const { error } = await client
        .from(this.entityTableName)
        .update({
          is_deleted: true,
          deleted_at: now.toISOString(),
          deleted_by: context.userId,
          deletion_reason: reason,
          updated_at: now.toISOString(),
          updated_by: context.userId
        })
        .eq('id', id);

      if (error) {
        throw new Error(this.translateDatabaseError(error));
      }

      // Create audit log entry
      const auditResult = await this.createAuditLogEntry(
        entityResult.value,
        'DELETE',
        { ...context, reason },
        this.fromDomain(entityResult.value),
        { is_deleted: true, deleted_at: now, deleted_by: context.userId }
      );

      if (auditResult.isFailure) {
        throw new Error(`Audit logging failed: ${auditResult.error}`);
      }
    });
  }

  async restore(id: TId, context: AuditContext): Promise<Result<TAuditable>> {
    const contextValidation = this.validateAuditContext(context);
    if (contextValidation.isFailure) {
      return Result.fail(contextValidation.error);
    }

    return this.executeTransaction(async (client) => {
      // Get deleted entity
      const deletedEntityResult = await this.findByIdWithAudit(id, context, true);
      if (deletedEntityResult.isFailure || !deletedEntityResult.value) {
        throw new Error('Deleted entity not found for restoration');
      }

      const entity = deletedEntityResult.value as any;
      if (!entity.isDeleted) {
        throw new Error('Entity is not deleted and does not need restoration');
      }

      // Restore entity
      const now = new Date();
      const { data: restoredEntity, error } = await client
        .from(this.entityTableName)
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
          deletion_reason: null,
          updated_at: now.toISOString(),
          updated_by: context.userId
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(this.translateDatabaseError(error));
      }

      // Create audit log entry
      const auditResult = await this.createAuditLogEntry(
        entity,
        'RESTORE',
        context,
        { is_deleted: true },
        { is_deleted: false }
      );

      if (auditResult.isFailure) {
        throw new Error(`Audit logging failed: ${auditResult.error}`);
      }

      const domainResult = this.toDomain(restoredEntity);
      if (domainResult.isFailure) {
        throw new Error(domainResult.error);
      }

      return domainResult.value;
    });
  }

  async hardDelete(id: TId, context: AuditContext): Promise<Result<void>> {
    const contextValidation = this.validateAuditContext(context);
    if (contextValidation.isFailure) {
      return Result.fail(contextValidation.error);
    }

    // Check data retention policy
    const retentionValidation = await this.validateDataRetention(id);
    if (retentionValidation.isFailure || !retentionValidation.value) {
      return Result.fail('Hard delete blocked by data retention policy');
    }

    return this.executeTransaction(async (client) => {
      // Get entity before hard deletion for audit
      const entityResult = await this.findByIdWithAudit(id, context, true);
      if (entityResult.isFailure || !entityResult.value) {
        throw new Error('Entity not found for hard deletion');
      }

      // Perform hard delete
      const { error } = await client
        .from(this.entityTableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(this.translateDatabaseError(error));
      }

      // Create audit log entry (this will remain even after entity is deleted)
      const auditResult = await this.createAuditLogEntry(
        entityResult.value,
        'DELETE',
        { ...context, operation: 'HARD_DELETE' },
        this.fromDomain(entityResult.value),
        null
      );

      if (auditResult.isFailure) {
        throw new Error(`Audit logging failed: ${auditResult.error}`);
      }
    });
  }

  // Audit operations
  async getAuditTrail(id: TId, limit?: number): Promise<Result<AuditLogEntry[]>> {
    try {
      let query = this.supabase
        .from(this.auditLogTableName)
        .select('*')
        .eq('entity_id', id)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      if (!data) {
        return Result.ok([]);
      }

      const auditEntries: AuditLogEntry[] = data.map(row => ({
        auditId: row.audit_id,
        entityId: row.entity_id,
        entityType: row.entity_type,
        operation: row.operation,
        oldValues: row.old_values,
        newValues: row.new_values,
        changedFields: row.changed_fields || [],
        context: {
          userId: row.user_id,
          userRole: row.user_role,
          sessionId: row.session_id,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          timestamp: new Date(row.operation_timestamp),
          operation: row.operation,
          reason: row.operation_reason,
          metadata: row.operation_metadata
        },
        createdAt: new Date(row.created_at),
        isSystemOperation: row.is_system_operation
      }));

      return Result.ok(auditEntries);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  async getAuditSummary(id: TId): Promise<Result<any>> {
    try {
      const auditTrailResult = await this.getAuditTrail(id);
      if (auditTrailResult.isFailure) {
        return Result.fail(auditTrailResult.error);
      }

      const auditEntries = auditTrailResult.value;
      
      if (auditEntries.length === 0) {
        return Result.ok({
          totalOperations: 0,
          operationCounts: {},
          firstOperation: null,
          lastOperation: null,
          uniqueUsers: []
        });
      }

      // Calculate summary statistics
      const operationCounts = auditEntries.reduce((counts, entry) => {
        counts[entry.operation] = (counts[entry.operation] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      const uniqueUsers = [...new Set(auditEntries.map(entry => entry.context.userId))];

      const summary = {
        totalOperations: auditEntries.length,
        operationCounts,
        firstOperation: auditEntries[auditEntries.length - 1],
        lastOperation: auditEntries[0],
        uniqueUsers
      };

      return Result.ok(summary);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  async findByAuditCriteria(criteria: any): Promise<Result<AuditLogEntry[]>> {
    try {
      let query = this.supabase.from(this.auditLogTableName).select('*');

      // Apply filters
      if (criteria.entityId) {
        query = query.eq('entity_id', criteria.entityId);
      }
      if (criteria.operation) {
        query = query.eq('operation', criteria.operation);
      }
      if (criteria.userId) {
        query = query.eq('user_id', criteria.userId);
      }
      if (criteria.entityType) {
        query = query.eq('entity_type', criteria.entityType);
      }
      if (criteria.dateRange) {
        query = query
          .gte('created_at', criteria.dateRange.from.toISOString())
          .lte('created_at', criteria.dateRange.to.toISOString());
      }

      // Special criteria for detecting suspicious activity
      if (criteria.rapidOperations) {
        query = query.gte('created_at', new Date(Date.now() - (criteria.timeWindow || 3600000)).toISOString());
      }

      const limit = criteria.limit && criteria.limit <= 1000 ? criteria.limit : 100;
      query = query.limit(limit).order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      const auditEntries: AuditLogEntry[] = (data || []).map(row => ({
        auditId: row.audit_id,
        entityId: row.entity_id,
        entityType: row.entity_type,
        operation: row.operation,
        oldValues: row.old_values,
        newValues: row.new_values,
        changedFields: row.changed_fields || [],
        context: {
          userId: row.user_id,
          userRole: row.user_role,
          sessionId: row.session_id,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          timestamp: new Date(row.operation_timestamp),
          operation: row.operation,
          reason: row.operation_reason,
          metadata: row.operation_metadata
        },
        createdAt: new Date(row.created_at),
        isSystemOperation: row.is_system_operation
      }));

      return Result.ok(auditEntries);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  // Compliance and retention
  async scheduleDataPurge(id: TId, purgeAfterDays: number, context: AuditContext): Promise<Result<void>> {
    const contextValidation = this.validateAuditContext(context);
    if (contextValidation.isFailure) {
      return Result.fail(contextValidation.error);
    }

    try {
      const purgeDate = new Date();
      purgeDate.setDate(purgeDate.getDate() + purgeAfterDays);

      // This would typically update a separate purge schedule table
      // For now, we'll just update a field on the entity
      const { error } = await this.supabase
        .from(this.entityTableName)
        .update({
          scheduled_purge_at: purgeDate.toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: context.userId
        })
        .eq('id', id);

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  async findDeletedEntities(olderThanDays: number = 90): Promise<Result<TAuditable[]>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data, error } = await this.supabase
        .from(this.entityTableName)
        .select('*')
        .eq('is_deleted', true)
        .lt('deleted_at', cutoffDate.toISOString());

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      if (!data) {
        return Result.ok([]);
      }

      const entities: TAuditable[] = [];
      for (const row of data) {
        const entityResult = this.toDomain(row);
        if (entityResult.isFailure) {
          return Result.fail(entityResult.error);
        }
        entities.push(entityResult.value);
      }

      return Result.ok(entities);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  async validateDataRetention(id: TId): Promise<Result<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from(this.entityTableName)
        .select('deleted_at, scheduled_purge_at')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return Result.ok(true); // Entity doesn't exist, can delete
        }
        return Result.fail(this.translateDatabaseError(error));
      }

      if (!data) {
        return Result.ok(true);
      }

      // Check if entity is within retention period
      if (data.deleted_at) {
        const deletedDate = new Date(data.deleted_at);
        const retentionPeriod = 30; // days
        const retentionExpiry = new Date(deletedDate);
        retentionExpiry.setDate(retentionExpiry.getDate() + retentionPeriod);

        const canDelete = new Date() > retentionExpiry;
        return Result.ok(canDelete);
      }

      return Result.ok(false); // Not deleted, cannot hard delete
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  // Audit logging infrastructure
  protected async createAuditLogEntry(
    entity: TAuditable,
    operation: string,
    context: AuditContext,
    oldValues?: any,
    newValues?: any
  ): Promise<Result<void>> {
    try {
      const entityData = entity as any;
      const changedFields = oldValues && newValues ? 
        this.calculateChangedFields(oldValues, newValues) : [];

      const auditEntry = {
        audit_id: this.generateAuditId(),
        entity_id: entityData.id,
        entity_type: this.entityTypeName,
        operation,
        old_values: oldValues,
        new_values: newValues,
        changed_fields: changedFields,
        user_id: context.userId,
        user_role: context.userRole,
        session_id: context.sessionId,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        operation_timestamp: context.timestamp.toISOString(),
        operation_reason: context.reason,
        operation_metadata: context.metadata,
        is_system_operation: context.userId === 'SYSTEM',
        created_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from(this.auditLogTableName)
        .insert(auditEntry);

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : String(error));
    }
  }

  protected calculateChangedFields(oldValues: any, newValues: any): string[] {
    const changedFields: string[] = [];
    
    if (!oldValues || !newValues) {
      return changedFields;
    }

    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
    
    for (const key of allKeys) {
      if (oldValues[key] !== newValues[key]) {
        changedFields.push(key);
      }
    }

    // Exclude audit metadata fields
    return changedFields.filter(field => 
      !['updated_at', 'updated_by', 'version'].includes(field)
    );
  }

  protected validateAuditContext(context: AuditContext): Result<void> {
    if (!context) {
      return Result.fail('Audit context is required');
    }

    const requiredFields = ['userId', 'userRole', 'sessionId', 'ipAddress', 'userAgent', 'timestamp'];
    const missingFields = requiredFields.filter(field => !context[field as keyof AuditContext]);

    if (missingFields.length > 0) {
      return Result.fail(`Audit context missing required fields: ${missingFields.join(', ')}`);
    }

    return Result.ok(undefined);
  }

  protected async ensureAuditTrailIntegrity(entityId: TId): Promise<Result<void>> {
    try {
      // Verify audit trail exists and is complete
      const auditTrailResult = await this.getAuditTrail(entityId);
      if (auditTrailResult.isFailure) {
        return Result.fail(`Audit trail integrity check failed: ${auditTrailResult.error}`);
      }

      // Additional integrity checks could be added here
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : String(error));
    }
  }

  // Helper methods
  private generateAuditId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}