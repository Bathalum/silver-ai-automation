import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAuditLogRepository } from '../../../lib/infrastructure/repositories/supabase-audit-log-repository';
import { AuditLog } from '../../../lib/domain/entities/audit-log';
import { Result } from '../../../lib/domain/shared/result';

describe('SupabaseAuditLogRepository Integration Tests', () => {
  let repository: SupabaseAuditLogRepository;
  let mockClient: any;
  let testAuditLog: AuditLog;
  
  beforeEach(() => {
    // Create mock Supabase client
    mockClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    } as any;

    repository = new SupabaseAuditLogRepository(mockClient);
    
    // Create test audit log
    const auditLogResult = AuditLog.create({
      auditId: 'test-audit-id',
      tableName: 'function_models',
      operation: 'create',
      recordId: 'test-model-id',
      newData: { name: 'Test Model' },
      changedBy: 'test-user-id'
    });
    
    expect(auditLogResult.isSuccess).toBe(true);
    testAuditLog = auditLogResult.value;
  });

  describe('save', () => {
    it('should save audit log to database', async () => {
      // Arrange
      mockClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ 
          error: null,
          data: [{}]
        })
      } as any);

      // Act
      const result = await repository.save(testAuditLog);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockClient.from).toHaveBeenCalledWith('audit_logs');
    });

    it('should handle save errors', async () => {
      // Arrange
      mockClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ 
          error: new Error('Insert failed')
        })
      } as any);

      // Act
      const result = await repository.save(testAuditLog);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Insert failed');
    });
  });

  describe('findById', () => {
    it('should find audit log by ID', async () => {
      // Arrange
      const mockData = {
        audit_id: 'test-audit-id',
        table_name: 'function_models',
        operation: 'create',
        record_id: 'test-model-id',
        old_data: null,
        new_data: { name: 'Test Model' },
        changed_by: 'test-user-id',
        changed_at: new Date().toISOString(),
        // Enhanced fields
        entity_type: 'function_models',
        entity_id: 'test-model-id',
        action: 'create',
        user_id: 'test-user-id',
        timestamp: new Date().toISOString(),
        details: null
      };

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              error: null,
              data: mockData
            })
          })
        })
      } as any);

      // Act
      const result = await repository.findById('test-audit-id');

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.auditId).toBe('test-audit-id');
    });

    it('should return failure for non-existent audit log', async () => {
      // Arrange
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              error: null,
              data: null
            })
          })
        })
      } as any);

      // Act
      const result = await repository.findById('non-existent-id');

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Audit log not found');
    });
  });

  describe('exists', () => {
    it('should return true for existing audit log', async () => {
      // Arrange
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              error: null,
              data: { audit_id: 'test-audit-id' }
            })
          })
        })
      } as any);

      // Act
      const result = await repository.exists('test-audit-id');

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should return false for non-existent audit log', async () => {
      // Arrange
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              error: null,
              data: null
            })
          })
        })
      } as any);

      // Act
      const result = await repository.exists('non-existent-id');

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should find all audit logs', async () => {
      // Arrange
      const mockData = [{
        audit_id: 'test-audit-id-1',
        table_name: 'function_models',
        operation: 'create',
        record_id: 'test-model-id-1',
        old_data: null,
        new_data: { name: 'Test Model 1' },
        changed_by: 'test-user-id',
        changed_at: new Date().toISOString(),
        // Enhanced fields
        entity_type: 'function_models',
        entity_id: 'test-model-id-1',
        action: 'create',
        user_id: 'test-user-id',
        timestamp: new Date().toISOString(),
        details: null
      }];

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            error: null,
            data: mockData
          })
        })
      } as any);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
    });
  });

  describe('findByEntityId', () => {
    it('should find audit logs by entity ID', async () => {
      // Arrange
      const mockData = [{
        audit_id: 'test-audit-id-1',
        table_name: 'function_models',
        operation: 'create',
        record_id: 'test-model-id',
        old_data: null,
        new_data: { name: 'Test Model 1' },
        changed_by: 'test-user-id',
        changed_at: new Date().toISOString(),
        // Enhanced fields
        entity_type: 'function_models',
        entity_id: 'test-model-id',
        action: 'create',
        user_id: 'test-user-id',
        timestamp: new Date().toISOString(),
        details: null
      }];

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            or: jest.fn().mockResolvedValue({
              error: null,
              data: mockData
            })
          })
        })
      } as any);

      // Act
      const result = await repository.findByEntityId('test-model-id');

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
    });
  });

  describe('findByOperation', () => {
    it('should find audit logs by operation', async () => {
      // Arrange
      const mockData = [{
        audit_id: 'test-audit-id-1',
        table_name: 'function_models',
        operation: 'create',
        record_id: 'test-model-id',
        old_data: null,
        new_data: { name: 'Test Model 1' },
        changed_by: 'test-user-id',
        changed_at: new Date().toISOString(),
        // Enhanced fields
        entity_type: 'function_models',
        entity_id: 'test-model-id',
        action: 'create',
        user_id: 'test-user-id',
        timestamp: new Date().toISOString(),
        details: null
      }];

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            or: jest.fn().mockResolvedValue({
              error: null,
              data: mockData
            })
          })
        })
      } as any);

      // Act
      const result = await repository.findByOperation('create');

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
    });
  });

  describe('findByUser', () => {
    it('should find audit logs by user ID', async () => {
      // Arrange
      const mockData = [{
        audit_id: 'test-audit-id-1',
        table_name: 'function_models',
        operation: 'create',
        record_id: 'test-model-id',
        old_data: null,
        new_data: { name: 'Test Model 1' },
        changed_by: 'test-user-id',
        changed_at: new Date().toISOString(),
        // Enhanced fields
        entity_type: 'function_models',
        entity_id: 'test-model-id',
        action: 'create',
        user_id: 'test-user-id',
        timestamp: new Date().toISOString(),
        details: null
      }];

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            or: jest.fn().mockResolvedValue({
              error: null,
              data: mockData
            })
          })
        })
      } as any);

      // Act
      const result = await repository.findByUser('test-user-id');

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
    });
  });

  describe('findByDateRange', () => {
    it('should find audit logs by date range', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockData = [{
        audit_id: 'test-audit-id-1',
        table_name: 'function_models',
        operation: 'create',
        record_id: 'test-model-id',
        old_data: null,
        new_data: { name: 'Test Model 1' },
        changed_by: 'test-user-id',
        changed_at: new Date('2024-06-01').toISOString()
      }];

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                error: null,
                data: mockData
              })
            })
          })
        })
      } as any);

      // Act
      const result = await repository.findByDateRange(startDate, endDate);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
    });
  });

  describe('findRecent', () => {
    it('should find recent audit logs with limit', async () => {
      // Arrange
      const mockData = [{
        audit_id: 'test-audit-id-1',
        table_name: 'function_models',
        operation: 'create',
        record_id: 'test-model-id',
        old_data: null,
        new_data: { name: 'Test Model 1' },
        changed_by: 'test-user-id',
        changed_at: new Date().toISOString()
      }];

      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              error: null,
              data: mockData
            })
          })
        })
      } as any);

      // Act
      const result = await repository.findRecent(10);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
    });
  });

  describe('countByOperation', () => {
    it('should count audit logs by operation', async () => {
      // Arrange
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockResolvedValue({
            error: null,
            count: 5
          })
        })
      } as any);

      // Act
      const result = await repository.countByOperation('create');

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(5);
    });
  });

  describe('countByUser', () => {
    it('should count audit logs by user', async () => {
      // Arrange
      mockClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockResolvedValue({
            error: null,
            count: 3
          })
        })
      } as any);

      // Act
      const result = await repository.countByUser('test-user-id');

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(3);
    });
  });
});