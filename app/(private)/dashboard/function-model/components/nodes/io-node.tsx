'use client'

import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { BaseNode, BaseNodeData } from './node-base'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input, Output, Database } from 'lucide-react'

export interface IONodeData extends BaseNodeData {
  ioType: 'input' | 'output'
  dataContract?: string
  dataType?: string
  isRequired?: boolean
  defaultValue?: string
  validationRules?: string[]
  position: { x: number; y: number }
}

interface IONodeProps {
  data: IONodeData
  selected?: boolean
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  onDuplicate?: (nodeId: string) => void
  onConfigure?: (nodeId: string) => void
}

export function IONode({
  data,
  selected = false,
  onEdit,
  onDelete,
  onDuplicate,
  onConfigure
}: IONodeProps) {
  const isInput = data.ioType === 'input'
  
  return (
    <BaseNode
      data={data}
      selected={selected}
      className={`w-[200px] h-[120px] ${isInput ? 'border-l-4 border-l-purple-500' : 'border-l-4 border-l-green-500'}`}
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onConfigure={onConfigure}
    >
      <div className="space-y-2">
        {/* IO Type Badge */}
        <div className="flex items-center gap-2">
          {isInput ? (
            <Input className="h-3 w-3 text-purple-600" />
          ) : (
            <Output className="h-3 w-3 text-green-600" />
          )}
          <Badge 
            variant="outline" 
            className={`text-xs ${isInput ? 'border-purple-200 text-purple-700 bg-purple-50' : 'border-green-200 text-green-700 bg-green-50'}`}
          >
            {isInput ? 'Input' : 'Output'}
          </Badge>
          {data.isRequired && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
        </div>

        <Separator />

        {/* Data Contract */}
        {data.dataContract && (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3 text-gray-500" />
              <span className="text-xs font-medium text-gray-700">Data Contract</span>
            </div>
            <p className="text-xs text-gray-600 bg-gray-50 p-1 rounded border">
              {data.dataContract}
            </p>
          </div>
        )}

        {/* Data Type */}
        {data.dataType && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-700">Type:</span>
            <Badge variant="secondary" className="text-xs">
              {data.dataType}
            </Badge>
          </div>
        )}

        {/* Default Value */}
        {data.defaultValue && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-700">Default:</span>
            <span className="text-xs text-gray-600 bg-gray-50 px-1 py-0.5 rounded border">
              {data.defaultValue}
            </span>
          </div>
        )}
      </div>

      {/* IO-specific handles */}
      {isInput ? (
        // Input node only has output handle
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 bg-green-500 border-2 border-white"
        />
      ) : (
        // Output node only has input handle
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 bg-purple-500 border-2 border-white"
        />
      )}
    </BaseNode>
  )
}
