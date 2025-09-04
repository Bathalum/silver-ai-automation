/**
 * Test Data Factories - Domain Entity Creation
 * 
 * Provides factory methods for creating valid domain entities
 * with realistic test data for integration tests.
 */

import { FunctionModel } from '../../../lib/domain/entities/function-model';
import { IONode } from '../../../lib/domain/entities/io-node';
import { StageNode } from '../../../lib/domain/entities/stage-node';
import { ActionNode } from '../../../lib/domain/entities/action-node';
import { TetherNode } from '../../../lib/domain/entities/tether-node';
import { KBNode } from '../../../lib/domain/entities/kb-node';
import { FunctionModelContainerNode } from '../../../lib/domain/entities/function-model-container-node';
import { ModelName } from '../../../lib/domain/value-objects/model-name';
import { Version } from '../../../lib/domain/value-objects/version';
import { NodeId } from '../../../lib/domain/value-objects/node-id';
import { Position } from '../../../lib/domain/value-objects/position';
import { RetryPolicy } from '../../../lib/domain/value-objects/retry-policy';
import { RACI } from '../../../lib/domain/value-objects/raci';
import { Result } from '../../../lib/domain/shared/result';
import { 
  ModelStatus, 
  NodeStatus, 
  ActionStatus, 
  ActionNodeType,
  ContainerNodeType,
  ExecutionMode
} from '../../../lib/domain/enums';

export interface TestEntityOptions {
  testId?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * Factory for creating FunctionModel test entities
 */
export class FunctionModelTestFactory {
  /**
   * Create a valid FunctionModel with test data
   */
  public static create(options: TestEntityOptions = {}): Result<FunctionModel> {
    const testId = options.testId || this.generateTestId();
    const prefix = options.prefix || 'test';
    const suffix = options.suffix || '';
    
    try {
      const modelNameResult = ModelName.create(`${prefix}-model-${testId}${suffix}`);
      const versionResult = Version.create('1.0.0');
      const currentVersionResult = Version.create('1.0.0');

      if (modelNameResult.isFailure) {
        return Result.fail(`Invalid model name: ${modelNameResult.error}`);
      }
      if (versionResult.isFailure) {
        return Result.fail(`Invalid version: ${versionResult.error}`);
      }
      if (currentVersionResult.isFailure) {
        return Result.fail(`Invalid current version: ${currentVersionResult.error}`);
      }

      const modelResult = FunctionModel.create({
        modelId: `${testId}`,
        name: modelNameResult.value,
        description: `Test function model for integration testing - ${testId}`,
        version: versionResult.value,
        status: ModelStatus.DRAFT,
        currentVersion: currentVersionResult.value,
        nodes: new Map(),
        actionNodes: new Map(),
        metadata: {
          testData: true,
          testId,
          createdBy: 'test-factory'
        },
        permissions: {
          read: ['test-user'],
          write: ['test-user'],
          execute: ['test-user']
        },
        aiAgentConfig: {
          enabled: false,
          testMode: true
        }
      });

      return modelResult;
    } catch (error) {
      return Result.fail(`Failed to create test FunctionModel: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a FunctionModel with nodes and actions
   */
  public static createWithWorkflow(options: TestEntityOptions = {}): Result<FunctionModel> {
    const modelResult = this.create(options);
    if (modelResult.isFailure) {
      return modelResult;
    }

    const model = modelResult.value;
    const testId = options.testId || this.generateTestId();

    // Add IO nodes
    const inputNodeResult = IONodeTestFactory.create({ testId, suffix: '-input' });
    const outputNodeResult = IONodeTestFactory.create({ testId, suffix: '-output' });

    // Add stage node
    const stageNodeResult = StageNodeTestFactory.create({ testId, suffix: '-stage' });

    if (inputNodeResult.isSuccess) {
      model.addNode(inputNodeResult.value);
    }
    if (outputNodeResult.isSuccess) {
      model.addNode(outputNodeResult.value);
    }
    if (stageNodeResult.isSuccess) {
      model.addNode(stageNodeResult.value);
    }

    // Add action nodes
    const tetherNodeResult = TetherNodeTestFactory.create({ 
      testId, 
      parentNodeId: stageNodeResult.isSuccess ? stageNodeResult.value.nodeId.toString() : 'test-parent'
    });
    const kbNodeResult = KBNodeTestFactory.create({ 
      testId, 
      parentNodeId: stageNodeResult.isSuccess ? stageNodeResult.value.nodeId.toString() : 'test-parent'
    });

    if (tetherNodeResult.isSuccess) {
      model.addActionNode(tetherNodeResult.value);
    }
    if (kbNodeResult.isSuccess) {
      model.addActionNode(kbNodeResult.value);
    }

    return Result.ok(model);
  }

  /**
   * Create multiple test models for bulk operations
   */
  public static createBatch(count: number, options: TestEntityOptions = {}): Result<FunctionModel[]> {
    const models: FunctionModel[] = [];
    const failures: string[] = [];

    for (let i = 0; i < count; i++) {
      const batchOptions = {
        ...options,
        testId: `${options.testId || this.generateTestId()}-batch-${i}`,
        suffix: `${options.suffix || ''}-${i}`
      };

      const modelResult = this.create(batchOptions);
      if (modelResult.isSuccess) {
        models.push(modelResult.value);
      } else {
        failures.push(`Batch ${i}: ${modelResult.error}`);
      }
    }

    if (failures.length > 0) {
      return Result.fail(`Failed to create batch models: ${failures.join(', ')}`);
    }

    return Result.ok(models);
  }

  private static generateTestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Factory for creating IONode test entities
 */
export class IONodeTestFactory {
  public static create(options: TestEntityOptions & { nodeType?: 'input' | 'output' } = {}): Result<IONode> {
    const testId = options.testId || this.generateTestId();
    const prefix = options.prefix || 'test';
    const suffix = options.suffix || '';
    const nodeType = options.nodeType || 'input';
    
    try {
      const nodeIdResult = NodeId.create(`${testId}-io-${nodeType}${suffix}`);
      const positionResult = Position.create(
        Math.floor(Math.random() * 800), 
        Math.floor(Math.random() * 600)
      );

      if (nodeIdResult.isFailure || positionResult.isFailure) {
        return Result.fail(`Invalid node creation parameters`);
      }

      const nodeResult = IONode.create({
        nodeId: nodeIdResult.value,
        name: `${prefix}-${nodeType}-node-${testId}${suffix}`,
        description: `Test ${nodeType} node for integration testing`,
        position: positionResult.value,
        dependencies: [],
        status: NodeStatus.READY,
        metadata: {
          testData: true,
          testId,
          nodeType
        },
        visualProperties: {
          width: 200,
          height: 100,
          color: nodeType === 'input' ? '#10b981' : '#3b82f6'
        },
        ioData: {
          type: nodeType,
          dataSchema: {
            type: 'object',
            properties: {
              testField: { type: 'string' },
              value: { type: 'number' }
            }
          },
          testMode: true
        }
      });

      return nodeResult;
    } catch (error) {
      return Result.fail(`Failed to create test IONode: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static generateTestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Factory for creating StageNode test entities
 */
export class StageNodeTestFactory {
  public static create(options: TestEntityOptions = {}): Result<StageNode> {
    const testId = options.testId || this.generateTestId();
    const prefix = options.prefix || 'test';
    const suffix = options.suffix || '';
    
    try {
      const nodeIdResult = NodeId.create(`${testId}-stage${suffix}`);
      const positionResult = Position.create(400, 300);

      if (nodeIdResult.isFailure || positionResult.isFailure) {
        return Result.fail(`Invalid stage node creation parameters`);
      }

      const nodeResult = StageNode.create({
        nodeId: nodeIdResult.value,
        name: `${prefix}-stage-node-${testId}${suffix}`,
        description: `Test stage node for integration testing`,
        position: positionResult.value,
        dependencies: [],
        status: NodeStatus.READY,
        metadata: {
          testData: true,
          testId
        },
        visualProperties: {
          width: 300,
          height: 200,
          color: '#8b5cf6'
        },
        stageData: {
          stageType: 'processing',
          configuration: {
            parallelism: 1,
            timeout: 30000
          },
          testMode: true
        }
      });

      return nodeResult;
    } catch (error) {
      return Result.fail(`Failed to create test StageNode: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static generateTestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Factory for creating TetherNode test entities
 */
export class TetherNodeTestFactory {
  public static create(options: TestEntityOptions & { parentNodeId?: string } = {}): Result<TetherNode> {
    const testId = options.testId || this.generateTestId();
    const prefix = options.prefix || 'test';
    const suffix = options.suffix || '';
    const parentNodeId = options.parentNodeId || `test-parent-${testId}`;
    
    try {
      const actionIdResult = NodeId.create(`${testId}-tether${suffix}`);
      const parentNodeIdResult = NodeId.create(parentNodeId);
      const retryPolicyResult = RetryPolicy.create({
        maxAttempts: 3,
        backoffMs: 1000,
        exponential: true
      });
      const raciResult = RACI.create({
        responsible: 'test-user',
        accountable: 'test-user',
        consulted: [],
        informed: []
      });

      if (actionIdResult.isFailure || parentNodeIdResult.isFailure || 
          retryPolicyResult.isFailure || raciResult.isFailure) {
        return Result.fail(`Invalid tether node creation parameters`);
      }

      const nodeResult = TetherNode.create({
        actionId: actionIdResult.value,
        parentNodeId: parentNodeIdResult.value,
        name: `${prefix}-tether-node-${testId}${suffix}`,
        description: `Test tether node for integration testing`,
        executionMode: ExecutionMode.SEQUENTIAL,
        executionOrder: 1,
        status: ActionStatus.PENDING,
        priority: 5,
        estimatedDuration: 1000,
        retryPolicy: retryPolicyResult.value,
        raci: raciResult.value,
        metadata: {
          testData: true,
          testId
        },
        tetherData: {
          connectionType: 'api',
          endpoint: `https://test-api.example.com/${testId}`,
          method: 'POST',
          testMode: true
        }
      });

      return nodeResult;
    } catch (error) {
      return Result.fail(`Failed to create test TetherNode: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static generateTestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Factory for creating KBNode test entities
 */
export class KBNodeTestFactory {
  public static create(options: TestEntityOptions & { parentNodeId?: string } = {}): Result<KBNode> {
    const testId = options.testId || this.generateTestId();
    const prefix = options.prefix || 'test';
    const suffix = options.suffix || '';
    const parentNodeId = options.parentNodeId || `test-parent-${testId}`;
    
    try {
      const actionIdResult = NodeId.create(`${testId}-kb${suffix}`);
      const parentNodeIdResult = NodeId.create(parentNodeId);
      const retryPolicyResult = RetryPolicy.create({
        maxAttempts: 2,
        backoffMs: 500,
        exponential: false
      });
      const raciResult = RACI.create({
        responsible: 'test-user',
        accountable: 'test-user',
        consulted: ['test-expert'],
        informed: ['test-stakeholder']
      });

      if (actionIdResult.isFailure || parentNodeIdResult.isFailure || 
          retryPolicyResult.isFailure || raciResult.isFailure) {
        return Result.fail(`Invalid KB node creation parameters`);
      }

      const nodeResult = KBNode.create({
        actionId: actionIdResult.value,
        parentNodeId: parentNodeIdResult.value,
        name: `${prefix}-kb-node-${testId}${suffix}`,
        description: `Test knowledge base node for integration testing`,
        executionMode: ExecutionMode.PARALLEL,
        executionOrder: 2,
        status: ActionStatus.READY,
        priority: 3,
        estimatedDuration: 2000,
        retryPolicy: retryPolicyResult.value,
        raci: raciResult.value,
        metadata: {
          testData: true,
          testId
        },
        kbData: {
          knowledgeBaseId: `test-kb-${testId}`,
          queryType: 'semantic_search',
          searchParameters: {
            maxResults: 10,
            threshold: 0.8
          },
          testMode: true
        }
      });

      return nodeResult;
    } catch (error) {
      return Result.fail(`Failed to create test KBNode: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static generateTestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Factory for creating FunctionModelContainerNode test entities
 */
export class FunctionModelContainerNodeTestFactory {
  public static create(options: TestEntityOptions & { parentNodeId?: string } = {}): Result<FunctionModelContainerNode> {
    const testId = options.testId || this.generateTestId();
    const prefix = options.prefix || 'test';
    const suffix = options.suffix || '';
    const parentNodeId = options.parentNodeId || `test-parent-${testId}`;
    
    try {
      const actionIdResult = NodeId.create(`${testId}-container${suffix}`);
      const parentNodeIdResult = NodeId.create(parentNodeId);
      const retryPolicyResult = RetryPolicy.create({
        maxAttempts: 5,
        backoffMs: 2000,
        exponential: true
      });
      const raciResult = RACI.create({
        responsible: 'test-user',
        accountable: 'test-manager',
        consulted: ['test-architect'],
        informed: ['test-team']
      });

      if (actionIdResult.isFailure || parentNodeIdResult.isFailure || 
          retryPolicyResult.isFailure || raciResult.isFailure) {
        return Result.fail(`Invalid container node creation parameters`);
      }

      const nodeResult = FunctionModelContainerNode.create({
        actionId: actionIdResult.value,
        parentNodeId: parentNodeIdResult.value,
        name: `${prefix}-container-node-${testId}${suffix}`,
        description: `Test function model container for integration testing`,
        executionMode: ExecutionMode.SEQUENTIAL,
        executionOrder: 1,
        status: ActionStatus.PENDING,
        priority: 8,
        estimatedDuration: 5000,
        retryPolicy: retryPolicyResult.value,
        raci: raciResult.value,
        metadata: {
          testData: true,
          testId
        },
        containerData: {
          childModelId: `test-child-model-${testId}`,
          inputMapping: {
            'input1': 'childInput1',
            'input2': 'childInput2'
          },
          outputMapping: {
            'childOutput1': 'output1',
            'childOutput2': 'output2'
          },
          testMode: true
        }
      });

      return nodeResult;
    } catch (error) {
      return Result.fail(`Failed to create test FunctionModelContainerNode: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static generateTestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Comprehensive test scenario factory
 */
export class TestScenarioFactory {
  /**
   * Create a complete workflow scenario for comprehensive testing
   */
  public static createCompleteWorkflowScenario(testId?: string): Result<{
    model: FunctionModel;
    inputNode: IONode;
    outputNode: IONode;
    stageNode: StageNode;
    tetherNode: TetherNode;
    kbNode: KBNode;
    containerNode: FunctionModelContainerNode;
  }> {
    const scenarioId = testId || `scenario-${Date.now()}`;

    try {
      // Create main model
      const modelResult = FunctionModelTestFactory.create({ testId: scenarioId });
      if (modelResult.isFailure) {
        return Result.fail(`Failed to create scenario model: ${modelResult.error}`);
      }

      // Create nodes
      const inputNodeResult = IONodeTestFactory.create({ testId: scenarioId, nodeType: 'input' });
      const outputNodeResult = IONodeTestFactory.create({ testId: scenarioId, nodeType: 'output' });
      const stageNodeResult = StageNodeTestFactory.create({ testId: scenarioId });

      if (inputNodeResult.isFailure || outputNodeResult.isFailure || stageNodeResult.isFailure) {
        return Result.fail('Failed to create scenario nodes');
      }

      // Create action nodes
      const stageNodeId = stageNodeResult.value.nodeId.toString();
      const tetherNodeResult = TetherNodeTestFactory.create({ testId: scenarioId, parentNodeId: stageNodeId });
      const kbNodeResult = KBNodeTestFactory.create({ testId: scenarioId, parentNodeId: stageNodeId });
      const containerNodeResult = FunctionModelContainerNodeTestFactory.create({ 
        testId: scenarioId, 
        parentNodeId: stageNodeId 
      });

      if (tetherNodeResult.isFailure || kbNodeResult.isFailure || containerNodeResult.isFailure) {
        return Result.fail('Failed to create scenario action nodes');
      }

      const model = modelResult.value;
      const inputNode = inputNodeResult.value;
      const outputNode = outputNodeResult.value;
      const stageNode = stageNodeResult.value;
      const tetherNode = tetherNodeResult.value;
      const kbNode = kbNodeResult.value;
      const containerNode = containerNodeResult.value;

      // Add nodes to model
      model.addNode(inputNode);
      model.addNode(outputNode);
      model.addNode(stageNode);

      // Add action nodes to model
      model.addActionNode(tetherNode);
      model.addActionNode(kbNode);
      model.addActionNode(containerNode);

      return Result.ok({
        model,
        inputNode,
        outputNode,
        stageNode,
        tetherNode,
        kbNode,
        containerNode
      });
    } catch (error) {
      return Result.fail(
        `Failed to create complete workflow scenario: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}