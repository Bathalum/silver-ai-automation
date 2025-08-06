'use client'

import React, { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Trash2, Edit3 } from 'lucide-react'

interface EdgeContextMenuProps {
  position: { x: number; y: number }
  edgeId: string
  onDelete: (edgeId: string) => void
  onEdit?: (edgeId: string) => void
  onClose: () => void
}

export function EdgeContextMenu({ 
  position, 
  edgeId, 
  onDelete, 
  onEdit, 
  onClose 
}: EdgeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as HTMLElement)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [onClose])

  // Adjust position to keep menu within viewport
  const safeWindowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
  const safeWindowHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const adjustedPosition = {
    x: Math.min(position.x, safeWindowWidth - 180),
    y: Math.min(position.y, safeWindowHeight - 150),
  }

  return (
    <Card
      ref={menuRef}
      className="absolute z-50 w-44 p-1 shadow-lg border bg-white"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      <div className="space-y-1">
        {onEdit && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start h-8" 
            onClick={() => onEdit(edgeId)}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Connection
          </Button>
        )}

        <Separator />

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onDelete(edgeId)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Connection
        </Button>
      </div>
    </Card>
  )
} 