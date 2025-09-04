/**
 * Repository Implementation Driver Tests
 * 
 * CRITICAL TDD tests that MUST pass to fix the real database integration failures
 * These tests drive the immediate implementation fixes for the specific issues found:
 * 
 * ISSUE 1: "Cannot read properties of undefined (reading 'values')" in fromDomain()
 * ISSUE 2: "Table does not exist" in findById()
 * ISSUE 3: Missing required fields in database row interface
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseFunctionModelRepository } from '../../../../lib/infrastructure/repositories/supabase-function-model-repository';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { ModelStatus } from '../../../../lib/domain/enums';

// Mock Supabase to isolate repository logic
const mockSupabaseClient = {
  from: jest.fn()
} as unknown as SupabaseClient;

describe('Repository Implementation Driver - CRITICAL FIXES', () => {
  let repository: SupabaseFunctionModelRepository;

  beforeEach(() => {
    repository = new SupabaseFunctionModelRepository(mockSupabaseClient);
    jest.clearAllMocks();
  });

  describe('ISSUE 1: fromDomain() Method Implementation', () => {
    it('MUST convert FunctionModel to complete database row without undefined errors', () => {
      // RED: This test MUST fail first, then drive the fix
      // The current fromDomain() method is missing required fields
      
      // Arrange: Create minimal valid FunctionModel
      const modelName = ModelName.create('Critical Fix Test').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        description: 'Test model for critical fix',
        version: version,
        currentVersion: version,
        metadata: { test: 'value' },
        permissions: { read: ['user1'] }
      }).value!;

      // Act: This should NOT throw "Cannot read properties of undefined"
      let dbRow: any;
      expect(() => {
        dbRow = (repository as any).fromDomain(model);
      }).not.toThrow();

      // Assert: ALL required fields must be present and properly typed
      expect(dbRow).toBeDefined();
      expect(dbRow.model_id).toBe(model.modelId);
      expect(dbRow.name).toBe('Critical Fix Test');
      expect(dbRow.description).toBe('Test model for critical fix');
      expect(dbRow.version).toBe('1.0.0');
      expect(dbRow.status).toBe(ModelStatus.DRAFT);
      expect(dbRow.current_version).toBe('1.0.0');
      expect(dbRow.version_count).toBe(1);
      
      // These fields were causing "Cannot read properties of undefined"
      expect(dbRow.metadata).toEqual({ test: 'value' });
      expect(dbRow.permissions).toEqual({ read: ['user1'] });
      expect(dbRow.created_at).toBeDefined();
      expect(dbRow.updated_at).toBeDefined();
      expect(dbRow.last_saved_at).toBeDefined();
      
      // Type validation
      expect(typeof dbRow.model_id).toBe('string');
      expect(typeof dbRow.name).toBe('string');
      expect(typeof dbRow.version).toBe('string');
      expect(typeof dbRow.created_at).toBe('string');
      expect(typeof dbRow.updated_at).toBe('string');
      expect(typeof dbRow.last_saved_at).toBe('string');
    });

    it('MUST handle empty metadata and permissions without errors', () => {
      // RED: This drives the fix for default object handling
      
      // Arrange: Model with no explicit metadata/permissions
      const modelName = ModelName.create('Empty Objects Test').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
        // No metadata or permissions provided
      }).value!;

      // Act: Should not throw undefined errors
      const dbRow = (repository as any).fromDomain(model);

      // Assert: Should default to empty objects, not undefined
      expect(dbRow.metadata).toEqual({});
      expect(dbRow.permissions).toEqual({});
      expect(typeof dbRow.metadata).toBe('object');
      expect(typeof dbRow.permissions).toBe('object');
    });

    it('MUST serialize Date objects to ISO string format', () => {
      // RED: This drives proper date serialization
      
      // Arrange
      const modelName = ModelName.create('Date Serialization Test').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Act
      const dbRow = (repository as any).fromDomain(model);

      // Assert: All dates must be valid ISO strings
      expect(typeof dbRow.created_at).toBe('string');
      expect(typeof dbRow.updated_at).toBe('string');
      expect(typeof dbRow.last_saved_at).toBe('string');
      
      // Verify they are valid ISO strings
      expect(() => new Date(dbRow.created_at)).not.toThrow();
      expect(() => new Date(dbRow.updated_at)).not.toThrow();
      expect(() => new Date(dbRow.last_saved_at)).not.toThrow();
      
      expect(new Date(dbRow.created_at).toISOString()).toBe(dbRow.created_at);
      expect(new Date(dbRow.updated_at).toISOString()).toBe(dbRow.updated_at);
      expect(new Date(dbRow.last_saved_at).toISOString()).toBe(dbRow.last_saved_at);
    });
  });

  describe('ISSUE 2: Table Name Configuration', () => {
    it('MUST use correct table name "function_models" for all queries', async () => {
      // RED: This drives the fix for "Table does not exist" errors
      
      // Arrange: Mock Supabase client to track table names
      const mockFrom = jest.fn();
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      });
      
      (repository as any).supabase = { from: mockFrom };
      mockFrom.mockReturnValue({ select: mockSelect });

      const modelId = '12345678-1234-1234-1234-123456789012';

      // Act: Call method that caused "Table does not exist"
      await repository.findById(modelId);

      // Assert: MUST use correct table name
      expect(mockFrom).toHaveBeenCalledWith('function_models');
      expect(mockFrom).toHaveBeenCalledTimes(3); // model + nodes + actions queries
    });

    it('MUST use correct node table name "function_model_nodes"', async () => {
      // RED: This drives node table name fix
      
      // Arrange
      const mockFrom = jest.fn();
      (repository as any).supabase = { from: mockFrom };
      
      mockFrom.mockImplementation((tableName: string) => {
        if (tableName === 'function_models') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      model_id: '12345678-1234-1234-1234-123456789012',
                      name: 'Test',
                      version: '1.0.0',
                      status: 'draft',
                      current_version: '1.0.0',
                      version_count: 1,
                      created_at: '2024-01-01T00:00:00.000Z',
                      updated_at: '2024-01-01T00:00:00.000Z',
                      last_saved_at: '2024-01-01T00:00:00.000Z'
                    },
                    error: null
                  })
                })
              })
            })
          };
        } else {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          };
        }
      });

      // Act
      await repository.findById('12345678-1234-1234-1234-123456789012');

      // Assert: Must access nodes table
      const tableCalls = mockFrom.mock.calls.map(call => call[0]);
      expect(tableCalls).toContain('function_model_nodes');
      expect(tableCalls).toContain('function_model_actions');
    });
  });

  describe('ISSUE 3: Database Schema Alignment', () => {
    it('MUST handle all database columns that exist in real schema', () => {
      // RED: This drives complete schema alignment
      
      // Arrange: Database row with ALL actual columns from real schema
      const completeDbRow = {
        model_id: '12345678-1234-1234-1234-123456789012',
        name: 'Complete Schema Test',
        description: 'Test with all columns',
        version: '1.0.0',
        status: ModelStatus.DRAFT,
        current_version: '1.0.0',
        version_count: 1,
        metadata: { schema: 'complete' },
        permissions: { access: 'full' },
        ai_agent_config: { model: 'gpt-4' },
        created_at: '2024-01-01T12:00:00.000Z',
        updated_at: '2024-01-02T12:00:00.000Z',
        last_saved_at: '2024-01-03T12:00:00.000Z',
        deleted_at: null,
        deleted_by: null,
        user_id: 'user-123', // This field might exist in real schema
        organization_id: 'org-456' // This field might exist in real schema
      };

      // Act: Should convert without errors
      const result = (repository as any).toDomain(completeDbRow);

      // Assert: Should handle all fields gracefully
      expect(result.isSuccess).toBe(true);
      
      const model = result.value;
      expect(model.modelId).toBe('12345678-1234-1234-1234-123456789012');
      expect(model.name.value).toBe('Complete Schema Test');
      expect(model.description).toBe('Test with all columns');
      expect(model.version.value).toBe('1.0.0');
      expect(model.metadata).toEqual({ schema: 'complete' });
      expect(model.permissions).toEqual({ access: 'full' });
      expect(model.aiAgentConfig).toEqual({ model: 'gpt-4' });
    });

    it('MUST validate required fields and fail gracefully for missing data', () => {
      // RED: This drives proper validation
      
      // Arrange: Incomplete database row missing required fields
      const incompleteDbRow = {
        model_id: '12345678-1234-1234-1234-123456789012',
        name: 'Incomplete Test',
        // Missing version, status, current_version, etc.
      };

      // Act
      const result = (repository as any).toDomain(incompleteDbRow);

      // Assert: Should fail with clear error message
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('version'); // Should mention missing field
    });
  });

  describe('CRITICAL: End-to-End Repository Operations', () => {
    it('MUST perform complete save operation without undefined errors', async () => {
      // RED: This is the ultimate test that drives the complete fix
      
      // Arrange: Setup complete mock chain
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      const mockDelete = jest.fn().mockResolvedValue({ error: null });
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      
      const mockFrom = jest.fn().mockImplementation((tableName: string) => {
        return {
          upsert: mockUpsert,
          delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
          insert: mockInsert
        };
      });
      
      (repository as any).supabase = { from: mockFrom };

      const modelName = ModelName.create('End-to-End Test').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        description: 'Complete end-to-end test',
        version: version,
        currentVersion: version,
        metadata: { test: 'complete' },
        permissions: { save: 'test' }
      }).value!;

      // Act: This MUST NOT throw any undefined errors
      const result = await repository.save(model);

      // Assert: Should succeed completely
      expect(result.isSuccess).toBe(true);
      
      // Verify fromDomain was called without error
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          model_id: model.modelId,
          name: 'End-to-End Test',
          description: 'Complete end-to-end test',
          version: '1.0.0',
          status: ModelStatus.DRAFT,
          current_version: '1.0.0',
          version_count: 1,
          metadata: { test: 'complete' },
          permissions: { save: 'test' },
          created_at: expect.any(String),
          updated_at: expect.any(String),
          last_saved_at: expect.any(String)
        })
      );
    });

    it('MUST perform complete findById operation without table errors', async () => {
      // RED: This drives the complete query fix
      
      // Arrange: Setup successful query response
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          model_id: '12345678-1234-1234-1234-123456789012',
          name: 'Query Test Model',
          description: 'Test model for queries',
          version: '1.0.0',
          status: 'draft',
          current_version: '1.0.0',
          version_count: 1,
          metadata: {},
          permissions: {},
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          last_saved_at: '2024-01-01T00:00:00.000Z'
        },
        error: null
      });

      const mockEq = jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({ single: mockSingle })
      });

      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      
      const mockRelatedEq = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockRelatedSelect = jest.fn().mockReturnValue({ eq: mockRelatedEq });

      const mockFrom = jest.fn().mockImplementation((tableName: string) => {
        if (tableName === 'function_models') {
          return { select: mockSelect };
        } else {
          return { select: mockRelatedSelect };
        }
      });
      
      (repository as any).supabase = { from: mockFrom };

      // Act: This MUST NOT fail with "Table does not exist"
      const result = await repository.findById('12345678-1234-1234-1234-123456789012');

      // Assert: Should succeed completely
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.name.value).toBe('Query Test Model');
      
      // Verify all tables were accessed correctly
      expect(mockFrom).toHaveBeenCalledWith('function_models');
      expect(mockFrom).toHaveBeenCalledWith('function_model_nodes');
      expect(mockFrom).toHaveBeenCalledWith('function_model_actions');
    });
  });
});