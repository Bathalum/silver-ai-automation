/**
 * Register AI Agent Use Case (UC-017)
 * 
 * Handles the registration of AI agents in the system with capability validation
 * and proper audit logging. This use case ensures agents are properly configured
 * and ready for discovery and execution.
 * 
 * Business Rules:
 * - Agent names must be unique within an entity scope
 * - All required capabilities must be properly configured
 * - Tools must be available and properly configured
 * - Agent instructions must be comprehensive and actionable
 * 
 * Architecture Compliance:
 * - Uses domain entities and value objects
 * - Depends on repository abstractions
 * - Publishes domain events for integration
 */

import { AIAgent, AIAgentCapabilities, AIAgentTools } from '../../domain/entities/ai-agent';
import { AIAgentRepository } from '../../domain/interfaces/ai-agent-repository';
import { IAuditLogRepository } from '../../domain/interfaces/audit-log-repository';
import { IEventBus } from '../../infrastructure/events/supabase-event-bus';
import { NodeId } from '../../domain/value-objects/node-id';
import { FeatureType } from '../../domain/enums';
import { Result } from '../../domain/shared/result';
import { AuditLog } from '../../domain/entities/audit-log';

export interface RegisterAIAgentRequest {
  name: string;
  description?: string;
  featureType: FeatureType;
  entityId: string;
  nodeId?: string;
  instructions: string;
  tools: AIAgentTools;
  capabilities: AIAgentCapabilities;
  userId: string;
}

export interface RegisterAIAgentResponse {
  agentId: string;
  name: string;
  featureType: FeatureType;
  entityId: string;
  status: string;
  capabilities: AIAgentCapabilities;
  registeredAt: Date;
}

export class RegisterAIAgentUseCase {
  constructor(
    private readonly agentRepository: AIAgentRepository,
    private readonly auditRepository: IAuditLogRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(request: RegisterAIAgentRequest): Promise<Result<RegisterAIAgentResponse>> {
    try {
      // Validate business rules
      const validationResult = await this.validateRegistrationRequest(request);
      if (validationResult.isFailure) {
        await this.auditRegistrationFailure(request, validationResult.error);
        return Result.fail(validationResult.error);
      }

      // Check for naming conflicts
      const nameConflictResult = await this.checkNameConflict(request);
      if (nameConflictResult.isFailure) {
        await this.auditRegistrationFailure(request, nameConflictResult.error);
        return Result.fail(nameConflictResult.error);
      }

      // Create AI Agent entity
      const agentId = NodeId.generate();
      const nodeId = request.nodeId ? NodeId.create(request.nodeId).value : undefined;

      const agentResult = AIAgent.create({
        agentId,
        featureType: request.featureType,
        entityId: request.entityId,
        nodeId,
        name: request.name,
        description: request.description,
        instructions: request.instructions,
        tools: request.tools,
        capabilities: request.capabilities,
        isEnabled: true
      });

      if (agentResult.isFailure) {
        await this.auditRegistrationFailure(request, agentResult.error);
        return Result.fail(agentResult.error);
      }

      const agent = agentResult.value;

      // Persist the agent
      const saveResult = await this.agentRepository.save(agent);
      if (saveResult.isFailure) {
        await this.auditRegistrationFailure(request, saveResult.error);
        return Result.fail(`Failed to save agent: ${saveResult.error}`);
      }

      // Publish domain event
      await this.eventBus.publish({
        eventType: 'AIAgentRegistered',
        aggregateId: agentId.value,
        eventData: {
          name: agent.name,
          featureType: agent.featureType,
          entityId: agent.entityId,
          capabilities: agent.capabilities
        },
        occurredAt: new Date()
      });

      // Create response
      const response: RegisterAIAgentResponse = {
        agentId: agentId.value,
        name: agent.name,
        featureType: agent.featureType,
        entityId: agent.entityId,
        status: 'registered',
        capabilities: agent.capabilities,
        registeredAt: agent.createdAt
      };

      // Audit successful registration
      await this.auditSuccessfulRegistration(request, response);

      return Result.ok(response);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during agent registration';
      await this.auditRegistrationFailure(request, errorMessage);
      return Result.fail(`Agent registration failed: ${errorMessage}`);
    }
  }

  private async validateRegistrationRequest(request: RegisterAIAgentRequest): Promise<Result<void>> {
    // Validate name
    if (!request.name || request.name.trim().length === 0) {
      return Result.fail('Agent name is required');
    }

    if (request.name.length > 100) {
      return Result.fail('Agent name cannot exceed 100 characters');
    }

    // Validate instructions
    if (!request.instructions || request.instructions.trim().length === 0) {
      return Result.fail('Agent instructions are required');
    }

    if (request.instructions.length > 10000) {
      return Result.fail('Agent instructions cannot exceed 10000 characters');
    }

    // Validate entity ID
    if (!request.entityId || request.entityId.trim().length === 0) {
      return Result.fail('Entity ID is required');
    }

    // Validate tools
    if (!request.tools.availableTools || request.tools.availableTools.length === 0) {
      return Result.fail('Agent must have at least one available tool');
    }

    // Validate capabilities
    if (request.capabilities.maxConcurrentTasks < 1 || request.capabilities.maxConcurrentTasks > 100) {
      return Result.fail('Max concurrent tasks must be between 1 and 100');
    }

    if (!request.capabilities.supportedDataTypes || request.capabilities.supportedDataTypes.length === 0) {
      return Result.fail('Agent must support at least one data type');
    }

    return Result.ok();
  }

  private async checkNameConflict(request: RegisterAIAgentRequest): Promise<Result<void>> {
    try {
      const existingAgentsResult = await this.agentRepository.findByName(request.name);
      
      if (existingAgentsResult.isFailure) {
        return Result.fail(`Failed to check for name conflicts: ${existingAgentsResult.error}`);
      }

      // Check for conflicts within the same entity
      const conflictingAgents = existingAgentsResult.value.filter(agent => 
        agent.entityId === request.entityId && agent.isEnabled
      );

      if (conflictingAgents.length > 0) {
        return Result.fail(`An active agent with name '${request.name}' already exists for entity '${request.entityId}'`);
      }

      return Result.ok();

    } catch (error) {
      return Result.fail(`Error checking name conflict: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async auditSuccessfulRegistration(request: RegisterAIAgentRequest, response: RegisterAIAgentResponse): Promise<void> {
    try {
      const auditLog = AuditLog.create({
        action: 'AI_AGENT_REGISTERED',
        userId: request.userId,
        entityId: response.agentId,
        details: {
          agentName: response.name,
          featureType: response.featureType,
          entityId: response.entityId,
          capabilityCount: Object.keys(response.capabilities).length,
          toolCount: request.tools.availableTools.length
        }
      });

      if (auditLog.isSuccess) {
        await this.auditRepository.save(auditLog.value);
      }
    } catch (error) {
      // Log audit failure but don't fail the main operation
      console.error('Failed to audit agent registration:', error);
    }
  }

  private async auditRegistrationFailure(request: RegisterAIAgentRequest, error: string): Promise<void> {
    try {
      const auditLog = AuditLog.create({
        action: 'AI_AGENT_REGISTRATION_FAILED',
        userId: request.userId,
        entityId: request.entityId,
        details: {
          agentName: request.name,
          featureType: request.featureType,
          error: error,
          failureReason: 'validation_or_conflict'
        }
      });

      if (auditLog.isSuccess) {
        await this.auditRepository.save(auditLog.value);
      }
    } catch (auditError) {
      // Log audit failure but don't fail the main operation
      console.error('Failed to audit agent registration failure:', auditError);
    }
  }
}