/**
 * Execution UI state management hook
 * Handles workflow execution state, monitoring, and control UI
 */

import { useState, useCallback, useRef } from 'react'

export interface ExecutionStep {
  id: string
  nodeId: string
  nodeName: string
  nodeType: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startTime?: Date
  endTime?: Date
  duration?: number
  error?: string
  output?: any
  retryCount: number
  maxRetries: number
}

export interface ExecutionContext {
  id: string
  name: string
  value: any
  type: 'input' | 'output' | 'intermediate'
  source: string
  timestamp: Date
}

export interface ExecutionMetrics {
  totalSteps: number
  completedSteps: number
  failedSteps: number
  skippedSteps: number
  totalDuration: number
  averageStepDuration: number
  successRate: number
  throughput: number // steps per second
}

export interface ExecutionUIState {
  // Execution status
  isExecuting: boolean
  executionId: string | null
  executionStatus: 'idle' | 'starting' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  
  // Execution control
  canStart: boolean
  canPause: boolean
  canResume: boolean
  canStop: boolean
  canReset: boolean
  
  // Execution progress
  currentStep: string | null
  completedSteps: string[]
  failedSteps: string[]
  skippedSteps: string[]
  totalSteps: number
  
  // Execution details
  steps: ExecutionStep[]
  context: ExecutionContext[]
  metrics: ExecutionMetrics
  
  // Monitoring state
  isMonitoring: boolean
  autoRefresh: boolean
  refreshInterval: number
  lastUpdate: Date | null
  
  // UI display state
  showStepDetails: boolean
  showContextPanel: boolean
  showMetricsPanel: boolean
  showLogsPanel: boolean
  
  // Error handling
  lastError: string | null
  errorCount: number
  showErrorDetails: boolean
  
  // Performance
  executionStartTime: Date | null
  estimatedCompletionTime: Date | null
  progressPercentage: number
}

export interface UseExecutionUIStateReturn extends ExecutionUIState {
  // Execution control methods
  startExecution: (workflowId: string) => void
  pauseExecution: () => void
  resumeExecution: () => void
  stopExecution: () => void
  resetExecution: () => void
  
  // Step management
  updateStepStatus: (stepId: string, status: ExecutionStep['status'], output?: any, error?: string) => void
  addStep: (step: Omit<ExecutionStep, 'id'>) => string
  removeStep: (stepId: string) => void
  
  // Context management
  addContext: (context: Omit<ExecutionContext, 'id' | 'timestamp'>) => string
  updateContext: (contextId: string, updates: Partial<ExecutionContext>) => void
  removeContext: (contextId: string) => void
  
  // Monitoring methods
  startMonitoring: () => void
  stopMonitoring: () => void
  setAutoRefresh: (enabled: boolean) => void
  setRefreshInterval: (interval: number) => void
  refreshExecutionData: () => void
  
  // UI display methods
  toggleStepDetails: () => void
  toggleContextPanel: () => void
  toggleMetricsPanel: () => void
  toggleLogsPanel: () => void
  
  // Error handling
  setLastError: (error: string | null) => void
  incrementErrorCount: () => void
  toggleErrorDetails: () => void
  
  // Utility methods
  getStepById: (stepId: string) => ExecutionStep | undefined
  getContextById: (contextId: string) => ExecutionContext | undefined
  calculateProgress: () => number
  calculateMetrics: () => ExecutionMetrics
  isStepCompleted: (stepId: string) => boolean
  isStepFailed: (stepId: string) => boolean
  getExecutionTime: () => number
}

const initialState: ExecutionUIState = {
  isExecuting: false,
  executionId: null,
  executionStatus: 'idle',
  canStart: true,
  canPause: false,
  canResume: false,
  canStop: false,
  canReset: false,
  currentStep: null,
  completedSteps: [],
  failedSteps: [],
  skippedSteps: [],
  totalSteps: 0,
  steps: [],
  context: [],
  metrics: {
    totalSteps: 0,
    completedSteps: 0,
    failedSteps: 0,
    skippedSteps: 0,
    totalDuration: 0,
    averageStepDuration: 0,
    successRate: 0,
    throughput: 0
  },
  isMonitoring: false,
  autoRefresh: true,
  refreshInterval: 1000,
  lastUpdate: null,
  showStepDetails: false,
  showContextPanel: false,
  showMetricsPanel: false,
  showLogsPanel: false,
  lastError: null,
  errorCount: 0,
  showErrorDetails: false,
  executionStartTime: null,
  estimatedCompletionTime: null,
  progressPercentage: 0
}

export function useExecutionUIState(): UseExecutionUIStateReturn {
  const [state, setState] = useState<ExecutionUIState>(initialState)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const stepCounterRef = useRef(0)

  // Execution control methods
  const startExecution = useCallback((workflowId: string) => {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setState(prev => ({
      ...prev,
      isExecuting: true,
      executionId,
      executionStatus: 'starting',
      canStart: false,
      canPause: true,
      canStop: true,
      canReset: false,
      executionStartTime: new Date(),
      progressPercentage: 0
    }))
  }, [])

  const pauseExecution = useCallback(() => {
    setState(prev => ({
      ...prev,
      executionStatus: 'paused',
      canPause: false,
      canResume: true
    }))
  }, [])

  const resumeExecution = useCallback(() => {
    setState(prev => ({
      ...prev,
      executionStatus: 'running',
      canPause: true,
      canResume: false
    }))
  }, [])

  const stopExecution = useCallback(() => {
    setState(prev => ({
      ...prev,
      isExecuting: false,
      executionStatus: 'cancelled',
      canStart: true,
      canPause: false,
      canResume: false,
      canStop: false,
      canReset: true,
      currentStep: null
    }))
    
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const resetExecution = useCallback(() => {
    setState(prev => ({
      ...initialState,
      canStart: true
    }))
    
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  // Step management
  const updateStepStatus = useCallback((stepId: string, status: ExecutionStep['status'], output?: any, error?: string) => {
    setState(prev => {
      const updatedSteps = prev.steps.map(step => {
        if (step.id === stepId) {
          const updates: Partial<ExecutionStep> = { status }
          
          if (status === 'running' && !step.startTime) {
            updates.startTime = new Date()
          }
          
          if (['completed', 'failed', 'skipped'].includes(status)) {
            updates.endTime = new Date()
            if (step.startTime) {
              updates.duration = updates.endTime.getTime() - step.startTime.getTime()
            }
          }
          
          if (output !== undefined) updates.output = output
          if (error !== undefined) updates.error = error
          
          return { ...step, ...updates }
        }
        return step
      })

      // Update step lists
      const completedSteps = updatedSteps.filter(s => s.status === 'completed').map(s => s.id)
      const failedSteps = updatedSteps.filter(s => s.status === 'failed').map(s => s.id)
      const skippedSteps = updatedSteps.filter(s => s.status === 'skipped').map(s => s.id)

      return {
        ...prev,
        steps: updatedSteps,
        completedSteps,
        failedSteps,
        skippedSteps,
        totalSteps: updatedSteps.length
      }
    })
  }, [])

  const addStep = useCallback((step: Omit<ExecutionStep, 'id'>) => {
    const stepId = `step-${++stepCounterRef.current}`
    const newStep: ExecutionStep = { ...step, id: stepId }
    
    setState(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
      totalSteps: prev.totalSteps + 1
    }))
    
    return stepId
  }, [])

  const removeStep = useCallback((stepId: string) => {
    setState(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s.id !== stepId),
      totalSteps: Math.max(0, prev.totalSteps - 1)
    }))
  }, [])

  // Context management
  const addContext = useCallback((context: Omit<ExecutionContext, 'id' | 'timestamp'>) => {
    const contextId = `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newContext: ExecutionContext = {
      ...context,
      id: contextId,
      timestamp: new Date()
    }
    
    setState(prev => ({
      ...prev,
      context: [...prev.context, newContext]
    }))
    
    return contextId
  }, [])

  const updateContext = useCallback((contextId: string, updates: Partial<ExecutionContext>) => {
    setState(prev => ({
      ...prev,
      context: prev.context.map(ctx => 
        ctx.id === contextId ? { ...ctx, ...updates } : ctx
      )
    }))
  }, [])

  const removeContext = useCallback((contextId: string) => {
    setState(prev => ({
      ...prev,
      context: prev.context.filter(ctx => ctx.id !== contextId)
    }))
  }, [])

  // Monitoring methods
  const startMonitoring = useCallback(() => {
    setState(prev => ({ ...prev, isMonitoring: true }))
    
    if (state.autoRefresh && state.refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, lastUpdate: new Date() }))
      }, state.refreshInterval)
    }
  }, [state.autoRefresh, state.refreshInterval])

  const stopMonitoring = useCallback(() => {
    setState(prev => ({ ...prev, isMonitoring: false }))
    
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const setAutoRefresh = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, autoRefresh: enabled }))
  }, [])

  const setRefreshInterval = useCallback((interval: number) => {
    setState(prev => ({ ...prev, refreshInterval: Math.max(100, interval) }))
  }, [])

  const refreshExecutionData = useCallback(() => {
    setState(prev => ({ ...prev, lastUpdate: new Date() }))
  }, [])

  // UI display methods
  const toggleStepDetails = useCallback(() => {
    setState(prev => ({ ...prev, showStepDetails: !prev.showStepDetails }))
  }, [])

  const toggleContextPanel = useCallback(() => {
    setState(prev => ({ ...prev, showContextPanel: !prev.showContextPanel }))
  }, [])

  const toggleMetricsPanel = useCallback(() => {
    setState(prev => ({ ...prev, showMetricsPanel: !prev.showMetricsPanel }))
  }, [])

  const toggleLogsPanel = useCallback(() => {
    setState(prev => ({ ...prev, showLogsPanel: !prev.showLogsPanel }))
  }, [])

  // Error handling
  const setLastError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, lastError: error }))
  }, [])

  const incrementErrorCount = useCallback(() => {
    setState(prev => ({ ...prev, errorCount: prev.errorCount + 1 }))
  }, [])

  const toggleErrorDetails = useCallback(() => {
    setState(prev => ({ ...prev, showErrorDetails: !prev.showErrorDetails }))
  }, [])

  // Utility methods
  const getStepById = useCallback((stepId: string) => {
    return state.steps.find(step => step.id === stepId)
  }, [state.steps])

  const getContextById = useCallback((contextId: string) => {
    return state.context.find(ctx => ctx.id === contextId)
  }, [state.context])

  const calculateProgress = useCallback(() => {
    if (state.totalSteps === 0) return 0
    const completed = state.completedSteps.length + state.failedSteps.length + state.skippedSteps.length
    return Math.round((completed / state.totalSteps) * 100)
  }, [state.totalSteps, state.completedSteps, state.failedSteps, state.skippedSteps])

  const calculateMetrics = useCallback((): ExecutionMetrics => {
    const totalSteps = state.steps.length
    const completedSteps = state.steps.filter(s => s.status === 'completed').length
    const failedSteps = state.steps.filter(s => s.status === 'failed').length
    const skippedSteps = state.steps.filter(s => s.status === 'skipped').length
    
    const totalDuration = state.steps.reduce((sum, step) => sum + (step.duration || 0), 0)
    const averageStepDuration = completedSteps > 0 ? totalDuration / completedSteps : 0
    const successRate = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0
    
    const executionTime = state.executionStartTime ? Date.now() - state.executionStartTime.getTime() : 0
    const throughput = executionTime > 0 ? (completedSteps / (executionTime / 1000)) : 0

    return {
      totalSteps,
      completedSteps,
      failedSteps,
      skippedSteps,
      totalDuration,
      averageStepDuration,
      successRate,
      throughput
    }
  }, [state.steps, state.executionStartTime])

  const isStepCompleted = useCallback((stepId: string) => {
    return state.completedSteps.includes(stepId)
  }, [state.completedSteps])

  const isStepFailed = useCallback((stepId: string) => {
    return state.failedSteps.includes(stepId)
  }, [state.failedSteps])

  const getExecutionTime = useCallback(() => {
    if (!state.executionStartTime) return 0
    return Date.now() - state.executionStartTime.getTime()
  }, [state.executionStartTime])

  return {
    ...state,
    startExecution,
    pauseExecution,
    resumeExecution,
    stopExecution,
    resetExecution,
    updateStepStatus,
    addStep,
    removeStep,
    addContext,
    updateContext,
    removeContext,
    startMonitoring,
    stopMonitoring,
    setAutoRefresh,
    setRefreshInterval,
    refreshExecutionData,
    toggleStepDetails,
    toggleContextPanel,
    toggleMetricsPanel,
    toggleLogsPanel,
    setLastError,
    incrementErrorCount,
    toggleErrorDetails,
    getStepById,
    getContextById,
    calculateProgress,
    calculateMetrics,
    isStepCompleted,
    isStepFailed,
    getExecutionTime
  }
}
