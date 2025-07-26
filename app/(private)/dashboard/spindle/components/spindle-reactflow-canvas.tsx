"use client";
import React, { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  OnConnect,
  ReactFlowInstance,
  NodeTypes,
  Panel,
  BackgroundVariant,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialNodes: Node[] = [
  {
    id: "1",
    type: "input",
    position: { x: 100, y: 100 },
    data: { label: "Input Node" },
  },
  {
    id: "2",
    type: "default",
    position: { x: 400, y: 200 },
    data: { label: "Default Node" },
  },
  {
    id: "3",
    type: "output",
    position: { x: 700, y: 100 },
    data: { label: "Output Node" },
  },
];
const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e2-3", source: "2", target: "3" },
];

function EditableNodeLabel({ id, data, selected, setNodes }: { id: string; data: any; selected: boolean; setNodes: (setter: (nds: Node[]) => Node[]) => void; }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  React.useEffect(() => {
    setValue(data.label);
  }, [data.label]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value);
  const handleBlur = () => {
    setEditing(false);
    setNodes((nds: Node[]) =>
      nds.map((n: Node) =>
        n.id === id && typeof n.data === 'object' && n.data !== null
          ? { ...n, data: { ...n.data, label: value } }
          : n
      )
    );
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setEditing(false);
      setNodes((nds: Node[]) =>
        nds.map((n: Node) =>
          n.id === id && typeof n.data === 'object' && n.data !== null
            ? { ...n, data: { ...n.data, label: value } }
            : n
        )
      );
    }
  };
  return editing ? (
    <input
      ref={inputRef}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{ fontSize: 14, padding: 2, borderRadius: 2, border: "1px solid #ccc", width: 100 }}
    />
  ) : (
    <div onDoubleClick={handleDoubleClick} style={{ cursor: "pointer", fontWeight: selected ? "bold" : undefined }}>{value}</div>
  );
}

export function SpindleReactFlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: "node" | "edge" | null; id: string | null }>({ x: 0, y: 0, type: null, id: null });

  // nodeTypes closure so setNodes is available for EditableNodeLabel
  const nodeTypes: NodeTypes = React.useMemo(() => ({
    input: (props: any) => (
      <>
        <div className="rf-mindmap-node-inner">
          <div className="rf-mindmap-dragHandle" data-drag-handle>
            <svg viewBox="0 0 24 24" width={14} height={14} style={{ display: 'block' }}>
              <path
                fill="#888"
                stroke="#888"
                strokeWidth="1"
                d="M15 5h2V3h-2v2zM7 5h2V3H7v2zm8 8h2v-2h-2v2zm-8 0h2v-2H7v2zm8 8h2v-2h-2v2zm-8 0h2v-2H7v2z"
              />
            </svg>
          </div>
          <EditableNodeLabel id={props.id} data={props.data} selected={props.selected} setNodes={setNodes} />
        </div>
        <Handle type="source" position={Position.Right} style={{ background: '#2563eb' }} />
        <Handle type="target" position={Position.Left} style={{ background: '#2563eb' }} />
        <Handle type="source" position={Position.Bottom} style={{ background: '#2563eb' }} />
        <Handle type="target" position={Position.Top} style={{ background: '#2563eb' }} />
      </>
    ),
    default: (props: any) => (
      <>
        <div className="rf-mindmap-node-inner">
          <div className="rf-mindmap-dragHandle" data-drag-handle>
            <svg viewBox="0 0 24 24" width={14} height={14} style={{ display: 'block' }}>
              <path
                fill="#888"
                stroke="#888"
                strokeWidth="1"
                d="M15 5h2V3h-2v2zM7 5h2V3H7v2zm8 8h2v-2h-2v2zm-8 0h2v-2H7v2zm8 8h2v-2h-2v2zm-8 0h2v-2H7v2z"
              />
            </svg>
          </div>
          <EditableNodeLabel id={props.id} data={props.data} selected={props.selected} setNodes={setNodes} />
        </div>
        <Handle type="source" position={Position.Right} style={{ background: '#2563eb' }} />
        <Handle type="target" position={Position.Left} style={{ background: '#2563eb' }} />
        <Handle type="source" position={Position.Bottom} style={{ background: '#2563eb' }} />
        <Handle type="target" position={Position.Top} style={{ background: '#2563eb' }} />
      </>
    ),
    output: (props: any) => (
      <>
        <div className="rf-mindmap-node-inner">
          <div className="rf-mindmap-dragHandle" data-drag-handle>
            <svg viewBox="0 0 24 24" width={14} height={14} style={{ display: 'block' }}>
              <path
                fill="#888"
                stroke="#888"
                strokeWidth="1"
                d="M15 5h2V3h-2v2zM7 5h2V3H7v2zm8 8h2v-2h-2v2zm-8 0h2v-2H7v2zm8 8h2v-2h-2v2zm-8 0h2v-2H7v2z"
              />
            </svg>
          </div>
          <EditableNodeLabel id={props.id} data={props.data} selected={props.selected} setNodes={setNodes} />
        </div>
        <Handle type="source" position={Position.Right} style={{ background: '#2563eb' }} />
        <Handle type="target" position={Position.Left} style={{ background: '#2563eb' }} />
        <Handle type="source" position={Position.Bottom} style={{ background: '#2563eb' }} />
        <Handle type="target" position={Position.Top} style={{ background: '#2563eb' }} />
      </>
    ),
  }), [setNodes]);

  const onConnect: OnConnect = useCallback((connection: Connection) => setEdges((eds: Edge[]) => addEdge(connection, eds)), [setEdges]);

  // Add node handlers
  const addNode = (type: "input" | "default" | "output") => {
    const id = `${type}-${Date.now()}`;
    setNodes((nds: Node[]) => [
      ...nds,
      {
        id,
        type,
        position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
        data: { label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node` },
      },
    ]);
  };

  // Keyboard delete for selected nodes/edges
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        setNodes((nds: Node[]) => nds.filter((n: Node) => !(n as any).selected));
        setEdges((eds: Edge[]) => eds.filter((e: Edge) => !(e as any).selected));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setNodes, setEdges]);

  // Context menu for nodes/edges
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, type: "node", id: node.id });
  }, []);
  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, type: "edge", id: edge.id });
  }, []);
  const handleContextMenuAction = (action: string) => {
    if (contextMenu.type === "node" && contextMenu.id) {
      if (action === "delete") setNodes((nds: Node[]) => nds.filter((n: Node) => n.id !== contextMenu.id));
    } else if (contextMenu.type === "edge" && contextMenu.id) {
      if (action === "delete") setEdges((eds: Edge[]) => eds.filter((e: Edge) => e.id !== contextMenu.id));
    }
    setContextMenu({ x: 0, y: 0, type: null, id: null });
  };

  // Dismiss context menu on click elsewhere
  React.useEffect(() => {
    if (contextMenu.type) {
      const handler = () => setContextMenu({ x: 0, y: 0, type: null, id: null });
      window.addEventListener("click", handler);
      return () => window.removeEventListener("click", handler);
    }
  }, [contextMenu.type]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        style={{ width: '100%', height: '100%' }}
      >
        <MiniMap />
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Panel position="top-left">
          <button onClick={() => addNode("input")} className="mr-2 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">+ Input</button>
          <button onClick={() => addNode("default")} className="mr-2 px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">+ Default</button>
          <button onClick={() => addNode("output")} className="px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200">+ Output</button>
        </Panel>
      </ReactFlow>
    </div>
  );
} 