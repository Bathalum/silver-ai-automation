// Function Model Save Use Cases Hook - Application Layer
// This hook provides a unified interface for function model save operations
// Following Clean Architecture principles: Presentation → Application → Domain ← Infrastructure

import { useState, useCallback } from 'react'
import { FunctionModelNode } from '../../domain/entities/function-model-node-types'
import { FunctionModel } from '../../domain/entities/function-model-types'
import { FunctionModelSaveUseCases } from '../use-cases/function-model-save-use-cases'
import { getGlobalServiceLocator } from '../di/function-model-dependency-container'

export interface SaveOptions {
  validateBeforeSave?: boolean
  createBackup?: boolean
  updateVersion?: boolean
  createNewVersion?: boolean
}

export interface LoadOptions {
  validateData?: boolean
  restoreFromVersion?: boolean
}

export interface SaveResult {
  success: boolean
  version?: string
  savedNodes: number
  savedEdges: number
  warnings: string[]
  errors: string[]
  auditId?: string
  transactionId?: string
  duration: number
}

export interface LoadResult {
  success: boolean
  model: FunctionModel | null
  nodes: FunctionModelNode[]
  edges: any[]
  version?: string
  warnings: string[]
  errors: string[]
  auditId?: string
  duration: number
}

export interface UseFunctionModelSaveUseCasesReturn {
  // Repository access for cross-feature linking
  functionModelRepository: any
  
  // Save operations
  saveFunctionModel: (
    modelId: string,
    nodes: FunctionModelNode[],
    edges: any[],
    metadata: {
      changeSummary: string
      author: string
      isPublished: boolean
    },
    options?: SaveOptions
  ) => Promise<SaveResult>
  
  // Load operations
  loadFunctionModel: (
    modelId: string,
    version?: string,
    options?: LoadOptions
  ) => Promise<LoadResult>
  
  // Version operations
  createVersion: (
    modelId: string,
    nodes: FunctionModelNode[],
    edges: any[],
    changeSummary: string,
    author: string
  ) => Promise<{ success: boolean; version: string; error?: string }>
  
  restoreFromVersion: (
    modelId: string,
    version: string,
    author: string
  ) => Promise<{ success: boolean; restoredNodes: number; restoredEdges: number; error?: string }>
  
  // Version history
  getFunctionModelVersions: (
    modelId: string
  ) => Promise<{
    success: boolean
    versions: Array<{
      version: string
      createdAt: Date
      createdBy: string
      changeSummary: string
      modelId: string
    }>
    error?: string
  }>
  
  // Model metadata updates
  updateFunctionModelMetadata: (
    modelId: string,
    updates: { name?: string; description?: string },
    author: string
  ) => Promise<{ success: boolean; model?: any; error?: string }>
  
  // State
  isSaving: boolean
  isLoading: boolean
  isCreatingVersion: boolean
  isRestoring: boolean
  isGettingVersions: boolean
  isUpdatingMetadata: boolean
  lastSaveResult?: SaveResult
  lastLoadResult?: LoadResult
  error?: string
}

export function useFunctionModelSaveUseCases(): UseFunctionModelSaveUseCasesReturn {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingVersion, setIsCreatingVersion] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isGettingVersions, setIsGettingVersions] = useState(false)
  const [isUpdatingMetadata, setIsUpdatingMetadata] = useState(false)
  const [lastSaveResult, setLastSaveResult] = useState<SaveResult | undefined>()
  const [lastLoadResult, setLastLoadResult] = useState<LoadResult | undefined>()
  const [error, setError] = useState<string | undefined>()

  // Get use cases from dependency injection container
  const serviceLocator = getGlobalServiceLocator()
  const useCases = serviceLocator.getFunctionModelSaveUseCases()

  /**
   * Saves a function model
   */
  const saveFunctionModel = useCallback(async (
    modelId: string,
    nodes: FunctionModelNode[],
    edges: any[],
    metadata: {
      changeSummary: string
      author: string
      isPublished: boolean
    },
    options: SaveOptions = {}
  ): Promise<SaveResult> => {
    setIsSaving(true)
    setError(undefined)

    try {
      const result = await useCases.saveFunctionModel({
        modelId,
        nodes,
        edges,
        metadata,
        options: {
          validateBeforeSave: options.validateBeforeSave ?? true,
          createBackup: options.createBackup ?? false,
          updateVersion: options.updateVersion ?? true,
          createNewVersion: options.createNewVersion ?? false
        }
      })

      setLastSaveResult(result)
      
      if (!result.success) {
        setError(result.errors.join(', '))
      }

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      
      const failedResult: SaveResult = {
        success: false,
        savedNodes: 0,
        savedEdges: 0,
        warnings: [],
        errors: [errorMessage],
        duration: 0
      }

      setLastSaveResult(failedResult)
      return failedResult

    } finally {
      setIsSaving(false)
    }
  }, [useCases])

  /**
   * Loads a function model
   */
  const loadFunctionModel = useCallback(async (
    modelId: string,
    version?: string,
    options: LoadOptions = {}
  ): Promise<LoadResult> => {
    setIsLoading(true)
    setError(undefined)

    try {
      const result = await useCases.loadFunctionModel({
        modelId,
        version,
        options: {
          validateData: options.validateData ?? false,
          restoreFromVersion: options.restoreFromVersion ?? false
        }
      })

      setLastLoadResult(result)
      
      if (!result.success) {
        setError(result.errors.join(', '))
      }

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      
      const failedResult: LoadResult = {
        success: false,
        model: null,
        nodes: [],
        edges: [],
        warnings: [],
        errors: [errorMessage],
        duration: 0
      }

      setLastLoadResult(failedResult)
      return failedResult

    } finally {
      setIsLoading(false)
    }
  }, [useCases])

  /**
   * Creates a new version
   */
  const createVersion = useCallback(async (
    modelId: string,
    nodes: FunctionModelNode[],
    edges: any[],
    changeSummary: string,
    author: string
  ): Promise<{ success: boolean; version: string; error?: string }> => {
    setIsCreatingVersion(true)
    setError(undefined)

    try {
      const result = await useCases.createFunctionModelVersion(
        modelId,
        nodes,
        edges,
        changeSummary,
        author
      )

      if (!result.success) {
        setError(result.error)
      }

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      
      return {
        success: false,
        version: '',
        error: errorMessage
      }

    } finally {
      setIsCreatingVersion(false)
    }
  }, [useCases])

  /**
   * Restores from a specific version
   */
  const restoreFromVersion = useCallback(async (
    modelId: string,
    version: string,
    author: string
  ): Promise<{ success: boolean; restoredNodes: number; restoredEdges: number; error?: string }> => {
    setIsRestoring(true)
    setError(undefined)

    try {
      const result = await useCases.restoreFunctionModelFromVersion(
        modelId,
        version,
        author
      )

      if (!result.success) {
        setError(result.error)
      }

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      
      return {
        success: false,
        restoredNodes: 0,
        restoredEdges: 0,
        error: errorMessage
      }

    } finally {
      setIsRestoring(false)
    }
  }, [useCases])

  /**
   * Gets the version history for a function model
   */
  const getFunctionModelVersions = useCallback(async (
    modelId: string
  ): Promise<{
    success: boolean
    versions: Array<{
      version: string
      createdAt: Date
      createdBy: string
      changeSummary: string
      modelId: string
    }>
    error?: string
  }> => {
    setIsGettingVersions(true)
    setError(undefined)

    try {
      const result = await useCases.getFunctionModelVersions(modelId)

      if (!result.success) {
        setError(result.error)
      }

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      
      return {
        success: false,
        versions: [],
        error: errorMessage
      }

    } finally {
      setIsGettingVersions(false)
    }
  }, [useCases])

  /**
   * Updates function model metadata
   */
  const updateFunctionModelMetadata = useCallback(async (
    modelId: string,
    updates: { name?: string; description?: string },
    author: string
  ): Promise<{ success: boolean; model?: any; error?: string }> => {
    setIsUpdatingMetadata(true)
    setError(undefined)

    try {
      const result = await useCases.updateFunctionModelMetadata(modelId, updates, author)

      if (!result.success) {
        setError(result.error)
      }

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      
      return {
        success: false,
        error: errorMessage
      }

    } finally {
      setIsUpdatingMetadata(false)
    }
  }, [useCases])

  // Get repository from service locator
  const functionModelRepository = serviceLocator.getFunctionModelRepository()

  return {
    functionModelRepository,
    saveFunctionModel,
    loadFunctionModel,
    createVersion,
    restoreFromVersion,
    getFunctionModelVersions,
    updateFunctionModelMetadata,
    isSaving,
    isLoading,
    isCreatingVersion,
    isRestoring,
    isGettingVersions,
    isUpdatingMetadata,
    lastSaveResult,
    lastLoadResult,
    error
  }
}
