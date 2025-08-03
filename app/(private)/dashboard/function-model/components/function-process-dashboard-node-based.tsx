"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ReactFlowProvider, ReactFlow, Controls, Background, useNodesState, useEdgesState } from "reactflow"
import "reactflow/dist/style.css"
import { Layers, Zap, Hammer, ArrowLeftRight, Settings, Save, Link, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"
import { StageNodeModal } from "@/components/composites/stage-node-modal"
import { ActionModal } from "@/components/composites/action-modal"
import { FunctionModelModal } from "@/components/composites/function-model-modal"
import { StageNode, IONode, ActionTableNode, FunctionModelContainerNode } from "./flow-nodes"
// SaveLoadPanel removed - using node-based persistence instead
import { CrossFeatureLinkingModal } from "@/components/composites/cross-feature-linking-modal"
import type { FunctionModelNode } from "@/lib/domain/entities/function-model-node-types"
import type { BackgroundVariant } from "reactflow"
import { addEdge, type Connection, applyNodeChanges, applyEdgeChanges, type NodeChange, type EdgeChange, type Edge, type Node } from "reactflow"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import type { NodeRelationship } from "@/lib/domain/entities/unified-node-types"
import { IONodeModal } from "@/components/composites/io-node-modal"
import { useFunctionModelNodes } from "@/lib/application/hooks/use-function-model-nodes"

interface Flow {
  name: string
  nodes: Node[]
  edges: Edge[]
  viewport: { x: number; y: number; zoom: number }
}

// Helper function to generate UUID
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper functions to convert between data formats
const convertToReactFlowNode = (nodeData: FunctionModelNode): Node => {
  return {
    id: nodeData.nodeId,
    type: nodeData.nodeType,
    position: nodeData.position,
    data: {
      ...nodeData,
      label: nodeData.name,
      type: nodeData.nodeType,
      description: nodeData.description
    },
    draggable: nodeData.reactFlowData.draggable,
    selectable: nodeData.reactFlowData.selectable,
    deletable: nodeData.reactFlowData.deletable
  };
};

const convertToReactFlowEdge = (edgeData: NodeRelationship): Edge => {
  return {
    id: edgeData.id,
    source: edgeData.sourceNodeId,
    target: edgeData.targetNodeId,
    sourceHandle: edgeData.sourceHandle,
    targetHandle: edgeData.targetHandle,
    type: edgeData.type
  };
};

interface FunctionProcessDashboardNodeBasedProps {
  modelId: string
  initialModelName?: string
  initialModelDescription?: string
}

export function FunctionProcessDashboardNodeBased({
  modelId,
  initialModelName = "Function / Process Name",
  initialModelDescription = "1 paragraph per goal that you want to achieve by the end of the process"
}: FunctionProcessDashboardNodeBasedProps) {
  const router = useRouter()
  
  // Use the node-based hook
  const {
    nodes: functionModelNodes,
    edges: functionModelEdges,
    loading,
    error,
    createNode,
    updateNode,
    createConnection,
    deleteConnection,
    deleteNode,
    loadNodes,
    clearError
  } = useFunctionModelNodes(modelId)

  // State management
  const [modelName, setModelName] = useState(initialModelName)
  const [modelDescription, setModelDescription] = useState(initialModelDescription)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState<FunctionModelNode[]>([])
  const [hoveredNode, setHoveredNode] = useState<FunctionModelNode | null>(null)
  const [modalStack, setModalStack] = useState<Array<{
    type: "function" | "stage" | "action" | "input" | "output"
    data: FunctionModelNode
    context?: { previousModal?: string; stageId?: string }
  }>>([])

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Convert function model nodes to React Flow nodes
  useEffect(() => {
    const reactFlowNodes = functionModelNodes.map(convertToReactFlowNode)
    setNodes(reactFlowNodes)
  }, [functionModelNodes, setNodes])

  // Convert function model edges to React Flow edges
  useEffect(() => {
    const reactFlowEdges = functionModelEdges.map(convertToReactFlowEdge)
    setEdges(reactFlowEdges)
  }, [functionModelEdges, setEdges])

  // Load nodes on mount
  useEffect(() => {
    loadNodes()
  }, [loadNodes])

  // Node creation handlers
  const handleCreateStageNode = useCallback(async (position: { x: number; y: number }) => {
    try {
      await createNode('stageNode', 'New Stage', position)
    } catch (err) {
      console.error('Failed to create stage node:', err)
    }
  }, [createNode])

  const handleCreateActionNode = useCallback(async (position: { x: number; y: number }) => {
    try {
      await createNode('actionTableNode', 'New Action', position)
    } catch (err) {
      console.error('Failed to create action node:', err)
    }
  }, [createNode])

  const handleCreateIONode = useCallback(async (position: { x: number; y: number }) => {
    try {
      await createNode('ioNode', 'New IO', position)
    } catch (err) {
      console.error('Failed to create IO node:', err)
    }
  }, [createNode])

  // Connection handlers
  const onConnect = useCallback(async (connection: Connection) => {
    if (connection.source && connection.target && connection.sourceHandle && connection.targetHandle) {
      try {
        await createConnection(
          connection.source,
          connection.target,
          connection.sourceHandle,
          connection.targetHandle
        )
      } catch (err) {
        console.error('Failed to create connection:', err)
      }
    }
  }, [createConnection])

  // Node selection handlers
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const functionModelNode = functionModelNodes.find(n => n.nodeId === node.id)
    if (functionModelNode) {
      setSelectedNodes([functionModelNode])
    }
  }, [functionModelNodes])

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    const functionModelNode = functionModelNodes.find(n => n.nodeId === node.id)
    if (functionModelNode) {
      // Open appropriate modal based on node type
      setModalStack(prev => [...prev, {
        type: functionModelNode.nodeType === 'stageNode' ? 'stage' : 
              functionModelNode.nodeType === 'actionTableNode' ? 'action' :
              functionModelNode.nodeType === 'ioNode' ? 'input' : 'function',
        data: functionModelNode
      }])
    }
  }, [functionModelNodes])

  // Edge deletion handlers
  const onEdgeClick = useCallback(async (event: React.MouseEvent, edge: Edge) => {
    try {
      await deleteConnection(edge.id)
    } catch (err) {
      console.error('Failed to delete connection:', err)
    }
  }, [deleteConnection])

  // Node deletion handlers
  const onNodesDelete = useCallback(async (deleted: Node[]) => {
    for (const node of deleted) {
      try {
        await deleteNode(node.id)
      } catch (err) {
        console.error('Failed to delete node:', err)
      }
    }
  }, [deleteNode])

  // Modal handlers
  const closeModal = useCallback(() => {
    setModalStack(prev => prev.slice(0, -1))
  }, [])

  const openModal = useCallback((type: "function" | "stage" | "action" | "input" | "output", data: FunctionModelNode) => {
    setModalStack(prev => [...prev, { type, data }])
  }, [])

  // Name and description editing handlers
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModelName(e.target.value)
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setModelDescription(e.target.value)
  }

  const finishEditing = () => setIsEditingName(false)
  const finishDescriptionEditing = () => setIsEditingDescription(false)

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      finishEditing()
    }
  }

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      finishDescriptionEditing()
    }
  }

  const handleBackToList = () => {
    router.push('/dashboard/function-model/list')
  }

  // Current modal
  const currentModal = modalStack[modalStack.length - 1]

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to List</span>
            </Button>
            
            <div className="flex-1">
              {isEditingName ? (
                <input
                  type="text"
                  value={modelName}
                  onChange={handleNameChange}
                  onBlur={finishEditing}
                  onKeyDown={handleNameKeyDown}
                  className="text-2xl font-bold bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                  autoFocus
                />
              ) : (
                <h1
                  className="text-2xl font-bold cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
                  onClick={() => setIsEditingName(true)}
                >
                  {modelName}
                </h1>
              )}
              
              {isEditingDescription ? (
                <textarea
                  value={modelDescription}
                  onChange={handleDescriptionChange}
                  onBlur={finishDescriptionEditing}
                  onKeyDown={handleDescriptionKeyDown}
                  className="text-gray-600 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 resize-none"
                  rows={2}
                  autoFocus
                />
              ) : (
                <p
                  className="text-gray-600 cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
                  onClick={() => setIsEditingDescription(true)}
                >
                  {modelDescription}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save Model</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Link className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cross-Feature Linking</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Add Nodes</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleCreateStageNode({ x: 100, y: 100 })}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Stage Node
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleCreateActionNode({ x: 100, y: 200 })}
                >
                  <Hammer className="h-4 w-4 mr-2" />
                  Action Node
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleCreateIONode({ x: 100, y: 300 })}
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  IO Node
                </Button>
              </div>
            </div>

            {selectedNodes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Selected Node</h3>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm font-medium">{selectedNodes[0].name}</p>
                  <p className="text-xs text-gray-600">{selectedNodes[0].description}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeClick={onEdgeClick}
            onNodesDelete={onNodesDelete}
            nodeTypes={{
              stageNode: StageNode,
              actionTableNode: ActionTableNode,
              ioNode: IONode,
              functionModelContainerNode: FunctionModelContainerNode
            }}
            fitView
          >
            <Controls />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* Modals */}
      {currentModal && (
        <>
          {currentModal.type === 'stage' && (
            <StageNodeModal
              stage={currentModal.data.functionModelData.stage}
              onClose={closeModal}
              onSave={(stageData) => {
                // Update the node with new stage data
                updateNode(currentModal.data.nodeId, {
                  functionModelData: { ...currentModal.data.functionModelData, stage: stageData }
                })
                closeModal()
              }}
            />
          )}
          
          {currentModal.type === 'action' && (
            <ActionModal
              action={currentModal.data.functionModelData.action}
              onClose={closeModal}
              onSave={(actionData) => {
                // Update the node with new action data
                updateNode(currentModal.data.nodeId, {
                  functionModelData: { ...currentModal.data.functionModelData, action: actionData }
                })
                closeModal()
              }}
            />
          )}
          
          {currentModal.type === 'input' && (
            <IONodeModal
              io={currentModal.data.functionModelData.io}
              onClose={closeModal}
              onSave={(ioData) => {
                // Update the node with new IO data
                updateNode(currentModal.data.nodeId, {
                  functionModelData: { ...currentModal.data.functionModelData, io: ioData }
                })
                closeModal()
              }}
            />
          )}
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
          <button onClick={clearError} className="ml-2 text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg">
            <p>Loading...</p>
          </div>
        </div>
      )}
    </div>
  )
} 