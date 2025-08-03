# Function Model Feature - Data Flow Documentation

## Data Flow Overview

The Function Model feature implements a comprehensive data flow architecture that follows Clean Architecture principles. Data flows from the Presentation Layer through the Application Layer to the Domain Layer, with the Infrastructure Layer providing external data access. The feature has been enhanced with a unified node-based architecture that provides enhanced capabilities while preserving all existing functionality.

## Data Flow Diagrams

### 1. **List View Data Flow**

```
User Interaction → Page Component → Application Hook → Repository → Database
     ↓              ↓                ↓              ↓           ↓
Search/Filter → FunctionModelList → useFunctionModelList → FunctionModelRepository → Supabase
     ↓              ↓                ↓              ↓           ↓
UI Update ← Component State ← Hook State ← Repository Response ← Query Results
```

### 2. **Canvas View Data Flow (Enhanced)**

```
User Interaction → Canvas Component → Application Hook → Repository → Database
     ↓              ↓                ↓              ↓           ↓
Node Edit → FunctionProcessDashboard → useFunctionModelNodes → Node Repositories → Supabase
     ↓              ↓                ↓              ↓           ↓
UI Update ← Component State ← Hook State ← Repository Response ← Save/Load Operations
```

### 3. **Migration Layer Data Flow (NEW)**

```
Legacy FunctionModel → Migration Layer → New Node Architecture → Database
     ↓                    ↓                    ↓                ↓
Old React Flow Nodes → FunctionModelNodeMigration → FunctionModelNode → function_model_nodes
     ↓                    ↓                    ↓                ↓
Old Relationships → Link Migration → NodeLinkRecord → node_links
     ↓                    ↓                    ↓                ↓
Old Metadata → Metadata Creation → NodeMetadataRecord → node_metadata
```

### 4. **Cross-Feature Linking Data Flow (Enhanced)**

```
Node Interaction → Modal Component → Application Hook → Repository → Cross-Feature Table
     ↓              ↓                ↓              ↓           ↓
Link Creation → NodeLinkingTab → useNodeLinking → NodeLinksRepository → node_links
     ↓              ↓                ↓              ↓           ↓
UI Update ← Component State ← Hook State ← Repository Response ← Link Data
```

### 5. **Unified Node Operations Data Flow (NEW)**

```
Cross-Feature Request → Unified Operations → Feature-Specific Repository → Database
     ↓                      ↓                      ↓                ↓
Node Operation → UnifiedNodeOperations → NodeMetadataRepository → node_metadata
     ↓                      ↓                      ↓                ↓
Response ← Operation Result ← Repository Response ← Query Results
```

## State Management Patterns

### 1. **Application Layer State Management**

#### `useFunctionModelNodes` Hook (NEW)
```typescript
interface FunctionModelNodesState {
  nodes: FunctionModelNode[]
  links: NodeLinkRecord[]
  metadata: NodeMetadataRecord[]
  loading: boolean
  error: string | null
  lastSavedAt: Date | null
  migrationProgress: MigrationProgress
}

interface FunctionModelNodesActions {
  createNode: (nodeType: string, name: string, position: Position, options?: any) => void
  updateNode: (nodeId: string, updates: Partial<FunctionModelNode>) => void
  deleteNode: (nodeId: string) => void
  createNodeLink: (sourceId: string, targetId: string, linkType: string) => void
  updateNodeLink: (linkId: string, updates: Partial<NodeLinkRecord>) => void
  deleteNodeLink: (linkId: string) => void
  saveNodes: () => Promise<void>
  loadNodes: () => Promise<void>
  migrateFromLegacy: (legacyModel: FunctionModel) => Promise<MigrationResult>
  executeNodeBehavior: (nodeId: string, behavior: NodeBehavior) => Promise<ExecutionResult>
}

interface MigrationProgress {
  isMigrating: boolean
  progress: number
  currentStep: string
  errors: string[]
  warnings: string[]
}
```

#### `useFunctionModelList` Hook (Enhanced)
```typescript
interface FunctionModelListState {
  models: FunctionModel[]
  loading: boolean
  error: string | null
  filters: FunctionModelFilters
  searchQuery: string
  searchLoading: boolean
  migrationStatus: MigrationStatus[]
}

interface FunctionModelListActions {
  loadModels: () => Promise<void>
  duplicateModel: (modelId: string) => Promise<FunctionModel>
  deleteModel: (modelId: string) => Promise<void>
  updateFilters: (filters: FunctionModelFilters) => void
  updateSearchQuery: (query: string) => void
  debouncedSearch: (query: string) => void
  migrateModel: (modelId: string) => Promise<MigrationResult>
  getMigrationStatus: (modelId: string) => MigrationStatus
}
```

#### `useFunctionModelPersistence` Hook (Enhanced)
```typescript
interface FunctionModelPersistenceState {
  currentModel: FunctionModel | null
  loading: boolean
  error: string | null
  lastSavedAt: Date | null
  migrationState: MigrationState
}

interface FunctionModelPersistenceActions {
  saveFunctionModel: (model: FunctionModel) => Promise<void>
  loadFunctionModel: (modelId: string) => Promise<FunctionModel>
  createFunctionModel: (name: string, description: string) => Promise<FunctionModel>
  updateFunctionModel: (modelId: string, updates: Partial<FunctionModel>) => Promise<void>
  migrateToNodeArchitecture: (modelId: string) => Promise<MigrationResult>
  reverseMigration: (modelId: string) => Promise<FunctionModel>
}

interface MigrationState {
  isMigrating: boolean
  migrationProgress: number
  currentStep: string
  errors: string[]
  warnings: string[]
}
```

#### `useNodeLinking` Hook (Enhanced)
```typescript
interface NodeLinkingState {
  linkedEntities: NodeLinkedEntity[]
  loading: boolean
  error: string | null
  linkStrength: number
  linkContext: Record<string, any>
}

interface NodeLinkingActions {
  createNodeLink: (link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  removeNodeLink: (linkId: string) => Promise<void>
  getNodeLinks: (nodeId: string) => Promise<NodeLinkedEntity[]>
  updateLinkStrength: (linkId: string, strength: number) => Promise<void>
  updateLinkContext: (linkId: string, context: Record<string, any>) => Promise<void>
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

// Migration state
const [migrationState, setMigrationState] = useState<MigrationState>({
  isMigrating: false,
  progress: 0,
  currentStep: '',
  errors: [],
  warnings: []
})
```

#### Derived State
```typescript
// Computed values from props or other state
const sortedNodes = useMemo(() => {
  return nodes.sort((a, b) => {
    // Sorting logic based on current sort criteria
  })
}, [nodes, sortBy, sortOrder])

// Node behavior computation
const nodeBehaviors = useMemo(() => {
  return nodes.map(node => ({
    nodeId: node.id,
    behavior: getNodeBehavior(node.nodeType),
    executionType: node.processBehavior?.executionType || 'sequential'
  }))
}, [nodes])

// Migration progress computation
const migrationProgress = useMemo(() => {
  return {
    totalNodes: legacyModel.nodesData?.length || 0,
    migratedNodes: nodes.length,
    progress: (nodes.length / (legacyModel.nodesData?.length || 1)) * 100
  }
}, [nodes, legacyModel])
```

## API Interactions and Data Transformations

### 1. **Repository Layer Interactions**

#### FunctionModelRepository (Enhanced)
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
  
  // NEW: Node-based operations
  async getNodeBasedModels(): Promise<FunctionModelNode[]>
  async migrateModelToNodes(modelId: string): Promise<MigrationResult>
  async getMigrationStatus(modelId: string): Promise<MigrationStatus>
}
```

#### NodeLinksRepository (NEW)
```typescript
class NodeLinksRepository {
  // Cross-feature linking operations
  async createNodeLink(link: Omit<NodeLinkRecord, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<NodeLinkRecord>
  async getNodeLinks(featureType: FeatureType, entityId: string, nodeId?: string): Promise<NodeLinkRecord[]>
  async getLinksByNode(nodeId: string): Promise<NodeLinkedEntity[]>
  async deleteNodeLink(linkId: string): Promise<void>
  
  // Node-level linking operations
  async createNodeLink(nodeId: string, link: NodeLinkedEntity): Promise<void>
  async getNodeLinks(nodeId: string): Promise<NodeLinkedEntity[]>
  async removeNodeLink(nodeId: string, linkId: string): Promise<void>
  
  // NEW: Advanced link operations
  async updateLinkStrength(linkId: string, strength: number): Promise<void>
  async updateLinkContext(linkId: string, context: Record<string, any>): Promise<void>
  async getLinkStatistics(featureType?: FeatureType): Promise<LinkStatistics>
  async searchLinks(query: string, featureType?: FeatureType): Promise<NodeLinkRecord[]>
}
```

#### NodeMetadataRepository (NEW)
```typescript
class NodeMetadataRepository {
  // CRUD operations for node metadata
  async createNodeMetadata(metadata: Omit<NodeMetadataRecord, 'metadataId' | 'createdAt' | 'updatedAt'>): Promise<NodeMetadataRecord>
  async getNodeMetadata(nodeId: string): Promise<NodeMetadataRecord | null>
  async updateNodeMetadata(nodeId: string, updates: Partial<NodeMetadataRecord>): Promise<NodeMetadataRecord>
  async deleteNodeMetadata(nodeId: string): Promise<void>
  
  // Search and indexing operations
  async searchNodes(query: string, featureType?: FeatureType): Promise<NodeMetadataRecord[]>
  async getNodesByTags(tags: string[], featureType?: FeatureType): Promise<NodeMetadataRecord[]>
  async getNodesByKeywords(keywords: string[], featureType?: FeatureType): Promise<NodeMetadataRecord[]>
  
  // NEW: AI and vector operations
  async updateVectorEmbedding(nodeId: string, embedding: number[]): Promise<void>
  async searchByVector(query: number[], limit?: number): Promise<NodeMetadataRecord[]>
  async updateAIAgentConfig(nodeId: string, config: AIAgentConfig): Promise<void>
  async getAIAgentConfig(nodeId: string): Promise<AIAgentConfig | null>
}
```

#### UnifiedNodeRepository (NEW)
```typescript
class UnifiedNodeRepository {
  // Unified node operations across all features
  async createNode(featureType: FeatureType, nodeType: string, data: any): Promise<BaseNode>
  async updateNode(nodeId: string, updates: Partial<BaseNode>): Promise<BaseNode>
  async deleteNode(nodeId: string): Promise<void>
  async getNode(nodeId: string): Promise<BaseNode | null>
  
  // Cross-feature operations
  async getNodesByFeature(featureType: FeatureType): Promise<BaseNode[]>
  async getNodesByType(nodeType: string): Promise<BaseNode[]>
  async searchNodesAcrossFeatures(query: string): Promise<BaseNode[]>
  
  // NEW: Behavior execution
  async executeNodeBehavior(nodeId: string, behavior: NodeBehavior): Promise<ExecutionResult>
  async validateNodeBehavior(nodeId: string, behavior: NodeBehavior): Promise<ValidationResult>
  async getNodeBehaviorHistory(nodeId: string): Promise<ExecutionResult[]>
}
```

### 2. **Data Transformations**

#### Migration Layer Transformations (NEW)
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

#### Node Behavior Transformations (NEW)
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

### 1. **Knowledge Base Integration (Enhanced)**

#### Data Flow
```
Function Model Node → NodeLinkingTab → NodeLinksRepository → Knowledge Base
     ↓                    ↓                    ↓                    ↓
Node Selection → Link Creation → Link Storage → Document Reference
     ↓                    ↓                    ↓                    ↓
UI Update ← Link Display ← Link Retrieval ← Document Data
```

#### Data Structures (Enhanced)
```typescript
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

interface KnowledgeBaseLink {
  nodeId: string
  documentId: string
  linkType: 'documents' | 'references'
  context: {
    section?: string
    relevance?: string
    notes?: string
    vectorEmbedding?: number[]
  }
  strength: number
  metadata: {
    lastAccessed: Date
    accessCount: number
    aiRelevance: number
  }
}
```

### 2. **Event Storm Integration (Enhanced)**

#### Data Flow
```
Function Model → Event Storm Process → Process Planning → Node Behavior
     ↓              ↓                    ↓                ↓
Process Design → Event Mapping → Workflow Planning → Execution Configuration
     ↓              ↓                    ↓                ↓
UI Integration ← Data Synchronization ← Process Documentation ← Behavior Validation
```

#### Data Structures (Enhanced)
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

### 3. **Spindle Integration (Enhanced)**

#### Data Flow
```
Spindle Event → Function Model Planning → Workflow Design → Node Behavior
     ↓              ↓                    ↓                ↓
Event Planning → Node Activation → Process Flow Design → Execution Planning
     ↓              ↓                    ↓                ↓
Data Planning ← Result Planning ← Execution Planning ← Behavior Configuration
```

#### Data Structures (Enhanced)
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

### 1. **Error Handling Patterns (Enhanced)**

#### Migration Layer Error Handling
```typescript
async function handleMigrationError(error: any, operation: string): Promise<never> {
  console.error(`Migration error in ${operation}:`, error)
  
  if (error.code === 'MIGRATION_VALIDATION_FAILED') {
    throw new Error('Migration validation failed - data integrity issues detected')
  }
  
  if (error.code === 'MIGRATION_INCOMPLETE') {
    throw new Error('Migration incomplete - some data could not be migrated')
  }
  
  if (error.code === 'REVERSE_MIGRATION_FAILED') {
    throw new Error('Reverse migration failed - cannot restore original format')
  }
  
  throw new Error(`Migration operation failed: ${error.message}`)
}
```

#### Node Behavior Error Handling
```typescript
async function handleNodeBehaviorError(error: any, nodeId: string, behavior: string): Promise<never> {
  console.error(`Node behavior error for ${nodeId} in ${behavior}:`, error)
  
  if (error.code === 'BEHAVIOR_VALIDATION_FAILED') {
    throw new Error(`Behavior validation failed for node ${nodeId}`)
  }
  
  if (error.code === 'EXECUTION_TIMEOUT') {
    throw new Error(`Node execution timed out for ${nodeId}`)
  }
  
  if (error.code === 'DEPENDENCY_MISSING') {
    throw new Error(`Required dependencies missing for node ${nodeId}`)
  }
  
  throw new Error(`Node behavior error: ${error.message}`)
}
```

#### Repository Level Error Handling (Enhanced)
```typescript
async function handleRepositoryError(error: any, operation: string): Promise<never> {
  console.error(`Repository error in ${operation}:`, error)
  
  if (error.code === 'PGRST116') {
    throw new Error('Entity not found')
  }
  
  if (error.code === 'PGRST301') {
    throw new Error('Validation failed')
  }
  
  if (error.code === 'NODE_LINK_CONFLICT') {
    throw new Error('Node link conflict - link already exists')
  }
  
  if (error.code === 'METADATA_INDEX_FAILED') {
    throw new Error('Metadata indexing failed')
  }
  
  throw new Error(`Database operation failed: ${error.message}`)
}
```

### 2. **Loading State Management (Enhanced)**

#### Loading States Hierarchy (Enhanced)
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
  
  // NEW: Migration and node behavior loading states
  migrationLoading: boolean
  nodeBehaviorLoading: boolean
  nodeMetadataLoading: boolean
  vectorSearchLoading: boolean
}
```

#### Migration Loading State Implementation
```typescript
function useMigrationLoadingStates() {
  const [migrationStates, setMigrationStates] = useState<Record<string, MigrationState>>({})
  
  const setMigrationLoading = useCallback((modelId: string, loading: boolean) => {
    setMigrationStates(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        isMigrating: loading,
        progress: loading ? 0 : prev[modelId]?.progress || 0
      }
    }))
  }, [])
  
  const updateMigrationProgress = useCallback((modelId: string, progress: number, step: string) => {
    setMigrationStates(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        progress,
        currentStep: step
      }
    }))
  }, [])
  
  const addMigrationError = useCallback((modelId: string, error: string) => {
    setMigrationStates(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        errors: [...(prev[modelId]?.errors || []), error]
      }
    }))
  }, [])
  
  return { migrationStates, setMigrationLoading, updateMigrationProgress, addMigrationError }
}
```

## Data Flow Optimization

### 1. **Debouncing and Throttling (Enhanced)**

#### Node Behavior Execution Throttling
```typescript
function useThrottledNodeBehavior(executeBehavior: (nodeId: string, behavior: NodeBehavior) => Promise<ExecutionResult>, delay: number = 1000) {
  const [pendingExecutions, setPendingExecutions] = useState<Map<string, NodeBehavior>>(new Map())
  
  const throttledExecute = useMemo(
    () => throttle(executeBehavior, delay),
    [executeBehavior, delay]
  )
  
  const handleNodeBehavior = useCallback((nodeId: string, behavior: NodeBehavior) => {
    setPendingExecutions(prev => new Map(prev).set(nodeId, behavior))
    throttledExecute(nodeId, behavior)
  }, [throttledExecute])
  
  return { pendingExecutions, handleNodeBehavior }
}
```

#### Migration Progress Throttling
```typescript
function useThrottledMigrationProgress(updateProgress: (progress: number, step: string) => void, delay: number = 500) {
  const [pendingProgress, setPendingProgress] = useState<{ progress: number; step: string } | null>(null)
  
  const throttledUpdate = useMemo(
    () => throttle(updateProgress, delay),
    [updateProgress, delay]
  )
  
  const handleProgressUpdate = useCallback((progress: number, step: string) => {
    setPendingProgress({ progress, step })
    throttledUpdate(progress, step)
  }, [throttledUpdate])
  
  return { pendingProgress, handleProgressUpdate }
}
```

### 2. **Caching Strategies (Enhanced)**

#### Node Metadata Caching
```typescript
function useNodeMetadataCache() {
  const [metadataCache, setMetadataCache] = useState<Map<string, NodeMetadataRecord>>(new Map())
  
  const getCachedMetadata = useCallback((nodeId: string) => {
    return metadataCache.get(nodeId)
  }, [metadataCache])
  
  const setCachedMetadata = useCallback((nodeId: string, metadata: NodeMetadataRecord) => {
    setMetadataCache(prev => new Map(prev).set(nodeId, metadata))
  }, [])
  
  const invalidateMetadataCache = useCallback((nodeId?: string) => {
    if (nodeId) {
      setMetadataCache(prev => {
        const newCache = new Map(prev)
        newCache.delete(nodeId)
        return newCache
      })
    } else {
      setMetadataCache(new Map())
    }
  }, [])
  
  return { getCachedMetadata, setCachedMetadata, invalidateMetadataCache }
}
```

#### Migration State Caching
```typescript
function useMigrationStateCache() {
  const [migrationCache, setMigrationCache] = useState<Map<string, MigrationState>>(new Map())
  
  const getCachedMigrationState = useCallback((modelId: string) => {
    return migrationCache.get(modelId)
  }, [migrationCache])
  
  const setCachedMigrationState = useCallback((modelId: string, state: MigrationState) => {
    setMigrationCache(prev => new Map(prev).set(modelId, state))
  }, [])
  
  const clearMigrationCache = useCallback((modelId?: string) => {
    if (modelId) {
      setMigrationCache(prev => {
        const newCache = new Map(prev)
        newCache.delete(modelId)
        return newCache
      })
    } else {
      setMigrationCache(new Map())
    }
  }, [])
  
  return { getCachedMigrationState, setCachedMigrationState, clearMigrationCache }
}
```

This data flow documentation provides a comprehensive understanding of how data moves through the enhanced Function Model feature with the new node-based architecture, enabling both human developers and AI agents to understand the implementation patterns and optimization strategies. 