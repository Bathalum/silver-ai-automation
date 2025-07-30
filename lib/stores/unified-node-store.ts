// Unified Node Store
// Global state management for the unified node system using Zustand

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { 
  BaseNode, 
  NodeRelationship, 
  AIAgentConfig,
  RelationshipType,
  FeatureType
} from '@/lib/domain/entities/unified-node-types'

interface UnifiedNodeStore {
  // State
  nodes: BaseNode[]
  relationships: NodeRelationship[]
  aiAgents: Map<string, AIAgentConfig>
  selectedNodeId: string | null
  selectedFeature: string | null
  searchQuery: string
  filters: {
    nodeTypes: string[]
    features: string[]
    tags: string[]
  }
  
  // Node operations
  addNode: (node: BaseNode) => void
  updateNode: (nodeId: string, updates: Partial<BaseNode>) => void
  deleteNode: (nodeId: string) => void
  selectNode: (nodeId: string | null) => void
  selectFeature: (feature: string | null) => void
  
  // Relationship operations
  addRelationship: (relationship: NodeRelationship) => void
  removeRelationship: (relationshipId: string) => void
  updateRelationship: (relationshipId: string, updates: Partial<NodeRelationship>) => void
  
  // AI Agent operations
  addAIAgent: (nodeId: string, agent: AIAgentConfig) => void
  updateAIAgent: (nodeId: string, updates: Partial<AIAgentConfig>) => void
  removeAIAgent: (nodeId: string) => void
  
  // Search and filter operations
  setSearchQuery: (query: string) => void
  setFilters: (filters: Partial<UnifiedNodeStore['filters']>) => void
  clearFilters: () => void
  
  // Cross-feature operations
  linkNodes: (sourceId: string, targetId: string, type: RelationshipType) => void
  getRelatedNodes: (nodeId: string) => BaseNode[]
  getNodesByFeature: (feature: string) => BaseNode[]
  getNodesByType: (type: FeatureType) => BaseNode[]
  getNodesByTags: (tags: string[]) => BaseNode[]
  
  // Utility operations
  clearStore: () => void
  getNodeById: (nodeId: string) => BaseNode | undefined
  getRelationshipsByNode: (nodeId: string) => NodeRelationship[]
  getAIAgentByNode: (nodeId: string) => AIAgentConfig | undefined
}

export const useUnifiedNodeStore = create<UnifiedNodeStore>()(
  immer((set, get) => ({
    nodes: [],
    relationships: [],
    aiAgents: new Map(),
    selectedNodeId: null,
    selectedFeature: null,
    searchQuery: '',
    filters: {
      nodeTypes: [],
      features: [],
      tags: []
    },
    
    // Node operations
    addNode: (node) => set((state) => {
      state.nodes.push(node)
    }),
    
    updateNode: (nodeId, updates) => set((state) => {
      const nodeIndex = state.nodes.findIndex(n => n.nodeId === nodeId)
      if (nodeIndex !== -1) {
        state.nodes[nodeIndex] = { ...state.nodes[nodeIndex], ...updates }
      }
    }),
    
    deleteNode: (nodeId) => set((state) => {
      state.nodes = state.nodes.filter(n => n.nodeId !== nodeId)
      state.relationships = state.relationships.filter(
        r => r.sourceNodeId !== nodeId && r.targetNodeId !== nodeId
      )
      state.aiAgents.delete(nodeId)
      if (state.selectedNodeId === nodeId) {
        state.selectedNodeId = null
      }
    }),
    
    selectNode: (nodeId) => set((state) => {
      state.selectedNodeId = nodeId
    }),
    
    selectFeature: (feature) => set((state) => {
      state.selectedFeature = feature
    }),
    
    // Relationship operations
    addRelationship: (relationship) => set((state) => {
      state.relationships.push(relationship)
    }),
    
    removeRelationship: (relationshipId) => set((state) => {
      state.relationships = state.relationships.filter(r => r.relationshipId !== relationshipId)
    }),
    
    updateRelationship: (relationshipId, updates) => set((state) => {
      const relIndex = state.relationships.findIndex(r => r.relationshipId === relationshipId)
      if (relIndex !== -1) {
        state.relationships[relIndex] = { ...state.relationships[relIndex], ...updates }
      }
    }),
    
    // AI Agent operations
    addAIAgent: (nodeId, agent) => set((state) => {
      state.aiAgents.set(nodeId, agent)
    }),
    
    updateAIAgent: (nodeId, updates) => set((state) => {
      const agent = state.aiAgents.get(nodeId)
      if (agent) {
        state.aiAgents.set(nodeId, { ...agent, ...updates })
      }
    }),
    
    removeAIAgent: (nodeId) => set((state) => {
      state.aiAgents.delete(nodeId)
    }),
    
    // Search and filter operations
    setSearchQuery: (query) => set((state) => {
      state.searchQuery = query
    }),
    
    setFilters: (filters) => set((state) => {
      state.filters = { ...state.filters, ...filters }
    }),
    
    clearFilters: () => set((state) => {
      state.filters = {
        nodeTypes: [],
        features: [],
        tags: []
      }
    }),
    
    // Cross-feature operations
    linkNodes: (sourceId, targetId, type) => set((state) => {
      const relationship: NodeRelationship = {
        relationshipId: `${sourceId}-${targetId}-${Date.now()}`,
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        relationshipType: type,
        metadata: {
          strength: 1.0,
          bidirectional: false
        },
        createdAt: new Date()
      }
      state.relationships.push(relationship)
    }),
    
    getRelatedNodes: (nodeId) => {
      const state = get()
      const relatedIds = new Set<string>()
      
      state.relationships.forEach(rel => {
        if (rel.sourceNodeId === nodeId) {
          relatedIds.add(rel.targetNodeId)
        } else if (rel.targetNodeId === nodeId) {
          relatedIds.add(rel.sourceNodeId)
        }
      })
      
      return state.nodes.filter(node => relatedIds.has(node.nodeId))
    },
    
    getNodesByFeature: (feature) => {
      const state = get()
      return state.nodes.filter(node => node.metadata.feature === feature)
    },
    
    getNodesByType: (type) => {
      const state = get()
      return state.nodes.filter(node => node.type === type)
    },
    
    getNodesByTags: (tags) => {
      const state = get()
      return state.nodes.filter(node => 
        tags.some(tag => node.metadata.tags.includes(tag))
      )
    },
    
    // Utility operations
    clearStore: () => set((state) => {
      state.nodes = []
      state.relationships = []
      state.aiAgents.clear()
      state.selectedNodeId = null
      state.selectedFeature = null
      state.searchQuery = ''
      state.filters = {
        nodeTypes: [],
        features: [],
        tags: []
      }
    }),
    
    getNodeById: (nodeId) => {
      const state = get()
      return state.nodes.find(node => node.nodeId === nodeId)
    },
    
    getRelationshipsByNode: (nodeId) => {
      const state = get()
      return state.relationships.filter(
        rel => rel.sourceNodeId === nodeId || rel.targetNodeId === nodeId
      )
    },
    
    getAIAgentByNode: (nodeId) => {
      const state = get()
      return state.aiAgents.get(nodeId)
    }
  }))
)

// Selector hooks for better performance
export const useSelectedNode = () => {
  const selectedNodeId = useUnifiedNodeStore(state => state.selectedNodeId)
  const getNodeById = useUnifiedNodeStore(state => state.getNodeById)
  
  return selectedNodeId ? getNodeById(selectedNodeId) : null
}

export const useSelectedFeature = () => {
  const selectedFeature = useUnifiedNodeStore(state => state.selectedFeature)
  const getNodesByFeature = useUnifiedNodeStore(state => state.getNodesByFeature)
  
  return selectedFeature ? getNodesByFeature(selectedFeature) : []
}

export const useFilteredNodes = () => {
  const nodes = useUnifiedNodeStore(state => state.nodes)
  const filters = useUnifiedNodeStore(state => state.filters)
  const searchQuery = useUnifiedNodeStore(state => state.searchQuery)
  
  return nodes.filter(node => {
    // Apply search filter
    if (searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !node.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    // Apply node type filter
    if (filters.nodeTypes.length > 0 && !filters.nodeTypes.includes(node.nodeType)) {
      return false
    }
    
    // Apply feature filter
    if (filters.features.length > 0 && !filters.features.includes(node.metadata.feature)) {
      return false
    }
    
    // Apply tag filter
    if (filters.tags.length > 0 && !filters.tags.some(tag => node.metadata.tags.includes(tag))) {
      return false
    }
    
    return true
  })
}

export const useNodeRelationships = (nodeId: string) => {
  const getRelationshipsByNode = useUnifiedNodeStore(state => state.getRelationshipsByNode)
  
  return getRelationshipsByNode(nodeId)
}

export const useNodeAIAgent = (nodeId: string) => {
  const getAIAgentByNode = useUnifiedNodeStore(state => state.getAIAgentByNode)
  
  return getAIAgentByNode(nodeId)
}

// Action hooks for common operations
export const useNodeActions = () => {
  const addNode = useUnifiedNodeStore(state => state.addNode)
  const updateNode = useUnifiedNodeStore(state => state.updateNode)
  const deleteNode = useUnifiedNodeStore(state => state.deleteNode)
  const selectNode = useUnifiedNodeStore(state => state.selectNode)
  
  return {
    addNode,
    updateNode,
    deleteNode,
    selectNode
  }
}

export const useRelationshipActions = () => {
  const addRelationship = useUnifiedNodeStore(state => state.addRelationship)
  const removeRelationship = useUnifiedNodeStore(state => state.removeRelationship)
  const updateRelationship = useUnifiedNodeStore(state => state.updateRelationship)
  const linkNodes = useUnifiedNodeStore(state => state.linkNodes)
  
  return {
    addRelationship,
    removeRelationship,
    updateRelationship,
    linkNodes
  }
}

export const useAIAgentActions = () => {
  const addAIAgent = useUnifiedNodeStore(state => state.addAIAgent)
  const updateAIAgent = useUnifiedNodeStore(state => state.updateAIAgent)
  const removeAIAgent = useUnifiedNodeStore(state => state.removeAIAgent)
  
  return {
    addAIAgent,
    updateAIAgent,
    removeAIAgent
  }
}

export const useFilterActions = () => {
  const setSearchQuery = useUnifiedNodeStore(state => state.setSearchQuery)
  const setFilters = useUnifiedNodeStore(state => state.setFilters)
  const clearFilters = useUnifiedNodeStore(state => state.clearFilters)
  
  return {
    setSearchQuery,
    setFilters,
    clearFilters
  }
} 