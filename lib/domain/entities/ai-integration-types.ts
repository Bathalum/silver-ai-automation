// AI Integration Types
// This file contains types for AI agent configuration and vector embeddings

export interface AIAgentConfig {
  enabled: boolean
  instructions: string
  tools: AITool[]
  capabilities: {
    reasoning: boolean
    toolUse: boolean
    memory: boolean
    learning: boolean
  }
  metadata: {
    model: string
    temperature: number
    maxTokens: number
    contextWindow: number
  }
}

export interface AITool {
  name: string
  description: string
  parameters: Record<string, any>
  mcpServer?: string
}

export interface VectorEmbedding {
  vector: number[]
  model: string
  dimensions: number
  metadata: Record<string, any>
}

export interface AIAgentExecutionResult {
  success: boolean
  output?: any
  error?: string
  executionTime: number
  tokensUsed: number
  metadata?: Record<string, any>
}

export interface AIAgentValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata?: Record<string, any>
} 