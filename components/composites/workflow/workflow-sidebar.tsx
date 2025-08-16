'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Settings, 
  Palette, 
  Layers, 
  Database, 
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface WorkflowSidebarProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  selectedNodeId?: string
  onNodeSelect?: (nodeId: string) => void
  onAddNode?: (nodeType: string, position: { x: number; y: number }) => void
  className?: string
}

interface NodeTool {
  id: string
  name: string
  type: 'container' | 'action'
  icon: React.ReactNode
  description: string
  category: string
}

const nodeTools: NodeTool[] = [
  // Container nodes
  {
    id: 'io',
    name: 'Input/Output',
    type: 'container',
    icon: <Database className="h-5 w-5" />,
    description: 'Data input and output points',
    category: 'Container'
  },
  {
    id: 'stage',
    name: 'Stage',
    type: 'container',
    icon: <Layers className="h-5 w-5" />,
    description: 'Execution stage with actions',
    category: 'Container'
  },
  {
    id: 'function-model-container',
    name: 'Function Model',
    type: 'container',
    icon: <Layers className="h-5 w-5" />,
    description: 'Nested function model container',
    category: 'Container'
  },
  // Action nodes
  {
    id: 'tether',
    name: 'Tether',
    type: 'action',
    icon: <Zap className="h-5 w-5" />,
    description: 'Action execution node',
    category: 'Action'
  },
  {
    id: 'kb',
    name: 'Knowledge Base',
    type: 'action',
    icon: <Database className="h-5 w-5" />,
    description: 'Knowledge base reference',
    category: 'Action'
  }
]

export function WorkflowSidebar({
  isCollapsed = false,
  onToggleCollapse,
  selectedNodeId,
  onNodeSelect,
  onAddNode,
  className = ''
}: WorkflowSidebarProps) {
  const [activeTab, setActiveTab] = useState<'tools' | 'properties'>('tools')

  const handleNodeToolClick = (tool: NodeTool) => {
    if (onAddNode) {
      const position = { x: 250, y: 200 } // Default position for now
      onAddNode(tool.id, position)
    }
    console.log('Node tool selected:', tool)
  }

  const handleNodeSelect = (nodeId: string) => {
    onNodeSelect?.(nodeId)
  }

  if (isCollapsed) {
    return (
      <Card className={`w-16 h-full flex flex-col items-center py-4 ${className}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <div className="flex flex-col items-center space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('tools')}
            className={`w-10 h-10 ${activeTab === 'tools' ? 'bg-blue-100' : ''}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('properties')}
            className={`w-10 h-10 ${activeTab === 'properties' ? 'bg-blue-100' : ''}`}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`w-80 h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Workflow Tools</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'tools'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Node Tools
        </button>
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'properties'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Properties
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'tools' && (
          <div className="p-4">
            <div className="space-y-4">
              {/* Container Nodes */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Container Nodes</h4>
                <div className="space-y-2">
                  {nodeTools
                    .filter(tool => tool.type === 'container')
                    .map(tool => (
                      <div
                        key={tool.id}
                        className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => handleNodeToolClick(tool)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-blue-600">{tool.icon}</div>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{tool.name}</div>
                            <div className="text-xs text-gray-500">{tool.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <Separator />

              {/* Action Nodes */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Action Nodes</h4>
                <div className="space-y-2">
                  {nodeTools
                    .filter(tool => tool.type === 'action')
                    .map(tool => (
                      <div
                        key={tool.id}
                        className="p-3 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 cursor-pointer transition-colors"
                        onClick={() => handleNodeToolClick(tool)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-orange-600">{tool.icon}</div>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{tool.name}</div>
                            <div className="text-xs text-gray-500">{tool.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="p-4">
            {selectedNodeId ? (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Node Properties</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Node ID</label>
                    <p className="text-sm text-gray-900 font-mono">{selectedNodeId}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Type</label>
                    <Badge variant="outline" className="text-xs">
                      {nodeTools.find(t => t.id === selectedNodeId)?.name || 'Unknown'}
                    </Badge>
                  </div>
                  {/* Additional properties would be rendered here based on node type */}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Select a node to view properties</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
