'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Grid3X3, List, Search, Filter } from 'lucide-react'
import { FunctionModelCard } from './function-model-card'
import { FunctionModelFilters } from './function-model-filters'
import type { FunctionModel, FunctionModelFilters as Filters } from '@/lib/domain/entities/function-model-types'

interface FunctionModelListProps {
  models: FunctionModel[]
  loading: boolean
  error: string | null
  onModelSelect: (modelId: string) => void
  onModelDelete: (modelId: string) => void
  onModelDuplicate: (modelId: string) => void
  onFiltersChange?: (filters: Filters) => void
  onSearchChange?: (query: string) => void
  filters?: Filters
  searchQuery?: string
}

type ViewMode = 'grid' | 'list'

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
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
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
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Function Models</h2>
          <span className="text-sm text-muted-foreground">
            ({sortedModels.length} of {models.length})
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Sort controls */}
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-32">
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
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <FunctionModelFilters
        filters={filters}
        onFiltersChange={onFiltersChange || (() => {})}
        onSearchChange={onSearchChange || (() => {})}
        searchQuery={searchQuery}
      />
      
      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      
      {/* Empty state */}
      {!loading && sortedModels.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {searchQuery || Object.keys(filters).length > 0 ? (
              <>
                <p className="text-lg font-medium mb-2">No models found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">No function models yet</p>
                <p className="text-sm">Create your first function model to get started</p>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Models grid/list */}
      {!loading && sortedModels.length > 0 && (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {sortedModels.map(model => (
            <FunctionModelCard
              key={model.modelId}
              model={model}
              onEdit={onModelSelect}
              onDelete={onModelDelete}
              onDuplicate={onModelDuplicate}
            />
          ))}
        </div>
      )}
    </div>
  )
} 