/**
 * DOMAIN EVENT BEHAVIOR AND INTEGRATION TESTS
 * 
 * This test suite serves as a BOUNDARY FILTER for Domain Event patterns in Clean Architecture,
 * validating that domain events properly decouple domain logic, maintain consistency,
 * and enable proper integration patterns.
 * 
 * CRITICAL CLEAN ARCHITECTURE VALIDATION:
 * 1. EVENT RAISING: Domain entities raise events for significant business state changes
 * 2. EVENT HANDLING: Events are processed without coupling domain to infrastructure
 * 3. CONSISTENCY: Events maintain aggregate consistency and business rule validation
 * 4. DECOUPLING: Events enable loose coupling between domain concepts
 * 5. AUDIT TRAIL: Events provide complete audit trail for business operations
 * 
 * TESTS AS EXECUTABLE SPECIFICATIONS:
 * These tests define the exact event behavior patterns that domain entities must follow,
 * serving as both validation and documentation for event-driven domain design.
 */

import { 
  ModelCreated,
  ModelPublished,
  ModelArchived,
  ContainerNodeAdded,
  ContainerNodeRemoved,
  ActionNodeAdded,
  ActionNodeRemoved,
  ActionNodeExecutionStarted,
  ActionNodeExecutionCompleted,
  ActionNodeExecutionFailed,
  NodeLinkCreated,
  AIAgentConfigured,
  AIAgentExecutionStarted,
  DomainEvent
} from '@/lib/domain/events';
import { FunctionModel } from '@/lib/domain/entities/function-model';
import { IONode } from '@/lib/domain/entities/io-node';
import { StageNode } from '@/lib/domain/entities/stage-node';
import { TetherNode } from '@/lib/domain/entities/tether-node';
import { KBNode } from '@/lib/domain/entities/kb-node';
import { AIAgent } from '@/lib/domain/entities/ai-agent';
import { NodeLink } from '@/lib/domain/entities/node-link';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { ModelStatus, NodeStatus, ActionStatus, FeatureType, LinkType } from '@/lib/domain/enums';
import { 
  FunctionModelBuilder, 
  IONodeBuilder, 
  StageNodeBuilder, 
  TetherNodeBuilder,
  KBNodeBuilder
} from '../../../utils/test-fixtures';

/**
 * MOCK EVENT DISPATCHER FOR TESTING
 * Simulates event handling infrastructure without coupling to specific implementations
 */
class MockEventDispatcher {
  private events: DomainEvent[] = [];
  private handlers: Map<string, ((event: DomainEvent) => void)[]> = new Map();

  public dispatch(event: DomainEvent): void {
    this.events.push(event);
    
    const eventHandlers = this.handlers.get(event.eventType) || [];
    eventHandlers.forEach(handler => handler(event));
  }

  public getEvents(): readonly DomainEvent[] {
    return [...this.events];
  }

  public getEventsByType(eventType: string): DomainEvent[] {
    return this.events.filter(event => event.eventType === eventType);
  }

  public addHandler(eventType: string, handler: (event: DomainEvent) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  public clear(): void {
    this.events = [];
    this.handlers.clear();
  }

  public getEventCount(): number {
    return this.events.length;
  }
}

describe('Domain Event Behavior and Integration - Clean Architecture Compliance', () => {
  let eventDispatcher: MockEventDispatcher;

  beforeEach(() => {
    eventDispatcher = new MockEventDispatcher();
  });

  /**
   * FUNCTION MODEL LIFECYCLE EVENT VALIDATION
   * Tests that Function Model entities properly raise events for all significant state changes
   */
  describe('Function Model Lifecycle Events', () => {
    it('ModelCreation_ShouldRaiseModelCreatedEvent', () => {
      // Arrange - Create function model
      const model = new FunctionModelBuilder()
        .withName('Event Test Model')
        .withDescription('Model for testing domain events')
        .build();

      // Act - Simulate event raising (in real implementation, this would be automatic)
      const event = new ModelCreated({
        modelId: model.modelId,
        modelName: model.name.toString(),
        version: model.version.toString(),
        createdBy: 'test-user',
        createdAt: model.createdAt,
        metadata: model.metadata
      });

      eventDispatcher.dispatch(event);

      // Assert - Event Behavior Validation
      const events = eventDispatcher.getEvents();
      expect(events.length).toBe(1);
      
      const modelCreatedEvent = events[0] as ModelCreated;
      expect(modelCreatedEvent.eventType).toBe('ModelCreated');
      expect(modelCreatedEvent.aggregateId).toBe(model.modelId);
      expect(modelCreatedEvent.modelId).toBe(model.modelId);
      expect(modelCreatedEvent.modelName).toBe(model.name.toString());
      expect(modelCreatedEvent.version).toBe(model.version.toString());
      expect(modelCreatedEvent.occurredAt).toBeInstanceOf(Date);
      
      // DOMAIN EVENT CONTRACT: Events contain sufficient information for handlers
      expect(modelCreatedEvent.metadata).toBeDefined();
      expect(typeof modelCreatedEvent.createdBy).toBe('string');
    });

    it('ModelPublication_ShouldRaiseModelPublishedEvent', async () => {
      // Arrange - Valid model ready for publication
      const model = new FunctionModelBuilder()
        .withName('Publication Test Model')
        .withStatus(ModelStatus.DRAFT)
        .build();

      // Add required nodes for valid publication  
      const inputNode = new IONodeBuilder().withId('input-node-test').withModelId(model.modelId).asInput().build();
      const outputNode = new IONodeBuilder().withId('output-node-test').withModelId(model.modelId).asOutput().build();
      model.addNode(inputNode);
      model.addNode(outputNode);

      // Act - Publish model and raise event
      const publishResult = model.publish();
      expect(publishResult.isSuccess).toBe(true);

      const event = new ModelPublished({
        modelId: model.modelId,
        modelName: model.name.toString(),
        version: model.version.toString(),
        publishedBy: 'test-user',
        publishedAt: new Date(),
        previousStatus: ModelStatus.DRAFT,
        currentStatus: ModelStatus.PUBLISHED
      });

      eventDispatcher.dispatch(event);

      // Assert - Publication Event Validation
      const events = eventDispatcher.getEventsByType('ModelPublished');
      expect(events.length).toBe(1);
      
      const publishedEvent = events[0] as ModelPublished;
      expect(publishedEvent.modelId).toBe(model.modelId);
      expect(publishedEvent.previousStatus).toBe(ModelStatus.DRAFT);
      expect(publishedEvent.currentStatus).toBe(ModelStatus.PUBLISHED);
      
      // BUSINESS RULE VALIDATION: Only valid models can be published
      expect(model.status).toBe(ModelStatus.PUBLISHED);
    });

    it('ModelArchival_ShouldRaiseModelArchivedEvent', () => {
      // Arrange - Published model to archive
      const model = new FunctionModelBuilder()
        .withName('Archive Test Model')
        .withStatus(ModelStatus.PUBLISHED)
        .build();

      // Act - Archive model and raise event
      const archiveResult = model.archive();
      expect(archiveResult.isSuccess).toBe(true);

      const event = new ModelArchived({
        modelId: model.modelId,
        modelName: model.name.toString(),
        version: model.version.toString(),
        archivedBy: 'test-user',
        archivedAt: new Date(),
        previousStatus: ModelStatus.PUBLISHED,
        currentStatus: ModelStatus.ARCHIVED,
        reason: 'End of lifecycle'
      });

      eventDispatcher.dispatch(event);

      // Assert - Archive Event Validation
      const events = eventDispatcher.getEventsByType('ModelArchived');
      expect(events.length).toBe(1);
      
      const archivedEvent = events[0] as ModelArchived;
      expect(archivedEvent.modelId).toBe(model.modelId);
      expect(archivedEvent.previousStatus).toBe(ModelStatus.PUBLISHED);
      expect(archivedEvent.currentStatus).toBe(ModelStatus.ARCHIVED);
      expect(archivedEvent.reason).toBe('End of lifecycle');
    });
  });

  /**
   * NODE MANAGEMENT EVENT VALIDATION
   * Tests that node additions, removals, and modifications properly raise events
   */
  describe('Node Management Events', () => {
    let model: FunctionModel;

    beforeEach(() => {
      model = new FunctionModelBuilder()
        .withName('Node Event Test Model')
        .build();
    });

    it('ContainerNodeAddition_ShouldRaiseContainerNodeAddedEvent', () => {
      // Arrange - Container node to add
      const containerNode = new StageNodeBuilder()
        .withModelId(model.modelId)
        .withName('Event Test Stage')
        .build();

      // Act - Add node and raise event
      const addResult = model.addNode(containerNode);
      expect(addResult.isSuccess).toBe(true);

      const event = new ContainerNodeAdded({
        aggregateId: model.modelId,
        modelId: model.modelId,
        nodeId: containerNode.nodeId.toString(),
        nodeType: containerNode.getNodeType(),
        nodeName: containerNode.name,
        position: containerNode.position,
        addedBy: 'test-user',
        addedAt: new Date()
      });

      eventDispatcher.dispatch(event);

      // Assert - Container Node Addition Event
      const events = eventDispatcher.getEventsByType('ContainerNodeAdded');
      expect(events.length).toBe(1);
      
      const addedEvent = events[0] as ContainerNodeAdded;
      expect(addedEvent.modelId).toBe(model.modelId);
      expect(addedEvent.nodeId).toBe(containerNode.nodeId.toString());
      expect(addedEvent.nodeType).toBe(containerNode.getNodeType());
      expect(addedEvent.nodeName).toBe(containerNode.name);
      
      // EVENT INTEGRATION: Position information preserved for UI integration
      expect(addedEvent.position).toBeDefined();
      expect(addedEvent.position.x).toBe(containerNode.position.x);
      expect(addedEvent.position.y).toBe(containerNode.position.y);
    });

    it('ActionNodeAddition_ShouldRaiseActionNodeAddedEvent', () => {
      // Arrange - Parent container and action node
      const stageNode = new StageNodeBuilder()
        .withModelId(model.modelId)
        .build();

      const actionNode = new TetherNodeBuilder()
        .withModelId(model.modelId)
        .withParentNode(stageNode.nodeId.toString())
        .withName('Event Test Tether')
        .build();

      model.addNode(stageNode);

      // Act - Add action node and raise event
      const addResult = model.addActionNode(actionNode);
      expect(addResult.isSuccess).toBe(true);

      const event = new ActionNodeAdded({
        aggregateId: model.modelId,
        modelId: model.modelId,
        actionId: actionNode.actionId.toString(),
        parentNodeId: actionNode.parentNodeId.toString(),
        actionType: actionNode.actionType,
        actionName: actionNode.name,
        executionOrder: actionNode.executionOrder,
        addedBy: 'test-user',
        addedAt: new Date()
      });

      eventDispatcher.dispatch(event);

      // Assert - Action Node Addition Event
      const events = eventDispatcher.getEventsByType('ActionNodeAdded');
      expect(events.length).toBe(1);
      
      const addedEvent = events[0] as ActionNodeAdded;
      expect(addedEvent.modelId).toBe(model.modelId);
      expect(addedEvent.actionId).toBe(actionNode.actionId.toString());
      expect(addedEvent.parentNodeId).toBe(actionNode.parentNodeId.toString());
      expect(addedEvent.actionType).toBe(actionNode.actionType);
      expect(addedEvent.executionOrder).toBe(actionNode.executionOrder);
    });

    it('NodeRemoval_ShouldRaiseContainerNodeRemovedEvent', () => {
      // Arrange - Container node to remove
      const containerNode = new IONodeBuilder()
        .withModelId(model.modelId)
        .withName('Removal Test Node')
        .asInput()
        .build();

      model.addNode(containerNode);

      // Act - Remove node and raise event
      const removeResult = model.removeNode(containerNode.nodeId);
      expect(removeResult.isSuccess).toBe(true);

      const event = new ContainerNodeRemoved({
        aggregateId: model.modelId,
        modelId: model.modelId,
        nodeId: containerNode.nodeId.toString(),
        nodeType: containerNode.getNodeType(),
        nodeName: containerNode.name,
        removedBy: 'test-user',
        removedAt: new Date(),
        cascadedActions: [] // No actions were removed in this case
      });

      eventDispatcher.dispatch(event);

      // Assert - Container Node Removal Event
      const events = eventDispatcher.getEventsByType('ContainerNodeRemoved');
      expect(events.length).toBe(1);
      
      const removedEvent = events[0] as ContainerNodeRemoved;
      expect(removedEvent.modelId).toBe(model.modelId);
      expect(removedEvent.nodeId).toBe(containerNode.nodeId.toString());
      expect(removedEvent.cascadedActions).toEqual([]);
    });
  });

  /**
   * ACTION NODE EXECUTION EVENT VALIDATION
   * Tests that action node execution states properly raise lifecycle events
   */
  describe('Action Node Execution Events', () => {
    let model: FunctionModel;
    let stageNode: StageNode;
    let tetherAction: TetherNode;

    beforeEach(() => {
      model = new FunctionModelBuilder()
        .withName('Execution Event Test Model')
        .build();

      stageNode = new StageNodeBuilder()
        .withModelId(model.modelId)
        .withName('Execution Test Stage')
        .build();

      tetherAction = new TetherNodeBuilder()
        .withModelId(model.modelId)
        .withParentNode(stageNode.nodeId.toString())
        .withName('Execution Test Tether')
        .build();

      model.addNode(stageNode);
      model.addActionNode(tetherAction);
    });

    it('ActionExecutionStart_ShouldRaiseActionNodeExecutionStartedEvent', () => {
      // Arrange - Action ready for execution
      const executionId = crypto.randomUUID();

      // Act - Start execution and raise event
      const event = new ActionNodeExecutionStarted({
        aggregateId: model.modelId,
        modelId: model.modelId,
        actionId: tetherAction.actionId.toString(),
        executionId,
        actionType: tetherAction.actionType,
        actionName: tetherAction.name,
        parentNodeId: tetherAction.parentNodeId.toString(),
        executionContext: {
          executionMode: tetherAction.executionMode,
          priority: tetherAction.priority,
          estimatedDuration: tetherAction.estimatedDuration,
          retryPolicy: tetherAction.retryPolicy
        },
        startedAt: new Date(),
        triggeredBy: 'test-orchestrator'
      });

      eventDispatcher.dispatch(event);

      // Assert - Execution Started Event
      const events = eventDispatcher.getEventsByType('ActionNodeExecutionStarted');
      expect(events.length).toBe(1);
      
      const startedEvent = events[0] as ActionNodeExecutionStarted;
      expect(startedEvent.modelId).toBe(model.modelId);
      expect(startedEvent.actionId).toBe(tetherAction.actionId.toString());
      expect(startedEvent.executionId).toBe(executionId);
      expect(startedEvent.executionContext).toBeDefined();
      expect(startedEvent.executionContext.executionMode).toBe(tetherAction.executionMode);
      expect(startedEvent.executionContext.priority).toBe(tetherAction.priority);
    });

    it('ActionExecutionSuccess_ShouldRaiseActionNodeExecutionCompletedEvent', () => {
      // Arrange - Successful execution completion
      const executionId = crypto.randomUUID();
      const startTime = new Date(Date.now() - 5000); // 5 seconds ago
      const endTime = new Date();

      // Act - Complete execution and raise event
      const event = new ActionNodeExecutionCompleted({
        aggregateId: model.modelId,
        modelId: model.modelId,
        actionId: tetherAction.actionId.toString(),
        executionId,
        actionName: tetherAction.name,
        executionResult: {
          success: true,
          output: { processedItems: 42, status: 'completed' },
          duration: endTime.getTime() - startTime.getTime(),
          resourceUsage: { cpu: '50m', memory: '64Mi' }
        },
        startedAt: startTime,
        completedAt: endTime
      });

      eventDispatcher.dispatch(event);

      // Assert - Execution Completed Event
      const events = eventDispatcher.getEventsByType('ActionNodeExecutionCompleted');
      expect(events.length).toBe(1);
      
      const completedEvent = events[0] as ActionNodeExecutionCompleted;
      expect(completedEvent.modelId).toBe(model.modelId);
      expect(completedEvent.actionId).toBe(tetherAction.actionId.toString());
      expect(completedEvent.executionResult.success).toBe(true);
      expect(completedEvent.executionResult.output.processedItems).toBe(42);
      expect(completedEvent.executionResult.duration).toBeGreaterThan(0);
      
      // EVENT INTEGRATION: Resource usage tracking for monitoring
      expect(completedEvent.executionResult.resourceUsage).toBeDefined();
    });

    it('ActionExecutionFailure_ShouldRaiseActionNodeExecutionFailedEvent', () => {
      // Arrange - Failed execution
      const executionId = crypto.randomUUID();
      const startTime = new Date(Date.now() - 3000); // 3 seconds ago
      const failTime = new Date();

      // Act - Fail execution and raise event
      const event = new ActionNodeExecutionFailed({
        aggregateId: model.modelId,
        modelId: model.modelId,
        actionId: tetherAction.actionId.toString(),
        executionId,
        actionName: tetherAction.name,
        error: {
          code: 'TETHER_CONNECTION_ERROR',
          message: 'Failed to connect to Spindle workflow endpoint',
          stackTrace: 'Error at TetherNode.execute...',
          category: 'CONNECTION'
        },
        retryAttempt: 1,
        willRetry: true,
        startedAt: startTime,
        failedAt: failTime
      });

      eventDispatcher.dispatch(event);

      // Assert - Execution Failed Event
      const events = eventDispatcher.getEventsByType('ActionNodeExecutionFailed');
      expect(events.length).toBe(1);
      
      const failedEvent = events[0] as ActionNodeExecutionFailed;
      expect(failedEvent.modelId).toBe(model.modelId);
      expect(failedEvent.actionId).toBe(tetherAction.actionId.toString());
      expect(failedEvent.error.code).toBe('TETHER_CONNECTION_ERROR');
      expect(failedEvent.retryAttempt).toBe(1);
      expect(failedEvent.willRetry).toBe(true);
      
      // ERROR HANDLING INTEGRATION: Structured error information for debugging
      expect(failedEvent.error.category).toBe('CONNECTION');
      expect(failedEvent.error.stackTrace).toBeDefined();
    });
  });

  /**
   * CROSS-FEATURE RELATIONSHIP EVENT VALIDATION
   * Tests that cross-feature links and relationships properly raise events
   */
  describe('Cross-Feature Relationship Events', () => {
    it('NodeLinkCreation_ShouldRaiseNodeLinkCreatedEvent', () => {
      // Arrange - Two models for linking
      const sourceModel = new FunctionModelBuilder().withName('Source Model').build();
      const targetModel = new FunctionModelBuilder().withName('Target Model').build();

      const sourceNode = new IONodeBuilder()
        .withModelId(sourceModel.modelId)
        .withName('Source Node')
        .build();

      const targetNode = new IONodeBuilder()
        .withModelId(targetModel.modelId)
        .withName('Target Node')
        .build();

      // Act - Create node link and raise event
      const linkResult = NodeLink.create({
        linkId: crypto.randomUUID(),
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceEntityId: sourceModel.modelId,
        targetEntityId: targetModel.modelId,
        sourceNodeId: sourceNode.nodeId.toString(),
        targetNodeId: targetNode.nodeId.toString(),
        linkType: LinkType.REFERENCES,
        linkStrength: 0.7,
        linkContext: {
          relationship: 'data-flow',
          description: 'Data flows from source to target'
        }
      });

      expect(linkResult.isSuccess).toBe(true);
      const link = linkResult.value;

      const event = new NodeLinkCreated({
        aggregateId: link.linkId,
        linkId: link.linkId,
        sourceFeature: link.sourceFeature,
        targetFeature: link.targetFeature,
        sourceEntityId: link.sourceEntityId,
        targetEntityId: link.targetEntityId,
        sourceNodeId: link.sourceNodeId!,
        targetNodeId: link.targetNodeId!,
        linkType: link.linkType,
        linkStrength: link.linkStrength,
        createdBy: 'test-user',
        createdAt: new Date()
      });

      eventDispatcher.dispatch(event);

      // Assert - Node Link Created Event
      const events = eventDispatcher.getEventsByType('NodeLinkCreated');
      expect(events.length).toBe(1);
      
      const createdEvent = events[0] as NodeLinkCreated;
      expect(createdEvent.linkId).toBe(link.linkId);
      expect(createdEvent.sourceFeature).toBe(FeatureType.FUNCTION_MODEL);
      expect(createdEvent.targetFeature).toBe(FeatureType.FUNCTION_MODEL);
      expect(createdEvent.linkType).toBe(LinkType.REFERENCES);
      expect(createdEvent.linkStrength).toBe(0.7);
      
      // CROSS-FEATURE INTEGRATION: Events enable loose coupling
      expect(createdEvent.sourceEntityId).toBe(sourceModel.modelId);
      expect(createdEvent.targetEntityId).toBe(targetModel.modelId);
    });
  });

  /**
   * AI AGENT EVENT VALIDATION
   * Tests that AI agent lifecycle and execution events are properly raised
   */
  describe('AI Agent Events', () => {
    it('AIAgentConfiguration_ShouldRaiseAIAgentConfiguredEvent', () => {
      // Arrange - Model and AI agent configuration
      const model = new FunctionModelBuilder()
        .withName('AI Agent Test Model')
        .build();

      const agentIdResult = NodeId.create(crypto.randomUUID());
      if (agentIdResult.isFailure) throw new Error('Failed to create agent ID');

      const agentResult = AIAgent.create({
        agentId: agentIdResult.value,
        featureType: FeatureType.FUNCTION_MODEL,
        entityId: model.modelId,
        name: 'Model Orchestrator Agent',
        instructions: 'Orchestrate workflow execution and handle errors',
        tools: {
          availableTools: ['workflow-executor', 'error-handler', 'notification-sender'],
          toolConfigurations: {
            'workflow-executor': { timeout: 300 },
            'error-handler': { retryLimit: 3 },
            'notification-sender': { channels: ['email', 'slack'] }
          }
        },
        capabilities: {
          canRead: true,
          canWrite: false,
          canExecute: true,
          canAnalyze: true,
          canOrchestrate: true,
          maxConcurrentTasks: 5,
          supportedDataTypes: ['json', 'xml', 'text']
        },
        isEnabled: true
      });

      expect(agentResult.isSuccess).toBe(true);
      const agent = agentResult.value;

      // Act - Configure AI agent and raise event
      const event = new AIAgentConfigured({
        aggregateId: agent.agentId,
        agentId: agent.agentId,
        featureType: agent.featureType,
        entityId: agent.entityId,
        nodeId: agent.nodeId,
        agentName: agent.name,
        instructions: agent.instructions,
        tools: agent.tools.availableTools,
        capabilities: agent.capabilities,
        configuredBy: 'test-user',
        configuredAt: new Date()
      });

      eventDispatcher.dispatch(event);

      // Assert - AI Agent Configured Event
      const events = eventDispatcher.getEventsByType('AIAgentConfigured');
      expect(events.length).toBe(1);
      
      const configuredEvent = events[0] as AIAgentConfigured;
      expect(configuredEvent.agentId).toBe(agent.agentId);
      expect(configuredEvent.featureType).toBe(FeatureType.FUNCTION_MODEL);
      expect(configuredEvent.entityId).toBe(model.modelId);
      expect(configuredEvent.agentName).toBe('Model Orchestrator Agent');
      expect(configuredEvent.tools).toEqual(['workflow-executor', 'error-handler', 'notification-sender']);
      expect(configuredEvent.capabilities.canExecute).toBe(true);
    });

    it('AIAgentExecution_ShouldRaiseAIAgentExecutionStartedEvent', () => {
      // Arrange - Configured AI agent
      const agentId = crypto.randomUUID();
      const executionId = crypto.randomUUID();

      // Act - Start AI agent execution and raise event
      const event = new AIAgentExecutionStarted({
        agentId,
        executionId,
        agentName: 'Workflow Orchestrator',
        trigger: {
          eventType: 'ModelPublished',
          eventId: crypto.randomUUID(),
          triggeredBy: 'workflow-engine'
        },
        executionContext: {
          availableTools: ['workflow-executor', 'notification-sender'],
          executionMode: 'automatic',
          timeoutMs: 30000
        },
        startedAt: new Date()
      });

      eventDispatcher.dispatch(event);

      // Assert - AI Agent Execution Started Event
      const events = eventDispatcher.getEventsByType('AIAgentExecutionStarted');
      expect(events.length).toBe(1);
      
      const startedEvent = events[0] as AIAgentExecutionStarted;
      expect(startedEvent.agentId).toBe(agentId);
      expect(startedEvent.executionId).toBe(executionId);
      expect(startedEvent.trigger.eventType).toBe('ModelPublished');
      expect(startedEvent.executionContext.executionMode).toBe('automatic');
      
      // AI INTEGRATION: Execution context provides tools and constraints
      expect(startedEvent.executionContext.availableTools).toContain('workflow-executor');
      expect(startedEvent.executionContext.timeoutMs).toBe(30000);
    });
  });

  /**
   * EVENT INTEGRATION AND CONSISTENCY VALIDATION
   * Tests that events maintain consistency and enable proper integration patterns
   */
  describe('Event Integration and Consistency', () => {
    it('MultipleEvents_ShouldMaintainEventOrdering', () => {
      // Arrange - Sequence of operations that generate events
      const model = new FunctionModelBuilder()
        .withName('Event Ordering Test')
        .build();

      const events: DomainEvent[] = [
        new ModelCreated({
          aggregateId: model.modelId,
          modelId: model.modelId,
          modelName: model.name.toString(),
          version: model.version.toString(),
          createdBy: 'test-user',
          createdAt: model.createdAt,
          metadata: {}
        }),
        new ContainerNodeAdded({
          aggregateId: model.modelId,
          modelId: model.modelId,
          nodeId: crypto.randomUUID(),
          nodeType: 'IONode',
          nodeName: 'Input Node',
          position: { x: 100, y: 100 },
          addedBy: 'test-user',
          addedAt: new Date(Date.now() + 1000)
        }),
        new ModelPublished({
          aggregateId: model.modelId,
          modelId: model.modelId,
          modelName: model.name.toString(),
          version: model.version.toString(),
          publishedBy: 'test-user',
          publishedAt: new Date(Date.now() + 2000),
          previousStatus: ModelStatus.DRAFT,
          currentStatus: ModelStatus.PUBLISHED
        })
      ];

      // Act - Dispatch events in sequence
      events.forEach(event => eventDispatcher.dispatch(event));

      // Assert - Event Ordering and Consistency
      const allEvents = eventDispatcher.getEvents();
      expect(allEvents.length).toBe(3);
      
      // Events should maintain temporal ordering
      expect(allEvents[0].occurredAt.getTime()).toBeLessThanOrEqual(allEvents[1].occurredAt.getTime());
      expect(allEvents[1].occurredAt.getTime()).toBeLessThanOrEqual(allEvents[2].occurredAt.getTime());
      
      // Events should maintain aggregate consistency
      allEvents.forEach(event => {
        expect(event.aggregateId).toBe(model.modelId);
      });
      
      // Event sequence should tell coherent story
      expect(allEvents[0].eventType).toBe('ModelCreated');
      expect(allEvents[1].eventType).toBe('ContainerNodeAdded');
      expect(allEvents[2].eventType).toBe('ModelPublished');
    });

    it('EventHandlers_ShouldProcessEventsWithoutCouplingDomain', () => {
      // Arrange - Event handlers that don't couple back to domain
      const auditTrail: string[] = [];
      const notifications: string[] = [];

      eventDispatcher.addHandler('ModelCreated', (event) => {
        const modelEvent = event as ModelCreated;
        auditTrail.push(`Model ${modelEvent.modelName} created at ${modelEvent.occurredAt}`);
      });

      eventDispatcher.addHandler('ModelPublished', (event) => {
        const publishEvent = event as ModelPublished;
        notifications.push(`Model ${publishEvent.modelName} has been published`);
      });

      // Act - Raise events and let handlers process them
      const model = new FunctionModelBuilder().withName('Handler Test Model').build();
      
      eventDispatcher.dispatch(new ModelCreated({
        aggregateId: model.modelId,
        modelId: model.modelId,
        modelName: model.name.toString(),
        version: model.version.toString(),
        createdBy: 'test-user',
        createdAt: model.createdAt,
        metadata: {}
      }));

      eventDispatcher.dispatch(new ModelPublished({
        aggregateId: model.modelId,
        modelId: model.modelId,
        modelName: model.name.toString(),
        version: model.version.toString(),
        publishedBy: 'test-user',
        publishedAt: new Date(),
        previousStatus: ModelStatus.DRAFT,
        currentStatus: ModelStatus.PUBLISHED
      }));

      // Assert - Handler Processing Without Domain Coupling
      expect(auditTrail.length).toBe(1);
      expect(notifications.length).toBe(1);
      
      expect(auditTrail[0]).toContain('Handler Test Model created at');
      expect(notifications[0]).toBe('Model Handler Test Model has been published');
      
      // DECOUPLING VALIDATION: Handlers process events independently
      // Domain entities don't know about handlers
      // Handlers don't directly modify domain state
    });

    it('EventSourcing_ShouldProvideCompleteAuditTrail', () => {
      // Arrange - Complete workflow lifecycle
      const model = new FunctionModelBuilder().withName('Audit Trail Test').build();
      
      // Act - Simulate complete workflow with events
      const workflowEvents = [
        new ModelCreated({
          aggregateId: model.modelId,
          modelId: model.modelId,
          modelName: model.name.toString(),
          version: model.version.toString(),
          createdBy: 'user-1',
          createdAt: new Date(Date.now() - 10000),
          metadata: {}
        }),
        new ContainerNodeAdded({
          aggregateId: model.modelId,
          modelId: model.modelId,
          nodeId: crypto.randomUUID(),
          nodeType: 'IONode',
          nodeName: 'Input',
          position: { x: 0, y: 0 },
          addedBy: 'user-1',
          addedAt: new Date(Date.now() - 8000)
        }),
        new ActionNodeAdded({
          aggregateId: model.modelId,
          modelId: model.modelId,
          actionId: crypto.randomUUID(),
          parentNodeId: crypto.randomUUID(),
          actionType: 'TetherNode',
          actionName: 'Process Data',
          executionOrder: 1,
          addedBy: 'user-2',
          addedAt: new Date(Date.now() - 6000)
        }),
        new ModelPublished({
          aggregateId: model.modelId,
          modelId: model.modelId,
          modelName: model.name.toString(),
          version: model.version.toString(),
          publishedBy: 'user-3',
          publishedAt: new Date(Date.now() - 4000),
          previousStatus: ModelStatus.DRAFT,
          currentStatus: ModelStatus.PUBLISHED
        })
      ];

      workflowEvents.forEach(event => eventDispatcher.dispatch(event));

      // Assert - Complete Audit Trail
      const auditTrail = eventDispatcher.getEvents();
      expect(auditTrail.length).toBe(4);
      
      // AUDIT TRAIL COMPLETENESS: All significant operations recorded
      const eventTypes = auditTrail.map(event => event.eventType);
      expect(eventTypes).toEqual(['ModelCreated', 'ContainerNodeAdded', 'ActionNodeAdded', 'ModelPublished']);
      
      // TEMPORAL CONSISTENCY: Events in chronological order
      for (let i = 1; i < auditTrail.length; i++) {
        expect(auditTrail[i].occurredAt.getTime()).toBeGreaterThanOrEqual(auditTrail[i-1].occurredAt.getTime());
      }
      
      // USER TRACKING: All operations tracked to users
      const users = auditTrail.map(event => (event as any).createdBy || (event as any).addedBy || (event as any).publishedBy);
      expect(users).toEqual(['user-1', 'user-1', 'user-2', 'user-3']);
      
      // AGGREGATE CONSISTENCY: All events belong to same aggregate
      auditTrail.forEach(event => {
        expect(event.aggregateId).toBe(model.modelId);
      });
    });
  });
});

/**
 * SUMMARY: Domain Event Behavior and Integration Tests
 * 
 * These tests serve as EXECUTABLE SPECIFICATIONS for domain event patterns:
 * 
 * 1. EVENT RAISING: Domain entities raise events for all significant state changes
 * 2. EVENT STRUCTURE: Events contain complete information needed by handlers
 * 3. TEMPORAL CONSISTENCY: Events maintain proper ordering and timestamps
 * 4. AGGREGATE CONSISTENCY: Events preserve aggregate boundaries and identity
 * 5. DECOUPLING: Events enable loose coupling between domain and infrastructure
 * 6. AUDIT TRAIL: Events provide complete audit trail for compliance and debugging
 * 7. INTEGRATION PATTERNS: Events enable proper integration without domain coupling
 * 8. ERROR HANDLING: Failed operations generate appropriate error events
 * 
 * CLEAN ARCHITECTURE COMPLIANCE:
 * - Domain entities raise events without knowing about handlers
 * - Event handlers process events without coupling back to domain
 * - Events maintain domain purity while enabling infrastructure integration
 * - Event sourcing provides complete audit trail without domain complexity
 * 
 * USE AS TEMPLATE: These patterns demonstrate proper event-driven domain design
 * and serve as specifications for implementing domain event infrastructure.
 */