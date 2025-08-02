// Function Model Repository Implementation
// This file implements the repository pattern for Function Model persistence using Supabase

import { createClient } from '@supabase/supabase-js'
import type { 
  FunctionModel, 
  FunctionModelFilters, 
  SaveOptions, 
  LoadOptions 
} from '../../domain/entities/function-model-types'
import type { 
  CrossFeatureLink, 
  CrossFeatureLinkFilters 
} from '../../domain/entities/cross-feature-link-types'
import type { 
  VersionEntry, 
  VersionFilters 
} from '../../domain/entities/version-control-types'

// Repository interface
export interface FunctionModelRepository {
  // CRUD operations
  create(model: Omit<FunctionModel, 'modelId' | 'createdAt' | 'updatedAt' | 'lastSavedAt'>): Promise<FunctionModel>
  getById(id: string): Promise<FunctionModel | null>
  update(id: string, updates: Partial<FunctionModel>): Promise<FunctionModel>
  delete(id: string): Promise<void>
  
  // Version control
  saveVersion(modelId: string, version: Omit<VersionEntry, 'timestamp'>): Promise<void>
  getVersion(modelId: string, version: string): Promise<FunctionModel | null>
  getVersionHistory(modelId: string): Promise<VersionEntry[]>
  publishVersion(modelId: string, version: string): Promise<void>
  
  // Cross-feature linking
  createCrossFeatureLink(link: Omit<CrossFeatureLink, 'linkId' | 'createdAt'>): Promise<CrossFeatureLink>
  getCrossFeatureLinks(sourceId: string, sourceFeature: string): Promise<CrossFeatureLink[]>
  getLinkedEntities(targetId: string, targetFeature: string): Promise<CrossFeatureLink[]>
  updateLinkContext(linkId: string, context: Record<string, any>): Promise<void>
  deleteCrossFeatureLink(linkId: string): Promise<void>
  
  // NEW: Node-level linking methods
  createNodeLink(
    modelId: string,
    nodeId: string,
    targetFeature: string,
    targetId: string,
    linkType: string,
    context?: Record<string, any>
  ): Promise<CrossFeatureLink>
  
  getNodeLinks(modelId: string, nodeId: string): Promise<CrossFeatureLink[]>
  
  deleteNodeLink(linkId: string): Promise<void>
  
  // NEW: Nested function model methods
  getNestedFunctionModels(modelId: string): Promise<FunctionModel[]>
  
  linkFunctionModelToNode(
    parentModelId: string,
    nodeId: string,
    childModelId: string,
    context?: Record<string, any>
  ): Promise<CrossFeatureLink>
  
  // Search and filtering
  search(query: string, filters: FunctionModelFilters): Promise<FunctionModel[]>
  getByUser(userId: string): Promise<FunctionModel[]>
  getByCategory(category: string): Promise<FunctionModel[]>
  getByProcessType(processType: string): Promise<FunctionModel[]>
  getAll(): Promise<FunctionModel[]>
}

// Supabase Function Model Repository Implementation
export class SupabaseFunctionModelRepository implements FunctionModelRepository {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('Supabase URL:', supabaseUrl)
    console.log('Supabase Key exists:', !!supabaseKey)
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  // CRUD Operations
  async create(model: Omit<FunctionModel, 'modelId' | 'createdAt' | 'updatedAt' | 'lastSavedAt'>): Promise<FunctionModel> {
    const { data, error } = await this.supabase
      .from('function_models')
      .insert({
        name: model.name,
        description: model.description,
        version: model.version,
        status: model.status,
        nodes_data: model.nodesData,
        edges_data: model.edgesData,
        viewport_data: model.viewportData,
        process_type: model.processType,
        complexity_level: model.complexityLevel,
        estimated_duration: model.estimatedDuration,
        tags: model.tags,
        metadata: model.metadata,
        permissions: model.permissions,
        current_version: model.currentVersion,
        version_count: model.versionHistory.length + 1
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create function model: ${error.message}`)
    }

    return this.mapDatabaseToEntity(data)
  }

  async getById(id: string): Promise<FunctionModel | null> {
    const { data, error } = await this.supabase
      .from('function_models')
      .select('*')
      .eq('model_id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to get function model: ${error.message}`)
    }

    return this.mapDatabaseToEntity(data)
  }

  async update(id: string, updates: Partial<FunctionModel>): Promise<FunctionModel> {
    console.log('Updating function model:', id)
    console.log('Updates:', updates)
    
    // First check if the model exists
    const existingModel = await this.getById(id)
    
    if (!existingModel) {
      console.log('Model does not exist, creating new model...')
      // If model doesn't exist, create it
      const createData = {
        model_id: id,
        name: updates.name || 'Untitled Model',
        description: updates.description || '',
        version: updates.version || '1.0.0',
        status: updates.status || 'draft',
        nodes_data: updates.nodesData || [],
        edges_data: updates.edgesData || [],
        viewport_data: updates.viewportData || { x: 0, y: 0, zoom: 1 },
        process_type: updates.processType,
        complexity_level: updates.complexityLevel,
        estimated_duration: updates.estimatedDuration,
        tags: updates.tags || [],
        metadata: updates.metadata || {},
        permissions: updates.permissions || {},
        current_version: updates.currentVersion || '1.0.0',
        version_count: (updates.versionHistory?.length || 0) + 1
      }
      
      console.log('Create data:', createData)
      
      const { data, error } = await this.supabase
        .from('function_models')
        .insert(createData)
        .select()
        .single()

      if (error) {
        console.error('Supabase create error:', error)
        throw new Error(`Failed to create function model: ${error.message}`)
      }

      console.log('Create successful, data:', data)
      return this.mapDatabaseToEntity(data)
    }
    
    // Model exists, proceed with update
    const updateData: any = {}
    
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.version !== undefined) updateData.version = updates.version
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.nodesData !== undefined) updateData.nodes_data = updates.nodesData
    if (updates.edgesData !== undefined) updateData.edges_data = updates.edgesData
    if (updates.viewportData !== undefined) updateData.viewport_data = updates.viewportData
    if (updates.processType !== undefined) updateData.process_type = updates.processType
    if (updates.complexityLevel !== undefined) updateData.complexity_level = updates.complexityLevel
    if (updates.estimatedDuration !== undefined) updateData.estimated_duration = updates.estimatedDuration
    if (updates.tags !== undefined) updateData.tags = updates.tags
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata
    if (updates.permissions !== undefined) updateData.permissions = updates.permissions
    if (updates.currentVersion !== undefined) updateData.current_version = updates.currentVersion
    if (updates.versionHistory !== undefined) updateData.version_count = updates.versionHistory.length

    updateData.updated_at = new Date().toISOString()
    updateData.last_saved_at = new Date().toISOString()

    console.log('Update data:', updateData)
    
    const { data, error } = await this.supabase
      .from('function_models')
      .update(updateData)
      .eq('model_id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      throw new Error(`Failed to update function model: ${error.message}`)
    }

    console.log('Update successful, data:', data)
    return this.mapDatabaseToEntity(data)
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('function_models')
      .update({ 
        deleted_at: new Date().toISOString(),
        deleted_by: (await this.supabase.auth.getUser()).data.user?.id
      })
      .eq('model_id', id)

    if (error) {
      throw new Error(`Failed to delete function model: ${error.message}`)
    }
  }

  // Version Control Operations
  async saveVersion(modelId: string, version: Omit<VersionEntry, 'timestamp'>): Promise<void> {
    const { error } = await this.supabase
      .from('function_model_versions')
      .insert({
        model_id: modelId,
        version_number: version.version,
        version_data: version.snapshot,
        change_summary: version.changes.map(c => c.description).join('; '),
        author_id: (await this.supabase.auth.getUser()).data.user?.id,
        is_published: version.isPublished
      })

    if (error) {
      throw new Error(`Failed to save version: ${error.message}`)
    }
  }

  async getVersion(modelId: string, version: string): Promise<FunctionModel | null> {
    console.log('Repository getVersion called with modelId:', modelId, 'version:', version)
    
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .eq('version_number', version)
      .single()

    if (error) {
      console.error('Repository getVersion error:', error)
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to get version: ${error.message}`)
    }

    console.log('Repository getVersion data:', data)

    // Reconstruct Function Model from version snapshot
    const snapshot = data.version_data
    console.log('Repository getVersion snapshot:', snapshot)
    
    // For old snapshots that don't have complete model data, get the current model to fill in missing fields
    let currentModel: FunctionModel | null = null
    if (!snapshot.name || !snapshot.description || !snapshot.status) {
      console.log('Snapshot missing basic model data, fetching current model...')
      currentModel = await this.getById(modelId)
    }
    
    const reconstructedModel = {
      modelId: snapshot.modelId,
      name: snapshot.name || currentModel?.name || 'Unknown Model',
      description: snapshot.description || currentModel?.description || '',
      version: snapshot.version,
      status: snapshot.status || currentModel?.status || 'draft',
      nodesData: snapshot.nodesData || [],
      edgesData: snapshot.edgesData || [],
      viewportData: snapshot.viewportData || { x: 0, y: 0, zoom: 1 },
      processType: snapshot.processType || currentModel?.processType,
      complexityLevel: snapshot.complexityLevel || currentModel?.complexityLevel,
      estimatedDuration: snapshot.estimatedDuration || currentModel?.estimatedDuration,
      tags: snapshot.tags || currentModel?.tags || [],
      metadata: snapshot.metadata || currentModel?.metadata || {},
      permissions: snapshot.permissions || currentModel?.permissions || {},
      relationships: snapshot.relationships || currentModel?.relationships || [],
      versionHistory: [],
      currentVersion: snapshot.version,
      createdAt: snapshot.createdAt ? new Date(snapshot.createdAt) : currentModel?.createdAt || new Date(),
      updatedAt: snapshot.updatedAt ? new Date(snapshot.updatedAt) : currentModel?.updatedAt || new Date(),
      lastSavedAt: snapshot.lastSavedAt ? new Date(snapshot.lastSavedAt) : currentModel?.lastSavedAt || new Date()
    }
    
    console.log('Repository getVersion reconstructed model:', reconstructedModel)
    return reconstructedModel
  }

  async getVersionHistory(modelId: string): Promise<VersionEntry[]> {
    console.log('Repository getVersionHistory called with modelId:', modelId)
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .order('version_number', { ascending: false })

    if (error) {
      console.error('Repository getVersionHistory error:', error)
      throw new Error(`Failed to get version history: ${error.message}`)
    }

    console.log('Repository getVersionHistory data:', data)
    const result = data.map(row => ({
      version: row.version_number,
      timestamp: new Date(row.created_at),
      author: row.author_id || 'Unknown',
      changes: [], // Would need to parse from change_summary or store separately
      snapshot: row.version_data,
      isPublished: row.is_published
    }))
    console.log('Repository getVersionHistory result:', result)
    return result
  }

  async publishVersion(modelId: string, version: string): Promise<void> {
    const { error } = await this.supabase
      .from('function_model_versions')
      .update({ is_published: true })
      .eq('model_id', modelId)
      .eq('version_number', version)

    if (error) {
      throw new Error(`Failed to publish version: ${error.message}`)
    }
  }

  // Cross-Feature Linking Operations
  async createCrossFeatureLink(link: Omit<CrossFeatureLink, 'linkId' | 'createdAt'>): Promise<CrossFeatureLink> {
    const { data, error } = await this.supabase
      .from('cross_feature_links')
      .insert({
        source_feature: link.sourceFeature,
        source_id: link.sourceId,
        target_feature: link.targetFeature,
        target_id: link.targetId,
        link_type: link.linkType,
        link_context: link.linkContext,
        link_strength: link.linkStrength,
        created_by: (await this.supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create cross-feature link: ${error.message}`)
    }

    return {
      linkId: data.link_id,
      sourceFeature: data.source_feature,
      sourceId: data.source_id,
      targetFeature: data.target_feature,
      targetId: data.target_id,
      linkType: data.link_type,
      linkContext: data.link_context,
      linkStrength: data.link_strength,
      createdAt: new Date(data.created_at),
      createdBy: data.created_by
    }
  }

  async getCrossFeatureLinks(sourceId: string, sourceFeature: string): Promise<CrossFeatureLink[]> {
    const { data, error } = await this.supabase
      .from('cross_feature_links')
      .select('*')
      .eq('source_id', sourceId)
      .eq('source_feature', sourceFeature)

    if (error) {
      throw new Error(`Failed to get cross-feature links: ${error.message}`)
    }

    return data.map(row => ({
      linkId: row.link_id,
      sourceFeature: row.source_feature,
      sourceId: row.source_id,
      targetFeature: row.target_feature,
      targetId: row.target_id,
      linkType: row.link_type,
      linkContext: row.link_context,
      linkStrength: row.link_strength,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by
    }))
  }

  async getLinkedEntities(targetId: string, targetFeature: string): Promise<CrossFeatureLink[]> {
    const { data, error } = await this.supabase
      .from('cross_feature_links')
      .select('*')
      .eq('target_id', targetId)
      .eq('target_feature', targetFeature)

    if (error) {
      throw new Error(`Failed to get linked entities: ${error.message}`)
    }

    return data.map(row => ({
      linkId: row.link_id,
      sourceFeature: row.source_feature,
      sourceId: row.source_id,
      targetFeature: row.target_feature,
      targetId: row.target_id,
      linkType: row.link_type,
      linkContext: row.link_context,
      linkStrength: row.link_strength,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by
    }))
  }

  async updateLinkContext(linkId: string, context: Record<string, any>): Promise<void> {
    const { error } = await this.supabase
      .from('cross_feature_links')
      .update({ link_context: context })
      .eq('link_id', linkId)

    if (error) {
      throw new Error(`Failed to update link context: ${error.message}`)
    }
  }

  async deleteCrossFeatureLink(linkId: string): Promise<void> {
    const { error } = await this.supabase
      .from('cross_feature_links')
      .delete()
      .eq('link_id', linkId)

    if (error) {
      throw new Error(`Failed to delete cross-feature link: ${error.message}`)
    }
  }

  // NEW: Node-level linking methods
  async createNodeLink(
    modelId: string,
    nodeId: string,
    targetFeature: string,
    targetId: string,
    linkType: string,
    context?: Record<string, any>
  ): Promise<CrossFeatureLink> {
    const nodeContext = {
      nodeId,
      nodeType: context?.nodeType || 'stageNode',
      actionId: context?.actionId,
      position: context?.position || { x: 0, y: 0 },
      viewport: context?.viewport || { x: 0, y: 0, zoom: 1 }
    }

    const { data, error } = await this.supabase
      .from('cross_feature_links')
      .insert({
        source_feature: 'function-model',
        source_id: modelId,
        target_feature: targetFeature,
        target_id: targetId,
        link_type: linkType,
        link_context: context || {},
        node_context: nodeContext,
        link_strength: 1.0
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create node link: ${error.message}`)
    }

    return this.mapCrossFeatureLinkFromDatabase(data)
  }

  async getNodeLinks(modelId: string, nodeId: string): Promise<CrossFeatureLink[]> {
    const { data, error } = await this.supabase
      .from('cross_feature_links')
      .select('*')
      .eq('source_feature', 'function-model')
      .eq('source_id', modelId)
      .eq('node_context->>nodeId', nodeId)

    if (error) {
      throw new Error(`Failed to get node links: ${error.message}`)
    }

    return data.map(this.mapCrossFeatureLinkFromDatabase)
  }

  async deleteNodeLink(linkId: string): Promise<void> {
    return this.deleteCrossFeatureLink(linkId)
  }

  // NEW: Nested function model methods
  async getNestedFunctionModels(modelId: string): Promise<FunctionModel[]> {
    const { data, error } = await this.supabase
      .from('cross_feature_links')
      .select('target_id')
      .eq('source_feature', 'function-model')
      .eq('source_id', modelId)
      .eq('link_type', 'nested')

    if (error) {
      throw new Error(`Failed to get nested function models: ${error.message}`)
    }

    const nestedModels: FunctionModel[] = []
    for (const link of data) {
      const model = await this.getById(link.target_id)
      if (model) {
        nestedModels.push(model)
      }
    }

    return nestedModels
  }

  async linkFunctionModelToNode(
    parentModelId: string,
    nodeId: string,
    childModelId: string,
    context?: Record<string, any>
  ): Promise<CrossFeatureLink> {
    return this.createNodeLink(
      parentModelId,
      nodeId,
      'function-model',
      childModelId,
      'nested',
      context
    )
  }

  // Search and Filtering Operations
  async search(query: string, filters: FunctionModelFilters): Promise<FunctionModel[]> {
    let queryBuilder = this.supabase
      .from('function_models')
      .select('*')
      .is('deleted_at', null)

    // Apply text search
    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    }

    // Apply filters
    if (filters.status) {
      queryBuilder = queryBuilder.eq('status', filters.status)
    }
    if (filters.processType) {
      queryBuilder = queryBuilder.eq('process_type', filters.processType)
    }
    if (filters.complexityLevel) {
      queryBuilder = queryBuilder.eq('complexity_level', filters.complexityLevel)
    }
    if (filters.category) {
      queryBuilder = queryBuilder.eq('metadata->>category', filters.category)
    }
    if (filters.tags && filters.tags.length > 0) {
      queryBuilder = queryBuilder.overlaps('tags', filters.tags)
    }
    if (filters.dateRange) {
      queryBuilder = queryBuilder
        .gte('created_at', filters.dateRange.start.toISOString())
        .lte('created_at', filters.dateRange.end.toISOString())
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to search function models: ${error.message}`)
    }

    return data.map(row => this.mapDatabaseToEntity(row))
  }

  async getByUser(userId: string): Promise<FunctionModel[]> {
    const { data, error } = await this.supabase
      .from('function_models')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get function models by user: ${error.message}`)
    }

    return data.map(row => this.mapDatabaseToEntity(row))
  }

  async getByCategory(category: string): Promise<FunctionModel[]> {
    const { data, error } = await this.supabase
      .from('function_models')
      .select('*')
      .is('deleted_at', null)
      .eq('metadata->>category', category)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get function models by category: ${error.message}`)
    }

    return data.map(row => this.mapDatabaseToEntity(row))
  }

  async getByProcessType(processType: string): Promise<FunctionModel[]> {
    const { data, error } = await this.supabase
      .from('function_models')
      .select('*')
      .is('deleted_at', null)
      .eq('process_type', processType)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get function models by process type: ${error.message}`)
    }

    return data.map(row => this.mapDatabaseToEntity(row))
  }

  async getAll(): Promise<FunctionModel[]> {
    const { data, error } = await this.supabase
      .from('function_models')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get all function models: ${error.message}`)
    }

    return data.map(row => this.mapDatabaseToEntity(row))
  }

  // Helper method to map database row to entity
  private mapDatabaseToEntity(row: any): FunctionModel {
    return {
      modelId: row.model_id,
      name: row.name,
      description: row.description,
      version: row.version,
      status: row.status,
      nodesData: row.nodes_data || [],
      edgesData: row.edges_data || [],
      viewportData: row.viewport_data || { x: 0, y: 0, zoom: 1 },
      processType: row.process_type,
      complexityLevel: row.complexity_level,
      estimatedDuration: row.estimated_duration,
      tags: row.tags || [],
      metadata: row.metadata || {},
      permissions: row.permissions || {},
      relationships: row.relationships || [], // Map relationships from database
      versionHistory: [], // Would need to load separately
      currentVersion: row.current_version,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastSavedAt: new Date(row.last_saved_at)
    }
  }
}

// Repository instance
export const functionModelRepository = new SupabaseFunctionModelRepository() 