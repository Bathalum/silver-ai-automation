/**
 * Production End-to-End Verification Test
 * 
 * Verifies that the repository works with actual production data,
 * not just test data. This ensures real-world functionality.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseFunctionModelRepository } from '../../../lib/infrastructure/repositories/supabase-function-model-repository';

describe('Production End-to-End Verification', () => {
  let supabase: SupabaseClient;
  let repository: SupabaseFunctionModelRepository;

  beforeAll(() => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not found');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
    repository = new SupabaseFunctionModelRepository(supabase);
  });

  it('should retrieve existing production function models', async () => {
    // Test that we can read actual production data
    const result = await repository.findAll();

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBeDefined();
    expect(Array.isArray(result.value)).toBe(true);
    expect(result.value!.length).toBeGreaterThan(0); // Should have existing models
    
    console.log(`✅ Found ${result.value!.length} production models`);
  });

  it('should retrieve a specific production model by ID', async () => {
    // First get the list of models
    const allModelsResult = await repository.findAll();
    expect(allModelsResult.isSuccess).toBe(true);
    expect(allModelsResult.value!.length).toBeGreaterThan(0);

    // Get the first model ID
    const firstModelId = allModelsResult.value![0].modelId;
    
    // Retrieve it by ID
    const modelResult = await repository.findById(firstModelId);
    
    expect(modelResult.isSuccess).toBe(true);
    expect(modelResult.value).toBeDefined();
    expect(modelResult.value!.modelId).toBe(firstModelId);
    
    console.log(`✅ Retrieved production model: ${modelResult.value!.name.value}`);
  });

  it('should handle production model existence checks', async () => {
    // Get a model ID from production
    const allModelsResult = await repository.findAll();
    expect(allModelsResult.isSuccess).toBe(true);
    const existingModelId = allModelsResult.value![0].modelId;

    // Check that it exists
    const existsResult = await repository.exists(existingModelId);
    expect(existsResult.isSuccess).toBe(true);
    expect(existsResult.value).toBe(true);

    // Check that non-existent ID returns false
    const notExistsResult = await repository.exists('00000000-0000-0000-0000-000000000000');
    expect(notExistsResult.isSuccess).toBe(true);
    expect(notExistsResult.value).toBe(false);

    console.log(`✅ Production existence checks working correctly`);
  });

  it('should properly handle production database constraints', async () => {
    // Test error handling with production database constraints
    const result = await repository.findById('invalid-uuid-format');
    
    // This should either return null (not found) or fail gracefully
    expect(result.isSuccess).toBe(true);
    expect(result.value).toBeNull();

    console.log(`✅ Production constraint handling working correctly`);
  });
});