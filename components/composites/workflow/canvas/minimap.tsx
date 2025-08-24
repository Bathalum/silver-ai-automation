'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Minimize2, Maximize2, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MinimapProps {
  isVisible: boolean
  onToggleVisibility: () => void
  onMinimize: () => void
  onMaximize: () => void
  className?: string
}

export function Minimap({
  isVisible,
  onToggleVisibility,
  onMinimize,
  onMaximize,
  className
}: MinimapProps) {
  const [isMinimized, setIsMinimized] = useState(false)

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
    onMinimize()
  }

  const handleMaximize = () => {
    setIsMinimized(false)
    onMaximize()
  }

  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleVisibility}
        className={cn(
          "fixed bottom-4 right-4 h-10 w-10 p-0 bg-white border shadow-lg rounded-full hover:bg-gray-50",
          className
        )}
        title="Show Minimap"
      >
        <Eye className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <div className={cn(
      "fixed bottom-4 right-4 bg-white border shadow-lg rounded-lg overflow-hidden",
      isMinimized ? "w-64 h-48" : "w-80 h-60",
      className
    )}>
      {/* Minimap Header */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
        <span className="text-sm font-medium text-gray-700">Workflow Overview</span>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVisibility}
            className="h-6 w-6 p-0 hover:bg-gray-200"
            title="Hide Minimap"
          >
            <EyeOff className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={isMinimized ? handleMaximize : handleMinimize}
            className="h-6 w-6 p-0 hover:bg-gray-200"
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Minimap Content */}
      <div className="p-2">
        <div className="w-full h-full bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-sm font-medium mb-1">Minimap</div>
            <div className="text-xs">Workflow overview will be displayed here</div>
            <div className="text-xs mt-1">Drag to pan • Scroll to zoom</div>
          </div>
        </div>
      </div>

      {/* Minimap Controls */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-t">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs hover:bg-gray-200"
          >
            Fit View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs hover:bg-gray-200"
          >
            Center
          </Button>
        </div>
        <div className="text-xs text-gray-500">
          {isMinimized ? "Compact" : "Expanded"} View
        </div>
      </div>
    </div>
  )
}
