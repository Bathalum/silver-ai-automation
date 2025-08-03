import { useState, useCallback } from 'react'
import { NodeExecutionService } from '@/lib/services/node-execution-service'
import type { ExecutionResult, ValidationResult } from '@/lib/domain/entities/node-behavior-types'
import type { ExecutionContext, ExecutionOptions } from '@/lib/services/node-execution-service'

export function useNodeExecution() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null)
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null)

  const executionService = new NodeExecutionService()

  const executeNode = useCallback(async (
    featureType: string,
    entityId: string,
    nodeId: string,
    context?: ExecutionContext,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await executionService.executeNode(featureType, entityId, nodeId, context, options)
      setLastResult(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const validateNode = useCallback(async (
    featureType: string,
    entityId: string,
    nodeId: string
  ): Promise<ValidationResult> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await executionService.validateNode(featureType, entityId, nodeId)
      setLastValidation(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const getNodeBehavior = useCallback(async (
    featureType: string,
    entityId: string,
    nodeId: string
  ): Promise<any> => {
    setLoading(true)
    setError(null)
    
    try {
      const behavior = await executionService.getNodeBehavior(featureType, entityId, nodeId)
      return behavior
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get node behavior'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    lastResult,
    lastValidation,
    executeNode,
    validateNode,
    getNodeBehavior,
    clearError: () => setError(null),
    clearResults: () => {
      setLastResult(null)
      setLastValidation(null)
    }
  }
} 