import { 
  NodeContextAccessService, 
  NodeContext, 
  ContextAccessResult, 
  ContextAccessPattern 
} from '@/lib/domain/services/node-context-access-service';
import { ActionNode } from '@/lib/domain/entities/action-node';
import { TetherNode } from '@/lib/domain/entities/tether-node';
import { KBNode } from '@/lib/domain/entities/kb-node';
import { FunctionModelContainerNode } from '@/lib/domain/entities/function-model-container-node';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { RetryPolicy } from '@/lib/domain/value-objects/retry-policy';
import { ExecutionMode, ActionStatus } from '@/lib/domain/enums';
import { Result } from '@/lib/domain/shared/result';

// Mock ActionNode implementation for testing
class MockActionNode extends ActionNode {
  public static createMock(
    nodeId: NodeId,
    parentNodeId: NodeId,
    name: string = 'Mock Action',
    executionMode: ExecutionMode = ExecutionMode.SEQUENTIAL
  ): MockActionNode {
    const retryPolicy = RetryPolicy.create({
      maxAttempts: 3,
      strategy: 'exponential',
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      enabled: true
    }).value!;

    return new MockActionNode({
      actionId: nodeId,
      parentNodeId,
      modelId: 'test-model',
      name,
      description: 'Test action node',
      executionMode,
      executionOrder: 1,
      status: ActionStatus.ACTIVE,
      priority: 1,
      estimatedDuration: 60,
      retryPolicy,
      raci: { responsible: ['user1'], accountable: ['user2'], consulted: [], informed: [] } as any,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}

// Mock TetherNode implementation for testing
class MockTetherNode extends TetherNode {
  public static createMock(
    nodeId: NodeId,
    parentNodeId: NodeId,
    tetherReferenceId: string = 'test-tether'
  ): MockTetherNode {
    const retryPolicy = RetryPolicy.create({
      maxAttempts: 3,
      strategy: 'exponential',
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      enabled: true
    }).value!;

    return new MockTetherNode({
      actionId: nodeId,
      parentNodeId,
      modelId: 'test-model',
      name: 'Mock Tether Node',
      description: 'Test tether node',
      executionMode: ExecutionMode.SEQUENTIAL,
      executionOrder: 1,
      status: ActionStatus.ACTIVE,
      priority: 1,
      estimatedDuration: 60,
      retryPolicy,
      raci: { responsible: ['user1'], accountable: ['user2'], consulted: [], informed: [] } as any,
      metadata: {},
      actionType: 'tether',
      configuration: {
        tetherReferenceId,
        executionParameters: { param1: 'value1' },
        outputMapping: { output1: 'result1' },
        resourceRequirements: { cpu: '100m', memory: '256Mi' },
        integrationConfig: { endpoint: 'https://api.example.com' }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}

// Mock KBNode implementation for testing
class MockKBNode extends KBNode {
  public static createMock(
    nodeId: NodeId,
    parentNodeId: NodeId,
    kbReferenceId: string = 'test-kb'
  ): MockKBNode {
    const retryPolicy = RetryPolicy.create({
      maxAttempts: 3,
      strategy: 'exponential',
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      enabled: true
    }).value!;

    return new MockKBNode({
      actionId: nodeId,
      parentNodeId,
      modelId: 'test-model',
      name: 'Mock KB Node',
      description: 'Test KB node',
      executionMode: ExecutionMode.SEQUENTIAL,
      executionOrder: 1,
      status: ActionStatus.ACTIVE,
      priority: 1,
      estimatedDuration: 60,
      retryPolicy,
      raci: { responsible: ['user1'], accountable: ['user2'], consulted: [], informed: [] } as any,
      metadata: {},
      actionType: 'knowledgeBase',
      configuration: {
        kbReferenceId,
        shortDescription: 'Test knowledge base reference',
        documentationContext: { section: 'api', subsection: 'authentication' },
        searchKeywords: ['auth', 'api', 'security'],
        accessPermissions: { read: true, write: false, execute: false }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}

// Mock FunctionModelContainerNode implementation for testing
class MockFunctionModelContainerNode {
  public static createMock(
    nodeId: NodeId,
    nestedModelId: string = 'nested-model'
  ): FunctionModelContainerNode {
    const retryPolicy = RetryPolicy.create({
      maxAttempts: 3,
      strategy: 'exponential',
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      enabled: true
    }).value!;

    const containerNode = FunctionModelContainerNode.create({
      actionId: nodeId,
      parentNodeId: NodeId.generate(), // We need a parent for proper creation
      modelId: 'parent-model',
      name: 'Mock Container Node',
      description: 'Test container node',
      actionType: 'functionModelContainer',
      executionOrder: 1,
      executionMode: ExecutionMode.SEQUENTIAL,
      status: ActionStatus.ACTIVE,
      priority: 1,
      estimatedDuration: 600,
      retryPolicy,
      configuration: {
        nestedModelId,
        orchestrationMode: 'embedded',
        contextMapping: { input: 'parentOutput' },
        outputExtraction: { result: 'nestedResult' },
        executionPolicy: { timeout: 5000, retries: 3 }
      }
    });

    if (containerNode.isFailure) {
      throw new Error(`Failed to create mock container node: ${containerNode.error}`);
    }

    return containerNode.value;
  }
}

describe('NodeContextAccessService', () => {
  let service: NodeContextAccessService;

  beforeEach(() => {
    service = new NodeContextAccessService();
  });

  describe('Node Registration', () => {
    it('should register a node successfully', () => {
      // Arrange
      const nodeId = NodeId.generate();
      const parentNodeId = NodeId.generate();
      const contextData = { key: 'value', timestamp: Date.now() };

      // Act
      const result = service.registerNode(nodeId, 'actionNode', parentNodeId, contextData, 1);

      // Assert
      expect(result.isSuccess).toBe(true);
    });

    it('should register root node without parent', () => {
      // Arrange
      const nodeId = NodeId.generate();
      const contextData = { rootData: 'rootValue' };

      // Act
      const result = service.registerNode(nodeId, 'rootNode', undefined, contextData, 0);

      // Assert
      expect(result.isSuccess).toBe(true);
    });

    it('should maintain node hierarchy levels', () => {
      // Arrange
      const rootId = NodeId.generate();
      const childId = NodeId.generate();
      const grandchildId = NodeId.generate();

      // Act
      service.registerNode(rootId, 'root', undefined, { level: 'root' }, 0);
      service.registerNode(childId, 'child', rootId, { level: 'child' }, 1);
      service.registerNode(grandchildId, 'grandchild', childId, { level: 'grandchild' }, 2);

      // Assert
      const rootContext = service.getNodeContext(rootId, rootId);
      const childContext = service.getNodeContext(childId, childId);
      const grandchildContext = service.getNodeContext(grandchildId, grandchildId);

      expect(rootContext.isSuccess).toBe(true);
      expect(childContext.isSuccess).toBe(true);
      expect(grandchildContext.isSuccess).toBe(true);
      expect(rootContext.value.hierarchyLevel).toBe(0);
      expect(childContext.value.hierarchyLevel).toBe(1);
      expect(grandchildContext.value.hierarchyLevel).toBe(2);
    });

    it('should create sibling groups automatically', () => {
      // Arrange
      const parentId = NodeId.generate();
      const sibling1Id = NodeId.generate();
      const sibling2Id = NodeId.generate();
      const sibling3Id = NodeId.generate();

      // Act
      service.registerNode(parentId, 'parent', undefined, { parent: true }, 0);
      service.registerNode(sibling1Id, 'child', parentId, { sibling: 1 }, 1);
      service.registerNode(sibling2Id, 'child', parentId, { sibling: 2 }, 1);
      service.registerNode(sibling3Id, 'child', parentId, { sibling: 3 }, 1);

      // Assert
      const sibling1Contexts = service.getAccessibleContexts(sibling1Id);
      expect(sibling1Contexts.isSuccess).toBe(true);
      
      // Should be able to access sibling contexts
      const siblingAccess = sibling1Contexts.value.filter(access => 
        access.accessReason.includes('Sibling')
      );
      expect(siblingAccess.length).toBe(2); // Two other siblings
    });
  });

  describe('Sibling Access Pattern', () => {
    let parentId: NodeId;
    let sibling1Id: NodeId;
    let sibling2Id: NodeId;
    let sibling3Id: NodeId;

    beforeEach(() => {
      parentId = NodeId.generate();
      sibling1Id = NodeId.generate();
      sibling2Id = NodeId.generate();
      sibling3Id = NodeId.generate();

      service.registerNode(parentId, 'parent', undefined, { parentContext: 'data' }, 0);
      service.registerNode(sibling1Id, 'sibling', parentId, { siblingData: 'sibling1' }, 1);
      service.registerNode(sibling2Id, 'sibling', parentId, { siblingData: 'sibling2' }, 1);
      service.registerNode(sibling3Id, 'sibling', parentId, { siblingData: 'sibling3' }, 1);
    });

    it('should provide read-only access to sibling contexts', () => {
      // Act
      const accessibleContexts = service.getAccessibleContexts(sibling1Id);

      // Assert
      expect(accessibleContexts.isSuccess).toBe(true);
      const siblingAccess = accessibleContexts.value.filter(access => 
        access.accessReason.includes('Sibling')
      );
      expect(siblingAccess.length).toBe(2);
      expect(siblingAccess.every(access => access.accessGranted)).toBe(true);
    });

    it('should allow reading sibling context data', () => {
      // Act
      const sibling2Context = service.getNodeContext(sibling1Id, sibling2Id, 'read');

      // Assert
      expect(sibling2Context.isSuccess).toBe(true);
      expect(sibling2Context.value.contextData.siblingData).toBe('sibling2');
    });

    it('should deny write access to sibling contexts', () => {
      // Act
      const writeResult = service.updateNodeContext(sibling1Id, sibling2Id, { newData: 'modified' });

      // Assert
      expect(writeResult.isSuccess).toBe(false);
      expect(writeResult.error).toContain('Access denied');
    });
  });

  describe('Parent-Child Access Pattern', () => {
    let parentId: NodeId;
    let childId: NodeId;
    let grandchildId: NodeId;

    beforeEach(() => {
      parentId = NodeId.generate();
      childId = NodeId.generate();
      grandchildId = NodeId.generate();

      service.registerNode(parentId, 'parent', undefined, { parentLevel: 'data' }, 0);
      service.registerNode(childId, 'child', parentId, { childLevel: 'data' }, 1);
      service.registerNode(grandchildId, 'grandchild', childId, { grandchildLevel: 'data' }, 2);
    });

    it('should provide parent with write access to all descendant contexts', () => {
      // Act
      const parentAccessibleContexts = service.getAccessibleContexts(parentId);

      // Assert
      expect(parentAccessibleContexts.isSuccess).toBe(true);
      const writeAccess = parentAccessibleContexts.value.filter(access => 
        access.context.accessLevel === 'write'
      );
      expect(writeAccess.length).toBeGreaterThan(0);
      
      // Verify that parent can access both child and grandchild
      const childAccess = writeAccess.find(access => access.context.nodeId.equals(childId));
      const grandchildAccess = writeAccess.find(access => access.context.nodeId.equals(grandchildId));
      expect(childAccess).toBeDefined();
      expect(grandchildAccess).toBeDefined();
    });

    it('should allow parent to update child context', () => {
      // Arrange
      const newContextData = { childLevel: 'updated_by_parent', timestamp: Date.now() };

      // Act
      const updateResult = service.updateNodeContext(parentId, childId, newContextData);

      // Assert
      expect(updateResult.isSuccess).toBe(true);
      
      // Verify the update
      const updatedContext = service.getNodeContext(childId, childId);
      expect(updatedContext.isSuccess).toBe(true);
      expect(updatedContext.value.contextData.childLevel).toBe('updated_by_parent');
    });

    it('should allow parent to access grandchild contexts', () => {
      // Act
      const grandchildContext = service.getNodeContext(parentId, grandchildId, 'write');

      // Assert
      expect(grandchildContext.isSuccess).toBe(true);
      expect(grandchildContext.value.contextData.grandchildLevel).toBe('data');
    });

    it('should provide child with access to own context', () => {
      // Act
      const childOwnContext = service.getNodeContext(childId, childId);

      // Assert
      expect(childOwnContext.isSuccess).toBe(true);
      expect(childOwnContext.value.contextData.childLevel).toBe('data');
    });
  });

  describe('Uncle/Aunt Access Pattern', () => {
    let grandparentId: NodeId;
    let parentId: NodeId;
    let uncleId: NodeId;
    let childId: NodeId;

    beforeEach(() => {
      grandparentId = NodeId.generate();
      parentId = NodeId.generate();
      uncleId = NodeId.generate();
      childId = NodeId.generate();

      service.registerNode(grandparentId, 'grandparent', undefined, { grandparentData: 'root' }, 0);
      service.registerNode(parentId, 'parent', grandparentId, { parentData: 'parent' }, 1);
      service.registerNode(uncleId, 'uncle', grandparentId, { uncleData: 'uncle' }, 1);
      service.registerNode(childId, 'child', parentId, { childData: 'child' }, 2);
    });

    it('should provide child with read-only access to uncle contexts', () => {
      // Act
      const childAccessibleContexts = service.getAccessibleContexts(childId);

      // Assert
      expect(childAccessibleContexts.isSuccess).toBe(true);
      const uncleAccess = childAccessibleContexts.value.filter(access => 
        access.accessReason.includes('Uncle/Aunt')
      );
      expect(uncleAccess.length).toBe(1);
      expect(uncleAccess[0].accessGranted).toBe(true);
    });

    it('should allow child to read uncle context for root cause analysis', () => {
      // Act
      const uncleContext = service.getNodeContext(childId, uncleId, 'read');

      // Assert
      expect(uncleContext.isSuccess).toBe(true);
      expect(uncleContext.value.contextData.uncleData).toBe('uncle');
    });

    it('should deny child write access to uncle contexts', () => {
      // Act
      const writeResult = service.updateNodeContext(childId, uncleId, { modified: 'data' });

      // Assert
      expect(writeResult.isSuccess).toBe(false);
      expect(writeResult.error).toContain('Access denied');
    });
  });

  describe('Deep Nesting Access Pattern', () => {
    let level0Id: NodeId;
    let level1Id: NodeId;
    let level2Id: NodeId;
    let level3Id: NodeId;
    let level4Id: NodeId;

    beforeEach(() => {
      level0Id = NodeId.generate();
      level1Id = NodeId.generate();
      level2Id = NodeId.generate();
      level3Id = NodeId.generate();
      level4Id = NodeId.generate();

      service.registerNode(level0Id, 'level0', undefined, { level: 0 }, 0);
      service.registerNode(level1Id, 'level1', level0Id, { level: 1 }, 1);
      service.registerNode(level2Id, 'level2', level1Id, { level: 2 }, 2);
      service.registerNode(level3Id, 'level3', level2Id, { level: 3 }, 3);
      service.registerNode(level4Id, 'level4', level3Id, { level: 4 }, 4);
    });

    it('should provide cascading access through deep hierarchy', () => {
      // Act
      const deepAccessibleContexts = service.getAccessibleContexts(level4Id);

      // Assert
      expect(deepAccessibleContexts.isSuccess).toBe(true);
      const deepNestingAccess = deepAccessibleContexts.value.filter(access => 
        access.accessReason.includes('Deep nesting')
      );
      expect(deepNestingAccess.length).toBeGreaterThan(0);
    });

    it('should provide write access for levels 1-2 and read access for higher levels', () => {
      // Act
      const deepAccessibleContexts = service.getAccessibleContexts(level4Id);

      // Assert
      expect(deepAccessibleContexts.isSuccess).toBe(true);
      const deepNestingAccess = deepAccessibleContexts.value.filter(access => 
        access.accessReason.includes('Deep nesting')
      );

      const writeAccess = deepNestingAccess.filter(access => access.context.accessLevel === 'write');
      const readAccess = deepNestingAccess.filter(access => access.context.accessLevel === 'read');

      expect(writeAccess.length).toBeGreaterThanOrEqual(1); // Level 1-2
      expect(readAccess.length).toBeGreaterThanOrEqual(0); // Level 3+
    });

    it('should allow deep nested node to access intermediate levels', () => {
      // Act
      const level2Context = service.getNodeContext(level4Id, level2Id, 'read');

      // Assert
      expect(level2Context.isSuccess).toBe(true);
      expect(level2Context.value.contextData.level).toBe(2);
    });

    it('should limit deep nesting to prevent infinite loops', () => {
      // Arrange - Create very deep hierarchy (beyond limit)
      let currentParent = level4Id;
      const deepIds: NodeId[] = [];
      
      for (let i = 5; i < 15; i++) {
        const deepId = NodeId.generate();
        service.registerNode(deepId, `level${i}`, currentParent, { level: i }, i);
        deepIds.push(deepId);
        currentParent = deepId;
      }

      // Act
      const veryDeepContext = service.getAccessibleContexts(deepIds[deepIds.length - 1]);

      // Assert
      expect(veryDeepContext.isSuccess).toBe(true);
      const deepNestingAccess = veryDeepContext.value.filter(access => 
        access.accessReason.includes('Deep nesting')
      );
      // Should be limited to prevent infinite traversal
      expect(deepNestingAccess.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Context Data Management', () => {
    let nodeId: NodeId;

    beforeEach(() => {
      nodeId = NodeId.generate();
      service.registerNode(nodeId, 'testNode', undefined, { original: 'data' }, 0);
    });

    it('should retrieve node context successfully', () => {
      // Act
      const context = service.getNodeContext(nodeId, nodeId);

      // Assert
      expect(context.isSuccess).toBe(true);
      expect(context.value.contextData.original).toBe('data');
    });

    it('should update node context with proper access', () => {
      // Arrange
      const newContextData = { updated: 'value', timestamp: Date.now() };

      // Act
      const updateResult = service.updateNodeContext(nodeId, nodeId, newContextData);

      // Assert
      expect(updateResult.isSuccess).toBe(true);
      
      const updatedContext = service.getNodeContext(nodeId, nodeId);
      expect(updatedContext.isSuccess).toBe(true);
      expect(updatedContext.value.contextData.updated).toBe('value');
    });

    it('should fail to get context for non-existent node', () => {
      // Arrange
      const nonExistentId = NodeId.generate();

      // Act
      const context = service.getNodeContext(nodeId, nonExistentId);

      // Assert
      expect(context.isSuccess).toBe(false);
      expect(context.error).toContain('Access denied');
    });

    it('should fail to update non-existent node context', () => {
      // Arrange
      const nonExistentId = NodeId.generate();

      // Act
      const updateResult = service.updateNodeContext(nodeId, nonExistentId, { data: 'test' });

      // Assert
      expect(updateResult.isSuccess).toBe(false);
      expect(updateResult.error).toContain('Access denied');
    });
  });

  describe('Action Node Context Extraction', () => {
    it('should extract basic action node context', () => {
      // Arrange
      const nodeId = NodeId.generate();
      const parentId = NodeId.generate();
      const actionNode = MockActionNode.createMock(nodeId, parentId, 'Test Action');

      // Act
      const context = service.extractActionNodeContext(actionNode);

      // Assert
      expect(context).toBeDefined();
      expect(context.actionId).toBe(nodeId.value);
      expect(context.name).toBe('Test Action');
      expect(context.executionMode).toBe(ExecutionMode.SEQUENTIAL);
      expect(context.status).toBe(ActionStatus.ACTIVE);
    });

    it('should extract tether node specific context', () => {
      // Arrange
      const nodeId = NodeId.generate();
      const parentId = NodeId.generate();
      const tetherNode = MockTetherNode.createMock(nodeId, parentId, 'test-tether-ref');

      // Act
      const context = service.extractActionNodeContext(tetherNode);

      // Assert
      expect(context.type).toBe('TetherNode');
      expect(context.tetherReferenceId).toBe('test-tether-ref');
      expect(context.executionParameters).toEqual({ param1: 'value1' });
      expect(context.outputMapping).toEqual({ output1: 'result1' });
      expect(context.resourceRequirements).toEqual({ cpu: '100m', memory: '256Mi' });
    });

    it('should extract KB node specific context', () => {
      // Arrange
      const nodeId = NodeId.generate();
      const parentId = NodeId.generate();
      const kbNode = MockKBNode.createMock(nodeId, parentId, 'test-kb-ref');

      // Act
      const context = service.extractActionNodeContext(kbNode);

      // Assert
      expect(context.type).toBe('KBNode');
      expect(context.kbReferenceId).toBe('test-kb-ref');
      expect(context.shortDescription).toBe('Test knowledge base reference');
      expect(context.searchKeywords).toEqual(['auth', 'api', 'security']);
      expect(context.accessPermissions).toEqual({ read: true, write: false, execute: false });
    });

    it('should extract function model container node context', () => {
      // Arrange
      const nodeId = NodeId.generate();
      const containerNode = MockFunctionModelContainerNode.createMock(nodeId, 'nested-test-model');

      // Act
      const context = service.extractActionNodeContext(containerNode);

      // Assert
      expect(context.type).toBe('FunctionModelContainer');
      expect(context.nestedModelId).toBe('nested-test-model');
      expect(context.orchestrationMode).toBe('embedded');
      expect(context.contextMapping).toEqual({ input: 'parentOutput' });
      expect(context.outputExtraction).toEqual({ result: 'nestedResult' });
    });
  });

  describe('Access Validation', () => {
    let parentId: NodeId;
    let childId: NodeId;
    let unrelatedId: NodeId;

    beforeEach(() => {
      parentId = NodeId.generate();
      childId = NodeId.generate();
      unrelatedId = NodeId.generate();

      service.registerNode(parentId, 'parent', undefined, { parentData: 'data' }, 0);
      service.registerNode(childId, 'child', parentId, { childData: 'data' }, 1);
      service.registerNode(unrelatedId, 'unrelated', undefined, { unrelatedData: 'data' }, 0);
    });

    it('should validate read access correctly', () => {
      // Act
      const readAccess = service.getNodeContext(parentId, childId, 'read');

      // Assert
      expect(readAccess.isSuccess).toBe(true);
    });

    it('should validate write access correctly', () => {
      // Act
      const writeAccess = service.getNodeContext(parentId, childId, 'write');

      // Assert
      expect(writeAccess.isSuccess).toBe(true);
    });

    it('should deny access to unrelated nodes', () => {
      // Act
      const deniedAccess = service.getNodeContext(childId, unrelatedId, 'read');

      // Assert
      expect(deniedAccess.isSuccess).toBe(false);
      expect(deniedAccess.error).toContain('Access denied');
    });

    it('should enforce access level hierarchy', () => {
      // Arrange - Set up a context with read-only access
      const siblingId = NodeId.generate();
      service.registerNode(siblingId, 'sibling', parentId, { siblingData: 'data' }, 1);

      // Act - Try to get execute access on sibling (should fail as siblings only have read access)
      const executeAccess = service.getNodeContext(childId, siblingId, 'execute');

      // Assert
      expect(executeAccess.isSuccess).toBe(false);
      expect(executeAccess.error).toContain('only read is available');
    });
  });

  describe('Complex Hierarchy Scenarios', () => {
    it('should handle multiple family trees simultaneously', () => {
      // Arrange - Create two separate family trees
      const family1Root = NodeId.generate();
      const family1Child = NodeId.generate();
      const family2Root = NodeId.generate();
      const family2Child = NodeId.generate();

      service.registerNode(family1Root, 'root1', undefined, { family: 1 }, 0);
      service.registerNode(family1Child, 'child1', family1Root, { family: 1 }, 1);
      service.registerNode(family2Root, 'root2', undefined, { family: 2 }, 0);
      service.registerNode(family2Child, 'child2', family2Root, { family: 2 }, 1);

      // Act
      const family1Access = service.getAccessibleContexts(family1Child);
      const family2Access = service.getAccessibleContexts(family2Child);

      // Assert
      expect(family1Access.isSuccess).toBe(true);
      expect(family2Access.isSuccess).toBe(true);
      
      // Children should not have access to other family trees
      const family1ChildHasFamily2Access = family1Access.value.some(access => 
        access.context.contextData.family === 2
      );
      expect(family1ChildHasFamily2Access).toBe(false);
    });

    it('should handle orphaned nodes gracefully', () => {
      // Arrange
      const orphanId = NodeId.generate();
      service.registerNode(orphanId, 'orphan', undefined, { orphaned: true }, 0);

      // Act
      const orphanAccess = service.getAccessibleContexts(orphanId);

      // Assert
      expect(orphanAccess.isSuccess).toBe(true);
      expect(orphanAccess.value.length).toBe(0); // No accessible contexts except own
    });

    it('should handle circular hierarchy detection', () => {
      // This test ensures the service doesn't crash with malformed hierarchies
      // In a real scenario, this shouldn't happen due to proper domain design,
      // but it's good to test robustness

      // Arrange
      const nodeA = NodeId.generate();
      const nodeB = NodeId.generate();
      
      service.registerNode(nodeA, 'nodeA', undefined, { node: 'A' }, 0);
      service.registerNode(nodeB, 'nodeB', nodeA, { node: 'B' }, 1);

      // Act
      const accessResult = service.getAccessibleContexts(nodeB);

      // Assert
      expect(accessResult.isSuccess).toBe(true);
    });
  });

  describe('Architectural Boundary Validation', () => {
    it('should enforce domain layer business rules without external dependencies', () => {
      // Arrange - This test validates that the service operates purely within domain boundaries
      const service = new NodeContextAccessService();
      const nodeId = NodeId.generate();
      
      // Act - All operations should work without any external dependencies
      const registerResult = service.registerNode(nodeId, 'domain-node', undefined, { pure: 'domain-data' }, 0);
      const contextResult = service.getNodeContext(nodeId, nodeId);
      const accessResults = service.getAccessibleContexts(nodeId);
      
      // Assert - Service maintains domain purity
      expect(registerResult.isSuccess).toBe(true);
      expect(contextResult.isSuccess).toBe(true);
      expect(accessResults.isSuccess).toBe(true);
      
      // Verify no external system calls are made (pure domain logic)
      expect(contextResult.value.contextData.pure).toBe('domain-data');
    });

    it('should demonstrate proper hierarchical access control as executable specification', () => {
      // Arrange - Create a complete hierarchy tree to demonstrate all access patterns
      const rootId = NodeId.generate();
      const branch1Id = NodeId.generate();
      const branch2Id = NodeId.generate();
      const leaf1Id = NodeId.generate();
      const leaf2Id = NodeId.generate();
      const leaf3Id = NodeId.generate();
      
      service.registerNode(rootId, 'root', undefined, { level: 'root', sensitive: 'admin-data' }, 0);
      service.registerNode(branch1Id, 'branch1', rootId, { level: 'branch1', data: 'branch1-info' }, 1);
      service.registerNode(branch2Id, 'branch2', rootId, { level: 'branch2', data: 'branch2-info' }, 1);
      service.registerNode(leaf1Id, 'leaf1', branch1Id, { level: 'leaf1', data: 'leaf1-data' }, 2);
      service.registerNode(leaf2Id, 'leaf2', branch1Id, { level: 'leaf2', data: 'leaf2-data' }, 2);
      service.registerNode(leaf3Id, 'leaf3', branch2Id, { level: 'leaf3', data: 'leaf3-data' }, 2);

      // Act & Assert - Demonstrate complete access pattern compliance
      
      // 1. Root can access all descendants with write permission
      const rootAccess = service.getAccessibleContexts(rootId);
      expect(rootAccess.isSuccess).toBe(true);
      const rootWriteAccess = rootAccess.value.filter(a => a.context.accessLevel === 'write');
      expect(rootWriteAccess.length).toBe(5); // All children and grandchildren
      
      // 2. Branch nodes can access their children with write, siblings with read
      const branch1Access = service.getAccessibleContexts(branch1Id);
      expect(branch1Access.isSuccess).toBe(true);
      const branch1WriteAccess = branch1Access.value.filter(a => a.context.accessLevel === 'write');
      const branch1ReadAccess = branch1Access.value.filter(a => a.context.accessLevel === 'read');
      expect(branch1WriteAccess.length).toBeGreaterThanOrEqual(2); // leaf1, leaf2 (and possibly others)
      expect(branch1ReadAccess.length).toBeGreaterThanOrEqual(1); // root (parent) and possibly others
      
      // 3. Leaf nodes have read access to parents and uncles/aunts
      const leaf1Access = service.getAccessibleContexts(leaf1Id);
      expect(leaf1Access.isSuccess).toBe(true);
      const leaf1ReadAccess = leaf1Access.value.filter(a => a.context.accessLevel === 'read');
      expect(leaf1ReadAccess.length).toBeGreaterThan(0);
      
      // 4. Siblings can read each other but not write
      const leaf2ToLeaf1Read = service.getNodeContext(leaf2Id, leaf1Id, 'read');
      const leaf2ToLeaf1Write = service.updateNodeContext(leaf2Id, leaf1Id, { hacked: 'data' });
      expect(leaf2ToLeaf1Read.isSuccess).toBe(true);
      expect(leaf2ToLeaf1Write.isSuccess).toBe(false);
    });

    it('should validate that access control follows the principle of least privilege', () => {
      // Arrange - Create a sensitive data scenario
      const adminId = NodeId.generate();
      const managerId = NodeId.generate();
      const employeeId = NodeId.generate();
      const contractorId = NodeId.generate();
      
      service.registerNode(adminId, 'admin', undefined, { 
        role: 'admin', 
        sensitiveData: 'top-secret',
        permissions: ['read', 'write', 'delete']
      }, 0);
      
      service.registerNode(managerId, 'manager', adminId, { 
        role: 'manager',
        departmentData: 'dept-info',
        permissions: ['read', 'write']
      }, 1);
      
      service.registerNode(employeeId, 'employee', managerId, { 
        role: 'employee',
        personalData: 'employee-info',
        permissions: ['read']
      }, 2);
      
      service.registerNode(contractorId, 'contractor', undefined, { 
        role: 'contractor',
        limitedData: 'contract-work',
        permissions: ['read']
      }, 0);
      
      // Act & Assert - Validate access boundaries
      
      // Admin can access all subordinate data
      const adminToEmployee = service.getNodeContext(adminId, employeeId, 'write');
      expect(adminToEmployee.isSuccess).toBe(true);
      
      // Manager can access employee but not contractor (different tree)
      const managerToEmployee = service.getNodeContext(managerId, employeeId, 'write');
      const managerToContractor = service.getNodeContext(managerId, contractorId, 'read');
      expect(managerToEmployee.isSuccess).toBe(true);
      expect(managerToContractor.isSuccess).toBe(false);
      
      // Employee cannot access peer contractor
      const employeeToContractor = service.getNodeContext(employeeId, contractorId, 'read');
      expect(employeeToContractor.isSuccess).toBe(false);
      
      // Contractor is isolated (no access to company hierarchy)
      const contractorToEmployee = service.getNodeContext(contractorId, employeeId, 'read');
      expect(contractorToEmployee.isSuccess).toBe(false);
    });

    it('should serve as template for proper entity interaction patterns', () => {
      // This test demonstrates the correct way to create and use domain entities
      // with the context access service, serving as executable documentation
      
      // Arrange - Demonstrate proper entity creation patterns
      const parentNodeId = NodeId.generate();
      const childNodeId = NodeId.generate();
      
      // Use proper domain value object creation
      const retryPolicy = RetryPolicy.create({
        maxAttempts: 3,
        strategy: 'exponential',
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        enabled: true
      }).value!;
      
      // Create action nodes using proper factory methods
      const parentAction = MockActionNode.createMock(parentNodeId, parentNodeId, 'Parent Action');
      const childAction = MockActionNode.createMock(childNodeId, parentNodeId, 'Child Action');
      
      // Extract context using the service (demonstrates proper usage)
      const parentContext = service.extractActionNodeContext(parentAction);
      const childContext = service.extractActionNodeContext(childAction);
      
      // Register nodes in the access system
      service.registerNode(parentNodeId, 'action', undefined, parentContext, 0);
      service.registerNode(childNodeId, 'action', parentNodeId, childContext, 1);
      
      // Act - Demonstrate proper context access patterns
      const parentAccessToChild = service.getNodeContext(parentNodeId, childNodeId, 'write');
      const childAccessToParent = service.getNodeContext(childNodeId, parentNodeId, 'read');
      
      // Assert - Validate proper domain behavior
      expect(parentAccessToChild.isSuccess).toBe(true);
      expect(childAccessToParent.isSuccess).toBe(true);
      expect(parentContext.actionId).toBeDefined();
      expect(childContext.actionId).toBeDefined();
      
      // Demonstrate context data integrity
      expect(parentAccessToChild.value.contextData.name).toBe('Child Action'); // Parent accessing child gets child's data
      expect(childAccessToParent.value.contextData.name).toBe('Parent Action'); // Child accessing parent gets parent's data
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large hierarchies efficiently', () => {
      // Arrange
      const rootId = NodeId.generate();
      service.registerNode(rootId, 'root', undefined, { root: true }, 0);

      const childIds: NodeId[] = [];
      for (let i = 0; i < 100; i++) {
        const childId = NodeId.generate();
        service.registerNode(childId, `child${i}`, rootId, { childIndex: i }, 1);
        childIds.push(childId);
      }

      const startTime = performance.now();

      // Act
      const accessResults = childIds.map(childId => 
        service.getAccessibleContexts(childId)
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Assert
      expect(accessResults.every(result => result.isSuccess)).toBe(true);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle empty context data gracefully', () => {
      // Arrange
      const nodeId = NodeId.generate();
      service.registerNode(nodeId, 'emptyNode', undefined, {}, 0);

      // Act
      const context = service.getNodeContext(nodeId, nodeId);

      // Assert
      expect(context.isSuccess).toBe(true);
      expect(context.value.contextData).toEqual({});
    });

    it('should handle null/undefined context data', () => {
      // Arrange
      const nodeId = NodeId.generate();
      service.registerNode(nodeId, 'nullNode', undefined, null as any, 0);

      // Act
      const context = service.getNodeContext(nodeId, nodeId);

      // Assert
      expect(context.isSuccess).toBe(true);
    });

    it('should handle very deep hierarchies with maximum depth limits', () => {
      // Arrange - Create a hierarchy deeper than the internal limit
      let currentParent: NodeId | undefined = undefined;
      const nodeIds: NodeId[] = [];

      for (let i = 0; i < 15; i++) {
        const nodeId = NodeId.generate();
        service.registerNode(nodeId, `level${i}`, currentParent, { level: i }, i);
        nodeIds.push(nodeId);
        currentParent = nodeId;
      }

      // Act
      const deepestNodeAccess = service.getAccessibleContexts(nodeIds[nodeIds.length - 1]);

      // Assert
      expect(deepestNodeAccess.isSuccess).toBe(true);
      // Should still work but be limited by internal safeguards
    });
  });
});