import { ContainerNodeType } from '../../domain/enums';

/**
 * Commands for edge operations in the function model workflow designer
 * These commands define the interface contracts that edge use cases expect
 */

export interface CreateEdgeCommand {
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
  targetHandle: string;
  sourceNodeType: ContainerNodeType | string;
  targetNodeType: ContainerNodeType | string;
  modelId: string;
  userId: string;
}

export interface DeleteEdgeCommand {
  linkId: string;
  modelId: string;
  userId: string;
  reason?: string;
}