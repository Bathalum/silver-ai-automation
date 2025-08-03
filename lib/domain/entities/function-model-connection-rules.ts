import { FunctionModelNode } from './function-model-node-types'

export interface ConnectionRule {
  sourceHandle: string
  targetHandle: string
  sourceNodeTypes: string[]
  targetNodeTypes: string[]
  relationshipType: 'parent-child' | 'sibling'
  validation?: (sourceNode: FunctionModelNode, targetNode: FunctionModelNode) => boolean
}

export const FUNCTION_MODEL_CONNECTION_RULES: ConnectionRule[] = [
  // ActionTableNode to StageNode/IONode (parent-child)
  {
    sourceHandle: 'header-source',
    targetHandle: 'bottom-target',
    sourceNodeTypes: ['actionTableNode'],
    targetNodeTypes: ['stageNode', 'ioNode'],
    relationshipType: 'parent-child'
  },
  
  // StageNode/IONode to StageNode/IONode (siblings)
  {
    sourceHandle: 'right-source',
    targetHandle: 'left-target',
    sourceNodeTypes: ['stageNode', 'ioNode'],
    targetNodeTypes: ['stageNode', 'ioNode'],
    relationshipType: 'sibling'
  }
]

export function validateConnection(
  sourceNode: FunctionModelNode,
  targetNode: FunctionModelNode,
  sourceHandle: string,
  targetHandle: string
): boolean {
  const rule = FUNCTION_MODEL_CONNECTION_RULES.find(r => 
    r.sourceHandle === sourceHandle && 
    r.targetHandle === targetHandle
  )
  
  if (!rule) return false
  
  const sourceTypeValid = rule.sourceNodeTypes.includes(sourceNode.nodeType)
  const targetTypeValid = rule.targetNodeTypes.includes(targetNode.nodeType)
  
  if (!sourceTypeValid || !targetTypeValid) return false
  
  // Prevent ActionTableNodes from connecting as siblings
  if (rule.relationshipType === 'sibling' && 
      (sourceNode.nodeType === 'actionTableNode' || targetNode.nodeType === 'actionTableNode')) {
    return false
  }
  
  // Prevent self-connections
  if (sourceNode.nodeId === targetNode.nodeId) {
    return false
  }
  
  // Prevent duplicate connections
  const existingConnection = sourceNode.relationships.find(rel => 
    rel.sourceNodeId === sourceNode.nodeId &&
    rel.targetNodeId === targetNode.nodeId &&
    rel.sourceHandle === sourceHandle &&
    rel.targetHandle === targetHandle
  )
  
  if (existingConnection) {
    return false
  }
  
  // Run custom validation if provided
  if (rule.validation) {
    return rule.validation(sourceNode, targetNode)
  }
  
  return true
}

export function getRelationshipType(sourceHandle: string, targetHandle: string): 'parent-child' | 'sibling' {
  const rule = FUNCTION_MODEL_CONNECTION_RULES.find(r => 
    r.sourceHandle === sourceHandle && 
    r.targetHandle === targetHandle
  )
  
  return rule?.relationshipType || 'sibling'
}

export function getValidTargetHandles(
  sourceNode: FunctionModelNode,
  sourceHandle: string
): string[] {
  const rules = FUNCTION_MODEL_CONNECTION_RULES.filter(r => 
    r.sourceHandle === sourceHandle &&
    r.sourceNodeTypes.includes(sourceNode.nodeType)
  )
  
  return rules.map(rule => rule.targetHandle)
}

export function getValidSourceHandles(
  targetNode: FunctionModelNode,
  targetHandle: string
): string[] {
  const rules = FUNCTION_MODEL_CONNECTION_RULES.filter(r => 
    r.targetHandle === targetHandle &&
    r.targetNodeTypes.includes(targetNode.nodeType)
  )
  
  return rules.map(rule => rule.sourceHandle)
}

export function canConnectNodes(
  sourceNode: FunctionModelNode,
  targetNode: FunctionModelNode
): { canConnect: boolean; validHandles: Array<{ source: string; target: string }> } {
  const validHandles: Array<{ source: string; target: string }> = []
  
  // Check all possible handle combinations
  const sourceHandles = ['header-source', 'right-source']
  const targetHandles = ['left-target', 'bottom-target']
  
  for (const sourceHandle of sourceHandles) {
    for (const targetHandle of targetHandles) {
      if (validateConnection(sourceNode, targetNode, sourceHandle, targetHandle)) {
        validHandles.push({ source: sourceHandle, target: targetHandle })
      }
    }
  }
  
  return {
    canConnect: validHandles.length > 0,
    validHandles
  }
}

export function getConnectionValidationMessage(
  sourceNode: FunctionModelNode,
  targetNode: FunctionModelNode,
  sourceHandle: string,
  targetHandle: string
): string | null {
  if (sourceNode.nodeId === targetNode.nodeId) {
    return 'Cannot connect a node to itself'
  }
  
  const rule = FUNCTION_MODEL_CONNECTION_RULES.find(r => 
    r.sourceHandle === sourceHandle && 
    r.targetHandle === targetHandle
  )
  
  if (!rule) {
    return `Invalid handle combination: ${sourceHandle} → ${targetHandle}`
  }
  
  const sourceTypeValid = rule.sourceNodeTypes.includes(sourceNode.nodeType)
  const targetTypeValid = rule.targetNodeTypes.includes(targetNode.nodeType)
  
  if (!sourceTypeValid) {
    return `${sourceNode.nodeType} cannot use handle ${sourceHandle}`
  }
  
  if (!targetTypeValid) {
    return `${targetNode.nodeType} cannot use handle ${targetHandle}`
  }
  
  if (rule.relationshipType === 'sibling' && 
      (sourceNode.nodeType === 'actionTableNode' || targetNode.nodeType === 'actionTableNode')) {
    return 'ActionTableNodes can only connect as parent-child relationships'
  }
  
  return null
} 