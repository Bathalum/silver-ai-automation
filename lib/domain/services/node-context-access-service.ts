import { NodeId } from '../value-objects/node-id';
import { ActionNode } from '../entities/action-node';
import { TetherNode } from '../entities/tether-node';
import { KBNode } from '../entities/kb-node';
import { FunctionModelContainerNode } from '../entities/function-model-container-node';
import { Result } from '../shared/result';

export interface NodeContext {
  nodeId: NodeId;
  nodeType: string;
  parentNodeId?: NodeId;
  contextData: Record<string, any>;
  accessLevel: 'read' | 'write' | 'execute';
  hierarchyLevel: number;
}

export interface ContextAccessResult {
  context: NodeContext;
  accessGranted: boolean;
  accessReason: string;
}

export enum ContextAccessPattern {
  SIBLING = 'sibling',
  CHILD = 'child', 
  PARENT = 'parent',
  UNCLE_AUNT = 'uncle_aunt',
  DEEP_NESTING = 'deep_nesting'
}

/**
 * NodeContextAccessService manages hierarchical context access and sharing between nodes
 * across function model hierarchy following the domain specification patterns.
 */
export class NodeContextAccessService {
  private nodeHierarchy: Map<string, NodeContext> = new Map();
  private parentChildRelations: Map<string, string[]> = new Map();
  private siblingGroups: Map<string, string[]> = new Map();

  /**
   * Register a node in the context access system
   */
  public registerNode(
    nodeId: NodeId, 
    nodeType: string, 
    parentNodeId: NodeId | undefined,
    contextData: Record<string, any>,
    hierarchyLevel: number
  ): Result<void> {
    const nodeIdStr = nodeId.value;
    
    const nodeContext: NodeContext = {
      nodeId,
      nodeType,
      parentNodeId,
      contextData: { ...contextData },
      accessLevel: 'read',
      hierarchyLevel
    };

    this.nodeHierarchy.set(nodeIdStr, nodeContext);

    // Update parent-child relations
    if (parentNodeId) {
      const parentIdStr = parentNodeId.value;
      const children = this.parentChildRelations.get(parentIdStr) || [];
      children.push(nodeIdStr);
      this.parentChildRelations.set(parentIdStr, children);

      // Update sibling groups
      this.updateSiblingGroups(parentIdStr, nodeIdStr);
    }

    return Result.ok<void>(undefined);
  }

  /**
   * Get accessible contexts for a given node based on hierarchical access patterns
   */
  public getAccessibleContexts(requestingNodeId: NodeId): Result<ContextAccessResult[]> {
    const nodeIdStr = requestingNodeId.value;
    const requestingNode = this.nodeHierarchy.get(nodeIdStr);

    if (!requestingNode) {
      return Result.fail<ContextAccessResult[]>('Node not found in context system');
    }

    const accessibleContexts: ContextAccessResult[] = [];

    // 1. Sibling Access - Read-only context sharing between nodes at same hierarchical level
    const siblingAccess = this.getSiblingContexts(requestingNode);
    accessibleContexts.push(...siblingAccess);

    // 2. Child Access - Parents have write access to all their children
    if (this.hasChildren(requestingNode)) {
      const childAccess = this.getChildAccessContexts(requestingNode);
      accessibleContexts.push(...childAccess);
    }

    // 3. Parent Access - Children have read access to their parents
    if (requestingNode.parentNodeId) {
      const parentAccess = this.getParentContexts(requestingNode);
      accessibleContexts.push(...parentAccess);
    }

    // 4. Uncle/Aunt Access - Read-only lateral access for root cause analysis
    const uncleAuntAccess = this.getUncleAuntContexts(requestingNode);
    accessibleContexts.push(...uncleAuntAccess);

    // 5. Deep Nesting - Cascading access through multi-level function model hierarchy
    const deepNestingAccess = this.getDeepNestingContexts(requestingNode);
    accessibleContexts.push(...deepNestingAccess);
    return Result.ok<ContextAccessResult[]>(accessibleContexts);
  }

  /**
   * Get specific context data for a node with access validation
   */
  public getNodeContext(
    requestingNodeId: NodeId, 
    targetNodeId: NodeId, 
    requestedAccess: 'read' | 'write' | 'execute' = 'read'
  ): Result<NodeContext> {
    const targetContext = this.nodeHierarchy.get(targetNodeId.value);
    if (!targetContext) {
      return Result.fail<NodeContext>('Access denied: Target node not found');
    }

    // Allow self-access - a node can always access its own context
    if (requestingNodeId.equals(targetNodeId)) {
      return Result.ok<NodeContext>({
        ...targetContext,
        contextData: { ...targetContext.contextData }
      });
    }

    const accessResult = this.validateAccess(requestingNodeId, targetNodeId, requestedAccess);
    if (accessResult.isFailure) {
      return Result.fail<NodeContext>(accessResult.error);
    }

    return Result.ok<NodeContext>({
      ...targetContext,
      contextData: { ...targetContext.contextData }
    });
  }

  /**
   * Update context data for a node (with write permission validation)
   */
  public updateNodeContext(
    updatingNodeId: NodeId,
    targetNodeId: NodeId,
    newContextData: Record<string, any>
  ): Result<void> {
    const targetContext = this.nodeHierarchy.get(targetNodeId.value);
    if (!targetContext) {
      return Result.fail<void>('Access denied: Target node not found');
    }

    // Allow self-update - a node can always update its own context
    if (updatingNodeId.equals(targetNodeId)) {
      targetContext.contextData = { ...newContextData };
      this.nodeHierarchy.set(targetNodeId.value, targetContext);
      return Result.ok<void>(undefined);
    }

    const accessResult = this.validateAccess(updatingNodeId, targetNodeId, 'write');
    if (accessResult.isFailure) {
      return Result.fail<void>(accessResult.error);
    }

    targetContext.contextData = { ...newContextData };
    this.nodeHierarchy.set(targetNodeId.value, targetContext);

    return Result.ok<void>(undefined);
  }

  /**
   * Extract action node specific context based on type
   */
  public extractActionNodeContext(actionNode: ActionNode): Record<string, any> {
    const baseContext = {
      actionId: actionNode.actionId?.value || 'unknown',
      name: actionNode.name,
      description: actionNode.description,
      executionMode: actionNode.executionMode,
      status: actionNode.status,
      priority: actionNode.priority,
      raci: actionNode.raci
    };

    // Type-specific context extraction
    if (actionNode instanceof TetherNode) {
      const config = actionNode.configuration;
      return {
        ...baseContext,
        type: 'TetherNode',
        tetherReferenceId: config?.tetherReferenceId,
        executionParameters: config?.executionParameters,
        outputMapping: config?.outputMapping,
        resourceRequirements: config?.resourceRequirements,
        integrationConfig: config?.integrationConfig
      };
    }

    if (actionNode instanceof KBNode) {
      const config = actionNode.configuration;
      return {
        ...baseContext,
        type: 'KBNode',
        kbReferenceId: config?.kbReferenceId,
        shortDescription: config?.shortDescription,
        documentationContext: config?.documentationContext,
        searchKeywords: config?.searchKeywords,
        accessPermissions: config?.accessPermissions
      };
    }

    if (actionNode instanceof FunctionModelContainerNode) {
      const containerData = actionNode.containerData;
      return {
        ...baseContext,
        type: 'FunctionModelContainer',
        nestedModelId: containerData?.nestedModelId,
        contextMapping: containerData?.contextMapping,
        outputExtraction: containerData?.outputExtraction,
        executionPolicy: containerData?.executionPolicy,
        orchestrationMode: containerData?.orchestrationMode
      };
    }

    return baseContext;
  }

  private getSiblingContexts(requestingNode: NodeContext): ContextAccessResult[] {
    const results: ContextAccessResult[] = [];
    
    if (!requestingNode.parentNodeId) return results;

    const siblings = this.siblingGroups.get(requestingNode.parentNodeId.value) || [];
    
    for (const siblingIdStr of siblings) {
      if (siblingIdStr === requestingNode.nodeId.value) continue;

      const siblingContext = this.nodeHierarchy.get(siblingIdStr);
      if (siblingContext) {
        results.push({
          context: siblingContext,
          accessGranted: true,
          accessReason: 'Sibling read-only access pattern'
        });
      }
    }

    return results;
  }

  private getChildAccessContexts(requestingNode: NodeContext): ContextAccessResult[] {
    const results: ContextAccessResult[] = [];
    const children = this.parentChildRelations.get(requestingNode.nodeId.value) || [];

    for (const childIdStr of children) {
      const childContext = this.nodeHierarchy.get(childIdStr);
      if (childContext) {
        // Parent has write access to all child contexts
        results.push({
          context: { ...childContext, accessLevel: 'write' as const },
          accessGranted: true,
          accessReason: 'Parent write access to child context'
        });

        // Include all descendants with write access
        const descendants = this.getAllDescendants(childIdStr);
        for (const descendantId of descendants) {
          const descendantContext = this.nodeHierarchy.get(descendantId);
          if (descendantContext) {
            results.push({
              context: { ...descendantContext, accessLevel: 'write' as const },
              accessGranted: true,
              accessReason: 'Parent hierarchical write access to descendant'
            });
          }
        }
      }
    }

    return results;
  }

  private getParentContexts(requestingNode: NodeContext): ContextAccessResult[] {
    const results: ContextAccessResult[] = [];
    
    if (!requestingNode.parentNodeId) return results;

    const parentContext = this.nodeHierarchy.get(requestingNode.parentNodeId.value);
    if (parentContext) {
      results.push({
        context: { ...parentContext, accessLevel: 'read' },
        accessGranted: true,
        accessReason: 'Child read access to parent context'
      });
    }

    return results;
  }

  private getUncleAuntContexts(requestingNode: NodeContext): ContextAccessResult[] {
    const results: ContextAccessResult[] = [];
    
    if (!requestingNode.parentNodeId) return results;

    const parentContext = this.nodeHierarchy.get(requestingNode.parentNodeId.value);
    if (!parentContext?.parentNodeId) return results;

    // Get parent's siblings (uncles/aunts)
    const uncleAunts = this.siblingGroups.get(parentContext.parentNodeId.value) || [];
    
    for (const uncleAuntId of uncleAunts) {
      if (uncleAuntId === requestingNode.parentNodeId.value) continue;

      const uncleAuntContext = this.nodeHierarchy.get(uncleAuntId);
      if (uncleAuntContext) {
        results.push({
          context: uncleAuntContext,
          accessGranted: true,
          accessReason: 'Uncle/Aunt lateral read-only access for root cause analysis'
        });
      }
    }

    return results;
  }

  private getDeepNestingContexts(requestingNode: NodeContext): ContextAccessResult[] {
    const results: ContextAccessResult[] = [];

    // For deep nesting, traverse up the hierarchy and apply cascading access
    let currentNodeId = requestingNode.parentNodeId?.value;
    let nestingLevel = 1;

    while (currentNodeId && nestingLevel <= 10) { // Prevent infinite loops
      const currentContext = this.nodeHierarchy.get(currentNodeId);
      if (!currentContext) break;

      results.push({
        context: { 
          ...currentContext, 
          accessLevel: nestingLevel <= 2 ? 'write' : 'read' 
        },
        accessGranted: true,
        accessReason: `Deep nesting level ${nestingLevel} - ${nestingLevel <= 2 ? 'write' : 'read'} access`
      });

      currentNodeId = currentContext.parentNodeId?.value;
      nestingLevel++;
    }

    return results;
  }

  private validateAccess(
    requestingNodeId: NodeId, 
    targetNodeId: NodeId, 
    requestedAccess: 'read' | 'write' | 'execute'
  ): Result<void> {
    const accessibleContexts = this.getAccessibleContexts(requestingNodeId);
    if (accessibleContexts.isFailure) {
      return Result.fail<void>(accessibleContexts.error);
    }

    const targetAccess = accessibleContexts.value.find(
      access => access.context.nodeId.equals(targetNodeId)
    );

    if (!targetAccess || !targetAccess.accessGranted) {
      return Result.fail<void>('Access denied: Node not in accessible context hierarchy');
    }

    // Validate access level
    const contextAccessLevel = targetAccess.context.accessLevel;
    const accessLevels = ['read', 'write', 'execute'];
    const requiredLevel = accessLevels.indexOf(requestedAccess);
    const availableLevel = accessLevels.indexOf(contextAccessLevel);

    if (availableLevel < requiredLevel) {
      return Result.fail<void>(`Access denied: Required ${requestedAccess} access, but only ${contextAccessLevel} is available`);
    }

    return Result.ok<void>(undefined);
  }

  private hasChildren(node: NodeContext): boolean {
    const children = this.parentChildRelations.get(node.nodeId.value);
    return !!(children && children.length > 0);
  }

  private updateSiblingGroups(parentIdStr: string, newChildIdStr: string): void {
    const existingSiblings = this.siblingGroups.get(parentIdStr) || [];
    existingSiblings.push(newChildIdStr);
    this.siblingGroups.set(parentIdStr, existingSiblings);
  }

  private getAllDescendants(nodeId: string): string[] {
    const children = this.parentChildRelations.get(nodeId) || [];
    let descendants = [...children];
    
    for (const child of children) {
      descendants = descendants.concat(this.getAllDescendants(child));
    }
    
    return descendants;
  }

  /**
   * Set hierarchy relationship between nodes (used for testing)
   */
  public setHierarchy(childNodeId: string, parentNodeId: string): void {
    const children = this.parentChildRelations.get(parentNodeId) || [];
    if (!children.includes(childNodeId)) {
      children.push(childNodeId);
      this.parentChildRelations.set(parentNodeId, children);
    }
    
    // Update sibling groups
    this.updateSiblingGroups(parentNodeId, childNodeId);
  }

  /**
   * Set context data for a specific node (used for testing)
   */
  public setContextData(nodeId: string, contextData: any): void {
    const existingContext = this.nodeHierarchy.get(nodeId);
    if (existingContext) {
      existingContext.contextData = { ...contextData };
      this.nodeHierarchy.set(nodeId, existingContext);
    }
  }

  /**
   * Get all child contexts for a parent node (used for testing)
   */
  public getChildContexts(parentNodeId: string): any[] {
    const children = this.parentChildRelations.get(parentNodeId) || [];
    const childContexts: any[] = [];
    
    for (const childId of children) {
      const childContext = this.nodeHierarchy.get(childId);
      if (childContext && childContext.contextData) {
        childContexts.push(childContext.contextData);
      }
    }
    
    return childContexts;
  }

  /**
   * Debug method to check parent-child relationships (used for testing)
   */
  public getParentChildRelations(): Map<string, string[]> {
    return new Map(this.parentChildRelations);
  }

  /**
   * Debug method to check if a node has children (used for testing)
   */
  public debugHasChildren(nodeId: string): boolean {
    const children = this.parentChildRelations.get(nodeId);
    return !!(children && children.length > 0);
  }

  /**
   * Get deep nested contexts across multiple model levels (used for testing)
   */
  public getDeepNestedContext(sourceModelId: string, targetModelId: string): any[] {
    // Find nodes related to the source model that might have nested contexts
    const nestedContexts: any[] = [];
    
    for (const [nodeId, nodeContext] of this.nodeHierarchy.entries()) {
      // Check if this node's context data has references to the target model
      if (nodeContext.contextData && this.hasNestedModelReferences(nodeContext.contextData, targetModelId)) {
        nestedContexts.push(nodeContext.contextData);
      }
    }
    
    return nestedContexts;
  }

  /**
   * Check if context data contains references to a nested model
   */
  private hasNestedModelReferences(contextData: any, targetModelId: string): boolean {
    // Check various possible locations where nested model references might exist
    
    // Check direct nestedModelId reference
    if (contextData.nestedModelId === targetModelId) {
      return true;
    }
    
    // Check in execution memory parent models array
    if (contextData.executionMemory && contextData.executionMemory.parentModels) {
      if (Array.isArray(contextData.executionMemory.parentModels) && 
          contextData.executionMemory.parentModels.includes(targetModelId)) {
        return true;
      }
    }
    
    // Check in nested model outputs (for FunctionModelContainerContext)
    if (contextData.nestedModelOutputs && contextData.nestedModelOutputs[targetModelId]) {
      return true;
    }
    
    // Check in orchestration state nested models
    if (contextData.orchestrationState && contextData.orchestrationState.nestedModels) {
      if (Array.isArray(contextData.orchestrationState.nestedModels) &&
          contextData.orchestrationState.nestedModels.includes(targetModelId)) {
        return true;
      }
    }
    
    return false;
  }
}