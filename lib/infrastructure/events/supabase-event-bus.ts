import { SupabaseClient } from '@supabase/supabase-js';
import { Result } from '../../domain/shared/result';
import { IEventBus } from '../../use-cases/function-model/create-function-model-use-case';
import { DomainEvent } from './domain-event';

interface EventRow {
  event_id: string;
  event_type: string;
  aggregate_id: string;
  aggregate_type: string;
  aggregate_version: number;
  occurred_on: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  processed: boolean;
  created_at: string;
}

interface EventHandler {
  eventType: string;
  handler: (event: DomainEvent) => Promise<void>;
}

/**
 * Supabase-based event bus implementation
 * Stores events in database and provides pub/sub capabilities
 */
export class SupabaseEventBus implements IEventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private isListening = false;

  constructor(
    private readonly supabase: SupabaseClient
  ) {}

  /**
   * Publish a domain event
   */
  async publish(event: DomainEvent): Promise<Result<void>> {
    try {
      const eventRow: Omit<EventRow, 'created_at' | 'processed'> = {
        event_id: event.eventId,
        event_type: event.eventType,
        aggregate_id: event.aggregateId,
        aggregate_type: event.aggregateType,
        aggregate_version: event.aggregateVersion,
        occurred_on: event.occurredOn.toISOString(),
        data: event.data,
        metadata: event.metadata
      };

      const { error } = await this.supabase
        .from('domain_events')
        .insert({
          ...eventRow,
          processed: false
        });

      if (error) {
        return Result.fail(`Failed to publish event: ${error.message}`);
      }

      // Trigger real-time notification via Supabase channel
      await this.notifySubscribers(event);

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Failed to publish event: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Publish multiple events in a transaction
   */
  async publishMany(events: DomainEvent[]): Promise<Result<void>> {
    try {
      const eventRows = events.map(event => ({
        event_id: event.eventId,
        event_type: event.eventType,
        aggregate_id: event.aggregateId,
        aggregate_type: event.aggregateType,
        aggregate_version: event.aggregateVersion,
        occurred_on: event.occurredOn.toISOString(),
        data: event.data,
        metadata: event.metadata,
        processed: false
      }));

      const { error } = await this.supabase
        .from('domain_events')
        .insert(eventRows);

      if (error) {
        return Result.fail(`Failed to publish events: ${error.message}`);
      }

      // Notify subscribers for each event
      for (const event of events) {
        await this.notifySubscribers(event);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Failed to publish events: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Subscribe to domain events
   */
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push({
      eventType,
      handler
    });

    // Start listening if not already
    if (!this.isListening) {
      this.startListening();
    }
  }

  /**
   * Unsubscribe from domain events
   */
  unsubscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.findIndex(h => h.handler === handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
      
      if (handlers.length === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Get events for an aggregate
   */
  async getEventsForAggregate(aggregateId: string, fromVersion?: number): Promise<Result<DomainEvent[]>> {
    try {
      let query = this.supabase
        .from('domain_events')
        .select('*')
        .eq('aggregate_id', aggregateId)
        .order('aggregate_version', { ascending: true });

      if (fromVersion !== undefined) {
        query = query.gte('aggregate_version', fromVersion);
      }

      const { data, error } = await query;

      if (error) {
        return Result.fail(`Failed to get events: ${error.message}`);
      }

      const events = (data as EventRow[]).map(row => this.rowToDomainEvent(row));
      return Result.ok(events);
    } catch (error) {
      return Result.fail(
        `Failed to get events: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get unprocessed events for event processing workers
   */
  async getUnprocessedEvents(limit = 100): Promise<Result<DomainEvent[]>> {
    try {
      const { data, error } = await this.supabase
        .from('domain_events')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        return Result.fail(`Failed to get unprocessed events: ${error.message}`);
      }

      const events = (data as EventRow[]).map(row => this.rowToDomainEvent(row));
      return Result.ok(events);
    } catch (error) {
      return Result.fail(
        `Failed to get unprocessed events: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Mark events as processed
   */
  async markEventsAsProcessed(eventIds: string[]): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('domain_events')
        .update({ processed: true })
        .in('event_id', eventIds);

      if (error) {
        return Result.fail(`Failed to mark events as processed: ${error.message}`);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Failed to mark events as processed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Start listening for real-time events
   */
  private startListening(): void {
    this.isListening = true;

    // Subscribe to real-time changes on domain_events table
    this.supabase
      .channel('domain_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'domain_events'
        },
        (payload) => {
          const eventRow = payload.new as EventRow;
          const domainEvent = this.rowToDomainEvent(eventRow);
          this.handleEvent(domainEvent);
        }
      )
      .subscribe();
  }

  /**
   * Handle incoming domain event
   */
  private async handleEvent(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || [];
    
    // Execute all handlers for this event type
    const promises = handlers.map(h => 
      h.handler(event).catch(error => {
        console.error(`Event handler failed for ${event.eventType}:`, error);
      })
    );

    await Promise.all(promises);
  }

  /**
   * Notify subscribers via Supabase real-time
   */
  private async notifySubscribers(event: DomainEvent): Promise<void> {
    // Send real-time notification through Supabase channel
    await this.supabase
      .channel(`events:${event.eventType}`)
      .send({
        type: 'broadcast',
        event: event.eventType,
        payload: {
          eventId: event.eventId,
          aggregateId: event.aggregateId,
          data: event.data
        }
      });
  }

  /**
   * Convert database row to domain event
   */
  private rowToDomainEvent(row: EventRow): DomainEvent {
    return {
      eventId: row.event_id,
      eventType: row.event_type,
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      aggregateVersion: row.aggregate_version,
      occurredOn: new Date(row.occurred_on),
      data: row.data,
      metadata: row.metadata
    };
  }

  /**
   * Clean up and stop listening
   */
  async dispose(): Promise<void> {
    this.isListening = false;
    this.handlers.clear();
    
    // Remove all Supabase subscriptions
    await this.supabase.removeAllChannels();
  }
}