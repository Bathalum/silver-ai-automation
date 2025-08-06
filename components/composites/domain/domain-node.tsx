// Domain Node Component
// This file implements the domain node visualization following the Presentation Layer Complete Guide

'use client'

import React, { useState, useMemo } from 'react'
import { BaseNode } from '@/lib/domain/entities/base-node-types'
import { EditIcon, TrashIcon } from 'lucide-react'

interface DomainNodeProps {
  node: BaseNode
  onEdit?: (node: BaseNode) => void
  onDelete?: (nodeId: string) => void
  onLink?: (nodeId: string, targetNodeType: string, targetId: string) => void
  isSelected?: boolean
  isHighlighted?: boolean
}

export function DomainNode({
  node,
  onEdit,
  onDelete,
  onLink,
  isSelected,
  isHighlighted
}: DomainNodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const nodeStyle = useMemo(() => ({
    backgroundColor: isHighlighted ? '#FEF3C7' : '#FFFFFF',
    border: isSelected ? '2px solid #F59E0B' : '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '12px',
    minWidth: '200px',
    boxShadow: isHovered ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
  }), [isHighlighted, isSelected, isHovered])
  
  return (
    <div
      className="domain-node"
      style={nodeStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-sm font-medium text-gray-900">
            {node.name}
          </span>
        </div>
        
        {isHovered && (
          <div className="flex space-x-1">
            <button
              onClick={() => onEdit?.(node)}
              className="p-1 text-gray-500 hover:text-amber-600"
              title="Edit node"
            >
              <EditIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete?.(node.nodeId)}
              className="p-1 text-gray-500 hover:text-red-600"
              title="Delete node"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      
      {node.description && (
        <p className="text-xs text-gray-600 mb-2">{node.description}</p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="capitalize">{node.nodeType}</span>
        <span>{node.featureType}</span>
      </div>
      
      {node.metadata.tags && node.metadata.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.metadata.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
            >
              {tag}
            </span>
          ))}
          {node.metadata.tags.length > 3 && (
            <span className="text-xs text-gray-500">
              +{node.metadata.tags.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  )
} 