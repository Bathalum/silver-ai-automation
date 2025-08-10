'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Save, 
  Send, 
  Archive, 
  Settings, 
  Share2, 
  History,
  Eye,
  Play
} from 'lucide-react'

interface WorkflowToolbarProps {
  modelName: string
  version: string
  status: 'draft' | 'published' | 'archived' | 'running' | 'completed' | 'error'
  onSave?: () => void
  onPublish?: () => void
  onArchive?: () => void
  onSettings?: () => void
  onShare?: () => void
  onHistory?: () => void
  onPreview?: () => void
  onRun?: () => void
  isDirty?: boolean
  isRunning?: boolean
  className?: string
}

const statusConfig = {
  draft: { label: 'Draft', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
  published: { label: 'Published', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
  archived: { label: 'Archived', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-600' },
  running: { label: 'Running', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
  error: { label: 'Error', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' }
}

export function WorkflowToolbar({
  modelName,
  version,
  status,
  onSave,
  onPublish,
  onArchive,
  onSettings,
  onShare,
  onHistory,
  onPreview,
  onRun,
  isDirty = false,
  isRunning = false,
  className = ''
}: WorkflowToolbarProps) {
  const statusInfo = statusConfig[status]

  return (
    <Card className={`p-4 border-b ${className}`}>
      <div className="flex items-center justify-between">
        {/* Left side - Model info */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{modelName}</h1>
            <p className="text-sm text-gray-500">Version {version}</p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <Badge 
            variant={statusInfo.variant}
            className={statusInfo.color}
          >
            {statusInfo.label}
          </Badge>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center space-x-2">
          {/* View/Preview buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            className="flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </Button>

          {/* Run button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRun}
            disabled={isRunning}
            className="flex items-center space-x-2"
          >
            <Play className="h-4 w-4" />
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Save button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={!isDirty}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </Button>

          {/* Publish button */}
          <Button
            variant="default"
            size="sm"
            onClick={onPublish}
            disabled={status === 'published' || status === 'archived'}
            className="flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>Publish</span>
          </Button>

          {/* Archive button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onArchive}
            disabled={status === 'archived'}
            className="flex items-center space-x-2"
          >
            <Archive className="h-4 w-4" />
            <span>Archive</span>
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Utility buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onShare}
            className="flex items-center space-x-2"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onHistory}
            className="flex items-center space-x-2"
          >
            <History className="h-4 w-4" />
            <span>History</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onSettings}
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}
