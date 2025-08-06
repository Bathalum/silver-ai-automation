// Cross Node Search Component
// This file implements the cross-node search following the Presentation Layer Complete Guide

'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  Check,
  Settings,
  BookOpen,
  RefreshCw,
  Zap
} from 'lucide-react'
import { BaseNode } from '@/lib/domain/entities/base-node-types'

export interface SearchableNode extends BaseNode {
  searchableText: string
  nodeType: string
  feature: string
}

interface CrossNodeSearchProps {
  nodes: SearchableNode[]
  onNodeSelect: (node: SearchableNode) => void
  onSearchChange?: (searchTerm: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

interface SearchResult {
  node: SearchableNode
  relevance: number
  matchedFields: string[]
}

export function CrossNodeSearch({
  nodes,
  onNodeSelect,
  onSearchChange,
  placeholder = "Search nodes across all features...",
  className,
  disabled = false
}: CrossNodeSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Node type options
  const nodeTypeOptions = [
    { value: 'function-model', label: 'Function Model', icon: <Settings className="w-4 h-4" />, color: '#3b82f6' },
    { value: 'knowledge-base', label: 'Knowledge Base', icon: <BookOpen className="w-4 h-4" />, color: '#10b981' },
    { value: 'spindle', label: 'Spindle', icon: <RefreshCw className="w-4 h-4" />, color: '#f59e0b' },
    { value: 'event-storm', label: 'Event Storm', icon: <Zap className="w-4 h-4" />, color: '#8b5cf6' }
  ]

  // Debounced search function
  const performSearch = useCallback(async (term: string, nodeTypes: string[]) => {
    if (!term.trim()) {
      setSearchResults([])
      return
    }

    setIsLoading(true)

    // Simulate search delay for better UX
    await new Promise(resolve => setTimeout(resolve, 100))

    const results: SearchResult[] = []
    const lowerTerm = term.toLowerCase()

    nodes.forEach(node => {
      // Filter by node type if specified
      if (nodeTypes.length > 0 && !nodeTypes.some(type => node.nodeType.includes(type))) {
        return
      }

      const matchedFields: string[] = []
      let relevance = 0

      // Check name match (highest relevance)
      if (node.name.toLowerCase().includes(lowerTerm)) {
        matchedFields.push('name')
        relevance += 10
        if (node.name.toLowerCase().startsWith(lowerTerm)) {
          relevance += 5 // Bonus for prefix match
        }
      }

      // Check description match
      if (node.description?.toLowerCase().includes(lowerTerm)) {
        matchedFields.push('description')
        relevance += 5
      }

      // Check searchable text match
      if (node.searchableText?.toLowerCase().includes(lowerTerm)) {
        matchedFields.push('content')
        relevance += 3
      }

      // Check node type match
      if (node.nodeType.toLowerCase().includes(lowerTerm)) {
        matchedFields.push('type')
        relevance += 2
      }

      if (relevance > 0) {
        results.push({
          node,
          relevance,
          matchedFields
        })
      }
    })

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance)

    setSearchResults(results.slice(0, 20)) // Limit to top 20 results
    setIsLoading(false)
  }, [nodes])

  // Handle search term changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
    onSearchChange?.(value)

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value, selectedNodeTypes)
    }, 300)
  }, [onSearchChange, performSearch, selectedNodeTypes])

  // Handle node type filter changes
  const handleNodeTypeToggle = useCallback((nodeType: string) => {
    setSelectedNodeTypes(prev => {
      const newTypes = prev.includes(nodeType)
        ? prev.filter(t => t !== nodeType)
        : [...prev, nodeType]
      
      // Trigger search with new filters
      setTimeout(() => {
        performSearch(searchTerm, newTypes)
      }, 0)
      
      return newTypes
    })
  }, [searchTerm, performSearch])

  // Handle node selection
  const handleNodeSelect = useCallback((node: SearchableNode) => {
    onNodeSelect(node)
    setIsOpen(false)
    setSearchTerm('')
    setSearchResults([])
  }, [onNodeSelect])

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchTerm('')
    setSearchResults([])
    onSearchChange?.('')
  }, [onSearchChange])

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        setIsOpen(false)
        break
      case 'Enter':
        if (searchResults.length > 0) {
          event.preventDefault()
          handleNodeSelect(searchResults[0].node)
        }
        break
    }
  }, [searchResults, handleNodeSelect])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className={cn("w-full", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between"
            disabled={disabled}
          >
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-gray-400" />
              {searchTerm ? (
                <span className="truncate">{searchTerm}</span>
              ) : (
                <span className="text-gray-500">{placeholder}</span>
              )}
            </div>
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClearSearch()
                }}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search nodes..."
              value={searchTerm}
              onValueChange={handleSearchChange}
              onKeyDown={handleKeyDown}
            />
            
            {/* Node Type Filters */}
            <div className="border-b p-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-gray-500">Filter by type:</span>
                {nodeTypeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedNodeTypes.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleNodeTypeToggle(option.value)}
                    className="h-6 px-2 text-xs"
                    style={{
                      backgroundColor: selectedNodeTypes.includes(option.value) ? option.color : undefined,
                      borderColor: option.color
                    }}
                  >
                    {option.icon}
                    <span className="ml-1">{option.label}</span>
                    {selectedNodeTypes.includes(option.value) && (
                      <Check className="ml-1 h-3 w-3" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
            
            <CommandList>
              <CommandEmpty>
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Searching...
                  </div>
                ) : searchTerm ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No nodes found matching "{searchTerm}"
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Start typing to search nodes
                  </div>
                )}
              </CommandEmpty>
              
              {searchResults.length > 0 && (
                <CommandGroup heading="Search Results">
                  <ScrollArea className="h-[300px]">
                    {searchResults.map((result) => (
                      <SearchResultItem
                        key={result.node.nodeId}
                        result={result}
                        onSelect={() => handleNodeSelect(result.node)}
                      />
                    ))}
                  </ScrollArea>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface SearchResultItemProps {
  result: SearchResult
  onSelect: () => void
}

function SearchResultItem({ result, onSelect }: SearchResultItemProps) {
  const { node, matchedFields } = result
  
  const getNodeTypeColor = (nodeType: string) => {
    const colorMap: Record<string, string> = {
      'function-model': '#3b82f6',
      'knowledge-base': '#10b981',
      'spindle': '#f59e0b',
      'event-storm': '#8b5cf6',
      'default': '#6b7280'
    }
    
    const feature = nodeType.split('-')[0]
    return colorMap[feature] || colorMap.default
  }

  const getNodeTypeIcon = (nodeType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'function-model': <Settings className="w-3 h-3" />,
      'knowledge-base': <BookOpen className="w-3 h-3" />,
      'spindle': <RefreshCw className="w-3 h-3" />,
      'event-storm': <Zap className="w-3 h-3" />
    }
    
    const feature = nodeType.split('-')[0]
    return iconMap[feature] || <Settings className="w-3 h-3" />
  }

  return (
    <CommandItem
      onSelect={onSelect}
      className="flex items-center gap-3 p-3 cursor-pointer"
    >
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ 
          backgroundColor: getNodeTypeColor(node.nodeType) + '20',
          color: getNodeTypeColor(node.nodeType)
        }}
      >
        {getNodeTypeIcon(node.nodeType)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium truncate">{node.name}</h4>
          <Badge variant="outline" className="text-xs">
            {node.nodeType}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 truncate">
          {node.description || 'No description'}
        </p>
        {matchedFields.length > 0 && (
          <div className="flex gap-1 mt-1">
            {matchedFields.map((field) => (
              <Badge key={field} variant="secondary" className="text-xs">
                {field}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </CommandItem>
  )
} 