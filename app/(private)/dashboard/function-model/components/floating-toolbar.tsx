'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Settings, Zap, Layers, Hammer, ArrowLeftRight } from 'lucide-react'

interface FloatingToolbarProps {
  onAddStage: () => void
  onAddAction: () => void
  onAddIO: () => void
  onTogglePersistence: () => void
  onSave?: () => void
  onQuickSave?: () => void
  onLink?: () => void
  onSettings?: () => void
  hasUnsavedChanges?: boolean
}

export function FloatingToolbar({
  onAddStage,
  onAddAction,
  onAddIO,
  onTogglePersistence,
  onSave,
  onQuickSave,
  onLink,
  onSettings,
  hasUnsavedChanges = false
}: FloatingToolbarProps) {
  return (
    <div 
      className="flex flex-row gap-2 bg-white/80 backdrop-blur-sm border border-transparent hover:border-gray-300 rounded-lg shadow px-3 py-2"
      role="toolbar"
      aria-label="Function model toolbar"
    >
      {/* Node Creation Buttons */}
      <div className="flex flex-row gap-1" role="group" aria-label="Node creation tools">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddStage}
          className="w-10 h-10 p-0 flex items-center justify-center"
          title="Add Stage Node"
          aria-label="Add stage node"
        >
          <Layers className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onAddAction}
          className="w-10 h-10 p-0 flex items-center justify-center"
          title="Add Action Node"
          aria-label="Add action node"
        >
          <Hammer className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onAddIO}
          className="w-10 h-10 p-0 flex items-center justify-center"
          title="Add I/O Node"
          aria-label="Add input/output node"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Divider */}
      <div className="w-px h-8 bg-gray-200 mx-1" aria-hidden="true" />
      
      {/* Action Buttons */}
      <div className="flex flex-row gap-1" role="group" aria-label="Model actions">
        {onSave && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            className="w-10 h-10 p-0 flex items-center justify-center"
            title="Save Model"
            aria-label="Save model"
          >
            <Zap className="w-4 h-4" />
          </Button>
        )}
        
        {onQuickSave && (
          <Button
            variant={hasUnsavedChanges ? "default" : "outline"}
            size="sm"
            onClick={onQuickSave}
            className={`w-10 h-10 p-0 flex items-center justify-center ${
              hasUnsavedChanges ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''
            }`}
            title={hasUnsavedChanges ? "Quick Save (Unsaved Changes)" : "Quick Save"}
            aria-label={hasUnsavedChanges ? "Quick save model with unsaved changes" : "Quick save model"}
          >
            <Zap className="w-4 h-4" />
          </Button>
        )}
        
        {onLink && (
          <Button
            variant="outline"
            size="sm"
            onClick={onLink}
            className="w-10 h-10 p-0 flex items-center justify-center"
            title="Cross-Feature Links"
            aria-label="Manage cross-feature links"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </Button>
        )}
        
        {onSettings && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSettings}
            className="w-10 h-10 p-0 flex items-center justify-center"
            title="Settings"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {/* Divider */}
      <div className="w-px h-8 bg-gray-200 mx-1" aria-hidden="true" />
      
      {/* Persistence Button */}
      <div role="group" aria-label="Persistence tools">
        <Button
          variant="outline"
          size="sm"
          onClick={onTogglePersistence}
          className="w-10 h-10 p-0 flex items-center justify-center"
          title="Toggle Persistence Sidebar"
          aria-label="Toggle persistence sidebar"
        >
          <Layers className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
} 