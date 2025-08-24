/**
 * UI hook for data fetching patterns
 * Handles loading states, error handling, and caching for UI components
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface UseFetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  mutate: (data: T | null) => void
}

export interface UseFetchOptions<T> {
  initialData?: T | null
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  retryCount?: number
  retryDelay?: number
  enabled?: boolean
}

/**
 * Hook for fetching data with loading states and error handling
 */
export function useFetch<T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList = [],
  options: UseFetchOptions<T> = {}
): UseFetchState<T> {
  const {
    initialData = null,
    onSuccess,
    onError,
    retryCount = 0,
    retryDelay = 1000,
    enabled = true
  } = options

  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  
  const retryAttempts = useRef(0)
  const isMounted = useRef(true)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)
    
    try {
      const result = await fetchFn()
      
      if (isMounted.current) {
        setData(result)
        setError(null)
        retryAttempts.current = 0
        onSuccess?.(result)
      }
    } catch (err) {
      if (isMounted.current) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred'
        
        // Retry logic
        if (retryAttempts.current < retryCount) {
          retryAttempts.current++
          setTimeout(() => {
            if (isMounted.current) {
              fetchData()
            }
          }, retryDelay)
          return
        }
        
        setError(errorMessage)
        onError?.(err instanceof Error ? err : new Error(errorMessage))
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [fetchFn, enabled, onSuccess, onError, retryCount, retryDelay])

  const mutate = useCallback((newData: T | null) => {
    setData(newData)
  }, [])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [...deps, enabled])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    mutate
  }
}

/**
 * Hook for mutations with loading states and optimistic updates
 */
export interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: Error, variables: TVariables) => void
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void
}

export interface UseMutationReturn<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>
  data: TData | null
  loading: boolean
  error: string | null
  reset: () => void
}

export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationReturn<TData, TVariables> {
  const { onSuccess, onError, onSettled } = options
  
  const [data, setData] = useState<TData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await mutationFn(variables)
      setData(result)
      onSuccess?.(result, variables)
      onSettled?.(result, null, variables)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      const error = err instanceof Error ? err : new Error(errorMessage)
      onError?.(error, variables)
      onSettled?.(undefined, error, variables)
      throw error
    } finally {
      setLoading(false)
    }
  }, [mutationFn, onSuccess, onError, onSettled])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return {
    mutate,
    data,
    loading,
    error,
    reset
  }
}

/**
 * Hook for paginated data fetching
 */
export interface UsePaginationOptions<T> {
  pageSize?: number
  initialPage?: number
  enabled?: boolean
}

export interface UsePaginationReturn<T> {
  data: T[]
  loading: boolean
  error: string | null
  page: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  totalPages: number
  nextPage: () => void
  previousPage: () => void
  goToPage: (page: number) => void
  refetch: () => Promise<void>
}

export function usePagination<T>(
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; total: number }>,
  deps: React.DependencyList = [],
  options: UsePaginationOptions<T> = {}
): UsePaginationReturn<T> {
  const { pageSize = 10, initialPage = 1, enabled = true } = options
  
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(initialPage)
  const [total, setTotal] = useState(0)

  const totalPages = Math.ceil(total / pageSize)
  const hasNextPage = page < totalPages
  const hasPreviousPage = page > 1

  const fetchData = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)
    
    try {
      const result = await fetchFn(page, pageSize)
      setData(result.data)
      setTotal(result.total)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, page, pageSize, enabled])

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPage(prev => prev + 1)
    }
  }, [hasNextPage])

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPage(prev => prev - 1)
    }
  }, [hasPreviousPage])

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }, [totalPages])

  useEffect(() => {
    fetchData()
  }, [fetchData, ...deps])

  return {
    data,
    loading,
    error,
    page,
    hasNextPage,
    hasPreviousPage,
    totalPages,
    nextPage,
    previousPage,
    goToPage,
    refetch: fetchData
  }
}
