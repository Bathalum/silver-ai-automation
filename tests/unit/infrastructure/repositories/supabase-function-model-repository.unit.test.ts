/**
 * Unit tests for SupabaseFunctionModelRepository serialization methods
 * Tests the core domain/database mapping without actual database calls
 */

import { describe, it, expect, jest } from '@jest/globals';
import { SupabaseFunctionModelRepository } from '../../../../lib/infrastructure/repositories/supabase-function-model-repository';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { ModelStatus } from '../../../../lib/domain/enums';

describe('SupabaseFunctionModelRepository - Unit Tests', () => {
  let repository: SupabaseFunctionModelRepository;
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            is: jest.fn(() => ({
              single: jest.fn(async () => ({ data: null, error: null }))
            }))
          }))
        })),
        insert: jest.fn(async () => ({ error: null })),
        upsert: jest.fn(async () => ({ error: null })),
        delete: jest.fn(() => ({
          eq: jest.fn(async () => ({ error: null }))
        }))
      }))
    };

    repository = new SupabaseFunctionModelRepository(mockSupabaseClient);
  });

  describe('Domain to Database Conversion (fromDomain)', () => {
    it('should convert FunctionModel to database row correctly', () => {
      // Arrange
      const modelNameResult = ModelName.create('Test Model Name');
      const versionResult = Version.create('1.0.0');
      
      expect(modelNameResult.isSuccess).toBe(true);
      expect(versionResult.isSuccess).toBe(true);
      
      const modelResult = FunctionModel.create({
        name: modelNameResult.value!,
        description: 'Test description',
        version: versionResult.value!,
        currentVersion: versionResult.value!,
        status: ModelStatus.DRAFT
      });
      
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value!;

      // Act - Use any to access protected method for testing
      const dbRow = (repository as any).fromDomain(model);

      // Assert
      expect(dbRow).toBeDefined();
      expect(dbRow.model_id).toBe(model.modelId);
      expect(dbRow.name).toBe('Test Model Name');
      expect(dbRow.description).toBe('Test description');
      expect(dbRow.version).toBe('1.0.0');
      expect(dbRow.status).toBe(ModelStatus.DRAFT);
      expect(dbRow.current_version).toBe('1.0.0');
      expect(dbRow.version_count).toBe(1);
      expect(dbRow.metadata).toEqual({});
      expect(dbRow.permissions).toEqual({});
      expect(dbRow.ai_agent_config).toBeNull();
      expect(dbRow.created_at).toBeDefined();
      expect(dbRow.updated_at).toBeDefined();
      expect(dbRow.last_saved_at).toBeDefined();
      expect(dbRow.deleted_at).toBeNull();
      expect(dbRow.deleted_by).toBeNull();
    });

    it('should handle model with all optional fields', () => {
      // Arrange
      const modelNameResult = ModelName.create('Full Test Model');
      const versionResult = Version.create('2.1.0');
      
      expect(modelNameResult.isSuccess).toBe(true);
      expect(versionResult.isSuccess).toBe(true);
      
      const modelResult = FunctionModel.create({
        name: modelNameResult.value!,
        description: 'Full test description',
        version: versionResult.value!,
        currentVersion: versionResult.value!,
        status: ModelStatus.PUBLISHED,
        metadata: { key: 'value' },
        permissions: { role: 'admin' },
        aiAgentConfig: { agent: 'test' }
      });
      
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value!;

      // Act
      const dbRow = (repository as any).fromDomain(model);

      // Assert
      expect(dbRow.name).toBe('Full Test Model');
      expect(dbRow.description).toBe('Full test description');
      expect(dbRow.version).toBe('2.1.0');
      expect(dbRow.status).toBe(ModelStatus.PUBLISHED);
      expect(dbRow.metadata).toEqual({ key: 'value' });
      expect(dbRow.permissions).toEqual({ role: 'admin' });
      expect(dbRow.ai_agent_config).toEqual({ agent: 'test' });
    });

    it('should handle model without optional fields', () => {
      // Arrange
      const modelNameResult = ModelName.create('Minimal Model');
      const versionResult = Version.create('1.0.0');
      
      expect(modelNameResult.isSuccess).toBe(true);
      expect(versionResult.isSuccess).toBe(true);
      
      const modelResult = FunctionModel.create({
        name: modelNameResult.value!,
        version: versionResult.value!,
        currentVersion: versionResult.value!
      });
      
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value!;

      // Act
      const dbRow = (repository as any).fromDomain(model);

      // Assert
      expect(dbRow.name).toBe('Minimal Model');
      expect(dbRow.description).toBeNull();
      expect(dbRow.ai_agent_config).toBeNull();
    });
  });

  describe('Database to Domain Conversion (toDomain)', () => {
    it('should convert database row to FunctionModel correctly', () => {
      // Arrange
      const dbRow = {
        model_id: '12345678-1234-1234-1234-123456789012',
        name: 'Test DB Model',
        description: 'From database',
        version: '1.0.0',
        status: ModelStatus.DRAFT,
        current_version: '1.0.0',
        version_count: 1,
        metadata: { source: 'db' },
        permissions: { access: 'read' },
        ai_agent_config: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        last_saved_at: '2023-01-01T00:00:00.000Z',
        deleted_at: null,
        deleted_by: null
      };

      // Act - Use any to access protected method for testing
      const domainResult = (repository as any).toDomain(dbRow);

      // Assert
      expect(domainResult.isSuccess).toBe(true);
      const model = domainResult.value;
      expect(model.modelId).toBe('12345678-1234-1234-1234-123456789012');
      expect(model.name.value).toBe('Test DB Model');
      expect(model.description).toBe('From database');
      expect(model.version.value).toBe('1.0.0');
      expect(model.status).toBe(ModelStatus.DRAFT);
      expect(model.currentVersion.value).toBe('1.0.0');
      expect(model.versionCount).toBe(1);
      expect(model.metadata).toEqual({ source: 'db' });
      expect(model.permissions).toEqual({ access: 'read' });
      expect(model.aiAgentConfig).toBeUndefined();
      expect(model.createdAt.toISOString()).toBe('2023-01-01T00:00:00.000Z');
      expect(model.updatedAt.toISOString()).toBe('2023-01-01T00:00:00.000Z');
      expect(model.lastSavedAt.toISOString()).toBe('2023-01-01T00:00:00.000Z');
      expect(model.deletedAt).toBeUndefined();
      expect(model.deletedBy).toBeUndefined();
    });

    it('should handle database row with null values', () => {
      // Arrange
      const dbRow = {
        model_id: '12345678-1234-1234-1234-123456789013',
        name: 'Null Test Model',
        description: null,
        version: '1.0.0',
        status: ModelStatus.DRAFT,
        current_version: '1.0.0',
        version_count: 1,
        metadata: {},
        permissions: {},
        ai_agent_config: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        last_saved_at: '2023-01-01T00:00:00.000Z',
        deleted_at: null,
        deleted_by: null
      };

      // Act
      const domainResult = (repository as any).toDomain(dbRow);

      // Assert
      expect(domainResult.isSuccess).toBe(true);
      const model = domainResult.value;
      expect(model.description).toBeUndefined();
      expect(model.aiAgentConfig).toBeUndefined();
    });

    it('should fail with invalid model name', () => {
      // Arrange - empty name should fail
      const dbRow = {
        model_id: '12345678-1234-1234-1234-123456789014',
        name: '', // Invalid - too short
        description: 'Test',
        version: '1.0.0',
        status: ModelStatus.DRAFT,
        current_version: '1.0.0',
        version_count: 1,
        metadata: {},
        permissions: {},
        ai_agent_config: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        last_saved_at: '2023-01-01T00:00:00.000Z',
        deleted_at: null,
        deleted_by: null
      };

      // Act
      const domainResult = (repository as any).toDomain(dbRow);

      // Assert
      expect(domainResult.isFailure).toBe(true);
      expect(domainResult.error).toContain('Invalid model name');
    });

    it('should fail with invalid version', () => {
      // Arrange
      const dbRow = {
        model_id: '12345678-1234-1234-1234-123456789015',
        name: 'Valid Name',
        description: 'Test',
        version: 'invalid-version', // Invalid version format
        status: ModelStatus.DRAFT,
        current_version: '1.0.0',
        version_count: 1,
        metadata: {},
        permissions: {},
        ai_agent_config: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        last_saved_at: '2023-01-01T00:00:00.000Z',
        deleted_at: null,
        deleted_by: null
      };

      // Act
      const domainResult = (repository as any).toDomain(dbRow);

      // Assert
      expect(domainResult.isFailure).toBe(true);
      expect(domainResult.error).toContain('Invalid version');
    });
  });

  describe('Round-trip Conversion', () => {
    it('should maintain data integrity through round-trip conversion', () => {
      // Arrange - Create original model
      const modelNameResult = ModelName.create('Round Trip Test');
      const versionResult = Version.create('1.2.3');
      
      expect(modelNameResult.isSuccess).toBe(true);
      expect(versionResult.isSuccess).toBe(true);
      
      const originalModelResult = FunctionModel.create({
        name: modelNameResult.value!,
        description: 'Round trip test description',
        version: versionResult.value!,
        currentVersion: versionResult.value!,
        status: ModelStatus.PUBLISHED,
        metadata: { test: 'data' },
        permissions: { read: true },
        aiAgentConfig: { config: 'value' }
      });
      
      expect(originalModelResult.isSuccess).toBe(true);
      const originalModel = originalModelResult.value!;

      // Act - Convert to database row and back to domain
      const dbRow = (repository as any).fromDomain(originalModel);
      const reconstructedResult = (repository as any).toDomain(dbRow);

      // Assert
      expect(reconstructedResult.isSuccess).toBe(true);
      const reconstructedModel = reconstructedResult.value;
      
      expect(reconstructedModel.modelId).toBe(originalModel.modelId);
      expect(reconstructedModel.name.value).toBe(originalModel.name.value);
      expect(reconstructedModel.description).toBe(originalModel.description);
      expect(reconstructedModel.version.value).toBe(originalModel.version.value);
      expect(reconstructedModel.status).toBe(originalModel.status);
      expect(reconstructedModel.currentVersion.value).toBe(originalModel.currentVersion.value);
      expect(reconstructedModel.versionCount).toBe(originalModel.versionCount);
      expect(reconstructedModel.metadata).toEqual(originalModel.metadata);
      expect(reconstructedModel.permissions).toEqual(originalModel.permissions);
      expect(reconstructedModel.aiAgentConfig).toEqual(originalModel.aiAgentConfig);
    });
  });
});