'use client'

import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { BaseNode, BaseNodeData } from './node-base'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BookOpen, Users, FileText, ExternalLink } from 'lucide-react'

export interface KBNodeData extends BaseNodeData {
  kbReference: string
  raci: {
    responsible: string
    accountable: string
    consulted: string
    informed: string
  }
  documentationContext?: string
  knowledgeDomain?: string
  lastUpdated?: string
  version?: string
  position: { x: number; y: number }
}

interface KBNodeProps {
  data: KBNodeData
  selected?: boolean
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  onDuplicate?: (nodeId: string) => void
  onConfigure?: (nodeId: string) => void
  onViewKB?: (nodeId: string) => void
  onEditRACI?: (nodeId: string) => void
}

export function KBNode({
  data,
  selected = false,
  onEdit,
  onDelete,
  onDuplicate,
  onConfigure,
  onViewKB,
  onEditRACI
}: KBNodeProps) {
  return (
    <BaseNode
      data={data}
      selected={selected}
      className="w-[180px] h-[100px] border-l-4 border-l-green-500"
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onConfigure={onConfigure}
    >
      <div className="space-y-2">
        {/* KB Reference */}
        <div className="flex items-center gap-2">
          <BookOpen className="h-3 w-3 text-green-600" />
          <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
            KB
          </Badge>
          {onViewKB && (
            <button
              onClick={() => onViewKB(data.id)}
              className="text-xs text-green-600 hover:text-green-800 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-2 w-2" />
              View
            </button>
          )}
        </div>

        <Separator />

        {/* KB Reference */}
        <div className="text-xs text-gray-600 bg-gray-50 p-1 rounded border truncate">
          {data.kbReference}
        </div>

        {/* Knowledge Domain */}
        {data.knowledgeDomain && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-700">Domain:</span>
            <Badge variant="secondary" className="text-xs">
              {data.knowledgeDomain}
            </Badge>
          </div>
        )}

        {/* RACI Badge with Edit */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
            RACI
          </Badge>
          {onEditRACI && (
            <button
              onClick={() => onEditRACI(data.id)}
              className="text-xs text-purple-600 hover:text-purple-800 hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {/* Version and Last Updated */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {data.version && <span>v{data.version}</span>}
          {data.lastUpdated && <span>• {data.lastUpdated}</span>}
        </div>
      </div>

      {/* KB-specific handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-green-500 border-2 border-white"
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-500 border-2 border-white"
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
