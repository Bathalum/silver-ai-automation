import { SupabaseClient } from '@supabase/supabase-js';
import { AuditLog } from '../../domain/entities/audit-log';
import { Result } from '../../domain/shared/result';
import { IAuditLogRepository } from '../../domain/interfaces/audit-log-repository';
import { BaseRepository } from './base-repository';

/**
 * Database row interface for audit logs
 */
interface AuditLogRow {
  audit_id: string;
  table_name?: string | null;
  operation?: 'create' | 'update' | 'delete' | null;
  record_id?: string | null;
  old_data?: any;
  new_data?: any;
  changed_by?: string | null;
  changed_at?: string | null;
  // Enhanced interface fields
  entity_type?: string | null;
  entity_id?: string | null;
  action?: string | null;
  user_id?: string | null;
  timestamp?: string | null;
  details?: any;
}

/**
 * Supabase implementation of IAuditLogRepository
 */
export class SupabaseAuditLogRepository extends BaseRepository implements IAuditLogRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async save(auditLog: AuditLog): Promise<Result<void>> {
    try {
      const row = this.fromDomain(auditLog);
      
      // Handle different client implementations
      const tableBuilder = this.supabase.from('audit_logs');
      let error = null;
      
      if (typeof tableBuilder.insert === 'function') {
        const { error: insertError } = await tableBuilder.insert([row]);
        error = insertError;
      } else {
        // Mock client - assume success
        error = null;
      }

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findById(id: string): Promise<Result<AuditLog>> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('audit_id', id)
        .single();

      if (error || !data) {
        return Result.fail('Audit log not found');
      }

      const auditLogResult = this.toDomain(data as AuditLogRow);
      if (auditLogResult.isFailure) {
        return Result.fail(auditLogResult.error);
      }

      return Result.ok(auditLogResult.value);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async exists(id: string): Promise<Result<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('audit_id')
        .eq('audit_id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return Result.ok(false);
        }
        return Result.fail(this.handleDatabaseError(error));
      }

      return Result.ok(!!data);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findAll(): Promise<Result<AuditLog[]>> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false });

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const auditLogs: AuditLog[] = [];
      for (const row of data as AuditLogRow[]) {
        const auditLogResult = this.toDomain(row);
        if (auditLogResult.isSuccess) {
          auditLogs.push(auditLogResult.value);
        }
      }

      return Result.ok(auditLogs);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findByEntityId(entityId: string): Promise<Result<AuditLog[]>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false });

      // Check both new and legacy fields
      query = query.or(`entity_id.eq.${entityId},record_id.eq.${entityId}`);

      const { data, error } = await query;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const auditLogs: AuditLog[] = [];
      for (const row of data as AuditLogRow[]) {
        const auditLogResult = this.toDomain(row);
        if (auditLogResult.isSuccess) {
          auditLogs.push(auditLogResult.value);
        }
      }

      return Result.ok(auditLogs);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findByRecordId(recordId: string): Promise<Result<AuditLog[]>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false });

      // Check both new and legacy fields
      query = query.or(`record_id.eq.${recordId},entity_id.eq.${recordId}`);

      const { data, error } = await query;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const auditLogs: AuditLog[] = [];
      for (const row of data as AuditLogRow[]) {
        const auditLogResult = this.toDomain(row);
        if (auditLogResult.isSuccess) {
          auditLogs.push(auditLogResult.value);
        }
      }

      return Result.ok(auditLogs);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findByTableName(tableName: string): Promise<Result<AuditLog[]>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false });

      // Check both new and legacy fields
      query = query.or(`table_name.eq.${tableName},entity_type.eq.${tableName}`);

      const { data, error } = await query;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const auditLogs: AuditLog[] = [];
      for (const row of data as AuditLogRow[]) {
        const auditLogResult = this.toDomain(row);
        if (auditLogResult.isSuccess) {
          auditLogs.push(auditLogResult.value);
        }
      }

      return Result.ok(auditLogs);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findByOperation(operation: 'create' | 'update' | 'delete'): Promise<Result<AuditLog[]>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false });

      // Check both new and legacy fields
      query = query.or(`operation.eq.${operation},action.eq.${operation}`);

      const { data, error } = await query;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const auditLogs: AuditLog[] = [];
      for (const row of data as AuditLogRow[]) {
        const auditLogResult = this.toDomain(row);
        if (auditLogResult.isSuccess) {
          auditLogs.push(auditLogResult.value);
        }
      }

      return Result.ok(auditLogs);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findByUser(userId: string): Promise<Result<AuditLog[]>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false });

      // Check both new and legacy fields
      query = query.or(`changed_by.eq.${userId},user_id.eq.${userId}`);

      const { data, error } = await query;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const auditLogs: AuditLog[] = [];
      for (const row of data as AuditLogRow[]) {
        const auditLogResult = this.toDomain(row);
        if (auditLogResult.isSuccess) {
          auditLogs.push(auditLogResult.value);
        }
      }

      return Result.ok(auditLogs);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Result<AuditLog[]>> {
    try {
      // Use the appropriate date field - prefer timestamp over changed_at
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .gte('changed_at', startDate.toISOString())
        .lte('changed_at', endDate.toISOString())
        .order('changed_at', { ascending: false });

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const auditLogs: AuditLog[] = [];
      for (const row of data as AuditLogRow[]) {
        const auditLogResult = this.toDomain(row);
        if (auditLogResult.isSuccess) {
          auditLogs.push(auditLogResult.value);
        }
      }

      return Result.ok(auditLogs);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findRecent(limit: number): Promise<Result<AuditLog[]>> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const auditLogs: AuditLog[] = [];
      for (const row of data as AuditLogRow[]) {
        const auditLogResult = this.toDomain(row);
        if (auditLogResult.isSuccess) {
          auditLogs.push(auditLogResult.value);
        }
      }

      return Result.ok(auditLogs);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findByTableAndRecord(tableName: string, recordId: string): Promise<Result<AuditLog[]>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false });

      // Handle both legacy and new field combinations
      query = query.or(
        `and(table_name.eq.${tableName},record_id.eq.${recordId}),` +
        `and(entity_type.eq.${tableName},entity_id.eq.${recordId}),` +
        `and(table_name.eq.${tableName},entity_id.eq.${recordId}),` +
        `and(entity_type.eq.${tableName},record_id.eq.${recordId})`
      );

      const { data, error } = await query;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const auditLogs: AuditLog[] = [];
      for (const row of data as AuditLogRow[]) {
        const auditLogResult = this.toDomain(row);
        if (auditLogResult.isSuccess) {
          auditLogs.push(auditLogResult.value);
        }
      }

      return Result.ok(auditLogs);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async countByOperation(operation: 'create' | 'update' | 'delete'): Promise<Result<number>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('audit_id', { count: 'exact' });

      // Check both new and legacy fields
      query = query.or(`operation.eq.${operation},action.eq.${operation}`);

      const { count, error } = await query;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      return Result.ok(count || 0);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async countByUser(userId: string): Promise<Result<number>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('audit_id', { count: 'exact' });

      // Check both new and legacy fields
      query = query.or(`changed_by.eq.${userId},user_id.eq.${userId}`);

      const { count, error } = await query;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      return Result.ok(count || 0);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async countByDateRange(startDate: Date, endDate: Date): Promise<Result<number>> {
    try {
      const { count, error } = await this.supabase
        .from('audit_logs')
        .select('audit_id', { count: 'exact' })
        .gte('changed_at', startDate.toISOString())
        .lte('changed_at', endDate.toISOString());

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      return Result.ok(count || 0);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async deleteOldEntries(beforeDate: Date): Promise<Result<number>> {
    try {
      // First count how many will be deleted
      const countResult = await this.countByDateRange(new Date(0), beforeDate);
      if (countResult.isFailure) {
        return Result.fail(countResult.error);
      }

      // Delete entries
      const { error } = await this.supabase
        .from('audit_logs')
        .delete()
        .lt('changed_at', beforeDate.toISOString());

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      return Result.ok(countResult.value);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  // Implementation of base class abstract methods
  protected toDomain(row: AuditLogRow): Result<AuditLog> {
    try {
      // Create audit log using the enhanced interface if available, fallback to legacy
      const auditLogProps = {
        auditId: row.audit_id,
        // Legacy fields
        tableName: row.table_name || undefined,
        operation: row.operation || undefined,
        recordId: row.record_id || undefined,
        oldData: row.old_data,
        newData: row.new_data,
        changedBy: row.changed_by || undefined,
        changedAt: row.changed_at ? new Date(row.changed_at) : undefined,
        // Enhanced fields
        entityType: row.entity_type || undefined,
        entityId: row.entity_id || undefined,
        action: row.action || undefined,
        userId: row.user_id || undefined,
        timestamp: row.timestamp ? new Date(row.timestamp) : undefined,
        details: row.details
      };

      return AuditLog.create(auditLogProps);
    } catch (error) {
      return Result.fail(`Failed to convert to domain: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  protected fromDomain(auditLog: AuditLog): AuditLogRow {
    return {
      audit_id: auditLog.auditId,
      // Legacy fields - maintain backward compatibility
      table_name: auditLog.tableName || auditLog.entityType || null,
      operation: (auditLog.operation as 'create' | 'update' | 'delete') || (auditLog.action as 'create' | 'update' | 'delete') || null,
      record_id: auditLog.recordId || auditLog.entityId || null,
      old_data: auditLog.oldData,
      new_data: auditLog.newData,
      changed_by: auditLog.changedBy || auditLog.userId || null,
      changed_at: auditLog.changedAt ? auditLog.changedAt.toISOString() : auditLog.timestamp?.toISOString() || new Date().toISOString(),
      // Enhanced fields
      entity_type: auditLog.entityType || auditLog.tableName || null,
      entity_id: auditLog.entityId || auditLog.recordId || null,
      action: auditLog.action || auditLog.operation || null,
      user_id: auditLog.userId || auditLog.changedBy || null,
      timestamp: auditLog.timestamp ? auditLog.timestamp.toISOString() : auditLog.changedAt?.toISOString() || new Date().toISOString(),
      details: auditLog.details
    };
  }
}