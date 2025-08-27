import { Node } from '../entities/node';
import { ActionNode } from '../entities/action-node';
import { IONode } from '../entities/io-node';
import { StageNode } from '../entities/stage-node';
import { FunctionModelContainerNode } from '../entities/function-model-container-node';
import { ValidationResult } from '../entities/function-model';
import { Result } from '../shared/result';
import { IWorkflowValidationService } from '../../use-cases/function-model/validate-workflow-structure-use-case';

export class WorkflowStructuralValidationService implements IWorkflowValidationService {
  async validateStructuralIntegrity(nodes: Node[], actionNodes: ActionNode[]): Promise<Result<ValidationResult>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate node connectivity
      this.validateNodeConnectivity(nodes, errors, warnings);
      
      // Validate circular dependencies
      this.validateCircularDependencies(nodes, errors, warnings);
      
      // Validate orphaned nodes
      this.validateOrphanedNodes(nodes, errors, warnings);
      
      // Validate node reference integrity
      this.validateNodeReferenceIntegrity(nodes, errors, warnings);
      
      // Validate duplicate node IDs
      this.validateDuplicateNodeIds(nodes, errors, warnings);
      
      // Validate dependency chain consistency
      this.validateDependencyChainConsistency(nodes, errors, warnings);
      
      // Validate essential node types
      this.validateEssentialNodeTypes(nodes, errors, warnings);
      
      // Validate node type compatibility
      this.validateNodeTypeCompatibility(nodes, errors, warnings);
      
      // Validate workflow complexity
      this.validateWorkflowComplexity(nodes, errors, warnings);
      
      // Validate branch convergence patterns
      this.validateBranchConvergence(nodes, errors, warnings);
      
      // Validate dependency declarations
      this.validateDependencyDeclarations(nodes, errors, warnings);

      // Validate action node execution flow
      this.validateActionNodeExecutionFlow(actionNodes, errors, warnings);

      return Result.ok<ValidationResult>({
        isValid: errors.length === 0,
        errors,
        warnings
      });

    } catch (error) {
      return Result.fail<ValidationResult>(
        `Structural validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateNodeConnectivity(nodes: Node[], errors: string[], warnings: string[]): void {
    const nodeIds = new Set(nodes.map(node => node.nodeId.toString()));
    
    for (const node of nodes) {
      for (const dependency of node.dependencies) {
        if (!nodeIds.has(dependency.toString())) {
          errors.push(`Node ${node.name} references non-existent dependency ${dependency.toString()}`);
        }
      }
    }
  }

  private validateCircularDependencies(nodes: Node[], errors: string[], warnings: string[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const nodeMap = new Map(nodes.map(node => [node.nodeId.toString(), node]));

    const detectCycle = (nodeId: string, path: string[] = []): string[] | null => {
      if (recursionStack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId);
        return path.slice(cycleStart).concat(nodeId);
      }

      if (visited.has(nodeId)) {
        return null;
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
  }

  private validateOrphanedNodes(nodes: Node[], errors: string[], warnings: string[]): void {
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
  }

  private validateNodeReferenceIntegrity(nodes: Node[], errors: string[], warnings: string[]): void {
    // Already covered in validateNodeConnectivity, but could add more specific checks
    const nodeIds = new Set(nodes.map(node => node.nodeId.toString()));
    
    for (const node of nodes) {
      // Check for malformed node ID references
      for (const dependency of node.dependencies) {
        const depId = dependency.toString();
        if (depId.trim().length === 0) {
          errors.push(`Node ${node.name} has empty dependency reference`);
        } else if (!nodeIds.has(depId)) {
          errors.push(`Node ${node.name} references non-existent dependency ${depId}`);
        }
      }
    }
  }

  private validateDuplicateNodeIds(nodes: Node[], errors: string[], warnings: string[]): void {
    const nodeIdCounts = new Map<string, number>();
    
    for (const node of nodes) {
      const nodeId = node.nodeId.toString();
      nodeIdCounts.set(nodeId, (nodeIdCounts.get(nodeId) || 0) + 1);
    }

    for (const [nodeId, count] of nodeIdCounts.entries()) {
      if (count > 1) {
        errors.push(`Duplicate node ID detected: ${nodeId}`);
      }
    }
  }

  private validateDependencyChainConsistency(nodes: Node[], errors: string[], warnings: string[]): void {
    const maxDepth = this.calculateMaxDependencyDepth(nodes);
    if (maxDepth > 10) {
      warnings.push('Deep dependency chain detected - consider restructuring for better maintainability');
    }

    // Check for self-referential dependencies
    for (const node of nodes) {
      const nodeId = node.nodeId.toString();
      if (node.dependencies.some(dep => dep.toString() === nodeId)) {
        errors.push(`Node cannot depend on itself: ${node.name}`);
      }
    }
  }

  private validateEssentialNodeTypes(nodes: Node[], errors: string[], warnings: string[]): void {
    const ioNodes = nodes.filter(node => node instanceof IONode);
    const stageNodes = nodes.filter(node => node instanceof StageNode);

    if (ioNodes.length === 0) {
      errors.push('Workflow must contain at least one IO node to define input/output boundaries');
    }

    if (stageNodes.length === 0) {
      warnings.push('Consider adding stage nodes to organize workflow into logical phases');
    }

    if (nodes.length === 0) {
      errors.push('Empty workflow detected');
    }
  }

  private validateNodeTypeCompatibility(nodes: Node[], errors: string[], warnings: string[]): void {
    // Check for incompatible node type dependencies
    for (const node of nodes) {
      if (node instanceof IONode) {
        // IO nodes should not depend on stage nodes directly
        for (const depId of node.dependencies) {
          const depNode = nodes.find(n => n.nodeId.equals(depId));
          if (depNode instanceof StageNode) {
            errors.push(`Incompatible node types in dependency chain: IONode cannot depend on StageNode`);
          }
        }
      }
    }
  }

  private validateWorkflowComplexity(nodes: Node[], errors: string[], warnings: string[]): void {
    if (nodes.length > 50) {
      warnings.push('Large workflow detected - consider breaking into smaller, nested function models');
    }

    // Check for too many parallel branches
    const nodeConnectionCounts = new Map<string, number>();
    for (const node of nodes) {
      for (const dep of node.dependencies) {
        const depId = dep.toString();
        nodeConnectionCounts.set(depId, (nodeConnectionCounts.get(depId) || 0) + 1);
      }
    }

    const maxConnections = Math.max(...Array.from(nodeConnectionCounts.values()));
    if (maxConnections > 10) {
      warnings.push('High node fan-out detected - consider using stage nodes to group related operations');
    }
  }

  private validateBranchConvergence(nodes: Node[], errors: string[], warnings: string[]): void {
    // Check for multiple execution paths that don't converge
    const leafNodes = nodes.filter(node => 
      !nodes.some(other => other.dependencies.some(dep => dep.equals(node.nodeId)))
    );

    if (leafNodes.length > 3) {
      warnings.push('Multiple execution paths detected without convergence point');
    }
  }

  private validateDependencyDeclarations(nodes: Node[], errors: string[], warnings: string[]): void {
    for (const node of nodes) {
      for (const dependency of node.dependencies) {
        const depId = dependency.toString();
        
        // Check for malformed dependency format
        if (!depId.match(/^[a-zA-Z0-9-_]+$/)) {
          errors.push(`Malformed dependency declaration in node: invalid dependency format`);
        }
      }
    }
  }

  private validateActionNodeExecutionFlow(actionNodes: ActionNode[], errors: string[], warnings: string[]): void {
    // Group action nodes by container
    const actionsByContainer = new Map<string, ActionNode[]>();
    actionNodes.forEach(action => {
      const containerId = action.parentNodeId.toString();
      if (!actionsByContainer.has(containerId)) {
        actionsByContainer.set(containerId, []);
      }
      actionsByContainer.get(containerId)!.push(action);
    });

    actionsByContainer.forEach((actions, containerId) => {
      // Check for duplicate execution orders
      const orders = actions.map(a => a.executionOrder);
      const uniqueOrders = new Set(orders);
      if (orders.length !== uniqueOrders.size) {
        errors.push(`Container "${containerId}" has actions with duplicate execution orders`);
      }

      // Check for gaps in execution order
      const sortedOrders = Array.from(uniqueOrders).sort((a, b) => a - b);
      for (let i = 1; i < sortedOrders.length; i++) {
        if (sortedOrders[i] - sortedOrders[i - 1] > 1) {
          warnings.push(`Container "${containerId}" has gaps in execution order sequence`);
          break;
        }
      }
    });
  }

  private calculateMaxDependencyDepth(nodes: Node[]): number {
    const nodeMap = new Map(nodes.map(node => [node.nodeId.toString(), node]));
    const depthCache = new Map<string, number>();

    const calculateDepth = (nodeId: string, visited = new Set<string>()): number => {
      if (depthCache.has(nodeId)) {
        return depthCache.get(nodeId)!;
      }

      if (visited.has(nodeId)) {
        return 0;
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