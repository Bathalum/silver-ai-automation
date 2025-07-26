"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X, Filter } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface KnowledgeBaseSearchProps {
  onSearch: (query: string) => void
  onClear: () => void
  placeholder?: string
  className?: string
}

export function KnowledgeBaseSearch({ 
  onSearch, 
  onClear, 
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
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Filter by category, status, or tags..." />
              <CommandList>
                <CommandEmpty>No filters found.</CommandEmpty>
                <CommandGroup heading="Categories">
                  <CommandItem>Customer Management</CommandItem>
                  <CommandItem>IT Operations</CommandItem>
                  <CommandItem>Development</CommandItem>
                  <CommandItem>Sales & Marketing</CommandItem>
                </CommandGroup>
                <CommandGroup heading="Status">
                  <CommandItem>Published</CommandItem>
                  <CommandItem>Draft</CommandItem>
                  <CommandItem>Archived</CommandItem>
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