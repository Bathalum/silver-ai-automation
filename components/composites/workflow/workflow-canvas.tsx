'use client'

import React from 'react'
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, Node, Edge, Connection, addEdge, useNodesState, useEdgesState, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Card } from '@/components/ui/card'

interface WorkflowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: (changes: any) => void
  onEdgesChange: (changes: any) => void
  onConnect: (connection: Connection) => void
  onNodeClick?: (event: React.MouseEvent, node: Node) => void
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void
  onPaneClick?: (event: React.MouseEvent) => void
  className?: string
}

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  className = ''
}: WorkflowCanvasProps) {
  const { fitView } = useReactFlow()

  const handleConnect = (params: Connection) => {
    onConnect(params)
  }

  const handleFitView = () => {
    fitView({ padding: 0.1 })
  }

  return (
    <Card className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        fitView
        attributionPosition="bottom-left"
        className="bg-gray-50"
      >
        <Background
          gap={20}
          size={1}
          color="#e5e7eb"
        />
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={true}
          onFitView={handleFitView}
        />
        <MiniMap
          nodeColor="#3b82f6"
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="border border-gray-200 rounded-lg shadow-sm"
        />
      </ReactFlow>
    </Card>
  )
}

// Wrapper component that provides ReactFlow context
export function WorkflowCanvasWrapper(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  )
}
