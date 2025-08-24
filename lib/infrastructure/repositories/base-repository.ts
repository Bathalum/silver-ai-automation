import { SupabaseClient } from '@supabase/supabase-js';
import { Result } from '../../domain/shared/result';

/**
 * Base repository providing common database operations
 */
export abstract class BaseRepository {
  protected constructor(
    protected readonly supabase: SupabaseClient
  ) {}

  /**
   * Execute a database transaction
   */
  protected async executeTransaction<T>(
    operation: (client: SupabaseClient) => Promise<T>
  ): Promise<Result<T>> {
    try {
      const result = await operation(this.supabase);
      return Result.ok(result);
    } catch (error) {
      return Result.fail(
        `Transaction failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle common database errors
   */
  protected handleDatabaseError(error: any): string {
    if (error?.code === '23505') {
      return 'Resource already exists';
    }
    if (error?.code === '23503') {
      return 'Referenced resource not found';
    }
    if (error?.code === '42P01') {
      return 'Table does not exist';
    }
    if (error?.message?.includes('duplicate key')) {
      return 'Resource already exists';
    }
    if (error?.message?.includes('not found')) {
      return 'Resource not found';
    }
    
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Convert database row to domain entity
   */
  protected abstract toDomain(row: any): any;

  /**
   * Convert domain entity to database row
   */
  protected abstract fromDomain(entity: any): any;
}