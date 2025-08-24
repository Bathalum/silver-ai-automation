import { Node } from '../entities/node';
import { ActionNode } from '../entities/action-node';
import { IONode } from '../entities/io-node';
import { StageNode } from '../entities/stage-node';
import { FunctionModelContainerNode } from '../entities/function-model-container-node';
import { ValidationResult } from '../entities/function-model';
import { Result } from '../shared/result';

export class WorkflowValidationRules {
  public static validateNodeConnections(nodes: Node[]): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if all dependencies reference valid nodes
    const nodeIds = new Set(nodes.map(node => node.nodeId.toString()));
    
    for (const node of nodes) {
      for (const dependency of node.dependencies) {
        if (!nodeIds.has(dependency.toString())) {
          errors.push(`Node ${node.name} references non-existent dependency ${dependency.toString()}`);
        }
      }
    }

    // Check for orphaned nodes (nodes without any connections)
    const connectedNodes = new Set<string>();
    nodes.forEach(node => {
      node.dependencies.forEach(dep => connectedNodes.add(dep.toString()));
      connectedNodes.add(node.nodeId.toString());
    });

    const orphanedNodes = nodes.filter(node => 
      node.dependencies.length === 0 && 
      !nodes.some(other => other.dependencies.some(dep => dep.equals(node.nodeId)))
    );

    if (orphanedNodes.length > 1) {
      warnings.push(`Multiple isolated nodes detected: ${orphanedNodes.map(n => n.name).join(', ')}`);
    }

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  public static validateExecutionFlow(nodes: Node[], actionNodes: ActionNode[]): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Ensure IO nodes are properly positioned (input nodes should have no dependencies)
    const ioNodes = nodes.filter(node => node instanceof IONode) as IONode[];
    const inputNodes = ioNodes.filter(io => io.ioData.boundaryType === 'input' || io.ioData.boundaryType === 'input-output');
    const outputNodes = ioNodes.filter(io => io.ioData.boundaryType === 'output' || io.ioData.boundaryType === 'input-output');

    // Input nodes should generally have no dependencies
    const inputNodesWithDeps = inputNodes.filter(node => node.dependencies.length > 0);
    if (inputNodesWithDeps.length > 0) {
      warnings.push(`Input nodes with dependencies may indicate circular flow: ${inputNodesWithDeps.map(n => n.name).join(', ')}`);
    }

    // Output nodes should generally have dependencies
    const outputNodesWithoutDeps = outputNodes.filter(node => node.dependencies.length === 0);
    if (outputNodesWithoutDeps.length > 0) {
      warnings.push(`Output nodes without dependencies may be unreachable: ${outputNodesWithoutDeps.map(n => n.name).join(', ')}`);
    }

    // Validate action node execution orders within containers
    const actionsByContainer = new Map<string, ActionNode[]>();
    actionNodes.forEach(action => {
      const containerId = action.parentNodeId.toString();
      if (!actionsByContainer.has(containerId)) {
        actionsByContainer.set(containerId, []);
      }
      actionsByContainer.get(containerId)!.push(action);
    });

    actionsByContainer.forEach((actions, containerId) => {
      const containerNode = nodes.find(n => n.nodeId.toString() === containerId);
      const containerName = containerNode?.name || containerId;

      // Check for duplicate execution orders
      const orders = actions.map(a => a.executionOrder);
      const uniqueOrders = new Set(orders);
      if (orders.length !== uniqueOrders.size) {
        errors.push(`Container "${containerName}" has actions with duplicate execution orders`);
      }

      // Check for gaps in execution order (warning)
      const sortedOrders = Array.from(uniqueOrders).sort((a, b) => a - b);
      for (let i = 1; i < sortedOrders.length; i++) {
        if (sortedOrders[i] - sortedOrders[i - 1] > 1) {
          warnings.push(`Container "${containerName}" has gaps in execution order sequence`);
          break;
        }
      }

      // Validate parallel execution has proper priority settings
      const parallelActions = actions.filter(a => a.executionMode === 'parallel');
      const parallelPriorities = parallelActions.map(a => a.priority);
      const uniquePriorities = new Set(parallelPriorities);
      
      if (parallelActions.length > 1 && uniquePriorities.size === 1) {
        warnings.push(`Container "${containerName}" has multiple parallel actions with the same priority`);
      }
    });

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  public static validateCircularDependencies(nodes: Node[]): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const nodeMap = new Map(nodes.map(node => [node.nodeId.toString(), node]));

    const detectCycle = (nodeId: string, path: string[] = []): string[] | null => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle, return the cycle path
        const cycleStart = path.indexOf(nodeId);
        return path.slice(cycleStart).concat(nodeId);
      }

      if (visited.has(nodeId)) {
        return null; // Already processed this node
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      const currentPath = [...path, nodeId];

      const node = nodeMap.get(nodeId);
      if (node) {
        for (const dependency of node.dependencies) {
          const depId = dependency.toString();
          const cycle = detectCycle(depId, currentPath);
          if (cycle) {
            return cycle;
          }
        }
      }

      recursionStack.delete(nodeId);
      return null;
    };

    // Check each unvisited node for cycles
    for (const node of nodes) {
      const nodeId = node.nodeId.toString();
      if (!visited.has(nodeId)) {
        const cycle = detectCycle(nodeId);
        if (cycle) {
          const cycleNames = cycle.map(id => {
            const node = nodeMap.get(id);
            return node?.name || id;
          }).join(' -> ');
          errors.push(`Circular dependency detected: ${cycleNames}`);
        }
      }
    }

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  public static validateRequiredNodes(nodes: Node[]): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required node types
    const ioNodes = nodes.filter(node => node instanceof IONode);
    const stageNodes = nodes.filter(node => node instanceof StageNode);

    if (ioNodes.length === 0) {
      errors.push('Workflow must contain at least one IO node to define input/output boundaries');
    }

    if (stageNodes.length === 0) {
      warnings.push('Consider adding stage nodes to organize workflow into logical phases');
    }

    // Check for balanced input/output
    const inputBoundaries = ioNodes.filter(node => 
      (node as IONode).ioData.boundaryType === 'input' || 
      (node as IONode).ioData.boundaryType === 'input-output'
    );
    const outputBoundaries = ioNodes.filter(node => 
      (node as IONode).ioData.boundaryType === 'output' || 
      (node as IONode).ioData.boundaryType === 'input-output'
    );

    if (inputBoundaries.length === 0) {
      warnings.push('Workflow has no input boundaries - consider adding an input IO node');
    }

    if (outputBoundaries.length === 0) {
      warnings.push('Workflow has no output boundaries - consider adding an output IO node');
    }

    // Check for extremely complex workflows
    if (nodes.length > 50) {
      warnings.push('Large workflow detected - consider breaking into smaller, nested function models');
    }

    const maxDepth = WorkflowValidationRules.calculateMaxDependencyDepth(nodes);
    if (maxDepth > 10) {
      warnings.push('Deep dependency chain detected - consider restructuring for better maintainability');
    }

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  public static validateNestedModelReferences(
    actionNodes: ActionNode[], 
    currentModelId: string
  ): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const containerNodes = actionNodes.filter(node => 
      node instanceof FunctionModelContainerNode
    ) as FunctionModelContainerNode[];

    for (const containerNode of containerNodes) {
      const nestedModelId = containerNode.containerData.nestedModelId;
      
      // Check for self-reference
      if (nestedModelId === currentModelId) {
        errors.push(`Container node "${containerNode.name}" references the current model, creating infinite recursion`);
      }

      // Validate output extraction
      const extractedOutputs = containerNode.containerData.outputExtraction.extractedOutputs;
      if (extractedOutputs.length === 0) {
        warnings.push(`Container node "${containerNode.name}" extracts no outputs from nested model`);
      }

      // Validate context inheritance
      const inheritedContexts = containerNode.containerData.contextInheritance.inheritedContexts;
      const duplicateContexts = inheritedContexts.filter((context, index) => 
        inheritedContexts.indexOf(context) !== index
      );
      
      if (duplicateContexts.length > 0) {
        errors.push(`Container node "${containerNode.name}" has duplicate inherited contexts: ${duplicateContexts.join(', ')}`);
      }
    }

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  private static calculateMaxDependencyDepth(nodes: Node[]): number {
    const nodeMap = new Map(nodes.map(node => [node.nodeId.toString(), node]));
    const depthCache = new Map<string, number>();

    const calculateDepth = (nodeId: string, visited = new Set<string>()): number => {
      if (depthCache.has(nodeId)) {
        return depthCache.get(nodeId)!;
      }

      if (visited.has(nodeId)) {
        return 0; // Circular dependency, return 0 to avoid infinite recursion
      }

      const node = nodeMap.get(nodeId);
      if (!node || node.dependencies.length === 0) {
        depthCache.set(nodeId, 1);
        return 1;
      }

      visited.add(nodeId);
      const maxDepth = Math.max(
        ...node.dependencies.map(dep => calculateDepth(dep.toString(), visited))
      );
      visited.delete(nodeId);

      const depth = maxDepth + 1;
      depthCache.set(nodeId, depth);
      return depth;
    };

    return Math.max(...nodes.map(node => calculateDepth(node.nodeId.toString())));
  }
}