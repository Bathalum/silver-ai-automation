import { useState, useCallback } from 'react'
import { NodeBehaviorFactory } from '@/lib/domain/entities/node-behavior-types'
import { UnifiedNodeOperations } from '@/lib/use-cases/unified-node-operations'
import type { BaseNode, FunctionModelNode } from '@/lib/domain/entities/base-node-types'
import type { ValidationResult, ExecutionResult } from '@/lib/domain/entities/node-behavior-types'

export function useNodeBehavior(featureType: string, entityId: string, nodeId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [behavior, setBehavior] = useState<any>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)

  const nodeOperations = new UnifiedNodeOperations()

  // Get node behavior
  const getNodeBehavior = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const nodeBehavior = await nodeOperations.getNodeBehavior(featureType, entityId, nodeId)
      setBehavior(nodeBehavior)
      return nodeBehavior
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get node behavior'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [featureType, entityId, nodeId])

  // Validate node
  const validateNode = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await nodeOperations.validateNode(featureType, entityId, nodeId)
      setValidationResult(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [featureType, entityId, nodeId])

  // Execute node
  const executeNode = useCallback(async (context?: any) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await nodeOperations.executeNode(featureType, entityId, nodeId, context)
      setExecutionResult(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [featureType, entityId, nodeId])

  // Get node dependencies
  const getDependencies = useCallback(async () => {
    if (!behavior) {
      await getNodeBehavior()
    }
    return behavior?.getDependencies() || []
  }, [behavior, getNodeBehavior])

  // Get node outputs
  const getOutputs = useCallback(async () => {
    if (!behavior) {
      await getNodeBehavior()
    }
    return behavior?.getOutputs() || []
  }, [behavior, getNodeBehavior])

  // Check if node can execute
  const canExecute = useCallback(async () => {
    if (!behavior) {
      await getNodeBehavior()
    }
    return behavior?.canExecute() || false
  }, [behavior, getNodeBehavior])

  return {
    loading,
    error,
    behavior,
    validationResult,
    executionResult,
    getNodeBehavior,
    validateNode,
    executeNode,
    getDependencies,
    getOutputs,
    canExecute,
    clearError: () => setError(null)
  }
} 