# Centralized Cross-Feature Linking Implementation Plan

## Overview

This plan focuses on creating a **centralized, universal cross-feature linking system** that consolidates all linking functionality into a single, professional modal interface. The implementation will remove event-storm references and clean up the scattered current implementation to provide a unified, maintainable solution.

## Current State Analysis

### ✅ **Existing Infrastructure**
- ✅ **Database Schema**: Complete `cross_feature_links` table with node-level support
- ✅ **Domain Types**: Complete `CrossFeatureLink` types and interfaces
- ✅ **Repository Layer**: Complete cross-feature linking methods
- ✅ **Application Layer**: Complete use cases and hooks
- ✅ **UI Components**: Multiple scattered implementations

### ⚠️ **Current Problems**
1. **Scattered Implementation**: Cross-feature linking spread across 3+ components
2. **Inconsistent UX**: Different interfaces for global vs node-level linking
3. **Hard to Debug**: Multiple places to check for linking issues
4. **Event-Storm References**: Unnecessary complexity from event-storm feature
5. **Mock Data**: Search functionality uses mock data instead of real entities

### 🎯 **Target State**
- **Single Modal**: Universal cross-feature linking modal
- **Context-Aware**: Handles global, node-level, and action-level linking
- **Real Search**: Actual entity search instead of mock data
- **Clean Codebase**: Remove all scattered implementations
- **Professional UX**: Consistent, intuitive interface

## Implementation Strategy

### Phase 1: Core Infrastructure (Week 1)

#### 1.1 Update Domain Types
**Objective**: Remove event-storm references and clean up types

**Updated Cross-Feature Link Types**:
```typescript
// lib/domain/entities/cross-feature-link-types.ts

// Remove event-storm from FeatureType
export type FeatureType = 'function-model' | 'knowledge-base' | 'spindle'

// Enhanced link context for universal modal
export interface UniversalLinkContext {
  // Global linking
  global?: {
    sourceFeature: FeatureType
    sourceId: string
  }
  
  // Node-level linking
  node?: {
    nodeId: string
    nodeType: 'stageNode' | 'actionTableNode' | 'ioNode'
    position: { x: number; y: number }
    viewport: { x: number; y: number; zoom: number }
  }
  
  // Action-level linking
  action?: {
    actionId: string
    actionType: string
    nodeId: string
  }
  
  // General metadata
  notes?: string
  tags?: string[]
  priority?: 'low' | 'medium' | 'high'
}
```

#### 1.2 Create Universal Linking Hook
**Objective**: Single hook for all cross-feature linking operations

**Universal Linking Hook**:
```typescript
// lib/application/hooks/use-universal-cross-feature-linking.ts

export function useUniversalCrossFeatureLinking() {
  const [links, setLinks] = useState<CrossFeatureLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Universal link creation
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

  // Real entity search
  const searchEntities = useCallback(async (
    query: string,
    featureType: FeatureType
  ) => {
    setSearchLoading(true)
    setError(null)

    try {
      const results = await searchEntitiesByFeature(query, featureType)
      setSearchResults(results)
      return results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search entities'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setSearchLoading(false)
    }
  }, [])

  // Load links for any context
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

#### 1.3 Create Entity Search Service
**Objective**: Real entity search instead of mock data

**Entity Search Service**:
```typescript
// lib/services/entity-search-service.ts

export interface EntitySearchResult {
  id: string
  name: string
  description?: string
  type: FeatureType
  metadata?: Record<string, any>
  relevance?: number
}

export class EntitySearchService {
  // Search function models
  async searchFunctionModels(query: string): Promise<EntitySearchResult[]> {
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
  }

  // Search knowledge base
  async searchKnowledgeBase(query: string): Promise<EntitySearchResult[]> {
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
  }

  // Search spindle entities
  async searchSpindleEntities(query: string): Promise<EntitySearchResult[]> {
    // Implement spindle search
    return []
  }

  // Universal search
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
}
```

### Phase 2: Universal Modal Component (Week 2)

#### 2.1 Create Universal Cross-Feature Linking Modal
**Objective**: Single modal for all cross-feature linking operations

**Universal Modal Component**:
```typescript
// components/composites/cross-feature-linking-modal.tsx

interface CrossFeatureLinkingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceFeature: FeatureType
  sourceId: string
  context?: UniversalLinkContext
  onLinkCreated?: (link: CrossFeatureLink) => void
  onLinkDeleted?: (linkId: string) => void
}

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

  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create')
  const [targetFeature, setTargetFeature] = useState<FeatureType>('knowledge-base')
  const [linkType, setLinkType] = useState<LinkType>('documents')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTarget, setSelectedTarget] = useState<EntitySearchResult | null>(null)
  const [linkStrength, setLinkStrength] = useState(1.0)
  const [notes, setNotes] = useState('')

  // Load existing links on mount
  useEffect(() => {
    if (open) {
      loadLinks(sourceFeature, sourceId, context)
    }
  }, [open, sourceFeature, sourceId, context, loadLinks])

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    await searchEntities(searchQuery, targetFeature)
  }, [searchQuery, targetFeature, searchEntities])

  // Handle link creation
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
      
      // Reset form
      setSelectedTarget(null)
      setSearchQuery('')
      setLinkStrength(1.0)
      setNotes('')
      
      // Switch to manage tab
      setActiveTab('manage')
    } catch (err) {
      console.error('Failed to create link:', err)
    }
  }, [selectedTarget, sourceFeature, sourceId, targetFeature, linkType, notes, linkStrength, context, createUniversalLink, onLinkCreated])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Cross-Feature Linking
            {context?.node && (
              <Badge variant="secondary">
                Node: {context.node.nodeType}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 border-r p-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'create' | 'manage')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Create Link</TabsTrigger>
                <TabsTrigger value="manage">Manage Links</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Context Info */}
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Source</div>
              <div className="text-xs text-muted-foreground">
                {sourceFeature} ({sourceId})
              </div>
              {context?.node && (
                <div className="text-xs text-muted-foreground mt-1">
                  Node: {context.node.nodeId}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            {activeTab === 'create' && (
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
                onSearch={handleSearch}
                onCreateLink={handleCreateLink}
              />
            )}

            {activeTab === 'manage' && (
              <ManageLinksTab
                links={links}
                loading={loading}
                error={error}
                onDeleteLink={deleteLink}
                clearError={clearError}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

#### 2.2 Create Tab Components
**Objective**: Modular tab components for create and manage functionality

**Create Link Tab**:
```typescript
// components/composites/cross-feature-linking-modal/create-link-tab.tsx

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

export function CreateLinkTab({
  targetFeature,
  setTargetFeature,
  linkType,
  setLinkType,
  searchQuery,
  setSearchQuery,
  searchResults,
  searchLoading,
  selectedTarget,
  setSelectedTarget,
  linkStrength,
  setLinkStrength,
  notes,
  setNotes,
  onSearch,
  onCreateLink
}: CreateLinkTabProps) {
  return (
    <div className="space-y-6">
      {/* Target Feature Selection */}
      <div className="space-y-2">
        <Label>Target Feature</Label>
        <Select value={targetFeature} onValueChange={(value: FeatureType) => setTargetFeature(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="function-model">
              <div className="flex items-center gap-2">
                <span>📊</span>
                <span>Function Model</span>
              </div>
            </SelectItem>
            <SelectItem value="knowledge-base">
              <div className="flex items-center gap-2">
                <span>📚</span>
                <span>Knowledge Base</span>
              </div>
            </SelectItem>
            <SelectItem value="spindle">
              <div className="flex items-center gap-2">
                <span>⚡</span>
                <span>Spindle</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Link Type Selection */}
      <div className="space-y-2">
        <Label>Link Type</Label>
        <Select value={linkType} onValueChange={(value: LinkType) => setLinkType(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="documents">📄 Documents</SelectItem>
            <SelectItem value="implements">⚙️ Implements</SelectItem>
            <SelectItem value="references">🔗 References</SelectItem>
            <SelectItem value="supports">🛠️ Supports</SelectItem>
            <SelectItem value="nested">🔗 Nested</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Entity Search */}
      <div className="space-y-2">
        <Label>Search Target Entity</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
          <Button onClick={onSearch} disabled={searchLoading}>
            {searchLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <Label>Search Results</Label>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {searchResults.map((result) => (
              <Card
                key={result.id}
                className={`p-3 cursor-pointer hover:bg-muted ${
                  selectedTarget?.id === result.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedTarget(result)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getFeatureIcon(result.type)}</span>
                  <div className="flex-1">
                    <div className="font-medium">{result.name}</div>
                    {result.description && (
                      <div className="text-sm text-muted-foreground">{result.description}</div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Selected Target */}
      {selectedTarget && (
        <div className="space-y-2">
          <Label>Selected Target</Label>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getFeatureIcon(selectedTarget.type)}</span>
              <div className="flex-1">
                <div className="font-medium">{selectedTarget.name}</div>
                {selectedTarget.description && (
                  <div className="text-sm text-muted-foreground">{selectedTarget.description}</div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTarget(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Link Strength */}
      <div className="space-y-2">
        <Label>Link Strength: {linkStrength}</Label>
        <Slider
          value={[linkStrength]}
          onValueChange={(value) => setLinkStrength(value[0])}
          max={1}
          min={0}
          step={0.1}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Add notes about this link..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Create Button */}
      <Button
        onClick={onCreateLink}
        disabled={!selectedTarget}
        className="w-full"
      >
        Create Link
      </Button>
    </div>
  )
}
```

**Manage Links Tab**:
```typescript
// components/composites/cross-feature-linking-modal/manage-links-tab.tsx

interface ManageLinksTabProps {
  links: CrossFeatureLink[]
  loading: boolean
  error: string | null
  onDeleteLink: (linkId: string) => void
  clearError: () => void
}

export function ManageLinksTab({
  links,
  loading,
  error,
  onDeleteLink,
  clearError
}: ManageLinksTabProps) {
  return (
    <div className="space-y-4">
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
        <div className="space-y-3">
          {links.map((link) => (
            <LinkCard
              key={link.linkId}
              link={link}
              onDelete={() => onDeleteLink(link.linkId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

### Phase 3: Integration and Cleanup (Week 3)

#### 3.1 Replace Scattered Implementation
**Objective**: Remove old components and integrate universal modal

**Files to Delete**:
```
components/composites/function-model/cross-feature-linking-panel.tsx
components/composites/function-model/create-cross-feature-link-dialog.tsx
components/composites/function-model/node-linking-tab.tsx
components/composites/function-model/nested-models-tab.tsx
components/composites/function-model/create-node-link-dialog.tsx
components/composites/function-model/create-nested-model-dialog.tsx
```

**Update FunctionProcessDashboard**:
```typescript
// app/(private)/dashboard/function-model/components/function-process-dashboard.tsx

// Replace CrossFeatureLinkingPanel with universal modal
import { CrossFeatureLinkingModal } from '@/components/composites/cross-feature-linking-modal'

// Add modal state
const [crossFeatureModalOpen, setCrossFeatureModalOpen] = useState(false)

// Replace sidebar panel with button
<Button
  onClick={() => setCrossFeatureModalOpen(true)}
  className="w-full"
  variant="outline"
>
  <Link className="h-4 w-4 mr-2" />
  Manage Cross-Feature Links
</Button>

// Add universal modal
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

#### 3.2 Add Quick Access Buttons
**Objective**: Add linking buttons throughout the UI

**Node-Level Quick Access**:
```typescript
// components/composites/function-model/flow-nodes.tsx

// Add link button to StageNode
export function StageNode(props: NodeProps) {
  const { id, data, isConnectable } = props
  const [linkModalOpen, setLinkModalOpen] = useState(false)

  return (
    <div className="relative">
      {/* Existing node content */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-4 shadow-sm">
        {/* ... existing content */}
        
        {/* Quick link button */}
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setLinkModalOpen(true)}
        >
          <Link className="h-3 w-3" />
        </Button>
      </div>

      {/* Universal linking modal */}
      <CrossFeatureLinkingModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        sourceFeature="function-model"
        sourceId={data.modelId}
        context={{
          node: {
            nodeId: id,
            nodeType: 'stageNode',
            position: props.position,
            viewport: { x: 0, y: 0, zoom: 1 }
          }
        }}
      />
    </div>
  )
}
```

#### 3.3 Add Visual Link Indicators
**Objective**: Show visual indicators for linked entities

**Link Indicator Component**:
```typescript
// components/composites/cross-feature-linking-modal/link-indicator.tsx

interface LinkIndicatorProps {
  linkCount: number
  linkTypes: LinkType[]
  onClick?: () => void
}

export function LinkIndicator({ linkCount, linkTypes, onClick }: LinkIndicatorProps) {
  if (linkCount === 0) return null

  return (
    <div
      className="absolute -top-2 -right-2 flex gap-1 cursor-pointer"
      onClick={onClick}
    >
      {linkTypes.slice(0, 3).map((type, index) => (
        <div
          key={type}
          className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center"
          title={`${type} link`}
        >
          {getLinkIcon(type)}
        </div>
      ))}
      {linkCount > 3 && (
        <div className="w-4 h-4 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center">
          +{linkCount - 3}
        </div>
      )}
    </div>
  )
}
```

### Phase 4: Enhanced Features (Week 4)

#### 4.1 Link Suggestions
**Objective**: AI-powered link suggestions

**Link Suggestion Service**:
```typescript
// lib/services/link-suggestion-service.ts

export interface LinkSuggestion {
  targetId: string
  targetFeature: FeatureType
  linkType: LinkType
  confidence: number
  reason: string
}

export class LinkSuggestionService {
  async getSuggestions(
    sourceFeature: FeatureType,
    sourceId: string,
    context?: UniversalLinkContext
  ): Promise<LinkSuggestion[]> {
    // Implement AI-powered suggestions
    // This could use embeddings, similarity matching, etc.
    return []
  }
}
```

#### 4.2 Link Analytics
**Objective**: Track link usage and provide insights

**Link Analytics Component**:
```typescript
// components/composites/cross-feature-linking-modal/link-analytics.tsx

interface LinkAnalyticsProps {
  links: CrossFeatureLink[]
}

export function LinkAnalytics({ links }: LinkAnalyticsProps) {
  const analytics = useMemo(() => {
    const byType = links.reduce((acc, link) => {
      acc[link.linkType] = (acc[link.linkType] || 0) + 1
      return acc
    }, {} as Record<LinkType, number>)

    const byFeature = links.reduce((acc, link) => {
      acc[link.targetFeature] = (acc[link.targetFeature] || 0) + 1
      return acc
    }, {} as Record<FeatureType, number>)

    return { byType, byFeature }
  }, [links])

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Link Analytics</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By Type</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(analytics.byType).map(([type, count]) => (
              <div key={type} className="flex justify-between text-sm">
                <span>{type}</span>
                <span>{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By Feature</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(analytics.byFeature).map(([feature, count]) => (
              <div key={feature} className="flex justify-between text-sm">
                <span>{feature}</span>
                <span>{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

## Success Metrics

### Functional Metrics
- **Centralized Access**: Single modal for all cross-feature linking
- **Real Search**: Actual entity search instead of mock data
- **Context Awareness**: Proper handling of global, node-level, and action-level linking
- **Clean Codebase**: Removal of all scattered implementations
- **Professional UX**: Consistent, intuitive interface

### Technical Metrics
- **Performance**: <500ms response time for link operations
- **Scalability**: Support for 1000+ cross-feature relationships
- **Maintainability**: Single source of truth for all linking logic
- **Debugging**: Easy to trace and debug linking issues

## Risk Mitigation

### Technical Risks
1. **Migration Complexity**: Gradual replacement of old components
2. **Data Loss**: Ensure all existing links are preserved during migration
3. **Performance Issues**: Optimize search and link loading
4. **User Adoption**: Provide clear migration path and documentation

### User Experience Risks
1. **Learning Curve**: Provide clear documentation and onboarding
2. **Feature Discovery**: Add visual indicators and quick access buttons
3. **Error Handling**: Comprehensive error messages and recovery
4. **Accessibility**: Ensure modal is fully accessible

## Timeline and Milestones

### Week 1: Core Infrastructure
- [ ] Update domain types (remove event-storm references)
- [ ] Create universal linking hook
- [ ] Implement entity search service
- [ ] Create base modal structure

### Week 2: Universal Modal Component
- [ ] Create universal cross-feature linking modal
- [ ] Implement create link tab
- [ ] Implement manage links tab
- [ ] Add visual link indicators

### Week 3: Integration and Cleanup
- [ ] Replace scattered implementation
- [ ] Add quick access buttons
- [ ] Update FunctionProcessDashboard
- [ ] Remove old components

### Week 4: Enhanced Features
- [ ] Implement link suggestions
- [ ] Add link analytics
- [ ] Performance optimization
- [ ] Comprehensive testing

## Conclusion

This centralized cross-feature linking implementation will provide:

1. **Single Source of Truth**: All linking in one professional modal
2. **Context Awareness**: Handles global, node-level, and action-level linking
3. **Real Search**: Actual entity search instead of mock data
4. **Clean Codebase**: Removal of scattered implementations
5. **Professional UX**: Consistent, intuitive interface
6. **Easy Debugging**: Single component to check for issues

The implementation removes event-storm references as requested and provides a clean, maintainable solution that will serve as the foundation for your cross-feature linking value proposition. 