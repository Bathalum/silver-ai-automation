// Function Model Nodes Hook
// This file implements the Application Layer hook for function model node operations

import { useState, useCallback, useEffect } from 'react'
import { FunctionModelNode, FunctionModelNodeLink } from '../../domain/entities/function-model-node-types'
import { FunctionModel } from '../../domain/entities/function-model-types'
import { 
  createFunctionModelNode,
  updateFunctionModelNode,
  deleteFunctionModelNode,
  getFunctionModelNodes,
  getNodeLinks,
  createNodeLink,
  deleteNodeLink,
  getFunctionModelById
} from '../use-cases/function-model-use-cases'
import { useFeedback } from '@/components/ui/feedback-toast'
import { useModalManagement, ModalData } from './use-modal-management'

export function useFunctionModelNodes(modelId: string) {
  const [nodes, setNodes] = useState<FunctionModelNode[]>([])
  const [links, setLinks] = useState<FunctionModelNodeLink[]>([])
  const [model, setModel] = useState<FunctionModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showSuccess, showError } = useFeedback()
  
  // Modal management
  const modalManagement = useModalManagement()
  
  // Additional state for UI interactions
  const [selectedNodes, setSelectedNodes] = useState<FunctionModelNode[]>([])
  const [hoveredNode, setHoveredNode] = useState<FunctionModelNode | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)

  // Load nodes and model data
  const loadNodes = useCallback(async () => {
    if (!modelId) return

    console.log('loadNodes called for modelId:', modelId)
    setLoading(true)
    setError(null)

    try {
      const [nodesData, linksData, modelData] = await Promise.all([
        getFunctionModelNodes(modelId),
        getNodeLinks(modelId),
        getFunctionModelById(modelId)
      ])

      console.log('loadNodes results:', {
        nodesCount: nodesData.length,
        linksCount: linksData.length,
        modelData: modelData ? 'loaded' : 'null'
      })

      setNodes(nodesData)
      setLinks(linksData)
      setModel(modelData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load nodes'
      console.error('loadNodes error:', err)
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [modelId])

  // Create a new node
  const createNode = useCallback(async (
    nodeType: FunctionModelNode['nodeType'],
    name: string,
    position: { x: number; y: number },
    options?: any
  ) => {
    if (!modelId) return

    setLoading(true)
    setError(null)

    try {
      const newNode = await createFunctionModelNode(
        nodeType,
        name,
        position,
        modelId,
        options
      )

      setNodes(prev => [...prev, newNode])
      showSuccess('Node created successfully')
      return newNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create node'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [modelId])

  // Update a node
  const updateNode = useCallback(async (
    nodeId: string,
    updates: Partial<FunctionModelNode>
  ) => {
    if (!modelId) return

    setLoading(true)
    setError(null)

    try {
      const updatedNode = await updateFunctionModelNode(nodeId, updates, modelId)
      
      setNodes(prev => prev.map(node => 
        node.nodeId === nodeId ? updatedNode : node
      ))
      
      showSuccess('Node updated successfully')
      return updatedNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update node'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [modelId])

  // Delete a node
  const deleteNode = useCallback(async (nodeId: string) => {
    if (!modelId) return

    setLoading(true)
    setError(null)

    try {
      await deleteFunctionModelNode(nodeId, modelId)
      
      setNodes(prev => prev.filter(node => node.nodeId !== nodeId))
      setLinks(prev => prev.filter(link => 
        link.sourceNodeId !== nodeId && link.targetNodeId !== nodeId
      ))
      
      showSuccess('Node deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete node'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [modelId])

  // Create a link between nodes
  const createLink = useCallback(async (
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle: string,
    targetHandle: string
  ) => {
    if (!modelId) return

    setLoading(true)
    setError(null)

    try {
      const newLink = await createNodeLink(
        sourceNodeId,
        targetNodeId,
        sourceHandle,
        targetHandle,
        modelId
      )

      setLinks(prev => [...prev, newLink])
      showSuccess('Link created successfully')
      return newLink
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create link'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [modelId])

  // Delete a link
  const deleteLink = useCallback(async (linkId: string) => {
    setLoading(true)
    setError(null)

    try {
      await deleteNodeLink(linkId)
      
      setLinks(prev => prev.filter(link => link.linkId !== linkId))
      showSuccess('Link deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete link'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // UI interaction functions
  const selectNode = useCallback((node: FunctionModelNode) => {
    setSelectedNodes(prev => [...prev, node])
  }, [])

  const selectNodes = useCallback((nodes: FunctionModelNode[]) => {
    setSelectedNodes(nodes)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedNodes([])
  }, [])

  const setHoveredNodeState = useCallback((node: FunctionModelNode | null) => {
    setHoveredNode(node)
  }, [])

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

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Connection functions (aliases for links)
  const createConnection = createLink
  const deleteConnection = deleteLink
  const edges = links // Alias for compatibility

  // Load data on mount and when modelId changes
  useEffect(() => {
    loadNodes()
  }, [loadNodes])

  return {
    // Data
    nodes,
    links,
    model,
    loading,
    error,
    
    // UI State
    selectedNodes,
    hoveredNode,
    isEditingName,
    isEditingDescription,
    
    // Actions
    loadNodes,
    createNode,
    updateNode,
    deleteNode,
    createLink,
    deleteLink,
    
    // UI Actions
    selectNode,
    selectNodes,
    clearSelection,
    setHoveredNode: setHoveredNodeState,
    startEditingName,
    stopEditingName,
    startEditingDescription,
    stopEditingDescription,
    clearError,
    
    // Connection aliases
    createConnection,
    deleteConnection,
    edges,
    
    // Modal Management
    ...modalManagement,
    
    // Utilities
    getNodeById: (nodeId: string) => nodes.find(node => node.nodeId === nodeId),
    getNodesByType: (nodeType: FunctionModelNode['nodeType']) => 
      nodes.filter(node => node.nodeType === nodeType),
    getConnectedNodes: (nodeId: string) => {
      const connectedLinks = links.filter(link => 
        link.sourceNodeId === nodeId || link.targetNodeId === nodeId
      )
      const connectedNodeIds = new Set(
        connectedLinks.flatMap(link => [link.sourceNodeId, link.targetNodeId])
      )
      return nodes.filter(node => connectedNodeIds.has(node.nodeId))
    }
  }
} 