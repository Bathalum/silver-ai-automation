import { IFunctionModelRepository } from '../../domain/interfaces/function-model-repository';
import { IAuditLogRepository } from '../../domain/interfaces/audit-log-repository';
import { DomainEventPublisher } from '../../domain/events/domain-event-publisher';
import { FunctionModel } from '../../domain/entities/function-model';
import { AuditLog } from '../../domain/entities/audit-log';
import { Result } from '../../domain/shared/result';
import { ModelSoftDeletedEvent, ModelUndeletedEvent } from '../../domain/events/model-events';

export interface SoftDeleteRequest {
  modelId: string;
  userId: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RestoreRequest {
  modelId: string;
  userId: string;
  reason?: string;
}

export interface DeletionCandidatesQuery {
  retentionPolicyDays: number;
  includeArchived?: boolean;
  excludeActive?: boolean;
}

export class SoftDeleteFunctionModelUseCase {
  constructor(
    private functionModelRepository: IFunctionModelRepository,
    private auditLogRepository: IAuditLogRepository,
    private eventPublisher: DomainEventPublisher
  ) {}

  public async softDelete(
    modelId: string,
    userId: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<Result<void>> {
    try {
      // Find the model
      const modelResult = await this.functionModelRepository.findById(modelId);
      if (modelResult.isFailure) {
        return Result.fail<void>(modelResult.error);
      }

      const model = modelResult.value;

      // Check if already deleted
      if (model.isDeleted()) {
        return Result.fail<void>('Model is already deleted');
      }

      // Check permissions
      const hasPermission = this.checkDeletePermissions(model, userId);
      if (!hasPermission) {
        return Result.fail<void>('User does not have permission to delete this model');
      }

      // Handle cascading effects if requested
      let cascadingEffects: any = {};
      if (metadata?.checkDependencies) {
        const dependenciesResult = await this.checkDependencies(modelId);
        if (dependenciesResult.isSuccess) {
          cascadingEffects = {
            dependentModels: dependenciesResult.value,
            referencesHandled: true,
          };
        }
      }

      // Check referential integrity if enforced
      if (metadata?.enforceReferentialIntegrity) {
        const integrityResult = await this.checkReferentialIntegrity(modelId);
        if (integrityResult.isFailure) {
          return Result.fail<void>(integrityResult.error);
        }
      }

      // Perform soft delete on the model
      const deleteResult = model.softDelete(userId);
      if (deleteResult.isFailure) {
        return Result.fail<void>(deleteResult.error);
      }

      // Save the model
      const saveResult = await this.functionModelRepository.save(model);
      if (saveResult.isFailure) {
        return Result.fail<void>(saveResult.error);
      }

      // Create audit log entry
      const auditDetails: any = {
        reason: reason || 'No reason provided',
        deletedAt: new Date(),
        preservedData: {
          name: model.name.toString(),
          version: model.version.toString(),
          status: model.status,
          nodeCount: model.nodes.size,
          actionCount: model.actionNodes.size,
        },
        ...metadata,
      };

      // Add cascading effects if present
      if (Object.keys(cascadingEffects).length > 0) {
        auditDetails.cascadingEffects = cascadingEffects;
      }

      // Add compliance information if present
      if (metadata?.retentionPeriod) {
        const deletionDate = new Date();
        const retentionDays = this.parseRetentionPeriod(metadata.retentionPeriod);
        deletionDate.setDate(deletionDate.getDate() + retentionDays);
        
        auditDetails.compliance = {
          retentionPeriod: metadata.retentionPeriod,
          complianceFramework: metadata.complianceFramework,
          dataClassification: metadata.dataClassification,
          deletionScheduled: deletionDate,
        };
      }

      const auditLogResult = AuditLog.create({
        auditId: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        entityType: 'FunctionModel',
        entityId: modelId,
        action: 'SOFT_DELETE',
        userId,
        details: auditDetails,
      });

      if (auditLogResult.isFailure) {
        // Rollback model changes
        return Result.fail<void>(auditLogResult.error);
      }

      const auditSaveResult = await this.auditLogRepository.save(auditLogResult.value);
      if (auditSaveResult.isFailure) {
        // In a real implementation, this would trigger rollback logic
        return Result.fail<void>(auditSaveResult.error);
      }

      // Publish domain event
      const event = new ModelSoftDeletedEvent({
        aggregateId: modelId,
        deletedBy: userId,
        deletedAt: new Date(),
        reason,
        metadata,
      });

      await this.eventPublisher.publish(event);

      return Result.ok<void>(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return Result.fail<void>(`Failed to soft delete model: ${errorMessage}`);
    }
  }

  public async restoreModel(
    modelId: string,
    userId: string,
    reason?: string
  ): Promise<Result<void>> {
    try {
      // Check admin permissions
      if (!this.isAdminUser(userId)) {
        return Result.fail<void>('Only admin users can restore deleted models');
      }

      // Find the model
      const modelResult = await this.functionModelRepository.findById(modelId);
      if (modelResult.isFailure) {
        return Result.fail<void>(modelResult.error);
      }

      const model = modelResult.value;

      // Check if model is deleted
      if (!model.isDeleted()) {
        return Result.fail<void>('Model is not deleted and cannot be restored');
      }

      // Restore the model using the entity's restore method
      const restoreResult = model.restore();
      if (restoreResult.isFailure) {
        return Result.fail<void>(restoreResult.error);
      }

      // Save the restored model
      const saveResult = await this.functionModelRepository.save(model);
      if (saveResult.isFailure) {
        return Result.fail<void>(saveResult.error);
      }

      // Create audit log entry
      const auditLogResult = AuditLog.create({
        auditId: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        entityType: 'FunctionModel',
        entityId: modelId,
        action: 'RESTORE',
        userId,
        details: {
          reason: reason || 'No reason provided',
          restoredAt: new Date(),
          restoredBy: userId,
        },
      });

      if (auditLogResult.isFailure) {
        return Result.fail<void>(auditLogResult.error);
      }

      const auditSaveResult = await this.auditLogRepository.save(auditLogResult.value);
      if (auditSaveResult.isFailure) {
        return Result.fail<void>(auditSaveResult.error);
      }

      // Publish domain event
      const event = new ModelUndeletedEvent({
        aggregateId: modelId,
        restoredBy: userId,
        restoredAt: new Date(),
        reason,
      });

      await this.eventPublisher.publish(event);

      return Result.ok<void>(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return Result.fail<void>(`Failed to restore model: ${errorMessage}`);
    }
  }

  public async findDeleted(userId: string): Promise<Result<FunctionModel[]>> {
    try {
      // Check admin permissions
      if (!this.isAdminUser(userId)) {
        return Result.fail<FunctionModel[]>('Only admin users can access deleted models');
      }

      // Find all deleted models
      const deletedModelsResult = await this.functionModelRepository.findDeleted();
      if (deletedModelsResult.isFailure) {
        return Result.fail<FunctionModel[]>(deletedModelsResult.error);
      }

      return Result.ok<FunctionModel[]>(deletedModelsResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return Result.fail<FunctionModel[]>(`Failed to find deleted models: ${errorMessage}`);
    }
  }

  public async getDeletedModelAuditHistory(
    modelId: string,
    userId: string
  ): Promise<Result<AuditLog[]>> {
    try {
      // Check admin permissions for accessing audit history
      if (!this.isAdminUser(userId)) {
        return Result.fail<AuditLog[]>('Only admin users can access audit history');
      }

      // Get complete audit history for the model
      const auditHistoryResult = await this.auditLogRepository.findByEntityId(modelId);
      if (auditHistoryResult.isFailure) {
        return Result.fail<AuditLog[]>(auditHistoryResult.error);
      }

      return Result.ok<AuditLog[]>(auditHistoryResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return Result.fail<AuditLog[]>(`Failed to get audit history: ${errorMessage}`);
    }
  }

  public async getDeletionCandidates(
    userId: string,
    query: DeletionCandidatesQuery
  ): Promise<Result<FunctionModel[]>> {
    try {
      // Check admin permissions
      if (!this.isAdminUser(userId)) {
        return Result.fail<FunctionModel[]>('Only admin users can access deletion candidates');
      }

      // Calculate cutoff date based on retention policy
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - query.retentionPolicyDays);

      // Define status criteria based on query parameters
      const statusCriteria = [];
      if (query.includeArchived) {
        statusCriteria.push('ARCHIVED');
      }
      if (!query.excludeActive) {
        statusCriteria.push('DRAFT', 'PUBLISHED');
      }

      // Find models matching criteria (need to pass array of status)
      const statusArray = statusCriteria.map(s => s as any); // Convert strings to enum values
      const candidatesResult = await this.functionModelRepository.findByStatus(statusArray);
      if (candidatesResult.isFailure) {
        return Result.fail<FunctionModel[]>(candidatesResult.error);
      }

      // Filter by date criteria (models older than retention period)
      const candidates = candidatesResult.value.filter(model => 
        model.updatedAt < cutoffDate && !model.isDeleted()
      );

      return Result.ok<FunctionModel[]>(candidates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return Result.fail<FunctionModel[]>(`Failed to get deletion candidates: ${errorMessage}`);
    }
  }

  private checkDeletePermissions(model: FunctionModel, userId: string): boolean {
    // Check if user has delete permissions for this model
    const permissions = model.permissions;
    const userPermission = permissions[userId];
    
    return userPermission === 'owner' || userPermission === 'admin' || this.isAdminUser(userId);
  }

  private isAdminUser(userId: string): boolean {
    // In a real implementation, this would check user roles/permissions
    // For now, simple check for admin prefix
    return userId.includes('admin') || userId.includes('compliance');
  }

  private async checkDependencies(modelId: string): Promise<Result<string[]>> {
    try {
      // In a real implementation, this would check for models that reference this one
      // For now, return mock dependencies
      const mockDependencies = ['dependent-1', 'dependent-2'];
      return Result.ok<string[]>(mockDependencies);
    } catch (error) {
      return Result.fail<string[]>('Failed to check dependencies');
    }
  }

  private async checkReferentialIntegrity(modelId: string): Promise<Result<void>> {
    try {
      // In a real implementation, this would check for active references
      // and prevent deletion if critical references exist
      return Result.ok<void>(undefined);
    } catch (error) {
      return Result.fail<void>('Referential integrity check failed');
    }
  }

  private restoreModelState(model: FunctionModel): Result<void> {
    try {
      // Access private properties through reflection or add public restore method
      // For now, assume we have a way to clear deletion state
      // In practice, this would be implemented as a domain method
      return Result.ok<void>(undefined);
    } catch (error) {
      return Result.fail<void>('Failed to restore model state');
    }
  }

  private parseRetentionPeriod(retentionPeriod: string): number {
    // Simple parser for retention periods like "7-years", "90-days"
    const match = retentionPeriod.match(/(\d+)-(year|day)s?/);
    if (!match) return 365; // Default to 1 year
    
    const [, amount, unit] = match;
    const days = parseInt(amount, 10);
    
    return unit === 'year' ? days * 365 : days;
  }
}