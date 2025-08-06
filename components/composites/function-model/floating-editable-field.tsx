'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { ArrowLeft, Edit3, Save, X, Settings, Link, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface FloatingEditableFieldProps {
  // Node data from the node-based architecture
  node: {
    id: string
    name: string
    description?: string
    position: { x: number; y: number }
    visualProperties: {
      color?: string
      icon?: string
      size?: 'small' | 'medium' | 'large'
      style?: Record<string, any>
    }
    metadata: {
      tags: string[]
      searchKeywords: string[]
      crossFeatureLinks?: any[]
    }
  }
  
  // Callbacks for node operations
  onUpdateNode: (nodeId: string, updates: Partial<typeof node>) => Promise<void>
  onDeleteNode?: (nodeId: string) => Promise<void>
  onDuplicateNode?: (nodeId: string) => Promise<void>
  
  // UI state
  isSelected?: boolean
  isEditing?: boolean
  onSelect?: (nodeId: string) => void
  onEdit?: (nodeId: string) => void
  onCancelEdit?: () => void
  
  // Position and drag handling
  onPositionChange?: (nodeId: string, position: { x: number; y: number }) => void
  isDragging?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
}

export function FloatingEditableField({
  node,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  isSelected = false,
  isEditing = false,
  onSelect,
  onEdit,
  onCancelEdit,
  onPositionChange,
  isDragging = false,
  onDragStart,
  onDragEnd
}: FloatingEditableFieldProps) {
  const [editName, setEditName] = useState(node.name)
  const [editDescription, setEditDescription] = useState(node.description || '')
  const [isNameEditing, setIsNameEditing] = useState(false)
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false)
  
  const cardRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)
  
  // Handle name editing
  const handleNameEdit = useCallback(() => {
    setIsNameEditing(true)
    onEdit?.(node.id)
  }, [node.id, onEdit])
  
  const handleNameSave = useCallback(async () => {
    if (editName.trim() !== node.name) {
      await onUpdateNode(node.id, { name: editName.trim() })
    }
    setIsNameEditing(false)
    onCancelEdit?.()
  }, [editName, node.name, node.id, onUpdateNode, onCancelEdit])
  
  const handleNameCancel = useCallback(() => {
    setEditName(node.name)
    setIsNameEditing(false)
    onCancelEdit?.()
  }, [node.name, onCancelEdit])
  
  // Handle description editing
  const handleDescriptionEdit = useCallback(() => {
    setIsDescriptionEditing(true)
    onEdit?.(node.id)
  }, [node.id, onEdit])
  
  const handleDescriptionSave = useCallback(async () => {
    if (editDescription !== node.description) {
      await onUpdateNode(node.id, { description: editDescription })
    }
    setIsDescriptionEditing(false)
    onCancelEdit?.()
  }, [editDescription, node.description, node.id, onUpdateNode, onCancelEdit])
  
  const handleDescriptionCancel = useCallback(() => {
    setEditDescription(node.description || '')
    setIsDescriptionEditing(false)
    onCancelEdit?.()
  }, [node.description, onCancelEdit])
  
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
  
  // Handle drag functionality
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.target !== dragRef.current) return
    
    onDragStart?.()
    
    const startX = event.clientX - node.position.x
    const startY = event.clientY - node.position.y
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - startX
      const newY = moveEvent.clientY - startY
      
      onPositionChange?.(node.id, { x: newX, y: newY })
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      onDragEnd?.()
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [node.position.x, node.position.y, node.id, onDragStart, onDragEnd, onPositionChange])
  
  // Update local state when node data changes
  useEffect(() => {
    setEditName(node.name)
    setEditDescription(node.description || '')
  }, [node.name, node.description])
  
  return (
    <div
      ref={cardRef}
      className={cn(
        "absolute transition-all duration-200 ease-in-out",
        isSelected && "ring-2 ring-blue-500 ring-offset-2",
        isDragging && "z-50"
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        ...node.visualProperties.style
      }}
    >
      <Card 
        className={cn(
          "w-80 shadow-lg border-2",
          isSelected ? "border-blue-500" : "border-gray-200",
          "hover:shadow-xl transition-shadow duration-200"
        )}
        style={{
          backgroundColor: node.visualProperties.color || '#ffffff'
        }}
      >
        <CardContent className="p-4">
          {/* Header with arrow and name */}
          <div className="flex items-center gap-2 mb-3">
            <div
              ref={dragRef}
              className="cursor-move p-1 hover:bg-gray-100 rounded"
              onMouseDown={handleMouseDown}
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </div>
            
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
                  {node.name}
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
                  !node.description && "text-gray-400 italic"
                )}
                onClick={handleDescriptionEdit}
                title="Click to edit description"
              >
                {node.description || "Add description..."}
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
                onClick={() => onSelect?.(node.id)}
                className="h-8 w-8 p-0"
                title="Select"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDuplicateNode?.(node.id)}
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
              
              {onDeleteNode && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteNode(node.id)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  title="Delete"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 