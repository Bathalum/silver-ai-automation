// Unified Node Hooks
// React hooks for managing unified node state and operations

import { useState, useEffect, useCallback } from 'react'
import type { 
  BaseNode, 
  NodeRelationship, 
  AIAgentConfig,
  RelationshipType,
  FeatureType
} from '@/lib/domain/entities/unified-node-types'
import * as nodeOperations from '@/lib/use-cases/node-operations'

// Main unified nodes hook
export function useUnifiedNodes() {
  const [nodes, setNodes] = useState<BaseNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNodesByFeature = useCallback(async (feature: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const featureNodes = await nodeOperations.getNodesByFeature(feature)
      setNodes(featureNodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load nodes')
      console.error('Error loading nodes:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadNodesByType = useCallback(async (type: FeatureType) => {
    setLoading(true)
    setError(null)
    
    try {
      const typeNodes = await nodeOperations.getNodesByType(type)
      setNodes(typeNodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load nodes')
      console.error('Error loading nodes:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createNode = useCallback(async (node: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newNode = await nodeOperations.createNode(node)
      setNodes(prev => [...prev, newNode])
      return newNode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node')
      throw err
    }
  }, [])

  const updateNode = useCallback(async (nodeId: string, updates: Partial<BaseNode>) => {
    try {
      const updatedNode = await nodeOperations.updateNode(nodeId, updates)
      setNodes(prev => prev.map(node => node.nodeId === nodeId ? updatedNode : node))
      return updatedNode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update node')
      throw err
    }
  }, [])

  const deleteNode = useCallback(async (nodeId: string) => {
    try {
      await nodeOperations.deleteNode(nodeId)
      setNodes(prev => prev.filter(node => node.nodeId !== nodeId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete node')
      throw err
    }
  }, [])

  const searchNodes = useCallback(async (query: string, limit: number = 10) => {
    setLoading(true)
    setError(null)
    
    try {
      const searchResults = await nodeOperations.searchNodes(query, limit)
      setNodes(searchResults)
      return searchResults
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search nodes')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getNodesByTags = useCallback(async (tags: string[]) => {
    setLoading(true)
    setError(null)
    
    try {
      const taggedNodes = await nodeOperations.getNodesByTags(tags)
      setNodes(taggedNodes)
      return taggedNodes
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get nodes by tags')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    nodes,
    loading,
    error,
    loadNodesByFeature,
    loadNodesByType,
    createNode,
    updateNode,
    deleteNode,
    searchNodes,
    getNodesByTags,
    clearError: () => setError(null)
  }
}

// Node relationships hook
export function useNodeRelationships(nodeId: string) {
  const [relationships, setRelationships] = useState<NodeRelationship[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRelationships = useCallback(async () => {
    if (!nodeId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const nodeRelationships = await nodeOperations.getNodeRelationships(nodeId)
      setRelationships(nodeRelationships)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load relationships')
      console.error('Error loading relationships:', err)
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  const createRelationship = useCallback(async (
    targetNodeId: string,
    relationshipType: RelationshipType,
    metadata?: NodeRelationship['metadata']
  ) => {
    try {
      const newRelationship = await nodeOperations.createRelationship(
        nodeId,
        targetNodeId,
        relationshipType,
        metadata
      )
      setRelationships(prev => [...prev, newRelationship])
      return newRelationship
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship')
      throw err
    }
  }, [nodeId])

  const deleteRelationship = useCallback(async (relationshipId: string) => {
    try {
      await nodeOperations.deleteRelationship(relationshipId)
      setRelationships(prev => prev.filter(rel => rel.relationshipId !== relationshipId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete relationship')
      throw err
    }
  }, [])

  const getIncomingRelationships = useCallback(async () => {
    if (!nodeId) return []
    
    setLoading(true)
    setError(null)
    
    try {
      const incoming = await nodeOperations.getIncomingRelationships(nodeId)
      return incoming
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incoming relationships')
      throw err
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  const getOutgoingRelationships = useCallback(async () => {
    if (!nodeId) return []
    
    setLoading(true)
    setError(null)
    
    try {
      const outgoing = await nodeOperations.getOutgoingRelationships(nodeId)
      return outgoing
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load outgoing relationships')
      throw err
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  useEffect(() => {
    loadRelationships()
  }, [loadRelationships])

  return {
    relationships,
    loading,
    error,
    createRelationship,
    deleteRelationship,
    getIncomingRelationships,
    getOutgoingRelationships,
    reload: loadRelationships,
    clearError: () => setError(null)
  }
}

// AI Agent hook
export function useAIAgent(nodeId: string) {
  const [agent, setAgent] = useState<AIAgentConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAgent = useCallback(async () => {
    if (!nodeId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const aiAgent = await nodeOperations.getAIAgent(nodeId)
      setAgent(aiAgent)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI agent')
      console.error('Error loading AI agent:', err)
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  const createAgent = useCallback(async (config: AIAgentConfig) => {
    try {
      await nodeOperations.createAIAgent(nodeId, config)
      setAgent(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create AI agent')
      throw err
    }
  }, [nodeId])

  const updateAgent = useCallback(async (config: Partial<AIAgentConfig>) => {
    try {
      await nodeOperations.updateAIAgent(nodeId, config)
      setAgent(prev => prev ? { ...prev, ...config } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update AI agent')
      throw err
    }
  }, [nodeId])

  const deleteAgent = useCallback(async () => {
    try {
      await nodeOperations.deleteAIAgent(nodeId)
      setAgent(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete AI agent')
      throw err
    }
  }, [nodeId])

  useEffect(() => {
    loadAgent()
  }, [loadAgent])

  return {
    agent,
    loading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    reload: loadAgent,
    clearError: () => setError(null)
  }
}

// Related nodes hook
export function useRelatedNodes(nodeId: string, relationshipType?: RelationshipType) {
  const [relatedNodes, setRelatedNodes] = useState<BaseNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRelatedNodes = useCallback(async () => {
    if (!nodeId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const related = await nodeOperations.getRelatedNodes(nodeId, relationshipType)
      setRelatedNodes(related)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load related nodes')
      console.error('Error loading related nodes:', err)
    } finally {
      setLoading(false)
    }
  }, [nodeId, relationshipType])

  useEffect(() => {
    loadRelatedNodes()
  }, [loadRelatedNodes])

  return {
    relatedNodes,
    loading,
    error,
    reload: loadRelatedNodes,
    clearError: () => setError(null)
  }
}

// Cross-feature nodes hook
export function useCrossFeatureNodes(sourceFeature: string, targetFeature: string) {
  const [crossFeatureNodes, setCrossFeatureNodes] = useState<BaseNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCrossFeatureNodes = useCallback(async () => {
    if (!sourceFeature || !targetFeature) return
    
    setLoading(true)
    setError(null)
    
    try {
      const crossFeature = await nodeOperations.getCrossFeatureNodes(sourceFeature, targetFeature)
      setCrossFeatureNodes(crossFeature)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cross-feature nodes')
      console.error('Error loading cross-feature nodes:', err)
    } finally {
      setLoading(false)
    }
  }, [sourceFeature, targetFeature])

  useEffect(() => {
    loadCrossFeatureNodes()
  }, [loadCrossFeatureNodes])

  return {
    crossFeatureNodes,
    loading,
    error,
    reload: loadCrossFeatureNodes,
    clearError: () => setError(null)
  }
}

// Single node hook
export function useNode(nodeId: string) {
  const [node, setNode] = useState<BaseNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNode = useCallback(async () => {
    if (!nodeId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const nodeData = await nodeOperations.getNode(nodeId)
      setNode(nodeData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load node')
      console.error('Error loading node:', err)
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  const updateNode = useCallback(async (updates: Partial<BaseNode>) => {
    if (!nodeId) return
    
    try {
      const updatedNode = await nodeOperations.updateNode(nodeId, updates)
      setNode(updatedNode)
      return updatedNode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update node')
      throw err
    }
  }, [nodeId])

  const deleteNode = useCallback(async () => {
    if (!nodeId) return
    
    try {
      await nodeOperations.deleteNode(nodeId)
      setNode(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete node')
      throw err
    }
  }, [nodeId])

  useEffect(() => {
    loadNode()
  }, [loadNode])

  return {
    node,
    loading,
    error,
    updateNode,
    deleteNode,
    reload: loadNode,
    clearError: () => setError(null)
  }
} 