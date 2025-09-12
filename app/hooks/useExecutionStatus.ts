/**
 * React hook for monitoring workflow execution status and progress
 * Provides real-time tracking of model execution lifecycle and progress
 * 
 * CLEAN ARCHITECTURE BOUNDARY:
 * - Interface Adapter Layer (React Hook) → API Routes (Interface Adapter)
 * - Handles execution monitoring, progress tracking, and result management
 * - Maps between execution data and UI state updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ExecutionDto, ApiResponse } from '@/app/actions/types';

export interface UseExecutionStatusOptions {
  enabled?: boolean;
  pollInterval?: number; // Polling interval in milliseconds for active executions
  autoRefresh?: boolean; // Auto-refresh for active executions
}

export interface ExecutionProgress {
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  currentNode?: string;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface ExecutionResult {
  success: boolean;
  outputs?: Record<string, any>;
  errors: string[];
  warnings: string[];
  executionTime: number;
  completedAt?: Date;
}

export interface UseExecutionStatusResult {
  execution: ExecutionDto | null;
  loading: boolean;
  error: string | null;
  progress: ExecutionProgress;
  result: ExecutionResult | null;
  isActive: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  cancel: () => Promise<boolean>;
  pause: () => Promise<boolean>;
  resume: () => Promise<boolean>;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Hook for monitoring execution status with real-time updates and controls
 * Provides comprehensive execution lifecycle management
 */
export function useExecutionStatus(
  executionId: string,
  options: UseExecutionStatusOptions = {}
): UseExecutionStatusResult {
  const {
    enabled = true,
    pollInterval = 2000, // 2 seconds default
    autoRefresh = true
  } = options;

  const [execution, setExecution] = useState<ExecutionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const isMounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);
  const pollTimer = useRef<NodeJS.Timeout | null>(null);

  // Derived state calculations
  const progress: ExecutionProgress = {
    totalNodes: execution?.progress?.totalNodes || 0,
    completedNodes: execution?.progress?.completedNodes || 0,
    failedNodes: execution?.progress?.failedNodes || 0,
    currentNode: execution?.progress?.currentNode,
    percentage: execution?.progress?.totalNodes 
      ? Math.round(((execution.progress.completedNodes || 0) / execution.progress.totalNodes) * 100)
      : 0,
    estimatedTimeRemaining: calculateEstimatedTimeRemaining(execution)
  };

  const result: ExecutionResult | null = execution?.status === 'completed' || execution?.status === 'failed' 
    ? {
        success: execution.status === 'completed',
        outputs: execution.outputs,
        errors: execution.errors || [],
        warnings: execution.warnings || [],
        executionTime: execution.executionTime || 0,
        completedAt: execution.completedAt ? new Date(execution.completedAt) : undefined
      }
    : null;

  const isActive = execution?.status === 'running' || execution?.status === 'pending';
  const isCompleted = execution?.status === 'completed';
  const isFailed = execution?.status === 'failed';

  // Helper function to calculate estimated time remaining
  function calculateEstimatedTimeRemaining(exec: ExecutionDto | null): number | undefined {
    if (!exec || !exec.progress) return undefined;
    
    const { totalNodes, completedNodes } = exec.progress;
    const executionTime = exec.executionTime || 0;
    
    if (completedNodes === 0) return undefined;
    
    const averageTimePerNode = executionTime / completedNodes;
    const remainingNodes = totalNodes - completedNodes;
    
    return Math.round(remainingNodes * averageTimePerNode);
  }

  // Fetch execution status
  const fetchExecutionStatus = useCallback(async (showLoading = false): Promise<void> => {
    if (!enabled || !executionId) {
      setLoading(false);
      return;
    }

    // Cancel previous request if still pending
    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();
    
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      // Make API request to get execution status
      const response = await fetch(`/api/executions/${executionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: abortController.current.signal
      });

      if (!response.ok) {
        // Handle different HTTP error codes
        switch (response.status) {
          case 401:
            throw new Error('Authentication required');
          case 403:
            throw new Error('You do not have permission to view this execution');
          case 404:
            throw new Error('Execution not found');
          case 429:
            throw new Error('Too many requests. Please try again later');
          default:
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const result: ApiResponse<ExecutionDto> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch execution status');
      }

      if (isMounted.current) {
        setExecution(result.data || null);
        setLastUpdated(new Date());
        setError(null);
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }

      if (isMounted.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch execution status';
        setError(errorMessage);
        console.error('useExecutionStatus fetch error:', err);
      }
    } finally {
      if (isMounted.current && showLoading) {
        setLoading(false);
      }
    }
  }, [executionId, enabled]);

  // Control functions
  const cancel = useCallback(async (): Promise<boolean> => {
    if (!executionId) return false;

    try {
      setError(null);

      const response = await fetch(`/api/executions/${executionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel execution: ${response.statusText}`);
      }

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to cancel execution');
      }

      // Refresh execution status
      await fetchExecutionStatus();

      return true;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel execution';
      setError(errorMessage);
      return false;
    }
  }, [executionId, fetchExecutionStatus]);

  const pause = useCallback(async (): Promise<boolean> => {
    if (!executionId) return false;

    try {
      setError(null);

      const response = await fetch(`/api/executions/${executionId}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to pause execution: ${response.statusText}`);
      }

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to pause execution');
      }

      // Refresh execution status
      await fetchExecutionStatus();

      return true;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause execution';
      setError(errorMessage);
      return false;
    }
  }, [executionId, fetchExecutionStatus]);

  const resume = useCallback(async (): Promise<boolean> => {
    if (!executionId) return false;

    try {
      setError(null);

      const response = await fetch(`/api/executions/${executionId}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to resume execution: ${response.statusText}`);
      }

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to resume execution');
      }

      // Refresh execution status
      await fetchExecutionStatus();

      return true;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume execution';
      setError(errorMessage);
      return false;
    }
  }, [executionId, fetchExecutionStatus]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchExecutionStatus(true);
  }, [fetchExecutionStatus]);

  // Setup polling for active executions
  useEffect(() => {
    if (!autoRefresh || !isActive || pollInterval <= 0) {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      return;
    }

    pollTimer.current = setInterval(() => {
      fetchExecutionStatus(false); // Don't show loading for polls
    }, pollInterval);

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [autoRefresh, isActive, pollInterval, fetchExecutionStatus]);

  // Initial fetch and dependency changes
  useEffect(() => {
    fetchExecutionStatus(true);
  }, [fetchExecutionStatus]);

  // Cleanup effect
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return {
    execution,
    loading,
    error,
    progress,
    result,
    isActive,
    isCompleted,
    isFailed,
    cancel,
    pause,
    resume,
    refetch,
    lastUpdated
  };
}

/**
 * Helper hook for managing multiple execution statuses
 */
export function useExecutionList(executionIds: string[]) {
  const [executions, setExecutions] = useState<Record<string, ExecutionDto>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExecutions = useCallback(async () => {
    if (executionIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const promises = executionIds.map(async (executionId) => {
        const response = await fetch(`/api/executions/${executionId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch execution ${executionId}`);
        }
        
        const result: ApiResponse<ExecutionDto> = await response.json();
        
        if (!result.success) {
          throw new Error(`Failed to fetch execution ${executionId}`);
        }
        
        return { executionId, execution: result.data! };
      });

      const results = await Promise.allSettled(promises);
      const newExecutions: Record<string, ExecutionDto> = {};

      results.forEach((result, index) => {
        const executionId = executionIds[index];
        if (result.status === 'fulfilled') {
          newExecutions[executionId] = result.value.execution;
        }
      });

      setExecutions(newExecutions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch executions';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [executionIds]);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  // Summary statistics
  const summary = {
    total: executionIds.length,
    running: Object.values(executions).filter(e => e.status === 'running').length,
    completed: Object.values(executions).filter(e => e.status === 'completed').length,
    failed: Object.values(executions).filter(e => e.status === 'failed').length,
    pending: Object.values(executions).filter(e => e.status === 'pending').length,
    cancelled: Object.values(executions).filter(e => e.status === 'cancelled').length
  };

  return {
    executions,
    loading,
    error,
    summary,
    refetch: fetchExecutions
  };
}