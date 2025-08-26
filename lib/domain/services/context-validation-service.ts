import { FunctionModel } from '../entities/function-model';
import { Node } from '../entities/node';
import { ActionNode } from '../entities/action-node';
import { FunctionModelContainerNode } from '../entities/function-model-container-node';
import { ValidationResult } from '../entities/function-model';
import { Result } from '../shared/result';
import { IContextValidationService } from '../../use-cases/function-model/validate-workflow-structure-use-case';

export class ContextValidationService implements IContextValidationService {
  async validateContextIntegrity(model: FunctionModel, nodes: Node[]): Promise<Result<ValidationResult>> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate hierarchical context access
      this.validateHierarchicalContextAccess(model, nodes, errors, warnings);
      
      // Validate context data flow
      this.validateContextDataFlow(model, nodes, errors, warnings);
      
      // Validate context variable scoping
      this.validateContextVariableScoping(model, nodes, errors, warnings);
      
      // Validate context inheritance patterns
      this.validateContextInheritancePatterns(model, nodes, errors, warnings);
      
      // Validate context type consistency
      this.validateContextTypeConsistency(model, nodes, errors, warnings);
      
      // Validate context persistence requirements
      this.validateContextPersistenceRequirements(model, nodes, errors, warnings);
      
      // Validate context security boundaries
      this.validateContextSecurityBoundaries(model, nodes, errors, warnings);
      
      // Validate context lifecycle management
      this.validateContextLifecycleManagement(model, nodes, errors, warnings);
      
      // Validate context memory usage
      this.validateContextMemoryUsage(model, nodes, errors, warnings);
      
      // Validate context versioning compatibility
      this.validateContextVersioningCompatibility(model, nodes, errors, warnings);

      return Result.ok<ValidationResult>({
        isValid: errors.length === 0,
        errors,
        warnings
      });

    } catch (error) {
      return Result.fail<ValidationResult>(
        `Context validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateHierarchicalContextAccess(model: FunctionModel, nodes: Node[], errors: string[], warnings: string[]): void {
    // Get action nodes from the model
    const actionNodes = Array.from(model.actionNodes.values());
    
    // Build hierarchy map
    const hierarchyMap = this.buildContextHierarchy(nodes, actionNodes);
    
    // Check for improper context access
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const accessedContexts = config?.accessedContextVariables || [];
      
      for (const contextVar of accessedContexts) {
        const contextLevel = this.getContextLevel(contextVar, hierarchyMap);
        const nodeLevel = this.getNodeLevel(actionNode, nodes);
        
        // Check if node is accessing context from higher hierarchy level
        if (contextLevel > nodeLevel) {
          const hasProperInheritance = this.checkContextInheritance(actionNode, contextVar, nodes);
          if (!hasProperInheritance) {
            errors.push('Action node accesses context from higher hierarchy level without proper inheritance');
          }
        }
      }
    }
  }

  private validateContextDataFlow(model: FunctionModel, nodes: Node[], errors: string[], warnings: string[]): void {
    const actionNodes = Array.from(model.actionNodes.values());
    const contextDefinitions = new Map<string, { definedAt: string, definedOrder: number }>();
    const contextUsages = new Map<string, { usedAt: string, usedOrder: number }[]>();
    
    // Track context variable definitions and usages
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const definedContexts = config?.definedContextVariables || [];
      const usedContexts = config?.accessedContextVariables || [];
      
      // Record definitions
      for (const contextVar of definedContexts) {
        if (contextDefinitions.has(contextVar)) {
          warnings.push(`Context variable ${contextVar} defined multiple times`);
        }
        contextDefinitions.set(contextVar, {
          definedAt: actionNode.nodeId.toString(),
          definedOrder: actionNode.executionOrder
        });
      }
      
      // Record usages
      for (const contextVar of usedContexts) {
        if (!contextUsages.has(contextVar)) {
          contextUsages.set(contextVar, []);
        }
        contextUsages.get(contextVar)!.push({
          usedAt: actionNode.nodeId.toString(),
          usedOrder: actionNode.executionOrder
        });
      }
    }
    
    // Check for usage before definition
    contextUsages.forEach((usages, contextVar) => {
      const definition = contextDefinitions.get(contextVar);
      
      if (!definition) {
        errors.push(`Context variable ${contextVar} used before being defined`);
        return;
      }
      
      for (const usage of usages) {
        if (usage.usedOrder < definition.definedOrder) {
          errors.push(`Context variable ${contextVar} used before being defined`);
        }
      }
    });
  }

  private validateContextVariableScoping(model: FunctionModel, nodes: Node[], errors: string[], warnings: string[]): void {
    const actionNodes = Array.from(model.actionNodes.values());
    const contextScopes = new Map<string, { scope: string, nodeId: string }>();
    
    // Analyze context variable scopes
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const contextVars = config?.definedContextVariables || [];
      
      for (const contextVar of contextVars) {
        const scope = this.determineContextScope(contextVar, actionNode, nodes);
        contextScopes.set(contextVar, {
          scope,
          nodeId: actionNode.nodeId.toString()
        });
      }
    }
    
    // Check for scope violations
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const accessedVars = config?.accessedContextVariables || [];
      
      for (const contextVar of accessedVars) {
        const scopeInfo = contextScopes.get(contextVar);
        if (scopeInfo) {
          const canAccess = this.checkScopeAccess(
            actionNode.nodeId.toString(), 
            scopeInfo.scope, 
            scopeInfo.nodeId,
            nodes
          );
          
          if (!canAccess) {
            warnings.push(`Context variable ${contextVar} may be accessed outside its intended scope`);
          }
        }
      }
    }
  }

  private validateContextInheritancePatterns(model: FunctionModel, nodes: Node[], errors: string[], warnings: string[]): void {
    const containerNodes = nodes.filter(node => node instanceof FunctionModelContainerNode) as FunctionModelContainerNode[];
    
    for (const containerNode of containerNodes) {
      const inheritedContexts = containerNode.containerData.contextInheritance.inheritedContexts;
      
      // Check for duplicate inherited contexts
      const duplicates = inheritedContexts.filter((context, index) => 
        inheritedContexts.indexOf(context) !== index
      );
      
      if (duplicates.length > 0) {
        errors.push(`Container node has duplicate inherited contexts: ${duplicates.join(', ')}`);
      }
      
      // Check for circular inheritance
      const circularInheritance = this.detectCircularInheritance(containerNode, nodes);
      if (circularInheritance) {
        errors.push(`Circular context inheritance detected in container: ${containerNode.name}`);
      }
      
      // Validate inheritance hierarchy
      for (const inheritedContext of inheritedContexts) {
        const isValidInheritance = this.validateInheritanceHierarchy(
          inheritedContext, 
          containerNode, 
          nodes
        );
        
        if (!isValidInheritance) {
          warnings.push(`Invalid context inheritance pattern for: ${inheritedContext}`);
        }
      }
    }
  }

  private validateContextTypeConsistency(model: FunctionModel, nodes: Node[], errors: string[], warnings: string[]): void {
    const actionNodes = Array.from(model.actionNodes.values());
    const contextTypes = new Map<string, { type: string, nodeId: string }>();
    
    // Collect context type declarations
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const contextTypeDefs = config?.contextTypeDefinitions || {};
      
      for (const [contextVar, typeInfo] of Object.entries(contextTypeDefs)) {
        if (contextTypes.has(contextVar)) {
          const existingType = contextTypes.get(contextVar)!;
          if (existingType.type !== (typeInfo as any).type) {
            errors.push(`Context type mismatch: expected ${existingType.type} but got ${(typeInfo as any).type} for variable ${contextVar}`);
          }
        } else {
          contextTypes.set(contextVar, {
            type: (typeInfo as any).type,
            nodeId: actionNode.nodeId.toString()
          });
        }
      }
    }
    
    // Validate type usage consistency
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const contextUsageTypes = config?.contextUsageTypes || {};
      
      for (const [contextVar, usageType] of Object.entries(contextUsageTypes)) {
        const declaredType = contextTypes.get(contextVar);
        
        if (declaredType && declaredType.type !== (usageType as any)) {
          errors.push(`Context type mismatch: expected ${declaredType.type} but got ${usageType as any} for variable ${contextVar}`);
        }
      }
    }
  }

  private validateContextPersistenceRequirements(model: FunctionModel, nodes: Node[], errors: string[], warnings: string[]): void {
    const actionNodes = Array.from(model.actionNodes.values());
    
    // Check for long-running workflows that need context persistence
    const totalEstimatedTime = actionNodes.reduce((total, node) => {
      const config = node.actionData.configuration;
      return total + (config?.estimatedExecutionTimeMs || 1000);
    }, 0);
    
    const isLongRunning = totalEstimatedTime > 300000; // 5 minutes
    
    if (isLongRunning) {
      // Check for context variables that should be persisted
      const contextVars = new Set<string>();
      
      for (const actionNode of actionNodes) {
        const config = actionNode.actionData.configuration;
        const definedVars = config?.definedContextVariables || [];
        const accessedVars = config?.accessedContextVariables || [];
        
        [...definedVars, ...accessedVars].forEach(contextVar => {
          contextVars.add(contextVar);
        });
      }
      
      // Check if persistence is configured for state variables
      for (const contextVar of contextVars) {
        if (this.isStateVariable(contextVar) && !this.hasPersistenceConfig(contextVar, actionNodes)) {
          warnings.push(`Context variable ${contextVar} may need persistence configuration for long-running workflows`);
        }
      }
    }
  }

  private validateContextSecurityBoundaries(model: FunctionModel, nodes: Node[], errors: string[], warnings: string[]): void {
    const actionNodes = Array.from(model.actionNodes.values());
    const sensitiveContextVars = new Set<string>();
    const insecureActionNodes = new Set<string>();
    
    // Identify sensitive context variables and insecure action nodes
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      
      // Mark sensitive context variables
      const sensitiveVars = config?.sensitiveContextVariables || [];
      sensitiveVars.forEach(contextVar => sensitiveContextVars.add(contextVar));
      
      // Mark insecure action nodes
      const isInsecure = config?.isInsecure || 
                        config?.allowsExternalAccess || 
                        config?.logsContextData;
      
      if (isInsecure) {
        insecureActionNodes.add(actionNode.nodeId.toString());
      }
    }
    
    // Check for security violations
    for (const actionNode of actionNodes) {
      if (insecureActionNodes.has(actionNode.nodeId.toString())) {
        const config = actionNode.actionData.configuration;
        const accessedVars = config?.accessedContextVariables || [];
        
        for (const contextVar of accessedVars) {
          if (sensitiveContextVars.has(contextVar)) {
            errors.push(`Sensitive context variable ${contextVar} exposed to insecure action node`);
          }
        }
      }
    }
  }

  private validateContextLifecycleManagement(model: FunctionModel, nodes: Node[], errors: string[], warnings: string[]): void {
    const actionNodes = Array.from(model.actionNodes.values());
    const contextLifecycles = new Map<string, { created: boolean, cleaned: boolean, nodeIds: string[] }>();
    
    // Track context variable lifecycles
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const createdVars = config?.definedContextVariables || [];
      const cleanedVars = config?.cleanedContextVariables || [];
      const accessedVars = config?.accessedContextVariables || [];
      
      for (const contextVar of [...createdVars, ...cleanedVars, ...accessedVars]) {
        if (!contextLifecycles.has(contextVar)) {
          contextLifecycles.set(contextVar, { created: false, cleaned: false, nodeIds: [] });
        }
        
        const lifecycle = contextLifecycles.get(contextVar)!;
        lifecycle.nodeIds.push(actionNode.nodeId.toString());
        
        if (createdVars.includes(contextVar)) lifecycle.created = true;
        if (cleanedVars.includes(contextVar)) lifecycle.cleaned = true;
      }
    }
    
    // Check for improper lifecycle management
    contextLifecycles.forEach((lifecycle, contextVar) => {
      if (lifecycle.created && !lifecycle.cleaned) {
        if (this.isResourceHandle(contextVar)) {
          warnings.push(`Context variable ${contextVar} not properly cleaned up after use`);
        }
      }
    });
  }

  private validateContextMemoryUsage(model: FunctionModel, nodes: Node[], errors: string[], warnings: string[]): void {
    const actionNodes = Array.from(model.actionNodes.values());
    
    for (const actionNode of actionNodes) {
      const config = actionNode.actionData.configuration;
      const contextObjects = config?.contextObjects || {};
      
      for (const [contextVar, objectInfo] of Object.entries(contextObjects)) {
        const estimatedSizeMb = (objectInfo as any).estimatedSizeMb || 0;
        
        if (estimatedSizeMb > 100) { // 100MB
          warnings.push('Large context object may impact performance: consider optimizing data structure');
        }
        
        if (estimatedSizeMb > 1000) { // 1GB
          errors.push(`Context object ${contextVar} exceeds memory limits: ${estimatedSizeMb}MB`);
        }
      }
    }
  }

  private validateContextVersioningCompatibility(model: FunctionModel, nodes: Node[], errors: string[], warnings: string[]): void {
    const modelVersion = model.version.toString();
    const contextSchema = model.metadata.contextSchema;
    
    if (contextSchema) {
      const schemaVersion = contextSchema.version;
      
      // Check version compatibility
      if (!this.isVersionCompatible(modelVersion, schemaVersion)) {
        errors.push('Context schema version incompatible with workflow version');
      }
      
      // Check for deprecated context variables
      const deprecatedVars = contextSchema.deprecatedVariables || [];
      const actionNodes = Array.from(model.actionNodes.values());
      
      for (const actionNode of actionNodes) {
        const config = actionNode.actionData.configuration;
        const accessedVars = config?.accessedContextVariables || [];
        
        for (const contextVar of accessedVars) {
          if (deprecatedVars.includes(contextVar)) {
            warnings.push(`Using deprecated context variable: ${contextVar}`);
          }
        }
      }
    }
  }

  // Helper methods
  private buildContextHierarchy(nodes: Node[], actionNodes: ActionNode[]): Map<string, number> {
    // Build a hierarchy map - simplified implementation
    const hierarchyMap = new Map<string, number>();
    
    // Root level contexts
    const rootContexts = ['global', 'system', 'organization'];
    rootContexts.forEach(context => hierarchyMap.set(context, 0));
    
    // Model level contexts
    hierarchyMap.set('model', 1);
    
    // Node level contexts
    nodes.forEach(node => {
      hierarchyMap.set(`node-${node.nodeId.toString()}`, 2);
    });
    
    // Action level contexts
    actionNodes.forEach(action => {
      hierarchyMap.set(`action-${action.nodeId.toString()}`, 3);
    });
    
    return hierarchyMap;
  }

  private getContextLevel(contextVar: string, hierarchyMap: Map<string, number>): number {
    // Determine context level based on naming convention or explicit mapping
    if (contextVar.startsWith('global.') || contextVar.startsWith('system.')) return 0;
    if (contextVar.startsWith('model.')) return 1;
    if (contextVar.startsWith('node.')) return 2;
    if (contextVar.startsWith('action.')) return 3;
    
    return hierarchyMap.get(contextVar) || 3; // Default to action level
  }

  private getNodeLevel(actionNode: ActionNode, nodes: Node[]): number {
    // Action nodes are at level 3 in the hierarchy
    return 3;
  }

  private checkContextInheritance(actionNode: ActionNode, contextVar: string, nodes: Node[]): boolean {
    // Check if the action node has proper inheritance for the context variable
    const parentNode = nodes.find(node => node.nodeId.equals(actionNode.parentNodeId));
    
    if (parentNode instanceof FunctionModelContainerNode) {
      const inheritedContexts = parentNode.containerData.contextInheritance.inheritedContexts;
      return inheritedContexts.includes(contextVar);
    }
    
    return false; // No proper inheritance found
  }

  private determineContextScope(contextVar: string, actionNode: ActionNode, nodes: Node[]): string {
    // Determine scope based on variable naming and configuration
    if (contextVar.startsWith('temp.') || contextVar.startsWith('local.')) return 'local';
    if (contextVar.startsWith('shared.') || contextVar.startsWith('container.')) return 'container';
    if (contextVar.startsWith('model.') || contextVar.startsWith('workflow.')) return 'model';
    
    return 'action'; // Default scope
  }

  private checkScopeAccess(nodeId: string, scope: string, definingNodeId: string, nodes: Node[]): boolean {
    // Check if the accessing node can access the context variable based on scope
    switch (scope) {
      case 'local':
        return nodeId === definingNodeId;
      case 'container':
        return this.areInSameContainer(nodeId, definingNodeId, nodes);
      case 'model':
        return true; // Model scope is accessible to all nodes
      default:
        return nodeId === definingNodeId;
    }
  }

  private areInSameContainer(nodeId1: string, nodeId2: string, nodes: Node[]): boolean {
    // Check if two nodes are in the same container
    // This is a simplified check - in reality, would need to check parent relationships
    return true; // Simplified assumption
  }

  private detectCircularInheritance(containerNode: FunctionModelContainerNode, nodes: Node[]): boolean {
    // Detect circular inheritance patterns - simplified implementation
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCircularInheritance = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const node = nodes.find(n => n.nodeId.toString() === nodeId);
      if (node instanceof FunctionModelContainerNode) {
        const inheritedContexts = node.containerData.contextInheritance.inheritedContexts;
        // This would need to be expanded to check actual inheritance relationships
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    return hasCircularInheritance(containerNode.nodeId.toString());
  }

  private validateInheritanceHierarchy(inheritedContext: string, containerNode: FunctionModelContainerNode, nodes: Node[]): boolean {
    // Validate that the inheritance hierarchy is proper
    // This is a simplified implementation
    return true;
  }

  private isStateVariable(contextVar: string): boolean {
    return contextVar.includes('state') || contextVar.includes('Status') || contextVar.includes('progress');
  }

  private hasPersistenceConfig(contextVar: string, actionNodes: ActionNode[]): boolean {
    return actionNodes.some(node => {
      const config = node.actionData.configuration;
      return config?.persistentContextVariables?.includes(contextVar);
    });
  }

  private isResourceHandle(contextVar: string): boolean {
    return contextVar.includes('handle') || contextVar.includes('connection') || contextVar.includes('resource');
  }

  private isVersionCompatible(modelVersion: string, schemaVersion: string): boolean {
    // Simple version compatibility check
    const modelMajor = parseInt(modelVersion.split('.')[0]);
    const schemaMajor = parseInt(schemaVersion.split('.')[0]);
    
    return modelMajor === schemaMajor;
  }
}