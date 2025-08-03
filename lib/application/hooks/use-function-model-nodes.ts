// Function Model Nodes Hook
// This file implements the enhanced function model nodes hook for the node-based architecture

import { useState, useCallback, useEffect } from 'react'
import { Edge, Connection, NodeChange, EdgeChange } from 'reactflow'
import { FunctionModelNode } from '../../domain/entities/function-model-node-types'
import { Stage, ActionItem, DataPort } from '../../domain/entities/function-model-node-types'
import { validateConnection } from '../../domain/entities/function-model-connection-rules'
import {
  createFunctionModelNode,
  updateFunctionModelNode,
  createNodeRelationship,
  deleteNodeRelationship,
  getFunctionModelNodes,
  getNodeRelationships,
  deleteFunctionModelNode,
  getNodeById,
  searchFunctionModelNodes,
  getNodesByType,
  getConnectedNodes
} from '../use-cases/function-model-use-cases'

export function useFunctionModelNodes(modelId: string) {
  const [nodes, setNodes] = useState<FunctionModelNode[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Preserve ALL existing state management
  const [modalStack, setModalStack] = useState<Array<{
    type: "function" | "stage" | "action" | "input" | "output"
    data: FunctionModelNode | Stage | ActionItem | DataPort
    context?: { previousModal?: string; stageId?: string }
  }>>([])

  const [selectedNodes, setSelectedNodes] = useState<FunctionModelNode[]>([])
  const [hoveredNode, setHoveredNode] = useState<FunctionModelNode | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)

  const loadNodes = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const functionModelNodes = await getFunctionModelNodes(modelId)
      const relationships = await getNodeRelationships(modelId)
      
      setNodes(functionModelNodes)
      
      // Convert relationships to React Flow edges
      const reactFlowEdges = relationships.map(rel => ({
        id: rel.id,
        source: rel.sourceNodeId,
        target: rel.targetNodeId,
        sourceHandle: rel.sourceHandle,
        targetHandle: rel.targetHandle,
        type: rel.type
      }))
      
      setEdges(reactFlowEdges)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load nodes')
    } finally {
      setLoading(false)
    }
  }, [modelId])

  const createNode = useCallback(async (
    nodeType: FunctionModelNode['nodeType'],
    name: string,
    position: { x: number; y: number },
    options: Partial<FunctionModelNode> = {}
  ) => {
    try {
      const newNode = await createFunctionModelNode(nodeType, name, position, modelId, options)
      setNodes(prev => [...prev, newNode])
      return newNode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node')
      throw err
    }
  }, [modelId])

  const updateNode = useCallback(async (nodeId: string, updates: Partial<FunctionModelNode>) => {
    try {
      const updatedNode = await updateFunctionModelNode(nodeId, updates)
      setNodes(prev => prev.map(node => node.nodeId === nodeId ? updatedNode : node))
      return updatedNode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update node')
      throw err
    }
  }, [])

  const createConnection = useCallback(async (
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle: string,
    targetHandle: string
  ) => {
    try {
      const relationship = await createNodeRelationship(sourceNodeId, targetNodeId, sourceHandle, targetHandle, modelId)
      
      // Add edge to React Flow state
      const newEdge: Edge = {
        id: relationship.id,
        source: relationship.sourceNodeId,
        target: relationship.targetNodeId,
        sourceHandle: relationship.sourceHandle,
        targetHandle: relationship.targetHandle,
        type: relationship.type
      }
      
      setEdges(prev => [...prev, newEdge])
      
      // Update relationships in nodes
      setNodes(prev => prev.map(node => {
        if (node.nodeId === sourceNodeId) {
          return {
            ...node,
            relationships: [...node.relationships, relationship]
          }
        }
        return node
      }))
      
      return relationship
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection')
      throw err
    }
  }, [modelId])

  const deleteConnection = useCallback(async (edgeId: string) => {
    try {
      await deleteNodeRelationship(edgeId)
      setEdges(prev => prev.filter(edge => edge.id !== edgeId))
      
      // Remove relationship from nodes
      setNodes(prev => prev.map(node => ({
        ...node,
        relationships: node.relationships.filter(rel => rel.id !== edgeId)
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete connection')
      throw err
    }
  }, [])

  const deleteNode = useCallback(async (nodeId: string) => {
    try {
      await deleteFunctionModelNode(nodeId)
      setNodes(prev => prev.filter(node => node.nodeId !== nodeId))
      setEdges(prev => prev.filter(edge => edge.source !== nodeId && edge.target !== nodeId))
      setSelectedNodes(prev => prev.filter(node => node.nodeId !== nodeId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete node')
      throw err
    }
  }, [])

  const searchNodes = useCallback(async (searchTerm: string) => {
    try {
      const searchResults = await searchFunctionModelNodes(modelId, searchTerm)
      return searchResults
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search nodes')
      return []
    }
  }, [modelId])

  const getNodesByType = useCallback(async (nodeType: FunctionModelNode['nodeType']) => {
    try {
      return await getNodesByType(modelId, nodeType)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get nodes by type')
      return []
    }
  }, [modelId])

  const getConnectedNodesForNode = useCallback(async (nodeId: string) => {
    try {
      return await getConnectedNodes(nodeId, modelId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get connected nodes')
      return { incoming: [], outgoing: [] }
    }
  }, [modelId])

  // Modal management functions
  const openModal = useCallback((type: "function" | "stage" | "action" | "input" | "output", data: any, context?: any) => {
    setModalStack(prev => [...prev, { type, data, context }])
  }, [])

  const closeModal = useCallback(() => {
    setModalStack(prev => prev.slice(0, -1))
  }, [])

  const closeAllModals = useCallback(() => {
    setModalStack([])
  }, [])

  const goBackToPreviousModal = useCallback(() => {
    setModalStack(prev => prev.slice(0, -1))
  }, [])

  // Node selection management
  const selectNode = useCallback((node: FunctionModelNode) => {
    setSelectedNodes(prev => {
      const isSelected = prev.some(n => n.nodeId === node.nodeId)
      if (isSelected) {
        return prev.filter(n => n.nodeId !== node.nodeId)
      } else {
        return [...prev, node]
      }
    })
  }, [])

  const selectNodes = useCallback((nodesToSelect: FunctionModelNode[]) => {
    setSelectedNodes(nodesToSelect)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedNodes([])
  }, [])

  // Node hover management
  const setHoveredNodeCallback = useCallback((node: FunctionModelNode | null) => {
    setHoveredNode(node)
  }, [])

  // Editing state management
  const startEditingName = useCallback(() => {
    setIsEditingName(true)
  }, [])

  const stopEditingName = useCallback(() => {
    setIsEditingName(false)
  }, [])

  const startEditingDescription = useCallback(() => {
    setIsEditingDescription(true)
  }, [])

  const stopEditingDescription = useCallback(() => {
    setIsEditingDescription(false)
  }, [])

  // Connection validation
  const isValidConnection = useCallback((connection: Connection) => {
    const sourceNode = nodes.find(n => n.nodeId === connection.source)
    const targetNode = nodes.find(n => n.nodeId === connection.target)
    
    if (!sourceNode || !targetNode) return false
    
    return validateConnection(sourceNode, targetNode, connection.sourceHandle!, connection.targetHandle!)
  }, [nodes])

  // Load nodes on mount
  useEffect(() => {
    loadNodes()
  }, [loadNodes])

  return {
    // State
    nodes,
    edges,
    loading,
    error,
    modalStack,
    selectedNodes,
    hoveredNode,
    isEditingName,
    isEditingDescription,
    
    // Actions
    loadNodes,
    createNode,
    updateNode,
    createConnection,
    deleteConnection,
    deleteNode,
    searchNodes,
    getNodesByType,
    getConnectedNodesForNode,
    
    // Modal management
    openModal,
    closeModal,
    closeAllModals,
    goBackToPreviousModal,
    setModalStack,
    
    // Selection management
    selectNode,
    selectNodes,
    clearSelection,
    
    // Hover management
    setHoveredNode: setHoveredNodeCallback,
    
    // Editing management
    startEditingName,
    stopEditingName,
    startEditingDescription,
    stopEditingDescription,
    
    // Validation
    isValidConnection,
    
    // Error handling
    clearError: () => setError(null)
  }
} 