# Function Model Persistence Implementation Plan

## Overview

This plan focuses on implementing comprehensive persistence for Function Model entities, following Clean Architecture principles and the established component hierarchy. The implementation will support save/load operations, cross-feature linking, version control, node-level linking, and a list view interface while maintaining alignment with the separate table architecture for different features.

## Architecture Alignment

### Clean Architecture Principles
Following the high-level architecture context, this implementation will maintain clear separation between:
- **Domain Layer**: Core Function Model entities and business rules
- **Application Layer**: Use cases and persistence logic
- **Infrastructure Layer**: Database operations and external services
- **Presentation Layer**: UI components for save/load operations

### Component Architecture Integration
The implementation will follow the established component hierarchy:
- **Base Components**: Reusable UI elements for persistence operations
- **Composite Components**: Save/load panels, version management, list components, and node linking components
- **Feature Components**: Function Model specific persistence logic
- **Page Components**: Integration with existing dashboard components

### Database Architecture Decision
**Separate Tables for Each Feature**: Instead of a unified node system, we'll use feature-specific tables for better performance, clarity, and scalability:
- `function_models` - Function Model specific data
- `knowledge_base_sops` - Knowledge Base specific data  
- `spindle_entities` - Spindle specific data
- `cross_feature_links` - Cross-feature relationships

## Current State Analysis

### ✅ **Existing Infrastructure**
- ✅ **Database Schema**: All tables created and functional
  - `function_models` - Complete with nodes_data, edges_data, viewport_data
  - `function_model_versions` - Version control with snapshots
  - `cross_feature_links` - Cross-feature relationship support
- ✅ **Repository Layer**: Complete SupabaseFunctionModelRepository implementation
- ✅ **Application Layer**: All use cases implemented (save, load, version control)
- ✅ **UI Components**: Save/load panels, version dialogs, cross-feature linking
- ✅ **Integration**: Seamlessly integrated with existing FunctionProcessDashboard
- ✅ **Persistence**: Save/load functionality working perfectly
- ✅ **Version Control**: Version loading and management working
- ✅ **Global Cross-Feature Linking**: Working via sidebar panel

### ⚠️ **New Requirements**
- **List View Interface**: Need to create a list view for all function models
- **Node-Level Linking**: Implement linking functionality within node modals (currently missing)
- **Nested Function Models**: Support for function models that contain other function models as nodes
- **Routing Structure**: Separate list view and canvas view routes
- **Auto-load Functionality**: Load last saved version when clicking on a model

## Implementation Strategy

### Phase 1: Node-Level Linking Implementation (Week 1)

#### 1.1 Node-Level Linking Architecture
**Objective**: Implement linking functionality within node modals to enable cross-feature relationships at the node level

**Current Gap Analysis**:
- ✅ **Global linking**: Working via `CrossFeatureLinkingPanel` in sidebar
- ❌ **Node-level linking**: Node modals only have navigation tabs, no linking functionality
- ❌ **Action-level linking**: No linking within action table rows
- ❌ **Link visualization**: No visual indicators on nodes showing linked entities

**Linking Strategy**:
```typescript
// Enhanced node data structure for node-level linking
interface FunctionModelNode {
  id: string
  type: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
  position: { x: number; y: number }
  data: NodeData
  // ... existing properties
  
  // NEW: Node-level linking data
  linkedEntities?: NodeLinkedEntity[]
}

export interface NodeLinkedEntity {
  entityId: string
  entityType: 'function-model' | 'knowledge-base' | 'spindle'
  linkType: 'documents' | 'implements' | 'references' | 'supports' | 'nested'
  linkContext: Record<string, any>
  linkId: string // Reference to cross_feature_links table
}

export interface ActionItem {
  id: string
  name: string
  description: string
  type: "action" | "action-group"
  // NEW: Action-level linking
  linkedEntities?: NodeLinkedEntity[]
}
```

#### 1.2 Domain Layer Enhancements
**Objective**: Extend domain entities to support node-level linking

**Enhanced Cross-Feature Link Types**:
```typescript
// lib/domain/entities/cross-feature-link-types.ts
export type LinkType = 'documents' | 'implements' | 'references' | 'supports' | 'nested'

// NEW: Node-specific link context
export interface NodeLinkContext {
  nodeId: string
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode'
  actionId?: string // For action table nodes
  position: { x: number; y: number }
  viewport: { x: number; y: number; zoom: number }
}
```

#### 1.3 Infrastructure Layer Enhancements
**Objective**: Add repository methods for node-level linking

**Enhanced Repository Methods**:
```typescript
// lib/infrastructure/repositories/function-model-repository.ts
export interface FunctionModelRepository {
  // ... existing methods
  
  // NEW: Node-level linking methods
  createNodeLink(
    modelId: string,
    nodeId: string,
    targetFeature: string,
    targetId: string,
    linkType: string,
    context?: Record<string, any>
  ): Promise<CrossFeatureLink>
  
  getNodeLinks(modelId: string, nodeId: string): Promise<CrossFeatureLink[]>
  
  deleteNodeLink(linkId: string): Promise<void>
  
  // NEW: Nested function model methods
  getNestedFunctionModels(modelId: string): Promise<FunctionModel[]>
  
  linkFunctionModelToNode(
    parentModelId: string,
    nodeId: string,
    childModelId: string,
    context?: Record<string, any>
  ): Promise<CrossFeatureLink>
}
```

#### 1.4 Application Layer Enhancements
**Objective**: Create use cases and hooks for node-level linking

**New Use Cases**:
```typescript
// lib/application/use-cases/function-model-persistence-use-cases.ts

// NEW: Node-level linking use cases
export const createNodeLink = async (
  modelId: string,
  nodeId: string,
  targetFeature: string,
  targetId: string,
  linkType: string,
  context?: Record<string, any>
): Promise<CrossFeatureLink> => {
  // Validate link parameters
  validateNodeLink(modelId, nodeId, targetFeature, targetId, linkType)
  
  // Create the link
  const link = await functionModelRepository.createNodeLink(
    modelId,
    nodeId,
    targetFeature,
    targetId,
    linkType,
    context
  )
  
  return link
}

export const getNodeLinks = async (
  modelId: string,
  nodeId: string
): Promise<CrossFeatureLink[]> => {
  return await functionModelRepository.getNodeLinks(modelId, nodeId)
}

// NEW: Nested function model use cases
export const linkFunctionModelToNode = async (
  parentModelId: string,
  nodeId: string,
  childModelId: string,
  context?: Record<string, any>
): Promise<CrossFeatureLink> => {
  // Validate that child model exists
  const childModel = await functionModelRepository.getById(childModelId)
  if (!childModel) {
    throw new Error(`Function Model not found: ${childModelId}`)
  }
  
  // Create nested link
  const link = await functionModelRepository.linkFunctionModelToNode(
    parentModelId,
    nodeId,
    childModelId,
    context
  )
  
  return link
}
```

**Enhanced Hooks**:
```typescript
// lib/application/hooks/use-function-model-persistence.ts

// NEW: Node-level linking hook
export function useNodeLinking(modelId: string, nodeId: string) {
  const [links, setLinks] = useState<CrossFeatureLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const loadNodeLinks = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const nodeLinks = await getNodeLinks(modelId, nodeId)
      setLinks(nodeLinks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load node links')
    } finally {
      setLoading(false)
    }
  }, [modelId, nodeId])
  
  const createNodeLink = useCallback(async (
    targetFeature: string,
    targetId: string,
    linkType: string,
    context?: Record<string, any>
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      const newLink = await createNodeLink(modelId, nodeId, targetFeature, targetId, linkType, context)
      await loadNodeLinks() // Refresh links
      return newLink
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node link')
      throw err
    } finally {
      setLoading(false)
    }
  }, [modelId, nodeId, loadNodeLinks])
  
  return {
    links,
    loading,
    error,
    loadNodeLinks,
    createNodeLink
  }
}
```

#### 1.5 Presentation Layer Enhancements
**Objective**: Replace navigation tabs with linking functionality in node modals

**Enhanced Node Modals**:
```typescript
// components/composites/stage-node-modal.tsx
// Replace navigation tabs with linking functionality

export function StageNodeModal({ 
  isOpen, 
  onClose, 
  stage,
  modelId, // NEW: Pass modelId for linking
  // ... existing props
}: StageNodeModalProps) {
  const { links, loading, createNodeLink } = useNodeLinking(modelId, stage.id)
  
  // Replace navigation tabs with linking tabs
  const sidebarItems = [
    { id: "details", label: "Details", icon: FileText },
    { id: "links", label: "Links", icon: Link }, // NEW: Links tab
    { id: "nested-models", label: "Nested Models", icon: GitBranch }, // NEW: Nested models
  ]
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 border-r p-4">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSidebar(item.id)}
                className={`w-full text-left p-2 rounded ${
                  activeSidebar === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <item.icon className="w-4 h-4 inline mr-2" />
                {item.label}
              </button>
            ))}
          </div>
          
          {/* Main Content */}
          <div className="flex-1 p-6">
            {activeSidebar === "details" && (
              // ... existing details content
            )}
            
            {activeSidebar === "links" && (
              <NodeLinkingTab
                links={links}
                loading={loading}
                onCreateLink={createNodeLink}
                nodeType="stageNode"
                nodeId={stage.id}
              />
            )}
            
            {activeSidebar === "nested-models" && (
              <NestedModelsTab
                modelId={modelId}
                nodeId={stage.id}
                onCreateNestedLink={createNodeLink}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**New Linking Components**:
```typescript
// components/composites/function-model/node-linking-tab.tsx
interface NodeLinkingTabProps {
  links: CrossFeatureLink[]
  loading: boolean
  onCreateLink: (targetFeature: string, targetId: string, linkType: string, context?: Record<string, any>) => Promise<void>
  nodeType: string
  nodeId: string
}

export function NodeLinkingTab({
  links,
  loading,
  onCreateLink,
  nodeType,
  nodeId
}: NodeLinkingTabProps) {
  const [createLinkDialogOpen, setCreateLinkDialogOpen] = useState(false)
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Node Links</h3>
        <Button onClick={() => setCreateLinkDialogOpen(true)}>
          Add Link
        </Button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {links.length === 0 ? (
            <p className="text-muted-foreground">No links created yet</p>
          ) : (
            links.map(link => (
              <LinkCard key={link.linkId} link={link} />
            ))
          )}
        </div>
      )}
      
      <CreateNodeLinkDialog
        open={createLinkDialogOpen}
        onOpenChange={setCreateLinkDialogOpen}
        onCreateLink={onCreateLink}
        nodeType={nodeType}
        nodeId={nodeId}
      />
    </div>
  )
}
```

**Enhanced Node Visualization**:
```typescript
// components/composites/function-model/flow-nodes.tsx
// Add link indicators to nodes

export function StageNode(props: NodeProps) {
  const { id, data, isConnectable } = props
  const { links } = useNodeLinking(data.modelId, id)
  
  return (
    <div className="relative">
      {/* Existing node content */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-4 shadow-sm">
        {/* ... existing content */}
      </div>
      
      {/* Link indicators */}
      {links.length > 0 && (
        <div className="absolute -top-2 -right-2 flex gap-1">
          {links.map(link => (
            <div
              key={link.linkId}
              className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center"
              title={`${link.linkType} ${link.targetFeature}`}
            >
              {getLinkIcon(link.linkType)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

#### 1.6 Database Schema Updates
**Objective**: Enhance existing cross-feature links table for node-level linking

**Database Schema Updates**:
```sql
-- Add node-specific context to existing table
ALTER TABLE cross_feature_links 
ADD COLUMN node_context JSONB DEFAULT '{}';

-- Add index for node-level queries
CREATE INDEX idx_cross_feature_links_node_context 
ON cross_feature_links USING GIN (node_context);

-- Add constraint for node links
ALTER TABLE cross_feature_links 
ADD CONSTRAINT node_link_context_check 
CHECK (
  (node_context->>'nodeId' IS NOT NULL) OR 
  (node_context = '{}'::jsonb)
);
```

### Phase 2: Function Model List View (Week 2)

#### 2.1 List View Architecture
**Objective**: Create a comprehensive list view interface for function models

**Routing Structure**:
```
/function-model                    → List view (all models)
/function-model/new               → Create new model
/function-model/[modelId]         → Edit specific model (canvas)
/function-model/[modelId]/version/[version] → Load specific version
```

**Component Architecture**:
```typescript
// Page Components
- /function-model/page.tsx                    → FunctionModelListPage
- /function-model/[modelId]/page.tsx          → FunctionModelCanvasPage

// Feature Components
- FunctionModelListView                       → Main list view container
- FunctionModelListHeader                     → Header with create button and stats

// Composite Components
- FunctionModelCard                           → Individual model card
- FunctionModelList                           → List container with search/filter
- FunctionModelFilters                        → Search and filter controls
```

#### 2.2 List View Components Implementation

**FunctionModelCard Component**:
```typescript
interface FunctionModelCardProps {
  model: FunctionModel
  onEdit: (modelId: string) => void
  onDelete: (modelId: string) => void
  onDuplicate: (modelId: string) => void
}

// Features:
- Model name, description, version
- Status badge (draft/published/archived)
- Last modified date
- Node count indicator (from nodesData.length)
- Action buttons (Edit, Delete, Duplicate)
- Preview of first few nodes
```

**FunctionModelList Component**:
```typescript
interface FunctionModelListProps {
  models: FunctionModel[]
  loading: boolean
  onModelSelect: (modelId: string) => void
  onModelDelete: (modelId: string) => void
  onModelDuplicate: (modelId: string) => void
}

// Features:
- Grid/list view toggle
- Search functionality
- Filter by status, process type, tags
- Sort by name, date, version
- Empty state handling
- Loading states
```

**FunctionModelListView Component**:
```typescript
interface FunctionModelListViewProps {
  onCreateNew: () => void
}

// Features:
- Header with create button and stats
- Search and filter controls
- Model list with pagination
- Loading and error states
- Integration with existing hooks
```

#### 2.3 Application Layer Enhancements

**Enhanced List Management Hook**:
```typescript
export function useFunctionModelList() {
  const [models, setModels] = useState<FunctionModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FunctionModelFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  
  // Load all models
  const loadModels = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const allModels = await getAllFunctionModels()
      setModels(allModels)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models')
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Search and filter models
  const searchModels = useCallback(async (query: string, filters: FunctionModelFilters) => {
    setLoading(true)
    setError(null)
    
    try {
      const results = await searchFunctionModels(query, filters)
      setModels(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search models')
    } finally {
      setLoading(false)
    }
  }, [])
  
  return {
    models,
    loading,
    error,
    filters,
    searchQuery,
    loadModels,
    searchModels,
    setFilters,
    setSearchQuery
  }
}
```

### Phase 3: Nested Function Model Support (Week 3)

#### 3.1 Nested Function Model Architecture
**Objective**: Support function models that contain other function models as nodes

**Current Data Structure Analysis**:
From the Supabase data, we can see that `nodes_data` contains React Flow nodes with:
- `stageNode` - Contains actions that can reference other function models
- `actionTableNode` - Contains actions that can link to other function models
- `ioNode` - Input/output nodes
- All nodes have `metadata` field for additional data

**Nested Function Model Strategy**:
```typescript
// Enhanced node data structure for nested function models
interface FunctionModelNode {
  id: string
  type: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelNode'
  data: {
    // ... existing data
    linkedFunctionModel?: {
      modelId: string
      name: string
      version: string
      status: string
      lastSavedAt: Date
    }
    // For action table nodes
    actions?: ActionItem[]
  }
  // ... React Flow properties
}

interface ActionItem {
  actionRowId: string
  title: string
  description: string
  type: string
  raci: RACIMatrix
  linkedFunctionModel?: {
    modelId: string
    name: string
    version: string
  }
  linkedSpindleTether?: {
    tetherId: string
    name: string
  }
}
```

#### 3.2 Cross-Feature Linking for Nested Models
**Objective**: Implement proper linking between function models and their nested components

**Linking Strategy**:
```typescript
// When a function model is linked as a node or action
interface FunctionModelLink {
  sourceModelId: string
  sourceNodeId: string
  sourceActionId?: string // For action table nodes
  targetModelId: string
  linkType: 'nested' | 'reference' | 'dependency'
  context: {
    nodeType: string
    position: { x: number, y: number }
    viewport: Viewport
  }
}

// Store in cross_feature_links table
{
  source_feature: 'function-model',
  source_id: 'source-model-uuid',
  target_feature: 'function-model', 
  target_id: 'target-model-uuid',
  link_type: 'nested',
  link_context: {
    nodeId: 'node-uuid',
    actionId: 'action-uuid', // optional
    nodeType: 'stageNode',
    position: { x: 100, y: 200 }
  }
}
```

#### 3.3 Enhanced Persistence for Nested Models
**Objective**: Ensure nested function models are properly saved and loaded

**Save Strategy**:
```typescript
// When saving a function model with nested models
export const saveFunctionModelWithNested = async (
  model: FunctionModel,
  options: SaveOptions = {}
): Promise<FunctionModel> => {
  // 1. Save the main model
  const savedModel = await saveFunctionModel(model, options)
  
  // 2. Extract and save cross-feature links for nested models
  const nestedLinks = extractNestedModelLinks(model)
  
  for (const link of nestedLinks) {
    await createNewCrossFeatureLink(
      'function-model',
      model.modelId,
      'function-model', 
      link.targetModelId,
      'nested',
      link.context
    )
  }
  
  return savedModel
}

// Extract nested model links from nodes and actions
function extractNestedModelLinks(model: FunctionModel): FunctionModelLink[] {
  const links: FunctionModelLink[] = []
  
  for (const node of model.nodesData) {
    // Check for linked function models in node data
    if (node.data.linkedFunctionModel) {
      links.push({
        sourceModelId: model.modelId,
        sourceNodeId: node.id,
        targetModelId: node.data.linkedFunctionModel.modelId,
        linkType: 'nested',
        context: {
          nodeType: node.type,
          position: node.position,
          viewport: model.viewportData
        }
      })
    }
    
    // Check for linked function models in actions
    if (node.type === 'actionTableNode' && node.data.actions) {
      for (const action of node.data.actions) {
        if (action.linkedFunctionModel) {
          links.push({
            sourceModelId: model.modelId,
            sourceNodeId: node.id,
            sourceActionId: action.actionRowId,
            targetModelId: action.linkedFunctionModel.modelId,
            linkType: 'nested',
            context: {
              nodeType: node.type,
              position: node.position,
              viewport: model.viewportData
            }
          })
        }
      }
    }
  }
  
  return links
}
```

**Load Strategy**:
```typescript
// When loading a function model, also load nested model references
export const loadFunctionModelWithNested = async (
  modelId: string,
  options: LoadOptions = {}
): Promise<FunctionModel> => {
  // 1. Load the main model
  const model = await loadFunctionModel(modelId, options)
  
  // 2. Load cross-feature links for nested models
  const nestedLinks = await getCrossFeatureLinks(modelId, 'function-model')
  
  // 3. Enhance node data with nested model information
  const enhancedModel = enhanceModelWithNestedData(model, nestedLinks)
  
  return enhancedModel
}

// Enhance model nodes with nested function model data
function enhanceModelWithNestedData(
  model: FunctionModel, 
  nestedLinks: CrossFeatureLink[]
): FunctionModel {
  const enhancedNodes = model.nodesData.map(node => {
    // Find links for this node
    const nodeLinks = nestedLinks.filter(link => 
      link.linkContext?.nodeId === node.id
    )
    
    if (nodeLinks.length > 0) {
      // Enhance node with nested model data
      return {
        ...node,
        data: {
          ...node.data,
          nestedModels: nodeLinks.map(link => ({
            modelId: link.targetId,
            linkType: link.linkType,
            context: link.linkContext
          }))
        }
      }
    }
    
    return node
  })
  
  return {
    ...model,
    nodesData: enhancedNodes
  }
}
```

### Phase 4: UI Integration and Navigation (Week 4)

#### 4.1 List View Page Implementation
**Objective**: Create the main list view page

**FunctionModelListPage**:
```typescript
// /app/(private)/dashboard/function-model/page.tsx
export default function FunctionModelListPage() {
  const { models, loading, error, loadModels } = useFunctionModelList()
  const router = useRouter()
  
  useEffect(() => {
    loadModels()
  }, [loadModels])
  
  const handleCreateNew = () => {
    router.push('/function-model/new')
  }
  
  const handleModelSelect = (modelId: string) => {
    router.push(`/function-model/${modelId}`)
  }
  
  return (
    <div className="w-full h-full p-6">
      <FunctionModelListView
        models={models}
        loading={loading}
        error={error}
        onCreateNew={handleCreateNew}
        onModelSelect={handleModelSelect}
      />
    </div>
  )
}
```

#### 4.2 Canvas Page Implementation
**Objective**: Create the canvas page for individual model editing

**FunctionModelCanvasPage**:
```typescript
// /app/(private)/dashboard/function-model/[modelId]/page.tsx
export default function FunctionModelCanvasPage({ 
  params 
}: { 
  params: { modelId: string } 
}) {
  return (
    <div className="w-full h-full">
      <FunctionProcessDashboard 
        functionModel={{ modelId: params.modelId }}
      />
    </div>
  )
}
```

#### 4.3 Enhanced FunctionProcessDashboard
**Objective**: Update existing dashboard to support auto-loading

**Auto-load Enhancement**:
```typescript
// Enhanced auto-load functionality in FunctionProcessDashboard
useEffect(() => {
  const loadSavedModel = async () => {
    if (functionModel.modelId && functionModel.modelId !== 'sample-model-id') {
      setIsLoading(true)
      setLoadError(null)
      
      try {
        // Load the specific model with nested data
        const { loadFunctionModelWithNested } = await import('@/lib/application/use-cases/function-model-persistence-use-cases')
        const loadedModel = await loadFunctionModelWithNested(functionModel.modelId, { 
          includeMetadata: true 
        })
        
        setFunctionModel(loadedModel)
        
        // Update flow data with loaded model
        setFlow(prev => ({
          ...prev,
          name: loadedModel.name,
          nodes: loadedModel.nodesData || [],
          edges: loadedModel.edgesData || [],
          viewport: loadedModel.viewportData || { x: 0, y: 0, zoom: 1 }
        }))
      } catch (err) {
        console.error('Failed to load model:', err)
        setLoadError(err instanceof Error ? err.message : 'Failed to load model')
      } finally {
        setIsLoading(false)
      }
    }
  }
  
  loadSavedModel()
}, [functionModel.modelId])
```

### Phase 5: Testing and Optimization (Week 5)

#### 5.1 Comprehensive Testing
**Objective**: Ensure all functionality works correctly

**Test Scenarios**:
1. **Node-Level Linking Tests**:
   - Create links from stage nodes to other features
   - Create links from action table nodes to function models
   - Create links from I/O nodes to knowledge base
   - Visual indicators on nodes showing linked entities
   
2. **List View Tests**:
   - Load all function models
   - Search and filter functionality
   - Create new model
   - Navigate to canvas view
   
3. **Nested Model Tests**:
   - Create function model with nested models
   - Save and load nested models
   - Cross-feature linking for nested models
   - Version control with nested models
   
4. **Integration Tests**:
   - List view → Canvas view navigation
   - Auto-load functionality
   - Error handling
   - Performance with large datasets

#### 5.2 Performance Optimization
**Objective**: Ensure optimal performance for list view and nested models

**Optimization Strategies**:
1. **Virtual Scrolling**: For large lists of function models
2. **Lazy Loading**: Load nested model data on demand
3. **Caching**: Cache frequently accessed models
4. **Pagination**: Implement pagination for large datasets

## Success Metrics

### Functional Metrics
- **Node-Level Linking**: Support for 50+ links per node
- **List View Performance**: Load 100+ models in <2 seconds
- **Navigation Speed**: List → Canvas transition in <1 second
- **Nested Model Support**: Support for 10+ nested models per function model
- **Auto-load Success**: 100% success rate for auto-loading last saved version
- **Cross-feature Linking**: Support for 1000+ cross-feature relationships

### Technical Metrics
- **Performance**: <500ms response time for list operations
- **Scalability**: Support for 10,000+ function models
- **Data Integrity**: 100% data consistency across nested models
- **Storage Efficiency**: <30% storage overhead for nested relationships

## Risk Mitigation

### Technical Risks
1. **Node-Level Linking Complexity**: Implement clear linking strategy and validation
2. **Nested Model Complexity**: Implement clear linking strategy and validation
3. **Performance Issues**: Use efficient data structures and lazy loading
4. **Data Consistency**: Implement proper transaction handling for nested saves
5. **Storage Growth**: Monitor and optimize nested relationship storage

### User Experience Risks
1. **Navigation Complexity**: Provide clear breadcrumbs and navigation
2. **Data Loss**: Maintain existing auto-save and recovery mechanisms
3. **Nested Model Management**: Provide clear UI for managing nested relationships
4. **List View Usability**: Implement intuitive search, filter, and sort
5. **Link Management**: Provide clear UI for managing node-level links

## Timeline and Milestones

### Week 1: Node-Level Linking Implementation
- [ ] Enhance domain entities for node-level linking
- [ ] Update repository with node-specific methods
- [ ] Add database schema enhancements
- [ ] Create node-level linking use cases
- [ ] Implement enhanced hooks
- [ ] Replace navigation tabs with linking tabs in node modals
- [ ] Create node linking components
- [ ] Add link visualization to nodes

### Week 2: Function Model List View
- [ ] Create FunctionModelCard component
- [ ] Create FunctionModelList component
- [ ] Create FunctionModelListView component
- [ ] Update routing structure
- [ ] Implement list view page

### Week 3: Nested Function Model Support
- [ ] Enhance node data structure for nested models
- [ ] Implement nested model linking strategy
- [ ] Update save/load functionality for nested models
- [ ] Enhance cross-feature linking for nested models

### Week 4: UI Integration and Navigation
- [ ] Update FunctionModelListPage
- [ ] Create FunctionModelCanvasPage
- [ ] Enhance FunctionProcessDashboard auto-load
- [ ] Implement navigation between list and canvas

### Week 5: Testing and Optimization
- [ ] Comprehensive testing of all functionality
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Documentation updates

## Conclusion

This enhanced Function Model persistence implementation plan builds upon the existing robust foundation to add node-level linking, list view functionality, and nested function model support. The plan maintains all existing functionality while adding new capabilities that support the "function model that has function model action steps, or stages" requirement.

The implementation follows Clean Architecture principles and maintains the established component hierarchy. The node-level linking and nested model support leverages the existing cross-feature linking infrastructure while adding specialized handling for function model relationships.

The phased approach ensures that existing functionality remains stable while new features are incrementally added and tested.

## Current Implementation Status

### ✅ **COMPLETED (95%)**
- ✅ **Database Schema**: All tables created and functional
- ✅ **Repository Layer**: Complete implementation
- ✅ **Application Layer**: All use cases implemented
- ✅ **UI Components**: Save/load, version control, cross-feature linking
- ✅ **Integration**: Seamlessly integrated with existing dashboard
- ✅ **Persistence**: Save/load functionality working perfectly
- ✅ **Version Control**: Version loading and management working
- ✅ **Global Cross-Feature Linking**: Working via sidebar panel

### 🚧 **IN PROGRESS**
- **Node-Level Linking**: Phase 1 implementation
- **List View Interface**: Phase 2 planning
- **Nested Function Models**: Phase 3 planning
- **Enhanced Navigation**: Phase 4 preparation

### 📋 **PLANNED**
- **Performance Optimization**: Phase 5
- **Comprehensive Testing**: Phase 5
- **Documentation Updates**: Phase 5 