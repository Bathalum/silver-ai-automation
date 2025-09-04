/**
 * TDD Specification Test: WorkflowOrchestrationService Execution Pipeline
 * 
 * This test suite defines the expected behavior for the complete execution pipeline
 * through failing tests that serve as executable documentation and architectural
 * specifications.
 * 
 * Clean Architecture Enforcement:
 * - Tests domain service behavior without external dependencies
 * - Validates that orchestration emits proper domain events 
 * - Ensures audit trail requirements are met
 * - Defines proper error handling and recovery patterns
 * 
 * TDD Cycle: 
 * 1. RED: Write failing tests that define expected behavior
 * 2. GREEN: Implement minimal code to pass tests
 * 3. REFACTOR: Improve implementation while maintaining passing tests
 */

import * as crypto from 'crypto';
import { WorkflowOrchestrationService, ExecutionContext, ExecutionStatus } from '../../../../lib/domain/services/workflow-orchestration-service';
import { FunctionModel, ExecutionResult } from '../../../../lib/domain/entities/function-model';
import { ActionNode } from '../../../../lib/domain/entities/action-node';
import { TetherNode } from '../../../../lib/domain/entities/tether-node';
import { KBNode } from '../../../../lib/domain/entities/kb-node';
import { FunctionModelContainerNode } from '../../../../lib/domain/entities/function-model-container-node';
import { StageNode } from '../../../../lib/domain/entities/stage-node';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Position } from '../../../../lib/domain/value-objects/position';
import { Version } from '../../../../lib/domain/value-objects/version';
import { ExecutionMode, ActionStatus, ContainerNodeType, ActionNodeType, ModelStatus, NodeStatus } from '../../../../lib/domain/enums';
import { Result } from '../../../../lib/domain/shared/result';

/**
 * Mock Event Bus for capturing domain events during orchestration
 * The WorkflowOrchestrationService should publish domain events for audit trails
 */
interface IDomainEventBus {
  publish(event: DomainEvent): Promise<void>;
  getPublishedEvents(): DomainEvent[];
  clear(): void;
}

interface DomainEvent {
  eventType: string;
  aggregateId: string;
  eventData: any;
  timestamp: Date;
  userId?: string;
}

class MockDomainEventBus implements IDomainEventBus {
  private events: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.events.push({ ...event, timestamp: new Date() });
  }

  getPublishedEvents(): DomainEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}

/**
 * Enhanced WorkflowOrchestrationService that should emit domain events
 * This is what we expect the service to become after TDD implementation
 */
interface IWorkflowOrchestrationServiceWithEvents {
  executeWorkflow(model: FunctionModel, context: ExecutionContext, eventBus?: IDomainEventBus): Promise<Result<ExecutionResult>>;
  pauseExecution(executionId: string, eventBus?: IDomainEventBus): Promise<Result<void>>;
  resumeExecution(executionId: string, eventBus?: IDomainEventBus): Promise<Result<void>>;
  stopExecution(executionId: string, eventBus?: IDomainEventBus): Promise<Result<void>>;
  getExecutionStatus(executionId: string): Promise<Result<ExecutionStatus>>;
}

describe('WorkflowOrchestrationService - Execution Pipeline Specification (TDD)', () => {
  let orchestrationService: WorkflowOrchestrationService;
  let mockEventBus: MockDomainEventBus;
  let testModel: FunctionModel;
  let executionContext: ExecutionContext;

  beforeEach(() => {
    orchestrationService = new WorkflowOrchestrationService();
    mockEventBus = new MockDomainEventBus();
    
    // Create test model with valid structure
    testModel = createTestWorkflowModel();
    executionContext = {
      modelId: testModel.modelId,
      executionId: 'exec-test-001',
      startTime: new Date(),
      parameters: { testParam: 'testValue' },
      userId: 'user-test-001',
      environment: 'development'
    };
  });

  afterEach(() => {
    mockEventBus.clear();
  });

  describe('FAILING TESTS - Domain Event Publishing Requirements', () => {
    describe('ExecuteWorkflow_DomainEventEmission', () => {
      it('should_PublishWorkflowExecutionStartedEvent_WhenExecutionBegins', async () => {
        // Arrange: Setup for workflow execution
        const expectedEvent = {
          eventType: 'WorkflowExecutionStarted',
          aggregateId: testModel.modelId,
          eventData: {
            executionId: executionContext.executionId,
            modelId: testModel.modelId,
            userId: executionContext.userId,
            environment: executionContext.environment,
            startTime: executionContext.startTime
          }
        };

        // Act: Execute workflow (this should fail initially)
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        const result = await enhancedService.executeWorkflow(testModel, executionContext, mockEventBus);

        // Assert: WorkflowExecutionStarted event should be published
        const events = mockEventBus.getPublishedEvents();
        const startEvent = events.find(e => e.eventType === 'WorkflowExecutionStarted');
        
        expect(startEvent).toBeDefined();
        expect(startEvent!.aggregateId).toBe(testModel.modelId);
        expect(startEvent!.eventData.executionId).toBe(executionContext.executionId);
        expect(startEvent!.eventData.userId).toBe(executionContext.userId);
        expect(result.isSuccess).toBe(true);
      });

      it('should_PublishNodeExecutionEvents_ForEachNodeProcessed', async () => {
        // Arrange: Model with multiple nodes
        const multiNodeModel = createMultiNodeTestModel();
        const executionCtx = { ...executionContext, modelId: multiNodeModel.modelId };

        // Act: Execute workflow with multiple nodes
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        const result = await enhancedService.executeWorkflow(multiNodeModel, executionCtx, mockEventBus);

        // Assert: Node execution events should be published for each node
        const events = mockEventBus.getPublishedEvents();
        const nodeStartEvents = events.filter(e => e.eventType === 'NodeExecutionStarted');
        const nodeCompletedEvents = events.filter(e => e.eventType === 'NodeExecutionCompleted');

        expect(nodeStartEvents.length).toBe(multiNodeModel.nodes.size);
        expect(nodeCompletedEvents.length).toBe(multiNodeModel.nodes.size);
        expect(result.isSuccess).toBe(true);
      });

      it('should_PublishActionExecutionEvents_ForEachActionProcessed', async () => {
        // Arrange: Model with actions
        const actionModel = createModelWithActions();
        const executionCtx = { ...executionContext, modelId: actionModel.modelId };

        // Act: Execute workflow with actions
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        const result = await enhancedService.executeWorkflow(actionModel, executionCtx, mockEventBus);

        // Assert: Action execution events should be published
        const events = mockEventBus.getPublishedEvents();
        const actionStartEvents = events.filter(e => e.eventType === 'ActionExecutionStarted');
        const actionCompletedEvents = events.filter(e => e.eventType === 'ActionExecutionCompleted');

        expect(actionStartEvents.length).toBeGreaterThan(0);
        expect(actionCompletedEvents.length).toBeGreaterThan(0);
        expect(result.isSuccess).toBe(true);
      });

      it('should_PublishWorkflowCompletionEvent_WhenExecutionFinishes', async () => {
        // Arrange: Valid workflow for completion
        const completionModel = createTestWorkflowModel();
        const executionCtx = { ...executionContext, modelId: completionModel.modelId };

        // Act: Execute workflow to completion
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        const result = await enhancedService.executeWorkflow(completionModel, executionCtx, mockEventBus);

        // Assert: Workflow completion event should be published
        const events = mockEventBus.getPublishedEvents();
        const completionEvent = events.find(e => e.eventType === 'WorkflowExecutionCompleted');

        expect(completionEvent).toBeDefined();
        expect(completionEvent!.aggregateId).toBe(completionModel.modelId);
        expect(completionEvent!.eventData.executionId).toBe(executionCtx.executionId);
        expect(completionEvent!.eventData.success).toBe(true);
        expect(result.isSuccess).toBe(true);
      });

      it('should_PublishFailureEvent_WhenExecutionFails', async () => {
        // Arrange: Model that will cause execution failure
        const failingModel = createFailingWorkflowModel();
        const executionCtx = { ...executionContext, modelId: failingModel.modelId };

        // Act: Execute failing workflow
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        const result = await enhancedService.executeWorkflow(failingModel, executionCtx, mockEventBus);

        // Assert: Failure event should be published
        const events = mockEventBus.getPublishedEvents();
        const failureEvent = events.find(e => e.eventType === 'WorkflowExecutionFailed');

        expect(failureEvent).toBeDefined();
        expect(failureEvent!.aggregateId).toBe(failingModel.modelId);
        expect(failureEvent!.eventData.error).toBeDefined();
        expect(result.isSuccess).toBe(false);
      });
    });

    describe('ExecutionStateTransition_DomainEvents', () => {
      it('should_PublishPauseEvent_WhenExecutionPaused', async () => {
        // Arrange: Start execution first
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        await enhancedService.executeWorkflow(testModel, executionContext, mockEventBus);
        mockEventBus.clear(); // Clear setup events

        // Act: Pause execution
        const pauseResult = await enhancedService.pauseExecution(executionContext.executionId, mockEventBus);

        // Assert: Pause event should be published
        const events = mockEventBus.getPublishedEvents();
        const pauseEvent = events.find(e => e.eventType === 'WorkflowExecutionPaused');

        expect(pauseEvent).toBeDefined();
        expect(pauseEvent!.eventData.executionId).toBe(executionContext.executionId);
        expect(pauseResult.isSuccess).toBe(true);
      });

      it('should_PublishResumeEvent_WhenExecutionResumed', async () => {
        // Arrange: Pause execution first
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        await enhancedService.executeWorkflow(testModel, executionContext, mockEventBus);
        await enhancedService.pauseExecution(executionContext.executionId, mockEventBus);
        mockEventBus.clear(); // Clear setup events

        // Act: Resume execution
        const resumeResult = await enhancedService.resumeExecution(executionContext.executionId, mockEventBus);

        // Assert: Resume event should be published
        const events = mockEventBus.getPublishedEvents();
        const resumeEvent = events.find(e => e.eventType === 'WorkflowExecutionResumed');

        expect(resumeEvent).toBeDefined();
        expect(resumeEvent!.eventData.executionId).toBe(executionContext.executionId);
        expect(resumeResult.isSuccess).toBe(true);
      });

      it('should_PublishStopEvent_WhenExecutionStopped', async () => {
        // Arrange: Start execution first
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        await enhancedService.executeWorkflow(testModel, executionContext, mockEventBus);
        mockEventBus.clear(); // Clear setup events

        // Act: Stop execution
        const stopResult = await enhancedService.stopExecution(executionContext.executionId, mockEventBus);

        // Assert: Stop event should be published
        const events = mockEventBus.getPublishedEvents();
        const stopEvent = events.find(e => e.eventType === 'WorkflowExecutionStopped');

        expect(stopEvent).toBeDefined();
        expect(stopEvent!.eventData.executionId).toBe(executionContext.executionId);
        expect(stopEvent!.eventData.reason).toBe('user_requested');
        expect(stopResult.isSuccess).toBe(true);
      });
    });

    describe('ErrorRecovery_DomainEvents', () => {
      it('should_PublishRecoveryAttemptEvent_WhenRetryingFailedActions', async () => {
        // Arrange: Model with failing action that should retry
        const retryModel = createRetryableFailureModel();
        const executionCtx = { ...executionContext, modelId: retryModel.modelId };

        // Act: Execute model with retry logic
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        const result = await enhancedService.executeWorkflow(retryModel, executionCtx, mockEventBus);

        // Assert: Recovery attempt events should be published
        const events = mockEventBus.getPublishedEvents();
        const recoveryEvents = events.filter(e => e.eventType === 'ExecutionRecoveryAttempted');

        expect(recoveryEvents.length).toBeGreaterThan(0);
        expect(recoveryEvents[0].eventData.attemptNumber).toBe(1);
        expect(recoveryEvents[0].eventData.executionId).toBe(executionCtx.executionId);
      });

      it('should_PublishRecoverySuccessEvent_WhenRetrySucceeds', async () => {
        // Arrange: Model that fails first but succeeds on retry
        const recoveryModel = createRecoverableFailureModel();
        const executionCtx = { ...executionContext, modelId: recoveryModel.modelId };

        // Act: Execute model that recovers
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        const result = await enhancedService.executeWorkflow(recoveryModel, executionCtx, mockEventBus);

        // Assert: Recovery success event should be published
        const events = mockEventBus.getPublishedEvents();
        const successEvent = events.find(e => e.eventType === 'ExecutionRecoverySucceeded');

        expect(successEvent).toBeDefined();
        expect(successEvent!.eventData.recoveredAfterAttempts).toBeGreaterThan(1);
        expect(result.isSuccess).toBe(true);
      });
    });
  });

  describe('FAILING TESTS - Audit Trail Generation Requirements', () => {
    describe('AuditTrail_MinimumEventRequirement', () => {
      it('should_GenerateAtLeastSixDomainEvents_ForCompleteWorkflowExecution', async () => {
        // Arrange: Standard workflow that should generate >6 events
        // Expected events: WorkflowExecutionStarted, NodeExecutionStarted (x2), 
        // ActionExecutionStarted (x2), ActionExecutionCompleted (x2), 
        // NodeExecutionCompleted (x2), WorkflowExecutionCompleted = 10+ events
        const standardModel = createStandardTestModel();
        const executionCtx = { ...executionContext, modelId: standardModel.modelId };

        // Act: Execute complete workflow
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        const result = await enhancedService.executeWorkflow(standardModel, executionCtx, mockEventBus);

        // Assert: At least 6 domain events should be published for audit trail
        const events = mockEventBus.getPublishedEvents();
        expect(events.length).toBeGreaterThanOrEqual(6);
        
        // Verify event diversity for complete audit trail
        const eventTypes = new Set(events.map(e => e.eventType));
        expect(eventTypes.has('WorkflowExecutionStarted')).toBe(true);
        expect(eventTypes.has('NodeExecutionStarted')).toBe(true);
        expect(eventTypes.has('ActionExecutionStarted')).toBe(true);
        expect(eventTypes.has('WorkflowExecutionCompleted')).toBe(true);
        
        expect(result.isSuccess).toBe(true);
      });

      it('should_IncludeTimestampAndUserId_InAllAuditEvents', async () => {
        // Arrange: Execute workflow to generate audit events
        const auditModel = createTestWorkflowModel();
        const executionCtx = { ...executionContext, modelId: auditModel.modelId };

        // Act: Execute workflow
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        await enhancedService.executeWorkflow(auditModel, executionCtx, mockEventBus);

        // Assert: All events should have timestamp and userId for audit compliance
        const events = mockEventBus.getPublishedEvents();
        expect(events.length).toBeGreaterThan(0);

        events.forEach(event => {
          expect(event.timestamp).toBeInstanceOf(Date);
          expect(event.eventData.userId || event.userId).toBe(executionCtx.userId);
          expect(event.aggregateId).toBe(auditModel.modelId);
        });
      });

      it('should_CaptureExecutionMetrics_InDomainEvents', async () => {
        // Arrange: Execute workflow to capture metrics
        const metricsModel = createTestWorkflowModel();
        const executionCtx = { ...executionContext, modelId: metricsModel.modelId };

        // Act: Execute workflow
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        const result = await enhancedService.executeWorkflow(metricsModel, executionCtx, mockEventBus);

        // Assert: Events should include execution metrics
        const events = mockEventBus.getPublishedEvents();
        const completionEvent = events.find(e => e.eventType === 'WorkflowExecutionCompleted');

        expect(completionEvent).toBeDefined();
        expect(completionEvent!.eventData.executionTime).toBeGreaterThan(0);
        expect(completionEvent!.eventData.completedNodes).toBeInstanceOf(Array);
        expect(completionEvent!.eventData.failedNodes).toBeInstanceOf(Array);
        expect(completionEvent!.eventData.totalNodes).toBeGreaterThan(0);
      });
    });

    describe('ExecutionProgress_AuditTrail', () => {
      it('should_TrackProgressPercentage_ThroughDomainEvents', async () => {
        // Arrange: Multi-step workflow for progress tracking
        const progressModel = createMultiStepProgressModel();
        const executionCtx = { ...executionContext, modelId: progressModel.modelId };

        // Act: Execute multi-step workflow
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        await enhancedService.executeWorkflow(progressModel, executionCtx, mockEventBus);

        // Assert: Progress events should show increasing percentages
        const events = mockEventBus.getPublishedEvents();
        const progressEvents = events.filter(e => e.eventData.progress !== undefined);

        expect(progressEvents.length).toBeGreaterThan(1);
        
        // Verify progress increases over time
        const progressValues = progressEvents.map(e => e.eventData.progress).sort((a, b) => a - b);
        expect(progressValues[0]).toBe(0);
        expect(progressValues[progressValues.length - 1]).toBe(100);
      });

      it('should_CaptureNodeDependencyExecution_InAuditTrail', async () => {
        // Arrange: Model with clear node dependencies
        const dependencyModel = createNodeDependencyModel();
        const executionCtx = { ...executionContext, modelId: dependencyModel.modelId };

        // Act: Execute workflow with dependencies
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        await enhancedService.executeWorkflow(dependencyModel, executionCtx, mockEventBus);

        // Assert: Dependency execution should be audited
        const events = mockEventBus.getPublishedEvents();
        const nodeEvents = events.filter(e => e.eventType === 'NodeExecutionStarted');

        // Verify dependency order was respected in audit trail
        expect(nodeEvents.length).toBeGreaterThan(1);
        nodeEvents.forEach(event => {
          expect(event.eventData.dependencies).toBeInstanceOf(Array);
          expect(event.eventData.dependenciesSatisfied).toBe(true);
        });
      });
    });
  });

  describe('FAILING TESTS - Error Handling and Recovery Patterns', () => {
    describe('FailureRecovery_Orchestration', () => {
      it('should_AttemptRetry_ForTransientActionFailures', async () => {
        // Arrange: Model with retryable action failure
        const retryModel = createRetryableActionModel();
        const executionCtx = { ...executionContext, modelId: retryModel.modelId };

        // Act: Execute model with transient failures
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        const result = await enhancedService.executeWorkflow(retryModel, executionCtx, mockEventBus);

        // Assert: Retry attempts should be made and audited
        const events = mockEventBus.getPublishedEvents();
        const retryEvents = events.filter(e => e.eventType === 'ActionRetryAttempted');

        expect(retryEvents.length).toBeGreaterThan(0);
        expect(retryEvents[0].eventData.retryAttempt).toBe(1);
        expect(retryEvents[0].eventData.maxRetries).toBeGreaterThan(1);
      });

      it('should_FailFast_ForCriticalNodeFailures', async () => {
        // Arrange: Model with critical node that should fail fast
        const criticalFailModel = createCriticalFailureModel();
        const executionCtx = { ...executionContext, modelId: criticalFailModel.modelId };

        // Act: Execute model with critical failure
        const enhancedService = orchestrationService as any as IWorkflowOrchestrationServiceWithEvents;
        const result = await enhancedService.executeWorkflow(criticalFailModel, executionCtx, mockEventBus);

        // Assert: Should fail fast without retry attempts
        const events = mockEventBus.getPublishedEvents();
        const failureEvent = events.find(e => e.eventType === 'WorkflowExecutionFailed');

        expect(result.isFailure).toBe(true);
        expect(failureEvent).toBeDefined();
        expect(failureEvent!.eventData.failureType).toBe('critical_node_failure');
        expect(failureEvent!.eventData.stopReason).toBe('fail_fast');
      });
    });
  });
});

// Test Model Factory Functions
function createTestWorkflowModel(): FunctionModel {
  const modelId = crypto.randomUUID();
  
  const modelNameResult = ModelName.create('Test Workflow Model');
  if (modelNameResult.isFailure) {
    throw new Error(`Failed to create model name: ${modelNameResult.error}`);
  }
  
  const modelResult = FunctionModel.create({
    modelId,
    name: modelNameResult.value,
    description: 'Test model for orchestration service',
    version: Version.initial(),
    status: ModelStatus.DRAFT,
    currentVersion: Version.initial(),
    nodes: new Map(),
    actionNodes: new Map(),
    metadata: {
      organizationId: 'test-org-001',
      createdBy: 'test-user-001',
    },
    permissions: {
      owner: 'test-user-001',
      viewers: [],
      editors: []
    }
  });

  if (modelResult.isFailure) {
    throw new Error(`Failed to create test model: ${modelResult.error}`);
  }

  const model = modelResult.value;

  // Add basic container node  
  const positionResult = Position.create(200, 200);
  if (positionResult.isFailure) {
    throw new Error(`Failed to create position: ${positionResult.error}`);
  }
  
  const stageNodeResult = StageNode.create({
    nodeId: NodeId.generate(),
    modelId: 'test-model-001',
    name: 'Test Container',
    description: 'Test container node',
    position: positionResult.value,
    dependencies: [], // NodeId[]
    executionType: ExecutionMode.SEQUENTIAL,
    status: NodeStatus.IDLE,
    timeout: 30000,
    metadata: {},
    visualProperties: {},
    stageData: {
      stageType: 'process',
      stageGoals: ['test goal'],
      resourceRequirements: {}
    },
    parallelExecution: false,
    configuration: {}
  });
  
  if (stageNodeResult.isFailure) {
    throw new Error(`Failed to create stage node: ${stageNodeResult.error}`);
  }
  
  const containerNode = stageNodeResult.value;
  
  model.addNode(containerNode);
  
  // Add basic action
  const tetherActionId = NodeId.generate().value;
  const tetherActionResult = TetherNode.create({
    actionId: tetherActionId,
    parentNodeId: containerNode.nodeId,
    modelId,
    name: 'Test Tether Action',
    description: 'Test tether action description',
    executionMode: ExecutionMode.SEQUENTIAL,
    executionOrder: 1,
    status: ActionStatus.READY,
    priority: 5,
    estimatedDuration: 30,
    tetherData: {
      tetherReferenceId: 'test-tether-ref',
      tetherReference: 'test-reference',
      executionParameters: {},
      outputMapping: {},
      executionTriggers: [],
      resourceRequirements: {},
      integrationConfig: {},
      failureHandling: {}
    }
  });
  
  if (tetherActionResult.isFailure) {
    throw new Error(`Failed to create tether action: ${tetherActionResult.error}`);
  }
  
  const tetherAction = tetherActionResult.value;
  
  model.addActionNode(tetherAction);
  
  return model;
}

function createMultiNodeTestModel(): FunctionModel {
  const model = createTestWorkflowModel();
  
  // Add second container node
  const secondContainer = new ContainerNode(
    NodeId.create().value!,
    'Second Container',
    ContainerNodeType.STAGE_NODE,
    Position.create(400, 200).value!,
    'Second test container'
  );
  
  model.addNode(secondContainer);
  
  return model;
}

function createModelWithActions(): FunctionModel {
  const model = createTestWorkflowModel();
  
  const containerNodeId = Array.from(model.nodes.values())[0].nodeId;
  
  // Add KB action
  const kbAction = KBNode.create(
    containerNodeId,
    'Test KB Action',
    'Test KB action description',
    ExecutionMode.SEQUENTIAL,
    2,
    3,
    {
      kbReferenceId: 'test-kb-ref',
      shortDescription: 'Test KB node',
      documentationContext: 'Test context',
      searchKeywords: ['test', 'kb'],
      accessPermissions: { view: ['test-user'], edit: [] }
    }
  ).value!;
  
  model.addActionNode(kbAction);
  
  return model;
}

function createFailingWorkflowModel(): FunctionModel {
  const model = createTestWorkflowModel();
  
  // This model will fail validation, causing execution failure
  model.nodes.clear(); // Remove all nodes to make it invalid
  
  return model;
}

function createStandardTestModel(): FunctionModel {
  const model = createTestWorkflowModel();
  
  // Add more nodes and actions to generate more events
  const secondContainer = new ContainerNode(
    NodeId.create().value!,
    'Processing Stage',
    ContainerNodeType.STAGE_NODE,
    Position.create(400, 200).value!,
    'Processing stage container'
  );
  
  model.addNode(secondContainer);
  
  // Add action to second container
  const processingAction = TetherNode.create(
    secondContainer.nodeId,
    'Processing Action',
    'Main processing action',
    ExecutionMode.SEQUENTIAL,
    1,
    5,
    {
      tetherReferenceId: 'processing-tether-ref',
      tetherReference: 'processing-reference',
      executionParameters: {},
      outputMapping: {},
      executionTriggers: [],
      resourceRequirements: {},
      integrationConfig: {},
      failureHandling: {}
    }
  ).value!;
  
  model.addActionNode(processingAction);
  
  return model;
}

function createMultiStepProgressModel(): FunctionModel {
  const model = createStandardTestModel();
  
  // Add third container for more progress steps
  const thirdContainer = new ContainerNode(
    NodeId.create().value!,
    'Finalization Stage',
    ContainerNodeType.STAGE_NODE,
    Position.create(600, 200).value!,
    'Finalization stage container'
  );
  
  model.addNode(thirdContainer);
  
  return model;
}

function createNodeDependencyModel(): FunctionModel {
  const model = createMultiStepProgressModel();
  
  // Set up dependencies between nodes
  const nodes = Array.from(model.nodes.values());
  if (nodes.length >= 2) {
    nodes[1].dependencies = [nodes[0].nodeId];
  }
  if (nodes.length >= 3) {
    nodes[2].dependencies = [nodes[1].nodeId];
  }
  
  return model;
}

function createRetryableFailureModel(): FunctionModel {
  return createTestWorkflowModel(); // Will be enhanced during implementation
}

function createRecoverableFailureModel(): FunctionModel {
  return createTestWorkflowModel(); // Will be enhanced during implementation
}

function createRetryableActionModel(): FunctionModel {
  return createTestWorkflowModel(); // Will be enhanced during implementation
}

function createCriticalFailureModel(): FunctionModel {
  const model = createTestWorkflowModel();
  
  // Mark container as critical
  const container = Array.from(model.nodes.values())[0];
  container.metadata = { ...container.metadata, critical: true };
  
  return model;
}