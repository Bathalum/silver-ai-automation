"use client"

import { useMemo } from "react"
import { useSOPById } from "@/app/(private)/dashboard/knowledge-base/hooks/use-knowledge-base"
import { useUnifiedNodes } from "@/hooks/use-unified-nodes"
import type { SOP, LinkedEntity } from "@/lib/domain/entities/knowledge-base-types"
import type { BaseNode } from "@/lib/domain/entities/unified-node-types"

// Utility function to convert BaseNode to LinkedEntity
function nodeToLinkedEntity(node: BaseNode): LinkedEntity {
  return {
    id: node.nodeId,
    title: node.name,
    type: node.type as "function-model" | "event-storm" | "spindle",
    description: node.description
  }
}

export interface KnowledgeBaseSidebarData {
  currentSOP: SOP | null
  linkedFunctionModels: LinkedEntity[]
  linkedEventStorms: LinkedEntity[]
  linkedSpindles: LinkedEntity[]
  statistics: {
    totalSOPs: number
    totalViews: number
    totalLinkedEntities: number
    lastUpdated: Date
  }
}

export function useKnowledgeBaseSidebar(currentSOPId?: string): KnowledgeBaseSidebarData {
  const { sop } = useSOPById(currentSOPId || '')
  const { nodes: allNodes } = useUnifiedNodes()
  
  // Get linked entities from node relationships
  const linkedEntities = useMemo(() => {
    if (!sop) return { functionModels: [], eventStorms: [], spindles: [] }
    
    // Find linked nodes by relationships with null checks
    const linkedNodeIds = [
      ...(sop.linkedFunctionModels || []),
      ...(sop.linkedEventStorms || []),
      ...(sop.linkedSpindles || [])
    ]
    
    const linkedNodes = allNodes.filter(node => 
      linkedNodeIds.includes(node.nodeId)
    )
    
    return {
      functionModels: linkedNodes.filter(n => n.type === 'function-model'),
      eventStorms: linkedNodes.filter(n => n.type === 'event-storm'),
      spindles: linkedNodes.filter(n => n.type === 'spindle')
    }
  }, [sop, allNodes])
  
  // Calculate statistics
  const statistics = useMemo(() => {
    const knowledgeBaseNodes = allNodes.filter(n => n.type === 'knowledge-base')
    const totalViews = knowledgeBaseNodes.reduce((sum, n) => {
      const readTime = n.metadata.knowledgeBase?.sop?.readTime || 0
      return sum + readTime
    }, 0)
    
    const totalLinkedEntities = linkedEntities.functionModels.length + 
                               linkedEntities.eventStorms.length + 
                               linkedEntities.spindles.length
    
    const lastUpdated = knowledgeBaseNodes.length > 0 
      ? new Date(Math.max(...knowledgeBaseNodes.map(n => n.updatedAt.getTime())))
      : new Date()
    
    return {
      totalSOPs: knowledgeBaseNodes.length,
      totalViews,
      totalLinkedEntities,
      lastUpdated
    }
  }, [allNodes, linkedEntities])
  
  return {
    currentSOP: sop,
    linkedFunctionModels: linkedEntities.functionModels.map(nodeToLinkedEntity),
    linkedEventStorms: linkedEntities.eventStorms.map(nodeToLinkedEntity),
    linkedSpindles: linkedEntities.spindles.map(nodeToLinkedEntity),
    statistics
  }
} 