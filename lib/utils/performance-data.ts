import type { FunctionModel } from '@/lib/domain/entities/function-model-types'

// Generate placeholder performance data for table display
export const generatePerformanceData = (model: FunctionModel) => {
  // Extract node types from model data
  const nodeTypes = extractNodeTypes(model.nodesData)
  
  // Generate realistic performance metrics based on model data
  const nodeCount = model.nodesData?.length || 0
  const connections = nodeCount * 2 // Estimate connections
  
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