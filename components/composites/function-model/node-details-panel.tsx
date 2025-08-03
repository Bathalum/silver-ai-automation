'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { FunctionModelNode, NodeLink } from '@/lib/domain/entities/function-model-node-types'
import { useCrossFeatureLinking } from '@/lib/application/hooks/use-cross-feature-linking'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Edit3, 
  Save, 
  X, 
  Play, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Link, 
  ExternalLink,
  Settings,
  BarChart3,
  Code,
  FileText,
  Zap
} from 'lucide-react'

interface NodeDetailsPanelProps {
  node: FunctionModelNode | null
  onUpdate?: (nodeId: string, updates: Partial<FunctionModelNode>) => void
  onExecute?: (nodeId: string) => void
  onClose?: () => void
  readOnly?: boolean
}

export function NodeDetailsPanel({ 
  node, 
  onUpdate, 
  onExecute, 
  onClose, 
  readOnly = false 
}: NodeDetailsPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<FunctionModelNode>>({})
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [executionResult, setExecutionResult] = useState<any>(null)

  // Cross-feature linking hook
  const {
    links,
    loading: linksLoading,
    createCrossFeatureLink,
    deleteLink,
    getConnectedEntities,
    getLinkStatistics
  } = useCrossFeatureLinking({
    sourceFeature: 'function-model',
    sourceEntityId: node?.modelId || '',
    sourceNodeId: node?.nodeId
  })

  // Initialize edit data when node changes
  useEffect(() => {
    if (node) {
      setEditData({
        name: node.name,
        description: node.description,
        positionX: node.positionX,
        positionY: node.positionY,
        processBehavior: node.processBehavior,
        businessLogic: node.businessLogic
      })
    }
  }, [node])

  // Handle save changes
  const handleSave = useCallback(async () => {
    if (!node || !onUpdate) return

    try {
      await onUpdate(node.nodeId, editData)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update node:', error)
    }
  }, [node, editData, onUpdate])

  // Handle cancel edit
  const handleCancel = useCallback(() => {
    setIsEditing(false)
    if (node) {
      setEditData({
        name: node.name,
        description: node.description,
        positionX: node.positionX,
        positionY: node.positionY,
        processBehavior: node.processBehavior,
        businessLogic: node.businessLogic
      })
    }
  }, [node])

  // Handle node execution
  const handleExecute = useCallback(async () => {
    if (!node || !onExecute) return

    setExecutionStatus('running')
    try {
      await onExecute(node.nodeId)
      setExecutionStatus('success')
      setTimeout(() => setExecutionStatus('idle'), 3000)
    } catch (error) {
      setExecutionStatus('error')
      setTimeout(() => setExecutionStatus('idle'), 5000)
    }
  }, [node, onExecute])

  // Get execution status icon
  const getExecutionStatusIcon = useCallback(() => {
    switch (executionStatus) {
      case 'running':
        return <Clock className="h-4 w-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Play className="h-4 w-4 text-gray-500" />
    }
  }, [executionStatus])

  // Get node type color
  const getNodeTypeColor = useCallback((nodeType: string) => {
    const colors = {
      stageNode: 'bg-green-100 text-green-800',
      actionTableNode: 'bg-blue-100 text-blue-800',
      ioNode: 'bg-yellow-100 text-yellow-800',
      functionModelContainer: 'bg-purple-100 text-purple-800'
    }
    return colors[nodeType] || 'bg-gray-100 text-gray-800'
  }, [])

  if (!node) {
    return (
      <Card className="w-80 h-full">
        <CardHeader>
          <CardTitle className="text-lg">Node Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a node to view details</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-80 h-full overflow-y-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Node Details</CardTitle>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <>
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            <Button size="sm" variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            {isEditing ? (
              <Input
                value={editData.name || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            ) : (
              <p className="text-sm text-gray-900 mt-1">{node.name}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            {isEditing ? (
              <Textarea
                value={editData.description || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
                rows={3}
              />
            ) : (
              <p className="text-sm text-gray-600 mt-1">{node.description || 'No description'}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Badge className={getNodeTypeColor(node.nodeType)}>
              {node.nodeType}
            </Badge>
            {node.processBehavior?.executionType && (
              <Badge variant="outline">
                {node.processBehavior.executionType}
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Execution Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Execution</h3>
            {getExecutionStatusIcon()}
          </div>
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleExecute}
              disabled={executionStatus === 'running'}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Execute
            </Button>
            <Button size="sm" variant="outline">
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {executionStatus === 'success' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">Execution completed successfully</p>
            </div>
          )}

          {executionStatus === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">Execution failed</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="space-y-4 mt-4">
            {/* Position */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Position X</label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.positionX || 0}
                    onChange={(e) => setEditData(prev => ({ ...prev, positionX: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm text-gray-900 mt-1">{node.positionX}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Position Y</label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.positionY || 0}
                    onChange={(e) => setEditData(prev => ({ ...prev, positionY: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm text-gray-900 mt-1">{node.positionY}</p>
                )}
              </div>
            </div>

            {/* Process Behavior */}
            <div>
              <label className="text-sm font-medium text-gray-700">Execution Type</label>
              {isEditing ? (
                <Select
                  value={editData.processBehavior?.executionType || 'sequential'}
                  onValueChange={(value) => setEditData(prev => ({
                    ...prev,
                    processBehavior: { ...prev.processBehavior, executionType: value }
                  }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequential</SelectItem>
                    <SelectItem value="parallel">Parallel</SelectItem>
                    <SelectItem value="conditional">Conditional</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-gray-900 mt-1">{node.processBehavior?.executionType || 'sequential'}</p>
              )}
            </div>

            {/* Timeout */}
            <div>
              <label className="text-sm font-medium text-gray-700">Timeout (seconds)</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editData.processBehavior?.timeout || 30}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    processBehavior: { ...prev.processBehavior, timeout: parseInt(e.target.value) || 30 }
                  }))}
                  className="mt-1"
                />
              ) : (
                <p className="text-sm text-gray-900 mt-1">{node.processBehavior?.timeout || 30}s</p>
              )}
            </div>

            {/* Dependencies */}
            <div>
              <label className="text-sm font-medium text-gray-700">Dependencies</label>
              <p className="text-sm text-gray-600 mt-1">
                {node.processBehavior?.dependencies?.length || 0} dependencies
              </p>
            </div>
          </TabsContent>

          <TabsContent value="links" className="space-y-4 mt-4">
            {linksLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading links...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Cross-Feature Links</h4>
                  <Badge variant="secondary">{links.length}</Badge>
                </div>

                {links.length === 0 ? (
                  <div className="text-center py-4">
                    <Link className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">No cross-feature links</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {links.map((link) => (
                      <div key={link.linkId} className="p-3 border rounded-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {link.targetFeature} → {link.targetEntityId}
                            </p>
                            <p className="text-xs text-gray-500">{link.linkType}</p>
                          </div>
                          <Button size="sm" variant="ghost">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2">Link Statistics</h4>
                  {(() => {
                    const stats = getLinkStatistics()
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Links:</span>
                          <span className="font-medium">{stats.total}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Cross-Feature:</span>
                          <span className="font-medium">{stats.byFeature['knowledge-base'] || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Strong Links:</span>
                          <span className="font-medium">{stats.byStrength.strong}</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-medium text-blue-900">Execution Analytics</h4>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Total Executions:</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Success Rate:</span>
                    <span className="font-medium">0%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Duration:</span>
                    <span className="font-medium">0s</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <h4 className="text-sm font-medium text-green-900">Performance</h4>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>CPU Usage:</span>
                    <span className="font-medium">Low</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage:</span>
                    <span className="font-medium">Low</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Network Calls:</span>
                    <span className="font-medium">0</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Metadata */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Metadata</h4>
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Created:</span>
              <span>{new Date(node.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Updated:</span>
              <span>{new Date(node.updatedAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Version:</span>
              <span>{node.metadata?.version || '1.0.0'}</span>
            </div>
            <div className="flex justify-between">
              <span>Created By:</span>
              <span>{node.metadata?.createdBy || 'System'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 