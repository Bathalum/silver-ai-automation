import { ActionNode, ActionNodeProps } from './action-node';
import { ActionNodeType } from '../enums';
import { Result } from '../shared/result';

export interface TetherNodeData {
  tetherReferenceId: string;
  executionParameters: Record<string, any>;
  outputMapping: Record<string, any>;
  executionTriggers: string[];
  resourceRequirements: {
    cpu?: number;
    memory?: number;
    timeout?: number;
  };
  integrationConfig: {
    apiEndpoints?: Record<string, string>;
    authentication?: Record<string, any>;
    headers?: Record<string, string>;
  };
}

export interface TetherNodeProps extends ActionNodeProps {
  tetherData: TetherNodeData;
}

export class TetherNode extends ActionNode {
  protected declare props: TetherNodeProps;

  private constructor(props: TetherNodeProps) {
    super(props);
  }

  public static create(props: Omit<TetherNodeProps, 'createdAt' | 'updatedAt'>): Result<TetherNode> {
    const now = new Date();
    const nodeProps: TetherNodeProps = {
      ...props,
      createdAt: now,
      updatedAt: now,
    };

    // Validate tether-specific business rules
    const validationResult = TetherNode.validateTetherData(props.tetherData);
    if (validationResult.isFailure) {
      return Result.fail<TetherNode>(validationResult.error);
    }

    return Result.ok<TetherNode>(new TetherNode(nodeProps));
  }

  public get tetherData(): Readonly<TetherNodeData> {
    return this.props.tetherData;
  }

  public getActionType(): string {
    return ActionNodeType.TETHER_NODE;
  }

  public updateTetherReferenceId(referenceId: string): Result<void> {
    if (!referenceId || referenceId.trim().length === 0) {
      return Result.fail<void>('Tether reference ID cannot be empty');
    }

    this.props.tetherData.tetherReferenceId = referenceId.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateExecutionParameters(parameters: Record<string, any>): Result<void> {
    this.props.tetherData.executionParameters = { ...parameters };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateOutputMapping(mapping: Record<string, any>): Result<void> {
    this.props.tetherData.outputMapping = { ...mapping };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addExecutionTrigger(trigger: string): Result<void> {
    if (!trigger || trigger.trim().length === 0) {
      return Result.fail<void>('Execution trigger cannot be empty');
    }

    const trimmedTrigger = trigger.trim();
    if (this.props.tetherData.executionTriggers.includes(trimmedTrigger)) {
      return Result.fail<void>('Execution trigger already exists');
    }

    this.props.tetherData.executionTriggers.push(trimmedTrigger);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeExecutionTrigger(trigger: string): Result<void> {
    const index = this.props.tetherData.executionTriggers.indexOf(trigger.trim());
    if (index === -1) {
      return Result.fail<void>('Execution trigger does not exist');
    }

    this.props.tetherData.executionTriggers.splice(index, 1);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateResourceRequirements(requirements: {
    cpu?: number;
    memory?: number;
    timeout?: number;
  }): Result<void> {
    if (requirements.cpu !== undefined && (requirements.cpu <= 0 || requirements.cpu > 16)) {
      return Result.fail<void>('CPU requirement must be between 0 and 16');
    }

    if (requirements.memory !== undefined && (requirements.memory <= 0 || requirements.memory > 32768)) {
      return Result.fail<void>('Memory requirement must be between 0 and 32768 MB');
    }

    if (requirements.timeout !== undefined && (requirements.timeout <= 0 || requirements.timeout > 3600)) {
      return Result.fail<void>('Timeout must be between 0 and 3600 seconds');
    }

    this.props.tetherData.resourceRequirements = { ...requirements };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateIntegrationConfig(config: {
    apiEndpoints?: Record<string, string>;
    authentication?: Record<string, any>;
    headers?: Record<string, string>;
  }): Result<void> {
    this.props.tetherData.integrationConfig = {
      apiEndpoints: config.apiEndpoints ? { ...config.apiEndpoints } : undefined,
      authentication: config.authentication ? { ...config.authentication } : undefined,
      headers: config.headers ? { ...config.headers } : undefined,
    };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  private static validateTetherData(tetherData: TetherNodeData): Result<void> {
    if (!tetherData.tetherReferenceId || tetherData.tetherReferenceId.trim().length === 0) {
      return Result.fail<void>('Tether reference ID is required');
    }

    // Validate resource requirements
    const { resourceRequirements } = tetherData;
    if (resourceRequirements.cpu !== undefined && (resourceRequirements.cpu <= 0 || resourceRequirements.cpu > 16)) {
      return Result.fail<void>('CPU requirement must be between 0 and 16');
    }

    if (resourceRequirements.memory !== undefined && (resourceRequirements.memory <= 0 || resourceRequirements.memory > 32768)) {
      return Result.fail<void>('Memory requirement must be between 0 and 32768 MB');
    }

    if (resourceRequirements.timeout !== undefined && (resourceRequirements.timeout <= 0 || resourceRequirements.timeout > 3600)) {
      return Result.fail<void>('Timeout must be between 0 and 3600 seconds');
    }

    return Result.ok<void>(undefined);
  }
}