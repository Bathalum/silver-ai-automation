/**
 * Type-safe API client for Function Model API
 * Provides strongly-typed methods for all API endpoints
 */

import {
  ApiResponse,
  PaginationMeta,
  CreateModelRequest,
  UpdateModelRequest,
  PublishModelRequest,
  AddNodeRequest,
  AddActionRequest,
  SearchModelsQuery,
  AuditLogQuery,
  ExecuteWorkflowRequest,
  CreateEdgeRequest,
  UpdateEdgeRequest,
  EdgeResponseDto,
  ModelDto,
  NodeDto,
  ActionNodeDto,
  ModelStatisticsDto,
  AuditLogDto,
  WorkflowExecutionDto,
  ApiErrorCode,
  HttpStatus
} from './types';

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class FunctionModelApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string = '/api', token?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      Authorization: `Bearer ${token}`
    };
  }

  /**
   * Remove authentication token
   */
  clearAuthToken() {
    const { Authorization, ...headers } = this.defaultHeaders as any;
    this.defaultHeaders = headers;
  }

  /**
   * Internal method to make HTTP requests
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json() as ApiResponse<T>;

      if (!response.ok) {
        throw new ApiError(
          data.error?.code as ApiErrorCode || ApiErrorCode.INTERNAL_ERROR,
          data.error?.message || 'An error occurred',
          response.status,
          data.error?.details
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        ApiErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Network error',
        500
      );
    }
  }

  // ===== FUNCTION MODEL CRUD OPERATIONS =====

  /**
   * Create a new function model
   */
  async createModel(request: CreateModelRequest): Promise<ModelDto> {
    const response = await this.makeRequest<ModelDto>('/function-models', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.data!;
  }

  /**
   * List function models with pagination
   */
  async listModels(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ models: ModelDto[]; pagination: PaginationMeta }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const endpoint = `/function-models${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.makeRequest<ModelDto[]>(endpoint);
    
    return {
      models: response.data!,
      pagination: response.meta?.pagination!
    };
  }

  /**
   * Get a specific function model
   */
  async getModel(
    modelId: string,
    options: {
      includeNodes?: boolean;
      includeActionNodes?: boolean;
      includeStatistics?: boolean;
    } = {}
  ): Promise<ModelDto> {
    const searchParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const endpoint = `/function-models/${modelId}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.makeRequest<ModelDto>(endpoint);
    return response.data!;
  }

  /**
   * Update a function model
   */
  async updateModel(modelId: string, request: UpdateModelRequest): Promise<ModelDto> {
    const response = await this.makeRequest<ModelDto>(`/function-models/${modelId}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
    return response.data!;
  }

  /**
   * Delete a function model (soft delete)
   */
  async deleteModel(modelId: string): Promise<void> {
    await this.makeRequest(`/function-models/${modelId}`, {
      method: 'DELETE',
    });
  }

  // ===== MODEL OPERATIONS =====

  /**
   * Publish a function model
   */
  async publishModel(modelId: string, request: PublishModelRequest): Promise<ModelDto> {
    const response = await this.makeRequest<ModelDto>(`/function-models/${modelId}/publish`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.data!;
  }

  // ===== NODE MANAGEMENT =====

  /**
   * Get all container nodes for a model
   */
  async getModelNodes(modelId: string): Promise<NodeDto[]> {
    const response = await this.makeRequest<NodeDto[]>(`/function-models/${modelId}/nodes`);
    return response.data!;
  }

  /**
   * Add a container node to a model
   */
  async addNode(modelId: string, request: AddNodeRequest): Promise<NodeDto> {
    const response = await this.makeRequest<NodeDto>(`/function-models/${modelId}/nodes`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.data!;
  }

  // ===== ACTION MANAGEMENT =====

  /**
   * Get all action nodes for a model
   */
  async getModelActions(modelId: string, parentNodeId?: string): Promise<ActionNodeDto[]> {
    const searchParams = new URLSearchParams();
    if (parentNodeId) {
      searchParams.append('parentNodeId', parentNodeId);
    }

    const endpoint = `/function-models/${modelId}/actions${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.makeRequest<ActionNodeDto[]>(endpoint);
    return response.data!;
  }

  /**
   * Add an action node to a model
   */
  async addAction(modelId: string, request: AddActionRequest): Promise<ActionNodeDto> {
    const response = await this.makeRequest<ActionNodeDto>(`/function-models/${modelId}/actions`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.data!;
  }

  // ===== ADVANCED FEATURES =====

  /**
   * Search function models with advanced filtering
   */
  async searchModels(query: Partial<SearchModelsQuery>): Promise<{ models: ModelDto[]; pagination: PaginationMeta }> {
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    const endpoint = `/function-models/search?${searchParams.toString()}`;
    const response = await this.makeRequest<ModelDto[]>(endpoint);
    
    return {
      models: response.data!,
      pagination: response.meta?.pagination!
    };
  }

  /**
   * Get comprehensive statistics for a model
   */
  async getModelStatistics(modelId: string): Promise<ModelStatisticsDto> {
    const response = await this.makeRequest<ModelStatisticsDto>(`/function-models/${modelId}/statistics`);
    return response.data!;
  }

  /**
   * Get audit logs for a model
   */
  async getModelAuditLogs(
    modelId: string, 
    query: Partial<AuditLogQuery> = {}
  ): Promise<{ logs: AuditLogDto[]; pagination: PaginationMeta }> {
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const endpoint = `/function-models/${modelId}/audit${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await this.makeRequest<AuditLogDto[]>(endpoint);
    
    return {
      logs: response.data!,
      pagination: response.meta?.pagination!
    };
  }

  // ===== EDGE MANAGEMENT =====

  /**
   * Get all edges for a model
   */
  async getModelEdges(modelId: string): Promise<EdgeResponseDto[]> {
    const response = await this.makeRequest<EdgeResponseDto[]>(`/function-models/${modelId}/edges`);
    return response.data!;
  }

  /**
   * Create a new edge between nodes
   */
  async createEdge(modelId: string, request: CreateEdgeRequest): Promise<EdgeResponseDto> {
    const response = await this.makeRequest<EdgeResponseDto>(`/function-models/${modelId}/edges`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.data!;
  }

  /**
   * Get a specific edge by ID
   */
  async getEdge(modelId: string, edgeId: string): Promise<EdgeResponseDto> {
    const response = await this.makeRequest<EdgeResponseDto>(`/function-models/${modelId}/edges/${edgeId}`);
    return response.data!;
  }

  /**
   * Update an existing edge
   */
  async updateEdge(modelId: string, edgeId: string, request: UpdateEdgeRequest): Promise<EdgeResponseDto> {
    const response = await this.makeRequest<EdgeResponseDto>(`/function-models/${modelId}/edges/${edgeId}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
    return response.data!;
  }

  /**
   * Delete an edge
   */
  async deleteEdge(modelId: string, edgeId: string): Promise<void> {
    await this.makeRequest(`/function-models/${modelId}/edges/${edgeId}`, {
      method: 'DELETE',
    });
  }

  // ===== WORKFLOW EXECUTION =====

  /**
   * Execute a workflow
   */
  async executeWorkflow(modelId: string, request: ExecuteWorkflowRequest): Promise<WorkflowExecutionDto> {
    const response = await this.makeRequest<WorkflowExecutionDto>(`/function-models/${modelId}/execute`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.data!;
  }

  /**
   * Get workflow execution status
   */
  async getExecutionStatus(modelId: string, executionId: string): Promise<WorkflowExecutionDto> {
    const response = await this.makeRequest<WorkflowExecutionDto>(
      `/function-models/${modelId}/execute?executionId=${executionId}`
    );
    return response.data!;
  }

  // ===== UTILITY METHODS =====

  /**
   * Check API health
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.makeRequest<{ status: string; timestamp: string }>('/health');
    return response.data!;
  }

  /**
   * Get API documentation URL
   */
  getDocsUrl(): string {
    return `${this.baseUrl}/docs/swagger`;
  }

  /**
   * Get OpenAPI specification URL
   */
  getOpenApiUrl(): string {
    return `${this.baseUrl}/docs`;
  }
}

// Export default instance
export const apiClient = new FunctionModelApiClient();

// Export factory function for creating instances with custom config
export function createApiClient(baseUrl?: string, token?: string): FunctionModelApiClient {
  return new FunctionModelApiClient(baseUrl, token);
}

// Export types for convenience
export type {
  ApiResponse,
  CreateModelRequest,
  UpdateModelRequest,
  PublishModelRequest,
  CreateEdgeRequest,
  UpdateEdgeRequest,
  EdgeResponseDto,
  ModelDto,
  NodeDto,
  ActionNodeDto,
  ModelStatisticsDto,
  AuditLogDto,
  WorkflowExecutionDto,
  SearchModelsQuery,
  AuditLogQuery,
  ExecuteWorkflowRequest,
  PaginationMeta
};