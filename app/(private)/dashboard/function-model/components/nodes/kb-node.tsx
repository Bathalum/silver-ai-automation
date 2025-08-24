'use client'

import React, { useState, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import { BaseNode, BaseNodeData } from './node-base'
import { KBNodeHeader } from './kb-node/kb-node-header'
import { KBNodeBody } from './kb-node/kb-node-body'
import { KBNodeControls } from './kb-node/kb-node-controls'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Database, Users, Clock, AlertTriangle, CheckCircle, Circle } from 'lucide-react'
import { useWorkflowUIState } from '@/app/hooks/use-workflow-ui-state'
import { useExecutionUIState } from '@/app/hooks/use-execution-ui-state'

export interface KBNodeData extends BaseNodeData {
  // Unified status interface
  status: 'idle' | 'loading' | 'ready' | 'error'
  // Knowledge base specific properties
  sources: string[]
  lastUpdated: string
  author: string
  documentCount: number
  isIndexing: boolean
  indexingProgress: number
  // Legacy properties for backward compatibility
  raci?: {
    responsible: string
    accountable: string
    consulted: string
    informed: string
  }
  position: { x: number; y: number }
}

interface KBNodeProps {
  data: KBNodeData
  selected?: boolean
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  onDuplicate?: (nodeId: string) => void
  onConfigure?: (nodeId: string) => void
  onExecute?: (nodeId: string) => void
  onStop?: (nodeId: string) => void
  onViewLogs?: (nodeId: string) => void
}

export function KBNode({
  data,
  selected = false,
  onEdit,
  onDelete,
  onDuplicate,
  onConfigure,
  onExecute,
  onStop,
  onViewLogs
}: KBNodeProps) {
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
  const [localIndexingProgress, setLocalIndexingProgress] = useState(data.indexingProgress || 0)
  const [localIsIndexing, setLocalIsIndexing] = useState(data.isIndexing || false)
  const [localDocumentCount, setLocalDocumentCount] = useState(data.documentCount || 0)

  // Convert legacy status to new status if needed
  const getStatus = (): 'idle' | 'loading' | 'ready' | 'error' => {
    if (data.status) return data.status
    
    // Default to ready if no status specified
    return 'ready'
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
      
      // Simulate indexing process
      setLocalIsIndexing(true)
      setLocalIndexingProgress(0)
      
      const interval = setInterval(() => {
        setLocalIndexingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setLocalIsIndexing(false)
            setLocalDocumentCount(prev => prev + 10) // Simulate new documents
            updateStepStatus(data.id, 'completed')
            return 100
          }
          return prev + 5
        })
      }, 300)
    }
  }, [data.id, onExecute, startExecution, updateStepStatus])

  const handleStop = useCallback(() => {
    if (onStop) {
      onStop(data.id)
    } else {
      // Use execution state management if no external handler
      stopExecution()
      updateStepStatus(data.id, 'failed')
      setLocalIsIndexing(false)
      setLocalIndexingProgress(0)
    }
  }, [data.id, onStop, stopExecution, updateStepStatus])

  const handleConfigure = useCallback(() => {
    if (onConfigure) onConfigure(data.id)
  }, [data.id, onConfigure])

  // Data management handlers
  const handleRefresh = useCallback(() => {
    // Refresh knowledge base data
    setLocalDocumentCount(prev => Math.max(0, prev - 1)) // Simulate refresh
  }, [])

  const handleSearch = useCallback(() => {
    // Implement search functionality
    console.log('Searching knowledge base:', data.id)
  }, [data.id])

  const handleUpload = useCallback(() => {
    // Simulate document upload
    setLocalDocumentCount(prev => prev + 1)
    setLocalIsIndexing(true)
    setLocalIndexingProgress(0)
    
    const interval = setInterval(() => {
      setLocalIndexingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setLocalIsIndexing(false)
          return 100
        }
        return prev + 20
      })
    }, 200)
  }, [])

  const handleDownload = useCallback(() => {
    // Implement download functionality
    console.log('Downloading from knowledge base:', data.id)
  }, [data.id])

  // Update local state when data changes
  React.useEffect(() => {
    setLocalIndexingProgress(data.indexingProgress || 0)
    setLocalIsIndexing(data.isIndexing || false)
    setLocalDocumentCount(data.documentCount || 0)
  }, [data.indexingProgress, data.isIndexing, data.documentCount])

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'archived': return 'bg-gray-400 text-gray-800 border-gray-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getExecutionStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Circle className="h-3 w-3" />
      case 'active': return <CheckCircle className="h-3 w-3" />
      case 'inactive': return <Clock className="h-3 w-3" />
      case 'archived': return <Circle className="h-3 w-3" />
      case 'error': return <AlertTriangle className="h-3 w-3" />
      default: return <Circle className="h-3 w-3" />
    }
  }

  const getRaciSummary = () => {
    if (!data.raci) return 'Not assigned'
    
    const { responsible, accountable } = data.raci
    if (responsible && accountable) {
      return `${responsible} / ${accountable}`
    } else if (responsible) {
      return responsible
    } else if (accountable) {
      return accountable
    }
    return 'Not assigned'
  }

  return (
    <BaseNode
      data={data}
      selected={selected}
      className="w-[280px] border-l-4 border-l-green-500"
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onConfigure={onConfigure}
      onExecute={onExecute}
      onStop={onStop}
      onViewLogs={onViewLogs}
      onClick={handleNodeClick}
    >
      {/* KB Node Header */}
      <KBNodeHeader
        title={data.name || 'KB Node'}
        status={getStatus()}
        isSelected={selected || isNodeSelected(data.id)}
        knowledgeBaseCount={localDocumentCount}
      />

      {/* KB Node Body */}
      <KBNodeBody
        description={data.description || ''}
        sources={data.sources || []}
        lastUpdated={data.lastUpdated || ''}
        author={data.author || ''}
        documentCount={localDocumentCount}
        isIndexing={localIsIndexing}
        indexingProgress={localIndexingProgress}
      />

      {/* KB Node Controls */}
      <KBNodeControls
        isIndexing={localIsIndexing}
        isSearching={false}
        canRefresh={true}
        canUpload={true}
        canDownload={true}
        onRefresh={handleRefresh}
        onSearch={handleSearch}
        onUpload={handleUpload}
        onDownload={handleDownload}
        onSettings={handleConfigure}
        onPlay={handleExecute}
        onPause={handleStop}
        onStop={handleStop}
      />

      {/* Legacy display for backward compatibility */}
      {data.raci && (
        <>
          <Separator />
          <div className="space-y-2 p-2">
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 text-blue-600" />
              <Badge 
                variant="outline" 
                className="bg-blue-100 text-blue-800 border-blue-300 text-xs font-medium px-2 py-1"
                title={`R: ${data.raci.responsible || 'Not assigned'}\nA: ${data.raci.accountable || 'Not assigned'}\nC: ${data.raci.consulted || 'Not assigned'}\nI: ${data.raci.informed || 'Not assigned'}`}
              >
                <Users className="h-3 w-3 mr-1" />
                {getRaciSummary()}
              </Badge>
            </div>
          </div>
        </>
      )}

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
