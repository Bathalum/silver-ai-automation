// Link Validation Rules
// This file contains business rules for link validation

import type { CrossFeatureLink, LinkType } from '../entities/cross-feature-link-types'
import type { ValidationResult } from '../entities/node-behavior-types'
import { LinkValidationError } from '../exceptions/domain-exceptions'

export class LinkValidationRules {
  // Valid link type combinations for different node types
  private static readonly validLinkCombinations: Record<string, string[]> = {
    'references': ['stageNode', 'actionTableNode', 'ioNode', 'contentNode', 'eventNode', 'integrationNode'],
    'implements': ['actionTableNode', 'integrationNode'],
    'documents': ['contentNode', 'stageNode', 'actionTableNode'],
    'supports': ['stageNode', 'actionTableNode', 'ioNode', 'contentNode'],
    'nested': ['stageNode', 'actionTableNode', 'ioNode', 'contentNode', 'eventNode', 'integrationNode'],
    'triggers': ['eventNode', 'integrationNode', 'actionTableNode'],
    'consumes': ['ioNode', 'integrationNode', 'eventNode'],
    'produces': ['ioNode', 'integrationNode', 'eventNode']
  }

  // Valid feature type combinations for different link types
  private static readonly validFeatureCombinations: Record<string, string[]> = {
    'references': ['function-model', 'knowledge-base', 'event-storm', 'spindle'],
    'implements': ['function-model', 'spindle'],
    'documents': ['knowledge-base', 'function-model'],
    'supports': ['function-model', 'knowledge-base', 'event-storm', 'spindle'],
    'nested': ['function-model', 'knowledge-base', 'event-storm', 'spindle'],
    'triggers': ['event-storm', 'spindle', 'function-model'],
    'consumes': ['function-model', 'spindle', 'event-storm'],
    'produces': ['function-model', 'spindle', 'event-storm']
  }

  static validateLink(link: CrossFeatureLink): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Basic structure validation
    if (!link.linkId?.trim()) {
      errors.push('Link ID is required')
    }

    if (!link.sourceFeature || !link.targetFeature) {
      errors.push('Source and target features are required')
    }

    if (!link.sourceEntityId || !link.targetEntityId) {
      errors.push('Source and target entity IDs are required')
    }

    if (!link.linkType) {
      errors.push('Link type is required')
    }

    // Link type validation
    if (!this.isValidLinkType(link.linkType)) {
      errors.push(`Invalid link type: ${link.linkType}`)
    }

    // Link strength validation
    if (link.linkStrength < 0 || link.linkStrength > 1) {
      errors.push('Link strength must be between 0 and 1')
    }

    // Self-linking prevention
    if (link.sourceEntityId === link.targetEntityId && link.sourceNodeId === link.targetNodeId) {
      errors.push('Cannot link a node to itself')
    }

    // Feature type compatibility validation
    if (!this.isValidFeatureCombination(link.sourceFeature, link.targetFeature, link.linkType)) {
      errors.push(`Invalid link type '${link.linkType}' for features '${link.sourceFeature}' and '${link.targetFeature}'`)
    }

    // Node type compatibility validation (if node IDs are provided)
    if (link.sourceNodeId && link.targetNodeId) {
      const sourceNodeType = this.getNodeTypeFromId(link.sourceNodeId)
      const targetNodeType = this.getNodeTypeFromId(link.targetNodeId)
      
      if (!this.isValidNodeTypeCombination(sourceNodeType, targetNodeType, link.linkType)) {
        errors.push(`Invalid link type '${link.linkType}' for node types '${sourceNodeType}' and '${targetNodeType}'`)
      }
    }

    // Context validation
    if (link.linkContext && typeof link.linkContext !== 'object') {
      errors.push('Link context must be an object')
    }

    // Visual properties validation
    if (link.visualProperties) {
      const visualValidation = this.validateVisualProperties(link.visualProperties)
      errors.push(...visualValidation.errors)
      warnings.push(...visualValidation.warnings)
    }

    // Timestamp validation
    if (link.createdAt && !(link.createdAt instanceof Date)) {
      errors.push('Created at must be a valid date')
    }

    if (link.updatedAt && !(link.updatedAt instanceof Date)) {
      errors.push('Updated at must be a valid date')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        validationTimestamp: new Date(),
        linkId: link.linkId,
        linkType: link.linkType
      }
    }
  }

  static validateLinkCreation(
    sourceFeature: string,
    targetFeature: string,
    linkType: string,
    sourceNodeType?: string,
    targetNodeType?: string
  ): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Feature type validation
    if (!this.isValidFeatureType(sourceFeature)) {
      errors.push(`Invalid source feature type: ${sourceFeature}`)
    }

    if (!this.isValidFeatureType(targetFeature)) {
      errors.push(`Invalid target feature type: ${targetFeature}`)
    }

    // Link type validation
    if (!this.isValidLinkType(linkType)) {
      errors.push(`Invalid link type: ${linkType}`)
    }

    // Feature combination validation
    if (!this.isValidFeatureCombination(sourceFeature, targetFeature, linkType)) {
      errors.push(`Invalid link type '${linkType}' for features '${sourceFeature}' and '${targetFeature}'`)
    }

    // Node type combination validation (if provided)
    if (sourceNodeType && targetNodeType) {
      if (!this.isValidNodeTypeCombination(sourceNodeType, targetNodeType, linkType)) {
        errors.push(`Invalid link type '${linkType}' for node types '${sourceNodeType}' and '${targetNodeType}'`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        validationTimestamp: new Date(),
        sourceFeature,
        targetFeature,
        linkType
      }
    }
  }

  static validateLinkUpdate(
    currentLink: CrossFeatureLink,
    updates: Partial<CrossFeatureLink>
  ): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Create updated link for validation
    const updatedLink: CrossFeatureLink = {
      ...currentLink,
      ...updates,
      updatedAt: new Date()
    }

    // Validate the updated link
    const validation = this.validateLink(updatedLink)
    errors.push(...validation.errors)
    warnings.push(...validation.warnings)

    // Additional update-specific validations
    if (updates.linkType && updates.linkType !== currentLink.linkType) {
      warnings.push('Changing link type may affect existing relationships')
    }

    if (updates.linkStrength !== undefined && updates.linkStrength !== currentLink.linkStrength) {
      warnings.push('Changing link strength may affect relationship analysis')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static getValidLinkCombinations(): Record<string, string[]> {
    return { ...this.validLinkCombinations }
  }

  static getValidFeatureCombinations(): Record<string, string[]> {
    return { ...this.validFeatureCombinations }
  }

  static isValidLinkType(linkType: string): boolean {
    return ['references', 'implements', 'documents', 'supports', 'nested', 'triggers', 'consumes', 'produces'].includes(linkType)
  }

  static isValidFeatureType(featureType: string): boolean {
    return ['function-model', 'knowledge-base', 'event-storm', 'spindle'].includes(featureType)
  }

  static isValidNodeTypeCombination(sourceType: string, targetType: string, linkType: string): boolean {
    const validTypes = this.validLinkCombinations[linkType] || []
    return validTypes.includes(sourceType) && validTypes.includes(targetType)
  }

  static isValidFeatureCombination(sourceFeature: string, targetFeature: string, linkType: string): boolean {
    const sourceValidTypes = this.validFeatureCombinations[linkType] || []
    const targetValidTypes = this.validFeatureCombinations[linkType] || []
    
    return sourceValidTypes.includes(sourceFeature) && targetValidTypes.includes(targetFeature)
  }

  private static getNodeTypeFromId(nodeId: string): string {
    // This would typically be implemented to extract node type from node ID
    // For now, return a default type
    return 'stageNode'
  }

  private static validateVisualProperties(visualProperties: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (visualProperties.color && !this.isValidColor(visualProperties.color)) {
      errors.push('Invalid color format')
    }

    if (visualProperties.size && !['small', 'medium', 'large'].includes(visualProperties.size)) {
      errors.push('Invalid size value')
    }

    if (visualProperties.icon && typeof visualProperties.icon !== 'string') {
      errors.push('Icon must be a string')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private static isValidColor(color: string): boolean {
    // Basic color validation - could be enhanced
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color) || 
           /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(color) ||
           /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/.test(color)
  }

  static getLinkTypeDescription(linkType: string): string {
    const descriptions: Record<string, string> = {
      'references': 'One node references another for information',
      'implements': 'One node implements the functionality of another',
      'documents': 'One node documents the details of another',
      'supports': 'One node provides support for another',
      'nested': 'One node is nested within another',
      'triggers': 'One node triggers an action in another',
      'consumes': 'One node consumes data from another',
      'produces': 'One node produces data for another'
    }

    return descriptions[linkType] || 'Unknown link type'
  }

  static getLinkStrengthDescription(strength: number): string {
    if (strength >= 0.8) return 'Very Strong'
    if (strength >= 0.6) return 'Strong'
    if (strength >= 0.4) return 'Moderate'
    if (strength >= 0.2) return 'Weak'
    return 'Very Weak'
  }

  static getLinkRecommendations(): Record<string, string[]> {
    return {
      'references': [
        'Use for informational relationships',
        'Good for documentation links',
        'Suitable for cross-references'
      ],
      'implements': [
        'Use for functional dependencies',
        'Good for API implementations',
        'Suitable for interface compliance'
      ],
      'documents': [
        'Use for documentation relationships',
        'Good for SOP references',
        'Suitable for knowledge base links'
      ],
      'supports': [
        'Use for supporting relationships',
        'Good for infrastructure dependencies',
        'Suitable for service dependencies'
      ],
      'nested': [
        'Use for hierarchical relationships',
        'Good for container relationships',
        'Suitable for parent-child relationships'
      ],
      'triggers': [
        'Use for event-driven relationships',
        'Good for workflow triggers',
        'Suitable for automation triggers'
      ],
      'consumes': [
        'Use for data consumption relationships',
        'Good for API consumption',
        'Suitable for data flow relationships'
      ],
      'produces': [
        'Use for data production relationships',
        'Good for API outputs',
        'Suitable for data generation relationships'
      ]
    }
  }
} 