# UC-024: Validate Business Rules - TDD Test Plan

## Test-Driven Development Strategy

Following strict TDD principles:
1. **Write failing tests first** that define expected behavior
2. **Implement minimum code** to make tests pass
3. **Ensure Clean Architecture compliance** with proper layer separation

## Use Case Overview
**Goal**: Ensure all operations comply with domain business rules, entity invariants, and cross-entity constraints.

**Expected Behavior**:
- Validate operations against comprehensive business rule sets
- Check entity invariants and state consistency
- Verify cross-entity constraints and relationships
- Return detailed validation results with specific rule violations
- Prevent invalid operations from proceeding
- Support rule hierarchy and precedence
- Enable contextual rule evaluation

## Test Structure

### 1. Command/Request Interface Tests

```typescript
// Test file: tests/unit/use-cases/commands/validate-business-rules.test.ts

describe('ValidateBusinessRulesCommand', () => {
  it('Should_CreateValidCommand_When_AllRequiredParametersProvided', () => {
    // GIVEN: Required command parameters
    const command: ValidateBusinessRulesCommand = {
      operation: 'CREATE_FUNCTION_MODEL',
      entityType: 'FunctionModel',
      entityData: {
        name: 'Test Workflow',
        description: 'A test workflow model',
        version: '1.0.0',
        status: 'DRAFT',
        permissions: {
          owner: 'user-123',
          editors: [],
          viewers: []
        }
      },
      contextData: {
        userId: 'user-123',
        organizationId: 'org-456',
        environment: 'development',
        requestTimestamp: new Date(),
        validationScope: ['CREATION_RULES', 'OWNERSHIP_RULES', 'NAMING_RULES']
      },
      validationOptions: {
        strictMode: true,
        stopOnFirstError: false,
        includeWarnings: true,
        validateDependencies: true,
        ruleCategories: ['BUSINESS', 'SECURITY', 'PERFORMANCE']
      },
      triggeredBy: 'user-123'
    };

    // WHEN: Command is created
    const result = command;

    // THEN: Command should be valid
    expect(result.operation).toBeDefined();
    expect(result.entityType).toMatch(/^(FunctionModel|ActionNode|IONode|StageNode)$/);
    expect(result.validationOptions.ruleCategories).toContain('BUSINESS');
  });

  it('Should_RequireEntityData_When_ValidatingBusinessRules', () => {
    // Tests that entity data is mandatory for validation
  });

  it('Should_SupportContextualValidation_When_ContextProvided', () => {
    // Tests that validation can be contextual based on user/org/environment
  });
});
```

### 2. Result Interface Tests

```typescript
describe('ValidateBusinessRulesResult', () => {
  it('Should_ProvideDetailedValidationResult_When_ProcessingRules', () => {
    // GIVEN: Expected result structure
    const expectedResult: ValidateBusinessRulesResult = {
      success: true,
      isValid: false,
      validationSummary: {
        totalRulesEvaluated: 15,
        passedRules: 12,
        failedRules: 2,
        warningRules: 1,
        skippedRules: 0,
        validationDurationMs: 45,
        validationTimestamp: new Date()
      },
      ruleViolations: [
        {
          ruleId: 'BR-001',
          ruleName: 'Model Name Length Constraint',
          ruleCategory: 'BUSINESS',
          violationType: 'ERROR',
          message: 'Model name exceeds maximum length of 100 characters',
          affectedField: 'name',
          currentValue: 'Very Long Model Name That Exceeds The Maximum Allowed Length...',
          expectedValue: 'String with length <= 100',
          severity: 'HIGH',
          correctiveAction: 'Shorten model name to 100 characters or less'
        },
        {
          ruleId: 'BR-015',
          ruleName: 'Owner Permission Validation',
          ruleCategory: 'SECURITY',
          violationType: 'ERROR',
          message: 'Model owner must have valid permissions in organization',
          affectedField: 'permissions.owner',
          currentValue: 'invalid-user-999',
          contextData: { organizationId: 'org-456', validUsers: ['user-123', 'user-456'] }
        }
      ],
      warnings: [
        {
          ruleId: 'BR-042',
          ruleName: 'Naming Convention Adherence',
          ruleCategory: 'STYLE',
          violationType: 'WARNING',
          message: 'Model name does not follow organizational naming conventions',
          affectedField: 'name',
          suggestion: 'Consider using PascalCase naming convention'
        }
      ],
      passedRules: [
        'BR-002: Version Format Validation',
        'BR-003: Description Length Check',
        'BR-010: Status Transition Rules'
      ],
      dependencyValidation: {
        dependenciesChecked: ['Organization', 'User', 'Template'],
        dependencyViolations: [],
        crossEntityConstraints: []
      },
      recommendedActions: [
        'Shorten model name to meet length requirements',
        'Verify owner user exists in organization',
        'Consider updating name to follow conventions'
      ]
    };

    // THEN: Result should contain comprehensive validation data
    expect(expectedResult.validationSummary.totalRulesEvaluated).toBeGreaterThan(0);
    expect(expectedResult.ruleViolations).toBeInstanceOf(Array);
    expect(expectedResult.ruleViolations[0].ruleCategory).toMatch(/^(BUSINESS|SECURITY|PERFORMANCE|STYLE)$/);
    expect(expectedResult.dependencyValidation).toBeDefined();
  });
});
```

### 3. Domain Service Interface Tests

```typescript
// Test file: tests/unit/domain/services/business-rule-validation-service.test.ts

describe('IBusinessRuleValidationService', () => {
  let mockService: jest.Mocked<IBusinessRuleValidationService>;

  beforeEach(() => {
    mockService = {
      validateBusinessRules: jest.fn(),
      validateEntityInvariants: jest.fn(),
      validateCrossEntityConstraints: jest.fn(),
      getRulesByCategory: jest.fn(),
      evaluateRule: jest.fn(),
      getContextualRules: jest.fn()
    };
  });

  describe('validateBusinessRules', () => {
    it('Should_ValidateModelCreationRules_When_CreatingFunctionModel', async () => {
      // GIVEN: Function model creation data
      const model = new FunctionModelBuilder()
        .withName('Test Model')
        .withVersion('1.0.0')
        .build();
      
      const actionNodes: ActionNode[] = [];
      
      mockService.validateBusinessRules.mockResolvedValue(
        Result.ok({
          isValid: true,
          errors: [],
          warnings: ['Consider adding more descriptive name'],
          validatedRules: [
            'BR-001: Model Name Length',
            'BR-002: Version Format',
            'BR-003: Owner Requirements'
          ]
        })
      );

      // WHEN: Business rules are validated
      const result = await mockService.validateBusinessRules(model, actionNodes);

      // THEN: Should validate successfully
      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(true);
      expect(result.value.validatedRules.length).toBeGreaterThan(0);
    });

    it('Should_DetectNameLengthViolation_When_NameExceedsLimit', async () => {
      // GIVEN: Model with excessively long name
      const longName = 'A'.repeat(150); // Exceeds 100 char limit
      const model = new FunctionModelBuilder()
        .withName(longName)
        .build();

      mockService.validateBusinessRules.mockResolvedValue(
        Result.ok({
          isValid: false,
          errors: ['Model name exceeds maximum length of 100 characters'],
          warnings: [],
          validatedRules: ['BR-001: Model Name Length']
        })
      );

      // WHEN: Business rules are validated
      const result = await mockService.validateBusinessRules(model, []);

      // THEN: Should detect name length violation
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Model name exceeds maximum length of 100 characters');
    });

    it('Should_ValidateOwnershipRules_When_CheckingPermissions', async () => {
      // GIVEN: Model with invalid owner
      const model = new FunctionModelBuilder()
        .withName('Valid Model')
        .withOwner('invalid-user-999')
        .build();

      mockService.validateBusinessRules.mockResolvedValue(
        Result.ok({
          isValid: false,
          errors: ['Model owner must be a valid user in the organization'],
          warnings: [],
          validatedRules: ['BR-015: Owner Permission Validation']
        })
      );

      // WHEN: Business rules are validated
      const result = await mockService.validateBusinessRules(model, []);

      // THEN: Should detect invalid owner
      expect(result.value.isValid).toBe(false);
      expect(result.value.errors).toContain('Model owner must be a valid user in the organization');
    });

    it('Should_ValidateResourceLimits_When_CheckingActionNodes', async () => {
      // GIVEN: Action nodes with excessive resource requirements
      const actionNodes = [
        new TetherNodeBuilder()
          .withResourceRequirements({ memoryRequirementMb: 20000 }) // Exceeds limit
          .build()
      ];

      mockService.validateBusinessRules.mockResolvedValue(
        Result.ok({
          isValid: false,
          errors: ['Total resource allocation exceeds organization limits'],
          warnings: [],
          validatedRules: ['BR-025: Resource Allocation Limits']
        })
      );

      // WHEN: Business rules are validated
      const result = await mockService.validateBusinessRules(
        new FunctionModelBuilder().build(),
        actionNodes
      );

      // THEN: Should detect resource limit violation
      expect(result.value.errors).toContain('Total resource allocation exceeds organization limits');
    });

    it('Should_ValidateSecurityRequirements_When_ProcessingSensitiveData', async () => {
      // GIVEN: Action node processing sensitive data without encryption
      const actionNodes = [
        new TetherNodeBuilder()
          .withConfiguration({
            processesPersonalData: true,
            encryptionEnabled: false
          })
          .build()
      ];

      mockService.validateBusinessRules.mockResolvedValue(
        Result.ok({
          isValid: false,
          errors: ['Workflow violates data retention policy: sensitive data processing without encryption'],
          warnings: []
        })
      );

      // WHEN: Business rules are validated
      const result = await mockService.validateBusinessRules(
        new FunctionModelBuilder().build(),
        actionNodes
      );

      // THEN: Should detect security violation
      expect(result.value.errors).toContain('sensitive data processing without encryption');
    });
  });

  describe('validateEntityInvariants', () => {
    it('Should_ValidateModelInvariants_When_CheckingModelConsistency', async () => {
      // GIVEN: Model entity
      const model = new FunctionModelBuilder()
        .withName('Valid Model')
        .withStatus(ModelStatus.PUBLISHED)
        .build();

      mockService.validateEntityInvariants.mockResolvedValue(
        Result.ok({
          isValid: true,
          invariantViolations: [],
          checkedInvariants: [
            'Model must have at least one input node when published',
            'Published models cannot be modified',
            'Version must follow semantic versioning'
          ]
        })
      );

      // WHEN: Entity invariants are validated
      const result = await mockService.validateEntityInvariants('FunctionModel', model);

      // THEN: Should validate invariants
      expect(result.isSuccess).toBe(true);
      expect(result.value.checkedInvariants.length).toBeGreaterThan(0);
    });

    it('Should_DetectInvariantViolation_When_PublishedModelHasNoNodes', async () => {
      // GIVEN: Published model with no nodes (violates invariant)
      const model = new FunctionModelBuilder()
        .withStatus(ModelStatus.PUBLISHED)
        .build();
      // Model has no nodes added

      mockService.validateEntityInvariants.mockResolvedValue(
        Result.ok({
          isValid: false,
          invariantViolations: [
            'Published model must contain at least one input node',
            'Published model must contain at least one output node'
          ]
        })
      );

      // WHEN: Entity invariants are validated
      const result = await mockService.validateEntityInvariants('FunctionModel', model);

      // THEN: Should detect invariant violations
      expect(result.value.isValid).toBe(false);
      expect(result.value.invariantViolations).toContain('Published model must contain at least one input node');
    });

    it('Should_ValidateNodeInvariants_When_CheckingActionNodes', async () => {
      // Test action node invariant validation
    });
  });

  describe('validateCrossEntityConstraints', () => {
    it('Should_ValidateNodeDependencies_When_CheckingWorkflowStructure', async () => {
      // GIVEN: Workflow with circular dependencies
      const model = TestFactories.createCompleteWorkflow();
      // Artificially create circular dependency for test
      const inputNode = Array.from(model.nodes.values())[0];
      const outputNode = Array.from(model.nodes.values())[2];
      inputNode.addDependency(outputNode.nodeId); // Creates circular dependency

      mockService.validateCrossEntityConstraints.mockResolvedValue(
        Result.ok({
          isValid: false,
          constraintViolations: [
            {
              constraintType: 'CIRCULAR_DEPENDENCY',
              entities: ['input-node', 'stage-node', 'output-node'],
              message: 'Circular dependency detected in workflow structure'
            }
          ]
        })
      );

      // WHEN: Cross-entity constraints are validated
      const result = await mockService.validateCrossEntityConstraints([model]);

      // THEN: Should detect circular dependency
      expect(result.value.isValid).toBe(false);
      expect(result.value.constraintViolations[0].constraintType).toBe('CIRCULAR_DEPENDENCY');
    });

    it('Should_ValidateActionNodeParentConstraints_When_CheckingActionRelationships', async () => {
      // GIVEN: Action node with non-existent parent
      const actionNode = new TetherNodeBuilder()
        .withParentNode('non-existent-parent-node')
        .build();

      mockService.validateCrossEntityConstraints.mockResolvedValue(
        Result.ok({
          isValid: false,
          constraintViolations: [
            {
              constraintType: 'ORPHANED_ACTION_NODE',
              entities: [actionNode.actionId.toString()],
              message: 'Action node references non-existent parent node'
            }
          ]
        })
      );

      // WHEN: Cross-entity constraints are validated
      const result = await mockService.validateCrossEntityConstraints([actionNode]);

      // THEN: Should detect orphaned action node
      expect(result.value.constraintViolations[0].constraintType).toBe('ORPHANED_ACTION_NODE');
    });

    it('Should_ValidateResourceAllocationConstraints_When_CheckingSystemLimits', async () => {
      // Test system-wide resource allocation constraints
    });
  });

  describe('getRulesByCategory', () => {
    it('Should_ReturnBusinessRules_When_RequestingBusinessCategory', async () => {
      // GIVEN: Business rule category request
      mockService.getRulesByCategory.mockResolvedValue(
        Result.ok([
          { ruleId: 'BR-001', name: 'Model Name Length', category: 'BUSINESS' },
          { ruleId: 'BR-002', name: 'Version Format', category: 'BUSINESS' },
          { ruleId: 'BR-003', name: 'Owner Requirements', category: 'BUSINESS' }
        ])
      );

      // WHEN: Rules are requested by category
      const result = await mockService.getRulesByCategory('BUSINESS');

      // THEN: Should return business rules
      expect(result.isSuccess).toBe(true);
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value.every(rule => rule.category === 'BUSINESS')).toBe(true);
    });

    it('Should_ReturnSecurityRules_When_RequestingSecurityCategory', async () => {
      // Test security rule retrieval
    });

    it('Should_ReturnPerformanceRules_When_RequestingPerformanceCategory', async () => {
      // Test performance rule retrieval
    });
  });

  describe('evaluateRule', () => {
    it('Should_EvaluateNameLengthRule_When_CheckingModelName', async () => {
      // GIVEN: Model name and name length rule
      const ruleContext = {
        ruleId: 'BR-001',
        entityData: { name: 'Valid Model Name' },
        ruleParameters: { maxLength: 100 }
      };

      mockService.evaluateRule.mockResolvedValue(
        Result.ok({
          ruleId: 'BR-001',
          passed: true,
          message: 'Model name length is within acceptable limits',
          evaluatedValue: 'Valid Model Name',
          expectedConstraint: 'length <= 100'
        })
      );

      // WHEN: Rule is evaluated
      const result = await mockService.evaluateRule(ruleContext);

      // THEN: Should evaluate rule correctly
      expect(result.value.passed).toBe(true);
      expect(result.value.ruleId).toBe('BR-001');
    });

    it('Should_FailNameLengthRule_When_NameTooLong', async () => {
      // Test rule failure scenarios
    });
  });

  describe('getContextualRules', () => {
    it('Should_ReturnEnvironmentSpecificRules_When_ContextProvided', async () => {
      // GIVEN: Development environment context
      const context = {
        environment: 'development',
        userId: 'user-123',
        organizationId: 'org-456'
      };

      mockService.getContextualRules.mockResolvedValue(
        Result.ok({
          environmentRules: ['DEV-001: Relaxed validation in development'],
          userRoles: ['developer', 'model-creator'],
          organizationPolicies: ['ORG-001: Data retention policy'],
          applicableRules: ['BR-001', 'BR-002', 'DEV-001']
        })
      );

      // WHEN: Contextual rules are requested
      const result = await mockService.getContextualRules(context);

      // THEN: Should return context-specific rules
      expect(result.value.environmentRules).toContain('DEV-001');
      expect(result.value.applicableRules).toContain('BR-001');
    });
  });
});
```

### 4. Repository Interface Tests

```typescript
// Test file: tests/unit/infrastructure/repositories/business-rule-repository.test.ts

describe('IBusinessRuleRepository', () => {
  let mockRepository: jest.Mocked<IBusinessRuleRepository>;

  beforeEach(() => {
    mockRepository = {
      getRulesByCategory: jest.fn(),
      getRuleById: jest.fn(),
      getOrganizationRules: jest.fn(),
      recordRuleViolation: jest.fn(),
      getRuleViolationHistory: jest.fn(),
      updateRuleConfiguration: jest.fn()
    };
  });

  it('Should_RetrieveBusinessRules_When_RequestingRulesByCategory', async () => {
    // GIVEN: Business rule category request
    const expectedRules = [
      {
        ruleId: 'BR-001',
        name: 'Model Name Length Constraint',
        category: 'BUSINESS',
        description: 'Validates model name length requirements',
        parameters: { maxLength: 100 },
        severity: 'ERROR',
        isActive: true
      }
    ];

    mockRepository.getRulesByCategory.mockResolvedValue(Result.ok(expectedRules));

    // WHEN: Rules are retrieved by category
    const result = await mockRepository.getRulesByCategory('BUSINESS');

    // THEN: Should return business rules
    expect(result.isSuccess).toBe(true);
    expect(result.value[0].category).toBe('BUSINESS');
    expect(result.value[0].ruleId).toBe('BR-001');
  });

  it('Should_RecordRuleViolation_When_ValidationFails', async () => {
    // GIVEN: Rule violation data
    const violationRecord = {
      ruleId: 'BR-001',
      entityType: 'FunctionModel',
      entityId: 'model-123',
      violationType: 'ERROR',
      violationMessage: 'Model name exceeds maximum length',
      contextData: { actualLength: 150, maxLength: 100 },
      userId: 'user-123',
      timestamp: new Date()
    };

    mockRepository.recordRuleViolation.mockResolvedValue(Result.ok('violation-record-id'));

    // WHEN: Violation is recorded
    const result = await mockRepository.recordRuleViolation(violationRecord);

    // THEN: Should record violation successfully
    expect(result.isSuccess).toBe(true);
    expect(mockRepository.recordRuleViolation).toHaveBeenCalledWith(violationRecord);
  });

  it('Should_RetrieveOrganizationRules_When_RequestingOrgSpecificRules', async () => {
    // Test organization-specific rule retrieval
  });
});
```

### 5. Use Case Integration Tests

```typescript
// Test file: tests/unit/use-cases/validate-business-rules-use-case.test.ts

describe('ValidateBusinessRulesUseCase', () => {
  let useCase: ValidateBusinessRulesUseCase;
  let mockValidationService: jest.Mocked<IBusinessRuleValidationService>;
  let mockRepository: jest.Mocked<IBusinessRuleRepository>;
  let mockEventBus: jest.Mocked<IDomainEventBus>;

  beforeEach(() => {
    mockValidationService = createMockValidationService();
    mockRepository = createMockRepository();
    mockEventBus = createMockEventBus();
    
    useCase = new ValidateBusinessRulesUseCase(
      mockValidationService,
      mockRepository,
      mockEventBus
    );
  });

  describe('execute', () => {
    it('Should_ValidateModelCreation_When_CreatingFunctionModel', async () => {
      // GIVEN: Function model creation command
      const command: ValidateBusinessRulesCommand = {
        operation: 'CREATE_FUNCTION_MODEL',
        entityType: 'FunctionModel',
        entityData: {
          name: 'Valid Model Name',
          description: 'A valid test model',
          version: '1.0.0',
          status: 'DRAFT',
          permissions: { owner: 'user-123', editors: [], viewers: [] }
        },
        contextData: {
          userId: 'user-123',
          organizationId: 'org-456',
          environment: 'development'
        },
        validationOptions: {
          strictMode: false,
          ruleCategories: ['BUSINESS', 'SECURITY']
        },
        triggeredBy: 'user-123'
      };

      // Mock service responses
      mockValidationService.validateBusinessRules.mockResolvedValue(
        Result.ok({
          isValid: true,
          errors: [],
          warnings: ['Consider more descriptive naming'],
          validatedRules: ['BR-001', 'BR-002', 'BR-015']
        })
      );

      mockRepository.getRulesByCategory.mockResolvedValue(
        Result.ok([
          { ruleId: 'BR-001', category: 'BUSINESS', isActive: true },
          { ruleId: 'BR-002', category: 'BUSINESS', isActive: true }
        ])
      );

      // WHEN: Use case is executed
      const result = await useCase.execute(command);

      // THEN: Should validate successfully
      expect(result.isSuccess).toBe(true);
      expect(result.value.isValid).toBe(true);
      expect(result.value.validationSummary.passedRules).toBe(3);
      expect(result.value.warnings.length).toBe(1);
    });

    it('Should_DetectViolations_When_ModelDataInvalid', async () => {
      // GIVEN: Invalid function model data
      const command: ValidateBusinessRulesCommand = {
        operation: 'CREATE_FUNCTION_MODEL',
        entityType: 'FunctionModel',
        entityData: {
          name: 'A'.repeat(150), // Too long
          description: '',
          version: 'invalid-version',
          status: 'INVALID_STATUS',
          permissions: { owner: '', editors: [], viewers: [] } // No owner
        },
        contextData: { userId: 'user-123' },
        validationOptions: { strictMode: true },
        triggeredBy: 'user-123'
      };

      mockValidationService.validateBusinessRules.mockResolvedValue(
        Result.ok({
          isValid: false,
          errors: [
            'Model name exceeds maximum length of 100 characters',
            'Invalid version format - must follow semantic versioning',
            'Model must have a valid owner'
          ],
          warnings: ['Description should not be empty']
        })
      );

      mockRepository.recordRuleViolation.mockResolvedValue(Result.ok('violation-id'));

      // WHEN: Use case is executed
      const result = await useCase.execute(command);

      // THEN: Should detect multiple violations
      expect(result.value.isValid).toBe(false);
      expect(result.value.ruleViolations.length).toBe(3);
      expect(result.value.ruleViolations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('name exceeds maximum length')
          }),
          expect.objectContaining({
            message: expect.stringContaining('Invalid version format')
          })
        ])
      );
      
      // Verify violations were recorded
      expect(mockRepository.recordRuleViolation).toHaveBeenCalledTimes(3);
    });

    it('Should_ValidateWithContext_When_ContextProvided', async () => {
      // GIVEN: Context-sensitive validation
      const command: ValidateBusinessRulesCommand = {
        operation: 'PUBLISH_FUNCTION_MODEL',
        entityType: 'FunctionModel',
        entityData: { /* model data */ },
        contextData: {
          userId: 'admin-user',
          organizationId: 'org-456',
          environment: 'production',
          userRoles: ['admin', 'model-publisher']
        },
        validationOptions: {
          strictMode: true,
          validateDependencies: true
        },
        triggeredBy: 'admin-user'
      };

      mockValidationService.getContextualRules.mockResolvedValue(
        Result.ok({
          applicableRules: ['BR-001', 'BR-020', 'PROD-001'],
          environmentRules: ['PROD-001: Production validation requirements']
        })
      );

      mockValidationService.validateBusinessRules.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );

      // WHEN: Use case is executed with context
      const result = await useCase.execute(command);

      // THEN: Should apply contextual validation
      expect(mockValidationService.getContextualRules).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'production',
          userRoles: ['admin', 'model-publisher']
        })
      );
      expect(result.value.isValid).toBe(true);
    });

    it('Should_ValidateCrossEntityConstraints_When_ValidatingDependencies', async () => {
      // GIVEN: Model with dependencies
      const command: ValidateBusinessRulesCommand = {
        operation: 'UPDATE_FUNCTION_MODEL',
        entityType: 'FunctionModel',
        entityData: { /* model with action nodes */ },
        validationOptions: { validateDependencies: true },
        triggeredBy: 'user-123'
      };

      mockValidationService.validateCrossEntityConstraints.mockResolvedValue(
        Result.ok({
          isValid: false,
          constraintViolations: [
            {
              constraintType: 'CIRCULAR_DEPENDENCY',
              entities: ['node-1', 'node-2', 'node-3'],
              message: 'Circular dependency detected'
            }
          ]
        })
      );

      // WHEN: Use case is executed
      const result = await useCase.execute(command);

      // THEN: Should detect cross-entity constraint violations
      expect(result.value.dependencyValidation.dependencyViolations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            constraintType: 'CIRCULAR_DEPENDENCY'
          })
        ])
      );
    });

    it('Should_HandlePartialFailures_When_SomeValidationsFail', async () => {
      // Test handling of partial validation failures
    });

    it('Should_RespectValidationOptions_When_ConfiguredDifferently', async () => {
      // Test different validation option configurations
    });
  });

  describe('Error Scenarios', () => {
    it('Should_ReturnFailure_When_ValidationServiceFails', async () => {
      // Test error handling when validation service throws exception
    });

    it('Should_ContinueValidation_When_SingleRuleFails', async () => {
      // Test graceful handling when individual rule evaluation fails
    });

    it('Should_HandleRepositoryFailures_When_RecordingViolations', async () => {
      // Test handling of repository operation failures
    });
  });
});
```

### 6. Architectural Boundary Tests

```typescript
// Test file: tests/unit/domain/architecture/business-rule-validation-boundaries.test.ts

describe('Business Rule Validation - Architectural Boundaries', () => {
  it('Should_OnlyDependOnDomainLayer_When_ImplementingValidationService', () => {
    // GIVEN: Business rule validation service implementation
    const serviceFile = 'lib/domain/services/business-rule-validation-service.ts';
    
    // THEN: Should only import from domain layer
    expectNoDependenciesOutsideDomain(serviceFile);
  });

  it('Should_ImplementRepositoryInterface_When_AccessingRuleData', () => {
    // Test that infrastructure implements domain-defined interfaces
  });

  it('Should_PublishDomainEvents_When_ViolationsDetected', () => {
    // Test event publishing for rule violations
  });

  it('Should_NotLeakInfrastructureDetails_When_ReturningResults', () => {
    // Test that use case results don't expose infrastructure details
  });
});
```

## Implementation Order

1. **Define Interfaces** (Test-driven)
   - Command and Result types with comprehensive rule data
   - Domain service interfaces for rule validation and evaluation
   - Repository interfaces for rule management and violation tracking
   - Event types for rule violation notifications

2. **Implement Domain Services** (Test-driven)
   - Business rule validation logic with comprehensive rule sets
   - Entity invariant checking for consistency
   - Cross-entity constraint validation
   - Contextual rule evaluation based on user/org/environment

3. **Implement Use Case** (Test-driven)
   - Orchestrate comprehensive validation workflow
   - Coordinate multiple validation types (rules, invariants, constraints)
   - Handle validation options and configuration
   - Manage violation recording and notifications

4. **Implement Infrastructure** (Test-driven)
   - Repository implementations for rule data persistence
   - External rule engine integration if needed
   - Violation tracking and reporting systems

## Success Criteria

- [ ] All tests pass with >90% coverage
- [ ] Clean Architecture boundaries maintained  
- [ ] Comprehensive rule validation covering all entity types
- [ ] Proper entity invariant checking
- [ ] Cross-entity constraint validation
- [ ] Contextual rule evaluation support
- [ ] Detailed violation reporting with corrective actions
- [ ] Performance optimization for rule evaluation
- [ ] Rule hierarchy and precedence handling