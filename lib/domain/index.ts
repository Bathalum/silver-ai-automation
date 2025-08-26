// Value Objects
export { Result } from './shared/result';
export { ModelName } from './value-objects/model-name';
export { Version } from './value-objects/version';
export { NodeId } from './value-objects/node-id';
export { Position } from './value-objects/position';
export { RetryPolicy, type BackoffStrategy } from './value-objects/retry-policy';
export { RACI } from './value-objects/raci';
export { ExecutionContext, type Environment } from './value-objects/execution-context';

// Enums
export {
  FeatureType,
  ContainerNodeType,
  ActionNodeType,
  ExecutionMode,
  ActionStatus,
  NodeStatus,
  ModelStatus,
  LinkType,
  RACIRole
} from './enums';

// Entities
export { Node, type NodeProps } from './entities/node';
export { IONode, type IONodeProps, type IONodeData } from './entities/io-node';
export { StageNode, type StageNodeProps, type StageNodeData } from './entities/stage-node';
export { ActionNode, type ActionNodeProps } from './entities/action-node';
export { TetherNode, type TetherNodeProps, type TetherNodeData } from './entities/tether-node';
export { KBNode, type KBNodeProps, type KBNodeData } from './entities/kb-node';
export { 
  FunctionModelContainerNode, 
  type FunctionModelContainerProps, 
  type FunctionModelContainerData 
} from './entities/function-model-container-node';
export { 
  FunctionModel, 
  type FunctionModelProps, 
  type ValidationResult, 
  type ExecutionResult 
} from './entities/function-model';
export { FunctionModelVersion, type FunctionModelVersionProps } from './entities/function-model-version';
export { AuditLog, type AuditLogProps } from './entities/audit-log';
export { NodeLink, type NodeLinkProps } from './entities/node-link';
export { CrossFeatureLink, type CrossFeatureLinkProps } from './entities/cross-feature-link';
export { AIAgent, type AIAgentProps, type AIAgentCapabilities, type AIAgentTools } from './entities/ai-agent';
export { NodeMetadata, type NodeMetadataProps } from './entities/node-metadata';

// Business Rules
export { WorkflowValidationRules } from './rules/workflow-validation';
export { NodeBusinessRules } from './rules/node-rules';
export { 
  ExecutionRules, 
  type ExecutionError, 
  type ExecutionPrecondition 
} from './rules/execution-rules';

// Domain Services
export { 
  WorkflowOrchestrationService,
  type IWorkflowOrchestrationService,
  type ExecutionContext as ServiceExecutionContext,
  type ExecutionStatus,
  type NodeExecutionResult
} from './services/workflow-orchestration-service';
export { 
  NodeDependencyService,
  type DependencyGraph,
  type ExecutionPath
} from './services/node-dependency-service';
export {
  ModelVersioningService,
  type IModelVersioningService,
  type ModelChanges,
  type VersionComparison
} from './services/model-versioning-service';
export { 
  FunctionModelVersioningService,
  type VersionCreationResult,
  type VersionTransition,
  type CompleteVersionData
} from './services/function-model-versioning-service';
export { 
  ActionNodeExecutionService,
  type ExecutionMetrics,
  type ExecutionSnapshot 
} from './services/action-node-execution-service';
export { NodeContextAccessService } from './services/node-context-access-service';
export { ActionNodeOrchestrationService } from './services/action-node-orchestration-service';
export { FractalOrchestrationService } from './services/fractal-orchestration-service';
export { CrossFeatureLinkingService } from './services/cross-feature-linking-service';
export { AIAgentOrchestrationService } from './services/ai-agent-orchestration-service';

// Repository Interfaces
export type {
  FunctionModelRepository,
  NodeRepository,
  NodeLinkRepository,
  AIAgentRepository,
  AuditLogRepository
} from './interfaces';

// Domain Events
export { DomainEvent } from './events/domain-event';
export { 
  ModelCreated,
  ModelUpdated,
  ModelPublished,
  ModelArchived,
  ModelDeleted,
  VersionCreated,
  FunctionModelVersionCreated,
  ActionNodeExecutionOrderChanged,
  ActionNodeExecutionModeChanged,
  ActionNodePriorityChanged,
  ActionNodeRetryPolicyUpdated,
  ContainerNodeOrchestrationStarted,
  ContainerNodeOrchestrationCompleted,
  FractalOrchestrationLevelChanged,
  AIAgentConfigurationUpdated,
  AIAgentTaskStarted,
  AIAgentTaskCompleted,
  AIAgentTaskFailed
} from './events/model-events';
export {
  ExecutionStarted,
  NodeExecuted,
  ExecutionPaused,
  ExecutionResumed,
  ExecutionCompleted,
  ExecutionFailed
} from './events/execution-events';