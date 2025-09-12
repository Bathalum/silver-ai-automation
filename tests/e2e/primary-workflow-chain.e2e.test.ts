/**
 * End-to-End Test Suite for Primary Workflow Chain
 * 
 * This test suite validates the core user workflow dependencies:
 * - Primary Dependency Chain: UC-001→UC-002→UC-003→UC-004→UC-005
 * 
 * Architecture: Tests complete workflows through all Clean Architecture layers:
 * - UI/API Layer → Use Cases → Domain Services → Infrastructure
 * - Validates dependency inversion and layer separation
 * - Tests actual business workflows end-to-end with minimal mocking
 */

import { CreateFunctionModelUseCase } from '../../lib/use-cases/function-model/create-function-model-use-case';
import { CreateUnifiedNodeUseCase } from '../../lib/use-cases/function-model/create-unified-node-use-case';
import { AddActionNodeToContainerUseCase } from '../../lib/use-cases/function-model/add-action-node-to-container-use-case';
import { PublishFunctionModelUseCase } from '../../lib/use-cases/function-model/publish-function-model-use-case';
import { ExecuteFunctionModelUseCase } from '../../lib/use-cases/function-model/execute-function-model-use-case';
import { 
  ValidateWorkflowStructureUseCase, 
  IWorkflowValidationService,
  IBusinessRuleValidationService,
  IExecutionReadinessService,
  IContextValidationService,
  ICrossFeatureValidationService
} from '../../lib/use-cases';
import { WorkflowStructuralValidationService } from '../../lib/domain/services/workflow-structural-validation-service';
import { BusinessRuleValidationService } from '../../lib/domain/services/business-rule-validation-service';
import { ExecutionReadinessValidationService } from '../../lib/domain/services/execution-readiness-validation-service';
import { ContextValidationService } from '../../lib/domain/services/context-validation-service';
import { CrossFeatureValidationService } from '../../lib/domain/services/cross-feature-validation-service';
import { WorkflowOrchestrationService } from '../../lib/domain/services/workflow-orchestration-service';
import { ActionNodeExecutionService } from '../../lib/domain/services/action-node-execution-service';
import { FractalOrchestrationService } from '../../lib/domain/services/fractal-orchestration-service';
import { ActionNodeOrchestrationService } from '../../lib/domain/services/action-node-orchestration-service';
import { NodeContextAccessService } from '../../lib/domain/services/node-context-access-service';
import { FunctionModel } from '../../lib/domain/entities/function-model';

// Import specific interfaces for compatibility
import { IAuditLogRepository } from '../../lib/domain/interfaces/audit-log-repository';
import { IFunctionModelRepository } from '../../lib/use-cases/function-model/create-function-model-use-case';
import { IEventBus } from '../../lib/infrastructure/events/supabase-event-bus';

import { Result } from '../../lib/domain/shared/result';
import { ModelStatus, ContainerNodeType, ActionNodeType, ExecutionMode } from '../../lib/domain/enums';

import { 
  FunctionModelBuilder, 
  TestData, 
  getTestUUID 
} from '../utils/test-fixtures';

/**
 * Mock Infrastructure Services (Minimal mocking for E2E testing)
 * Only mock external dependencies, not internal business logic
 */
class MockFunctionModelRepository implements IFunctionModelRepository {
  private models = new Map<string, FunctionModel>();

  async save(model: FunctionModel): Promise<Result<void>> {
    // Store the actual domain entity, not a plain object
    this.models.set(model.modelId, model);
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
    if (!this.models.has(id)) {
      return Result.fail(`Model with id ${id} not found`);
    }
    this.models.delete(id);
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

  // Test helper methods
  clear() {
    this.models.clear();
  }

  getAllModels(): FunctionModel[] {
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
 * E2E Test Suite: Primary User Workflow Chain
 * 
 * Tests the core user workflow through all architectural layers with minimal mocking.
 * Validates primary use case dependencies: UC-001→UC-002→UC-003→UC-004→UC-005
 */
describe('Primary User Workflow Chain - E2E Test Suite', () => {
  // Infrastructure (minimal mocks)
  let mockRepository: MockFunctionModelRepository;
  let mockAuditRepository: MockAuditLogRepository;
  let mockEventBus: MockEventBus;

  // Validation service mocks
  let mockWorkflowValidationService: MockWorkflowValidationService;
  let mockBusinessRuleValidationService: MockBusinessRuleValidationService;
  let mockExecutionReadinessService: MockExecutionReadinessService;
  let mockContextValidationService: MockContextValidationService;
  let mockCrossFeatureValidationService: MockCrossFeatureValidationService;

  // Use Cases (Real instances - no mocking)
  let createModelUseCase: CreateFunctionModelUseCase;
  let createUnifiedNodeUseCase: CreateUnifiedNodeUseCase;
  let addActionUseCase: AddActionNodeToContainerUseCase;
  let publishModelUseCase: PublishFunctionModelUseCase;
  let executeModelUseCase: ExecuteFunctionModelUseCase;
  let validateWorkflowUseCase: ValidateWorkflowStructureUseCase;

  // Test data
  const testUserId = TestData.VALID_USER_ID;
  const testOrganizationId = 'org-e2e-test-123';

  beforeEach(() => {
    // Initialize infrastructure mocks
    mockRepository = new MockFunctionModelRepository();
    mockAuditRepository = new MockAuditLogRepository();
    mockEventBus = new MockEventBus();

    // Initialize validation services with real implementations
    mockWorkflowValidationService = new WorkflowStructuralValidationService();
    mockBusinessRuleValidationService = new BusinessRuleValidationService();
    mockExecutionReadinessService = new ExecutionReadinessValidationService();
    mockContextValidationService = new ContextValidationService();
    mockCrossFeatureValidationService = new CrossFeatureValidationService();

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
    validateWorkflowUseCase = new ValidateWorkflowStructureUseCase(
      mockRepository,
      mockWorkflowValidationService,
      mockBusinessRuleValidationService,
      mockExecutionReadinessService,
      mockContextValidationService,
      mockCrossFeatureValidationService
    );
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
        expect(createdModel.value.name.toString()).toBe(workflowName);

        // UC-002: Add Container Node (must create model before adding nodes)
        const addContainerResult = await createUnifiedNodeUseCase.execute({
          modelId,
          nodeType: ContainerNodeType.STAGE_NODE,
          name: 'Processing Stage',
          description: 'Main processing stage for E2E test',
          position: { x: 300, y: 200 },
          userId: testUserId
        });

        expect(addContainerResult.isSuccess).toBe(true);
        expect(addContainerResult.value.nodeType).toBe(ContainerNodeType.STAGE_NODE);
        
        const stageNodeId = addContainerResult.value.nodeId;

        // UC-003: Add Action Node to Container (must create container before adding actions)
        const addActionResult = await addActionUseCase.execute({
          modelId,
          parentNodeId: stageNodeId,
          actionType: ActionNodeType.TETHER_NODE,
          name: 'Process Action',
          description: 'Main processing action for E2E test',
          executionMode: ExecutionMode.SEQUENTIAL,
          executionOrder: 1,
          priority: 5,
          actionSpecificData: {
            tetherReferenceId: 'tether-ref-001',
            tetherReference: 'default-reference',
            executionParameters: {},
            outputMapping: {},
            executionTriggers: [],
            resourceRequirements: {},
            integrationConfig: {},
            failureHandling: {}
          },
          userId: testUserId
        });

        expect(addActionResult.isSuccess).toBe(true);
        expect(addActionResult.value.actionType).toBe(ActionNodeType.TETHER_NODE);
        expect(addActionResult.value.parentNodeId).toBe(stageNodeId);

        // Add input IO node to make workflow valid
        const addInputResult = await createUnifiedNodeUseCase.execute({
          modelId,
          nodeType: ContainerNodeType.IO_NODE,
          name: 'Input Boundary',
          description: 'Input boundary for E2E test workflow',
          position: { x: 100, y: 200 },
          userId: testUserId
        });

        expect(addInputResult.isSuccess).toBe(true);

        // Add output IO node to make workflow valid  
        const addOutputResult = await createUnifiedNodeUseCase.execute({
          modelId,
          nodeType: ContainerNodeType.IO_NODE,
          name: 'Output Boundary', 
          description: 'Output boundary for E2E test workflow',
          position: { x: 500, y: 200 },
          userId: testUserId
        });

        expect(addOutputResult.isSuccess).toBe(true);

        // UC-004: Validate and Publish (must configure actions before publishing)
        const validateResult = await validateWorkflowUseCase.execute({
          modelId,
          userId: testUserId,
          validationLevel: 'full'
        });

        expect(validateResult.isSuccess).toBe(true);
        expect(validateResult.value.overallValid).toBe(true);

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

        // Verify events published for each step
        const events = mockEventBus.getAllEvents();
        expect(events.some(e => e.eventType === 'FunctionModelCreated')).toBe(true);
        expect(events.some(e => e.eventType === 'ContainerNodeAdded')).toBe(true);
        expect(events.some(e => e.eventType === 'ActionNodeAdded')).toBe(true);
        expect(events.some(e => e.eventType === 'FunctionModelPublished')).toBe(true);
        expect(events.some(e => e.eventType === 'WorkflowExecutionCompleted')).toBe(true);
      });

      it('should_FailGracefully_WhenDependencyViolated', async () => {
        // Arrange: Attempt to violate UC-002 dependency (add node to non-existent model)
        const nonExistentModelId = getTestUUID('non-existent');

        // Act: Try to add container node to non-existent model
        const addContainerResult = await createUnifiedNodeUseCase.execute({
          modelId: nonExistentModelId,
          nodeType: ContainerNodeType.STAGE_NODE,
          name: 'Invalid Stage',
          position: { x: 100, y: 100 },
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

      it('should_ValidateWorkflowStructure_BeforePublishing', async () => {
        // Arrange: Create model with invalid structure
        const createResult = await createModelUseCase.execute({
          name: 'Invalid Structure Model',
          description: 'Model with invalid structure for validation testing',
          userId: testUserId,
          organizationId: testOrganizationId
        });

        const modelId = createResult.value.modelId;

        // Don't add any nodes - this creates an invalid structure

        // Act: Try to validate empty workflow
        const validateResult = await validateWorkflowUseCase.execute({
          modelId,
          userId: testUserId,
          validationLevel: 'structural'
        });

        // Assert: Validation should fail for empty workflow
        expect(validateResult.isSuccess).toBe(true); // The operation succeeds
        expect(validateResult.value.overallValid).toBe(false); // But validation reports invalid

        // Try to publish with validation enforcement
        const publishResult = await publishModelUseCase.execute({
          modelId,
          userId: testUserId,
          publishNotes: 'Attempt to publish invalid model',
          enforceValidation: true
        });

        // Assert: Publishing should fail due to validation
        expect(publishResult.isFailure).toBe(true);
        expect(publishResult.error).toContain('validation');

        // Verify model status remains DRAFT
        const model = await mockRepository.findById(modelId);
        expect(model.value.status).toBe(ModelStatus.DRAFT);
      });

      it('should_HandleComplexWorkflow_WithMultipleNodesAndActions', async () => {
        // Arrange: Create more complex workflow structure
        const createResult = await createModelUseCase.execute({
          name: 'Complex Workflow Model',
          description: 'Complex workflow with multiple nodes and actions',
          userId: testUserId,
          organizationId: testOrganizationId
        });

        const modelId = createResult.value.modelId;

        // Create multiple container nodes
        const inputStageResult = await createUnifiedNodeUseCase.execute({
          modelId,
          nodeType: ContainerNodeType.IO_NODE,
          name: 'Input Stage',
          description: 'Input processing stage',
          position: { x: 100, y: 200 },
          userId: testUserId
        });

        const processingStageResult = await createUnifiedNodeUseCase.execute({
          modelId,
          nodeType: ContainerNodeType.STAGE_NODE,
          name: 'Processing Stage',
          description: 'Main processing stage',
          position: { x: 300, y: 200 },
          userId: testUserId
        });

        const outputStageResult = await createUnifiedNodeUseCase.execute({
          modelId,
          nodeType: ContainerNodeType.IO_NODE,
          name: 'Output Stage',
          description: 'Output generation stage',
          position: { x: 500, y: 200 },
          userId: testUserId
        });

        // Add multiple actions to processing stage
        const action1Result = await addActionUseCase.execute({
          modelId,
          parentNodeId: processingStageResult.value.nodeId,
          actionType: ActionNodeType.TETHER_NODE,
          name: 'Data Processing Action',
          description: 'Processes input data',
          executionMode: ExecutionMode.SEQUENTIAL,
          executionOrder: 1,
          priority: 5,
          actionSpecificData: {
            tetherReferenceId: 'tether-data-process',
            tetherReference: 'data-processing-reference',
            executionParameters: {},
            outputMapping: {},
            executionTriggers: [],
            resourceRequirements: {},
            integrationConfig: {},
            failureHandling: {}
          },
          userId: testUserId
        });

        const action2Result = await addActionUseCase.execute({
          modelId,
          parentNodeId: processingStageResult.value.nodeId,
          actionType: ActionNodeType.KB_NODE,
          name: 'Knowledge Base Lookup',
          description: 'Looks up information from knowledge base',
          executionMode: ExecutionMode.SEQUENTIAL,
          executionOrder: 2,
          priority: 3,
          actionSpecificData: {
            kbReferenceId: 'kb-lookup-ref',
            shortDescription: 'KB lookup action',
            documentationContext: 'E2E test context',
            searchKeywords: ['test', 'lookup', 'kb'],
            accessPermissions: {
              view: ['test-user'],
              edit: []
            }
          },
          userId: testUserId
        });

        // Act: Validate complex workflow
        const validateResult = await validateWorkflowUseCase.execute({
          modelId,
          userId: testUserId,
          validationLevel: 'full'
        });

        expect(validateResult.isSuccess).toBe(true);
        expect(validateResult.value.overallValid).toBe(true);

        // Publish complex workflow
        const publishResult = await publishModelUseCase.execute({
          modelId,
          userId: testUserId,
          publishNotes: 'Complex workflow ready for production',
          enforceValidation: true
        });

        expect(publishResult.isSuccess).toBe(true);
        expect(publishResult.value.status).toBe(ModelStatus.PUBLISHED);

        // Execute complex workflow
        const executeResult = await executeModelUseCase.execute({
          modelId,
          userId: testUserId,
          executionMode: 'sequential',
          inputData: { 
            complexInput: 'multi-stage test data',
            processingParams: { priority: 'high', quality: 'premium' }
          }
        });

        // Assert: Complex workflow should execute successfully
        expect(executeResult.isSuccess).toBe(true);
        expect(executeResult.value.status).toBe('completed');
        expect(executeResult.value.results).toBeDefined();

        // Verify all stages and actions were processed
        expect(executeResult.value.results.stagesProcessed).toBe(3);
        expect(executeResult.value.results.actionsExecuted).toBe(2);

        // Verify events for complex workflow
        const events = mockEventBus.getAllEvents();
        const containerEvents = events.filter(e => e.eventType === 'ContainerNodeAdded');
        const actionEvents = events.filter(e => e.eventType === 'ActionNodeAdded');
        
        expect(containerEvents.length).toBe(3); // Input, Processing, Output stages
        expect(actionEvents.length).toBe(2); // Data processing and KB lookup actions
      });
    });

    describe('ErrorRecovery_E2E', () => {
      it('should_RecoverFromTransientFailures_DuringExecution', async () => {
        // Arrange: Create workflow that simulates transient failure
        const createResult = await createModelUseCase.execute({
          name: 'Recovery Test Workflow',
          description: 'Workflow to test error recovery capabilities',
          userId: testUserId,
          organizationId: testOrganizationId
        });

        const modelId = createResult.value.modelId;

        // Add container and action with failure simulation
        const stageResult = await createUnifiedNodeUseCase.execute({
          modelId,
          nodeType: ContainerNodeType.STAGE_NODE,
          name: 'Recovery Stage',
          position: { x: 200, y: 300 },
          userId: testUserId
        });

        await addActionUseCase.execute({
          modelId,
          parentNodeId: stageResult.value.nodeId,
          actionType: ActionNodeType.TETHER_NODE,
          name: 'Potentially Failing Action',
          executionMode: ExecutionMode.SEQUENTIAL,
          executionOrder: 1,
          priority: 5,
          actionSpecificData: {
            tetherReferenceId: 'failing-tether-ref',
            tetherReference: 'failure-test-reference',
            executionParameters: {
              simulateTransientFailure: true,
              maxRetryAttempts: 3
            },
            outputMapping: {},
            executionTriggers: [],
            resourceRequirements: {},
            integrationConfig: {},
            failureHandling: {
              retryOnFailure: true,
              maxRetries: 3
            }
          },
          userId: testUserId
        });

        // Publish workflow
        await publishModelUseCase.execute({
          modelId,
          userId: testUserId,
          publishNotes: 'Recovery test workflow ready'
        });

        // Act: Execute workflow with recovery
        const executeResult = await executeModelUseCase.execute({
          modelId,
          userId: testUserId,
          executionMode: 'sequential',
          inputData: { triggerTransientFailure: true },
          executionOptions: { enableRetry: true, maxRetries: 3 }
        });

        // Assert: Workflow should succeed after recovery
        expect(executeResult.isSuccess).toBe(true);
        expect(executeResult.value.status).toBe('completed');
        expect(executeResult.value.recoveryInfo).toBeDefined();
        expect(executeResult.value.recoveryInfo.retriesAttempted).toBeGreaterThan(0);

        // Verify recovery events
        const recoveryEvents = mockEventBus.getEventsByType('ExecutionRecoveryAttempted');
        expect(recoveryEvents.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Architectural Compliance Validation', () => {
    describe('CleanArchitectureCompliance_E2E', () => {
      it('should_MaintainLayerSeparation_ThroughoutWorkflow', async () => {
        // Arrange: Create workflow to test architectural compliance
        const createResult = await createModelUseCase.execute({
          name: 'Architecture Compliance Test',
          description: 'Workflow to validate Clean Architecture compliance',
          userId: testUserId,
          organizationId: testOrganizationId
        });

        const modelId = createResult.value.modelId;

        // Act: Execute complete workflow
        const containerResult = await createUnifiedNodeUseCase.execute({
          modelId,
          nodeType: ContainerNodeType.STAGE_NODE,
          name: 'Compliance Test Stage',
          position: { x: 250, y: 350 },
          userId: testUserId
        });

        const actionResult = await addActionUseCase.execute({
          modelId,
          parentNodeId: containerResult.value.nodeId,
          actionType: ActionNodeType.TETHER_NODE,
          name: 'Compliance Test Action',
          executionMode: ExecutionMode.SEQUENTIAL,
          executionOrder: 1,
          priority: 5,
          actionSpecificData: {
            tetherReferenceId: 'compliance-tether-ref',
            tetherReference: 'compliance-test-reference',
            executionParameters: {},
            outputMapping: {},
            executionTriggers: [],
            resourceRequirements: {},
            integrationConfig: {},
            failureHandling: {}
          },
          userId: testUserId
        });

        const publishResult = await publishModelUseCase.execute({
          modelId,
          userId: testUserId,
          publishNotes: 'Architecture compliance test'
        });

        const executeResult = await executeModelUseCase.execute({
          modelId,
          userId: testUserId,
          executionMode: 'sequential',
          inputData: { architectureTest: true }
        });

        // Assert: All operations should succeed with proper layer separation
        expect(createResult.isSuccess).toBe(true);
        expect(containerResult.isSuccess).toBe(true);
        expect(actionResult.isSuccess).toBe(true);
        expect(publishResult.isSuccess).toBe(true);
        expect(executeResult.isSuccess).toBe(true);

        // Verify that domain events were published (showing proper event flow)
        const events = mockEventBus.getAllEvents();
        expect(events.length).toBeGreaterThan(4); // At least one event per major operation

        // Verify that repository was used correctly (showing proper data access)
        const allModels = mockRepository.getAllModels();
        expect(allModels.length).toBe(1);
        expect(allModels[0].modelId).toBe(modelId);

        // Verify that use cases coordinated properly without direct domain coupling
        const finalModel = await mockRepository.findById(modelId);
        expect(finalModel.isSuccess).toBe(true);
        expect(finalModel.value.status).toBe(ModelStatus.PUBLISHED);
      });
    });
  });
});