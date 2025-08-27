import { ManageFractalOrchestrationUseCase } from '../../../../lib/use-cases/function-model/manage-fractal-orchestration-use-case';
import { FractalOrchestrationService, FractalOrchestrationResult } from '../../../../lib/domain/services/fractal-orchestration-service';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { Result } from '../../../../lib/domain/shared/result';
import { ModelName } from '../../../../lib/domain/value-objects/model-name';
import { Version } from '../../../../lib/domain/value-objects/version';
import { ModelStatus } from '../../../../lib/domain/enums';

/**
 * Test Suite for UC-013: Manage Fractal Orchestration Use Case
 * 
 * Tests the application layer coordination of fractal orchestration management,
 * ensuring Clean Architecture compliance and proper domain service orchestration.
 * 
 * This use case coordinates:
 * - Fractal execution planning and validation
 * - Multi-level hierarchical execution
 * - Context propagation across levels
 * - Vertical nesting and horizontal scaling
 * - Orchestration consistency validation
 * - Result aggregation from all levels
 */
describe('ManageFractalOrchestrationUseCase', () => {
  let useCase: ManageFractalOrchestrationUseCase;
  let mockFractalOrchestrationService: jest.Mocked<FractalOrchestrationService>;

  // Test fixtures
  const createTestFunctionModel = (modelId: string, name: string): FunctionModel => {
    const modelNameResult = ModelName.create(name);
    const modelResult = FunctionModel.create({
      modelId,
      name: modelNameResult.value,
      version: Version.initial(),
      status: ModelStatus.DRAFT,
      currentVersion: Version.initial(),
      nodes: new Map(),
      actionNodes: new Map(),
      metadata: {
        organizationId: 'org-123',
        createdBy: 'user-123'
      },
      permissions: {
        owner: 'user-123',
        viewers: [],
        editors: []
      }
    });
    return modelResult.value;
  };

  const createFractalOrchestrationResult = (executionId: string): FractalOrchestrationResult => ({
    executionId,
    totalLevels: 3,
    completedLevels: 3,
    failedLevels: 0,
    totalDuration: 1500,
    contextOutputs: {
      level_0_root: { executed: true, level: 0 },
      level_1_nested: { executed: true, level: 1 },
      level_2_deep: { executed: true, level: 2 }
    }
  });

  beforeEach(() => {
    // Create fully mocked fractal orchestration service
    mockFractalOrchestrationService = {
      planFractalExecution: jest.fn(),
      executeFractalOrchestration: jest.fn(),
      propagateContext: jest.fn(),
      coordinateLevelExecution: jest.fn(),
      handleVerticalNesting: jest.fn(),
      handleHorizontalScaling: jest.fn(),
      validateOrchestrationConsistency: jest.fn()
    } as jest.Mocked<FractalOrchestrationService>;

    useCase = new ManageFractalOrchestrationUseCase(mockFractalOrchestrationService);
  });

  describe('UC-013: Fractal Orchestration Management - Main Success Scenario', () => {
    it('should_ExecuteCompleteFractalOrchestration_WhenValidCommandProvided', async () => {
      // Arrange
      const rootModel = createTestFunctionModel('root-model', 'Root Model');
      const initialContext = { 
        userId: 'user-123', 
        sessionId: 'session-456',
        globalParams: { debugMode: true }
      };
      const expectedExecutionId = 'fractal_root-model_123456';

      // Mock successful planning
      mockFractalOrchestrationService.planFractalExecution
        .mockReturnValue(Result.ok(expectedExecutionId));

      // Mock consistency validation
      mockFractalOrchestrationService.validateOrchestrationConsistency
        .mockReturnValue(Result.ok(undefined));

      // Mock successful execution
      const expectedResult = createFractalOrchestrationResult(expectedExecutionId);
      mockFractalOrchestrationService.executeFractalOrchestration
        .mockResolvedValue(Result.ok(expectedResult));

      // Act
      const result = await useCase.execute({
        functionModel: rootModel,
        initialContext,
        orchestrationOptions: {
          maxDepth: 5,
          enableHorizontalScaling: true,
          enableVerticalNesting: true,
          consistencyValidation: true
        }
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(expectedResult);
      expect(mockFractalOrchestrationService.planFractalExecution)
        .toHaveBeenCalledWith(rootModel, initialContext);
      expect(mockFractalOrchestrationService.executeFractalOrchestration)
        .toHaveBeenCalledWith(expectedExecutionId);
    });

    it('should_FailGracefully_WhenPlanningFails', async () => {
      // Arrange
      const rootModel = createTestFunctionModel('invalid-model', 'Invalid Model');
      const initialContext = { userId: 'user-123' };

      mockFractalOrchestrationService.planFractalExecution
        .mockReturnValue(Result.fail('Failed to analyze fractal structure'));

      // Act
      const result = await useCase.execute({
        functionModel: rootModel,
        initialContext,
        orchestrationOptions: {
          maxDepth: 3,
          enableHorizontalScaling: false,
          enableVerticalNesting: false,
          consistencyValidation: true
        }
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Failed to plan fractal orchestration');
    });
  });

  describe('Multi-Level Nested Function Model Execution', () => {
    it('should_ExecuteDeeplyNestedModels_WhenValidHierarchyProvided', async () => {
      // Arrange
      const rootModel = createTestFunctionModel('multi-level-model', 'Multi-Level Model');
      const initialContext = { 
        rootData: 'test-data',
        nestedLevels: ['level1', 'level2', 'level3']
      };
      const executionId = 'fractal_multi-level-model_789';

      mockFractalOrchestrationService.planFractalExecution
        .mockReturnValue(Result.ok(executionId));

      // Mock consistency validation
      mockFractalOrchestrationService.validateOrchestrationConsistency
        .mockReturnValue(Result.ok(undefined));

      const deepNestedResult: FractalOrchestrationResult = {
        executionId,
        totalLevels: 4,
        completedLevels: 4,
        failedLevels: 0,
        totalDuration: 2500,
        contextOutputs: {
          level_0_root: { rootData: 'test-data', level: 0 },
          level_1_nested: { inheritedData: 'test-data', level: 1 },
          level_2_deep: { chainedData: 'from-level-1', level: 2 },
          level_3_deepest: { finalOutput: 'aggregated-result', level: 3 }
        }
      };

      mockFractalOrchestrationService.executeFractalOrchestration
        .mockResolvedValue(Result.ok(deepNestedResult));

      // Act
      const result = await useCase.execute({
        functionModel: rootModel,
        initialContext,
        orchestrationOptions: {
          maxDepth: 5,
          enableVerticalNesting: true,
          enableHorizontalScaling: false,
          consistencyValidation: true
        }
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.totalLevels).toBe(4);
      expect(result.value.completedLevels).toBe(4);
      expect(result.value.contextOutputs).toHaveProperty('level_3_deepest');
    });

    it('should_HandleExecutionFailure_WhenSpecificLevelFails', async () => {
      // Arrange
      const rootModel = createTestFunctionModel('failing-nested-model', 'Failing Nested Model');
      const initialContext = { userId: 'user-123' };
      const executionId = 'fractal_failing-nested-model_999';

      mockFractalOrchestrationService.planFractalExecution
        .mockReturnValue(Result.ok(executionId));

      // Mock consistency validation
      mockFractalOrchestrationService.validateOrchestrationConsistency
        .mockReturnValue(Result.ok(undefined));

      mockFractalOrchestrationService.executeFractalOrchestration
        .mockResolvedValue(Result.fail('Level 2 execution failed: Invalid context data'));

      // Act
      const result = await useCase.execute({
        functionModel: rootModel,
        initialContext,
        orchestrationOptions: {
          maxDepth: 3,
          enableVerticalNesting: true,
          enableHorizontalScaling: false,
          consistencyValidation: true
        }
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Level 2 execution failed');
    });
  });

  describe('Context Propagation and Consistency Validation', () => {
    it('should_PropagateContextThroughLevels_WhenValidContextProvided', async () => {
      // Arrange
      const rootModel = createTestFunctionModel('context-propagation-model', 'Context Propagation Model');
      const initialContext = {
        globalConfig: { debug: true, timeout: 5000 },
        userPreferences: { theme: 'dark', language: 'en' },
        sessionData: { token: 'abc123', userId: 'user-456' }
      };
      const executionId = 'fractal_context-propagation-model_123';

      mockFractalOrchestrationService.planFractalExecution
        .mockReturnValue(Result.ok(executionId));

      // Mock consistency validation
      mockFractalOrchestrationService.validateOrchestrationConsistency
        .mockReturnValue(Result.ok(undefined));

      const contextPropagationResult: FractalOrchestrationResult = {
        executionId,
        totalLevels: 3,
        completedLevels: 3,
        failedLevels: 0,
        totalDuration: 800,
        contextOutputs: {
          level_0_root: initialContext,
          level_1_nested: {
            ...initialContext,
            inheritedFromLevel0: true,
            levelSpecificData: 'level-1-data'
          },
          level_2_deep: {
            ...initialContext,
            inheritedFromLevel0: true,
            inheritedFromLevel1: 'level-1-data',
            levelSpecificData: 'level-2-data'
          }
        }
      };

      mockFractalOrchestrationService.executeFractalOrchestration
        .mockResolvedValue(Result.ok(contextPropagationResult));

      // Act
      const result = await useCase.execute({
        functionModel: rootModel,
        initialContext,
        orchestrationOptions: {
          maxDepth: 3,
          enableVerticalNesting: true,
          enableHorizontalScaling: false,
          consistencyValidation: true
        }
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.contextOutputs.level_1_nested).toHaveProperty('inheritedFromLevel0', true);
      expect(result.value.contextOutputs.level_2_deep).toHaveProperty('inheritedFromLevel1', 'level-1-data');
    });

    it('should_ValidateConsistency_WhenConsistencyCheckEnabled', async () => {
      // Arrange
      const rootModel = createTestFunctionModel('consistency-model', 'Consistency Model');
      const initialContext = { validateConsistency: true };
      const executionId = 'fractal_consistency-model_123';

      mockFractalOrchestrationService.planFractalExecution
        .mockReturnValue(Result.ok(executionId));

      mockFractalOrchestrationService.validateOrchestrationConsistency
        .mockReturnValue(Result.ok(undefined));

      const consistentResult: FractalOrchestrationResult = {
        executionId,
        totalLevels: 2,
        completedLevels: 2,
        failedLevels: 0,
        totalDuration: 500,
        contextOutputs: {
          level_0_root: { consistencyValidated: true },
          level_1_nested: { consistencyValidated: true }
        }
      };

      mockFractalOrchestrationService.executeFractalOrchestration
        .mockResolvedValue(Result.ok(consistentResult));

      // Act
      const result = await useCase.execute({
        functionModel: rootModel,
        initialContext,
        orchestrationOptions: {
          maxDepth: 2,
          enableVerticalNesting: true,
          enableHorizontalScaling: false,
          consistencyValidation: true
        }
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockFractalOrchestrationService.validateOrchestrationConsistency)
        .toHaveBeenCalledWith(executionId);
      expect(result.value.contextOutputs.level_0_root).toHaveProperty('consistencyValidated', true);
    });

    it('should_FailExecution_WhenConsistencyValidationFails', async () => {
      // Arrange
      const rootModel = createTestFunctionModel('inconsistent-model', 'Inconsistent Model');
      const initialContext = { inconsistentData: true };
      const executionId = 'fractal_inconsistent-model_999';

      mockFractalOrchestrationService.planFractalExecution
        .mockReturnValue(Result.ok(executionId));

      mockFractalOrchestrationService.validateOrchestrationConsistency
        .mockReturnValue(Result.fail('Circular dependency detected in fractal structure'));

      // Act
      const result = await useCase.execute({
        functionModel: rootModel,
        initialContext,
        orchestrationOptions: {
          maxDepth: 3,
          enableVerticalNesting: true,
          enableHorizontalScaling: false,
          consistencyValidation: true
        }
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Orchestration consistency validation failed');
      expect(result.error).toContain('Circular dependency detected');
    });
  });

  describe('Vertical Nesting and Horizontal Scaling', () => {
    it('should_CoordinateScaling_WhenBothNestingAndScalingEnabled', async () => {
      // Arrange
      const rootModel = createTestFunctionModel('scaling-model', 'Scaling Model');
      const initialContext = {
        scalingConfig: {
          verticalLevels: 3,
          horizontalInstances: 4,
          loadBalancing: true
        }
      };
      const executionId = 'fractal_scaling-model_456';

      mockFractalOrchestrationService.planFractalExecution
        .mockReturnValue(Result.ok(executionId));

      // Mock consistency validation
      mockFractalOrchestrationService.validateOrchestrationConsistency
        .mockReturnValue(Result.ok(undefined));

      const scalingResult: FractalOrchestrationResult = {
        executionId,
        totalLevels: 3,
        completedLevels: 3,
        failedLevels: 0,
        totalDuration: 2000,
        contextOutputs: {
          level_0_root: { scalingType: 'hybrid', processed: true },
          level_1_vertical: { nestingLevel: 1, horizontalInstances: 4, processed: true },
          level_2_scaled: { nestingLevel: 2, horizontalInstances: 4, processed: true }
        }
      };

      mockFractalOrchestrationService.executeFractalOrchestration
        .mockResolvedValue(Result.ok(scalingResult));

      // Act
      const result = await useCase.execute({
        functionModel: rootModel,
        initialContext,
        orchestrationOptions: {
          maxDepth: 3,
          enableVerticalNesting: true,
          enableHorizontalScaling: true,
          consistencyValidation: true
        }
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.totalLevels).toBe(3);
      expect(result.value.contextOutputs.level_1_vertical).toHaveProperty('horizontalInstances', 4);
      expect(result.value.contextOutputs.level_2_scaled).toHaveProperty('horizontalInstances', 4);
    });
  });

  describe('Result Aggregation and Error Handling', () => {
    it('should_AggregateResults_WhenAllLevelsComplete', async () => {
      // Arrange
      const rootModel = createTestFunctionModel('aggregation-model', 'Aggregation Model');
      const initialContext = {
        aggregationConfig: {
          collectAllLevels: true,
          includeMetrics: true,
          formatOutput: 'detailed'
        }
      };
      const executionId = 'fractal_aggregation-model_789';

      mockFractalOrchestrationService.planFractalExecution
        .mockReturnValue(Result.ok(executionId));

      // Mock consistency validation
      mockFractalOrchestrationService.validateOrchestrationConsistency
        .mockReturnValue(Result.ok(undefined));

      const aggregatedResult: FractalOrchestrationResult = {
        executionId,
        totalLevels: 4,
        completedLevels: 4,
        failedLevels: 0,
        totalDuration: 3000,
        contextOutputs: {
          level_0_root: {
            metrics: { executionTime: 100, memoryUsage: 50 },
            result: 'root-processing-complete'
          },
          level_1_branch1: {
            metrics: { executionTime: 200, memoryUsage: 75 },
            result: 'branch1-processing-complete',
            aggregatedFrom: 'level_0_root'
          },
          level_2_branch2: {
            metrics: { executionTime: 150, memoryUsage: 60 },
            result: 'branch2-processing-complete',
            aggregatedFrom: 'level_1_branch1'
          },
          level_3_leaf: {
            metrics: { executionTime: 80, memoryUsage: 40 },
            result: 'leaf-processing-complete',
            aggregatedFrom: 'level_2_branch2',
            finalAggregation: {
              totalExecutionTime: 530,
              averageMemoryUsage: 56.25,
              processedLevels: 4
            }
          }
        }
      };

      mockFractalOrchestrationService.executeFractalOrchestration
        .mockResolvedValue(Result.ok(aggregatedResult));

      // Act
      const result = await useCase.execute({
        functionModel: rootModel,
        initialContext,
        orchestrationOptions: {
          maxDepth: 4,
          enableVerticalNesting: true,
          enableHorizontalScaling: false,
          consistencyValidation: true
        }
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.totalLevels).toBe(4);
      expect(result.value.completedLevels).toBe(4);
      expect(result.value.contextOutputs.level_3_leaf).toHaveProperty('finalAggregation');
      expect(result.value.contextOutputs.level_3_leaf.finalAggregation.processedLevels).toBe(4);
    });

    it('should_HandleMaxDepthExceeded_WhenDeepNestingDetected', async () => {
      // Arrange
      const rootModel = createTestFunctionModel('deep-model', 'Deep Model');
      const initialContext = { allowDeepNesting: false };
      const executionId = 'fractal_deep-model_123';

      mockFractalOrchestrationService.planFractalExecution
        .mockReturnValue(Result.ok(executionId));

      mockFractalOrchestrationService.validateOrchestrationConsistency
        .mockReturnValue(Result.fail('Nesting depth 12 exceeds maximum allowed depth 10'));

      // Act
      const result = await useCase.execute({
        functionModel: rootModel,
        initialContext,
        orchestrationOptions: {
          maxDepth: 10,
          enableVerticalNesting: true,
          enableHorizontalScaling: false,
          consistencyValidation: true
        }
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Orchestration consistency validation failed');
      expect(result.error).toContain('exceeds maximum allowed depth');
    });
  });

  describe('Input Validation and Edge Cases', () => {
    it('should_RejectEmptyModel_WhenNoModelProvided', async () => {
      // Act
      const result = await useCase.execute({
        functionModel: null as any,
        initialContext: {},
        orchestrationOptions: {
          maxDepth: 1,
          enableVerticalNesting: false,
          enableHorizontalScaling: false,
          consistencyValidation: true
        }
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Function model is required');
    });

    it('should_RejectInvalidDepth_WhenMaxDepthIsZero', async () => {
      // Arrange
      const validModel = createTestFunctionModel('valid-model', 'Valid Model');

      // Act
      const result = await useCase.execute({
        functionModel: validModel,
        initialContext: {},
        orchestrationOptions: {
          maxDepth: 0, // Invalid: must be positive
          enableVerticalNesting: false,
          enableHorizontalScaling: false,
          consistencyValidation: true
        }
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Max depth must be greater than 0');
    });

    it('should_RejectExcessiveDepth_WhenMaxDepthExceedsLimit', async () => {
      // Arrange
      const validModel = createTestFunctionModel('valid-model', 'Valid Model');

      // Act
      const result = await useCase.execute({
        functionModel: validModel,
        initialContext: {},
        orchestrationOptions: {
          maxDepth: 25, // Exceeds limit of 20
          enableVerticalNesting: false,
          enableHorizontalScaling: false,
          consistencyValidation: true
        }
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Max depth cannot exceed 20');
    });

    it('should_ProvideDefaultContext_WhenNoInitialContextProvided', async () => {
      // Arrange
      const validModel = createTestFunctionModel('valid-model', 'Valid Model');
      const executionId = 'fractal_valid-model_123';

      mockFractalOrchestrationService.planFractalExecution
        .mockReturnValue(Result.ok(executionId));

      // Mock consistency validation (disabled for this test)
      mockFractalOrchestrationService.validateOrchestrationConsistency
        .mockReturnValue(Result.ok(undefined));

      const defaultResult = createFractalOrchestrationResult(executionId);
      mockFractalOrchestrationService.executeFractalOrchestration
        .mockResolvedValue(Result.ok(defaultResult));

      // Act
      const result = await useCase.execute({
        functionModel: validModel,
        initialContext: null as any, // Will be defaulted to {}
        orchestrationOptions: {
          maxDepth: 2,
          enableVerticalNesting: false,
          enableHorizontalScaling: false,
          consistencyValidation: false
        }
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockFractalOrchestrationService.planFractalExecution)
        .toHaveBeenCalledWith(validModel, {});
    });
  });
});