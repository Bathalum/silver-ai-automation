// Entity Search Service
// This service provides unified search functionality across all entity types

import { createClient } from '@/lib/supabase/client'

export interface SearchResult {
  id: string
  type: 'function-model' | 'knowledge-base' | 'event-storm' | 'spindle'
  name: string
  description: string
  relevance: number
  metadata?: Record<string, any>
}

export interface SearchOptions {
  query: string
  types?: string[]
  limit?: number
  offset?: number
  filters?: Record<string, any>
}

export class EntitySearchService {
  private supabase = createClient()

  async searchEntities(options: SearchOptions): Promise<SearchResult[]> {
    const { query, types = [], limit = 50, offset = 0, filters = {} } = options
    
    const results: SearchResult[] = []
    
    // Search function models using node-based approach
    if (types.length === 0 || types.includes('function-model')) {
      try {
        const { getFunctionModelNodes } = await import('@/lib/application/use-cases/function-model-use-cases')
        
        // Get all function model nodes and filter by search query
        const allModels = await getFunctionModelNodes('all') // This would need to be implemented
        const functionModelResults = allModels
          .filter(model => 
            model.name.toLowerCase().includes(query.toLowerCase()) ||
            model.description.toLowerCase().includes(query.toLowerCase())
          )
          .map(model => ({
            id: model.nodeId,
            type: 'function-model' as const,
            name: model.name,
            description: model.description,
            relevance: this.calculateRelevance(query, model.name, model.description),
            metadata: model.metadata
          }))
        
        results.push(...functionModelResults)
      } catch (error) {
        console.error('Error searching function models:', error)
      }
    }
    
    // Search knowledge base
    if (types.length === 0 || types.includes('knowledge-base')) {
      try {
        const { searchSOPs } = await import('@/lib/use-cases/get-sops')
        const knowledgeBaseResults = await searchSOPs(query, limit, offset)
        
        results.push(...knowledgeBaseResults.map(sop => ({
          id: sop.id,
          type: 'knowledge-base' as const,
          name: sop.title,
          description: sop.content.substring(0, 200),
          relevance: this.calculateRelevance(query, sop.title, sop.content),
          metadata: { category: sop.category, status: sop.status }
        })))
      } catch (error) {
        console.error('Error searching knowledge base:', error)
      }
    }
    
    // Sort by relevance and apply limit
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)
  }
  
  private calculateRelevance(query: string, name: string, description: string): number {
    const queryLower = query.toLowerCase()
    const nameLower = name.toLowerCase()
    const descriptionLower = description.toLowerCase()
    
    let relevance = 0
    
    // Exact name match gets highest score
    if (nameLower === queryLower) relevance += 100
    // Name contains query
    else if (nameLower.includes(queryLower)) relevance += 50
    // Description contains query
    if (descriptionLower.includes(queryLower)) relevance += 25
    
    return relevance
  }
  
  async getEntityById(id: string, type: string): Promise<SearchResult | null> {
    try {
      switch (type) {
        case 'function-model':
          const { getNodeById } = await import('@/lib/application/use-cases/function-model-use-cases')
          const node = await getNodeById(id, 'default-model-id')
          if (!node) return null
          
          return {
            id: node.nodeId,
            type: 'function-model',
            name: node.name,
            description: node.description,
            relevance: 1,
            metadata: node.metadata
          }
          
        case 'knowledge-base':
          const { getSOPById } = await import('@/lib/use-cases/get-sops')
          const sop = await getSOPById(id)
          if (!sop) return null
          
          return {
            id: sop.id,
            type: 'knowledge-base',
            name: sop.title,
            description: sop.content.substring(0, 200),
            relevance: 1,
            metadata: { category: sop.category, status: sop.status }
          }
          
        default:
          return null
      }
    } catch (error) {
      console.error(`Error getting entity by ID: ${error}`)
      return null
    }
  }
} 