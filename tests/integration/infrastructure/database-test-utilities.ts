/**
 * Database Test Utilities - Cleanup and Isolation
 * 
 * Provides utilities for test isolation, database state management,
 * and cleanup operations for integration tests.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Result } from '../../../lib/domain/shared/result';
import { SupabaseTestClient } from './supabase-test-client';

export interface DatabaseSnapshot {
  testId: string;
  timestamp: Date;
  affectedTables: string[];
  rowCounts: Record<string, number>;
}

export interface TestIsolationContext {
  testId: string;
  client: SupabaseClient;
  snapshot: DatabaseSnapshot;
  cleanup: () => Promise<void>;
}

/**
 * Database Test Manager for test isolation and cleanup
 */
export class DatabaseTestManager {
  private static instance: DatabaseTestManager;
  private testClient: SupabaseTestClient;
  private activeTests: Map<string, TestIsolationContext> = new Map();

  private constructor() {
    this.testClient = SupabaseTestClient.getInstance();
  }

  public static getInstance(): DatabaseTestManager {
    if (!DatabaseTestManager.instance) {
      DatabaseTestManager.instance = new DatabaseTestManager();
    }
    return DatabaseTestManager.instance;
  }

  /**
   * Create isolated test context with snapshot
   */
  public async createTestContext(testSuiteName: string, testName: string): Promise<Result<TestIsolationContext>> {
    try {
      const testId = this.generateTestId(testSuiteName, testName);
      const client = await this.testClient.createTransactionClient(testId);
      
      // Create initial database snapshot
      const snapshot = await this.createDatabaseSnapshot(testId);
      
      const context: TestIsolationContext = {
        testId,
        client,
        snapshot,
        cleanup: async () => {
          await this.cleanupTestContext(testId);
        }
      };

      this.activeTests.set(testId, context);
      return Result.ok(context);
    } catch (error) {
      return Result.fail(
        `Failed to create test context: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Cleanup specific test context and restore state
   */
  public async cleanupTestContext(testId: string): Promise<Result<void>> {
    try {
      const context = this.activeTests.get(testId);
      if (!context) {
        return Result.ok(undefined);
      }

      // Rollback transaction (which cleans up test data)
      await this.testClient.rollbackTransaction(testId);
      
      // Verify cleanup by comparing with snapshot
      await this.verifyCleanupComplete(context.snapshot);
      
      this.activeTests.delete(testId);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Failed to cleanup test context: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Cleanup all active test contexts
   */
  public async cleanupAllTestContexts(): Promise<Result<void>> {
    const cleanupResults: Result<void>[] = [];
    
    for (const [testId] of this.activeTests) {
      const result = await this.cleanupTestContext(testId);
      cleanupResults.push(result);
    }

    // Check if any cleanups failed
    const failures = cleanupResults.filter(r => r.isFailure);
    if (failures.length > 0) {
      return Result.fail(
        `Failed to cleanup ${failures.length} test contexts: ${failures.map(f => f.error).join(', ')}`
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Create database snapshot for comparison
   */
  private async createDatabaseSnapshot(testId: string): Promise<DatabaseSnapshot> {
    const tables = [
      'function_models',
      'function_model_nodes', 
      'function_model_actions',
      'node_links',
      'ai_agents',
      'audit_log',
      'function_model_versions'
    ];

    const rowCounts: Record<string, number> = {};
    
    for (const table of tables) {
      const countResult = await this.testClient.getTableRowCount(table);
      rowCounts[table] = countResult.isSuccess ? countResult.value : 0;
    }

    return {
      testId,
      timestamp: new Date(),
      affectedTables: tables,
      rowCounts
    };
  }

  /**
   * Verify cleanup completed successfully
   */
  private async verifyCleanupComplete(originalSnapshot: DatabaseSnapshot): Promise<Result<void>> {
    try {
      for (const table of originalSnapshot.affectedTables) {
        const currentCountResult = await this.testClient.getTableRowCount(table);
        if (currentCountResult.isFailure) {
          return Result.fail(`Failed to verify cleanup for table ${table}: ${currentCountResult.error}`);
        }

        const originalCount = originalSnapshot.rowCounts[table];
        const currentCount = currentCountResult.value;

        // Current count should not exceed original (no test data left behind)
        if (currentCount > originalCount) {
          return Result.fail(
            `Cleanup verification failed for table ${table}: ` +
            `original count ${originalCount}, current count ${currentCount}. ` +
            `Test data may not have been cleaned up properly.`
          );
        }
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Failed to verify cleanup: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate unique test ID for isolation
   */
  private generateTestId(suiteName: string, testName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `test-${suiteName}-${testName}-${timestamp}-${random}`;
  }

  /**
   * Get active test count for monitoring
   */
  public getActiveTestCount(): number {
    return this.activeTests.size;
  }

  /**
   * Force cleanup all test data (emergency cleanup)
   */
  public async emergencyCleanup(): Promise<Result<void>> {
    try {
      // First try to cleanup all active contexts
      await this.cleanupAllTestContexts();
      
      // Then do global cleanup of any remaining test data
      const globalCleanupResult = await this.testClient.cleanupAllTestData();
      if (globalCleanupResult.isFailure) {
        return globalCleanupResult;
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Emergency cleanup failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Test helper functions for common operations
 */
export class DatabaseTestHelpers {
  /**
   * Wait for database operation to complete (with timeout)
   */
  public static async waitForOperation(
    operation: () => Promise<boolean>,
    timeoutMs = 5000,
    intervalMs = 100
  ): Promise<Result<void>> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const isComplete = await operation();
        if (isComplete) {
          return Result.ok(undefined);
        }
      } catch (error) {
        // Continue waiting on errors
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    return Result.fail(`Operation timed out after ${timeoutMs}ms`);
  }

  /**
   * Verify table constraints are enforced
   */
  public static async verifyConstraint(
    client: SupabaseClient,
    tableName: string,
    invalidData: Record<string, any>,
    expectedErrorPattern: string
  ): Promise<Result<void>> {
    try {
      const { error } = await client
        .from(tableName)
        .insert(invalidData);

      if (!error) {
        return Result.fail('Expected constraint violation but operation succeeded');
      }

      if (!error.message.includes(expectedErrorPattern)) {
        return Result.fail(
          `Constraint error message '${error.message}' does not match expected pattern '${expectedErrorPattern}'`
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Failed to verify constraint: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Measure query performance
   */
  public static async measureQueryPerformance(
    operation: () => Promise<any>,
    maxExecutionTimeMs = 1000
  ): Promise<Result<{ duration: number; result: any }>> {
    try {
      const startTime = performance.now();
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (duration > maxExecutionTimeMs) {
        return Result.fail(
          `Query performance test failed: ${duration.toFixed(2)}ms exceeds maximum ${maxExecutionTimeMs}ms`
        );
      }

      return Result.ok({ duration, result });
    } catch (error) {
      return Result.fail(
        `Performance test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Verify data consistency across tables
   */
  public static async verifyReferentialIntegrity(
    client: SupabaseClient,
    parentTable: string,
    parentKey: string,
    childTable: string,
    foreignKey: string
  ): Promise<Result<void>> {
    try {
      // Find orphaned records (child records without parent)
      const { data: orphanedRecords, error } = await client
        .from(childTable)
        .select(`${foreignKey}`)
        .not(foreignKey, 'in', 
          `(SELECT ${parentKey} FROM ${parentTable})`
        );

      if (error) {
        return Result.fail(`Failed to check referential integrity: ${error.message}`);
      }

      if (orphanedRecords && orphanedRecords.length > 0) {
        return Result.fail(
          `Referential integrity violation: Found ${orphanedRecords.length} orphaned records in ${childTable}`
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Failed to verify referential integrity: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Jest setup helpers for integration tests
 */
export const integrationTestSetup = {
  /**
   * Global setup for integration test suite
   */
  async globalSetup(): Promise<void> {
    const testClient = SupabaseTestClient.getInstance();
    
    // Verify database connection
    const connectionResult = await testClient.verifyConnection();
    if (connectionResult.isFailure) {
      throw new Error(`Database connection failed: ${connectionResult.error}`);
    }

    // Initial cleanup
    const cleanupResult = await testClient.cleanupAllTestData();
    if (cleanupResult.isFailure) {
      console.warn(`Initial cleanup warning: ${cleanupResult.error}`);
    }
  },

  /**
   * Global teardown for integration test suite  
   */
  async globalTeardown(): Promise<void> {
    const testManager = DatabaseTestManager.getInstance();
    const cleanupResult = await testManager.emergencyCleanup();
    
    if (cleanupResult.isFailure) {
      console.error(`Global teardown failed: ${cleanupResult.error}`);
    }
  },

  /**
   * Before each test setup
   */
  async beforeEach(testSuiteName: string, testName: string): Promise<TestIsolationContext> {
    const testManager = DatabaseTestManager.getInstance();
    const contextResult = await testManager.createTestContext(testSuiteName, testName);
    
    if (contextResult.isFailure) {
      throw new Error(`Failed to setup test context: ${contextResult.error}`);
    }

    return contextResult.value;
  },

  /**
   * After each test cleanup
   */
  async afterEach(context: TestIsolationContext): Promise<void> {
    await context.cleanup();
  }
};