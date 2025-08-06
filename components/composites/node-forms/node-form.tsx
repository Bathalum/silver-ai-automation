// Node Form Component
// This file implements the node creation/editing form following the Presentation Layer Complete Guide

'use client'

import React, { useState } from 'react'
import { BaseNode } from '@/lib/domain/entities/base-node-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface NodeFormProps {
  node?: BaseNode
  nodeType: string
  onSubmit: (node: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  isLoading?: boolean
}

export function NodeForm({
  node,
  nodeType,
  onSubmit,
  onCancel,
  isLoading = false
}: NodeFormProps) {
  const [formData, setFormData] = useState({
    name: node?.name || '',
    description: node?.description || '',
    position: node?.position || { x: 0, y: 0 },
    metadata: node?.metadata || { tags: [], visualProperties: {} }
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (formData.name.length > 255) {
      newErrors.name = 'Name must be less than 255 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    const nodeData = {
      ...formData,
      nodeType,
      featureType: getDefaultFeatureType(nodeType),
      status: 'active' as const
    }
    
    onSubmit(nodeData)
  }
  
  const getDefaultFeatureType = (nodeType: string): string => {
    const featureTypeMap: Record<string, string> = {
      'process': 'function-model',
      'content': 'knowledge-base',
      'integration': 'spindle',
      'domain': 'event-storm'
    }
    return featureTypeMap[nodeType] || 'function-model'
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={errors.name ? 'border-red-300' : ''}
          placeholder="Enter node name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder="Enter node description"
        />
      </div>
      
      <div>
        <Label htmlFor="tags">Tags</Label>
        <Input
          type="text"
          id="tags"
          value={formData.metadata.tags.join(', ')}
          onChange={(e) => setFormData({
            ...formData,
            metadata: {
              ...formData.metadata,
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
            }
          })}
          placeholder="Enter tags separated by commas"
        />
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : node ? 'Update Node' : 'Create Node'}
        </Button>
      </div>
    </form>
  )
} 