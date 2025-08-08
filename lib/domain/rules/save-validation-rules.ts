// Save Validation Rules - Domain Layer
// This file contains business rules for validating save operations
// Following Clean Architecture principles with no infrastructure dependencies

import { FunctionModelNode } from '../entities/function-model-node-types'
import { SaveOperation } from '../services/function-model-save-service'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  recommendations: string[]
}

export interface CircularDependencyResult {
  hasCircular: boolean
  cycles: string[][]
  affectedNodes: string[]
}

export class SaveValidationRules {
  /**
   * Validates nodes according to business rules
   */
  validateNodes(nodes: FunctionModelNode[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    if (!nodes || nodes.length === 0) {
      warnings.push('No nodes to save')
      return { isValid: true, errors, warnings, recommendations }
    }

    // Validate each node
    nodes.forEach((node, index) => {
      const nodeValidation = this.validateSingleNode(node, index)
      errors.push(...nodeValidation.errors)
      warnings.push(...nodeValidation.warnings)
      recommendations.push(...nodeValidation.recommendations)
    })

    // Check for duplicate node IDs
    const nodeIds = nodes.map(n => n.nodeId)
    const duplicateIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index)
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate node IDs found: ${duplicateIds.join(', ')}`)
    }

    // Check for invalid positions
    const invalidPositions = nodes.filter(node => 
      typeof node.position.x !== 'number' || 
      typeof node.position.y !== 'number' ||
      isNaN(node.position.x) || 
      isNaN(node.position.y)
    )
    if (invalidPositions.length > 0) {
      errors.push(`${invalidPositions.length} nodes have invalid positions`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  /**
   * Validates a single node
   */
  private validateSingleNode(node: FunctionModelNode, index: number): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // Validate required fields
    if (!node.nodeId) {
      errors.push(`Node at index ${index} missing nodeId`)
    }

    if (!node.name || node.name.trim().length === 0) {
      errors.push(`Node at index ${index} missing name`)
    } else if (node.name.length > 100) {
      warnings.push(`Node "${node.name}" has a very long name`)
    }

    if (!node.nodeType) {
      errors.push(`Node "${node.name}" missing nodeType`)
    }

    // Validate node type
    const validNodeTypes = ['stageNode', 'actionTableNode', 'ioNode']
    if (node.nodeType && !validNodeTypes.includes(node.nodeType)) {
      errors.push(`Node "${node.name}" has invalid nodeType: ${node.nodeType}`)
    }

    // Validate position
    if (!node.position) {
      errors.push(`Node "${node.name}" missing position`)
    } else if (node.position.x < -10000 || node.position.x > 10000 || 
               node.position.y < -10000 || node.position.y > 10000) {
      warnings.push(`Node "${node.name}" has extreme position values`)
    }

    // Validate metadata
    if (node.metadata) {
      const metadataValidation = this.validateNodeMetadata(node.metadata, node.name)
      errors.push(...metadataValidation.errors)
      warnings.push(...metadataValidation.warnings)
    }

    // Validate business logic
    if (node.businessLogic) {
      const businessValidation = this.validateBusinessLogic(node.businessLogic, node.name)
      errors.push(...businessValidation.errors)
      warnings.push(...businessValidation.warnings)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  /**
   * Validates edges according to business rules
   */
  validateEdges(edges: any[], nodes: FunctionModelNode[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    if (!edges || edges.length === 0) {
      return { isValid: true, errors, warnings, recommendations }
    }

    const nodeIds = new Set(nodes.map(n => n.nodeId))

    // Validate each edge
    edges.forEach((edge, index) => {
      const edgeValidation = this.validateSingleEdge(edge, index, nodeIds)
      errors.push(...edgeValidation.errors)
      warnings.push(...edgeValidation.warnings)
      recommendations.push(...edgeValidation.recommendations)
    })

    // Check for duplicate edges
    const edgeIds = edges.map(e => e.id)
    const duplicateEdgeIds = edgeIds.filter((id, index) => edgeIds.indexOf(id) !== index)
    if (duplicateEdgeIds.length > 0) {
      errors.push(`Duplicate edge IDs found: ${duplicateEdgeIds.join(', ')}`)
    }

    // Check for self-loops
    const selfLoops = edges.filter(edge => edge.source === edge.target)
    if (selfLoops.length > 0) {
      warnings.push(`${selfLoops.length} self-loop edges detected`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  /**
   * Validates a single edge
   */
  private validateSingleEdge(edge: any, index: number, nodeIds: Set<string>): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // Validate required fields
    if (!edge.id) {
      errors.push(`Edge at index ${index} missing id`)
    }

    if (!edge.source) {
      errors.push(`Edge at index ${index} missing source`)
    } else if (!nodeIds.has(edge.source)) {
      errors.push(`Edge "${edge.id}" references non-existent source node: ${edge.source}`)
    }

    if (!edge.target) {
      errors.push(`Edge at index ${index} missing target`)
    } else if (!nodeIds.has(edge.target)) {
      errors.push(`Edge "${edge.id}" references non-existent target node: ${edge.target}`)
    }

    // Validate edge type
    if (edge.type && !['default', 'straight', 'step', 'smoothstep'].includes(edge.type)) {
      warnings.push(`Edge "${edge.id}" has unusual type: ${edge.type}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  /**
   * Validates model dependencies
   */
  validateModelDependencies(nodes: FunctionModelNode[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // Check for nodes with missing dependencies
    nodes.forEach(node => {
      if (node.processBehavior?.dependencies) {
        const missingDependencies = node.processBehavior.dependencies.filter(
          dep => !nodes.some(n => n.nodeId === dep)
        )
        if (missingDependencies.length > 0) {
          warnings.push(`Node "${node.name}" references missing dependencies: ${missingDependencies.join(', ')}`)
        }
      }
    })

    // Check for execution type consistency
    const executionTypes = nodes.map(n => n.processBehavior?.executionType?.value || 'sequential')
    const uniqueExecutionTypes = new Set(executionTypes)
    if (uniqueExecutionTypes.size > 3) {
      warnings.push('Model has many different execution types - consider standardizing')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  /**
   * Validates business rules for save operations
   */
  validateBusinessRules(operation: SaveOperation): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // Validate operation type
    if (!['create', 'update', 'version', 'auto-save'].includes(operation.type)) {
      errors.push(`Invalid operation type: ${operation.type}`)
    }

    // Validate metadata
    if (!operation.metadata.changeSummary) {
      warnings.push('No change summary provided')
    } else if (operation.metadata.changeSummary.length > 500) {
      warnings.push('Change summary is very long')
    }

    if (!operation.metadata.author) {
      errors.push('Author is required')
    }

    // Validate options
    if (operation.options.validateBeforeSave && operation.nodes.length > 100) {
      warnings.push('Large model with validation enabled may take time to save')
    }

    if (operation.options.createBackup && operation.nodes.length > 50) {
      warnings.push('Creating backup for large model may impact performance')
    }

    // Business-specific validations
    const businessValidation = this.validateBusinessConstraints(operation)
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
   * Checks for circular dependencies in the model
   */
  checkCircularDependencies(edges: any[]): CircularDependencyResult {
    const cycles: string[][] = []
    const affectedNodes = new Set<string>()

    // Build adjacency list
    const adjacencyList = new Map<string, string[]>()
    edges.forEach(edge => {
      if (!adjacencyList.has(edge.source)) {
        adjacencyList.set(edge.source, [])
      }
      adjacencyList.get(edge.source)!.push(edge.target)
    })

    // Check for cycles using DFS
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const dfs = (node: string, path: string[]): boolean => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node)
        const cycle = path.slice(cycleStart)
        cycles.push([...cycle, node])
        cycle.forEach(n => affectedNodes.add(n))
        return true
      }

      if (visited.has(node)) {
        return false
      }

      visited.add(node)
      recursionStack.add(node)
      path.push(node)

      const neighbors = adjacencyList.get(node) || []
      for (const neighbor of neighbors) {
        if (dfs(neighbor, [...path])) {
          return true
        }
      }

      recursionStack.delete(node)
      return false
    }

    // Check all nodes
    for (const node of adjacencyList.keys()) {
      if (!visited.has(node)) {
        dfs(node, [])
      }
    }

    return {
      hasCircular: cycles.length > 0,
      cycles,
      affectedNodes: Array.from(affectedNodes)
    }
  }

  /**
   * Validates node metadata
   */
  private validateNodeMetadata(metadata: any, nodeName: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // Validate tags
    if (metadata.tags && Array.isArray(metadata.tags)) {
      if (metadata.tags.length > 20) {
        warnings.push(`Node "${nodeName}" has many tags`)
      }
      
      const invalidTags = metadata.tags.filter((tag: any) => 
        typeof tag !== 'string' || tag.length > 50
      )
      if (invalidTags.length > 0) {
        errors.push(`Node "${nodeName}" has invalid tags`)
      }
    }

    // Validate search keywords
    if (metadata.searchKeywords && Array.isArray(metadata.searchKeywords)) {
      if (metadata.searchKeywords.length > 100) {
        warnings.push(`Node "${nodeName}" has many search keywords`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  /**
   * Validates business logic
   */
  private validateBusinessLogic(businessLogic: any, nodeName: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // Validate RACI matrix
    if (businessLogic.raciMatrix) {
      const raciValidation = this.validateRACIMatrix(businessLogic.raciMatrix, nodeName)
      errors.push(...raciValidation.errors)
      warnings.push(...raciValidation.warnings)
    }

    // Validate SLA
    if (businessLogic.sla) {
      if (businessLogic.sla.responseTime && businessLogic.sla.responseTime < 0) {
        errors.push(`Node "${nodeName}" has invalid SLA response time`)
      }
      if (businessLogic.sla.uptime && (businessLogic.sla.uptime < 0 || businessLogic.sla.uptime > 100)) {
        errors.push(`Node "${nodeName}" has invalid SLA uptime percentage`)
      }
    }

    // Validate KPIs
    if (businessLogic.kpis && Array.isArray(businessLogic.kpis)) {
      if (businessLogic.kpis.length > 20) {
        warnings.push(`Node "${nodeName}" has many KPIs`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  /**
   * Validates RACI matrix
   */
  private validateRACIMatrix(raciMatrix: any, nodeName: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    const validRoles = ['R', 'A', 'C', 'I']
    const roles = Object.values(raciMatrix).flat()

    // Check for invalid roles
    const invalidRoles = roles.filter((role: any) => !validRoles.includes(role))
    if (invalidRoles.length > 0) {
      errors.push(`Node "${nodeName}" has invalid RACI roles`)
    }

    // Check for missing responsible party
    const hasResponsible = roles.includes('R')
    if (!hasResponsible) {
      warnings.push(`Node "${nodeName}" has no responsible party in RACI matrix`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  /**
   * Validates business constraints
   */
  private validateBusinessConstraints(operation: SaveOperation): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // Check for model size constraints
    if (operation.nodes.length > 100) {
      warnings.push('Large model detected - consider breaking into smaller models')
    }

    // Check for complex models
    const avgConnectionsPerNode = operation.edges.length / operation.nodes.length
    if (avgConnectionsPerNode > 5) {
      warnings.push('Model has high connectivity - consider simplifying')
    }

    // Check for naming conventions
    const nodesWithGenericNames = operation.nodes.filter(node => 
      ['Node', 'Stage', 'Action', 'Process'].some(generic => 
        node.name.toLowerCase().includes(generic.toLowerCase())
      )
    )
    if (nodesWithGenericNames.length > 0) {
      recommendations.push('Consider using more descriptive node names')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }
}
