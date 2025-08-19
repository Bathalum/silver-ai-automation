import { NextRequest } from 'next/server';
import { 
  withAuth, 
  withErrorHandling, 
  withRateLimit,
  createSuccessResponse,
  createErrorResponse,
  AuthenticatedUser
} from '@/lib/api/middleware';
import { 
  SearchModelsQuerySchema,
  SearchModelsQuery,
  ModelDto,
  PaginationMeta,
  ApiErrorCode,
  HttpStatus
} from '@/lib/api/types';
import { createFunctionModelContainer } from '@/lib/infrastructure/di/function-model-module';
import { createClient } from '@/lib/supabase/server';
import { ServiceTokens } from '@/lib/infrastructure/di/container';

/**
 * GET /api/function-models/search
 * Advanced search for function models
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(
    withRateLimit(
      withAuth(async (req: NextRequest, user: AuthenticatedUser) => {
        try {
          // Parse query parameters
          const url = new URL(request.url);
          const queryParams = Object.fromEntries(url.searchParams.entries());
          
          // Convert string booleans to actual booleans
          const processedParams = {
            ...queryParams,
            page: queryParams.page ? parseInt(queryParams.page) : 1,
            pageSize: queryParams.pageSize ? parseInt(queryParams.pageSize) : 20,
            includeArchived: queryParams.includeArchived === 'true',
            sortBy: queryParams.sortBy || 'updated_at',
            sortOrder: queryParams.sortOrder || 'desc'
          };

          const validationResult = SearchModelsQuerySchema.safeParse(processedParams);
          
          if (!validationResult.success) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid search parameters',
              HttpStatus.BAD_REQUEST,
              { validationErrors: validationResult.error.errors }
            );
          }

          const searchQuery: SearchModelsQuery = validationResult.data;

          // Create container with dependencies
          const supabase = await createClient();
          const container = await createFunctionModelContainer(supabase);

          // For now, we'll use the list query handler with search filters
          // In a full implementation, you'd have a SearchFunctionModelsQueryHandler
          const queryHandlerResult = await container.resolve(ServiceTokens.LIST_FUNCTION_MODELS_QUERY_HANDLER);
          if (queryHandlerResult.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to initialize search service',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const queryHandler = queryHandlerResult.value;

          // Execute search query
          const result = await queryHandler.handle({
            userId: user.id,
            page: searchQuery.page,
            pageSize: searchQuery.pageSize,
            status: searchQuery.status,
            search: searchQuery.query,
            sortBy: searchQuery.sortBy,
            sortOrder: searchQuery.sortOrder,
            includeArchived: searchQuery.includeArchived
          });

          if (result.isFailure) {
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              result.error,
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          const queryResult = result.value;

          // Apply additional filters if specified
          let filteredModels = queryResult.models;

          // Filter by tags if specified
          if (searchQuery.tags && searchQuery.tags.length > 0) {
            filteredModels = filteredModels.filter(model => {
              const modelTags = (model.metadata?.tags as string[]) || [];
              return searchQuery.tags!.some(tag => modelTags.includes(tag));
            });
          }

          // Filter by date range if specified
          if (searchQuery.createdAfter) {
            const afterDate = new Date(searchQuery.createdAfter);
            filteredModels = filteredModels.filter(model => 
              new Date(model.createdAt) >= afterDate
            );
          }

          if (searchQuery.createdBefore) {
            const beforeDate = new Date(searchQuery.createdBefore);
            filteredModels = filteredModels.filter(model => 
              new Date(model.createdAt) <= beforeDate
            );
          }

          // Convert to DTOs
          const modelDtos: ModelDto[] = filteredModels.map(model => ({
            modelId: model.modelId,
            name: model.name,
            description: model.description,
            version: model.version,
            status: model.status,
            currentVersion: model.currentVersion,
            versionCount: model.versionCount,
            metadata: model.metadata,
            permissions: model.permissions,
            createdAt: model.createdAt.toISOString(),
            updatedAt: model.updatedAt.toISOString(),
            lastSavedAt: model.lastSavedAt.toISOString()
          }));

          // Create pagination meta (adjusted for post-query filtering)
          const paginationMeta: PaginationMeta = {
            page: searchQuery.page,
            pageSize: searchQuery.pageSize,
            totalItems: modelDtos.length,
            totalPages: Math.ceil(modelDtos.length / searchQuery.pageSize),
            hasNextPage: searchQuery.page * searchQuery.pageSize < modelDtos.length,
            hasPreviousPage: searchQuery.page > 1
          };

          return createSuccessResponse(modelDtos, HttpStatus.OK, {
            searchQuery: searchQuery.query,
            appliedFilters: {
              status: searchQuery.status,
              tags: searchQuery.tags,
              createdAfter: searchQuery.createdAfter,
              createdBefore: searchQuery.createdBefore,
              includeArchived: searchQuery.includeArchived
            },
            pagination: paginationMeta
          });

        } catch (error) {
          console.error('Search models error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to search function models',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 100, windowMs: 60000 } // 100 searches per minute
    )
  )(request);
}