import { useState, useCallback } from 'react'
import { FunctionModelNode } from '../../domain/entities/function-model-node-types'
import { Edge } from 'reactflow'
import {
  createFunctionModelVersion,
  loadFunctionModelVersion,
  getFunctionModelVersions,
  getLatestFunctionModelVersion,
  deleteFunctionModelVersion,
  restoreModelFromVersion,
  VersionEntry,
  VersionMetadata,
  compareVersions
} from '../use-cases/function-model-version-control'

export function useFunctionModelVersionControl(modelId: string) {
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [currentVersion, setCurrentVersion] = useState<VersionEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restorationProgress, setRestorationProgress] = useState<{
    isRestoring: boolean
    progress: number
    message: string
  }>({
    isRestoring: false,
    progress: 0,
    message: ''
  })

  // Load all versions for the model
  const loadVersions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const modelVersions = await getFunctionModelVersions(modelId)
      setVersions(modelVersions)
      
      // Set current version to latest
      if (modelVersions.length > 0) {
        setCurrentVersion(modelVersions[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions')
    } finally {
      setLoading(false)
    }
  }, [modelId])

  // Create a new version
  const createVersion = useCallback(async (
    nodes: FunctionModelNode[],
    edges: Edge[],
    changeSummary: string,
    createdBy?: string
  ) => {
    setLoading(true)
    setError(null)

    try {
      const newVersion = await createFunctionModelVersion(
        modelId,
        nodes,
        edges,
        changeSummary,
        createdBy
      )
      
      setVersions(prev => [newVersion, ...prev])
      setCurrentVersion(newVersion)
      
      return newVersion
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create version')
      throw err
    } finally {
      setLoading(false)
    }
  }, [modelId])

  // Load a specific version
  const loadVersion = useCallback(async (version: string) => {
    setLoading(true)
    setError(null)

    try {
      const versionData = await loadFunctionModelVersion(modelId, version)
      const versionEntry = versions.find(v => v.version === version)
      
      if (versionEntry) {
        setCurrentVersion(versionEntry)
      }
      
      return versionData
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version')
      throw err
    } finally {
      setLoading(false)
    }
  }, [modelId, versions])

  // NEW: Complete version restoration with progress tracking
  const restoreVersion = useCallback(async (
    version: string,
    options?: {
      validateBeforeRestore?: boolean
      backupCurrentState?: boolean
      userContext?: string
    }
  ) => {
    setRestorationProgress({
      isRestoring: true,
      progress: 0,
      message: 'Starting version restoration...'
    })
    setError(null)

    try {
      // Step 1: Validation
      setRestorationProgress(prev => ({
        ...prev,
        progress: 20,
        message: 'Validating version data...'
      }))

      // Step 2: Backup current state (if requested)
      if (options?.backupCurrentState) {
        setRestorationProgress(prev => ({
          ...prev,
          progress: 40,
          message: 'Backing up current state...'
        }))
      }

      // Step 3: Perform restoration
      setRestorationProgress(prev => ({
        ...prev,
        progress: 60,
        message: 'Restoring model state...'
      }))

      const result = await restoreModelFromVersion(modelId, version, options)

      if (result.success) {
        setRestorationProgress(prev => ({
          ...prev,
          progress: 100,
          message: `Restoration complete: ${result.restoredNodes} nodes, ${result.restoredEdges} edges restored`
        }))

        // Show warnings if any
        if (result.warnings.length > 0) {
          console.warn('Version restoration warnings:', result.warnings)
        }

        // Refresh versions list
        await loadVersions()

        return result
      } else {
        throw new Error(`Restoration failed: ${result.errors.join(', ')}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore version')
      throw err
    } finally {
      // Clear restoration progress after a delay
      setTimeout(() => {
        setRestorationProgress({
          isRestoring: false,
          progress: 0,
          message: ''
        })
      }, 2000)
    }
  }, [modelId, loadVersions])

  // Load the latest version
  const loadLatestVersion = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const latestVersion = await getLatestFunctionModelVersion(modelId)
      
      if (latestVersion) {
        setCurrentVersion(latestVersion)
        return await loadFunctionModelVersion(modelId, latestVersion.version)
      }
      
      return { nodes: [], edges: [] }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load latest version')
      throw err
    } finally {
      setLoading(false)
    }
  }, [modelId])

  // Delete a version
  const deleteVersion = useCallback(async (versionId: string) => {
    setLoading(true)
    setError(null)

    try {
      await deleteFunctionModelVersion(versionId)
      setVersions(prev => prev.filter(v => v.id !== versionId))
      
      // If we deleted the current version, set to latest
      if (currentVersion?.id === versionId) {
        const remainingVersions = versions.filter(v => v.id !== versionId)
        setCurrentVersion(remainingVersions.length > 0 ? remainingVersions[0] : null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete version')
      throw err
    } finally {
      setLoading(false)
    }
  }, [currentVersion, versions])

  // Compare two versions
  const compareVersionsById = useCallback((version1Id: string, version2Id: string) => {
    const version1 = versions.find(v => v.id === version1Id)
    const version2 = versions.find(v => v.id === version2Id)
    
    if (!version1 || !version2) {
      throw new Error('One or both versions not found')
    }
    
    return compareVersions(version1, version2)
  }, [versions])

  // Get version metadata
  const getVersionMetadata = useCallback((versionId: string): VersionMetadata | null => {
    const version = versions.find(v => v.id === versionId)
    if (!version) return null
    
    const nodeTypes: Record<string, number> = {}
    const executionTypes: Record<string, number> = {}
    let totalDuration = 0
    let maxComplexity: 'simple' | 'moderate' | 'complex' = 'simple'
    
    version.nodes.forEach(node => {
      // Count node types
      nodeTypes[node.data.nodeType] = (nodeTypes[node.data.nodeType] || 0) + 1
      
      // Count execution types
      const executionType = node.data.processBehavior?.executionType || 'sequential'
      executionTypes[executionType] = (executionTypes[executionType] || 0) + 1
      
      // Sum duration
      totalDuration += node.data.businessLogic?.estimatedDuration || 0
      
      // Determine max complexity
      const complexity = node.data.businessLogic?.complexity || 'simple'
      if (complexity === 'complex' || (complexity === 'moderate' && maxComplexity === 'simple')) {
        maxComplexity = complexity
      }
    })
    
    return {
      totalNodes: version.nodes.length,
      totalEdges: version.edges.length,
      nodeTypes,
      executionTypes,
      complexity: maxComplexity,
      estimatedDuration: totalDuration
    }
  }, [versions])

  // Auto-save functionality
  const autoSave = useCallback(async (
    nodes: FunctionModelNode[],
    edges: Edge[],
    changeSummary: string = 'Auto-save'
  ) => {
    try {
      await createVersion(nodes, edges, changeSummary, 'auto-save')
    } catch (err) {
      console.warn('Auto-save failed:', err)
    }
  }, [createVersion])

  return {
    // State
    versions,
    currentVersion,
    loading,
    error,
    restorationProgress,
    
    // Actions
    loadVersions,
    createVersion,
    loadVersion,
    restoreVersion, // NEW: Complete restoration
    loadLatestVersion,
    deleteVersion,
    compareVersionsById,
    getVersionMetadata,
    autoSave,
    
    // Utilities
    clearError: () => setError(null)
  }
} 