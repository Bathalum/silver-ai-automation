'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useFunctionModelNodes } from '@/lib/application/hooks/use-function-model-nodes'
import { useCrossFeatureLinking } from '@/lib/application/hooks/use-cross-feature-linking'
import { FunctionModelNode, NodeLink } from '@/lib/domain/entities/function-model-node-types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Plus, 
  Link, 
  Search, 
  Settings, 
  Play, 
  Trash2, 
  Move, 
  Edit3,
  Eye,
  EyeOff,
  RefreshCw,
  Zap
} from 'lucide-react'

interface NodeCanvasProps {
  modelId: string
  onNodeSelect?: (node: FunctionModelNode) => void
  onNodeUpdate?: (node: FunctionModelNode) => void
  onNodeDelete?: (nodeId: string) => void
  readOnly?: boolean
}

export function NodeCanvas({ 
  modelId, 
  onNodeSelect, 
  onNodeUpdate, 
  onNodeDelete, 
  readOnly = false 
}: NodeCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [selectedNode, setSelectedNode] = useState<FunctionModelNode | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'normal' | 'minimal' | 'detailed'>('normal')
  const [showConnections, setShowConnections] = useState(true)

  // Hooks
  const {
    nodes,
    links,
    loading,
    error,
    operationStates,
    createNode,
    updateNode,
    deleteNode,
    updateNodePosition,
    createLink,
    deleteLink,
    searchNodes,
    getConnectedNodes,
    refresh
  } = useFunctionModelNodes({ 
    modelId, 
    autoRefresh: true, 
    refreshInterval: 10000 
  })

  const {
    createCrossFeatureLink,
    validateLink,
    getLinkSuggestions,
    getConnectedEntities,
    getLinkStatistics
  } = useCrossFeatureLinking({
    sourceFeature: 'function-model',
    sourceEntityId: modelId
  })

  // Node creation state
  const [newNodeData, setNewNodeData] = useState({
    name: '',
    description: '',
    nodeType: 'stageNode' as const,
    positionX: 100,
    positionY: 100
  })

  // Link creation state
  const [newLinkData, setNewLinkData] = useState({
    targetFeature: 'knowledge-base' as const,
    targetEntityId: '',
    targetNodeId: '',
    linkType: 'references' as const,
    context: ''
  })

  // Handle node creation
  const handleCreateNode = useCallback(async () => {
    try {
      const newNode = await createNode({
        modelId,
        featureType: 'function-model',
        nodeType: newNodeData.nodeType,
        name: newNodeData.name,
        description: newNodeData.description,
        positionX: newNodeData.positionX,
        positionY: newNodeData.positionY,
        functionModelData: {},
        processBehavior: {
          executionType: 'sequential',
          dependencies: [],
          timeout: 30
        },
        businessLogic: {},
        metadata: {
          createdBy: 'user',
          version: '1.0.0'
        }
      })

      setShowCreateDialog(false)
      setNewNodeData({
        name: '',
        description: '',
        nodeType: 'stageNode',
        positionX: 100,
        positionY: 100
      })

      onNodeSelect?.(newNode)
    } catch (error) {
      console.error('Failed to create node:', error)
    }
  }, [createNode, modelId, newNodeData, onNodeSelect])

  // Handle node deletion
  const handleDeleteNode = useCallback(async (nodeId: string) => {
    if (!confirm('Are you sure you want to delete this node?')) return

    try {
      await deleteNode(nodeId)
      if (selectedNode?.nodeId === nodeId) {
        setSelectedNode(null)
      }
      onNodeDelete?.(nodeId)
    } catch (error) {
      console.error('Failed to delete node:', error)
    }
  }, [deleteNode, selectedNode, onNodeDelete])

  // Handle node execution
  const handleExecuteNode = useCallback(async (nodeId: string) => {
    try {
      // This would call the executeNode method from the hook
      console.log('Executing node:', nodeId)
      // await executeNode(nodeId)
    } catch (error) {
      console.error('Failed to execute node:', error)
    }
  }, [])

  // Handle node dragging
  const handleNodeDragStart = useCallback((e: React.MouseEvent, node: FunctionModelNode) => {
    if (readOnly) return
    
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setSelectedNode(node)
  }, [readOnly])

  const handleNodeDragMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedNode || readOnly) return

    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    const newPositionX = selectedNode.positionX + deltaX
    const newPositionY = selectedNode.positionY + deltaY

    setDragStart({ x: e.clientX, y: e.clientY })

    // Update node position
    updateNodePosition(selectedNode.nodeId, newPositionX, newPositionY)
  }, [isDragging, selectedNode, dragStart, readOnly, updateNodePosition])

  const handleNodeDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Handle link creation
  const handleCreateLink = useCallback(async () => {
    if (!selectedNode) return

    try {
      const validation = validateLink(
        newLinkData.targetFeature,
        newLinkData.targetEntityId,
        newLinkData.targetNodeId,
        newLinkData.linkType
      )

      if (!validation.isValid) {
        alert(`Link validation failed: ${validation.errors.join(', ')}`)
        return
      }

      await createCrossFeatureLink(
        newLinkData.targetFeature,
        newLinkData.targetEntityId,
        newLinkData.targetNodeId,
        newLinkData.linkType,
        newLinkData.context ? JSON.parse(newLinkData.context) : undefined
      )

      setShowLinkDialog(false)
      setNewLinkData({
        targetFeature: 'knowledge-base',
        targetEntityId: '',
        targetNodeId: '',
        linkType: 'references',
        context: ''
      })
    } catch (error) {
      console.error('Failed to create link:', error)
    }
  }, [selectedNode, newLinkData, createCrossFeatureLink, validateLink])

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return

    try {
      const results = await searchNodes(searchQuery)
      console.log('Search results:', results)
    } catch (error) {
      console.error('Search failed:', error)
    }
  }, [searchQuery, searchNodes])

  // Get node visual properties
  const getNodeVisualProps = useCallback((node: FunctionModelNode) => {
    const colors = {
      stageNode: 'bg-green-500',
      actionTableNode: 'bg-blue-500',
      ioNode: 'bg-yellow-500',
      functionModelContainer: 'bg-purple-500'
    }

    const icons = {
      stageNode: '📋',
      actionTableNode: '📊',
      ioNode: '🔄',
      functionModelContainer: '📦'
    }

    return {
      color: colors[node.nodeType] || 'bg-gray-500',
      icon: icons[node.nodeType] || '📄'
    }
  }, [])

  // Render individual node
  const renderNode = useCallback((node: FunctionModelNode) => {
    const visualProps = getNodeVisualProps(node)
    const isSelected = selectedNode?.nodeId === node.nodeId

    return (
      <Card
        key={node.nodeId}
        className={`
          absolute cursor-pointer transition-all duration-200
          ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
          ${readOnly ? 'cursor-default' : ''}
        `}
        style={{
          left: node.positionX,
          top: node.positionY,
          width: viewMode === 'minimal' ? 120 : 200,
          zIndex: isSelected ? 10 : 1
        }}
        onMouseDown={(e) => handleNodeDragStart(e, node)}
        onMouseMove={handleNodeDragMove}
        onMouseUp={handleNodeDragEnd}
        onClick={() => setSelectedNode(node)}
      >
        <div className={`p-3 ${visualProps.color} text-white rounded-t-lg`}>
          <div className="flex items-center justify-between">
            <span className="text-lg">{visualProps.icon}</span>
            <div className="flex gap-1">
              {!readOnly && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExecuteNode(node.nodeId)
                        }}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Execute Node</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNode(node.nodeId)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete Node</TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-3">
          <h3 className="font-semibold text-sm truncate">{node.name}</h3>
          {viewMode !== 'minimal' && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {node.description || 'No description'}
            </p>
          )}
          <div className="flex items-center gap-1 mt-2">
            <Badge variant="secondary" className="text-xs">
              {node.nodeType}
            </Badge>
            {node.processBehavior?.executionType && (
              <Badge variant="outline" className="text-xs">
                {node.processBehavior.executionType}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    )
  }, [
    selectedNode,
    readOnly,
    viewMode,
    getNodeVisualProps,
    handleNodeDragStart,
    handleNodeDragMove,
    handleNodeDragEnd,
    handleExecuteNode,
    handleDeleteNode
  ])

  // Render connections
  const renderConnections = useCallback(() => {
    if (!showConnections) return null

    return (
      <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {links.map((link) => {
          const sourceNode = nodes.find(n => n.nodeId === link.sourceNodeId)
          const targetNode = nodes.find(n => n.nodeId === link.targetNodeId)
          
          if (!sourceNode || !targetNode) return null

          const startX = sourceNode.positionX + 100
          const startY = sourceNode.positionY + 50
          const endX = targetNode.positionX
          const endY = targetNode.positionY + 50

          return (
            <g key={link.linkId}>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={link.visualProperties?.color || '#6b7280'}
                strokeWidth={link.visualProperties?.width || 2}
                strokeDasharray={link.visualProperties?.style === 'dashed' ? '5,5' : 'none'}
              />
              <circle
                cx={endX}
                cy={endY}
                r={3}
                fill={link.visualProperties?.color || '#6b7280'}
              />
            </g>
          )
        })}
      </svg>
    )
  }, [links, nodes, showConnections])

  return (
    <TooltipProvider>
      <div className="relative w-full h-full">
        {/* Canvas Header */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-sm border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Function Model Canvas</h2>
              {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
              {error && <Badge variant="destructive">{error}</Badge>}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48"
                />
                <Button size="sm" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {/* View Controls */}
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConnections(!showConnections)}
              >
                {showConnections ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>

              {!readOnly && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateDialog(true)}
                    disabled={operationStates.createNode?.loading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Node
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLinkDialog(true)}
                    disabled={!selectedNode}
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Link
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative w-full h-full bg-gray-50 overflow-hidden"
          style={{ paddingTop: '80px' }}
        >
          {renderConnections()}
          {nodes.map(renderNode)}
        </div>

        {/* Node Creation Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Node</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Node Type</label>
                <Select
                  value={newNodeData.nodeType}
                  onValueChange={(value: any) => setNewNodeData(prev => ({ ...prev, nodeType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stageNode">Stage Node</SelectItem>
                    <SelectItem value="actionTableNode">Action Table Node</SelectItem>
                    <SelectItem value="ioNode">I/O Node</SelectItem>
                    <SelectItem value="functionModelContainer">Container</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newNodeData.name}
                  onChange={(e) => setNewNodeData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter node name"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newNodeData.description}
                  onChange={(e) => setNewNodeData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter node description"
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Position X</label>
                  <Input
                    type="number"
                    value={newNodeData.positionX}
                    onChange={(e) => setNewNodeData(prev => ({ ...prev, positionX: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Position Y</label>
                  <Input
                    type="number"
                    value={newNodeData.positionY}
                    onChange={(e) => setNewNodeData(prev => ({ ...prev, positionY: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateNode}
                  disabled={!newNodeData.name || operationStates.createNode?.loading}
                >
                  {operationStates.createNode?.loading ? 'Creating...' : 'Create Node'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Link Creation Dialog */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Cross-Feature Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Target Feature</label>
                <Select
                  value={newLinkData.targetFeature}
                  onValueChange={(value: any) => setNewLinkData(prev => ({ ...prev, targetFeature: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="knowledge-base">Knowledge Base</SelectItem>
                    <SelectItem value="event-storm">Event Storm</SelectItem>
                    <SelectItem value="spindle">Spindle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Target Entity ID</label>
                <Input
                  value={newLinkData.targetEntityId}
                  onChange={(e) => setNewLinkData(prev => ({ ...prev, targetEntityId: e.target.value }))}
                  placeholder="Enter target entity ID"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Target Node ID (Optional)</label>
                <Input
                  value={newLinkData.targetNodeId}
                  onChange={(e) => setNewLinkData(prev => ({ ...prev, targetNodeId: e.target.value }))}
                  placeholder="Enter target node ID"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Link Type</label>
                <Select
                  value={newLinkData.linkType}
                  onValueChange={(value: any) => setNewLinkData(prev => ({ ...prev, linkType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="references">References</SelectItem>
                    <SelectItem value="implements">Implements</SelectItem>
                    <SelectItem value="supports">Supports</SelectItem>
                    <SelectItem value="documents">Documents</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Context (Optional)</label>
                <Textarea
                  value={newLinkData.context}
                  onChange={(e) => setNewLinkData(prev => ({ ...prev, context: e.target.value }))}
                  placeholder="Enter link context as JSON"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateLink}
                  disabled={!newLinkData.targetEntityId}
                >
                  Create Link
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
} 