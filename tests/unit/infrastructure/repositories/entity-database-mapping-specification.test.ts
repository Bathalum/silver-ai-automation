/**
 * Entity-Database Mapping Specification Tests
 * 
 * TDD Tests to drive implementation of entity-database mapping methods
 * These tests act as specifications for the repository's data transformation layer
 * 
 * Key Problems Being Driven:
 * 1. "Cannot read properties of undefined (reading 'values')" - fromDomain() method incomplete
 * 2. Missing required database columns in FunctionModelRow interface 
 * 3. Improper serialization of value objects and complex domain objects
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseFunctionModelRepository } from '../../../../lib/infrastructure/repositories/supabase-function-model-repository';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { ModelStatus } from '../../../../lib/domain/enums';

// Mock Supabase client to isolate mapping logic testing
const mockSupabaseClient = {
  from: jest.fn()
} as unknown as SupabaseClient;

describe('Entity-Database Mapping Specification', () => {
  let repository: SupabaseFunctionModelRepository;

  beforeEach(() => {
    repository = new SupabaseFunctionModelRepository(mockSupabaseClient);
    jest.clearAllMocks();
  });

  describe('fromDomain() Method Specification', () => {
    it('should convert FunctionModel entity to complete database row with all required fields', () => {
      // RED: This test will fail because fromDomain() doesn't handle all required database fields
      
      // Arrange: Create a minimal valid FunctionModel
      const modelName = ModelName.create('Test Model').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        description: 'Test Description',
        version: version,
        currentVersion: version
      }).value!;

      // Act: Convert domain entity to database row
      const dbRow = (repository as any).fromDomain(model);

      // Assert: Database row should contain ALL required fields that database expects
      expect(dbRow).toBeDefined();
      expect(dbRow.model_id).toBe(model.modelId);
      expect(dbRow.name).toBe('Test Model');
      expect(dbRow.description).toBe('Test Description');
      expect(dbRow.version).toBe('1.0.0');
      expect(dbRow.status).toBe(ModelStatus.DRAFT);
      expect(dbRow.current_version).toBe('1.0.0');
      expect(dbRow.version_count).toBe(model.versionCount);
      
      // These fields are currently causing "Cannot read properties of undefined"
      expect(dbRow.metadata).toBeDefined();
      expect(dbRow.permissions).toBeDefined();
      expect(dbRow.created_at).toBeDefined();
      expect(dbRow.updated_at).toBeDefined();
      expect(dbRow.last_saved_at).toBeDefined();
      
      // Optional fields should be properly handled
      expect(dbRow.ai_agent_config).toBeUndefined(); // Should be undefined, not cause error
      expect(dbRow.deleted_at).toBeUndefined();
      expect(dbRow.deleted_by).toBeUndefined();
    });

    it('should handle empty metadata and permissions objects correctly', () => {
      // RED: This test will fail because metadata/permissions aren't initialized properly
      
      // Arrange: Create model with no explicit metadata/permissions
      const modelName = ModelName.create('Empty Meta Model').value!;
      const version = Version.create('2.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        description: 'Model with default metadata',
        version: version,
        currentVersion: version
      }).value!;

      // Act
      const dbRow = (repository as any).fromDomain(model);

      // Assert: Empty objects should be serialized as empty objects, not undefined
      expect(dbRow.metadata).toEqual({});
      expect(dbRow.permissions).toEqual({});
      expect(typeof dbRow.metadata).toBe('object');
      expect(typeof dbRow.permissions).toBe('object');
    });

    it('should serialize Date objects to ISO string format', () => {
      // RED: This test will fail because date serialization isn't handled consistently
      
      // Arrange
      const modelName = ModelName.create('Date Test Model').value!;
      const version = Version.create('1.5.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version
      }).value!;

      // Act
      const dbRow = (repository as any).fromDomain(model);

      // Assert: All date fields should be ISO strings
      expect(typeof dbRow.created_at).toBe('string');
      expect(typeof dbRow.updated_at).toBe('string');
      expect(typeof dbRow.last_saved_at).toBe('string');
      
      // Should be valid ISO date strings
      expect(new Date(dbRow.created_at).toISOString()).toBe(dbRow.created_at);
      expect(new Date(dbRow.updated_at).toISOString()).toBe(dbRow.updated_at);
      expect(new Date(dbRow.last_saved_at).toISOString()).toBe(dbRow.last_saved_at);
    });

    it('should handle soft deletion fields correctly', () => {
      // RED: This test will fail because soft deletion isn't properly serialized
      
      // Arrange: Create a soft-deleted model (this would be set via domain service)
      const modelName = ModelName.create('Deleted Model').value!;
      const version = Version.create('1.0.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version,
        deletedAt: new Date('2024-01-15T10:30:00.000Z'),
        deletedBy: 'user-123'
      }).value!;

      // Act
      const dbRow = (repository as any).fromDomain(model);

      // Assert: Soft deletion fields should be properly serialized
      expect(dbRow.deleted_at).toBe('2024-01-15T10:30:00.000Z');
      expect(dbRow.deleted_by).toBe('user-123');
    });

    it('should serialize value objects using their toString() methods', () => {
      // RED: This test will fail because value objects aren't properly serialized
      
      // Arrange
      const modelName = ModelName.create('Value Object Test').value!;
      const version = Version.create('2.1.0').value!;
      const currentVersion = Version.create('1.8.0').value!;
      
      const model = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: currentVersion
      }).value!;

      // Act
      const dbRow = (repository as any).fromDomain(model);

      // Assert: Value objects should be serialized to their string representations
      expect(dbRow.name).toBe(modelName.toString());
      expect(dbRow.version).toBe(version.toString());
      expect(dbRow.current_version).toBe(currentVersion.toString());
      
      // Verify these are actual strings, not objects
      expect(typeof dbRow.name).toBe('string');
      expect(typeof dbRow.version).toBe('string');
      expect(typeof dbRow.current_version).toBe('string');
    });
  });

  describe('toDomain() Method Specification', () => {
    it('should convert database row to FunctionModel entity with all properties intact', () => {
      // RED: This test will fail because toDomain() doesn't handle all database fields properly
      
      // Arrange: Database row with all possible fields
      const dbRow = {
        model_id: '12345678-1234-1234-1234-123456789012',
        name: 'Database Model',
        description: 'Model from database',
        version: '1.0.0',
        status: ModelStatus.DRAFT,
        current_version: '1.0.0',
        version_count: 1,
        metadata: { key: 'value', nested: { prop: 'test' } },
        permissions: { read: ['user1'], write: ['user2'] },
        ai_agent_config: { type: 'gpt-4', settings: {} },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        last_saved_at: '2024-01-03T00:00:00.000Z',
        deleted_at: null,
        deleted_by: null
      };

      // Act
      const result = (repository as any).toDomain(dbRow);

      // Assert: Should successfully create domain entity
      expect(result.isSuccess).toBe(true);
      
      const model = result.value;
      expect(model.modelId).toBe(dbRow.model_id);
      expect(model.name.value).toBe('Database Model');
      expect(model.description).toBe('Model from database');
      expect(model.version.value).toBe('1.0.0');
      expect(model.currentVersion.value).toBe('1.0.0');
      expect(model.status).toBe(ModelStatus.DRAFT);
      expect(model.versionCount).toBe(1);
      expect(model.metadata).toEqual(dbRow.metadata);
      expect(model.permissions).toEqual(dbRow.permissions);
      expect(model.aiAgentConfig).toEqual(dbRow.ai_agent_config);
    });

    it('should handle null/undefined optional fields gracefully', () => {
      // RED: This test will fail because null handling isn't robust
      
      // Arrange: Minimal database row with null optional fields
      const dbRow = {
        model_id: '12345678-1234-1234-1234-123456789013',
        name: 'Minimal Model',
        description: null, // Null optional field
        version: '1.0.0',
        status: ModelStatus.DRAFT,
        current_version: '1.0.0',
        version_count: 1,
        metadata: null, // Should default to {}
        permissions: null, // Should default to {}
        ai_agent_config: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        last_saved_at: '2024-01-03T00:00:00.000Z',
        deleted_at: null,
        deleted_by: null
      };

      // Act
      const result = (repository as any).toDomain(dbRow);

      // Assert: Should handle nulls gracefully
      expect(result.isSuccess).toBe(true);
      
      const model = result.value;
      expect(model.description).toBeUndefined();
      expect(model.metadata).toEqual({});
      expect(model.permissions).toEqual({});
      expect(model.aiAgentConfig).toBeUndefined();
      expect(model.deletedAt).toBeUndefined();
      expect(model.deletedBy).toBeUndefined();
    });

    it('should validate value objects during conversion and fail gracefully', () => {
      // RED: This test will fail because validation isn't properly integrated
      
      // Arrange: Database row with invalid value objects
      const dbRow = {
        model_id: '12345678-1234-1234-1234-123456789014',
        name: '', // Invalid empty name
        version: 'invalid-version', // Invalid version format
        status: ModelStatus.DRAFT,
        current_version: '1.0.0',
        version_count: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        last_saved_at: '2024-01-03T00:00:00.000Z'
      };

      // Act
      const result = (repository as any).toDomain(dbRow);

      // Assert: Should fail with clear validation error
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invalid'); // Should specify which field is invalid
    });

    it('should convert string dates back to Date objects', () => {
      // RED: This test will fail because date parsing isn't implemented
      
      // Arrange
      const dbRow = {
        model_id: '12345678-1234-1234-1234-123456789015',
        name: 'Date Conversion Test',
        version: '1.0.0',
        status: ModelStatus.DRAFT,
        current_version: '1.0.0',
        version_count: 1,
        created_at: '2024-01-01T12:30:45.123Z',
        updated_at: '2024-01-02T14:15:30.456Z',
        last_saved_at: '2024-01-03T16:45:15.789Z',
        deleted_at: '2024-01-04T18:00:00.000Z'
      };

      // Act
      const result = (repository as any).toDomain(dbRow);

      // Assert: Should convert string dates to Date objects
      expect(result.isSuccess).toBe(true);
      
      const model = result.value;
      expect(model.createdAt).toBeInstanceOf(Date);
      expect(model.updatedAt).toBeInstanceOf(Date);
      expect(model.lastSavedAt).toBeInstanceOf(Date);
      expect(model.deletedAt).toBeInstanceOf(Date);
      
      // Verify exact date values
      expect(model.createdAt.toISOString()).toBe('2024-01-01T12:30:45.123Z');
      expect(model.updatedAt.toISOString()).toBe('2024-01-02T14:15:30.456Z');
      expect(model.lastSavedAt.toISOString()).toBe('2024-01-03T16:45:15.789Z');
      expect(model.deletedAt!.toISOString()).toBe('2024-01-04T18:00:00.000Z');
    });
  });

  describe('Round-Trip Data Integrity Specification', () => {
    it('should preserve all data through fromDomain -> toDomain round trip', () => {
      // RED: This test will fail because data is lost in round-trip conversion
      
      // Arrange: Create a comprehensive model with all possible data
      const modelName = ModelName.create('Round Trip Test').value!;
      const version = Version.create('1.2.3').value!;
      const currentVersion = Version.create('1.1.0').value!;
      
      const originalModel = FunctionModel.create({
        name: modelName,
        description: 'Comprehensive test model',
        version: version,
        currentVersion: currentVersion,
        metadata: { 
          tags: ['test', 'integration'], 
          complexity: 'high',
          nested: { deep: { value: 42 } }
        },
        permissions: { 
          read: ['user1', 'user2'], 
          write: ['admin'],
          execute: ['system'] 
        },
        aiAgentConfig: { 
          model: 'gpt-4', 
          temperature: 0.7,
          maxTokens: 2000 
        }
      }).value!;

      // Act: Perform round-trip conversion
      const dbRow = (repository as any).fromDomain(originalModel);
      const reconstructedResult = (repository as any).toDomain(dbRow);

      // Assert: All data should be preserved
      expect(reconstructedResult.isSuccess).toBe(true);
      
      const reconstructedModel = reconstructedResult.value;
      expect(reconstructedModel.modelId).toBe(originalModel.modelId);
      expect(reconstructedModel.name.value).toBe(originalModel.name.value);
      expect(reconstructedModel.description).toBe(originalModel.description);
      expect(reconstructedModel.version.value).toBe(originalModel.version.value);
      expect(reconstructedModel.currentVersion.value).toBe(originalModel.currentVersion.value);
      expect(reconstructedModel.status).toBe(originalModel.status);
      expect(reconstructedModel.versionCount).toBe(originalModel.versionCount);
      
      // Deep object equality
      expect(reconstructedModel.metadata).toEqual(originalModel.metadata);
      expect(reconstructedModel.permissions).toEqual(originalModel.permissions);
      expect(reconstructedModel.aiAgentConfig).toEqual(originalModel.aiAgentConfig);
      
      // Date precision should be preserved (to millisecond)
      expect(reconstructedModel.createdAt.getTime()).toBe(originalModel.createdAt.getTime());
      expect(reconstructedModel.updatedAt.getTime()).toBe(originalModel.updatedAt.getTime());
      expect(reconstructedModel.lastSavedAt.getTime()).toBe(originalModel.lastSavedAt.getTime());
    });

    it('should handle complex nested objects in metadata without data loss', () => {
      // RED: This test will fail because JSON serialization might corrupt complex objects
      
      // Arrange: Model with deeply nested, complex metadata
      const modelName = ModelName.create('Complex Metadata Test').value!;
      const version = Version.create('1.0.0').value!;
      
      const complexMetadata = {
        workflow: {
          stages: [
            { id: 'stage1', type: 'input', config: { timeout: 5000 } },
            { id: 'stage2', type: 'processing', config: { parallel: true, workers: 4 } }
          ],
          connections: [
            { from: 'stage1', to: 'stage2', condition: 'success' }
          ]
        },
        analytics: {
          metrics: ['execution_time', 'success_rate'],
          thresholds: { performance: 0.95, availability: 0.99 },
          history: [
            { timestamp: '2024-01-01T00:00:00.000Z', value: 0.98 },
            { timestamp: '2024-01-02T00:00:00.000Z', value: 0.97 }
          ]
        },
        arrays: ['string1', 'string2'],
        numbers: [1, 2, 3.14, -5],
        booleans: [true, false, true],
        nullValues: [null, null],
        mixed: [1, 'string', true, null, { nested: 'object' }]
      };

      const originalModel = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version,
        metadata: complexMetadata
      }).value!;

      // Act: Round-trip conversion
      const dbRow = (repository as any).fromDomain(originalModel);
      const reconstructedResult = (repository as any).toDomain(dbRow);

      // Assert: Complex metadata should be perfectly preserved
      expect(reconstructedResult.isSuccess).toBe(true);
      expect(reconstructedResult.value.metadata).toEqual(complexMetadata);
      
      // Verify specific nested structures
      const reconstructedMetadata = reconstructedResult.value.metadata;
      expect(reconstructedMetadata.workflow.stages).toHaveLength(2);
      expect(reconstructedMetadata.analytics.thresholds.performance).toBe(0.95);
      expect(reconstructedMetadata.mixed[4]).toEqual({ nested: 'object' });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should provide clear error messages for malformed database rows', () => {
      // RED: This test will fail because error handling isn't comprehensive
      
      // Arrange: Completely malformed database row
      const malformedRow = {
        // Missing required model_id
        name: 'Malformed',
        version: '1.0.0',
        // Missing other required fields
      };

      // Act
      const result = (repository as any).toDomain(malformedRow);

      // Assert: Should fail with clear, actionable error message
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('model_id'); // Should specify missing field
      expect(result.error).not.toContain('undefined'); // Should not have generic errors
    });

    it('should handle extremely large metadata objects gracefully', () => {
      // RED: This test will fail if there are JSON size limits or memory issues
      
      // Arrange: Model with very large metadata
      const largeArray = new Array(10000).fill(0).map((_, i) => ({ 
        id: i, 
        data: `large_data_${i}`.repeat(10) 
      }));
      
      const modelName = ModelName.create('Large Metadata Test').value!;
      const version = Version.create('1.0.0').value!;
      
      const originalModel = FunctionModel.create({
        name: modelName,
        version: version,
        currentVersion: version,
        metadata: { largeArray }
      }).value!;

      // Act: Convert to database and back
      const dbRow = (repository as any).fromDomain(originalModel);
      const reconstructedResult = (repository as any).toDomain(dbRow);

      // Assert: Should handle large objects without error
      expect(reconstructedResult.isSuccess).toBe(true);
      expect(reconstructedResult.value.metadata.largeArray).toHaveLength(10000);
      expect(reconstructedResult.value.metadata.largeArray[9999].id).toBe(9999);
    });
  });
});