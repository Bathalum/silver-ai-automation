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
│   │   └── use-function-model-persistence.ts
│   └── use-cases/
│       └── function-model-persistence-use-cases.ts
├── domain/
│   └── entities/
│       ├── cross-feature-link-types.ts
│       ├── function-model-types.ts
│       └── version-control-types.ts
├── infrastructure/
│   └── repositories/
│       └── function-model-repository.ts
└── utils/
    └── performance-data.ts
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
- **Props**: `params.modelId` (from Next.js dynamic routing)
- **Children**: `FunctionProcessDashboard`

### 2. **Feature Components**

#### `FunctionProcessDashboard`
- **Location**: `app/(private)/dashboard/function-model/components/function-process-dashboard.tsx`
- **Responsibility**: Main canvas component for function model editing
- **Key Features**:
  - React Flow canvas integration
  - Inline name/description editing
  - Back to list navigation
  - Floating action buttons
- **Props**:
  ```typescript
  interface FunctionProcessDashboardProps {
    functionModel: FunctionModel
    onUpdateFunctionModel: (model: FunctionModel) => void
  }
  ```
- **Children**: `FlowNodes`, `SaveLoadPanel`, `CrossFeatureLinkingPanel`

#### `FlowNodes`
- **Location**: `app/(private)/dashboard/function-model/components/flow-nodes.tsx`
- **Responsibility**: React Flow node definitions and rendering
- **Key Features**:
  - Custom node types (StageNode, ActionTableNode, IoNode)
  - Visual indicators for linked entities
  - Node interaction handling
- **Props**: React Flow node props
- **Children**: Various node type components

### 3. **Composite Components**

#### `FunctionModelList`
- **Location**: `components/composites/function-model/function-model-list.tsx`
- **Responsibility**: Table-based list view for function models
- **Key Features**:
  - Table layout with search and filtering
  - Performance metrics display
  - Sorting and pagination
  - Empty state handling
- **Props**:
  ```typescript
  interface FunctionModelListProps {
    models: FunctionModel[]
    loading: boolean
    error: string | null
    onModelSelect: (modelId: string) => void
    onModelDelete: (modelId: string) => void
    onModelDuplicate: (modelId: string) => void
    onFiltersChange?: (filters: FunctionModelFilters) => void
    onSearchChange?: (query: string) => void
    filters?: FunctionModelFilters
    searchQuery?: string
  }
  ```
- **Children**: `FunctionModelTableRow`, `FunctionModelFilters`

#### `FunctionModelTableRow`
- **Location**: `components/composites/function-model/function-model-table-row.tsx`
- **Responsibility**: Individual table row for function model display
- **Key Features**:
  - Model information display
  - Node flow visualization
  - Performance metrics
  - Action dropdown menu
- **Props**:
  ```typescript
  interface FunctionModelTableRowProps {
    model: FunctionModel
    onEdit: (modelId: string) => void
    onDelete: (modelId: string) => void
    onDuplicate: (modelId: string) => void
    isAlternate?: boolean
  }
  ```
- **Children**: `NodeTypeIndicator`, `StatusIndicator`

#### `SaveLoadPanel`
- **Location**: `components/composites/function-model/save-load-panel.tsx`
- **Responsibility**: Save and load functionality for function models
- **Key Features**:
  - Save current model
  - Load existing models
  - Version control integration
  - Export/import functionality
- **Props**:
  ```typescript
  interface SaveLoadPanelProps {
    functionModel: FunctionModel
    onSave: (model: FunctionModel) => Promise<void>
    onLoad: (modelId: string) => Promise<void>
    onExport?: (format: string) => void
  }
  ```
- **Children**: `SaveModelDialog`, `LoadModelDialog`

### 4. **Base Components**

#### `NodeTypeIndicator`
- **Location**: `components/composites/function-model/node-type-indicator.tsx`
- **Responsibility**: Visual indicator for node types
- **Key Features**:
  - Color-coded icons for different node types
  - Tooltip with node type information
  - Consistent styling across the application
- **Props**:
  ```typescript
  interface NodeTypeIndicatorProps {
    type: string
    size?: 'sm' | 'md' | 'lg'
  }
  ```

#### `StatusIndicator`
- **Location**: `components/composites/function-model/status-indicator.tsx`
- **Responsibility**: Visual indicator for function model status
- **Key Features**:
  - Status-specific icons and colors
  - Consistent status display
  - Light theme color scheme
- **Props**:
  ```typescript
  interface StatusIndicatorProps {
    status: string
    showIcon?: boolean
  }
  ```

## Component Data Contracts

### Function Model Data Structure
```typescript
interface FunctionModel {
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
```

### Node Data Structure
```typescript
interface FunctionModelNode {
  id: string
  type: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
  position: { x: number; y: number }
  data: NodeData
  parentNode?: string
  extent?: 'parent' | [number, number, number, number]
  draggable?: boolean
  selectable?: boolean
  deletable?: boolean
  width?: number
  height?: number
  linkedEntities?: NodeLinkedEntity[]
}
```

### Cross-Feature Link Structure
```typescript
interface CrossFeatureLink {
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

## Reusable vs Feature-Specific Components

### Reusable Components
- **`NodeTypeIndicator`**: Used across function model list, canvas, and modals
- **`StatusIndicator`**: Used in list view and status displays
- **`FunctionModelModal`**: Reusable modal for function model details
- **`SaveLoadPanel`**: Reusable save/load functionality

### Feature-Specific Components
- **`FunctionModelList`**: Specific to function model list view
- **`FunctionModelTableRow`**: Specific to table-based list display
- **`FunctionProcessDashboard`**: Specific to canvas functionality
- **`FlowNodes`**: Specific to React Flow integration

## Component State Management

### Local State (Component Level)
- Form inputs and user interactions
- UI state (modals, dropdowns, loading states)
- Temporary data (unsaved changes)

### Application State (Hook Level)
- Function model data and persistence
- List filtering and search
- Cross-feature linking data
- Performance metrics

### Global State (Store Level)
- User authentication and permissions
- Application-wide settings
- Cross-feature navigation state

## Component Testing Strategy

### Unit Testing
- Individual component rendering
- Props validation and default values
- Event handling and callbacks
- Component-specific logic

### Integration Testing
- Component composition and relationships
- Data flow between components
- Hook integration and state management
- Cross-feature interactions

### End-to-End Testing
- Complete user workflows
- Canvas interactions and persistence
- List view operations
- Modal interactions and navigation

## Performance Considerations

### Component Optimization
- React.memo for expensive components
- useMemo for computed values
- useCallback for event handlers
- Lazy loading for large components

### Data Optimization
- Debounced search and filtering
- Pagination for large lists
- Virtual scrolling for long lists
- Efficient re-rendering strategies

### Bundle Optimization
- Code splitting by feature
- Tree shaking for unused components
- Dynamic imports for heavy components
- Optimized image and asset loading

This component documentation provides a comprehensive view of the Function Model feature's component architecture, enabling both human developers and AI agents to understand the implementation details and relationships. 