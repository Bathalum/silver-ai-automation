'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ZoomControlsProps {
  currentZoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomToFit: () => void
  onResetZoom: () => void
  className?: string
}

const zoomLevels = [25, 50, 75, 100, 125, 150, 200]

export function ZoomControls({
  currentZoom,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onResetZoom,
  className
}: ZoomControlsProps) {
  return (
    <div className={cn(
      "flex items-center space-x-1 bg-white border rounded-lg shadow-sm p-1",
      className
    )}>
      {/* Zoom Out */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomOut}
        className="h-8 w-8 p-0 hover:bg-gray-100"
        title="Zoom Out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      {/* Zoom Level Display */}
      <div className="px-2 py-1 min-w-[60px] text-center">
        <span className="text-sm font-medium text-gray-700">
          {Math.round(currentZoom * 100)}%
        </span>
      </div>

      {/* Zoom In */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomIn}
        className="h-8 w-8 p-0 hover:bg-gray-100"
        title="Zoom In"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Zoom to Fit */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onZoomToFit}
        className="h-8 w-8 p-0 hover:bg-gray-100"
        title="Zoom to Fit"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>

      {/* Reset Zoom */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onResetZoom}
        className="h-8 w-8 p-0 hover:bg-gray-100"
        title="Reset to 100%"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      {/* Preset Zoom Levels */}
      <div className="flex items-center space-x-1 ml-2">
        {zoomLevels.map((level) => (
          <Button
            key={level}
            variant={Math.abs(currentZoom - level / 100) < 0.01 ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              // This would need to be connected to the actual zoom function
              console.log(`Zoom to ${level}%`)
            }}
            className="h-6 px-2 text-xs hover:bg-gray-100"
          >
            {level}%
          </Button>
        ))}
      </div>
    </div>
  )
}
