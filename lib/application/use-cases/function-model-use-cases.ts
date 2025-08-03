import { FunctionModelNode, FunctionModelNodeOptions, NodeUpdateValidation } from '../../domain/entities/function-model-node-types'
import { validateConnection, getConnectionValidationMessage } from '../../domain/entities/function-model-connection-rules'
import { FunctionModelRepository } from '../../infrastructure/repositories/function-model-repository'
import { SupabaseNodeRelationshipRepository } from '../../infrastructure/repositories/node-relationship-repository'

// Initialize correct repositories
const functionModelRepository = new FunctionModelRepository()
const nodeRelationshipRepository = new SupabaseNodeRelationshipRepository()

export const createFunctionModelNode = async (
  nodeType: FunctionModelNode['nodeType'],
  name: string,
  position: { x: number; y: number },
  modelId: string, // ADD modelId parameter
  options: FunctionModelNodeOptions = {}
): Promise<FunctionModelNode> => {
  // Preserve ALL existing validation
  if (!name.trim()) throw new Error('Node name is required')
  if (!nodeType) throw new Error('Node type is required')
  if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
    throw new Error('Valid position is required')
  }
  
  // Create node with ALL existing data structures
  const node: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'> = {
    modelId, // ADD modelId
    type: 'function-model',
    nodeType,
    name: name.trim(),
    description: options.description || '',
    position,
    metadata: {
      feature: 'function-model',
      version: '1.0',
      tags: options.metadata?.tags || [nodeType, 'function-model'],
      searchKeywords: options.metadata?.searchKeywords || [name, nodeType],
      crossFeatureLinks: options.metadata?.crossFeatureLinks || [],
      aiAgent: options.metadata?.aiAgent,
      vectorEmbedding: options.metadata?.vectorEmbedding
    },
    functionModelData: {},
    businessLogic: {
      complexity: 'simple',
      estimatedDuration: 0,
      ...options.businessLogic
    },
    processBehavior: {
      executionType: 'sequential',
      dependencies: [],
      triggers: [],
      ...options.processBehavior
    },
    reactFlowData: {
      draggable: true,
      selectable: true,
      deletable: true,
      ...options.reactFlowData
    },
    relationships: []
  }

  return await functionModelRepository.createFunctionModelNode(node)
}

export const updateFunctionModelNode = async (
  nodeId: string,
  updates: Partial<FunctionModelNode>
): Promise<FunctionModelNode> => {
  // Preserve ALL existing validation
  const validationResult = await validateNodeUpdates(nodeId, updates)
  if (!validationResult.isValid) {
    throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`)
  }

  return await functionModelRepository.updateFunctionModelNode(nodeId, updates)
}

export const createNodeRelationship = async (
  sourceNodeId: string,
  targetNodeId: string,
  sourceHandle: string,
  targetHandle: string,
  modelId: string // ADD modelId parameter
): Promise<FunctionModelNode['relationships'][0]> => {
  // Preserve connection validation
  const sourceNode = await functionModelRepository.getFunctionModelNodeById(modelId, sourceNodeId)
  const targetNode = await functionModelRepository.getFunctionModelNodeById(modelId, targetNodeId)
  
  if (!sourceNode) {
    throw new Error(`Source node not found: ${sourceNodeId}`)
  }
  
  if (!targetNode) {
    throw new Error(`Target node not found: ${targetNodeId}`)
  }
  
  if (!validateConnection(sourceNode, targetNode, sourceHandle, targetHandle)) {
    const errorMessage = getConnectionValidationMessage(sourceNode, targetNode, sourceHandle, targetHandle)
    throw new Error(errorMessage || 'Invalid connection')
  }
  
  const relationship = await nodeRelationshipRepository.createFunctionModelRelationship(
    sourceNodeId,
    targetNodeId,
    sourceHandle,
    targetHandle,
    modelId
  )
  
  return {
    id: relationship.id,
    sourceNodeId: relationship.sourceNodeId,
    targetNodeId: relationship.targetNodeId,
    sourceHandle: relationship.sourceHandle,
    targetHandle: relationship.targetHandle,
    type: relationship.type,
    metadata: relationship.metadata
  }
}

export const deleteNodeRelationship = async (
  relationshipId: string
): Promise<void> => {
  await nodeRelationshipRepository.delete(relationshipId)
}

export const getFunctionModelNodes = async (modelId: string): Promise<FunctionModelNode[]> => {
  return await functionModelRepository.getFunctionModelNodes(modelId)
}

export const getNodeRelationships = async (modelId: string): Promise<FunctionModelNode['relationships']> => {
  const relationships = await nodeRelationshipRepository.getByModelId(modelId)
  return relationships.map(rel => ({
    id: rel.id,
    sourceNodeId: rel.sourceNodeId,
    targetNodeId: rel.targetNodeId,
    sourceHandle: rel.sourceHandle,
    targetHandle: rel.targetHandle,
    type: rel.type,
    metadata: rel.metadata
  }))
}

export const deleteFunctionModelNode = async (nodeId: string): Promise<void> => {
  // Delete all relationships first
  const relationships = await nodeRelationshipRepository.getByNodeId(nodeId)
  for (const relationship of relationships) {
    await nodeRelationshipRepository.delete(relationship.id)
  }
  
  // Delete the node
  await functionModelRepository.deleteFunctionModelNode(nodeId)
}

export const validateNodeUpdates = async (
  nodeId: string,
  updates: Partial<FunctionModelNode>
): Promise<NodeUpdateValidation> => {
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
  
  // Validate business logic
  if (updates.businessLogic !== undefined) {
    if (updates.businessLogic.complexity && 
        !['simple', 'moderate', 'complex'].includes(updates.businessLogic.complexity)) {
      errors.push('Complexity must be simple, moderate, or complex')
    }
    
    if (updates.businessLogic.estimatedDuration !== undefined && 
        updates.businessLogic.estimatedDuration < 0) {
      errors.push('Estimated duration cannot be negative')
    }
  }
  
  // Validate process behavior
  if (updates.processBehavior !== undefined) {
    if (updates.processBehavior.executionType && 
        !['sequential', 'parallel', 'conditional'].includes(updates.processBehavior.executionType)) {
      errors.push('Execution type must be sequential, parallel, or conditional')
    }
  }
  
  // Validate function model data
  if (updates.functionModelData !== undefined) {
    const data = updates.functionModelData
    
    // Validate stage data
    if (data.stage) {
      if (!data.stage.name?.trim()) {
        errors.push('Stage name is required')
      }
      if (!Array.isArray(data.stage.actions)) {
        errors.push('Stage actions must be an array')
      }
      if (!Array.isArray(data.stage.dataChange)) {
        errors.push('Stage data changes must be an array')
      }
      if (!Array.isArray(data.stage.boundaryCriteria)) {
        errors.push('Stage boundary criteria must be an array')
      }
    }
    
    // Validate action data
    if (data.action) {
      if (!data.action.name?.trim()) {
        errors.push('Action name is required')
      }
      if (!['action', 'action-group'].includes(data.action.type)) {
        errors.push('Action type must be action or action-group')
      }
    }
    
    // Validate IO data
    if (data.io) {
      if (!data.io.name?.trim()) {
        errors.push('IO name is required')
      }
      if (!['input', 'output'].includes(data.io.mode)) {
        errors.push('IO mode must be input or output')
      }
      if (!Array.isArray(data.io.masterData)) {
        errors.push('IO master data must be an array')
      }
      if (!Array.isArray(data.io.referenceData)) {
        errors.push('IO reference data must be an array')
      }
      if (!Array.isArray(data.io.transactionData)) {
        errors.push('IO transaction data must be an array')
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export const getNodeById = async (nodeId: string, modelId: string): Promise<FunctionModelNode | null> => {
  // Use the repository method to get node by ID
  return await functionModelRepository.getFunctionModelNodeById(modelId, nodeId)
}

export const searchFunctionModelNodes = async (
  modelId: string,
  searchTerm: string
): Promise<FunctionModelNode[]> => {
  const nodes = await getFunctionModelNodes(modelId)
  
  return nodes.filter(node => 
    node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.metadata.searchKeywords?.some(keyword => 
      keyword.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )
}

export const getNodesByType = async (
  modelId: string,
  nodeType: FunctionModelNode['nodeType']
): Promise<FunctionModelNode[]> => {
  const nodes = await getFunctionModelNodes(modelId)
  return nodes.filter(node => node.nodeType === nodeType)
}

export const getConnectedNodes = async (
  nodeId: string,
  modelId: string
): Promise<{ incoming: FunctionModelNode[], outgoing: FunctionModelNode[] }> => {
  const [incomingRelationships, outgoingRelationships] = await Promise.all([
    nodeRelationshipRepository.getBySourceNodeId(nodeId),
    nodeRelationshipRepository.getByTargetNodeId(nodeId)
  ])
  
  const incomingNodeIds = incomingRelationships.map(rel => rel.targetNodeId)
  const outgoingNodeIds = outgoingRelationships.map(rel => rel.sourceNodeId)
  
  const [incomingNodes, outgoingNodes] = await Promise.all([
    Promise.all(incomingNodeIds.map(id => functionModelRepository.getFunctionModelNodeById(modelId, id))),
    Promise.all(outgoingNodeIds.map(id => functionModelRepository.getFunctionModelNodeById(modelId, id)))
  ])
  
  return {
    incoming: incomingNodes.filter(Boolean) as FunctionModelNode[],
    outgoing: outgoingNodes.filter(Boolean) as FunctionModelNode[]
  }
}

// Cross-feature linking methods
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
  return await functionModelRepository.createCrossFeatureLink(
    sourceFeature,
    sourceId,
    sourceNodeId,
    targetFeature,
    targetId,
    targetNodeId,
    linkType,
    context
  )
}

export const getCrossFeatureLinks = async (
  sourceId: string,
  sourceFeature: string
): Promise<any[]> => {
  return await functionModelRepository.getCrossFeatureLinks(sourceId, sourceFeature)
}

export const deleteCrossFeatureLink = async (linkId: string): Promise<void> => {
  return await functionModelRepository.deleteCrossFeatureLink(linkId)
} 