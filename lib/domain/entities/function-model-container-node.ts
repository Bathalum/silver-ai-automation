import { ActionNode, ActionNodeProps } from './action-node';
import { ActionNodeType, ExecutionMode, ActionStatus } from '../enums';
import { Result } from '../shared/result';
import { NodeId } from '../value-objects/node-id';
import { RetryPolicy } from '../value-objects/retry-policy';
import { RACI } from '../value-objects/raci';

export interface FunctionModelContainerData {
  nestedModelId?: string;
  contextMapping?: Record<string, any>;
  outputExtraction?: Record<string, any>;
  executionPolicy?: {
    triggerConditions?: string[];
    failureHandling?: string;
    resourceInheritance?: string;
    timeoutBehavior?: string;
  };
  contextInheritance?: {
    inheritedContexts?: string[];
    isolatedContexts?: string[];
    sharedContexts?: string[];
    contextTransformations?: Record<string, any>;
    contextAccessControl?: Record<string, any>;
  };
  orchestrationMode?: {
    integrationStyle?: string;
    communicationPattern?: string;
    stateManagement?: string;
    errorPropagation?: string;
    resourceSharing?: string;
    executionIsolation?: string;
  };
  hierarchicalValidation?: {
    maxNestingDepth?: number;
    cyclicReferenceCheck?: boolean;
    contextLeakagePrevention?: boolean;
    resourceBoundaryEnforcement?: boolean;
  };
  useCaseDescription?: string;
}

export interface FunctionModelContainerProps extends ActionNodeProps {
  actionType: string;
  configuration?: FunctionModelContainerData;
}

export interface FunctionModelContainerCreateProps {
  actionId: NodeId;
  parentNodeId: NodeId;
  modelId: string;
  name: string;
  description?: string;
  actionType: string;
  executionOrder: number;
  executionMode: ExecutionMode;
  status: ActionStatus;
  priority: number;
  estimatedDuration?: number;
  retryPolicy?: RetryPolicy;
  configuration?: FunctionModelContainerData;
}

export class FunctionModelContainerNode extends ActionNode {
  protected declare props: FunctionModelContainerProps;

  private constructor(props: FunctionModelContainerProps) {
    super(props);
  }

  public static create(createProps: FunctionModelContainerCreateProps): Result<FunctionModelContainerNode> {
    const now = new Date();

    // Validate configuration if provided
    if (createProps.configuration) {
      const validationResult = FunctionModelContainerNode.validateContainerConfiguration(
        createProps.configuration, 
        createProps.modelId
      );
      if (validationResult.isFailure) {
        return Result.fail<FunctionModelContainerNode>(validationResult.error);
      }
    }

    const actionNodeProps: ActionNodeProps = {
      actionId: createProps.actionId,
      parentNodeId: createProps.parentNodeId,
      modelId: createProps.modelId,
      name: createProps.name,
      description: createProps.description,
      executionMode: createProps.executionMode,
      executionOrder: createProps.executionOrder,
      status: createProps.status,
      priority: createProps.priority,
      estimatedDuration: createProps.estimatedDuration || 600, // Container execution takes longer
      retryPolicy: createProps.retryPolicy || RetryPolicy.create({
        maxAttempts: 3,
        backoffStrategy: 'linear',
        backoffDelay: 5000,
        failureThreshold: 2
      }).value,
      raci: RACI.empty(),
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    const nodeProps: FunctionModelContainerProps = {
      ...actionNodeProps,
      actionType: createProps.actionType,
      configuration: createProps.configuration,
    };

    return Result.ok<FunctionModelContainerNode>(new FunctionModelContainerNode(nodeProps));
  }

  public get containerData(): FunctionModelContainerData {
    return this.props.configuration || {};
  }

  public get configuration(): Readonly<FunctionModelContainerData> | undefined {
    return this.props.configuration;
  }

  public get actionType(): string {
    return this.props.actionType;
  }

  public getActionType(): string {
    return this.props.actionType;
  }

  public updateNestedModelId(modelId: string): Result<void> {
    if (!modelId || modelId.trim().length === 0) {
      return Result.fail<void>('Nested model ID cannot be empty');
    }

    if (modelId.trim() === this.modelId) {
      return Result.fail<void>('Cannot nest a model within itself');
    }

    // Initialize configuration if it doesn't exist
    if (!this.props.configuration) {
      this.props.configuration = {};
    }
    
    this.props.configuration.nestedModelId = modelId.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateContextMapping(mapping: Record<string, any>): Result<void> {
    // Initialize configuration if it doesn't exist
    if (!this.props.configuration) {
      this.props.configuration = {};
    }
    
    this.props.configuration.contextMapping = { ...mapping };
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

    // Initialize configuration if it doesn't exist
    if (!this.props.configuration) {
      this.props.configuration = {};
    }
    
    this.props.configuration.outputExtraction = {
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

    // Initialize configuration if it doesn't exist
    if (!this.props.configuration) {
      this.props.configuration = {};
    }
    
    this.props.configuration.executionPolicy = {
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

    // Initialize configuration if it doesn't exist
    if (!this.props.configuration) {
      this.props.configuration = {};
    }
    
    this.props.configuration.contextInheritance = {
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

    // Initialize configuration if it doesn't exist
    if (!this.props.configuration) {
      this.props.configuration = {};
    }
    
    this.props.configuration.orchestrationMode = mode;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addExtractedOutput(output: string): Result<void> {
    if (!output || output.trim().length === 0) {
      return Result.fail<void>('Output name cannot be empty');
    }

    const trimmedOutput = output.trim();
    
    // Initialize configuration if it doesn't exist
    if (!this.props.configuration) {
      this.props.configuration = {};
    }
    if (!this.props.configuration.outputExtraction) {
      this.props.configuration.outputExtraction = { extractedOutputs: [] };
    }
    
    if (this.props.configuration.outputExtraction.extractedOutputs?.includes(trimmedOutput)) {
      return Result.fail<void>('Output already exists');
    }

    this.props.configuration.outputExtraction.extractedOutputs.push(trimmedOutput);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeExtractedOutput(output: string): Result<void> {
    if (!this.props.configuration?.outputExtraction?.extractedOutputs) {
      return Result.fail<void>('Output does not exist');
    }
    
    const index = this.props.configuration.outputExtraction.extractedOutputs.indexOf(output.trim());
    if (index === -1) {
      return Result.fail<void>('Output does not exist');
    }

    if (this.props.configuration.outputExtraction.extractedOutputs.length === 1) {
      return Result.fail<void>('At least one output must be extracted');
    }

    this.props.configuration.outputExtraction.extractedOutputs.splice(index, 1);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addInheritedContext(context: string): Result<void> {
    if (!context || context.trim().length === 0) {
      return Result.fail<void>('Context name cannot be empty');
    }

    const trimmedContext = context.trim();
    
    // Initialize configuration if it doesn't exist
    if (!this.props.configuration) {
      this.props.configuration = {};
    }
    if (!this.props.configuration.contextInheritance) {
      this.props.configuration.contextInheritance = { inheritedContexts: [] };
    }
    
    if (this.props.configuration.contextInheritance.inheritedContexts?.includes(trimmedContext)) {
      return Result.fail<void>('Context already inherited');
    }

    this.props.configuration.contextInheritance.inheritedContexts.push(trimmedContext);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeInheritedContext(context: string): Result<void> {
    if (!this.props.configuration?.contextInheritance?.inheritedContexts) {
      return Result.fail<void>('Context is not inherited');
    }
    
    const index = this.props.configuration.contextInheritance.inheritedContexts.indexOf(context.trim());
    if (index === -1) {
      return Result.fail<void>('Context is not inherited');
    }

    this.props.configuration.contextInheritance.inheritedContexts.splice(index, 1);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  private static validateContainerConfiguration(configuration: FunctionModelContainerData, parentModelId: string): Result<void> {
    // CRITICAL BUSINESS RULE: Prevent self-referencing containers (infinite nesting)
    if (configuration.nestedModelId && configuration.nestedModelId === parentModelId) {
      return Result.fail<void>('Function Model cannot contain itself as nested model');
    }

    // Validate nested model ID if provided
    if (configuration.nestedModelId !== undefined && configuration.nestedModelId.trim().length === 0) {
      return Result.fail<void>('Nested model ID is required');
    }

    // Validate context inheritance if provided
    if (configuration.contextInheritance) {
      const { inheritedContexts, isolatedContexts, sharedContexts } = configuration.contextInheritance;
      
      // Check for duplicates within each context type
      if (inheritedContexts) {
        const duplicates = inheritedContexts.filter((ctx, index) => 
          inheritedContexts.indexOf(ctx) !== index);
        if (duplicates.length > 0) {
          return Result.fail<void>('Inherited contexts must be unique');
        }
      }

      if (isolatedContexts) {
        const duplicates = isolatedContexts.filter((ctx, index) => 
          isolatedContexts.indexOf(ctx) !== index);
        if (duplicates.length > 0) {
          return Result.fail<void>('Isolated contexts must be unique');
        }
      }

      if (sharedContexts) {
        const duplicates = sharedContexts.filter((ctx, index) => 
          sharedContexts.indexOf(ctx) !== index);
        if (duplicates.length > 0) {
          return Result.fail<void>('Shared contexts must be unique');
        }
      }
    }

    // Validate execution policy if provided
    if (configuration.executionPolicy) {
      const { executionTrigger, conditions, timeout } = configuration.executionPolicy;
      
      if (executionTrigger && !['manual', 'automatic', 'conditional', 'scheduled'].includes(executionTrigger)) {
        return Result.fail<void>('Invalid execution trigger');
      }
      
      if (executionTrigger === 'conditional' && !conditions) {
        return Result.fail<void>('Conditional execution trigger requires conditions');
      }
      
      if (timeout !== undefined && (timeout <= 0 || timeout > 7200)) {
        return Result.fail<void>('Timeout must be between 0 and 7200 seconds (2 hours)');
      }
    }

    // Validate orchestration mode if provided
    if (configuration.orchestrationMode && !['embedded', 'federated', 'microservice'].includes(configuration.orchestrationMode)) {
      return Result.fail<void>('Invalid orchestration mode');
    }

    // Validate output extraction if provided
    if (configuration.outputExtraction) {
      const { extractedOutputs } = configuration.outputExtraction;
      
      if (extractedOutputs && extractedOutputs.length === 0) {
        return Result.fail<void>('At least one output must be extracted');
      }
      
      if (extractedOutputs) {
        const duplicates = extractedOutputs.filter((output, index) => 
          extractedOutputs.indexOf(output) !== index);
        if (duplicates.length > 0) {
          return Result.fail<void>('Extracted outputs must be unique');
        }
      }
    }

    // Validate hierarchical settings if provided
    if (configuration.hierarchicalValidation) {
      const { maxNestingDepth } = configuration.hierarchicalValidation;
      if (maxNestingDepth !== undefined && (maxNestingDepth < 1 || maxNestingDepth > 10)) {
        return Result.fail<void>('Max nesting depth must be between 1 and 10');
      }
    }

    return Result.ok<void>(undefined);
  }
}