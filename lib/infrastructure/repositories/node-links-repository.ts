// Node Links Repository Implementation
// This file implements the repository pattern for cross-feature node link operations using Supabase

import { createClient } from '@/lib/supabase/client'
import type { CrossFeatureLink, LinkType } from '@/lib/domain/entities/cross-feature-link-types'
import type { FeatureType } from '@/lib/domain/entities/base-node-types'

export interface NodeLinkRecord {
  linkId: string
  sourceFeature: FeatureType
  sourceEntityId: string
  sourceNodeId?: string
  targetFeature: FeatureType
  targetEntityId: string
  targetNodeId?: string
  linkType: LinkType
  linkStrength: number
  linkContext: Record<string, any>
  visualProperties: Record<string, any>
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export class NodeLinksRepository {
  private supabase = createClient()

  async createNodeLink(link: Omit<NodeLinkRecord, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<NodeLinkRecord> {
    const { data, error } = await this.supabase
      .from('node_links')
      .insert(mapNodeLinkToDb(link))
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create node link: ${error.message}`)
    }

    return mapDbToNodeLink(data)
  }

  async getNodeLinkById(linkId: string): Promise<NodeLinkRecord | null> {
    const { data, error } = await this.supabase
      .from('node_links')
      .select('*')
      .eq('link_id', linkId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get node link: ${error.message}`)
    }

    return mapDbToNodeLink(data)
  }

  async getNodeLinks(featureType: FeatureType, entityId: string, nodeId?: string): Promise<NodeLinkRecord[]> {
    let queryBuilder = this.supabase
      .from('node_links')
      .select('*')
      .or(`source_feature.eq.${featureType},target_feature.eq.${featureType}`)
      .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)

    if (nodeId) {
      queryBuilder = queryBuilder.or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get node links: ${error.message}`)
    }

    return data.map(mapDbToNodeLink)
  }

  async getOutgoingNodeLinks(featureType: FeatureType, entityId: string, nodeId?: string): Promise<NodeLinkRecord[]> {
    let queryBuilder = this.supabase
      .from('node_links')
      .select('*')
      .eq('source_feature', featureType)
      .eq('source_entity_id', entityId)

    if (nodeId) {
      queryBuilder = queryBuilder.eq('source_node_id', nodeId)
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get outgoing node links: ${error.message}`)
    }

    return data.map(mapDbToNodeLink)
  }

  async getIncomingNodeLinks(featureType: FeatureType, entityId: string, nodeId?: string): Promise<NodeLinkRecord[]> {
    let queryBuilder = this.supabase
      .from('node_links')
      .select('*')
      .eq('target_feature', featureType)
      .eq('target_entity_id', entityId)

    if (nodeId) {
      queryBuilder = queryBuilder.eq('target_node_id', nodeId)
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get incoming node links: ${error.message}`)
    }

    return data.map(mapDbToNodeLink)
  }

  async updateNodeLink(linkId: string, updates: Partial<NodeLinkRecord>): Promise<NodeLinkRecord> {
    const { data, error } = await this.supabase
      .from('node_links')
      .update(mapNodeLinkToDb(updates))
      .eq('link_id', linkId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update node link: ${error.message}`)
    }

    return mapDbToNodeLink(data)
  }

  async deleteNodeLink(linkId: string): Promise<void> {
    const { error } = await this.supabase
      .from('node_links')
      .delete()
      .eq('link_id', linkId)

    if (error) {
      throw new Error(`Failed to delete node link: ${error.message}`)
    }
  }

  async getNodeLinksByType(featureType: FeatureType, entityId: string, linkType: LinkType): Promise<NodeLinkRecord[]> {
    const { data, error } = await this.supabase
      .from('node_links')
      .select('*')
      .or(`source_feature.eq.${featureType},target_feature.eq.${featureType}`)
      .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)
      .eq('link_type', linkType)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get node links by type: ${error.message}`)
    }

    return data.map(mapDbToNodeLink)
  }

  async getNodeLinksByStrength(featureType: FeatureType, entityId: string, minStrength: number): Promise<NodeLinkRecord[]> {
    const { data, error } = await this.supabase
      .from('node_links')
      .select('*')
      .or(`source_feature.eq.${featureType},target_feature.eq.${featureType}`)
      .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)
      .gte('link_strength', minStrength)
      .order('link_strength', { ascending: false })

    if (error) {
      throw new Error(`Failed to get node links by strength: ${error.message}`)
    }

    return data.map(mapDbToNodeLink)
  }

  async searchNodeLinks(query: string, featureType?: FeatureType): Promise<NodeLinkRecord[]> {
    let queryBuilder = this.supabase
      .from('node_links')
      .select('*')

    if (featureType) {
      queryBuilder = queryBuilder.or(`source_feature.eq.${featureType},target_feature.eq.${featureType}`)
    }

    // Search in link context
    queryBuilder = queryBuilder.or(`link_context::text.ilike.%${query}%`)

    const { data, error } = await queryBuilder.order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to search node links: ${error.message}`)
    }

    return data.map(mapDbToNodeLink)
  }

  async getConnectedNodes(featureType: FeatureType, entityId: string, nodeId?: string): Promise<{
    sourceNodes: NodeLinkRecord[]
    targetNodes: NodeLinkRecord[]
  }> {
    const [outgoingLinks, incomingLinks] = await Promise.all([
      this.getOutgoingNodeLinks(featureType, entityId, nodeId),
      this.getIncomingNodeLinks(featureType, entityId, nodeId)
    ])

    return {
      sourceNodes: outgoingLinks,
      targetNodes: incomingLinks
    }
  }

  async getNodeLinkStatistics(featureType?: FeatureType): Promise<{
    totalLinks: number
    linksByType: Record<string, number>
    linksByFeatureType: Record<string, number>
    averageLinkStrength: number
    linksByStrength: Record<string, number>
  }> {
    let queryBuilder = this.supabase
      .from('node_links')
      .select('link_type, source_feature, target_feature, link_strength')

    if (featureType) {
      queryBuilder = queryBuilder.or(`source_feature.eq.${featureType},target_feature.eq.${featureType}`)
    }

    const { data, error } = await queryBuilder

    if (error) {
      throw new Error(`Failed to get node link statistics: ${error.message}`)
    }

    const statistics = {
      totalLinks: data.length,
      linksByType: {} as Record<string, number>,
      linksByFeatureType: {} as Record<string, number>,
      averageLinkStrength: 0,
      linksByStrength: {} as Record<string, number>
    }

    let totalStrength = 0

    data.forEach(link => {
      // Count by link type
      statistics.linksByType[link.link_type] = (statistics.linksByType[link.link_type] || 0) + 1
      
      // Count by feature type (both source and target)
      statistics.linksByFeatureType[link.source_feature] = (statistics.linksByFeatureType[link.source_feature] || 0) + 1
      statistics.linksByFeatureType[link.target_feature] = (statistics.linksByFeatureType[link.target_feature] || 0) + 1
      
      // Calculate strength statistics
      totalStrength += link.link_strength
      
      const strengthRange = link.link_strength < 0.3 ? 'weak' : 
                           link.link_strength < 0.7 ? 'medium' : 'strong'
      statistics.linksByStrength[strengthRange] = (statistics.linksByStrength[strengthRange] || 0) + 1
    })

    statistics.averageLinkStrength = data.length > 0 ? totalStrength / data.length : 0

    return statistics
  }

  async bulkCreateNodeLinks(links: Omit<NodeLinkRecord, 'linkId' | 'createdAt' | 'updatedAt'>[]): Promise<NodeLinkRecord[]> {
    const { data, error } = await this.supabase
      .from('node_links')
      .insert(links.map(mapNodeLinkToDb))
      .select()

    if (error) {
      throw new Error(`Failed to bulk create node links: ${error.message}`)
    }

    return data.map(mapDbToNodeLink)
  }

  async bulkDeleteNodeLinks(linkIds: string[]): Promise<void> {
    const { error } = await this.supabase
      .from('node_links')
      .delete()
      .in('link_id', linkIds)

    if (error) {
      throw new Error(`Failed to bulk delete node links: ${error.message}`)
    }
  }

  async updateLinkStrength(linkId: string, strength: number): Promise<void> {
    const { error } = await this.supabase
      .from('node_links')
      .update({ link_strength: strength })
      .eq('link_id', linkId)

    if (error) {
      throw new Error(`Failed to update link strength: ${error.message}`)
    }
  }

  async updateLinkContext(linkId: string, context: Record<string, any>): Promise<void> {
    const { error } = await this.supabase
      .from('node_links')
      .update({ link_context: context })
      .eq('link_id', linkId)

    if (error) {
      throw new Error(`Failed to update link context: ${error.message}`)
    }
  }

  async updateVisualProperties(linkId: string, visualProperties: Record<string, any>): Promise<void> {
    const { error } = await this.supabase
      .from('node_links')
      .update({ visual_properties: visualProperties })
      .eq('link_id', linkId)

    if (error) {
      throw new Error(`Failed to update visual properties: ${error.message}`)
    }
  }
}

// Helper functions for node link operations
function mapNodeLinkToDb(link: Partial<NodeLinkRecord>): any {
  const dbLink: any = {}
  
  if (link.linkId !== undefined) dbLink.link_id = link.linkId
  if (link.sourceFeature !== undefined) dbLink.source_feature = link.sourceFeature
  if (link.sourceEntityId !== undefined) dbLink.source_entity_id = link.sourceEntityId
  if (link.sourceNodeId !== undefined) dbLink.source_node_id = link.sourceNodeId
  if (link.targetFeature !== undefined) dbLink.target_feature = link.targetFeature
  if (link.targetEntityId !== undefined) dbLink.target_entity_id = link.targetEntityId
  if (link.targetNodeId !== undefined) dbLink.target_node_id = link.targetNodeId
  if (link.linkType !== undefined) dbLink.link_type = link.linkType
  if (link.linkStrength !== undefined) dbLink.link_strength = link.linkStrength
  if (link.linkContext !== undefined) dbLink.link_context = link.linkContext
  if (link.visualProperties !== undefined) dbLink.visual_properties = link.visualProperties
  if (link.createdBy !== undefined) dbLink.created_by = link.createdBy
  if (link.createdAt !== undefined) dbLink.created_at = link.createdAt.toISOString()
  if (link.updatedAt !== undefined) dbLink.updated_at = link.updatedAt.toISOString()
  
  return dbLink
}

function mapDbToNodeLink(row: any): NodeLinkRecord {
  return {
    linkId: row.link_id,
    sourceFeature: row.source_feature,
    sourceEntityId: row.source_entity_id,
    sourceNodeId: row.source_node_id,
    targetFeature: row.target_feature,
    targetEntityId: row.target_entity_id,
    targetNodeId: row.target_node_id,
    linkType: row.link_type,
    linkStrength: parseFloat(row.link_strength) || 1.0,
    linkContext: row.link_context || {},
    visualProperties: row.visual_properties || {},
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
} 