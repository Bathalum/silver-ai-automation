import { ContainerNodeType, ActionNodeType, ExecutionMode, NodeType } from '../../domain/enums';
import { RetryPolicy } from '../../domain/value-objects/retry-policy';
import { RACI } from '../../domain/value-objects/raci';


export interface AddActionNodeCommand {
  modelId: string;
  parentNodeId: string;
  actionType: ActionNodeType;
  name: string;
  description?: string;
  executionMode: ExecutionMode;
  executionOrder: number;
  priority: number;
  retryPolicy?: RetryPolicy;
  raci?: RACI;
  actionSpecificData: Record<string, any>;
  userId: string;
}

export interface UpdateNodeCommand {
  modelId: string;
  nodeId: string;
  name?: string;
  description?: string;
  position?: { x: number; y: number };
  metadata?: Record<string, any>;
  userId: string;
}

export interface UpdateActionNodeCommand {
  modelId: string;
  actionId: string;
  name?: string;
  description?: string;
  executionMode?: ExecutionMode;
  executionOrder?: number;
  priority?: number;
  retryPolicy?: RetryPolicy;
  raci?: RACI;
  actionSpecificData?: Record<string, any>;
  userId: string;
}

export interface DeleteNodeCommand {
  modelId: string;
  nodeId: string;
  userId: string;
  force?: boolean; // Force delete even if there are dependents
}

export interface DeleteActionNodeCommand {
  modelId: string;
  actionId: string;
  userId: string;
}

export interface MoveNodeCommand {
  modelId: string;
  nodeId: string;
  newPosition: { x: number; y: number };
  userId: string;
}

export interface AddNodeDependencyCommand {
  modelId: string;
  nodeId: string;
  dependencyNodeId: string;
  userId: string;
}

export interface RemoveNodeDependencyCommand {
  modelId: string;
  nodeId: string;
  dependencyNodeId: string;
  userId: string;
}

// UNIFIED NODE CREATION COMMAND - TDD Specification
// This command interface is defined by the tests and replaces the fragmented system
export interface CreateNodeCommand {
  modelId: string;
  nodeType: NodeType; // Uses unified NodeType enum
  name: string;
  position: { x: number; y: number };
  userId: string;
  description?: string;
  typeSpecificData?: Record<string, any>; // Type-specific configuration data
}

