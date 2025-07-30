// Unified Node Repository
// Handles all database operations for the unified node system

import { createClient } from '@/lib/supabase/client'
import type { 
  BaseNode, 
  NodeRelationship, 
  AIAgentConfig,
  NodeType,
  RelationshipType,
  FeatureType
} from '@/lib/domain/entities/unified-node-types'

export interface NodeRepository {
  // Node operations
  createNode: (node: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'>) => Promise<BaseNode>
  getNode: (nodeId: string) => Promise<BaseNode | null>
  updateNode: (nodeId: string, updates: Partial<BaseNode>) => Promise<BaseNode>
  deleteNode: (nodeId: string) => Promise<void>
  getNodesByType: (type: FeatureType) => Promise<BaseNode[]>
  getNodesByFeature: (feature: string) => Promise<BaseNode[]>
  getNodesByNodeType: (nodeType: string) => Promise<BaseNode[]>
  
  // Relationship operations
  createRelationship: (relationship: Omit<NodeRelationship, 'relationshipId' | 'createdAt'>) => Promise<NodeRelationship>
  getNodeRelationships: (nodeId: string) => Promise<NodeRelationship[]>
  getIncomingRelationships: (nodeId: string) => Promise<NodeRelationship[]>
  getOutgoingRelationships: (nodeId: string) => Promise<NodeRelationship[]>
  deleteRelationship: (relationshipId: string) => Promise<void>
  deleteRelationshipsByNode: (nodeId: string) => Promise<void>
  
  // AI Agent operations
  createAIAgent: (nodeId: string, config: AIAgentConfig) => Promise<void>
  updateAIAgent: (nodeId: string, config: Partial<AIAgentConfig>) => Promise<void>
  getAIAgent: (nodeId: string) => Promise<AIAgentConfig | null>
  deleteAIAgent: (nodeId: string) => Promise<void>
  
  // Search and query operations
  searchNodes: (query: string, limit?: number) => Promise<BaseNode[]>
  getNodesByTags: (tags: string[]) => Promise<BaseNode[]>
  getRelatedNodes: (nodeId: string, relationshipType?: RelationshipType) => Promise<BaseNode[]>
}

export class SupabaseNodeRepository implements NodeRepository {
  async createNode(node: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<BaseNode> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('nodes')
      .insert({
        type: node.type,
        node_type: node.nodeType,
        name: node.name,
        description: node.description,
        position_x: node.position.x,
        position_y: node.position.y,
        metadata: node.metadata
      })
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create node:', error)
      throw new Error(`Failed to create node: ${error.message}`)
    }
    
    return this.mapToBaseNode(data)
  }
  
  async getNode(nodeId: string): Promise<BaseNode | null> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('node_id', nodeId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // No rows returned
      console.error('Failed to get node:', error)
      throw new Error(`Failed to get node: ${error.message}`)
    }
    
    return this.mapToBaseNode(data)
  }
  
  async updateNode(nodeId: string, updates: Partial<BaseNode>): Promise<BaseNode> {
    const supabase = createClient()
    
    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.position !== undefined) {
      updateData.position_x = updates.position.x
      updateData.position_y = updates.position.y
    }
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata
    if (updates.nodeType !== undefined) updateData.node_type = updates.nodeType
    
    const { data, error } = await supabase
      .from('nodes')
      .update(updateData)
      .eq('node_id', nodeId)
      .select()
      .single()
    
    if (error) {
      console.error('Failed to update node:', error)
      throw new Error(`Failed to update node: ${error.message}`)
    }
    
    return this.mapToBaseNode(data)
  }
  
  async deleteNode(nodeId: string): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('nodes')
      .delete()
      .eq('node_id', nodeId)
    
    if (error) {
      console.error('Failed to delete node:', error)
      throw new Error(`Failed to delete node: ${error.message}`)
    }
  }
  
  async getNodesByType(type: FeatureType): Promise<BaseNode[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to get nodes by type:', error)
      throw new Error(`Failed to get nodes by type: ${error.message}`)
    }
    
    return data.map(this.mapToBaseNode)
  }
  
  async getNodesByFeature(feature: string): Promise<BaseNode[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('metadata->>feature', feature)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to get nodes by feature:', error)
      throw new Error(`Failed to get nodes by feature: ${error.message}`)
    }
    
    return data.map(this.mapToBaseNode)
  }
  
  async getNodesByNodeType(nodeType: string): Promise<BaseNode[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('node_type', nodeType)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to get nodes by node type:', error)
      throw new Error(`Failed to get nodes by node type: ${error.message}`)
    }
    
    return data.map(this.mapToBaseNode)
  }
  
  async createRelationship(relationship: Omit<NodeRelationship, 'relationshipId' | 'createdAt'>): Promise<NodeRelationship> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('node_relationships')
      .insert({
        source_node_id: relationship.sourceNodeId,
        target_node_id: relationship.targetNodeId,
        relationship_type: relationship.relationshipType,
        metadata: relationship.metadata
      })
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create relationship:', error)
      throw new Error(`Failed to create relationship: ${error.message}`)
    }
    
    return this.mapToNodeRelationship(data)
  }
  
  async getNodeRelationships(nodeId: string): Promise<NodeRelationship[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('node_relationships')
      .select('*')
      .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to get node relationships:', error)
      throw new Error(`Failed to get node relationships: ${error.message}`)
    }
    
    return data.map(this.mapToNodeRelationship)
  }
  
  async getIncomingRelationships(nodeId: string): Promise<NodeRelationship[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('node_relationships')
      .select('*')
      .eq('target_node_id', nodeId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to get incoming relationships:', error)
      throw new Error(`Failed to get incoming relationships: ${error.message}`)
    }
    
    return data.map(this.mapToNodeRelationship)
  }
  
  async getOutgoingRelationships(nodeId: string): Promise<NodeRelationship[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('node_relationships')
      .select('*')
      .eq('source_node_id', nodeId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to get outgoing relationships:', error)
      throw new Error(`Failed to get outgoing relationships: ${error.message}`)
    }
    
    return data.map(this.mapToNodeRelationship)
  }
  
  async deleteRelationship(relationshipId: string): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('node_relationships')
      .delete()
      .eq('relationship_id', relationshipId)
    
    if (error) {
      console.error('Failed to delete relationship:', error)
      throw new Error(`Failed to delete relationship: ${error.message}`)
    }
  }
  
  async deleteRelationshipsByNode(nodeId: string): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('node_relationships')
      .delete()
      .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)
    
    if (error) {
      console.error('Failed to delete relationships by node:', error)
      throw new Error(`Failed to delete relationships by node: ${error.message}`)
    }
  }
  
  async createAIAgent(nodeId: string, config: AIAgentConfig): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('ai_agents')
      .insert({
        node_id: nodeId,
        name: config.metadata?.model || 'Default Agent',
        instructions: config.instructions,
        tools: config.tools,
        capabilities: config.capabilities,
        metadata: config.metadata
      })
    
    if (error) {
      console.error('Failed to create AI agent:', error)
      throw new Error(`Failed to create AI agent: ${error.message}`)
    }
  }
  
  async updateAIAgent(nodeId: string, config: Partial<AIAgentConfig>): Promise<void> {
    const supabase = createClient()
    
    const updateData: any = {}
    if (config.instructions !== undefined) updateData.instructions = config.instructions
    if (config.tools !== undefined) updateData.tools = config.tools
    if (config.capabilities !== undefined) updateData.capabilities = config.capabilities
    if (config.metadata !== undefined) updateData.metadata = config.metadata
    if (config.metadata?.model) updateData.name = config.metadata.model
    
    const { error } = await supabase
      .from('ai_agents')
      .update(updateData)
      .eq('node_id', nodeId)
    
    if (error) {
      console.error('Failed to update AI agent:', error)
      throw new Error(`Failed to update AI agent: ${error.message}`)
    }
  }
  
  async getAIAgent(nodeId: string): Promise<AIAgentConfig | null> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('node_id', nodeId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // No rows returned
      console.error('Failed to get AI agent:', error)
      throw new Error(`Failed to get AI agent: ${error.message}`)
    }
    
    return {
      enabled: true,
      instructions: data.instructions || '',
      tools: data.tools || [],
      capabilities: data.capabilities || {},
      metadata: data.metadata || {}
    }
  }
  
  async deleteAIAgent(nodeId: string): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('ai_agents')
      .delete()
      .eq('node_id', nodeId)
    
    if (error) {
      console.error('Failed to delete AI agent:', error)
      throw new Error(`Failed to delete AI agent: ${error.message}`)
    }
  }
  
  async searchNodes(query: string, limit: number = 10): Promise<BaseNode[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Failed to search nodes:', error)
      throw new Error(`Failed to search nodes: ${error.message}`)
    }
    
    return data.map(this.mapToBaseNode)
  }
  
  async getNodesByTags(tags: string[]): Promise<BaseNode[]> {
    const supabase = createClient()
    
    // Search for nodes that have any of the specified tags
    const tagConditions = tags.map(tag => `metadata->>'tags' ilike '%${tag}%'`).join(',')
    
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .or(tagConditions)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to get nodes by tags:', error)
      throw new Error(`Failed to get nodes by tags: ${error.message}`)
    }
    
    return data.map(this.mapToBaseNode)
  }
  
  async getRelatedNodes(nodeId: string, relationshipType?: RelationshipType): Promise<BaseNode[]> {
    const relationships = await this.getNodeRelationships(nodeId)
    
    const filteredRelationships = relationshipType 
      ? relationships.filter(r => r.relationshipType === relationshipType)
      : relationships
    
    const relatedNodeIds = new Set<string>()
    filteredRelationships.forEach(rel => {
      if (rel.sourceNodeId === nodeId) {
        relatedNodeIds.add(rel.targetNodeId)
      } else {
        relatedNodeIds.add(rel.sourceNodeId)
      }
    })
    
    const relatedNodes: BaseNode[] = []
    for (const nodeId of relatedNodeIds) {
      const node = await this.getNode(nodeId)
      if (node) {
        relatedNodes.push(node)
      }
    }
    
    return relatedNodes
  }
  
  private mapToBaseNode(data: any): BaseNode {
    return {
      nodeId: data.node_id,
      type: data.type,
      nodeType: data.node_type,
      name: data.name,
      description: data.description,
      position: { x: data.position_x, y: data.position_y },
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }
  
  private mapToNodeRelationship(data: any): NodeRelationship {
    return {
      relationshipId: data.relationship_id,
      sourceNodeId: data.source_node_id,
      targetNodeId: data.target_node_id,
      relationshipType: data.relationship_type,
      metadata: data.metadata,
      createdAt: new Date(data.created_at)
    }
  }
} 