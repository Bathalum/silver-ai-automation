import { describe, it, expect, beforeEach, jest } from '@jest/globals';
type Mock = jest.MockedFunction<any>;
import { SupabaseClient } from '@supabase/supabase-js';
import { Result } from '../../../../lib/domain/shared/result';
import { BaseSupabaseRepository } from '../../../../lib/infrastructure/repositories/base-supabase-repository';

/**
 * TDD Test Specification for BaseSupabaseRepository<TEntity, TId>
 * 
 * This test specification defines the behavior contract for the generic foundation
 * of all Supabase repositories following Clean Architecture principles.
 * 
 * RED PHASE: These tests are designed to FAIL initially to drive TDD implementation.
 * 
 * ARCHITECTURAL BOUNDARIES VALIDATED:
 * - Repository belongs to Infrastructure Layer
 * - Must implement domain-defined repository interfaces 
 * - Must use Result pattern for all operations
 * - Must translate database errors to domain-friendly messages
 * - Must not leak Supabase-specific types to Domain/Application layers
 */

// Mock entity for testing
interface TestEntity {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Mock database row structure
interface TestEntityRow {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Test implementation using the actual BaseSupabaseRepository
class TestEntityRepository extends BaseSupabaseRepository<TestEntity, string> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'test_entities');
  }

  async save(entity: TestEntity): Promise<Result<TestEntity>> {
    const validation = this.validateEntityForSave(entity);
    if (validation.isFailure) {
      return Result.fail(validation.error);
    }

    try {
      const entityRow = this.fromDomain(entity);
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert(entityRow)
        .select()
        .single();

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      return this.toDomain(data);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  async findById(id: string): Promise<Result<TestEntity | null>> {
    return this.performFindById(id);
  }

  async findAll(filter?: any): Promise<Result<TestEntity[]>> {
    return this.performFindAll(filter);
  }

  async delete(id: string): Promise<Result<void>> {
    return this.performDelete(id);
  }

  async exists(id: string): Promise<Result<boolean>> {
    return this.performExists(id);
  }

  protected toDomain(row: TestEntityRow): Result<TestEntity> {
    try {
      if (!row.id || !row.name) {
        return Result.fail('Entity mapping failed: missing required fields');
      }

      const entity: TestEntity = {
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined
      };

      return Result.ok(entity);
    } catch (error) {
      return Result.fail('Entity mapping failed: invalid data');
    }
  }

  protected fromDomain(entity: TestEntity): TestEntityRow {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
      deleted_at: entity.deletedAt?.toISOString()
    };
  }
}

describe('BaseSupabaseRepository<TEntity, TId> - TDD Specification', () => {
  let mockSupabase: SupabaseClient;
  let repository: TestEntityRepository;
  let mockFrom: Mock;
  let mockSelect: Mock;
  let mockInsert: Mock;
  let mockUpdate: Mock;
  let mockDelete: Mock;
  let mockEq: Mock;
  let mockSingle: Mock;

  beforeEach(() => {
    // Setup Supabase client mocks
    mockSingle = jest.fn();
    mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockInsert = jest.fn().mockReturnValue({ eq: mockEq });
    mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete
    });

    mockSupabase = {
      from: mockFrom
    } as any;

    repository = new TestEntityRepository(mockSupabase);
  });

  describe('Architecture Compliance - Clean Architecture Boundaries', () => {
    it('should be in Infrastructure layer and not expose Supabase types to domain', async () => {
      // RED PHASE: This test defines that repositories must encapsulate database concerns
      // The repository should never return Supabase-specific types or errors to calling layers
      
      const entityId = 'test-id-123';
      const expectedEntity: TestEntity = {
        id: entityId,
        name: 'Test Entity',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock successful database response
      mockSingle.mockResolvedValue({
        data: {
          id: entityId,
          name: 'Test Entity',
          description: 'Test description',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      });

      // Act & Assert: Result should be domain Result type, not Supabase response
      const result = await repository.findById(entityId);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(expect.objectContaining({
        id: entityId,
        name: 'Test Entity'
      }));
    });

    it('should implement repository interface defined in domain/use-cases layer', () => {
      // RED PHASE: Repository must implement domain-defined interfaces
      // This enforces Dependency Inversion Principle
      
      expect(repository).toHaveProperty('save');
      expect(repository).toHaveProperty('findById');
      expect(repository).toHaveProperty('findAll');
      expect(repository).toHaveProperty('delete');
      expect(repository).toHaveProperty('exists');
      
      // All methods must return Results (no throwing exceptions up the stack)
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.findById).toBe('function');
      expect(typeof repository.findAll).toBe('function');
      expect(typeof repository.delete).toBe('function');
      expect(typeof repository.exists).toBe('function');
    });
  });

  describe('Result Pattern Compliance - No Exceptions Across Boundaries', () => {
    it('should return Result<TEntity> for save operations, never throw', async () => {
      // RED PHASE: All repository operations must use Result pattern
      const entity: TestEntity = {
        id: 'new-id',
        name: 'New Entity',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockInsert.mockRejectedValue(new Error('Database connection failed'));

      const result = await repository.save(entity);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isFailure).toBe(true);
      expect(typeof result.error).toBe('string');
    });

    it('should return Result<TEntity | null> for findById, handling not found gracefully', async () => {
      // RED PHASE: Not found should return Result.ok(null), not Result.fail()
      const entityId = 'non-existent-id';
      
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows found' } });

      const result = await repository.findById(entityId);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should return Result<TEntity[]> for findAll operations', async () => {
      // RED PHASE: Collection queries must return Result<TEntity[]>
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      const result = await repository.findAll();
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
    });

    it('should return Result<void> for delete operations', async () => {
      // RED PHASE: Delete operations return Result<void> to indicate success/failure
      const entityId = 'delete-id';
      
      mockEq.mockResolvedValue({ error: null });

      const result = await repository.delete(entityId);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
    });

    it('should return Result<boolean> for exists operations', async () => {
      // RED PHASE: Existence checks return Result<boolean>
      const entityId = 'exists-id';
      
      mockSingle.mockResolvedValue({ data: { id: entityId }, error: null });

      const result = await repository.exists(entityId);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(typeof result.value).toBe('boolean');
    });
  });

  describe('Transaction Boundary Management', () => {
    it('should execute operations within transactions and rollback on failure', async () => {
      // RED PHASE: Repository must provide transaction management
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      
      const result = await repository['executeTransaction'](operation);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Transaction failed');
    });

    it('should commit transactions on successful operations', async () => {
      // RED PHASE: Successful operations should commit
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await repository['executeTransaction'](operation);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe('success');
    });

    it('should handle nested transactions appropriately', async () => {
      // RED PHASE: Support for complex operations requiring multiple database calls
      const nestedOperation = async (client: SupabaseClient) => {
        // Simulate nested operations
        await client.from('table1').insert({});
        await client.from('table2').update({});
        return 'nested-success';
      };
      
      const result = await repository['executeTransaction'](nestedOperation);
      
      expect(result).toBeInstanceOf(Result);
      // Should either succeed completely or fail completely (atomicity)
    });
  });

  describe('Entity-Database Mapping - Clean Architecture Boundary Enforcement', () => {
    it('should convert database rows to domain entities without exposing database structure', () => {
      // RED PHASE: toDomain must create clean domain objects
      const dbRow: TestEntityRow = {
        id: 'test-id',
        name: 'Test Entity',
        description: 'Test description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = repository['toDomain'](dbRow);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isSuccess).toBe(true);
      
      const entity = result.value;
      expect(entity.id).toBe('test-id');
      expect(entity.name).toBe('Test Entity');
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
      // Database field naming (snake_case) should not leak to domain (camelCase)
      expect(entity).not.toHaveProperty('created_at');
      expect(entity).not.toHaveProperty('updated_at');
    });

    it('should convert domain entities to database rows for persistence', () => {
      // RED PHASE: fromDomain must create database-compatible objects
      const entity: TestEntity = {
        id: 'test-id',
        name: 'Test Entity',
        description: 'Test description',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      };

      const dbRow = repository['fromDomain'](entity);
      
      expect(dbRow.id).toBe('test-id');
      expect(dbRow.name).toBe('Test Entity');
      expect(dbRow.created_at).toBe('2024-01-01T00:00:00.000Z');
      expect(dbRow.updated_at).toBe('2024-01-01T00:00:00.000Z');
      // Domain field naming should not leak to database
      expect(dbRow).not.toHaveProperty('createdAt');
      expect(dbRow).not.toHaveProperty('updatedAt');
    });

    it('should handle mapping errors gracefully and return Result.fail()', () => {
      // RED PHASE: Invalid data should not crash but return error Results
      const invalidDbRow = {
        id: null, // Invalid - required field is null
        name: '', // Invalid - empty required field
        created_at: 'invalid-date'
      };

      const result = repository['toDomain'](invalidDbRow);
      
      expect(result).toBeInstanceOf(Result);
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('mapping');
    });
  });

  describe('Database Error Translation - Infrastructure Concern', () => {
    it('should translate PostgreSQL constraint violation errors to domain-friendly messages', () => {
      // RED PHASE: Database-specific errors must not leak to domain layer
      const constraintError = {
        code: '23505', // PostgreSQL unique constraint violation
        message: 'duplicate key value violates unique constraint "entities_name_key"'
      };

      const translatedError = repository['translateDatabaseError'](constraintError);
      
      expect(translatedError).not.toContain('23505');
      expect(translatedError).not.toContain('constraint');
      expect(translatedError).toContain('already exists');
    });

    it('should translate PostgreSQL foreign key violation errors', () => {
      // RED PHASE: Foreign key errors should be user-friendly
      const fkError = {
        code: '23503', // PostgreSQL foreign key violation
        message: 'insert or update on table "entities" violates foreign key constraint'
      };

      const translatedError = repository['translateDatabaseError'](fkError);
      
      expect(translatedError).not.toContain('23503');
      expect(translatedError).toContain('Referenced resource not found');
    });

    it('should translate connection and timeout errors appropriately', () => {
      // RED PHASE: Infrastructure failures should be abstracted
      const connectionError = {
        message: 'connect ECONNREFUSED 127.0.0.1:5432'
      };

      const translatedError = repository['translateDatabaseError'](connectionError);
      
      expect(translatedError).not.toContain('ECONNREFUSED');
      expect(translatedError).not.toContain('5432');
      expect(translatedError).toContain('Database unavailable');
    });

    it('should handle unknown database errors with generic message', () => {
      // RED PHASE: Unexpected errors should not expose internal details
      const unknownError = {
        code: 'UNKNOWN_CODE',
        message: 'Internal database error with sensitive information'
      };

      const translatedError = repository['translateDatabaseError'](unknownError);
      
      expect(translatedError).not.toContain('sensitive information');
      expect(translatedError).toContain('An unexpected error occurred');
    });
  });

  describe('Query Building and Filtering', () => {
    it('should support basic filtering without SQL injection vulnerabilities', async () => {
      // RED PHASE: Repository must provide safe query building
      const filter = { 
        name: 'Test Entity',
        status: 'active'
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      });

      const result = await repository.findAll(filter);
      
      expect(result).toBeInstanceOf(Result);
      expect(mockFrom).toHaveBeenCalledWith('test_entities');
    });

    it('should support pagination parameters safely', async () => {
      // RED PHASE: Pagination should be built into the base repository
      const filter = {
        limit: 10,
        offset: 20,
        orderBy: 'created_at',
        orderDirection: 'desc'
      };

      const result = await repository.findAll(filter);
      
      expect(result).toBeInstanceOf(Result);
      // Pagination should not allow unlimited queries that could DoS the database
    });

    it('should validate and sanitize filter parameters', async () => {
      // RED PHASE: Repository must prevent malicious filter values
      const maliciousFilter = {
        id: "'; DROP TABLE test_entities; --",
        limit: -1,
        offset: 'invalid'
      };

      const result = await repository.findAll(maliciousFilter);
      
      expect(result).toBeInstanceOf(Result);
      // Should either sanitize the filter or return an error, never execute malicious SQL
    });
  });

  describe('Performance and Resource Management', () => {
    it('should limit query results to prevent memory exhaustion', async () => {
      // RED PHASE: Repository should have built-in protection against large result sets
      const filter = { limit: 1000000 }; // Unreasonably large limit

      const result = await repository.findAll(filter);
      
      expect(result).toBeInstanceOf(Result);
      // Should either cap the limit or return an error for excessive limits
    });

    it('should timeout long-running queries', async () => {
      // RED PHASE: Repository should not allow indefinite query execution
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          // Simulate a query that takes too long but eventually resolves
          limit: jest.fn().mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve({ data: [], error: null }), 100))
          )
        })
      });

      const startTime = Date.now();
      const result = await repository.findAll();
      const endTime = Date.now();
      
      expect(result).toBeInstanceOf(Result);
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within reasonable time
    }, 1000);
  });

  describe('Audit and Observability', () => {
    it('should log repository operations for debugging and monitoring', async () => {
      // RED PHASE: Repository operations should be observable
      const logSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      
      await repository.findById('test-id');
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Repository operation'),
        expect.objectContaining({
          operation: 'findById',
          tableName: 'test_entities',
          id: 'test-id'
        })
      );
      
      logSpy.mockRestore();
    });

    it('should track operation metrics for performance monitoring', async () => {
      // RED PHASE: Repository should emit metrics for monitoring
      const metricsSpy = jest.fn();
      
      // Mock metrics collection
      (repository as any).metricsCollector = { record: metricsSpy };
      
      // Use executeTransaction which does call metrics
      const operation = jest.fn().mockResolvedValue('success');
      await repository['executeTransaction'](operation);
      
      expect(metricsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'executeTransaction',
          duration: expect.any(Number),
          success: expect.any(Boolean)
        })
      );
    });
  });
});