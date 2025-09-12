import { ModelName } from '../value-objects/model-name';
import { Version } from '../value-objects/version';
import { NodeId } from '../value-objects/node-id';
import { Node } from './node';
import { ActionNode } from './action-node';
import { IONode } from './io-node';
import { StageNode } from './stage-node';
import { TetherNode } from './tether-node';
import { KBNode } from './kb-node';
import { FunctionModelContainerNode } from './function-model-container-node';
import { ModelStatus } from '../enums';
import { Result } from '../shared/result';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExecutionResult {
  success: boolean;
  completedNodes: string[];
  failedNodes: string[];
  executionTime: number;
  errors: string[];
}

export interface FunctionModelProps {
  modelId: string;
  name: ModelName;
  description?: string;
  version: Version;
  status: ModelStatus;
  currentVersion: Version;
  versionCount: number;
  nodes: Map<string, Node>;
  actionNodes: Map<string, ActionNode>;
  aiAgentConfig?: Record<string, any>;
  metadata: Record<string, any>;
  permissions: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastSavedAt: Date;
  deletedAt?: Date;
  deletedBy?: string;
}

export class FunctionModel {
  private constructor(private props: FunctionModelProps) {}

  public static create(props: Partial<Omit<FunctionModelProps, 'createdAt' | 'updatedAt' | 'lastSavedAt' | 'versionCount'>> & { name: ModelName; version: Version; currentVersion: Version }): Result<FunctionModel> {
    const now = new Date();
    const modelProps: FunctionModelProps = {
      modelId: crypto.randomUUID(),
      nodes: new Map<string, Node>(),
      actionNodes: new Map<string, ActionNode>(),
      metadata: {},
      permissions: {},
      status: props.status || ModelStatus.DRAFT,
      ...props,
      versionCount: 1,
      createdAt: now,
      updatedAt: now,
      lastSavedAt: now,
    };

    // Validate business rules
    const validationResult = FunctionModel.validateInitialState(modelProps);
    if (validationResult.isFailure) {
      return Result.fail<FunctionModel>(validationResult.error);
    }

    return Result.ok<FunctionModel>(new FunctionModel(modelProps));
  }

  public static fromDatabase(props: FunctionModelProps): Result<FunctionModel> {
    // Validate business rules
    const validationResult = FunctionModel.validateInitialState(props);
    if (validationResult.isFailure) {
      return Result.fail<FunctionModel>(validationResult.error);
    }

    return Result.ok<FunctionModel>(new FunctionModel(props));
  }

  public get modelId(): string {
    return this.props.modelId;
  }

  public get id(): string {
    return this.props.modelId;
  }

  public get name(): ModelName {
    return this.props.name;
  }

  public get description(): string | undefined {
    return this.props.description;
  }

  public get version(): Version {
    return this.props.version;
  }

  public get status(): ModelStatus {
    return this.props.status;
  }

  public get currentVersion(): Version {
    return this.props.currentVersion;
  }

  public get versionCount(): number {
    return this.props.versionCount;
  }

  public get nodes(): ReadonlyMap<string, Node> {
    return this.props.nodes;
  }

  public get actionNodes(): ReadonlyMap<string, ActionNode> {
    return this.props.actionNodes;
  }

  public get aiAgentConfig(): Readonly<Record<string, any>> | undefined {
    return this.props.aiAgentConfig;
  }

  public get metadata(): Readonly<Record<string, any>> {
    return this.props.metadata;
  }

  public get permissions(): Readonly<Record<string, any>> {
    return this.props.permissions;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public get lastSavedAt(): Date {
    return this.props.lastSavedAt;
  }

  public get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  public get deletedBy(): string | undefined {
    return this.props.deletedBy;
  }

  public updateName(name: ModelName): Result<void> {
    if (this.props.status === ModelStatus.PUBLISHED) {
      return Result.fail<void>('Cannot modify published model');
    }

    if (this.props.status === ModelStatus.ARCHIVED) {
      return Result.fail<void>('Cannot modify archived model');
    }

    this.props.name = name;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateDescription(description?: string): Result<void> {
    if (this.props.status === ModelStatus.PUBLISHED) {
      return Result.fail<void>('Cannot modify published model');
    }

    if (this.props.status === ModelStatus.ARCHIVED) {
      return Result.fail<void>('Cannot modify archived model');
    }

    if (description && description.length > 5000) {
      return Result.fail<void>('Description cannot exceed 5000 characters');
    }

    this.props.description = description?.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addNode(node: Node): Result<void> {
    if (this.isDeleted()) {
      return Result.fail<void>('Cannot modify deleted model');
    }

    if (this.props.status === ModelStatus.PUBLISHED) {
      return Result.fail<void>('Cannot modify published model');
    }

    if (this.props.status === ModelStatus.ARCHIVED) {
      return Result.fail<void>('Cannot modify archived model');
    }

    if (this.props.nodes.has(node.nodeId.toString())) {
      return Result.fail<void>('Node with this ID already exists');
    }

    // Validate node belongs to this model
    if (node.modelId !== this.modelId) {
      return Result.fail<void>('Node belongs to different model');
    }

    this.props.nodes.set(node.nodeId.toString(), node);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeNode(nodeId: NodeId): Result<void> {
    // Check deletion status first - highest priority business rule
    if (this.isDeleted()) {
      return Result.fail<void>('Cannot modify deleted model');
    }

    if (this.props.status === ModelStatus.PUBLISHED) {
      return Result.fail<void>('Cannot modify published model');
    }

    const nodeIdStr = nodeId.toString();
    if (!this.props.nodes.has(nodeIdStr)) {
      return Result.fail<void>('Node not found');
    }

    // Check for dependencies
    const dependentNodes = Array.from(this.props.nodes.values()).filter(node => 
      node.dependencies.some(dep => dep.equals(nodeId))
    );

    if (dependentNodes.length > 0) {
      const dependentNames = dependentNodes.map(node => node.name).join(', ');
      return Result.fail<void>(`Cannot remove node. It is depended upon by: ${dependentNames}`);
    }

    // Remove associated action nodes
    const actionNodesToRemove = Array.from(this.props.actionNodes.entries())
      .filter(([_, actionNode]) => actionNode.parentNodeId.equals(nodeId))
      .map(([id, _]) => id);

    actionNodesToRemove.forEach(actionId => {
      this.props.actionNodes.delete(actionId);
    });

    this.props.nodes.delete(nodeIdStr);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addActionNode(actionNode: ActionNode): Result<void> {
    if (this.props.status === ModelStatus.PUBLISHED) {
      return Result.fail<void>('Cannot modify published model');
    }

    if (this.props.actionNodes.has(actionNode.actionId.toString())) {
      return Result.fail<void>('Action with this ID already exists');
    }

    // Validate action node belongs to this model
    if (actionNode.modelId !== this.modelId) {
      return Result.fail<void>('Action node does not belong to this model');
    }

    // Validate parent node exists
    const parentNodeExists = this.props.nodes.has(actionNode.parentNodeId.toString());
    if (!parentNodeExists) {
      return Result.fail<void>('Parent node not found');
    }

    this.props.actionNodes.set(actionNode.actionId.toString(), actionNode);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeActionNode(actionId: NodeId): Result<void> {
    if (this.props.status === ModelStatus.PUBLISHED) {
      return Result.fail<void>('Cannot modify published model');
    }

    const actionIdStr = actionId.toString();
    if (!this.props.actionNodes.has(actionIdStr)) {
      return Result.fail<void>('Action node does not exist in the model');
    }

    this.props.actionNodes.delete(actionIdStr);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public validateWorkflow(): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate IO node requirements
    const ioNodes = Array.from(this.props.nodes.values()).filter(node => node instanceof IONode) as IONode[];
    
    // Always check for specific input and output nodes
    const inputNodes = ioNodes.filter(node => node.ioData.boundaryType === 'input' || node.ioData.boundaryType === 'input-output');
    const outputNodes = ioNodes.filter(node => node.ioData.boundaryType === 'output' || node.ioData.boundaryType === 'input-output');
    
    if (inputNodes.length === 0) {
      errors.push('Workflow must have at least one input node');
    }
    
    if (outputNodes.length === 0) {
      errors.push('Workflow must have at least one output node');
    }

    // Validate node dependencies don't create cycles
    const cycleCheckResult = this.checkForCycles();
    if (cycleCheckResult.isFailure) {
      errors.push(cycleCheckResult.error);
    }

    // Validate action node execution orders are unique within containers
    const containerActionMap = new Map<string, ActionNode[]>();
    Array.from(this.props.actionNodes.values()).forEach(actionNode => {
      const parentId = actionNode.parentNodeId.toString();
      if (!containerActionMap.has(parentId)) {
        containerActionMap.set(parentId, []);
      }
      containerActionMap.get(parentId)!.push(actionNode);
    });

    containerActionMap.forEach((actions, containerId) => {
      const executionOrders = actions.map(action => action.executionOrder);
      const uniqueOrders = new Set(executionOrders);
      if (uniqueOrders.size !== executionOrders.length) {
        errors.push(`Container ${containerId} has duplicate execution orders`);
      }
    });

    // Validate function model container nodes don't create infinite nesting
    const containerNodes = Array.from(this.props.actionNodes.values())
      .filter(node => node instanceof FunctionModelContainerNode) as FunctionModelContainerNode[];
    
    for (const containerNode of containerNodes) {
      if (containerNode.containerData.nestedModelId === this.modelId) {
        errors.push('Function model cannot contain itself as a nested model');
      }
    }

    // Warnings for best practices
    const stageNodes = Array.from(this.props.nodes.values()).filter(node => node instanceof StageNode);
    if (stageNodes.length === 0) {
      warnings.push('Consider adding stage nodes for better workflow organization');
    }

    // Check for orphaned nodes (nodes with no connections and no actions)
    Array.from(this.props.nodes.values()).forEach(node => {
      const hasIncomingConnections = Array.from(this.props.nodes.values()).some(otherNode => 
        otherNode.dependencies.some(dep => dep.equals(node.nodeId))
      );
      const hasOutgoingConnections = node.dependencies.length > 0;
      const hasActions = Array.from(this.props.actionNodes.values()).some(action => 
        action.parentNodeId.equals(node.nodeId)
      );
      
      // Warn about orphaned nodes (exclude IO nodes as they have special connection rules)
      if (!hasIncomingConnections && !hasOutgoingConnections && !hasActions && !(node instanceof IONode)) {
        warnings.push(`Node "${node.name}" has no connections`);
      }
    });

    // Check for stage nodes without actions
    stageNodes.forEach(stageNode => {
      const hasActions = Array.from(this.props.actionNodes.values()).some(action => 
        action.parentNodeId.equals(stageNode.nodeId)
      );
      if (!hasActions) {
        warnings.push(`Stage node "${stageNode.name}" has no actions`);
      }
    });

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings,
    });
  }

  public publish(): Result<void> {
    if (this.isDeleted()) {
      return Result.fail<void>('Cannot publish deleted model');
    }
    
    if (this.props.status === ModelStatus.PUBLISHED) {
      return Result.fail<void>('Model is already published');
    }
    
    if (this.props.status === ModelStatus.ARCHIVED) {
      return Result.fail<void>('Cannot publish archived model');
    }
    
    if (this.props.status !== ModelStatus.DRAFT) {
      return Result.fail<void>('Only draft models can be published');
    }

    const validationResult = this.validateWorkflow();
    if (validationResult.isFailure) {
      return Result.fail<void>('Cannot publish invalid workflow');
    }

    const validation = validationResult.value;
    if (!validation.isValid) {
      return Result.fail<void>('Cannot publish invalid workflow');
    }

    this.props.status = ModelStatus.PUBLISHED;
    this.props.updatedAt = new Date();
    this.props.lastSavedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public archive(): Result<void> {
    if (this.isDeleted()) {
      return Result.fail<void>('Cannot archive deleted model');
    }
    
    if (this.props.status === ModelStatus.ARCHIVED) {
      return Result.fail<void>('Model is already archived');
    }

    this.props.status = ModelStatus.ARCHIVED;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public isDeleted(): boolean {
    return this.props.deletedAt !== undefined;
  }

  public softDelete(deletedBy?: string): Result<void> {
    // Business Rule: Cannot delete an already deleted model
    if (this.props.deletedAt) {
      return Result.fail<void>('Model is already deleted');
    }

    // Business Rule: Cannot delete an archived model
    if (this.props.status === ModelStatus.ARCHIVED) {
      return Result.fail<void>('Cannot soft delete an archived model');
    }

    // Perform soft deletion - preserve original status but track deletion metadata
    // Status is preserved for audit purposes - only set deletion metadata
    this.props.deletedAt = new Date();
    // Handle deletedBy parameter: trim non-empty strings, preserve empty strings and undefined
    if (deletedBy === undefined) {
      this.props.deletedBy = undefined;
    } else if (deletedBy === '') {
      this.props.deletedBy = ''; // Preserve empty string
    } else {
      this.props.deletedBy = deletedBy.trim(); // Trim whitespace from non-empty strings
    }
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public restore(): Result<void> {
    if (!this.props.deletedAt) {
      return Result.fail<void>('Model is not deleted and cannot be restored');
    }

    this.props.deletedAt = undefined;
    this.props.deletedBy = undefined;
    // Status is preserved as it was before deletion - no need to change it
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateAIAgentConfig(config: Record<string, any>): Result<void> {
    this.props.aiAgentConfig = { ...config };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateMetadata(metadata: Record<string, any>): Result<void> {
    if (this.isDeleted()) {
      return Result.fail<void>('Cannot modify deleted model');
    }
    
    this.props.metadata = { ...metadata };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updatePermissions(permissions: Record<string, any>): Result<void> {
    this.props.permissions = { ...permissions };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public incrementVersionCount(): void {
    this.props.versionCount += 1;
    this.props.updatedAt = new Date();
  }

  public markSaved(): void {
    this.props.lastSavedAt = new Date();
  }

  private checkForCycles(): Result<void> {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // Cycle found
      }

      if (visited.has(nodeId)) {
        return false; // Already processed
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = this.props.nodes.get(nodeId);
      if (node) {
        for (const dependency of node.dependencies) {
          const depId = dependency.toString();
          if (hasCycle(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of Array.from(this.props.nodes.keys())) {
      if (!visited.has(nodeId)) {
        if (hasCycle(nodeId)) {
          return Result.fail<void>('Circular dependency detected');
        }
      }
    }

    return Result.ok<void>(undefined);
  }

  private static validateInitialState(props: FunctionModelProps): Result<void> {
    if (props.versionCount < 1) {
      return Result.fail<void>('Version count must be at least 1');
    }

    if (!props.version.equals(props.currentVersion)) {
      return Result.fail<void>('Version and current version must be the same for new models');
    }

    return Result.ok<void>(undefined);
  }



  public updateContainerNode(nodeId: string, updates: Partial<{ name: string; description: string; metadata: Record<string, any> }>): Result<void> {
    // Check deletion status first - highest priority business rule
    if (this.isDeleted()) {
      return Result.fail<void>('Cannot modify deleted model');
    }

    if (this.props.status === ModelStatus.PUBLISHED) {
      return Result.fail<void>('Cannot modify published model');
    }

    if (this.props.status === ModelStatus.ARCHIVED) {
      return Result.fail<void>('Cannot modify archived model');
    }

    const existingNode = this.props.nodes.get(nodeId);
    if (!existingNode) {
      return Result.fail<void>('Node not found');
    }

    // Note: In a real implementation, you'd create a new node instance with updates
    // For now, this is just a placeholder that maintains the current node
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public calculateStatistics(): any {
    const totalNodes = this.props.nodes.size;
    const totalActions = this.props.actionNodes.size;
    
    // Calculate complexity based on connections and nodes
    const averageComplexity = totalNodes > 0 ? (totalActions / totalNodes) : 0;
    
    // Calculate node type breakdown
    const nodeTypeBreakdown: Record<string, number> = {};
    Array.from(this.props.nodes.values()).forEach(node => {
      const nodeType = node.constructor.name.toLowerCase();
      const key = nodeType.replace('node', 'Node');
      nodeTypeBreakdown[key] = (nodeTypeBreakdown[key] || 0) + 1;
    });
    
    // Calculate action type breakdown
    const actionTypeBreakdown: Record<string, number> = {};
    Array.from(this.props.actionNodes.values()).forEach(action => {
      const actionType = action.constructor.name.toLowerCase();
      const key = actionType.replace('node', 'Node');
      actionTypeBreakdown[key] = (actionTypeBreakdown[key] || 0) + 1;
    });
    
    // Calculate maximum dependency depth
    const maxDependencyDepth = this.calculateMaxDependencyDepth();
    
    return {
      totalNodes,
      totalActions,
      averageComplexity,
      containerNodeCount: totalNodes,
      actionNodeCount: totalActions,
      containerNodes: totalNodes,
      actionNodes: totalActions,
      nodeTypeBreakdown,
      actionTypeBreakdown,
      maxDependencyDepth
    };
  }

  private calculateMaxDependencyDepth(): number {
    const visited = new Set<string>();
    const getDepth = (nodeId: string, currentDepth: number): number => {
      if (visited.has(nodeId)) return currentDepth;
      visited.add(nodeId);
      
      const node = this.props.nodes.get(nodeId);
      if (!node || node.dependencies.length === 0) {
        return currentDepth;
      }
      
      const maxChildDepth = Math.max(...node.dependencies.map(dep => 
        getDepth(dep.toString(), currentDepth + 1)
      ));
      
      return maxChildDepth;
    };
    
    return Math.max(0, ...Array.from(this.props.nodes.keys()).map(nodeId => getDepth(nodeId, 0)));
  }

  public updateLastSaved(timestamp: Date): void {
    this.props.lastSavedAt = timestamp;
  }

  public removeContainerNode(nodeId: NodeId): Result<void> {
    // Container nodes are just nodes, so delegate to removeNode
    return this.removeNode(nodeId);
  }

  public equals(other: FunctionModel): boolean {
    return this.modelId === other.modelId;
  }

  public createVersion(newVersionString: string): Result<FunctionModel> {
    if (this.props.status !== ModelStatus.PUBLISHED) {
      return Result.fail<FunctionModel>('Can only create version from published model');
    }

    const newVersionResult = Version.create(newVersionString);
    if (newVersionResult.isFailure) {
      return Result.fail<FunctionModel>(newVersionResult.error);
    }

    const newVersion = newVersionResult.value;
    
    // Check if new version is greater than current
    if (!newVersion.isGreaterThan(this.props.version)) {
      return Result.fail<FunctionModel>('New version must be greater than current version');
    }

    // Create new model instance with incremented version
    const newModelProps: FunctionModelProps = {
      ...this.props,
      version: newVersion,
      currentVersion: newVersion,
      status: ModelStatus.DRAFT,
      versionCount: this.props.versionCount + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSavedAt: new Date(),
      deletedAt: undefined,
      deletedBy: undefined,
    };

    return Result.ok<FunctionModel>(new FunctionModel(newModelProps));
  }
}