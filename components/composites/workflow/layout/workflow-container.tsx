'use client'

import React, { useState } from 'react'
import { WorkflowToolbar } from '../workflow-toolbar'
import { WorkflowSidebar } from '../workflow-sidebar'
import { WorkflowCanvasWrapper } from '../workflow-canvas'
import { WorkflowHeader } from './workflow-header'
import { WorkflowFooter } from './workflow-footer'
import { Node, Edge } from '@xyflow/react'

interface WorkflowContainerProps {
  modelName: string
  version: string
  status: 'draft' | 'published' | 'archived' | 'running' | 'completed' | 'error'
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onSave?: () => void
  onPublish?: () => void
  onArchive?: () => void
  onSettings?: () => void
  onShare?: () => void
  onHistory?: () => void
  onPreview?: () => void
  onRun?: () => void
  className?: string
}

export function WorkflowContainer({
  modelName,
  version,
  status,
  initialNodes = [],
  initialEdges = [],
  onSave,
  onPublish,
  onArchive,
  onSettings,
  onShare,
  onHistory,
  onPreview,
  onRun,
  className = ''
}: WorkflowContainerProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>()
  const [nodes, setNodes] = useState<Node[]>(initialNodes)
  const [edges, setEdges] = useState<Edge[]>(initialEdges)
  const [isDirty, setIsDirty] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const handleNodesChange = (changes: any) => {
    setNodes((nds) => {
      const updatedNodes = nds.map((node) => {
        const change = changes.find((c: any) => c.id === node.id)
        if (change) {
          return { ...node, ...change }
        }
        return node
      })
      return updatedNodes
    })
    setIsDirty(true)
  }

  const handleEdgesChange = (changes: any) => {
    setEdges((eds) => {
      const updatedEdges = eds.map((edge) => {
        const change = changes.find((c: any) => c.id === edge.id)
        if (change) {
          return { ...edge, ...change }
        }
        return edge
      })
      return updatedEdges
    })
    setIsDirty(true)
  }

  const handleConnect = (connection: any) => {
    const newEdge: Edge = {
      id: `edge-${edges.length + 1}`,
      source: connection.source!,
      target: connection.target!,
      type: 'default'
    }
    setEdges((eds) => [...eds, newEdge])
    setIsDirty(true)
  }

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }

  const handlePaneClick = () => {
    setSelectedNodeId(undefined)
  }

  const handleSave = () => {
    onSave?.()
    setIsDirty(false)
  }

  const handleRun = () => {
    setIsRunning(true)
    onRun?.()
    // Simulate running state - in real implementation this would be controlled by actual execution
    setTimeout(() => setIsRunning(false), 3000)
  }

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  const handleAddNode = (nodeType: string, position: { x: number; y: number }) => {
    const nodeTypeMap: Record<string, string> = {
      'io': 'ioNode',
      'stage': 'stageNode',
      'tether': 'tetherNode',
      'kb': 'kbNode',
      'function-model-container': 'functionModelContainerNode',
    }
    
    const actualNodeType = nodeTypeMap[nodeType] || nodeType
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: actualNodeType,
      position,
      data: {
        label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace('-', ' '),
        type: actualNodeType
      }
    }
    
    setNodes((nds) => [...nds, newNode])
    setIsDirty(true)
  }

  return (
    <div className={`flex flex-col h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <WorkflowHeader 
        modelName={modelName}
        version={version}
        status={status}
      />

      {/* Toolbar */}
      <WorkflowToolbar
        modelName={modelName}
        version={version}
        status={status}
        onSave={handleSave}
        onPublish={onPublish}
        onArchive={onArchive}
        onSettings={onSettings}
        onShare={onShare}
        onHistory={onHistory}
        onPreview={onPreview}
        onRun={handleRun}
        isDirty={isDirty}
        isRunning={isRunning}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <WorkflowSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          selectedNodeId={selectedNodeId}
          onNodeSelect={setSelectedNodeId}
          onAddNode={handleAddNode}
        />

        {/* Canvas Area */}
        <div className="flex-1 relative">
          <WorkflowCanvasWrapper
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Footer */}
      <WorkflowFooter
        selectedNodeId={selectedNodeId}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        isDirty={isDirty}
        status={status}
      />
    </div>
  )
}
