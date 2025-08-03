'use client'

import React, { useState, useCallback, useEffect } from 'react'
import ReactFlow, { 
  Node, 
  Edge, 
  Connection, 
  NodeChange, 
  EdgeChange,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useFunctionModelNodes } from '@/lib/application/hooks/use-function-model-nodes'
import { validateConnection } from '@/lib/domain/entities/function-model-connection-rules'
import { FunctionModelNode } from '@/lib/domain/entities/function-model-node-types'

// Import existing node components
import { StageNode, ActionTableNode, IONode } from './flow-nodes'

// Import existing UI components
import { FloatingToolbar } from './floating-toolbar'
import { PersistenceSidebar } from './persistence-sidebar'
import { ModalStack } from './modal-stack'

const nodeTypes = {
  stageNode: StageNode,
  actionTableNode: ActionTableNode,
  ioNode: IONode
}

export function FunctionModelCanvas({ modelId }: { modelId: string }) {
  const { 
    nodes, 
    edges, 
    loading, 
    error, 
    modalStack,
    selectedNodes,
    hoveredNode,
    isEditingName,
    isEditingDescription,
    createNode, 
    updateNode, 
    createConnection,
    deleteConnection,
    deleteNode,
    openModal,
    closeModal,
    closeAllModals,
    goBackToPreviousModal,
    selectNode,
    selectNodes,
    clearSelection,
    setHoveredNode,
    startEditingName,
    stopEditingName,
    startEditingDescription,
    stopEditingDescription,
    isValidConnection,
    clearError
  } = useFunctionModelNodes(modelId)
  
  // Preserve ALL existing state management
  const [reactFlowNodes, setReactFlowNodes] = useState<Node[]>([])
  const [reactFlowEdges, setReactFlowEdges] = useState<Edge[]>([])
  const [persistenceSidebarOpen, setPersistenceSidebarOpen] = useState(false)
  const [activePersistenceTab, setActivePersistenceTab] = useState<'save' | 'links'>('save')

  // Convert unified nodes to React Flow format
  useEffect(() => {
    const flowNodes = nodes.map(node => convertToReactFlowNode(node))
    setReactFlowNodes(flowNodes)
  }, [nodes])

  useEffect(() => {
    setReactFlowEdges(edges)
  }, [edges])

  // Preserve ALL existing connection validation
  const handleIsValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
      return false
    }
    
    const sourceNode = nodes.find(n => n.nodeId === connection.source)
    const targetNode = nodes.find(n => n.nodeId === connection.target)
    
    if (!sourceNode || !targetNode) return false
    
    return validateConnection(sourceNode, targetNode, connection.sourceHandle, connection.targetHandle)
  }, [nodes])

  // Preserve ALL existing node creation handlers
  const handleAddStageNode = useCallback(() => {
    const position = { x: Math.random() * 400, y: Math.random() * 400 }
    createNode('stageNode', 'New Stage', position)
  }, [createNode])

  const handleAddActionNode = useCallback(() => {
    const position = { x: Math.random() * 400, y: Math.random() * 400 }
    createNode('actionTableNode', 'New Action', position)
  }, [createNode])

  const handleAddIONode = useCallback(() => {
    const position = { x: Math.random() * 400, y: Math.random() * 400 }
    createNode('ioNode', 'New I/O', position)
  }, [createNode])

  // Preserve ALL existing connection handling
  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return
    
    createConnection(
      connection.source,
      connection.target,
      connection.sourceHandle,
      connection.targetHandle
    )
  }, [createConnection])

  // Preserve ALL existing node change handling
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setReactFlowNodes(prev => applyNodeChanges(changes, prev))
    
    // Update node positions in the backend
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        const node = nodes.find(n => n.nodeId === change.id)
        if (node) {
          updateNode(change.id, { position: change.position })
        }
      }
    })
  }, [nodes, updateNode])

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    setReactFlowEdges(prev => applyEdgeChanges(changes, prev))
    
    // Handle edge deletion
    changes.forEach(change => {
      if (change.type === 'remove') {
        deleteConnection(change.id)
      }
    })
  }, [deleteConnection])

  // Preserve ALL existing node click handling
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const functionModelNode = nodes.find(n => n.nodeId === node.id)
    if (!functionModelNode) return
    
    // Handle node selection
    selectNode(functionModelNode)
    
    // Open appropriate modal based on node type
    switch (functionModelNode.nodeType) {
      case 'stageNode':
        openModal('stage', functionModelNode.functionModelData.stage || functionModelNode)
        break
      case 'actionTableNode':
        openModal('action', functionModelNode.functionModelData.action || functionModelNode)
        break
      case 'ioNode':
        const ioData = functionModelNode.functionModelData.io
        if (ioData?.mode === 'input') {
          openModal('input', ioData)
        } else {
          openModal('output', ioData)
        }
        break
      default:
        openModal('function', functionModelNode)
    }
  }, [nodes, selectNode, openModal])

  // Preserve ALL existing edge context menu handling
  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault()
    
    // Show edge context menu (implementation depends on your UI library)
    // This could open a context menu with options like "Delete Edge", "Edit Edge", etc.
    console.log('Edge context menu:', edge)
  }, [])

  // Preserve ALL existing node double-click handling
  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    const functionModelNode = nodes.find(n => n.nodeId === node.id)
    if (!functionModelNode) return
    
    // Start inline editing
    startEditingName()
  }, [nodes, startEditingName])

  // Preserve ALL existing node mouse enter/leave handling
  const handleNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
    const functionModelNode = nodes.find(n => n.nodeId === node.id)
    if (functionModelNode) {
      setHoveredNode(functionModelNode)
    }
  }, [nodes, setHoveredNode])

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNode(null)
  }, [setHoveredNode])

  // Preserve ALL existing keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Delete selected nodes
      selectedNodes.forEach(node => {
        deleteNode(node.nodeId)
      })
      clearSelection()
    }
    
    if (event.key === 'Escape') {
      clearSelection()
      closeAllModals()
    }
  }, [selectedNodes, deleteNode, clearSelection, closeAllModals])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-lg">Loading function model...</div>
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
    <div className="w-full h-full relative">
      {/* Preserve ALL existing UI components */}
      <FloatingToolbar
        onAddStage={handleAddStageNode}
        onAddAction={handleAddActionNode}
        onAddIO={handleAddIONode}
        onTogglePersistence={() => setPersistenceSidebarOpen(!persistenceSidebarOpen)}
      />

      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        isValidConnection={handleIsValidConnection}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onEdgeContextMenu={handleEdgeContextMenu}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>

      {/* Preserve ALL existing modals and sidebars */}
      <PersistenceSidebar
        isOpen={persistenceSidebarOpen}
        onClose={() => setPersistenceSidebarOpen(false)}
        activeTab={activePersistenceTab}
        onTabChange={setActivePersistenceTab}
        modelId={modelId}
      />

      <ModalStack 
        modals={modalStack}
        onClose={closeModal}
        onGoBack={goBackToPreviousModal}
      />
    </div>
  )
}

// Preserve ALL existing conversion logic
function convertToReactFlowNode(unifiedNode: FunctionModelNode): Node {
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
    ...unifiedNode.reactFlowData
  }
} 