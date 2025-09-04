# UC-023: Handle Agent Execution Failure - TDD Test Plan

## Test-Driven Development Strategy

Following strict TDD principles:
1. **Write failing tests first** that define expected behavior  
2. **Implement minimum code** to make tests pass
3. **Ensure Clean Architecture compliance** with proper layer separation

## Use Case Overview
**Goal**: Manage AI agent failures and recovery with appropriate handling actions (disable/restart/retry).

**Expected Behavior**:
- Detect agent execution failure and classify failure type
- Determine appropriate handling action based on failure pattern
- Apply recovery action (disable, restart, or retry with modified parameters)
- Update agent status and operational metrics
- Record failure metrics for monitoring and alerting
- Notify dependent systems of agent status changes

## Test Structure

### 1. Command/Request Interface Tests

```typescript
// Test file: tests/unit/use-cases/commands/handle-agent-execution-failure.test.ts

describe('HandleAgentExecutionFailureCommand', () => {
  it('Should_CreateValidCommand_When_AllRequiredParametersProvided', () => {
    // GIVEN: Required command parameters
    const command: HandleAgentExecutionFailureCommand = {
      agentId: 'agent-123',
      executionId: 'execution-456',
      modelId: 'model-789',
      nodeId: 'node-101',
      failure: {
        errorCode: 'AGENT_TIMEOUT',
        errorMessage: 'Agent execution exceeded 5 minute timeout',
        failureType: 'TIMEOUT',
        severity: 'HIGH',
        timestamp: new Date(),
        contextData: {
          timeoutMs: 300000,
          lastHeartbeat: new Date(Date.now() - 320000),
          resourceUsage: { cpu: 95, memory: 512 }
        },
        recoverySuggestion: 'RESTART_WITH_INCREASED_TIMEOUT'
      },
      agentStatus: {
        currentStatus: 'EXECUTING',
        consecutiveFailures: 2,
        lastSuccessfulExecution: new Date(Date.now() - 3600000),
        totalExecutions: 15,
        successRate: 0.85
      },
      triggeredBy: 'system-monitor'
    };

    // WHEN: Command is created
    const result = command;

    // THEN: Command should be valid
    expect(result.agentId).toBeDefined();
    expect(result.failure.failureType).toMatch(/^(TIMEOUT|RESOURCE_EXHAUSTED|AUTHORIZATION|CONFIGURATION|TOOL_FAILURE|INTERNAL_ERROR)$/);
    expect(result.failure.severity).toMatch(/^(LOW|MEDIUM|HIGH|CRITICAL)$/);
  });

  it('Should_RequireFailureClassification_When_HandlingAgentFailure', () => {
    // Tests that failure type classification is mandatory
  });

  it('Should_IncludeAgentMetrics_When_ProcessingFailure', () => {
    // Tests that agent operational metrics are included
  });
});
```

### 2. Result Interface Tests

```typescript
describe('HandleAgentExecutionFailureResult', () => {
  it('Should_ProvideRecoveryAction_When_ProcessingAgentFailure', () => {
    // GIVEN: Expected result structure
    const expectedResult: HandleAgentExecutionFailureResult = {
      success: true,
      agentId: 'agent-123',
      recoveryAction: {
        actionType: 'RESTART',
        parameters: {
          timeoutMs: 600000, // Increased from 300000
          maxRetries: 2,
          resourceLimits: { cpu: '2000m', memory: '1Gi' },
          toolConfiguration: { enabledTools: ['web_search', 'calculator'] }
        },
        scheduledAt: new Date(Date.now() + 30000), // 30 second delay
        estimatedRecoveryTime: 60000,
        fallbackAction: 'DISABLE_TEMPORARILY'
      },
      statusUpdate: {
        previousStatus: 'EXECUTING',
        newStatus: 'RECOVERING',
        statusReason: 'Restarting due to timeout failure',
        updatedAt: new Date(),
        expectedRecoveryAt: new Date(Date.now() + 90000)
      },
      failureMetrics: {
        consecutiveFailures: 3,
        failureRate: 0.20,
        failuresByType: {
          TIMEOUT: 2,
          RESOURCE_EXHAUSTED: 1,
          AUTHORIZATION: 0,
          TOOL_FAILURE: 0
        },
        lastFailureAt: new Date(),
        recoveryAttempts: 1,
        averageRecoveryTime: 45000
      },
      alertingDecision: {
        shouldAlert: true,
        alertLevel: 'WARNING',
        alertMessage: 'Agent agent-123 experiencing repeated failures - automatic recovery initiated',
        notificationChannels: ['operations-team', 'agent-monitoring']
      },
      eventsPublished: [
        'AIAgentExecutionFailed',
        'AIAgentRecoveryInitiated', 
        'AIAgentStatusChanged'
      ]
    };

    // THEN: Result should contain recovery strategy
    expect(expectedResult.recoveryAction.actionType).toMatch(/^(RESTART|DISABLE|RETRY|FAILOVER)$/);
    expect(expectedResult.statusUpdate.newStatus).toBeDefined();
    expect(expectedResult.failureMetrics.consecutiveFailures).toBeGreaterThan(0);
    expect(expectedResult.alertingDecision.shouldAlert).toBeDefined();
  });
});
```

### 3. Domain Service Interface Tests

```typescript
// Test file: tests/unit/domain/services/agent-failure-recovery-service.test.ts

describe('IAgentFailureRecoveryService', () => {
  let mockService: jest.Mocked<IAgentFailureRecoveryService>;

  beforeEach(() => {
    mockService = {
      classifyFailure: jest.fn(),
      determineRecoveryAction: jest.fn(),
      calculateRecoveryParameters: jest.fn(),
      evaluateAgentHealth: jest.fn(),
      shouldTriggerAlert: jest.fn(),
      updateAgentMetrics: jest.fn()
    };
  });

  describe('classifyFailure', () => {
    it('Should_ClassifyAsTimeout_When_AgentExceedsExecutionLimit', async () => {
      // GIVEN: Timeout failure scenario
      const failureContext = {
        errorCode: 'AGENT_TIMEOUT',
        executionTimeMs: 350000,
        maxAllowedTimeMs: 300000,
        lastHeartbeat: new Date(Date.now() - 320000),
        resourceUsage: { cpu: 45, memory: 256 }
      };

      mockService.classifyFailure.mockResolvedValue(
        Result.ok({
          failureType: 'TIMEOUT',
          severity: 'HIGH',
          isRecoverable: true,
          recoverySuggestion: 'RESTART_WITH_INCREASED_TIMEOUT',
          estimatedRecoveryTime: 60000,
          rootCause: 'Execution exceeded maximum allowed time'
        })
      );

      // WHEN: Failure is classified
      const result = await mockService.classifyFailure(failureContext);

      // THEN: Should classify as timeout
      expect(result.isSuccess).toBe(true);
      expect(result.value.failureType).toBe('TIMEOUT');
      expect(result.value.isRecoverable).toBe(true);
    });

    it('Should_ClassifyAsResourceExhaustion_When_AgentExceedsLimits', async () => {
      // GIVEN: Resource exhaustion scenario
      const failureContext = {
        errorCode: 'OUT_OF_MEMORY',
        resourceUsage: { cpu: 95, memory: 2048 },
        resourceLimits: { cpu: 100, memory: 1024 },
        executionTimeMs: 45000
      };

      mockService.classifyFailure.mockResolvedValue(
        Result.ok({
          failureType: 'RESOURCE_EXHAUSTED',
          severity: 'MEDIUM',
          isRecoverable: true,
          recoverySuggestion: 'RESTART_WITH_INCREASED_RESOURCES',
          rootCause: 'Memory usage exceeded allocated limits'
        })
      );

      // WHEN: Failure is classified
      const result = await mockService.classifyFailure(failureContext);

      // THEN: Should classify as resource exhaustion
      expect(result.value.failureType).toBe('RESOURCE_EXHAUSTED');
      expect(result.value.recoverySuggestion).toBe('RESTART_WITH_INCREASED_RESOURCES');
    });

    it('Should_ClassifyAsConfiguration_When_AgentToolsUnavailable', async () => {
      // GIVEN: Tool configuration failure
      const failureContext = {
        errorCode: 'TOOL_UNAVAILABLE',
        unavailableTools: ['web_search', 'database_query'],
        requiredTools: ['web_search', 'calculator', 'database_query'],
        toolErrors: {
          'web_search': 'API key expired',
          'database_query': 'Connection timeout'
        }
      };

      mockService.classifyFailure.mockResolvedValue(
        Result.ok({
          failureType: 'CONFIGURATION',
          severity: 'HIGH',
          isRecoverable: false,
          requiresManualIntervention: true,
          rootCause: 'Required tools unavailable due to configuration issues'
        })
      );

      // WHEN: Failure is classified
      const result = await mockService.classifyFailure(failureContext);

      // THEN: Should classify as configuration issue
      expect(result.value.failureType).toBe('CONFIGURATION');
      expect(result.value.requiresManualIntervention).toBe(true);
    });
  });

  describe('determineRecoveryAction', () => {
    it('Should_RecommendRestart_When_TransientFailureDetected', async () => {
      // GIVEN: Transient failure with good agent history
      const agentHealth = {
        consecutiveFailures: 2,
        successRate: 0.85,
        averageExecutionTime: 45000,
        lastSuccessfulExecution: new Date(Date.now() - 3600000),
        failurePattern: 'SPORADIC'
      };

      const failureClassification = {
        failureType: 'TIMEOUT',
        severity: 'MEDIUM',
        isRecoverable: true
      };

      mockService.determineRecoveryAction.mockResolvedValue(
        Result.ok({
          actionType: 'RESTART',
          confidence: 0.8,
          reasoning: 'Sporadic timeout with good success rate - likely recoverable',
          alternatives: ['DISABLE_TEMPORARILY'],
          riskAssessment: 'LOW'
        })
      );

      // WHEN: Recovery action is determined
      const result = await mockService.determineRecoveryAction(
        failureClassification,
        agentHealth
      );

      // THEN: Should recommend restart
      expect(result.value.actionType).toBe('RESTART');
      expect(result.value.confidence).toBeGreaterThan(0.7);
    });

    it('Should_RecommendDisable_When_ConsecutiveFailuresExceedThreshold', async () => {
      // GIVEN: High consecutive failures
      const agentHealth = {
        consecutiveFailures: 5,
        successRate: 0.45,
        averageExecutionTime: 120000,
        lastSuccessfulExecution: new Date(Date.now() - 7200000),
        failurePattern: 'CONSECUTIVE'
      };

      mockService.determineRecoveryAction.mockResolvedValue(
        Result.ok({
          actionType: 'DISABLE',
          confidence: 0.9,
          reasoning: 'High consecutive failures indicate systematic issue',
          disableDuration: 3600000, // 1 hour
          requiresManualReview: true
        })
      );

      // WHEN: Recovery action is determined
      const result = await mockService.determineRecoveryAction(
        { failureType: 'INTERNAL_ERROR', severity: 'HIGH' },
        agentHealth
      );

      // THEN: Should recommend disable
      expect(result.value.actionType).toBe('DISABLE');
      expect(result.value.requiresManualReview).toBe(true);
    });

    it('Should_RecommendFailover_When_CriticalAgentFails', async () => {
      // GIVEN: Critical agent with available backup
      const agentConfig = {
        priority: 'CRITICAL',
        hasBackupAgent: true,
        backupAgentId: 'agent-backup-123',
        allowFailover: true
      };

      mockService.determineRecoveryAction.mockResolvedValue(
        Result.ok({
          actionType: 'FAILOVER',
          targetAgentId: 'agent-backup-123',
          reasoning: 'Critical agent requires immediate failover',
          estimatedSwitchTime: 15000
        })
      );

      // WHEN: Recovery action is determined for critical agent
      const result = await mockService.determineRecoveryAction(
        { failureType: 'AUTHORIZATION', severity: 'CRITICAL' },
        { consecutiveFailures: 1 },
        agentConfig
      );

      // THEN: Should recommend failover
      expect(result.value.actionType).toBe('FAILOVER');
      expect(result.value.targetAgentId).toBeDefined();
    });
  });

  describe('calculateRecoveryParameters', () => {
    it('Should_IncreaseTimeout_When_RecoveringFromTimeoutFailure', async () => {
      // GIVEN: Timeout failure scenario
      const originalConfig = {
        timeoutMs: 300000,
        maxRetries: 3,
        resourceLimits: { cpu: '1000m', memory: '512Mi' }
      };

      const failureContext = {
        failureType: 'TIMEOUT',
        executionTimeMs: 350000,
        consecutiveTimeouts: 2
      };

      mockService.calculateRecoveryParameters.mockResolvedValue(
        Result.ok({
          timeoutMs: 600000, // Doubled
          maxRetries: 2, // Reduced
          resourceLimits: { cpu: '1000m', memory: '512Mi' }, // Unchanged
          backoffStrategy: 'EXPONENTIAL',
          parameterChanges: ['timeoutMs: 300000 → 600000', 'maxRetries: 3 → 2']
        })
      );

      // WHEN: Recovery parameters are calculated
      const result = await mockService.calculateRecoveryParameters(
        originalConfig,
        failureContext
      );

      // THEN: Should increase timeout
      expect(result.value.timeoutMs).toBeGreaterThan(originalConfig.timeoutMs);
      expect(result.value.parameterChanges).toContain('timeoutMs: 300000 → 600000');
    });

    it('Should_IncreaseResources_When_RecoveringFromResourceExhaustion', async () => {
      // Test resource limit increases for resource exhaustion failures
    });
  });

  describe('evaluateAgentHealth', () => {
    it('Should_AssessAsHealthy_When_AgentHasGoodMetrics', async () => {
      // GIVEN: Good agent performance metrics
      const metrics = {
        totalExecutions: 100,
        successfulExecutions: 92,
        consecutiveFailures: 0,
        averageExecutionTime: 35000,
        lastFailureAt: new Date(Date.now() - 86400000) // 24 hours ago
      };

      mockService.evaluateAgentHealth.mockResolvedValue(
        Result.ok({
          healthScore: 0.92,
          healthStatus: 'HEALTHY',
          riskLevel: 'LOW',
          recommendedAction: 'NONE',
          nextHealthCheck: new Date(Date.now() + 3600000)
        })
      );

      // WHEN: Agent health is evaluated
      const result = await mockService.evaluateAgentHealth(metrics);

      // THEN: Should assess as healthy
      expect(result.value.healthStatus).toBe('HEALTHY');
      expect(result.value.healthScore).toBeGreaterThan(0.9);
    });

    it('Should_AssessAsDegraded_When_AgentShowsDecline', async () => {
      // Test degraded health assessment
    });
  });
});
```

### 4. Repository Interface Tests

```typescript
// Test file: tests/unit/infrastructure/repositories/agent-failure-repository.test.ts

describe('IAgentFailureRepository', () => {
  let mockRepository: jest.Mocked<IAgentFailureRepository>;

  beforeEach(() => {
    mockRepository = {
      recordAgentFailure: jest.fn(),
      getAgentFailureHistory: jest.fn(),
      updateAgentStatus: jest.fn(),
      getAgentMetrics: jest.fn(),
      recordRecoveryAttempt: jest.fn(),
      getFailurePattern: jest.fn()
    };
  });

  it('Should_RecordFailureWithContext_When_AgentFails', async () => {
    // GIVEN: Agent failure record
    const failureRecord = {
      agentId: 'agent-123',
      executionId: 'execution-456',
      modelId: 'model-789',
      nodeId: 'node-101',
      failureTimestamp: new Date(),
      failureType: 'TIMEOUT',
      errorCode: 'AGENT_TIMEOUT',
      errorMessage: 'Agent execution timeout',
      severity: 'HIGH',
      contextData: {
        executionTimeMs: 350000,
        resourceUsage: { cpu: 95, memory: 512 },
        toolsUsed: ['web_search', 'calculator']
      },
      recoverySuggestion: 'RESTART_WITH_INCREASED_TIMEOUT'
    };

    mockRepository.recordAgentFailure.mockResolvedValue(Result.ok('failure-record-id'));

    // WHEN: Failure is recorded
    const result = await mockRepository.recordAgentFailure(failureRecord);

    // THEN: Should record with full context
    expect(result.isSuccess).toBe(true);
    expect(mockRepository.recordAgentFailure).toHaveBeenCalledWith(failureRecord);
  });

  it('Should_TrackRecoveryAttempts_When_RecoveryInitiated', async () => {
    // GIVEN: Recovery attempt record
    const recoveryRecord = {
      agentId: 'agent-123',
      recoveryAttemptId: 'recovery-789',
      actionType: 'RESTART',
      initiatedAt: new Date(),
      parameters: {
        timeoutMs: 600000,
        resourceLimits: { cpu: '2000m', memory: '1Gi' }
      },
      triggeredBy: 'system',
      expectedCompletionAt: new Date(Date.now() + 90000)
    };

    mockRepository.recordRecoveryAttempt.mockResolvedValue(Result.ok('recovery-id'));

    // WHEN: Recovery attempt is recorded
    const result = await mockRepository.recordRecoveryAttempt(recoveryRecord);

    // THEN: Should track recovery
    expect(result.isSuccess).toBe(true);
    expect(mockRepository.recordRecoveryAttempt).toHaveBeenCalledWith(recoveryRecord);
  });

  it('Should_AnalyzeFailurePatterns_When_RequestingPatternAnalysis', async () => {
    // Test failure pattern analysis
  });
});
```

### 5. Event Publisher Tests

```typescript
// Test file: tests/unit/domain/events/agent-failure-events.test.ts

describe('Agent Failure Events', () => {
  let mockEventBus: jest.Mocked<IDomainEventBus>;

  beforeEach(() => {
    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn()
    };
  });

  it('Should_PublishAgentExecutionFailed_When_FailureDetected', async () => {
    // GIVEN: Agent execution failure event
    const eventData: AIAgentExecutionFailedData = {
      agentId: 'agent-123',
      executionId: 'execution-456',
      agentName: 'Data Processing Agent',
      error: {
        code: 'AGENT_TIMEOUT',
        message: 'Agent execution exceeded timeout',
        category: 'TIMEOUT'
      },
      failedAt: new Date()
    };

    // WHEN: Event is published
    const event = new AIAgentExecutionFailed(eventData);
    await mockEventBus.publish(event);

    // THEN: Event should be published correctly
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agentId: 'agent-123',
          error: expect.objectContaining({
            category: 'TIMEOUT'
          })
        })
      })
    );
  });

  it('Should_PublishAgentRecoveryInitiated_When_RecoveryStarts', async () => {
    // GIVEN: Agent recovery event
    const eventData = {
      agentId: 'agent-123',
      recoveryAction: 'RESTART',
      parameters: { timeoutMs: 600000 },
      initiatedAt: new Date(),
      triggeredBy: 'system'
    };

    // WHEN: Recovery event is published
    const event = new AIAgentRecoveryInitiated(eventData);
    await mockEventBus.publish(event);

    // THEN: Event should be published
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'agent-123',
        recoveryAction: 'RESTART'
      })
    );
  });

  it('Should_PublishAgentStatusChanged_When_StatusUpdated', async () => {
    // Test agent status change event publishing
  });

  it('Should_PublishAgentHealthDegraded_When_HealthDeclines', async () => {
    // Test agent health degradation event publishing
  });
});
```

### 6. Use Case Integration Tests

```typescript
// Test file: tests/unit/use-cases/handle-agent-execution-failure-use-case.test.ts

describe('HandleAgentExecutionFailureUseCase', () => {
  let useCase: HandleAgentExecutionFailureUseCase;
  let mockRecoveryService: jest.Mocked<IAgentFailureRecoveryService>;
  let mockRepository: jest.Mocked<IAgentFailureRepository>;
  let mockEventBus: jest.Mocked<IDomainEventBus>;
  let mockAlertingService: jest.Mocked<IAlertingService>;

  beforeEach(() => {
    mockRecoveryService = createMockRecoveryService();
    mockRepository = createMockRepository();
    mockEventBus = createMockEventBus();
    mockAlertingService = createMockAlertingService();
    
    useCase = new HandleAgentExecutionFailureUseCase(
      mockRecoveryService,
      mockRepository,
      mockEventBus,
      mockAlertingService
    );
  });

  describe('execute', () => {
    it('Should_RestartAgent_When_TransientTimeoutFailure', async () => {
      // GIVEN: Transient timeout failure
      const command: HandleAgentExecutionFailureCommand = {
        agentId: 'agent-123',
        executionId: 'execution-456',
        modelId: 'model-789',
        nodeId: 'node-101',
        failure: {
          errorCode: 'AGENT_TIMEOUT',
          errorMessage: 'Execution timeout',
          failureType: 'TIMEOUT',
          severity: 'MEDIUM',
          timestamp: new Date(),
          contextData: { executionTimeMs: 320000 }
        },
        agentStatus: {
          currentStatus: 'EXECUTING',
          consecutiveFailures: 1,
          successRate: 0.85
        },
        triggeredBy: 'system'
      };

      // Mock service responses
      mockRecoveryService.classifyFailure.mockResolvedValue(
        Result.ok({
          failureType: 'TIMEOUT',
          severity: 'MEDIUM',
          isRecoverable: true,
          recoverySuggestion: 'RESTART_WITH_INCREASED_TIMEOUT'
        })
      );

      mockRecoveryService.determineRecoveryAction.mockResolvedValue(
        Result.ok({
          actionType: 'RESTART',
          confidence: 0.8,
          reasoning: 'Isolated timeout - restart recommended'
        })
      );

      mockRecoveryService.calculateRecoveryParameters.mockResolvedValue(
        Result.ok({
          timeoutMs: 600000,
          resourceLimits: { cpu: '1000m', memory: '512Mi' }
        })
      );

      mockRepository.recordAgentFailure.mockResolvedValue(Result.ok('failure-id'));
      mockRepository.recordRecoveryAttempt.mockResolvedValue(Result.ok('recovery-id'));

      // WHEN: Use case is executed
      const result = await useCase.execute(command);

      // THEN: Should restart agent with increased timeout
      expect(result.isSuccess).toBe(true);
      expect(result.value.recoveryAction.actionType).toBe('RESTART');
      expect(result.value.recoveryAction.parameters.timeoutMs).toBe(600000);
      expect(result.value.statusUpdate.newStatus).toBe('RECOVERING');
      
      // Verify events published
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(AIAgentExecutionFailed)
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(AIAgentRecoveryInitiated)
      );
    });

    it('Should_DisableAgent_When_ConsecutiveFailuresExceedThreshold', async () => {
      // GIVEN: High consecutive failures
      const command: HandleAgentExecutionFailureCommand = {
        agentId: 'agent-123',
        executionId: 'execution-456',
        modelId: 'model-789',
        nodeId: 'node-101',
        failure: {
          errorCode: 'INTERNAL_ERROR',
          errorMessage: 'Agent internal processing error',
          failureType: 'INTERNAL_ERROR',
          severity: 'HIGH',
          timestamp: new Date()
        },
        agentStatus: {
          currentStatus: 'EXECUTING',
          consecutiveFailures: 5, // Exceeds threshold
          successRate: 0.40
        },
        triggeredBy: 'system'
      };

      mockRecoveryService.determineRecoveryAction.mockResolvedValue(
        Result.ok({
          actionType: 'DISABLE',
          reasoning: 'Too many consecutive failures',
          disableDuration: 3600000,
          requiresManualReview: true
        })
      );

      mockAlertingService.shouldTriggerAlert.mockResolvedValue(
        Result.ok({
          shouldAlert: true,
          alertLevel: 'CRITICAL',
          alertMessage: 'Agent disabled due to repeated failures'
        })
      );

      // WHEN: Use case is executed
      const result = await useCase.execute(command);

      // THEN: Should disable agent
      expect(result.value.recoveryAction.actionType).toBe('DISABLE');
      expect(result.value.statusUpdate.newStatus).toBe('DISABLED');
      expect(result.value.alertingDecision.shouldAlert).toBe(true);
      expect(mockAlertingService.triggerAlert).toHaveBeenCalled();
    });

    it('Should_InitiateFailover_When_CriticalAgentFails', async () => {
      // GIVEN: Critical agent failure with backup available
      const command: HandleAgentExecutionFailureCommand = {
        agentId: 'agent-critical-123',
        executionId: 'execution-456',
        modelId: 'model-789',
        nodeId: 'node-101',
        failure: {
          errorCode: 'AUTHORIZATION_FAILED',
          failureType: 'AUTHORIZATION',
          severity: 'CRITICAL',
          timestamp: new Date()
        },
        agentStatus: {
          currentStatus: 'EXECUTING',
          priority: 'CRITICAL',
          hasBackupAgent: true
        },
        triggeredBy: 'system'
      };

      mockRecoveryService.determineRecoveryAction.mockResolvedValue(
        Result.ok({
          actionType: 'FAILOVER',
          targetAgentId: 'agent-backup-456',
          estimatedSwitchTime: 15000
        })
      );

      // WHEN: Use case is executed
      const result = await useCase.execute(command);

      // THEN: Should initiate failover
      expect(result.value.recoveryAction.actionType).toBe('FAILOVER');
      expect(result.value.recoveryAction.targetAgentId).toBe('agent-backup-456');
      expect(result.value.statusUpdate.newStatus).toBe('FAILING_OVER');
    });

    it('Should_HandleConfigurationError_When_ToolsUnavailable', async () => {
      // GIVEN: Configuration error due to tool unavailability
      const command: HandleAgentExecutionFailureCommand = {
        agentId: 'agent-123',
        failure: {
          errorCode: 'TOOL_UNAVAILABLE',
          failureType: 'CONFIGURATION',
          severity: 'HIGH',
          contextData: {
            unavailableTools: ['web_search'],
            toolErrors: { 'web_search': 'API key expired' }
          }
        },
        agentStatus: { currentStatus: 'EXECUTING', consecutiveFailures: 1 }
      };

      mockRecoveryService.classifyFailure.mockResolvedValue(
        Result.ok({
          failureType: 'CONFIGURATION',
          isRecoverable: false,
          requiresManualIntervention: true
        })
      );

      // WHEN: Use case is executed
      const result = await useCase.execute(command);

      // THEN: Should require manual intervention
      expect(result.value.recoveryAction.requiresManualIntervention).toBe(true);
      expect(result.value.alertingDecision.shouldAlert).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('Should_ReturnFailure_When_RecoveryServiceFails', async () => {
      // Test error handling when recovery service throws exception
    });

    it('Should_ReturnFailure_When_RepositoryOperationFails', async () => {
      // Test repository failure handling
    });

    it('Should_ContinueExecution_When_EventPublishingFails', async () => {
      // Test graceful handling of event publishing failures
    });

    it('Should_HandlePartialFailures_When_MultipleOperationsFail', async () => {
      // Test handling when some operations succeed and others fail
    });
  });
});
```

### 7. Architectural Boundary Tests

```typescript
// Test file: tests/unit/domain/architecture/agent-failure-boundaries.test.ts

describe('Agent Failure Handling - Architectural Boundaries', () => {
  it('Should_OnlyDependOnDomainLayer_When_ImplementingRecoveryService', () => {
    // GIVEN: Agent failure recovery service implementation
    const serviceFile = 'lib/domain/services/agent-failure-recovery-service.ts';
    
    // THEN: Should only import from domain layer
    expectNoDependenciesOutsideDomain(serviceFile);
  });

  it('Should_ImplementRepositoryInterface_When_AccessingAgentData', () => {
    // Test that infrastructure implements domain-defined interfaces
  });

  it('Should_PublishDomainEvents_When_AgentStatusChanges', () => {
    // Test event publishing follows domain event patterns
  });

  it('Should_NotLeakInfrastructureDetails_When_ReturningResults', () => {
    // Test that use case results don't expose infrastructure details
  });
});
```

## Implementation Order

1. **Define Interfaces** (Test-driven)
   - Command and Result types with agent-specific data
   - Domain service interfaces for failure classification and recovery
   - Repository interfaces for agent metrics and failure tracking
   - Event types for agent lifecycle changes

2. **Implement Domain Services** (Test-driven)
   - Failure classification logic (timeout, resource, configuration, etc.)
   - Recovery action determination based on agent health
   - Recovery parameter calculation for different failure types
   - Agent health assessment and pattern analysis

3. **Implement Use Case** (Test-driven)
   - Orchestrate agent failure handling workflow
   - Coordinate recovery services and repositories
   - Manage agent status transitions
   - Handle alerting decisions and notifications

4. **Implement Infrastructure** (Test-driven)
   - Repository implementations for agent data persistence
   - Event bus integration for agent events
   - Alerting service integration
   - Agent runtime management interfaces

## Success Criteria

- [ ] All tests pass with >90% coverage
- [ ] Clean Architecture boundaries maintained
- [ ] Proper failure classification and recovery logic
- [ ] Comprehensive agent health monitoring
- [ ] Appropriate alerting and notification handling
- [ ] Graceful degradation and failover support
- [ ] Pattern analysis for proactive failure prevention