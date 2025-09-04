import { Result } from '../../../lib/domain/shared/result';
import { AuditLogEventHandler } from '../../../lib/infrastructure/events/audit-log-event-handler';
import { MockAuditLogRepository } from './mock-audit-log-repository';

/**
 * Domain Event Interface (simplified version for WorkflowOrchestrationService)
 */
export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  eventData: Record<string, any>;
  userId?: string;
  timestamp: Date;
}

/**
 * Mock Event Bus that integrates with Audit Trail system
 * This version matches the simplified interface expected by WorkflowOrchestrationService
 */
export class MockEventBusWithAudit {
  private auditLogRepository: MockAuditLogRepository;
  private auditHandler: AuditLogEventHandler;
  private subscribers = new Map<string, Function[]>();

  constructor() {
    this.auditLogRepository = new MockAuditLogRepository();
    this.auditHandler = new AuditLogEventHandler(this.auditLogRepository);
    
    // Subscribe to all the events that should generate audit logs
    this.auditHandler.subscribeToEvents(this);
  }

  async publish(event: DomainEvent): Promise<void> {
    const fullEvent = { ...event, timestamp: event.timestamp || new Date() };

    // Notify subscribers (this will call the audit handler)
    const handlers = this.subscribers.get(event.eventType) || [];
    for (const handler of handlers) {
      try {
        await handler(fullEvent);
      } catch (error) {
        console.warn(`Event handler error: ${error}`);
      }
    }
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }

  /**
   * Get audit logs from the repository for testing
   */
  getAuditLogsFromEvents(): any[] {
    return this.auditLogRepository.getAllAuditLogs();
  }

  /**
   * Get audit trail service for validation
   */
  getAuditTrailService(): MockAuditTrailService {
    return new MockAuditTrailService(this.auditLogRepository);
  }

  clear(): void {
    this.subscribers.clear();
    this.auditLogRepository.clear();
  }
}

/**
 * Mock Audit Trail Service for testing
 */
export class MockAuditTrailService {
  constructor(private auditRepository: MockAuditLogRepository) {}

  async validateMinimumAuditTrail(executionId: string): Promise<Result<boolean>> {
    const auditLogs = this.auditRepository.getAllAuditLogs();
    const executionLogs = auditLogs.filter(log => 
      log.details && log.details.executionId === executionId
    );

    const hasMinimumLogs = executionLogs.length >= 6;
    
    if (!hasMinimumLogs) {
      return Result.fail(`Insufficient audit logs: ${executionLogs.length} found, minimum 6 required`);
    }

    // Check for required event types in audit logs
    const auditLogActions = new Set(executionLogs.map(log => log.action));
    const hasWorkflowStart = auditLogActions.has('workflow_execution_started');
    const hasWorkflowEnd = auditLogActions.has('workflow_execution_completed') || auditLogActions.has('workflow_execution_failed');
    
    if (!hasWorkflowStart || !hasWorkflowEnd) {
      return Result.fail('Missing required workflow start/end audit logs');
    }

    return Result.ok(true);
  }
}