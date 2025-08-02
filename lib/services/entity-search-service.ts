import { FeatureType } from '@/lib/domain/entities/cross-feature-link-types'

export interface EntitySearchResult {
  id: string
  name: string
  description?: string
  type: FeatureType
  metadata?: Record<string, any>
  relevance?: number
}

export class EntitySearchService {
  // Search function models
  async searchFunctionModels(query: string): Promise<EntitySearchResult[]> {
    try {
      const { searchFunctionModels } = await import('@/lib/application/use-cases/function-model-persistence-use-cases')
      const models = await searchFunctionModels(query, {})
      
      return models.map(model => ({
        id: model.modelId,
        name: model.name,
        description: model.description,
        type: 'function-model' as const,
        metadata: {
          status: model.status,
          version: model.version,
          nodeCount: model.nodesData?.length || 0
        }
      }))
    } catch (error) {
      console.error('Error searching function models:', error)
      return []
    }
  }

  // Search knowledge base
  async searchKnowledgeBase(query: string): Promise<EntitySearchResult[]> {
    try {
      const { searchKnowledgeBase } = await import('@/lib/infrastructure/knowledge-base-service')
      const results = await searchKnowledgeBase(query)
      
      return results.map(item => ({
        id: item.id,
        name: item.title,
        description: item.summary,
        type: 'knowledge-base' as const,
        metadata: {
          category: item.category,
          status: item.status
        }
      }))
    } catch (error) {
      console.error('Error searching knowledge base:', error)
      return []
    }
  }

  // Search spindle entities
  async searchSpindleEntities(query: string): Promise<EntitySearchResult[]> {
    try {
      // TODO: Implement spindle search when spindle feature is available
      // For now, return empty array
      return []
    } catch (error) {
      console.error('Error searching spindle entities:', error)
      return []
    }
  }

  // Universal search
  async searchEntities(query: string, featureType: FeatureType): Promise<EntitySearchResult[]> {
    switch (featureType) {
      case 'function-model':
        return await this.searchFunctionModels(query)
      case 'knowledge-base':
        return await this.searchKnowledgeBase(query)
      case 'spindle':
        return await this.searchSpindleEntities(query)
      default:
        return []
    }
  }

  // Search across all features
  async searchAllEntities(query: string): Promise<EntitySearchResult[]> {
    const results = await Promise.all([
      this.searchFunctionModels(query),
      this.searchKnowledgeBase(query),
      this.searchSpindleEntities(query)
    ])
    
    return results.flat().sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
  }
}

// Export singleton instance
export const entitySearchService = new EntitySearchService() 