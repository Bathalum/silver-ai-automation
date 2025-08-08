// Function Model Save Service - Domain Layer
// This service contains pure business logic for function model save operations
// Following Clean Architecture principles with no infrastructure dependencies

import { FunctionModelNode } from '../entities/function-model-node-types'
import { FunctionModel } from '../entities/function-model-types'
import { SaveValidationRules } from '../rules/save-validation-rules'
import { VersionManagementRules } from '../rules/version-management-rules'
import { SaveStrategyRules } from '../rules/save-strategy-rules'

export interface SaveOperation {
  type: 'create' | 'update' | 'version' | 'auto-save'
  modelId: string
  nodes: FunctionModelNode[]
  edges: any[]
  metadata: {
    changeSummary: string
    author: string
    timestamp: Date
    isPublished: boolean
  }
  options: {
    validateBeforeSave: boolean
    createBackup: boolean
    updateVersion: boolean
  }
}

export interface SaveValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  recommendations: string[]
}

export interface SaveStrategyResult {
  strategy: 'create' | 'update' | 'version' | 'auto-save'
  reason: string
  estimatedDuration: number
  complexity: 'simple' | 'moderate' | 'complex'
}

export interface VersionCalculationResult {
  newVersion: string
  versionType: 'patch' | 'minor' | 'major'
  reason: string
  isCompatible: boolean
}

export class FunctionModelSaveService {
  private validationRules: SaveValidationRules
  private versionRules: VersionManagementRules
  private strategyRules: SaveStrategyRules

  constructor() {
    this.validationRules = new SaveValidationRules()
    this.versionRules = new VersionManagementRules()
    this.strategyRules = new SaveStrategyRules()
  }

  /**
   * Validates a save operation according to business rules
   */
  validateSaveOperation(operation: SaveOperation): SaveValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // Validate basic operation structure
    if (!operation.modelId) {
      errors.push('Model ID is required for save operation')
    }

    if (!operation.metadata.author) {
      errors.push('Author is required for save operation')
    }

    // Validate nodes
    const nodeValidation = this.validationRules.validateNodes(operation.nodes)
    errors.push(...nodeValidation.errors)
    warnings.push(...nodeValidation.warnings)

    // Validate edges
    const edgeValidation = this.validationRules.validateEdges(operation.edges, operation.nodes)
    errors.push(...edgeValidation.errors)
    warnings.push(...edgeValidation.warnings)

    // Validate model dependencies
    const dependencyValidation = this.validationRules.validateModelDependencies(operation.nodes)
    errors.push(...dependencyValidation.errors)
    warnings.push(...dependencyValidation.warnings)

    // Business rule validations
    const businessValidation = this.validationRules.validateBusinessRules(operation)
    errors.push(...businessValidation.errors)
    warnings.push(...businessValidation.warnings)
    recommendations.push(...businessValidation.recommendations)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  /**
   * Determines the appropriate save strategy based on business rules
   */
  determineSaveStrategy(operation: SaveOperation): SaveStrategyResult {
    return this.strategyRules.determineStrategy(operation)
  }

  /**
   * Calculates the next version number based on business rules
   */
  calculateNextVersion(
    currentVersion: string,
    operation: SaveOperation,
    existingVersions: string[]
  ): VersionCalculationResult {
    return this.versionRules.calculateNextVersion(currentVersion, operation, existingVersions)
  }

  /**
   * Validates version compatibility and business constraints
   */
  validateVersionCompatibility(
    newVersion: string,
    currentVersion: string,
    operation: SaveOperation
  ): SaveValidationResult {
    return this.versionRules.validateVersionCompatibility(newVersion, currentVersion, operation)
  }

  /**
   * Determines if a save operation requires a new version
   */
  requiresNewVersion(operation: SaveOperation, lastSavedAt: Date): boolean {
    return this.strategyRules.requiresNewVersion(operation, lastSavedAt)
  }

  /**
   * Calculates save operation complexity and estimated duration
   */
  calculateSaveComplexity(operation: SaveOperation): {
    complexity: 'simple' | 'moderate' | 'complex'
    estimatedDuration: number
    factors: string[]
  } {
    return this.strategyRules.calculateComplexity(operation)
  }

  /**
   * Validates save operation performance constraints
   */
  validatePerformanceConstraints(operation: SaveOperation): SaveValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check node count limits
    if (operation.nodes.length > 1000) {
      errors.push('Model exceeds maximum node limit of 1000')
    } else if (operation.nodes.length > 500) {
      warnings.push('Large model detected - consider breaking into smaller models')
    }

    // Check edge count limits
    if (operation.edges.length > 2000) {
      errors.push('Model exceeds maximum edge limit of 2000')
    } else if (operation.edges.length > 1000) {
      warnings.push('Complex model detected - consider simplifying connections')
    }

    // Check for circular dependencies
    const circularDependencyCheck = this.validationRules.checkCircularDependencies(operation.edges)
    if (circularDependencyCheck.hasCircular) {
      errors.push('Circular dependencies detected in model')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations: []
    }
  }

  /**
   * Generates save operation metadata for audit purposes
   */
  generateSaveMetadata(operation: SaveOperation): {
    operationId: string
    timestamp: Date
    checksum: string
    metadata: Record<string, any>
  } {
    const operationId = `save-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date()
    
    // Generate checksum for data integrity
    const dataString = JSON.stringify({
      modelId: operation.modelId,
      nodes: operation.nodes.map(n => ({ id: n.nodeId, type: n.nodeType, name: n.name })),
      edges: operation.edges.map(e => ({ id: e.id, source: e.source, target: e.target })),
      metadata: operation.metadata
    })
    const checksum = this.generateChecksum(dataString)

    return {
      operationId,
      timestamp,
      checksum,
      metadata: {
        nodeCount: operation.nodes.length,
        edgeCount: operation.edges.length,
        operationType: operation.type,
        author: operation.metadata.author,
        changeSummary: operation.metadata.changeSummary,
        isPublished: operation.metadata.isPublished
      }
    }
  }

  /**
   * Validates save operation business constraints
   */
  validateBusinessConstraints(operation: SaveOperation): SaveValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check for orphaned nodes (nodes without connections)
    const connectedNodeIds = new Set()
    operation.edges.forEach(edge => {
      connectedNodeIds.add(edge.source)
      connectedNodeIds.add(edge.target)
    })

    const orphanedNodes = operation.nodes.filter(node => !connectedNodeIds.has(node.nodeId))
    if (orphanedNodes.length > 0) {
      warnings.push(`${orphanedNodes.length} orphaned nodes detected`)
    }

    // Check for duplicate node names
    const nodeNames = operation.nodes.map(n => n.name.toLowerCase())
    const duplicateNames = nodeNames.filter((name, index) => nodeNames.indexOf(name) !== index)
    if (duplicateNames.length > 0) {
      warnings.push('Duplicate node names detected')
    }

    // Check for invalid node types
    const validNodeTypes = ['stageNode', 'actionTableNode', 'ioNode']
    const invalidNodes = operation.nodes.filter(node => !validNodeTypes.includes(node.nodeType))
    if (invalidNodes.length > 0) {
      errors.push('Invalid node types detected')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations: []
    }
  }

  /**
   * Generates a checksum for data integrity validation
   */
  private generateChecksum(data: string): string {
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}
