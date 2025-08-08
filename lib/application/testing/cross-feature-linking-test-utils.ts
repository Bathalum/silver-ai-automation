// Cross Feature Linking Test Utilities - Application Layer
// This file provides test utilities for cross-feature linking functionality

import { CrossFeatureLink, FeatureType, LinkType, UniversalLinkContext } from '../../domain/entities/cross-feature-link-types'
import { EntitySearchResult } from '../../services/entity-search-service'

export function createMockCrossFeatureLink(overrides: Partial<CrossFeatureLink> = {}): CrossFeatureLink {
  return {
    linkId: 'mock-link-id',
    sourceNodeId: 'mock-source-node-id',
    targetNodeId: 'mock-target-node-id',
    sourceNodeType: 'function-model',
    targetNodeType: 'knowledge-base',
    sourceFeature: 'function-model',
    targetFeature: 'knowledge-base',
    sourceId: 'mock-source-id',
    targetId: 'mock-target-id',
    linkType: 'documents',
    linkStrength: 1.0,
    linkContext: {},
    visualProperties: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

export function createMockEntitySearchResult(overrides: Partial<EntitySearchResult> = {}): EntitySearchResult {
  return {
    id: 'mock-entity-id',
    name: 'Mock Entity',
    type: 'knowledge-base',
    description: 'Mock entity for testing',
    metadata: {},
    ...overrides
  }
}

export function createMockUniversalLinkContext(overrides: Partial<UniversalLinkContext> = {}): UniversalLinkContext {
  return {
    nodeId: 'mock-node-id',
    targetNodeId: 'mock-target-node-id',
    notes: 'Mock notes',
    priority: 'medium',
    node: {
      nodeId: 'mock-node-id',
      nodeType: 'function-model'
    },
    ...overrides
  }
}

export function createMockCrossFeatureLinks(count: number = 3): CrossFeatureLink[] {
  return Array.from({ length: count }, (_, index) => 
    createMockCrossFeatureLink({
      linkId: `mock-link-${index}`,
      sourceId: `mock-source-${index}`,
      targetId: `mock-target-${index}`,
      linkType: ['documents', 'implements', 'references'][index % 3] as LinkType,
      linkStrength: 0.5 + (index * 0.2)
    })
  )
}

export function createMockEntitySearchResults(count: number = 3): EntitySearchResult[] {
  return Array.from({ length: count }, (_, index) => 
    createMockEntitySearchResult({
      id: `mock-entity-${index}`,
      name: `Mock Entity ${index}`,
      type: ['function-model', 'knowledge-base', 'spindle'][index % 3] as FeatureType,
      description: `Mock entity ${index} for testing`
    })
  )
}

export function createMockRepository() {
  return {
    getCrossFeatureLinks: jest.fn().mockResolvedValue([]),
    createCrossFeatureLink: jest.fn().mockResolvedValue({
      link_id: 'mock-created-link-id',
      source_feature: 'function-model',
      target_feature: 'knowledge-base',
      source_id: 'mock-source-id',
      target_id: 'mock-target-id',
      link_type: 'documents',
      link_strength: 1.0,
      link_context: {},
      visual_properties: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }),
    deleteCrossFeatureLink: jest.fn().mockResolvedValue(undefined)
  }
}
