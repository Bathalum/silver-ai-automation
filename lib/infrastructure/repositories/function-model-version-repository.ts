import { createClient } from '@/lib/supabase/client'
import { VersionEntry, VersionMetadata } from '@/lib/application/use-cases/function-model-version-control'

export class FunctionModelVersionRepository {
  private supabase = createClient()

  async create(versionData: Omit<VersionEntry, 'id'>): Promise<VersionEntry> {
    // Store all version data in the version_data JSONB column
    const versionDataJson = {
      nodes: versionData.nodes,
      edges: versionData.edges,
      changeSummary: versionData.changeSummary,
      metadata: this.generateMetadata(versionData)
    }

    const { data, error } = await this.supabase
      .from('function_model_versions')
      .insert({
        model_id: versionData.modelId,
        version_number: versionData.version,
        version_data: versionDataJson,
        author_id: versionData.createdBy,
        is_published: false
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create version: ${error.message}`)
    }

    return this.mapDbToVersionEntry(data)
  }

  async getByVersion(modelId: string, version: string): Promise<VersionEntry | null> {
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .eq('version_number', version)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to get version: ${error.message}`)
    }

    return this.mapDbToVersionEntry(data)
  }

  async getVersions(modelId: string): Promise<VersionEntry[]> {
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get versions: ${error.message}`)
    }

    return data.map(this.mapDbToVersionEntry)
  }

  async getLatestVersion(modelId: string): Promise<VersionEntry | null> {
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to get latest version: ${error.message}`)
    }

    return this.mapDbToVersionEntry(data)
  }

  async deleteVersion(versionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('function_model_versions')
      .delete()
      .eq('version_id', versionId)

    if (error) {
      throw new Error(`Failed to delete version: ${error.message}`)
    }
  }

  async updateVersion(versionId: string, updates: Partial<VersionEntry>): Promise<VersionEntry> {
    const updateData: any = {}
    
    if (updates.changeSummary !== undefined || updates.nodes !== undefined || updates.edges !== undefined) {
      // Get current version data
      const currentVersion = await this.getVersionById(versionId)
      if (!currentVersion) {
        throw new Error(`Version ${versionId} not found`)
      }

      // Update version_data JSONB
      const versionData = {
        nodes: updates.nodes || currentVersion.nodes,
        edges: updates.edges || currentVersion.edges,
        changeSummary: updates.changeSummary || currentVersion.changeSummary,
        metadata: this.generateMetadata({ nodes: updates.nodes || currentVersion.nodes } as any)
      }
      
      updateData.version_data = versionData
    }

    const { data, error } = await this.supabase
      .from('function_model_versions')
      .update(updateData)
      .eq('version_id', versionId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update version: ${error.message}`)
    }

    return this.mapDbToVersionEntry(data)
  }

  async getVersionMetadata(versionId: string): Promise<VersionMetadata | null> {
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .select('version_data')
      .eq('version_id', versionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get version metadata: ${error.message}`)
    }

    return data.version_data?.metadata || null
  }

  async searchVersions(
    modelId: string,
    searchTerm: string
  ): Promise<VersionEntry[]> {
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .or(`version_data->>'changeSummary'.ilike.%${searchTerm}%,version_data->>'description'.ilike.%${searchTerm}%,version_data->>'name'.ilike.%${searchTerm}%,version_number.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to search versions: ${error.message}`)
    }

    return data.map(this.mapDbToVersionEntry)
  }

  async getVersionHistory(
    modelId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ versions: VersionEntry[], total: number }> {
    // Get total count
    const { count, error: countError } = await this.supabase
      .from('function_model_versions')
      .select('*', { count: 'exact', head: true })
      .eq('model_id', modelId)

    if (countError) {
      throw new Error(`Failed to get version count: ${countError.message}`)
    }

    // Get versions with pagination
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to get version history: ${error.message}`)
    }

    return {
      versions: data.map(this.mapDbToVersionEntry),
      total: count || 0
    }
  }

  // NEW METHOD: Restore complete model state from version
  async restoreModelFromVersion(modelId: string, version: string): Promise<void> {
    // Get version data
    const versionData = await this.getByVersion(modelId, version)
    if (!versionData) {
      throw new Error(`Version ${version} not found for model ${modelId}`)
    }

    try {
      // Step 1: Clear current model state
      console.log(`Clearing current model state for model ${modelId}`)
      await this.clearModelNodes(modelId)
      await this.clearModelConnections(modelId)

      // Step 2: Restore nodes from version data
      if (versionData.nodes && versionData.nodes.length > 0) {
        console.log(`Restoring ${versionData.nodes.length} nodes from version ${version}`)
        await this.bulkRestoreNodes(modelId, versionData.nodes)
      } else {
        console.log(`No nodes to restore from version ${version}`)
      }

      // Step 3: Restore connections from version data
      if (versionData.edges && versionData.edges.length > 0) {
        console.log(`Restoring ${versionData.edges.length} connections from version ${version}`)
        await this.bulkRestoreConnections(modelId, versionData.edges)
      } else {
        console.log(`No connections to restore from version ${version}`)
      }

      // Step 4: Update model metadata if available
      // Note: VersionEntry doesn't have snapshot property, so we'll skip this for now
      // The model metadata will be updated through the normal model update flow

      console.log(`Successfully restored model ${modelId} to version ${version}`)
    } catch (error) {
      console.error(`Failed to restore model ${modelId} to version ${version}:`, error)
      throw new Error(`Version restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Helper method to clear all nodes for a model
  private async clearModelNodes(modelId: string): Promise<void> {
    const { error } = await this.supabase
      .from('function_model_nodes')
      .delete()
      .eq('model_id', modelId)

    if (error) {
      throw new Error(`Failed to clear model nodes: ${error.message}`)
    }
  }

  // Helper method to clear all connections for a model
  private async clearModelConnections(modelId: string): Promise<void> {
    const { error } = await this.supabase
      .from('node_links')
      .delete()
      .eq('source_entity_id', modelId)
      .eq('source_feature', 'function-model')

    if (error) {
      throw new Error(`Failed to clear model connections: ${error.message}`)
    }
  }

  // Helper method to bulk restore nodes
  private async bulkRestoreNodes(modelId: string, nodes: VersionEntry['nodes']): Promise<void> {
    const nodeData = nodes.map(node => ({
      model_id: modelId,
      node_type: node.data.nodeType,
      name: node.data.name,
      description: node.data.description,
      position_x: node.data.position.x,
      position_y: node.data.position.y,
      execution_type: node.data.processBehavior?.executionType || 'sequential',
      dependencies: node.data.processBehavior?.dependencies || [],
      timeout: node.data.processBehavior?.timeout,
      retry_policy: node.data.processBehavior?.retryPolicy,
      raci_matrix: node.data.businessLogic?.raciMatrix,
      sla: node.data.businessLogic?.sla,
      kpis: node.data.businessLogic?.kpis,
      stage_data: node.data.functionModelData?.stage || null,
      action_data: node.data.functionModelData?.action || null,
      io_data: node.data.functionModelData?.io || null,
      container_data: node.data.functionModelData?.container || null,
      metadata: node.data.metadata || {},
      visual_properties: {} // Default empty visual properties
    }))

    const { error } = await this.supabase
      .from('function_model_nodes')
      .insert(nodeData)

    if (error) {
      throw new Error(`Failed to restore nodes: ${error.message}`)
    }
  }

  // Helper method to bulk restore connections
  private async bulkRestoreConnections(modelId: string, edges: VersionEntry['edges']): Promise<void> {
    const connectionData = edges.map(edge => ({
      source_feature: 'function-model',
      source_entity_id: modelId,
      source_node_id: edge.data.source,
      target_feature: 'function-model',
      target_entity_id: modelId,
      target_node_id: edge.data.target,
      link_type: 'parent-child', // Default link type for function model connections
      link_strength: 1.0,
      link_context: edge.data.data || {},
      visual_properties: edge.data.style || {}
    }))

    const { error } = await this.supabase
      .from('node_links')
      .insert(connectionData)

    if (error) {
      throw new Error(`Failed to restore connections: ${error.message}`)
    }
  }

  // Helper method to update model metadata
  private async updateModelMetadata(modelId: string, snapshot: any): Promise<void> {
    const { error } = await this.supabase
      .from('function_models')
      .update({
        name: snapshot.name,
        description: snapshot.description,
        status: snapshot.status || 'draft',
        version: snapshot.version,
        last_saved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('model_id', modelId)

    if (error) {
      throw new Error(`Failed to update model metadata: ${error.message}`)
    }
  }

  // Helper method to get function model nodes (for validation)
  async getFunctionModelNodes(modelId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)

    if (error) {
      throw new Error(`Failed to get function model nodes: ${error.message}`)
    }

    return data || []
  }

  // Helper method to get node links (for validation)
  async getNodeLinks(modelId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('node_links')
      .select('*')
      .eq('source_entity_id', modelId)
      .eq('source_feature', 'function-model')

    if (error) {
      throw new Error(`Failed to get node links: ${error.message}`)
    }

    return data || []
  }

  // Helper method to get version by ID
  private async getVersionById(versionId: string): Promise<VersionEntry | null> {
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('version_id', versionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get version by ID: ${error.message}`)
    }

    return this.mapDbToVersionEntry(data)
  }

  private generateMetadata(versionData: { nodes: VersionEntry['nodes'] }): VersionMetadata {
    const nodeTypes: Record<string, number> = {}
    const executionTypes: Record<string, number> = {}
    let totalDuration = 0
    let maxComplexity: 'simple' | 'moderate' | 'complex' = 'simple'
    
    versionData.nodes.forEach(node => {
      // Count node types
      nodeTypes[node.data.nodeType] = (nodeTypes[node.data.nodeType] || 0) + 1
      
      // Count execution types
      const executionType = node.data.processBehavior?.executionType || 'sequential'
      const executionTypeString = typeof executionType === 'string' ? executionType : executionType.value
      executionTypes[executionTypeString] = (executionTypes[executionTypeString] || 0) + 1
      
      // Sum duration (default to 0 if not available)
      totalDuration += 0 // Default duration since estimatedDuration doesn't exist in businessLogic
      
      // Default complexity to simple since it doesn't exist in businessLogic
      // No need for comparison since we're defaulting to 'simple'
    })
    
    return {
      totalNodes: versionData.nodes.length,
      totalEdges: 0, // Will be updated when edges are processed
      nodeTypes,
      executionTypes,
      complexity: maxComplexity,
      estimatedDuration: totalDuration
    }
  }

  private mapDbToVersionEntry(dbData: any): VersionEntry {
    // Extract data from version_data JSONB column
    const versionData = dbData.version_data || {}
    
    // Handle both old and new data formats
    let nodes: VersionEntry['nodes'] = []
    let edges: VersionEntry['edges'] = []
    let changeSummary = ''
    
    // Check if this is the new format (with nodes, edges, changeSummary)
    if (versionData.nodes !== undefined || versionData.edges !== undefined) {
      nodes = Array.isArray(versionData.nodes) ? versionData.nodes : []
      edges = Array.isArray(versionData.edges) ? versionData.edges : []
      changeSummary = versionData.changeSummary || ''
    } else {
      // Old format - create empty arrays and use description as change summary
      nodes = []
      edges = []
      changeSummary = versionData.description || versionData.name || 'Legacy version'
    }
    
    return {
      id: dbData.version_id,
      modelId: dbData.model_id,
      version: dbData.version_number,
      nodes,
      edges,
      changeSummary,
      createdAt: new Date(dbData.created_at),
      createdBy: dbData.author_id
    }
  }
} 