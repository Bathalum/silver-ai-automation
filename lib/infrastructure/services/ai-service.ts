// AI Service Integration
// This file implements AI service integration for the infrastructure layer

import { createClient } from '@/lib/supabase/client'
import { 
  InfrastructureException, 
  ExternalServiceException,
  RateLimitException 
} from '../exceptions/infrastructure-exceptions'

export interface SearchResult {
  entityId: string
  featureType: string
  content: string
  similarity: number
}

export interface AIAgentConfig {
  name: string
  instructions: string
  tools: string[]
  capabilities: Record<string, any>
  metadata: Record<string, any>
}

export interface AIService {
  // Vector search operations
  createEmbedding(text: string): Promise<number[]>
  searchSimilar(content: string, limit?: number): Promise<SearchResult[]>
  updateVectorEmbedding(entityId: string, embedding: number[]): Promise<void>
  
  // AI Agent operations
  createAgent(config: AIAgentConfig): Promise<string>
  executeAgent(agentId: string, input: any): Promise<ExecutionResult>
  updateAgent(agentId: string, config: Partial<AIAgentConfig>): Promise<void>
  deleteAgent(agentId: string): Promise<void>
  
  // Content processing
  summarizeContent(content: string): Promise<string>
  extractKeywords(content: string): Promise<string[]>
  classifyContent(content: string): Promise<string>
}

export class OpenAIEmbeddingService implements AIService {
  private supabase = createClient()
  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string = 'text-embedding-ada-002') {
    this.apiKey = apiKey
    this.model = model
  }
  
  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: text,
          model: this.model
        })
      })
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitException('OpenAI rate limit exceeded', 'openai')
        }
        throw new ExternalServiceException(
          `OpenAI API error: ${response.statusText}`,
          'openai',
          '/v1/embeddings'
        )
      }
      
      const data = await response.json()
      return data.data[0].embedding
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new ExternalServiceException(
        `Failed to create embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'openai',
        '/v1/embeddings'
      )
    }
  }
  
  async searchSimilar(content: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      const embedding = await this.createEmbedding(content)
      
      // Use pgvector for similarity search
      const { data, error } = await this.supabase
        .rpc('search_similar_nodes', {
          query_embedding: embedding,
          similarity_threshold: 0.7,
          match_count: limit
        })
      
      if (error) {
        throw new InfrastructureException(
          `Failed to search similar nodes: ${error.message}`,
          'VECTOR_SEARCH_ERROR',
          500
        )
      }
      
      return data.map((row: any) => ({
        entityId: row.entity_id,
        featureType: row.feature_type,
        content: row.content || '',
        similarity: row.similarity
      }))
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to search similar content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SEARCH_ERROR',
        500
      )
    }
  }

  async updateVectorEmbedding(entityId: string, embedding: number[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('nodes')
        .update({ vector_embedding: embedding })
        .eq('node_id', entityId)

      if (error) {
        throw new InfrastructureException(
          `Failed to update vector embedding: ${error.message}`,
          'VECTOR_UPDATE_ERROR',
          500
        )
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to update vector embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VECTOR_UPDATE_ERROR',
        500
      )
    }
  }

  async createAgent(config: AIAgentConfig): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('ai_agents')
        .insert({
          name: config.name,
          instructions: config.instructions,
          tools: config.tools,
          capabilities: config.capabilities,
          metadata: config.metadata,
          is_enabled: true
        })
        .select('agent_id')
        .single()

      if (error) {
        throw new InfrastructureException(
          `Failed to create AI agent: ${error.message}`,
          'AI_AGENT_CREATE_ERROR',
          500
        )
      }

      return data.agent_id
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to create AI agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AI_AGENT_CREATE_ERROR',
        500
      )
    }
  }

  async executeAgent(agentId: string, input: any): Promise<ExecutionResult> {
    try {
      // Get agent configuration
      const { data: agent, error: agentError } = await this.supabase
        .from('ai_agents')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_enabled', true)
        .single()

      if (agentError || !agent) {
        throw new InfrastructureException(
          `AI agent not found or disabled: ${agentId}`,
          'AI_AGENT_NOT_FOUND',
          404
        )
      }

      // TODO: Implement actual AI agent execution
      // This would typically involve calling OpenAI's API or other AI services
      
      // Update last executed timestamp
      await this.supabase
        .from('ai_agents')
        .update({ last_executed_at: new Date().toISOString() })
        .eq('agent_id', agentId)

      return {
        success: true,
        result: `Agent ${agent.name} executed successfully`,
        executionTime: 0,
        metadata: {
          agentId,
          agentName: agent.name,
          input
        }
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to execute AI agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AI_AGENT_EXECUTE_ERROR',
        500
      )
    }
  }

  async updateAgent(agentId: string, config: Partial<AIAgentConfig>): Promise<void> {
    try {
      const updateData: any = {}
      if (config.name !== undefined) updateData.name = config.name
      if (config.instructions !== undefined) updateData.instructions = config.instructions
      if (config.tools !== undefined) updateData.tools = config.tools
      if (config.capabilities !== undefined) updateData.capabilities = config.capabilities
      if (config.metadata !== undefined) updateData.metadata = config.metadata

      const { error } = await this.supabase
        .from('ai_agents')
        .update(updateData)
        .eq('agent_id', agentId)

      if (error) {
        throw new InfrastructureException(
          `Failed to update AI agent: ${error.message}`,
          'AI_AGENT_UPDATE_ERROR',
          500
        )
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to update AI agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AI_AGENT_UPDATE_ERROR',
        500
      )
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_agents')
        .delete()
        .eq('agent_id', agentId)

      if (error) {
        throw new InfrastructureException(
          `Failed to delete AI agent: ${error.message}`,
          'AI_AGENT_DELETE_ERROR',
          500
        )
      }
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to delete AI agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AI_AGENT_DELETE_ERROR',
        500
      )
    }
  }

  async summarizeContent(content: string): Promise<string> {
    try {
      // TODO: Implement content summarization using OpenAI or other AI service
      // This is a placeholder implementation
      return content.length > 100 ? content.substring(0, 100) + '...' : content
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to summarize content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONTENT_SUMMARY_ERROR',
        500
      )
    }
  }

  async extractKeywords(content: string): Promise<string[]> {
    try {
      // TODO: Implement keyword extraction using OpenAI or other AI service
      // This is a placeholder implementation
      const words = content.toLowerCase().split(/\s+/)
      const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
      return words.filter(word => word.length > 3 && !stopWords.has(word)).slice(0, 10)
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to extract keywords: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'KEYWORD_EXTRACTION_ERROR',
        500
      )
    }
  }

  async classifyContent(content: string): Promise<string> {
    try {
      // TODO: Implement content classification using OpenAI or other AI service
      // This is a placeholder implementation
      if (content.includes('function') || content.includes('process')) return 'function-model'
      if (content.includes('knowledge') || content.includes('document')) return 'knowledge-base'
      if (content.includes('event') || content.includes('storm')) return 'event-storm'
      if (content.includes('integration') || content.includes('spindle')) return 'spindle'
      return 'unknown'
    } catch (error) {
      if (error instanceof InfrastructureException) throw error
      throw new InfrastructureException(
        `Failed to classify content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONTENT_CLASSIFICATION_ERROR',
        500
      )
    }
  }
}

// Execution result interface
interface ExecutionResult {
  success: boolean
  result: any
  executionTime: number
  metadata?: Record<string, any>
} 