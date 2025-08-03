import { FunctionModelNode } from '../../domain/entities/function-model-node-types'
import { BaseNode } from '../../domain/entities/unified-node-types'
import { UnifiedNodeRepository } from './unified-node-repository'
import { SupabaseNodeRelationshipRepository } from './node-relationship-repository'

export class FunctionModelNodeRepository {
  private unifiedNodeRepository = new UnifiedNodeRepository()
  private relationshipRepository = new SupabaseNodeRelationshipRepository()

  async create(node: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<FunctionModelNode> {
    // Convert to unified node format while preserving ALL data
    const unifiedNode: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'> = {
      type: 'function-model',
      nodeType: node.nodeType,
      name: node.name,
      description: node.description,
      position: node.position,
      metadata: {
        ...node.metadata,
        functionModel: {
          functionModelData: node.functionModelData,
          businessLogic: node.businessLogic,
          processBehavior: node.processBehavior,
          reactFlowData: node.reactFlowData,
          relationships: node.relationships
        }
      }
    }

    const createdNode = await this.unifiedNodeRepository.create(unifiedNode)
    return this.convertToFunctionModelNode(createdNode)
  }

  async update(nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode> {
    const unifiedUpdates = this.convertUpdatesToUnified(updates)
    const updatedNode = await this.unifiedNodeRepository.update(nodeId, unifiedUpdates)
    return this.convertToFunctionModelNode(updatedNode)
  }

  async getById(nodeId: string): Promise<FunctionModelNode | null> {
    const unifiedNode = await this.unifiedNodeRepository.getById(nodeId)
    if (!unifiedNode) return null
    return this.convertToFunctionModelNode(unifiedNode)
  }

  async getByModelId(modelId: string): Promise<FunctionModelNode[]> {
    const unifiedNodes = await this.unifiedNodeRepository.getByFeature('function-model', modelId)
    return unifiedNodes.map(node => this.convertToFunctionModelNode(node))
  }

  async getRelationships(modelId: string): Promise<FunctionModelNode['relationships']> {
    const nodes = await this.getByModelId(modelId)
    const nodeIds = nodes.map(node => node.nodeId)
    return await this.relationshipRepository.getByNodeIds(nodeIds)
  }

  async delete(nodeId: string): Promise<void> {
    await this.unifiedNodeRepository.delete(nodeId)
  }

  async search(modelId: string, searchTerm: string): Promise<FunctionModelNode[]> {
    const nodes = await this.getByModelId(modelId)
    
    return nodes.filter(node => 
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.metadata.searchKeywords?.some(keyword => 
        keyword.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }

  async getByType(modelId: string, nodeType: FunctionModelNode['nodeType']): Promise<FunctionModelNode[]> {
    const nodes = await this.getByModelId(modelId)
    return nodes.filter(node => node.nodeType === nodeType)
  }

  async getConnectedNodes(nodeId: string, modelId: string): Promise<{ incoming: FunctionModelNode[], outgoing: FunctionModelNode[] }> {
    const relationships = await this.getRelationships(modelId)
    const allNodes = await this.getByModelId(modelId)
    
    const incoming = allNodes.filter(node => 
      relationships.some(rel => 
        rel.targetNodeId === nodeId && rel.sourceNodeId === node.nodeId
      )
    )
    
    const outgoing = allNodes.filter(node => 
      relationships.some(rel => 
        rel.sourceNodeId === nodeId && rel.targetNodeId === node.nodeId
      )
    )
    
    return { incoming, outgoing }
  }

  async bulkUpdate(modelId: string, updates: Partial<FunctionModelNode>): Promise<void> {
    const nodes = await this.getByModelId(modelId)
    
    await Promise.all(
      nodes.map(node => this.update(node.nodeId, updates))
    )
  }

  async bulkCreate(nodes: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>[]): Promise<FunctionModelNode[]> {
    const createdNodes: FunctionModelNode[] = []
    
    for (const node of nodes) {
      const createdNode = await this.create(node)
      createdNodes.push(createdNode)
    }
    
    return createdNodes
  }

  async getStatistics(modelId: string): Promise<{
    totalNodes: number
    nodesByType: Record<string, number>
    nodesByExecutionType: Record<string, number>
    nodesWithSLA: number
    nodesWithKPIs: number
  }> {
    const nodes = await this.getByModelId(modelId)
    
    const nodesByType: Record<string, number> = {}
    const nodesByExecutionType: Record<string, number> = {}
    let nodesWithSLA = 0
    let nodesWithKPIs = 0
    
    for (const node of nodes) {
      // Count by type
      nodesByType[node.nodeType] = (nodesByType[node.nodeType] || 0) + 1
      
      // Count by execution type
      const executionType = node.processBehavior.executionType
      nodesByExecutionType[executionType] = (nodesByExecutionType[executionType] || 0) + 1
      
      // Count nodes with SLA
      if (node.businessLogic.sla !== undefined) {
        nodesWithSLA++
      }
      
      // Count nodes with KPIs
      if (node.businessLogic.kpis && node.businessLogic.kpis.length > 0) {
        nodesWithKPIs++
      }
    }
    
    return {
      totalNodes: nodes.length,
      nodesByType,
      nodesByExecutionType,
      nodesWithSLA,
      nodesWithKPIs
    }
  }

  private convertToFunctionModelNode(unifiedNode: BaseNode): FunctionModelNode {
    const functionModelData = unifiedNode.metadata.functionModel || {
      functionModelData: {},
      businessLogic: { complexity: 'simple', estimatedDuration: 0 },
      processBehavior: { executionType: 'sequential', dependencies: [], triggers: [] },
      reactFlowData: { draggable: true, selectable: true, deletable: true },
      relationships: []
    }
    
    return {
      nodeId: unifiedNode.nodeId,
      type: 'function-model',
      nodeType: unifiedNode.nodeType as FunctionModelNode['nodeType'],
      name: unifiedNode.name,
      description: unifiedNode.description,
      position: unifiedNode.position,
      metadata: unifiedNode.metadata,
      functionModelData: functionModelData.functionModelData,
      businessLogic: functionModelData.businessLogic,
      processBehavior: functionModelData.processBehavior,
      reactFlowData: functionModelData.reactFlowData,
      relationships: functionModelData.relationships,
      createdAt: unifiedNode.createdAt,
      updatedAt: unifiedNode.updatedAt
    }
  }

  private convertUpdatesToUnified(updates: Partial<FunctionModelNode>): Partial<BaseNode> {
    const unifiedUpdates: Partial<BaseNode> = {}
    
    // Convert basic fields
    if (updates.name !== undefined) unifiedUpdates.name = updates.name
    if (updates.description !== undefined) unifiedUpdates.description = updates.description
    if (updates.position !== undefined) unifiedUpdates.position = updates.position
    if (updates.nodeType !== undefined) unifiedUpdates.nodeType = updates.nodeType
    
    // Convert metadata
    if (updates.metadata !== undefined) {
      unifiedUpdates.metadata = {
        ...updates.metadata,
        functionModel: {
          functionModelData: updates.functionModelData,
          businessLogic: updates.businessLogic,
          processBehavior: updates.processBehavior,
          reactFlowData: updates.reactFlowData,
          relationships: updates.relationships
        }
      }
    }
    
    return unifiedUpdates
  }
} 