// Commands
export { 
  type CreateModelCommand,
  type UpdateModelCommand,
  type PublishModelCommand,
  type ArchiveModelCommand,
  type DeleteModelCommand,
  type DuplicateModelCommand,
  type CreateVersionCommand,
  type ValidateWorkflowCommand
} from './commands/model-commands';

export {
  type CreateNodeCommand,
  type AddActionNodeCommand,
  type UpdateNodeCommand,
  type UpdateActionNodeCommand,
  type DeleteNodeCommand,
  type DeleteActionNodeCommand,
  type MoveNodeCommand,
  type AddNodeDependencyCommand,
  type RemoveNodeDependencyCommand
} from './commands/node-commands';

export {
  type ExecuteWorkflowCommand,
  type PauseExecutionCommand,
  type ResumeExecutionCommand,
  type StopExecutionCommand,
  type RetryFailedNodesCommand
} from './commands/execution-commands';

export {
  type CreateCrossFeatureLinkCommand,
  type CalculateLinkStrengthCommand,
  type DetectRelationshipCyclesCommand,
  type UpdateLinkStrengthCommand,
  type RemoveCrossFeatureLinkCommand
} from './commands/link-commands';

// Queries
export {
  type GetFunctionModelQuery,
  type ListFunctionModelsQuery,
  type GetModelVersionsQuery,
  type GetModelStatisticsQuery,
  type SearchModelsQuery,
  type GetModelPermissionsQuery,
  type GetModelAuditLogQuery
} from './queries/model-queries';

// Use Cases
export { 
  CreateFunctionModelUseCase,
  type IFunctionModelRepository,
  type IEventBus,
  type DomainEvent,
  type ModelFilter,
  type CreateModelResult
} from './function-model/create-function-model-use-case';

export {
  UpdateFunctionModelUseCase,
  type UpdateModelResult
} from './function-model/update-function-model-use-case';

export {
  PublishFunctionModelUseCase,
  type PublishModelResult
} from './function-model/publish-function-model-use-case';

export {
  ValidateWorkflowStructureUseCase,
  type WorkflowValidationResult,
  type IWorkflowValidationService,
  type IBusinessRuleValidationService,
  type IExecutionReadinessService,
  type IContextValidationService,
  type ICrossFeatureValidationService
} from './function-model/validate-workflow-structure-use-case';

export {
  CreateModelVersionUseCase,
  type CreateModelVersionRequest,
  type CreateModelVersionResponse
} from './function-model/create-model-version-use-case';

export {
  ManageHierarchicalContextAccessUseCase,
  type RegisterNodeRequest,
  type RegisterNodeResponse,
  type ValidateContextAccessRequest,
  type ContextAccessValidationResult,
  type GetAccessibleContextsRequest,
  type HierarchicalContextAccessResult,
  type UpdateContextRequest,
  type UpdateContextResponse
} from './function-model/manage-hierarchical-context-access-use-case';

export {
  ManageFractalOrchestrationUseCase,
  type ManageFractalOrchestrationCommand
} from './function-model/manage-fractal-orchestration-use-case';

export {
  ManageErrorHandlingAndRecoveryUseCase,
  type ErrorHandlingRequest,
  type ErrorHandlingResult
} from './function-model/manage-error-handling-and-recovery-use-case';

// Cross-Feature Integration Use Cases
export {
  CreateCrossFeatureLinkUseCase,
  type ICrossFeatureLinkRepository as ICreateLinkRepository,
  type IDomainEventPublisher as ICreateLinkEventPublisher
} from './cross-feature/create-cross-feature-link-use-case';

export {
  CalculateLinkStrengthUseCase,
  type ICrossFeatureLinkRepository as ICalculateLinkRepository,
  type ILinkAnalyticsService,
  type IDomainEventPublisher as ICalculateLinkEventPublisher,
  type LinkStrengthUpdated
} from './cross-feature/calculate-link-strength-use-case';

export {
  DetectRelationshipCyclesUseCase,
  type ICrossFeatureLinkRepository as IDetectCyclesRepository,
  type IDomainEventPublisher as IDetectCyclesEventPublisher,
  type CycleDetectionResult,
  type CyclesDetected
} from './cross-feature/detect-relationship-cycles-use-case';

// Query Handlers
export {
  GetFunctionModelQueryHandler,
  type FunctionModelQueryResult,
  type NodeQueryResult,
  type ActionNodeQueryResult,
  type ModelStatistics
} from './queries/get-function-model-query';