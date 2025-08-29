import { FunctionModel } from '../entities/function-model';
import { NodeDependencyService } from './node-dependency-service';
import { Result } from '../shared/result';
import { ModelSoftDeletedEvent, ModelUndeletedEvent } from '../events/model-events';
import { ModelStatus } from '../enums';

export interface SoftDeletionRequest {
  modelId: string;
  deletedBy: string;
  reason: string;
  metadata?: Record<string, any>;
  preserveAuditTrail?: boolean;
  checkDependencies?: boolean;
  enforceReferentialIntegrity?: boolean;
  allowCascading?: boolean;
  cascadingDeletePolicy?: string;
}

export interface SoftDeletionResult {
  canDelete: boolean;
  blockingReasons?: string[];
  dependencyAnalysis?: {
    dependentModels: string[];
    cascadingEffects: any;
  };
  cascadingDeletions?: string[];
  auditData: {
    preservedModelState: Record<string, any>;
    deletionMetadata: Record<string, any>;
    cascadingEffects?: any;
  };
  domainEvents: Array<ModelSoftDeletedEvent>;
}

export interface RestorationRequest {
  modelId: string;
  restoredBy: string;
  reason: string;
  validateDependencies?: boolean;
  restoreMetadata?: Record<string, any>;
}

export interface RestorationResult {
  canRestore: boolean;
  blockingReasons?: string[];
  repairPlan?: {
    requiredActions: any[];
    brokenReferences: string[];
    missingDependencies: string[];
    estimatedRepairComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  restorationPlan?: {
    targetStatus: ModelStatus;
    dependencyRestoration: any;
  };
  auditData: {
    restorationDetails: Record<string, any>;
    originalDeletionData: Record<string, any>;
  };
  domainEvents: Array<ModelUndeletedEvent>;
}

export interface ModelAccessibility {
  accessLevel: string;
  allowedOperations: string[];
}

export interface ModelStateValidation {
  canDelete: boolean;
  reason?: string;
}

export interface RestoreEligibility {
  canRestore: boolean;
  eligibilityChecks: {
    withinTimeLimit: boolean;
    hasAdminPermission: boolean;
    dependenciesIntact: boolean;
  };
  restoreMetadata: {
    originalStatus: ModelStatus;
    deletedAt: Date;
    daysSinceDeletion: number;
  };
}

export interface RetentionPolicy {
  retentionPeriodDays: number;
  hardDeleteScheduledAt: Date;
  complianceFramework: string;
  dataClassification: string;
  lifecycle: {
    softDeletedAt: Date;
    eligibleForHardDeleteAt: Date;
    finalDeletionDate: Date;
  };
  reviewMilestones: Array<{
    action: string;
    scheduledAt: Date;
  }>;
}

export class SoftDeletionCoordinationService {
  constructor(private nodeDependencyService: NodeDependencyService) {}

  public async coordinateSoftDeletion(
    model: FunctionModel,
    request: SoftDeletionRequest
  ): Promise<Result<SoftDeletionResult>> {
    try {
      // Analyze dependencies if requested or if referential integrity is enforced or cascading is allowed
      let dependencyAnalysis: any = {};
      let cascadingDeletions: string[] = [];
      
      if (request.checkDependencies || request.enforceReferentialIntegrity || request.allowCascading) {
        const dependentModelsResult = await this.nodeDependencyService.findDependentModels(request.modelId);
        if (dependentModelsResult.isFailure) {
          return Result.fail<SoftDeletionResult>(dependentModelsResult.error);
        }

        const dependentModels = dependentModelsResult.value;
        const cascadingEffectsResult = await this.nodeDependencyService.analyzeCascadingEffects(
          request.modelId,
          dependentModels
        );

        if (cascadingEffectsResult.isFailure) {
          return Result.fail<SoftDeletionResult>(cascadingEffectsResult.error);
        }

        const cascadingEffects = cascadingEffectsResult.value;
        dependencyAnalysis = {
          dependentModels,
          cascadingEffects,
        };

        // Handle cascading deletion if enabled
        if (request.allowCascading && request.cascadingDeletePolicy === 'soft-delete-dependents') {
          cascadingDeletions = cascadingEffects.cascadingDeletions || [];
        }

        // Check for blocking conditions
        if (request.enforceReferentialIntegrity && cascadingEffects.requiresManualIntervention) {
          return Result.ok<SoftDeletionResult>({
            canDelete: false,
            blockingReasons: ['Active critical references exist'],
            dependencyAnalysis,
            auditData: {
              preservedModelState: this.extractModelState(model),
              deletionMetadata: this.createDeletionMetadata(request),
            },
            domainEvents: [],
          });
        }
      }

      // Generate audit data
      const auditData = {
        preservedModelState: this.extractModelState(model),
        deletionMetadata: this.createDeletionMetadata(request),
        ...(Object.keys(dependencyAnalysis).length > 0 && { cascadingEffects: dependencyAnalysis.cascadingEffects }),
      };

      // Generate domain events
      const domainEvents: ModelSoftDeletedEvent[] = [];
      
      // Main deletion event
      domainEvents.push(new ModelSoftDeletedEvent({
        aggregateId: request.modelId,
        deletedBy: request.deletedBy,
        deletedAt: new Date(),
        reason: request.reason,
        metadata: {
          ...request.metadata,
          modelId: request.modelId,
          modelName: model.name.toString(),
          version: model.version.toString(),
        },
      }));

      // Events for cascading deletions
      cascadingDeletions.forEach(dependentId => {
        domainEvents.push(new ModelSoftDeletedEvent({
          aggregateId: dependentId,
          deletedBy: request.deletedBy,
          deletedAt: new Date(),
          reason: 'Cascading deletion from parent model',
          metadata: { ...request.metadata, parentModelId: request.modelId },
        }));
      });

      return Result.ok<SoftDeletionResult>({
        canDelete: true,
        dependencyAnalysis,
        cascadingDeletions,
        auditData,
        domainEvents,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return Result.fail<SoftDeletionResult>(`Failed to coordinate soft deletion: ${errorMessage}`);
    }
  }

  public validateModelAccessibility(
    model: FunctionModel,
    userId: string,
    options?: { isAdmin?: boolean }
  ): Result<ModelAccessibility> {
    if (!model.isDeleted()) {
      return Result.ok<ModelAccessibility>({
        accessLevel: 'normal',
        allowedOperations: ['read', 'write', 'execute'],
      });
    }

    // Model is deleted
    if (options?.isAdmin) {
      return Result.ok<ModelAccessibility>({
        accessLevel: 'admin-read-only',
        allowedOperations: ['view-audit-trail', 'restore'],
      });
    }

    return Result.fail<ModelAccessibility>('Access denied: deleted model can only be accessed by administrators');
  }

  public validateModelState(model: FunctionModel, userId: string): Result<ModelStateValidation> {
    if (model.status === ModelStatus.ARCHIVED) {
      return Result.fail<ModelStateValidation>('Cannot delete archived model');
    }

    return Result.ok<ModelStateValidation>({
      canDelete: true,
    });
  }

  public validateRestoreEligibility(
    model: FunctionModel,
    userId: string,
    conditions: {
      maxDaysDeleted: number;
      requiresAdminApproval: boolean;
      checkDependencyIntegrity: boolean;
    }
  ): Result<RestoreEligibility> {
    const deletedAt = model.deletedAt;
    if (!deletedAt) {
      return Result.fail<RestoreEligibility>('Model is not deleted');
    }

    const daysSinceDeletion = Math.floor((Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24));
    const withinTimeLimit = daysSinceDeletion <= conditions.maxDaysDeleted;
    const hasAdminPermission = this.isAdminUser(userId);

    return Result.ok<RestoreEligibility>({
      canRestore: withinTimeLimit && hasAdminPermission,
      eligibilityChecks: {
        withinTimeLimit,
        hasAdminPermission,
        dependenciesIntact: true, // Would be determined by actual dependency check
      },
      restoreMetadata: {
        originalStatus: ModelStatus.PUBLISHED, // Would get from model
        deletedAt,
        daysSinceDeletion,
      },
    });
  }

  public generateAuditData(model: FunctionModel, deletionContext: any): any {
    return {
      entitySnapshot: {
        modelId: model.modelId,
        name: model.name.toString(),
        version: model.version.toString(),
        status: model.status,
        nodeCount: model.nodes.size,
        actionNodeCount: model.actionNodes.size,
        metadata: model.metadata,
        permissions: model.permissions,
      },
      deletionDetails: {
        reason: deletionContext.reason,
        deletedBy: deletionContext.deletedBy,
        deletedAt: new Date(),
        complianceContext: {
          framework: deletionContext.complianceFramework,
          retentionPeriod: deletionContext.retentionPeriod,
        },
      },
      preservationData: {
        nodeStructure: {},
        relationships: {},
        executionHistory: {},
      },
    };
  }

  public calculateRetentionPolicy(
    model: FunctionModel,
    complianceRequirements: {
      framework: string;
      dataClassification: string;
      retentionPeriodYears: number;
      jurisdiction: string;
    }
  ): RetentionPolicy {
    const retentionPeriodDays = complianceRequirements.retentionPeriodYears * 365;
    const softDeletedAt = model.deletedAt || new Date();
    const eligibleForHardDeleteAt = new Date(softDeletedAt.getTime() + (retentionPeriodDays * 24 * 60 * 60 * 1000));
    const finalDeletionDate = new Date(eligibleForHardDeleteAt);

    // Add 30 days buffer for review
    const reviewDate = new Date(eligibleForHardDeleteAt.getTime() - (30 * 24 * 60 * 60 * 1000));

    return {
      retentionPeriodDays,
      hardDeleteScheduledAt: finalDeletionDate,
      complianceFramework: complianceRequirements.framework,
      dataClassification: complianceRequirements.dataClassification,
      lifecycle: {
        softDeletedAt,
        eligibleForHardDeleteAt,
        finalDeletionDate,
      },
      reviewMilestones: [
        {
          action: 'RETENTION_REVIEW',
          scheduledAt: reviewDate,
        },
      ],
    };
  }

  public async coordinateModelRestoration(
    model: FunctionModel,
    request: RestorationRequest
  ): Promise<Result<RestorationResult>> {
    try {
      // Validate dependencies if requested
      let dependencyValidation: any = { integrityMaintained: true, brokenReferences: [] };
      
      if (request.validateDependencies) {
        const integrityResult = await this.nodeDependencyService.validateDependencyIntegrity(request.modelId);
        if (integrityResult.isFailure) {
          return Result.fail<RestorationResult>(integrityResult.error);
        }
        dependencyValidation = integrityResult.value;
      }

      // Check if restoration is blocked
      if (!dependencyValidation.integrityMaintained) {
        // Use repair actions from dependency service if available, otherwise generate them
        const repairActions = dependencyValidation.repairActions || [
          ...dependencyValidation.brokenReferences.map((ref: string) => ({
            action: 'REPAIR_BROKEN_REFERENCE',
            target: ref,
            complexity: 'LOW',
          })),
          ...(dependencyValidation.missingDependencies || []).map((dep: string) => ({
            action: 'RESTORE_MISSING_DEPENDENCY',
            target: dep,
            complexity: 'MEDIUM',
          })),
        ];

        return Result.ok<RestorationResult>({
          canRestore: false,
          blockingReasons: ['Referential integrity violations detected'],
          repairPlan: {
            requiredActions: repairActions,
            brokenReferences: dependencyValidation.brokenReferences,
            missingDependencies: dependencyValidation.missingDependencies || [],
            estimatedRepairComplexity: 'HIGH',
          },
          auditData: {
            restorationDetails: {
              reason: request.reason,
              restoredBy: request.restoredBy,
              restoredAt: new Date(),
            },
            originalDeletionData: {
              deletedAt: model.deletedAt,
              deletedBy: model.deletedBy,
            },
          },
          domainEvents: [],
        });
      }

      // Successful restoration path
      const domainEvents = [
        new ModelUndeletedEvent({
          aggregateId: request.modelId,
          restoredBy: request.restoredBy,
          restoredAt: new Date(),
          reason: request.reason,
        }),
      ];

      return Result.ok<RestorationResult>({
        canRestore: true,
        restorationPlan: {
          targetStatus: ModelStatus.PUBLISHED, // Original status
          dependencyRestoration: {
            integrityMaintained: true,
            referencesToRestore: [],
          },
        },
        auditData: {
          restorationDetails: {
            reason: request.reason,
            restoredBy: request.restoredBy,
            restoredAt: new Date(),
          },
          originalDeletionData: {
            deletedAt: model.deletedAt,
            deletedBy: model.deletedBy,
          },
        },
        domainEvents,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return Result.fail<RestorationResult>(`Failed to coordinate model restoration: ${errorMessage}`);
    }
  }

  private extractModelState(model: FunctionModel): Record<string, any> {
    return {
      name: model.name.toString(),
      version: model.version.toString(),
      status: model.status,
      metadata: model.metadata,
    };
  }

  private createDeletionMetadata(request: SoftDeletionRequest): Record<string, any> {
    return {
      reason: request.reason,
      timestamp: new Date(),
      deletedBy: request.deletedBy,
    };
  }

  private isAdminUser(userId: string): boolean {
    // Simple check for admin users
    return userId.includes('admin');
  }
}