import { FunctionModel } from '../../domain/entities/function-model';
import { Result } from '../../domain/shared/result';
import { ListFunctionModelsQuery } from './model-queries';
import { IFunctionModelRepository } from '../function-model/create-function-model-use-case';

export interface FunctionModelListResult {
  modelId: string;
  name: string;
  description?: string;
  version: string;
  status: string;
  currentVersion: string;
  versionCount: number;
  metadata: Record<string, any>;
  permissions: {
    owner: string;
    editors: string[];
    viewers: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  lastSavedAt: Date;
  nodeCount: number;
  actionNodeCount: number;
}

export interface ListFunctionModelsQueryResult {
  models: FunctionModelListResult[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export class ListFunctionModelsQueryHandler {
  constructor(
    private modelRepository: IFunctionModelRepository
  ) {}

  async handle(query: ListFunctionModelsQuery): Promise<Result<ListFunctionModelsQueryResult>> {
    try {
      // Validate query
      const validationResult = this.validateQuery(query);
      if (validationResult.isFailure) {
        return Result.fail<ListFunctionModelsQueryResult>(validationResult.error);
      }

      // Build repository filter from query
      const filter = {
        userId: query.userId,
        organizationId: query.organizationId,
        status: query.status,
        searchTerm: query.searchTerm,
        limit: query.limit || 20,
        offset: query.offset || 0,
      };

      // Fetch models from repository
      const modelsResult = await this.modelRepository.findAll(filter);
      if (modelsResult.isFailure) {
        return Result.fail<ListFunctionModelsQueryResult>('Failed to fetch models');
      }

      const models = modelsResult.value;

      // Filter out soft-deleted models
      const activeModels = models.filter(model => !model.deletedAt);

      // Check permissions for each model
      const accessibleModels = activeModels.filter(model => 
        this.hasViewPermission(model, query.userId)
      );

      // Apply additional filtering
      let filteredModels = accessibleModels;

      if (query.searchTerm) {
        const searchLower = query.searchTerm.toLowerCase();
        filteredModels = accessibleModels.filter(model =>
          model.name.toString().toLowerCase().includes(searchLower) ||
          (model.description && model.description.toLowerCase().includes(searchLower))
        );
      }

      if (query.tags && query.tags.length > 0) {
        filteredModels = filteredModels.filter(model => {
          const modelTags = (model.metadata.tags as string[]) || [];
          return query.tags!.some(tag => modelTags.includes(tag));
        });
      }

      if (query.createdAfter) {
        filteredModels = filteredModels.filter(model =>
          model.createdAt >= query.createdAfter!
        );
      }

      if (query.createdBefore) {
        filteredModels = filteredModels.filter(model =>
          model.createdAt <= query.createdBefore!
        );
      }

      // Apply sorting
      const sortBy = query.sortBy || 'updated_at';
      const sortOrder = query.sortOrder || 'desc';
      
      filteredModels.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'name':
            aValue = a.name.toString().toLowerCase();
            bValue = b.name.toString().toLowerCase();
            break;
          case 'created_at':
            aValue = a.createdAt;
            bValue = b.createdAt;
            break;
          case 'updated_at':
            aValue = a.updatedAt;
            bValue = b.updatedAt;
            break;
          case 'last_saved_at':
            aValue = a.lastSavedAt;
            bValue = b.lastSavedAt;
            break;
          default:
            aValue = a.updatedAt;
            bValue = b.updatedAt;
        }

        if (sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });

      // Calculate pagination
      const totalItems = filteredModels.length;
      const pageSize = filter.limit;
      const currentPage = Math.floor(filter.offset / pageSize) + 1;
      const totalPages = Math.ceil(totalItems / pageSize);
      const hasNextPage = currentPage < totalPages;
      const hasPreviousPage = currentPage > 1;

      // Apply pagination
      const paginatedModels = filteredModels.slice(
        filter.offset,
        filter.offset + filter.limit
      );

      // Map to result format
      const modelResults: FunctionModelListResult[] = paginatedModels.map(model => ({
        modelId: model.modelId,
        name: model.name.toString(),
        description: model.description,
        version: model.version.toString(),
        status: model.status,
        currentVersion: model.currentVersion.toString(),
        versionCount: model.versionCount,
        metadata: { ...model.metadata },
        permissions: {
          owner: model.permissions.owner as string,
          editors: (model.permissions.editors as string[]) || [],
          viewers: (model.permissions.viewers as string[]) || []
        },
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        lastSavedAt: model.lastSavedAt,
        nodeCount: Array.from(model.nodes.values()).length,
        actionNodeCount: Array.from(model.actionNodes.values()).length
      }));

      const result: ListFunctionModelsQueryResult = {
        models: modelResults,
        pagination: {
          totalItems,
          totalPages,
          currentPage,
          pageSize,
          hasNextPage,
          hasPreviousPage
        }
      };

      return Result.ok<ListFunctionModelsQueryResult>(result);

    } catch (error) {
      return Result.fail<ListFunctionModelsQueryResult>(
        `Failed to list function models: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateQuery(query: ListFunctionModelsQuery): Result<void> {
    if (!query.userId || query.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      return Result.fail<void>('Limit must be between 1 and 100');
    }

    if (query.offset !== undefined && query.offset < 0) {
      return Result.fail<void>('Offset must be non-negative');
    }

    if (query.searchTerm && query.searchTerm.length > 200) {
      return Result.fail<void>('Search term cannot exceed 200 characters');
    }

    return Result.ok<void>(undefined);
  }

  private hasViewPermission(model: FunctionModel, userId: string): boolean {
    const permissions = model.permissions;
    
    // Owner always has permission
    if (permissions.owner === userId) {
      return true;
    }

    // Check if user is in viewers list
    const viewers = permissions.viewers as string[] || [];
    if (viewers.includes(userId)) {
      return true;
    }

    // Check if user is in editors list (editors can also view)
    const editors = permissions.editors as string[] || [];
    if (editors.includes(userId)) {
      return true;
    }

    return false;
  }
}