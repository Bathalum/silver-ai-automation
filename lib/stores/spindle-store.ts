import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

// Types for nodes and edges (simplified for now)
export type NodeType =
  | "event"
  | "action"
  | "ztp"
  | "tool"
  | "function"
  | "input"
  | "output"
  | "command"
  | "aggregate"
  | "externalSystem"
  | "readModel"
  | "policy"
  | "ui"
  | "default";

export interface NodeData {
  label: string;
  type: NodeType;
  description?: string;
  width?: number;
  height?: number;
}

export interface SpindleNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
  parentId?: string;
  order?: number;
}

export interface SpindleEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface SpindleStore {
  nodes: SpindleNode[];
  edges: SpindleEdge[];
  selectedNodeId: string | null;
  // Node actions
  addNode: (node: SpindleNode) => void;
  updateNode: (node: SpindleNode) => void;
  deleteNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  // Edge actions
  addEdge: (edge: SpindleEdge) => void;
  updateEdge: (edge: SpindleEdge) => void;
  deleteEdge: (edgeId: string) => void;
  // Utility
  getChildNodes: (parentId: string) => SpindleNode[];
  removeNodeFromContainer: (nodeId: string) => void;
}

const useSpindleStore = create<SpindleStore>()(
  immer((set, get) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    addNode: (node) => set((state) => { state.nodes.push(node); }),
    updateNode: (node) => set((state) => {
      const idx = state.nodes.findIndex((n) => n.id === node.id);
      if (idx !== -1) state.nodes[idx] = node;
    }),
    deleteNode: (nodeId) => set((state) => {
      state.nodes = state.nodes.filter((n) => n.id !== nodeId);
      state.edges = state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
      if (state.selectedNodeId === nodeId) state.selectedNodeId = null;
    }),
    selectNode: (nodeId) => set((state) => { state.selectedNodeId = nodeId; }),
    addEdge: (edge) => set((state) => { state.edges.push(edge); }),
    updateEdge: (edge) => set((state) => {
      const idx = state.edges.findIndex((e) => e.id === edge.id);
      if (idx !== -1) state.edges[idx] = edge;
    }),
    deleteEdge: (edgeId) => set((state) => {
      state.edges = state.edges.filter((e) => e.id !== edgeId);
    }),
    getChildNodes: (parentId) => get().nodes.filter((n) => n.parentId === parentId),
    removeNodeFromContainer: (nodeId) => set((state) => {
      const node = state.nodes.find((n) => n.id === nodeId);
      if (node) node.parentId = undefined;
    }),
  }))
);

export default useSpindleStore;
