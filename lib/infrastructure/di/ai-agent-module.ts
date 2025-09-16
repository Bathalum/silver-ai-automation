import { SupabaseClient } from '@supabase/supabase-js';
import { Container, ServiceModule, ServiceTokens, ServiceRegistration } from './container';

/**
 * AI Agent specific service tokens
 */
export const AIAgentServiceTokens = {
  AI_AGENT_REPOSITORY: ServiceTokens.AI_AGENT_REPOSITORY,
  AI_AGENT_MANAGEMENT_SERVICE: ServiceTokens.AI_AGENT_MANAGEMENT_SERVICE,
} as const;

// Import real implementations
import { SupabaseAIAgentRepository } from '../repositories/supabase-ai-agent-repository';
import { SupabaseAuditLogRepository } from '../repositories/supabase-audit-log-repository';
import { SupabaseEventBus } from '../events/supabase-event-bus';

// Import use cases
import { RegisterAIAgentUseCase } from '../../use-cases/ai-agent/register-ai-agent-use-case';
import { DiscoverAgentsByCapabilityUseCase } from '../../use-cases/ai-agent/discover-agents-by-capability-use-case';
import { ExecuteAIAgentTaskUseCase } from '../../use-cases/ai-agent/execute-ai-agent-task-use-case';
import { PerformSemanticAgentSearchUseCase } from '../../use-cases/ai-agent/perform-semantic-agent-search-use-case';
import { CoordinateWorkflowAgentExecutionUseCase } from '../../use-cases/ai-agent/coordinate-workflow-agent-execution-use-case';

// Import application service
import { AIAgentManagementService } from '../../application/services/ai-agent-management-service';

/**
 * AI Agent Module - Registers ALL real implementations for AI Agent functionality
 * NO MOCKS - Only production-ready real implementations
 */
export class AIAgentModule implements ServiceModule {
  register(container: Container): void {
    // Register repositories - REAL implementations only
    this.registerRepositories(container);
    
    // Register infrastructure services - REAL implementations only
    this.registerInfrastructure(container);
    
    // Register use cases - REAL dependencies only
    this.registerUseCases(container);
    
    // Register application services - REAL dependencies only
    this.registerApplicationServices(container);
  }

  private registerRepositories(container: Container): void {
    // AI Agent Repository - REAL Supabase implementation
    container.register(ServiceRegistration.singleton(
      ServiceTokens.AI_AGENT_REPOSITORY,
      async (c) => {
        const supabaseClientResult = await c.resolve(ServiceTokens.SUPABASE_CLIENT);
        if (supabaseClientResult.isFailure) {
          throw new Error(`Failed to resolve Supabase client: ${supabaseClientResult.error}`);
        }
        return new SupabaseAIAgentRepository(supabaseClientResult.value);
      }
    ));

    // Audit Log Repository - REAL Supabase implementation (validates the fix!)
    container.register(ServiceRegistration.singleton(
      ServiceTokens.AUDIT_LOG_REPOSITORY,
      async (c) => {
        const supabaseClientResult = await c.resolve(ServiceTokens.SUPABASE_CLIENT);
        if (supabaseClientResult.isFailure) {
          throw new Error(`Failed to resolve Supabase client: ${supabaseClientResult.error}`);
        }
        return new SupabaseAuditLogRepository(supabaseClientResult.value);
      }
    ));
  }

  private registerInfrastructure(container: Container): void {
    // Event Bus - REAL Supabase implementation
    container.register(ServiceRegistration.singleton(
      ServiceTokens.EVENT_BUS,
      async (c) => {
        const supabaseClientResult = await c.resolve(ServiceTokens.SUPABASE_CLIENT);
        if (supabaseClientResult.isFailure) {
          throw new Error(`Failed to resolve Supabase client: ${supabaseClientResult.error}`);
        }
        return new SupabaseEventBus(supabaseClientResult.value);
      }
    ));
  }

  private registerUseCases(container: Container): void {
    // Register AI Agent Use Case - REAL dependencies
    container.register(ServiceRegistration.transient(
      ServiceTokens.REGISTER_AI_AGENT_USE_CASE,
      async (c) => {
        const agentRepoResult = await c.resolve(ServiceTokens.AI_AGENT_REPOSITORY);
        const eventBusResult = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (agentRepoResult.isFailure) {
          throw new Error(`Failed to resolve AI agent repository: ${agentRepoResult.error}`);
        }
        if (eventBusResult.isFailure) {
          throw new Error(`Failed to resolve event bus: ${eventBusResult.error}`);
        }
        
        return new RegisterAIAgentUseCase(agentRepoResult.value, eventBusResult.value);
      }
    ));

    // Discover Agents Use Case - REAL dependencies
    container.register(ServiceRegistration.transient(
      ServiceTokens.DISCOVER_AGENTS_BY_CAPABILITY_USE_CASE,
      async (c) => {
        const agentRepoResult = await c.resolve(ServiceTokens.AI_AGENT_REPOSITORY);
        
        if (agentRepoResult.isFailure) {
          throw new Error(`Failed to resolve AI agent repository: ${agentRepoResult.error}`);
        }
        
        return new DiscoverAgentsByCapabilityUseCase(agentRepoResult.value);
      }
    ));

    // Execute AI Agent Task Use Case - REAL dependencies
    container.register(ServiceRegistration.transient(
      ServiceTokens.EXECUTE_AI_AGENT_TASK_USE_CASE,
      async (c) => {
        const agentRepoResult = await c.resolve(ServiceTokens.AI_AGENT_REPOSITORY);
        const eventBusResult = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (agentRepoResult.isFailure) {
          throw new Error(`Failed to resolve AI agent repository: ${agentRepoResult.error}`);
        }
        if (eventBusResult.isFailure) {
          throw new Error(`Failed to resolve event bus: ${eventBusResult.error}`);
        }
        
        return new ExecuteAIAgentTaskUseCase(agentRepoResult.value, eventBusResult.value);
      }
    ));

    // Semantic Search Use Case - REAL dependencies
    container.register(ServiceRegistration.transient(
      ServiceTokens.PERFORM_SEMANTIC_AGENT_SEARCH_USE_CASE,
      async (c) => {
        const agentRepoResult = await c.resolve(ServiceTokens.AI_AGENT_REPOSITORY);
        
        if (agentRepoResult.isFailure) {
          throw new Error(`Failed to resolve AI agent repository: ${agentRepoResult.error}`);
        }
        
        return new PerformSemanticAgentSearchUseCase(agentRepoResult.value);
      }
    ));

    // Workflow Coordination Use Case - REAL dependencies
    container.register(ServiceRegistration.transient(
      ServiceTokens.COORDINATE_WORKFLOW_AGENT_EXECUTION_USE_CASE,
      async (c) => {
        const agentRepoResult = await c.resolve(ServiceTokens.AI_AGENT_REPOSITORY);
        const eventBusResult = await c.resolve(ServiceTokens.EVENT_BUS);
        
        if (agentRepoResult.isFailure) {
          throw new Error(`Failed to resolve AI agent repository: ${agentRepoResult.error}`);
        }
        if (eventBusResult.isFailure) {
          throw new Error(`Failed to resolve event bus: ${eventBusResult.error}`);
        }
        
        return new CoordinateWorkflowAgentExecutionUseCase(agentRepoResult.value, eventBusResult.value);
      }
    ));
  }

  private registerApplicationServices(container: Container): void {
    // AI Agent Management Service - REAL dependencies only
    container.register(ServiceRegistration.transient(
      ServiceTokens.AI_AGENT_MANAGEMENT_SERVICE,
      async (c) => {
        const registerUseCaseResult = await c.resolve(ServiceTokens.REGISTER_AI_AGENT_USE_CASE);
        const discoverUseCaseResult = await c.resolve(ServiceTokens.DISCOVER_AGENTS_BY_CAPABILITY_USE_CASE);
        const executeUseCaseResult = await c.resolve(ServiceTokens.EXECUTE_AI_AGENT_TASK_USE_CASE);
        const semanticSearchUseCaseResult = await c.resolve(ServiceTokens.PERFORM_SEMANTIC_AGENT_SEARCH_USE_CASE);
        const workflowCoordinationUseCaseResult = await c.resolve(ServiceTokens.COORDINATE_WORKFLOW_AGENT_EXECUTION_USE_CASE);
        const agentRepoResult = await c.resolve(ServiceTokens.AI_AGENT_REPOSITORY);
        const auditRepoResult = await c.resolve(ServiceTokens.AUDIT_LOG_REPOSITORY);
        const eventBusResult = await c.resolve(ServiceTokens.EVENT_BUS);

        // Validate all dependencies resolved successfully
        if (registerUseCaseResult.isFailure) throw new Error(`Failed to resolve register use case: ${registerUseCaseResult.error}`);
        if (discoverUseCaseResult.isFailure) throw new Error(`Failed to resolve discover use case: ${discoverUseCaseResult.error}`);
        if (executeUseCaseResult.isFailure) throw new Error(`Failed to resolve execute use case: ${executeUseCaseResult.error}`);
        if (semanticSearchUseCaseResult.isFailure) throw new Error(`Failed to resolve semantic search use case: ${semanticSearchUseCaseResult.error}`);
        if (workflowCoordinationUseCaseResult.isFailure) throw new Error(`Failed to resolve workflow coordination use case: ${workflowCoordinationUseCaseResult.error}`);
        if (agentRepoResult.isFailure) throw new Error(`Failed to resolve agent repository: ${agentRepoResult.error}`);
        if (auditRepoResult.isFailure) throw new Error(`Failed to resolve audit repository: ${auditRepoResult.error}`);
        if (eventBusResult.isFailure) throw new Error(`Failed to resolve event bus: ${eventBusResult.error}`);

        return new AIAgentManagementService({
          registerUseCase: registerUseCaseResult.value,
          discoverUseCase: discoverUseCaseResult.value,
          executeUseCase: executeUseCaseResult.value,
          semanticSearchUseCase: semanticSearchUseCaseResult.value,
          workflowCoordinationUseCase: workflowCoordinationUseCaseResult.value,
          agentRepository: agentRepoResult.value,
          auditRepository: auditRepoResult.value,
          eventBus: eventBusResult.value
        });
      }
    ));
  }
}

/**
 * Helper function to create a configured container for AI Agent functionality
 * Uses ONLY real implementations - NO MOCKS
 */
export async function createAIAgentContainer(supabaseClient: SupabaseClient): Promise<Container> {
  const container = new Container();
  
  // Register Supabase client
  container.registerInstance(ServiceTokens.SUPABASE_CLIENT, supabaseClient);
  
  // Register the AI Agent module
  const aiAgentModule = new AIAgentModule();
  aiAgentModule.register(container);
  
  return container;
}