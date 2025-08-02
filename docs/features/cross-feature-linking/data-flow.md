# Cross-Feature Linking Feature - Data Flow Documentation

## Data Flow Overview

The Cross-Feature Linking feature implements a comprehensive data flow system that manages relationships between different features (Function Models, Knowledge Base, Spindle) through a centralized, context-aware architecture. The data flow spans from user interactions in the presentation layer through to persistent storage in the database, with clear separation of concerns across all Clean Architecture layers.

### **High-Level Data Flow**
1. **User Interaction**: Modal opens → Search entities → Select target → Configure link → Create/Manage
2. **Application Layer**: Hook orchestrates operations → Service calls → State management
3. **Infrastructure Layer**: Repository handles persistence → Database operations → Data retrieval
4. **Domain Layer**: Business rules validation → Type safety → Entity management

## Data Flow Diagrams

### **Link Creation Flow**
```
User Input → Modal State → Hook → Service → Repository → Database
     ↓           ↓         ↓       ↓         ↓          ↓
Search Query → Form State → Validation → API Call → Persistence → Success/Error
```

### **Link Management Flow**
```
Modal Open → Hook Load → Repository → Database → State Update → UI Render
     ↓          ↓          ↓          ↓          ↓           ↓
Context → Load Links → Query Data → Retrieve → Set State → Display Links
```

### **Entity Search Flow**
```
Search Input → Hook → Service → Feature APIs → Results → State → UI
     ↓          ↓       ↓          ↓          ↓       ↓      ↓
Query → Debounce → Search → Multiple Sources → Filter → Update → Display
```

## State Management Patterns

### **Application Layer State Management**

#### **Universal Linking Hook State**
```typescript
// Core state for all linking operations
const [links, setLinks] = useState<CrossFeatureLink[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [searchResults, setSearchResults] = useState<EntitySearchResult[]>([])
const [searchLoading, setSearchLoading] = useState(false)
```

**State Flow Patterns**:
- **Loading States**: Separate loading states for different operations
- **Error Handling**: Centralized error state with clear error messages
- **Optimistic Updates**: Immediate UI updates with background validation
- **State Synchronization**: Automatic state updates after successful operations

#### **Modal State Management**
```typescript
// Modal-specific state for user interactions
const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create')
const [targetFeature, setTargetFeature] = useState<FeatureType>('knowledge-base')
const [linkType, setLinkType] = useState<LinkType>('documents')
const [searchQuery, setSearchQuery] = useState('')
const [selectedTarget, setSelectedTarget] = useState<EntitySearchResult | null>(null)
const [linkStrength, setLinkStrength] = useState(1.0)
const [notes, setNotes] = useState('')
```

**State Flow Patterns**:
- **Form State**: Controlled inputs with validation
- **Tab State**: Active tab management for create/manage operations
- **Selection State**: Target entity selection with visual feedback
- **Configuration State**: Link strength and metadata configuration

### **State Synchronization Patterns**

#### **Link Creation State Flow**
```typescript
// 1. User initiates link creation
const handleCreateLink = useCallback(async () => {
  if (!selectedTarget) return

  try {
    // 2. Create link with context
    const linkContext: UniversalLinkContext = {
      ...context,
      notes,
      priority: linkStrength > 0.7 ? 'high' : linkStrength > 0.4 ? 'medium' : 'low'
    }

    // 3. Call hook method
    const newLink = await createUniversalLink(
      sourceFeature,
      sourceId,
      targetFeature,
      selectedTarget.id,
      linkType,
      linkContext
    )

    // 4. Update parent state
    onLinkCreated?.(newLink)
    
    // 5. Reset form state
    setSelectedTarget(null)
    setSearchQuery('')
    setLinkStrength(1.0)
    setNotes('')
    
    // 6. Switch to manage tab
    setActiveTab('manage')
  } catch (err) {
    console.error('Failed to create link:', err)
  }
}, [selectedTarget, sourceFeature, sourceId, targetFeature, linkType, notes, linkStrength, context, createUniversalLink, onLinkCreated])
```

#### **Link Loading State Flow**
```typescript
// 1. Modal opens, trigger link loading
useEffect(() => {
  if (open) {
    loadLinks(sourceFeature, sourceId, context)
  }
}, [open, sourceFeature, sourceId, context, loadLinks])

// 2. Hook handles loading with context awareness
const loadLinks = useCallback(async (
  sourceFeature: FeatureType,
  sourceId: string,
  context?: UniversalLinkContext
) => {
  setLoading(true)
  setError(null)

  try {
    let links: CrossFeatureLink[]
    
    if (context?.node) {
      // Node-level links
      links = await getNodeLinks(sourceId, context.node.nodeId)
    } else {
      // Global links
      links = await getCrossFeatureLinks(sourceId, sourceFeature)
    }
    
    setLinks(links)
    return links
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load links'
    setError(errorMessage)
    throw new Error(errorMessage)
  } finally {
    setLoading(false)
  }
}, [])
```

## API Interactions and Data Transformations

### **Repository Layer Interactions**

#### **Link Creation API Flow**
```typescript
// Application Layer → Repository Layer
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

#### **Link Retrieval API Flow**
```typescript
// Application Layer → Repository Layer
export const getCrossFeatureLinks = async (
  sourceId: string,
  sourceFeature: string
): Promise<CrossFeatureLink[]> => {
  return await functionModelRepository.getCrossFeatureLinks(sourceId, sourceFeature)
}

export const getNodeLinks = async (
  modelId: string,
  nodeId: string
): Promise<CrossFeatureLink[]> => {
  return await functionModelRepository.getNodeLinks(modelId, nodeId)
}
```

### **Entity Search Service Interactions**

#### **Search API Flow**
```typescript
// Service Layer → Feature APIs
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

### **Data Transformation Patterns**

#### **Domain Entity Creation**
```typescript
// Domain Layer factory functions
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
```

#### **Search Result Transformation**
```typescript
// Service Layer transformations
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
```

## Cross-Feature Data Sharing

### **Function Model Integration**
```typescript
// Integration in FunctionProcessDashboard
const [crossFeatureModalOpen, setCrossFeatureModalOpen] = useState(false)

// Modal integration
<CrossFeatureLinkingModal
  open={crossFeatureModalOpen}
  onOpenChange={setCrossFeatureModalOpen}
  sourceFeature="function-model"
  sourceId={functionModel.modelId}
  onLinkCreated={(link) => {
    console.log('Cross-feature link created:', link)
  }}
  onLinkDeleted={(linkId) => {
    console.log('Cross-feature link deleted:', linkId)
  }}
/>
```

### **Knowledge Base Integration**
```typescript
// Knowledge Base search integration
async searchKnowledgeBase(query: string): Promise<EntitySearchResult[]> {
  try {
    const { searchKnowledgeBase } = await import('@/lib/infrastructure/knowledge-base-service')
    const results = await searchKnowledgeBase(query)
    
    return results.map(item => ({
      id: item.id,
      name: item.title,
      description: item.summary,
      type: 'knowledge-base' as const,
      metadata: {
        category: item.category,
        status: item.status
      }
    }))
  } catch (error) {
    console.error('Error searching knowledge base:', error)
    return []
  }
}
```

### **Spindle Integration**
```typescript
// Spindle search integration (future implementation)
async searchSpindleEntities(query: string): Promise<EntitySearchResult[]> {
  try {
    // TODO: Implement spindle search when spindle feature is available
    return []
  } catch (error) {
    console.error('Error searching spindle entities:', error)
    return []
  }
}
```

## Error Handling and Loading States

### **Error Handling Patterns**

#### **Hook-Level Error Handling**
```typescript
// Universal error handling in hook
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
```

#### **Component-Level Error Display**
```typescript
// Error display in ManageLinksTab
{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      {error}
      <Button
        variant="link"
        size="sm"
        onClick={clearError}
        className="p-0 h-auto ml-2"
      >
        Dismiss
      </Button>
    </AlertDescription>
  </Alert>
)}
```

### **Loading State Patterns**

#### **Search Loading States**
```typescript
// Search loading with visual feedback
<Button onClick={onSearch} disabled={searchLoading}>
  {searchLoading ? (
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
  ) : (
    <Search className="h-4 w-4" />
  )}
</Button>
```

#### **Link Loading States**
```typescript
// Link loading with skeleton
{loading ? (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
  </div>
) : links.length === 0 ? (
  <div className="text-center py-8 text-muted-foreground">
    <Link className="h-12 w-12 mx-auto mb-4 opacity-50" />
    <p>No links created yet</p>
    <p className="text-sm">Create your first link in the Create Link tab</p>
  </div>
) : (
  // Link display
)}
```

## Data Flow Optimization

### **Search Optimization**
```typescript
// Debounced search to reduce API calls
const handleSearch = useCallback(async () => {
  if (!searchQuery.trim()) return
  await searchEntities(searchQuery, targetFeature)
}, [searchQuery, targetFeature, searchEntities])

// Enter key support for immediate search
<Input
  placeholder="Search entities..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  onKeyDown={(e) => e.key === 'Enter' && onSearch()}
/>
```

### **State Update Optimization**
```typescript
// Optimized state updates with useCallback
const handleCreateLink = useCallback(async () => {
  // ... link creation logic
}, [selectedTarget, sourceFeature, sourceId, targetFeature, linkType, notes, linkStrength, context, createUniversalLink, onLinkCreated])

// Efficient link deletion
const deleteLink = useCallback(async (linkId: string) => {
  setLoading(true)
  setError(null)

  try {
    await deleteCrossFeatureLink(linkId)
    setLinks(prev => prev.filter(link => link.linkId !== linkId))
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to delete link'
    setError(errorMessage)
    throw new Error(errorMessage)
  } finally {
    setLoading(false)
  }
}, [])
```

### **Memory Management**
```typescript
// Cleanup on modal close
useEffect(() => {
  if (open) {
    loadLinks(sourceFeature, sourceId, context)
  } else {
    // Reset state when modal closes
    setSearchResults([])
    setError(null)
  }
}, [open, sourceFeature, sourceId, context, loadLinks])
```

This data flow documentation provides a comprehensive understanding of how data moves through the Cross-Feature Linking feature, from user interactions to persistent storage, with clear patterns for state management, error handling, and optimization. 