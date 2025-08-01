# Function Model Persistence Implementation Plan

## Overview

This plan focuses on implementing comprehensive persistence for Function Model entities, following Clean Architecture principles and the established component hierarchy. The implementation will support save/load operations, cross-feature linking, and version control while maintaining alignment with the separate table architecture for different features.

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
- **Composite Components**: Save/load panels and version management
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
- Unified node system with Function Model node types (will be migrated to feature-specific tables)
- React Flow integration for visual representation
- Basic node metadata storage
- Cross-feature relationship framework

### ⚠️ **Persistence Gaps**
- No save/load UI interface
- Missing version control for workflows
- No export/import functionality
- Limited collaboration features
- No workflow templates system

## Implementation Strategy

### Phase 1: Core Persistence Infrastructure (Week 1)

#### 1.1 Enhanced Function Model Domain Entities
**Objective**: Extend domain entities to support comprehensive persistence with separate table architecture

**Domain Layer Updates**:
```typescript
// Enhanced Function Model entity
export interface FunctionModel {
  modelId: string
  name: string
  description: string
  version: string
  status: 'draft' | 'published' | 'archived'
  
  // Visual representation (React Flow data)
  nodesData: FunctionModelNode[]
  edgesData: FunctionModelEdge[]
  viewportData: Viewport
  
  // Function Model specific metadata
  processType?: string
  complexityLevel?: 'simple' | 'moderate' | 'complex'
  estimatedDuration?: number // in minutes
  tags: string[]
  
  // Persistence metadata
  metadata: FunctionModelMetadata
  permissions: FunctionModelPermissions
  
  // Version control
  versionHistory: VersionEntry[]
  currentVersion: string
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
  lastSavedAt: Date
}

// Function Model metadata for persistence
export interface FunctionModelMetadata {
  category: string
  dependencies: string[] // IDs of other function models
  references: string[] // IDs of referenced entities
  
  // Export settings
  exportSettings: {
    includeMetadata: boolean
    includeRelationships: boolean
    format: 'json' | 'xml' | 'yaml' | 'png' | 'svg'
    resolution: 'low' | 'medium' | 'high'
  }
  
  // Collaboration settings
  collaboration: {
    allowComments: boolean
    allowSuggestions: boolean
    requireApproval: boolean
    autoSave: boolean
    saveInterval: number // in seconds
  }
}

// Version control entity
export interface VersionEntry {
  version: string
  timestamp: Date
  author: string
  changes: ChangeDescription[]
  snapshot: FunctionModelSnapshot
  isPublished: boolean
}

// Function Model permissions
export interface FunctionModelPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
  canExport: boolean
  canVersion: boolean
  canCollaborate: boolean
}

// Cross-feature link entity
export interface CrossFeatureLink {
  linkId: string
  sourceFeature: 'function-model' | 'knowledge-base' | 'spindle'
  sourceId: string
  targetFeature: 'function-model' | 'knowledge-base' | 'spindle'
  targetId: string
  linkType: 'documents' | 'implements' | 'references' | 'supports'
  linkContext: Record<string, any>
  createdAt: Date
}
```

#### 1.2 Database Schema for Function Model Persistence
**Objective**: Design comprehensive database schema with separate tables for each feature

**Database Schema Updates**:
```sql
-- Function Model persistence table
CREATE TABLE function_models (
  model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'published', 'archived')),
  
  -- Visual representation (React Flow data)
  nodes_data JSONB NOT NULL DEFAULT '[]',
  edges_data JSONB NOT NULL DEFAULT '[]',
  viewport_data JSONB NOT NULL DEFAULT '{}',
  
  -- Function Model specific metadata
  process_type VARCHAR(100),
  complexity_level VARCHAR(50) CHECK (complexity_level IN ('simple', 'moderate', 'complex')),
  estimated_duration INTEGER, -- in minutes
  tags TEXT[],
  
  -- General metadata and settings
  metadata JSONB NOT NULL DEFAULT '{}',
  permissions JSONB NOT NULL DEFAULT '{}',
  
  -- Version control
  current_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  version_count INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT function_models_name_version_unique 
    UNIQUE (name, version) WHERE deleted_at IS NULL
);

-- Function Model versions table
CREATE TABLE function_model_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES function_models(model_id) ON DELETE CASCADE,
  version_number VARCHAR(50) NOT NULL,
  version_data JSONB NOT NULL,
  change_summary VARCHAR(1000),
  author_id UUID REFERENCES auth.users(id),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(model_id, version_number)
);

-- Cross-feature links table
CREATE TABLE cross_feature_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_feature VARCHAR(50) NOT NULL CHECK (source_feature IN ('function-model', 'knowledge-base', 'spindle')),
  source_id UUID NOT NULL,
  target_feature VARCHAR(50) NOT NULL CHECK (target_feature IN ('function-model', 'knowledge-base', 'spindle')),
  target_id UUID NOT NULL,
  link_type VARCHAR(50) NOT NULL CHECK (link_type IN ('documents', 'implements', 'references', 'supports')),
  link_context JSONB DEFAULT '{}',
  link_strength DECIMAL(3,2) DEFAULT 1.0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent self-linking
  CONSTRAINT no_self_link CHECK (source_id != target_id OR source_feature != target_feature)
);

-- Indexes for performance
CREATE INDEX idx_function_models_status ON function_models(status);
CREATE INDEX idx_function_models_created_at ON function_models(created_at DESC);
CREATE INDEX idx_function_models_metadata_gin ON function_models USING GIN (metadata);
CREATE INDEX idx_function_models_tags ON function_models USING GIN (tags);
CREATE INDEX idx_function_model_versions_model_id ON function_model_versions(model_id);
CREATE INDEX idx_function_model_versions_version ON function_model_versions(version_number DESC);
CREATE INDEX idx_cross_feature_links_source ON cross_feature_links(source_feature, source_id);
CREATE INDEX idx_cross_feature_links_target ON cross_feature_links(target_feature, target_id);
CREATE INDEX idx_cross_feature_links_type ON cross_feature_links(link_type);
```

#### 1.3 Repository Layer Implementation
**Objective**: Implement comprehensive repository pattern for Function Model persistence

**Repository Interface**:
```typescript
// Function Model repository interface
export interface FunctionModelRepository {
  // CRUD operations
  create(model: FunctionModel): Promise<FunctionModel>
  getById(id: string): Promise<FunctionModel | null>
  update(id: string, updates: Partial<FunctionModel>): Promise<FunctionModel>
  delete(id: string): Promise<void>
  
  // Version control
  saveVersion(modelId: string, version: VersionEntry): Promise<void>
  getVersion(modelId: string, version: string): Promise<FunctionModel | null>
  getVersionHistory(modelId: string): Promise<VersionEntry[]>
  publishVersion(modelId: string, version: string): Promise<void>
  
  // Cross-feature linking
  createCrossFeatureLink(link: CrossFeatureLink): Promise<CrossFeatureLink>
  getCrossFeatureLinks(sourceId: string, sourceFeature: string): Promise<CrossFeatureLink[]>
  getLinkedEntities(targetId: string, targetFeature: string): Promise<CrossFeatureLink[]>
  updateLinkContext(linkId: string, context: Record<string, any>): Promise<void>
  deleteCrossFeatureLink(linkId: string): Promise<void>
  
  // Search and filtering
  search(query: string, filters: FunctionModelFilters): Promise<FunctionModel[]>
  getByUser(userId: string): Promise<FunctionModel[]>
  getByCategory(category: string): Promise<FunctionModel[]>
  getByProcessType(processType: string): Promise<FunctionModel[]>
}
```

### Phase 2: Application Layer Implementation (Week 2)

#### 2.1 Use Cases for Function Model Persistence
**Objective**: Implement comprehensive use cases for persistence operations

**Use Cases Implementation**:
```typescript
// Save Function Model use case
export const saveFunctionModel = async (
  model: FunctionModel,
  options: SaveOptions = {}
): Promise<FunctionModel> => {
  // Validate model data
  validateFunctionModel(model)
  
  // Update metadata
  model.metadata.lastSavedAt = new Date()
  model.metadata.version = incrementVersion(model.metadata.version)
  
  // Save to repository
  const savedModel = await functionModelRepository.update(model.modelId, model)
  
  // Create version snapshot if auto-versioning is enabled
  if (options.autoVersion) {
    await createVersionSnapshot(savedModel, options.changeSummary)
  }
  
  return savedModel
}

// Load Function Model use case
export const loadFunctionModel = async (
  id: string,
  version?: string
): Promise<FunctionModel> => {
  // Load from repository
  const model = version 
    ? await functionModelRepository.getVersion(id, version)
    : await functionModelRepository.getById(id)
  
  if (!model) {
    throw new Error(`Function Model not found: ${id}`)
  }
  
  // Validate permissions
  validateUserPermissions(model, 'view')
  
  // Update last accessed
  await updateLastAccessed(model.modelId)
  
  return model
}

// Create cross-feature link use case
export const createCrossFeatureLink = async (
  sourceFeature: string,
  sourceId: string,
  targetFeature: string,
  targetId: string,
  linkType: string,
  context?: Record<string, any>
): Promise<CrossFeatureLink> => {
  // Validate link parameters
  validateCrossFeatureLink(sourceFeature, sourceId, targetFeature, targetId)
  
  // Check for existing links to prevent duplicates
  const existingLinks = await functionModelRepository.getCrossFeatureLinks(sourceId, sourceFeature)
  const duplicate = existingLinks.find(link => 
    link.targetFeature === targetFeature && link.targetId === targetId
  )
  
  if (duplicate) {
    throw new Error('Cross-feature link already exists')
  }
  
  // Create the link
  const link: CrossFeatureLink = {
    linkId: generateUUID(),
    sourceFeature,
    sourceId,
    targetFeature,
    targetId,
    linkType,
    linkContext: context || {},
    createdAt: new Date()
  }
  
  return await functionModelRepository.createCrossFeatureLink(link)
}
```

#### 2.2 Custom Hooks for Persistence
**Objective**: Implement React hooks for Function Model persistence operations

**Custom Hooks**:
```typescript
// Function Model persistence hook
export function useFunctionModelPersistence(modelId: string) {
  const [model, setModel] = useState<FunctionModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoSave, setAutoSave] = useState(true)
  const [saveInterval, setSaveInterval] = useState(30) // seconds
  
  // Load function model
  const loadModel = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const loadedModel = await loadFunctionModel(modelId)
      setModel(loadedModel)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model')
    } finally {
      setLoading(false)
    }
  }, [modelId])
  
  // Save function model
  const saveModel = useCallback(async (options?: SaveOptions) => {
    if (!model) return
    
    setLoading(true)
    setError(null)
    
    try {
      const savedModel = await saveFunctionModel(model, options)
      setModel(savedModel)
      return savedModel
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save model')
      throw err
    } finally {
      setLoading(false)
    }
  }, [model])
  
  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !model) return
    
    const interval = setInterval(() => {
      saveModel({ autoVersion: false })
    }, saveInterval * 1000)
    
    return () => clearInterval(interval)
  }, [autoSave, model, saveInterval, saveModel])
  
  return {
    model,
    loading,
    error,
    loadModel,
    saveModel,
    autoSave,
    setAutoSave,
    saveInterval,
    setSaveInterval
  }
}

// Cross-feature linking hook
export function useCrossFeatureLinking(sourceId: string, sourceFeature: string) {
  const [links, setLinks] = useState<CrossFeatureLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Load cross-feature links
  const loadLinks = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const loadedLinks = await functionModelRepository.getCrossFeatureLinks(sourceId, sourceFeature)
      setLinks(loadedLinks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load links')
    } finally {
      setLoading(false)
    }
  }, [sourceId, sourceFeature])
  
  // Create new link
  const createLink = useCallback(async (
    targetFeature: string,
    targetId: string,
    linkType: string,
    context?: Record<string, any>
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      const newLink = await createCrossFeatureLink(sourceFeature, sourceId, targetFeature, targetId, linkType, context)
      await loadLinks() // Refresh links
      return newLink
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link')
      throw err
    } finally {
      setLoading(false)
    }
  }, [sourceFeature, sourceId, loadLinks])
  
  return {
    links,
    loading,
    error,
    loadLinks,
    createLink
  }
}
```

### Phase 3: UI Components for Persistence (Week 3)

#### 3.1 Save/Load UI Components
**Objective**: Create comprehensive UI components for Function Model persistence

**Component Architecture**:
```typescript
// Save/Load Panel Component
export function FunctionModelSaveLoadPanel({ modelId }: { modelId: string }) {
  const { model, loading, error, saveModel, autoSave, setAutoSave } = 
    useFunctionModelPersistence(modelId)
  
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [loadDialogOpen, setLoadDialogOpen] = useState(false)
  
  return (
    <div className="function-model-save-load-panel">
      <div className="panel-header">
        <h3>Save & Load</h3>
        <div className="auto-save-controls">
          <Switch
            checked={autoSave}
            onCheckedChange={setAutoSave}
            label="Auto-save"
          />
        </div>
      </div>
      
      <div className="panel-content">
        <Button onClick={() => setSaveDialogOpen(true)}>
          Save Model
        </Button>
        
        <Button onClick={() => setLoadDialogOpen(true)} variant="outline">
          Load Version
        </Button>
        
        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}
      </div>
      
      <SaveModelDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={saveModel}
        model={model}
      />
      
      <LoadModelDialog
        open={loadDialogOpen}
        onOpenChange={setLoadDialogOpen}
        modelId={modelId}
      />
    </div>
  )
}

// Cross-Feature Linking Panel Component
export function CrossFeatureLinkingPanel({ modelId }: { modelId: string }) {
  const { links, loading, error, loadLinks, createLink } = 
    useCrossFeatureLinking(modelId, 'function-model')
  
  const [createLinkDialogOpen, setCreateLinkDialogOpen] = useState(false)
  
  useEffect(() => {
    loadLinks()
  }, [loadLinks])
  
  return (
    <div className="cross-feature-linking-panel">
      <div className="panel-header">
        <h3>Cross-Feature Links</h3>
        <Button onClick={() => setCreateLinkDialogOpen(true)}>
          Add Link
        </Button>
      </div>
      
      <div className="panel-content">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <CrossFeatureLinksList
            links={links}
            onDeleteLink={handleDeleteLink}
          />
        )}
        
        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}
      </div>
      
      <CreateCrossFeatureLinkDialog
        open={createLinkDialogOpen}
        onOpenChange={setCreateLinkDialogOpen}
        onCreateLink={createLink}
      />
    </div>
  )
}
```

### Phase 4: Integration and Advanced Features (Week 4)

#### 4.1 Integration with Existing Components
**Objective**: Integrate persistence features with existing Function Model components

**Integration Points**:
```typescript
// Enhanced Function Process Dashboard
export function FunctionProcessDashboard({ modelId }: { modelId: string }) {
  const { model, loading, error, saveModel } = useFunctionModelPersistence(modelId)
  const { nodes, edges, onNodesChange, onEdgesChange } = useReactFlow()
  
  // Auto-save on changes
  useEffect(() => {
    if (model && (nodes.length > 0 || edges.length > 0)) {
      const timeoutId = setTimeout(() => {
        saveModel({ autoVersion: false })
      }, 2000) // Debounce auto-save
      
      return () => clearTimeout(timeoutId)
    }
  }, [nodes, edges, model, saveModel])
  
  return (
    <div className="function-process-dashboard">
      <div className="dashboard-header">
        <h1>{model?.name || 'Function Model'}</h1>
        <div className="persistence-controls">
          <FunctionModelSaveLoadPanel modelId={modelId} />
          <CrossFeatureLinkingPanel modelId={modelId} />
        </div>
      </div>
      
      <div className="dashboard-content">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          // ... other props
        />
      </div>
      
      {loading && <LoadingOverlay />}
      {error && <ErrorAlert error={error} />}
    </div>
  )
}
```

## Success Metrics

### Functional Metrics
- **Save Success Rate**: >99% successful save operations
- **Load Performance**: <2 second load time for complex models
- **Version Control**: Support for 100+ versions per model
- **Cross-Feature Linking**: Support for 1000+ cross-feature relationships
- **Multiple Models**: Support for 100+ function models per user

### Technical Metrics
- **Performance**: <500ms response time for save/load operations
- **Scalability**: Support for 10,000+ function models
- **Data Integrity**: 100% data consistency across operations
- **Storage Efficiency**: <30% storage overhead for version control

## Risk Mitigation

### Technical Risks
1. **Data Loss**: Implement comprehensive backup and version control
2. **Performance Issues**: Use efficient data structures and caching
3. **Concurrency Conflicts**: Implement optimistic locking and conflict resolution
4. **Storage Growth**: Implement data archiving and cleanup strategies

### User Experience Risks
1. **Complexity**: Provide intuitive UI with progressive disclosure
2. **Data Loss**: Implement auto-save and recovery mechanisms
3. **Cross-Feature Navigation**: Provide clear navigation between linked features
4. **Version Management**: Provide clear version history and rollback options

## Timeline and Milestones

### Week 1: Core Persistence Infrastructure
- [ ] Create function_models table
- [ ] Create function_model_versions table
- [ ] Create cross_feature_links table
- [ ] Implement basic CRUD operations
- [ ] Test save/load functionality

### Week 2: Application Layer Implementation
- [ ] Use cases for persistence operations
- [ ] Custom hooks for state management
- [ ] Version control implementation
- [ ] Cross-feature linking implementation

### Week 3: UI Components
- [ ] Save/load UI components
- [ ] Version control UI components
- [ ] Cross-feature linking UI components
- [ ] Integration with existing components

### Week 4: Integration and Advanced Features
- [ ] Integration with existing components
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation and training

## Conclusion

This Function Model persistence implementation plan provides a comprehensive approach to building robust save/load functionality with cross-feature linking and version control. The focus on separate tables for each feature ensures better performance, clarity, and scalability while maintaining alignment with Clean Architecture principles.

The phased approach allows for incremental implementation while maintaining system stability. The emphasis on user experience, performance, and cross-feature integration ensures that the persistence features become a core strength of the platform.

## Reference: Other Enhanced Features (Not Implemented in MVP)

### Template Management System
- Function Model templates for reusable processes
- Template gallery and categorization
- Template sharing and collaboration
- Template version control

### Collaboration Features
- Real-time collaboration on Function Models
- Comment and suggestion system
- Approval workflows
- Activity tracking and notifications

### Export/Import System
- Multiple export formats (JSON, XML, YAML, PNG, SVG)
- Import from external sources
- Export templates and configurations
- Batch export operations

### Advanced Analytics
- Function Model usage analytics
- Process complexity analysis
- Cross-feature relationship analytics
- Performance metrics and insights 