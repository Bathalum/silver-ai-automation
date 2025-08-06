// Function Model Use Cases (Updated to follow Application Layer Guide)
// This file implements use cases for function model operations with proper dependency injection and error handling

import { FunctionModelNode, FunctionModelNodeOptions, NodeUpdateValidation, FunctionModelNodeLink } from '../../domain/entities/function-model-node-types'
import { validateConnection, getConnectionValidationMessage } from '../../domain/entities/function-model-connection-rules'
import { FunctionModelRepository, SupabaseFunctionModelRepository } from '../../infrastructure/repositories/function-model-repository'
import { SupabaseNodeRelationshipRepository } from '../../infrastructure/repositories/node-relationship-repository'
import { FunctionModel, FunctionModelCreateOptions, FunctionModelUpdateOptions } from '../../domain/entities/function-model-types'
import { ExecutionType } from '../../domain/value-objects/function-model-value-objects'
import { 
  ApplicationError, 
  FunctionModelNodeError, 
  FunctionModelValidationError,
  CrossFeatureLinkError 
} from '../exceptions/application-exceptions'
import { CachingService } from '../services/caching-service'
import { PaginationService, PaginationOptions, PaginationResult } from '../services/pagination-service'

// Updated to use dependency injection
export class FunctionModelUseCases {
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
    nodeType: FunctionModelNode['nodeType'],
    name: string,
    position: { x: number; y: number },
    modelId: string,
    options: FunctionModelNodeOptions = {}
  ): Promise<FunctionModelNode> {
    try {
      // Validate required fields
      if (!name.trim()) throw new FunctionModelValidationError('Node name is required', modelId, ['name'])
      if (!nodeType) throw new FunctionModelValidationError('Node type is required', modelId, ['nodeType'])
      if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
        throw new FunctionModelValidationError('Valid position is required', modelId, ['position'])
      }
      
      // Create node with correct type structure
      const node: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'> = {
        featureType: 'function-model',
        entityId: modelId,
        nodeType,
        name: name.trim(),
        description: options.description || '',
        position,
        metadata: {
          tags: [nodeType, 'function-model'],
          aiAgent: options.metadata?.aiAgent,
          vectorEmbedding: options.metadata?.vectorEmbedding,
          searchKeywords: [name.trim()],
          crossFeatureLinks: []
        },
        visualProperties: {
          color: '#3b82f6',
          icon: '📊',
          size: 'medium',
          style: {},
          featureSpecific: {}
        },
        status: 'active',
        functionModelData: {},
        processBehavior: {
          executionType: new ExecutionType(ExecutionType.SEQUENTIAL),
          dependencies: [],
          timeout: options.processBehavior?.timeout,
          retryPolicy: options.processBehavior?.retryPolicy
        },
        businessLogic: {
          raciMatrix: options.businessLogic?.raciMatrix,
          sla: options.businessLogic?.sla,
          kpis: options.businessLogic?.kpis
        },
        nodeLinks: [] // Initialize with empty nodeLinks array
      }

      return await this.functionModelRepository.addNodeToFunctionModel(modelId, node)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to create function model node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'unknown',
        modelId
      )
    }
  }

  async updateFunctionModelNode(
    nodeId: string,
    updates: Partial<FunctionModelNode>,
    modelId: string
  ): Promise<FunctionModelNode> {
    try {
      // Validate updates
      const validationResult = await this.validateNodeUpdates(nodeId, updates)
      if (!validationResult.isValid) {
        throw new FunctionModelValidationError(
          'Node update validation failed',
          modelId,
          validationResult.errors
        )
      }

      return await this.functionModelRepository.updateNodeInFunctionModel(modelId, nodeId, updates)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to update function model node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        modelId
      )
    }
  }

  async createNodeLink(
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle: string,
    targetHandle: string,
    modelId: string
  ): Promise<FunctionModelNodeLink> {
    try {
      // Validate connection
      const sourceNode = await this.functionModelRepository.getFunctionModelNodes(modelId).then(nodes => nodes.find(n => n.nodeId === sourceNodeId))
      const targetNode = await this.functionModelRepository.getFunctionModelNodes(modelId).then(nodes => nodes.find(n => n.nodeId === targetNodeId))
      
      if (!sourceNode || !targetNode) {
        throw new ApplicationError('Source or target node not found')
      }
      
      if (!validateConnection(sourceNode, targetNode, sourceHandle, targetHandle)) {
        const message = getConnectionValidationMessage(sourceNode, targetNode, sourceHandle, targetHandle)
        throw new ApplicationError(message || 'Invalid connection')
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
        `Failed to create node link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sourceNodeId,
        modelId
      )
    }
  }

  async deleteNodeLink(linkId: string): Promise<void> {
    try {
      await this.nodeRelationshipRepository.delete(linkId)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new ApplicationError(
        `Failed to delete node link: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async getFunctionModelNodes(modelId: string): Promise<FunctionModelNode[]> {
    try {
      return await this.functionModelRepository.getFunctionModelNodes(modelId)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to get function model nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'unknown',
        modelId
      )
    }
  }

  async getNodeLinks(modelId: string): Promise<FunctionModelNodeLink[]> {
    try {
      const relationships = await this.nodeRelationshipRepository.getByModelId(modelId)
      return relationships.map(rel => ({
        linkId: rel.relationshipId,
        sourceNodeId: rel.sourceNodeId,
        targetNodeId: rel.targetNodeId,
        sourceHandle: rel.metadata?.sourceHandle || '',
        targetHandle: rel.metadata?.targetHandle || '',
        linkType: rel.relationshipType as any,
        sourceNodeType: 'stageNode',
        targetNodeType: 'stageNode',
        linkStrength: rel.metadata?.strength || 1.0,
        linkContext: rel.metadata || {},
        createdAt: rel.createdAt
      }))
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to get node links: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'unknown',
        modelId
      )
    }
  }

  async deleteFunctionModelNode(nodeId: string, modelId: string): Promise<void> {
    try {
      await this.functionModelRepository.removeNodeFromFunctionModel(modelId, nodeId)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to delete function model node: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        modelId
      )
    }
  }

  async validateNodeUpdates(
    nodeId: string,
    updates: Partial<FunctionModelNode>
  ): Promise<NodeUpdateValidation> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate name
    if (updates.name !== undefined) {
      if (!updates.name.trim()) {
        errors.push('Node name cannot be empty')
      }
      if (updates.name.length > 100) {
        errors.push('Node name cannot exceed 100 characters')
      }
    }

    // Validate position
    if (updates.position !== undefined) {
      if (typeof updates.position.x !== 'number' || typeof updates.position.y !== 'number') {
        errors.push('Position must have valid x and y coordinates')
      }
    }

    // Validate process behavior
    if (updates.processBehavior?.executionType !== undefined) {
      if (updates.processBehavior.executionType.value && 
          !['sequential', 'parallel', 'conditional'].includes(updates.processBehavior.executionType.value)) {
        errors.push('Execution type must be sequential, parallel, or conditional')
      }
    }

    // Validate timeout
    if (updates.processBehavior?.timeout !== undefined) {
      if (updates.processBehavior.timeout < 0) {
        errors.push('Timeout must be non-negative')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  async getNodeById(nodeId: string, modelId: string): Promise<FunctionModelNode | null> {
    try {
      const nodes = await this.functionModelRepository.getFunctionModelNodes(modelId)
      return nodes.find(n => n.nodeId === nodeId) || null
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to get node by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
        modelId
      )
    }
  }

  async searchFunctionModelNodes(
    modelId: string,
    searchTerm: string,
    pagination?: PaginationOptions
  ): Promise<PaginationResult<FunctionModelNode>> {
    try {
      const paginationOptions = pagination || PaginationService.createPaginationOptions()
      
      // Check cache first
      const cacheKey = CachingService.generateSearchKey(searchTerm, modelId)
      const cachedResults = this.cachingService.get<FunctionModelNode[]>(cacheKey)
      
      if (cachedResults) {
        return PaginationService.paginateArray(cachedResults, paginationOptions)
      }

      const nodes = await this.functionModelRepository.getFunctionModelNodes(modelId)
      const filteredNodes = nodes.filter(node => 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (node.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
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

  async getNodesByType(
    modelId: string,
    nodeType: FunctionModelNode['nodeType'],
    pagination?: PaginationOptions
  ): Promise<PaginationResult<FunctionModelNode>> {
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
        `Failed to get nodes by type: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'unknown',
        modelId
      )
    }
  }

  async getConnectedNodes(
    nodeId: string,
    modelId: string
  ): Promise<{ incoming: FunctionModelNode[], outgoing: FunctionModelNode[] }> {
    try {
      const links = await this.nodeRelationshipRepository.getBySourceNodeId(nodeId)
      const targetLinks = await this.nodeRelationshipRepository.getByTargetNodeId(nodeId)
      
      const outgoing: FunctionModelNode[] = []
      const incoming: FunctionModelNode[] = []
      
      for (const link of links) {
        const targetNode = await this.functionModelRepository.getFunctionModelNodes(modelId).then(nodes => nodes.find(n => n.nodeId === link.targetNodeId))
        if (targetNode) {
          outgoing.push(targetNode)
        }
      }
      
      for (const link of targetLinks) {
        const sourceNode = await this.functionModelRepository.getFunctionModelNodes(modelId).then(nodes => nodes.find(n => n.nodeId === link.sourceNodeId))
        if (sourceNode) {
          incoming.push(sourceNode)
        }
      }
      
      return { incoming, outgoing }
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new FunctionModelNodeError(
        `Failed to get connected nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId,
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
    context?: Record<string, any>
  ): Promise<any> {
    try {
      // For now, return a basic cross-feature link structure
      return {
        linkId: `cross-${Date.now()}`,
        sourceFeature,
        sourceId,
        sourceNodeId,
        targetFeature,
        targetId,
        targetNodeId,
        linkType,
        context: context || {}
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

  async getCrossFeatureLinks(
    sourceId: string,
    sourceFeature: string
  ): Promise<any[]> {
    try {
      // TODO: Implement cross-feature link retrieval
      return []
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new CrossFeatureLinkError(
        `Failed to get cross-feature links: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sourceFeature,
        'unknown'
      )
    }
  }

  async deleteCrossFeatureLink(linkId: string): Promise<void> {
    try {
      // TODO: Implement cross-feature link deletion
      console.log(`Deleting cross-feature link: ${linkId}`)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new ApplicationError(
        `Failed to delete cross-feature link: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async getAllFunctionModels(): Promise<FunctionModel[]> {
    try {
      return await this.functionModelRepository.getAllFunctionModels()
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new ApplicationError(
        `Failed to get all function models: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async getAllFunctionModelsWithNodeStats(): Promise<(FunctionModel & { nodeStats: { totalNodes: number; nodesByType: Record<string, number>; totalConnections: number } })[]> {
    try {
      const models = await this.functionModelRepository.getAllFunctionModels()
      const modelsWithStats = await Promise.all(
        models.map(async (model) => {
          const nodes = await this.functionModelRepository.getFunctionModelNodes(model.modelId)
          const links = await this.nodeRelationshipRepository.getByModelId(model.modelId)
          
          const nodesByType: Record<string, number> = {}
          nodes.forEach(node => {
            nodesByType[node.nodeType] = (nodesByType[node.nodeType] || 0) + 1
          })
          
          return {
            ...model,
            nodeStats: {
              totalNodes: nodes.length,
              nodesByType,
              totalConnections: links.length
            }
          }
        })
      )
      
      return modelsWithStats
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new ApplicationError(
        `Failed to get function models with node stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async getFunctionModelById(modelId: string): Promise<FunctionModel | null> {
    try {
      return await this.functionModelRepository.getFunctionModelById(modelId)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new ApplicationError(
        `Failed to get function model by ID: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async createFunctionModel(options: FunctionModelCreateOptions): Promise<FunctionModel> {
    try {
      return await this.functionModelRepository.createFunctionModel({
        name: options.name,
        description: options.description || '',
        version: options.version || '1.0.0',
        status: options.status || 'draft',
        currentVersion: options.version || '1.0.0',
        versionCount: 1,
        lastSavedAt: new Date(),
        aiAgentConfig: options.aiAgentConfig || {},
        metadata: options.metadata || {},
        permissions: options.permissions || {}
      })
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new ApplicationError(
        `Failed to create function model: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async updateFunctionModel(modelId: string, updates: FunctionModelUpdateOptions): Promise<FunctionModel> {
    try {
      return await this.functionModelRepository.updateFunctionModel(modelId, updates)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new ApplicationError(
        `Failed to update function model: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async deleteFunctionModel(modelId: string): Promise<void> {
    try {
      await this.functionModelRepository.deleteFunctionModel(modelId)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new ApplicationError(
        `Failed to delete function model: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async duplicateFunctionModel(modelId: string, newName: string): Promise<FunctionModel> {
    try {
      return await this.functionModelRepository.duplicateFunctionModel(modelId, newName)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new ApplicationError(
        `Failed to duplicate function model: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async deleteFunctionModelWithConfirmation(modelId: string): Promise<void> {
    try {
      await this.functionModelRepository.deleteFunctionModel(modelId)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new ApplicationError(
        `Failed to delete function model with confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async duplicateFunctionModelWithName(modelId: string): Promise<FunctionModel> {
    try {
      const originalModel = await this.functionModelRepository.getFunctionModelById(modelId)
      if (!originalModel) {
        throw new ApplicationError('Original function model not found')
      }
      
      const newName = `${originalModel.name} (Copy)`
      return await this.functionModelRepository.duplicateFunctionModel(modelId, newName)
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      throw new ApplicationError(
        `Failed to duplicate function model with name: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

// Legacy export for backward compatibility (deprecated - use FunctionModelUseCases class instead)
export const createFunctionModelNode = async (
  nodeType: FunctionModelNode['nodeType'],
  name: string,
  position: { x: number; y: number },
  modelId: string,
  options: FunctionModelNodeOptions = {}
): Promise<FunctionModelNode> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.createFunctionModelNode(nodeType, name, position, modelId, options)
}

// Export other legacy functions for backward compatibility
export const updateFunctionModelNode = async (
  nodeId: string,
  updates: Partial<FunctionModelNode>,
  modelId?: string
): Promise<FunctionModelNode> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.updateFunctionModelNode(nodeId, updates, modelId || 'unknown')
}

export const createNodeLink = async (
  sourceNodeId: string,
  targetNodeId: string,
  sourceHandle: string,
  targetHandle: string,
  modelId: string
): Promise<FunctionModelNodeLink> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.createNodeLink(sourceNodeId, targetNodeId, sourceHandle, targetHandle, modelId)
}

export const deleteNodeLink = async (linkId: string): Promise<void> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.deleteNodeLink(linkId)
}

export const getFunctionModelNodes = async (modelId: string): Promise<FunctionModelNode[]> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.getFunctionModelNodes(modelId)
}

export const getNodeLinks = async (modelId: string): Promise<FunctionModelNodeLink[]> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.getNodeLinks(modelId)
}

export const deleteFunctionModelNode = async (nodeId: string, modelId: string): Promise<void> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.deleteFunctionModelNode(nodeId, modelId)
}

export const validateNodeUpdates = async (
  nodeId: string,
  updates: Partial<FunctionModelNode>
): Promise<NodeUpdateValidation> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.validateNodeUpdates(nodeId, updates)
}

export const getNodeById = async (nodeId: string, modelId: string): Promise<FunctionModelNode | null> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.getNodeById(nodeId, modelId)
}

export const searchFunctionModelNodes = async (
  modelId: string,
  searchTerm: string,
  pagination?: PaginationOptions
): Promise<PaginationResult<FunctionModelNode>> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.searchFunctionModelNodes(modelId, searchTerm, pagination)
}

export const getNodesByType = async (
  modelId: string,
  nodeType: FunctionModelNode['nodeType'],
  pagination?: PaginationOptions
): Promise<PaginationResult<FunctionModelNode>> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.getNodesByType(modelId, nodeType, pagination)
}

export const getConnectedNodes = async (
  nodeId: string,
  modelId: string
): Promise<{ incoming: FunctionModelNode[], outgoing: FunctionModelNode[] }> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.getConnectedNodes(nodeId, modelId)
}

export const createCrossFeatureLink = async (
  sourceFeature: string,
  sourceId: string,
  sourceNodeId: string | null,
  targetFeature: string,
  targetId: string,
  targetNodeId: string | null,
  linkType: string,
  context?: Record<string, any>
): Promise<any> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.createCrossFeatureLink(sourceFeature, sourceId, sourceNodeId, targetFeature, targetId, targetNodeId, linkType, context)
}

export const getCrossFeatureLinks = async (
  sourceId: string,
  sourceFeature: string
): Promise<any[]> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.getCrossFeatureLinks(sourceId, sourceFeature)
}

export const deleteCrossFeatureLink = async (linkId: string): Promise<void> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.deleteCrossFeatureLink(linkId)
}

export const getAllFunctionModels = async (): Promise<FunctionModel[]> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.getAllFunctionModels()
}

export const getAllFunctionModelsWithNodeStats = async (): Promise<(FunctionModel & { nodeStats: { totalNodes: number; nodesByType: Record<string, number>; totalConnections: number } })[]> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.getAllFunctionModelsWithNodeStats()
}

export const getFunctionModelById = async (modelId: string): Promise<FunctionModel | null> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.getFunctionModelById(modelId)
}

export const createFunctionModel = async (options: FunctionModelCreateOptions): Promise<FunctionModel> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.createFunctionModel(options)
}

export const updateFunctionModel = async (modelId: string, updates: FunctionModelUpdateOptions): Promise<FunctionModel> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.updateFunctionModel(modelId, updates)
}

export const deleteFunctionModel = async (modelId: string): Promise<void> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.deleteFunctionModel(modelId)
}

export const duplicateFunctionModel = async (modelId: string, newName: string): Promise<FunctionModel> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.duplicateFunctionModel(modelId, newName)
}

export const deleteFunctionModelWithConfirmation = async (modelId: string): Promise<void> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.deleteFunctionModelWithConfirmation(modelId)
}

export const duplicateFunctionModelWithName = async (modelId: string): Promise<FunctionModel> => {
  const useCases = new FunctionModelUseCases(
    new SupabaseFunctionModelRepository(),
    new SupabaseNodeRelationshipRepository()
  )
  return useCases.duplicateFunctionModelWithName(modelId)
} 