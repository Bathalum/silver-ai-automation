'use client'

import React, { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { FunctionModelNode } from '@/lib/domain/entities/function-model-node-types'
import { useFunctionModelNodes } from '@/lib/application/hooks/use-function-model-nodes'
import { NodeCanvas } from './node-canvas'
import { NodeDetailsPanel } from './node-details-panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Layout, 
  Settings, 
  BarChart3, 
  Download, 
  Upload, 
  Save, 
  RefreshCw,
  Eye,
  EyeOff,
  Grid3X3,
  List,
  Search,
  Filter,
  Plus,
  Trash2,
  Play,
  Pause,
  Zap
} from 'lucide-react'

interface FunctionModelDashboardProps {
  modelId?: string
  readOnly?: boolean
}

export function FunctionModelDashboard({ 
  modelId: propModelId, 
  readOnly = false 
}: FunctionModelDashboardProps) {
  const params = useParams()
  const modelId = propModelId || (params.modelId as string)
  
  const [selectedNode, setSelectedNode] = useState<FunctionModelNode | null>(null)
  const [showDetailsPanel, setShowDetailsPanel] = useState(true)
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showAnalytics, setShowAnalytics] = useState(false)

  // Use the node-based hook
  const {
    nodes,
    edges,
    loading,
    error,
    createNode,
    updateNode,
    deleteNode,
    createConnection,
    deleteConnection,
    loadNodes
  } = useFunctionModelNodes(modelId)

  // Handle node selection
  const handleNodeSelect = useCallback((node: FunctionModelNode) => {
    setSelectedNode(node)
    setShowDetailsPanel(true)
  }, [])

  // Handle node update
  const handleNodeUpdate = useCallback(async (nodeId: string, updates: Partial<FunctionModelNode>) => {
    try {
      await updateNode(nodeId, updates)
    } catch (error) {
      console.error('Failed to update node:', error)
    }
  }, [updateNode])

  // Handle node deletion
  const handleNodeDelete = useCallback(async (nodeId: string) => {
    try {
      await deleteNode(nodeId)
      if (selectedNode?.nodeId === nodeId) {
        setSelectedNode(null)
        setShowDetailsPanel(false)
      }
    } catch (error) {
      console.error('Failed to delete node:', error)
    }
  }, [deleteNode, selectedNode])

  // Handle connection creation
  const handleConnectionCreate = useCallback(async (
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle: string,
    targetHandle: string
  ) => {
    try {
      await createConnection(sourceNodeId, targetNodeId, sourceHandle, targetHandle)
    } catch (error) {
      console.error('Failed to create connection:', error)
    }
  }, [createConnection])

  // Handle connection deletion
  const handleConnectionDelete = useCallback(async (connectionId: string) => {
    try {
      await deleteConnection(connectionId)
    } catch (error) {
      console.error('Failed to delete connection:', error)
    }
  }, [deleteConnection])

  // Handle node creation
  const handleCreateNode = useCallback(async (
    nodeType: FunctionModelNode['nodeType'],
    name: string,
    position: { x: number; y: number }
  ) => {
    try {
      await createNode(nodeType, name, position)
    } catch (error) {
      console.error('Failed to create node:', error)
    }
  }, [createNode])

  return (
    <div className="flex h-full">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">Function Model</h1>
            <Badge variant={loading ? "secondary" : "default"}>
              {loading ? "Loading..." : `${nodes.length} nodes`}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetailsPanel(!showDetailsPanel)}
            >
              {showDetailsPanel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'canvas' ? 'list' : 'canvas')}
            >
              {viewMode === 'canvas' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Canvas/List View */}
        <div className="flex-1 relative">
          {viewMode === 'canvas' ? (
            <NodeCanvas
              nodes={nodes}
              edges={edges}
              onNodeSelect={handleNodeSelect}
              onNodeUpdate={handleNodeUpdate}
              onNodeDelete={handleNodeDelete}
              onConnectionCreate={handleConnectionCreate}
              onConnectionDelete={handleConnectionDelete}
              onCreateNode={handleCreateNode}
              readOnly={readOnly}
            />
          ) : (
            <div className="p-4">
              <div className="grid gap-4">
                {nodes.map((node) => (
                  <Card key={node.nodeId} className="cursor-pointer hover:shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{node.name}</span>
                        <Badge variant="outline">{node.nodeType}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{node.description}</p>
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          Position: ({node.position.x}, {node.position.y})
                        </span>
                        <span className="text-xs text-gray-500">
                          Type: {node.nodeType}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Panel */}
      {showDetailsPanel && selectedNode && (
        <NodeDetailsPanel
          node={selectedNode}
          onUpdate={handleNodeUpdate}
          onDelete={handleNodeDelete}
          readOnly={readOnly}
        />
      )}
    </div>
  )
} 