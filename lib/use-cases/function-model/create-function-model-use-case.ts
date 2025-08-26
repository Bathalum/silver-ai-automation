import { FunctionModel } from '../../domain/entities/function-model';
import { ModelName } from '../../domain/value-objects/model-name';
import { Version } from '../../domain/value-objects/version';
import { ModelStatus } from '../../domain/enums';
import { Result } from '../../domain/shared/result';
import { CreateModelCommand } from '../commands/model-commands';

export interface IFunctionModelRepository {
  save(model: FunctionModel): Promise<Result<void>>;
  findById(id: string): Promise<Result<FunctionModel>>;
  findByName(name: string, organizationId?: string): Promise<Result<FunctionModel>>;
  delete(id: string): Promise<Result<void>>;
  findAll(filter?: ModelFilter): Promise<Result<FunctionModel[]>>;
}

export interface ModelFilter {
  userId?: string;
  organizationId?: string;
  status?: ModelStatus[];
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

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

export interface CreateModelResult {
  modelId: string;
  name: string;
  version: string;
  status: ModelStatus;
  createdAt: Date;
}

export class CreateFunctionModelUseCase {
  constructor(
    private modelRepository: IFunctionModelRepository,
    private eventBus: IEventBus
  ) {}

  async execute(command: CreateModelCommand): Promise<Result<CreateModelResult>> {
    try {
      // Validate command
      const validationResult = this.validateCommand(command);
      if (validationResult.isFailure) {
        return Result.fail<CreateModelResult>(validationResult.error);
      }

      // Create model name value object
      const modelNameResult = ModelName.create(command.name);
      if (modelNameResult.isFailure) {
        return Result.fail<CreateModelResult>(modelNameResult.error);
      }

      const modelName = modelNameResult.value;

      // Check if model with same name already exists
      const existingModelResult = await this.modelRepository.findByName(
        command.name, 
        command.organizationId
      );
      
      if (existingModelResult.isSuccess) {
        return Result.fail<CreateModelResult>('A model with this name already exists');
      }

      // Generate unique model ID
      const modelId = crypto.randomUUID();

      // Create the function model
      const modelResult = FunctionModel.create({
        modelId,
        name: modelName,
        description: command.description?.trim(),
        version: Version.initial(),
        status: ModelStatus.DRAFT,
        currentVersion: Version.initial(),
        nodes: new Map(),
        actionNodes: new Map(),
        metadata: {
          templateId: command.templateId,
          organizationId: command.organizationId,
          createdBy: command.userId,
        },
        permissions: {
          owner: command.userId,
          viewers: [],
          editors: []
        }
      });

      if (modelResult.isFailure) {
        return Result.fail<CreateModelResult>(modelResult.error);
      }

      const model = modelResult.value;

      // Save to repository
      const saveResult = await this.modelRepository.save(model);
      if (saveResult.isFailure) {
        return Result.fail<CreateModelResult>(`Failed to save model: ${saveResult.error}`);
      }

      // Publish domain event (failure should not fail the primary operation)
      try {
        await this.eventBus.publish({
          eventType: 'FunctionModelCreated',
          aggregateId: modelId,
          eventData: {
            modelId,
            name: command.name,
            description: command.description,
            templateId: command.templateId,
            organizationId: command.organizationId,
            createdBy: command.userId
          },
          userId: command.userId,
          timestamp: new Date()
        });
      } catch (eventError) {
        // Log event publishing failure but don't fail the operation
        console.warn('Failed to publish FunctionModelCreated event:', eventError);
      }

      // Return success result
      return Result.ok<CreateModelResult>({
        modelId,
        name: command.name,
        version: model.version.toString(),
        status: model.status,
        createdAt: model.createdAt
      });

    } catch (error) {
      return Result.fail<CreateModelResult>(
        `Failed to create function model: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateCommand(command: CreateModelCommand): Result<void> {
    if (!command.name || command.name.trim().length === 0) {
      return Result.fail<void>('Model name is required');
    }

    if (!command.userId || command.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    if (command.description && command.description.length > 5000) {
      return Result.fail<void>('Model description cannot exceed 5000 characters');
    }

    if (command.templateId !== undefined && command.templateId.trim().length === 0) {
      return Result.fail<void>('Template ID cannot be empty if provided');
    }

    return Result.ok<void>(undefined);
  }
}