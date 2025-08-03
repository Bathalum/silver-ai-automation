import { FunctionModelRepository } from '../repositories/function-model-repository'
import { NodeMetadataRepository } from '../repositories/node-metadata-repository'
import { NodeLinksRepository } from '../repositories/node-links-repository'
import { FunctionModelNode, NodeLink, NodeBehavior, ExecutionResult, ValidationResult } from '@/lib/domain/entities/function-model-node-types'
import { NodeBehaviorFactory } from '@/lib/domain/entities/function-model-node-types'

export class UnifiedNodeOperations {
  private functionModelRepository: FunctionModelRepository
  private nodeMetadataRepository: NodeMetadataRepository
  private nodeLinksRepository: NodeLinksRepository

  constructor() {
    this.functionModelRepository = new FunctionModelRepository()
    this.nodeMetadataRepository = new NodeMetadataRepository()
    this.nodeLinksRepository = new NodeLinksRepository()
  }

  // Universal node operations (work across all node types)
  async createNode<T extends FunctionModelNode>(node: Omit<T, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<T> {
    // Create the node in the feature-specific table
    const createdNode = await this.functionModelRepository.createFunctionModelNode(node)

    // Create metadata for the node
    await this.nodeMetadataRepository.createNodeMetadata({
      featureType: node.featureType,
      entityId: node.modelId,
      nodeId: createdNode.nodeId,
      nodeType: node.nodeType,
      positionX: node.positionX,
      positionY: node.positionY,
      searchKeywords: this.extractSearchKeywords(node),
      visualProperties: this.getDefaultVisualProperties(node.nodeType),
      aiAgentConfig: this.getDefaultAIAgentConfig(node.nodeType)
    })

    return createdNode as T
  }

  async getNode<T extends FunctionModelNode>(modelId: string, nodeId: string): Promise<T | null> {
    const node = await this.functionModelRepository.getFunctionModelNodeById(nodeId)
    if (!node) return null

    // Get metadata for the node
    const metadata = await this.nodeMetadataRepository.getNodeMetadata(
      node.featureType,
      node.modelId,
      node.nodeId
    )

    // Combine node data with metadata
    const enrichedNode = {
      ...node,
      metadata: {
        ...node.metadata,
        visualProperties: metadata?.visualProperties,
        searchKeywords: metadata?.searchKeywords,
        aiAgentConfig: metadata?.aiAgentConfig
      }
    }

    return enrichedNode as T
  }

  async updateNode<T extends FunctionModelNode>(nodeId: string, updates: Partial<T>): Promise<T> {
    // Update the node in the feature-specific table
    const updatedNode = await this.functionModelRepository.updateFunctionModelNode(nodeId, updates)

    // Update metadata if position or other metadata fields changed
    if (updates.positionX !== undefined || updates.positionY !== undefined) {
      const metadata = await this.nodeMetadataRepository.getNodeMetadata(
        updatedNode.featureType,
        updatedNode.modelId,
        updatedNode.nodeId
      )

      if (metadata) {
        await this.nodeMetadataRepository.updateNodeMetadata(metadata.metadataId, {
          positionX: updates.positionX,
          positionY: updates.positionY
        })
      }
    }

    return updatedNode as T
  }

  async deleteNode(nodeId: string): Promise<void> {
    // Get the node first to get metadata info
    const node = await this.functionModelRepository.getFunctionModelNodeById(nodeId)
    if (!node) return

    // Delete metadata
    const metadata = await this.nodeMetadataRepository.getNodeMetadata(
      node.featureType,
      node.modelId,
      node.nodeId
    )
    if (metadata) {
      await this.nodeMetadataRepository.deleteNodeMetadata(metadata.metadataId)
    }

    // Delete all links involving this node
    const links = await this.nodeLinksRepository.getNodeLinks(node.featureType, node.modelId, node.nodeId)
    for (const link of links) {
      await this.nodeLinksRepository.deleteNodeLink(link.linkId)
    }

    // Delete the node
    await this.functionModelRepository.deleteFunctionModelNode(nodeId)
  }

  // Cross-feature operations
  async createNodeLink(link: Omit<NodeLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<NodeLink> {
    return await this.nodeLinksRepository.createNodeLink(link)
  }

  async getNodeLinks(modelId: string, nodeId?: string): Promise<NodeLink[]> {
    return await this.nodeLinksRepository.getNodeLinks('function-model', modelId, nodeId)
  }

  async getConnectedNodes(modelId: string, nodeId?: string): Promise<FunctionModelNode[]> {
    const { sourceNodes, targetNodes } = await this.nodeLinksRepository.getConnectedNodes(
      'function-model',
      modelId,
      nodeId
    )

    const connectedNodes: FunctionModelNode[] = []

    // Get source nodes
    for (const link of sourceNodes) {
      if (link.targetFeature === 'function-model') {
        const node = await this.functionModelRepository.getFunctionModelNodeById(link.targetNodeId!)
        if (node) connectedNodes.push(node)
      }
    }

    // Get target nodes
    for (const link of targetNodes) {
      if (link.sourceFeature === 'function-model') {
        const node = await this.functionModelRepository.getFunctionModelNodeById(link.sourceNodeId!)
        if (node) connectedNodes.push(node)
      }
    }

    return connectedNodes
  }

  // Feature-specific operations
  async executeNode(nodeId: string, context?: any): Promise<ExecutionResult> {
    const node = await this.functionModelRepository.getFunctionModelNodeById(nodeId)
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`)
    }

    const behavior = NodeBehaviorFactory.createBehavior(node)
    return await behavior.execute()
  }

  async validateNode(nodeId: string): Promise<ValidationResult> {
    const node = await this.functionModelRepository.getFunctionModelNodeById(nodeId)
    if (!node) {
      return { isValid: false, errors: [`Node not found: ${nodeId}`] }
    }

    const behavior = NodeBehaviorFactory.createBehavior(node)
    return await behavior.validate()
  }

  async getNodeBehavior(nodeId: string): Promise<NodeBehavior> {
    const node = await this.functionModelRepository.getFunctionModelNodeById(nodeId)
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`)
    }

    return NodeBehaviorFactory.createBehavior(node)
  }

  // Advanced operations
  async searchNodes(query: string, filters?: {
    nodeType?: string
    modelId?: string
    positionRange?: { x: number; y: number; width: number; height: number }
  }): Promise<FunctionModelNode[]> {
    // Search in metadata first
    const metadataResults = await this.nodeMetadataRepository.searchNodeMetadata(
      'function-model',
      query,
      {
        nodeType: filters?.nodeType,
        positionRange: filters?.positionRange
      }
    )

    // Get the actual nodes
    const nodes: FunctionModelNode[] = []
    for (const metadata of metadataResults) {
      if (filters?.modelId && metadata.entityId !== filters.modelId) continue
      
      const node = await this.functionModelRepository.getFunctionModelNodeById(metadata.nodeId!)
      if (node) nodes.push(node)
    }

    return nodes
  }

  async getNodesByModel(modelId: string): Promise<FunctionModelNode[]> {
    return await this.functionModelRepository.getFunctionModelNodes(modelId)
  }

  async updateNodePosition(nodeId: string, positionX: number, positionY: number): Promise<void> {
    // Update the node
    await this.functionModelRepository.updateFunctionModelNode(nodeId, {
      positionX,
      positionY
    })

    // Update metadata
    const node = await this.functionModelRepository.getFunctionModelNodeById(nodeId)
    if (node) {
      const metadata = await this.nodeMetadataRepository.getNodeMetadata(
        node.featureType,
        node.modelId,
        node.nodeId
      )
      if (metadata) {
        await this.nodeMetadataRepository.updateNodeMetadata(metadata.metadataId, {
          positionX,
          positionY
        })
      }
    }
  }

  async updateNodeVisualProperties(nodeId: string, properties: Record<string, any>): Promise<void> {
    const node = await this.functionModelRepository.getFunctionModelNodeById(nodeId)
    if (!node) return

    const metadata = await this.nodeMetadataRepository.getNodeMetadata(
      node.featureType,
      node.modelId,
      node.nodeId
    )
    if (metadata) {
      await this.nodeMetadataRepository.updateVisualProperties(metadata.metadataId, properties)
    }
  }

  // Helper methods
  private extractSearchKeywords(node: FunctionModelNode): string[] {
    const keywords: string[] = []
    
    if (node.name) keywords.push(node.name)
    if (node.description) keywords.push(node.description)
    
    // Extract keywords from function model data
    if (node.functionModelData.stage?.name) keywords.push(node.functionModelData.stage.name)
    if (node.functionModelData.action?.name) keywords.push(node.functionModelData.action.name)
    if (node.functionModelData.io?.name) keywords.push(node.functionModelData.io.name)
    if (node.functionModelData.container?.name) keywords.push(node.functionModelData.container.name)
    
    return keywords
  }

  private getDefaultVisualProperties(nodeType: string): Record<string, any> {
    const properties: Record<string, any> = {
      color: this.getNodeColor(nodeType),
      icon: this.getNodeIcon(nodeType),
      size: 'medium'
    }

    return properties
  }

  private getDefaultAIAgentConfig(nodeType: string): Record<string, any> {
    return {
      enabled: false,
      capabilities: ['analysis', 'optimization'],
      context: {
        nodeType,
        executionMode: 'sequential'
      }
    }
  }

  private getNodeColor(nodeType: string): string {
    const colors: Record<string, string> = {
      stageNode: '#10b981',
      actionTableNode: '#3b82f6',
      ioNode: '#f59e0b',
      functionModelContainer: '#8b5cf6'
    }
    return colors[nodeType] || '#6b7280'
  }

  private getNodeIcon(nodeType: string): string {
    const icons: Record<string, string> = {
      stageNode: 'layers',
      actionTableNode: 'table',
      ioNode: 'arrow-left-right',
      functionModelContainer: 'git-branch'
    }
    return icons[nodeType] || 'circle'
  }
} 