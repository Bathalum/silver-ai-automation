import { NodeId } from '../value-objects/node-id';
import { AIAgent } from '../entities/ai-agent';
import { NodeMetadata } from '../entities/node-metadata';
import { FeatureType } from '../enums';
import { NodeContextAccessService } from './node-context-access-service';
import { Result } from '../shared/result';

export interface AgentExecutionRequest {
  agentId: NodeId;
  task: string;
  context: Record<string, any>;
  priority: number;
  timeout?: number;
  requiredCapabilities?: string[];
}

export interface AgentExecutionResult {
  requestId: string;
  agentId: NodeId;
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  capabilitiesUsed: string[];
  contextAccessed: string[];
  timestamp: Date;
}

export interface AgentCapabilityMatch {
  agentId: NodeId;
  matchScore: number;
  availableCapabilities: string[];
  missingCapabilities: string[];
  currentLoad: number;
}

export interface AgentOrchestrationState {
  activeExecutions: Map<string, AgentExecutionRequest>;
  queuedRequests: AgentExecutionRequest[];
  completedExecutions: AgentExecutionResult[];
  failedExecutions: AgentExecutionResult[];
  agentPerformanceMetrics: Map<string, AgentPerformanceMetrics>;
}

export interface AgentPerformanceMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  averageMatchScore: number;
  lastExecutionTime: Date;
  currentLoad: number;
}

/**
 * AIAgentOrchestrationService coordinates AI agent execution across features and entities,
 * providing capability discovery, performance monitoring, and failure handling.
 */
export class AIAgentOrchestrationService {
  private agentRegistry: Map<string, AIAgent> = new Map();
  private metadataRegistry: Map<string, NodeMetadata> = new Map();
  private orchestrationState: AgentOrchestrationState;
  private contextAccessService: NodeContextAccessService;
  private maxConcurrentExecutions: number = 10;

  constructor(contextAccessService: NodeContextAccessService) {
    this.contextAccessService = contextAccessService;
    this.orchestrationState = {
      activeExecutions: new Map(),
      queuedRequests: [],
      completedExecutions: [],
      failedExecutions: [],
      agentPerformanceMetrics: new Map()
    };
  }

  /**
   * Register an AI agent in the orchestration system
   */
  public registerAgent(agent: AIAgent): Result<void> {
    this.agentRegistry.set(agent.agentId.value, agent);
    
    // Initialize performance metrics
    const metrics: AgentPerformanceMetrics = {
      totalExecutions: agent.executionCount,
      successfulExecutions: agent.successCount,
      failedExecutions: agent.failureCount,
      averageExecutionTime: agent.averageExecutionTime || 0,
      averageMatchScore: 0,
      lastExecutionTime: agent.lastExecutedAt || new Date(),
      currentLoad: 0
    };
    
    this.orchestrationState.agentPerformanceMetrics.set(agent.agentId.value, metrics);
    
    return Result.ok<void>(undefined);
  }

  /**
   * Register node metadata for semantic search and agent discovery
   */
  public registerNodeMetadata(metadata: NodeMetadata): Result<void> {
    this.metadataRegistry.set(metadata.nodeId.value, metadata);
    return Result.ok<void>(undefined);
  }

  /**
   * Discover suitable agents for a task based on capabilities and context
   */
  public discoverAgents(
    requiredCapabilities: string[],
    featureType?: FeatureType,
    entityId?: string,
    nodeId?: NodeId,
    contextKeywords?: string[]
  ): Result<AgentCapabilityMatch[]> {
    const matches: AgentCapabilityMatch[] = [];

    for (const agent of Array.from(this.agentRegistry.values())) {
      // Filter by feature type if specified
      if (featureType && agent.featureType !== featureType) {
        continue;
      }

      // Filter by entity if specified
      if (entityId && agent.entityId !== entityId) {
        continue;
      }

      // Filter by node if specified
      if (nodeId && (!agent.nodeId || !agent.nodeId.equals(nodeId))) {
        continue;
      }

      // Skip disabled agents
      if (!agent.isEnabled) {
        continue;
      }

      const match = this.calculateCapabilityMatch(agent, requiredCapabilities, contextKeywords);
      if (match.matchScore > 0.3) { // Minimum threshold for consideration
        matches.push(match);
      }
    }

    // Sort by match score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return Result.ok<AgentCapabilityMatch[]>(matches);
  }

  /**
   * Execute a task using the best available agent
   */
  public async executeTask(request: AgentExecutionRequest): Promise<Result<string>> {
    const requestId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if we're at capacity
    if (this.orchestrationState.activeExecutions.size >= this.maxConcurrentExecutions) {
      this.orchestrationState.queuedRequests.push(request);
      return Result.ok<string>(`${requestId}_queued`);
    }

    // Find the best agent for the task
    const agentDiscovery = this.discoverAgents(request.requiredCapabilities || []);
    if (agentDiscovery.isFailure) {
      return Result.fail<string>(agentDiscovery.error);
    }

    const availableAgents = agentDiscovery.value;
    if (availableAgents.length === 0) {
      return Result.fail<string>('No suitable agents found for the task');
    }

    const bestAgent = availableAgents[0];
    const agent = this.agentRegistry.get(bestAgent.agentId.value)!;

    // Add to active executions
    this.orchestrationState.activeExecutions.set(requestId, request);

    try {
      // Execute the task
      const result = await this.performAgentExecution(agent, request, requestId);
      
      // Update performance metrics
      this.updateAgentMetrics(agent.agentId, result);

      // Remove from active executions
      this.orchestrationState.activeExecutions.delete(requestId);

      // Store result
      if (result.success) {
        this.orchestrationState.completedExecutions.push(result);
      } else {
        this.orchestrationState.failedExecutions.push(result);
      }

      // Process queued requests
      await this.processQueuedRequests();

      return Result.ok<string>(requestId);
    } catch (error) {
      // Remove from active executions
      this.orchestrationState.activeExecutions.delete(requestId);

      const failedResult: AgentExecutionResult = {
        requestId,
        agentId: agent.agentId,
        success: false,
        error: String(error),
        executionTime: 0,
        capabilitiesUsed: [],
        contextAccessed: [],
        timestamp: new Date()
      };

      this.orchestrationState.failedExecutions.push(failedResult);
      this.updateAgentMetrics(agent.agentId, failedResult);

      return Result.fail<string>(`Task execution failed: ${error}`);
    }
  }

  /**
   * Get execution result by request ID
   */
  public getExecutionResult(requestId: string): Result<AgentExecutionResult> {
    // Check completed executions
    const completedResult = this.orchestrationState.completedExecutions.find(
      result => result.requestId === requestId
    );
    if (completedResult) {
      return Result.ok<AgentExecutionResult>(completedResult);
    }

    // Check failed executions
    const failedResult = this.orchestrationState.failedExecutions.find(
      result => result.requestId === requestId
    );
    if (failedResult) {
      return Result.ok<AgentExecutionResult>(failedResult);
    }

    // Check if still executing
    if (this.orchestrationState.activeExecutions.has(requestId)) {
      return Result.fail<AgentExecutionResult>('Task is still executing');
    }

    return Result.fail<AgentExecutionResult>('Execution result not found');
  }

  /**
   * Get agent performance metrics
   */
  public getAgentMetrics(agentId: NodeId): Result<AgentPerformanceMetrics> {
    const metrics = this.orchestrationState.agentPerformanceMetrics.get(agentId.value);
    if (!metrics) {
      return Result.fail<AgentPerformanceMetrics>('Agent metrics not found');
    }

    return Result.ok<AgentPerformanceMetrics>({ ...metrics });
  }

  /**
   * Handle agent failure and recovery
   */
  public async handleAgentFailure(
    agentId: NodeId,
    failureReason: string,
    recoveryAction?: 'disable' | 'restart' | 'retry'
  ): Promise<Result<void>> {
    const agent = this.agentRegistry.get(agentId.value);
    if (!agent) {
      return Result.fail<void>('Agent not found');
    }

    // Agent execution failed - failure details available in result

    switch (recoveryAction) {
      case 'disable':
        const disableResult = agent.disable();
        if (disableResult.isFailure) {
          return disableResult;
        }
        break;
      
      case 'restart':
        // Restart logic would go here
        // For now, just re-enable the agent
        const enableResult = agent.enable();
        if (enableResult.isFailure) {
          return enableResult;
        }
        break;
      
      case 'retry':
        // Retry logic would be handled at the orchestration level
        break;
    }

    return Result.ok<void>(undefined);
  }

  /**
   * Perform semantic search for agents based on context
   */
  public performSemanticAgentSearch(
    query: string,
    featureType?: FeatureType,
    maxResults: number = 10
  ): Result<AgentCapabilityMatch[]> {
    const matches: AgentCapabilityMatch[] = [];

    // Simple keyword-based matching (in real implementation would use vector embeddings)
    const queryKeywords = query.toLowerCase().split(' ');

    for (const metadata of Array.from(this.metadataRegistry.values())) {
      if (featureType && metadata.featureType !== featureType) {
        continue;
      }

      // Find associated agent
      const associatedAgents = Array.from(this.agentRegistry.values()).filter(agent =>
        agent.nodeId && agent.nodeId.equals(metadata.nodeId)
      );

      for (const agent of associatedAgents) {
        if (!agent.isEnabled) continue;

        // Calculate semantic match score
        const matchScore = this.calculateSemanticMatch(queryKeywords, metadata, agent);
        
        if (matchScore > 0.2) {
          matches.push({
            agentId: agent.agentId,
            matchScore,
            availableCapabilities: agent.tools.availableTools,
            missingCapabilities: [],
            currentLoad: this.getCurrentAgentLoad(agent.agentId)
          });
        }
      }
    }

    // Sort by match score and limit results
    matches.sort((a, b) => b.matchScore - a.matchScore);
    return Result.ok<AgentCapabilityMatch[]>(matches.slice(0, maxResults));
  }

  /**
   * Coordinate workflow execution with multiple agents
   */
  public async coordinateWorkflowExecution(
    tasks: AgentExecutionRequest[],
    executionMode: 'sequential' | 'parallel' = 'sequential'
  ): Promise<Result<AgentExecutionResult[]>> {
    const results: AgentExecutionResult[] = [];

    try {
      if (executionMode === 'sequential') {
        for (const task of tasks) {
          const executionId = await this.executeTask(task);
          if (executionId.isFailure) {
            throw new Error(executionId.error);
          }

          // Wait for completion
          await this.waitForExecution(executionId.value);
          const result = this.getExecutionResult(executionId.value);
          if (result.isSuccess) {
            results.push(result.value);
          }
        }
      } else {
        // Parallel execution
        const promises = tasks.map(task => this.executeTask(task));
        const executionIds = await Promise.all(promises);

        for (const executionIdResult of executionIds) {
          if (executionIdResult.isSuccess) {
            await this.waitForExecution(executionIdResult.value);
            const result = this.getExecutionResult(executionIdResult.value);
            if (result.isSuccess) {
              results.push(result.value);
            }
          }
        }
      }

      return Result.ok<AgentExecutionResult[]>(results);
    } catch (error) {
      return Result.fail<AgentExecutionResult[]>(`Workflow execution failed: ${error}`);
    }
  }

  private calculateCapabilityMatch(
    agent: AIAgent,
    requiredCapabilities: string[],
    contextKeywords?: string[]
  ): AgentCapabilityMatch {
    const availableCapabilities = agent.tools.availableTools;
    const missingCapabilities = requiredCapabilities.filter(cap => 
      !availableCapabilities.includes(cap)
    );

    // Base match score based on capability overlap
    let matchScore = requiredCapabilities.length === 0 ? 1.0 : 
      (requiredCapabilities.length - missingCapabilities.length) / requiredCapabilities.length;

    // Boost score for context keyword matches
    if (contextKeywords && contextKeywords.length > 0) {
      const instructionKeywords = agent.instructions.toLowerCase().split(' ');
      const keywordMatches = contextKeywords.filter(keyword =>
        instructionKeywords.some(instrKeyword => instrKeyword.includes(keyword.toLowerCase()))
      );
      
      const keywordBonus = keywordMatches.length / contextKeywords.length * 0.3;
      matchScore += keywordBonus;
    }

    // Apply load penalty
    const currentLoad = this.getCurrentAgentLoad(agent.agentId);
    const loadPenalty = currentLoad / agent.capabilities.maxConcurrentTasks * 0.2;
    matchScore = Math.max(0, matchScore - loadPenalty);

    return {
      agentId: agent.agentId,
      matchScore: Math.max(0, matchScore), // Allow scores > 1.0 for bonuses
      availableCapabilities,
      missingCapabilities,
      currentLoad
    };
  }

  private async performAgentExecution(
    agent: AIAgent,
    request: AgentExecutionRequest,
    requestId: string
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    try {
      // Get required context
      const contextResult = await this.gatherExecutionContext(agent, request);
      const executionContext = contextResult.isSuccess ? contextResult.value : {};

      // Simulate agent execution (in real implementation, this would call the actual agent)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      // Record execution in agent
      const executionTime = Date.now() - startTime;
      await agent.recordExecution(true, executionTime);

      return {
        requestId,
        agentId: agent.agentId,
        success: true,
        output: { result: 'Task completed successfully', context: executionContext },
        executionTime,
        capabilitiesUsed: request.requiredCapabilities || [],
        contextAccessed: Object.keys(executionContext),
        timestamp: new Date()
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      await agent.recordExecution(false, executionTime);

      return {
        requestId,
        agentId: agent.agentId,
        success: false,
        error: String(error),
        executionTime,
        capabilitiesUsed: [],
        contextAccessed: [],
        timestamp: new Date()
      };
    }
  }

  private async gatherExecutionContext(
    agent: AIAgent,
    request: AgentExecutionRequest
  ): Promise<Result<Record<string, any>>> {
    const context: Record<string, any> = { ...request.context };

    // If agent is node-level, get node context
    if (agent.nodeId) {
      const nodeContextResult = this.contextAccessService.getNodeContextWithAccess(
        agent.agentId,
        agent.nodeId,
        'read'
      );

      if (nodeContextResult.isSuccess) {
        context.nodeContext = nodeContextResult.value.contextData;
      }
    }

    return Result.ok<Record<string, any>>(context);
  }

  private calculateSemanticMatch(
    queryKeywords: string[],
    metadata: NodeMetadata,
    agent: AIAgent
  ): number {
    let score = 0;

    // Check keyword matches
    const metadataKeywords = metadata.searchKeywords;
    const keywordMatches = queryKeywords.filter(query =>
      metadataKeywords.some(meta => meta.includes(query))
    );
    score += keywordMatches.length / queryKeywords.length * 0.4;

    // Check semantic tag matches
    if (metadata.semanticTags) {
      const tagMatches = queryKeywords.filter(query =>
        metadata.semanticTags!.some(tag => tag.includes(query))
      );
      score += tagMatches.length / queryKeywords.length * 0.3;
    }

    // Check instruction matches
    const instructionWords = agent.instructions.toLowerCase().split(' ');
    const instructionMatches = queryKeywords.filter(query =>
      instructionWords.some(word => word.includes(query))
    );
    score += instructionMatches.length / queryKeywords.length * 0.3;

    return Math.min(1.0, score);
  }

  private getCurrentAgentLoad(agentId: NodeId): number {
    const activeCount = Array.from(this.orchestrationState.activeExecutions.values())
      .filter(request => {
        // This is simplified - in real implementation we'd track which agent is executing each request
        return false;
      }).length;

    const agent = this.agentRegistry.get(agentId.value);
    if (!agent) return 0;

    return activeCount / agent.capabilities.maxConcurrentTasks;
  }

  private updateAgentMetrics(agentId: NodeId, result: AgentExecutionResult): void {
    const metrics = this.orchestrationState.agentPerformanceMetrics.get(agentId.value);
    if (!metrics) return;

    metrics.totalExecutions++;
    metrics.lastExecutionTime = result.timestamp;

    if (result.success) {
      metrics.successfulExecutions++;
    } else {
      metrics.failedExecutions++;
    }

    // Update average execution time
    metrics.averageExecutionTime = 
      (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + result.executionTime) / metrics.totalExecutions;
  }

  private async processQueuedRequests(): Promise<void> {
    while (
      this.orchestrationState.queuedRequests.length > 0 && 
      this.orchestrationState.activeExecutions.size < this.maxConcurrentExecutions
    ) {
      const nextRequest = this.orchestrationState.queuedRequests.shift();
      if (nextRequest) {
        await this.executeTask(nextRequest);
      }
    }
  }

  private async waitForExecution(executionId: string): Promise<void> {
    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 1000; // 1 second
    let waitTime = 0;

    while (waitTime < maxWaitTime) {
      if (!this.orchestrationState.activeExecutions.has(executionId)) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
    }

    throw new Error('Execution timeout');
  }
}