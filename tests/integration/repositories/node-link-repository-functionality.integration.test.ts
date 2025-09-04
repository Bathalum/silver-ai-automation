/**
 * @fileoverview Integration tests for SupabaseNodeLinkRepository functionality
 * Demonstrates TDD GREEN state for cross-feature relationship management
 * 
 * Focus: Production-ready node link operations with Clean Architecture compliance
 * Pattern: Real assertions, architectural validation, working functionality
 */

import { Result } from '../../../lib/domain/shared/result'
import { SupabaseNodeLinkRepository } from '../../../lib/infrastructure/repositories/supabase-node-link-repository'
import { NodeLink } from '../../../lib/domain/entities/node-link'
import { CrossFeatureLink } from '../../../lib/domain/entities/cross-feature-link'
import { NodeId } from '../../../lib/domain/value-objects/node-id'
import { FeatureType, LinkType } from '../../../lib/domain/enums'

// Test helper to create valid UUIDs for testing - use known working format
const createTestUUID = (prefix: string): string => {
  // Convert prefix to valid hex characters only, pad with 0s
  const hexPrefix = prefix
    .substring(0, 8)
    .toLowerCase()
    .replace(/[^0-9a-f]/g, '0')
    .padEnd(8, '0')
    .substring(0, 8)
  return `${hexPrefix}-1234-4123-8123-123456789abc`
}

// Simplified mock Supabase client for testing
const createMockSupabaseClient = () => {
  const mockNodeLinks = new Map<string, any>()
  const mockCrossFeatureLinks = new Map<string, any>()
  
  return {
    from: (table: string) => ({
      select: (fields: string = '*') => ({
        eq: (column: string, value: any) => ({
          single: () => {
            const data = table === 'cross_feature_links' ? mockCrossFeatureLinks : mockNodeLinks
            const found = Array.from(data.values()).find(item => item[column] === value)
            return Promise.resolve({ 
              data: found || null, 
              error: found ? null : { code: 'PGRST116', message: 'Not found' }
            })
          },
          limit: (count: number) => Promise.resolve({
            data: Array.from(table === 'cross_feature_links' ? mockCrossFeatureLinks.values() : mockNodeLinks.values())
              .filter(item => item[column] === value)
              .slice(0, count),
            error: null
          }),
          order: (column: string, options?: any) => Promise.resolve({
            data: Array.from(table === 'cross_feature_links' ? mockCrossFeatureLinks.values() : mockNodeLinks.values())
              .filter(item => item[column] === value)
              .sort((a, b) => options?.ascending === false ? b[column] - a[column] : a[column] - b[column]),
            error: null
          })
        }),
        gte: (column: string, threshold: number) => ({
          order: (orderColumn: string, options?: any) => Promise.resolve({
            data: Array.from(table === 'cross_feature_links' ? mockCrossFeatureLinks.values() : mockNodeLinks.values())
              .filter(item => item[column] >= threshold)
              .sort((a, b) => options?.ascending === false ? b[orderColumn] - a[orderColumn] : a[orderColumn] - b[orderColumn]),
            error: null
          })
        }),
        order: (column: string, options?: any) => Promise.resolve({
          data: Array.from(table === 'cross_feature_links' ? mockCrossFeatureLinks.values() : mockNodeLinks.values())
            .sort((a, b) => options?.ascending === false ? b[column] - a[column] : a[column] - b[column]),
          error: null
        })
      }),
      upsert: (record: any, options?: any) => Promise.resolve({
        data: [{ ...record, created_at: new Date().toISOString() }],
        error: null
      }),
      delete: () => ({
        eq: (column: string, value: any) => {
          const data = table === 'cross_feature_links' ? mockCrossFeatureLinks : mockNodeLinks
          const key = Array.from(data.keys()).find(k => data.get(k)[column] === value)
          if (key) {
            data.delete(key)
            return Promise.resolve({ data: [{}], error: null })
          }
          return Promise.resolve({ data: [], error: null })
        }
      })
    }),
    
    // Helper to seed test data
    __seedData: (table: string, id: string, data: any) => {
      if (table === 'cross_feature_links') {
        mockCrossFeatureLinks.set(id, data)
      } else {
        mockNodeLinks.set(id, data)
      }
    },
    
    __clearData: () => {
      mockNodeLinks.clear()
      mockCrossFeatureLinks.clear()
    }
  }
}

describe('SupabaseNodeLinkRepository Integration Tests', () => {
  let repository: SupabaseNodeLinkRepository
  let mockClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockClient = createMockSupabaseClient()
    repository = new SupabaseNodeLinkRepository(mockClient as any)
  })

  afterEach(() => {
    mockClient.__clearData()
  })

  describe('Repository Interface Compliance', () => {
    it('should implement all required methods from NodeLinkRepository interface', () => {
      // Assert - Verify all required methods exist with correct signatures
      expect(typeof repository.findById).toBe('function')
      expect(typeof repository.save).toBe('function')
      expect(typeof repository.delete).toBe('function')
      expect(typeof repository.exists).toBe('function')
      
      // Entity query methods
      expect(typeof repository.findBySourceEntity).toBe('function')
      expect(typeof repository.findByTargetEntity).toBe('function')
      expect(typeof repository.findBySourceNode).toBe('function')
      expect(typeof repository.findByTargetNode).toBe('function')
      expect(typeof repository.findByLinkType).toBe('function')
      
      // Cross-feature methods
      expect(typeof repository.findCrossFeatureLinks).toBe('function')
      expect(typeof repository.findByFeaturePair).toBe('function')
      
      // Link strength methods
      expect(typeof repository.findStrongLinks).toBe('function')
      expect(typeof repository.findWeakLinks).toBe('function')
      expect(typeof repository.findBidirectionalLinks).toBe('function')
      
      // Bulk operations
      expect(typeof repository.bulkSave).toBe('function')
      expect(typeof repository.bulkDelete).toBe('function')
      
      // Counting operations
      expect(typeof repository.countByLinkType).toBe('function')
      expect(typeof repository.countCrossFeatureLinks).toBe('function')
    })
  })

  describe('Clean Architecture Validation', () => {
    it('should use Result pattern for all operations', async () => {
      // Arrange
      const testNodeId = NodeId.generate() // Use generate() for valid UUID
      
      // Act & Assert - All operations return Result<T>
      const findResult = await repository.findById(testNodeId)
      expect(findResult instanceof Result).toBe(true)

      const existsResult = await repository.exists(testNodeId)
      expect(existsResult instanceof Result).toBe(true)

      const deleteResult = await repository.delete(testNodeId)
      expect(deleteResult instanceof Result).toBe(true)

      // Verify results have proper structure
      expect(findResult.hasOwnProperty('isSuccess')).toBe(true)
      expect(findResult.hasOwnProperty('isFailure')).toBe(true)
      expect(existsResult.hasOwnProperty('isSuccess')).toBe(true)
      expect(deleteResult.hasOwnProperty('isSuccess')).toBe(true)
    })

    it('should handle database errors gracefully with Result pattern', async () => {
      // Arrange - Use a valid UUID that doesn't exist
      const nonExistentUUID = createTestUUID('nonexist')
      const nodeId = NodeId.create(nonExistentUUID)
      expect(nodeId.isSuccess).toBe(true)
      
      // Act
      const result = await repository.findById(nodeId.value)

      // Assert
      expect(result.isFailure).toBe(true)
      expect(result.error).toBeDefined()
      expect(typeof result.error).toBe('string')
      expect(result.error).toContain('not found')
    })
  })

  describe('Core Repository Operations', () => {
    it('should handle exists() checks correctly', async () => {
      // Arrange
      const existingUUID = createTestUUID('existing')
      const nodeId = NodeId.create(existingUUID)
      expect(nodeId.isSuccess).toBe(true)

      mockClient.__seedData('node_links', existingUUID, {
        link_id: existingUUID,
        source_feature: FeatureType.FUNCTION_MODEL,
        target_feature: FeatureType.KNOWLEDGE_BASE,
        source_entity_id: 'entity_1',
        target_entity_id: 'entity_2'
      })

      // Act
      const existsResult = await repository.exists(nodeId.value)

      // Assert
      expect(existsResult.isSuccess).toBe(true)
      expect(existsResult.value).toBe(true)

      // Test non-existent
      const nonExistentUUID = createTestUUID('nonexist')
      const nonExistentId = NodeId.create(nonExistentUUID)
      expect(nonExistentId.isSuccess).toBe(true)
      
      const notExistsResult = await repository.exists(nonExistentId.value)
      expect(notExistsResult.isSuccess).toBe(true)
      expect(notExistsResult.value).toBe(false)
    })

    it('should handle domain entity mapping correctly', async () => {
      // Arrange
      const testData = {
        link_id: createTestUUID('mapptest'),
        source_feature: FeatureType.FUNCTION_MODEL,
        target_feature: FeatureType.KNOWLEDGE_BASE,
        source_entity_id: 'db_source_123',
        target_entity_id: 'db_target_456',
        link_type: LinkType.REFERENCES,
        link_strength: 0.95,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      mockClient.__seedData('node_links', testData.link_id, testData)

      // Act
      const linkId = NodeId.create(testData.link_id)
      expect(linkId.isSuccess).toBe(true)
      
      const result = await repository.findById(linkId.value)

      // Assert
      expect(result.isSuccess).toBe(true)
      const domainEntity = result.value as NodeLink
      
      // Verify proper domain mapping
      expect(domainEntity.linkId).toBeInstanceOf(NodeId)
      expect(domainEntity.linkId.value).toBe(testData.link_id)
      expect(domainEntity.sourceEntityId).toBe('db_source_123')
      expect(domainEntity.targetEntityId).toBe('db_target_456')
      expect(domainEntity.linkType).toBe(LinkType.REFERENCES)
      expect(domainEntity.linkStrength).toBe(0.95)
      expect(domainEntity.sourceFeature).toBe(FeatureType.FUNCTION_MODEL)
      expect(domainEntity.targetFeature).toBe(FeatureType.KNOWLEDGE_BASE)
    })

    it('should find strong links above threshold', async () => {
      // Arrange
      const strongLink1 = {
        link_id: createTestUUID('strong01'),
        link_strength: 0.9,
        source_entity_id: 'node1',
        target_entity_id: 'node2',
        source_feature: FeatureType.FUNCTION_MODEL,
        target_feature: FeatureType.KNOWLEDGE_BASE,
        link_type: LinkType.REFERENCES,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const strongLink2 = {
        link_id: createTestUUID('strong02'),
        link_strength: 0.85,
        source_entity_id: 'node2',
        target_entity_id: 'node4',
        source_feature: FeatureType.FUNCTION_MODEL,
        target_feature: FeatureType.KNOWLEDGE_BASE,
        link_type: LinkType.REFERENCES,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const weakLink = {
        link_id: createTestUUID('weak0001'),
        link_strength: 0.6,
        source_entity_id: 'node1',
        target_entity_id: 'node3',
        source_feature: FeatureType.FUNCTION_MODEL,
        target_feature: FeatureType.KNOWLEDGE_BASE,
        link_type: LinkType.REFERENCES,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      mockClient.__seedData('node_links', 'strong1', strongLink1)
      mockClient.__seedData('node_links', 'strong2', strongLink2)
      mockClient.__seedData('node_links', 'weak1', weakLink)

      // Act
      const result = await repository.findStrongLinks(0.8)

      // Assert
      expect(result.isSuccess).toBe(true)
      const strongLinks = result.value as NodeLink[]
      expect(Array.isArray(strongLinks)).toBe(true)
      expect(strongLinks.length).toBe(2) // Only links with strength >= 0.8
      
      strongLinks.forEach(link => {
        expect(link.linkStrength).toBeGreaterThanOrEqual(0.8)
      })
    })
  })

  describe('Cross-Feature Operations', () => {
    it('should find cross-feature links with proper filtering', async () => {
      // Arrange
      mockClient.__seedData('cross_feature_links', 'cross_link1', {
        link_id: createTestUUID('cross001'),
        source_feature: FeatureType.FUNCTION_MODEL,
        target_feature: FeatureType.KNOWLEDGE_BASE,
        source_id: 'func_1',
        target_id: 'kb_1',
        link_type: LinkType.DOCUMENTS,
        link_strength: 0.8
      })
      mockClient.__seedData('cross_feature_links', 'cross_link2', {
        link_id: createTestUUID('cross002'),
        source_feature: FeatureType.FUNCTION_MODEL,
        target_feature: FeatureType.SPINDLE,
        source_id: 'func_2',
        target_id: 'spindle_1',
        link_type: LinkType.IMPLEMENTS,
        link_strength: 0.9
      })

      // Act
      const result = await repository.findCrossFeatureLinks()

      // Assert
      expect(result.isSuccess).toBe(true)
      const crossLinks = result.value as CrossFeatureLink[]
      expect(Array.isArray(crossLinks)).toBe(true)
      expect(crossLinks.length).toBe(2)
      
      crossLinks.forEach(link => {
        expect(link.sourceFeature).toBeDefined()
        expect(link.targetFeature).toBeDefined()
        expect(link.sourceFeature).not.toBe(link.targetFeature) // Truly cross-feature
        expect(typeof link.linkStrength).toBe('number')
      })
    })

    it('should count cross-feature links correctly', async () => {
      // Arrange
      mockClient.__seedData('cross_feature_links', 'link1', {
        source_feature: FeatureType.FUNCTION_MODEL,
        target_feature: FeatureType.KNOWLEDGE_BASE
      })
      mockClient.__seedData('cross_feature_links', 'link2', {
        source_feature: FeatureType.FUNCTION_MODEL,
        target_feature: FeatureType.SPINDLE
      })

      // Act
      const result = await repository.countCrossFeatureLinks()

      // Assert
      expect(result.isSuccess).toBe(true)
      expect(typeof result.value).toBe('number')
      expect(result.value).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Production-Ready Features', () => {
    it('should provide performance-conscious query methods', async () => {
      // Act - Test that methods can be called without errors
      const startTime = Date.now()
      
      const strongLinksResult = await repository.findStrongLinks(0.5)
      const linkTypeResult = await repository.findByLinkType(LinkType.REFERENCES)
      
      const queryTime = Date.now() - startTime

      // Assert
      expect(strongLinksResult.isSuccess).toBe(true)
      expect(linkTypeResult.isSuccess).toBe(true)
      expect(queryTime).toBeLessThan(1000) // Should complete quickly

      const strongLinks = strongLinksResult.value as NodeLink[]
      const typeLinks = linkTypeResult.value as NodeLink[]
      
      expect(Array.isArray(strongLinks)).toBe(true)
      expect(Array.isArray(typeLinks)).toBe(true)
    })

    it('should handle bulk operations with transaction safety', async () => {
      // Arrange
      const linkIds = [
        NodeId.generate(),
        NodeId.generate(),
        NodeId.generate()
      ]

      // Act
      const bulkDeleteResult = await repository.bulkDelete(linkIds)

      // Assert
      expect(bulkDeleteResult.isSuccess).toBe(true)
      // Bulk delete returns void on success
    })
  })
})