'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface GridBackgroundProps {
  gridSize?: number
  gridColor?: string
  snapToGrid?: boolean
  className?: string
}

export function GridBackground({
  gridSize = 20,
  gridColor = '#e5e7eb',
  snapToGrid = true,
  className
}: GridBackgroundProps) {
  const gridPattern = `
    <defs>
      <pattern id="grid" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">
        <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="${gridColor}" stroke-width="0.5" opacity="0.3"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  `

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="grid-background"
        style={{
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundImage: `
            linear-gradient(to right, ${gridColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
          `,
          backgroundPosition: '0 0',
          opacity: 0.3
        }}
      >
        <defs>
          <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path 
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} 
              fill="none" 
              stroke={gridColor} 
              strokeWidth="0.5" 
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      
      {/* Grid Snap Indicator */}
      {snapToGrid && (
        <div className="absolute top-2 left-2 bg-white border rounded px-2 py-1 text-xs text-gray-600 shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Snap to Grid: {gridSize}px</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Utility function to snap coordinates to grid
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

// Utility function to snap node position to grid
export function snapNodeToGrid(
  position: { x: number; y: number },
  gridSize: number
): { x: number; y: number } {
  return {
    x: snapToGrid(position.x, gridSize),
    y: snapToGrid(position.y, gridSize)
  }
}
