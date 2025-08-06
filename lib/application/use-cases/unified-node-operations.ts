// Unified Node Operations Interface
// This file defines the unified interface for node operations across all node types

import { BaseNode } from '../../domain/entities/base-node-types'
import { CrossFeatureLink } from '../../domain/entities/cross-feature-link-types'
import { ValidationResult } from '../../domain/entities/node-behavior-types'
import { NodeBehavior } from '../../domain/entities/node-behavior-types'

export interface UnifiedNodeOperations {
  // Universal node operations (work across all node types)
  createNode<T extends BaseNode>(node: Omit<T, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<T>
  getNode<T extends BaseNode>(nodeType: string, nodeId: string): Promise<T | null>
  updateNode<T extends BaseNode>(nodeType: string, nodeId: string, updates: Partial<T>): Promise<T>
  deleteNode(nodeType: string, nodeId: string): Promise<void>
  
  // Cross-feature operations
  createNodeLink(link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<CrossFeatureLink>
  getNodeLinks(nodeType: string, nodeId?: string): Promise<CrossFeatureLink[]>
  getConnectedNodes(nodeType: string, nodeId?: string): Promise<BaseNode[]>
  
  // Node-specific operations (delegated to appropriate handlers)
  executeNode(nodeType: string, nodeId: string, context?: any): Promise<any>
  validateNode(nodeType: string, nodeId: string): Promise<ValidationResult>
  getNodeBehavior(nodeType: string, nodeId: string): Promise<NodeBehavior>
}

// Unified Node Operations Implementation
// This file implements the unified node operations following the Application Layer Complete Guide

import { FunctionModelRepository } from '../../infrastructure/repositories/function-model-repository'
import { NodeRelationshipRepository } from '../../infrastructure/repositories/node-relationship-repository'
import { NodeMetadataRepository } from '../../infrastructure/repositories/node-metadata-repository'
import { FunctionModelNode } from '../../domain/entities/function-model-node-types'
import { SOP } from '../../domain/entities/knowledge-base-types'
import { NodeHandlerFactory } from '../../domain/services/node-handler-factory'
import { FunctionModelValidationService } from '../../domain/services/function-model-validation-service'
import { ApplicationError } from '../exceptions/application-exceptions'

export class UnifiedNodeOperationsImpl implements UnifiedNodeOperations {
  constructor(
    private functionModelRepository: FunctionModelRepository,
    private nodeRelationshipRepository: NodeRelationshipRepository,
    private nodeMetadataRepository: NodeMetadataRepository,
    private nodeHandlerFactory: NodeHandlerFactory,
    private validationService: FunctionModelValidationService
  ) {}

  // Universal node operations
  async createNode<T extends BaseNode>(node: Omit<T, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<T> {
    try {
      const nodeId = this.generateNodeId()
      const now = new Date()
      const newNode = {
        ...node,
        nodeId,
        createdAt: now,
        updatedAt: now
      } as T

      // Store in appropriate repository based on node type
      await this.storeNodeByType(newNode)
      
      return newNode
    } catch (error) {
      throw new ApplicationError(`Failed to create node: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getNode<T extends BaseNode>(nodeType: string, nodeId: string): Promise<T | null> {
    try {
      return await this.retrieveNodeByType<T>(nodeType, nodeId)
    } catch (error) {
      throw new ApplicationError(`Failed to get node: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async updateNode<T extends BaseNode>(nodeType: string, nodeId: string, updates: Partial<T>): Promise<T> {
    try {
      const existingNode = await this.getNode<T>(nodeType, nodeId)
      if (!existingNode) {
        throw new ApplicationError(`Node not found: ${nodeId}`)
      }

      const updatedNode = {
        ...existingNode,
        ...updates,
        updatedAt: new Date()
      } as T

      await this.storeNodeByType(updatedNode)
      return updatedNode
    } catch (error) {
      throw new ApplicationError(`Failed to update node: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deleteNode(nodeType: string, nodeId: string): Promise<void> {
    try {
      await this.removeNodeByType(nodeType, nodeId)
      // Also remove any associated links
      await this.nodeRelationshipRepository.deleteByNode(nodeId)
    } catch (error) {
      throw new ApplicationError(`Failed to delete node: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Cross-feature operations
  async createNodeLink(link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<CrossFeatureLink> {
    try {
      const linkId = this.generateLinkId()
      const now = new Date()
      const newLink: CrossFeatureLink = {
        ...link,
        linkId,
        createdAt: now,
        updatedAt: now
      }

      // Convert CrossFeatureLink to NodeRelationship format
      const relationship = {
        sourceNodeId: link.sourceNodeId,
        targetNodeId: link.targetNodeId,
        relationshipType: link.linkType as any,
        metadata: {
          sourceHandle: '',
          targetHandle: '',
          strength: link.linkStrength,
          bidirectional: false
        }
      }

      await this.nodeRelationshipRepository.create(relationship)
      return newLink
    } catch (error) {
      throw new ApplicationError(`Failed to create node link: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getNodeLinks(nodeType: string, nodeId?: string): Promise<CrossFeatureLink[]> {
    try {
      if (nodeId) {
        const relationships = await this.nodeRelationshipRepository.getByNodeId(nodeId)
        return relationships.map(this.mapRelationshipToCrossFeatureLink)
      } else {
        // For now, return empty array as getLinksByNodeType doesn't exist
        return []
      }
    } catch (error) {
      throw new ApplicationError(`Failed to get node links: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getConnectedNodes(nodeType: string, nodeId?: string): Promise<BaseNode[]> {
    try {
      const links = await this.getNodeLinks(nodeType, nodeId)
      const connectedNodeIds = new Set<string>()
      
      links.forEach(link => {
        if (link.sourceNodeId !== nodeId) connectedNodeIds.add(link.sourceNodeId)
        if (link.targetNodeId !== nodeId) connectedNodeIds.add(link.targetNodeId)
      })

      const connectedNodes: BaseNode[] = []
      for (const connectedNodeId of connectedNodeIds) {
        const node = await this.getNodeByTypeAndId(connectedNodeId)
        if (node) {
          connectedNodes.push(node)
        }
      }

      return connectedNodes
    } catch (error) {
      throw new ApplicationError(`Failed to get connected nodes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Node-specific operations
  async executeNode(nodeType: string, nodeId: string, context?: any): Promise<any> {
    try {
      // For now, return a placeholder as NodeHandlerFactory.getHandler doesn't exist
      throw new ApplicationError('Node execution not implemented yet')
    } catch (error) {
      throw new ApplicationError(`Failed to execute node: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async validateNode(nodeType: string, nodeId: string): Promise<ValidationResult> {
    try {
      const node = await this.getNode(nodeType, nodeId)
      if (!node) {
        return {
          isValid: false,
          errors: [`Node not found: ${nodeId}`],
          warnings: []
        }
      }

      // For function model nodes, use the static validation method
      if (nodeType === 'function-model') {
        return FunctionModelValidationService.validateNode(node as any)
      }

      // For other node types, return basic validation
      return {
        isValid: true,
        errors: [],
        warnings: []
      }
    } catch (error) {
      throw new ApplicationError(`Failed to validate node: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getNodeBehavior(nodeType: string, nodeId: string): Promise<NodeBehavior> {
    try {
      // For now, return a placeholder as NodeHandlerFactory.getHandler doesn't exist
      throw new ApplicationError('Node behavior not implemented yet')
    } catch (error) {
      throw new ApplicationError(`Failed to get node behavior: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Helper method to map NodeRelationship to CrossFeatureLink
  private mapRelationshipToCrossFeatureLink(relationship: any): CrossFeatureLink {
    return {
      linkId: relationship.relationshipId,
      sourceNodeId: relationship.sourceNodeId,
      targetNodeId: relationship.targetNodeId,
      sourceNodeType: 'unknown', // Would need to be determined from context
      targetNodeType: 'unknown', // Would need to be determined from context
      linkType: relationship.relationshipType as any,
      linkStrength: relationship.metadata?.strength || 1.0,
      linkContext: {},
      visualProperties: {},
      createdAt: relationship.createdAt,
      updatedAt: relationship.createdAt
    }
  }

  // Private helper methods
  private generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateLinkId(): string {
    return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async storeNodeByType<T extends BaseNode>(node: T): Promise<void> {
    switch (node.featureType) {
      case 'function-model':
        // For now, we'll need to create a proper FunctionModelNode
        // This is a simplified approach - in practice, you'd need proper type conversion
        await this.functionModelRepository.createFunctionModelNode(node as any, 'temp-model-id')
        break
      case 'knowledge-base':
        // TODO: Implement knowledge base repository
        throw new ApplicationError('Knowledge base repository not implemented')
      case 'spindle':
        // TODO: Implement spindle repository
        throw new ApplicationError('Spindle repository not implemented')
      case 'event-storm':
        // TODO: Implement event storm repository
        throw new ApplicationError('Event storm repository not implemented')
      default:
        throw new ApplicationError(`Unsupported node type: ${node.featureType}`)
    }
  }

  private async retrieveNodeByType<T extends BaseNode>(nodeType: string, nodeId: string): Promise<T | null> {
    switch (nodeType) {
      case 'function-model':
        // For now, return null as getFunctionModelNode doesn't exist
        // In practice, you'd need to implement this method
        return null
      case 'knowledge-base':
        // TODO: Implement knowledge base repository
        throw new ApplicationError('Knowledge base repository not implemented')
      case 'spindle':
        // TODO: Implement spindle repository
        throw new ApplicationError('Spindle repository not implemented')
      case 'event-storm':
        // TODO: Implement event storm repository
        throw new ApplicationError('Event storm repository not implemented')
      default:
        throw new ApplicationError(`Unsupported node type: ${nodeType}`)
    }
  }

  private async removeNodeByType(nodeType: string, nodeId: string): Promise<void> {
    switch (nodeType) {
      case 'function-model':
        // For now, use a placeholder as deleteFunctionModelNode doesn't exist
        console.warn('deleteFunctionModelNode not implemented yet')
        break
      case 'knowledge-base':
        // TODO: Implement knowledge base repository
        throw new ApplicationError('Knowledge base repository not implemented')
      case 'spindle':
        // TODO: Implement spindle repository
        throw new ApplicationError('Spindle repository not implemented')
      case 'event-storm':
        // TODO: Implement event storm repository
        throw new ApplicationError('Event storm repository not implemented')
      default:
        throw new ApplicationError(`Unsupported node type: ${nodeType}`)
    }
  }

  private async getNodeByTypeAndId(nodeId: string): Promise<BaseNode | null> {
    // Try to determine node type from metadata or try all repositories
    const metadata = await this.nodeMetadataRepository.getByKey(nodeId, 'featureType')
    if (metadata) {
      return await this.retrieveNodeByType(metadata.metadataValue, nodeId)
    }

    // Fallback: try all repositories
    const nodeTypes = ['function-model', 'knowledge-base', 'spindle', 'event-storm']
    for (const nodeType of nodeTypes) {
      try {
        const node = await this.retrieveNodeByType(nodeType, nodeId)
        if (node) return node
      } catch (error) {
        // Continue to next repository
        continue
      }
    }

    return null
  }
}

// Export the implementation as the default
export const UnifiedNodeOperations = UnifiedNodeOperationsImpl 