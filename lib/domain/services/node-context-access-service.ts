import { NodeId } from '../value-objects/node-id';
import { ActionNode } from '../entities/action-node';
import { TetherNode } from '../entities/tether-node';
import { KBNode } from '../entities/kb-node';
import { FunctionModelContainerNode } from '../entities/function-model-container-node';
import { Result } from '../shared/result';

// Type definitions for context service
export type ContextScope = 'execution' | 'session' | 'global' | 'isolated';
export type ContextAccessLevel = 'read' | 'write' | 'read-write' | 'execute';

export interface ContextInheritanceRule {
  propertyName: string;
  inheritanceType: 'inherit' | 'override' | 'merge';
  defaultValue?: any;
}

export interface ContextValidationResult {
  isValid: boolean;
  reason: string;
  accessLevel: ContextAccessLevel;
}

export interface HierarchicalContext {
  contextId: string;
  nodeId: NodeId;
  scope: ContextScope;
  data: Record<string, any>;
  inheritedData?: Record<string, any>;
  accessLevel: ContextAccessLevel;
  parentContextId: string | null;
  childContextIds: string[];
  timestamp: string;
}

export interface BuiltContext {
  contextId: string;
  nodeId: NodeId;
  scope: ContextScope;
  data: Record<string, any>;
  inheritedData?: Record<string, any>;
  accessLevel: ContextAccessLevel;
  parentContextId: string | null;
}

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
  private contexts: Map<string, BuiltContext> = new Map();
  private contextCounter: number = 0;

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
   * Get context for a node by nodeId (for testing and simple access)
   */
  public getNodeContext(nodeId: NodeId): Result<BuiltContext> {
    for (const context of Array.from(this.contexts.values())) {
      if (context.nodeId.equals(nodeId)) {
        return Result.ok(context);
      }
    }
    return Result.fail('Context not found for node');
  }

  /**
   * Get specific context data for a node with access validation
   */
  public getNodeContextWithAccess(
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
    // Find the target context in the contexts map
    let targetContext: BuiltContext | undefined;
    for (const context of Array.from(this.contexts.values())) {
      if (context.nodeId.equals(targetNodeId)) {
        targetContext = context;
        break;
      }
    }
    
    if (!targetContext) {
      return Result.fail<void>('Context not found for node');
    }

    // Allow self-update - a node can always update its own context
    if (updatingNodeId.equals(targetNodeId)) {
      targetContext.contextData = { ...targetContext.contextData, ...newContextData };
      return Result.ok<void>(undefined);
    }

    const accessResult = this.validateAccess(updatingNodeId, targetNodeId, 'write');
    if (accessResult.isFailure) {
      return Result.fail<void>(accessResult.error);
    }

    // Update the context data (merge with existing)
    targetContext.contextData = { ...targetContext.contextData, ...newContextData };

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
      const tetherNode = actionNode as TetherNode;
      const config = tetherNode.tetherData;
      return {
        ...baseContext,
        type: 'TetherNode',
        tetherReferenceId: config.tetherReferenceId,
        executionParameters: config.executionParameters,
        outputMapping: config.outputMapping,
        resourceRequirements: config.resourceRequirements,
        integrationConfig: config.integrationConfig
      };
    }

    if (actionNode instanceof KBNode) {
      const kbNode = actionNode as KBNode;
      const config = kbNode.kbData;
      return {
        ...baseContext,
        type: 'KBNode',
        kbReferenceId: config.kbReferenceId,
        shortDescription: config.shortDescription,
        documentationContext: config.documentationContext,
        searchKeywords: config.searchKeywords,
        accessPermissions: config.accessPermissions
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
      // Use the same approach as debugForceSetContext which works
      this.nodeHierarchy.delete(nodeId);
      const updatedContext: NodeContext = {
        ...existingContext,
        contextData: contextData
      };
      this.nodeHierarchy.set(nodeId, updatedContext);
    }
  }

  /**
   * Get all child contexts for a parent node (used for testing)
   */
  public getChildContexts(parentNodeId: string): any[] {
    const children = this.parentChildRelations.get(parentNodeId) || [];
    const childContexts: any[] = [];
    
    for (const childId of children) {
      // Look for context data in the contexts Map
      for (const context of Array.from(this.contexts.values())) {
        if (context.nodeId.value === childId && context.contextData) {
          childContexts.push(context.contextData);
          break; // Found the context for this child, move to next child
        }
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
    
    // Search through node hierarchy for contexts referencing target model
    
    for (const [nodeId, nodeContext] of Array.from(this.nodeHierarchy.entries())) {
      // Check if this node's context references the target model
      
      // Check if this node's context data has references to the target model
      if (nodeContext.contextData && this.hasNestedModelReferences(nodeContext.contextData, targetModelId)) {
        // Found matching context
        nestedContexts.push(nodeContext.contextData);
      } else if (nodeContext.contextData) {
        // No match in this node's context
      }
    }
    
    // Return all found contexts
    return nestedContexts;
  }

  /**
   * Debug method to check the current state of the service
   */
  public debugState(): { nodeCount: number, nodes: Array<{ nodeId: string, nodeType: string, hasContextData: boolean, contextKeys: string[], contextDataType: string, contextData: any }> } {
    const nodes = [];
    for (const [nodeId, nodeContext] of Array.from(this.nodeHierarchy.entries())) {
      nodes.push({
        nodeId,
        nodeType: nodeContext.nodeType,
        hasContextData: !!nodeContext.contextData,
        contextKeys: nodeContext.contextData ? Object.keys(nodeContext.contextData) : [],
        contextDataType: typeof nodeContext.contextData,
        contextData: nodeContext.contextData
      });
    }
    return {
      nodeCount: this.nodeHierarchy.size,
      nodes
    };
  }

  /**
   * Test method to directly manipulate the hierarchy for debugging
   */
  public debugForceSetContext(nodeId: string, contextData: any): boolean {
    // Direct map manipulation
    const existing = this.nodeHierarchy.get(nodeId);
    if (!existing) return false;
    
    // Force set context data for testing purposes
    
    // Completely replace the object in the map
    this.nodeHierarchy.delete(nodeId);
    const newContext = {
      ...existing,
      contextData: contextData
    };
    // Context created successfully
    this.nodeHierarchy.set(nodeId, newContext);
    
    // Verify it was set
    const verify = this.nodeHierarchy.get(nodeId);
    // Context verification complete
    
    return true;
  }

  /**
   * Build context for a node with optional parent context inheritance
   */
  public buildContext(
    nodeId: NodeId,
    data: Record<string, any>,
    scope: ContextScope,
    parentContextId?: string
  ): Result<BuiltContext> {
    try {
      // Validate input data
      if (data === null || data === undefined) {
        return Result.fail('Invalid context data: data cannot be null or undefined');
      }
      
      if (typeof data !== 'object') {
        return Result.fail('Invalid context data: data must be an object');
      }

      const contextId = `ctx-${++this.contextCounter}-${nodeId.value.slice(-8)}`;
      
      let inheritedData: Record<string, any> = {};
      if (parentContextId) {
        const parentContext = this.contexts.get(parentContextId);
        if (parentContext) {
          inheritedData = { ...parentContext.data };
        }
      }

      const accessLevel: ContextAccessLevel = scope === 'isolated' ? 'read' : 'read-write';
      
      const context: BuiltContext = {
        contextId,
        nodeId,
        scope,
        data: { ...data },
        inheritedData: Object.keys(inheritedData).length > 0 ? inheritedData : undefined,
        accessLevel,
        parentContextId: parentContextId || null
      };

      this.contexts.set(contextId, context);
      return Result.ok(context);
    } catch (error) {
      return Result.fail(`Failed to build context: ${error}`);
    }
  }

  /**
   * Update context data for the specified context ID
   */
  public updateContextById(
    contextId: string,
    updateData: Record<string, any>,
    mergeMode: 'replace' | 'merge' = 'merge'
  ): Result<BuiltContext> {
    const context = this.contexts.get(contextId);
    if (!context) {
      return Result.fail('Context not found');
    }

    let updatedData: Record<string, any>;
    if (mergeMode === 'merge') {
      updatedData = { ...context.data, ...updateData };
    } else {
      updatedData = { ...updateData };
    }

    const updatedContext: BuiltContext = {
      ...context,
      data: updatedData
    };

    this.contexts.set(contextId, updatedContext);
    return Result.ok(updatedContext);
  }

  /**
   * Clear node context and all child contexts
   */
  public clearNodeContext(nodeId: NodeId): Result<void> {
    const contextsToRemove: string[] = [];
    
    // Find contexts for this node
    for (const [contextId, context] of Array.from(this.contexts.entries())) {
      if (context.nodeId.equals(nodeId)) {
        contextsToRemove.push(contextId);
        // Also find child contexts
        for (const [childId, childContext] of Array.from(this.contexts.entries())) {
          if (childContext.parentContextId === contextId) {
            contextsToRemove.push(childId);
          }
        }
      }
    }

    // Remove contexts
    contextsToRemove.forEach(id => this.contexts.delete(id));
    
    return Result.ok(undefined);
  }

  /**
   * Propagate context from source to target with inheritance rules
   */
  public propagateContext(
    sourceContextId: string,
    targetNodeId: NodeId,
    inheritanceRules: ContextInheritanceRule[]
  ): Result<BuiltContext> {
    const sourceContext = this.contexts.get(sourceContextId);
    if (!sourceContext) {
      return Result.fail('Source context not found');
    }

    const propagatedData: Record<string, any> = {};
    
    for (const rule of inheritanceRules) {
      const sourceValue = sourceContext.data[rule.propertyName];
      if (sourceValue !== undefined) {
        switch (rule.inheritanceType) {
          case 'inherit':
            propagatedData[rule.propertyName] = sourceValue;
            break;
          case 'override':
            propagatedData[rule.propertyName] = rule.defaultValue ?? sourceValue;
            break;
          case 'merge':
            if (typeof sourceValue === 'object' && sourceValue !== null) {
              propagatedData[rule.propertyName] = { 
                ...sourceValue, 
                ...(rule.defaultValue || {}) 
              };
            } else {
              propagatedData[rule.propertyName] = rule.defaultValue ?? sourceValue;
            }
            break;
        }
      } else if (rule.defaultValue !== undefined) {
        propagatedData[rule.propertyName] = rule.defaultValue;
      }
    }

    return this.buildContext(targetNodeId, propagatedData, sourceContext.scope, sourceContextId);
  }

  /**
   * Get hierarchical context including parent chain
   */
  public getHierarchicalContext(nodeId: NodeId): Result<HierarchicalContext> {
    // Find context for this node
    let nodeContext: BuiltContext | undefined;
    for (const context of Array.from(this.contexts.values())) {
      if (context.nodeId.equals(nodeId)) {
        nodeContext = context;
        break;
      }
    }

    if (!nodeContext) {
      return Result.fail('Node context not found');
    }

    // Find child contexts
    const childContextIds: string[] = [];
    for (const [contextId, context] of Array.from(this.contexts.entries())) {
      if (context.parentContextId === nodeContext.contextId) {
        childContextIds.push(contextId);
      }
    }

    const hierarchicalContext: HierarchicalContext = {
      ...nodeContext,
      childContextIds,
      timestamp: new Date().toISOString()
    };

    return Result.ok(hierarchicalContext);
  }

  /**
   * Validate context access permissions (overloaded method)
   */
  public validateContextAccess(
    requestingNodeId: NodeId,
    targetNodeId: NodeId,
    requestedAccess: ContextAccessLevel,
    accessibleProperties?: string[]
  ): Result<{ granted: boolean; level: string; accessibleProperties: string[] }>;
  public validateContextAccess(
    requestingNodeId: NodeId,
    targetContextId: string,
    requestedAccess: ContextAccessLevel
  ): Result<ContextValidationResult>;
  public validateContextAccess(
    requestingNodeId: NodeId,
    targetContextIdOrNodeId: string | NodeId,
    requestedAccess: ContextAccessLevel,
    accessibleProperties?: string[]
  ): Result<ContextValidationResult | { granted: boolean; level: string; accessibleProperties: string[] }> {
    // Handle overloaded method - check if it's the node-to-node validation
    if (targetContextIdOrNodeId instanceof NodeId && accessibleProperties) {
      // Node-to-node validation with property access control
      const hasAccess = this.checkHierarchicalAccess(requestingNodeId, { nodeId: targetContextIdOrNodeId, data: {} } as BuiltContext);
      const accessLevel = hasAccess ? requestedAccess : 'read';
      const granted = hasAccess && this.validateAccessLevel(requestedAccess, accessLevel);
      
      return Result.ok({
        granted,
        level: accessLevel,
        accessibleProperties: granted ? accessibleProperties : []
      });
    }
    
    // Original method implementation for context ID
    const targetContextId = typeof targetContextIdOrNodeId === 'string' ? targetContextIdOrNodeId : targetContextIdOrNodeId.value;
    const targetContext = this.contexts.get(targetContextId);
    if (!targetContext) {
      return Result.ok({
        isValid: false,
        reason: 'Target context not found',
        accessLevel: 'read'
      });
    }

    // Self-access is always allowed
    if (targetContext.nodeId.equals(requestingNodeId)) {
      return Result.ok({
        isValid: true,
        reason: 'Self-access granted',
        accessLevel: targetContext.accessLevel
      });
    }

    // Check if requesting node has access based on hierarchy
    const hasAccess = this.checkHierarchicalAccess(requestingNodeId, targetContext);
    const accessLevel = hasAccess ? targetContext.accessLevel : 'read';
    const canAccess = this.validateAccessLevel(requestedAccess, accessLevel);

    return Result.ok({
      isValid: canAccess,
      reason: canAccess ? 'Hierarchical access granted' : 'Insufficient permissions',
      accessLevel
    });
  }

  /**
   * Clone context scope to new node
   */
  public cloneContextScope(
    sourceContextId: string,
    targetNodeId: NodeId,
    newScope: ContextScope,
    transformationRules?: ContextInheritanceRule[]
  ): Result<BuiltContext> {
    const sourceContext = this.contexts.get(sourceContextId);
    if (!sourceContext) {
      return Result.fail('Source context not found');
    }

    let clonedData = { ...sourceContext.data };

    // Apply transformation rules if provided
    if (transformationRules) {
      for (const rule of transformationRules) {
        if (rule.inheritanceType === 'override' && rule.defaultValue !== undefined) {
          clonedData[rule.propertyName] = rule.defaultValue;
        }
      }
    }

    return this.buildContext(targetNodeId, clonedData, newScope);
  }

  /**
   * Merge multiple context scopes
   */
  public mergeContextScopes(
    sourceContextIds: string[],
    targetNodeId: NodeId,
    targetScope: ContextScope,
    precedenceRules?: { contextId: string; priority: number }[]
  ): Result<BuiltContext> {
    if (sourceContextIds.length === 0) {
      return this.buildContext(targetNodeId, {}, targetScope);
    }

    const sourceContexts = sourceContextIds
      .map(id => this.contexts.get(id))
      .filter(ctx => ctx !== undefined) as BuiltContext[];

    if (sourceContexts.length === 0) {
      return Result.fail('No valid source contexts found');
    }

    // Merge data with precedence rules
    const mergedData: Record<string, any> = {};
    
    if (precedenceRules) {
      const priorityMap = new Map(precedenceRules.map(rule => [rule.contextId, rule.priority]));
      const sortedContexts = sourceContexts.sort((a, b) => {
        const priorityA = priorityMap.get(a.contextId) ?? 0;
        const priorityB = priorityMap.get(b.contextId) ?? 0;
        return priorityB - priorityA; // Higher priority first
      });
      
      for (const context of sortedContexts.reverse()) { // Apply in reverse order so higher priority overwrites
        Object.assign(mergedData, context.data);
      }
    } else {
      // Simple merge without precedence
      for (const context of sourceContexts) {
        Object.assign(mergedData, context.data);
      }
    }

    return this.buildContext(targetNodeId, mergedData, targetScope);
  }

  private checkHierarchicalAccess(requestingNodeId: NodeId, targetContext: BuiltContext): boolean {
    // Check parent-child relationships
    const accessibleContexts = this.getAccessibleContexts(requestingNodeId);
    if (accessibleContexts.isFailure) return false;

    return accessibleContexts.value.some(access => 
      access.context.nodeId.equals(targetContext.nodeId) && access.accessGranted
    );
  }

  private validateAccessLevel(requested: ContextAccessLevel, available: ContextAccessLevel): boolean {
    const levels = { 'read': 1, 'write': 2, 'read-write': 2, 'execute': 3 };
    return levels[requested] <= levels[available];
  }

  /**
   * Check if context data contains references to a nested model
   */
  private hasNestedModelReferences(contextData: any, targetModelId: string): boolean {
    // Check various possible locations where nested model references might exist
    
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
    if (contextData.nestedModelOutputs) {
      if (contextData.nestedModelOutputs[targetModelId]) {
        return true;
      }
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