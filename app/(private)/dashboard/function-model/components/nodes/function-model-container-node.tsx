'use client'

import React, { useState, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import { BaseNode, BaseNodeData } from './node-base'
import { FunctionModelContainerNodeHeader } from './function-model-container-node/function-model-container-node-header'
import { FunctionModelContainerNodeBody } from './function-model-container-node/function-model-container-node-body'
import { FunctionModelContainerNodeControls } from './function-model-container-node/function-model-container-node-controls'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Box, Layers, Settings, Clock, User, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'
import { useWorkflowUIState } from '@/app/hooks/use-workflow-ui-state'
import { useExecutionUIState } from '@/app/hooks/use-execution-ui-state'

export interface FunctionModelContainerNodeData extends BaseNodeData {
  // Unified status interface
  status: 'idle' | 'running' | 'completed' | 'error'
  // Container specific properties
  containerType: string
  lastUpdated: string
  owner: string
  isExpanded: boolean
  executionProgress: number
  isExecuting: boolean
  // Model information
  models: Array<{
    id: string
    name: string
    status: 'idle' | 'running' | 'completed' | 'error'
    type: string
    lastExecuted: string
  }>
  // Legacy properties for backward compatibility
  executionStatus?: 'pending' | 'running' | 'completed' | 'failed' | 'retrying'
  estimatedDuration?: string
  retryCount?: number
  maxRetries?: number
  position: { x: number; y: number }
}

interface FunctionModelContainerNodeProps {
  data: FunctionModelContainerNodeData
  selected?: boolean
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  onDuplicate?: (nodeId: string) => void
  onConfigure?: (nodeId: string) => void
  onExecute?: (nodeId: string) => void
  onStop?: (nodeId: string) => void
  onViewLogs?: (nodeId: string) => void
}

export function FunctionModelContainerNode({
  data,
  selected = false,
  onEdit,
  onDelete,
  onDuplicate,
  onConfigure,
  onExecute,
  onStop,
  onViewLogs
}: FunctionModelContainerNodeProps) {
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
  const [localExecutionProgress, setLocalExecutionProgress] = useState(data.executionProgress || 0)
  const [localIsExecuting, setLocalIsExecuting] = useState(data.isExecuting || false)
  const [localIsExpanded, setLocalIsExpanded] = useState(data.isExpanded || false)
  const [localModels, setLocalModels] = useState(data.models || [])

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
      
      // Simulate execution progress
      setLocalIsExecuting(true)
      setLocalExecutionProgress(0)
      
      const interval = setInterval(() => {
        setLocalExecutionProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setLocalIsExecuting(false)
            updateStepStatus(data.id, 'completed')
            return 100
          }
          return prev + 15
        })
      }, 400)
    }
  }, [data.id, onExecute, startExecution, updateStepStatus])

  const handleStop = useCallback(() => {
    if (onStop) {
      onStop(data.id)
    } else {
      // Use execution state management if no external handler
      stopExecution()
      updateStepStatus(data.id, 'failed')
      setLocalIsExecuting(false)
      setLocalExecutionProgress(0)
    }
  }, [data.id, onStop, stopExecution, updateStepStatus])

  const handleConfigure = useCallback(() => {
    if (onConfigure) onConfigure(data.id)
  }, [data.id, onConfigure])

  // Container management handlers
  const handleToggleExpand = useCallback(() => {
    setLocalIsExpanded(prev => !prev)
  }, [])

  const handleAddModel = useCallback(() => {
    // Simulate adding a new model
    const newModel = {
      id: `model-${Date.now()}`,
      name: `New Model ${localModels.length + 1}`,
      status: 'idle' as const,
      type: 'Standard',
      lastExecuted: 'Never'
    }
    setLocalModels(prev => [...prev, newModel])
  }, [localModels.length])

  const handleDelete = useCallback(() => {
    if (onDelete) onDelete(data.id)
  }, [data.id, onDelete])

  const handleCopy = useCallback(() => {
    if (onDuplicate) onDuplicate(data.id)
  }, [data.id, onDuplicate])

  const handleRefresh = useCallback(() => {
    // Refresh container data
    setLocalExecutionProgress(0)
    setLocalIsExecuting(false)
  }, [])

  // Update local state when data changes
  React.useEffect(() => {
    setLocalExecutionProgress(data.executionProgress || 0)
    setLocalIsExecuting(data.isExecuting || false)
    setLocalIsExpanded(data.isExpanded || false)
    setLocalModels(data.models || [])
  }, [data.executionProgress, data.isExecuting, data.isExpanded, data.models])

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
      case 'running': return <Clock className="h-3 w-3" />
      case 'completed': return <CheckCircle className="h-3 w-3" />
      case 'failed': return <AlertCircle className="h-3 w-3" />
      case 'retrying': return <Clock className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  return (
    <BaseNode
      data={data}
      selected={selected}
      className="w-[320px] border-l-4 border-l-emerald-500"
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onConfigure={onConfigure}
      onExecute={onExecute}
      onStop={onStop}
      onViewLogs={onViewLogs}
      onClick={handleNodeClick}
    >
      {/* Function Model Container Node Header */}
      <FunctionModelContainerNodeHeader
        title={data.name || 'Function Model Container'}
        status={getStatus()}
        isSelected={selected || isNodeSelected(data.id)}
        modelCount={localModels.length}
        isExpanded={localIsExpanded}
      />

      {/* Function Model Container Node Body */}
      <FunctionModelContainerNodeBody
        description={data.description || ''}
        models={localModels}
        containerType={data.containerType || 'Standard'}
        lastUpdated={data.lastUpdated || ''}
        owner={data.owner || ''}
        isExpanded={localIsExpanded}
        executionProgress={localExecutionProgress}
        isExecuting={localIsExecuting}
      />

      {/* Function Model Container Node Controls */}
      <FunctionModelContainerNodeControls
        isExecuting={localIsExecuting}
        isExpanded={localIsExpanded}
        canAddModel={true}
        canDelete={true}
        canCopy={true}
        onPlay={handleExecute}
        onPause={handleStop}
        onStop={handleStop}
        onToggleExpand={handleToggleExpand}
        onSettings={handleConfigure}
        onAddModel={handleAddModel}
        onDelete={handleDelete}
        onCopy={handleCopy}
        onRefresh={handleRefresh}
      />

      {/* Legacy display for backward compatibility */}
      {data.executionStatus && (
        <>
          <Separator />
          <div className="space-y-2 p-2">
            <div className="flex items-center gap-2">
              <Layers className="h-3 w-3 text-emerald-600" />
              <Badge 
                variant="outline" 
                className={`text-xs ${getExecutionStatusColor(data.executionStatus)}`}
              >
                {getExecutionStatusIcon(data.executionStatus)}
                <span className="ml-1 capitalize">{data.executionStatus}</span>
              </Badge>
            </div>

            {data.estimatedDuration && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-700">Est. Duration:</span>
                <span className="text-xs text-gray-600">{data.estimatedDuration}</span>
              </div>
            )}

            {data.retryCount !== undefined && data.maxRetries !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">Retry:</span>
                <Badge variant="secondary" className="text-xs">
                  {data.retryCount}/{data.maxRetries}
                </Badge>
              </div>
            )}
          </div>
        </>
      )}

      {/* Container-specific handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-emerald-500 border-2 border-white"
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-emerald-500 border-2 border-white"
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
