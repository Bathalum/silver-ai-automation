# Presentation Layer: React Flow Edge Integration Implementation Plan

**Version:** 2.0  
**Created:** September 12, 2025  
**Status:** Implementation Plan  

## 🎯 **OBJECTIVE**
Implement React Flow edge persistence following Clean Architecture and TDD principles, connecting the sophisticated domain layer `NodeLink` entities with the React Flow UI handle system.

---

## 🏗️ **ARCHITECTURE OVERVIEW**

### **Current State Analysis**
- ✅ **Domain Layer**: `NodeLink` entity with comprehensive business rules
- ✅ **Infrastructure Layer**: `SupabaseNodeLinkRepository` with full CRUD operations
- ❌ **Application Layer**: Missing edge use cases
- ❌ **Interface Adapters**: No edge server actions
- ❌ **UI Layer**: React Flow edges only in local state

### **Target Architecture**
```
React Flow Handles → Edge Server Actions → Edge Use Cases → NodeLink Domain → Repository → Database
```

---

## 📋 **IMPLEMENTATION PLAN - CLEAN ARCHITECTURE TDD LOOP**

---

## Overview

The UI Components/Presentation Layer represents the outermost layer (Layer 5) in our Clean Architecture implementation. This layer is responsible for user interface concerns, user interactions, and presenting data to users through React components, Next.js pages, and client-side state management.

**Core Responsibility:** Transform domain concepts into visual representations and user interactions while maintaining strict boundaries with inner layers.

### Current Integration Status

- **40% Production-Ready:** Model list pages, creation flows, API routes
- **60% Mock Dependencies:** Main dashboard, model detail pages, workflow designer components

### Key Technologies

- **React 18** with modern hooks and concurrent features
- **Next.js 14** App Router with Server Components and Server Actions
- **React Flow** (@xyflow/react) for workflow visualization
- **TypeScript** for type safety across UI components
- **Tailwind CSS** + **shadcn/ui** for consistent styling
- **Supabase Real-time** for collaborative features

---

## Clean Architecture Context

### Layer Positioning

```
┌─────────────────────────────────────────────────────────┐
│ Layer 5: UI Components/Presentation (THIS LAYER)       │
├─────────────────────────────────────────────────────────┤
│ Layer 4: Interface Adapters (Server Actions, Hooks)    │
├─────────────────────────────────────────────────────────┤
│ Layer 3: Use Cases/Application (Business Workflows)    │
├─────────────────────────────────────────────────────────┤
│ Layer 2: Domain (Entities, Value Objects, Rules)       │
├─────────────────────────────────────────────────────────┤
│ Layer 1: Infrastructure (Database, External Services)   │
└─────────────────────────────────────────────────────────┘
```

### Dependency Flow Rules

| From Layer | To Layer | Allowed | Method |
|------------|----------|---------|---------|
| Presentation | Interface Adapters | ✅ Yes | Direct import of hooks, Server Actions |
| Presentation | Use Cases | ❌ No | Must go through Interface Adapters |
| Presentation | Domain | ❌ No | Must go through Interface Adapters |
| Presentation | Infrastructure | ❌ No | Must go through Interface Adapters |

### Architectural Boundaries

1. **UI State Management:** React hooks for component-level state
2. **Data Access:** Through Interface Adapter hooks (`useModels`, `useModelOperations`)
3. **User Actions:** Through Server Actions (`createModelAction`, `updateModelAction`)
4. **Real-time:** Through Real-time Adapters (`useModelRealTime`)

---

## Component Categories

### 1. Page Components (`/app/`)

**Purpose:** Top-level route components that orchestrate feature-level functionality.

#### Current Structure

```
app/
├── (private)/dashboard/function-model/
│   ├── page.tsx                    # 🔴 USES MOCK DATA
│   ├── [modelId]/page.tsx          # 🔴 USES MOCK DATA
│   ├── [modelId]/edit/page.tsx     # ⚡ Mixed integration
│   ├── new/page.tsx                # ✅ Production-ready
│   └── list/page.tsx               # ✅ Production-ready
```

#### Integration Status

| Page | Status | Mock Usage | Production Integration |
|------|--------|------------|----------------------|
| Main Dashboard | 🔴 Mock | `mockWorkflows` array | Need `useModels()` hook |
| Model Detail | 🔴 Mock | `mockModel` object | Need `useModel(modelId)` hook |
| Model Editor | ⚡ Mixed | Console.log handlers | Need real action handlers |
| Model Creation | ✅ Ready | None | Uses `createModelAction` |
| Model List | ✅ Ready | None | Uses `useModels` + `useModelOperations` |

### 2. Feature Components (`/app/(private)/dashboard/function-model/components/`)

**Purpose:** Domain-specific components that encapsulate Function Model business logic.

#### Workflow Designer Components

```
components/
├── nodes/                          # Node type components
│   ├── io-node.tsx                 # Container node implementation
│   ├── stage-node.tsx              # Container node implementation  
│   ├── tether-node.tsx             # Action node implementation
│   ├── kb-node.tsx                 # Action node implementation
│   └── function-model-container-node.tsx # Nested container
├── panels/                         # Side panels and forms
│   ├── node-properties-form.tsx    # 🔴 NEEDS REAL HANDLERS
│   ├── workflow-config-panel.tsx   # 🔴 NEEDS REAL HANDLERS
│   └── context-panel.tsx           # 🔴 NEEDS REAL HANDLERS
├── controls/                       # Execution and orchestration
│   ├── execution-controls.tsx      # 🔴 CONSOLE.LOG ONLY
│   ├── orchestration-controls.tsx  # 🔴 CONSOLE.LOG ONLY
│   └── execution-history.tsx       # 🔴 CONSOLE.LOG ONLY
└── management/                     # CRUD operations
    ├── workflow-list.tsx           # ⚡ Mixed integration
    ├── workflow-creator.tsx        # ✅ Production-ready
    └── workflow-editor.tsx         # 🔴 NEEDS REAL HANDLERS
```

### 3. Shared UI Components (`/components/ui/`)

**Purpose:** Reusable, domain-agnostic UI primitives based on shadcn/ui.

#### Component Inventory

| Component | Status | Integration | Dependencies |
|-----------|--------|-------------|--------------|
| Button | ✅ Ready | Complete | Radix UI |
| Card | ✅ Ready | Complete | Radix UI |
| Input | ✅ Ready | Complete | Radix UI |
| Badge | ✅ Ready | Complete | Radix UI |
| Form | ✅ Ready | Complete | React Hook Form + Zod |
| Dialog | ✅ Ready | Complete | Radix UI |
| Toast | ✅ Ready | Complete | Sonner |

### 4. Composite Components (`/components/composites/workflow/`)

**Purpose:** Multi-component compositions that provide complete workflow functionality.

#### Workflow Canvas System

```
workflow/
├── layout/
│   ├── workflow-container.tsx      # Main container with toolbar
│   ├── workflow-header.tsx         # Model info and actions
│   └── workflow-footer.tsx         # Status and statistics
├── canvas/
│   ├── minimap.tsx                 # React Flow minimap
│   ├── zoom-controls.tsx           # Canvas navigation
│   └── grid-background.tsx         # Visual grid system
├── context/
│   ├── context-access-panel.tsx    # Variable management
│   └── context-flow-visualization.tsx # Context inheritance
├── validation/
│   └── workflow-validator.tsx      # Real-time validation
└── accessibility/
    └── workflow-accessibility.tsx  # A11y enhancements
```

---

## Data Flow Patterns

### 1. Mock Data Flow (Current - 60% of components)

```
UI Component → Mock Array/Object → Display
     ↓
Console.log() handlers (no real action)
```

**Problems:**
- Fake IDs using `Date.now()`
- Hardcoded status and metadata
- No persistence or real-time updates
- Inconsistent data transformations

### 2. Production Data Flow (Target - 100% of components)

```
UI Component → Interface Adapter Hook → Server Action/API Route
     ↓                 ↓                         ↓
Display Updates ← Domain Model ← Use Case ← Repository
     ↓                 ↓                         ↓
Real-time Sync ← Event Bus ← Domain Events ← Database
```

### 3. Server Action Integration Pattern

```typescript
// ❌ Current Mock Pattern
const handleCreate = () => {
  console.log('Create workflow')
  // Fake ID generation
  const id = Date.now().toString()
  // No persistence
}

// ✅ Production Pattern  
import { createModelAction } from '@/app/actions/model-actions'

const handleCreate = async (formData: FormData) => {
  // Real Server Action with validation, persistence, and redirect
  await createModelAction(formData)
}
```

### 4. Real-time Data Synchronization

```typescript
// Production pattern for collaborative features
const { models, loading, error } = useModels()
const { subscribe, unsubscribe } = useModelRealTime()

useEffect(() => {
  const subscription = subscribe(modelId, {
    onUpdate: (model) => updateLocalState(model),
    onNodeChange: (nodes) => syncWorkflowCanvas(nodes),
    onPresence: (users) => updateCollaborators(users)
  })
  
  return () => unsubscribe(subscription)
}, [modelId])
```

---

## Integration Patterns

### 1. React Hook Integration (Interface Adapters)

#### Available Production Hooks

| Hook | Purpose | Integration Status | Usage Pattern |
|------|---------|-------------------|---------------|
| `useModels()` | List models with pagination | ✅ Ready | `const { models, loading, error } = useModels()` |
| `useModel(id)` | Single model details | ✅ Ready | `const { model, loading, error } = useModel(modelId)` |
| `useModelOperations()` | CRUD operations | ✅ Ready | `const { create, update, delete } = useModelOperations()` |
| `useModelNodes(id)` | Model node structure | ✅ Ready | `const { nodes, edges, loading } = useModelNodes(modelId)` |
| `useModelRealTime(id)` | Live collaboration | ✅ Ready | `const { subscribe, presence } = useModelRealTime(modelId)` |
| `useExecutionStatus(id)` | Workflow execution | ✅ Ready | `const { status, progress, logs } = useExecutionStatus(runId)` |

#### Hook Usage Pattern

```typescript
// ✅ Production-ready component pattern
function WorkflowListComponent() {
  const { models, loading, error, refresh } = useModels({
    page: 1,
    pageSize: 20,
    status: 'active',
    sortBy: 'updated_at'
  })
  
  const { update, delete: deleteModel } = useModelOperations()
  
  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorBoundary error={error} />
  
  return (
    <div className="grid gap-4">
      {models.map(model => (
        <ModelCard 
          key={model.id}
          model={model}
          onUpdate={(data) => update(model.id, data)}
          onDelete={() => deleteModel(model.id)}
        />
      ))}
    </div>
  )
}
```

### 2. Server Action Integration

#### Available Server Actions

| Action | Purpose | Integration Status | Error Handling |
|--------|---------|-------------------|----------------|
| `createModelAction` | Create new model | ✅ Ready | Validation + redirect |
| `updateModelAction` | Update existing model | ✅ Ready | Result object |
| `deleteModelAction` | Soft delete model | ✅ Ready | Result object |
| `publishModelAction` | Publish model version | ✅ Ready | Result object |
| `archiveModelAction` | Archive model | ✅ Ready | Result object |
| `executeModelAction` | Execute workflow | 🔄 In Progress | Result object |

#### Server Action Pattern

```typescript
// ✅ Form with Server Action integration
import { createModelAction } from '@/app/actions/model-actions'

export function CreateModelForm() {
  return (
    <form action={createModelAction}>
      <Input name="name" placeholder="Model name" required />
      <Textarea name="description" placeholder="Description" />
      <Select name="templateId">
        <option value="">No template</option>
        <option value="workflow-basic">Basic Workflow</option>
      </Select>
      <Button type="submit">Create Model</Button>
    </form>
  )
}
```

### 3. Form State Management

#### React Hook Form Integration

```typescript
// ✅ Advanced form with validation
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createModelSchema } from '@/lib/validation/model-schemas'

export function AdvancedModelForm() {
  const form = useForm({
    resolver: zodResolver(createModelSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'workflow',
      executionMode: 'sequential'
    }
  })
  
  const { handleSubmit, formState: { errors, isSubmitting } } = form
  
  const onSubmit = async (data) => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, String(value))
    })
    
    await createModelAction(formData)
  }
  
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Form fields with validation */}
      </form>
    </Form>
  )
}
```

---

## React Flow Integration

### 1. Workflow Designer Architecture

#### Core React Flow Setup

```typescript
// ✅ Production workflow designer pattern
import { ReactFlow, useNodesState, useEdgesState } from '@xyflow/react'

export function WorkflowDesigner({ modelId }: { modelId: string }) {
  const { model, loading } = useModel(modelId)
  const { nodes: modelNodes, edges: modelEdges } = useModelNodes(modelId)
  const { updateNodes, updateEdges } = useModelOperations()
  
  const [nodes, setNodes, onNodesChange] = useNodesState(modelNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(modelEdges)
  
  const onConnect = useCallback((connection) => {
    // Real connection handling with persistence
    const newEdge = createEdge(connection)
    updateEdges(modelId, [...edges, newEdge])
  }, [edges, modelId, updateEdges])
  
  const nodeTypes = useMemo(() => ({
    'io': IONode,
    'stage': StageNode,  
    'tether': TetherNode,
    'kb': KBNode,
    'functionModel': FunctionModelContainerNode
  }), [])
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
    >
      <Background />
      <MiniMap />
      <Controls />
    </ReactFlow>
  )
}
```

### 2. Node Component Integration

#### Custom Node Pattern

```typescript
// ✅ Production node component pattern
import { Handle, Position, NodeProps } from '@xyflow/react'
import { useNodeOperations } from '@/app/hooks/useNodeOperations'

interface StageNodeData {
  name: string
  description: string
  status: 'idle' | 'running' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  executionMode: 'sequential' | 'parallel' | 'conditional'
}

export function StageNode({ id, data, selected }: NodeProps<StageNodeData>) {
  const { updateNode, executeNode } = useNodeOperations()
  
  const handleExecute = async () => {
    // Real node execution with progress tracking
    await executeNode(id, { 
      parameters: data.parameters,
      context: data.contextVariables 
    })
  }
  
  const handleUpdate = async (updates: Partial<StageNodeData>) => {
    // Real node update with validation
    await updateNode(id, updates)
  }
  
  return (
    <div className={cn(
      'border rounded-lg p-4 min-w-[200px]',
      selected && 'ring-2 ring-blue-500',
      data.status === 'running' && 'border-blue-500 bg-blue-50',
      data.status === 'completed' && 'border-green-500 bg-green-50',
      data.status === 'failed' && 'border-red-500 bg-red-50'
    )}>
      <Handle type="target" position={Position.Top} />
      
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium">{data.name}</h3>
        <NodeStatusBadge status={data.status} />
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{data.description}</p>
      
      <div className="flex gap-2">
        <Button 
          size="sm" 
          onClick={handleExecute}
          disabled={data.status === 'running'}
        >
          {data.status === 'running' ? 'Running...' : 'Execute'}
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => openConfigPanel(id)}
        >
          Configure
        </Button>
      </div>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
```

### 3. Real-time Collaboration

#### Collaborative Workflow Editing

```typescript
// ✅ Real-time collaborative editor
export function CollaborativeWorkflowEditor({ modelId }: { modelId: string }) {
  const { nodes, edges } = useModelNodes(modelId)
  const { subscribe, presence, broadcast } = useModelRealTime(modelId)
  const [collaborators, setCollaborators] = useState<User[]>([])
  
  useEffect(() => {
    const subscription = subscribe({
      onNodeUpdate: (nodeUpdate) => {
        // Apply real-time node changes from other users
        setNodes(prev => updateNodeInArray(prev, nodeUpdate))
      },
      onPresenceChange: (users) => {
        // Update collaborator list
        setCollaborators(users.filter(u => u.id !== currentUser.id))
      },
      onCursorMove: (cursor) => {
        // Show other users' cursors on canvas
        updateCursorPositions(cursor)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [modelId])
  
  const onNodeDrag = useCallback((event, node) => {
    // Broadcast node position changes to collaborators
    broadcast('node-drag', {
      nodeId: node.id,
      position: node.position,
      userId: currentUser.id
    })
  }, [broadcast, currentUser.id])
  
  return (
    <div className="relative">
      {/* Collaborator cursors */}
      {collaborators.map(user => (
        <CollaboratorCursor 
          key={user.id} 
          user={user} 
          position={user.cursorPosition} 
        />
      ))}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeDrag={onNodeDrag}
        onSelectionChange={onSelectionBroadcast}
      />
      
      {/* Collaboration panel */}
      <CollaborationPanel collaborators={collaborators} />
    </div>
  )
}
```

---

## Real-time Features

### 1. Live Model Updates

#### Real-time Data Synchronization

| Feature | Implementation | Status | Dependencies |
|---------|---------------|--------|--------------|
| Model Changes | Supabase Real-time | ✅ Ready | `useModelRealTime` hook |
| Node Updates | WebSocket broadcast | ✅ Ready | Real-time Adapter |
| Execution Status | Server-Sent Events | ✅ Ready | `useExecutionStatus` hook |
| Presence Tracking | Supabase Presence | ✅ Ready | Collaboration Manager |
| Cursor Sharing | WebSocket broadcast | 🔄 In Progress | Custom implementation |
| Comment System | Real-time messaging | 📋 Planned | Chat integration |

### 2. Collaborative Features

#### Multi-user Workflow Editing

```typescript
// ✅ Collaborative editing implementation
export function useCollaborativeWorkflow(modelId: string) {
  const { user } = useAuth()
  const [presence, setPresence] = useState<PresenceState>({})
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([])
  
  const collaborationManager = useMemo(() => 
    new CollaborationManager({
      modelId,
      userId: user.id,
      onPresenceChange: setPresence,
      onConflict: (conflict) => setConflicts(prev => [...prev, conflict]),
      conflictResolution: 'last-write-wins' // or 'operational-transform'
    }), [modelId, user.id])
  
  const broadcastChange = useCallback((change: ModelChange) => {
    collaborationManager.broadcast(change)
  }, [collaborationManager])
  
  const resolveConflict = useCallback((conflictId: string, resolution: 'accept' | 'reject') => {
    collaborationManager.resolveConflict(conflictId, resolution)
  }, [collaborationManager])
  
  return {
    presence,
    conflicts,
    broadcastChange,
    resolveConflict,
    collaborators: Object.values(presence).filter(p => p.userId !== user.id)
  }
}
```

### 3. Real-time Execution Monitoring

#### Live Workflow Execution

```typescript
// ✅ Real-time execution monitoring
export function ExecutionMonitor({ executionId }: { executionId: string }) {
  const { status, progress, logs, nodes } = useExecutionStatus(executionId)
  const [timeline, setTimeline] = useState<ExecutionEvent[]>([])
  
  useEffect(() => {
    const eventSource = new EventSource(`/api/executions/${executionId}/stream`)
    
    eventSource.onmessage = (event) => {
      const executionEvent: ExecutionEvent = JSON.parse(event.data)
      
      switch (executionEvent.type) {
        case 'node-started':
          updateNodeStatus(executionEvent.nodeId, 'running')
          break
        case 'node-completed':
          updateNodeStatus(executionEvent.nodeId, 'completed')
          break
        case 'node-failed':
          updateNodeStatus(executionEvent.nodeId, 'failed')
          showErrorDetails(executionEvent.error)
          break
        case 'execution-progress':
          setProgress(executionEvent.progress)
          break
      }
      
      setTimeline(prev => [...prev, executionEvent])
    }
    
    return () => eventSource.close()
  }, [executionId])
  
  return (
    <div className="space-y-4">
      <ExecutionProgressBar progress={progress} status={status} />
      <ExecutionTimeline events={timeline} />
      <ExecutionLogs logs={logs} />
      {status === 'failed' && <ErrorAnalysis execution={executionId} />}
    </div>
  )
}
```

---

## Error Handling

### 1. UI Error Boundaries

#### Component-Level Error Handling

```typescript
// ✅ Production error boundary pattern
export class WorkflowErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service
    console.error('Workflow component error:', error, errorInfo)
    
    // Report to monitoring service
    if (typeof window !== 'undefined') {
      window.gtag?.('event', 'exception', {
        description: error.message,
        fatal: false
      })
    }
  }
  
  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || WorkflowErrorFallback
      return <FallbackComponent error={this.state.error!} />
    }
    
    return this.props.children
  }
}

// Error fallback component
function WorkflowErrorFallback({ error }: { error: Error }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-800 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Workflow Error
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-red-700">
          An error occurred while rendering the workflow designer.
        </p>
        <details className="text-sm">
          <summary className="cursor-pointer text-red-600">Error Details</summary>
          <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
            {error.message}
          </pre>
        </details>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 2. Form Validation Errors

#### Client-Side Validation Integration

```typescript
// ✅ Form error handling pattern
export function ModelCreationForm() {
  const form = useForm({
    resolver: zodResolver(createModelSchema),
    mode: 'onChange'
  })
  
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const onSubmit = async (data: ModelFormData) => {
    setIsSubmitting(true)
    setServerError(null)
    
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value))
      })
      
      const result = await createModelActionWithState(null, formData)
      
      if (!result.success) {
        if (result.validationErrors) {
          // Set field-specific errors
          result.validationErrors.forEach(({ field, message }) => {
            form.setError(field as keyof ModelFormData, { 
              type: 'server', 
              message 
            })
          })
        } else {
          setServerError(result.error || 'Failed to create model')
        }
        return
      }
      
      // Success - redirect handled by Server Action
      toast.success('Model created successfully')
      
    } catch (error) {
      setServerError('An unexpected error occurred. Please try again.')
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter model name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Additional form fields */}
        
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Model'
          )}
        </Button>
      </form>
    </Form>
  )
}
```

### 3. Network Error Handling

#### API Error Recovery

```typescript
// ✅ Network error handling with retry
export function useApiWithRetry<T>(
  apiCall: () => Promise<T>,
  options: {
    retries?: number
    retryDelay?: number
    onError?: (error: Error, attempt: number) => void
  } = {}
) {
  const { retries = 3, retryDelay = 1000, onError } = options
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<T | null>(null)
  
  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const result = await apiCall()
        setData(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        
        if (attempt <= retries) {
          onError?.(error, attempt)
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
          continue
        }
        
        setError(error)
        throw error
      }
    }
  }, [apiCall, retries, retryDelay, onError])
  
  useEffect(() => {
    execute()
  }, [])
  
  return { data, loading, error, retry: execute }
}

// Usage in component
export function ModelListWithRetry() {
  const { data: models, loading, error, retry } = useApiWithRetry(
    () => fetchModels(),
    {
      retries: 3,
      retryDelay: 1000,
      onError: (error, attempt) => {
        console.warn(`API call failed (attempt ${attempt}):`, error.message)
      }
    }
  )
  
  if (loading) return <LoadingSkeleton />
  
  if (error) {
    return (
      <ErrorState 
        error={error} 
        onRetry={retry}
        message="Failed to load models. Please try again."
      />
    )
  }
  
  return <ModelGrid models={models} />
}
```

---

## Testing Strategy

### 1. Component Testing

#### Unit Tests for UI Components

```typescript
// ✅ Component testing pattern
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ModelCard } from '@/components/model-card'
import { mockModel } from '@/tests/mocks/model-data'

describe('ModelCard Component', () => {
  const mockOnUpdate = jest.fn()
  const mockOnDelete = jest.fn()
  
  beforeEach(() => {
    mockOnUpdate.mockClear()
    mockOnDelete.mockClear()
  })
  
  it('renders model information correctly', () => {
    render(
      <ModelCard 
        model={mockModel}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    )
    
    expect(screen.getByText(mockModel.name)).toBeInTheDocument()
    expect(screen.getByText(mockModel.description)).toBeInTheDocument()
    expect(screen.getByText(`v${mockModel.version}`)).toBeInTheDocument()
  })
  
  it('handles update action correctly', async () => {
    render(<ModelCard model={mockModel} onUpdate={mockOnUpdate} onDelete={mockOnDelete} />)
    
    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)
    
    // Simulate form interaction
    const nameInput = screen.getByDisplayValue(mockModel.name)
    fireEvent.change(nameInput, { target: { value: 'Updated Model Name' } })
    
    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        ...mockModel,
        name: 'Updated Model Name'
      })
    })
  })
  
  it('shows loading state during operations', async () => {
    const slowUpdate = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    render(<ModelCard model={mockModel} onUpdate={slowUpdate} onDelete={mockOnDelete} />)
    
    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)
    
    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)
    
    expect(screen.getByText(/saving/i)).toBeInTheDocument()
  })
})
```

### 2. Integration Testing

#### Page-Level Integration Tests

```typescript
// ✅ Integration testing pattern
import { render, screen, waitFor } from '@testing-library/react'
import { ModelListPage } from '@/app/(private)/dashboard/function-model/list/page'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { rest } from 'msw'
import { mockModels } from '@/tests/mocks/api-responses'

const server = setupServer(
  rest.get('/api/function-models', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: mockModels,
      meta: {
        pagination: {
          page: 1,
          pageSize: 20,
          total: mockModels.length,
          totalPages: 1
        }
      }
    }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Model List Page Integration', () => {
  const renderWithProviders = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }
  
  it('loads and displays models from API', async () => {
    renderWithProviders(<ModelListPage />)
    
    // Should show loading initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    
    // Should display models after loading
    await waitFor(() => {
      expect(screen.getByText(mockModels[0].name)).toBeInTheDocument()
    })
    
    // Should display all models
    mockModels.forEach(model => {
      expect(screen.getByText(model.name)).toBeInTheDocument()
    })
  })
  
  it('handles API errors gracefully', async () => {
    server.use(
      rest.get('/api/function-models', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({
          success: false,
          error: { message: 'Internal Server Error' }
        }))
      })
    )
    
    renderWithProviders(<ModelListPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load models/i)).toBeInTheDocument()
    })
    
    // Should show retry button
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
```

### 3. E2E Testing with Playwright

#### Full User Journey Tests

```typescript
// ✅ E2E testing pattern
import { test, expect } from '@playwright/test'

test.describe('Function Model Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to function models
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'test@example.com')
    await page.fill('[data-testid=password]', 'password123')
    await page.click('[data-testid=login-button]')
    await page.waitForURL('/dashboard')
    
    await page.click('[data-testid=function-model-nav]')
  })
  
  test('creates and edits a workflow', async ({ page }) => {
    // Create new model
    await page.click('[data-testid=create-model-button]')
    await page.fill('[data-testid=model-name]', 'Test Workflow')
    await page.fill('[data-testid=model-description]', 'A test workflow for E2E testing')
    await page.click('[data-testid=create-button]')
    
    // Should redirect to workflow designer
    await page.waitForURL(/\/function-model\/[^\/]+$/)
    
    // Add nodes to workflow
    await page.click('[data-testid=add-node-button]')
    await page.click('[data-testid=stage-node-option]')
    
    // Configure node
    const node = page.locator('[data-testid=workflow-node]').first()
    await node.click()
    await page.fill('[data-testid=node-name]', 'Process Data')
    await page.fill('[data-testid=node-description]', 'Data processing stage')
    await page.click('[data-testid=save-node-button]')
    
    // Save workflow
    await page.click('[data-testid=save-workflow-button]')
    await expect(page.locator('[data-testid=save-success]')).toBeVisible()
    
    // Verify workflow appears in list
    await page.goto('/dashboard/function-model')
    await expect(page.locator('text=Test Workflow')).toBeVisible()
  })
  
  test('executes a workflow and monitors progress', async ({ page }) => {
    // Navigate to existing workflow
    await page.click('[data-testid=workflow-link]').first()
    
    // Execute workflow
    await page.click('[data-testid=execute-button]')
    
    // Monitor execution
    await expect(page.locator('[data-testid=execution-status]')).toContainText('Running')
    
    // Wait for completion
    await page.waitForSelector('[data-testid=execution-completed]', { timeout: 30000 })
    await expect(page.locator('[data-testid=execution-status]')).toContainText('Completed')
    
    // Check execution logs
    await page.click('[data-testid=execution-logs-tab]')
    await expect(page.locator('[data-testid=log-entries]')).toBeVisible()
  })
})
```

### 4. Performance Testing

#### Component Performance Monitoring

```typescript
// ✅ Performance testing utilities
import { measureRenderTime } from '@/tests/utils/performance'

describe('Workflow Designer Performance', () => {
  it('renders large workflows within acceptable time', async () => {
    const largeWorkflow = createMockWorkflowWithNodes(100) // 100 nodes
    
    const { renderTime, component } = await measureRenderTime(
      () => render(<WorkflowDesigner workflow={largeWorkflow} />)
    )
    
    // Should render within 2 seconds
    expect(renderTime).toBeLessThan(2000)
    
    // Should be interactive
    const firstNode = component.getByTestId('workflow-node-1')
    expect(firstNode).toBeInTheDocument()
  })
  
  it('handles real-time updates efficiently', async () => {
    const { component, measureUpdate } = setupPerformanceTest(
      <WorkflowDesigner workflow={mockWorkflow} />
    )
    
    // Measure time to process 10 rapid updates
    const updateTimes = []
    for (let i = 0; i < 10; i++) {
      const updateTime = await measureUpdate(() => {
        // Simulate real-time node update
        fireEvent(window, new CustomEvent('node-update', {
          detail: { nodeId: `node-${i}`, status: 'running' }
        }))
      })
      updateTimes.push(updateTime)
    }
    
    const avgUpdateTime = updateTimes.reduce((a, b) => a + b) / updateTimes.length
    expect(avgUpdateTime).toBeLessThan(50) // 50ms per update
  })
})
```

---

## Mock Elimination Plan

### Phase 1: Main Dashboard (Priority 1)

#### Current Mock Usage in `/app/(private)/dashboard/function-model/page.tsx`

**Mock Code to Replace:**
```typescript
// 🔴 REMOVE: Lines 11-43 mockWorkflows array
const mockWorkflows = [
  {
    id: '1',
    name: 'Customer Onboarding Process',
    // ... hardcoded data
  }
]

// 🔴 REMOVE: Lines 80 mockWorkflows.map()
{mockWorkflows.map((workflow) => (
  <Card key={workflow.id}>
    {/* ... */}
  </Card>
))}
```

**Replacement Implementation:**
```typescript
// ✅ ADD: Real hook integration
import { useModels } from '@/app/hooks/useModels'
import { useModelOperations } from '@/app/hooks/useModelOperations'

export default function FunctionModelPage() {
  const { models, loading, error, refresh } = useModels({
    status: 'active',
    sortBy: 'updated_at',
    sortOrder: 'desc'
  })
  
  if (loading) return <ModelListSkeleton />
  if (error) return <ErrorBoundary error={error} onRetry={refresh} />
  
  return (
    <div className="container mx-auto p-6">
      {/* Header unchanged */}
      
      {/* Replace mock map with real data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {models.map((model) => (
          <ModelCard 
            key={model.id}
            model={model}
            onUpdate={(data) => updateModel(model.id, data)}
            onDelete={() => deleteModel(model.id)}
          />
        ))}
      </div>
    </div>
  )
}
```

### Phase 2: Model Detail Page (Priority 1)

#### Current Mock Usage in `/app/(private)/dashboard/function-model/[modelId]/page.tsx`

**Mock Code to Replace:**
```typescript
// 🔴 REMOVE: Lines 17-29 mockModel object
const mockModel = {
  id: '1',
  name: 'Customer Onboarding Process',
  // ... hardcoded data
}

// 🔴 REMOVE: Lines 89-97 console.log handlers
onSave={() => console.log('Save workflow')}
onPublish={() => console.log('Publish workflow')}
onArchive={() => console.log('Archive workflow')}
```

**Replacement Implementation:**
```typescript
// ✅ ADD: Real data and handlers
import { useModel } from '@/app/hooks/useModel'
import { useModelOperations } from '@/app/hooks/useModelOperations'

export default function WorkflowDesignerPage() {
  const params = useParams()
  const modelId = params.modelId as string
  
  const { model, loading, error } = useModel(modelId)
  const { update, publish, archive } = useModelOperations()
  
  if (loading) return <ModelDetailSkeleton />
  if (error) return <ErrorBoundary error={error} />
  if (!model) return <NotFound />
  
  const handleSave = async (updates: Partial<ModelData>) => {
    await update(modelId, updates)
    toast.success('Model saved successfully')
  }
  
  const handlePublish = async (version: string) => {
    await publish(modelId, { version })
    toast.success('Model published successfully')
  }
  
  return (
    <div className="h-screen flex flex-col">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{model.name}</h1>
            <div className="flex items-center space-x-3 text-sm text-gray-600">
              <span>v{model.version}</span>
              <Badge variant="default">{model.status}</Badge>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <WorkflowContainer
          modelName={model.name}
          version={model.version}
          status={model.status}
          initialNodes={model.nodes}
          initialEdges={model.edges}
          onSave={handleSave}
          onPublish={handlePublish}
          onArchive={() => archive(modelId)}
        />
      </div>
    </div>
  )
}
```

### Phase 3: Workflow Designer Components (Priority 2)

#### Node Property Forms

**Mock Handler Pattern to Replace:**
```typescript
// 🔴 CURRENT: Console.log only handlers
const handlePropertyChange = (property: string, value: any) => {
  console.log(`Property ${property} changed to:`, value)
}

const handleNodeUpdate = () => {
  console.log('Node updated')
}
```

**Production Handler Implementation:**
```typescript
// ✅ REPLACEMENT: Real property updates
import { useNodeOperations } from '@/app/hooks/useNodeOperations'

export function NodePropertiesForm({ nodeId, initialData }: Props) {
  const { updateNode } = useNodeOperations()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const form = useForm({
    resolver: zodResolver(nodePropertiesSchema),
    defaultValues: initialData
  })
  
  const onSubmit = async (data: NodeProperties) => {
    setIsSubmitting(true)
    try {
      await updateNode(nodeId, data)
      toast.success('Node properties updated')
    } catch (error) {
      toast.error('Failed to update node properties')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Properties'}
        </Button>
      </form>
    </Form>
  )
}
```

### Phase 4: Execution Controls (Priority 2)

#### Execution Control Panel

**Mock Pattern to Replace:**
```typescript
// 🔴 CURRENT: Fake execution status
const [isRunning, setIsRunning] = useState(false)

const handleExecute = () => {
  console.log('Execute workflow')
  setIsRunning(true)
  setTimeout(() => setIsRunning(false), 3000) // Fake completion
}
```

**Production Implementation:**
```typescript
// ✅ REPLACEMENT: Real execution with monitoring
import { useModelExecution } from '@/app/hooks/useModelExecution'

export function ExecutionControls({ modelId }: { modelId: string }) {
  const { 
    execute, 
    pause, 
    resume, 
    stop,
    executionStatus,
    executionProgress,
    isExecuting 
  } = useModelExecution(modelId)
  
  const handleExecute = async () => {
    try {
      const executionId = await execute({
        parameters: getExecutionParameters(),
        environment: 'production'
      })
      
      // Navigate to execution monitor
      router.push(`/dashboard/function-model/${modelId}/execution/${executionId}`)
    } catch (error) {
      toast.error('Failed to start execution')
    }
  }
  
  return (
    <div className="flex items-center gap-2">
      <Button 
        onClick={handleExecute} 
        disabled={isExecuting}
        className="flex items-center gap-2"
      >
        {isExecuting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Executing...
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Execute
          </>
        )}
      </Button>
      
      {isExecuting && (
        <>
          <Button variant="outline" onClick={pause}>
            <Pause className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={stop}>
            <Square className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 ml-4">
            <Progress value={executionProgress} className="w-32" />
            <span className="text-sm text-gray-600">
              {Math.round(executionProgress)}%
            </span>
          </div>
        </>
      )}
    </div>
  )
}
```

### Phase 5: Search and Filtering (Priority 3)

#### Search Implementation

**Current State:**
```typescript
// 🔴 CURRENT: Non-functional search input
<Input placeholder="Search workflows..." className="pl-10" />
```

**Production Implementation:**
```typescript
// ✅ REPLACEMENT: Real search with debouncing
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue'

export function ModelSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebouncedValue(searchQuery, 300)
  
  const { models, loading } = useModels({
    search: debouncedQuery,
    enabled: debouncedQuery.length >= 2 // Only search with 2+ chars
  })
  
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        placeholder="Search workflows..."
        className="pl-10"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      
      {loading && searchQuery && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  )
}
```

### Implementation Timeline

| Phase | Components | Duration | Dependencies |
|-------|------------|----------|-------------|
| Phase 1 | Main dashboard, Model detail | 1 week | `useModels`, `useModel` hooks |
| Phase 2 | Node property forms | 1 week | `useNodeOperations` hook |
| Phase 3 | Execution controls | 1 week | `useModelExecution` hook |
| Phase 4 | Search and filtering | 3 days | Search API endpoint |
| Phase 5 | Real-time collaboration | 1 week | WebSocket infrastructure |

---

## Performance Optimization

### 1. Component Optimization

#### React Performance Patterns

```typescript
// ✅ Optimized component patterns
import { memo, useMemo, useCallback } from 'react'

// Memoized heavy computations
export const WorkflowCanvas = memo(function WorkflowCanvas({ 
  nodes, 
  edges, 
  onNodesChange,
  onEdgesChange 
}: WorkflowCanvasProps) {
  // Memoize expensive calculations
  const nodeTypes = useMemo(() => ({
    'io': IONode,
    'stage': StageNode,
    'tether': TetherNode,
    'kb': KBNode,
    'functionModel': FunctionModelContainerNode
  }), [])
  
  // Memoize event handlers to prevent unnecessary re-renders
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    onNodeSelect?.(node.id)
  }, [onNodeSelect])
  
  const handleConnect = useCallback((connection: Connection) => {
    const newEdge = {
      id: `edge-${Date.now()}`,
      ...connection
    }
    onEdgesChange([...edges, newEdge])
  }, [edges, onEdgesChange])
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      onConnect={handleConnect}
      fitView
    />
  )
})

// Optimized list rendering with virtualization
export function VirtualizedModelList({ models }: { models: ModelDto[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={models.length}
      itemSize={120}
      itemData={models}
    >
      {({ index, style, data }) => (
        <div style={style}>
          <ModelCard model={data[index]} />
        </div>
      )}
    </FixedSizeList>
  )
}
```

### 2. Data Loading Optimization

#### Efficient Data Fetching

```typescript
// ✅ Optimized data fetching patterns
export function useOptimizedModels() {
  // Use React Query for intelligent caching
  return useQuery({
    queryKey: ['models'],
    queryFn: fetchModels,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    select: useCallback((data: ApiResponse<ModelDto[]>) => {
      // Transform data only when needed
      return data.data?.map(model => ({
        ...model,
        displayName: model.name.toLowerCase().replace(/\s+/g, '-')
      }))
    }, [])
  })
}

// Prefetch related data
export function useModelWithPrefetch(modelId: string) {
  const queryClient = useQueryClient()
  
  const modelQuery = useQuery({
    queryKey: ['model', modelId],
    queryFn: () => fetchModel(modelId)
  })
  
  // Prefetch nodes when model loads
  useEffect(() => {
    if (modelQuery.data?.id) {
      queryClient.prefetchQuery({
        queryKey: ['model-nodes', modelId],
        queryFn: () => fetchModelNodes(modelId)
      })
    }
  }, [modelQuery.data?.id, queryClient, modelId])
  
  return modelQuery
}
```

### 3. Bundle Optimization

#### Code Splitting Strategies

```typescript
// ✅ Lazy load heavy components
import { lazy, Suspense } from 'react'

const WorkflowDesigner = lazy(() => import('@/components/workflow-designer'))
const ExecutionMonitor = lazy(() => import('@/components/execution-monitor'))
const AnalyticsDashboard = lazy(() => import('@/components/analytics-dashboard'))

export function ModelDetailPage({ modelId }: { modelId: string }) {
  const [activeTab, setActiveTab] = useState<'designer' | 'execution' | 'analytics'>('designer')
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'designer':
        return (
          <Suspense fallback={<WorkflowDesignerSkeleton />}>
            <WorkflowDesigner modelId={modelId} />
          </Suspense>
        )
      case 'execution':
        return (
          <Suspense fallback={<ExecutionMonitorSkeleton />}>
            <ExecutionMonitor modelId={modelId} />
          </Suspense>
        )
      case 'analytics':
        return (
          <Suspense fallback={<AnalyticsSkeleton />}>
            <AnalyticsDashboard modelId={modelId} />
          </Suspense>
        )
    }
  }
  
  return (
    <div className="space-y-4">
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      {renderTabContent()}
    </div>
  )
}
```

### 4. Real-time Performance

#### Efficient Real-time Updates

```typescript
// ✅ Optimized real-time synchronization
export function useOptimizedRealTime(modelId: string) {
  const [updates, setUpdates] = useState<ModelUpdate[]>([])
  const updateQueue = useRef<ModelUpdate[]>([])
  const flushTimer = useRef<NodeJS.Timeout>()
  
  // Batch updates to prevent excessive re-renders
  const flushUpdates = useCallback(() => {
    if (updateQueue.current.length > 0) {
      setUpdates(prev => [...prev, ...updateQueue.current])
      updateQueue.current = []
    }
  }, [])
  
  const handleRealtimeUpdate = useCallback((update: ModelUpdate) => {
    updateQueue.current.push(update)
    
    // Clear existing timer
    if (flushTimer.current) {
      clearTimeout(flushTimer.current)
    }
    
    // Batch updates over 50ms window
    flushTimer.current = setTimeout(flushUpdates, 50)
  }, [flushUpdates])
  
  useEffect(() => {
    const subscription = subscribeToModelUpdates(modelId, handleRealtimeUpdate)
    
    return () => {
      subscription.unsubscribe()
      if (flushTimer.current) {
        clearTimeout(flushTimer.current)
      }
    }
  }, [modelId, handleRealtimeUpdate])
  
  return { updates }
}
```

---

## Edge Cases

### 1. Network Connectivity Issues

#### Offline Handling

```typescript
// ✅ Offline-first component pattern
export function OfflineAwareModelList() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const { models, loading, error } = useModels()
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  if (!isOnline) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800 flex items-center">
            <WifiOff className="h-5 w-5 mr-2" />
            Offline Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-orange-700">
            You're currently offline. Some features may be limited.
          </p>
          <p className="text-sm text-orange-600 mt-2">
            Your changes will be synced when you reconnect.
          </p>
        </CardContent>
      </Card>
    )
  }
  
  return <ModelList models={models} loading={loading} error={error} />
}
```

### 2. Large Dataset Handling

#### Virtualization and Pagination

```typescript
// ✅ Handle large model lists efficiently
export function LargeModelList() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  
  const { models, loading, pagination } = useModels({
    page,
    pageSize,
    enabled: true
  })
  
  // Virtual scrolling for large lists
  const virtualizer = useVirtualizer({
    count: pagination?.total || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 10
  })
  
  const loadMoreItems = useCallback((startIndex: number, stopIndex: number) => {
    const requiredPage = Math.ceil((stopIndex + 1) / pageSize)
    if (requiredPage > page) {
      setPage(requiredPage)
    }
  }, [page, pageSize])
  
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const model = models[item.index]
          
          return (
            <div
              key={item.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`
              }}
            >
              {model ? (
                <ModelCard model={model} />
              ) : (
                <ModelCardSkeleton />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### 3. Concurrent User Modifications

#### Conflict Resolution

```typescript
// ✅ Handle concurrent editing conflicts
export function ConflictResolutionModal({ 
  conflict, 
  onResolve 
}: { 
  conflict: EditConflict
  onResolve: (resolution: ConflictResolution) => void 
}) {
  const [selectedResolution, setSelectedResolution] = useState<'accept' | 'reject' | 'merge'>()
  
  const handleResolve = () => {
    if (!selectedResolution) return
    
    const resolution: ConflictResolution = {
      conflictId: conflict.id,
      action: selectedResolution,
      mergeStrategy: selectedResolution === 'merge' ? 'last-write-wins' : undefined
    }
    
    onResolve(resolution)
  }
  
  return (
    <Dialog open={true}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editing Conflict Detected</DialogTitle>
          <DialogDescription>
            Another user has modified this workflow while you were editing it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          <Card className="p-4">
            <h3 className="font-medium text-green-800 mb-2">Your Changes</h3>
            <DiffViewer 
              oldValue={conflict.baseValue}
              newValue={conflict.localValue}
              splitView={false}
            />
          </Card>
          
          <Card className="p-4">
            <h3 className="font-medium text-blue-800 mb-2">Their Changes</h3>
            <DiffViewer 
              oldValue={conflict.baseValue}
              newValue={conflict.remoteValue}
              splitView={false}
            />
          </Card>
        </div>
        
        <div className="space-y-2">
          <Label>Choose resolution strategy:</Label>
          <RadioGroup value={selectedResolution} onValueChange={setSelectedResolution}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="accept" id="accept" />
              <Label htmlFor="accept">Keep your changes (overwrite theirs)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="reject" id="reject" />
              <Label htmlFor="reject">Accept their changes (discard yours)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="merge" id="merge" />
              <Label htmlFor="merge">Attempt automatic merge</Label>
            </div>
          </RadioGroup>
        </div>
        
        <DialogFooter>
          <Button onClick={handleResolve} disabled={!selectedResolution}>
            Resolve Conflict
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 4. Browser Compatibility Issues

#### Progressive Enhancement

```typescript
// ✅ Progressive enhancement for older browsers
export function BrowserCompatibilityWrapper({ children }: { children: React.ReactNode }) {
  const [isSupported, setIsSupported] = useState(true)
  const [missingFeatures, setMissingFeatures] = useState<string[]>([])
  
  useEffect(() => {
    const features = []
    
    // Check for required APIs
    if (!window.IntersectionObserver) {
      features.push('IntersectionObserver API')
    }
    
    if (!window.ResizeObserver) {
      features.push('ResizeObserver API')
    }
    
    if (!window.crypto?.randomUUID) {
      features.push('Crypto API')
    }
    
    if (!window.structuredClone) {
      features.push('Structured Clone')
    }
    
    if (features.length > 0) {
      setIsSupported(false)
      setMissingFeatures(features)
    }
  }, [])
  
  if (!isSupported) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 m-4">
        <CardHeader>
          <CardTitle className="text-yellow-800 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Browser Compatibility Warning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-700 mb-3">
            Your browser doesn't support some features required for the full experience.
          </p>
          <ul className="list-disc list-inside text-sm text-yellow-600 mb-4">
            {missingFeatures.map((feature) => (
              <li key={feature}>Missing: {feature}</li>
            ))}
          </ul>
          <p className="text-sm text-yellow-600">
            Please update to a modern browser like Chrome 90+, Firefox 88+, or Safari 14+.
          </p>
        </CardContent>
      </Card>
    )
  }
  
  return <>{children}</>
}
```

---

## Implementation Guidelines

### 1. Component Development Workflow

#### TDD Component Development Process

```typescript
// Step 1: Write failing test
describe('ModelCard Component', () => {
  it('should display model information correctly', () => {
    render(<ModelCard model={mockModel} />)
    expect(screen.getByText(mockModel.name)).toBeInTheDocument()
  })
})

// Step 2: Implement minimum viable component
export function ModelCard({ model }: { model: ModelDto }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{model.name}</CardTitle>
      </CardHeader>
    </Card>
  )
}

// Step 3: Refactor and enhance
export function ModelCard({ model, onUpdate, onDelete }: ModelCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{model.name}</CardTitle>
            <CardDescription>{model.description}</CardDescription>
          </div>
          <Badge variant={getStatusVariant(model.status)}>
            {model.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ModelActions 
          model={model}
          onEdit={() => setIsEditing(true)}
          onDelete={() => onDelete(model.id)}
        />
      </CardContent>
    </Card>
  )
}
```

### 2. State Management Patterns

#### Local Component State

```typescript
// ✅ Use local state for UI-only concerns
export function WorkflowDesigner() {
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [isCanvasLocked, setIsCanvasLocked] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  
  // UI state doesn't need external management
  return (
    <div className="relative">
      <WorkflowToolbar 
        zoomLevel={zoomLevel}
        onZoom={setZoomLevel}
        isLocked={isCanvasLocked}
        onToggleLock={() => setIsCanvasLocked(prev => !prev)}
      />
      <ReactFlow
        nodes={nodes}
        selection={selectedNodes}
        onSelectionChange={setSelectedNodes}
      />
    </div>
  )
}
```

#### Global State Management

```typescript
// ✅ Use React Query for server state
export function useGlobalModelState() {
  const queryClient = useQueryClient()
  
  const invalidateModels = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['models'] })
  }, [queryClient])
  
  const updateModelCache = useCallback((modelId: string, updates: Partial<ModelDto>) => {
    queryClient.setQueryData(['model', modelId], (old: ModelDto | undefined) => 
      old ? { ...old, ...updates } : undefined
    )
  }, [queryClient])
  
  return { invalidateModels, updateModelCache }
}
```

### 3. Accessibility Guidelines

#### WCAG 2.1 Compliance

```typescript
// ✅ Accessible workflow designer
export function AccessibleWorkflowDesigner() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  
  // Screen reader announcements
  const announceChange = useCallback((message: string) => {
    setAnnouncement(message)
    setTimeout(() => setAnnouncement(''), 1000)
  }, [])
  
  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
    announceChange(`Node ${nodeId} selected`)
  }, [announceChange])
  
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Tab' && selectedNodeId) {
      // Navigate between nodes with Tab
      const nextNodeId = getNextNodeId(selectedNodeId)
      if (nextNodeId) {
        setSelectedNodeId(nextNodeId)
        announceChange(`Moved to node ${nextNodeId}`)
      }
    }
  }, [selectedNodeId, announceChange])
  
  return (
    <div 
      role="application"
      aria-label="Workflow Designer"
      onKeyDown={handleKeyboardNavigation}
      tabIndex={0}
    >
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      
      {/* Keyboard navigation instructions */}
      <div className="sr-only">
        <h2>Keyboard Navigation</h2>
        <ul>
          <li>Tab: Navigate between nodes</li>
          <li>Enter: Select node</li>
          <li>Space: Execute node</li>
          <li>Escape: Deselect all</li>
        </ul>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={(event, node) => handleNodeSelect(node.id)}
        nodeTypes={{
          default: AccessibleWorkflowNode
        }}
      />
    </div>
  )
}
```

### 4. Error Recovery Patterns

#### Graceful Degradation

```typescript
// ✅ Error boundary with recovery
export class WorkflowErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
  }
  
  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error}
          onRetry={this.handleRetry}
          onReportError={() => reportError(this.state.error, this.state.errorInfo)}
        />
      )
    }
    
    return this.props.children
  }
}

function ErrorFallback({ error, onRetry, onReportError }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-600" />
          <div>
            <h3 className="text-lg font-medium text-red-800">
              Something went wrong
            </h3>
            <p className="text-red-600 mt-1">
              The workflow designer encountered an unexpected error.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={onRetry} variant="outline">
              Try Again
            </Button>
            <Button onClick={onReportError} variant="outline">
              Report Issue
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 5. Performance Monitoring

#### Component Performance Tracking

```typescript
// ✅ Performance monitoring hooks
export function usePerformanceMonitor(componentName: string) {
  const renderStart = useRef<number>()
  const renderCount = useRef(0)
  
  useEffect(() => {
    renderStart.current = performance.now()
    renderCount.current++
  })
  
  useEffect(() => {
    if (renderStart.current) {
      const renderTime = performance.now() - renderStart.current
      
      // Log performance metrics
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render #${renderCount.current}: ${renderTime.toFixed(2)}ms`)
      }
      
      // Send to analytics in production
      if (process.env.NODE_ENV === 'production' && renderTime > 100) {
        analytics.track('slow_render', {
          component: componentName,
          renderTime,
          renderCount: renderCount.current
        })
      }
    }
  })
}

// Usage in components
export function WorkflowDesigner() {
  usePerformanceMonitor('WorkflowDesigner')
  
  // Component implementation
  return <div>...</div>
}
```

This comprehensive documentation provides a complete guide for implementing the UI Components/Presentation Layer following Clean Architecture principles. The focus on mock elimination, real-time integration, and production-ready patterns will ensure a robust, maintainable, and scalable user interface system.