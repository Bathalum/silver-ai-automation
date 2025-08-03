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
    console.log('create called with model:', model)
    
    // Generate a new model ID
    const modelId = crypto.randomUUID()
    
    // Create CONTAINER in function_models table
    const containerData = {
      model_id: modelId,
      name: model.name,
      description: model.description || '',
      version: model.version || '1.0.0',
      status: model.status || 'draft',
      ai_agent_config: {},
      metadata: model.metadata || {},
      permissions: model.permissions || {
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canExport: true,
        canVersion: true,
        canCollaborate: true
      },
      current_version: model.currentVersion || '1.0.0',
      version_count: 1
    }

    const { data: containerResult, error: containerError } = await this.supabase
      .from('function_models')
      .insert(containerData)
      .select()
      .single()

    if (containerError) {
      console.error('Failed to create container:', containerError)
      throw new Error(`Failed to create container: ${containerError.message}`)
    }

    // Create initial nodes if provided
    if (model.nodesData && model.nodesData.length > 0) {
      const { error: nodesError } = await this.supabase
        .from('function_model_nodes')
        .insert(model.nodesData.map((node: any) => ({
          node_id: crypto.randomUUID(),
          model_id: modelId,
          node_type: node.type,
          name: node.data?.label || node.id,
          description: node.data?.description || '',
          position_x: node.position?.x || 0,
          position_y: node.position?.y || 0,
          execution_type: 'sequential',
          dependencies: [],
          timeout: null,
          retry_policy: null,
          raci_matrix: null,
          sla: null,
          kpis: null,
          stage_data: node.type === 'stageNode' ? node.data : null,
          action_data: node.type === 'actionTableNode' ? node.data : null,
          io_data: node.type === 'ioNode' ? node.data : null,
          container_data: null,
          metadata: {
            original_node_id: node.id,
            version: model.version || '1.0.0'
          }
        })))

      if (nodesError) {
        console.error('Failed to create nodes:', nodesError)
        throw new Error(`Failed to create nodes: ${nodesError.message}`)
      }
    }

    // Create initial edges if provided
    if (model.edgesData && model.edgesData.length > 0) {
      const { error: edgesError } = await this.supabase
        .from('node_links')
        .insert(model.edgesData.map((edge: any) => ({
          link_id: crypto.randomUUID(),
          source_feature: 'function-model',
          source_entity_id: modelId,
          source_node_id: edge.source,
          target_feature: 'function-model',
          target_entity_id: modelId,
          target_node_id: edge.target,
          link_type: edge.type || 'default',
          link_strength: 1.0,
          link_context: {
            original_edge_id: edge.id,
            version: model.version || '1.0.0',
            edge_data: edge
          },
          visual_properties: edge.style || {},
          created_by: null
        })))

      if (edgesError) {
        console.error('Failed to create edges:', edgesError)
        throw new Error(`Failed to create edges: ${edgesError.message}`)
      }
    }

    // Return the created model
    const createdModel: FunctionModel = {
      ...model,
      modelId: containerResult.model_id,
      createdAt: new Date(containerResult.created_at),
      updatedAt: new Date(containerResult.updated_at),
      lastSavedAt: new Date(containerResult.last_saved_at)
    }

    console.log('Created function model:', createdModel)
    return createdModel
  }

  async getById(modelId: string): Promise<FunctionModel | null> {
    console.log('getById called with modelId:', modelId)
    
    // 1. Load CONTAINER metadata from function_models table
    const { data: containerData, error: containerError } = await this.supabase
      .from('function_models')
      .select('*')
      .eq('model_id', modelId)
      .single()

    if (containerError) {
      if (containerError.code === 'PGRST116') {
        console.log('Container not found:', modelId)
        return null
      }
      console.error('Failed to load container:', containerError)
      throw new Error(`Failed to load container: ${containerError.message}`)
    }

    // 2. Load LATEST VERSION to get current nodes/edges
    const { data: latestVersionData, error: versionError } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 3. Load RELATIONSHIPS from cross_feature_links table (for cross-feature linking)
    const { data: relationshipsData, error: relationshipsError } = await this.supabase
      .from('cross_feature_links')
      .select('*')
      .eq('source_id', modelId)
      .eq('source_feature', 'function-model')

    if (relationshipsError) {
      console.error('Failed to load relationships:', relationshipsError)
      throw new Error(`Failed to load relationships: ${relationshipsError.message}`)
    }

    // 4. Load VERSION HISTORY from function_model_versions table
    const { data: versionData, error: versionHistoryError } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false })

    if (versionHistoryError) {
      console.error('Failed to load version history:', versionHistoryError)
      throw new Error(`Failed to load version history: ${versionHistoryError.message}`)
    }

    // Extract nodes and edges from latest version (or use empty arrays if no version exists)
    let nodes: any[] = []
    let edges: any[] = []
    
    if (latestVersionData && !versionError) {
      const versionSnapshot = latestVersionData.version_data || {}
      nodes = versionSnapshot.nodesData || []
      edges = versionSnapshot.edgesData || []
      console.log('Loaded nodes/edges from latest version:', { nodesCount: nodes.length, edgesCount: edges.length })
    } else {
      console.log('No version found, using empty nodes/edges')
    }

    // Convert relationships to NodeRelationship format
    const relationships = (relationshipsData || []).map((link: any) => ({
      id: link.link_id,
      sourceNodeId: link.node_context?.nodeId || '',
      targetNodeId: '',
      sourceHandle: '',
      targetHandle: '',
      type: 'sibling' as const,
      sourceNodeType: 'stageNode' as const,
      targetNodeType: 'stageNode' as const,
      createdAt: new Date(link.created_at)
    }))

    // Convert version data to VersionEntry format from function_model_versions table
    const versionHistory = (versionData || []).map((version: any) => ({
      version: version.version_number,
      timestamp: new Date(version.created_at),
      author: version.author_id || 'unknown',
      changes: [], // TODO: Parse changes from version_data if available
      snapshot: {
        modelId: modelId,
        version: version.version_number,
        nodesData: version.version_data?.nodesData || [],
        edgesData: version.version_data?.edgesData || [],
        viewportData: version.version_data?.viewportData || {},
        metadata: version.version_data?.metadata || {},
        name: version.version_data?.name,
        description: version.version_data?.description,
        status: version.version_data?.status,
        processType: version.version_data?.processType,
        complexityLevel: version.version_data?.complexityLevel,
        estimatedDuration: version.version_data?.estimatedDuration,
        tags: version.version_data?.tags,
        permissions: version.version_data?.permissions,
        relationships: version.version_data?.relationships,
        createdAt: version.version_data?.createdAt,
        updatedAt: version.version_data?.updatedAt,
        lastSavedAt: version.version_data?.lastSavedAt,
        timestamp: new Date(version.created_at)
      },
      isPublished: version.is_published || false
    })).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Build FunctionModel from CONTAINER + NODES + EDGES + RELATIONSHIPS + VERSION HISTORY
    const model: FunctionModel = {
      modelId: modelId,
      name: containerData.name,
      description: containerData.description || '',
      version: containerData.version,
      status: containerData.status,
      nodesData: nodes,
      edgesData: edges,
      viewportData: containerData.metadata?.viewport || { x: 0, y: 0, zoom: 1 },
      processType: containerData.metadata?.process_type,
      complexityLevel: containerData.metadata?.complexity_level,
      estimatedDuration: containerData.metadata?.estimated_duration,
      tags: containerData.metadata?.tags || [],
      relationships,
      metadata: containerData.metadata || {
        category: '',
        dependencies: [],
        references: [],
        exportSettings: {
          includeMetadata: true,
          includeRelationships: true,
          format: 'json',
          resolution: 'medium'
        },
        collaboration: {
          allowComments: true,
          allowSuggestions: true,
          requireApproval: false,
          autoSave: true,
          saveInterval: 30
        }
      },
      permissions: containerData.permissions || {
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canExport: true,
        canVersion: true,
        canCollaborate: true
      },
      versionHistory,
      currentVersion: containerData.current_version,
      createdAt: new Date(containerData.created_at),
      updatedAt: new Date(containerData.updated_at),
      lastSavedAt: new Date(containerData.last_saved_at)
    }

    console.log('Loaded function model from CONTAINER + NODE-BASED tables:', model)
    return model
  }

  async getAll(): Promise<FunctionModel[]> {
    const { data, error } = await this.supabase
      .from('function_models')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get function models: ${error.message}`)
    }

    // Load all relationships and version history in parallel
    const modelIds = data.map(row => row.model_id)
    
    const [nodeLinksResult, versionsResult] = await Promise.all([
      this.supabase
        .from('node_links')
        .select('*')
        .in('source_entity_id', modelIds)
        .eq('source_feature', 'function-model'),
      this.supabase
        .from('function_model_versions')
        .select('*')
        .in('model_id', modelIds)
        .order('created_at', { ascending: false })
    ])

    const nodeLinksData = nodeLinksResult.data || []
    const versionsData = versionsResult.data || []

    // Group node links by model ID
    const nodeLinksByModel = nodeLinksData.reduce((acc, link: any) => {
      if (!acc[link.source_entity_id]) {
        acc[link.source_entity_id] = []
      }
      acc[link.source_entity_id].push(link)
      return acc
    }, {} as Record<string, any[]>)

    // Group versions by model ID
    const versionsByModel = versionsData.reduce((acc: Record<string, any[]>, version: any) => {
      if (!acc[version.model_id]) {
        acc[version.model_id] = []
      }
      acc[version.model_id].push(version)
      return acc
    }, {} as Record<string, any[]>)

    return data.map(row => {
      const modelId = row.model_id
      
      // Convert node links to NodeRelationship format
      const relationships = (nodeLinksByModel[modelId] || []).map((link: any) => ({
        id: link.link_id,
        sourceNodeId: link.source_node_id || '',
        targetNodeId: link.target_node_id || '',
        sourceHandle: '',
        targetHandle: '',
        type: 'sibling' as const,
        sourceNodeType: 'stageNode' as const,
        targetNodeType: 'stageNode' as const,
        createdAt: new Date(link.created_at)
      }))

      // Convert version data to VersionEntry format from function_model_versions table
      const modelVersions = versionsByModel[modelId] || []
      const versionHistory = modelVersions.map((version: any) => ({
        version: version.version_number,
        timestamp: new Date(version.created_at),
        author: version.author_id || 'unknown',
        changes: [], // TODO: Parse changes from version_data if available
        snapshot: {
          modelId: modelId,
          version: version.version_number,
          nodesData: version.version_data?.nodesData || [],
          edgesData: version.version_data?.edgesData || [],
          viewportData: version.version_data?.viewportData || {},
          metadata: version.version_data?.metadata || {},
          timestamp: new Date(version.created_at)
        },
        isPublished: version.is_published || false
      })).sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      // Get latest version data for nodes/edges
      const latestVersion = modelVersions[0] // Already sorted by created_at desc
      let nodesData: any[] = []
      let edgesData: any[] = []
      
      if (latestVersion && latestVersion.version_data) {
        nodesData = latestVersion.version_data.nodesData || []
        edgesData = latestVersion.version_data.edgesData || []
      }
      
      // Build FunctionModel from CONTAINER + NODES + EDGES
      const model: FunctionModel = {
        modelId: row.model_id,
        name: row.name,
        description: row.description || '',
        version: row.version,
        status: row.status,
        nodesData: nodesData,
        edgesData: edgesData,
        viewportData: row.metadata?.viewport || { x: 0, y: 0, zoom: 1 },
        processType: row.metadata?.process_type,
        complexityLevel: row.metadata?.complexity_level,
        estimatedDuration: row.metadata?.estimated_duration,
        tags: row.metadata?.tags || [],
        relationships,
        metadata: row.metadata || {
          category: '',
          dependencies: [],
          references: [],
          exportSettings: {
            includeMetadata: true,
            includeRelationships: true,
            format: 'json',
            resolution: 'medium'
          },
          collaboration: {
            allowComments: true,
            allowSuggestions: true,
            requireApproval: false,
            autoSave: true,
            saveInterval: 30
          }
        },
        permissions: row.permissions || {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canExport: true,
          canVersion: true,
          canCollaborate: true
        },
        versionHistory,
        currentVersion: row.current_version,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastSavedAt: new Date(row.last_saved_at)
      }
      
      return model
    })
  }

  async update(modelId: string, updates: Partial<FunctionModel>): Promise<FunctionModel> {
    console.log('update called with:', { modelId, updates })
    
    // Update CONTAINER metadata only - nodes and edges are saved in version snapshots
    const containerUpdates: any = {}
    
    if (updates.name !== undefined) containerUpdates.name = updates.name
    if (updates.description !== undefined) containerUpdates.description = updates.description
    if (updates.status !== undefined) containerUpdates.status = updates.status
    if (updates.version !== undefined) containerUpdates.version = updates.version
    if (updates.metadata !== undefined) containerUpdates.metadata = updates.metadata
    if (updates.permissions !== undefined) containerUpdates.permissions = updates.permissions
    if (updates.currentVersion !== undefined) containerUpdates.current_version = updates.currentVersion
    
    const { data, error } = await this.supabase
      .from('function_models')
      .update(containerUpdates)
      .eq('model_id', modelId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update container:', error)
      throw new Error(`Failed to update function model: ${error.message}`)
    }

    // Load relationships and version history for the response
    const [nodeLinksResult, versionsResult] = await Promise.all([
      this.supabase
        .from('cross_feature_links')
        .select('*')
        .eq('source_id', modelId)
        .eq('source_feature', 'function-model'),
      this.supabase
        .from('function_model_versions')
        .select('*')
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })
    ])
    
    const nodeLinksData = nodeLinksResult.data || []
    const versionsData = versionsResult.data || []

    // Build relationships from cross_feature_links
    const relationships = nodeLinksData.map((link: any) => ({
      id: link.link_id,
      sourceNodeId: link.node_context?.nodeId || '',
      targetNodeId: '',
      sourceHandle: '',
      targetHandle: '',
      type: 'sibling' as const,
      sourceNodeType: 'stageNode' as const,
      targetNodeType: 'stageNode' as const,
      createdAt: new Date(link.created_at)
    }))

    // Convert version data to VersionEntry format from function_model_versions table
    const versionHistory = versionsData.map((version: any) => ({
      version: version.version_number,
      timestamp: new Date(version.created_at),
      author: version.author_id || 'unknown',
      changes: [], // TODO: Parse changes from version_data if available
      snapshot: {
        modelId: modelId,
        version: version.version_number,
        nodesData: version.version_data?.nodesData || [],
        edgesData: version.version_data?.edgesData || [],
        viewportData: version.version_data?.viewportData || {},
        metadata: version.version_data?.metadata || {},
        name: version.version_data?.name,
        description: version.version_data?.description,
        status: version.version_data?.status,
        processType: version.version_data?.processType,
        complexityLevel: version.version_data?.complexityLevel,
        estimatedDuration: version.version_data?.estimatedDuration,
        tags: version.version_data?.tags,
        permissions: version.version_data?.permissions,
        relationships: version.version_data?.relationships,
        createdAt: version.version_data?.createdAt,
        updatedAt: version.version_data?.updatedAt,
        lastSavedAt: version.version_data?.lastSavedAt,
        timestamp: new Date(version.created_at)
      },
      isPublished: version.is_published || false
    })).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Build FunctionModel from CONTAINER + RELATIONSHIPS + VERSION HISTORY
    const model: FunctionModel = {
      modelId: modelId,
      name: data.name,
      description: data.description || '',
      version: data.version,
      status: data.status,
      nodesData: updates.nodesData || [], // Use provided nodes data
      edgesData: updates.edgesData || [], // Use provided edges data
      viewportData: data.metadata?.viewport || { x: 0, y: 0, zoom: 1 },
      processType: data.metadata?.process_type,
      complexityLevel: data.metadata?.complexity_level,
      estimatedDuration: data.metadata?.estimated_duration,
      tags: data.metadata?.tags || [],
      relationships,
      metadata: data.metadata || {
        category: '',
        dependencies: [],
        references: [],
        exportSettings: {
          includeMetadata: true,
          includeRelationships: true,
          format: 'json',
          resolution: 'medium'
        },
        collaboration: {
          allowComments: true,
          allowSuggestions: true,
          requireApproval: false,
          autoSave: true,
          saveInterval: 30
        }
      },
      permissions: data.permissions || {
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canExport: true,
        canVersion: true,
        canCollaborate: true
      },
      versionHistory,
      currentVersion: data.current_version,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastSavedAt: new Date(data.last_saved_at)
    }
    
    return model
  }

  async delete(modelId: string): Promise<void> {
    console.log('delete called with modelId:', modelId)
    
    // Delete from all related tables
    const [containerResult, nodesResult, edgesResult, versionsResult] = await Promise.all([
      this.supabase
      .from('function_models')
        .delete()
        .eq('model_id', modelId),
      this.supabase
        .from('function_model_nodes')
        .delete()
        .eq('model_id', modelId),
      this.supabase
        .from('node_links')
        .delete()
        .eq('source_entity_id', modelId)
        .eq('source_feature', 'function-model'),
      this.supabase
        .from('function_model_versions')
      .delete()
      .eq('model_id', modelId)
    ])

    if (containerResult.error) {
      console.error('Failed to delete container:', containerResult.error)
      throw new Error(`Failed to delete function model: ${containerResult.error.message}`)
    }

    console.log('Successfully deleted function model and all related data')
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

    return data.map((row: any) => {
      // Build FunctionModel from CONTAINER data only (for search results)
      const model: FunctionModel = {
        modelId: row.model_id,
        name: row.name,
        description: row.description || '',
        version: row.version,
        status: row.status,
        nodesData: [], // Not loaded for search results
        edgesData: [], // Not loaded for search results
        viewportData: row.metadata?.viewport || { x: 0, y: 0, zoom: 1 },
        processType: row.metadata?.process_type,
        complexityLevel: row.metadata?.complexity_level,
        estimatedDuration: row.metadata?.estimated_duration,
        tags: row.metadata?.tags || [],
        relationships: [],
        metadata: row.metadata || {
          category: '',
          dependencies: [],
          references: [],
          exportSettings: {
            includeMetadata: true,
            includeRelationships: true,
            format: 'json',
            resolution: 'medium'
          },
          collaboration: {
            allowComments: true,
            allowSuggestions: true,
            requireApproval: false,
            autoSave: true,
            saveInterval: 30
          }
        },
        permissions: row.permissions || {
          canView: true,
          canEdit: true,
          canDelete: true,
          canShare: true,
          canExport: true,
          canVersion: true,
          canCollaborate: true
        },
        versionHistory: [],
        currentVersion: row.current_version,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastSavedAt: new Date(row.last_saved_at)
      }
      
      return model
    })
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
    const nodes = await this.getFunctionModelNodes(modelId)
    
    const statistics = {
      totalNodes: nodes.length,
      nodesByType: {} as Record<string, number>,
      nodesByExecutionType: {} as Record<string, number>,
      nodesWithSLA: 0,
      nodesWithKPIs: 0
    }
    
    nodes.forEach(node => {
      // Count by type
      statistics.nodesByType[node.nodeType] = (statistics.nodesByType[node.nodeType] || 0) + 1
      
      // Count by execution type
      const executionType = node.processBehavior?.executionType || 'sequential'
      statistics.nodesByExecutionType[executionType] = (statistics.nodesByExecutionType[executionType] || 0) + 1
      
      // Count nodes with SLA
      if (node.businessLogic?.sla) {
        statistics.nodesWithSLA++
      }
      
      // Count nodes with KPIs
      if (node.businessLogic?.kpis) {
        statistics.nodesWithKPIs++
      }
    })
    
    return statistics
  }

  // Version history methods
  async getVersionHistory(modelId: string): Promise<any[]> {
    console.log('getVersionHistory called with modelId:', modelId)
    
    // Load from function_model_versions table
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      throw new Error(`Failed to get version history: ${error.message}`)
    }

    console.log('Raw version data from database:', data)

    // Convert version data to VersionEntry format
    const versionHistory = (data || []).map((version: any) => ({
      version: version.version_number,
      timestamp: new Date(version.created_at),
      author: version.author_id || 'unknown',
      changes: [], // TODO: Parse changes from version_data if available
      snapshot: {
        modelId: modelId,
        version: version.version_number,
        nodesData: version.version_data?.nodesData || [],
        edgesData: version.version_data?.edgesData || [],
        viewportData: version.version_data?.viewportData || {},
        metadata: version.version_data?.metadata || {},
        name: version.version_data?.name,
        description: version.version_data?.description,
        status: version.version_data?.status,
        processType: version.version_data?.processType,
        complexityLevel: version.version_data?.complexityLevel,
        estimatedDuration: version.version_data?.estimatedDuration,
        tags: version.version_data?.tags,
        permissions: version.version_data?.permissions,
        relationships: version.version_data?.relationships,
        createdAt: version.version_data?.createdAt,
        updatedAt: version.version_data?.updatedAt,
        lastSavedAt: version.version_data?.lastSavedAt,
        timestamp: new Date(version.created_at)
      },
      isPublished: version.is_published || false
    }))

    console.log('Final version history:', versionHistory)
    return versionHistory
  }

  async getVersionById(modelId: string, versionNumber: string): Promise<FunctionModel | null> {
    console.log('getVersionById called with:', { modelId, versionNumber })
    
    // First, get the version data from function_model_versions table
    const { data: versionData, error: versionError } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .eq('version_number', versionNumber)
      .single()

    if (versionError) {
      console.error('Failed to load version:', versionError)
      throw new Error(`Failed to load version: ${versionError.message}`)
    }

    if (!versionData) {
      console.log('Version not found')
      return null
    }

    console.log('Loaded version data:', versionData)

    // Get the container data from function_models table
    const { data: containerData, error: containerError } = await this.supabase
      .from('function_models')
      .select('*')
      .eq('model_id', modelId)
      .single()

    if (containerError) {
      console.error('Failed to load container:', containerError)
      throw new Error(`Failed to load container: ${containerError.message}`)
    }

    // Extract nodes and edges from version_data
    const versionSnapshot = versionData.version_data || {}
    const nodes = versionSnapshot.nodesData || []
    const edges = versionSnapshot.edgesData || []

    console.log('Extracted from version snapshot:', { nodes, edges })

    // Convert to FunctionModel format
    const model: FunctionModel = {
      modelId: modelId,
      name: containerData.name,
      description: containerData.description || '',
      version: versionNumber,
      status: containerData.status,
      nodesData: nodes,
      edgesData: edges,
      viewportData: versionSnapshot.viewportData || { x: 0, y: 0, zoom: 1 },
      processType: containerData.metadata?.process_type,
      complexityLevel: containerData.metadata?.complexity_level,
      estimatedDuration: containerData.metadata?.estimated_duration,
      tags: containerData.metadata?.tags || [],
      relationships: [], // Will be loaded separately if needed
      metadata: containerData.metadata || {
        category: '',
        dependencies: [],
        references: [],
        exportSettings: {
          includeMetadata: true,
          includeRelationships: true,
          format: 'json',
          resolution: 'medium'
        },
        collaboration: {
          allowComments: true,
          allowSuggestions: true,
          requireApproval: false,
          autoSave: true,
          saveInterval: 30
        }
      },
      permissions: containerData.permissions || {
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canExport: true,
        canVersion: true,
        canCollaborate: true
      },
      versionHistory: [],
      currentVersion: versionNumber,
      createdAt: new Date(containerData.created_at),
      updatedAt: new Date(containerData.updated_at),
      lastSavedAt: new Date(containerData.last_saved_at)
    }

    console.log('Converted FunctionModel from version snapshot:', model)
    console.log('Model nodesData length:', model.nodesData?.length)
    console.log('Model edgesData length:', model.edgesData?.length)

    return model
  }

  async saveVersion(modelId: string, versionEntry: any): Promise<void> {
    console.log('saveVersion called with:', { modelId, versionEntry })
    
    // Save version snapshot to function_model_versions table
    const { error: versionError } = await this.supabase
      .from('function_model_versions')
      .insert({
        model_id: modelId,
        version_number: versionEntry.version,
        version_data: {
          nodesData: versionEntry.snapshot.nodesData || [],
          edgesData: versionEntry.snapshot.edgesData || [],
          viewportData: versionEntry.snapshot.viewportData || {},
          metadata: versionEntry.snapshot.metadata || {},
          name: versionEntry.snapshot.name,
          description: versionEntry.snapshot.description,
          status: versionEntry.snapshot.status,
          processType: versionEntry.snapshot.processType,
          complexityLevel: versionEntry.snapshot.complexityLevel,
          estimatedDuration: versionEntry.snapshot.estimatedDuration,
          tags: versionEntry.snapshot.tags,
          permissions: versionEntry.snapshot.permissions,
          relationships: versionEntry.snapshot.relationships,
          createdAt: versionEntry.snapshot.createdAt,
          updatedAt: versionEntry.snapshot.updatedAt,
          lastSavedAt: versionEntry.snapshot.lastSavedAt,
          timestamp: new Date().toISOString()
        },
        author_id: null, // Set to null since we don't have actual user UUID
        is_published: versionEntry.isPublished || false
      })

    if (versionError) {
      console.error('Failed to save version:', versionError)
      throw new Error(`Failed to save version: ${versionError.message}`)
    }

    console.log('Version saved successfully to function_model_versions table')
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
    console.log('createCrossFeatureLink called with:', {
      sourceFeature, sourceId, sourceNodeId, targetFeature, targetId, targetNodeId, linkType, context
    })

    const { data, error } = await this.supabase
      .from('cross_feature_links')
      .insert({
        link_id: crypto.randomUUID(),
        source_feature: sourceFeature,
        source_id: sourceId,
        target_feature: targetFeature,
        target_id: targetId,
        link_type: linkType,
        link_context: context || {},
        link_strength: 1.0,
        created_by: null,
        node_context: sourceNodeId ? { nodeId: sourceNodeId } : {}
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create cross-feature link:', error)
      throw new Error(`Failed to create cross-feature link: ${error.message}`)
    }

    console.log('Cross-feature link created successfully:', data)
    return data
  }

  async getCrossFeatureLinks(sourceId: string, sourceFeature: string): Promise<any[]> {
    console.log('getCrossFeatureLinks called with:', { sourceId, sourceFeature })

    const { data, error } = await this.supabase
      .from('cross_feature_links')
      .select('*')
      .eq('source_id', sourceId)
      .eq('source_feature', sourceFeature)

    if (error) {
      console.error('Failed to get cross-feature links:', error)
      throw new Error(`Failed to get cross-feature links: ${error.message}`)
    }

    console.log('Cross-feature links loaded:', data)
    return data || []
  }

  async updateCrossFeatureLinkContext(linkId: string, context: Record<string, any>): Promise<void> {
    console.log('updateCrossFeatureLinkContext called with:', { linkId, context })

    const { error } = await this.supabase
      .from('cross_feature_links')
      .update({ link_context: context })
      .eq('link_id', linkId)

    if (error) {
      console.error('Failed to update cross-feature link context:', error)
      throw new Error(`Failed to update cross-feature link context: ${error.message}`)
    }

    console.log('Cross-feature link context updated successfully')
  }

  async deleteCrossFeatureLink(linkId: string): Promise<void> {
    console.log('deleteCrossFeatureLink called with:', { linkId })

    const { error } = await this.supabase
      .from('cross_feature_links')
      .delete()
      .eq('link_id', linkId)

    if (error) {
      console.error('Failed to delete cross-feature link:', error)
      throw new Error(`Failed to delete cross-feature link: ${error.message}`)
    }

    console.log('Cross-feature link deleted successfully')
  }
}

// Legacy mapping functions - REMOVED - No longer used in new node-based architecture

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