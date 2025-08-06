// Unified Node Operations Hook
// This file implements the unified node operations following the Presentation Layer Complete Guide

import { useState, useCallback } from 'react'
import { useNodeStore } from '@/lib/stores/node-store'
import { BaseNode } from '@/lib/domain/entities/base-node-types'
import { CrossFeatureLink } from '@/lib/domain/entities/cross-feature-link-types'
import { UnifiedNodeOperations } from '@/lib/application/use-cases/unified-node-operations'

export function useNodeOperations() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const {
    nodes,
    links,
    setNodes,
    setLinks,
    addNode,
    updateNode,
    deleteNode,
    setError: setStoreError
  } = useNodeStore()
  
  const nodeOperations = new UnifiedNodeOperations()
  
  const fetchNodes = useCallback(async (nodeTypes: string[]) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const graph = await nodeOperations.getCrossNodeGraph(nodeTypes)
      setNodes(graph.nodes)
      setLinks(graph.links)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch nodes'
      setError(errorMessage)
      setStoreError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [setNodes, setLinks, setStoreError])
  
  const createNode = useCallback(async (node: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const createdNode = await nodeOperations.createNode(node)
      addNode(createdNode)
      return createdNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create node'
      setError(errorMessage)
      setStoreError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [addNode, setStoreError])
  
  const updateNodeById = useCallback(async (
    nodeType: string,
    nodeId: string,
    updates: Partial<BaseNode>
  ) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const updatedNode = await nodeOperations.updateNode(nodeType, nodeId, updates)
      updateNode(nodeId, updatedNode)
      return updatedNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update node'
      setError(errorMessage)
      setStoreError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [updateNode, setStoreError])
  
  const deleteNodeById = useCallback(async (
    nodeType: string,
    nodeId: string
  ) => {
    setIsLoading(true)
    setError(null)
    
    try {
      await nodeOperations.deleteNode(nodeType, nodeId)
      deleteNode(nodeId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete node'
      setError(errorMessage)
      setStoreError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [deleteNode, setStoreError])
  
  const createNodeLink = useCallback(async (link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const createdLink = await nodeOperations.createNodeLink(link)
      setLinks([...links, createdLink])
      return createdLink
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create link'
      setError(errorMessage)
      setStoreError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [links, setLinks, setStoreError])
  
  return {
    nodes,
    links,
    isLoading,
    error,
    fetchNodes,
    createNode,
    updateNodeById,
    deleteNodeById,
    createNodeLink,
    clearError: () => {
      setError(null)
      setStoreError(null)
    }
  }
} 