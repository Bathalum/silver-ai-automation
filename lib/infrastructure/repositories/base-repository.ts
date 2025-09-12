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
    // Handle Supabase error objects with proper serialization
    if (error && typeof error === 'object') {
      // Check for Supabase error structure
      if (error.code && error.message) {
        // Handle specific Supabase error codes
        if (error.code === '23505') {
          return 'Resource already exists';
        }
        if (error.code === '23503') {
          return 'Referenced resource not found';
        }
        if (error.code === '42P01') {
          return 'Table does not exist';
        }
        if (error.code === '22P02') {
          return `Invalid data format: ${error.message}`;
        }
        
        // Return structured error message for Supabase errors
        return `Database error (${error.code}): ${error.message}`;
      }
      
      // Handle generic error objects with message property
      if (error.message) {
        if (error.message.includes('duplicate key')) {
          return 'Resource already exists';
        }
        if (error.message.includes('not found')) {
          return 'Resource not found';
        }
        return error.message;
      }
      
      // Last resort: serialize the error object to prevent [object Object]
      try {
        const serialized = JSON.stringify(error, null, 2);
        return `Error object: ${serialized}`;
      } catch (serializeError) {
        return `Error object (failed to serialize): ${error.toString()}`;
      }
    }
    
    // Handle Error instances
    if (error instanceof Error) {
      return error.message;
    }
    
    // Handle primitive values
    return String(error);
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