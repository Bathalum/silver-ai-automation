'use client'

import React, { useState, useCallback } from 'react'
import { FunctionModelNode } from '@/lib/domain/entities/function-model-node-types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  Trash2, 
  Play, 
  Edit3, 
  Save, 
  X,
  Layers,
  Zap,
  Hammer,
  ArrowLeftRight,
  Package
} from 'lucide-react'

interface NodeDetailsPanelProps {
  node: FunctionModelNode
  onUpdate: (nodeId: string, updates: Partial<FunctionModelNode>) => void
  onDelete: (nodeId: string) => void
  readOnly?: boolean
}

export function NodeDetailsPanel({
  node,
  onUpdate,
  onDelete,
  readOnly = false
}: NodeDetailsPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: node.name,
    description: node.description,
    nodeType: node.nodeType,
    executionType: node.processBehavior.executionType,
    complexity: node.businessLogic.complexity || 'simple',
    sla: node.businessLogic.sla || 0,
    kpis: node.businessLogic.kpis || []
  })

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      await onUpdate(node.nodeId, {
        name: editData.name,
        description: editData.description,
        nodeType: editData.nodeType,
        processBehavior: {
          ...node.processBehavior,
          executionType: editData.executionType
        },
        businessLogic: {
          ...node.businessLogic,
          complexity: editData.complexity,
          sla: editData.sla,
          kpis: editData.kpis
        }
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update node:', error)
    }
  }, [node.nodeId, editData, onUpdate])

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this node?')) return
    
    try {
      await onDelete(node.nodeId)
    } catch (error) {
      console.error('Failed to delete node:', error)
    }
  }, [node.nodeId, onDelete])

  // Get node icon
  const getNodeIcon = useCallback((nodeType: string) => {
    switch (nodeType) {
      case 'stageNode':
        return <Layers className="w-5 h-5" />
      case 'actionTableNode':
        return <Hammer className="w-5 h-5" />
      case 'ioNode':
        return <ArrowLeftRight className="w-5 h-5" />
      case 'functionModelContainerNode':
        return <Package className="w-5 h-5" />
      default:
        return <Settings className="w-5 h-5" />
    }
  }, [])

  // Get node color
  const getNodeColor = useCallback((nodeType: string) => {
    switch (nodeType) {
      case 'stageNode':
        return 'bg-blue-500'
      case 'actionTableNode':
        return 'bg-green-500'
      case 'ioNode':
        return 'bg-purple-500'
      case 'functionModelContainerNode':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }, [])

  return (
    <div className="w-80 border-l bg-white overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-md ${getNodeColor(node.nodeType)} text-white`}>
              {getNodeIcon(node.nodeType)}
            </div>
            <div>
              <h2 className="text-lg font-semibold">Node Details</h2>
              <p className="text-sm text-gray-600">{node.nodeType}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {!readOnly && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Name</label>
                  {isEditing ? (
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{node.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-600">Description</label>
                  {isEditing ? (
                    <Textarea
                      value={editData.description}
                      onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm mt-1">{node.description || 'No description'}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-600">Node Type</label>
                  {isEditing ? (
                    <Select
                      value={editData.nodeType}
                      onValueChange={(value) => setEditData(prev => ({ ...prev, nodeType: value as FunctionModelNode['nodeType'] }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stageNode">Stage Node</SelectItem>
                        <SelectItem value="actionTableNode">Action Table Node</SelectItem>
                        <SelectItem value="ioNode">I/O Node</SelectItem>
                        <SelectItem value="functionModelContainerNode">Container Node</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="mt-1">{node.nodeType}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Position Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-600">X</label>
                    <p className="text-sm">{node.position.x}</p>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-600">Y</label>
                    <p className="text-sm">{node.position.y}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Feature</span>
                  <Badge variant="secondary" className="text-xs">{node.metadata.feature}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Version</span>
                  <Badge variant="secondary" className="text-xs">{node.metadata.version}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Tags</span>
                  <div className="flex gap-1">
                    {node.metadata.tags.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                    {node.metadata.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">+{node.metadata.tags.length - 2}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-4">
            {/* Process Behavior */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Process Behavior</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Execution Type</label>
                  {isEditing ? (
                    <Select
                      value={editData.executionType}
                      onValueChange={(value) => setEditData(prev => ({ ...prev, executionType: value as any }))}
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
                    <Badge variant="outline" className="mt-1">{node.processBehavior.executionType}</Badge>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-600">Dependencies</label>
                  <p className="text-sm mt-1">
                    {node.processBehavior.dependencies?.length || 0} dependencies
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-600">Triggers</label>
                  <p className="text-sm mt-1">
                    {node.processBehavior.triggers?.length || 0} triggers
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Business Logic */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Business Logic</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Complexity</label>
                  {isEditing ? (
                    <Select
                      value={editData.complexity}
                      onValueChange={(value) => setEditData(prev => ({ ...prev, complexity: value as any }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="complex">Complex</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="mt-1">{node.businessLogic.complexity}</Badge>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-600">SLA (seconds)</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editData.sla}
                      onChange={(e) => setEditData(prev => ({ ...prev, sla: parseInt(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{node.businessLogic.sla || 'Not set'}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-600">KPIs</label>
                  <p className="text-sm mt-1">
                    {node.businessLogic.kpis?.length || 0} KPIs defined
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            {/* Function Model Data */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Function Model Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Stage Data</label>
                  <p className="text-sm mt-1">
                    {node.functionModelData.stage ? 'Present' : 'Not set'}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-600">Action Data</label>
                  <p className="text-sm mt-1">
                    {node.functionModelData.action ? 'Present' : 'Not set'}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-600">I/O Data</label>
                  <p className="text-sm mt-1">
                    {node.functionModelData.io ? 'Present' : 'Not set'}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-600">Container Data</label>
                  <p className="text-sm mt-1">
                    {node.functionModelData.container ? 'Present' : 'Not set'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Relationships */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Relationships</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {node.relationships?.length || 0} relationships
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        {isEditing && !readOnly && (
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 