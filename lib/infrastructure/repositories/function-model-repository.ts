// Function Model Repository Implementation
// This file implements the repository pattern for Function Model persistence using Supabase

import { createClient } from '@/lib/supabase/client'
import { FunctionModel } from '@/lib/domain/entities/function-model-types'
import { FunctionModelNode } from '@/lib/domain/entities/function-model-node-types'
import { createFunctionModelNode } from '@/lib/domain/entities/function-model-node-types'

export class FunctionModelRepository {
  private supabase = createClient()

  // Existing methods for backward compatibility
  async create(model: Omit<FunctionModel, 'modelId' | 'createdAt' | 'updatedAt' | 'lastSavedAt'>): Promise<FunctionModel> {
    const { data, error } = await this.supabase
      .from('function_models')
      .insert(mapFunctionModelToDb(model))
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create function model: ${error.message}`)
    }

    return mapDbToFunctionModel(data)
  }

  async getById(modelId: string): Promise<FunctionModel | null> {
    const { data, error } = await this.supabase
      .from('function_models')
      .select('*')
      .eq('model_id', modelId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get function model: ${error.message}`)
    }

    return mapDbToFunctionModel(data)
  }

  async getAll(): Promise<FunctionModel[]> {
    const { data, error } = await this.supabase
      .from('function_models')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get function models: ${error.message}`)
    }

    return data.map(mapDbToFunctionModel)
  }

  async update(modelId: string, updates: Partial<FunctionModel>): Promise<FunctionModel> {
    const { data, error } = await this.supabase
      .from('function_models')
      .update(mapFunctionModelToDb(updates))
      .eq('model_id', modelId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update function model: ${error.message}`)
    }

    return mapDbToFunctionModel(data)
  }

  async delete(modelId: string): Promise<void> {
    const { error } = await this.supabase
      .from('function_models')
      .delete()
      .eq('model_id', modelId)

    if (error) {
      throw new Error(`Failed to delete function model: ${error.message}`)
    }
  }

  async search(query: string, filters?: any): Promise<FunctionModel[]> {
    let queryBuilder = this.supabase
      .from('function_models')
      .select('*')

    // Apply text search
    if (query.trim()) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    }

    // Apply filters
    if (filters?.status) {
      queryBuilder = queryBuilder.eq('status', filters.status)
    }

    if (filters?.category) {
      queryBuilder = queryBuilder.eq('metadata->category', filters.category)
    }

    const { data, error } = await queryBuilder.order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to search function models: ${error.message}`)
    }

    return data.map(mapDbToFunctionModel)
  }

  // Node-specific operations for the new architecture
  async createFunctionModelNode(node: Omit<FunctionModelNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<FunctionModelNode> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .insert(mapFunctionModelNodeToDb(node))
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create function model node: ${error.message}`)
    }

    return mapDbToFunctionModelNode(data)
  }

  async getFunctionModelNodeById(modelId: string, nodeId?: string): Promise<FunctionModelNode | null> {
    let queryBuilder = this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)

    if (nodeId) {
      queryBuilder = queryBuilder.eq('node_id', nodeId)
    }

    const { data, error } = await queryBuilder.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get function model node: ${error.message}`)
    }

    return mapDbToFunctionModelNode(data)
  }

  async getFunctionModelNodes(modelId: string): Promise<FunctionModelNode[]> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get function model nodes: ${error.message}`)
    }

    return data.map(mapDbToFunctionModelNode)
  }

  async updateFunctionModelNode(modelId: string, nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .update(mapFunctionModelNodeToDb(updates))
      .eq('model_id', modelId)
      .eq('node_id', nodeId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update function model node: ${error.message}`)
    }

    return mapDbToFunctionModelNode(data)
  }

  async deleteFunctionModelNode(modelId: string, nodeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('function_model_nodes')
      .delete()
      .eq('model_id', modelId)
      .eq('node_id', nodeId)

    if (error) {
      throw new Error(`Failed to delete function model node: ${error.message}`)
    }
  }

  async getNodesByType(modelId: string, nodeType: FunctionModelNode['nodeType']): Promise<FunctionModelNode[]> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)
      .eq('node_type', nodeType)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get nodes by type: ${error.message}`)
    }

    return data.map(mapDbToFunctionModelNode)
  }

  async searchNodes(modelId: string, query: string): Promise<FunctionModelNode[]> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to search nodes: ${error.message}`)
    }

    return data.map(mapDbToFunctionModelNode)
  }

  async getNodesWithDependencies(modelId: string): Promise<FunctionModelNode[]> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)
      .not('dependencies', 'eq', '{}')
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get nodes with dependencies: ${error.message}`)
    }

    return data.map(mapDbToFunctionModelNode)
  }

  async getNodesByExecutionType(modelId: string, executionType: string): Promise<FunctionModelNode[]> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)
      .eq('execution_type', executionType)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get nodes by execution type: ${error.message}`)
    }

    return data.map(mapDbToFunctionModelNode)
  }

  async getNodesWithSLA(modelId: string): Promise<FunctionModelNode[]> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)
      .not('sla', 'is', null)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get nodes with SLA: ${error.message}`)
    }

    return data.map(mapDbToFunctionModelNode)
  }

  async getNodesWithKPIs(modelId: string): Promise<FunctionModelNode[]> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)
      .not('kpis', 'is', null)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get nodes with KPIs: ${error.message}`)
    }

    return data.map(mapDbToFunctionModelNode)
  }

  async bulkUpdateNodes(modelId: string, updates: Partial<FunctionModelNode>): Promise<void> {
    const { error } = await this.supabase
      .from('function_model_nodes')
      .update(mapFunctionModelNodeToDb(updates))
      .eq('model_id', modelId)

    if (error) {
      throw new Error(`Failed to bulk update nodes: ${error.message}`)
    }
  }

  async getNodeStatistics(modelId: string): Promise<{
    totalNodes: number
    nodesByType: Record<string, number>
    nodesByExecutionType: Record<string, number>
    nodesWithSLA: number
    nodesWithKPIs: number
  }> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('node_type, execution_type, sla, kpis')
      .eq('model_id', modelId)

    if (error) {
      throw new Error(`Failed to get node statistics: ${error.message}`)
    }

    const statistics = {
      totalNodes: data.length,
      nodesByType: {} as Record<string, number>,
      nodesByExecutionType: {} as Record<string, number>,
      nodesWithSLA: 0,
      nodesWithKPIs: 0
    }

    data.forEach(node => {
      // Count by node type
      statistics.nodesByType[node.node_type] = (statistics.nodesByType[node.node_type] || 0) + 1
      
      // Count by execution type
      statistics.nodesByExecutionType[node.execution_type] = (statistics.nodesByExecutionType[node.execution_type] || 0) + 1
      
      // Count nodes with SLA
      if (node.sla) {
        statistics.nodesWithSLA++
      }
      
      // Count nodes with KPIs
      if (node.kpis) {
        statistics.nodesWithKPIs++
      }
    })

    return statistics
  }
}

// Helper functions for backward compatibility
function mapFunctionModelToDb(model: Partial<FunctionModel>): any {
  const dbModel: any = {}
  
  if (model.modelId !== undefined) dbModel.model_id = model.modelId
  if (model.name !== undefined) dbModel.name = model.name
  if (model.description !== undefined) dbModel.description = model.description
  if (model.version !== undefined) dbModel.version = model.version
  if (model.status !== undefined) dbModel.status = model.status
  if (model.nodesData !== undefined) dbModel.nodes_data = model.nodesData // JSONB - no need to stringify
  if (model.edgesData !== undefined) dbModel.edges_data = model.edgesData // JSONB - no need to stringify
  if (model.viewportData !== undefined) dbModel.viewport_data = model.viewportData // JSONB - no need to stringify
  if (model.metadata !== undefined) dbModel.metadata = model.metadata // JSONB - no need to stringify
  if (model.permissions !== undefined) dbModel.permissions = model.permissions // JSONB - no need to stringify
  if (model.versionHistory !== undefined) dbModel.version_history = model.versionHistory // JSONB - no need to stringify
  if (model.currentVersion !== undefined) dbModel.current_version = model.currentVersion
  if (model.tags !== undefined) dbModel.tags = model.tags // Array - no need to stringify
  if (model.relationships !== undefined) dbModel.relationships = model.relationships // JSONB - no need to stringify
  if (model.createdAt !== undefined) dbModel.created_at = model.createdAt.toISOString()
  if (model.updatedAt !== undefined) dbModel.updated_at = model.updatedAt.toISOString()
  if (model.lastSavedAt !== undefined) dbModel.last_saved_at = model.lastSavedAt.toISOString()
  
  return dbModel
}

function mapDbToFunctionModel(row: any): FunctionModel {
  return {
    modelId: row.model_id,
    name: row.name,
    description: row.description,
    version: row.version,
    status: row.status,
    nodesData: row.nodes_data || [], // JSONB - already parsed by Supabase
    edgesData: row.edges_data || [], // JSONB - already parsed by Supabase
    viewportData: row.viewport_data || {},
    metadata: row.metadata || {},
    permissions: row.permissions || {},
    versionHistory: row.version_history || [],
    currentVersion: row.current_version,
    tags: row.tags || [],
    relationships: row.relationships || [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastSavedAt: new Date(row.last_saved_at)
  }
}

// Helper functions for node operations
function mapFunctionModelNodeToDb(node: Partial<FunctionModelNode>): any {
  const dbNode: any = {}
  
  if (node.id !== undefined) dbNode.node_id = node.id
  if (node.featureType !== undefined) dbNode.feature_type = node.featureType
  if (node.nodeType !== undefined) dbNode.node_type = node.nodeType
  if (node.name !== undefined) dbNode.name = node.name
  if (node.description !== undefined) dbNode.description = node.description
  if (node.position !== undefined) {
    dbNode.position_x = node.position.x
    dbNode.position_y = node.position.y
  }
  if (node.visualProperties !== undefined) dbNode.visual_properties = node.visualProperties
  if (node.metadata !== undefined) dbNode.metadata = node.metadata
  if (node.status !== undefined) dbNode.status = node.status
  
  // Function model specific properties
  if (node.functionModelData !== undefined) {
    if (node.functionModelData.stage) dbNode.stage_data = node.functionModelData.stage
    if (node.functionModelData.action) dbNode.action_data = node.functionModelData.action
    if (node.functionModelData.io) dbNode.io_data = node.functionModelData.io
    if (node.functionModelData.container) dbNode.container_data = node.functionModelData.container
  }
  
  if (node.processBehavior !== undefined) {
    if (node.processBehavior.executionType) dbNode.execution_type = node.processBehavior.executionType
    if (node.processBehavior.dependencies) dbNode.dependencies = node.processBehavior.dependencies
    if (node.processBehavior.timeout) dbNode.timeout = node.processBehavior.timeout
    if (node.processBehavior.retryPolicy) dbNode.retry_policy = node.processBehavior.retryPolicy
  }
  
  if (node.businessLogic !== undefined) {
    if (node.businessLogic.raciMatrix) dbNode.raci_matrix = node.businessLogic.raciMatrix
    if (node.businessLogic.sla) dbNode.sla = node.businessLogic.sla
    if (node.businessLogic.kpis) dbNode.kpis = node.businessLogic.kpis
  }
  
  if (node.createdAt !== undefined) dbNode.created_at = node.createdAt.toISOString()
  if (node.updatedAt !== undefined) dbNode.updated_at = node.updatedAt.toISOString()
  
  return dbNode
}

function mapDbToFunctionModelNode(row: any): FunctionModelNode {
  return {
    id: row.node_id,
    featureType: 'function-model' as const,
    nodeType: row.node_type,
    name: row.name,
    description: row.description,
    position: {
      x: parseFloat(row.position_x) || 0,
      y: parseFloat(row.position_y) || 0
    },
    visualProperties: row.visual_properties || {},
    metadata: row.metadata || {},
    status: row.status || 'active',
    functionModelData: {
      stage: row.stage_data,
      action: row.action_data,
      io: row.io_data,
      container: row.container_data
    },
    processBehavior: {
      executionType: row.execution_type || 'sequential',
      dependencies: row.dependencies || [],
      timeout: row.timeout,
      retryPolicy: row.retry_policy
    },
    businessLogic: {
      raciMatrix: row.raci_matrix,
      sla: row.sla,
      kpis: row.kpis
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
} 