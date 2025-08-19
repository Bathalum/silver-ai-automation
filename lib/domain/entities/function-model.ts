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

  public static create(props: Omit<FunctionModelProps, 'createdAt' | 'updatedAt' | 'lastSavedAt' | 'versionCount'>): Result<FunctionModel> {
    const now = new Date();
    const modelProps: FunctionModelProps = {
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

  public get modelId(): string {
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
      return Result.fail<void>('Cannot modify published model. Create a new version instead.');
    }

    this.props.name = name;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateDescription(description?: string): Result<void> {
    if (this.props.status === ModelStatus.PUBLISHED) {
      return Result.fail<void>('Cannot modify published model. Create a new version instead.');
    }

    if (description && description.length > 5000) {
      return Result.fail<void>('Description cannot exceed 5000 characters');
    }

    this.props.description = description?.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addNode(node: Node): Result<void> {
    if (this.props.status === ModelStatus.PUBLISHED) {
      return Result.fail<void>('Cannot modify published model. Create a new version instead.');
    }

    if (this.props.nodes.has(node.nodeId.toString())) {
      return Result.fail<void>('Node with this ID already exists in the model');
    }

    // Validate node belongs to this model
    if (node.modelId !== this.modelId) {
      return Result.fail<void>('Node does not belong to this model');
    }

    this.props.nodes.set(node.nodeId.toString(), node);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeNode(nodeId: NodeId): Result<void> {
    if (this.props.status === ModelStatus.PUBLISHED) {
      return Result.fail<void>('Cannot modify published model. Create a new version instead.');
    }

    const nodeIdStr = nodeId.toString();
    if (!this.props.nodes.has(nodeIdStr)) {
      return Result.fail<void>('Node does not exist in the model');
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
      return Result.fail<void>('Cannot modify published model. Create a new version instead.');
    }

    if (this.props.actionNodes.has(actionNode.actionId.toString())) {
      return Result.fail<void>('Action node with this ID already exists in the model');
    }

    // Validate action node belongs to this model
    if (actionNode.modelId !== this.modelId) {
      return Result.fail<void>('Action node does not belong to this model');
    }

    // Validate parent node exists
    const parentNodeExists = this.props.nodes.has(actionNode.parentNodeId.toString());
    if (!parentNodeExists) {
      return Result.fail<void>('Parent container node does not exist');
    }

    this.props.actionNodes.set(actionNode.actionId.toString(), actionNode);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeActionNode(actionId: NodeId): Result<void> {
    if (this.props.status === ModelStatus.PUBLISHED) {
      return Result.fail<void>('Cannot modify published model. Create a new version instead.');
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

    // Validate at least one IO node exists
    const ioNodes = Array.from(this.props.nodes.values()).filter(node => node instanceof IONode);
    if (ioNodes.length === 0) {
      errors.push('Workflow must have at least one IO node');
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

    return Result.ok<ValidationResult>({
      isValid: errors.length === 0,
      errors,
      warnings,
    });
  }

  public publish(): Result<void> {
    if (this.props.status !== ModelStatus.DRAFT) {
      return Result.fail<void>('Only draft models can be published');
    }

    const validationResult = this.validateWorkflow();
    if (validationResult.isFailure) {
      return Result.fail<void>('Cannot publish invalid workflow');
    }

    const validation = validationResult.value;
    if (!validation.isValid) {
      return Result.fail<void>(`Cannot publish model with validation errors: ${validation.errors.join(', ')}`);
    }

    this.props.status = ModelStatus.PUBLISHED;
    this.props.updatedAt = new Date();
    this.props.lastSavedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public archive(): Result<void> {
    if (this.props.status === ModelStatus.ARCHIVED) {
      return Result.fail<void>('Model is already archived');
    }

    this.props.status = ModelStatus.ARCHIVED;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public softDelete(deletedBy: string): Result<void> {
    if (this.props.deletedAt) {
      return Result.fail<void>('Model is already deleted');
    }

    if (!deletedBy || deletedBy.trim().length === 0) {
      return Result.fail<void>('Deleted by user ID is required');
    }

    this.props.deletedAt = new Date();
    this.props.deletedBy = deletedBy.trim();
    this.props.status = ModelStatus.ARCHIVED;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateAIAgentConfig(config: Record<string, any>): Result<void> {
    this.props.aiAgentConfig = { ...config };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateMetadata(metadata: Record<string, any>): Result<void> {
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
          return Result.fail<void>('Circular dependency detected in node dependencies');
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

  public equals(other: FunctionModel): boolean {
    return this.modelId === other.modelId;
  }
}