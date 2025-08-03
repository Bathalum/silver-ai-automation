'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Save, Link, Settings } from 'lucide-react'

interface FloatingToolbarProps {
  onAddStage: () => void
  onAddAction: () => void
  onAddIO: () => void
  onTogglePersistence: () => void
  onSave?: () => void
  onLink?: () => void
  onSettings?: () => void
}

export function FloatingToolbar({
  onAddStage,
  onAddAction,
  onAddIO,
  onTogglePersistence,
  onSave,
  onLink,
  onSettings
}: FloatingToolbarProps) {
  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-2">
      {/* Node Creation Buttons */}
      <div className="flex flex-col gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddStage}
          className="w-10 h-10 p-0 flex items-center justify-center"
          title="Add Stage Node"
        >
          <Plus className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onAddAction}
          className="w-10 h-10 p-0 flex items-center justify-center"
          title="Add Action Node"
        >
          <Plus className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onAddIO}
          className="w-10 h-10 p-0 flex items-center justify-center"
          title="Add I/O Node"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Divider */}
      <div className="w-full h-px bg-gray-200 my-1" />
      
      {/* Action Buttons */}
      <div className="flex flex-col gap-1">
        {onSave && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            className="w-10 h-10 p-0 flex items-center justify-center"
            title="Save Model"
          >
            <Save className="w-4 h-4" />
          </Button>
        )}
        
        {onLink && (
          <Button
            variant="outline"
            size="sm"
            onClick={onLink}
            className="w-10 h-10 p-0 flex items-center justify-center"
            title="Cross-Feature Links"
          >
            <Link className="w-4 h-4" />
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={onTogglePersistence}
          className="w-10 h-10 p-0 flex items-center justify-center"
          title="Toggle Persistence Sidebar"
        >
          <Settings className="w-4 h-4" />
        </Button>
        
        {onSettings && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSettings}
            className="w-10 h-10 p-0 flex items-center justify-center"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
} 