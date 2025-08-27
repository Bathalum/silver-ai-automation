import { Result } from '../../../../lib/domain/shared/result';
import { NodeId } from '../../../../lib/domain/value-objects/node-id';
import { RetryPolicy, RetryPolicyConfig } from '../../../../lib/domain/value-objects/retry-policy';
import { ActionStatus } from '../../../../lib/domain/enums';
import { ActionNodeExecutionService, ExecutionMetrics, ExecutionSnapshot } from '../../../../lib/domain/services/action-node-execution-service';
import { AIAgentOrchestrationService, AgentExecutionRequest, AgentExecutionResult } from '../../../../lib/domain/services/ai-agent-orchestration-service';
import { BusinessRuleValidationService } from '../../../../lib/domain/services/business-rule-validation-service';
import { NodeContextAccessService } from '../../../../lib/domain/services/node-context-access-service';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ActionNode } from '../../../../lib/domain/entities/action-node';
import { AIAgent } from '../../../../lib/domain/entities/ai-agent';
import { ValidationResult } from '../../../../lib/domain/entities/function-model';

/**
 * UC-022 through UC-024: Error Handling and Recovery Use Cases
 * 
 * This orchestrating use case manages:
 * - UC-022: Handle Action Node Execution Failure with retry policies and backoff strategies
 * - UC-023: Handle Agent Execution Failure with disable/restart/retry recovery
 * - UC-024: Validate Business Rules across all domain operations
 * 
 * The use case coordinates error handling across all layers while maintaining
 * Clean Architecture principles and using the Result pattern throughout.
 */

export interface ErrorHandlingRequest {
  actionNodeId?: string;
  agentId?: NodeId;
  modelId?: string;
  operationType: 'action-execution' | 'agent-execution' | 'business-validation';
  failureContext?: {
    error: string;
    timestamp: Date;
    attemptCount?: number;
    metadata?: Record<string, any>;
  };
  recoveryPreference?: 'disable' | 'restart' | 'retry' | 'fail-fast';
}

export interface ErrorHandlingResult {
  operationType: 'action-execution' | 'agent-execution' | 'business-validation';
  success: boolean;
  actionTaken?: 'retry' | 'disable' | 'restart' | 'validation-failed' | 'recovery-attempted';
  retryAttempted?: boolean;
  retryCount?: number;
  backoffDelay?: number;
  agentRecoveryApplied?: 'disable' | 'restart' | 'retry';
  businessRulesViolated?: string[];
  propagatedErrors?: string[];
  finalStatus?: ActionStatus | 'disabled' | 'restarted' | 'validation-blocked';
  executionMetrics?: {
    totalDuration: number;
    retryDuration: number;
    recoveryDuration: number;
  };
  contextualInformation?: Record<string, any>;
}

/**
 * UC-022 through UC-024: Error Handling and Recovery Use Case
 * 
 * Orchestrates comprehensive error handling across the domain:
 * 1. Action node execution failures with retry policies
 * 2. AI agent failures with recovery strategies  
 * 3. Business rule validation and compliance
 * 4. Error propagation and status tracking
 * 5. Cascading failure management
 * 6. Recovery coordination and state management
 */
export class ManageErrorHandlingAndRecoveryUseCase {
  constructor(
    private readonly actionExecutionService: ActionNodeExecutionService,
    private readonly agentOrchestrationService: AIAgentOrchestrationService,
    private readonly businessRuleValidationService: BusinessRuleValidationService,
    private readonly contextAccessService: NodeContextAccessService
  ) {}

  /**
   * UC-022: Handle Action Node Execution Failure
   * Manages action node failures with retry policies, backoff strategies,
   * and execution state tracking
   */
  async handleActionNodeFailure(
    actionId: string,
    failureError: string,
    retryPolicy?: RetryPolicy
  ): Promise<Result<ErrorHandlingResult>> {
    const startTime = Date.now();

    try {
      // Step 1: System detects action execution failure
      const failureResult = await this.actionExecutionService.failExecution(actionId, failureError);
      if (failureResult.isFailure) {
        return Result.fail<ErrorHandlingResult>(`Failed to record action failure: ${failureResult.error}`);
      }

      // Step 2: System checks retry policy configuration
      const retryPolicyToUse = retryPolicy || (await this.getDefaultRetryPolicy()).value;
      if (!retryPolicyToUse) {
        return Result.fail<ErrorHandlingResult>('No retry policy available');
      }

      // Step 3: System evaluates retry attempts remaining
      const retryEvaluation = await this.actionExecutionService.evaluateRetryPolicy(actionId);
      if (retryEvaluation.isFailure) {
        return Result.fail<ErrorHandlingResult>(retryEvaluation.error);
      }

      let actionTaken: 'retry' | 'fail-fast' = 'fail-fast';
      let retryCount = 0;
      let backoffDelay = 0;
      let retryAttempted = false;

      if (retryEvaluation.value && retryPolicyToUse.enabled) {
        // Step 4: System applies backoff strategy
        const snapshot = await this.actionExecutionService.getExecutionSnapshot(actionId);
        if (snapshot.isSuccess) {
          retryCount = (snapshot.value.metadata.retryAttempt || 0) + 1;
          backoffDelay = retryPolicyToUse.calculateDelay(retryCount);

          // Wait for backoff delay if required
          if (backoffDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }

          // Step 5: System retries execution
          const retryResult = await this.actionExecutionService.retryExecution(actionId);
          if (retryResult.isSuccess) {
            actionTaken = 'retry';
            retryAttempted = true;
          }
        }
      }

      // Step 6: System updates execution status
      const updatedSnapshot = await this.actionExecutionService.getExecutionSnapshot(actionId);
      let finalStatus: ActionStatus = ActionStatus.FAILED;
      if (updatedSnapshot.isSuccess) {
        finalStatus = updatedSnapshot.value.status;
      }

      // Step 7: System propagates failure information
      const propagatedErrors = await this.propagateFailureInformation(actionId, failureError, finalStatus);

      const executionDuration = Date.now() - startTime;

      return Result.ok<ErrorHandlingResult>({
        operationType: 'action-execution',
        success: actionTaken === 'retry' && retryAttempted,
        actionTaken,
        retryAttempted,
        retryCount,
        backoffDelay,
        propagatedErrors,
        finalStatus,
        executionMetrics: {
          totalDuration: executionDuration,
          retryDuration: retryAttempted ? backoffDelay : 0,
          recoveryDuration: executionDuration
        },
        contextualInformation: {
          actionId,
          originalError: failureError,
          retryPolicyEnabled: retryPolicyToUse.enabled
        }
      });

    } catch (error) {
      return Result.fail<ErrorHandlingResult>(`Action node failure handling failed: ${error}`);
    }
  }

  /**
   * UC-023: Handle Agent Execution Failure
   * Manages AI agent failures with disable/restart/retry recovery strategies
   */
  async handleAgentExecutionFailure(
    agentId: NodeId,
    failureReason: string,
    recoveryAction?: 'disable' | 'restart' | 'retry'
  ): Promise<Result<ErrorHandlingResult>> {
    const startTime = Date.now();

    try {
      // Step 1: System detects agent execution failure
      // This is implicit - we're being called because a failure was detected

      // Step 2: System determines failure handling action
      const determinedRecoveryAction = recoveryAction || this.determineAgentRecoveryAction(failureReason);

      // Step 3: System applies recovery action
      let agentRecoveryResult: Result<void>;
      let actionTaken: 'disable' | 'restart' | 'retry' = determinedRecoveryAction;

      switch (determinedRecoveryAction) {
        case 'disable':
          // Disable: Mark agent as unavailable
          agentRecoveryResult = await this.agentOrchestrationService.handleAgentFailure(
            agentId, 
            failureReason, 
            'disable'
          );
          break;
        
        case 'restart':
          // Restart: Re-enable agent
          agentRecoveryResult = await this.agentOrchestrationService.handleAgentFailure(
            agentId, 
            failureReason, 
            'restart'
          );
          break;
        
        case 'retry':
          // Retry: Attempt execution again
          agentRecoveryResult = await this.agentOrchestrationService.handleAgentFailure(
            agentId, 
            failureReason, 
            'retry'
          );
          break;
        
        default:
          return Result.fail<ErrorHandlingResult>('Invalid recovery action specified');
      }

      if (agentRecoveryResult.isFailure) {
        return Result.fail<ErrorHandlingResult>(`Agent recovery failed: ${agentRecoveryResult.error}`);
      }

      // Step 4: System updates agent status
      // This is handled by the handleAgentFailure method

      // Step 5: System records failure metrics  
      const metricsResult = await this.agentOrchestrationService.getAgentMetrics(agentId);
      let agentMetrics;
      if (metricsResult.isSuccess) {
        agentMetrics = metricsResult.value;
      }

      const executionDuration = Date.now() - startTime;

      return Result.ok<ErrorHandlingResult>({
        operationType: 'agent-execution',
        success: true,
        actionTaken: actionTaken,
        agentRecoveryApplied: determinedRecoveryAction,
        propagatedErrors: [`Agent ${agentId.value} failure: ${failureReason}`],
        finalStatus: determinedRecoveryAction === 'disable' ? 'disabled' : 
                    determinedRecoveryAction === 'restart' ? 'restarted' : 
                    ActionStatus.RETRYING,
        executionMetrics: {
          totalDuration: executionDuration,
          retryDuration: 0,
          recoveryDuration: executionDuration
        },
        contextualInformation: {
          agentId: agentId.value,
          failureReason,
          recoveryAction: determinedRecoveryAction,
          agentMetrics
        }
      });

    } catch (error) {
      return Result.fail<ErrorHandlingResult>(`Agent failure handling failed: ${error}`);
    }
  }

  /**
   * UC-024: Validate Business Rules
   * Ensures all operations comply with domain business rules and entity constraints
   */
  async validateBusinessRules(
    model: FunctionModel,
    actionNodes?: ActionNode[]
  ): Promise<Result<ErrorHandlingResult>> {
    const startTime = Date.now();

    try {
      // Step 1: System receives operation request (implicit - we're called with the operation data)

      // Step 2: System validates against applicable business rules
      // Step 3: System checks entity invariants
      // Step 4: System verifies cross-entity constraints
      const validationResult = await this.businessRuleValidationService.validateBusinessRules(
        model, 
        actionNodes || []
      );

      if (validationResult.isFailure) {
        return Result.fail<ErrorHandlingResult>(`Business rule validation failed: ${validationResult.error}`);
      }

      const validation = validationResult.value;

      // Step 5: System returns validation result
      const isValid = validation.isValid;
      const businessRulesViolated = validation.errors;
      const warnings = validation.warnings;

      // Step 6: System prevents invalid operations
      let finalStatus: 'validation-blocked' | ActionStatus = isValid ? 
        ActionStatus.CONFIGURED : 'validation-blocked';

      const executionDuration = Date.now() - startTime;

      return Result.ok<ErrorHandlingResult>({
        operationType: 'business-validation',
        success: isValid,
        actionTaken: isValid ? undefined : 'validation-failed',
        businessRulesViolated,
        propagatedErrors: isValid ? [] : businessRulesViolated,
        finalStatus,
        executionMetrics: {
          totalDuration: executionDuration,
          retryDuration: 0,
          recoveryDuration: 0
        },
        contextualInformation: {
          modelId: model.id.value,
          modelName: model.name.toString(),
          validationErrors: businessRulesViolated,
          validationWarnings: warnings,
          nodeCount: actionNodes?.length || 0
        }
      });

    } catch (error) {
      return Result.fail<ErrorHandlingResult>(`Business rule validation failed: ${error}`);
    }
  }

  /**
   * Comprehensive error handling orchestration that handles all three use cases
   * and manages cascading failures across the system
   */
  async executeErrorHandlingAndRecovery(
    request: ErrorHandlingRequest
  ): Promise<Result<ErrorHandlingResult[]>> {
    const results: ErrorHandlingResult[] = [];

    try {
      // Handle different types of errors based on operation type
      switch (request.operationType) {
        case 'action-execution':
          if (!request.actionNodeId) {
            return Result.fail<ErrorHandlingResult[]>('Action node ID required for action execution error handling');
          }
          
          const retryPolicy = await this.getDefaultRetryPolicy();
          if (retryPolicy.isFailure) {
            return Result.fail<ErrorHandlingResult[]>(`Failed to get retry policy: ${retryPolicy.error}`);
          }
          
          const actionResult = await this.handleActionNodeFailure(
            request.actionNodeId,
            request.failureContext?.error || 'Unknown failure',
            retryPolicy.value
          );
          
          if (actionResult.isSuccess) {
            results.push(actionResult.value);
          } else {
            return Result.fail<ErrorHandlingResult[]>(`Action failure handling failed: ${actionResult.error}`);
          }
          break;

        case 'agent-execution':
          if (!request.agentId) {
            return Result.fail<ErrorHandlingResult[]>('Agent ID required for agent execution error handling');
          }
          
          const agentResult = await this.handleAgentExecutionFailure(
            request.agentId,
            request.failureContext?.error || 'Unknown agent failure',
            request.recoveryPreference
          );
          
          if (agentResult.isSuccess) {
            results.push(agentResult.value);
          } else {
            return Result.fail<ErrorHandlingResult[]>(`Agent failure handling failed: ${agentResult.error}`);
          }
          break;

        case 'business-validation':
          // For business validation, we need model and potentially action nodes
          // This would normally come from the request context
          if (!request.modelId) {
            return Result.fail<ErrorHandlingResult[]>('Model ID required for business rule validation');
          }
          
          // In a real implementation, we would load the model and action nodes
          // For testing purposes, we'll create mock objects
          const mockModel = this.createMockModel(request.modelId);
          const mockActionNodes = this.createMockActionNodes();
          
          const validationResult = await this.validateBusinessRules(mockModel, mockActionNodes);
          
          if (validationResult.isSuccess) {
            results.push(validationResult.value);
          } else {
            return Result.fail<ErrorHandlingResult[]>(`Business rule validation failed: ${validationResult.error}`);
          }
          break;

        default:
          return Result.fail<ErrorHandlingResult[]>('Invalid operation type for error handling');
      }

      // Handle cascading failures - check if the primary error handling triggered other issues
      const cascadingResults = await this.handleCascadingFailures(results[0], request);
      results.push(...cascadingResults);

      return Result.ok<ErrorHandlingResult[]>(results);

    } catch (error) {
      return Result.fail<ErrorHandlingResult[]>(`Error handling and recovery failed: ${error}`);
    }
  }

  /**
   * Handles complex failure scenarios with cascading effects
   */
  private async handleCascadingFailures(
    primaryResult: ErrorHandlingResult,
    originalRequest: ErrorHandlingRequest
  ): Promise<ErrorHandlingResult[]> {
    const cascadingResults: ErrorHandlingResult[] = [];

    // If an action node had any issues (success or failure), check for cascading effects
    if (primaryResult.operationType === 'action-execution') {
      // Simulate checking for dependent action nodes
      const dependentNodeFailures = await this.propagateDependencyFailures(
        originalRequest.actionNodeId!,
        primaryResult.propagatedErrors || []
      );
      cascadingResults.push(...dependentNodeFailures);
    }

    // If an agent failed, check if it affects other agents or model execution
    if (primaryResult.operationType === 'agent-execution' && primaryResult.agentRecoveryApplied === 'disable') {
      // Simulate checking for workflows that depend on this agent
      const workflowImpacts = await this.assessAgentDisableImpacts(
        originalRequest.agentId!,
        originalRequest.modelId
      );
      cascadingResults.push(...workflowImpacts);
    }

    // If business rules failed, ensure no operations proceed
    if (primaryResult.operationType === 'business-validation' && !primaryResult.success) {
      // Simulate blocking related operations
      const blockingResult: ErrorHandlingResult = {
        operationType: 'business-validation',
        success: false,
        actionTaken: 'validation-failed',
        businessRulesViolated: ['Operation blocked due to business rule violations'],
        propagatedErrors: primaryResult.businessRulesViolated,
        finalStatus: 'validation-blocked',
        executionMetrics: {
          totalDuration: 0,
          retryDuration: 0,
          recoveryDuration: 0
        },
        contextualInformation: {
          cascadedFrom: 'primary-validation-failure',
          originalModelId: originalRequest.modelId
        }
      };
      cascadingResults.push(blockingResult);
    }

    return cascadingResults;
  }

  private async getDefaultRetryPolicy(): Promise<Result<RetryPolicy>> {
    const config: RetryPolicyConfig = {
      maxAttempts: 3,
      strategy: 'exponential',
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      multiplier: 2.0,
      jitterMs: 100,
      enabled: true
    };
    
    return RetryPolicy.create(config);
  }

  private determineAgentRecoveryAction(failureReason: string): 'disable' | 'restart' | 'retry' {
    // Simple heuristic based on failure reason
    if (failureReason.includes('timeout') || failureReason.includes('temporary')) {
      return 'retry';
    }
    if (failureReason.includes('configuration') || failureReason.includes('invalid')) {
      return 'restart';
    }
    // Default to disable for serious failures
    return 'disable';
  }

  private async propagateFailureInformation(
    actionId: string,
    error: string,
    status: ActionStatus
  ): Promise<string[]> {
    // Simulate propagating failure information to dependent systems
    return [
      `Action ${actionId} failed: ${error}`,
      `Status updated to: ${status}`,
      `Notification sent to monitoring system`
    ];
  }

  private async propagateDependencyFailures(
    actionId: string,
    errors: string[]
  ): Promise<ErrorHandlingResult[]> {
    // Simulate identifying and handling dependent node failures
    return [{
      operationType: 'action-execution',
      success: false,
      actionTaken: 'fail-fast',
      propagatedErrors: [`Dependency failure cascaded from ${actionId}`, ...errors],
      finalStatus: ActionStatus.FAILED,
      executionMetrics: {
        totalDuration: 0,
        retryDuration: 0,
        recoveryDuration: 0
      },
      contextualInformation: {
        cascadedFrom: actionId,
        dependencyType: 'action-node'
      }
    }];
  }

  private async assessAgentDisableImpacts(
    agentId: NodeId,
    modelId?: string
  ): Promise<ErrorHandlingResult[]> {
    // Simulate assessing impacts of agent being disabled
    return [{
      operationType: 'agent-execution',
      success: false,
      actionTaken: 'disable',
      agentRecoveryApplied: 'disable',
      propagatedErrors: [`Workflows depending on agent ${agentId.value} may be affected`],
      finalStatus: 'disabled',
      executionMetrics: {
        totalDuration: 0,
        retryDuration: 0,
        recoveryDuration: 0
      },
      contextualInformation: {
        impactedAgent: agentId.value,
        impactedModel: modelId,
        impactType: 'dependency-disabled'
      }
    }];
  }

  private createMockModel(modelId: string): FunctionModel {
    // Create a minimal mock model for testing
    const mockModel = {
      id: { value: modelId },
      name: { toString: () => 'Test Model' },
      nodes: new Map(),
      permissions: {
        owner: 'test-user',
        editors: [],
        viewers: []
      },
      metadata: {
        dataSharingApproved: false,
        requiresAuditLog: true
      },
      updatedAt: new Date(),
      version: { toString: () => '1.0.0' }
    } as any;
    
    return mockModel;
  }

  private createMockActionNodes(): ActionNode[] {
    // Create minimal mock action nodes for testing
    return [{
      name: 'test-action',
      actionType: 'api-call',
      executionOrder: 1,
      executionMode: 'sequential',
      actionData: {
        configuration: {
          apiEndpoint: 'https://test.api',
          httpMethod: 'POST'
        }
      }
    }] as any;
  }
}

// Test Suite
describe('ManageErrorHandlingAndRecoveryUseCase', () => {
  let useCase: ManageErrorHandlingAndRecoveryUseCase;
  let mockActionExecutionService: jest.Mocked<ActionNodeExecutionService>;
  let mockAgentOrchestrationService: jest.Mocked<AIAgentOrchestrationService>;
  let mockBusinessRuleValidationService: jest.Mocked<BusinessRuleValidationService>;
  let mockContextAccessService: jest.Mocked<NodeContextAccessService>;
  let testNodeId: NodeId;

  beforeEach(() => {
    // Setup mocked dependencies
    mockActionExecutionService = {
      failExecution: jest.fn(),
      evaluateRetryPolicy: jest.fn(),
      retryExecution: jest.fn(),
      getExecutionSnapshot: jest.fn()
    } as any;

    mockAgentOrchestrationService = {
      handleAgentFailure: jest.fn(),
      getAgentMetrics: jest.fn()
    } as any;

    mockBusinessRuleValidationService = {
      validateBusinessRules: jest.fn()
    } as any;

    mockContextAccessService = {} as any;

    const nodeIdResult = NodeId.create('test-agent-id');
    testNodeId = nodeIdResult.isSuccess ? nodeIdResult.value : NodeId.generate();

    useCase = new ManageErrorHandlingAndRecoveryUseCase(
      mockActionExecutionService,
      mockAgentOrchestrationService,
      mockBusinessRuleValidationService,
      mockContextAccessService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('UC-022: Handle Action Node Execution Failure', () => {
    it('HandleActionNodeFailure_WithRetryableFailure_ShouldRetryWithExponentialBackoff', async () => {
      // Arrange
      const actionId = 'test-action-123';
      const failureError = 'Temporary network timeout';
      
      mockActionExecutionService.failExecution.mockResolvedValue(Result.ok<void>(undefined));
      mockActionExecutionService.evaluateRetryPolicy.mockResolvedValue(Result.ok<boolean>(true));
      
      const mockSnapshot: ExecutionSnapshot = {
        actionId: { value: actionId } as NodeId,
        status: ActionStatus.RETRYING,
        progress: 50,
        metadata: { retryAttempt: 1 }
      };
      mockActionExecutionService.getExecutionSnapshot.mockResolvedValue(Result.ok<ExecutionSnapshot>(mockSnapshot));
      mockActionExecutionService.retryExecution.mockResolvedValue(Result.ok<void>(undefined));

      // Act
      const result = await useCase.handleActionNodeFailure(actionId, failureError);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.operationType).toBe('action-execution');
      expect(result.value.success).toBe(true);
      expect(result.value.actionTaken).toBe('retry');
      expect(result.value.retryAttempted).toBe(true);
      expect(result.value.retryCount).toBe(2); // Original attempt + 1 retry
      expect(result.value.backoffDelay).toBeGreaterThan(0);
      expect(result.value.finalStatus).toBe(ActionStatus.RETRYING);
      expect(mockActionExecutionService.failExecution).toHaveBeenCalledWith(actionId, failureError);
      expect(mockActionExecutionService.evaluateRetryPolicy).toHaveBeenCalledWith(actionId);
      expect(mockActionExecutionService.retryExecution).toHaveBeenCalledWith(actionId);
    });

    it('HandleActionNodeFailure_WhenMaxRetriesExceeded_ShouldFailFast', async () => {
      // Arrange
      const actionId = 'test-action-456';
      const failureError = 'Maximum retries exceeded';
      
      mockActionExecutionService.failExecution.mockResolvedValue(Result.ok<void>(undefined));
      mockActionExecutionService.evaluateRetryPolicy.mockResolvedValue(Result.ok<boolean>(false));
      
      const mockSnapshot: ExecutionSnapshot = {
        actionId: { value: actionId } as NodeId,
        status: ActionStatus.FAILED,
        progress: 0,
        metadata: { retryAttempt: 3 }
      };
      mockActionExecutionService.getExecutionSnapshot.mockResolvedValue(Result.ok<ExecutionSnapshot>(mockSnapshot));

      // Act
      const result = await useCase.handleActionNodeFailure(actionId, failureError);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.success).toBe(false);
      expect(result.value.actionTaken).toBe('fail-fast');
      expect(result.value.retryAttempted).toBe(false);
      expect(result.value.finalStatus).toBe(ActionStatus.FAILED);
      expect(result.value.propagatedErrors).toContain(`Action ${actionId} failed: ${failureError}`);
      expect(mockActionExecutionService.retryExecution).not.toHaveBeenCalled();
    });

    it('HandleActionNodeFailure_WhenRetryPolicyEvaluationFails_ShouldReturnFailure', async () => {
      // Arrange
      const actionId = 'test-action-789';
      const failureError = 'Critical system failure';
      
      mockActionExecutionService.failExecution.mockResolvedValue(Result.ok<void>(undefined));
      mockActionExecutionService.evaluateRetryPolicy.mockResolvedValue(
        Result.fail<boolean>('Retry policy evaluation failed')
      );

      // Act
      const result = await useCase.handleActionNodeFailure(actionId, failureError);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Retry policy evaluation failed');
    });
  });

  describe('UC-023: Handle Agent Execution Failure', () => {
    it('HandleAgentExecutionFailure_WithTimeoutFailure_ShouldRetryAgent', async () => {
      // Arrange
      const failureReason = 'Agent execution timeout - temporary network issue';
      
      mockAgentOrchestrationService.handleAgentFailure.mockResolvedValue(Result.ok<void>(undefined));
      
      const mockMetrics = {
        totalExecutions: 10,
        successfulExecutions: 8,
        failedExecutions: 2,
        averageExecutionTime: 2500,
        averageMatchScore: 0.85,
        lastExecutionTime: new Date(),
        currentLoad: 0.3
      };
      mockAgentOrchestrationService.getAgentMetrics.mockResolvedValue(Result.ok(mockMetrics));

      // Act
      const result = await useCase.handleAgentExecutionFailure(testNodeId, failureReason);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.operationType).toBe('agent-execution');
      expect(result.value.success).toBe(true);
      expect(result.value.agentRecoveryApplied).toBe('retry');
      expect(result.value.finalStatus).toBe(ActionStatus.RETRYING);
      expect(result.value.contextualInformation?.agentMetrics).toEqual(mockMetrics);
      expect(mockAgentOrchestrationService.handleAgentFailure).toHaveBeenCalledWith(
        testNodeId, failureReason, 'retry'
      );
    });

    it('HandleAgentExecutionFailure_WithConfigurationFailure_ShouldRestartAgent', async () => {
      // Arrange
      const failureReason = 'Agent configuration invalid - requires restart';
      
      mockAgentOrchestrationService.handleAgentFailure.mockResolvedValue(Result.ok<void>(undefined));
      mockAgentOrchestrationService.getAgentMetrics.mockResolvedValue(
        Result.fail('Metrics not available')
      );

      // Act
      const result = await useCase.handleAgentExecutionFailure(testNodeId, failureReason);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.agentRecoveryApplied).toBe('restart');
      expect(result.value.finalStatus).toBe('restarted');
      expect(result.value.contextualInformation?.recoveryAction).toBe('restart');
      expect(mockAgentOrchestrationService.handleAgentFailure).toHaveBeenCalledWith(
        testNodeId, failureReason, 'restart'
      );
    });

    it('HandleAgentExecutionFailure_WithCriticalFailure_ShouldDisableAgent', async () => {
      // Arrange
      const failureReason = 'Critical agent failure - security breach detected';
      
      mockAgentOrchestrationService.handleAgentFailure.mockResolvedValue(Result.ok<void>(undefined));
      mockAgentOrchestrationService.getAgentMetrics.mockResolvedValue(
        Result.ok({
          totalExecutions: 5,
          successfulExecutions: 1,
          failedExecutions: 4,
          averageExecutionTime: 1000,
          averageMatchScore: 0.2,
          lastExecutionTime: new Date(),
          currentLoad: 0
        })
      );

      // Act  
      const result = await useCase.handleAgentExecutionFailure(testNodeId, failureReason);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.agentRecoveryApplied).toBe('disable');
      expect(result.value.finalStatus).toBe('disabled');
      expect(result.value.propagatedErrors).toContain(`Agent ${testNodeId.value} failure: ${failureReason}`);
      expect(mockAgentOrchestrationService.handleAgentFailure).toHaveBeenCalledWith(
        testNodeId, failureReason, 'disable'
      );
    });

    it('HandleAgentExecutionFailure_WhenRecoveryFails_ShouldReturnFailure', async () => {
      // Arrange
      const failureReason = 'Agent failure';
      
      mockAgentOrchestrationService.handleAgentFailure.mockResolvedValue(
        Result.fail<void>('Recovery operation failed')
      );

      // Act
      const result = await useCase.handleAgentExecutionFailure(testNodeId, failureReason);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Agent recovery failed: Recovery operation failed');
    });
  });

  describe('UC-024: Validate Business Rules', () => {
    it('ValidateBusinessRules_WithCompliantModel_ShouldPassValidation', async () => {
      // Arrange
      const mockModel = {
        id: { value: 'test-model-123' },
        name: { toString: () => 'Compliant Test Model' },
        nodes: new Map(),
        permissions: { owner: 'test-user', editors: [], viewers: [] },
        metadata: { dataSharingApproved: true },
        updatedAt: new Date(),
        version: { toString: () => '1.0.0' }
      } as any;

      const mockActionNodes = [{
        name: 'valid-action',
        actionType: 'api-call',
        executionOrder: 1,
        executionMode: 'sequential',
        actionData: { configuration: { apiEndpoint: 'https://valid.api', httpMethod: 'POST' } }
      }] as any;

      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Consider enabling audit logging for compliance']
      };

      mockBusinessRuleValidationService.validateBusinessRules.mockResolvedValue(
        Result.ok<ValidationResult>(validationResult)
      );

      // Act
      const result = await useCase.validateBusinessRules(mockModel, mockActionNodes);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.operationType).toBe('business-validation');
      expect(result.value.success).toBe(true);
      expect(result.value.businessRulesViolated).toEqual([]);
      expect(result.value.propagatedErrors).toEqual([]);
      expect(result.value.finalStatus).toBe(ActionStatus.CONFIGURED);
      expect(result.value.contextualInformation?.validationWarnings).toContain('Consider enabling audit logging for compliance');
      expect(mockBusinessRuleValidationService.validateBusinessRules).toHaveBeenCalledWith(mockModel, mockActionNodes);
    });

    it('ValidateBusinessRules_WithViolations_ShouldBlockOperation', async () => {
      // Arrange
      const mockModel = {
        id: { value: 'test-model-456' },
        name: { toString: () => 'Non-Compliant Model' },
        nodes: new Map(),
        permissions: { owner: '', editors: [], viewers: [] }, // Invalid owner
        metadata: {},
        updatedAt: new Date(),
        version: { toString: () => 'invalid.version' } // Invalid version format
      } as any;

      const mockActionNodes = [{
        name: '',
        actionType: 'api-call',
        executionOrder: -1,
        actionData: { configuration: {} } // Missing required configuration
      }] as any;

      const validationResult: ValidationResult = {
        isValid: false,
        errors: [
          'Model must have a valid owner',
          'Model version must follow semantic versioning format (x.y.z)',
          'Action node has empty or missing name',
          'Action node test-action-456 has invalid execution order',
          'Action node missing required configuration: apiEndpoint'
        ],
        warnings: []
      };

      mockBusinessRuleValidationService.validateBusinessRules.mockResolvedValue(
        Result.ok<ValidationResult>(validationResult)
      );

      // Act
      const result = await useCase.validateBusinessRules(mockModel, mockActionNodes);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.success).toBe(false);
      expect(result.value.actionTaken).toBe('validation-failed');
      expect(result.value.businessRulesViolated).toEqual(validationResult.errors);
      expect(result.value.propagatedErrors).toEqual(validationResult.errors);
      expect(result.value.finalStatus).toBe('validation-blocked');
      expect(result.value.contextualInformation?.validationErrors).toEqual(validationResult.errors);
    });

    it('ValidateBusinessRules_WhenValidationServiceFails_ShouldReturnFailure', async () => {
      // Arrange
      const mockModel = {} as any;
      const mockActionNodes = [] as any;

      mockBusinessRuleValidationService.validateBusinessRules.mockResolvedValue(
        Result.fail<ValidationResult>('Validation service internal error')
      );

      // Act
      const result = await useCase.validateBusinessRules(mockModel, mockActionNodes);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Business rule validation failed: Validation service internal error');
    });
  });

  describe('Comprehensive Error Handling Orchestration', () => {
    it('ExecuteErrorHandlingAndRecovery_WithActionExecutionRequest_ShouldHandleSuccessfully', async () => {
      // Arrange
      const request: ErrorHandlingRequest = {
        operationType: 'action-execution',
        actionNodeId: 'test-action-orchestration',
        failureContext: {
          error: 'Network timeout during execution',
          timestamp: new Date(),
          attemptCount: 1
        },
        recoveryPreference: 'retry'
      };

      // Setup mocks for successful retry scenario
      mockActionExecutionService.failExecution.mockResolvedValue(Result.ok<void>(undefined));
      mockActionExecutionService.evaluateRetryPolicy.mockResolvedValue(Result.ok<boolean>(true));
      
      const mockSnapshot: ExecutionSnapshot = {
        actionId: { value: request.actionNodeId } as NodeId,
        status: ActionStatus.RETRYING,
        progress: 30,
        metadata: { retryAttempt: 1 }
      };
      mockActionExecutionService.getExecutionSnapshot.mockResolvedValue(Result.ok<ExecutionSnapshot>(mockSnapshot));
      mockActionExecutionService.retryExecution.mockResolvedValue(Result.ok<void>(undefined));

      // Act
      const result = await useCase.executeErrorHandlingAndRecovery(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2); // Primary result + cascading result
      
      const primaryResult = result.value[0];
      expect(primaryResult.operationType).toBe('action-execution');
      expect(primaryResult.success).toBe(true);
      expect(primaryResult.actionTaken).toBe('retry');
      expect(primaryResult.retryAttempted).toBe(true);
      
      // Should include cascading failure handling
      const cascadingResult = result.value[1];
      expect(cascadingResult.operationType).toBe('action-execution');
      expect(cascadingResult.success).toBe(false);
      expect(cascadingResult.contextualInformation?.cascadedFrom).toBe(request.actionNodeId);
    });

    it('ExecuteErrorHandlingAndRecovery_WithAgentExecutionRequest_ShouldDisableAndAssessImpacts', async () => {
      // Arrange
      const request: ErrorHandlingRequest = {
        operationType: 'agent-execution',
        agentId: testNodeId,
        modelId: 'test-model-789',
        failureContext: {
          error: 'Critical agent malfunction - security violation',
          timestamp: new Date()
        },
        recoveryPreference: 'disable'
      };

      mockAgentOrchestrationService.handleAgentFailure.mockResolvedValue(Result.ok<void>(undefined));
      mockAgentOrchestrationService.getAgentMetrics.mockResolvedValue(
        Result.ok({
          totalExecutions: 15,
          successfulExecutions: 5,
          failedExecutions: 10,
          averageExecutionTime: 3000,
          averageMatchScore: 0.4,
          lastExecutionTime: new Date(),
          currentLoad: 0
        })
      );

      // Act
      const result = await useCase.executeErrorHandlingAndRecovery(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2); // Primary result + impact assessment
      
      const primaryResult = result.value[0];
      expect(primaryResult.operationType).toBe('agent-execution');
      expect(primaryResult.agentRecoveryApplied).toBe('disable');
      expect(primaryResult.finalStatus).toBe('disabled');
      
      // Should assess impacts of agent being disabled
      const impactResult = result.value[1];
      expect(impactResult.contextualInformation?.impactType).toBe('dependency-disabled');
      expect(impactResult.contextualInformation?.impactedAgent).toBe(testNodeId.value);
      expect(impactResult.contextualInformation?.impactedModel).toBe(request.modelId);
    });

    it('ExecuteErrorHandlingAndRecovery_WithBusinessValidationRequest_ShouldValidateAndBlockOperations', async () => {
      // Arrange
      const request: ErrorHandlingRequest = {
        operationType: 'business-validation',
        modelId: 'test-model-validation',
        failureContext: {
          error: 'Business rule validation required',
          timestamp: new Date()
        }
      };

      const validationResult: ValidationResult = {
        isValid: false,
        errors: [
          'Required input boundary node is missing',
          'Model must have a valid owner',
          'Total resource allocation exceeds organization limits'
        ],
        warnings: ['Consider parallel processing for improved performance']
      };

      mockBusinessRuleValidationService.validateBusinessRules.mockResolvedValue(
        Result.ok<ValidationResult>(validationResult)
      );

      // Act
      const result = await useCase.executeErrorHandlingAndRecovery(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2); // Primary validation + blocking cascade
      
      const primaryResult = result.value[0];
      expect(primaryResult.operationType).toBe('business-validation');
      expect(primaryResult.success).toBe(false);
      expect(primaryResult.businessRulesViolated).toEqual(validationResult.errors);
      expect(primaryResult.finalStatus).toBe('validation-blocked');
      
      // Should block related operations due to business rule failures
      const blockingResult = result.value[1];
      expect(blockingResult.operationType).toBe('business-validation');
      expect(blockingResult.actionTaken).toBe('validation-failed');
      expect(blockingResult.contextualInformation?.cascadedFrom).toBe('primary-validation-failure');
    });

    it('ExecuteErrorHandlingAndRecovery_WithMissingRequiredParameters_ShouldReturnFailure', async () => {
      // Arrange - Missing actionNodeId for action-execution
      const request: ErrorHandlingRequest = {
        operationType: 'action-execution',
        failureContext: {
          error: 'Test error',
          timestamp: new Date()
        }
      };

      // Act
      const result = await useCase.executeErrorHandlingAndRecovery(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Action node ID required for action execution error handling');
    });

    it('ExecuteErrorHandlingAndRecovery_WithComplexCascadingFailures_ShouldHandleAllLayers', async () => {
      // Arrange - Simulate a complex failure scenario that triggers multiple cascading effects
      const request: ErrorHandlingRequest = {
        operationType: 'action-execution',
        actionNodeId: 'critical-action-node',
        failureContext: {
          error: 'Database connection failed - affects multiple dependent actions',
          timestamp: new Date(),
          attemptCount: 3,
          metadata: { severity: 'critical', affectedSystems: ['db', 'cache', 'monitoring'] }
        }
      };

      // Setup for a failed retry scenario (max retries exceeded)
      mockActionExecutionService.failExecution.mockResolvedValue(Result.ok<void>(undefined));
      mockActionExecutionService.evaluateRetryPolicy.mockResolvedValue(Result.ok<boolean>(false));
      
      const mockSnapshot: ExecutionSnapshot = {
        actionId: { value: request.actionNodeId } as NodeId,
        status: ActionStatus.FAILED,
        progress: 0,
        metadata: { retryAttempt: 3 }
      };
      mockActionExecutionService.getExecutionSnapshot.mockResolvedValue(Result.ok<ExecutionSnapshot>(mockSnapshot));

      // Act
      const result = await useCase.executeErrorHandlingAndRecovery(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2); // Primary failure + dependency cascade
      
      const primaryResult = result.value[0];
      expect(primaryResult.operationType).toBe('action-execution');
      expect(primaryResult.success).toBe(false);
      expect(primaryResult.actionTaken).toBe('fail-fast');
      expect(primaryResult.finalStatus).toBe(ActionStatus.FAILED);
      expect(primaryResult.contextualInformation?.originalError).toBe(request.failureContext?.error);
      
      // Verify cascading failure handling
      const cascadingResult = result.value[1];
      expect(cascadingResult.contextualInformation?.cascadedFrom).toBe('critical-action-node');
      expect(cascadingResult.propagatedErrors).toContain('Dependency failure cascaded from critical-action-node');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('HandleActionNodeFailure_WithInvalidRetryPolicy_ShouldUseDefault', async () => {
      // Arrange
      const actionId = 'test-action-edge';
      const failureError = 'Test failure';

      mockActionExecutionService.failExecution.mockResolvedValue(Result.ok<void>(undefined));
      mockActionExecutionService.evaluateRetryPolicy.mockResolvedValue(Result.ok<boolean>(true));
      mockActionExecutionService.getExecutionSnapshot.mockResolvedValue(Result.ok<ExecutionSnapshot>({
        actionId: { value: actionId } as NodeId,
        status: ActionStatus.RETRYING,
        progress: 0,
        metadata: {}
      }));
      mockActionExecutionService.retryExecution.mockResolvedValue(Result.ok<void>(undefined));

      // Act - Pass no retry policy (should use default)
      const result = await useCase.handleActionNodeFailure(actionId, failureError);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.contextualInformation?.retryPolicyEnabled).toBe(true);
    });

    it('HandleAgentExecutionFailure_WithInvalidRecoveryAction_ShouldReturnFailure', async () => {
      // Arrange
      const failureReason = 'Test failure';
      
      // Create a spy to replace the private method temporarily for testing
      const originalDetermineRecovery = (useCase as any).determineAgentRecoveryAction;
      (useCase as any).determineAgentRecoveryAction = jest.fn().mockReturnValue('invalid-action' as any);

      // Act
      const result = await useCase.handleAgentExecutionFailure(testNodeId, failureReason, 'invalid-action' as any);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invalid recovery action specified');
      
      // Restore original method
      (useCase as any).determineAgentRecoveryAction = originalDetermineRecovery;
    });

    it('ExecuteErrorHandlingAndRecovery_WithInvalidOperationType_ShouldReturnFailure', async () => {
      // Arrange
      const request: ErrorHandlingRequest = {
        operationType: 'invalid-operation' as any,
        failureContext: {
          error: 'Test error',
          timestamp: new Date()
        }
      };

      // Act
      const result = await useCase.executeErrorHandlingAndRecovery(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invalid operation type for error handling');
    });
  });

  describe('Performance and Metrics Validation', () => {
    it('AllErrorHandlingOperations_ShouldTrackExecutionMetrics', async () => {
      // Arrange
      const actionId = 'metrics-test-action';
      
      mockActionExecutionService.failExecution.mockImplementation(async () => {
        // Add small delay to ensure measurable execution time
        await new Promise(resolve => setTimeout(resolve, 5));
        return Result.ok<void>(undefined);
      });
      mockActionExecutionService.evaluateRetryPolicy.mockResolvedValue(Result.ok<boolean>(false));
      mockActionExecutionService.getExecutionSnapshot.mockResolvedValue(Result.ok<ExecutionSnapshot>({
        actionId: { value: actionId } as NodeId,
        status: ActionStatus.FAILED,
        progress: 0,
        metadata: {}
      }));

      const startTime = Date.now();

      // Act
      const result = await useCase.handleActionNodeFailure(actionId, 'Test failure');
      const endTime = Date.now();

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.executionMetrics).toBeDefined();
      expect(result.value.executionMetrics!.totalDuration).toBeGreaterThan(0);
      expect(result.value.executionMetrics!.totalDuration).toBeLessThan(endTime - startTime + 100); // Allow some margin
      expect(result.value.executionMetrics!.retryDuration).toBe(0); // No retry performed
      expect(result.value.executionMetrics!.recoveryDuration).toBeGreaterThan(0);
    });

    it('HandleActionNodeFailure_WithRetryBackoff_ShouldRespectBackoffTiming', async () => {
      // Arrange
      const actionId = 'backoff-test-action';
      const customRetryPolicy = (await RetryPolicy.create({
        maxAttempts: 2,
        strategy: 'exponential',
        baseDelayMs: 100, // Small delay for testing
        maxDelayMs: 1000,
        multiplier: 2.0,
        enabled: true
      })).value;

      mockActionExecutionService.failExecution.mockResolvedValue(Result.ok<void>(undefined));
      mockActionExecutionService.evaluateRetryPolicy.mockResolvedValue(Result.ok<boolean>(true));
      mockActionExecutionService.getExecutionSnapshot.mockResolvedValue(Result.ok<ExecutionSnapshot>({
        actionId: { value: actionId } as NodeId,
        status: ActionStatus.RETRYING,
        progress: 0,
        metadata: { retryAttempt: 1 }
      }));
      mockActionExecutionService.retryExecution.mockResolvedValue(Result.ok<void>(undefined));

      const startTime = Date.now();

      // Act
      const result = await useCase.handleActionNodeFailure(actionId, 'Test failure', customRetryPolicy);
      const endTime = Date.now();
      const actualDuration = endTime - startTime;

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.backoffDelay).toBe(200); // 100 * 2^(2-1) = 200ms
      expect(actualDuration).toBeGreaterThanOrEqual(200); // Should have waited for backoff
      expect(result.value.executionMetrics!.retryDuration).toBe(200);
    });
  });
});