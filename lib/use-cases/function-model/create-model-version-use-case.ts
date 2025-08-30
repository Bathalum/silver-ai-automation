import { Result } from '../../domain/shared/result';
import { FunctionModel } from '../../domain/entities/function-model';
import { FunctionModelVersion } from '../../domain/entities/function-model-version';
import { ModelVersioningService } from '../../domain/services/model-versioning-service';
import { ModelStatus } from '../../domain/enums';

export interface CreateModelVersionRequest {
  modelId: string;
  versionType: 'major' | 'minor' | 'patch';
  authorId: string;
}

export interface CreateModelVersionResponse {
  versionId: string;
  versionNumber: string;
  modelId: string;
  authorId: string;
  isPublished: boolean;
  createdAt: Date;
}

export class CreateModelVersionUseCase {
  constructor(
    private modelVersioningService: ModelVersioningService,
    private functionModelRepository: any // Repository interface not yet defined
  ) {}

  async execute(request: CreateModelVersionRequest): Promise<Result<CreateModelVersionResponse>> {
    try {
      // Validate request
      const validationResult = this.validateRequest(request);
      if (validationResult.isFailure) {
        return Result.fail<CreateModelVersionResponse>(validationResult.error);
      }

      // Get the model (this would normally come from repository)
      // For now, we'll simulate this since the repository pattern isn't fully implemented
      const model = await this.getModelById(request.modelId);
      if (!model) {
        return Result.fail<CreateModelVersionResponse>('Model not found');
      }

      // Check if model can create a new version
      const canVersionResult = this.canCreateVersion(model);
      if (canVersionResult.isFailure) {
        return Result.fail<CreateModelVersionResponse>(canVersionResult.error);
      }

      // Create the new version using the versioning service
      const newVersionResult = await this.modelVersioningService.createVersion(model, request.versionType);
      if (newVersionResult.isFailure) {
        return Result.fail<CreateModelVersionResponse>(newVersionResult.error);
      }

      const newVersion = newVersionResult.value;

      // Capture complete model state
      const versionData = this.captureModelState(model);

      // Create version entity
      const versionEntityResult = FunctionModelVersion.create({
        versionId: this.generateVersionId(),
        modelId: request.modelId,
        versionNumber: newVersion.toString(),
        versionData: versionData,
        authorId: request.authorId,
        isPublished: false // New versions start as unpublished
      });

      if (versionEntityResult.isFailure) {
        return Result.fail<CreateModelVersionResponse>(versionEntityResult.error);
      }

      const versionEntity = versionEntityResult.value;

      // Prepare response
      const response: CreateModelVersionResponse = {
        versionId: versionEntity.versionId,
        versionNumber: versionEntity.versionNumber,
        modelId: versionEntity.modelId,
        authorId: versionEntity.authorId,
        isPublished: versionEntity.isPublished,
        createdAt: versionEntity.createdAt
      };

      return Result.ok<CreateModelVersionResponse>(response);

    } catch (error) {
      return Result.fail<CreateModelVersionResponse>(`Failed to create model version: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private validateRequest(request: CreateModelVersionRequest): Result<void> {
    if (!request.modelId || request.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!request.authorId || request.authorId.trim().length === 0) {
      return Result.fail<void>('Author ID is required');
    }

    if (!['major', 'minor', 'patch'].includes(request.versionType)) {
      return Result.fail<void>('Version type must be major, minor, or patch');
    }

    return Result.ok<void>(undefined);
  }

  private canCreateVersion(model: FunctionModel): Result<void> {
    // Only draft models can create new versions directly
    if (model.status !== ModelStatus.DRAFT) {
      return Result.fail<void>('Only draft models can create new versions directly');
    }

    return Result.ok<void>(undefined);
  }

  private captureModelState(model: FunctionModel): any {
    // Capture complete reproducible model state
    return Object.freeze({
      modelMetadata: {
        id: model.id,
        name: model.name.value,
        description: model.description,
        status: model.status
      },
      nodes: Array.from(model.nodes.values()).map(node => ({
        id: node.id.toString(),
        type: node.type,
        name: node.name,
        description: node.description,
        position: {
          x: node.position.x,
          y: node.position.y
        },
        metadata: node.metadata
      })),
      actions: Array.from(model.actionNodes.values()).map(action => ({
        id: action.id.toString(),
        parentNodeId: action.parentNodeId.toString(),
        type: action.type,
        name: action.name,
        description: action.description,
        executionOrder: action.executionOrder,
        priority: action.priority,
        metadata: action.metadata
      })),
      links: [], // Links would be captured here when implemented
      configuration: model.metadata || {}
    });
  }

  private generateVersionId(): string {
    return `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getModelById(modelId: string): Promise<FunctionModel | null> {
    // This would normally use the repository
    // For now, return null to simulate not found
    // In a real implementation, this would be:
    // return await this.functionModelRepository.getById(modelId);
    return null;
  }
}