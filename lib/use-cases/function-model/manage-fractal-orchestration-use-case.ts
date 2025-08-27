import { FunctionModel } from '../../domain/entities/function-model';
import { FractalOrchestrationService, FractalOrchestrationResult } from '../../domain/services/fractal-orchestration-service';
import { Result } from '../../domain/shared/result';

export interface ManageFractalOrchestrationCommand {
  functionModel: FunctionModel;
  initialContext: Record<string, any>;
  orchestrationOptions: {
    maxDepth: number;
    enableVerticalNesting: boolean;
    enableHorizontalScaling: boolean;
    consistencyValidation: boolean;
  };
}

/**
 * UC-013: Fractal Orchestration Management
 * 
 * Manages multi-level function model execution with:
 * 1. Fractal execution planning for nested models
 * 2. Hierarchical execution level creation and coordination
 * 3. Context propagation between levels (up/down the hierarchy)
 * 4. Vertical nesting and horizontal scaling coordination
 * 5. Orchestration consistency validation across levels
 * 6. Result aggregation from all execution levels
 * 
 * This use case orchestrates domain services to achieve complex
 * multi-level workflow execution with proper error handling and recovery.
 */
export class ManageFractalOrchestrationUseCase {
  constructor(
    private fractalOrchestrationService: FractalOrchestrationService
  ) {}

  /**
   * Execute fractal orchestration for a function model hierarchy
   * 
   * Main Success Scenario:
   * 1. Validate input parameters
   * 2. Plan fractal execution for nested models
   * 3. Validate orchestration consistency (if enabled)
   * 4. Execute fractal orchestration across all levels
   * 5. Return aggregated results from all levels
   */
  async execute(command: ManageFractalOrchestrationCommand): Promise<Result<FractalOrchestrationResult>> {
    try {
      // Step 1: Validate input parameters
      const validationResult = this.validateCommand(command);
      if (validationResult.isFailure) {
        return Result.fail<FractalOrchestrationResult>(validationResult.error);
      }

      // Step 2: Plan fractal execution for nested models
      const planningResult = this.fractalOrchestrationService.planFractalExecution(
        command.functionModel,
        command.initialContext
      );

      if (planningResult.isFailure) {
        return Result.fail<FractalOrchestrationResult>(
          `Failed to plan fractal orchestration: ${planningResult.error}`
        );
      }

      const executionId = planningResult.value;

      // Step 3: Validate orchestration consistency (if enabled)
      if (command.orchestrationOptions.consistencyValidation) {
        const consistencyResult = this.fractalOrchestrationService.validateOrchestrationConsistency(executionId);
        if (consistencyResult.isFailure) {
          return Result.fail<FractalOrchestrationResult>(
            `Orchestration consistency validation failed: ${consistencyResult.error}`
          );
        }
      }

      // Step 4: Execute fractal orchestration across all levels
      // This handles:
      // - Hierarchical execution level management
      // - Context propagation up/down the hierarchy
      // - Vertical nesting and horizontal scaling coordination
      // - Result aggregation from all levels
      const executionResult = await this.fractalOrchestrationService.executeFractalOrchestration(executionId);

      if (executionResult.isFailure) {
        return Result.fail<FractalOrchestrationResult>(
          `Fractal orchestration execution failed: ${executionResult.error}`
        );
      }

      // Step 5: Return aggregated results from all levels
      return Result.ok<FractalOrchestrationResult>(executionResult.value);

    } catch (error) {
      return Result.fail<FractalOrchestrationResult>(
        `Unexpected error during fractal orchestration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate the fractal orchestration command parameters
   */
  private validateCommand(command: ManageFractalOrchestrationCommand): Result<void> {
    if (!command.functionModel) {
      return Result.fail<void>('Function model is required');
    }

    if (!command.orchestrationOptions) {
      return Result.fail<void>('Orchestration options are required');
    }

    if (command.orchestrationOptions.maxDepth <= 0) {
      return Result.fail<void>('Max depth must be greater than 0');
    }

    if (command.orchestrationOptions.maxDepth > 20) {
      return Result.fail<void>('Max depth cannot exceed 20 to prevent resource exhaustion');
    }

    if (!command.initialContext) {
      // Provide default empty context if none provided
      command.initialContext = {};
    }

    // Validate that the function model has a valid structure
    if (!command.functionModel.modelId || command.functionModel.modelId.trim().length === 0) {
      return Result.fail<void>('Function model must have a valid model ID');
    }

    return Result.ok<void>(undefined);
  }
}