import { Result } from '../../domain/shared/result';
import { AuditLog } from '../../domain/entities/audit-log';
import { IAuditLogRepository } from '../../domain/interfaces/audit-log-repository';
import { DomainEvent } from './domain-event';

/**
 * Event handler that automatically converts domain events to audit logs
 * This provides the audit trail mechanism that the E2E tests expect
 */
export class AuditLogEventHandler {
  constructor(
    private auditRepository: IAuditLogRepository
  ) {}

  /**
   * Subscribe to all workflow-related events and create audit logs
   */
  subscribeToEvents(eventBus: any): void {
    // Workflow execution events
    eventBus.subscribe('WorkflowExecutionStarted', this.handleWorkflowExecutionStarted.bind(this));
    eventBus.subscribe('WorkflowExecutionCompleted', this.handleWorkflowExecutionCompleted.bind(this));
    eventBus.subscribe('WorkflowExecutionFailed', this.handleWorkflowExecutionFailed.bind(this));
    
    // Node execution events
    eventBus.subscribe('NodeExecutionStarted', this.handleNodeExecutionStarted.bind(this));
    eventBus.subscribe('NodeExecutionCompleted', this.handleNodeExecutionCompleted.bind(this));
    eventBus.subscribe('NodeExecutionFailed', this.handleNodeExecutionFailed.bind(this));
    
    // Action execution events
    eventBus.subscribe('ActionExecutionStarted', this.handleActionExecutionStarted.bind(this));
    eventBus.subscribe('ActionExecutionCompleted', this.handleActionExecutionCompleted.bind(this));
    eventBus.subscribe('ActionExecutionFailed', this.handleActionExecutionFailed.bind(this));
    
    // Function model events
    eventBus.subscribe('FunctionModelCreated', this.handleFunctionModelCreated.bind(this));
    eventBus.subscribe('FunctionModelPublished', this.handleFunctionModelPublished.bind(this));
    eventBus.subscribe('FunctionModelExecuted', this.handleFunctionModelExecuted.bind(this));
    eventBus.subscribe('FunctionModelArchived', this.handleFunctionModelArchived.bind(this));
    
    // Container and action node events
    eventBus.subscribe('ContainerNodeAdded', this.handleContainerNodeAdded.bind(this));
    eventBus.subscribe('ActionNodeAdded', this.handleActionNodeAdded.bind(this));
    
    // Model versioning events
    eventBus.subscribe('ModelVersionCreated', this.handleModelVersionCreated.bind(this));
  }

  private async handleWorkflowExecutionStarted(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'function_model',
      entityId: event.aggregateId,
      action: 'workflow_execution_started',
      userId: event.eventData.userId,
      details: {
        executionId: event.eventData.executionId,
        environment: event.eventData.environment,
        parameters: event.eventData.parameters,
        startTime: event.eventData.startTime
      }
    });
  }

  private async handleWorkflowExecutionCompleted(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'function_model',
      entityId: event.aggregateId,
      action: 'workflow_execution_completed',
      userId: event.eventData.userId,
      details: {
        executionId: event.eventData.executionId,
        result: event.eventData.result,
        completedAt: event.eventData.completedAt
      }
    });
  }

  private async handleWorkflowExecutionFailed(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'function_model',
      entityId: event.aggregateId,
      action: 'workflow_execution_failed',
      userId: event.eventData.userId,
      details: {
        executionId: event.eventData.executionId,
        error: event.eventData.error,
        failedAt: event.eventData.failedAt
      }
    });
  }

  private async handleNodeExecutionStarted(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'workflow_node',
      entityId: event.eventData.nodeId,
      action: 'node_started',
      userId: event.eventData.userId,
      details: {
        modelId: event.eventData.modelId,
        executionId: event.eventData.executionId,
        nodeName: event.eventData.nodeName,
        startedAt: event.eventData.startedAt
      }
    });
  }

  private async handleNodeExecutionCompleted(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'workflow_node',
      entityId: event.eventData.nodeId,
      action: 'node_completed',
      userId: event.eventData.userId,
      details: {
        modelId: event.eventData.modelId,
        executionId: event.eventData.executionId,
        nodeName: event.eventData.nodeName,
        success: event.eventData.success,
        executionTime: event.eventData.executionTime,
        output: event.eventData.output,
        completedAt: event.eventData.completedAt
      }
    });
  }

  private async handleNodeExecutionFailed(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'workflow_node',
      entityId: event.eventData.nodeId,
      action: 'node_failed',
      userId: event.eventData.userId,
      details: {
        modelId: event.eventData.modelId,
        executionId: event.eventData.executionId,
        nodeName: event.eventData.nodeName,
        success: event.eventData.success,
        error: event.eventData.error,
        retryCount: event.eventData.retryCount,
        failedAt: event.eventData.failedAt
      }
    });
  }

  private async handleActionExecutionStarted(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'workflow_action',
      entityId: event.eventData.actionId,
      action: 'action_started',
      userId: event.eventData.userId,
      details: {
        modelId: event.eventData.modelId,
        executionId: event.eventData.executionId,
        actionName: event.eventData.actionName,
        actionType: event.eventData.actionType,
        startedAt: event.eventData.startedAt
      }
    });
  }

  private async handleActionExecutionCompleted(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'workflow_action',
      entityId: event.eventData.actionId,
      action: 'action_completed',
      userId: event.eventData.userId,
      details: {
        modelId: event.eventData.modelId,
        executionId: event.eventData.executionId,
        actionName: event.eventData.actionName,
        actionType: event.eventData.actionType,
        success: event.eventData.success,
        executionTime: event.eventData.executionTime,
        result: event.eventData.result,
        completedAt: event.eventData.completedAt
      }
    });
  }

  private async handleActionExecutionFailed(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'workflow_action',
      entityId: event.eventData.actionId,
      action: 'action_failed',
      userId: event.eventData.userId,
      details: {
        modelId: event.eventData.modelId,
        executionId: event.eventData.executionId,
        actionName: event.eventData.actionName,
        actionType: event.eventData.actionType,
        success: event.eventData.success,
        error: event.eventData.error,
        executionTime: event.eventData.executionTime,
        failedAt: event.eventData.failedAt
      }
    });
  }

  private async handleFunctionModelCreated(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'function_model',
      entityId: event.aggregateId,
      action: 'model_created',
      userId: event.eventData.userId,
      details: {
        modelName: event.eventData.name,
        description: event.eventData.description,
        organizationId: event.eventData.organizationId,
        createdAt: event.timestamp
      }
    });
  }

  private async handleFunctionModelPublished(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'function_model',
      entityId: event.aggregateId,
      action: 'model_published',
      userId: event.eventData.userId,
      details: {
        version: event.eventData.version,
        publishNotes: event.eventData.publishNotes,
        publishedAt: event.eventData.publishedAt
      }
    });
  }

  private async handleFunctionModelExecuted(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'function_model',
      entityId: event.aggregateId,
      action: 'model_executed',
      userId: event.eventData.userId,
      details: {
        executionId: event.eventData.executionId,
        result: event.eventData.result,
        executedAt: event.timestamp
      }
    });
  }

  private async handleFunctionModelArchived(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'function_model',
      entityId: event.aggregateId,
      action: 'model_archived',
      userId: event.eventData.userId,
      details: {
        archiveReason: event.eventData.archiveReason,
        archivedAt: event.eventData.archivedAt
      }
    });
  }

  private async handleContainerNodeAdded(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'container_node',
      entityId: event.eventData.nodeId,
      action: 'container_added',
      userId: event.eventData.userId,
      details: {
        modelId: event.aggregateId,
        nodeType: event.eventData.nodeType,
        nodeName: event.eventData.name,
        description: event.eventData.description,
        position: event.eventData.position
      }
    });
  }

  private async handleActionNodeAdded(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'action_node',
      entityId: event.eventData.actionId,
      action: 'action_added',
      userId: event.eventData.userId,
      details: {
        modelId: event.aggregateId,
        parentNodeId: event.eventData.parentNodeId,
        actionType: event.eventData.actionType,
        actionName: event.eventData.name,
        executionMode: event.eventData.executionMode,
        executionOrder: event.eventData.executionOrder
      }
    });
  }

  private async handleModelVersionCreated(event: DomainEvent): Promise<void> {
    await this.createAuditLog({
      entityType: 'model_version',
      entityId: event.eventData.versionId,
      action: 'version_created',
      userId: event.eventData.userId,
      details: {
        modelId: event.aggregateId,
        newVersion: event.eventData.newVersion,
        versionType: event.eventData.versionType,
        versionNotes: event.eventData.versionNotes,
        createdAt: event.timestamp
      }
    });
  }

  private async createAuditLog(logData: {
    entityType: string;
    entityId: string;
    action: string;
    userId?: string;
    details?: any;
  }): Promise<void> {
    try {
      const auditLogResult = AuditLog.create({
        auditId: this.generateAuditId(),
        entityType: logData.entityType,
        entityId: logData.entityId,
        action: logData.action,
        userId: logData.userId || 'system',
        details: logData.details,
        timestamp: new Date()
      });

      if (auditLogResult.isSuccess) {
        await this.auditRepository.save(auditLogResult.value);
      } else {
        console.error('Failed to create audit log:', auditLogResult.error);
      }
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}