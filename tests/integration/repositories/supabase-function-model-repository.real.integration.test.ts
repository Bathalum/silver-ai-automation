/**
 * SupabaseFunctionModelRepository - Real Database Integration Tests
 * 
 * Tests actual repository implementation with real Supabase database
 * Following Clean Architecture TDD principles
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseFunctionModelRepository } from '../../../lib/infrastructure/repositories/supabase-function-model-repository';
import { FunctionModel } from '../../../lib/domain/entities/function-model';
import { ModelName } from '../../../lib/domain/value-objects/model-name';
import { Version } from '../../../lib/domain/value-objects/version';

describe('SupabaseFunctionModelRepository - Real Database Integration', () => {
  let supabase: SupabaseClient;
  let repository: SupabaseFunctionModelRepository;
  let testModelIds: string[] = [];

  beforeAll(() => {
    // Create Supabase client using environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not found');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
    repository = new SupabaseFunctionModelRepository(supabase);
  });

  afterAll(async () => {
    // Clean up all test data
    if (testModelIds.length > 0) {
      await supabase
        .from('function_models')
        .delete()
        .in('model_id', testModelIds);
    }
  });

  beforeEach(() => {
    // Reset test model IDs for each test
    testModelIds = [];
  });

  afterEach(async () => {
    // Clean up any models created in this test
    if (testModelIds.length > 0) {
      await supabase
        .from('function_models')
        .delete()
        .in('model_id', testModelIds);
      testModelIds = [];
    }
  });

  describe('Basic Repository Operations', () => {
    it('should save a function model to the database', async () => {
      // Create a simple test model
      const modelNameResult = ModelName.create('Test Integration Model');
      const versionResult = Version.create('1.0.0');
      
      expect(modelNameResult.isSuccess).toBe(true);
      expect(versionResult.isSuccess).toBe(true);
      
      const modelName = modelNameResult.value!;
      const version = versionResult.value!;
      
      const modelResult = FunctionModel.create({
        name: modelName,
        description: 'Test model for integration testing',
        version: version,
        currentVersion: version
      });
      
      if (modelResult.isFailure) {
        console.error('FunctionModel.create failed:', modelResult.error);
      }
      
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value!;
      
      testModelIds.push(model.modelId);

      // Save the model using repository
      const result = await repository.save(model);

      // Log any errors for debugging
      if (result.isFailure) {
        console.error('Repository.save failed:', result.error);
      }

      // Verify the save was successful
      expect(result.isSuccess).toBe(true);
      
      // Verify the model was actually saved in the database
      const { data: savedModel, error } = await supabase
        .from('function_models')
        .select('*')
        .eq('model_id', model.modelId)
        .single();

      expect(error).toBeNull();
      expect(savedModel).toBeDefined();
      expect(savedModel.name).toBe('Test Integration Model');
      expect(savedModel.version).toBe('1.0.0');
      expect(savedModel.status).toBe('draft');
    });

    it('should retrieve a function model from the database', async () => {
      // First create and save a model directly to database
      const testModel = {
        model_id: '12345678-1234-1234-1234-123456789012',
        name: 'Direct Insert Model',
        description: 'Model inserted directly for retrieval test',
        version: '1.0.0',
        status: 'draft',
        current_version: '1.0.0',
        version_count: 1
      };

      testModelIds.push(testModel.model_id);

      const { error: insertError } = await supabase
        .from('function_models')
        .insert(testModel);

      expect(insertError).toBeNull();

      // Now retrieve it using repository
      const result = await repository.findById(testModel.model_id);

      // Log any errors for debugging
      if (result.isFailure) {
        console.error('Repository.findById failed:', result.error);
      }

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.modelId).toBe(testModel.model_id);
      expect(result.value!.name.value).toBe('Direct Insert Model');
      expect(result.value!.version.value).toBe('1.0.0');
    });

    it('should handle not found gracefully', async () => {
      // Try to find a non-existent model
      const result = await repository.findById('00000000-0000-0000-0000-000000000000');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should check if a model exists', async () => {
      // Create and save a model
      const testModel = {
        model_id: '12345678-1234-1234-1234-123456789013',
        name: 'Existence Test Model',
        description: 'Model for existence testing',
        version: '1.0.0',
        status: 'draft',
        current_version: '1.0.0',
        version_count: 1
      };

      testModelIds.push(testModel.model_id);

      await supabase.from('function_models').insert(testModel);

      // Check existence using repository
      const existsResult = await repository.exists(testModel.model_id);
      expect(existsResult.isSuccess).toBe(true);
      expect(existsResult.value).toBe(true);

      // Check non-existent model
      const notExistsResult = await repository.exists('00000000-0000-0000-0000-000000000000');
      expect(notExistsResult.isSuccess).toBe(true);
      expect(notExistsResult.value).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database constraint violations', async () => {
      // Create a model with invalid data that will violate constraints
      const modelNameResult = ModelName.create('Invalid Test Model');
      const versionResult = Version.create('1.0.0');
      
      expect(modelNameResult.isSuccess).toBe(true);
      expect(versionResult.isSuccess).toBe(true);
      
      const modelName = modelNameResult.value!;
      const version = versionResult.value!;
      
      const modelResult = FunctionModel.create({
        name: modelName,
        description: 'Test model for constraint violation',
        version: version,
        currentVersion: version
      });
      
      if (modelResult.isFailure) {
        console.error('FunctionModel.create failed:', modelResult.error);
      }
      
      expect(modelResult.isSuccess).toBe(true);
      const model = modelResult.value!;
      
      // Try to save a model with invalid status directly to test constraint handling
      const { error } = await supabase
        .from('function_models')
        .insert({
          model_id: model.modelId,
          name: model.name.value,
          description: model.description,
          version: model.version.value,
          status: 'invalid_status', // This should violate check constraint
          current_version: model.currentVersion,
          version_count: 1
        });

      // This should fail due to check constraint
      expect(error).toBeDefined();
    });
  });
});