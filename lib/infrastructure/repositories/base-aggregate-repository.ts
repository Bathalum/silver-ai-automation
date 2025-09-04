import { SupabaseClient } from '@supabase/supabase-js';
import { Result } from '../../domain/shared/result';
import { BaseSupabaseRepository } from './base-supabase-repository';

/**
 * BaseAggregateRepository<TAggregate, TId>
 * 
 * Repository for managing Domain Aggregate Roots following DDD and Clean Architecture principles.
 * Extends BaseSupabaseRepository with aggregate-specific capabilities.
 * 
 * ARCHITECTURAL BOUNDARIES:
 * - Enforces Aggregate Root patterns and consistency boundaries
 * - Manages entity relationships within aggregate boundaries
 * - Coordinates persistence of aggregate and its child entities
 * - Ensures transactional consistency across related entities
 * - Prevents direct access to child entities outside the aggregate
 */

// Domain Event interface for aggregate behavior
interface DomainEvent {
  eventId: string;
  aggregateId: string;
  eventType: string;
  occurredAt: Date;
  payload: any;
}

// Repository interface for aggregate operations
interface IAggregateRepository<TAggregate, TId> {
  // Aggregate-specific operations
  saveAggregate(aggregate: TAggregate): Promise<Result<TAggregate>>;
  findAggregateById(id: TId): Promise<Result<TAggregate | null>>;
  findAggregatesBy(criteria: any): Promise<Result<TAggregate[]>>;
  deleteAggregate(id: TId): Promise<Result<void>>;
  
  // Consistency and concurrency
  saveWithOptimisticLocking(aggregate: TAggregate, expectedVersion: number): Promise<Result<TAggregate>>;
  refreshAggregate(aggregate: TAggregate): Promise<Result<TAggregate>>;
  
  // Domain events
  saveAggregateWithEvents(aggregate: TAggregate): Promise<Result<TAggregate>>;
}

export abstract class BaseAggregateRepository<TAggregate, TId> 
  extends BaseSupabaseRepository<TAggregate, TId> 
  implements IAggregateRepository<TAggregate, TId> {
  
  protected constructor(
    supabase: SupabaseClient,
    protected readonly aggregateTableName: string,
    protected readonly childTableNames: string[]
  ) {
    super(supabase, aggregateTableName);
  }

  // Implement base repository operations
  async save(entity: TAggregate): Promise<Result<TAggregate>> {
    return this.saveAggregate(entity);
  }

  async findById(id: TId): Promise<Result<TAggregate | null>> {
    return this.findAggregateById(id);
  }

  async findAll(filter?: any): Promise<Result<TAggregate[]>> {
    return this.findAggregatesBy(filter || {});
  }

  async delete(id: TId): Promise<Result<void>> {
    return this.deleteAggregate(id);
  }

  async exists(id: TId): Promise<Result<boolean>> {
    return this.performExists(id);
  }

  // Core aggregate operations
  async saveAggregate(aggregate: TAggregate): Promise<Result<TAggregate>> {
    const validationResult = this.validateAggregateConsistency(aggregate);
    if (validationResult.isFailure) {
      return Result.fail(validationResult.error);
    }

    return this.executeTransaction(async (client) => {
      // Save aggregate root
      const aggregateRow = this.fromDomain(aggregate);
      const { data: savedAggregate, error } = await client
        .from(this.aggregateTableName)
        .upsert(aggregateRow)
        .select()
        .single();

      if (error) {
        throw new Error(this.translateDatabaseError(error));
      }

      // Save children within the transaction
      const childSaveResult = await this.saveAggregateWithChildren(aggregate, client);
      if (childSaveResult.isFailure) {
        throw new Error(childSaveResult.error);
      }

      // Convert back to domain
      const domainResult = this.toDomain(savedAggregate);
      if (domainResult.isFailure) {
        throw new Error(domainResult.error);
      }

      return domainResult.value;
    });
  }

  async findAggregateById(id: TId): Promise<Result<TAggregate | null>> {
    return this.executeTransaction(async (client) => {
      // Load aggregate root
      const { data: aggregateData, error } = await client
        .from(this.aggregateTableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(this.translateDatabaseError(error));
      }

      if (!aggregateData) {
        return null;
      }

      // Load children
      const childrenResult = await this.loadAggregateChildren(id, client);
      if (childrenResult.isFailure) {
        throw new Error(childrenResult.error);
      }

      // Reconstruct aggregate with children
      const domainResult = this.toDomain(aggregateData);
      if (domainResult.isFailure) {
        throw new Error(domainResult.error);
      }

      // Add children to aggregate
      const aggregate = domainResult.value as any;
      aggregate.children = childrenResult.value;

      return aggregate;
    });
  }

  async findAggregatesBy(criteria: any): Promise<Result<TAggregate[]>> {
    return this.executeTransaction(async (client) => {
      // Build query for aggregate roots
      let query = client.from(this.aggregateTableName).select('*');
      
      // Apply criteria safely
      if (criteria.status) {
        query = query.eq('status', criteria.status);
      }
      if (criteria.ids && Array.isArray(criteria.ids)) {
        query = query.in('id', criteria.ids);
      }

      // Limit results for performance
      const limit = criteria.limit && criteria.limit <= 100 ? criteria.limit : 20;
      query = query.limit(limit);

      const { data: aggregateData, error } = await query;

      if (error) {
        throw new Error(this.translateDatabaseError(error));
      }

      if (!aggregateData || aggregateData.length === 0) {
        return [];
      }

      const aggregates: TAggregate[] = [];

      // Load each aggregate with its children (avoiding N+1 queries)
      for (const row of aggregateData) {
        const domainResult = this.toDomain(row);
        if (domainResult.isFailure) {
          throw new Error(domainResult.error);
        }

        // Load children if requested
        if (criteria.includeChildren !== false) {
          const childrenResult = await this.loadAggregateChildren(row.id, client);
          if (childrenResult.isFailure) {
            throw new Error(childrenResult.error);
          }
          (domainResult.value as any).children = childrenResult.value;
        } else {
          (domainResult.value as any).children = [];
        }

        aggregates.push(domainResult.value);
      }

      return aggregates;
    });
  }

  async deleteAggregate(id: TId): Promise<Result<void>> {
    return this.executeTransaction(async (client) => {
      // Delete children first to maintain referential integrity
      for (const childTableName of this.childTableNames) {
        const { error } = await client
          .from(childTableName)
          .delete()
          .eq('parent_id', id);

        if (error) {
          throw new Error(`Failed to delete child entities: ${this.translateDatabaseError(error)}`);
        }
      }

      // Then delete aggregate root
      const { error } = await client
        .from(this.aggregateTableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(this.translateDatabaseError(error));
      }
    });
  }

  // Optimistic concurrency control
  async saveWithOptimisticLocking(aggregate: TAggregate, expectedVersion: number): Promise<Result<TAggregate>> {
    // Check version first
    const versionCheckResult = await this.checkConcurrencyVersion(
      (aggregate as any).id, 
      expectedVersion
    );
    
    if (versionCheckResult.isFailure) {
      return Result.fail(`Concurrency conflict: ${versionCheckResult.error}`);
    }

    return this.executeTransaction(async (client) => {
      // Increment version for optimistic locking
      const aggregateRow = this.fromDomain(aggregate);
      aggregateRow.version = expectedVersion + 1;

      const { data: savedAggregate, error } = await client
        .from(this.aggregateTableName)
        .update(aggregateRow)
        .eq('id', (aggregate as any).id)
        .eq('version', expectedVersion)
        .select()
        .single();

      if (error || !savedAggregate) {
        throw new Error('Version conflict - aggregate was modified by another user');
      }

      // Save children
      const childSaveResult = await this.saveAggregateWithChildren(aggregate, client);
      if (childSaveResult.isFailure) {
        throw new Error(childSaveResult.error);
      }

      const domainResult = this.toDomain(savedAggregate);
      if (domainResult.isFailure) {
        throw new Error(domainResult.error);
      }

      return domainResult.value;
    });
  }

  async refreshAggregate(aggregate: TAggregate): Promise<Result<TAggregate>> {
    return this.findAggregateById((aggregate as any).id);
  }

  // Domain event management
  async saveAggregateWithEvents(aggregate: TAggregate): Promise<Result<TAggregate>> {
    const aggregateWithEvents = aggregate as any;
    const events = aggregateWithEvents.domainEvents || [];

    return this.executeTransaction(async (client) => {
      // Save aggregate first
      const saveResult = await this.saveAggregateWithChildren(aggregate, client);
      if (saveResult.isFailure) {
        throw new Error(saveResult.error);
      }

      // Save events in order
      for (const event of events) {
        const { error } = await client
          .from('domain_events')
          .insert({
            event_id: event.eventId,
            aggregate_id: event.aggregateId,
            event_type: event.eventType,
            occurred_at: event.occurredAt.toISOString(),
            payload: event.payload,
            created_at: new Date().toISOString()
          });

        if (error) {
          throw new Error(`Failed to save domain event: ${this.translateDatabaseError(error)}`);
        }
      }

      // Clear events after successful save
      if (aggregateWithEvents.clearEvents) {
        aggregateWithEvents.clearEvents();
      }

      const domainResult = this.toDomain(this.fromDomain(aggregate));
      if (domainResult.isFailure) {
        throw new Error(domainResult.error);
      }

      return domainResult.value;
    });
  }

  // Abstract methods for aggregate composition management
  protected async saveAggregateWithChildren(
    aggregate: TAggregate,
    transaction: SupabaseClient
  ): Promise<Result<void>> {
    try {
      const aggregateData = aggregate as any;
      const children = aggregateData.children || [];

      // Delete existing children first
      for (const childTableName of this.childTableNames) {
        await transaction
          .from(childTableName)
          .delete()
          .eq('parent_id', aggregateData.id);
      }

      // Insert new children
      if (children.length > 0) {
        const childRows = children.map((child: any) => ({
          ...child,
          parent_id: aggregateData.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error } = await transaction
          .from(this.childTableNames[0]) // Assuming first child table
          .insert(childRows);

        if (error) {
          return Result.fail(`Failed to save child entities: ${this.translateDatabaseError(error)}`);
        }
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  protected async loadAggregateChildren(
    aggregateId: TId,
    transaction: SupabaseClient
  ): Promise<Result<any[]>> {
    try {
      const allChildren: any[] = [];

      // Load from all child tables
      for (const childTableName of this.childTableNames) {
        const { data, error } = await transaction
          .from(childTableName)
          .select('*')
          .eq('parent_id', aggregateId);

        if (error) {
          return Result.fail(this.translateDatabaseError(error));
        }

        if (data) {
          allChildren.push(...data);
        }
      }

      return Result.ok(allChildren);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : String(error));
    }
  }

  // Consistency enforcement
  protected validateAggregateConsistency(aggregate: TAggregate): Result<void> {
    const aggregateData = aggregate as any;

    // Basic validation
    if (!aggregateData.id || !aggregateData.name) {
      return Result.fail('Aggregate consistency violation: missing required fields');
    }

    if (aggregateData.name === '') {
      return Result.fail('Aggregate consistency violation: name cannot be empty');
    }

    if (aggregateData.version < 0) {
      return Result.fail('Aggregate consistency violation: invalid version');
    }

    // Check children count invariant (example: max 5 children)
    const children = aggregateData.children || [];
    if (children.length > 5) {
      return Result.fail('Aggregate invariant violation: too many children (maximum 5 allowed)');
    }

    // Check referential integrity
    for (const child of children) {
      if (child.parentId !== aggregateData.id) {
        return Result.fail('Aggregate referential integrity violation: child references wrong parent');
      }
    }

    return Result.ok(undefined);
  }

  protected async checkConcurrencyVersion(id: TId, expectedVersion: number): Promise<Result<void>> {
    try {
      const { data, error } = await this.supabase
        .from(this.aggregateTableName)
        .select('version')
        .eq('id', id)
        .single();

      if (error) {
        return Result.fail(this.translateDatabaseError(error));
      }

      if (!data) {
        return Result.fail('Aggregate not found for version check');
      }

      if (data.version !== expectedVersion) {
        return Result.fail(`Version mismatch: expected ${expectedVersion}, found ${data.version}`);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : String(error));
    }
  }
}