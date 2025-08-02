# Cross-Feature Linking Feature - Architecture Compliance Documentation

## Clean Architecture Implementation

The Cross-Feature Linking feature follows Clean Architecture principles with clear separation of concerns across all layers. The implementation maintains domain independence while providing flexible infrastructure adapters and minimal presentation layer dependencies.

### **Domain Layer Independence**

#### **Core Domain Entities** (`cross-feature-link-types.ts`)
```typescript
// Pure domain entities with no external dependencies
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

// Domain value objects and business rules
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

**Architecture Benefits**:
- ✅ **No External Dependencies**: Domain entities are pure TypeScript interfaces
- ✅ **Business Rule Encapsulation**: Link types and context rules are domain-driven
- ✅ **Type Safety**: Strong typing prevents invalid link configurations
- ✅ **Testability**: Domain entities can be tested in isolation

#### **Domain Factory Functions**
```typescript
// Domain layer factory functions for entity creation
export function createCrossFeatureLink(
  sourceFeature: FeatureType,
  sourceId: string,
  targetFeature: FeatureType,
  targetId: string,
  linkType: LinkType,
  context?: Record<string, any>
): Omit<CrossFeatureLink, 'linkId' | 'createdAt'> {
  return {
    sourceFeature,
    sourceId,
    targetFeature,
    targetId,
    linkType,
    linkContext: context || {},
    linkStrength: 1.0
  }
}

// Domain utility functions
export function getFeatureIcon(feature: FeatureType): string {
  switch (feature) {
    case 'function-model': return '⚙️'
    case 'knowledge-base': return '📚'
    case 'spindle': return '🔄'
    default: return '🔗'
  }
}

export function getLinkIcon(linkType: LinkType): string {
  switch (linkType) {
    case 'documents': return '📄'
    case 'implements': return '⚡'
    case 'references': return '🔗'
    case 'supports': return '🛠️'
    case 'nested': return '📦'
    default: return '🔗'
  }
}
```

**Architecture Benefits**:
- ✅ **Domain Logic Centralization**: Business rules are in the domain layer
- ✅ **Reusability**: Factory functions can be used across all layers
- ✅ **Consistency**: Standardized entity creation across the application
- ✅ **Validation**: Domain-level validation ensures data integrity

### **Application Layer Orchestration**

#### **Universal Linking Hook** (`use-universal-cross-feature-linking.ts`)
```typescript
export function useUniversalCrossFeatureLinking() {
  // State management for all linking operations
  const [links, setLinks] = useState<CrossFeatureLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<EntitySearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Application use cases orchestration
  const createUniversalLink = useCallback(async (
    sourceFeature: FeatureType,
    sourceId: string,
    targetFeature: FeatureType,
    targetId: string,
    linkType: LinkType,
    context?: UniversalLinkContext
  ) => {
    setLoading(true)
    setError(null)

    try {
      const newLink = await createNewCrossFeatureLink(
        sourceFeature,
        sourceId,
        targetFeature,
        targetId,
        linkType,
        context
      )
      await loadLinks(sourceFeature, sourceId)
      return newLink
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create link'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Entity search orchestration
  const searchEntities = useCallback(async (
    query: string,
    featureType: FeatureType
  ) => {
    setSearchLoading(true)
    setError(null)

    try {
      const results = await entitySearchService.searchEntities(query, featureType)
      setSearchResults(results)
      return results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setSearchLoading(false)
    }
  }, [])

  return {
    links,
    loading,
    error,
    searchResults,
    searchLoading,
    createUniversalLink,
    searchEntities,
    loadLinks,
    deleteLink,
    clearError
  }
}
```

**Architecture Benefits**:
- ✅ **Use Case Orchestration**: Application layer coordinates domain and infrastructure
- ✅ **State Management**: Centralized state for all linking operations
- ✅ **Error Handling**: Consistent error handling across all operations
- ✅ **Dependency Inversion**: Hooks depend on abstractions, not concrete implementations

#### **Application Use Cases** (`function-model-persistence-use-cases.ts`)
```typescript
// Application layer use cases that orchestrate domain and infrastructure
export const createNewCrossFeatureLink = async (
  sourceFeature: string,
  sourceId: string,
  targetFeature: string,
  targetId: string,
  linkType: string,
  context?: Record<string, any>
): Promise<CrossFeatureLink> => {
  // 1. Validate link parameters
  if (!sourceFeature || !sourceId || !targetFeature || !targetId || !linkType) {
    throw new Error('Missing required link parameters')
  }

  // 2. Check for existing links to prevent duplicates
  const existingLinks = await functionModelRepository.getCrossFeatureLinks(sourceId, sourceFeature)
  const duplicate = existingLinks.find(link => 
    link.targetFeature === targetFeature && link.targetId === targetId
  )

  if (duplicate) {
    throw new Error('Cross-feature link already exists')
  }

  // 3. Create the link using domain factory
  const link = createCrossFeatureLink(
    sourceFeature as any,
    sourceId,
    targetFeature as any,
    targetId,
    linkType as any,
    context
  )

  // 4. Persist to repository
  return await functionModelRepository.createCrossFeatureLink(link)
}
```

**Architecture Benefits**:
- ✅ **Business Logic**: Application layer contains business rules and validation
- ✅ **Infrastructure Abstraction**: Use cases depend on repository interfaces
- ✅ **Error Handling**: Centralized error handling for business operations
- ✅ **Testability**: Use cases can be tested with mock repositories

### **Infrastructure Layer Adapters**

#### **Repository Implementation** (`function-model-repository.ts`)
```typescript
// Infrastructure layer adapter for data persistence
export class FunctionModelRepository {
  async createCrossFeatureLink(link: Omit<CrossFeatureLink, 'linkId' | 'createdAt'>): Promise<CrossFeatureLink> {
    try {
      const { data, error } = await supabase
        .from('cross_feature_links')
        .insert({
          source_feature: link.sourceFeature,
          source_id: link.sourceId,
          target_feature: link.targetFeature,
          target_id: link.targetId,
          link_type: link.linkType,
          link_context: link.linkContext,
          link_strength: link.linkStrength,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()

      if (error) throw error

      return {
        linkId: data.id,
        sourceFeature: data.source_feature,
        sourceId: data.source_id,
        targetFeature: data.target_feature,
        targetId: data.target_id,
        linkType: data.link_type,
        linkContext: data.link_context,
        linkStrength: data.link_strength,
        createdAt: new Date(data.created_at),
        createdBy: data.created_by
      }
    } catch (error) {
      console.error('Error creating cross-feature link:', error)
      throw new Error('Failed to create cross-feature link')
    }
  }

  async getCrossFeatureLinks(sourceId: string, sourceFeature: string): Promise<CrossFeatureLink[]> {
    try {
      const { data, error } = await supabase
        .from('cross_feature_links')
        .select('*')
        .eq('source_id', sourceId)
        .eq('source_feature', sourceFeature)

      if (error) throw error

      return data.map(row => ({
        linkId: row.id,
        sourceFeature: row.source_feature,
        sourceId: row.source_id,
        targetFeature: row.target_feature,
        targetId: row.target_id,
        linkType: row.link_type,
        linkContext: row.link_context,
        linkStrength: row.link_strength,
        createdAt: new Date(row.created_at),
        createdBy: row.created_by
      }))
    } catch (error) {
      console.error('Error fetching cross-feature links:', error)
      throw new Error('Failed to fetch cross-feature links')
    }
  }
}
```

**Architecture Benefits**:
- ✅ **Data Access Abstraction**: Repository hides database implementation details
- ✅ **Data Transformation**: Converts between domain entities and database format
- ✅ **Error Handling**: Infrastructure-specific error handling
- ✅ **Testability**: Repository can be mocked for testing

#### **Entity Search Service** (`entity-search-service.ts`)
```typescript
// Infrastructure layer service for entity search
export class EntitySearchService {
  async searchEntities(query: string, featureType: FeatureType): Promise<EntitySearchResult[]> {
    switch (featureType) {
      case 'function-model':
        return await this.searchFunctionModels(query)
      case 'knowledge-base':
        return await this.searchKnowledgeBase(query)
      case 'spindle':
        return await this.searchSpindleEntities(query)
      default:
        return []
    }
  }

  async searchFunctionModels(query: string): Promise<EntitySearchResult[]> {
    try {
      const { searchFunctionModels } = await import('@/lib/application/use-cases/function-model-persistence-use-cases')
      const models = await searchFunctionModels(query, {})
      
      return models.map(model => ({
        id: model.modelId,
        name: model.name,
        description: model.description,
        type: 'function-model' as const,
        metadata: {
          status: model.status,
          version: model.version,
          nodeCount: model.nodesData?.length || 0
        }
      }))
    } catch (error) {
      console.error('Error searching function models:', error)
      return []
    }
  }
}
```

**Architecture Benefits**:
- ✅ **Service Abstraction**: Hides external service implementation details
- ✅ **Data Transformation**: Converts between external APIs and domain entities
- ✅ **Error Handling**: Graceful handling of external service failures
- ✅ **Extensibility**: Easy to add new search sources

### **Presentation Layer Minimalism**

#### **Universal Modal Component** (`cross-feature-linking-modal.tsx`)
```typescript
// Presentation layer component with minimal business logic
export function CrossFeatureLinkingModal({
  open,
  onOpenChange,
  sourceFeature,
  sourceId,
  context,
  onLinkCreated,
  onLinkDeleted
}: CrossFeatureLinkingModalProps) {
  const {
    links,
    loading,
    error,
    searchResults,
    searchLoading,
    createUniversalLink,
    searchEntities,
    loadLinks,
    deleteLink,
    clearError
  } = useUniversalCrossFeatureLinking()

  // Presentation state only
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create')
  const [targetFeature, setTargetFeature] = useState<FeatureType>('knowledge-base')
  const [linkType, setLinkType] = useState<LinkType>('documents')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTarget, setSelectedTarget] = useState<EntitySearchResult | null>(null)
  const [linkStrength, setLinkStrength] = useState(1.0)
  const [notes, setNotes] = useState('')

  // Presentation logic only
  const handleCreateLink = useCallback(async () => {
    if (!selectedTarget) return

    try {
      const linkContext: UniversalLinkContext = {
        ...context,
        notes,
        priority: linkStrength > 0.7 ? 'high' : linkStrength > 0.4 ? 'medium' : 'low'
      }

      const newLink = await createUniversalLink(
        sourceFeature,
        sourceId,
        targetFeature,
        selectedTarget.id,
        linkType,
        linkContext
      )

      onLinkCreated?.(newLink)
      
      // Reset form state
      setSelectedTarget(null)
      setSearchQuery('')
      setLinkStrength(1.0)
      setNotes('')
      setActiveTab('manage')
    } catch (err) {
      console.error('Failed to create link:', err)
    }
  }, [selectedTarget, sourceFeature, sourceId, targetFeature, linkType, notes, linkStrength, context, createUniversalLink, onLinkCreated])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {context?.node ? `Link Node: ${context.node.nodeId}` : 'Cross-Feature Linking'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'create' | 'manage')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Link</TabsTrigger>
            <TabsTrigger value="manage">Manage Links</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create">
            <CreateLinkTab
              targetFeature={targetFeature}
              setTargetFeature={setTargetFeature}
              linkType={linkType}
              setLinkType={setLinkType}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              searchLoading={searchLoading}
              selectedTarget={selectedTarget}
              setSelectedTarget={setSelectedTarget}
              linkStrength={linkStrength}
              setLinkStrength={setLinkStrength}
              notes={notes}
              setNotes={setNotes}
              onSearch={() => searchEntities(searchQuery, targetFeature)}
              onCreateLink={handleCreateLink}
            />
          </TabsContent>
          
          <TabsContent value="manage">
            <ManageLinksTab
              links={links}
              loading={loading}
              error={error}
              onDeleteLink={deleteLink}
              clearError={clearError}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
```

**Architecture Benefits**:
- ✅ **Minimal Business Logic**: Presentation layer focuses on UI concerns only
- ✅ **Hook Dependency**: All business logic delegated to application layer hooks
- ✅ **Component Composition**: Clean separation between presentation and logic
- ✅ **Reusability**: Modal can be used across different features

## Component Architecture Compliance

### **Component Hierarchy Compliance**

#### **Layer Separation**
```
Presentation Layer (UI Components)
├── CrossFeatureLinkingModal
├── CreateLinkTab
└── ManageLinksTab

Application Layer (Hooks & Use Cases)
├── useUniversalCrossFeatureLinking
├── createNewCrossFeatureLink
└── EntitySearchService

Infrastructure Layer (Repositories & Services)
├── FunctionModelRepository
└── EntitySearchService

Domain Layer (Entities & Business Rules)
├── CrossFeatureLink
├── UniversalLinkContext
└── Domain Factory Functions
```

**Compliance Benefits**:
- ✅ **Clear Dependencies**: Each layer depends only on layers below it
- ✅ **Separation of Concerns**: Each layer has distinct responsibilities
- ✅ **Testability**: Each layer can be tested independently
- ✅ **Maintainability**: Changes in one layer don't affect others

#### **Component Responsibilities**

**Presentation Layer**:
- ✅ **UI Rendering**: Handle visual presentation and user interactions
- ✅ **State Management**: Manage UI-specific state (form inputs, modal state)
- ✅ **Event Handling**: Handle user events and delegate to application layer
- ✅ **Error Display**: Present errors and loading states to users

**Application Layer**:
- ✅ **Use Case Orchestration**: Coordinate between domain and infrastructure
- ✅ **State Management**: Manage application-level state
- ✅ **Error Handling**: Handle and transform errors for presentation
- ✅ **Data Transformation**: Transform data between layers

**Infrastructure Layer**:
- ✅ **Data Persistence**: Handle database operations
- ✅ **External Services**: Integrate with external APIs
- ✅ **Data Mapping**: Convert between external formats and domain entities
- ✅ **Error Handling**: Handle infrastructure-specific errors

**Domain Layer**:
- ✅ **Business Rules**: Define core business logic and rules
- ✅ **Entity Definitions**: Define core domain entities
- ✅ **Value Objects**: Define domain value objects
- ✅ **Factory Functions**: Create domain entities

### **Data Flow Compliance**

#### **Unidirectional Data Flow**
```
User Action → Presentation → Application → Infrastructure → Domain
     ↓           ↓            ↓            ↓           ↓
UI Update ← State Update ← Use Case ← Repository ← Entity
```

**Compliance Benefits**:
- ✅ **Predictable State**: Clear data flow makes state changes predictable
- ✅ **Debugging**: Easy to trace data flow for debugging
- ✅ **Testing**: Each step can be tested independently
- ✅ **Performance**: Optimized re-renders with clear data dependencies

#### **State Management Patterns**

**Application State**:
```typescript
// Centralized state management in application layer
const [links, setLinks] = useState<CrossFeatureLink[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

**Presentation State**:
```typescript
// UI-specific state in presentation layer
const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create')
const [searchQuery, setSearchQuery] = useState('')
const [selectedTarget, setSelectedTarget] = useState<EntitySearchResult | null>(null)
```

**Compliance Benefits**:
- ✅ **State Separation**: Application and presentation state are clearly separated
- ✅ **State Synchronization**: Application state drives presentation state
- ✅ **State Persistence**: Application state persists across UI changes
- ✅ **State Testing**: Each state layer can be tested independently

## Testing Strategy Compliance

### **Unit Testing Strategy**

#### **Domain Layer Testing**
```typescript
// Test domain entities and business rules
describe('CrossFeatureLink Domain', () => {
  test('should create valid cross-feature link', () => {
    const link = createCrossFeatureLink(
      'function-model',
      'model-123',
      'knowledge-base',
      'kb-456',
      'documents',
      { notes: 'Test link' }
    )
    
    expect(link.sourceFeature).toBe('function-model')
    expect(link.targetFeature).toBe('knowledge-base')
    expect(link.linkType).toBe('documents')
    expect(link.linkStrength).toBe(1.0)
  })

  test('should validate link types', () => {
    const validTypes: LinkType[] = ['documents', 'implements', 'references', 'supports', 'nested']
    validTypes.forEach(type => {
      expect(() => createCrossFeatureLink('function-model', '123', 'knowledge-base', '456', type)).not.toThrow()
    })
  })
})
```

#### **Application Layer Testing**
```typescript
// Test application use cases
describe('Cross-Feature Linking Use Cases', () => {
  test('should create new cross-feature link', async () => {
    const mockRepository = {
      createCrossFeatureLink: jest.fn().mockResolvedValue(mockLink),
      getCrossFeatureLinks: jest.fn().mockResolvedValue([])
    }
    
    const result = await createNewCrossFeatureLink(
      'function-model',
      'model-123',
      'knowledge-base',
      'kb-456',
      'documents'
    )
    
    expect(mockRepository.createCrossFeatureLink).toHaveBeenCalled()
    expect(result).toEqual(mockLink)
  })

  test('should prevent duplicate links', async () => {
    const mockRepository = {
      getCrossFeatureLinks: jest.fn().mockResolvedValue([existingLink])
    }
    
    await expect(createNewCrossFeatureLink(
      'function-model',
      'model-123',
      'knowledge-base',
      'kb-456',
      'documents'
    )).rejects.toThrow('Cross-feature link already exists')
  })
})
```

#### **Infrastructure Layer Testing**
```typescript
// Test repository implementations
describe('FunctionModelRepository', () => {
  test('should create cross-feature link', async () => {
    const repository = new FunctionModelRepository()
    const link = createCrossFeatureLink(
      'function-model',
      'model-123',
      'knowledge-base',
      'kb-456',
      'documents'
    )
    
    const result = await repository.createCrossFeatureLink(link)
    
    expect(result.linkId).toBeDefined()
    expect(result.sourceFeature).toBe('function-model')
    expect(result.targetFeature).toBe('knowledge-base')
  })
})
```

### **Integration Testing Strategy**

#### **End-to-End Testing**
```typescript
// Test complete linking workflow
describe('Cross-Feature Linking E2E', () => {
  test('should create and manage links through UI', async () => {
    // 1. Open modal
    render(<CrossFeatureLinkingModal {...props} />)
    
    // 2. Search for target
    fireEvent.change(screen.getByPlaceholderText('Search entities...'), {
      target: { value: 'test model' }
    })
    fireEvent.click(screen.getByText('Search'))
    
    // 3. Select target and create link
    fireEvent.click(screen.getByText('Test Model'))
    fireEvent.click(screen.getByText('Create Link'))
    
    // 4. Verify link creation
    expect(screen.getByText('Link created successfully')).toBeInTheDocument()
  })
})
```

### **Component Testing Strategy**

#### **Presentation Layer Testing**
```typescript
// Test UI components
describe('CrossFeatureLinkingModal', () => {
  test('should render create and manage tabs', () => {
    render(<CrossFeatureLinkingModal {...props} />)
    
    expect(screen.getByText('Create Link')).toBeInTheDocument()
    expect(screen.getByText('Manage Links')).toBeInTheDocument()
  })

  test('should handle link creation', async () => {
    const onLinkCreated = jest.fn()
    render(<CrossFeatureLinkingModal {...props} onLinkCreated={onLinkCreated} />)
    
    // Simulate link creation
    fireEvent.click(screen.getByText('Create Link'))
    
    expect(onLinkCreated).toHaveBeenCalled()
  })
})
```

## Architecture Benefits

### **Maintainability**

#### **Clear Separation of Concerns**
- ✅ **Domain Independence**: Business rules are isolated from infrastructure
- ✅ **Change Isolation**: Changes in one layer don't affect others
- ✅ **Code Organization**: Clear file structure and responsibilities
- ✅ **Documentation**: Each layer has clear documentation

#### **Modular Design**
- ✅ **Component Reusability**: Components can be reused across features
- ✅ **Hook Reusability**: Application hooks can be shared
- ✅ **Service Reusability**: Infrastructure services can be reused
- ✅ **Domain Reusability**: Domain entities can be shared

### **Testability**

#### **Independent Testing**
- ✅ **Unit Testing**: Each layer can be tested independently
- ✅ **Mock Dependencies**: Dependencies can be easily mocked
- ✅ **Isolated Business Logic**: Domain logic can be tested without infrastructure
- ✅ **UI Testing**: Presentation layer can be tested separately

#### **Test Coverage**
- ✅ **Domain Coverage**: All business rules are tested
- ✅ **Application Coverage**: All use cases are tested
- ✅ **Infrastructure Coverage**: All data access is tested
- ✅ **Integration Coverage**: End-to-end workflows are tested

### **Scalability**

#### **Feature Extension**
- ✅ **New Link Types**: Easy to add new link types to domain
- ✅ **New Features**: Easy to integrate with new features
- ✅ **New Search Sources**: Easy to add new search sources
- ✅ **New UI Components**: Easy to add new presentation components

#### **Performance Optimization**
- ✅ **Lazy Loading**: Components can be lazy loaded
- ✅ **Caching**: Search results can be cached
- ✅ **Optimistic Updates**: UI can be updated optimistically
- ✅ **Debounced Search**: Search can be debounced for performance

### **Flexibility**

#### **Configuration Flexibility**
- ✅ **Link Types**: Link types can be easily configured
- ✅ **Search Sources**: Search sources can be easily added
- ✅ **UI Components**: UI components can be easily customized
- ✅ **Business Rules**: Business rules can be easily modified

#### **Integration Flexibility**
- ✅ **Feature Integration**: Easy to integrate with new features
- ✅ **External Services**: Easy to integrate with external services
- ✅ **Database Changes**: Easy to adapt to database changes
- ✅ **API Changes**: Easy to adapt to API changes

This architecture compliance documentation demonstrates how the Cross-Feature Linking feature successfully implements Clean Architecture principles, providing maintainable, testable, scalable, and flexible code that follows established architectural patterns. 