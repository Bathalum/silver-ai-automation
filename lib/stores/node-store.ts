// Unified Node Store for Presentation Layer
// This file implements the unified node state management following the Presentation Layer Complete Guide

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { BaseNode } from '@/lib/domain/entities/base-node-types'
import { CrossFeatureLink } from '@/lib/domain/entities/cross-feature-link-types'

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
      visibleNodeTypes: ['function-model', 'knowledge-base', 'spindle', 'event-storm'],
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
          node.nodeId === nodeId ? { ...node, ...updates } : node
        )
      })),
      
      deleteNode: (nodeId) => set((state) => ({
        nodes: state.nodes.filter(node => node.nodeId !== nodeId),
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