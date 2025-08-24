'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Layers,
  GitBranch,
  Shield,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  NodeDisplayModel, 
  WorkflowStatsDisplayModel, 
  ValidationDisplayModel,
  ContextAccessDisplayModel 
} from '@/app/use-cases/ui-models/workflow-display-models'

interface WorkflowStatusBarProps {
  selectedNode?: NodeDisplayModel
  workflowStats: WorkflowStatsDisplayModel
  validationStatus: ValidationDisplayModel
  contextAccess: ContextAccessDisplayModel
  className?: string
}

export function WorkflowStatusBar({
  selectedNode,
  workflowStats,
  validationStatus,
  contextAccess,
  className
}: WorkflowStatusBarProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getExecutionModeIcon = (mode: string) => {
    switch (mode) {
      case 'sequential': return <Clock className="h-3 w-3" />
      case 'parallel': return <GitBranch className="h-3 w-3" />
      case 'conditional': return <GitBranch className="h-3 w-3" />
      case 'mixed': return <Layers className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  const getContextAccessColor = (level: string) => {
    switch (level) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'write': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'read': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  return (
    <Card className={cn(
      "flex items-center justify-between px-4 py-2 bg-background/95 backdrop-blur",
      "border-t shadow-sm",
      className
    )}>
      {/* Left Section - Selected Node Info */}
      <div className="flex items-center space-x-4 min-w-0 flex-1">
        {selectedNode ? (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Selected:</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Node
            </Badge>
            <span className="text-sm text-gray-900 font-medium truncate max-w-32">
              {selectedNode.displayName}
            </span>
            <Badge 
              variant="outline" 
              className={`text-xs ${selectedNode.statusColor}`}
            >
              {selectedNode.statusText}
            </Badge>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-gray-500">
            <Info className="h-4 w-4" />
            <span className="text-sm">No node selected</span>
          </div>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Center Section - Workflow Statistics */}
      <div className="flex items-center space-x-6">
        {/* Node Count */}
        <div className="flex items-center space-x-2">
          <Layers className="h-4 w-4 text-gray-600" />
          <div className="flex items-center space-x-1 text-sm">
            <span className="font-medium text-gray-900">{workflowStats.totalNodes}</span>
            <span className="text-gray-500">nodes</span>
            <span className="text-gray-400">
              ({workflowStats.containerNodes}c, {workflowStats.actionNodes}a)
            </span>
          </div>
        </div>

        {/* Execution Mode */}
        <div className="flex items-center space-x-2">
          <Badge 
            variant="outline" 
            className="text-xs bg-blue-50 text-blue-700 border-blue-200"
          >
            {workflowStats.executionModeIcon}
            <span className="ml-1 capitalize">{workflowStats.executionModeText}</span>
          </Badge>
        </div>

        {/* Estimated Duration */}
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-600" />
          <span className="text-sm text-gray-700">
            Est. {workflowStats.durationText}
          </span>
        </div>

        {/* Progress */}
        {(workflowStats.completedNodes > 0 || workflowStats.failedNodes > 0) && (
          <div className="flex items-center space-x-1 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-green-600">{workflowStats.completedNodes}</span>
            {workflowStats.failedNodes > 0 && (
              <>
                <span className="text-gray-400">/</span>
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-red-600">{workflowStats.failedNodes}</span>
              </>
            )}
          </div>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Right Section - Validation & Context */}
      <div className="flex items-center space-x-4 min-w-0">
        {/* Validation Status */}
        <div className="flex items-center space-x-2">
          {validationStatus.isValid ? (
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Valid</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="flex items-center space-x-1 text-sm">
                {validationStatus.errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs h-5">
                    {validationStatus.errorCount} errors
                  </Badge>
                )}
                {validationStatus.warningCount > 0 && (
                  <Badge variant="outline" className="text-xs h-5 border-yellow-300 text-yellow-700 bg-yellow-50">
                    {validationStatus.warningCount} warnings
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Context Access Level */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Shield className="h-4 w-4 text-gray-600" />
            <Badge 
              variant="outline" 
              className={`text-xs ${contextAccess.accessLevelColor}`}
            >
              <Eye className="h-3 w-3 mr-1" />
              {contextAccess.accessLevel}
            </Badge>
          </div>
          {contextAccess.availableContextCount > 0 && (
            <span className="text-xs text-gray-500">
              {contextAccess.activeSharing}/{contextAccess.availableContextCount} contexts
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}