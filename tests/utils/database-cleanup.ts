/**
 * @fileoverview Comprehensive Test Database Cleanup Utility
 * 
 * Provides systematic database cleanup for integration tests to prevent:
 * - UUID collisions between test runs
 * - Test data pollution affecting other tests
 * - Foreign key constraint violations during cleanup
 * - Database constraint violations from invalid test data
 * 
 * This utility implements the cleanup methodology from Phase 1 of the
 * Systematic TDD Conversion Plan.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, afterEach } from '@jest/globals';

export class DatabaseCleanupUtil {
  private static instance: DatabaseCleanupUtil;
  private supabase: SupabaseClient;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration for test cleanup');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  public static getInstance(): DatabaseCleanupUtil {
    if (!DatabaseCleanupUtil.instance) {
      DatabaseCleanupUtil.instance = new DatabaseCleanupUtil();
    }
    return DatabaseCleanupUtil.instance;
  }

  /**
   * Clean all test data from database in proper order to avoid FK violations
   */
  public async cleanupAllTestData(): Promise<void> {
    try {
      // Order matters for foreign key constraints
      // Delete in reverse dependency order

      // 1. Delete audit logs (no FK dependencies)
      await this.supabase
        .from('audit_log')
        .delete()
        .neq('audit_id', '00000000-0000-0000-0000-000000000000'); // Keep system records

      // 2. Delete cross-feature links  
      await this.supabase
        .from('cross_feature_links')
        .delete()
        .neq('link_id', '00000000-0000-0000-0000-000000000000');

      // 3. Delete function model nodes (depends on models)
      await this.supabase
        .from('function_model_nodes')
        .delete()
        .neq('model_id', '00000000-0000-0000-0000-000000000000');

      // 4. Delete function models
      await this.supabase
        .from('function_models')
        .delete()
        .neq('model_id', '00000000-0000-0000-0000-000000000000');

      // 5. Delete AI agents
      await this.supabase
        .from('ai_agents')
        .delete()
        .neq('agent_id', '00000000-0000-0000-0000-000000000000');

      console.log('✅ Test database cleanup completed successfully');
    } catch (error) {
      console.error('❌ Test database cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Clean specific test data by IDs with proper FK ordering
   */
  public async cleanupTestDataByIds(cleanupData: {
    auditLogIds?: string[];
    linkIds?: string[];
    nodeIds?: string[];
    modelIds?: string[];
    agentIds?: string[];
  }): Promise<void> {
    try {
      const { auditLogIds, linkIds, nodeIds, modelIds, agentIds } = cleanupData;

      // Clean in reverse dependency order
      if (auditLogIds?.length) {
        await this.supabase.from('audit_log').delete().in('audit_id', auditLogIds);
      }

      if (linkIds?.length) {
        await this.supabase.from('cross_feature_links').delete().in('link_id', linkIds);
      }

      if (nodeIds?.length) {
        await this.supabase.from('function_model_nodes').delete().in('node_id', nodeIds);
      }

      if (modelIds?.length) {
        await this.supabase.from('function_models').delete().in('model_id', modelIds);
      }

      if (agentIds?.length) {
        await this.supabase.from('ai_agents').delete().in('agent_id', agentIds);
      }

    } catch (error) {
      console.error('❌ Selective test cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Generate unique test IDs to prevent UUID collisions
   */
  public generateTestIds(count: number = 1): string[] {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(crypto.randomUUID());
    }
    return ids;
  }

  /**
   * Validate that status values comply with database constraints
   */
  public validateStatusConstraints(status: string, entityType: 'node' | 'action' | 'model'): boolean {
    const validStatuses = {
      node: ['active', 'inactive', 'draft', 'archived', 'error'],
      action: ['draft', 'active', 'inactive', 'executing', 'completed', 'failed', 'retrying', 'archived', 'error'],
      model: ['draft', 'published', 'archived']
    };

    return validStatuses[entityType].includes(status);
  }

  /**
   * Get existing user ID to avoid FK violations
   * Uses the test user created in previous successful tests
   */
  public getTestUserId(): string {
    return '75636522-311b-4e58-9735-0b32fda9b3c6'; // Existing user from working tests
  }
}

/**
 * Convenience function for test setup
 */
export function setupDatabaseCleanup() {
  const cleanup = DatabaseCleanupUtil.getInstance();
  
  beforeEach(async () => {
    // Clean before each test to ensure isolation
    await cleanup.cleanupAllTestData();
  });

  afterEach(async () => {
    // Clean after each test to prevent pollution
    await cleanup.cleanupAllTestData();
  });

  return cleanup;
}