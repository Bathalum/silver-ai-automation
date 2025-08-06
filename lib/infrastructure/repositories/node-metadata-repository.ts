// This file implements the repository pattern for node metadata operations using Supabase
// Handles metadata storage and retrieval for all node types across features

import { createClient } from '@/lib/supabase/client'

export interface NodeMetadata {
  metadataId: string
  nodeId: string
  metadataKey: string
  metadataValue: any
  createdAt: Date
  updatedAt: Date
}

export interface NodeMetadataRepository {
  create(metadata: Omit<NodeMetadata, 'metadataId' | 'createdAt' | 'updatedAt'>): Promise<NodeMetadata>
  getByNodeId(nodeId: string): Promise<NodeMetadata[]>
  getByKey(nodeId: string, key: string): Promise<NodeMetadata | null>
  update(metadataId: string, updates: Partial<NodeMetadata>): Promise<NodeMetadata>
  delete(metadataId: string): Promise<void>
  deleteByNode(nodeId: string): Promise<void>
}

export class SupabaseNodeMetadataRepository implements NodeMetadataRepository {
  private supabase = createClient()

  async create(metadata: Omit<NodeMetadata, 'metadataId' | 'createdAt' | 'updatedAt'>): Promise<NodeMetadata> {
    const { data, error } = await this.supabase
      .from('node_metadata')
      .insert({
        node_id: metadata.nodeId,
        metadata_key: metadata.metadataKey,
        metadata_value: metadata.metadataValue
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create metadata: ${error.message}`)

    return this.mapToNodeMetadata(data)
  }

  async getByNodeId(nodeId: string): Promise<NodeMetadata[]> {
    const { data, error } = await this.supabase
      .from('node_metadata')
      .select('*')
      .eq('node_id', nodeId)

    if (error) throw new Error(`Failed to get metadata by node ID: ${error.message}`)

    return data.map(this.mapToNodeMetadata)
  }

  async getByKey(nodeId: string, key: string): Promise<NodeMetadata | null> {
    const { data, error } = await this.supabase
      .from('node_metadata')
      .select('*')
      .eq('node_id', nodeId)
      .eq('metadata_key', key)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get metadata by key: ${error.message}`)
    }

    return this.mapToNodeMetadata(data)
  }

  async update(metadataId: string, updates: Partial<NodeMetadata>): Promise<NodeMetadata> {
    const updateData: any = {}
    if (updates.metadataValue !== undefined) updateData.metadata_value = updates.metadataValue

    const { data, error } = await this.supabase
      .from('node_metadata')
      .update(updateData)
      .eq('metadata_id', metadataId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update metadata: ${error.message}`)

    return this.mapToNodeMetadata(data)
  }

  async delete(metadataId: string): Promise<void> {
    const { error } = await this.supabase
      .from('node_metadata')
      .delete()
      .eq('metadata_id', metadataId)

    if (error) throw new Error(`Failed to delete metadata: ${error.message}`)
  }

  async deleteByNode(nodeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('node_metadata')
      .delete()
      .eq('node_id', nodeId)

    if (error) throw new Error(`Failed to delete metadata by node: ${error.message}`)
  }

  private mapToNodeMetadata(data: any): NodeMetadata {
    return {
      metadataId: data.metadata_id,
      nodeId: data.node_id,
      metadataKey: data.metadata_key,
      metadataValue: data.metadata_value,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }
} 