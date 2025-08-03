'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Search, Filter, Plus } from 'lucide-react'
import { FunctionModelTableRow } from './function-model-table-row'
import { FunctionModelFilters } from './function-model-filters'
import { NodeTypeIndicator } from './node-type-indicator'
import type { FunctionModelNode } from '@/lib/domain/entities/function-model-node-types'

interface FunctionModelListProps {
  models: FunctionModelNode[]
  loading: boolean
  error: string | null
  onModelSelect: (modelId: string) => void
  onModelDelete: (modelId: string) => void
  onModelDuplicate: (modelId: string) => void
  onFiltersChange?: (filters: any) => void
  onSearchChange?: (query: string) => void
  filters?: any
  searchQuery?: string
}

export function FunctionModelList({
  models,
  loading,
  error,
  onModelSelect,
  onModelDelete,
  onModelDuplicate,
  onFiltersChange,
  onSearchChange,
  filters = {},
  searchQuery = ''
}: FunctionModelListProps) {
  const [sortBy, setSortBy] = useState<'name' | 'lastSavedAt' | 'version'>('lastSavedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Sort models (backend handles filtering, we only sort locally)
  const sortedModels = useMemo(() => {
    const sorted = [...models]
    
    sorted.sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'lastSavedAt':
          aValue = new Date(a.lastSavedAt).getTime()
          bValue = new Date(b.lastSavedAt).getTime()
          break
        case 'version':
          aValue = a.version
          bValue = b.version
          break
        default:
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    
    return sorted
  }, [models, sortBy, sortOrder])
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">Function Models</h1>
            <p className="text-muted-foreground text-sm">Node-based automation workflows</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {sortedModels.length} models
            </span>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
            <Input
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
          
          {/* Sort controls */}
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="lastSavedAt">Last Saved</SelectItem>
              <SelectItem value="version">Version</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="h-8 text-xs"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </div>

      {/* Table Header */}
      <div className="border-b border-border px-4 py-2 bg-muted/50">
        <div className="grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <div className="col-span-4">Model</div>
          <div className="col-span-3">Node Flow</div>
          <div className="col-span-2">Performance</div>
          <div className="col-span-2">Stats</div>
          <div className="col-span-1"></div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Empty state */}
      {!loading && sortedModels.length === 0 && (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="flex justify-center gap-1 mb-4">
              <NodeTypeIndicator type="trigger" size="md" />
              <div className="w-4 h-4 text-muted-foreground self-center">→</div>
              <NodeTypeIndicator type="action" size="md" />
              <div className="w-4 h-4 text-muted-foreground self-center">→</div>
              <NodeTypeIndicator type="data" size="md" />
            </div>
            <h3 className="text-sm font-medium mb-2">No function models found</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {searchQuery || Object.keys(filters).length > 0
                ? "Try adjusting your search or filter criteria"
                : "Create your first node-based automation workflow"}
            </p>
          </div>
        </div>
      )}

      {/* Table Content */}
      {!loading && sortedModels.length > 0 && (
        <div className="flex-1 overflow-auto">
          {sortedModels.map((model, index) => (
            <FunctionModelTableRow
              key={model.modelId}
              model={model}
              onEdit={onModelSelect}
              onDelete={onModelDelete}
              onDuplicate={onModelDuplicate}
              isAlternate={index % 2 === 1}
            />
          ))}
        </div>
      )}
    </div>
  )
} 