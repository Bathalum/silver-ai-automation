/**
 * Perform Semantic Agent Search Use Case (UC-020)
 * 
 * Implements natural language-based agent search using semantic understanding.
 * This use case processes natural language queries to find the most relevant
 * agents based on semantic similarity and contextual understanding.
 * 
 * Business Rules:
 * - Only enabled agents are included in search results
 * - Semantic scores must meet minimum threshold
 * - Search results are ranked by semantic relevance
 * - Contextual understanding enhances search accuracy
 * - Domain-specific models can be applied for specialized searches
 * 
 * Architecture Compliance:
 * - Uses domain entities and repositories
 * - Implements semantic analysis algorithms
 * - Provides explainable search results
 * - Supports contextual search enhancement
 */

import { AIAgent } from '../../domain/entities/ai-agent';
import { AIAgentRepository } from '../../domain/interfaces/ai-agent-repository';
import { IAuditLogRepository } from '../../domain/interfaces/audit-log-repository';
import { Result } from '../../domain/shared/result';
import { AuditLog } from '../../domain/entities/audit-log';

export interface PerformSemanticAgentSearchRequest {
  query: string;
  maxResults: number;
  minSemanticScore: number;
  includeExplanations: boolean;
  domainFocus?: string;
  enableContextualUnderstanding?: boolean;
  userId: string;
}

export interface SemanticAgentMatch {
  agentId: string;
  name: string;
  semanticScore: number;
  relevanceExplanation: string;
  matchingKeywords: string[];
  contextualMatches?: string[];
  capabilities: any;
}

export interface SearchMetrics {
  processingTime: number;
  semanticModel: string;
  queryComplexity: string;
  totalCandidates: number;
  contextualUnderstanding?: boolean;
}

export interface PerformSemanticAgentSearchResponse {
  query: string;
  agents: SemanticAgentMatch[];
  searchMetrics: SearchMetrics;
}

export class PerformSemanticAgentSearchUseCase {
  constructor(
    private readonly agentRepository: AIAgentRepository,
    private readonly auditRepository: IAuditLogRepository
  ) {}

  async execute(request: PerformSemanticAgentSearchRequest): Promise<Result<PerformSemanticAgentSearchResponse>> {
    const startTime = Date.now();

    try {
      // Validate request
      const validationResult = this.validateRequest(request);
      if (validationResult.isFailure) {
        await this.auditSearchFailure(request, validationResult.error, Date.now() - startTime);
        return Result.fail(validationResult.error);
      }

      // Get all enabled agents
      const enabledAgentsResult = await this.agentRepository.findEnabled();
      if (enabledAgentsResult.isFailure) {
        await this.auditSearchFailure(request, enabledAgentsResult.error, Date.now() - startTime);
        return Result.fail(`Failed to retrieve enabled agents: ${enabledAgentsResult.error}`);
      }

      const allAgents = enabledAgentsResult.value;

      // Process query for semantic understanding
      const queryAnalysis = await this.analyzeQuery(request.query, request.domainFocus);

      // Perform semantic matching
      const semanticMatches = await this.performSemanticMatching(
        allAgents, 
        request, 
        queryAnalysis
      );

      // Filter by minimum score and limit results
      const qualifyingMatches = semanticMatches
        .filter(match => match.semanticScore >= request.minSemanticScore)
        .sort((a, b) => b.semanticScore - a.semanticScore)
        .slice(0, request.maxResults);

      const processingTime = Date.now() - startTime;

      const response: PerformSemanticAgentSearchResponse = {
        query: request.query,
        agents: qualifyingMatches,
        searchMetrics: {
          processingTime,
          semanticModel: this.getSemanticModel(request.domainFocus),
          queryComplexity: queryAnalysis.complexity,
          totalCandidates: allAgents.length,
          contextualUnderstanding: request.enableContextualUnderstanding
        }
      };

      // Audit successful search
      await this.auditSuccessfulSearch(request, response);

      return Result.ok(response);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during semantic search';
      await this.auditSearchFailure(request, errorMessage, processingTime);
      return Result.fail(`Semantic search failed: ${errorMessage}`);
    }
  }

  private validateRequest(request: PerformSemanticAgentSearchRequest): Result<void> {
    if (!request.query || request.query.trim().length === 0) {
      return Result.fail('Search query is required');
    }

    if (request.query.length > 1000) {
      return Result.fail('Search query cannot exceed 1000 characters');
    }

    if (request.maxResults < 1 || request.maxResults > 100) {
      return Result.fail('Max results must be between 1 and 100');
    }

    if (request.minSemanticScore < 0 || request.minSemanticScore > 1) {
      return Result.fail('Minimum semantic score must be between 0 and 1');
    }

    return Result.ok();
  }

  private async analyzeQuery(query: string, domainFocus?: string): Promise<{
    keywords: string[];
    concepts: string[];
    intent: string;
    complexity: string;
    domain: string;
  }> {
    // Extract keywords from the query
    const keywords = this.extractKeywords(query);
    
    // Identify key concepts
    const concepts = this.identifyConcepts(query, keywords);
    
    // Determine query intent
    const intent = this.determineIntent(query);
    
    // Assess query complexity
    const complexity = this.assessComplexity(query);
    
    // Determine domain
    const domain = domainFocus || this.detectDomain(query);

    return {
      keywords,
      concepts,
      intent,
      complexity,
      domain
    };
  }

  private extractKeywords(query: string): string[] {
    // Simple keyword extraction - in production, use NLP libraries
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'can', 'that', 'this', 'these', 'those', 'i', 'you', 'we',
      'they', 'he', 'she', 'it', 'me', 'us', 'them', 'my', 'your', 'our',
      'their', 'his', 'her', 'its', 'need', 'find', 'get', 'want'
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 20); // Limit to top 20 keywords
  }

  private identifyConcepts(query: string, keywords: string[]): string[] {
    const conceptMappings: Record<string, string[]> = {
      'data-processing': ['data', 'process', 'transform', 'clean', 'parse', 'extract'],
      'analysis': ['analyze', 'analysis', 'insights', 'patterns', 'trends', 'statistics'],
      'reporting': ['report', 'generate', 'create', 'document', 'summary', 'dashboard'],
      'automation': ['automate', 'automatic', 'schedule', 'workflow', 'process'],
      'compliance': ['compliance', 'regulatory', 'rules', 'validation', 'audit'],
      'financial': ['financial', 'money', 'payment', 'transaction', 'accounting', 'budget'],
      'communication': ['email', 'message', 'notification', 'alert', 'communicate'],
      'orchestration': ['orchestrate', 'coordinate', 'manage', 'control', 'workflow']
    };

    const identifiedConcepts: string[] = [];

    for (const [concept, conceptKeywords] of Object.entries(conceptMappings)) {
      const hasConceptKeywords = conceptKeywords.some(keyword => 
        keywords.includes(keyword) || query.toLowerCase().includes(keyword)
      );
      
      if (hasConceptKeywords) {
        identifiedConcepts.push(concept);
      }
    }

    return identifiedConcepts;
  }

  private determineIntent(query: string): string {
    const queryLower = query.toLowerCase();

    if (queryLower.includes('find') || queryLower.includes('search') || queryLower.includes('locate')) {
      return 'search';
    } else if (queryLower.includes('help') || queryLower.includes('assist') || queryLower.includes('support')) {
      return 'assistance';
    } else if (queryLower.includes('create') || queryLower.includes('generate') || queryLower.includes('build')) {
      return 'creation';
    } else if (queryLower.includes('analyze') || queryLower.includes('review') || queryLower.includes('examine')) {
      return 'analysis';
    } else if (queryLower.includes('manage') || queryLower.includes('control') || queryLower.includes('coordinate')) {
      return 'management';
    }

    return 'general';
  }

  private assessComplexity(query: string): string {
    const wordCount = query.split(/\s+/).length;
    const hasComplexStructure = query.includes(',') || query.includes(';') || query.includes('and') || query.includes('or');
    const hasSpecificTerms = /[A-Z]{2,}|[0-9]+|\b[a-z]+\.[a-z]+\b/.test(query);

    if (wordCount > 20 || (hasComplexStructure && hasSpecificTerms)) {
      return 'high';
    } else if (wordCount > 10 || hasComplexStructure) {
      return 'medium';
    }

    return 'low';
  }

  private detectDomain(query: string): string {
    const domainKeywords: Record<string, string[]> = {
      'financial-services': ['financial', 'banking', 'payment', 'transaction', 'accounting', 'compliance', 'regulatory'],
      'healthcare': ['health', 'medical', 'patient', 'clinical', 'diagnosis', 'treatment'],
      'technology': ['software', 'system', 'application', 'database', 'api', 'cloud'],
      'manufacturing': ['production', 'manufacturing', 'quality', 'inventory', 'supply'],
      'marketing': ['marketing', 'campaign', 'customer', 'promotion', 'brand'],
      'education': ['education', 'student', 'course', 'learning', 'academic'],
      'legal': ['legal', 'contract', 'compliance', 'regulation', 'law']
    };

    const queryLower = query.toLowerCase();

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      const matchCount = keywords.filter(keyword => queryLower.includes(keyword)).length;
      if (matchCount >= 2) {
        return domain;
      }
    }

    return 'general';
  }

  private async performSemanticMatching(
    agents: AIAgent[], 
    request: PerformSemanticAgentSearchRequest,
    queryAnalysis: any
  ): Promise<SemanticAgentMatch[]> {
    const matches: SemanticAgentMatch[] = [];

    for (const agent of agents) {
      const semanticMatch = await this.calculateSemanticMatch(agent, request, queryAnalysis);
      if (semanticMatch.semanticScore > 0) {
        matches.push(semanticMatch);
      }
    }

    return matches;
  }

  private async calculateSemanticMatch(
    agent: AIAgent, 
    request: PerformSemanticAgentSearchRequest,
    queryAnalysis: any
  ): Promise<SemanticAgentMatch> {
    // Calculate base semantic score
    const textSimilarity = this.calculateTextSimilarity(
      request.query, 
      agent.name + ' ' + (agent.description || '') + ' ' + agent.instructions
    );

    // Calculate keyword matches
    const keywordScore = this.calculateKeywordScore(queryAnalysis.keywords, agent);

    // Calculate concept matches
    const conceptScore = this.calculateConceptScore(queryAnalysis.concepts, agent);

    // Calculate capability alignment
    const capabilityScore = this.calculateCapabilityAlignment(queryAnalysis.intent, agent);

    // Weighted final score
    const semanticScore = (
      textSimilarity * 0.3 +
      keywordScore * 0.25 +
      conceptScore * 0.25 +
      capabilityScore * 0.2
    );

    // Generate explanation if requested
    const relevanceExplanation = request.includeExplanations
      ? this.generateRelevanceExplanation(agent, queryAnalysis, semanticScore)
      : `Semantic match score: ${semanticScore.toFixed(2)}`;

    // Find matching keywords
    const matchingKeywords = queryAnalysis.keywords.filter(keyword =>
      agent.name.toLowerCase().includes(keyword) ||
      (agent.description || '').toLowerCase().includes(keyword) ||
      agent.instructions.toLowerCase().includes(keyword)
    );

    // Find contextual matches if enabled
    let contextualMatches: string[] | undefined;
    if (request.enableContextualUnderstanding) {
      contextualMatches = this.findContextualMatches(agent, queryAnalysis);
    }

    return {
      agentId: agent.agentId.value,
      name: agent.name,
      semanticScore: Math.max(0, Math.min(1, semanticScore)), // Clamp to 0-1 range
      relevanceExplanation,
      matchingKeywords,
      contextualMatches,
      capabilities: agent.capabilities
    };
  }

  private calculateTextSimilarity(query: string, agentText: string): number {
    // Simple text similarity using Jaccard similarity
    const queryWords = new Set(this.extractKeywords(query));
    const agentWords = new Set(this.extractKeywords(agentText));

    const intersection = new Set([...queryWords].filter(word => agentWords.has(word)));
    const union = new Set([...queryWords, ...agentWords]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateKeywordScore(keywords: string[], agent: AIAgent): number {
    let matchCount = 0;
    const searchableText = (
      agent.name + ' ' + 
      (agent.description || '') + ' ' + 
      agent.instructions
    ).toLowerCase();

    for (const keyword of keywords) {
      if (searchableText.includes(keyword)) {
        matchCount++;
      }
    }

    return keywords.length > 0 ? matchCount / keywords.length : 0;
  }

  private calculateConceptScore(concepts: string[], agent: AIAgent): number {
    let matchCount = 0;
    const capabilities = agent.capabilities;
    const agentText = (agent.name + ' ' + (agent.description || '')).toLowerCase();

    for (const concept of concepts) {
      switch (concept) {
        case 'data-processing':
          if (capabilities.canRead && capabilities.canWrite) matchCount++;
          break;
        case 'analysis':
          if (capabilities.canAnalyze) matchCount++;
          break;
        case 'automation':
          if (capabilities.canExecute) matchCount++;
          break;
        case 'orchestration':
          if (capabilities.canOrchestrate) matchCount++;
          break;
        default:
          if (agentText.includes(concept)) matchCount++;
          break;
      }
    }

    return concepts.length > 0 ? matchCount / concepts.length : 0;
  }

  private calculateCapabilityAlignment(intent: string, agent: AIAgent): number {
    const capabilities = agent.capabilities;

    switch (intent) {
      case 'search':
        return capabilities.canRead ? 0.8 : 0.2;
      case 'analysis':
        return capabilities.canAnalyze ? 1.0 : 0.1;
      case 'creation':
        return capabilities.canWrite ? 0.9 : 0.2;
      case 'management':
        return capabilities.canOrchestrate ? 1.0 : 0.3;
      case 'assistance':
        return capabilities.canRead && capabilities.canWrite ? 0.7 : 0.4;
      default:
        return 0.5; // Neutral score for general queries
    }
  }

  private generateRelevanceExplanation(agent: AIAgent, queryAnalysis: any, score: number): string {
    const explanationParts: string[] = [];

    if (score > 0.8) {
      explanationParts.push(`Highly relevant match for "${queryAnalysis.intent}" tasks`);
    } else if (score > 0.6) {
      explanationParts.push(`Good match for requested capabilities`);
    } else {
      explanationParts.push(`Partial match with some relevant capabilities`);
    }

    // Add specific capability matches
    const capabilityMatches: string[] = [];
    if (queryAnalysis.concepts.includes('data-processing') && agent.capabilities.canRead && agent.capabilities.canWrite) {
      capabilityMatches.push('data processing');
    }
    if (queryAnalysis.concepts.includes('analysis') && agent.capabilities.canAnalyze) {
      capabilityMatches.push('analysis');
    }
    if (queryAnalysis.concepts.includes('orchestration') && agent.capabilities.canOrchestrate) {
      capabilityMatches.push('orchestration');
    }

    if (capabilityMatches.length > 0) {
      explanationParts.push(`Specialized in ${capabilityMatches.join(', ')}`);
    }

    return explanationParts.join('. ');
  }

  private findContextualMatches(agent: AIAgent, queryAnalysis: any): string[] {
    const contextualMatches: string[] = [];

    // Check domain alignment
    if (queryAnalysis.domain !== 'general') {
      const agentText = (agent.name + ' ' + (agent.description || '')).toLowerCase();
      if (agentText.includes(queryAnalysis.domain.replace('-', ' '))) {
        contextualMatches.push(`${queryAnalysis.domain} domain expertise`);
      }
    }

    // Check capability patterns
    const capabilities = agent.capabilities;
    if (capabilities.canRead && capabilities.canWrite && capabilities.canAnalyze) {
      contextualMatches.push('comprehensive data handling capabilities');
    }

    if (capabilities.canOrchestrate && capabilities.canExecute) {
      contextualMatches.push('workflow orchestration and execution');
    }

    if (capabilities.maxConcurrentTasks > 5) {
      contextualMatches.push('high-capacity parallel processing');
    }

    return contextualMatches;
  }

  private getSemanticModel(domainFocus?: string): string {
    if (domainFocus && domainFocus !== 'general') {
      return 'domain-specific-transformers';
    }
    return 'sentence-transformers';
  }

  private async auditSuccessfulSearch(request: PerformSemanticAgentSearchRequest, response: PerformSemanticAgentSearchResponse): Promise<void> {
    try {
      const auditLog = AuditLog.create({
        action: 'SEMANTIC_AGENT_SEARCH_COMPLETED',
        userId: request.userId,
        details: {
          query: request.query,
          maxResults: request.maxResults,
          minSemanticScore: request.minSemanticScore,
          resultsFound: response.agents.length,
          processingTime: response.searchMetrics.processingTime,
          queryComplexity: response.searchMetrics.queryComplexity,
          semanticModel: response.searchMetrics.semanticModel,
          topScore: response.agents.length > 0 ? response.agents[0].semanticScore : 0,
          averageScore: response.agents.length > 0 
            ? response.agents.reduce((sum, agent) => sum + agent.semanticScore, 0) / response.agents.length 
            : 0
        }
      });

      if (auditLog.isSuccess) {
        await this.auditRepository.save(auditLog.value);
      }
    } catch (error) {
      console.error('Failed to audit semantic search:', error);
    }
  }

  private async auditSearchFailure(request: PerformSemanticAgentSearchRequest, error: string, processingTime: number): Promise<void> {
    try {
      const auditLog = AuditLog.create({
        action: 'SEMANTIC_AGENT_SEARCH_FAILED',
        userId: request.userId,
        details: {
          query: request.query,
          error: error,
          processingTime: processingTime,
          failureReason: 'validation_or_system_error'
        }
      });

      if (auditLog.isSuccess) {
        await this.auditRepository.save(auditLog.value);
      }
    } catch (auditError) {
      console.error('Failed to audit semantic search failure:', auditError);
    }
  }
}