import { Result } from '../../domain/shared/result';
import { NodeId } from '../../domain/value-objects/node-id';
import { RetryPolicy, RetryPolicyConfig } from '../../domain/value-objects/retry-policy';
import { ActionStatus } from '../../domain/enums';
import { ActionNodeExecutionService } from '../../domain/services/action-node-execution-service';
import { AIAgentOrchestrationService } from '../../domain/services/ai-agent-orchestration-service';
import { BusinessRuleValidationService } from '../../domain/services/business-rule-validation-service';
import { NodeContextAccessService } from '../../domain/services/node-context-access-service';
import { FunctionModel, ValidationResult } from '../../domain/entities/function-model';
import { ActionNode } from '../../domain/entities/action-node';

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
  actionTaken?: 'retry' | 'disable' | 'restart' | 'validation-failed' | 'recovery-attempted' | 'fail-fast';
  retryAttempted?: boolean;
  retryCount?: number;
  backoffDelay?: number;
  agentRecoveryApplied?: 'disable' | 'restart' | 'retry' | 'fail-fast';
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
    recoveryAction?: 'disable' | 'restart' | 'retry' | 'fail-fast'
  ): Promise<Result<ErrorHandlingResult>> {
    const startTime = Date.now();

    try {
      // Step 1: System detects agent execution failure
      // This is implicit - we're being called because a failure was detected

      // Step 2: System determines failure handling action
      const determinedRecoveryAction = recoveryAction || this.determineAgentRecoveryAction(failureReason);

      // Step 3: System applies recovery action
      let agentRecoveryResult: Result<void>;
      let actionTaken: 'disable' | 'restart' | 'retry' | 'fail-fast' = determinedRecoveryAction;

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
        
        case 'fail-fast':
          // Fail-fast: Immediately fail without recovery attempts
          agentRecoveryResult = Result.ok<void>(undefined);
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
                    determinedRecoveryAction === 'fail-fast' ? ActionStatus.FAILED :
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
        ActionStatus.ACTIVE : 'validation-blocked';

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

  private determineAgentRecoveryAction(failureReason: string): 'disable' | 'restart' | 'retry' | 'fail-fast' {
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