// Unified Node Operations
// This file implements the UnifiedNodeOperations interface for cross-feature node operations

import type { BaseNode, FeatureType } from '../domain/entities/base-node-types'
import type { FunctionModelNode } from '../domain/entities/function-model-node-types'
import type { CrossFeatureLink } from '../domain/entities/cross-feature-link-types'
import type { ValidationResult } from '../domain/entities/node-behavior-types'
import { NodeBehaviorFactory } from '../domain/entities/node-behavior-types'

export interface UnifiedNodeOperations {
  // Universal node operations
  createNode<T extends BaseNode>(node: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>
  getNode<T extends BaseNode>(featureType: FeatureType, entityId: string, nodeId?: string): Promise<T | null>
  updateNode<T extends BaseNode>(featureType: FeatureType, entityId: string, nodeId: string, updates: Partial<T>): Promise<T>
  deleteNode(featureType: FeatureType, entityId: string, nodeId: string): Promise<void>
  
  // Cross-feature operations
  createNodeLink(link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<CrossFeatureLink>
  getNodeLinks(featureType: FeatureType, entityId: string, nodeId?: string): Promise<CrossFeatureLink[]>
  getConnectedNodes(featureType: FeatureType, entityId: string, nodeId?: string): Promise<BaseNode[]>
  
  // Feature-specific operations
  executeNode(featureType: FeatureType, entityId: string, nodeId: string, context?: any): Promise<any>
  validateNode(featureType: FeatureType, entityId: string, nodeId: string): Promise<ValidationResult>
  getNodeBehavior(featureType: FeatureType, entityId: string, nodeId: string): Promise<any>
}

// Implementation of Unified Node Operations
export class UnifiedNodeOperationsImpl implements UnifiedNodeOperations {
  constructor(
    private functionModelRepository: any,
    private knowledgeBaseRepository: any,
    private spindleRepository: any,
    private crossFeatureLinkRepository: any
  ) {}

  async createNode<T extends BaseNode>(node: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    // Validate node data
    this.validateNodeData(node)
    
    // Create node in appropriate repository
    switch (node.featureType) {
      case 'function-model':
        return await this.functionModelRepository.createFunctionModelNode(node as FunctionModelNode)
      case 'knowledge-base':
        return await this.knowledgeBaseRepository.createKnowledgeBaseNode(node)
      case 'spindle':
        return await this.spindleRepository.createSpindleNode(node)
      default:
        throw new Error(`Unsupported feature type: ${node.featureType}`)
    }
  }

  async getNode<T extends BaseNode>(
    featureType: FeatureType,
    entityId: string,
    nodeId?: string
  ): Promise<T | null> {
    // Get node from appropriate repository
    switch (featureType) {
      case 'function-model':
        return await this.functionModelRepository.getFunctionModelNodeById(entityId, nodeId)
      case 'knowledge-base':
        return await this.knowledgeBaseRepository.getKnowledgeBaseNodeById(entityId, nodeId)
      case 'spindle':
        return await this.spindleRepository.getSpindleNodeById(entityId, nodeId)
      default:
        throw new Error(`Unsupported feature type: ${featureType}`)
    }
  }

  async updateNode<T extends BaseNode>(
    featureType: FeatureType,
    entityId: string,
    nodeId: string,
    updates: Partial<T>
  ): Promise<T> {
    // Update node in appropriate repository
    switch (featureType) {
      case 'function-model':
        return await this.functionModelRepository.updateFunctionModelNode(entityId, nodeId, updates)
      case 'knowledge-base':
        return await this.knowledgeBaseRepository.updateKnowledgeBaseNode(entityId, nodeId, updates)
      case 'spindle':
        return await this.spindleRepository.updateSpindleNode(entityId, nodeId, updates)
      default:
        throw new Error(`Unsupported feature type: ${featureType}`)
    }
  }

  async deleteNode(featureType: FeatureType, entityId: string, nodeId: string): Promise<void> {
    // Delete node from appropriate repository
    switch (featureType) {
      case 'function-model':
        await this.functionModelRepository.deleteFunctionModelNode(entityId, nodeId)
        break
      case 'knowledge-base':
        await this.knowledgeBaseRepository.deleteKnowledgeBaseNode(entityId, nodeId)
        break
      case 'spindle':
        await this.spindleRepository.deleteSpindleNode(entityId, nodeId)
        break
      default:
        throw new Error(`Unsupported feature type: ${featureType}`)
    }
  }

  async createNodeLink(link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<CrossFeatureLink> {
    // Validate link parameters
    this.validateNodeLink(link)
    
    // Create the link
    return await this.crossFeatureLinkRepository.createNodeLink(link)
  }

  async getNodeLinks(featureType: FeatureType, entityId: string, nodeId?: string): Promise<CrossFeatureLink[]> {
    return await this.crossFeatureLinkRepository.getNodeLinks(featureType, entityId, nodeId)
  }

  async getConnectedNodes(featureType: FeatureType, entityId: string, nodeId?: string): Promise<BaseNode[]> {
    // Get links for this node
    const links = await this.getNodeLinks(featureType, entityId, nodeId)
    
    // Get connected nodes
    const connectedNodes: BaseNode[] = []
    
    for (const link of links) {
      const targetNode = await this.getNode(
        link.targetFeature,
        link.targetId,
        link.nodeContext?.targetNodeId
      )
      
      if (targetNode) {
        connectedNodes.push(targetNode)
      }
    }
    
    return connectedNodes
  }

  async executeNode(featureType: FeatureType, entityId: string, nodeId: string, context?: any): Promise<any> {
    // Get the node
    const node = await this.getNode(featureType, entityId, nodeId)
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`)
    }
    
    // Get node behavior
    const behavior = NodeBehaviorFactory.createBehavior(node)
    
    // Execute the node
    if ('execute' in behavior) {
      return await (behavior as any).execute(context)
    } else {
      throw new Error(`Node type ${featureType} does not support execution`)
    }
  }

  async validateNode(featureType: FeatureType, entityId: string, nodeId: string): Promise<ValidationResult> {
    // Get the node
    const node = await this.getNode(featureType, entityId, nodeId)
    if (!node) {
      return {
        isValid: false,
        errors: [`Node not found: ${nodeId}`],
        warnings: []
      }
    }
    
    // Get node behavior and validate
    const behavior = NodeBehaviorFactory.createBehavior(node)
    return behavior.validate()
  }

  async getNodeBehavior(featureType: FeatureType, entityId: string, nodeId: string): Promise<any> {
    // Get the node
    const node = await this.getNode(featureType, entityId, nodeId)
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`)
    }
    
    // Return node behavior
    return NodeBehaviorFactory.createBehavior(node)
  }

  private validateNodeData(node: any): void {
    if (!node.featureType) {
      throw new Error('Feature type is required')
    }
    
    if (!node.nodeType) {
      throw new Error('Node type is required')
    }
    
    if (!node.name) {
      throw new Error('Node name is required')
    }
    
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      throw new Error('Valid position is required')
    }
  }

  private validateNodeLink(link: any): void {
    if (!link.sourceFeature || !link.sourceId || !link.targetFeature || !link.targetId || !link.linkType) {
      throw new Error('All link parameters are required')
    }
    
    // Validate feature types
    const validFeatureTypes = ['function-model', 'knowledge-base', 'spindle']
    if (!validFeatureTypes.includes(link.sourceFeature) || !validFeatureTypes.includes(link.targetFeature)) {
      throw new Error('Invalid feature type')
    }
    
    // Validate link type
    const validLinkTypes = ['documents', 'implements', 'references', 'supports', 'nested', 'triggers', 'consumes', 'produces']
    if (!validLinkTypes.includes(link.linkType)) {
      throw new Error('Invalid link type')
    }
  }
}

// Factory function to create UnifiedNodeOperations instance
export function createUnifiedNodeOperations(
  functionModelRepository: any,
  knowledgeBaseRepository: any,
  spindleRepository: any,
  crossFeatureLinkRepository: any
): UnifiedNodeOperations {
  return new UnifiedNodeOperationsImpl(
    functionModelRepository,
    knowledgeBaseRepository,
    spindleRepository,
    crossFeatureLinkRepository
  )
} 