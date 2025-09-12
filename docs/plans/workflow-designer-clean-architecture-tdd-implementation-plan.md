# Workflow Designer Clean Architecture TDD Implementation Plan

**Document Version**: 1.0  
**Created**: 2025-01-12  
**Priority**: Critical (Phase 1B - Mock Elimination)  
**Estimated Effort**: 8-12 hours  

---

## 🎯 **Implementation Objective**

Convert the Workflow Designer from mock/fake implementations to production-ready Clean Architecture TDD following the successful patterns established in Dashboard and Model Detail components.

**Goal**: Eliminate remaining ~25% mock dependencies and achieve 90%+ production readiness.

---

## 📋 **Current State Analysis**

### **✅ Successfully Completed (Phase 1A)**
- ✅ Main Dashboard (`mockWorkflows` → real `useModels()` hook)
- ✅ Model Detail Page (`mockModel` → real `useModel(modelId)` hook)  
- ✅ Server Actions integration (create/update/publish/archive)
- ✅ Real database persistence via Supabase repositories

### **❌ Critical Issues Remaining (Phase 1B)**

#### **A. Fake Operation Handlers**
```typescript
// 🚨 CURRENT: Fake console.log handlers
const handleSaveNode = () => console.log('Save node');
const handleDeleteNode = () => console.log('Delete node');
const handleUpdateNodePosition = () => console.log('Update position');
```
**Required**: Connect to real Server Actions and database persistence

#### **B. Mock Node Management**
```typescript
// 🚨 CURRENT: Local state only, no persistence
const [nodes, setNodes] = useState(mockNodes);
const [edges, setEdges] = useState(mockEdges);
```
**Required**: Real node persistence with `useModelNodes(modelId)` hook

#### **C. Missing React Flow Integration**
- No collaborative editing (multiple users)
- No real-time node position updates
- No conflict resolution for concurrent edits
- Missing production-ready node components

#### **D. Fake ID Generation**
```typescript
// 🚨 CURRENT: Date.now() timestamps
id: `node-${Date.now()}`,
id: `edge-${Date.now()}`,
```
**Required**: Real UUID generation from backend

---

## 🏗️ **Clean Architecture TDD Approach**

### **Phase 1: RED - Write Failing Tests First**

#### **Test Suite 1: Node Management Integration**
**File**: `tests/integration/ui/workflow-designer.integration.test.tsx`

```typescript
describe('Workflow Designer Integration', () => {
  it('should load real nodes from database for model', async () => {
    // Test expects real data from useModelNodes(modelId)
    // Should FAIL initially with mock nodes
  });

  it('should persist node creation via Server Action', async () => {
    // Test expects addNodeAction to create real database record
    // Should FAIL initially with console.log handlers
  });

  it('should update node position in database', async () => {
    // Test expects real position updates via updateNodeAction
    // Should FAIL initially with local state only
  });

  it('should delete nodes via Server Action', async () => {
    // Test expects deleteNodeAction with real database removal
    // Should FAIL initially with fake handlers
  });
});
```

#### **Test Suite 2: Real-time Collaboration**
**File**: `tests/integration/ui/collaborative-editing.integration.test.tsx`

```typescript
describe('Collaborative Workflow Editing', () => {
  it('should show other users cursor positions', async () => {
    // Test expects CollaborationManager integration
  });

  it('should sync node changes across users', async () => {
    // Test expects RealtimeModelAdapter integration
  });

  it('should handle concurrent editing conflicts', async () => {
    // Test expects conflict resolution strategies
  });
});
```

### **Phase 2: GREEN - Implement Clean Architecture Components**

#### **Application Layer Updates**

**1. Node Management Use Cases**
```typescript
// lib/use-cases/function-model/manage-workflow-nodes-use-case.ts
export class ManageWorkflowNodesUseCase {
  async addNode(modelId: string, nodeData: AddNodeRequest): Promise<Result<NodeDto>>
  async updateNode(nodeId: string, updates: UpdateNodeRequest): Promise<Result<NodeDto>>
  async deleteNode(nodeId: string): Promise<Result<void>>
  async updateNodePosition(nodeId: string, position: Position): Promise<Result<NodeDto>>
}
```

**2. Query Handlers**
```typescript
// lib/use-cases/queries/get-model-nodes-query.ts
export class GetModelNodesQueryHandler {
  async handle(modelId: string): Promise<Result<NodeDto[]>>
}
```

#### **Infrastructure Layer Updates**

**1. Repository Enhancements**
```typescript
// lib/infrastructure/repositories/supabase-function-model-repository.ts
export class SupabaseFunctionModelRepository {
  async findNodes(modelId: string): Promise<Result<NodeDto[]>>
  async saveNode(node: NodeDto): Promise<Result<NodeDto>>
  async updateNodePosition(nodeId: string, position: Position): Promise<Result<NodeDto>>
  async deleteNode(nodeId: string): Promise<Result<void>>
}
```

#### **Interface Adapters Implementation**

**1. Node Management Server Actions**
```typescript
// app/actions/node-actions.ts
export async function addNodeAction(modelId: string, formData: FormData): Promise<ActionResult<NodeDto>>
export async function updateNodeAction(nodeId: string, formData: FormData): Promise<ActionResult<NodeDto>>  
export async function deleteNodeAction(nodeId: string): Promise<ActionResult<void>>
export async function updateNodePositionAction(nodeId: string, position: Position): Promise<ActionResult<NodeDto>>
```

**2. useModelNodes React Hook**
```typescript
// app/hooks/useModelNodes.ts
export function useModelNodes(modelId: string) {
  const [nodes, setNodes] = useState<NodeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real API integration
  const addNode = useCallback(async (nodeData: AddNodeRequest) => {
    const result = await addNodeAction(modelId, nodeData);
    if (result.success) {
      setNodes(prev => [...prev, result.data]);
    }
    return result;
  }, [modelId]);

  // More CRUD operations...
  
  return { nodes, loading, error, addNode, updateNode, deleteNode, updateNodePosition };
}
```

**3. Real-time Integration Hook**
```typescript
// app/hooks/useWorkflowCollaboration.ts  
export function useWorkflowCollaboration(modelId: string) {
  const { isConnected, lastEvent, collaborators, sendCollaborationEvent } = useModelRealTime(modelId, {
    enabled: true,
    includeCollaboration: true
  });

  // Cursor tracking, presence management, conflict resolution
  return { collaborators, isConnected, broadcastCursorMove, broadcastNodeSelection };
}
```

#### **UI Layer Implementation**

**1. Production-Ready Workflow Designer**
```typescript
// app/(private)/dashboard/function-model/[modelId]/components/workflow-designer.tsx
export function WorkflowDesigner({ modelId }: { modelId: string }) {
  // Real data integration
  const { nodes, edges, loading, error, addNode, updateNode, deleteNode } = useModelNodes(modelId);
  const { collaborators, broadcastCursorMove } = useWorkflowCollaboration(modelId);

  // React Flow integration with real handlers
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Real position updates to database
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        updateNodePositionAction(change.id, change.position);
      }
    });
  }, []);

  // Production-ready event handlers (replace console.log)
  const handleAddNode = useCallback(async (type: string, position: XYPosition) => {
    const result = await addNode({
      type,
      position,
      data: { label: `New ${type} Node` }
    });
    
    if (!result.success) {
      // Real error handling
      toast.error(`Failed to add node: ${result.error}`);
    }
  }, [addNode]);

  return (
    <div className="h-full w-full">
      {loading && <LoadingSpinner />}
      {error && <ErrorAlert message={error} retry={refetch} />}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
      >
        {/* Collaboration indicators */}
        {collaborators.map(collaborator => (
          <UserCursor key={collaborator.userId} user={collaborator} />
        ))}
      </ReactFlow>
    </div>
  );
}
```

### **Phase 3: REFACTOR - Optimize & Add Advanced Features**

#### **Performance Optimizations**
```typescript
// Memoize expensive operations
const memoizedNodes = useMemo(() => 
  nodes.map(node => ({
    ...node,
    data: { ...node.data, onDelete: () => deleteNode(node.id) }
  })), [nodes, deleteNode]
);

// Debounce position updates
const debouncedUpdatePosition = useDeferredValue(position);
```

#### **Real-time Collaboration Features**
```typescript
// Real-time node synchronization
useEffect(() => {
  if (lastEvent?.type === 'node_updated') {
    const updatedNode = lastEvent.data as NodeDto;
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
  }
}, [lastEvent]);

// Collaborative cursor tracking
const handleMouseMove = useCallback((event: MouseEvent) => {
  broadcastCursorMove({
    x: event.clientX,
    y: event.clientY,
    nodeId: selectedNodeId
  });
}, [broadcastCursorMove, selectedNodeId]);
```

---

## 🎯 **React Flow Integration Research**

### **Latest @xyflow/react Patterns (2024/2025)**

#### **1. Collaborative Node Editing**
```typescript
// Modern React Flow patterns for multi-user editing
import { ReactFlow, useReactFlow, Background, Controls } from '@xyflow/react';

const CollaborativeReactFlow = ({ modelId }: { modelId: string }) => {
  const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();
  
  // Real-time synchronization with conflict resolution
  const { collaborators, syncNodeChanges } = useWorkflowCollaboration(modelId);
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onConnect={onConnect}
      onNodesChange={syncNodeChanges} // Real-time sync
      fitView
    >
      <Background />
      <Controls />
      {/* Collaboration overlays */}
      <CollaborationLayer collaborators={collaborators} />
    </ReactFlow>
  );
};
```

#### **2. Custom Node Components with Real Operations**
```typescript
// Production-ready custom nodes with real database operations
const CustomFunctionNode = ({ data, id }: NodeProps) => {
  const { updateNode, deleteNode } = useModelNodes();
  
  const handleUpdate = useCallback(async (updates: Partial<NodeData>) => {
    const result = await updateNode(id, updates);
    if (!result.success) {
      toast.error(result.error);
    }
  }, [id, updateNode]);

  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Top} />
      <div>{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
      
      {/* Real operation buttons */}
      <button onClick={() => handleUpdate({ label: 'Updated' })}>
        Update
      </button>
      <button onClick={() => deleteNode(id)}>
        Delete  
      </button>
    </div>
  );
};
```

#### **3. Performance Optimization Patterns**
```typescript
// Efficient re-rendering with React Flow
const MemoizedReactFlow = memo(({ nodes, edges }: FlowProps) => {
  // Only re-render when nodes/edges actually change
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodesDraggable
      nodesConnectable
      elementsSelectable
    />
  );
});

// Virtualization for large workflows (1000+ nodes)
const VirtualizedWorkflow = ({ modelId }: { modelId: string }) => {
  const { nodes, edges } = useModelNodes(modelId);
  
  // Only render visible nodes
  const visibleNodes = useMemo(() => 
    nodes.filter(node => isNodeVisible(node, viewport))
  , [nodes, viewport]);
  
  return <ReactFlow nodes={visibleNodes} edges={edges} />;
};
```

---

## 📊 **Implementation Timeline**

### **Week 1: Foundation (RED/GREEN Phases)**
- **Day 1-2**: Write comprehensive failing tests
- **Day 3-4**: Implement Application Layer use cases and query handlers
- **Day 5**: Implement Infrastructure Layer repository updates
- **Day 6-7**: Implement Interface Adapters (Server Actions + React Hooks)

### **Week 2: UI Integration & Real-time Features**
- **Day 1-3**: Implement production-ready Workflow Designer component
- **Day 4-5**: Add React Flow collaborative editing features
- **Day 6-7**: Integrate real-time collaboration with RealtimeModelAdapter

### **Week 3: Performance & Polish (REFACTOR Phase)**
- **Day 1-2**: Performance optimizations and virtualization
- **Day 3-4**: Error handling and conflict resolution
- **Day 5-7**: Testing, debugging, and final integration

---

## ✅ **Success Criteria**

### **Technical Requirements**
- [ ] All console.log handlers replaced with real Server Actions
- [ ] Node persistence to Supabase database working
- [ ] Real-time collaboration with multiple users
- [ ] React Flow integration with production-ready patterns
- [ ] Error handling and user feedback
- [ ] Performance optimized for 100+ node workflows

### **Clean Architecture Compliance**
- [ ] Dependency Rule followed (UI → Interface Adapter → Application → Domain)
- [ ] No business logic in UI components
- [ ] Framework isolation maintained
- [ ] Proper error handling at all layers
- [ ] Integration tests covering full data flow

### **User Experience**
- [ ] Smooth workflow editing experience
- [ ] Real-time collaboration indicators
- [ ] Loading states and error messages
- [ ] Keyboard shortcuts and accessibility
- [ ] Mobile-responsive design

---

## 🚨 **Risk Mitigation**

### **Technical Risks**
1. **React Flow Performance**: Large workflows may cause performance issues
   - **Mitigation**: Implement virtualization and memoization
   
2. **Real-time Synchronization**: Conflicts in concurrent editing
   - **Mitigation**: Implement conflict resolution strategies with operational transforms
   
3. **Database Performance**: High-frequency node position updates
   - **Mitigation**: Debounce position updates and batch operations

### **Implementation Risks**  
1. **Complex State Management**: React Flow + Real-time + Database state
   - **Mitigation**: Use established patterns from Phase 1A implementations
   
2. **Test Coverage**: Complex UI interactions hard to test
   - **Mitigation**: Focus on integration tests at Interface Adapter boundaries

---

## 🔄 **Integration Points**

### **With Existing Systems**
- **Server Actions**: Extend existing model-actions.ts with node operations
- **DI Container**: Register new use cases and query handlers
- **Database Schema**: Use existing nodes/edges tables in Supabase
- **Real-time Adapters**: Leverage RealtimeModelAdapter and CollaborationManager

### **New Dependencies**
- **@xyflow/react**: Latest version for React Flow integration
- **React DnD**: For enhanced drag-and-drop interactions
- **React Hotkeys**: For keyboard shortcuts
- **Lodash**: For debouncing and utility functions

---

## 📈 **Expected Outcomes**

### **Post-Implementation State**
- **Mock Dependencies**: Reduced from 25% to <5% (90%+ production readiness)
- **User Experience**: Professional workflow designer with collaboration
- **Performance**: Scalable to 500+ node workflows
- **Maintainability**: Clean Architecture patterns established throughout

### **Business Impact**
- **Production Deployment Ready**: Core functionality fully integrated
- **User Collaboration**: Multi-user workflow editing capabilities
- **Scalability**: Foundation for advanced workflow features
- **Developer Velocity**: Clear patterns for future UI implementations

---

This implementation plan provides a comprehensive roadmap for eliminating the remaining critical mock dependencies while establishing production-ready collaborative workflow editing capabilities following Clean Architecture TDD principles.