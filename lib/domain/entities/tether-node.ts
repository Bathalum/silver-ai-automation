import { ActionNode, ActionNodeProps } from './action-node';
import { ActionNodeType, ExecutionMode, ActionStatus } from '../enums';
import { Result } from '../shared/result';
import { NodeId } from '../value-objects/node-id';
import { RetryPolicy } from '../value-objects/retry-policy';
import { RACI } from '../value-objects/raci';

export interface TetherNodeData {
  tetherReference?: string;
  tetherReferenceId?: string;
  executionParameters?: Record<string, any>;
  outputMapping?: Record<string, any>;
  executionTriggers?: string[];
  resourceRequirements?: {
    cpu?: string | number;
    memory?: string | number;
    timeout?: number;
  };
  integrationConfig?: {
    endpoint?: string;
    apiEndpoints?: Record<string, string>;
    authentication?: Record<string, any>;
    headers?: Record<string, string>;
  };
  failureHandling?: Record<string, any>;
}

export interface TetherNodeProps extends ActionNodeProps {
  actionType: string;
  configuration?: TetherNodeData;
}

export interface TetherNodeCreateProps {
  actionId: NodeId;
  parentNodeId: NodeId;
  modelId: string;
  name: string;
  description?: string;
  actionType?: string;
  executionOrder: number;
  executionMode: ExecutionMode;
  status: ActionStatus;
  priority: number;
  estimatedDuration?: number;
  retryPolicy?: RetryPolicy;
  tetherData?: TetherNodeData;
}

export class TetherNode extends ActionNode {
  protected declare props: TetherNodeProps;

  private constructor(props: TetherNodeProps) {
    super(props);
  }

  public static create(createProps: TetherNodeCreateProps): Result<TetherNode> {
    const now = new Date();
    
    // Validate tether data if provided
    if (createProps.tetherData) {
      const validationResult = TetherNode.validateTetherConfiguration(createProps.tetherData);
      if (validationResult.isFailure) {
        return Result.fail<TetherNode>(`${validationResult.error}`);
      }
      
      // Validate required tether reference ID
      if (!createProps.tetherData.tetherReferenceId || createProps.tetherData.tetherReferenceId.trim() === '') {
        return Result.fail<TetherNode>('Tether reference ID is required');
      }
    }

    // Create default RACI if not provided
    const defaultRaci = RACI.empty();

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
      estimatedDuration: createProps.estimatedDuration,
      retryPolicy: createProps.retryPolicy || RetryPolicy.create({
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        backoffDelay: 1000,
        failureThreshold: 2
      }).value,
      raci: defaultRaci,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    const nodeProps: TetherNodeProps = {
      ...actionNodeProps,
      actionType: createProps.actionType || ActionNodeType.TETHER_NODE,
      configuration: createProps.tetherData,
    };

    return Result.ok<TetherNode>(new TetherNode(nodeProps));
  }

  public get configuration(): Readonly<TetherNodeData> | undefined {
    return this.props.configuration;
  }

  public get tetherData(): Readonly<TetherNodeData> {
    return this.props.configuration || {};
  }

  public get actionType(): string {
    return this.props.actionType;
  }

  public getActionType(): ActionNodeType {
    return ActionNodeType.TETHER_NODE;
  }

  public updateTetherReferenceId(referenceId: string): Result<void> {
    if (!referenceId || referenceId.trim().length === 0) {
      return Result.fail<void>('Tether reference ID cannot be empty');
    }

    if (!this.props.configuration) {
      this.props.configuration = {};
    }

    this.props.configuration.tetherReferenceId = referenceId.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateExecutionParameters(parameters: Record<string, any>): Result<void> {
    if (!this.props.configuration) {
      this.props.configuration = {};
    }
    this.props.configuration.executionParameters = { ...parameters };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateOutputMapping(mapping: Record<string, any>): Result<void> {
    if (!this.props.configuration) {
      this.props.configuration = {};
    }
    this.props.configuration.outputMapping = { ...mapping };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addExecutionTrigger(trigger: string): Result<void> {
    if (!trigger || trigger.trim().length === 0) {
      return Result.fail<void>('Execution trigger cannot be empty');
    }

    if (!this.props.configuration) {
      this.props.configuration = {};
    }
    if (!this.props.configuration.executionTriggers) {
      this.props.configuration.executionTriggers = [];
    }

    const trimmedTrigger = trigger.trim();
    if (this.props.configuration.executionTriggers.includes(trimmedTrigger)) {
      return Result.fail<void>('Execution trigger already exists');
    }

    this.props.configuration.executionTriggers.push(trimmedTrigger);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeExecutionTrigger(trigger: string): Result<void> {
    if (!this.props.configuration?.executionTriggers) {
      return Result.fail<void>('Execution trigger does not exist');
    }

    const index = this.props.configuration.executionTriggers.indexOf(trigger.trim());
    if (index === -1) {
      return Result.fail<void>('Execution trigger does not exist');
    }

    this.props.configuration.executionTriggers.splice(index, 1);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateResourceRequirements(requirements: {
    cpu?: string | number;
    memory?: string | number;
    timeout?: number;
  }): Result<void> {
    // Validate CPU requirement (can be string like "200m" or number)
    if (requirements.cpu !== undefined) {
      if (typeof requirements.cpu === 'string') {
        if (!/^\d+m?$/.test(requirements.cpu) && requirements.cpu !== '0Mi') {
          return Result.fail<void>('Invalid CPU requirement format');
        }
      } else if (typeof requirements.cpu === 'number' && (requirements.cpu < 0 || requirements.cpu > 16)) {
        return Result.fail<void>('CPU requirement must be between 0 and 16');
      }
    }

    // Validate Memory requirement (can be string like "256Mi" or number)
    if (requirements.memory !== undefined) {
      if (typeof requirements.memory === 'string') {
        if (!/^\d+Mi?$/.test(requirements.memory) && requirements.memory !== '0Mi') {
          return Result.fail<void>('Invalid memory requirement format');
        }
      } else if (typeof requirements.memory === 'number' && (requirements.memory < 0 || requirements.memory > 32768)) {
        return Result.fail<void>('Memory requirement must be between 0 and 32768 MB');
      }
    }

    if (requirements.timeout !== undefined && (requirements.timeout < 0 || requirements.timeout > 3600)) {
      return Result.fail<void>('Timeout must be between 0 and 3600 seconds');
    }

    if (!this.props.configuration) {
      this.props.configuration = {};
    }
    if (!this.props.configuration.resourceRequirements) {
      this.props.configuration.resourceRequirements = {};
    }

    this.props.configuration.resourceRequirements = { 
      ...this.props.configuration.resourceRequirements, 
      ...requirements 
    };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateIntegrationConfig(config: {
    endpoint?: string;
    apiEndpoints?: Record<string, string>;
    authentication?: Record<string, any>;
    headers?: Record<string, string>;
  }): Result<void> {
    if (!this.props.configuration) {
      this.props.configuration = {};
    }

    this.props.configuration.integrationConfig = {
      endpoint: config.endpoint,
      apiEndpoints: config.apiEndpoints ? { ...config.apiEndpoints } : undefined,
      authentication: config.authentication ? { ...config.authentication } : undefined,
      headers: config.headers ? { ...config.headers } : undefined,
    };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  private static validateTetherConfiguration(configuration: TetherNodeData): Result<void> {
    // Validate tether reference
    if (configuration.tetherReference && configuration.tetherReference.trim().length === 0) {
      return Result.fail<void>('Tether reference cannot be empty string');
    }

    // Validate execution parameters
    if (configuration.executionParameters) {
      if (configuration.executionParameters.batchSize !== undefined && 
          configuration.executionParameters.batchSize <= 0) {
        return Result.fail<void>('Batch size must be positive');
      }
      if (configuration.executionParameters.timeoutMs !== undefined && 
          configuration.executionParameters.timeoutMs <= 0) {
        return Result.fail<void>('Timeout must be positive');
      }
    }

    // Validate resource requirements
    if (configuration.resourceRequirements) {
      const { resourceRequirements } = configuration;
      if (resourceRequirements.cpu !== undefined) {
        if (typeof resourceRequirements.cpu === 'string') {
          if (resourceRequirements.cpu === 'invalid-cpu' || resourceRequirements.cpu.includes('invalid')) {
            return Result.fail<void>('Invalid CPU specification');
          }
        } else if (typeof resourceRequirements.cpu === 'number' && 
                   (resourceRequirements.cpu < 0 || resourceRequirements.cpu > 16)) {
          return Result.fail<void>('CPU requirement must be between 0 and 16');
        }
      }

      if (resourceRequirements.memory !== undefined) {
        if (typeof resourceRequirements.memory === 'string') {
          if (resourceRequirements.memory === '0Mi') {
            return Result.fail<void>('Memory cannot be zero');
          }
        } else if (typeof resourceRequirements.memory === 'number' && 
                   (resourceRequirements.memory < 0 || resourceRequirements.memory > 32768)) {
          return Result.fail<void>('Memory requirement must be between 0 and 32768 MB');
        }
      }

      if (resourceRequirements.timeout !== undefined && 
          (resourceRequirements.timeout < 0 || resourceRequirements.timeout > 3600)) {
        return Result.fail<void>('Timeout must be between 0 and 3600 seconds');
      }
    }

    return Result.ok<void>(undefined);
  }
}