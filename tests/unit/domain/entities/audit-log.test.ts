/**
 * Unit tests for AuditLog Entity
 * Tests change detection, operation validation, field comparison, and audit trail business logic
 */

import { AuditLog } from '@/lib/domain/entities/audit-log';

describe('AuditLog', () => {
  const baseProps = {
    auditId: 'audit-123',
    tableName: 'function_models',
    recordId: 'record-456',
    changedBy: 'user-789'
  };

  describe('Factory Pattern - Creation', () => {
    it('should create audit log with create operation', () => {
      // Arrange
      const createProps = {
        ...baseProps,
        operation: 'create' as const,
        newData: { name: 'New Model', status: 'draft' }
      };

      // Act
      const result = AuditLog.create(createProps);

      // Assert
      expect(result).toBeValidResult();
      const auditLog = result.value;
      expect(auditLog.auditId).toBe(createProps.auditId);
      expect(auditLog.tableName).toBe(createProps.tableName);
      expect(auditLog.operation).toBe(createProps.operation);
      expect(auditLog.recordId).toBe(createProps.recordId);
      expect(auditLog.newData).toEqual(createProps.newData);
      expect(auditLog.oldData).toBeUndefined();
      expect(auditLog.changedBy).toBe(createProps.changedBy);
    });

    it('should create audit log with update operation', () => {
      // Arrange
      const updateProps = {
        ...baseProps,
        operation: 'update' as const,
        oldData: { name: 'Old Model', status: 'draft' },
        newData: { name: 'Updated Model', status: 'published' }
      };

      // Act
      const result = AuditLog.create(updateProps);

      // Assert
      expect(result).toBeValidResult();
      const auditLog = result.value;
      expect(auditLog.operation).toBe('update');
      expect(auditLog.oldData).toEqual(updateProps.oldData);
      expect(auditLog.newData).toEqual(updateProps.newData);
    });

    it('should create audit log with delete operation', () => {
      // Arrange
      const deleteProps = {
        ...baseProps,
        operation: 'delete' as const,
        oldData: { name: 'Deleted Model', status: 'published' }
      };

      // Act
      const result = AuditLog.create(deleteProps);

      // Assert
      expect(result).toBeValidResult();
      const auditLog = result.value;
      expect(auditLog.operation).toBe('delete');
      expect(auditLog.oldData).toEqual(deleteProps.oldData);
      expect(auditLog.newData).toBeUndefined();
    });

    it('should automatically set changedAt timestamp', () => {
      // Arrange
      const beforeCreate = new Date();
      const props = {
        ...baseProps,
        operation: 'create' as const,
        newData: { test: 'data' }
      };

      // Act
      const result = AuditLog.create(props);

      // Assert
      expect(result).toBeValidResult();
      const auditLog = result.value;
      expect(auditLog.changedAt).toBeInstanceOf(Date);
      expect(auditLog.changedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(auditLog.changedAt.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });
  });

  describe('Validation Rules', () => {
    describe('Basic field validation', () => {
      it('should reject empty audit ID', () => {
        // Arrange
        const props = {
          ...baseProps,
          auditId: '',
          operation: 'create' as const,
          newData: { test: 'data' }
        };

        // Act
        const result = AuditLog.create(props);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Audit ID cannot be empty');
      });

      it('should reject whitespace-only audit ID', () => {
        // Arrange
        const props = {
          ...baseProps,
          auditId: '   ',
          operation: 'create' as const,
          newData: { test: 'data' }
        };

        // Act
        const result = AuditLog.create(props);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Audit ID cannot be empty');
      });

      it('should reject empty table name', () => {
        // Arrange
        const props = {
          ...baseProps,
          tableName: '',
          operation: 'create' as const,
          newData: { test: 'data' }
        };

        // Act
        const result = AuditLog.create(props);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Table name cannot be empty');
      });

      it('should reject empty record ID', () => {
        // Arrange
        const props = {
          ...baseProps,
          recordId: '',
          operation: 'create' as const,
          newData: { test: 'data' }
        };

        // Act
        const result = AuditLog.create(props);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Record ID cannot be empty');
      });

      it('should reject empty changedBy user ID', () => {
        // Arrange
        const props = {
          ...baseProps,
          changedBy: '',
          operation: 'create' as const,
          newData: { test: 'data' }
        };

        // Act
        const result = AuditLog.create(props);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Changed by user ID cannot be empty');
      });
    });

    describe('Operation validation', () => {
      it('should reject invalid operation type', () => {
        // Arrange
        const props = {
          ...baseProps,
          operation: 'invalid' as any,
          newData: { test: 'data' }
        };

        // Act
        const result = AuditLog.create(props);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Operation must be create, update, or delete');
      });

      it('should accept all valid operation types', () => {
        // Arrange
        const validOperations = ['create', 'update', 'delete'] as const;
        
        // Act & Assert
        validOperations.forEach(operation => {
          const props = {
            ...baseProps,
            operation,
            newData: { test: 'data' },
            oldData: operation !== 'create' ? { old: 'data' } : undefined
          };
          
          const result = AuditLog.create(props);
          expect(result).toBeValidResult();
          expect(result.value.operation).toBe(operation);
        });
      });
    });

    describe('Operation-specific data validation', () => {
      it('should require new data for create operation', () => {
        // Arrange
        const props = {
          ...baseProps,
          operation: 'create' as const
          // Missing newData
        };

        // Act
        const result = AuditLog.create(props);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Create operation must have new data');
      });

      it('should require old data for delete operation', () => {
        // Arrange
        const props = {
          ...baseProps,
          operation: 'delete' as const
          // Missing oldData
        };

        // Act
        const result = AuditLog.create(props);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Delete operation must have old data');
      });

      it('should require old data or new data for update operation', () => {
        // Arrange
        const props = {
          ...baseProps,
          operation: 'update' as const
          // Missing both oldData and newData
        };

        // Act
        const result = AuditLog.create(props);

        // Assert
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage('Update operation must have old data or new data');
      });

      it('should allow update operation with only old data', () => {
        // Arrange
        const props = {
          ...baseProps,
          operation: 'update' as const,
          oldData: { name: 'Old Value' }
        };

        // Act
        const result = AuditLog.create(props);

        // Assert
        expect(result).toBeValidResult();
      });

      it('should allow update operation with only new data', () => {
        // Arrange
        const props = {
          ...baseProps,
          operation: 'update' as const,
          newData: { name: 'New Value' }
        };

        // Act
        const result = AuditLog.create(props);

        // Assert
        expect(result).toBeValidResult();
      });
    });
  });

  describe('Operation Detection', () => {
    let createLog: AuditLog;
    let updateLog: AuditLog;
    let deleteLog: AuditLog;

    beforeEach(() => {
      createLog = AuditLog.create({
        ...baseProps,
        operation: 'create',
        newData: { name: 'New Item' }
      }).value;

      updateLog = AuditLog.create({
        ...baseProps,
        operation: 'update',
        oldData: { name: 'Old Item' },
        newData: { name: 'Updated Item' }
      }).value;

      deleteLog = AuditLog.create({
        ...baseProps,
        operation: 'delete',
        oldData: { name: 'Deleted Item' }
      }).value;
    });

    it('should correctly identify create operations', () => {
      expect(createLog.isCreateOperation()).toBe(true);
      expect(updateLog.isCreateOperation()).toBe(false);
      expect(deleteLog.isCreateOperation()).toBe(false);
    });

    it('should correctly identify update operations', () => {
      expect(createLog.isUpdateOperation()).toBe(false);
      expect(updateLog.isUpdateOperation()).toBe(true);
      expect(deleteLog.isUpdateOperation()).toBe(false);
    });

    it('should correctly identify delete operations', () => {
      expect(createLog.isDeleteOperation()).toBe(false);
      expect(updateLog.isDeleteOperation()).toBe(false);
      expect(deleteLog.isDeleteOperation()).toBe(true);
    });
  });

  describe('Data Change Detection', () => {
    it('should detect data changes when old data exists', () => {
      // Arrange
      const auditLog = AuditLog.create({
        ...baseProps,
        operation: 'delete',
        oldData: { name: 'Deleted Item' }
      }).value;

      // Act & Assert
      expect(auditLog.hasDataChange()).toBe(true);
    });

    it('should detect data changes when new data exists', () => {
      // Arrange
      const auditLog = AuditLog.create({
        ...baseProps,
        operation: 'create',
        newData: { name: 'New Item' }
      }).value;

      // Act & Assert
      expect(auditLog.hasDataChange()).toBe(true);
    });

    it('should detect data changes when both old and new data exist', () => {
      // Arrange
      const auditLog = AuditLog.create({
        ...baseProps,
        operation: 'update',
        oldData: { name: 'Old Item' },
        newData: { name: 'New Item' }
      }).value;

      // Act & Assert
      expect(auditLog.hasDataChange()).toBe(true);
    });

    it('should not detect data changes when neither old nor new data exists', () => {
      // This scenario shouldn't happen due to validation, but testing the logic
      // We'll need to test this through mocking since validation prevents it
      
      // Create a valid audit log first, then access private props for testing
      const auditLog = AuditLog.create({
        ...baseProps,
        operation: 'update',
        newData: { temp: 'data' }
      }).value;

      // Manually clear the data properties for testing (normally prevented by validation)
      (auditLog as any).props.oldData = undefined;
      (auditLog as any).props.newData = undefined;

      // Act & Assert
      expect(auditLog.hasDataChange()).toBe(false);
    });
  });

  describe('Field Change Analysis', () => {
    it('should identify changed fields for update operations', () => {
      // Arrange
      const auditLog = AuditLog.create({
        ...baseProps,
        operation: 'update',
        oldData: {
          name: 'Old Name',
          status: 'draft',
          version: '1.0.0',
          unchanged: 'same value'
        },
        newData: {
          name: 'New Name',        // Changed
          status: 'published',     // Changed
          version: '1.0.0',        // Unchanged
          unchanged: 'same value', // Unchanged
          newField: 'added'        // Added
        }
      }).value;

      // Act
      const changedFields = auditLog.getChangedFields();

      // Assert
      expect(changedFields).toContain('name');
      expect(changedFields).toContain('status');
      expect(changedFields).toContain('newField');
      expect(changedFields).not.toContain('version');
      expect(changedFields).not.toContain('unchanged');
      expect(changedFields).toHaveLength(3);
    });

    it('should identify removed fields as changes', () => {
      // Arrange
      const auditLog = AuditLog.create({
        ...baseProps,
        operation: 'update',
        oldData: {
          name: 'Name',
          removedField: 'this will be removed',
          keptField: 'kept'
        },
        newData: {
          name: 'Name',
          keptField: 'kept'
          // removedField is missing
        }
      }).value;

      // Act
      const changedFields = auditLog.getChangedFields();

      // Assert
      expect(changedFields).toContain('removedField');
      expect(changedFields).not.toContain('name');
      expect(changedFields).not.toContain('keptField');
      expect(changedFields).toHaveLength(1);
    });

    it('should return empty array for create operations', () => {
      // Arrange
      const auditLog = AuditLog.create({
        ...baseProps,
        operation: 'create',
        newData: { name: 'New Item', status: 'active' }
      }).value;

      // Act
      const changedFields = auditLog.getChangedFields();

      // Assert
      expect(changedFields).toEqual([]);
    });

    it('should return empty array for delete operations', () => {
      // Arrange
      const auditLog = AuditLog.create({
        ...baseProps,
        operation: 'delete',
        oldData: { name: 'Deleted Item', status: 'active' }
      }).value;

      // Act
      const changedFields = auditLog.getChangedFields();

      // Assert
      expect(changedFields).toEqual([]);
    });

    it('should return empty array when update has no old data', () => {
      // Arrange
      const auditLog = AuditLog.create({
        ...baseProps,
        operation: 'update',
        newData: { name: 'New Data' }
        // No oldData
      }).value;

      // Act
      const changedFields = auditLog.getChangedFields();

      // Assert
      expect(changedFields).toEqual([]);
    });

    it('should return empty array when update has no new data', () => {
      // Arrange
      const auditLog = AuditLog.create({
        ...baseProps,
        operation: 'update',
        oldData: { name: 'Old Data' }
        // No newData
      }).value;

      // Act
      const changedFields = auditLog.getChangedFields();

      // Assert
      expect(changedFields).toEqual([]);
    });

    it('should handle complex nested objects in change detection', () => {
      // Arrange
      const auditLog = AuditLog.create({
        ...baseProps,
        operation: 'update',
        oldData: {
          config: {
            settings: { theme: 'dark', lang: 'en' },
            features: ['feature1', 'feature2']
          },
          simple: 'unchanged'
        },
        newData: {
          config: {
            settings: { theme: 'light', lang: 'en' },  // theme changed
            features: ['feature1', 'feature3']         // feature2 -> feature3
          },
          simple: 'unchanged'
        }
      }).value;

      // Act
      const changedFields = auditLog.getChangedFields();

      // Assert
      expect(changedFields).toContain('config');
      expect(changedFields).not.toContain('simple');
      expect(changedFields).toHaveLength(1);
    });

    it('should handle null and undefined values in change detection', () => {
      // Arrange
      const auditLog = AuditLog.create({
        ...baseProps,
        operation: 'update',
        oldData: {
          field1: null,
          field2: 'value',
          field3: undefined
        },
        newData: {
          field1: 'now has value',    // null -> value
          field2: null,               // value -> null
          field3: undefined,          // undefined -> undefined (no change)
          field4: 'new field'         // added field
        }
      }).value;

      // Act
      const changedFields = auditLog.getChangedFields();

      // Assert
      expect(changedFields).toContain('field1');
      expect(changedFields).toContain('field2');
      expect(changedFields).toContain('field4');
      expect(changedFields).not.toContain('field3');
      expect(changedFields).toHaveLength(3);
    });
  });

  describe('Equality and Comparison', () => {
    it('should be equal when audit IDs match', () => {
      // Arrange
      const auditLog1 = AuditLog.create({
        ...baseProps,
        auditId: 'same-id',
        operation: 'create',
        newData: { name: 'Item 1' }
      }).value;

      const auditLog2 = AuditLog.create({
        ...baseProps,
        auditId: 'same-id',
        operation: 'delete',
        oldData: { name: 'Item 2' }
      }).value;

      // Act & Assert
      expect(auditLog1.equals(auditLog2)).toBe(true);
    });

    it('should not be equal when audit IDs differ', () => {
      // Arrange
      const auditLog1 = AuditLog.create({
        ...baseProps,
        auditId: 'id-1',
        operation: 'create',
        newData: { name: 'Item' }
      }).value;

      const auditLog2 = AuditLog.create({
        ...baseProps,
        auditId: 'id-2',
        operation: 'create',
        newData: { name: 'Item' }
      }).value;

      // Act & Assert
      expect(auditLog1.equals(auditLog2)).toBe(false);
    });
  });

  describe('Property Access and Immutability', () => {
    let auditLog: AuditLog;

    beforeEach(() => {
      auditLog = AuditLog.create({
        ...baseProps,
        operation: 'update',
        oldData: { old: 'data' },
        newData: { new: 'data' }
      }).value;
    });

    it('should provide read-only access to all properties', () => {
      // Act & Assert
      expect(auditLog.auditId).toBe(baseProps.auditId);
      expect(auditLog.tableName).toBe(baseProps.tableName);
      expect(auditLog.operation).toBe('update');
      expect(auditLog.recordId).toBe(baseProps.recordId);
      expect(auditLog.oldData).toEqual({ old: 'data' });
      expect(auditLog.newData).toEqual({ new: 'data' });
      expect(auditLog.changedBy).toBe(baseProps.changedBy);
      expect(auditLog.changedAt).toBeInstanceOf(Date);
    });

    it('should return consistent values on multiple property accesses', () => {
      // Act
      const firstAccess = {
        auditId: auditLog.auditId,
        tableName: auditLog.tableName,
        operation: auditLog.operation,
        recordId: auditLog.recordId,
        changedBy: auditLog.changedBy,
        changedAt: auditLog.changedAt
      };

      const secondAccess = {
        auditId: auditLog.auditId,
        tableName: auditLog.tableName,
        operation: auditLog.operation,
        recordId: auditLog.recordId,
        changedBy: auditLog.changedBy,
        changedAt: auditLog.changedAt
      };

      // Assert
      expect(firstAccess).toEqual(secondAccess);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large data objects', () => {
      // Arrange
      const largeData = {
        largArray: new Array(1000).fill('data'),
        nestedObject: {
          level1: { level2: { level3: 'deep value' } }
        },
        longString: 'a'.repeat(10000)
      };

      const props = {
        ...baseProps,
        operation: 'create' as const,
        newData: largeData
      };

      // Act
      const result = AuditLog.create(props);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.newData).toEqual(largeData);
    });

    it('should handle special characters in string fields', () => {
      // Arrange
      const props = {
        auditId: 'audit-123_$@#',
        tableName: 'table_with_underscores',
        recordId: 'record-with-dashes-123',
        changedBy: 'user@domain.com',
        operation: 'create' as const,
        newData: { specialChars: '!@#$%^&*()' }
      };

      // Act
      const result = AuditLog.create(props);

      // Assert
      expect(result).toBeValidResult();
    });

    it('should handle empty objects as data', () => {
      // Arrange
      const props = {
        ...baseProps,
        operation: 'update' as const,
        oldData: {},
        newData: {}
      };

      // Act
      const result = AuditLog.create(props);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.oldData).toEqual({});
      expect(result.value.newData).toEqual({});
      expect(result.value.getChangedFields()).toEqual([]);
    });

    it('should handle arrays as data', () => {
      // Arrange
      const props = {
        ...baseProps,
        operation: 'update' as const,
        oldData: [1, 2, 3],
        newData: [1, 2, 3, 4]
      };

      // Act
      const result = AuditLog.create(props);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.oldData).toEqual([1, 2, 3]);
      expect(result.value.newData).toEqual([1, 2, 3, 4]);
    });
  });

  describe('Result Pattern Integration', () => {
    it('should follow Result pattern for successful creation', () => {
      // Arrange
      const props = {
        ...baseProps,
        operation: 'create' as const,
        newData: { test: 'data' }
      };

      // Act
      const result = AuditLog.create(props);

      // Assert
      expect(result).toBeValidResult();
      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.value).toBeInstanceOf(AuditLog);
      expect(() => result.error).toThrow();
    });

    it('should provide meaningful error messages for validation failures', () => {
      // Arrange
      const testCases = [
        { props: { ...baseProps, auditId: '', operation: 'create', newData: {} }, expectedError: 'Audit ID cannot be empty' },
        { props: { ...baseProps, tableName: '', operation: 'create', newData: {} }, expectedError: 'Table name cannot be empty' },
        { props: { ...baseProps, recordId: '', operation: 'create', newData: {} }, expectedError: 'Record ID cannot be empty' },
        { props: { ...baseProps, changedBy: '', operation: 'create', newData: {} }, expectedError: 'Changed by user ID cannot be empty' },
        { props: { ...baseProps, operation: 'invalid' as any, newData: {} }, expectedError: 'Operation must be create, update, or delete' },
        { props: { ...baseProps, operation: 'create' }, expectedError: 'Create operation must have new data' },
        { props: { ...baseProps, operation: 'delete' }, expectedError: 'Delete operation must have old data' },
        { props: { ...baseProps, operation: 'update' }, expectedError: 'Update operation must have old data or new data' }
      ];

      // Act & Assert
      testCases.forEach(({ props, expectedError }) => {
        const result = AuditLog.create(props);
        expect(result).toBeFailureResult();
        expect(result).toHaveErrorMessage(expectedError);
        expect(result.isSuccess).toBe(false);
        expect(result.isFailure).toBe(true);
        expect(() => result.value).toThrow();
      });
    });
  });
});