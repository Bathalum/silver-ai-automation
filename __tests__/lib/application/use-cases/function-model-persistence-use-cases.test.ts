import {
  saveFunctionModel,
  loadFunctionModel,
  createNewFunctionModel,
  deleteFunctionModel,
  createNewCrossFeatureLink,
  getCrossFeatureLinks,
  updateCrossFeatureLinkContext,
  deleteCrossFeatureLink,
  createVersionSnapshot,
  getVersionHistory,
  publishVersion,
  searchFunctionModels,
  getFunctionModelsByUser,
  getFunctionModelsByCategory,
  getFunctionModelsByProcessType,
  updateFunctionModelMetadata,
  updateFunctionModelPermissions,
  exportFunctionModel,
  importFunctionModel
} from '@/lib/application/use-cases/function-model-persistence-use-cases'
import { createFunctionModel, isValidFunctionModel } from '@/lib/domain/entities/function-model-types'
import { createCrossFeatureLink, isValidCrossFeatureLink } from '@/lib/domain/entities/cross-feature-link-types'
import { createVersionEntry, createChangeDescription, createFunctionModelSnapshot } from '@/lib/domain/entities/version-control-types'

// Mock the repository
jest.mock('@/lib/infrastructure/repositories/function-model-repository', () => ({
  functionModelRepository: {
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getVersion: jest.fn(),
    getVersionHistory: jest.fn(),
    saveVersion: jest.fn(),
    publishVersion: jest.fn(),
    createCrossFeatureLink: jest.fn(),
    getCrossFeatureLinks: jest.fn(),
    updateLinkContext: jest.fn(),
    deleteCrossFeatureLink: jest.fn(),
    search: jest.fn(),
    getByUser: jest.fn(),
    getByCategory: jest.fn(),
    getByProcessType: jest.fn()
  }
}))

describe('Function Model Persistence Use Cases', () => {
  let mockRepository: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Get the mocked repository
    const { functionModelRepository } = require('@/lib/infrastructure/repositories/function-model-repository')
    mockRepository = functionModelRepository
  })

  // Helper function to create a complete FunctionModel for testing
  const createTestModel = (name: string, description: string, modelId: string = 'test-id'): any => {
    const baseModel = createFunctionModel(name, description)
    return {
      ...baseModel,
      modelId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSavedAt: new Date()
    }
  }

  describe('saveFunctionModel', () => {
    it('should save a function model successfully', async () => {
      const model = createTestModel('Test Model', 'Test Description')
      const savedModel = { ...model, lastSavedAt: new Date() }
      
      mockRepository.update.mockResolvedValue(savedModel)

      const result = await saveFunctionModel(model)

      expect(mockRepository.update).toHaveBeenCalledWith(model.modelId, expect.objectContaining({
        lastSavedAt: expect.any(Date)
      }))
      expect(result).toEqual(savedModel)
    })

    it('should throw error for invalid model', async () => {
      const invalidModel = { 
        ...createFunctionModel('Test', 'Test'), 
        modelId: 'test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSavedAt: new Date()
      } as any
      invalidModel.name = undefined // Invalid: missing name

      await expect(saveFunctionModel(invalidModel)).rejects.toThrow('Invalid Function Model data')
    })

    it('should create version snapshot when auto-versioning is enabled', async () => {
      const model = createTestModel('Test Model', 'Test Description')
      const savedModel = { ...model, lastSavedAt: new Date() }
      
      mockRepository.update.mockResolvedValue(savedModel)
      mockRepository.saveVersion.mockResolvedValue(undefined)

      await saveFunctionModel(model, { autoVersion: true, changeSummary: 'Test changes' })

      expect(mockRepository.saveVersion).toHaveBeenCalledWith(
        model.modelId,
        expect.objectContaining({
          version: expect.any(String),
          author: expect.any(String),
          changes: expect.arrayContaining([
            expect.objectContaining({
              type: 'metadata-changed',
              targetId: model.modelId,
              description: 'Test changes'
            })
          ]),
          snapshot: expect.objectContaining({
            modelId: model.modelId,
            version: expect.any(String),
            nodesData: model.nodesData,
            edgesData: model.edgesData
          })
        })
      )
    })
  })

  describe('loadFunctionModel', () => {
    it('should load a function model by ID', async () => {
      const model = createTestModel('Test Model', 'Test Description')
      mockRepository.getById.mockResolvedValue(model)

      const result = await loadFunctionModel('test-id')

      expect(mockRepository.getById).toHaveBeenCalledWith('test-id')
      expect(result).toEqual(model)
    })

    it('should load a specific version when provided', async () => {
      const model = createTestModel('Test Model', 'Test Description')
      mockRepository.getVersion.mockResolvedValue(model)

      const result = await loadFunctionModel('test-id', { version: '1.0.0' })

      expect(mockRepository.getVersion).toHaveBeenCalledWith('test-id', '1.0.0')
      expect(result).toEqual(model)
    })

    it('should throw error when model not found', async () => {
      mockRepository.getById.mockResolvedValue(null)

      await expect(loadFunctionModel('non-existent-id')).rejects.toThrow('Function Model not found: non-existent-id')
    })

    it('should include version history when requested', async () => {
      const model = createTestModel('Test Model', 'Test Description')
      const versionHistory = [
        {
          version: '1.0.0',
          timestamp: new Date(),
          author: 'author',
          changes: [{ type: 'metadata-changed' as const, targetId: 'test-id', description: 'Initial version', timestamp: new Date() }],
          snapshot: { modelId: 'test-id', version: '1.0.0', nodesData: [], edgesData: [], viewportData: {}, metadata: {}, timestamp: new Date() },
          isPublished: false
        },
        {
          version: '1.1.0',
          timestamp: new Date(),
          author: 'author',
          changes: [{ type: 'metadata-changed' as const, targetId: 'test-id', description: 'Updated version', timestamp: new Date() }],
          snapshot: { modelId: 'test-id', version: '1.1.0', nodesData: [], edgesData: [], viewportData: {}, metadata: {}, timestamp: new Date() },
          isPublished: false
        }
      ]
      
      mockRepository.getById.mockResolvedValue(model)
      mockRepository.getVersionHistory.mockResolvedValue(versionHistory)

      const result = await loadFunctionModel('test-id', { includeMetadata: true })

      expect(mockRepository.getVersionHistory).toHaveBeenCalledWith('test-id')
      expect(result.versionHistory).toEqual(versionHistory)
    })
  })

  describe('createNewFunctionModel', () => {
    it('should create a new function model', async () => {
      const model = createTestModel('New Model', 'New Description')
      mockRepository.create.mockResolvedValue(model)

      const result = await createNewFunctionModel('New Model', 'New Description')

      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Model',
        description: 'New Description'
      }))
      expect(result).toEqual(model)
    })
  })

  describe('deleteFunctionModel', () => {
    it('should delete a function model', async () => {
      mockRepository.delete.mockResolvedValue(undefined)

      await deleteFunctionModel('test-id')

      expect(mockRepository.delete).toHaveBeenCalledWith('test-id')
    })
  })

  describe('createNewCrossFeatureLink', () => {
    it('should create a new cross-feature link', async () => {
      const link = createCrossFeatureLink(
        'function-model',
        'source-id',
        'knowledge-base',
        'target-id',
        'documents'
      )
      
      mockRepository.getCrossFeatureLinks.mockResolvedValue([])
      mockRepository.createCrossFeatureLink.mockResolvedValue(link)

      const result = await createNewCrossFeatureLink(
        'function-model',
        'source-id',
        'knowledge-base',
        'target-id',
        'documents'
      )

      expect(mockRepository.createCrossFeatureLink).toHaveBeenCalledWith(expect.objectContaining({
        sourceFeature: 'function-model',
        sourceId: 'source-id',
        targetFeature: 'knowledge-base',
        targetId: 'target-id',
        linkType: 'documents'
      }))
      expect(result).toEqual(link)
    })

    it('should throw error when link already exists', async () => {
      const existingLink = createCrossFeatureLink(
        'function-model',
        'source-id',
        'knowledge-base',
        'target-id',
        'documents'
      )
      
      mockRepository.getCrossFeatureLinks.mockResolvedValue([existingLink])

      await expect(createNewCrossFeatureLink(
        'function-model',
        'source-id',
        'knowledge-base',
        'target-id',
        'documents'
      )).rejects.toThrow('Cross-feature link already exists')
    })
  })

  describe('getCrossFeatureLinks', () => {
    it('should retrieve cross-feature links', async () => {
      const links = [
        createCrossFeatureLink('function-model', 'source-id', 'knowledge-base', 'target-1', 'documents'),
        createCrossFeatureLink('function-model', 'source-id', 'spindle', 'target-2', 'implements')
      ]
      
      mockRepository.getCrossFeatureLinks.mockResolvedValue(links)

      const result = await getCrossFeatureLinks('source-id', 'function-model')

      expect(mockRepository.getCrossFeatureLinks).toHaveBeenCalledWith('source-id', 'function-model')
      expect(result).toEqual(links)
    })
  })

  describe('updateCrossFeatureLinkContext', () => {
    it('should update cross-feature link context', async () => {
      const context = { note: 'Updated context' }
      mockRepository.updateLinkContext.mockResolvedValue(undefined)

      await updateCrossFeatureLinkContext('link-id', context)

      expect(mockRepository.updateLinkContext).toHaveBeenCalledWith('link-id', context)
    })
  })

  describe('deleteCrossFeatureLink', () => {
    it('should delete a cross-feature link', async () => {
      mockRepository.deleteCrossFeatureLink.mockResolvedValue(undefined)

      await deleteCrossFeatureLink('link-id')

      expect(mockRepository.deleteCrossFeatureLink).toHaveBeenCalledWith('link-id')
    })
  })

  describe('createVersionSnapshot', () => {
    it('should create a version snapshot', async () => {
      const model = createTestModel('Test Model', 'Test Description')
      
      mockRepository.saveVersion.mockResolvedValue(undefined)

      await createVersionSnapshot(model, 'Test changes')

      expect(mockRepository.saveVersion).toHaveBeenCalledWith(
        model.modelId,
        expect.objectContaining({
          version: expect.any(String),
          author: expect.any(String),
          changes: expect.arrayContaining([
            expect.objectContaining({
              type: 'metadata-changed',
              targetId: model.modelId,
              description: 'Test changes'
            })
          ]),
          snapshot: expect.objectContaining({
            modelId: model.modelId,
            version: expect.any(String),
            nodesData: model.nodesData,
            edgesData: model.edgesData
          })
        })
      )
    })
  })

  describe('getVersionHistory', () => {
    it('should retrieve version history', async () => {
      const versions = [
        {
          version: '1.0.0',
          timestamp: new Date(),
          author: 'author',
          changes: [{ type: 'metadata-changed' as const, targetId: 'test-id', description: 'Initial version', timestamp: new Date() }],
          snapshot: { modelId: 'test-id', version: '1.0.0', nodesData: [], edgesData: [], viewportData: {}, metadata: {}, timestamp: new Date() },
          isPublished: false
        },
        {
          version: '1.1.0',
          timestamp: new Date(),
          author: 'author',
          changes: [{ type: 'metadata-changed' as const, targetId: 'test-id', description: 'Updated version', timestamp: new Date() }],
          snapshot: { modelId: 'test-id', version: '1.1.0', nodesData: [], edgesData: [], viewportData: {}, metadata: {}, timestamp: new Date() },
          isPublished: false
        }
      ]
      
      mockRepository.getVersionHistory.mockResolvedValue(versions)

      const result = await getVersionHistory('test-id')

      expect(mockRepository.getVersionHistory).toHaveBeenCalledWith('test-id')
      expect(result).toEqual(versions)
    })
  })

  describe('publishVersion', () => {
    it('should publish a version', async () => {
      mockRepository.publishVersion.mockResolvedValue(undefined)

      await publishVersion('test-id', '1.0.0')

      expect(mockRepository.publishVersion).toHaveBeenCalledWith('test-id', '1.0.0')
    })
  })

  describe('searchFunctionModels', () => {
    it('should search function models', async () => {
      const models = [
        createTestModel('Model 1', 'Description 1'),
        createTestModel('Model 2', 'Description 2')
      ]
      
      mockRepository.search.mockResolvedValue(models)

      const filters = { status: 'published' as const, category: 'business' }
      const result = await searchFunctionModels('test query', filters)

      expect(mockRepository.search).toHaveBeenCalledWith('test query', filters)
      expect(result).toEqual(models)
    })
  })

  describe('getFunctionModelsByUser', () => {
    it('should get function models by user', async () => {
      const models = [
        createTestModel('User Model 1', 'Description 1'),
        createTestModel('User Model 2', 'Description 2')
      ]
      
      mockRepository.getByUser.mockResolvedValue(models)

      const result = await getFunctionModelsByUser('user-id')

      expect(mockRepository.getByUser).toHaveBeenCalledWith('user-id')
      expect(result).toEqual(models)
    })
  })

  describe('getFunctionModelsByCategory', () => {
    it('should get function models by category', async () => {
      const models = [
        createTestModel('Category Model 1', 'Description 1'),
        createTestModel('Category Model 2', 'Description 2')
      ]
      
      mockRepository.getByCategory.mockResolvedValue(models)

      const result = await getFunctionModelsByCategory('business')

      expect(mockRepository.getByCategory).toHaveBeenCalledWith('business')
      expect(result).toEqual(models)
    })
  })

  describe('getFunctionModelsByProcessType', () => {
    it('should get function models by process type', async () => {
      const models = [
        createTestModel('Process Model 1', 'Description 1'),
        createTestModel('Process Model 2', 'Description 2')
      ]
      
      mockRepository.getByProcessType.mockResolvedValue(models)

      const result = await getFunctionModelsByProcessType('automation')

      expect(mockRepository.getByProcessType).toHaveBeenCalledWith('automation')
      expect(result).toEqual(models)
    })
  })

  describe('updateFunctionModelMetadata', () => {
    it('should update function model metadata', async () => {
      const model = createTestModel('Test Model', 'Test Description')
      const updatedModel = { ...model, metadata: { ...model.metadata, category: 'updated' } }
      
      mockRepository.getById.mockResolvedValue(model)
      mockRepository.update.mockResolvedValue(updatedModel)

      const metadata = { category: 'updated' }
      const result = await updateFunctionModelMetadata('test-id', metadata)

      expect(mockRepository.getById).toHaveBeenCalledWith('test-id')
      expect(mockRepository.update).toHaveBeenCalledWith('test-id', expect.objectContaining({
        metadata: expect.objectContaining({ category: 'updated' })
      }))
      expect(result).toEqual(updatedModel)
    })
  })

  describe('updateFunctionModelPermissions', () => {
    it('should update function model permissions', async () => {
      const model = createTestModel('Test Model', 'Test Description')
      const updatedModel = { ...model, permissions: { ...model.permissions, canEdit: false } }
      
      mockRepository.getById.mockResolvedValue(model)
      mockRepository.update.mockResolvedValue(updatedModel)

      const permissions = { canEdit: false }
      const result = await updateFunctionModelPermissions('test-id', permissions)

      expect(mockRepository.getById).toHaveBeenCalledWith('test-id')
      expect(mockRepository.update).toHaveBeenCalledWith('test-id', expect.objectContaining({
        permissions: expect.objectContaining({ canEdit: false })
      }))
      expect(result).toEqual(updatedModel)
    })
  })

  describe('exportFunctionModel', () => {
    it('should export a function model', async () => {
      const model = createTestModel('Test Model', 'Test Description')
      mockRepository.getById.mockResolvedValue(model)

      const result = await exportFunctionModel('test-id', 'json')

      expect(mockRepository.getById).toHaveBeenCalledWith('test-id')
      expect(result).toContain('"name": "Test Model"')
      expect(result).toContain('"description": "Test Description"')
    })
  })

  describe('importFunctionModel', () => {
    it('should import a function model', async () => {
      const model = createTestModel('Imported Model', 'Imported Description')
      const importData = JSON.stringify({
        modelId: 'imported-id',
        name: 'Imported Model',
        description: 'Imported Description',
        version: '1.0.0',
        status: 'draft',
        nodesData: [],
        edgesData: [],
        viewportData: { x: 0, y: 0, zoom: 1 },
        tags: [],
        metadata: model.metadata,
        permissions: model.permissions,
        versionHistory: [],
        currentVersion: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSavedAt: new Date()
      })

      mockRepository.create.mockResolvedValue(model)

      const result = await importFunctionModel(importData, 'json')

      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Imported Model',
        description: 'Imported Description'
      }))
      expect(result).toEqual(model)
    })
  })
}) 