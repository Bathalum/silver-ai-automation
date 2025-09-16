import { EdgeValidationService } from '../../../../lib/domain/services/edge-validation-service';
import { IONode, IONodeProps } from '../../../../lib/domain/entities/io-node';
import { StageNode, StageNodeProps } from '../../../../lib/domain/entities/stage-node';
import { ActionNode } from '../../../../lib/domain/entities/action-node';
import { NodeLink } from '../../../../lib/domain/entities/node-link';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { Position } from '../../../../lib/domain/value-objects/position';
import { Result } from '../../../../lib/domain/shared/result';
import { FeatureType, LinkType, ContainerNodeType, ExecutionMode, ActionStatus, NodeStatus } from '../../../../lib/domain/enums';

// Mock ActionNode implementation for testing
class MockActionNode extends ActionNode {
  public static create(props: any): Result<MockActionNode> {
    const now = new Date();
    const actionNodeProps = {
      ...props,
      createdAt: now,
      updatedAt: now,
    };
    return Result.ok(new MockActionNode(actionNodeProps));
  }

  public getActionType(): string {
    return 'MockAction';
  }
}

describe('EdgeValidationService', () => {
  let validationService: EdgeValidationService;
  let ioNode1: IONode;
  let ioNode2: IONode;
  let stageNode1: StageNode;
  let stageNode2: StageNode;
  let actionNode1: MockActionNode;
  let actionNode2: MockActionNode;

  beforeEach(async () => {
    validationService = new EdgeValidationService();

    // Create test nodes using NodeId.generate() for valid UUIDs
    const nodeId1 = NodeId.generate();
    const nodeId2 = NodeId.generate();
    const stageNodeId1 = NodeId.generate();
    const stageNodeId2 = NodeId.generate();
    const actionNodeId1 = NodeId.generate();
    const actionNodeId2 = NodeId.generate();
    const positionResult = Position.create(0, 0);

    expect(positionResult.isSuccess).toBe(true);

    // Create IO nodes
    const ioNodeProps1: IONodeProps = {
      nodeId: nodeId1,
      modelId: 'test-model',
      name: 'Input Node',
      description: 'Test input node',
      position: positionResult.value,
      dependencies: [],
      executionType: ExecutionMode.SEQUENTIAL,
      status: NodeStatus.ACTIVE,
      metadata: {},
      visualProperties: {},
      ioData: {
        boundaryType: 'input',
        inputDataContract: { type: 'string' }
      }
    };

    const ioNodeProps2: IONodeProps = {
      nodeId: nodeId2,
      modelId: 'test-model',
      name: 'Output Node',
      description: 'Test output node',
      position: positionResult.value,
      dependencies: [],
      executionType: ExecutionMode.SEQUENTIAL,
      status: NodeStatus.ACTIVE,
      metadata: {},
      visualProperties: {},
      ioData: {
        boundaryType: 'output',
        outputDataContract: { type: 'string' }
      }
    };

    const ioNode1Result = IONode.create(ioNodeProps1);
    const ioNode2Result = IONode.create(ioNodeProps2);

    expect(ioNode1Result.isSuccess).toBe(true);
    expect(ioNode2Result.isSuccess).toBe(true);

    ioNode1 = ioNode1Result.value;
    ioNode2 = ioNode2Result.value;

    // Create Stage nodes
    const stageNodeProps1: StageNodeProps = {
      nodeId: stageNodeId1,
      modelId: 'test-model',
      name: 'Process Stage',
      description: 'Test process stage',
      position: positionResult.value,
      dependencies: [],
      executionType: ExecutionMode.SEQUENTIAL,
      status: NodeStatus.ACTIVE,
      metadata: {},
      visualProperties: {},
      stageData: {
        stageType: 'process',
        stageGoals: ['Process data']
      },
      parallelExecution: false,
      actionNodes: [],
      configuration: {}
    };

    const stageNodeProps2: StageNodeProps = {
      nodeId: stageNodeId2,
      modelId: 'test-model',
      name: 'Gateway Stage',
      description: 'Test gateway stage',
      position: positionResult.value,
      dependencies: [],
      executionType: ExecutionMode.SEQUENTIAL,
      status: NodeStatus.ACTIVE,
      metadata: {},
      visualProperties: {},
      stageData: {
        stageType: 'gateway',
        stageGoals: ['Make decisions']
      },
      parallelExecution: false,
      actionNodes: [],
      configuration: {}
    };

    const stageNode1Result = StageNode.create(stageNodeProps1);
    const stageNode2Result = StageNode.create(stageNodeProps2);

    expect(stageNode1Result.isSuccess).toBe(true);
    expect(stageNode2Result.isSuccess).toBe(true);

    stageNode1 = stageNode1Result.value;
    stageNode2 = stageNode2Result.value;

    // Create Action nodes
    const actionNodeProps1 = {
      actionId: actionNodeId1,
      parentNodeId: stageNodeId1,
      modelId: 'test-model',
      name: 'Action 1',
      description: 'Test action 1',
      executionMode: ExecutionMode.SEQUENTIAL,
      executionOrder: 1,
      status: ActionStatus.ACTIVE,
      priority: 5,
      retryPolicy: { maxAttempts: 3, strategy: 'linear', baseDelayMs: 1000, maxDelayMs: 5000, enabled: true },
      raci: { responsible: 'user', accountable: 'system', consulted: [], informed: [] },
      metadata: {}
    };

    const actionNodeProps2 = {
      actionId: actionNodeId2,
      parentNodeId: stageNodeId2,
      modelId: 'test-model',
      name: 'Action 2',
      description: 'Test action 2',
      executionMode: ExecutionMode.SEQUENTIAL,
      executionOrder: 1,
      status: ActionStatus.ACTIVE,
      priority: 5,
      retryPolicy: { maxAttempts: 3, strategy: 'linear', baseDelayMs: 1000, maxDelayMs: 5000, enabled: true },
      raci: { responsible: 'user', accountable: 'system', consulted: [], informed: [] },
      metadata: {}
    };

    const actionNode1Result = MockActionNode.create(actionNodeProps1);
    const actionNode2Result = MockActionNode.create(actionNodeProps2);

    expect(actionNode1Result.isSuccess).toBe(true);
    expect(actionNode2Result.isSuccess).toBe(true);

    actionNode1 = actionNode1Result.value;
    actionNode2 = actionNode2Result.value;
  });

  describe('validateConnection', () => {
    describe('Valid Sibling Connections (Left-Right Handles)', () => {
      it('should allow IO node to IO node connections', () => {
        const result = validationService.validateConnection({
          sourceNodeId: ioNode1.nodeId,
          targetNodeId: ioNode2.nodeId,
          sourceHandle: 'right',
          targetHandle: 'left',
          sourceNodeType: ContainerNodeType.IO_NODE,
          targetNodeType: ContainerNodeType.IO_NODE
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(true);
        expect(result.value.errors).toHaveLength(0);
      });

      it('should allow Stage node to Stage node connections', () => {
        const result = validationService.validateConnection({
          sourceNodeId: stageNode1.nodeId,
          targetNodeId: stageNode2.nodeId,
          sourceHandle: 'right',
          targetHandle: 'left',
          sourceNodeType: ContainerNodeType.STAGE_NODE,
          targetNodeType: ContainerNodeType.STAGE_NODE
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(true);
        expect(result.value.errors).toHaveLength(0);
      });

      it('should allow IO node to Stage node connections', () => {
        const result = validationService.validateConnection({
          sourceNodeId: ioNode1.nodeId,
          targetNodeId: stageNode1.nodeId,
          sourceHandle: 'right',
          targetHandle: 'left',
          sourceNodeType: ContainerNodeType.IO_NODE,
          targetNodeType: ContainerNodeType.STAGE_NODE
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(true);
        expect(result.value.errors).toHaveLength(0);
      });

      it('should allow Stage node to IO node connections', () => {
        const result = validationService.validateConnection({
          sourceNodeId: stageNode1.nodeId,
          targetNodeId: ioNode2.nodeId,
          sourceHandle: 'right',
          targetHandle: 'left',
          sourceNodeType: ContainerNodeType.STAGE_NODE,
          targetNodeType: ContainerNodeType.IO_NODE
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(true);
        expect(result.value.errors).toHaveLength(0);
      });
    });

    describe('Valid Parent-Child Connections (Container Handles)', () => {
      it('should allow Action node to Stage node via container handles', () => {
        const result = validationService.validateConnection({
          sourceNodeId: actionNode1.nodeId,
          targetNodeId: stageNode1.nodeId,
          sourceHandle: 'container-out',
          targetHandle: 'container-in',
          sourceNodeType: 'actionNode',
          targetNodeType: ContainerNodeType.STAGE_NODE
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(true);
        expect(result.value.errors).toHaveLength(0);
      });

      it('should allow Stage node to Action node via container handles', () => {
        const result = validationService.validateConnection({
          sourceNodeId: stageNode1.nodeId,
          targetNodeId: actionNode1.nodeId,
          sourceHandle: 'container-out',
          targetHandle: 'container-in',
          sourceNodeType: ContainerNodeType.STAGE_NODE,
          targetNodeType: 'actionNode'
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(true);
        expect(result.value.errors).toHaveLength(0);
      });

      it('should allow Stage node to Action node with bottom-to-top handles', () => {
        const result = validationService.validateConnection({
          sourceNodeId: stageNode1.nodeId,
          targetNodeId: actionNode1.nodeId,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          sourceNodeType: ContainerNodeType.STAGE_NODE,
          targetNodeType: 'actionNode'
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(true);
        expect(result.value.errors).toHaveLength(0);
      });
    });

    describe('Invalid Connections', () => {
      it('should reject Action node to Action node connections', () => {
        const result = validationService.validateConnection({
          sourceNodeId: actionNode1.nodeId,
          targetNodeId: actionNode2.nodeId,
          sourceHandle: 'right',
          targetHandle: 'left',
          sourceNodeType: 'actionNode',
          targetNodeType: 'actionNode'
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(false);
        expect(result.value.errors).toContain('Action nodes cannot connect directly to other Action nodes');
      });

      it('should reject IO node to Action node direct connections', () => {
        const result = validationService.validateConnection({
          sourceNodeId: ioNode1.nodeId,
          targetNodeId: actionNode1.nodeId,
          sourceHandle: 'right',
          targetHandle: 'left',
          sourceNodeType: ContainerNodeType.IO_NODE,
          targetNodeType: 'actionNode'
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(false);
        expect(result.value.errors).toContain('IO nodes cannot connect directly to Action nodes');
      });

      it('should reject Action node to IO node direct connections', () => {
        const result = validationService.validateConnection({
          sourceNodeId: actionNode1.nodeId,
          targetNodeId: ioNode1.nodeId,
          sourceHandle: 'right',
          targetHandle: 'left',
          sourceNodeType: 'actionNode',
          targetNodeType: ContainerNodeType.IO_NODE
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(false);
        expect(result.value.errors).toContain('Action nodes cannot connect directly to IO nodes');
      });

      it('should reject self-connections', () => {
        const result = validationService.validateConnection({
          sourceNodeId: ioNode1.nodeId,
          targetNodeId: ioNode1.nodeId,
          sourceHandle: 'right',
          targetHandle: 'left',
          sourceNodeType: ContainerNodeType.IO_NODE,
          targetNodeType: ContainerNodeType.IO_NODE
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(false);
        expect(result.value.errors).toContain('Self-connections are not allowed');
      });
    });

    describe('Handle Validation', () => {
      it('should reject invalid handle combinations for sibling connections', () => {
        const result = validationService.validateConnection({
          sourceNodeId: ioNode1.nodeId,
          targetNodeId: ioNode2.nodeId,
          sourceHandle: 'container-out',
          targetHandle: 'container-in',
          sourceNodeType: ContainerNodeType.IO_NODE,
          targetNodeType: ContainerNodeType.IO_NODE
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(false);
        expect(result.value.errors).toContain('Sibling connections must use left/right handles');
      });

      it('should reject invalid handle combinations for parent-child connections', () => {
        const result = validationService.validateConnection({
          sourceNodeId: actionNode1.nodeId,
          targetNodeId: stageNode1.nodeId,
          sourceHandle: 'right',
          targetHandle: 'left',
          sourceNodeType: 'actionNode',
          targetNodeType: ContainerNodeType.STAGE_NODE
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(false);
        expect(result.value.errors).toContain('Parent-child connections must use container handles');
      });

      it('should reject invalid source handles', () => {
        const result = validationService.validateConnection({
          sourceNodeId: ioNode1.nodeId,
          targetNodeId: ioNode2.nodeId,
          sourceHandle: 'invalid-handle',
          targetHandle: 'left',
          sourceNodeType: ContainerNodeType.IO_NODE,
          targetNodeType: ContainerNodeType.IO_NODE
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(false);
        expect(result.value.errors).toContain('Invalid source handle: invalid-handle');
      });

      it('should reject invalid target handles', () => {
        const result = validationService.validateConnection({
          sourceNodeId: ioNode1.nodeId,
          targetNodeId: ioNode2.nodeId,
          sourceHandle: 'right',
          targetHandle: 'invalid-handle',
          sourceNodeType: ContainerNodeType.IO_NODE,
          targetNodeType: ContainerNodeType.IO_NODE
        });

        expect(result.isSuccess).toBe(true);
        expect(result.value.isValid).toBe(false);
        expect(result.value.errors).toContain('Invalid target handle: invalid-handle');
      });
    });
  });

  describe('validateCircularDependency', () => {
    it('should reject circular dependencies in simple case', () => {
      const existingConnections: NodeLink[] = [];
      
      // Create existing connection from node2 to node1
      const linkId1 = NodeId.generate();
      
      const existingLinkResult = NodeLink.create({
        linkId: linkId1,
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceEntityId: ioNode2.nodeId.toString(),
        targetEntityId: ioNode1.nodeId.toString(),
        sourceNodeId: ioNode2.nodeId,
        targetNodeId: ioNode1.nodeId,
        linkType: LinkType.DEPENDENCY,
        linkStrength: 0.8
      });
      
      expect(existingLinkResult.isSuccess).toBe(true);
      existingConnections.push(existingLinkResult.value);

      // Try to create connection from node1 to node2 (would create cycle)
      const result = validationService.validateCircularDependency(
        ioNode1.nodeId,
        ioNode2.nodeId,
        existingConnections
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Connection would create circular dependency');
    });

    it('should allow non-circular connections', () => {
      const existingConnections: NodeLink[] = [];
      
      const result = validationService.validateCircularDependency(
        ioNode1.nodeId,
        ioNode2.nodeId,
        existingConnections
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(true);
      expect(result.value.errors).toHaveLength(0);
    });

    it('should detect complex circular dependencies', () => {
      const existingConnections: NodeLink[] = [];
      
      // Create chain: node1 -> stage1 -> stage2
      const linkId1 = NodeId.generate();
      const linkId2 = NodeId.generate();

      const link1Result = NodeLink.create({
        linkId: linkId1,
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceEntityId: ioNode1.nodeId.toString(),
        targetEntityId: stageNode1.nodeId.toString(),
        sourceNodeId: ioNode1.nodeId,
        targetNodeId: stageNode1.nodeId,
        linkType: LinkType.DEPENDENCY,
        linkStrength: 0.8
      });

      const link2Result = NodeLink.create({
        linkId: linkId2,
        sourceFeature: FeatureType.FUNCTION_MODEL,
        targetFeature: FeatureType.FUNCTION_MODEL,
        sourceEntityId: stageNode1.nodeId.toString(),
        targetEntityId: stageNode2.nodeId.toString(),
        sourceNodeId: stageNode1.nodeId,
        targetNodeId: stageNode2.nodeId,
        linkType: LinkType.DEPENDENCY,
        linkStrength: 0.8
      });

      expect(link1Result.isSuccess).toBe(true);
      expect(link2Result.isSuccess).toBe(true);
      
      existingConnections.push(link1Result.value, link2Result.value);

      // Try to create stage2 -> node1 (would complete cycle)
      const result = validationService.validateCircularDependency(
        stageNode2.nodeId,
        ioNode1.nodeId,
        existingConnections
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Connection would create circular dependency');
    });
  });

  describe('validateWorkflowStructure', () => {
    it('should validate complete workflow structure', () => {
      const nodes = [ioNode1, ioNode2, stageNode1, stageNode2];
      const actionNodes = [actionNode1, actionNode2];
      const connections: NodeLink[] = [];

      const result = validationService.validateWorkflowStructure(nodes, actionNodes, connections);

      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(true);
    });

    it('should detect structural issues in workflow', () => {
      const nodes = [ioNode1]; // Only one node - incomplete workflow
      const actionNodes: MockActionNode[] = [];
      const connections: NodeLink[] = [];

      const result = validationService.validateWorkflowStructure(nodes, actionNodes, connections);

      expect(result.isSuccess).toBe(true);
      expect(result.value.warnings).toContain('Workflow has insufficient nodes for meaningful processing');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty node lists', () => {
      const result = validationService.validateWorkflowStructure([], [], []);

      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Workflow must contain at least one node');
    });

    it('should validate node type compatibility', () => {
      const result = validationService.validateConnection({
        sourceNodeId: ioNode1.nodeId,
        targetNodeId: ioNode2.nodeId,
        sourceHandle: 'right',
        targetHandle: 'left',
        sourceNodeType: 'unknownType' as any,
        targetNodeType: ContainerNodeType.IO_NODE
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Unknown source node type: unknownType');
    });

    it('should handle invalid NodeId objects', () => {
      const invalidNodeId = null as any;
      
      const result = validationService.validateConnection({
        sourceNodeId: invalidNodeId,
        targetNodeId: ioNode2.nodeId,
        sourceHandle: 'right',
        targetHandle: 'left',
        sourceNodeType: ContainerNodeType.IO_NODE,
        targetNodeType: ContainerNodeType.IO_NODE
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Invalid source node ID');
    });
  });

  describe('Business Rule Enforcement', () => {
    it('should enforce IO node boundary validation', () => {
      // Input nodes should not have incoming connections from other input nodes
      const inputNode1Result = IONode.create({
        nodeId: NodeId.generate(),
        modelId: 'test-model',
        name: 'Input 1',
        description: 'First input',
        position: Position.create(0, 0).value,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.ACTIVE,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: 'input',
          inputDataContract: { type: 'string' }
        }
      });

      const inputNode2Result = IONode.create({
        nodeId: NodeId.generate(),
        modelId: 'test-model',
        name: 'Input 2',
        description: 'Second input',
        position: Position.create(100, 0).value,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.ACTIVE,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: 'input',
          inputDataContract: { type: 'number' }
        }
      });

      expect(inputNode1Result.isSuccess).toBe(true);
      expect(inputNode2Result.isSuccess).toBe(true);

      const result = validationService.validateConnection({
        sourceNodeId: inputNode1Result.value.nodeId,
        targetNodeId: inputNode2Result.value.nodeId,
        sourceHandle: 'right',
        targetHandle: 'left',
        sourceNodeType: ContainerNodeType.IO_NODE,
        targetNodeType: ContainerNodeType.IO_NODE
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value.warnings).toContain('Input to input connections may indicate design issue');
    });

    it('should enforce action node containment rules', () => {
      // Action nodes should belong to their parent stage
      const orphanedActionResult = MockActionNode.create({
        actionId: NodeId.generate(),
        parentNodeId: NodeId.generate(),
        modelId: 'test-model',
        name: 'Orphaned Action',
        executionMode: ExecutionMode.SEQUENTIAL,
        executionOrder: 1,
        status: ActionStatus.ACTIVE,
        priority: 5,
        retryPolicy: { maxAttempts: 3, strategy: 'linear', baseDelayMs: 1000, maxDelayMs: 5000, enabled: true },
        raci: { responsible: 'user', accountable: 'system', consulted: [], informed: [] },
        metadata: {}
      });

      expect(orphanedActionResult.isSuccess).toBe(true);

      const nodes = [stageNode1];
      const actionNodes = [orphanedActionResult.value];
      const connections: NodeLink[] = [];

      const result = validationService.validateWorkflowStructure(nodes, actionNodes, connections);

      expect(result.isSuccess).toBe(true);
      expect(result.value.warnings).toContain('Action node "Orphaned Action" parent not found in workflow');
    });

    it('should enforce execution flow constraints', () => {
      // Output nodes without dependencies should be warned
      const isolatedOutputResult = IONode.create({
        nodeId: NodeId.generate(),
        modelId: 'test-model',
        name: 'Isolated Output',
        description: 'Output with no inputs',
        position: Position.create(200, 0).value,
        dependencies: [],
        executionType: ExecutionMode.SEQUENTIAL,
        status: NodeStatus.ACTIVE,
        metadata: {},
        visualProperties: {},
        ioData: {
          boundaryType: 'output',
          outputDataContract: { type: 'string' }
        }
      });

      expect(isolatedOutputResult.isSuccess).toBe(true);

      const nodes = [isolatedOutputResult.value];
      const actionNodes: MockActionNode[] = [];
      const connections: NodeLink[] = [];

      const result = validationService.validateWorkflowStructure(nodes, actionNodes, connections);

      expect(result.isSuccess).toBe(true);
      expect(result.value.warnings).toContain('Output node "Isolated Output" has no input dependencies');
    });
  });
});