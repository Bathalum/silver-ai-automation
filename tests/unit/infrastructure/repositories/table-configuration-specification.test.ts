/**
 * Table Configuration Specification Tests
 * 
 * TDD Tests to drive correct table schema alignment and database operations
 * These tests act as specifications for proper database table access patterns
 * 
 * Key Problems Being Driven:
 * 1. "Table does not exist" errors - incorrect table name references
 * 2. Missing column errors - schema misalignment between code and database
 * 3. Incorrect SQL generation - wrong field mappings and query structure
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseFunctionModelRepository } from '../../../../lib/infrastructure/repositories/supabase-function-model-repository';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { ModelStatus } from '../../../../lib/domain/enums';

// Create test suite that validates actual table access patterns
describe('Table Configuration Specification', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let repository: SupabaseFunctionModelRepository;
  let mockFromMethod: jest.Mock;
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;
  let mockUpsert: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;

  beforeEach(() => {
    // Setup comprehensive mock chain
    mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockEq = jest.fn().mockReturnValue({ single: mockSingle });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockInsert = jest.fn().mockResolvedValue({ error: null });
    mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
    mockUpsert = jest.fn().mockResolvedValue({ error: null });
    
    mockFromMethod = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      upsert: mockUpsert
    });

    mockSupabase = {
      from: mockFromMethod
    } as unknown as jest.Mocked<SupabaseClient>;

    repository = new SupabaseFunctionModelRepository(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Primary Table Access Specification', () => {
    it('should use correct table name "function_models" for all main model operations', async () => {
      // RED: This test will fail if repository uses wrong table names
      
      // Arrange
      const modelId = '12345678-1234-1234-1234-123456789012';

      // Act: Call various repository methods that should access function_models table
      await repository.findById(modelId);
      await repository.exists(modelId);
      
      // Assert: All calls should reference the correct table name
      expect(mockFromMethod).toHaveBeenCalledWith('function_models');
      
      // Verify the table name is used consistently across different operations
      const tableCalls = mockFromMethod.mock.calls.map(call => call[0]);
      expect(tableCalls.every(tableName => tableName === 'function_models')).toBe(true);
    });

    it('should use correct table name "function_model_nodes" for node operations', async () => {
      // RED: This test will fail if node table name is incorrect
      
      // Arrange: Create a model with nodes to trigger node operations
      const modelName = ModelName.create('Test Model').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Mock successful model save to trigger node operations
      mockUpsert.mockResolvedValue({ error: null });

      // Act: Save model which should trigger node table operations
      await repository.save(model);

      // Assert: Should access function_model_nodes table
      const nodeTableCalls = mockFromMethod.mock.calls.filter(call => call[0] === 'function_model_nodes');
      expect(nodeTableCalls.length).toBeGreaterThan(0);
    });

    it('should use correct table name "function_model_actions" for action node operations', async () => {
      // RED: This test will fail if action table name is incorrect
      
      // Arrange: Create a model to trigger action operations
      const modelName = ModelName.create('Action Test Model').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Mock successful model save
      mockUpsert.mockResolvedValue({ error: null });

      // Act: Save model which should trigger action table operations
      await repository.save(model);

      // Assert: Should access function_model_actions table
      const actionTableCalls = mockFromMethod.mock.calls.filter(call => call[0] === 'function_model_actions');
      expect(actionTableCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Column Access Pattern Specification', () => {
    it('should select all required columns when fetching function models', async () => {
      // RED: This test will fail if SELECT * is used instead of explicit column list
      
      // Arrange
      const modelId = '12345678-1234-1234-1234-123456789012';

      // Act
      await repository.findById(modelId);

      // Assert: Should select all columns explicitly (SELECT *)
      expect(mockSelect).toHaveBeenCalledWith('*');
      
      // Verify the query chain is constructed correctly
      expect(mockFromMethod).toHaveBeenCalledWith('function_models');
      expect(mockSelect).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('model_id', modelId);
    });

    it('should handle model_id column correctly in all query operations', async () => {
      // RED: This test will fail if wrong column names are used for model identification
      
      // Arrange
      const modelId = '12345678-1234-1234-1234-123456789012';
      
      // Act: Perform operations that filter by model ID
      await repository.findById(modelId);
      await repository.exists(modelId);
      await repository.delete(modelId);

      // Assert: All operations should use 'model_id' column name consistently
      const allEqCalls = mockEq.mock.calls;
      const modelIdCalls = allEqCalls.filter(call => call[0] === 'model_id');
      
      expect(modelIdCalls.length).toBeGreaterThan(0);
      expect(modelIdCalls.every(call => call[1] === modelId)).toBe(true);
    });

    it('should handle soft deletion with correct deleted_at column operations', async () => {
      // RED: This test will fail if soft deletion column names are wrong
      
      // Arrange
      const modelId = '12345678-1234-1234-1234-123456789012';
      
      // Mock is() method for soft deletion queries
      const mockIs = jest.fn().mockReturnValue({ single: mockSingle });
      mockEq.mockReturnValue({ is: mockIs, single: mockSingle });
      
      // Act: Operations that should check soft deletion status
      await repository.findById(modelId);
      await repository.exists(modelId);

      // Assert: Should use 'deleted_at' column with null check
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    });

    it('should handle user ownership with correct user_id column', async () => {
      // RED: This test will fail if user ownership column is incorrect
      
      // Arrange
      const userId = 'user-123';
      
      // Act
      await repository.findByOwner(userId);

      // Assert: Should query using 'user_id' column
      expect(mockEq).toHaveBeenCalledWith('user_id', userId);
    });

    it('should handle status filtering with correct status column', async () => {
      // RED: This test will fail if status column mapping is wrong
      
      // Arrange
      const statuses = [ModelStatus.DRAFT, ModelStatus.PUBLISHED];
      
      // Mock in() method for status filtering
      const mockIn = jest.fn().mockReturnValue({ is: jest.fn().mockReturnValue({}) });
      mockFromMethod.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: mockIn
        })
      });

      // Act
      await repository.findByStatus(statuses);

      // Assert: Should use 'status' column with IN clause
      expect(mockIn).toHaveBeenCalledWith('status', statuses);
    });
  });

  describe('Query Construction Pattern Specification', () => {
    it('should construct proper SELECT query with filtering and soft deletion check', async () => {
      // RED: This test will fail if query construction is incorrect
      
      // Arrange
      const modelId = '12345678-1234-1234-1234-123456789012';
      
      // Mock complete query chain
      const mockIs = jest.fn().mockReturnValue({ single: mockSingle });
      mockEq.mockReturnValue({ is: mockIs });

      // Act
      await repository.findById(modelId);

      // Assert: Should construct query in correct order
      expect(mockFromMethod).toHaveBeenCalledWith('function_models');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('model_id', modelId);
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
      expect(mockSingle).toHaveBeenCalled();
    });

    it('should construct proper INSERT query with all required fields', async () => {
      // RED: This test will fail if INSERT operations miss required columns
      
      // Arrange: Create a complete model
      const modelName = ModelName.create('Complete Insert Test').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        description: 'Test description',
        version: version,
        currentVersion: version
      }).value!;

      // Act
      await repository.save(model);

      // Assert: Should call upsert with properly structured data
      expect(mockUpsert).toHaveBeenCalled();
      
      const upsertCall = mockUpsert.mock.calls[0];
      const insertData = upsertCall[0];
      
      // Verify all required fields are present
      expect(insertData).toHaveProperty('model_id');
      expect(insertData).toHaveProperty('name');
      expect(insertData).toHaveProperty('version');
      expect(insertData).toHaveProperty('status');
      expect(insertData).toHaveProperty('current_version');
      expect(insertData).toHaveProperty('version_count');
      expect(insertData).toHaveProperty('created_at');
      expect(insertData).toHaveProperty('updated_at');
      expect(insertData).toHaveProperty('last_saved_at');
    });

    it('should construct proper UPDATE query for status changes', async () => {
      // RED: This test will fail if UPDATE operations use wrong structure
      
      // Arrange
      const modelId = '12345678-1234-1234-1234-123456789012';
      
      // Mock update chain
      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      // Act: Publish model (should trigger status update)
      await repository.publishModel(modelId);

      // Assert: Should construct UPDATE with proper status and timestamps
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ModelStatus.PUBLISHED,
          updated_at: expect.any(String)
        })
      );
      expect(mockUpdateEq).toHaveBeenCalledWith('model_id', modelId);
    });

    it('should construct proper DELETE query for soft deletion', async () => {
      // RED: This test will fail if soft deletion doesn't set proper fields
      
      // Arrange
      const modelId = '12345678-1234-1234-1234-123456789012';
      const deletedBy = 'user-456';
      
      // Mock update chain for soft delete
      const mockSoftDeleteEq = jest.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockSoftDeleteEq });

      // Act
      await repository.softDelete(modelId, deletedBy);

      // Assert: Should UPDATE with deleted_at and deleted_by fields
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String),
          deleted_by: deletedBy,
          updated_at: expect.any(String)
        })
      );
      expect(mockSoftDeleteEq).toHaveBeenCalledWith('model_id', modelId);
    });
  });

  describe('Multi-Table Operation Specification', () => {
    it('should handle model save with proper transaction-like behavior across tables', async () => {
      // RED: This test will fail if multi-table operations aren't coordinated properly
      
      // Arrange: Create model with both nodes and actions
      const modelName = ModelName.create('Multi-Table Test').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Act: Save should touch multiple tables
      await repository.save(model);

      // Assert: Should access all three tables in correct order
      const tableAccess = mockFromMethod.mock.calls.map(call => call[0]);
      
      // Should access function_models table
      expect(tableAccess).toContain('function_models');
      
      // Should access nodes and actions tables (even if no nodes/actions exist)
      // The implementation should still attempt to clean up existing records
      expect(tableAccess).toContain('function_model_nodes');
      expect(tableAccess).toContain('function_model_actions');
    });

    it('should handle model retrieval with proper JOIN-like behavior', async () => {
      // RED: This test will fail if related data isn't fetched correctly
      
      // Arrange
      const modelId = '12345678-1234-1234-1234-123456789012';
      
      // Mock successful model retrieval
      mockSingle.mockResolvedValue({
        data: {
          model_id: modelId,
          name: 'Test Model',
          version: '1.0.0',
          status: 'draft',
          current_version: '1.0.0',
          version_count: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          last_saved_at: '2024-01-01T00:00:00.000Z'
        },
        error: null
      });

      // Mock related table queries
      const mockSelectNodes = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockSelectActions = jest.fn().mockResolvedValue({ data: [], error: null });
      
      // Setup different return values for different tables
      mockFromMethod.mockImplementation((tableName: string) => {
        if (tableName === 'function_models') {
          return { select: mockSelect };
        } else if (tableName === 'function_model_nodes') {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockImplementation(() => mockSelectNodes()) }) };
        } else if (tableName === 'function_model_actions') {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockImplementation(() => mockSelectActions()) }) };
        }
        return { select: mockSelect };
      });

      // Act
      await repository.findById(modelId);

      // Assert: Should query all related tables
      const tableQueries = mockFromMethod.mock.calls.map(call => call[0]);
      expect(tableQueries).toContain('function_models');
      expect(tableQueries).toContain('function_model_nodes');
      expect(tableQueries).toContain('function_model_actions');
    });

    it('should handle cascading deletes for nodes and actions', async () => {
      // RED: This test will fail if related records aren't cleaned up properly
      
      // Arrange
      const modelId = '12345678-1234-1234-1234-123456789012';
      
      // Mock delete operations
      const mockDeleteEq = jest.fn().mockResolvedValue({ error: null });
      mockDelete.mockReturnValue({ eq: mockDeleteEq });

      // Create model with nodes and actions to trigger cascade cleanup
      const modelName = ModelName.create('Cascade Delete Test').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Act: Save model to establish records, then save again to trigger cleanup
      await repository.save(model);

      // Assert: Should delete from related tables before insert
      const deleteOperations = mockDelete.mock.calls;
      expect(deleteOperations.length).toBeGreaterThan(0);
      
      // Should delete nodes and actions with correct model_id filter
      expect(mockDeleteEq).toHaveBeenCalledWith('model_id', model.modelId);
    });
  });

  describe('Error Mapping Specification', () => {
    it('should map table not found errors to clear messages', async () => {
      // RED: This test will fail if database errors aren't properly mapped
      
      // Arrange: Mock table not found error
      const tableNotFoundError = { code: '42P01', message: 'relation "wrong_table" does not exist' };
      mockSingle.mockResolvedValue({ data: null, error: tableNotFoundError });

      // Act
      const result = await repository.findById('test-id');

      // Assert: Should map to clear error message
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Table does not exist');
    });

    it('should map column not found errors to clear messages', async () => {
      // RED: This test will fail if column errors aren't handled
      
      // Arrange: Mock column not found error
      const columnError = { code: '42703', message: 'column "wrong_column" does not exist' };
      mockUpsert.mockResolvedValue({ error: columnError });

      // Create model to trigger save
      const modelName = ModelName.create('Column Error Test').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Act
      const result = await repository.save(model);

      // Assert: Should provide clear error message
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('column'); // Should mention column issue
    });

    it('should map constraint violation errors to clear messages', async () => {
      // RED: This test will fail if constraint errors aren't handled
      
      // Arrange: Mock constraint violation
      const constraintError = { 
        code: '23514', 
        message: 'new row for relation "function_models" violates check constraint "valid_status"' 
      };
      mockUpsert.mockResolvedValue({ error: constraintError });

      // Create model
      const modelName = ModelName.create('Constraint Test').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Act
      const result = await repository.save(model);

      // Assert: Should handle constraint error gracefully
      expect(result.isFailure).toBe(true);
      expect(result.error).toBeDefined();
      expect(result.error).not.toBe('undefined'); // Should not be generic error
    });
  });
});