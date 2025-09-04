import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SupabaseClient } from '@supabase/supabase-js';
import { Result } from '../../../../lib/domain/shared/result';

/**
 * TDD Test Specification for BaseAuditableRepository<TAuditable, TId>
 * 
 * This test specification defines the behavior contract for repositories that manage
 * auditable entities with complete audit trails and soft deletion capabilities.
 * 
 * RED PHASE: These tests are designed to FAIL initially to drive TDD implementation.
 * 
 * ARCHITECTURAL BOUNDARIES VALIDATED:
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

// Soft deletion information
interface SoftDeletionInfo {
  deletedAt: Date;
  deletedBy: string;
  deletionReason?: string;
  isRecoverable: boolean;
  scheduledPurgeAt?: Date;
  metadata?: Record<string, any>;
}

// Mock auditable entity
interface TestAuditableEntity {
  id: string;
  name: string;
  value: string;
  status: 'active' | 'inactive' | 'archived';
  metadata: Record<string, any>;
  
  // Audit fields
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;
  
  // Soft deletion fields
  deletedAt?: Date;
  deletedBy?: string;
  deletionReason?: string;
  isDeleted: boolean;
  
  // Methods
  markAsDeleted(context: AuditContext, reason?: string): void;
  restore(context: AuditContext): void;
  canBeRecovered(): boolean;
}

// Database row structures
interface AuditableEntityRow {
  id: string;
  name: string;
  value: string;
  status: string;
  metadata: Record<string, any>;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  version: number;
  deleted_at?: string;
  deleted_by?: string;
  deletion_reason?: string;
  is_deleted: boolean;
}

interface AuditLogRow {
  audit_id: string;
  entity_id: string;
  entity_type: string;
  operation: string;
  old_values?: any;
  new_values?: any;
  changed_fields: string[];
  user_id: string;
  user_role: string;
  session_id: string;
  ip_address: string;
  user_agent: string;
  operation_timestamp: string;
  operation_reason?: string;
  operation_metadata?: Record<string, any>;
  is_system_operation: boolean;
  created_at: string;
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

// Base class to be implemented (TDD RED PHASE)
abstract class BaseAuditableRepository<TAuditable, TId> implements IAuditableRepository<TAuditable, TId> {
  protected constructor(
    protected readonly supabase: SupabaseClient,
    protected readonly entityTableName: string,
    protected readonly auditLogTableName: string,
    protected readonly entityTypeName: string
  ) {}

  // Core operations with audit context
  abstract save(entity: TAuditable, context: AuditContext): Promise<Result<TAuditable>>;
  abstract findById(id: TId, context: AuditContext, includeDeleted?: boolean): Promise<Result<TAuditable | null>>;
  abstract findAll(criteria: any, context: AuditContext, includeDeleted?: boolean): Promise<Result<TAuditable[]>>;

  // Soft deletion operations
  abstract softDelete(id: TId, context: AuditContext, reason?: string): Promise<Result<void>>;
  abstract restore(id: TId, context: AuditContext): Promise<Result<TAuditable>>;
  abstract hardDelete(id: TId, context: AuditContext): Promise<Result<void>>;

  // Audit operations
  abstract getAuditTrail(id: TId, limit?: number): Promise<Result<AuditLogEntry[]>>;
  abstract getAuditSummary(id: TId): Promise<Result<any>>;
  abstract findByAuditCriteria(criteria: any): Promise<Result<AuditLogEntry[]>>;

  // Compliance and retention
  abstract scheduleDataPurge(id: TId, purgeAfterDays: number, context: AuditContext): Promise<Result<void>>;
  abstract findDeletedEntities(olderThanDays?: number): Promise<Result<TAuditable[]>>;
  abstract validateDataRetention(id: TId): Promise<Result<boolean>>;

  // Audit logging infrastructure
  protected abstract createAuditLogEntry(
    entity: TAuditable,
    operation: string,
    context: AuditContext,
    oldValues?: any,
    newValues?: any
  ): Promise<Result<void>>;

  protected abstract calculateChangedFields(oldValues: any, newValues: any): string[];
  protected abstract validateAuditContext(context: AuditContext): Result<void>;
  protected abstract ensureAuditTrailIntegrity(entityId: TId): Promise<Result<void>>;
}

// Test implementation
class TestAuditableEntityRepository extends BaseAuditableRepository<TestAuditableEntity, string> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'test_auditable_entities', 'audit_logs', 'TestAuditableEntity');
  }

  async save(entity: TestAuditableEntity, context: AuditContext): Promise<Result<TestAuditableEntity>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async findById(id: string, context: AuditContext, includeDeleted?: boolean): Promise<Result<TestAuditableEntity | null>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async findAll(criteria: any, context: AuditContext, includeDeleted?: boolean): Promise<Result<TestAuditableEntity[]>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async softDelete(id: string, context: AuditContext, reason?: string): Promise<Result<void>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async restore(id: string, context: AuditContext): Promise<Result<TestAuditableEntity>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async hardDelete(id: string, context: AuditContext): Promise<Result<void>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async getAuditTrail(id: string, limit?: number): Promise<Result<AuditLogEntry[]>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async getAuditSummary(id: string): Promise<Result<any>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async findByAuditCriteria(criteria: any): Promise<Result<AuditLogEntry[]>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async scheduleDataPurge(id: string, purgeAfterDays: number, context: AuditContext): Promise<Result<void>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async findDeletedEntities(olderThanDays?: number): Promise<Result<TestAuditableEntity[]>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  async validateDataRetention(id: string): Promise<Result<boolean>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  protected async createAuditLogEntry(
    entity: TestAuditableEntity,
    operation: string,
    context: AuditContext,
    oldValues?: any,
    newValues?: any
  ): Promise<Result<void>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  protected calculateChangedFields(oldValues: any, newValues: any): string[] {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  protected validateAuditContext(context: AuditContext): Result<void> {
    throw new Error('Not implemented - TDD RED PHASE');
  }

  protected async ensureAuditTrailIntegrity(entityId: string): Promise<Result<void>> {
    throw new Error('Not implemented - TDD RED PHASE');
  }
}

describe('BaseAuditableRepository<TAuditable, TId> - TDD Specification', () => {
  let mockSupabase: SupabaseClient;
  let repository: TestAuditableEntityRepository;
  let mockContext: AuditContext;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      })
    } as any;

    repository = new TestAuditableEntityRepository(mockSupabase);

    mockContext = {
      userId: 'user-123',
      userRole: 'admin',
      sessionId: 'session-456',
      ipAddress: '192.168.1.100',
      userAgent: 'Test Browser',
      timestamp: new Date(),
      operation: 'UPDATE',
      reason: 'Testing audit functionality'
    };
  });

  describe('Audit Context Validation and Tracking', () => {
    it('should require valid audit context for all operations', async () => {
      // RED PHASE: All operations must include audit context
      const invalidContext = {} as AuditContext; // Missing required fields
      const entity: TestAuditableEntity = {
        id: 'test-1',
        name: 'Test Entity',
        value: 'test value',
        status: 'active',
        metadata: {},
        createdAt: new Date(),
        createdBy: 'user-123',
        updatedAt: new Date(),
        updatedBy: 'user-123',
        version: 1,
        isDeleted: false,
        markAsDeleted: jest.fn(),
        restore: jest.fn(),
        canBeRecovered: jest.fn()
      };

      const result = await repository.save(entity, invalidContext);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('audit context');
    });

    it('should validate audit context completeness and integrity', () => {
      // RED PHASE: Audit context must contain all required fields
      const incompleteContext = {
        userId: 'user-123',
        // Missing sessionId, ipAddress, etc.
      } as AuditContext;

      const validationResult = repository['validateAuditContext'](incompleteContext);
      
      expect(validationResult).toBeInstanceOf(Result);
      expect(validationResult.isFailure).toBe(true);
      expect(validationResult.error).toContain('required');
    });

    it('should record read operations in audit log for sensitive entities', async () => {
      // RED PHASE: Even read operations should be auditable
      const entityId = 'sensitive-entity-1';
      
      const result = await repository.findById(entityId, mockContext);
      
      expect(result).toBeInstanceOf(Result);
      // Should create audit log entry for READ operation
    });

    it('should track user session and security context', async () => {
      // RED PHASE: Repository must capture complete security context
      const entityId = 'security-test-1';
      
      await repository.findById(entityId, mockContext);
      
      // Should verify that context was captured including IP, session, user agent
      expect(mockContext.sessionId).toBe('session-456');
      expect(mockContext.ipAddress).toBe('192.168.1.100');
      expect(mockContext.userAgent).toBe('Test Browser');
    });
  });

  describe('Comprehensive Audit Logging', () => {
    it('should create audit log entries for all CRUD operations', async () => {
      // RED PHASE: Repository must log every operation
      const entity: TestAuditableEntity = {
        id: 'audit-test-1',
        name: 'Audit Entity',
        value: 'initial value',
        status: 'active',
        metadata: { source: 'test' },
        createdAt: new Date(),
        createdBy: 'user-123',
        updatedAt: new Date(),
        updatedBy: 'user-123',
        version: 1,
        isDeleted: false,
        markAsDeleted: jest.fn(),
        restore: jest.fn(),
        canBeRecovered: jest.fn()
      };

      const result = await repository.save(entity, mockContext);
      
      expect(result).toBeInstanceOf(Result);
      // Should create audit log entry with operation type, user, timestamp
    });

    it('should capture field-level changes and old/new values', async () => {
      // RED PHASE: Audit must track what specifically changed
      const oldEntity = {
        id: 'change-test-1',
        name: 'Original Name',
        value: 'original value',
        status: 'active'
      };

      const newEntity = {
        id: 'change-test-1',
        name: 'Updated Name',
        value: 'updated value',
        status: 'active'
      };

      const changedFields = repository['calculateChangedFields'](oldEntity, newEntity);
      
      expect(changedFields).toContain('name');
      expect(changedFields).toContain('value');
      expect(changedFields).not.toContain('status');
      expect(changedFields).not.toContain('id');
    });

    it('should maintain immutable audit trail', async () => {
      // RED PHASE: Audit logs must never be modifiable after creation
      const entityId = 'immutable-test-1';
      
      // Create initial audit entry
      await repository.save({
        id: entityId,
        name: 'Test',
        value: 'test',
        status: 'active',
        metadata: {},
        createdAt: new Date(),
        createdBy: 'user-123',
        updatedAt: new Date(),
        updatedBy: 'user-123',
        version: 1,
        isDeleted: false,
        markAsDeleted: jest.fn(),
        restore: jest.fn(),
        canBeRecovered: jest.fn()
      }, mockContext);

      // Verify audit trail integrity
      const integrityResult = await repository['ensureAuditTrailIntegrity'](entityId);
      
      expect(integrityResult).toBeInstanceOf(Result);
      expect(integrityResult.isSuccess).toBe(true);
    });

    it('should support audit log querying and filtering', async () => {
      // RED PHASE: Repository must provide rich audit querying capabilities
      const criteria = {
        entityId: 'query-test-1',
        operation: 'UPDATE',
        userId: 'user-123',
        dateRange: {
          from: new Date(Date.now() - 86400000), // 24 hours ago
          to: new Date()
        }
      };

      const result = await repository.findByAuditCriteria(criteria);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
    });
  });

  describe('Soft Deletion Management', () => {
    it('should implement soft deletion instead of hard deletion by default', async () => {
      // RED PHASE: Default delete should be soft delete, not hard delete
      const entityId = 'soft-delete-test-1';
      const deletionReason = 'User requested deletion';

      const result = await repository.softDelete(entityId, mockContext, deletionReason);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      
      // Entity should still exist in database but marked as deleted
      const findResult = await repository.findById(entityId, mockContext, true); // includeDeleted = true
      expect(findResult.isSuccess).toBe(true);
      expect(findResult.value?.isDeleted).toBe(true);
    });

    it('should exclude soft-deleted entities from normal queries', async () => {
      // RED PHASE: Soft-deleted entities should not appear in regular queries
      const entityId = 'excluded-test-1';
      
      // First soft delete the entity
      await repository.softDelete(entityId, mockContext);
      
      // Normal query should not return it
      const normalResult = await repository.findById(entityId, mockContext);
      expect(normalResult.isSuccess).toBe(true);
      expect(normalResult.value).toBeNull();
      
      // Query with includeDeleted should return it
      const includeDeletedResult = await repository.findById(entityId, mockContext, true);
      expect(includeDeletedResult.isSuccess).toBe(true);
      expect(includeDeletedResult.value).not.toBeNull();
    });

    it('should support entity restoration from soft deletion', async () => {
      // RED PHASE: Soft-deleted entities should be restorable
      const entityId = 'restore-test-1';
      
      // Soft delete first
      await repository.softDelete(entityId, mockContext);
      
      // Then restore
      const restoreResult = await repository.restore(entityId, mockContext);
      
      expect(restoreResult).toBeInstanceOf(Result);
      expect(restoreResult.isSuccess).toBe(true);
      expect(restoreResult.value.isDeleted).toBe(false);
      expect(restoreResult.value.deletedAt).toBeUndefined();
    });

    it('should track deletion metadata including reason and recovery status', async () => {
      // RED PHASE: Soft deletion must track comprehensive metadata
      const entityId = 'metadata-test-1';
      const deletionReason = 'Data privacy request';

      await repository.softDelete(entityId, mockContext, deletionReason);
      
      const deletedEntity = await repository.findById(entityId, mockContext, true);
      
      expect(deletedEntity.isSuccess).toBe(true);
      expect(deletedEntity.value?.deletionReason).toBe(deletionReason);
      expect(deletedEntity.value?.deletedBy).toBe(mockContext.userId);
      expect(deletedEntity.value?.deletedAt).toBeInstanceOf(Date);
    });

    it('should differentiate between recoverable and non-recoverable deletions', async () => {
      // RED PHASE: Some deletions may be permanent due to compliance requirements
      const entity: TestAuditableEntity = {
        id: 'recoverable-test-1',
        name: 'Recoverable Entity',
        value: 'test value',
        status: 'active',
        metadata: { sensitiveData: true },
        createdAt: new Date(),
        createdBy: 'user-123',
        updatedAt: new Date(),
        updatedBy: 'user-123',
        version: 1,
        isDeleted: false,
        markAsDeleted: jest.fn(),
        restore: jest.fn(),
        canBeRecovered: jest.fn().mockReturnValue(false) // Not recoverable
      };

      const canRecover = entity.canBeRecovered();
      
      expect(canRecover).toBe(false);
    });
  });

  describe('Data Retention and Compliance', () => {
    it('should support scheduled data purging for compliance', async () => {
      // RED PHASE: Repository must support automated data purging
      const entityId = 'purge-test-1';
      const purgeAfterDays = 30;

      const result = await repository.scheduleDataPurge(entityId, purgeAfterDays, mockContext);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
    });

    it('should find entities eligible for purging based on retention policies', async () => {
      // RED PHASE: Repository should identify entities that can be purged
      const olderThanDays = 90;

      const result = await repository.findDeletedEntities(olderThanDays);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
    });

    it('should validate data retention requirements before operations', async () => {
      // RED PHASE: Repository must enforce retention policies
      const entityId = 'retention-test-1';

      const validationResult = await repository.validateDataRetention(entityId);
      
      expect(validationResult).toBeInstanceOf(Result);
      expect(validationResult.isSuccess).toBe(true);
      expect(typeof validationResult.value).toBe('boolean');
    });

    it('should prevent hard deletion of entities within retention period', async () => {
      // RED PHASE: Hard delete should respect retention policies
      const entityId = 'retention-prevent-test-1';

      const hardDeleteResult = await repository.hardDelete(entityId, mockContext);
      
      expect(hardDeleteResult).toBeInstanceOf(Result);
      // Should fail if within retention period
      if (hardDeleteResult.isFailure) {
        expect(hardDeleteResult.error).toContain('retention');
      }
    });
  });

  describe('Audit Trail Analysis and Reporting', () => {
    it('should provide complete audit trail for entities', async () => {
      // RED PHASE: Repository must provide full operation history
      const entityId = 'trail-test-1';

      const auditTrail = await repository.getAuditTrail(entityId);
      
      expect(auditTrail).toBeInstanceOf(Result);
      expect(auditTrail.isSuccess).toBe(true);
      expect(Array.isArray(auditTrail.value)).toBe(true);
      
      // Each entry should contain complete audit information
      auditTrail.value.forEach(entry => {
        expect(entry).toHaveProperty('auditId');
        expect(entry).toHaveProperty('operation');
        expect(entry).toHaveProperty('context');
        expect(entry).toHaveProperty('createdAt');
        expect(entry.context).toHaveProperty('userId');
      });
    });

    it('should provide audit summary with operation counts and timeline', async () => {
      // RED PHASE: Repository should provide summary views of audit data
      const entityId = 'summary-test-1';

      const summary = await repository.getAuditSummary(entityId);
      
      expect(summary).toBeInstanceOf(Result);
      expect(summary.isSuccess).toBe(true);
      expect(summary.value).toHaveProperty('totalOperations');
      expect(summary.value).toHaveProperty('operationCounts');
      expect(summary.value).toHaveProperty('firstOperation');
      expect(summary.value).toHaveProperty('lastOperation');
      expect(summary.value).toHaveProperty('uniqueUsers');
    });

    it('should support audit trail pagination for large histories', async () => {
      // RED PHASE: Large audit trails should support pagination
      const entityId = 'pagination-test-1';
      const limit = 10;

      const limitedTrail = await repository.getAuditTrail(entityId, limit);
      
      expect(limitedTrail).toBeInstanceOf(Result);
      expect(limitedTrail.isSuccess).toBe(true);
      expect(limitedTrail.value.length).toBeLessThanOrEqual(limit);
    });

    it('should detect suspicious activity patterns in audit logs', async () => {
      // RED PHASE: Repository should help identify security issues
      const suspiciousCriteria = {
        rapidOperations: true,
        unusualHours: true,
        multipleFailedAccess: true,
        timeWindow: 3600000 // 1 hour in milliseconds
      };

      const suspiciousActivity = await repository.findByAuditCriteria(suspiciousCriteria);
      
      expect(suspiciousActivity).toBeInstanceOf(Result);
      expect(suspiciousActivity.isSuccess).toBe(true);
    });
  });

  describe('System Operations and Automation', () => {
    it('should distinguish between user operations and system operations', async () => {
      // RED PHASE: System operations should be marked differently in audit logs
      const systemContext: AuditContext = {
        ...mockContext,
        userId: 'SYSTEM',
        userRole: 'system',
        operation: 'AUTOMATED_CLEANUP'
      };

      const entityId = 'system-op-test-1';
      
      await repository.softDelete(entityId, systemContext, 'Automated data retention');
      
      const auditTrail = await repository.getAuditTrail(entityId);
      
      expect(auditTrail.isSuccess).toBe(true);
      const systemOperations = auditTrail.value.filter(entry => entry.isSystemOperation);
      expect(systemOperations.length).toBeGreaterThan(0);
    });

    it('should support bulk audit operations for system processes', async () => {
      // RED PHASE: System processes may need to operate on multiple entities
      const criteria = {
        entityIds: ['bulk-1', 'bulk-2', 'bulk-3'],
        operation: 'SYSTEM_UPDATE',
        batchId: 'batch-123'
      };

      const result = await repository.findByAuditCriteria(criteria);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
    });

    it('should maintain audit log integrity during system operations', async () => {
      // RED PHASE: System operations must not compromise audit integrity
      const systemContext: AuditContext = {
        ...mockContext,
        userId: 'SYSTEM',
        userRole: 'system'
      };

      const entity: TestAuditableEntity = {
        id: 'integrity-test-1',
        name: 'Integrity Test',
        value: 'test value',
        status: 'active',
        metadata: {},
        createdAt: new Date(),
        createdBy: 'SYSTEM',
        updatedAt: new Date(),
        updatedBy: 'SYSTEM',
        version: 1,
        isDeleted: false,
        markAsDeleted: jest.fn(),
        restore: jest.fn(),
        canBeRecovered: jest.fn()
      };

      await repository.save(entity, systemContext);
      
      const integrityCheck = await repository['ensureAuditTrailIntegrity']('integrity-test-1');
      
      expect(integrityCheck).toBeInstanceOf(Result);
      expect(integrityCheck.isSuccess).toBe(true);
    });
  });

  describe('Performance and Storage Optimization', () => {
    it('should efficiently store audit logs without impacting entity operations', async () => {
      // RED PHASE: Audit logging should not significantly impact performance
      const entity: TestAuditableEntity = {
        id: 'performance-test-1',
        name: 'Performance Test',
        value: 'test value',
        status: 'active',
        metadata: {},
        createdAt: new Date(),
        createdBy: 'user-123',
        updatedAt: new Date(),
        updatedBy: 'user-123',
        version: 1,
        isDeleted: false,
        markAsDeleted: jest.fn(),
        restore: jest.fn(),
        canBeRecovered: jest.fn()
      };

      const startTime = Date.now();
      const result = await repository.save(entity, mockContext);
      const endTime = Date.now();
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should support audit log archiving for long-term storage', async () => {
      // RED PHASE: Old audit logs should be archivable for storage efficiency
      const archiveCriteria = {
        olderThanDays: 365,
        includeSystemOperations: false
      };

      const archivableEntries = await repository.findByAuditCriteria(archiveCriteria);
      
      expect(archivableEntries).toBeInstanceOf(Result);
      expect(archivableEntries.isSuccess).toBe(true);
    });

    it('should optimize audit queries for large datasets', async () => {
      // RED PHASE: Audit queries should be efficient even with millions of entries
      const criteria = {
        entityType: 'TestAuditableEntity',
        dateRange: {
          from: new Date(Date.now() - 30 * 86400000), // 30 days ago
          to: new Date()
        },
        limit: 1000
      };

      const result = await repository.findByAuditCriteria(criteria);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.value.length).toBeLessThanOrEqual(1000);
    });
  });
});