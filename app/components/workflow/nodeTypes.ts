/**
 * Node Types Mapping - Following React Flow Patterns
 * Maps node type strings to React components
 * Includes both container nodes and action nodes
 */

import IONode from './nodes/IONode';
import StageNode from './nodes/StageNode';
import TetherNode from './nodes/TetherNode';
import KBNode from './nodes/KBNode';
import FunctionModelContainerNode from './nodes/FunctionModelContainerNode';

export const nodeTypes = {
  // Container nodes (workflow structure)
  ioNode: IONode,
  stageNode: StageNode,
  
  // Action nodes (executable actions)
  tetherNode: TetherNode,
  kbNode: KBNode,
  functionModelContainer: FunctionModelContainerNode,
};