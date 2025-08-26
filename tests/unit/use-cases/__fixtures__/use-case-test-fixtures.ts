import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { IONode } from '../../../../lib/domain/entities/io-node';
import { StageNode } from '../../../../lib/domain/entities/stage-node';
import { TetherNode } from '../../../../lib/domain/entities/tether-node';
import { KBNode } from '../../../../lib/domain/entities/kb-node';
import { FunctionModelContainerNode } from '../../../../lib/domain/entities/function-model-container-node';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { Position } from '../../../../lib/domain/value-objects/position';
import { RACI } from '../../../../lib/domain/value-objects/raci';
import { RetryPolicy } from '../../../../lib/domain/value-objects/retry-policy';
import { ExecutionContext } from '../../../../lib/domain/value-objects/execution-context';
import { ModelStatus, NodeType, ExecutionMode, ContainerNodeType, NodeStatus, ActionNodeType } from '../../../../lib/domain/enums';
import { Result } from '../../../../lib/domain/shared/result';

/**
 * Test Fixtures for Application Layer Use Case Testing
 * 
 * Provides standardized test data that follows Clean Architecture patterns
 * and supports comprehensive use case testing scenarios.
 */
export class UseCaseTestFixtures {
  
  // =============================================================================
  // COMMAND/QUERY FIXTURES
  // =============================================================================
  
  static createValidCreateModelCommand() {
    return {
      name: 'Test Function Model',
      description: 'A test function model for use case testing',
      templateId: 'template-123',
      userId: 'user-123',
      organizationId: 'org-123'
    };
  }

  static createInvalidCreateModelCommand() {
    return {
      name: '', // Invalid: empty name
      description: 'Test description',
      userId: 'user-123'
    };
  }

  static createValidAddContainerNodeCommand() {
    return {
      modelId: 'test-model-123', // Match the model ID from createValidFunctionModel
      nodeType: ContainerNodeType.IO_NODE,
      name: 'Test IO Node',
      position: { x: 100, y: 200 },
      userId: 'user-123'
    };
  }

  static createValidAddActionNodeCommand() {
    return {
      modelId: 'test-model-123',
      parentNodeId: 'container-123',
      actionType: ActionNodeType.TETHER_NODE,
      name: 'Test Tether Action',
      description: 'Test tether action for use case testing',
      executionMode: ExecutionMode.SEQUENTIAL,
      executionOrder: 1,
      priority: 5,
      retryPolicy: undefined, // Use defaults in the use case
      raci: undefined, // Use defaults in the use case
      actionSpecificData: {
        tetherReferenceId: 'tether-ref-123'
      },
      userId: 'user-123'
    };
  }

  static createValidPublishModelCommand() {
    return {
      modelId: 'test-model-123',
      version: '1.0.0',
      userId: 'user-123',
      publishNotes: 'Initial publication'
    };
  }

  static createValidExecuteWorkflowCommand() {
    return {
      modelId: 'test-model-123',
      executionParameters: {
        input: 'Test input data',
        timeout: 30000
      },
      userId: 'user-123'
    };
  }

  // =============================================================================
  // DOMAIN ENTITY FIXTURES
  // =============================================================================

  static createValidFunctionModel(): Result<FunctionModel> {
    const modelName = ModelName.create('Test Function Model').value!;
    
    return FunctionModel.create({
      modelId: 'test-model-123',
      name: modelName,
      description: 'Test function model for use cases',
      version: Version.initial(),
      status: ModelStatus.DRAFT,
      currentVersion: Version.initial(),
      nodes: new Map(),
      actionNodes: new Map(),
      metadata: {
        templateId: 'template-123',
        organizationId: 'org-123',
        createdBy: 'user-123'
      },
      permissions: {
        owner: 'user-123',
        viewers: [],
        editors: []
      }
    });
  }

  static createPublishedFunctionModel(): Result<FunctionModel> {
    const modelResult = this.createValidFunctionModel();
    if (modelResult.isFailure) return modelResult;
    
    const model = modelResult.value;
    
    // Add minimum required nodes for publication
    const inputNode = this.createValidIONode('input');
    const outputNode = this.createValidIONode('output');
    
    if (inputNode.isSuccess && outputNode.isSuccess) {
      model.addNode(inputNode.value);
      model.addNode(outputNode.value);
    }
    
    // Transition to published status
    const publishResult = model.publish('1.0.0', 'user-123');
    if (publishResult.isFailure) return Result.fail(publishResult.error);
    
    return Result.ok(model);
  }

  static createValidIONode(nodeType: 'input' | 'output' = 'input'): Result<IONode> {
    const nodeId = NodeId.generate();
    const position = Position.create(100, 200).value!;
    
    return IONode.create({
      nodeId,
      modelId: 'test-model-123',
      name: `Test ${nodeType} Node`,
      description: `Test ${nodeType} node for use cases`,
      position,
      dependencies: [],
      executionType: ExecutionMode.SEQUENTIAL,
      status: NodeStatus.DRAFT,
      metadata: {
        createdBy: 'user-123'
      },
      visualProperties: {},
      ioData: {
        boundaryType: nodeType,
        inputDataContract: nodeType === 'input' ? { type: 'string', required: true } : {},
        dataValidationRules: {}
      }
    });
  }

  static createValidStageNode(): Result<StageNode> {
    const nodeId = NodeId.generate();
    const position = Position.create(300, 400).value!;
    
    return StageNode.create({
      nodeId,
      modelId: 'test-model-123',
      name: 'Test Stage Node',
      description: 'Test stage node for use cases',
      position,
      dependencies: [],
      executionType: ExecutionMode.SEQUENTIAL,
      status: NodeStatus.DRAFT,
      metadata: {
        createdBy: 'user-123'
      },
      visualProperties: {},
      stageData: {
        stageType: 'process',
        completionCriteria: {},
        stageGoals: [],
        resourceRequirements: {}
      },
      parallelExecution: false,
      actionNodes: [],
      configuration: {}
    });
  }

  static createValidTetherNode(): Result<TetherNode> {
    const nodeId = NodeId.generate();
    const raci = RACI.create({
      responsible: ['user-123'],
      accountable: ['user-123'],
      consulted: [],
      informed: []
    }).value!;
    const retryPolicy = RetryPolicy.create(3, 1000, 2.0).value!;
    
    return TetherNode.create({
      id: nodeId,
      name: 'Test Tether Node',
      description: 'Test tether node for use cases',
      executionOrder: 1,
      raci,
      retryPolicy,
      tetherRefId: 'tether-ref-123',
      configuration: {
        description: 'Test tether configuration'
      },
      metadata: {
        createdBy: 'user-123'
      }
    });
  }

  static createValidKBNode(): Result<KBNode> {
    const nodeId = NodeId.generate();
    const raci = RACI.create({
      responsible: ['user-123'],
      accountable: ['user-123'], 
      consulted: [],
      informed: []
    }).value!;
    const retryPolicy = RetryPolicy.create(3, 1000, 2.0).value!;
    
    return KBNode.create({
      id: nodeId,
      name: 'Test KB Node',
      description: 'Test knowledge base node for use cases',
      executionOrder: 1,
      raci,
      retryPolicy,
      knowledgeBaseId: 'kb-123',
      queryType: 'search',
      configuration: {
        searchQuery: 'test query'
      },
      metadata: {
        createdBy: 'user-123'
      }
    });
  }

  static createValidFunctionModelContainerNode(): Result<FunctionModelContainerNode> {
    const nodeId = NodeId.generate();
    const raci = RACI.create({
      responsible: ['user-123'],
      accountable: ['user-123'],
      consulted: [],
      informed: []
    }).value!;
    const retryPolicy = RetryPolicy.create(3, 1000, 2.0).value!;
    
    return FunctionModelContainerNode.create({
      id: nodeId,
      name: 'Test Function Model Container',
      description: 'Test function model container for use cases',
      executionOrder: 1,
      raci,
      retryPolicy,
      nestedModelId: 'nested-test-model-123',
      inputMappings: new Map([['input1', 'parentInput1']]),
      outputMappings: new Map([['output1', 'parentOutput1']]),
      metadata: {
        createdBy: 'user-123'
      }
    });
  }

  // =============================================================================
  // EXECUTION CONTEXT FIXTURES
  // =============================================================================

  static createValidExecutionContext(): Result<ExecutionContext> {
    return ExecutionContext.create({
      executionId: 'execution-123',
      modelId: 'test-model-123',
      userId: 'user-123',
      parameters: {
        input: 'test input',
        timeout: 30000
      },
      environment: 'test'
    });
  }

  // =============================================================================
  // REPOSITORY MOCK RESPONSES
  // =============================================================================

  static createSuccessfulSaveResponse(): Result<void> {
    return Result.ok(undefined);
  }

  static createRepositoryFailureResponse(): Result<void> {
    return Result.fail('Database connection failed');
  }

  static createModelNotFoundResponse(): Result<FunctionModel> {
    return Result.fail('Function model not found');
  }

  static createModelFoundResponse(): Result<FunctionModel> {
    return this.createValidFunctionModel();
  }

  // =============================================================================
  // EVENT FIXTURES
  // =============================================================================

  static createFunctionModelCreatedEvent() {
    return {
      eventType: 'FunctionModelCreated',
      aggregateId: 'test-model-123',
      eventData: {
        modelId: 'test-model-123',
        name: 'Test Function Model',
        description: 'Test description',
        templateId: 'template-123',
        organizationId: 'org-123',
        createdBy: 'user-123'
      },
      userId: 'user-123',
      timestamp: new Date()
    };
  }

  static createContainerNodeAddedEvent() {
    return {
      eventType: 'ContainerNodeAdded',
      aggregateId: 'test-model-123',
      eventData: {
        modelId: 'test-model-123',
        nodeId: 'node-123',
        nodeType: NodeType.IO_NODE,
        name: 'Test IO Node',
        addedBy: 'user-123'
      },
      userId: 'user-123',
      timestamp: new Date()
    };
  }

  static createActionNodeAddedEvent() {
    return {
      eventType: 'ActionNodeAdded',
      aggregateId: 'test-model-123',
      eventData: {
        modelId: 'test-model-123',
        nodeId: 'action-123',
        containerNodeId: 'container-123',
        actionType: NodeType.TETHER_NODE,
        name: 'Test Tether Action',
        addedBy: 'user-123'
      },
      userId: 'user-123',
      timestamp: new Date()
    };
  }

  static createFunctionModelPublishedEvent() {
    return {
      eventType: 'FunctionModelPublished',
      aggregateId: 'test-model-123',
      eventData: {
        modelId: 'test-model-123',
        version: '1.0.0',
        publishedBy: 'user-123',
        publishNotes: 'Initial publication'
      },
      userId: 'user-123',
      timestamp: new Date()
    };
  }

  // =============================================================================
  // VALIDATION ERROR FIXTURES
  // =============================================================================

  static createValidationErrors() {
    return {
      EMPTY_MODEL_NAME: 'Model name cannot be empty',
      INVALID_USER_ID: 'User ID is required',
      MODEL_ALREADY_EXISTS: 'A model with this name already exists',
      MODEL_NOT_FOUND: 'Function model not found',
      INVALID_NODE_TYPE: 'Invalid node type specified',
      DUPLICATE_EXECUTION_ORDER: 'Execution order must be unique within container',
      MODEL_NOT_PUBLISHED: 'Model must be published before execution',
      INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this operation',
      VALIDATION_FAILED: 'Model validation failed',
      CIRCULAR_DEPENDENCY: 'Circular dependencies detected in workflow'
    };
  }
}