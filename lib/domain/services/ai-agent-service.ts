// AI Agent Service
// This file contains domain services for AI agent management

import type { AIAgentConfig, AIAgentValidationResult } from '../entities/ai-integration-types'
import type { BaseNode } from '../entities/base-node-types'
import { AIAgentError } from '../exceptions/domain-exceptions'

export class AIAgentService {
  static createAgent(node: BaseNode, config: AIAgentConfig): AIAgentConfig {
    // Validate agent configuration
    if (!config.instructions.trim()) {
      throw new AIAgentError('AI agent must have instructions', node.nodeId)
    }
    
    if (config.tools.length === 0) {
      throw new AIAgentError('AI agent must have at least one tool', node.nodeId)
    }
    
    return {
      ...config,
      enabled: true,
      metadata: {
        ...config.metadata,
        createdAt: new Date(),
        nodeId: node.nodeId,
        featureType: node.featureType
      }
    }
  }
  
  static validateAgent(agent: AIAgentConfig): AIAgentValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Instructions validation
    if (!agent.instructions.trim()) {
      errors.push('Agent must have instructions')
    }
    
    if (agent.instructions.length > 10000) {
      errors.push('Agent instructions cannot exceed 10,000 characters')
    }
    
    // Tools validation
    if (agent.tools.length === 0) {
      errors.push('Agent must have at least one tool')
    }
    
    if (agent.tools.length > 50) {
      errors.push('Agent cannot have more than 50 tools')
    }
    
    // Metadata validation
    if (agent.metadata.temperature < 0 || agent.metadata.temperature > 2) {
      errors.push('Temperature must be between 0 and 2')
    }
    
    if (agent.metadata.maxTokens < 1 || agent.metadata.maxTokens > 100000) {
      errors.push('Max tokens must be between 1 and 100,000')
    }
    
    if (agent.metadata.contextWindow < 1 || agent.metadata.contextWindow > 1000000) {
      errors.push('Context window must be between 1 and 1,000,000')
    }
    
    // Capabilities validation
    if (!agent.capabilities.reasoning && !agent.capabilities.toolUse) {
      warnings.push('Agent has no reasoning or tool use capabilities')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        validationTimestamp: new Date()
      }
    }
  }
  
  static updateAgent(agent: AIAgentConfig, updates: Partial<AIAgentConfig>): AIAgentConfig {
    const updatedAgent = {
      ...agent,
      ...updates,
      metadata: {
        ...agent.metadata,
        ...updates.metadata,
        updatedAt: new Date()
      }
    }
    
    const validation = this.validateAgent(updatedAgent)
    if (!validation.isValid) {
      throw new AIAgentError(
        `Agent validation failed: ${validation.errors.join(', ')}`,
        agent.metadata?.nodeId || 'unknown'
      )
    }
    
    return updatedAgent
  }
  
  static enableAgent(agent: AIAgentConfig): AIAgentConfig {
    return {
      ...agent,
      enabled: true,
      metadata: {
        ...agent.metadata,
        enabledAt: new Date()
      }
    }
  }
  
  static disableAgent(agent: AIAgentConfig): AIAgentConfig {
    return {
      ...agent,
      enabled: false,
      metadata: {
        ...agent.metadata,
        disabledAt: new Date()
      }
    }
  }
  
  static addTool(agent: AIAgentConfig, tool: any): AIAgentConfig {
    const updatedTools = [...agent.tools, tool]
    
    return {
      ...agent,
      tools: updatedTools,
      metadata: {
        ...agent.metadata,
        toolsUpdatedAt: new Date()
      }
    }
  }
  
  static removeTool(agent: AIAgentConfig, toolName: string): AIAgentConfig {
    const updatedTools = agent.tools.filter(tool => tool.name !== toolName)
    
    if (updatedTools.length === 0) {
      throw new AIAgentError('Cannot remove the last tool from agent', agent.metadata?.nodeId || 'unknown')
    }
    
    return {
      ...agent,
      tools: updatedTools,
      metadata: {
        ...agent.metadata,
        toolsUpdatedAt: new Date()
      }
    }
  }
} 