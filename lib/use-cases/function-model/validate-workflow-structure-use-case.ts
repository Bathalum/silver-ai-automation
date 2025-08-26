import { FunctionModel } from '../../domain/entities/function-model';
import { ActionNode } from '../../domain/entities/action-node';
import { Node } from '../../domain/entities/node';
import { ValidationResult } from '../../domain/entities/function-model';
import { Result } from '../../domain/shared/result';
import { ValidateWorkflowCommand } from '../commands/model-commands';

// Domain service interfaces for validation
export interface IWorkflowValidationService {
  validateStructuralIntegrity(nodes: Node[], actionNodes: ActionNode[]): Promise<Result<ValidationResult>>;
}

export interface IBusinessRuleValidationService {
  validateBusinessRules(model: FunctionModel, actionNodes: ActionNode[]): Promise<Result<ValidationResult>>;
}

export interface IExecutionReadinessService {
  validateExecutionReadiness(actionNodes: ActionNode[], executionContext: any): Promise<Result<ValidationResult>>;
}

export interface IContextValidationService {
  validateContextIntegrity(model: FunctionModel, nodes: Node[]): Promise<Result<ValidationResult>>;
}

export interface ICrossFeatureValidationService {
  validateCrossFeatureDependencies(model: FunctionModel): Promise<Result<ValidationResult>>;
}

export interface IFunctionModelRepository {
  findById(id: string): Promise<Result<FunctionModel>>;
}

// Comprehensive validation result that aggregates all validation categories
export interface WorkflowValidationResult {
  overallValid: boolean;
  validationTimestamp: Date;
  modelId: string;
  modelVersion: string;
  validationLevel: string;
  
  // Individual validation category results
  structuralValidation: ValidationResult;
  businessRuleValidation: ValidationResult;
  executionReadinessValidation: ValidationResult;
  contextValidation: ValidationResult;
  crossFeatureValidation: ValidationResult;
  
  // Summary metrics
  totalErrors: number;
  totalWarnings: number;
  validationDurationMs: number;
}

export class ValidateWorkflowStructureUseCase {
  constructor(
    private modelRepository: IFunctionModelRepository,
    private workflowValidationService: IWorkflowValidationService,
    private businessRuleValidationService: IBusinessRuleValidationService,
    private executionReadinessService: IExecutionReadinessService,
    private contextValidationService: IContextValidationService,
    private crossFeatureValidationService: ICrossFeatureValidationService
  ) {}

  async execute(command: ValidateWorkflowCommand): Promise<Result<WorkflowValidationResult>> {
    const startTime = Date.now();
    
    try {
      // Validate command
      const validationResult = this.validateCommand(command);
      if (validationResult.isFailure) {
        return Result.fail<WorkflowValidationResult>(validationResult.error);
      }

      // Retrieve the function model
      const modelResult = await this.modelRepository.findById(command.modelId);
      if (modelResult.isFailure) {
        return Result.fail<WorkflowValidationResult>(`Failed to retrieve model: ${modelResult.error}`);
      }

      const model = modelResult.value;
      const nodes = Array.from(model.nodes.values());
      const actionNodes = Array.from(model.actionNodes.values());

      // Initialize result structure with empty validation results
      let workflowValidationResult: WorkflowValidationResult = {
        overallValid: true,
        validationTimestamp: new Date(),
        modelId: command.modelId,
        modelVersion: model.version.toString(),
        validationLevel: command.validationLevel,
        
        structuralValidation: { isValid: true, errors: [], warnings: [] },
        businessRuleValidation: { isValid: true, errors: [], warnings: [] },
        executionReadinessValidation: { isValid: true, errors: [], warnings: [] },
        contextValidation: { isValid: true, errors: [], warnings: [] },
        crossFeatureValidation: { isValid: true, errors: [], warnings: [] },
        
        totalErrors: 0,
        totalWarnings: 0,
        validationDurationMs: 0
      };

      // Execute validations based on validation level
      if (this.shouldRunStructuralValidation(command.validationLevel)) {
        const structuralResult = await this.workflowValidationService.validateStructuralIntegrity(nodes, actionNodes);
        workflowValidationResult.structuralValidation = structuralResult.isSuccess 
          ? structuralResult.value 
          : { isValid: false, errors: [structuralResult.error], warnings: [] };
      }

      if (this.shouldRunBusinessRuleValidation(command.validationLevel)) {
        const businessRuleResult = await this.businessRuleValidationService.validateBusinessRules(model, actionNodes);
        workflowValidationResult.businessRuleValidation = businessRuleResult.isSuccess 
          ? businessRuleResult.value 
          : { isValid: false, errors: [businessRuleResult.error], warnings: [] };
      }

      if (this.shouldRunExecutionReadinessValidation(command.validationLevel)) {
        const executionContext = this.buildExecutionContext(command, model);
        const executionResult = await this.executionReadinessService.validateExecutionReadiness(actionNodes, executionContext);
        workflowValidationResult.executionReadinessValidation = executionResult.isSuccess 
          ? executionResult.value 
          : { isValid: false, errors: [executionResult.error], warnings: [] };
      }

      if (this.shouldRunContextValidation(command.validationLevel)) {
        const contextResult = await this.contextValidationService.validateContextIntegrity(model, nodes);
        workflowValidationResult.contextValidation = contextResult.isSuccess 
          ? contextResult.value 
          : { isValid: false, errors: [contextResult.error], warnings: [] };
      }

      if (this.shouldRunCrossFeatureValidation(command.validationLevel)) {
        const crossFeatureResult = await this.crossFeatureValidationService.validateCrossFeatureDependencies(model);
        workflowValidationResult.crossFeatureValidation = crossFeatureResult.isSuccess 
          ? crossFeatureResult.value 
          : { isValid: false, errors: [crossFeatureResult.error], warnings: [] };
      }

      // Aggregate results
      const allValidations = [
        workflowValidationResult.structuralValidation,
        workflowValidationResult.businessRuleValidation,
        workflowValidationResult.executionReadinessValidation,
        workflowValidationResult.contextValidation,
        workflowValidationResult.crossFeatureValidation
      ];

      // Calculate overall validity and totals
      workflowValidationResult.overallValid = allValidations.every(validation => validation.isValid);
      workflowValidationResult.totalErrors = allValidations.reduce((total, validation) => total + validation.errors.length, 0);
      workflowValidationResult.totalWarnings = allValidations.reduce((total, validation) => total + validation.warnings.length, 0);
      workflowValidationResult.validationDurationMs = Date.now() - startTime;

      return Result.ok<WorkflowValidationResult>(workflowValidationResult);

    } catch (error) {
      return Result.fail<WorkflowValidationResult>(
        `Failed to validate workflow structure: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateCommand(command: ValidateWorkflowCommand): Result<void> {
    if (!command.modelId || command.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    if (!command.userId || command.userId.trim().length === 0) {
      return Result.fail<void>('User ID is required');
    }

    const validLevels = ['structural', 'business-rules', 'execution-readiness', 'context', 'cross-feature', 'full'];
    if (!validLevels.includes(command.validationLevel)) {
      return Result.fail<void>(`Invalid validation level: ${command.validationLevel}. Must be one of: ${validLevels.join(', ')}`);
    }

    return Result.ok<void>(undefined);
  }

  private shouldRunStructuralValidation(validationLevel: string): boolean {
    return ['structural', 'full'].includes(validationLevel);
  }

  private shouldRunBusinessRuleValidation(validationLevel: string): boolean {
    return ['business-rules', 'full'].includes(validationLevel);
  }

  private shouldRunExecutionReadinessValidation(validationLevel: string): boolean {
    return ['execution-readiness', 'full'].includes(validationLevel);
  }

  private shouldRunContextValidation(validationLevel: string): boolean {
    return ['context', 'full'].includes(validationLevel);
  }

  private shouldRunCrossFeatureValidation(validationLevel: string): boolean {
    return ['cross-feature', 'full'].includes(validationLevel);
  }

  private buildExecutionContext(command: ValidateWorkflowCommand, model: FunctionModel): any {
    return {
      userId: command.userId,
      modelId: command.modelId,
      modelVersion: model.version.toString(),
      organizationId: model.metadata.organizationId,
      validationTimestamp: new Date(),
      executionEnvironment: 'validation'
    };
  }
}