import { NodeId } from '../../domain/value-objects/node-id';
import { AIAgent, AIAgentCapabilities, AIAgentTools } from '../../domain/entities/ai-agent';
import { NodeMetadata } from '../../domain/entities/node-metadata';
import { FeatureType } from '../../domain/enums';
import { 
  AIAgentOrchestrationService,
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentCapabilityMatch
} from '../../domain/services/ai-agent-orchestration-service';
import { NodeContextAccessService } from '../../domain/services/node-context-access-service';
import { Result } from '../../domain/shared/result';

export interface RegisterAgentRequest {
  agentId: NodeId;
  featureType: FeatureType;
  entityId: string;
  nodeId?: NodeId;
  name: string;
  description?: string;
  instructions: string;
  tools: AIAgentTools;
  capabilities: AIAgentCapabilities;
  isEnabled: boolean;
}

export interface DiscoverAgentsRequest {
  requiredCapabilities: string[];
  featureType?: FeatureType;
  entityId?: string;
  nodeId?: NodeId;
  contextKeywords?: string[];
}

export interface SemanticSearchRequest {
  query: string;
  featureType?: FeatureType;
  maxResults?: number;
}

export interface WorkflowExecutionRequest {
  tasks: AgentExecutionRequest[];
  executionMode: 'sequential' | 'parallel';
}

/**
 * ManageAiAgentOrchestrationUseCase coordinates AI agent operations across the system,
 * implementing UC-017 through UC-021 for comprehensive AI agent lifecycle management.
 */
export class ManageAiAgentOrchestrationUseCase {
  constructor(
    private orchestrationService: AIAgentOrchestrationService,
    private contextAccessService: NodeContextAccessService
  ) {}

  /**
   * UC-017: Register AI Agent
   * Registers an AI agent for capability-based task execution
   */
  public async registerAgent(request: RegisterAgentRequest): Promise<Result<NodeId>> {
    // Validate agent registration request
    if (!request.name?.trim()) {
      return Result.fail<NodeId>('Agent name is required');
    }

    if (!request.instructions?.trim()) {
      return Result.fail<NodeId>('Agent instructions are required');
    }

    if (!request.tools.availableTools || request.tools.availableTools.length === 0) {
      return Result.fail<NodeId>('Agent must have at least one available tool');
    }

    // Create agent entity
    const agentResult = AIAgent.create({
      agentId: request.agentId,
      featureType: request.featureType,
      entityId: request.entityId,
      nodeId: request.nodeId,
      name: request.name,
      description: request.description,
      instructions: request.instructions,
      tools: request.tools,
      capabilities: request.capabilities,
      isEnabled: request.isEnabled
    });

    if (agentResult.isFailure) {
      return Result.fail<NodeId>(`Failed to create agent: ${agentResult.error}`);
    }

    const agent = agentResult.value;

    // Register agent in orchestration service
    const registrationResult = this.orchestrationService.registerAgent(agent);
    if (registrationResult.isFailure) {
      return Result.fail<NodeId>(`Failed to register agent: ${registrationResult.error}`);
    }

    // Index agent capabilities for discovery (implicit in registration)
    // Performance metrics are automatically initialized during registration

    return Result.ok<NodeId>(agent.agentId);
  }

  /**
   * UC-018: Discover Agents by Capability
   * Finds suitable AI agents for task requirements with capability matching
   */
  public async discoverAgentsByCapability(request: DiscoverAgentsRequest): Promise<Result<AgentCapabilityMatch[]>> {
    // Validate capability requirements
    if (!request.requiredCapabilities || request.requiredCapabilities.length === 0) {
      return Result.fail<AgentCapabilityMatch[]>('At least one capability requirement must be specified');
    }

    // Filter enabled agents and match capabilities to requirements
    const discoveryResult = this.orchestrationService.discoverAgents(
      request.requiredCapabilities,
      request.featureType,
      request.entityId,
      request.nodeId,
      request.contextKeywords
    );

    if (discoveryResult.isFailure) {
      return Result.fail<AgentCapabilityMatch[]>(`Agent discovery failed: ${discoveryResult.error}`);
    }

    // Results are already sorted by match score in descending order
    const matches = discoveryResult.value;

    // Apply additional filtering if needed
    const filteredMatches = matches.filter(match => {
      // Only include agents with meaningful match scores
      return match.matchScore >= 0.3;
    });

    return Result.ok<AgentCapabilityMatch[]>(filteredMatches);
  }

  /**
   * UC-019: Execute AI Agent Task
   * Executes task using the most suitable AI agent with performance tracking
   */
  public async executeAgentTask(request: AgentExecutionRequest): Promise<Result<string>> {
    // Validate task execution request
    if (!request.task?.trim()) {
      return Result.fail<string>('Task description is required');
    }

    if (!request.agentId) {
      return Result.fail<string>('Agent ID is required');
    }

    if (request.priority < 0 || request.priority > 10) {
      return Result.fail<string>('Priority must be between 0 and 10');
    }

    // Execute task with selected agent
    // The service will discover suitable agents, check capacity, and execute
    const executionResult = await this.orchestrationService.executeTask(request);

    if (executionResult.isFailure) {
      return Result.fail<string>(`Task execution failed: ${executionResult.error}`);
    }

    // Performance metrics are automatically updated during execution
    return Result.ok<string>(executionResult.value);
  }

  /**
   * UC-020: Perform Semantic Agent Search
   * Finds agents using natural language queries with semantic matching
   */
  public async performSemanticAgentSearch(request: SemanticSearchRequest): Promise<Result<AgentCapabilityMatch[]>> {
    // Validate semantic search query
    if (!request.query?.trim()) {
      return Result.fail<AgentCapabilityMatch[]>('Search query is required');
    }

    if (request.query.length < 3) {
      return Result.fail<AgentCapabilityMatch[]>('Search query must be at least 3 characters long');
    }

    const maxResults = request.maxResults || 10;
    if (maxResults < 1 || maxResults > 50) {
      return Result.fail<AgentCapabilityMatch[]>('Max results must be between 1 and 50');
    }

    // Perform semantic search using natural language processing
    const searchResult = this.orchestrationService.performSemanticAgentSearch(
      request.query,
      request.featureType,
      maxResults
    );

    if (searchResult.isFailure) {
      return Result.fail<AgentCapabilityMatch[]>(`Semantic search failed: ${searchResult.error}`);
    }

    // Filter out disabled agents (already handled in service)
    // Results are already ranked by semantic match scores
    return Result.ok<AgentCapabilityMatch[]>(searchResult.value);
  }

  /**
   * UC-021: Coordinate Workflow Agent Execution
   * Executes multiple agent tasks in coordinated workflow with various execution modes
   */
  public async coordinateWorkflowExecution(request: WorkflowExecutionRequest): Promise<Result<AgentExecutionResult[]>> {
    // Validate workflow task list
    if (!request.tasks || request.tasks.length === 0) {
      return Result.fail<AgentExecutionResult[]>('Workflow must contain at least one task');
    }

    if (request.tasks.length > 20) {
      return Result.fail<AgentExecutionResult[]>('Workflow cannot exceed 20 tasks');
    }

    // Validate execution mode
    if (!['sequential', 'parallel'].includes(request.executionMode)) {
      return Result.fail<AgentExecutionResult[]>('Execution mode must be either "sequential" or "parallel"');
    }

    // Validate individual tasks
    for (let i = 0; i < request.tasks.length; i++) {
      const task = request.tasks[i];
      if (!task.task?.trim()) {
        return Result.fail<AgentExecutionResult[]>(`Task ${i + 1} description is required`);
      }
      if (!task.agentId) {
        return Result.fail<AgentExecutionResult[]>(`Task ${i + 1} agent ID is required`);
      }
    }

    // Plan and execute tasks according to specified mode
    const coordinationResult = await this.orchestrationService.coordinateWorkflowExecution(
      request.tasks,
      request.executionMode
    );

    if (coordinationResult.isFailure) {
      return Result.fail<AgentExecutionResult[]>(`Workflow coordination failed: ${coordinationResult.error}`);
    }

    // Aggregate and return results
    const results = coordinationResult.value;
    
    // Validate that all tasks were executed (or failed)
    if (results.length !== request.tasks.length) {
      return Result.fail<AgentExecutionResult[]>(
        `Expected ${request.tasks.length} results, but got ${results.length}`
      );
    }

    return Result.ok<AgentExecutionResult[]>(results);
  }

  /**
   * Register node metadata for semantic search capabilities
   */
  public async registerNodeMetadata(metadata: NodeMetadata): Promise<Result<void>> {
    const registrationResult = this.orchestrationService.registerNodeMetadata(metadata);
    if (registrationResult.isFailure) {
      return Result.fail<void>(`Failed to register node metadata: ${registrationResult.error}`);
    }

    return Result.ok<void>(undefined);
  }

  /**
   * Get execution result for monitoring and debugging
   */
  public async getExecutionResult(requestId: string): Promise<Result<AgentExecutionResult>> {
    if (!requestId?.trim()) {
      return Result.fail<AgentExecutionResult>('Request ID is required');
    }

    return this.orchestrationService.getExecutionResult(requestId);
  }

  /**
   * Get agent performance metrics for monitoring and optimization
   */
  public async getAgentPerformanceMetrics(agentId: NodeId): Promise<Result<any>> {
    return this.orchestrationService.getAgentMetrics(agentId);
  }
}