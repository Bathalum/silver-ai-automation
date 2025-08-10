'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  Home, 
  FolderOpen, 
  Clock,
  User,
  Calendar
} from 'lucide-react'

interface WorkflowHeaderProps {
  modelName: string
  version: string
  status: 'draft' | 'published' | 'archived' | 'running' | 'completed' | 'error'
  onBack?: () => void
  onHome?: () => void
  onOpen?: () => void
  lastModified?: string
  author?: string
  createdDate?: string
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

export function WorkflowHeader({
  modelName,
  version,
  status,
  onBack,
  onHome,
  onOpen,
  lastModified = 'Just now',
  author = 'Unknown',
  createdDate = 'Unknown',
  className = ''
}: WorkflowHeaderProps) {
  const statusInfo = statusConfig[status]

  return (
    <Card className={`border-b-0 rounded-none ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Left side - Navigation and title */}
          <div className="flex items-center space-x-4">
            {/* Navigation buttons */}
            <div className="flex items-center space-x-2">
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
              )}
              
              {onHome && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onHome}
                  className="flex items-center space-x-2"
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Button>
              )}
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Workflow title and version */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{modelName}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  v{version}
                </Badge>
                <Badge 
                  variant={statusInfo.variant}
                  className={statusInfo.color}
                >
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Right side - Metadata and actions */}
          <div className="flex items-center space-x-6">
            {/* Metadata */}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span>{author}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{createdDate}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Modified {lastModified}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              {onOpen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpen}
                  className="flex items-center space-x-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span>Open</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
