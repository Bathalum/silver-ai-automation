'use client'

import React, { useState, useCallback } from 'react'
import { ArrowLeft, Edit3, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// Following Component Architecture: Individual floating field components
interface FloatingNameFieldProps {
  name: string
  onUpdateName: (name: string) => Promise<void>
  onNavigateBack: () => void
}

export function FloatingNameField({ name, onUpdateName, onNavigateBack }: FloatingNameFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(name)
  
  const handleSave = useCallback(async () => {
    if (editName.trim() !== name) {
      await onUpdateName(editName.trim())
    }
    setIsEditing(false)
  }, [editName, name, onUpdateName])
  
  const handleCancel = useCallback(() => {
    setEditName(name)
    setIsEditing(false)
  }, [name])
  
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSave()
    } else if (event.key === 'Escape') {
      handleCancel()
    }
  }, [handleSave, handleCancel])
  
  return (
    <div 
      className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-transparent hover:border-gray-300 rounded-lg shadow px-3 py-2"
      role="group"
      aria-label="Model name field"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onNavigateBack}
        className="p-1"
        aria-label="Navigate back to model list"
      >
        <ArrowLeft className="w-4 h-4 text-gray-500" />
      </Button>
      
      {isEditing ? (
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-8 text-sm font-medium min-w-[200px]"
          autoFocus
          aria-label="Edit model name"
          aria-describedby="name-edit-instructions"
        />
      ) : (
        <div
          className="text-2xl font-sans font-semibold tracking-tight cursor-pointer select-none"
          onClick={() => setIsEditing(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsEditing(true)
            }
          }}
          title="Click to edit name"
          role="button"
          tabIndex={0}
          aria-label={`Model name: ${name}. Click to edit`}
        >
          {name}
        </div>
      )}
      
      {/* Screen reader instructions */}
      <div id="name-edit-instructions" className="sr-only">
        Press Enter to save or Escape to cancel
      </div>
    </div>
  )
}

interface FloatingDescriptionFieldProps {
  description: string
  onUpdateDescription: (description: string) => Promise<void>
}

export function FloatingDescriptionField({ description, onUpdateDescription }: FloatingDescriptionFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editDescription, setEditDescription] = useState(description)
  
  const handleSave = useCallback(async () => {
    if (editDescription !== description) {
      await onUpdateDescription(editDescription)
    }
    setIsEditing(false)
  }, [editDescription, description, onUpdateDescription])
  
  const handleCancel = useCallback(() => {
    setEditDescription(description)
    setIsEditing(false)
  }, [description])
  
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSave()
    } else if (event.key === 'Escape') {
      handleCancel()
    }
  }, [handleSave, handleCancel])
  
  return (
    <div 
      className="bg-white/80 backdrop-blur-sm border border-transparent hover:border-gray-300 rounded-lg shadow px-3 py-2"
      role="group"
      aria-label="Model description field"
    >
      {isEditing ? (
        <Textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder="Add description..."
          className="min-h-[60px] text-sm resize-none min-w-[300px]"
          autoFocus
          aria-label="Edit model description"
          aria-describedby="description-edit-instructions"
        />
      ) : (
        <div
          className={cn(
            "text-sm text-gray-600 cursor-pointer select-none min-h-[60px] min-w-[300px]",
            !description && "text-gray-400 italic"
          )}
          onClick={() => setIsEditing(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsEditing(true)
            }
          }}
          title="Click to edit description"
          role="button"
          tabIndex={0}
          aria-label={`Model description: ${description || 'No description'}. Click to edit`}
        >
          {description || "Add description..."}
        </div>
      )}
      
      {/* Screen reader instructions */}
      <div id="description-edit-instructions" className="sr-only">
        Press Enter to save or Escape to cancel. Use Shift+Enter for new lines.
      </div>
    </div>
  )
} 