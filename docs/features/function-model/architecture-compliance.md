# Function Model Feature - Architecture Compliance Documentation

## Clean Architecture Implementation

The Function Model feature strictly adheres to Clean Architecture principles, implementing all four layers with clear separation of concerns and dependency inversion. The feature has been enhanced with a unified node-based architecture that maintains Clean Architecture compliance while providing enhanced capabilities.

### 1. **Domain Layer Implementation**

#### Location: `lib/domain/entities/`
The Domain Layer contains the core business entities and rules, completely independent of external frameworks.

#### Core Entities (Enhanced)
```typescript
// lib/domain/entities/base-node-types.ts (NEW)
export interface BaseNode {
  id: string
  featureType: FeatureType
  nodeType: string
  name: string
  description: string
  position: Position
  visualProperties: VisualProperties
  metadata: NodeMetadata
  status: NodeStatus
  createdAt: Date
  updatedAt: Date
}

// lib/domain/entities/function-model-node-types.ts (NEW)
export interface FunctionModelNode extends BaseNode {
  featureType: 'function-model'
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
  functionModelData: {
    stage?: Stage
    action?: ActionItem
    io?: DataPort
    container?: FunctionModelContainer
  }
  processBehavior: {
    executionType: 'sequential' | 'parallel' | 'conditional'
    dependencies: string[]
    timeout?: number
    retryPolicy?: RetryPolicy
  }
  businessLogic: {
    raciMatrix?: RACIMatrix
    sla?: ServiceLevelAgreement
    kpis?: KeyPerformanceIndicator[]
  }
}

// lib/domain/entities/node-behavior-types.ts (NEW)
export abstract class NodeBehavior {
  abstract validate(node: BaseNode): ValidationResult
  abstract execute(node: BaseNode, context: any): Promise<ExecutionResult>
}

export class ProcessNodeBehavior extends NodeBehavior {
  validate(node: BaseNode): ValidationResult {
    // Process-specific validation logic
  }
  
  async execute(node: BaseNode, context: any): Promise<ExecutionResult> {
    // Process-specific execution logic
  }
}
```

#### Business Rules (Enhanced)
```typescript
// lib/domain/entities/function-model-node-types.ts
export function createFunctionModelNode(
  nodeType: FunctionModelNode['nodeType'],
  name: string,
  position: { x: number; y: number },
  options: Partial<FunctionModelNode> = {}
): Omit<FunctionModelNode, 'id' | 'createdAt' | 'updatedAt'> {
  const baseNode = {
    featureType: 'function-model' as const,
    nodeType,
    name,
    description: options.description || '',
    position,
    visualProperties: {
      color: options.visualProperties?.color || getDefaultColor(nodeType),
      icon: options.visualProperties?.icon || getDefaultIcon(nodeType),
      size: options.visualProperties?.size || 'medium',
      style: options.visualProperties?.style || {},
      featureSpecific: options.visualProperties?.featureSpecific || {}
    },
    metadata: {
      tags: options.metadata?.tags || [nodeType, 'function-model'],
      searchKeywords: options.metadata?.searchKeywords || [name, nodeType],
      crossFeatureLinks: options.metadata?.crossFeatureLinks || [],
      aiAgent: options.metadata?.aiAgent,
      vectorEmbedding: options.metadata?.vectorEmbedding
    },
    status: options.status || 'active'
  }

  return {
    ...baseNode,
    functionModelData: {
      stage: options.functionModelData?.stage,
      action: options.functionModelData?.action,
      io: options.functionModelData?.io,
      container: options.functionModelData?.container
    },
    processBehavior: {
      executionType: options.processBehavior?.executionType || 'sequential',
      dependencies: options.processBehavior?.dependencies || [],
      timeout: options.processBehavior?.timeout,
      retryPolicy: options.processBehavior?.retryPolicy || {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000
      }
    },
    businessLogic: {
      raciMatrix: options.businessLogic?.raciMatrix,
      sla: options.businessLogic?.sla,
      kpis: options.businessLogic?.kpis || []
    }
  }
}

export function isValidFunctionModelNode(node: any): node is FunctionModelNode {
  if (!isValidBaseNode(node)) {
    return false
  }
  
  return (
    node.featureType === 'function-model' &&
    ['stageNode', 'actionTableNode', 'ioNode', 'functionModelContainer'].includes(node.nodeType) &&
    typeof node.functionModelData === 'object' &&
    typeof node.processBehavior === 'object' &&
    typeof node.businessLogic === 'object'
  )
}
```

### 2. **Application Layer Implementation**

#### Location: `lib/application/`
The Application Layer orchestrates use cases and coordinates data flow between Domain and Infrastructure layers.

#### Use Cases (Enhanced)
```typescript
// lib/application/hooks/use-function-model-nodes.ts (NEW)
export function useFunctionModelNodes(options: {
  modelId: string
  autoSave?: boolean
  autoSaveInterval?: number
  enableNodeBehavior?: boolean
  enableCrossFeatureLinking?: boolean
}) {
  const [nodes, setNodes] = useState<FunctionModelNode[]>([])
  const [links, setLinks] = useState<NodeLinkRecord[]>([])
  const [metadata, setMetadata] = useState<NodeMetadataRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const createNode = useCallback(async (
    nodeType: string,
    name: string,
    position: Position,
    options?: any
  ) => {
    const newNode = createFunctionModelNode(nodeType as any, name, position, options)
    setNodes(prev => [...prev, { ...newNode, id: generateUUID() }])
  }, [])

  const updateNode = useCallback(async (nodeId: string, updates: Partial<FunctionModelNode>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...updates, updatedAt: new Date() } : node
    ))
  }, [])

  const deleteNode = useCallback(async (nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId))
    setLinks(prev => prev.filter(link => 
      link.sourceNodeId !== nodeId && link.targetNodeId !== nodeId
    ))
  }, [])

  const createNodeLink = useCallback(async (
    sourceId: string,
    targetId: string,
    linkType: string
  ) => {
    const newLink: NodeLinkRecord = {
      linkId: generateUUID(),
      sourceFeature: 'function-model',
      sourceEntityId: options.modelId,
      sourceNodeId: sourceId,
      targetFeature: 'function-model',
      targetEntityId: options.modelId,
      targetNodeId: targetId,
      linkType: linkType as LinkType,
      linkStrength: 1.0,
      linkContext: {},
      visualProperties: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setLinks(prev => [...prev, newLink])
  }, [options.modelId])

  const executeNodeBehavior = useCallback(async (
    nodeId: string,
    behavior: NodeBehavior
  ): Promise<ExecutionResult> => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) {
      throw new Error(`Node ${nodeId} not found`)
    }

    const validation = behavior.validate(node)
    if (!validation.isValid) {
      return {
        success: false,
        executionTime: 0,
        result: null,
        errors: validation.errors,
        warnings: validation.warnings
      }
    }

    return await behavior.execute(node, { modelId: options.modelId })
  }, [nodes, options.modelId])

  return {
    nodes,
    links,
    metadata,
    loading,
    error,
    lastSavedAt,
    createNode,
    updateNode,
    deleteNode,
    createNodeLink,
    executeNodeBehavior
  }
}
```

#### Application Hooks (Enhanced)
```typescript
// lib/application/hooks/use-function-model-persistence.ts (Enhanced)
export function useFunctionModelPersistence() {
  const [currentModel, setCurrentModel] = useState<FunctionModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [migrationState, setMigrationState] = useState<MigrationState>({
    isMigrating: false,
    migrationProgress: 0,
    currentStep: '',
    errors: [],
    warnings: []
  })

  const migrateToNodeArchitecture = useCallback(async (modelId: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await FunctionModelNodeMigration.migrateFunctionModel(currentModel!, {
        preserveExistingData: true,
        createMetadata: true,
        createLinks: true,
        validateAfterMigration: true
      })
      
      if (result.success) {
        setMigrationState({
          isMigrating: false,
          migrationProgress: 100,
          currentStep: 'Migration completed',
          errors: result.errors,
          warnings: result.warnings
        })
      } else {
        throw new Error(`Migration failed: ${result.errors.join(', ')}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed')
      throw err
    } finally {
      setLoading(false)
    }
  }, [currentModel])

  const reverseMigration = useCallback(async (modelId: string) => {
    setLoading(true)
    setError(null)
    try {
      // Implementation for reverse migration
      const legacyModel = FunctionModelNodeMigration.reverseMigration(
        [], // nodes
        [], // links
        modelId
      )
      setCurrentModel(legacyModel)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reverse migration failed')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    currentModel,
    loading,
    error,
    lastSavedAt,
    migrationState,
    saveFunctionModel,
    loadFunctionModel,
    migrateToNodeArchitecture,
    reverseMigration
  }
}
```

### 3. **Infrastructure Layer Implementation**

#### Location: `lib/infrastructure/`
The Infrastructure Layer handles external interfaces and technical concerns, acting as adapters.

#### Repository Implementation (Enhanced)
```typescript
// lib/infrastructure/repositories/function-model-repository.ts (Enhanced)
export class FunctionModelRepository {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async create(model: Omit<FunctionModel, 'modelId' | 'createdAt' | 'updatedAt' | 'lastSavedAt'>): Promise<FunctionModel> {
    const { data, error } = await this.supabase
      .from('function_models')
      .insert(mapFunctionModelToDb(model))
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create function model: ${error.message}`)
    }

    return mapDbToFunctionModel(data)
  }

  // NEW: Node-based operations
  async getNodeBasedModels(): Promise<FunctionModelNode[]> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get node-based models: ${error.message}`)
    }

    return data.map(mapDbToFunctionModelNode)
  }

  async migrateModelToNodes(modelId: string): Promise<MigrationResult> {
    const model = await this.getById(modelId)
    if (!model) {
      throw new Error(`Function model ${modelId} not found`)
    }

    return FunctionModelNodeMigration.migrateFunctionModel(model)
  }

  async getMigrationStatus(modelId: string): Promise<MigrationStatus> {
    const { data, error } = await this.supabase
      .from('migration_status')
      .select('*')
      .eq('model_id', modelId)
      .single()

    if (error) {
      return { isMigrated: false, migrationDate: null, errors: [] }
    }

    return mapDbToMigrationStatus(data)
  }
}
```

#### New Repository Implementations
```typescript
// lib/infrastructure/repositories/node-links-repository.ts (NEW)
export class NodeLinksRepository {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async createNodeLink(link: Omit<NodeLinkRecord, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<NodeLinkRecord> {
    const { data, error } = await this.supabase
      .from('node_links')
      .insert(mapNodeLinkToDb(link))
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create node link: ${error.message}`)
    }

    return mapDbToNodeLink(data)
  }

  async getNodeLinks(featureType: FeatureType, entityId: string, nodeId?: string): Promise<NodeLinkRecord[]> {
    let queryBuilder = this.supabase
      .from('node_links')
      .select('*')
      .or(`source_feature.eq.${featureType},target_feature.eq.${featureType}`)
      .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)

    if (nodeId) {
      queryBuilder = queryBuilder.or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get node links: ${error.message}`)
    }

    return data.map(mapDbToNodeLink)
  }
}

// lib/infrastructure/repositories/node-metadata-repository.ts (NEW)
export class NodeMetadataRepository {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async createNodeMetadata(metadata: Omit<NodeMetadataRecord, 'metadataId' | 'createdAt' | 'updatedAt'>): Promise<NodeMetadataRecord> {
    const { data, error } = await this.supabase
      .from('node_metadata')
      .insert(mapNodeMetadataToDb(metadata))
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create node metadata: ${error.message}`)
    }

    return mapDbToNodeMetadata(data)
  }

  async searchNodes(query: string, featureType?: FeatureType): Promise<NodeMetadataRecord[]> {
    let queryBuilder = this.supabase
      .from('node_metadata')
      .select('*')

    if (featureType) {
      queryBuilder = queryBuilder.eq('feature_type', featureType)
    }

    if (query.trim()) {
      queryBuilder = queryBuilder.or(`search_keywords.ilike.%${query}%`)
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to search nodes: ${error.message}`)
    }

    return data.map(mapDbToNodeMetadata)
  }
}
```

#### Migration Layer Implementation (NEW)
```typescript
// lib/infrastructure/migrations/function-model-node-migration.ts (NEW)
export class FunctionModelNodeMigration {
  static migrateFunctionModel(
    functionModel: FunctionModel,
    options: MigrationOptions = {}
  ): MigrationResult {
    const {
      preserveExistingData = true,
      createMetadata = true,
      createLinks = true,
      validateAfterMigration = true
    } = options

    const result: MigrationResult = {
      nodes: [],
      metadata: [],
      links: [],
      success: true,
      errors: [],
      warnings: []
    }

    try {
      // Step 1: Convert existing nodes to new node structure
      const nodes = this.migrateNodes(functionModel.nodesData || [], functionModel.modelId)
      result.nodes = nodes

      // Step 2: Create metadata for nodes
      if (createMetadata) {
        const metadata = this.createNodeMetadata(nodes, functionModel.modelId)
        result.metadata = metadata
      }

      // Step 3: Convert existing relationships to new link structure
      if (createLinks) {
        const links = this.migrateRelationships(
          functionModel.relationships || [],
          functionModel.modelId
        )
        result.links = links
      }

      // Step 4: Validate migration if requested
      if (validateAfterMigration) {
        const validation = this.validateMigration(result, functionModel)
        if (!validation.success) {
          result.success = false
          result.errors.push(...validation.errors)
        }
        result.warnings.push(...validation.warnings)
      }

    } catch (error) {
      result.success = false
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  static reverseMigration(
    nodes: FunctionModelNode[],
    links: NodeLinkRecord[],
    modelId: string
  ): FunctionModel {
    const nodesData: Node[] = nodes.map(node => this.convertNodeToOriginalFormat(node))
    const relationships: NodeRelationship[] = links.map(link => this.convertLinkToRelationship(link))
    
    return {
      modelId,
      name: 'Migrated Model',
      description: 'Model migrated from node-based architecture',
      version: '1.0.0',
      status: 'draft',
      nodesData,
      edgesData: [],
      viewportData: { x: 0, y: 0, zoom: 1 },
      tags: [],
      relationships,
      metadata: {
        category: '',
        dependencies: [],
        references: [],
        exportSettings: {
          includeMetadata: true,
          includeRelationships: true,
          format: 'json',
          resolution: 'medium'
        },
        collaboration: {
          allowComments: true,
          allowSuggestions: true,
          requireApproval: false,
          autoSave: true,
          saveInterval: 30
        }
      },
      permissions: {
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canExport: true,
        canVersion: true,
        canCollaborate: true
      },
      versionHistory: [],
      currentVersion: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSavedAt: new Date()
    }
  }
}
```

### 4. **Presentation Layer Implementation**

#### Location: `app/(private)/dashboard/function-model/` and `components/composites/function-model/`
The Presentation Layer manages UI components and user interactions, keeping UI logic minimal.

#### Page Components (Enhanced)
```typescript
// app/(private)/dashboard/function-model/[modelId]/page.tsx (Enhanced)
export default function FunctionModelCanvasPage({ params }: { params: { modelId: string } }) {
  const [functionModel, setFunctionModel] = useState<FunctionModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [migrationState, setMigrationState] = useState<MigrationState>({
    isMigrating: false,
    migrationProgress: 0,
    currentStep: '',
    errors: [],
    warnings: []
  })

  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoading(true)
        const model = await loadFunctionModelUseCase(params.modelId)
        setFunctionModel(model)
        
        // Check if model needs migration
        const migrationStatus = await getMigrationStatusUseCase(params.modelId)
        if (!migrationStatus.isMigrated) {
          setMigrationState({
            isMigrating: true,
            migrationProgress: 0,
            currentStep: 'Preparing migration...',
            errors: [],
            warnings: []
          })
        }
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
      functionModel={functionModel}
      migrationState={migrationState}
      onMigrationComplete={(result) => {
        setMigrationState({
          isMigrating: false,
          migrationProgress: 100,
          currentStep: 'Migration completed',
          errors: result.errors,
          warnings: result.warnings
        })
      }}
    />
  )
}
```

#### Feature Components (Enhanced)
```typescript
// app/(private)/dashboard/function-model/components/function-process-dashboard.tsx (Enhanced)
export function FunctionProcessDashboard({ 
  functionModel, 
  migrationState,
  onMigrationComplete 
}: FunctionProcessDashboardProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)

  // NEW: Node-based architecture integration
  const [nodesState, nodesActions] = useFunctionModelNodes({
    modelId: functionModel.modelId,
    autoSave: true,
    autoSaveInterval: 5000,
    enableNodeBehavior: true,
    enableCrossFeatureLinking: true
  })

  // NEW: Migration integration
  useEffect(() => {
    if (functionModel && nodesState.nodes.length === 0) {
      const migration = FunctionModelNodeMigration.migrateFunctionModel(functionModel, {
        preserveExistingData: true,
        createMetadata: true,
        createLinks: true,
        validateAfterMigration: true
      })

      if (migration.success) {
        migration.nodes.forEach(node => {
          nodesActions.createNode(node.nodeType, node.name, node.position, {
            ...node,
            id: undefined,
            createdAt: undefined,
            updatedAt: undefined
          })
        })
        
        if (onMigrationComplete) {
          onMigrationComplete(migration)
        }
      } else {
        console.error('Migration failed:', migration.errors)
      }
    }
  }, [functionModel, nodesState.nodes.length, nodesActions, onMigrationComplete])

  // Convert node-based nodes back to React Flow format for display
  const flowNodes = useMemo(() => {
    return nodesState.nodes.map(node => ({
      id: node.id,
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
    return nodesState.links.map(link => ({
      id: link.linkId,
      source: link.sourceNodeId || '',
      target: link.targetNodeId || '',
      sourceHandle: link.linkContext?.sourceHandle || '',
      targetHandle: link.linkContext?.targetHandle || '',
      type: 'default'
    }))
  }, [nodesState.links])

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds))
  }, [])

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds))
  }, [])

  const handleSave = useCallback(async () => {
    await nodesActions.saveNodes()
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

      {/* Migration Status */}
      {migrationState.isMigrating && (
        <div className="p-4 bg-blue-50 border-b">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-600">
              Migrating to new architecture... {migrationState.migrationProgress}%
            </span>
          </div>
          <p className="text-xs text-blue-500 mt-1">{migrationState.currentStep}</p>
        </div>
      )}

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

The Function Model feature follows the established component hierarchy:

#### Base Components → Composite Components → Feature Components → Page Components

```typescript
// Base Components (reusable across features)
BaseNode
NodeBehavior
Button, Input, Modal, etc.

// Composite Components (function-model specific)
FunctionModelList
FunctionModelTableRow
SaveLoadPanel
CrossFeatureLinkingPanel

// Feature Components (canvas and workflow specific)
FunctionProcessDashboard
FlowNodes
NodeLinkingTab

// Page Components (routing and layout)
FunctionModelListPage
FunctionModelCanvasPage
```

### 2. **Component Responsibilities**

#### Single Responsibility Principle
- **`BaseNode`**: Only responsible for defining the unified node interface
- **`FunctionModelNode`**: Only responsible for function model specific node properties
- **`NodeBehavior`**: Only responsible for node behavior abstraction and execution
- **`FunctionModelNodeMigration`**: Only responsible for data migration between architectures
- **`useFunctionModelNodes`**: Only responsible for function model node state management

#### Encapsulation
- Components expose only necessary interfaces via props
- Internal state and logic are hidden from parent components
- Data transformations happen at the appropriate layer (Domain entities, Application hooks)
- Migration layer provides clean separation between old and new architectures

#### Reusability
- Base components (`BaseNode`, `NodeBehavior`) are reused across features
- Composite components can be extended for other similar features
- Hooks provide reusable business logic
- Migration layer can be reused for other feature migrations

### 3. **Data Flow Compliance**

#### Top-Down Data Flow
```typescript
// Page Component → Feature Component → Composite Component → Base Component
FunctionModelCanvasPage
  ↓ (props: functionModel, migrationState)
FunctionProcessDashboard
  ↓ (props: nodes, links, actions)
useFunctionModelNodes
  ↓ (props: nodeType, behavior)
NodeBehavior
```

#### Event Bubbling
```typescript
// Base Component → Composite Component → Feature Component → Page Component
NodeBehavior (onExecute)
  ↓
useFunctionModelNodes (onNodeBehaviorComplete)
  ↓
FunctionProcessDashboard (onNodeUpdate)
  ↓
FunctionModelCanvasPage (onModelUpdate)
```

### 4. **Clean Architecture Integration**

#### Dependency Direction
```
Presentation Layer (Components)
  ↓ depends on
Application Layer (Hooks)
  ↓ depends on
Domain Layer (Entities)
  ↑ depends on
Infrastructure Layer (Repositories + Migration)
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

#### Integration Testing
- Component composition and data flow
- Hook integration with repositories
- Cross-feature interactions
- Migration process validation

#### End-to-End Testing
- Complete user workflows
- Canvas interactions and persistence
- Migration from old to new architecture
- Cross-feature linking workflows

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

This architecture compliance documentation demonstrates how the enhanced Function Model feature successfully implements both Clean Architecture principles and the established component architecture, providing a solid foundation for future development and maintenance while preserving all existing functionality through the migration layer. 