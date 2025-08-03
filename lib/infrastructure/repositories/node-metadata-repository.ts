// Node Metadata Repository Implementation
// This file implements the repository pattern for unified node metadata operations using Supabase

import { createClient } from '@/lib/supabase/client'
import type { BaseNode, FeatureType } from '@/lib/domain/entities/base-node-types'

export interface NodeMetadataRecord {
  metadataId: string
  featureType: FeatureType
  entityId: string
  nodeId?: string
  nodeType: string
  positionX: number
  positionY: number
  vectorEmbedding?: number[]
  searchKeywords: string[]
  aiAgentConfig?: any
  visualProperties: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export class NodeMetadataRepository {
  private supabase = createClient()

  async createMetadata(metadata: Omit<NodeMetadataRecord, 'metadataId' | 'createdAt' | 'updatedAt'>): Promise<NodeMetadataRecord> {
    const { data, error } = await this.supabase
      .from('node_metadata')
      .insert(mapNodeMetadataToDb(metadata))
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create node metadata: ${error.message}`)
    }

    return mapDbToNodeMetadata(data)
  }

  async getMetadataById(metadataId: string): Promise<NodeMetadataRecord | null> {
    const { data, error } = await this.supabase
      .from('node_metadata')
      .select('*')
      .eq('metadata_id', metadataId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get node metadata: ${error.message}`)
    }

    return mapDbToNodeMetadata(data)
  }

  async getMetadataByEntity(featureType: FeatureType, entityId: string, nodeId?: string): Promise<NodeMetadataRecord[]> {
    let queryBuilder = this.supabase
      .from('node_metadata')
      .select('*')
      .eq('feature_type', featureType)
      .eq('entity_id', entityId)

    if (nodeId) {
      queryBuilder = queryBuilder.eq('node_id', nodeId)
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get node metadata: ${error.message}`)
    }

    return data.map(mapDbToNodeMetadata)
  }

  async updateMetadata(metadataId: string, updates: Partial<NodeMetadataRecord>): Promise<NodeMetadataRecord> {
    const { data, error } = await this.supabase
      .from('node_metadata')
      .update(mapNodeMetadataToDb(updates))
      .eq('metadata_id', metadataId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update node metadata: ${error.message}`)
    }

    return mapDbToNodeMetadata(data)
  }

  async deleteMetadata(metadataId: string): Promise<void> {
    const { error } = await this.supabase
      .from('node_metadata')
      .delete()
      .eq('metadata_id', metadataId)

    if (error) {
      throw new Error(`Failed to delete node metadata: ${error.message}`)
    }
  }

  async searchMetadata(query: string, featureType?: FeatureType): Promise<NodeMetadataRecord[]> {
    let queryBuilder = this.supabase
      .from('node_metadata')
      .select('*')

    if (featureType) {
      queryBuilder = queryBuilder.eq('feature_type', featureType)
    }

    // Search in search keywords
    queryBuilder = queryBuilder.or(`search_keywords.cs.{${query}}`)

    const { data, error } = await queryBuilder.order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to search node metadata: ${error.message}`)
    }

    return data.map(mapDbToNodeMetadata)
  }

  async getMetadataByType(featureType: FeatureType, nodeType: string): Promise<NodeMetadataRecord[]> {
    const { data, error } = await this.supabase
      .from('node_metadata')
      .select('*')
      .eq('feature_type', featureType)
      .eq('node_type', nodeType)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get metadata by type: ${error.message}`)
    }

    return data.map(mapDbToNodeMetadata)
  }

  async getMetadataWithAIAgent(featureType?: FeatureType): Promise<NodeMetadataRecord[]> {
    let queryBuilder = this.supabase
      .from('node_metadata')
      .select('*')
      .not('ai_agent_config', 'is', null)

    if (featureType) {
      queryBuilder = queryBuilder.eq('feature_type', featureType)
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get metadata with AI agent: ${error.message}`)
    }

    return data.map(mapDbToNodeMetadata)
  }

  async getMetadataWithVectorEmbedding(featureType?: FeatureType): Promise<NodeMetadataRecord[]> {
    let queryBuilder = this.supabase
      .from('node_metadata')
      .select('*')
      .not('vector_embedding', 'is', null)

    if (featureType) {
      queryBuilder = queryBuilder.eq('feature_type', featureType)
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get metadata with vector embedding: ${error.message}`)
    }

    return data.map(mapDbToNodeMetadata)
  }

  async updateVectorEmbedding(metadataId: string, vectorEmbedding: number[]): Promise<void> {
    const { error } = await this.supabase
      .from('node_metadata')
      .update({ vector_embedding: vectorEmbedding })
      .eq('metadata_id', metadataId)

    if (error) {
      throw new Error(`Failed to update vector embedding: ${error.message}`)
    }
  }

  async updateSearchKeywords(metadataId: string, searchKeywords: string[]): Promise<void> {
    const { error } = await this.supabase
      .from('node_metadata')
      .update({ search_keywords: searchKeywords })
      .eq('metadata_id', metadataId)

    if (error) {
      throw new Error(`Failed to update search keywords: ${error.message}`)
    }
  }

  async updateAIAgentConfig(metadataId: string, aiAgentConfig: any): Promise<void> {
    const { error } = await this.supabase
      .from('node_metadata')
      .update({ ai_agent_config: aiAgentConfig })
      .eq('metadata_id', metadataId)

    if (error) {
      throw new Error(`Failed to update AI agent config: ${error.message}`)
    }
  }

  async updateVisualProperties(metadataId: string, visualProperties: Record<string, any>): Promise<void> {
    const { error } = await this.supabase
      .from('node_metadata')
      .update({ visual_properties: visualProperties })
      .eq('metadata_id', metadataId)

    if (error) {
      throw new Error(`Failed to update visual properties: ${error.message}`)
    }
  }

  async getMetadataStatistics(featureType?: FeatureType): Promise<{
    totalMetadata: number
    metadataByFeatureType: Record<string, number>
    metadataByNodeType: Record<string, number>
    metadataWithAIAgent: number
    metadataWithVectorEmbedding: number
  }> {
    let queryBuilder = this.supabase
      .from('node_metadata')
      .select('feature_type, node_type, ai_agent_config, vector_embedding')

    if (featureType) {
      queryBuilder = queryBuilder.eq('feature_type', featureType)
    }

    const { data, error } = await queryBuilder

    if (error) {
      throw new Error(`Failed to get metadata statistics: ${error.message}`)
    }

    const statistics = {
      totalMetadata: data.length,
      metadataByFeatureType: {} as Record<string, number>,
      metadataByNodeType: {} as Record<string, number>,
      metadataWithAIAgent: 0,
      metadataWithVectorEmbedding: 0
    }

    data.forEach(metadata => {
      // Count by feature type
      statistics.metadataByFeatureType[metadata.feature_type] = (statistics.metadataByFeatureType[metadata.feature_type] || 0) + 1
      
      // Count by node type
      statistics.metadataByNodeType[metadata.node_type] = (statistics.metadataByNodeType[metadata.node_type] || 0) + 1
      
      // Count metadata with AI agent
      if (metadata.ai_agent_config) {
        statistics.metadataWithAIAgent++
      }
      
      // Count metadata with vector embedding
      if (metadata.vector_embedding) {
        statistics.metadataWithVectorEmbedding++
      }
    })

    return statistics
  }

  async bulkUpdateMetadata(featureType: FeatureType, entityId: string, updates: Partial<NodeMetadataRecord>): Promise<void> {
    const { error } = await this.supabase
      .from('node_metadata')
      .update(mapNodeMetadataToDb(updates))
      .eq('feature_type', featureType)
      .eq('entity_id', entityId)

    if (error) {
      throw new Error(`Failed to bulk update metadata: ${error.message}`)
    }
  }
}

// Helper functions for node metadata operations
function mapNodeMetadataToDb(metadata: Partial<NodeMetadataRecord>): any {
  const dbMetadata: any = {}
  
  if (metadata.metadataId !== undefined) dbMetadata.metadata_id = metadata.metadataId
  if (metadata.featureType !== undefined) dbMetadata.feature_type = metadata.featureType
  if (metadata.entityId !== undefined) dbMetadata.entity_id = metadata.entityId
  if (metadata.nodeId !== undefined) dbMetadata.node_id = metadata.nodeId
  if (metadata.nodeType !== undefined) dbMetadata.node_type = metadata.nodeType
  if (metadata.positionX !== undefined) dbMetadata.position_x = metadata.positionX
  if (metadata.positionY !== undefined) dbMetadata.position_y = metadata.positionY
  if (metadata.vectorEmbedding !== undefined) dbMetadata.vector_embedding = metadata.vectorEmbedding
  if (metadata.searchKeywords !== undefined) dbMetadata.search_keywords = metadata.searchKeywords
  if (metadata.aiAgentConfig !== undefined) dbMetadata.ai_agent_config = metadata.aiAgentConfig
  if (metadata.visualProperties !== undefined) dbMetadata.visual_properties = metadata.visualProperties
  if (metadata.createdAt !== undefined) dbMetadata.created_at = metadata.createdAt.toISOString()
  if (metadata.updatedAt !== undefined) dbMetadata.updated_at = metadata.updatedAt.toISOString()
  
  return dbMetadata
}

function mapDbToNodeMetadata(row: any): NodeMetadataRecord {
  return {
    metadataId: row.metadata_id,
    featureType: row.feature_type,
    entityId: row.entity_id,
    nodeId: row.node_id,
    nodeType: row.node_type,
    positionX: parseFloat(row.position_x) || 0,
    positionY: parseFloat(row.position_y) || 0,
    vectorEmbedding: row.vector_embedding,
    searchKeywords: row.search_keywords || [],
    aiAgentConfig: row.ai_agent_config,
    visualProperties: row.visual_properties || {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
} 