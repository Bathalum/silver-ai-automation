// Cross-Feature Link Validator
// This file contains domain services for validating cross-feature links

import type { CrossFeatureLink, LinkType } from '../entities/cross-feature-link-types'
import type { ValidationResult } from '../entities/node-behavior-types'
import { CrossFeatureLinkError } from '../exceptions/domain-exceptions'

export class CrossFeatureLinkValidator {
  // Valid link type combinations for different node types
  private static readonly validLinkCombinations: Record<string, string[]> = {
    'function-model': ['references', 'implements', 'documents', 'supports', 'nested', 'triggers', 'consumes', 'produces'],
    'knowledge-base': ['references', 'documents', 'supports', 'nested'],
    'event-storm': ['triggers', 'consumes', 'produces', 'references', 'nested'],
    'spindle': ['implements', 'triggers', 'consumes', 'produces', 'supports', 'nested']
  }

  // Valid node type combinations for different link types
  private static readonly validNodeTypeCombinations: Record<string, string[]> = {
    'references': ['stageNode', 'actionTableNode', 'ioNode', 'contentNode', 'eventNode', 'integrationNode'],
    'implements': ['actionTableNode', 'integrationNode'],
    'documents': ['contentNode', 'stageNode', 'actionTableNode'],
    'supports': ['stageNode', 'actionTableNode', 'ioNode', 'contentNode'],
    'nested': ['stageNode', 'actionTableNode', 'ioNode', 'contentNode', 'eventNode', 'integrationNode'],
    'triggers': ['eventNode', 'integrationNode', 'actionTableNode'],
    'consumes': ['ioNode', 'integrationNode', 'eventNode'],
    'produces': ['ioNode', 'integrationNode', 'eventNode']
  }

  static validateLink(link: CrossFeatureLink): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate link structure
    if (!link.linkId?.trim()) {
      errors.push('Link ID is required')
    }

    if (!link.sourceFeature || !link.targetFeature) {
      errors.push('Source and target features are required')
    }

    if (!link.sourceEntityId || !link.targetEntityId) {
      errors.push('Source and target entity IDs are required')
    }

    // Validate link type
    if (!this.isValidLinkType(link.linkType)) {
      errors.push(`Invalid link type: ${link.linkType}`)
    }

    // Validate link strength
    if (link.linkStrength < 0 || link.linkStrength > 1) {
      errors.push('Link strength must be between 0 and 1')
    }

    // Validate self-linking
    if (link.sourceEntityId === link.targetEntityId && link.sourceNodeId === link.targetNodeId) {
      errors.push('Cannot link a node to itself')
    }

    // Validate link type compatibility with node types
    if (link.sourceNodeId && link.targetNodeId) {
      const sourceNodeType = this.getNodeTypeFromId(link.sourceNodeId)
      const targetNodeType = this.getNodeTypeFromId(link.targetNodeId)
      
      if (!this.isValidNodeTypeCombination(sourceNodeType, targetNodeType, link.linkType)) {
        errors.push(`Invalid link type '${link.linkType}' for node types '${sourceNodeType}' and '${targetNodeType}'`)
      }
    }

    // Validate feature type compatibility
    if (!this.isValidFeatureTypeCombination(link.sourceFeature, link.targetFeature, link.linkType)) {
      errors.push(`Invalid link type '${link.linkType}' for features '${link.sourceFeature}' and '${link.targetFeature}'`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        validationTimestamp: new Date(),
        linkId: link.linkId
      }
    }
  }

  static getValidLinkCombinations(): Record<string, string[]> {
    return { ...this.validLinkCombinations }
  }

  static getValidNodeTypeCombinations(): Record<string, string[]> {
    return { ...this.validNodeTypeCombinations }
  }

  static isValidLinkType(linkType: string): boolean {
    return ['references', 'implements', 'documents', 'supports', 'nested', 'triggers', 'consumes', 'produces'].includes(linkType)
  }

  static isValidNodeTypeCombination(sourceType: string, targetType: string, linkType: string): boolean {
    const validTypes = this.validNodeTypeCombinations[linkType] || []
    return validTypes.includes(sourceType) && validTypes.includes(targetType)
  }

  static isValidFeatureTypeCombination(sourceFeature: string, targetFeature: string, linkType: string): boolean {
    const sourceValidTypes = this.validLinkCombinations[sourceFeature] || []
    const targetValidTypes = this.validLinkCombinations[targetFeature] || []
    
    return sourceValidTypes.includes(linkType) && targetValidTypes.includes(linkType)
  }

  private static getNodeTypeFromId(nodeId: string): string {
    // This would typically be implemented to extract node type from node ID
    // For now, return a default type based on common patterns
    if (nodeId.includes('stage')) return 'stageNode'
    if (nodeId.includes('action')) return 'actionTableNode'
    if (nodeId.includes('io')) return 'ioNode'
    if (nodeId.includes('container')) return 'functionModelContainer'
    return 'stageNode' // Default fallback
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

    // Validate feature types
    if (!this.validLinkCombinations[sourceFeature]) {
      errors.push(`Invalid source feature type: ${sourceFeature}`)
    }

    if (!this.validLinkCombinations[targetFeature]) {
      errors.push(`Invalid target feature type: ${targetFeature}`)
    }

    // Validate link type
    if (!this.isValidLinkType(linkType)) {
      errors.push(`Invalid link type: ${linkType}`)
    }

    // Validate node type combinations if provided
    if (sourceNodeType && targetNodeType) {
      if (!this.isValidNodeTypeCombination(sourceNodeType, targetNodeType, linkType)) {
        errors.push(`Invalid link type '${linkType}' for node types '${sourceNodeType}' and '${targetNodeType}'`)
      }
    }

    // Validate feature type combination
    if (!this.isValidFeatureTypeCombination(sourceFeature, targetFeature, linkType)) {
      errors.push(`Invalid link type '${linkType}' for features '${sourceFeature}' and '${targetFeature}'`)
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
} 