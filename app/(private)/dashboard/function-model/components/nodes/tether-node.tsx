'use client'

import React, { useState, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import { BaseNode, BaseNodeData } from './node-base'
import { TetherNodeHeader } from './tether-node/tether-node-header'
import { TetherNodeBody } from './tether-node/tether-node-body'
import { TetherNodeControls } from './tether-node/tether-node-controls'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Link, Clock, RotateCcw, PlayCircle } from 'lucide-react'
import { useWorkflowUIState } from '@/app/hooks/use-workflow-ui-state'
import { useExecutionUIState } from '@/app/hooks/use-execution-ui-state'

export interface TetherNodeData extends BaseNodeData {
  // Unified status interface
  status: 'idle' | 'running' | 'completed' | 'error'
  // Execution details
  targetNode: string
  executionTime: number
  progress: number
  isExecuting: boolean
  // Legacy properties for backward compatibility
  executionStatus?: 'pending' | 'running' | 'completed' | 'failed' | 'retrying'
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
  // State management hooks
  const { selectNode, isNodeSelected } = useWorkflowUIState()
  const { 
    startExecution, 
    pauseExecution, 
    stopExecution, 
    updateStepStatus,
    getStepById,
    isStepCompleted,
    isStepFailed
  } = useExecutionUIState()

  // Local state for node-specific interactions
  const [showControls, setShowControls] = useState(false)
  const [localProgress, setLocalProgress] = useState(data.progress || 0)
  const [localExecutionTime, setLocalExecutionTime] = useState(data.executionTime || 0)

  // Convert legacy executionStatus to new status if needed
  const getStatus = (): 'idle' | 'running' | 'completed' | 'error' => {
    if (data.status) return data.status
    
    // Legacy conversion
    switch (data.executionStatus) {
      case 'pending': return 'idle'
      case 'running': return 'running'
      case 'completed': return 'completed'
      case 'failed': return 'error'
      case 'retrying': return 'running'
      default: return 'idle'
    }
  }

  // Node selection handling
  const handleNodeClick = useCallback(() => {
    selectNode(data.id, false)
  }, [data.id, selectNode])

  // Execution control handlers
  const handleExecute = useCallback(() => {
    if (onExecute) {
      onExecute(data.id)
    } else {
      // Use execution state management if no external handler
      startExecution(`workflow-${data.id}`)
      updateStepStatus(data.id, 'running')
      
      // Simulate progress updates
      const interval = setInterval(() => {
        setLocalProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            updateStepStatus(data.id, 'completed')
            return 100
          }
          return prev + 10
        })
      }, 500)
    }
  }, [data.id, onExecute, startExecution, updateStepStatus])

  const handleStop = useCallback(() => {
    if (onStop) {
      onStop(data.id)
    } else {
      // Use execution state management if no external handler
      stopExecution()
      updateStepStatus(data.id, 'failed')
      setLocalProgress(0)
    }
  }, [data.id, onStop, stopExecution, updateStepStatus])

  const handleConfigure = useCallback(() => {
    if (onConfigure) onConfigure(data.id)
  }, [data.id, onConfigure])

  // Update local state when data changes
  React.useEffect(() => {
    setLocalProgress(data.progress || 0)
    setLocalExecutionTime(data.executionTime || 0)
  }, [data.progress, data.executionTime])

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
      className="w-[280px] border-l-4 border-l-orange-500"
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onConfigure={onConfigure}
      onExecute={onExecute}
      onStop={onStop}
      onViewLogs={onViewLogs}
      onClick={handleNodeClick}
    >
      {/* Tether Node Header */}
      <TetherNodeHeader
        title={data.name || 'Tether Node'}
        status={getStatus()}
        isSelected={selected || isNodeSelected(data.id)}
      />

      {/* Tether Node Body */}
      <TetherNodeBody
        description={data.description || ''}
        targetNode={data.targetNode || ''}
        executionTime={localExecutionTime}
        progress={localProgress}
        isExecuting={data.isExecuting || getStatus() === 'running'}
      />

      {/* Tether Node Controls */}
      <TetherNodeControls
        isExecuting={data.isExecuting || getStatus() === 'running'}
        isSearching={false}
        canRefresh={true}
        canUpload={false}
        canDownload={false}
        onRefresh={() => {
          // Refresh node data
          setLocalProgress(0)
          setLocalExecutionTime(0)
        }}
        onSearch={() => {}}
        onUpload={() => {}}
        onDownload={() => {}}
        onSettings={handleConfigure}
        onPlay={handleExecute}
        onPause={handleStop}
        onStop={handleStop}
      />

      {/* Legacy display for backward compatibility */}
      {data.executionStatus && (
        <>
          <Separator />
          <div className="space-y-2 p-2">
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

            <div className="flex items-center gap-2">
              <RotateCcw className="h-3 w-3 text-gray-500" />
              <span className="text-xs font-medium text-gray-700">Retry:</span>
              <Badge variant="secondary" className="text-xs">
                {data.retryCount}/{data.maxRetries}
              </Badge>
            </div>

            {data.estimatedDuration && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-700">Est. Duration:</span>
                <span className="text-xs text-gray-600">{data.estimatedDuration}</span>
              </div>
            )}

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
        </>
      )}

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
