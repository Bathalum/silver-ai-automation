# Function Model Node-Based Architecture Implementation Plan

## Executive Summary

This plan implements the node-based architecture for the Function Model feature while **preserving 100% of existing functionality**. The current system has sophisticated features including complex edge connections, rich modal interactions, cross-feature linking, and advanced UI components. This implementation will maintain all these features while using the unified node system.

## Current Complex Features Analysis

### ✅ **Critical Features to Preserve**

#### 1. **Complex Edge Connection System**
- **Handle-specific validation rules** (header-source → bottom-target, right-source → left-target)
- **Node type restrictions** (ActionTableNode can only connect as parent-child)
- **Bidirectional relationship tracking**
- **Edge context menus and deletion**

#### 2. **Rich Node Interaction System**
- **Modal-based editing** for each node type (Stage, Action, IO)
- **Inline editing** for names and descriptions
- **Complex state management** with modal stacks
- **Node-specific data structures** (RACI matrix, action modes, data ports)

#### 3. **Advanced UI Components**
- **Floating toolbar** with node creation buttons
- **Persistence sidebar** with save/load and cross-linking tabs
- **Cross-feature linking modal** system
- **Complex modal navigation** with back buttons and context

#### 4. **Sophisticated Data Flow**
- **React Flow integration** with custom node types
- **Viewport management** and zoom controls
- **Real-time state synchronization** between nodes and modals
- **Complex data conversion** between React Flow and domain models

## Implementation Strategy

### Phase 1: Domain Layer with Full Feature Preservation (Week 1)

#### 1.1 Enhanced Function Model Node Types
**Priority: Critical**
- Extend unified node system to preserve ALL existing functionality
- Maintain complex data structures and relationships

**New Files:**
```typescript
// lib/domain/entities/function-model-node-types.ts
export interface FunctionModelNode extends BaseNode {
  type: 'function-model'
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainerNode'
  
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

// Preserve ALL existing complex types
export interface Stage {
  id: string
  name: string
  description: string
  position: { x: number; y: number }
  actions: string[]
  dataChange: string[]
  boundaryCriteria: string[]
  raci: RACIMatrix
}

export interface ActionItem {
  id: string
  name: string
  description: string
  type: 'action' | 'action-group'
  linkedEntities?: NodeLinkedEntity[]
  modes?: {
    actions: { rows: any[] }
    dataChanges: { rows: any[] }
    boundaryCriteria: { rows: any[] }
  }
}

export interface DataPort {
  id: string
  name: string
  description: string
  mode: 'input' | 'output'
  masterData: string[]
  referenceData: string[]
  transactionData: string[]
}

export interface RACIMatrix {
  inform: string[]
  consult: string[]
  accountable: string[]
  responsible: string[]
}

// Preserve complex relationship system
export interface NodeRelationship {
  id: string
  sourceNodeId: string
  targetNodeId: string
  sourceHandle: string
  targetHandle: string
  type: 'parent-child' | 'sibling'
  sourceNodeType: 'stageNode' | 'actionTableNode' | 'ioNode'
  targetNodeType: 'stageNode' | 'actionTableNode' | 'ioNode'
  createdAt: Date
}
```

#### 1.2 Edge Connection Validation System
**Priority: Critical**
- Preserve ALL existing connection validation rules
- Maintain handle-specific restrictions

**New Files:**
```typescript
// lib/domain/entities/function-model-connection-rules.ts
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
  
  return true
}
```

### Phase 2: Application Layer with Full State Management (Week 2)

#### 2.1 Enhanced Use Cases
**Priority: Critical**
- Preserve ALL existing business logic and validation
- Maintain complex state management patterns

**New Files:**
```typescript
// lib/application/use-cases/function-model-use-cases.ts
export const createFunctionModelNode = async (
  nodeType: FunctionModelNode['nodeType'],
  name: string,
  position: { x: number; y: number },
  options: Partial<FunctionModelNode> = {}
): Promise<FunctionModelNode> => {
  // Preserve ALL existing validation
  if (!name.trim()) throw new Error('Node name is required')
  
  // Create node with ALL existing data structures
  const node: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'> = {
    type: 'function-model',
    nodeType,
    name: name.trim(),
    description: options.description || '',
    position,
    metadata: {
      feature: 'function-model',
      version: '1.0',
      tags: options.metadata?.tags || []
    },
    functionModelData: {},
    businessLogic: {
      complexity: 'simple',
      estimatedDuration: 0,
      ...options.businessLogic
    },
    processBehavior: {
      executionType: 'sequential',
      ...options.processBehavior
    },
    reactFlowData: {
      draggable: true,
      selectable: true,
      deletable: true,
      ...options.reactFlowData
    },
    relationships: []
  }

  return await functionModelNodeRepository.create(node)
}

export const updateFunctionModelNode = async (
  nodeId: string,
  updates: Partial<FunctionModelNode>
): Promise<FunctionModelNode> => {
  // Preserve ALL existing validation
  const validationResult = await validateNodeUpdates(nodeId, updates)
  if (!validationResult.isValid) {
    throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`)
  }

  return await functionModelNodeRepository.update(nodeId, updates)
}

export const createNodeRelationship = async (
  sourceNodeId: string,
  targetNodeId: string,
  sourceHandle: string,
  targetHandle: string
): Promise<NodeRelationship> => {
  // Preserve connection validation
  const sourceNode = await functionModelNodeRepository.getById(sourceNodeId)
  const targetNode = await functionModelNodeRepository.getById(targetNodeId)
  
  if (!validateConnection(sourceNode, targetNode, sourceHandle, targetHandle)) {
    throw new Error('Invalid connection')
  }
  
  const relationship: Omit<NodeRelationship, 'id' | 'createdAt'> = {
    sourceNodeId,
    targetNodeId,
    sourceHandle,
    targetHandle,
    type: getRelationshipType(sourceHandle, targetHandle),
    sourceNodeType: sourceNode.nodeType,
    targetNodeType: targetNode.nodeType
  }
  
  return await nodeRelationshipRepository.create(relationship)
}
```

#### 2.2 Enhanced Application Hooks
**Priority: Critical**
- Preserve ALL existing state management patterns
- Maintain complex modal and UI interactions

**New Files:**
```typescript
// lib/application/hooks/use-function-model-nodes.ts
export function useFunctionModelNodes(modelId: string) {
  const [nodes, setNodes] = useState<FunctionModelNode[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Preserve ALL existing state management
  const [modalStack, setModalStack] = useState<Array<{
    type: "function" | "stage" | "action" | "input" | "output"
    data: FunctionModel | Stage | ActionItem | DataPort
    context?: { previousModal?: string; stageId?: string }
  }>>([])

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
      const newNode = await createFunctionModelNode(nodeType, name, position, options)
      setNodes(prev => [...prev, newNode])
      return newNode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node')
      throw err
    }
  }, [])

  const updateNode = useCallback(async (nodeId: string, updates: Partial<FunctionModelNode>) => {
    try {
      const updatedNode = await updateFunctionModelNode(nodeId, updates)
      setNodes(prev => prev.map(node => node.nodeId === nodeId ? updatedNode : node))
      return updatedNode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update node')
      throw err
    }
  }, [])

  const createConnection = useCallback(async (
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle: string,
    targetHandle: string
  ) => {
    try {
      const relationship = await createNodeRelationship(sourceNodeId, targetNodeId, sourceHandle, targetHandle)
      
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
      return relationship
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection')
      throw err
    }
  }, [])

  return {
    nodes,
    edges,
    loading,
    error,
    modalStack,
    setModalStack,
    loadNodes,
    createNode,
    updateNode,
    createConnection,
    clearError: () => setError(null)
  }
}
```

### Phase 3: Infrastructure Layer with Full Data Preservation (Week 3)

#### 3.1 Enhanced Repository Implementation
**Priority: Critical**
- Preserve ALL existing data structures and relationships
- Maintain complex data conversion patterns

**New Files:**
```typescript
// lib/infrastructure/repositories/function-model-node-repository.ts
export class FunctionModelNodeRepository {
  private unifiedNodeRepository = new UnifiedNodeRepository()
  private relationshipRepository = new NodeRelationshipRepository()

  async create(node: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<FunctionModelNode> {
    // Convert to unified node format while preserving ALL data
    const unifiedNode: Omit<BaseNode, 'nodeId' | 'createdAt' | 'updatedAt'> = {
      type: 'function-model',
      nodeType: node.nodeType,
      name: node.name,
      description: node.description,
      position: node.position,
      metadata: {
        ...node.metadata,
        functionModel: {
          functionModelData: node.functionModelData,
          businessLogic: node.businessLogic,
          processBehavior: node.processBehavior,
          reactFlowData: node.reactFlowData,
          relationships: node.relationships
        }
      }
    }

    const createdNode = await this.unifiedNodeRepository.create(unifiedNode)
    return this.convertToFunctionModelNode(createdNode)
  }

  async update(nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode> {
    const unifiedUpdates = this.convertUpdatesToUnified(updates)
    const updatedNode = await this.unifiedNodeRepository.update(nodeId, unifiedUpdates)
    return this.convertToFunctionModelNode(updatedNode)
  }

  async getByModelId(modelId: string): Promise<FunctionModelNode[]> {
    const unifiedNodes = await this.unifiedNodeRepository.getByFeature('function-model', modelId)
    return unifiedNodes.map(node => this.convertToFunctionModelNode(node))
  }

  async getRelationships(modelId: string): Promise<NodeRelationship[]> {
    const nodes = await this.getByModelId(modelId)
    const nodeIds = nodes.map(node => node.nodeId)
    return await this.relationshipRepository.getByNodeIds(nodeIds)
  }

  private convertToFunctionModelNode(unifiedNode: BaseNode): FunctionModelNode {
    const functionModelData = unifiedNode.metadata.functionModel
    return {
      nodeId: unifiedNode.nodeId,
      type: 'function-model',
      nodeType: unifiedNode.nodeType as FunctionModelNode['nodeType'],
      name: unifiedNode.name,
      description: unifiedNode.description,
      position: unifiedNode.position,
      metadata: unifiedNode.metadata,
      functionModelData: functionModelData.functionModelData,
      businessLogic: functionModelData.businessLogic,
      processBehavior: functionModelData.processBehavior,
      reactFlowData: functionModelData.reactFlowData,
      relationships: functionModelData.relationships,
      createdAt: unifiedNode.createdAt,
      updatedAt: unifiedNode.updatedAt
    }
  }
}
```

### Phase 4: Presentation Layer with Full UI Preservation (Week 4)

#### 4.1 Enhanced React Flow Integration
**Priority: Critical**
- Preserve ALL existing React Flow functionality
- Maintain complex edge validation and UI interactions

**New Files:**
```typescript
// app/(private)/dashboard/function-model/components/function-model-canvas.tsx
export function FunctionModelCanvas({ modelId }: { modelId: string }) {
  const { 
    nodes, 
    edges, 
    loading, 
    error, 
    modalStack,
    createNode, 
    updateNode, 
    createConnection 
  } = useFunctionModelNodes(modelId)
  
  // Preserve ALL existing state management
  const [reactFlowNodes, setReactFlowNodes] = useState<Node[]>([])
  const [reactFlowEdges, setReactFlowEdges] = useState<Edge[]>([])
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [persistenceSidebarOpen, setPersistenceSidebarOpen] = useState(false)
  const [activePersistenceTab, setActivePersistenceTab] = useState<'save' | 'links'>('save')

  // Convert unified nodes to React Flow format
  useEffect(() => {
    const flowNodes = nodes.map(node => convertToReactFlowNode(node))
    setReactFlowNodes(flowNodes)
  }, [nodes])

  useEffect(() => {
    setReactFlowEdges(edges)
  }, [edges])

  // Preserve ALL existing connection validation
  const isValidConnection = useCallback((connection: Connection) => {
    const sourceNode = nodes.find(n => n.nodeId === connection.source)
    const targetNode = nodes.find(n => n.nodeId === connection.target)
    
    if (!sourceNode || !targetNode) return false
    
    return validateConnection(sourceNode, targetNode, connection.sourceHandle!, connection.targetHandle!)
  }, [nodes])

  // Preserve ALL existing node creation handlers
  const handleAddStageNode = useCallback(() => {
    const position = { x: Math.random() * 400, y: Math.random() * 400 }
    createNode('stageNode', 'New Stage', position)
  }, [createNode])

  const handleAddActionNode = useCallback(() => {
    const position = { x: Math.random() * 400, y: Math.random() * 400 }
    createNode('actionTableNode', 'New Action', position)
  }, [createNode])

  const handleAddIONode = useCallback(() => {
    const position = { x: Math.random() * 400, y: Math.random() * 400 }
    createNode('ioNode', 'New I/O', position)
  }, [createNode])

  // Preserve ALL existing connection handling
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) return
    
    createConnection(
      connection.source,
      connection.target,
      connection.sourceHandle,
      connection.targetHandle
    )
  }, [createConnection])

  // Preserve ALL existing node change handling
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setReactFlowNodes(prev => applyNodeChanges(changes, prev))
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setReactFlowEdges(prev => applyEdgeChanges(changes, prev))
  }, [])

  return (
    <div className="w-full h-full relative">
      {/* Preserve ALL existing UI components */}
      <FloatingToolbar
        onAddStage={handleAddStageNode}
        onAddAction={handleAddActionNode}
        onAddIO={handleAddIONode}
        onTogglePersistence={() => setPersistenceSidebarOpen(!persistenceSidebarOpen)}
      />

      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onEdgeContextMenu={onEdgeContextMenu}
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>

      {/* Preserve ALL existing modals and sidebars */}
      <PersistenceSidebar
        isOpen={persistenceSidebarOpen}
        onClose={() => setPersistenceSidebarOpen(false)}
        activeTab={activePersistenceTab}
        onTabChange={setActivePersistenceTab}
        modelId={modelId}
      />

      <ModalStack modals={modalStack} />
    </div>
  )
}

// Preserve ALL existing conversion logic
function convertToReactFlowNode(unifiedNode: FunctionModelNode): Node {
  return {
    id: unifiedNode.nodeId,
    type: unifiedNode.nodeType,
    position: unifiedNode.position,
    data: {
      ...unifiedNode.functionModelData,
      name: unifiedNode.name,
      description: unifiedNode.description,
      businessLogic: unifiedNode.businessLogic,
      processBehavior: unifiedNode.processBehavior
    },
    ...unifiedNode.reactFlowData
  }
}
```

#### 4.2 Preserve ALL Existing Node Components
**Priority: Critical**
- Maintain ALL existing visual components and interactions
- Preserve complex modal systems

**Files to Preserve:**
```typescript
// app/(private)/dashboard/function-model/components/flow-nodes.tsx
// PRESERVE ALL EXISTING NODE COMPONENTS
export function StageNode({ data, selected }: NodeProps) {
  // Preserve ALL existing functionality
  const { name, description, stage, businessLogic } = data

  return (
    <div className={`stage-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <h3>{name}</h3>
        <div className="complexity-badge">{businessLogic.complexity}</div>
      </div>
      <div className="node-content">
        <p>{description}</p>
        {stage && (
          <div className="stage-details">
            <div className="actions-count">{stage.actions.length} actions</div>
            <div className="raci-summary">
              R: {stage.raci.responsible.length} | A: {stage.raci.accountable.length}
            </div>
          </div>
        )}
      </div>
      {/* Preserve ALL existing handles */}
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Right} id="right-source" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
    </div>
  )
}

export function ActionTableNode({ data, selected }: NodeProps) {
  // Preserve ALL existing functionality
  const { name, description, action, processBehavior } = data

  return (
    <div className={`action-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <h3>{name}</h3>
        <div className="execution-type">{processBehavior.executionType}</div>
      </div>
      <div className="node-content">
        <p>{description}</p>
        {action && (
          <div className="action-details">
            <div className="action-type">{action.type}</div>
            {action.linkedEntities && action.linkedEntities.length > 0 && (
              <div className="linked-entities">
                {action.linkedEntities.length} linked entities
              </div>
            )}
          </div>
        )}
      </div>
      {/* Preserve ALL existing handles */}
      <Handle type="source" position={Position.Top} id="header-source" />
    </div>
  )
}

export function IONode({ data, selected }: NodeProps) {
  // Preserve ALL existing functionality
  const { name, description, io, businessLogic } = data

  return (
    <div className={`io-node ${selected ? 'selected' : ''} ${io.mode}`}>
      <div className="node-header">
        <h3>{name}</h3>
        <div className="mode-badge">{io.mode}</div>
      </div>
      <div className="node-content">
        <p>{description}</p>
        <div className="data-summary">
          <div>Master: {io.masterData.length}</div>
          <div>Reference: {io.referenceData.length}</div>
          <div>Transaction: {io.transactionData.length}</div>
        </div>
      </div>
      {/* Preserve ALL existing handles */}
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Right} id="right-source" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
    </div>
  )
}
```

### Phase 5: Advanced Features Preservation (Week 5)

#### 5.1 Preserve ALL Cross-Feature Linking
**Priority: Critical**
- Maintain ALL existing cross-feature linking functionality
- Preserve bidirectional relationship tracking

**New Files:**
```typescript
// lib/application/hooks/use-cross-feature-linking.ts
export function useCrossFeatureLinking(nodeId: string) {
  const { createNodeLink, getNodeLinks, deleteNodeLink } = useUnifiedNodes()

  const createLink = useCallback(async (
    targetFeature: string,
    targetId: string,
    linkType: string,
    context?: Record<string, any>
  ) => {
    return await createNodeLink('function-model', nodeId, targetFeature, targetId, linkType, context)
  }, [nodeId, createNodeLink])

  const getLinks = useCallback(async () => {
    return await getNodeLinks('function-model', nodeId)
  }, [nodeId, getNodeLinks])

  return {
    createLink,
    getLinks,
    deleteLink: deleteNodeLink
  }
}
```

#### 5.2 Preserve ALL Version Control
**Priority: Critical**
- Maintain ALL existing version control functionality
- Preserve complex data snapshots

**New Files:**
```typescript
// lib/application/use-cases/function-model-version-control.ts
export const createFunctionModelVersion = async (
  modelId: string,
  nodes: FunctionModelNode[],
  edges: Edge[],
  changeSummary: string
): Promise<VersionEntry> => {
  const version = await generateNextVersion(modelId)
  
  const versionData = {
    modelId,
    version,
    nodes: nodes.map(node => ({
      nodeId: node.nodeId,
      data: node,
      timestamp: new Date()
    })),
    edges: edges.map(edge => ({
      edgeId: edge.id,
      data: edge,
      timestamp: new Date()
    })),
    changeSummary,
    createdAt: new Date()
  }

  return await functionModelVersionRepository.create(versionData)
}

export const loadFunctionModelVersion = async (
  modelId: string,
  version: string
): Promise<{ nodes: FunctionModelNode[], edges: Edge[] }> => {
  const versionData = await functionModelVersionRepository.getByVersion(modelId, version)
  
  return {
    nodes: versionData.nodes.map(node => node.data),
    edges: versionData.edges.map(edge => edge.data)
  }
}
```

## Implementation Timeline

### **Week 1: Domain Layer**
- Define enhanced Function Model node types preserving ALL data structures
- Implement connection validation system preserving ALL rules
- Create complex relationship tracking

### **Week 2: Application Layer**
- Implement enhanced use cases preserving ALL business logic
- Create application hooks preserving ALL state management
- Maintain complex modal and UI interaction patterns

### **Week 3: Infrastructure Layer**
- Implement repository pattern preserving ALL data structures
- Maintain complex data conversion patterns
- Preserve ALL relationship tracking

### **Week 4: Presentation Layer**
- Create enhanced React Flow integration preserving ALL functionality
- Maintain ALL existing node components and interactions
- Preserve complex UI patterns and modals

### **Week 5: Advanced Features**
- Preserve ALL cross-feature linking functionality
- Maintain ALL version control capabilities
- Preserve ALL complex data flow patterns

## Success Criteria

### ✅ **100% Feature Parity**
- ALL existing node types functional with identical behavior
- ALL edge connection rules preserved exactly
- ALL modal systems and interactions maintained
- ALL cross-feature linking working identically
- ALL UI components and interactions preserved

### ✅ **Clean Architecture**
- Proper separation of concerns using unified node system
- Domain-driven design with preserved business logic
- Testable and maintainable code structure
- No loss of existing functionality

### ✅ **Performance**
- Fast node creation and updates
- Smooth drag-and-drop interactions
- Efficient data loading and saving
- Responsive UI interactions

### ✅ **Developer Experience**
- Clean, readable code using unified patterns
- Proper TypeScript types preserving all existing structures
- Comprehensive error handling
- Easy to extend and maintain

This plan ensures **100% preservation of ALL existing complex functionality** while implementing the node-based architecture properly. No features will be lost or simplified. 