import { SupabaseFunctionModelRepository } from '@/lib/infrastructure/repositories/function-model-repository'
import { createFunctionModel } from '@/lib/domain/entities/function-model-types'
import { createCrossFeatureLink } from '@/lib/domain/entities/cross-feature-link-types'
import { createVersionEntry } from '@/lib/domain/entities/version-control-types'

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        })),
        is: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null }))
    }
  }))
}))

describe('SupabaseFunctionModelRepository', () => {
  let repository: SupabaseFunctionModelRepository
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    repository = new SupabaseFunctionModelRepository()
    
    // Get the mocked Supabase instance
    const { createClient } = require('@supabase/supabase-js')
    mockSupabase = createClient()
  })

  describe('create', () => {
    it('should create a function model successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      const mockInsert = jest.fn().mockResolvedValue({ data: model, error: null })
      
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      const result = await repository.create(model)

      expect(mockSupabase.from).toHaveBeenCalledWith('function_models')
      expect(mockInsert).toHaveBeenCalledWith(model)
      expect(result).toEqual(model)
    })

    it('should throw error when creation fails', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      const mockInsert = jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      })
      const mockSelect = jest.fn().mockReturnValue({ insert: mockInsert })
      
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      await expect(repository.create(model)).rejects.toThrow('Database error')
    })
  })

  describe('getById', () => {
    it('should retrieve a function model by ID', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      const mockSingle = jest.fn().mockResolvedValue({ data: model, error: null })
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await repository.getById('test-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('function_models')
      expect(mockEq).toHaveBeenCalledWith('model_id', 'test-id')
      expect(result).toEqual(model)
    })

    it('should return null when model not found', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null })
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await repository.getById('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('update', () => {
    it('should update a function model successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      const updates = { name: 'Updated Model' }
      const updatedModel = { ...model, ...updates }
      
      const mockEq = jest.fn().mockResolvedValue({ data: updatedModel, error: null })
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })
      const mockSelect = jest.fn().mockReturnValue({ update: mockUpdate })
      
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await repository.update('test-id', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('function_models')
      expect(mockUpdate).toHaveBeenCalledWith(updates)
      expect(mockEq).toHaveBeenCalledWith('model_id', 'test-id')
      expect(result).toEqual(updatedModel)
    })

    it('should throw error when update fails', async () => {
      const updates = { name: 'Updated Model' }
      const mockEq = jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Update failed' } 
      })
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })
      const mockSelect = jest.fn().mockReturnValue({ update: mockUpdate })
      
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      await expect(repository.update('test-id', updates)).rejects.toThrow('Update failed')
    })
  })

  describe('delete', () => {
    it('should delete a function model successfully', async () => {
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null })
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq })
      const mockSelect = jest.fn().mockReturnValue({ delete: mockDelete })
      
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      await repository.delete('test-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('function_models')
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('model_id', 'test-id')
    })

    it('should throw error when deletion fails', async () => {
      const mockEq = jest.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Delete failed' } 
      })
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq })
      const mockSelect = jest.fn().mockReturnValue({ delete: mockDelete })
      
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      await expect(repository.delete('test-id')).rejects.toThrow('Delete failed')
    })
  })

  describe('getVersion', () => {
    it('should retrieve a specific version of a function model', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      const mockSingle = jest.fn().mockResolvedValue({ data: model, error: null })
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await repository.getVersion('test-id', '1.0.0')

      expect(mockSupabase.from).toHaveBeenCalledWith('function_model_versions')
      expect(mockEq).toHaveBeenCalledWith('model_id', 'test-id')
      expect(result).toEqual(model)
    })
  })

  describe('getVersionHistory', () => {
    it('should retrieve version history for a function model', async () => {
      const versions = [
        {
          version: '1.0.0',
          timestamp: new Date(),
          author: 'author',
          changes: [{ type: 'metadata-changed' as const, targetId: 'test-id', description: 'Test changes', timestamp: new Date() }],
          snapshot: { modelId: 'test-id', version: '1.0.0', nodesData: [], edgesData: [], viewportData: {}, metadata: {}, timestamp: new Date() },
          isPublished: false
        },
        {
          version: '1.1.0',
          timestamp: new Date(),
          author: 'author',
          changes: [{ type: 'metadata-changed' as const, targetId: 'test-id', description: 'More changes', timestamp: new Date() }],
          snapshot: { modelId: 'test-id', version: '1.1.0', nodesData: [], edgesData: [], viewportData: {}, metadata: {}, timestamp: new Date() },
          isPublished: false
        }
      ]
      
      const mockLimit = jest.fn().mockResolvedValue({ data: versions, error: null })
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit })
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await repository.getVersionHistory('test-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('function_model_versions')
      expect(mockEq).toHaveBeenCalledWith('model_id', 'test-id')
      expect(mockOrder).toHaveBeenCalledWith('version_number', { ascending: false })
      expect(result).toEqual(versions)
    })
  })

  describe('createCrossFeatureLink', () => {
    it('should create a cross-feature link successfully', async () => {
      const link = createCrossFeatureLink(
        'function-model',
        'source-id',
        'knowledge-base',
        'target-id',
        'documents'
      )
      
      const mockInsert = jest.fn().mockResolvedValue({ data: link, error: null })
      const mockSelect = jest.fn().mockReturnValue({ insert: mockInsert })
      
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await repository.createCrossFeatureLink(link)

      expect(mockSupabase.from).toHaveBeenCalledWith('cross_feature_links')
      expect(mockInsert).toHaveBeenCalledWith(link)
      expect(result).toEqual(link)
    })
  })

  describe('getCrossFeatureLinks', () => {
    it('should retrieve cross-feature links for a source entity', async () => {
      const links = [
        createCrossFeatureLink('function-model', 'source-id', 'knowledge-base', 'target-1', 'documents'),
        createCrossFeatureLink('function-model', 'source-id', 'spindle', 'target-2', 'implements')
      ]
      
      const mockLimit = jest.fn().mockResolvedValue({ data: links, error: null })
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit })
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await repository.getCrossFeatureLinks('source-id', 'function-model')

      expect(mockSupabase.from).toHaveBeenCalledWith('cross_feature_links')
      expect(mockEq).toHaveBeenCalledWith('source_id', 'source-id')
      expect(result).toEqual(links)
    })
  })

  describe('search', () => {
    it('should search function models with filters', async () => {
      const models = [
        createFunctionModel('Model 1', 'Description 1'),
        createFunctionModel('Model 2', 'Description 2')
      ]
      
      const mockLimit = jest.fn().mockResolvedValue({ data: models, error: null })
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit })
      const mockSelect = jest.fn().mockReturnValue({ order: mockOrder })
      
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const filters = { status: 'published' as const, category: 'business' }
      const result = await repository.search('test query', filters)

      expect(mockSupabase.from).toHaveBeenCalledWith('function_models')
      expect(result).toEqual(models)
    })
  })
}) 