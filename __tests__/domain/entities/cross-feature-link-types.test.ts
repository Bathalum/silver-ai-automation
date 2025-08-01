import {
  createCrossFeatureLink,
  createDocumentLink,
  createImplementationLink,
  createReferenceLink,
  createSupportLink,
  isValidFeatureType,
  isValidLinkType,
  isValidCrossFeatureLink,
  getLinkDescription,
  getLinkIcon,
  getLinkColor,
  type CrossFeatureLink,
  type FeatureType,
  type LinkType,
  type DocumentLinkContext,
  type ImplementationLinkContext,
  type ReferenceLinkContext,
  type SupportLinkContext,
  type LinkMetadata,
  type CrossFeatureLinkFilters,
  type LinkAnalytics
} from '../../../lib/domain/entities/cross-feature-link-types'

describe('Cross-Feature Link Domain Entities', () => {
  describe('createCrossFeatureLink', () => {
    it('should create a valid cross-feature link', () => {
      const link = createCrossFeatureLink(
        'function-model',
        'model-1',
        'knowledge-base',
        'doc-1',
        'documents',
        { section: 'process', relevance: 'high' }
      )

      expect(link.sourceFeature).toBe('function-model')
      expect(link.sourceId).toBe('model-1')
      expect(link.targetFeature).toBe('knowledge-base')
      expect(link.targetId).toBe('doc-1')
      expect(link.linkType).toBe('documents')
      expect(link.linkContext).toEqual({ section: 'process', relevance: 'high' })
      expect(link.linkStrength).toBe(1.0)
    })

    it('should create a link with default context when none provided', () => {
      const link = createCrossFeatureLink(
        'function-model',
        'model-1',
        'spindle',
        'automation-1',
        'implements'
      )

      expect(link.linkContext).toEqual({})
      expect(link.linkStrength).toBe(1.0)
    })
  })

  describe('createDocumentLink', () => {
    it('should create a document link with correct defaults', () => {
      const link = createDocumentLink('model-1', 'doc-1', {
        section: 'process',
        relevance: 'high',
        notes: 'Important documentation'
      })

      expect(link.sourceFeature).toBe('function-model')
      expect(link.sourceId).toBe('model-1')
      expect(link.targetFeature).toBe('knowledge-base')
      expect(link.targetId).toBe('doc-1')
      expect(link.linkType).toBe('documents')
      expect(link.linkContext).toEqual({
        section: 'process',
        relevance: 'high',
        notes: 'Important documentation'
      })
    })
  })

  describe('createImplementationLink', () => {
    it('should create an implementation link with correct defaults', () => {
      const link = createImplementationLink('model-1', 'automation-1', {
        implementationType: 'full',
        coverage: 85,
        notes: 'Complete implementation'
      })

      expect(link.sourceFeature).toBe('function-model')
      expect(link.sourceId).toBe('model-1')
      expect(link.targetFeature).toBe('spindle')
      expect(link.targetId).toBe('automation-1')
      expect(link.linkType).toBe('implements')
      expect(link.linkContext).toEqual({
        implementationType: 'full',
        coverage: 85,
        notes: 'Complete implementation'
      })
    })
  })

  describe('createReferenceLink', () => {
    it('should create a reference link with correct defaults', () => {
      const link = createReferenceLink('model-1', 'model-2', {
        referenceType: 'inspiration',
        notes: 'Inspired by this model'
      })

      expect(link.sourceFeature).toBe('function-model')
      expect(link.sourceId).toBe('model-1')
      expect(link.targetFeature).toBe('function-model')
      expect(link.targetId).toBe('model-2')
      expect(link.linkType).toBe('references')
      expect(link.linkContext).toEqual({
        referenceType: 'inspiration',
        notes: 'Inspired by this model'
      })
    })
  })

  describe('createSupportLink', () => {
    it('should create a support link with correct defaults', () => {
      const link = createSupportLink('model-1', 'doc-1', {
        supportType: 'prerequisite',
        impact: 'high',
        notes: 'Required before implementation'
      })

      expect(link.sourceFeature).toBe('function-model')
      expect(link.sourceId).toBe('model-1')
      expect(link.targetFeature).toBe('knowledge-base')
      expect(link.targetId).toBe('doc-1')
      expect(link.linkType).toBe('supports')
      expect(link.linkContext).toEqual({
        supportType: 'prerequisite',
        impact: 'high',
        notes: 'Required before implementation'
      })
    })
  })

  describe('isValidFeatureType', () => {
    it('should return true for valid feature types', () => {
      const validTypes: FeatureType[] = ['function-model', 'knowledge-base', 'spindle']
      
      validTypes.forEach(type => {
        expect(isValidFeatureType(type)).toBe(true)
      })
    })

    it('should return false for invalid feature types', () => {
      const invalidTypes = ['invalid', 'test', 'unknown', '']
      
      invalidTypes.forEach(type => {
        expect(isValidFeatureType(type)).toBe(false)
      })
    })
  })

  describe('isValidLinkType', () => {
    it('should return true for valid link types', () => {
      const validTypes: LinkType[] = ['documents', 'implements', 'references', 'supports']
      
      validTypes.forEach(type => {
        expect(isValidLinkType(type)).toBe(true)
      })
    })

    it('should return false for invalid link types', () => {
      const invalidTypes = ['invalid', 'test', 'unknown', '']
      
      invalidTypes.forEach(type => {
        expect(isValidLinkType(type)).toBe(false)
      })
    })
  })

  describe('isValidCrossFeatureLink', () => {
    it('should return true for a valid cross-feature link', () => {
      const validLink: CrossFeatureLink = {
        linkId: 'link-1',
        sourceFeature: 'function-model',
        sourceId: 'model-1',
        targetFeature: 'knowledge-base',
        targetId: 'doc-1',
        linkType: 'documents',
        linkContext: { section: 'process' },
        linkStrength: 1.0,
        createdAt: new Date(),
        createdBy: 'user-1'
      }

      expect(isValidCrossFeatureLink(validLink)).toBe(true)
    })

    it('should return false for invalid cross-feature links', () => {
      const invalidLinks = [
        null,
        undefined,
        {},
        { linkId: 'test' }, // Missing required fields
        { 
          linkId: 'test', 
          sourceFeature: 'invalid-feature', // Invalid feature type
          sourceId: 'test',
          targetFeature: 'knowledge-base',
          targetId: 'test',
          linkType: 'documents',
          linkContext: {},
          linkStrength: 1.0,
          createdAt: new Date()
        },
        {
          linkId: 'test',
          sourceFeature: 'function-model',
          sourceId: 'test',
          targetFeature: 'knowledge-base',
          targetId: 'test',
          linkType: 'invalid-type', // Invalid link type
          linkContext: {},
          linkStrength: 1.0,
          createdAt: new Date()
        }
      ]

      invalidLinks.forEach(link => {
        expect(isValidCrossFeatureLink(link)).toBe(false)
      })
    })
  })

  describe('getLinkDescription', () => {
    it('should return correct descriptions for different link types', () => {
      const link: CrossFeatureLink = {
        linkId: 'link-1',
        sourceFeature: 'function-model',
        sourceId: 'model-1',
        targetFeature: 'knowledge-base',
        targetId: 'doc-1',
        linkType: 'documents',
        linkContext: {},
        linkStrength: 1.0,
        createdAt: new Date()
      }

      expect(getLinkDescription(link)).toBe('Documents knowledge-base')

      link.linkType = 'implements'
      expect(getLinkDescription(link)).toBe('Implements spindle')

      link.linkType = 'references'
      expect(getLinkDescription(link)).toBe('References function-model')

      link.linkType = 'supports'
      expect(getLinkDescription(link)).toBe('Supports knowledge-base')
    })
  })

  describe('getLinkIcon', () => {
    it('should return correct icons for different link types', () => {
      expect(getLinkIcon('documents')).toBe('📄')
      expect(getLinkIcon('implements')).toBe('⚙️')
      expect(getLinkIcon('references')).toBe('🔗')
      expect(getLinkIcon('supports')).toBe('🛠️')
    })
  })

  describe('getLinkColor', () => {
    it('should return correct colors for different link types', () => {
      expect(getLinkColor('documents')).toBe('blue')
      expect(getLinkColor('implements')).toBe('green')
      expect(getLinkColor('references')).toBe('purple')
      expect(getLinkColor('supports')).toBe('orange')
    })
  })

  describe('Link Context Types', () => {
    describe('DocumentLinkContext', () => {
      it('should have correct structure', () => {
        const context: DocumentLinkContext = {
          section: 'process',
          relevance: 'high',
          notes: 'Important documentation'
        }

        expect(context.section).toBe('process')
        expect(context.relevance).toBe('high')
        expect(context.notes).toBe('Important documentation')
      })
    })

    describe('ImplementationLinkContext', () => {
      it('should have correct structure', () => {
        const context: ImplementationLinkContext = {
          implementationType: 'full',
          coverage: 85,
          notes: 'Complete implementation'
        }

        expect(context.implementationType).toBe('full')
        expect(context.coverage).toBe(85)
        expect(context.notes).toBe('Complete implementation')
      })
    })

    describe('ReferenceLinkContext', () => {
      it('should have correct structure', () => {
        const context: ReferenceLinkContext = {
          referenceType: 'inspiration',
          notes: 'Inspired by this model'
        }

        expect(context.referenceType).toBe('inspiration')
        expect(context.notes).toBe('Inspired by this model')
      })
    })

    describe('SupportLinkContext', () => {
      it('should have correct structure', () => {
        const context: SupportLinkContext = {
          supportType: 'prerequisite',
          impact: 'high',
          notes: 'Required before implementation'
        }

        expect(context.supportType).toBe('prerequisite')
        expect(context.impact).toBe('high')
        expect(context.notes).toBe('Required before implementation')
      })
    })
  })

  describe('LinkMetadata', () => {
    it('should have correct structure', () => {
      const metadata: LinkMetadata = {
        lastAccessed: new Date(),
        accessCount: 15,
        userRating: 4.5,
        isActive: true,
        tags: ['important', 'process']
      }

      expect(metadata.lastAccessed).toBeInstanceOf(Date)
      expect(metadata.accessCount).toBe(15)
      expect(metadata.userRating).toBe(4.5)
      expect(metadata.isActive).toBe(true)
      expect(metadata.tags).toEqual(['important', 'process'])
    })
  })

  describe('CrossFeatureLinkFilters', () => {
    it('should have correct structure', () => {
      const filters: CrossFeatureLinkFilters = {
        sourceFeature: 'function-model',
        targetFeature: 'knowledge-base',
        linkType: 'documents',
        linkStrength: {
          min: 0.5,
          max: 1.0
        },
        dateRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-12-31')
        },
        tags: ['important'],
        isActive: true
      }

      expect(filters.sourceFeature).toBe('function-model')
      expect(filters.targetFeature).toBe('knowledge-base')
      expect(filters.linkType).toBe('documents')
      expect(filters.linkStrength).toEqual({ min: 0.5, max: 1.0 })
      expect(filters.dateRange).toBeDefined()
      expect(filters.tags).toEqual(['important'])
      expect(filters.isActive).toBe(true)
    })
  })

  describe('LinkAnalytics', () => {
    it('should have correct structure', () => {
      const analytics: LinkAnalytics = {
        totalLinks: 150,
        linksByType: {
          documents: 50,
          implements: 30,
          references: 40,
          supports: 30
        },
        linksByFeature: {
          'function-model': 60,
          'knowledge-base': 50,
          'spindle': 40
        },
        averageStrength: 0.85,
        mostActiveLinks: [],
        linkTrends: [
          {
            period: '2023-Q1',
            newLinks: 25,
            removedLinks: 5
          }
        ]
      }

      expect(analytics.totalLinks).toBe(150)
      expect(analytics.linksByType).toBeDefined()
      expect(analytics.linksByFeature).toBeDefined()
      expect(analytics.averageStrength).toBe(0.85)
      expect(analytics.mostActiveLinks).toEqual([])
      expect(analytics.linkTrends).toBeDefined()
    })
  })
}) 