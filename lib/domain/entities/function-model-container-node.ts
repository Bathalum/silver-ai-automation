import { ActionNode, ActionNodeProps } from './action-node';
import { ActionNodeType } from '../enums';
import { Result } from '../shared/result';

export interface FunctionModelContainerData {
  nestedModelId: string;
  contextMapping: Record<string, any>;
  outputExtraction: {
    extractedOutputs: string[];
    outputTransformations?: Record<string, any>;
  };
  executionPolicy: {
    executionTrigger: 'manual' | 'automatic' | 'conditional';
    conditions?: Record<string, any>;
    timeout?: number;
  };
  contextInheritance: {
    inheritedContexts: string[];
    contextTransformations?: Record<string, any>;
  };
  orchestrationMode: 'embedded' | 'parallel' | 'sequential';
}

export interface FunctionModelContainerProps extends ActionNodeProps {
  containerData: FunctionModelContainerData;
}

export class FunctionModelContainerNode extends ActionNode {
  protected declare props: FunctionModelContainerProps;

  private constructor(props: FunctionModelContainerProps) {
    super(props);
  }

  public static create(props: Omit<FunctionModelContainerProps, 'createdAt' | 'updatedAt'>): Result<FunctionModelContainerNode> {
    const now = new Date();
    const nodeProps: FunctionModelContainerProps = {
      ...props,
      createdAt: now,
      updatedAt: now,
    };

    // Validate container-specific business rules
    const validationResult = FunctionModelContainerNode.validateContainerData(props.containerData);
    if (validationResult.isFailure) {
      return Result.fail<FunctionModelContainerNode>(validationResult.error);
    }

    return Result.ok<FunctionModelContainerNode>(new FunctionModelContainerNode(nodeProps));
  }

  public get containerData(): Readonly<FunctionModelContainerData> {
    return this.props.containerData;
  }

  public getActionType(): string {
    return ActionNodeType.FUNCTION_MODEL_CONTAINER;
  }

  public updateNestedModelId(modelId: string): Result<void> {
    if (!modelId || modelId.trim().length === 0) {
      return Result.fail<void>('Nested model ID cannot be empty');
    }

    if (modelId.trim() === this.modelId) {
      return Result.fail<void>('Cannot nest a model within itself');
    }

    this.props.containerData.nestedModelId = modelId.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateContextMapping(mapping: Record<string, any>): Result<void> {
    this.props.containerData.contextMapping = { ...mapping };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateOutputExtraction(extraction: {
    extractedOutputs: string[];
    outputTransformations?: Record<string, any>;
  }): Result<void> {
    if (extraction.extractedOutputs.length === 0) {
      return Result.fail<void>('At least one output must be extracted');
    }

    const duplicateOutputs = extraction.extractedOutputs.filter((output, index) => 
      extraction.extractedOutputs.indexOf(output) !== index
    );
    if (duplicateOutputs.length > 0) {
      return Result.fail<void>('Extracted outputs must be unique');
    }

    this.props.containerData.outputExtraction = {
      extractedOutputs: [...extraction.extractedOutputs],
      outputTransformations: extraction.outputTransformations ? { ...extraction.outputTransformations } : undefined,
    };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateExecutionPolicy(policy: {
    executionTrigger: 'manual' | 'automatic' | 'conditional';
    conditions?: Record<string, any>;
    timeout?: number;
  }): Result<void> {
    const validTriggers = ['manual', 'automatic', 'conditional'];
    if (!validTriggers.includes(policy.executionTrigger)) {
      return Result.fail<void>('Invalid execution trigger');
    }

    if (policy.executionTrigger === 'conditional' && !policy.conditions) {
      return Result.fail<void>('Conditional execution trigger requires conditions');
    }

    if (policy.timeout !== undefined && (policy.timeout <= 0 || policy.timeout > 7200)) {
      return Result.fail<void>('Timeout must be between 0 and 7200 seconds (2 hours)');
    }

    this.props.containerData.executionPolicy = {
      executionTrigger: policy.executionTrigger,
      conditions: policy.conditions ? { ...policy.conditions } : undefined,
      timeout: policy.timeout,
    };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateContextInheritance(inheritance: {
    inheritedContexts: string[];
    contextTransformations?: Record<string, any>;
  }): Result<void> {
    const duplicateContexts = inheritance.inheritedContexts.filter((context, index) => 
      inheritance.inheritedContexts.indexOf(context) !== index
    );
    if (duplicateContexts.length > 0) {
      return Result.fail<void>('Inherited contexts must be unique');
    }

    this.props.containerData.contextInheritance = {
      inheritedContexts: [...inheritance.inheritedContexts],
      contextTransformations: inheritance.contextTransformations ? { ...inheritance.contextTransformations } : undefined,
    };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateOrchestrationMode(mode: 'embedded' | 'parallel' | 'sequential'): Result<void> {
    const validModes = ['embedded', 'parallel', 'sequential'];
    if (!validModes.includes(mode)) {
      return Result.fail<void>('Invalid orchestration mode');
    }

    this.props.containerData.orchestrationMode = mode;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addExtractedOutput(output: string): Result<void> {
    if (!output || output.trim().length === 0) {
      return Result.fail<void>('Output name cannot be empty');
    }

    const trimmedOutput = output.trim();
    if (this.props.containerData.outputExtraction.extractedOutputs.includes(trimmedOutput)) {
      return Result.fail<void>('Output already exists');
    }

    this.props.containerData.outputExtraction.extractedOutputs.push(trimmedOutput);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeExtractedOutput(output: string): Result<void> {
    const index = this.props.containerData.outputExtraction.extractedOutputs.indexOf(output.trim());
    if (index === -1) {
      return Result.fail<void>('Output does not exist');
    }

    if (this.props.containerData.outputExtraction.extractedOutputs.length === 1) {
      return Result.fail<void>('At least one output must be extracted');
    }

    this.props.containerData.outputExtraction.extractedOutputs.splice(index, 1);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addInheritedContext(context: string): Result<void> {
    if (!context || context.trim().length === 0) {
      return Result.fail<void>('Context name cannot be empty');
    }

    const trimmedContext = context.trim();
    if (this.props.containerData.contextInheritance.inheritedContexts.includes(trimmedContext)) {
      return Result.fail<void>('Context already inherited');
    }

    this.props.containerData.contextInheritance.inheritedContexts.push(trimmedContext);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeInheritedContext(context: string): Result<void> {
    const index = this.props.containerData.contextInheritance.inheritedContexts.indexOf(context.trim());
    if (index === -1) {
      return Result.fail<void>('Context is not inherited');
    }

    this.props.containerData.contextInheritance.inheritedContexts.splice(index, 1);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  private static validateContainerData(containerData: FunctionModelContainerData): Result<void> {
    if (!containerData.nestedModelId || containerData.nestedModelId.trim().length === 0) {
      return Result.fail<void>('Nested model ID is required');
    }

    // Validate execution policy
    const validTriggers = ['manual', 'automatic', 'conditional'];
    if (!validTriggers.includes(containerData.executionPolicy.executionTrigger)) {
      return Result.fail<void>('Invalid execution trigger');
    }

    if (containerData.executionPolicy.executionTrigger === 'conditional' && !containerData.executionPolicy.conditions) {
      return Result.fail<void>('Conditional execution trigger requires conditions');
    }

    if (containerData.executionPolicy.timeout !== undefined && 
        (containerData.executionPolicy.timeout <= 0 || containerData.executionPolicy.timeout > 7200)) {
      return Result.fail<void>('Timeout must be between 0 and 7200 seconds (2 hours)');
    }

    // Validate orchestration mode
    const validModes = ['embedded', 'parallel', 'sequential'];
    if (!validModes.includes(containerData.orchestrationMode)) {
      return Result.fail<void>('Invalid orchestration mode');
    }

    // Validate output extraction
    if (containerData.outputExtraction.extractedOutputs.length === 0) {
      return Result.fail<void>('At least one output must be extracted');
    }

    const duplicateOutputs = containerData.outputExtraction.extractedOutputs.filter((output, index) => 
      containerData.outputExtraction.extractedOutputs.indexOf(output) !== index
    );
    if (duplicateOutputs.length > 0) {
      return Result.fail<void>('Extracted outputs must be unique');
    }

    // Validate context inheritance
    const duplicateContexts = containerData.contextInheritance.inheritedContexts.filter((context, index) => 
      containerData.contextInheritance.inheritedContexts.indexOf(context) !== index
    );
    if (duplicateContexts.length > 0) {
      return Result.fail<void>('Inherited contexts must be unique');
    }

    return Result.ok<void>(undefined);
  }
}