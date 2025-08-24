import { Node, NodeProps } from './node';
import { ContainerNodeType, IOType, ExecutionMode, NodeStatus } from '../enums';
import { Result } from '../shared/result';
import { NodeId } from '../value-objects/node-id';
import { Position } from '../value-objects/position';

export interface IONodeData {
  inputDataContract?: Record<string, any>;
  outputDataContract?: Record<string, any>;
  dataValidationRules?: Record<string, any>;
  boundaryType: 'input' | 'output' | 'input-output';
}

export interface IONodeProps extends NodeProps {
  ioData: IONodeData;
  configuration?: Record<string, any>;
}

export class IONode extends Node {
  protected declare props: IONodeProps;

  private constructor(props: IONodeProps) {
    super(props);
  }

  public static create(props: Omit<IONodeProps, 'createdAt' | 'updatedAt'>): Result<IONode> {
    const now = new Date();
    const nodeProps: IONodeProps = {
      ...props,
      configuration: props.configuration ?? {},
      createdAt: now,
      updatedAt: now,
    };

    // Validate IO-specific business rules
    const validationResult = IONode.validateIOData(props.ioData);
    if (validationResult.isFailure) {
      return Result.fail<IONode>(validationResult.error);
    }

    return Result.ok<IONode>(new IONode(nodeProps));
  }

  public get ioData(): Readonly<IONodeData> {
    return this.props.ioData;
  }

  public getNodeType(): string {
    return ContainerNodeType.IO_NODE;
  }

  public get nodeType(): string {
    return this.getNodeType();
  }

  public get ioType(): IOType {
    switch (this.props.ioData.boundaryType) {
      case 'input':
        return IOType.INPUT;
      case 'output':
        return IOType.OUTPUT;
      case 'input-output':
        return IOType.INPUT_OUTPUT;
      default:
        throw new Error(`Invalid boundary type: ${this.props.ioData.boundaryType}`);
    }
  }

  public get configuration(): Record<string, any> | undefined {
    return this.props.configuration;
  }

  public updateInputDataContract(contract: Record<string, any>): Result<void> {
    this.props.ioData.inputDataContract = { ...contract };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateOutputDataContract(contract: Record<string, any>): Result<void> {
    this.props.ioData.outputDataContract = { ...contract };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateDataValidationRules(rules: Record<string, any>): Result<void> {
    this.props.ioData.dataValidationRules = { ...rules };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateBoundaryType(boundaryType: 'input' | 'output' | 'input-output'): Result<void> {
    if (boundaryType === 'input' && this.props.ioData.outputDataContract) {
      return Result.fail<void>('Cannot set boundary type to input when output data contract exists');
    }

    if (boundaryType === 'output' && this.props.ioData.inputDataContract) {
      return Result.fail<void>('Cannot set boundary type to output when input data contract exists');
    }

    this.props.ioData.boundaryType = boundaryType;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public validate(): Result<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic node validations
    if (!this.props.name || this.props.name.trim() === '') {
      errors.push('Node name cannot be empty');
    }

    if (!this.props.modelId || this.props.modelId.trim() === '') {
      errors.push('Node must belong to a model');
    }

    if (!this.props.description || this.props.description.trim() === '') {
      warnings.push('Node should have a description for better documentation');
    }

    // IO-specific dependency validation
    if (this.props.ioData.boundaryType === 'input') {
      if (this.props.dependencies.length > 0) {
        errors.push('Input nodes should not have dependencies on other nodes');
      }
    }

    if (this.props.ioData.boundaryType === 'output') {
      if (this.props.dependencies.length === 0) {
        warnings.push('Output nodes should have at least one dependency');
      }
    }

    // Validate data contracts exist for appropriate boundary types
    if (this.props.ioData.boundaryType === 'input' || this.props.ioData.boundaryType === 'input-output') {
      if (!this.props.ioData.inputDataContract) {
        warnings.push('Input node should have an input data contract defined');
      }
    }

    if (this.props.ioData.boundaryType === 'output' || this.props.ioData.boundaryType === 'input-output') {
      if (!this.props.ioData.outputDataContract) {
        warnings.push('Output node should have an output data contract defined');
      }
    }

    // Validate data validation rules
    if (this.props.ioData.dataValidationRules) {
      const rules = this.props.ioData.dataValidationRules;
      if (typeof rules !== 'object' || Array.isArray(rules)) {
        errors.push('Data validation rules must be an object');
      }
    }

    return Result.ok({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  }

  public updateConfiguration(config: Record<string, any>): Result<void> {
    // Validate configuration
    if (config.dataFormat === '') {
      return Result.fail<void>('Invalid configuration: dataFormat cannot be empty');
    }

    // Update the configuration object
    this.props.configuration = { ...this.props.configuration, ...config };

    // Update various configuration aspects
    if (config.inputDataContract) {
      const result = this.updateInputDataContract(config.inputDataContract);
      if (result.isFailure) {
        return result;
      }
    }

    if (config.outputDataContract) {
      const result = this.updateOutputDataContract(config.outputDataContract);
      if (result.isFailure) {
        return result;
      }
    }

    if (config.dataValidationRules) {
      const result = this.updateDataValidationRules(config.dataValidationRules);
      if (result.isFailure) {
        return result;
      }
    }

    if (config.boundaryType) {
      const result = this.updateBoundaryType(config.boundaryType);
      if (result.isFailure) {
        return result;
      }
    }

    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public toObject(): any {
    return {
      nodeId: this.nodeId.toString(),
      name: this.name,
      modelId: this.modelId,
      description: this.description,
      nodeType: this.nodeType,
      ioType: this.ioType,
      position: { x: this.position.x, y: this.position.y },
      dependencies: this.dependencies.map(dep => dep.toString()),
      configuration: this.configuration || {},
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  public static fromObject(obj: any): Result<IONode> {
    const nodeIdResult = NodeId.create(obj.nodeId);
    if (nodeIdResult.isFailure) {
      return Result.fail<IONode>(nodeIdResult.error);
    }

    const positionResult = Position.create(obj.position.x, obj.position.y);
    if (positionResult.isFailure) {
      return Result.fail<IONode>(positionResult.error);
    }

    // Convert dependencies array to NodeId objects
    const dependencies = obj.dependencies?.map((depId: string) => {
      const result = NodeId.create(depId);
      if (result.isFailure) throw new Error(result.error);
      return result.value;
    }) || [];

    // Determine boundary type from ioType
    let boundaryType: 'input' | 'output' | 'input-output';
    switch (obj.ioType) {
      case IOType.INPUT:
        boundaryType = 'input';
        break;
      case IOType.OUTPUT:
        boundaryType = 'output';
        break;
      case IOType.INPUT_OUTPUT:
        boundaryType = 'input-output';
        break;
      default:
        return Result.fail<IONode>('Invalid IOType');
    }

    const nodeProps: IONodeProps = {
      nodeId: nodeIdResult.value,
      modelId: obj.modelId,
      name: obj.name,
      description: obj.description,
      position: positionResult.value,
      dependencies,
      executionType: obj.executionType || ExecutionMode.SEQUENTIAL,
      status: obj.status || NodeStatus.CONFIGURED,
      timeout: obj.timeout,
      metadata: obj.metadata || {},
      visualProperties: obj.visualProperties || {},
      configuration: obj.configuration,
      ioData: {
        boundaryType,
        inputDataContract: obj.inputDataContract,
        outputDataContract: obj.outputDataContract,
        dataValidationRules: obj.dataValidationRules
      },
      createdAt: new Date(obj.createdAt),
      updatedAt: new Date(obj.updatedAt)
    };

    return IONode.create(nodeProps);
  }

  private static validateIOData(ioData: IONodeData): Result<void> {
    const validBoundaryTypes = ['input', 'output', 'input-output'];
    if (!validBoundaryTypes.includes(ioData.boundaryType)) {
      return Result.fail<void>('Invalid boundary type');
    }

    // Validate that boundary type matches available contracts
    if (ioData.boundaryType === 'input' && ioData.outputDataContract) {
      return Result.fail<void>('Input boundary type cannot have output data contract');
    }

    if (ioData.boundaryType === 'output' && ioData.inputDataContract) {
      return Result.fail<void>('Output boundary type cannot have input data contract');
    }

    return Result.ok<void>(undefined);
  }
}