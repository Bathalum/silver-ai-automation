/**
 * DTO Types for Server Action Responses
 * 
 * These types define the data transfer objects used by Server Actions
 * to communicate with the presentation layer, following Clean Architecture
 * principles by keeping the interface adapters separate from domain concerns.
 */

/**
 * Base action result type for all server actions
 */
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Model DTOs for presentation layer
 */
export interface ModelDto {
  modelId: string;
  name: string;
  description?: string;
  version: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastSavedAt: Date;
  permissions: {
    owner: string;
    editors: string[];
    viewers: string[];
    executors?: string[];
    publishers?: string[];
    archivers?: string[];
  };
  metadata?: Record<string, any>;
}

/**
 * Node DTOs for presentation layer
 */
export interface NodeDto {
  nodeId: string;
  name: string;
  nodeType: string;
  description?: string;
  position: { x: number; y: number };
  status: string;
  createdAt: Date;
  updatedAt: Date;
  dependencies: string[];
  metadata?: Record<string, any>;
}

/**
 * Container Node specific DTO
 */
export interface ContainerNodeDto extends NodeDto {
  nodeType: 'io_node' | 'stage_node';
  executionType: string;
  visualProperties: Record<string, any>;
  // IO Node specific data
  ioData?: {
    boundaryType: 'input' | 'output' | 'input-output';
    inputDataContract?: Record<string, any>;
    outputDataContract?: Record<string, any>;
    dataValidationRules: Record<string, any>;
  };
  // Stage Node specific data
  stageData?: {
    stageType: string;
    completionCriteria: Record<string, any>;
    stageGoals: string[];
    resourceRequirements: Record<string, any>;
  };
}

/**
 * Action Node DTO
 */
export interface ActionNodeDto {
  actionId: string;
  name: string;
  actionType: string;
  description?: string;
  executionMode: string;
  executionOrder: number;
  priority: number;
  status: string;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
    maxRetryDelay: number;
  };
  raci?: {
    responsible: string[];
    accountable: string;
    consulted: string[];
    informed: string[];
  };
  actionSpecificData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Execution DTOs for presentation layer
 */
export interface ExecutionDto {
  executionId: string;
  modelId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    currentNode?: string;
  };
  startedAt: Date;
  completedAt?: Date;
  executionTime: number;
  parameters: Record<string, any>;
  environment: 'development' | 'staging' | 'production';
  userId: string;
  errors: string[];
  warnings: string[];
  outputs?: Record<string, any>;
}

/**
 * Statistics DTO
 */
export interface ModelStatisticsDto {
  modelId: string;
  totalNodes: number;
  totalActionNodes: number;
  executionCount: number;
  lastExecutionAt?: Date;
  averageExecutionTime: number;
  successRate: number;
  complexityScore: number;
  performanceMetrics: {
    avgNodeExecutionTime: number;
    bottleneckNodes: string[];
    resourceUtilization: Record<string, number>;
  };
  usageMetrics: {
    dailyExecutions: number[];
    topUsers: Array<{
      userId: string;
      executionCount: number;
    }>;
  };
}

/**
 * Audit Log DTO
 */
export interface AuditLogDto {
  id: string;
  modelId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, {
    old: any;
    new: any;
  }>;
  timestamp: Date;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Validation Result DTO
 */
export interface ValidationResultDto {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validationLevel: 'structural' | 'business-rules' | 'execution-readiness' | 'context' | 'cross-feature' | 'full';
  validatedAt: Date;
  details?: Record<string, any>;
}

/**
 * Cross-Feature Link DTO
 */
export interface CrossFeatureLinkDto {
  linkId: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  linkType: 'depends_on' | 'triggers' | 'implements' | 'references';
  linkStrength: number;
  bidirectional: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission DTO
 */
export interface PermissionDto {
  modelId: string;
  userId: string;
  permissionType: 'owner' | 'editor' | 'viewer' | 'executor' | 'publisher' | 'archiver';
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  conditions?: Record<string, any>;
}

/**
 * Search Result DTO
 */
export interface SearchResultDto {
  models: ModelDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  facets: {
    status: Record<string, number>;
    owner: Record<string, number>;
    tags: Record<string, number>;
    createdDate: Record<string, number>;
  };
  searchQuery: string;
  searchTime: number;
}

/**
 * Pagination DTO
 */
export interface PaginationDto {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Error DTO for structured error responses
 */
export interface ErrorDto {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
  timestamp: Date;
  requestId?: string;
}

/**
 * Health Check DTO
 */
export interface HealthCheckDto {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: 'up' | 'down';
    cache: 'up' | 'down';
    eventBus: 'up' | 'down';
    aiService: 'up' | 'down';
  };
  metrics: {
    uptime: number;
    memoryUsage: number;
    responseTime: number;
  };
}

/**
 * File Upload DTO
 */
export interface FileUploadDto {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: string;
  url: string;
  metadata?: Record<string, any>;
}

/**
 * Export DTO
 */
export interface ExportDto {
  exportId: string;
  modelId: string;
  format: 'json' | 'yaml' | 'xml' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  createdAt: Date;
  createdBy: string;
}

/**
 * Import DTO
 */
export interface ImportDto {
  importId: string;
  fileName: string;
  format: 'json' | 'yaml' | 'xml';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultModelId?: string;
  errors: string[];
  warnings: string[];
  createdAt: Date;
  createdBy: string;
}

/**
 * Template DTO
 */
export interface TemplateDto {
  templateId: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  modelStructure: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  usageCount: number;
}