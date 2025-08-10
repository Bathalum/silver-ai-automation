'use client'

import React from 'react'
import { Node, NodeTypes } from '@xyflow/react'
import { IONode, IONodeData } from './io-node'
import { StageNode, StageNodeData } from './stage-node'
import { TetherNode, TetherNodeData } from './tether-node'
import { KBNode, KBNodeData } from './kb-node'
import { FunctionModelContainerNode, FunctionModelContainerNodeData } from './function-model-container-node'

// Define all node types
export const nodeTypes: NodeTypes = {
  ioNode: IONode,
  stageNode: StageNode,
  tetherNode: TetherNode,
  kbNode: KBNode,
  functionModelContainerNode: FunctionModelContainerNode,
}

// Node type constants
export const NODE_TYPES = {
  IO: 'ioNode',
  STAGE: 'stageNode',
  TETHER: 'tetherNode',
  KB: 'kbNode',
  CONTAINER: 'functionModelContainerNode',
} as const

export type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES]

// Node factory interface
export interface NodeFactoryConfig {
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  onDuplicate?: (nodeId: string) => void
  onConfigure?: (nodeId: string) => void
  onExecute?: (nodeId: string) => void
  onStop?: (nodeId: string) => void
  onViewLogs?: (nodeId: string) => void
  onViewKB?: (nodeId: string) => void
  onEditRACI?: (nodeId: string) => void
  onAddAction?: (nodeId: string) => void
  onManageActions?: (nodeId: string) => void
  onOpenModel?: (nodeId: string) => void
  onManageContext?: (nodeId: string) => void
}

// Node factory class
export class NodeFactory {
  private config: NodeFactoryConfig

  constructor(config: NodeFactoryConfig = {}) {
    this.config = config
  }

  // Create an IO Node
  createIONode(
    id: string,
    position: { x: number; y: number },
    data: Partial<IONodeData> = {}
  ): Node<IONodeData> {
    const defaultData: IONodeData = {
      id,
      type: NODE_TYPES.IO,
      name: 'IO Node',
      description: 'Input/Output node',
      status: 'idle',
      priority: 'medium',
      raci: {
        responsible: 'User',
        accountable: 'User',
        consulted: '',
        informed: ''
      },
      ioType: 'input',
      dataContract: '',
      dataType: 'string',
      isRequired: false,
      defaultValue: '',
      validationRules: [],
      position,
      ...data
    }

    return {
      id,
      type: NODE_TYPES.IO,
      position,
      data: defaultData,
    }
  }

  // Create a Stage Node
  createStageNode(
    id: string,
    position: { x: number; y: number },
    data: Partial<StageNodeData> = {}
  ): Node<StageNodeData> {
    const defaultData: StageNodeData = {
      id,
      type: NODE_TYPES.STAGE,
      name: 'Stage Node',
      description: 'Execution stage node',
      status: 'idle',
      priority: 'medium',
      raci: {
        responsible: 'User',
        accountable: 'User',
        consulted: '',
        informed: ''
      },
      executionMode: 'sequential',
      dependencies: [],
      actionCount: 0,
      estimatedDuration: '5m',
      retryPolicy: {
        maxRetries: 3,
        retryDelay: '1m'
      },
      position,
      ...data
    }

    return {
      id,
      type: NODE_TYPES.STAGE,
      position,
      data: defaultData,
    }
  }

  // Create a Tether Node
  createTetherNode(
    id: string,
    position: { x: number; y: number },
    data: Partial<TetherNodeData> = {}
  ): Node<TetherNodeData> {
    const defaultData: TetherNodeData = {
      id,
      type: NODE_TYPES.TETHER,
      name: 'Tether Node',
      description: 'Tether execution node',
      status: 'idle',
      priority: 'medium',
      raci: {
        responsible: 'User',
        accountable: 'User',
        consulted: '',
        informed: ''
      },
      executionStatus: 'pending',
      estimatedDuration: '2m',
      retryCount: 0,
      maxRetries: 3,
      position,
      ...data
    }

    return {
      id,
      type: NODE_TYPES.TETHER,
      position,
      data: defaultData,
    }
  }

  // Create a KB Node
  createKBNode(
    id: string,
    position: { x: number; y: number },
    data: Partial<KBNodeData> = {}
  ): Node<KBNodeData> {
    const defaultData: KBNodeData = {
      id,
      type: NODE_TYPES.KB,
      name: 'KB Node',
      description: 'Knowledge base node',
      status: 'idle',
      priority: 'medium',
      raci: {
        responsible: 'User',
        accountable: 'User',
        consulted: '',
        informed: ''
      },
      kbReference: 'KB-001',
      raci: {
        responsible: 'User',
        accountable: 'User',
        consulted: '',
        informed: ''
      },
      knowledgeDomain: 'General',
      version: '1.0',
      position,
      ...data
    }

    return {
      id,
      type: NODE_TYPES.KB,
      position,
      data: defaultData,
    }
  }

  // Create a Function Model Container Node
  createContainerNode(
    id: string,
    position: { x: number; y: number },
    data: Partial<FunctionModelContainerNodeData> = {}
  ): Node<FunctionModelContainerNodeData> {
    const defaultData: FunctionModelContainerNodeData = {
      id,
      type: NODE_TYPES.CONTAINER,
      name: 'Container Node',
      description: 'Function model container',
      status: 'idle',
      priority: 'medium',
      raci: {
        responsible: 'User',
        accountable: 'User',
        consulted: '',
        informed: ''
      },
      nestedModelId: 'model-001',
      nestedModelName: 'Nested Model',
      contextMapping: {},
      executionPolicy: 'inherit',
      nestingLevel: 1,
      position,
      ...data
    }

    return {
      id,
      type: NODE_TYPES.CONTAINER,
      position,
      data: defaultData,
    }
  }

  // Generic node creation method
  createNode(
    type: NodeType,
    id: string,
    position: { x: number; y: number },
    data: any = {}
  ): Node {
    switch (type) {
      case NODE_TYPES.IO:
        return this.createIONode(id, position, data)
      case NODE_TYPES.STAGE:
        return this.createStageNode(id, position, data)
      case NODE_TYPES.TETHER:
        return this.createTetherNode(id, position, data)
      case NODE_TYPES.KB:
        return this.createKBNode(id, position, data)
      case NODE_TYPES.CONTAINER:
        return this.createContainerNode(id, position, data)
      default:
        throw new Error(`Unknown node type: ${type}`)
    }
  }

  // Update node data
  updateNodeData<T extends Node>(
    node: T,
    updates: Partial<T['data']>
  ): T {
    return {
      ...node,
      data: {
        ...node.data,
        ...updates,
      },
    }
  }

  // Clone a node
  cloneNode<T extends Node>(
    node: T,
    newId: string,
    newPosition: { x: number; y: number }
  ): T {
    return {
      ...node,
      id: newId,
      position: newPosition,
      data: {
        ...node.data,
        id: newId,
        position: newPosition,
      },
    }
  }

  // Validate node data
  validateNodeData<T extends Node>(node: T): boolean {
    // Basic validation - ensure required fields exist
    if (!node.data.name || !node.data.type) {
      return false
    }
    return true
  }
}

// Hook for using the node factory
export function useNodeFactory(config: NodeFactoryConfig = {}) {
  const factory = React.useMemo(() => new NodeFactory(config), [config])
  
  return {
    factory,
    createNode: factory.createNode.bind(factory),
    createIONode: factory.createIONode.bind(factory),
    createStageNode: factory.createStageNode.bind(factory),
    createTetherNode: factory.createTetherNode.bind(factory),
    createKBNode: factory.createKBNode.bind(factory),
    createContainerNode: factory.createContainerNode.bind(factory),
    updateNodeData: factory.updateNodeData.bind(factory),
    cloneNode: factory.cloneNode.bind(factory),
    validateNodeData: factory.validateNodeData.bind(factory),
  }
}
