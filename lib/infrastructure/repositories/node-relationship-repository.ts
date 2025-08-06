import { createClient } from '@/lib/supabase/client'

export interface NodeRelationship {
  relationshipId: string
  sourceNodeId: string
  targetNodeId: string
  relationshipType: 'parent-child' | 'sibling' | 'reference' | 'dependency'
  metadata: {
    sourceHandle?: string
    targetHandle?: string
    strength: number
    bidirectional: boolean
  }
  createdAt: Date
}

export interface NodeRelationshipRepository {
  create(relationship: Omit<NodeRelationship, 'relationshipId' | 'createdAt'>): Promise<NodeRelationship>
  getById(relationshipId: string): Promise<NodeRelationship | null>
  getByNodeId(nodeId: string): Promise<NodeRelationship[]>
  getByNodeIds(nodeIds: string[]): Promise<NodeRelationship[]>
  getBySourceNode(sourceNodeId: string): Promise<NodeRelationship[]>
  getByTargetNode(targetNodeId: string): Promise<NodeRelationship[]>
  update(relationshipId: string, updates: Partial<NodeRelationship>): Promise<NodeRelationship>
  delete(relationshipId: string): Promise<void>
  deleteByNode(nodeId: string): Promise<void>
  deleteByNodes(nodeIds: string[]): Promise<void>
}

export class SupabaseNodeRelationshipRepository implements NodeRelationshipRepository {
  async create(relationship: Omit<NodeRelationship, 'relationshipId' | 'createdAt'>): Promise<NodeRelationship> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('node_links')
      .insert({
        source_feature: 'function-model',
        source_entity_id: relationship.sourceNodeId,
        source_node_id: relationship.sourceNodeId,
        target_feature: 'function-model',
        target_entity_id: relationship.targetNodeId,
        target_node_id: relationship.targetNodeId,
        link_type: relationship.relationshipType,
        link_strength: relationship.metadata.strength || 1.0,
        link_context: {
          sourceHandle: relationship.metadata.sourceHandle || '',
          targetHandle: relationship.metadata.targetHandle || '',
          bidirectional: relationship.metadata.bidirectional || false
        }
      })
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create relationship:', error)
      throw new Error(`Failed to create relationship: ${error.message}`)
    }
    
    return this.mapToNodeRelationship(data)
  }

  // ADD missing methods for function model relationships
  async getByModelId(modelId: string): Promise<NodeRelationship[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('node_links')
      .select('*')
      .eq('source_entity_id', modelId)
      .eq('source_feature', 'function-model')
    
    if (error) {
      console.error('Failed to get relationships by model ID:', error)
      throw new Error(`Failed to get relationships by model ID: ${error.message}`)
    }
    
    return data.map(this.mapToNodeRelationship)
  }

  async getBySourceNodeId(sourceNodeId: string): Promise<NodeRelationship[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('node_links')
      .select('*')
      .eq('source_node_id', sourceNodeId)
    
    if (error) {
      console.error('Failed to get relationships by source node ID:', error)
      throw new Error(`Failed to get relationships by source node ID: ${error.message}`)
    }
    
    return data.map(this.mapToNodeRelationship)
  }

  async getByTargetNodeId(targetNodeId: string): Promise<NodeRelationship[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('node_links')
      .select('*')
      .eq('target_node_id', targetNodeId)
    
    if (error) {
      console.error('Failed to get relationships by target node ID:', error)
      throw new Error(`Failed to get relationships by target node ID: ${error.message}`)
    }
    
    return data.map(this.mapToNodeRelationship)
  }

  async createFunctionModelRelationship(
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle: string,
    targetHandle: string,
    modelId: string
  ): Promise<NodeRelationship> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('node_links')
      .insert({
        source_feature: 'function-model',
        source_entity_id: modelId,
        source_node_id: sourceNodeId,
        target_feature: 'function-model',
        target_entity_id: modelId,
        target_node_id: targetNodeId,
        link_type: 'references',
        link_strength: 1.0,
        link_context: {
          sourceHandle,
          targetHandle
        }
      })
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create function model relationship:', error)
      throw new Error(`Failed to create function model relationship: ${error.message}`)
    }
    
    return this.mapToNodeRelationship(data)
  }
  
  async getById(relationshipId: string): Promise<NodeRelationship | null> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('node_links')
      .select('*')
      .eq('link_id', relationshipId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // No rows returned
      console.error('Failed to get relationship:', error)
      throw new Error(`Failed to get relationship: ${error.message}`)
    }
    
    return this.mapToNodeRelationship(data)
  }
  
  async getByNodeId(nodeId: string): Promise<NodeRelationship[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('node_links')
      .select('*')
      .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)
    
    if (error) {
      console.error('Failed to get relationships by node:', error)
      throw new Error(`Failed to get relationships by node: ${error.message}`)
    }
    
    return data.map(this.mapToNodeRelationship)
  }
  
  async getByNodeIds(nodeIds: string[]): Promise<NodeRelationship[]> {
    if (nodeIds.length === 0) return []
    
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('node_links')
      .select('*')
      .or(`source_node_id.in.(${nodeIds.join(',')}),target_node_id.in.(${nodeIds.join(',')})`)
    
    if (error) {
      console.error('Failed to get relationships by node IDs:', error)
      throw new Error(`Failed to get relationships by node IDs: ${error.message}`)
    }
    
    return data.map(this.mapToNodeRelationship)
  }
  
  async getBySourceNode(sourceNodeId: string): Promise<NodeRelationship[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('node_links')
      .select('*')
      .eq('source_node_id', sourceNodeId)
    
    if (error) {
      console.error('Failed to get relationships by source node:', error)
      throw new Error(`Failed to get relationships by source node: ${error.message}`)
    }
    
    return data.map(this.mapToNodeRelationship)
  }
  
  async getByTargetNode(targetNodeId: string): Promise<NodeRelationship[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('node_links')
      .select('*')
      .eq('target_node_id', targetNodeId)
    
    if (error) {
      console.error('Failed to get relationships by target node:', error)
      throw new Error(`Failed to get relationships by target node: ${error.message}`)
    }
    
    return data.map(this.mapToNodeRelationship)
  }
  
  async update(relationshipId: string, updates: Partial<NodeRelationship>): Promise<NodeRelationship> {
    const supabase = createClient()
    
    const updateData: any = {}
    if (updates.metadata?.sourceHandle !== undefined) {
      updateData.link_context = { 
        ...updateData.link_context,
        sourceHandle: updates.metadata.sourceHandle 
      }
    }
    if (updates.metadata?.targetHandle !== undefined) {
      updateData.link_context = { 
        ...updateData.link_context,
        targetHandle: updates.metadata.targetHandle 
      }
    }
    if (updates.relationshipType !== undefined) updateData.link_type = updates.relationshipType
    
    const { data, error } = await supabase
      .from('node_links')
      .update(updateData)
      .eq('link_id', relationshipId)
      .select()
      .single()
    
    if (error) {
      console.error('Failed to update relationship:', error)
      throw new Error(`Failed to update relationship: ${error.message}`)
    }
    
    return this.mapToNodeRelationship(data)
  }
  
  async delete(relationshipId: string): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('node_links')
      .delete()
      .eq('link_id', relationshipId)
    
    if (error) {
      console.error('Failed to delete relationship:', error)
      throw new Error(`Failed to delete relationship: ${error.message}`)
    }
  }
  
  async deleteByNode(nodeId: string): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('node_links')
      .delete()
      .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)
    
    if (error) {
      console.error('Failed to delete relationships by node:', error)
      throw new Error(`Failed to delete relationships by node: ${error.message}`)
    }
  }
  
  async deleteByNodes(nodeIds: string[]): Promise<void> {
    if (nodeIds.length === 0) return
    
    const supabase = createClient()
    
    const { error } = await supabase
      .from('node_links')
      .delete()
      .or(`source_node_id.in.(${nodeIds.join(',')}),target_node_id.in.(${nodeIds.join(',')})`)
    
    if (error) {
      console.error('Failed to delete relationships by nodes:', error)
      throw new Error(`Failed to delete relationships by nodes: ${error.message}`)
    }
  }
  
  // IMPROVE error handling and logging
  private mapToNodeRelationship(data: any): NodeRelationship {
    return {
      relationshipId: data.link_id, // Fix: map to relationshipId instead of id
      sourceNodeId: data.source_node_id,
      targetNodeId: data.target_node_id,
      relationshipType: data.link_type, // Fix: map to relationshipType instead of type
      metadata: {
        sourceHandle: data.link_context?.sourceHandle || '',
        targetHandle: data.link_context?.targetHandle || '',
        strength: data.link_strength || 1.0,
        bidirectional: false // Default to false for now
      },
      createdAt: new Date(data.created_at)
    }
  }
} 