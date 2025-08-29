/**
 * Complete User Workflow Scenarios - End-to-End Test Suite
 * 
 * This comprehensive test suite validates ALL complete user workflows as specified
 * in the use case model, testing real system behavior with minimal mocking:
 * 
 * PRIMARY DEPENDENCY CHAIN (UC-001→UC-002→UC-003→UC-004→UC-005):
 * - Complete model creation to execution flow
 * - All intermediate steps and validations
 * - Dependency violations and error handling
 * 
 * SECONDARY DEPENDENCIES (UC-005 depends on UC-010,011,012,013):
 * - Node dependency management within execution
 * - Hierarchical context access control
 * - Action node orchestration coordination  
 * - Fractal orchestration for nested models
 * 
 * AI AGENT WORKFLOW (UC-017→UC-018→UC-019):
 * - Agent registration and capability discovery
 * - Task execution and performance tracking
 * - Workflow coordination with multiple agents
 * 
 * CROSS-FEATURE INTEGRATION (UC-014→UC-015, UC-003→UC-014, UC-005→UC-019):
 * - Feature linking and strength calculation
 * - Cross-feature action configuration
 * - Integration during workflow execution
 * 
 * APPLICATION SERVICES COORDINATION:
 * - Function Model Management Service
 * - AI Agent Management Service  
 * - Cross-Feature Integration Service
 * - Business Rule Validation Service
 * - Complete data flows and state transitions
 * 
 * Architecture: Tests complete workflows through all Clean Architecture layers
 * with real business logic and actual data flows, validating system integration.
 */

// Core Use Cases - importing directly from files since not all are exported from index
import { CreateFunctionModelUseCase } from '../../lib/use-cases/function-model/create-function-model-use-case';
import { AddContainerNodeUseCase } from '../../lib/use-cases/function-model/add-container-node-use-case';
import { AddActionNodeToContainerUseCase } from '../../lib/use-cases/function-model/add-action-node-to-container-use-case';
import { PublishFunctionModelUseCase } from '../../lib/use-cases/function-model/publish-function-model-use-case';
import { ExecuteFunctionModelUseCase } from '../../lib/use-cases/function-model/execute-function-model-use-case';
import { ValidateWorkflowStructureUseCase } from '../../lib/use-cases/function-model/validate-workflow-structure-use-case';
import { CreateModelVersionUseCase } from '../../lib/use-cases/function-model/create-model-version-use-case';
import { ArchiveFunctionModelUseCase } from '../../lib/use-cases/function-model/archive-function-model-use-case';
import { SoftDeleteFunctionModelUseCase } from '../../lib/use-cases/function-model/soft-delete-function-model-use-case';

// AI Agent Use Cases
import { RegisterAIAgentUseCase } from '../../lib/use-cases/ai-agent/register-ai-agent-use-case';
import { DiscoverAgentsByCapabilityUseCase } from '../../lib/use-cases/ai-agent/discover-agents-by-capability-use-case';
import { ExecuteAIAgentTaskUseCase } from '../../lib/use-cases/ai-agent/execute-ai-agent-task-use-case';
import { PerformSemanticAgentSearchUseCase } from '../../lib/use-cases/ai-agent/perform-semantic-agent-search-use-case';
import { CoordinateWorkflowAgentExecutionUseCase } from '../../lib/use-cases/ai-agent/coordinate-workflow-agent-execution-use-case';

// Management Use Cases - importing directly from files  
import { ManageHierarchicalContextAccessUseCase } from '../../lib/use-cases/function-model/manage-hierarchical-context-access-use-case';
import { ManageFractalOrchestrationUseCase } from '../../lib/use-cases/function-model/manage-fractal-orchestration-use-case';
import { ManageErrorHandlingAndRecoveryUseCase } from '../../lib/use-cases/function-model/manage-error-handling-and-recovery-use-case';
import { ManageActionNodeOrchestrationUseCase } from '../../lib/use-cases/function-model/manage-action-node-orchestration-use-case';
import { ManageAiAgentOrchestrationUseCase } from '../../lib/use-cases/function-model/manage-ai-agent-orchestration-use-case';
import { ManageCrossFeatureIntegrationUseCase } from '../../lib/use-cases/function-model/manage-cross-feature-integration-use-case';

// Application Services
import { FunctionModelManagementService } from '../../lib/application/services/function-model-management-service';
import { AIAgentManagementService } from '../../lib/application/services/ai-agent-management-service';
import { CrossFeatureIntegrationService } from '../../lib/application/services/cross-feature-integration-service';

// Domain Services
import { NodeDependencyService } from '../../lib/domain/services/node-dependency-service';
import { WorkflowOrchestrationService } from '../../lib/domain/services/workflow-orchestration-service';
import { BusinessRuleValidationService } from '../../lib/domain/services/business-rule-validation-service';

// Infrastructure and interfaces
import { IAuditLogRepository } from '../../lib/domain/interfaces/audit-log-repository';
import { IFunctionModelRepository } from '../../lib/use-cases/function-model/create-function-model-use-case';
import { IAIAgentRepository } from '../../lib/domain/interfaces/ai-agent-repository';
import { INodeLinkRepository } from '../../lib/domain/interfaces/node-link-repository';
import { IEventBus } from '../../lib/infrastructure/events/supabase-event-bus';

import { Result } from '../../lib/domain/shared/result';
import { 
  ModelStatus, 
  ExecutionMode, 
  ContainerNodeType, 
  ActionNodeType,
  IOType 
} from '../../lib/domain/enums';

// Type aliases for compatibility with test expectations
const NodeType = {
  IO: ContainerNodeType.IO_NODE,
  STAGE: ContainerNodeType.STAGE_NODE
};

const ActionType = {
  TETHER: ActionNodeType.TETHER_NODE,
  KB: ActionNodeType.KB_NODE,
  FUNCTION_MODEL_CONTAINER: ActionNodeType.FUNCTION_MODEL_CONTAINER,
  AI_AGENT: 'ai_agent' as const,
  CROSS_FEATURE: 'cross_feature' as const
};

import { 
  FunctionModelBuilder, 
  TestData, 
  getTestUUID,
  createTestAIAgent,
  createTestCrossFeatureLink
} from '../utils/test-fixtures';

/**
 * Comprehensive Mock Infrastructure for E2E Testing
 * Minimal mocking - only external dependencies, not business logic
 */

class MockFunctionModelRepository implements IFunctionModelRepository {
  private models = new Map<string, any>();
  private versions = new Map<string, any[]>();

  async save(model: any): Promise<Result<void>> {
    this.models.set(model.modelId, { ...model, savedAt: new Date(), updatedAt: new Date() });
    return Result.ok(undefined);
  }

  async findById(id: string): Promise<Result<any>> {
    const model = this.models.get(id);
    if (!model) {
      return Result.fail(`Model with id ${id} not found`);
    }
    return Result.ok({ ...model });
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
    
    if (filter?.organizationId) {
      results = results.filter(m => m.metadata?.organizationId === filter.organizationId);
    }
    
    if (filter?.limit) {
      results = results.slice(0, filter.limit);
    }
    
    return Result.ok(results);
  }

  async saveVersion(modelId: string, version: any): Promise<Result<void>> {
    if (!this.versions.has(modelId)) {
      this.versions.set(modelId, []);
    }
    this.versions.get(modelId)!.push({ ...version, createdAt: new Date() });
    return Result.ok(undefined);
  }

  async findVersions(modelId: string): Promise<Result<any[]>> {
    const versions = this.versions.get(modelId) || [];
    return Result.ok([...versions]);
  }

  // Test helper methods
  clear() {
    this.models.clear();
    this.versions.clear();
  }

  getAllModels() {
    return Array.from(this.models.values());
  }

  getModelVersions(modelId: string) {
    return this.versions.get(modelId) || [];
  }
}

class MockAIAgentRepository implements IAIAgentRepository {
  private agents = new Map<string, any>();
  private capabilities = new Map<string, string[]>();
  private metrics = new Map<string, any>();

  async save(agent: any): Promise<Result<void>> {
    this.agents.set(agent.agentId, { ...agent, savedAt: new Date() });
    if (agent.capabilities) {
      this.capabilities.set(agent.agentId, agent.capabilities);
    }
    return Result.ok(undefined);
  }

  async findById(id: string): Promise<Result<any>> {
    const agent = this.agents.get(id);
    if (!agent) {
      return Result.fail(`Agent with id ${id} not found`);
    }
    return Result.ok({ ...agent });
  }

  async findByCapability(capability: string): Promise<Result<any[]>> {
    const matchingAgents = Array.from(this.agents.values()).filter(agent => 
      this.capabilities.get(agent.agentId)?.includes(capability)
    );
    return Result.ok(matchingAgents);
  }

  async findAll(filter?: any): Promise<Result<any[]>> {
    let results = Array.from(this.agents.values());
    
    if (filter?.enabled !== undefined) {
      results = results.filter(a => a.enabled === filter.enabled);
    }
    
    if (filter?.featureType) {
      results = results.filter(a => a.featureType === filter.featureType);
    }
    
    return Result.ok(results);
  }

  async updateMetrics(agentId: string, metrics: any): Promise<Result<void>> {
    if (!this.agents.has(agentId)) {
      return Result.fail(`Agent with id ${agentId} not found`);
    }
    this.metrics.set(agentId, { ...metrics, updatedAt: new Date() });
    return Result.ok(undefined);
  }

  async delete(id: string): Promise<Result<void>> {
    if (!this.agents.has(id)) {
      return Result.fail(`Agent with id ${id} not found`);
    }
    this.agents.delete(id);
    this.capabilities.delete(id);
    this.metrics.delete(id);
    return Result.ok(undefined);
  }

  // Test helper methods
  clear() {
    this.agents.clear();
    this.capabilities.clear();
    this.metrics.clear();
  }

  getAllAgents() {
    return Array.from(this.agents.values());
  }

  getAgentMetrics(agentId: string) {
    return this.metrics.get(agentId);
  }
}

class MockNodeLinkRepository implements INodeLinkRepository {
  private links = new Map<string, any>();
  private strengthCalculations = new Map<string, number>();

  async save(link: any): Promise<Result<void>> {
    this.links.set(link.linkId, { ...link, savedAt: new Date() });
    return Result.ok(undefined);
  }

  async findById(id: string): Promise<Result<any>> {
    const link = this.links.get(id);
    if (!link) {
      return Result.fail(`Link with id ${id} not found`);
    }
    return Result.ok({ ...link });
  }

  async findBySourceNode(nodeId: string): Promise<Result<any[]>> {
    const links = Array.from(this.links.values()).filter(l => l.sourceNodeId === nodeId);
    return Result.ok(links);
  }

  async findByTargetNode(nodeId: string): Promise<Result<any[]>> {
    const links = Array.from(this.links.values()).filter(l => l.targetNodeId === nodeId);
    return Result.ok(links);
  }

  async findByModel(modelId: string): Promise<Result<any[]>> {
    const links = Array.from(this.links.values()).filter(l => l.modelId === modelId);
    return Result.ok(links);
  }

  async updateStrength(linkId: string, strength: number): Promise<Result<void>> {
    const link = this.links.get(linkId);
    if (!link) {
      return Result.fail(`Link with id ${linkId} not found`);
    }
    link.strength = strength;
    this.strengthCalculations.set(linkId, strength);
    return Result.ok(undefined);
  }

  async delete(id: string): Promise<Result<void>> {
    if (!this.links.has(id)) {
      return Result.fail(`Link with id ${id} not found`);
    }
    this.links.delete(id);
    this.strengthCalculations.delete(id);
    return Result.ok(undefined);
  }

  async findAll(): Promise<Result<any[]>> {
    return Result.ok(Array.from(this.links.values()));
  }

  // Test helper methods
  clear() {
    this.links.clear();
    this.strengthCalculations.clear();
  }

  getAllLinks() {
    return Array.from(this.links.values());
  }

  getLinkStrength(linkId: string) {
    return this.strengthCalculations.get(linkId);
  }
}

class MockAuditLogRepository implements IAuditLogRepository {
  private logs: any[] = [];

  async save(auditLog: any): Promise<Result<void>> {
    this.logs.push({ ...auditLog, id: getTestUUID('audit'), timestamp: new Date() });
    return Result.ok(undefined);
  }

  async findById(id: string): Promise<Result<any>> {
    const log = this.logs.find(l => l.id === id);
    return log ? Result.ok(log) : Result.fail('Log not found');
  }

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

  getLogsByModelId(modelId: string) {
    return this.logs.filter(l => l.modelId === modelId || l.entityId === modelId);
  }
}

class MockEventBus implements IEventBus {
  private events: any[] = [];
  private subscribers = new Map<string, Function[]>();

  async publish(event: any): Promise<void> {
    this.events.push({ ...event, id: getTestUUID('event'), publishedAt: new Date() });
    
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

  getEventsByAggregateId(aggregateId: string) {
    return this.events.filter(e => e.aggregateId === aggregateId);
  }
}

/**
 * Complete User Workflow Scenarios - E2E Test Suite
 * 
 * Tests ALL complete user workflows with real business logic and minimal mocking.
 * Validates complete system integration across all Clean Architecture layers.
 */
describe('Complete User Workflow Scenarios - E2E Test Suite', () => {
  // Infrastructure (minimal mocks)
  let mockModelRepository: MockFunctionModelRepository;
  let mockAgentRepository: MockAIAgentRepository;
  let mockLinkRepository: MockNodeLinkRepository;
  let mockAuditRepository: MockAuditLogRepository;
  let mockEventBus: MockEventBus;

  // Application Services (Real instances)
  let modelManagementService: FunctionModelManagementService;
  let agentManagementService: AIAgentManagementService;
  let integrationService: CrossFeatureIntegrationService;

  // Core Use Cases (Real instances)
  let createModelUseCase: CreateFunctionModelUseCase;
  let addContainerUseCase: AddContainerNodeUseCase;
  let addActionUseCase: AddActionNodeToContainerUseCase;
  let publishModelUseCase: PublishFunctionModelUseCase;
  let executeModelUseCase: ExecuteFunctionModelUseCase;
  let validateWorkflowUseCase: ValidateWorkflowStructureUseCase;
  let createVersionUseCase: CreateModelVersionUseCase;
  let archiveModelUseCase: ArchiveFunctionModelUseCase;
  let softDeleteUseCase: SoftDeleteFunctionModelUseCase;

  // AI Agent Use Cases (Real instances)
  let registerAgentUseCase: RegisterAIAgentUseCase;
  let discoverAgentsUseCase: DiscoverAgentsByCapabilityUseCase;
  let executeAgentTaskUseCase: ExecuteAIAgentTaskUseCase;
  let semanticSearchUseCase: PerformSemanticAgentSearchUseCase;
  let coordinateAgentUseCase: CoordinateWorkflowAgentExecutionUseCase;

  // Management Use Cases (Real instances)
  let contextAccessUseCase: ManageHierarchicalContextAccessUseCase;
  let fractalOrchestrationUseCase: ManageFractalOrchestrationUseCase;
  let errorRecoveryUseCase: ManageErrorHandlingAndRecoveryUseCase;
  let actionOrchestrationUseCase: ManageActionNodeOrchestrationUseCase;
  let agentOrchestrationUseCase: ManageAiAgentOrchestrationUseCase;
  let crossFeatureUseCase: ManageCrossFeatureIntegrationUseCase;

  // Domain Services (Real instances)
  let nodeDependencyService: NodeDependencyService;
  let workflowOrchestrationService: WorkflowOrchestrationService;
  let businessRuleService: BusinessRuleValidationService;

  // Test data
  const testUserId = TestData.VALID_USER_ID;
  const testOrganizationId = 'org-e2e-complete-scenarios';

  beforeEach(async () => {
    // Initialize infrastructure mocks
    mockModelRepository = new MockFunctionModelRepository();
    mockAgentRepository = new MockAIAgentRepository();
    mockLinkRepository = new MockNodeLinkRepository();
    mockAuditRepository = new MockAuditLogRepository();
    mockEventBus = new MockEventBus();

    // Initialize Domain Services (real business logic)
    nodeDependencyService = new NodeDependencyService();
    workflowOrchestrationService = new WorkflowOrchestrationService(nodeDependencyService);
    businessRuleService = new BusinessRuleValidationService();

    // Initialize Application Services (real coordination logic)
    modelManagementService = new FunctionModelManagementService(
      mockModelRepository,
      mockAuditRepository,
      mockEventBus,
      businessRuleService
    );
    agentManagementService = new AIAgentManagementService(
      mockAgentRepository,
      mockEventBus,
      businessRuleService
    );
    integrationService = new CrossFeatureIntegrationService(
      mockLinkRepository,
      mockEventBus,
      businessRuleService
    );

    // Initialize Core Use Cases (real business workflows)
    createModelUseCase = new CreateFunctionModelUseCase(mockModelRepository, mockEventBus);
    addContainerUseCase = new AddContainerNodeUseCase(mockModelRepository, mockEventBus);
    addActionUseCase = new AddActionNodeToContainerUseCase(mockModelRepository, mockEventBus);
    publishModelUseCase = new PublishFunctionModelUseCase(mockModelRepository, mockEventBus);
    executeModelUseCase = new ExecuteFunctionModelUseCase(
      mockModelRepository, 
      mockEventBus,
      workflowOrchestrationService
    );
    validateWorkflowUseCase = new ValidateWorkflowStructureUseCase(mockModelRepository);
    createVersionUseCase = new CreateModelVersionUseCase(mockModelRepository, mockEventBus);
    archiveModelUseCase = new ArchiveFunctionModelUseCase(mockModelRepository, mockEventBus);
    softDeleteUseCase = new SoftDeleteFunctionModelUseCase(
      mockModelRepository, 
      mockEventBus,
      mockAuditRepository
    );

    // Initialize AI Agent Use Cases (real agent workflows)
    registerAgentUseCase = new RegisterAIAgentUseCase(mockAgentRepository, mockEventBus);
    discoverAgentsUseCase = new DiscoverAgentsByCapabilityUseCase(mockAgentRepository);
    executeAgentTaskUseCase = new ExecuteAIAgentTaskUseCase(
      mockAgentRepository, 
      mockEventBus
    );
    semanticSearchUseCase = new PerformSemanticAgentSearchUseCase(mockAgentRepository);
    coordinateAgentUseCase = new CoordinateWorkflowAgentExecutionUseCase(
      executeAgentTaskUseCase,
      mockEventBus
    );

    // Initialize Management Use Cases (real coordination)
    contextAccessUseCase = new ManageHierarchicalContextAccessUseCase(
      mockModelRepository,
      mockEventBus
    );
    fractalOrchestrationUseCase = new ManageFractalOrchestrationUseCase(
      mockModelRepository,
      workflowOrchestrationService,
      mockEventBus
    );
    errorRecoveryUseCase = new ManageErrorHandlingAndRecoveryUseCase(
      mockModelRepository,
      mockEventBus
    );
    actionOrchestrationUseCase = new ManageActionNodeOrchestrationUseCase(
      mockModelRepository,
      workflowOrchestrationService,
      mockEventBus
    );
    agentOrchestrationUseCase = new ManageAiAgentOrchestrationUseCase(
      agentManagementService,
      mockEventBus
    );
    crossFeatureUseCase = new ManageCrossFeatureIntegrationUseCase(
      integrationService,
      mockEventBus
    );
  });

  afterEach(() => {
    // Clear all test data
    mockModelRepository.clear();
    mockAgentRepository.clear();
    mockLinkRepository.clear();
    mockAuditRepository.clear();
    mockEventBus.clear();
  });

  describe('PRIMARY DEPENDENCY CHAIN: UC-001→UC-002→UC-003→UC-004→UC-005', () => {
    describe('CompleteModelLifecycleWorkflow_E2E', () => {
      it('should_ExecuteCompleteModelLifecycle_FromCreationToArchival', async () => {
        // PHASE 1: UC-001 - Create Function Model
        const createResult = await createModelUseCase.execute({
          name: 'Complete Lifecycle Model',
          description: 'E2E test of complete model lifecycle workflow',
          userId: testUserId,
          organizationId: testOrganizationId
        });

        expect(createResult.isSuccess).toBe(true);
        expect(createResult.value.status).toBe(ModelStatus.DRAFT);
        const modelId = createResult.value.modelId;

        // Verify model creation in repository
        const createdModel = await mockModelRepository.findById(modelId);
        expect(createdModel.isSuccess).toBe(true);
        expect(createdModel.value.name.toString()).toBe('Complete Lifecycle Model');

        // PHASE 2: UC-002 - Add Container Node (IO Input)
        const inputNodeResult = await addContainerUseCase.execute({
          modelId,
          nodeType: ContainerNodeType.IO_NODE,
          name: 'Input Node',
          description: 'Input processing node',
          position: { x: 100, y: 200 },
          userId: testUserId
        });

        expect(inputNodeResult.isSuccess).toBe(true);
        expect(inputNodeResult.value.nodeType).toBe(ContainerNodeType.IO_NODE);
        const inputNodeId = inputNodeResult.value.nodeId;

        // Add Processing Stage Container
        const stageNodeResult = await addContainerUseCase.execute({
          modelId,
          nodeType: ContainerNodeType.STAGE_NODE,
          name: 'Processing Stage',
          description: 'Main processing stage',
          position: { x: 300, y: 200 },
          userId: testUserId
        });

        expect(stageNodeResult.isSuccess).toBe(true);
        const stageNodeId = stageNodeResult.value.nodeId;

        // Add Output Node
        const outputNodeResult = await addContainerUseCase.execute({
          modelId,
          nodeType: ContainerNodeType.IO_NODE,
          name: 'Output Node',
          description: 'Output generation node',
          position: { x: 500, y: 200 },
          userId: testUserId
        });

        expect(outputNodeResult.isSuccess).toBe(true);
        const outputNodeId = outputNodeResult.value.nodeId;

        // PHASE 3: UC-003 - Add Action Nodes to Containers
        const inputActionResult = await addActionUseCase.execute({
          modelId,
          parentNodeId: inputNodeId,
          actionType: ActionNodeType.TETHER_NODE,
          name: 'Data Input Action',
          description: 'Processes incoming data',
          executionOrder: 1,
          configuration: {
            dataSource: 'external_api',
            validation: 'strict'
          },
          userId: testUserId
        });

        expect(inputActionResult.isSuccess).toBe(true);
        expect(inputActionResult.value.parentNodeId).toBe(inputNodeId);

        const processingActionResult = await addActionUseCase.execute({
          modelId,
          parentNodeId: stageNodeId,
          actionType: ActionNodeType.KB_NODE,
          name: 'Knowledge Processing',
          description: 'Processes data with knowledge base',
          executionOrder: 1,
          configuration: {
            knowledgeBase: 'primary_kb',
            processingMode: 'enhanced'
          },
          userId: testUserId
        });

        expect(processingActionResult.isSuccess).toBe(true);

        const outputActionResult = await addActionUseCase.execute({
          modelId,
          parentNodeId: outputNodeId,
          actionType: ActionNodeType.TETHER_NODE,
          name: 'Data Output Action',
          description: 'Generates final output',
          executionOrder: 1,
          configuration: {
            outputFormat: 'json',
            destination: 'external_system'
          },
          userId: testUserId
        });

        expect(outputActionResult.isSuccess).toBe(true);

        // PHASE 4: UC-004 - Validate and Publish Model
        const validateResult = await validateWorkflowUseCase.execute({
          modelId,
          userId: testUserId,
          validationLevel: 'full'
        });

        expect(validateResult.isSuccess).toBe(true);
        expect(validateResult.value.isValid).toBe(true);
        expect(validateResult.value.validationDetails.hasInputNode).toBe(true);
        expect(validateResult.value.validationDetails.hasOutputNode).toBe(true);
        expect(validateResult.value.validationDetails.hasProcessingStages).toBe(true);

        const publishResult = await publishModelUseCase.execute({
          modelId,
          userId: testUserId,
          publishNotes: 'Complete lifecycle test - ready for production',
          enforceValidation: true
        });

        expect(publishResult.isSuccess).toBe(true);
        expect(publishResult.value.status).toBe(ModelStatus.PUBLISHED);

        // PHASE 5: UC-005 - Execute Model Workflow
        const executeResult = await executeModelUseCase.execute({
          modelId,
          userId: testUserId,
          executionMode: ExecutionMode.SEQUENTIAL,
          inputData: {
            testData: 'Complete lifecycle execution',
            processingParams: { priority: 'high', quality: 'premium' }
          },
          executionOptions: {
            enableRetry: true,
            maxRetries: 3,
            timeoutMs: 300000
          }
        });

        expect(executeResult.isSuccess).toBe(true);
        expect(executeResult.value.status).toBe('completed');
        expect(executeResult.value.results).toBeDefined();
        expect(executeResult.value.results.nodesExecuted).toBe(3);
        expect(executeResult.value.results.actionsExecuted).toBe(3);

        // PHASE 6: Model Versioning (UC-007)
        const versionResult = await createVersionUseCase.execute({
          modelId,
          userId: testUserId,
          versionType: 'minor',
          versionNotes: 'Post-execution version update'
        });

        expect(versionResult.isSuccess).toBe(true);
        expect(versionResult.value.newVersion).toBe('1.1.0');

        // PHASE 7: Archive Model (UC-008)
        const archiveResult = await archiveModelUseCase.execute({
          modelId,
          userId: testUserId,
          archiveReason: 'End of lifecycle test - archiving for audit'
        });

        expect(archiveResult.isSuccess).toBe(true);
        expect(archiveResult.value.status).toBe(ModelStatus.ARCHIVED);
        expect(archiveResult.value.archivedAt).toBeDefined();

        // Verify complete audit trail
        const auditLogs = await mockAuditRepository.findByEntityId(modelId);
        expect(auditLogs.isSuccess).toBe(true);
        expect(auditLogs.value.length).toBeGreaterThan(6); // At least one log per major operation

        // Verify complete event history
        const events = mockEventBus.getEventsByAggregateId(modelId);
        expect(events.some(e => e.eventType === 'FunctionModelCreated')).toBe(true);
        expect(events.some(e => e.eventType === 'ContainerNodeAdded')).toBe(true);
        expect(events.some(e => e.eventType === 'ActionNodeAdded')).toBe(true);
        expect(events.some(e => e.eventType === 'FunctionModelPublished')).toBe(true);
        expect(events.some(e => e.eventType === 'FunctionModelExecuted')).toBe(true);
        expect(events.some(e => e.eventType === 'ModelVersionCreated')).toBe(true);
        expect(events.some(e => e.eventType === 'FunctionModelArchived')).toBe(true);

        // Verify final state
        const finalModel = await mockModelRepository.findById(modelId);
        expect(finalModel.value.status).toBe(ModelStatus.ARCHIVED);
        expect(finalModel.value.version.toString()).toBe('1.1.0');
      });
    });

    describe('DependencyViolationHandling_E2E', () => {
      it('should_PreventDependencyViolations_AndMaintainSystemIntegrity', async () => {
        // Test UC-002 dependency violation (add node to non-existent model)
        const nonExistentModelId = getTestUUID('non-existent');
        
        const addNodeResult = await addContainerUseCase.execute({
          modelId: nonExistentModelId,
          nodeType: NodeType.STAGE,
          name: 'Invalid Node',
          userId: testUserId
        });

        expect(addNodeResult.isFailure).toBe(true);
        expect(addNodeResult.error).toContain('not found');

        // Test UC-003 dependency violation (add action to non-existent container)
        const createResult = await createModelUseCase.execute({
          name: 'Dependency Test Model',
          description: 'Testing dependency violations',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const modelId = createResult.value.modelId;

        const nonExistentNodeId = getTestUUID('non-existent-node');
        const addActionResult = await addActionUseCase.execute({
          modelId,
          parentNodeId: nonExistentNodeId,
          actionType: ActionType.TETHER,
          name: 'Invalid Action',
          userId: testUserId
        });

        expect(addActionResult.isFailure).toBe(true);
        expect(addActionResult.error).toContain('container node not found');

        // Test UC-004 dependency violation (publish without valid structure)
        const publishResult = await publishModelUseCase.execute({
          modelId,
          userId: testUserId,
          publishNotes: 'Invalid publish attempt',
          enforceValidation: true
        });

        expect(publishResult.isFailure).toBe(true);
        expect(publishResult.error).toContain('validation');

        // Test UC-005 dependency violation (execute unpublished model)
        const executeResult = await executeModelUseCase.execute({
          modelId,
          userId: testUserId,
          executionMode: ExecutionMode.SEQUENTIAL,
          inputData: { test: 'data' }
        });

        expect(executeResult.isFailure).toBe(true);
        expect(executeResult.error).toContain('must be published');

        // Verify no invalid state changes occurred
        const model = await mockModelRepository.findById(modelId);
        expect(model.value.status).toBe(ModelStatus.DRAFT);
      });
    });
  });

  describe('COMPLEX EXECUTION PIPELINE: UC-005 coordinating UC-010,011,012,013', () => {
    describe('ComplexOrchestrationWorkflow_E2E', () => {
      it('should_CoordinateAllOrchestrationServices_InComplexExecution', async () => {
        // SETUP: Create complex model with hierarchical structure
        const mainModelResult = await createModelUseCase.execute({
          name: 'Complex Orchestration Pipeline',
          description: 'E2E test of complex orchestration coordination',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const mainModelId = mainModelResult.value.modelId;

        // Create nested model for fractal orchestration
        const nestedModelResult = await createModelUseCase.execute({
          name: 'Nested Model for Fractal Test',
          description: 'Nested model within main orchestration',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const nestedModelId = nestedModelResult.value.modelId;

        // Add container hierarchy
        const level1StageResult = await addContainerUseCase.execute({
          modelId: mainModelId,
          nodeType: NodeType.STAGE,
          name: 'Level 1 Orchestration Stage',
          description: 'Top-level orchestration stage',
          position: { x: 200, y: 100 },
          userId: testUserId
        });
        const level1StageId = level1StageResult.value.nodeId;

        const level2StageResult = await addContainerUseCase.execute({
          modelId: mainModelId,
          nodeType: NodeType.STAGE,
          name: 'Level 2 Processing Stage',
          description: 'Secondary processing stage',
          position: { x: 400, y: 100 },
          userId: testUserId
        });
        const level2StageId = level2StageResult.value.nodeId;

        // Add complex actions with dependencies
        const fractalActionResult = await addActionUseCase.execute({
          modelId: mainModelId,
          parentNodeId: level1StageId,
          actionType: ActionType.FUNCTION_MODEL_CONTAINER,
          name: 'Nested Model Execution',
          description: 'Executes nested model within main workflow',
          executionOrder: 1,
          configuration: {
            nestedModelId,
            contextMapping: { 
              'input.data': 'parent.input.data',
              'input.config': 'parent.config' 
            },
            outputExtraction: { 
              'result': 'nested.output.result',
              'metrics': 'nested.execution.metrics' 
            }
          },
          dependencies: [],
          userId: testUserId
        });

        const dependentActionResult = await addActionUseCase.execute({
          modelId: mainModelId,
          parentNodeId: level2StageId,
          actionType: ActionType.KB,
          name: 'Knowledge Enhancement',
          description: 'Enhances nested model output with knowledge base',
          executionOrder: 1,
          configuration: {
            knowledgeBase: 'enhancement_kb',
            inputSource: 'fractal.output'
          },
          dependencies: [fractalActionResult.value.nodeId],
          userId: testUserId
        });

        // UC-010: Configure Node Dependencies
        const dependencyResult = await nodeDependencyService.validateDependencies(mainModelId, [
          {
            sourceNodeId: fractalActionResult.value.nodeId,
            targetNodeId: dependentActionResult.value.nodeId,
            dependencyType: 'data_flow'
          }
        ]);

        expect(dependencyResult.isSuccess).toBe(true);
        expect(dependencyResult.value.hasCircularDependencies).toBe(false);

        // UC-011: Configure Hierarchical Context Access
        const contextAccessResult = await contextAccessUseCase.execute({
          command: 'configureHierarchy',
          request: {
            modelId: mainModelId,
            hierarchyConfig: {
              levels: [
                { nodeId: level1StageId, level: 1, accessRules: ['read', 'write', 'execute'] },
                { nodeId: level2StageId, level: 2, accessRules: ['read', 'write'], parentId: level1StageId }
              ],
              contextFlowRules: {
                siblingAccess: 'read-only',
                parentAccess: 'full',
                childAccess: 'restricted'
              }
            },
            userId: testUserId
          }
        });

        expect(contextAccessResult.isSuccess).toBe(true);
        expect(contextAccessResult.value.hierarchyConfigured).toBe(true);

        // UC-012: Configure Action Node Orchestration
        const orchestrationResult = await actionOrchestrationUseCase.execute({
          command: 'configureExecution',
          request: {
            modelId: mainModelId,
            orchestrationConfig: {
              executionMode: ExecutionMode.SEQUENTIAL,
              stageCoordination: {
                [level1StageId]: { mode: 'sequential', priority: 1 },
                [level2StageId]: { mode: 'conditional', priority: 2, condition: 'level1.success' }
              },
              actionCoordination: {
                parallelism: { maxConcurrent: 3 },
                retryPolicy: { maxAttempts: 3, backoffMultiplier: 2 },
                timeouts: { actionTimeout: 60000, stageTimeout: 300000 }
              }
            },
            userId: testUserId
          }
        });

        expect(orchestrationResult.isSuccess).toBe(true);
        expect(orchestrationResult.value.orchestrationConfigured).toBe(true);

        // UC-013: Configure Fractal Orchestration
        const fractalResult = await fractalOrchestrationUseCase.execute({
          operation: 'configureNestedExecution',
          request: {
            modelId: mainModelId,
            nestedModelId,
            fractalConfig: {
              executionLevels: 2,
              contextPropagation: {
                downward: ['input', 'config', 'permissions'],
                upward: ['output', 'metrics', 'logs']
              },
              resourceManagement: {
                memoryAllocation: '512Mi per level',
                timeoutScaling: 1.5
              }
            },
            userId: testUserId
          }
        });

        expect(fractalResult.isSuccess).toBe(true);
        expect(fractalResult.value.fractalConfigured).toBe(true);

        // Publish both models
        await publishModelUseCase.execute({
          modelId: nestedModelId,
          userId: testUserId,
          publishNotes: 'Nested model ready for fractal execution'
        });

        await publishModelUseCase.execute({
          modelId: mainModelId,
          userId: testUserId,
          publishNotes: 'Complex orchestration model ready'
        });

        // EXECUTE: Complex orchestration pipeline
        const executionResult = await executeModelUseCase.execute({
          modelId: mainModelId,
          userId: testUserId,
          executionMode: ExecutionMode.SEQUENTIAL,
          inputData: {
            data: 'Complex orchestration test data',
            config: { processing: 'enhanced', quality: 'high' },
            orchestrationLevel: 'full'
          },
          executionOptions: {
            enableComplexOrchestration: true,
            fractalExecution: true,
            contextHierarchy: true,
            dependencyValidation: true
          }
        });

        // VERIFY: Complex execution completed successfully
        expect(executionResult.isSuccess).toBe(true);
        expect(executionResult.value.status).toBe('completed');
        expect(executionResult.value.orchestrationResults).toBeDefined();
        expect(executionResult.value.orchestrationResults.levelsExecuted).toBe(2);
        expect(executionResult.value.orchestrationResults.fractalExecutions).toBe(1);
        expect(executionResult.value.orchestrationResults.dependenciesResolved).toBeGreaterThan(0);
        expect(executionResult.value.orchestrationResults.contextFlowsHandled).toBeGreaterThan(0);

        // Verify orchestration events
        const orchestrationEvents = mockEventBus.getEventsByType('OrchestrationCompleted');
        expect(orchestrationEvents.length).toBe(1);
        
        const fractalEvents = mockEventBus.getEventsByType('FractalExecutionCompleted');
        expect(fractalEvents.length).toBe(1);
        
        const contextEvents = mockEventBus.getEventsByType('ContextHierarchyProcessed');
        expect(contextEvents.length).toBeGreaterThan(0);
      });
    });

    describe('ErrorRecoveryInComplexPipeline_E2E', () => {
      it('should_RecoverFromFailures_AcrossComplexOrchestrationLayers', async () => {
        // SETUP: Create model with failure simulation
        const modelResult = await createModelUseCase.execute({
          name: 'Error Recovery Test Model',
          description: 'Tests error recovery in complex pipeline',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const modelId = modelResult.value.modelId;

        // Add stage with failure simulation
        const stageResult = await addContainerUseCase.execute({
          modelId,
          nodeType: NodeType.STAGE,
          name: 'Recovery Test Stage',
          userId: testUserId
        });
        const stageId = stageResult.value.nodeId;

        // Add action that will simulate failure and recovery
        await addActionUseCase.execute({
          modelId,
          parentNodeId: stageId,
          actionType: ActionType.TETHER,
          name: 'Failing Action',
          description: 'Action configured to fail initially',
          configuration: {
            simulateFailure: true,
            failureAttempts: 2, // Fail twice, succeed on third attempt
            recoveryStrategy: 'exponential_backoff'
          },
          userId: testUserId
        });

        // Configure error recovery
        const recoveryResult = await errorRecoveryUseCase.execute({
          command: 'configureRecovery',
          request: {
            modelId,
            recoveryConfig: {
              globalRetryPolicy: { maxAttempts: 3, initialDelayMs: 1000 },
              failureHandling: {
                continueOnFailure: false,
                compensationActions: ['rollback', 'notify', 'log'],
                escalationThreshold: 3
              },
              recoveryStrategies: {
                'transient_failure': 'retry',
                'resource_unavailable': 'wait_and_retry',
                'configuration_error': 'fail_fast'
              }
            },
            userId: testUserId
          }
        });

        expect(recoveryResult.isSuccess).toBe(true);

        // Publish model
        await publishModelUseCase.execute({
          modelId,
          userId: testUserId,
          publishNotes: 'Recovery test model ready'
        });

        // EXECUTE: Model with failure and recovery
        const executeResult = await executeModelUseCase.execute({
          modelId,
          userId: testUserId,
          executionMode: ExecutionMode.SEQUENTIAL,
          inputData: { triggerFailure: true },
          executionOptions: {
            enableRecovery: true,
            maxRecoveryAttempts: 3,
            recoveryLogging: true
          }
        });

        // VERIFY: Recovery succeeded
        expect(executeResult.isSuccess).toBe(true);
        expect(executeResult.value.status).toBe('completed');
        expect(executeResult.value.recoveryInfo).toBeDefined();
        expect(executeResult.value.recoveryInfo.recoveryAttempts).toBe(2);
        expect(executeResult.value.recoveryInfo.finalAttemptSucceeded).toBe(true);

        // Verify recovery events
        const recoveryEvents = mockEventBus.getEventsByType('ExecutionRecoveryAttempted');
        expect(recoveryEvents.length).toBe(2); // Two recovery attempts

        const successEvents = mockEventBus.getEventsByType('RecoverySuccessful');
        expect(successEvents.length).toBe(1);
      });
    });
  });

  describe('AI AGENT WORKFLOW: UC-017→UC-018→UC-019', () => {
    describe('CompleteAgentWorkflow_E2E', () => {
      it('should_ExecuteCompleteAgentWorkflow_FromRegistrationToExecution', async () => {
        // UC-017: Register AI Agent
        const agent1Registration = await registerAgentUseCase.execute({
          agentId: 'test-agent-processing',
          name: 'Data Processing Agent',
          description: 'Specialized in data transformation and analysis',
          capabilities: ['data_transformation', 'statistical_analysis', 'pattern_recognition'],
          version: '1.0.0',
          featureType: 'function_model',
          configuration: {
            resourceRequirements: { memory: '2Gi', cpu: '1core' },
            timeout: 60000,
            batchSize: 100
          },
          userId: testUserId
        });

        expect(agent1Registration.isSuccess).toBe(true);
        expect(agent1Registration.value.agentId).toBe('test-agent-processing');

        const agent2Registration = await registerAgentUseCase.execute({
          agentId: 'test-agent-nlp',
          name: 'Natural Language Processing Agent',
          description: 'Specialized in text analysis and language tasks',
          capabilities: ['text_analysis', 'sentiment_analysis', 'entity_extraction'],
          version: '1.2.0',
          featureType: 'function_model',
          configuration: {
            resourceRequirements: { memory: '4Gi', cpu: '2cores' },
            timeout: 90000,
            modelPath: '/models/nlp-enhanced'
          },
          userId: testUserId
        });

        expect(agent2Registration.isSuccess).toBe(true);

        // UC-018: Discover Agents by Capability
        const discoveryResult = await discoverAgentsUseCase.execute({
          requiredCapabilities: ['data_transformation'],
          optionalCapabilities: ['statistical_analysis'],
          featureType: 'function_model',
          userId: testUserId
        });

        expect(discoveryResult.isSuccess).toBe(true);
        expect(discoveryResult.value.matches.length).toBeGreaterThan(0);
        expect(discoveryResult.value.matches[0].agentId).toBe('test-agent-processing');
        expect(discoveryResult.value.matches[0].matchScore).toBeGreaterThan(0.8);

        // Test semantic search
        const semanticResult = await semanticSearchUseCase.execute({
          query: 'analyze text and extract meaningful insights',
          featureType: 'function_model',
          maxResults: 5,
          userId: testUserId
        });

        expect(semanticResult.isSuccess).toBe(true);
        expect(semanticResult.value.results.length).toBeGreaterThan(0);
        const nlpAgent = semanticResult.value.results.find(r => r.agentId === 'test-agent-nlp');
        expect(nlpAgent).toBeDefined();
        expect(nlpAgent.semanticScore).toBeGreaterThan(0.7);

        // UC-019: Execute AI Agent Task
        const taskExecutionResult = await executeAgentTaskUseCase.execute({
          agentId: 'test-agent-processing',
          taskDefinition: {
            taskType: 'data_transformation',
            inputData: {
              data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
              transformation: 'statistical_summary'
            },
            parameters: {
              includeOutliers: false,
              confidenceLevel: 0.95
            }
          },
          executionContext: {
            modelId: 'test-context-model',
            executionId: getTestUUID('execution'),
            userId: testUserId
          }
        });

        expect(taskExecutionResult.isSuccess).toBe(true);
        expect(taskExecutionResult.value.status).toBe('completed');
        expect(taskExecutionResult.value.results).toBeDefined();
        expect(taskExecutionResult.value.results.mean).toBeDefined();
        expect(taskExecutionResult.value.results.stdDev).toBeDefined();

        // Test workflow coordination with multiple agents
        const coordinationResult = await coordinateAgentUseCase.execute({
          workflowTasks: [
            {
              taskId: 'task-1',
              agentId: 'test-agent-processing',
              taskDefinition: {
                taskType: 'data_transformation',
                inputData: { raw: 'processing input data' }
              }
            },
            {
              taskId: 'task-2', 
              agentId: 'test-agent-nlp',
              taskDefinition: {
                taskType: 'text_analysis',
                inputData: { text: 'analyze this text content' }
              },
              dependencies: ['task-1'] // Depends on task-1 completion
            }
          ],
          executionMode: ExecutionMode.SEQUENTIAL,
          userId: testUserId
        });

        expect(coordinationResult.isSuccess).toBe(true);
        expect(coordinationResult.value.workflowStatus).toBe('completed');
        expect(coordinationResult.value.tasksCompleted).toBe(2);
        expect(coordinationResult.value.results).toBeDefined();
        expect(coordinationResult.value.results.length).toBe(2);

        // Verify agent performance was updated
        const agent1Updated = await mockAgentRepository.findById('test-agent-processing');
        expect(agent1Updated.isSuccess).toBe(true);
        const agent1Metrics = mockAgentRepository.getAgentMetrics('test-agent-processing');
        expect(agent1Metrics.tasksExecuted).toBeGreaterThan(0);
        expect(agent1Metrics.averageExecutionTime).toBeDefined();

        // Verify events were published
        const registrationEvents = mockEventBus.getEventsByType('AIAgentRegistered');
        expect(registrationEvents.length).toBe(2);

        const discoveryEvents = mockEventBus.getEventsByType('AgentCapabilityDiscovered');
        expect(discoveryEvents.length).toBeGreaterThan(0);

        const executionEvents = mockEventBus.getEventsByType('AIAgentTaskExecuted');
        expect(executionEvents.length).toBeGreaterThan(0);

        const coordinationEvents = mockEventBus.getEventsByType('AgentWorkflowCoordinated');
        expect(coordinationEvents.length).toBe(1);
      });
    });

    describe('AgentIntegrationWithModels_E2E', () => {
      it('should_IntegrateAgents_WithCompleteModelWorkflow', async () => {
        // SETUP: Register agents for model integration
        await registerAgentUseCase.execute({
          agentId: 'model-integration-agent',
          name: 'Model Integration Agent',
          description: 'Agent specialized for function model integration',
          capabilities: ['model_execution', 'workflow_optimization', 'result_analysis'],
          version: '1.0.0',
          featureType: 'function_model',
          userId: testUserId
        });

        // Create model with AI agent actions
        const modelResult = await createModelUseCase.execute({
          name: 'AI-Enhanced Workflow Model',
          description: 'Model that integrates AI agents into workflow',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const modelId = modelResult.value.modelId;

        // Add container
        const stageResult = await addContainerUseCase.execute({
          modelId,
          nodeType: NodeType.STAGE,
          name: 'AI Processing Stage',
          userId: testUserId
        });
        const stageId = stageResult.value.nodeId;

        // Add AI agent action
        const agentActionResult = await addActionUseCase.execute({
          modelId,
          parentNodeId: stageId,
          actionType: ActionType.AI_AGENT,
          name: 'AI Enhancement Action',
          description: 'Uses AI agent to enhance data processing',
          configuration: {
            agentId: 'model-integration-agent',
            taskDefinition: {
              taskType: 'workflow_optimization',
              parameters: { optimization: 'performance', quality: 'high' }
            },
            resultHandling: {
              outputMapping: { 'enhanced_data': 'agent.output.optimized' },
              errorHandling: 'retry_with_fallback'
            }
          },
          userId: testUserId
        });

        expect(agentActionResult.isSuccess).toBe(true);
        expect(agentActionResult.value.actionType).toBe(ActionType.AI_AGENT);

        // Publish and execute model with AI integration
        await publishModelUseCase.execute({
          modelId,
          userId: testUserId,
          publishNotes: 'AI-enhanced model ready'
        });

        const executeResult = await executeModelUseCase.execute({
          modelId,
          userId: testUserId,
          executionMode: ExecutionMode.SEQUENTIAL,
          inputData: {
            data: 'test data for AI enhancement',
            config: { ai_processing: true }
          }
        });

        expect(executeResult.isSuccess).toBe(true);
        expect(executeResult.value.status).toBe('completed');
        expect(executeResult.value.aiEnhancedResults).toBeDefined();
        expect(executeResult.value.agentExecutions).toBe(1);

        // Verify AI agent was called during execution
        const agentEvents = mockEventBus.getEventsByType('AIAgentTaskExecuted');
        expect(agentEvents.some(e => e.eventData.agentId === 'model-integration-agent')).toBe(true);
      });
    });
  });

  describe('CROSS-FEATURE INTEGRATION: UC-014→UC-015, UC-003→UC-014, UC-005→UC-019', () => {
    describe('CompleteCrossFeatureWorkflow_E2E', () => {
      it('should_ExecuteCompleteCrossFeatureIntegration_WithLinkingAndExecution', async () => {
        // SETUP: Create primary model
        const primaryModelResult = await createModelUseCase.execute({
          name: 'Cross-Feature Primary Model',
          description: 'Main model with cross-feature integration',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const primaryModelId = primaryModelResult.value.modelId;

        // Create secondary model (representing external feature)
        const secondaryModelResult = await createModelUseCase.execute({
          name: 'External Feature Model',
          description: 'Model representing external feature integration',
          userId: testUserId,
          organizationId: testOrganizationId
        });
        const secondaryModelId = secondaryModelResult.value.modelId;

        // Add containers to both models
        const primaryStageResult = await addContainerUseCase.execute({
          modelId: primaryModelId,
          nodeType: NodeType.STAGE,
          name: 'Primary Integration Stage',
          userId: testUserId
        });
        const primaryStageId = primaryStageResult.value.nodeId;

        const secondaryStageResult = await addContainerUseCase.execute({
          modelId: secondaryModelId,
          nodeType: NodeType.STAGE,
          name: 'Secondary Integration Stage',
          userId: testUserId
        });
        const secondaryStageId = secondaryStageResult.value.nodeId;

        // UC-014: Create Cross-Feature Link
        const crossFeatureLinkResult = await crossFeatureUseCase.execute({
          operation: 'createLink',
          request: {
            sourceFeature: {
              featureType: 'function_model',
              featureId: primaryModelId,
              nodeId: primaryStageId
            },
            targetFeature: {
              featureType: 'external_integration', // Simulated external feature
              featureId: secondaryModelId,
              nodeId: secondaryStageId
            },
            linkType: 'data_flow',
            linkMetadata: {
              dataMapping: {
                'primary.output': 'secondary.input',
                'primary.config': 'secondary.config'
              },
              constraints: {
                maxLatency: 5000,
                requiredFields: ['id', 'data', 'timestamp']
              }
            },
            userId: testUserId
          }
        });

        expect(crossFeatureLinkResult.isSuccess).toBe(true);
        expect(crossFeatureLinkResult.value.linkEstablished).toBe(true);
        const linkId = crossFeatureLinkResult.value.linkId;

        // UC-015: Calculate Link Strength
        const strengthResult = await crossFeatureUseCase.execute({
          operation: 'calculateStrength',
          request: {
            linkId,
            interactionData: {
              frequency: 0.8, // High frequency of interaction
              semanticSimilarity: 0.7, // Good semantic match
              contextRelevance: 0.9, // Highly relevant context
              successRate: 0.95 // High success rate
            },
            userId: testUserId
          }
        });

        expect(strengthResult.isSuccess).toBe(true);
        expect(strengthResult.value.linkStrength).toBeGreaterThan(0.8);
        expect(strengthResult.value.strengthComponents).toBeDefined();
        expect(strengthResult.value.strengthComponents.frequencyBonus).toBeDefined();
        expect(strengthResult.value.strengthComponents.semanticBonus).toBeDefined();

        // UC-003→UC-014: Add Cross-Feature Action to Primary Model
        const crossFeatureActionResult = await addActionUseCase.execute({
          modelId: primaryModelId,
          parentNodeId: primaryStageId,
          actionType: ActionType.CROSS_FEATURE,
          name: 'External Feature Integration',
          description: 'Action that integrates with external feature',
          configuration: {
            crossFeatureLinkId: linkId,
            targetFeature: {
              featureType: 'external_integration',
              featureId: secondaryModelId,
              endpoint: '/api/integration/process'
            },
            dataTransformation: {
              inputMapping: { 'data': 'payload.data', 'config': 'payload.config' },
              outputMapping: { 'result': 'response.processedData' }
            },
            integrationOptions: {
              timeout: 30000,
              retryPolicy: { maxAttempts: 3, backoffMs: 1000 },
              fallbackBehavior: 'return_partial_results'
            }
          },
          userId: testUserId
        });

        expect(crossFeatureActionResult.isSuccess).toBe(true);
        expect(crossFeatureActionResult.value.actionType).toBe(ActionType.CROSS_FEATURE);

        // Register AI agent for cross-feature integration
        await registerAgentUseCase.execute({
          agentId: 'cross-feature-agent',
          name: 'Cross-Feature Integration Agent',
          capabilities: ['cross_feature_orchestration', 'data_bridging', 'integration_monitoring'],
          featureType: 'integration',
          userId: testUserId
        });

        // Add AI agent action for enhanced integration
        const agentIntegrationResult = await addActionUseCase.execute({
          modelId: primaryModelId,
          parentNodeId: primaryStageId,
          actionType: ActionType.AI_AGENT,
          name: 'AI Integration Enhancement',
          configuration: {
            agentId: 'cross-feature-agent',
            taskDefinition: {
              taskType: 'cross_feature_orchestration',
              integrationContext: {
                linkId,
                sourceFeature: primaryModelId,
                targetFeature: secondaryModelId
              }
            }
          },
          executionOrder: 2,
          userId: testUserId
        });

        expect(agentIntegrationResult.isSuccess).toBe(true);

        // Publish both models
        await publishModelUseCase.execute({
          modelId: secondaryModelId,
          userId: testUserId,
          publishNotes: 'Secondary model ready for integration'
        });

        await publishModelUseCase.execute({
          modelId: primaryModelId,
          userId: testUserId,
          publishNotes: 'Primary model with cross-feature integration ready'
        });

        // UC-005→UC-019: Execute Model with Cross-Feature Integration
        const executionResult = await executeModelUseCase.execute({
          modelId: primaryModelId,
          userId: testUserId,
          executionMode: ExecutionMode.SEQUENTIAL,
          inputData: {
            data: 'cross-feature integration test data',
            integrationConfig: { 
              enableCrossFeature: true,
              aiEnhancement: true,
              monitorIntegration: true 
            }
          },
          executionOptions: {
            crossFeatureIntegration: true,
            agentCoordination: true,
            linkStrengthUpdating: true
          }
        });

        expect(executionResult.isSuccess).toBe(true);
        expect(executionResult.value.status).toBe('completed');
        expect(executionResult.value.crossFeatureResults).toBeDefined();
        expect(executionResult.value.crossFeatureResults.integrationsExecuted).toBe(1);
        expect(executionResult.value.crossFeatureResults.agentEnhancements).toBe(1);
        expect(executionResult.value.linkStrengthUpdates).toBeDefined();

        // Verify link strength was updated based on successful execution
        const updatedLink = await mockLinkRepository.findById(linkId);
        expect(updatedLink.isSuccess).toBe(true);
        expect(updatedLink.value.strength).toBeGreaterThan(0.8);

        // Verify cross-feature events
        const linkEvents = mockEventBus.getEventsByType('CrossFeatureLinkEstablished');
        expect(linkEvents.length).toBe(1);

        const strengthEvents = mockEventBus.getEventsByType('LinkStrengthCalculated');
        expect(strengthEvents.length).toBeGreaterThan(0);

        const integrationEvents = mockEventBus.getEventsByType('CrossFeatureIntegrationExecuted');
        expect(integrationEvents.length).toBe(1);

        const agentCoordinationEvents = mockEventBus.getEventsByType('CrossFeatureAgentCoordinated');
        expect(agentCoordinationEvents.length).toBe(1);

        // Test cycle detection for relationship safety
        const cycleResult = await crossFeatureUseCase.execute({
          operation: 'detectCycles',
          request: {
            featureNetwork: [
              { sourceId: primaryModelId, targetId: secondaryModelId, linkType: 'data_flow' },
              // Test potential cycle (should not exist)
            ],
            userId: testUserId
          }
        });

        expect(cycleResult.isSuccess).toBe(true);
        expect(cycleResult.value.cyclesDetected).toBe(false);
        expect(cycleResult.value.networkIntegrity).toBe('valid');
      });
    });
  });

  describe('APPLICATION SERVICES COORDINATION', () => {
    describe('CompleteServiceOrchestration_E2E', () => {
      it('should_CoordinateAllApplicationServices_InCompleteWorkflow', async () => {
        // Test all Application Services working together in a realistic scenario
        
        // PHASE 1: Function Model Management Service coordination
        const modelManagementResult = await modelManagementService.createCompleteWorkflow({
          modelDefinition: {
            name: 'Service Orchestration Test Model',
            description: 'Complete test of all application services working together',
            organizationId: testOrganizationId
          },
          workflowStructure: {
            inputNodes: [{ name: 'Data Input', type: 'io' }],
            processingStages: [
              { name: 'AI Processing Stage', type: 'stage' },
              { name: 'Integration Stage', type: 'stage' }
            ],
            outputNodes: [{ name: 'Results Output', type: 'io' }]
          },
          actions: [
            {
              name: 'AI Data Processing',
              type: 'ai_agent',
              stageIndex: 0,
              config: { agentType: 'data_processor' }
            },
            {
              name: 'Cross-Feature Integration',
              type: 'cross_feature',
              stageIndex: 1,
              config: { targetFeature: 'external_system' }
            }
          ],
          userId: testUserId
        });

        expect(modelManagementResult.isSuccess).toBe(true);
        const orchestrationModelId = modelManagementResult.value.modelId;

        // PHASE 2: AI Agent Management Service coordination
        const agentOrchestrationResult = await agentManagementService.orchestrateWorkflowAgents({
          modelId: orchestrationModelId,
          agentRequirements: [
            {
              capability: 'data_processing',
              priority: 'high',
              resourceRequirements: { memory: '4Gi' }
            },
            {
              capability: 'result_analysis', 
              priority: 'medium',
              resourceRequirements: { memory: '2Gi' }
            }
          ],
          coordinationStrategy: {
            executionMode: 'sequential',
            failureHandling: 'continue_with_fallback',
            performanceOptimization: true
          },
          userId: testUserId
        });

        expect(agentOrchestrationResult.isSuccess).toBe(true);
        expect(agentOrchestrationResult.value.agentsOrchestrated).toBeGreaterThan(0);

        // PHASE 3: Cross-Feature Integration Service coordination
        const integrationOrchestrationResult = await integrationService.orchestrateFeatureIntegrations({
          primaryFeature: {
            featureType: 'function_model',
            featureId: orchestrationModelId
          },
          integrationRequirements: [
            {
              targetFeature: 'knowledge_base',
              integrationType: 'data_enhancement',
              priority: 'high'
            },
            {
              targetFeature: 'external_api',
              integrationType: 'result_publishing',
              priority: 'medium'
            }
          ],
          orchestrationConfig: {
            linkStrengthThreshold: 0.7,
            enableAutomaticOptimization: true,
            monitorIntegrationHealth: true
          },
          userId: testUserId
        });

        expect(integrationOrchestrationResult.isSuccess).toBe(true);
        expect(integrationOrchestrationResult.value.integrationsConfigured).toBeGreaterThan(0);

        // PHASE 4: Execute complete orchestrated workflow
        const completeExecutionResult = await executeModelUseCase.execute({
          modelId: orchestrationModelId,
          userId: testUserId,
          executionMode: ExecutionMode.SEQUENTIAL,
          inputData: {
            testData: 'Complete application service coordination test',
            serviceOrchestration: {
              enableAllServices: true,
              coordinatedExecution: true,
              performanceMonitoring: true
            }
          },
          executionOptions: {
            useModelManagementService: true,
            useAgentManagementService: true,
            useCrossFeatureIntegrationService: true,
            enableServiceCoordination: true
          }
        });

        expect(completeExecutionResult.isSuccess).toBe(true);
        expect(completeExecutionResult.value.status).toBe('completed');
        expect(completeExecutionResult.value.serviceCoordinationResults).toBeDefined();
        expect(completeExecutionResult.value.serviceCoordinationResults.servicesUsed).toBe(3);
        expect(completeExecutionResult.value.serviceCoordinationResults.coordinationSuccessful).toBe(true);

        // Verify all services recorded their coordination
        const coordinationEvents = mockEventBus.getEventsByType('ServiceCoordinationCompleted');
        expect(coordinationEvents.length).toBe(3); // One from each service

        const modelServiceEvents = mockEventBus.getEventsByType('ModelManagementServiceExecuted');
        expect(modelServiceEvents.length).toBe(1);

        const agentServiceEvents = mockEventBus.getEventsByType('AgentManagementServiceExecuted');
        expect(agentServiceEvents.length).toBe(1);

        const integrationServiceEvents = mockEventBus.getEventsByType('IntegrationServiceExecuted');
        expect(integrationServiceEvents.length).toBe(1);

        // Verify complete audit trail across all services
        const allAuditLogs = await mockAuditRepository.findAll();
        expect(allAuditLogs.value.length).toBeGreaterThan(5); // Multiple services creating audit entries
      });
    });
  });
});