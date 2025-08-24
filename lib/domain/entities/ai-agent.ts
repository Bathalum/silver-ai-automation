import { NodeId } from '../value-objects/node-id';
import { FeatureType } from '../enums';
import { Result } from '../shared/result';

export interface AIAgentCapabilities {
  canRead: boolean;
  canWrite: boolean;
  canExecute: boolean;
  canAnalyze: boolean;
  canOrchestrate: boolean;
  maxConcurrentTasks: number;
  supportedDataTypes: string[];
}

export interface AIAgentTools {
  availableTools: string[];
  toolConfigurations: Record<string, any>;
  customTools?: Record<string, any>;
}

export interface AIAgentProps {
  agentId: NodeId;
  featureType: FeatureType;
  entityId: string;
  nodeId?: NodeId;
  name: string;
  description?: string;
  instructions: string;
  tools: AIAgentTools;
  capabilities: AIAgentCapabilities;
  isEnabled: boolean;
  lastExecutedAt?: Date;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AIAgent represents configurable AI automation agents attached to features, entities, or nodes.
 * Supports multi-level attachment with sophisticated capability management and execution tracking.
 */
export class AIAgent {
  private constructor(private props: AIAgentProps) {}

  public static create(props: Omit<AIAgentProps, 'createdAt' | 'updatedAt' | 'executionCount' | 'successCount' | 'failureCount'>): Result<AIAgent> {
    const now = new Date();
    const agentProps: AIAgentProps = {
      ...props,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Validate business rules
    const validationResult = AIAgent.validate(agentProps);
    if (validationResult.isFailure) {
      return Result.fail<AIAgent>(validationResult.error);
    }

    return Result.ok<AIAgent>(new AIAgent(agentProps));
  }

  public get agentId(): NodeId {
    return this.props.agentId;
  }

  public get featureType(): FeatureType {
    return this.props.featureType;
  }

  public get entityId(): string {
    return this.props.entityId;
  }

  public get nodeId(): NodeId | undefined {
    return this.props.nodeId;
  }

  public get name(): string {
    return this.props.name;
  }

  public get description(): string | undefined {
    return this.props.description;
  }

  public get instructions(): string {
    return this.props.instructions;
  }

  public get tools(): Readonly<AIAgentTools> {
    return {
      availableTools: [...this.props.tools.availableTools],
      toolConfigurations: { ...this.props.tools.toolConfigurations },
      customTools: this.props.tools.customTools ? { ...this.props.tools.customTools } : undefined,
    };
  }

  public get capabilities(): Readonly<AIAgentCapabilities> {
    return { ...this.props.capabilities };
  }

  public get isEnabled(): boolean {
    return this.props.isEnabled;
  }

  public get lastExecutedAt(): Date | undefined {
    return this.props.lastExecutedAt;
  }

  public get executionCount(): number {
    return this.props.executionCount;
  }

  public get successCount(): number {
    return this.props.successCount;
  }

  public get failureCount(): number {
    return this.props.failureCount;
  }

  public get averageExecutionTime(): number | undefined {
    return this.props.averageExecutionTime;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public updateName(name: string): Result<void> {
    if (!name || name.trim().length === 0) {
      return Result.fail<void>('Agent name cannot be empty');
    }

    if (name.trim().length > 100) {
      return Result.fail<void>('Agent name cannot exceed 100 characters');
    }

    this.props.name = name.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateDescription(description?: string): Result<void> {
    if (description && description.length > 1000) {
      return Result.fail<void>('Agent description cannot exceed 1000 characters');
    }

    this.props.description = description?.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateInstructions(instructions: string): Result<void> {
    if (!instructions || instructions.trim().length === 0) {
      return Result.fail<void>('Agent instructions cannot be empty');
    }

    if (instructions.length > 10000) {
      return Result.fail<void>('Agent instructions cannot exceed 10000 characters');
    }

    this.props.instructions = instructions.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateTools(tools: AIAgentTools): Result<void> {
    const validationResult = this.validateTools(tools);
    if (validationResult.isFailure) {
      return validationResult;
    }

    this.props.tools = {
      availableTools: [...tools.availableTools],
      toolConfigurations: { ...tools.toolConfigurations },
      customTools: tools.customTools ? { ...tools.customTools } : undefined,
    };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateCapabilities(capabilities: AIAgentCapabilities): Result<void> {
    const validationResult = this.validateCapabilities(capabilities);
    if (validationResult.isFailure) {
      return validationResult;
    }

    this.props.capabilities = { ...capabilities };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public enable(): Result<void> {
    this.props.isEnabled = true;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public disable(): Result<void> {
    this.props.isEnabled = false;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public recordExecution(success: boolean, executionTimeMs: number): Result<void> {
    if (executionTimeMs < 0) {
      return Result.fail<void>('Execution time cannot be negative');
    }

    this.props.executionCount++;
    this.props.lastExecutedAt = new Date();

    if (success) {
      this.props.successCount++;
    } else {
      this.props.failureCount++;
    }

    // Update average execution time
    if (this.props.averageExecutionTime === undefined) {
      this.props.averageExecutionTime = executionTimeMs;
    } else {
      this.props.averageExecutionTime = 
        (this.props.averageExecutionTime * (this.props.executionCount - 1) + executionTimeMs) / this.props.executionCount;
    }

    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public getSuccessRate(): number {
    if (this.props.executionCount === 0) return 0;
    return this.props.successCount / this.props.executionCount;
  }

  public getFailureRate(): number {
    if (this.props.executionCount === 0) return 0;
    return this.props.failureCount / this.props.executionCount;
  }

  public isFeatureLevel(): boolean {
    return !this.props.nodeId;
  }

  public isNodeLevel(): boolean {
    return !!this.props.nodeId;
  }

  public hasCapability(capability: keyof AIAgentCapabilities): boolean {
    return this.props.capabilities[capability] as boolean;
  }

  public hasTool(toolName: string): boolean {
    return this.props.tools.availableTools.includes(toolName);
  }

  public equals(other: AIAgent): boolean {
    return this.agentId.equals(other.agentId);
  }

  private validateTools(tools: AIAgentTools): Result<void> {
    if (tools.availableTools.length === 0) {
      return Result.fail<void>('Agent must have at least one available tool');
    }

    // Check for duplicate tools
    const uniqueTools = new Set(tools.availableTools);
    if (uniqueTools.size !== tools.availableTools.length) {
      return Result.fail<void>('Available tools must be unique');
    }

    // Validate tool configurations match available tools
    for (const tool of Object.keys(tools.toolConfigurations)) {
      if (!tools.availableTools.includes(tool)) {
        return Result.fail<void>(`Tool configuration found for unavailable tool: ${tool}`);
      }
    }

    return Result.ok<void>(undefined);
  }

  private validateCapabilities(capabilities: AIAgentCapabilities): Result<void> {
    if (capabilities.maxConcurrentTasks < 1 || capabilities.maxConcurrentTasks > 100) {
      return Result.fail<void>('Max concurrent tasks must be between 1 and 100');
    }

    if (capabilities.supportedDataTypes.length === 0) {
      return Result.fail<void>('Agent must support at least one data type');
    }

    return Result.ok<void>(undefined);
  }

  private static validate(props: AIAgentProps): Result<void> {
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail<void>('Agent name is required');
    }

    if (props.name.length > 100) {
      return Result.fail<void>('Agent name cannot exceed 100 characters');
    }

    if (!props.instructions || props.instructions.trim().length === 0) {
      return Result.fail<void>('Agent instructions are required');
    }

    if (props.instructions.length > 10000) {
      return Result.fail<void>('Agent instructions cannot exceed 10000 characters');
    }

    if (!props.entityId || props.entityId.trim().length === 0) {
      return Result.fail<void>('Entity ID is required');
    }

    return Result.ok<void>(undefined);
  }
}