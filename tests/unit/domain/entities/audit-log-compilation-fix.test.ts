/**
 * Test for AuditLog Entity Compilation Fix
 * TDD Test to fix compilation errors in AuditLog entity
 * Focus: Property access and type consistency
 */

import { describe, it, expect } from '@jest/globals';
import { AuditLog } from '@/lib/domain/entities/audit-log';
import { Result } from '@/lib/domain/shared/result';

describe('AuditLog Entity - Compilation Fix', () => {
  describe('Creation with automatic timestamps', () => {
    it('should create audit log without providing changedAt or timestamp', () => {
      // Arrange - Properties that should NOT be required in create()
      const props = {
        auditId: 'audit-123',
        tableName: 'users',
        operation: 'create' as const,
        recordId: 'user-456',
        changedBy: 'admin-789',
        newData: { name: 'John Doe' }
      };

      // Act - Create should work without changedAt/timestamp (they're omitted)
      const result = AuditLog.create(props);

      // Assert - Should succeed and auto-populate timestamps
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.auditId).toBe('audit-123');
      expect(result.value!.changedAt).toBeInstanceOf(Date);
      expect(result.value!.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Property access with null safety', () => {
    it('should handle optional properties safely without compilation errors', () => {
      // Arrange - Create with minimal required props
      const props = {
        auditId: 'audit-123',
        entityType: 'users',
        action: 'create',
        entityId: 'user-456',
        userId: 'admin-789'
      };

      // Act
      const result = AuditLog.create(props);

      // Assert - All getters should work without compilation errors
      expect(result.isSuccess).toBe(true);
      const auditLog = result.value!;

      // These should not throw compilation errors for undefined access
      expect(() => auditLog.tableName).not.toThrow();
      expect(() => auditLog.operation).not.toThrow();
      expect(() => auditLog.recordId).not.toThrow();
      expect(() => auditLog.changedBy).not.toThrow();
    });

    it('should provide fallback values for legacy properties', () => {
      // Arrange - Create with new interface only
      const props = {
        auditId: 'audit-123',
        entityType: 'users',
        action: 'create',
        entityId: 'user-456',
        userId: 'admin-789'
      };

      // Act
      const result = AuditLog.create(props);

      // Assert - Legacy properties should fallback to new interface values
      expect(result.isSuccess).toBe(true);
      const auditLog = result.value!;

      expect(auditLog.tableName).toBe('users'); // entityType fallback
      expect(auditLog.recordId).toBe('user-456'); // entityId fallback
      expect(auditLog.changedBy).toBe('admin-789'); // userId fallback
      expect(auditLog.operation).toBe('create'); // action fallback
    });

    it('should provide empty string fallbacks when no data is available', () => {
      // Arrange - Create with minimal props
      const props = {
        auditId: 'audit-123'
      };

      // Act
      const result = AuditLog.create(props);

      // Assert - Should provide safe fallbacks instead of undefined
      expect(result.isFailure).toBe(true); // Will fail validation but not compilation
      
      // Create with enough data to pass validation
      const validProps = {
        auditId: 'audit-123',
        entityType: 'test',
        entityId: 'test-1',
        userId: 'user-1',
        action: 'test'
      };
      
      const validResult = AuditLog.create(validProps);
      expect(validResult.isSuccess).toBe(true);
      
      const auditLog = validResult.value!;
      // These should return strings, not undefined
      expect(typeof auditLog.tableName).toBe('string');
      expect(typeof auditLog.recordId).toBe('string');
      expect(typeof auditLog.changedBy).toBe('string');
      expect(typeof auditLog.operation).toBe('string');
    });
  });

  describe('Type safety for create method', () => {
    it('should enforce correct typing in create method signature', () => {
      // This test ensures the create method properly omits changedAt and timestamp
      const props = {
        auditId: 'audit-123',
        tableName: 'users',
        operation: 'create' as const,
        recordId: 'user-456',
        changedBy: 'admin-789',
        newData: { test: 'data' }, // Required for create operation
        // changedAt and timestamp should not be allowed here
        // changedAt: new Date(), // This should cause a TypeScript error
        // timestamp: new Date(), // This should cause a TypeScript error
      };

      const result = AuditLog.create(props);
      expect(result.isSuccess).toBe(true);
    });
  });
});