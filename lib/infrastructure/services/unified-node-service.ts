// Unified Node Service
// This file implements cross-feature node operations following the Infrastructure Layer Complete Guide

import { createClient } from '@/lib/supabase/client'
import { BaseNode, FeatureType } from '@/lib/domain/entities/base-node-types'
import { CrossFeatureLink } from '@/lib/domain/entities/cross-feature-link-types'
import { 
  InfrastructureException, 
  DataConsistencyException,
  NotFoundException 
} from '../exceptions/infrastructure-exceptions'

export interface NodeReference {
  featureType: FeatureType
  entityId: string
  nodeId?: string
}

export type LinkType = 'references' | 'implements' | 'documents' | 'supports' | 'nested' | 'triggers' | 'consumes' | 'produces'

export interface UnifiedNodeService {
  // Cross-feature node operations
  createNode<T extends BaseNode>(node: T): Promise<T>
  getNode<T extends BaseNode>(featureType: FeatureType, entityId: string): Promise<T | null>
  updateNode<T extends BaseNode>(featureType: FeatureType, entityId: string, updates: Partial<T>): Promise<T>
  deleteNode(featureType: FeatureType, entityId: string): Promise<void>
  
  // Cross-feature linking
  createLink(source: NodeReference, target: NodeReference, linkType: LinkType): Promise<CrossFeatureLink>
  getConnectedNodes(featureType: FeatureType, entityId: string): Promise<BaseNode[]>
  removeLink(linkId: string): Promise<void>
  
  // Batch operations
  batchCreateNodes(nodes: BaseNode[]): Promise<BaseNode[]>
  batchUpdateNodes(updates: Array<{ featureType: FeatureType; entityId: string; updates: Partial<BaseNode> }>): Promise<BaseNode[]>
  batchDeleteNodes(nodes: Array<{ featureType: FeatureType; entityId: string }>): Promise<void>
  
  // Search and analytics
  searchNodes<T extends BaseNode>(featureType: FeatureType, query: string): Promise<T[]>
  getNodeStatistics(featureType: FeatureType, entityId: string): Promise<{
    totalNodes: number
    nodesByType: Record<string, number>
    nodesWithAI: number
    nodesWithLinks: number
  }>
}

export class UnifiedNodeServiceImpl implements UnifiedNodeService {
  private supabase = createClient()

  async createNode<T extends BaseNode>(node: T): Promise<T> {
    try {
      const { data, error } = await this.supabase
        .from('nodes')
        .insert({
          feature_type: node.featureType,
          entity_id: node.entityId,
          node_type: node.nodeType,
          name: node.name,
          description: node.description,
          position_x: node.position.x,
          position_y: node.position.y,
          visual_properties: node.visualProperties,
          metadata: node.metadata,
          status: node.status
        })
        .select()
        .single()

      if (error) {
        throw new InfrastructureException(
          `Failed to create node: ${error.message}`,
          'NODE_CREATE_ERROR',
          500
        )
      }

      return this.mapDbToNode(data) as T
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to create node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_CREATE_ERROR',
        500
      )
    }
  }

  async getNode<T extends BaseNode>(featureType: FeatureType, entityId: string): Promise<T | null> {
    try {
      const { data, error } = await this.supabase
        .from('nodes')
        .select('*')
        .eq('feature_type', featureType)
        .eq('entity_id', entityId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new InfrastructureException(
          `Failed to get node: ${error.message}`,
          'NODE_GET_ERROR',
          500
        )
      }

      return this.mapDbToNode(data) as T
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_GET_ERROR',
        500
      )
    }
  }

  async updateNode<T extends BaseNode>(featureType: FeatureType, entityId: string, updates: Partial<T>): Promise<T> {
    try {
      const updateData: any = {}
      
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.position !== undefined) {
        updateData.position_x = updates.position.x
        updateData.position_y = updates.position.y
      }
      if (updates.visualProperties !== undefined) updateData.visual_properties = updates.visualProperties
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata
      if (updates.status !== undefined) updateData.status = updates.status

      const { data, error } = await this.supabase
        .from('nodes')
        .update(updateData)
        .eq('feature_type', featureType)
        .eq('entity_id', entityId)
        .select()
        .single()

      if (error) {
        throw new InfrastructureException(
          `Failed to update node: ${error.message}`,
          'NODE_UPDATE_ERROR',
          500
        )
      }

      return this.mapDbToNode(data) as T
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to update node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_UPDATE_ERROR',
        500
      )
    }
  }

  async deleteNode(featureType: FeatureType, entityId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('nodes')
        .delete()
        .eq('feature_type', featureType)
        .eq('entity_id', entityId)

      if (error) {
        throw new InfrastructureException(
          `Failed to delete node: ${error.message}`,
          'NODE_DELETE_ERROR',
          500
        )
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to delete node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_DELETE_ERROR',
        500
      )
    }
  }

  async createLink(source: NodeReference, target: NodeReference, linkType: LinkType): Promise<CrossFeatureLink> {
    try {
      // Validate that both nodes exist
      const [sourceNode, targetNode] = await Promise.all([
        this.getNode(source.featureType, source.entityId),
        this.getNode(target.featureType, target.entityId)
      ])

      if (!sourceNode) {
        throw new NotFoundException(
          `Source node not found: ${source.featureType}/${source.entityId}`,
          'node',
          { source }
        )
      }

      if (!targetNode) {
        throw new NotFoundException(
          `Target node not found: ${target.featureType}/${target.entityId}`,
          'node',
          { target }
        )
      }

      // Create the link
      const { data, error } = await this.supabase
        .from('node_links')
        .insert({
          source_feature: source.featureType,
          source_entity_id: source.entityId,
          source_node_id: source.nodeId,
          source_node_type: sourceNode.nodeType,
          target_feature: target.featureType,
          target_entity_id: target.entityId,
          target_node_id: target.nodeId,
          target_node_type: targetNode.nodeType,
          link_type: linkType,
          link_strength: 1.0,
          link_context: {},
          visual_properties: {
            color: this.getLinkTypeColor(linkType),
            strokeWidth: 2,
            strokeDasharray: 'none'
          }
        })
        .select()
        .single()

      if (error) {
        throw new InfrastructureException(
          `Failed to create link: ${error.message}`,
          'LINK_CREATE_ERROR',
          500
        )
      }

      return this.mapDbToCrossFeatureLink(data)
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to create link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LINK_CREATE_ERROR',
        500
      )
    }
  }

  async getConnectedNodes(featureType: FeatureType, entityId: string): Promise<BaseNode[]> {
    try {
      const { data: links, error: linksError } = await this.supabase
        .from('node_links')
        .select('*')
        .or(`source_feature.eq.${featureType},target_feature.eq.${featureType}`)
        .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)

      if (linksError) {
        throw new InfrastructureException(
          `Failed to get connected nodes: ${linksError.message}`,
          'CONNECTED_NODES_ERROR',
          500
        )
      }

      const connectedNodeIds = new Set<string>()
      links.forEach(link => {
        if (link.source_entity_id !== entityId) {
          connectedNodeIds.add(`${link.source_feature}/${link.source_entity_id}`)
        }
        if (link.target_entity_id !== entityId) {
          connectedNodeIds.add(`${link.target_feature}/${link.target_entity_id}`)
        }
      })

      const nodes: BaseNode[] = []
      for (const nodeId of connectedNodeIds) {
        const [featureType, entityId] = nodeId.split('/')
        const node = await this.getNode(featureType as FeatureType, entityId)
        if (node) nodes.push(node)
      }

      return nodes
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get connected nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTED_NODES_ERROR',
        500
      )
    }
  }

  async removeLink(linkId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('node_links')
        .delete()
        .eq('link_id', linkId)

      if (error) {
        throw new InfrastructureException(
          `Failed to remove link: ${error.message}`,
          'LINK_DELETE_ERROR',
          500
        )
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to remove link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LINK_DELETE_ERROR',
        500
      )
    }
  }

  async batchCreateNodes(nodes: BaseNode[]): Promise<BaseNode[]> {
    try {
      const nodesToInsert = nodes.map(node => ({
        feature_type: node.featureType,
        entity_id: node.entityId,
        node_type: node.nodeType,
        name: node.name,
        description: node.description,
        position_x: node.position.x,
        position_y: node.position.y,
        visual_properties: node.visualProperties,
        metadata: node.metadata,
        status: node.status
      }))

      const { data, error } = await this.supabase
        .from('nodes')
        .insert(nodesToInsert)
        .select()

      if (error) {
        throw new InfrastructureException(
          `Failed to batch create nodes: ${error.message}`,
          'BATCH_NODE_CREATE_ERROR',
          500
        )
      }

      return data.map(this.mapDbToNode)
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to batch create nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_NODE_CREATE_ERROR',
        500
      )
    }
  }

  async batchUpdateNodes(updates: Array<{ featureType: FeatureType; entityId: string; updates: Partial<BaseNode> }>): Promise<BaseNode[]> {
    try {
      const results: BaseNode[] = []
      
      for (const update of updates) {
        const result = await this.updateNode(update.featureType, update.entityId, update.updates)
        results.push(result)
      }

      return results
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to batch update nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_NODE_UPDATE_ERROR',
        500
      )
    }
  }

  async batchDeleteNodes(nodes: Array<{ featureType: FeatureType; entityId: string }>): Promise<void> {
    try {
      for (const node of nodes) {
        await this.deleteNode(node.featureType, node.entityId)
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to batch delete nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_NODE_DELETE_ERROR',
        500
      )
    }
  }

  async searchNodes<T extends BaseNode>(featureType: FeatureType, query: string): Promise<T[]> {
    try {
      const { data, error } = await this.supabase
        .from('nodes')
        .select('*')
        .eq('feature_type', featureType)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) {
        throw new InfrastructureException(
          `Failed to search nodes: ${error.message}`,
          'NODE_SEARCH_ERROR',
          500
        )
      }

      return data.map(this.mapDbToNode) as T[]
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to search nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_SEARCH_ERROR',
        500
      )
    }
  }

  async getNodeStatistics(featureType: FeatureType, entityId: string): Promise<{
    totalNodes: number
    nodesByType: Record<string, number>
    nodesWithAI: number
    nodesWithLinks: number
  }> {
    try {
      // Get total nodes
      const { data: nodes, error: nodesError } = await this.supabase
        .from('nodes')
        .select('node_type')
        .eq('feature_type', featureType)
        .eq('entity_id', entityId)

      if (nodesError) {
        throw new InfrastructureException(
          `Failed to get node statistics: ${nodesError.message}`,
          'NODE_STATISTICS_ERROR',
          500
        )
      }

      // Get nodes with AI agents
      const { data: aiNodes, error: aiError } = await this.supabase
        .from('ai_agents')
        .select('node_id')
        .eq('feature_type', featureType)
        .eq('entity_id', entityId)
        .eq('is_enabled', true)

      if (aiError) {
        throw new InfrastructureException(
          `Failed to get AI agent statistics: ${aiError.message}`,
          'AI_STATISTICS_ERROR',
          500
        )
      }

      // Get nodes with links
      const { data: linkedNodes, error: linksError } = await this.supabase
        .from('node_links')
        .select('source_node_id, target_node_id')
        .or(`source_feature.eq.${featureType},target_feature.eq.${featureType}`)
        .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)

      if (linksError) {
        throw new InfrastructureException(
          `Failed to get link statistics: ${linksError.message}`,
          'LINK_STATISTICS_ERROR',
          500
        )
      }

      // Calculate statistics
      const nodesByType: Record<string, number> = {}
      nodes.forEach(node => {
        nodesByType[node.node_type] = (nodesByType[node.node_type] || 0) + 1
      })

      const nodesWithAI = aiNodes.length
      const linkedNodeIds = new Set<string>()
      linkedNodes.forEach(link => {
        if (link.source_node_id) linkedNodeIds.add(link.source_node_id)
        if (link.target_node_id) linkedNodeIds.add(link.target_node_id)
      })

      return {
        totalNodes: nodes.length,
        nodesByType,
        nodesWithAI,
        nodesWithLinks: linkedNodeIds.size
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get node statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_STATISTICS_ERROR',
        500
      )
    }
  }

  // Helper methods
  private mapDbToNode(data: any): BaseNode {
    return {
      nodeId: data.node_id,
      featureType: data.feature_type,
      entityId: data.entity_id,
      nodeType: data.node_type,
      name: data.name,
      description: data.description,
      position: { x: data.position_x, y: data.position_y },
      visualProperties: data.visual_properties || {},
      metadata: data.metadata || {
        tags: [],
        searchKeywords: [],
        crossFeatureLinks: [],
        aiAgent: undefined,
        vectorEmbedding: undefined
      },
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      status: data.status || 'active'
    }
  }

  private mapDbToCrossFeatureLink(data: any): CrossFeatureLink {
    return {
      linkId: data.link_id,
      sourceNodeId: data.source_node_id,
      targetNodeId: data.target_node_id,
      sourceNodeType: data.source_node_type,
      targetNodeType: data.target_node_type,
      linkType: data.link_type,
      linkStrength: parseFloat(data.link_strength) || 1.0,
      linkContext: data.link_context || {},
      visualProperties: data.visual_properties || {},
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  private getLinkTypeColor(linkType: LinkType): string {
    const colors: Record<LinkType, string> = {
      references: '#3B82F6',
      implements: '#10B981',
      documents: '#F59E0B',
      supports: '#8B5CF6',
      nested: '#EF4444',
      triggers: '#F97316',
      consumes: '#EC4899',
      produces: '#06B6D4'
    }
    return colors[linkType] || '#6B7280'
  }
} 