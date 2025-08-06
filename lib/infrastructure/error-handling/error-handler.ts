// Error Handling Patterns
// This file implements error handling patterns for the infrastructure layer

import { 
  InfrastructureException, 
  DatabaseConnectionException,
  ExternalServiceException,
  RateLimitException,
  TimeoutException 
} from '../exceptions/infrastructure-exceptions'

export class InfrastructureErrorHandler {
  // Retry pattern for transient failures
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error
        }
        
        await this.delay(delay * attempt)
      }
    }
    
    throw lastError!
  }
  
  // Circuit breaker pattern
  static createCircuitBreaker<T>(
    operation: () => Promise<T>,
    failureThreshold: number = 5,
    timeout: number = 30000
  ): () => Promise<T> {
    let failureCount = 0
    let lastFailureTime = 0
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
    
    return async () => {
      if (state === 'OPEN') {
        if (Date.now() - lastFailureTime > timeout) {
          state = 'HALF_OPEN'
        } else {
          throw new InfrastructureException(
            'Circuit breaker is open',
            'CIRCUIT_BREAKER_OPEN',
            503
          )
        }
      }
      
      try {
        const result = await operation()
        if (state === 'HALF_OPEN') {
          state = 'CLOSED'
          failureCount = 0
        }
        return result
      } catch (error) {
        failureCount++
        lastFailureTime = Date.now()
        
        if (failureCount >= failureThreshold) {
          state = 'OPEN'
        }
        
        throw error
      }
    }
  }
  
  // Timeout pattern
  static async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutException(
          `Operation timed out after ${timeoutMs}ms`,
          'operation'
        ))
      }, timeoutMs)
    })
    
    return Promise.race([operation, timeoutPromise])
  }
  
  // Fallback pattern
  static async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    try {
      return await primaryOperation()
    } catch (error) {
      console.warn('Primary operation failed, using fallback:', error)
      return await fallbackOperation()
    }
  }
  
  // Bulkhead pattern for resource isolation
  static createBulkhead<T>(
    operation: () => Promise<T>,
    maxConcurrency: number = 10
  ): () => Promise<T> {
    let activeOperations = 0
    const queue: Array<() => void> = []
    
    return async () => {
      if (activeOperations >= maxConcurrency) {
        // Wait for a slot to become available
        await new Promise<void>((resolve) => {
          queue.push(resolve)
        })
      }
      
      activeOperations++
      
      try {
        const result = await operation()
        return result
      } finally {
        activeOperations--
        
        // Process next queued operation
        if (queue.length > 0) {
          const next = queue.shift()
          if (next) next()
        }
      }
    }
  }
  
  // Rate limiting pattern
  static createRateLimiter<T>(
    operation: () => Promise<T>,
    maxRequests: number = 100,
    windowMs: number = 60000
  ): () => Promise<T> {
    let requestCount = 0
    let windowStart = Date.now()
    
    return async () => {
      const now = Date.now()
      
      // Reset window if needed
      if (now - windowStart > windowMs) {
        requestCount = 0
        windowStart = now
      }
      
      if (requestCount >= maxRequests) {
        throw new RateLimitException(
          `Rate limit exceeded: ${maxRequests} requests per ${windowMs}ms`,
          'operation'
        )
      }
      
      requestCount++
      return await operation()
    }
  }
  
  // Exponential backoff pattern
  static async withExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 5,
    baseDelay: number = 1000,
    maxDelay: number = 30000
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error
        }
        
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
        await this.delay(delay)
      }
    }
    
    throw lastError!
  }
  
  // Dead letter queue pattern
  static createDeadLetterQueue<T>(
    operation: () => Promise<T>,
    onFailure: (error: Error, context: any) => Promise<void>
  ): (context?: any) => Promise<T> {
    return async (context?: any) => {
      try {
        return await operation()
      } catch (error) {
        try {
          await onFailure(error as Error, context)
        } catch (dlqError) {
          console.error('Failed to process dead letter:', dlqError)
        }
        throw error
      }
    }
  }
  
  // Health check pattern
  static createHealthCheck<T>(
    operation: () => Promise<T>,
    healthCheck: () => Promise<boolean>
  ): () => Promise<T> {
    let isHealthy = true
    let lastHealthCheck = 0
    const healthCheckInterval = 30000 // 30 seconds
    
    return async () => {
      const now = Date.now()
      
      // Perform health check if needed
      if (now - lastHealthCheck > healthCheckInterval) {
        try {
          isHealthy = await healthCheck()
          lastHealthCheck = now
        } catch (error) {
          isHealthy = false
          console.error('Health check failed:', error)
        }
      }
      
      if (!isHealthy) {
        throw new InfrastructureException(
          'Service is unhealthy',
          'SERVICE_UNHEALTHY',
          503
        )
      }
      
      return await operation()
    }
  }
  
  // Logging and monitoring
  static async withLogging<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      console.log(`Starting operation: ${operationName}`, context)
      const result = await operation()
      const duration = Date.now() - startTime
      console.log(`Operation completed: ${operationName}`, { duration, context })
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`Operation failed: ${operationName}`, { 
        duration, 
        error: error instanceof Error ? error.message : 'Unknown error',
        context 
      })
      throw error
    }
  }
  
  // Metrics collection
  static async withMetrics<T>(
    operation: () => Promise<T>,
    metricName: string,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await operation()
      const duration = Date.now() - startTime
      
      // TODO: Send metrics to monitoring system
      console.log(`Metric: ${metricName}`, { 
        duration, 
        success: true,
        tags 
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      // TODO: Send metrics to monitoring system
      console.log(`Metric: ${metricName}`, { 
        duration, 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tags 
      })
      
      throw error
    }
  }
  
  // Private helper methods
  private static isRetryableError(error: any): boolean {
    return error instanceof DatabaseConnectionException ||
           error instanceof ExternalServiceException ||
           error instanceof RateLimitException ||
           error instanceof TimeoutException ||
           error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND'
  }
  
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
} 