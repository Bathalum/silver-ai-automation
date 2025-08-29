/**
 * Test fixtures and data builders for consistent test data creation
 */

// Helper function to generate deterministic UUIDs for test identifiers
export function getTestUUID(identifier: string): string {
  // If already a valid UUID, return as-is
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)) {
    return identifier;
  }
  
  // Create deterministic UUID from identifier using a better hash function
  const str = identifier + '-salt'; // Add salt to prevent collisions
  let hash1 = 0xdeadbeef;
  let hash2 = 0x41c6ce57;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ char, 2654435761);
    hash2 = Math.imul(hash2 ^ char, 1597334677);
  }
  
  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507);
  hash1 = Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);
  hash1 = (hash1 ^ (hash1 >>> 16)) >>> 0;
  
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507);
  hash2 = Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
  hash2 = (hash2 ^ (hash2 >>> 16)) >>> 0;
  
  const hex1 = hash1.toString(16).padStart(8, '0');
  const hex2 = hash2.toString(16).padStart(8, '0');
  const hex3 = (hash1 ^ hash2).toString(16).padStart(8, '0');
  const hex4 = ((hash1 + hash2) >>> 0).toString(16).padStart(8, '0');
  
  const fullHex = (hex1 + hex2 + hex3 + hex4).substring(0, 32);
  
  // Construct UUID with proper version (4) and variant (8,9,A,B) bits
  const segment1 = fullHex.substring(0, 8);
  const segment2 = fullHex.substring(8, 12);
  const segment3 = '4' + fullHex.substring(13, 16); // Version 4
  let segment4 = fullHex.substring(16, 20); // 4 characters
  const segment5 = fullHex.substring(20, 32); // 12 characters
  
  // Ensure first character of segment4 is 8, 9, A, or B for proper variant
  const firstChar = segment4.charAt(0);
  if (!/[89ab]/i.test(firstChar)) {
    segment4 = '8' + segment4.substring(1);
  }
  
  return `${segment1}-${segment2}-${segment3}-${segment4}-${segment5}`;
}

import { 
  FunctionModel, 
  IONode, 
  StageNode, 
  TetherNode, 
  KBNode, 
  FunctionModelContainerNode 
} from '@/lib/domain';
import { 
  ModelName, 
  Version, 
  NodeId, 
  Position, 
  RetryPolicy, 
  RACI 
} from '@/lib/domain';
import { 
  ModelStatus, 
  ContainerNodeType, 
  ActionNodeType, 
  ExecutionMode,
  NodeStatus,
  ActionStatus,
  RACIRole
} from '@/lib/domain';
import { CreateModelCommand } from '@/lib/use-cases/commands';

/**
 * Builder pattern for creating test FunctionModel instances
 */
export class FunctionModelBuilder {
  private modelId = getTestUUID('model-' + Date.now());
  private name = 'Test Function Model';
  private description = 'A test function model for unit testing';
  private version = '1.0.0';
  private status = ModelStatus.DRAFT;
  private metadata = { createdFor: 'testing' };
  private permissions = {
    owner: TestData.VALID_USER_ID, // Use consistent test user ID
    editors: [] as string[],
    viewers: [] as string[]
  };

  withId(modelId: string): FunctionModelBuilder {
    this.modelId = modelId;
    return this;
  }

  withName(name: string): FunctionModelBuilder {
    this.name = name;
    return this;
  }

  withDescription(description: string): FunctionModelBuilder {
    this.description = description;
    return this;
  }

  withVersion(version: string): FunctionModelBuilder {
    this.version = version;
    return this;
  }

  withStatus(status: ModelStatus): FunctionModelBuilder {
    this.status = status;
    return this;
  }

  withOwner(ownerId: string): FunctionModelBuilder {
    this.permissions.owner = ownerId;
    return this;
  }

  withEditors(editors: string[]): FunctionModelBuilder {
    this.permissions.editors = editors;
    return this;
  }

  build(): FunctionModel {
    const modelName = ModelName.create(this.name);
    const modelVersion = Version.create(this.version);
    
    if (modelName.isFailure) {
      throw new Error(`Invalid model name: ${modelName.error}`);
    }
    
    if (modelVersion.isFailure) {
      throw new Error(`Invalid version: ${modelVersion.error}`);
    }

    const result = FunctionModel.create({
      modelId: this.modelId,
      name: modelName.value,
      description: this.description,
      version: modelVersion.value,
      status: this.status,
      currentVersion: modelVersion.value,
      nodes: new Map<string, Node>(),
      actionNodes: new Map<string, ActionNode>(),
      metadata: this.metadata,
      permissions: this.permissions
    });

    if (result.isFailure) {
      throw new Error(`Failed to create FunctionModel: ${result.error}`);
    }

    return result.value;
  }
}

/**
 * Builder for creating test IONode instances
 */
export class IONodeBuilder {
  private nodeId = getTestUUID('default-io-node');
  private modelId = getTestUUID('default-model');
  private name = 'Test IO Node';
  private description = 'A test IO node';
  private position = { x: 100, y: 200 };
  private nodeType = ContainerNodeType.IO_NODE;
  private ioType: 'input' | 'output' = 'input';
  private metadata: Record<string, any> = {};

  withId(nodeId: string): IONodeBuilder {
    // If the provided ID is not a valid UUID, create a deterministic UUID from it
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nodeId)) {
      // Create a deterministic UUID based on the simple identifier
      const hash = this.simpleHash(nodeId);
      this.nodeId = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-8${hash.substring(16, 19)}-${hash.substring(19, 31)}`;
    } else {
      this.nodeId = nodeId;
    }
    return this;
  }

  private simpleHash(str: string): string {
    return getTestUUID(str).replace(/-/g, '');
  }

  withModelId(modelId: string): IONodeBuilder {
    this.modelId = modelId;
    return this;
  }

  withName(name: string): IONodeBuilder {
    this.name = name;
    return this;
  }

  withDescription(description: string): IONodeBuilder {
    this.description = description;
    return this;
  }

  withoutDescription(): IONodeBuilder {
    this.description = '';
    return this;
  }

  withPosition(x: number, y: number): IONodeBuilder {
    this.position = { x, y };
    return this;
  }

  withMetadata(metadata: Record<string, any>): IONodeBuilder {
    this.metadata = metadata;
    return this;
  }

  asInput(): IONodeBuilder {
    this.ioType = 'input';
    return this;
  }

  asOutput(): IONodeBuilder {
    this.ioType = 'output';
    return this;
  }

  build(): IONode {
    const nodeIdResult = NodeId.create(this.nodeId);
    const positionResult = Position.create(this.position.x, this.position.y);
    
    if (nodeIdResult.isFailure) {
      throw new Error(`Invalid node ID: ${nodeIdResult.error}`);
    }
    
    if (positionResult.isFailure) {
      throw new Error(`Invalid position: ${positionResult.error}`);
    }

    const result = IONode.create({
      nodeId: nodeIdResult.value,
      modelId: this.modelId,
      name: this.name,
      description: this.description,
      position: positionResult.value,
      dependencies: [],
      executionType: ExecutionMode.SEQUENTIAL,
      status: NodeStatus.CONFIGURED,
      timeout: undefined,
      metadata: this.metadata,
      visualProperties: {},
      configuration: {},
      ioData: {
        inputDataContract: this.ioType === 'input' ? {} : undefined,
        outputDataContract: this.ioType === 'output' ? {} : undefined,
        dataValidationRules: {},
        boundaryType: this.ioType as 'input' | 'output'
      }
    });

    if (result.isFailure) {
      throw new Error(`Failed to create IONode: ${result.error}`);
    }

    return result.value;
  }
}

/**
 * Builder for creating test StageNode instances
 */
export class StageNodeBuilder {
  private nodeId = getTestUUID('default-stage-node');
  private modelId = getTestUUID('default-model');
  private name = 'Test Stage Node';
  private description = 'A test stage node';
  private position = { x: 300, y: 200 };
  private timeout?: number;
  private parallelExecution = false;
  private retryPolicy?: any;

  withId(nodeId: string): StageNodeBuilder {
    // If the provided ID is not a valid UUID, create a deterministic UUID from it
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nodeId)) {
      // Create a deterministic UUID based on the simple identifier
      const hash = this.simpleHash(nodeId);
      this.nodeId = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-8${hash.substring(16, 19)}-${hash.substring(19, 31)}`;
    } else {
      this.nodeId = nodeId;
    }
    return this;
  }

  private simpleHash(str: string): string {
    return getTestUUID(str).replace(/-/g, '');
  }

  withModelId(modelId: string): StageNodeBuilder {
    this.modelId = modelId;
    return this;
  }

  withName(name: string): StageNodeBuilder {
    this.name = name;
    return this;
  }

  withDescription(description: string): StageNodeBuilder {
    this.description = description;
    return this;
  }

  withPosition(x: number, y: number): StageNodeBuilder {
    this.position = { x, y };
    return this;
  }

  withTimeout(timeout: number): StageNodeBuilder {
    this.timeout = timeout;
    return this;
  }

  withParallelExecution(parallel: boolean): StageNodeBuilder {
    this.parallelExecution = parallel;
    return this;
  }

  withRetryPolicy(retryPolicy: any): StageNodeBuilder {
    this.retryPolicy = retryPolicy;
    return this;
  }

  build(): StageNode {
    const nodeIdResult = NodeId.create(this.nodeId);
    const positionResult = Position.create(this.position.x, this.position.y);
    
    if (nodeIdResult.isFailure || positionResult.isFailure) {
      throw new Error('Invalid node creation parameters');
    }

    // Convert retry policy object to RetryPolicy value object if provided
    let retryPolicyValue: RetryPolicy | undefined;
    let metadata: Record<string, any> = {};
    
    if (this.retryPolicy) {
      const retryPolicyResult = RetryPolicy.create(this.retryPolicy);
      if (retryPolicyResult.isFailure) {
        // Store invalid retry policy in metadata for validation testing
        metadata.invalidRetryPolicy = this.retryPolicy;
        retryPolicyValue = undefined;
      } else {
        retryPolicyValue = retryPolicyResult.value;
      }
    }

    const result = StageNode.create({
      nodeId: nodeIdResult.value,
      modelId: this.modelId,
      name: this.name,
      description: this.description,
      position: positionResult.value,
      dependencies: [],
      executionType: this.parallelExecution ? ExecutionMode.PARALLEL : ExecutionMode.SEQUENTIAL,
      status: NodeStatus.CONFIGURED,
      timeout: this.timeout,
      metadata: metadata,
      visualProperties: {},
      stageData: {
        stageType: 'process',
        completionCriteria: {},
        stageGoals: ['Test goal'],
        resourceRequirements: { cpu: '100m', memory: '128Mi' },
        parallelismConfig: { 
          maxConcurrency: 1,
          loadBalancing: 'round-robin'
        }
      },
      parallelExecution: this.parallelExecution,
      retryPolicy: retryPolicyValue,
      actionNodes: [],
      configuration: {}
    });

    if (result.isFailure) {
      throw new Error(`Failed to create StageNode: ${result.error}`);
    }

    return result.value;
  }
}

/**
 * Builder for creating test TetherNode instances
 */
export class TetherNodeBuilder {
  private actionId = getTestUUID('action-' + Date.now());
  private parentNodeId = getTestUUID('parent-' + Date.now());
  private modelId = getTestUUID('model-' + Date.now());
  private name = 'Test Tether Action';
  private description = 'A test tether action';
  private executionMode = ExecutionMode.SEQUENTIAL;
  private executionOrder = 1;
  private priority = 5;
  private estimatedDuration = 30;
  private status = ActionStatus.ACTIVE;
  private retryPolicy?: RetryPolicy;
  private configuration?: any = {
    tetherReference: 'test-tether-ref',
    tetherReferenceId: 'test-tether-ref-id-123',
    executionParameters: {},
    outputMapping: {},
    executionTriggers: [],
    resourceRequirements: { cpu: '200m', memory: '256Mi', timeout: 300 },
    integrationConfig: {
      endpoint: 'https://api.example.com',
      authentication: {},
      headers: {}
    }
  };

  withId(actionId: string): TetherNodeBuilder {
    this.actionId = actionId;
    return this;
  }

  withParentNode(parentNodeId: string): TetherNodeBuilder {
    this.parentNodeId = parentNodeId;
    return this;
  }

  withModelId(modelId: string): TetherNodeBuilder {
    this.modelId = modelId;
    return this;
  }

  withName(name: string): TetherNodeBuilder {
    this.name = name;
    return this;
  }

  withExecutionOrder(order: number): TetherNodeBuilder {
    this.executionOrder = order;
    return this;
  }

  withStatus(status: ActionStatus): TetherNodeBuilder {
    this.status = status;
    return this;
  }

  withExecutionMode(mode: ExecutionMode): TetherNodeBuilder {
    this.executionMode = mode;
    return this;
  }

  withRetryPolicy(retryPolicy: RetryPolicy): TetherNodeBuilder {
    this.retryPolicy = retryPolicy;
    return this;
  }

  withConfiguration(config: any): TetherNodeBuilder {
    this.configuration = { ...this.configuration, ...config };
    return this;
  }

  withResourceRequirements(requirements: Record<string, any>): TetherNodeBuilder {
    if (!this.configuration) {
      this.configuration = {};
    }
    this.configuration.resourceRequirements = { ...this.configuration.resourceRequirements, ...requirements };
    return this;
  }

  withPriority(priority: number): TetherNodeBuilder {
    this.priority = priority;
    return this;
  }

  withEstimatedDuration(duration: number): TetherNodeBuilder {
    this.estimatedDuration = duration;
    return this;
  }

  build(): TetherNode {
    const actionIdResult = NodeId.create(this.actionId);
    const parentNodeIdResult = NodeId.create(this.parentNodeId);
    
    if (actionIdResult.isFailure || parentNodeIdResult.isFailure) {
      const errors = [];
      if (actionIdResult.isFailure) errors.push(`ActionId: ${actionIdResult.error}`);
      if (parentNodeIdResult.isFailure) errors.push(`ParentNodeId: ${parentNodeIdResult.error}`);
      throw new Error(`Invalid action creation parameters: ${errors.join(', ')}`);
    }

    const tetherNodeProps = {
      actionId: actionIdResult.value,
      parentNodeId: parentNodeIdResult.value,
      modelId: this.modelId,
      name: this.name,
      description: this.description,
      actionType: ActionNodeType.TETHER_NODE,
      executionMode: this.executionMode,
      executionOrder: this.executionOrder,
      status: this.status,
      priority: this.priority,
      estimatedDuration: this.estimatedDuration,
      retryPolicy: this.retryPolicy,
      tetherData: this.configuration
    };

    const result = TetherNode.create(tetherNodeProps);
    if (result.isFailure) {
      throw new Error('Failed to create TetherNode: ' + result.error);
    }
    return result.value;
  }
}

/**
 * Builder for creating test KBNode instances
 */
export class KBNodeBuilder {
  private actionId = getTestUUID('kb-action-' + Date.now());
  private parentNodeId = getTestUUID('kb-parent-' + Date.now());
  private modelId = getTestUUID('model-' + Date.now());
  private name = 'Test KB Action';
  private description = 'A test knowledge base action';
  private executionMode = ExecutionMode.SEQUENTIAL;
  private executionOrder = 1;
  private priority = 5;
  private estimatedDuration = 0;
  private status = ActionStatus.ACTIVE;
  private retryPolicy?: RetryPolicy;
  private configuration?: any = {
    kbReferenceId: 'kb-test-ref',
    shortDescription: 'Test KB description',
    searchKeywords: ['test', 'knowledge'],
    accessPermissions: {
      view: ['developer-team', 'tech-lead'], // edit users must also be view users
      edit: ['tech-lead']
    }
  };

  withId(actionId: string): KBNodeBuilder {
    this.actionId = actionId;
    return this;
  }

  withParentNode(parentNodeId: string): KBNodeBuilder {
    this.parentNodeId = parentNodeId;
    return this;
  }

  withModelId(modelId: string): KBNodeBuilder {
    this.modelId = modelId;
    return this;
  }

  withName(name: string): KBNodeBuilder {
    this.name = name;
    return this;
  }

  withExecutionOrder(order: number): KBNodeBuilder {
    this.executionOrder = order;
    return this;
  }

  withPriority(priority: number): KBNodeBuilder {
    this.priority = priority;
    return this;
  }

  withStatus(status: ActionStatus): KBNodeBuilder {
    this.status = status;
    return this;
  }

  withExecutionMode(mode: ExecutionMode): KBNodeBuilder {
    this.executionMode = mode;
    return this;
  }

  withRetryPolicy(retryPolicy: RetryPolicy): KBNodeBuilder {
    this.retryPolicy = retryPolicy;
    return this;
  }

  withConfiguration(config: any): KBNodeBuilder {
    this.configuration = { ...this.configuration, ...config };
    return this;
  }

  withEstimatedDuration(duration: number): KBNodeBuilder {
    this.estimatedDuration = duration;
    return this;
  }

  build(): KBNode {
    const retryPolicy = this.retryPolicy || RetryPolicy.createDefault().value;
    const raci = RACI.create(['system']).value;

    const kbNodeCreateProps = {
      actionId: this.actionId,
      parentNodeId: this.parentNodeId,
      modelId: this.modelId,
      name: this.name,
      description: this.description,
      executionMode: this.executionMode,
      executionOrder: this.executionOrder,
      status: this.status,
      priority: this.priority,
      estimatedDuration: this.estimatedDuration,
      retryPolicy: retryPolicy.toObject(),
      raci: raci.toObject(),
      metadata: {},
      kbData: this.configuration!
    };

    const result = KBNode.create(kbNodeCreateProps);
    if (result.isFailure) {
      throw new Error('Failed to create KBNode: ' + result.error);
    }
    return result.value;
  }
}

/**
 * Builder for creating test FunctionModelContainerNode instances
 */
export class FunctionModelContainerNodeBuilder {
  private actionId = getTestUUID('container-action-' + Date.now());
  private parentNodeId = getTestUUID('container-parent-' + Date.now());
  private modelId = getTestUUID('model-' + Date.now());
  private name = 'Test Function Model Container Action';
  private description = 'A test function model container action';
  private executionMode = ExecutionMode.SEQUENTIAL;
  private executionOrder = 1;
  private priority = 5;
  private estimatedDuration = 600;
  private status = ActionStatus.ACTIVE;
  private retryPolicy?: RetryPolicy;
  private nestedModelId = getTestUUID('nested-model-' + Date.now());
  private configuration?: any = {
    nestedModelId: this.nestedModelId,
    contextMapping: {
      'input': 'parent.input',
      'config': 'parent.config'
    },
    outputExtraction: {
      'result': 'nested.output',
      'status': 'nested.executionStatus'
    }
  };

  withId(actionId: string): FunctionModelContainerNodeBuilder {
    this.actionId = actionId;
    return this;
  }

  withParentNode(parentNodeId: string): FunctionModelContainerNodeBuilder {
    this.parentNodeId = parentNodeId;
    return this;
  }

  withParentNodeId(parentNodeId: string): FunctionModelContainerNodeBuilder {
    this.parentNodeId = parentNodeId;
    return this;
  }

  withModelId(modelId: string): FunctionModelContainerNodeBuilder {
    this.modelId = modelId;
    return this;
  }

  withName(name: string): FunctionModelContainerNodeBuilder {
    this.name = name;
    return this;
  }

  withNestedModelId(nestedModelId: string): FunctionModelContainerNodeBuilder {
    this.nestedModelId = nestedModelId;
    return this;
  }

  withExecutionOrder(order: number): FunctionModelContainerNodeBuilder {
    this.executionOrder = order;
    return this;
  }

  withPriority(priority: number): FunctionModelContainerNodeBuilder {
    this.priority = priority;
    return this;
  }

  withStatus(status: ActionStatus): FunctionModelContainerNodeBuilder {
    this.status = status;
    return this;
  }

  withExecutionMode(mode: ExecutionMode): FunctionModelContainerNodeBuilder {
    this.executionMode = mode;
    return this;
  }

  withRetryPolicy(retryPolicy: RetryPolicy): FunctionModelContainerNodeBuilder {
    this.retryPolicy = retryPolicy;
    return this;
  }

  withConfiguration(config: any): FunctionModelContainerNodeBuilder {
    this.configuration = { ...this.configuration, ...config };
    // Update nested model ID if provided in configuration
    if (config.nestedModelId) {
      this.nestedModelId = config.nestedModelId;
    }
    return this;
  }

  withEstimatedDuration(duration: number): FunctionModelContainerNodeBuilder {
    this.estimatedDuration = duration;
    return this;
  }

  build(): FunctionModelContainerNode {
    const actionIdResult = NodeId.create(this.actionId);
    const parentNodeIdResult = NodeId.create(this.parentNodeId);
    
    if (actionIdResult.isFailure || parentNodeIdResult.isFailure) {
      const errors = [];
      if (actionIdResult.isFailure) errors.push(`ActionId: ${actionIdResult.error}`);
      if (parentNodeIdResult.isFailure) errors.push(`ParentNodeId: ${parentNodeIdResult.error}`);
      throw new Error(`Invalid action creation parameters: ${errors.join(', ')}`);
    }

    const containerNodeProps = {
      actionId: actionIdResult.value,
      parentNodeId: parentNodeIdResult.value,
      modelId: this.modelId,
      name: this.name,
      description: this.description,
      actionType: ActionNodeType.FUNCTION_MODEL_CONTAINER,
      executionMode: this.executionMode,
      executionOrder: this.executionOrder,
      status: this.status,
      priority: this.priority,
      estimatedDuration: this.estimatedDuration,
      retryPolicy: this.retryPolicy,
      configuration: this.configuration
    };

    const result = FunctionModelContainerNode.create(containerNodeProps);
    if (result.isFailure) {
      throw new Error('Failed to create FunctionModelContainerNode: ' + result.error);
    }
    return result.value;
  }
}

/**
 * Test data constants and commonly used values
 */
export const TestData = {
  // Valid test values
  VALID_MODEL_NAME: 'Valid Test Model',
  VALID_VERSION: '1.0.0',
  VALID_UUID: '123e4567-e89b-42d3-a456-426614174000',
  VALID_USER_ID: 'user-123',
  NON_EXISTENT_UUID: '999e9999-e99b-49d9-a999-999999999999',
  
  // Invalid test values
  INVALID_MODEL_NAME: '', // Too short
  INVALID_VERSION: 'not-a-version',
  INVALID_UUID: 'not-a-uuid',
  
  // Default positions
  DEFAULT_POSITION: { x: 0, y: 0 },
  CANVAS_CENTER: { x: 400, y: 300 },
  
  // Default metadata
  DEFAULT_METADATA: { createdFor: 'testing', environment: 'test' },
  
  // Permission sets
  OWNER_PERMISSIONS: {
    owner: 'test-owner',
    editors: [] as string[],
    viewers: [] as string[]
  },
  
  SHARED_PERMISSIONS: {
    owner: 'test-owner',
    editors: ['editor-1', 'editor-2'],
    viewers: ['viewer-1', 'viewer-2']
  }
} as const;

/**
 * Factory functions for quick test data creation
 */
export const TestFactories = {
  /**
   * Create a simple valid function model for testing
   */
  createValidModel(): FunctionModel {
    return new FunctionModelBuilder()
      .withName(TestData.VALID_MODEL_NAME)
      .withVersion(TestData.VALID_VERSION)
      .build();
  },

  /**
   * Create a basic workflow with IO and Stage nodes (no actions)
   */
  createBasicWorkflow(): FunctionModel {
    const model = TestFactories.createValidModel();
    
    // Add input node
    const inputNode = new IONodeBuilder()
      .withModelId(model.modelId)
      .withName('Input')
      .withPosition(100, 200)
      .asInput()
      .build();
    
    // Add stage node with dependencies
    const stageNode = new StageNodeBuilder()
      .withModelId(model.modelId)
      .withName('Process')
      .withPosition(300, 200)
      .build();
    
    // Add output node with dependencies
    const outputNode = new IONodeBuilder()
      .withModelId(model.modelId)
      .withName('Output')
      .withPosition(500, 200)
      .asOutput()
      .build();

    model.addNode(inputNode);
    model.addNode(stageNode);
    model.addNode(outputNode);
    
    // Create connections by setting dependencies (but no actions)
    stageNode.addDependency(inputNode.nodeId);
    outputNode.addDependency(stageNode.nodeId);
    
    return model;
  },

  /**
   * Create a complete workflow with IO and Stage nodes and actions
   */
  createCompleteWorkflow(): FunctionModel {
    const model = TestFactories.createValidModel();
    
    // Add input node
    const inputNode = new IONodeBuilder()
      .withId('input-node')
      .withModelId(model.modelId)
      .withName('Input')
      .withPosition(100, 200)
      .asInput()
      .build();
    
    // Add stage node with dependencies
    const stageNode = new StageNodeBuilder()
      .withId('stage-node')
      .withModelId(model.modelId)
      .withName('Process')
      .withPosition(300, 200)
      .build();
    
    // Add output node with dependencies
    const outputNode = new IONodeBuilder()
      .withId('output-node')
      .withModelId(model.modelId)
      .withName('Output')
      .withPosition(500, 200)
      .asOutput()
      .build();

    model.addNode(inputNode);
    model.addNode(stageNode);
    model.addNode(outputNode);
    
    // Create connections by setting dependencies
    stageNode.addDependency(inputNode.nodeId);
    outputNode.addDependency(stageNode.nodeId);
    
    // Add an action to the stage node to avoid warnings
    const tetherAction = new TetherNodeBuilder()
      .withParentNode(stageNode.nodeId.toString())
      .withModelId(model.modelId)
      .withName('Process Action')
      .build();
    
    model.addActionNode(tetherAction);
    
    return model;
  },

  /**
   * Create a CreateModelCommand for testing use cases
   */
  createModelCommand(overrides: Partial<CreateModelCommand> = {}): CreateModelCommand {
    return {
      name: TestData.VALID_MODEL_NAME,
      description: 'Test model description',
      templateId: undefined,
      userId: TestData.VALID_USER_ID,
      ...overrides
    };
  }
};

/**
 * Mock data generators for external dependencies
 */
export const MockGenerators = {
  /**
   * Generate a mock Supabase user
   */
  createMockUser(id: string = TestData.VALID_USER_ID) {
    return {
      id,
      email: `${id}@example.com`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  },

  /**
   * Generate mock database rows
   */
  createMockModelRow(model: FunctionModel) {
    return {
      model_id: model.modelId,
      name: model.name.toString(),
      description: model.description,
      version: model.version.toString(),
      status: model.status,
      metadata: model.metadata,
      permissions: model.permissions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
};