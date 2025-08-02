'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2, Copy, ExternalLink, Calendar, Layers } from 'lucide-react'
import type { FunctionModel } from '@/lib/domain/entities/function-model-types'

interface FunctionModelCardProps {
  model: FunctionModel
  onEdit: (modelId: string) => void
  onDelete: (modelId: string) => void
  onDuplicate: (modelId: string) => void
}

export function FunctionModelCard({
  model,
  onEdit,
  onDelete,
  onDuplicate
}: FunctionModelCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'simple':
        return 'bg-blue-100 text-blue-800'
      case 'moderate':
        return 'bg-orange-100 text-orange-800'
      case 'complex':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  const getNodeCount = () => {
    return model.nodesData?.length || 0
  }
  
  return (
    <Card 
      className={`transition-all duration-200 hover:shadow-lg cursor-pointer ${
        isHovered ? 'ring-2 ring-primary/20' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onEdit(model.modelId)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {model.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {model.description}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onEdit(model.modelId)
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                onDuplicate(model.modelId)
              }}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                window.open(`/function-model/${model.modelId}`, '_blank')
              }}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(model.modelId)
                }}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 mb-3">
          <Badge className={getStatusColor(model.status)}>
            {model.status}
          </Badge>
          {model.complexityLevel && (
            <Badge className={getComplexityColor(model.complexityLevel)}>
              {model.complexityLevel}
            </Badge>
          )}
          <Badge variant="outline">
            v{model.version}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              <span>{getNodeCount()} nodes</span>
            </div>
            {model.processType && (
              <span>{model.processType}</span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(model.lastSavedAt)}</span>
          </div>
        </div>
        
        {model.tags && model.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {model.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {model.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{model.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 