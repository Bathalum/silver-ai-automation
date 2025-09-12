/**
 * Comprehensive End-to-End Test Suite for Complete User Workflows
 * 
 * This test suite validates complete user workflows based on the Use Case Model requirements:
 * - Primary Dependency Chain: UC-001→UC-002→UC-003→UC-004→UC-005
 * - Complex Execution Pipeline: UC-005 coordinating UC-010,011,012,013
 * - AI Agent Workflow: UC-017→UC-018→UC-019
 * - Cross-Feature Integration: UC-014→UC-015, UC-003→UC-014, UC-005→UC-019
 * - Error Recovery across dependency boundaries
 * - All Application Services working together
 * - Real user scenarios with actual data flows
 * - Complete system integration with minimal mocking
 * 
 * Architecture: Tests complete workflows through all Clean Architecture layers:
 * - UI/API Layer → Use Cases → Domain Services → Infrastructure
 * - Validates dependency inversion and layer separation
 * - Tests actual business workflows end-to-end
 */

import { 
  CreateFunctionModelUseCase,
  PublishFunctionModelUseCase,
  ValidateWorkflowStructureUseCase,
  CreateModelVersionUseCase,
  ManageHierarchicalContextAccessUseCase,
  ManageFractalOrchestrationUseCase,
  ManageErrorHandlingAndRecoveryUseCase
} from '../../lib/use-cases';

import { CreateUnifiedNodeUseCase } from '../../lib/use-cases/function-model/create-unified-node-use-case';
import { AddActionNodeToContainerUseCase } from '../../lib/use-cases/function-model/add-action-node-to-container-use-case';
import { ExecuteFunctionModelUseCase } from '../../lib/use-cases/function-model/execute-function-model-use-case';
import { ArchiveFunctionModelUseCase } from '../../lib/use-cases/function-model/archive-function-model-use-case';
import { SoftDeleteFunctionModelUseCase } from '../../lib/use-cases/function-model/soft-delete-function-model-use-case';
import { WorkflowOrchestrationService } from '../../lib/domain/services/workflow-orchestration-service';
import { ActionNodeExecutionService } from '../../lib/domain/services/action-node-execution-service';
import { FractalOrchestrationService } from '../../lib/domain/services/fractal-orchestration-service';
import { ActionNodeOrchestrationService } from '../../lib/domain/services/action-node-orchestration-service';
import { NodeContextAccessService } from '../../lib/domain/services/node-context-access-service';

import { 
  FunctionModelRepository,
  AuditLogRepository 
} from '../../lib/domain/interfaces';

// Import specific interfaces for compatibility
import { IAuditLogRepository } from '../../lib/domain/interfaces/audit-log-repository';
import { IFunctionModelRepository } from '../../lib/use-cases/function-model/create-function-model-use-case';

import { IEventBus } from '../../lib/infrastructure/events/supabase-event-bus';
import { Result } from '../../lib/domain/shared/result';
import { ModelStatus, ContainerNodeType } from '../../lib/domain/enums';

/**
 * Mock Use Cases for missing implementations
 * These will be replaced with actual implementations as they're developed
 */

class ManageActionNodeOrchestrationUseCase {
  constructor(private repository: any, private eventBus: any) {}
  
  async execute(request: any): Promise<Result<any>> {
    // Mock implementation
    return Result.ok({
      operationId: 'mock-orchestration-id',
      configured: true,
      orchestrationRules: request.orchestrationRules
    });
  }
}

class ManageAiAgentOrchestrationUseCase {
  constructor(private repository: any, private eventBus: any) {}
  
  async execute(request: any): Promise<Result<any>> {
    // Mock implementation based on operation type
    if (request.operation === 'registerAgent') {
      await this.eventBus.publish({
        eventType: 'AIAgentRegistered',
        aggregateId: request.modelId,
        eventData: {
          agentId: request.agentDefinition.agentId,
          name: request.agentDefinition.name,
          capabilities: request.agentDefinition.capabilities
        },
        userId: request.userId,
        timestamp: new Date()
      });
      
      return Result.ok({
        agentId: request.agentDefinition.agentId,
        registered: true,
        capabilities: request.agentDefinition.capabilities
      });
    } else if (request.operation === 'discoverCapabilities') {
      await this.eventBus.publish({
        eventType: 'AIAgentCapabilitiesDiscovered',
        aggregateId: request.modelId,
        eventData: {
          discoveryQuery: request.discoveryQuery,
          agentsFound: 1
        },
        userId: request.userId,
        timestamp: new Date()
      });
      
      return Result.ok({
        discoveredAgents: [
          {
            agentId: 'mock-agent-id',
            compatibilityScore: 0.9,
            capabilities: request.discoveryQuery.requiredCapabilities
          }
        ]
      });
    } else if (request.operation === 'configureAgent') {
      await this.eventBus.publish({
        eventType: 'AIAgentOrchestrationConfigured',
        aggregateId: request.modelId,
        eventData: {
          agentId: request.agentId,
          configuration: request.configuration
        },
        userId: request.userId,
        timestamp: new Date()
      });
      
      return Result.ok({
        agentId: request.agentId,
        configured: true,
        configuration: request.configuration
      });
    }
    
    return Result.ok({ operation: request.operation, success: true });
  }
}

class ManageCrossFeatureIntegrationUseCase {
  constructor(private repository: any, private eventBus: any) {}
  
  async execute(request: any): Promise<Result<any>> {
    // Mock implementation based on operation type
    if (request.operation === 'createCrossFeatureLink') {
      const linkId = `link-${Date.now()}`;
      
      await this.eventBus.publish({
        eventType: 'CrossFeatureLinkCreated',
        aggregateId: request.sourceModelId,
        eventData: {
          linkId,
          sourceModelId: request.sourceModelId,
          targetModelId: request.targetModelId,
          linkType: request.linkType
        },
        userId: request.userId,
        timestamp: new Date()
      });
      
      return Result.ok({
        linkId,
        created: true,
        linkType: request.linkType
      });
    } else if (request.operation === 'calculateLinkStrength') {
      await this.eventBus.publish({
        eventType: 'LinkStrengthCalculated',
        aggregateId: request.linkId,
        eventData: {
          linkId: request.linkId,
          strength: 0.75
        },
        timestamp: new Date()
      });
      
      return Result.ok({
        linkStrength: 0.75,
        strengthFactors: {
          dataFlowComplexity: 0.8,
          executionFrequency: 0.7,
          errorCorrelation: 0.8
        }
      });
    }
    
    return Result.ok({ operation: request.operation, success: true });
  }
}

import { 
  FunctionModelBuilder, 
  TestData, 
  TestFactories,
  IONodeBuilder,
  StageNodeBuilder, 
  TetherNodeBuilder,
  KBNodeBuilder,
  FunctionModelContainerNodeBuilder,
  getTestUUID 
} from '../utils/test-fixtures';

/**
 * Mock Infrastructure Services (Minimal mocking for E2E testing)
 * Only mock external dependencies, not internal business logic
 */
class MockFunctionModelRepository implements IFunctionModelRepository {
  private models = new Map<string, any>();
  private nextId = 1;

  async save(model: any): Promise<Result<void>> {
    this.models.set(model.modelId, { ...model, savedAt: new Date() });
    return Result.ok(undefined);
  }

  async findById(id: string): Promise<Result<any>> {
    const model = this.models.get(id);
    if (!model) {
      return Result.fail(`Model with id ${id} not found`);
    }
    return Result.ok(model);
  }

  async findByName(name: string, organizationId?: string): Promise<Result<any>> {
    const existingModel = Array.from(this.models.values()).find(
      m => m.name.toString() === name && (!organizationId || m.metadata?.organizationId === organizationId)
    );
    if (!existingModel) {
      return Result.fail('Model not found');
    }
    return Result.ok(existingModel);
  }

  async delete(id: string): Promise<Result<void>> {
    if (!this.models.has(id)) {
      return Result.fail(`Model with id ${id} not found`);
    }
    this.models.delete(id);
    return Result.ok(undefined);
  }

  async findAll(filter?: any): Promise<Result<any[]>> {
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

  // Test helper methods
  clear() {
    this.models.clear();
  }

  getAllModels() {
    return Array.from(this.models.values());
  }
}

class MockAuditLogRepository implements IAuditLogRepository {
  private logs: any[] = [];

  async save(auditLog: any): Promise<Result<void>> {
    this.logs.push({ ...auditLog, timestamp: new Date() });
    return Result.ok(undefined);
  }

  async findById(id: string): Promise<Result<any>> {
    const log = this.logs.find(l => l.id === id);
    return log ? Result.ok(log) : Result.fail('Log not found');
  }

  // IAuditLogRepository interface methods
  async findByEntityId(entityId: string): Promise<Result<any[]>> {
    const entityLogs = this.logs.filter(l => l.entityId === entityId);
    return Result.ok(entityLogs);
  }

  async findByRecordId(recordId: string): Promise<Result<any[]>> {
    const recordLogs = this.logs.filter(l => l.recordId === recordId);
    return Result.ok(recordLogs);
  }

  async findByTableName(tableName: string): Promise<Result<any[]>> {
    const tableLogs = this.logs.filter(l => l.tableName === tableName);
    return Result.ok(tableLogs);
  }

  async findByOperation(operation: 'create' | 'update' | 'delete'): Promise<Result<any[]>> {
    const operationLogs = this.logs.filter(l => l.operation === operation);
    return Result.ok(operationLogs);
  }

  async findByUser(userId: string): Promise<Result<any[]>> {
    const userLogs = this.logs.filter(l => l.userId === userId);
    return Result.ok(userLogs);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Result<any[]>> {
    const rangeLogs = this.logs.filter(
      l => l.timestamp >= startDate && l.timestamp <= endDate
    );
    return Result.ok(rangeLogs);
  }

  async findRecent(limit: number): Promise<Result<any[]>> {
    const recentLogs = this.logs.slice(-limit);
    return Result.ok(recentLogs);
  }

  async findByTableAndRecord(tableName: string, recordId: string): Promise<Result<any[]>> {
    const logs = this.logs.filter(l => l.tableName === tableName && l.recordId === recordId);
    return Result.ok(logs);
  }

  async countByOperation(operation: 'create' | 'update' | 'delete'): Promise<Result<number>> {
    const count = this.logs.filter(l => l.operation === operation).length;
    return Result.ok(count);
  }

  async countByUser(userId: string): Promise<Result<number>> {
    const count = this.logs.filter(l => l.userId === userId).length;
    return Result.ok(count);
  }

  async countByDateRange(startDate: Date, endDate: Date): Promise<Result<number>> {
    const count = this.logs.filter(
      l => l.timestamp >= startDate && l.timestamp <= endDate
    ).length;
    return Result.ok(count);
  }

  async deleteOldEntries(beforeDate: Date): Promise<Result<number>> {
    const initialLength = this.logs.length;
    this.logs = this.logs.filter(l => l.timestamp >= beforeDate);
    return Result.ok(initialLength - this.logs.length);
  }

  async exists(id: string): Promise<Result<boolean>> {
    const exists = this.logs.some(l => l.id === id);
    return Result.ok(exists);
  }

  async findAll(): Promise<Result<any[]>> {
    return Result.ok([...this.logs]);
  }

  // Compatibility methods for E2E tests
  async findByModelId(modelId: string): Promise<Result<any[]>> {
    const modelLogs = this.logs.filter(l => l.modelId === modelId || l.entityId === modelId);
    return Result.ok(modelLogs);
  }

  async delete(id: string): Promise<Result<void>> {
    const index = this.logs.findIndex(l => l.id === id);
    if (index === -1) {
      return Result.fail('Log not found');
    }
    this.logs.splice(index, 1);
    return Result.ok(undefined);
  }

  // Test helper methods
  clear() {
    this.logs = [];
  }

  getAllLogs() {
    return [...this.logs];
  }

  getLogsByAction(action: string) {
    return this.logs.filter(l => l.action === action);
  }
}

class MockEventBus implements IEventBus {
  private events: any[] = [];
  private subscribers = new Map<string, Function[]>();

  async publish(event: any): Promise<void> {
    this.events.push({ ...event, publishedAt: new Date() });
    
    const handlers = this.subscribers.get(event.eventType) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.warn(`Event handler error for ${event.eventType}:`, error);
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

  // Test helper methods
  clear() {
    this.events = [];
    this.subscribers.clear();
  }

  getAllEvents() {
    return [...this.events];
  }

  getEventsByType(eventType: string) {
    return this.events.filter(e => e.eventType === eventType);
  }
}

/**
 * E2E Test Suite: Complete User Workflows
 * 
 * Tests real user scenarios through all architectural layers with minimal mocking.
 * Validates use case dependencies and cross-feature integration.
 */
describe('Complete User Workflows - E2E Test Suite', () => {
  // Infrastructure (minimal mocks)
  let mockRepository: MockFunctionModelRepository;
  let mockAuditRepository: MockAuditLogRepository;
  let mockEventBus: MockEventBus;

  // Use Cases (Real instances - no mocking)
  let createModelUseCase: CreateFunctionModelUseCase;
  let createUnifiedNodeUseCase: CreateUnifiedNodeUseCase;
  let addActionUseCase: AddActionNodeToContainerUseCase;
  let publishModelUseCase: PublishFunctionModelUseCase;
  let executeModelUseCase: ExecuteFunctionModelUseCase;
  let validateWorkflowUseCase: ValidateWorkflowStructureUseCase;
  let createVersionUseCase: CreateModelVersionUseCase;
  let archiveModelUseCase: ArchiveFunctionModelUseCase;
  let softDeleteUseCase: SoftDeleteFunctionModelUseCase;

  // Advanced Use Cases for cross-feature integration
  let contextAccessUseCase: ManageHierarchicalContextAccessUseCase;
  let fractalOrchestrationUseCase: ManageFractalOrchestrationUseCase;
  let errorHandlingUseCase: ManageErrorHandlingAndRecoveryUseCase;
  let actionOrchestrationUseCase: ManageActionNodeOrchestrationUseCase;
  let aiAgentOrchestrationUseCase: ManageAiAgentOrchestrationUseCase;
  let crossFeatureIntegrationUseCase: ManageCrossFeatureIntegrationUseCase;

  // Test data
  const testUserId = TestData.VALID_USER_ID;
  const testOrganizationId = 'org-e2e-test-123';

  beforeEach(() => {
    // Initialize infrastructure mocks
    mockRepository = new MockFunctionModelRepository();
    mockAuditRepository = new MockAuditLogRepository();
    mockEventBus = new MockEventBus();

    // Initialize Use Cases with real business logic
    createModelUseCase = new CreateFunctionModelUseCase(mockRepository, mockEventBus);
    createUnifiedNodeUseCase = new CreateUnifiedNodeUseCase(mockRepository, mockEventBus);
    addActionUseCase = new AddActionNodeToContainerUseCase(mockRepository, mockEventBus);
    publishModelUseCase = new PublishFunctionModelUseCase(mockRepository, mockEventBus);
    // Create required domain services for execution
    const mockWorkflowOrchestrationService = new WorkflowOrchestrationService();
    const mockActionNodeExecutionService = new ActionNodeExecutionService();
    const mockFractalOrchestrationService = new FractalOrchestrationService();
    const mockActionNodeOrchestrationService = new ActionNodeOrchestrationService();
    const mockNodeContextAccessService = new NodeContextAccessService();
    
    executeModelUseCase = new ExecuteFunctionModelUseCase(
      mockRepository, 
      mockEventBus,
      mockWorkflowOrchestrationService,
      mockActionNodeExecutionService,
      mockFractalOrchestrationService,
      mockActionNodeOrchestrationService,
      mockNodeContextAccessService
    );
    validateWorkflowUseCase = new ValidateWorkflowStructureUseCase(mockRepository);
    createVersionUseCase = new CreateModelVersionUseCase(mockRepository, mockEventBus);
    archiveModelUseCase = new ArchiveFunctionModelUseCase(mockRepository, mockEventBus);
    softDeleteUseCase = new SoftDeleteFunctionModelUseCase(mockRepository, mockAuditRepository, mockEventBus);

    // Initialize advanced Use Cases for cross-feature integration
    contextAccessUseCase = new ManageHierarchicalContextAccessUseCase(mockRepository, mockEventBus);
    fractalOrchestrationUseCase = new ManageFractalOrchestrationUseCase(mockRepository, mockEventBus);
    errorHandlingUseCase = new ManageErrorHandlingAndRecoveryUseCase(mockRepository, mockEventBus);
    actionOrchestrationUseCase = new ManageActionNodeOrchestrationUseCase(mockRepository, mockEventBus);
    aiAgentOrchestrationUseCase = new ManageAiAgentOrchestrationUseCase(mockRepository, mockEventBus);
    crossFeatureIntegrationUseCase = new ManageCrossFeatureIntegrationUseCase(mockRepository, mockEventBus);
  });

  afterEach(() => {
    // Clear all test data
    mockRepository.clear();
    mockAuditRepository.clear();
    mockEventBus.clear();
  });

  describe('Primary Dependency Chain: UC-001→UC-002→UC-003→UC-004→UC-005', () => {
    describe('CompleteWorkflowCreation_E2E', () => {
      it('should_ExecuteFullPrimaryChain_WhenAllDependenciesSucceed', async () => {
        // Arrange: Test data for complete workflow
        const workflowName = 'E2E Complete Workflow';
        const workflowDescription = 'End-to-end test of complete user workflow';

        // Act & Assert: Execute Primary Dependency Chain

        // UC-001: Create Function Model
        const createResult = await createModelUseCase.execute({
          name: workflowName,
          description: workflowDescription,
          userId: testUserId,
          organizationId: testOrganizationId
        });

        expect(createResult.isSuccess).toBe(true);
        expect(createResult.value.name).toBe(workflowName);
        expect(createResult.value.status).toBe(ModelStatus.DRAFT);

        const modelId = createResult.value.modelId;

        // Verify UC-001 effects
        const createdModel = await mockRepository.findById(modelId);
        expect(createdModel.isSuccess).toBe(true);
        // Access name from the props structure (mock repository stores raw object)
        expect(createdModel.value.props.name._value).toBe(workflowName);

        // UC-002: Add Container Node (must create model before adding nodes)
        const addContainerResult = await createUnifiedNodeUseCase.execute({
          modelId,
          nodeType: ContainerNodeType.STAGE_NODE,
          name: 'Processing Stage',
          description: 'Main processing stage for E2E test',
          position: { x: 300, y: 200 },
          userId: testUserId
        });

        if (addContainerResult.isFailure) {
          console.log('AddContainer failed with error:', addContainerResult.error);
        }
        expect(addContainerResult.isSuccess).toBe(true);
        expect(addContainerResult.value.nodeType).toBe(ContainerNodeType.STAGE_NODE);
        
        const stageNodeId = addContainerResult.value.nodeId;

        // UC-003: Add Action Node to Container (must create container before adding actions)
        const addActionResult = await addActionUseCase.execute({
          modelId,
          parentNodeId: stageNodeId,
          actionType: 'tether',
          actionName: 'Process Action',
          actionDescription: 'Main processing action for E2E test',
          executionOrder: 1,
          userId: testUserId
        });

        expect(addActionResult.isSuccess).toBe(true);
        expect(addActionResult.value.actionType).toBe('tether');
        expect(addActionResult.value.parentNodeId).toBe(stageNodeId);

        // UC-004: Validate and Publish (must configure actions before publishing)
        const validateResult = await validateWorkflowUseCase.execute({
          modelId,
          userId: testUserId,
          validationLevel: 'full'
        });

        expect(validateResult.isSuccess).toBe(true);
        expect(validateResult.value.isValid).toBe(true);

        const publishResult = await publishModelUseCase.execute({
          modelId,
          userId: testUserId,
          publishNotes: 'E2E test publication',
          enforceValidation: true
        });

        expect(publishResult.isSuccess).toBe(true);
        expect(publishResult.value.status).toBe(ModelStatus.PUBLISHED);

        // UC-005: Execute Model (must publish before execution)
        const executeResult = await executeModelUseCase.execute({
          modelId,
          userId: testUserId,
          executionMode: 'sequential',
          inputData: { testInput: 'E2E test data' }
        });

        expect(executeResult.isSuccess).toBe(true);
        expect(executeResult.value.executionId).toBeDefined();
        expect(executeResult.value.status).toBe('completed');

        // Verify complete workflow state
        const finalModel = await mockRepository.findById(modelId);
        expect(finalModel.isSuccess).toBe(true);
        expect(finalModel.value.status).toBe(ModelStatus.PUBLISHED);

        // Verify audit trail shows complete workflow
        const auditLogs = await mockAuditRepository.findByModelId(modelId);
        expect(auditLogs.isSuccess).toBe(true);
        expect(auditLogs.value.length).toBeGreaterThan(0);

        // Verify events published for each step
        const events = mockEventBus.getAllEvents();
        expect(events.some(e => e.eventType === 'FunctionModelCreated')).toBe(true);
        expect(events.some(e => e.eventType === 'ContainerNodeAdded')).toBe(true);
        expect(events.some(e => e.eventType === 'ActionNodeAdded')).toBe(true);
        expect(events.some(e => e.eventType === 'FunctionModelPublished')).toBe(true);
        expect(events.some(e => e.eventType === 'FunctionModelExecuted')).toBe(true);
      });

      it('should_FailGracefully_WhenDependencyViolated', async () => {
        // Arrange: Attempt to violate UC-002 dependency (add node to non-existent model)
        const nonExistentModelId = getTestUUID('non-existent');

        // Act: Try to add container node to non-existent model
        const addContainerResult = await createUnifiedNodeUseCase.execute({
          modelId: nonExistentModelId,
          nodeType: 'stage',
          nodeName: 'Invalid Stage',
          userId: testUserId
        });

        // Assert: Dependency violation should be caught
        expect(addContainerResult.isFailure).toBe(true);
        expect(addContainerResult.error).toContain('not found');

        // Verify no side effects occurred
        const auditLogs = await mockAuditRepository.findByModelId(nonExistentModelId);
        expect(auditLogs.value.length).toBe(0);
      });

      it('should_EnforcePublicationPrerequisites_BeforeExecution', async () => {
        // Arrange: Create model but don't publish
        const createResult = await createModelUseCase.execute({
          name: 'Unpublished Model',
          description: 'Model for testing publication prerequisites',
          userId: testUserId,
          organizationId: testOrganizationId
        });

        expect(createResult.isSuccess).toBe(true);
        const modelId = createResult.value.modelId;

        // Act: Try to execute unpublished model
        const executeResult = await executeModelUseCase.execute({
          modelId,
          userId: testUserId,
          executionMode: 'sequential',
          inputData: { testInput: 'test' }
        });

        // Assert: Execution should fail due to publication prerequisite
        expect(executeResult.isFailure).toBe(true);
        expect(executeResult.error).toContain('must be published');

        // Verify model status is still DRAFT
        const model = await mockRepository.findById(modelId);
        expect(model.value.status).toBe(ModelStatus.DRAFT);
      });
    });

    describe('WorkflowVersioning_E2E', () => {
      it('should_CreateNewVersion_AfterSuccessfulExecution', async () => {
        // Arrange: Complete primary chain first
        const createResult = await createModelUseCase.execute({
          name: 'Versioning Test Model',
          description: 'Model for testing versioning workflow',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const modelId = createResult.value.modelId;

        // Add container and action
        const containerResult = await createUnifiedNodeUseCase.execute({
          modelId,
          nodeType: 'stage',
          nodeName: 'Version Stage',
          userId: testUserId
        });
        
        await addActionUseCase.execute({
          modelId,
          parentNodeId: containerResult.value.nodeId,
          actionType: 'tether',
          actionName: 'Version Action',
          userId: testUserId
        });

        // Publish and execute
        await publishModelUseCase.execute({
          modelId,
          userId: testUserId,
          publishNotes: 'Initial version'
        });

        await executeModelUseCase.execute({
          modelId,
          userId: testUserId,
          executionMode: 'sequential',
          inputData: { test: 'data' }
        });

        // Act: Create new version
        const versionResult = await createVersionUseCase.execute({
          modelId,
          userId: testUserId,
          versionType: 'minor',
          versionNotes: 'E2E test version increment'
        });

        // Assert: Version creation should succeed
        expect(versionResult.isSuccess).toBe(true);
        expect(versionResult.value.newVersion).toBe('1.1.0');
        expect(versionResult.value.versionType).toBe('minor');

        // Verify model version was updated
        const updatedModel = await mockRepository.findById(modelId);
        expect(updatedModel.value.version.toString()).toBe('1.1.0');

        // Verify versioning event was published
        const versionEvents = mockEventBus.getEventsByType('ModelVersionCreated');
        expect(versionEvents.length).toBe(1);
        expect(versionEvents[0].eventData.newVersion).toBe('1.1.0');
      });
    });
  });

  describe('Complex Execution Pipeline: UC-005 coordinating UC-010,011,012,013', () => {
    describe('FractalExecution_E2E', () => {
      it('should_CoordinateComplexExecution_WithMultipleOrchestrationServices', async () => {
        // Arrange: Create complex workflow with nested models and AI agents
        const mainModelResult = await createModelUseCase.execute({
          name: 'Complex Execution Pipeline',
          description: 'E2E test of complex execution with fractal orchestration',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const mainModelId = mainModelResult.value.modelId;

        // Add hierarchical container structure
        const stageResult = await createUnifiedNodeUseCase.execute({
          modelId: mainModelId,
          nodeType: 'stage',
          nodeName: 'Orchestration Stage',
          userId: testUserId
        });
        const stageNodeId = stageResult.value.nodeId;

        // Add function model container action (UC-011: Fractal Orchestration)
        const nestedModelResult = await createModelUseCase.execute({
          name: 'Nested Execution Model',
          description: 'Nested model for fractal orchestration test',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const nestedModelId = nestedModelResult.value.modelId;

        const containerActionResult = await addActionUseCase.execute({
          modelId: mainModelId,
          parentNodeId: stageNodeId,
          actionType: 'function_model_container',
          actionName: 'Nested Model Execution',
          configuration: {
            nestedModelId,
            contextMapping: { input: 'parent.input' },
            outputExtraction: { result: 'nested.output' }
          },
          userId: testUserId
        });

        // Add AI agent action (UC-012: AI Agent Orchestration)
        const aiActionResult = await addActionUseCase.execute({
          modelId: mainModelId,
          parentNodeId: stageNodeId,
          actionType: 'ai_agent',
          actionName: 'AI Processing',
          configuration: {
            agentType: 'processing',
            capabilities: ['analysis', 'transformation'],
            resourceRequirements: { gpu: '1x', memory: '4Gi' }
          },
          executionOrder: 2,
          userId: testUserId
        });

        // Act: Execute complex orchestration pipeline
        
        // UC-010: Manage Hierarchical Context Access
        const contextResult = await contextAccessUseCase.execute({
          command: 'registerNode',
          request: {
            modelId: mainModelId,
            nodeId: stageNodeId,
            contextLevel: 'stage',
            accessPermissions: ['read', 'write'],
            userId: testUserId
          }
        });
        expect(contextResult.isSuccess).toBe(true);

        // UC-011: Manage Fractal Orchestration 
        const fractalResult = await fractalOrchestrationUseCase.execute({
          operation: 'configureNestedExecution',
          modelId: mainModelId,
          nestedModelId,
          contextMappings: { input: 'parent.input', config: 'parent.config' },
          userId: testUserId
        });
        expect(fractalResult.isSuccess).toBe(true);

        // UC-012: Manage AI Agent Orchestration
        const aiOrchestrationResult = await aiAgentOrchestrationUseCase.execute({
          operation: 'configureAgent',
          modelId: mainModelId,
          agentId: aiActionResult.value.actionId,
          configuration: {
            executionPolicy: 'parallel',
            resourceLimits: { timeout: 300, maxMemory: '4Gi' }
          },
          userId: testUserId
        });
        expect(aiOrchestrationResult.isSuccess).toBe(true);

        // UC-013: Manage Error Handling and Recovery
        const errorHandlingResult = await errorHandlingUseCase.executeErrorHandlingAndRecovery({
          operation: 'configureRecovery',
          modelId: mainModelId,
          recoveryPolicies: [
            { errorType: 'timeout', action: 'retry', maxAttempts: 3 },
            { errorType: 'resource_limit', action: 'scale_down', fallback: true }
          ],
          userId: testUserId
        });
        expect(errorHandlingResult.isSuccess).toBe(true);

        // Publish and execute the complex pipeline
        await publishModelUseCase.execute({
          modelId: mainModelId,
          userId: testUserId,
          publishNotes: 'Complex execution pipeline ready'
        });

        // UC-005: Execute Function Model (coordinating all orchestration services)
        const executionResult = await executeModelUseCase.execute({
          modelId: mainModelId,
          userId: testUserId,
          executionMode: 'parallel',
          inputData: { 
            complexInput: 'E2E orchestration test',
            nestedParameters: { analysis: true, transform: true }
          }
        });

        // Assert: Complex execution should succeed with all coordinated services
        expect(executionResult.isSuccess).toBe(true);
        expect(executionResult.value.status).toBe('completed');
        expect(executionResult.value.results).toBeDefined();

        // Verify orchestration events were published
        const events = mockEventBus.getAllEvents();
        expect(events.some(e => e.eventType === 'FractalOrchestrationConfigured')).toBe(true);
        expect(events.some(e => e.eventType === 'AIAgentOrchestrationConfigured')).toBe(true);
        expect(events.some(e => e.eventType === 'ErrorHandlingConfigured')).toBe(true);
        expect(events.some(e => e.eventType === 'ComplexExecutionCompleted')).toBe(true);

        // Verify audit trail shows coordination
        const auditLogs = await mockAuditRepository.findByModelId(mainModelId);
        const orchestrationLogs = auditLogs.value.filter(log => 
          log.action.includes('ORCHESTRATION') || log.action.includes('COORDINATION')
        );
        expect(orchestrationLogs.length).toBeGreaterThan(0);
      });

      it('should_HandleCascadingFailures_InComplexPipeline', async () => {
        // Arrange: Create complex pipeline with intentional failure point
        const modelResult = await createModelUseCase.execute({
          name: 'Failure Recovery Pipeline',
          description: 'E2E test of error handling in complex execution',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const modelId = modelResult.value.modelId;

        // Add container with failing action
        const containerResult = await createUnifiedNodeUseCase.execute({
          modelId,
          nodeType: 'stage',
          nodeName: 'Failure Test Stage',
          userId: testUserId
        });

        const failingActionResult = await addActionUseCase.execute({
          modelId,
          parentNodeId: containerResult.value.nodeId,
          actionType: 'tether',
          actionName: 'Intentionally Failing Action',
          configuration: {
            simulateFailure: true,
            failureType: 'timeout'
          },
          userId: testUserId
        });

        // Configure error handling
        const errorHandlingResult = await errorHandlingUseCase.executeErrorHandlingAndRecovery({
          operation: 'configureRecovery',
          modelId,
          recoveryPolicies: [
            { errorType: 'timeout', action: 'retry', maxAttempts: 2 },
            { errorType: 'cascade_failure', action: 'graceful_shutdown', notification: true }
          ],
          userId: testUserId
        });
        expect(errorHandlingResult.isSuccess).toBe(true);

        await publishModelUseCase.execute({
          modelId,
          userId: testUserId,
          publishNotes: 'Failure recovery test ready'
        });

        // Act: Execute pipeline that should fail and recover
        const executionResult = await executeModelUseCase.execute({
          modelId,
          userId: testUserId,
          executionMode: 'sequential',
          inputData: { triggerFailure: true }
        });

        // Assert: Execution should handle failure gracefully
        expect(executionResult.isSuccess).toBe(true); // Overall success due to recovery
        expect(executionResult.value.status).toBe('completed_with_recovery');
        expect(executionResult.value.recoveryInfo).toBeDefined();

        // Verify error handling events
        const errorEvents = mockEventBus.getEventsByType('ErrorHandlingTriggered');
        expect(errorEvents.length).toBeGreaterThan(0);
        expect(errorEvents[0].eventData.errorType).toBe('timeout');
        expect(errorEvents[0].eventData.recoveryAction).toBe('retry');

        // Verify recovery audit logs
        const auditLogs = await mockAuditRepository.findByModelId(modelId);
        const recoveryLogs = auditLogs.value.filter(log => 
          log.action.includes('RECOVERY') || log.action.includes('ERROR_HANDLING')
        );
        expect(recoveryLogs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('AI Agent Workflow: UC-017→UC-018→UC-019', () => {
    describe('AIAgentLifecycle_E2E', () => {
      it('should_ExecuteCompleteAIAgentWorkflow_WithRegistrationDiscoveryExecution', async () => {
        // Arrange: Create model for AI agent workflow
        const modelResult = await createModelUseCase.execute({
          name: 'AI Agent Workflow Model',
          description: 'E2E test of complete AI agent lifecycle',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const modelId = modelResult.value.modelId;

        // Add container for AI agent
        const containerResult = await createUnifiedNodeUseCase.execute({
          modelId,
          nodeType: 'stage',
          nodeName: 'AI Processing Stage',
          userId: testUserId
        });
        const stageNodeId = containerResult.value.nodeId;

        // UC-017: Register AI Agent
        const agentRegistrationResult = await aiAgentOrchestrationUseCase.execute({
          operation: 'registerAgent',
          modelId,
          agentDefinition: {
            agentId: getTestUUID('ai-agent-test'),
            name: 'E2E Test Agent',
            capabilities: ['text_analysis', 'data_transformation', 'pattern_recognition'],
            version: '1.0.0',
            resourceRequirements: {
              cpu: '2000m',
              memory: '4Gi',
              gpu: '1x'
            },
            executionPolicy: {
              timeout: 600,
              retryPolicy: { maxAttempts: 3, backoffMs: 1000 }
            }
          },
          userId: testUserId
        });

        expect(agentRegistrationResult.isSuccess).toBe(true);
        expect(agentRegistrationResult.value.agentId).toBeDefined();
        const registeredAgentId = agentRegistrationResult.value.agentId;

        // UC-018: Discover AI Agent Capabilities
        const agentDiscoveryResult = await aiAgentOrchestrationUseCase.execute({
          operation: 'discoverCapabilities',
          modelId,
          discoveryQuery: {
            requiredCapabilities: ['text_analysis', 'data_transformation'],
            resourceConstraints: { maxMemory: '8Gi', maxTimeout: 900 },
            compatibilityLevel: 'high'
          },
          userId: testUserId
        });

        expect(agentDiscoveryResult.isSuccess).toBe(true);
        expect(agentDiscoveryResult.value.discoveredAgents).toHaveLength(1);
        expect(agentDiscoveryResult.value.discoveredAgents[0].agentId).toBe(registeredAgentId);
        expect(agentDiscoveryResult.value.discoveredAgents[0].compatibilityScore).toBeGreaterThan(0.8);

        // Add AI agent action to model
        const aiActionResult = await addActionUseCase.execute({
          modelId,
          parentNodeId: stageNodeId,
          actionType: 'ai_agent',
          actionName: 'E2E AI Agent Action',
          configuration: {
            agentId: registeredAgentId,
            taskDefinition: {
              operation: 'analyze_and_transform',
              inputSchema: { text: 'string', parameters: 'object' },
              outputSchema: { analysis: 'object', transformed: 'string' }
            },
            executionParameters: {
              analysisDepth: 'detailed',
              transformationType: 'structured'
            }
          },
          userId: testUserId
        });

        expect(aiActionResult.isSuccess).toBe(true);
        const aiActionId = aiActionResult.value.actionId;

        // Publish model
        await publishModelUseCase.execute({
          modelId,
          userId: testUserId,
          publishNotes: 'AI agent workflow ready for execution'
        });

        // UC-019: Execute AI Agent Task
        const executionResult = await executeModelUseCase.execute({
          modelId,
          userId: testUserId,
          executionMode: 'sequential',
          inputData: {
            text: 'E2E test data for AI agent processing',
            parameters: {
              analysisType: 'comprehensive',
              outputFormat: 'structured_json'
            }
          }
        });

        // Assert: Complete AI agent workflow should succeed
        expect(executionResult.isSuccess).toBe(true);
        expect(executionResult.value.status).toBe('completed');
        expect(executionResult.value.results).toBeDefined();
        expect(executionResult.value.results.aiAgentResults).toBeDefined();

        // Verify AI agent workflow events
        const events = mockEventBus.getAllEvents();
        expect(events.some(e => e.eventType === 'AIAgentRegistered')).toBe(true);
        expect(events.some(e => e.eventType === 'AIAgentCapabilitiesDiscovered')).toBe(true);
        expect(events.some(e => e.eventType === 'AIAgentTaskExecuted')).toBe(true);

        // Verify agent registration is persistent
        const rediscoveryResult = await aiAgentOrchestrationUseCase.execute({
          operation: 'discoverCapabilities',
          modelId,
          discoveryQuery: { requiredCapabilities: ['text_analysis'] },
          userId: testUserId
        });
        
        expect(rediscoveryResult.isSuccess).toBe(true);
        expect(rediscoveryResult.value.discoveredAgents).toHaveLength(1);

        // Verify audit trail for complete AI workflow
        const auditLogs = await mockAuditRepository.findByModelId(modelId);
        const aiWorkflowLogs = auditLogs.value.filter(log => 
          log.action.includes('AI_AGENT') || log.action.includes('AGENT')
        );
        expect(aiWorkflowLogs.length).toBeGreaterThan(2); // Registration, Discovery, Execution
      });

      it('should_HandleAgentFailures_WithGracefulDegradation', async () => {
        // Arrange: Create AI agent workflow with fallback scenarios
        const modelResult = await createModelUseCase.execute({
          name: 'AI Agent Resilience Model',
          description: 'E2E test of AI agent failure handling',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const modelId = modelResult.value.modelId;

        // Register unreliable AI agent
        const unreliableAgentResult = await aiAgentOrchestrationUseCase.execute({
          operation: 'registerAgent',
          modelId,
          agentDefinition: {
            agentId: getTestUUID('unreliable-agent'),
            name: 'Unreliable Test Agent',
            capabilities: ['analysis'],
            version: '0.9.0',
            reliability: 0.3, // Simulate low reliability
            resourceRequirements: { cpu: '1000m', memory: '2Gi' }
          },
          userId: testUserId
        });

        // Register reliable fallback agent
        const fallbackAgentResult = await aiAgentOrchestrationUseCase.execute({
          operation: 'registerAgent',
          modelId,
          agentDefinition: {
            agentId: getTestUUID('fallback-agent'),
            name: 'Fallback Test Agent',
            capabilities: ['analysis', 'basic_processing'],
            version: '2.0.0',
            reliability: 0.95,
            resourceRequirements: { cpu: '500m', memory: '1Gi' }
          },
          userId: testUserId
        });

        // Configure error handling with agent fallback
        const errorHandlingResult = await errorHandlingUseCase.executeErrorHandlingAndRecovery({
          operation: 'configureRecovery',
          modelId,
          recoveryPolicies: [
            { 
              errorType: 'agent_failure', 
              action: 'fallback_agent', 
              fallbackAgentId: fallbackAgentResult.value.agentId 
            },
            { 
              errorType: 'agent_unavailable', 
              action: 'degrade_gracefully', 
              notification: true 
            }
          ],
          userId: testUserId
        });

        expect(errorHandlingResult.isSuccess).toBe(true);

        // Act: Execute with agent failure simulation
        const containerResult = await createUnifiedNodeUseCase.execute({
          modelId, nodeType: 'stage', nodeName: 'Resilience Test', userId: testUserId
        });

        await addActionUseCase.execute({
          modelId,
          parentNodeId: containerResult.value.nodeId,
          actionType: 'ai_agent',
          actionName: 'Primary AI Action',
          configuration: {
            agentId: unreliableAgentResult.value.agentId,
            simulateFailure: true
          },
          userId: testUserId
        });

        await publishModelUseCase.execute({
          modelId, userId: testUserId, publishNotes: 'Resilience test ready'
        });

        const executionResult = await executeModelUseCase.execute({
          modelId,
          userId: testUserId,
          executionMode: 'sequential',
          inputData: { test: 'resilience_data' }
        });

        // Assert: Execution should succeed via fallback
        expect(executionResult.isSuccess).toBe(true);
        expect(executionResult.value.status).toBe('completed_with_fallback');
        expect(executionResult.value.fallbackInfo).toBeDefined();
        expect(executionResult.value.fallbackInfo.usedAgent).toBe(fallbackAgentResult.value.agentId);

        // Verify fallback events
        const fallbackEvents = mockEventBus.getEventsByType('AIAgentFallbackTriggered');
        expect(fallbackEvents.length).toBe(1);
        expect(fallbackEvents[0].eventData.originalAgent).toBe(unreliableAgentResult.value.agentId);
        expect(fallbackEvents[0].eventData.fallbackAgent).toBe(fallbackAgentResult.value.agentId);
      });
    });
  });

  describe('Cross-Feature Integration: UC-014→UC-015, UC-003→UC-014, UC-005→UC-019', () => {
    describe('CrossFeatureLinking_E2E', () => {
      it('should_IntegrateAcrossFeaturesWithLinkStrengthCalculation', async () => {
        // Arrange: Create models for cross-feature integration
        const primaryModelResult = await createModelUseCase.execute({
          name: 'Primary Integration Model',
          description: 'Primary model for cross-feature integration test',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const primaryModelId = primaryModelResult.value.modelId;

        const secondaryModelResult = await createModelUseCase.execute({
          name: 'Secondary Integration Model',
          description: 'Secondary model for cross-feature integration test',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const secondaryModelId = secondaryModelResult.value.modelId;

        // Set up primary model structure
        const primaryStageResult = await createUnifiedNodeUseCase.execute({
          modelId: primaryModelId,
          nodeType: 'stage',
          nodeName: 'Cross-Feature Integration Stage',
          userId: testUserId
        });
        const primaryStageId = primaryStageResult.value.nodeId;

        // Set up secondary model structure
        const secondaryStageResult = await createUnifiedNodeUseCase.execute({
          modelId: secondaryModelId,
          nodeType: 'stage',
          nodeName: 'Referenced Integration Stage',
          userId: testUserId
        });
        const secondaryStageId = secondaryStageResult.value.nodeId;

        // UC-014: Create Cross-Feature Link (via UC-003 adding cross-feature action)
        const crossFeatureLinkResult = await crossFeatureIntegrationUseCase.execute({
          operation: 'createCrossFeatureLink',
          sourceModelId: primaryModelId,
          sourceNodeId: primaryStageId,
          targetModelId: secondaryModelId,
          targetNodeId: secondaryStageId,
          linkType: 'data_dependency',
          linkMetadata: {
            dataContract: { input: 'primaryOutput', output: 'secondaryInput' },
            executionOrder: 'sequential',
            errorPropagation: 'cascade'
          },
          userId: testUserId
        });

        expect(crossFeatureLinkResult.isSuccess).toBe(true);
        expect(crossFeatureLinkResult.value.linkId).toBeDefined();
        const linkId = crossFeatureLinkResult.value.linkId;

        // UC-003→UC-014: Add cross-feature action node that uses the link
        const crossFeatureActionResult = await addActionUseCase.execute({
          modelId: primaryModelId,
          parentNodeId: primaryStageId,
          actionType: 'cross_feature_reference',
          actionName: 'Reference Secondary Model',
          configuration: {
            crossFeatureLinkId: linkId,
            targetModelId: secondaryModelId,
            targetNodeId: secondaryStageId,
            dataMapping: { primaryData: 'secondaryInput' },
            executionTrigger: 'after_primary_completion'
          },
          userId: testUserId
        });

        expect(crossFeatureActionResult.isSuccess).toBe(true);

        // UC-015: Calculate Link Strength
        const linkStrengthResult = await crossFeatureIntegrationUseCase.execute({
          operation: 'calculateLinkStrength',
          linkId,
          calculationMetrics: {
            dataFlowComplexity: true,
            executionFrequency: true,
            errorCorrelation: true,
            performanceImpact: true
          },
          userId: testUserId
        });

        expect(linkStrengthResult.isSuccess).toBe(true);
        expect(linkStrengthResult.value.linkStrength).toBeGreaterThan(0);
        expect(linkStrengthResult.value.linkStrength).toBeLessThanOrEqual(1);
        expect(linkStrengthResult.value.strengthFactors).toBeDefined();

        // Publish both models
        await publishModelUseCase.execute({
          modelId: primaryModelId,
          userId: testUserId,
          publishNotes: 'Primary model with cross-feature integration'
        });

        await publishModelUseCase.execute({
          modelId: secondaryModelId,
          userId: testUserId,
          publishNotes: 'Secondary model for cross-feature integration'
        });

        // UC-005→UC-019: Execute with cross-feature coordination
        const executionResult = await executeModelUseCase.execute({
          modelId: primaryModelId,
          userId: testUserId,
          executionMode: 'sequential',
          inputData: { crossFeatureTest: 'integration_data' },
          executionOptions: {
            enableCrossFeatureExecution: true,
            crossFeatureLinkIds: [linkId]
          }
        });

        // Assert: Cross-feature execution should succeed
        expect(executionResult.isSuccess).toBe(true);
        expect(executionResult.value.status).toBe('completed');
        expect(executionResult.value.crossFeatureResults).toBeDefined();
        expect(executionResult.value.crossFeatureResults.length).toBe(1);
        expect(executionResult.value.crossFeatureResults[0].linkId).toBe(linkId);

        // Verify cross-feature integration events
        const events = mockEventBus.getAllEvents();
        expect(events.some(e => e.eventType === 'CrossFeatureLinkCreated')).toBe(true);
        expect(events.some(e => e.eventType === 'LinkStrengthCalculated')).toBe(true);
        expect(events.some(e => e.eventType === 'CrossFeatureExecutionCompleted')).toBe(true);

        // Verify link strength was calculated correctly
        const strengthEvents = mockEventBus.getEventsByType('LinkStrengthCalculated');
        expect(strengthEvents.length).toBe(1);
        expect(strengthEvents[0].eventData.linkId).toBe(linkId);
        expect(strengthEvents[0].eventData.strength).toBe(linkStrengthResult.value.linkStrength);

        // Verify audit trail shows cross-feature coordination
        const auditLogs = await mockAuditRepository.findByModelId(primaryModelId);
        const crossFeatureLogs = auditLogs.value.filter(log => 
          log.action.includes('CROSS_FEATURE') || log.action.includes('LINK')
        );
        expect(crossFeatureLogs.length).toBeGreaterThan(2); // Link creation, strength calc, execution
      });

      it('should_PropagateErrorsAcrossCrossFeatureLinks', async () => {
        // Arrange: Set up cross-feature models with error propagation
        const sourceModelResult = await createModelUseCase.execute({
          name: 'Source Error Model',
          description: 'Source model for error propagation test',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const sourceModelId = sourceModelResult.value.modelId;

        const targetModelResult = await createModelUseCase.execute({
          name: 'Target Error Model',
          description: 'Target model that will receive propagated errors',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const targetModelId = targetModelResult.value.modelId;

        // Create containers
        const sourceStageResult = await createUnifiedNodeUseCase.execute({
          modelId: sourceModelId,
          nodeType: 'stage',
          nodeName: 'Error Source Stage',
          userId: testUserId
        });

        const targetStageResult = await createUnifiedNodeUseCase.execute({
          modelId: targetModelId,
          nodeType: 'stage',
          nodeName: 'Error Target Stage',
          userId: testUserId
        });

        // Create cross-feature link with error propagation
        const linkResult = await crossFeatureIntegrationUseCase.execute({
          operation: 'createCrossFeatureLink',
          sourceModelId: sourceModelId,
          sourceNodeId: sourceStageResult.value.nodeId,
          targetModelId: targetModelId,
          targetNodeId: targetStageResult.value.nodeId,
          linkType: 'error_dependency',
          linkMetadata: {
            errorPropagation: 'immediate',
            propagationLevel: 'cascade',
            errorTransformation: { sourceError: 'targetError' }
          },
          userId: testUserId
        });

        // Add failing action to source
        await addActionUseCase.execute({
          modelId: sourceModelId,
          parentNodeId: sourceStageResult.value.nodeId,
          actionType: 'tether',
          actionName: 'Failing Action',
          configuration: { simulateFailure: true, failureType: 'critical' },
          userId: testUserId
        });

        // Add cross-feature reference action
        await addActionUseCase.execute({
          modelId: sourceModelId,
          parentNodeId: sourceStageResult.value.nodeId,
          actionType: 'cross_feature_reference',
          actionName: 'Cross-Feature Error Propagation',
          configuration: {
            crossFeatureLinkId: linkResult.value.linkId,
            targetModelId: targetModelId,
            errorHandling: 'propagate'
          },
          userId: testUserId
        });

        // Configure error handling for propagation
        await errorHandlingUseCase.executeErrorHandlingAndRecovery({
          operation: 'configureRecovery',
          modelId: sourceModelId,
          recoveryPolicies: [
            { 
              errorType: 'critical', 
              action: 'propagate_cross_feature',
              targetLinkId: linkResult.value.linkId
            }
          ],
          userId: testUserId
        });

        // Publish models
        await publishModelUseCase.execute({
          modelId: sourceModelId,
          userId: testUserId,
          publishNotes: 'Source model with error propagation'
        });

        await publishModelUseCase.execute({
          modelId: targetModelId,
          userId: testUserId,
          publishNotes: 'Target model for error propagation'
        });

        // Act: Execute source model with failure
        const executionResult = await executeModelUseCase.execute({
          modelId: sourceModelId,
          userId: testUserId,
          executionMode: 'sequential',
          inputData: { triggerFailure: true },
          executionOptions: {
            enableCrossFeatureExecution: true,
            propagateErrors: true
          }
        });

        // Assert: Execution should handle error propagation
        expect(executionResult.isSuccess).toBe(true); // Success due to error handling
        expect(executionResult.value.status).toBe('failed_with_propagation');
        expect(executionResult.value.errorPropagationInfo).toBeDefined();
        expect(executionResult.value.errorPropagationInfo.targetModelId).toBe(targetModelId);

        // Verify error propagation events
        const errorEvents = mockEventBus.getEventsByType('CrossFeatureErrorPropagated');
        expect(errorEvents.length).toBe(1);
        expect(errorEvents[0].eventData.sourceModelId).toBe(sourceModelId);
        expect(errorEvents[0].eventData.targetModelId).toBe(targetModelId);
        expect(errorEvents[0].eventData.errorType).toBe('critical');

        // Verify audit trail shows error propagation
        const sourceAuditLogs = await mockAuditRepository.findByModelId(sourceModelId);
        const propagationLogs = sourceAuditLogs.value.filter(log => 
          log.action.includes('ERROR_PROPAGATION')
        );
        expect(propagationLogs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Recovery Across Dependency Boundaries', () => {
    describe('SystemWideRecovery_E2E', () => {
      it('should_RecoverFromComplexFailureScenarios_AcrossMultipleLayers', async () => {
        // Arrange: Create complex multi-layer system for recovery testing
        const orchestratorModelResult = await createModelUseCase.execute({
          name: 'System Recovery Orchestrator',
          description: 'Top-level model for system-wide recovery testing',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const orchestratorModelId = orchestratorModelResult.value.modelId;

        const serviceModelResult = await createModelUseCase.execute({
          name: 'Service Layer Model',
          description: 'Service layer for recovery testing',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const serviceModelId = serviceModelResult.value.modelId;

        const dataModelResult = await createModelUseCase.execute({
          name: 'Data Layer Model',
          description: 'Data layer for recovery testing',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const dataModelId = dataModelResult.value.modelId;

        // Set up orchestrator layer
        const orchestratorStageResult = await createUnifiedNodeUseCase.execute({
          modelId: orchestratorModelId,
          nodeType: 'stage',
          nodeName: 'System Orchestration Stage',
          userId: testUserId
        });

        // Add nested model references with failure points
        const serviceReferenceResult = await addActionUseCase.execute({
          modelId: orchestratorModelId,
          parentNodeId: orchestratorStageResult.value.nodeId,
          actionType: 'function_model_container',
          actionName: 'Service Layer Reference',
          configuration: {
            nestedModelId: serviceModelId,
            contextMapping: { systemInput: 'serviceInput' },
            simulateFailure: true, // Simulate service layer failure
            failureType: 'resource_exhaustion'
          },
          userId: testUserId
        });

        const dataReferenceResult = await addActionUseCase.execute({
          modelId: orchestratorModelId,
          parentNodeId: orchestratorStageResult.value.nodeId,
          actionType: 'function_model_container',
          actionName: 'Data Layer Reference',
          configuration: {
            nestedModelId: dataModelId,
            contextMapping: { serviceOutput: 'dataInput' },
            dependsOn: serviceReferenceResult.value.actionId
          },
          executionOrder: 2,
          userId: testUserId
        });

        // Configure multi-layer recovery strategies
        const systemWideRecoveryResult = await errorHandlingUseCase.executeErrorHandlingAndRecovery({
          operation: 'configureRecovery',
          modelId: orchestratorModelId,
          recoveryPolicies: [
            {
              errorType: 'resource_exhaustion',
              action: 'scale_down_and_retry',
              layerImpact: 'service',
              cascadePrevention: true,
              maxRecoveryAttempts: 3
            },
            {
              errorType: 'cascade_failure',
              action: 'isolate_and_continue',
              isolationScope: 'service_layer',
              continuationStrategy: 'degrade_gracefully'
            },
            {
              errorType: 'system_critical',
              action: 'emergency_shutdown',
              notificationLevel: 'urgent',
              rollbackScope: 'full_system'
            }
          ],
          userId: testUserId
        });

        expect(systemWideRecoveryResult.isSuccess).toBe(true);

        // Publish all models
        await publishModelUseCase.execute({
          modelId: orchestratorModelId,
          userId: testUserId,
          publishNotes: 'System orchestrator ready'
        });

        await publishModelUseCase.execute({
          modelId: serviceModelId,
          userId: testUserId,
          publishNotes: 'Service layer ready'
        });

        await publishModelUseCase.execute({
          modelId: dataModelId,
          userId: testUserId,
          publishNotes: 'Data layer ready'
        });

        // Act: Execute system with cascading failure scenario
        const systemExecutionResult = await executeModelUseCase.execute({
          modelId: orchestratorModelId,
          userId: testUserId,
          executionMode: 'sequential',
          inputData: { 
            systemLoad: 'high',
            simulateResourceExhaustion: true
          },
          executionOptions: {
            enableSystemWideRecovery: true,
            recoveryScope: 'cross_layer'
          }
        });

        // Assert: System should recover from multi-layer failures
        expect(systemExecutionResult.isSuccess).toBe(true);
        expect(systemExecutionResult.value.status).toBe('completed_with_system_recovery');
        expect(systemExecutionResult.value.recoveryInfo).toBeDefined();
        expect(systemExecutionResult.value.recoveryInfo.layersAffected).toContain('service');
        expect(systemExecutionResult.value.recoveryInfo.recoveryStrategiesUsed).toContain('scale_down_and_retry');

        // Verify system-wide recovery events
        const recoveryEvents = mockEventBus.getEventsByType('SystemWideRecoveryTriggered');
        expect(recoveryEvents.length).toBe(1);
        expect(recoveryEvents[0].eventData.orchestratorModelId).toBe(orchestratorModelId);
        expect(recoveryEvents[0].eventData.affectedLayers).toEqual(['service', 'orchestrator']);

        // Verify recovery isolation prevented cascade
        const isolationEvents = mockEventBus.getEventsByType('LayerIsolationActivated');
        expect(isolationEvents.length).toBe(1);
        expect(isolationEvents[0].eventData.isolatedLayer).toBe('service_layer');
        expect(isolationEvents[0].eventData.cascadePrevented).toBe(true);

        // Verify audit trail shows complete recovery process
        const auditLogs = await mockAuditRepository.findByModelId(orchestratorModelId);
        const systemRecoveryLogs = auditLogs.value.filter(log => 
          log.action.includes('SYSTEM_RECOVERY') || log.action.includes('LAYER_ISOLATION')
        );
        expect(systemRecoveryLogs.length).toBeGreaterThan(2);

        // Verify system state consistency after recovery
        const postRecoveryModel = await mockRepository.findById(orchestratorModelId);
        expect(postRecoveryModel.isSuccess).toBe(true);
        expect(postRecoveryModel.value.status).toBe(ModelStatus.PUBLISHED); // Still published after recovery
      });
    });
  });

  describe('All Application Services Integration', () => {
    describe('CompleteSystemIntegration_E2E', () => {
      it('should_CoordinateAllApplicationServices_InComplexWorkflow', async () => {
        // Arrange: Create comprehensive system workflow using all services
        const masterWorkflowResult = await createModelUseCase.execute({
          name: 'Complete System Integration Workflow',
          description: 'E2E test of all application services working together',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const masterWorkflowId = masterWorkflowResult.value.modelId;

        // Create supporting models for comprehensive integration
        const aiProcessingModelResult = await createModelUseCase.execute({
          name: 'AI Processing Subworkflow',
          description: 'AI processing subworkflow',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const aiProcessingModelId = aiProcessingModelResult.value.modelId;

        const dataAnalyticsModelResult = await createModelUseCase.execute({
          name: 'Data Analytics Subworkflow', 
          description: 'Data analytics subworkflow',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const dataAnalyticsModelId = dataAnalyticsModelResult.value.modelId;

        // Build comprehensive workflow structure
        
        // Input/Output Layer
        const inputStageResult = await createUnifiedNodeUseCase.execute({
          modelId: masterWorkflowId,
          nodeType: 'stage',
          nodeName: 'System Input Processing',
          userId: testUserId
        });

        const processingStageResult = await createUnifiedNodeUseCase.execute({
          modelId: masterWorkflowId,
          nodeType: 'stage', 
          nodeName: 'Core Processing Orchestration',
          userId: testUserId
        });

        const outputStageResult = await createUnifiedNodeUseCase.execute({
          modelId: masterWorkflowId,
          nodeType: 'stage',
          nodeName: 'System Output Generation',
          userId: testUserId
        });

        // Register AI Agents for processing
        const primaryAIAgentResult = await aiAgentOrchestrationUseCase.execute({
          operation: 'registerAgent',
          modelId: masterWorkflowId,
          agentDefinition: {
            agentId: getTestUUID('primary-ai-agent'),
            name: 'Primary AI Processing Agent',
            capabilities: ['data_analysis', 'pattern_recognition', 'decision_making'],
            version: '2.1.0',
            resourceRequirements: { cpu: '4000m', memory: '8Gi', gpu: '2x' }
          },
          userId: testUserId
        });

        const analyticsAIAgentResult = await aiAgentOrchestrationUseCase.execute({
          operation: 'registerAgent',
          modelId: masterWorkflowId,
          agentDefinition: {
            agentId: getTestUUID('analytics-ai-agent'),
            name: 'Analytics AI Agent',
            capabilities: ['statistical_analysis', 'predictive_modeling', 'visualization'],
            version: '1.8.0',
            resourceRequirements: { cpu: '2000m', memory: '6Gi' }
          },
          userId: testUserId
        });

        // Configure hierarchical context access
        const contextHierarchyResult = await contextAccessUseCase.execute({
          command: 'registerNode',
          request: {
            modelId: masterWorkflowId,
            nodeId: processingStageResult.value.nodeId,
            contextLevel: 'orchestration',
            parentContexts: [inputStageResult.value.nodeId],
            childContexts: [outputStageResult.value.nodeId],
            accessPermissions: ['read', 'write', 'execute', 'coordinate'],
            contextData: {
              globalConfiguration: { systemMode: 'comprehensive' },
              sharedResources: { computePool: 'high-performance' }
            },
            userId: testUserId
          }
        });
        expect(contextHierarchyResult.isSuccess).toBe(true);

        // Set up fractal orchestration
        const fractalConfigResult = await fractalOrchestrationUseCase.execute({
          operation: 'configureNestedExecution',
          modelId: masterWorkflowId,
          nestedConfigurations: [
            {
              nestedModelId: aiProcessingModelId,
              contextMappings: { 
                systemInput: 'aiInput',
                configuration: 'aiConfig' 
              },
              resourceAllocation: { priority: 'high', isolation: 'dedicated' }
            },
            {
              nestedModelId: dataAnalyticsModelId,
              contextMappings: { 
                aiOutput: 'analyticsInput',
                systemConfig: 'analyticsConfig' 
              },
              resourceAllocation: { priority: 'medium', isolation: 'shared' }
            }
          ],
          userId: testUserId
        });
        expect(fractalConfigResult.isSuccess).toBe(true);

        // Create comprehensive action orchestration
        
        // Input processing actions
        const inputValidationActionResult = await addActionUseCase.execute({
          modelId: masterWorkflowId,
          parentNodeId: inputStageResult.value.nodeId,
          actionType: 'tether',
          actionName: 'Input Validation and Preprocessing',
          configuration: {
            validationRules: ['schema_validation', 'data_quality_check'],
            preprocessing: ['normalization', 'feature_extraction']
          },
          executionOrder: 1,
          userId: testUserId
        });

        // AI processing actions
        const primaryAIActionResult = await addActionUseCase.execute({
          modelId: masterWorkflowId,
          parentNodeId: processingStageResult.value.nodeId,
          actionType: 'ai_agent',
          actionName: 'Primary AI Processing',
          configuration: {
            agentId: primaryAIAgentResult.value.agentId,
            taskDefinition: {
              operation: 'comprehensive_analysis',
              inputSchema: { data: 'object', parameters: 'object' },
              outputSchema: { analysis: 'object', insights: 'array', confidence: 'number' }
            }
          },
          executionOrder: 1,
          userId: testUserId
        });

        const nestedAIModelActionResult = await addActionUseCase.execute({
          modelId: masterWorkflowId,
          parentNodeId: processingStageResult.value.nodeId,
          actionType: 'function_model_container',
          actionName: 'Nested AI Processing Workflow',
          configuration: {
            nestedModelId: aiProcessingModelId,
            contextMapping: { primaryAnalysis: 'nestedInput' },
            outputExtraction: { nestedResults: 'primaryResults' }
          },
          executionOrder: 2,
          userId: testUserId
        });

        // Analytics processing actions
        const analyticsActionResult = await addActionUseCase.execute({
          modelId: masterWorkflowId,
          parentNodeId: processingStageResult.value.nodeId,
          actionType: 'ai_agent',
          actionName: 'Analytics AI Processing',
          configuration: {
            agentId: analyticsAIAgentResult.value.agentId,
            taskDefinition: {
              operation: 'predictive_analytics',
              inputSchema: { insights: 'array', historicalData: 'object' },
              outputSchema: { predictions: 'array', models: 'object', metrics: 'object' }
            }
          },
          executionOrder: 3,
          userId: testUserId
        });

        const nestedAnalyticsActionResult = await addActionUseCase.execute({
          modelId: masterWorkflowId,
          parentNodeId: processingStageResult.value.nodeId,
          actionType: 'function_model_container',
          actionName: 'Nested Analytics Workflow',
          configuration: {
            nestedModelId: dataAnalyticsModelId,
            contextMapping: { analyticsOutput: 'analyticsNestedInput' },
            outputExtraction: { finalAnalytics: 'analyticsResults' }
          },
          executionOrder: 4,
          userId: testUserId
        });

        // Output generation actions
        const outputGenerationActionResult = await addActionUseCase.execute({
          modelId: masterWorkflowId,
          parentNodeId: outputStageResult.value.nodeId,
          actionType: 'tether',
          actionName: 'Comprehensive Output Generation',
          configuration: {
            outputFormats: ['json', 'visualization', 'report'],
            aggregation: 'comprehensive',
            qualityAssurance: 'automated_validation'
          },
          executionOrder: 1,
          userId: testUserId
        });

        // Configure comprehensive error handling and recovery
        const systemErrorHandlingResult = await errorHandlingUseCase.executeErrorHandlingAndRecovery({
          operation: 'configureRecovery',
          modelId: masterWorkflowId,
          recoveryPolicies: [
            {
              errorType: 'ai_agent_failure',
              action: 'fallback_agent',
              scope: 'action_level',
              maxRetries: 2
            },
            {
              errorType: 'nested_model_failure', 
              action: 'isolate_and_continue',
              scope: 'stage_level',
              degradation: 'graceful'
            },
            {
              errorType: 'context_access_failure',
              action: 'reset_context_hierarchy',
              scope: 'model_level',
              notification: 'immediate'
            },
            {
              errorType: 'resource_exhaustion',
              action: 'dynamic_scaling',
              scope: 'system_level',
              scalingPolicy: 'elastic'
            }
          ],
          userId: testUserId
        });
        expect(systemErrorHandlingResult.isSuccess).toBe(true);

        // Configure action node orchestration for complex coordination
        const actionOrchestrationResult = await actionOrchestrationUseCase.execute({
          operation: 'configureOrchestration',
          modelId: masterWorkflowId,
          orchestrationRules: {
            executionStrategy: 'adaptive_parallel',
            dependencyResolution: 'intelligent',
            resourceOptimization: 'dynamic',
            performanceTargets: {
              maxLatency: 300000, // 5 minutes
              minThroughput: 100,
              targetReliability: 0.99
            }
          },
          userId: testUserId
        });
        expect(actionOrchestrationResult.isSuccess).toBe(true);

        // Publish the comprehensive workflow
        const publishResult = await publishModelUseCase.execute({
          modelId: masterWorkflowId,
          userId: testUserId,
          publishNotes: 'Complete system integration workflow ready for comprehensive execution',
          enforceValidation: true
        });
        expect(publishResult.isSuccess).toBe(true);

        // Create version for workflow tracking
        const versionResult = await createVersionUseCase.execute({
          modelId: masterWorkflowId,
          userId: testUserId,
          versionType: 'major',
          versionNotes: 'Complete system integration milestone version'
        });
        expect(versionResult.isSuccess).toBe(true);

        // Act: Execute the complete system integration workflow
        const comprehensiveExecutionResult = await executeModelUseCase.execute({
          modelId: masterWorkflowId,
          userId: testUserId,
          executionMode: 'adaptive_parallel',
          inputData: {
            systemData: {
              volume: 'large',
              complexity: 'high',
              priority: 'critical'
            },
            processingParameters: {
              aiAnalysisDepth: 'comprehensive',
              analyticsScope: 'predictive',
              outputQuality: 'enterprise_grade'
            },
            resourceConstraints: {
              maxExecutionTime: 600000, // 10 minutes
              preferredResourceTier: 'premium'
            }
          },
          executionOptions: {
            enableAllServices: true,
            systemIntegrationMode: true,
            comprehensiveMonitoring: true
          }
        });

        // Assert: Comprehensive system execution should succeed with all services coordinated
        expect(comprehensiveExecutionResult.isSuccess).toBe(true);
        expect(comprehensiveExecutionResult.value.status).toBe('completed');
        expect(comprehensiveExecutionResult.value.results).toBeDefined();

        // Verify all major subsystems executed successfully
        expect(comprehensiveExecutionResult.value.results.inputProcessingResults).toBeDefined();
        expect(comprehensiveExecutionResult.value.results.aiProcessingResults).toBeDefined();
        expect(comprehensiveExecutionResult.value.results.analyticsResults).toBeDefined();
        expect(comprehensiveExecutionResult.value.results.nestedExecutionResults).toBeDefined();
        expect(comprehensiveExecutionResult.value.results.outputGenerationResults).toBeDefined();

        // Verify system integration metrics
        expect(comprehensiveExecutionResult.value.systemMetrics).toBeDefined();
        expect(comprehensiveExecutionResult.value.systemMetrics.totalServices).toBe(6); // All major services
        expect(comprehensiveExecutionResult.value.systemMetrics.successfulIntegrations).toBe(6);
        expect(comprehensiveExecutionResult.value.systemMetrics.overallReliability).toBeGreaterThan(0.95);

        // Verify comprehensive event publishing
        const allEvents = mockEventBus.getAllEvents();
        const systemIntegrationEvents = [
          'FunctionModelCreated',
          'ContainerNodeAdded', 
          'ActionNodeAdded',
          'AIAgentRegistered',
          'FractalOrchestrationConfigured',
          'ActionOrchestrationConfigured',
          'ErrorHandlingConfigured',
          'HierarchicalContextRegistered',
          'FunctionModelPublished',
          'ModelVersionCreated',
          'ComprehensiveSystemExecutionStarted',
          'AllServicesCoordinationCompleted',
          'ComprehensiveSystemExecutionCompleted'
        ];

        for (const expectedEventType of systemIntegrationEvents) {
          const eventExists = allEvents.some(event => event.eventType === expectedEventType);
          expect(eventExists).toBe(true, `Expected event ${expectedEventType} was not published`);
        }

        // Verify comprehensive audit trail
        const comprehensiveAuditLogs = await mockAuditRepository.findByModelId(masterWorkflowId);
        expect(comprehensiveAuditLogs.isSuccess).toBe(true);
        expect(comprehensiveAuditLogs.value.length).toBeGreaterThan(15); // Comprehensive workflow should generate many audit logs

        const systemIntegrationAuditLogs = comprehensiveAuditLogs.value.filter(log => 
          log.action.includes('SYSTEM_INTEGRATION') || 
          log.action.includes('ALL_SERVICES') ||
          log.action.includes('COMPREHENSIVE')
        );
        expect(systemIntegrationAuditLogs.length).toBeGreaterThan(3);

        // Verify final system state integrity
        const finalModelState = await mockRepository.findById(masterWorkflowId);
        expect(finalModelState.isSuccess).toBe(true);
        expect(finalModelState.value.status).toBe(ModelStatus.PUBLISHED);
        expect(finalModelState.value.version.toString()).toBe(versionResult.value.newVersion);

        // Verify all supporting models are in correct state
        const aiModelState = await mockRepository.findById(aiProcessingModelId);
        const analyticsModelState = await mockRepository.findById(dataAnalyticsModelId);
        
        expect(aiModelState.isSuccess).toBe(true);
        expect(analyticsModelState.isSuccess).toBe(true);
      });
    });
  });

  describe('Real User Scenarios with Actual Data Flows', () => {
    describe('ProductionLikeWorkflows_E2E', () => {
      it('should_ExecuteRealisticBusinessWorkflow_WithActualDataTransformations', async () => {
        // Arrange: Create realistic business workflow scenario
        const businessWorkflowResult = await createModelUseCase.execute({
          name: 'Customer Order Processing Workflow',
          description: 'Realistic e-commerce order processing workflow with data transformations',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const workflowModelId = businessWorkflowResult.value.modelId;

        // Build realistic business process structure

        // Order Validation Stage
        const orderValidationStageResult = await createUnifiedNodeUseCase.execute({
          modelId: workflowModelId,
          nodeType: 'stage',
          nodeName: 'Order Validation and Processing',
          nodeDescription: 'Validates incoming orders and performs initial processing',
          userId: testUserId
        });

        // Inventory Management Stage
        const inventoryStageResult = await createUnifiedNodeUseCase.execute({
          modelId: workflowModelId,
          nodeType: 'stage',
          nodeName: 'Inventory Management and Allocation',
          nodeDescription: 'Manages inventory allocation and availability checking',
          userId: testUserId
        });

        // Payment Processing Stage
        const paymentStageResult = await createUnifiedNodeUseCase.execute({
          modelId: workflowModelId,
          nodeType: 'stage',
          nodeName: 'Payment Processing and Verification',
          nodeDescription: 'Processes payments and handles financial transactions',
          userId: testUserId
        });

        // Fulfillment Stage
        const fulfillmentStageResult = await createUnifiedNodeUseCase.execute({
          modelId: workflowModelId,
          nodeType: 'stage',
          nodeName: 'Order Fulfillment and Shipping',
          nodeDescription: 'Handles order fulfillment, shipping, and logistics',
          userId: testUserId
        });

        // Add realistic business actions with actual data transformations

        // Order Validation Actions
        const orderSchemaValidationResult = await addActionUseCase.execute({
          modelId: workflowModelId,
          parentNodeId: orderValidationStageResult.value.nodeId,
          actionType: 'tether',
          actionName: 'Order Schema Validation',
          actionDescription: 'Validates order data against business schema',
          configuration: {
            validationRules: {
              required: ['customerId', 'items', 'shippingAddress', 'paymentMethod'],
              customerValidation: { 
                idFormat: 'uuid',
                statusCheck: 'active'
              },
              itemValidation: {
                requiredFields: ['productId', 'quantity', 'price'],
                quantityLimits: { min: 1, max: 1000 },
                priceValidation: 'non_negative'
              },
              addressValidation: {
                requiredFields: ['street', 'city', 'state', 'zipCode', 'country'],
                formatValidation: true,
                geolocationCheck: false // Disabled for testing
              }
            },
            dataTransformations: {
              normalizeCustomerId: 'uppercase',
              standardizeAddress: 'usps_format',
              calculateTaxes: 'based_on_location'
            }
          },
          executionOrder: 1,
          userId: testUserId
        });

        const fraudDetectionResult = await addActionUseCase.execute({
          modelId: workflowModelId,
          parentNodeId: orderValidationStageResult.value.nodeId,
          actionType: 'ai_agent',
          actionName: 'Fraud Detection Analysis',
          actionDescription: 'AI-powered fraud detection for order security',
          configuration: {
            agentType: 'fraud_detection',
            analysisParameters: {
              riskFactors: ['unusualPurchasePattern', 'geolocationAnomaly', 'paymentMethodRisk'],
              confidenceThreshold: 0.85,
              realTimeScoring: true
            },
            dataInputs: {
              orderData: 'validated_order',
              customerHistory: 'customer_profile',
              deviceFingerprint: 'session_data'
            },
            outputFormat: {
              riskScore: 'decimal',
              riskFactors: 'array',
              recommendation: 'enum'
            }
          },
          executionOrder: 2,
          userId: testUserId
        });

        // Inventory Management Actions
        const inventoryCheckResult = await addActionUseCase.execute({
          modelId: workflowModelId,
          parentNodeId: inventoryStageResult.value.nodeId,
          actionType: 'tether',
          actionName: 'Real-time Inventory Availability Check',
          actionDescription: 'Checks real-time inventory levels and reserves items',
          configuration: {
            inventorySystem: {
              apiEndpoint: 'https://api.inventory.example.com/v2',
              authentication: 'api_key',
              realTimeSync: true
            },
            checkParameters: {
              reservationDuration: 1800, // 30 minutes
              quantityBuffers: { safety: 0.05, seasonalAdjustment: 0.1 },
              locationPriority: 'nearest_warehouse'
            },
            dataTransformations: {
              aggregateAvailability: 'cross_warehouse',
              calculateDeliveryEstimates: 'logistics_api',
              updateReservations: 'transactional'
            }
          },
          executionOrder: 1,
          userId: testUserId
        });

        const inventoryAllocationResult = await addActionUseCase.execute({
          modelId: workflowModelId,
          parentNodeId: inventoryStageResult.value.nodeId,
          actionType: 'tether',
          actionName: 'Intelligent Inventory Allocation',
          actionDescription: 'Optimally allocates inventory across multiple warehouses',
          configuration: {
            allocationStrategy: 'minimize_shipping_cost',
            optimizationParameters: {
              shippingCostWeight: 0.6,
              deliverySpeedWeight: 0.3,
              inventoryTurnoverWeight: 0.1
            },
            constraintHandling: {
              maxShippingLocations: 3,
              preferredCarriers: ['FedEx', 'UPS', 'USPS'],
              hazardousMaterialsHandling: true
            },
            dataOutputs: {
              allocationPlan: 'detailed_json',
              shippingEstimates: 'carrier_api_response',
              costBreakdown: 'financial_object'
            }
          },
          executionOrder: 2,
          userId: testUserId
        });

        // Payment Processing Actions
        const paymentAuthorizationResult = await addActionUseCase.execute({
          modelId: workflowModelId,
          parentNodeId: paymentStageResult.value.nodeId,
          actionType: 'tether',
          actionName: 'Payment Authorization and Processing',
          actionDescription: 'Processes payment authorization with multiple payment methods',
          configuration: {
            paymentGateways: {
              primary: 'stripe',
              fallback: ['paypal', 'square'],
              cryptoSupport: false // Disabled for testing
            },
            authorizationParameters: {
              currency: 'USD',
              captureMethod: 'automatic',
              threeDSecure: 'optional',
              fraudProtection: 'enabled'
            },
            dataProcessing: {
              tokenization: 'vault_payment_methods',
              pciCompliance: 'tokenized_storage',
              auditLogging: 'comprehensive'
            },
            errorHandling: {
              declinedCards: 'suggest_alternatives',
              networkErrors: 'retry_with_backoff',
              fraudFlags: 'manual_review_queue'
            }
          },
          executionOrder: 1,
          userId: testUserId
        });

        const paymentConfirmationResult = await addActionUseCase.execute({
          modelId: workflowModelId,
          parentNodeId: paymentStageResult.value.nodeId,
          actionType: 'tether',
          actionName: 'Payment Confirmation and Receipt Generation',
          actionDescription: 'Confirms payment and generates customer receipts',
          configuration: {
            confirmationProcessing: {
              receiptGeneration: 'pdf_and_email',
              customerNotification: 'multi_channel',
              accountingSystemSync: 'real_time'
            },
            receiptCustomization: {
              branding: 'company_template',
              taxBreakdown: 'detailed',
              loyaltyPointsDisplay: true,
              promotionsApplied: 'itemized'
            },
            dataArchiving: {
              transactionRecords: 'encrypted_storage',
              retentionPolicy: '7_years',
              complianceReporting: 'automated'
            }
          },
          executionOrder: 2,
          userId: testUserId
        });

        // Fulfillment Actions
        const fulfillmentOrchestrationResult = await addActionUseCase.execute({
          modelId: workflowModelId,
          parentNodeId: fulfillmentStageResult.value.nodeId,
          actionType: 'function_model_container',
          actionName: 'Warehouse Fulfillment Orchestration',
          actionDescription: 'Orchestrates warehouse fulfillment processes across multiple locations',
          configuration: {
            nestedModelId: getTestUUID('fulfillment-subworkflow'),
            contextMapping: {
              allocationPlan: 'fulfillment_input',
              paymentConfirmation: 'payment_validation',
              customerDetails: 'shipping_info'
            },
            outputExtraction: {
              fulfillmentStatus: 'warehouse_status',
              trackingNumbers: 'shipment_tracking',
              deliveryEstimates: 'logistics_estimates'
            },
            orchestrationParameters: {
              parallelProcessing: true,
              warehouseCoordination: 'real_time',
              qualityAssurance: 'automated_verification'
            }
          },
          executionOrder: 1,
          userId: testUserId
        });

        const customerNotificationResult = await addActionUseCase.execute({
          modelId: workflowModelId,
          parentNodeId: fulfillmentStageResult.value.nodeId,
          actionType: 'tether',
          actionName: 'Customer Communication and Order Tracking',
          actionDescription: 'Manages customer communications and provides order tracking',
          configuration: {
            communicationChannels: {
              email: 'transactional_service',
              sms: 'twilio_integration',
              pushNotifications: 'firebase_messaging',
              inAppNotifications: 'websocket_service'
            },
            notificationTriggers: {
              orderConfirmation: 'immediate',
              paymentProcessed: 'immediate',
              shippingStarted: 'real_time',
              deliveryUpdates: 'milestone_based',
              deliveryCompleted: 'immediate'
            },
            personalization: {
              customerPreferences: 'profile_based',
              languageLocalization: 'automatic',
              brandingCustomization: 'company_standards',
              communicationFrequency: 'preference_based'
            },
            trackingIntegration: {
              carrierAPIs: ['fedex', 'ups', 'usps', 'dhl'],
              realTimeUpdates: true,
              predictiveDelivery: 'ml_enhanced',
              deliveryOptimization: 'route_optimization'
            }
          },
          executionOrder: 2,
          userId: testUserId
        });

        // Configure comprehensive error handling for business workflow
        const businessErrorHandlingResult = await errorHandlingUseCase.executeErrorHandlingAndRecovery({
          operation: 'configureRecovery',
          modelId: workflowModelId,
          recoveryPolicies: [
            {
              errorType: 'validation_failure',
              action: 'customer_notification_and_correction',
              customerFacing: true,
              retryable: true
            },
            {
              errorType: 'inventory_unavailable',
              action: 'suggest_alternatives_and_backorder',
              customerNotification: 'immediate',
              fallbackInventory: 'expanded_search'
            },
            {
              errorType: 'payment_declined',
              action: 'alternative_payment_methods',
              customerGuidance: 'contextual_help',
              retryLimit: 3
            },
            {
              errorType: 'fulfillment_delay',
              action: 'proactive_customer_communication',
              compensationEligibility: 'automated_assessment',
              alternativeSolutions: 'expedited_shipping'
            },
            {
              errorType: 'system_unavailable',
              action: 'graceful_degradation',
              essentialFunctionsOnly: true,
              customerMessage: 'maintenance_notification'
            }
          ],
          userId: testUserId
        });
        expect(businessErrorHandlingResult.isSuccess).toBe(true);

        // Publish the realistic business workflow
        const businessPublishResult = await publishModelUseCase.execute({
          modelId: workflowModelId,
          userId: testUserId,
          publishNotes: 'Production-ready customer order processing workflow',
          enforceValidation: true
        });
        expect(businessPublishResult.isSuccess).toBe(true);

        // Act: Execute realistic business workflow with actual data
        const realisticExecutionResult = await executeModelUseCase.execute({
          modelId: workflowModelId,
          userId: testUserId,
          executionMode: 'sequential',
          inputData: {
            // Realistic order data
            order: {
              customerId: getTestUUID('customer-12345'),
              orderNumber: 'ORD-2024-001234',
              items: [
                {
                  productId: 'PROD-LAPTOP-001',
                  productName: 'Business Laptop Pro',
                  quantity: 1,
                  unitPrice: 1299.99,
                  category: 'electronics',
                  specifications: {
                    brand: 'TechBrand',
                    model: 'ProBook 2024',
                    warranty: '3-year-extended'
                  }
                },
                {
                  productId: 'PROD-MOUSE-002',
                  productName: 'Wireless Ergonomic Mouse',
                  quantity: 2,
                  unitPrice: 49.99,
                  category: 'accessories'
                }
              ],
              customerInfo: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '+1-555-123-4567',
                loyaltyLevel: 'premium',
                accountAge: 'established'
              },
              shippingAddress: {
                street: '123 Business Ave',
                city: 'Commerce City',
                state: 'CO',
                zipCode: '80022',
                country: 'USA',
                addressType: 'business'
              },
              billingAddress: {
                street: '123 Business Ave',
                city: 'Commerce City', 
                state: 'CO',
                zipCode: '80022',
                country: 'USA',
                sameAsShipping: true
              },
              paymentMethod: {
                type: 'credit_card',
                cardBrand: 'visa',
                lastFour: '1234',
                expirationMonth: 12,
                expirationYear: 2028,
                billingZip: '80022'
              },
              shippingPreferences: {
                speed: 'standard',
                carrier: 'fedex',
                deliveryInstructions: 'Leave at front desk',
                signatureRequired: false
              },
              orderMetadata: {
                source: 'website',
                campaignId: 'SPRING2024',
                sessionId: getTestUUID('session-67890'),
                userAgent: 'Mozilla/5.0 E2E Test Client',
                timestamp: new Date().toISOString()
              }
            },
            // Processing configuration
            processingOptions: {
              priorityProcessing: false,
              giftWrap: false,
              expediteShipping: false,
              fraudCheckLevel: 'standard',
              inventoryAllocationStrategy: 'cost_optimized'
            },
            // Business context
            businessContext: {
              seasonalDemand: 'normal',
              promotionActive: true,
              inventoryPressure: 'low',
              customerServiceLoad: 'normal',
              systemResourceAvailability: 'high'
            }
          },
          executionOptions: {
            enableRealisticDataProcessing: true,
            businessWorkflowMode: true,
            comprehensiveLogging: true,
            customerFacingExecution: true
          }
        });

        // Assert: Realistic business workflow should execute successfully with actual data transformations
        expect(realisticExecutionResult.isSuccess).toBe(true);
        expect(realisticExecutionResult.value.status).toBe('completed');
        expect(realisticExecutionResult.value.results).toBeDefined();

        // Verify realistic business workflow results
        const results = realisticExecutionResult.value.results;
        
        // Order validation results
        expect(results.orderValidationResults).toBeDefined();
        expect(results.orderValidationResults.schemaValid).toBe(true);
        expect(results.orderValidationResults.fraudRiskScore).toBeDefined();
        expect(results.orderValidationResults.fraudRiskScore).toBeLessThan(0.5); // Low risk
        expect(results.orderValidationResults.validatedOrder).toBeDefined();

        // Inventory management results
        expect(results.inventoryResults).toBeDefined();
        expect(results.inventoryResults.availability).toBeDefined();
        expect(results.inventoryResults.allocation).toBeDefined();
        expect(results.inventoryResults.allocation.fulfillmentPlan).toBeDefined();
        expect(results.inventoryResults.reservationConfirmation).toBeDefined();

        // Payment processing results
        expect(results.paymentResults).toBeDefined();
        expect(results.paymentResults.authorizationStatus).toBe('approved');
        expect(results.paymentResults.transactionId).toBeDefined();
        expect(results.paymentResults.receiptData).toBeDefined();
        expect(results.paymentResults.receiptData.receiptNumber).toBeDefined();

        // Fulfillment results
        expect(results.fulfillmentResults).toBeDefined();
        expect(results.fulfillmentResults.warehouseAssignments).toBeDefined();
        expect(results.fulfillmentResults.trackingNumbers).toBeDefined();
        expect(results.fulfillmentResults.estimatedDelivery).toBeDefined();
        expect(results.fulfillmentResults.customerNotifications).toBeDefined();

        // Business metrics and analytics
        expect(realisticExecutionResult.value.businessMetrics).toBeDefined();
        expect(realisticExecutionResult.value.businessMetrics.orderProcessingTime).toBeGreaterThan(0);
        expect(realisticExecutionResult.value.businessMetrics.customerSatisfactionPrediction).toBeDefined();
        expect(realisticExecutionResult.value.businessMetrics.operationalEfficiency).toBeGreaterThan(0.8);

        // Verify realistic business events
        const businessEvents = mockEventBus.getAllEvents();
        const expectedBusinessEvents = [
          'OrderReceived',
          'OrderValidationCompleted',
          'FraudCheckCompleted',
          'InventoryReserved',
          'AllocationOptimized',
          'PaymentAuthorized',
          'PaymentConfirmed',
          'FulfillmentInitiated',
          'CustomerNotificationSent',
          'OrderProcessingCompleted'
        ];

        for (const expectedEvent of expectedBusinessEvents) {
          const eventExists = businessEvents.some(event => event.eventType === expectedEvent);
          expect(eventExists).toBe(true, `Expected business event ${expectedEvent} was not published`);
        }

        // Verify business audit trail with realistic data
        const businessAuditLogs = await mockAuditRepository.findByModelId(workflowModelId);
        expect(businessAuditLogs.isSuccess).toBe(true);
        expect(businessAuditLogs.value.length).toBeGreaterThan(10); // Realistic business workflow generates many audit entries

        const dataTransformationLogs = businessAuditLogs.value.filter(log => 
          log.action.includes('DATA_TRANSFORMATION') || 
          log.action.includes('BUSINESS_PROCESS') ||
          log.details?.dataProcessing
        );
        expect(dataTransformationLogs.length).toBeGreaterThan(5);

        // Verify data transformations actually occurred
        const validationTransformations = results.orderValidationResults.dataTransformations;
        expect(validationTransformations).toBeDefined();
        expect(validationTransformations.normalizedCustomerId).toBeDefined();
        expect(validationTransformations.standardizedAddress).toBeDefined();
        expect(validationTransformations.calculatedTaxes).toBeDefined();
        expect(validationTransformations.calculatedTaxes.amount).toBeGreaterThan(0);

        const inventoryTransformations = results.inventoryResults.dataTransformations;
        expect(inventoryTransformations).toBeDefined();
        expect(inventoryTransformations.aggregatedAvailability).toBeDefined();
        expect(inventoryTransformations.deliveryEstimates).toBeDefined();
        expect(inventoryTransformations.reservationUpdates).toBeDefined();

        // Verify final business state integrity
        const finalBusinessModel = await mockRepository.findById(workflowModelId);
        expect(finalBusinessModel.isSuccess).toBe(true);
        expect(finalBusinessModel.value.status).toBe(ModelStatus.PUBLISHED);

        // Additional verification: Customer-facing data quality
        const customerFacingData = realisticExecutionResult.value.customerFacingOutputs;
        expect(customerFacingData).toBeDefined();
        expect(customerFacingData.orderConfirmation).toBeDefined();
        expect(customerFacingData.trackingInformation).toBeDefined();
        expect(customerFacingData.deliveryEstimate).toBeDefined();
        expect(customerFacingData.receiptData).toBeDefined();

        // Verify no sensitive data leaked in customer-facing outputs
        const customerDataString = JSON.stringify(customerFacingData);
        expect(customerDataString).not.toContain('cardNumber');
        expect(customerDataString).not.toContain('cvv');
        expect(customerDataString).not.toContain('internalId');
        expect(customerDataString).not.toContain('apiKey');
      });
    });
  });
});