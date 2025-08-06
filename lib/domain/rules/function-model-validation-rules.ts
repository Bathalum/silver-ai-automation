// Function Model Validation Rules
// This file contains business rules for function model validation

import type { FunctionModelNode } from '../entities/function-model-node-types'
import type { ValidationResult } from '../entities/node-behavior-types'
import { FunctionModelNodeValidationError } from '../exceptions/domain-exceptions'

export class FunctionModelNodeValidationRules {
  static validateNode(node: FunctionModelNode): ValidationResult {
    const errors: string[] = []
    
    // Name validation
    if (!node.name.trim()) {
      errors.push('Node must have a name')
    }
    
    if (node.name.length > 255) {
      errors.push('Node name cannot exceed 255 characters')
    }
    
    // Position validation
    if (node.position.x < 0 || node.position.y < 0) {
      errors.push('Node position must be non-negative')
    }
    
    // Status validation
    if (!['active', 'inactive', 'draft', 'archived', 'error'].includes(node.status)) {
      errors.push('Invalid node status')
    }
    
    // Metadata validation
    if (node.metadata.tags && node.metadata.tags.length > 50) {
      errors.push('Node cannot have more than 50 tags')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  static validateFunctionModelNode(node: FunctionModelNode): ValidationResult {
    const baseValidation = this.validateNode(node)
    if (!baseValidation.isValid) {
      return baseValidation
    }
    
    const errors: string[] = []
    
    // Function model specific validation
    if (node.processBehavior.timeout && node.processBehavior.timeout < 0) {
      errors.push('Timeout must be non-negative')
    }
    
    if (node.processBehavior.dependencies.length > 100) {
      errors.push('Node cannot have more than 100 dependencies')
    }
    
    // Stage validation
    if (node.functionModelData.stage) {
      const stageValidation = this.validateStage(node.functionModelData.stage)
      errors.push(...stageValidation.errors)
    }
    
    // Action validation
    if (node.functionModelData.action) {
      const actionValidation = this.validateAction(node.functionModelData.action)
      errors.push(...actionValidation.errors)
    }
    
    // IO validation
    if (node.functionModelData.io) {
      const ioValidation = this.validateDataPort(node.functionModelData.io)
      errors.push(...ioValidation.errors)
    }
    
    // RACI validation
    if (node.businessLogic.raciMatrix) {
      const raciValidation = this.validateRACIMatrix(node.businessLogic.raciMatrix)
      errors.push(...raciValidation.errors)
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  static validateStage(stage: any): ValidationResult {
    const errors: string[] = []
    
    if (!stage.id?.trim()) {
      errors.push('Stage ID is required')
    }
    
    if (!stage.name?.trim()) {
      errors.push('Stage name is required')
    }
    
    if (stage.name && stage.name.length > 255) {
      errors.push('Stage name cannot exceed 255 characters')
    }
    
    if (stage.position && (stage.position.x < 0 || stage.position.y < 0)) {
      errors.push('Stage position must be non-negative')
    }
    
    if (stage.actions && stage.actions.length > 100) {
      errors.push('Stage cannot have more than 100 actions')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  static validateAction(action: any): ValidationResult {
    const errors: string[] = []
    
    if (!action.id?.trim()) {
      errors.push('Action ID is required')
    }
    
    if (!action.name?.trim()) {
      errors.push('Action name is required')
    }
    
    if (action.name && action.name.length > 255) {
      errors.push('Action name cannot exceed 255 characters')
    }
    
    if (!action.responsible?.trim()) {
      errors.push('Responsible person is required')
    }
    
    if (!action.accountable?.trim()) {
      errors.push('Accountable person is required')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  static validateDataPort(dataPort: any): ValidationResult {
    const errors: string[] = []
    
    if (!dataPort.id?.trim()) {
      errors.push('Data port ID is required')
    }
    
    if (!dataPort.name?.trim()) {
      errors.push('Data port name is required')
    }
    
    if (dataPort.name && dataPort.name.length > 255) {
      errors.push('Data port name cannot exceed 255 characters')
    }
    
    if (!dataPort.dataFormat?.trim()) {
      errors.push('Data format is required')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  static validateRACIMatrix(raci: any): ValidationResult {
    const errors: string[] = []
    
    if ((!raci.responsible || raci.responsible.length === 0) && 
        (!raci.accountable || raci.accountable.length === 0)) {
      errors.push('At least one responsible or accountable person is required')
    }
    
    if (raci.responsible && raci.responsible.length > 50) {
      errors.push('Cannot have more than 50 responsible persons')
    }
    
    if (raci.accountable && raci.accountable.length > 50) {
      errors.push('Cannot have more than 50 accountable persons')
    }
    
    if (raci.consulted && raci.consulted.length > 100) {
      errors.push('Cannot have more than 100 consulted persons')
    }
    
    if (raci.informed && raci.informed.length > 100) {
      errors.push('Cannot have more than 100 informed persons')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  static validateExecutionType(executionType: string): ValidationResult {
    const errors: string[] = []
    
    if (!['sequential', 'parallel', 'conditional'].includes(executionType)) {
      errors.push('Invalid execution type')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  static validateRetryPolicy(retryPolicy: any): ValidationResult {
    const errors: string[] = []
    
    if (retryPolicy.maxRetries < 0) {
      errors.push('Max retries must be non-negative')
    }
    
    if (retryPolicy.maxRetries > 10) {
      errors.push('Max retries cannot exceed 10')
    }
    
    if (retryPolicy.initialDelay < 0) {
      errors.push('Initial delay must be non-negative')
    }
    
    if (retryPolicy.maxDelay < 0) {
      errors.push('Max delay must be non-negative')
    }
    
    if (retryPolicy.initialDelay > retryPolicy.maxDelay) {
      errors.push('Initial delay cannot be greater than max delay')
    }
    
    if (!['linear', 'exponential', 'constant'].includes(retryPolicy.backoff)) {
      errors.push('Invalid backoff type')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
} 