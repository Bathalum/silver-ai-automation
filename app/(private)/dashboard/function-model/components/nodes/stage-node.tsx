'use client'

import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { BaseNode, BaseNodeData } from './node-base'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Layers, Clock, GitBranch, PlayCircle } from 'lucide-react'

export interface StageNodeData extends BaseNodeData {
  executionMode: 'sequential' | 'parallel' | 'conditional'
  dependencies?: string[]
  actionCount: number
  estimatedDuration?: string
  retryPolicy?: {
    maxRetries: number
    retryDelay: string
  }
  position: { x: number; y: number }
}

interface StageNodeProps {
  data: StageNodeData
  selected?: boolean
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  onDuplicate?: (nodeId: string) => void
  onConfigure?: (nodeId: string) => void
  onAddAction?: (nodeId: string) => void
  onManageActions?: (nodeId: string) => void
}

export function StageNode({
  data,
  selected = false,
  onEdit,
  onDelete,
  onDuplicate,
  onConfigure,
  onAddAction,
  onManageActions
}: StageNodeProps) {
  const getExecutionModeColor = (mode: string) => {
    switch (mode) {
      case 'sequential': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'parallel': return 'bg-green-100 text-green-800 border-green-200'
      case 'conditional': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getExecutionModeIcon = (mode: string) => {
    switch (mode) {
      case 'sequential': return <PlayCircle className="h-3 w-3" />
      case 'parallel': return <GitBranch className="h-3 w-3" />
      case 'conditional': return <GitBranch className="h-3 w-3" />
      default: return <PlayCircle className="h-3 w-3" />
    }
  }

  return (
    <BaseNode
      data={data}
      selected={selected}
      className="w-[250px] h-[150px] border-l-4 border-l-blue-500"
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onConfigure={onConfigure}
    >
      <div className="space-y-2">
        {/* Execution Mode */}
        <div className="flex items-center gap-2">
          <Layers className="h-3 w-3 text-blue-600" />
          <Badge 
            variant="outline" 
            className={`text-xs ${getExecutionModeColor(data.executionMode)}`}
          >
            {getExecutionModeIcon(data.executionMode)}
            <span className="ml-1 capitalize">{data.executionMode}</span>
          </Badge>
        </div>

        <Separator />

        {/* Action Count */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">Actions:</span>
          <Badge variant="secondary" className="text-xs">
            {data.actionCount}
          </Badge>
          {onAddAction && (
            <button
              onClick={() => onAddAction(data.id)}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              + Add Action
            </button>
          )}
        </div>

        {/* Dependencies */}
        {data.dependencies && data.dependencies.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-700">Dependencies:</span>
            <div className="flex flex-wrap gap-1">
              {data.dependencies.slice(0, 3).map((dep, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {dep}
                </Badge>
              ))}
              {data.dependencies.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{data.dependencies.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Estimated Duration */}
        {data.estimatedDuration && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Est. Duration:</span>
            <span className="text-xs text-gray-600">{data.estimatedDuration}</span>
          </div>
        )}

        {/* Retry Policy */}
        {data.retryPolicy && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-700">Retry:</span>
            <Badge variant="outline" className="text-xs">
              {data.retryPolicy.maxRetries} × {data.retryPolicy.retryDelay}
            </Badge>
          </div>
        )}
      </div>

      {/* Stage-specific handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
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
