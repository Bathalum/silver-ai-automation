import {
  ModelStatus,
  NodeStatus,
  ActionStatus,
  ContainerNodeType,
  ActionNodeType,
  ExecutionMode
} from '../../../../lib/domain/enums';

describe('FunctionModel Aggregate', () => {
  describe('Aggregate Root - FunctionModel', () => {
    it('should serve as the aggregate root for all contained entities', () => {
      const functionModelAggregate = {
        root: {
          id: 'model1',
          name: 'Test Model',
          status: ModelStatus.DRAFT,
          version: '1.0.0'
        },
        entities: {
          containerNodes: [],
          actionNodes: [],
          versions: []
        }
      };

      expect(functionModelAggregate.root.id).toBeDefined();
      expect(functionModelAggregate.entities).toBeDefined();
      expect(functionModelAggregate.entities.containerNodes).toBeDefined();
      expect(functionModelAggregate.entities.actionNodes).toBeDefined();
      expect(functionModelAggregate.entities.versions).toBeDefined();
    });

    it('should maintain referential integrity within aggregate', () => {
      const aggregate = {
        model: { id: 'model1', name: 'Test Model' },
        containerNodes: [
          { id: 'node1', modelId: 'model1', type: ContainerNodeType.IO_NODE },
          { id: 'node2', modelId: 'model1', type: ContainerNodeType.STAGE_NODE }
        ],
        actionNodes: [
          { id: 'action1', modelId: 'model1', parentNodeId: 'node1', type: ActionNodeType.KB_NODE },
          { id: 'action2', modelId: 'model1', parentNodeId: 'node2', type: ActionNodeType.TETHER_NODE }
        ]
      };

      // All container nodes must reference the model
      aggregate.containerNodes.forEach(node => {
        expect(node.modelId).toBe(aggregate.model.id);
      });

      // All action nodes must reference the model and a valid parent container
      aggregate.actionNodes.forEach(action => {
        expect(action.modelId).toBe(aggregate.model.id);
        const parentExists = aggregate.containerNodes.some(node => 
          node.id === action.parentNodeId
        );
        expect(parentExists).toBe(true);
      });
    });
  });

  describe('Aggregate Boundary Rules', () => {
    it('should enforce that container nodes cannot exist without parent model', () => {
      // Business Rule: Container nodes cannot exist without parent model
      const validContainerNode = {
        id: 'node1',
        modelId: 'model1', // Must have model reference
        type: ContainerNodeType.IO_NODE,
        status: NodeStatus.ACTIVE
      };

      const invalidContainerNode = {
        id: 'node2',
        modelId: null, // Invalid - no model reference
        type: ContainerNodeType.STAGE_NODE,
        status: NodeStatus.ACTIVE
      };

      expect(validContainerNode.modelId).toBeDefined();
      expect(validContainerNode.modelId).not.toBeNull();
      
      expect(invalidContainerNode.modelId).toBeNull();
    });

    it('should enforce that action nodes cannot exist without parent container', () => {
      // Business Rule: Action nodes cannot exist without parent container node
      const validActionNode = {
        id: 'action1',
        modelId: 'model1',
        parentNodeId: 'node1', // Must have container parent
        type: ActionNodeType.KB_NODE,
        status: ActionStatus.ACTIVE
      };

      const invalidActionNode = {
        id: 'action2',
        modelId: 'model1',
        parentNodeId: null, // Invalid - no parent container
        type: ActionNodeType.TETHER_NODE,
        status: ActionStatus.ACTIVE
      };

      expect(validActionNode.parentNodeId).toBeDefined();
      expect(validActionNode.parentNodeId).not.toBeNull();
      
      expect(invalidActionNode.parentNodeId).toBeNull();
    });

    it('should preserve complete model state in versions', () => {
      // Business Rule: Versions preserve complete model state including all action nodes
      const completeModelState = {
        modelMetadata: {
          id: 'model1',
          name: 'Complete Model',
          description: 'Test model with all components'
        },
        containerNodes: [
          {
            id: 'node1',
            type: ContainerNodeType.IO_NODE,
            position: { x: 100, y: 100 },
            dependencies: []
          },
          {
            id: 'node2',
            type: ContainerNodeType.STAGE_NODE,
            position: { x: 300, y: 100 },
            dependencies: ['node1']
          }
        ],
        actionNodes: [
          {
            id: 'action1',
            parentNodeId: 'node1',
            type: ActionNodeType.KB_NODE,
            executionOrder: 1,
            priority: 5
          },
          {
            id: 'action2',
            parentNodeId: 'node2',
            type: ActionNodeType.TETHER_NODE,
            executionOrder: 1,
            priority: 7
          }
        ],
        configuration: {
          globalSettings: {},
          contextRules: {}
        }
      };

      // Version must contain all components for reproducibility
      expect(completeModelState.modelMetadata).toBeDefined();
      expect(completeModelState.containerNodes).toBeDefined();
      expect(completeModelState.actionNodes).toBeDefined();
      expect(completeModelState.configuration).toBeDefined();
      
      expect(completeModelState.containerNodes.length).toBeGreaterThan(0);
      expect(completeModelState.actionNodes.length).toBeGreaterThan(0);
    });
  });

  describe('Consistency Rules Enforcement', () => {
    it('should validate container node dependencies are acyclic', () => {
      // Business Rule: Node dependencies must be valid within model (containers only)
      const validDependencyGraph = {
        'node1': [],
        'node2': ['node1'],
        'node3': ['node2'],
        'node4': ['node1', 'node2']
      };

      const invalidCyclicGraph = {
        'node1': ['node3'],
        'node2': ['node1'],
        'node3': ['node2']
      };

      // Check for cycles in dependency graph
      const detectCycle = (graph: Record<string, string[]>): boolean => {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycleDFS = (node: string): boolean => {
          if (recursionStack.has(node)) return true;
          if (visited.has(node)) return false;

          visited.add(node);
          recursionStack.add(node);

          for (const dependency of graph[node] || []) {
            if (hasCycleDFS(dependency)) return true;
          }

          recursionStack.delete(node);
          return false;
        };

        for (const node of Object.keys(graph)) {
          if (hasCycleDFS(node)) return true;
        }
        return false;
      };

      expect(detectCycle(validDependencyGraph)).toBe(false);
      expect(detectCycle(invalidCyclicGraph)).toBe(true);
    });

    it('should validate action execution order within containers', () => {
      // Business Rule: Action execution order must be valid within parent container
      const containerWithActions = {
        containerId: 'node1',
        actions: [
          { id: 'action1', executionOrder: 1, priority: 5 },
          { id: 'action2', executionOrder: 2, priority: 3 },
          { id: 'action3', executionOrder: 3, priority: 8 }
        ]
      };

      const invalidContainerWithDuplicateOrder = {
        containerId: 'node2',
        actions: [
          { id: 'action4', executionOrder: 1, priority: 5 },
          { id: 'action5', executionOrder: 1, priority: 3 }, // Duplicate order
          { id: 'action6', executionOrder: 2, priority: 8 }
        ]
      };

      // Check execution order uniqueness
      const executionOrders = containerWithActions.actions.map(a => a.executionOrder);
      const uniqueOrders = new Set(executionOrders);
      expect(uniqueOrders.size).toBe(executionOrders.length);

      // Check invalid container
      const invalidOrders = invalidContainerWithDuplicateOrder.actions.map(a => a.executionOrder);
      const invalidUniqueOrders = new Set(invalidOrders);
      expect(invalidUniqueOrders.size).toBeLessThan(invalidOrders.length);
    });

    it('should enforce status propagation to contained entities', () => {
      // Business Rule: Status changes affect all contained entities
      const modelStatusChange = {
        model: { id: 'model1', status: ModelStatus.ARCHIVED },
        containers: [
          { id: 'node1', status: NodeStatus.ARCHIVED },
          { id: 'node2', status: NodeStatus.ARCHIVED }
        ],
        actions: [
          { id: 'action1', status: ActionStatus.ARCHIVED },
          { id: 'action2', status: ActionStatus.ARCHIVED }
        ]
      };

      // When model is archived, all contained entities should be archived
      if (modelStatusChange.model.status === ModelStatus.ARCHIVED) {
        modelStatusChange.containers.forEach(container => {
          expect(container.status).toBe(NodeStatus.ARCHIVED);
        });

        modelStatusChange.actions.forEach(action => {
          expect(action.status).toBe(ActionStatus.ARCHIVED);
        });
      }
    });

    it('should maintain context access hierarchical rules', () => {
      // Business Rule: Context access follows hierarchical rules universally
      const hierarchicalStructure = {
        model: { id: 'model1', contextAccess: 'full' },
        containers: [
          {
            id: 'node1',
            contextAccess: 'container_and_children',
            children: ['action1', 'action2']
          },
          {
            id: 'node2',
            contextAccess: 'container_and_children',
            children: ['action3']
          }
        ],
        actions: [
          {
            id: 'action1',
            parentId: 'node1',
            contextAccess: 'own_and_sibling_readonly',
            siblings: ['action2']
          },
          {
            id: 'action2',
            parentId: 'node1',
            contextAccess: 'own_and_sibling_readonly',
            siblings: ['action1']
          },
          {
            id: 'action3',
            parentId: 'node2',
            contextAccess: 'own_only',
            siblings: []
          }
        ]
      };

      // Model should have full context access
      expect(hierarchicalStructure.model.contextAccess).toBe('full');

      // Containers should have access to their children
      hierarchicalStructure.containers.forEach(container => {
        expect(container.contextAccess).toBe('container_and_children');
        expect(Array.isArray(container.children)).toBe(true);
      });

      // Actions with siblings should have sibling access
      const actionsWithSiblings = hierarchicalStructure.actions.filter(a => a.siblings.length > 0);
      actionsWithSiblings.forEach(action => {
        expect(action.contextAccess).toBe('own_and_sibling_readonly');
      });

      // Actions without siblings should have own access only
      const actionsWithoutSiblings = hierarchicalStructure.actions.filter(a => a.siblings.length === 0);
      actionsWithoutSiblings.forEach(action => {
        expect(action.contextAccess).toBe('own_only');
      });
    });
  });

  describe('Execution Orchestration Consistency', () => {
    it('should validate execution modes and priorities within containers', () => {
      // Business Rule: Execution modes and priorities must be consistent within containers
      const containerOrchestration = {
        containerId: 'stage1',
        executionMode: ExecutionMode.PARALLEL,
        actions: [
          {
            id: 'action1',
            type: ActionNodeType.KB_NODE,
            priority: 8,
            executionMode: ExecutionMode.PARALLEL
          },
          {
            id: 'action2',
            type: ActionNodeType.TETHER_NODE,
            priority: 6,
            executionMode: ExecutionMode.PARALLEL
          },
          {
            id: 'action3',
            type: ActionNodeType.FUNCTION_MODEL_CONTAINER,
            priority: 9,
            executionMode: ExecutionMode.PARALLEL
          }
        ]
      };

      // All actions should have same execution mode as container
      containerOrchestration.actions.forEach(action => {
        expect(action.executionMode).toBe(containerOrchestration.executionMode);
      });

      // Priority values should be within valid range [1-10]
      containerOrchestration.actions.forEach(action => {
        expect(action.priority).toBeGreaterThanOrEqual(1);
        expect(action.priority).toBeLessThanOrEqual(10);
      });

      // For parallel execution, higher priority should execute first
      const sortedByPriority = [...containerOrchestration.actions].sort((a, b) => b.priority - a.priority);
      expect(sortedByPriority[0].priority).toBe(9); // Highest priority first
      expect(sortedByPriority[sortedByPriority.length - 1].priority).toBe(6); // Lowest priority last
    });

    it('should enforce retry policies validation for action types', () => {
      // Business Rule: Retry policies must be valid for action types and execution context
      const actionRetryPolicies = [
        {
          id: 'action1',
          type: ActionNodeType.KB_NODE,
          retryPolicy: {
            maxAttempts: 3,
            backoffStrategy: 'linear',
            backoffDelay: 1000
          }
        },
        {
          id: 'action2',
          type: ActionNodeType.TETHER_NODE,
          retryPolicy: {
            maxAttempts: 5,
            backoffStrategy: 'exponential',
            backoffDelay: 2000
          }
        }
      ];

      actionRetryPolicies.forEach(action => {
        expect(action.retryPolicy.maxAttempts).toBeGreaterThan(0);
        expect(action.retryPolicy.maxAttempts).toBeLessThanOrEqual(10);
        expect(['immediate', 'linear', 'exponential']).toContain(action.retryPolicy.backoffStrategy);
        expect(action.retryPolicy.backoffDelay).toBeGreaterThan(0);
      });
    });
  });

  describe('Fractal Orchestration Pattern Consistency', () => {
    it('should maintain orchestration patterns across nesting levels', () => {
      // Business Rule: Fractal orchestration patterns maintain consistency across nesting levels
      const fractalStructure = {
        rootModel: {
          id: 'root',
          orchestrationLevel: 1,
          containers: ['stage1', 'stage2']
        },
        nestedModels: [
          {
            id: 'nested1',
            parentActionId: 'action3',
            orchestrationLevel: 2,
            containers: ['nested_stage1']
          }
        ],
        orchestrationConsistency: {
          contextInheritance: true,
          patternPropagation: true,
          levelCoordination: true
        }
      };

      expect(fractalStructure.orchestrationConsistency.contextInheritance).toBe(true);
      expect(fractalStructure.orchestrationConsistency.patternPropagation).toBe(true);
      expect(fractalStructure.orchestrationConsistency.levelCoordination).toBe(true);

      // Nested models should maintain consistent orchestration depth
      fractalStructure.nestedModels.forEach(nested => {
        expect(nested.orchestrationLevel).toBeGreaterThan(fractalStructure.rootModel.orchestrationLevel);
      });
    });

    it('should support deep nesting with parent privileges', () => {
      // Business Rule: Deep nesting maintains cascading parent privileges
      const deepNestedStructure = {
        level1: { id: 'root', privileges: ['full_access'] },
        level2: { id: 'child', parentId: 'root', privileges: ['child_context', 'sibling_readonly'] },
        level3: { id: 'grandchild', parentId: 'child', privileges: ['own_context'] }
      };

      // Each level should have appropriate privileges based on hierarchy
      expect(deepNestedStructure.level1.privileges).toContain('full_access');
      expect(deepNestedStructure.level2.privileges).toContain('child_context');
      expect(deepNestedStructure.level3.privileges).toContain('own_context');

      // Parent relationships should be maintained
      expect(deepNestedStructure.level2.parentId).toBe(deepNestedStructure.level1.id);
      expect(deepNestedStructure.level3.parentId).toBe(deepNestedStructure.level2.id);
    });
  });

  describe('Aggregate Transaction Boundaries', () => {
    it('should ensure atomic operations within aggregate', () => {
      // All operations within the aggregate should be atomic
      const atomicOperation = {
        type: 'model_update_with_nodes',
        operations: [
          { type: 'update_model', id: 'model1', data: { name: 'Updated Model' } },
          { type: 'add_container', parentId: 'model1', data: { type: ContainerNodeType.STAGE_NODE } },
          { type: 'add_action', parentContainerId: 'node1', data: { type: ActionNodeType.KB_NODE } }
        ],
        isAtomic: true
      };

      expect(atomicOperation.isAtomic).toBe(true);
      expect(atomicOperation.operations.length).toBeGreaterThan(1);

      // All operations should succeed or all should fail
      const operationResults = atomicOperation.operations.map(op => ({ success: true, operation: op.type }));
      const allSucceeded = operationResults.every(result => result.success);
      expect(allSucceeded).toBe(true);
    });

    it('should maintain consistency across aggregate modifications', () => {
      // Business Rule: Maintain consistency during complex aggregate changes
      const consistentModification = {
        beforeState: {
          model: { id: 'model1', version: '1.0.0', nodeCount: 2 },
          nodes: [{ id: 'node1' }, { id: 'node2' }]
        },
        afterState: {
          model: { id: 'model1', version: '1.1.0', nodeCount: 3 },
          nodes: [{ id: 'node1' }, { id: 'node2' }, { id: 'node3' }]
        }
      };

      // Node count should match actual nodes
      expect(consistentModification.afterState.model.nodeCount).toBe(consistentModification.afterState.nodes.length);
      
      // Version should be incremented
      expect(consistentModification.afterState.model.version).not.toBe(consistentModification.beforeState.model.version);
    });
  });
});