/**
 * Advanced React Hooks Index
 * Centralized exports for Interface Adapter layer hooks
 * 
 * CLEAN ARCHITECTURE BOUNDARY:
 * - Interface Adapter Layer (React Hooks) → Application Layer (Use Cases)
 * - Provides comprehensive hook suite for UI components
 * - Maintains clean separation between presentation and business logic
 */

// REMAINING HOOKS AFTER UI CLEANUP
// Core hooks that don't depend on deleted UI components

// Authentication and API client hooks
export { 
  useApiClient, 
  ApiClient,
  type ApiClientConfig,
  type ApiRequest,
  type ApiResponse,
  type ApiError,
  type UseApiClientResult 
} from './useApiClient';

// Execution monitoring hooks
export { 
  useExecutionStatus, 
  useExecutionList,
  type UseExecutionStatusOptions, 
  type ExecutionProgress, 
  type ExecutionResult, 
  type UseExecutionStatusResult 
} from './useExecutionStatus';

// Workflow and Canvas Management (React Flow Integration)
export { 
  useWorkflowNodes,
  type UseWorkflowNodesOptions,
  type UseWorkflowNodesResult 
} from './useWorkflowNodes';

// Basic UI state management hooks (non-canvas specific)
export { useFormState } from './use-form-state';
export { useDataFetching } from './use-data-fetching';

// Re-export common types for convenience
export type {
  ModelDto,
  NodeDto,
  ActionNodeDto,
  ExecutionDto,
  ModelStatisticsDto,
  SearchResultDto,
  ApiResponse as LibApiResponse,
  PaginationMeta,
  CreateModelRequest,
  UpdateModelRequest,
  AddNodeRequest,
  UpdateNodeRequest,
  AddActionRequest,
  UpdateActionRequest
} from '@/lib/api/types';

export type {
  ModelDto as ActionModelDto,
  ContainerNodeDto,
  ActionNodeDto as ActionActionNodeDto,
  ExecutionDto as ActionExecutionDto,
  ModelStatisticsDto as ActionModelStatisticsDto,
  SearchResultDto as ActionSearchResultDto,
  ActionResult,
  ValidationResultDto,
  CrossFeatureLinkDto,
  PermissionDto,
  AuditLogDto,
  ErrorDto
} from '@/app/actions/types';

/**
 * Hook categories for easy organization:
 * 
 * DATA FETCHING & MANAGEMENT:
 * - useModels: List and filter models with pagination
 * - useModel: Fetch single model with optional related data
 * - useModelOperations: CRUD operations for models
 * 
 * NODE & ACTION MANAGEMENT:
 * - useModelNodes: Manage container nodes within models
 * - useModelActions: Manage action nodes within containers
 * 
 * SEARCH & ANALYTICS:
 * - useModelSearch: Advanced search with faceting and filters
 * - useSearchFilters: Helper for search filter state management
 * - useModelStatistics: Analytics and performance metrics
 * - useModelMetrics: Extract specific metrics from statistics
 * - useModelComparison: Compare statistics between models
 * 
 * AUTHENTICATION & NETWORKING:
 * - useApiClient: Authentication-aware HTTP client
 * - ApiClient: Class for making authenticated API requests
 * 
 * REAL-TIME & COLLABORATION:
 * - useModelRealTime: Live updates and collaboration features
 * 
 * EXECUTION MONITORING:
 * - useExecutionStatus: Monitor workflow execution progress
 * - useExecutionList: Manage multiple execution statuses
 * 
 * UI STATE MANAGEMENT:
 * - useUiState: General UI state management
 * - useFormState: Form-specific state management
 * - useDataFetching: Data fetching patterns
 * - useWorkflowUiState: Workflow-specific UI state
 * - useExecutionUiState: Execution UI state management
 * - useContextUiState: Context-specific UI state
 * - useWorkflowPresenter: Presentation layer for workflows
 */

/**
 * Usage Examples:
 * 
 * // Basic model fetching
 * const { models, loading, error, refetch } = useModels({
 *   page: 1,
 *   pageSize: 20,
 *   status: 'published'
 * });
 * 
 * // Single model with related data
 * const { model, loading, error } = useModel(modelId, {
 *   includeNodes: true,
 *   includeStatistics: true
 * });
 * 
 * // Model operations
 * const { createModel, deleteModel, loading } = useModelOperations();
 * 
 * // Node management
 * const { nodes, addNode, updateNode, deleteNode } = useModelNodes(modelId);
 * 
 * // Advanced search
 * const { searchResults, search, isSearching } = useModelSearch();
 * const { filters, updateFilter } = useSearchFilters();
 * 
 * // Real-time updates
 * const { isConnected, lastEvent, collaborators } = useModelRealTime(modelId, {
 *   includeCollaboration: true
 * });
 * 
 * // Execution monitoring
 * const { execution, progress, cancel, pause, resume } = useExecutionStatus(executionId);
 * 
 * // Authentication
 * const { client, user, signIn, signOut } = useApiClient();
 */