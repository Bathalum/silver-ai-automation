import { useState, useEffect, useCallback } from "react"
import { useUnifiedNodes, useNode } from "@/hooks/use-unified-nodes"
import { useUnifiedNodeStore } from "@/lib/stores/unified-node-store"
import { unifiedNodeToSOP } from "@/lib/domain/entities/unified-node-types"
import type { SOP, KnowledgeBaseFilters } from "@/lib/domain/entities/knowledge-base-types"
import type { BaseNode } from "@/lib/domain/entities/unified-node-types"

export function useKnowledgeBase() {
  const { nodes, loading, loadNodesByFeature, createNode, updateNode, deleteNode } = useUnifiedNodes()
  const { getNodesByFeature } = useUnifiedNodeStore()
  const [filters, setFilters] = useState<KnowledgeBaseFilters>({
    search: "",
    category: "",
    status: "",
    tags: []
  })

  // Convert nodes to SOPs
  const sops = nodes
    .filter(node => node.type === 'knowledge-base')
    .map(node => {
      try {
        const sop = unifiedNodeToSOP(node)
        // Ensure all arrays have default values
        return {
          ...sop,
          tags: sop.tags || [],
          linkedFunctionModels: sop.linkedFunctionModels || [],
          linkedEventStorms: sop.linkedEventStorms || [],
          linkedSpindles: sop.linkedSpindles || [],
          searchKeywords: sop.searchKeywords || []
        }
      } catch (error) {
        console.error('Error converting node to SOP:', error)
        return null
      }
    })
    .filter((sop): sop is SOP => sop !== null)

  // Apply filters to SOPs
  const filteredSOPs = sops.filter(sop => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (!sop.title.toLowerCase().includes(searchLower) &&
          !sop.content.toLowerCase().includes(searchLower) &&
          !sop.tags.some(tag => tag.toLowerCase().includes(searchLower))) {
        return false
      }
    }

    if (filters.category && sop.category !== filters.category) {
      return false
    }

    if (filters.status && sop.status !== filters.status) {
      return false
    }

    if (filters.tags.length > 0 && !filters.tags.some(tag => sop.tags.includes(tag))) {
      return false
    }

    return true
  })

  // Load knowledge base nodes on mount
  useEffect(() => {
    loadNodesByFeature('knowledge-base')
  }, [loadNodesByFeature])

  const updateFilters = useCallback((newFilters: Partial<KnowledgeBaseFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      category: "",
      status: "",
      tags: []
    })
  }, [])

  const createSOPNode = useCallback(async (sopData: any) => {
    const newNode: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'> = {
      type: 'knowledge-base',
      nodeType: 'sop',
      name: sopData.title,
      description: sopData.summary,
      position: { x: 0, y: 0 },
      metadata: {
        feature: 'knowledge-base',
        version: '1.0',
        tags: sopData.tags || [],
        knowledgeBase: {
          sop: sopData,
          content: sopData.content,
          category: sopData.category,
          status: 'draft'
        }
      }
    }
    
    return await createNode(newNode)
  }, [createNode])

  const updateSOPNode = useCallback(async (nodeId: string, updates: any) => {
    const node = nodes.find(n => n.nodeId === nodeId)
    if (!node) return null

    const updatedNode = await updateNode(nodeId, {
      name: updates.title || node.name,
      description: updates.summary || node.description,
      metadata: {
        ...node.metadata,
        knowledgeBase: {
          ...node.metadata.knowledgeBase,
          sop: { ...node.metadata.knowledgeBase?.sop, ...updates },
          content: updates.content || node.metadata.knowledgeBase?.content,
          category: updates.category || node.metadata.knowledgeBase?.category,
          status: updates.status || node.metadata.knowledgeBase?.status
        }
      }
    })

    return updatedNode
  }, [nodes, updateNode])

  const deleteSOPNode = useCallback(async (nodeId: string) => {
    await deleteNode(nodeId)
  }, [deleteNode])

  return {
    sops: filteredSOPs,
    loading,
    filters,
    updateFilters,
    clearFilters,
    createSOPNode,
    updateSOPNode,
    deleteSOPNode,
    reload: () => loadNodesByFeature('knowledge-base')
  }
}

export function useSOPById(id: string) {
  const { node, loading, error, updateNode, deleteNode, reload } = useNode(id)
  const [sop, setSOP] = useState<SOP | null>(null)

  useEffect(() => {
    if (node && node.type === 'knowledge-base') {
      try {
        const sopData = unifiedNodeToSOP(node)
        setSOP(sopData)
      } catch (error) {
        console.error('Error converting node to SOP:', error)
        setSOP(null)
      }
    } else {
      setSOP(null)
    }
  }, [node])

  const updateSOP = useCallback(async (updates: any) => {
    if (!node) return null

    const updatedNode = await updateNode({
      name: updates.title || node.name,
      description: updates.summary || node.description,
      metadata: {
        ...node.metadata,
        knowledgeBase: {
          ...node.metadata.knowledgeBase,
          sop: { ...node.metadata.knowledgeBase?.sop, ...updates },
          content: updates.content || node.metadata.knowledgeBase?.content,
          category: updates.category || node.metadata.knowledgeBase?.category,
          status: updates.status || node.metadata.knowledgeBase?.status
        }
      }
    })

    return updatedNode
  }, [node, updateNode])

  return {
    sop,
    loading,
    error,
    updateSOP,
    deleteSOP: deleteNode,
    reload
  }
} 