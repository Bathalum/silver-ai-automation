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

  // Hooks
  const {
    nodes,
    links,
    loading,
    error,
    operationStates,
    updateNode,
    deleteNode,
    executeNode,
    refresh
  } = useFunctionModelNodes({ 
    modelId, 
    autoRefresh, 
    refreshInterval: 10000 
  })

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

  // Handle node execution
  const handleNodeExecute = useCallback(async (nodeId: string) => {
    try {
      await executeNode(nodeId)
    } catch (error) {
      console.error('Failed to execute node:', error)
    }
  }, [executeNode])

  // Calculate dashboard statistics
  const getDashboardStats = useCallback(() => {
    const stats = {
      totalNodes: nodes.length,
      nodesByType: {} as Record<string, number>,
      executionStats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0
      },
      linkStats: {
        totalLinks: links.length,
        crossFeatureLinks: links.filter(link => link.targetFeature !== 'function-model').length,
        linksByType: {} as Record<string, number>
      }
    }

    // Count nodes by type
    nodes.forEach(node => {
      stats.nodesByType[node.nodeType] = (stats.nodesByType[node.nodeType] || 0) + 1
    })

    // Count links by type
    links.forEach(link => {
      stats.linkStats.linksByType[link.linkType] = (stats.linkStats.linksByType[link.linkType] || 0) + 1
    })

    return stats
  }, [nodes, links])

  const stats = getDashboardStats()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Canvas Area */}
      <div className={`flex-1 flex flex-col ${showDetailsPanel ? 'mr-80' : ''}`}>
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Function Model</h1>
              {modelId && (
                <Badge variant="outline" className="text-sm">
                  Model ID: {modelId}
                </Badge>
              )}
              {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
              {error && <Badge variant="destructive">{error}</Badge>}
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  size="sm"
                  variant={viewMode === 'canvas' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('canvas')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Auto Refresh Toggle */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>

              {/* Analytics Toggle */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>

              {/* Refresh Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>

              {!readOnly && (
                <>
                  {/* Save Button */}
                  <Button size="sm" variant="outline">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>

                  {/* Export Button */}
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{stats.totalNodes}</Badge>
              <span className="text-sm text-gray-600">Nodes</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{stats.linkStats.totalLinks}</Badge>
              <span className="text-sm text-gray-600">Links</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{stats.linkStats.crossFeatureLinks}</Badge>
              <span className="text-sm text-gray-600">Cross-Feature</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{stats.executionStats.totalExecutions}</Badge>
              <span className="text-sm text-gray-600">Executions</span>
            </div>
          </div>
        </div>

        {/* Analytics Panel */}
        {showAnalytics && (
          <div className="bg-white border-b px-6 py-4">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="nodes">Nodes</TabsTrigger>
                <TabsTrigger value="links">Links</TabsTrigger>
                <TabsTrigger value="execution">Execution</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Grid3X3 className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold">{stats.totalNodes}</p>
                          <p className="text-sm text-gray-600">Total Nodes</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold">{stats.executionStats.successfulExecutions}</p>
                          <p className="text-sm text-gray-600">Successful</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="text-2xl font-bold">{stats.linkStats.totalLinks}</p>
                          <p className="text-sm text-gray-600">Total Links</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Play className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="text-2xl font-bold">{stats.executionStats.averageExecutionTime}s</p>
                          <p className="text-sm text-gray-600">Avg Time</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="nodes" className="mt-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Node Distribution</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(stats.nodesByType).map(([type, count]) => (
                      <Card key={type}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">{type}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="links" className="mt-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Link Analysis</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(stats.linkStats.linksByType).map(([type, count]) => (
                      <Card key={type}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">{type}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="execution" className="mt-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Execution Metrics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {stats.executionStats.successfulExecutions}
                          </p>
                          <p className="text-sm text-gray-600">Successful</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">
                            {stats.executionStats.failedExecutions}
                          </p>
                          <p className="text-sm text-gray-600">Failed</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {stats.executionStats.averageExecutionTime}s
                          </p>
                          <p className="text-sm text-gray-600">Avg Time</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Canvas/List Area */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'canvas' ? (
            <NodeCanvas
              modelId={modelId}
              onNodeSelect={handleNodeSelect}
              onNodeUpdate={handleNodeUpdate}
              onNodeDelete={handleNodeDelete}
              readOnly={readOnly}
            />
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Node List</h2>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                    <Button size="sm" variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4">
                  {nodes.map((node) => (
                    <Card 
                      key={node.nodeId}
                      className={`cursor-pointer transition-all ${
                        selectedNode?.nodeId === node.nodeId ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleNodeSelect(node)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <div>
                              <h3 className="font-medium">{node.name}</h3>
                              <p className="text-sm text-gray-600">{node.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{node.nodeType}</Badge>
                            {!readOnly && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost">
                                  <Play className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Settings className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Panel */}
      {showDetailsPanel && (
        <div className="w-80 border-l bg-white">
          <NodeDetailsPanel
            node={selectedNode}
            onUpdate={handleNodeUpdate}
            onExecute={handleNodeExecute}
            onClose={() => setShowDetailsPanel(false)}
            readOnly={readOnly}
          />
        </div>
      )}
    </div>
  )
} 