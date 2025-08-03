// Function Model Node Migration Layer
// This file handles migration from existing FunctionModel structure to new node-based architecture
// while preserving 100% of existing functionality

import type { FunctionModel, NodeRelationship } from '@/lib/domain/entities/function-model-types'
import type { FunctionModelNode } from '@/lib/domain/entities/function-model-node-types'
import type { NodeLinkRecord } from '@/lib/infrastructure/repositories/node-links-repository'
import type { NodeMetadataRecord } from '@/lib/infrastructure/repositories/node-metadata-repository'
import type { LinkType } from '@/lib/domain/entities/cross-feature-link-types'
import { createFunctionModelNode } from '@/lib/domain/entities/function-model-node-types'
import type { Node, Edge } from 'reactflow'

// Extended NodeData interface to match the actual structure used in the old system
interface ExtendedNodeData {
  id: string
  type: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
  position: { x: number; y: number }
  data: {
    label: string
    description?: string
    stage?: any
    action?: any
    io?: any
    container?: any
    modes?: any
  }
}

export interface MigrationResult {
  nodes: FunctionModelNode[]
  metadata: NodeMetadataRecord[]
  links: NodeLinkRecord[]
  success: boolean
  errors: string[]
  warnings: string[]
}

export interface MigrationOptions {
  preserveExistingData?: boolean
  createMetadata?: boolean
  createLinks?: boolean
  validateAfterMigration?: boolean
}

/**
 * Migrates existing FunctionModel to new node-based architecture
 * Preserves ALL existing functionality and data
 */
export class FunctionModelNodeMigration {
  
  /**
   * Migrate existing FunctionModel to new node-based structure
   */
  static migrateFunctionModel(
    functionModel: FunctionModel,
    options: MigrationOptions = {}
  ): MigrationResult {
    const {
      preserveExistingData = true,
      createMetadata = true,
      createLinks = true,
      validateAfterMigration = true
    } = options

    const result: MigrationResult = {
      nodes: [],
      metadata: [],
      links: [],
      success: true,
      errors: [],
      warnings: []
    }

    try {
      // Step 1: Convert existing nodes to new node structure
      const nodes = this.migrateNodes(functionModel.nodesData || [], functionModel.modelId)
      result.nodes = nodes

      // Step 2: Create metadata for nodes
      if (createMetadata) {
        const metadata = this.createNodeMetadata(nodes, functionModel.modelId)
        result.metadata = metadata
      }

      // Step 3: Convert existing relationships to new link structure
      if (createLinks) {
        const links = this.migrateRelationships(
          functionModel.relationships || [],
          functionModel.modelId
        )
        result.links = links
      }

      // Step 4: Validate migration if requested
      if (validateAfterMigration) {
        const validation = this.validateMigration(result, functionModel)
        if (!validation.success) {
          result.success = false
          result.errors.push(...validation.errors)
        }
        result.warnings.push(...validation.warnings)
      }

    } catch (error) {
      result.success = false
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Convert existing NodeData to new FunctionModelNode structure
   */
  private static migrateNodes(nodesData: Node[], modelId: string): FunctionModelNode[] {
    return nodesData.map(nodeData => {
      const nodeId = nodeData.id
      const position = nodeData.position || { x: 0, y: 0 }
      const extendedData = nodeData.data as ExtendedNodeData['data']

      // Determine node type and create appropriate node
      switch (nodeData.type) {
        case 'stageNode':
          return this.migrateStageNode(extendedData, modelId, nodeId, position)
        
        case 'actionTableNode':
          return this.migrateActionTableNode(extendedData, modelId, nodeId, position)
        
        case 'ioNode':
          return this.migrateIONode(extendedData, modelId, nodeId, position)
        
        case 'functionModelContainer':
          return this.migrateFunctionModelContainerNode(extendedData, modelId, nodeId, position)
        
        default:
          throw new Error(`Unknown node type: ${nodeData.type}`)
      }
    })
  }

  /**
   * Migrate StageNode to new structure
   */
  private static migrateStageNode(
    nodeData: ExtendedNodeData['data'],
    modelId: string,
    nodeId: string,
    position: { x: number; y: number }
  ): FunctionModelNode {
    const stageData = nodeData.stage || {
      id: nodeId,
      name: nodeData.label || 'New Stage',
      description: nodeData.description || '',
      actions: [],
      dataChange: [],
      boundaryCriteria: [],
      raci: {
        responsible: [],
        accountable: [],
        consult: [],
        inform: []
      }
    }

    const node = createFunctionModelNode('stageNode', stageData.name, position, {
      description: stageData.description,
      functionModelData: {
        stage: stageData
      },
      processBehavior: {
        executionType: 'sequential',
        dependencies: [],
        timeout: undefined,
        retryPolicy: undefined
      },
      businessLogic: {
        raciMatrix: stageData.raci,
        sla: undefined,
        kpis: undefined
      },
      visualProperties: {
        color: '#FBBF24', // Amber-400 for stage nodes
        icon: 'stage',
        size: 'medium'
      },
      metadata: {
        tags: ['stage', 'function-model'],
        searchKeywords: [stageData.name.toLowerCase(), 'stage', 'function-model'],
        crossFeatureLinks: []
      }
    })

    // Add the required properties that createFunctionModelNode doesn't include
    return {
      ...node,
      id: nodeId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * Migrate ActionTableNode to new structure
   */
  private static migrateActionTableNode(
    nodeData: ExtendedNodeData['data'],
    modelId: string,
    nodeId: string,
    position: { x: number; y: number }
  ): FunctionModelNode {
    const actionData = nodeData.action || {
      id: nodeId,
      name: nodeData.label || 'Actions',
      description: nodeData.description || '',
      type: 'action'
    }

    // Preserve existing modes and rows
    const modes = nodeData.modes || {
      actions: { rows: [] },
      dataChanges: { rows: [] },
      boundaryCriteria: { rows: [] }
    }

    const node = createFunctionModelNode('actionTableNode', actionData.name, position, {
      description: actionData.description,
      functionModelData: {
        action: {
          ...actionData,
          modes,
          steps: modes.actions?.rows?.map((row: any, index: number) => ({
            id: `step-${index}`,
            description: row.title || row.description || `Step ${index + 1}`,
            status: 'pending',
            raci: row.raci || {
              responsible: '',
              accountable: '',
              consult: '',
              inform: ''
            }
          })) || []
        }
      },
      processBehavior: {
        executionType: 'sequential',
        dependencies: [],
        timeout: undefined,
        retryPolicy: undefined
      },
      businessLogic: {
        raciMatrix: undefined,
        sla: undefined,
        kpis: undefined
      },
      visualProperties: {
        color: '#34D399', // Emerald-400 for action nodes
        icon: 'action',
        size: 'medium'
      },
      metadata: {
        tags: ['action', 'function-model'],
        searchKeywords: [actionData.name.toLowerCase(), 'action', 'function-model'],
        crossFeatureLinks: []
      }
    })

    return {
      ...node,
      id: nodeId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * Migrate IONode to new structure
   */
  private static migrateIONode(
    nodeData: ExtendedNodeData['data'],
    modelId: string,
    nodeId: string,
    position: { x: number; y: number }
  ): FunctionModelNode {
    const ioData = nodeData.io || {
      id: nodeId,
      name: nodeData.label || 'I/O',
      description: nodeData.description || '',
      mode: 'input'
    }

    const node = createFunctionModelNode('ioNode', ioData.name, position, {
      description: ioData.description,
      functionModelData: {
        io: {
          ...ioData,
          inputPorts: [
            {
              id: `input-${nodeId}`,
              name: 'Input',
              dataType: 'any',
              defaultValue: '',
              description: 'Input port'
            }
          ],
          outputPorts: [
            {
              id: `output-${nodeId}`,
              name: 'Output',
              dataType: 'any',
              defaultValue: '',
              description: 'Output port'
            }
          ]
        }
      },
      processBehavior: {
        executionType: 'sequential',
        dependencies: [],
        timeout: undefined,
        retryPolicy: undefined
      },
      businessLogic: {
        raciMatrix: undefined,
        sla: undefined,
        kpis: undefined
      },
      visualProperties: {
        color: ioData.mode === 'input' ? '#10B981' : '#F59E0B', // Green for input, orange for output
        icon: 'io',
        size: 'medium'
      },
      metadata: {
        tags: ['io', 'function-model', ioData.mode],
        searchKeywords: [ioData.name.toLowerCase(), 'io', ioData.mode, 'function-model'],
        crossFeatureLinks: []
      }
    })

    return {
      ...node,
      id: nodeId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * Migrate FunctionModelContainerNode to new structure
   */
  private static migrateFunctionModelContainerNode(
    nodeData: ExtendedNodeData['data'],
    modelId: string,
    nodeId: string,
    position: { x: number; y: number }
  ): FunctionModelNode {
    const containerData = nodeData.container || {
      id: nodeId,
      name: nodeData.label || 'Container',
      description: nodeData.description || '',
      type: 'container'
    }

    const node = createFunctionModelNode('functionModelContainer', containerData.name, position, {
      description: containerData.description,
      functionModelData: {
        container: containerData
      },
      processBehavior: {
        executionType: 'sequential',
        dependencies: [],
        timeout: undefined,
        retryPolicy: undefined
      },
      businessLogic: {
        raciMatrix: undefined,
        sla: undefined,
        kpis: undefined
      },
      visualProperties: {
        color: '#A78BFA', // Violet-400 for container nodes
        icon: 'container',
        size: 'medium'
      },
      metadata: {
        tags: ['container', 'function-model'],
        searchKeywords: [containerData.name.toLowerCase(), 'container', 'function-model'],
        crossFeatureLinks: []
      }
    })

    return {
      ...node,
      id: nodeId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * Create metadata records for migrated nodes
   */
  private static createNodeMetadata(
    nodes: FunctionModelNode[],
    modelId: string
  ): NodeMetadataRecord[] {
    return nodes.map(node => ({
      metadataId: crypto.randomUUID(),
      featureType: 'function-model',
      entityId: modelId,
      nodeId: node.id,
      nodeType: node.nodeType,
      positionX: node.position.x,
      positionY: node.position.y,
      vectorEmbedding: node.metadata.vectorEmbedding,
      searchKeywords: node.metadata.searchKeywords,
      aiAgentConfig: node.metadata.aiAgent,
      visualProperties: node.visualProperties,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt
    }))
  }

  /**
   * Migrate existing relationships to new link structure
   */
  private static migrateRelationships(
    relationships: NodeRelationship[],
    modelId: string
  ): NodeLinkRecord[] {
    return relationships.map(relationship => ({
      linkId: relationship.id,
      sourceFeature: 'function-model' as const,
      sourceEntityId: modelId,
      sourceNodeId: relationship.sourceNodeId,
      targetFeature: 'function-model' as const,
      targetEntityId: modelId,
      targetNodeId: relationship.targetNodeId,
      linkType: this.mapRelationshipType(relationship.type) as LinkType,
      linkStrength: 1.0,
      linkContext: {
        sourceHandle: relationship.sourceHandle,
        targetHandle: relationship.targetHandle,
        sourceNodeType: relationship.sourceNodeType,
        targetNodeType: relationship.targetNodeType,
        originalType: relationship.type
      },
      visualProperties: {},
      createdBy: undefined,
      createdAt: relationship.createdAt,
      updatedAt: relationship.createdAt
    }))
  }

  /**
   * Map existing relationship types to new link types
   */
  private static mapRelationshipType(originalType: string): string {
    switch (originalType) {
      case 'parent-child':
        return 'composed-of'
      case 'sibling':
        return 'related-to'
      default:
        return 'related-to'
    }
  }

  /**
   * Validate migration results
   */
  private static validateMigration(
    result: MigrationResult,
    originalModel: FunctionModel
  ): { success: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate node count
    const originalNodeCount = originalModel.nodesData?.length || 0
    if (result.nodes.length !== originalNodeCount) {
      errors.push(`Node count mismatch: expected ${originalNodeCount}, got ${result.nodes.length}`)
    }

    // Validate relationship count
    const originalRelationshipCount = originalModel.relationships?.length || 0
    if (result.links.length !== originalRelationshipCount) {
      warnings.push(`Relationship count mismatch: expected ${originalRelationshipCount}, got ${result.links.length}`)
    }

    // Validate node types
    const originalNodeTypes = originalModel.nodesData?.map(n => n.type) || []
    const migratedNodeTypes = result.nodes.map(n => n.nodeType)
    
    for (const originalType of originalNodeTypes) {
      if (originalType && !migratedNodeTypes.includes(this.mapNodeType(originalType))) {
        errors.push(`Node type mapping failed for: ${originalType}`)
      }
    }

    return {
      success: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Map original node types to new node types
   */
  private static mapNodeType(originalType: string): FunctionModelNode['nodeType'] {
    switch (originalType) {
      case 'stageNode':
        return 'stageNode'
      case 'actionTableNode':
        return 'actionTableNode'
      case 'ioNode':
        return 'ioNode'
      case 'functionModelContainer':
        return 'functionModelContainer'
      default:
        return 'stageNode' // Default fallback
    }
  }

  /**
   * Reverse migration: convert new node structure back to original FunctionModel
   */
  static reverseMigration(
    nodes: FunctionModelNode[],
    links: NodeLinkRecord[],
    modelId: string
  ): FunctionModel {
    const nodesData: Node[] = nodes.map(node => this.convertNodeToOriginalFormat(node))
    const relationships: NodeRelationship[] = links.map(link => this.convertLinkToRelationship(link))
    
    return {
      modelId,
      name: 'Migrated Model',
      description: 'Model migrated from node-based architecture',
      version: '1.0.0',
      status: 'draft',
      nodesData,
      edgesData: [], // Will be populated from relationships
      viewportData: { x: 0, y: 0, zoom: 1 },
      tags: [],
      relationships,
      metadata: {
        category: '',
        dependencies: [],
        references: [],
        exportSettings: {
          includeMetadata: true,
          includeRelationships: true,
          format: 'json',
          resolution: 'medium'
        },
        collaboration: {
          allowComments: true,
          allowSuggestions: true,
          requireApproval: false,
          autoSave: true,
          saveInterval: 30
        }
      },
      permissions: {
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canExport: true,
        canVersion: true,
        canCollaborate: true
      },
      versionHistory: [],
      currentVersion: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSavedAt: new Date()
    }
  }

  /**
   * Convert new node structure back to original Node format
   */
  private static convertNodeToOriginalFormat(node: FunctionModelNode): Node {
    const baseData = {
      id: node.id,
      type: node.nodeType,
      position: node.position,
      data: {
        label: node.name,
        description: node.description
      }
    }

    switch (node.nodeType) {
      case 'stageNode':
        return {
          ...baseData,
          data: {
            ...baseData.data,
            stage: node.functionModelData.stage
          }
        }
      
      case 'actionTableNode':
        return {
          ...baseData,
          data: {
            ...baseData.data,
            action: node.functionModelData.action,
            modes: (node.functionModelData.action as any)?.modes
          }
        }
      
      case 'ioNode':
        return {
          ...baseData,
          data: {
            ...baseData.data,
            io: node.functionModelData.io
          }
        }
      
      case 'functionModelContainer':
        return {
          ...baseData,
          data: {
            ...baseData.data,
            container: node.functionModelData.container
          }
        }
      
      default:
        return baseData
    }
  }

  /**
   * Convert new link structure back to original relationship format
   */
  private static convertLinkToRelationship(link: NodeLinkRecord): NodeRelationship {
    const context = link.linkContext as any

    return {
      id: link.linkId,
      sourceNodeId: link.sourceNodeId || '',
      targetNodeId: link.targetNodeId || '',
      sourceHandle: context?.sourceHandle || '',
      targetHandle: context?.targetHandle || '',
      type: this.mapLinkTypeToRelationshipType(link.linkType),
      sourceNodeType: context?.sourceNodeType || 'stageNode',
      targetNodeType: context?.targetNodeType || 'stageNode',
      createdAt: link.createdAt
    }
  }

  /**
   * Map new link types back to original relationship types
   */
  private static mapLinkTypeToRelationshipType(linkType: string): 'parent-child' | 'sibling' {
    switch (linkType) {
      case 'composed-of':
        return 'parent-child'
      case 'related-to':
        return 'sibling'
      default:
        return 'sibling'
    }
  }
} 