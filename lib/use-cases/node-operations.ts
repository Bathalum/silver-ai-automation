// Node Operations Use Cases
// Business logic and validation for the unified node system

import type { 
  BaseNode, 
  NodeRelationship, 
  AIAgentConfig,
  RelationshipType,
  FeatureType
} from '@/lib/domain/entities/unified-node-types'
import { SupabaseNodeRepository } from '@/lib/infrastructure/unified-node-repository'

const nodeRepository = new SupabaseNodeRepository()

// Node CRUD Operations
export const createNode = async (node: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<BaseNode> => {
  // Business logic validation
  if (!node.name.trim()) {
    throw new Error('Node name is required')
  }
  
  if (!node.type || !node.nodeType) {
    throw new Error('Node type and node type are required')
  }
  
  if (!node.metadata.feature) {
    throw new Error('Node metadata must include feature information')
  }
  
  // Validate position
  if (typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
    throw new Error('Node position must have valid x and y coordinates')
  }
  
  return await nodeRepository.createNode(node)
}

export const getNode = async (nodeId: string): Promise<BaseNode | null> => {
  if (!nodeId) {
    throw new Error('Node ID is required')
  }
  
  return await nodeRepository.getNode(nodeId)
}

export const updateNode = async (nodeId: string, updates: Partial<BaseNode>): Promise<BaseNode> => {
  if (!nodeId) {
    throw new Error('Node ID is required')
  }
  
  // Business logic validation
  if (updates.name && !updates.name.trim()) {
    throw new Error('Node name cannot be empty')
  }
  
  if (updates.position) {
    if (typeof updates.position.x !== 'number' || typeof updates.position.y !== 'number') {
      throw new Error('Node position must have valid x and y coordinates')
    }
  }
  
  return await nodeRepository.updateNode(nodeId, updates)
}

export const deleteNode = async (nodeId: string): Promise<void> => {
  if (!nodeId) {
    throw new Error('Node ID is required')
  }
  
  // Check for dependencies before deletion
  const relationships = await nodeRepository.getNodeRelationships(nodeId)
  if (relationships.length > 0) {
    console.warn(`Node ${nodeId} has ${relationships.length} active relationships`)
    // Optionally delete relationships automatically
    await nodeRepository.deleteRelationshipsByNode(nodeId)
  }
  
  // Delete associated AI agent if exists
  const aiAgent = await nodeRepository.getAIAgent(nodeId)
  if (aiAgent) {
    await nodeRepository.deleteAIAgent(nodeId)
  }
  
  await nodeRepository.deleteNode(nodeId)
}

export const getNodesByFeature = async (feature: string): Promise<BaseNode[]> => {
  if (!feature) {
    throw new Error('Feature is required')
  }
  
  return await nodeRepository.getNodesByFeature(feature)
}

export const getNodesByType = async (type: FeatureType): Promise<BaseNode[]> => {
  return await nodeRepository.getNodesByType(type)
}

export const getNodesByNodeType = async (nodeType: string): Promise<BaseNode[]> => {
  if (!nodeType) {
    throw new Error('Node type is required')
  }
  
  return await nodeRepository.getNodesByNodeType(nodeType)
}

// Relationship Operations
export const createRelationship = async (
  sourceNodeId: string, 
  targetNodeId: string, 
  relationshipType: RelationshipType,
  metadata?: NodeRelationship['metadata']
): Promise<NodeRelationship> => {
  if (!sourceNodeId || !targetNodeId) {
    throw new Error('Source and target node IDs are required')
  }
  
  // Business logic validation
  if (sourceNodeId === targetNodeId) {
    throw new Error('Cannot create relationship to self')
  }
  
  const sourceNode = await nodeRepository.getNode(sourceNodeId)
  const targetNode = await nodeRepository.getNode(targetNodeId)
  
  if (!sourceNode || !targetNode) {
    throw new Error('Source or target node not found')
  }
  
  // Check for existing relationship
  const existingRelationships = await nodeRepository.getNodeRelationships(sourceNodeId)
  const existingRelationship = existingRelationships.find(
    rel => rel.targetNodeId === targetNodeId && rel.relationshipType === relationshipType
  )
  
  if (existingRelationship) {
    throw new Error('Relationship already exists')
  }
  
  return await nodeRepository.createRelationship({
    sourceNodeId,
    targetNodeId,
    relationshipType,
    metadata: metadata || {
      strength: 1.0,
      bidirectional: false
    }
  })
}

export const getNodeRelationships = async (nodeId: string): Promise<NodeRelationship[]> => {
  if (!nodeId) {
    throw new Error('Node ID is required')
  }
  
  return await nodeRepository.getNodeRelationships(nodeId)
}

export const getIncomingRelationships = async (nodeId: string): Promise<NodeRelationship[]> => {
  if (!nodeId) {
    throw new Error('Node ID is required')
  }
  
  return await nodeRepository.getIncomingRelationships(nodeId)
}

export const getOutgoingRelationships = async (nodeId: string): Promise<NodeRelationship[]> => {
  if (!nodeId) {
    throw new Error('Node ID is required')
  }
  
  return await nodeRepository.getOutgoingRelationships(nodeId)
}

export const deleteRelationship = async (relationshipId: string): Promise<void> => {
  if (!relationshipId) {
    throw new Error('Relationship ID is required')
  }
  
  await nodeRepository.deleteRelationship(relationshipId)
}

export const deleteRelationshipsByNode = async (nodeId: string): Promise<void> => {
  if (!nodeId) {
    throw new Error('Node ID is required')
  }
  
  await nodeRepository.deleteRelationshipsByNode(nodeId)
}

// AI Agent Operations
export const createAIAgent = async (nodeId: string, config: AIAgentConfig): Promise<void> => {
  if (!nodeId) {
    throw new Error('Node ID is required')
  }
  
  // Business logic validation
  if (!config.instructions.trim()) {
    throw new Error('AI agent instructions are required')
  }
  
  if (!config.metadata?.model) {
    throw new Error('AI agent model is required')
  }
  
  // Check if node exists
  const node = await nodeRepository.getNode(nodeId)
  if (!node) {
    throw new Error('Node not found')
  }
  
  // Check if agent already exists
  const existingAgent = await nodeRepository.getAIAgent(nodeId)
  if (existingAgent) {
    throw new Error('AI agent already exists for this node')
  }
  
  await nodeRepository.createAIAgent(nodeId, config)
}

export const updateAIAgent = async (nodeId: string, config: Partial<AIAgentConfig>): Promise<void> => {
  if (!nodeId) {
    throw new Error('Node ID is required')
  }
  
  if (config.instructions !== undefined && !config.instructions.trim()) {
    throw new Error('AI agent instructions cannot be empty')
  }
  
  await nodeRepository.updateAIAgent(nodeId, config)
}

export const getAIAgent = async (nodeId: string): Promise<AIAgentConfig | null> => {
  if (!nodeId) {
    throw new Error('Node ID is required')
  }
  
  return await nodeRepository.getAIAgent(nodeId)
}

export const deleteAIAgent = async (nodeId: string): Promise<void> => {
  if (!nodeId) {
    throw new Error('Node ID is required')
  }
  
  await nodeRepository.deleteAIAgent(nodeId)
}

// Search and Query Operations
export const searchNodes = async (query: string, limit: number = 10): Promise<BaseNode[]> => {
  if (!query.trim()) {
    throw new Error('Search query is required')
  }
  
  if (limit < 1 || limit > 100) {
    throw new Error('Limit must be between 1 and 100')
  }
  
  return await nodeRepository.searchNodes(query, limit)
}

export const getNodesByTags = async (tags: string[]): Promise<BaseNode[]> => {
  if (!tags.length) {
    throw new Error('At least one tag is required')
  }
  
  return await nodeRepository.getNodesByTags(tags)
}

export const getRelatedNodes = async (nodeId: string, relationshipType?: RelationshipType): Promise<BaseNode[]> => {
  if (!nodeId) {
    throw new Error('Node ID is required')
  }
  
  return await nodeRepository.getRelatedNodes(nodeId, relationshipType)
}

// Cross-feature Operations
export const linkNodes = async (
  sourceNodeId: string, 
  targetNodeId: string, 
  relationshipType: RelationshipType = 'reference',
  metadata?: NodeRelationship['metadata']
): Promise<NodeRelationship> => {
  return await createRelationship(sourceNodeId, targetNodeId, relationshipType, metadata)
}

export const getCrossFeatureNodes = async (sourceFeature: string, targetFeature: string): Promise<BaseNode[]> => {
  const sourceNodes = await getNodesByFeature(sourceFeature)
  const targetNodes = await getNodesByFeature(targetFeature)
  
  // Find nodes that have relationships between the two features
  const crossFeatureNodes: BaseNode[] = []
  
  for (const sourceNode of sourceNodes) {
    const relationships = await getNodeRelationships(sourceNode.nodeId)
    for (const relationship of relationships) {
      const targetNodeId = relationship.sourceNodeId === sourceNode.nodeId 
        ? relationship.targetNodeId 
        : relationship.sourceNodeId
      
      const targetNode = targetNodes.find(node => node.nodeId === targetNodeId)
      if (targetNode) {
        crossFeatureNodes.push(sourceNode)
        break
      }
    }
  }
  
  return crossFeatureNodes
}

// Utility Operations
export const validateNodeData = (node: Partial<BaseNode>): string[] => {
  const errors: string[] = []
  
  if (!node.name?.trim()) {
    errors.push('Node name is required')
  }
  
  if (!node.type) {
    errors.push('Node type is required')
  }
  
  if (!node.nodeType) {
    errors.push('Node type is required')
  }
  
  if (node.position) {
    if (typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      errors.push('Node position must have valid x and y coordinates')
    }
  }
  
  if (node.metadata && !node.metadata.feature) {
    errors.push('Node metadata must include feature information')
  }
  
  return errors
}

export const validateRelationshipData = (
  sourceNodeId: string, 
  targetNodeId: string, 
  relationshipType: string
): string[] => {
  const errors: string[] = []
  
  if (!sourceNodeId) {
    errors.push('Source node ID is required')
  }
  
  if (!targetNodeId) {
    errors.push('Target node ID is required')
  }
  
  if (sourceNodeId === targetNodeId) {
    errors.push('Cannot create relationship to self')
  }
  
  if (!relationshipType) {
    errors.push('Relationship type is required')
  }
  
  return errors
} 