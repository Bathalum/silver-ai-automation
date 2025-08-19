import { Node, NodeProps } from './node';
import { ContainerNodeType } from '../enums';
import { Result } from '../shared/result';

export interface StageNodeData {
  stageType: 'milestone' | 'process' | 'gateway' | 'checkpoint';
  completionCriteria?: Record<string, any>;
  stageGoals?: string[];
  resourceRequirements?: Record<string, any>;
  parallelismConfig?: {
    maxConcurrency: number;
    loadBalancing: 'round-robin' | 'weighted' | 'priority';
  };
}

export interface StageNodeProps extends NodeProps {
  stageData: StageNodeData;
}

export class StageNode extends Node {
  protected declare props: StageNodeProps;

  private constructor(props: StageNodeProps) {
    super(props);
  }

  public static create(props: Omit<StageNodeProps, 'createdAt' | 'updatedAt'>): Result<StageNode> {
    const now = new Date();
    const nodeProps: StageNodeProps = {
      ...props,
      createdAt: now,
      updatedAt: now,
    };

    // Validate stage-specific business rules
    const validationResult = StageNode.validateStageData(props.stageData);
    if (validationResult.isFailure) {
      return Result.fail<StageNode>(validationResult.error);
    }

    return Result.ok<StageNode>(new StageNode(nodeProps));
  }

  public get stageData(): Readonly<StageNodeData> {
    return this.props.stageData;
  }

  public getNodeType(): string {
    return ContainerNodeType.STAGE_NODE;
  }

  public updateStageType(stageType: 'milestone' | 'process' | 'gateway' | 'checkpoint'): Result<void> {
    this.props.stageData.stageType = stageType;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateCompletionCriteria(criteria: Record<string, any>): Result<void> {
    this.props.stageData.completionCriteria = { ...criteria };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateStageGoals(goals: string[]): Result<void> {
    if (goals.length > 10) {
      return Result.fail<void>('Stage cannot have more than 10 goals');
    }

    const invalidGoals = goals.filter(goal => !goal || goal.trim().length === 0);
    if (invalidGoals.length > 0) {
      return Result.fail<void>('Stage goals cannot be empty');
    }

    this.props.stageData.stageGoals = [...goals];
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateResourceRequirements(requirements: Record<string, any>): Result<void> {
    this.props.stageData.resourceRequirements = { ...requirements };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateParallelismConfig(config: {
    maxConcurrency: number;
    loadBalancing: 'round-robin' | 'weighted' | 'priority';
  }): Result<void> {
    if (config.maxConcurrency < 1 || config.maxConcurrency > 100) {
      return Result.fail<void>('Max concurrency must be between 1 and 100');
    }

    const validLoadBalancing = ['round-robin', 'weighted', 'priority'];
    if (!validLoadBalancing.includes(config.loadBalancing)) {
      return Result.fail<void>('Invalid load balancing strategy');
    }

    this.props.stageData.parallelismConfig = { ...config };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  private static validateStageData(stageData: StageNodeData): Result<void> {
    const validStageTypes = ['milestone', 'process', 'gateway', 'checkpoint'];
    if (!validStageTypes.includes(stageData.stageType)) {
      return Result.fail<void>('Invalid stage type');
    }

    if (stageData.stageGoals && stageData.stageGoals.length > 10) {
      return Result.fail<void>('Stage cannot have more than 10 goals');
    }

    if (stageData.parallelismConfig) {
      const config = stageData.parallelismConfig;
      if (config.maxConcurrency < 1 || config.maxConcurrency > 100) {
        return Result.fail<void>('Max concurrency must be between 1 and 100');
      }

      const validLoadBalancing = ['round-robin', 'weighted', 'priority'];
      if (!validLoadBalancing.includes(config.loadBalancing)) {
        return Result.fail<void>('Invalid load balancing strategy');
      }
    }

    return Result.ok<void>(undefined);
  }
}