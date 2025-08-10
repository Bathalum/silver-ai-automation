'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle, 
  AlertCircle, 
  Info,
  Layers,
  GitBranch,
  Eye,
  Shield
} from 'lucide-react'

interface WorkflowFooterProps {
  selectedNodeId?: string
  nodeCount: number
  edgeCount: number
  isDirty: boolean
  status: 'draft' | 'published' | 'archived' | 'running' | 'completed' | 'error'
  validationStatus?: 'valid' | 'warning' | 'error'
  contextAccessLevel?: 'public' | 'private' | 'restricted'
  className?: string
}

const validationConfig = {
  valid: { 
    label: 'Valid', 
    icon: <CheckCircle className="h-4 w-4 text-green-600" />, 
    color: 'text-green-600' 
  },
  warning: { 
    label: 'Warning', 
    icon: <AlertCircle className="h-4 w-4 text-yellow-600" />, 
    color: 'text-yellow-600' 
  },
  error: { 
    label: 'Error', 
    icon: <AlertCircle className="h-4 w-4 text-red-600" />, 
    color: 'text-red-600' 
  }
}

const contextAccessConfig = {
  public: { 
    label: 'Public', 
    icon: <Eye className="h-4 w-4 text-green-600" />, 
    color: 'text-green-600' 
  },
  private: { 
    label: 'Private', 
    icon: <Shield className="h-4 w-4 text-blue-600" />, 
    color: 'text-blue-600' 
  },
  restricted: { 
    label: 'Restricted', 
    icon: <Shield className="h-4 w-4 text-orange-600" />, 
    color: 'text-orange-600' 
  }
}

export function WorkflowFooter({
  selectedNodeId,
  nodeCount,
  edgeCount,
  isDirty,
  status,
  validationStatus = 'valid',
  contextAccessLevel = 'private',
  className = ''
}: WorkflowFooterProps) {
  const validationInfo = validationConfig[validationStatus]
  const contextInfo = contextAccessConfig[contextAccessLevel]

  return (
    <Card className={`border-t-0 rounded-none ${className}`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          {/* Left side - Selected node info */}
          <div className="flex items-center space-x-4">
            {selectedNodeId ? (
              <div className="flex items-center space-x-2">
                <Layers className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Selected:</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {selectedNodeId}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-gray-500">
                <Info className="h-4 w-4" />
                <span>No node selected</span>
              </div>
            )}
          </div>

          {/* Center - Workflow statistics */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{nodeCount} nodes</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <GitBranch className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{edgeCount} connections</span>
            </div>
          </div>

          {/* Right side - Status indicators */}
          <div className="flex items-center space-x-4">
            {/* Validation status */}
            <div className="flex items-center space-x-2">
              {validationInfo.icon}
              <span className={validationInfo.color}>
                {validationInfo.label}
              </span>
            </div>

            <Separator orientation="vertical" className="h-4" />

            {/* Context access level */}
            <div className="flex items-center space-x-2">
              {contextInfo.icon}
              <span className={contextInfo.color}>
                {contextInfo.label}
              </span>
            </div>

            <Separator orientation="vertical" className="h-4" />

            {/* Dirty state indicator */}
            {isDirty && (
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-600">Unsaved changes</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
