'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Settings, Activity, Copy, Trash2, ChevronRight, Dot } from 'lucide-react'
import { NodeTypeIndicator } from './node-type-indicator'
import { StatusIndicator } from './status-indicator'
import { generatePerformanceData, formatLastModified, getModelCategory, analyzeConnections } from '@/lib/utils/performance-data'
import type { FunctionModel } from '@/lib/domain/entities/function-model-types'

interface FunctionModelTableRowProps {
  model: FunctionModel
  onEdit: (modelId: string) => void
  onDelete: (modelId: string) => void
  onDuplicate: (modelId: string) => void
  isAlternate?: boolean
}

export function FunctionModelTableRow({
  model,
  onEdit,
  onDelete,
  onDuplicate,
  isAlternate = false
}: FunctionModelTableRowProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Generate performance data for this model
  const { nodeTypes, performance, stats } = generatePerformanceData(model)
  const category = getModelCategory(model)
  const lastModified = formatLastModified(model.lastSavedAt)
  
  // NEW: Analyze actual connections
  const connectionAnalysis = analyzeConnections(model.edgesData)
  const actualConnections = model.edgesData?.length || 0

  return (
    <div
      className={`border-b border-border px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer ${
        isAlternate ? 'bg-muted/20' : 'bg-background'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onEdit(model.modelId)}
    >
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Model Info */}
        <div className="col-span-4">
          <div className="flex items-center gap-3">
            <StatusIndicator status={model.status} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate">{model.name}</h3>
                <span className="text-xs text-muted-foreground">#{model.modelId.slice(0, 8)}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{model.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{category}</span>
                <Dot className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Modified {lastModified}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Node Flow */}
        <div className="col-span-3">
          <div className="flex items-center gap-1 overflow-hidden">
            {nodeTypes.slice(0, 6).map((nodeType, idx) => (
              <div key={`${nodeType}-${idx}`} className="flex items-center gap-1 flex-shrink-0">
                <NodeTypeIndicator type={nodeType} size="sm" />
                {idx < Math.min(nodeTypes.length - 1, 5) && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            ))}
            {nodeTypes.length > 6 && (
              <span className="text-xs text-muted-foreground ml-1">+{nodeTypes.length - 6}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {model.nodesData?.length || 0} nodes • {actualConnections} connections
            {connectionAnalysis.complexity !== 'low' && (
              <span className={`ml-1 px-1 py-0.5 rounded text-xs ${
                connectionAnalysis.complexity === 'high' 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {connectionAnalysis.complexity}
              </span>
            )}
          </div>
        </div>

        {/* Performance */}
        <div className="col-span-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Success:</span>
              <span className="text-xs font-mono text-green-600">{performance.successRate}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Runtime:</span>
              <span className="text-xs font-mono text-blue-600">{performance.avgRuntime}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="col-span-2">
          <div className="text-xs">
            <div className="font-mono text-foreground">{stats.executions.toLocaleString()}</div>
            <div className="text-muted-foreground">executions</div>
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-1 flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(model.modelId)
                }}
                className="text-xs"
              >
                <Settings className="w-3 h-3 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  // TODO: Implement monitor functionality
                }}
                className="text-xs"
              >
                <Activity className="w-3 h-3 mr-2" />
                Monitor
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicate(model.modelId)
                }}
                className="text-xs"
              >
                <Copy className="w-3 h-3 mr-2" />
                Clone
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(model.modelId)
                }}
                className="text-red-600 hover:text-red-700 text-xs"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
} 