// Node Details Panel Component
// This file implements the node details panel following the Presentation Layer Complete Guide

'use client'

import React from 'react'
import { BaseNode } from '@/lib/domain/entities/base-node-types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface NodeDetailsPanelProps {
  node: BaseNode | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (node: BaseNode) => void
  onDelete?: (nodeId: string) => void
  onLink?: (nodeId: string, targetNodeType: string, targetId: string) => void
}

export function NodeDetailsPanel({
  node,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onLink
}: NodeDetailsPanelProps) {
  if (!node) return null
  
  const getNodeTypeColor = (nodeType: string) => {
    const colorMap: Record<string, string> = {
      'process': '#3B82F6',
      'content': '#10B981',
      'integration': '#8B5CF6',
      'domain': '#F59E0B'
    }
    return colorMap[nodeType] || '#6B7280'
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: getNodeTypeColor(node.nodeType) }}
            />
            <span>{node.name}</span>
          </DialogTitle>
          <DialogDescription>
            {node.nodeType} • {node.featureType}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {node.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
              <p className="text-sm text-gray-600">{node.description}</p>
            </div>
          )}
          
          {node.metadata.tags && node.metadata.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {node.metadata.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-gray-500">Node Type</dt>
                <dd className="font-medium capitalize">{node.nodeType}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Feature Type</dt>
                <dd className="font-medium capitalize">{node.featureType}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd className="font-medium capitalize">{node.status}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="font-medium">
                  {new Date(node.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Position</dt>
                <dd className="font-medium">
                  ({node.position.x}, {node.position.y})
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Updated</dt>
                <dd className="font-medium">
                  {new Date(node.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
          
          {node.metadata.aiAgent && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">AI Agent</h4>
              <div className="p-2 bg-blue-50 rounded text-xs text-blue-800">
                AI Agent configured for this node
              </div>
            </div>
          )}
          
          {node.metadata.vectorEmbedding && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Vector Embedding</h4>
              <div className="p-2 bg-green-50 rounded text-xs text-green-800">
                Vector embedding available for semantic search
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <div className="flex space-x-2">
            {onLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onLink(node.nodeId, 'content', 'example-id')}
              >
                Link to Content Node
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(node)}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(node.nodeId)}
              >
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 