import { ValidateWorkflowStructureUseCase, WorkflowValidationResult } from '../../../../lib/use-cases/function-model/validate-workflow-structure-use-case';
import { ValidateWorkflowCommand } from '../../../../lib/use-cases/commands/model-commands';
import { FunctionModel } from '../../../../lib/domain/entities/function-model';
import { ActionNode } from '../../../../lib/domain/entities/action-node';
import { IONode } from '../../../../lib/domain/entities/io-node';
import { StageNode } from '../../../../lib/domain/entities/stage-node';
import { FunctionModelContainerNode } from '../../../../lib/domain/entities/function-model-container-node';
import { Result } from '../../../../lib/domain/shared/result';
import { TestFactories } from '../../../utils/test-fixtures';

// Mock validation services
interface IWorkflowValidationService {
  validateStructuralIntegrity(nodes: any[], actionNodes: any[]): Promise<Result<any>>;
}

interface IBusinessRuleValidationService {
  validateBusinessRules(model: FunctionModel, actionNodes: any[]): Promise<Result<any>>;
}

interface IExecutionReadinessService {
  validateExecutionReadiness(actionNodes: any[], context: any): Promise<Result<any>>;
}

interface IContextValidationService {
  validateContextIntegrity(model: FunctionModel, nodes: any[]): Promise<Result<any>>;
}

interface ICrossFeatureValidationService {
  validateCrossFeatureDependencies(model: FunctionModel): Promise<Result<any>>;
}

interface IFunctionModelRepository {
  findById(id: string): Promise<Result<FunctionModel>>;
}

describe('ValidateWorkflowStructureUseCase', () => {
  let useCase: ValidateWorkflowStructureUseCase;
  let mockRepository: jest.Mocked<IFunctionModelRepository>;
  let mockStructuralValidation: jest.Mocked<IWorkflowValidationService>;
  let mockBusinessRuleValidation: jest.Mocked<IBusinessRuleValidationService>;
  let mockExecutionReadinessValidation: jest.Mocked<IExecutionReadinessService>;
  let mockContextValidation: jest.Mocked<IContextValidationService>;
  let mockCrossFeatureValidation: jest.Mocked<ICrossFeatureValidationService>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
    } as jest.Mocked<IFunctionModelRepository>;

    mockStructuralValidation = {
      validateStructuralIntegrity: jest.fn(),
    } as jest.Mocked<IWorkflowValidationService>;

    mockBusinessRuleValidation = {
      validateBusinessRules: jest.fn(),
    } as jest.Mocked<IBusinessRuleValidationService>;

    mockExecutionReadinessValidation = {
      validateExecutionReadiness: jest.fn(),
    } as jest.Mocked<IExecutionReadinessService>;

    mockContextValidation = {
      validateContextIntegrity: jest.fn(),
    } as jest.Mocked<IContextValidationService>;

    mockCrossFeatureValidation = {
      validateCrossFeatureDependencies: jest.fn(),
    } as jest.Mocked<ICrossFeatureValidationService>;

    useCase = new ValidateWorkflowStructureUseCase(
      mockRepository,
      mockStructuralValidation,
      mockBusinessRuleValidation,
      mockExecutionReadinessValidation,
      mockContextValidation,
      mockCrossFeatureValidation
    );
  });

  describe('Structural Integrity Validation (12 scenarios)', () => {
    it('should validate node connectivity successfully', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'full'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureValidation.validateCrossFeatureDependencies.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(true);
      expect(mockStructuralValidation.validateStructuralIntegrity).toHaveBeenCalledWith(
        Array.from(model.nodes.values()),
        Array.from(model.actionNodes.values())
      );
    });

    it('should detect circular dependencies', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'structural'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Circular dependency detected: Node A -> Node B -> Node A'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.structuralValidation.errors).toContain('Circular dependency detected: Node A -> Node B -> Node A');
    });

    it('should identify orphaned nodes', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'structural'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Multiple isolated nodes detected: Orphan Node 1, Orphan Node 2'] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.structuralValidation.warnings).toContain('Multiple isolated nodes detected: Orphan Node 1, Orphan Node 2');
    });

    it('should validate node reference integrity', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'structural'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Node ProcessData references non-existent dependency invalid-node-id'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.structuralValidation.errors).toContain('Node ProcessData references non-existent dependency invalid-node-id');
    });

    it('should detect duplicate node IDs', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'structural'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Duplicate node ID detected: node-123'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.structuralValidation.errors).toContain('Duplicate node ID detected: node-123');
    });

    it('should validate dependency chain consistency', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'structural'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Deep dependency chain detected - consider restructuring for better maintainability'] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.structuralValidation.warnings).toContain('Deep dependency chain detected - consider restructuring for better maintainability');
    });

    it('should detect missing essential node types', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'structural'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Workflow must contain at least one IO node to define input/output boundaries'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.structuralValidation.errors).toContain('Workflow must contain at least one IO node to define input/output boundaries');
    });

    it('should validate node type compatibility', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'structural'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Incompatible node types in dependency chain: IONode cannot depend on StageNode'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.structuralValidation.errors).toContain('Incompatible node types in dependency chain: IONode cannot depend on StageNode');
    });

    it('should detect self-referential dependencies', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'structural'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Node cannot depend on itself: ProcessNode'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.structuralValidation.errors).toContain('Node cannot depend on itself: ProcessNode');
    });

    it('should validate workflow complexity boundaries', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'structural'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Large workflow detected - consider breaking into smaller, nested function models'] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.structuralValidation.warnings).toContain('Large workflow detected - consider breaking into smaller, nested function models');
    });

    it('should validate branch convergence patterns', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'structural'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Multiple execution paths detected without convergence point'] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.structuralValidation.warnings).toContain('Multiple execution paths detected without convergence point');
    });

    it('should detect malformed dependency declarations', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'structural'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Malformed dependency declaration in node: invalid dependency format'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.structuralValidation.errors).toContain('Malformed dependency declaration in node: invalid dependency format');
    });
  });

  describe('Business Rule Compliance Validation (10 scenarios)', () => {
    it('should validate required node presence', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'business-rules'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Required input boundary node is missing'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.businessRuleValidation.errors).toContain('Required input boundary node is missing');
    });

    it('should validate node configuration completeness', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'business-rules'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Action node ProcessData missing required configuration: apiEndpoint'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.businessRuleValidation.errors).toContain('Action node ProcessData missing required configuration: apiEndpoint');
    });

    it('should validate model permissions and ownership', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'business-rules'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['User lacks permission to validate this workflow'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.businessRuleValidation.errors).toContain('User lacks permission to validate this workflow');
    });

    it('should validate workflow naming conventions', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'business-rules'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Node names should follow organization naming conventions'] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.businessRuleValidation.warnings).toContain('Node names should follow organization naming conventions');
    });

    it('should validate resource allocation limits', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'business-rules'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Total resource allocation exceeds organization limits'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.businessRuleValidation.errors).toContain('Total resource allocation exceeds organization limits');
    });

    it('should validate compliance with organizational policies', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'business-rules'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Workflow violates data retention policy: sensitive data processing without encryption'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.businessRuleValidation.errors).toContain('Workflow violates data retention policy: sensitive data processing without encryption');
    });

    it('should validate model versioning compliance', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'business-rules'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Model version should be incremented for structural changes'] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.businessRuleValidation.warnings).toContain('Model version should be incremented for structural changes');
    });

    it('should validate security requirements', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'business-rules'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Security scan required for external API integrations'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.businessRuleValidation.errors).toContain('Security scan required for external API integrations');
    });

    it('should validate data flow constraints', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'business-rules'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['PII data cannot flow to external systems without explicit consent'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.businessRuleValidation.errors).toContain('PII data cannot flow to external systems without explicit consent');
    });

    it('should validate workflow performance requirements', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'business-rules'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Workflow may exceed performance SLA due to sequential processing'] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.businessRuleValidation.warnings).toContain('Workflow may exceed performance SLA due to sequential processing');
    });
  });

  describe('Execution Readiness Validation (10 scenarios)', () => {
    it('should validate action node configurations', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'execution-readiness'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Action node APICall missing required configuration: endpoint URL'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.executionReadinessValidation.errors).toContain('Action node APICall missing required configuration: endpoint URL');
    });

    it('should validate resource availability', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'execution-readiness'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Required compute resource pool unavailable for high-memory operations'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.executionReadinessValidation.errors).toContain('Required compute resource pool unavailable for high-memory operations');
    });

    it('should validate execution order consistency', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'execution-readiness'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Container ProcessingStage has actions with duplicate execution orders'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.executionReadinessValidation.errors).toContain('Container ProcessingStage has actions with duplicate execution orders');
    });

    it('should validate parallel execution settings', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'execution-readiness'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Container DataProcessing has multiple parallel actions with the same priority'] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.executionReadinessValidation.warnings).toContain('Container DataProcessing has multiple parallel actions with the same priority');
    });

    it('should validate retry and error handling configurations', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'execution-readiness'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Critical action ExternalAPI missing error handling configuration'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.executionReadinessValidation.errors).toContain('Critical action ExternalAPI missing error handling configuration');
    });

    it('should validate timeout configurations', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'execution-readiness'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Long-running action DataProcessing should specify timeout configuration'] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.executionReadinessValidation.warnings).toContain('Long-running action DataProcessing should specify timeout configuration');
    });

    it('should validate external dependency availability', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'execution-readiness'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['External service dependency api.example.com is currently unavailable'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.executionReadinessValidation.errors).toContain('External service dependency api.example.com is currently unavailable');
    });

    it('should validate execution environment requirements', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'execution-readiness'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Execution environment missing required Python library: pandas>=2.0.0'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.executionReadinessValidation.errors).toContain('Execution environment missing required Python library: pandas>=2.0.0');
    });

    it('should validate data schema compatibility', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'execution-readiness'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Data schema mismatch between Transform action output and Load action input'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.executionReadinessValidation.errors).toContain('Data schema mismatch between Transform action output and Load action input');
    });

    it('should validate execution permissions', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'execution-readiness'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Insufficient permissions to execute database action: requires admin role'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.executionReadinessValidation.errors).toContain('Insufficient permissions to execute database action: requires admin role');
    });
  });

  describe('Context Validation (10 scenarios)', () => {
    it('should validate hierarchical context access', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'context'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Action node accesses context from higher hierarchy level without proper inheritance'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.contextValidation.errors).toContain('Action node accesses context from higher hierarchy level without proper inheritance');
    });

    it('should validate context data flow', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'context'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Context variable userSession used before being defined'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.contextValidation.errors).toContain('Context variable userSession used before being defined');
    });

    it('should validate context variable scoping', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'context'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Context variable tempData may be accessed outside its intended scope'] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.contextValidation.warnings).toContain('Context variable tempData may be accessed outside its intended scope');
    });

    it('should validate context inheritance patterns', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'context'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Container node has duplicate inherited contexts: userContext'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.contextValidation.errors).toContain('Container node has duplicate inherited contexts: userContext');
    });

    it('should validate context type consistency', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'context'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Context type mismatch: expected string but got number for variable userId'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.contextValidation.errors).toContain('Context type mismatch: expected string but got number for variable userId');
    });

    it('should validate context persistence requirements', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'context'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Context variable stateData may need persistence configuration for long-running workflows'] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.contextValidation.warnings).toContain('Context variable stateData may need persistence configuration for long-running workflows');
    });

    it('should validate context security boundaries', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'context'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Sensitive context variable apiKey exposed to insecure action node'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.contextValidation.errors).toContain('Sensitive context variable apiKey exposed to insecure action node');
    });

    it('should validate context lifecycle management', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'context'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Context variable resourceHandle not properly cleaned up after use'] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.contextValidation.warnings).toContain('Context variable resourceHandle not properly cleaned up after use');
    });

    it('should validate context memory usage', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'context'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['Large context object may impact performance: consider optimizing data structure'] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.contextValidation.warnings).toContain('Large context object may impact performance: consider optimizing data structure');
    });

    it('should validate context versioning compatibility', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'context'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Context schema version incompatible with workflow version'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.contextValidation.errors).toContain('Context schema version incompatible with workflow version');
    });
  });

  describe('Cross-Feature Integration Validation (5 scenarios)', () => {
    it('should validate external dependency availability', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'cross-feature'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockCrossFeatureValidation.validateCrossFeatureDependencies.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Referenced external feature module UserManagement is not available'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.crossFeatureValidation.errors).toContain('Referenced external feature module UserManagement is not available');
    });

    it('should validate API contract compatibility', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'cross-feature'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockCrossFeatureValidation.validateCrossFeatureDependencies.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['API contract mismatch with PaymentService: expected field amount is missing'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.crossFeatureValidation.errors).toContain('API contract mismatch with PaymentService: expected field amount is missing');
    });

    it('should validate service versioning compatibility', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'cross-feature'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockCrossFeatureValidation.validateCrossFeatureDependencies.mockResolvedValue(
        Result.ok({ 
          isValid: true, 
          errors: [], 
          warnings: ['NotificationService v2.1 is deprecated, consider upgrading to v3.0'] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.crossFeatureValidation.warnings).toContain('NotificationService v2.1 is deprecated, consider upgrading to v3.0');
    });

    it('should validate cross-system data flow', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'cross-feature'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockCrossFeatureValidation.validateCrossFeatureDependencies.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Cross-system data flow violates security boundary: PII data sent to external system'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.crossFeatureValidation.errors).toContain('Cross-system data flow violates security boundary: PII data sent to external system');
    });

    it('should validate integration authentication requirements', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'cross-feature'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockCrossFeatureValidation.validateCrossFeatureDependencies.mockResolvedValue(
        Result.ok({ 
          isValid: false, 
          errors: ['Missing authentication configuration for external service integration'], 
          warnings: [] 
        })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.crossFeatureValidation.errors).toContain('Missing authentication configuration for external service integration');
    });
  });

  describe('Clean Architecture Compliance (5 scenarios)', () => {
    it('should validate use case coordination patterns', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'full'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      
      // Mock successful validation services
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureValidation.validateCrossFeatureDependencies.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(true);
      
      // Verify all validation services were called with correct parameters
      expect(mockStructuralValidation.validateStructuralIntegrity).toHaveBeenCalledWith(
        Array.from(model.nodes.values()),
        Array.from(model.actionNodes.values())
      );
      expect(mockBusinessRuleValidation.validateBusinessRules).toHaveBeenCalledWith(
        model,
        Array.from(model.actionNodes.values())
      );
      expect(mockExecutionReadinessValidation.validateExecutionReadiness).toHaveBeenCalledWith(
        Array.from(model.actionNodes.values()),
        expect.any(Object)
      );
      expect(mockContextValidation.validateContextIntegrity).toHaveBeenCalledWith(
        model,
        Array.from(model.nodes.values())
      );
      expect(mockCrossFeatureValidation.validateCrossFeatureDependencies).toHaveBeenCalledWith(model);
    });

    it('should handle repository failures gracefully', async () => {
      // Arrange
      const command: ValidateWorkflowCommand = {
        modelId: 'non-existent-model',
        userId: 'user-123',
        validationLevel: 'full'
      };

      mockRepository.findById.mockResolvedValue(Result.fail('Model not found'));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Model not found');
    });

    it('should aggregate validation results correctly', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'full'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      
      // Mock mixed validation results
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ isValid: false, errors: ['Structural error'], warnings: ['Structural warning'] })
      );
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: ['Business rule warning'] })
      );
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ isValid: false, errors: ['Execution error'], warnings: [] })
      );
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureValidation.validateCrossFeatureDependencies.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false); // Due to structural and execution errors
      expect(result.value.structuralValidation.errors).toEqual(['Structural error']);
      expect(result.value.structuralValidation.warnings).toEqual(['Structural warning']);
      expect(result.value.businessRuleValidation.warnings).toEqual(['Business rule warning']);
      expect(result.value.executionReadinessValidation.errors).toEqual(['Execution error']);
    });

    it('should respect validation level filtering', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'structural'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockStructuralValidation.validateStructuralIntegrity).toHaveBeenCalled();
      expect(mockBusinessRuleValidation.validateBusinessRules).not.toHaveBeenCalled();
      expect(mockExecutionReadinessValidation.validateExecutionReadiness).not.toHaveBeenCalled();
      expect(mockContextValidation.validateContextIntegrity).not.toHaveBeenCalled();
      expect(mockCrossFeatureValidation.validateCrossFeatureDependencies).not.toHaveBeenCalled();
    });

    it('should handle validation service failures without breaking the overall process', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'full'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      
      // Mock service failure
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.fail('Structural validation service unavailable')
      );
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureValidation.validateCrossFeatureDependencies.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false); // Due to service failure
      expect(result.value.structuralValidation.errors).toContain('Structural validation service unavailable');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty workflow models', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      model.nodes.clear();
      model.actionNodes.clear();
      
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'full'
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));
      mockStructuralValidation.validateStructuralIntegrity.mockResolvedValue(
        Result.ok({ isValid: false, errors: ['Empty workflow detected'], warnings: [] })
      );
      mockBusinessRuleValidation.validateBusinessRules.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockExecutionReadinessValidation.validateExecutionReadiness.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockContextValidation.validateContextIntegrity.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );
      mockCrossFeatureValidation.validateCrossFeatureDependencies.mockResolvedValue(
        Result.ok({ isValid: true, errors: [], warnings: [] })
      );

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.overallValid).toBe(false);
      expect(result.value.structuralValidation.errors).toContain('Empty workflow detected');
    });

    it('should handle invalid validation levels', async () => {
      // Arrange
      const model = TestFactories.createCompleteWorkflow();
      const command: ValidateWorkflowCommand = {
        modelId: model.modelId,
        userId: 'user-123',
        validationLevel: 'invalid-level' as any
      };

      mockRepository.findById.mockResolvedValue(Result.ok(model));

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invalid validation level');
    });
  });
});