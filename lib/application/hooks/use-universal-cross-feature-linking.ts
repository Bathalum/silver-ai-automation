'use client'

import { useState, useCallback } from 'react'
import { 
  CrossFeatureLink, 
  FeatureType, 
  LinkType, 
  UniversalLinkContext 
} from '@/lib/domain/entities/cross-feature-link-types'
import { 
  createNewCrossFeatureLink,
  getCrossFeatureLinks,
  deleteCrossFeatureLink 
} from '@/lib/application/use-cases/function-model-persistence-use-cases'
import { entitySearchService, EntitySearchResult } from '@/lib/services/entity-search-service'

export function useUniversalCrossFeatureLinking() {
  const [links, setLinks] = useState<CrossFeatureLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<EntitySearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Universal link creation
  const createUniversalLink = useCallback(async (
    sourceFeature: FeatureType,
    sourceId: string,
    targetFeature: FeatureType,
    targetId: string,
    linkType: LinkType,
    context?: UniversalLinkContext
  ) => {
    setLoading(true)
    setError(null)

    try {
      const newLink = await createNewCrossFeatureLink(
        sourceFeature,
        sourceId,
        targetFeature,
        targetId,
        linkType,
        context
      )
      await loadLinks(sourceFeature, sourceId, context)
      return newLink
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create link'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Real entity search
  const searchEntities = useCallback(async (
    query: string,
    featureType: FeatureType
  ) => {
    setSearchLoading(true)
    setError(null)

    try {
      const results = await entitySearchService.searchEntities(query, featureType)
      setSearchResults(results)
      return results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search entities'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setSearchLoading(false)
    }
  }, [])

  // Load links for any context
  const loadLinks = useCallback(async (
    sourceFeature: FeatureType,
    sourceId: string,
    context?: UniversalLinkContext
  ) => {
    setLoading(true)
    setError(null)

    try {
      let links: CrossFeatureLink[]
      
      if (context?.node) {
        // Node-level links
        links = await getNodeLinks(sourceId, context.node.nodeId)
      } else {
        // Global links
        links = await getCrossFeatureLinks(sourceId, sourceFeature)
      }
      
      setLinks(links)
      return links
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load links'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Delete link
  const deleteLink = useCallback(async (linkId: string) => {
    setLoading(true)
    setError(null)

    try {
      await deleteCrossFeatureLink(linkId)
      setLinks(prev => prev.filter(link => link.linkId !== linkId))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete link'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Clear error
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

// Helper function to get node-level links
async function getNodeLinks(sourceId: string, nodeId: string) {
  // This will be implemented to get node-specific links
  // For now, return empty array
  return []
} 