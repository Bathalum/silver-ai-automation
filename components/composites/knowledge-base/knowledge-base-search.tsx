"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X, Filter } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface KnowledgeBaseSearchProps {
  onSearch: (query: string) => void
  onFilter: (type: 'category' | 'status', value: string) => void
  onClear: () => void
  filters: {
    search: string
    category: string
    status: string
    tags: string[]
  }
  placeholder?: string
  className?: string
}

export function KnowledgeBaseSearch({ 
  onSearch, 
  onFilter,
  onClear, 
  filters,
  placeholder = "Search SOPs...",
  className = "" 
}: KnowledgeBaseSearchProps) {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    setIsSearching(true)
    onSearch(searchQuery)
    setIsSearching(false)
  }

  const handleClear = () => {
    setQuery("")
    onClear()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(query)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSearch(query)}
          disabled={isSearching}
          className="flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          {isSearching ? "Searching..." : "Search"}
        </Button>
        
         {(filters.category || filters.status) && (
           <Button
             variant="ghost"
             size="sm"
             onClick={() => {
               onFilter('category', '')
               onFilter('status', '')
             }}
             className="text-muted-foreground"
           >
             Clear filters
           </Button>
         )}
         
         {(filters.search || filters.category || filters.status) && (
           <Button
             variant="ghost"
             size="sm"
             onClick={() => {
               onClear()
               onFilter('category', '')
               onFilter('status', '')
             }}
             className="text-red-600 hover:text-red-700"
           >
             Clear all
           </Button>
         )}
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {(filters.category || filters.status) && (
                <span className="ml-1 w-2 h-2 bg-primary rounded-full"></span>
              )}
              {(filters.search && (filters.category || filters.status)) && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                  {[filters.search, filters.category, filters.status].filter(Boolean).length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Filter by category, status, or tags..." />
              <CommandList>
                <CommandEmpty>No filters found.</CommandEmpty>
                <CommandGroup heading="Categories">
                  <CommandItem 
                    onSelect={() => onFilter('category', 'Customer Management')}
                    className={filters.category === 'Customer Management' ? 'bg-accent' : ''}
                  >
                    Customer Management
                  </CommandItem>
                  <CommandItem 
                    onSelect={() => onFilter('category', 'IT Operations')}
                    className={filters.category === 'IT Operations' ? 'bg-accent' : ''}
                  >
                    IT Operations
                  </CommandItem>
                  <CommandItem 
                    onSelect={() => onFilter('category', 'Development')}
                    className={filters.category === 'Development' ? 'bg-accent' : ''}
                  >
                    Development
                  </CommandItem>
                  <CommandItem 
                    onSelect={() => onFilter('category', 'Sales & Marketing')}
                    className={filters.category === 'Sales & Marketing' ? 'bg-accent' : ''}
                  >
                    Sales & Marketing
                  </CommandItem>
                </CommandGroup>
                <CommandGroup heading="Status">
                  <CommandItem 
                    onSelect={() => onFilter('status', 'published')}
                    className={filters.status === 'published' ? 'bg-accent' : ''}
                  >
                    Published
                  </CommandItem>
                  <CommandItem 
                    onSelect={() => onFilter('status', 'draft')}
                    className={filters.status === 'draft' ? 'bg-accent' : ''}
                  >
                    Draft
                  </CommandItem>
                  <CommandItem 
                    onSelect={() => onFilter('status', 'archived')}
                    className={filters.status === 'archived' ? 'bg-accent' : ''}
                  >
                    Archived
                  </CommandItem>
                </CommandGroup>
                <CommandGroup heading="Popular Tags">
                  <CommandItem>onboarding</CommandItem>
                  <CommandItem>process</CommandItem>
                  <CommandItem>training</CommandItem>
                  <CommandItem>backup</CommandItem>
                  <CommandItem>testing</CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
} 