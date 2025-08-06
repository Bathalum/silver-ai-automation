'use client'

import React, { useState, useCallback, useRef } from 'react'
import { FloatingEditableField } from './floating-editable-field'
import type { FunctionModelNode } from '@/lib/domain/entities/function-model-node-types'

interface FloatingFieldsContainerProps {
  // Nodes from the node-based architecture
  nodes: FunctionModelNode[]
  
  // Node operations from the application layer
  onUpdateNode: (nodeId: string, updates: Partial<FunctionModelNode>) => Promise<void>
  onDeleteNode?: (nodeId: string) => Promise<void>
  onDuplicateNode?: (nodeId: string) => Promise<void>
  
  // UI state management
  selectedNodeId?: string
  onSelectNode?: (nodeId: string) => void
  onDeselectNode?: () => void
  
  // Canvas interaction
  onNodePositionChange?: (nodeId: string, position: { x: number; y: number }) => void
  onNodeDragStart?: (nodeId: string) => void
  onNodeDragEnd?: (nodeId: string) => void
  
  // Container dimensions and positioning
  containerWidth?: number
  containerHeight?: number
  className?: string
}

export function FloatingFieldsContainer({
  nodes,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  selectedNodeId,
  onSelectNode,
  onDeselectNode,
  onNodePositionChange,
  onNodeDragStart,
  onNodeDragEnd,
  containerWidth = 1200,
  containerHeight = 800,
  className = ''
}: FloatingFieldsContainerProps) {
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Handle node selection
  const handleNodeSelect = useCallback((nodeId: string) => {
    onSelectNode?.(nodeId)
  }, [onSelectNode])
  
  // Handle node editing
  const handleNodeEdit = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId)
  }, [])
  
  // Handle cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null)
  }, [])
  
  // Handle position changes
  const handlePositionChange = useCallback((nodeId: string, position: { x: number; y: number }) => {
    // Constrain position within container bounds
    const constrainedPosition = {
      x: Math.max(0, Math.min(position.x, containerWidth - 320)), // 320px is card width
      y: Math.max(0, Math.min(position.y, containerHeight - 200))  // 200px is approximate card height
    }
    
    onNodePositionChange?.(nodeId, constrainedPosition)
  }, [onNodePositionChange, containerWidth, containerHeight])
  
  // Handle drag start
  const handleDragStart = useCallback((nodeId: string) => {
    setDraggingNodeId(nodeId)
    onNodeDragStart?.(nodeId)
  }, [onNodeDragStart])
  
  // Handle drag end
  const handleDragEnd = useCallback((nodeId: string) => {
    setDraggingNodeId(null)
    onNodeDragEnd?.(nodeId)
  }, [onNodeDragEnd])
  
  // Handle container click to deselect
  const handleContainerClick = useCallback((event: React.MouseEvent) => {
    if (event.target === containerRef.current) {
      onDeselectNode?.()
    }
  }, [onDeselectNode])
  
  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-50 ${className}`}
      style={{
        width: containerWidth,
        height: containerHeight
      }}
      onClick={handleContainerClick}
    >
      {/* Grid background for visual reference */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Floating editable fields */}
      {nodes.map((node) => (
        <FloatingEditableField
          key={node.id}
          node={{
            id: node.id,
            name: node.name,
            description: node.description,
            position: node.position,
            visualProperties: node.visualProperties,
            metadata: node.metadata
          }}
          onUpdateNode={onUpdateNode}
          onDeleteNode={onDeleteNode}
          onDuplicateNode={onDuplicateNode}
          isSelected={selectedNodeId === node.id}
          isEditing={editingNodeId === node.id}
          onSelect={handleNodeSelect}
          onEdit={handleNodeEdit}
          onCancelEdit={handleCancelEdit}
          onPositionChange={handlePositionChange}
          isDragging={draggingNodeId === node.id}
          onDragStart={() => handleDragStart(node.id)}
          onDragEnd={() => handleDragEnd(node.id)}
        />
      ))}
      
      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-lg font-medium mb-2">No nodes yet</div>
            <div className="text-sm">Click the toolbar to add your first node</div>
          </div>
        </div>
      )}
    </div>
  )
} 