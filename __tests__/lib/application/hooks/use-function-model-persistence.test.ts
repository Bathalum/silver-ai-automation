import { renderHook, act } from '@testing-library/react'
import { useFunctionModelPersistence, useCrossFeatureLinking, useFunctionModelVersionControl, useFunctionModelManagement } from '@/lib/application/hooks/use-function-model-persistence'
import { createFunctionModel } from '@/lib/domain/entities/function-model-types'
import { createCrossFeatureLink } from '@/lib/domain/entities/cross-feature-link-types'
import { createVersionEntry } from '@/lib/domain/entities/version-control-types'

// Mock the use cases
jest.mock('@/lib/application/use-cases/function-model-persistence-use-cases', () => ({
  saveFunctionModel: jest.fn(),
  loadFunctionModel: jest.fn(),
  createNewFunctionModel: jest.fn(),
  deleteFunctionModel: jest.fn(),
  createNewCrossFeatureLink: jest.fn(),
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

describe('Function Model Persistence Hooks', () => {
  let mockUseCases: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Get the mocked use cases
    mockUseCases = require('@/lib/application/use-cases/function-model-persistence-use-cases')
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
      const model = createTestModel('Test Model', 'Test Description')

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
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Failed to load model')
      expect(result.current.loading).toBe(false)
    })

    it('should save model successfully', async () => {
      const model = createTestModel('Test Model', 'Test Description')
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
      const model = createTestModel('Test Model', 'Test Description')
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
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Failed to save model')
      expect(result.current.loading).toBe(false)
    })

    it('should update model data', () => {
      const model = createTestModel('Test Model', 'Test Description')

      const { result } = renderHook(() => useFunctionModelPersistence('test-id'))

      act(() => {
        result.current.updateModel(model)
      })

      expect(result.current.model).toEqual(model)
    })

    it('should clear error', () => {
      const { result } = renderHook(() => useFunctionModelPersistence('test-id'))

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('should toggle auto-save', () => {
      const { result } = renderHook(() => useFunctionModelPersistence('test-id'))

      act(() => {
        result.current.setAutoSave(false)
      })

      expect(result.current.autoSave).toBe(false)
    })

    it('should update save interval', () => {
      const { result } = renderHook(() => useFunctionModelPersistence('test-id'))

      act(() => {
        result.current.setSaveInterval(60)
      })

      expect(result.current.saveInterval).toBe(60)
    })
  })

  describe('useCrossFeatureLinking', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCrossFeatureLinking('source-id', 'function-model'))

      expect(result.current.links).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should load links successfully', async () => {
      const links = [
        createCrossFeatureLink('function-model', 'source-id', 'knowledge-base', 'target-1', 'documents'),
        createCrossFeatureLink('function-model', 'source-id', 'spindle', 'target-2', 'implements')
      ]

      mockUseCases.getCrossFeatureLinks.mockResolvedValue(links)

      const { result } = renderHook(() => useCrossFeatureLinking('source-id', 'function-model'))

      await act(async () => {
        await result.current.loadLinks()
      })

      expect(mockUseCases.getCrossFeatureLinks).toHaveBeenCalledWith('source-id', 'function-model')
      expect(result.current.links).toEqual(links)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should create link successfully', async () => {
      const link = createCrossFeatureLink(
        'function-model',
        'source-id',
        'knowledge-base',
        'target-id',
        'documents'
      )

      mockUseCases.createNewCrossFeatureLink.mockResolvedValue(link)
      mockUseCases.getCrossFeatureLinks.mockResolvedValue([link])

      const { result } = renderHook(() => useCrossFeatureLinking('source-id', 'function-model'))

      await act(async () => {
        await result.current.createLink('knowledge-base', 'target-id', 'documents')
      })

      expect(mockUseCases.createNewCrossFeatureLink).toHaveBeenCalledWith(
        'function-model',
        'source-id',
        'knowledge-base',
        'target-id',
        'documents',
        undefined
      )
      expect(result.current.links).toEqual([link])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle create link error', async () => {
      const error = new Error('Failed to create link')
      mockUseCases.createNewCrossFeatureLink.mockRejectedValue(error)

      const { result } = renderHook(() => useCrossFeatureLinking('source-id', 'function-model'))

      await act(async () => {
        try {
          await result.current.createLink('knowledge-base', 'target-id', 'documents')
        } catch (err) {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Failed to create link')
      expect(result.current.loading).toBe(false)
    })

    it('should update link context', async () => {
      const context = { note: 'Updated context' }
      mockUseCases.updateCrossFeatureLinkContext.mockResolvedValue(undefined)
      mockUseCases.getCrossFeatureLinks.mockResolvedValue([])

      const { result } = renderHook(() => useCrossFeatureLinking('source-id', 'function-model'))

      await act(async () => {
        await result.current.updateLinkContext('link-id', context)
      })

      expect(mockUseCases.updateCrossFeatureLinkContext).toHaveBeenCalledWith('link-id', context)
    })

    it('should delete link', async () => {
      mockUseCases.deleteCrossFeatureLink.mockResolvedValue(undefined)
      mockUseCases.getCrossFeatureLinks.mockResolvedValue([])

      const { result } = renderHook(() => useCrossFeatureLinking('source-id', 'function-model'))

      await act(async () => {
        await result.current.deleteLink('link-id')
      })

      expect(mockUseCases.deleteCrossFeatureLink).toHaveBeenCalledWith('link-id')
    })

    it('should clear error', () => {
      const { result } = renderHook(() => useCrossFeatureLinking('source-id', 'function-model'))

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
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

      mockUseCases.getVersionHistory.mockResolvedValue(versions)

      const { result } = renderHook(() => useFunctionModelVersionControl('test-id'))

      await act(async () => {
        await result.current.loadVersions()
      })

      expect(mockUseCases.getVersionHistory).toHaveBeenCalledWith('test-id')
      expect(result.current.versions).toEqual(versions)
      expect(result.current.currentVersion).toBe('1.0.0')
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should get specific version', async () => {
      const model = createTestModel('Test Model', 'Test Description')

      mockUseCases.loadFunctionModel.mockResolvedValue(model)

      const { result } = renderHook(() => useFunctionModelVersionControl('test-id'))

      await act(async () => {
        const versionModel = await result.current.getVersion('1.0.0')
        expect(versionModel).toEqual(model)
      })

      expect(mockUseCases.loadFunctionModel).toHaveBeenCalledWith('test-id', { version: '1.0.0' })
    })

    it('should publish version', async () => {
      mockUseCases.publishVersion.mockResolvedValue(undefined)
      mockUseCases.getVersionHistory.mockResolvedValue([])

      const { result } = renderHook(() => useFunctionModelVersionControl('test-id'))

      await act(async () => {
        await result.current.publishVersion('1.0.0')
      })

      expect(mockUseCases.publishVersion).toHaveBeenCalledWith('test-id', '1.0.0')
    })

    it('should clear error', () => {
      const { result } = renderHook(() => useFunctionModelVersionControl('test-id'))

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
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
      const model = createTestModel('New Model', 'New Description', 'new-id')

      mockUseCases.createNewFunctionModel.mockResolvedValue(model)

      const { result } = renderHook(() => useFunctionModelManagement())

      await act(async () => {
        const newModel = await result.current.createModel('New Model', 'New Description')
        expect(newModel).toEqual(model)
      })

      expect(mockUseCases.createNewFunctionModel).toHaveBeenCalledWith('New Model', 'New Description', {})
      expect(result.current.models).toEqual([model])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should delete model successfully', async () => {
      const model = createTestModel('Test Model', 'Test Description')

      mockUseCases.deleteFunctionModel.mockResolvedValue(undefined)

      const { result } = renderHook(() => useFunctionModelManagement())

      // Set initial models
      act(() => {
        // @ts-ignore - Direct state manipulation for testing
        result.current.models = [model]
      })

      await act(async () => {
        await result.current.deleteModel('test-id')
      })

      expect(mockUseCases.deleteFunctionModel).toHaveBeenCalledWith('test-id')
      expect(result.current.models).toEqual([])
    })

    it('should search models', async () => {
      const models = [
        createTestModel('Model 1', 'Description 1'),
        createTestModel('Model 2', 'Description 2')
      ]

      mockUseCases.searchFunctionModels.mockResolvedValue(models)

      const { result } = renderHook(() => useFunctionModelManagement())

      const filters = { status: 'published' as const }
      await act(async () => {
        const searchResults = await result.current.searchModels('test query', filters)
        expect(searchResults).toEqual(models)
      })

      expect(mockUseCases.searchFunctionModels).toHaveBeenCalledWith('test query', filters)
      expect(result.current.models).toEqual(models)
    })

    it('should get models by user', async () => {
      const models = [
        createTestModel('User Model 1', 'Description 1'),
        createTestModel('User Model 2', 'Description 2')
      ]

      mockUseCases.getFunctionModelsByUser.mockResolvedValue(models)

      const { result } = renderHook(() => useFunctionModelManagement())

      await act(async () => {
        const userModels = await result.current.getModelsByUser('user-id')
        expect(userModels).toEqual(models)
      })

      expect(mockUseCases.getFunctionModelsByUser).toHaveBeenCalledWith('user-id')
      expect(result.current.models).toEqual(models)
    })

    it('should get models by category', async () => {
      const models = [
        createTestModel('Category Model 1', 'Description 1'),
        createTestModel('Category Model 2', 'Description 2')
      ]

      mockUseCases.getFunctionModelsByCategory.mockResolvedValue(models)

      const { result } = renderHook(() => useFunctionModelManagement())

      await act(async () => {
        const categoryModels = await result.current.getModelsByCategory('business')
        expect(categoryModels).toEqual(models)
      })

      expect(mockUseCases.getFunctionModelsByCategory).toHaveBeenCalledWith('business')
      expect(result.current.models).toEqual(models)
    })

    it('should get models by process type', async () => {
      const models = [
        createTestModel('Process Model 1', 'Description 1'),
        createTestModel('Process Model 2', 'Description 2')
      ]

      mockUseCases.getFunctionModelsByProcessType.mockResolvedValue(models)

      const { result } = renderHook(() => useFunctionModelManagement())

      await act(async () => {
        const processTypeModels = await result.current.getModelsByProcessType('automation')
        expect(processTypeModels).toEqual(models)
      })

      expect(mockUseCases.getFunctionModelsByProcessType).toHaveBeenCalledWith('automation')
      expect(result.current.models).toEqual(models)
    })

    it('should update model metadata', async () => {
      const model = createTestModel('Test Model', 'Test Description')
      const updatedModel = { ...model, metadata: { category: 'updated' } }

      mockUseCases.updateFunctionModelMetadata.mockResolvedValue(updatedModel)

      const { result } = renderHook(() => useFunctionModelManagement())

      // Set initial models
      act(() => {
        // @ts-ignore - Direct state manipulation for testing
        result.current.models = [model]
      })

      const metadata = { category: 'updated' }
      await act(async () => {
        const resultModel = await result.current.updateModelMetadata('test-id', metadata)
        expect(resultModel).toEqual(updatedModel)
      })

      expect(mockUseCases.updateFunctionModelMetadata).toHaveBeenCalledWith('test-id', metadata)
      expect(result.current.models).toEqual([updatedModel])
    })

    it('should update model permissions', async () => {
      const model = createTestModel('Test Model', 'Test Description')
      const updatedModel = { ...model, permissions: { canEdit: false } }

      mockUseCases.updateFunctionModelPermissions.mockResolvedValue(updatedModel)

      const { result } = renderHook(() => useFunctionModelManagement())

      // Set initial models
      act(() => {
        // @ts-ignore - Direct state manipulation for testing
        result.current.models = [model]
      })

      const permissions = { canEdit: false }
      await act(async () => {
        const resultModel = await result.current.updateModelPermissions('test-id', permissions)
        expect(resultModel).toEqual(updatedModel)
      })

      expect(mockUseCases.updateFunctionModelPermissions).toHaveBeenCalledWith('test-id', permissions)
      expect(result.current.models).toEqual([updatedModel])
    })

    it('should export model', async () => {
      const exportData = { model: 'exported data', format: 'json' }
      mockUseCases.exportFunctionModel.mockResolvedValue(exportData)

      const { result } = renderHook(() => useFunctionModelManagement())

      await act(async () => {
        const exported = await result.current.exportModel('test-id', 'json')
        expect(exported).toEqual(exportData)
      })

      expect(mockUseCases.exportFunctionModel).toHaveBeenCalledWith('test-id', 'json')
    })

    it('should import model', async () => {
      const model = createTestModel('Imported Model', 'Imported Description', 'new-id')

      mockUseCases.importFunctionModel.mockResolvedValue(model)

      const { result } = renderHook(() => useFunctionModelManagement())

      await act(async () => {
        const imported = await result.current.importModel('import data', 'json')
        expect(imported).toEqual(model)
      })

      expect(mockUseCases.importFunctionModel).toHaveBeenCalledWith('import data', 'json')
      expect(result.current.models).toEqual([model])
    })

    it('should clear error', () => {
      const { result } = renderHook(() => useFunctionModelManagement())

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })
}) 