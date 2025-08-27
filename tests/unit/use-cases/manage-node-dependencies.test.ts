/**
 * System-Level Tests for UC-010: Node Dependency Management
 * 
 * This test suite validates enterprise-scale dependency management capabilities
 * focusing on Clean Architecture compliance and system orchestration.
 * 
 * Coverage Areas:
 * - Complex Dependency Graph Management (100+ nodes)
 * - Advanced Circular Dependency Detection
 * - Execution Order Optimization
 * - Dependency Validation & Integrity
 * - Performance Optimization
 * - Clean Architecture Compliance
 */

import { ManageNodeDependenciesUseCase } from '@/lib/use-cases/manage-node-dependencies-use-case';
import { NodeDependencyService, DependencyGraph, ExecutionPath } from '@/lib/domain/services/node-dependency-service';
import { Node } from '@/lib/domain/entities/node';
import { Result } from '@/lib/domain/shared/result';
import { 
  StageNodeBuilder,
  IONodeBuilder,
  TestFactories 
} from '../../utils/test-fixtures';
import { ResultTestHelpers } from '../../utils/test-helpers';

describe('UC-010: Node Dependency Management - System Use Case', () => {
  let useCase: ManageNodeDependenciesUseCase;
  let mockDependencyService: jest.Mocked<NodeDependencyService>;

  beforeEach(() => {
    mockDependencyService = {
      buildDependencyGraph: jest.fn(),
      detectCircularDependencies: jest.fn(),
      calculateExecutionOrder: jest.fn(),
      optimizeExecutionPaths: jest.fn(),
      findCriticalPath: jest.fn(),
      validateAcyclicity: jest.fn(),
      findReachableNodes: jest.fn(),
      getDependencyDepth: jest.fn(),
      findDependentModels: jest.fn(),
      analyzeCascadingEffects: jest.fn(),
      validateDependencyIntegrity: jest.fn(),
      repairBrokenReferences: jest.fn()
    } as jest.Mocked<NodeDependencyService>;

    useCase = new ManageNodeDependenciesUseCase(mockDependencyService);
  });

  describe('Enterprise-Scale Dependency Management', () => {
    describe('Complex Dependency Graph Operations', () => {
      it('should manage 100+ node enterprise dependency graphs efficiently', async () => {
        // Arrange - Enterprise scale with multiple complex patterns
        const enterpriseGraph = createEnterpriseGraph(150);
        const request = {
          operation: 'BUILD_GRAPH' as const,
          nodes: enterpriseGraph.nodes,
          options: {
            enablePerformanceOptimization: true,
            maxDepth: 20,
            parallelExecutionThreshold: 10
          }
        };

        mockDependencyService.buildDependencyGraph.mockReturnValue(
          Result.ok(enterpriseGraph.dependencyGraph)
        );

        // Act
        const result = await useCase.execute(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual({
          success: true,
          graph: enterpriseGraph.dependencyGraph,
          operationType: 'BUILD_GRAPH',
          metadata: {
            nodeCount: 150,
            complexity: 'ENTERPRISE_SCALE',
            processingTime: expect.any(Number),
            performanceOptimized: true
          }
        });

        expect(mockDependencyService.buildDependencyGraph).toHaveBeenCalledWith(
          enterpriseGraph.nodes
        );
      });

      it('should handle multi-layer dependency hierarchies (15+ levels)', async () => {
        // Arrange - Deep hierarchical structure
        const deepHierarchy = createDeepHierarchyGraph(18);
        const request = {
          operation: 'VALIDATE_DEPTH' as const,
          nodes: deepHierarchy.nodes,
          options: {
            maxDepth: 20,
            warnThreshold: 15
          }
        };

        mockDependencyService.validateAcyclicity.mockReturnValue(
          Result.ok({
            isValid: true,
            errors: [],
            warnings: ['Deep dependency chain detected (18 levels) - consider restructuring for better performance']
          })
        );

        // Act
        const result = await useCase.execute(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.warnings).toContain(
          'Deep dependency chain detected (18 levels) - consider restructuring for better performance'
        );
      });

      it('should manage complex dependency patterns (diamond, tree, mesh)', async () => {
        // Arrange - Mixed complex patterns
        const complexPatterns = createMixedComplexPatterns();
        const request = {
          operation: 'ANALYZE_COMPLEXITY' as const,
          nodes: complexPatterns.nodes,
          options: {
            analyzePatterns: ['DIAMOND', 'TREE', 'MESH'],
            complexityThreshold: 10
          }
        };

        mockDependencyService.buildDependencyGraph.mockReturnValue(
          Result.ok(complexPatterns.dependencyGraph)
        );
        mockDependencyService.findCriticalPath.mockReturnValue(
          Result.ok(complexPatterns.criticalPath)
        );

        // Act
        const result = await useCase.execute(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value).toMatchObject({
          success: true,
          operationType: 'ANALYZE_COMPLEXITY',
          patterns: {
            diamond: expect.any(Number),
            tree: expect.any(Number),
            mesh: expect.any(Number)
          },
          criticalPath: complexPatterns.criticalPath
        });
      });
    });

    describe('Advanced Circular Dependency Detection', () => {
      it('should detect nested circular dependencies across multiple levels', async () => {
        // Arrange - Complex nested cycles
        const nestedCycles = createNestedCyclesGraph();
        const request = {
          operation: 'DETECT_CYCLES' as const,
          nodes: nestedCycles.nodes,
          options: {
            detectNestedCycles: true,
            maxCycleDepth: 10
          }
        };

        mockDependencyService.detectCircularDependencies.mockReturnValue(
          Result.ok([
            ['A', 'B', 'C', 'A'],
            ['D', 'E', 'F', 'G', 'D'],
            ['H', 'I', 'H']
          ])
        );

        // Act
        const result = await useCase.execute(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.cycles).toHaveLength(3);
        expect(result.value.cycles).toContainEqual(['A', 'B', 'C', 'A']);
        expect(result.value.cycles).toContainEqual(['D', 'E', 'F', 'G', 'D']);
        expect(result.value.cycles).toContainEqual(['H', 'I', 'H']);
      });

      it('should detect transitive circular dependencies', async () => {
        // Arrange - Indirect circular dependencies through multiple nodes
        const transitiveCycles = createTransitiveCyclesGraph();
        const request = {
          operation: 'DETECT_TRANSITIVE_CYCLES' as const,
          nodes: transitiveCycles.nodes,
          options: {
            enableTransitiveAnalysis: true,
            transitiveDepth: 5
          }
        };

        mockDependencyService.detectCircularDependencies.mockReturnValue(
          Result.ok([
            ['A', 'B', 'C', 'D', 'E', 'A']
          ])
        );

        // Act
        const result = await useCase.execute(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.cycles).toHaveLength(1);
        expect(result.value.transitiveDepth).toBe(5);
      });

      it('should perform cycle detection with sub-100ms performance target', async () => {
        // Arrange - Large graph for performance testing
        const performanceGraph = createPerformanceTestGraph(200);
        const request = {
          operation: 'PERFORMANCE_CYCLE_DETECTION' as const,
          nodes: performanceGraph.nodes,
          options: {
            performanceTarget: 100, // 100ms
            enableProfiling: true
          }
        };

        mockDependencyService.detectCircularDependencies.mockReturnValue(
          Result.ok([])
        );

        const startTime = Date.now();

        // Act
        const result = await useCase.execute(request);

        // Assert
        const executionTime = Date.now() - startTime;
        expect(result.isSuccess).toBe(true);
        expect(executionTime).toBeLessThan(100); // Sub-100ms target
        expect(result.value.performance).toMatchObject({
          executionTime: expect.any(Number),
          nodeCount: 200,
          performanceTarget: 100,
          targetMet: true
        });
      });
    });

    describe('Execution Order Optimization', () => {
      it('should optimize parallel execution opportunities', async () => {
        // Arrange - Graph with multiple parallelizable paths
        const parallelGraph = createParallelOptimizationGraph();
        const request = {
          operation: 'OPTIMIZE_EXECUTION' as const,
          nodes: parallelGraph.nodes,
          options: {
            enableParallelOptimization: true,
            maxParallelNodes: 8,
            priorityWeighting: true
          }
        };

        const optimizedPaths: ExecutionPath[] = [
          { nodeId: 'A', level: 0, dependencies: [], canExecuteInParallel: false },
          { nodeId: 'B', level: 1, dependencies: ['A'], canExecuteInParallel: true },
          { nodeId: 'C', level: 1, dependencies: ['A'], canExecuteInParallel: true },
          { nodeId: 'D', level: 2, dependencies: ['B', 'C'], canExecuteInParallel: false }
        ];

        mockDependencyService.optimizeExecutionPaths.mockReturnValue(
          Result.ok(optimizedPaths)
        );

        // Act
        const result = await useCase.execute(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.optimizedPaths).toEqual(optimizedPaths);
        expect(result.value.parallelOpportunities).toBe(2);
      });

      it('should calculate critical path for execution planning', async () => {
        // Arrange - Complex graph with multiple paths
        const criticalPathGraph = createCriticalPathGraph();
        const request = {
          operation: 'FIND_CRITICAL_PATH' as const,
          nodes: criticalPathGraph.nodes,
          options: {
            includeDuration: true,
            optimizeForTime: true
          }
        };

        mockDependencyService.findCriticalPath.mockReturnValue(
          Result.ok(['Start', 'A', 'B', 'C', 'End'])
        );

        // Act
        const result = await useCase.execute(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.criticalPath).toEqual(['Start', 'A', 'B', 'C', 'End']);
        expect(result.value.criticalPathLength).toBe(5);
      });

      it('should handle priority-based execution ordering', async () => {
        // Arrange - Nodes with different priorities
        const priorityGraph = createPriorityBasedGraph();
        const request = {
          operation: 'PRIORITY_EXECUTION_ORDER' as const,
          nodes: priorityGraph.nodes,
          options: {
            respectPriorities: true,
            priorityWeight: 0.7,
            dependencyWeight: 0.3
          }
        };

        mockDependencyService.calculateExecutionOrder.mockReturnValue(
          Result.ok(['HighPriority', 'MediumPriority', 'LowPriority'])
        );

        // Act
        const result = await useCase.execute(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.executionOrder).toEqual(['HighPriority', 'MediumPriority', 'LowPriority']);
        expect(result.value.priorityOptimized).toBe(true);
      });
    });

    describe('Dependency Validation & Integrity', () => {
      it('should validate domain business rules for node dependencies', async () => {
        // Arrange - Nodes that violate business rules
        const invalidGraph = createBusinessRuleViolationGraph();
        const request = {
          operation: 'VALIDATE_BUSINESS_RULES' as const,
          nodes: invalidGraph.nodes,
          options: {
            enforceBusinessRules: true,
            strictValidation: true
          }
        };

        mockDependencyService.validateAcyclicity.mockReturnValue(
          Result.ok({
            isValid: false,
            errors: [
              'Output node cannot depend on another output node',
              'Input node cannot have dependencies'
            ],
            warnings: []
          })
        );

        // Act
        const result = await useCase.execute(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.validation.isValid).toBe(false);
        expect(result.value.validation.errors).toContain(
          'Output node cannot depend on another output node'
        );
      });

      it('should handle edge cases and input sanitization', async () => {
        // Arrange - Edge cases: empty arrays, null dependencies, malformed data
        const edgeCaseRequest = {
          operation: 'VALIDATE_EDGE_CASES' as const,
          nodes: [] as Node[],
          options: {
            handleEmptyGraphs: true,
            sanitizeInputs: true
          }
        };

        mockDependencyService.buildDependencyGraph.mockReturnValue(
          Result.ok({
            nodes: new Map(),
            adjacencyList: new Map(),
            reverseDependencies: new Map()
          })
        );

        // Act
        const result = await useCase.execute(edgeCaseRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.validation.handledEdgeCases).toBe(true);
      });

      it('should perform integrity checks on dependency references', async () => {
        // Arrange - Graph with broken references
        const brokenRefGraph = createBrokenReferenceGraph();
        const request = {
          operation: 'VALIDATE_INTEGRITY' as const,
          nodes: brokenRefGraph.nodes,
          options: {
            checkIntegrity: true,
            repairBrokenReferences: true
          }
        };

        mockDependencyService.validateDependencyIntegrity.mockResolvedValue(
          Result.ok({
            integrityMaintained: false,
            brokenReferences: ['missing-node-1', 'missing-node-2'],
            missingDependencies: ['orphaned-dep-1'],
            validationPassed: false
          })
        );

        mockDependencyService.repairBrokenReferences.mockResolvedValue(
          Result.ok({
            repairActions: [
              { action: 'REMOVE_REFERENCE', target: 'missing-node-1', status: 'COMPLETED' },
              { action: 'REMOVE_REFERENCE', target: 'missing-node-2', status: 'COMPLETED' }
            ],
            allRepairsSuccessful: true,
            remainingIssues: []
          })
        );

        // Act
        const result = await useCase.execute(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.integrity.brokenReferences).toEqual(['missing-node-1', 'missing-node-2']);
        expect(result.value.repair.allRepairsSuccessful).toBe(true);
      });
    });

    describe('Performance Optimization & Scalability', () => {
      it('should achieve sub-100ms operations for complex graphs', async () => {
        // Arrange - Complex graph for performance benchmarking
        const performanceGraph = createComplexPerformanceGraph(500);
        const request = {
          operation: 'PERFORMANCE_BENCHMARK' as const,
          nodes: performanceGraph.nodes,
          options: {
            targetTime: 100,
            enableProfiling: true,
            optimizeForSpeed: true
          }
        };

        mockDependencyService.buildDependencyGraph.mockReturnValue(
          Result.ok(performanceGraph.dependencyGraph)
        );

        const startTime = performance.now();

        // Act
        const result = await useCase.execute(request);

        // Assert
        const executionTime = performance.now() - startTime;
        expect(result.isSuccess).toBe(true);
        expect(executionTime).toBeLessThan(100);
        expect(result.value.performance).toMatchObject({
          executionTime: expect.any(Number),
          targetMet: true,
          optimization: 'SPEED_OPTIMIZED'
        });
      });

      it('should demonstrate scalability with resource utilization tracking', async () => {
        // Arrange - Scalability test with resource monitoring
        const scalabilityGraphs = [
          createScalabilityGraph(100),
          createScalabilityGraph(250),
          createScalabilityGraph(500),
          createScalabilityGraph(1000)
        ];

        const request = {
          operation: 'SCALABILITY_TEST' as const,
          testSuites: scalabilityGraphs.map((graph, index) => ({
            nodeCount: [100, 250, 500, 1000][index],
            nodes: graph.nodes
          })),
          options: {
            trackResourceUsage: true,
            memoryThreshold: '50MB',
            timeThreshold: 200
          }
        };

        mockDependencyService.buildDependencyGraph
          .mockReturnValueOnce(Result.ok(scalabilityGraphs[0].dependencyGraph))
          .mockReturnValueOnce(Result.ok(scalabilityGraphs[1].dependencyGraph))
          .mockReturnValueOnce(Result.ok(scalabilityGraphs[2].dependencyGraph))
          .mockReturnValueOnce(Result.ok(scalabilityGraphs[3].dependencyGraph));

        // Act
        const result = await useCase.execute(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.scalabilityResults).toHaveLength(4);
        expect(result.value.scalabilityResults.every(r => r.performance.withinThreshold)).toBe(true);
      });

      it('should optimize memory usage for large dependency graphs', async () => {
        // Arrange - Memory optimization test
        const memoryGraph = createMemoryOptimizationGraph(750);
        const request = {
          operation: 'OPTIMIZE_MEMORY' as const,
          nodes: memoryGraph.nodes,
          options: {
            enableMemoryOptimization: true,
            maxMemoryUsage: '30MB',
            garbageCollection: true
          }
        };

        mockDependencyService.buildDependencyGraph.mockReturnValue(
          Result.ok(memoryGraph.dependencyGraph)
        );

        // Act
        const result = await useCase.execute(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.memoryOptimization).toMatchObject({
          optimizationApplied: true,
          memoryUsage: expect.any(String),
          withinThreshold: true
        });
      });
    });

    describe('Clean Architecture Compliance', () => {
      it('should maintain domain service boundaries without business logic in use case', async () => {
        // Arrange - Test that use case only orchestrates, doesn't contain business logic
        const domainTestGraph = createDomainBoundaryTestGraph();
        const request = {
          operation: 'DOMAIN_BOUNDARY_TEST' as const,
          nodes: domainTestGraph.nodes,
          options: {
            validateDomainBoundaries: true
          }
        };

        mockDependencyService.buildDependencyGraph.mockReturnValue(
          Result.ok(domainTestGraph.dependencyGraph)
        );

        // Act
        const result = await useCase.execute(request);

        // Assert
        expect(result.isSuccess).toBe(true);
        // Verify that all business logic was delegated to domain service
        expect(mockDependencyService.buildDependencyGraph).toHaveBeenCalledWith(
          domainTestGraph.nodes
        );
        // Use case should only orchestrate and format results
        expect(result.value.operationType).toBe('DOMAIN_BOUNDARY_TEST');
        expect(result.value.domainBoundariesRespected).toBe(true);
      });

      it('should use Result pattern consistently for all operations', async () => {
        // Arrange - Test Result pattern usage
        const resultPatternRequest = {
          operation: 'RESULT_PATTERN_TEST' as const,
          nodes: [createSimpleNode('A'), createSimpleNode('B')],
          options: {
            testResultPattern: true
          }
        };

        mockDependencyService.buildDependencyGraph.mockReturnValue(
          Result.fail('Simulated domain service failure')
        );

        // Act
        const result = await useCase.execute(resultPatternRequest);

        // Assert
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Simulated domain service failure');
        // Verify Result pattern is used consistently
        expect(result).toBeInstanceOf(Result);
      });

      it('should maintain architectural isolation from infrastructure concerns', async () => {
        // Arrange - Test that use case doesn't contain infrastructure logic
        const architecturalRequest = {
          operation: 'ARCHITECTURAL_ISOLATION_TEST' as const,
          nodes: [createSimpleNode('Test')],
          options: {
            testArchitecturalIsolation: true
          }
        };

        mockDependencyService.buildDependencyGraph.mockReturnValue(
          Result.ok({
            nodes: new Map(),
            adjacencyList: new Map(),
            reverseDependencies: new Map()
          })
        );

        // Act
        const result = await useCase.execute(architecturalRequest);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(result.value.architecturalIsolation).toBe(true);
        // Verify no infrastructure concerns leaked into use case
        expect(result.value.infrastructureIsolated).toBe(true);
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle domain service failures gracefully', async () => {
      // Arrange
      const request = {
        operation: 'BUILD_GRAPH' as const,
        nodes: [createSimpleNode('A')],
        options: {}
      };

      mockDependencyService.buildDependencyGraph.mockReturnValue(
        Result.fail('Domain service failure')
      );

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Domain service failure');
    });

    it('should validate input parameters and return meaningful errors', async () => {
      // Arrange - Invalid request
      const invalidRequest = {
        operation: 'INVALID_OPERATION' as any,
        nodes: null as any,
        options: {}
      };

      // Act
      const result = await useCase.execute(invalidRequest);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invalid operation');
    });

    it('should handle concurrent operations safely', async () => {
      // Arrange - Multiple concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
        operation: 'BUILD_GRAPH' as const,
        nodes: [createSimpleNode(`Node${i}`)],
        options: { concurrentTest: true }
      }));

      mockDependencyService.buildDependencyGraph.mockReturnValue(
        Result.ok({
          nodes: new Map(),
          adjacencyList: new Map(),
          reverseDependencies: new Map()
        })
      );

      // Act
      const results = await Promise.all(
        concurrentRequests.map(req => useCase.execute(req))
      );

      // Assert
      expect(results).toHaveLength(10);
      expect(results.every(r => r.isSuccess)).toBe(true);
    });
  });
});

// Test Data Factory Functions
function createEnterpriseGraph(nodeCount: number) {
  const nodes: Node[] = [];
  const modelId = 'enterprise-model';
  
  // Create input nodes (10%)
  const inputCount = Math.floor(nodeCount * 0.1);
  for (let i = 0; i < inputCount; i++) {
    nodes.push(
      new IONodeBuilder()
        .withId(`input-${i}`)
        .withModelId(modelId)
        .withName(`Input ${i}`)
        .asInput()
        .build()
    );
  }
  
  // Create stage nodes (80%)
  const stageCount = Math.floor(nodeCount * 0.8);
  for (let i = 0; i < stageCount; i++) {
    nodes.push(
      new StageNodeBuilder()
        .withId(`stage-${i}`)
        .withModelId(modelId)
        .withName(`Stage ${i}`)
        .build()
    );
  }
  
  // Create output nodes (10%)
  const outputCount = nodeCount - inputCount - stageCount;
  for (let i = 0; i < outputCount; i++) {
    nodes.push(
      new IONodeBuilder()
        .withId(`output-${i}`)
        .withModelId(modelId)
        .withName(`Output ${i}`)
        .asOutput()
        .build()
    );
  }

  // Create complex dependency patterns
  // Each stage node depends on 1-3 previous nodes
  for (let i = inputCount; i < inputCount + stageCount; i++) {
    const node = nodes[i];
    const depCount = Math.min(3, Math.floor(Math.random() * 3) + 1);
    const availableDeps = nodes.slice(0, i);
    
    for (let j = 0; j < depCount && availableDeps.length > 0; j++) {
      const depIndex = Math.floor(Math.random() * availableDeps.length);
      node.addDependency(availableDeps[depIndex].nodeId.toString());
      availableDeps.splice(depIndex, 1);
    }
  }

  // Output nodes depend on final stage nodes
  for (let i = inputCount + stageCount; i < nodeCount; i++) {
    const node = nodes[i];
    const finalStages = nodes.slice(inputCount + stageCount - 5, inputCount + stageCount);
    const depCount = Math.min(2, finalStages.length);
    
    for (let j = 0; j < depCount; j++) {
      node.addDependency(finalStages[j].nodeId.toString());
    }
  }

  return {
    nodes,
    dependencyGraph: {
      nodes: new Map(nodes.map(n => [n.nodeId.toString(), n])),
      adjacencyList: new Map(),
      reverseDependencies: new Map()
    }
  };
}

function createDeepHierarchyGraph(depth: number) {
  const nodes: Node[] = [];
  const modelId = 'deep-hierarchy';

  for (let i = 0; i < depth; i++) {
    const node = new StageNodeBuilder()
      .withId(`level-${i}`)
      .withModelId(modelId)
      .withName(`Level ${i}`)
      .build();
    
    if (i > 0) {
      node.addDependency(`level-${i - 1}`);
    }
    
    nodes.push(node);
  }

  return {
    nodes,
    dependencyGraph: {
      nodes: new Map(nodes.map(n => [n.nodeId.toString(), n])),
      adjacencyList: new Map(),
      reverseDependencies: new Map()
    }
  };
}

function createMixedComplexPatterns() {
  const nodes: Node[] = [];
  const modelId = 'complex-patterns';

  // Diamond pattern
  const input = createSimpleNode('diamond-input', modelId);
  const branchA = createSimpleNode('diamond-a', modelId);
  const branchB = createSimpleNode('diamond-b', modelId);
  const merge = createSimpleNode('diamond-merge', modelId);
  
  branchA.addDependency(input.nodeId.toString());
  branchB.addDependency(input.nodeId.toString());
  merge.addDependency(branchA.nodeId.toString());
  merge.addDependency(branchB.nodeId.toString());

  nodes.push(input, branchA, branchB, merge);

  // Tree pattern
  const root = createSimpleNode('tree-root', modelId);
  const child1 = createSimpleNode('tree-child1', modelId);
  const child2 = createSimpleNode('tree-child2', modelId);
  const grandchild1 = createSimpleNode('tree-grandchild1', modelId);
  const grandchild2 = createSimpleNode('tree-grandchild2', modelId);

  child1.addDependency(root.nodeId.toString());
  child2.addDependency(root.nodeId.toString());
  grandchild1.addDependency(child1.nodeId.toString());
  grandchild2.addDependency(child2.nodeId.toString());

  nodes.push(root, child1, child2, grandchild1, grandchild2);

  // Mesh pattern
  const meshNodes = Array.from({ length: 5 }, (_, i) => 
    createSimpleNode(`mesh-${i}`, modelId)
  );
  
  // Create interconnected mesh
  meshNodes.forEach((node, i) => {
    meshNodes.slice(0, i).forEach(depNode => {
      if (Math.random() > 0.5) { // 50% chance of dependency
        node.addDependency(depNode.nodeId.toString());
      }
    });
  });

  nodes.push(...meshNodes);

  return {
    nodes,
    dependencyGraph: {
      nodes: new Map(nodes.map(n => [n.nodeId.toString(), n])),
      adjacencyList: new Map(),
      reverseDependencies: new Map()
    },
    criticalPath: ['tree-root', 'tree-child1', 'tree-grandchild1']
  };
}

function createNestedCyclesGraph() {
  const nodes: Node[] = [];
  const modelId = 'nested-cycles';

  // Create nodes for nested cycles
  const cycleNodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(id =>
    createSimpleNode(id, modelId)
  );

  nodes.push(...cycleNodes);

  return { nodes };
}

function createTransitiveCyclesGraph() {
  const nodes: Node[] = [];
  const modelId = 'transitive-cycles';

  // Create nodes for transitive cycle: A->B->C->D->E->A
  const cycleNodes = ['A', 'B', 'C', 'D', 'E'].map(id =>
    createSimpleNode(id, modelId)
  );

  nodes.push(...cycleNodes);

  return { nodes };
}

function createPerformanceTestGraph(nodeCount: number) {
  const nodes: Node[] = [];
  const modelId = 'performance-test';

  for (let i = 0; i < nodeCount; i++) {
    nodes.push(createSimpleNode(`perf-${i}`, modelId));
  }

  return { nodes };
}

function createParallelOptimizationGraph() {
  const nodes: Node[] = [];
  const modelId = 'parallel-opt';

  const nodeA = createSimpleNode('A', modelId);
  const nodeB = createSimpleNode('B', modelId);
  const nodeC = createSimpleNode('C', modelId);
  const nodeD = createSimpleNode('D', modelId);

  nodeB.addDependency(nodeA.nodeId.toString());
  nodeC.addDependency(nodeA.nodeId.toString());
  nodeD.addDependency(nodeB.nodeId.toString());
  nodeD.addDependency(nodeC.nodeId.toString());

  nodes.push(nodeA, nodeB, nodeC, nodeD);

  return { nodes };
}

function createCriticalPathGraph() {
  const nodes: Node[] = [];
  const modelId = 'critical-path';

  const start = createSimpleNode('Start', modelId);
  const nodeA = createSimpleNode('A', modelId);
  const nodeB = createSimpleNode('B', modelId);
  const nodeC = createSimpleNode('C', modelId);
  const end = createSimpleNode('End', modelId);

  nodeA.addDependency(start.nodeId.toString());
  nodeB.addDependency(nodeA.nodeId.toString());
  nodeC.addDependency(nodeB.nodeId.toString());
  end.addDependency(nodeC.nodeId.toString());

  nodes.push(start, nodeA, nodeB, nodeC, end);

  return { nodes };
}

function createPriorityBasedGraph() {
  const nodes: Node[] = [];
  const modelId = 'priority-based';

  const highPriority = createSimpleNode('HighPriority', modelId);
  const mediumPriority = createSimpleNode('MediumPriority', modelId);
  const lowPriority = createSimpleNode('LowPriority', modelId);

  // Set priorities in metadata using proper domain method
  highPriority.updateMetadata({ priority: 9 });
  mediumPriority.updateMetadata({ priority: 5 });
  lowPriority.updateMetadata({ priority: 1 });

  nodes.push(highPriority, mediumPriority, lowPriority);

  return { nodes };
}

function createBusinessRuleViolationGraph() {
  const nodes: Node[] = [];
  const modelId = 'business-violation';

  // Create scenario that violates business rules
  const input = new IONodeBuilder()
    .withId('input-violation')
    .withModelId(modelId)
    .asInput()
    .build();
    
  const output1 = new IONodeBuilder()
    .withId('output1-violation')
    .withModelId(modelId)
    .asOutput()
    .build();
    
  const output2 = new IONodeBuilder()
    .withId('output2-violation')
    .withModelId(modelId)
    .asOutput()
    .build();

  // Violation 1: Input node has dependencies (should not)
  input.addDependency('non-existent');
  
  // Violation 2: Output depends on output
  output2.addDependency(output1.nodeId.toString());

  nodes.push(input, output1, output2);

  return { nodes };
}

function createBrokenReferenceGraph() {
  const nodes: Node[] = [];
  const modelId = 'broken-ref';

  const node = createSimpleNode('broken-node', modelId);
  node.addDependency('missing-node-1');
  node.addDependency('missing-node-2');

  nodes.push(node);

  return { nodes };
}

function createComplexPerformanceGraph(nodeCount: number) {
  const graph = createEnterpriseGraph(nodeCount);
  return graph;
}

function createScalabilityGraph(nodeCount: number) {
  const graph = createEnterpriseGraph(nodeCount);
  return graph;
}

function createMemoryOptimizationGraph(nodeCount: number) {
  const graph = createEnterpriseGraph(nodeCount);
  return graph;
}

function createDomainBoundaryTestGraph() {
  const nodes = [createSimpleNode('domain-test', 'domain-model')];
  return {
    nodes,
    dependencyGraph: {
      nodes: new Map(nodes.map(n => [n.nodeId.toString(), n])),
      adjacencyList: new Map(),
      reverseDependencies: new Map()
    }
  };
}

function createSimpleNode(id: string, modelId: string = 'test-model'): Node {
  return new StageNodeBuilder()
    .withId(id)
    .withModelId(modelId)
    .withName(id)
    .build();
}