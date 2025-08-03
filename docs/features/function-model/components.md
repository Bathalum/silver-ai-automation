# Function Model Feature - Components Documentation

## Complete File and Folder Structure

```
app/(private)/dashboard/function-model/
├── components/
│   ├── flow-nodes.css
│   ├── flow-nodes.tsx
│   ├── function-process-dashboard.tsx (LEGACY)
│   └── function-process-dashboard-enhanced.tsx (NEW - Partially Implemented)
├── list/
│   └── page.tsx
├── [modelId]/
│   └── page.tsx
└── page.tsx

components/composites/function-model/
├── create-cross-feature-link-dialog.tsx
├── cross-feature-linking-panel.tsx
├── function-model-filters.tsx
├── function-model-list.tsx
├── function-model-modal.tsx
├── function-model-table-row.tsx
├── load-model-dialog.tsx
├── nested-models-tab.tsx
├── node-linking-tab.tsx
├── node-type-indicator.tsx
├── save-load-panel.tsx
├── save-model-dialog.tsx
└── status-indicator.tsx

lib/
├── application/
│   ├── hooks/
│   │   ├── use-function-model-nodes.ts (NEW - Partially Implemented)
│   │   └── use-function-model-persistence.ts (LEGACY)
│   └── use-cases/
│       └── function-model-persistence-use-cases.ts
├── domain/
│   └── entities/
│       ├── base-node-types.ts (NEW - Partially Implemented)
│       ├── cross-feature-link-types.ts
│       ├── function-model-node-types.ts (NEW - Partially Implemented)
│       ├── function-model-types.ts (LEGACY)
│       ├── node-behavior-types.ts (NEW - Partially Implemented)
│       ├── unified-node-types.ts (NEW - Partially Implemented)
│       └── version-control-types.ts
├── infrastructure/
│   ├── migrations/
│   │   └── function-model-node-migration.ts (NEW - Partially Implemented)
│   └── repositories/
│       ├── function-model-repository.ts (LEGACY + NEW)
│       ├── node-links-repository.ts (NEW - Partially Implemented)
│       ├── node-metadata-repository.ts (NEW - Partially Implemented)
│       └── unified-node-repository.ts (NEW - Partially Implemented)
├── stores/
│   └── unified-node-store.ts (NEW - Partially Implemented)
└── use-cases/
    └── unified-node-operations.ts (NEW - Partially Implemented)
```

## Component Hierarchy

### Legacy Implementation (Currently Active)
```
FunctionModelListPage (app/(private)/dashboard/function-model/list/page.tsx)
├── FunctionModelList (components/composites/function-model/function-model-list.tsx)
│   ├── FunctionModelTableRow (components/composites/function-model/function-model-table-row.tsx)
│   │   ├── NodeTypeIndicator (components/composites/function-model/node-type-indicator.tsx)
│   │   └── StatusIndicator (components/composites/function-model/status-indicator.tsx)
│   └── FunctionModelFilters (components/composites/function-model/function-model-filters.tsx)

FunctionModelCanvasPage (app/(private)/dashboard/function-model/[modelId]/page.tsx)
└── FunctionProcessDashboard (app/(private)/dashboard/function-model/components/function-process-dashboard.tsx)
    ├── FlowNodes (app/(private)/dashboard/function-model/components/flow-nodes.tsx)
    ├── SaveLoadPanel (components/composites/function-model/save-load-panel.tsx)
    │   ├── SaveModelDialog (components/composites/function-model/save-model-dialog.tsx)
    │   └── LoadModelDialog (components/composites/function-model/load-model-dialog.tsx)
    └── CrossFeatureLinkingPanel (components/composites/function-model/cross-feature-linking-panel.tsx)
        └── CreateCrossFeatureLinkDialog (components/composites/function-model/create-cross-feature-link-dialog.tsx)
```

### New Implementation (Partially Implemented)
```
FunctionModelListPage → FunctionModelList → FunctionModelTableRow → Base Components
FunctionModelCanvasPage → FunctionProcessDashboardEnhanced → useFunctionModelNodes → Node Repositories

UnifiedNodeOperations (lib/use-cases/unified-node-operations.ts)
├── FunctionModelNodeMigration (lib/infrastructure/migrations/function-model-node-migration.ts)
├── NodeLinksRepository (lib/infrastructure/repositories/node-links-repository.ts)
├── NodeMetadataRepository (lib/infrastructure/repositories/node-metadata-repository.ts)
└── UnifiedNodeRepository (lib/infrastructure/repositories/unified-node-repository.ts)

useFunctionModelNodes (lib/application/hooks/use-function-model-nodes.ts)
├── BaseNode (lib/domain/entities/base-node-types.ts)
├── FunctionModelNode (lib/domain/entities/function-model-node-types.ts)
└── NodeBehavior (lib/domain/entities/node-behavior-types.ts)
```

### Modal Components
```
FunctionModelModal (components/composites/function-model/function-model-modal.tsx)
└── FunctionModelSharedModal (components/composites/shared-feature-modal.tsx)

StageNodeModal (components/composites/stage-node-modal.tsx)
├── NodeLinkingTab (components/composites/function-model/node-linking-tab.tsx)
│   └── CreateNodeLinkDialog (components/composites/function-model/create-node-link-dialog.tsx)
└── NestedModelsTab (components/composites/function-model/nested-models-tab.tsx)
    └── CreateNestedModelDialog (components/composites/function-model/create-nested-model-dialog.tsx)
```

## Component Responsibilities and Relationships

### 1. **Page Components**

#### `FunctionModelListPage`
- **Location**: `app/(private)/dashboard/function-model/list/page.tsx`
- **Responsibility**: Main list view page for function models
- **Key Features**:
  - Manages list state and data fetching
  - Handles navigation to canvas
  - Provides floating "Create New Model" button
  - Integrates with `useFunctionModelList` hook
- **Props**: None (uses hooks for data management)
- **Children**: `FunctionModelList`

#### `FunctionModelCanvasPage`
- **Location**: `app/(private)/dashboard/function-model/[modelId]/page.tsx`
- **Responsibility**: Individual function model canvas page
- **Key Features**:
  - Loads specific function model by ID
  - Handles model editing and persistence
  - Manages canvas state and interactions
  - **CURRENT**: Uses legacy React Flow implementation
  - **FUTURE**: Will integrate with new node-based architecture
- **Props**: `params.modelId` (from Next.js dynamic routing)
- **Children**: `FunctionProcessDashboard` (legacy) or `FunctionProcessDashboardEnhanced` (new)

### 2. **Feature Components**

#### `FunctionProcessDashboard` (LEGACY - Currently Active)
- **Location**: `app/(private)/dashboard/function-model/components/function-process-dashboard.tsx`
- **Responsibility**: Main canvas component for function model editing
- **Key Features**:
  - React Flow canvas integration
  - Inline name/description editing
  - Back to list navigation
  - Floating action buttons
  - Cross-feature linking sidebar
  - Node creation and editing
  - Real-time visual feedback
- **Props**:
  ```typescript
  interface FunctionProcessDashboardProps {
    functionModel?: FunctionModel
  }
  ```
- **Children**: `FlowNodes`, `SaveLoadPanel`, `CrossFeatureLinkingPanel`

#### `FunctionProcessDashboardEnhanced` (NEW - Partially Implemented)
- **Location**: `app/(private)/dashboard/function-model/components/function-process-dashboard-enhanced.tsx`
- **Responsibility**: Enhanced canvas component with node-based architecture
- **Key Features**:
  - React Flow canvas integration
  - Inline name/description editing
  - Back to list navigation
  - Floating action buttons
  - Cross-feature linking sidebar
  - **NEW**: Node-based architecture integration
  - **NEW**: Migration layer for backward compatibility
  - **NEW**: Enhanced node management with behavior system
- **Props**:
  ```typescript
  interface FunctionProcessDashboardProps {
    functionModel?: FunctionModel
    migrationState?: MigrationState
    onMigrationComplete?: (result: MigrationResult) => void
  }
  ```
- **Children**: `FlowNodes`, `SaveLoadPanel`, `CrossFeatureLinkingPanel`

#### `FlowNodes` (LEGACY - Currently Active)
- **Location**: `app/(private)/dashboard/function-model/components/flow-nodes.tsx`
- **Responsibility**: React Flow node definitions and rendering
- **Key Features**:
  - Custom node types (StageNode, ActionTableNode, IoNode, FunctionModelContainerNode)
  - Visual indicators for linked entities
  - Node interaction handling
  - Drag-and-drop functionality
  - Node editing and deletion
- **Props**: React Flow node props
- **Children**: Various node type components

### 3. **New Node-Based Architecture Components**

#### `useFunctionModelNodes` (NEW - Partially Implemented)
- **Location**: `lib/application/hooks/use-function-model-nodes.ts`
- **Responsibility**: Comprehensive state management for function model nodes
- **Key Features**:
  - Node CRUD operations with auto-save
  - Node metadata management
  - Cross-feature link management
  - Node behavior configuration
  - Toast notifications for user feedback
  - Statistics and analytics
  - Bulk operations
- **State**:
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
  ```
- **Actions**:
  ```typescript
  interface FunctionModelNodesActions {
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

#### `useFunctionModelPersistence` (LEGACY - Currently Active)
- **Location**: `lib/application/hooks/use-function-model-persistence.ts`
- **Responsibility**: Legacy function model persistence and state management
- **Key Features**:
  - Model loading and saving
  - Auto-save functionality
  - Version control
  - Cross-feature linking
  - Error handling
- **State**:
  ```typescript
  interface FunctionModelPersistenceState {
    model: FunctionModel | null
    loading: boolean
    error: string | null
    autoSave: boolean
    saveInterval: number
  }
  ```
- **Actions**:
  ```typescript
  interface FunctionModelPersistenceActions {
    loadModel: (options?: LoadOptions) => Promise<FunctionModel>
    saveModel: (options?: SaveOptions) => Promise<FunctionModel>
    updateModel: (updates: Partial<FunctionModel>) => void
    clearError: () => void
    setAutoSave: (enabled: boolean) => void
    setSaveInterval: (interval: number) => void
  }
  ```

### 4. **Repository Components**

#### `FunctionModelRepository` (LEGACY + NEW)
- **Location**: `lib/infrastructure/repositories/function-model-repository.ts`
- **Responsibility**: Hybrid repository supporting both legacy and new architectures
- **Key Features**:
  - Legacy function model CRUD operations
  - New node-based operations
  - Migration support
  - Statistics and analytics
- **Methods**:
  ```typescript
  // Legacy operations
  async create(model: Omit<FunctionModel, 'modelId' | 'createdAt' | 'updatedAt' | 'lastSavedAt'>): Promise<FunctionModel>
  async getById(modelId: string): Promise<FunctionModel | null>
  async update(modelId: string, updates: Partial<FunctionModel>): Promise<FunctionModel>
  async delete(modelId: string): Promise<void>
  
  // New node-based operations
  async getFunctionModelNodes(modelId: string): Promise<FunctionModelNode[]>
  async createFunctionModelNode(node: Omit<FunctionModelNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<FunctionModelNode>
  async updateFunctionModelNode(modelId: string, nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode>
  async deleteFunctionModelNode(modelId: string, nodeId: string): Promise<void>
  async getNodeStatistics(modelId: string): Promise<any>
  ```

#### `NodeLinksRepository` (NEW - Partially Implemented)
- **Location**: `lib/infrastructure/repositories/node-links-repository.ts`
- **Responsibility**: Cross-feature node link management
- **Key Features**:
  - CRUD operations for node links
  - Cross-feature link queries
  - Link strength and context management
  - Link analytics and statistics
- **Methods**:
  ```typescript
  async createNodeLink(link: Omit<NodeLinkRecord, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<NodeLinkRecord>
  async getNodeLinks(featureType: string, entityId: string, nodeId?: string): Promise<NodeLinkRecord[]>
  async deleteNodeLink(linkId: string): Promise<void>
  ```

#### `NodeMetadataRepository` (NEW - Partially Implemented)
- **Location**: `lib/infrastructure/repositories/node-metadata-repository.ts`
- **Responsibility**: Unified node metadata management
- **Key Features**:
  - CRUD operations for node metadata
  - Vector embedding management
  - Search keyword indexing
  - AI agent configuration
- **Methods**:
  ```typescript
  async createMetadata(metadata: Omit<NodeMetadataRecord, 'metadataId' | 'createdAt' | 'updatedAt'>): Promise<NodeMetadataRecord>
  async getMetadataByEntity(featureType: string, entityId: string): Promise<NodeMetadataRecord[]>
  async updateMetadata(metadataId: string, updates: Partial<NodeMetadataRecord>): Promise<NodeMetadataRecord>
  async updateVisualProperties(metadataId: string, visualProperties: Record<string, any>): Promise<void>
  ```

### 5. **Domain Entity Components**

#### `FunctionModel` (LEGACY - Currently Active)
- **Location**: `lib/domain/entities/function-model-types.ts`
- **Responsibility**: Legacy function model data structure
- **Key Features**:
  - React Flow compatible data structure
  - Version control and metadata
  - Cross-feature relationships
  - Export/import capabilities
- **Interface**:
  ```typescript
  interface FunctionModel {
    modelId: string
    name: string
    description: string
    version: string
    status: 'draft' | 'published' | 'archived'
    nodesData: Node[]
    edgesData: Edge[]
    viewportData: Viewport
    tags: string[]
    relationships: NodeRelationship[]
    metadata: FunctionModelMetadata
    permissions: FunctionModelPermissions
    versionHistory: VersionEntry[]
    currentVersion: string
    createdAt: Date
    updatedAt: Date
    lastSavedAt: Date
  }
  ```

#### `BaseNode` (NEW - Partially Implemented)
- **Location**: `lib/domain/entities/unified-node-types.ts`
- **Responsibility**: Foundation interface for all nodes across features
- **Key Features**:
  - Unified node interface
  - Visual properties management
  - Metadata system
  - Status management
- **Interface**:
  ```typescript
  interface BaseNode {
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
  ```

#### `FunctionModelNode` (NEW - Partially Implemented)
- **Location**: `lib/domain/entities/function-model-node-types.ts`
- **Responsibility**: Function model specific node implementation
- **Key Features**:
  - Extends BaseNode with function model specific properties
  - Process behavior configuration
  - Business logic integration (RACI, SLA, KPIs)
  - Function model data management
- **Interface**:
  ```typescript
  interface FunctionModelNode extends BaseNode {
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
  ```

## Component Data Contracts

### Legacy Data Structure (Currently Active)
```typescript
interface FunctionModel {
  modelId: string
  name: string
  description: string
  version: string
  status: 'draft' | 'published' | 'archived'
  nodesData: Node[] // React Flow compatible
  edgesData: Edge[] // React Flow compatible
  viewportData: Viewport
  tags: string[]
  relationships: NodeRelationship[]
  metadata: FunctionModelMetadata
  permissions: FunctionModelPermissions
  versionHistory: VersionEntry[]
  currentVersion: string
  createdAt: Date
  updatedAt: Date
  lastSavedAt: Date
}
```

### New Node-Based Architecture Data Structures (Partially Implemented)

#### Base Node Data Structure
```typescript
interface BaseNode {
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

interface NodeMetadata {
  feature: string
  version: string
  tags: string[]
  aiAgent?: AIAgentConfig
  vectorEmbedding?: number[]
  graphProperties?: Record<string, any>
  // Feature-specific data
  functionModel?: FunctionModelData
  eventStorm?: EventStormData
  spindle?: SpindleData
  knowledgeBase?: KnowledgeBaseData
}
```

#### Function Model Node Data Structure
```typescript
interface FunctionModelNode extends BaseNode {
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
```

#### Node Link Data Structure
```typescript
interface NodeLinkRecord {
  linkId: string
  sourceFeature: string
  sourceEntityId: string
  sourceNodeId?: string
  targetFeature: string
  targetEntityId: string
  targetNodeId?: string
  linkType: string
  linkStrength: number
  linkContext: Record<string, any>
  visualProperties: Record<string, any>
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}
```

#### Node Metadata Record Data Structure
```typescript
interface NodeMetadataRecord {
  metadataId: string
  featureType: string
  entityId: string
  nodeId: string
  nodeType: string
  positionX: number
  positionY: number
  vectorEmbedding?: number[]
  searchKeywords: string[]
  aiAgentConfig?: AIAgentConfig
  visualProperties: Record<string, any>
  createdAt: Date
  updatedAt: Date
}
```

## Reusable vs Feature-Specific Components

### Reusable Components
- **`BaseNode`**: Used across all features as the foundation node interface
- **`NodeBehavior`**: Reusable behavior system for different node types
- **`NodeLinksRepository`**: Reusable cross-feature link management
- **`NodeMetadataRepository`**: Reusable metadata management
- **`UnifiedNodeOperations`**: Reusable node operations facade

### Feature-Specific Components
- **`FunctionModel`**: Specific to legacy function model feature
- **`FunctionModelNode`**: Specific to function model feature
- **`useFunctionModelPersistence`**: Specific to legacy function model persistence
- **`useFunctionModelNodes`**: Specific to function model node management
- **`FunctionModelNodeMigration`**: Specific to function model migration
- **`FunctionProcessDashboard`**: Specific to function model canvas
- **`FlowNodes`**: Specific to React Flow integration

## Component State Management

### Legacy State Management (Currently Active)
- **Local State**: Form inputs, UI state, temporary data
- **Application State**: Function model data via `useFunctionModelPersistence`
- **Global State**: User authentication, application settings

### New State Management (Partially Implemented)
- **Local State**: Form inputs and user interactions
- **Application State**: Function model node data via `useFunctionModelNodes`
- **Global State**: User authentication, application settings, unified node store

## Component Testing Strategy

### Unit Testing
- Individual component rendering
- Props validation and default values
- Event handling and callbacks
- Component-specific logic
- Migration layer functionality

### Integration Testing
- Component composition and relationships
- Data flow between components
- Hook integration and state management
- Cross-feature interactions
- Migration process validation

### End-to-End Testing
- Complete user workflows
- Canvas interactions and persistence
- Migration from old to new architecture
- Cross-feature linking workflows
- Node behavior execution

## Performance Considerations

### Component Optimization
- React.memo for expensive components
- useMemo for computed values
- useCallback for event handlers
- Lazy loading for large components
- Migration layer optimization

### Data Optimization
- Debounced search and filtering
- Pagination for large lists
- Virtual scrolling for long lists
- Efficient re-rendering strategies
- Node metadata caching

### Bundle Optimization
- Code splitting by feature
- Tree shaking for unused components
- Dynamic imports for heavy components
- Optimized image and asset loading
- Migration layer code splitting

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

This component documentation provides a comprehensive view of the Function Model feature's current component architecture with both the legacy React Flow implementation and the new node-based system, enabling both human developers and AI agents to understand the implementation details and relationships. 