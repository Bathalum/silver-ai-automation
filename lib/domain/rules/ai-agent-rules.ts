// AI Agent Rules
// This file contains business rules for AI agent validation

import type { AIAgentConfig, AIAgentValidationResult } from '../entities/ai-integration-types'
import type { ValidationResult } from '../entities/node-behavior-types'
import { AIAgentError } from '../exceptions/domain-exceptions'

export class AIAgentRules {
  static validateAgent(agent: AIAgentConfig): AIAgentValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Instructions validation
    if (!agent.instructions?.trim()) {
      errors.push('Agent must have instructions')
    }

    if (agent.instructions && agent.instructions.length > 10000) {
      errors.push('Agent instructions cannot exceed 10,000 characters')
    }

    // Tools validation
    if (!agent.tools || agent.tools.length === 0) {
      errors.push('Agent must have at least one tool')
    }

    if (agent.tools && agent.tools.length > 50) {
      errors.push('Agent cannot have more than 50 tools')
    }

    // Validate individual tools
    if (agent.tools) {
      agent.tools.forEach((tool, index) => {
        if (!tool.name?.trim()) {
          errors.push(`Tool ${index + 1} must have a name`)
        }

        if (!tool.description?.trim()) {
          errors.push(`Tool ${index + 1} must have a description`)
        }

        if (tool.name && tool.name.length > 255) {
          errors.push(`Tool ${index + 1} name cannot exceed 255 characters`)
        }

        if (tool.description && tool.description.length > 1000) {
          errors.push(`Tool ${index + 1} description cannot exceed 1,000 characters`)
        }
      })
    }

    // Metadata validation
    if (agent.metadata) {
      const { temperature, maxTokens, contextWindow } = agent.metadata

      if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
        errors.push('Temperature must be between 0 and 2')
      }

      if (maxTokens !== undefined && (maxTokens < 1 || maxTokens > 100000)) {
        errors.push('Max tokens must be between 1 and 100,000')
      }

      if (contextWindow !== undefined && (contextWindow < 1 || contextWindow > 1000000)) {
        errors.push('Context window must be between 1 and 1,000,000')
      }

      if (!agent.metadata.model?.trim()) {
        errors.push('Agent model is required')
      }
    }

    // Capabilities validation
    if (agent.capabilities) {
      const { reasoning, toolUse, memory, learning } = agent.capabilities

      if (!reasoning && !toolUse) {
        warnings.push('Agent has no reasoning or tool use capabilities')
      }

      if (!memory && !learning) {
        warnings.push('Agent has no memory or learning capabilities')
      }
    }

    // Enabled state validation
    if (agent.enabled === undefined) {
      warnings.push('Agent enabled state is not specified')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        validationTimestamp: new Date(),
        agentId: agent.metadata?.nodeId || 'unknown'
      }
    }
  }

  static validateAgentCreation(config: Partial<AIAgentConfig>): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Required fields validation
    if (!config.instructions?.trim()) {
      errors.push('Agent instructions are required')
    }

    if (!config.tools || config.tools.length === 0) {
      errors.push('Agent must have at least one tool')
    }

    if (!config.metadata?.model?.trim()) {
      errors.push('Agent model is required')
    }

    // Optional field validation
    if (config.metadata?.temperature !== undefined && (config.metadata.temperature < 0 || config.metadata.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2')
    }

    if (config.metadata?.maxTokens !== undefined && (config.metadata.maxTokens < 1 || config.metadata.maxTokens > 100000)) {
      errors.push('Max tokens must be between 1 and 100,000')
    }

    if (config.metadata?.contextWindow !== undefined && (config.metadata.contextWindow < 1 || config.metadata.contextWindow > 1000000)) {
      errors.push('Context window must be between 1 and 1,000,000')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static validateAgentUpdate(currentAgent: AIAgentConfig, updates: Partial<AIAgentConfig>): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Create updated agent for validation
    const updatedAgent: AIAgentConfig = {
      ...currentAgent,
      ...updates,
      metadata: {
        ...currentAgent.metadata,
        ...updates.metadata
      }
    }

    // Validate the updated agent
    const validation = this.validateAgent(updatedAgent)
    errors.push(...validation.errors)
    warnings.push(...validation.warnings)

    // Additional update-specific validations
    if (updates.tools && updates.tools.length < currentAgent.tools.length) {
      warnings.push('Reducing the number of tools may affect agent functionality')
    }

    if (updates.metadata?.model && updates.metadata.model !== currentAgent.metadata?.model) {
      warnings.push('Changing the model may affect agent behavior')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static validateToolAddition(agent: AIAgentConfig, newTool: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate new tool
    if (!newTool.name?.trim()) {
      errors.push('Tool must have a name')
    }

    if (!newTool.description?.trim()) {
      errors.push('Tool must have a description')
    }

    if (newTool.name && newTool.name.length > 255) {
      errors.push('Tool name cannot exceed 255 characters')
    }

    if (newTool.description && newTool.description.length > 1000) {
      errors.push('Tool description cannot exceed 1,000 characters')
    }

    // Check for duplicate tool names
    if (agent.tools && agent.tools.some(tool => tool.name === newTool.name)) {
      errors.push('Tool with this name already exists')
    }

    // Check tool limit
    if (agent.tools && agent.tools.length >= 50) {
      errors.push('Cannot add more tools - maximum limit reached')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static validateToolRemoval(agent: AIAgentConfig, toolName: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if tool exists
    if (!agent.tools || !agent.tools.some(tool => tool.name === toolName)) {
      errors.push('Tool not found')
    }

    // Check if this is the last tool
    if (agent.tools && agent.tools.length === 1) {
      errors.push('Cannot remove the last tool')
    }

    // Warn about removal
    warnings.push(`Removing tool '${toolName}' may affect agent functionality`)

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static validateAgentExecution(agent: AIAgentConfig, context: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if agent is enabled
    if (!agent.enabled) {
      errors.push('Agent is disabled')
    }

    // Check if agent has required capabilities
    if (!agent.capabilities?.reasoning && !agent.capabilities?.toolUse) {
      errors.push('Agent has no reasoning or tool use capabilities')
    }

    // Check if agent has tools
    if (!agent.tools || agent.tools.length === 0) {
      errors.push('Agent has no tools available')
    }

    // Validate context
    if (!context || typeof context !== 'object') {
      errors.push('Valid execution context is required')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static getAgentLimits(): Record<string, any> {
    return {
      maxInstructionsLength: 10000,
      maxToolsCount: 50,
      maxToolNameLength: 255,
      maxToolDescriptionLength: 1000,
      minTemperature: 0,
      maxTemperature: 2,
      minMaxTokens: 1,
      maxMaxTokens: 100000,
      minContextWindow: 1,
      maxContextWindow: 1000000
    }
  }

  static getAgentRecommendations(): Record<string, string[]> {
    return {
      temperature: [
        'Use 0 for deterministic responses',
        'Use 0.7 for balanced creativity',
        'Use 1.0+ for high creativity'
      ],
      maxTokens: [
        'Use 1000-2000 for short responses',
        'Use 4000-8000 for detailed responses',
        'Use 16000+ for comprehensive analysis'
      ],
      tools: [
        'Include at least 3-5 tools for basic functionality',
        'Group related tools together',
        'Provide clear descriptions for each tool'
      ],
      capabilities: [
        'Enable reasoning for complex problem solving',
        'Enable tool use for external integrations',
        'Enable memory for conversation continuity',
        'Enable learning for adaptive behavior'
      ]
    }
  }
} 