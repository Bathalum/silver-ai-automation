import { Node } from '../entities/node';
import { NodeId } from '../value-objects/node-id';
import { ValidationResult } from '../entities/function-model';
import { Result } from '../shared/result';

export interface DependencyGraph {
  nodes: Map<string, Node>;
  adjacencyList: Map<string, string[]>; // nodeId -> [dependentNodeIds]
  reverseDependencies: Map<string, string[]>; // nodeId -> [dependencyNodeIds]
}

export interface ExecutionPath {
  nodeId: string;
  level: number;
  dependencies: string[];
  canExecuteInParallel: boolean;
}

export class NodeDependencyService {
  public static validateAcyclicity(nodes: Node[]): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const graph = NodeDependencyService.buildDependencyGraph(nodes);
    const cycleResult = NodeDependencyService.detectCycles(graph);

    if (cycleResult.isFailure) {
      errors.push(cycleResult.error);
      return Result.ok<ValidationResult>({
        isValid: false,
        errors,
        warnings
      });
    }

    const cycles = cycleResult.value;
    if (cycles.length > 0) {
      cycles.forEach(cycle => {
        const cycleNames = cycle.map(nodeId => {
          const node = graph.nodes.get(nodeId);
          return node?.name || nodeId;
        });
        errors.push(`Circular dependency detected: ${cycleNames.join(' → ')} → ${cycleNames[0]}`);
      });
    }

    // Check for potential performance issues
    const maxDepth = NodeDependencyService.calculateMaxDepth(graph);
    if (maxDepth > 15) {
      warnings.push(`Deep dependency chain detected (${maxDepth} levels) - consider restructuring for better performance`);
    }

    const complexNodes = NodeDependencyService.findComplexNodes(graph);
    complexNodes.forEach(({ nodeId, dependencyCount, dependentCount }) => {
      const node = graph.nodes.get(nodeId);
      const nodeName = node?.name || nodeId;
      
      if (dependencyCount > 10) {
        warnings.push(`Node "${nodeName}" has many dependencies (${dependencyCount}) - consider breaking into smaller components`);
      }
      
      if (dependentCount > 10) {
        warnings.push(`Node "${nodeName}" is depended upon by many nodes (${dependentCount}) - ensure it's stable`);
      }
    });

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  public static calculateExecutionOrder(nodes: Node[]): Result<Node[]> {
    const graph = NodeDependencyService.buildDependencyGraph(nodes);
    
    // Check for cycles first
    const cycleResult = NodeDependencyService.detectCycles(graph);
    if (cycleResult.isFailure) {
      return Result.fail<Node[]>(cycleResult.error);
    }

    const cycles = cycleResult.value;
    if (cycles.length > 0) {
      return Result.fail<Node[]>('Cannot calculate execution order: circular dependencies detected');
    }

    // Perform topological sort
    const sortResult = NodeDependencyService.topologicalSort(graph);
    if (sortResult.isFailure) {
      return Result.fail<Node[]>(sortResult.error);
    }

    const sortedNodeIds = sortResult.value;
    const sortedNodes = sortedNodeIds.map(nodeId => graph.nodes.get(nodeId)!);

    return Result.ok<Node[]>(sortedNodes);
  }

  public static detectCircularDependencies(nodes: Node[]): Result<string[][]> {
    const graph = NodeDependencyService.buildDependencyGraph(nodes);
    return NodeDependencyService.detectCycles(graph);
  }

  public static optimizeExecutionPaths(nodes: Node[]): Result<ExecutionPath[]> {
    const graph = NodeDependencyService.buildDependencyGraph(nodes);
    
    // Calculate execution levels for parallel optimization
    const levels = NodeDependencyService.calculateExecutionLevels(graph);
    if (levels.isFailure) {
      return Result.fail<ExecutionPath[]>(levels.error);
    }

    const executionLevels = levels.value;
    const paths: ExecutionPath[] = [];

    // Create execution paths with parallel optimization hints
    Array.from(graph.nodes.keys()).forEach(nodeId => {
      const level = executionLevels.get(nodeId) || 0;
      const dependencies = graph.reverseDependencies.get(nodeId) || [];
      
      // Determine if this node can execute in parallel with others at the same level
      const nodesAtSameLevel = Array.from(executionLevels.entries())
        .filter(([_, nodeLevel]) => nodeLevel === level)
        .map(([id, _]) => id);
      
      const canExecuteInParallel = nodesAtSameLevel.length > 1 && 
        !NodeDependencyService.hasSharedDependencies(nodeId, nodesAtSameLevel, graph);

      paths.push({
        nodeId,
        level,
        dependencies: [...dependencies],
        canExecuteInParallel
      });
    });

    // Sort by execution level, then by priority (if available)
    paths.sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      
      // Secondary sort by node priority or dependency count
      const nodeA = graph.nodes.get(a.nodeId);
      const nodeB = graph.nodes.get(b.nodeId);
      
      if (nodeA && nodeB) {
        const priorityA = (nodeA.metadata?.priority as number) || 5;
        const priorityB = (nodeB.metadata?.priority as number) || 5;
        return priorityB - priorityA; // Higher priority first
      }
      
      return a.dependencies.length - b.dependencies.length;
    });

    return Result.ok<ExecutionPath[]>(paths);
  }

  public static findCriticalPath(nodes: Node[]): Result<string[]> {
    const graph = NodeDependencyService.buildDependencyGraph(nodes);
    
    // Find the longest path from any start node to any end node
    const startNodes = Array.from(graph.nodes.keys())
      .filter(nodeId => (graph.reverseDependencies.get(nodeId) || []).length === 0);
    
    const endNodes = Array.from(graph.nodes.keys())
      .filter(nodeId => (graph.adjacencyList.get(nodeId) || []).length === 0);

    let longestPath: string[] = [];
    let maxLength = 0;

    // Calculate longest path from each start node
    for (const startNode of startNodes) {
      const pathResult = NodeDependencyService.findLongestPath(startNode, graph);
      if (pathResult.isSuccess) {
        const path = pathResult.value;
        if (path.length > maxLength) {
          maxLength = path.length;
          longestPath = path;
        }
      }
    }

    if (longestPath.length === 0) {
      return Result.fail<string[]>('No critical path found - possible circular dependencies');
    }

    return Result.ok<string[]>(longestPath);
  }

  private static buildDependencyGraph(nodes: Node[]): DependencyGraph {
    const nodeMap = new Map(nodes.map(node => [node.nodeId.toString(), node]));
    const adjacencyList = new Map<string, string[]>();
    const reverseDependencies = new Map<string, string[]>();

    // Initialize adjacency lists
    nodes.forEach(node => {
      const nodeId = node.nodeId.toString();
      adjacencyList.set(nodeId, []);
      reverseDependencies.set(nodeId, []);
    });

    // Build adjacency lists
    nodes.forEach(node => {
      const nodeId = node.nodeId.toString();
      const dependencies = node.dependencies.map(dep => dep.toString());
      
      reverseDependencies.set(nodeId, dependencies);
      
      dependencies.forEach(depId => {
        const dependents = adjacencyList.get(depId) || [];
        dependents.push(nodeId);
        adjacencyList.set(depId, dependents);
      });
    });

    return {
      nodes: nodeMap,
      adjacencyList,
      reverseDependencies
    };
  }

  private static detectCycles(graph: DependencyGraph): Result<string[][]> {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        const cycle = path.slice(cycleStart);
        cycles.push([...cycle, nodeId]);
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const dependents = graph.adjacencyList.get(nodeId) || [];
      dependents.forEach(dependent => {
        dfs(dependent, [...path, nodeId]);
      });

      recursionStack.delete(nodeId);
    };

    Array.from(graph.nodes.keys()).forEach(nodeId => {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    });

    return Result.ok<string[][]>(cycles);
  }

  private static topologicalSort(graph: DependencyGraph): Result<string[]> {
    const inDegree = new Map<string, number>();
    const result: string[] = [];
    const queue: string[] = [];

    // Calculate in-degrees
    Array.from(graph.nodes.keys()).forEach(nodeId => {
      const dependencies = graph.reverseDependencies.get(nodeId) || [];
      inDegree.set(nodeId, dependencies.length);
      
      if (dependencies.length === 0) {
        queue.push(nodeId);
      }
    });

    // Process nodes with zero in-degree
    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      result.push(currentNode);

      const dependents = graph.adjacencyList.get(currentNode) || [];
      dependents.forEach(dependent => {
        const currentInDegree = inDegree.get(dependent) || 0;
        const newInDegree = currentInDegree - 1;
        inDegree.set(dependent, newInDegree);

        if (newInDegree === 0) {
          queue.push(dependent);
        }
      });
    }

    if (result.length !== graph.nodes.size) {
      return Result.fail<string[]>('Topological sort failed - circular dependencies detected');
    }

    return Result.ok<string[]>(result);
  }

  private static calculateExecutionLevels(graph: DependencyGraph): Result<Map<string, number>> {
    const levels = new Map<string, number>();
    const calculated = new Set<string>();

    const calculateLevel = (nodeId: string): number => {
      if (levels.has(nodeId)) {
        return levels.get(nodeId)!;
      }

      if (calculated.has(nodeId)) {
        // Circular dependency detected during level calculation
        return 0;
      }

      calculated.add(nodeId);

      const dependencies = graph.reverseDependencies.get(nodeId) || [];
      if (dependencies.length === 0) {
        levels.set(nodeId, 0);
        return 0;
      }

      const maxDependencyLevel = Math.max(
        ...dependencies.map(depId => calculateLevel(depId))
      );

      const nodeLevel = maxDependencyLevel + 1;
      levels.set(nodeId, nodeLevel);
      return nodeLevel;
    };

    try {
      Array.from(graph.nodes.keys()).forEach(nodeId => {
        calculateLevel(nodeId);
      });

      return Result.ok<Map<string, number>>(levels);
    } catch (error) {
      return Result.fail<Map<string, number>>('Failed to calculate execution levels');
    }
  }

  private static calculateMaxDepth(graph: DependencyGraph): number {
    const levelsResult = NodeDependencyService.calculateExecutionLevels(graph);
    if (levelsResult.isFailure) {
      return 0;
    }

    const levels = levelsResult.value;
    return Math.max(...Array.from(levels.values())) + 1;
  }

  private static findComplexNodes(graph: DependencyGraph): Array<{
    nodeId: string;
    dependencyCount: number;
    dependentCount: number;
  }> {
    const complexNodes: Array<{
      nodeId: string;
      dependencyCount: number;
      dependentCount: number;
    }> = [];

    Array.from(graph.nodes.keys()).forEach(nodeId => {
      const dependencyCount = (graph.reverseDependencies.get(nodeId) || []).length;
      const dependentCount = (graph.adjacencyList.get(nodeId) || []).length;

      if (dependencyCount > 5 || dependentCount > 5) {
        complexNodes.push({
          nodeId,
          dependencyCount,
          dependentCount
        });
      }
    });

    return complexNodes;
  }

  private static hasSharedDependencies(
    nodeId: string, 
    nodesAtSameLevel: string[], 
    graph: DependencyGraph
  ): boolean {
    const nodeDependencies = new Set(graph.reverseDependencies.get(nodeId) || []);
    
    return nodesAtSameLevel.some(otherNodeId => {
      if (otherNodeId === nodeId) return false;
      
      const otherDependencies = graph.reverseDependencies.get(otherNodeId) || [];
      return otherDependencies.some(dep => nodeDependencies.has(dep));
    });
  }

  private static findLongestPath(startNode: string, graph: DependencyGraph): Result<string[]> {
    const visited = new Set<string>();
    const currentPath: string[] = [];
    let longestPath: string[] = [];

    const dfs = (nodeId: string): void => {
      if (visited.has(nodeId)) {
        return; // Already processed this path
      }

      visited.add(nodeId);
      currentPath.push(nodeId);

      const dependents = graph.adjacencyList.get(nodeId) || [];
      if (dependents.length === 0) {
        // Leaf node - check if this is the longest path so far
        if (currentPath.length > longestPath.length) {
          longestPath = [...currentPath];
        }
      } else {
        dependents.forEach(dependent => {
          dfs(dependent);
        });
      }

      currentPath.pop();
      visited.delete(nodeId);
    };

    dfs(startNode);
    return Result.ok<string[]>(longestPath);
  }
}