// Function Model Edge Repository Implementation
// This file implements the EdgeRepository interface from the Domain layer
// Following DIP: Infrastructure depends on Domain abstractions

import { createClient } from '@/lib/supabase/client'
import { FunctionModelEdge, EdgeRepository } from '@/lib/domain/entities/function-model-types'
import { InfrastructureException } from '@/lib/infrastructure/exceptions/infrastructure-exceptions'

export class SupabaseFunctionModelEdgeRepository implements EdgeRepository {
  private supabase = createClient()

  /**
   * Loads edges for a function model from version data
   * DIP: Implements Domain abstraction, handles Infrastructure details internally
   */
  async getEdgesForModel(modelId: string): Promise<FunctionModelEdge[]> {
    try {
      console.debug(`Loading edges for model: ${modelId}`)

      // First, try to get edges from version data
      const versionEdges = await this.loadEdgesFromVersionData(modelId)
      if (versionEdges.length > 0) {
        console.debug(`Successfully loaded ${versionEdges.length} edges from version data`)
        return versionEdges
      }

      // Fallback: try to get edges from node_links table
      console.debug('No edges found in version data, trying node_links table')
      const nodeLinkEdges = await this.loadEdgesFromNodeLinks(modelId)
      if (nodeLinkEdges.length > 0) {
        console.debug(`Successfully loaded ${nodeLinkEdges.length} edges from node_links table`)
        return nodeLinkEdges
      }

      console.debug('No edges found in either source')
      return []

    } catch (error) {
      console.error('Error loading edges for model:', modelId, error)
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get edges for model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EDGE_LOAD_ERROR',
        500,
        { modelId }
      )
    }
  }

  /**
   * Loads edges from version data
   */
  private async loadEdgesFromVersionData(modelId: string): Promise<FunctionModelEdge[]> {
    try {
      // Get the latest version data which contains edges
      // Add proper headers and error handling for Supabase API
      const { data: versionData, error: versionError } = await this.supabase
        .from('function_model_versions')
        .select('version_data')
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (versionError) {
        // Handle specific Supabase error codes
        if (versionError.code === 'PGRST116' || versionError.message.includes('406')) {
          // No versions found or API rejection, return empty array
          console.debug(`No versions found for model ${modelId} or API rejected query`)
          return []
        }
        throw new InfrastructureException(
          `Failed to get version data for edges: ${versionError.message}`,
          'EDGE_LOAD_ERROR',
          500,
          { modelId }
        )
      }

      if (!versionData) {
        // No versions found, return empty array
        console.debug(`No versions found for model ${modelId}`)
        return []
      }

      console.debug('Version data retrieved:', versionData)

      // Extract edges from version data
      const edges = versionData.version_data?.edges || []
      console.debug(`Found ${edges.length} edges in version data`)
      
      // Debug the edge structure
      this.debugEdgeStructure(edges, 'version_data')
      
      // Convert from version data format to Domain format with error handling
      const convertedEdges: FunctionModelEdge[] = []
      const failedEdges: any[] = []
      
      for (const edge of edges) {
        try {
          const convertedEdge = this.convertVersionEdgeToDomainEdge(edge)
          convertedEdges.push(convertedEdge)
        } catch (error) {
          console.warn('Failed to convert edge, skipping:', edge, error)
          failedEdges.push({ edge, error: error instanceof Error ? error.message : 'Unknown error' })
          // Continue processing other edges instead of failing completely
        }
      }
      
      console.debug(`Successfully converted ${convertedEdges.length} edges, ${failedEdges.length} failed`)
      
      if (failedEdges.length > 0) {
        console.warn('Failed edge conversions:', failedEdges)
      }
      
      // Deduplicate edges based on source and target (keep the first occurrence)
      const uniqueEdges = this.deduplicateEdges(convertedEdges)
      console.debug(`Returning ${uniqueEdges.length} unique edges from version data`)
      
      return uniqueEdges

    } catch (error) {
      console.error('Error loading edges from version data:', error)
      return []
    }
  }

  /**
   * Loads edges from node_links table as fallback
   */
  private async loadEdgesFromNodeLinks(modelId: string): Promise<FunctionModelEdge[]> {
    try {
      console.debug(`Loading edges from node_links table for model: ${modelId}`)

      const { data: nodeLinks, error } = await this.supabase
        .from('node_links')
        .select('*')
        .eq('source_feature', 'function-model')
        .eq('source_entity_id', modelId)
        .or(`target_feature.eq.function-model,and(target_entity_id.eq.${modelId})`)

      if (error) {
        console.error('Error loading from node_links:', error)
        return []
      }

      console.debug(`Found ${nodeLinks?.length || 0} node links`)

      // Debug the node links structure
      this.debugEdgeStructure(nodeLinks || [], 'node_links')

      const convertedEdges: FunctionModelEdge[] = []
      
      for (const link of nodeLinks || []) {
        try {
          const edge: FunctionModelEdge = {
            id: link.link_id,
            sourceNodeId: link.source_node_id || link.source_entity_id,
            targetNodeId: link.target_node_id || link.target_entity_id,
            sourceHandle: link.source_handle,
            targetHandle: link.target_handle,
            type: link.link_type || 'default',
            metadata: link.link_context || {}
          }
          convertedEdges.push(edge)
        } catch (error) {
          console.warn('Failed to convert node link to edge:', link, error)
        }
      }

      console.debug(`Converted ${convertedEdges.length} node links to edges`)
      return convertedEdges

    } catch (error) {
      console.error('Error loading edges from node_links:', error)
      return []
    }
  }

  /**
   * Saves edges for a function model by creating a new version
   * DIP: Implements Domain abstraction, handles Infrastructure details internally
   */
  async saveEdgesForModel(modelId: string, edges: FunctionModelEdge[]): Promise<void> {
    try {
      // Get current version data
      const { data: currentVersion, error: versionError } = await this.supabase
        .from('function_model_versions')
        .select('version_data, version_number')
        .eq('model_id', modelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (versionError && versionError.code !== 'PGRST116') {
        throw new InfrastructureException(
          `Failed to get current version: ${versionError.message}`,
          'EDGE_SAVE_ERROR',
          500,
          { modelId }
        )
      }

      // Prepare new version data
      const currentVersionData = currentVersion?.version_data || { nodes: [], edges: [] }
      const currentVersionNumber = currentVersion?.version_number || '1.0.0'
      
      // Convert Domain edges to version data format
      const versionEdges = edges.map(edge => this.convertDomainEdgeToVersionEdge(edge))
      
      // Create new version with updated edges
      const newVersionData = {
        ...currentVersionData,
        edges: versionEdges
      }

      // Calculate next version number
      const nextVersion = this.calculateNextVersion(currentVersionNumber)

      // Save new version
      const { error: saveError } = await this.supabase
        .from('function_model_versions')
        .insert({
          model_id: modelId,
          version_number: nextVersion,
          version_data: newVersionData,
          author_id: 'system', // TODO: Get from auth context
          is_published: false
        })

      if (saveError) {
        throw new InfrastructureException(
          `Failed to save edges: ${saveError.message}`,
          'EDGE_SAVE_ERROR',
          500,
          { modelId }
        )
      }

    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to save edges for model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EDGE_SAVE_ERROR',
        500,
        { modelId }
      )
    }
  }

  /**
   * Deletes a specific edge
   * DIP: Implements Domain abstraction
   */
  async deleteEdge(edgeId: string): Promise<void> {
    try {
      // This would need to be implemented based on your edge storage strategy
      // For now, we'll need to reload all edges, remove the specific one, and save
      console.warn('deleteEdge not fully implemented - requires edge storage strategy')
    } catch (error) {
      throw new InfrastructureException(
        `Failed to delete edge: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EDGE_DELETE_ERROR',
        500,
        { edgeId }
      )
    }
  }

  /**
   * Updates a specific edge
   * DIP: Implements Domain abstraction
   */
  async updateEdge(edgeId: string, updates: Partial<FunctionModelEdge>): Promise<void> {
    try {
      // This would need to be implemented based on your edge storage strategy
      // For now, we'll need to reload all edges, update the specific one, and save
      console.warn('updateEdge not fully implemented - requires edge storage strategy')
    } catch (error) {
      throw new InfrastructureException(
        `Failed to update edge: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EDGE_UPDATE_ERROR',
        500,
        { edgeId, updates }
      )
    }
  }

  /**
   * Converts version data edge format to Domain edge format
   * DIP: Infrastructure handles data format conversion internally
   */
  private convertVersionEdgeToDomainEdge(versionEdge: any): FunctionModelEdge {
    // Add debug logging to understand the actual data structure
    console.debug('Converting version edge to domain edge:', versionEdge)

    // Validate that we have a valid edge object
    if (!versionEdge || typeof versionEdge !== 'object') {
      console.error('Invalid edge: not an object:', versionEdge)
      throw new InfrastructureException(
        `Invalid edge: not an object`,
        'EDGE_CONVERSION_ERROR',
        400,
        { versionEdge }
      )
    }

    // Handle different possible data structures with better fallback logic
    let edgeData = versionEdge.data || versionEdge
    let edgeId = versionEdge.edgeId || edgeData.id || versionEdge.id

    // Log the structure we're working with
    console.debug('Edge data structure:', {
      versionEdge,
      edgeData,
      edgeId,
      hasSource: !!edgeData?.source,
      hasTarget: !!edgeData?.target,
      hasSourceNodeId: !!edgeData?.sourceNodeId,
      hasTargetNodeId: !!edgeData?.targetNodeId
    })

    // Try multiple possible field names for source and target
    const sourceNodeId = edgeData?.source || edgeData?.sourceNodeId || edgeData?.source_id
    const targetNodeId = edgeData?.target || edgeData?.targetNodeId || edgeData?.target_id

    // Validate that we have the required fields
    if (!sourceNodeId || !targetNodeId) {
      console.error('Invalid edge data structure - missing source or target:', {
        versionEdge,
        edgeData,
        sourceNodeId,
        targetNodeId,
        availableFields: Object.keys(edgeData || {})
      })
      throw new InfrastructureException(
        `Invalid edge data structure: missing required fields (source: ${sourceNodeId}, target: ${targetNodeId})`,
        'EDGE_CONVERSION_ERROR',
        400,
        { versionEdge, edgeData, sourceNodeId, targetNodeId }
      )
    }

    // Ensure we have a valid ID
    if (!edgeId) {
      // Generate a fallback ID if none exists
      edgeId = `edge-${sourceNodeId}-${targetNodeId}-${Date.now()}`
      console.warn('Generated fallback edge ID:', edgeId)
    }

    // Create the domain edge with proper field mapping
    const domainEdge: FunctionModelEdge = {
      id: edgeId,
      sourceNodeId: sourceNodeId,
      targetNodeId: targetNodeId,
      sourceHandle: edgeData.sourceHandle || edgeData.source_handle,
      targetHandle: edgeData.targetHandle || edgeData.target_handle,
      type: edgeData.type || 'default',
      metadata: edgeData.metadata || {}
    }

    console.debug('Successfully converted to domain edge:', domainEdge)
    return domainEdge
  }

  /**
   * Converts Domain edge format to version data edge format
   * DIP: Infrastructure handles data format conversion internally
   */
  private convertDomainEdgeToVersionEdge(domainEdge: FunctionModelEdge): any {
    return {
      edgeId: domainEdge.id,
      data: {
        id: domainEdge.id,
        source: domainEdge.sourceNodeId,
        target: domainEdge.targetNodeId,
        sourceHandle: domainEdge.sourceHandle,
        targetHandle: domainEdge.targetHandle,
        type: domainEdge.type || 'default',
        metadata: domainEdge.metadata || {}
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Calculates the next version number
   * DIP: Infrastructure handles versioning logic internally
   */
  private calculateNextVersion(currentVersion: string): string {
    const versionParts = currentVersion.split('.')
    const major = parseInt(versionParts[0]) || 1
    const minor = parseInt(versionParts[1]) || 0
    const patch = parseInt(versionParts[2]) || 0
    
    return `${major}.${minor}.${patch + 1}`
  }

  /**
   * Deduplicates edges based on source and target node IDs
   * DIP: Infrastructure handles data cleaning internally
   */
  private deduplicateEdges(edges: FunctionModelEdge[]): FunctionModelEdge[] {
    const seen = new Set<string>()
    const uniqueEdges: FunctionModelEdge[] = []
    
    for (const edge of edges) {
      // Validate edge before deduplication
      if (!this.isValidEdge(edge)) {
        console.warn('Skipping invalid edge during deduplication:', edge)
        continue
      }

      // Create a unique key based on source and target
      const key = `${edge.sourceNodeId}-${edge.targetNodeId}`
      
      if (!seen.has(key)) {
        seen.add(key)
        uniqueEdges.push(edge)
      } else {
        console.warn(`Duplicate edge found and removed: ${edge.sourceNodeId} -> ${edge.targetNodeId}`)
      }
    }
    
    return uniqueEdges
  }

  /**
   * Validates that an edge has all required fields
   */
  private isValidEdge(edge: FunctionModelEdge): boolean {
    if (!edge || typeof edge !== 'object') {
      console.warn('Invalid edge: not an object')
      return false
    }

    if (!edge.id || typeof edge.id !== 'string') {
      console.warn('Invalid edge: missing or invalid id')
      return false
    }

    if (!edge.sourceNodeId || typeof edge.sourceNodeId !== 'string') {
      console.warn('Invalid edge: missing or invalid sourceNodeId')
      return false
    }

    if (!edge.targetNodeId || typeof edge.targetNodeId !== 'string') {
      console.warn('Invalid edge: missing or invalid targetNodeId')
      return false
    }

    // Prevent self-loops
    if (edge.sourceNodeId === edge.targetNodeId) {
      console.warn('Invalid edge: self-loop detected')
      return false
    }

    return true
  }

  /**
   * Debug utility to analyze edge data structure
   */
  private debugEdgeStructure(edges: any[], source: string): void {
    console.debug(`=== Edge Debug Info (${source}) ===`)
    console.debug(`Total edges: ${edges.length}`)
    
    if (edges.length === 0) {
      console.debug('No edges found')
      return
    }

    // Sample the first few edges for analysis
    const sampleEdges = edges.slice(0, Math.min(3, edges.length))
    console.debug('Sample edges:', sampleEdges)

    // Analyze field presence
    const fieldAnalysis = {
      hasId: 0,
      hasSource: 0,
      hasTarget: 0,
      hasSourceNodeId: 0,
      hasTargetNodeId: 0,
      hasSourceHandle: 0,
      hasTargetHandle: 0,
      hasType: 0
    }

    edges.forEach(edge => {
      if (edge.id || edge.edgeId) fieldAnalysis.hasId++
      if (edge.source) fieldAnalysis.hasSource++
      if (edge.target) fieldAnalysis.hasTarget++
      if (edge.sourceNodeId) fieldAnalysis.hasSourceNodeId++
      if (edge.targetNodeId) fieldAnalysis.hasTargetNodeId++
      if (edge.sourceHandle) fieldAnalysis.hasSourceHandle++
      if (edge.targetHandle) fieldAnalysis.hasTargetHandle++
      if (edge.type) fieldAnalysis.hasType++
    })

    console.debug('Field presence analysis:', fieldAnalysis)
    console.debug('=== End Edge Debug Info ===')
  }
}
