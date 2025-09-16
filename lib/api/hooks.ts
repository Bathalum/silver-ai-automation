/**
 * React hooks for Function Model API integration
 * Provides easy-to-use hooks for React components
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  FunctionModelApiClient, 
  ApiError,
  CreateModelRequest,
  UpdateModelRequest,
  PublishModelRequest,
  SearchModelsQuery,
  CreateEdgeRequest,
  UpdateEdgeRequest,
  EdgeResponseDto,
  ModelDto,
  NodeDto,
  ActionNodeDto,
  ModelStatisticsDto,
  PaginationMeta
} from './client';
import { 
  ApiErrorCode, 
  AddNodeRequest, 
  AddActionRequest 
} from './types';

// Hook state interfaces
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

interface PaginatedState<T> extends AsyncState<T[]> {
  pagination: PaginationMeta | null;
}

// Custom hook for API client instance
export function useApiClient(): FunctionModelApiClient {
  // In a real app, you'd get the token from auth context
  const [client] = useState(() => new FunctionModelApiClient());
  return client;
}

// ===== FUNCTION MODEL HOOKS =====

/**
 * Hook for managing function models list with pagination and search
 */
export function useModels(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}) {
  const client = useApiClient();
  const [state, setState] = useState<PaginatedState<ModelDto>>({
    data: null,
    loading: false,
    error: null,
    pagination: null
  });

  const fetchModels = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await client.listModels(params);
      setState({
        data: result.models,
        loading: false,
        error: null,
        pagination: result.pagination
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500)
      }));
    }
  }, [client, JSON.stringify(params)]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models: state.data,
    loading: state.loading,
    error: state.error,
    pagination: state.pagination,
    refetch: fetchModels
  };
}

/**
 * Hook for managing a single function model
 */
export function useModel(modelId: string | null, options: {
  includeNodes?: boolean;
  includeActionNodes?: boolean;
  includeStatistics?: boolean;
} = {}) {
  const client = useApiClient();
  const [state, setState] = useState<AsyncState<ModelDto>>({
    data: null,
    loading: false,
    error: null
  });

  const fetchModel = useCallback(async () => {
    if (!modelId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const model = await client.getModel(modelId, options);
      setState({
        data: model,
        loading: false,
        error: null
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500)
      }));
    }
  }, [client, modelId, JSON.stringify(options)]);

  useEffect(() => {
    fetchModel();
  }, [fetchModel]);

  return {
    model: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchModel
  };
}

/**
 * Hook for model operations (create, update, delete, publish)
 */
export function useModelOperations() {
  const client = useApiClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const createModel = useCallback(async (request: CreateModelRequest): Promise<ModelDto | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const model = await client.createModel(request);
      setLoading(false);
      return model;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500);
      setError(apiError);
      setLoading(false);
      return null;
    }
  }, [client]);

  const updateModel = useCallback(async (modelId: string, request: UpdateModelRequest): Promise<ModelDto | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const model = await client.updateModel(modelId, request);
      setLoading(false);
      return model;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500);
      setError(apiError);
      setLoading(false);
      return null;
    }
  }, [client]);

  const deleteModel = useCallback(async (modelId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      await client.deleteModel(modelId);
      setLoading(false);
      return true;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500);
      setError(apiError);
      setLoading(false);
      return false;
    }
  }, [client]);

  const publishModel = useCallback(async (modelId: string, request: PublishModelRequest): Promise<ModelDto | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const model = await client.publishModel(modelId, request);
      setLoading(false);
      return model;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500);
      setError(apiError);
      setLoading(false);
      return null;
    }
  }, [client]);

  return {
    createModel,
    updateModel,
    deleteModel,
    publishModel,
    loading,
    error
  };
}

/**
 * Hook for managing model nodes
 */
export function useModelNodes(modelId: string | null) {
  const client = useApiClient();
  const [state, setState] = useState<AsyncState<NodeDto[]>>({
    data: null,
    loading: false,
    error: null
  });

  const fetchNodes = useCallback(async () => {
    if (!modelId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const nodes = await client.getModelNodes(modelId);
      setState({
        data: nodes,
        loading: false,
        error: null
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500)
      }));
    }
  }, [client, modelId]);

  const addNode = useCallback(async (request: AddNodeRequest): Promise<NodeDto | null> => {
    if (!modelId) return null;

    try {
      const node = await client.addNode(modelId, request);
      // Refetch nodes to update the list
      await fetchNodes();
      return node;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500)
      }));
      return null;
    }
  }, [client, modelId, fetchNodes]);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  return {
    nodes: state.data,
    loading: state.loading,
    error: state.error,
    addNode,
    refetch: fetchNodes
  };
}

/**
 * Hook for managing model actions
 */
export function useModelActions(modelId: string | null, parentNodeId?: string) {
  const client = useApiClient();
  const [state, setState] = useState<AsyncState<ActionNodeDto[]>>({
    data: null,
    loading: false,
    error: null
  });

  const fetchActions = useCallback(async () => {
    if (!modelId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const actions = await client.getModelActions(modelId, parentNodeId);
      setState({
        data: actions,
        loading: false,
        error: null
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500)
      }));
    }
  }, [client, modelId, parentNodeId]);

  const addAction = useCallback(async (request: AddActionRequest): Promise<ActionNodeDto | null> => {
    if (!modelId) return null;

    try {
      const action = await client.addAction(modelId, request);
      // Refetch actions to update the list
      await fetchActions();
      return action;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500)
      }));
      return null;
    }
  }, [client, modelId, fetchActions]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  return {
    actions: state.data,
    loading: state.loading,
    error: state.error,
    addAction,
    refetch: fetchActions
  };
}

/**
 * Hook for advanced search functionality
 */
export function useModelSearch() {
  const client = useApiClient();
  const [state, setState] = useState<PaginatedState<ModelDto>>({
    data: null,
    loading: false,
    error: null,
    pagination: null
  });

  const search = useCallback(async (query: Partial<SearchModelsQuery>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await client.searchModels(query);
      setState({
        data: result.models,
        loading: false,
        error: null,
        pagination: result.pagination
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500)
      }));
    }
  }, [client]);

  return {
    results: state.data,
    loading: state.loading,
    error: state.error,
    pagination: state.pagination,
    search
  };
}

/**
 * Hook for model statistics
 */
export function useModelStatistics(modelId: string | null) {
  const client = useApiClient();
  const [state, setState] = useState<AsyncState<ModelStatisticsDto>>({
    data: null,
    loading: false,
    error: null
  });

  const fetchStatistics = useCallback(async () => {
    if (!modelId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const statistics = await client.getModelStatistics(modelId);
      setState({
        data: statistics,
        loading: false,
        error: null
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500)
      }));
    }
  }, [client, modelId]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    statistics: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchStatistics
  };
}

// ===== EDGE MANAGEMENT HOOKS =====

/**
 * Hook for managing model edges
 */
export function useModelEdges(modelId: string | null) {
  const client = useApiClient();
  const [state, setState] = useState<AsyncState<EdgeResponseDto[]>>({
    data: null,
    loading: false,
    error: null
  });

  const fetchEdges = useCallback(async () => {
    if (!modelId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const edges = await client.getModelEdges(modelId);
      setState({
        data: edges,
        loading: false,
        error: null
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500)
      }));
    }
  }, [client, modelId]);

  useEffect(() => {
    fetchEdges();
  }, [fetchEdges]);

  return {
    edges: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchEdges
  };
}

/**
 * Hook for edge operations (create, update, delete)
 */
export function useEdgeOperations() {
  const client = useApiClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const createEdge = useCallback(async (modelId: string, request: CreateEdgeRequest): Promise<EdgeResponseDto | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const edge = await client.createEdge(modelId, request);
      setLoading(false);
      return edge;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500);
      setError(apiError);
      setLoading(false);
      return null;
    }
  }, [client]);

  const updateEdge = useCallback(async (modelId: string, edgeId: string, request: UpdateEdgeRequest): Promise<EdgeResponseDto | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const edge = await client.updateEdge(modelId, edgeId, request);
      setLoading(false);
      return edge;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500);
      setError(apiError);
      setLoading(false);
      return null;
    }
  }, [client]);

  const deleteEdge = useCallback(async (modelId: string, edgeId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      await client.deleteEdge(modelId, edgeId);
      setLoading(false);
      return true;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500);
      setError(apiError);
      setLoading(false);
      return false;
    }
  }, [client]);

  const getEdge = useCallback(async (modelId: string, edgeId: string): Promise<EdgeResponseDto | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const edge = await client.getEdge(modelId, edgeId);
      setLoading(false);
      return edge;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Unknown error', 500);
      setError(apiError);
      setLoading(false);
      return null;
    }
  }, [client]);

  return {
    createEdge,
    updateEdge,
    deleteEdge,
    getEdge,
    loading,
    error
  };
}

// Export utility functions
export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}

export function getErrorMessage(error: ApiError | Error | null): string {
  if (!error) return '';
  if (error instanceof ApiError) {
    return error.message;
  }
  return error.message || 'An unknown error occurred';
}