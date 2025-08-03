// Function Model Node Types
// This file defines the FunctionModelNode interface that extends BaseNode with function model specific properties

import type { BaseNode, FeatureType } from './base-node-types'
import type { Stage, ActionItem, DataPort, FunctionModelContainer, RACIMatrix } from './function-model-types'

export interface FunctionModelNode extends BaseNode {
  featureType: 'function-model'
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
  
  // Function Model specific properties
  functionModelData: {
    stage?: Stage
    action?: ActionItem
    io?: DataPort
    container?: FunctionModelContainer
  }
  
  // Process-specific behavior
  processBehavior: {
    executionType: 'sequential' | 'parallel' | 'conditional'
    dependencies: string[]
    timeout?: number
    retryPolicy?: RetryPolicy
  }
  
  // Business logic properties
  businessLogic: {
    raciMatrix?: RACIMatrix
    sla?: ServiceLevelAgreement
    kpis?: KeyPerformanceIndicator[]
  }
}

export interface RetryPolicy {
  maxRetries: number
  retryDelay: number // in milliseconds
  backoffMultiplier: number
  maxDelay: number // in milliseconds
}

export interface ServiceLevelAgreement {
  responseTime: number // in milliseconds
  availability: number // percentage (0-100)
  uptime: number // percentage (0-100)
  supportHours: {
    start: string // HH:MM format
    end: string // HH:MM format
    timezone: string
  }
}

export interface KeyPerformanceIndicator {
  id: string
  name: string
  description: string
  metric: string
  target: number
  current: number
  unit: string
  trend: 'improving' | 'stable' | 'declining'
}

// Factory function for creating function model nodes
export function createFunctionModelNode(
  nodeType: FunctionModelNode['nodeType'],
  name: string,
  position: { x: number; y: number },
  options: Partial<FunctionModelNode> = {}
): Omit<FunctionModelNode, 'id' | 'createdAt' | 'updatedAt'> {
  const baseNode = {
    featureType: 'function-model' as const,
    nodeType,
    name,
    description: options.description || '',
    position,
    visualProperties: {
      color: options.visualProperties?.color || getDefaultColor(nodeType),
      icon: options.visualProperties?.icon || getDefaultIcon(nodeType),
      size: options.visualProperties?.size || 'medium',
      style: options.visualProperties?.style || {},
      featureSpecific: options.visualProperties?.featureSpecific || {}
    },
    metadata: {
      tags: options.metadata?.tags || [nodeType, 'function-model'],
      searchKeywords: options.metadata?.searchKeywords || [name, nodeType],
      crossFeatureLinks: options.metadata?.crossFeatureLinks || [],
      aiAgent: options.metadata?.aiAgent,
      vectorEmbedding: options.metadata?.vectorEmbedding
    },
    status: options.status || 'active'
  }

  return {
    ...baseNode,
    functionModelData: {
      stage: options.functionModelData?.stage,
      action: options.functionModelData?.action,
      io: options.functionModelData?.io,
      container: options.functionModelData?.container
    },
    processBehavior: {
      executionType: options.processBehavior?.executionType || 'sequential',
      dependencies: options.processBehavior?.dependencies || [],
      timeout: options.processBehavior?.timeout,
      retryPolicy: options.processBehavior?.retryPolicy || {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000
      }
    },
    businessLogic: {
      raciMatrix: options.businessLogic?.raciMatrix,
      sla: options.businessLogic?.sla,
      kpis: options.businessLogic?.kpis || []
    }
  }
}

// Helper functions for default values
function getDefaultColor(nodeType: FunctionModelNode['nodeType']): string {
  switch (nodeType) {
    case 'stageNode':
      return '#3b82f6' // blue
    case 'actionTableNode':
      return '#10b981' // green
    case 'ioNode':
      return '#f59e0b' // amber
    case 'functionModelContainer':
      return '#8b5cf6' // purple
    default:
      return '#6b7280' // gray
  }
}

function getDefaultIcon(nodeType: FunctionModelNode['nodeType']): string {
  switch (nodeType) {
    case 'stageNode':
      return '📋'
    case 'actionTableNode':
      return '⚡'
    case 'ioNode':
      return '🔌'
    case 'functionModelContainer':
      return '📦'
    default:
      return '📊'
  }
}

// Type guard for FunctionModelNode validation
export function isValidFunctionModelNode(node: any): node is FunctionModelNode {
  if (!isValidBaseNode(node)) {
    return false
  }
  
  return (
    node.featureType === 'function-model' &&
    ['stageNode', 'actionTableNode', 'ioNode', 'functionModelContainer'].includes(node.nodeType) &&
    typeof node.functionModelData === 'object' &&
    typeof node.processBehavior === 'object' &&
    typeof node.businessLogic === 'object'
  )
}

// Utility functions for function model nodes
export function getNodeExecutionType(node: FunctionModelNode): string {
  return node.processBehavior.executionType
}

export function getNodeDependencies(node: FunctionModelNode): string[] {
  return node.processBehavior.dependencies
}

export function hasNodeTimeout(node: FunctionModelNode): boolean {
  return node.processBehavior.timeout !== undefined
}

export function getNodeTimeout(node: FunctionModelNode): number | undefined {
  return node.processBehavior.timeout
}

export function hasRetryPolicy(node: FunctionModelNode): boolean {
  return node.processBehavior.retryPolicy !== undefined
}

export function getRetryPolicy(node: FunctionModelNode): RetryPolicy | undefined {
  return node.processBehavior.retryPolicy
}

export function hasRACIMatrix(node: FunctionModelNode): boolean {
  return node.businessLogic.raciMatrix !== undefined
}

export function getRACIMatrix(node: FunctionModelNode): RACIMatrix | undefined {
  return node.businessLogic.raciMatrix
}

export function hasSLA(node: FunctionModelNode): boolean {
  return node.businessLogic.sla !== undefined
}

export function getSLA(node: FunctionModelNode): ServiceLevelAgreement | undefined {
  return node.businessLogic.sla
}

export function getKPIs(node: FunctionModelNode): KeyPerformanceIndicator[] {
  return node.businessLogic.kpis || []
}

// Import the base node validation function
import { isValidBaseNode } from './base-node-types' 