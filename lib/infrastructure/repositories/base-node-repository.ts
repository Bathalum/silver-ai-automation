// Base Node Repository Interface
// This file implements the base repository pattern for all node types across features

import { BaseNode, FeatureType } from '@/lib/domain/entities/base-node-types'
import { NodeLink } from '@/lib/domain/entities/cross-feature-link-types'
import { AIAgentConfig } from '@/lib/domain/entities/ai-integration-types'

export interface BaseNodeRepository {
  // Universal node operations (work across all node types)
  createNode<T extends BaseNode>(node: Omit<T, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<T>
  getNode<T extends BaseNode>(featureType: FeatureType, entityId: string, nodeId?: string): Promise<T | null>
  updateNode<T extends BaseNode>(featureType: FeatureType, entityId: string, nodeId: string, updates: Partial<T>): Promise<T>
  deleteNode(featureType: FeatureType, entityId: string, nodeId: string): Promise<void>
  
  // Cross-feature operations
  createNodeLink(link: Omit<NodeLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<NodeLink>
  getNodeLinks(featureType: FeatureType, entityId: string, nodeId?: string): Promise<NodeLink[]>
  getConnectedNodes(featureType: FeatureType, entityId: string, nodeId?: string): Promise<BaseNode[]>
  
  // AI Integration
  createAIAgent(featureType: FeatureType, entityId: string, nodeId: string, config: AIAgentConfig): Promise<void>
  getAIAgent(featureType: FeatureType, entityId: string, nodeId: string): Promise<AIAgentConfig | null>
  updateAIAgent(featureType: FeatureType, entityId: string, nodeId: string, config: Partial<AIAgentConfig>): Promise<void>
  deleteAIAgent(featureType: FeatureType, entityId: string, nodeId: string): Promise<void>
  
  // Batch operations for performance optimization
  batchCreateNodes<T extends BaseNode>(nodes: Omit<T, 'nodeId' | 'createdAt' | 'updatedAt'>[]): Promise<T[]>
  batchUpdateNodes<T extends BaseNode>(updates: Array<{ featureType: FeatureType; entityId: string; nodeId: string; updates: Partial<T> }>): Promise<T[]>
  batchDeleteNodes(nodes: Array<{ featureType: FeatureType; entityId: string; nodeId: string }>): Promise<void>
  
  // Search and analytics
  searchNodes<T extends BaseNode>(featureType: FeatureType, query: string): Promise<T[]>
  getNodeStatistics(featureType: FeatureType, entityId: string): Promise<{
    totalNodes: number
    nodesByType: Record<string, number>
    nodesWithAI: number
    nodesWithLinks: number
  }>
} 