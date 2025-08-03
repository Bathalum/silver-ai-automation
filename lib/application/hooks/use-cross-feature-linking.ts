import { useState, useCallback } from 'react'
import { UnifiedNodeOperations } from '@/lib/infrastructure/services/unified-node-operations'
import { NodeLink } from '@/lib/domain/entities/function-model-node-types'

export interface CrossFeatureLinkOptions {
  sourceFeature: 'function-model' | 'knowledge-base' | 'event-storm' | 'spindle'
  sourceEntityId: string
  sourceNodeId?: string
}

export interface LinkValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export function useCrossFeatureLinking(options: CrossFeatureLinkOptions) {
  const { sourceFeature, sourceEntityId, sourceNodeId } = options
  
  const [links, setLinks] = useState<NodeLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nodeOperations = new UnifiedNodeOperations()

  // Load existing links for the source
  const loadLinks = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const existingLinks = await nodeOperations.getNodeLinks(sourceEntityId, sourceNodeId)
      setLinks(existingLinks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load links')
    } finally {
      setLoading(false)
    }
  }, [sourceEntityId, sourceNodeId, nodeOperations])

  // Create a link to another feature
  const createCrossFeatureLink = useCallback(async (
    targetFeature: 'function-model' | 'knowledge-base' | 'event-storm' | 'spindle',
    targetEntityId: string,
    targetNodeId?: string,
    linkType: NodeLink['linkType'] = 'references',
    context?: Record<string, any>
  ) => {
    setLoading(true)
    setError(null)

    try {
      const newLink = await nodeOperations.createNodeLink({
        sourceFeature,
        sourceEntityId,
        sourceNodeId,
        targetFeature,
        targetEntityId,
        targetNodeId,
        linkType,
        linkStrength: 1.0,
        linkContext: context || {},
        visualProperties: {
          color: getLinkColor(linkType),
          style: 'solid',
          width: 2
        }
      })

      setLinks(prev => [...prev, newLink])
      return newLink
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create cross-feature link'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [sourceFeature, sourceEntityId, sourceNodeId, nodeOperations])

  // Delete a link
  const deleteLink = useCallback(async (linkId: string) => {
    setLoading(true)
    setError(null)

    try {
      await nodeOperations.nodeLinksRepository.deleteNodeLink(linkId)
      setLinks(prev => prev.filter(link => link.linkId !== linkId))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete link'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [nodeOperations])

  // Update link properties
  const updateLink = useCallback(async (linkId: string, updates: Partial<NodeLink>) => {
    setLoading(true)
    setError(null)

    try {
      const updatedLink = await nodeOperations.nodeLinksRepository.updateNodeLink(linkId, updates)
      setLinks(prev => prev.map(link => 
        link.linkId === linkId ? updatedLink : link
      ))
      return updatedLink
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update link'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [nodeOperations])

  // Validate a potential link
  const validateLink = useCallback((
    targetFeature: string,
    targetEntityId: string,
    targetNodeId?: string,
    linkType?: string
  ): LinkValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if link already exists
    const existingLink = links.find(link => 
      link.targetFeature === targetFeature &&
      link.targetEntityId === targetEntityId &&
      link.targetNodeId === targetNodeId
    )

    if (existingLink) {
      errors.push('Link already exists between these nodes')
    }

    // Validate link type compatibility
    if (linkType) {
      const isValidLinkType = validateLinkType(sourceFeature, targetFeature, linkType)
      if (!isValidLinkType) {
        errors.push(`Invalid link type '${linkType}' for ${sourceFeature} to ${targetFeature}`)
      }
    }

    // Check for circular references
    if (sourceFeature === targetFeature && sourceEntityId === targetEntityId) {
      warnings.push('Creating a link within the same entity may cause circular references')
    }

    // Validate feature combinations
    const featureCompatibility = getFeatureCompatibility(sourceFeature, targetFeature)
    if (!featureCompatibility.compatible) {
      errors.push(featureCompatibility.reason)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }, [links, sourceFeature, sourceEntityId])

  // Get link suggestions based on content similarity
  const getLinkSuggestions = useCallback(async (query?: string) => {
    if (!query) return []

    try {
      // This would typically involve AI-powered similarity search
      // For now, we'll return a basic implementation
      const suggestions = await nodeOperations.searchNodes(query, {
        nodeType: undefined,
        positionRange: undefined
      })

      return suggestions.slice(0, 5) // Limit to 5 suggestions
    } catch (err) {
      console.error('Failed to get link suggestions:', err)
      return []
    }
  }, [nodeOperations])

  // Get all connected entities
  const getConnectedEntities = useCallback(() => {
    const connectedEntities = new Map<string, { feature: string; entityId: string; links: NodeLink[] }>()

    links.forEach(link => {
      const key = `${link.targetFeature}-${link.targetEntityId}`
      if (!connectedEntities.has(key)) {
        connectedEntities.set(key, {
          feature: link.targetFeature,
          entityId: link.targetEntityId,
          links: []
        })
      }
      connectedEntities.get(key)!.links.push(link)
    })

    return Array.from(connectedEntities.values())
  }, [links])

  // Get link statistics
  const getLinkStatistics = useCallback(() => {
    const stats = {
      total: links.length,
      byFeature: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byStrength: {
        strong: 0,
        medium: 0,
        weak: 0
      }
    }

    links.forEach(link => {
      // Count by feature
      stats.byFeature[link.targetFeature] = (stats.byFeature[link.targetFeature] || 0) + 1
      
      // Count by type
      stats.byType[link.linkType] = (stats.byType[link.linkType] || 0) + 1
      
      // Count by strength
      if (link.linkStrength >= 0.8) stats.byStrength.strong++
      else if (link.linkStrength >= 0.5) stats.byStrength.medium++
      else stats.byStrength.weak++
    })

    return stats
  }, [links])

  return {
    // State
    links,
    loading,
    error,
    
    // Actions
    loadLinks,
    createCrossFeatureLink,
    deleteLink,
    updateLink,
    validateLink,
    getLinkSuggestions,
    getConnectedEntities,
    getLinkStatistics,
    
    // Utilities
    refresh: loadLinks
  }
}

// Helper functions
function getLinkColor(linkType: string): string {
  const colors: Record<string, string> = {
    documents: '#10b981', // Green
    implements: '#3b82f6', // Blue
    references: '#f59e0b', // Orange
    supports: '#8b5cf6', // Purple
    nested: '#ef4444' // Red
  }
  return colors[linkType] || '#6b7280'
}

function validateLinkType(sourceFeature: string, targetFeature: string, linkType: string): boolean {
  const validCombinations: Record<string, string[]> = {
    'function-model': ['documents', 'implements', 'references', 'supports', 'nested'],
    'knowledge-base': ['documents', 'references', 'supports'],
    'event-storm': ['implements', 'references', 'supports'],
    'spindle': ['implements', 'references', 'supports', 'nested']
  }

  const validTypes = validCombinations[sourceFeature] || []
  return validTypes.includes(linkType)
}

function getFeatureCompatibility(sourceFeature: string, targetFeature: string): {
  compatible: boolean
  reason?: string
} {
  const compatibilityMatrix: Record<string, string[]> = {
    'function-model': ['knowledge-base', 'event-storm', 'spindle'],
    'knowledge-base': ['function-model', 'event-storm', 'spindle'],
    'event-storm': ['function-model', 'knowledge-base', 'spindle'],
    'spindle': ['function-model', 'knowledge-base', 'event-storm']
  }

  const compatibleFeatures = compatibilityMatrix[sourceFeature] || []
  const isCompatible = compatibleFeatures.includes(targetFeature)

  return {
    compatible: isCompatible,
    reason: isCompatible ? undefined : `${sourceFeature} cannot link to ${targetFeature}`
  }
} 