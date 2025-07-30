import type { SOP, KnowledgeBaseFilters } from "../domain/entities/knowledge-base-types"
import { unifiedNodeToSOP } from "../domain/entities/unified-node-types"
import { SupabaseNodeRepository } from "../infrastructure/unified-node-repository"

const nodeRepository = new SupabaseNodeRepository()

export const getSOPs = async (filters: KnowledgeBaseFilters): Promise<SOP[]> => {
  try {
    // Get all knowledge base nodes from the repository
    const nodes = await nodeRepository.getNodesByFeature('knowledge-base')
    
    // Convert nodes to SOPs
    const sops = nodes.map(node => unifiedNodeToSOP(node))
    
    // Apply filters
    let filteredSOPs = sops

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredSOPs = filteredSOPs.filter(sop => 
        sop.title.toLowerCase().includes(searchLower) ||
        sop.content.toLowerCase().includes(searchLower) ||
        sop.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    if (filters.category) {
      filteredSOPs = filteredSOPs.filter(sop => sop.category === filters.category)
    }

    if (filters.status) {
      filteredSOPs = filteredSOPs.filter(sop => sop.status === filters.status)
    }

    if (filters.tags.length > 0) {
      filteredSOPs = filteredSOPs.filter(sop => 
        filters.tags.some((tag: string) => sop.tags.includes(tag))
      )
    }

    return filteredSOPs
  } catch (error) {
    console.error("Error loading SOPs from unified system:", error)
    return []
  }
}

export const getSOPById = async (id: string): Promise<SOP | null> => {
  try {
    const node = await nodeRepository.getNode(id)
    
    if (node && node.type === 'knowledge-base') {
      return unifiedNodeToSOP(node)
    }
    
    return null
  } catch (error) {
    console.error("Error loading SOP by ID:", error)
    return null
  }
} 