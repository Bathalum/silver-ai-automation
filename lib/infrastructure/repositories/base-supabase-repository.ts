import { SupabaseClient } from '@supabase/supabase-js';
import { Result } from '../../domain/shared/result';

/**
 * BaseSupabaseRepository<TEntity, TId>
 * 
 * Generic foundation for all Supabase repositories following Clean Architecture principles.
 * Provides CRUD operations with Result pattern compliance, entity mapping, and error translation.
 * 
 * ARCHITECTURAL BOUNDARIES:
 * - Repository belongs to Infrastructure Layer
 * - Implements domain-defined repository interfaces 
 * - Uses Result pattern for all operations (no thrown exceptions)
 * - Translates database errors to domain-friendly messages
 * - Does not leak Supabase-specific types to Domain/Application layers
 */
export abstract class BaseSupabaseRepository<TEntity, TId> {
  protected constructor(
    protected readonly supabase: SupabaseClient,
    protected readonly tableName: string
  ) {}

  // Core CRUD operations that must return Results
  abstract save(entity: TEntity): Promise<Result<TEntity>>;
  abstract findById(id: TId): Promise<Result<TEntity | null>>;
  abstract findAll(filter?: any): Promise<Result<TEntity[]>>;
  abstract delete(id: TId): Promise<Result<void>>;
  abstract exists(id: TId): Promise<Result<boolean>>;

  // Transaction boundary management
  protected async executeTransaction<T>(
    operation: (client: SupabaseClient) => Promise<T>
  ): Promise<Result<T>> {
    try {
      // Log operation for debugging and monitoring
      console.debug('Repository operation', {
        operation: 'executeTransaction',
        tableName: this.tableName
      });

      const result = await operation(this.supabase);
      
      // Record metrics for performance monitoring
      if ((this as any).metricsCollector) {
        (this as any).metricsCollector.record({
          operation: 'executeTransaction',
          duration: 0, // Would be calculated in real implementation
          success: true
        });
      }

      return Result.ok(result);
    } catch (error) {
      // Record failure metrics
      if ((this as any).metricsCollector) {
        (this as any).metricsCollector.record({
          operation: 'executeTransaction',
          duration: 0,
          success: false
        });
      }

      const translatedError = this.translateDatabaseError(error);
      return Result.fail(`Transaction failed: ${translatedError}`);
    }
  }

  // Entity-Database mapping (Clean Architecture boundary enforcement)
  protected abstract toDomain(row: any): Result<TEntity>;
  protected abstract fromDomain(entity: TEntity): any;

  // Database error handling (Infrastructure concern)
  protected translateDatabaseError(error: any): string {
    // PostgreSQL constraint violations
    if (error?.code === '23505') {
      return 'A resource with these details already exists';
    }
    
    if (error?.code === '23503') {
      return 'Referenced resource not found';
    }

    // Connection and timeout errors
    if (error?.message?.includes('ECONNREFUSED') || 
        error?.message?.includes('connect') ||
        error?.message?.includes('timeout')) {
      return 'Database unavailable. Please try again later.';
    }

    // Generic constraint handling
    if (error?.message?.includes('duplicate key') || 
        error?.message?.includes('unique constraint')) {
      return 'A resource with these details already exists';
    }

    if (error?.message?.includes('foreign key') ||
        error?.message?.includes('violates constraint')) {
      return 'Referenced resource not found';
    }

    // Default for unknown errors - don't expose sensitive information
    return 'An unexpected error occurred while processing your request';
  }

  protected handleConstraintViolation(error: any): string {
    if (error?.code === '23505') {
      return 'A resource with these details already exists';
    }
    
    if (error?.code === '23503') {
      return 'Referenced resource not found';
    }

    return this.translateDatabaseError(error);
  }

  // Common implementation for basic operations
  protected async performFindById(id: TId): Promise<Result<TEntity | null>> {
    try {
      console.debug('Repository operation', {
        operation: 'findById',
        tableName: this.tableName,
        id
      });

      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // Handle "no rows found" as success with null value
        if (error.code === 'PGRST116') {
          return Result.ok(null);
        }
        return Result.fail(this.translateDatabaseError(error));
      }

      if (!data) {
        return Result.ok(null);
      }

      return this.toDomain(data);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  protected async performFindAll(filter?: any): Promise<Result<TEntity[]>> {
    try {
      let query = this.supabase.from(this.tableName).select('*');

      // Apply filters safely to prevent SQL injection
      if (filter) {
        query = this.applyFilters(query, filter);
      }

      // Apply pagination limits to prevent memory exhaustion
      const limit = filter?.limit && filter.limit <= 1000 ? filter.limit : 100;
      query = query.limit(limit);

      if (filter?.offset) {
        query = query.range(filter.offset, filter.offset + limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      if (!data) {
        return Result.ok([]);
      }

      // Convert all rows to domain entities
      const entities: TEntity[] = [];
      for (const row of data) {
        const entityResult = this.toDomain(row);
        if (entityResult.isFailure) {
          return Result.fail(entityResult.error);
        }
        entities.push(entityResult.value);
      }

      return Result.ok(entities);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  protected async performExists(id: TId): Promise<Result<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('id')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return Result.ok(false);
        }
        return Result.fail(this.translateDatabaseError(error));
      }

      return Result.ok(!!data);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  protected async performDelete(id: TId): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(this.translateDatabaseError(error));
    }
  }

  private applyFilters(query: any, filter: any): any {
    // Safely apply filters to prevent SQL injection
    const allowedFilterKeys = ['name', 'status', 'created_at', 'updated_at'];
    
    for (const [key, value] of Object.entries(filter)) {
      if (allowedFilterKeys.includes(key) && value !== undefined && value !== null) {
        // Sanitize string values
        if (typeof value === 'string') {
          const sanitizedValue = value.replace(/[^\w\s-]/g, '');
          if (sanitizedValue.length > 0) {
            query = query.eq(key, sanitizedValue);
          }
        } else if (typeof value === 'number' && Number.isFinite(value)) {
          query = query.eq(key, value);
        }
      }
    }

    // Apply ordering safely
    if (filter.orderBy && allowedFilterKeys.includes(filter.orderBy)) {
      const ascending = filter.orderDirection !== 'desc';
      query = query.order(filter.orderBy, { ascending });
    }

    return query;
  }

  // Protected helper for validation
  protected validateEntityForSave(entity: TEntity): Result<void> {
    if (!entity) {
      return Result.fail('Entity cannot be null or undefined');
    }

    // Basic validation - can be overridden by subclasses
    const entityObj = entity as any;
    if (!entityObj.id) {
      return Result.fail('Entity must have an id');
    }

    return Result.ok(undefined);
  }
}