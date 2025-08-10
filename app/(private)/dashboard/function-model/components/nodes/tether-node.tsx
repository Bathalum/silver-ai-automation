'use client'

import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { BaseNode, BaseNodeData } from './node-base'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Link, Clock, RotateCcw, PlayCircle } from 'lucide-react'

export interface TetherNodeData extends BaseNodeData {
  executionStatus: 'pending' | 'running' | 'completed' | 'failed' | 'retrying'
  estimatedDuration?: string
  retryCount: number
  maxRetries: number
  lastExecutionTime?: string
  nextExecutionTime?: string
  position: { x: number; y: number }
}

interface TetherNodeProps {
  data: TetherNodeData
  selected?: boolean
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  onDuplicate?: (nodeId: string) => void
  onConfigure?: (nodeId: string) => void
  onExecute?: (nodeId: string) => void
  onStop?: (nodeId: string) => void
  onViewLogs?: (nodeId: string) => void
}

export function TetherNode({
  data,
  selected = false,
  onEdit,
  onDelete,
  onDuplicate,
  onConfigure,
  onExecute,
  onStop,
  onViewLogs
}: TetherNodeProps) {
  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'failed': return 'bg-red-100 text-red-800 border-red-200'
      case 'retrying': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getExecutionStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />
      case 'running': return <PlayCircle className="h-3 w-3" />
      case 'completed': return <PlayCircle className="h-3 w-3" />
      case 'failed': return <PlayCircle className="h-3 w-3" />
      case 'retrying': return <RotateCcw className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  return (
    <BaseNode
      data={data}
      selected={selected}
      className="w-[180px] h-[100px] border-l-4 border-l-orange-500"
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onConfigure={onConfigure}
      onExecute={onExecute}
      onStop={onStop}
      onViewLogs={onViewLogs}
    >
      <div className="space-y-2">
        {/* Execution Status */}
        <div className="flex items-center gap-2">
          <Link className="h-3 w-3 text-orange-600" />
          <Badge 
            variant="outline" 
            className={`text-xs ${getExecutionStatusColor(data.executionStatus)}`}
          >
            {getExecutionStatusIcon(data.executionStatus)}
            <span className="ml-1 capitalize">{data.executionStatus}</span>
          </Badge>
        </div>

        <Separator />

        {/* Retry Information */}
        <div className="flex items-center gap-2">
          <RotateCcw className="h-3 w-3 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Retry:</span>
          <Badge variant="secondary" className="text-xs">
            {data.retryCount}/{data.maxRetries}
          </Badge>
        </div>

        {/* Estimated Duration */}
        {data.estimatedDuration && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Est. Duration:</span>
            <span className="text-xs text-gray-600">{data.estimatedDuration}</span>
          </div>
        )}

        {/* Execution Times */}
        {data.lastExecutionTime && (
          <div className="text-xs text-gray-600">
            Last: {data.lastExecutionTime}
          </div>
        )}
        
        {data.nextExecutionTime && (
          <div className="text-xs text-gray-600">
            Next: {data.nextExecutionTime}
          </div>
        )}
      </div>

      {/* Tether-specific handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-orange-500 border-2 border-white"
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-orange-500 border-2 border-white"
      />

      {/* Context Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500 border-2 border-white"
        id="context"
      />
    </BaseNode>
  )
}
