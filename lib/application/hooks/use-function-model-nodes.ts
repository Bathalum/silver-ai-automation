// Function Model Nodes Hook
// This file implements the enhanced function model nodes hook for the node-based architecture

import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { FunctionModelRepository } from '@/lib/infrastructure/repositories/function-model-repository'
import { NodeMetadataRepository } from '@/lib/infrastructure/repositories/node-metadata-repository'
import { NodeLinksRepository } from '@/lib/infrastructure/repositories/node-links-repository'
import type { FunctionModelNode } from '@/lib/domain/entities/function-model-node-types'
import type { NodeMetadataRecord } from '@/lib/infrastructure/repositories/node-metadata-repository'
import type { NodeLinkRecord } from '@/lib/infrastructure/repositories/node-links-repository'
import { createFunctionModelNode } from '@/lib/domain/entities/function-model-node-types'
import { NodeBehaviorFactory } from '@/lib/domain/entities/node-behavior-types'

export interface UseFunctionModelNodesOptions {
  modelId: string
  autoSave?: boolean
  autoSaveInterval?: number
  enableNodeBehavior?: boolean
  enableCrossFeatureLinking?: boolean
}

export interface FunctionModelNodesState {
  nodes: FunctionModelNode[]
  metadata: NodeMetadataRecord[]
  links: NodeLinkRecord[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  statistics: {
    totalNodes: number
    nodesByType: Record<string, number>
    nodesByExecutionType: Record<string, number>
    nodesWithSLA: number
    nodesWithKPIs: number
  } | null
}

export interface FunctionModelNodesActions {
  // Node operations
  createNode: (nodeType: FunctionModelNode['nodeType'], name: string, position: { x: number; y: number }, options?: Partial<FunctionModelNode>) => Promise<FunctionModelNode>
  updateNode: (nodeId: string, updates: Partial<FunctionModelNode>) => Promise<FunctionModelNode>
  deleteNode: (nodeId: string) => Promise<void>
  getNode: (nodeId: string) => FunctionModelNode | undefined
  
  // Node behavior operations
  executeNode: (nodeId: string, context?: any) => Promise<any>
  validateNode: (nodeId: string) => Promise<{ isValid: boolean; errors: string[]; warnings: string[] }>
  getNodeBehavior: (nodeId: string) => any
  
  // Cross-feature linking operations
  createNodeLink: (targetFeature: string, targetEntityId: string, targetNodeId?: string, linkType?: string, context?: any) => Promise<NodeLinkRecord>
  getNodeLinks: (nodeId?: string) => NodeLinkRecord[]
  deleteNodeLink: (linkId: string) => Promise<void>
  
  // Metadata operations
  updateNodeMetadata: (nodeId: string, metadata: Partial<NodeMetadataRecord>) => Promise<void>
  updateNodeVisualProperties: (nodeId: string, visualProperties: Record<string, any>) => Promise<void>
  
  // Search and filtering
  searchNodes: (query: string) => FunctionModelNode[]
  getNodesByType: (nodeType: FunctionModelNode['nodeType']) => FunctionModelNode[]
  getNodesByExecutionType: (executionType: string) => FunctionModelNode[]
  getNodesWithSLA: () => FunctionModelNode[]
  getNodesWithKPIs: () => FunctionModelNode[]
  
  // Statistics and analytics
  refreshStatistics: () => Promise<void>
  
  // Bulk operations
  bulkUpdateNodes: (updates: Partial<FunctionModelNode>) => Promise<void>
  bulkCreateNodes: (nodes: Omit<FunctionModelNode, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<FunctionModelNode[]>
  
  // State management
  refreshNodes: () => Promise<void>
  clearError: () => void
}

export function useFunctionModelNodes(options: UseFunctionModelNodesOptions): [FunctionModelNodesState, FunctionModelNodesActions] {
  const { modelId, autoSave = true, autoSaveInterval = 5000, enableNodeBehavior = true, enableCrossFeatureLinking = true } = options
  const { toast } = useToast()
  
  const [state, setState] = useState<FunctionModelNodesState>({
    nodes: [],
    metadata: [],
    links: [],
    isLoading: true,
    isSaving: false,
    error: null,
    statistics: null
  })

  const functionModelRepository = new FunctionModelRepository()
  const nodeMetadataRepository = new NodeMetadataRepository()
  const nodeLinksRepository = new NodeLinksRepository()

  // Load nodes on mount
  useEffect(() => {
    loadNodes()
  }, [modelId])

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave) return

    const interval = setInterval(() => {
      if (state.nodes.length > 0 && !state.isSaving) {
        saveNodes()
      }
    }, autoSaveInterval)

    return () => clearInterval(interval)
  }, [autoSave, autoSaveInterval, state.nodes, state.isSaving])

  const loadNodes = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const [nodes, metadata, links, statistics] = await Promise.all([
        functionModelRepository.getFunctionModelNodes(modelId),
        nodeMetadataRepository.getMetadataByEntity('function-model', modelId),
        nodeLinksRepository.getNodeLinks('function-model', modelId),
        functionModelRepository.getNodeStatistics(modelId)
      ])

      setState(prev => ({
        ...prev,
        nodes,
        metadata,
        links,
        statistics,
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load nodes',
        isLoading: false
      }))
      toast({
        title: 'Error',
        description: 'Failed to load function model nodes',
        variant: 'destructive'
      })
    }
  }, [modelId, toast])

  const saveNodes = useCallback(async () => {
    if (state.nodes.length === 0) return

    try {
      setState(prev => ({ ...prev, isSaving: true }))

      // Save nodes in parallel
      await Promise.all(
        state.nodes.map(node => 
          functionModelRepository.updateFunctionModelNode(modelId, node.id, node)
        )
      )

      setState(prev => ({ ...prev, isSaving: false }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save nodes',
        isSaving: false
      }))
      toast({
        title: 'Error',
        description: 'Failed to save function model nodes',
        variant: 'destructive'
      })
    }
  }, [state.nodes, modelId, toast])

  const createNode = useCallback(async (
    nodeType: FunctionModelNode['nodeType'],
    name: string,
    position: { x: number; y: number },
    options: Partial<FunctionModelNode> = {}
  ): Promise<FunctionModelNode> => {
    try {
      const newNode = createFunctionModelNode(nodeType, name, position, options)
      const savedNode = await functionModelRepository.createFunctionModelNode(newNode)

      // Create metadata for the new node
      const metadata: Omit<NodeMetadataRecord, 'metadataId' | 'createdAt' | 'updatedAt'> = {
        featureType: 'function-model',
        entityId: modelId,
        nodeId: savedNode.id,
        nodeType: savedNode.nodeType,
        positionX: savedNode.position.x,
        positionY: savedNode.position.y,
        searchKeywords: [name, nodeType, 'function-model'],
        visualProperties: savedNode.visualProperties
      }

      const savedMetadata = await nodeMetadataRepository.createMetadata(metadata)

      setState(prev => ({
        ...prev,
        nodes: [...prev.nodes, savedNode],
        metadata: [...prev.metadata, savedMetadata]
      }))

      toast({
        title: 'Success',
        description: `Created ${nodeType} node: ${name}`
      })

      return savedNode
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create node'
      setState(prev => ({ ...prev, error: errorMessage }))
      toast({
        title: 'Error',
        description: 'Failed to create node',
        variant: 'destructive'
      })
      throw error
    }
  }, [modelId, toast])

  const updateNode = useCallback(async (nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode> => {
    try {
      const updatedNode = await functionModelRepository.updateFunctionModelNode(modelId, nodeId, updates)

      setState(prev => ({
        ...prev,
        nodes: prev.nodes.map(node => node.id === nodeId ? updatedNode : node)
      }))

      toast({
        title: 'Success',
        description: 'Node updated successfully'
      })

      return updatedNode
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update node'
      setState(prev => ({ ...prev, error: errorMessage }))
      toast({
        title: 'Error',
        description: 'Failed to update node',
        variant: 'destructive'
      })
      throw error
    }
  }, [modelId, toast])

  const deleteNode = useCallback(async (nodeId: string): Promise<void> => {
    try {
      await functionModelRepository.deleteFunctionModelNode(modelId, nodeId)

      setState(prev => ({
        ...prev,
        nodes: prev.nodes.filter(node => node.id !== nodeId),
        metadata: prev.metadata.filter(meta => meta.nodeId !== nodeId),
        links: prev.links.filter(link => link.sourceNodeId !== nodeId && link.targetNodeId !== nodeId)
      }))

      toast({
        title: 'Success',
        description: 'Node deleted successfully'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete node'
      setState(prev => ({ ...prev, error: errorMessage }))
      toast({
        title: 'Error',
        description: 'Failed to delete node',
        variant: 'destructive'
      })
      throw error
    }
  }, [modelId, toast])

  const getNode = useCallback((nodeId: string): FunctionModelNode | undefined => {
    return state.nodes.find(node => node.id === nodeId)
  }, [state.nodes])

  const executeNode = useCallback(async (nodeId: string, context?: any): Promise<any> => {
    if (!enableNodeBehavior) {
      throw new Error('Node behavior is disabled')
    }

    const node = getNode(nodeId)
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`)
    }

    const behavior = NodeBehaviorFactory.createProcessBehavior(node)
    const result = await behavior.execute(context)

    toast({
      title: 'Node Execution',
      description: result.success ? 'Node executed successfully' : `Execution failed: ${result.error}`,
      variant: result.success ? 'default' : 'destructive'
    })

    return result
  }, [getNode, enableNodeBehavior, toast])

  const validateNode = useCallback(async (nodeId: string): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> => {
    if (!enableNodeBehavior) {
      return { isValid: true, errors: [], warnings: [] }
    }

    const node = getNode(nodeId)
    if (!node) {
      return { isValid: false, errors: [`Node not found: ${nodeId}`], warnings: [] }
    }

    const behavior = NodeBehaviorFactory.createBehavior(node)
    return behavior.validate()
  }, [getNode, enableNodeBehavior])

  const getNodeBehavior = useCallback((nodeId: string): any => {
    if (!enableNodeBehavior) {
      return null
    }

    const node = getNode(nodeId)
    if (!node) {
      return null
    }

    return NodeBehaviorFactory.createBehavior(node)
  }, [getNode, enableNodeBehavior])

  const createNodeLink = useCallback(async (
    targetFeature: string,
    targetEntityId: string,
    targetNodeId?: string,
    linkType: string = 'references',
    context: any = {}
  ): Promise<NodeLinkRecord> => {
    if (!enableCrossFeatureLinking) {
      throw new Error('Cross-feature linking is disabled')
    }

    try {
      const link: Omit<NodeLinkRecord, 'linkId' | 'createdAt' | 'updatedAt'> = {
        sourceFeature: 'function-model',
        sourceEntityId: modelId,
        targetFeature: targetFeature as any,
        targetEntityId,
        targetNodeId,
        linkType: linkType as any,
        linkStrength: 1.0,
        linkContext: context,
        visualProperties: {}
      }

      const savedLink = await nodeLinksRepository.createNodeLink(link)

      setState(prev => ({
        ...prev,
        links: [...prev.links, savedLink]
      }))

      toast({
        title: 'Success',
        description: 'Node link created successfully'
      })

      return savedLink
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create node link'
      setState(prev => ({ ...prev, error: errorMessage }))
      toast({
        title: 'Error',
        description: 'Failed to create node link',
        variant: 'destructive'
      })
      throw error
    }
  }, [modelId, enableCrossFeatureLinking, toast])

  const getNodeLinks = useCallback((nodeId?: string): NodeLinkRecord[] => {
    if (nodeId) {
      return state.links.filter(link => link.sourceNodeId === nodeId || link.targetNodeId === nodeId)
    }
    return state.links
  }, [state.links])

  const deleteNodeLink = useCallback(async (linkId: string): Promise<void> => {
    try {
      await nodeLinksRepository.deleteNodeLink(linkId)

      setState(prev => ({
        ...prev,
        links: prev.links.filter(link => link.linkId !== linkId)
      }))

      toast({
        title: 'Success',
        description: 'Node link deleted successfully'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete node link'
      setState(prev => ({ ...prev, error: errorMessage }))
      toast({
        title: 'Error',
        description: 'Failed to delete node link',
        variant: 'destructive'
      })
      throw error
    }
  }, [toast])

  const updateNodeMetadata = useCallback(async (nodeId: string, metadata: Partial<NodeMetadataRecord>): Promise<void> => {
    try {
      const nodeMetadata = state.metadata.find(meta => meta.nodeId === nodeId)
      if (!nodeMetadata) {
        throw new Error(`Metadata not found for node: ${nodeId}`)
      }

      const updatedMetadata = await nodeMetadataRepository.updateMetadata(nodeMetadata.metadataId, metadata)

      setState(prev => ({
        ...prev,
        metadata: prev.metadata.map(meta => meta.metadataId === updatedMetadata.metadataId ? updatedMetadata : meta)
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update node metadata'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [state.metadata])

  const updateNodeVisualProperties = useCallback(async (nodeId: string, visualProperties: Record<string, any>): Promise<void> => {
    try {
      const nodeMetadata = state.metadata.find(meta => meta.nodeId === nodeId)
      if (!nodeMetadata) {
        throw new Error(`Metadata not found for node: ${nodeId}`)
      }

      await nodeMetadataRepository.updateVisualProperties(nodeMetadata.metadataId, visualProperties)

      setState(prev => ({
        ...prev,
        metadata: prev.metadata.map(meta => 
          meta.nodeId === nodeId 
            ? { ...meta, visualProperties: { ...meta.visualProperties, ...visualProperties } }
            : meta
        )
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update visual properties'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [state.metadata])

  const searchNodes = useCallback((query: string): FunctionModelNode[] => {
    if (!query.trim()) return state.nodes

    const lowerQuery = query.toLowerCase()
    return state.nodes.filter(node => 
      node.name.toLowerCase().includes(lowerQuery) ||
      node.description?.toLowerCase().includes(lowerQuery) ||
      node.nodeType.toLowerCase().includes(lowerQuery)
    )
  }, [state.nodes])

  const getNodesByType = useCallback((nodeType: FunctionModelNode['nodeType']): FunctionModelNode[] => {
    return state.nodes.filter(node => node.nodeType === nodeType)
  }, [state.nodes])

  const getNodesByExecutionType = useCallback((executionType: string): FunctionModelNode[] => {
    return state.nodes.filter(node => node.processBehavior.executionType === executionType)
  }, [state.nodes])

  const getNodesWithSLA = useCallback((): FunctionModelNode[] => {
    return state.nodes.filter(node => node.businessLogic.sla !== undefined)
  }, [state.nodes])

  const getNodesWithKPIs = useCallback((): FunctionModelNode[] => {
    return state.nodes.filter(node => (node.businessLogic.kpis?.length || 0) > 0)
  }, [state.nodes])

  const refreshStatistics = useCallback(async (): Promise<void> => {
    try {
      const statistics = await functionModelRepository.getNodeStatistics(modelId)
      setState(prev => ({ ...prev, statistics }))
    } catch (error) {
      console.error('Failed to refresh statistics:', error)
    }
  }, [modelId])

  const bulkUpdateNodes = useCallback(async (updates: Partial<FunctionModelNode>): Promise<void> => {
    try {
      await functionModelRepository.bulkUpdateNodes(modelId, updates)

      setState(prev => ({
        ...prev,
        nodes: prev.nodes.map(node => ({ ...node, ...updates }))
      }))

      toast({
        title: 'Success',
        description: 'Nodes updated in bulk'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to bulk update nodes'
      setState(prev => ({ ...prev, error: errorMessage }))
      toast({
        title: 'Error',
        description: 'Failed to bulk update nodes',
        variant: 'destructive'
      })
      throw error
    }
  }, [modelId, toast])

  const bulkCreateNodes = useCallback(async (nodes: Omit<FunctionModelNode, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<FunctionModelNode[]> => {
    try {
      const createdNodes = await Promise.all(
        nodes.map(node => functionModelRepository.createFunctionModelNode(node))
      )

      setState(prev => ({
        ...prev,
        nodes: [...prev.nodes, ...createdNodes]
      }))

      toast({
        title: 'Success',
        description: `Created ${createdNodes.length} nodes`
      })

      return createdNodes
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to bulk create nodes'
      setState(prev => ({ ...prev, error: errorMessage }))
      toast({
        title: 'Error',
        description: 'Failed to bulk create nodes',
        variant: 'destructive'
      })
      throw error
    }
  }, [toast])

  const refreshNodes = useCallback(async (): Promise<void> => {
    await loadNodes()
  }, [loadNodes])

  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const actions: FunctionModelNodesActions = {
    createNode,
    updateNode,
    deleteNode,
    getNode,
    executeNode,
    validateNode,
    getNodeBehavior,
    createNodeLink,
    getNodeLinks,
    deleteNodeLink,
    updateNodeMetadata,
    updateNodeVisualProperties,
    searchNodes,
    getNodesByType,
    getNodesByExecutionType,
    getNodesWithSLA,
    getNodesWithKPIs,
    refreshStatistics,
    bulkUpdateNodes,
    bulkCreateNodes,
    refreshNodes,
    clearError
  }

  return [state, actions]
} 