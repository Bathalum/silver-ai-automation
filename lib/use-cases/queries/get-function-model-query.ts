import { FunctionModel } from '../../domain/entities/function-model';
import { Node } from '../../domain/entities/node';
import { ActionNode } from '../../domain/entities/action-node';
import { Result } from '../../domain/shared/result';
import { GetFunctionModelQuery } from './model-queries';
import { IFunctionModelRepository } from '../function-model/create-function-model-use-case';

export interface FunctionModelQueryResult {
  modelId: string;
  name: string;
  description?: string;
  version: string;
  status: string;
  currentVersion: string;
  versionCount: number;
  metadata: Record<string, any>;
  permissions: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastSavedAt: Date;
  nodes?: NodeQueryResult[];
  actionNodes?: ActionNodeQueryResult[];
  statistics?: ModelStatistics;
}

export interface NodeQueryResult {
  nodeId: string;
  nodeType: string;
  name: string;
  description?: string;
  position: { x: number; y: number };
  dependencies: string[];
  status: string;
  metadata: Record<string, any>;
  visualProperties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  // Type-specific data
  typeSpecificData?: Record<string, any>;
}

export interface ActionNodeQueryResult {
  actionId: string;
  parentNodeId: string;
  actionType: string;
  name: string;
  description?: string;
  executionMode: string;
  executionOrder: number;
  status: string;
  priority: number;
  estimatedDuration?: number;
  retryPolicy: Record<string, any>;
  raci: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  // Type-specific data
  actionSpecificData?: Record<string, any>;
}

export interface ModelStatistics {
  totalNodes: number;
  containerNodeCount: number;
  actionNodeCount: number;
  nodeTypeBreakdown: Record<string, number>;
  actionTypeBreakdown: Record<string, number>;
  averageComplexity: number;
  maxDependencyDepth: number;
  executionEstimate?: number; // in minutes
}

export class GetFunctionModelQueryHandler {
  constructor(
    private modelRepository: IFunctionModelRepository
  ) {}

  async handle(query: GetFunctionModelQuery): Promise<Result<FunctionModelQueryResult>> {
    try {
      // Validate query
      const validationResult = this.validateQuery(query);
      if (validationResult.isFailure) {
        return Result.fail<FunctionModelQueryResult>(validationResult.error);
      }

      // Retrieve the model
      const modelResult = await this.modelRepository.findById(query.modelId);
      if (modelResult.isFailure) {
        return Result.fail<FunctionModelQueryResult>('Function model not found');
      }

      const model = modelResult.value;

      // Check if user has permission to view
      if (!this.hasViewPermission(model, query.userId)) {
        return Result.fail<FunctionModelQueryResult>('Insufficient permissions to view this model');
      }

      // Check if model is deleted
      if (model.deletedAt) {
        return Result.fail<FunctionModelQueryResult>('Model has been deleted');
      }

      // Build the base result
      const result: FunctionModelQueryResult = {
        modelId: model.modelId,
        name: model.name.toString(),
        description: model.description,
        version: model.version.toString(),
        status: model.status,
        currentVersion: model.currentVersion.toString(),
        versionCount: model.versionCount,
        metadata: { ...model.metadata },
        permissions: { ...model.permissions },
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        lastSavedAt: model.lastSavedAt
      };

      // Include nodes if requested
      if (query.includeNodes) {
        result.nodes = this.mapNodesToQueryResult(Array.from(model.nodes.values()));
      }

      // Include action nodes if requested
      if (query.includeActionNodes) {
        result.actionNodes = this.mapActionNodesToQueryResult(Array.from(model.actionNodes.values()));
      }

      // Calculate statistics if nodes are included
      if (query.includeNodes || query.includeActionNodes) {
        result.statistics = this.calculateStatistics(model);
      }

      return Result.ok<FunctionModelQueryResult>(result);

    } catch (error) {
      return Result.fail<FunctionModelQueryResult>(
        `Failed to retrieve function model: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateQuery(query: GetFunctionModelQuery): Result<void> {
    if (!query.modelId || query.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!query.userId || query.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    return Result.ok<void>(undefined);
  }

  private hasViewPermission(model: FunctionModel, userId: string): boolean {
    const permissions = model.permissions;
    
    // Owner always has permission
    if (permissions.owner === userId) {
      return true;
    }

    // Check if user is in viewers list
    const viewers = permissions.viewers as string[] || [];
    if (viewers.includes(userId)) {
      return true;
    }

    // Check if user is in editors list (editors can also view)
    const editors = permissions.editors as string[] || [];
    if (editors.includes(userId)) {
      return true;
    }

    return false;
  }

  private mapNodesToQueryResult(nodes: Node[]): NodeQueryResult[] {
    return nodes.map(node => ({
      nodeId: node.nodeId.toString(),
      nodeType: node.getNodeType(),
      name: node.name,
      description: node.description,
      position: node.position.toObject(),
      dependencies: node.dependencies.map(dep => dep.toString()),
      status: node.status,
      metadata: { ...node.metadata },
      visualProperties: { ...node.visualProperties },
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      typeSpecificData: this.extractTypeSpecificNodeData(node)
    }));
  }

  private mapActionNodesToQueryResult(actionNodes: ActionNode[]): ActionNodeQueryResult[] {
    return actionNodes.map(action => ({
      actionId: action.actionId.toString(),
      parentNodeId: action.parentNodeId.toString(),
      actionType: action.getActionType(),
      name: action.name,
      description: action.description,
      executionMode: action.executionMode,
      executionOrder: action.executionOrder,
      status: action.status,
      priority: action.priority,
      estimatedDuration: action.estimatedDuration,
      retryPolicy: action.retryPolicy.toObject(),
      raci: action.raci.toObject(),
      metadata: { ...action.metadata },
      createdAt: action.createdAt,
      updatedAt: action.updatedAt,
      actionSpecificData: this.extractActionSpecificData(action)
    }));
  }

  private extractTypeSpecificNodeData(node: Node): Record<string, any> {
    // Extract type-specific data based on node type
    // This would be implemented based on the specific node types
    const data: Record<string, any> = {};

    // Add type-specific data extraction logic here
    if (node.getNodeType() === 'ioNode') {
      // Extract IO-specific data
      const ioNode = node as any; // Type assertion would be done properly
      if (ioNode.ioData) {
        data.ioData = ioNode.ioData;
      }
    } else if (node.getNodeType() === 'stageNode') {
      // Extract Stage-specific data
      const stageNode = node as any;
      if (stageNode.stageData) {
        data.stageData = stageNode.stageData;
      }
    }

    return data;
  }

  private extractActionSpecificData(actionNode: ActionNode): Record<string, any> {
    const data: Record<string, any> = {};

    // Extract action-specific data based on action type
    if (actionNode.getActionType() === 'tetherNode') {
      const tetherNode = actionNode as any;
      if (tetherNode.tetherData) {
        data.tetherData = tetherNode.tetherData;
      }
    } else if (actionNode.getActionType() === 'kbNode') {
      const kbNode = actionNode as any;
      if (kbNode.kbData) {
        data.kbData = kbNode.kbData;
      }
    } else if (actionNode.getActionType() === 'functionModelContainer') {
      const containerNode = actionNode as any;
      if (containerNode.containerData) {
        data.containerData = containerNode.containerData;
      }
    }

    return data;
  }

  private calculateStatistics(model: FunctionModel): ModelStatistics {
    const nodes = Array.from(model.nodes.values());
    const actionNodes = Array.from(model.actionNodes.values());

    // Node type breakdown
    const nodeTypeBreakdown: Record<string, number> = {};
    nodes.forEach(node => {
      const type = node.getNodeType();
      nodeTypeBreakdown[type] = (nodeTypeBreakdown[type] || 0) + 1;
    });

    // Action type breakdown
    const actionTypeBreakdown: Record<string, number> = {};
    actionNodes.forEach(action => {
      const type = action.getActionType();
      actionTypeBreakdown[type] = (actionTypeBreakdown[type] || 0) + 1;
    });

    // Calculate average complexity (based on dependencies and action counts)
    const totalComplexity = nodes.reduce((sum, node) => {
      const dependencyComplexity = node.dependencies.length * 0.5;
      const actionCount = actionNodes.filter(a => a.parentNodeId.equals(node.nodeId)).length;
      const actionComplexity = actionCount * 0.3;
      return sum + dependencyComplexity + actionComplexity;
    }, 0);

    const averageComplexity = nodes.length > 0 ? totalComplexity / nodes.length : 0;

    // Calculate max dependency depth
    const maxDependencyDepth = this.calculateMaxDependencyDepth(nodes);

    // Estimate total execution time
    const executionEstimate = actionNodes.reduce((sum, action) => {
      return sum + (action.estimatedDuration || 0);
    }, 0);

    return {
      totalNodes: nodes.length,
      containerNodeCount: nodes.length,
      actionNodeCount: actionNodes.length,
      nodeTypeBreakdown,
      actionTypeBreakdown,
      averageComplexity: Math.round(averageComplexity * 100) / 100,
      maxDependencyDepth,
      executionEstimate: executionEstimate > 0 ? executionEstimate : undefined
    };
  }

  private calculateMaxDependencyDepth(nodes: Node[]): number {
    const nodeMap = new Map(nodes.map(node => [node.nodeId.toString(), node]));
    const depthCache = new Map<string, number>();

    const calculateDepth = (nodeId: string, visited = new Set<string>()): number => {
      if (depthCache.has(nodeId)) {
        return depthCache.get(nodeId)!;
      }

      if (visited.has(nodeId)) {
        return 0; // Circular dependency, return 0
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