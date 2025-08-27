import { DomainEvent } from './domain-event';

export interface DomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}