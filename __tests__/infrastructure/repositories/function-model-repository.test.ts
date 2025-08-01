import { SupabaseFunctionModelRepository } from '../../../lib/infrastructure/repositories/function-model-repository'
import { createFunctionModel } from '../../../lib/domain/entities/function-model-types'
import { createCrossFeatureLink } from '../../../lib/domain/entities/cross-feature-link-types'
import { createVersionEntry, createChangeDescription, createFunctionModelSnapshot } from '../../../lib/domain/entities/version-control-types'

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({
          data: null,
          error: null
        }))
      })),
      is: jest.fn(() => ({
        single: jest.fn(() => ({
          data: null,
          error: null
        }))
      })),
      order: jest.fn(() => ({
        data: [],
        error: null
      })),
      or: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [],
            error: null
          }))
        }))
      })),
      overlaps: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null
        }))
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [],
            error: null
          }))
        }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          data: null,
          error: null
        }))
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null
      }))
    }))
  })),
  auth: {
    getUser: jest.fn(() => ({
      data: {
        user: {
          id: 'test-user-id'
        }
      }
    }))
  }
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}))

describe('SupabaseFunctionModelRepository', () => {
  let repository: SupabaseFunctionModelRepository

  beforeEach(() => {
    repository = new SupabaseFunctionModelRepository()
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('should create a function model successfully', async () => {
      const modelData = createFunctionModel('Test Model', 'Test Description')
      const mockData = {
        model_id: 'test-id',
        name: 'Test Model',
        description: 'Test Description',
        version: '1.0.0',
        status: 'draft',
        nodes_data: [],
        edges_data: [],
        viewport_data: { x: 0, y: 0, zoom: 1 },
        tags: [],
        metadata: {},
        permissions: {},
        current_version: '1.0.0',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_saved_at: '2023-01-01T00:00:00Z'
      }

      const mockInsert = mockSupabase.from().insert()
      const mockSelect = mockInsert.select()
      const mockSingle = mockSelect.single()
      mockSingle.data = mockData
      mockSingle.error = null

      const result = await repository.create(modelData)

      expect(mockSupabase.from).toHaveBeenCalledWith('function_models')
      expect(mockInsert).toHaveBeenCalledWith({
        name: 'Test Model',
        description: 'Test Description',
        version: '1.0.0',
        status: 'draft',
        nodes_data: [],
        edges_data: [],
        viewport_data: { x: 0, y: 0, zoom: 1 },
        tags: [],
        metadata: {},
        permissions: {},
        current_version: '1.0.0',
        version_count: 1
      })
      expect(result.modelId).toBe('test-id')
      expect(result.name).toBe('Test Model')
    })

    it('should throw error when creation fails', async () => {
      const modelData = createFunctionModel('Test Model', 'Test Description')
      
      const mockInsert = mockSupabase.from().insert()
      const mockSelect = mockInsert.select()
      const mockSingle = mockSelect.single()
      mockSingle.data = null
      mockSingle.error = { message: 'Creation failed' }

      await expect(repository.create(modelData)).rejects.toThrow('Failed to create function model: Creation failed')
    })
  })

  describe('getById', () => {
    it('should return function model when found', async () => {
      const mockData = {
        model_id: 'test-id',
        name: 'Test Model',
        description: 'Test Description',
        version: '1.0.0',
        status: 'draft',
        nodes_data: [],
        edges_data: [],
        viewport_data: { x: 0, y: 0, zoom: 1 },
        tags: [],
        metadata: {},
        permissions: {},
        current_version: '1.0.0',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_saved_at: '2023-01-01T00:00:00Z'
      }

      const mockSelect = mockSupabase.from().select()
      const mockEq = mockSelect.eq()
      const mockIs = mockEq.is()
      const mockSingle = mockIs.single()
      mockSingle.data = mockData
      mockSingle.error = null

      const result = await repository.getById('test-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('function_models')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('model_id', 'test-id')
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
      expect(result).toBeDefined()
      expect(result?.modelId).toBe('test-id')
    })

    it('should return null when model not found', async () => {
      const mockSelect = mockSupabase.from().select()
      const mockEq = mockSelect.eq()
      const mockIs = mockEq.is()
      const mockSingle = mockIs.single()
      mockSingle.data = null
      mockSingle.error = { code: 'PGRST116' }

      const result = await repository.getById('non-existent-id')

      expect(result).toBeNull()
    })

    it('should throw error when database error occurs', async () => {
      const mockSelect = mockSupabase.from().select()
      const mockEq = mockSelect.eq()
      const mockIs = mockEq.is()
      const mockSingle = mockIs.single()
      mockSingle.data = null
      mockSingle.error = { message: 'Database error' }

      await expect(repository.getById('test-id')).rejects.toThrow('Failed to get function model: Database error')
    })
  })

  describe('update', () => {
    it('should update function model successfully', async () => {
      const updates = {
        name: 'Updated Model',
        description: 'Updated Description',
        version: '1.1.0'
      }

      const mockData = {
        model_id: 'test-id',
        name: 'Updated Model',
        description: 'Updated Description',
        version: '1.1.0',
        status: 'draft',
        nodes_data: [],
        edges_data: [],
        viewport_data: { x: 0, y: 0, zoom: 1 },
        tags: [],
        metadata: {},
        permissions: {},
        current_version: '1.1.0',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_saved_at: '2023-01-01T00:00:00Z'
      }

      const mockUpdate = mockSupabase.from().update()
      const mockEq = mockUpdate.eq()
      const mockSelect = mockEq.select()
      const mockSingle = mockSelect.single()
      mockSingle.data = mockData
      mockSingle.error = null

      const result = await repository.update('test-id', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('function_models')
      expect(mockUpdate).toHaveBeenCalledWith({
        name: 'Updated Model',
        description: 'Updated Description',
        version: '1.1.0',
        updated_at: expect.any(String),
        last_saved_at: expect.any(String)
      })
      expect(mockEq).toHaveBeenCalledWith('model_id', 'test-id')
      expect(result.name).toBe('Updated Model')
    })
  })

  describe('delete', () => {
    it('should delete function model successfully', async () => {
      const mockUpdate = mockSupabase.from().update()
      const mockEq = mockUpdate.eq()
      mockEq.data = null
      mockEq.error = null

      await repository.delete('test-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('function_models')
      expect(mockUpdate).toHaveBeenCalledWith({
        deleted_at: expect.any(String),
        deleted_by: 'test-user-id'
      })
      expect(mockEq).toHaveBeenCalledWith('model_id', 'test-id')
    })
  })

  describe('saveVersion', () => {
    it('should save version successfully', async () => {
      const changeDescription = createChangeDescription(
        'node-added',
        'node-1',
        'Added new node'
      )

      const snapshot = createFunctionModelSnapshot(
        'model-1',
        '1.1.0',
        [],
        [],
        { x: 0, y: 0, zoom: 1 },
        {}
      )

      const versionEntry = createVersionEntry(
        '1.1.0',
        'user-1',
        [changeDescription],
        snapshot
      )

      const mockInsert = mockSupabase.from().insert()
      mockInsert.data = null
      mockInsert.error = null

      await repository.saveVersion('model-1', versionEntry)

      expect(mockSupabase.from).toHaveBeenCalledWith('function_model_versions')
      expect(mockInsert).toHaveBeenCalledWith({
        model_id: 'model-1',
        version_number: '1.1.0',
        version_data: snapshot,
        change_summary: 'Added new node',
        author_id: 'test-user-id',
        is_published: false
      })
    })
  })

  describe('getVersion', () => {
    it('should return function model from version', async () => {
      const mockSnapshot = {
        modelId: 'model-1',
        name: 'Test Model',
        description: 'Test Description',
        version: '1.1.0',
        status: 'draft',
        nodesData: [],
        edgesData: [],
        viewportData: { x: 0, y: 0, zoom: 1 },
        tags: [],
        metadata: {},
        permissions: {},
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        lastSavedAt: '2023-01-01T00:00:00Z'
      }

      const mockData = {
        version_data: mockSnapshot
      }

      const mockSelect = mockSupabase.from().select()
      const mockEq1 = mockSelect.eq()
      const mockEq2 = mockEq1.eq()
      const mockSingle = mockEq2.single()
      mockSingle.data = mockData
      mockSingle.error = null

      const result = await repository.getVersion('model-1', '1.1.0')

      expect(mockSupabase.from).toHaveBeenCalledWith('function_model_versions')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq1).toHaveBeenCalledWith('model_id', 'model-1')
      expect(mockEq2).toHaveBeenCalledWith('version_number', '1.1.0')
      expect(result).toBeDefined()
      expect(result?.modelId).toBe('model-1')
      expect(result?.version).toBe('1.1.0')
    })
  })

  describe('getVersionHistory', () => {
    it('should return version history', async () => {
      const mockData = [
        {
          version_number: '1.1.0',
          created_at: '2023-01-01T00:00:00Z',
          author_id: 'user-1',
          version_data: {},
          is_published: true
        },
        {
          version_number: '1.0.0',
          created_at: '2023-01-01T00:00:00Z',
          author_id: 'user-1',
          version_data: {},
          is_published: false
        }
      ]

      const mockSelect = mockSupabase.from().select()
      const mockEq = mockSelect.eq()
      const mockOrder = mockEq.order()
      mockOrder.data = mockData
      mockOrder.error = null

      const result = await repository.getVersionHistory('model-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('function_model_versions')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('model_id', 'model-1')
      expect(mockOrder).toHaveBeenCalledWith('version_number', { ascending: false })
      expect(result).toHaveLength(2)
      expect(result[0].version).toBe('1.1.0')
      expect(result[1].version).toBe('1.0.0')
    })
  })

  describe('publishVersion', () => {
    it('should publish version successfully', async () => {
      const mockUpdate = mockSupabase.from().update()
      const mockEq1 = mockUpdate.eq()
      const mockEq2 = mockEq1.eq()
      mockEq2.data = null
      mockEq2.error = null

      await repository.publishVersion('model-1', '1.1.0')

      expect(mockSupabase.from).toHaveBeenCalledWith('function_model_versions')
      expect(mockUpdate).toHaveBeenCalledWith({ is_published: true })
      expect(mockEq1).toHaveBeenCalledWith('model_id', 'model-1')
      expect(mockEq2).toHaveBeenCalledWith('version_number', '1.1.0')
    })
  })

  describe('createCrossFeatureLink', () => {
    it('should create cross-feature link successfully', async () => {
      const linkData = createCrossFeatureLink(
        'function-model',
        'model-1',
        'knowledge-base',
        'doc-1',
        'documents',
        { section: 'process' }
      )

      const mockData = {
        link_id: 'link-1',
        source_feature: 'function-model',
        source_id: 'model-1',
        target_feature: 'knowledge-base',
        target_id: 'doc-1',
        link_type: 'documents',
        link_context: { section: 'process' },
        link_strength: 1.0,
        created_at: '2023-01-01T00:00:00Z',
        created_by: 'test-user-id'
      }

      const mockInsert = mockSupabase.from().insert()
      const mockSelect = mockInsert.select()
      const mockSingle = mockSelect.single()
      mockSingle.data = mockData
      mockSingle.error = null

      const result = await repository.createCrossFeatureLink(linkData)

      expect(mockSupabase.from).toHaveBeenCalledWith('cross_feature_links')
      expect(mockInsert).toHaveBeenCalledWith({
        source_feature: 'function-model',
        source_id: 'model-1',
        target_feature: 'knowledge-base',
        target_id: 'doc-1',
        link_type: 'documents',
        link_context: { section: 'process' },
        link_strength: 1.0,
        created_by: 'test-user-id'
      })
      expect(result.linkId).toBe('link-1')
      expect(result.sourceFeature).toBe('function-model')
    })
  })

  describe('getCrossFeatureLinks', () => {
    it('should return cross-feature links', async () => {
      const mockData = [
        {
          link_id: 'link-1',
          source_feature: 'function-model',
          source_id: 'model-1',
          target_feature: 'knowledge-base',
          target_id: 'doc-1',
          link_type: 'documents',
          link_context: { section: 'process' },
          link_strength: 1.0,
          created_at: '2023-01-01T00:00:00Z',
          created_by: 'test-user-id'
        }
      ]

      const mockSelect = mockSupabase.from().select()
      const mockEq1 = mockSelect.eq()
      const mockEq2 = mockEq1.eq()
      mockEq2.data = mockData
      mockEq2.error = null

      const result = await repository.getCrossFeatureLinks('model-1', 'function-model')

      expect(mockSupabase.from).toHaveBeenCalledWith('cross_feature_links')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq1).toHaveBeenCalledWith('source_id', 'model-1')
      expect(mockEq2).toHaveBeenCalledWith('source_feature', 'function-model')
      expect(result).toHaveLength(1)
      expect(result[0].linkId).toBe('link-1')
    })
  })

  describe('updateLinkContext', () => {
    it('should update link context successfully', async () => {
      const mockUpdate = mockSupabase.from().update()
      const mockEq = mockUpdate.eq()
      mockEq.data = null
      mockEq.error = null

      await repository.updateLinkContext('link-1', { section: 'updated' })

      expect(mockSupabase.from).toHaveBeenCalledWith('cross_feature_links')
      expect(mockUpdate).toHaveBeenCalledWith({ link_context: { section: 'updated' } })
      expect(mockEq).toHaveBeenCalledWith('link_id', 'link-1')
    })
  })

  describe('deleteCrossFeatureLink', () => {
    it('should delete cross-feature link successfully', async () => {
      const mockDelete = mockSupabase.from().delete()
      const mockEq = mockDelete.eq()
      mockEq.data = null
      mockEq.error = null

      await repository.deleteCrossFeatureLink('link-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('cross_feature_links')
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('link_id', 'link-1')
    })
  })

  describe('search', () => {
    it('should search function models with query and filters', async () => {
      const mockData = [
        {
          model_id: 'model-1',
          name: 'Test Model',
          description: 'Test Description',
          version: '1.0.0',
          status: 'draft',
          nodes_data: [],
          edges_data: [],
          viewport_data: { x: 0, y: 0, zoom: 1 },
          tags: [],
          metadata: {},
          permissions: {},
          current_version: '1.0.0',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          last_saved_at: '2023-01-01T00:00:00Z'
        }
      ]

      const mockSelect = mockSupabase.from().select()
      const mockIs = mockSelect.is()
      const mockOr = mockIs.or()
      const mockEq = mockOr.eq()
      const mockOrder = mockEq.order()
      mockOrder.data = mockData
      mockOrder.error = null

      const filters = {
        status: 'draft' as const,
        processType: 'business-process',
        complexityLevel: 'simple' as const,
        tags: ['test']
      }

      const result = await repository.search('test', filters)

      expect(mockSupabase.from).toHaveBeenCalledWith('function_models')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
      expect(result).toHaveLength(1)
      expect(result[0].modelId).toBe('model-1')
    })
  })

  describe('getByUser', () => {
    it('should return function models by user', async () => {
      const mockData = [
        {
          model_id: 'model-1',
          name: 'Test Model',
          description: 'Test Description',
          version: '1.0.0',
          status: 'draft',
          nodes_data: [],
          edges_data: [],
          viewport_data: { x: 0, y: 0, zoom: 1 },
          tags: [],
          metadata: {},
          permissions: {},
          current_version: '1.0.0',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          last_saved_at: '2023-01-01T00:00:00Z'
        }
      ]

      const mockSelect = mockSupabase.from().select()
      const mockIs = mockSelect.is()
      const mockOrder = mockIs.order()
      mockOrder.data = mockData
      mockOrder.error = null

      const result = await repository.getByUser('user-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('function_models')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toHaveLength(1)
      expect(result[0].modelId).toBe('model-1')
    })
  })

  describe('getByCategory', () => {
    it('should return function models by category', async () => {
      const mockData = [
        {
          model_id: 'model-1',
          name: 'Test Model',
          description: 'Test Description',
          version: '1.0.0',
          status: 'draft',
          nodes_data: [],
          edges_data: [],
          viewport_data: { x: 0, y: 0, zoom: 1 },
          tags: [],
          metadata: {},
          permissions: {},
          current_version: '1.0.0',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          last_saved_at: '2023-01-01T00:00:00Z'
        }
      ]

      const mockSelect = mockSupabase.from().select()
      const mockIs = mockSelect.is()
      const mockEq = mockIs.eq()
      const mockOrder = mockEq.order()
      mockOrder.data = mockData
      mockOrder.error = null

      const result = await repository.getByCategory('business-process')

      expect(mockSupabase.from).toHaveBeenCalledWith('function_models')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
      expect(mockEq).toHaveBeenCalledWith('metadata->>category', 'business-process')
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toHaveLength(1)
      expect(result[0].modelId).toBe('model-1')
    })
  })

  describe('getByProcessType', () => {
    it('should return function models by process type', async () => {
      const mockData = [
        {
          model_id: 'model-1',
          name: 'Test Model',
          description: 'Test Description',
          version: '1.0.0',
          status: 'draft',
          nodes_data: [],
          edges_data: [],
          viewport_data: { x: 0, y: 0, zoom: 1 },
          tags: [],
          metadata: {},
          permissions: {},
          current_version: '1.0.0',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          last_saved_at: '2023-01-01T00:00:00Z'
        }
      ]

      const mockSelect = mockSupabase.from().select()
      const mockIs = mockSelect.is()
      const mockEq = mockIs.eq()
      const mockOrder = mockEq.order()
      mockOrder.data = mockData
      mockOrder.error = null

      const result = await repository.getByProcessType('business-process')

      expect(mockSupabase.from).toHaveBeenCalledWith('function_models')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
      expect(mockEq).toHaveBeenCalledWith('process_type', 'business-process')
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toHaveLength(1)
      expect(result[0].modelId).toBe('model-1')
    })
  })
}) 