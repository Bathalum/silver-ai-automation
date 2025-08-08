import { useState, useCallback } from 'react'
import { CrossFeatureLink, FeatureType, LinkType, UniversalLinkContext } from '@/lib/domain/entities/cross-feature-link-types'
import { EntitySearchResult } from '@/lib/services/entity-search-service'
import { useFunctionModelSaveUseCases } from './use-function-model-save-use-cases'

export function useUniversalCrossFeatureLinking() {
  const [links, setLinks] = useState<CrossFeatureLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<EntitySearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const { functionModelRepository } = useFunctionModelSaveUseCases()

  const loadLinks = useCallback(async (
    sourceFeature: FeatureType,
    sourceId: string,
    context?: UniversalLinkContext
  ) => {
    try {
      setLoading(true)
      setError(null)

      // Get cross-feature links from repository
      const crossFeatureLinks = await functionModelRepository.getCrossFeatureLinks(sourceId, sourceFeature)
      
      // Transform to CrossFeatureLink format
      const transformedLinks: CrossFeatureLink[] = crossFeatureLinks.map((link: any) => ({
        linkId: link.link_id,
        sourceNodeId: link.source_node_id || '',
        targetNodeId: link.target_node_id || '',
        sourceNodeType: link.source_feature,
        targetNodeType: link.target_feature,
        sourceFeature: link.source_feature,
        targetFeature: link.target_feature,
        sourceId: link.source_id,
        targetId: link.target_id,
        linkType: link.link_type as LinkType,
        linkStrength: link.link_strength || 1.0,
        linkContext: link.link_context || {},
        visualProperties: link.visual_properties || {},
        createdAt: new Date(link.created_at || Date.now()),
        updatedAt: new Date(link.updated_at || Date.now())
      }))

      setLinks(transformedLinks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load links')
      console.error('Failed to load cross-feature links:', err)
    } finally {
      setLoading(false)
    }
  }, [functionModelRepository])

  const searchEntities = useCallback(async (query: string, targetFeature: FeatureType) => {
    try {
      setSearchLoading(true)
      setError(null)

      // Mock search results for now - this would be replaced with actual entity search
      const mockResults: EntitySearchResult[] = [
        {
          id: 'mock-entity-1',
          name: `Mock ${targetFeature} Entity 1`,
          type: targetFeature,
          description: 'Mock entity for testing',
          metadata: {}
        },
        {
          id: 'mock-entity-2',
          name: `Mock ${targetFeature} Entity 2`,
          type: targetFeature,
          description: 'Another mock entity for testing',
          metadata: {}
        }
      ]

      setSearchResults(mockResults)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search entities')
      console.error('Failed to search entities:', err)
    } finally {
      setSearchLoading(false)
    }
  }, [])

  const createUniversalLink = useCallback(async (
    sourceFeature: FeatureType,
    sourceId: string,
    targetFeature: FeatureType,
    targetId: string,
    linkType: LinkType,
    context?: UniversalLinkContext
  ): Promise<CrossFeatureLink> => {
    try {
      setError(null)

      // Create cross-feature link using repository
      const createdLink = await functionModelRepository.createCrossFeatureLink(
        sourceFeature,
        sourceId,
        context?.nodeId || null,
        targetFeature,
        targetId,
        context?.targetNodeId || null,
        linkType,
        context
      )

      // Transform to CrossFeatureLink format
      const newLink: CrossFeatureLink = {
        linkId: createdLink.link_id,
        sourceNodeId: createdLink.source_node_id || '',
        targetNodeId: createdLink.target_node_id || '',
        sourceNodeType: createdLink.source_feature,
        targetNodeType: createdLink.target_feature,
        sourceFeature: createdLink.source_feature,
        targetFeature: createdLink.target_feature,
        sourceId: createdLink.source_id,
        targetId: createdLink.target_id,
        linkType: createdLink.link_type as LinkType,
        linkStrength: createdLink.link_strength || 1.0,
        linkContext: createdLink.link_context || {},
        visualProperties: createdLink.visual_properties || {},
        createdAt: new Date(createdLink.created_at || Date.now()),
        updatedAt: new Date(createdLink.updated_at || Date.now())
      }

      // Add to local state
      setLinks(prev => [...prev, newLink])

      return newLink
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create link'
      setError(errorMessage)
      console.error('Failed to create cross-feature link:', err)
      throw new Error(errorMessage)
    }
  }, [functionModelRepository])

  const deleteLink = useCallback(async (linkId: string) => {
    try {
      setError(null)

      // Delete link using repository
      await functionModelRepository.deleteCrossFeatureLink(linkId)

      // Remove from local state
      setLinks(prev => prev.filter(link => link.linkId !== linkId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete link')
      console.error('Failed to delete cross-feature link:', err)
    }
  }, [functionModelRepository])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    links,
    loading,
    error,
    searchResults,
    searchLoading,
    createUniversalLink,
    searchEntities,
    loadLinks,
    deleteLink,
    clearError
  }
}
