/**
 * Supabase Test Client - Real Database Integration Testing
 * 
 * Provides a test client that connects to actual Supabase instance
 * with service role key for full database access and cleanup capabilities.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Result } from '../../../lib/domain/shared/result';

export class SupabaseTestClient {
  private static instance: SupabaseTestClient;
  private client: SupabaseClient;
  private transactionClients: Map<string, SupabaseClient> = new Map();

  private constructor() {
    // Use service role key for full database access in tests
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      );
    }

    this.client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  public static getInstance(): SupabaseTestClient {
    if (!SupabaseTestClient.instance) {
      SupabaseTestClient.instance = new SupabaseTestClient();
    }
    return SupabaseTestClient.instance;
  }

  public getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Create a transaction-isolated client for testing
   * WARNING: PostgreSQL transactions via Supabase are limited.
   * This returns the same client but tracks for cleanup.
   */
  public async createTransactionClient(testId: string): Promise<SupabaseClient> {
    // Note: Supabase doesn't support true transactions in client libraries
    // We'll track test clients for cleanup instead
    const transactionClient = this.client;
    this.transactionClients.set(testId, transactionClient);
    return transactionClient;
  }

  /**
   * Rollback transaction by test ID
   * Since we can't rollback, we'll clean up test data
   */
  public async rollbackTransaction(testId: string): Promise<Result<void>> {
    try {
      const client = this.transactionClients.get(testId);
      if (!client) {
        return Result.ok(undefined);
      }

      // Clean up test data created during this test
      await this.cleanupTestData(testId);
      this.transactionClients.delete(testId);

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Failed to rollback transaction: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Clean up all test data by test ID pattern
   */
  private async cleanupTestData(testId: string): Promise<void> {
    const tables = [
      'function_model_actions',
      'function_model_nodes', 
      'function_model_versions',
      'node_links',
      'audit_log',
      'function_models',
      'ai_agents'
    ];

    // Clean up in reverse dependency order
    for (const table of tables) {
      await this.client
        .from(table)
        .delete()
        .like('model_id', `test-${testId}%`)
        .or(`name.like.test-${testId}%,description.like.test-${testId}%`);
    }
  }

  /**
   * Clean up all test data (for global teardown)
   */
  public async cleanupAllTestData(): Promise<Result<void>> {
    try {
      const tables = [
        'function_model_actions',
        'function_model_nodes',
        'function_model_versions', 
        'node_links',
        'audit_log',
        'function_models',
        'ai_agents'
      ];

      // Clean up in reverse dependency order
      for (const table of tables) {
        await this.client
          .from(table)
          .delete()
          .or('model_id.like.test-%,name.like.test-%,description.like.test-%');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Failed to cleanup test data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Verify database connection and required tables exist
   */
  public async verifyConnection(): Promise<Result<void>> {
    try {
      const requiredTables = [
        'function_models',
        'function_model_nodes',
        'function_model_actions',
        'node_links',
        'ai_agents',
        'audit_log'
      ];

      for (const table of requiredTables) {
        const { error } = await this.client
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(0);

        if (error) {
          return Result.fail(`Table '${table}' not accessible: ${error.message}`);
        }
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Database connection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get table row count for verification
   */
  public async getTableRowCount(tableName: string, filter?: Record<string, any>): Promise<Result<number>> {
    try {
      let query = this.client
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { count, error } = await query;

      if (error) {
        return Result.fail(`Failed to count rows: ${error.message}`);
      }

      return Result.ok(count || 0);
    } catch (error) {
      return Result.fail(
        `Failed to get row count: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if test is running in integration mode
   */
  public static isIntegrationTestMode(): boolean {
    return process.env.NODE_ENV === 'test' && 
           process.env.TEST_MODE === 'integration' && 
           !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  /**
   * Skip test if not in integration mode
   */
  public static skipIfNotIntegrationMode(): void {
    if (!SupabaseTestClient.isIntegrationTestMode()) {
      throw new Error('Skipping integration test - not in integration mode');
    }
  }
}

/**
 * Test helper to get configured Supabase client
 */
export function getTestSupabaseClient(): SupabaseClient {
  return SupabaseTestClient.getInstance().getClient();
}

/**
 * Test helper to verify integration test environment
 */
export function requireIntegrationTestEnvironment(): void {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable required for integration tests');
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable required for integration tests');
  }

  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Integration tests must run in test environment (NODE_ENV=test)');
  }
}