import {
  saveFunctionModel,
  loadFunctionModel,
  createFunctionModel,
  deleteFunctionModel,
  createCrossFeatureLink,
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
  importFunctionModel,
  validateFunctionModel,
  validateCrossFeatureLink
} from '../../../lib/application/use-cases/function-model-persistence-use-cases'
import { createFunctionModel, isValidFunctionModel } from '../../../lib/domain/entities/function-model-types'
import { createCrossFeatureLink, isValidCrossFeatureLink } from '../../../lib/domain/entities/cross-feature-link-types'
import { createVersionEntry, createChangeDescription, createFunctionModelSnapshot } from '../../../lib/domain/entities/version-control-types'

// Mock the repository
jest.mock('../../../lib/infrastructure/repositories/function-model-repository', () => ({
  functionModelRepository: {
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    saveVersion: jest.fn(),
    getVersion: jest.fn(),
    getVersionHistory: jest.fn(),
    publishVersion: jest.fn(),
    createCrossFeatureLink: jest.fn(),
    getCrossFeatureLinks: jest.fn(),
    getLinkedEntities: jest.fn(),
    updateLinkContext: jest.fn(),
    deleteCrossFeatureLink: jest.fn(),
    search: jest.fn(),
    getByUser: jest.fn(),
    getByCategory: jest.fn(),
    getByProcessType: jest.fn()
  }
}))

import { functionModelRepository } from '../../../lib/infrastructure/repositories/function-model-repository'

const mockRepository = functionModelRepository as jest.Mocked<typeof functionModelRepository>

describe('Function Model Persistence Use Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('saveFunctionModel', () => {
    it('should save function model successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      const savedModel = { ...model, lastSavedAt: new Date() }
      mockRepository.update.mockResolvedValue(savedModel)

      const result = await saveFunctionModel(model)

      expect(mockRepository.update).toHaveBeenCalledWith('test-id', expect.objectContaining({
        lastSavedAt: expect.any(Date)
      }))
      expect(result).toEqual(savedModel)
    })

    it('should throw error for invalid model', async () => {
      const invalidModel = { name: 'Test' } // Missing required fields

      await expect(saveFunctionModel(invalidModel as any)).rejects.toThrow('Invalid Function Model data')
    })

    it('should auto-version when enabled', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'
      model.version = '1.0.0'

      const savedModel = { ...model, version: '1.1.0', lastSavedAt: new Date() }
      mockRepository.update.mockResolvedValue(savedModel)

      const result = await saveFunctionModel(model, { autoVersion: true })

      expect(mockRepository.update).toHaveBeenCalledWith('test-id', expect.objectContaining({
        version: '1.1.0',
        currentVersion: '1.1.0'
      }))
      expect(result).toEqual(savedModel)
    })
  })

  describe('loadFunctionModel', () => {
    it('should load function model successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      mockRepository.getById.mockResolvedValue(model)

      const result = await loadFunctionModel('test-id')

      expect(mockRepository.getById).toHaveBeenCalledWith('test-id')
      expect(result).toEqual(model)
    })

    it('should load specific version when provided', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'
      model.version = '1.1.0'

      mockRepository.getVersion.mockResolvedValue(model)

      const result = await loadFunctionModel('test-id', { version: '1.1.0' })

      expect(mockRepository.getVersion).toHaveBeenCalledWith('test-id', '1.1.0')
      expect(result).toEqual(model)
    })

    it('should throw error when model not found', async () => {
      mockRepository.getById.mockResolvedValue(null)

      await expect(loadFunctionModel('non-existent-id')).rejects.toThrow('Function Model not found: non-existent-id')
    })

    it('should load version history when requested', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      const versionHistory = [
        {
          version: '1.1.0',
          timestamp: new Date(),
          author: 'user-1',
          changes: [],
          snapshot: {} as any,
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

  describe('createFunctionModel', () => {
    it('should create function model successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      mockRepository.create.mockResolvedValue(model)

      const result = await createFunctionModel('Test Model', 'Test Description')

      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Model',
        description: 'Test Description'
      }))
      expect(result).toEqual(model)
    })
  })

  describe('deleteFunctionModel', () => {
    it('should delete function model successfully', async () => {
      mockRepository.delete.mockResolvedValue()

      await deleteFunctionModel('test-id')

      expect(mockRepository.delete).toHaveBeenCalledWith('test-id')
    })
  })

  describe('createCrossFeatureLink', () => {
    it('should create cross-feature link successfully', async () => {
      const link = createCrossFeatureLink(
        'function-model',
        'model-1',
        'knowledge-base',
        'doc-1',
        'documents',
        { section: 'process' }
      )

      mockRepository.createCrossFeatureLink.mockResolvedValue(link)
      mockRepository.getCrossFeatureLinks.mockResolvedValue([])

      const result = await createCrossFeatureLink(
        'function-model',
        'model-1',
        'knowledge-base',
        'doc-1',
        'documents',
        { section: 'process' }
      )

      expect(mockRepository.createCrossFeatureLink).toHaveBeenCalledWith(expect.objectContaining({
        sourceFeature: 'function-model',
        sourceId: 'model-1',
        targetFeature: 'knowledge-base',
        targetId: 'doc-1',
        linkType: 'documents'
      }))
      expect(result).toEqual(link)
    })

    it('should throw error for missing parameters', async () => {
      await expect(createCrossFeatureLink('', 'model-1', 'knowledge-base', 'doc-1', 'documents')).rejects.toThrow('Missing required link parameters')
    })

    it('should throw error for duplicate link', async () => {
      const existingLink = createCrossFeatureLink(
        'function-model',
        'model-1',
        'knowledge-base',
        'doc-1',
        'documents'
      )

      mockRepository.getCrossFeatureLinks.mockResolvedValue([existingLink])

      await expect(createCrossFeatureLink(
        'function-model',
        'model-1',
        'knowledge-base',
        'doc-1',
        'documents'
      )).rejects.toThrow('Cross-feature link already exists')
    })
  })

  describe('getCrossFeatureLinks', () => {
    it('should return cross-feature links', async () => {
      const links = [
        createCrossFeatureLink('function-model', 'model-1', 'knowledge-base', 'doc-1', 'documents')
      ]

      mockRepository.getCrossFeatureLinks.mockResolvedValue(links)

      const result = await getCrossFeatureLinks('model-1', 'function-model')

      expect(mockRepository.getCrossFeatureLinks).toHaveBeenCalledWith('model-1', 'function-model')
      expect(result).toEqual(links)
    })
  })

  describe('updateCrossFeatureLinkContext', () => {
    it('should update link context successfully', async () => {
      mockRepository.updateLinkContext.mockResolvedValue()

      await updateCrossFeatureLinkContext('link-1', { section: 'updated' })

      expect(mockRepository.updateLinkContext).toHaveBeenCalledWith('link-1', { section: 'updated' })
    })
  })

  describe('deleteCrossFeatureLink', () => {
    it('should delete cross-feature link successfully', async () => {
      mockRepository.deleteCrossFeatureLink.mockResolvedValue()

      await deleteCrossFeatureLink('link-1')

      expect(mockRepository.deleteCrossFeatureLink).toHaveBeenCalledWith('link-1')
    })
  })

  describe('createVersionSnapshot', () => {
    it('should create version snapshot successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      const changeDescription = createChangeDescription(
        'node-added',
        'node-1',
        'Added new node'
      )

      const snapshot = createFunctionModelSnapshot(
        'test-id',
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

      mockRepository.saveVersion.mockResolvedValue()

      const result = await createVersionSnapshot(model, 'Added new node')

      expect(mockRepository.saveVersion).toHaveBeenCalledWith('test-id', expect.objectContaining({
        version: '1.1.0',
        author: 'current-user',
        changes: [expect.objectContaining({
          type: 'metadata-changed',
          targetId: 'test-id',
          description: 'Added new node'
        })],
        snapshot: expect.objectContaining({
          modelId: 'test-id',
          version: '1.1.0'
        })
      }))
      expect(result.version).toBe('1.1.0')
    })
  })

  describe('getVersionHistory', () => {
    it('should return version history', async () => {
      const versionHistory = [
        {
          version: '1.1.0',
          timestamp: new Date(),
          author: 'user-1',
          changes: [],
          snapshot: {} as any,
          isPublished: false
        }
      ]

      mockRepository.getVersionHistory.mockResolvedValue(versionHistory)

      const result = await getVersionHistory('test-id')

      expect(mockRepository.getVersionHistory).toHaveBeenCalledWith('test-id')
      expect(result).toEqual(versionHistory)
    })
  })

  describe('publishVersion', () => {
    it('should publish version successfully', async () => {
      const versionHistory = [
        {
          version: '1.1.0',
          timestamp: new Date(),
          author: 'user-1',
          changes: [],
          snapshot: {} as any,
          isPublished: false
        }
      ]

      mockRepository.getVersionHistory.mockResolvedValue(versionHistory)
      mockRepository.publishVersion.mockResolvedValue()

      await publishVersion('test-id', '1.1.0')

      expect(mockRepository.getVersionHistory).toHaveBeenCalledWith('test-id')
      expect(mockRepository.publishVersion).toHaveBeenCalledWith('test-id', '1.1.0')
    })

    it('should throw error when version not found', async () => {
      mockRepository.getVersionHistory.mockResolvedValue([])

      await expect(publishVersion('test-id', '1.1.0')).rejects.toThrow('Version 1.1.0 not found')
    })
  })

  describe('searchFunctionModels', () => {
    it('should search function models successfully', async () => {
      const models = [
        createFunctionModel('Test Model', 'Test Description')
      ]

      mockRepository.search.mockResolvedValue(models)

      const result = await searchFunctionModels('test', { status: 'draft' })

      expect(mockRepository.search).toHaveBeenCalledWith('test', { status: 'draft' })
      expect(result).toEqual(models)
    })
  })

  describe('getFunctionModelsByUser', () => {
    it('should return function models by user', async () => {
      const models = [
        createFunctionModel('Test Model', 'Test Description')
      ]

      mockRepository.getByUser.mockResolvedValue(models)

      const result = await getFunctionModelsByUser('user-1')

      expect(mockRepository.getByUser).toHaveBeenCalledWith('user-1')
      expect(result).toEqual(models)
    })
  })

  describe('getFunctionModelsByCategory', () => {
    it('should return function models by category', async () => {
      const models = [
        createFunctionModel('Test Model', 'Test Description')
      ]

      mockRepository.getByCategory.mockResolvedValue(models)

      const result = await getFunctionModelsByCategory('business-process')

      expect(mockRepository.getByCategory).toHaveBeenCalledWith('business-process')
      expect(result).toEqual(models)
    })
  })

  describe('getFunctionModelsByProcessType', () => {
    it('should return function models by process type', async () => {
      const models = [
        createFunctionModel('Test Model', 'Test Description')
      ]

      mockRepository.getByProcessType.mockResolvedValue(models)

      const result = await getFunctionModelsByProcessType('business-process')

      expect(mockRepository.getByProcessType).toHaveBeenCalledWith('business-process')
      expect(result).toEqual(models)
    })
  })

  describe('updateFunctionModelMetadata', () => {
    it('should update function model metadata successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      const updatedModel = { ...model, metadata: { category: 'updated' } }

      mockRepository.getById.mockResolvedValue(model)
      mockRepository.update.mockResolvedValue(updatedModel)

      const result = await updateFunctionModelMetadata('test-id', { category: 'updated' })

      expect(mockRepository.getById).toHaveBeenCalledWith('test-id')
      expect(mockRepository.update).toHaveBeenCalledWith('test-id', expect.objectContaining({
        metadata: expect.objectContaining({
          category: 'updated'
        })
      }))
      expect(result).toEqual(updatedModel)
    })

    it('should throw error when model not found', async () => {
      mockRepository.getById.mockResolvedValue(null)

      await expect(updateFunctionModelMetadata('non-existent-id', {})).rejects.toThrow('Function Model not found: non-existent-id')
    })
  })

  describe('updateFunctionModelPermissions', () => {
    it('should update function model permissions successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      const updatedModel = { ...model, permissions: { canEdit: false } }

      mockRepository.getById.mockResolvedValue(model)
      mockRepository.update.mockResolvedValue(updatedModel)

      const result = await updateFunctionModelPermissions('test-id', { canEdit: false })

      expect(mockRepository.getById).toHaveBeenCalledWith('test-id')
      expect(mockRepository.update).toHaveBeenCalledWith('test-id', expect.objectContaining({
        permissions: expect.objectContaining({
          canEdit: false
        })
      }))
      expect(result).toEqual(updatedModel)
    })
  })

  describe('exportFunctionModel', () => {
    it('should export function model as JSON', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      mockRepository.getById.mockResolvedValue(model)

      const result = await exportFunctionModel('test-id', 'json')

      expect(result).toBe(JSON.stringify(model, null, 2))
    })

    it('should throw error for unsupported format', async () => {
      await expect(exportFunctionModel('test-id', 'unsupported' as any)).rejects.toThrow('Unsupported export format: unsupported')
    })
  })

  describe('importFunctionModel', () => {
    it('should import function model from JSON', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      const modelJson = JSON.stringify(model)

      const importedModel = { ...model, modelId: 'new-id' }
      mockRepository.create.mockResolvedValue(importedModel)

      const result = await importFunctionModel(modelJson, 'json')

      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Model',
        description: 'Test Description'
      }))
      expect(result).toEqual(importedModel)
    })

    it('should throw error for invalid model data', async () => {
      const invalidJson = JSON.stringify({ name: 'Test' }) // Missing required fields

      await expect(importFunctionModel(invalidJson, 'json')).rejects.toThrow('Invalid Function Model data in import')
    })

    it('should throw error for unsupported format', async () => {
      await expect(importFunctionModel('data', 'unsupported' as any)).rejects.toThrow('Unsupported import format: unsupported')
    })
  })

  describe('validateFunctionModel', () => {
    it('should return true for valid function model', () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      expect(validateFunctionModel(model)).toBe(true)
    })

    it('should return false for invalid function model', () => {
      const invalidModel = { name: 'Test' } // Missing required fields

      expect(validateFunctionModel(invalidModel)).toBe(false)
    })
  })

  describe('validateCrossFeatureLink', () => {
    it('should return true for valid cross-feature link', () => {
      const link = createCrossFeatureLink(
        'function-model',
        'model-1',
        'knowledge-base',
        'doc-1',
        'documents'
      )

      expect(validateCrossFeatureLink(link)).toBe(true)
    })

    it('should return false for invalid cross-feature link', () => {
      const invalidLink = { linkId: 'test' } // Missing required fields

      expect(validateCrossFeatureLink(invalidLink)).toBe(false)
    })
  })
}) 