# Function Model Feature - Architecture Compliance Documentation

## Clean Architecture Implementation

The Function Model feature strictly adheres to Clean Architecture principles, implementing all four layers with clear separation of concerns and dependency inversion.

### 1. **Domain Layer Implementation**

#### Location: `lib/domain/entities/`
The Domain Layer contains the core business entities and rules, completely independent of external frameworks.

#### Core Entities
```typescript
// lib/domain/entities/function-model-types.ts
export interface FunctionModel {
  modelId: string
  name: string
  description: string
  version: string
  status: 'draft' | 'published' | 'archived'
  nodesData: FunctionModelNode[]
  edgesData: FunctionModelEdge[]
  viewportData: Viewport
  metadata: FunctionModelMetadata
  permissions: FunctionModelPermissions
  versionHistory: VersionEntry[]
  currentVersion: string
  createdAt: Date
  updatedAt: Date
  lastSavedAt: Date
}

export interface FunctionModelNode {
  id: string
  type: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
  position: { x: number; y: number }
  data: NodeData
  linkedEntities?: NodeLinkedEntity[]
}

export interface CrossFeatureLink {
  linkId: string
  sourceEntityId: string
  sourceEntityType: 'function-model' | 'knowledge-base' | 'spindle'
  targetEntityId: string
  targetEntityType: 'function-model' | 'knowledge-base' | 'spindle'
  linkType: 'documents' | 'implements' | 'references' | 'supports' | 'nested'
  nodeContext?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}
```

#### Business Rules
```typescript
// lib/domain/entities/function-model-types.ts
export function createFunctionModel(
  name: string,
  description: string,
  options: Partial<FunctionModel> = {}
): Omit<FunctionModel, 'modelId' | 'createdAt' | 'updatedAt' | 'lastSavedAt'> {
  return {
    name,
    description,
    version: '1.0.0',
    status: 'draft',
    nodesData: [],
    edgesData: [],
    viewportData: { x: 0, y: 0, zoom: 1 },
    metadata: {
      category: 'General',
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
    tags: [],
    ...options
  }
}

export function isValidFunctionModel(model: any): model is FunctionModel {
  return (
    typeof model === 'object' &&
    typeof model.modelId === 'string' &&
    typeof model.name === 'string' &&
    typeof model.description === 'string' &&
    typeof model.version === 'string' &&
    ['draft', 'published', 'archived'].includes(model.status) &&
    Array.isArray(model.nodesData) &&
    Array.isArray(model.edgesData) &&
    typeof model.viewportData === 'object' &&
    typeof model.metadata === 'object' &&
    typeof model.permissions === 'object'
  )
}
```

#### Cross-Feature Link Types
```typescript
// lib/domain/entities/cross-feature-link-types.ts
export interface NodeLinkedEntity {
  entityId: string
  entityType: 'function-model' | 'knowledge-base' | 'spindle'
  linkType: 'documents' | 'implements' | 'references' | 'supports' | 'nested'
  linkContext: Record<string, any>
  linkId: string
}

export interface VersionEntry {
  versionId: string
  version: string
  changeDescription: string
  changes: ChangeDescription[]
  createdAt: Date
  createdBy: string
}

export interface ChangeDescription {
  type: 'added' | 'modified' | 'removed'
  field: string
  oldValue?: any
  newValue?: any
  description: string
}
```

### 2. **Application Layer Implementation**

#### Location: `lib/application/`
The Application Layer orchestrates use cases and coordinates data flow between Domain and Infrastructure layers.

#### Use Cases
```typescript
// lib/application/use-cases/function-model-persistence-use-cases.ts
export async function createNewFunctionModel(
  name: string,
  description: string
): Promise<FunctionModel> {
  const modelData = createFunctionModel(name, description)
  return await functionModelRepository.create(modelData)
}

export async function saveFunctionModel(model: FunctionModel): Promise<void> {
  if (!isValidFunctionModel(model)) {
    throw new Error('Invalid function model data')
  }
  
  const updatedModel = {
    ...model,
    updatedAt: new Date(),
    lastSavedAt: new Date()
  }
  
  await functionModelRepository.update(model.modelId, updatedModel)
}

export async function loadFunctionModel(modelId: string): Promise<FunctionModel> {
  const model = await functionModelRepository.getById(modelId)
  if (!model) {
    throw new Error(`Function model with ID ${modelId} not found`)
  }
  return model
}

export async function getAllFunctionModels(): Promise<FunctionModel[]> {
  return await functionModelRepository.getAll()
}

export async function searchFunctionModels(
  query: string,
  filters?: FunctionModelFilters
): Promise<FunctionModel[]> {
  return await functionModelRepository.search(query, filters)
}

export async function createNodeLink(
  nodeId: string,
  link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  await crossFeatureRepository.createNodeLink(nodeId, link)
}

export async function getNodeLinks(nodeId: string): Promise<NodeLinkedEntity[]> {
  return await crossFeatureRepository.getNodeLinks(nodeId)
}
```

#### Application Hooks
```typescript
// lib/application/hooks/use-function-model-persistence.ts
export function useFunctionModelPersistence() {
  const [currentModel, setCurrentModel] = useState<FunctionModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const saveFunctionModel = useCallback(async (model: FunctionModel) => {
    setLoading(true)
    setError(null)
    try {
      await saveFunctionModelUseCase(model)
      setCurrentModel(model)
      setLastSavedAt(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save function model')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFunctionModel = useCallback(async (modelId: string) => {
    setLoading(true)
    setError(null)
    try {
      const model = await loadFunctionModelUseCase(modelId)
      setCurrentModel(model)
      setLastSavedAt(model.lastSavedAt)
      return model
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load function model')
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
    saveFunctionModel,
    loadFunctionModel
  }
}

export function useFunctionModelList() {
  const [models, setModels] = useState<FunctionModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FunctionModelFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)

  const loadModels = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const allModels = await getAllFunctionModelsUseCase()
      setModels(allModels)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load function models')
    } finally {
      setLoading(false)
    }
  }, [])

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        await loadModels()
        return
      }
      
      setSearchLoading(true)
      try {
        const results = await searchFunctionModelsUseCase(query, filters)
        setModels(results)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        setSearchLoading(false)
      }
    }, 300),
    [filters]
  )

  const updateFilters = useCallback((newFilters: FunctionModelFilters) => {
    setFilters(newFilters)
    // Trigger search with new filters
    debouncedSearch(searchQuery)
  }, [searchQuery, debouncedSearch])

  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query)
    debouncedSearch(query)
  }, [debouncedSearch])

  return {
    models,
    loading,
    error,
    filters,
    searchQuery,
    searchLoading,
    loadModels,
    updateFilters,
    updateSearchQuery
  }
}
```

### 3. **Infrastructure Layer Implementation**

#### Location: `lib/infrastructure/`
The Infrastructure Layer handles external interfaces and technical concerns, acting as adapters.

#### Repository Implementation
```typescript
// lib/infrastructure/repositories/function-model-repository.ts
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

  async getById(modelId: string): Promise<FunctionModel | null> {
    const { data, error } = await this.supabase
      .from('function_models')
      .select('*')
      .eq('model_id', modelId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get function model: ${error.message}`)
    }

    return mapDbToFunctionModel(data)
  }

  async getAll(): Promise<FunctionModel[]> {
    const { data, error } = await this.supabase
      .from('function_models')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get function models: ${error.message}`)
    }

    return data.map(mapDbToFunctionModel)
  }

  async update(modelId: string, updates: Partial<FunctionModel>): Promise<FunctionModel> {
    const { data, error } = await this.supabase
      .from('function_models')
      .update(mapFunctionModelToDb(updates))
      .eq('model_id', modelId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update function model: ${error.message}`)
    }

    return mapDbToFunctionModel(data)
  }

  async delete(modelId: string): Promise<void> {
    const { error } = await this.supabase
      .from('function_models')
      .delete()
      .eq('model_id', modelId)

    if (error) {
      throw new Error(`Failed to delete function model: ${error.message}`)
    }
  }

  async search(query: string, filters?: FunctionModelFilters): Promise<FunctionModel[]> {
    let queryBuilder = this.supabase
      .from('function_models')
      .select('*')

    // Apply text search
    if (query.trim()) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    }

    // Apply filters
    if (filters?.status) {
      queryBuilder = queryBuilder.eq('status', filters.status)
    }

    if (filters?.category) {
      queryBuilder = queryBuilder.eq('metadata->category', filters.category)
    }

    const { data, error } = await queryBuilder.order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to search function models: ${error.message}`)
    }

    return data.map(mapDbToFunctionModel)
  }
}
```

#### Cross-Feature Repository
```typescript
// lib/infrastructure/repositories/cross-feature-repository.ts
export class CrossFeatureRepository {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async createLink(link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<CrossFeatureLink> {
    const { data, error } = await this.supabase
      .from('cross_feature_links')
      .insert({
        source_entity_id: link.sourceEntityId,
        source_entity_type: link.sourceEntityType,
        target_entity_id: link.targetEntityId,
        target_entity_type: link.targetEntityType,
        link_type: link.linkType,
        node_context: link.nodeContext || null
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create cross-feature link: ${error.message}`)
    }

    return mapDbToCrossFeatureLink(data)
  }

  async getLinksByNode(nodeId: string): Promise<NodeLinkedEntity[]> {
    const { data, error } = await this.supabase
      .from('cross_feature_links')
      .select('*')
      .eq('node_context->nodeId', nodeId)

    if (error) {
      throw new Error(`Failed to get node links: ${error.message}`)
    }

    return data.map(mapDbToNodeLinkedEntity)
  }

  async createNodeLink(nodeId: string, link: NodeLinkedEntity): Promise<void> {
    const crossFeatureLink: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'> = {
      sourceEntityId: nodeId,
      sourceEntityType: 'function-model',
      targetEntityId: link.entityId,
      targetEntityType: link.entityType,
      linkType: link.linkType,
      nodeContext: {
        ...link.linkContext,
        nodeId
      }
    }

    await this.createLink(crossFeatureLink)
  }
}
```

### 4. **Presentation Layer Implementation**

#### Location: `app/(private)/dashboard/function-model/` and `components/composites/function-model/`
The Presentation Layer manages UI components and user interactions, keeping UI logic minimal.

#### Page Components
```typescript
// app/(private)/dashboard/function-model/list/page.tsx
export default function FunctionModelListPage() {
  const {
    models,
    loading,
    error,
    filters,
    searchQuery,
    loadModels,
    duplicateModel,
    deleteModel,
    updateFilters,
    updateSearchQuery
  } = useFunctionModelList()

  useEffect(() => {
    loadModels()
  }, [loadModels])

  const handleCreateNew = async () => {
    try {
      const newModel = await createNewFunctionModel(
        'Untitled Function Model',
        'New function model - click to edit description'
      )
      router.push(`/dashboard/function-model/${newModel.modelId}`)
    } catch (err) {
      console.error('Failed to create new model:', err)
    }
  }

  return (
    <div className="w-full h-full">
      <div className="fixed bottom-6 right-6 z-50">
        <Button size="lg" onClick={handleCreateNew} className="rounded-full shadow-lg">
          <Plus className="w-5 h-5 mr-2" />
          New Model
        </Button>
      </div>

      <FunctionModelList
        models={models}
        loading={loading}
        error={error}
        onModelSelect={handleModelSelect}
        onModelDelete={handleModelDelete}
        onModelDuplicate={handleModelDuplicate}
        onFiltersChange={updateFilters}
        onSearchChange={updateSearchQuery}
        filters={filters}
        searchQuery={searchQuery}
      />
    </div>
  )
}
```

#### Feature Components
```typescript
// app/(private)/dashboard/function-model/components/function-process-dashboard.tsx
export function FunctionProcessDashboard({ functionModel, onUpdateFunctionModel }: FunctionProcessDashboardProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)

  useEffect(() => {
    if (functionModel.nodesData) {
      setNodes(functionModel.nodesData)
    }
    if (functionModel.edgesData) {
      setEdges(functionModel.edgesData)
    }
  }, [functionModel])

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds))
  }, [])

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds))
  }, [])

  const handleSave = useCallback(async () => {
    const updatedModel = {
      ...functionModel,
      nodesData: nodes,
      edgesData: edges,
      updatedAt: new Date()
    }
    await onUpdateFunctionModel(updatedModel)
  }, [functionModel, nodes, edges, onUpdateFunctionModel])

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
              onChange={(e) => onUpdateFunctionModel({ ...functionModel, name: e.target.value })}
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
              onChange={(e) => onUpdateFunctionModel({ ...functionModel, description: e.target.value })}
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
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          nodeTypes={nodeTypes}
          fitView
        />
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-6 right-6 flex gap-2">
        <Button onClick={handleSave} disabled={loading}>
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
NodeTypeIndicator
StatusIndicator
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
- **`NodeTypeIndicator`**: Only responsible for displaying node type with appropriate icon and color
- **`FunctionModelList`**: Only responsible for displaying and managing the list of function models
- **`FunctionProcessDashboard`**: Only responsible for the canvas interface and workflow editing
- **`useFunctionModelPersistence`**: Only responsible for function model persistence operations

#### Encapsulation
- Components expose only necessary interfaces via props
- Internal state and logic are hidden from parent components
- Data transformations happen at the appropriate layer (Domain entities, Application hooks)

#### Reusability
- Base components (`NodeTypeIndicator`, `StatusIndicator`) are reused across features
- Composite components can be extended for other similar features
- Hooks provide reusable business logic

### 3. **Data Flow Compliance**

#### Top-Down Data Flow
```typescript
// Page Component → Feature Component → Composite Component → Base Component
FunctionModelListPage
  ↓ (props: models, loading, error, handlers)
FunctionModelList
  ↓ (props: model, onEdit, onDelete)
FunctionModelTableRow
  ↓ (props: type, size)
NodeTypeIndicator
```

#### Event Bubbling
```typescript
// Base Component → Composite Component → Feature Component → Page Component
NodeTypeIndicator (onClick)
  ↓
FunctionModelTableRow (onEdit)
  ↓
FunctionModelList (onModelSelect)
  ↓
FunctionModelListPage (router.push)
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
Infrastructure Layer (Repositories)
```

#### Layer Responsibilities
- **Domain Layer**: Function model entities, business rules, validation
- **Application Layer**: Use cases, orchestration, state management
- **Infrastructure Layer**: Data access, external API calls, persistence
- **Presentation Layer**: UI rendering, user interactions, navigation

### 5. **Testing Strategy Compliance**

#### Unit Testing
- Domain entities and business rules
- Application hooks and use cases
- Individual components with mocked dependencies

#### Integration Testing
- Component composition and data flow
- Hook integration with repositories
- Cross-feature interactions

#### End-to-End Testing
- Complete user workflows
- Canvas interactions and persistence
- List view operations and navigation

## Architecture Benefits

### 1. **Maintainability**
- Clear separation of concerns
- Independent layer evolution
- Easy to locate and modify specific functionality

### 2. **Testability**
- Business logic isolated in Domain layer
- Mockable dependencies
- Unit testable components and hooks

### 3. **Scalability**
- Modular component architecture
- Reusable components and hooks
- Extensible feature structure

### 4. **Flexibility**
- Easy to swap implementations (e.g., different databases)
- Framework-independent business logic
- Adaptable to changing requirements

This architecture compliance documentation demonstrates how the Function Model feature successfully implements both Clean Architecture principles and the established component architecture, providing a solid foundation for future development and maintenance. 