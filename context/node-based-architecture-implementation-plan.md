# Node-Based Architecture Implementation Plan

## Overview

This plan outlines the implementation of a unified node-based architecture for the Silver AI Automation platform. The architecture will support AI integration, multi-database compatibility, and seamless cross-feature relationships while maintaining your established Clean Architecture and Component-Based Design principles.

## Current Architecture Analysis

### ✅ Verified Node-Based Foundation

Your application already has a strong node-based foundation:

1. **Function Model**: Uses `StageNode`, `ActionTableNode`, `IONode`, `FunctionModelContainerNode`
2. **Event Storm**: Uses `DomainNode` and `EventNode` 
3. **Spindle**: Uses generic nodes with `input`, `default`, `output` types
4. **Knowledge Base**: Uses `SOP` entities with cross-feature linking capabilities

### Current Patterns Identified

1. **Clean Architecture**: Domain entities in `/lib/domain/entities/`, use cases in `/lib/use-cases/`, infrastructure in `/lib/infrastructure/`
2. **Component-Based Design**: Base components in `/components/ui/`, composites in `/components/composites/`, feature components in `/app/(private)/dashboard/[feature]/components/`
3. **State Management**: Custom hooks following patterns like `useKnowledgeBase` and `useSOPById`
4. **Data Flow**: Use cases → Custom hooks → Feature components → Composite components → Base components
5. **Supabase Integration**: Client and server-side Supabase setup with authentication middleware

## Implementation Strategy

### Phase 1: Unified Node Schema & Database Foundation

#### 1.1 Database Schema Design

**Objective**: Create a unified database schema that supports all node types while maintaining backward compatibility.

**SQL Schema**:
```sql
-- Unified nodes table
CREATE TABLE nodes (
  node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'function-model' | 'event-storm' | 'spindle' | 'knowledge-base'
  node_type VARCHAR(50) NOT NULL, -- specific node type within feature
  name VARCHAR(255) NOT NULL,
  description TEXT,
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Node relationships table
CREATE TABLE node_relationships (
  relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id UUID REFERENCES nodes(node_id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES nodes(node_id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL, -- 'parent-child' | 'sibling' | 'reference' | 'dependency'
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI agents table
CREATE TABLE ai_agents (
  agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(node_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  instructions TEXT,
  tools JSONB NOT NULL DEFAULT '[]',
  capabilities JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_node_type ON nodes(node_type);
CREATE INDEX idx_nodes_metadata_feature ON nodes((metadata->>'feature'));
CREATE INDEX idx_node_relationships_source ON node_relationships(source_node_id);
CREATE INDEX idx_node_relationships_target ON node_relationships(target_node_id);
CREATE INDEX idx_ai_agents_node_id ON ai_agents(node_id);
```

#### 1.2 Domain Layer Updates

**Location**: `/lib/domain/entities/`

**New Files**:
```typescript
// lib/domain/entities/unified-node-types.ts
export interface BaseNode {
  nodeId: string
  type: 'function-model' | 'event-storm' | 'spindle' | 'knowledge-base'
  nodeType: string
  name: string
  description: string
  position: { x: number; y: number }
  metadata: NodeMetadata
  createdAt: Date
  updatedAt: Date
}

export interface NodeMetadata {
  feature: string
  version: string
  tags: string[]
  aiAgent?: AIAgentConfig
  vectorEmbedding?: number[]
  graphProperties?: Record<string, any>
  // Feature-specific data
  functionModel?: FunctionModelData
  eventStorm?: EventStormData
  spindle?: SpindleData
  knowledgeBase?: KnowledgeBaseData
}

export interface AIAgentConfig {
  enabled: boolean
  instructions: string
  tools: AITool[]
  capabilities: {
    reasoning: boolean
    toolUse: boolean
    memory: boolean
    learning: boolean
  }
  metadata: {
    model: string
    temperature: number
    maxTokens: number
    contextWindow: number
  }
}

export interface AITool {
  name: string
  description: string
  parameters: Record<string, any>
  mcpServer?: string
}

export interface NodeRelationship {
  relationshipId: string
  sourceNodeId: string
  targetNodeId: string
  relationshipType: 'parent-child' | 'sibling' | 'reference' | 'dependency'
  metadata: {
    sourceHandle?: string
    targetHandle?: string
    strength: number
    bidirectional: boolean
  }
  createdAt: Date
}

// Feature-specific data interfaces
export interface FunctionModelData {
  stage?: Stage
  action?: ActionItem
  io?: DataPort
  container?: FunctionModelContainer
}

export interface EventStormData {
  domain?: Domain
  event?: Event
}

export interface SpindleData {
  label: string
  description?: string
}

export interface KnowledgeBaseData {
  sop?: SOP
  content: string
  category: string
  status: 'draft' | 'published' | 'archived'
}
```

#### 1.3 Infrastructure Layer Updates

**Location**: `/lib/infrastructure/`

**New Files**:
```typescript
// lib/infrastructure/unified-node-repository.ts
import { createClient } from '@/lib/supabase/server'
import type { BaseNode, NodeRelationship, AIAgentConfig } from '@/lib/domain/entities/unified-node-types'

export interface NodeRepository {
  // Node operations
  createNode: (node: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'>) => Promise<BaseNode>
  getNode: (nodeId: string) => Promise<BaseNode | null>
  updateNode: (nodeId: string, updates: Partial<BaseNode>) => Promise<BaseNode>
  deleteNode: (nodeId: string) => Promise<void>
  getNodesByType: (type: string) => Promise<BaseNode[]>
  getNodesByFeature: (feature: string) => Promise<BaseNode[]>
  
  // Relationship operations
  createRelationship: (relationship: Omit<NodeRelationship, 'relationshipId' | 'createdAt'>) => Promise<NodeRelationship>
  getNodeRelationships: (nodeId: string) => Promise<NodeRelationship[]>
  deleteRelationship: (relationshipId: string) => Promise<void>
  
  // AI Agent operations
  createAIAgent: (nodeId: string, config: AIAgentConfig) => Promise<void>
  updateAIAgent: (nodeId: string, config: Partial<AIAgentConfig>) => Promise<void>
  getAIAgent: (nodeId: string) => Promise<AIAgentConfig | null>
}

export class SupabaseNodeRepository implements NodeRepository {
  async createNode(node: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<BaseNode> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('nodes')
      .insert({
        type: node.type,
        node_type: node.nodeType,
        name: node.name,
        description: node.description,
        position_x: node.position.x,
        position_y: node.position.y,
        metadata: node.metadata
      })
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create node: ${error.message}`)
    
    return this.mapToBaseNode(data)
  }
  
  async getNode(nodeId: string): Promise<BaseNode | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('node_id', nodeId)
      .single()
    
    if (error) return null
    
    return this.mapToBaseNode(data)
  }
  
  async updateNode(nodeId: string, updates: Partial<BaseNode>): Promise<BaseNode> {
    const supabase = await createClient()
    
    const updateData: any = {}
    if (updates.name) updateData.name = updates.name
    if (updates.description) updateData.description = updates.description
    if (updates.position) {
      updateData.position_x = updates.position.x
      updateData.position_y = updates.position.y
    }
    if (updates.metadata) updateData.metadata = updates.metadata
    updateData.updated_at = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('nodes')
      .update(updateData)
      .eq('node_id', nodeId)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to update node: ${error.message}`)
    
    return this.mapToBaseNode(data)
  }
  
  async deleteNode(nodeId: string): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('nodes')
      .delete()
      .eq('node_id', nodeId)
    
    if (error) throw new Error(`Failed to delete node: ${error.message}`)
  }
  
  async getNodesByType(type: string): Promise<BaseNode[]> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('type', type)
    
    if (error) throw new Error(`Failed to get nodes: ${error.message}`)
    
    return data.map(this.mapToBaseNode)
  }
  
  async getNodesByFeature(feature: string): Promise<BaseNode[]> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('metadata->>feature', feature)
    
    if (error) throw new Error(`Failed to get nodes: ${error.message}`)
    
    return data.map(this.mapToBaseNode)
  }
  
  async createRelationship(relationship: Omit<NodeRelationship, 'relationshipId' | 'createdAt'>): Promise<NodeRelationship> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('node_relationships')
      .insert({
        source_node_id: relationship.sourceNodeId,
        target_node_id: relationship.targetNodeId,
        relationship_type: relationship.relationshipType,
        metadata: relationship.metadata
      })
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create relationship: ${error.message}`)
    
    return this.mapToNodeRelationship(data)
  }
  
  async getNodeRelationships(nodeId: string): Promise<NodeRelationship[]> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('node_relationships')
      .select('*')
      .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)
    
    if (error) throw new Error(`Failed to get relationships: ${error.message}`)
    
    return data.map(this.mapToNodeRelationship)
  }
  
  async deleteRelationship(relationshipId: string): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('node_relationships')
      .delete()
      .eq('relationship_id', relationshipId)
    
    if (error) throw new Error(`Failed to delete relationship: ${error.message}`)
  }
  
  async createAIAgent(nodeId: string, config: AIAgentConfig): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('ai_agents')
      .insert({
        node_id: nodeId,
        name: config.metadata?.model || 'Default Agent',
        instructions: config.instructions,
        tools: config.tools,
        capabilities: config.capabilities,
        metadata: config.metadata
      })
    
    if (error) throw new Error(`Failed to create AI agent: ${error.message}`)
  }
  
  async updateAIAgent(nodeId: string, config: Partial<AIAgentConfig>): Promise<void> {
    const supabase = await createClient()
    
    const updateData: any = {}
    if (config.instructions) updateData.instructions = config.instructions
    if (config.tools) updateData.tools = config.tools
    if (config.capabilities) updateData.capabilities = config.capabilities
    if (config.metadata) updateData.metadata = config.metadata
    updateData.updated_at = new Date().toISOString()
    
    const { error } = await supabase
      .from('ai_agents')
      .update(updateData)
      .eq('node_id', nodeId)
    
    if (error) throw new Error(`Failed to update AI agent: ${error.message}`)
  }
  
  async getAIAgent(nodeId: string): Promise<AIAgentConfig | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('node_id', nodeId)
      .single()
    
    if (error) return null
    
    return {
      enabled: true,
      instructions: data.instructions || '',
      tools: data.tools || [],
      capabilities: data.capabilities || {},
      metadata: data.metadata || {}
    }
  }
  
  private mapToBaseNode(data: any): BaseNode {
    return {
      nodeId: data.node_id,
      type: data.type,
      nodeType: data.node_type,
      name: data.name,
      description: data.description,
      position: { x: data.position_x, y: data.position_y },
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }
  
  private mapToNodeRelationship(data: any): NodeRelationship {
    return {
      relationshipId: data.relationship_id,
      sourceNodeId: data.source_node_id,
      targetNodeId: data.target_node_id,
      relationshipType: data.relationship_type,
      metadata: data.metadata,
      createdAt: new Date(data.created_at)
    }
  }
}
```

### Phase 2: Application Layer Updates

#### 2.1 Use Cases Updates

**Location**: `/lib/use-cases/`

**New Files**:
```typescript
// lib/use-cases/node-operations.ts
import type { BaseNode, NodeRelationship, AIAgentConfig } from '@/lib/domain/entities/unified-node-types'
import { SupabaseNodeRepository } from '@/lib/infrastructure/unified-node-repository'

const nodeRepository = new SupabaseNodeRepository()

export const createNode = async (node: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<BaseNode> => {
  // Business logic validation
  if (!node.name.trim()) {
    throw new Error('Node name is required')
  }
  
  if (!node.type || !node.nodeType) {
    throw new Error('Node type and node type are required')
  }
  
  return await nodeRepository.createNode(node)
}

export const getNode = async (nodeId: string): Promise<BaseNode | null> => {
  return await nodeRepository.getNode(nodeId)
}

export const updateNode = async (nodeId: string, updates: Partial<BaseNode>): Promise<BaseNode> => {
  // Business logic validation
  if (updates.name && !updates.name.trim()) {
    throw new Error('Node name cannot be empty')
  }
  
  return await nodeRepository.updateNode(nodeId, updates)
}

export const deleteNode = async (nodeId: string): Promise<void> => {
  // Check for dependencies before deletion
  const relationships = await nodeRepository.getNodeRelationships(nodeId)
  if (relationships.length > 0) {
    throw new Error('Cannot delete node with active relationships')
  }
  
  await nodeRepository.deleteNode(nodeId)
}

export const getNodesByFeature = async (feature: string): Promise<BaseNode[]> => {
  return await nodeRepository.getNodesByFeature(feature)
}

export const createRelationship = async (
  sourceNodeId: string, 
  targetNodeId: string, 
  relationshipType: NodeRelationship['relationshipType'],
  metadata?: NodeRelationship['metadata']
): Promise<NodeRelationship> => {
  // Business logic validation
  if (sourceNodeId === targetNodeId) {
    throw new Error('Cannot create relationship to self')
  }
  
  const sourceNode = await nodeRepository.getNode(sourceNodeId)
  const targetNode = await nodeRepository.getNode(targetNodeId)
  
  if (!sourceNode || !targetNode) {
    throw new Error('Source or target node not found')
  }
  
  return await nodeRepository.createRelationship({
    sourceNodeId,
    targetNodeId,
    relationshipType,
    metadata: metadata || {}
  })
}

export const getNodeRelationships = async (nodeId: string): Promise<NodeRelationship[]> => {
  return await nodeRepository.getNodeRelationships(nodeId)
}

export const createAIAgent = async (nodeId: string, config: AIAgentConfig): Promise<void> => {
  // Business logic validation
  if (!config.instructions.trim()) {
    throw new Error('AI agent instructions are required')
  }
  
  await nodeRepository.createAIAgent(nodeId, config)
}

export const updateAIAgent = async (nodeId: string, config: Partial<AIAgentConfig>): Promise<void> => {
  await nodeRepository.updateAIAgent(nodeId, config)
}

export const getAIAgent = async (nodeId: string): Promise<AIAgentConfig | null> => {
  return await nodeRepository.getAIAgent(nodeId)
}
```

#### 2.2 Custom Hooks Updates

**Location**: `/hooks/` and feature-specific hooks

**New Files**:
```typescript
// hooks/use-unified-nodes.ts
import { useState, useEffect, useCallback } from 'react'
import type { BaseNode, NodeRelationship, AIAgentConfig } from '@/lib/domain/entities/unified-node-types'
import * as nodeOperations from '@/lib/use-cases/node-operations'

export function useUnifiedNodes() {
  const [nodes, setNodes] = useState<BaseNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNodesByFeature = useCallback(async (feature: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const featureNodes = await nodeOperations.getNodesByFeature(feature)
      setNodes(featureNodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load nodes')
      console.error('Error loading nodes:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createNode = useCallback(async (node: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newNode = await nodeOperations.createNode(node)
      setNodes(prev => [...prev, newNode])
      return newNode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node')
      throw err
    }
  }, [])

  const updateNode = useCallback(async (nodeId: string, updates: Partial<BaseNode>) => {
    try {
      const updatedNode = await nodeOperations.updateNode(nodeId, updates)
      setNodes(prev => prev.map(node => node.nodeId === nodeId ? updatedNode : node))
      return updatedNode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update node')
      throw err
    }
  }, [])

  const deleteNode = useCallback(async (nodeId: string) => {
    try {
      await nodeOperations.deleteNode(nodeId)
      setNodes(prev => prev.filter(node => node.nodeId !== nodeId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete node')
      throw err
    }
  }, [])

  return {
    nodes,
    loading,
    error,
    loadNodesByFeature,
    createNode,
    updateNode,
    deleteNode
  }
}

export function useNodeRelationships(nodeId: string) {
  const [relationships, setRelationships] = useState<NodeRelationship[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRelationships = useCallback(async () => {
    if (!nodeId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const nodeRelationships = await nodeOperations.getNodeRelationships(nodeId)
      setRelationships(nodeRelationships)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load relationships')
      console.error('Error loading relationships:', err)
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  const createRelationship = useCallback(async (
    targetNodeId: string,
    relationshipType: NodeRelationship['relationshipType'],
    metadata?: NodeRelationship['metadata']
  ) => {
    try {
      const newRelationship = await nodeOperations.createRelationship(
        nodeId,
        targetNodeId,
        relationshipType,
        metadata
      )
      setRelationships(prev => [...prev, newRelationship])
      return newRelationship
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship')
      throw err
    }
  }, [nodeId])

  useEffect(() => {
    loadRelationships()
  }, [loadRelationships])

  return {
    relationships,
    loading,
    error,
    createRelationship,
    reload: loadRelationships
  }
}

export function useAIAgent(nodeId: string) {
  const [agent, setAgent] = useState<AIAgentConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAgent = useCallback(async () => {
    if (!nodeId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const aiAgent = await nodeOperations.getAIAgent(nodeId)
      setAgent(aiAgent)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI agent')
      console.error('Error loading AI agent:', err)
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  const createAgent = useCallback(async (config: AIAgentConfig) => {
    try {
      await nodeOperations.createAIAgent(nodeId, config)
      setAgent(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create AI agent')
      throw err
    }
  }, [nodeId])

  const updateAgent = useCallback(async (config: Partial<AIAgentConfig>) => {
    try {
      await nodeOperations.updateAIAgent(nodeId, config)
      setAgent(prev => prev ? { ...prev, ...config } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update AI agent')
      throw err
    }
  }, [nodeId])

  useEffect(() => {
    loadAgent()
  }, [loadAgent])

  return {
    agent,
    loading,
    error,
    createAgent,
    updateAgent,
    reload: loadAgent
  }
}
```

### Phase 3: Component Layer Updates

#### 3.1 Unified Node Store

**Location**: `/lib/stores/`

**New Files**:
```typescript
// lib/stores/unified-node-store.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { BaseNode, NodeRelationship, AIAgentConfig } from '@/lib/domain/entities/unified-node-types'

interface UnifiedNodeStore {
  // State
  nodes: BaseNode[]
  relationships: NodeRelationship[]
  aiAgents: Map<string, AIAgentConfig>
  selectedNodeId: string | null
  
  // Node operations
  addNode: (node: BaseNode) => void
  updateNode: (nodeId: string, updates: Partial<BaseNode>) => void
  deleteNode: (nodeId: string) => void
  selectNode: (nodeId: string | null) => void
  
  // Relationship operations
  addRelationship: (relationship: NodeRelationship) => void
  removeRelationship: (relationshipId: string) => void
  
  // AI Agent operations
  addAIAgent: (nodeId: string, agent: AIAgentConfig) => void
  updateAIAgent: (nodeId: string, updates: Partial<AIAgentConfig>) => void
  removeAIAgent: (nodeId: string) => void
  
  // Cross-feature operations
  linkNodes: (sourceId: string, targetId: string, type: string) => void
  getRelatedNodes: (nodeId: string) => BaseNode[]
  getNodesByFeature: (feature: string) => BaseNode[]
}

export const useUnifiedNodeStore = create<UnifiedNodeStore>()(
  immer((set, get) => ({
    nodes: [],
    relationships: [],
    aiAgents: new Map(),
    selectedNodeId: null,
    
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
    
    addRelationship: (relationship) => set((state) => {
      state.relationships.push(relationship)
    }),
    
    removeRelationship: (relationshipId) => set((state) => {
      state.relationships = state.relationships.filter(r => r.relationshipId !== relationshipId)
    }),
    
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
    
    linkNodes: (sourceId, targetId, type) => set((state) => {
      const relationship: NodeRelationship = {
        relationshipId: `${sourceId}-${targetId}-${Date.now()}`,
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        relationshipType: type as any,
        metadata: {},
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
    }
  }))
)
```

#### 3.2 Updated Feature Components

**Location**: `/app/(private)/dashboard/[feature]/components/`

**Example Updates**:
```typescript
// app/(private)/dashboard/function-model/components/function-process-dashboard.tsx
// Updated to use unified node store

import { useUnifiedNodeStore } from '@/lib/stores/unified-node-store'
import { useUnifiedNodes } from '@/hooks/use-unified-nodes'

export function FunctionProcessDashboard() {
  const { nodes, loading, createNode, updateNode, deleteNode } = useUnifiedNodes()
  const { getNodesByFeature } = useUnifiedNodeStore()
  
  // Load function model nodes
  useEffect(() => {
    const functionModelNodes = getNodesByFeature('function-model')
    // Update local state with function model specific nodes
  }, [getNodesByFeature])
  
  const handleAddStageNode = useCallback(() => {
    const newNode: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'> = {
      type: 'function-model',
      nodeType: 'stageNode',
      name: 'New Stage',
      description: 'New stage description',
      position: { x: 300, y: 200 },
      metadata: {
        feature: 'function-model',
        version: '1.0',
        tags: ['stage'],
        functionModel: {
          stage: {
            id: `stage-${Date.now()}`,
            name: 'New Stage',
            actions: [],
            dataChange: [],
            boundaryCriteria: []
          }
        }
      }
    }
    
    createNode(newNode)
  }, [createNode])
  
  // Rest of component implementation...
}
```

### Phase 4: Data Migration Strategy

#### 4.1 Migration Scripts

**Location**: `/scripts/migrations/`

```typescript
// scripts/migrations/migrate-to-unified-nodes.ts
import { createClient } from '@/lib/supabase/server'
import type { BaseNode } from '@/lib/domain/entities/unified-node-types'

export async function migrateFunctionModelNodes() {
  const supabase = await createClient()
  
  // Get existing function model data
  const { data: functionModels } = await supabase
    .from('function_models')
    .select('*')
  
  if (!functionModels) return
  
  for (const funcModel of functionModels) {
    // Create unified node
    const unifiedNode: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'> = {
      type: 'function-model',
      nodeType: 'functionModelContainer',
      name: funcModel.name,
      description: funcModel.description,
      position: { x: 0, y: 0 },
      metadata: {
        feature: 'function-model',
        version: '1.0',
        tags: ['function-model'],
        functionModel: {
          container: {
            id: funcModel.id,
            name: funcModel.name,
            description: funcModel.description,
            type: 'function-model'
          }
        }
      }
    }
    
    await supabase.from('nodes').insert(unifiedNode)
  }
}

export async function migrateEventStormNodes() {
  const supabase = await createClient()
  
  // Get existing event storm data
  const { data: eventStorms } = await supabase
    .from('event_storms')
    .select('*')
  
  if (!eventStorms) return
  
  for (const eventStorm of eventStorms) {
    // Create unified node
    const unifiedNode: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'> = {
      type: 'event-storm',
      nodeType: 'eventStormContainer',
      name: eventStorm.name,
      description: eventStorm.description,
      position: { x: 0, y: 0 },
      metadata: {
        feature: 'event-storm',
        version: '1.0',
        tags: ['event-storm'],
        eventStorm: {
          // Map existing event storm data
        }
      }
    }
    
    await supabase.from('nodes').insert(unifiedNode)
  }
}

export async function migrateKnowledgeBaseNodes() {
  const supabase = await createClient()
  
  // Get existing SOP data
  const { data: sops } = await supabase
    .from('sops')
    .select('*')
  
  if (!sops) return
  
  for (const sop of sops) {
    // Create unified node
    const unifiedNode: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'> = {
      type: 'knowledge-base',
      nodeType: 'sop',
      name: sop.title,
      description: sop.summary,
      position: { x: 0, y: 0 },
      metadata: {
        feature: 'knowledge-base',
        version: sop.version,
        tags: sop.tags,
        knowledgeBase: {
          sop: sop,
          content: sop.content,
          category: sop.category,
          status: sop.status
        }
      }
    }
    
    await supabase.from('nodes').insert(unifiedNode)
  }
}
```

### Phase 5: AI Integration

#### 5.1 AI Agent Management

**Location**: `/lib/ai/`

```typescript
// lib/ai/agent-manager.ts
import type { AIAgentConfig, AITool } from '@/lib/domain/entities/unified-node-types'

export interface AgentManager {
  createAgent: (nodeId: string, config: AIAgentConfig) => Promise<void>
  executeAgent: (agentId: string, task: string) => Promise<any>
  updateAgentInstructions: (agentId: string, instructions: string) => Promise<void>
  addToolToAgent: (agentId: string, tool: AITool) => Promise<void>
}

export class LocalAgentManager implements AgentManager {
  private agents = new Map<string, AIAgentConfig>()
  
  async createAgent(nodeId: string, config: AIAgentConfig): Promise<void> {
    this.agents.set(nodeId, config)
  }
  
  async executeAgent(agentId: string, task: string): Promise<any> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error('Agent not found')
    }
    
    // Execute agent logic based on instructions and tools
    return await this.executeAgentLogic(agent, task)
  }
  
  async updateAgentInstructions(agentId: string, instructions: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error('Agent not found')
    }
    
    agent.instructions = instructions
    this.agents.set(agentId, agent)
  }
  
  async addToolToAgent(agentId: string, tool: AITool): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error('Agent not found')
    }
    
    agent.tools.push(tool)
    this.agents.set(agentId, agent)
  }
  
  private async executeAgentLogic(agent: AIAgentConfig, task: string): Promise<any> {
    // Implement agent execution logic
    // This would integrate with actual AI services
    console.log(`Executing agent with instructions: ${agent.instructions}`)
    console.log(`Task: ${task}`)
    console.log(`Available tools: ${agent.tools.map(t => t.name).join(', ')}`)
    
    return { result: 'Agent execution completed', task, tools: agent.tools.length }
  }
}
```

### Phase 6: Vector Database Integration

#### 6.1 Vector Search Implementation

**Location**: `/lib/infrastructure/`

```typescript
// lib/infrastructure/vector-search-service.ts
import type { BaseNode } from '@/lib/domain/entities/unified-node-types'

export interface VectorSearchService {
  generateEmbedding: (text: string) => Promise<number[]>
  storeEmbedding: (nodeId: string, embedding: number[]) => Promise<void>
  searchSimilar: (query: string, limit?: number) => Promise<BaseNode[]>
}

export class MockVectorSearchService implements VectorSearchService {
  private embeddings = new Map<string, number[]>()
  
  async generateEmbedding(text: string): Promise<number[]> {
    // Mock embedding generation
    // In production, this would use OpenAI's text-embedding-ada-002 or similar
    return Array.from({ length: 1536 }, () => Math.random())
  }
  
  async storeEmbedding(nodeId: string, embedding: number[]): Promise<void> {
    this.embeddings.set(nodeId, embedding)
  }
  
  async searchSimilar(query: string, limit: number = 10): Promise<BaseNode[]> {
    const queryEmbedding = await this.generateEmbedding(query)
    
    // Mock similarity search
    // In production, this would use vector database like Pinecone or Weaviate
    const results: BaseNode[] = []
    
    for (const [nodeId, embedding] of this.embeddings.entries()) {
      const similarity = this.calculateCosineSimilarity(queryEmbedding, embedding)
      if (similarity > 0.7) { // Threshold
        // Mock node retrieval
        results.push({
          nodeId,
          type: 'knowledge-base',
          nodeType: 'sop',
          name: `Node ${nodeId}`,
          description: 'Mock description',
          position: { x: 0, y: 0 },
          metadata: { feature: 'knowledge-base', version: '1.0', tags: [] },
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    }
    
    return results.slice(0, limit)
  }
  
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (magnitudeA * magnitudeB)
  }
}
```

## Implementation Timeline

### Week 1-2: Database & Domain Layer
- [ ] Create database schema (nodes, node_relationships, ai_agents tables)
- [ ] Implement domain entities (unified-node-types.ts)
- [ ] Create infrastructure layer (unified-node-repository.ts)
- [ ] Implement use cases (node-operations.ts)

### Week 3-4: Application Layer & Hooks
- [ ] Create custom hooks (use-unified-nodes.ts)
- [ ] Implement unified node store (unified-node-store.ts)
- [ ] Update existing feature hooks to use unified system
- [ ] Create migration scripts

### Week 5-6: Component Integration
- [ ] Update Function Model components to use unified nodes
- [ ] Update Event Storm components to use unified nodes
- [ ] Update Spindle components to use unified nodes
- [ ] Update Knowledge Base components to use unified nodes

### Week 7-8: AI Integration & Advanced Features
- [ ] Implement AI agent management
- [ ] Add vector search capabilities
- [ ] Create cross-feature linking UI
- [ ] Implement graph database integration

### Week 9-10: Testing & Polish
- [ ] Comprehensive testing of all features
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Production deployment

## Benefits of This Implementation

1. **Unified Data Model**: All features use the same base node structure
2. **Flexible Relationships**: Easy to link nodes across features
3. **AI-Ready**: Built-in support for AI agents and tools
4. **Multi-Database Support**: Works with SQL, vector, and graph databases
5. **Scalable**: Can easily add new features and node types
6. **Searchable**: Vector embeddings enable semantic search
7. **Graph-Capable**: Relationship tracking enables graph queries
8. **Backward Compatible**: Existing features continue to work during migration

## Next Steps

1. **Review and Approve**: Review this plan and approve the implementation approach
2. **Set Up Database**: Create the Supabase tables and indexes
3. **Start with Domain Layer**: Implement the unified node types and repository
4. **Gradual Migration**: Migrate features one by one to avoid breaking changes
5. **Test Thoroughly**: Ensure all features work correctly with the new system

This implementation plan provides a structured approach to transform your application into a truly unified node-based system while maintaining your existing architecture patterns and ensuring a smooth transition. 