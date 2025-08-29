/**
 * Discover Agents by Capability Use Case (UC-018)
 * 
 * Implements capability-based agent discovery with sophisticated scoring algorithms.
 * This use case evaluates agents based on their capabilities and provides scored
 * results for optimal agent selection.
 * 
 * Business Rules:
 * - Only enabled agents are considered for discovery
 * - Required capabilities must be fully satisfied
 * - Optional capabilities contribute to scoring but are not mandatory
 * - Agents are ranked by capability match score
 * - Minimum score threshold filters out poor matches
 * 
 * Architecture Compliance:
 * - Uses domain entities and repositories
 * - Implements complex business logic for scoring
 * - Returns scored and ranked results
 */

import { AIAgent, AIAgentCapabilities } from '../../domain/entities/ai-agent';
import { AIAgentRepository } from '../../domain/interfaces/ai-agent-repository';
import { IAuditLogRepository } from '../../domain/interfaces/audit-log-repository';
import { Result } from '../../domain/shared/result';
import { AuditLog } from '../../domain/entities/audit-log';

export interface DiscoverAgentsByCapabilityRequest {
  requiredCapabilities: string[];
  optionalCapabilities?: string[];
  minimumScore: number;
  maxResults: number;
  strictMode?: boolean;
  userId: string;
}

export interface AgentCapabilityMatch {
  agentId: string;
  name: string;
  capabilities: AIAgentCapabilities;
  score: number;
  matchingCapabilities: string[];
}

export interface DiscoverAgentsByCapabilityResponse {
  agents: AgentCapabilityMatch[];
  totalMatched: number;
  searchCriteria: Record<string, any>;
}

export class DiscoverAgentsByCapabilityUseCase {
  constructor(
    private readonly agentRepository: AIAgentRepository,
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async execute(request: DiscoverAgentsByCapabilityRequest): Promise<Result<DiscoverAgentsByCapabilityResponse>> {
    try {
      // Validate request
      const validationResult = this.validateRequest(request);
      if (validationResult.isFailure) {
        await this.auditDiscoveryFailure(request, validationResult.error);
        return Result.fail(validationResult.error);
      }

      // Get all enabled agents
      const enabledAgentsResult = await this.agentRepository.findEnabled();
      if (enabledAgentsResult.isFailure) {
        await this.auditDiscoveryFailure(request, enabledAgentsResult.error);
        return Result.fail(`Failed to retrieve enabled agents: ${enabledAgentsResult.error}`);
      }

      const allAgents = enabledAgentsResult.value;

      // Filter and score agents based on capabilities
      const scoredAgents = await this.scoreAgentsByCapabilities(allAgents, request);

      // Filter by minimum score
      const qualifyingAgents = scoredAgents.filter(agent => agent.score >= request.minimumScore);

      // Sort by score (highest first) and limit results
      const rankedAgents = qualifyingAgents
        .sort((a, b) => b.score - a.score)
        .slice(0, request.maxResults);

      const response: DiscoverAgentsByCapabilityResponse = {
        agents: rankedAgents,
        totalMatched: qualifyingAgents.length,
        searchCriteria: {
          requiredCapabilities: request.requiredCapabilities,
          optionalCapabilities: request.optionalCapabilities,
          minimumScore: request.minimumScore,
          strictMode: request.strictMode
        }
      };

      // Audit successful discovery
      await this.auditSuccessfulDiscovery(request, response);

      return Result.ok(response);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during agent discovery';
      await this.auditDiscoveryFailure(request, errorMessage);
      return Result.fail(`Agent discovery failed: ${errorMessage}`);
    }
  }

  private validateRequest(request: DiscoverAgentsByCapabilityRequest): Result<void> {
    if (!request.requiredCapabilities || request.requiredCapabilities.length === 0) {
      return Result.fail('At least one required capability must be specified');
    }

    if (request.minimumScore < 0 || request.minimumScore > 1) {
      return Result.fail('Minimum score must be between 0 and 1');
    }

    if (request.maxResults < 1 || request.maxResults > 1000) {
      return Result.fail('Max results must be between 1 and 1000');
    }

    return Result.ok();
  }

  private async scoreAgentsByCapabilities(agents: AIAgent[], request: DiscoverAgentsByCapabilityRequest): Promise<AgentCapabilityMatch[]> {
    const scoredAgents: AgentCapabilityMatch[] = [];

    for (const agent of agents) {
      const scoring = this.calculateCapabilityScore(agent, request);
      
      // In strict mode, only include agents that satisfy ALL required capabilities
      if (request.strictMode && !scoring.satisfiesAllRequired) {
        continue;
      }

      // Include agents that satisfy at least some required capabilities
      if (scoring.score > 0) {
        scoredAgents.push({
          agentId: agent.agentId.value,
          name: agent.name,
          capabilities: agent.capabilities,
          score: scoring.score,
          matchingCapabilities: scoring.matchingCapabilities
        });
      }
    }

    return scoredAgents;
  }

  private calculateCapabilityScore(agent: AIAgent, request: DiscoverAgentsByCapabilityRequest): {
    score: number;
    matchingCapabilities: string[];
    satisfiesAllRequired: boolean;
  } {
    const matchingCapabilities: string[] = [];
    let requiredMatches = 0;
    let optionalMatches = 0;

    // Check required capabilities
    for (const requiredCap of request.requiredCapabilities) {
      if (this.agentHasCapability(agent, requiredCap)) {
        requiredMatches++;
        matchingCapabilities.push(requiredCap);
      }
    }

    // Check optional capabilities
    if (request.optionalCapabilities) {
      for (const optionalCap of request.optionalCapabilities) {
        if (this.agentHasCapability(agent, optionalCap)) {
          optionalMatches++;
          matchingCapabilities.push(optionalCap);
        }
      }
    }

    const satisfiesAllRequired = requiredMatches === request.requiredCapabilities.length;

    // Calculate weighted score
    const requiredWeight = 0.8;
    const optionalWeight = 0.2;

    const requiredScore = requiredMatches / request.requiredCapabilities.length;
    const optionalScore = request.optionalCapabilities ? 
      optionalMatches / request.optionalCapabilities.length : 0;

    const finalScore = (requiredScore * requiredWeight) + (optionalScore * optionalWeight);

    // Apply performance bonus based on agent's track record
    const performanceBonus = this.calculatePerformanceBonus(agent);
    const adjustedScore = Math.min(1.0, finalScore + performanceBonus);

    return {
      score: adjustedScore,
      matchingCapabilities,
      satisfiesAllRequired
    };
  }

  private agentHasCapability(agent: AIAgent, capability: string): boolean {
    const capabilities = agent.capabilities;
    
    // Handle boolean capabilities
    if (capability in capabilities) {
      const capabilityValue = capabilities[capability as keyof AIAgentCapabilities];
      if (typeof capabilityValue === 'boolean') {
        return capabilityValue;
      }
    }

    // Handle data type capabilities
    if (capability.startsWith('dataType:')) {
      const dataType = capability.substring(9);
      return capabilities.supportedDataTypes.includes(dataType);
    }

    // Handle concurrent task capabilities
    if (capability.startsWith('minConcurrentTasks:')) {
      const minTasks = parseInt(capability.substring(19));
      return capabilities.maxConcurrentTasks >= minTasks;
    }

    // Handle tool capabilities
    if (capability.startsWith('tool:')) {
      const toolName = capability.substring(5);
      return agent.hasTool(toolName);
    }

    return false;
  }

  private calculatePerformanceBonus(agent: AIAgent): number {
    const successRate = agent.getSuccessRate();
    const executionCount = agent.executionCount;

    // Bonus for high success rate with significant execution history
    if (executionCount > 10 && successRate > 0.9) {
      return 0.05; // 5% bonus
    } else if (executionCount > 5 && successRate > 0.8) {
      return 0.03; // 3% bonus
    } else if (successRate > 0.7) {
      return 0.01; // 1% bonus
    }

    return 0; // No bonus for low performance or new agents
  }

  private async auditSuccessfulDiscovery(request: DiscoverAgentsByCapabilityRequest, response: DiscoverAgentsByCapabilityResponse): Promise<void> {
    try {
      const auditLog = AuditLog.create({
        action: 'AGENT_CAPABILITY_DISCOVERY_COMPLETED',
        userId: request.userId,
        details: {
          requiredCapabilities: request.requiredCapabilities,
          optionalCapabilities: request.optionalCapabilities,
          minimumScore: request.minimumScore,
          maxResults: request.maxResults,
          agentsFound: response.agents.length,
          totalMatched: response.totalMatched,
          topScore: response.agents.length > 0 ? response.agents[0].score : 0,
          averageScore: response.agents.length > 0 ? 
            response.agents.reduce((sum, agent) => sum + agent.score, 0) / response.agents.length : 0
        }
      });

      if (auditLog.isSuccess) {
        await this.auditRepository.save(auditLog.value);
      }
    } catch (error) {
      console.error('Failed to audit agent discovery:', error);
    }
  }

  private async auditDiscoveryFailure(request: DiscoverAgentsByCapabilityRequest, error: string): Promise<void> {
    try {
      const auditLog = AuditLog.create({
        action: 'AGENT_CAPABILITY_DISCOVERY_FAILED',
        userId: request.userId,
        details: {
          requiredCapabilities: request.requiredCapabilities,
          error: error,
          failureReason: 'validation_or_system_error'
        }
      });

      if (auditLog.isSuccess) {
        await this.auditRepository.save(auditLog.value);
      }
    } catch (auditError) {
      console.error('Failed to audit agent discovery failure:', auditError);
    }
  }
}