# React Flow Simple Implementation Plan
**Following React Flow's Actual Patterns - No Over-Engineering**

## 🎯 **CORE PRINCIPLE**
Build simple React components that React Flow can wrap. Prepare adapter mounting points but don't implement complex abstractions yet.

---

## 📋 **PHASE 1: Simple Foundation (Start Here)**

### 1.1 Clean Up Current Mess
- **DELETE** all current node components (`io-node.tsx`, `stage-node.tsx`, `base-node.tsx`)
- **DELETE** complex type system (`workflow.ts`)  
- **DELETE** over-engineered hooks (`useWorkflowNodes.ts`)
- Keep only: Server Actions (working perfectly), basic page structure

### 1.2 Create Simple Node Components
Following React Flow documentation patterns:

**IONode Component:**
```tsx
// app/components/workflow/nodes/IONode.tsx
import { Handle, Position } from '@xyflow/react';

function IONode({ data }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-blue-50 border-2 border-blue-200">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 !bg-blue-500" 
      />
      <div className="text-sm font-medium">{data.label}</div>
      <div className="text-xs text-gray-500">IO Node</div>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 !bg-blue-500" 
      />
    </div>
  );
}
```

**StageNode Component:**
```tsx
// app/components/workflow/nodes/StageNode.tsx
import { Handle, Position } from '@xyflow/react';

function StageNode({ data }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-green-50 border-2 border-green-200">
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-green-500" 
      />
      <div className="text-sm font-medium">{data.label}</div>
      <div className="text-xs text-gray-500">Stage Node</div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-green-500" 
      />
    </div>
  );
}
```

### 1.3 Simple Node Types Map
```tsx
// app/components/workflow/nodeTypes.ts
import IONode from './nodes/IONode';
import StageNode from './nodes/StageNode';

export const nodeTypes = {
  ioNode: IONode,
  stageNode: StageNode,
};
```

### 1.4 Basic Canvas Component
```tsx
// app/components/workflow/WorkflowCanvas.tsx
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './nodeTypes';

export default function WorkflowCanvas({ nodes, edges, onNodesChange, onEdgesChange }) {
  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
```

---

## 📋 **PHASE 2: Basic Integration**

### 2.1 Simple State Management
```tsx
// app/(private)/dashboard/function-model/[modelId]/page.tsx
'use client';

import { useState } from 'react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import WorkflowCanvas from '@/app/components/workflow/WorkflowCanvas';

// MOCK DATA for now - adapter mounting point prepared here
const initialNodes = [
  {
    id: '1',
    type: 'ioNode',
    position: { x: 250, y: 25 },
    data: { label: 'Input Node' },
  },
  {
    id: '2',
    type: 'stageNode',
    position: { x: 100, y: 125 },
    data: { label: 'Process Stage' },
  },
];

export default function ModelPage({ params }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 🔌 ADAPTER MOUNTING POINT - Replace mock data later
  // const { nodes, edges } = useServerData(params.modelId);

  return (
    <div className="h-screen">
      <WorkflowCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
      />
    </div>
  );
}
```

### 2.2 Add Node Creation UI
```tsx
// Simple toolbar for adding nodes
<div className="absolute top-4 left-4 z-10 flex gap-2">
  <button 
    onClick={() => addNode('ioNode')}
    className="px-3 py-1 bg-blue-500 text-white rounded"
  >
    Add IO Node
  </button>
  <button 
    onClick={() => addNode('stageNode')}
    className="px-3 py-1 bg-green-500 text-white rounded"
  >
    Add Stage
  </button>
</div>
```

---

## 📋 **PHASE 3: Adapter Mounting Points**

### 3.1 Server Actions Integration Points
Prepare clean interfaces where Server Actions can be mounted:

```tsx
// app/hooks/useSimpleNodes.ts
export function useSimpleNodes(modelId) {
  // 🔌 ADAPTER MOUNTING POINT
  // This is where Server Actions will be integrated later
  // For now, return mock data
  
  const addNode = (type, position) => {
    // 🔌 Future: Call addNodeAction here
    console.log('Add node:', type, position);
  };

  const updateNode = (id, changes) => {
    // 🔌 Future: Call updateNodeAction here  
    console.log('Update node:', id, changes);
  };

  return { nodes: mockNodes, addNode, updateNode };
}
```

### 3.2 Data Transformation Points
```tsx
// app/utils/nodeTransforms.ts
export function serverNodeToReactFlow(serverNode) {
  // 🔌 ADAPTER MOUNTING POINT
  // Simple transformation - no complex type system
  return {
    id: serverNode.id,
    type: serverNode.type,
    position: serverNode.position,
    data: { 
      label: serverNode.name,
      ...serverNode.data 
    }
  };
}

export function reactFlowToServerNode(reactFlowNode) {
  // 🔌 ADAPTER MOUNTING POINT  
  return {
    id: reactFlowNode.id,
    type: reactFlowNode.type,
    position: reactFlowNode.position,
    name: reactFlowNode.data.label,
    data: reactFlowNode.data
  };
}
```

---

## 📋 **PHASE 4: Server Actions Connection**

### 4.1 Replace Mock Data
- Connect `useSimpleNodes` hook to actual Server Actions
- Replace mock initial data with real database calls
- Implement real add/update/delete operations

### 4.2 Position Updates
- Add debounced position updates using existing `batchUpdateNodePositionsAction`
- Simple implementation - no complex optimistic updates initially

---

## 📋 **PHASE 5: Polish & Features**

### 5.1 Node Interactions
- Click to select
- Double-click to edit
- Drag to reposition

### 5.2 Edge Creation  
- Connect nodes with edges
- Save edge relationships

### 5.3 UI Enhancements
- Node toolbars
- Context menus
- Status indicators

---

## 🚨 **CRITICAL SUCCESS FACTORS**

### ✅ **DO:**
1. **Keep nodes simple** - Direct React components with `<Handle>` elements
2. **Follow React Flow patterns** - Use their state management hooks
3. **Prepare adapter points** - Clean interfaces for future Server Actions integration  
4. **Start with mock data** - Get UI working first, then connect real data
5. **One component at a time** - Build incrementally

### ❌ **DON'T:**
1. **Create complex abstractions** - No BaseNode, no complex type hierarchies
2. **Over-engineer handles** - Use `<Handle>` directly, not configuration objects
3. **Complex state management** - Use React Flow's built-in hooks
4. **Domain coupling** - Keep nodes simple, transform at boundaries
5. **All features at once** - Build incrementally

---

## 📂 **FILE STRUCTURE**
```
app/components/workflow/
├── WorkflowCanvas.tsx          # Main canvas component
├── nodeTypes.ts                # Simple node type mapping
└── nodes/
    ├── IONode.tsx             # Simple IO node component
    └── StageNode.tsx          # Simple stage node component

app/hooks/
└── useSimpleNodes.ts          # 🔌 Adapter mounting point

app/utils/
└── nodeTransforms.ts          # 🔌 Data transformation points
```

---

## 🎯 **IMMEDIATE NEXT STEPS**

1. **DELETE** current over-engineered components
2. **CREATE** simple IONode and StageNode components  
3. **BUILD** basic WorkflowCanvas with mock data
4. **VERIFY** React Flow renders correctly
5. **TEST** node dragging and basic interactions

**Goal: Get a simple, working React Flow canvas with 2 node types and mock data in under 1 hour.**