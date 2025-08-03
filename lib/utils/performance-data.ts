import type { FunctionModel } from '@/lib/domain/entities/function-model-types'

// Generate placeholder performance data for table display
export const generatePerformanceData = (model: FunctionModel) => {
  // Extract node types from model data
  const nodeTypes = extractNodeTypes(model.nodesData)
  
  // Generate realistic performance metrics based on model data
  const nodeCount = model.nodesData?.length || 0
  const connections = model.edgesData?.length || 0 // Use actual edges instead of estimate
  
  // Generate performance metrics with some randomness but based on model characteristics
  const baseSuccessRate = Math.max(80, 100 - (nodeCount * 2)) // More nodes = slightly lower success rate
  const successRate = Math.floor(Math.random() * 10) + baseSuccessRate
  
  const avgRuntime = `${(Math.random() * 3 + 1 + (nodeCount * 0.2)).toFixed(1)}s`
  const executions = Math.floor(Math.random() * 10000) + (nodeCount * 100)
  
  return {
    nodeTypes,
    performance: {
      successRate: Math.min(100, successRate),
      avgRuntime,
      executions,
      connections
    },
    stats: {
      executions
    }
  }
}

// Extract node types from model data
export const extractNodeTypes = (nodesData: any[]): string[] => {
  if (!nodesData) return []
  
  const types = new Set<string>()
  nodesData.forEach(node => {
    if (node.type) {
      types.add(node.type)
    }
    // Extract action types from action table nodes
    if (node.data?.actions) {
      node.data.actions.forEach((action: any) => {
        if (action.type) {
          types.add(action.type)
        }
      })
    }
  })
  
  return Array.from(types)
}

// Format date for display
export const formatLastModified = (date: Date): string => {
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  
  if (diffInHours < 1) {
    return 'Just now'
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }
}

// Get category from model metadata or generate default
export const getModelCategory = (model: FunctionModel): string => {
  return model.metadata?.category || 'General'
}

// NEW: Analyze connection types and patterns
export const analyzeConnections = (edgesData: any[] = []) => {
  const connectionTypes = {
    parentChild: 0,
    sibling: 0,
    input: 0,
    output: 0,
    custom: 0
  }
  
  const handlePatterns = {
    headerToBottom: 0,    // Parent-child: header-source → bottom-target
    bottomToHeader: 0,    // Parent-child: bottom-target → header-source
    rightToLeft: 0,       // Sibling: right-source → left-target
    leftToRight: 0,       // Sibling: left-target → right-source
    other: 0
  }
  
  edgesData.forEach(edge => {
    const sourceHandle = edge.sourceHandle || ''
    const targetHandle = edge.targetHandle || ''
    const edgeType = edge.type || 'default'
    
    // Count by connection type
    if (edgeType === 'parent-child') {
      connectionTypes.parentChild++
    } else if (edgeType === 'sibling') {
      connectionTypes.sibling++
    } else if (sourceHandle.includes('input') || targetHandle.includes('input')) {
      connectionTypes.input++
    } else if (sourceHandle.includes('output') || targetHandle.includes('output')) {
      connectionTypes.output++
    } else {
      connectionTypes.custom++
    }
    
    // Count by handle pattern
    if (sourceHandle === 'header-source' && targetHandle === 'bottom-target') {
      handlePatterns.headerToBottom++
    } else if (sourceHandle === 'bottom-target' && targetHandle === 'header-source') {
      handlePatterns.bottomToHeader++
    } else if (sourceHandle === 'right-source' && targetHandle === 'left-target') {
      handlePatterns.rightToLeft++
    } else if (sourceHandle === 'left-target' && targetHandle === 'right-source') {
      handlePatterns.leftToRight++
    } else {
      handlePatterns.other++
    }
  })
  
  return {
    total: edgesData.length,
    byType: connectionTypes,
    byHandlePattern: handlePatterns,
    hasParentChildConnections: connectionTypes.parentChild > 0,
    hasSiblingConnections: connectionTypes.sibling > 0,
    complexity: edgesData.length > 10 ? 'high' : edgesData.length > 5 ? 'medium' : 'low'
  }
} 

// NEW: Validate connection data integrity
export const validateConnections = (edgesData: any[] = [], nodesData: any[] = []) => {
  const issues: string[] = []
  const nodeIds = new Set(nodesData.map(node => node.id))
  
  edgesData.forEach((edge, index) => {
    // Check if edge has required properties
    if (!edge.id) {
      issues.push(`Edge at index ${index} missing id`)
    }
    if (!edge.source) {
      issues.push(`Edge ${edge.id || index} missing source`)
    }
    if (!edge.target) {
      issues.push(`Edge ${edge.id || index} missing target`)
    }
    
    // Check if source and target nodes exist
    if (edge.source && !nodeIds.has(edge.source)) {
      issues.push(`Edge ${edge.id || index} references non-existent source node: ${edge.source}`)
    }
    if (edge.target && !nodeIds.has(edge.target)) {
      issues.push(`Edge ${edge.id || index} references non-existent target node: ${edge.target}`)
    }
    
    // Check for self-loops
    if (edge.source === edge.target) {
      issues.push(`Edge ${edge.id || index} is a self-loop: ${edge.source}`)
    }
    
    // Check for duplicate edges
    const duplicateEdges = edgesData.filter(e => 
      e.source === edge.source && e.target === edge.target && e.id !== edge.id
    )
    if (duplicateEdges.length > 0) {
      issues.push(`Edge ${edge.id || index} has duplicate connections to ${edge.target}`)
    }
  })
  
  return {
    isValid: issues.length === 0,
    issues,
    orphanedNodes: nodesData.filter(node => 
      !edgesData.some(edge => edge.source === node.id || edge.target === node.id)
    ).length,
    connectedNodes: new Set([
      ...edgesData.map(edge => edge.source),
      ...edgesData.map(edge => edge.target)
    ]).size
  }
}

// NEW: Get connection statistics for debugging
export const getConnectionStats = (edgesData: any[] = []) => {
  const sourceNodes = new Set(edgesData.map(edge => edge.source))
  const targetNodes = new Set(edgesData.map(edge => edge.target))
  const allConnectedNodes = new Set([...sourceNodes, ...targetNodes])
  
  const nodeConnectionCounts: Record<string, number> = {}
  edgesData.forEach(edge => {
    nodeConnectionCounts[edge.source] = (nodeConnectionCounts[edge.source] || 0) + 1
    nodeConnectionCounts[edge.target] = (nodeConnectionCounts[edge.target] || 0) + 1
  })
  
  const maxConnections = Math.max(...Object.values(nodeConnectionCounts), 0)
  const minConnections = Math.min(...Object.values(nodeConnectionCounts), 0)
  
  return {
    totalEdges: edgesData.length,
    uniqueSourceNodes: sourceNodes.size,
    uniqueTargetNodes: targetNodes.size,
    uniqueConnectedNodes: allConnectedNodes.size,
    maxConnectionsPerNode: maxConnections,
    minConnectionsPerNode: minConnections,
    averageConnectionsPerNode: edgesData.length > 0 ? 
      (edgesData.length * 2) / allConnectedNodes.size : 0,
    nodesWithMostConnections: Object.entries(nodeConnectionCounts)
      .filter(([_, count]) => count === maxConnections)
      .map(([nodeId]) => nodeId)
  }
} 