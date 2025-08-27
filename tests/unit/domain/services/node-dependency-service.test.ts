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
        .withName('stage')
        .build();

      // Add dependency to non-existent node (using valid UUID format)
      const addResult = stageNode.addDependency('00000000-0000-4000-8000-000000000000');
      expect(addResult.isSuccess).toBe(true); // Ensure dependency was added
      const nodes = [stageNode];

      // Act
      const result = dependencyService.buildDependencyGraph(nodes);

      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Node "stage" references non-existent dependency: 00000000-0000-4000-8000-000000000000');
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
      
      nodeA.addDependency(nodeB.nodeId.toString());
      nodeB.addDependency(nodeA.nodeId.toString());
      
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
      expect(cycles[0]).toEqual([nodeA.nodeId.toString(), nodeB.nodeId.toString(), nodeA.nodeId.toString()]);
    });

    it('should detect complex circular dependency', () => {
      // Arrange - A -> B -> C -> A
      const modelId = 'test-model';
      const nodeA = new StageNodeBuilder().withId('a').withModelId(modelId).build();
      const nodeB = new StageNodeBuilder().withId('b').withModelId(modelId).build();
      const nodeC = new StageNodeBuilder().withId('c').withModelId(modelId).build();
      
      nodeA.addDependency(nodeC.nodeId.toString());
      nodeB.addDependency(nodeA.nodeId.toString());
      nodeC.addDependency(nodeB.nodeId.toString());
      
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
      expect(cycles[0]).toEqual([nodeA.nodeId.toString(), nodeC.nodeId.toString(), nodeB.nodeId.toString(), nodeA.nodeId.toString()]);
    });

    it('should detect self-referencing dependency', () => {
      // Arrange
      const modelId = 'test-model';
      const nodeA = new StageNodeBuilder().withId('a').withModelId(modelId).build();
      
      // Directly manipulate dependencies to bypass validation (for testing corrupt data scenarios)
      (nodeA as any).props.dependencies.push(nodeA.nodeId);
      
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
      expect(cycles[0]).toEqual([nodeA.nodeId.toString(), nodeA.nodeId.toString()]);
    });

    it('should detect multiple independent cycles', () => {
      // Arrange - Two separate cycles: A->B->A and C->D->C
      const modelId = 'test-model';
      const nodeA = new StageNodeBuilder().withId('a').withModelId(modelId).build();
      const nodeB = new StageNodeBuilder().withId('b').withModelId(modelId).build();
      const nodeC = new StageNodeBuilder().withId('c').withModelId(modelId).build();
      const nodeD = new StageNodeBuilder().withId('d').withModelId(modelId).build();
      
      nodeA.addDependency(nodeB.nodeId.toString());
      nodeB.addDependency(nodeA.nodeId.toString());
      nodeC.addDependency(nodeD.nodeId.toString());
      nodeD.addDependency(nodeC.nodeId.toString());
      
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
      const inputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174001').withModelId(modelId).withName('input').asInput().build();
      const stageNode = new StageNodeBuilder().withId('123e4567-e89b-42d3-a456-426614174002').withModelId(modelId).withName('stage').build();
      const outputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174003').withModelId(modelId).withName('output').asOutput().build();
      
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
      const inputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174001').withModelId(modelId).withName('input').asInput().build();
      const stageA = new StageNodeBuilder().withId('stage-a').withModelId(modelId).withName('stage-a').build();
      const stageB = new StageNodeBuilder().withId('stage-b').withModelId(modelId).withName('stage-b').build();
      const mergeNode = new StageNodeBuilder().withId('merge').withModelId(modelId).withName('merge').build();
      const outputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174003').withModelId(modelId).withName('output').asOutput().build();
      
      stageA.addDependency(inputNode.nodeId.toString());
      stageB.addDependency(inputNode.nodeId.toString());
      mergeNode.addDependency(stageA.nodeId.toString());
      mergeNode.addDependency(stageB.nodeId.toString());
      outputNode.addDependency(mergeNode.nodeId.toString());
      
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
      const nodeAId = '123e4567-e89b-42d3-a456-426614174001';
      const nodeBId = '123e4567-e89b-42d3-a456-426614174002';
      const nodeA = new StageNodeBuilder().withId(nodeAId).withModelId(modelId).build();
      const nodeB = new StageNodeBuilder().withId(nodeBId).withModelId(modelId).build();
      
      nodeA.addDependency(nodeBId);
      nodeB.addDependency(nodeAId);
      
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
      const inputNode = new IONodeBuilder().withId('input').withModelId(modelId).withName('input').asInput().build();
      const nodeA = new StageNodeBuilder().withId('a').withModelId(modelId).withName('a').build();
      const nodeB = new StageNodeBuilder().withId('b').withModelId(modelId).withName('b').build();
      const nodeC = new StageNodeBuilder().withId('c').withModelId(modelId).withName('c').build();
      const nodeD = new StageNodeBuilder().withId('d').withModelId(modelId).withName('d').build();
      const merge1Node = new StageNodeBuilder().withId('merge1').withModelId(modelId).withName('merge1').build();
      const merge2Node = new StageNodeBuilder().withId('merge2').withModelId(modelId).withName('merge2').build();
      const outputNode = new IONodeBuilder().withId('output').withModelId(modelId).withName('output').asOutput().build();
      
      const nodes = [inputNode, nodeA, nodeB, nodeC, nodeD, merge1Node, merge2Node, outputNode];
      
      // Build tree: input -> (a->c, b->d) -> (merge1, merge2) -> output
      nodeA.addDependency(inputNode.nodeId.toString());
      nodeB.addDependency(inputNode.nodeId.toString());
      nodeC.addDependency(nodeA.nodeId.toString());
      nodeD.addDependency(nodeB.nodeId.toString());
      merge1Node.addDependency(nodeC.nodeId.toString());
      merge2Node.addDependency(nodeD.nodeId.toString());
      outputNode.addDependency(merge1Node.nodeId.toString());
      outputNode.addDependency(merge2Node.nodeId.toString());
      
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
      const result = dependencyService.findReachableNodes(graph, '123e4567-e89b-42d3-a456-426614174001');

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.sort()).toEqual([
        '123e4567-e89b-42d3-a456-426614174001', // input
        '123e4567-e89b-42d3-a456-426614174002', // stage
        '123e4567-e89b-42d3-a456-426614174003'  // output
      ]);
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
      outputNode.addDependency(stageA.nodeId.toString());
      outputNode.addDependency(stageB.nodeId.toString());
      
      const nodes = [inputNode, stageA, stageB, outputNode];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act
      const result = dependencyService.findReachableNodes(graph, '123e4567-e89b-42d3-a456-426614174001');

      // Assert
      expect(result).toBeValidResult();
      expect(result.value.sort()).toEqual([
        '123e4567-e89b-42d3-a456-426614174001', // input
        '123e4567-e89b-42d3-a456-426614174003', // output
        stageA.nodeId.toString(), // stage-a
        stageB.nodeId.toString()  // stage-b
      ]);
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
      const result = dependencyService.findReachableNodes(graph, isolatedNode.nodeId.toString());

      // Assert
      expect(result).toBeValidResult();
      expect(result.value).toEqual([isolatedNode.nodeId.toString()]);
    });

    it('should handle non-existent start node', () => {
      // Arrange
      const emptyNodes: Node[] = [];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(emptyNodes)
      );

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
      const inputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174001').withModelId(modelId).withName('input').asInput().build();
      const stageNode = new StageNodeBuilder().withId('123e4567-e89b-42d3-a456-426614174002').withModelId(modelId).withName('stage').build();
      const outputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174003').withModelId(modelId).withName('output').asOutput().build();
      
      stageNode.addDependency('123e4567-e89b-42d3-a456-426614174001');
      outputNode.addDependency('123e4567-e89b-42d3-a456-426614174002');
      
      const nodes = [inputNode, stageNode, outputNode];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act & Assert
      expect(dependencyService.getDependencyDepth(graph, '123e4567-e89b-42d3-a456-426614174001')).toBe(0);
      expect(dependencyService.getDependencyDepth(graph, '123e4567-e89b-42d3-a456-426614174002')).toBe(1);
      expect(dependencyService.getDependencyDepth(graph, '123e4567-e89b-42d3-a456-426614174003')).toBe(2);
    });

    it('should handle diamond pattern depths correctly', () => {
      // Arrange - Diamond: Input(0) -> A,B(1) -> Merge(2) -> Output(3)
      const modelId = 'test-model';
      const inputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174001').withModelId(modelId).withName('input').asInput().build();
      const stageA = new StageNodeBuilder().withId('stage-a').withModelId(modelId).withName('stage-a').build();
      const stageB = new StageNodeBuilder().withId('stage-b').withModelId(modelId).withName('stage-b').build();
      const mergeNode = new StageNodeBuilder().withId('merge').withModelId(modelId).withName('merge').build();
      const outputNode = new IONodeBuilder().withId('123e4567-e89b-42d3-a456-426614174003').withModelId(modelId).withName('output').asOutput().build();
      
      stageA.addDependency(inputNode.nodeId.toString());
      stageB.addDependency(inputNode.nodeId.toString());
      mergeNode.addDependency(stageA.nodeId.toString());
      mergeNode.addDependency(stageB.nodeId.toString());
      outputNode.addDependency(mergeNode.nodeId.toString());
      
      const nodes = [inputNode, stageA, stageB, mergeNode, outputNode];
      const graph = ResultTestHelpers.expectSuccess(
        dependencyService.buildDependencyGraph(nodes)
      );

      // Act & Assert
      expect(dependencyService.getDependencyDepth(graph, inputNode.nodeId.toString())).toBe(0);
      expect(dependencyService.getDependencyDepth(graph, stageA.nodeId.toString())).toBe(1);
      expect(dependencyService.getDependencyDepth(graph, stageB.nodeId.toString())).toBe(1);
      expect(dependencyService.getDependencyDepth(graph, mergeNode.nodeId.toString())).toBe(2);
      expect(dependencyService.getDependencyDepth(graph, outputNode.nodeId.toString())).toBe(3);
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
      expect(result.value.nodes.size).toBe(1);
      const graphNode = result.value.nodes.get('single');
      expect(Array.from(graphNode?.dependencies || [])).toEqual([]);
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