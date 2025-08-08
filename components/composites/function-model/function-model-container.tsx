'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { FunctionModelCanvas } from '@/app/(private)/dashboard/function-model/components/function-model-canvas'
import { useFunctionModelSaveUseCases } from '@/lib/application/hooks/use-function-model-save-use-cases'
import { useUniversalCrossFeatureLinking } from '@/lib/application/hooks/use-universal-cross-feature-linking'
import { useFeedback } from '@/components/ui/feedback-toast'
import type { FunctionModel } from '@/lib/domain/entities/function-model-types'
import type { FunctionModelNode } from '@/lib/domain/entities/function-model-node-types'
import type { CrossFeatureLink } from '@/lib/domain/entities/cross-feature-link-types'

interface FunctionModelContainerProps {
  modelId: string
  readOnly?: boolean
}

export function FunctionModelContainer({ 
  modelId, 
  readOnly = false 
}: FunctionModelContainerProps) {
  // Initialize Application layer hooks
  const {
    saveFunctionModel,
    loadFunctionModel,
    createVersion,
    restoreFromVersion,
    updateFunctionModelMetadata,
    isSaving,
    isLoading: isSaveLoading,
    isCreatingVersion,
    isRestoring,
    isUpdatingMetadata,
    lastSaveResult,
    lastLoadResult,
    error: saveError
  } = useFunctionModelSaveUseCases()

  const {
    links: crossFeatureLinks,
    loading: crossFeatureLoading,
    error: crossFeatureError,
    createUniversalLink,
    searchEntities,
    loadLinks,
    deleteLink,
    clearError: clearCrossFeatureError
  } = useUniversalCrossFeatureLinking()

  const { showSuccess, showError } = useFeedback()

  // State management
  const [nodes, setNodes] = useState<FunctionModelNode[]>([])
  const [links, setLinks] = useState<any[]>([])
  const [model, setModel] = useState<FunctionModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Modal state management
  const [modalStack, setModalStack] = useState<any[]>([])
  const [currentModal, setCurrentModal] = useState<any>(null)

  // Node selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  // Node editing state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingDescriptionNodeId, setEditingDescriptionNodeId] = useState<string | null>(null)

  // Load model and nodes when modelId changes
  useEffect(() => {
    if (modelId) {
      loadModelAndNodes()
    }
  }, [modelId])

  // Load model and nodes function
  const loadModelAndNodes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load the function model
      const result = await loadFunctionModel(modelId)
      
      if (result.success && result.model) {
        setModel(result.model)
        
        // Load nodes and links from the result
        if (result.nodes) {
          setNodes(result.nodes)
        }
        
        if (result.edges) {
          setLinks(result.edges)
        }

        // Load cross-feature links
        await loadLinks('function-model', modelId)
        
        showSuccess('Model loaded successfully')
      } else {
        setError(result.errors.join(', ') || 'Failed to load model')
        showError(result.errors.join(', ') || 'Failed to load model')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load model'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [modelId, loadFunctionModel, loadLinks, showSuccess, showError])

  // Node operations
  const createNode = useCallback(async (nodeType: string, name: string, position: any, options?: any) => {
    try {
      const newNode: FunctionModelNode = {
        nodeId: `node-${Date.now()}`,
        nodeType: nodeType as any,
        name: name,
        description: '',
        position: position,
        businessLogic: {},
        processBehavior: {},
        metadata: options || {},
        functionModelData: {
          container: null,
          stage: null,
          action: null,
          data: null
        }
      }

      setNodes(prev => [...prev, newNode])
      setHasUnsavedChanges(true)
      
      showSuccess('Node created successfully')
      return newNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create node'
      showError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [showSuccess, showError])

  const updateNode = useCallback(async (nodeId: string, updates: any) => {
    try {
      setNodes(prev => prev.map(node => 
        node.nodeId === nodeId 
          ? { ...node, ...updates }
          : node
      ))
      setHasUnsavedChanges(true)
      
      showSuccess('Node updated successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update node'
      showError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [showSuccess, showError])

  const deleteNode = useCallback(async (nodeId: string) => {
    try {
      setNodes(prev => prev.filter(node => node.nodeId !== nodeId))
      setLinks(prev => prev.filter(link => 
        link.sourceNodeId !== nodeId && link.targetNodeId !== nodeId
      ))
      setHasUnsavedChanges(true)
      
      showSuccess('Node deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete node'
      showError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [showSuccess, showError])

  // Connection operations
  const createConnection = useCallback(async (source: string, target: string, sourceHandle: string, targetHandle: string) => {
    try {
      const newLink = {
        linkId: `link-${Date.now()}`,
        sourceNodeId: source,
        targetNodeId: target,
        sourceHandle,
        targetHandle,
        linkType: 'default',
        linkStrength: 1.0,
        linkContext: {},
        visualProperties: {}
      }

      setLinks(prev => [...prev, newLink])
      setHasUnsavedChanges(true)
      
      showSuccess('Connection created successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create connection'
      showError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [showSuccess, showError])

  const deleteConnection = useCallback(async (connectionId: string) => {
    try {
      setLinks(prev => prev.filter(link => link.linkId !== connectionId))
      setHasUnsavedChanges(true)
      
      showSuccess('Connection deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete connection'
      showError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [showSuccess, showError])

  // Save operations
  const persistChanges = useCallback(async () => {
    try {
      if (!model) {
        throw new Error('No model to save')
      }

      const result = await saveFunctionModel(
        model.modelId,
        nodes,
        links,
        {
          changeSummary: 'User made changes to the model',
          author: 'current-user', // TODO: Get actual user
          isPublished: model.status === 'published'
        }
      )

      if (result.success) {
        setHasUnsavedChanges(false)
        showSuccess('Changes saved successfully')
      } else {
        showError(result.errors.join(', ') || 'Failed to save changes')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes'
      showError(errorMessage)
    }
  }, [model, nodes, links, saveFunctionModel, showSuccess, showError])

  // Model update operations
  const updateModel = useCallback((updates: any) => {
    if (model) {
      setModel({ ...model, ...updates })
      setHasUnsavedChanges(true)
    }
  }, [model])

  // Selection operations
  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
    setSelectedNodeIds([nodeId])
  }, [])

  const selectNodes = useCallback((nodeIds: string[]) => {
    setSelectedNodeIds(nodeIds)
    setSelectedNodeId(nodeIds.length === 1 ? nodeIds[0] : null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null)
    setSelectedNodeIds([])
  }, [])

  const setHoveredNode = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId)
  }, [])

  // Editing operations
  const startEditingName = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId)
  }, [])

  const stopEditingName = useCallback(() => {
    setEditingNodeId(null)
  }, [])

  const startEditingDescription = useCallback((nodeId: string) => {
    setEditingDescriptionNodeId(nodeId)
  }, [])

  const stopEditingDescription = useCallback(() => {
    setEditingDescriptionNodeId(null)
  }, [])

  // Error handling
  const clearError = useCallback(() => {
    setError(null)
    clearCrossFeatureError()
  }, [clearCrossFeatureError])

  const discardChanges = useCallback(() => {
    setHasUnsavedChanges(false)
    // Reload the model to discard changes
    loadModelAndNodes()
  }, [loadModelAndNodes])

  // Modal operations
  const openModal = useCallback((modal: any) => {
    setModalStack(prev => [...prev, modal])
    setCurrentModal(modal)
  }, [])

  const closeModal = useCallback(() => {
    setModalStack(prev => {
      const newStack = prev.slice(0, -1)
      setCurrentModal(newStack.length > 0 ? newStack[newStack.length - 1] : null)
      return newStack
    })
  }, [])

  const closeAllModals = useCallback(() => {
    setModalStack([])
    setCurrentModal(null)
  }, [])

  const goBackToPreviousModal = useCallback(() => {
    if (modalStack.length > 1) {
      setModalStack(prev => {
        const newStack = prev.slice(0, -1)
        setCurrentModal(newStack[newStack.length - 1])
        return newStack
      })
    }
  }, [modalStack])

  const closeModalsByContext = useCallback((context: string) => {
    setModalStack(prev => {
      const newStack = prev.filter(modal => modal.context !== context)
      setCurrentModal(newStack.length > 0 ? newStack[newStack.length - 1] : null)
      return newStack
    })
  }, [])

  const updateCurrentModal = useCallback((updates: any) => {
    setCurrentModal(prev => prev ? { ...prev, ...updates } : null)
  }, [])

  // Computed values
  const hasModals = modalStack.length > 0
  const modalCount = modalStack.length
  const canGoBack = modalStack.length > 1

  // Check for unsaved changes
  const checkHasUnsavedChanges = useCallback(() => {
    return hasUnsavedChanges
  }, [hasUnsavedChanges])

  // Load nodes function (for canvas compatibility)
  const loadNodes = useCallback(async () => {
    await loadModelAndNodes()
  }, [loadModelAndNodes])

  return (
    <FunctionModelCanvas
      modelId={modelId}
      readOnly={readOnly}
      // State data
      nodes={nodes}
      links={links}
      model={model}
      loading={loading}
      error={error}
      // State management functions
      createNode={createNode}
      updateNode={updateNode}
      deleteNode={deleteNode}
      createConnection={createConnection}
      deleteConnection={deleteConnection}
      persistChanges={persistChanges}
      hasUnsavedChanges={checkHasUnsavedChanges}
      // Modal management
      modalStack={modalStack}
      openModal={openModal}
      closeModal={closeModal}
      // Other functions
      loadNodes={loadNodes}
      updateModel={updateModel}
      // Additional state management functions
      selectNode={selectNode}
      selectNodes={selectNodes}
      clearSelection={clearSelection}
      setHoveredNode={setHoveredNode}
      startEditingName={startEditingName}
      stopEditingName={stopEditingName}
      startEditingDescription={startEditingDescription}
      stopEditingDescription={stopEditingDescription}
      clearError={clearError}
      discardChanges={discardChanges}
      // Modal stack management
      currentModal={currentModal}
      canGoBack={canGoBack}
      closeAllModals={closeAllModals}
      goBackToPreviousModal={goBackToPreviousModal}
      closeModalsByContext={closeModalsByContext}
      updateCurrentModal={updateCurrentModal}
      hasModals={hasModals}
      modalCount={modalCount}
    />
  )
}
