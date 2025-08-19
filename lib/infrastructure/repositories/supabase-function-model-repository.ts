import { SupabaseClient } from '@supabase/supabase-js';
import { FunctionModel } from '../../domain/entities/function-model';
import { Node } from '../../domain/entities/node';
import { ActionNode } from '../../domain/entities/action-node';
import { IONode } from '../../domain/entities/io-node';
import { StageNode } from '../../domain/entities/stage-node';
import { TetherNode } from '../../domain/entities/tether-node';
import { KBNode } from '../../domain/entities/kb-node';
import { FunctionModelContainerNode } from '../../domain/entities/function-model-container-node';
import { ModelName } from '../../domain/value-objects/model-name';
import { Version } from '../../domain/value-objects/version';
import { NodeId } from '../../domain/value-objects/node-id';
import { Position } from '../../domain/value-objects/position';
import { RetryPolicy } from '../../domain/value-objects/retry-policy';
import { RACI } from '../../domain/value-objects/raci';
import { Result } from '../../domain/shared/result';
import { IFunctionModelRepository } from '../../use-cases/function-model/create-function-model-use-case';
import { BaseRepository } from './base-repository';
import { ContainerNodeType, ActionNodeType, ModelStatus, NodeStatus, ActionStatus } from '../../domain/enums';

interface FunctionModelRow {
  model_id: string;
  name: string;
  description?: string;
  version: string;
  status: ModelStatus;
  current_version: string;
  version_count: number;
  metadata: Record<string, any>;
  permissions: Record<string, any>;
  ai_agent_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_saved_at: string;
  deleted_at?: string;
  user_id: string;
}

interface NodeRow {
  node_id: string;
  model_id: string;
  node_type: ContainerNodeType;
  name: string;
  description?: string;
  position_x: number;
  position_y: number;
  dependencies: string[];
  status: NodeStatus;
  metadata: Record<string, any>;
  visual_properties: Record<string, any>;
  type_specific_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface ActionNodeRow {
  action_id: string;
  parent_node_id: string;
  model_id: string;
  action_type: ActionNodeType;
  name: string;
  description?: string;
  execution_mode: string;
  execution_order: number;
  status: ActionStatus;
  priority: number;
  estimated_duration?: number;
  retry_policy: Record<string, any>;
  raci: Record<string, any>;
  metadata: Record<string, any>;
  action_specific_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export class SupabaseFunctionModelRepository extends BaseRepository implements IFunctionModelRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async save(model: FunctionModel): Promise<Result<FunctionModel>> {
    return this.executeTransaction(async (client) => {
      // Save the main model
      const modelRow = this.fromDomain(model);
      const { error: modelError } = await client
        .from('function_models')
        .upsert(modelRow);

      if (modelError) {
        throw new Error(this.handleDatabaseError(modelError));
      }

      // Save nodes
      const nodeRows = Array.from(model.nodes.values()).map(node => this.nodeFromDomain(node, model.modelId));
      if (nodeRows.length > 0) {
        // Delete existing nodes first
        await client
          .from('function_model_nodes')
          .delete()
          .eq('model_id', model.modelId);

        const { error: nodesError } = await client
          .from('function_model_nodes')
          .insert(nodeRows);

        if (nodesError) {
          throw new Error(this.handleDatabaseError(nodesError));
        }
      }

      // Save action nodes
      const actionRows = Array.from(model.actionNodes.values()).map(action => this.actionFromDomain(action, model.modelId));
      if (actionRows.length > 0) {
        // Delete existing action nodes first
        await client
          .from('function_model_actions')
          .delete()
          .eq('model_id', model.modelId);

        const { error: actionsError } = await client
          .from('function_model_actions')
          .insert(actionRows);

        if (actionsError) {
          throw new Error(this.handleDatabaseError(actionsError));
        }
      }

      return model;
    });
  }

  async findById(modelId: string): Promise<Result<FunctionModel | null>> {
    try {
      // Get the main model
      const { data: modelData, error: modelError } = await this.supabase
        .from('function_models')
        .select('*')
        .eq('model_id', modelId)
        .is('deleted_at', null)
        .single();

      if (modelError) {
        if (modelError.code === 'PGRST116') {
          return Result.ok(null); // Not found
        }
        return Result.fail(this.handleDatabaseError(modelError));
      }

      // Get nodes
      const { data: nodesData, error: nodesError } = await this.supabase
        .from('function_model_nodes')
        .select('*')
        .eq('model_id', modelId);

      if (nodesError) {
        return Result.fail(this.handleDatabaseError(nodesError));
      }

      // Get action nodes
      const { data: actionsData, error: actionsError } = await this.supabase
        .from('function_model_actions')
        .select('*')
        .eq('model_id', modelId);

      if (actionsError) {
        return Result.fail(this.handleDatabaseError(actionsError));
      }

      // Convert to domain objects
      const model = this.toDomain(modelData as FunctionModelRow);
      
      // Add nodes
      if (nodesData) {
        for (const nodeRow of nodesData as NodeRow[]) {
          const nodeResult = this.nodeToDomain(nodeRow);
          if (nodeResult.isSuccess) {
            model.nodes.set(nodeResult.value.nodeId.toString(), nodeResult.value);
          }
        }
      }

      // Add action nodes
      if (actionsData) {
        for (const actionRow of actionsData as ActionNodeRow[]) {
          const actionResult = this.actionToDomain(actionRow);
          if (actionResult.isSuccess) {
            model.actionNodes.set(actionResult.value.actionId.toString(), actionResult.value);
          }
        }
      }

      return Result.ok(model);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findByName(name: string, userId: string): Promise<Result<FunctionModel | null>> {
    try {
      const { data, error } = await this.supabase
        .from('function_models')
        .select('*')
        .eq('name', name)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return Result.ok(null);
        }
        return Result.fail(this.handleDatabaseError(error));
      }

      const modelResult = await this.findById(data.model_id);
      return modelResult;
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async delete(modelId: string): Promise<Result<void>> {
    return this.executeTransaction(async (client) => {
      // Soft delete - set deleted_at timestamp
      const { error } = await client
        .from('function_models')
        .update({ deleted_at: new Date().toISOString() })
        .eq('model_id', modelId);

      if (error) {
        throw new Error(this.handleDatabaseError(error));
      }
    });
  }

  async list(filter?: any): Promise<Result<FunctionModel[]>> {
    try {
      let query = this.supabase
        .from('function_models')
        .select('*')
        .is('deleted_at', null);

      // Apply filters
      if (filter?.userId) {
        query = query.eq('user_id', filter.userId);
      }
      if (filter?.status) {
        query = query.eq('status', filter.status);
      }
      if (filter?.limit) {
        query = query.limit(filter.limit);
      }

      const { data, error } = await query;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      const models: FunctionModel[] = [];
      for (const row of (data as FunctionModelRow[])) {
        const modelResult = await this.findById(row.model_id);
        if (modelResult.isSuccess && modelResult.value) {
          models.push(modelResult.value);
        }
      }

      return Result.ok(models);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  protected toDomain(row: FunctionModelRow): FunctionModel {
    const modelName = ModelName.create(row.name).value;
    const version = Version.fromString(row.version).value;
    const currentVersion = Version.fromString(row.current_version).value;

    return new FunctionModel({
      modelId: row.model_id,
      name: modelName,
      description: row.description,
      version,
      status: row.status,
      currentVersion,
      versionCount: row.version_count,
      metadata: row.metadata || {},
      permissions: row.permissions || {},
      aiAgentConfig: row.ai_agent_config,
      userId: row.user_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastSavedAt: new Date(row.last_saved_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined
    });
  }

  protected fromDomain(model: FunctionModel): FunctionModelRow {
    return {
      model_id: model.modelId,
      name: model.name.toString(),
      description: model.description,
      version: model.version.toString(),
      status: model.status,
      current_version: model.currentVersion.toString(),
      version_count: model.versionCount,
      metadata: model.metadata,
      permissions: model.permissions,
      ai_agent_config: model.aiAgentConfig,
      user_id: model.userId,
      created_at: model.createdAt.toISOString(),
      updated_at: model.updatedAt.toISOString(),
      last_saved_at: model.lastSavedAt.toISOString(),
      deleted_at: model.deletedAt?.toISOString()
    };
  }

  private nodeToDomain(row: NodeRow): Result<Node> {
    const nodeId = NodeId.fromString(row.node_id).value;
    const position = Position.create(row.position_x, row.position_y).value;
    const dependencies = row.dependencies.map(dep => NodeId.fromString(dep).value);

    const baseProps = {
      nodeId,
      name: row.name,
      description: row.description,
      position,
      dependencies,
      status: row.status,
      metadata: row.metadata || {},
      visualProperties: row.visual_properties || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    switch (row.node_type) {
      case ContainerNodeType.IO_NODE:
        return Result.ok(new IONode({
          ...baseProps,
          ioData: row.type_specific_data?.ioData || {}
        }));
      case ContainerNodeType.STAGE_NODE:
        return Result.ok(new StageNode({
          ...baseProps,
          stageData: row.type_specific_data?.stageData || {}
        }));
      default:
        return Result.fail(`Unknown node type: ${row.node_type}`);
    }
  }

  private nodeFromDomain(node: Node, modelId: string): NodeRow {
    return {
      node_id: node.nodeId.toString(),
      model_id: modelId,
      node_type: node.getNodeType() as ContainerNodeType,
      name: node.name,
      description: node.description,
      position_x: node.position.x,
      position_y: node.position.y,
      dependencies: node.dependencies.map(dep => dep.toString()),
      status: node.status,
      metadata: node.metadata,
      visual_properties: node.visualProperties,
      type_specific_data: this.extractNodeTypeData(node),
      created_at: node.createdAt.toISOString(),
      updated_at: node.updatedAt.toISOString()
    };
  }

  private actionToDomain(row: ActionNodeRow): Result<ActionNode> {
    const actionId = NodeId.fromString(row.action_id).value;
    const parentNodeId = NodeId.fromString(row.parent_node_id).value;
    const retryPolicy = RetryPolicy.fromObject(row.retry_policy).value;
    const raci = RACI.fromObject(row.raci).value;

    const baseProps = {
      actionId,
      parentNodeId,
      name: row.name,
      description: row.description,
      executionMode: row.execution_mode as any,
      executionOrder: row.execution_order,
      status: row.status,
      priority: row.priority,
      estimatedDuration: row.estimated_duration,
      retryPolicy,
      raci,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    switch (row.action_type) {
      case ActionNodeType.TETHER_NODE:
        return Result.ok(new TetherNode({
          ...baseProps,
          tetherData: row.action_specific_data?.tetherData || {}
        }));
      case ActionNodeType.KB_NODE:
        return Result.ok(new KBNode({
          ...baseProps,
          kbData: row.action_specific_data?.kbData || {}
        }));
      case ActionNodeType.FUNCTION_MODEL_CONTAINER:
        return Result.ok(new FunctionModelContainerNode({
          ...baseProps,
          containerData: row.action_specific_data?.containerData || {}
        }));
      default:
        return Result.fail(`Unknown action type: ${row.action_type}`);
    }
  }

  private actionFromDomain(action: ActionNode, modelId: string): ActionNodeRow {
    return {
      action_id: action.actionId.toString(),
      parent_node_id: action.parentNodeId.toString(),
      model_id: modelId,
      action_type: action.getActionType() as ActionNodeType,
      name: action.name,
      description: action.description,
      execution_mode: action.executionMode,
      execution_order: action.executionOrder,
      status: action.status,
      priority: action.priority,
      estimated_duration: action.estimatedDuration,
      retry_policy: action.retryPolicy.toObject(),
      raci: action.raci.toObject(),
      metadata: action.metadata,
      action_specific_data: this.extractActionTypeData(action),
      created_at: action.createdAt.toISOString(),
      updated_at: action.updatedAt.toISOString()
    };
  }

  private extractNodeTypeData(node: Node): Record<string, any> {
    const data: Record<string, any> = {};
    
    if (node instanceof IONode) {
      data.ioData = (node as any).ioData;
    } else if (node instanceof StageNode) {
      data.stageData = (node as any).stageData;
    }
    
    return data;
  }

  private extractActionTypeData(action: ActionNode): Record<string, any> {
    const data: Record<string, any> = {};
    
    if (action instanceof TetherNode) {
      data.tetherData = (action as any).tetherData;
    } else if (action instanceof KBNode) {
      data.kbData = (action as any).kbData;
    } else if (action instanceof FunctionModelContainerNode) {
      data.containerData = (action as any).containerData;
    }
    
    return data;
  }
}