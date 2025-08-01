// Function Model Persistence Hooks
// This file provides custom React hooks for Function Model persistence operations

import { useState, useCallback, useEffect } from 'react'
import type { 
  FunctionModel, 
  SaveOptions, 
  LoadOptions, 
  FunctionModelFilters 
} from '../../domain/entities/function-model-types'
import type { 
  CrossFeatureLink 
} from '../../domain/entities/cross-feature-link-types'
import type { 
  VersionEntry 
} from '../../domain/entities/version-control-types'
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
} from '../use-cases/function-model-persistence-use-cases'

// Function Model persistence hook
export function useFunctionModelPersistence(modelId: string) {
  const [model, setModel] = useState<FunctionModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoSave, setAutoSave] = useState(true)
  const [saveInterval, setSaveInterval] = useState(30) // seconds

  // Load function model
  const loadModel = useCallback(async (options: LoadOptions = {}) => {
    setLoading(true)
    setError(null)

    try {
      const loadedModel = await loadFunctionModel(modelId, options)
      setModel(loadedModel)
      return loadedModel
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load model'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [modelId])

  // Save function model
  const saveModel = useCallback(async (options: SaveOptions = {}) => {
    if (!model) {
      throw new Error('No model to save')
    }

    setLoading(true)
    setError(null)

    try {
      const savedModel = await saveFunctionModel(model, options)
      setModel(savedModel)
      return savedModel
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save model'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [model])

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !model) return

    const interval = setInterval(() => {
      saveModel({ autoVersion: false }).catch(console.error)
    }, saveInterval * 1000)

    return () => clearInterval(interval)
  }, [autoSave, model, saveInterval, saveModel])

  // Update model data
  const updateModel = useCallback((updates: Partial<FunctionModel>) => {
    if (!model) return

    setModel(prevModel => prevModel ? { ...prevModel, ...updates } : null)
  }, [model])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    model,
    loading,
    error,
    loadModel,
    saveModel,
    updateModel,
    clearError,
    autoSave,
    setAutoSave,
    saveInterval,
    setSaveInterval
  }
}

// Cross-feature linking hook
export function useCrossFeatureLinking(sourceId: string, sourceFeature: string) {
  const [links, setLinks] = useState<CrossFeatureLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load cross-feature links
  const loadLinks = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const loadedLinks = await getCrossFeatureLinks(sourceId, sourceFeature)
      setLinks(loadedLinks)
      return loadedLinks
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load links'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [sourceId, sourceFeature])

  // Create new link
  const createLink = useCallback(async (
    targetFeature: string,
    targetId: string,
    linkType: string,
    context?: Record<string, any>
  ) => {
    setLoading(true)
    setError(null)

    try {
      const newLink = await createNewCrossFeatureLink(sourceFeature, sourceId, targetFeature, targetId, linkType, context)
      await loadLinks() // Refresh links
      return newLink
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create link'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [sourceFeature, sourceId, loadLinks])

  // Update link context
  const updateLinkContext = useCallback(async (linkId: string, context: Record<string, any>) => {
    setLoading(true)
    setError(null)

    try {
      await updateCrossFeatureLinkContext(linkId, context)
      await loadLinks() // Refresh links
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update link context'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [loadLinks])

  // Delete link
  const deleteLink = useCallback(async (linkId: string) => {
    setLoading(true)
    setError(null)

    try {
      await deleteCrossFeatureLink(linkId)
      await loadLinks() // Refresh links
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete link'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [loadLinks])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    links,
    loading,
    error,
    loadLinks,
    createLink,
    updateLinkContext,
    deleteLink,
    clearError
  }
}

// Version control hook
export function useFunctionModelVersionControl(modelId: string) {
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [currentVersion, setCurrentVersion] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load version history
  const loadVersions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('Loading version history for modelId:', modelId)
      const versionHistory = await getVersionHistory(modelId)
      console.log('Version history loaded:', versionHistory)
      setVersions(versionHistory)
      setCurrentVersion(versionHistory[0]?.version || '')
      return versionHistory
    } catch (err) {
      console.error('Failed to load version history:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load versions'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [modelId])

  // Create new version
  const createVersion = useCallback(async (changeSummary: string) => {
    setLoading(true)
    setError(null)

    try {
      // This would need the current model data
      // For now, we'll just reload versions
      await loadVersions()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create version'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [loadVersions])

  // Get specific version
  const getVersion = useCallback(async (version: string) => {
    setLoading(true)
    setError(null)

    try {
      console.log('Loading version:', version, 'for model:', modelId)
      // Load the specific version of the model
      const model = await loadFunctionModel(modelId, { version })
      console.log('Version loaded successfully:', model)
      return model
    } catch (err) {
      console.error('Failed to load version:', version, err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load version'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [modelId])

  // Publish version
  const publishVersion = useCallback(async (version: string) => {
    setLoading(true)
    setError(null)

    try {
      await publishVersion(modelId, version)
      await loadVersions() // Refresh version list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish version'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [modelId, loadVersions])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    versions,
    currentVersion,
    loading,
    error,
    loadVersions,
    getVersion,
    createVersion,
    publishVersion,
    clearError
  }
}

// Function Model management hook
export function useFunctionModelManagement() {
  const [models, setModels] = useState<FunctionModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create new model
  const createModel = useCallback(async (name: string, description: string, options: Partial<FunctionModel> = {}) => {
    setLoading(true)
    setError(null)

    try {
      const newModel = await createNewFunctionModel(name, description, options)
      setModels(prev => [newModel, ...prev])
      return newModel
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create model'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Delete model
  const deleteModel = useCallback(async (modelId: string) => {
    setLoading(true)
    setError(null)

    try {
      await deleteFunctionModel(modelId)
      setModels(prev => prev.filter(model => model.modelId !== modelId))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete model'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Search models
  const searchModels = useCallback(async (query: string, filters: FunctionModelFilters = {}) => {
    setLoading(true)
    setError(null)

    try {
      const searchResults = await searchFunctionModels(query, filters)
      setModels(searchResults)
      return searchResults
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search models'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Get models by user
  const getModelsByUser = useCallback(async (userId: string) => {
    setLoading(true)
    setError(null)

    try {
      const userModels = await getFunctionModelsByUser(userId)
      setModels(userModels)
      return userModels
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get user models'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Get models by category
  const getModelsByCategory = useCallback(async (category: string) => {
    setLoading(true)
    setError(null)

    try {
      const categoryModels = await getFunctionModelsByCategory(category)
      setModels(categoryModels)
      return categoryModels
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get category models'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Get models by process type
  const getModelsByProcessType = useCallback(async (processType: string) => {
    setLoading(true)
    setError(null)

    try {
      const processTypeModels = await getFunctionModelsByProcessType(processType)
      setModels(processTypeModels)
      return processTypeModels
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get process type models'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Update model metadata
  const updateModelMetadata = useCallback(async (modelId: string, metadata: Partial<FunctionModel['metadata']>) => {
    setLoading(true)
    setError(null)

    try {
      const updatedModel = await updateFunctionModelMetadata(modelId, metadata)
      setModels(prev => prev.map(model => 
        model.modelId === modelId ? updatedModel : model
      ))
      return updatedModel
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update model metadata'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Update model permissions
  const updateModelPermissions = useCallback(async (modelId: string, permissions: Partial<FunctionModel['permissions']>) => {
    setLoading(true)
    setError(null)

    try {
      const updatedModel = await updateFunctionModelPermissions(modelId, permissions)
      setModels(prev => prev.map(model => 
        model.modelId === modelId ? updatedModel : model
      ))
      return updatedModel
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update model permissions'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Export model
  const exportModel = useCallback(async (modelId: string, format: 'json' | 'xml' | 'yaml' = 'json') => {
    setLoading(true)
    setError(null)

    try {
      const exportData = await exportFunctionModel(modelId, format)
      return exportData
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export model'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Import model
  const importModel = useCallback(async (data: string, format: 'json' | 'xml' | 'yaml' = 'json') => {
    setLoading(true)
    setError(null)

    try {
      const importedModel = await importFunctionModel(data, format)
      setModels(prev => [importedModel, ...prev])
      return importedModel
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import model'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    models,
    loading,
    error,
    createModel,
    deleteModel,
    searchModels,
    getModelsByUser,
    getModelsByCategory,
    getModelsByProcessType,
    updateModelMetadata,
    updateModelPermissions,
    exportModel,
    importModel,
    clearError
  }
} 