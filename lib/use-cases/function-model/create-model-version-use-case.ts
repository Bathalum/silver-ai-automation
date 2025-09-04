import { Result } from '../../domain/shared/result';
import { ModelVersioningService } from '../../domain/services/model-versioning-service';
import { ModelVersionCreated } from '../../domain/events/model-events';

// Command interface matching test expectations
export interface CreateModelVersionCommand {
  modelId: string;
  userId: string;
  versionType: 'major' | 'minor' | 'patch';
  versionNotes?: string;
}

// Result interface matching test expectations
export interface CreateModelVersionResult {
  newVersion: string;
  versionType: 'major' | 'minor' | 'patch';
  modelId: string;
  userId: string;
  versionNotes?: string;
  createdAt: Date;
}

export interface IEventBus {
  publish(event: any): Promise<void>;
}

export interface IFunctionModelRepository {
  findById(id: string): Promise<Result<any>>;
  save(model: any): Promise<Result<void>>;
  saveVersion?(modelId: string, version: any): Promise<Result<void>>;
}

export class CreateModelVersionUseCase {
  constructor(
    private readonly repository: IFunctionModelRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(command: CreateModelVersionCommand): Promise<Result<CreateModelVersionResult>> {
    try {
      // Validate command
      const validationResult = this.validateCommand(command);
      if (validationResult.isFailure) {
        return Result.fail<CreateModelVersionResult>(validationResult.error);
      }

      // Get the model from repository
      const modelResult = await this.repository.findById(command.modelId);
      if (modelResult.isFailure) {
        return Result.fail<CreateModelVersionResult>(`Model not found: ${modelResult.error}`);
      }

      const model = modelResult.value;

      // Create versioning service and determine new version number
      const versioningService = new ModelVersioningService();
      const newVersionResult = await versioningService.createVersion(model, command.versionType);
      
      if (newVersionResult.isFailure) {
        return Result.fail<CreateModelVersionResult>(newVersionResult.error);
      }

      const newVersion = newVersionResult.value;
      const newVersionString = newVersion.toString();

      // Create new model version using entity's createVersion method
      const newModelResult = model.createVersion(newVersionString);
      if (newModelResult.isFailure) {
        return Result.fail<CreateModelVersionResult>(newModelResult.error);
      }

      const newModel = newModelResult.value;
      
      // Save the new model version
      const saveResult = await this.repository.save(newModel);
      if (saveResult.isFailure) {
        return Result.fail<CreateModelVersionResult>(`Failed to save model: ${saveResult.error}`);
      }

      // Save version history if repository supports it
      if (this.repository.saveVersion) {
        const versionData = {
          versionId: this.generateVersionId(),
          modelId: command.modelId,
          versionNumber: newVersionString,
          versionType: command.versionType,
          userId: command.userId,
          versionNotes: command.versionNotes,
          createdAt: new Date(),
          versionData: this.captureModelState(newModel)
        };

        await this.repository.saveVersion(command.modelId, versionData);
      }

      // Publish domain event
      const event = new ModelVersionCreated({
        modelId: command.modelId,
        modelName: newModel.name?.value || newModel.name || 'Unknown Model',
        previousVersion: model.version?.toString() || '1.0.0',
        newVersion: newVersionString,
        createdBy: command.userId,
        createdAt: new Date(),
        versionNotes: command.versionNotes
      });
      
      await this.eventBus.publish(event);

      // Return result matching test expectations
      const result: CreateModelVersionResult = {
        newVersion: newVersionString,
        versionType: command.versionType,
        modelId: command.modelId,
        userId: command.userId,
        versionNotes: command.versionNotes,
        createdAt: new Date()
      };

      return Result.ok<CreateModelVersionResult>(result);

    } catch (error) {
      return Result.fail<CreateModelVersionResult>(
        `Failed to create model version: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateCommand(command: CreateModelVersionCommand): Result<void> {
    if (!command.modelId || command.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!command.userId || command.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    if (!['major', 'minor', 'patch'].includes(command.versionType)) {
      return Result.fail<void>('Version type must be major, minor, or patch');
    }

    return Result.ok<void>(undefined);
  }

  private captureModelState(model: any): any {
    // Capture complete reproducible model state
    return Object.freeze({
      modelMetadata: {
        id: model.modelId || model.id,
        name: model.name?.value || model.name || 'Unknown',
        description: model.description || '',
        status: model.status
      },
      nodes: model.nodes ? Array.from(model.nodes.values()).map((node: any) => ({
        id: node.id?.toString() || node.nodeId,
        type: node.type,
        name: node.name,
        description: node.description,
        position: node.position || { x: 0, y: 0 },
        metadata: node.metadata || {}
      })) : [],
      actions: model.actionNodes ? Array.from(model.actionNodes.values()).map((action: any) => ({
        id: action.id?.toString() || action.nodeId,
        parentNodeId: action.parentNodeId?.toString(),
        type: action.type,
        name: action.name,
        description: action.description,
        executionOrder: action.executionOrder,
        priority: action.priority,
        metadata: action.metadata || {}
      })) : [],
      links: [], // Links would be captured here when implemented
      configuration: model.metadata || {}
    });
  }

  private generateVersionId(): string {
    return `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}