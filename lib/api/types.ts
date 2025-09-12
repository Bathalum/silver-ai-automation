import { z } from 'zod';

/**
 * Standard API response format for all endpoints
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    pagination?: PaginationMeta;
  };
}

/**
 * Pagination metadata for list endpoints
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Standard error codes used across all API endpoints
 */
export enum ApiErrorCode {
  // Client Errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Server Errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}

/**
 * Request/Response DTOs for Function Model API
 */

// Create Model Request
export const CreateModelRequestSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  templateId: z.string().uuid().optional()
});

export type CreateModelRequest = z.infer<typeof CreateModelRequestSchema>;

// Update Model Request
export const UpdateModelRequestSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export type UpdateModelRequest = z.infer<typeof UpdateModelRequestSchema>;

// Publish Model Request
export const PublishModelRequestSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // Semantic version
  publishNotes: z.string().optional()
});

export type PublishModelRequest = z.infer<typeof PublishModelRequestSchema>;

// Search Models Query
export const SearchModelsQuerySchema = z.object({
  query: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived', 'running', 'completed', 'error']).optional(),
  tags: z.array(z.string()).optional(),
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  includeArchived: z.boolean().default(false),
  sortBy: z.enum(['name', 'created_at', 'updated_at', 'last_saved_at']).default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20)
});

export type SearchModelsQuery = z.infer<typeof SearchModelsQuerySchema>;

// Audit Log Query
export const AuditLogQuerySchema = z.object({
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(50)
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

// Audit Log DTO
export interface AuditLogDto {
  id: string;
  resourceId: string;
  resourceType: string;
  action: string;
  userId: string;
  userEmail?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Execute Workflow Request
export const ExecuteWorkflowRequestSchema = z.object({
  inputData: z.record(z.any()).optional(),
  executionContext: z.record(z.any()).optional(),
  dryRun: z.boolean().default(false),
  executionMode: z.enum(['sync', 'async']).default('async'),
  priority: z.enum(['low', 'normal', 'high']).default('normal')
});

export type ExecuteWorkflowRequest = z.infer<typeof ExecuteWorkflowRequestSchema>;

// Workflow Execution DTO
export interface WorkflowExecutionDto {
  executionId: string;
  modelId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  actualDuration?: number;
  estimatedDuration?: number;
  progress?: {
    totalSteps: number;
    completedSteps: number;
    currentStep: string | null;
    percentage: number;
  };
  results?: {
    success: boolean;
    outputData?: Record<string, any>;
    executionSummary?: Record<string, any>;
  };
  inputData?: Record<string, any>;
  executionContext?: Record<string, any>;
  metadata?: Record<string, any>;
  errorDetails?: Record<string, any>;
}

// Model Status Type
export type ModelStatus = 'draft' | 'published' | 'archived' | 'running' | 'completed' | 'error';

// Model Response DTO
export interface ModelDto {
  modelId: string;
  name: string;
  description?: string;
  version: string;
  status: ModelStatus;
  currentVersion: string;
  versionCount: number;
  metadata: Record<string, any>;
  permissions: {
    owner: string;
    editors: string[];
    viewers: string[];
  };
  createdAt: string;
  updatedAt: string;
  lastSavedAt: string;
  nodes?: NodeDto[];
  actionNodes?: ActionNodeDto[];
  statistics?: ModelStatisticsDto;
}

// Node Response DTO
export interface NodeDto {
  nodeId: string;
  nodeType: string;
  name: string;
  description?: string;
  position: { x: number; y: number };
  dependencies: string[];
  status: string;
  metadata: Record<string, any>;
  visualProperties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  typeSpecificData?: Record<string, any>;
}

// Action Node Response DTO
export interface ActionNodeDto {
  actionId: string;
  parentNodeId: string;
  actionType: string;
  name: string;
  description?: string;
  executionMode: string;
  executionOrder: number;
  status: string;
  priority: number;
  estimatedDuration?: number;
  retryPolicy: Record<string, any>;
  raci: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  actionSpecificData?: Record<string, any>;
}

// Model Statistics DTO
export interface ModelStatisticsDto {
  totalNodes: number;
  containerNodeCount: number;
  actionNodeCount: number;
  nodeTypeBreakdown: Record<string, number>;
  actionTypeBreakdown: Record<string, number>;
  averageComplexity: number;
  maxDependencyDepth: number;
  executionEstimate?: number;
}

// List Models Query Parameters
export const ListModelsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'created_at', 'updated_at', 'last_saved_at']).default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type ListModelsQuery = z.infer<typeof ListModelsQuerySchema>;

// Get Model Query Parameters
export const GetModelQuerySchema = z.object({
  includeNodes: z.coerce.boolean().default(false),
  includeActionNodes: z.coerce.boolean().default(false),
  includeStatistics: z.coerce.boolean().default(false)
});

export type GetModelQuery = z.infer<typeof GetModelQuerySchema>;

// Node Management DTOs
export const AddNodeRequestSchema = z.object({
  nodeType: z.enum(['ioNode', 'stageNode']),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  metadata: z.record(z.any()).optional(),
  typeSpecificData: z.record(z.any()).optional()
});

export type AddNodeRequest = z.infer<typeof AddNodeRequestSchema>;

export const UpdateNodeRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  dependencies: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.any()).optional(),
  typeSpecificData: z.record(z.any()).optional()
});

export type UpdateNodeRequest = z.infer<typeof UpdateNodeRequestSchema>;

// Action Node Management DTOs
export const AddActionRequestSchema = z.object({
  parentNodeId: z.string().uuid(),
  actionType: z.enum(['tetherNode', 'kbNode', 'functionModelContainer']),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  executionMode: z.enum(['sequential', 'parallel', 'conditional']).default('sequential'),
  priority: z.number().min(1).max(10).default(5),
  estimatedDuration: z.number().positive().optional(),
  metadata: z.record(z.any()).optional(),
  actionSpecificData: z.record(z.any()).optional()
});

export type AddActionRequest = z.infer<typeof AddActionRequestSchema>;

export const UpdateActionRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  executionMode: z.enum(['sequential', 'parallel', 'conditional']).optional(),
  priority: z.number().min(1).max(10).optional(),
  estimatedDuration: z.number().positive().optional(),
  metadata: z.record(z.any()).optional(),
  actionSpecificData: z.record(z.any()).optional()
});

export type UpdateActionRequest = z.infer<typeof UpdateActionRequestSchema>;

// Advanced Workflow Execution DTOs
export const AdvancedExecuteWorkflowRequestSchema = z.object({
  context: z.record(z.any()).optional(),
  options: z.object({
    dryRun: z.boolean().default(false),
    timeout: z.number().positive().optional(),
    maxRetries: z.number().min(0).max(10).default(3)
  }).optional()
});

export type AdvancedExecuteWorkflowRequest = z.infer<typeof AdvancedExecuteWorkflowRequestSchema>;

export interface ExecutionResultDto {
  executionId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  results: Record<string, any>;
  errors: Array<{
    nodeId: string;
    error: string;
    timestamp: string;
  }>;
}

/**
 * HTTP status codes for different scenarios
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;