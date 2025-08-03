// Function Model Repository Implementation
// This file implements the repository pattern for Function Model persistence using Supabase

import { createClient } from '@/lib/supabase/client'
import { FunctionModelNode } from '@/lib/domain/entities/function-model-node-types'

export class FunctionModelRepository {
  private supabase = createClient()

  // Node-based operations for the new architecture
  async createFunctionModelNode(node: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<FunctionModelNode> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .insert({
        model_id: node.modelId,
        node_type: node.nodeType,
        name: node.name,
        description: node.description,
        position_x: node.position.x,
        position_y: node.position.y,
        execution_type: node.processBehavior.executionType,
        dependencies: node.processBehavior.dependencies,
        sla: node.businessLogic.sla,
        kpis: node.businessLogic.kpis,
        stage_data: node.functionModelData.stage || null,
        action_data: node.functionModelData.action || null,
        io_data: node.functionModelData.io || null,
        container_data: node.functionModelData.container || null,
        metadata: node.metadata
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create function model node:', error)
      throw new Error(`Failed to create function model node: ${error.message}`)
    }

    return this.mapDbToFunctionModelNode(data)
  }

  async getFunctionModelNodes(modelId: string): Promise<FunctionModelNode[]> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)

    if (error) {
      console.error('Failed to get function model nodes:', error)
      throw new Error(`Failed to get function model nodes: ${error.message}`)
    }

    return data.map(this.mapDbToFunctionModelNode)
  }

  async getFunctionModelNodeById(modelId: string, nodeId: string): Promise<FunctionModelNode | null> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)
      .eq('node_id', nodeId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Failed to get function model node by ID:', error)
      throw new Error(`Failed to get function model node by ID: ${error.message}`)
    }

    return this.mapDbToFunctionModelNode(data)
  }

  async updateFunctionModelNode(nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode> {
    const updateData = this.mapFunctionModelNodeToDb(updates)
    
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .update(updateData)
      .eq('node_id', nodeId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update function model node:', error)
      throw new Error(`Failed to update function model node: ${error.message}`)
    }

    return this.mapDbToFunctionModelNode(data)
  }

  async deleteFunctionModelNode(nodeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('function_model_nodes')
      .delete()
      .eq('node_id', nodeId)

    if (error) {
      console.error('Failed to delete function model node:', error)
      throw new Error(`Failed to delete function model node: ${error.message}`)
    }
  }

  // Mapping functions to match actual database schema
  private mapFunctionModelNodeToDb(node: Partial<FunctionModelNode>): any {
    return {
      model_id: node.modelId,
      node_type: node.nodeType,
      name: node.name,
      description: node.description,
      position_x: node.position?.x,
      position_y: node.position?.y,
      execution_type: node.processBehavior?.executionType,
      dependencies: node.processBehavior?.dependencies,
      sla: node.businessLogic?.sla,
      kpis: node.businessLogic?.kpis,
      stage_data: node.functionModelData?.stage,
      action_data: node.functionModelData?.action,
      io_data: node.functionModelData?.io,
      container_data: node.functionModelData?.container,
      metadata: node.metadata
    }
  }

  private mapDbToFunctionModelNode(row: any): FunctionModelNode {
    return {
      nodeId: row.node_id,
      modelId: row.model_id,
      type: 'function-model',
      nodeType: row.node_type,
      name: row.name,
      description: row.description,
      position: { x: row.position_x, y: row.position_y },
      metadata: row.metadata,
      functionModelData: {
        stage: row.stage_data,
        action: row.action_data,
        io: row.io_data,
        container: row.container_data
      },
      businessLogic: {
        sla: row.sla,
        kpis: row.kpis,
        complexity: 'simple',
        estimatedDuration: 0
      },
      processBehavior: {
        executionType: row.execution_type,
        dependencies: row.dependencies || [],
        triggers: []
      },
      reactFlowData: {
        draggable: true,
        selectable: true,
        deletable: true
      },
      relationships: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  // Node-based query methods
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

    return data.map(this.mapDbToFunctionModelNode)
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

    return data.map(this.mapDbToFunctionModelNode)
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

    return data.map(this.mapDbToFunctionModelNode)
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

    return data.map(this.mapDbToFunctionModelNode)
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

    return data.map(this.mapDbToFunctionModelNode)
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

    return data.map(this.mapDbToFunctionModelNode)
  }

  // Batch operations for performance optimization
  async bulkCreateNodes(nodes: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>[]): Promise<FunctionModelNode[]> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .insert(nodes.map(node => this.mapFunctionModelNodeToDb(node)))
      .select()

    if (error) {
      console.error('Failed to bulk create nodes:', error)
      throw new Error(`Failed to bulk create nodes: ${error.message}`)
    }

    return data.map(this.mapDbToFunctionModelNode)
  }

  async bulkUpdateNodesById(updates: Array<{ nodeId: string; updates: Partial<FunctionModelNode> }>): Promise<void> {
    const updatePromises = updates.map(({ nodeId, updates }) => 
      this.updateFunctionModelNode(nodeId, updates)
    )
    
    await Promise.all(updatePromises)
  }

  async bulkDeleteNodes(nodeIds: string[]): Promise<void> {
    const { error } = await this.supabase
      .from('function_model_nodes')
      .delete()
      .in('node_id', nodeIds)

    if (error) {
      console.error('Failed to bulk delete nodes:', error)
      throw new Error(`Failed to bulk delete nodes: ${error.message}`)
    }
  }

  // Statistics and analytics
  async getNodeStatistics(modelId: string): Promise<{
    totalNodes: number
    nodesByType: Record<string, number>
    nodesByExecutionType: Record<string, number>
    nodesWithSLA: number
    nodesWithKPIs: number
  }> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)

    if (error) {
      throw new Error(`Failed to get node statistics: ${error.message}`)
    }

    const nodes = data.map(this.mapDbToFunctionModelNode)
    
    const nodesByType = nodes.reduce((acc, node) => {
      acc[node.nodeType] = (acc[node.nodeType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const nodesByExecutionType = nodes.reduce((acc, node) => {
      acc[node.processBehavior.executionType] = (acc[node.processBehavior.executionType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const nodesWithSLA = nodes.filter(node => node.businessLogic.sla).length
    const nodesWithKPIs = nodes.filter(node => node.businessLogic.kpis).length

    return {
      totalNodes: nodes.length,
      nodesByType,
      nodesByExecutionType,
      nodesWithSLA,
      nodesWithKPIs
    }
  }

  // Version control methods
  async getVersionHistory(modelId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to get version history:', error)
      throw new Error(`Failed to get version history: ${error.message}`)
    }

    return data.map((data: any) => ({
      version: data.version_number,
      timestamp: new Date(data.created_at),
      author: data.author_id || 'unknown',
      changes: [], // TODO: Parse changes from version_data if available
      snapshot: {
        modelId: modelId,
        version: data.version_number,
        nodes: data.version_data?.nodes || [],
        edges: data.version_data?.edges || [],
        viewportData: data.version_data?.viewportData || {},
        metadata: data.version_data?.metadata || {},
        name: data.version_data?.name,
        description: data.version_data?.description,
        status: data.version_data?.status,
        processType: data.version_data?.processType,
        complexityLevel: data.version_data?.complexityLevel,
        estimatedDuration: data.version_data?.estimatedDuration,
        tags: data.version_data?.tags,
        permissions: data.version_data?.permissions,
        relationships: data.version_data?.relationships,
        createdAt: data.version_data?.createdAt,
        updatedAt: data.version_data?.updatedAt,
        lastSavedAt: data.version_data?.lastSavedAt,
        timestamp: new Date(data.created_at)
      },
      isPublished: data.is_published || false
    }))
  }

  async getVersionById(modelId: string, version: string): Promise<FunctionModelNode | null> {
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .eq('version', version)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get function model version: ${error.message}`)
    }

    return {
      nodeId: data.model_id,
      type: 'function-model',
      nodeType: 'stageNode',
      name: data.name || '',
      description: data.description || '',
      position: { x: 0, y: 0 },
      metadata: data.version_data?.metadata || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      modelId: data.model_id,
      functionModelData: {},
      businessLogic: {},
      processBehavior: {
        executionType: 'sequential'
      },
      reactFlowData: {},
      relationships: data.version_data?.relationships || []
    }
  }

  async getLatestVersion(modelId: string): Promise<FunctionModelNode | null> {
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get latest function model version: ${error.message}`)
    }

    return {
      nodeId: data.model_id,
      type: 'function-model',
      nodeType: 'stageNode',
      name: data.name || '',
      description: data.description || '',
      position: { x: 0, y: 0 },
      metadata: data.version_data?.metadata || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      modelId: data.model_id,
      functionModelData: {},
      businessLogic: {},
      processBehavior: {
        executionType: 'sequential'
      },
      reactFlowData: {},
      relationships: data.version_data?.relationships || []
    }
  }

  async saveVersion(modelId: string, versionEntry: any): Promise<void> {
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
      console.error('Failed to save version:', error)
      throw new Error(`Failed to save version: ${error.message}`)
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
      console.error('Failed to create cross-feature link:', error)
      throw new Error(`Failed to create cross-feature link: ${error.message}`)
    }

    return data
  }

  async getCrossFeatureLinks(sourceId: string, sourceFeature: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('cross_feature_links')
      .select('*')
      .eq('source_id', sourceId)
      .eq('source_feature', sourceFeature)

    if (error) {
      console.error('Failed to get cross-feature links:', error)
      throw new Error(`Failed to get cross-feature links: ${error.message}`)
    }

    return data
  }

  async getNodeLinks(modelId: string, nodeId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('cross_feature_links')
      .select('*')
      .eq('source_id', modelId)
      .eq('source_feature', 'function-model')
      .eq('source_node_id', nodeId)

    if (error) {
      console.error('Failed to get node links:', error)
      throw new Error(`Failed to get node links: ${error.message}`)
    }

    return data
  }

  async updateCrossFeatureLinkContext(linkId: string, context: Record<string, any>): Promise<void> {
    const { error } = await this.supabase
      .from('cross_feature_links')
      .update({ link_context: context })
      .eq('link_id', linkId)

    if (error) {
      console.error('Failed to update cross-feature link context:', error)
      throw new Error(`Failed to update cross-feature link context: ${error.message}`)
    }
  }

  async deleteCrossFeatureLink(linkId: string): Promise<void> {
    const { error } = await this.supabase
      .from('cross_feature_links')
      .delete()
      .eq('link_id', linkId)

    if (error) {
      console.error('Failed to delete cross-feature link:', error)
      throw new Error(`Failed to delete cross-feature link: ${error.message}`)
    }
  }
}

 