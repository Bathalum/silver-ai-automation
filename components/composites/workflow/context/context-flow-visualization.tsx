'use client'

import React from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'
import { cn } from '@/lib/utils'

interface ContextConnection {
  id: string
  sourceNodeId: string
  targetNodeId: string
  accessLevel: 'read' | 'write' | 'inherit'
  contextType: 'sibling' | 'parent' | 'child' | 'nested'
  isActive: boolean
}

interface ContextFlowVisualizationProps {
  connections: ContextConnection[]
  showAccessLevels?: boolean
  showHierarchy?: boolean
  selectedNodeId?: string
  onConnectionClick?: (connection: ContextConnection) => void
  className?: string
}

export function ContextFlowVisualization({
  connections,
  showAccessLevels = true,
  showHierarchy = true,
  selectedNodeId,
  onConnectionClick,
  className
}: ContextFlowVisualizationProps) {
  const { getNodes } = useReactFlow()
  const nodes = getNodes()

  const getConnectionStyle = (connection: ContextConnection) => {
    const baseStyle = {
      position: 'absolute' as const,
      pointerEvents: 'auto' as const,
      cursor: 'pointer',
      zIndex: 10,
    }

    // Context type styling
    const contextStyles = {
      sibling: 'stroke-blue-400 stroke-dasharray-4',
      parent: 'stroke-green-400 stroke-dasharray-2',
      child: 'stroke-purple-400 stroke-dasharray-6',
      nested: 'stroke-orange-400 stroke-dasharray-8'
    }

    // Access level opacity
    const accessOpacity = {
      read: 0.6,
      write: 0.9,
      inherit: 0.4
    }

    return {
      ...baseStyle,
      opacity: connection.isActive ? accessOpacity[connection.accessLevel] : 0.3,
      filter: selectedNodeId && 
        (connection.sourceNodeId === selectedNodeId || connection.targetNodeId === selectedNodeId)
        ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.8))'
        : 'none'
    }
  }

  const getNodePosition = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return { x: 0, y: 0 }
    return { x: node.position.x, y: node.position.y }
  }

  const calculateConnectionPath = (connection: ContextConnection) => {
    const sourcePos = getNodePosition(connection.sourceNodeId)
    const targetPos = getNodePosition(connection.targetNodeId)
    
    const startX = sourcePos.x + 100 // Approximate node center
    const startY = sourcePos.y + 50
    const endX = targetPos.x + 100
    const endY = targetPos.y + 50
    
    // Create curved path for better visual separation
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2
    const curvature = 50
    
    return `M ${startX} ${startY} Q ${midX} ${midY - curvature} ${endX} ${endY}`
  }

  const getAccessLevelIcon = (accessLevel: string) => {
    switch (accessLevel) {
      case 'read': return '👁️'
      case 'write': return '✏️'
      case 'inherit': return '⬇️'
      default: return '?'
    }
  }

  const getContextTypeColor = (contextType: string) => {
    switch (contextType) {
      case 'sibling': return '#60a5fa' // blue-400
      case 'parent': return '#4ade80'  // green-400
      case 'child': return '#a78bfa'   // purple-400
      case 'nested': return '#fb923c'  // orange-400
      default: return '#6b7280'        // gray-500
    }
  }

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 5 }}
      >
        <defs>
          {/* Define different dash patterns for context types */}
          <pattern id="sibling-dash" patternUnits="userSpaceOnUse" width="8" height="4">
            <line x1="0" y1="2" x2="4" y2="2" stroke="#60a5fa" strokeWidth="2" />
          </pattern>
          <pattern id="parent-dash" patternUnits="userSpaceOnUse" width="6" height="4">
            <line x1="0" y1="2" x2="3" y2="2" stroke="#4ade80" strokeWidth="2" />
          </pattern>
          <pattern id="child-dash" patternUnits="userSpaceOnUse" width="10" height="4">
            <line x1="0" y1="2" x2="5" y2="2" stroke="#a78bfa" strokeWidth="2" />
          </pattern>
          <pattern id="nested-dash" patternUnits="userSpaceOnUse" width="12" height="4">
            <line x1="0" y1="2" x2="6" y2="2" stroke="#fb923c" strokeWidth="2" />
          </pattern>
        </defs>

        {connections.map((connection) => {
          const path = calculateConnectionPath(connection)
          const midPoint = getNodePosition(connection.sourceNodeId)
          
          return (
            <g key={connection.id}>
              {/* Connection line */}
              <path
                d={path}
                fill="none"
                stroke={getContextTypeColor(connection.contextType)}
                strokeWidth="2"
                strokeDasharray={
                  connection.contextType === 'sibling' ? '4,4' :
                  connection.contextType === 'parent' ? '2,2' :
                  connection.contextType === 'child' ? '6,2' :
                  '8,4'
                }
                style={getConnectionStyle(connection)}
                onClick={() => onConnectionClick?.(connection)}
              />
              
              {/* Access level badge */}
              {showAccessLevels && (
                <g transform={`translate(${midPoint.x + 120}, ${midPoint.y + 30})`}>
                  <circle
                    r="12"
                    fill="white"
                    stroke={getContextTypeColor(connection.contextType)}
                    strokeWidth="2"
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onClick={() => onConnectionClick?.(connection)}
                  />
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="10"
                    fill={getContextTypeColor(connection.contextType)}
                    style={{ pointerEvents: 'none' }}
                  >
                    {getAccessLevelIcon(connection.accessLevel)}
                  </text>
                </g>
              )}
              
              {/* Hierarchy indicators */}
              {showHierarchy && connection.contextType !== 'sibling' && (
                <g transform={`translate(${midPoint.x + 80}, ${midPoint.y + 20})`}>
                  <polygon
                    points={
                      connection.contextType === 'parent' ? '0,0 8,4 0,8' :
                      connection.contextType === 'child' ? '8,0 0,4 8,8' :
                      '4,0 8,8 0,8'
                    }
                    fill={getContextTypeColor(connection.contextType)}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onClick={() => onConnectionClick?.(connection)}
                  />
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}