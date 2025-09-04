# UC-022: Handle Action Node Execution Failure - TDD Test Plan

## Test-Driven Development Strategy

Following strict TDD principles:
1. **Write failing tests first** that define expected behavior
2. **Implement minimum code** to make tests pass
3. **Ensure Clean Architecture compliance** with proper layer separation

## Use Case Overview
**Goal**: Manage action node failures with retry policies, backoff strategies, and proper failure propagation.

**Expected Behavior**:
- Detect execution failure and categorize error type
- Check retry policy configuration and remaining attempts
- Apply appropriate backoff strategy based on failure type
- Execute retry or mark as permanently failed
- Update action node status and metrics
- Propagate failure information to dependent systems

## Test Structure

### 1. Command/Request Interface Tests

```typescript
// Test file: tests/unit/use-cases/commands/handle-action-execution-failure.test.ts

describe('HandleActionNodeExecutionFailureCommand', () => {
  it('Should_CreateValidCommand_When_AllRequiredParametersProvided', () => {
    // GIVEN: Required command parameters
    const command: HandleActionNodeExecutionFailureCommand = {
      modelId: 'model-123',
      actionId: 'action-456', 
      executionId: 'execution-789',
      error: {
        code: 'NETWORK_TIMEOUT',
        message: 'Connection timeout after 30 seconds',
        category: 'TRANSIENT',
        stackTrace: 'Error stack...',
        occurredAt: new Date(),
        contextData: { endpoint: 'api.example.com', timeout: 30000 }
      },
      currentAttempt: 1,
      triggeredBy: 'user-123'
    };

    // WHEN: Command is created
    const result = command;

    // THEN: Command should be valid
    expect(result.modelId).toBeDefined();
    expect(result.actionId).toBeDefined();
    expect(result.error.category).toMatch(/^(TRANSIENT|PERMANENT|CONFIGURATION)$/);
  });

  it('Should_RequireErrorCategory_When_HandlingFailure', () => {
    // Tests that error categorization is mandatory for proper handling
  });
});
```

### 2. Result Interface Tests

```typescript
describe('HandleActionNodeExecutionFailureResult', () => {
  it('Should_ProvideRetryDecision_When_ProcessingFailure', () => {
    // GIVEN: Expected result structure
    const expectedResult: HandleActionNodeExecutionFailureResult = {
      success: true,
      actionId: 'action-456',
      retryDecision: {
        shouldRetry: true,
        nextAttempt: 2,
        maxAttempts: 3,
        backoffDelayMs: 2000,
        strategy: 'EXPONENTIAL_BACKOFF'
      },
      statusUpdate: {
        previousStatus: ActionStatus.EXECUTING,
        newStatus: ActionStatus.RETRYING,
        updatedAt: new Date(),
        reason: 'Transient network error - retry with backoff'
      },
      failureMetrics: {
        totalFailures: 1,
        consecutiveFailures: 1,
        lastFailureAt: new Date(),
        failuresByCategory: { TRANSIENT: 1, PERMANENT: 0, CONFIGURATION: 0 }
      },
      eventsPublished: ['ActionNodeExecutionFailed', 'ActionNodeExecutionRetried']
    };

    // THEN: Result should contain all decision data
    expect(expectedResult.retryDecision.shouldRetry).toBeDefined();
    expect(expectedResult.statusUpdate.newStatus).toBeDefined();
    expect(expectedResult.failureMetrics).toBeDefined();
  });
});
```

### 3. Domain Service Interface Tests

```typescript
// Test file: tests/unit/domain/services/action-failure-handling-service.test.ts

describe('IActionFailureHandlingService', () => {
  let mockService: jest.Mocked<IActionFailureHandlingService>;

  beforeEach(() => {
    mockService = {
      categorizeError: jest.fn(),
      evaluateRetryPolicy: jest.fn(),
      calculateBackoffDelay: jest.fn(),
      shouldPermanentlyFail: jest.fn(),
      updateFailureMetrics: jest.fn()
    };
  });

  describe('categorizeError', () => {
    it('Should_CategorizeAsTransient_When_NetworkTimeoutOccurs', async () => {
      // GIVEN: Network timeout error
      const error = {
        code: 'NETWORK_TIMEOUT',
        message: 'Connection timeout',
        stackTrace: 'Error stack...'
      };

      mockService.categorizeError.mockResolvedValue(
        Result.ok({ 
          category: 'TRANSIENT', 
          severity: 'MEDIUM',
          retryable: true,
          estimatedRecoveryTime: 5000
        })
      );

      // WHEN: Error is categorized
      const result = await mockService.categorizeError(error);

      // THEN: Should be categorized as transient
      expect(result.isSuccess).toBe(true);
      expect(result.value.category).toBe('TRANSIENT');
      expect(result.value.retryable).toBe(true);
    });

    it('Should_CategorizeAsPermanent_When_AuthenticationFails', async () => {
      // GIVEN: Authentication error
      const error = {
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
        stackTrace: 'Auth error stack...'
      };

      mockService.categorizeError.mockResolvedValue(
        Result.ok({
          category: 'PERMANENT',
          severity: 'HIGH', 
          retryable: false,
          requiresManualIntervention: true
        })
      );

      // WHEN: Error is categorized
      const result = await mockService.categorizeError(error);

      // THEN: Should be categorized as permanent
      expect(result.value.category).toBe('PERMANENT');
      expect(result.value.retryable).toBe(false);
    });
  });

  describe('evaluateRetryPolicy', () => {
    it('Should_AllowRetry_When_WithinRetryLimits', async () => {
      // GIVEN: Retry policy and current attempt
      const retryPolicy = RetryPolicy.create({
        maxAttempts: 3,
        backoffStrategy: 'EXPONENTIAL',
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        jitterEnabled: true
      }).value;

      mockService.evaluateRetryPolicy.mockResolvedValue(
        Result.ok({
          shouldRetry: true,
          remainingAttempts: 2,
          nextBackoffDelay: 2000,
          totalRetryTime: 3000
        })
      );

      // WHEN: Policy is evaluated
      const result = await mockService.evaluateRetryPolicy(retryPolicy, 1, 'TRANSIENT');

      // THEN: Should allow retry
      expect(result.value.shouldRetry).toBe(true);
      expect(result.value.remainingAttempts).toBe(2);
    });

    it('Should_DenyRetry_When_MaxAttemptsExceeded', async () => {
      // Test for retry limit enforcement
    });
  });

  describe('calculateBackoffDelay', () => {
    it('Should_UseExponentialBackoff_When_StrategyConfigured', async () => {
      // GIVEN: Exponential backoff configuration
      const backoffConfig = {
        strategy: 'EXPONENTIAL',
        baseDelayMs: 1000,
        multiplier: 2,
        maxDelayMs: 10000,
        jitterEnabled: false
      };

      mockService.calculateBackoffDelay.mockResolvedValue(
        Result.ok({
          delayMs: 2000, // base * multiplier^(attempt-1)
          strategy: 'EXPONENTIAL',
          jitterApplied: false
        })
      );

      // WHEN: Backoff delay is calculated for attempt 2
      const result = await mockService.calculateBackoffDelay(backoffConfig, 2);

      // THEN: Should use exponential calculation
      expect(result.value.delayMs).toBe(2000);
      expect(result.value.strategy).toBe('EXPONENTIAL');
    });

    it('Should_ApplyJitter_When_JitterEnabled', async () => {
      // Test for jitter application in backoff delays
    });

    it('Should_RespectMaxDelay_When_CalculatedDelayExceedsMax', async () => {
      // Test for maximum delay cap enforcement
    });
  });
});
```

### 4. Repository Interface Tests

```typescript
// Test file: tests/unit/infrastructure/repositories/execution-failure-repository.test.ts

describe('IExecutionFailureRepository', () => {
  let mockRepository: jest.Mocked<IExecutionFailureRepository>;

  beforeEach(() => {
    mockRepository = {
      recordFailure: jest.fn(),
      getFailureHistory: jest.fn(),
      updateRetryStatus: jest.fn(),
      getFailureMetrics: jest.fn(),
      markPermanentFailure: jest.fn()
    };
  });

  it('Should_RecordFailureWithContext_When_ActionExecutionFails', async () => {
    // GIVEN: Failure record data
    const failureRecord = {
      modelId: 'model-123',
      actionId: 'action-456',
      executionId: 'execution-789',
      failureTimestamp: new Date(),
      errorCode: 'NETWORK_TIMEOUT',
      errorMessage: 'Connection timeout',
      errorCategory: 'TRANSIENT',
      attemptNumber: 1,
      contextData: { endpoint: 'api.example.com' },
      recoveryAction: 'RETRY_WITH_BACKOFF'
    };

    mockRepository.recordFailure.mockResolvedValue(Result.ok('failure-record-id'));

    // WHEN: Failure is recorded
    const result = await mockRepository.recordFailure(failureRecord);

    // THEN: Should record with context
    expect(result.isSuccess).toBe(true);
    expect(mockRepository.recordFailure).toHaveBeenCalledWith(failureRecord);
  });

  it('Should_TrackRetryStatus_When_RetryAttempted', async () => {
    // Test retry status tracking
  });
});
```

### 5. Event Publisher Tests

```typescript
// Test file: tests/unit/domain/events/action-failure-events.test.ts

describe('Action Failure Events', () => {
  let mockEventBus: jest.Mocked<IDomainEventBus>;

  beforeEach(() => {
    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn()
    };
  });

  it('Should_PublishActionNodeExecutionFailed_When_FailureDetected', async () => {
    // GIVEN: Execution failure event data
    const eventData: ActionNodeExecutionFailedData = {
      modelId: 'model-123',
      actionId: 'action-456',
      executionId: 'execution-789',
      actionName: 'API Call Action',
      error: {
        code: 'NETWORK_TIMEOUT',
        message: 'Connection timeout',
        stackTrace: 'Error stack...',
        category: 'TRANSIENT'
      },
      retryAttempt: 1,
      willRetry: true,
      startedAt: new Date(),
      failedAt: new Date()
    };

    // WHEN: Event is published
    const event = new ActionNodeExecutionFailed(eventData);
    await mockEventBus.publish(event);

    // THEN: Event should be published with correct data
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'model-123',
        actionId: 'action-456',
        willRetry: true
      })
    );
  });

  it('Should_PublishActionNodeExecutionRetried_When_RetryInitiated', async () => {
    // Test retry event publishing
  });

  it('Should_PublishActionNodePermanentlyFailed_When_MaxRetriesExceeded', async () => {
    // Test permanent failure event publishing
  });
});
```

### 6. Use Case Integration Tests

```typescript
// Test file: tests/unit/use-cases/handle-action-node-execution-failure-use-case.test.ts

describe('HandleActionNodeExecutionFailureUseCase', () => {
  let useCase: HandleActionNodeExecutionFailureUseCase;
  let mockFailureService: jest.Mocked<IActionFailureHandlingService>;
  let mockRepository: jest.Mocked<IExecutionFailureRepository>;
  let mockEventBus: jest.Mocked<IDomainEventBus>;

  beforeEach(() => {
    mockFailureService = createMockFailureService();
    mockRepository = createMockRepository();
    mockEventBus = createMockEventBus();
    
    useCase = new HandleActionNodeExecutionFailureUseCase(
      mockFailureService,
      mockRepository,
      mockEventBus
    );
  });

  describe('execute', () => {
    it('Should_RetryWithBackoff_When_TransientFailureWithinLimits', async () => {
      // GIVEN: Transient failure within retry limits
      const command: HandleActionNodeExecutionFailureCommand = {
        modelId: 'model-123',
        actionId: 'action-456',
        executionId: 'execution-789',
        error: {
          code: 'NETWORK_TIMEOUT',
          message: 'Connection timeout',
          category: 'TRANSIENT',
          stackTrace: 'Error stack...',
          occurredAt: new Date(),
          contextData: {}
        },
        currentAttempt: 1,
        triggeredBy: 'system'
      };

      // Mock service responses
      mockFailureService.categorizeError.mockResolvedValue(
        Result.ok({ category: 'TRANSIENT', severity: 'MEDIUM', retryable: true })
      );
      
      mockFailureService.evaluateRetryPolicy.mockResolvedValue(
        Result.ok({ shouldRetry: true, remainingAttempts: 2, nextBackoffDelay: 2000 })
      );
      
      mockFailureService.calculateBackoffDelay.mockResolvedValue(
        Result.ok({ delayMs: 2000, strategy: 'EXPONENTIAL', jitterApplied: false })
      );

      mockRepository.recordFailure.mockResolvedValue(Result.ok('failure-id'));

      // WHEN: Use case is executed
      const result = await useCase.execute(command);

      // THEN: Should retry with backoff
      expect(result.isSuccess).toBe(true);
      expect(result.value.retryDecision.shouldRetry).toBe(true);
      expect(result.value.retryDecision.backoffDelayMs).toBe(2000);
      expect(result.value.statusUpdate.newStatus).toBe(ActionStatus.RETRYING);
      
      // Verify events published
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(ActionNodeExecutionFailed)
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(ActionNodeExecutionRetried)
      );
    });

    it('Should_MarkPermanentFailure_When_MaxRetriesExceeded', async () => {
      // GIVEN: Failure exceeding retry limits
      const command: HandleActionNodeExecutionFailureCommand = {
        modelId: 'model-123',
        actionId: 'action-456',
        executionId: 'execution-789',
        error: {
          code: 'NETWORK_TIMEOUT',
          message: 'Connection timeout',
          category: 'TRANSIENT', 
          stackTrace: 'Error stack...',
          occurredAt: new Date(),
          contextData: {}
        },
        currentAttempt: 3, // Max attempts reached
        triggeredBy: 'system'
      };

      mockFailureService.evaluateRetryPolicy.mockResolvedValue(
        Result.ok({ shouldRetry: false, remainingAttempts: 0, maxAttemptsReached: true })
      );

      mockRepository.markPermanentFailure.mockResolvedValue(Result.ok(void 0));

      // WHEN: Use case is executed
      const result = await useCase.execute(command);

      // THEN: Should mark as permanently failed
      expect(result.value.retryDecision.shouldRetry).toBe(false);
      expect(result.value.statusUpdate.newStatus).toBe(ActionStatus.FAILED);
      expect(mockRepository.markPermanentFailure).toHaveBeenCalled();
    });

    it('Should_SkipRetry_When_PermanentFailureDetected', async () => {
      // GIVEN: Permanent failure (authentication error)
      const command: HandleActionNodeExecutionFailureCommand = {
        modelId: 'model-123',
        actionId: 'action-456',
        executionId: 'execution-789',
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
          category: 'PERMANENT',
          stackTrace: 'Auth error stack...',
          occurredAt: new Date(),
          contextData: {}
        },
        currentAttempt: 1,
        triggeredBy: 'system'
      };

      mockFailureService.categorizeError.mockResolvedValue(
        Result.ok({ category: 'PERMANENT', severity: 'HIGH', retryable: false })
      );

      // WHEN: Use case is executed
      const result = await useCase.execute(command);

      // THEN: Should not retry
      expect(result.value.retryDecision.shouldRetry).toBe(false);
      expect(result.value.statusUpdate.newStatus).toBe(ActionStatus.FAILED);
      expect(mockFailureService.evaluateRetryPolicy).not.toHaveBeenCalled();
    });

    it('Should_HandleCircuitBreaker_When_ConsecutiveFailuresExceedThreshold', async () => {
      // Test circuit breaker pattern implementation
    });

    it('Should_ApplyRateLimiting_When_RetryingRapidlyFailingActions', async () => {
      // Test rate limiting for retry attempts
    });
  });

  describe('Error Scenarios', () => {
    it('Should_ReturnFailure_When_FailureServiceThrowsException', async () => {
      // Test error handling in dependency services
    });

    it('Should_ReturnFailure_When_RepositoryOperationFails', async () => {
      // Test repository failure handling
    });

    it('Should_ContinueExecution_When_EventPublishingFails', async () => {
      // Test graceful handling of event publishing failures
    });
  });
});
```

### 7. Architectural Boundary Tests

```typescript
// Test file: tests/unit/domain/architecture/action-failure-boundaries.test.ts

describe('Action Failure Handling - Architectural Boundaries', () => {
  it('Should_OnlyDependOnDomainLayer_When_ImplementingFailureService', () => {
    // GIVEN: Action failure handling service implementation
    const serviceFile = 'lib/domain/services/action-failure-handling-service.ts';
    
    // THEN: Should only import from domain layer
    expectNoDependenciesOutsideDomain(serviceFile);
  });

  it('Should_ImplementRepositoryInterface_When_AccessingPersistence', () => {
    // Test that infrastructure implements domain-defined interfaces
  });

  it('Should_PublishDomainEvents_When_StateChangesOccur', () => {
    // Test event publishing follows domain event patterns
  });

  it('Should_NotLeakInfrastructureDetails_When_ReturningResults', () => {
    // Test that use case results don't expose infrastructure details
  });
});
```

## Implementation Order

1. **Define Interfaces** (Test-driven)
   - Command and Result types
   - Domain service interfaces
   - Repository interfaces
   - Event types

2. **Implement Domain Services** (Test-driven)
   - Error categorization logic
   - Retry policy evaluation
   - Backoff calculation algorithms
   - Failure metrics tracking

3. **Implement Use Case** (Test-driven)
   - Orchestrate failure handling workflow
   - Coordinate service interactions
   - Manage state transitions
   - Publish domain events

4. **Implement Infrastructure** (Test-driven)
   - Repository implementations
   - Event bus integration
   - External service adapters

## Success Criteria

- [ ] All tests pass with >90% coverage
- [ ] Clean Architecture boundaries maintained
- [ ] Proper error categorization and retry logic
- [ ] Comprehensive event publishing
- [ ] Graceful degradation for edge cases
- [ ] Performance metrics tracking
- [ ] Circuit breaker pattern implementation