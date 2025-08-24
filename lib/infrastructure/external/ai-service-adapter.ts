import { Result } from '../../domain/shared/result';

/**
 * Interface for AI service operations
 */
export interface IAIServiceAdapter {
  /**
   * Execute an AI agent action
   */
  executeAction(config: AIActionConfig): Promise<Result<AIActionResult>>;

  /**
   * Validate AI agent configuration
   */
  validateConfig(config: Record<string, any>): Promise<Result<boolean>>;

  /**
   * Get available AI models
   */
  getAvailableModels(): Promise<Result<AIModel[]>>;

  /**
   * Estimate execution cost
   */
  estimateCost(config: AIActionConfig): Promise<Result<CostEstimate>>;
}

export interface AIActionConfig {
  /** AI model to use */
  model: string;
  
  /** Action type (e.g., 'text-generation', 'image-analysis', 'code-review') */
  actionType: string;
  
  /** Input data for the AI action */
  input: Record<string, any>;
  
  /** Configuration parameters */
  parameters: {
    /** Maximum tokens to generate */
    maxTokens?: number;
    
    /** Temperature for randomness */
    temperature?: number;
    
    /** Additional model-specific parameters */
    [key: string]: any;
  };
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Retry configuration */
  retryConfig?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface AIActionResult {
  /** Unique execution ID */
  executionId: string;
  
  /** Execution status */
  status: 'success' | 'failure' | 'timeout';
  
  /** Generated output */
  output: Record<string, any>;
  
  /** Usage statistics */
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost?: number;
  };
  
  /** Execution duration in milliseconds */
  duration: number;
  
  /** Error message if failed */
  error?: string;
  
  /** Additional metadata */
  metadata: Record<string, any>;
}

export interface AIModel {
  /** Model identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Model description */
  description: string;
  
  /** Supported capabilities */
  capabilities: string[];
  
  /** Input/output limits */
  limits: {
    maxInputTokens: number;
    maxOutputTokens: number;
  };
  
  /** Pricing information */
  pricing: {
    inputTokenCost: number;
    outputTokenCost: number;
    currency: string;
  };
}

export interface CostEstimate {
  /** Estimated cost in specified currency */
  estimatedCost: number;
  
  /** Currency code */
  currency: string;
  
  /** Breakdown of cost components */
  breakdown: {
    inputTokens: number;
    inputCost: number;
    outputTokens: number;
    outputCost: number;
  };
}

/**
 * OpenAI service adapter
 */
export class OpenAIServiceAdapter implements IAIServiceAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = 'https://api.openai.com/v1'
  ) {}

  async executeAction(config: AIActionConfig): Promise<Result<AIActionResult>> {
    try {
      const startTime = Date.now();
      const executionId = this.generateExecutionId();

      // Validate configuration
      const validationResult = await this.validateConfig(config);
      if (validationResult.isFailure) {
        return Result.fail(`Invalid AI configuration: ${validationResult.error}`);
      }

      // Execute based on action type
      let result: any;
      switch (config.actionType) {
        case 'text-generation':
          result = await this.executeTextGeneration(config);
          break;
        case 'code-review':
          result = await this.executeCodeReview(config);
          break;
        case 'data-analysis':
          result = await this.executeDataAnalysis(config);
          break;
        default:
          return Result.fail(`Unsupported action type: ${config.actionType}`);
      }

      const duration = Date.now() - startTime;

      const actionResult: AIActionResult = {
        executionId,
        status: 'success',
        output: result.output,
        usage: result.usage,
        duration,
        metadata: {
          model: config.model,
          actionType: config.actionType,
          ...result.metadata
        }
      };

      return Result.ok(actionResult);
    } catch (error) {
      return Result.fail(
        `AI action execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async validateConfig(config: Record<string, any>): Promise<Result<boolean>> {
    try {
      // Basic validation
      if (!config.model || typeof config.model !== 'string') {
        return Result.fail('Model is required and must be a string');
      }

      if (!config.actionType || typeof config.actionType !== 'string') {
        return Result.fail('Action type is required and must be a string');
      }

      if (!config.input || typeof config.input !== 'object') {
        return Result.fail('Input is required and must be an object');
      }

      // Check if model is available
      const modelsResult = await this.getAvailableModels();
      if (modelsResult.isFailure) {
        return Result.fail('Unable to validate model availability');
      }

      const availableModels = modelsResult.value;
      const modelExists = availableModels.some(m => m.id === config.model);
      if (!modelExists) {
        return Result.fail(`Model '${config.model}' is not available`);
      }

      return Result.ok(true);
    } catch (error) {
      return Result.fail(
        `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getAvailableModels(): Promise<Result<AIModel[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return Result.fail(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Map OpenAI models to our interface
      const models: AIModel[] = data.data.map((model: any) => ({
        id: model.id,
        name: model.id,
        description: `OpenAI ${model.id} model`,
        capabilities: this.getModelCapabilities(model.id),
        limits: this.getModelLimits(model.id),
        pricing: this.getModelPricing(model.id)
      }));

      return Result.ok(models);
    } catch (error) {
      return Result.fail(
        `Failed to get available models: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async estimateCost(config: AIActionConfig): Promise<Result<CostEstimate>> {
    try {
      // Get model pricing
      const modelsResult = await this.getAvailableModels();
      if (modelsResult.isFailure) {
        return Result.fail('Unable to get model pricing information');
      }

      const model = modelsResult.value.find(m => m.id === config.model);
      if (!model) {
        return Result.fail(`Model '${config.model}' not found`);
      }

      // Estimate token usage based on input
      const inputTokens = this.estimateInputTokens(config.input);
      const outputTokens = config.parameters.maxTokens || 1000;

      const inputCost = (inputTokens / 1000) * model.pricing.inputTokenCost;
      const outputCost = (outputTokens / 1000) * model.pricing.outputTokenCost;
      const estimatedCost = inputCost + outputCost;

      const estimate: CostEstimate = {
        estimatedCost: Math.round(estimatedCost * 10000) / 10000, // Round to 4 decimal places
        currency: model.pricing.currency,
        breakdown: {
          inputTokens,
          inputCost,
          outputTokens,
          outputCost
        }
      };

      return Result.ok(estimate);
    } catch (error) {
      return Result.fail(
        `Cost estimation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async executeTextGeneration(config: AIActionConfig): Promise<any> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages: config.input.messages || [{ role: 'user', content: config.input.prompt }],
        max_tokens: config.parameters.maxTokens,
        temperature: config.parameters.temperature,
        ...config.parameters
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      output: {
        text: data.choices[0].message.content,
        finishReason: data.choices[0].finish_reason
      },
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      },
      metadata: {
        model: data.model,
        choices: data.choices.length
      }
    };
  }

  private async executeCodeReview(config: AIActionConfig): Promise<any> {
    // Specialized code review implementation
    const codeReviewPrompt = this.buildCodeReviewPrompt(config.input);
    
    const modifiedConfig = {
      ...config,
      input: {
        messages: [{ role: 'user', content: codeReviewPrompt }]
      }
    };

    return this.executeTextGeneration(modifiedConfig);
  }

  private async executeDataAnalysis(config: AIActionConfig): Promise<any> {
    // Specialized data analysis implementation
    const analysisPrompt = this.buildDataAnalysisPrompt(config.input);
    
    const modifiedConfig = {
      ...config,
      input: {
        messages: [{ role: 'user', content: analysisPrompt }]
      }
    };

    return this.executeTextGeneration(modifiedConfig);
  }

  private buildCodeReviewPrompt(input: Record<string, any>): string {
    return `Please review the following code:

Code:
\`\`\`${input.language || 'javascript'}
${input.code}
\`\`\`

Focus on:
- Code quality and best practices
- Potential bugs or issues
- Performance considerations
- Security vulnerabilities
- Suggestions for improvement

Provide a structured review with specific recommendations.`;
  }

  private buildDataAnalysisPrompt(input: Record<string, any>): string {
    return `Please analyze the following data:

Data: ${JSON.stringify(input.data, null, 2)}

Analysis requirements:
${input.requirements || 'Provide insights and patterns in the data'}

Please provide:
- Key insights and patterns
- Statistical summary if applicable
- Recommendations based on the analysis
- Any anomalies or notable observations`;
  }

  private getModelCapabilities(modelId: string): string[] {
    // Define capabilities based on model
    const capabilities = ['text-generation'];
    
    if (modelId.includes('gpt-4')) {
      capabilities.push('code-review', 'data-analysis', 'reasoning');
    }
    
    return capabilities;
  }

  private getModelLimits(modelId: string): { maxInputTokens: number; maxOutputTokens: number } {
    // Define limits based on model
    switch (modelId) {
      case 'gpt-4':
        return { maxInputTokens: 8192, maxOutputTokens: 4096 };
      case 'gpt-4-32k':
        return { maxInputTokens: 32768, maxOutputTokens: 4096 };
      case 'gpt-3.5-turbo':
        return { maxInputTokens: 4096, maxOutputTokens: 4096 };
      default:
        return { maxInputTokens: 4096, maxOutputTokens: 4096 };
    }
  }

  private getModelPricing(modelId: string): { inputTokenCost: number; outputTokenCost: number; currency: string } {
    // Define pricing based on model (cost per 1K tokens)
    switch (modelId) {
      case 'gpt-4':
        return { inputTokenCost: 0.03, outputTokenCost: 0.06, currency: 'USD' };
      case 'gpt-4-32k':
        return { inputTokenCost: 0.06, outputTokenCost: 0.12, currency: 'USD' };
      case 'gpt-3.5-turbo':
        return { inputTokenCost: 0.0015, outputTokenCost: 0.002, currency: 'USD' };
      default:
        return { inputTokenCost: 0.002, outputTokenCost: 0.002, currency: 'USD' };
    }
  }

  private estimateInputTokens(input: Record<string, any>): number {
    // Simple token estimation (rough approximation)
    const text = JSON.stringify(input);
    return Math.ceil(text.length / 4); // Roughly 4 characters per token
  }

  private generateExecutionId(): string {
    return `ai-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}