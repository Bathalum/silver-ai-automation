// Unified Node Operations
// This file contains domain services for unified node operations across all node types

import type { BaseNode } from '../entities/base-node-types'
import type { FunctionModelNode } from '../entities/function-model-node-types'
import type { CrossFeatureLink } from '../entities/cross-feature-link-types'
import type { NodeBehavior, ValidationResult, ExecutionResult, ExecutionContext } from '../entities/node-behavior-types'
import { NodeBehaviorFactory } from '../entities/node-behavior-types'
import { CrossFeatureLinkValidator } from './cross-feature-link-validator'
import { NodeValidationError, NodeNotFoundError, InvalidOperationError } from '../exceptions/domain-exceptions'

export interface UnifiedNodeOperations {
  // Universal node operations
  createNode<T extends BaseNode>(node: Omit<T, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<T>
  getNode<T extends BaseNode>(nodeId: string): Promise<T | null>
  updateNode<T extends BaseNode>(nodeId: string, updates: Partial<T>): Promise<T>
  deleteNode(nodeId: string): Promise<void>
  
  // Cross-node operations
  createNodeLink(sourceNodeId: string, targetNodeId: string, linkType: string, context?: Record<string, any>): Promise<CrossFeatureLink>
  deleteNodeLink(linkId: string): Promise<void>
  getNodeLinks(nodeId: string): Promise<CrossFeatureLink[]>
  
  // Node-specific operations
  executeNode(nodeId: string, context: ExecutionContext): Promise<ExecutionResult>
  validateNode(nodeId: string): Promise<ValidationResult>
  getNodeBehavior(nodeId: string): Promise<NodeBehavior>
  
  // Search and filtering
  searchNodes(query: string, filters?: Record<string, any>): Promise<BaseNode[]>
  getNodesByType(nodeType: string): Promise<BaseNode[]>
  getNodesByFeature(featureType: string): Promise<BaseNode[]>
}

export class UnifiedNodeOperationsImpl implements UnifiedNodeOperations {
  private nodeRepositories: Map<string, any> = new Map()
  private linkValidator = new CrossFeatureLinkValidator()

  constructor() {
    // Initialize repositories for different feature types
    this.initializeRepositories()
  }

  private initializeRepositories(): void {
    // Initialize repositories for different feature types
    // This would be injected via dependency injection in a real implementation
    // For now, we'll use a placeholder approach that can be extended
  }

  async createNode<T extends BaseNode>(node: Omit<T, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<T> {
    // Validate node before creation
    const validation = await this.validateNodeData(node)
    if (!validation.isValid) {
      throw new NodeValidationError(
        `Node validation failed: ${validation.errors.join(', ')}`,
        'new-node'
      )
    }

    // Delegate to appropriate repository based on feature type
    const repository = this.getRepositoryForFeature(node.featureType)
    return await repository.createNode(node)
  }

  async getNode<T extends BaseNode>(nodeId: string): Promise<T | null> {
    if (!nodeId?.trim()) {
      throw new InvalidOperationError('Node ID is required', 'getNode')
    }

    // Try to find the node across all repositories
    for (const [featureType, repository] of this.nodeRepositories) {
      const node = await repository.getNode(nodeId)
      if (node) {
        return node as T
      }
    }

    return null
  }

  async updateNode<T extends BaseNode>(nodeId: string, updates: Partial<T>): Promise<T> {
    const existingNode = await this.getNode(nodeId)
    if (!existingNode) {
      throw new NodeNotFoundError(`Node not found: ${nodeId}`, nodeId)
    }

    // Validate updates
    const validation = await this.validateNodeUpdates(existingNode, updates)
    if (!validation.isValid) {
      throw new NodeValidationError(
        `Update validation failed: ${validation.errors.join(', ')}`,
        nodeId
      )
    }

    // Delegate to appropriate repository
    const repository = this.getRepositoryForFeature(existingNode.featureType)
    return await repository.updateNode(nodeId, updates)
  }

  async deleteNode(nodeId: string): Promise<void> {
    const existingNode = await this.getNode(nodeId)
    if (!existingNode) {
      throw new NodeNotFoundError(`Node not found: ${nodeId}`, nodeId)
    }

    // Delete all links first
    const links = await this.getNodeLinks(nodeId)
    for (const link of links) {
      await this.deleteNodeLink(link.linkId)
    }

    // Delegate to appropriate repository
    const repository = this.getRepositoryForFeature(existingNode.featureType)
    await repository.deleteNode(nodeId)
  }

  async createNodeLink(
    sourceNodeId: string,
    targetNodeId: string,
    linkType: string,
    context?: Record<string, any>
  ): Promise<CrossFeatureLink> {
    // Validate both nodes exist
    const [sourceNode, targetNode] = await Promise.all([
      this.getNode(sourceNodeId),
      this.getNode(targetNodeId)
    ])

    if (!sourceNode) {
      throw new NodeNotFoundError(`Source node not found: ${sourceNodeId}`, sourceNodeId)
    }

    if (!targetNode) {
      throw new NodeNotFoundError(`Target node not found: ${targetNodeId}`, targetNodeId)
    }

    // Validate link creation
    const validation = CrossFeatureLinkValidator.validateLinkCreation(
      sourceNode.featureType,
      targetNode.featureType,
      linkType,
      sourceNode.nodeType,
      targetNode.nodeType
    )

    if (!validation.isValid) {
      throw new InvalidOperationError(
        `Link validation failed: ${validation.errors.join(', ')}`,
        'createNodeLink'
      )
    }

    // Create the link
    const link: CrossFeatureLink = {
      linkId: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceFeature: sourceNode.featureType,
      sourceEntityId: sourceNode.entityId,
      sourceNodeId: sourceNode.nodeId,
      targetFeature: targetNode.featureType,
      targetEntityId: targetNode.entityId,
      targetNodeId: targetNode.nodeId,
      linkType: linkType as any,
      linkStrength: 1.0,
      linkContext: context || {},
      visualProperties: {
        color: '#3b82f6',
        icon: '🔗',
        size: 'medium',
        style: {},
        featureSpecific: {}
      },
      createdBy: 'system', // This should come from user context
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Validate the complete link
    const linkValidation = CrossFeatureLinkValidator.validateLink(link)
    if (!linkValidation.isValid) {
      throw new InvalidOperationError(
        `Link validation failed: ${linkValidation.errors.join(', ')}`,
        'createNodeLink'
      )
    }

    // Store the link (this would typically be done through a repository)
    // For now, we'll return the link object
    return link
  }

  async deleteNodeLink(linkId: string): Promise<void> {
    if (!linkId?.trim()) {
      throw new InvalidOperationError('Link ID is required', 'deleteNodeLink')
    }

    // This would typically be done through a repository
    // For now, we'll just validate the link ID format
    if (!linkId.startsWith('link_')) {
      throw new InvalidOperationError('Invalid link ID format', 'deleteNodeLink')
    }
  }

  async getNodeLinks(nodeId: string): Promise<CrossFeatureLink[]> {
    if (!nodeId?.trim()) {
      throw new InvalidOperationError('Node ID is required', 'getNodeLinks')
    }

    // This would typically be done through a repository
    // For now, return empty array
    return []
  }

  async executeNode(nodeId: string, context: ExecutionContext): Promise<ExecutionResult> {
    const node = await this.getNode(nodeId)
    if (!node) {
      throw new NodeNotFoundError(`Node not found: ${nodeId}`, nodeId)
    }

    // Get node behavior
    const behavior = await this.getNodeBehavior(nodeId)
    
    // Execute the node
    return await behavior.execute(context)
  }

  async validateNode(nodeId: string): Promise<ValidationResult> {
    const node = await this.getNode(nodeId)
    if (!node) {
      throw new NodeNotFoundError(`Node not found: ${nodeId}`, nodeId)
    }

    // Get node behavior
    const behavior = await this.getNodeBehavior(nodeId)
    
    // Validate the node
    return await behavior.validate({
      nodeId,
      featureType: node.featureType,
      entityId: node.entityId,
      timestamp: new Date()
    })
  }

  async getNodeBehavior(nodeId: string): Promise<NodeBehavior> {
    const node = await this.getNode(nodeId)
    if (!node) {
      throw new NodeNotFoundError(`Node not found: ${nodeId}`, nodeId)
    }

    // Create behavior using factory
    return NodeBehaviorFactory.createBehavior(node)
  }

  async searchNodes(query: string, filters?: Record<string, any>): Promise<BaseNode[]> {
    if (!query?.trim()) {
      return []
    }

    // This would typically be done through repositories
    // For now, return empty array
    return []
  }

  async getNodesByType(nodeType: string): Promise<BaseNode[]> {
    if (!nodeType?.trim()) {
      return []
    }

    // This would typically be done through repositories
    // For now, return empty array
    return []
  }

  async getNodesByFeature(featureType: string): Promise<BaseNode[]> {
    if (!featureType?.trim()) {
      return []
    }

    // This would typically be done through repositories
    // For now, return empty array
    return []
  }

  private async validateNodeData(node: any): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Basic validation
    if (!node.name?.trim()) {
      errors.push('Node name is required')
    }

    if (!node.featureType) {
      errors.push('Feature type is required')
    }

    if (!node.nodeType) {
      errors.push('Node type is required')
    }

    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      errors.push('Valid position is required')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private async validateNodeUpdates(existingNode: BaseNode, updates: any): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate name updates
    if (updates.name !== undefined && !updates.name.trim()) {
      errors.push('Node name cannot be empty')
    }

    // Validate position updates
    if (updates.position !== undefined) {
      if (typeof updates.position.x !== 'number' || typeof updates.position.y !== 'number') {
        errors.push('Position must have valid x and y coordinates')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private getRepositoryForFeature(featureType: string): any {
    const repository = this.nodeRepositories.get(featureType)
    if (!repository) {
      throw new InvalidOperationError(`No repository found for feature type: ${featureType}`, 'getRepositoryForFeature')
    }
    return repository
  }
} 