import { Result } from '../shared/result';
import { AuditLog } from '../entities/audit-log';

export interface IAuditLogRepository {
  save(auditLog: AuditLog): Promise<Result<void>>;
  findById(id: string): Promise<Result<AuditLog>>;
  findByEntityId(entityId: string): Promise<Result<AuditLog[]>>;
  findByRecordId(recordId: string): Promise<Result<AuditLog[]>>;
  findByTableName(tableName: string): Promise<Result<AuditLog[]>>;
  findByOperation(operation: 'create' | 'update' | 'delete'): Promise<Result<AuditLog[]>>;
  findByUser(userId: string): Promise<Result<AuditLog[]>>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Result<AuditLog[]>>;
  findRecent(limit: number): Promise<Result<AuditLog[]>>;
  findByTableAndRecord(tableName: string, recordId: string): Promise<Result<AuditLog[]>>;
  countByOperation(operation: 'create' | 'update' | 'delete'): Promise<Result<number>>;
  countByUser(userId: string): Promise<Result<number>>;
  countByDateRange(startDate: Date, endDate: Date): Promise<Result<number>>;
  deleteOldEntries(beforeDate: Date): Promise<Result<number>>;
  exists(id: string): Promise<Result<boolean>>;
  findAll(): Promise<Result<AuditLog[]>>;
}

// Keep backwards compatibility
export interface AuditLogRepository extends IAuditLogRepository {}