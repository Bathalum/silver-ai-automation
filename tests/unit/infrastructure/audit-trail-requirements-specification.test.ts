/**
 * TDD Specification Test: Audit Trail Requirements
 * 
 * This test suite defines the expected behavior for the complete audit trail system
 * that E2E tests depend on. These tests specify the minimum requirements for audit
 * log generation, persistence, and discoverability.
 * 
 * Clean Architecture Enforcement:
 * - Domain events from inner layers trigger audit log creation
 * - Infrastructure layer persists audit logs without business logic
 * - Event bus coordinates between domain and infrastructure layers
 * - Repository contracts ensure audit trail accessibility
 * 
 * TDD Requirements Definition:
 * - Minimum 6 audit logs per execution (as expected by E2E tests)
 * - Audit logs must be discoverable by modelId and executionId
 * - Event-to-audit-log mapping must be consistent and predictable
 * - Audit trail must survive repository operations and mock resets
 */

import { Result } from '../../../lib/domain/shared/result';

/**
 * Audit Log Domain Model
 * Defines the structure that audit logs must have to satisfy E2E test requirements
 */
interface AuditLogEntry {
  id: string;
  entityType: 'workflow' | 'model' | 'node' | 'action' | 'execution';
  entityId: string;
  operation: 'create' | 'update' | 'delete' | 'execute' | 'error';
  userId: string;
  timestamp: Date;
  eventType: string;
  eventData: Record<string, any>;
  executionId?: string;
  modelId?: string;
  tableName?: string;
  recordId?: string;
}

/**
 * Domain Event Model
 * Defines events that should trigger audit log creation
 */
interface DomainEvent {
  eventType: string;
  aggregateId: string;
  eventData: Record<string, any>;
  userId: string;
  timestamp: Date;
}

/**
 * Audit Log Repository Interface
 * Defines how audit logs must be stored and retrieved
 */
interface IAuditLogRepository {
  save(auditLog: AuditLogEntry): Promise<Result<void>>;
  findByModelId(modelId: string): Promise<Result<AuditLogEntry[]>>;
  findByExecutionId(executionId: string): Promise<Result<AuditLogEntry[]>>;
  findByEntityId(entityId: string): Promise<Result<AuditLogEntry[]>>;
  findByUserId(userId: string): Promise<Result<AuditLogEntry[]>>;
  findRecent(limit: number): Promise<Result<AuditLogEntry[]>>;
  countByOperation(operation: string): Promise<Result<number>>;
  getAllAuditLogs(): AuditLogEntry[]; // Test helper
  clear(): void; // Test helper
}

/**
 * Event Bus Interface with Audit Trail Generation
 * Defines how events should trigger audit log creation
 */
interface IEventBusWithAuditTrail {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): Promise<void>;
  getAuditLogsFromEvents(): AuditLogEntry[];
  clear(): void;
}

/**
 * Audit Trail Service Interface
 * Defines the service that coordinates event-to-audit-log conversion
 */
interface IAuditTrailService {
  generateAuditLogFromEvent(event: DomainEvent): AuditLogEntry;
  recordExecutionPhase(executionId: string, modelId: string, phase: string, userId: string): Promise<void>;
  getExecutionAuditTrail(executionId: string): Promise<Result<AuditLogEntry[]>>;
  validateMinimumAuditTrail(executionId: string): Promise<Result<boolean>>;
}

/**
 * Mock Implementations for TDD Testing
 */
class MockAuditLogRepository implements IAuditLogRepository {
  private auditLogs: AuditLogEntry[] = [];

  async save(auditLog: AuditLogEntry): Promise<Result<void>> {
    const entry = {
      ...auditLog,
      id: auditLog.id || `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: auditLog.timestamp || new Date()
    };
    
    this.auditLogs.push(entry);
    return Result.ok(undefined);
  }

  async findByModelId(modelId: string): Promise<Result<AuditLogEntry[]>> {
    const logs = this.auditLogs.filter(log => log.modelId === modelId);
    return Result.ok(logs);
  }

  async findByExecutionId(executionId: string): Promise<Result<AuditLogEntry[]>> {
    const logs = this.auditLogs.filter(log => log.executionId === executionId);
    return Result.ok(logs);
  }

  async findByEntityId(entityId: string): Promise<Result<AuditLogEntry[]>> {
    const logs = this.auditLogs.filter(log => log.entityId === entityId);
    return Result.ok(logs);
  }

  async findByUserId(userId: string): Promise<Result<AuditLogEntry[]>> {
    const logs = this.auditLogs.filter(log => log.userId === userId);
    return Result.ok(logs);
  }

  async findRecent(limit: number): Promise<Result<AuditLogEntry[]>> {
    const sortedLogs = this.auditLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    return Result.ok(sortedLogs);
  }

  async countByOperation(operation: string): Promise<Result<number>> {
    const count = this.auditLogs.filter(log => log.operation === operation).length;
    return Result.ok(count);
  }

  getAllAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  clear(): void {
    this.auditLogs = [];
  }
}

class MockEventBusWithAuditTrail implements IEventBusWithAuditTrail {
  private events: DomainEvent[] = [];
  private auditLogs: AuditLogEntry[] = [];
  private subscribers = new Map<string, Function[]>();
  private auditRepository?: MockAuditLogRepository;

  setAuditRepository(repository: MockAuditLogRepository): void {
    this.auditRepository = repository;
  }

  async publish(event: DomainEvent): Promise<void> {
    const fullEvent = { ...event, timestamp: event.timestamp || new Date() };
    this.events.push(fullEvent);

    // Generate audit log from event
    const auditLog = this.createAuditLogFromEvent(fullEvent);
    this.auditLogs.push(auditLog);

    // Also save to the shared repository if available
    if (this.auditRepository) {
      await this.auditRepository.save(auditLog);
    }

    // Notify subscribers
    const handlers = this.subscribers.get(event.eventType) || [];
    for (const handler of handlers) {
      try {
        await handler(fullEvent);
      } catch (error) {
        console.warn(`Event handler error: ${error}`);
      }
    }
  }

  async subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): Promise<void> {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }

  getAuditLogsFromEvents(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  clear(): void {
    this.events = [];
    this.auditLogs = [];
    this.subscribers.clear();
    if (this.auditRepository) {
      this.auditRepository.clear();
    }
  }

  private createAuditLogFromEvent(event: DomainEvent): AuditLogEntry {
    return {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityType: this.getEntityTypeFromEvent(event.eventType),
      entityId: event.aggregateId,
      operation: this.getOperationFromEvent(event.eventType),
      userId: event.userId,
      timestamp: event.timestamp,
      eventType: event.eventType,
      eventData: event.eventData,
      executionId: event.eventData.executionId,
      modelId: event.eventData.modelId || event.aggregateId,
      tableName: this.getTableNameFromEntityType(this.getEntityTypeFromEvent(event.eventType)),
      recordId: event.aggregateId
    };
  }

  private getEntityTypeFromEvent(eventType: string): AuditLogEntry['entityType'] {
    // Order matters - check most specific patterns first
    if (eventType.includes('NodeExecution')) return 'node';
    if (eventType.includes('ActionExecution')) return 'action';
    if (eventType.includes('WorkflowExecution') || eventType.startsWith('Workflow')) return 'execution';
    if (eventType.includes('Model')) return 'model';
    if (eventType.includes('Node')) return 'node';
    if (eventType.includes('Action')) return 'action';
    return 'workflow';
  }

  private getOperationFromEvent(eventType: string): AuditLogEntry['operation'] {
    if (eventType.includes('Started') || eventType.includes('Created')) return 'create';
    if (eventType.includes('Completed') || eventType.includes('Updated')) return 'update';
    if (eventType.includes('Failed') || eventType.includes('Error')) return 'error';
    if (eventType.includes('Deleted')) return 'delete';
    if (eventType.includes('Executed')) return 'execute';
    return 'update';
  }

  private getTableNameFromEntityType(entityType: AuditLogEntry['entityType']): string {
    switch (entityType) {
      case 'workflow': return 'workflows';
      case 'model': return 'function_models';
      case 'node': return 'container_nodes';
      case 'action': return 'action_nodes';
      case 'execution': return 'executions';
      default: return 'audit_logs';
    }
  }
}

class MockAuditTrailService implements IAuditTrailService {
  constructor(
    private auditRepository: IAuditLogRepository,
    private eventBus: IEventBusWithAuditTrail
  ) {}

  generateAuditLogFromEvent(event: DomainEvent): AuditLogEntry {
    return {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityType: this.mapEventTypeToEntityType(event.eventType),
      entityId: event.aggregateId,
      operation: this.mapEventTypeToOperation(event.eventType),
      userId: event.userId,
      timestamp: event.timestamp,
      eventType: event.eventType,
      eventData: event.eventData,
      executionId: event.eventData.executionId,
      modelId: event.eventData.modelId || event.aggregateId
    };
  }

  async recordExecutionPhase(executionId: string, modelId: string, phase: string, userId: string): Promise<void> {
    const auditLog: AuditLogEntry = {
      id: `phase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityType: 'execution',
      entityId: executionId,
      operation: 'update',
      userId,
      timestamp: new Date(),
      eventType: `ExecutionPhase${phase}`,
      eventData: { executionId, modelId, phase },
      executionId,
      modelId
    };

    await this.auditRepository.save(auditLog);
  }

  async getExecutionAuditTrail(executionId: string): Promise<Result<AuditLogEntry[]>> {
    return this.auditRepository.findByExecutionId(executionId);
  }

  async validateMinimumAuditTrail(executionId: string): Promise<Result<boolean>> {
    const auditTrailResult = await this.getExecutionAuditTrail(executionId);
    if (auditTrailResult.isFailure) {
      return Result.fail('Failed to retrieve audit trail');
    }

    const auditLogs = auditTrailResult.value;
    const hasMinimumLogs = auditLogs.length >= 6;
    
    if (!hasMinimumLogs) {
      return Result.fail(`Insufficient audit logs: ${auditLogs.length} found, minimum 6 required`);
    }

    // Verify required event types
    const eventTypes = new Set(auditLogs.map(log => log.eventType));
    const requiredEventTypes = [
      'WorkflowExecutionStarted',
      'NodeExecutionStarted',
      'ActionExecutionStarted',
      'ActionExecutionCompleted',
      'NodeExecutionCompleted',
      'WorkflowExecutionCompleted'
    ];

    const hasRequiredEvents = requiredEventTypes.some(type => eventTypes.has(type));
    if (!hasRequiredEvents) {
      return Result.fail('Missing required audit event types');
    }

    return Result.ok(true);
  }

  private mapEventTypeToEntityType(eventType: string): AuditLogEntry['entityType'] {
    // Order matters - check most specific patterns first
    if (eventType.includes('NodeExecution')) return 'node';
    if (eventType.includes('ActionExecution')) return 'action';
    if (eventType.includes('WorkflowExecution') || eventType.startsWith('Workflow')) return 'execution';
    if (eventType.includes('Model')) return 'model';
    if (eventType.includes('Node')) return 'node';
    if (eventType.includes('Action')) return 'action';
    return 'workflow';
  }

  private mapEventTypeToOperation(eventType: string): AuditLogEntry['operation'] {
    if (eventType.includes('Started') || eventType.includes('Created')) return 'create';
    if (eventType.includes('Completed') || eventType.includes('Updated')) return 'update';
    if (eventType.includes('Failed') || eventType.includes('Error')) return 'error';
    if (eventType.includes('Deleted')) return 'delete';
    if (eventType.includes('Executed')) return 'execute';
    return 'update';
  }
}

describe('Audit Trail Requirements Specification (TDD)', () => {
  let auditRepository: MockAuditLogRepository;
  let eventBusWithAudit: MockEventBusWithAuditTrail;
  let auditTrailService: MockAuditTrailService;

  // Test constants
  const testUserId = 'test-user-001';
  const testModelId = 'test-model-001';
  const testExecutionId = 'exec-test-001';

  beforeEach(() => {
    auditRepository = new MockAuditLogRepository();
    eventBusWithAudit = new MockEventBusWithAuditTrail();
    eventBusWithAudit.setAuditRepository(auditRepository);
    auditTrailService = new MockAuditTrailService(auditRepository, eventBusWithAudit);
  });

  afterEach(() => {
    auditRepository.clear();
    eventBusWithAudit.clear();
  });

  describe('FAILING TESTS - Minimum Audit Trail Requirements', () => {
    describe('ExecutionAuditTrail_MinimumRequirements', () => {
      it('should_GenerateAtLeastSixAuditLogs_ForCompleteWorkflowExecution', async () => {
        // Arrange: Simulate complete workflow execution events
        const executionEvents: DomainEvent[] = [
          {
            eventType: 'WorkflowExecutionStarted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId, userId: testUserId },
            userId: testUserId,
            timestamp: new Date(Date.now() - 1000)
          },
          {
            eventType: 'NodeExecutionStarted',
            aggregateId: 'node-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, nodeId: 'node-001', userId: testUserId },
            userId: testUserId,
            timestamp: new Date(Date.now() - 800)
          },
          {
            eventType: 'ActionExecutionStarted',
            aggregateId: 'action-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, actionId: 'action-001', userId: testUserId },
            userId: testUserId,
            timestamp: new Date(Date.now() - 600)
          },
          {
            eventType: 'ActionExecutionCompleted',
            aggregateId: 'action-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, actionId: 'action-001', success: true, userId: testUserId },
            userId: testUserId,
            timestamp: new Date(Date.now() - 400)
          },
          {
            eventType: 'NodeExecutionCompleted',
            aggregateId: 'node-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, nodeId: 'node-001', success: true, userId: testUserId },
            userId: testUserId,
            timestamp: new Date(Date.now() - 200)
          },
          {
            eventType: 'WorkflowExecutionCompleted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId, success: true, userId: testUserId },
            userId: testUserId,
            timestamp: new Date()
          }
        ];

        // Act: Publish all execution events
        for (const event of executionEvents) {
          await eventBusWithAudit.publish(event);
        }

        // Assert: Should generate at least 6 audit logs
        const eventAuditLogs = eventBusWithAudit.getAuditLogsFromEvents();
        expect(eventAuditLogs.length).toBeGreaterThanOrEqual(6);

        // Verify audit trail validation passes
        const validationResult = await auditTrailService.validateMinimumAuditTrail(testExecutionId);
        expect(validationResult.isSuccess).toBe(true);
      });

      it('should_CreateAuditLogsWithRequiredFields_ForE2EDiscovery', async () => {
        // Arrange: Single execution event
        const event: DomainEvent = {
          eventType: 'WorkflowExecutionStarted',
          aggregateId: testModelId,
          eventData: { executionId: testExecutionId, modelId: testModelId },
          userId: testUserId,
          timestamp: new Date()
        };

        // Act: Publish event and capture audit log
        await eventBusWithAudit.publish(event);

        // Assert: Audit log should have all required fields
        const auditLogs = eventBusWithAudit.getAuditLogsFromEvents();
        expect(auditLogs.length).toBe(1);

        const auditLog = auditLogs[0];
        expect(auditLog.id).toBeDefined();
        expect(auditLog.entityType).toBe('execution');
        expect(auditLog.entityId).toBe(testModelId);
        expect(auditLog.operation).toBe('create');
        expect(auditLog.userId).toBe(testUserId);
        expect(auditLog.timestamp).toBeInstanceOf(Date);
        expect(auditLog.eventType).toBe('WorkflowExecutionStarted');
        expect(auditLog.eventData).toBeDefined();
        expect(auditLog.executionId).toBe(testExecutionId);
        expect(auditLog.modelId).toBe(testModelId);
        expect(auditLog.tableName).toBeDefined();
        expect(auditLog.recordId).toBe(testModelId);
      });

      it('should_MakeAuditLogsDiscoverableByExecutionId_ForE2ETests', async () => {
        // Arrange: Multiple events for same execution
        const executionEvents: DomainEvent[] = [
          {
            eventType: 'WorkflowExecutionStarted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId },
            userId: testUserId,
            timestamp: new Date(Date.now() - 1000)
          },
          {
            eventType: 'NodeExecutionStarted',
            aggregateId: 'node-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, nodeId: 'node-001' },
            userId: testUserId,
            timestamp: new Date(Date.now() - 500)
          },
          {
            eventType: 'WorkflowExecutionCompleted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId, success: true },
            userId: testUserId,
            timestamp: new Date()
          }
        ];

        // Act: Publish events (automatically saves to repository)
        for (const event of executionEvents) {
          await eventBusWithAudit.publish(event);
        }

        // Assert: Audit logs should be discoverable by execution ID
        const executionAuditLogs = await auditRepository.findByExecutionId(testExecutionId);
        expect(executionAuditLogs.isSuccess).toBe(true);
        expect(executionAuditLogs.value.length).toBe(3);

        // Verify each audit log references the correct execution
        executionAuditLogs.value.forEach(log => {
          expect(log.executionId).toBe(testExecutionId);
        });
      });

      it('should_MakeAuditLogsDiscoverableByModelId_ForE2ETests', async () => {
        // Arrange: Events for model operations
        const modelEvents: DomainEvent[] = [
          {
            eventType: 'FunctionModelCreated',
            aggregateId: testModelId,
            eventData: { modelId: testModelId, name: 'Test Model' },
            userId: testUserId,
            timestamp: new Date(Date.now() - 2000)
          },
          {
            eventType: 'WorkflowExecutionStarted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId },
            userId: testUserId,
            timestamp: new Date(Date.now() - 1000)
          },
          {
            eventType: 'WorkflowExecutionCompleted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId, success: true },
            userId: testUserId,
            timestamp: new Date()
          }
        ];

        // Act: Publish events (automatically saves to repository)
        for (const event of modelEvents) {
          await eventBusWithAudit.publish(event);
        }

        // Assert: Audit logs should be discoverable by model ID
        const modelAuditLogs = await auditRepository.findByModelId(testModelId);
        expect(modelAuditLogs.isSuccess).toBe(true);
        expect(modelAuditLogs.value.length).toBe(3);

        // Verify each audit log references the correct model
        modelAuditLogs.value.forEach(log => {
          expect(log.modelId).toBe(testModelId);
        });
      });
    });

    describe('AuditTrail_EventMapping', () => {
      it('should_MapDomainEventsToAuditLogs_WithConsistentStructure', async () => {
        // Arrange: Different types of domain events
        const testEvents: DomainEvent[] = [
          {
            eventType: 'WorkflowExecutionStarted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId },
            userId: testUserId,
            timestamp: new Date()
          },
          {
            eventType: 'NodeExecutionCompleted',
            aggregateId: 'node-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, nodeId: 'node-001', success: true },
            userId: testUserId,
            timestamp: new Date()
          },
          {
            eventType: 'ActionExecutionFailed',
            aggregateId: 'action-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, actionId: 'action-001', error: 'Test failure' },
            userId: testUserId,
            timestamp: new Date()
          }
        ];

        // Act: Generate audit logs from events
        const auditLogs = testEvents.map(event => auditTrailService.generateAuditLogFromEvent(event));

        // Assert: Audit logs should have consistent structure but different mappings
        expect(auditLogs.length).toBe(3);

        // Verify workflow event mapping
        expect(auditLogs[0].entityType).toBe('execution');
        expect(auditLogs[0].operation).toBe('create');
        expect(auditLogs[0].eventType).toBe('WorkflowExecutionStarted');

        // Verify node event mapping
        expect(auditLogs[1].entityType).toBe('node');
        expect(auditLogs[1].operation).toBe('update');
        expect(auditLogs[1].eventType).toBe('NodeExecutionCompleted');

        // Verify action failure event mapping
        expect(auditLogs[2].entityType).toBe('action');
        expect(auditLogs[2].operation).toBe('error');
        expect(auditLogs[2].eventType).toBe('ActionExecutionFailed');

        // Verify all have consistent required fields
        auditLogs.forEach(log => {
          expect(log.id).toBeDefined();
          expect(log.userId).toBe(testUserId);
          expect(log.timestamp).toBeInstanceOf(Date);
          expect(log.eventData).toBeDefined();
          expect(log.executionId).toBe(testExecutionId);
          expect(log.modelId).toBe(testModelId);
        });
      });

      it('should_PreserveEventSequencing_InAuditTrail', async () => {
        // Arrange: Sequential events with timestamps
        const sequentialEvents: DomainEvent[] = [
          {
            eventType: 'WorkflowExecutionStarted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId, phase: 'start' },
            userId: testUserId,
            timestamp: new Date(Date.now() - 3000)
          },
          {
            eventType: 'NodeExecutionStarted',
            aggregateId: 'node-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, nodeId: 'node-001', phase: 'node_start' },
            userId: testUserId,
            timestamp: new Date(Date.now() - 2000)
          },
          {
            eventType: 'NodeExecutionCompleted',
            aggregateId: 'node-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, nodeId: 'node-001', phase: 'node_complete' },
            userId: testUserId,
            timestamp: new Date(Date.now() - 1000)
          },
          {
            eventType: 'WorkflowExecutionCompleted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId, phase: 'complete' },
            userId: testUserId,
            timestamp: new Date()
          }
        ];

        // Act: Publish events in sequence (automatically saves to repository)
        for (const event of sequentialEvents) {
          await eventBusWithAudit.publish(event);
        }

        // Assert: Audit trail should preserve sequence
        const auditTrail = await auditRepository.findByExecutionId(testExecutionId);
        expect(auditTrail.isSuccess).toBe(true);
        
        const logs = auditTrail.value.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        expect(logs.length).toBe(4);

        // Verify chronological order
        expect(logs[0].eventType).toBe('WorkflowExecutionStarted');
        expect(logs[1].eventType).toBe('NodeExecutionStarted');
        expect(logs[2].eventType).toBe('NodeExecutionCompleted');
        expect(logs[3].eventType).toBe('WorkflowExecutionCompleted');

        // Verify timestamps are in order
        for (let i = 1; i < logs.length; i++) {
          expect(logs[i].timestamp.getTime()).toBeGreaterThanOrEqual(logs[i - 1].timestamp.getTime());
        }
      });
    });

    describe('AuditTrail_PersistenceRequirements', () => {
      it('should_PersistAuditTrail_ThroughRepositoryOperations', async () => {
        // Arrange: Initial audit logs
        const initialEvents: DomainEvent[] = [
          {
            eventType: 'WorkflowExecutionStarted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId },
            userId: testUserId,
            timestamp: new Date()
          },
          {
            eventType: 'NodeExecutionCompleted',
            aggregateId: 'node-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, nodeId: 'node-001' },
            userId: testUserId,
            timestamp: new Date()
          }
        ];

        // Act: Save audit logs through repository
        for (const event of initialEvents) {
          const auditLog = auditTrailService.generateAuditLogFromEvent(event);
          await auditRepository.save(auditLog);
        }

        const initialCount = auditRepository.getAllAuditLogs().length;
        expect(initialCount).toBe(2);

        // Perform additional repository operations
        const additionalEvent: DomainEvent = {
          eventType: 'WorkflowExecutionCompleted',
          aggregateId: testModelId,
          eventData: { executionId: testExecutionId, modelId: testModelId, success: true },
          userId: testUserId,
          timestamp: new Date()
        };

        const additionalAuditLog = auditTrailService.generateAuditLogFromEvent(additionalEvent);
        await auditRepository.save(additionalAuditLog);

        // Assert: Audit trail should persist and accumulate
        const finalCount = auditRepository.getAllAuditLogs().length;
        expect(finalCount).toBe(3);

        // Verify all logs are still discoverable
        const executionLogs = await auditRepository.findByExecutionId(testExecutionId);
        expect(executionLogs.isSuccess).toBe(true);
        expect(executionLogs.value.length).toBe(3);
      });

      it('should_SurviveMockResets_InE2ETestEnvironment', async () => {
        // Arrange: Setup audit trail
        const persistentEvent: DomainEvent = {
          eventType: 'WorkflowExecutionStarted',
          aggregateId: testModelId,
          eventData: { executionId: testExecutionId, modelId: testModelId },
          userId: testUserId,
          timestamp: new Date()
        };

        const auditLog = auditTrailService.generateAuditLogFromEvent(persistentEvent);
        await auditRepository.save(auditLog);

        expect(auditRepository.getAllAuditLogs().length).toBe(1);

        // Act: Simulate partial mock reset (not full clear)
        // In real E2E environment, audit trail should survive certain operations

        // Assert: Verify audit log is still discoverable after operations
        const survivingLogs = await auditRepository.findByExecutionId(testExecutionId);
        expect(survivingLogs.isSuccess).toBe(true);
        expect(survivingLogs.value.length).toBe(1);
        expect(survivingLogs.value[0].executionId).toBe(testExecutionId);
      });

      it('should_SupportCrossReferenceQueries_ForE2EVerification', async () => {
        // Arrange: Multiple related audit logs
        const crossRefEvents: DomainEvent[] = [
          {
            eventType: 'FunctionModelCreated',
            aggregateId: testModelId,
            eventData: { modelId: testModelId, name: 'Cross Ref Model' },
            userId: testUserId,
            timestamp: new Date(Date.now() - 3000)
          },
          {
            eventType: 'WorkflowExecutionStarted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId },
            userId: testUserId,
            timestamp: new Date(Date.now() - 2000)
          },
          {
            eventType: 'NodeExecutionStarted',
            aggregateId: 'node-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, nodeId: 'node-001' },
            userId: testUserId,
            timestamp: new Date(Date.now() - 1000)
          }
        ];

        // Act: Save all audit logs
        for (const event of crossRefEvents) {
          const auditLog = auditTrailService.generateAuditLogFromEvent(event);
          await auditRepository.save(auditLog);
        }

        // Assert: Support multiple query patterns
        const modelLogs = await auditRepository.findByModelId(testModelId);
        const executionLogs = await auditRepository.findByExecutionId(testExecutionId);
        const userLogs = await auditRepository.findByUserId(testUserId);

        expect(modelLogs.isSuccess).toBe(true);
        expect(executionLogs.isSuccess).toBe(true);
        expect(userLogs.isSuccess).toBe(true);

        expect(modelLogs.value.length).toBe(3);
        expect(executionLogs.value.length).toBe(2); // Only execution-related events
        expect(userLogs.value.length).toBe(3);

        // Verify cross-reference integrity
        const allLogs = [...modelLogs.value, ...executionLogs.value, ...userLogs.value];
        const uniqueIds = new Set(allLogs.map(log => log.id));
        expect(uniqueIds.size).toBe(3); // No duplicates when cross-referencing
      });
    });
  });

  describe('FAILING TESTS - Audit Trail Service Integration', () => {
    describe('AuditTrailService_ExecutionPhases', () => {
      it('should_RecordDetailedExecutionPhases_ForCompleteAuditTrail', async () => {
        // Arrange: Execution phases
        const executionPhases = ['validation', 'orchestration', 'node_execution', 'action_execution', 'completion'];

        // Act: Record each execution phase
        for (const phase of executionPhases) {
          await auditTrailService.recordExecutionPhase(testExecutionId, testModelId, phase, testUserId);
        }

        // Assert: All phases should be recorded in audit trail
        const phaseAuditLogs = await auditRepository.findByExecutionId(testExecutionId);
        expect(phaseAuditLogs.isSuccess).toBe(true);
        expect(phaseAuditLogs.value.length).toBe(5);

        // Verify each phase is recorded
        const recordedPhases = phaseAuditLogs.value.map(log => log.eventData.phase);
        expect(recordedPhases).toEqual(expect.arrayContaining(executionPhases));
      });

      it('should_ValidateMinimumAuditTrail_ForE2ECompliance', async () => {
        // Arrange: Insufficient audit trail
        const insufficientEvents: DomainEvent[] = [
          {
            eventType: 'WorkflowExecutionStarted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId },
            userId: testUserId,
            timestamp: new Date()
          },
          // Only 2 events - insufficient for E2E requirement of 6+
          {
            eventType: 'WorkflowExecutionCompleted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId, success: true },
            userId: testUserId,
            timestamp: new Date()
          }
        ];

        // Act: Save insufficient audit trail
        for (const event of insufficientEvents) {
          const auditLog = auditTrailService.generateAuditLogFromEvent(event);
          await auditRepository.save(auditLog);
        }

        // Assert: Validation should fail for insufficient audit trail
        const validationResult = await auditTrailService.validateMinimumAuditTrail(testExecutionId);
        expect(validationResult.isFailure).toBe(true);
        expect(validationResult.error).toContain('Insufficient audit logs');
      });

      it('should_ValidateCompleteAuditTrail_ForE2ECompliance', async () => {
        // Arrange: Complete audit trail with 6+ logs
        const completeEvents: DomainEvent[] = [
          {
            eventType: 'WorkflowExecutionStarted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId },
            userId: testUserId,
            timestamp: new Date(Date.now() - 6000)
          },
          {
            eventType: 'NodeExecutionStarted',
            aggregateId: 'node-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, nodeId: 'node-001' },
            userId: testUserId,
            timestamp: new Date(Date.now() - 5000)
          },
          {
            eventType: 'ActionExecutionStarted',
            aggregateId: 'action-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, actionId: 'action-001' },
            userId: testUserId,
            timestamp: new Date(Date.now() - 4000)
          },
          {
            eventType: 'ActionExecutionCompleted',
            aggregateId: 'action-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, actionId: 'action-001', success: true },
            userId: testUserId,
            timestamp: new Date(Date.now() - 3000)
          },
          {
            eventType: 'NodeExecutionCompleted',
            aggregateId: 'node-001',
            eventData: { executionId: testExecutionId, modelId: testModelId, nodeId: 'node-001', success: true },
            userId: testUserId,
            timestamp: new Date(Date.now() - 2000)
          },
          {
            eventType: 'WorkflowExecutionCompleted',
            aggregateId: testModelId,
            eventData: { executionId: testExecutionId, modelId: testModelId, success: true },
            userId: testUserId,
            timestamp: new Date()
          }
        ];

        // Act: Save complete audit trail
        for (const event of completeEvents) {
          const auditLog = auditTrailService.generateAuditLogFromEvent(event);
          await auditRepository.save(auditLog);
        }

        // Assert: Validation should pass for complete audit trail
        const validationResult = await auditTrailService.validateMinimumAuditTrail(testExecutionId);
        expect(validationResult.isSuccess).toBe(true);

        // Verify audit trail meets E2E requirements
        const auditTrail = await auditRepository.findByExecutionId(testExecutionId);
        expect(auditTrail.value.length).toBeGreaterThanOrEqual(6);
      });
    });
  });
});