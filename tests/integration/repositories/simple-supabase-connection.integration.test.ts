/**
 * Simple Supabase Connection Integration Test
 * 
 * Tests basic database connectivity and table access
 * Following Clean Architecture TDD principles
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

describe('Simple Supabase Database Connection', () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    // Create Supabase client using environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not found');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  });

  afterAll(async () => {
    // Clean up any connections
    if (supabase) {
      // Supabase client doesn't have explicit close method
      // Connections are handled automatically
    }
  });

  it('should connect to Supabase and list function_models table', async () => {
    // Test basic connectivity by querying the function_models table
    const { data, error } = await supabase
      .from('function_models')
      .select('model_id, name, status')
      .limit(1);
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should verify table structure exists', async () => {
    // Test that required tables exist by attempting to query them
    const tables = ['function_models', 'node_links', 'ai_agents'];
    
    for (const tableName of tables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0); // Just check structure, don't return data
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    }
  });

  it('should handle query errors gracefully', async () => {
    // Test error handling by querying non-existent table
    const { data, error } = await supabase
      .from('non_existent_table')
      .select('*');
    
    expect(error).toBeDefined();
    expect(data).toBeNull();
  });
});