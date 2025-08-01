import { renderHook, act } from '@testing-library/react'
import {
  useFunctionModelPersistence,
  useCrossFeatureLinking,
  useFunctionModelVersionControl,
  useFunctionModelManagement
} from '../../../lib/application/hooks/use-function-model-persistence'
import { createFunctionModel } from '../../../lib/domain/entities/function-model-types'
import { createCrossFeatureLink } from '../../../lib/domain/entities/cross-feature-link-types'

// Mock the use cases
jest.mock('../../../lib/application/use-cases/function-model-persistence-use-cases', () => ({
  saveFunctionModel: jest.fn(),
  loadFunctionModel: jest.fn(),
  createFunctionModel: jest.fn(),
  deleteFunctionModel: jest.fn(),
  createCrossFeatureLink: jest.fn(),
  getCrossFeatureLinks: jest.fn(),
  updateCrossFeatureLinkContext: jest.fn(),
  deleteCrossFeatureLink: jest.fn(),
  createVersionSnapshot: jest.fn(),
  getVersionHistory: jest.fn(),
  publishVersion: jest.fn(),
  searchFunctionModels: jest.fn(),
  getFunctionModelsByUser: jest.fn(),
  getFunctionModelsByCategory: jest.fn(),
  getFunctionModelsByProcessType: jest.fn(),
  updateFunctionModelMetadata: jest.fn(),
  updateFunctionModelPermissions: jest.fn(),
  exportFunctionModel: jest.fn(),
  importFunctionModel: jest.fn()
}))

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
  importFunctionModel
} from '../../../lib/application/use-cases/function-model-persistence-use-cases'

const mockUseCases = {
  saveFunctionModel: saveFunctionModel as jest.MockedFunction<typeof saveFunctionModel>,
  loadFunctionModel: loadFunctionModel as jest.MockedFunction<typeof loadFunctionModel>,
  createFunctionModel: createFunctionModel as jest.MockedFunction<typeof createFunctionModel>,
  deleteFunctionModel: deleteFunctionModel as jest.MockedFunction<typeof deleteFunctionModel>,
  createCrossFeatureLink: createCrossFeatureLink as jest.MockedFunction<typeof createCrossFeatureLink>,
  getCrossFeatureLinks: getCrossFeatureLinks as jest.MockedFunction<typeof getCrossFeatureLinks>,
  updateCrossFeatureLinkContext: updateCrossFeatureLinkContext as jest.MockedFunction<typeof updateCrossFeatureLinkContext>,
  deleteCrossFeatureLink: deleteCrossFeatureLink as jest.MockedFunction<typeof deleteCrossFeatureLink>,
  createVersionSnapshot: createVersionSnapshot as jest.MockedFunction<typeof createVersionSnapshot>,
  getVersionHistory: getVersionHistory as jest.MockedFunction<typeof getVersionHistory>,
  publishVersion: publishVersion as jest.MockedFunction<typeof publishVersion>,
  searchFunctionModels: searchFunctionModels as jest.MockedFunction<typeof searchFunctionModels>,
  getFunctionModelsByUser: getFunctionModelsByUser as jest.MockedFunction<typeof getFunctionModelsByUser>,
  getFunctionModelsByCategory: getFunctionModelsByCategory as jest.MockedFunction<typeof getFunctionModelsByCategory>,
  getFunctionModelsByProcessType: getFunctionModelsByProcessType as jest.MockedFunction<typeof getFunctionModelsByProcessType>,
  updateFunctionModelMetadata: updateFunctionModelMetadata as jest.MockedFunction<typeof updateFunctionModelMetadata>,
  updateFunctionModelPermissions: updateFunctionModelPermissions as jest.MockedFunction<typeof updateFunctionModelPermissions>,
  exportFunctionModel: exportFunctionModel as jest.MockedFunction<typeof exportFunctionModel>,
  importFunctionModel: importFunctionModel as jest.MockedFunction<typeof importFunctionModel>
}

describe('Function Model Persistence Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useFunctionModelPersistence', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useFunctionModelPersistence('test-id'))

      expect(result.current.model).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.autoSave).toBe(true)
      expect(result.current.saveInterval).toBe(30)
    })

    it('should load model successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      mockUseCases.loadFunctionModel.mockResolvedValue(model)

      const { result } = renderHook(() => useFunctionModelPersistence('test-id'))

      await act(async () => {
        await result.current.loadModel()
      })

      expect(mockUseCases.loadFunctionModel).toHaveBeenCalledWith('test-id', {})
      expect(result.current.model).toEqual(model)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle load error', async () => {
      const error = new Error('Failed to load model')
      mockUseCases.loadFunctionModel.mockRejectedValue(error)

      const { result } = renderHook(() => useFunctionModelPersistence('test-id'))

      await act(async () => {
        try {
          await result.current.loadModel()
        } catch (err) {
          // Expected error
        }
      })

      expect(result.current.error).toBe('Failed to load model')
      expect(result.current.loading).toBe(false)
    })

    it('should save model successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      const savedModel = { ...model, lastSavedAt: new Date() }
      mockUseCases.saveFunctionModel.mockResolvedValue(savedModel)

      const { result } = renderHook(() => useFunctionModelPersistence('test-id'))

      // Set model first
      act(() => {
        result.current.updateModel(model)
      })

      await act(async () => {
        await result.current.saveModel()
      })

      expect(mockUseCases.saveFunctionModel).toHaveBeenCalledWith(model, {})
      expect(result.current.model).toEqual(savedModel)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle save error', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      const error = new Error('Failed to save model')
      mockUseCases.saveFunctionModel.mockRejectedValue(error)

      const { result } = renderHook(() => useFunctionModelPersistence('test-id'))

      // Set model first
      act(() => {
        result.current.updateModel(model)
      })

      await act(async () => {
        try {
          await result.current.saveModel()
        } catch (err) {
          // Expected error
        }
      })

      expect(result.current.error).toBe('Failed to save model')
      expect(result.current.loading).toBe(false)
    })

    it('should update model data', () => {
      const { result } = renderHook(() => useFunctionModelPersistence('test-id'))

      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      act(() => {
        result.current.updateModel(model)
      })

      expect(result.current.model).toEqual(model)
    })

    it('should clear error', () => {
      const { result } = renderHook(() => useFunctionModelPersistence('test-id'))

      act(() => {
        result.current.updateModel({} as any)
      })

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('should handle auto-save settings', () => {
      const { result } = renderHook(() => useFunctionModelPersistence('test-id'))

      act(() => {
        result.current.setAutoSave(false)
      })

      expect(result.current.autoSave).toBe(false)

      act(() => {
        result.current.setSaveInterval(60)
      })

      expect(result.current.saveInterval).toBe(60)
    })
  })

  describe('useCrossFeatureLinking', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCrossFeatureLinking('model-1', 'function-model'))

      expect(result.current.links).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should load links successfully', async () => {
      const links = [
        createCrossFeatureLink('function-model', 'model-1', 'knowledge-base', 'doc-1', 'documents')
      ]

      mockUseCases.getCrossFeatureLinks.mockResolvedValue(links)

      const { result } = renderHook(() => useCrossFeatureLinking('model-1', 'function-model'))

      await act(async () => {
        await result.current.loadLinks()
      })

      expect(mockUseCases.getCrossFeatureLinks).toHaveBeenCalledWith('model-1', 'function-model')
      expect(result.current.links).toEqual(links)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should create link successfully', async () => {
      const link = createCrossFeatureLink('function-model', 'model-1', 'knowledge-base', 'doc-1', 'documents')

      mockUseCases.createCrossFeatureLink.mockResolvedValue(link)
      mockUseCases.getCrossFeatureLinks.mockResolvedValue([link])

      const { result } = renderHook(() => useCrossFeatureLinking('model-1', 'function-model'))

      await act(async () => {
        await result.current.createLink('knowledge-base', 'doc-1', 'documents', { section: 'process' })
      })

      expect(mockUseCases.createCrossFeatureLink).toHaveBeenCalledWith(
        'function-model',
        'model-1',
        'knowledge-base',
        'doc-1',
        'documents',
        { section: 'process' }
      )
      expect(result.current.links).toEqual([link])
    })

    it('should update link context successfully', async () => {
      mockUseCases.updateCrossFeatureLinkContext.mockResolvedValue()
      mockUseCases.getCrossFeatureLinks.mockResolvedValue([])

      const { result } = renderHook(() => useCrossFeatureLinking('model-1', 'function-model'))

      await act(async () => {
        await result.current.updateLinkContext('link-1', { section: 'updated' })
      })

      expect(mockUseCases.updateCrossFeatureLinkContext).toHaveBeenCalledWith('link-1', { section: 'updated' })
    })

    it('should delete link successfully', async () => {
      mockUseCases.deleteCrossFeatureLink.mockResolvedValue()
      mockUseCases.getCrossFeatureLinks.mockResolvedValue([])

      const { result } = renderHook(() => useCrossFeatureLinking('model-1', 'function-model'))

      await act(async () => {
        await result.current.deleteLink('link-1')
      })

      expect(mockUseCases.deleteCrossFeatureLink).toHaveBeenCalledWith('link-1')
    })
  })

  describe('useFunctionModelVersionControl', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useFunctionModelVersionControl('test-id'))

      expect(result.current.versions).toEqual([])
      expect(result.current.currentVersion).toBe('')
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should load versions successfully', async () => {
      const versions = [
        {
          version: '1.1.0',
          timestamp: new Date(),
          author: 'user-1',
          changes: [],
          snapshot: {} as any,
          isPublished: false
        }
      ]

      mockUseCases.getVersionHistory.mockResolvedValue(versions)

      const { result } = renderHook(() => useFunctionModelVersionControl('test-id'))

      await act(async () => {
        await result.current.loadVersions()
      })

      expect(mockUseCases.getVersionHistory).toHaveBeenCalledWith('test-id')
      expect(result.current.versions).toEqual(versions)
      expect(result.current.currentVersion).toBe('1.1.0')
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should publish version successfully', async () => {
      const versions = [
        {
          version: '1.1.0',
          timestamp: new Date(),
          author: 'user-1',
          changes: [],
          snapshot: {} as any,
          isPublished: false
        }
      ]

      mockUseCases.getVersionHistory.mockResolvedValue(versions)
      mockUseCases.publishVersion.mockResolvedValue()

      const { result } = renderHook(() => useFunctionModelVersionControl('test-id'))

      await act(async () => {
        await result.current.publishVersion('1.1.0')
      })

      expect(mockUseCases.publishVersion).toHaveBeenCalledWith('test-id', '1.1.0')
    })
  })

  describe('useFunctionModelManagement', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useFunctionModelManagement())

      expect(result.current.models).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should create model successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      mockUseCases.createFunctionModel.mockResolvedValue(model)

      const { result } = renderHook(() => useFunctionModelManagement())

      await act(async () => {
        await result.current.createModel('Test Model', 'Test Description')
      })

      expect(mockUseCases.createFunctionModel).toHaveBeenCalledWith('Test Model', 'Test Description', {})
      expect(result.current.models).toEqual([model])
    })

    it('should delete model successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      mockUseCases.deleteFunctionModel.mockResolvedValue()

      const { result } = renderHook(() => useFunctionModelManagement())

      // Set models first
      act(() => {
        result.current.models = [model]
      })

      await act(async () => {
        await result.current.deleteModel('test-id')
      })

      expect(mockUseCases.deleteFunctionModel).toHaveBeenCalledWith('test-id')
      expect(result.current.models).toEqual([])
    })

    it('should search models successfully', async () => {
      const models = [
        createFunctionModel('Test Model', 'Test Description')
      ]

      mockUseCases.searchFunctionModels.mockResolvedValue(models)

      const { result } = renderHook(() => useFunctionModelManagement())

      await act(async () => {
        await result.current.searchModels('test', { status: 'draft' })
      })

      expect(mockUseCases.searchFunctionModels).toHaveBeenCalledWith('test', { status: 'draft' })
      expect(result.current.models).toEqual(models)
    })

    it('should get models by user successfully', async () => {
      const models = [
        createFunctionModel('Test Model', 'Test Description')
      ]

      mockUseCases.getFunctionModelsByUser.mockResolvedValue(models)

      const { result } = renderHook(() => useFunctionModelManagement())

      await act(async () => {
        await result.current.getModelsByUser('user-1')
      })

      expect(mockUseCases.getFunctionModelsByUser).toHaveBeenCalledWith('user-1')
      expect(result.current.models).toEqual(models)
    })

    it('should get models by category successfully', async () => {
      const models = [
        createFunctionModel('Test Model', 'Test Description')
      ]

      mockUseCases.getFunctionModelsByCategory.mockResolvedValue(models)

      const { result } = renderHook(() => useFunctionModelManagement())

      await act(async () => {
        await result.current.getModelsByCategory('business-process')
      })

      expect(mockUseCases.getFunctionModelsByCategory).toHaveBeenCalledWith('business-process')
      expect(result.current.models).toEqual(models)
    })

    it('should get models by process type successfully', async () => {
      const models = [
        createFunctionModel('Test Model', 'Test Description')
      ]

      mockUseCases.getFunctionModelsByProcessType.mockResolvedValue(models)

      const { result } = renderHook(() => useFunctionModelManagement())

      await act(async () => {
        await result.current.getModelsByProcessType('business-process')
      })

      expect(mockUseCases.getFunctionModelsByProcessType).toHaveBeenCalledWith('business-process')
      expect(result.current.models).toEqual(models)
    })

    it('should update model metadata successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      const updatedModel = { ...model, metadata: { category: 'updated' } }

      mockUseCases.updateFunctionModelMetadata.mockResolvedValue(updatedModel)

      const { result } = renderHook(() => useFunctionModelManagement())

      // Set models first
      act(() => {
        result.current.models = [model]
      })

      await act(async () => {
        await result.current.updateModelMetadata('test-id', { category: 'updated' })
      })

      expect(mockUseCases.updateFunctionModelMetadata).toHaveBeenCalledWith('test-id', { category: 'updated' })
      expect(result.current.models).toEqual([updatedModel])
    })

    it('should update model permissions successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'test-id'

      const updatedModel = { ...model, permissions: { canEdit: false } }

      mockUseCases.updateFunctionModelPermissions.mockResolvedValue(updatedModel)

      const { result } = renderHook(() => useFunctionModelManagement())

      // Set models first
      act(() => {
        result.current.models = [model]
      })

      await act(async () => {
        await result.current.updateModelPermissions('test-id', { canEdit: false })
      })

      expect(mockUseCases.updateFunctionModelPermissions).toHaveBeenCalledWith('test-id', { canEdit: false })
      expect(result.current.models).toEqual([updatedModel])
    })

    it('should export model successfully', async () => {
      const exportData = '{"name":"Test Model"}'
      mockUseCases.exportFunctionModel.mockResolvedValue(exportData)

      const { result } = renderHook(() => useFunctionModelManagement())

      await act(async () => {
        const data = await result.current.exportModel('test-id', 'json')
        expect(data).toBe(exportData)
      })

      expect(mockUseCases.exportFunctionModel).toHaveBeenCalledWith('test-id', 'json')
    })

    it('should import model successfully', async () => {
      const model = createFunctionModel('Test Model', 'Test Description')
      model.modelId = 'new-id'

      mockUseCases.importFunctionModel.mockResolvedValue(model)

      const { result } = renderHook(() => useFunctionModelManagement())

      await act(async () => {
        await result.current.importModel('{"name":"Test Model"}', 'json')
      })

      expect(mockUseCases.importFunctionModel).toHaveBeenCalledWith('{"name":"Test Model"}', 'json')
      expect(result.current.models).toEqual([model])
    })
  })
}) 