// Node Type Navigation Component
// This file implements the cross-node navigation following the Presentation Layer Complete Guide

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { 
  Settings, 
  BookOpen, 
  RefreshCw, 
  Zap, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react'

export interface NodeType {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  count?: number
  isVisible?: boolean
}

interface NodeTypeNavigationProps {
  nodeTypes: NodeType[]
  currentNodeType: string | null
  onNodeTypeChange: (nodeType: string) => void
  onToggleNodeTypeVisibility: (nodeType: string) => void
  className?: string
}

export function NodeTypeNavigation({
  nodeTypes,
  currentNodeType,
  onNodeTypeChange,
  onToggleNodeTypeVisibility,
  className
}: NodeTypeNavigationProps) {
  const [activeTab, setActiveTab] = useState<string>('all')
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Default node types if none provided
  const defaultNodeTypes: NodeType[] = [
    {
      id: 'function-model',
      name: 'Function Model',
      description: 'Business process models and workflows',
      icon: <Settings className="w-4 h-4" />,
      color: '#3b82f6',
      count: 0,
      isVisible: true
    },
    {
      id: 'knowledge-base',
      name: 'Knowledge Base',
      description: 'SOPs, documents, and templates',
      icon: <BookOpen className="w-4 h-4" />,
      color: '#10b981',
      count: 0,
      isVisible: true
    },
    {
      id: 'spindle',
      name: 'Spindle',
      description: 'Event-driven processes and triggers',
      icon: <RefreshCw className="w-4 h-4" />,
      color: '#f59e0b',
      count: 0,
      isVisible: true
    },
    {
      id: 'event-storm',
      name: 'Event Storm',
      description: 'Domain events and aggregates',
      icon: <Zap className="w-4 h-4" />,
      color: '#8b5cf6',
      count: 0,
      isVisible: true
    }
  ]

  const displayNodeTypes = nodeTypes.length > 0 ? nodeTypes : defaultNodeTypes

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const currentIndex = displayNodeTypes.findIndex(type => type.id === currentNodeType)
    
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        if (currentIndex > 0) {
          onNodeTypeChange(displayNodeTypes[currentIndex - 1].id)
        }
        break
      case 'ArrowRight':
        event.preventDefault()
        if (currentIndex < displayNodeTypes.length - 1) {
          onNodeTypeChange(displayNodeTypes[currentIndex + 1].id)
        }
        break
      case 'Escape':
        event.preventDefault()
        onNodeTypeChange('all')
        break
    }
  }, [displayNodeTypes, currentNodeType, onNodeTypeChange])

  // Auto-select first visible node type if none selected
  useEffect(() => {
    if (!currentNodeType && displayNodeTypes.length > 0) {
      const firstVisible = displayNodeTypes.find(type => type.isVisible)
      if (firstVisible) {
        onNodeTypeChange(firstVisible.id)
      }
    }
  }, [currentNodeType, displayNodeTypes, onNodeTypeChange])

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Node Types</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-6 w-6 p-0"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="space-y-3">
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all" className="text-xs">All Types</TabsTrigger>
              <TabsTrigger value="visible" className="text-xs">Visible Only</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-2 mt-3">
              {displayNodeTypes.map((nodeType) => (
                <NodeTypeCard
                  key={nodeType.id}
                  nodeType={nodeType}
                  isSelected={currentNodeType === nodeType.id}
                  onSelect={() => onNodeTypeChange(nodeType.id)}
                  onToggleVisibility={() => onToggleNodeTypeVisibility(nodeType.id)}
                  onKeyDown={handleKeyDown}
                />
              ))}
            </TabsContent>
            
            <TabsContent value="visible" className="space-y-2 mt-3">
              {displayNodeTypes
                .filter(nodeType => nodeType.isVisible)
                .map((nodeType) => (
                  <NodeTypeCard
                    key={nodeType.id}
                    nodeType={nodeType}
                    isSelected={currentNodeType === nodeType.id}
                    onSelect={() => onNodeTypeChange(nodeType.id)}
                    onToggleVisibility={() => onToggleNodeTypeVisibility(nodeType.id)}
                    onKeyDown={handleKeyDown}
                  />
                ))}
            </TabsContent>
          </Tabs>
          
          {/* Quick Actions */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Quick Actions</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNodeTypeChange('all')}
                  className={cn(
                    "h-6 px-2 text-xs",
                    currentNodeType === 'all' ? "bg-blue-100 text-blue-700" : ""
                  )}
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    displayNodeTypes.forEach(type => {
                      if (!type.isVisible) {
                        onToggleNodeTypeVisibility(type.id)
                      }
                    })
                  }}
                  className="h-6 px-2 text-xs"
                >
                  Show All
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

interface NodeTypeCardProps {
  nodeType: NodeType
  isSelected: boolean
  onSelect: () => void
  onToggleVisibility: () => void
  onKeyDown: (event: React.KeyboardEvent) => void
}

function NodeTypeCard({
  nodeType,
  isSelected,
  onSelect,
  onToggleVisibility,
  onKeyDown
}: NodeTypeCardProps) {
  return (
    <div
      className={cn(
        "group relative p-3 rounded-lg border cursor-pointer transition-all duration-200",
        isSelected 
          ? "border-blue-500 bg-blue-50 shadow-sm" 
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
        !nodeType.isVisible && "opacity-50"
      )}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Select ${nodeType.name} node type`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: nodeType.color + '20', color: nodeType.color }}
          >
            {nodeType.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium truncate">{nodeType.name}</h4>
              {nodeType.count !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  {nodeType.count}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{nodeType.description}</p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisibility()
          }}
          className={cn(
            "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
            !nodeType.isVisible && "opacity-100"
          )}
          aria-label={`${nodeType.isVisible ? 'Hide' : 'Show'} ${nodeType.name} nodes`}
        >
          {nodeType.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>
      </div>
      
      {/* Selection indicator */}
      {isSelected && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
          style={{ backgroundColor: nodeType.color }}
        />
      )}
    </div>
  )
} 