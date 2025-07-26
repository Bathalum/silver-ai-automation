# React Flow Getting Started

## Overview

React Flow is a library for building node-based editors and interactive diagrams. It provides a set of components and hooks to create custom node editors, flowcharts, and interactive graphs.

## Installation

```bash
npm install reactflow
# or
yarn add reactflow
# or
pnpm add reactflow
```

## Basic Setup

### 1. Import React Flow

```tsx
import ReactFlow, { 
  Background, 
  Controls,
  MiniMap,
  Node,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
```

### 2. Create Your First Flow

```tsx
import { useState, useCallback } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Input Node' },
    position: { x: 250, y: 25 },
  },
  {
    id: '2',
    data: { label: 'Default Node' },
    position: { x: 100, y: 125 },
  },
  {
    id: '3',
    type: 'output',
    data: { label: 'Output Node' },
    position: { x: 250, y: 250 },
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

export default Flow;
```

## Key Concepts

### Nodes
Nodes are the main elements in a React Flow diagram. They can be:
- **Input nodes**: Entry points
- **Default nodes**: Regular processing nodes
- **Output nodes**: Exit points
- **Custom nodes**: User-defined node types

### Edges
Edges connect nodes and represent relationships or data flow between them.

### Handles
Handles are connection points on nodes where edges can start or end.

## Basic Configuration

### ReactFlow Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `Node[]` | `[]` | Array of nodes |
| `edges` | `Edge[]` | `[]` | Array of edges |
| `onNodesChange` | `(changes: NodeChange[]) => void` | - | Callback for node changes |
| `onEdgesChange` | `(changes: EdgeChange[]) => void` | - | Callback for edge changes |
| `onConnect` | `(connection: Connection) => void` | - | Callback for new connections |
| `fitView` | `boolean` | `false` | Fit view to nodes on mount |
| `fitViewOptions` | `FitViewOptions` | `{}` | Options for fit view |

### Node Structure

```typescript
interface Node {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: any;
  style?: CSSProperties;
  className?: string;
  targetPosition?: Position;
  sourcePosition?: Position;
  hidden?: boolean;
  selected?: boolean;
  dragging?: boolean;
}
```

### Edge Structure

```typescript
interface Edge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  style?: CSSProperties;
  className?: string;
  label?: string;
  labelStyle?: CSSProperties;
  labelShowBg?: boolean;
  labelBgStyle?: CSSProperties;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
}
```

## Common Use Cases

### 1. Basic Flowchart
```tsx
const nodes = [
  { id: '1', type: 'input', data: { label: 'Start' }, position: { x: 0, y: 0 } },
  { id: '2', data: { label: 'Process' }, position: { x: 0, y: 100 } },
  { id: '3', type: 'output', data: { label: 'End' }, position: { x: 0, y: 200 } },
];

const edges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];
```

### 2. Interactive Nodes
```tsx
const onNodeClick = useCallback((event, node) => {
  console.log('Node clicked:', node);
}, []);

<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodeClick={onNodeClick}
  // ... other props
/>
```

### 3. Custom Node Types
```tsx
const nodeTypes = {
  custom: CustomNode,
};

<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={nodeTypes}
  // ... other props
/>
```

## Styling

### CSS Classes
React Flow provides several CSS classes for styling:
- `.react-flow__node`: Base node styling
- `.react-flow__edge`: Base edge styling
- `.react-flow__handle`: Handle styling
- `.react-flow__controls`: Controls styling
- `.react-flow__minimap`: MiniMap styling

### Custom Styling
```css
.react-flow__node {
  border: 2px solid #333;
  border-radius: 8px;
  background: white;
  padding: 10px;
}

.react-flow__edge {
  stroke: #333;
  stroke-width: 2;
}

.react-flow__handle {
  background: #333;
  border: 2px solid white;
}
```

## Performance Tips

### 1. Memoize Callbacks
```tsx
const onConnect = useCallback(
  (params) => setEdges((eds) => addEdge(params, eds)),
  [setEdges],
);
```

### 2. Use React.memo for Custom Nodes
```tsx
const CustomNode = React.memo(({ data }) => {
  return <div>{data.label}</div>;
});
```

### 3. Optimize Node Updates
```tsx
const onNodesChange = useCallback(
  (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
  [setNodes],
);
```

## Common Issues and Solutions

### 1. Nodes Not Rendering
- Check that nodes have unique IDs
- Ensure position values are numbers
- Verify data property is present

### 2. Edges Not Connecting
- Verify source and target node IDs exist
- Check handle positions on nodes
- Ensure onConnect callback is provided

### 3. Performance Issues
- Use React.memo for custom components
- Implement virtual scrolling for large flows
- Optimize node and edge updates

## Next Steps

- [Custom Nodes](./custom-nodes.md)
- [Custom Edges](./custom-edges.md)
- [Advanced Features](./advanced-features.md)
- [Integration with State Management](./state-management.md)

---

**Source**: [React Flow Documentation](https://reactflow.dev/docs/getting-started/) 