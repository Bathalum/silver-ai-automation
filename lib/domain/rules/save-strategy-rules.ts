// Save Strategy Rules - Domain Layer
// This file contains business logic for determining save operation types and strategies
// Following Clean Architecture principles with no infrastructure dependencies

import { SaveOperation } from '../services/function-model-save-service'

export interface SaveStrategyResult {
  strategy: 'create' | 'update' | 'version' | 'auto-save'
  reason: string
  estimatedDuration: number
  complexity: 'simple' | 'moderate' | 'complex'
}

export interface ComplexityResult {
  complexity: 'simple' | 'moderate' | 'complex'
  estimatedDuration: number
  factors: string[]
}

export class SaveStrategyRules {
  /**
   * Determines the appropriate save strategy based on business rules
   */
  determineStrategy(operation: SaveOperation): SaveStrategyResult {
    // Determine base strategy
    let strategy: 'create' | 'update' | 'version' | 'auto-save' = 'update'
    let reason = 'Standard model update'

    // Check for create operation
    if (operation.type === 'create') {
      strategy = 'create'
      reason = 'Creating new function model'
    }
    // Check for version operation
    else if (operation.type === 'version') {
      strategy = 'version'
      reason = 'Creating new version snapshot'
    }
    // Check for auto-save
    else if (operation.type === 'auto-save') {
      strategy = 'auto-save'
      reason = 'Automatic save operation'
    }
    // Check for significant changes that warrant versioning
    else if (this.hasSignificantChanges(operation)) {
      strategy = 'version'
      reason = 'Significant changes detected, creating version'
    }
    // Check for rapid updates
    else if (this.isRapidUpdate(operation)) {
      strategy = 'auto-save'
      reason = 'Rapid update detected, using auto-save'
    }

    // Calculate complexity
    const complexityResult = this.calculateComplexity(operation)

    return {
      strategy,
      reason,
      estimatedDuration: complexityResult.estimatedDuration,
      complexity: complexityResult.complexity
    }
  }

  /**
   * Determines if a save operation requires a new version
   */
  requiresNewVersion(operation: SaveOperation, lastSavedAt: Date): boolean {
    // Always create version for explicit version operations
    if (operation.type === 'version') {
      return true
    }

    // Check for significant changes
    if (this.hasSignificantChanges(operation)) {
      return true
    }

    // Check time since last save
    const timeSinceLastSave = Date.now() - lastSavedAt.getTime()
    const hoursSinceLastSave = timeSinceLastSave / (1000 * 60 * 60)
    
    // Create version if more than 24 hours since last save
    if (hoursSinceLastSave > 24) {
      return true
    }

    // Create version if more than 50 changes
    if (operation.nodes.length > 50 || operation.edges.length > 100) {
      return true
    }

    return false
  }

  /**
   * Calculates save operation complexity and estimated duration
   */
  calculateComplexity(operation: SaveOperation): ComplexityResult {
    const factors: string[] = []
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple'
    let estimatedDuration = 100 // Base duration in milliseconds

    // Factor 1: Number of nodes
    if (operation.nodes.length > 100) {
      complexity = 'complex'
      factors.push('Large number of nodes')
      estimatedDuration += operation.nodes.length * 10
    } else if (operation.nodes.length > 50) {
      complexity = complexity === 'simple' ? 'moderate' : complexity
      factors.push('Moderate number of nodes')
      estimatedDuration += operation.nodes.length * 5
    } else {
      factors.push('Small number of nodes')
      estimatedDuration += operation.nodes.length * 2
    }

    // Factor 2: Number of edges
    if (operation.edges.length > 200) {
      complexity = 'complex'
      factors.push('Large number of connections')
      estimatedDuration += operation.edges.length * 5
    } else if (operation.edges.length > 100) {
      complexity = complexity === 'simple' ? 'moderate' : complexity
      factors.push('Moderate number of connections')
      estimatedDuration += operation.edges.length * 2
    } else {
      factors.push('Small number of connections')
      estimatedDuration += operation.edges.length
    }

    // Factor 3: Operation type
    switch (operation.type) {
      case 'create':
        factors.push('New model creation')
        estimatedDuration += 200
        break
      case 'version':
        factors.push('Version creation')
        estimatedDuration += 300
        complexity = complexity === 'simple' ? 'moderate' : complexity
        break
      case 'auto-save':
        factors.push('Auto-save operation')
        estimatedDuration += 50
        break
      default:
        factors.push('Standard update')
        estimatedDuration += 100
    }

    // Factor 4: Validation requirements
    if (operation.options.validateBeforeSave) {
      factors.push('Pre-save validation')
      estimatedDuration += 150
      complexity = complexity === 'simple' ? 'moderate' : complexity
    }

    // Factor 5: Backup creation
    if (operation.options.createBackup) {
      factors.push('Backup creation')
      estimatedDuration += 200
      complexity = complexity === 'simple' ? 'moderate' : complexity
    }

    // Factor 6: Model complexity
    const avgConnectionsPerNode = operation.edges.length / Math.max(operation.nodes.length, 1)
    if (avgConnectionsPerNode > 5) {
      factors.push('High connectivity model')
      estimatedDuration += 100
      complexity = complexity === 'simple' ? 'moderate' : complexity
    }

    // Factor 7: Metadata complexity
    const complexMetadata = operation.nodes.some(node => 
      node.metadata?.tags?.length > 10 || 
      node.businessLogic?.kpis?.length > 10
    )
    if (complexMetadata) {
      factors.push('Complex metadata')
      estimatedDuration += 50
    }

    // Factor 8: Business logic complexity
    const complexBusinessLogic = operation.nodes.some(node => 
      node.businessLogic?.raciMatrix || 
      node.businessLogic?.sla || 
      node.businessLogic?.kpis?.length > 0
    )
    if (complexBusinessLogic) {
      factors.push('Complex business logic')
      estimatedDuration += 75
      complexity = complexity === 'simple' ? 'moderate' : complexity
    }

    return {
      complexity,
      estimatedDuration,
      factors
    }
  }

  /**
   * Checks if the operation has significant changes
   */
  private hasSignificantChanges(operation: SaveOperation): boolean {
    // Check for structural changes
    if (operation.nodes.length > 20 || operation.edges.length > 50) {
      return true
    }

    // Check for new node types
    const nodeTypes = new Set(operation.nodes.map(n => n.nodeType))
    if (nodeTypes.size > 2) {
      return true
    }

    // Check for business logic changes
    const hasBusinessLogicChanges = operation.nodes.some(node => 
      node.businessLogic?.raciMatrix || 
      node.businessLogic?.sla || 
      node.businessLogic?.kpis?.length > 0
    )
    if (hasBusinessLogicChanges) {
      return true
    }

    // Check for metadata changes
    const hasMetadataChanges = operation.nodes.some(node => 
      node.metadata?.tags?.length > 5 || 
      node.metadata?.searchKeywords?.length > 5
    )
    if (hasMetadataChanges) {
      return true
    }

    return false
  }

  /**
   * Checks if the operation is a rapid update
   */
  private isRapidUpdate(operation: SaveOperation): boolean {
    // Check if this is an auto-save operation
    if (operation.type === 'auto-save') {
      return true
    }

    // Check for small, frequent changes
    if (operation.nodes.length < 5 && operation.edges.length < 10) {
      return true
    }

    // Check for position-only updates
    const hasOnlyPositionChanges = operation.nodes.every(node => 
      !node.name && !node.description && !node.metadata && !node.businessLogic
    )
    if (hasOnlyPositionChanges) {
      return true
    }

    return false
  }

  /**
   * Determines if an operation should be batched
   */
  shouldBatchOperation(operation: SaveOperation): boolean {
    // Don't batch version operations
    if (operation.type === 'version') {
      return false
    }

    // Don't batch create operations
    if (operation.type === 'create') {
      return false
    }

    // Batch small, frequent updates
    if (operation.nodes.length < 10 && operation.edges.length < 20) {
      return true
    }

    // Batch position-only updates
    const hasOnlyPositionChanges = operation.nodes.every(node => 
      !node.name && !node.description && !node.metadata && !node.businessLogic
    )
    if (hasOnlyPositionChanges) {
      return true
    }

    return false
  }

  /**
   * Determines the optimal save frequency
   */
  calculateOptimalSaveFrequency(operation: SaveOperation): number {
    // Base frequency in milliseconds
    let frequency = 5000 // 5 seconds

    // Adjust based on model size
    if (operation.nodes.length > 100) {
      frequency = 10000 // 10 seconds for large models
    } else if (operation.nodes.length > 50) {
      frequency = 7500 // 7.5 seconds for medium models
    } else if (operation.nodes.length < 10) {
      frequency = 3000 // 3 seconds for small models
    }

    // Adjust based on operation type
    switch (operation.type) {
      case 'create':
        frequency = 2000 // 2 seconds for creates
        break
      case 'version':
        frequency = 15000 // 15 seconds for versions
        break
      case 'auto-save':
        frequency = 8000 // 8 seconds for auto-saves
        break
    }

    // Adjust based on complexity
    const complexityResult = this.calculateComplexity(operation)
    switch (complexityResult.complexity) {
      case 'complex':
        frequency *= 2
        break
      case 'moderate':
        frequency *= 1.5
        break
      case 'simple':
        // Keep base frequency
        break
    }

    return Math.max(frequency, 1000) // Minimum 1 second
  }

  /**
   * Determines if an operation should be prioritized
   */
  shouldPrioritizeOperation(operation: SaveOperation): boolean {
    // Prioritize version operations
    if (operation.type === 'version') {
      return true
    }

    // Prioritize create operations
    if (operation.type === 'create') {
      return true
    }

    // Prioritize operations with validation
    if (operation.options.validateBeforeSave) {
      return true
    }

    // Prioritize operations with backup
    if (operation.options.createBackup) {
      return true
    }

    // Prioritize large operations
    if (operation.nodes.length > 50 || operation.edges.length > 100) {
      return true
    }

    return false
  }

  /**
   * Determines the optimal retry strategy for failed operations
   */
  calculateRetryStrategy(operation: SaveOperation): {
    maxRetries: number
    retryDelay: number
    backoffMultiplier: number
  } {
    let maxRetries = 3
    let retryDelay = 1000 // 1 second
    let backoffMultiplier = 2

    // Adjust based on operation type
    switch (operation.type) {
      case 'create':
        maxRetries = 5
        retryDelay = 2000
        break
      case 'version':
        maxRetries = 3
        retryDelay = 3000
        break
      case 'auto-save':
        maxRetries = 2
        retryDelay = 500
        break
    }

    // Adjust based on complexity
    const complexityResult = this.calculateComplexity(operation)
    switch (complexityResult.complexity) {
      case 'complex':
        maxRetries += 2
        retryDelay *= 1.5
        break
      case 'moderate':
        maxRetries += 1
        retryDelay *= 1.2
        break
    }

    return {
      maxRetries,
      retryDelay,
      backoffMultiplier
    }
  }

  /**
   * Determines if an operation should be cached
   */
  shouldCacheOperation(operation: SaveOperation): boolean {
    // Don't cache version operations
    if (operation.type === 'version') {
      return false
    }

    // Don't cache create operations
    if (operation.type === 'create') {
      return false
    }

    // Cache small, frequent operations
    if (operation.nodes.length < 20 && operation.edges.length < 40) {
      return true
    }

    // Cache position-only updates
    const hasOnlyPositionChanges = operation.nodes.every(node => 
      !node.name && !node.description && !node.metadata && !node.businessLogic
    )
    if (hasOnlyPositionChanges) {
      return true
    }

    return false
  }

  /**
   * Calculates the optimal batch size for operations
   */
  calculateOptimalBatchSize(operation: SaveOperation): number {
    let batchSize = 10 // Default batch size

    // Adjust based on model size
    if (operation.nodes.length > 100) {
      batchSize = 5 // Smaller batches for large models
    } else if (operation.nodes.length < 20) {
      batchSize = 20 // Larger batches for small models
    }

    // Adjust based on operation type
    switch (operation.type) {
      case 'auto-save':
        batchSize = Math.min(batchSize, 15)
        break
      case 'update':
        batchSize = Math.min(batchSize, 10)
        break
    }

    return Math.max(batchSize, 1) // Minimum batch size of 1
  }
}
