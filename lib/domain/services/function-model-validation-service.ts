// Function Model Validation Service
// This file contains domain services for function model validation

import type { FunctionModelNode } from '../entities/function-model-node-types'
import type { ValidationResult } from '../entities/node-behavior-types'
import type { LinkType } from '../entities/cross-feature-link-types'
import type { BaseNode } from '../entities/base-node-types'
import { FunctionModelNodeValidationRules } from '../rules/function-model-validation-rules'
import { FunctionModelNodeValidationError } from '../exceptions/domain-exceptions'

export class FunctionModelValidationService {
  static validateNode(node: FunctionModelNode): ValidationResult {
    const validation = FunctionModelNodeValidationRules.validateFunctionModelNode(node)
    
    if (!validation.isValid) {
      throw new FunctionModelNodeValidationError(
        `Function model node validation failed: ${validation.errors.join(', ')}`,
        node.nodeId
      )
    }
    
    return validation
  }
  
  static validateCrossFeatureLink(source: FunctionModelNode, target: BaseNode, linkType: LinkType): ValidationResult {
    const errors: string[] = []
    
    // Validate that the link type makes sense for the node types
    const validCombinations = this.getValidLinkCombinations(source.featureType, target.featureType)
    
    if (!validCombinations.includes(linkType)) {
      errors.push(`Link type '${linkType}' is not valid between ${source.featureType} and ${target.featureType} nodes`)
    }
    
    // Validate source node
    const sourceValidation = this.validateNode(source)
    if (!sourceValidation.isValid) {
      errors.push(...sourceValidation.errors)
    }
    
    // Validate target node (basic validation)
    if (!target.name?.trim()) {
      errors.push('Target node must have a name')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  private static getValidLinkCombinations(sourceType: string, targetType: string): LinkType[] {
    const combinations: Record<string, LinkType[]> = {
      'function-model-knowledge-base': ['documents', 'references', 'implements'],
      'function-model-spindle': ['triggers', 'consumes', 'produces'],
      'function-model-event-storm': ['implements', 'references'],
      'knowledge-base-function-model': ['documents', 'references'],
      'knowledge-base-spindle': ['documents', 'references'],
      'knowledge-base-event-storm': ['documents', 'references'],
      'spindle-function-model': ['implements', 'supports'],
      'spindle-knowledge-base': ['consumes', 'produces'],
      'spindle-event-storm': ['consumes', 'produces'],
      'event-storm-function-model': ['triggers', 'supports'],
      'event-storm-knowledge-base': ['triggers', 'supports'],
      'event-storm-spindle': ['triggers', 'supports']
    }
    
    const key = `${sourceType}-${targetType}`
    return combinations[key] || ['references']
  }
  
  static validateStage(stage: any): ValidationResult {
    return FunctionModelNodeValidationRules.validateStage(stage)
  }
  
  static validateAction(action: any): ValidationResult {
    return FunctionModelNodeValidationRules.validateAction(action)
  }
  
  static validateDataPort(dataPort: any): ValidationResult {
    return FunctionModelNodeValidationRules.validateDataPort(dataPort)
  }
  
  static validateRACIMatrix(raci: any): ValidationResult {
    return FunctionModelNodeValidationRules.validateRACIMatrix(raci)
  }
  
  static validateExecutionType(executionType: string): ValidationResult {
    return FunctionModelNodeValidationRules.validateExecutionType(executionType)
  }
  
  static validateRetryPolicy(retryPolicy: any): ValidationResult {
    return FunctionModelNodeValidationRules.validateRetryPolicy(retryPolicy)
  }
} 