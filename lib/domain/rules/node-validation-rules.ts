// Node Validation Rules
// This file contains business rules for node validation

import type { BaseNode, NodeStatus } from '../entities/base-node-types'
import type { FunctionModelNode } from '../entities/function-model-node-types'
import type { ValidationResult } from '../entities/node-behavior-types'
import { NodeValidationError } from '../exceptions/domain-exceptions'

export class NodeValidationRules {
  static validateNode(node: BaseNode): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Base node validation
    const baseResult = this.validateBaseNode(node)
    errors.push(...baseResult.errors)
    warnings.push(...baseResult.warnings)

    // Domain-specific validation
    if (node.featureType === 'function-model') {
      const domainResult = this.validateFunctionModelNode(node as FunctionModelNode)
      errors.push(...domainResult.errors)
      warnings.push(...domainResult.warnings)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private static validateBaseNode(node: BaseNode): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Name validation
    if (!node.name || node.name.trim().length === 0) {
      errors.push('Node name is required')
    } else if (node.name.length > 255) {
      errors.push('Node name cannot exceed 255 characters')
    }

    // Description validation
    if (node.description && node.description.length > 1000) {
      errors.push('Node description cannot exceed 1000 characters')
    }

    // Position validation
    if (node.position) {
      if (node.position.x < 0 || node.position.y < 0) {
        errors.push('Node position coordinates must be non-negative')
      }
      if (node.position.x > 10000 || node.position.y > 10000) {
        warnings.push('Node position coordinates are very large')
      }
    }

    // Status validation
    const validStatuses: NodeStatus[] = ['active', 'inactive', 'draft', 'archived', 'error']
    if (!validStatuses.includes(node.status)) {
      errors.push(`Invalid node status: ${node.status}`)
    }

    // Metadata validation
    if (node.metadata) {
      if (node.metadata.tags && node.metadata.tags.length > 50) {
        errors.push('Node tags cannot exceed 50 items')
      }
      if (node.metadata.searchKeywords && node.metadata.searchKeywords.length > 100) {
        errors.push('Node search keywords cannot exceed 100 items')
      }
    }

    // Timestamp validation
    if (node.createdAt && node.updatedAt) {
      if (node.createdAt > node.updatedAt) {
        errors.push('Created timestamp cannot be after updated timestamp')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private static validateFunctionModelNode(node: FunctionModelNode): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Node type validation
    const validNodeTypes = ['stageNode', 'actionTableNode', 'ioNode', 'functionModelContainer']
    if (!validNodeTypes.includes(node.nodeType)) {
      errors.push(`Invalid function model node type: ${node.nodeType}`)
    }

    // Process behavior validation
    if (node.processBehavior) {
      const behaviorResult = this.validateProcessBehavior(node.processBehavior)
      errors.push(...behaviorResult.errors)
      warnings.push(...behaviorResult.warnings)
    }

    // Business logic validation
    if (node.businessLogic) {
      const businessResult = this.validateBusinessLogic(node.businessLogic)
      errors.push(...businessResult.errors)
      warnings.push(...businessResult.warnings)
    }

    // Function model data validation
    if (node.functionModelData) {
      const dataResult = this.validateFunctionModelData(node.functionModelData)
      errors.push(...dataResult.errors)
      warnings.push(...dataResult.warnings)
    }

    // Node links validation
    if (node.nodeLinks) {
      const linksResult = this.validateNodeLinks(node.nodeLinks)
      errors.push(...linksResult.errors)
      warnings.push(...linksResult.warnings)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private static validateProcessBehavior(behavior: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Execution type validation
    if (behavior.executionType) {
      const validTypes = ['sequential', 'parallel', 'conditional']
      if (!validTypes.includes(behavior.executionType)) {
        errors.push(`Invalid execution type: ${behavior.executionType}`)
      }
    }

    // Dependencies validation
    if (behavior.dependencies) {
      if (!Array.isArray(behavior.dependencies)) {
        errors.push('Dependencies must be an array')
      } else if (behavior.dependencies.length > 100) {
        errors.push('Dependencies cannot exceed 100 items')
      } else {
        // Check for duplicate dependencies
        const uniqueDeps = new Set(behavior.dependencies)
        if (uniqueDeps.size !== behavior.dependencies.length) {
          errors.push('Dependencies cannot contain duplicates')
        }
      }
    }

    // Timeout validation
    if (behavior.timeout !== undefined) {
      if (typeof behavior.timeout !== 'number') {
        errors.push('Timeout must be a number')
      } else if (behavior.timeout < 0) {
        errors.push('Timeout must be non-negative')
      } else if (behavior.timeout > 3600000) { // 1 hour
        errors.push('Timeout cannot exceed 1 hour')
      }
    }

    // Retry policy validation
    if (behavior.retryPolicy) {
      const retryResult = this.validateRetryPolicy(behavior.retryPolicy)
      errors.push(...retryResult.errors)
      warnings.push(...retryResult.warnings)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private static validateRetryPolicy(policy: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (policy.maxRetries !== undefined) {
      if (typeof policy.maxRetries !== 'number') {
        errors.push('Max retries must be a number')
      } else if (policy.maxRetries < 0) {
        errors.push('Max retries must be non-negative')
      } else if (policy.maxRetries > 10) {
        errors.push('Max retries cannot exceed 10')
      }
    }

    if (policy.backoff) {
      const validBackoffs = ['linear', 'exponential', 'constant']
      if (!validBackoffs.includes(policy.backoff)) {
        errors.push(`Invalid backoff type: ${policy.backoff}`)
      }
    }

    if (policy.initialDelay !== undefined) {
      if (typeof policy.initialDelay !== 'number') {
        errors.push('Initial delay must be a number')
      } else if (policy.initialDelay < 0) {
        errors.push('Initial delay must be non-negative')
      }
    }

    if (policy.maxDelay !== undefined) {
      if (typeof policy.maxDelay !== 'number') {
        errors.push('Max delay must be a number')
      } else if (policy.maxDelay < 0) {
        errors.push('Max delay must be non-negative')
      }
    }

    // Validate delay relationship
    if (policy.initialDelay !== undefined && policy.maxDelay !== undefined) {
      if (policy.initialDelay > policy.maxDelay) {
        errors.push('Initial delay cannot exceed max delay')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private static validateBusinessLogic(logic: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // RACI matrix validation
    if (logic.raciMatrix) {
      const raciResult = this.validateRACIMatrix(logic.raciMatrix)
      errors.push(...raciResult.errors)
      warnings.push(...raciResult.warnings)
    }

    // SLA validation
    if (logic.sla) {
      const slaResult = this.validateSLA(logic.sla)
      errors.push(...slaResult.errors)
      warnings.push(...slaResult.warnings)
    }

    // KPIs validation
    if (logic.kpis) {
      const kpisResult = this.validateKPIs(logic.kpis)
      errors.push(...kpisResult.errors)
      warnings.push(...kpisResult.warnings)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private static validateRACIMatrix(raci: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    const roles = ['responsible', 'accountable', 'consulted', 'informed']
    
    for (const role of roles) {
      if (raci[role]) {
        if (!Array.isArray(raci[role])) {
          errors.push(`${role} must be an array`)
        } else {
          if (raci[role].length === 0 && (role === 'responsible' || role === 'accountable')) {
            errors.push(`${role} cannot be empty`)
          }
          if (raci[role].length > 20) {
            errors.push(`${role} cannot exceed 20 people`)
          }
          // Check for duplicates
          const unique = new Set(raci[role])
          if (unique.size !== raci[role].length) {
            errors.push(`${role} cannot contain duplicates`)
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private static validateSLA(sla: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (sla.responseTime !== undefined) {
      if (typeof sla.responseTime !== 'number') {
        errors.push('Response time must be a number')
      } else if (sla.responseTime < 0) {
        errors.push('Response time must be non-negative')
      }
    }

    if (sla.availability !== undefined) {
      if (typeof sla.availability !== 'number') {
        errors.push('Availability must be a number')
      } else if (sla.availability < 0 || sla.availability > 100) {
        errors.push('Availability must be between 0 and 100')
      }
    }

    if (sla.uptime !== undefined) {
      if (typeof sla.uptime !== 'number') {
        errors.push('Uptime must be a number')
      } else if (sla.uptime < 0 || sla.uptime > 100) {
        errors.push('Uptime must be between 0 and 100')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private static validateKPIs(kpis: any[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!Array.isArray(kpis)) {
      errors.push('KPIs must be an array')
      return { isValid: false, errors, warnings }
    }

    if (kpis.length > 20) {
      errors.push('KPIs cannot exceed 20 items')
    }

    for (let i = 0; i < kpis.length; i++) {
      const kpi = kpis[i]
      if (!kpi.name || typeof kpi.name !== 'string') {
        errors.push(`KPI ${i + 1} must have a valid name`)
      }
      if (kpi.target !== undefined && typeof kpi.target !== 'number') {
        errors.push(`KPI ${i + 1} target must be a number`)
      }
      if (kpi.current !== undefined && typeof kpi.current !== 'number') {
        errors.push(`KPI ${i + 1} current must be a number`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private static validateFunctionModelData(data: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate that at least one data type is present
    const hasData = data.stage || data.action || data.io || data.container
    if (!hasData) {
      warnings.push('Function model node should have at least one data type')
    }

    // Stage data validation
    if (data.stage) {
      if (!data.stage.name || typeof data.stage.name !== 'string') {
        errors.push('Stage must have a valid name')
      }
      if (data.stage.actions && !Array.isArray(data.stage.actions)) {
        errors.push('Stage actions must be an array')
      }
    }

    // Action data validation
    if (data.action) {
      if (!data.action.name || typeof data.action.name !== 'string') {
        errors.push('Action must have a valid name')
      }
    }

    // IO data validation
    if (data.io) {
      if (!data.io.name || typeof data.io.name !== 'string') {
        errors.push('IO must have a valid name')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private static validateNodeLinks(links: any[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!Array.isArray(links)) {
      errors.push('Node links must be an array')
      return { isValid: false, errors, warnings }
    }

    if (links.length > 100) {
      errors.push('Node links cannot exceed 100 items')
    }

    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      
      if (!link.linkId || typeof link.linkId !== 'string') {
        errors.push(`Link ${i + 1} must have a valid linkId`)
      }
      
      if (!link.sourceNodeId || typeof link.sourceNodeId !== 'string') {
        errors.push(`Link ${i + 1} must have a valid sourceNodeId`)
      }
      
      if (!link.targetNodeId || typeof link.targetNodeId !== 'string') {
        errors.push(`Link ${i + 1} must have a valid targetNodeId`)
      }
      
      if (link.sourceNodeId === link.targetNodeId) {
        errors.push(`Link ${i + 1} cannot connect a node to itself`)
      }
      
      if (link.linkStrength !== undefined) {
        if (typeof link.linkStrength !== 'number') {
          errors.push(`Link ${i + 1} strength must be a number`)
        } else if (link.linkStrength < 0 || link.linkStrength > 1) {
          errors.push(`Link ${i + 1} strength must be between 0 and 1`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static validateNodeCreation(node: Partial<BaseNode>): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Required fields for creation
    if (!node.nodeId) {
      errors.push('Node ID is required for creation')
    }
    if (!node.featureType) {
      errors.push('Feature type is required for creation')
    }
    if (!node.entityId) {
      errors.push('Entity ID is required for creation')
    }
    if (!node.nodeType) {
      errors.push('Node type is required for creation')
    }
    if (!node.name) {
      errors.push('Node name is required for creation')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static validateNodeUpdate(node: Partial<BaseNode>): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Name validation for updates
    if (node.name !== undefined) {
      if (!node.name || node.name.trim().length === 0) {
        errors.push('Node name cannot be empty')
      } else if (node.name.length > 255) {
        errors.push('Node name cannot exceed 255 characters')
      }
    }

    // Description validation for updates
    if (node.description !== undefined && node.description && node.description.length > 1000) {
      errors.push('Node description cannot exceed 1000 characters')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
} 