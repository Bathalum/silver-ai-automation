import { FunctionModel } from '../../domain/entities/function-model';
import { Version } from '../../domain/value-objects/version';
import { ModelStatus } from '../../domain/enums';
import { Result } from '../../domain/shared/result';
import { PublishModelCommand } from '../commands/model-commands';
import { IFunctionModelRepository, IEventBus } from './create-function-model-use-case';

export interface PublishModelResult {
  modelId: string;
  version: string;
  status: ModelStatus;
  publishedAt: Date;
}

export class PublishFunctionModelUseCase {
  constructor(
    private modelRepository: IFunctionModelRepository,
    private eventBus: IEventBus
  ) {}

  async execute(command: PublishModelCommand): Promise<Result<PublishModelResult>> {
    try {
      // Validate command
      const validationResult = this.validateCommand(command);
      if (validationResult.isFailure) {
        return Result.fail<PublishModelResult>(validationResult.error);
      }

      // Retrieve the model
      const modelResult = await this.modelRepository.findById(command.modelId);
      if (modelResult.isFailure) {
        return Result.fail<PublishModelResult>('Function model not found');
      }

      const model = modelResult.value;

      // Check if user has permission to publish
      if (!this.hasPublishPermission(model, command.userId)) {
        return Result.fail<PublishModelResult>('Insufficient permissions to publish this model');
      }

      // Check if model can be published
      if (model.status === ModelStatus.PUBLISHED) {
        return Result.fail<PublishModelResult>('Model is already published');
      }

      if (model.status === ModelStatus.ARCHIVED) {
        return Result.fail<PublishModelResult>('Cannot publish archived model');
      }

      if (model.deletedAt) {
        return Result.fail<PublishModelResult>('Cannot publish deleted model');
      }

      // Validate the version format
      const versionResult = Version.create(command.version);
      if (versionResult.isFailure) {
        return Result.fail<PublishModelResult>(`Invalid version format: ${versionResult.error}`);
      }

      const newVersion = versionResult.value;

      // Validate that the new version is greater than current
      if (newVersion.compare(model.version) <= 0) {
        return Result.fail<PublishModelResult>('New version must be greater than current version');
      }

      // Perform comprehensive validation before publishing
      const workflowValidation = model.validateWorkflow();
      if (workflowValidation.isFailure) {
        return Result.fail<PublishModelResult>(`Workflow validation failed: ${workflowValidation.error}`);
      }

      const validation = workflowValidation.value;
      if (!validation.isValid) {
        const errorMessage = `Cannot publish model with validation errors:\n${validation.errors.join('\n')}`;
        return Result.fail<PublishModelResult>(errorMessage);
      }

      // Check for critical warnings that should block publication
      const criticalWarnings = this.filterCriticalWarnings(validation.warnings);
      if (criticalWarnings.length > 0) {
        const warningMessage = `Cannot publish model with critical warnings:\n${criticalWarnings.join('\n')}`;
        return Result.fail<PublishModelResult>(warningMessage);
      }

      // Update model version and publish
      const publishResult = model.publish();
      if (publishResult.isFailure) {
        return Result.fail<PublishModelResult>(publishResult.error);
      }

      // Update version count
      model.incrementVersionCount();

      // Save the updated model
      const saveResult = await this.modelRepository.save(model);
      if (saveResult.isFailure) {
        return Result.fail<PublishModelResult>(`Failed to save published model: ${saveResult.error}`);
      }

      // Mark as saved
      model.markSaved();

      // Publish domain events
      await Promise.all([
        this.eventBus.publish({
          eventType: 'FunctionModelPublished',
          aggregateId: command.modelId,
          eventData: {
            modelId: command.modelId,
            version: newVersion.toString(),
            publishedBy: command.userId,
            publishNotes: command.publishNotes,
            validationWarnings: validation.warnings
          },
          userId: command.userId,
          timestamp: new Date()
        }),
        this.eventBus.publish({
          eventType: 'FunctionModelVersionCreated',
          aggregateId: command.modelId,
          eventData: {
            modelId: command.modelId,
            version: newVersion.toString(),
            versionType: this.determineVersionType(model.version, newVersion),
            createdBy: command.userId
          },
          userId: command.userId,
          timestamp: new Date()
        })
      ]);

      // Return success result
      return Result.ok<PublishModelResult>({
        modelId: model.modelId,
        version: newVersion.toString(),
        status: model.status,
        publishedAt: model.updatedAt
      });

    } catch (error) {
      return Result.fail<PublishModelResult>(
        `Failed to publish function model: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateCommand(command: PublishModelCommand): Result<void> {
    if (!command.modelId || command.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!command.userId || command.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    if (!command.version || command.version.trim().length === 0) {
      return Result.fail<void>('Version is required');
    }

    if (command.publishNotes && command.publishNotes.length > 2000) {
      return Result.fail<void>('Publish notes cannot exceed 2000 characters');
    }

    return Result.ok<void>(undefined);
  }

  private hasPublishPermission(model: FunctionModel, userId: string): boolean {
    const permissions = model.permissions;
    
    // Owner always has permission
    if (permissions.owner === userId) {
      return true;
    }

    // Check if user is in editors list (editors can publish)
    const editors = permissions.editors as string[] || [];
    if (editors.includes(userId)) {
      return true;
    }

    // Check for explicit publish permissions
    const publishers = permissions.publishers as string[] || [];
    if (publishers.includes(userId)) {
      return true;
    }

    return false;
  }

  private filterCriticalWarnings(warnings: string[]): string[] {
    const criticalPatterns = [
      /no input/i,
      /no output/i,
      /unreachable/i,
      /infinite/i,
      /circular/i
    ];

    return warnings.filter(warning => 
      criticalPatterns.some(pattern => pattern.test(warning))
    );
  }

  private determineVersionType(currentVersion: Version, newVersion: Version): 'major' | 'minor' | 'patch' {
    if (newVersion.major > currentVersion.major) {
      return 'major';
    } else if (newVersion.minor > currentVersion.minor) {
      return 'minor';
    } else {
      return 'patch';
    }
  }
}