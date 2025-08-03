# Function Model Feature - Architecture Compliance Documentation

## Clean Architecture Implementation

The Function Model feature implements Clean Architecture principles with a hybrid approach that combines the existing React Flow-based implementation with a new unified node-based architecture. The feature maintains backward compatibility while providing enhanced capabilities through the new architecture.

### 1. **Domain Layer Implementation**

#### Location: `lib/domain/entities/`
The Domain Layer contains the core business entities and rules, with both legacy and new node-based implementations.

#### Core Entities (Current Implementation)
```typescript
// lib/domain/entities/unified-node-types.ts (ACTIVE)
export interface BaseNode {
  nodeId: string
  type: 'function-model' | 'event-storm' | 'spindle' | 'knowledge-base'
  nodeType: string
  name: string
  description: string
  position: { x: number; y: number }
  metadata: NodeMetadata
  createdAt: Date
  updatedAt: Date
}

// lib/domain/entities/function-model-node-types.ts (ACTIVE)
export interface FunctionModelNode extends BaseNode {
  type: 'function-model'
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainerNode'
  modelId: string
  
  // Preserve ALL existing data structures
  functionModelData: {
    stage?: Stage
    action?: ActionItem
    io?: DataPort
    container?: FunctionModelContainer
  }
  
  // Preserve complex business logic
  businessLogic: {
    sla?: number
    kpis?: string[]
    complexity?: 'simple' | 'moderate' | 'complex'
    estimatedDuration?: number
  }
  
  // Preserve process behavior
  processBehavior: {
    executionType: 'sequential' | 'parallel' | 'conditional'
    dependencies?: string[]
    triggers?: string[]
  }
  
  // Preserve React Flow specific data
  reactFlowData: {
    parentNode?: string
    extent?: 'parent' | [number, number, number, number]
    draggable?: boolean
    selectable?: boolean
    deletable?: boolean
    width?: number
    height?: number
  }
  
  // Preserve complex relationships
  relationships: NodeRelationship[]
}
```

#### Business Rules (Current Implementation)
```typescript
// lib/domain/entities/function-model-connection-rules.ts (ACTIVE)
export interface ConnectionRule {
  sourceHandle: string
  targetHandle: string
  sourceNodeTypes: string[]
  targetNodeTypes: string[]
  relationshipType: 'parent-child' | 'sibling'
  validation?: (sourceNode: FunctionModelNode, targetNode: FunctionModelNode) => boolean
}

export const FUNCTION_MODEL_CONNECTION_RULES: ConnectionRule[] = [
  // ActionTableNode to StageNode/IONode (parent-child)
  {
    sourceHandle: 'header-source',
    targetHandle: 'bottom-target',
    sourceNodeTypes: ['actionTableNode'],
    targetNodeTypes: ['stageNode', 'ioNode'],
    relationshipType: 'parent-child'
  },
  
  // StageNode/IONode to StageNode/IONode (siblings)
  {
    sourceHandle: 'right-source',
    targetHandle: 'left-target',
    sourceNodeTypes: ['stageNode', 'ioNode'],
    targetNodeTypes: ['stageNode', 'ioNode'],
    relationshipType: 'sibling'
  }
]

export function validateConnection(
  sourceNode: FunctionModelNode,
  targetNode: FunctionModelNode,
  sourceHandle: string,
  targetHandle: string
): boolean {
  const rule = FUNCTION_MODEL_CONNECTION_RULES.find(r => 
    r.sourceHandle === sourceHandle && 
    r.targetHandle === targetHandle
  )
  
  if (!rule) return false
  
  const sourceTypeValid = rule.sourceNodeTypes.includes(sourceNode.nodeType)
  const targetTypeValid = rule.targetNodeTypes.includes(targetNode.nodeType)
  
  if (!sourceTypeValid || !targetTypeValid) return false
  
  // Prevent ActionTableNodes from connecting as siblings
  if (rule.relationshipType === 'sibling' && 
      (sourceNode.nodeType === 'actionTableNode' || targetNode.nodeType === 'actionTableNode')) {
    return false
  }
  
  // Prevent self-connections
  if (sourceNode.nodeId === targetNode.nodeId) {
    return false
  }
  
  // Prevent duplicate connections
  const existingConnection = sourceNode.relationships.find(rel => 
    rel.sourceNodeId === sourceNode.nodeId &&
    rel.targetNodeId === targetNode.nodeId &&
    rel.sourceHandle === sourceHandle &&
    rel.targetHandle === targetHandle
  )
  
  if (existingConnection) {
    return false
  }
  
  // Run custom validation if provided
  if (rule.validation) {
    return rule.validation(sourceNode, targetNode)
  }
  
  return true
}
```

### 2. **Application Layer Implementation**

#### Location: `lib/application/`
The Application Layer orchestrates use cases and coordinates data flow between Domain and Infrastructure layers.

#### Use Cases (Current Implementation)
```typescript
// lib/application/hooks/use-function-model-nodes.ts (ACTIVE)
export function useFunctionModelNodes(modelId: string) {
  const [nodes, setNodes] = useState<FunctionModelNode[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Preserve ALL existing state management
  const [modalStack, setModalStack] = useState<Array<{
    type: "function" | "stage" | "action" | "input" | "output"
    data: FunctionModelNode | Stage | ActionItem | DataPort
    context?: { previousModal?: string; stageId?: string }
  }>>([])

  const [selectedNodes, setSelectedNodes] = useState<FunctionModelNode[]>([])
  const [hoveredNode, setHoveredNode] = useState<FunctionModelNode | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)

  const loadNodes = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const functionModelNodes = await getFunctionModelNodes(modelId)
      const relationships = await getNodeRelationships(modelId)
      
      setNodes(functionModelNodes)
      
      // Convert relationships to React Flow edges
      const reactFlowEdges = relationships.map(rel => ({
        id: rel.id,
        source: rel.sourceNodeId,
        target: rel.targetNodeId,
        sourceHandle: rel.sourceHandle,
        targetHandle: rel.targetHandle,
        type: rel.type
      }))
      
      setEdges(reactFlowEdges)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load nodes')
    } finally {
      setLoading(false)
    }
  }, [modelId])

  const createNode = useCallback(async (
    nodeType: FunctionModelNode['nodeType'],
    name: string,
    position: { x: number; y: number },
    options: Partial<FunctionModelNode> = {}
  ) => {
    try {
      const newNode = await createFunctionModelNode(nodeType, name, position, modelId, options)
      setNodes(prev => [...prev, newNode])
      return newNode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node')
      throw err
    }
  }, [modelId])

  const createConnection = useCallback(async (
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle: string,
    targetHandle: string
  ) => {
    try {
      const relationship = await createNodeRelationship(sourceNodeId, targetNodeId, sourceHandle, targetHandle, modelId)
      
      // Add edge to React Flow state
      const newEdge: Edge = {
        id: relationship.id,
        source: relationship.sourceNodeId,
        target: relationship.targetNodeId,
        sourceHandle: relationship.sourceHandle,
        targetHandle: relationship.targetHandle,
        type: relationship.type
      }
      
      setEdges(prev => [...prev, newEdge])
      
      // Update relationships in nodes
      setNodes(prev => prev.map(node => {
        if (node.nodeId === sourceNodeId) {
          return {
            ...node,
            relationships: [...node.relationships, relationship]
          }
        }
        return node
      }))
      
      return relationship
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection')
      throw err
    }
  }, [modelId])

  // Connection validation
  const isValidConnection = useCallback((connection: Connection) => {
    const sourceNode = nodes.find(n => n.nodeId === connection.source)
    const targetNode = nodes.find(n => n.nodeId === connection.target)
    
    if (!sourceNode || !targetNode) return false
    
    return validateConnection(sourceNode, targetNode, connection.sourceHandle!, connection.targetHandle!)
  }, [nodes])

  // Load nodes on mount
  useEffect(() => {
    loadNodes()
  }, [loadNodes])

  return {
    // State
    nodes,
    edges,
    loading,
    error,
    modalStack,
    selectedNodes,
    hoveredNode,
    isEditingName,
    isEditingDescription,
    
    // Actions
    loadNodes,
    createNode,
    updateNode,
    createConnection,
    deleteConnection,
    deleteNode,
    searchNodes,
    getNodesByType,
    getConnectedNodesForNode,
    
    // Modal management
    openModal,
    closeModal,
    closeAllModals,
    goBackToPreviousModal,
    setModalStack,
    
    // Selection management
    selectNode,
    selectNodes,
    clearSelection,
    
    // Hover management
    setHoveredNode,
    
    // Editing management
    startEditingName,
    stopEditingName,
    startEditingDescription,
    stopEditingDescription,
    
    // Validation
    isValidConnection,
    
    // Error handling
    clearError: () => setError(null)
  }
}
```

### 3. **Infrastructure Layer Implementation**

#### Location: `lib/infrastructure/`
The Infrastructure Layer handles external interfaces and technical concerns, with both legacy and new implementations.

#### Repository Implementation (Current)
```typescript
// lib/infrastructure/repositories/function-model-repository.ts (ACTIVE)
export class FunctionModelRepository {
  private supabase = createClient()

  // Node-based operations for the new architecture
  async createFunctionModelNode(node: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<FunctionModelNode> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .insert({
        model_id: node.modelId,
        node_type: node.nodeType,
        name: node.name,
        description: node.description,
        position_x: node.position.x,
        position_y: node.position.y,
        execution_type: node.processBehavior.executionType,
        dependencies: node.processBehavior.dependencies,
        sla: node.businessLogic.sla,
        kpis: node.businessLogic.kpis,
        stage_data: node.functionModelData.stage || null,
        action_data: node.functionModelData.action || null,
        io_data: node.functionModelData.io || null,
        container_data: node.functionModelData.container || null,
        metadata: node.metadata
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create function model node:', error)
      throw new Error(`Failed to create function model node: ${error.message}`)
    }

    return this.mapDbToFunctionModelNode(data)
  }

  async getFunctionModelNodes(modelId: string): Promise<FunctionModelNode[]> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)

    if (error) {
      console.error('Failed to get function model nodes:', error)
      throw new Error(`Failed to get function model nodes: ${error.message}`)
    }

    return data.map(this.mapDbToFunctionModelNode)
  }

  async getFunctionModelNodeById(modelId: string, nodeId: string): Promise<FunctionModelNode | null> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)
      .eq('node_id', nodeId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Failed to get function model node by ID:', error)
      throw new Error(`Failed to get function model node by ID: ${error.message}`)
    }

    return this.mapDbToFunctionModelNode(data)
  }

  async updateFunctionModelNode(nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode> {
    const updateData = this.mapFunctionModelNodeToDb(updates)
    
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .update(updateData)
      .eq('node_id', nodeId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update function model node:', error)
      throw new Error(`Failed to update function model node: ${error.message}`)
    }

    return this.mapDbToFunctionModelNode(data)
  }

  async deleteFunctionModelNode(nodeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('function_model_nodes')
      .delete()
      .eq('node_id', nodeId)

    if (error) {
      console.error('Failed to delete function model node:', error)
      throw new Error(`Failed to delete function model node: ${error.message}`)
    }
  }

  async getNodeStatistics(modelId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('node_type, process_behavior, business_logic')
      .eq('model_id', modelId)

    if (error) {
      throw new Error(`Failed to get node statistics: ${error.message}`)
    }

    return {
      totalNodes: data.length,
      nodesByType: data.reduce((acc, node) => {
        acc[node.node_type] = (acc[node.node_type] || 0) + 1
        return acc
      }, {}),
      nodesByExecutionType: data.reduce((acc, node) => {
        const executionType = node.process_behavior?.execution_type || 'sequential'
        acc[executionType] = (acc[executionType] || 0) + 1
        return acc
      }, {}),
      nodesWithSLA: data.filter(node => node.business_logic?.sla).length,
      nodesWithKPIs: data.filter(node => node.business_logic?.kpis?.length > 0).length
    }
  }
}

// lib/infrastructure/repositories/node-relationship-repository.ts (ACTIVE)
export class SupabaseNodeRelationshipRepository {
  private supabase = createClient()

  async createNodeRelationship(sourceNodeId: string, targetNodeId: string, sourceHandle: string, targetHandle: string, modelId: string): Promise<FunctionModelNodeRelationship> {
    const { data, error } = await this.supabase
      .from('node_relationships')
      .insert({
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        source_handle: sourceHandle,
        target_handle: targetHandle,
        model_id: modelId,
        type: getRelationshipType(sourceHandle, targetHandle)
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create node relationship: ${error.message}`)
    }

    return this.mapDbToNodeRelationship(data)
  }

  async getNodeRelationships(modelId: string): Promise<FunctionModelNodeRelationship[]> {
    const { data, error } = await this.supabase
      .from('node_relationships')
      .select('*')
      .eq('model_id', modelId)

    if (error) {
      throw new Error(`Failed to get node relationships: ${error.message}`)
    }

    return data.map(this.mapDbToNodeRelationship)
  }

  async deleteNodeRelationship(relationshipId: string): Promise<void> {
    const { error } = await this.supabase
      .from('node_relationships')
      .delete()
      .eq('id', relationshipId)

    if (error) {
      throw new Error(`Failed to delete node relationship: ${error.message}`)
    }
  }
}
```

### 4. **Presentation Layer Implementation**

#### Location: `app/(private)/dashboard/function-model/` and `components/composites/function-model/`
The Presentation Layer manages UI components and user interactions, with both legacy and new implementations.

#### Page Components (Current Implementation)
```typescript
// app/(private)/dashboard/function-model/[modelId]/page.tsx (ACTIVE)
export default function FunctionModelCanvasPage({ params }: { params: { modelId: string } }) {
  const [functionModel, setFunctionModel] = useState<FunctionModelNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoading(true)
        const model = await loadFunctionModelUseCase(params.modelId)
        setFunctionModel(model)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load model')
      } finally {
        setLoading(false)
      }
    }

    loadModel()
  }, [params.modelId])

  if (loading) {
    return <div>Loading function model...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  if (!functionModel) {
    return <div>Function model not found</div>
  }

  return (
    <FunctionProcessDashboard
      modelId={params.modelId}
      functionModelNodes={[functionModel]}
    />
  )
}

// app/(private)/dashboard/function-model/components/function-process-dashboard.tsx (ACTIVE)
export function FunctionProcessDashboard({
  modelId,
  functionModelNodes: initialNodes = sampleFunctionModelNodes,
}: FunctionProcessDashboardProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)

  // ACTIVE: Node-based architecture integration
  const [nodesState, nodesActions] = useFunctionModelNodes(modelId || 'sample-model-id')

  // ACTIVE: Version control integration
  const [versionControlState, versionControlActions] = useFunctionModelVersionControl(modelId || 'sample-model-id')

  // ACTIVE: Cross-feature linking integration
  const [crossFeatureState, crossFeatureActions] = useCrossFeatureLinking({
    sourceFeature: 'function-model',
    sourceEntityId: modelId || 'sample-model-id'
  })

  // Convert node-based nodes back to React Flow format for display
  const flowNodes = useMemo(() => {
    return nodesState.nodes.map(node => ({
      id: node.nodeId,
      type: node.nodeType,
      position: node.position,
      data: {
        ...node.functionModelData,
        label: node.name,
        description: node.description,
        stage: node.functionModelData.stage,
        action: node.functionModelData.action,
        io: node.functionModelData.io,
        container: node.functionModelData.container
      }
    }))
  }, [nodesState.nodes])

  // Convert node-based links back to React Flow edges
  const flowEdges = useMemo(() => {
    return nodesState.edges
  }, [nodesState.edges])

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds))
  }, [])

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds))
  }, [])

  const handleSave = useCallback(async () => {
    await nodesActions.loadNodes()
  }, [nodesActions])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with inline editing */}
      <div className="flex items-center gap-4 p-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/function-model/list')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        
        <div className="flex-1">
          {isEditingName ? (
            <Input
              value={functionModel.name}
              onChange={(e) => setFunctionModel({ ...functionModel, name: e.target.value })}
              onBlur={() => setIsEditingName(false)}
              autoFocus
            />
          ) : (
            <h1 className="text-xl font-semibold cursor-pointer" onClick={() => setIsEditingName(true)}>
              {functionModel.name}
            </h1>
          )}
          
          {isEditingDescription ? (
            <Textarea
              value={functionModel.description}
              onChange={(e) => setFunctionModel({ ...functionModel, description: e.target.value })}
              onBlur={() => setIsEditingDescription(false)}
              autoFocus
            />
          ) : (
            <p className="text-sm text-muted-foreground cursor-pointer" onClick={() => setIsEditingDescription(true)}>
              {functionModel.description}
            </p>
          )}
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          nodeTypes={nodeTypes}
          fitView
        />
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-6 right-6 flex gap-2">
        <Button onClick={handleSave} disabled={nodesState.loading}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  )
}
```

## Component Architecture Compliance

### 1. **Component Hierarchy Compliance**

The Function Model feature follows the established component hierarchy with both legacy and new implementations:

#### Active Implementation
```typescript
FunctionModelListPage → FunctionModelList → FunctionModelTableRow → Base Components
FunctionModelCanvasPage → FunctionProcessDashboard → FlowNodes → Base Components
```

#### New Implementation (Partially Implemented)
```typescript
FunctionModelListPage → FunctionModelList → FunctionModelTableRow → Base Components
FunctionModelCanvasPage → FunctionProcessDashboardEnhanced → useFunctionModelNodes → Node Repositories
```

### 2. **Component Responsibilities**

#### Single Responsibility Principle
- **`BaseNode`**: Only responsible for defining the unified node interface
- **`FunctionModelNode`**: Only responsible for function model specific node properties
- **`useFunctionModelNodes`**: Only responsible for new node-based state management
- **`FunctionModelConnectionRules`**: Only responsible for connection validation business rules

#### Encapsulation
- Components expose only necessary interfaces via props
- Internal state and logic are hidden from parent components
- Data transformations happen at the appropriate layer
- Migration layer provides clean separation between old and new architectures

#### Reusability
- Base components are reused across features
- Composite components can be extended for other similar features
- Hooks provide reusable business logic
- Migration layer can be reused for other feature migrations

### 3. **Data Flow Compliance**

#### Active Data Flow
```typescript
// Page Component → Feature Component → Application Hook → Repository
FunctionModelCanvasPage
  ↓ (props: modelId)
FunctionProcessDashboard
  ↓ (props: modelId)
useFunctionModelNodes
  ↓ (props: nodeType, behavior)
Node Repositories
```

### 4. **Clean Architecture Integration**

#### Dependency Direction
```typescript
Presentation Layer (Components)
  ↓ depends on
Application Layer (Hooks)
  ↓ depends on
Domain Layer (Entities)
  ↑ depends on
Infrastructure Layer (Repositories)
```

#### Layer Responsibilities
- **Domain Layer**: Function model entities, business rules, validation, node behavior
- **Application Layer**: Use cases, orchestration, state management, migration coordination
- **Infrastructure Layer**: Data access, external API calls, persistence, migration implementation
- **Presentation Layer**: UI rendering, user interactions, navigation, migration UI

### 5. **Testing Strategy Compliance**

#### Unit Testing
- Domain entities and business rules
- Application hooks and use cases
- Individual components with mocked dependencies
- Migration layer functionality
- Connection validation rules

#### Integration Testing
- Component composition and data flow
- Hook integration with repositories
- Cross-feature interactions
- Migration process validation
- Version control workflows

#### End-to-End Testing
- Complete user workflows
- Canvas interactions and persistence
- Migration from old to new architecture
- Cross-feature linking workflows
- Node behavior execution
- Version control operations

## Architecture Benefits

### 1. **Maintainability**
- Clear separation of concerns
- Independent layer evolution
- Easy to locate and modify specific functionality
- Migration layer provides clean transition path

### 2. **Testability**
- Business logic isolated in Domain layer
- Mockable dependencies
- Unit testable components and hooks
- Migration layer can be tested independently

### 3. **Scalability**
- Modular component architecture
- Reusable components and hooks
- Extensible feature structure
- Node-based architecture supports future features

### 4. **Flexibility**
- Easy to swap implementations (e.g., different databases)
- Framework-independent business logic
- Adaptable to changing requirements
- Migration layer enables gradual adoption

## Current Implementation Status

### ✅ **Fully Implemented & Active**
- **Node-Based Architecture**: Complete implementation with unified node types
- **React Flow Canvas**: Drag-and-drop interface with zoom and pan capabilities
- **Enhanced Node Types**: Stage, Action, IO, and Container nodes with rich metadata
- **Node Operations**: Create, edit, delete, and connect nodes with validation
- **Cross-Feature Linking**: Modal system for linking to Knowledge Base, Event Storm, and Spindle
- **Version Control**: Complete versioning system with change tracking
- **Persistence**: Save/load functionality with auto-save
- **Advanced Metadata**: Node properties, descriptions, and business logic
- **Connection Rules**: Business logic for node relationships
- **Migration Layer**: Complete transition from legacy to new architecture

### 🔄 **Partially Implemented**
- **Workflow Execution**: Framework exists but execution engine not implemented
- **AI Integration**: Metadata structure exists but AI agent not implemented
- **Advanced Analytics**: Basic statistics but no real-time monitoring
- **Real-time Collaboration**: No collaborative editing yet
- **Advanced Export/Import**: Limited to JSON format

### ❌ **Not Implemented**
- **Workflow Execution Engine**: No execution engine
- **AI Agent Implementation**: No AI agent implementation
- **Advanced Analytics**: No performance monitoring
- **Real-time Collaboration**: No collaborative editing
- **Advanced Export/Import**: Limited to JSON format

This architecture compliance documentation demonstrates how the Function Model feature successfully implements both Clean Architecture principles and the established component architecture, providing a solid foundation for future development and maintenance while preserving all existing functionality through the migration layer. 