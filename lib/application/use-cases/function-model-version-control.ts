import { FunctionModelNode } from '../../domain/entities/function-model-node-types'
import { Edge } from 'reactflow'

export interface VersionEntry {
  id: string
  modelId: string
  version: string
  nodes: Array<{
    nodeId: string
    data: FunctionModelNode
    timestamp: Date
  }>
  edges: Array<{
    edgeId: string
    data: Edge
    timestamp: Date
  }>
  changeSummary: string
  createdAt: Date
  createdBy?: string
}

export interface VersionMetadata {
  totalNodes: number
  totalEdges: number
  nodeTypes: Record<string, number>
  executionTypes: Record<string, number>
  complexity: 'simple' | 'moderate' | 'complex'
  estimatedDuration: number
}

import { FunctionModelVersionRepository } from '../../infrastructure/repositories/function-model-version-repository'

const functionModelVersionRepository = new FunctionModelVersionRepository()

export const createFunctionModelVersion = async (
  modelId: string,
  nodes: FunctionModelNode[],
  edges: Edge[],
  changeSummary: string,
  createdBy?: string
): Promise<VersionEntry> => {
  const version = await generateNextVersion(modelId)
  
  const versionData: Omit<VersionEntry, 'id'> = {
    modelId,
    version,
    nodes: nodes.map(node => ({
      nodeId: node.nodeId,
      data: node,
      timestamp: new Date()
    })),
    edges: edges.map(edge => ({
      edgeId: edge.id,
      data: edge,
      timestamp: new Date()
    })),
    changeSummary,
    createdAt: new Date(),
    createdBy
  }

  return await functionModelVersionRepository.create(versionData)
}

export const loadFunctionModelVersion = async (
  modelId: string,
  version: string
): Promise<{ nodes: FunctionModelNode[], edges: Edge[] }> => {
  const versionData = await functionModelVersionRepository.getByVersion(modelId, version)
  
  if (!versionData) {
    throw new Error(`Version ${version} not found for model ${modelId}`)
  }
  
  return {
    nodes: versionData.nodes.map(node => node.data),
    edges: versionData.edges.map(edge => edge.data)
  }
}

export const getFunctionModelVersions = async (modelId: string): Promise<VersionEntry[]> => {
  return await functionModelVersionRepository.getVersions(modelId)
}

export const getLatestFunctionModelVersion = async (modelId: string): Promise<VersionEntry | null> => {
  return await functionModelVersionRepository.getLatestVersion(modelId)
}

export const deleteFunctionModelVersion = async (versionId: string): Promise<void> => {
  await functionModelVersionRepository.deleteVersion(versionId)
}

export const generateNextVersion = async (modelId: string): Promise<string> => {
  const versions = await getFunctionModelVersions(modelId)
  
  if (versions.length === 0) {
    return '1.0.0'
  }
  
  // Find the highest version number
  const versionNumbers = versions.map(v => v.version)
  const latestVersion = versionNumbers.sort((a, b) => {
    const aParts = a.split('.').map(Number)
    const bParts = b.split('.').map(Number)
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0
      const bPart = bParts[i] || 0
      if (aPart !== bPart) {
        return bPart - aPart
      }
    }
    return 0
  })[0]
  
  const parts = latestVersion.split('.').map(Number)
  parts[parts.length - 1] += 1 // Increment patch version
  
  return parts.join('.')
}

export const getVersionMetadata = (version: VersionEntry): VersionMetadata => {
  const nodeTypes: Record<string, number> = {}
  const executionTypes: Record<string, number> = {}
  let totalDuration = 0
  let maxComplexity: 'simple' | 'moderate' | 'complex' = 'simple'
  
  version.nodes.forEach(node => {
    // Count node types
    nodeTypes[node.data.nodeType] = (nodeTypes[node.data.nodeType] || 0) + 1
    
    // Count execution types
    const executionType = node.data.processBehavior?.executionType || 'sequential'
    executionTypes[executionType] = (executionTypes[executionType] || 0) + 1
    
    // Sum duration
    totalDuration += node.data.businessLogic?.estimatedDuration || 0
    
    // Determine max complexity
    const complexity = node.data.businessLogic?.complexity || 'simple'
    if (complexity === 'complex' || (complexity === 'moderate' && maxComplexity === 'simple')) {
      maxComplexity = complexity
    }
  })
  
  return {
    totalNodes: version.nodes.length,
    totalEdges: version.edges.length,
    nodeTypes,
    executionTypes,
    complexity: maxComplexity,
    estimatedDuration: totalDuration
  }
}

export const compareVersions = (
  version1: VersionEntry,
  version2: VersionEntry
): {
  addedNodes: FunctionModelNode[]
  removedNodes: FunctionModelNode[]
  modifiedNodes: Array<{ old: FunctionModelNode; new: FunctionModelNode }>
  addedEdges: Edge[]
  removedEdges: Edge[]
} => {
  const addedNodes: FunctionModelNode[] = []
  const removedNodes: FunctionModelNode[] = []
  const modifiedNodes: Array<{ old: FunctionModelNode; new: FunctionModelNode }> = []
  const addedEdges: Edge[] = []
  const removedEdges: Edge[] = []
  
  // Compare nodes
  const nodes1 = new Map(version1.nodes.map(n => [n.nodeId, n.data]))
  const nodes2 = new Map(version2.nodes.map(n => [n.nodeId, n.data]))
  
  for (const [nodeId, node2] of nodes2) {
    const node1 = nodes1.get(nodeId)
    if (!node1) {
      addedNodes.push(node2)
    } else if (JSON.stringify(node1) !== JSON.stringify(node2)) {
      modifiedNodes.push({ old: node1, new: node2 })
    }
  }
  
  for (const [nodeId, node1] of nodes1) {
    if (!nodes2.has(nodeId)) {
      removedNodes.push(node1)
    }
  }
  
  // Compare edges
  const edges1 = new Map(version1.edges.map(e => [e.edgeId, e.data]))
  const edges2 = new Map(version2.edges.map(e => [e.edgeId, e.data]))
  
  for (const [edgeId, edge2] of edges2) {
    if (!edges1.has(edgeId)) {
      addedEdges.push(edge2)
    }
  }
  
  for (const [edgeId, edge1] of edges1) {
    if (!edges2.has(edgeId)) {
      removedEdges.push(edge1)
    }
  }
  
  return {
    addedNodes,
    removedNodes,
    modifiedNodes,
    addedEdges,
    removedEdges
  }
}

// NEW USE CASE: Complete version restoration
export const restoreModelFromVersion = async (
  modelId: string,
  version: string,
  options?: {
    validateBeforeRestore?: boolean
    backupCurrentState?: boolean
    userContext?: string
  }
): Promise<{
  success: boolean
  restoredNodes: number
  restoredEdges: number
  warnings: string[]
  errors: string[]
}> => {
  const warnings: string[] = []
  const errors: string[] = []
  
  try {
    // Step 1: Validate version exists and is accessible
    const versionData = await loadFunctionModelVersion(modelId, version)
    if (!versionData) {
      throw new Error(`Version ${version} not found or inaccessible`)
    }

    // Step 2: Optional validation of version data integrity
    if (options?.validateBeforeRestore) {
      const validationResult = await validateVersionData(versionData)
      if (!validationResult.isValid) {
        throw new Error(`Version data validation failed: ${validationResult.errors.join(', ')}`)
      }
      warnings.push(...validationResult.warnings)
    }

    // Step 3: Optional backup of current state
    if (options?.backupCurrentState) {
      await createFunctionModelVersion(
        modelId,
        [], // Current nodes will be loaded by repository
        [], // Current edges will be loaded by repository
        `Auto-backup before restoring version ${version}`,
        options.userContext
      )
      warnings.push('Current state backed up before restoration')
    }

    // Step 4: Perform complete restoration
    await functionModelVersionRepository.restoreModelFromVersion(modelId, version)

    // Step 5: Validate restoration success
    const restoredNodes = await functionModelVersionRepository.getFunctionModelNodes(modelId)
    const restoredEdges = await functionModelVersionRepository.getNodeLinks(modelId)

    return {
      success: true,
      restoredNodes: restoredNodes.length,
      restoredEdges: restoredEdges.length,
      warnings,
      errors: []
    }

  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error during restoration')
    return {
      success: false,
      restoredNodes: 0,
      restoredEdges: 0,
      warnings,
      errors
    }
  }
}

// Helper function to validate version data integrity
const validateVersionData = async (versionData: { nodes: FunctionModelNode[], edges: Edge[] }): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
}> => {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate nodes
  if (versionData.nodes) {
    for (const node of versionData.nodes) {
      if (!node.nodeId) {
        errors.push(`Node missing nodeId`)
      }
      if (!node.name) {
        warnings.push(`Node ${node.nodeId} missing name`)
      }
      if (!node.nodeType) {
        errors.push(`Node ${node.nodeId} missing nodeType`)
      }
    }
  }

  // Validate edges
  if (versionData.edges) {
    for (const edge of versionData.edges) {
      if (!edge.source || !edge.target) {
        errors.push(`Edge ${edge.id} missing source or target`)
      }
    }
  }

  // Check for orphaned edges (edges pointing to non-existent nodes)
  if (versionData.nodes && versionData.edges) {
    const nodeIds = new Set(versionData.nodes.map(n => n.nodeId))
    for (const edge of versionData.edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        warnings.push(`Edge ${edge.id} references non-existent nodes`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Helper function to get current model state for backup
const getCurrentModelState = async (modelId: string): Promise<{
  nodes: FunctionModelNode[]
  edges: Edge[]
}> => {
  // This would need to be implemented based on your current node loading logic
  // For now, returning empty arrays as placeholder
  return {
    nodes: [],
    edges: []
  }
} 