'use client'

import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Settings, Play, Square, Eye, Copy, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface BaseNodeData extends Record<string, unknown> {
  id: string
  type: string
  name: string
  description?: string
  status: 'idle' | 'running' | 'completed' | 'error' | 'paused'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  raci?: {
    responsible: string
    accountable: string
    consulted: string
    informed: string
  }
  nestingLevel?: number
  position: { x: number; y: number }
}

interface BaseNodeProps {
  data: BaseNodeData
  selected?: boolean
  children?: React.ReactNode
  className?: string
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  onDuplicate?: (nodeId: string) => void
  onExecute?: (nodeId: string) => void
  onStop?: (nodeId: string) => void
  onViewLogs?: (nodeId: string) => void
  onConfigure?: (nodeId: string) => void
}

export function BaseNode({
  data,
  selected = false,
  children,
  className = '',
  onEdit,
  onDelete,
  onDuplicate,
  onExecute,
  onStop,
  onViewLogs,
  onConfigure
}: BaseNodeProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500'
      case 'completed': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      case 'paused': return 'bg-yellow-500'
      default: return 'bg-gray-400'
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card 
      className={`relative min-w-[200px] ${selected ? 'ring-2 ring-blue-500' : ''} ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />

      {/* Header Section */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {data.type}
            </Badge>
            {data.priority && (
              <Badge variant="outline" className={`text-xs ${getPriorityColor(data.priority)}`}>
                {data.priority}
              </Badge>
            )}
            {data.raci && (
              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                RACI
              </Badge>
            )}
            {data.nestingLevel && data.nestingLevel > 0 && (
              <Badge variant="outline" className="text-xs bg-indigo-100 text-indigo-800 border-indigo-200">
                L{data.nestingLevel}
              </Badge>
            )}
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(data.status)}`} />
            <span className="text-xs text-gray-600 capitalize">{data.status}</span>
          </div>
        </div>
        
        <h3 className="text-sm font-semibold text-gray-900 truncate">{data.name}</h3>
      </CardHeader>

      {/* Body Section */}
      <CardContent className="pt-0 pb-2">
        {data.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{data.description}</p>
        )}
        
        {/* Custom content for specific node types */}
        {children}
      </CardContent>

      {/* Control Buttons */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {/* Quick Actions */}
        {onExecute && data.status === 'idle' && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-700"
            onClick={() => onExecute(data.id)}
            title="Execute"
          >
            <Play className="h-3 w-3" />
          </Button>
        )}
        
        {onStop && data.status === 'running' && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-700"
            onClick={() => onStop(data.id)}
            title="Stop"
          >
            <Square className="h-3 w-3" />
          </Button>
        )}

        {/* More Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(data.id)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {onConfigure && (
              <DropdownMenuItem onClick={() => onConfigure(data.id)}>
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </DropdownMenuItem>
            )}
            {onViewLogs && (
              <DropdownMenuItem onClick={() => onViewLogs(data.id)}>
                <Eye className="h-4 w-4 mr-2" />
                View Logs
              </DropdownMenuItem>
            )}
            {onDuplicate && (
              <DropdownMenuItem onClick={() => onDuplicate(data.id)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem 
                onClick={() => onDelete(data.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />

      {/* Context Handle (Right side) */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500 border-2 border-white"
        id="context"
      />
    </Card>
  )
}
