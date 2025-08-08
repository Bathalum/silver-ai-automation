// Unified Node Graph Component
// This file implements the unified node visualization following the Presentation Layer Complete Guide

'use client'

import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  Controls,
  Background,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider,
  useReactFlow,
  Panel
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Search, Filter, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { BaseNode } from '@/lib/domain/entities/base-node-types'
import { CrossFeatureLink } from '@/lib/domain/entities/cross-feature-link-types'
import { cn } from '@/lib/utils'

// Import node components from different features
import { StageNode, ActionTableNode, IONode } from '@/app/(private)/dashboard/function-model/components/flow-nodes'
import { ProcessNode } from '@/components/composites/process/process-node'
import { ContentNode } from '@/components/composites/content/content-node'
import { IntegrationNode } from '@/components/composites/integration/integration-node'
import { DomainNode } from '@/components/composites/domain/domain-node'

interface UnifiedNodeGraphProps {
  nodes: BaseNode[]
  links: CrossFeatureLink[]
  onNodeClick?: (node: BaseNode) => void
  onLinkClick?: (link: CrossFeatureLink) => void
  onNodeDrag?: (nodeId: string, position: { x: number; y: number }) => void
  onLinkCreate?: (connection: Connection) => void
  readOnly?: boolean
  highlightNodeType?: string | null
  className?: string
}

// Convert BaseNode to React Flow Node
const convertToReactFlowNode = (baseNode: BaseNode): Node => {
  return {
    id: baseNode.nodeId,
    type: baseNode.nodeType,
    position: baseNode.position,
    data: {
      ...baseNode,
      name: baseNode.name,
      description: baseNode.description,
      nodeType: baseNode.nodeType,
      metadata: baseNode.metadata
    },
    draggable: true,
    selectable: true,
    deletable: false, // Deletion handled through context menu
    style: {
      opacity: 1,
      transition: 'opacity 0.2s ease-in-out'
    }
  }
}

// Convert CrossFeatureLink to React Flow Edge
const convertToReactFlowEdge = (link: CrossFeatureLink): Edge => {
  return {
    id: link.linkId,
    source: link.sourceNodeId,
    target: link.targetNodeId,
    type: 'smoothstep',
    style: {
      stroke: getLinkColor(link.linkType),
      strokeWidth: 2,
      opacity: 0.8
    },
    data: {
      linkType: link.linkType,
      linkStrength: link.linkStrength,
      linkContext: link.linkContext
    }
  }
}

// Get link color based on link type
const getLinkColor = (linkType: string): string => {
  const colorMap: Record<string, string> = {
    'depends-on': '#ef4444',
    'implements': '#3b82f6',
    'extends': '#10b981',
    'references': '#f59e0b',
    'triggers': '#8b5cf6',
    'contains': '#06b6d4',
    'default': '#6b7280'
  }
  return colorMap[linkType] || colorMap.default
}

// Get node color based on node type
const getNodeColor = (nodeType: string): string => {
  const colorMap: Record<string, string> = {
    'function-model': '#3b82f6',
    'knowledge-base': '#10b981',
    'spindle': '#f59e0b',
    'event-storm': '#8b5cf6',
    'default': '#6b7280'
  }
  
  const feature = nodeType.split('-')[0]
  return colorMap[feature] || colorMap.default
}

// Filter Panel Component
function FilterPanel({
  visibleNodeTypes,
  onToggleNodeType,
  highlightNodeType,
  onSetHighlightNodeType,
  searchTerm,
  onSearchChange
}: {
  visibleNodeTypes: string[]
  onToggleNodeType: (nodeType: string) => void
  highlightNodeType: string | null
  onSetHighlightNodeType: (nodeType: string | null) => void
  searchTerm: string
  onSearchChange: (term: string) => void
}) {
  const nodeTypeOptions = [
    { value: 'function-model', label: 'Function Model', icon: '⚙️' },
    { value: 'knowledge-base', label: 'Knowledge Base', icon: '📚' },
    { value: 'spindle', label: 'Spindle', icon: '🔄' },
    { value: 'event-storm', label: 'Event Storm', icon: '⚡' }
  ]

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="text-sm">Node Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">Search Nodes</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Node Type Filters */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">Node Types</label>
          <div className="space-y-2">
            {nodeTypeOptions.map((option) => (
              <div key={option.value} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleNodeType(option.value)}
                    className={cn(
                      "h-6 w-6 p-0",
                      visibleNodeTypes.includes(option.value) 
                        ? "text-blue-600" 
                        : "text-gray-400"
                    )}
                  >
                    {visibleNodeTypes.includes(option.value) ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSetHighlightNodeType(
                      highlightNodeType === option.value ? null : option.value
                    )}
                    className={cn(
                      "h-6 w-6 p-0",
                      highlightNodeType === option.value 
                        ? "text-orange-600" 
                        : "text-gray-400"
                    )}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">Legend</label>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Function Model</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Knowledge Base</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>Spindle</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span>Event Storm</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main Unified Node Graph Component
export function UnifiedNodeGraph({
  nodes,
  links,
  onNodeClick,
  onLinkClick,
  onNodeDrag,
  onLinkCreate,
  readOnly = false,
  highlightNodeType = null,
  className
}: UnifiedNodeGraphProps) {
  // Node type mapping - memoized to prevent React Flow warnings
  const nodeTypes = useMemo(() => ({
    // Function Model nodes
    stageNode: StageNode,
    actionTableNode: ActionTableNode,
    ioNode: IONode,
    
    // Process nodes
    processNode: ProcessNode,
    
    // Content nodes
    contentNode: ContentNode,
    
    // Integration nodes
    integrationNode: IntegrationNode,
    
    // Domain nodes
    domainNode: DomainNode
  }), [])

  const [reactFlowNodes, setReactFlowNodes] = useState<Node[]>([])
  const [reactFlowEdges, setReactFlowEdges] = useState<Edge[]>([])
  const [visibleNodeTypes, setVisibleNodeTypes] = useState<string[]>([
    'function-model', 'knowledge-base', 'spindle', 'event-storm'
  ])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNode, setSelectedNode] = useState<BaseNode | null>(null)
  const [selectedLink, setSelectedLink] = useState<CrossFeatureLink | null>(null)

  // Memoized filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const matchesType = visibleNodeTypes.some(type => node.nodeType.includes(type))
      const matchesSearch = searchTerm === '' || 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesHighlight = !highlightNodeType || node.nodeType.includes(highlightNodeType)
      
      return matchesType && matchesSearch && matchesHighlight
    })
  }, [nodes, visibleNodeTypes, searchTerm, highlightNodeType])

  // Memoized filtered links
  const filteredLinks = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map(node => node.nodeId))
    return links.filter(link => 
      visibleNodeIds.has(link.sourceNodeId) && visibleNodeIds.has(link.targetNodeId)
    )
  }, [links, filteredNodes])

  // Convert nodes to React Flow format
  const flowNodes = useMemo(() => {
    return filteredNodes.map(node => {
      const flowNode = convertToReactFlowNode(node)
      
      // Apply highlighting
      if (highlightNodeType && node.nodeType.includes(highlightNodeType)) {
        flowNode.style = {
          ...flowNode.style,
          opacity: 1,
          boxShadow: '0 0 0 2px #f59e0b'
        }
      } else if (highlightNodeType) {
        flowNode.style = {
          ...flowNode.style,
          opacity: 0.3
        }
      }
      
      return flowNode
    })
  }, [filteredNodes, highlightNodeType])

  // Convert links to React Flow format
  const flowEdges = useMemo(() => {
    return filteredLinks.map(link => convertToReactFlowEdge(link))
  }, [filteredLinks])

  // Update React Flow nodes and edges
  useEffect(() => {
    setReactFlowNodes(flowNodes)
  }, [flowNodes])

  useEffect(() => {
    setReactFlowEdges(flowEdges)
  }, [flowEdges])

  // Event handlers
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setReactFlowNodes(prev => applyNodeChanges(changes, prev))
  }, [])

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    setReactFlowEdges(prev => applyEdgeChanges(changes, prev))
  }, [])

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const baseNode = nodes.find(n => n.nodeId === node.id)
    if (baseNode) {
      setSelectedNode(baseNode)
      onNodeClick?.(baseNode)
    }
  }, [nodes, onNodeClick])

  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    const link = links.find(l => l.linkId === edge.id)
    if (link) {
      setSelectedLink(link)
      onLinkClick?.(link)
    }
  }, [links, onLinkClick])

  const handleConnect = useCallback((connection: Connection) => {
    if (!readOnly && onLinkCreate) {
      onLinkCreate(connection)
    }
  }, [readOnly, onLinkCreate])

  const handleNodeDrag = useCallback((event: React.MouseEvent, node: Node) => {
    if (onNodeDrag) {
      onNodeDrag(node.id, node.position)
    }
  }, [onNodeDrag])

  // Filter panel handlers
  const handleToggleNodeType = useCallback((nodeType: string) => {
    setVisibleNodeTypes(prev => 
      prev.includes(nodeType) 
        ? prev.filter(t => t !== nodeType)
        : [...prev, nodeType]
    )
  }, [])

  const handleSetHighlightNodeType = useCallback((nodeType: string | null) => {
    // This would be controlled by parent component
    console.log('Highlight node type:', nodeType)
  }, [])

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  return (
    <div className={cn("w-full h-full relative", className)}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onConnect={handleConnect}
          onNodeDrag={handleNodeDrag}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={true}
          selectNodesOnDrag={false}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          
          {/* Filter Panel */}
          <Panel position="top-left" className="z-10">
            <FilterPanel
              visibleNodeTypes={visibleNodeTypes}
              onToggleNodeType={handleToggleNodeType}
              highlightNodeType={highlightNodeType}
              onSetHighlightNodeType={handleSetHighlightNodeType}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
            />
          </Panel>

          {/* Node Details Panel */}
          {selectedNode && (
            <Panel position="top-right" className="z-10">
              <Card className="w-80">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedNode.nodeType}
                    </Badge>
                    {selectedNode.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    {selectedNode.description || 'No description'}
                  </p>
                  {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-500">Metadata</p>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(selectedNode.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Panel>
          )}

          {/* Link Details Panel */}
          {selectedLink && (
            <Panel position="bottom-right" className="z-10">
              <Card className="w-80">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedLink.linkType}
                    </Badge>
                    Connection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">From:</span> {selectedLink.sourceNodeId}
                    </div>
                    <div>
                      <span className="font-medium">To:</span> {selectedLink.targetNodeId}
                    </div>
                    <div>
                      <span className="font-medium">Strength:</span> {selectedLink.linkStrength}
                    </div>
                    {selectedLink.linkContext && Object.keys(selectedLink.linkContext).length > 0 && (
                      <div>
                        <p className="font-medium">Context:</p>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(selectedLink.linkContext, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Panel>
          )}
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
} 