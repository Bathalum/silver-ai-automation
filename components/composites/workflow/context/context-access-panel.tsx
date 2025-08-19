'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  Edit, 
  Shield, 
  Users, 
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContextNode {
  id: string
  name: string
  type: string
  accessLevel: 'read' | 'write' | 'inherit' | 'none'
  contextData?: Record<string, any>
  children?: ContextNode[]
}

interface ContextAccessPanelProps {
  selectedNodeId?: string
  selectedNodeName?: string
  currentContext: {
    accessLevel: 'read' | 'write' | 'inherit' | 'none'
    availableContexts: ContextNode[]
    contextSources: ContextNode[]
    sharedWith: ContextNode[]
  }
  hierarchicalContext: {
    parentContexts: ContextNode[]
    childContexts: ContextNode[]
    siblingContexts: ContextNode[]
    deepNesting: ContextNode[]
  }
  onContextSelect?: (nodeId: string) => void
  onAccessLevelChange?: (nodeId: string, level: string) => void
  className?: string
}

export function ContextAccessPanel({
  selectedNodeId,
  selectedNodeName,
  currentContext,
  hierarchicalContext,
  onContextSelect,
  onAccessLevelChange,
  className
}: ContextAccessPanelProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('current')

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'write': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'read': return 'bg-green-100 text-green-800 border-green-200'
      case 'inherit': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'none': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'write': return <Edit className="h-3 w-3" />
      case 'read': return <Eye className="h-3 w-3" />
      case 'inherit': return <ArrowDown className="h-3 w-3" />
      case 'none': return <Shield className="h-3 w-3" />
      default: return <Shield className="h-3 w-3" />
    }
  }

  const renderContextNode = (node: ContextNode, level = 0, direction?: 'up' | 'down' | 'side') => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id} className="space-y-1">
        <div 
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer",
            selectedNodeId === node.id && "bg-blue-50 border border-blue-200",
            `ml-${level * 4}`
          )}
          onClick={() => onContextSelect?.(node.id)}
        >
          {/* Hierarchy direction indicator */}
          {direction && (
            <div className="flex-shrink-0">
              {direction === 'up' && <ArrowUp className="h-3 w-3 text-green-600" />}
              {direction === 'down' && <ArrowDown className="h-3 w-3 text-purple-600" />}
              {direction === 'side' && <ArrowRight className="h-3 w-3 text-blue-600" />}
            </div>
          )}

          {/* Expand/collapse button */}
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(node.id)
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-6" />
          )}

          {/* Node info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {node.type}
              </Badge>
              <span className="text-sm font-medium truncate">
                {node.name}
              </span>
            </div>
          </div>

          {/* Access level */}
          <Badge 
            variant="outline" 
            className={`text-xs ${getAccessLevelColor(node.accessLevel)}`}
          >
            {getAccessLevelIcon(node.accessLevel)}
            <span className="ml-1">{node.accessLevel}</span>
          </Badge>
        </div>

        {/* Child nodes */}
        {hasChildren && isExpanded && (
          <div className="ml-4 space-y-1">
            {node.children!.map(child => 
              renderContextNode(child, level + 1)
            )}
          </div>
        )}
      </div>
    )
  }

  if (!selectedNodeId) {
    return (
      <div className={cn("w-[350px] h-full bg-muted/50 flex items-center justify-center", className)}>
        <div className="text-center text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Select a node to view context access</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-[350px] h-full flex flex-col", className)}>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Context Access</CardTitle>
            <Badge 
              variant="outline" 
              className={`text-xs ${getAccessLevelColor(currentContext.accessLevel)}`}
            >
              {getAccessLevelIcon(currentContext.accessLevel)}
              <span className="ml-1">{currentContext.accessLevel}</span>
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {selectedNodeName || `Node ${selectedNodeId}`}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-4">
              <TabsTrigger value="current">Current</TabsTrigger>
              <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current" className="flex-1 mt-0">
              <ScrollArea className="h-full px-4">
                <div className="space-y-4 py-4">
                  {/* Access Level */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Access Level</h4>
                    <Badge 
                      variant="outline" 
                      className={`${getAccessLevelColor(currentContext.accessLevel)}`}
                    >
                      {getAccessLevelIcon(currentContext.accessLevel)}
                      <span className="ml-2 capitalize">{currentContext.accessLevel}</span>
                    </Badge>
                  </div>

                  <Separator />

                  {/* Available Contexts */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Available Contexts ({currentContext.availableContexts.length})
                    </h4>
                    <div className="space-y-1">
                      {currentContext.availableContexts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No contexts available
                        </p>
                      ) : (
                        currentContext.availableContexts.map(node => 
                          renderContextNode(node)
                        )
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Context Sources */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Context Sources ({currentContext.contextSources.length})
                    </h4>
                    <div className="space-y-1">
                      {currentContext.contextSources.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No context sources
                        </p>
                      ) : (
                        currentContext.contextSources.map(node => 
                          renderContextNode(node)
                        )
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Shared With */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Sharing Context With ({currentContext.sharedWith.length})
                    </h4>
                    <div className="space-y-1">
                      {currentContext.sharedWith.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Not sharing with any nodes
                        </p>
                      ) : (
                        currentContext.sharedWith.map(node => 
                          renderContextNode(node)
                        )
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="hierarchy" className="flex-1 mt-0">
              <ScrollArea className="h-full px-4">
                <div className="space-y-4 py-4">
                  {/* Parent Contexts */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <ArrowUp className="h-4 w-4 text-green-600" />
                      Parent Contexts ({hierarchicalContext.parentContexts.length})
                    </h4>
                    <div className="space-y-1">
                      {hierarchicalContext.parentContexts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No parent contexts
                        </p>
                      ) : (
                        hierarchicalContext.parentContexts.map(node => 
                          renderContextNode(node, 0, 'up')
                        )
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Child Contexts */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <ArrowDown className="h-4 w-4 text-purple-600" />
                      Child Contexts ({hierarchicalContext.childContexts.length})
                    </h4>
                    <div className="space-y-1">
                      {hierarchicalContext.childContexts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No child contexts
                        </p>
                      ) : (
                        hierarchicalContext.childContexts.map(node => 
                          renderContextNode(node, 0, 'down')
                        )
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Sibling Contexts */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                      Sibling Contexts ({hierarchicalContext.siblingContexts.length})
                    </h4>
                    <div className="space-y-1">
                      {hierarchicalContext.siblingContexts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No sibling contexts
                        </p>
                      ) : (
                        hierarchicalContext.siblingContexts.map(node => 
                          renderContextNode(node, 0, 'side')
                        )
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Deep Nesting */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-gray-600" />
                      Deep Nesting ({hierarchicalContext.deepNesting.length})
                    </h4>
                    <div className="space-y-1">
                      {hierarchicalContext.deepNesting.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No nested contexts
                        </p>
                      ) : (
                        hierarchicalContext.deepNesting.map(node => 
                          renderContextNode(node)
                        )
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}