# Cross-Feature Linking Feature - Components Documentation

## Complete File and Folder Structure

```
lib/
├── domain/
│   └── entities/
│       └── cross-feature-link-types.ts          # Core domain types and interfaces
├── application/
│   └── hooks/
│       └── use-universal-cross-feature-linking.ts # Universal linking hook
├── infrastructure/
│   └── repositories/
│       └── function-model-repository.ts         # Repository for link operations
└── services/
    └── entity-search-service.ts                 # Entity search service

components/
├── composites/
│   ├── cross-feature-linking-modal.tsx         # Main universal modal component
│   └── cross-feature-linking-modal/
│       ├── create-link-tab.tsx                 # Create link tab component
│       └── manage-links-tab.tsx                # Manage links tab component

app/
└── (private)/
    └── dashboard/
        └── function-model/
            └── components/
                └── function-process-dashboard.tsx # Integration with Function Model
```

## Component Hierarchy

### 1. **Universal Modal Component** (`cross-feature-linking-modal.tsx`)
- **Purpose**: Single entry point for all cross-feature linking operations
- **Responsibility**: Orchestrate linking operations, manage modal state, coordinate tabs
- **Children**: CreateLinkTab, ManageLinksTab
- **Props**: open, onOpenChange, sourceFeature, sourceId, context, onLinkCreated, onLinkDeleted

### 2. **Create Link Tab** (`create-link-tab.tsx`)
- **Purpose**: Interface for creating new cross-feature links
- **Responsibility**: Entity search, target selection, link configuration
- **Children**: None (leaf component)
- **Props**: targetFeature, setTargetFeature, linkType, setLinkType, searchQuery, setSearchQuery, searchResults, searchLoading, selectedTarget, setSelectedTarget, linkStrength, setLinkStrength, notes, setNotes, onSearch, onCreateLink

### 3. **Manage Links Tab** (`manage-links-tab.tsx`)
- **Purpose**: Interface for managing existing cross-feature links
- **Responsibility**: Display links, handle deletion, show link details
- **Children**: LinkCard (internal component)
- **Props**: links, loading, error, onDeleteLink, clearError

### 4. **Link Card** (internal component in manage-links-tab.tsx)
- **Purpose**: Display individual link information
- **Responsibility**: Show link details, provide delete action
- **Children**: None (leaf component)
- **Props**: link, onDelete

## Component Responsibilities and Relationships

### **CrossFeatureLinkingModal**
```typescript
interface CrossFeatureLinkingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceFeature: FeatureType
  sourceId: string
  context?: UniversalLinkContext
  onLinkCreated?: (link: CrossFeatureLink) => void
  onLinkDeleted?: (linkId: string) => void
}
```

**Responsibilities**:
- Manage modal open/close state
- Coordinate between create and manage tabs
- Handle link creation and deletion callbacks
- Provide context-aware linking (global, node-level, action-level)
- Load existing links on modal open
- Reset form state after link creation

**Key Features**:
- Context-aware title with node information
- Tab-based interface for create/manage operations
- Real-time link loading and management
- Error handling and loading states

### **CreateLinkTab**
```typescript
interface CreateLinkTabProps {
  targetFeature: FeatureType
  setTargetFeature: (feature: FeatureType) => void
  linkType: LinkType
  setLinkType: (type: LinkType) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResults: EntitySearchResult[]
  searchLoading: boolean
  selectedTarget: EntitySearchResult | null
  setSelectedTarget: (target: EntitySearchResult | null) => void
  linkStrength: number
  setLinkStrength: (strength: number) => void
  notes: string
  setNotes: (notes: string) => void
  onSearch: () => void
  onCreateLink: () => void
}
```

**Responsibilities**:
- Target feature selection (Function Model, Knowledge Base, Spindle)
- Link type selection (documents, implements, references, supports, nested)
- Entity search with real-time results
- Target entity selection and validation
- Link strength configuration (0.0 to 1.0)
- Notes and metadata input
- Link creation with validation

**Key Features**:
- Real-time entity search across all features
- Visual feature icons and link type indicators
- Interactive search results with selection
- Link strength slider with visual feedback
- Form validation and error handling

### **ManageLinksTab**
```typescript
interface ManageLinksTabProps {
  links: CrossFeatureLink[]
  loading: boolean
  error: string | null
  onDeleteLink: (linkId: string) => void
  clearError: () => void
}
```

**Responsibilities**:
- Display list of existing links
- Show link details and metadata
- Handle link deletion with confirmation
- Display loading and error states
- Provide empty state for no links

**Key Features**:
- Card-based link display with rich metadata
- Link type icons and strength indicators
- Delete functionality with visual feedback
- Error handling and loading states
- Empty state with helpful messaging

### **LinkCard** (internal component)
```typescript
interface LinkCardProps {
  link: CrossFeatureLink
  onDelete: () => void
}
```

**Responsibilities**:
- Display individual link information
- Show link type, strength, and metadata
- Provide delete action
- Display target entity information

**Key Features**:
- Link type icons and color coding
- Strength badge with numerical display
- Target entity information with feature icons
- Link context and metadata display
- Delete button with confirmation

## Component Data Contracts

### **Domain Types** (`cross-feature-link-types.ts`)
```typescript
export interface CrossFeatureLink {
  linkId: string
  sourceFeature: FeatureType
  sourceId: string
  targetFeature: FeatureType
  targetId: string
  linkType: LinkType
  linkContext: Record<string, any>
  linkStrength: number
  createdAt: Date
  createdBy?: string
}

export type FeatureType = 'function-model' | 'knowledge-base' | 'spindle'
export type LinkType = 'documents' | 'implements' | 'references' | 'supports' | 'nested'

export interface UniversalLinkContext {
  global?: {
    sourceFeature: FeatureType
    sourceId: string
  }
  node?: {
    nodeId: string
    nodeType: 'stageNode' | 'actionTableNode' | 'ioNode'
    position: { x: number; y: number }
    viewport: { x: number; y: number; zoom: number }
  }
  action?: {
    actionId: string
    actionType: string
    nodeId: string
  }
  notes?: string
  tags?: string[]
  priority?: 'low' | 'medium' | 'high'
}
```

### **Entity Search Types** (`entity-search-service.ts`)
```typescript
export interface EntitySearchResult {
  id: string
  name: string
  description?: string
  type: FeatureType
  metadata?: Record<string, any>
  relevance?: number
}
```

### **Hook Return Types** (`use-universal-cross-feature-linking.ts`)
```typescript
interface UniversalLinkingHookReturn {
  links: CrossFeatureLink[]
  loading: boolean
  error: string | null
  searchResults: EntitySearchResult[]
  searchLoading: boolean
  createUniversalLink: (sourceFeature: FeatureType, sourceId: string, targetFeature: FeatureType, targetId: string, linkType: LinkType, context?: UniversalLinkContext) => Promise<CrossFeatureLink>
  searchEntities: (query: string, featureType: FeatureType) => Promise<EntitySearchResult[]>
  loadLinks: (sourceFeature: FeatureType, sourceId: string, context?: UniversalLinkContext) => Promise<CrossFeatureLink[]>
  deleteLink: (linkId: string) => Promise<void>
  clearError: () => void
}
```

## Reusable vs Feature-Specific Components

### **Reusable Components**
- **Dialog**: Base modal component from shadcn/ui
- **Button**: Base button component with variants
- **Input**: Base input component for search
- **Select**: Base select component for feature/type selection
- **Slider**: Base slider component for strength configuration
- **Textarea**: Base textarea component for notes
- **Card**: Base card component for link display
- **Badge**: Base badge component for strength indicators
- **Alert**: Base alert component for error display

### **Feature-Specific Components**
- **CrossFeatureLinkingModal**: Universal modal for all linking operations
- **CreateLinkTab**: Specific interface for link creation
- **ManageLinksTab**: Specific interface for link management
- **LinkCard**: Specific display for individual links
- **EntitySearchService**: Feature-specific search service
- **UniversalLinkingHook**: Feature-specific state management

## Component State Management

### **Modal State Management**
```typescript
// Modal-level state
const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create')
const [targetFeature, setTargetFeature] = useState<FeatureType>('knowledge-base')
const [linkType, setLinkType] = useState<LinkType>('documents')
const [searchQuery, setSearchQuery] = useState('')
const [selectedTarget, setSelectedTarget] = useState<EntitySearchResult | null>(null)
const [linkStrength, setLinkStrength] = useState(1.0)
const [notes, setNotes] = useState('')
```

### **Hook State Management**
```typescript
// Hook-level state
const [links, setLinks] = useState<CrossFeatureLink[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [searchResults, setSearchResults] = useState<EntitySearchResult[]>([])
const [searchLoading, setSearchLoading] = useState(false)
```

### **State Flow Patterns**
1. **Link Creation Flow**: Form state → Validation → API call → Success/Error → State update
2. **Search Flow**: Query input → API call → Results → Selection → Form update
3. **Link Management Flow**: Load links → Display → Delete → State update
4. **Error Handling Flow**: Error occurrence → Display → Clear → Reset

## Component Testing Strategy

### **Unit Testing**
- **Hook Testing**: Test `useUniversalCrossFeatureLinking` hook with mock data
- **Component Testing**: Test individual components with mock props
- **Service Testing**: Test `EntitySearchService` with mock API responses

### **Integration Testing**
- **Modal Integration**: Test complete modal workflow from open to close
- **Search Integration**: Test search functionality with real entity data
- **Link Management**: Test create, read, delete operations

### **User Experience Testing**
- **Accessibility**: Test keyboard navigation and screen reader support
- **Performance**: Test with large datasets and concurrent operations
- **Error Scenarios**: Test error handling and recovery

## Performance Considerations

### **Search Optimization**
- Debounced search input to reduce API calls
- Cached search results for repeated queries
- Pagination for large result sets
- Relevance scoring for result ordering

### **Modal Performance**
- Lazy loading of modal content
- Optimized re-renders with React.memo
- Efficient state updates with useCallback
- Memory cleanup on modal close

### **Data Loading**
- Optimistic updates for better UX
- Background loading of existing links
- Efficient link filtering and sorting
- Minimal re-renders during state updates

### **Memory Management**
- Cleanup of search results on tab change
- Reset of form state after operations
- Proper cleanup of event listeners
- Efficient component unmounting

This component documentation provides a comprehensive understanding of the Cross-Feature Linking feature's component architecture, responsibilities, and implementation details. 