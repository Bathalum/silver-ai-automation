// Base Node Repository Implementation
// This file provides the base implementation for all node repositories

import { createClient } from '@/lib/supabase/client'
import { BaseNodeRepository } from './base-node-repository'
import { BaseNode, FeatureType } from '@/lib/domain/entities/base-node-types'
import { NodeLink } from '@/lib/domain/entities/cross-feature-link-types'
import { AIAgentConfig } from '@/lib/domain/entities/ai-integration-types'
import { 
  InfrastructureException, 
  DatabaseConnectionException,
  DataConsistencyException 
} from '../exceptions/infrastructure-exceptions'

export abstract class BaseNodeRepositoryImpl implements BaseNodeRepository {
  protected supabase = createClient()

  // Universal node operations
  async createNode<T extends BaseNode>(node: Omit<T, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<T> {
    try {
      const { data, error } = await this.supabase
        .from('nodes')
        .insert(this.mapNodeToDb(node))
        .select()
        .single()

      if (error) {
        throw new DatabaseConnectionException(`Failed to create node: ${error.message}`, { error, node })
      }

      return this.mapDbToNode(data) as T
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to create node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_CREATE_ERROR',
        500,
        { node }
      )
    }
  }

  async getNode<T extends BaseNode>(featureType: FeatureType, entityId: string, nodeId?: string): Promise<T | null> {
    try {
      let query = this.supabase
        .from('nodes')
        .select('*')
        .eq('feature_type', featureType)
        .eq('entity_id', entityId)

      if (nodeId) {
        query = query.eq('node_id', nodeId)
      }

      const { data, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new DatabaseConnectionException(`Failed to get node: ${error.message}`, { error, featureType, entityId, nodeId })
      }

      return this.mapDbToNode(data) as T
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_GET_ERROR',
        500,
        { featureType, entityId, nodeId }
      )
    }
  }

  async updateNode<T extends BaseNode>(featureType: FeatureType, entityId: string, nodeId: string, updates: Partial<T>): Promise<T> {
    try {
      const { data, error } = await this.supabase
        .from('nodes')
        .update(this.mapNodeToDb(updates))
        .eq('feature_type', featureType)
        .eq('entity_id', entityId)
        .eq('node_id', nodeId)
        .select()
        .single()

      if (error) {
        throw new DatabaseConnectionException(`Failed to update node: ${error.message}`, { error, featureType, entityId, nodeId, updates })
      }

      return this.mapDbToNode(data) as T
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to update node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_UPDATE_ERROR',
        500,
        { featureType, entityId, nodeId, updates }
      )
    }
  }

  async deleteNode(featureType: FeatureType, entityId: string, nodeId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('nodes')
        .delete()
        .eq('feature_type', featureType)
        .eq('entity_id', entityId)
        .eq('node_id', nodeId)

      if (error) {
        throw new DatabaseConnectionException(`Failed to delete node: ${error.message}`, { error, featureType, entityId, nodeId })
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to delete node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_DELETE_ERROR',
        500,
        { featureType, entityId, nodeId }
      )
    }
  }

  // Cross-feature operations
  async createNodeLink(link: Omit<NodeLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<NodeLink> {
    try {
      const { data, error } = await this.supabase
        .from('node_links')
        .insert(this.mapNodeLinkToDb(link))
        .select()
        .single()

      if (error) {
        throw new DatabaseConnectionException(`Failed to create node link: ${error.message}`, { error, link })
      }

      return this.mapDbToNodeLink(data)
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to create node link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_LINK_CREATE_ERROR',
        500,
        { link }
      )
    }
  }

  async getNodeLinks(featureType: FeatureType, entityId: string, nodeId?: string): Promise<NodeLink[]> {
    try {
      let query = this.supabase
        .from('node_links')
        .select('*')
        .or(`source_feature.eq.${featureType},target_feature.eq.${featureType}`)
        .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)

      if (nodeId) {
        query = query.or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)
      }

      const { data, error } = await query

      if (error) {
        throw new DatabaseConnectionException(`Failed to get node links: ${error.message}`, { error, featureType, entityId, nodeId })
      }

      return data.map(this.mapDbToNodeLink)
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get node links: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_LINK_GET_ERROR',
        500,
        { featureType, entityId, nodeId }
      )
    }
  }

  async getConnectedNodes(featureType: FeatureType, entityId: string, nodeId?: string): Promise<BaseNode[]> {
    try {
      const links = await this.getNodeLinks(featureType, entityId, nodeId)
      const connectedNodeIds = new Set<string>()

      links.forEach(link => {
        if (link.sourceNodeId) connectedNodeIds.add(link.sourceNodeId)
        if (link.targetNodeId) connectedNodeIds.add(link.targetNodeId)
      })

      const nodes: BaseNode[] = []
      for (const nodeId of connectedNodeIds) {
        const node = await this.getNode(featureType, entityId, nodeId)
        if (node) nodes.push(node)
      }

      return nodes
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get connected nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTED_NODES_GET_ERROR',
        500,
        { featureType, entityId, nodeId }
      )
    }
  }

  // AI Integration
  async createAIAgent(featureType: FeatureType, entityId: string, nodeId: string, config: AIAgentConfig): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_agents')
        .insert({
          feature_type: featureType,
          entity_id: entityId,
          node_id: nodeId,
          name: config.name,
          instructions: config.instructions,
          tools: config.tools || [],
          capabilities: config.capabilities || {},
          metadata: config.metadata || {},
          is_enabled: true
        })

      if (error) {
        throw new DatabaseConnectionException(`Failed to create AI agent: ${error.message}`, { error, featureType, entityId, nodeId, config })
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to create AI agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AI_AGENT_CREATE_ERROR',
        500,
        { featureType, entityId, nodeId, config }
      )
    }
  }

  async getAIAgent(featureType: FeatureType, entityId: string, nodeId: string): Promise<AIAgentConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('ai_agents')
        .select('*')
        .eq('feature_type', featureType)
        .eq('entity_id', entityId)
        .eq('node_id', nodeId)
        .eq('is_enabled', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new DatabaseConnectionException(`Failed to get AI agent: ${error.message}`, { error, featureType, entityId, nodeId })
      }

      return {
        name: data.name,
        instructions: data.instructions,
        tools: data.tools || [],
        capabilities: data.capabilities || {},
        metadata: data.metadata || {}
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to get AI agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AI_AGENT_GET_ERROR',
        500,
        { featureType, entityId, nodeId }
      )
    }
  }

  async updateAIAgent(featureType: FeatureType, entityId: string, nodeId: string, config: Partial<AIAgentConfig>): Promise<void> {
    try {
      const updateData: any = {}
      if (config.name !== undefined) updateData.name = config.name
      if (config.instructions !== undefined) updateData.instructions = config.instructions
      if (config.tools !== undefined) updateData.tools = config.tools
      if (config.capabilities !== undefined) updateData.capabilities = config.capabilities
      if (config.metadata !== undefined) updateData.metadata = config.metadata

      const { error } = await this.supabase
        .from('ai_agents')
        .update(updateData)
        .eq('feature_type', featureType)
        .eq('entity_id', entityId)
        .eq('node_id', nodeId)

      if (error) {
        throw new DatabaseConnectionException(`Failed to update AI agent: ${error.message}`, { error, featureType, entityId, nodeId, config })
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to update AI agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AI_AGENT_UPDATE_ERROR',
        500,
        { featureType, entityId, nodeId, config }
      )
    }
  }

  async deleteAIAgent(featureType: FeatureType, entityId: string, nodeId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_agents')
        .delete()
        .eq('feature_type', featureType)
        .eq('entity_id', entityId)
        .eq('node_id', nodeId)

      if (error) {
        throw new DatabaseConnectionException(`Failed to delete AI agent: ${error.message}`, { error, featureType, entityId, nodeId })
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to delete AI agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AI_AGENT_DELETE_ERROR',
        500,
        { featureType, entityId, nodeId }
      )
    }
  }

  // Batch operations
  async batchCreateNodes<T extends BaseNode>(nodes: Omit<T, 'nodeId' | 'createdAt' | 'updatedAt'>[]): Promise<T[]> {
    try {
      const { data, error } = await this.supabase
        .from('nodes')
        .insert(nodes.map(this.mapNodeToDb))
        .select()

      if (error) {
        throw new DatabaseConnectionException(`Failed to batch create nodes: ${error.message}`, { error, nodesCount: nodes.length })
      }

      return data.map(this.mapDbToNode) as T[]
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to batch create nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_NODE_CREATE_ERROR',
        500,
        { nodesCount: nodes.length }
      )
    }
  }

  async batchUpdateNodes<T extends BaseNode>(updates: Array<{ featureType: FeatureType; entityId: string; nodeId: string; updates: Partial<T> }>): Promise<T[]> {
    try {
      const results: T[] = []
      
      for (const update of updates) {
        const result = await this.updateNode(update.featureType, update.entityId, update.nodeId, update.updates)
        results.push(result as T)
      }

      return results
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to batch update nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_NODE_UPDATE_ERROR',
        500,
        { updatesCount: updates.length }
      )
    }
  }

  async batchDeleteNodes(nodes: Array<{ featureType: FeatureType; entityId: string; nodeId: string }>): Promise<void> {
    try {
      for (const node of nodes) {
        await this.deleteNode(node.featureType, node.entityId, node.nodeId)
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to batch delete nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_NODE_DELETE_ERROR',
        500,
        { nodesCount: nodes.length }
      )
    }
  }

  // Search and analytics
  async searchNodes<T extends BaseNode>(featureType: FeatureType, query: string): Promise<T[]> {
    try {
      const { data, error } = await this.supabase
        .from('nodes')
        .select('*')
        .eq('feature_type', featureType)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) {
        throw new DatabaseConnectionException(`Failed to search nodes: ${error.message}`, { error, featureType, query })
      }

      return data.map(this.mapDbToNode) as T[]
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to search nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NODE_SEARCH_ERROR',
        500,
        { featureType, query }
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
        throw new DatabaseConnectionException(`Failed to get node statistics: ${nodesError.message}`, { error: nodesError, featureType, entityId })
      }

      // Get nodes with AI agents
      const { data: aiNodes, error: aiError } = await this.supabase
        .from('ai_agents')
        .select('node_id')
        .eq('feature_type', featureType)
        .eq('entity_id', entityId)
        .eq('is_enabled', true)

      if (aiError) {
        throw new DatabaseConnectionException(`Failed to get AI agent statistics: ${aiError.message}`, { error: aiError, featureType, entityId })
      }

      // Get nodes with links
      const { data: linkedNodes, error: linksError } = await this.supabase
        .from('node_links')
        .select('source_node_id, target_node_id')
        .or(`source_feature.eq.${featureType},target_feature.eq.${featureType}`)
        .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)

      if (linksError) {
        throw new DatabaseConnectionException(`Failed to get link statistics: ${linksError.message}`, { error: linksError, featureType, entityId })
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
        500,
        { featureType, entityId }
      )
    }
  }

  // Abstract methods that must be implemented by feature-specific repositories
  protected abstract mapNodeToDb(node: Partial<BaseNode>): any
  protected abstract mapDbToNode(data: any): BaseNode
  protected abstract mapNodeLinkToDb(link: Partial<NodeLink>): any
  protected abstract mapDbToNodeLink(data: any): NodeLink
} 