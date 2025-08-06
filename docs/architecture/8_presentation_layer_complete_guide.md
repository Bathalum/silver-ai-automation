# Presentation Layer Complete Guide

## Overview
This document contains **EVERYTHING** you need to build the Presentation Layer consistently. This is a **general, reusable guide** that can be applied to any project, not specific to any particular business domain. The guide follows a **node-based architecture** where all domain concepts are represented as nodes with cross-feature connectivity.

## Core Principles
- **User interface layer** - React components, pages, forms, modals
- **API controllers** - REST endpoints, request/response handling
- **State management** - React hooks, Zustand stores, context providers
- **Cross-node navigation** - unified node visualization, node type switching
- **Responsive design** - mobile-first, accessible, performant UI

## 1. Unified Node Visualization (WHAT + HOW)

### React Flow Integration
```typescript
// components/composites/unified-node-graph.tsx

interface UnifiedNodeGraphProps {
  nodes: BaseNode[]
  links: CrossFeatureLink[]
  onNodeClick?: (node: BaseNode) => void
  onLinkClick?: (link: CrossFeatureLink) => void
  onNodeDrag?: (nodeId: string, position: { x: number; y: number }) => void
  onLinkCreate?: (source: string, target: string, linkType: LinkType) => void
  onNodeEdit?: (node: BaseNode) => void
  onNodeDelete?: (nodeId: string) => void
  readOnly?: boolean
  showNodeTypeLabels?: boolean
  highlightNodeType?: string
}

export function UnifiedNodeGraph({
  nodes,
  links,
  onNodeClick,
  onLinkClick,
  onNodeDrag,
  onLinkCreate,
  onNodeEdit,
  onNodeDelete,
  readOnly = false,
  showNodeTypeLabels = true,
  highlightNodeType
}: UnifiedNodeGraphProps) {
  const reactFlowInstance = useReactFlow()
  const [selectedNode, setSelectedNode] = useState<BaseNode | null>(null)
  
  // Convert nodes to React Flow format
  const reactFlowNodes = useMemo(() => 
    nodes.map(node => ({
      id: node.id,
      type: getNodeType(node.nodeType),
      position: node.position,
      data: {
        node,
        onEdit: () => onNodeEdit?.(node),
        onDelete: () => onNodeDelete?.(node.id),
        nodeType: node.nodeType,
        isHighlighted: highlightNodeType === node.nodeType
      }
    })), [nodes, onNodeEdit, onNodeDelete, highlightNodeType]
  )
  
  // Convert links to React Flow format
  const reactFlowEdges = useMemo(() => 
    links.map(link => ({
      id: link.linkId,
      source: link.sourceNodeId,
      target: link.targetNodeId,
      type: 'smoothstep',
      data: {
        link,
        linkType: link.linkType,
        visualProperties: link.visualProperties
      },
      style: {
        stroke: link.visualProperties.color || '#3B82F6',
        strokeWidth: 2,
        strokeDasharray: link.linkType === 'references' ? '5,5' : undefined
      }
    })), [links]
  )
  
  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodeClick={(_, node) => {
          setSelectedNode(node.data.node)
          onNodeClick?.(node.data.node)
        }}
        onEdgeClick={(_, edge) => onLinkClick?.(edge.data.link)}
        onNodeDragStop={(_, node) => onNodeDrag?.(node.id, node.position)}
        onConnect={(params) => {
          if (!readOnly) {
            onLinkCreate?.(params.source!, params.target!, 'references')
          }
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
      />
      
      {selectedNode && (
        <NodeDetailsPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onEdit={onNodeEdit}
          onDelete={onNodeDelete}
        />
      )}
    </div>
  )
}
```

### HOW-to Guidelines for Unified Node Graph:
- **Performance**: Use React.memo and useMemo for expensive operations
- **Accessibility**: Add proper ARIA labels and keyboard navigation
- **Responsive**: Handle different screen sizes and zoom levels
- **Node Type Detection**: Use node type detection for different node types
- **Error Handling**: Handle missing nodes and broken links gracefully

### Domain-Specific Node Components
```typescript
// components/composites/process/process-node.tsx

interface ProcessNodeProps {
  node: ProcessNode
  onEdit?: (node: ProcessNode) => void
  onDelete?: (nodeId: string) => void
  onLink?: (nodeId: string, targetNodeType: string, targetId: string) => void
  isSelected?: boolean
  isHighlighted?: boolean
}

export function ProcessNode({
  node,
  onEdit,
  onDelete,
  onLink,
  isSelected,
  isHighlighted
}: ProcessNodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const nodeStyle = useMemo(() => ({
    backgroundColor: isHighlighted ? '#FEF3C7' : '#FFFFFF',
    border: isSelected ? '2px solid #3B82F6' : '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '12px',
    minWidth: '200px',
    boxShadow: isHovered ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
  }), [isHighlighted, isSelected, isHovered])
  
  return (
    <div
      className="process-node"
      style={nodeStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm font-medium text-gray-900">
            {node.name}
          </span>
        </div>
        
        {isHovered && (
          <div className="flex space-x-1">
            <button
              onClick={() => onEdit?.(node)}
              className="p-1 text-gray-500 hover:text-blue-600"
              title="Edit node"
            >
              <EditIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete?.(node.id)}
              className="p-1 text-gray-500 hover:text-red-600"
              title="Delete node"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      
      {node.description && (
        <p className="text-xs text-gray-600 mb-2">{node.description}</p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="capitalize">{node.nodeType}</span>
        <span>{node.domainType}</span>
      </div>
      
      {node.domainData.stage && (
        <div className="mt-2 p-2 bg-blue-50 rounded">
          <div className="text-xs font-medium text-blue-800">Stage</div>
          <div className="text-xs text-blue-600">
            {node.domainData.stage.actions.length} actions
          </div>
        </div>
      )}
    </div>
  )
}

// components/composites/content/content-node.tsx

interface ContentNodeProps {
  node: ContentNode
  onEdit?: (node: ContentNode) => void
  onDelete?: (nodeId: string) => void
  onLink?: (nodeId: string, targetNodeType: string, targetId: string) => void
  isSelected?: boolean
  isHighlighted?: boolean
}

export function ContentNode({
  node,
  onEdit,
  onDelete,
  onLink,
  isSelected,
  isHighlighted
}: ContentNodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const nodeStyle = useMemo(() => ({
    backgroundColor: isHighlighted ? '#FEF3C7' : '#FFFFFF',
    border: isSelected ? '2px solid #10B981' : '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '12px',
    minWidth: '200px',
    boxShadow: isHovered ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
  }), [isHighlighted, isSelected, isHovered])
  
  return (
    <div
      className="content-node"
      style={nodeStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-gray-900">
            {node.name}
          </span>
        </div>
        
        {isHovered && (
          <div className="flex space-x-1">
            <button
              onClick={() => onEdit?.(node)}
              className="p-1 text-gray-500 hover:text-green-600"
              title="Edit node"
            >
              <EditIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete?.(node.id)}
              className="p-1 text-gray-500 hover:text-red-600"
              title="Delete node"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      
      {node.description && (
        <p className="text-xs text-gray-600 mb-2">{node.description}</p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="capitalize">{node.nodeType}</span>
        <span>{node.domainType}</span>
      </div>
      
      {node.domainData.content && (
        <div className="mt-2 p-2 bg-green-50 rounded">
          <div className="text-xs font-medium text-green-800">Content</div>
          <div className="text-xs text-green-600">
            {node.domainData.content.length} characters
          </div>
        </div>
      )}
    </div>
  )
}
```

### HOW-to Guidelines for Node Components:
- **Consistent Styling**: Use consistent visual patterns across node types
- **Interactive States**: Handle hover, selected, and highlighted states
- **Node Type Indicators**: Use color coding and icons to distinguish node types
- **Responsive Design**: Ensure nodes work on different screen sizes
- **Accessibility**: Add proper ARIA labels and keyboard support

## 2. API Controllers (WHAT + HOW)

### REST API Endpoints
```typescript
// app/api/nodes/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { UnifiedNodeOperations } from '@/lib/application/use-cases/unified-node-operations'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nodeType = searchParams.get('nodeType')
    const nodeId = searchParams.get('nodeId')
    
    if (!nodeType || !nodeId) {
      return NextResponse.json(
        { error: 'nodeType and nodeId are required' },
        { status: 400 }
      )
    }
    
    const nodeOperations = new UnifiedNodeOperationsImpl()
    const node = await nodeOperations.getNode(nodeType, nodeId)
    
    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }
    
    return NextResponse.json(node)
  } catch (error) {
    console.error('Error fetching node:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { node } = body
    
    if (!node) {
      return NextResponse.json(
        { error: 'node is required' },
        { status: 400 }
      )
    }
    
    const nodeOperations = new UnifiedNodeOperationsImpl()
    const createdNode = await nodeOperations.createNode(node)
    
    return NextResponse.json(createdNode, { status: 201 })
  } catch (error) {
    console.error('Error creating node:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/nodes/[nodeType]/[nodeId]/route.ts

export async function PUT(
  request: NextRequest,
  { params }: { params: { nodeType: string; nodeId: string } }
) {
  try {
    const body = await request.json()
    const { updates } = body
    
    const nodeOperations = new UnifiedNodeOperationsImpl()
    const updatedNode = await nodeOperations.updateNode(
      params.nodeType,
      params.nodeId,
      updates
    )
    
    return NextResponse.json(updatedNode)
  } catch (error) {
    console.error('Error updating node:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { nodeType: string; nodeId: string } }
) {
  try {
    const nodeOperations = new UnifiedNodeOperationsImpl()
    await nodeOperations.deleteNode(params.nodeType, params.nodeId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting node:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/node-links/route.ts

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nodeType = searchParams.get('nodeType')
    const nodeId = searchParams.get('nodeId')
    
    if (!nodeType || !nodeId) {
      return NextResponse.json(
        { error: 'nodeType and nodeId are required' },
        { status: 400 }
      )
    }
    
    const nodeOperations = new UnifiedNodeOperationsImpl()
    const links = await nodeOperations.getNodeLinks(nodeType, nodeId)
    
    return NextResponse.json(links)
  } catch (error) {
    console.error('Error fetching node links:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sourceNodeType, sourceNodeId, targetNodeType, targetNodeId, linkType } = body
    
    const nodeOperations = new UnifiedNodeOperationsImpl()
    const link = await nodeOperations.createNodeLink({
      sourceNodeType,
      sourceNodeId,
      targetNodeType,
      targetNodeId,
      linkType,
      linkStrength: 1.0,
      linkContext: {},
      visualProperties: {},
      createdBy: 'current-user-id' // Get from auth context
    })
    
    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    console.error('Error creating node link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### HOW-to Guidelines for API Controllers:
- **Error Handling**: Use consistent error responses and status codes
- **Validation**: Validate all input parameters
- **Authentication**: Check user permissions for all operations
- **Logging**: Log all API requests and errors
- **Rate Limiting**: Implement rate limiting for API endpoints
- **CORS**: Configure CORS for cross-origin requests

## 3. State Management (WHAT + HOW)

### Zustand Store for Node State
```typescript
// lib/stores/node-store.ts

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface NodeState {
  // Current nodes and links
  nodes: BaseNode[]
  links: CrossFeatureLink[]
  
  // UI state
  selectedNode: BaseNode | null
  selectedLink: CrossFeatureLink | null
  isEditing: boolean
  isLinking: boolean
  
  // Node type filters
  visibleNodeTypes: string[]
  highlightNodeType: string | null
  
  // Loading states
  isLoading: boolean
  error: string | null
  
  // Actions
  setNodes: (nodes: BaseNode[]) => void
  setLinks: (links: CrossFeatureLink[]) => void
  addNode: (node: BaseNode) => void
  updateNode: (nodeId: string, updates: Partial<BaseNode>) => void
  deleteNode: (nodeId: string) => void
  selectNode: (node: BaseNode | null) => void
  selectLink: (link: CrossFeatureLink | null) => void
  setEditing: (isEditing: boolean) => void
  setLinking: (isLinking: boolean) => void
  setVisibleNodeTypes: (nodeTypes: string[]) => void
  setHighlightNodeType: (nodeType: string | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useNodeStore = create<NodeState>()(
  devtools(
    (set, get) => ({
      // Initial state
      nodes: [],
      links: [],
      selectedNode: null,
      selectedLink: null,
      isEditing: false,
      isLinking: false,
      visibleNodeTypes: ['process', 'content', 'integration', 'domain'],
      highlightNodeType: null,
      isLoading: false,
      error: null,
      
      // Actions
      setNodes: (nodes) => set({ nodes }),
      setLinks: (links) => set({ links }),
      
      addNode: (node) => set((state) => ({
        nodes: [...state.nodes, node]
      })),
      
      updateNode: (nodeId, updates) => set((state) => ({
        nodes: state.nodes.map(node =>
          node.id === nodeId ? { ...node, ...updates } : node
        )
      })),
      
      deleteNode: (nodeId) => set((state) => ({
        nodes: state.nodes.filter(node => node.id !== nodeId),
        links: state.links.filter(link => 
          link.sourceNodeId !== nodeId && link.targetNodeId !== nodeId
        )
      })),
      
      selectNode: (node) => set({ selectedNode: node }),
      selectLink: (link) => set({ selectedLink: link }),
      setEditing: (isEditing) => set({ isEditing }),
      setLinking: (isLinking) => set({ isLinking }),
      setVisibleNodeTypes: (visibleNodeTypes) => set({ visibleNodeTypes }),
      setHighlightNodeType: (highlightNodeType) => set({ highlightNodeType }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null })
    }),
    {
      name: 'node-store'
    }
  )
)
```

### Custom Hooks for Node Operations
```typescript
// hooks/use-node-operations.ts

import { useState, useCallback } from 'react'
import { useNodeStore } from '@/lib/stores/node-store'
import { UnifiedNodeOperations } from '@/lib/application/use-cases/unified-node-operations'

export function useNodeOperations() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const {
    nodes,
    links,
    setNodes,
    setLinks,
    addNode,
    updateNode,
    deleteNode,
    setError: setStoreError
  } = useNodeStore()
  
  const nodeOperations = new UnifiedNodeOperationsImpl()
  
  const fetchNodes = useCallback(async (nodeTypes: string[]) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const graph = await nodeOperations.getCrossNodeGraph(nodeTypes)
      setNodes(graph.nodes)
      setLinks(graph.links)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch nodes'
      setError(errorMessage)
      setStoreError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [setNodes, setLinks, setStoreError])
  
  const createNode = useCallback(async (node: Omit<BaseNode, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const createdNode = await nodeOperations.createNode(node)
      addNode(createdNode)
      return createdNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create node'
      setError(errorMessage)
      setStoreError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [addNode, setStoreError])
  
  const updateNodeById = useCallback(async (
    nodeType: string,
    nodeId: string,
    updates: Partial<BaseNode>
  ) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const updatedNode = await nodeOperations.updateNode(nodeType, nodeId, updates)
      updateNode(nodeId, updatedNode)
      return updatedNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update node'
      setError(errorMessage)
      setStoreError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [updateNode, setStoreError])
  
  const deleteNodeById = useCallback(async (
    nodeType: string,
    nodeId: string
  ) => {
    setIsLoading(true)
    setError(null)
    
    try {
      await nodeOperations.deleteNode(nodeType, nodeId)
      deleteNode(nodeId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete node'
      setError(errorMessage)
      setStoreError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [deleteNode, setStoreError])
  
  const createNodeLink = useCallback(async (link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const createdLink = await nodeOperations.createNodeLink(link)
      setLinks([...links, createdLink])
      return createdLink
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create link'
      setError(errorMessage)
      setStoreError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [links, setLinks, setStoreError])
  
  return {
    nodes,
    links,
    isLoading,
    error,
    fetchNodes,
    createNode,
    updateNodeById,
    deleteNodeById,
    createNodeLink,
    clearError: () => {
      setError(null)
      setStoreError(null)
    }
  }
}
```

### HOW-to Guidelines for State Management:
- **Single Source of Truth**: Use Zustand for global state
- **Optimistic Updates**: Update UI immediately, sync with server
- **Error Handling**: Handle errors gracefully with user feedback
- **Loading States**: Show loading indicators for async operations
- **Caching**: Cache frequently accessed data
- **Persistence**: Persist important state to localStorage

## 4. Cross-Node Navigation (WHAT + HOW)

### Node Type Navigation Component
```typescript
// components/composites/node-type-navigation.tsx

interface NodeTypeNavigationProps {
  currentNodeType: string
  onNodeTypeChange: (nodeType: string) => void
  showAllNodeTypes?: boolean
  highlightNodeType?: string
}

export function NodeTypeNavigation({
  currentNodeType,
  onNodeTypeChange,
  showAllNodeTypes = false,
  highlightNodeType
}: NodeTypeNavigationProps) {
  const nodeTypes: Array<{ type: string; name: string; icon: string; color: string }> = [
    {
      type: 'process',
      name: 'Process Nodes',
      icon: 'WorkflowIcon',
      color: '#3B82F6'
    },
    {
      type: 'content',
      name: 'Content Nodes',
      icon: 'DocumentIcon',
      color: '#10B981'
    },
    {
      type: 'integration',
      name: 'Integration Nodes',
      icon: 'CogIcon',
      color: '#8B5CF6'
    },
    {
      type: 'domain',
      name: 'Domain Nodes',
      icon: 'LightningIcon',
      color: '#F59E0B'
    }
  ]
  
  const visibleNodeTypes = showAllNodeTypes ? nodeTypes : nodeTypes.filter(n => n.type === currentNodeType)
  
  return (
    <div className="flex space-x-2 p-4 bg-white border-b">
      {visibleNodeTypes.map((nodeType) => (
        <button
          key={nodeType.type}
          onClick={() => onNodeTypeChange(nodeType.type)}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors
            ${currentNodeType === nodeType.type
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
            ${highlightNodeType === nodeType.type ? 'ring-2 ring-yellow-400' : ''}
          `}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: nodeType.color }}
          />
          <span>{nodeType.name}</span>
        </button>
      ))}
    </div>
  )
}
```

### Cross-Node Search Component
```typescript
// components/composites/cross-node-search.tsx

interface CrossNodeSearchProps {
  onSearch: (query: string, nodeTypes: string[]) => void
  onResultSelect: (result: SearchResult) => void
  placeholder?: string
  nodeTypes?: string[]
}

export function CrossNodeSearch({
  onSearch,
  onResultSelect,
  placeholder = "Search across all node types...",
  nodeTypes = ['process', 'content', 'integration', 'domain']
}: CrossNodeSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<string[]>(nodeTypes)
  
  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([])
      return
    }
    
    setIsSearching(true)
    try {
      const searchResults = await onSearch(query, selectedNodeTypes)
      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [query, selectedNodeTypes, onSearch])
  
  useEffect(() => {
    const debounceTimer = setTimeout(handleSearch, 300)
    return () => clearTimeout(debounceTimer)
  }, [handleSearch])
  
  return (
    <div className="relative">
      <div className="flex space-x-2 mb-2">
        {nodeTypes.map((nodeType) => (
          <label key={nodeType} className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={selectedNodeTypes.includes(nodeType)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedNodeTypes([...selectedNodeTypes, nodeType])
                } else {
                  setSelectedNodeTypes(selectedNodeTypes.filter(n => n !== nodeType))
                }
              }}
              className="rounded"
            />
            <span className="text-sm capitalize">{nodeType}</span>
          </label>
        ))}
      </div>
      
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
          </div>
        )}
      </div>
      
      {results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.map((result) => (
            <button
              key={`${result.nodeType}-${result.nodeId}`}
              onClick={() => onResultSelect(result)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getNodeTypeColor(result.nodeType) }}
                />
                <div>
                  <div className="font-medium text-gray-900">{result.name}</div>
                  <div className="text-sm text-gray-500 capitalize">
                    {result.nodeType} • {result.domainType}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

### HOW-to Guidelines for Cross-Node Navigation:
- **Consistent UI**: Use consistent navigation patterns across node types
- **Visual Feedback**: Provide clear visual indicators for current node type
- **Search Integration**: Enable cross-node search functionality
- **Breadcrumbs**: Show navigation breadcrumbs for deep navigation
- **Keyboard Navigation**: Support keyboard shortcuts for navigation
- **Mobile Responsive**: Ensure navigation works on mobile devices

## 5. Form Components (WHAT + HOW)

### Node Creation/Edit Forms
```typescript
// components/composites/node-forms/node-form.tsx

interface NodeFormProps {
  node?: BaseNode
  nodeType: string
  onSubmit: (node: Omit<BaseNode, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  isLoading?: boolean
}

export function NodeForm({
  node,
  nodeType,
  onSubmit,
  onCancel,
  isLoading = false
}: NodeFormProps) {
  const [formData, setFormData] = useState({
    name: node?.name || '',
    description: node?.description || '',
    position: node?.position || { x: 0, y: 0 },
    metadata: node?.metadata || { tags: [], visualProperties: {} }
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (formData.name.length > 255) {
      newErrors.name = 'Name must be less than 255 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    const nodeData = {
      ...formData,
      nodeType,
      domainType: getDefaultDomainType(nodeType),
      status: 'active' as NodeStatus
    }
    
    onSubmit(nodeData)
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={`
            mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500
            ${errors.name ? 'border-red-300' : 'border-gray-300'}
          `}
          placeholder="Enter node name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter node description"
        />
      </div>
      
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
          Tags
        </label>
        <input
          type="text"
          id="tags"
          value={formData.metadata.tags.join(', ')}
          onChange={(e) => setFormData({
            ...formData,
            metadata: {
              ...formData.metadata,
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
            }
          })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter tags separated by commas"
        />
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : node ? 'Update Node' : 'Create Node'}
        </button>
      </div>
    </form>
  )
}
```

### HOW-to Guidelines for Forms:
- **Validation**: Implement client-side and server-side validation
- **Error Handling**: Show clear error messages to users
- **Loading States**: Show loading indicators during form submission
- **Accessibility**: Use proper labels and ARIA attributes
- **Responsive Design**: Ensure forms work on all screen sizes
- **Auto-save**: Consider auto-saving for long forms

## 6. Modal and Dialog Components (WHAT + HOW)

### Node Details Modal
```typescript
// components/composites/node-details-modal.tsx

interface NodeDetailsModalProps {
  node: BaseNode | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (node: BaseNode) => void
  onDelete?: (nodeId: string) => void
  onLink?: (nodeId: string, targetNodeType: string, targetId: string) => void
}

export function NodeDetailsModal({
  node,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onLink
}: NodeDetailsModalProps) {
  if (!node) return null
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: getNodeTypeColor(node.nodeType) }}
            />
            <span>{node.name}</span>
          </DialogTitle>
          <DialogDescription>
            {node.nodeType} • {node.domainType}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {node.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
              <p className="text-sm text-gray-600">{node.description}</p>
            </div>
          )}
          
          {node.metadata.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {node.metadata.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-gray-500">Node Type</dt>
                <dd className="font-medium capitalize">{node.nodeType}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Domain Type</dt>
                <dd className="font-medium capitalize">{node.domainType}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd className="font-medium capitalize">{node.status}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="font-medium">
                  {new Date(node.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        
        <DialogFooter>
          <div className="flex space-x-2">
            {onLink && (
              <button
                onClick={() => onLink(node.id, 'content', 'example-id')}
                className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
              >
                Link to Content Node
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(node)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(node.id)}
                className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
              >
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### HOW-to Guidelines for Modals:
- **Accessibility**: Use proper ARIA attributes and keyboard navigation
- **Focus Management**: Trap focus within modal and restore on close
- **Backdrop**: Allow closing by clicking backdrop
- **Escape Key**: Allow closing with Escape key
- **Responsive**: Ensure modals work on mobile devices
- **Loading States**: Show loading states for async operations

## Implementation Checklist

### UI Components
- [ ] Implement unified node graph component
- [ ] Create domain-specific node components
- [ ] Build cross-node navigation
- [ ] Implement search functionality
- [ ] Create form components for node creation/editing
- [ ] Build modal and dialog components

### API Controllers
- [ ] Implement REST API endpoints for nodes
- [ ] Create API endpoints for node links
- [ ] Add proper error handling and validation
- [ ] Implement authentication and authorization
- [ ] Add rate limiting and CORS configuration
- [ ] Create API documentation

### State Management
- [ ] Set up Zustand store for node state
- [ ] Implement custom hooks for node operations
- [ ] Add loading and error states
- [ ] Implement optimistic updates
- [ ] Add state persistence
- [ ] Create state selectors

### Cross-Node Integration
- [ ] Implement unified node visualization
- [ ] Create cross-node navigation
- [ ] Build cross-node search
- [ ] Add node type filtering
- [ ] Implement cross-node linking UI
- [ ] Create node type switching

### Responsive Design
- [ ] Ensure mobile-first design
- [ ] Test on different screen sizes
- [ ] Implement touch-friendly interactions
- [ ] Add keyboard navigation
- [ ] Optimize for performance
- [ ] Test accessibility

### Testing and Validation
- [ ] Write unit tests for components
- [ ] Create integration tests for API
- [ ] Test cross-node functionality
- [ ] Validate responsive design
- [ ] Test accessibility compliance
- [ ] Performance testing

### Documentation and Monitoring
- [ ] Document component APIs
- [ ] Create usage examples
- [ ] Set up error monitoring
- [ ] Add performance monitoring
- [ ] Create user guides
- [ ] Document accessibility features 