import { Node } from '../entities/node';
import { ActionNode } from '../entities/action-node';
import { IONode } from '../entities/io-node';
import { StageNode } from '../entities/stage-node';
import { TetherNode } from '../entities/tether-node';
import { KBNode } from '../entities/kb-node';
import { FunctionModelContainerNode } from '../entities/function-model-container-node';
import { ValidationResult } from '../entities/function-model';
import { ContainerNodeType, ActionNodeType, ExecutionMode } from '../enums';
import { Result } from '../shared/result';

export class NodeBusinessRules {
  public static validateNodeType(node: Node | ActionNode): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (node instanceof Node) {
      const result = NodeBusinessRules.validateContainerNode(node);
      if (result.isFailure) {
        return result;
      }
      const validation = result.value;
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    } else if (node instanceof ActionNode) {
      const result = NodeBusinessRules.validateActionNode(node);
      if (result.isFailure) {
        return result;
      }
      const validation = result.value;
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  public static validateDependencies(node: Node, allNodes: Node[]): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const nodeMap = new Map(allNodes.map(n => [n.nodeId.toString(), n]));

    // Validate all dependencies exist
    for (const dependency of node.dependencies) {
      const depId = dependency.toString();
      if (!nodeMap.has(depId)) {
        errors.push(`Node "${node.name}" depends on non-existent node: ${depId}`);
      }
    }

    // Validate dependency types make sense
    const dependencyNodes = node.dependencies
      .map(dep => nodeMap.get(dep.toString()))
      .filter(n => n !== undefined) as Node[];

    if (node instanceof IONode && node.ioData.boundaryType === 'input') {
      // Input IO nodes should generally not have dependencies
      if (dependencyNodes.length > 0) {
        warnings.push(`Input IO node "${node.name}" has dependencies, which may indicate incorrect flow direction`);
      }
    }

    if (node instanceof IONode && node.ioData.boundaryType === 'output') {
      // Output IO nodes should generally have dependencies
      if (dependencyNodes.length === 0) {
        warnings.push(`Output IO node "${node.name}" has no dependencies and may be unreachable`);
      }
    }

    // Validate stage dependencies
    if (node instanceof StageNode) {
      const ioNodeDependencies = dependencyNodes.filter(dep => dep instanceof IONode);
      const stageNodeDependencies = dependencyNodes.filter(dep => dep instanceof StageNode);

      // Stages depending on output IO nodes might indicate incorrect modeling
      const outputIODeps = ioNodeDependencies.filter(io => 
        (io as IONode).ioData.boundaryType === 'output'
      );
      if (outputIODeps.length > 0) {
        warnings.push(`Stage "${node.name}" depends on output IO nodes, consider restructuring workflow`);
      }

      // Too many dependencies might indicate the stage should be split
      if (dependencyNodes.length > 5) {
        warnings.push(`Stage "${node.name}" has many dependencies (${dependencyNodes.length}), consider breaking into smaller stages`);
      }
    }

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  public static validateActionNodePlacement(
    actionNode: ActionNode, 
    parentNode: Node,
    siblingActionNodes: ActionNode[]
  ): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate parent node is a container type
    const validContainerTypes = [ContainerNodeType.IO_NODE, ContainerNodeType.STAGE_NODE];
    if (!validContainerTypes.includes(parentNode.getNodeType() as ContainerNodeType)) {
      errors.push(`Action node "${actionNode.name}" cannot be placed in non-container node "${parentNode.name}"`);
    }

    // Validate execution order uniqueness
    const duplicateOrders = siblingActionNodes.filter(sibling => 
      sibling.executionOrder === actionNode.executionOrder && 
      !sibling.equals(actionNode)
    );
    if (duplicateOrders.length > 0) {
      errors.push(`Action node "${actionNode.name}" has duplicate execution order ${actionNode.executionOrder}`);
    }

    // Validate execution mode compatibility
    const parallelSiblings = siblingActionNodes.filter(sibling => 
      sibling.executionMode === ExecutionMode.PARALLEL && !sibling.equals(actionNode)
    );
    
    if (actionNode.executionMode === ExecutionMode.PARALLEL && parallelSiblings.length > 0) {
      // Check for priority conflicts
      const samePriorityNodes = parallelSiblings.filter(sibling => 
        sibling.priority === actionNode.priority
      );
      if (samePriorityNodes.length > 0) {
        warnings.push(`Parallel action node "${actionNode.name}" has same priority as other parallel nodes`);
      }
    }

    // Validate specific action type placements
    if (parentNode instanceof IONode) {
      const ioNode = parentNode as IONode;
      
      // KB nodes are generally better in Stage nodes for documentation
      if (actionNode instanceof KBNode) {
        warnings.push(`KB node "${actionNode.name}" in IO node "${parentNode.name}" - consider placing in a Stage node for better organization`);
      }

      // Tether nodes in input IO should be for data ingestion
      if (actionNode instanceof TetherNode && ioNode.ioData.boundaryType === 'output') {
        warnings.push(`Tether node "${actionNode.name}" in output IO node may indicate incorrect data flow`);
      }
    }

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  private static validateContainerNode(node: Node): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (node instanceof IONode) {
      // Validate IO node specific rules
      const ioNode = node as IONode;
      
      if (ioNode.ioData.boundaryType === 'input' && !ioNode.ioData.inputDataContract) {
        warnings.push(`Input IO node "${node.name}" has no input data contract defined`);
      }

      if (ioNode.ioData.boundaryType === 'output' && !ioNode.ioData.outputDataContract) {
        warnings.push(`Output IO node "${node.name}" has no output data contract defined`);
      }

      if (ioNode.ioData.boundaryType === 'input-output') {
        if (!ioNode.ioData.inputDataContract && !ioNode.ioData.outputDataContract) {
          warnings.push(`Bidirectional IO node "${node.name}" has no data contracts defined`);
        }
      }
    }

    if (node instanceof StageNode) {
      // Validate Stage node specific rules
      const stageNode = node as StageNode;
      
      if (!stageNode.stageData.stageGoals || stageNode.stageData.stageGoals.length === 0) {
        warnings.push(`Stage node "${node.name}" has no defined goals`);
      }

      if (stageNode.stageData.stageType === 'milestone' && node.dependencies.length === 0) {
        warnings.push(`Milestone stage "${node.name}" has no dependencies - milestones should mark completion of previous work`);
      }

      if (stageNode.stageData.parallelismConfig && stageNode.stageData.parallelismConfig.maxConcurrency > 10) {
        warnings.push(`Stage node "${node.name}" allows high concurrency (${stageNode.stageData.parallelismConfig.maxConcurrency}) - monitor resource usage`);
      }
    }

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  private static validateActionNode(actionNode: ActionNode): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Common validation for all action nodes
    if (actionNode.priority < 1 || actionNode.priority > 10) {
      errors.push(`Action node "${actionNode.name}" has invalid priority ${actionNode.priority} (must be 1-10)`);
    }

    if (actionNode.executionOrder < 1) {
      errors.push(`Action node "${actionNode.name}" has invalid execution order ${actionNode.executionOrder} (must be > 0)`);
    }

    if (actionNode.estimatedDuration !== undefined && actionNode.estimatedDuration <= 0) {
      errors.push(`Action node "${actionNode.name}" has invalid estimated duration ${actionNode.estimatedDuration}`);
    }

    // Validate RACI assignments
    if (actionNode.raci.responsible.length === 0) {
      errors.push(`Action node "${actionNode.name}" has no responsible parties assigned`);
    }

    // Specific validation by action type
    if (actionNode instanceof TetherNode) {
      const tetherNode = actionNode as TetherNode;
      
      if (!tetherNode.tetherData.tetherReferenceId) {
        errors.push(`Tether node "${actionNode.name}" has no tether reference ID`);
      }

      if (tetherNode.tetherData.executionTriggers.length === 0) {
        warnings.push(`Tether node "${actionNode.name}" has no execution triggers defined`);
      }

      const { resourceRequirements } = tetherNode.tetherData;
      if (resourceRequirements.timeout && resourceRequirements.timeout > 3600) {
        warnings.push(`Tether node "${actionNode.name}" has very long timeout (${resourceRequirements.timeout}s)`);
      }
    }

    if (actionNode instanceof KBNode) {
      const kbNode = actionNode as KBNode;
      
      if (!kbNode.kbData.kbReferenceId) {
        errors.push(`KB node "${actionNode.name}" has no KB reference ID`);
      }

      if (kbNode.kbData.searchKeywords.length === 0) {
        warnings.push(`KB node "${actionNode.name}" has no search keywords for AI agent discovery`);
      }

      if (kbNode.kbData.accessPermissions.view.length === 0) {
        warnings.push(`KB node "${actionNode.name}" has no view permissions defined`);
      }
    }

    if (actionNode instanceof FunctionModelContainerNode) {
      const containerNode = actionNode as FunctionModelContainerNode;
      
      if (!containerNode.containerData.nestedModelId) {
        errors.push(`Function model container "${actionNode.name}" has no nested model ID`);
      }

      if (containerNode.containerData.outputExtraction.extractedOutputs.length === 0) {
        warnings.push(`Function model container "${actionNode.name}" extracts no outputs from nested model`);
      }

      if (containerNode.containerData.executionPolicy.timeout && 
          containerNode.containerData.executionPolicy.timeout > 7200) {
        warnings.push(`Function model container "${actionNode.name}" has very long timeout (${containerNode.containerData.executionPolicy.timeout}s)`);
      }
    }

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }
}