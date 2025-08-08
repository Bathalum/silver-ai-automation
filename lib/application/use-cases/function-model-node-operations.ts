// Function Model Node Operations
// This file implements domain-specific operations for function model nodes

import { FunctionModelNode, FunctionModelNodeLink, NodeUpdateValidation } from '../../domain/entities/function-model-node-types'
import { FunctionModel, FunctionModelCreateOptions, FunctionModelUpdateOptions } from '../../domain/entities/function-model-types'
import { CrossFeatureLink } from '../../domain/entities/cross-feature-link-types'
import { FunctionModelRepository } from '../../infrastructure/repositories/function-model-repository'
import { SupabaseNodeRelationshipRepository } from '../../infrastructure/repositories/node-relationship-repository'
import { 
  ApplicationException, 
  FunctionModelNodeError, 
  FunctionModelValidationError,
  CrossFeatureLinkError 
} from '../exceptions/application-exceptions'
import { validateConnection, getConnectionValidationMessage } from '../../domain/entities/function-model-connection-rules'
import { CachingService } from '../services/caching-service'
import { PaginationService, PaginationOptions, PaginationResult } from '../services/pagination-service'

export interface FunctionModelNodeOperations {
  // Function Model Node CRUD
  createFunctionModelNode(
    node: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>, 
    modelId: string
  ): Promise<FunctionModelNode>
  
  getFunctionModelNode(nodeId: string, modelId: string): Promise<FunctionModelNode | null>
  
  updateFunctionModelNode(
    nodeId: string, 
    modelId: string, 
    updates: Partial<FunctionModelNode>
  ): Promise<FunctionModelNode>
  
  deleteFunctionModelNode(nodeId: string, modelId: string): Promise<void>
  
  // Function Model specific operations
  executeFunctionModelNode(nodeId: string, modelId: string, context?: any): Promise<any>
  validateFunctionModelNode(nodeId: string, modelId: string): Promise<NodeUpdateValidation>
  getFunctionModelNodeBehavior(nodeId: string, modelId: string): Promise<any>
  
  // Cross-feature linking
  createFunctionModelNodeLink(
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle: string,
    targetHandle: string,
    modelId: string
  ): Promise<FunctionModelNodeLink>
  
  createCrossFeatureLink(
    sourceFeature: string,
    sourceId: string,
    sourceNodeId: string | null,
    targetFeature: string,
    targetId: string,
    targetNodeId: string | null,
    linkType: string,
    context: Record<string, any>
  ): Promise<CrossFeatureLink>
  
  // Search and analytics
  searchFunctionModelNodes(modelId: string, query: string, pagination?: PaginationOptions): Promise<PaginationResult<FunctionModelNode>>
  getFunctionModelNodesByType(modelId: string, nodeType: FunctionModelNode['nodeType'], pagination?: PaginationOptions): Promise<PaginationResult<FunctionModelNode>>
  getConnectedFunctionModelNodes(nodeId: string, modelId: string): Promise<{ incoming: FunctionModelNode[], outgoing: FunctionModelNode[] }>
  
  // Function Model operations (for actual models, not nodes)
  createFunctionModel(options: FunctionModelCreateOptions): Promise<FunctionModel>
  getFunctionModel(modelId: string): Promise<FunctionModel | null>
  updateFunctionModel(modelId: string, updates: FunctionModelUpdateOptions): Promise<FunctionModel>
  deleteFunctionModel(modelId: string): Promise<void>
  duplicateFunctionModel(modelId: string, newName: string): Promise<FunctionModel>
  
  // Version control
  createFunctionModelVersion(modelId: string, versionData: any): Promise<void>
  getFunctionModelVersion(modelId: string, version: string): Promise<any | null>
  rollbackFunctionModelVersion(modelId: string, targetVersion: string): Promise<void>
}

export class FunctionModelNodeOperationsImpl implements FunctionModelNodeOperations {
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

  async createFunctionModelNode(
    node: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>, 
    modelId: string
  ): Promise<FunctionModelNode> {
    try {
      return await this.functionModelRepository.createFunctionModelNode(node, modelId)
    } catch (error) {
      if (error instanceof ApplicationException) throw error
      throw new FunctionModelNodeError(
        `Failed to create function model node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'unknown',
        modelId
      )
    }
  }

  async getFunctionModelNode(nodeId: string, modelId: string): Promise<FunctionModelNode | null> {
    try {
      return await this.functionModelRepository.getFunctionModelNodeById(modelId, nodeId)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to get function model node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        modelId
      )
    }
  }

  async updateFunctionModelNode(
    nodeId: string, 
    modelId: string, 
    updates: Partial<FunctionModelNode>
  ): Promise<FunctionModelNode> {
    try {
      return await this.functionModelRepository.updateFunctionModelNode(modelId, nodeId, updates)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to update function model node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        modelId
      )
    }
  }

  async deleteFunctionModelNode(nodeId: string, modelId: string): Promise<void> {
    try {
      await this.functionModelRepository.deleteFunctionModelNode(modelId, nodeId)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to delete function model node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        modelId
      )
    }
  }

  async executeFunctionModelNode(nodeId: string, modelId: string, context?: any): Promise<any> {
    try {
      const node = await this.getFunctionModelNode(nodeId, modelId)
      if (!node) throw new ApplicationException('Function model node not found')
      
      switch (node.nodeType) {
        case 'stageNode':
          return await this.executeStageNode(node, context)
        case 'actionTableNode':
          return await this.executeActionTableNode(node, context)
        case 'ioNode':
          return await this.executeIONode(node, context)
        case 'functionModelContainer':
          return await this.executeContainerNode(node, context)
        default:
          throw new ApplicationException(`Unsupported function model node type: ${node.nodeType}`)
      }
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to execute function model node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        modelId
      )
    }
  }

  async validateFunctionModelNode(nodeId: string, modelId: string): Promise<NodeUpdateValidation> {
    try {
      const node = await this.getFunctionModelNode(nodeId, modelId)
      if (!node) throw new ApplicationException('Function model node not found')
      
      // Basic validation
      const errors: string[] = []
      const warnings: string[] = []
      
      if (!node.name?.trim()) {
        errors.push('Node name is required')
      }
      
      if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
        errors.push('Valid position is required')
      }
      
      if (node.processBehavior.timeout && node.processBehavior.timeout < 0) {
        errors.push('Timeout must be non-negative')
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    } catch (error) {
      if (error instanceof ApplicationException) throw error
      throw new FunctionModelValidationError(
        `Failed to validate function model node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        modelId,
        []
      )
    }
  }

  async getFunctionModelNodeBehavior(nodeId: string, modelId: string): Promise<any> {
    try {
      const node = await this.getFunctionModelNode(nodeId, modelId)
      if (!node) throw new ApplicationException('Function model node not found')
      
      return {
        nodeType: node.nodeType,
        executionType: node.processBehavior.executionType,
        dependencies: node.processBehavior.dependencies,
        timeout: node.processBehavior.timeout,
        retryPolicy: node.processBehavior.retryPolicy,
        businessLogic: node.businessLogic
      }
    } catch (error) {
      if (error instanceof ApplicationException) throw error
      throw new FunctionModelNodeError(
        `Failed to get function model node behavior: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        modelId
      )
    }
  }

  async createFunctionModelNodeLink(
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle: string,
    targetHandle: string,
    modelId: string
  ): Promise<FunctionModelNodeLink> {
    try {
      // Validate connection
      const sourceNode = await this.getFunctionModelNode(sourceNodeId, modelId)
      const targetNode = await this.getFunctionModelNode(targetNodeId, modelId)
      
      if (!sourceNode || !targetNode) {
        throw new ApplicationException('Source or target node not found')
      }
      
      if (!validateConnection(sourceNode, targetNode, sourceHandle, targetHandle)) {
        const message = getConnectionValidationMessage(sourceNode, targetNode, sourceHandle, targetHandle)
        throw new ApplicationException(message || 'Invalid connection')
      }
      
      const createdLink = await this.nodeRelationshipRepository.createFunctionModelRelationship(
        sourceNodeId,
        targetNodeId,
        sourceHandle,
        targetHandle,
        modelId
      )
      
      return {
        linkId: createdLink.relationshipId,
        sourceNodeId: createdLink.sourceNodeId,
        targetNodeId: createdLink.targetNodeId,
        sourceHandle,
        targetHandle,
        linkType: createdLink.relationshipType as any,
        sourceNodeType: sourceNode.nodeType === 'functionModelContainer' ? 'stageNode' : sourceNode.nodeType,
        targetNodeType: targetNode.nodeType === 'functionModelContainer' ? 'stageNode' : targetNode.nodeType,
        linkStrength: createdLink.metadata.strength,
        linkContext: createdLink.metadata,
        createdAt: createdLink.createdAt
      }
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to create function model node link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sourceNodeId,
        modelId
      )
    }
  }

  async createCrossFeatureLink(
    sourceFeature: string,
    sourceId: string,
    sourceNodeId: string | null,
    targetFeature: string,
    targetId: string,
    targetNodeId: string | null,
    linkType: string,
    context: Record<string, any>
  ): Promise<CrossFeatureLink> {
    try {
      // For now, return a basic cross-feature link structure
      // This would need to be implemented based on the actual cross-feature linking requirements
      return {
        linkId: `cross-${Date.now()}`,
        sourceNodeId: sourceNodeId || '',
        targetNodeId: targetNodeId || '',
        sourceNodeType: sourceFeature,
        targetNodeType: targetFeature,
        linkType: linkType as any,
        linkStrength: 1,
        linkContext: context,
        visualProperties: { color: '#3b82f6', strokeWidth: 2 },
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new CrossFeatureLinkError(
        `Failed to create cross-feature link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sourceFeature,
        targetFeature
      )
    }
  }

  async searchFunctionModelNodes(modelId: string, query: string, pagination?: PaginationOptions): Promise<PaginationResult<FunctionModelNode>> {
    try {
      const paginationOptions = pagination || PaginationService.createPaginationOptions()
      
      // Check cache first
      const cacheKey = CachingService.generateSearchKey(query, modelId)
      const cachedResults = this.cachingService.get<FunctionModelNode[]>(cacheKey)
      
      if (cachedResults) {
        return PaginationService.paginateArray(cachedResults, paginationOptions)
      }

      const nodes = await this.functionModelRepository.getFunctionModelNodes(modelId)
      const filteredNodes = nodes.filter(node => 
        node.name.toLowerCase().includes(query.toLowerCase()) ||
        (node.description?.toLowerCase() || '').includes(query.toLowerCase())
      )
      
      // Cache the results
      this.cachingService.set(cacheKey, filteredNodes)
      
      // Return paginated results
      return PaginationService.paginateArray(filteredNodes, paginationOptions)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to search function model nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'unknown',
        modelId
      )
    }
  }

  async getFunctionModelNodesByType(modelId: string, nodeType: FunctionModelNode['nodeType'], pagination?: PaginationOptions): Promise<PaginationResult<FunctionModelNode>> {
    try {
      const paginationOptions = pagination || PaginationService.createPaginationOptions()
      
      // Check cache first
      const cacheKey = CachingService.generateNodesListKey(modelId, { nodeType })
      const cachedResults = this.cachingService.get<FunctionModelNode[]>(cacheKey)
      
      if (cachedResults) {
        return PaginationService.paginateArray(cachedResults, paginationOptions)
      }

      const nodes = await this.functionModelRepository.getFunctionModelNodes(modelId)
      const filteredNodes = nodes.filter(node => node.nodeType === nodeType)
      
      // Cache the results
      this.cachingService.set(cacheKey, filteredNodes)
      
      // Return paginated results
      return PaginationService.paginateArray(filteredNodes, paginationOptions)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to get function model nodes by type: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'unknown',
        modelId
      )
    }
  }

  async getConnectedFunctionModelNodes(nodeId: string, modelId: string): Promise<{ incoming: FunctionModelNode[], outgoing: FunctionModelNode[] }> {
    try {
      const links = await this.nodeRelationshipRepository.getBySourceNodeId(nodeId)
      const targetLinks = await this.nodeRelationshipRepository.getByTargetNodeId(nodeId)
      
      const outgoing: FunctionModelNode[] = []
      const incoming: FunctionModelNode[] = []
      
      for (const link of links) {
        const targetNode = await this.getFunctionModelNode(link.targetNodeId, modelId)
        if (targetNode) {
          outgoing.push(targetNode)
        }
      }
      
      for (const link of targetLinks) {
        const sourceNode = await this.getFunctionModelNode(link.sourceNodeId, modelId)
        if (sourceNode) {
          incoming.push(sourceNode)
        }
      }
      
      return { incoming, outgoing }
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to get connected function model nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        modelId
      )
    }
  }

  async createFunctionModel(options: FunctionModelCreateOptions): Promise<FunctionModel> {
    try {
      return await this.functionModelRepository.createFunctionModel(options)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelValidationError(
        `Failed to create function model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'unknown',
        []
      )
    }
  }

  async getFunctionModel(modelId: string): Promise<FunctionModel | null> {
    try {
      return await this.functionModelRepository.getFunctionModelById(modelId)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelValidationError(
        `Failed to get function model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        modelId,
        []
      )
    }
  }

  async updateFunctionModel(modelId: string, updates: FunctionModelUpdateOptions): Promise<FunctionModel> {
    try {
      return await this.functionModelRepository.updateFunctionModel(modelId, updates)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelValidationError(
        `Failed to update function model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        modelId,
        []
      )
    }
  }

  async deleteFunctionModel(modelId: string): Promise<void> {
    try {
      await this.functionModelRepository.deleteFunctionModel(modelId)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelValidationError(
        `Failed to delete function model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        modelId,
        []
      )
    }
  }

  async duplicateFunctionModel(modelId: string, newName: string): Promise<FunctionModel> {
    try {
      return await this.functionModelRepository.duplicateFunctionModel(modelId, newName)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelValidationError(
        `Failed to duplicate function model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        modelId,
        []
      )
    }
  }

  async createFunctionModelVersion(modelId: string, versionData: any): Promise<void> {
    try {
      // TODO: Implement version control functionality
      // For now, just log the version creation
      console.log(`Creating version for model ${modelId}:`, versionData)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelValidationError(
        `Failed to create function model version: ${error instanceof Error ? error.message : 'Unknown error'}`,
        modelId,
        []
      )
    }
  }

  async getFunctionModelVersion(modelId: string, version: string): Promise<any | null> {
    try {
      // TODO: Implement version retrieval functionality
      // For now, return null
      return null
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelValidationError(
        `Failed to get function model version: ${error instanceof Error ? error.message : 'Unknown error'}`,
        modelId,
        []
      )
    }
  }

  async rollbackFunctionModelVersion(modelId: string, targetVersion: string): Promise<void> {
    try {
      // TODO: Implement version rollback functionality
      // For now, just log the rollback
      console.log(`Rolling back model ${modelId} to version ${targetVersion}`)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelValidationError(
        `Failed to rollback function model version: ${error instanceof Error ? error.message : 'Unknown error'}`,
        modelId,
        []
      )
    }
  }

  private async executeStageNode(node: FunctionModelNode, context?: any): Promise<any> {
    return {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      result: 'Stage executed successfully',
      context
    }
  }

  private async executeActionTableNode(node: FunctionModelNode, context?: any): Promise<any> {
    return {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      result: 'Action table executed successfully',
      context
    }
  }

  private async executeIONode(node: FunctionModelNode, context?: any): Promise<any> {
    return {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      result: 'IO node executed successfully',
      context
    }
  }

  private async executeContainerNode(node: FunctionModelNode, context?: any): Promise<any> {
    return {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      result: 'Container node executed successfully',
      context
    }
  }
} 