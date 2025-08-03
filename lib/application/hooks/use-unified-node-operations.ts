import { useState, useCallback } from 'react'
import { UnifiedNodeOperations } from '@/lib/use-cases/unified-node-operations'
import type { BaseNode, FeatureType } from '@/lib/domain/entities/base-node-types'
import type { CrossFeatureLink } from '@/lib/domain/entities/cross-feature-link-types'

export function useUnifiedNodeOperations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nodes, setNodes] = useState<BaseNode[]>([])
  const [links, setLinks] = useState<CrossFeatureLink[]>([])

  const nodeOperations = new UnifiedNodeOperations()

  // Create node
  const createNode = useCallback(async <T extends BaseNode>(
    node: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> => {
    setLoading(true)
    setError(null)
    
    try {
      const createdNode = await nodeOperations.createNode(node)
      setNodes(prev => [...prev, createdNode])
      return createdNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Get node
  const getNode = useCallback(async <T extends BaseNode>(
    featureType: FeatureType,
    entityId: string,
    nodeId?: string
  ): Promise<T | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const node = await nodeOperations.getNode(featureType, entityId, nodeId)
      return node
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Update node
  const updateNode = useCallback(async <T extends BaseNode>(
    featureType: FeatureType,
    entityId: string,
    nodeId: string,
    updates: Partial<T>
  ): Promise<T> => {
    setLoading(true)
    setError(null)
    
    try {
      const updatedNode = await nodeOperations.updateNode(featureType, entityId, nodeId, updates)
      setNodes(prev => prev.map(node => 
        node.id === updatedNode.id ? updatedNode : node
      ))
      return updatedNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Delete node
  const deleteNode = useCallback(async (
    featureType: FeatureType,
    entityId: string,
    nodeId: string
  ): Promise<void> => {
    setLoading(true)
    setError(null)
    
    try {
      await nodeOperations.deleteNode(featureType, entityId, nodeId)
      setNodes(prev => prev.filter(node => node.id !== nodeId))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Create node link
  const createNodeLink = useCallback(async (
    link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>
  ): Promise<CrossFeatureLink> => {
    setLoading(true)
    setError(null)
    
    try {
      const newLink = await nodeOperations.createNodeLink(link)
      setLinks(prev => [...prev, newLink])
      return newLink
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create node link'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Get node links
  const getNodeLinks = useCallback(async (
    featureType: FeatureType,
    entityId: string,
    nodeId?: string
  ): Promise<CrossFeatureLink[]> => {
    setLoading(true)
    setError(null)
    
    try {
      const links = await nodeOperations.getNodeLinks(featureType, entityId, nodeId)
      setLinks(links)
      return links
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get node links'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Get connected nodes
  const getConnectedNodes = useCallback(async (
    featureType: FeatureType,
    entityId: string,
    nodeId?: string
  ): Promise<BaseNode[]> => {
    setLoading(true)
    setError(null)
    
    try {
      const connectedNodes = await nodeOperations.getConnectedNodes(featureType, entityId, nodeId)
      return connectedNodes
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get connected nodes'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    nodes,
    links,
    createNode,
    getNode,
    updateNode,
    deleteNode,
    createNodeLink,
    getNodeLinks,
    getConnectedNodes,
    clearError: () => setError(null)
  }
} 