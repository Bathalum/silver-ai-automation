# Function Model Feature - Components Documentation

## Complete File and Folder Structure

```
app/(private)/dashboard/function-model/
├── components/
│   ├── flow-nodes.css
│   ├── flow-nodes.tsx
│   └── function-process-dashboard.tsx
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
│   │   ├── use-function-model-nodes.ts (NEW)
│   │   └── use-function-model-persistence.ts
│   └── use-cases/
│       └── function-model-persistence-use-cases.ts
├── domain/
│   └── entities/
│       ├── base-node-types.ts (NEW)
│       ├── cross-feature-link-types.ts
│       ├── function-model-node-types.ts (NEW)
│       ├── function-model-types.ts
│       ├── node-behavior-types.ts (NEW)
│       └── version-control-types.ts
├── infrastructure/
│   ├── migrations/
│   │   └── function-model-node-migration.ts (NEW)
│   └── repositories/
│       ├── function-model-repository.ts
│       ├── node-links-repository.ts (NEW)
│       ├── node-metadata-repository.ts (NEW)
│       └── unified-node-repository.ts (NEW)
├── stores/
│   └── unified-node-store.ts (NEW)
└── use-cases/
    └── unified-node-operations.ts (NEW)
```

## Component Hierarchy

### Page Components (Top Level)
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

### New Node-Based Architecture Components
```
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
  - Integrates with new node-based architecture
- **Props**: `params.modelId` (from Next.js dynamic routing)
- **Children**: `FunctionProcessDashboard`

### 2. **Feature Components**

#### `FunctionProcessDashboard` (Enhanced)
- **Location**: `app/(private)/dashboard/function-model/components/function-process-dashboard.tsx`
- **Responsibility**: Main canvas component for function model editing
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
  }
  ```
- **Children**: `FlowNodes`, `SaveLoadPanel`, `CrossFeatureLinkingPanel`

#### `FlowNodes` (Enhanced)
- **Location**: `app/(private)/dashboard/function-model/components/flow-nodes.tsx`
- **Responsibility**: React Flow node definitions and rendering
- **Key Features**:
  - Custom node types (StageNode, ActionTableNode, IoNode, FunctionModelContainerNode)
  - Visual indicators for linked entities
  - Node interaction handling
  - **NEW**: Node behavior visualization
  - **NEW**: Cross-feature link indicators
- **Props**: React Flow node props
- **Children**: Various node type components

### 3. **New Node-Based Architecture Components**

#### `useFunctionModelNodes` (NEW)
- **Location**: `lib/application/hooks/use-function-model-nodes.ts`
- **Responsibility**: Comprehensive state management for function model nodes
- **Key Features**:
  - Node CRUD operations with auto-save
  - Node metadata management
  - Cross-feature link management
  - Node behavior configuration
  - Toast notifications for user feedback
- **State**:
  ```typescript
  interface FunctionModelNodesState {
    nodes: FunctionModelNode[]
    links: NodeLinkRecord[]
    metadata: NodeMetadataRecord[]
    loading: boolean
    error: string | null
    lastSavedAt: Date | null
  }
  ```
- **Actions**:
  ```typescript
  interface FunctionModelNodesActions {
    createNode: (nodeType: string, name: string, position: Position, options?: any) => void
    updateNode: (nodeId: string, updates: Partial<FunctionModelNode>) => void
    deleteNode: (nodeId: string) => void
    createNodeLink: (sourceId: string, targetId: string, linkType: string) => void
    updateNodeLink: (linkId: string, updates: Partial<NodeLinkRecord>) => void
    deleteNodeLink: (linkId: string) => void
    saveNodes: () => Promise<void>
    loadNodes: () => Promise<void>
  }
  ```

#### `FunctionModelNodeMigration` (NEW)
- **Location**: `lib/infrastructure/migrations/function-model-node-migration.ts`
- **Responsibility**: Port and adapter for migrating existing function models to new architecture
- **Key Features**:
  - Converts old React Flow nodes to new domain entities
  - Preserves all existing functionality and data
  - Provides reverse migration for backward compatibility
  - Validates migration results
- **Methods**:
  ```typescript
  static migrateFunctionModel(model: FunctionModel, options?: MigrationOptions): MigrationResult
  static reverseMigration(nodes: FunctionModelNode[], links: NodeLinkRecord[], modelId: string): FunctionModel
  ```

#### `UnifiedNodeOperations` (NEW)
- **Location**: `lib/use-cases/unified-node-operations.ts`
- **Responsibility**: Facade for cross-feature node operations
- **Key Features**:
  - Abstracted node operations across all features
  - Cross-feature link management
  - Unified metadata operations
  - Node behavior execution
- **Interface**:
  ```typescript
  interface UnifiedNodeOperations {
    createNode(featureType: FeatureType, nodeType: string, data: any): Promise<BaseNode>
    updateNode(nodeId: string, updates: Partial<BaseNode>): Promise<BaseNode>
    deleteNode(nodeId: string): Promise<void>
    createNodeLink(sourceId: string, targetId: string, linkType: LinkType): Promise<NodeLinkRecord>
    getNodeLinks(nodeId: string): Promise<NodeLinkRecord[]>
    executeNodeBehavior(nodeId: string, behavior: NodeBehavior): Promise<ExecutionResult>
  }
  ```

### 4. **Repository Components**

#### `NodeLinksRepository` (NEW)
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
  async getNodeLinks(featureType: FeatureType, entityId: string, nodeId?: string): Promise<NodeLinkRecord[]>
  async updateNodeLink(linkId: string, updates: Partial<NodeLinkRecord>): Promise<NodeLinkRecord>
  async deleteNodeLink(linkId: string): Promise<void>
  ```

#### `NodeMetadataRepository` (NEW)
- **Location**: `lib/infrastructure/repositories/node-metadata-repository.ts`
- **Responsibility**: Unified node metadata management
- **Key Features**:
  - CRUD operations for node metadata
  - Vector embedding management
  - Search keyword indexing
  - AI agent configuration
- **Methods**:
  ```typescript
  async createNodeMetadata(metadata: Omit<NodeMetadataRecord, 'metadataId' | 'createdAt' | 'updatedAt'>): Promise<NodeMetadataRecord>
  async getNodeMetadata(nodeId: string): Promise<NodeMetadataRecord | null>
  async updateNodeMetadata(nodeId: string, updates: Partial<NodeMetadataRecord>): Promise<NodeMetadataRecord>
  async searchNodes(query: string, featureType?: FeatureType): Promise<NodeMetadataRecord[]>
  ```

### 5. **Domain Entity Components**

#### `BaseNode` (NEW)
- **Location**: `lib/domain/entities/base-node-types.ts`
- **Responsibility**: Foundation interface for all nodes across features
- **Key Features**:
  - Unified node interface
  - Visual properties management
  - Metadata system
  - Status management
- **Interface**:
  ```typescript
  interface BaseNode {
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
  ```

#### `FunctionModelNode` (NEW)
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

#### `NodeBehavior` (NEW)
- **Location**: `lib/domain/entities/node-behavior-types.ts`
- **Responsibility**: Node behavior abstraction system
- **Key Features**:
  - Abstract behavior classes for different node types
  - Validation and execution result interfaces
  - Behavior factory pattern
  - Cross-feature behavior compatibility
- **Classes**:
  ```typescript
  abstract class NodeBehavior {
    abstract validate(node: BaseNode): ValidationResult
    abstract execute(node: BaseNode, context: any): Promise<ExecutionResult>
  }
  
  class ProcessNodeBehavior extends NodeBehavior
  class ContentNodeBehavior extends NodeBehavior
  class IntegrationNodeBehavior extends NodeBehavior
  ```

## Component Data Contracts

### New Node-Based Architecture Data Structures

#### Base Node Data Structure
```typescript
interface BaseNode {
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

interface VisualProperties {
  color: string
  icon: string
  size: 'small' | 'medium' | 'large'
  style: Record<string, any>
  featureSpecific: Record<string, any>
}

interface NodeMetadata {
  tags: string[]
  searchKeywords: string[]
  crossFeatureLinks: CrossFeatureLinkMetadata[]
  aiAgent?: AIAgentConfig
  vectorEmbedding?: number[]
}

interface NodeStatus {
  status: 'active' | 'inactive' | 'error' | 'processing'
  lastExecuted?: Date
  executionCount: number
  errorCount: number
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
  sourceFeature: FeatureType
  sourceEntityId: string
  sourceNodeId?: string
  targetFeature: FeatureType
  targetEntityId: string
  targetNodeId?: string
  linkType: LinkType
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
  featureType: FeatureType
  entityId: string
  nodeId: string
  nodeType: string
  positionX: number
  positionY: number
  vectorEmbedding?: number[]
  searchKeywords: string[]
  aiAgentConfig?: AIAgentConfig
  visualProperties: VisualProperties
  createdAt: Date
  updatedAt: Date
}
```

### Legacy Data Structure (For Migration)
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
  metadata: FunctionModelMetadata
  permissions: FunctionModelPermissions
  versionHistory: VersionEntry[]
  currentVersion: string
  createdAt: Date
  updatedAt: Date
  lastSavedAt: Date
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
- **`FunctionModelNode`**: Specific to function model feature
- **`useFunctionModelNodes`**: Specific to function model node management
- **`FunctionModelNodeMigration`**: Specific to function model migration
- **`FunctionProcessDashboard`**: Specific to function model canvas
- **`FlowNodes`**: Specific to React Flow integration

## Component State Management

### Local State (Component Level)
- Form inputs and user interactions
- UI state (modals, dropdowns, loading states)
- Temporary data (unsaved changes)
- Migration state and progress

### Application State (Hook Level)
- Function model node data and persistence
- Node metadata and cross-feature links
- Node behavior configuration
- Auto-save functionality and intervals

### Global State (Store Level)
- User authentication and permissions
- Application-wide settings
- Cross-feature navigation state
- Unified node store for cross-feature operations

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

This component documentation provides a comprehensive view of the Function Model feature's enhanced component architecture with the new node-based system, enabling both human developers and AI agents to understand the implementation details and relationships. 