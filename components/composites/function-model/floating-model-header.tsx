'use client'

import React, { useState, useCallback, useRef } from 'react'
import { ArrowLeft, Edit3, Save, X, Settings, Link, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Following Component Architecture: Composite component that combines base UI components
interface FloatingModelHeaderProps {
  // Model data from the domain layer (following Clean Architecture)
  model: {
    id: string
    name: string
    description?: string
  }
  
  // Callbacks for model operations (Application Layer)
  onUpdateModel: (modelId: string, updates: { name?: string; description?: string }) => Promise<void>
  onNavigateBack: () => void
  
  // UI state (Presentation Layer)
  isEditing?: boolean
  onEdit?: () => void
  onCancelEdit?: () => void
  
  // Position and styling
  position?: { x: number; y: number }
  className?: string
}

export function FloatingModelHeader({
  model,
  onUpdateModel,
  onNavigateBack,
  isEditing = false,
  onEdit,
  onCancelEdit,
  position = { x: 20, y: 20 },
  className = ''
}: FloatingModelHeaderProps) {
  const [editName, setEditName] = useState(model.name)
  const [editDescription, setEditDescription] = useState(model.description || '')
  const [isNameEditing, setIsNameEditing] = useState(false)
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false)
  
  const cardRef = useRef<HTMLDivElement>(null)
  
  // Handle name editing
  const handleNameEdit = useCallback(() => {
    setIsNameEditing(true)
    onEdit?.()
  }, [onEdit])
  
  const handleNameSave = useCallback(async () => {
    if (editName.trim() !== model.name) {
      await onUpdateModel(model.id, { name: editName.trim() })
    }
    setIsNameEditing(false)
    onCancelEdit?.()
  }, [editName, model.name, model.id, onUpdateModel, onCancelEdit])
  
  const handleNameCancel = useCallback(() => {
    setEditName(model.name)
    setIsNameEditing(false)
    onCancelEdit?.()
  }, [model.name, onCancelEdit])
  
  // Handle description editing
  const handleDescriptionEdit = useCallback(() => {
    setIsDescriptionEditing(true)
    onEdit?.()
  }, [onEdit])
  
  const handleDescriptionSave = useCallback(async () => {
    if (editDescription !== model.description) {
      await onUpdateModel(model.id, { description: editDescription })
    }
    setIsDescriptionEditing(false)
    onCancelEdit?.()
  }, [editDescription, model.description, model.id, onUpdateModel, onCancelEdit])
  
  const handleDescriptionCancel = useCallback(() => {
    setEditDescription(model.description || '')
    setIsDescriptionEditing(false)
    onCancelEdit?.()
  }, [model.description, onCancelEdit])
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: React.KeyboardEvent, type: 'name' | 'description') => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (type === 'name') {
        handleNameSave()
      } else {
        handleDescriptionSave()
      }
    } else if (event.key === 'Escape') {
      if (type === 'name') {
        handleNameCancel()
      } else {
        handleDescriptionCancel()
      }
    }
  }, [handleNameSave, handleNameCancel, handleDescriptionSave, handleDescriptionCancel])
  
  return (
    <div
      ref={cardRef}
      className={cn(
        "absolute z-10 transition-all duration-200 ease-in-out",
        className
      )}
      style={{
        left: position.x,
        top: position.y
      }}
    >
      <Card className="w-80 shadow-lg border-2 border-gray-200 hover:shadow-xl transition-shadow duration-200">
        <CardContent className="p-4">
          {/* Header with arrow and name */}
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateBack}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </Button>
            
            <div className="flex-1 min-w-0">
              {isNameEditing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'name')}
                  onBlur={handleNameSave}
                  className="h-8 text-sm font-medium"
                  autoFocus
                />
              ) : (
                <div
                  className="text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded -ml-2"
                  onClick={handleNameEdit}
                  title="Click to edit name"
                >
                  {model.name}
                </div>
              )}
            </div>
            
            {isNameEditing && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleNameSave}
                  className="h-6 w-6 p-0"
                >
                  <Save className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleNameCancel}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Description */}
          <div className="mb-3">
            {isDescriptionEditing ? (
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'description')}
                onBlur={handleDescriptionSave}
                placeholder="Add description..."
                className="min-h-[60px] text-sm resize-none"
                autoFocus
              />
            ) : (
              <div
                className={cn(
                  "text-sm text-gray-600 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded -ml-2 min-h-[60px]",
                  !model.description && "text-gray-400 italic"
                )}
                onClick={handleDescriptionEdit}
                title="Click to edit description"
              >
                {model.description || "Add description..."}
              </div>
            )}
            
            {isDescriptionEditing && (
              <div className="flex gap-1 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDescriptionSave}
                  className="h-6 w-6 p-0"
                >
                  <Save className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDescriptionCancel}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Toolbar */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNameEdit}
                className="h-8 w-8 p-0"
                title="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                title="Duplicate"
              >
                <GitBranch className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                title="Links"
              >
                <Link className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 