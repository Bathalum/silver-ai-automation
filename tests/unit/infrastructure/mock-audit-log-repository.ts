import { Result } from '../../../lib/domain/shared/result';
import { AuditLog } from '../../../lib/domain/entities/audit-log';
import { IAuditLogRepository } from '../../../lib/domain/interfaces/audit-log-repository';

/**
 * Mock implementation of IAuditLogRepository for testing audit trail functionality
 */
export class MockAuditLogRepository implements IAuditLogRepository {
  private auditLogs: AuditLog[] = [];

  async save(auditLog: AuditLog): Promise<Result<void>> {
    this.auditLogs.push(auditLog);
    return Result.ok(undefined);
  }

  async findById(id: string): Promise<Result<AuditLog>> {
    const log = this.auditLogs.find(log => log.auditId === id);
    if (log) {
      return Result.ok(log);
    }
    return Result.fail(`Audit log with ID ${id} not found`);
  }

  async findByEntityId(entityId: string): Promise<Result<AuditLog[]>> {
    const logs = this.auditLogs.filter(log => log.entityId === entityId);
    return Result.ok(logs);
  }

  async findByRecordId(recordId: string): Promise<Result<AuditLog[]>> {
    const logs = this.auditLogs.filter(log => log.recordId === recordId);
    return Result.ok(logs);
  }

  async findByTableName(tableName: string): Promise<Result<AuditLog[]>> {
    const logs = this.auditLogs.filter(log => log.tableName === tableName);
    return Result.ok(logs);
  }

  async findByOperation(operation: 'create' | 'update' | 'delete'): Promise<Result<AuditLog[]>> {
    const logs = this.auditLogs.filter(log => log.operation === operation);
    return Result.ok(logs);
  }

  async findByUser(userId: string): Promise<Result<AuditLog[]>> {
    const logs = this.auditLogs.filter(log => log.userId === userId);
    return Result.ok(logs);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Result<AuditLog[]>> {
    const logs = this.auditLogs.filter(log => 
      log.timestamp >= startDate && log.timestamp <= endDate
    );
    return Result.ok(logs);
  }

  async findRecent(limit: number): Promise<Result<AuditLog[]>> {
    const sortedLogs = this.auditLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    return Result.ok(sortedLogs);
  }

  async findByTableAndRecord(tableName: string, recordId: string): Promise<Result<AuditLog[]>> {
    const logs = this.auditLogs.filter(log => 
      log.tableName === tableName && log.recordId === recordId
    );
    return Result.ok(logs);
  }

  async countByOperation(operation: 'create' | 'update' | 'delete'): Promise<Result<number>> {
    const count = this.auditLogs.filter(log => log.operation === operation).length;
    return Result.ok(count);
  }

  async countByUser(userId: string): Promise<Result<number>> {
    const count = this.auditLogs.filter(log => log.userId === userId).length;
    return Result.ok(count);
  }

  async countByDateRange(startDate: Date, endDate: Date): Promise<Result<number>> {
    const count = this.auditLogs.filter(log => 
      log.timestamp >= startDate && log.timestamp <= endDate
    ).length;
    return Result.ok(count);
  }

  async deleteOldEntries(beforeDate: Date): Promise<Result<number>> {
    const initialCount = this.auditLogs.length;
    this.auditLogs = this.auditLogs.filter(log => log.timestamp >= beforeDate);
    const deletedCount = initialCount - this.auditLogs.length;
    return Result.ok(deletedCount);
  }

  async exists(id: string): Promise<Result<boolean>> {
    const exists = this.auditLogs.some(log => log.auditId === id);
    return Result.ok(exists);
  }

  async findAll(): Promise<Result<AuditLog[]>> {
    return Result.ok([...this.auditLogs]);
  }

  // Helper methods for testing
  getAllAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  clear(): void {
    this.auditLogs = [];
  }
}