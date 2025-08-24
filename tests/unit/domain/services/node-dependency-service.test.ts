/**
 * Unit tests for NodeDependencyService
 * Tests dependency graph analysis, execution ordering, and cycle detection
 */

import { NodeDependencyService } from '@/lib/domain/services/node-dependency-service';
import { ContainerNode } from '@/lib/domain/entities';
import { 
  IONodeBuilder, 
  StageNodeBuilder,
  TestFactories,
  getTestUUID
} from '../../../utils/test-fixtures';
import { ResultTestHelpers } from '../../../utils/test-helpers';

describe('NodeDependencyService', () => {
  let dependencyService: NodeDependencyService;

  beforeEach(() => {
    dependencyService = new NodeDependencyService();
  });

  describe('buildDependencyGraph', () => {
    it('should build simple dependency graph correctly', () => {
      // Arrange - Linear chain: Input -> Stage -> Output
      const modelId = 'test-model';
      
      const inputNode = new IONodeBuilder()
        .withId('123e4567-e89b-42d3-a456-426614174001')
        .withModelId(modelId)
        .withName('Input')
        .asInput()
        .build();
      
      const stageNode = new StageNodeBuilder()
        .withId('123e4567-e89b-42d3-a456-426614174002')
        .withModelId(modelId)
        .withName('Stage')
        .build();
      
      const outputNode = new IONodeBuilder()
        .withId('123e4567-e89b-42d3-a456-426614174003')
        .withModelId(modelId)
        .withName('Output')
        .asOutput()
        .build();

      // Create dependencies: stage depends on input, output depends on stage
      stageNode.addDependency('123e4567-e89b-42d3-a456-426614174001');
      outputNode.addDependency('123e4567-e89b-42d3-a456-426614174002');
      
      const nodes = [inputNode, stageNode, outputNode];

      // Act
      const result = dependencyService.buildDependencyGraph(nodes);

      // Assert
      expect(result).toBeValidResult();
      const graph = result.value;
      
      expect(graph.nodes.has('123e4567-e89b-42d3-a456-426614174001')).toBe(true);
      expect(graph.nodes.has('123e4567-e89b-42d3-a456-426614174002')).toBe(true);
      expect(graph.nodes.has('123e4567-e89b-42d3-a456-426614174003')).toBe(true);
      
      expect(graph.reverseDependencies.get('123e4567-e89b-42d3-a456-426614174001')).toEqual([]);
      expect(graph.reverseDependencies.get('123e4567-e89b-42d3-a456-426614174002')).toEqual(['123e4567-e89b-42d3-a456-426614174001']);
      expect(graph.reverseDependencies.get('123e4567-e89b-42d3-a456-426614174003')).toEqual(['123e4567-e89b-42d3-a456-426614174002']);
    });

    it('should build complex dependency graph', () => {
      // Arrange - Diamond pattern: Input -> A,B -> Merge -> Output
      const modelId = 'test-model';
      
      const inputNode = new IONodeBuilder()
        .withId('123e4567-e89b-42d3-a456-426614174001')
        .withModelId(modelId)
        .asInput()
        .build();
      
      const stageA = new StageNodeBuilder()
        .withId('stage-a')
        .withModelId(modelId)
        .build();
      
      const stageB = new StageNodeBuilder()
        .withId('stage-b')
        .withModelId(modelId)
        .build();
      
      const mergeStage = new StageNodeBuilder()
        .withId('merge')
        .withModelId(modelId)
        .build();
      
      const outputNode = new IONodeBuilder()
        .withId('123e4567-e89b-42d3-a456-426614174003')
        .withModelId(modelId)
        .asOutput()
        .build();

      // Create diamond dependencies using actual node UUIDs
      const inputUUID = '123e4567-e89b-42d3-a456-426614174001';
      const stageAUUID = stageA.nodeId.value;
      const stageBUUID = stageB.nodeId.value;
      const mergeUUID = mergeStage.nodeId.value;
      
      console.log('Actual node UUIDs:');
      console.log('stageA ->', stageAUUID);
      console.log('stageB ->', stageBUUID);
      console.log('merge ->', mergeUUID);
      
      console.log('Adding dependencies...');
      const dep1 = stageA.addDependency(inputUUID);
      console.log('stageA.addDependency result:', dep1);
      const dep2 = stageB.addDependency(inputUUID);
      console.log('stageB.addDependency result:', dep2);
      const dep3 = mergeStage.addDependency(stageAUUID);
      console.log('mergeStage.addDependency(stageA) result:', dep3);
      const dep4 = mergeStage.addDependency(stageBUUID);
      console.log('mergeStage.addDependency(stageB) result:', dep4);
      const dep5 = outputNode.addDependency(mergeUUID);
      console.log('outputNode.addDependency result:', dep5);
      
      const nodes = [inputNode, stageA, stageB, mergeStage, outputNode];

      // Act
      const result = dependencyService.buildDependencyGraph(nodes);

      // Assert
      expect(result).toBeValidResult();
      const graph = result.value;
      
      // Debug: Check what's in the graph
      console.log('All node keys in graph:', Array.from(graph.nodes.keys()));
      console.log('All reverse dependency keys:', Array.from(graph.reverseDependencies.keys()));
      console.log('stageAUUID:', stageAUUID);
      console.log('Reverse deps for stageA:', graph.reverseDependencies.get(stageAUUID));
      
      // Test using proper DependencyGraph interface with UUIDs
      const outputUUID = '123e4567-e89b-42d3-a456-426614174003';
      
      expect(graph.reverseDependencies.get(stageAUUID)).toEqual([inputUUID]);
      expect(graph.reverseDependencies.get(stageBUUID)).toEqual([inputUUID]);
      expect(graph.reverseDependencies.get(mergeUUID)?.sort()).toEqual([stageAUUID, stageBUUID].sort());
      expect(graph.reverseDependencies.get(outputUUID)).toEqual([mergeUUID]);
    });

    it('should handle nodes with no dependencies', () => {
      // Arrange
      const modelId = 'test-model';
      const inputNodeId = '123e4567-e89b-42d3-a456-426614174001';
      const inputNode = new IONodeBuilder()
        .withId(inputNodeId)
        .withModelId(modelId)
        .asInput()
        .build();
      
      const nodes = [inputNode];

      // Act
      const result = dependencyService.buildDependencyGraph(nodes);

      // Assert
      expect(result).toBeValidResult();
      const graph = result.value;
      expect(graph.nodes.get(inputNodeId)?.dependencies).toEqual([]);
    });

    it('should reject nodes with invalid dependency references', () => {
      // Arrange
      const modelId = 'test-model';
      const stageNode = new StageNodeBuilder()
        .withId('123e4567-e89b-42d3-a456-426614174002')
        .withModelId(modelId)
        .build();

      // Add dependency to non-existent node
      stageNode.addDependency('non-existent-node');
      const nodes = [stageNode];

      // Act
      const result = dependencyService.buildDependencyGraph(nodes);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node "stage" references non-existent dependency: non-existent-node');
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect no cycles in valid graph', () => {
      // Arrange - Linear chain
      const modelId = 'test-model';
      const nodes = [
        new IONodeBuilder().withId('a').withModelId(modelId).asInput().build(),
        new StageNodeBuilder().withId('b').withModelId(modelId).build(),
        new StageNodeBuilder().withId('c').withModelId(modelId).build()
      ];
      
      nodes[1].addDependency('a');
      nodes[2].addDependency('b');

      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act
      const result = dependencyService.detectCircularDependencies(graph);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value).toEqual([]);
    });

    it('should detect simple circular dependency', () => {
      // Arrange - A -> B -> A
      const modelId = 'test-model';
      const nodeA = new StageNodeBuilder().withId('a').withModelId(modelId).build();
      const nodeB = new StageNodeBuilder().withId('b').withModelId(modelId).build();
      
      nodeA.addDependency('b');
      nodeB.addDependency('a');
      
      const nodes = [nodeA, nodeB];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act
      const result = dependencyService.detectCircularDependencies(graph);

      // Assert
      expect(result).toBeValidResult();
      const cycles = result.value;
      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toEqual(['a', 'b', 'a']);
    });

    it('should detect complex circular dependency', () => {
      // Arrange - A -> B -> C -> A
      const modelId = 'test-model';
      const nodeA = new StageNodeBuilder().withId('a').withModelId(modelId).build();
      const nodeB = new StageNodeBuilder().withId('b').withModelId(modelId).build();
      const nodeC = new StageNodeBuilder().withId('c').withModelId(modelId).build();
      
      nodeA.addDependency('c');
      nodeB.addDependency('a');
      nodeC.addDependency('b');
      
      const nodes = [nodeA, nodeB, nodeC];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act
      const result = dependencyService.detectCircularDependencies(graph);

      // Assert
      expect(result).toBeValidResult();
      const cycles = result.value;
      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toEqual(['a', 'c', 'b', 'a']);
    });

    it('should detect self-referencing dependency', () => {
      // Arrange
      const modelId = 'test-model';
      const nodeA = new StageNodeBuilder().withId('a').withModelId(modelId).build();
      nodeA.addDependency('a'); // Self reference
      
      const nodes = [nodeA];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act
      const result = dependencyService.detectCircularDependencies(graph);

      // Assert
      expect(result).toBeValidResult();
      const cycles = result.value;
      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toEqual(['a', 'a']);
    });

    it('should detect multiple independent cycles', () => {
      // Arrange - Two separate cycles: A->B->A and C->D->C
      const modelId = 'test-model';
      const nodeA = new StageNodeBuilder().withId('a').withModelId(modelId).build();
      const nodeB = new StageNodeBuilder().withId('b').withModelId(modelId).build();
      const nodeC = new StageNodeBuilder().withId('c').withModelId(modelId).build();
      const nodeD = new StageNodeBuilder().withId('d').withModelId(modelId).build();
      
      nodeA.addDependency('b');
      nodeB.addDependency('a');
      nodeC.addDependency('d');
      nodeD.addDependency('c');
      
      const nodes = [nodeA, nodeB, nodeC, nodeD];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act
      const result = dependencyService.detectCircularDependencies(graph);

      // Assert
      expect(result).toBeValidResult();
      const cycles = result.value;
      expect(cycles).toHaveLength(2);
    });
  });

  describe('calculateExecutionOrder', () => {
    it('should calculate correct execution order for linear chain', () => {
      // Arrange - Input -> Stage -> Output
      const modelId = 'test-model';
      const inputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174001').withModelId(modelId).asInput().build();
      const stageNode = new StageNodeBuilder().withId('123e4567-e89b-42d3-a456-426614174002').withModelId(modelId).build();
      const outputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174003').withModelId(modelId).asOutput().build();
      
      stageNode.addDependency('123e4567-e89b-42d3-a456-426614174001');
      outputNode.addDependency('123e4567-e89b-42d3-a456-426614174002');
      
      const nodes = [outputNode, stageNode, inputNode]; // Intentionally out of order
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act
      const result = dependencyService.calculateExecutionOrder(graph);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value).toEqual(['input', 'stage', 'output']);
    });

    it('should handle parallel execution paths correctly', () => {
      // Arrange - Diamond: Input -> (A, B) -> Merge -> Output
      const modelId = 'test-model';
      const inputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174001').withModelId(modelId).asInput().build();
      const stageA = new StageNodeBuilder().withId('stage-a').withModelId(modelId).build();
      const stageB = new StageNodeBuilder().withId('stage-b').withModelId(modelId).build();
      const mergeNode = new StageNodeBuilder().withId('merge').withModelId(modelId).build();
      const outputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174003').withModelId(modelId).asOutput().build();
      
      stageA.addDependency('123e4567-e89b-42d3-a456-426614174001');
      stageB.addDependency('123e4567-e89b-42d3-a456-426614174001');
      mergeNode.addDependency('stage-a');
      mergeNode.addDependency('stage-b');
      outputNode.addDependency('merge');
      
      const nodes = [inputNode, stageA, stageB, mergeNode, outputNode];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act
      const result = dependencyService.calculateExecutionOrder(graph);

      // Assert
      expect(result).toBeValidResult();
      const order = result.value;
      
      expect(order[0]).toBe('input');
      expect(order[4]).toBe('output');
      expect(order[3]).toBe('merge');
      
      // stage-a and stage-b can be in any order (parallel)
      expect(order.slice(1, 3)).toContain('stage-a');
      expect(order.slice(1, 3)).toContain('stage-b');
    });

    it('should fail with circular dependencies', () => {
      // Arrange - A -> B -> A
      const modelId = 'test-model';
      const nodeA = new StageNodeBuilder().withId('a').withModelId(modelId).build();
      const nodeB = new StageNodeBuilder().withId('b').withModelId(modelId).build();
      
      nodeA.addDependency('b');
      nodeB.addDependency('a');
      
      const nodes = [nodeA, nodeB];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act
      const result = dependencyService.calculateExecutionOrder(graph);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Cannot calculate execution order: circular dependencies detected');
    });

    it('should handle complex dependency trees', () => {
      // Arrange - Multi-level tree with multiple branches
      const modelId = 'test-model';
      const nodes = ['input', 'a', 'b', 'c', 'd', 'merge1', 'merge2', 'output']
        .map(id => {
          if (id === 'input') return new IONodeBuilder().withId(id).withModelId(modelId).asInput().build();
          if (id === 'output') return new IONodeBuilder().withId(id).withModelId(modelId).asOutput().build();
          return new StageNodeBuilder().withId(id).withModelId(modelId).build();
        });
      
      const nodeMap = new Map(nodes.map(n => [n.nodeId.toString(), n]));
      
      // Build tree: input -> (a->c, b->d) -> (merge1, merge2) -> output
      nodeMap.get('a')!.addDependency('123e4567-e89b-42d3-a456-426614174001');
      nodeMap.get('b')!.addDependency('123e4567-e89b-42d3-a456-426614174001');
      nodeMap.get('c')!.addDependency('a');
      nodeMap.get('d')!.addDependency('b');
      nodeMap.get('merge1')!.addDependency('c');
      nodeMap.get('merge2')!.addDependency('d');
      nodeMap.get('output')!.addDependency('merge1');
      nodeMap.get('output')!.addDependency('merge2');
      
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act
      const result = dependencyService.calculateExecutionOrder(graph);

      // Assert
      expect(result).toBeValidResult();
      const order = result.value;
      
      expect(order[0]).toBe('input');
      expect(order[order.length - 1]).toBe('output');
      
      // Check that dependencies are respected
      expect(order.indexOf('a')).toBeGreaterThan(order.indexOf('input'));
      expect(order.indexOf('c')).toBeGreaterThan(order.indexOf('a'));
      expect(order.indexOf('merge1')).toBeGreaterThan(order.indexOf('c'));
      expect(order.indexOf('output')).toBeGreaterThan(order.indexOf('merge1'));
    });
  });

  describe('findReachableNodes', () => {
    it('should find all reachable nodes from start node', () => {
      // Arrange - Linear chain
      const modelId = 'test-model';
      const inputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174001').withModelId(modelId).asInput().build();
      const stageNode = new StageNodeBuilder().withId('123e4567-e89b-42d3-a456-426614174002').withModelId(modelId).build();
      const outputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174003').withModelId(modelId).asOutput().build();
      
      stageNode.addDependency('123e4567-e89b-42d3-a456-426614174001');
      outputNode.addDependency('123e4567-e89b-42d3-a456-426614174002');
      
      const nodes = [inputNode, stageNode, outputNode];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act
      const result = dependencyService.findReachableNodes(graph, 'input');

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.sort()).toEqual(['input', 'output', 'stage']);
    });

    it('should handle branching paths correctly', () => {
      // Arrange - Diamond pattern
      const modelId = 'test-model';
      const inputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174001').withModelId(modelId).asInput().build();
      const stageA = new StageNodeBuilder().withId('stage-a').withModelId(modelId).build();
      const stageB = new StageNodeBuilder().withId('stage-b').withModelId(modelId).build();
      const outputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174003').withModelId(modelId).asOutput().build();
      
      stageA.addDependency('123e4567-e89b-42d3-a456-426614174001');
      stageB.addDependency('123e4567-e89b-42d3-a456-426614174001');
      outputNode.addDependency('stage-a');
      outputNode.addDependency('stage-b');
      
      const nodes = [inputNode, stageA, stageB, outputNode];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act
      const result = dependencyService.findReachableNodes(graph, 'input');

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.sort()).toEqual(['input', 'output', 'stage-a', 'stage-b']);
    });

    it('should return only start node when no connections', () => {
      // Arrange
      const modelId = 'test-model';
      const isolatedNode = new StageNodeBuilder().withId('isolated').withModelId(modelId).build();
      
      const nodes = [isolatedNode];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act
      const result = dependencyService.findReachableNodes(graph, 'isolated');

      // Assert
      expect(result).toBeValidResult();
      expect(result.value).toEqual(['isolated']);
    });

    it('should handle non-existent start node', () => {
      // Arrange
      const graph = new Map();

      // Act
      const result = dependencyService.findReachableNodes(graph, 'non-existent');

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Start node "non-existent" not found in graph');
    });
  });

  describe('getDependencyDepth', () => {
    it('should calculate correct depth for linear chain', () => {
      // Arrange - Input(0) -> Stage(1) -> Output(2)
      const modelId = 'test-model';
      const inputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174001').withModelId(modelId).asInput().build();
      const stageNode = new StageNodeBuilder().withId('123e4567-e89b-42d3-a456-426614174002').withModelId(modelId).build();
      const outputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174003').withModelId(modelId).asOutput().build();
      
      stageNode.addDependency('123e4567-e89b-42d3-a456-426614174001');
      outputNode.addDependency('123e4567-e89b-42d3-a456-426614174002');
      
      const nodes = [inputNode, stageNode, outputNode];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act & Assert
      expect(dependencyService.getDependencyDepth(graph, 'input')).toBe(0);
      expect(dependencyService.getDependencyDepth(graph, 'stage')).toBe(1);
      expect(dependencyService.getDependencyDepth(graph, 'output')).toBe(2);
    });

    it('should handle diamond pattern depths correctly', () => {
      // Arrange - Diamond: Input(0) -> A,B(1) -> Merge(2) -> Output(3)
      const modelId = 'test-model';
      const inputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174001').withModelId(modelId).asInput().build();
      const stageA = new StageNodeBuilder().withId('stage-a').withModelId(modelId).build();
      const stageB = new StageNodeBuilder().withId('stage-b').withModelId(modelId).build();
      const mergeNode = new StageNodeBuilder().withId('merge').withModelId(modelId).build();
      const outputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174003').withModelId(modelId).asOutput().build();
      
      stageA.addDependency('123e4567-e89b-42d3-a456-426614174001');
      stageB.addDependency('123e4567-e89b-42d3-a456-426614174001');
      mergeNode.addDependency('stage-a');
      mergeNode.addDependency('stage-b');
      outputNode.addDependency('merge');
      
      const nodes = [inputNode, stageA, stageB, mergeNode, outputNode];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act & Assert
      expect(dependencyService.getDependencyDepth(graph, 'input')).toBe(0);
      expect(dependencyService.getDependencyDepth(graph, 'stage-a')).toBe(1);
      expect(dependencyService.getDependencyDepth(graph, 'stage-b')).toBe(1);
      expect(dependencyService.getDependencyDepth(graph, 'merge')).toBe(2);
      expect(dependencyService.getDependencyDepth(graph, 'output')).toBe(3);
    });

    it('should return -1 for non-existent node', () => {
      // Arrange
      const graph = new Map();

      // Act
      const result = dependencyService.getDependencyDepth(graph, 'non-existent');

      // Assert
      expect(result).toBe(-1);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty node array', () => {
      // Act
      const result = dependencyService.buildDependencyGraph([]);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.nodes.size).toBe(0);
    });

    it('should handle single node with no dependencies', () => {
      // Arrange
      const node = new IONodeBuilder()
        .withId('single')
        .withModelId('test')
        .build();

      // Act
      const result = dependencyService.buildDependencyGraph([node]);

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.size).toBe(1);
      expect(result.value.get('single')?.dependencies).toEqual([]);
    });

    it('should handle malformed dependency data gracefully', () => {
      // This tests the service's robustness against unexpected input
      expect(() => {
        dependencyService.calculateExecutionOrder(new Map());
        dependencyService.detectCircularDependencies(new Map());
        dependencyService.findReachableNodes(new Map(), 'any');
        dependencyService.getDependencyDepth(new Map(), 'any');
      }).not.toThrow();
    });
  });
});