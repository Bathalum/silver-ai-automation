import { createClient } from '@/lib/supabase/client'
import { VersionEntry, VersionMetadata } from '@/lib/application/use-cases/function-model-version-control'

export class FunctionModelVersionRepository {
  private supabase = createClient()

  async create(versionData: Omit<VersionEntry, 'id'>): Promise<VersionEntry> {
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .insert({
        model_id: versionData.modelId,
        version: versionData.version,
        nodes: versionData.nodes,
        edges: versionData.edges,
        change_summary: versionData.changeSummary,
        created_by: versionData.createdBy,
        metadata: this.generateMetadata(versionData)
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
      .eq('version', version)
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
      .eq('id', versionId)

    if (error) {
      throw new Error(`Failed to delete version: ${error.message}`)
    }
  }

  async updateVersion(versionId: string, updates: Partial<VersionEntry>): Promise<VersionEntry> {
    const updateData: any = {}
    
    if (updates.changeSummary !== undefined) {
      updateData.change_summary = updates.changeSummary
    }
    
    if (updates.nodes !== undefined) {
      updateData.nodes = updates.nodes
      updateData.metadata = this.generateMetadata({ nodes: updates.nodes } as any)
    }
    
    if (updates.edges !== undefined) {
      updateData.edges = updates.edges
    }

    const { data, error } = await this.supabase
      .from('function_model_versions')
      .update(updateData)
      .eq('id', versionId)
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
      .select('metadata')
      .eq('id', versionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get version metadata: ${error.message}`)
    }

    return data.metadata
  }

  async searchVersions(
    modelId: string,
    searchTerm: string
  ): Promise<VersionEntry[]> {
    const { data, error } = await this.supabase
      .from('function_model_versions')
      .select('*')
      .eq('model_id', modelId)
      .or(`change_summary.ilike.%${searchTerm}%,version.ilike.%${searchTerm}%`)
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
      executionTypes[executionType] = (executionTypes[executionType] || 0) + 1
      
      // Sum duration
      totalDuration += node.data.businessLogic?.estimatedDuration || 0
      
      // Determine max complexity
      const complexity = node.data.businessLogic?.complexity || 'simple'
      if (complexity === 'complex' || (complexity === 'moderate' && maxComplexity === 'simple')) {
        maxComplexity = complexity
      }
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
    return {
      id: dbData.id,
      modelId: dbData.model_id,
      version: dbData.version,
      nodes: dbData.nodes || [],
      edges: dbData.edges || [],
      changeSummary: dbData.change_summary,
      createdAt: new Date(dbData.created_at),
      createdBy: dbData.created_by
    }
  }
} 