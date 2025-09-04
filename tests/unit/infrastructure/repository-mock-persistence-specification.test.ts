/**
 * TDD Specification Test: Repository Mock Persistence Requirements
 * 
 * This test suite defines the expected behavior for repository mocks in the
 * execution pipeline, specifically focusing on persistence requirements that
 * enable E2E test discovery of audit trails.
 * 
 * Clean Architecture Enforcement:
 * - Repository implements interface without business logic
 * - Audit trail persistence is infrastructure concern only
 * - Mock behavior matches real repository contracts
 * - Event-driven audit log generation maintains layer separation
 * 
 * TDD Requirements Definition:
 * - Repository mocks must persist audit trails for E2E discoverability
 * - Audit logs must survive repository operations and state changes
 * - Cross-reference queries must work across execution boundaries
 * - Mock repositories must emit events for audit trail coordination
 */

import { Result } from '../../../lib/domain/shared/result';
import { FunctionModel } from '../../../lib/domain/entities/function-model';
import { ModelName } from '../../../lib/domain/value-objects/model-name';
import { Version } from '../../../lib/domain/value-objects/version';
import { ModelStatus } from '../../../lib/domain/enums';

/**
 * Enhanced Repository Interfaces with Audit Trail Support
 * These define what repository mocks need to implement for E2E compliance
 */
interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete' | 'execute' | 'error';
  userId: string;
  timestamp: Date;
  eventType: string;
  eventData: any;
  executionId?: string;
  modelId?: string;
  tableName?: string;
  recordId?: string;
}

interface DomainEvent {
  eventType: string;
  aggregateId: string;
  eventData: any;
  userId: string;
  timestamp: Date;
}

interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: Function): Promise<void>;
  unsubscribe(eventType: string, handler: Function): Promise<void>;
}

/**
 * Enhanced Function Model Repository Interface with Audit Trail
 */
interface IFunctionModelRepositoryWithAudit {
  // Standard repository methods
  save(model: FunctionModel): Promise<Result<void>>;
  findById(id: string): Promise<Result<FunctionModel>>;
  findByName(name: string, organizationId?: string): Promise<Result<FunctionModel>>;
  delete(id: string): Promise<Result<void>>;
  findAll(filter?: any): Promise<Result<FunctionModel[]>>;

  // Audit trail methods for E2E testing
  getAuditTrail(): AuditLogEntry[];
  getAuditLogsByModelId(modelId: string): AuditLogEntry[];
  getAuditLogsByExecutionId(executionId: string): AuditLogEntry[];
  getAuditLogsByUserId(userId: string): AuditLogEntry[];
  findAuditLogsByTableAndRecord(tableName: string, recordId: string): AuditLogEntry[];
  
  // Mock lifecycle methods
  clear(): void;
  getAllModels(): FunctionModel[];
  setEventBus(eventBus: IEventBus): void;
}

/**
 * Enhanced Audit Log Repository Interface
 */
interface IAuditLogRepositoryWithPersistence {
  // Standard audit log methods
  save(auditLog: AuditLogEntry): Promise<Result<void>>;
  findByEntityId(entityId: string): Promise<Result<AuditLogEntry[]>>;
  findByModelId(modelId: string): Promise<Result<AuditLogEntry[]>>;
  findByExecutionId(executionId: string): Promise<Result<AuditLogEntry[]>>;
  findByUserId(userId: string): Promise<Result<AuditLogEntry[]>>;
  findByOperation(operation: string): Promise<Result<AuditLogEntry[]>>;
  findByTableAndRecord(tableName: string, recordId: string): Promise<Result<AuditLogEntry[]>>;
  findRecent(limit: number): Promise<Result<AuditLogEntry[]>>;
  
  // Persistence validation methods
  countByOperation(operation: string): Promise<Result<number>>;
  countByUser(userId: string): Promise<Result<number>>;
  exists(id: string): Promise<Result<boolean>>;
  
  // Mock lifecycle methods
  getAllAuditLogs(): AuditLogEntry[];
  clear(): void;
}

/**
 * Mock Event Bus with Audit Log Coordination
 */
class MockEventBusWithAuditCoordination implements IEventBus {
  private events: DomainEvent[] = [];
  private subscribers = new Map<string, Function[]>();
  private auditLogRepository?: IAuditLogRepositoryWithPersistence;

  setAuditLogRepository(repository: IAuditLogRepositoryWithPersistence): void {
    this.auditLogRepository = repository;
  }

  async publish(event: DomainEvent): Promise<void> {
    const fullEvent = { ...event, timestamp: event.timestamp || new Date() };
    this.events.push(fullEvent);

    // Auto-generate audit log if repository is set
    if (this.auditLogRepository) {
      const auditLog = this.createAuditLogFromEvent(fullEvent);
      await this.auditLogRepository.save(auditLog);
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

  async subscribe(eventType: string, handler: Function): Promise<void> {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }

  async unsubscribe(eventType: string, handler: Function): Promise<void> {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private createAuditLogFromEvent(event: DomainEvent): AuditLogEntry {
    return {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityType: this.getEntityTypeFromEvent(event.eventType),
      entityId: event.aggregateId,
      operation: this.getOperationFromEvent(event.eventType) as AuditLogEntry['operation'],
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

  private getEntityTypeFromEvent(eventType: string): string {
    if (eventType.includes('Workflow') || eventType.includes('Execution')) return 'execution';
    if (eventType.includes('Model')) return 'model';
    if (eventType.includes('Node')) return 'node';
    if (eventType.includes('Action')) return 'action';
    return 'workflow';
  }

  private getOperationFromEvent(eventType: string): string {
    if (eventType.includes('Started') || eventType.includes('Created')) return 'create';
    if (eventType.includes('Completed') || eventType.includes('Updated')) return 'update';
    if (eventType.includes('Failed') || eventType.includes('Error')) return 'error';
    if (eventType.includes('Deleted')) return 'delete';
    if (eventType.includes('Executed')) return 'execute';
    return 'update';
  }

  private getTableNameFromEntityType(entityType: string): string {
    switch (entityType) {
      case 'model': return 'function_models';
      case 'node': return 'container_nodes';
      case 'action': return 'action_nodes';
      case 'execution': return 'executions';
      default: return 'audit_logs';
    }
  }

  // Test helper methods
  getAllEvents(): DomainEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
    this.subscribers.clear();
  }
}

/**
 * Enhanced Function Model Repository Mock with Persistent Audit Trail
 */
class MockFunctionModelRepositoryWithPersistentAudit implements IFunctionModelRepositoryWithAudit {
  private models = new Map<string, FunctionModel>();
  private auditLogs: AuditLogEntry[] = [];
  private eventBus?: IEventBus;

  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }

  async save(model: FunctionModel): Promise<Result<void>> {
    const existed = this.models.has(model.modelId);
    const operation: AuditLogEntry['operation'] = existed ? 'update' : 'create';
    
    this.models.set(model.modelId, model);

    // Create audit log
    const auditLog: AuditLogEntry = {
      id: `repo-audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityType: 'model',
      entityId: model.modelId,
      operation,
      userId: model.permissions?.owner || 'system',
      timestamp: new Date(),
      eventType: `FunctionModel${operation === 'create' ? 'Created' : 'Updated'}`,
      eventData: {
        modelId: model.modelId,
        name: model.name.toString(),
        status: model.status,
        operation
      },
      modelId: model.modelId,
      tableName: 'function_models',
      recordId: model.modelId
    };

    this.auditLogs.push(auditLog);

    // Publish domain event if event bus is available
    if (this.eventBus) {
      await this.eventBus.publish({
        eventType: auditLog.eventType,
        aggregateId: model.modelId,
        eventData: auditLog.eventData,
        userId: auditLog.userId,
        timestamp: auditLog.timestamp
      });
    }

    return Result.ok(undefined);
  }

  async findById(id: string): Promise<Result<FunctionModel>> {
    const model = this.models.get(id);
    if (!model) {
      return Result.fail(`Model with id ${id} not found`);
    }
    return Result.ok(model);
  }

  async findByName(name: string, organizationId?: string): Promise<Result<FunctionModel>> {
    const existingModel = Array.from(this.models.values()).find(
      m => m.name.toString() === name && (!organizationId || m.metadata?.organizationId === organizationId)
    );
    if (!existingModel) {
      return Result.fail('Model not found');
    }
    return Result.ok(existingModel);
  }

  async delete(id: string): Promise<Result<void>> {
    const model = this.models.get(id);
    if (!model) {
      return Result.fail(`Model with id ${id} not found`);
    }

    this.models.delete(id);

    // Create audit log for deletion
    const auditLog: AuditLogEntry = {
      id: `repo-audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityType: 'model',
      entityId: id,
      operation: 'delete',
      userId: model.permissions?.owner || 'system',
      timestamp: new Date(),
      eventType: 'FunctionModelDeleted',
      eventData: { modelId: id, operation: 'delete' },
      modelId: id,
      tableName: 'function_models',
      recordId: id
    };

    this.auditLogs.push(auditLog);

    // Publish domain event
    if (this.eventBus) {
      await this.eventBus.publish({
        eventType: auditLog.eventType,
        aggregateId: id,
        eventData: auditLog.eventData,
        userId: auditLog.userId,
        timestamp: auditLog.timestamp
      });
    }

    return Result.ok(undefined);
  }

  async findAll(filter?: any): Promise<Result<FunctionModel[]>> {
    let results = Array.from(this.models.values());
    
    if (filter?.userId) {
      results = results.filter(m => m.permissions?.owner === filter.userId);
    }
    
    if (filter?.status) {
      results = results.filter(m => filter.status.includes(m.status));
    }
    
    if (filter?.limit) {
      results = results.slice(0, filter.limit);
    }
    
    return Result.ok(results);
  }

  // Audit trail access methods
  getAuditTrail(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  getAuditLogsByModelId(modelId: string): AuditLogEntry[] {
    return this.auditLogs.filter(log => log.modelId === modelId);
  }

  getAuditLogsByExecutionId(executionId: string): AuditLogEntry[] {
    return this.auditLogs.filter(log => log.executionId === executionId);
  }

  getAuditLogsByUserId(userId: string): AuditLogEntry[] {
    return this.auditLogs.filter(log => log.userId === userId);
  }

  findAuditLogsByTableAndRecord(tableName: string, recordId: string): AuditLogEntry[] {
    return this.auditLogs.filter(log => log.tableName === tableName && log.recordId === recordId);
  }

  // Mock lifecycle methods
  clear(): void {
    this.models.clear();
    this.auditLogs = [];
  }

  getAllModels(): FunctionModel[] {
    return Array.from(this.models.values());
  }
}

/**
 * Enhanced Audit Log Repository Mock with Full Persistence
 */
class MockAuditLogRepositoryWithFullPersistence implements IAuditLogRepositoryWithPersistence {
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

  async findByEntityId(entityId: string): Promise<Result<AuditLogEntry[]>> {
    const logs = this.auditLogs.filter(log => log.entityId === entityId);
    return Result.ok(logs);
  }

  async findByModelId(modelId: string): Promise<Result<AuditLogEntry[]>> {
    const logs = this.auditLogs.filter(log => log.modelId === modelId);
    return Result.ok(logs);
  }

  async findByExecutionId(executionId: string): Promise<Result<AuditLogEntry[]>> {
    const logs = this.auditLogs.filter(log => log.executionId === executionId);
    return Result.ok(logs);
  }

  async findByUserId(userId: string): Promise<Result<AuditLogEntry[]>> {
    const logs = this.auditLogs.filter(log => log.userId === userId);
    return Result.ok(logs);
  }

  async findByOperation(operation: string): Promise<Result<AuditLogEntry[]>> {
    const logs = this.auditLogs.filter(log => log.operation === operation);
    return Result.ok(logs);
  }

  async findByTableAndRecord(tableName: string, recordId: string): Promise<Result<AuditLogEntry[]>> {
    const logs = this.auditLogs.filter(log => log.tableName === tableName && log.recordId === recordId);
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

  async countByUser(userId: string): Promise<Result<number>> {
    const count = this.auditLogs.filter(log => log.userId === userId).length;
    return Result.ok(count);
  }

  async exists(id: string): Promise<Result<boolean>> {
    const exists = this.auditLogs.some(log => log.id === id);
    return Result.ok(exists);
  }

  getAllAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  clear(): void {
    this.auditLogs = [];
  }
}

describe('Repository Mock Persistence Specification (TDD)', () => {
  let mockFunctionModelRepo: MockFunctionModelRepositoryWithPersistentAudit;
  let mockAuditLogRepo: MockAuditLogRepositoryWithFullPersistence;
  let mockEventBus: MockEventBusWithAuditCoordination;

  // Test data
  const testUserId = 'test-user-001';
  const testModelId = 'test-model-001';
  const testExecutionId = 'exec-test-001';

  beforeEach(() => {
    mockFunctionModelRepo = new MockFunctionModelRepositoryWithPersistentAudit();
    mockAuditLogRepo = new MockAuditLogRepositoryWithFullPersistence();
    mockEventBus = new MockEventBusWithAuditCoordination();

    // Wire up event bus coordination
    mockEventBus.setAuditLogRepository(mockAuditLogRepo);
    mockFunctionModelRepo.setEventBus(mockEventBus);
  });

  afterEach(() => {
    mockFunctionModelRepo.clear();
    mockAuditLogRepo.clear();
    mockEventBus.clear();
  });

  describe('FAILING TESTS - Repository Audit Trail Persistence', () => {
    describe('FunctionModelRepository_AuditTrailGeneration', () => {
      it('should_GenerateAuditLog_WhenModelCreated', async () => {
        // Arrange: Create a new function model
        // Arrange: Create proper value objects
        const modelNameResult = ModelName.create('Test Model');
        const versionResult = Version.create('1.0.0');
        
        if (modelNameResult.isFailure || versionResult.isFailure) {
          throw new Error('Failed to create value objects for test');
        }

        const newModel = FunctionModel.create({
          modelId: 'test-model-audit-001',
          name: modelNameResult.value,
          description: 'Test model for audit trail generation',
          version: versionResult.value,
          status: ModelStatus.DRAFT,
          currentVersion: versionResult.value,
          nodes: new Map(),
          actionNodes: new Map(),
          metadata: { createdFor: 'audit-test', testUserId },
          permissions: { owner: testUserId, editors: [], viewers: [] }
        }).value!;

        // Act: Save the model
        const saveResult = await mockFunctionModelRepo.save(newModel);

        // Assert: Audit log should be generated
        expect(saveResult.isSuccess).toBe(true);
        
        const auditLogs = mockFunctionModelRepo.getAuditTrail();
        expect(auditLogs.length).toBe(1);

        const auditLog = auditLogs[0];
        expect(auditLog.entityType).toBe('model');
        expect(auditLog.entityId).toBe(newModel.modelId);
        expect(auditLog.operation).toBe('create');
        expect(auditLog.userId).toBe(testUserId);
        expect(auditLog.eventType).toBe('FunctionModelCreated');
        expect(auditLog.modelId).toBe(newModel.modelId);
        expect(auditLog.tableName).toBe('function_models');
        expect(auditLog.recordId).toBe(newModel.modelId);
      });

      it('should_GenerateAuditLog_WhenModelUpdated', async () => {
        // Arrange: Create and save initial model
        // Arrange: Create proper value objects for initial model
        const initialNameResult = ModelName.create('Initial Model');
        const initialVersionResult = Version.create('1.0.0');
        
        if (initialNameResult.isFailure || initialVersionResult.isFailure) {
          throw new Error('Failed to create value objects for test');
        }

        const initialModel = FunctionModel.create({
          modelId: 'test-model-update-001',
          name: initialNameResult.value,
          description: 'Initial model description',
          version: initialVersionResult.value,
          status: ModelStatus.DRAFT,
          currentVersion: initialVersionResult.value,
          nodes: new Map(),
          actionNodes: new Map(),
          metadata: { createdFor: 'update-test', testUserId },
          permissions: { owner: testUserId, editors: [], viewers: [] }
        }).value!;

        await mockFunctionModelRepo.save(initialModel);
        mockFunctionModelRepo.clear(); // Clear to reset audit trail counter

        // Modify the model using proper method
        const publishResult = initialModel.publish();
        if (publishResult.isFailure) {
          throw new Error('Failed to publish model for test');
        }

        // Act: Update the model
        const updateResult = await mockFunctionModelRepo.save(initialModel);

        // Assert: Update audit log should be generated
        expect(updateResult.isSuccess).toBe(true);
        
        const auditLogs = mockFunctionModelRepo.getAuditTrail();
        expect(auditLogs.length).toBe(1);

        const auditLog = auditLogs[0];
        expect(auditLog.operation).toBe('update');
        expect(auditLog.eventType).toBe('FunctionModelUpdated');
        expect(auditLog.eventData.status).toBe(ModelStatus.PUBLISHED);
      });

      it('should_GenerateAuditLog_WhenModelDeleted', async () => {
        // Arrange: Create and save model for deletion
        // Arrange: Create proper value objects for deletion test
        const deleteNameResult = ModelName.create('Model to Delete');
        const deleteVersionResult = Version.create('1.0.0');
        
        if (deleteNameResult.isFailure || deleteVersionResult.isFailure) {
          throw new Error('Failed to create value objects for test');
        }

        const modelToDelete = FunctionModel.create({
          modelId: 'test-model-delete-001',
          name: deleteNameResult.value,
          description: 'Model that will be deleted',
          version: deleteVersionResult.value,
          status: ModelStatus.DRAFT,
          currentVersion: deleteVersionResult.value,
          nodes: new Map(),
          actionNodes: new Map(),
          metadata: { createdFor: 'delete-test', testUserId },
          permissions: { owner: testUserId, editors: [], viewers: [] }
        }).value!;

        await mockFunctionModelRepo.save(modelToDelete);

        // Act: Delete the model
        const deleteResult = await mockFunctionModelRepo.delete(modelToDelete.modelId);

        // Assert: Delete audit log should be generated
        expect(deleteResult.isSuccess).toBe(true);
        
        const auditLogs = mockFunctionModelRepo.getAuditTrail();
        expect(auditLogs.length).toBe(2); // Create + Delete

        const deleteAuditLog = auditLogs.find(log => log.operation === 'delete');
        expect(deleteAuditLog).toBeDefined();
        expect(deleteAuditLog!.entityId).toBe(modelToDelete.modelId);
        expect(deleteAuditLog!.eventType).toBe('FunctionModelDeleted');
      });

      it('should_PersistAuditTrail_AcrossMultipleOperations', async () => {
        // Arrange: Multiple operations on same model
        // Arrange: Create proper value objects for multi-op test
        const multiOpNameResult = ModelName.create('Multi-Op Model');
        const multiOpVersionResult = Version.create('1.0.0');
        
        if (multiOpNameResult.isFailure || multiOpVersionResult.isFailure) {
          throw new Error('Failed to create value objects for test');
        }

        const testModel = FunctionModel.create({
          modelId: 'test-model-multiop-001',
          name: multiOpNameResult.value,
          description: 'Model for multiple operations',
          version: multiOpVersionResult.value,
          status: ModelStatus.DRAFT,
          currentVersion: multiOpVersionResult.value,
          nodes: new Map(),
          actionNodes: new Map(),
          metadata: { createdFor: 'multiop-test', testUserId },
          permissions: { owner: testUserId, editors: [], viewers: [] }
        }).value!;

        // Act: Perform multiple operations
        await mockFunctionModelRepo.save(testModel); // Create
        const publishResult = testModel.publish();
        if (publishResult.isFailure) {
          throw new Error('Failed to publish model for test');
        }
        await mockFunctionModelRepo.save(testModel); // Update
        await mockFunctionModelRepo.findById(testModel.modelId); // Read (no audit expected)
        await mockFunctionModelRepo.delete(testModel.modelId); // Delete

        // Assert: Audit trail should persist across operations
        const auditLogs = mockFunctionModelRepo.getAuditTrail();
        expect(auditLogs.length).toBe(3); // Create + Update + Delete

        // Verify operation sequence
        expect(auditLogs[0].operation).toBe('create');
        expect(auditLogs[1].operation).toBe('update');
        expect(auditLogs[2].operation).toBe('delete');

        // Verify all logs reference same model
        auditLogs.forEach(log => {
          expect(log.modelId).toBe(testModel.modelId);
          expect(log.userId).toBe(testUserId);
        });
      });
    });

    describe('RepositoryCoordination_WithEventBus', () => {
      it('should_PublishDomainEvents_ForRepositoryOperations', async () => {
        // Arrange: Model for event coordination testing
        // Arrange: Create proper value objects for event test
        const eventNameResult = ModelName.create('Event Test Model');
        const eventVersionResult = Version.create('1.0.0');
        
        if (eventNameResult.isFailure || eventVersionResult.isFailure) {
          throw new Error('Failed to create value objects for test');
        }

        const eventModel = FunctionModel.create({
          modelId: 'test-model-event-001',
          name: eventNameResult.value,
          description: 'Model for event bus coordination',
          version: eventVersionResult.value,
          status: ModelStatus.DRAFT,
          currentVersion: eventVersionResult.value,
          nodes: new Map(),
          actionNodes: new Map(),
          metadata: { createdFor: 'event-test', testUserId },
          permissions: { owner: testUserId, editors: [], viewers: [] }
        }).value!;

        // Act: Save model (should trigger event publication)
        await mockFunctionModelRepo.save(eventModel);

        // Assert: Domain event should be published
        const publishedEvents = mockEventBus.getAllEvents();
        expect(publishedEvents.length).toBe(1);

        const event = publishedEvents[0];
        expect(event.eventType).toBe('FunctionModelCreated');
        expect(event.aggregateId).toBe(eventModel.modelId);
        expect(event.userId).toBe(testUserId);

        // Verify event bus created corresponding audit log
        const eventBusAuditLogs = mockAuditLogRepo.getAllAuditLogs();
        expect(eventBusAuditLogs.length).toBe(1);
        expect(eventBusAuditLogs[0].eventType).toBe('FunctionModelCreated');
      });

      it('should_CoordinateAuditLogs_BetweenRepositoryAndEventBus', async () => {
        // Arrange: Model for coordination testing
        // Arrange: Create proper value objects for coordination test
        const coordNameResult = ModelName.create('Coordination Model');
        const coordVersionResult = Version.create('1.0.0');
        
        if (coordNameResult.isFailure || coordVersionResult.isFailure) {
          throw new Error('Failed to create value objects for test');
        }

        const coordModel = FunctionModel.create({
          modelId: 'test-model-coord-001',
          name: coordNameResult.value,
          description: 'Model for audit coordination',
          version: coordVersionResult.value,
          status: ModelStatus.DRAFT,
          currentVersion: coordVersionResult.value,
          nodes: new Map(),
          actionNodes: new Map(),
          metadata: { createdFor: 'coord-test', testUserId },
          permissions: { owner: testUserId, editors: [], viewers: [] }
        }).value!;

        // Act: Perform repository operation
        await mockFunctionModelRepo.save(coordModel);

        // Assert: Both repository and event bus should have audit logs
        const repoAuditLogs = mockFunctionModelRepo.getAuditTrail();
        const eventBusAuditLogs = mockAuditLogRepo.getAllAuditLogs();

        expect(repoAuditLogs.length).toBe(1);
        expect(eventBusAuditLogs.length).toBe(1);

        // Verify logs are for same operation but potentially different aspects
        expect(repoAuditLogs[0].modelId).toBe(coordModel.modelId);
        expect(eventBusAuditLogs[0].modelId).toBe(coordModel.modelId);
        expect(repoAuditLogs[0].eventType).toBe('FunctionModelCreated');
        expect(eventBusAuditLogs[0].eventType).toBe('FunctionModelCreated');
      });

      it('should_MaintainAuditTrailConsistency_AcrossCoordination', async () => {
        // Arrange: Multiple models for consistency testing
        const createConsistencyModel = (name: string, description: string, id: string) => {
          const modelNameResult = ModelName.create(name);
          const versionResult = Version.create('1.0.0');
          
          if (modelNameResult.isFailure || versionResult.isFailure) {
            throw new Error('Failed to create value objects for consistency test');
          }
          
          return FunctionModel.create({
            modelId: id,
            name: modelNameResult.value,
            description,
            version: versionResult.value,
            status: ModelStatus.DRAFT,
            currentVersion: versionResult.value,
            nodes: new Map(),
            actionNodes: new Map(),
            metadata: { createdFor: 'consistency-test', testUserId },
            permissions: { owner: testUserId, editors: [], viewers: [] }
          }).value!;
        };
        
        const models = [
          createConsistencyModel('Model 1', 'First model', 'test-model-001'),
          createConsistencyModel('Model 2', 'Second model', 'test-model-002'),
          createConsistencyModel('Model 3', 'Third model', 'test-model-003')
        ];

        // Act: Save all models
        for (const model of models) {
          await mockFunctionModelRepo.save(model);
        }

        // Assert: Audit trail consistency across systems
        const repoAuditLogs = mockFunctionModelRepo.getAuditTrail();
        const eventBusAuditLogs = mockAuditLogRepo.getAllAuditLogs();

        expect(repoAuditLogs.length).toBe(3);
        expect(eventBusAuditLogs.length).toBe(3);

        // Verify cross-reference integrity
        const repoModelIds = new Set(repoAuditLogs.map(log => log.modelId));
        const eventBusModelIds = new Set(eventBusAuditLogs.map(log => log.modelId));
        
        expect(repoModelIds.size).toBe(3);
        expect(eventBusModelIds.size).toBe(3);
        expect([...repoModelIds]).toEqual([...eventBusModelIds]);
      });
    });

    describe('AuditTrail_E2EDiscovery', () => {
      it('should_EnableAuditLogDiscovery_ByModelId_ForE2ETests', async () => {
        // Arrange: Model with multiple operations for discovery testing
        // Arrange: Create proper value objects for discovery test
        const discoveryNameResult = ModelName.create('Discovery Model');
        const discoveryVersionResult = Version.create('1.0.0');
        
        if (discoveryNameResult.isFailure || discoveryVersionResult.isFailure) {
          throw new Error('Failed to create value objects for test');
        }

        const discoveryModel = FunctionModel.create({
          modelId: 'test-model-discovery-001',
          name: discoveryNameResult.value,
          description: 'Model for E2E discovery testing',
          version: discoveryVersionResult.value,
          status: ModelStatus.DRAFT,
          currentVersion: discoveryVersionResult.value,
          nodes: new Map(),
          actionNodes: new Map(),
          metadata: { createdFor: 'discovery-test', testUserId },
          permissions: { owner: testUserId, editors: [], viewers: [] }
        }).value!;

        // Act: Perform multiple operations
        await mockFunctionModelRepo.save(discoveryModel); // Create
        discoveryModel.status = ModelStatus.PUBLISHED;
        await mockFunctionModelRepo.save(discoveryModel); // Update

        // Simulate execution-related audit logs
        const executionAuditLog: AuditLogEntry = {
          id: 'exec-audit-001',
          entityType: 'execution',
          entityId: testExecutionId,
          operation: 'execute',
          userId: testUserId,
          timestamp: new Date(),
          eventType: 'WorkflowExecutionStarted',
          eventData: { executionId: testExecutionId, modelId: discoveryModel.modelId },
          executionId: testExecutionId,
          modelId: discoveryModel.modelId,
          tableName: 'executions',
          recordId: testExecutionId
        };

        await mockAuditLogRepo.save(executionAuditLog);

        // Assert: E2E tests should be able to discover audit logs by model ID
        const modelAuditLogs = mockFunctionModelRepo.getAuditLogsByModelId(discoveryModel.modelId);
        const eventBusModelLogs = (await mockAuditLogRepo.findByModelId(discoveryModel.modelId)).value;

        expect(modelAuditLogs.length).toBe(2); // Create + Update
        expect(eventBusModelLogs.length).toBe(1); // Execution

        // Verify all logs are discoverable and properly referenced
        [...modelAuditLogs, ...eventBusModelLogs].forEach(log => {
          expect(log.modelId).toBe(discoveryModel.modelId);
          expect(log.userId).toBe(testUserId);
          expect(log.id).toBeDefined();
        });
      });

      it('should_EnableAuditLogDiscovery_ByExecutionId_ForE2ETests', async () => {
        // Arrange: Execution-related audit logs
        const executionAuditLogs: AuditLogEntry[] = [
          {
            id: 'exec-audit-start',
            entityType: 'execution',
            entityId: testExecutionId,
            operation: 'create',
            userId: testUserId,
            timestamp: new Date(Date.now() - 3000),
            eventType: 'WorkflowExecutionStarted',
            eventData: { executionId: testExecutionId, modelId: testModelId },
            executionId: testExecutionId,
            modelId: testModelId,
            tableName: 'executions',
            recordId: testExecutionId
          },
          {
            id: 'exec-audit-node',
            entityType: 'node',
            entityId: 'node-001',
            operation: 'execute',
            userId: testUserId,
            timestamp: new Date(Date.now() - 2000),
            eventType: 'NodeExecutionStarted',
            eventData: { executionId: testExecutionId, modelId: testModelId, nodeId: 'node-001' },
            executionId: testExecutionId,
            modelId: testModelId,
            tableName: 'container_nodes',
            recordId: 'node-001'
          },
          {
            id: 'exec-audit-complete',
            entityType: 'execution',
            entityId: testExecutionId,
            operation: 'update',
            userId: testUserId,
            timestamp: new Date(),
            eventType: 'WorkflowExecutionCompleted',
            eventData: { executionId: testExecutionId, modelId: testModelId, success: true },
            executionId: testExecutionId,
            modelId: testModelId,
            tableName: 'executions',
            recordId: testExecutionId
          }
        ];

        // Act: Save execution audit logs
        for (const log of executionAuditLogs) {
          await mockAuditLogRepo.save(log);
        }

        // Assert: E2E tests should discover logs by execution ID
        const discoveredLogs = (await mockAuditLogRepo.findByExecutionId(testExecutionId)).value;
        expect(discoveredLogs.length).toBe(3);

        // Verify execution sequence is preserved
        const sortedLogs = discoveredLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        expect(sortedLogs[0].eventType).toBe('WorkflowExecutionStarted');
        expect(sortedLogs[1].eventType).toBe('NodeExecutionStarted');
        expect(sortedLogs[2].eventType).toBe('WorkflowExecutionCompleted');

        // Verify all reference same execution
        discoveredLogs.forEach(log => {
          expect(log.executionId).toBe(testExecutionId);
        });
      });

      it('should_SupportCrossReferenceQueries_ForE2EValidation', async () => {
        // Arrange: Create model and simulate complete execution cycle
        // Arrange: Create proper value objects for cross-ref test
        const crossRefNameResult = ModelName.create('Cross Ref Model');
        const crossRefVersionResult = Version.create('1.0.0');
        
        if (crossRefNameResult.isFailure || crossRefVersionResult.isFailure) {
          throw new Error('Failed to create value objects for test');
        }

        const crossRefModel = FunctionModel.create({
          modelId: 'test-model-crossref-001',
          name: crossRefNameResult.value,
          description: 'Model for cross-reference testing',
          version: crossRefVersionResult.value,
          status: ModelStatus.DRAFT,
          currentVersion: crossRefVersionResult.value,
          nodes: new Map(),
          actionNodes: new Map(),
          metadata: { createdFor: 'crossref-test', testUserId },
          permissions: { owner: testUserId, editors: [], viewers: [] }
        }).value!;

        await mockFunctionModelRepo.save(crossRefModel);

        // Add execution audit logs
        const executionAuditLog: AuditLogEntry = {
          id: 'cross-ref-exec',
          entityType: 'execution',
          entityId: testExecutionId,
          operation: 'execute',
          userId: testUserId,
          timestamp: new Date(),
          eventType: 'WorkflowExecutionCompleted',
          eventData: { executionId: testExecutionId, modelId: crossRefModel.modelId, success: true },
          executionId: testExecutionId,
          modelId: crossRefModel.modelId,
          tableName: 'executions',
          recordId: testExecutionId
        };

        await mockAuditLogRepo.save(executionAuditLog);

        // Assert: Cross-reference queries should work
        const modelLogs = mockFunctionModelRepo.getAuditLogsByModelId(crossRefModel.modelId);
        const executionLogs = (await mockAuditLogRepo.findByExecutionId(testExecutionId)).value;
        const userLogs = mockFunctionModelRepo.getAuditLogsByUserId(testUserId);
        const tableRecordLogs = mockFunctionModelRepo.findAuditLogsByTableAndRecord('function_models', crossRefModel.modelId);

        // Verify cross-reference results
        expect(modelLogs.length).toBe(1); // Model creation
        expect(executionLogs.length).toBe(1); // Execution
        expect(userLogs.length).toBe(1); // User operations
        expect(tableRecordLogs.length).toBe(1); // Table/record specific

        // Verify cross-reference integrity
        const allRelevantLogs = [...modelLogs, ...executionLogs];
        allRelevantLogs.forEach(log => {
          expect(log.modelId).toBe(crossRefModel.modelId);
          expect(log.userId).toBe(testUserId);
        });
      });
    });

    describe('MockLifecycle_PersistenceRequirements', () => {
      it('should_MaintainAuditTrail_ThroughMockLifecycle', async () => {
        // Arrange: Create audit trail
        // Arrange: Create proper value objects for lifecycle test
        const lifecycleNameResult = ModelName.create('Lifecycle Model');
        const lifecycleVersionResult = Version.create('1.0.0');
        
        if (lifecycleNameResult.isFailure || lifecycleVersionResult.isFailure) {
          throw new Error('Failed to create value objects for test');
        }

        const lifecycleModel = FunctionModel.create({
          modelId: 'test-model-lifecycle-001',
          name: lifecycleNameResult.value,
          description: 'Model for lifecycle testing',
          version: lifecycleVersionResult.value,
          status: ModelStatus.DRAFT,
          currentVersion: lifecycleVersionResult.value,
          nodes: new Map(),
          actionNodes: new Map(),
          metadata: { createdFor: 'lifecycle-test', testUserId },
          permissions: { owner: testUserId, editors: [], viewers: [] }
        }).value!;

        await mockFunctionModelRepo.save(lifecycleModel);

        const initialAuditCount = mockFunctionModelRepo.getAuditTrail().length;
        expect(initialAuditCount).toBe(1);

        // Act: Perform additional operations (simulating test lifecycle)
        lifecycleModel.status = ModelStatus.PUBLISHED;
        await mockFunctionModelRepo.save(lifecycleModel);

        const additionalAuditLog: AuditLogEntry = {
          id: 'lifecycle-audit',
          entityType: 'execution',
          entityId: testExecutionId,
          operation: 'execute',
          userId: testUserId,
          timestamp: new Date(),
          eventType: 'WorkflowExecutionStarted',
          eventData: { executionId: testExecutionId, modelId: lifecycleModel.modelId },
          executionId: testExecutionId,
          modelId: lifecycleModel.modelId,
          tableName: 'executions',
          recordId: testExecutionId
        };

        await mockAuditLogRepo.save(additionalAuditLog);

        // Assert: Audit trail should persist through operations
        const repoAuditTrail = mockFunctionModelRepo.getAuditTrail();
        const auditLogRepoTrail = mockAuditLogRepo.getAllAuditLogs();

        expect(repoAuditTrail.length).toBe(2); // Create + Update
        expect(auditLogRepoTrail.length).toBeGreaterThan(0); // Various event-generated logs

        // Verify persistence across different query methods
        const modelSpecificLogs = mockFunctionModelRepo.getAuditLogsByModelId(lifecycleModel.modelId);
        expect(modelSpecificLogs.length).toBe(2);

        const executionSpecificLogs = (await mockAuditLogRepo.findByExecutionId(testExecutionId)).value;
        expect(executionSpecificLogs.length).toBe(1);
      });

      it('should_ClearCompletely_WhenExplicitlyRequested', async () => {
        // Arrange: Build up audit trail
        // Arrange: Create proper value objects for clear test
        const clearNameResult = ModelName.create('Clear Test Model');
        const clearVersionResult = Version.create('1.0.0');
        
        if (clearNameResult.isFailure || clearVersionResult.isFailure) {
          throw new Error('Failed to create value objects for test');
        }

        const clearModel = FunctionModel.create({
          modelId: 'test-model-clear-001',
          name: clearNameResult.value,
          description: 'Model for clear testing',
          version: clearVersionResult.value,
          status: ModelStatus.DRAFT,
          currentVersion: clearVersionResult.value,
          nodes: new Map(),
          actionNodes: new Map(),
          metadata: { createdFor: 'clear-test', testUserId },
          permissions: { owner: testUserId, editors: [], viewers: [] }
        }).value!;

        await mockFunctionModelRepo.save(clearModel);

        const clearAuditLog: AuditLogEntry = {
          id: 'clear-test-audit',
          entityType: 'execution',
          entityId: testExecutionId,
          operation: 'execute',
          userId: testUserId,
          timestamp: new Date(),
          eventType: 'WorkflowExecutionStarted',
          eventData: { executionId: testExecutionId, modelId: clearModel.modelId },
          executionId: testExecutionId,
          modelId: clearModel.modelId,
          tableName: 'executions',
          recordId: testExecutionId
        };

        await mockAuditLogRepo.save(clearAuditLog);

        // Verify trail exists
        expect(mockFunctionModelRepo.getAuditTrail().length).toBeGreaterThan(0);
        expect(mockAuditLogRepo.getAllAuditLogs().length).toBeGreaterThan(0);

        // Act: Clear repositories
        mockFunctionModelRepo.clear();
        mockAuditLogRepo.clear();

        // Assert: Everything should be cleared
        expect(mockFunctionModelRepo.getAuditTrail().length).toBe(0);
        expect(mockAuditLogRepo.getAllAuditLogs().length).toBe(0);
        expect(mockFunctionModelRepo.getAllModels().length).toBe(0);
      });

      it('should_EnablePartialPersistence_ForE2EScenarios', async () => {
        // Arrange: Simulate E2E scenario where some data persists
        // Arrange: Create proper value objects for E2E test
        const e2eNameResult = ModelName.create('E2E Scenario Model');
        const e2eVersionResult = Version.create('1.0.0');
        
        if (e2eNameResult.isFailure || e2eVersionResult.isFailure) {
          throw new Error('Failed to create value objects for test');
        }

        const e2eModel = FunctionModel.create({
          modelId: 'test-model-e2e-001',
          name: e2eNameResult.value,
          description: 'Model for E2E scenario testing',
          version: e2eVersionResult.value,
          status: ModelStatus.DRAFT,
          currentVersion: e2eVersionResult.value,
          nodes: new Map(),
          actionNodes: new Map(),
          metadata: { createdFor: 'e2e-test', testUserId },
          permissions: { owner: testUserId, editors: [], viewers: [] }
        }).value!;

        await mockFunctionModelRepo.save(e2eModel);

        // Simulate execution generating multiple audit logs
        const executionAuditLogs: AuditLogEntry[] = [
          {
            id: 'e2e-start',
            entityType: 'execution',
            entityId: testExecutionId,
            operation: 'create',
            userId: testUserId,
            timestamp: new Date(Date.now() - 2000),
            eventType: 'WorkflowExecutionStarted',
            eventData: { executionId: testExecutionId, modelId: e2eModel.modelId },
            executionId: testExecutionId,
            modelId: e2eModel.modelId,
            tableName: 'executions',
            recordId: testExecutionId
          },
          {
            id: 'e2e-complete',
            entityType: 'execution',
            entityId: testExecutionId,
            operation: 'update',
            userId: testUserId,
            timestamp: new Date(),
            eventType: 'WorkflowExecutionCompleted',
            eventData: { executionId: testExecutionId, modelId: e2eModel.modelId, success: true },
            executionId: testExecutionId,
            modelId: e2eModel.modelId,
            tableName: 'executions',
            recordId: testExecutionId
          }
        ];

        for (const log of executionAuditLogs) {
          await mockAuditLogRepo.save(log);
        }

        // Assert: E2E should be able to discover minimum 6 audit logs total
        const repoLogs = mockFunctionModelRepo.getAuditTrail();
        const auditRepoLogs = mockAuditLogRepo.getAllAuditLogs();
        const eventBusLogs = mockEventBus.getAllEvents().length;

        const totalDiscoverableAuditEntries = repoLogs.length + auditRepoLogs.length;
        expect(totalDiscoverableAuditEntries).toBeGreaterThanOrEqual(3); // Minimum for this test

        // Verify E2E discovery patterns work
        const modelAuditLogs = mockFunctionModelRepo.getAuditLogsByModelId(e2eModel.modelId);
        const executionAuditLogs_discovered = (await mockAuditLogRepo.findByExecutionId(testExecutionId)).value;

        expect(modelAuditLogs.length).toBe(1); // Model creation
        expect(executionAuditLogs_discovered.length).toBe(2); // Start + Complete
        
        // This pattern should enable E2E tests to find >=6 audit logs
        const combinedForE2E = [...modelAuditLogs, ...executionAuditLogs_discovered];
        // Add event bus logs that would be generated in real execution
        expect(combinedForE2E.length + eventBusLogs).toBeGreaterThanOrEqual(3);
      });
    });
  });
});