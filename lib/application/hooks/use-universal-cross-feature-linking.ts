// Universal Cross-Feature Linking Hook
// This hook provides unified cross-feature linking functionality

import { useState, useCallback } from 'react'
import { CrossFeatureLink } from '@/lib/domain/entities/cross-feature-link-types'

export interface CrossFeatureLinkingOptions {
  sourceFeature: string
  sourceId: string
  targetFeature: string
  targetId: string
  linkType: string
  context?: Record<string, any>
}

export function useUniversalCrossFeatureLinking() {
  const [links, setLinks] = useState<CrossFeatureLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createLink = useCallback(async (options: CrossFeatureLinkingOptions): Promise<CrossFeatureLink> => {
    setLoading(true)
    setError(null)
    
    try {
      // Use node-based use cases for function model links
      if (options.sourceFeature === 'function-model' || options.targetFeature === 'function-model') {
        const { createCrossFeatureLink } = await import('@/lib/application/use-cases/function-model-use-cases')
        
        const link = await createCrossFeatureLink(
          options.sourceFeature,
          options.sourceId,
          null, // sourceNodeId - not used in this context
          options.targetFeature,
          options.targetId,
          null, // targetNodeId - not used in this context
          options.linkType,
          options.context
        )
        
        const newLink: CrossFeatureLink = {
          id: link.link_id,
          sourceFeature: link.source_feature,
          sourceId: link.source_id,
          targetFeature: link.target_feature,
          targetId: link.target_id,
          linkType: link.link_type,
          context: link.link_context,
          createdAt: new Date(link.created_at)
        }
        
        setLinks(prev => [...prev, newLink])
        return newLink
      }
      
      // For other features, use the appropriate service
      const { createCrossFeatureLink } = await import('@/lib/infrastructure/repositories/function-model-repository')
      
      const link = await createCrossFeatureLink(
        options.sourceFeature,
        options.sourceId,
        null,
        options.targetFeature,
        options.targetId,
        null,
        options.linkType,
        options.context
      )
      
      const newLink: CrossFeatureLink = {
        id: link.link_id,
        sourceFeature: link.source_feature,
        sourceId: link.source_id,
        targetFeature: link.target_feature,
        targetId: link.target_id,
        linkType: link.link_type,
        context: link.link_context,
        createdAt: new Date(link.created_at)
      }
      
      setLinks(prev => [...prev, newLink])
      return newLink
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create cross-feature link'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteLink = useCallback(async (linkId: string): Promise<void> => {
    setLoading(true)
    setError(null)
    
    try {
      const { deleteCrossFeatureLink } = await import('@/lib/infrastructure/repositories/function-model-repository')
      await deleteCrossFeatureLink(linkId)
      
      setLinks(prev => prev.filter(link => link.id !== linkId))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete cross-feature link'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const getLinks = useCallback(async (sourceId: string, sourceFeature: string): Promise<CrossFeatureLink[]> => {
    setLoading(true)
    setError(null)
    
    try {
      const { getCrossFeatureLinks } = await import('@/lib/infrastructure/repositories/function-model-repository')
      const links = await getCrossFeatureLinks(sourceId, sourceFeature)
      
      const crossFeatureLinks: CrossFeatureLink[] = links.map(link => ({
        id: link.link_id,
        sourceFeature: link.source_feature,
        sourceId: link.source_id,
        targetFeature: link.target_feature,
        targetId: link.target_id,
        linkType: link.link_type,
        context: link.link_context,
        createdAt: new Date(link.created_at)
      }))
      
      setLinks(crossFeatureLinks)
      return crossFeatureLinks
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get cross-feature links'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    links,
    loading,
    error,
    createLink,
    deleteLink,
    getLinks,
    clearError
  }
} 