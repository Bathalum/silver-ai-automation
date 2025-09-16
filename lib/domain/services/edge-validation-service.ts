import { NodeId } from '../value-objects/node-id';
import { NodeLink } from '../entities/node-link';
import { Node } from '../entities/node';
import { ActionNode } from '../entities/action-node';
import { IONode } from '../entities/io-node';
import { Result } from '../shared/result';
import { ContainerNodeType } from '../enums';

// Handle types for connection validation - aligned with React Flow handle positions
export type HandleType = 'left' | 'right' | 'top' | 'bottom' | 'container-in' | 'container-out';

// Valid handle combinations
const VALID_HANDLES: HandleType[] = ['left', 'right', 'top', 'bottom', 'container-in', 'container-out'];
const SIBLING_HANDLES: HandleType[] = ['left', 'right'];
const VERTICAL_HANDLES: HandleType[] = ['top', 'bottom'];
const CONTAINER_HANDLES: HandleType[] = ['container-in', 'container-out'];

// Connection validation parameters
export interface ConnectionValidationParams {
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
  sourceHandle: HandleType;
  targetHandle: HandleType;
  sourceNodeType: ContainerNodeType | 'actionNode';
  targetNodeType: ContainerNodeType | 'actionNode';
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * EdgeValidationService enforces business rules for node connections in the Function Model workflow.
 * 
 * Key Responsibilities:
 * 1. Validate connection compatibility between different node types
 * 2. Enforce handle usage rules (sibling vs parent-child relationships)
 * 3. Detect and prevent circular dependencies
 * 4. Validate overall workflow structure integrity
 * 
 * Business Rules:
 * - Valid sibling connections (left/right handles): IO-to-IO, Stage-to-Stage, IO-to-Stage
 * - Valid parent-child connections (container handles): Action-to-Stage, Stage-to-Action
 * - Invalid connections: Action-to-Action, IO-to-Action (direct), self-connections
 * - Circular dependency prevention using graph traversal
 * - Workflow structure validation with comprehensive error/warning reporting
 */
export class EdgeValidationService {
  
  /**
   * Validates a proposed connection between two nodes based on business rules.
   * 
   * @param params Connection parameters including node IDs, types, and handles
   * @returns Result containing validation outcome with errors/warnings
   */
  public validateConnection(params: ConnectionValidationParams): Result<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Validate input parameters
      this.validateConnectionParams(params, result);
      
      // Validate node IDs
      this.validateNodeIds(params, result);
      
      // Validate handle types
      this.validateHandles(params, result);
      
      // Validate node type compatibility
      this.validateNodeTypeCompatibility(params, result);
      
      // Validate handle usage rules
      this.validateHandleUsage(params, result);
      
      // Add business rule warnings
      this.addBusinessRuleWarnings(params, result);

      // Final validation state
      result.isValid = result.errors.length === 0;

      return Result.ok(result);
      
    } catch (error) {
      return Result.fail(`Edge validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validates that a proposed connection would not create a circular dependency.
   * Uses depth-first search to detect cycles in the directed graph.
   * 
   * @param sourceId The source node ID for the proposed connection
   * @param targetId The target node ID for the proposed connection  
   * @param connections Existing connections in the workflow
   * @returns Result containing validation outcome
   */
  public validateCircularDependency(
    sourceId: NodeId,
    targetId: NodeId,
    connections: NodeLink[]
  ): Result<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Build adjacency list from existing connections
      const adjacencyList = new Map<string, string[]>();
      
      for (const connection of connections) {
        if (connection.sourceNodeId && connection.targetNodeId) {
          const sourceKey = connection.sourceNodeId.toString();
          const targetKey = connection.targetNodeId.toString();
          
          if (!adjacencyList.has(sourceKey)) {
            adjacencyList.set(sourceKey, []);
          }
          adjacencyList.get(sourceKey)!.push(targetKey);
        }
      }

      // Check if adding the new connection would create a cycle
      // We need to check if there's a path from targetId back to sourceId
      const visited = new Set<string>();
      const recursionStack = new Set<string>();
      
      const hasCycle = (nodeId: string): boolean => {
        if (recursionStack.has(nodeId)) {
          return true; // Back edge found - cycle detected
        }
        
        if (visited.has(nodeId)) {
          return false; // Already processed this node
        }
        
        visited.add(nodeId);
        recursionStack.add(nodeId);
        
        const neighbors = adjacencyList.get(nodeId) || [];
        for (const neighbor of neighbors) {
          if (hasCycle(neighbor)) {
            return true;
          }
        }
        
        recursionStack.delete(nodeId);
        return false;
      };

      // Temporarily add the proposed connection and check for cycles
      const sourceKey = sourceId.toString();
      const targetKey = targetId.toString();
      
      if (!adjacencyList.has(sourceKey)) {
        adjacencyList.set(sourceKey, []);
      }
      adjacencyList.get(sourceKey)!.push(targetKey);

      // Check if this creates a cycle by starting DFS from target
      if (hasCycle(targetKey)) {
        result.isValid = false;
        result.errors.push('Connection would create circular dependency');
      }

      return Result.ok(result);
      
    } catch (error) {
      return Result.fail(`Circular dependency validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validates the overall structure of a workflow including nodes, actions, and connections.
   * Provides comprehensive analysis with errors for critical issues and warnings for potential problems.
   * 
   * @param nodes Container nodes in the workflow (IO, Stage, etc.)
   * @param actionNodes Action nodes in the workflow
   * @param connections Links between nodes
   * @returns Result containing overall workflow validation
   */
  public validateWorkflowStructure(
    nodes: Node[],
    actionNodes: ActionNode[],
    connections: NodeLink[]
  ): Result<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Basic structure validation
      this.validateBasicWorkflowStructure(nodes, actionNodes, result);
      
      // Node-specific validations
      this.validateNodeStructure(nodes, actionNodes, connections, result);
      
      // Connection integrity
      this.validateConnectionIntegrity(nodes, actionNodes, connections, result);

      // Final validation state
      result.isValid = result.errors.length === 0;

      return Result.ok(result);
      
    } catch (error) {
      return Result.fail(`Workflow structure validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Private helper methods

  private validateConnectionParams(params: ConnectionValidationParams, result: ValidationResult): void {
    if (!params) {
      result.errors.push('Connection parameters are required');
      return;
    }

    if (!params.sourceNodeType || !params.targetNodeType) {
      result.errors.push('Node types must be specified');
    }
  }

  private validateNodeIds(params: ConnectionValidationParams, result: ValidationResult): void {
    if (!params.sourceNodeId) {
      result.errors.push('Invalid source node ID');
      return;
    }

    if (!params.targetNodeId) {
      result.errors.push('Invalid target node ID');
      return;
    }

    // Check for self-connections
    if (params.sourceNodeId.equals(params.targetNodeId)) {
      result.errors.push('Self-connections are not allowed');
    }
  }

  private validateHandles(params: ConnectionValidationParams, result: ValidationResult): void {
    if (!VALID_HANDLES.includes(params.sourceHandle)) {
      result.errors.push(`Invalid source handle: ${params.sourceHandle}`);
    }

    if (!VALID_HANDLES.includes(params.targetHandle)) {
      result.errors.push(`Invalid target handle: ${params.targetHandle}`);
    }
  }

  private validateNodeTypeCompatibility(params: ConnectionValidationParams, result: ValidationResult): void {
    const { sourceNodeType, targetNodeType } = params;

    // Check for unknown node types
    if (!this.isKnownNodeType(sourceNodeType)) {
      result.errors.push(`Unknown source node type: ${sourceNodeType}`);
      return;
    }

    if (!this.isKnownNodeType(targetNodeType)) {
      result.errors.push(`Unknown target node type: ${targetNodeType}`);
      return;
    }

    // Apply connection rules
    if (sourceNodeType === 'actionNode' && targetNodeType === 'actionNode') {
      result.errors.push('Action nodes cannot connect directly to other Action nodes');
    }

    if (sourceNodeType === ContainerNodeType.IO_NODE && targetNodeType === 'actionNode') {
      result.errors.push('IO nodes cannot connect directly to Action nodes');
    }

    if (sourceNodeType === 'actionNode' && targetNodeType === ContainerNodeType.IO_NODE) {
      result.errors.push('Action nodes cannot connect directly to IO nodes');
    }

    // Valid connections are:
    // - IO to IO (sibling)
    // - Stage to Stage (sibling)  
    // - IO to Stage (sibling)
    // - Stage to IO (sibling)
    // - Action to Stage (parent-child)
    // - Stage to Action (parent-child)
  }

  private validateHandleUsage(params: ConnectionValidationParams, result: ValidationResult): void {
    const { sourceNodeType, targetNodeType, sourceHandle, targetHandle } = params;

    const isStageToActionConnection = 
      sourceNodeType === ContainerNodeType.STAGE_NODE && targetNodeType === 'actionNode';

    const isActionToStageConnection = 
      sourceNodeType === 'actionNode' && targetNodeType === ContainerNodeType.STAGE_NODE;

    const isSiblingConnection = 
      (sourceNodeType === ContainerNodeType.IO_NODE && targetNodeType === ContainerNodeType.IO_NODE) ||
      (sourceNodeType === ContainerNodeType.STAGE_NODE && targetNodeType === ContainerNodeType.STAGE_NODE) ||
      (sourceNodeType === ContainerNodeType.IO_NODE && targetNodeType === ContainerNodeType.STAGE_NODE) ||
      (sourceNodeType === ContainerNodeType.STAGE_NODE && targetNodeType === ContainerNodeType.IO_NODE);

    if (isStageToActionConnection) {
      // Stage → Action: Stage uses bottom handle, Action uses top handle
      if (sourceHandle !== 'bottom') {
        result.errors.push('Stage to Action connections must use bottom handle on Stage node');
      }
      if (targetHandle !== 'top') {
        result.errors.push('Stage to Action connections must use top handle on Action node');
      }
    } else if (isActionToStageConnection) {
      // Action → Stage: Action uses right handle, Stage uses left handle  
      if (sourceHandle !== 'right') {
        result.errors.push('Action to Stage connections must use right handle on Action node');
      }
      if (targetHandle !== 'left') {
        result.errors.push('Action to Stage connections must use left handle on Stage node');
      }
    } else if (isSiblingConnection) {
      // Sibling connections must use left/right handles
      if (!SIBLING_HANDLES.includes(sourceHandle) || !SIBLING_HANDLES.includes(targetHandle)) {
        result.errors.push('Sibling connections must use left/right handles');
      }
    }
  }

  private addBusinessRuleWarnings(params: ConnectionValidationParams, result: ValidationResult): void {
    const { sourceNodeType, targetNodeType } = params;

    // Warn about input-to-input connections
    if (sourceNodeType === ContainerNodeType.IO_NODE && targetNodeType === ContainerNodeType.IO_NODE) {
      // This would require checking the actual IO node boundary types, 
      // but we'll add a general warning for potential design issues
      result.warnings.push('Input to input connections may indicate design issue');
    }
  }

  private isKnownNodeType(nodeType: ContainerNodeType | 'actionNode'): boolean {
    return nodeType === ContainerNodeType.IO_NODE || 
           nodeType === ContainerNodeType.STAGE_NODE || 
           nodeType === 'actionNode';
  }

  private validateBasicWorkflowStructure(nodes: Node[], actionNodes: ActionNode[], result: ValidationResult): void {
    // Must have at least one node
    if (nodes.length === 0 && actionNodes.length === 0) {
      result.errors.push('Workflow must contain at least one node');
      return;
    }

    // Warn about insufficient complexity
    if (nodes.length < 2) {
      result.warnings.push('Workflow has insufficient nodes for meaningful processing');
    }
  }

  private validateNodeStructure(nodes: Node[], actionNodes: ActionNode[], connections: NodeLink[], result: ValidationResult): void {
    // Validate action node parent relationships
    for (const actionNode of actionNodes) {
      const parentExists = nodes.some(node => node.nodeId.equals(actionNode.parentNodeId));
      if (!parentExists) {
        result.warnings.push(`Action node "${actionNode.name}" parent not found in workflow`);
      }
    }

    // Validate IO node dependencies for output nodes
    for (const node of nodes) {
      if (node instanceof IONode && node.ioData.boundaryType === 'output') {
        const hasInputDependencies = connections.some(conn => 
          conn.targetNodeId?.equals(node.nodeId)
        );
        if (!hasInputDependencies) {
          result.warnings.push(`Output node "${node.name}" has no input dependencies`);
        }
      }
    }
  }

  private validateConnectionIntegrity(nodes: Node[], actionNodes: ActionNode[], connections: NodeLink[], result: ValidationResult): void {
    // Validate that all connection endpoints exist
    const allNodeIds = new Set([
      ...nodes.map(n => n.nodeId.toString()),
      ...actionNodes.map(a => a.actionId.toString())
    ]);

    for (const connection of connections) {
      if (connection.sourceNodeId && !allNodeIds.has(connection.sourceNodeId.toString())) {
        result.errors.push(`Connection references non-existent source node: ${connection.sourceNodeId.toString()}`);
      }

      if (connection.targetNodeId && !allNodeIds.has(connection.targetNodeId.toString())) {
        result.errors.push(`Connection references non-existent target node: ${connection.targetNodeId.toString()}`);
      }
    }
  }
}