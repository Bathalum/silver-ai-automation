'use client'

import React, { useCallback, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  OnConnect,
  OnEdgesDelete,
  OnNodesDelete,
  OnNodeDragStop
} from 'reactflow'
import 'reactflow/dist/style.css'
import { FunctionModelNode } from '@/lib/domain/entities/function-model-node-types'
import { StageNode, ActionTableNode, IONode, FunctionModelContainerNode } from './flow-nodes'

// Define node types for React Flow
const nodeTypes = {
  stageNode: StageNode,
  actionTableNode: ActionTableNode,
  ioNode: IONode,
  functionModelContainerNode: FunctionModelContainerNode
}

interface NodeCanvasProps {
  nodes: FunctionModelNode[]
  edges: Edge[]
  onNodeSelect: (node: FunctionModelNode) => void
  onNodeUpdate: (nodeId: string, updates: Partial<FunctionModelNode>) => void
  onNodeDelete: (nodeId: string) => void
  onConnectionCreate: (sourceNodeId: string, targetNodeId: string, sourceHandle: string, targetHandle: string) => void
  onConnectionDelete: (connectionId: string) => void
  onCreateNode: (nodeType: FunctionModelNode['nodeType'], name: string, position: { x: number; y: number }) => void
  readOnly?: boolean
}

export function NodeCanvas({
  nodes,
  edges,
  onNodeSelect,
  onNodeUpdate,
  onNodeDelete,
  onConnectionCreate,
  onConnectionDelete,
  onCreateNode,
  readOnly = false
}: NodeCanvasProps) {
  // Convert FunctionModelNodes to React Flow Nodes
  const reactFlowNodes: Node[] = useMemo(() => {
    return nodes.map((node) => ({
      id: node.nodeId,
      type: node.nodeType,
      position: node.position,
      data: {
        ...node,
        label: node.name,
        onSelect: () => onNodeSelect(node),
        onUpdate: (updates: Partial<FunctionModelNode>) => onNodeUpdate(node.nodeId, updates),
        onDelete: () => onNodeDelete(node.nodeId),
        readOnly
      },
      draggable: node.reactFlowData.draggable,
      selectable: node.reactFlowData.selectable,
      deletable: node.reactFlowData.deletable
    }))
  }, [nodes, onNodeSelect, onNodeUpdate, onNodeDelete, readOnly])

  // React Flow state management
  const [reactFlowNodesState, setReactFlowNodesState, onNodesChange] = useNodesState(reactFlowNodes)
  const [reactFlowEdgesState, setReactFlowEdgesState, onEdgesChange] = useEdgesState(edges)

  // Handle node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes)
      
      // Update node positions when dragged
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          const node = nodes.find(n => n.nodeId === change.id)
          if (node) {
            onNodeUpdate(change.id, { position: change.position })
          }
        }
      })
    },
    [onNodesChange, nodes, onNodeUpdate]
  )

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes)
      
      // Handle edge deletions
      changes.forEach((change) => {
        if (change.type === 'remove') {
          onConnectionDelete(change.id)
        }
      })
    },
    [onEdgesChange, onConnectionDelete]
  )

  // Handle new connections
  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && connection.sourceHandle && connection.targetHandle) {
        onConnectionCreate(
          connection.source,
          connection.target,
          connection.sourceHandle,
          connection.targetHandle
        )
      }
    },
    [onConnectionCreate]
  )

  // Handle node deletions
  const handleNodesDelete: OnNodesDelete = useCallback(
    (deletedNodes) => {
      deletedNodes.forEach((node) => {
        onNodeDelete(node.id)
      })
    },
    [onNodeDelete]
  )

  // Handle edge deletions
  const handleEdgesDelete: OnEdgesDelete = useCallback(
    (deletedEdges) => {
      deletedEdges.forEach((edge) => {
        onConnectionDelete(edge.id)
      })
    },
    [onConnectionDelete]
  )

  // Handle node drag stop
  const handleNodeDragStop: OnNodeDragStop = useCallback(
    (event, node) => {
      onNodeUpdate(node.id, { position: node.position })
    },
    [onNodeUpdate]
  )

  // Add new node functionality
  const handleAddNode = useCallback(
    (nodeType: FunctionModelNode['nodeType'], position: { x: number; y: number }) => {
      const name = `New ${nodeType}`
      onCreateNode(nodeType, name, position)
    },
    [onCreateNode]
  )

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={reactFlowNodesState}
        edges={reactFlowEdgesState}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        
        {/* Add Node Buttons */}
        {!readOnly && (
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <button
              onClick={() => handleAddNode('stageNode', { x: 100, y: 100 })}
              className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              title="Add Stage Node"
            >
              Stage
            </button>
            <button
              onClick={() => handleAddNode('actionTableNode', { x: 300, y: 100 })}
              className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              title="Add Action Node"
            >
              Action
            </button>
            <button
              onClick={() => handleAddNode('ioNode', { x: 500, y: 100 })}
              className="p-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
              title="Add I/O Node"
            >
              I/O
            </button>
            <button
              onClick={() => handleAddNode('functionModelContainerNode', { x: 700, y: 100 })}
              className="p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
              title="Add Container Node"
            >
              Container
            </button>
          </div>
        )}
      </ReactFlow>
    </div>
  )
} 