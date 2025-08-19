import { FunctionModel } from '../../domain/entities/function-model';
import { ModelName } from '../../domain/value-objects/model-name';
import { ModelStatus } from '../../domain/enums';
import { Result } from '../../domain/shared/result';
import { UpdateModelCommand } from '../commands/model-commands';
import { IFunctionModelRepository, IEventBus } from './create-function-model-use-case';

export interface UpdateModelResult {
  modelId: string;
  name: string;
  description?: string;
  updatedAt: Date;
  lastSavedAt: Date;
}

export class UpdateFunctionModelUseCase {
  constructor(
    private modelRepository: IFunctionModelRepository,
    private eventBus: IEventBus
  ) {}

  async execute(command: UpdateModelCommand): Promise<Result<UpdateModelResult>> {
    try {
      // Validate command
      const validationResult = this.validateCommand(command);
      if (validationResult.isFailure) {
        return Result.fail<UpdateModelResult>(validationResult.error);
      }

      // Retrieve the model
      const modelResult = await this.modelRepository.findById(command.modelId);
      if (modelResult.isFailure) {
        return Result.fail<UpdateModelResult>('Function model not found');
      }

      const model = modelResult.value;

      // Check if user has permission to update
      if (!this.hasUpdatePermission(model, command.userId)) {
        return Result.fail<UpdateModelResult>('Insufficient permissions to update this model');
      }

      // Check if model can be updated
      if (model.status === ModelStatus.PUBLISHED) {
        return Result.fail<UpdateModelResult>('Cannot update published model. Create a new version instead.');
      }

      if (model.deletedAt) {
        return Result.fail<UpdateModelResult>('Cannot update deleted model');
      }

      // Track changes for event
      const changes: Record<string, { old: any; new: any }> = {};

      // Update name if provided
      if (command.name !== undefined) {
        const modelNameResult = ModelName.create(command.name);
        if (modelNameResult.isFailure) {
          return Result.fail<UpdateModelResult>(modelNameResult.error);
        }

        const newName = modelNameResult.value;
        if (!model.name.equals(newName)) {
          changes.name = { old: model.name.toString(), new: newName.toString() };
          
          const updateResult = model.updateName(newName);
          if (updateResult.isFailure) {
            return Result.fail<UpdateModelResult>(updateResult.error);
          }
        }
      }

      // Update description if provided
      if (command.description !== undefined) {
        const trimmedDescription = command.description.trim() || undefined;
        if (model.description !== trimmedDescription) {
          changes.description = { old: model.description, new: trimmedDescription };
          
          const updateResult = model.updateDescription(trimmedDescription);
          if (updateResult.isFailure) {
            return Result.fail<UpdateModelResult>(updateResult.error);
          }
        }
      }

      // Update metadata if provided
      if (command.metadata !== undefined) {
        const currentMetadata = JSON.stringify(model.metadata);
        const newMetadata = JSON.stringify(command.metadata);
        
        if (currentMetadata !== newMetadata) {
          changes.metadata = { old: model.metadata, new: command.metadata };
          
          const updateResult = model.updateMetadata(command.metadata);
          if (updateResult.isFailure) {
            return Result.fail<UpdateModelResult>(updateResult.error);
          }
        }
      }

      // Save the updated model if there were changes
      if (Object.keys(changes).length > 0) {
        const saveResult = await this.modelRepository.save(model);
        if (saveResult.isFailure) {
          return Result.fail<UpdateModelResult>(`Failed to save model: ${saveResult.error}`);
        }

        // Mark as saved
        model.markSaved();

        // Publish domain event
        await this.eventBus.publish({
          eventType: 'FunctionModelUpdated',
          aggregateId: command.modelId,
          eventData: {
            modelId: command.modelId,
            changes,
            updatedBy: command.userId
          },
          userId: command.userId,
          timestamp: new Date()
        });
      }

      // Return success result
      return Result.ok<UpdateModelResult>({
        modelId: model.modelId,
        name: model.name.toString(),
        description: model.description,
        updatedAt: model.updatedAt,
        lastSavedAt: model.lastSavedAt
      });

    } catch (error) {
      return Result.fail<UpdateModelResult>(
        `Failed to update function model: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateCommand(command: UpdateModelCommand): Result<void> {
    if (!command.modelId || command.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!command.userId || command.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    if (command.name !== undefined && command.name.trim().length === 0) {
      return Result.fail<void>('Model name cannot be empty if provided');
    }

    if (command.description !== undefined && command.description.length > 5000) {
      return Result.fail<void>('Model description cannot exceed 5000 characters');
    }

    // Validate that at least one field is being updated
    if (command.name === undefined && command.description === undefined && command.metadata === undefined) {
      return Result.fail<void>('At least one field must be provided for update');
    }

    return Result.ok<void>(undefined);
  }

  private hasUpdatePermission(model: FunctionModel, userId: string): boolean {
    const permissions = model.permissions;
    
    // Owner always has permission
    if (permissions.owner === userId) {
      return true;
    }

    // Check if user is in editors list
    const editors = permissions.editors as string[] || [];
    if (editors.includes(userId)) {
      return true;
    }

    return false;
  }
}