import { Node, NodeProps } from './node';
import { ContainerNodeType } from '../enums';
import { Result } from '../shared/result';

export interface IONodeData {
  inputDataContract?: Record<string, any>;
  outputDataContract?: Record<string, any>;
  dataValidationRules?: Record<string, any>;
  boundaryType: 'input' | 'output' | 'input-output';
}

export interface IONodeProps extends NodeProps {
  ioData: IONodeData;
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