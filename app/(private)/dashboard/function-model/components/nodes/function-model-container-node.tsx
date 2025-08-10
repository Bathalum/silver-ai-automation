'use client'

import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { BaseNode, BaseNodeData } from './node-base'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Box, Layers, Settings, ExternalLink, ArrowRight } from 'lucide-react'

export interface FunctionModelContainerNodeData extends BaseNodeData {
  nestedModelId: string
  nestedModelName: string
  contextMapping: Record<string, string>
  executionPolicy: 'inherit' | 'override' | 'isolated'
  nestingLevel: number
  position: { x: number; y: number }
}

interface FunctionModelContainerNodeProps {
  data: FunctionModelContainerNodeData
  selected?: boolean
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  onDuplicate?: (nodeId: string) => void
  onConfigure?: (nodeId: string) => void
  onOpenModel?: (nodeId: string) => void
  onManageContext?: (nodeId: string) => void
}

export function FunctionModelContainerNode({
  data,
  selected = false,
  onEdit,
  onDelete,
  onDuplicate,
  onConfigure,
  onOpenModel,
  onManageContext
}: FunctionModelContainerNodeProps) {
  const getExecutionPolicyColor = (policy: string) => {
    switch (policy) {
      case 'inherit': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'override': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'isolated': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <BaseNode
      data={data}
      selected={selected}
      className="w-[200px] h-[120px] border-l-4 border-l-blue-500 border-2 border-dashed border-blue-300 bg-blue-50/30"
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onConfigure={onConfigure}
    >
      <div className="space-y-2">
        {/* Container Type Badge */}
        <div className="flex items-center gap-2">
          <Box className="h-3 w-3 text-blue-600" />
          <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
            Container
          </Badge>
          <Badge variant="outline" className="text-xs bg-indigo-100 text-indigo-800 border-indigo-200">
            L{data.nestingLevel}
          </Badge>
        </div>

        <Separator />

        {/* Nested Model */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-3 w-3 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Model:</span>
            {onOpenModel && (
              <button
                onClick={() => onOpenModel(data.id)}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-2 w-2" />
                {data.nestedModelName}
              </button>
            )}
          </div>
          <div className="text-xs text-gray-600 bg-white p-1 rounded border truncate">
            {data.nestedModelId}
          </div>
        </div>

        {/* Execution Policy */}
        <div className="flex items-center gap-2">
          <Settings className="h-3 w-3 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Policy:</span>
          <Badge variant="outline" className={`text-xs ${getExecutionPolicyColor(data.executionPolicy)}`}>
            {data.executionPolicy}
          </Badge>
        </div>

        {/* Context Mapping */}
        {Object.keys(data.contextMapping).length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">Context:</span>
              {onManageContext && (
                <button
                  onClick={() => onManageContext(data.id)}
                  className="text-xs text-purple-600 hover:text-purple-800 hover:underline"
                >
                  Manage
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(data.contextMapping).slice(0, 2).map(([key, value], index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {key} <ArrowRight className="h-2 w-2 inline mx-1" /> {value}
                </Badge>
              ))}
              {Object.keys(data.contextMapping).length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{Object.keys(data.contextMapping).length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Container-specific handles */}
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
