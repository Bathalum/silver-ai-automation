import { FunctionModel } from '../../domain/entities/function-model';
import { ModelStatus } from '../../domain/enums';
import { Result } from '../../domain/shared/result';
import { ArchiveModelCommand } from '../commands/model-commands';
import { ModelArchived } from '../../domain/events/model-events';
import { NodeDependencyService } from '../../domain/services/node-dependency-service';
import { CrossFeatureLinkingService } from '../../domain/services/cross-feature-linking-service';
import { IFunctionModelRepository, IEventBus } from './create-function-model-use-case';

export interface ArchiveValidationResult {
  canArchive: boolean;
  blockingDependencies: string[];
  warnings: string[];
  riskAssessment: 'low' | 'medium' | 'high';
}

export interface ArchiveModelResult {
  modelId: string;
  previousStatus: ModelStatus;
  archivedAt: Date;
  archivedBy: string;
  dependencyImpact: {
    internalNodesAffected: number;
    externalLinksAffected: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export class ArchiveFunctionModelUseCase {
  constructor(
    private modelRepository: IFunctionModelRepository,
    private eventBus: IEventBus,
    private nodeDependencyService: NodeDependencyService,
    private crossFeatureLinkingService: CrossFeatureLinkingService
  ) {}

  async execute(command: ArchiveModelCommand): Promise<Result<ArchiveModelResult>> {
    try {
      // Validate command
      const validationResult = this.validateCommand(command);
      if (validationResult.isFailure) {
        return Result.fail<ArchiveModelResult>(validationResult.error);
      }

      // Retrieve the model
      const modelResult = await this.modelRepository.findById(command.modelId);
      if (modelResult.isFailure) {
        return Result.fail<ArchiveModelResult>('Function model not found');
      }

      const model = modelResult.value;

      // Check if user has permission to archive
      if (!this.hasArchivePermission(model, command.userId)) {
        return Result.fail<ArchiveModelResult>('Insufficient permissions to archive this model');
      }

      // Check if model is already archived
      if (model.status === ModelStatus.ARCHIVED) {
        return Result.fail<ArchiveModelResult>('Model is already archived');
      }

      // Perform comprehensive pre-archive validation
      const preArchiveValidation = await this.validatePreArchiveConditions(model);
      if (preArchiveValidation.isFailure) {
        return Result.fail<ArchiveModelResult>(preArchiveValidation.error);
      }

      const validation = preArchiveValidation.value;
      
      // Check for blocking dependencies
      if (!validation.canArchive) {
        const blockingMessage = `Cannot archive model due to blocking dependencies:\n${validation.blockingDependencies.join('\n')}`;
        return Result.fail<ArchiveModelResult>(blockingMessage);
      }

      // Warn about high-risk archival if configured to block
      if (command.enforceRiskAssessment && validation.riskAssessment === 'high') {
        const riskMessage = `High-risk archival blocked by policy. Warnings:\n${validation.warnings.join('\n')}`;
        return Result.fail<ArchiveModelResult>(riskMessage);
      }

      // Store previous status for audit trail
      const previousStatus = model.status;

      // Archive the model
      const archiveResult = model.archive();
      if (archiveResult.isFailure) {
        return Result.fail<ArchiveModelResult>(archiveResult.error);
      }

      // Calculate dependency impact for audit
      const dependencyImpact = await this.calculateDependencyImpact(model);

      // Handle cross-feature link cleanup if requested
      if (command.cleanupCrossFeatureLinks) {
        await this.cleanupCrossFeatureLinks(model.modelId, command.userId);
      }

      // Save the archived model
      const saveResult = await this.modelRepository.save(model);
      if (saveResult.isFailure) {
        return Result.fail<ArchiveModelResult>(`Failed to save archived model: ${saveResult.error}`);
      }

      // Publish archive domain event
      try {
        const archiveEvent = new ModelArchived({
          modelId: model.modelId,
          modelName: model.name.value,
          version: model.version.toString(),
          archivedBy: command.userId,
          archivedAt: model.updatedAt,
          previousStatus,
          currentStatus: ModelStatus.ARCHIVED,
          reason: command.reason
        });

        await this.eventBus.publish({
          eventType: 'ModelArchived',
          aggregateId: model.modelId,
          eventData: archiveEvent.toPrimitives(),
          userId: command.userId,
          timestamp: new Date()
        });
      } catch (eventError) {
        // Log event publishing failure but don't fail the operation
        console.warn('Failed to publish ModelArchived event:', eventError);
      }

      // Return success result with comprehensive audit information
      return Result.ok<ArchiveModelResult>({
        modelId: model.modelId,
        previousStatus,
        archivedAt: model.updatedAt,
        archivedBy: command.userId,
        dependencyImpact
      });

    } catch (error) {
      return Result.fail<ArchiveModelResult>(
        `Failed to archive function model: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateCommand(command: ArchiveModelCommand): Result<void> {
    if (!command.modelId || command.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!command.userId || command.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    if (command.reason && command.reason.length > 2000) {
      return Result.fail<void>('Archive reason cannot exceed 2000 characters');
    }

    return Result.ok<void>(undefined);
  }

  private hasArchivePermission(model: FunctionModel, userId: string): boolean {
    const permissions = model.permissions;
    
    // Owner always has permission
    if (permissions.owner === userId) {
      return true;
    }

    // Check if user is in editors list (editors can archive)
    const editors = permissions.editors as string[] || [];
    if (editors.includes(userId)) {
      return true;
    }

    // Check for explicit archive permissions
    const archivePermissions = permissions.archivers as string[] || [];
    if (archivePermissions.includes(userId)) {
      return true;
    }

    // System administrators can archive
    const admins = permissions.administrators as string[] || [];
    if (admins.includes(userId)) {
      return true;
    }

    return false;
  }

  private async validatePreArchiveConditions(model: FunctionModel): Promise<Result<ArchiveValidationResult>> {
    try {
      const blockingDependencies: string[] = [];
      const warnings: string[] = [];
      let riskLevel: 'low' | 'medium' | 'high' = 'low';

      // 1. Validate internal node dependencies
      const nodes = Array.from(model.nodes.values());
      if (nodes.length > 0) {
        const dependencyValidation = this.nodeDependencyService.validateAcyclicity(nodes);
        if (dependencyValidation.isFailure) {
          blockingDependencies.push(`Internal dependency validation failed: ${dependencyValidation.error}`);
        } else if (!dependencyValidation.value.isValid) {
          blockingDependencies.push(...dependencyValidation.value.errors.map(e => `Internal dependency error: ${e}`));
        }
      }

      // 2. Check for active executions (this would require an execution service)
      // For now, we'll simulate this check
      if (model.status === ModelStatus.PUBLISHED) {
        warnings.push('Archiving published model may impact active users');
        riskLevel = 'medium';
      }

      // 3. Validate cross-feature dependencies
      const crossFeatureLinks = this.crossFeatureLinkingService.getFeatureLinks(model.metadata.featureType || 'function-model' as any);
      if (crossFeatureLinks.length > 0) {
        const criticalLinks = crossFeatureLinks.filter(link => 
          link.linkStrength > 0.7 || 
          link.linkType === 'implements' || 
          link.linkType === 'triggers'
        );

        if (criticalLinks.length > 0) {
          warnings.push(`${criticalLinks.length} high-strength cross-feature links will be affected`);
          riskLevel = criticalLinks.length > 3 ? 'high' : 'medium';
        }

        if (crossFeatureLinks.length > 5) {
          warnings.push(`Model has ${crossFeatureLinks.length} cross-feature connections`);
          riskLevel = 'medium';
        }
      }

      // 4. Check for complex node structures
      if (nodes.length > 20) {
        warnings.push(`Model has ${nodes.length} nodes - archival will preserve large data structure`);
      }

      const actionNodes = Array.from(model.actionNodes.values());
      if (actionNodes.length > 50) {
        warnings.push(`Model has ${actionNodes.length} action nodes - significant complexity being archived`);
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }

      // 5. Check model age and usage patterns (simulated)
      const modelAge = Date.now() - model.createdAt.getTime();
      const daysOld = Math.floor(modelAge / (1000 * 60 * 60 * 24));
      
      if (daysOld < 30 && model.status === ModelStatus.PUBLISHED) {
        warnings.push('Archiving recently published model (less than 30 days old)');
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }

      return Result.ok<ArchiveValidationResult>({
        canArchive: blockingDependencies.length === 0,
        blockingDependencies,
        warnings,
        riskAssessment: riskLevel
      });

    } catch (error) {
      return Result.fail<ArchiveValidationResult>(
        `Pre-archive validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async calculateDependencyImpact(model: FunctionModel): Promise<{
    internalNodesAffected: number;
    externalLinksAffected: number;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const internalNodesAffected = model.nodes.size + model.actionNodes.size;
    const crossFeatureLinks = this.crossFeatureLinkingService.getFeatureLinks(model.metadata.featureType || 'function-model' as any);
    const externalLinksAffected = crossFeatureLinks.length;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (internalNodesAffected > 20 || externalLinksAffected > 5) {
      riskLevel = 'medium';
    }
    if (internalNodesAffected > 50 || externalLinksAffected > 10) {
      riskLevel = 'high';
    }

    return {
      internalNodesAffected,
      externalLinksAffected,
      riskLevel
    };
  }

  private async cleanupCrossFeatureLinks(modelId: string, userId: string): Promise<void> {
    try {
      // Get all cross-feature links for this model
      const crossFeatureLinks = this.crossFeatureLinkingService.getFeatureLinks('function-model' as any);
      
      // Filter links that involve this model
      const modelLinks = crossFeatureLinks.filter(link => 
        ('sourceId' in link && link.sourceId === modelId) ||
        ('sourceEntityId' in link && link.sourceEntityId === modelId)
      );

      // Remove links (in a real implementation, this might be more sophisticated)
      for (const link of modelLinks) {
        try {
          await this.crossFeatureLinkingService.removeLink(link.linkId);
        } catch (linkError) {
          console.warn(`Failed to remove cross-feature link ${link.linkId.value}:`, linkError);
        }
      }
    } catch (error) {
      console.warn('Cross-feature link cleanup failed:', error);
      // Don't fail the archive operation for cleanup failures
    }
  }
}