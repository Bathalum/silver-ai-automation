/**
 * Test fixtures and data builders for consistent test data creation
 */

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
  private modelId = 'test-model-' + Math.random().toString(36).substring(7);
  private name = 'Test Function Model';
  private description = 'A test function model for unit testing';
  private version = '1.0.0';
  private status = ModelStatus.DRAFT;
  private metadata = { createdFor: 'testing' };
  private permissions = {
    owner: 'test-user-id',
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

    return new FunctionModel(
      this.modelId,
      modelName.value,
      this.description,
      modelVersion.value,
      this.status,
      this.metadata,
      this.permissions
    );
  }
}

/**
 * Builder for creating test IONode instances
 */
export class IONodeBuilder {
  private nodeId = 'test-io-node-' + Math.random().toString(36).substring(7);
  private modelId = 'test-model-id';
  private name = 'Test IO Node';
  private description = 'A test IO node';
  private position = { x: 100, y: 200 };
  private nodeType = ContainerNodeType.IO_NODE;
  private ioType: 'input' | 'output' = 'input';

  withId(nodeId: string): IONodeBuilder {
    this.nodeId = nodeId;
    return this;
  }

  withModelId(modelId: string): IONodeBuilder {
    this.modelId = modelId;
    return this;
  }

  withName(name: string): IONodeBuilder {
    this.name = name;
    return this;
  }

  withPosition(x: number, y: number): IONodeBuilder {
    this.position = { x, y };
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

    return new IONode(
      nodeIdResult.value,
      this.modelId,
      this.name,
      this.description,
      positionResult.value,
      [],
      NodeStatus.CONFIGURED,
      {},
      {},
      {
        ioType: this.ioType,
        dataContract: {
          inputs: [],
          outputs: [],
          validation: {}
        }
      }
    );
  }
}

/**
 * Builder for creating test StageNode instances
 */
export class StageNodeBuilder {
  private nodeId = 'test-stage-node-' + Math.random().toString(36).substring(7);
  private modelId = 'test-model-id';
  private name = 'Test Stage Node';
  private description = 'A test stage node';
  private position = { x: 300, y: 200 };

  withId(nodeId: string): StageNodeBuilder {
    this.nodeId = nodeId;
    return this;
  }

  withModelId(modelId: string): StageNodeBuilder {
    this.modelId = modelId;
    return this;
  }

  withName(name: string): StageNodeBuilder {
    this.name = name;
    return this;
  }

  withPosition(x: number, y: number): StageNodeBuilder {
    this.position = { x, y };
    return this;
  }

  build(): StageNode {
    const nodeIdResult = NodeId.create(this.nodeId);
    const positionResult = Position.create(this.position.x, this.position.y);
    
    if (nodeIdResult.isFailure || positionResult.isFailure) {
      throw new Error('Invalid node creation parameters');
    }

    return new StageNode(
      nodeIdResult.value,
      this.modelId,
      this.name,
      this.description,
      positionResult.value,
      [],
      NodeStatus.CONFIGURED,
      {},
      {},
      {
        goals: ['Test goal'],
        parallelismConfig: { enabled: false, maxConcurrency: 1 },
        resourceRequirements: { cpu: '100m', memory: '128Mi' }
      }
    );
  }
}

/**
 * Builder for creating test TetherNode instances
 */
export class TetherNodeBuilder {
  private actionId = 'test-tether-' + Math.random().toString(36).substring(7);
  private parentNodeId = 'test-parent-node-id';
  private modelId = 'test-model-id';
  private name = 'Test Tether Action';
  private description = 'A test tether action';
  private executionMode = ExecutionMode.SEQUENTIAL;
  private priority = 5;
  private estimatedDuration = 30;

  withId(actionId: string): TetherNodeBuilder {
    this.actionId = actionId;
    return this;
  }

  withParentNode(parentNodeId: string): TetherNodeBuilder {
    this.parentNodeId = parentNodeId;
    return this;
  }

  withName(name: string): TetherNodeBuilder {
    this.name = name;
    return this;
  }

  withPriority(priority: number): TetherNodeBuilder {
    this.priority = priority;
    return this;
  }

  build(): TetherNode {
    const actionIdResult = NodeId.create(this.actionId);
    const parentNodeIdResult = NodeId.create(this.parentNodeId);
    const retryPolicyResult = RetryPolicy.createDefault();
    const raciResult = RACI.create();
    
    if (actionIdResult.isFailure || parentNodeIdResult.isFailure || 
        retryPolicyResult.isFailure || raciResult.isFailure) {
      throw new Error('Invalid action creation parameters');
    }

    return new TetherNode(
      actionIdResult.value,
      parentNodeIdResult.value,
      this.modelId,
      this.name,
      this.description,
      this.executionMode,
      1, // executionOrder
      ActionStatus.CONFIGURED,
      this.priority,
      this.estimatedDuration,
      retryPolicyResult.value,
      raciResult.value,
      {},
      {
        spindleIntegration: {
          spindleId: 'test-spindle-id',
          executionParameters: {},
          resourceRequirements: { cpu: '100m', memory: '128Mi' },
          triggers: []
        }
      }
    );
  }
}

/**
 * Test data constants and commonly used values
 */
export const TestData = {
  // Valid test values
  VALID_MODEL_NAME: 'Valid Test Model',
  VALID_VERSION: '1.0.0',
  VALID_UUID: '123e4567-e89b-12d3-a456-426614174000',
  VALID_USER_ID: 'user-123',
  
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
   * Create a complete workflow with IO and Stage nodes
   */
  createCompleteWorkflow(): FunctionModel {
    const model = TestFactories.createValidModel();
    
    // Add input node
    const inputNode = new IONodeBuilder()
      .withModelId(model.modelId)
      .withName('Input')
      .withPosition(100, 200)
      .asInput()
      .build();
    
    // Add stage node
    const stageNode = new StageNodeBuilder()
      .withModelId(model.modelId)
      .withName('Process')
      .withPosition(300, 200)
      .build();
    
    // Add output node
    const outputNode = new IONodeBuilder()
      .withModelId(model.modelId)
      .withName('Output')
      .withPosition(500, 200)
      .asOutput()
      .build();

    model.addContainerNode(inputNode);
    model.addContainerNode(stageNode);
    model.addContainerNode(outputNode);
    
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