'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, X } from 'lucide-react'
import type { FunctionModelFilters } from '@/lib/domain/entities/function-model-types'

interface FunctionModelFiltersProps {
  filters: FunctionModelFilters
  onFiltersChange: (filters: FunctionModelFilters) => void
  onSearchChange: (query: string) => void
  searchQuery: string
}

export function FunctionModelFilters({
  filters,
  onFiltersChange,
  onSearchChange,
  searchQuery
}: FunctionModelFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchInputValue, setSearchInputValue] = useState(searchQuery)
  
  // Update local search input when prop changes
  useEffect(() => {
    setSearchInputValue(searchQuery)
  }, [searchQuery])
  
  // Handle search input change with debouncing
  const handleSearchChange = (value: string) => {
    setSearchInputValue(value)
    onSearchChange(value)
  }
  
  const handleFilterChange = (key: keyof FunctionModelFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }
  
  const clearFilters = () => {
    onFiltersChange({})
    handleSearchChange('')
  }
  
  const hasActiveFilters = Object.keys(filters).length > 0 || searchInputValue.length > 0
  
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search function models..."
          value={searchInputValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchInputValue && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => handleSearchChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">
              {Object.keys(filters).length + (searchQuery ? 1 : 0)}
            </Badge>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>
      
      {/* Expanded Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
                         <Select
               value={filters.status || 'all'}
               onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
             >
               <SelectTrigger>
                 <SelectValue placeholder="All statuses" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All statuses</SelectItem>
                 <SelectItem value="draft">Draft</SelectItem>
                 <SelectItem value="published">Published</SelectItem>
                 <SelectItem value="archived">Archived</SelectItem>
               </SelectContent>
             </Select>
          </div>
          
          {/* Complexity Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Complexity</label>
                         <Select
               value={filters.complexityLevel || 'all'}
               onValueChange={(value) => handleFilterChange('complexityLevel', value === 'all' ? undefined : value)}
             >
               <SelectTrigger>
                 <SelectValue placeholder="All complexities" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All complexities</SelectItem>
                 <SelectItem value="simple">Simple</SelectItem>
                 <SelectItem value="moderate">Moderate</SelectItem>
                 <SelectItem value="complex">Complex</SelectItem>
               </SelectContent>
             </Select>
          </div>
          
          {/* Process Type Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Process Type</label>
            <Input
              placeholder="Enter process type..."
              value={filters.processType || ''}
              onChange={(e) => handleFilterChange('processType', e.target.value || undefined)}
            />
          </div>
        </div>
      )}
    </div>
  )
} 