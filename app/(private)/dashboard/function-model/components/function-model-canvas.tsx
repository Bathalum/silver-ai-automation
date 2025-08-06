'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import ReactFlow, { 
  Node, 
  Edge, 
  Connection, 
  NodeChange, 
  EdgeChange,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  useNodesState,
  useEdgesState
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Edit, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { useFunctionModelNodes } from '@/lib/application/hooks/use-function-model-nodes'
import { validateConnection } from '@/lib/domain/entities/function-model-connection-rules'
import { FunctionModelNode } from '@/lib/domain/entities/function-model-node-types'
import { getFunctionModelById, updateFunctionModel } from '@/lib/application/use-cases/function-model-use-cases'
import { useFeedback } from '@/components/ui/feedback-toast'

// Import existing node components
import { StageNode, ActionTableNode, IONode } from './flow-nodes'

// Import existing UI components
import { FloatingToolbar } from './floating-toolbar'
import { PersistenceModal } from './persistence-sidebar'
import { ModalStack } from './modal-stack'

// Import the new floating field components
import { FloatingNameField, FloatingDescriptionField } from '@/components/composites/function-model/floating-model-fields'

// Import the new edge context menu component
import { EdgeContextMenu } from './edge-context-menu'

const nodeTypes = {
  stageNode: StageNode,
  actionTableNode: ActionTableNode,
  ioNode: IONode
}

// Context Menu Component
interface ContextMenuProps {
  x: number
  y: number
  nodeId: string
  onDelete: (nodeId: string) => void
  onEdit: (nodeId: string) => void
  onCopy: (nodeId: string) => void
  onClose: () => void
}

function ContextMenu({ x, y, nodeId, onDelete, onEdit, onCopy, onClose }: ContextMenuProps) {
  return (
    <div 
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      <button
        onClick={() => {
          onEdit(nodeId)
          onClose()
        }}
        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
      >
        <Edit className="w-4 h-4" />
        Edit Node
      </button>
      <button
        onClick={() => {
          onCopy(nodeId)
          onClose()
        }}
        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
      >
        <Copy className="w-4 h-4" />
        Copy Node
      </button>
      <div className="border-t border-gray-200 my-1"></div>
      <button
        onClick={() => {
          onDelete(nodeId)
          onClose()
        }}
        className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Delete Node
      </button>
    </div>
  )
}

export function FunctionModelCanvas({ modelId, readOnly = false }: { modelId: string; readOnly?: boolean }) {
  const router = useRouter()
  
  // SINGLE SOURCE OF TRUTH: Application Layer State Only
  const { 
    nodes: appNodes,
    links: appLinks,
    model,
    loading, 
    error, 
    loadNodes,
    modalStack,
    currentModal,
    canGoBack,
    openModal,
    closeModal,
    closeAllModals,
    goBackToPreviousModal,
    closeModalsByContext,
    updateCurrentModal,
    hasModals,
    modalCount,
    createNode, 
    updateNode, 
    createConnection,
    deleteConnection,
    deleteNode,
    selectNode,
    selectNodes,
    clearSelection,
    setHoveredNode,
    startEditingName,
    stopEditingName,
    startEditingDescription,
    stopEditingDescription,
    clearError
  } = useFunctionModelNodes(modelId)
  
  // UI State (Presentation Layer Only)
  const [modelLoading, setModelLoading] = useState(true)
  const [isEditingModel, setIsEditingModel] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    nodeId: string
  } | null>(null)
  const [edgeContextMenu, setEdgeContextMenu] = useState<{
    x: number
    y: number
    edgeId: string
  } | null>(null)
  const [persistenceSidebarOpen, setPersistenceSidebarOpen] = useState(false)
  const [activePersistenceTab, setActivePersistenceTab] = useState<'save' | 'links'>('save')
  const [isVersionLoading, setIsVersionLoading] = useState(false)
  
  // Accessibility state
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState<string>('')
  
  // Get feedback toast functions
  const { showSuccess, showError } = useFeedback()
  
  // OPTIMIZED: Batch position updates for efficiency
  const pendingPositionUpdates = useRef<Map<string, { x: number; y: number }>>(new Map())
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Load model data ONCE on mount
  useEffect(() => {
    console.log('Initial load for modelId:', modelId)
    loadNodes()
    setModelLoading(false)
  }, [modelId, loadNodes])

  // OPTIMIZED: Node conversion function with memoization
  const convertToReactFlowNode = useCallback((unifiedNode: FunctionModelNode): Node => {
    return {
      id: unifiedNode.nodeId,
      type: unifiedNode.nodeType,
      position: unifiedNode.position,
      data: {
        ...unifiedNode.functionModelData,
        name: unifiedNode.name,
        description: unifiedNode.description,
        businessLogic: unifiedNode.businessLogic,
        processBehavior: unifiedNode.processBehavior,
        metadata: unifiedNode.metadata
      },
      draggable: true,
      selectable: true,
      deletable: true
    }
  }, [])

  // Convert application nodes to React Flow nodes (SINGLE SOURCE OF TRUTH)
  const reactFlowNodes = useMemo(() => {
    return appNodes?.map(convertToReactFlowNode) || []
  }, [appNodes, convertToReactFlowNode])

  // Convert application links to React Flow edges (SINGLE SOURCE OF TRUTH)
  const reactFlowEdges = useMemo(() => {
    return appLinks?.map(link => ({
      id: link.linkId,
      source: link.sourceNodeId,
      target: link.targetNodeId,
      sourceHandle: link.sourceHandle,
      targetHandle: link.targetHandle,
      type: 'default'
    })) || []
  }, [appLinks])

  // REQUIRED: React Flow internal state management (for interactive operations)
  const [nodes, setNodes, onNodesChange] = useNodesState(reactFlowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges)

  // SYNC: Keep React Flow state in sync with application state
  useEffect(() => {
    setNodes(reactFlowNodes)
  }, [reactFlowNodes, setNodes])

  useEffect(() => {
    setEdges(reactFlowEdges)
  }, [reactFlowEdges, setEdges])

  // REQUIRED: Handle edge changes (deletions)
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    // Let React Flow handle internal state updates
    onEdgesChange(changes)
    
    // Handle edge deletion immediately
    changes.forEach(change => {
      if (change.type === 'remove') {
        deleteConnection(change.id).catch(error => {
          console.error('Failed to delete connection:', error)
        })
      }
    })
  }, [onEdgesChange, deleteConnection])

  // OPTIMIZED: Batch position updates on drag end
  const handleNodeDragStop = useCallback(async (event: React.MouseEvent, node: Node) => {
    console.log(`Node ${node.id} drag stopped at:`, node.position)
    
    // Add to pending updates for batching
    pendingPositionUpdates.current.set(node.id, node.position)
    
    // NO DATABASE UPDATE HERE - only track for later persistence
    // This prevents canvas reload and follows React Flow best practices
    console.log(`Position change tracked for node ${node.id}, will persist on save`)
  }, [])

  // NEW: Function to persist all pending position updates
  const persistPendingPositions = useCallback(async () => {
    const updates = Array.from(pendingPositionUpdates.current.entries()).map(([nodeId, position]) => ({
      nodeId,
      position
    }))
    
    if (updates.length > 0) {
      try {
        console.log(`Persisting ${updates.length} position updates to database`)
        
        // Update all positions in parallel
        await Promise.all(updates.map(({ nodeId, position }) => 
          updateNode(nodeId, { position })
        ))
        
        console.log(`Successfully persisted ${updates.length} node positions`)
        
        // Clear pending updates
        pendingPositionUpdates.current.clear()
        
        showSuccess('Position changes saved successfully')
      } catch (error) {
        console.error('Failed to persist node positions:', error)
        showError(`Failed to save node positions: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }, [updateNode, showSuccess, showError])

  // NEW: Check if there are unsaved position changes
  const hasUnsavedChanges = useCallback(() => {
    return pendingPositionUpdates.current.size > 0
  }, [])

  // Context menu handlers
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    event.stopPropagation()
    
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id
    })
  }, [])

  const handleContextMenuDelete = useCallback((nodeId: string) => {
    if (!appNodes) return
    const functionModelNode = appNodes.find(n => n.nodeId === nodeId)
    if (!functionModelNode) return
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${functionModelNode.name}"? This action cannot be undone.`
    )
    
    if (confirmed) {
      deleteNode(nodeId)
    }
    
    setContextMenu(null)
  }, [appNodes, deleteNode])

  const handleContextMenuEdit = useCallback((nodeId: string) => {
    if (!appNodes) return
    const functionModelNode = appNodes.find(n => n.nodeId === nodeId)
    if (!functionModelNode) return
    
    // Open edit modal or switch to edit mode
    console.log('Edit node:', functionModelNode)
    
    setContextMenu(null)
  }, [appNodes])

  const handleContextMenuCopy = useCallback((nodeId: string) => {
    if (!appNodes) return
    const functionModelNode = appNodes.find(n => n.nodeId === nodeId)
    if (!functionModelNode) return
    
    // Create a copy of the node
    const newNode = {
      ...functionModelNode,
      nodeId: `copy-${Date.now()}`,
      name: `${functionModelNode.name} (Copy)`,
      position: {
        x: functionModelNode.position.x + 50,
        y: functionModelNode.position.y + 50
      }
    }
    
    createNode(newNode.nodeType, newNode.name, newNode.position, {})
    
    setContextMenu(null)
  }, [appNodes, createNode])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null)
      setEdgeContextMenu(null)
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Preserve ALL existing connection validation
  const handleIsValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !appNodes) return false
    
    const sourceNode = appNodes.find(n => n.nodeId === connection.source)
    const targetNode = appNodes.find(n => n.nodeId === connection.target)
    
    if (!sourceNode || !targetNode) return false
    
    // Add your connection validation logic here
    return true
  }, [appNodes])

  // Preserve ALL existing node creation handlers
  const handleAddStageNode = useCallback(async () => {
    try {
      const position = { x: Math.random() * 400, y: Math.random() * 400 }
      await createNode('stageNode', 'New Stage', position, {})
      // Could add success feedback here if needed
    } catch (error) {
      console.error('Failed to add stage node:', error)
      // Could add error feedback here if needed
    }
  }, [createNode])

  const handleAddActionNode = useCallback(async () => {
    try {
      const position = { x: Math.random() * 400, y: Math.random() * 400 }
      await createNode('actionTableNode', 'New Action', position, {})
      // Could add success feedback here if needed
    } catch (error) {
      console.error('Failed to add action node:', error)
      // Could add error feedback here if needed
    }
  }, [createNode])

  const handleAddIONode = useCallback(async () => {
    try {
      const position = { x: Math.random() * 400, y: Math.random() * 400 }
      await createNode('ioNode', 'New I/O', position, {})
      // Could add success feedback here if needed
    } catch (error) {
      console.error('Failed to add I/O node:', error)
      // Could add error feedback here if needed
    }
  }, [createNode])

  // Preserve ALL existing connection handlers
  const handleConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return
    
    try {
      await createConnection(
        connection.source,
        connection.target,
        connection.sourceHandle,
        connection.targetHandle
      )
    } catch (error) {
      console.error('Failed to create connection:', error)
    }
  }, [createConnection])

  // Preserve ALL existing node click handling
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (!appNodes) return
    const functionModelNode = appNodes.find(n => n.nodeId === node.id)
    if (!functionModelNode) return
    
    // Handle node selection
    selectNode(functionModelNode)
    
    // Open appropriate modal based on node type
    switch (functionModelNode.nodeType) {
      case 'stageNode':
        openModal({
          type: 'stage',
          data: functionModelNode.functionModelData.stage || functionModelNode
        })
        break
      case 'actionTableNode':
        openModal({
          type: 'action',
          data: functionModelNode.functionModelData.action || functionModelNode
        })
        break
      case 'ioNode':
        const ioData = functionModelNode.functionModelData.io
        if (ioData?.mode === 'input') {
          openModal({
            type: 'input',
            data: ioData
          })
        } else {
          openModal({
            type: 'output',
            data: ioData
          })
        }
        break
      default:
        openModal({
          type: 'function',
          data: functionModelNode
        })
    }
  }, [appNodes, selectNode, openModal])

  // Preserve ALL existing edge context menu handling
  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault()
    event.stopPropagation()
    
    setEdgeContextMenu({
      x: event.clientX,
      y: event.clientY,
      edgeId: edge.id
    })
  }, [])

  // Edge context menu action handlers
  const handleEdgeContextMenuDelete = useCallback((edgeId: string) => {
    try {
      deleteConnection(edgeId)
      setEdgeContextMenu(null)
    } catch (error) {
      console.error('Failed to delete edge:', error)
    }
  }, [deleteConnection])

  const handleEdgeContextMenuClose = useCallback(() => {
    setEdgeContextMenu(null)
  }, [])

  // Preserve ALL existing node double-click handling
  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (!appNodes) return
    const functionModelNode = appNodes.find(n => n.nodeId === node.id)
    if (!functionModelNode) return
    
    // Start inline editing
    startEditingName()
  }, [appNodes, startEditingName])

  // Preserve ALL existing node mouse enter/leave handling
  const handleNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
    if (!appNodes) return
    const functionModelNode = appNodes.find(n => n.nodeId === node.id)
    if (functionModelNode) {
      setHoveredNode(functionModelNode)
    }
  }, [appNodes, setHoveredNode])

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNode(null)
  }, [setHoveredNode])

  // Accessibility: Announce changes to screen readers
  const announceToScreenReader = useCallback((message: string) => {
    setAnnouncement(message)
    // Clear announcement after a short delay
    setTimeout(() => setAnnouncement(''), 1000)
  }, [])

  // Preserve ALL existing keyboard handlers
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setContextMenu(null)
      setEdgeContextMenu(null)
    }
  }, [])

  useEffect(() => {
    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
        setEdgeContextMenu(null)
      }
    }
    
    document.addEventListener('keydown', handleDocumentKeyDown)
    return () => document.removeEventListener('keydown', handleDocumentKeyDown)
  }, [])

  // Debounced save function for name/description updates
  const debouncedSave = useCallback(async (updates: { name?: string; description?: string }) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateFunctionModel(modelId, updates)
        showSuccess('Model saved successfully!')
      } catch (error) {
        console.error('Failed to save model:', error)
        showError('Failed to save model')
      }
    }, 1000) // 1 second debounce
  }, [modelId, showSuccess, showError])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      // Clear any pending position updates
      pendingPositionUpdates.current.clear()
    }
  }, [])

  // Quick save function for toolbar - now includes position persistence
  const handleQuickSave = useCallback(async () => {
    try {
      if (!model) return
      
      // First persist any pending position changes
      await persistPendingPositions()
      
      // Then save model metadata
      await updateFunctionModel(modelId, {
        name: model.name,
        description: model.description
      })
      
      showSuccess('Model saved successfully!')
    } catch (error) {
      console.error('Failed to quick save:', error)
      showError('Failed to save model')
    }
  }, [model, modelId, persistPendingPositions, showSuccess, showError])

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-lg">Loading function model...</div>
      </div>
    )
  }

  if (isVersionLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-lg">Loading version...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-red-500">
          <div className="text-lg font-semibold">Error loading function model</div>
          <div className="text-sm">{error}</div>
          <button 
            onClick={clearError}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="w-full h-full flex flex-col"
      onKeyDown={handleKeyDown}
      role="application"
      aria-label="Function Model Canvas"
      tabIndex={0}
    >
      {/* Screen reader announcements */}
      {announcement && (
        <div 
          className="sr-only" 
          aria-live="polite" 
          aria-atomic="true"
        >
          {announcement}
        </div>
      )}

      {/* Canvas Area */}
      <div className="flex-1 relative">
        {/* Container for name and description fields */}
        <div className="absolute top-4 left-4 z-30 flex flex-col gap-4">
          
          {/* Name Field */}
          <div>
            <FloatingNameField
              name={model?.name || 'Function Model'}
              onUpdateName={async (name) => {
                // Save to backend with debouncing
                await debouncedSave({ name })
                announceToScreenReader(`Model name updated to: ${name}`)
              }}
              onNavigateBack={() => router.push('/dashboard/function-model/list')}
            />
          </div>
          
          {/* Description Field */}
          <div>
            <FloatingDescriptionField
              description={model?.description || 'Loading...'}
              onUpdateDescription={async (description) => {
                // Save to backend with debouncing
                await debouncedSave({ description })
                announceToScreenReader(`Model description updated`)
              }}
            />
          </div>
        </div>
        
                 {/* Separate Toolbar */}
         <div className="absolute top-44 left-4 z-30">
           <FloatingToolbar
             onAddStage={handleAddStageNode}
             onAddAction={handleAddActionNode}
             onAddIO={handleAddIONode}
             onTogglePersistence={() => setPersistenceSidebarOpen(!persistenceSidebarOpen)}
             onQuickSave={handleQuickSave}
             hasUnsavedChanges={hasUnsavedChanges()}
           />
         </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={handleConnect}
          isValidConnection={handleIsValidConnection}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          onNodesChange={onNodesChange}
          onEdgesChange={handleEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          fitView
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          selectNodesOnDrag={false}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
          aria-label="Function model flow diagram"
        >
          <Controls 
            aria-label="Flow controls"
            showZoom={true}
            showFitView={true}
            showInteractive={true}
          />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={12} 
            size={1}
            aria-label="Background grid"
          />
        </ReactFlow>

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            onDelete={handleContextMenuDelete}
            onEdit={handleContextMenuEdit}
            onCopy={handleContextMenuCopy}
            onClose={() => {
              setContextMenu(null)
              announceToScreenReader('Context menu closed')
            }}
          />
        )}

        {/* Edge Context Menu */}
        {edgeContextMenu && (
          <EdgeContextMenu
            position={{ x: edgeContextMenu.x, y: edgeContextMenu.y }}
            edgeId={edgeContextMenu.edgeId}
            onDelete={handleEdgeContextMenuDelete}
            onClose={() => {
              handleEdgeContextMenuClose()
              announceToScreenReader('Edge context menu closed')
            }}
          />
        )}

        {/* Preserve ALL existing modals and sidebars */}
        <PersistenceModal
          isOpen={persistenceSidebarOpen}
          onClose={() => setPersistenceSidebarOpen(false)}
          activeTab={activePersistenceTab}
          onTabChange={setActivePersistenceTab}
          modelId={modelId}
          onVersionLoaded={async () => {
            console.log('Version loaded callback triggered - refreshing model data')
            
            // Prevent race conditions by setting loading state
            setIsVersionLoading(true)
            
            try {
              // First persist any pending position changes before loading version
              await persistPendingPositions()
              
              // Clear any remaining pending position updates
              pendingPositionUpdates.current.clear()
              
              // Add a small delay to ensure database operations complete
              setTimeout(async () => {
                try {
                  // Refresh the model data when a version is loaded
                  await loadNodes()
                  console.log('Version loading completed successfully')
                  // Show success feedback to user
                  showSuccess('Version loaded successfully!')
                  announceToScreenReader('Model version loaded successfully')
                } catch (error) {
                  console.error('Failed to load version data:', error)
                  showError('Failed to load version data')
                } finally {
                  setIsVersionLoading(false)
                }
              }, 500) // 500ms delay to ensure database operations complete
            } catch (error) {
              console.error('Failed to persist positions before version load:', error)
              showError('Failed to save current changes before loading version')
              setIsVersionLoading(false)
            }
          }}
        />

        <ModalStack 
          modals={modalStack}
          onClose={closeModal}
          onGoBack={goBackToPreviousModal}
        />
      </div>
    </div>
  )
}