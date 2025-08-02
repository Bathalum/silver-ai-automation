# Function Model Feature - Data Flow Documentation

## Data Flow Overview

The Function Model feature implements a comprehensive data flow architecture that follows Clean Architecture principles. Data flows from the Presentation Layer through the Application Layer to the Domain Layer, with the Infrastructure Layer providing external data access.

## Data Flow Diagrams

### 1. **List View Data Flow**

```
User Interaction → Page Component → Application Hook → Repository → Database
     ↓              ↓                ↓              ↓           ↓
Search/Filter → FunctionModelList → useFunctionModelList → FunctionModelRepository → Supabase
     ↓              ↓                ↓              ↓           ↓
UI Update ← Component State ← Hook State ← Repository Response ← Query Results
```

### 2. **Canvas View Data Flow**

```
User Interaction → Canvas Component → Application Hook → Repository → Database
     ↓              ↓                ↓              ↓           ↓
Node Edit → FunctionProcessDashboard → useFunctionModelPersistence → FunctionModelRepository → Supabase
     ↓              ↓                ↓              ↓           ↓
UI Update ← Component State ← Hook State ← Repository Response ← Save/Load Operations
```

### 3. **Cross-Feature Linking Data Flow**

```
Node Interaction → Modal Component → Application Hook → Repository → Cross-Feature Table
     ↓              ↓                ↓              ↓           ↓
Link Creation → NodeLinkingTab → useNodeLinking → CrossFeatureRepository → cross_feature_links
     ↓              ↓                ↓              ↓           ↓
UI Update ← Component State ← Hook State ← Repository Response ← Link Data
```

## State Management Patterns

### 1. **Application Layer State Management**

#### `useFunctionModelList` Hook
```typescript
interface FunctionModelListState {
  models: FunctionModel[]
  loading: boolean
  error: string | null
  filters: FunctionModelFilters
  searchQuery: string
  searchLoading: boolean
}

interface FunctionModelListActions {
  loadModels: () => Promise<void>
  duplicateModel: (modelId: string) => Promise<FunctionModel>
  deleteModel: (modelId: string) => Promise<void>
  updateFilters: (filters: FunctionModelFilters) => void
  updateSearchQuery: (query: string) => void
  debouncedSearch: (query: string) => void
}
```

#### `useFunctionModelPersistence` Hook
```typescript
interface FunctionModelPersistenceState {
  currentModel: FunctionModel | null
  loading: boolean
  error: string | null
  lastSavedAt: Date | null
}

interface FunctionModelPersistenceActions {
  saveFunctionModel: (model: FunctionModel) => Promise<void>
  loadFunctionModel: (modelId: string) => Promise<FunctionModel>
  createFunctionModel: (name: string, description: string) => Promise<FunctionModel>
  updateFunctionModel: (modelId: string, updates: Partial<FunctionModel>) => Promise<void>
}
```

#### `useNodeLinking` Hook
```typescript
interface NodeLinkingState {
  linkedEntities: NodeLinkedEntity[]
  loading: boolean
  error: string | null
}

interface NodeLinkingActions {
  createNodeLink: (link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  removeNodeLink: (linkId: string) => Promise<void>
  getNodeLinks: (nodeId: string) => Promise<NodeLinkedEntity[]>
}
```

### 2. **Component State Management**

#### Local Component State
```typescript
// Form inputs and user interactions
const [formData, setFormData] = useState<FormData>({})

// UI state (modals, dropdowns, loading states)
const [isModalOpen, setIsModalOpen] = useState(false)
const [isLoading, setIsLoading] = useState(false)

// Temporary data (unsaved changes)
const [unsavedChanges, setUnsavedChanges] = useState<Partial<FunctionModel>>({})
```

#### Derived State
```typescript
// Computed values from props or other state
const sortedModels = useMemo(() => {
  return models.sort((a, b) => {
    // Sorting logic based on current sort criteria
  })
}, [models, sortBy, sortOrder])

// Performance data generation
const performanceData = useMemo(() => {
  return generatePerformanceData(model)
}, [model])
```

## API Interactions and Data Transformations

### 1. **Repository Layer Interactions**

#### FunctionModelRepository
```typescript
class FunctionModelRepository {
  // CRUD Operations
  async create(model: Omit<FunctionModel, 'modelId' | 'createdAt' | 'updatedAt' | 'lastSavedAt'>): Promise<FunctionModel>
  async getById(modelId: string): Promise<FunctionModel | null>
  async getAll(): Promise<FunctionModel[]>
  async update(modelId: string, updates: Partial<FunctionModel>): Promise<FunctionModel>
  async delete(modelId: string): Promise<void>
  
  // Search and Filter Operations
  async search(query: string, filters?: FunctionModelFilters): Promise<FunctionModel[]>
  async getByStatus(status: string): Promise<FunctionModel[]>
  async getByCategory(category: string): Promise<FunctionModel[]>
  
  // Version Control Operations
  async createVersion(modelId: string, version: VersionEntry): Promise<void>
  async getVersions(modelId: string): Promise<VersionEntry[]>
  async restoreVersion(modelId: string, versionId: string): Promise<FunctionModel>
}
```

#### CrossFeatureRepository
```typescript
class CrossFeatureRepository {
  // Cross-feature linking operations
  async createLink(link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<CrossFeatureLink>
  async getLinksByEntity(entityId: string, entityType: string): Promise<CrossFeatureLink[]>
  async getLinksByNode(nodeId: string): Promise<NodeLinkedEntity[]>
  async deleteLink(linkId: string): Promise<void>
  
  // Node-level linking operations
  async createNodeLink(nodeId: string, link: NodeLinkedEntity): Promise<void>
  async getNodeLinks(nodeId: string): Promise<NodeLinkedEntity[]>
  async removeNodeLink(nodeId: string, linkId: string): Promise<void>
}
```

### 2. **Data Transformations**

#### Domain Entity Transformations
```typescript
// Database to Domain transformation
function mapDbToFunctionModel(dbRecord: any): FunctionModel {
  return {
    modelId: dbRecord.model_id,
    name: dbRecord.name,
    description: dbRecord.description,
    version: dbRecord.version,
    status: dbRecord.status,
    nodesData: JSON.parse(dbRecord.nodes_data || '[]'),
    edgesData: JSON.parse(dbRecord.edges_data || '[]'),
    viewportData: JSON.parse(dbRecord.viewport_data || '{}'),
    metadata: JSON.parse(dbRecord.metadata || '{}'),
    permissions: JSON.parse(dbRecord.permissions || '{}'),
    versionHistory: JSON.parse(dbRecord.version_history || '[]'),
    currentVersion: dbRecord.current_version,
    createdAt: new Date(dbRecord.created_at),
    updatedAt: new Date(dbRecord.updated_at),
    lastSavedAt: new Date(dbRecord.last_saved_at)
  }
}

// Domain to Database transformation
function mapFunctionModelToDb(model: FunctionModel): any {
  return {
    model_id: model.modelId,
    name: model.name,
    description: model.description,
    version: model.version,
    status: model.status,
    nodes_data: JSON.stringify(model.nodesData),
    edges_data: JSON.stringify(model.edgesData),
    viewport_data: JSON.stringify(model.viewportData),
    metadata: JSON.stringify(model.metadata),
    permissions: JSON.stringify(model.permissions),
    version_history: JSON.stringify(model.versionHistory),
    current_version: model.currentVersion,
    created_at: model.createdAt.toISOString(),
    updated_at: model.updatedAt.toISOString(),
    last_saved_at: model.lastSavedAt.toISOString()
  }
}
```

#### Performance Data Generation
```typescript
// Generate placeholder performance data for UI display
function generatePerformanceData(model: FunctionModel) {
  const nodeTypes = extractNodeTypes(model.nodesData)
  const nodeCount = model.nodesData?.length || 0
  const connections = nodeCount * 2
  
  const baseSuccessRate = Math.max(80, 100 - (nodeCount * 2))
  const successRate = Math.floor(Math.random() * 10) + baseSuccessRate
  const avgRuntime = `${(Math.random() * 3 + 1 + (nodeCount * 0.2)).toFixed(1)}s`
  const executions = Math.floor(Math.random() * 10000) + (nodeCount * 100)
  
  return {
    nodeTypes,
    performance: {
      successRate: Math.min(100, successRate),
      avgRuntime,
      executions,
      connections
    },
    stats: { executions }
  }
}
```

## Cross-Feature Data Sharing

### 1. **Knowledge Base Integration**

#### Data Flow
```
Function Model Node → NodeLinkingTab → CrossFeatureRepository → Knowledge Base
     ↓                    ↓                    ↓                    ↓
Node Selection → Link Creation → Link Storage → Document Reference
     ↓                    ↓                    ↓                    ↓
UI Update ← Link Display ← Link Retrieval ← Document Data
```

#### Data Structures
```typescript
interface NodeLinkedEntity {
  entityId: string
  entityType: 'function-model' | 'knowledge-base' | 'spindle'
  linkType: 'documents' | 'implements' | 'references' | 'supports' | 'nested'
  linkContext: Record<string, any>
  linkId: string
}

interface KnowledgeBaseLink {
  nodeId: string
  documentId: string
  linkType: 'documents' | 'references'
  context: {
    section?: string
    relevance?: string
    notes?: string
  }
}
```

### 2. **Event Storm Integration**

#### Data Flow
```
Function Model → Event Storm Process → Process Implementation
     ↓              ↓                    ↓
Process Design → Event Mapping → Workflow Creation
     ↓              ↓                    ↓
UI Integration ← Data Synchronization ← Process Execution
```

#### Data Structures
```typescript
interface EventStormLink {
  functionModelId: string
  eventStormId: string
  processId: string
  linkType: 'implements' | 'references'
  mapping: {
    events: string[]
    commands: string[]
    aggregates: string[]
  }
}
```

### 3. **Spindle Integration**

#### Data Flow
```
Spindle Event → Function Model Trigger → Workflow Execution
     ↓              ↓                    ↓
Event Detection → Node Activation → Process Flow
     ↓              ↓                    ↓
Data Processing ← Result Handling ← Execution Complete
```

#### Data Structures
```typescript
interface SpindleLink {
  functionModelId: string
  spindleId: string
  eventId: string
  linkType: 'triggers' | 'processes'
  configuration: {
    triggerConditions: string[]
    eventFilters: string[]
    dataMapping: Record<string, string>
  }
}
```

## Error Handling and Loading States

### 1. **Error Handling Patterns**

#### Repository Level
```typescript
async function handleRepositoryError(error: any, operation: string): Promise<never> {
  console.error(`Repository error in ${operation}:`, error)
  
  if (error.code === 'PGRST116') {
    throw new Error('Entity not found')
  }
  
  if (error.code === 'PGRST301') {
    throw new Error('Validation failed')
  }
  
  throw new Error(`Database operation failed: ${error.message}`)
}
```

#### Hook Level
```typescript
function useErrorHandler() {
  const [error, setError] = useState<string | null>(null)
  
  const handleError = useCallback((error: any, context: string) => {
    console.error(`Error in ${context}:`, error)
    setError(error.message || 'An unexpected error occurred')
    
    // Auto-clear error after 5 seconds
    setTimeout(() => setError(null), 5000)
  }, [])
  
  return { error, handleError, clearError: () => setError(null) }
}
```

#### Component Level
```typescript
function useComponentErrorHandler() {
  const { error, handleError } = useErrorHandler()
  
  const safeAsyncOperation = useCallback(async (
    operation: () => Promise<any>,
    context: string
  ) => {
    try {
      return await operation()
    } catch (err) {
      handleError(err, context)
      throw err
    }
  }, [handleError])
  
  return { error, safeAsyncOperation }
}
```

### 2. **Loading State Management**

#### Loading States Hierarchy
```typescript
interface LoadingStates {
  // Global loading states
  appLoading: boolean
  
  // Feature-level loading states
  functionModelListLoading: boolean
  functionModelCanvasLoading: boolean
  
  // Component-level loading states
  saveLoading: boolean
  loadLoading: boolean
  searchLoading: boolean
  linkLoading: boolean
  
  // Operation-specific loading states
  nodeEditLoading: boolean
  crossFeatureLinkLoading: boolean
}
```

#### Loading State Implementation
```typescript
function useLoadingStates() {
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    appLoading: false,
    functionModelListLoading: false,
    functionModelCanvasLoading: false,
    saveLoading: false,
    loadLoading: false,
    searchLoading: false,
    linkLoading: false,
    nodeEditLoading: false,
    crossFeatureLinkLoading: false
  })
  
  const setLoading = useCallback((key: keyof LoadingStates, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }))
  }, [])
  
  const withLoading = useCallback(async <T>(
    key: keyof LoadingStates,
    operation: () => Promise<T>
  ): Promise<T> => {
    setLoading(key, true)
    try {
      return await operation()
    } finally {
      setLoading(key, false)
    }
  }, [setLoading])
  
  return { loadingStates, setLoading, withLoading }
}
```

## Data Flow Optimization

### 1. **Debouncing and Throttling**

#### Search Debouncing
```typescript
function useDebouncedSearch(callback: (query: string) => void, delay: number = 300) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const debouncedCallback = useMemo(
    () => debounce(callback, delay),
    [callback, delay]
  )
  
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    debouncedCallback(query)
  }, [debouncedCallback])
  
  return { searchQuery, handleSearchChange }
}
```

#### Save Throttling
```typescript
function useThrottledSave(saveFunction: (model: FunctionModel) => Promise<void>, delay: number = 1000) {
  const [pendingSave, setPendingSave] = useState<FunctionModel | null>(null)
  
  const throttledSave = useMemo(
    () => throttle(saveFunction, delay),
    [saveFunction, delay]
  )
  
  const handleSave = useCallback((model: FunctionModel) => {
    setPendingSave(model)
    throttledSave(model)
  }, [throttledSave])
  
  return { pendingSave, handleSave }
}
```

### 2. **Caching Strategies**

#### Model Caching
```typescript
function useModelCache() {
  const [modelCache, setModelCache] = useState<Map<string, FunctionModel>>(new Map())
  
  const getCachedModel = useCallback((modelId: string) => {
    return modelCache.get(modelId)
  }, [modelCache])
  
  const setCachedModel = useCallback((modelId: string, model: FunctionModel) => {
    setModelCache(prev => new Map(prev).set(modelId, model))
  }, [])
  
  const invalidateCache = useCallback((modelId?: string) => {
    if (modelId) {
      setModelCache(prev => {
        const newCache = new Map(prev)
        newCache.delete(modelId)
        return newCache
      })
    } else {
      setModelCache(new Map())
    }
  }, [])
  
  return { getCachedModel, setCachedModel, invalidateCache }
}
```

#### List Caching
```typescript
function useListCache() {
  const [listCache, setListCache] = useState<{
    models: FunctionModel[]
    timestamp: number
    filters: FunctionModelFilters
    searchQuery: string
  } | null>(null)
  
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  
  const isCacheValid = useCallback((filters: FunctionModelFilters, searchQuery: string) => {
    if (!listCache) return false
    
    const isExpired = Date.now() - listCache.timestamp > CACHE_DURATION
    const hasSameFilters = JSON.stringify(listCache.filters) === JSON.stringify(filters)
    const hasSameQuery = listCache.searchQuery === searchQuery
    
    return !isExpired && hasSameFilters && hasSameQuery
  }, [listCache])
  
  const getCachedList = useCallback((filters: FunctionModelFilters, searchQuery: string) => {
    return isCacheValid(filters, searchQuery) ? listCache?.models : null
  }, [listCache, isCacheValid])
  
  const setCachedList = useCallback((
    models: FunctionModel[],
    filters: FunctionModelFilters,
    searchQuery: string
  ) => {
    setListCache({
      models,
      timestamp: Date.now(),
      filters,
      searchQuery
    })
  }, [])
  
  return { getCachedList, setCachedList, invalidateCache: () => setListCache(null) }
}
```

This data flow documentation provides a comprehensive understanding of how data moves through the Function Model feature, enabling both human developers and AI agents to understand the implementation patterns and optimization strategies. 