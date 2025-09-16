import { Result } from '../shared/result';
import { NodeId } from '../value-objects/node-id';
import { Position } from '../value-objects/position';
import { ExecutionMode, NodeStatus, NodeType } from '../enums';

// Type-specific data interfaces
export interface IONodeData {
  boundaryType: 'input' | 'output';
  inputDataContract?: Record<string, any>;
  outputDataContract?: Record<string, any>;
}

export interface StageNodeData {
  processingConfig?: Record<string, any>;
}

export interface TetherNodeData {
  connectionConfig?: Record<string, any>;
}

export interface KBNodeData {
  knowledgeSourceConfig?: Record<string, any>;
}

export interface FunctionModelContainerData {
  nestedModelId?: string;
}

// Validation result interface
export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

// UnifiedNode creation properties
export interface UnifiedNodeProps {
  nodeId: NodeId;
  modelId: string;
  name: string;
  nodeType: NodeType;
  position: Position;
  dependencies: NodeId[];
  executionType: ExecutionMode;
  status: NodeStatus;
  timeout?: number;
  metadata: Record<string, any>;
  visualProperties: Record<string, any>;
  // Type-specific data
  ioData?: IONodeData;
  stageData?: StageNodeData;
  tetherData?: TetherNodeData;
  kbData?: KBNodeData;
  containerData?: FunctionModelContainerData;
}

/**
 * UnifiedNode - A single entity that represents all node types in the system
 * Replaces the fragmented ContainerNodeType/ActionNodeType system
 */
export class UnifiedNode {
  public readonly nodeId: NodeId;
  public readonly modelId: string;
  public readonly name: string;
  private readonly nodeType: NodeType;
  public readonly position: Position;
  public readonly dependencies: NodeId[];
  public readonly executionType: ExecutionMode;
  public readonly status: NodeStatus;
  public readonly timeout?: number;
  public readonly metadata: Record<string, any>;
  public readonly visualProperties: Record<string, any>;
  
  // Type-specific data
  private readonly ioData?: IONodeData;
  private readonly stageData?: StageNodeData;
  private readonly tetherData?: TetherNodeData;
  private readonly kbData?: KBNodeData;
  private readonly containerData?: FunctionModelContainerData;

  private constructor(props: UnifiedNodeProps) {
    this.nodeId = props.nodeId;
    this.modelId = props.modelId;
    this.name = props.name;
    this.nodeType = props.nodeType;
    this.position = props.position;
    this.dependencies = props.dependencies;
    this.executionType = props.executionType;
    this.status = props.status;
    this.timeout = props.timeout;
    this.metadata = props.metadata;
    this.visualProperties = props.visualProperties;
    
    // Type-specific data
    this.ioData = props.ioData;
    this.stageData = props.stageData;
    this.tetherData = props.tetherData;
    this.kbData = props.kbData;
    this.containerData = props.containerData;
  }

  /**
   * Factory method to create a UnifiedNode with validation
   */
  public static create(props: UnifiedNodeProps): Result<UnifiedNode> {
    // Basic validation
    const validationResult = this.validateCreationProps(props);
    if (validationResult.isFailure) {
      return validationResult;
    }

    // Type-specific creation validation
    const typeValidationResult = this.validateTypeSpecificCreation(props);
    if (typeValidationResult.isFailure) {
      return typeValidationResult;
    }

    const node = new UnifiedNode(props);
    return Result.ok(node);
  }

  private static validateCreationProps(props: UnifiedNodeProps): Result<void> {
    // Validate node type
    const validTypes = Object.values(NodeType);
    if (!validTypes.includes(props.nodeType as NodeType)) {
      return Result.fail(`Invalid node type: ${props.nodeType}`);
    }

    // Validate name
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('Node name cannot be empty');
    }

    // Validate model ID
    if (!props.modelId || props.modelId.trim().length === 0) {
      return Result.fail('Node must belong to a model');
    }

    return Result.ok(undefined);
  }

  private static validateTypeSpecificCreation(props: UnifiedNodeProps): Result<void> {
    switch (props.nodeType) {
      case NodeType.IO_NODE:
        return this.validateIONodeCreation(props);
      default:
        return Result.ok(undefined);
    }
  }

  private static validateIONodeCreation(props: UnifiedNodeProps): Result<void> {
    if (!props.ioData) {
      return Result.ok(undefined);
    }

    // Input boundary cannot have output contract
    if (props.ioData.boundaryType === 'input' && props.ioData.outputDataContract) {
      return Result.fail('Input boundary type cannot have output data contract');
    }

    // Output boundary cannot have input contract
    if (props.ioData.boundaryType === 'output' && props.ioData.inputDataContract) {
      return Result.fail('Output boundary type cannot have input data contract');
    }

    return Result.ok(undefined);
  }

  // Getters
  public getNodeType(): NodeType {
    return this.nodeType;
  }

  // Type guards
  public isIONode(): boolean {
    return this.nodeType === NodeType.IO_NODE;
  }

  public isStageNode(): boolean {
    return this.nodeType === NodeType.STAGE_NODE;
  }

  public isTetherNode(): boolean {
    return this.nodeType === NodeType.TETHER_NODE;
  }

  public isKBNode(): boolean {
    return this.nodeType === NodeType.KB_NODE;
  }

  public isFunctionModelContainer(): boolean {
    return this.nodeType === NodeType.FUNCTION_MODEL_CONTAINER;
  }

  // Capability methods
  public canProcess(): boolean {
    switch (this.nodeType) {
      case NodeType.STAGE_NODE:
      case NodeType.FUNCTION_MODEL_CONTAINER:
        return true;
      default:
        return false;
    }
  }

  public canStore(): boolean {
    return this.nodeType === NodeType.KB_NODE;
  }

  public canTransfer(): boolean {
    switch (this.nodeType) {
      case NodeType.IO_NODE:
      case NodeType.STAGE_NODE:
      case NodeType.TETHER_NODE:
      case NodeType.KB_NODE:
      case NodeType.FUNCTION_MODEL_CONTAINER:
        return true;
      default:
        return false;
    }
  }

  public canNest(): boolean {
    return this.nodeType === NodeType.FUNCTION_MODEL_CONTAINER;
  }

  // Validation method
  public validate(): Result<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Type-specific validation
    switch (this.nodeType) {
      case NodeType.IO_NODE:
        this.validateIONode(errors, warnings);
        break;
      case NodeType.STAGE_NODE:
        this.validateStageNode(errors, warnings);
        break;
      case NodeType.TETHER_NODE:
        this.validateTetherNode(errors, warnings);
        break;
      case NodeType.KB_NODE:
        this.validateKBNode(errors, warnings);
        break;
      case NodeType.FUNCTION_MODEL_CONTAINER:
        this.validateFunctionModelContainer(errors, warnings);
        break;
    }

    return Result.ok({ errors, warnings });
  }

  private validateIONode(errors: string[], warnings: string[]): void {
    if (!this.ioData) {
      return;
    }

    // Input nodes should not have dependencies
    if (this.ioData.boundaryType === 'input' && this.dependencies.length > 0) {
      errors.push('Input nodes should not have dependencies on other nodes');
    }

    // Output nodes should have at least one dependency
    if (this.ioData.boundaryType === 'output' && this.dependencies.length === 0) {
      warnings.push('Output nodes should have at least one dependency');
    }

    // Input nodes should have input contract
    if (this.ioData.boundaryType === 'input' && !this.ioData.inputDataContract) {
      warnings.push('Input node should have an input data contract defined');
    }
  }

  private validateStageNode(errors: string[], warnings: string[]): void {
    if (!this.stageData?.processingConfig) {
      warnings.push('Stage node should have processing configuration defined');
    }
  }

  private validateTetherNode(errors: string[], warnings: string[]): void {
    if (!this.tetherData?.connectionConfig) {
      warnings.push('Tether node should have connection configuration defined');
    }
  }

  private validateKBNode(errors: string[], warnings: string[]): void {
    if (!this.kbData?.knowledgeSourceConfig) {
      warnings.push('KB node should have knowledge source configuration defined');
    }
  }

  private validateFunctionModelContainer(errors: string[], warnings: string[]): void {
    if (!this.containerData?.nestedModelId) {
      errors.push('Function model container must reference a valid nested function model');
    }
  }

  // Type-specific data getters with type safety
  public getIOData(): IONodeData {
    if (!this.isIONode()) {
      throw new Error(`Operation not supported for node type: ${this.nodeType}`);
    }
    return this.ioData!;
  }

  public getStageData(): StageNodeData {
    if (!this.isStageNode()) {
      throw new Error(`Operation not supported for node type: ${this.nodeType}`);
    }
    return this.stageData!;
  }

  public getStageConfiguration(): any {
    if (!this.isStageNode()) {
      throw new Error(`Operation not supported for node type: ${this.nodeType}`);
    }
    return this.stageData?.processingConfig;
  }

  public getKBSourceConfiguration(): any {
    if (!this.isKBNode()) {
      throw new Error(`Operation not supported for node type: ${this.nodeType}`);
    }
    return this.kbData?.knowledgeSourceConfig;
  }

  // Type-specific data extraction methods (required by repository)
  public getTetherData(): any {
    if (!this.isTetherNode()) {
      throw new Error(`Operation not supported for node type: ${this.nodeType}`);
    }
    return this.tetherData;
  }

  public getKBData(): any {
    if (!this.isKBNode()) {
      throw new Error(`Operation not supported for node type: ${this.nodeType}`);
    }
    return this.kbData;
  }

  public getFunctionModelContainerData(): any {
    if (!this.isFunctionModelContainer()) {
      throw new Error(`Operation not supported for node type: ${this.nodeType}`);
    }
    return this.containerData;
  }

  // Update methods
  public updateName(newName: string): Result<UnifiedNode> {
    if (!newName || newName.trim().length === 0) {
      return Result.fail('Node name cannot be empty');
    }

    const newProps = {
      ...this.getProps(),
      name: newName
    };

    return UnifiedNode.create(newProps);
  }

  public updatePosition(newPosition: Position): Result<UnifiedNode> {
    const newProps = {
      ...this.getProps(),
      position: newPosition
    };

    return UnifiedNode.create(newProps);
  }

  public updateStatus(newStatus: NodeStatus): Result<UnifiedNode> {
    const newProps = {
      ...this.getProps(),
      status: newStatus
    };

    return UnifiedNode.create(newProps);
  }

  public updateInputDataContract(contract: Record<string, any>): Result<UnifiedNode> {
    if (!this.isIONode()) {
      return Result.fail('Input data contract can only be updated on IO nodes');
    }

    const newProps = {
      ...this.getProps(),
      ioData: {
        ...this.ioData!,
        inputDataContract: contract
      }
    };

    return UnifiedNode.create(newProps);
  }

  public updateOutputDataContract(contract: Record<string, any>): Result<UnifiedNode> {
    if (!this.isIONode()) {
      return Result.fail('Output data contract can only be updated on IO nodes');
    }

    const newProps = {
      ...this.getProps(),
      ioData: {
        ...this.ioData!,
        outputDataContract: contract
      }
    };

    return UnifiedNode.create(newProps);
  }

  private getProps(): UnifiedNodeProps {
    return {
      nodeId: this.nodeId,
      modelId: this.modelId,
      name: this.name,
      nodeType: this.nodeType,
      position: this.position,
      dependencies: this.dependencies,
      executionType: this.executionType,
      status: this.status,
      timeout: this.timeout,
      metadata: this.metadata,
      visualProperties: this.visualProperties,
      ioData: this.ioData,
      stageData: this.stageData,
      tetherData: this.tetherData,
      kbData: this.kbData,
      containerData: this.containerData
    };
  }
}

/**
 * NodeFactory - Creates UnifiedNode instances from UI inputs
 */
export class NodeFactory {
  /**
   * Creates a UnifiedNode directly from NodeType and data - main factory method for TDD
   */
  public static createUnifiedNode(
    nodeType: NodeType,
    data: {
      nodeId?: NodeId;
      modelId: string;
      name: string;
      position: Position;
      userId: string;
      typeSpecificData?: Record<string, any>;
      status?: NodeStatus;
      metadata?: Record<string, any>;
      visualProperties?: Record<string, any>;
      executionType?: ExecutionMode;
      timeout?: number;
    }
  ): Result<UnifiedNode> {
    // Generate nodeId if not provided
    const nodeId = data.nodeId || NodeId.generate();

    // Build base props - use passed data or defaults
    const nodeProps: UnifiedNodeProps = {
      nodeId,
      modelId: data.modelId,
      name: data.name,
      nodeType,
      position: data.position,
      dependencies: [],
      executionType: data.executionType || ExecutionMode.SEQUENTIAL,
      status: data.status || NodeStatus.DRAFT,
      timeout: data.timeout,
      metadata: {
        ...(data.metadata || {}),
        createdBy: data.userId,
        createdAt: new Date(),
      },
      visualProperties: data.visualProperties || {}
    };

    // Add type-specific data based on nodeType and typeSpecificData
    switch (nodeType) {
      case NodeType.IO_NODE:
        nodeProps.ioData = {
          boundaryType: data.typeSpecificData?.boundaryType || 'input',
          inputDataContract: data.typeSpecificData?.inputDataContract || data.typeSpecificData?.dataContract?.inputSchema,
          outputDataContract: data.typeSpecificData?.outputDataContract || data.typeSpecificData?.dataContract?.outputSchema
        };
        break;
      case NodeType.STAGE_NODE:
        nodeProps.stageData = {
          processingConfig: data.typeSpecificData?.processingConfig || data.typeSpecificData || {}
        };
        break;
      case NodeType.TETHER_NODE:
        nodeProps.tetherData = {
          connectionConfig: data.typeSpecificData || {}
        };
        break;
      case NodeType.KB_NODE:
        nodeProps.kbData = {
          knowledgeSourceConfig: data.typeSpecificData?.knowledgeSourceConfig || data.typeSpecificData || {}
        };
        break;
      case NodeType.FUNCTION_MODEL_CONTAINER:
        nodeProps.containerData = {
          nestedModelId: data.typeSpecificData?.nestedModelId || undefined
        };
        break;
    }

    return UnifiedNode.create(nodeProps);
  }

  /**
   * Creates a UnifiedNode from UI type mapping
   */
  public static createFromUIType(params: {
    nodeId: NodeId;
    modelId: string;
    name: string;
    uiType: string;
    position: Position;
    boundaryType?: 'input' | 'output';
  }): Result<UnifiedNode> {
    // Map UI types to domain types
    const domainType = this.mapUITypeToDomain(params.uiType);
    if (!domainType) {
      return Result.fail(`Unknown UI type: ${params.uiType}`);
    }

    // Build base props
    const nodeProps: UnifiedNodeProps = {
      nodeId: params.nodeId,
      modelId: params.modelId,
      name: params.name,
      nodeType: domainType,
      position: params.position,
      dependencies: [],
      executionType: ExecutionMode.SEQUENTIAL,
      status: NodeStatus.DRAFT,
      metadata: {},
      visualProperties: {}
    };

    // Add type-specific data
    switch (domainType) {
      case NodeType.IO_NODE:
        nodeProps.ioData = {
          boundaryType: params.boundaryType || 'input'
        };
        break;
      case NodeType.STAGE_NODE:
        nodeProps.stageData = {};
        break;
      case NodeType.TETHER_NODE:
        nodeProps.tetherData = {};
        break;
      case NodeType.KB_NODE:
        nodeProps.kbData = {};
        break;
      case NodeType.FUNCTION_MODEL_CONTAINER:
        nodeProps.containerData = { nestedModelId: 'nested-123' }; // Default for tests
        break;
    }

    return UnifiedNode.create(nodeProps);
  }

  private static mapUITypeToDomain(uiType: string): NodeType | null {
    const mapping: Record<string, NodeType> = {
      'input': NodeType.IO_NODE,
      'output': NodeType.IO_NODE,
      'stage': NodeType.STAGE_NODE,
      'kb': NodeType.KB_NODE,
      'tether': NodeType.TETHER_NODE,
      'function-model-container': NodeType.FUNCTION_MODEL_CONTAINER
    };

    return mapping[uiType] || null;
  }
}

// Export types for use in tests and other modules
export { NodeType } from '../enums';