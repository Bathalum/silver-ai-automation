# Function Model Feature - Components Documentation

## Complete File and Folder Structure

```
app/(private)/dashboard/function-model/
├── components/
│   ├── flow-nodes.css
│   ├── flow-nodes.tsx
│   ├── function-process-dashboard.tsx (ACTIVE - Main Canvas)
│   ├── function-process-dashboard-enhanced.tsx (NEW - Partially Implemented)
│   ├── floating-toolbar.tsx
│   ├── modal-stack.tsx
│   └── persistence-sidebar.tsx
├── list/
│   └── page.tsx
├── [modelId]/
│   └── page.tsx
└── page.tsx

components/composites/function-model/
├── connection-debug-panel.tsx
├── cross-feature-linking-panel.tsx
├── function-model-card.tsx
├── function-model-dashboard.tsx
├── function-model-filters.tsx
├── function-model-list.tsx
├── function-model-modal.tsx
├── function-model-table-row.tsx
├── load-model-dialog.tsx
├── node-behavior-panel.tsx
├── node-canvas.tsx
├── node-details-panel.tsx
├── node-type-indicator.tsx
├── save-model-dialog.tsx
├── status-indicator.tsx
└── unified-operations-panel.tsx

lib/
├── application/
│   ├── hooks/
│   │   ├── use-function-model-nodes.ts (ACTIVE - Node Management)
│   │   ├── use-function-model-version-control.ts (ACTIVE - Version Control)
│   │   └── use-cross-feature-linking.ts (ACTIVE - Cross-Feature Links)
│   └── use-cases/
│       ├── function-model-use-cases.ts (ACTIVE - Business Logic)
│       └── function-model-version-control.ts (ACTIVE - Version Control)
├── domain/
│   └── entities/
│       ├── function-model-node-types.ts (ACTIVE - Core Types)
│       ├── function-model-connection-rules.ts (ACTIVE - Business Rules)
│       ├── unified-node-types.ts (ACTIVE - Base Types)
│       ├── cross-feature-link-types.ts (ACTIVE - Link Types)
│       └── version-control-types.ts (ACTIVE - Version Types)
├── infrastructure/
│   ├── repositories/
│   │   ├── function-model-repository.ts (ACTIVE - Data Access)
│   │   ├── node-relationship-repository.ts (ACTIVE - Relationships)
│   │   ├── node-metadata-repository.ts (ACTIVE - Metadata)
│   │   └── unified-node-repository.ts (ACTIVE - Unified Operations)
│   └── migrations/
│       └── function-model-node-migration.ts (ACTIVE - Migration Logic)
└── stores/
    └── unified-node-store.ts (ACTIVE - Global State)
```

## Component Hierarchy

### Active Implementation (Currently Used)
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
    │   ├── StageNode
    │   ├── ActionTableNode
    │   ├── IONode
    │   └── FunctionModelContainerNode
    ├── SaveModelDialog (components/composites/function-model/save-model-dialog.tsx)
    ├── LoadModelDialog (components/composites/function-model/load-model-dialog.tsx)
    ├── CrossFeatureLinkingPanel (components/composites/function-model/cross-feature-linking-panel.tsx)
    ├── NodeBehaviorPanel (components/composites/function-model/node-behavior-panel.tsx)
    └── UnifiedOperationsPanel (components/composites/function-model/unified-operations-panel.tsx)
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
  - **ACTIVE**: Uses node-based architecture with React Flow
  - **FUTURE**: Will integrate with enhanced dashboard
- **Props**: `params.modelId` (from Next.js dynamic routing)
- **Children**: `FunctionProcessDashboard`

### 2. **Feature Components**

#### `FunctionProcessDashboard` (ACTIVE - Main Canvas)
- **Location**: `app/(private)/dashboard/function-model/components/function-process-dashboard.tsx`
- **Responsibility**: Main canvas component for function model editing
- **Key Features**:
  - React Flow canvas integration with node-based architecture
  - Inline name/description editing
  - Back to list navigation
  - Floating action buttons
  - Cross-feature linking sidebar
  - Node creation and editing with validation
  - Real-time visual feedback
  - Version control integration
  - Connection validation with business rules
- **Props**:
  ```typescript
  interface FunctionProcessDashboardProps {
    modelId?: string
    functionModelNodes?: FunctionModelNode[]
  }
  ```
- **Children**: `FlowNodes`, `SaveModelDialog`, `LoadModelDialog`, `CrossFeatureLinkingPanel`

#### `FunctionProcessDashboardEnhanced` (NEW - Partially Implemented)
- **Location**: `app/(private)/dashboard/function-model/components/function-process-dashboard-enhanced.tsx`
- **Responsibility**: Enhanced canvas component with advanced node-based architecture
- **Key Features**:
  - React Flow canvas integration
  - Inline name/description editing
  - Back to list navigation
  - Floating action buttons
  - Cross-feature linking sidebar
  - **NEW**: Advanced node-based architecture integration
  - **NEW**: Migration layer for backward compatibility
  - **NEW**: Enhanced node management with behavior system
- **Props**:
  ```typescript
  interface FunctionProcessDashboardProps {
    functionModel?: FunctionModelNode
    migrationState?: MigrationState
    onMigrationComplete?: (result: MigrationResult) => void
  }
  ```
- **Children**: `FlowNodes`, `SaveModelDialog`, `LoadModelDialog`, `CrossFeatureLinkingPanel`

#### `FlowNodes` (ACTIVE - React Flow Nodes)
- **Location**: `app/(private)/dashboard/function-model/components/flow-nodes.tsx`
- **Responsibility**: React Flow node definitions and rendering
- **Key Features**:
  - Custom node types (StageNode, ActionTableNode, IoNode, FunctionModelContainerNode)
  - Visual indicators for linked entities
  - Node interaction handling
  - Drag-and-drop functionality
  - Node editing and deletion
  - Cross-feature link visualization
  - Connection validation
- **Props**: React Flow node props
- **Children**: Various node type components

### 3. **Active Node-Based Architecture Components**

#### `useFunctionModelNodes` (ACTIVE - Node Management)
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
  - Connection validation
  - Modal stack management
- **State**:
  ```typescript
  interface FunctionModelNodesState {
    nodes: FunctionModelNode[]
    edges: Edge[]
    loading: boolean
    error: string | null
    modalStack: Array<{
      type: "function" | "stage" | "action" | "input" | "output"
      data: FunctionModelNode | Stage | ActionItem | DataPort
      context?: { previousModal?: string; stageId?: string }
    }>
    selectedNodes: FunctionModelNode[]
    hoveredNode: FunctionModelNode | null
    isEditingName: boolean
    isEditingDescription: boolean
  }
  ```
- **Actions**:
  ```typescript
  interface FunctionModelNodesActions {
    // Node operations
    createNode: (nodeType: string, name: string, position: Position, options?: any) => Promise<FunctionModelNode>
    updateNode: (nodeId: string, updates: Partial<FunctionModelNode>) => Promise<FunctionModelNode>
    deleteNode: (nodeId: string) => Promise<void>
    getNode: (nodeId: string) => FunctionModelNode | undefined
    
    // Connection operations
    createConnection: (sourceNodeId: string, targetNodeId: string, sourceHandle: string, targetHandle: string) => Promise<any>
    deleteConnection: (edgeId: string) => Promise<void>
    isValidConnection: (connection: Connection) => boolean
    
    // Search and filtering
    searchNodes: (searchTerm: string) => Promise<FunctionModelNode[]>
    getNodesByType: (nodeType: FunctionModelNode['nodeType']) => Promise<FunctionModelNode[]>
    getConnectedNodesForNode: (nodeId: string) => Promise<{ incoming: FunctionModelNode[], outgoing: FunctionModelNode[] }>
    
    // Modal management
    openModal: (type: string, data: any, context?: any) => void
    closeModal: () => void
    closeAllModals: () => void
    goBackToPreviousModal: () => void
    
    // Selection management
    selectNode: (node: FunctionModelNode) => void
    selectNodes: (nodesToSelect: FunctionModelNode[]) => void
    clearSelection: () => void
    
    // State management
    loadNodes: () => Promise<void>
    clearError: () => void
  }
  ```

#### `useFunctionModelVersionControl` (ACTIVE - Version Control)
- **Location**: `lib/application/hooks/use-function-model-version-control.ts`
- **Responsibility**: Version control state management for function models
- **Key Features**:
  - Version creation and management
  - Version loading and restoration
  - Change tracking and history
  - Version comparison
  - Rollback capabilities
- **State**:
  ```typescript
  interface FunctionModelVersionControlState {
    versions: VersionEntry[]
    currentVersion: VersionEntry | null
    loading: boolean
    error: string | null
  }
  ```
- **Actions**:
  ```typescript
  interface FunctionModelVersionControlActions {
    loadVersions: () => Promise<void>
    createVersion: (nodes: FunctionModelNode[], edges: Edge[], changeSummary: string, createdBy?: string) => Promise<VersionEntry>
    loadVersion: (version: string) => Promise<any>
    loadLatestVersion: () => Promise<any>
    deleteVersion: (version: string) => Promise<void>
    compareVersions: (version1: string, version2: string) => Promise<any>
    clearError: () => void
  }
  ```

### 4. **Repository Components**

#### `FunctionModelRepository` (ACTIVE - Data Access)
- **Location**: `lib/infrastructure/repositories/function-model-repository.ts`
- **Responsibility**: Hybrid repository supporting both legacy and new architectures
- **Key Features**:
  - Node-based operations for new architecture
  - Version control operations
  - Cross-feature link management
  - Statistics and analytics
  - Bulk operations
- **Methods**:
  ```typescript
  // Node-based operations
  async createFunctionModelNode(node: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<FunctionModelNode>
  async getFunctionModelNodes(modelId: string): Promise<FunctionModelNode[]>
  async getFunctionModelNodeById(modelId: string, nodeId: string): Promise<FunctionModelNode | null>
  async updateFunctionModelNode(nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode>
  async deleteFunctionModelNode(nodeId: string): Promise<void>
  
  // Search and filtering
  async getNodesByType(modelId: string, nodeType: FunctionModelNode['nodeType']): Promise<FunctionModelNode[]>
  async searchNodes(modelId: string, query: string): Promise<FunctionModelNode[]>
  async getNodesWithDependencies(modelId: string): Promise<FunctionModelNode[]>
  async getNodesByExecutionType(modelId: string, executionType: string): Promise<FunctionModelNode[]>
  
  // Version control
  async getVersionHistory(modelId: string): Promise<any[]>
  async getVersionById(modelId: string, version: string): Promise<FunctionModelNode | null>
  async getLatestVersion(modelId: string): Promise<FunctionModelNode | null>
  async saveVersion(modelId: string, versionEntry: any): Promise<void>
  
  // Cross-feature linking
  async createCrossFeatureLink(sourceFeature: string, sourceId: string, sourceNodeId: string | null, targetFeature: string, targetId: string, targetNodeId: string | null, linkType: string, context?: Record<string, any>): Promise<any>
  async getCrossFeatureLinks(sourceId: string, sourceFeature: string): Promise<any[]>
  async getNodeLinks(modelId: string, nodeId: string): Promise<any[]>
  async updateCrossFeatureLinkContext(linkId: string, context: Record<string, any>): Promise<void>
  async deleteCrossFeatureLink(linkId: string): Promise<void>
  
  // Statistics and analytics
  async getNodeStatistics(modelId: string): Promise<any>
  
  // Bulk operations
  async bulkCreateNodes(nodes: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>[]): Promise<FunctionModelNode[]>
  async bulkUpdateNodesById(updates: Array<{ nodeId: string; updates: Partial<FunctionModelNode> }>): Promise<void>
  async bulkDeleteNodes(nodeIds: string[]): Promise<void>
  ```

#### `SupabaseNodeRelationshipRepository` (ACTIVE - Relationships)
- **Location**: `lib/infrastructure/repositories/node-relationship-repository.ts`
- **Responsibility**: Cross-feature node relationship management
- **Key Features**:
  - CRUD operations for node relationships
  - Cross-feature relationship queries
  - Relationship strength and context management
  - Relationship analytics and statistics
- **Methods**:
  ```typescript
  async createNodeRelationship(sourceNodeId: string, targetNodeId: string, sourceHandle: string, targetHandle: string, modelId: string): Promise<FunctionModelNodeRelationship>
  async getNodeRelationships(modelId: string): Promise<FunctionModelNodeRelationship[]>
  async deleteNodeRelationship(relationshipId: string): Promise<void>
  ```

### 5. **Domain Entity Components**

#### `FunctionModelNode` (ACTIVE - Core Type)
- **Location**: `lib/domain/entities/function-model-node-types.ts`
- **Responsibility**: Function model specific node implementation
- **Key Features**:
  - Extends BaseNode with function model specific properties
  - Process behavior configuration
  - Business logic integration (RACI, SLA, KPIs)
  - Function model data management
  - React Flow integration
- **Interface**:
  ```typescript
  interface FunctionModelNode extends BaseNode {
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

#### `FunctionModelConnectionRules` (ACTIVE - Business Rules)
- **Location**: `lib/domain/entities/function-model-connection-rules.ts`
- **Responsibility**: Business logic for node connections and relationships
- **Key Features**:
  - Connection validation rules
  - Relationship type determination
  - Valid handle combinations
  - Connection validation messages
- **Interface**:
  ```typescript
  interface ConnectionRule {
    sourceHandle: string
    targetHandle: string
    sourceNodeTypes: string[]
    targetNodeTypes: string[]
    relationshipType: 'parent-child' | 'sibling'
    validation?: (sourceNode: FunctionModelNode, targetNode: FunctionModelNode) => boolean
  }
  ```

## Component Data Contracts

### Active Node-Based Architecture Data Structures

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
  searchKeywords: string[]
  crossFeatureLinks: string[]
  aiAgent?: AIAgentConfig
  vectorEmbedding?: number[]
  graphProperties?: Record<string, any>
}
```

#### Function Model Node Data Structure
```typescript
interface FunctionModelNode extends BaseNode {
  type: 'function-model'
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainerNode'
  modelId: string
  
  functionModelData: {
    stage?: Stage
    action?: ActionItem
    io?: DataPort
    container?: FunctionModelContainer
  }
  
  businessLogic: {
    sla?: number
    kpis?: string[]
    complexity?: 'simple' | 'moderate' | 'complex'
    estimatedDuration?: number
  }
  
  processBehavior: {
    executionType: 'sequential' | 'parallel' | 'conditional'
    dependencies?: string[]
    triggers?: string[]
  }
  
  reactFlowData: {
    parentNode?: string
    extent?: 'parent' | [number, number, number, number]
    draggable?: boolean
    selectable?: boolean
    deletable?: boolean
    width?: number
    height?: number
  }
  
  relationships: NodeRelationship[]
}
```

#### Node Relationship Data Structure
```typescript
interface FunctionModelNodeRelationship extends NodeRelationship {
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

#### Version Control Data Structure
```typescript
interface VersionEntry {
  version: string
  timestamp: Date
  author: string
  changes: ChangeDescription[]
  snapshot: FunctionModelSnapshot
  isPublished: boolean
}

interface FunctionModelSnapshot {
  modelId: string
  version: string
  nodes: FunctionModelNode[]
  edges: any[]
  viewportData: any
  metadata: any
  name?: string
  description?: string
  status?: string
  processType?: string
  complexityLevel?: string
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
- **`FunctionModelConnectionRules`**: Specific to function model business rules

## Component State Management

### Active State Management
- **Local State**: Form inputs and user interactions
- **Application State**: Function model node data via `useFunctionModelNodes`
- **Version Control State**: Version history via `useFunctionModelVersionControl`
- **Global State**: User authentication, application settings, unified node store

## Component Testing Strategy

### Unit Testing
- Individual component rendering
- Props validation and default values
- Event handling and callbacks
- Component-specific logic
- Migration layer functionality
- Connection validation rules

### Integration Testing
- Component composition and relationships
- Data flow between components
- Hook integration and state management
- Cross-feature interactions
- Migration process validation
- Version control workflows

### End-to-End Testing
- Complete user workflows
- Canvas interactions and persistence
- Migration from old to new architecture
- Cross-feature linking workflows
- Node behavior execution
- Version control operations

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

This component documentation provides a comprehensive view of the Function Model feature's current component architecture with both the active node-based implementation and the planned enhancements, enabling both human developers and AI agents to understand the implementation details and relationships. 