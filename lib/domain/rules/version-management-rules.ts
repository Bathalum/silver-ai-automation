// Version Management Rules - Domain Layer
// This file contains business logic for version number calculation and management
// Following Clean Architecture principles with no infrastructure dependencies

import { SaveOperation } from '../services/function-model-save-service'

export interface VersionCalculationResult {
  newVersion: string
  versionType: 'patch' | 'minor' | 'major'
  reason: string
  isCompatible: boolean
}

export interface VersionCompatibilityResult {
  isCompatible: boolean
  compatibilityLevel: 'full' | 'partial' | 'none'
  breakingChanges: string[]
  migrationRequired: boolean
}

export class VersionManagementRules {
  /**
   * Calculates the next version number based on business rules
   */
  calculateNextVersion(
    currentVersion: string,
    operation: SaveOperation,
    existingVersions: string[]
  ): VersionCalculationResult {
    // Parse current version
    const versionParts = this.parseVersion(currentVersion)
    if (!versionParts) {
      return {
        newVersion: '1.0.0',
        versionType: 'major',
        reason: 'Invalid current version, starting fresh',
        isCompatible: false
      }
    }

    // Determine version increment based on operation type and changes
    const versionType = this.determineVersionIncrement(operation, versionParts)
    
    // Calculate new version
    const newVersionParts = { ...versionParts }
    switch (versionType) {
      case 'major':
        newVersionParts.major++
        newVersionParts.minor = 0
        newVersionParts.patch = 0
        break
      case 'minor':
        newVersionParts.minor++
        newVersionParts.patch = 0
        break
      case 'patch':
        newVersionParts.patch++
        break
    }

    const newVersion = `${newVersionParts.major}.${newVersionParts.minor}.${newVersionParts.patch}`
    
    // Check if version already exists
    if (existingVersions.includes(newVersion)) {
      // Increment patch version if version already exists
      newVersionParts.patch++
      const adjustedVersion = `${newVersionParts.major}.${newVersionParts.minor}.${newVersionParts.patch}`
      return {
        newVersion: adjustedVersion,
        versionType: 'patch',
        reason: `Version ${newVersion} already exists, using ${adjustedVersion}`,
        isCompatible: true
      }
    }

    return {
      newVersion,
      versionType,
      reason: this.getVersionIncrementReason(versionType, operation),
      isCompatible: versionType === 'patch' || versionType === 'minor'
    }
  }

  /**
   * Validates version compatibility and business constraints
   */
  validateVersionCompatibility(
    newVersion: string,
    currentVersion: string,
    operation: SaveOperation
  ): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    recommendations: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // Validate version format
    if (!this.isValidVersionFormat(newVersion)) {
      errors.push(`Invalid version format: ${newVersion}`)
      return { isValid: false, errors, warnings, recommendations }
    }

    // Parse versions
    const newVersionParts = this.parseVersion(newVersion)
    const currentVersionParts = this.parseVersion(currentVersion)

    if (!newVersionParts || !currentVersionParts) {
      errors.push('Unable to parse version numbers')
      return { isValid: false, errors, warnings, recommendations }
    }

    // Check for version downgrade
    if (this.compareVersions(newVersionParts, currentVersionParts) < 0) {
      errors.push('Cannot downgrade version number')
    }

    // Check for major version changes
    if (newVersionParts.major > currentVersionParts.major) {
      warnings.push('Major version change detected - this may break compatibility')
      recommendations.push('Consider documenting breaking changes')
    }

    // Check for rapid version increments
    const timeSinceLastSave = Date.now() - operation.metadata.timestamp.getTime()
    const hoursSinceLastSave = timeSinceLastSave / (1000 * 60 * 60)
    
    if (hoursSinceLastSave < 1 && newVersionParts.patch > currentVersionParts.patch + 5) {
      warnings.push('Rapid version increments detected - consider batching changes')
    }

    // Validate business constraints
    const businessValidation = this.validateBusinessConstraints(newVersion, currentVersion, operation)
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
   * Determines the type of version increment based on operation and changes
   */
  private determineVersionIncrement(operation: SaveOperation, currentVersion: any): 'major' | 'minor' | 'patch' {
    // Major version for breaking changes or new features
    if (operation.type === 'create') {
      return 'major'
    }

    // Check for breaking changes
    if (this.hasBreakingChanges(operation)) {
      return 'major'
    }

    // Check for new features
    if (this.hasNewFeatures(operation)) {
      return 'minor'
    }

    // Default to patch for regular updates
    return 'patch'
  }

  /**
   * Checks if the operation contains breaking changes
   */
  private hasBreakingChanges(operation: SaveOperation): boolean {
    // Check for node type changes
    const hasNodeTypeChanges = operation.nodes.some(node => {
      // This would need to compare with previous state
      // For now, we'll use a simple heuristic
      return false
    })

    // Check for structural changes
    const hasStructuralChanges = operation.nodes.length > 50 || operation.edges.length > 100

    // Check for metadata changes that might affect compatibility
    const hasMetadataChanges = operation.nodes.some(node => {
      return node.metadata?.tags?.length > 10 || 
             node.businessLogic?.kpis?.length > 15
    })

    return hasNodeTypeChanges || hasStructuralChanges || hasMetadataChanges
  }

  /**
   * Checks if the operation contains new features
   */
  private hasNewFeatures(operation: SaveOperation): boolean {
    // Check for new node types
    const nodeTypes = new Set(operation.nodes.map(n => n.nodeType))
    const hasNewNodeTypes = nodeTypes.size > 3

    // Check for new business logic
    const hasNewBusinessLogic = operation.nodes.some(node => {
      return node.businessLogic?.raciMatrix || 
             node.businessLogic?.sla || 
             node.businessLogic?.kpis?.length > 0
    })

    // Check for new metadata
    const hasNewMetadata = operation.nodes.some(node => {
      return node.metadata?.tags?.length > 0 || 
             node.metadata?.searchKeywords?.length > 0
    })

    return hasNewNodeTypes || hasNewBusinessLogic || hasNewMetadata
  }

  /**
   * Gets the reason for version increment
   */
  private getVersionIncrementReason(versionType: 'major' | 'minor' | 'patch', operation: SaveOperation): string {
    switch (versionType) {
      case 'major':
        return 'Breaking changes or major new features'
      case 'minor':
        return 'New features or significant improvements'
      case 'patch':
        return 'Bug fixes and minor improvements'
      default:
        return 'Version update'
    }
  }

  /**
   * Parses a version string into components
   */
  private parseVersion(version: string): { major: number; minor: number; patch: number } | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/)
    if (!match) {
      return null
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10)
    }
  }

  /**
   * Validates version format
   */
  private isValidVersionFormat(version: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(version)
  }

  /**
   * Compares two version objects
   */
  private compareVersions(v1: any, v2: any): number {
    if (v1.major !== v2.major) {
      return v1.major - v2.major
    }
    if (v1.minor !== v2.minor) {
      return v1.minor - v2.minor
    }
    return v1.patch - v2.patch
  }

  /**
   * Validates business constraints for versioning
   */
  private validateBusinessConstraints(
    newVersion: string,
    currentVersion: string,
    operation: SaveOperation
  ): {
    errors: string[]
    warnings: string[]
    recommendations: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // Check for version number limits
    const newVersionParts = this.parseVersion(newVersion)
    if (newVersionParts) {
      if (newVersionParts.major > 999) {
        errors.push('Major version number exceeds limit')
      }
      if (newVersionParts.minor > 999) {
        errors.push('Minor version number exceeds limit')
      }
      if (newVersionParts.patch > 999) {
        errors.push('Patch version number exceeds limit')
      }
    }

    // Check for version frequency
    const timeSinceLastSave = Date.now() - operation.metadata.timestamp.getTime()
    const minutesSinceLastSave = timeSinceLastSave / (1000 * 60)
    
    if (minutesSinceLastSave < 5) {
      warnings.push('Frequent version updates detected')
      recommendations.push('Consider batching changes to reduce version frequency')
    }

    // Check for version naming conventions
    if (!operation.metadata.changeSummary) {
      warnings.push('No change summary provided for version')
      recommendations.push('Provide a meaningful change summary')
    }

    return { errors, warnings, recommendations }
  }

  /**
   * Determines if a version change requires migration
   */
  requiresMigration(newVersion: string, currentVersion: string): boolean {
    const newParts = this.parseVersion(newVersion)
    const currentParts = this.parseVersion(currentVersion)

    if (!newParts || !currentParts) {
      return false
    }

    // Major version changes typically require migration
    if (newParts.major > currentParts.major) {
      return true
    }

    // Minor version changes might require migration
    if (newParts.major === currentParts.major && newParts.minor > currentParts.minor) {
      return newParts.minor - currentParts.minor > 5
    }

    return false
  }

  /**
   * Calculates version compatibility level
   */
  calculateCompatibilityLevel(newVersion: string, currentVersion: string): 'full' | 'partial' | 'none' {
    const newParts = this.parseVersion(newVersion)
    const currentParts = this.parseVersion(currentVersion)

    if (!newParts || !currentParts) {
      return 'none'
    }

    // Same major version = full compatibility
    if (newParts.major === currentParts.major) {
      return 'full'
    }

    // Major version change = no compatibility
    if (newParts.major > currentParts.major) {
      return 'none'
    }

    // Downgrade = partial compatibility
    return 'partial'
  }

  /**
   * Generates version metadata for audit purposes
   */
  generateVersionMetadata(
    newVersion: string,
    currentVersion: string,
    operation: SaveOperation
  ): {
    versionId: string
    timestamp: Date
    metadata: Record<string, any>
  } {
    const versionId = `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const timestamp = new Date()

    const newParts = this.parseVersion(newVersion)
    const currentParts = this.parseVersion(currentVersion)

    return {
      versionId,
      timestamp,
      metadata: {
        newVersion,
        currentVersion,
        versionType: newParts && currentParts ? this.determineVersionIncrement(operation, currentParts) : 'unknown',
        nodeCount: operation.nodes.length,
        edgeCount: operation.edges.length,
        author: operation.metadata.author,
        changeSummary: operation.metadata.changeSummary,
        isPublished: operation.metadata.isPublished,
        compatibilityLevel: newParts && currentParts ? this.calculateCompatibilityLevel(newVersion, currentVersion) : 'unknown'
      }
    }
  }
}
