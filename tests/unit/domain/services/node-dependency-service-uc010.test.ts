/**
 * UC-010: Node Dependency Management - System Use Case Tests
 * 
 * Tests comprehensive node dependency management functionality including:
 * - Complex dependency graph management scenarios
 * - Advanced circular dependency detection algorithms  
 * - Execution order optimization and calculation
 * - Dependency validation and integrity checks
 * - Performance optimization and graph analysis
 * - Clean Architecture compliance with complex algorithms
 * 
 * These tests validate the system-level coordination capabilities required for
 * UC-010 and ensure the NodeDependencyService can handle enterprise-scale
 * dependency management scenarios while maintaining architectural integrity.
 */

import { NodeDependencyService, DependencyGraph, ExecutionPath } from '@/lib/domain/services/node-dependency-service';
import { Node } from '@/lib/domain/entities/node';
import { IONode } from '@/lib/domain/entities/io-node';
import { StageNode } from '@/lib/domain/entities/stage-node';
import { 
  IONodeBuilder, 
  StageNodeBuilder,
  TestFactories,
  getTestUUID
} from '../../../utils/test-fixtures';
import { ResultTestHelpers } from '../../../utils/test-helpers';

describe('UC-010: Node Dependency Management - System Use Case', () => {
  let dependencyService: NodeDependencyService;

  beforeEach(() => {
    dependencyService = new NodeDependencyService();
  });

  describe('Complex Dependency Graph Management Scenarios', () => {
    describe('Enterprise-Scale Graph Operations', () => {
      it('should manage large-scale dependency graphs with 100+ nodes efficiently', () => {
        // Arrange - Create enterprise-scale graph with hierarchical structure
        const modelId = 'enterprise-model';
        const nodes: Node[] = [];
        
        // Create 5 input sources
        const inputNodes = Array.from({ length: 5 }, (_, i) => 
          new IONodeBuilder()
            .withId(`input-${i}`)
            .withModelId(modelId)
            .withName(`Input-${i}`)
            .asInput()
            .build()
        );
        nodes.push(...inputNodes);

        // Create 20 processing layers with 5 nodes each (100 processing nodes)
        const processingLayers: StageNode[][] = [];
        for (let layer = 0; layer < 20; layer++) {
          const layerNodes: StageNode[] = [];
          for (let nodeInLayer = 0; nodeInLayer < 5; nodeInLayer++) {
            const stageNode = new StageNodeBuilder()
              .withId(`stage-L${layer}-N${nodeInLayer}`)
              .withModelId(modelId)
              .withName(`Stage-L${layer}-N${nodeInLayer}`)
              .build();
            
            // Connect to previous layer (or inputs for first layer)
            if (layer === 0) {
              // First layer depends on inputs
              stageNode.addDependency(inputNodes[nodeInLayer].nodeId.toString());
            } else {
              // Depend on corresponding node from previous layer
              const prevLayerNode = processingLayers[layer - 1][nodeInLayer];
              stageNode.addDependency(prevLayerNode.nodeId.toString());
              
              // Add cross-layer dependencies for complex patterns
              if (nodeInLayer > 0) {
                const crossDep = processingLayers[layer - 1][nodeInLayer - 1];
                stageNode.addDependency(crossDep.nodeId.toString());
              }
            }
            
            layerNodes.push(stageNode);
          }
          processingLayers.push(layerNodes);
          nodes.push(...layerNodes);
        }

        // Create 3 output aggregators
        const outputNodes = Array.from({ length: 3 }, (_, i) => {
          const outputNode = new IONodeBuilder()
            .withId(`output-${i}`)
            .withModelId(modelId)
            .withName(`Output-${i}`)
            .asOutput()
            .build();
          
          // Connect to final processing layer
          const finalLayer = processingLayers[processingLayers.length - 1];
          finalLayer.forEach((stageNode, index) => {
            if (index % 2 === i % 2) { // Distribute connections
              outputNode.addDependency(stageNode.nodeId.toString());
            }
          });
          
          return outputNode;
        });
        nodes.push(...outputNodes);

        // Total: 5 inputs + 100 processing + 3 outputs = 108 nodes
        expect(nodes).toHaveLength(108);

        // Act - Build graph and verify performance
        const startTime = Date.now();
        const result = dependencyService.buildDependencyGraph(nodes);
        const buildTime = Date.now() - startTime;

        // Assert - Should complete within reasonable time (< 100ms for 108 nodes)
        expect(result).toBeValidResult();
        expect(buildTime).toBeLessThan(100);
        
        const graph = result.value;
        expect(graph.nodes.size).toBe(108);
        
        // Verify complex cross-layer dependencies are captured
        const midLayerNode = processingLayers[10][2]; // Layer 10, Node 2
        const dependencies = graph.reverseDependencies.get(midLayerNode.nodeId.toString());
        expect(dependencies).toContain(processingLayers[9][2].nodeId.toString()); // Same column
        expect(dependencies).toContain(processingLayers[9][1].nodeId.toString()); // Cross dependency
      });

      it('should handle complex multi-path convergence patterns', () => {
        // Arrange - Create "funnel" pattern: 8 inputs -> 4 stages -> 2 mergers -> 1 output
        const modelId = 'convergence-model';
        
        // Create 8 parallel input sources
        const inputNodes = Array.from({ length: 8 }, (_, i) => 
          new IONodeBuilder()
            .withId(`input-${i}`)
            .withModelId(modelId)
            .withName(`Input-${i}`)
            .asInput()
            .build()
        );

        // Create 4 first-stage processors (each depends on 2 inputs)
        const firstStageNodes = Array.from({ length: 4 }, (_, i) => {
          const stageNode = new StageNodeBuilder()
            .withId(`stage1-${i}`)
            .withModelId(modelId)
            .withName(`Stage1-${i}`)
            .build();
          
          // Each stage depends on 2 consecutive inputs
          stageNode.addDependency(inputNodes[i * 2].nodeId.toString());
          stageNode.addDependency(inputNodes[i * 2 + 1].nodeId.toString());
          
          return stageNode;
        });

        // Create 2 second-stage mergers (each depends on 2 first-stage nodes)
        const secondStageNodes = Array.from({ length: 2 }, (_, i) => {
          const stageNode = new StageNodeBuilder()
            .withId(`stage2-${i}`)
            .withModelId(modelId)
            .withName(`Stage2-${i}`)
            .build();
          
          stageNode.addDependency(firstStageNodes[i * 2].nodeId.toString());
          stageNode.addDependency(firstStageNodes[i * 2 + 1].nodeId.toString());
          
          return stageNode;
        });

        // Create final output (depends on both second-stage nodes)
        const outputNode = new IONodeBuilder()
          .withId('final-output')
          .withModelId(modelId)
          .withName('Final-Output')
          .asOutput()
          .build();
        
        secondStageNodes.forEach(stageNode => {
          outputNode.addDependency(stageNode.nodeId.toString());
        });

        const nodes = [...inputNodes, ...firstStageNodes, ...secondStageNodes, outputNode];

        // Act
        const result = dependencyService.buildDependencyGraph(nodes);

        // Assert
        expect(result).toBeValidResult();
        const graph = result.value;
        
        // Verify convergence pattern structure
        expect(graph.reverseDependencies.get('stage1-0')).toEqual(['input-0', 'input-1']);
        expect(graph.reverseDependencies.get('stage2-0')).toEqual(['stage1-0', 'stage1-1']);
        expect(graph.reverseDependencies.get('final-output')).toEqual(['stage2-0', 'stage2-1']);
        
        // Verify execution order respects convergence
        const orderResult = dependencyService.calculateExecutionOrder(graph);
        expect(orderResult).toBeValidResult();
        const order = orderResult.value;
        
        // All inputs should come first
        for (let i = 0; i < 8; i++) {
          expect(order.indexOf(`Input-${i}`)).toBeLessThan(8);
        }
        
        // Final output should be last
        expect(order[order.length - 1]).toBe('Final-Output');
      });

      it('should manage branching and re-convergence in parallel execution paths', () => {
        // Arrange - Complex "diamond lattice" pattern with multiple branches and merges
        const modelId = 'lattice-model';
        
        const source = new IONodeBuilder()
          .withId('source')
          .withModelId(modelId)
          .withName('Source')
          .asInput()
          .build();

        // Create multiple parallel branches (A, B, C paths)
        const branchA1 = new StageNodeBuilder().withId('branch-a1').withModelId(modelId).withName('Branch-A1').build();
        const branchA2 = new StageNodeBuilder().withId('branch-a2').withModelId(modelId).withName('Branch-A2').build();
        const branchB1 = new StageNodeBuilder().withId('branch-b1').withModelId(modelId).withName('Branch-B1').build();
        const branchB2 = new StageNodeBuilder().withId('branch-b2').withModelId(modelId).withName('Branch-B2').build();
        const branchC1 = new StageNodeBuilder().withId('branch-c1').withModelId(modelId).withName('Branch-C1').build();

        // Set up branching dependencies
        branchA1.addDependency(source.nodeId.toString());
        branchA2.addDependency(branchA1.nodeId.toString());
        branchB1.addDependency(source.nodeId.toString());
        branchB2.addDependency(branchB1.nodeId.toString());
        branchC1.addDependency(source.nodeId.toString());

        // Create cross-branch dependencies (re-convergence points)
        const convergeAB = new StageNodeBuilder().withId('converge-ab').withModelId(modelId).withName('Converge-AB').build();
        const convergeBC = new StageNodeBuilder().withId('converge-bc').withModelId(modelId).withName('Converge-BC').build();
        const convergeAC = new StageNodeBuilder().withId('converge-ac').withModelId(modelId).withName('Converge-AC').build();

        convergeAB.addDependency(branchA2.nodeId.toString());
        convergeAB.addDependency(branchB2.nodeId.toString());
        convergeBC.addDependency(branchB2.nodeId.toString());
        convergeBC.addDependency(branchC1.nodeId.toString());
        convergeAC.addDependency(branchA2.nodeId.toString());
        convergeAC.addDependency(branchC1.nodeId.toString());

        // Final convergence point
        const finalMerge = new IONodeBuilder()
          .withId('final-merge')
          .withModelId(modelId)
          .withName('Final-Merge')
          .asOutput()
          .build();

        finalMerge.addDependency(convergeAB.nodeId.toString());
        finalMerge.addDependency(convergeBC.nodeId.toString());
        finalMerge.addDependency(convergeAC.nodeId.toString());

        const nodes = [
          source, branchA1, branchA2, branchB1, branchB2, branchC1,
          convergeAB, convergeBC, convergeAC, finalMerge
        ];

        // Act
        const result = dependencyService.buildDependencyGraph(nodes);

        // Assert
        expect(result).toBeValidResult();
        const graph = result.value;
        
        // Verify complex re-convergence patterns
        expect(graph.reverseDependencies.get(convergeAB.nodeId.toString())?.sort())
          .toEqual([branchA2.nodeId.toString(), branchB2.nodeId.toString()].sort());
        expect(graph.reverseDependencies.get(convergeBC.nodeId.toString())?.sort())
          .toEqual([branchB2.nodeId.toString(), branchC1.nodeId.toString()].sort());
        expect(graph.reverseDependencies.get(convergeAC.nodeId.toString())?.sort())
          .toEqual([branchA2.nodeId.toString(), branchC1.nodeId.toString()].sort());

        // Verify execution order optimization can handle complex convergence
        const pathsResult = dependencyService.optimizeExecutionPaths(nodes);
        expect(pathsResult).toBeValidResult();
        const paths = pathsResult.value;
        
        // Source should be at level 0
        const sourcePath = paths.find(p => p.nodeId === source.nodeId.toString());
        expect(sourcePath?.level).toBe(0);
        
        // Branches should be at level 1 and can execute in parallel
        const branch1Paths = paths.filter(p => ['branch-a1', 'branch-b1', 'branch-c1'].includes(p.nodeId));
        branch1Paths.forEach(path => {
          expect(path.level).toBe(1);
          expect(path.canExecuteInParallel).toBe(true);
        });
        
        // Final merge should be at the highest level
        const finalPath = paths.find(p => p.nodeId === finalMerge.nodeId.toString());
        expect(finalPath?.level).toBeGreaterThan(3);
      });
    });

    describe('Dynamic Graph Modification Scenarios', () => {
      it('should handle real-time dependency updates without graph corruption', () => {
        // Arrange - Start with initial graph
        const modelId = 'dynamic-model';
        const nodeA = new StageNodeBuilder().withId('node-a').withModelId(modelId).withName('Node-A').build();
        const nodeB = new StageNodeBuilder().withId('node-b').withModelId(modelId).withName('Node-B').build();
        const nodeC = new StageNodeBuilder().withId('node-c').withModelId(modelId).withName('Node-C').build();
        
        nodeB.addDependency(nodeA.nodeId.toString());
        nodeC.addDependency(nodeB.nodeId.toString());
        
        let nodes = [nodeA, nodeB, nodeC];
        
        // Act & Assert - Initial state
        let graphResult = dependencyService.buildDependencyGraph(nodes);
        expect(graphResult).toBeValidResult();
        
        let orderResult = dependencyService.calculateExecutionOrder(graphResult.value);
        expect(orderResult).toBeValidResult();
        expect(orderResult.value).toEqual(['Node-A', 'Node-B', 'Node-C']);
        
        // Simulate adding a new node that creates parallel path
        const nodeD = new StageNodeBuilder().withId('node-d').withModelId(modelId).withName('Node-D').build();
        nodeD.addDependency(nodeA.nodeId.toString());
        nodeC.removeDependency(nodeB.nodeId.toString());
        nodeC.addDependency(nodeD.nodeId.toString());
        
        nodes = [nodeA, nodeB, nodeC, nodeD];
        
        // Verify graph remains valid after modification
        graphResult = dependencyService.buildDependencyGraph(nodes);
        expect(graphResult).toBeValidResult();
        
        orderResult = dependencyService.calculateExecutionOrder(graphResult.value);
        expect(orderResult).toBeValidResult();
        
        // Node-B and Node-D can now execute in parallel after Node-A
        const order = orderResult.value;
        expect(order[0]).toBe('Node-A');
        expect(order[3]).toBe('Node-C');
        expect(order.slice(1, 3)).toContain('Node-B');
        expect(order.slice(1, 3)).toContain('Node-D');
      });

      it('should prevent dangerous dependency modifications that would create cycles', () => {
        // Arrange - Safe linear chain
        const modelId = 'safety-model';
        const nodeA = new StageNodeBuilder().withId('node-a').withModelId(modelId).withName('Node-A').build();
        const nodeB = new StageNodeBuilder().withId('node-b').withModelId(modelId).withName('Node-B').build();
        const nodeC = new StageNodeBuilder().withId('node-c').withModelId(modelId).withName('Node-C').build();
        
        nodeB.addDependency(nodeA.nodeId.toString());
        nodeC.addDependency(nodeB.nodeId.toString());
        
        // Initial valid state
        let nodes = [nodeA, nodeB, nodeC];
        let graphResult = dependencyService.buildDependencyGraph(nodes);
        expect(graphResult).toBeValidResult();
        
        // Act - Attempt to create cycle: A -> B -> C -> A
        nodeA.addDependency(nodeC.nodeId.toString());
        nodes = [nodeA, nodeB, nodeC];
        
        // Assert - Graph building should succeed (nodes can have invalid states)
        graphResult = dependencyService.buildDependencyGraph(nodes);
        expect(graphResult).toBeValidResult();
        
        // But cycle detection should catch the problem
        const cycleResult = dependencyService.detectCircularDependencies(graphResult.value);
        expect(cycleResult).toBeValidResult();
        expect(cycleResult.value).toHaveLength(1);
        
        // And execution order should fail due to cycle
        const orderResult = dependencyService.calculateExecutionOrder(graphResult.value);
        expect(orderResult).toBeFailureResult();
        expect(orderResult).toHaveErrorMessage('Cannot calculate execution order: circular dependencies detected');
      });
    });
  });

  describe('Advanced Circular Dependency Detection Algorithms', () => {
    describe('Complex Cycle Detection Scenarios', () => {
      it('should detect nested cycles within larger acyclic graph', () => {
        // Arrange - Large graph with embedded cycles
        const modelId = 'nested-cycle-model';
        
        // Create main flow (acyclic)
        const source = new IONodeBuilder().withId('source').withModelId(modelId).withName('Source').asInput().build();
        const mainA = new StageNodeBuilder().withId('main-a').withModelId(modelId).withName('Main-A').build();
        const mainB = new StageNodeBuilder().withId('main-b').withModelId(modelId).withName('Main-B').build();
        const sink = new IONodeBuilder().withId('sink').withModelId(modelId).withName('Sink').asOutput().build();
        
        mainA.addDependency(source.nodeId.toString());
        mainB.addDependency(mainA.nodeId.toString());
        sink.addDependency(mainB.nodeId.toString());
        
        // Create nested cyclic subgraph: cycle1A -> cycle1B -> cycle1C -> cycle1A
        const cycle1A = new StageNodeBuilder().withId('cycle1-a').withModelId(modelId).withName('Cycle1-A').build();
        const cycle1B = new StageNodeBuilder().withId('cycle1-b').withModelId(modelId).withName('Cycle1-B').build();
        const cycle1C = new StageNodeBuilder().withId('cycle1-c').withModelId(modelId).withName('Cycle1-C').build();
        
        cycle1A.addDependency(cycle1C.nodeId.toString()); // Creates cycle
        cycle1B.addDependency(cycle1A.nodeId.toString());
        cycle1C.addDependency(cycle1B.nodeId.toString());
        
        // Connect cycle to main flow
        cycle1A.addDependency(mainA.nodeId.toString());
        mainB.addDependency(cycle1C.nodeId.toString());
        
        // Create second independent cycle: cycle2A -> cycle2B -> cycle2A
        const cycle2A = new StageNodeBuilder().withId('cycle2-a').withModelId(modelId).withName('Cycle2-A').build();
        const cycle2B = new StageNodeBuilder().withId('cycle2-b').withModelId(modelId).withName('Cycle2-B').build();
        
        cycle2A.addDependency(cycle2B.nodeId.toString()); // Creates second cycle
        cycle2B.addDependency(cycle2A.nodeId.toString());
        
        // Connect second cycle to main flow
        cycle2A.addDependency(source.nodeId.toString());
        mainB.addDependency(cycle2B.nodeId.toString());
        
        const nodes = [
          source, mainA, mainB, sink,
          cycle1A, cycle1B, cycle1C,
          cycle2A, cycle2B
        ];

        // Act
        const graphResult = dependencyService.buildDependencyGraph(nodes);
        expect(graphResult).toBeValidResult();
        
        const cycleResult = dependencyService.detectCircularDependencies(graphResult.value);

        // Assert - Should detect both embedded cycles
        expect(cycleResult).toBeValidResult();
        const cycles = cycleResult.value;
        expect(cycles.length).toBeGreaterThanOrEqual(2);
        
        // Should find the 3-node cycle
        const longCycle = cycles.find(cycle => cycle.length === 4); // Including return to start
        expect(longCycle).toBeDefined();
        
        // Should find the 2-node cycle
        const shortCycle = cycles.find(cycle => cycle.length === 3); // Including return to start
        expect(shortCycle).toBeDefined();
      });

      it('should detect transitive cycles through complex dependency chains', () => {
        // Arrange - Complex transitive cycle: A -> B -> C -> D -> E -> F -> A
        const modelId = 'transitive-cycle-model';
        const nodes = Array.from({ length: 6 }, (_, i) => 
          new StageNodeBuilder()
            .withId(`node-${String.fromCharCode(65 + i)}`) // A, B, C, D, E, F
            .withModelId(modelId)
            .withName(`Node-${String.fromCharCode(65 + i)}`)
            .build()
        );
        
        // Create long transitive cycle
        for (let i = 0; i < nodes.length; i++) {
          const nextIndex = (i + 1) % nodes.length;
          nodes[i].addDependency(nodes[nextIndex].nodeId.toString());
        }
        
        // Add some non-cyclic branches to increase complexity
        const branchX = new StageNodeBuilder().withId('branch-x').withModelId(modelId).withName('Branch-X').build();
        const branchY = new StageNodeBuilder().withId('branch-y').withModelId(modelId).withName('Branch-Y').build();
        
        branchX.addDependency(nodes[2].nodeId.toString()); // Branch from C
        branchY.addDependency(branchX.nodeId.toString());
        
        const allNodes = [...nodes, branchX, branchY];

        // Act
        const graphResult = dependencyService.buildDependencyGraph(allNodes);
        expect(graphResult).toBeValidResult();
        
        const cycleResult = dependencyService.detectCircularDependencies(graphResult.value);

        // Assert
        expect(cycleResult).toBeValidResult();
        const cycles = cycleResult.value;
        expect(cycles).toHaveLength(1);
        
        const detectedCycle = cycles[0];
        expect(detectedCycle).toHaveLength(7); // 6 nodes + return to start
        
        // Verify the cycle includes all main nodes
        const cycleNodeIds = new Set(detectedCycle.slice(0, -1)); // Exclude duplicate start node
        expect(cycleNodeIds.size).toBe(6);
        nodes.forEach(node => {
          expect(cycleNodeIds.has(node.nodeId.toString())).toBe(true);
        });
      });

      it('should efficiently detect cycles in very large graphs (performance test)', () => {
        // Arrange - Create large graph with cycle at the end to test worst-case performance
        const modelId = 'performance-model';
        const nodes: Node[] = [];
        
        // Create 200 nodes in a long chain
        const chainNodes = Array.from({ length: 200 }, (_, i) => 
          new StageNodeBuilder()
            .withId(`chain-${i}`)
            .withModelId(modelId)
            .withName(`Chain-${i}`)
            .build()
        );
        
        // Connect them in sequence
        for (let i = 1; i < chainNodes.length; i++) {
          chainNodes[i].addDependency(chainNodes[i - 1].nodeId.toString());
        }
        
        // Add cycle at the end: last -> second-to-last
        chainNodes[chainNodes.length - 2].addDependency(chainNodes[chainNodes.length - 1].nodeId.toString());
        
        nodes.push(...chainNodes);

        // Act - Measure performance
        const startTime = Date.now();
        const graphResult = dependencyService.buildDependencyGraph(nodes);
        expect(graphResult).toBeValidResult();
        
        const cycleResult = dependencyService.detectCircularDependencies(graphResult.value);
        const detectionTime = Date.now() - startTime;

        // Assert - Should complete quickly (< 50ms for 200 nodes) and find the cycle
        expect(detectionTime).toBeLessThan(50);
        expect(cycleResult).toBeValidResult();
        expect(cycleResult.value).toHaveLength(1);
        
        const detectedCycle = cycleResult.value[0];
        expect(detectedCycle).toHaveLength(3); // Two nodes + return = 3 elements
      });
    });

    describe('Cycle Impact Analysis', () => {
      it('should analyze impact scope of circular dependencies on execution paths', () => {
        // Arrange - Graph with cycle that affects multiple execution paths
        const modelId = 'impact-model';
        
        // Create main execution paths
        const input1 = new IONodeBuilder().withId('input-1').withModelId(modelId).withName('Input-1').asInput().build();
        const input2 = new IONodeBuilder().withId('input-2').withModelId(modelId).withName('Input-2').asInput().build();
        
        // Create cyclic section that both paths depend on
        const cyclicA = new StageNodeBuilder().withId('cyclic-a').withModelId(modelId).withName('Cyclic-A').build();
        const cyclicB = new StageNodeBuilder().withId('cyclic-b').withModelId(modelId).withName('Cyclic-B').build();
        
        cyclicA.addDependency(cyclicB.nodeId.toString());
        cyclicB.addDependency(cyclicA.nodeId.toString()); // Creates cycle
        
        // Connect inputs to cyclic section
        cyclicA.addDependency(input1.nodeId.toString());
        cyclicB.addDependency(input2.nodeId.toString());
        
        // Create downstream nodes affected by cycle
        const output1 = new IONodeBuilder().withId('output-1').withModelId(modelId).withName('Output-1').asOutput().build();
        const output2 = new IONodeBuilder().withId('output-2').withModelId(modelId).withName('Output-2').asOutput().build();
        const output3 = new IONodeBuilder().withId('output-3').withModelId(modelId).withName('Output-3').asOutput().build();
        
        output1.addDependency(cyclicA.nodeId.toString());
        output2.addDependency(cyclicB.nodeId.toString());
        output3.addDependency(cyclicA.nodeId.toString());
        output3.addDependency(cyclicB.nodeId.toString());
        
        const nodes = [input1, input2, cyclicA, cyclicB, output1, output2, output3];

        // Act
        const graphResult = dependencyService.buildDependencyGraph(nodes);
        expect(graphResult).toBeValidResult();
        const graph = graphResult.value;
        
        // Find reachable nodes from each input to analyze impact
        const impactFromInput1 = dependencyService.findReachableNodes(graph, input1.nodeId.toString());
        const impactFromInput2 = dependencyService.findReachableNodes(graph, input2.nodeId.toString());

        // Assert - Cycle affects reachability analysis
        expect(impactFromInput1).toBeValidResult();
        expect(impactFromInput2).toBeValidResult();
        
        // Both inputs should be able to reach all outputs due to the cycle
        const reachableFromInput1 = impactFromInput1.value;
        const reachableFromInput2 = impactFromInput2.value;
        
        expect(reachableFromInput1).toContain(output1.nodeId.toString());
        expect(reachableFromInput1).toContain(output2.nodeId.toString());
        expect(reachableFromInput1).toContain(output3.nodeId.toString());
        
        expect(reachableFromInput2).toContain(output1.nodeId.toString());
        expect(reachableFromInput2).toContain(output2.nodeId.toString());
        expect(reachableFromInput2).toContain(output3.nodeId.toString());
        
        // Cycle should prevent execution order calculation
        const orderResult = dependencyService.calculateExecutionOrder(graph);
        expect(orderResult).toBeFailureResult();
      });
    });
  });

  describe('Execution Order Optimization and Calculation', () => {
    describe('Parallel Execution Path Optimization', () => {
      it('should optimize execution paths for maximum parallelization opportunities', () => {
        // Arrange - Complex graph designed for parallel optimization
        const modelId = 'parallel-model';
        
        // Create source data
        const dataSource = new IONodeBuilder().withId('data-source').withModelId(modelId).withName('Data-Source').asInput().build();
        
        // Create independent processing branches (can be parallelized)
        const processA = new StageNodeBuilder().withId('process-a').withModelId(modelId).withName('Process-A').build();
        const processB = new StageNodeBuilder().withId('process-b').withModelId(modelId).withName('Process-B').build();
        const processC = new StageNodeBuilder().withId('process-c').withModelId(modelId).withName('Process-C').build();
        const processD = new StageNodeBuilder().withId('process-d').withModelId(modelId).withName('Process-D').build();
        
        // All processes can start simultaneously from data source
        processA.addDependency(dataSource.nodeId.toString());
        processB.addDependency(dataSource.nodeId.toString());
        processC.addDependency(dataSource.nodeId.toString());
        processD.addDependency(dataSource.nodeId.toString());
        
        // Create second level processors (also parallelizable)
        const aggregateAB = new StageNodeBuilder().withId('aggregate-ab').withModelId(modelId).withName('Aggregate-AB').build();
        const aggregateCD = new StageNodeBuilder().withId('aggregate-cd').withModelId(modelId).withName('Aggregate-CD').build();
        
        aggregateAB.addDependency(processA.nodeId.toString());
        aggregateAB.addDependency(processB.nodeId.toString());
        aggregateCD.addDependency(processC.nodeId.toString());
        aggregateCD.addDependency(processD.nodeId.toString());
        
        // Create final merger
        const finalResult = new IONodeBuilder().withId('final-result').withModelId(modelId).withName('Final-Result').asOutput().build();
        finalResult.addDependency(aggregateAB.nodeId.toString());
        finalResult.addDependency(aggregateCD.nodeId.toString());
        
        const nodes = [
          dataSource, processA, processB, processC, processD,
          aggregateAB, aggregateCD, finalResult
        ];

        // Act
        const pathsResult = dependencyService.optimizeExecutionPaths(nodes);

        // Assert
        expect(pathsResult).toBeValidResult();
        const paths = pathsResult.value;
        
        // Verify execution levels for parallelization
        const sourceLevel = paths.find(p => p.nodeId === dataSource.nodeId.toString())?.level;
        const processLevel = paths.filter(p => ['process-a', 'process-b', 'process-c', 'process-d'].includes(p.nodeId));
        const aggregateLevel = paths.filter(p => ['aggregate-ab', 'aggregate-cd'].includes(p.nodeId));
        const finalLevel = paths.find(p => p.nodeId === finalResult.nodeId.toString())?.level;
        
        expect(sourceLevel).toBe(0);
        
        // All first-level processes should be at level 1 and parallelizable
        processLevel.forEach(path => {
          expect(path.level).toBe(1);
          expect(path.canExecuteInParallel).toBe(true);
        });
        
        // Aggregates should be at level 2 and parallelizable
        aggregateLevel.forEach(path => {
          expect(path.level).toBe(2);
          expect(path.canExecuteInParallel).toBe(true);
        });
        
        expect(finalLevel).toBe(3);
        
        // Verify paths are sorted by execution level
        const sortedPaths = [...paths].sort((a, b) => a.level - b.level);
        expect(paths).toEqual(sortedPaths);
      });

      it('should identify critical path for execution time estimation', () => {
        // Arrange - Graph with different path lengths to test critical path detection
        const modelId = 'critical-path-model';
        
        const start = new IONodeBuilder().withId('start').withModelId(modelId).withName('Start').asInput().build();
        
        // Short path: start -> fastA -> fastEnd (2 hops)
        const fastA = new StageNodeBuilder().withId('fast-a').withModelId(modelId).withName('Fast-A').build();
        const fastEnd = new StageNodeBuilder().withId('fast-end').withModelId(modelId).withName('Fast-End').build();
        
        fastA.addDependency(start.nodeId.toString());
        fastEnd.addDependency(fastA.nodeId.toString());
        
        // Long path: start -> slowA -> slowB -> slowC -> slowD -> slowEnd (5 hops)
        const slowA = new StageNodeBuilder().withId('slow-a').withModelId(modelId).withName('Slow-A').build();
        const slowB = new StageNodeBuilder().withId('slow-b').withModelId(modelId).withName('Slow-B').build();
        const slowC = new StageNodeBuilder().withId('slow-c').withModelId(modelId).withName('Slow-C').build();
        const slowD = new StageNodeBuilder().withId('slow-d').withModelId(modelId).withName('Slow-D').build();
        const slowEnd = new StageNodeBuilder().withId('slow-end').withModelId(modelId).withName('Slow-End').build();
        
        slowA.addDependency(start.nodeId.toString());
        slowB.addDependency(slowA.nodeId.toString());
        slowC.addDependency(slowB.nodeId.toString());
        slowD.addDependency(slowC.nodeId.toString());
        slowEnd.addDependency(slowD.nodeId.toString());
        
        // Final convergence
        const finalOutput = new IONodeBuilder().withId('final-output').withModelId(modelId).withName('Final-Output').asOutput().build();
        finalOutput.addDependency(fastEnd.nodeId.toString());
        finalOutput.addDependency(slowEnd.nodeId.toString());
        
        const nodes = [start, fastA, fastEnd, slowA, slowB, slowC, slowD, slowEnd, finalOutput];

        // Act
        const criticalPathResult = dependencyService.findCriticalPath(nodes);

        // Assert
        expect(criticalPathResult).toBeValidResult();
        const criticalPath = criticalPathResult.value;
        
        // Critical path should be the longest path (through slow nodes)
        expect(criticalPath).toHaveLength(6); // start -> slowA -> slowB -> slowC -> slowD -> slowEnd
        expect(criticalPath).toContain(start.nodeId.toString());
        expect(criticalPath).toContain(slowA.nodeId.toString());
        expect(criticalPath).toContain(slowB.nodeId.toString());
        expect(criticalPath).toContain(slowC.nodeId.toString());
        expect(criticalPath).toContain(slowD.nodeId.toString());
        expect(criticalPath).toContain(slowEnd.nodeId.toString());
        
        // Should not include fast path nodes (except possibly start/end if shared)
        expect(criticalPath).not.toContain(fastA.nodeId.toString());
      });

      it('should handle execution priority metadata for path optimization', () => {
        // Arrange - Nodes with different priority metadata
        const modelId = 'priority-model';
        
        const source = new IONodeBuilder().withId('source').withModelId(modelId).withName('Source').asInput().build();
        
        // Create nodes with priority metadata
        const highPriorityNode = new StageNodeBuilder().withId('high-priority').withModelId(modelId).withName('High-Priority').build();
        const mediumPriorityNode = new StageNodeBuilder().withId('medium-priority').withModelId(modelId).withName('Medium-Priority').build();
        const lowPriorityNode = new StageNodeBuilder().withId('low-priority').withModelId(modelId).withName('Low-Priority').build();
        
        // Set priority metadata (higher number = higher priority)
        highPriorityNode.updateMetadata({ priority: 9 });
        mediumPriorityNode.updateMetadata({ priority: 5 });
        lowPriorityNode.updateMetadata({ priority: 1 });
        
        // All depend on source and can execute in parallel
        highPriorityNode.addDependency(source.nodeId.toString());
        mediumPriorityNode.addDependency(source.nodeId.toString());
        lowPriorityNode.addDependency(source.nodeId.toString());
        
        const sink = new IONodeBuilder().withId('sink').withModelId(modelId).withName('Sink').asOutput().build();
        sink.addDependency(highPriorityNode.nodeId.toString());
        sink.addDependency(mediumPriorityNode.nodeId.toString());
        sink.addDependency(lowPriorityNode.nodeId.toString());
        
        const nodes = [source, highPriorityNode, mediumPriorityNode, lowPriorityNode, sink];

        // Act
        const pathsResult = dependencyService.optimizeExecutionPaths(nodes);

        // Assert
        expect(pathsResult).toBeValidResult();
        const paths = pathsResult.value;
        
        // Find paths at the parallel execution level
        const parallelPaths = paths.filter(p => p.level === 1);
        expect(parallelPaths).toHaveLength(3);
        
        // Verify priority ordering within the same level
        expect(parallelPaths[0].nodeId).toBe('high-priority'); // Highest priority first
        expect(parallelPaths[1].nodeId).toBe('medium-priority');
        expect(parallelPaths[2].nodeId).toBe('low-priority'); // Lowest priority last
        
        // All should be marked as parallel
        parallelPaths.forEach(path => {
          expect(path.canExecuteInParallel).toBe(true);
        });
      });
    });

    describe('Large-Scale Optimization Performance', () => {
      it('should efficiently calculate execution order for enterprise-scale graphs', () => {
        // Arrange - Create large hierarchical graph (similar to earlier test but focused on optimization)
        const modelId = 'enterprise-optimization-model';
        const nodes: Node[] = [];
        
        // Create pyramid structure: 1 -> 2 -> 4 -> 8 -> 16 -> 32 nodes per level
        const levels = [1, 2, 4, 8, 16, 32];
        let allNodesInLevels: StageNode[][] = [];
        
        levels.forEach((nodesInLevel, levelIndex) => {
          const levelNodes: StageNode[] = [];
          
          for (let i = 0; i < nodesInLevel; i++) {
            const node = new StageNodeBuilder()
              .withId(`L${levelIndex}-N${i}`)
              .withModelId(modelId)
              .withName(`Level${levelIndex}-Node${i}`)
              .build();
            
            // Connect to previous level (fan-out pattern)
            if (levelIndex > 0) {
              const prevLevel = allNodesInLevels[levelIndex - 1];
              const connectTo = prevLevel[i % prevLevel.length]; // Distribute connections
              node.addDependency(connectTo.nodeId.toString());
            }
            
            levelNodes.push(node);
          }
          
          allNodesInLevels.push(levelNodes);
          nodes.push(...levelNodes);
        });
        
        expect(nodes).toHaveLength(63); // 1+2+4+8+16+32 = 63 nodes

        // Act - Measure optimization performance
        const startTime = Date.now();
        const pathsResult = dependencyService.optimizeExecutionPaths(nodes);
        const optimizationTime = Date.now() - startTime;

        // Assert - Should complete quickly and provide valid optimization
        expect(optimizationTime).toBeLessThan(100); // < 100ms for 63 nodes
        expect(pathsResult).toBeValidResult();
        
        const paths = pathsResult.value;
        expect(paths).toHaveLength(63);
        
        // Verify correct level assignment
        allNodesInLevels.forEach((levelNodes, levelIndex) => {
          levelNodes.forEach(node => {
            const path = paths.find(p => p.nodeId === node.nodeId.toString());
            expect(path?.level).toBe(levelIndex);
            
            // Nodes at levels > 0 should be able to parallel within their level
            if (levelIndex > 0) {
              expect(path?.canExecuteInParallel).toBe(true);
            }
          });
        });
        
        // Verify paths are properly sorted
        for (let i = 1; i < paths.length; i++) {
          expect(paths[i].level).toBeGreaterThanOrEqual(paths[i - 1].level);
        }
      });
    });
  });

  describe('Clean Architecture Compliance with Complex Algorithms', () => {
    describe('Domain Service Boundary Validation', () => {
      it('should maintain Clean Architecture principles during complex graph operations', () => {
        // Arrange - Create scenario that tests architectural boundaries
        const modelId = 'architecture-test-model';
        
        // Create complex graph that exercises all service methods
        const nodes: Node[] = [];
        for (let i = 0; i < 10; i++) {
          const node = new StageNodeBuilder()
            .withId(`node-${i}`)
            .withModelId(modelId)
            .withName(`Node-${i}`)
            .build();
          
          // Create some dependencies to make it interesting
          if (i > 0) {
            node.addDependency(`node-${i - 1}`);
          }
          if (i > 2) {
            node.addDependency(`node-${i - 3}`);
          }
          
          nodes.push(node);
        }

        // Act - Exercise all major service methods to test boundaries
        const graphResult = dependencyService.buildDependencyGraph(nodes);
        expect(graphResult).toBeValidResult();
        const graph = graphResult.value;
        
        const cycleResult = dependencyService.detectCircularDependencies(graph);
        const orderResult = dependencyService.calculateExecutionOrder(graph);
        const pathsResult = dependencyService.optimizeExecutionPaths(nodes);
        const criticalResult = dependencyService.findCriticalPath(nodes);
        const reachableResult = dependencyService.findReachableNodes(graph, 'node-0');

        // Assert - All operations should succeed and return proper Result types
        expect(cycleResult).toBeValidResult();
        expect(orderResult).toBeValidResult();
        expect(pathsResult).toBeValidResult();
        expect(criticalResult).toBeValidResult();
        expect(reachableResult).toBeValidResult();
        
        // Verify service returns domain objects and value objects only
        expect(graphResult.value.nodes).toBeInstanceOf(Map);
        expect(Array.from(graphResult.value.nodes.values())[0]).toBeInstanceOf(Node);
        expect(orderResult.value).toBeInstanceOf(Array);
        expect(pathsResult.value).toBeInstanceOf(Array);
        expect(pathsResult.value[0]).toMatchObject({
          nodeId: expect.any(String),
          level: expect.any(Number),
          dependencies: expect.any(Array),
          canExecuteInParallel: expect.any(Boolean)
        });
      });

      it('should not depend on external infrastructure during algorithm execution', () => {
        // Arrange - Test that service works purely with in-memory domain objects
        const modelId = 'isolation-test-model';
        const nodes = [
          new StageNodeBuilder().withId('node-a').withModelId(modelId).build(),
          new StageNodeBuilder().withId('node-b').withModelId(modelId).build(),
          new StageNodeBuilder().withId('node-c').withModelId(modelId).build()
        ];
        
        nodes[1].addDependency(nodes[0].nodeId.toString());
        nodes[2].addDependency(nodes[1].nodeId.toString());

        // Act - All operations should work without external dependencies
        // This implicitly tests that no database calls, file I/O, or network calls are made
        const startTime = Date.now();
        
        const graphResult = dependencyService.buildDependencyGraph(nodes);
        const cycleResult = dependencyService.detectCircularDependencies(nodes);
        const orderResult = dependencyService.calculateExecutionOrder(nodes);
        const pathsResult = dependencyService.optimizeExecutionPaths(nodes);
        
        const executionTime = Date.now() - startTime;

        // Assert - Should execute very quickly (indicating no I/O operations)
        expect(executionTime).toBeLessThan(10); // < 10ms indicates pure in-memory operation
        
        // All operations should succeed
        expect(graphResult).toBeValidResult();
        expect(cycleResult).toBeValidResult();
        expect(orderResult).toBeValidResult();
        expect(pathsResult).toBeValidResult();
      });

      it('should handle domain validation rules consistently across all operations', () => {
        // Arrange - Create scenario with various validation edge cases
        const modelId = 'validation-test-model';
        
        // Test empty graph
        const emptyResult = dependencyService.buildDependencyGraph([]);
        expect(emptyResult).toBeValidResult();
        
        // Test single node
        const singleNode = new StageNodeBuilder().withId('single').withModelId(modelId).build();
        const singleResult = dependencyService.buildDependencyGraph([singleNode]);
        expect(singleResult).toBeValidResult();
        
        // Test invalid dependency reference
        const invalidNode = new StageNodeBuilder().withId('invalid').withModelId(modelId).withName('invalid').build();
        invalidNode.addDependency('non-existent-node');
        const invalidResult = dependencyService.buildDependencyGraph([invalidNode]);
        expect(invalidResult).toBeFailureResult();
        expect(invalidResult.error).toContain('references non-existent dependency');

        // Act & Assert - Service should handle all validation consistently
        // and return appropriate Result types in all cases
        expect(emptyResult.value).toBeDefined();
        expect(singleResult.value).toBeDefined();
        expect(invalidResult.error).toBeDefined();
      });
    });
  });
});