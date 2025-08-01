import {
  createVersionEntry,
  createChangeDescription,
  createFunctionModelSnapshot,
  incrementVersion,
  compareVersions,
  isValidVersion,
  getVersionType,
  isValidChangeType,
  isValidVersionEntry,
  isValidChangeDescription,
  getChangeTypeDescription,
  getChangeTypeIcon,
  getChangeTypeColor,
  type VersionEntry,
  type ChangeDescription,
  type ChangeType,
  type FunctionModelSnapshot,
  type VersionMetadata,
  type VersionFilters,
  type VersionComparison,
  type VersionControlOptions,
  type PublishOptions
} from '../../../lib/domain/entities/version-control-types'

describe('Version Control Domain Entities', () => {
  describe('createVersionEntry', () => {
    it('should create a valid version entry', () => {
      const changeDescription = createChangeDescription(
        'node-added',
        'node-1',
        'Added new stage node',
        { nodeType: 'stage' }
      )

      const snapshot = createFunctionModelSnapshot(
        'model-1',
        '1.1.0',
        [{ id: 'node-1', type: 'stageNode' }],
        [],
        { x: 0, y: 0, zoom: 1 },
        { category: 'business-process' }
      )

      const versionEntry = createVersionEntry(
        '1.1.0',
        'user-1',
        [changeDescription],
        snapshot,
        { isPublished: true }
      )

      expect(versionEntry.version).toBe('1.1.0')
      expect(versionEntry.author).toBe('user-1')
      expect(versionEntry.changes).toEqual([changeDescription])
      expect(versionEntry.snapshot).toEqual(snapshot)
      expect(versionEntry.isPublished).toBe(true)
    })
  })

  describe('createChangeDescription', () => {
    it('should create a valid change description', () => {
      const change = createChangeDescription(
        'node-added',
        'node-1',
        'Added new stage node',
        { nodeType: 'stage', position: { x: 100, y: 200 } }
      )

      expect(change.type).toBe('node-added')
      expect(change.targetId).toBe('node-1')
      expect(change.description).toBe('Added new stage node')
      expect(change.metadata).toEqual({ nodeType: 'stage', position: { x: 100, y: 200 } })
    })
  })

  describe('createFunctionModelSnapshot', () => {
    it('should create a valid function model snapshot', () => {
      const snapshot = createFunctionModelSnapshot(
        'model-1',
        '1.1.0',
        [{ id: 'node-1', type: 'stageNode' }],
        [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
        { x: 0, y: 0, zoom: 1 },
        { category: 'business-process' }
      )

      expect(snapshot.modelId).toBe('model-1')
      expect(snapshot.version).toBe('1.1.0')
      expect(snapshot.nodesData).toEqual([{ id: 'node-1', type: 'stageNode' }])
      expect(snapshot.edgesData).toEqual([{ id: 'edge-1', source: 'node-1', target: 'node-2' }])
      expect(snapshot.viewportData).toEqual({ x: 0, y: 0, zoom: 1 })
      expect(snapshot.metadata).toEqual({ category: 'business-process' })
    })
  })

  describe('incrementVersion', () => {
    it('should increment minor version by default', () => {
      expect(incrementVersion('1.0.0')).toBe('1.1.0')
      expect(incrementVersion('1.1.0')).toBe('1.2.0')
      expect(incrementVersion('2.5.3')).toBe('2.6.0')
    })

    it('should increment major version when isMajor is true', () => {
      expect(incrementVersion('1.0.0', true)).toBe('2.0.0')
      expect(incrementVersion('1.1.0', true)).toBe('2.0.0')
      expect(incrementVersion('2.5.3', true)).toBe('3.0.0')
    })
  })

  describe('compareVersions', () => {
    it('should return 1 when first version is greater', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1)
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1)
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1)
    })

    it('should return -1 when first version is less', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1)
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1)
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
    })

    it('should return 0 when versions are equal', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
      expect(compareVersions('2.1.3', '2.1.3')).toBe(0)
    })

    it('should handle versions with different segment counts', () => {
      expect(compareVersions('1.0.0', '1.0')).toBe(0)
      expect(compareVersions('1.0', '1.0.0')).toBe(0)
      expect(compareVersions('1.0.0.0', '1.0.0')).toBe(1)
    })
  })

  describe('isValidVersion', () => {
    it('should return true for valid version strings', () => {
      const validVersions = ['1.0.0', '2.1.3', '0.1.0', '10.20.30']
      
      validVersions.forEach(version => {
        expect(isValidVersion(version)).toBe(true)
      })
    })

    it('should return false for invalid version strings', () => {
      const invalidVersions = [
        '1.0',           // Missing patch
        '1.0.0.0',      // Too many segments
        '1.0.0a',       // Invalid characters
        '1.0.0.1',      // Too many segments
        'v1.0.0',       // Prefix not allowed
        '1.0.0-beta',   // Suffix not allowed
        '',              // Empty string
        'invalid'        // Invalid format
      ]
      
      invalidVersions.forEach(version => {
        expect(isValidVersion(version)).toBe(false)
      })
    })
  })

  describe('getVersionType', () => {
    it('should return correct version types', () => {
      expect(getVersionType('1.0.0')).toBe('major')
      expect(getVersionType('1.1.0')).toBe('minor')
      expect(getVersionType('1.0.1')).toBe('patch')
      expect(getVersionType('2.5.3')).toBe('patch')
    })
  })

  describe('isValidChangeType', () => {
    it('should return true for valid change types', () => {
      const validTypes: ChangeType[] = [
        'node-added',
        'node-removed',
        'node-modified',
        'edge-added',
        'edge-removed',
        'edge-modified',
        'metadata-changed',
        'viewport-changed',
        'permissions-changed'
      ]
      
      validTypes.forEach(type => {
        expect(isValidChangeType(type)).toBe(true)
      })
    })

    it('should return false for invalid change types', () => {
      const invalidTypes = ['invalid', 'test', 'unknown', '']
      
      invalidTypes.forEach(type => {
        expect(isValidChangeType(type)).toBe(false)
      })
    })
  })

  describe('isValidVersionEntry', () => {
    it('should return true for a valid version entry', () => {
      const validEntry: VersionEntry = {
        version: '1.1.0',
        timestamp: new Date(),
        author: 'user-1',
        changes: [
          {
            type: 'node-added',
            targetId: 'node-1',
            description: 'Added new node',
            timestamp: new Date()
          }
        ],
        snapshot: {
          modelId: 'model-1',
          version: '1.1.0',
          nodesData: [],
          edgesData: [],
          viewportData: { x: 0, y: 0, zoom: 1 },
          metadata: {},
          timestamp: new Date()
        },
        isPublished: false
      }

      expect(isValidVersionEntry(validEntry)).toBe(true)
    })

    it('should return false for invalid version entries', () => {
      const invalidEntries = [
        null,
        undefined,
        {},
        { version: '1.0.0' }, // Missing required fields
        { 
          version: '1.0.0', 
          timestamp: new Date(),
          author: 'user-1',
          changes: [],
          snapshot: {},
          isPublished: 'invalid' // Invalid type
        }
      ]

      invalidEntries.forEach(entry => {
        expect(isValidVersionEntry(entry)).toBe(false)
      })
    })
  })

  describe('isValidChangeDescription', () => {
    it('should return true for a valid change description', () => {
      const validChange: ChangeDescription = {
        type: 'node-added',
        targetId: 'node-1',
        description: 'Added new node',
        timestamp: new Date(),
        metadata: { nodeType: 'stage' }
      }

      expect(isValidChangeDescription(validChange)).toBe(true)
    })

    it('should return false for invalid change descriptions', () => {
      const invalidChanges = [
        null,
        undefined,
        {},
        { type: 'node-added' }, // Missing required fields
        { 
          type: 'invalid-type', // Invalid change type
          targetId: 'node-1',
          description: 'Added new node',
          timestamp: new Date()
        }
      ]

      invalidChanges.forEach(change => {
        expect(isValidChangeDescription(change)).toBe(false)
      })
    })
  })

  describe('getChangeTypeDescription', () => {
    it('should return correct descriptions for different change types', () => {
      expect(getChangeTypeDescription('node-added')).toBe('Node Added')
      expect(getChangeTypeDescription('node-removed')).toBe('Node Removed')
      expect(getChangeTypeDescription('node-modified')).toBe('Node Modified')
      expect(getChangeTypeDescription('edge-added')).toBe('Connection Added')
      expect(getChangeTypeDescription('edge-removed')).toBe('Connection Removed')
      expect(getChangeTypeDescription('edge-modified')).toBe('Connection Modified')
      expect(getChangeTypeDescription('metadata-changed')).toBe('Metadata Changed')
      expect(getChangeTypeDescription('viewport-changed')).toBe('Viewport Changed')
      expect(getChangeTypeDescription('permissions-changed')).toBe('Permissions Changed')
    })
  })

  describe('getChangeTypeIcon', () => {
    it('should return correct icons for different change types', () => {
      expect(getChangeTypeIcon('node-added')).toBe('➕')
      expect(getChangeTypeIcon('node-removed')).toBe('➖')
      expect(getChangeTypeIcon('node-modified')).toBe('✏️')
      expect(getChangeTypeIcon('edge-added')).toBe('🔗')
      expect(getChangeTypeIcon('edge-removed')).toBe('🔗')
      expect(getChangeTypeIcon('edge-modified')).toBe('🔗')
      expect(getChangeTypeIcon('metadata-changed')).toBe('📝')
      expect(getChangeTypeIcon('viewport-changed')).toBe('🔍')
      expect(getChangeTypeIcon('permissions-changed')).toBe('🔐')
    })
  })

  describe('getChangeTypeColor', () => {
    it('should return correct colors for different change types', () => {
      expect(getChangeTypeColor('node-added')).toBe('green')
      expect(getChangeTypeColor('node-removed')).toBe('red')
      expect(getChangeTypeColor('node-modified')).toBe('blue')
      expect(getChangeTypeColor('edge-added')).toBe('green')
      expect(getChangeTypeColor('edge-removed')).toBe('red')
      expect(getChangeTypeColor('edge-modified')).toBe('blue')
      expect(getChangeTypeColor('metadata-changed')).toBe('yellow')
      expect(getChangeTypeColor('viewport-changed')).toBe('gray')
      expect(getChangeTypeColor('permissions-changed')).toBe('orange')
    })
  })

  describe('VersionEntry', () => {
    it('should have correct structure', () => {
      const versionEntry: VersionEntry = {
        version: '1.1.0',
        timestamp: new Date(),
        author: 'user-1',
        changes: [
          {
            type: 'node-added',
            targetId: 'node-1',
            description: 'Added new stage node',
            timestamp: new Date(),
            metadata: { nodeType: 'stage' }
          }
        ],
        snapshot: {
          modelId: 'model-1',
          version: '1.1.0',
          nodesData: [{ id: 'node-1', type: 'stageNode' }],
          edgesData: [],
          viewportData: { x: 0, y: 0, zoom: 1 },
          metadata: { category: 'business-process' },
          timestamp: new Date()
        },
        isPublished: false
      }

      expect(versionEntry.version).toBe('1.1.0')
      expect(versionEntry.timestamp).toBeInstanceOf(Date)
      expect(versionEntry.author).toBe('user-1')
      expect(versionEntry.changes).toHaveLength(1)
      expect(versionEntry.snapshot).toBeDefined()
      expect(versionEntry.isPublished).toBe(false)
    })
  })

  describe('ChangeDescription', () => {
    it('should have correct structure', () => {
      const changeDescription: ChangeDescription = {
        type: 'node-added',
        targetId: 'node-1',
        description: 'Added new stage node',
        timestamp: new Date(),
        metadata: { nodeType: 'stage', position: { x: 100, y: 200 } }
      }

      expect(changeDescription.type).toBe('node-added')
      expect(changeDescription.targetId).toBe('node-1')
      expect(changeDescription.description).toBe('Added new stage node')
      expect(changeDescription.timestamp).toBeInstanceOf(Date)
      expect(changeDescription.metadata).toEqual({ nodeType: 'stage', position: { x: 100, y: 200 } })
    })
  })

  describe('FunctionModelSnapshot', () => {
    it('should have correct structure', () => {
      const snapshot: FunctionModelSnapshot = {
        modelId: 'model-1',
        version: '1.1.0',
        nodesData: [{ id: 'node-1', type: 'stageNode' }],
        edgesData: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
        viewportData: { x: 0, y: 0, zoom: 1 },
        metadata: { category: 'business-process' },
        timestamp: new Date()
      }

      expect(snapshot.modelId).toBe('model-1')
      expect(snapshot.version).toBe('1.1.0')
      expect(snapshot.nodesData).toHaveLength(1)
      expect(snapshot.edgesData).toHaveLength(1)
      expect(snapshot.viewportData).toEqual({ x: 0, y: 0, zoom: 1 })
      expect(snapshot.metadata).toEqual({ category: 'business-process' })
      expect(snapshot.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('VersionMetadata', () => {
    it('should have correct structure', () => {
      const metadata: VersionMetadata = {
        changeSummary: 'Added new stage node and updated metadata',
        tags: ['feature', 'enhancement'],
        isMajorVersion: false,
        breakingChanges: false,
        authorNotes: 'This version adds support for new stage types'
      }

      expect(metadata.changeSummary).toBe('Added new stage node and updated metadata')
      expect(metadata.tags).toEqual(['feature', 'enhancement'])
      expect(metadata.isMajorVersion).toBe(false)
      expect(metadata.breakingChanges).toBe(false)
      expect(metadata.authorNotes).toBe('This version adds support for new stage types')
    })
  })

  describe('VersionFilters', () => {
    it('should have correct structure', () => {
      const filters: VersionFilters = {
        author: 'user-1',
        dateRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-12-31')
        },
        isPublished: true,
        hasBreakingChanges: false,
        tags: ['feature', 'bugfix']
      }

      expect(filters.author).toBe('user-1')
      expect(filters.dateRange).toBeDefined()
      expect(filters.isPublished).toBe(true)
      expect(filters.hasBreakingChanges).toBe(false)
      expect(filters.tags).toEqual(['feature', 'bugfix'])
    })
  })

  describe('VersionComparison', () => {
    it('should have correct structure', () => {
      const comparison: VersionComparison = {
        fromVersion: '1.0.0',
        toVersion: '1.1.0',
        changes: [
          {
            type: 'node-added',
            targetId: 'node-1',
            description: 'Added new stage node',
            timestamp: new Date()
          }
        ],
        addedNodes: ['node-1'],
        removedNodes: [],
        modifiedNodes: [],
        addedEdges: ['edge-1'],
        removedEdges: [],
        modifiedEdges: [],
        metadataChanges: { category: 'business-process' }
      }

      expect(comparison.fromVersion).toBe('1.0.0')
      expect(comparison.toVersion).toBe('1.1.0')
      expect(comparison.changes).toHaveLength(1)
      expect(comparison.addedNodes).toEqual(['node-1'])
      expect(comparison.removedNodes).toEqual([])
      expect(comparison.modifiedNodes).toEqual([])
      expect(comparison.addedEdges).toEqual(['edge-1'])
      expect(comparison.removedEdges).toEqual([])
      expect(comparison.modifiedEdges).toEqual([])
      expect(comparison.metadataChanges).toEqual({ category: 'business-process' })
    })
  })

  describe('VersionControlOptions', () => {
    it('should have correct structure', () => {
      const options: VersionControlOptions = {
        autoVersion: true,
        changeSummary: 'Added new features',
        isMajorVersion: false,
        breakingChanges: false,
        tags: ['feature', 'enhancement'],
        authorNotes: 'This version includes several improvements'
      }

      expect(options.autoVersion).toBe(true)
      expect(options.changeSummary).toBe('Added new features')
      expect(options.isMajorVersion).toBe(false)
      expect(options.breakingChanges).toBe(false)
      expect(options.tags).toEqual(['feature', 'enhancement'])
      expect(options.authorNotes).toBe('This version includes several improvements')
    })
  })

  describe('PublishOptions', () => {
    it('should have correct structure', () => {
      const options: PublishOptions = {
        version: '1.1.0',
        publishNotes: 'This version is now ready for production',
        notifyCollaborators: true,
        createRelease: true
      }

      expect(options.version).toBe('1.1.0')
      expect(options.publishNotes).toBe('This version is now ready for production')
      expect(options.notifyCollaborators).toBe(true)
      expect(options.createRelease).toBe(true)
    })
  })
}) 