# Function Model Feature - Data Flow Documentation

## Data Flow Overview

The Function Model feature implements a comprehensive data flow architecture that follows Clean Architecture principles. Data flows from the Presentation Layer through the Application Layer to the Domain Layer, with the Infrastructure Layer providing external data access. The feature has been enhanced with a unified node-based architecture that provides enhanced capabilities while preserving all existing functionality.

## Data Flow Diagrams

### 1. **List View Data Flow (Currently Active)**

```
User Interaction → Page Component → Application Hook → Repository → Database
     ↓              ↓                ↓              ↓           ↓
Search/Filter → FunctionModelList → useFunctionModelList → FunctionModelRepository → Supabase
     ↓              ↓                ↓              ↓           ↓
UI Update ← Component State ← Hook State ← Repository Response ← Query Results
```

### 2. **Canvas View Data Flow (Currently Active - Legacy)**

```
User Interaction → Canvas Component → Application Hook → Repository → Database
     ↓              ↓                ↓              ↓           ↓
Node Edit → FunctionProcessDashboard → useFunctionModelPersistence → FunctionModelRepository → Supabase
     ↓              ↓                ↓              ↓           ↓
UI Update ← Component State ← Hook State ← Repository Response ← Save/Load Operations
```

### 3. **Canvas View Data Flow (NEW - Partially Implemented)**

```
User Interaction → Canvas Component → Application Hook → Repository → Database
     ↓              ↓                ↓              ↓           ↓
Node Edit → FunctionProcessDashboardEnhanced → useFunctionModelNodes → Node Repositories → Supabase
     ↓              ↓                ↓              ↓           ↓
UI Update ← Component State ← Hook State ← Repository Response ← Save/Load Operations
```

### 4. **Migration Layer Data Flow (NEW - Partially Implemented)**

```
Legacy FunctionModel → Migration Layer → New Node Architecture → Database
     ↓                    ↓                    ↓                ↓
Old React Flow Nodes → FunctionModelNodeMigration → FunctionModelNode → function_model_nodes
     ↓                    ↓                    ↓                ↓
Old Relationships → Link Migration → NodeLinkRecord → node_links
     ↓                    ↓                    ↓                ↓
Old Metadata → Metadata Creation → NodeMetadataRecord → node_metadata
```

### 5. **Cross-Feature Linking Data Flow (Currently Active)**

```
Node Interaction → Modal Component → Application Hook → Repository → Cross-Feature Table
     ↓              ↓                ↓              ↓           ↓
Link Creation → NodeLinkingTab → useCrossFeatureLinking → CrossFeatureRepository → cross_feature_links
     ↓              ↓                ↓              ↓           ↓
UI Update ← Component State ← Hook State ← Repository Response ← Link Data
```

### 6. **Unified Node Operations Data Flow (NEW - Partially Implemented)**

```
Cross-Feature Request → Unified Operations → Feature-Specific Repository → Database
     ↓                      ↓                      ↓                ↓
Node Operation → UnifiedNodeOperations → NodeMetadataRepository → node_metadata
     ↓                      ↓                      ↓                ↓
Response ← Operation Result ← Repository Response ← Query Results
```

## State Management Patterns

### 1. **Application Layer State Management**

#### `useFunctionModelPersistence` Hook (LEGACY - Currently Active)
```typescript
interface FunctionModelPersistenceState {
  model: FunctionModel | null
  loading: boolean
  error: string | null
  autoSave: boolean
  saveInterval: number
}

interface FunctionModelPersistenceActions {
  loadModel: (options?: LoadOptions) => Promise<FunctionModel>
  saveModel: (options?: SaveOptions) => Promise<FunctionModel>
  updateModel: (updates: Partial<FunctionModel>) => void
  clearError: () => void
  setAutoSave: (enabled: boolean) => void
  setSaveInterval: (interval: number) => void
}
```

#### `useFunctionModelNodes` Hook (NEW - Partially Implemented)
```typescript
interface FunctionModelNodesState {
  nodes: FunctionModelNode[]
  metadata: NodeMetadataRecord[]
  links: NodeLinkRecord[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  statistics: {
    totalNodes: number
    nodesByType: Record<string, number>
    nodesByExecutionType: Record<string, number>
    nodesWithSLA: number
    nodesWithKPIs: number
  } | null
}

interface FunctionModelNodesActions {
  // Node operations
  createNode: (nodeType: string, name: string, position: Position, options?: any) => Promise<FunctionModelNode>
  updateNode: (nodeId: string, updates: Partial<FunctionModelNode>) => Promise<FunctionModelNode>
  deleteNode: (nodeId: string) => Promise<void>
  getNode: (nodeId: string) => FunctionModelNode | undefined
  
  // Node behavior operations
  executeNode: (nodeId: string, context?: any) => Promise<any>
  validateNode: (nodeId: string) => Promise<{ isValid: boolean; errors: string[]; warnings: string[] }>
  getNodeBehavior: (nodeId: string) => any
  
  // Cross-feature linking operations
  createNodeLink: (targetFeature: string, targetEntityId: string, targetNodeId?: string, linkType?: string, context?: any) => Promise<NodeLinkRecord>
  getNodeLinks: (nodeId?: string) => NodeLinkRecord[]
  deleteNodeLink: (linkId: string) => Promise<void>
  
  // Metadata operations
  updateNodeMetadata: (nodeId: string, metadata: Partial<NodeMetadataRecord>) => Promise<void>
  updateNodeVisualProperties: (nodeId: string, visualProperties: Record<string, any>) => Promise<void>
  
  // Search and filtering
  searchNodes: (query: string) => FunctionModelNode[]
  getNodesByType: (nodeType: FunctionModelNode['nodeType']) => FunctionModelNode[]
  getNodesByExecutionType: (executionType: string) => FunctionModelNode[]
  getNodesWithSLA: () => FunctionModelNode[]
  getNodesWithKPIs: () => FunctionModelNode[]
  
  // Statistics and analytics
  refreshStatistics: () => Promise<void>
  
  // Bulk operations
  bulkUpdateNodes: (updates: Partial<FunctionModelNode>) => Promise<void>
  bulkCreateNodes: (nodes: Omit<FunctionModelNode, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<FunctionModelNode[]>
  
  // State management
  refreshNodes: () => Promise<void>
  clearError: () => void
}
```

#### `useFunctionModelList` Hook (Currently Active)
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

#### `useCrossFeatureLinking` Hook (Currently Active)
```typescript
interface CrossFeatureLinkingState {
  links: CrossFeatureLink[]
  loading: boolean
  error: string | null
}

interface CrossFeatureLinkingActions {
  loadLinks: () => Promise<void>
  createLink: (targetFeature: string, targetId: string, linkType: string, context?: Record<string, any>) => Promise<CrossFeatureLink>
  updateLinkContext: (linkId: string, context: Record<string, any>) => Promise<void>
  deleteLink: (linkId: string) => Promise<void>
  clearError: () => void
}
```

### 2. **Component State Management**

#### Local Component State (Currently Active)
```typescript
// Form inputs and user interactions
const [formData, setFormData] = useState<FormData>({})

// UI state (modals, dropdowns, loading states)
const [isModalOpen, setIsModalOpen] = useState(false)
const [isLoading, setIsLoading] = useState(false)

// Temporary data (unsaved changes)
const [unsavedChanges, setUnsavedChanges] = useState<Partial<FunctionModel>>({})

// React Flow state
const [nodes, setNodes] = useState<Node[]>([])
const [edges, setEdges] = useState<Edge[]>([])
```

#### Derived State (Currently Active)
```typescript
// Computed values from props or other state
const sortedNodes = useMemo(() => {
  return nodes.sort((a, b) => {
    // Sorting logic based on current sort criteria
  })
}, [nodes, sortBy, sortOrder])

// Node statistics
const nodeStatistics = useMemo(() => {
  return {
    totalNodes: nodes.length,
    nodesByType: nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1
      return acc
    }, {}),
    nodesWithLinks: nodes.filter(node => 
      edges.some(edge => edge.source === node.id || edge.target === node.id)
    ).length
  }
}, [nodes, edges])
```

## API Interactions and Data Transformations

### 1. **Repository Layer Interactions**

#### FunctionModelRepository (LEGACY + NEW)
```typescript
class FunctionModelRepository {
  // Legacy operations (Currently Active)
  async create(model: Omit<FunctionModel, 'modelId' | 'createdAt' | 'updatedAt' | 'lastSavedAt'>): Promise<FunctionModel>
  async getById(modelId: string): Promise<FunctionModel | null>
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
  
  // NEW: Node-based operations (Partially Implemented)
  async getFunctionModelNodes(modelId: string): Promise<FunctionModelNode[]>
  async createFunctionModelNode(node: Omit<FunctionModelNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<FunctionModelNode>
  async updateFunctionModelNode(modelId: string, nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode>
  async deleteFunctionModelNode(modelId: string, nodeId: string): Promise<void>
  async getNodeStatistics(modelId: string): Promise<any>
}
```

#### NodeLinksRepository (NEW - Partially Implemented)
```typescript
class NodeLinksRepository {
  // Cross-feature linking operations
  async createNodeLink(link: Omit<NodeLinkRecord, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<NodeLinkRecord>
  async getNodeLinks(featureType: string, entityId: string, nodeId?: string): Promise<NodeLinkRecord[]>
  async deleteNodeLink(linkId: string): Promise<void>
}
```

#### NodeMetadataRepository (NEW - Partially Implemented)
```typescript
class NodeMetadataRepository {
  // CRUD operations for node metadata
  async createMetadata(metadata: Omit<NodeMetadataRecord, 'metadataId' | 'createdAt' | 'updatedAt'>): Promise<NodeMetadataRecord>
  async getMetadataByEntity(featureType: string, entityId: string): Promise<NodeMetadataRecord[]>
  async updateMetadata(metadataId: string, updates: Partial<NodeMetadataRecord>): Promise<NodeMetadataRecord>
  async updateVisualProperties(metadataId: string, visualProperties: Record<string, any>): Promise<void>
}
```

### 2. **Data Transformations**

#### Legacy to New Node Transformation (Partially Implemented)
```typescript
// Legacy to New Node transformation
function migrateLegacyNode(legacyNode: Node, modelId: string): FunctionModelNode {
  return {
    id: legacyNode.id,
    featureType: 'function-model',
    nodeType: mapLegacyNodeType(legacyNode.type),
    name: legacyNode.data.label || 'Unnamed Node',
    description: legacyNode.data.description || '',
    position: legacyNode.position,
    visualProperties: {
      color: getDefaultColor(legacyNode.type),
      icon: getDefaultIcon(legacyNode.type),
      size: 'medium',
      style: {},
      featureSpecific: {}
    },
    metadata: {
      tags: [legacyNode.type, 'function-model'],
      searchKeywords: [legacyNode.data.label?.toLowerCase() || '', legacyNode.type],
      crossFeatureLinks: [],
      aiAgent: undefined,
      vectorEmbedding: undefined
    },
    status: {
      status: 'active',
      lastExecuted: undefined,
      executionCount: 0,
      errorCount: 0
    },
    functionModelData: extractFunctionModelData(legacyNode.data),
    processBehavior: {
      executionType: 'sequential',
      dependencies: [],
      timeout: undefined,
      retryPolicy: undefined
    },
    businessLogic: {
      raciMatrix: undefined,
      sla: undefined,
      kpis: []
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

// New Node to Legacy transformation (for backward compatibility)
function reverseMigrateNode(node: FunctionModelNode): Node {
  return {
    id: node.id,
    type: node.nodeType,
    position: node.position,
    data: {
      label: node.name,
      description: node.description,
      ...extractLegacyData(node.functionModelData)
    }
  }
}
```

#### Node Behavior Transformations (Partially Implemented)
```typescript
// Node behavior validation
function validateNodeBehavior(node: FunctionModelNode, behavior: NodeBehavior): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Validate execution type compatibility
  if (behavior.executionType && node.processBehavior.executionType !== behavior.executionType) {
    warnings.push(`Execution type mismatch: expected ${behavior.executionType}, got ${node.processBehavior.executionType}`)
  }
  
  // Validate dependencies
  if (behavior.dependencies && behavior.dependencies.length > 0) {
    const missingDeps = behavior.dependencies.filter(dep => !node.processBehavior.dependencies.includes(dep))
    if (missingDeps.length > 0) {
      errors.push(`Missing dependencies: ${missingDeps.join(', ')}`)
    }
  }
  
  // Validate business logic
  if (behavior.requiresRACI && !node.businessLogic.raciMatrix) {
    warnings.push('RACI matrix is recommended for this node type')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Node behavior execution
async function executeNodeBehavior(node: FunctionModelNode, context: any): Promise<ExecutionResult> {
  const startTime = Date.now()
  
  try {
    // Execute based on node type and behavior
    const result = await executeNodeByType(node, context)
    
    return {
      success: true,
      executionTime: Date.now() - startTime,
      result,
      errors: [],
      warnings: []
    }
  } catch (error) {
    return {
      success: false,
      executionTime: Date.now() - startTime,
      result: null,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: []
    }
  }
}
```

## Cross-Feature Data Sharing

### 1. **Knowledge Base Integration (Currently Active)**

#### Data Flow
```
Function Model Node → NodeLinkingTab → CrossFeatureRepository → Knowledge Base
     ↓                    ↓                    ↓                    ↓
Node Selection → Link Creation → Link Storage → Document Reference
     ↓                    ↓                    ↓                    ↓
UI Update ← Link Display ← Link Retrieval ← Document Data
```

#### Data Structures (Currently Active)
```typescript
interface CrossFeatureLink {
  linkId: string
  sourceFeature: string
  sourceId: string
  targetFeature: string
  targetId: string
  linkType: string
  context: Record<string, any>
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface NodeLinkedEntity {
  entityId: string
  entityType: 'function-model' | 'knowledge-base' | 'spindle'
  linkType: 'documents' | 'implements' | 'references' | 'supports' | 'nested'
  linkContext: Record<string, any>
  linkId: string
  linkStrength: number
  metadata: {
    relevance: number
    lastAccessed: Date
    accessCount: number
  }
}
```

### 2. **Event Storm Integration (Currently Active)**

#### Data Flow
```
Function Model → Event Storm Process → Process Planning → Node Behavior
     ↓              ↓                    ↓                ↓
Process Design → Event Mapping → Workflow Planning → Execution Configuration
     ↓              ↓                    ↓                ↓
UI Integration ← Data Synchronization ← Process Documentation ← Behavior Validation
```

#### Data Structures (Currently Active)
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
  behavior: {
    executionType: 'sequential' | 'parallel' | 'conditional'
    dependencies: string[]
    timeout?: number
  }
  metadata: {
    lastSynchronized: Date
    syncStatus: 'synced' | 'pending' | 'error'
    conflicts: string[]
  }
}
```

### 3. **Spindle Integration (Currently Active)**

#### Data Flow
```
Spindle Event → Function Model Planning → Workflow Design → Node Behavior
     ↓              ↓                    ↓                ↓
Event Planning → Node Activation → Process Flow Design → Execution Planning
     ↓              ↓                    ↓                ↓
Data Planning ← Result Planning ← Execution Planning ← Behavior Configuration
```

#### Data Structures (Currently Active)
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
  behavior: {
    executionType: 'sequential' | 'parallel' | 'conditional'
    retryPolicy: RetryPolicy
    timeout: number
  }
  metadata: {
    lastTriggered: Date
    triggerCount: number
    successRate: number
    averageExecutionTime: number
  }
}
```

## Error Handling and Loading States

### 1. **Error Handling Patterns (Currently Active)**

#### Repository Level Error Handling
```typescript
async function handleRepositoryError(error: any, operation: string): Promise<never> {
  console.error(`Repository error in ${operation}:`, error)
  
  if (error.code === 'PGRST116') {
    throw new Error('Entity not found')
  }
  
  if (error.code === 'PGRST301') {
    throw new Error('Validation failed')
  }
  
  if (error.code === 'CROSS_FEATURE_LINK_CONFLICT') {
    throw new Error('Cross-feature link conflict - link already exists')
  }
  
  throw new Error(`Database operation failed: ${error.message}`)
}
```

#### Hook Level Error Handling
```typescript
async function handleHookError(error: any, operation: string): Promise<never> {
  console.error(`Hook error in ${operation}:`, error)
  
  if (error.code === 'MODEL_NOT_FOUND') {
    throw new Error('Function model not found')
  }
  
  if (error.code === 'SAVE_FAILED') {
    throw new Error('Failed to save function model')
  }
  
  if (error.code === 'LOAD_FAILED') {
    throw new Error('Failed to load function model')
  }
  
  throw new Error(`Hook operation failed: ${error.message}`)
}
```

### 2. **Loading State Management (Currently Active)**

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
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }))
  }, [])
  
  const setMultipleLoading = useCallback((states: Partial<LoadingStates>) => {
    setLoadingStates(prev => ({
      ...prev,
      ...states
    }))
  }, [])
  
  return { loadingStates, setLoading, setMultipleLoading }
}
```

## Data Flow Optimization

### 1. **Debouncing and Throttling (Currently Active)**

#### Search Debouncing
```typescript
function useDebouncedSearch(searchFunction: (query: string) => void, delay: number = 300) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const debouncedSearch = useMemo(
    () => debounce(searchFunction, delay),
    [searchFunction, delay]
  )
  
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    debouncedSearch(query)
  }, [debouncedSearch])
  
  return { searchQuery, handleSearchChange }
}
```

#### Auto-Save Throttling
```typescript
function useThrottledAutoSave(saveFunction: () => Promise<void>, interval: number = 5000) {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  
  const throttledSave = useMemo(
    () => throttle(saveFunction, interval),
    [saveFunction, interval]
  )
  
  const handleAutoSave = useCallback(() => {
    throttledSave()
    setLastSavedAt(new Date())
  }, [throttledSave])
  
  return { lastSavedAt, handleAutoSave }
}
```

### 2. **Caching Strategies (Currently Active)**

#### Model Data Caching
```typescript
function useModelCache() {
  const [modelCache, setModelCache] = useState<Map<string, FunctionModel>>(new Map())
  
  const getCachedModel = useCallback((modelId: string) => {
    return modelCache.get(modelId)
  }, [modelCache])
  
  const setCachedModel = useCallback((modelId: string, model: FunctionModel) => {
    setModelCache(prev => new Map(prev).set(modelId, model))
  }, [])
  
  const invalidateModelCache = useCallback((modelId?: string) => {
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
  
  return { getCachedModel, setCachedModel, invalidateModelCache }
}
```

#### Cross-Feature Link Caching
```typescript
function useLinkCache() {
  const [linkCache, setLinkCache] = useState<Map<string, CrossFeatureLink[]>>(new Map())
  
  const getCachedLinks = useCallback((entityId: string) => {
    return linkCache.get(entityId)
  }, [linkCache])
  
  const setCachedLinks = useCallback((entityId: string, links: CrossFeatureLink[]) => {
    setLinkCache(prev => new Map(prev).set(entityId, links))
  }, [])
  
  const invalidateLinkCache = useCallback((entityId?: string) => {
    if (entityId) {
      setLinkCache(prev => {
        const newCache = new Map(prev)
        newCache.delete(entityId)
        return newCache
      })
    } else {
      setLinkCache(new Map())
    }
  }, [])
  
  return { getCachedLinks, setCachedLinks, invalidateLinkCache }
}
```

## Current Implementation Status

### ✅ **Fully Implemented**
- Legacy React Flow canvas with drag-and-drop functionality
- Basic node types (Stage, Action, IO, Container)
- Node creation, editing, and deletion
- Cross-feature linking modal system
- Version control and model persistence
- Basic node metadata system

### 🔄 **Partially Implemented**
- **Node-Based Architecture**: Core types and hooks exist, but not fully integrated
- **Enhanced Node Management**: `useFunctionModelNodes` hook implemented but not used in main canvas
- **Migration Layer**: Types and interfaces exist, but migration logic not fully implemented
- **Cross-Feature Linking**: Basic linking exists, but advanced features not implemented
- **Node Behavior System**: Framework exists, but execution not fully implemented

### ❌ **Not Implemented**
- **Workflow Execution**: No execution engine
- **AI Integration**: No AI agent implementation
- **Advanced Analytics**: No performance monitoring
- **Real-time Collaboration**: No collaborative editing
- **Advanced Export/Import**: Limited to JSON format

This data flow documentation provides a comprehensive understanding of how data moves through the Function Model feature with both the legacy React Flow implementation and the new node-based architecture, enabling both human developers and AI agents to understand the implementation patterns and optimization strategies. 