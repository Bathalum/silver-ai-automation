import { SupabaseClient } from '@supabase/supabase-js';
import { FunctionModel } from '../../domain/entities/function-model';
import { Node } from '../../domain/entities/node';
import { ActionNode } from '../../domain/entities/action-node';
import { IONode } from '../../domain/entities/io-node';
import { StageNode } from '../../domain/entities/stage-node';
import { TetherNode } from '../../domain/entities/tether-node';
import { KBNode } from '../../domain/entities/kb-node';
import { FunctionModelContainerNode } from '../../domain/entities/function-model-container-node';
import { UnifiedNode } from '../../domain/entities/unified-node';
import { ModelName } from '../../domain/value-objects/model-name';
import { Version } from '../../domain/value-objects/version';
import { NodeId } from '../../domain/value-objects/node-id';
import { Position } from '../../domain/value-objects/position';
import { RetryPolicy } from '../../domain/value-objects/retry-policy';
import { RACI } from '../../domain/value-objects/raci';
import { Result } from '../../domain/shared/result';
import { IFunctionModelRepository } from '../../domain/interfaces/function-model-repository';
import { BaseRepository } from './base-repository';
import { ContainerNodeType, ActionNodeType, ModelStatus, NodeStatus, ActionStatus, NodeType, ExecutionMode } from '../../domain/enums';

interface FunctionModelRow {
  model_id: string;
  name: string;
  description?: string | null;
  version: string;
  status: ModelStatus;
  current_version: string;
  version_count: number;
  metadata: Record<string, any>;
  permissions: Record<string, any>;
  ai_agent_config?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  last_saved_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

// Production database node structure (matches actual schema)
interface ProductionNodeRow {
  node_id: string;
  model_id: string;
  node_type: string; // Maps to both ContainerNodeType and ActionNodeType
  name: string;
  description?: string;
  position_x: number;
  position_y: number;
  dependencies: string[];
  status: string;
  metadata: Record<string, any>;
  visual_properties: Record<string, any>;
  // Type-specific data fields
  stage_data?: Record<string, any>;
  action_data?: Record<string, any>;
  io_data?: Record<string, any>;
  container_data?: Record<string, any>;
  // Business process fields
  execution_type?: string;
  timeout?: number;
  retry_policy?: Record<string, any>;
  raci_matrix?: Record<string, any>;
  sla?: Record<string, any>;
  kpis?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Legacy interfaces for backward compatibility
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
  // In-memory store for development nodes (non-UUID modelIds)
  private static developmentNodes: Map<string, Map<string, Node>> = new Map();

  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  // Node Association Management Methods
  async addNode(modelId: string, node: Node): Promise<Result<void>> {
    try {
      console.log('🔍 REPOSITORY_ADDNODE - Starting with:', { modelId, nodeId: node.nodeId.toString() });
      
      // Check if modelId is a valid UUID - if not, handle as development scenario
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDevelopment && !uuidRegex.test(modelId)) {
        console.log('🔍 REPOSITORY_ADDNODE - Development mode with non-UUID modelId, storing in memory');
        // In development with non-UUID modelIds, store nodes in memory for UI testing
        if (!SupabaseFunctionModelRepository.developmentNodes.has(modelId)) {
          SupabaseFunctionModelRepository.developmentNodes.set(modelId, new Map());
        }
        const modelNodes = SupabaseFunctionModelRepository.developmentNodes.get(modelId)!;
        modelNodes.set(node.nodeId.toString(), node);
        console.log('🔍 REPOSITORY_ADDNODE - Node stored in development memory store');
        return Result.ok();
      }
      
      // Use development-friendly model verification for UUID modelIds
      const modelResult = await this.findById(modelId);
      if (modelResult.isFailure) {
        console.log('🔍 REPOSITORY_ADDNODE - Model verification failed:', modelResult.error);
        return Result.fail(`Model verification failed: ${modelResult.error}`);
      }
      if (!modelResult.value) {
        console.log('🔍 REPOSITORY_ADDNODE - Model not found:', modelId);
        return Result.fail(`Model not found: ${modelId}`);
      }

      // Check if node already exists (only for real UUID modelIds)
      const { data: existingNode } = await this.supabase
        .from('function_model_nodes')
        .select('node_id')
        .eq('model_id', modelId)
        .eq('node_id', node.nodeId.toString());

      if (existingNode && existingNode.length > 0) {
        console.log('🔍 REPOSITORY_ADDNODE - Node already exists:', node.nodeId.toString());
        return Result.fail(`Node already exists: ${node.nodeId.toString()}`);
      }

      // Add node to association table
      const nodeRow = this.nodeFromDomain(node, modelId);
      console.log('🔍 REPOSITORY_ADDNODE - About to insert nodeRow:', nodeRow);
      
      const { error: nodeError } = await this.supabase
        .from('function_model_nodes')
        .insert([nodeRow]);

      if (nodeError) {
        console.log('🔍 REPOSITORY_ADDNODE - Supabase insert error:', nodeError);
        const handledError = this.handleDatabaseError(nodeError);
        console.log('🔍 REPOSITORY_ADDNODE - Handled error result:', handledError);
        return Result.fail(handledError);
      }

      console.log('🔍 REPOSITORY_ADDNODE - Success!');
      return Result.ok();
    } catch (error) {
      console.log('🔍 REPOSITORY_ADDNODE - Caught exception:', error);
      const handledError = this.handleDatabaseError(error);
      console.log('🔍 REPOSITORY_ADDNODE - Exception handled error result:', handledError);
      return Result.fail(handledError);
    }
  }

  async removeNode(modelId: string, nodeId: string): Promise<Result<void>> {
    try {
      // Check if node exists
      const { data: existingNode, error: checkError } = await this.supabase
        .from('function_model_nodes')
        .select('node_id')
        .eq('model_id', modelId)
        .eq('node_id', nodeId)
        .single();

      if (checkError || !existingNode) {
        return Result.fail(`Node not found: ${nodeId}`);
      }

      // Remove node from association table
      const { error: deleteError } = await this.supabase
        .from('function_model_nodes')
        .delete()
        .eq('model_id', modelId)
        .eq('node_id', nodeId);

      if (deleteError) {
        return Result.fail(this.handleDatabaseError(deleteError));
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async addActionNode(modelId: string, actionNode: ActionNode): Promise<Result<void>> {
    try {
      // Use development-friendly model verification
      const modelResult = await this.findById(modelId);
      if (modelResult.isFailure) {
        return Result.fail(`Model verification failed: ${modelResult.error}`);
      }
      if (!modelResult.value) {
        return Result.fail(`Model not found: ${modelId}`);
      }

      // Check if action node already exists
      const { data: existingAction } = await this.supabase
        .from('function_model_actions')
        .select('action_id')
        .eq('model_id', modelId)
        .eq('action_id', actionNode.actionId.value);

      if (existingAction && existingAction.length > 0) {
        return Result.fail(`Action node already exists: ${actionNode.actionId.value}`);
      }

      // Add action node to actions table
      const actionRow = this.actionNodeFromDomain(actionNode, modelId);
      
      const { error: actionError } = await this.supabase
        .from('function_model_actions')
        .insert([actionRow]);

      if (actionError) {
        return Result.fail(this.handleDatabaseError(actionError));
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async reorderNodes(modelId: string, nodeIds: string[]): Promise<Result<void>> {
    try {
      // Verify all nodes exist for this model
      const { data: existingNodes, error: checkError } = await this.supabase
        .from('function_model_nodes')
        .select('node_id')
        .eq('model_id', modelId)
        .in('node_id', nodeIds);

      if (checkError) {
        return Result.fail(this.handleDatabaseError(checkError));
      }

      if (!existingNodes || existingNodes.length !== nodeIds.length) {
        return Result.fail('One or more nodes not found for reordering');
      }

      // Update node order (assuming metadata contains ordering info)
      for (let i = 0; i < nodeIds.length; i++) {
        const { error: updateError } = await this.supabase
          .from('function_model_nodes')
          .update({ 
            metadata: { order: i },
            updated_at: new Date().toISOString()
          })
          .eq('model_id', modelId)
          .eq('node_id', nodeIds[i]);

        if (updateError) {
          return Result.fail(this.handleDatabaseError(updateError));
        }
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  // Version Management Methods
  async createVersion(modelId: string): Promise<Result<Version>> {
    return this.executeTransaction(async (client) => {
      // Get current model to copy
      const { data: modelData, error: modelError } = await client
        .from('function_models')
        .select('*')
        .eq('model_id', modelId)
        .single();

      if (modelError || !modelData) {
        throw new Error(`Model not found: ${modelId}`);
      }

      // Increment version number
      const currentVersionResult = Version.create(modelData.version);
      if (currentVersionResult.isFailure) {
        throw new Error(`Invalid current version: ${currentVersionResult.error}`);
      }

      const newVersionResult = currentVersionResult.value.increment();
      if (newVersionResult.isFailure) {
        throw new Error(`Failed to increment version: ${newVersionResult.error}`);
      }

      // Update model with new version
      const { error: updateError } = await client
        .from('function_models')
        .update({
          version: newVersionResult.value.value,
          version_count: (modelData.version_count || 1) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('model_id', modelId);

      if (updateError) {
        throw new Error(this.handleDatabaseError(updateError));
      }

      return newVersionResult.value;
    });
  }

  async publishVersion(modelId: string, version: string): Promise<Result<void>> {
    return this.executeTransaction(async (client) => {
      // Verify model and version exist
      const { data: modelData, error: modelError } = await client
        .from('function_models')
        .select('*')
        .eq('model_id', modelId)
        .eq('version', version)
        .single();

      if (modelError || !modelData) {
        throw new Error(`Model version not found: ${modelId}@${version}`);
      }

      // Update status to published and set as current version
      const { error: updateError } = await client
        .from('function_models')
        .update({
          status: ModelStatus.PUBLISHED,
          current_version: version,
          updated_at: new Date().toISOString()
        })
        .eq('model_id', modelId);

      if (updateError) {
        throw new Error(this.handleDatabaseError(updateError));
      }

      return undefined;
    });
  }

  async compareVersions(modelId: string, version1: string, version2: string): Promise<Result<any>> {
    try {
      // Get both versions (simplified implementation)
      const [v1Result, v2Result] = await Promise.all([
        this.findByIdAndVersion(modelId, version1),
        this.findByIdAndVersion(modelId, version2)
      ]);

      if (v1Result.isFailure || v2Result.isFailure) {
        return Result.fail('One or both versions not found');
      }

      const differences = {
        version1: version1,
        version2: version2,
        nodeChanges: {
          added: [] as string[],
          removed: [] as string[],
          modified: [] as string[]
        },
        metadataChanges: {},
        statusChanged: v1Result.value?.status !== v2Result.value?.status
      };

      return Result.ok(differences);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  private async findByIdAndVersion(modelId: string, version: string): Promise<Result<FunctionModel | null>> {
    // Simplified version lookup - in production this might involve version history tables
    const modelResult = await this.findById(modelId);
    if (modelResult.isFailure || !modelResult.value) {
      return Result.ok(null);
    }

    // Check if this is the current version
    const currentVersion = modelResult.value.version?.value || modelResult.value.version;
    if (currentVersion === version) {
      return Result.ok(modelResult.value);
    }

    return Result.ok(null); // Version not found
  }

  // Advanced Query Operations
  async findModelsWithNodeCounts(): Promise<Result<any[]>> {
    try {
      const { data, error } = await this.supabase
        .from('function_models')
        .select(`
          *,
          function_model_nodes(count)
        `)
;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      return Result.ok(data || []);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findModelsWithComplexFilters(filters: {
    status?: ModelStatus[];
    namePattern?: string;
    hasNodes?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Result<FunctionModel[]>> {
    try {
      let query = this.supabase
        .from('function_models')
        .select('*')
;

      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }

      if (filters.namePattern) {
        query = query.ilike('name', `%${filters.namePattern}%`);
      }

      if (filters.sortBy) {
        query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
      }

      const { data, error } = await query;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      const models: FunctionModel[] = [];
      for (const row of (data || [])) {
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

  async searchModelsByNodeContent(query: string): Promise<Result<FunctionModel[]>> {
    try {
      // Search in node names and descriptions
      const { data: nodeData, error: nodeError } = await this.supabase
        .from('function_model_nodes')
        .select('model_id')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

      if (nodeError) {
        return Result.fail(this.handleDatabaseError(nodeError));
      }

      if (!nodeData || nodeData.length === 0) {
        return Result.ok([]);
      }

      // Get unique model IDs
      const modelIds = [...new Set(nodeData.map(n => n.model_id))];
      
      // Fetch models
      const models: FunctionModel[] = [];
      for (const modelId of modelIds) {
        const modelResult = await this.findById(modelId);
        if (modelResult.isSuccess && modelResult.value) {
          models.push(modelResult.value);
        }
      }

      return Result.ok(models);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async save(model: FunctionModel): Promise<Result<void>> {
    try {
      // Save the main model
      const modelRow = this.fromDomain(model);
      
      // Check if we have a functional Supabase client
      const tableBuilder = this.supabase.from('function_models');
      
      if (typeof tableBuilder.insert !== 'function') {
        return Result.fail('Database client is not properly configured - missing insert functionality');
      }

      // Use insert with update fallback pattern (reliable for all Supabase versions)
      // Try insert first
      const { error: insertError } = await tableBuilder.insert([modelRow]);

      if (insertError) {
        // If it's a duplicate key error, try update
        if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
          const { error: updateError } = await this.supabase
            .from('function_models')
            .update(modelRow)
            .eq('model_id', modelRow.model_id);

          if (updateError) {
            console.error('🔍 Model update failed with error:', updateError);
            console.error('🔍 Error details:', JSON.stringify(updateError, null, 2));
            return Result.fail(this.handleDatabaseError(updateError));
          }
          } else {
          console.error('🔍 Model insert failed with error:', insertError);
          console.error('🔍 Error details:', JSON.stringify(insertError, null, 2));
          console.error('🔍 Model row attempted:', JSON.stringify(modelRow, null, 2));
          return Result.fail(this.handleDatabaseError(insertError));
        }
      } else {
      }

      // Save nodes (combines both regular nodes and action nodes)
      const allNodeRows = [];
      
      // Add regular nodes
      if (model.nodes && model.nodes.size > 0) {
        const nodeRows = Array.from(model.nodes.values()).map(node => this.nodeFromDomain(node, model.modelId));
        allNodeRows.push(...nodeRows);
      }
      
      // Add action nodes as nodes in the database
      if (model.actionNodes && model.actionNodes.size > 0) {
        const actionNodeRows = Array.from(model.actionNodes.values()).map(action => this.actionNodeFromDomain(action, model.modelId));
        allNodeRows.push(...actionNodeRows);
      }

      if (allNodeRows.length > 0) {
        
        // Delete existing nodes first (clean slate approach)
        const { error: deleteError } = await this.supabase
          .from('function_model_nodes')
          .delete()
          .eq('model_id', model.modelId);

        if (deleteError) {
          console.error('🔍 Failed to delete existing nodes:', deleteError);
          return Result.fail(this.handleDatabaseError(deleteError));
        }

        // Insert all nodes
        const { error: nodesError } = await this.supabase
          .from('function_model_nodes')
          .insert(allNodeRows);

        if (nodesError) {
          console.error('🔍 Failed to insert nodes:', nodesError);
          return Result.fail(this.handleDatabaseError(nodesError));
        }
        
      } else {
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findById(modelId: string): Promise<Result<FunctionModel | null>> {
    try {
      console.log('🔍 REPOSITORY FINDBYID DEBUG - Finding modelId:', modelId);
      
      // Check if modelId is a valid UUID - if not, return mock data for development
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDevelopment && !uuidRegex.test(modelId)) {
        console.log('🔍 Non-UUID modelId in development, returning mock data');
        const mockResult = await this.createMockModel(modelId);
        if (mockResult.isSuccess) {
          console.log('🔍 Mock model created successfully:', mockResult.value?.modelId);
        } else {
          console.error('🔍 Failed to create mock model:', mockResult.error);
        }
        return mockResult;
      }
      
      // Get the main model using standard Supabase query
      const { data: modelData, error: modelError } = await this.supabase
        .from('function_models')
        .select('*')
        .eq('model_id', modelId)
        .single();

      if (modelError) {
        if (modelError.code === 'PGRST116') {
          console.log('🔍 Model not found (PGRST116)');
          return Result.ok(null); // Not found
        }
        console.error('🔍 Database error finding model:', modelError);
        return Result.fail(this.handleDatabaseError(modelError));
      }

      if (!modelData) {
        console.log('🔍 No model data found for modelId:', modelId);
        return Result.ok(null); // Not found
      }
      
      console.log('🔍 Found model data:', {
        model_id: modelData.model_id,
        name: modelData.name,
        deleted_at: modelData.deleted_at,
        deleted_by: modelData.deleted_by
      });

      // Get all nodes using standard Supabase query
      const { data: nodesData, error: nodesError } = await this.supabase
        .from('function_model_nodes')
        .select('*')
        .eq('model_id', modelId);

      if (nodesError) {
        console.error('🔍 Error fetching nodes:', nodesError);
        return Result.fail(this.handleDatabaseError(nodesError));
      }
      
      console.log('🔍 Found', nodesData?.length || 0, 'nodes for model');

      // Convert to domain objects, separating nodes and action nodes
      const nodes = new Map<string, Node>();
      const actionNodes = new Map<string, ActionNode>();
      
      // Process all node rows - handle both legacy and unified nodes
      if (nodesData) {
        for (const nodeRow of nodesData as ProductionNodeRow[]) {
          // Check if this is a unified node (new system)
          const isUnifiedNodeType = ['ioNode', 'stageNode', 'tetherNode', 'kbNode', 'functionModelContainer'].includes(nodeRow.node_type);
          
          if (isUnifiedNodeType) {
            // Convert ProductionNodeRow to UnifiedNode
            const unifiedNodeResult = this.productionRowToUnifiedNode(nodeRow);
            if (unifiedNodeResult.isSuccess) {
              nodes.set(unifiedNodeResult.value.nodeId.toString(), unifiedNodeResult.value);
            } else {
              console.warn('🔍 Failed to convert unified node:', nodeRow.node_id, unifiedNodeResult.error);
            }
          } else {
            // Legacy node conversion for older nodes
            if (this.isActionNodeType(nodeRow.node_type)) {
              const actionResult = this.nodeRowToActionNode(nodeRow);
              if (actionResult.isSuccess) {
                actionNodes.set(actionResult.value.actionId.toString(), actionResult.value);
              }
            } else {
              const nodeResult = this.nodeRowToNode(nodeRow);
              if (nodeResult.isSuccess) {
                nodes.set(nodeResult.value.nodeId.toString(), nodeResult.value);
              }
            }
          }
        }
      }
      
      const modelResult = this.toDomainWithNodesAndActions(modelData as FunctionModelRow, nodes, actionNodes);
      if (modelResult.isFailure) {
        console.log('🔍 Failed to convert to domain:', modelResult.error);
        return Result.fail(modelResult.error);
      }

      console.log('🔍 Successfully converted to domain model');
      console.log('🔍 Domain model deletedAt:', modelResult.value.deletedAt);
      return Result.ok(modelResult.value);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findByName(name: string): Promise<Result<FunctionModel[]>> {
    try {
      const { data, error } = await this.supabase
        .from('function_models')
        .select('*')
        .eq('name', name)
;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const models: FunctionModel[] = [];
      for (const row of data) {
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

  async exists(id: string): Promise<Result<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from('function_models')
        .select('model_id')
        .eq('model_id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return Result.ok(false); // Not found
        }
        return Result.fail(this.handleDatabaseError(error));
      }

      return Result.ok(!!data);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findByStatus(status: ModelStatus[]): Promise<Result<FunctionModel[]>> {
    try {
      const { data, error } = await this.supabase
        .from('function_models')
        .select('*')
        .in('status', status)
;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const models: FunctionModel[] = [];
      for (const row of data) {
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

  async findAll(filter?: { userId?: string; organizationId?: string; status?: ModelStatus[]; searchTerm?: string; limit?: number; offset?: number; }): Promise<Result<FunctionModel[]>> {
    try {
      let query = this.supabase
        .from('function_models')
        .select('*')
        .is('deleted_at', null);

      // Apply filters
      if (filter?.userId) {
        // Simplified permission check for now - TODO: implement proper JSONB permission filtering
        // query = query.or(`metadata->>'createdBy'.eq.${filter.userId},permissions->>'owner'.eq.${filter.userId},permissions->>'editors'.cs.["${filter.userId}"],permissions->>'viewers'.cs.["${filter.userId}"]`);
        // For now, just return all models (empty database scenario)
      }

      if (filter?.organizationId) {
        query = query.eq('metadata->>organizationId', filter.organizationId);
      }

      if (filter?.status && filter.status.length > 0) {
        query = query.in('status', filter.status);
      }

      if (filter?.searchTerm) {
        query = query.or(`name.ilike.%${filter.searchTerm}%,description.ilike.%${filter.searchTerm}%`);
      }

      // Apply pagination
      const limit = filter?.limit || 100;
      const offset = filter?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Execute query
      const { data, error } = await query;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const models: FunctionModel[] = [];
      for (const row of data) {
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

  async findByOwner(ownerId: string): Promise<Result<FunctionModel[]>> {
    try {
      const { data, error } = await this.supabase
        .from('function_models')
        .select('*')
        .eq('user_id', ownerId)
;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const models: FunctionModel[] = [];
      for (const row of data) {
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

  async publishModel(id: string): Promise<Result<void>> {
    return this.executeTransaction(async (client) => {
      const { error } = await client
        .from('function_models')
        .update({ 
          status: ModelStatus.PUBLISHED,
          updated_at: new Date().toISOString()
        })
        .eq('model_id', id)
;

      if (error) {
        throw new Error(this.handleDatabaseError(error));
      }
    });
  }

  async archiveModel(id: string): Promise<Result<void>> {
    return this.executeTransaction(async (client) => {
      const { error } = await client
        .from('function_models')
        .update({ 
          status: ModelStatus.ARCHIVED,
          updated_at: new Date().toISOString()
        })
        .eq('model_id', id)
;

      if (error) {
        throw new Error(this.handleDatabaseError(error));
      }
    });
  }

  async findByNamePattern(pattern: string): Promise<Result<FunctionModel[]>> {
    try {
      const { data, error } = await this.supabase
        .from('function_models')
        .select('*')
        .ilike('name', pattern)
;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const models: FunctionModel[] = [];
      for (const row of data) {
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

  async findRecentlyModified(limit: number): Promise<Result<FunctionModel[]>> {
    try {
      const { data, error } = await this.supabase
        .from('function_models')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const models: FunctionModel[] = [];
      for (const row of data) {
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

  async countByStatus(status: ModelStatus): Promise<Result<number>> {
    try {
      const { data, error } = await this.supabase
        .from('function_models')
        .select('model_id', { count: 'exact' })
        .eq('status', status)
;

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      return Result.ok(data?.length || 0);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async softDelete(id: string, deletedBy: string): Promise<Result<void>> {
    return this.executeTransaction(async (client) => {
      const { error } = await client
        .from('function_models')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy,
          updated_at: new Date().toISOString()
        })
        .eq('model_id', id)
;

      if (error) {
        throw new Error(this.handleDatabaseError(error));
      }
    });
  }

  async restore(id: string): Promise<Result<void>> {
    return this.executeTransaction(async (client) => {
      const { error } = await client
        .from('function_models')
        .update({ 
          deleted_at: null,
          deleted_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('model_id', id);

      if (error) {
        throw new Error(this.handleDatabaseError(error));
      }
    });
  }

  async findDeleted(): Promise<Result<FunctionModel[]>> {
    try {
      const { data, error } = await this.supabase
        .from('function_models')
        .select('*')
        .not('deleted_at', 'is', null);

      if (error) {
        return Result.fail(this.handleDatabaseError(error));
      }

      if (!data || data.length === 0) {
        return Result.ok([]);
      }

      const models: FunctionModel[] = [];
      for (const row of data) {
        const modelResult = this.toDomain(row as FunctionModelRow);
        if (modelResult.isSuccess) {
          models.push(modelResult.value);
        }
      }

      return Result.ok(models);
    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  async findPublishedVersions(): Promise<Result<FunctionModel[]>> {
    return this.findByStatus([ModelStatus.PUBLISHED]);
  }

  async findDraftVersions(): Promise<Result<FunctionModel[]>> {
    return this.findByStatus([ModelStatus.DRAFT]);
  }

  // Implementation of base class abstract methods
  protected toDomain(row: FunctionModelRow): Result<FunctionModel> {
    return this.toDomainWithNodesAndActions(row, new Map(), new Map());
  }

  private toDomainWithNodesAndActions(row: FunctionModelRow, nodes: Map<string, Node>, actionNodes: Map<string, ActionNode>): Result<FunctionModel> {
    try {
      // Defensive null checking for entire row
      if (!row) {
        return Result.fail('Database row is null or undefined - model may not exist or there was a database error');
      }
      
      // Check for required fields
      if (!row.model_id || typeof row.model_id !== 'string') {
        return Result.fail('Database row missing required model_id field');
      }

      // Handle null/undefined values from database with comprehensive safety
      const safeName = (row.name && typeof row.name === 'string') ? row.name : 'Untitled Model';
      const safeVersion = (row.version && typeof row.version === 'string') ? row.version : '1.0.0';
      const safeCurrentVersion = (row.current_version && typeof row.current_version === 'string') ? row.current_version : '1.0.0';

      const modelNameResult = ModelName.create(safeName);
      const versionResult = Version.create(safeVersion);
      const currentVersionResult = Version.create(safeCurrentVersion);

      if (modelNameResult.isFailure) {
        return Result.fail(`Invalid model name: ${modelNameResult.error}`);
      }
      if (versionResult.isFailure) {
        return Result.fail(`Invalid version: ${versionResult.error}`);
      }
      if (currentVersionResult.isFailure) {
        return Result.fail(`Invalid current version: ${currentVersionResult.error}`);
      }

      const modelResult = FunctionModel.fromDatabase({
        modelId: row.model_id,
        name: modelNameResult.value,
        description: row.description || undefined,
        version: versionResult.value,
        status: row.status,
        currentVersion: currentVersionResult.value,
        versionCount: row.version_count,
        nodes,
        actionNodes,
        metadata: row.metadata || {},
        permissions: row.permissions || {},
        aiAgentConfig: row.ai_agent_config || undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastSavedAt: new Date(row.last_saved_at),
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
        deletedBy: row.deleted_by || undefined
      });

      return modelResult;
    } catch (error) {
      return Result.fail(`Failed to convert to domain: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  protected fromDomain(model: FunctionModel): FunctionModelRow {
    // Safely access properties with proper error handling
    const getName = () => {
      try {
        if (model.name && typeof model.name === 'object' && 'value' in model.name) {
          return model.name.value;
        }
        return model.name?.toString() || 'Untitled Model';
      } catch (error) {
        return 'Untitled Model';
      }
    };

    const getVersion = (versionProp: any) => {
      try {
        if (versionProp && typeof versionProp === 'object' && 'value' in versionProp) {
          return versionProp.value;
        }
        return versionProp?.toString() || '1.0.0';
      } catch (error) {
        return '1.0.0';
      }
    };

    return {
      model_id: model.modelId,
      name: getName(),
      description: model.description || null,
      version: getVersion(model.version),
      status: model.status,
      current_version: getVersion(model.currentVersion),
      version_count: model.versionCount || 1,
      metadata: model.metadata || {},
      permissions: model.permissions || {},
      ai_agent_config: model.aiAgentConfig || null,
      created_at: model.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: model.updatedAt?.toISOString() || new Date().toISOString(),
      last_saved_at: model.lastSavedAt?.toISOString() || new Date().toISOString(),
      deleted_at: model.deletedAt?.toISOString() || null,
      deleted_by: model.deletedBy || null
    };
  }

  // Legacy methods for backward compatibility
  async findByUserId(userId: string): Promise<Result<FunctionModel[]>> {
    return this.findByOwner(userId);
  }

  async list(filter?: any): Promise<Result<FunctionModel[]>> {
    try {
      let query = this.supabase
        .from('function_models')
        .select('*')
;

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

  private nodeToDomain(row: NodeRow): Result<Node> {
    const nodeIdResult = NodeId.create(row.node_id);
    const positionResult = Position.create(row.position_x, row.position_y);
    
    if (nodeIdResult.isFailure) {
      return Result.fail(`Invalid node ID: ${nodeIdResult.error}`);
    }
    if (positionResult.isFailure) {
      return Result.fail(`Invalid position: ${positionResult.error}`);
    }
    
    const dependencyResults = row.dependencies.map(dep => NodeId.create(dep));
    for (const depResult of dependencyResults) {
      if (depResult.isFailure) {
        return Result.fail(`Invalid dependency ID: ${depResult.error}`);
      }
    }
    
    const nodeId = nodeIdResult.value;
    const position = positionResult.value;
    const dependencies = dependencyResults.map(r => r.value);

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
        return IONode.create({
          ...baseProps,
          ioData: row.type_specific_data?.ioData || {}
        });
      case ContainerNodeType.STAGE_NODE:
        return StageNode.create({
          ...baseProps,
          stageData: row.type_specific_data?.stageData || {}
        });
      default:
        return Result.fail(`Unknown node type: ${row.node_type}`);
    }
  }

  private nodeFromDomain(node: Node, modelId: string): ProductionNodeRow {
    const typeSpecificData = this.extractNodeTypeData(node);
    
    // Safely get node name with null handling
    let nodeName: string;
    try {
      nodeName = node.name || 'Untitled Node';
    } catch (error) {
      console.warn('Node name access failed, using default:', error);
      nodeName = 'Untitled Node';
    }
    
    return {
      node_id: node.nodeId.toString(),
      model_id: modelId,
      node_type: this.mapNodeTypeToProduction(node.getNodeType()),
      name: nodeName,
      description: node.description,
      position_x: node.position.x,
      position_y: node.position.y,
      dependencies: node.dependencies.map(dep => dep.toString()),
      status: node.status,
      metadata: node.metadata,
      visual_properties: node.visualProperties,
      // Map type-specific data to production schema
      stage_data: typeSpecificData.stageData,
      io_data: typeSpecificData.ioData,
      container_data: typeSpecificData.containerData,
      action_data: undefined, // Regular nodes don't have action data
      execution_type: 'sequential',
      created_at: node.createdAt.toISOString(),
      updated_at: node.updatedAt.toISOString()
    };
  }

  private mapNodeTypeToProduction(nodeType: ContainerNodeType): string {
    const mapping: Record<ContainerNodeType, string> = {
      [ContainerNodeType.STAGE_NODE]: 'stageNode',
      [ContainerNodeType.IO_NODE]: 'ioNode'
    };
    return mapping[nodeType] || 'stageNode';
  }

  private actionToDomain(row: ActionNodeRow): Result<ActionNode> {
    const actionIdResult = NodeId.create(row.action_id);
    const parentNodeIdResult = NodeId.create(row.parent_node_id);
    const retryPolicyResult = RetryPolicy.create(row.retry_policy);
    const raciResult = RACI.create(row.raci);

    if (actionIdResult.isFailure) {
      return Result.fail(`Invalid action ID: ${actionIdResult.error}`);
    }
    if (parentNodeIdResult.isFailure) {
      return Result.fail(`Invalid parent node ID: ${parentNodeIdResult.error}`);
    }
    if (retryPolicyResult.isFailure) {
      return Result.fail(`Invalid retry policy: ${retryPolicyResult.error}`);
    }
    if (raciResult.isFailure) {
      return Result.fail(`Invalid RACI: ${raciResult.error}`);
    }

    const actionId = actionIdResult.value;
    const parentNodeId = parentNodeIdResult.value;
    const retryPolicy = retryPolicyResult.value;
    const raci = raciResult.value;

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
        return TetherNode.create({
          ...baseProps,
          tetherData: row.action_specific_data?.tetherData || {}
        });
      case ActionNodeType.KB_NODE:
        return KBNode.create({
          ...baseProps,
          kbData: row.action_specific_data?.kbData || {}
        });
      case ActionNodeType.FUNCTION_MODEL_CONTAINER:
        return FunctionModelContainerNode.create({
          ...baseProps,
          containerData: row.action_specific_data?.containerData || {}
        });
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

  // New methods to handle production schema
  private isActionNodeType(nodeType: string): boolean {
    const actionNodeTypes = [
      'tetherNode', 
      'kbNode', 
      'functionModelContainer',
      ActionNodeType.TETHER_NODE,
      ActionNodeType.KB_NODE,
      ActionNodeType.FUNCTION_MODEL_CONTAINER
    ];
    return actionNodeTypes.includes(nodeType as any);
  }

  private nodeRowToNode(row: ProductionNodeRow): Result<Node> {
    const nodeIdResult = NodeId.create(row.node_id);
    const positionResult = Position.create(row.position_x || 0, row.position_y || 0);
    
    if (nodeIdResult.isFailure) {
      return Result.fail(`Invalid node ID: ${nodeIdResult.error}`);
    }
    if (positionResult.isFailure) {
      return Result.fail(`Invalid position: ${positionResult.error}`);
    }
    
    const dependencyResults = (row.dependencies || []).map(dep => NodeId.create(dep));
    for (const depResult of dependencyResults) {
      if (depResult.isFailure) {
        return Result.fail(`Invalid dependency ID: ${depResult.error}`);
      }
    }
    
    const nodeId = nodeIdResult.value;
    const position = positionResult.value;
    const dependencies = dependencyResults.map(r => r.value);

    const baseProps = {
      nodeId,
      name: row.name,
      description: row.description,
      position,
      dependencies,
      status: row.status as NodeStatus,
      metadata: row.metadata || {},
      visualProperties: row.visual_properties || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    // Map production node types to domain node types
    switch (row.node_type) {
      case 'ioNode':
        return IONode.create({
          ...baseProps,
          ioData: row.io_data || {}
        });
      case 'stageNode':
        return StageNode.create({
          ...baseProps,
          stageData: row.stage_data || {}
        });
      default:
        return Result.fail(`Unknown node type: ${row.node_type}`);
    }
  }

  private nodeRowToActionNode(row: ProductionNodeRow): Result<ActionNode> {
    const actionIdResult = NodeId.create(row.node_id); // In production, action nodes use node_id as action_id
    const retryPolicyResult = RetryPolicy.create(row.retry_policy || {});
    const raciResult = RACI.create(row.raci_matrix || {});

    if (actionIdResult.isFailure) {
      return Result.fail(`Invalid action ID: ${actionIdResult.error}`);
    }
    if (retryPolicyResult.isFailure) {
      return Result.fail(`Invalid retry policy: ${retryPolicyResult.error}`);
    }
    if (raciResult.isFailure) {
      return Result.fail(`Invalid RACI: ${raciResult.error}`);
    }

    const actionId = actionIdResult.value;
    const retryPolicy = retryPolicyResult.value;
    const raci = raciResult.value;

    // For action nodes, we need to determine parent node ID from metadata or dependencies
    const parentNodeId = row.dependencies?.[0] ? NodeId.create(row.dependencies[0]) : NodeId.create('parent-node-id');
    if (parentNodeId.isFailure) {
      return Result.fail(`Invalid parent node ID: ${parentNodeId.error}`);
    }

    const baseProps = {
      actionId,
      parentNodeId: parentNodeId.value,
      name: row.name,
      description: row.description,
      executionMode: row.execution_type || 'sequential',
      executionOrder: row.metadata?.execution_order || 0,
      status: row.status as ActionStatus,
      priority: row.metadata?.priority || 1,
      estimatedDuration: row.timeout,
      retryPolicy,
      raci,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    // Map production node types to action node types
    switch (row.node_type) {
      case 'functionModelContainer':
        return FunctionModelContainerNode.create({
          ...baseProps,
          containerData: row.container_data || {}
        });
      default:
        // For backward compatibility, try to create generic action nodes
        return Result.fail(`Unknown action node type: ${row.node_type}`);
    }
  }

  private productionRowToUnifiedNode(row: ProductionNodeRow): Result<UnifiedNode> {
    // Validate required fields
    const nodeIdResult = NodeId.create(row.node_id);
    const positionResult = Position.create(row.position_x || 0, row.position_y || 0);
    
    if (nodeIdResult.isFailure) {
      return Result.fail(`Invalid node ID: ${nodeIdResult.error}`);
    }
    if (positionResult.isFailure) {
      return Result.fail(`Invalid position: ${positionResult.error}`);
    }

    // Process dependencies
    const dependencyResults = (row.dependencies || []).map(dep => NodeId.create(dep));
    for (const depResult of dependencyResults) {
      if (depResult.isFailure) {
        return Result.fail(`Invalid dependency ID: ${depResult.error}`);
      }
    }
    const dependencies = dependencyResults.map(r => r.value);

    // Map production node type to domain NodeType enum
    let nodeType: NodeType;
    switch (row.node_type) {
      case 'ioNode':
        nodeType = NodeType.IO_NODE;
        break;
      case 'stageNode':
        nodeType = NodeType.STAGE_NODE;
        break;
      case 'tetherNode':
        nodeType = NodeType.TETHER_NODE;
        break;
      case 'kbNode':
        nodeType = NodeType.KB_NODE;
        break;
      case 'functionModelContainer':
        nodeType = NodeType.FUNCTION_MODEL_CONTAINER;
        break;
      default:
        return Result.fail(`Unknown unified node type: ${row.node_type}`);
    }

    // Build unified node props
    const unifiedNodeProps = {
      nodeId: nodeIdResult.value,
      modelId: row.model_id,
      name: row.name,
      nodeType: nodeType,
      position: positionResult.value,
      dependencies: dependencies,
      executionType: ExecutionMode.SEQUENTIAL, // Default for now
      status: row.status as NodeStatus,
      timeout: row.timeout,
      metadata: {
        ...row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        nodeType: row.node_type // Store original React Flow type in metadata
      },
      visualProperties: row.visual_properties || {},
      
      // Type-specific data based on node type
      ioData: nodeType === NodeType.IO_NODE ? row.io_data : undefined,
      stageData: nodeType === NodeType.STAGE_NODE ? row.stage_data : undefined,
      tetherData: nodeType === NodeType.TETHER_NODE ? row.action_data : undefined,
      kbData: nodeType === NodeType.KB_NODE ? row.action_data : undefined,
      containerData: nodeType === NodeType.FUNCTION_MODEL_CONTAINER ? row.container_data : undefined
    };

    // Create the unified node
    return UnifiedNode.create(unifiedNodeProps);
  }

  private actionNodeFromDomain(action: ActionNode, modelId: string): ProductionNodeRow {
    return {
      node_id: action.actionId.toString(),
      model_id: modelId,
      node_type: this.mapActionNodeTypeToProduction(action.getActionType()),
      name: action.name,
      description: action.description,
      position_x: action.metadata?.position?.x || 0,
      position_y: action.metadata?.position?.y || 0,
      dependencies: [action.parentNodeId.toString()],
      status: action.status,
      metadata: {
        ...action.metadata,
        execution_order: action.executionOrder,
        priority: action.priority
      },
      visual_properties: action.metadata?.visualProperties || {},
      execution_type: action.executionMode,
      timeout: action.estimatedDuration,
      retry_policy: action.retryPolicy.toObject(),
      raci_matrix: action.raci.toObject(),
      // Type-specific data
      container_data: action instanceof FunctionModelContainerNode ? (action as any).containerData : undefined,
      action_data: this.extractActionTypeData(action),
      created_at: action.createdAt.toISOString(),
      updated_at: action.updatedAt.toISOString()
    };
  }

  private mapActionNodeTypeToProduction(actionType: ActionNodeType): string {
    const mapping: Record<ActionNodeType, string> = {
      [ActionNodeType.TETHER_NODE]: 'tetherNode',
      [ActionNodeType.KB_NODE]: 'kbNode',
      [ActionNodeType.FUNCTION_MODEL_CONTAINER]: 'functionModelContainer'
    };
    return mapping[actionType] || 'functionModelContainer';
  }

  /**
   * Update an existing node in the database
   */
  async updateNode(nodeId: string, updates: { 
    name?: string; 
    description?: string; 
    position?: { x: number; y: number }; 
    metadata?: Record<string, any> 
  }): Promise<Result<Node>> {
    try {
      // First, get the current node to validate it exists
      const { data: currentNodeData, error: fetchError } = await this.supabase
        .from('function_model_nodes')
        .select('*')
        .eq('node_id', nodeId)
        .single();

      if (fetchError || !currentNodeData) {
        return Result.fail(`Node not found: ${nodeId}`);
      }

      // Build update object
      const updateData: Partial<ProductionNodeRow> = {
        updated_at: new Date().toISOString()
      };

      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }

      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }

      if (updates.position) {
        updateData.position_x = updates.position.x;
        updateData.position_y = updates.position.y;
      }

      if (updates.metadata) {
        updateData.metadata = {
          ...currentNodeData.metadata,
          ...updates.metadata
        };
      }

      // Update the node in database
      const { error: updateError } = await this.supabase
        .from('function_model_nodes')
        .update(updateData)
        .eq('node_id', nodeId);

      if (updateError) {
        return Result.fail(this.handleDatabaseError(updateError));
      }

      // Fetch the updated node data
      const { data: updatedNodeData, error: refetchError } = await this.supabase
        .from('function_model_nodes')
        .select('*')
        .eq('node_id', nodeId)
        .single();

      if (refetchError || !updatedNodeData) {
        return Result.fail('Failed to fetch updated node data');
      }

      // Convert back to domain object
      const domainNodeResult = this.nodeRowToDomain(updatedNodeData as ProductionNodeRow);
      if (domainNodeResult.isFailure) {
        return Result.fail(domainNodeResult.error);
      }

      return Result.ok(domainNodeResult.value);

    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  /**
   * Delete a node from the database (alias for removeNode for consistency)
   */
  async deleteNode(nodeId: string): Promise<Result<void>> {
    try {
      // First check if node exists and get its model_id for dependency checks
      const { data: nodeData, error: fetchError } = await this.supabase
        .from('function_model_nodes')
        .select('model_id, node_id')
        .eq('node_id', nodeId)
        .single();

      if (fetchError || !nodeData) {
        return Result.fail(`Node not found: ${nodeId}`);
      }

      // Delete the node
      const { error: deleteError } = await this.supabase
        .from('function_model_nodes')
        .delete()
        .eq('node_id', nodeId);

      if (deleteError) {
        return Result.fail(this.handleDatabaseError(deleteError));
      }

      return Result.ok();

    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  /**
   * Find nodes for a specific model (used by query handlers)
   */
  async findNodesByModelId(modelId: string): Promise<Result<Node[]>> {
    try {
      const { data: nodesData, error: nodesError } = await this.supabase
        .from('function_model_nodes')
        .select('*')
        .eq('model_id', modelId);

      if (nodesError) {
        return Result.fail(this.handleDatabaseError(nodesError));
      }

      if (!nodesData) {
        return Result.ok([]);
      }

      const nodes: Node[] = [];
      
      for (const nodeRow of nodesData as ProductionNodeRow[]) {
        // Only convert container nodes (not action nodes)
        if (!this.isActionNodeType(nodeRow.node_type)) {
          const nodeResult = this.nodeRowToDomain(nodeRow);
          if (nodeResult.isSuccess) {
            nodes.push(nodeResult.value);
          }
        }
      }

      return Result.ok(nodes);

    } catch (error) {
      return Result.fail(this.handleDatabaseError(error));
    }
  }

  /**
   * Create a mock model for development when modelId is not a valid UUID
   */
  private async createMockModel(modelId: string): Promise<Result<FunctionModel | null>> {
    try {
      console.log('🔍 Starting createMockModel for:', modelId);
      
      // Create mock domain objects
      const modelNameResult = ModelName.create(`Mock Model ${modelId}`);
      if (modelNameResult.isFailure) {
        console.error('🔍 ModelName creation failed:', modelNameResult.error);
        return Result.fail(modelNameResult.error);
      }
      console.log('🔍 ModelName created successfully');

      const versionResult = Version.create('1.0.0');
      if (versionResult.isFailure) {
        console.error('🔍 Version creation failed:', versionResult.error);
        return Result.fail(versionResult.error);
      }
      console.log('🔍 Version created successfully');

      // Get development nodes for this model if they exist
      const developmentNodes = SupabaseFunctionModelRepository.developmentNodes.get(modelId) || new Map();
      console.log('🔍 Found', developmentNodes.size, 'development nodes for model:', modelId);

      // Create a mock FunctionModel with all required properties
      const modelProps = {
        modelId: modelId, // Use the provided modelId even if not UUID
        name: modelNameResult.value,
        version: versionResult.value,
        currentVersion: versionResult.value, // Same instance to satisfy validation
        versionCount: 1,
        nodes: developmentNodes, // Include nodes from development store
        actionNodes: new Map(), // Empty action node collection for mock
        status: ModelStatus.DRAFT,
        metadata: {
          author: 'Mock User',
          category: 'Development',
          tags: ['mock', 'development'],
          description: `Mock model for development testing with ID: ${modelId}`
        },
        permissions: {
          owner: 'mock-user',
          editors: [],
          viewers: []
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSavedAt: new Date()
      };
      
      console.log('🔍 About to create FunctionModel with props:', {
        modelId: modelProps.modelId,
        name: modelProps.name.value,
        version: modelProps.version.value,
        status: modelProps.status
      });

      // Use fromDatabase to preserve the exact modelId (including non-UUIDs in development)
      const modelResult = FunctionModel.fromDatabase(modelProps);

      if (modelResult.isFailure) {
        console.error('🔍 FunctionModel creation failed:', modelResult.error);
        return Result.fail(modelResult.error);
      }

      console.log('🔍 FunctionModel created successfully for development:', modelId);
      console.log('🔍 Actual model ID in created model:', modelResult.value.modelId);
      return Result.ok(modelResult.value);

    } catch (error) {
      console.error('🔍 Exception in createMockModel:', error);
      return Result.fail(`Failed to create mock model: ${error}`);
    }
  }

  // UNIFIED NODE INFRASTRUCTURE IMPLEMENTATION
  
  /**
   * Add a UnifiedNode to the database - handles all 5 node types in unified approach
   * Replaces fragmented container/action node persistence with clean architecture
   */
  async addUnifiedNode(modelId: string, node: UnifiedNode): Promise<Result<void>> {
    try {
      console.log('🔍 UNIFIED_ADD_NODE - Starting with:', { 
        modelId, 
        nodeId: node.nodeId.toString(),
        nodeType: node.getNodeType()
      });

      // Check if modelId is a valid UUID - if not, handle as development scenario
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDevelopment && !uuidRegex.test(modelId)) {
        console.log('🔍 UNIFIED_ADD_NODE - Development mode with non-UUID modelId, storing in memory');
        // In development with non-UUID modelIds, create a legacy Node for UI testing
        const legacyNode = this.convertUnifiedNodeToLegacyNode(node);
        if (!SupabaseFunctionModelRepository.developmentNodes.has(modelId)) {
          SupabaseFunctionModelRepository.developmentNodes.set(modelId, new Map());
        }
        const modelNodes = SupabaseFunctionModelRepository.developmentNodes.get(modelId)!;
        modelNodes.set(node.nodeId.toString(), legacyNode);
        console.log('🔍 UNIFIED_ADD_NODE - Node stored in development memory store');
        return Result.ok();
      }

      // Verify model exists for real UUID modelIds
      const modelResult = await this.findById(modelId);
      if (modelResult.isFailure) {
        return Result.fail(`Model verification failed: ${modelResult.error}`);
      }
      if (!modelResult.value) {
        return Result.fail(`Model not found: ${modelId}`);
      }

      // Check for existing node to prevent duplicates
      const { data: existingNode } = await this.supabase
        .from('function_model_nodes')
        .select('node_id')
        .eq('model_id', modelId)
        .eq('node_id', node.nodeId.toString())
        .single();

      if (existingNode) {
        return Result.fail(`Node already exists: ${node.nodeId.toString()}`);
      }

      // Convert UnifiedNode to database row with proper mapping
      const nodeRow = this.unifiedNodeToRow(node, modelId);
      
      // Insert the unified node
      const { error: insertError } = await this.supabase
        .from('function_model_nodes')
        .insert([nodeRow]);

      if (insertError) {
        const handledError = this.handleDatabaseError(insertError);
        console.log('🔍 UNIFIED_ADD_NODE - Insert error:', handledError);
        return Result.fail(handledError);
      }

      console.log('🔍 UNIFIED_ADD_NODE - Successfully added unified node');
      return Result.ok();

    } catch (error) {
      console.log('🔍 UNIFIED_ADD_NODE - Exception:', error);
      const handledError = this.handleDatabaseError(error);
      return Result.fail(handledError);
    }
  }

  /**
   * Convert UnifiedNode domain entity to database row - clean mapping without coercion
   */
  private unifiedNodeToRow(node: UnifiedNode, modelId: string): ProductionNodeRow {
    // Extract type-specific data based on node type
    const typeSpecificData = this.extractUnifiedNodeTypeData(node);
    
    return {
      node_id: node.nodeId.toString(),
      model_id: modelId,
      node_type: node.getNodeType(), // Direct mapping to NodeType enum values
      name: node.name,
      description: undefined, // UnifiedNode doesn't have description field
      position_x: node.position.x,
      position_y: node.position.y,
      dependencies: [], // UnifiedNode doesn't expose dependencies directly
      status: node.status,
      metadata: node.metadata,
      visual_properties: node.visualProperties,
      // Type-specific data fields
      stage_data: typeSpecificData.stageData,
      action_data: typeSpecificData.actionData,
      io_data: typeSpecificData.ioData,
      container_data: typeSpecificData.containerData,
      // Business process fields from UnifiedNode
      execution_type: node.executionType,
      timeout: node.timeout,
      retry_policy: undefined, // UnifiedNode uses different patterns
      raci_matrix: undefined, // UnifiedNode uses different patterns
      sla: undefined,
      kpis: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Extract type-specific data from UnifiedNode based on its type
   */
  private extractUnifiedNodeTypeData(node: UnifiedNode): {
    stageData?: Record<string, any>;
    actionData?: Record<string, any>;
    ioData?: Record<string, any>;
    containerData?: Record<string, any>;
  } {
    const data: any = {};

    try {
      const nodeType = node.getNodeType();
      
      switch (nodeType) {
        case NodeType.IO_NODE:
          data.ioData = node.getIOData();
          break;
        case NodeType.STAGE_NODE:
          data.stageData = node.getStageData();
          break;
        case NodeType.TETHER_NODE:
          data.actionData = { tetherData: node.getTetherData() };
          break;
        case NodeType.KB_NODE:
          data.actionData = { kbData: node.getKBData() };
          break;
        case NodeType.FUNCTION_MODEL_CONTAINER:
          data.containerData = node.getFunctionModelContainerData();
          break;
        default:
          console.warn('🔍 UNIFIED_EXTRACT - Unknown node type:', nodeType);
      }
    } catch (error) {
      console.warn('🔍 UNIFIED_EXTRACT - Failed to extract type-specific data:', error);
      // Return empty data object if extraction fails - node will still persist
    }

    return data;
  }

  /**
   * Convert UnifiedNode to legacy Node for development compatibility
   */
  private convertUnifiedNodeToLegacyNode(unifiedNode: UnifiedNode): Node {
    const nodeType = unifiedNode.getNodeType();
    
    // Map unified types to legacy types
    if (nodeType === NodeType.IO_NODE) {
      return IONode.create({
        nodeId: unifiedNode.nodeId,
        name: unifiedNode.name.value,
        position: unifiedNode.position,
        dependencies: [],
        status: unifiedNode.status,
        metadata: unifiedNode.metadata,
        visualProperties: unifiedNode.visualProperties,
        ioData: unifiedNode.getIOData(),
        createdAt: new Date(),
        updatedAt: new Date()
      }).value!;
    } else if (nodeType === NodeType.STAGE_NODE) {
      return StageNode.create({
        nodeId: unifiedNode.nodeId,
        name: unifiedNode.name.value,
        position: unifiedNode.position,
        dependencies: [],
        status: unifiedNode.status,
        metadata: unifiedNode.metadata,
        visualProperties: unifiedNode.visualProperties,
        stageData: unifiedNode.getStageData(),
        createdAt: new Date(),
        updatedAt: new Date()
      }).value!;
    } else {
      // For action types, create a basic IONode as fallback
      return IONode.create({
        nodeId: unifiedNode.nodeId,
        name: unifiedNode.name.value,
        position: unifiedNode.position,
        dependencies: [],
        status: unifiedNode.status,
        metadata: unifiedNode.metadata,
        visualProperties: unifiedNode.visualProperties,
        ioData: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }).value!;
    }
  }
}