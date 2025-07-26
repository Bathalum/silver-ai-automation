"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  FolderOpen, 
  Calendar, 
  GitBranch, 
  Link, 
  Network, 
  AlertCircle,
  TrendingUp,
  BarChart3
} from "lucide-react"
import type { Node, Edge } from "reactflow"

export interface FlowStatisticsProps {
  nodes: Node[]
  edges: Edge[]
  title?: string
  showSummary?: boolean
  showDetailedStats?: boolean
  className?: string
  variant?: "default" | "compact" | "detailed"
}

export interface FlowStats {
  totalNodes: number
  totalEdges: number
  nodeTypes: Record<string, number>
  edgeTypes: Record<string, number>
  connections: {
    total: number
    sibling: number
    parentChild: number
    crossType: number
  }
  insights: {
    standaloneNodes: number
    connectedNodes: number
    averageConnections: number
    mostConnectedNode?: string
  }
}

export function FlowStatistics({
  nodes,
  edges,
  title = "Flow Statistics",
  showSummary = true,
  showDetailedStats = true,
  className,
  variant = "default"
}: FlowStatisticsProps) {
  
  const stats = useMemo((): FlowStats => {
    // Count nodes by type
    const nodeTypes: Record<string, number> = {}
    nodes.forEach(node => {
      const type = node.type || 'unknown'
      nodeTypes[type] = (nodeTypes[type] || 0) + 1
    })

    // Count edges by type
    const edgeTypes: Record<string, number> = {}
    edges.forEach(edge => {
      const type = edge.type || 'default'
      edgeTypes[type] = (edgeTypes[type] || 0) + 1
    })

    // Calculate connections
    const siblingConnections = edges.filter(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      return sourceNode?.type === targetNode?.type
    }).length

    const parentChildConnections = edges.filter(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      return sourceNode?.type !== targetNode?.type
    }).length

    // Calculate insights
    const connectedNodeIds = new Set()
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source)
      connectedNodeIds.add(edge.target)
    })

    const standaloneNodes = nodes.filter(node => !connectedNodeIds.has(node.id)).length
    const connectedNodes = connectedNodeIds.size
    const averageConnections = nodes.length > 0 ? (edges.length * 2) / nodes.length : 0

    // Find most connected node
    const nodeConnectionCounts: Record<string, number> = {}
    edges.forEach(edge => {
      nodeConnectionCounts[edge.source] = (nodeConnectionCounts[edge.source] || 0) + 1
      nodeConnectionCounts[edge.target] = (nodeConnectionCounts[edge.target] || 0) + 1
    })

    const mostConnectedNode = Object.entries(nodeConnectionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0]

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeTypes,
      edgeTypes,
      connections: {
        total: edges.length,
        sibling: siblingConnections,
        parentChild: parentChildConnections,
        crossType: edges.length - siblingConnections - parentChildConnections
      },
      insights: {
        standaloneNodes,
        connectedNodes,
        averageConnections: Math.round(averageConnections * 100) / 100,
        mostConnectedNode
      }
    }
  }, [nodes, edges])

  const renderSummary = () => (
    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
      <div className="text-sm text-gray-700 space-y-1">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span><strong>{stats.totalNodes}</strong> total element{stats.totalNodes !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-green-600" />
          <span><strong>{stats.connections.total}</strong> connection{stats.connections.total !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-purple-600" />
          <span><strong>{stats.insights.connectedNodes}</strong> connected, <strong>{stats.insights.standaloneNodes}</strong> standalone</span>
        </div>
      </div>
    </div>
  )

  const renderDetailedStats = () => {
    if (variant === "compact") {
      return (
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(stats.nodeTypes).map(([type, count]) => (
            <div key={type} className="border rounded-lg p-3">
              <div className="text-lg font-bold text-blue-600">{count}</div>
              <div className="text-xs text-gray-600 capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 gap-4">
        {/* Node Type Breakdown */}
        {Object.entries(stats.nodeTypes).map(([type, count]) => (
          <div key={type} className="border rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{count}</div>
            <div className="text-sm text-gray-600 capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</div>
          </div>
        ))}
        
        {/* Connection Types */}
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{stats.connections.total}</div>
          <div className="text-sm text-gray-600">Total Connections</div>
        </div>
        
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.connections.sibling}</div>
          <div className="text-sm text-gray-600">Sibling Connections</div>
        </div>
        
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-indigo-600">{stats.connections.parentChild}</div>
          <div className="text-sm text-gray-600">Parent-Child Connections</div>
        </div>
        
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.insights.standaloneNodes}</div>
          <div className="text-sm text-gray-600">Standalone Elements</div>
        </div>
      </div>
    )
  }

  const renderInsights = () => (
    <div className="mt-4 space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Insights</h4>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span>Average connections per element:</span>
          <Badge variant="secondary">{stats.insights.averageConnections}</Badge>
        </div>
        {stats.insights.mostConnectedNode && (
          <div className="flex items-center justify-between text-xs">
            <span>Most connected element:</span>
            <Badge variant="outline" className="text-xs">
              {stats.insights.mostConnectedNode.substring(0, 8)}...
            </Badge>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSummary && renderSummary()}
        {showDetailedStats && renderDetailedStats()}
        {variant === "detailed" && renderInsights()}
      </CardContent>
    </Card>
  )
}

// Hook for getting flow statistics
export function useFlowStatistics(nodes: Node[], edges: Edge[]): FlowStats {
  return useMemo((): FlowStats => {
    // Count nodes by type
    const nodeTypes: Record<string, number> = {}
    nodes.forEach(node => {
      const type = node.type || 'unknown'
      nodeTypes[type] = (nodeTypes[type] || 0) + 1
    })

    // Count edges by type
    const edgeTypes: Record<string, number> = {}
    edges.forEach(edge => {
      const type = edge.type || 'default'
      edgeTypes[type] = (edgeTypes[type] || 0) + 1
    })

    // Calculate connections
    const siblingConnections = edges.filter(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      return sourceNode?.type === targetNode?.type
    }).length

    const parentChildConnections = edges.filter(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      return sourceNode?.type !== targetNode?.type
    }).length

    // Calculate insights
    const connectedNodeIds = new Set()
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source)
      connectedNodeIds.add(edge.target)
    })

    const standaloneNodes = nodes.filter(node => !connectedNodeIds.has(node.id)).length
    const connectedNodes = connectedNodeIds.size
    const averageConnections = nodes.length > 0 ? (edges.length * 2) / nodes.length : 0

    // Find most connected node
    const nodeConnectionCounts: Record<string, number> = {}
    edges.forEach(edge => {
      nodeConnectionCounts[edge.source] = (nodeConnectionCounts[edge.source] || 0) + 1
      nodeConnectionCounts[edge.target] = (nodeConnectionCounts[edge.target] || 0) + 1
    })

    const mostConnectedNode = Object.entries(nodeConnectionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0]

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeTypes,
      edgeTypes,
      connections: {
        total: edges.length,
        sibling: siblingConnections,
        parentChild: parentChildConnections,
        crossType: edges.length - siblingConnections - parentChildConnections
      },
      insights: {
        standaloneNodes,
        connectedNodes,
        averageConnections: Math.round(averageConnections * 100) / 100,
        mostConnectedNode
      }
    }
  }, [nodes, edges])
} 