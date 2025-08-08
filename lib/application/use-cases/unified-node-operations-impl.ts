// Unified Node Operations Implementation
// This file implements the unified node operations with dependency injection and proper error handling

import { UnifiedNodeOperations } from './unified-node-operations'
import { BaseNode } from '../../domain/entities/base-node-types'
import { CrossFeatureLink } from '../../domain/entities/cross-feature-link-types'
import { ValidationResult, NodeBehavior } from '../../domain/entities/node-behavior-types'
import { FunctionModelNode } from '../../domain/entities/function-model-node-types'
import { FunctionModelRepository } from '../../infrastructure/repositories/function-model-repository'
import { SupabaseNodeRelationshipRepository } from '../../infrastructure/repositories/node-relationship-repository'
import { 
  ApplicationException, 
  NodeExecutionError, 
  CrossNodeLinkError,
  FunctionModelNodeError 
} from '../exceptions/application-exceptions'
import { NodeHandlerFactory } from '../../domain/services/node-handler-factory'
import { CachingService } from '../services/caching-service'

export class UnifiedNodeOperationsImpl implements UnifiedNodeOperations {
  private readonly cachingService: CachingService

  constructor(
    private readonly functionModelRepository: FunctionModelRepository,
    private readonly nodeRelationshipRepository: SupabaseNodeRelationshipRepository
  ) {
    this.cachingService = new CachingService({
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000
    })
  }

  async createNode<T extends BaseNode>(node: Omit<T, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<T> {
    try {
      if (node.featureType === 'function-model') {
        const functionModelNode = node as unknown as Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>
        const createdNode = await this.functionModelRepository.createFunctionModelNode(
          functionModelNode,
          functionModelNode.entityId
        )
        
        // Cache the created node
        const cacheKey = CachingService.generateNodeKey('function-model', createdNode.nodeId)
        this.cachingService.set(cacheKey, createdNode)
        
        // Invalidate related caches
        this.invalidateModelCache(functionModelNode.entityId)
        
        return createdNode as unknown as T
      }
      
      throw new ApplicationException(`Unsupported feature type: ${(node as any).featureType}`)
    } catch (error) {
      if (error instanceof ApplicationException) throw error
      throw new FunctionModelNodeError(
        `Failed to create node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        (node as any).nodeId || 'unknown',
        (node as any).entityId || 'unknown'
      )
    }
  }

  async getNode<T extends BaseNode>(nodeType: string, nodeId: string): Promise<T | null> {
    try {
      // Check cache first
      const cacheKey = CachingService.generateNodeKey(nodeType, nodeId)
      const cachedNode = this.cachingService.get<T>(cacheKey)
      if (cachedNode) {
        return cachedNode
      }

      // For function model nodes, we need to get the modelId first
      if (nodeType.includes('function-model')) {
        const modelId = await this.functionModelRepository.getModelIdForNode(nodeId)
        const node = await this.functionModelRepository.getFunctionModelNodeById(modelId, nodeId)
        
        // Cache the result
        if (node) {
          this.cachingService.set(cacheKey, node)
        }
        
        return node as unknown as T
      }
      
      throw new ApplicationException(`Unsupported node type: ${nodeType}`)
    } catch (error) {
      if (error instanceof ApplicationException) throw error
      throw new FunctionModelNodeError(
        `Failed to get node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        'unknown'
      )
    }
  }

  async updateNode<T extends BaseNode>(nodeType: string, nodeId: string, updates: Partial<T>): Promise<T> {
    try {
      if (nodeType.includes('function-model')) {
        const modelId = await this.functionModelRepository.getModelIdForNode(nodeId)
        const updatedNode = await this.functionModelRepository.updateFunctionModelNode(modelId, nodeId, updates as any)
        
        // Update cache
        const cacheKey = CachingService.generateNodeKey(nodeType, nodeId)
        this.cachingService.set(cacheKey, updatedNode)
        
        // Invalidate related caches
        this.invalidateModelCache(modelId)
        
        return updatedNode as unknown as T
      }
      
      throw new ApplicationError(`Unsupported node type: ${nodeType}`)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to update node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        'unknown'
      )
    }
  }

  async deleteNode(nodeType: string, nodeId: string): Promise<void> {
    try {
      if (nodeType.includes('function-model')) {
        const modelId = await this.functionModelRepository.getModelIdForNode(nodeId)
        await this.functionModelRepository.deleteFunctionModelNode(modelId, nodeId)
        
        // Invalidate cache
        const cacheKey = CachingService.generateNodeKey(nodeType, nodeId)
        this.cachingService.delete(cacheKey)
        
        // Invalidate related caches
        this.invalidateModelCache(modelId)
        
        return
      }
      
      throw new ApplicationError(`Unsupported node type: ${nodeType}`)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to delete node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        'unknown'
      )
    }
  }

  async createNodeLink(link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<CrossFeatureLink> {
    try {
      // For function model links
      if (link.sourceNodeType === 'function-model' || link.targetNodeType === 'function-model') {
        const createdLink = await this.nodeRelationshipRepository.createFunctionModelRelationship(
          link.sourceNodeId,
          link.targetNodeId,
          '', // sourceHandle - not used in current implementation
          '', // targetHandle - not used in current implementation
          link.sourceNodeId // modelId - using sourceNodeId as modelId for now
        )
        
        // Convert NodeRelationship to CrossFeatureLink
        return {
          linkId: createdLink.relationshipId,
          sourceNodeId: link.sourceNodeId,
          targetNodeId: link.targetNodeId,
          sourceNodeType: link.sourceNodeType,
          targetNodeType: link.targetNodeType,
          linkType: link.linkType,
          linkStrength: link.linkStrength,
          linkContext: link.linkContext,
          visualProperties: link.visualProperties,
          createdBy: link.createdBy,
          createdAt: createdLink.createdAt,
          updatedAt: createdLink.createdAt
        }
      }
      
      throw new ApplicationError(`Unsupported link type between ${link.sourceNodeType} and ${link.targetNodeType}`)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new CrossNodeLinkError(
        `Failed to create node link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        link.sourceNodeType,
        link.targetNodeType
      )
    }
  }

  async getNodeLinks(nodeType: string, nodeId?: string): Promise<CrossFeatureLink[]> {
    try {
      if (nodeType.includes('function-model')) {
        if (nodeId) {
          const relationships = await this.nodeRelationshipRepository.getBySourceNodeId(nodeId)
          // Convert NodeRelationship[] to CrossFeatureLink[]
          return relationships.map(rel => ({
            linkId: rel.relationshipId,
            sourceNodeId: rel.sourceNodeId,
            targetNodeId: rel.targetNodeId,
            sourceNodeType: 'function-model',
            targetNodeType: 'function-model',
            linkType: rel.relationshipType as any,
            linkStrength: rel.metadata.strength,
            linkContext: rel.metadata,
            visualProperties: { color: '#3b82f6', strokeWidth: 2 },
            createdBy: 'system',
            createdAt: rel.createdAt,
            updatedAt: rel.createdAt
          }))
        } else {
          // For now, return empty array - would need to implement getAllFunctionModelLinks
          return []
        }
      }
      
      throw new ApplicationError(`Unsupported node type: ${nodeType}`)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new CrossNodeLinkError(
        `Failed to get node links: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeType,
        'unknown'
      )
    }
  }

  async getConnectedNodes(nodeType: string, nodeId?: string): Promise<BaseNode[]> {
    try {
      if (nodeType.includes('function-model')) {
        if (!nodeId) {
          throw new ApplicationError('Node ID is required to get connected nodes')
        }
        
        const modelId = await this.functionModelRepository.getModelIdForNode(nodeId)
        const links = await this.nodeRelationshipRepository.getBySourceNodeId(nodeId)
        
        const connectedNodes: BaseNode[] = []
        for (const link of links) {
          const targetNode = await this.functionModelRepository.getFunctionModelNodeById(modelId, link.targetNodeId)
          if (targetNode) {
            connectedNodes.push(targetNode)
          }
        }
        
        return connectedNodes
      }
      
      throw new ApplicationError(`Unsupported node type: ${nodeType}`)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to get connected nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId || 'unknown',
        'unknown'
      )
    }
  }

  async executeNode(nodeType: string, nodeId: string, context?: any): Promise<any> {
    try {
      const node = await this.getNode(nodeType, nodeId)
      if (!node) throw new ApplicationError('Node not found')
      
      const handler = NodeHandlerFactory.createHandler(node)
      
      // Execute based on node type
      if (node.featureType === 'function-model') {
        const functionModelNode = node as FunctionModelNode
        switch (functionModelNode.nodeType) {
          case 'stageNode':
            return await this.executeStageNode(functionModelNode, context)
          case 'actionTableNode':
            return await this.executeActionTableNode(functionModelNode, context)
          case 'ioNode':
            return await this.executeIONode(functionModelNode, context)
          case 'functionModelContainer':
            return await this.executeContainerNode(functionModelNode, context)
          default:
            throw new ApplicationError(`Unsupported function model node type: ${functionModelNode.nodeType}`)
        }
      }
      
      throw new ApplicationError(`Unsupported feature type: ${node.featureType}`)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new NodeExecutionError(
        `Failed to execute node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        nodeType
      )
    }
  }

  async validateNode(nodeType: string, nodeId: string): Promise<ValidationResult> {
    try {
      const node = await this.getNode(nodeType, nodeId)
      if (!node) throw new ApplicationError('Node not found')
      
      const handler = NodeHandlerFactory.createHandler(node)
      return await handler.validate()
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new NodeExecutionError(
        `Failed to validate node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        nodeType
      )
    }
  }

  async getNodeBehavior(nodeType: string, nodeId: string): Promise<NodeBehavior> {
    try {
      const node = await this.getNode(nodeType, nodeId)
      if (!node) throw new ApplicationError('Node not found')
      
      const handler = NodeHandlerFactory.createHandler(node)
      return {
        validate: async (context: any) => await handler.validate(),
        execute: (context: any) => handler.execute(context),
        getBehaviorType: () => handler.getBehaviorType(),
        getBehaviorConfig: () => handler.getBehaviorConfig()
      }
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new NodeExecutionError(
        `Failed to get node behavior: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        nodeType
      )
    }
  }

  private async executeStageNode(node: FunctionModelNode, context?: any): Promise<any> {
    // Execute stage node logic
    return {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      result: 'Stage executed successfully',
      context
    }
  }

  private async executeActionTableNode(node: FunctionModelNode, context?: any): Promise<any> {
    // Execute action table node logic
    return {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      result: 'Action table executed successfully',
      context
    }
  }

  private async executeIONode(node: FunctionModelNode, context?: any): Promise<any> {
    // Execute IO node logic
    return {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      result: 'IO node executed successfully',
      context
    }
  }

  private async executeContainerNode(node: FunctionModelNode, context?: any): Promise<any> {
    // Execute container node logic
    return {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      result: 'Container node executed successfully',
      context
    }
  }

  private invalidateModelCache(modelId: string): void {
    // Invalidate model-specific caches
    const modelCacheKey = CachingService.generateModelKey(modelId)
    this.cachingService.delete(modelCacheKey)
    
    // Invalidate nodes list cache for this model
    const nodesListCacheKey = CachingService.generateNodesListKey(modelId)
    this.cachingService.delete(nodesListCacheKey)
    
    // Invalidate links cache for this model
    const linksCacheKey = CachingService.generateLinksKey('function-model')
    this.cachingService.delete(linksCacheKey)
  }
} 