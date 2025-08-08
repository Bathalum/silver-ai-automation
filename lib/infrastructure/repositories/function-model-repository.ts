// Function Model Repository Implementation
// This file implements the repository pattern for Function Model persistence using Supabase
// Following the Infrastructure Layer Complete Guide

import { createClient } from '@/lib/supabase/client'
import { FunctionModelNode } from '@/lib/domain/entities/function-model-node-types'
import { FunctionModel } from '@/lib/domain/entities/function-model-types'
import { InfrastructureException, NotFoundException } from '@/lib/infrastructure/exceptions/infrastructure-exceptions'
import { ExecutionType } from '@/lib/domain/value-objects/function-model-value-objects'

// Remove inheritance from BaseNodeRepositoryImpl since we're using feature-specific tables
export interface FunctionModelRepository {
  // Function Model specific operations
  createFunctionModel(model: Omit<FunctionModel, 'modelId' | 'createdAt' | 'updatedAt'>): Promise<FunctionModel>
  getFunctionModel(modelId: string): Promise<FunctionModel | null>
  updateFunctionModel(modelId: string, updates: Partial<FunctionModel>): Promise<FunctionModel>
  deleteFunctionModel(modelId: string): Promise<void>
  
  // Node operations within Function Model
  addNodeToFunctionModel(modelId: string, node: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<FunctionModelNode>
  updateNodeInFunctionModel(modelId: string, nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode>
  removeNodeFromFunctionModel(modelId: string, nodeId: string): Promise<void>
  
  // Process-specific operations
  getFunctionModelNodes(modelId: string): Promise<FunctionModelNode[]>
  getFunctionModelWithNodes(modelId: string): Promise<FunctionModel & { nodes: FunctionModelNode[] }>
  
  // Additional operations needed by use cases
  getAllFunctionModels(): Promise<FunctionModel[]>
  getAllFunctionModelsWithNodeStats(): Promise<(FunctionModel & { nodeStats: { totalNodes: number; nodesByType: Record<string, number>; totalConnections: number } })[]>
  getFunctionModelById(modelId: string): Promise<FunctionModel | null>
  duplicateFunctionModel(modelId: string, newName: string): Promise<FunctionModel>
}

export class SupabaseFunctionModelRepository implements FunctionModelRepository {
  private supabase = createClient()

  // Function Model specific operations
  async createFunctionModel(model: Omit<FunctionModel, 'modelId' | 'createdAt' | 'updatedAt'>): Promise<FunctionModel> {
    try {
      const { data, error } = await this.supabase
        .from('function_models')
        .insert({
          name: model.name,
          description: model.description || '',
          version: model.version || '1.0.0',
          status: model.status || 'draft',
          current_version: model.version || '1.0.0',
          version_count: 1,
          ai_agent_config: model.aiAgentConfig || {},
          metadata: model.metadata || {},
          permissions: model.permissions || {}
        })
        .select()
        .single()

      if (error) {
        throw new InfrastructureException(`Failed to create function model: ${error.message}`, 'FUNCTION_MODEL_CREATE_ERROR', 500, { model })
      }

      return this.mapDbToFunctionModel(data)
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to create function model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FUNCTION_MODEL_CREATE_ERROR',
        500,
        { model }
      )
    }
  }

  async getFunctionModel(modelId: string): Promise<FunctionModel | null> {
    try {
      const { data, error } = await this.supabase
        .from('function_models')
        .select('*')
        .eq('model_id', modelId)
        .is('deleted_at', null)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new InfrastructureException(`Failed to get function model: ${error.message}`, 'FUNCTION_MODEL_GET_ERROR', 500, { modelId })
      }

      return this.mapDbToFunctionModel(data)
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get function model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FUNCTION_MODEL_GET_ERROR',
        500,
        { modelId }
      )
    }
  }

  async updateFunctionModel(modelId: string, updates: Partial<FunctionModel>): Promise<FunctionModel> {
    try {
      const updateData: any = {}
      
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.version !== undefined) updateData.version = updates.version
      if (updates.status !== undefined) updateData.status = updates.status
      if (updates.currentVersion !== undefined) updateData.current_version = updates.currentVersion
      if (updates.aiAgentConfig !== undefined) updateData.ai_agent_config = updates.aiAgentConfig
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata
      if (updates.permissions !== undefined) updateData.permissions = updates.permissions
      
      // Update last_saved_at when model is modified
      updateData.last_saved_at = new Date().toISOString()

      const { data, error } = await this.supabase
        .from('function_models')
        .update(updateData)
        .eq('model_id', modelId)
        .select()
        .single()

      if (error) {
        throw new InfrastructureException(`Failed to update function model: ${error.message}`, 'FUNCTION_MODEL_UPDATE_ERROR', 500, { modelId, updates })
      }

      return this.mapDbToFunctionModel(data)
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to update function model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FUNCTION_MODEL_UPDATE_ERROR',
        500,
        { modelId, updates }
      )
    }
  }

  async deleteFunctionModel(modelId: string, deletedBy?: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('function_models')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy
        })
        .eq('model_id', modelId)

      if (error) {
        throw new InfrastructureException(`Failed to delete function model: ${error.message}`, 'FUNCTION_MODEL_DELETE_ERROR', 500, { modelId })
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to delete function model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FUNCTION_MODEL_DELETE_ERROR',
        500,
        { modelId }
      )
    }
  }

  // Node operations within Function Model
  async addNodeToFunctionModel(modelId: string, node: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<FunctionModelNode> {
    try {
      // Add missing properties
      const completeNode: FunctionModelNode = {
        ...node,
        nodeId: crypto.randomUUID(), // Generate proper UUID
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      // Map the node to database format
      const dbNode = this.mapNodeToDb(completeNode, modelId)
      
      const { data, error } = await this.supabase
        .from('function_model_nodes')
        .insert(dbNode)
        .select()
        .single()

      if (error) {
        throw new InfrastructureException(`Failed to add node to function model: ${error.message}`, 'NODE_ADD_ERROR', 500, { modelId, node })
      }

      return this.mapDbToFunctionModelNode(data)
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to add node to function model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_ADD_ERROR',
        500,
        { modelId, node }
      )
    }
  }

  async updateNodeInFunctionModel(modelId: string, nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode> {
    try {
      return await this.updateFunctionModelNode(modelId, nodeId, updates)
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to update node in function model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_UPDATE_ERROR',
        500,
        { modelId, nodeId, updates }
      )
    }
  }

  // Add proper function model node update method
  async updateFunctionModelNode(modelId: string, nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode> {
    try {
      // Map updates to database format
      const dbUpdates: any = {}
      
      if (updates.name !== undefined) {
        // Validate name field length to prevent constraint violations
        if (updates.name.length > 255) {
          throw new InfrastructureException(
            `Name value too long: ${updates.name.length} characters. Maximum allowed: 255`,
            'NODE_UPDATE_ERROR',
            400,
            { modelId, nodeId, updates }
          )
        }
        dbUpdates.name = updates.name
      }
      if (updates.description !== undefined) {
        // Description is text type, no length limit, but validate for reasonable size
        if (updates.description.length > 10000) {
          throw new InfrastructureException(
            `Description value too long: ${updates.description.length} characters. Maximum allowed: 10000`,
            'NODE_UPDATE_ERROR',
            400,
            { modelId, nodeId, updates }
          )
        }
        dbUpdates.description = updates.description
      }
      if (updates.position !== undefined) {
        dbUpdates.position_x = updates.position.x
        dbUpdates.position_y = updates.position.y
      }
      if (updates.nodeType !== undefined) dbUpdates.node_type = updates.nodeType
      if (updates.processBehavior !== undefined) {
        // Extract string value from ExecutionType object to prevent constraint violations
        if (updates.processBehavior.executionType) {
          const executionTypeValue = typeof updates.processBehavior.executionType === 'string' 
            ? updates.processBehavior.executionType 
            : updates.processBehavior.executionType.value
          
          // Validate execution type value length and content
          if (executionTypeValue.length > 20) {
            throw new InfrastructureException(
              `Execution type value too long: ${executionTypeValue.length} characters. Maximum allowed: 20`,
              'NODE_UPDATE_ERROR',
              400,
              { modelId, nodeId, updates }
            )
          }
          
          // Validate that the execution type is one of the allowed values
          const validExecutionTypes = ['sequential', 'parallel', 'conditional']
          if (!validExecutionTypes.includes(executionTypeValue)) {
            throw new InfrastructureException(
              `Invalid execution type: ${executionTypeValue}. Must be one of: ${validExecutionTypes.join(', ')}`,
              'NODE_UPDATE_ERROR',
              400,
              { modelId, nodeId, updates }
            )
          }
          
          dbUpdates.execution_type = executionTypeValue
        }
        dbUpdates.dependencies = updates.processBehavior.dependencies
        dbUpdates.timeout = updates.processBehavior.timeout
        dbUpdates.retry_policy = updates.processBehavior.retryPolicy
      }
      if (updates.businessLogic !== undefined) {
        dbUpdates.raci_matrix = updates.businessLogic.raciMatrix
        dbUpdates.sla = updates.businessLogic.sla
        dbUpdates.kpis = updates.businessLogic.kpis
      }
      if (updates.functionModelData !== undefined) {
        dbUpdates.stage_data = updates.functionModelData.stage
        dbUpdates.action_data = updates.functionModelData.action
        dbUpdates.io_data = updates.functionModelData.io
        dbUpdates.container_data = updates.functionModelData.container
      }
      if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata
      if (updates.visualProperties !== undefined) dbUpdates.visual_properties = updates.visualProperties
      if (updates.status !== undefined) {
        // Validate status field to prevent constraint violations
        const validStatuses = ['active', 'inactive', 'draft', 'archived', 'error']
        if (!validStatuses.includes(updates.status)) {
          throw new InfrastructureException(
            `Invalid status value: ${updates.status}. Must be one of: ${validStatuses.join(', ')}`,
            'NODE_UPDATE_ERROR',
            400,
            { modelId, nodeId, updates }
          )
        }
        dbUpdates.status = updates.status
      }
      
      // Add updated_at timestamp
      dbUpdates.updated_at = new Date().toISOString()

      const { data, error } = await this.supabase
        .from('function_model_nodes')
        .update(dbUpdates)
        .eq('model_id', modelId)
        .eq('node_id', nodeId)
        .select()
        .single()

      if (error) {
        throw new InfrastructureException(`Failed to update function model node: ${error.message}`, 'NODE_UPDATE_ERROR', 500, { modelId, nodeId, updates })
      }

      return this.mapDbToFunctionModelNode(data)
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to update function model node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_UPDATE_ERROR',
        500,
        { modelId, nodeId, updates }
      )
    }
  }

  async removeNodeFromFunctionModel(modelId: string, nodeId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('function_model_nodes')
        .delete()
        .eq('model_id', modelId)
        .eq('node_id', nodeId)

      if (error) {
        throw new InfrastructureException(`Failed to remove node from function model: ${error.message}`, 'NODE_DELETE_ERROR', 500, { modelId, nodeId })
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to remove node from function model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_DELETE_ERROR',
        500,
        { modelId, nodeId }
      )
    }
  }

  // Process-specific operations
  async getFunctionModelNodes(modelId: string): Promise<FunctionModelNode[]> {
    try {
      console.log(`getFunctionModelNodes called for modelId: ${modelId}`)
      
      const { data, error } = await this.supabase
        .from('function_model_nodes')
        .select('*')
        .eq('model_id', modelId)

      if (error) {
        console.error('Database error in getFunctionModelNodes:', error)
        throw new InfrastructureException(`Failed to get function model nodes: ${error.message}`, 'NODES_GET_ERROR', 500, { modelId })
      }

      console.log(`getFunctionModelNodes raw data:`, data)
      console.log(`getFunctionModelNodes data length:`, data?.length || 0)

      const mappedNodes = data.map(this.mapDbToFunctionModelNode)
      console.log(`getFunctionModelNodes mapped nodes:`, mappedNodes)
      console.log(`getFunctionModelNodes mapped nodes length:`, mappedNodes.length)

      return mappedNodes
    } catch (error) {
      console.error('Error in getFunctionModelNodes:', error)
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get function model nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODES_GET_ERROR',
        500,
        { modelId }
      )
    }
  }

  async getFunctionModelWithNodes(modelId: string): Promise<FunctionModel & { nodes: FunctionModelNode[] }> {
    try {
      const [model, nodes] = await Promise.all([
        this.getFunctionModel(modelId),
        this.getFunctionModelNodes(modelId)
      ])

      if (!model) {
        throw new NotFoundException(`Function model not found: ${modelId}`, 'function-model', { modelId })
      }

      return { ...model, nodes }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get function model with nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FUNCTION_MODEL_WITH_NODES_ERROR',
        500,
        { modelId }
      )
    }
  }

  async executeFunctionModel(modelId: string, context?: any): Promise<ExecutionResult> {
    try {
      const model = await this.getFunctionModelWithNodes(modelId)
      if (!model) {
        throw new NotFoundException(`Function model not found: ${modelId}`, 'function-model', { modelId })
      }

      // TODO: Implement actual execution logic
      return {
        success: true,
        result: 'Execution completed',
        executionTime: 0,
        nodesProcessed: model.nodes.length
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to execute function model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FUNCTION_MODEL_EXECUTE_ERROR',
        500,
        { modelId, context }
      )
    }
  }

  // Version control operations
  async getVersionHistory(modelId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('function_model_versions')
        .select('*')
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new InfrastructureException(`Failed to get version history: ${error.message}`, 'VERSION_HISTORY_ERROR', 500, { modelId })
      }

      return data.map((version: any) => ({
        version: version.version_number,
        timestamp: new Date(version.created_at),
        author: version.author_id || 'unknown',
        changes: [],
        snapshot: version.version_data,
        isPublished: version.is_published || false
      }))
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get version history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VERSION_HISTORY_ERROR',
        500,
        { modelId }
      )
    }
  }

  async getVersionById(modelId: string, version: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('function_model_versions')
        .select('*')
        .eq('model_id', modelId)
        .eq('version_number', version)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new InfrastructureException(`Failed to get version: ${error.message}`, 'VERSION_GET_ERROR', 500, { modelId, version })
      }

      return {
        version: data.version_number,
        timestamp: new Date(data.created_at),
        author: data.author_id || 'unknown',
        changes: [],
        snapshot: data.version_data,
        isPublished: data.is_published || false
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get version: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VERSION_GET_ERROR',
        500,
        { modelId, version }
      )
    }
  }

  async getLatestVersion(modelId: string): Promise<FunctionModelNode | null> {
    try {
      const { data, error } = await this.supabase
        .from('function_model_versions')
        .select('*')
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new InfrastructureException(`Failed to get latest version: ${error.message}`, 'LATEST_VERSION_ERROR', 500, { modelId })
      }

      // Map version data to FunctionModelNode
      return this.mapVersionDataToFunctionModelNode(data, modelId)
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get latest version: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LATEST_VERSION_ERROR',
        500,
        { modelId }
      )
    }
  }

  async saveVersion(modelId: string, versionEntry: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('function_model_versions')
        .insert({
          model_id: modelId,
          version_number: versionEntry.version,
          version_data: versionEntry.snapshot,
          author_id: versionEntry.author || 'unknown',
          is_published: versionEntry.isPublished || false
        })

      if (error) {
        throw new InfrastructureException(`Failed to save version: ${error.message}`, 'VERSION_SAVE_ERROR', 500, { modelId, versionEntry })
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to save version: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VERSION_SAVE_ERROR',
        500,
        { modelId, versionEntry }
      )
    }
  }

  // Cross-feature linking methods
  async createCrossFeatureLink(
    sourceFeature: string,
    sourceId: string,
    sourceNodeId: string | null,
    targetFeature: string,
    targetId: string,
    targetNodeId: string | null,
    linkType: string,
    context?: Record<string, any>
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('cross_feature_links')
        .insert({
          source_feature: sourceFeature,
          source_id: sourceId,
          source_node_id: sourceNodeId,
          target_feature: targetFeature,
          target_id: targetId,
          target_node_id: targetNodeId,
          link_type: linkType,
          link_context: context || {},
          link_strength: 1.0,
          node_context: sourceNodeId ? { nodeId: sourceNodeId } : {}
        })
        .select()
        .single()

      if (error) {
        throw new InfrastructureException(`Failed to create cross-feature link: ${error.message}`, 'CROSS_FEATURE_LINK_CREATE_ERROR', 500, { sourceFeature, sourceId, targetFeature, targetId })
      }

      return data
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to create cross-feature link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CROSS_FEATURE_LINK_CREATE_ERROR',
        500,
        { sourceFeature, sourceId, targetFeature, targetId }
      )
    }
  }

  async getCrossFeatureLinks(sourceId: string, sourceFeature: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('cross_feature_links')
        .select('*')
        .eq('source_id', sourceId)
        .eq('source_feature', sourceFeature)

      if (error) {
        throw new InfrastructureException(`Failed to get cross-feature links: ${error.message}`, 'CROSS_FEATURE_LINKS_GET_ERROR', 500, { sourceId, sourceFeature })
      }

      return data
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get cross-feature links: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CROSS_FEATURE_LINKS_GET_ERROR',
        500,
        { sourceId, sourceFeature }
      )
    }
  }

  async getNodeLinks(modelId: string, nodeId: string): Promise<any[]> {
    try {
      let query = this.supabase
        .from('cross_feature_links')
        .select('*')
        .eq('source_id', modelId)
        .eq('source_feature', 'function-model')

      // Only add source_node_id filter if nodeId is provided and not empty
      if (nodeId && nodeId.trim() !== '') {
        query = query.eq('source_node_id', nodeId)
      }

      const { data, error } = await query

      if (error) {
        throw new InfrastructureException(`Failed to get node links: ${error.message}`, 'NODE_LINKS_GET_ERROR', 500, { modelId, nodeId })
      }

      return data
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get node links: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_LINKS_GET_ERROR',
        500,
        { modelId, nodeId }
      )
    }
  }

  async updateCrossFeatureLinkContext(linkId: string, context: Record<string, any>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cross_feature_links')
        .update({ link_context: context })
        .eq('link_id', linkId)

      if (error) {
        throw new InfrastructureException(`Failed to update cross-feature link context: ${error.message}`, 'CROSS_FEATURE_LINK_UPDATE_ERROR', 500, { linkId, context })
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to update cross-feature link context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CROSS_FEATURE_LINK_UPDATE_ERROR',
        500,
        { linkId, context }
      )
    }
  }

  async deleteCrossFeatureLink(linkId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cross_feature_links')
        .delete()
        .eq('link_id', linkId)

      if (error) {
        throw new InfrastructureException(`Failed to delete cross-feature link: ${error.message}`, 'CROSS_FEATURE_LINK_DELETE_ERROR', 500, { linkId })
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to delete cross-feature link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CROSS_FEATURE_LINK_DELETE_ERROR',
        500,
        { linkId }
      )
    }
  }

  // Statistics and analytics
  async getAllFunctionModels(): Promise<FunctionModel[]> {
    try {
      const { data, error } = await this.supabase
        .from('function_models')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })

      if (error) {
        throw new InfrastructureException(`Failed to get function models: ${error.message}`, 'FUNCTION_MODELS_GET_ERROR', 500)
      }

      return data.map(this.mapDbToFunctionModel)
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get function models: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FUNCTION_MODELS_GET_ERROR',
        500
      )
    }
  }

  async getAllFunctionModelsWithNodeStats(): Promise<(FunctionModel & { nodeStats: { totalNodes: number; nodesByType: Record<string, number>; totalConnections: number } })[]> {
    try {
      const models = await this.getAllFunctionModels()
      const results = []

      for (const model of models) {
        const nodes = await this.getFunctionModelNodes(model.modelId)
        const connections = await this.getNodeLinks(model.modelId, '')
        
        // Calculate node stats manually
        const nodesByType: Record<string, number> = {}
        nodes.forEach(node => {
          nodesByType[node.nodeType] = (nodesByType[node.nodeType] || 0) + 1
        })
        
        results.push({
          ...model,
          nodeStats: {
            totalNodes: nodes.length,
            nodesByType,
            totalConnections: connections.length
          }
        })
      }

      return results
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get function models with node stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FUNCTION_MODELS_WITH_STATS_ERROR',
        500
      )
    }
  }

  async getFunctionModelById(modelId: string): Promise<FunctionModel | null> {
    return await this.getFunctionModel(modelId)
  }

  async duplicateFunctionModel(modelId: string, newName: string): Promise<FunctionModel> {
    try {
      const originalModel = await this.getFunctionModelById(modelId)
      if (!originalModel) {
        throw new NotFoundException(`Original model not found: ${modelId}`, 'function-model', { modelId })
      }

      const newModel = await this.createFunctionModel({
        name: newName,
        description: originalModel.description,
        version: '1.0.0',
        status: 'draft',
        currentVersion: '1.0.0',
        versionCount: 1,
        lastSavedAt: new Date(),
        aiAgentConfig: originalModel.aiAgentConfig,
        metadata: originalModel.metadata,
        permissions: originalModel.permissions
      })

      // TODO: Copy all nodes from the original model to the new model
      return newModel
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to duplicate function model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FUNCTION_MODEL_DUPLICATE_ERROR',
        500,
        { modelId, newName }
      )
    }
  }

  // Database mapping methods (required for clean architecture)
  private mapDbToFunctionModel(row: any): FunctionModel {
    return {
      modelId: row.model_id,
      name: row.name,
      description: row.description,
      version: row.version,
      status: row.status,
      currentVersion: row.current_version,
      versionCount: row.version_count,
      lastSavedAt: new Date(row.last_saved_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      deletedBy: row.deleted_by,
      aiAgentConfig: row.ai_agent_config,
      metadata: row.metadata,
      permissions: row.permissions
    }
  }

  private mapNodeToDb(node: FunctionModelNode, modelId: string): any {
    return {
      node_id: node.nodeId,
      model_id: modelId,
      node_type: node.nodeType,
      name: node.name,
      description: node.description,
      position_x: node.position.x,
      position_y: node.position.y,
      metadata: node.metadata,
      visual_properties: node.visualProperties,
      status: node.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  private mapDbToFunctionModelNode(row: any): FunctionModelNode {
    console.log('mapDbToFunctionModelNode called with row:', row)
    
    const mappedNode: FunctionModelNode = {
      nodeId: row.node_id,
      featureType: 'function-model' as const,
      entityId: row.model_id,
      nodeType: row.node_type,
      name: row.name,
      description: row.description,
      position: { x: Number(row.position_x) || 0, y: Number(row.position_y) || 0 },
      visualProperties: row.visual_properties || {
        color: '#3b82f6',
        icon: '📊',
        size: 'medium',
        style: {},
        featureSpecific: {}
      },
      metadata: {
        tags: row.metadata?.tags || [],
        searchKeywords: row.metadata?.searchKeywords || []
      },
      status: row.status || 'active',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      functionModelData: {
        stage: row.stage_data,
        action: row.action_data,
        io: row.io_data,
        container: row.container_data
      },
      processBehavior: {
        executionType: new ExecutionType(row.execution_type || 'sequential'),
        dependencies: row.dependencies || [],
        timeout: row.timeout,
        retryPolicy: row.retry_policy
      },
      businessLogic: {
        raciMatrix: row.raci_matrix,
        sla: row.sla,
        kpis: row.kpis || []
      },
      nodeLinks: []
    }
    
    console.log('Mapped node:', mappedNode)
    return mappedNode
  }

  private mapVersionDataToFunctionModelNode(versionData: any, modelId: string): FunctionModelNode {
    return {
      nodeId: modelId,
      featureType: 'function-model',
      entityId: modelId,
      nodeType: 'stageNode',
      name: versionData.version_data?.name || '',
      description: versionData.version_data?.description || '',
      position: { x: 0, y: 0 },
      visualProperties: versionData.version_data?.visualProperties || {
        color: '#3b82f6',
        icon: '📊',
        size: 'medium',
        style: {},
        featureSpecific: {}
      },
      metadata: versionData.version_data?.metadata || {
        tags: [],
        searchKeywords: [],
        crossFeatureLinks: [],
        aiAgent: undefined,
        vectorEmbedding: undefined
      },
      status: 'active',
      createdAt: new Date(versionData.created_at),
      updatedAt: new Date(versionData.created_at),
      functionModelData: {
        stage: undefined,
        action: undefined,
        io: undefined,
        container: undefined
      },
      processBehavior: {
        executionType: new ExecutionType('sequential'),
        dependencies: [],
        timeout: undefined,
        retryPolicy: undefined
      },
      businessLogic: {
        raciMatrix: undefined,
        sla: undefined,
        kpis: []
      },
      nodeLinks: []
    }
  }
}

// Execution result interface
interface ExecutionResult {
  success: boolean
  result: any
  executionTime: number
  nodesProcessed: number
}

 