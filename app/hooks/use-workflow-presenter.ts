// Custom Hook for Workflow Presenter Integration
// Following Clean Architecture: UI Hook that bridges components to application layer

'use client'

import { useState, useEffect, useCallback } from 'react'
import { WorkflowOperationsPresenter, WorkflowFormData, NodeFormData } from '../use-cases/data-access/workflow-operations'
import { 
  WorkflowDisplayModel, 
  NodeDisplayModel, 
  ValidationDisplayModel,
  WorkflowStatsDisplayModel,
  ExecutionStatusDisplayModel
} from '../use-cases/ui-models/workflow-display-models'
import { createNotificationService } from '../use-cases/ui-workflows/notification-service'

/**
 * Custom hook for workflow operations through presentation layer
 * 
 * This hook follows Clean Architecture by:
 * 1. Acting as a bridge between UI components and application layer
 * 2. Managing UI-specific state (loading, errors, etc.)
 * 3. Converting between UI models and business operations
 * 4. Providing clean interface for components to use
 */
export function useWorkflowPresenter() {
  // UI State - only UI-related concerns
  const [isLoading, setIsLoading] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDisplayModel | null>(null)
  const [validationResults, setValidationResults] = useState<ValidationDisplayModel | null>(null)

  // Create presenter instance (in real app, this would be dependency injected)
  const presenter = new WorkflowOperationsPresenter(
    // These would be injected use case implementations
    {} as any, // createWorkflowUseCase
    {} as any, // executeNodeUseCase  
    {} as any, // validateWorkflowUseCase
    {} as any, // getWorkflowUseCase
    createNotificationService({ storage: 'memory' })
  )

  /**
   * Create a new workflow - UI operation
   */
  const createWorkflow = useCallback(async (formData: WorkflowFormData): Promise<WorkflowDisplayModel | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const workflow = await presenter.createWorkflow(formData)
      setSelectedWorkflow(workflow)
      return workflow
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create workflow'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [presenter])

  /**
   * Execute a node - UI operation
   */
  const executeNode = useCallback(async (
    nodeId: string, 
    workflowId: string, 
    parameters?: Record<string, any>
  ): Promise<NodeDisplayModel | null> => {
    setIsExecuting(true)
    setError(null)
    
    try {
      const nodeResult = await presenter.executeNode(nodeId, workflowId, parameters)
      return nodeResult
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute node'
      setError(errorMessage)
      return null
    } finally {
      setIsExecuting(false)
    }
  }, [presenter])

  /**
   * Validate workflow - UI operation
   */
  const validateWorkflow = useCallback(async (
    workflowId: string, 
    nodes: any[], 
    edges: any[]
  ): Promise<ValidationDisplayModel | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const validation = await presenter.validateWorkflow(workflowId, nodes, edges)
      setValidationResults(validation)
      return validation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate workflow'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [presenter])

  /**
   * Update node properties - UI operation
   */
  const updateNodeProperties = useCallback(async (
    nodeId: string, 
    formData: NodeFormData
  ): Promise<NodeDisplayModel | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const updatedNode = await presenter.updateNodeProperties(nodeId, formData)
      return updatedNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update node'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [presenter])

  /**
   * Load workflow - UI operation
   */
  const loadWorkflow = useCallback(async (workflowId: string): Promise<WorkflowDisplayModel | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const workflow = await presenter.getWorkflow(workflowId)
      setSelectedWorkflow(workflow)
      return workflow
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workflow'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [presenter])

  /**
   * Clear error state - UI operation
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Reset all state - UI operation
   */
  const resetState = useCallback(() => {
    setIsLoading(false)
    setIsExecuting(false)
    setError(null)
    setSelectedWorkflow(null)
    setValidationResults(null)
  }, [])

  return {
    // State
    isLoading,
    isExecuting,
    error,
    selectedWorkflow,
    validationResults,
    
    // Operations
    createWorkflow,
    executeNode,
    validateWorkflow,
    updateNodeProperties,
    loadWorkflow,
    
    // Utilities
    clearError,
    resetState,
    
    // Direct presenter access (for advanced usage)
    presenter
  }
}

/**
 * Hook for workflow statistics display
 */
export function useWorkflowStats(workflowId?: string) {
  const [stats, setStats] = useState<WorkflowStatsDisplayModel | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const updateStats = useCallback((nodes: any[], edges: any[]) => {
    // Calculate UI-specific statistics
    const containerNodes = nodes.filter(n => ['io', 'stage'].includes(n.type)).length
    const actionNodes = nodes.filter(n => ['tether', 'kb', 'functionModel'].includes(n.type)).length
    const completedNodes = nodes.filter(n => n.data?.status === 'completed').length
    const failedNodes = nodes.filter(n => n.data?.status === 'failed').length
    const runningNodes = nodes.filter(n => n.data?.status === 'running').length
    
    // Determine execution mode
    let executionMode: 'sequential' | 'parallel' | 'conditional' | 'mixed' = 'sequential'
    const modes = nodes.map(n => n.data?.executionMode).filter(Boolean)
    if (modes.length > 1 && new Set(modes).size > 1) {
      executionMode = 'mixed'
    } else if (modes[0]) {
      executionMode = modes[0]
    }

    // Calculate estimated duration
    const estimatedDuration = nodes.reduce((total, node) => {
      const duration = node.data?.estimatedDuration || 5 // default 5 minutes
      return total + (typeof duration === 'string' ? parseInt(duration) : duration)
    }, 0)

    // Calculate progress
    const overallProgress = nodes.length > 0 ? Math.round((completedNodes / nodes.length) * 100) : 0

    const newStats: WorkflowStatsDisplayModel = {
      totalNodes: nodes.length,
      containerNodes,
      actionNodes,
      executionMode,
      estimatedDuration,
      completedNodes,
      failedNodes,
      runningNodes,
      executionModeText: executionMode,
      executionModeIcon: getExecutionModeIcon(executionMode),
      durationText: formatDuration(estimatedDuration),
      overallProgress,
      progressText: `${completedNodes} of ${nodes.length} completed`
    }

    setStats(newStats)
  }, [])

  return {
    stats,
    isLoading,
    updateStats
  }
}

/**
 * Hook for execution status display
 */
export function useExecutionStatus() {
  const [status, setStatus] = useState<ExecutionStatusDisplayModel>({
    status: 'idle',
    statusColor: 'bg-gray-100 text-gray-800 border-gray-200',
    statusIcon: '⏸️',
    statusText: 'Idle',
    currentStep: 0,
    totalSteps: 0,
    progressPercentage: 0,
    progressText: 'Not started',
    canPause: false,
    canStop: false,
    canReset: true,
    canExecute: true
  })

  const updateExecutionStatus = useCallback((
    newStatus: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped',
    currentStep: number = 0,
    totalSteps: number = 0,
    activeNodeId?: string,
    activeNodeName?: string,
    errorMessage?: string
  ) => {
    const progressPercentage = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0
    
    const updatedStatus: ExecutionStatusDisplayModel = {
      status: newStatus,
      statusColor: getStatusColor(newStatus),
      statusIcon: getStatusIcon(newStatus),
      statusText: getStatusText(newStatus),
      currentStep,
      totalSteps,
      progressPercentage,
      progressText: `Step ${currentStep} of ${totalSteps}`,
      activeNodeId,
      activeNodeName,
      errorMessage,
      canPause: newStatus === 'running',
      canStop: newStatus === 'running' || newStatus === 'paused',
      canReset: newStatus !== 'running',
      canExecute: newStatus === 'idle' || newStatus === 'completed' || newStatus === 'failed' || newStatus === 'stopped'
    }

    if (newStatus === 'running' && !status.startTime) {
      updatedStatus.startTime = new Date().toISOString()
    }

    setStatus(updatedStatus)
  }, [status.startTime])

  const startExecution = useCallback((totalSteps: number) => {
    updateExecutionStatus('running', 0, totalSteps)
  }, [updateExecutionStatus])

  const pauseExecution = useCallback(() => {
    updateExecutionStatus('paused', status.currentStep, status.totalSteps)
  }, [updateExecutionStatus, status.currentStep, status.totalSteps])

  const stopExecution = useCallback(() => {
    updateExecutionStatus('stopped', status.currentStep, status.totalSteps)
  }, [updateExecutionStatus, status.currentStep, status.totalSteps])

  const completeExecution = useCallback(() => {
    updateExecutionStatus('completed', status.totalSteps, status.totalSteps)
  }, [updateExecutionStatus, status.totalSteps])

  const failExecution = useCallback((errorMessage: string) => {
    updateExecutionStatus('failed', status.currentStep, status.totalSteps, undefined, undefined, errorMessage)
  }, [updateExecutionStatus, status.currentStep, status.totalSteps])

  const resetExecution = useCallback(() => {
    updateExecutionStatus('idle', 0, 0)
  }, [updateExecutionStatus])

  return {
    status,
    updateExecutionStatus,
    startExecution,
    pauseExecution,
    stopExecution,
    completeExecution,
    failExecution,
    resetExecution
  }
}

// Helper functions for UI formatting

function getExecutionModeIcon(mode: string): string {
  switch (mode) {
    case 'sequential': return '▶️'
    case 'parallel': return '⚡'
    case 'conditional': return '🔀'
    case 'mixed': return '🔄'
    default: return '▶️'
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'running': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'completed': return 'bg-green-100 text-green-800 border-green-200'
    case 'failed': return 'bg-red-100 text-red-800 border-red-200'
    case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'stopped': return 'bg-gray-100 text-gray-800 border-gray-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'running': return '▶️'
    case 'completed': return '✅'
    case 'failed': return '❌'
    case 'paused': return '⏸️'
    case 'stopped': return '⏹️'
    default: return '⏸️'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'running': return 'Running'
    case 'completed': return 'Completed'
    case 'failed': return 'Failed'
    case 'paused': return 'Paused'
    case 'stopped': return 'Stopped'
    default: return 'Idle'
  }
}