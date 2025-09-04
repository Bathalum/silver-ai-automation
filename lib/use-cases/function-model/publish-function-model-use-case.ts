import { FunctionModel } from '../../domain/entities/function-model';
import { Version } from '../../domain/value-objects/version';
import { ModelStatus } from '../../domain/enums';
import { Result } from '../../domain/shared/result';
import { IFunctionModelRepository } from '../../domain/interfaces/function-model-repository';
import { PublishModelCommand } from '../commands/model-commands';

export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
}

export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  eventData: any;
  userId?: string;
  timestamp: Date;
}

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

      // Auto-generate version if not provided
      let newVersion: Version;
      if (command.version) {
        // Validate the provided version format
        const versionResult = Version.create(command.version);
        if (versionResult.isFailure) {
          const message = command.enforceValidation 
            ? `Version format validation failed: ${versionResult.error}` 
            : `Invalid version format: ${versionResult.error}`;
          return Result.fail<PublishModelResult>(message);
        }

        newVersion = versionResult.value;

        // Validate that the new version is greater than current
        if (newVersion.compare(model.version) <= 0) {
          const message = command.enforceValidation 
            ? 'Version validation failed: New version must be greater than current version'
            : 'New version must be greater than current version';
          return Result.fail<PublishModelResult>(message);
        }
      } else {
        // Auto-generate the next minor version
        newVersion = model.version.incrementMinor();
      }

      // Perform comprehensive validation before publishing
      const workflowValidation = model.validateWorkflow();
      if (workflowValidation.isFailure) {
        const message = command.enforceValidation
          ? `Workflow validation failed: ${workflowValidation.error}`
          : `Workflow validation failed: ${workflowValidation.error}`;
        return Result.fail<PublishModelResult>(message);
      }

      const validation = workflowValidation.value;
      if (!validation.isValid) {
        const prefix = command.enforceValidation
          ? 'Cannot publish model with validation errors'
          : 'Cannot publish model with validation errors';
        const errorMessage = `${prefix}:\n${validation.errors.join('\n')}`;
        return Result.fail<PublishModelResult>(errorMessage);
      }

      // Check for critical warnings that should block publication
      const criticalWarnings = this.filterCriticalWarnings(validation.warnings);
      if (criticalWarnings.length > 0) {
        const prefix = command.enforceValidation
          ? 'Cannot publish model with critical validation warnings'
          : 'Cannot publish model with critical warnings';
        const warningMessage = `${prefix}:\n${criticalWarnings.join('\n')}`;
        return Result.fail<PublishModelResult>(warningMessage);
      }

      // Update model version and publish
      const publishResult = model.publish();
      if (publishResult.isFailure) {
        return Result.fail<PublishModelResult>(publishResult.error);
      }

      // Update version count
      model.incrementVersionCount();

      // Use enhanced repository method for atomic model publishing
      const publishRepoResult = await this.modelRepository.publishModel(command.modelId);
      if (publishRepoResult.isFailure) {
        return Result.fail<PublishModelResult>(`Failed to publish model: ${publishRepoResult.error}`);
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
      const message = command.enforceValidation ? 'Model ID validation failed: Model ID is required' : 'Model ID is required';
      return Result.fail<void>(message);
    }

    if (!command.userId || command.userId.trim().length === 0) {
      const message = command.enforceValidation ? 'User ID validation failed: User ID is required' : 'User ID is required';
      return Result.fail<void>(message);
    }

    // Check if version is explicitly set to empty string (invalid)
    // undefined/null means auto-generate, empty string means invalid input
    if (command.version !== undefined && (!command.version || command.version.trim().length === 0)) {
      const message = command.enforceValidation ? 'Version validation failed: Version is required' : 'Version is required';
      return Result.fail<void>(message);
    }

    if (command.publishNotes && command.publishNotes.length > 2000) {
      const message = command.enforceValidation ? 'Publish notes validation failed: Publish notes cannot exceed 2000 characters' : 'Publish notes cannot exceed 2000 characters';
      return Result.fail<void>(message);
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