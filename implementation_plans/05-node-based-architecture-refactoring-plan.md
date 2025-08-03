# Node-Based Architecture Refactoring Implementation Plan

## Overview

This plan outlines the refactoring of the Function Model feature to properly implement the **node-based architecture design** as defined in `@architecture/2_node_based_architecture_design.md`. The goal is to create a **unified node interface** that can handle different node types (Function Model, Knowledge Base, Spindle) while maintaining feature separation and enabling cross-feature connectivity.

## Current State Analysis

### ✅ **What We Have (Good Foundation)**
- **Clean Architecture**: Perfect implementation of Clean Architecture principles
- **Dedicated Tables**: `function_models` table with React Flow compatible JSONB storage
- **Cross-Feature Links**: `cross_feature_links` table with node-level support
- **Version Control**: `function_model_versions` table for versioning
- **UI Components**: Complete save/load, version control, and cross-feature linking UI

### ❌ **What's Missing (Architecture Alignment)**
- **Base Node Interface**: No `BaseNode` interface as defined in architecture
- **Feature-Specific Extensions**: No `FunctionModelNode extends BaseNode`
- **Node Behavior System**: No `NodeBehavior` abstraction
- **Unified Node Operations**: No `UnifiedNodeOperations` interface
- **Node-Level Database Schema**: No individual node tracking (only JSONB storage)
- **Cross-Feature Link Validation**: No link validation based on node types

### 🎯 **Target State (From Architecture Design)**
```typescript
// Base Node Interface
export interface BaseNode {
  id: string
  featureType: FeatureType
  nodeType: string
  name: string
  description?: string
  position: { x: number; y: number }
  visualProperties: VisualProperties
  metadata: NodeMetadata
  createdAt: Date
  updatedAt: Date
  status: NodeStatus
}

// Feature-Specific Extension
export interface FunctionModelNode extends BaseNode {
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
}
```

## Implementation Strategy

### Phase 1: Core Node Architecture Foundation (Week 1)

#### 1.1 Create Base Node Interface
**Objective**: Implement the foundational `BaseNode` interface and supporting types

**Files to Create**:
```typescript
// lib/domain/entities/base-node-types.ts
export interface BaseNode {
  id: string
  featureType: FeatureType
  nodeType: string
  name: string
  description?: string
  position: { x: number; y: number }
  visualProperties: VisualProperties
  metadata: NodeMetadata
  createdAt: Date
  updatedAt: Date
  status: NodeStatus
}

export interface VisualProperties {
  color?: string
  icon?: string
  size?: 'small' | 'medium' | 'large'
  style?: Record<string, any>
  featureSpecific?: Record<string, any>
}

export interface NodeMetadata {
  tags: string[]
  aiAgent?: AIAgentConfig
  vectorEmbedding?: number[]
  searchKeywords: string[]
  crossFeatureLinks?: CrossFeatureLinkMetadata[]
}

export type NodeStatus = 'active' | 'inactive' | 'draft' | 'archived' | 'error'
export type FeatureType = 'function-model' | 'knowledge-base' | 'spindle'
```

#### 1.2 Create Feature-Specific Node Extensions
**Objective**: Implement `FunctionModelNode` that extends `BaseNode`

**Files to Create**:
```typescript
// lib/domain/entities/function-model-node-types.ts
export interface FunctionModelNode extends BaseNode {
  featureType: 'function-model'
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
  
  // Function Model specific properties
  functionModelData: {
    stage?: Stage
    action?: ActionItem
    io?: DataPort
    container?: FunctionModelContainer
  }
  
  // Process-specific behavior
  processBehavior: {
    executionType: 'sequential' | 'parallel' | 'conditional'
    dependencies: string[]
    timeout?: number
    retryPolicy?: RetryPolicy
  }
  
  // Business logic properties
  businessLogic: {
    raciMatrix?: RACIMatrix
    sla?: ServiceLevelAgreement
    kpis?: KeyPerformanceIndicator[]
  }
}
```

#### 1.3 Create Node Behavior System
**Objective**: Implement the node behavior abstraction system

**Files to Create**:
```typescript
// lib/domain/entities/node-behavior-types.ts
export interface NodeBehavior {
  canExecute(): boolean
  getDependencies(): string[]
  getOutputs(): any[]
  validate(): ValidationResult
}

export interface ProcessNodeBehavior extends NodeBehavior {
  execute(): Promise<ExecutionResult>
  rollback(): Promise<void>
  getExecutionPath(): string[]
}

export class NodeBehaviorFactory {
  static createBehavior(node: BaseNode): NodeBehavior {
    switch (node.featureType) {
      case 'function-model':
        return new ProcessNodeBehavior(node as FunctionModelNode)
      case 'knowledge-base':
        return new ContentNodeBehavior(node as KnowledgeBaseNode)
      case 'spindle':
        return new IntegrationNodeBehavior(node as SpindleNode)
      default:
        throw new Error(`Unknown feature type: ${node.featureType}`)
    }
  }
}
```

### Phase 2: Database Schema Enhancement (Week 2)

#### 2.1 Create Node-Level Tables
**Objective**: Add individual node tracking alongside existing JSONB storage

**Database Schema Updates**:
```sql
-- Function Model Nodes Table
CREATE TABLE function_model_nodes (
  node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES function_models(model_id),
  
  -- Base node properties
  node_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  
  -- Process-specific properties
  execution_type VARCHAR(20) DEFAULT 'sequential',
  dependencies TEXT[] DEFAULT '{}',
  timeout INTEGER,
  retry_policy JSONB,
  
  -- Business logic properties
  raci_matrix JSONB,
  sla JSONB,
  kpis JSONB,
  
  -- Node data (feature-specific)
  stage_data JSONB,
  action_data JSONB,
  io_data JSONB,
  container_data JSONB,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Node Metadata Table
CREATE TABLE node_metadata (
  metadata_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  node_id VARCHAR(255),
  node_type VARCHAR(50) NOT NULL,
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  vector_embedding VECTOR(1536),
  search_keywords TEXT[] DEFAULT '{}',
  ai_agent_config JSONB,
  visual_properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Node Links Table
CREATE TABLE node_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_feature VARCHAR(50) NOT NULL,
  source_entity_id UUID NOT NULL,
  source_node_id VARCHAR(255),
  target_feature VARCHAR(50) NOT NULL,
  target_entity_id UUID NOT NULL,
  target_node_id VARCHAR(255),
  link_type VARCHAR(50) NOT NULL,
  link_strength DECIMAL(3,2) DEFAULT 1.0,
  link_context JSONB NOT NULL DEFAULT '{}',
  visual_properties JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2.2 Update Cross-Feature Links Table
**Objective**: Enhance existing cross-feature links for node-level support

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

### Phase 3: Repository Pattern Enhancement (Week 3)

#### 3.1 Create Unified Node Operations
**Objective**: Implement `UnifiedNodeOperations` interface

**Files to Create**:
```typescript
// lib/use-cases/unified-node-operations.ts
export interface UnifiedNodeOperations {
  // Universal node operations
  createNode<T extends BaseNode>(node: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>
  getNode<T extends BaseNode>(featureType: FeatureType, entityId: string, nodeId?: string): Promise<T | null>
  updateNode<T extends BaseNode>(featureType: FeatureType, entityId: string, nodeId: string, updates: Partial<T>): Promise<T>
  deleteNode(featureType: FeatureType, entityId: string, nodeId: string): Promise<void>
  
  // Cross-feature operations
  createNodeLink(link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<CrossFeatureLink>
  getNodeLinks(featureType: FeatureType, entityId: string, nodeId?: string): Promise<CrossFeatureLink[]>
  getConnectedNodes(featureType: FeatureType, entityId: string, nodeId?: string): Promise<BaseNode[]>
  
  // Feature-specific operations
  executeNode(featureType: FeatureType, entityId: string, nodeId: string, context?: any): Promise<any>
  validateNode(featureType: FeatureType, entityId: string, nodeId: string): Promise<ValidationResult>
  getNodeBehavior(featureType: FeatureType, entityId: string, nodeId: string): Promise<NodeBehavior>
}
```

#### 3.2 Enhance Function Model Repository
**Objective**: Add node-specific operations to existing repository

**Repository Updates**:
```typescript
// lib/infrastructure/repositories/function-model-repository.ts
export class FunctionModelRepository {
  // ... existing methods
  
  // NEW: Node-specific operations
  async createFunctionModelNode(node: Omit<FunctionModelNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<FunctionModelNode>
  async getFunctionModelNodes(modelId: string): Promise<FunctionModelNode[]>
  async getFunctionModelNodeById(modelId: string, nodeId: string): Promise<FunctionModelNode | null>
  async updateFunctionModelNode(modelId: string, nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode>
  async deleteFunctionModelNode(modelId: string, nodeId: string): Promise<void>
  
  // NEW: Node linking operations
  async createNodeLink(modelId: string, nodeId: string, targetFeature: string, targetId: string, linkType: string, context?: Record<string, any>): Promise<CrossFeatureLink>
  async getNodeLinks(modelId: string, nodeId: string): Promise<CrossFeatureLink[]>
  async deleteNodeLink(linkId: string): Promise<void>
}
```

### Phase 4: Application Layer Enhancement (Week 4)

#### 4.1 Create Node Operations Use Cases
**Objective**: Implement use cases for node-level operations

**Files to Create**:
```typescript
// lib/application/use-cases/node-operations.ts
export const createNode = async <T extends BaseNode>(
  node: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): Promise<T> => {
  // Validate node data
  validateNodeData(node)
  
  // Create node in appropriate repository
  switch (node.featureType) {
    case 'function-model':
      return await functionModelRepository.createFunctionModelNode(node as FunctionModelNode)
    case 'knowledge-base':
      return await knowledgeBaseRepository.createKnowledgeBaseNode(node as KnowledgeBaseNode)
    case 'spindle':
      return await spindleRepository.createSpindleNode(node as SpindleNode)
    default:
      throw new Error(`Unsupported feature type: ${node.featureType}`)
  }
}

export const getNode = async <T extends BaseNode>(
  featureType: FeatureType,
  entityId: string,
  nodeId?: string
): Promise<T | null> => {
  // Get node from appropriate repository
  switch (featureType) {
    case 'function-model':
      return await functionModelRepository.getFunctionModelNodeById(entityId, nodeId)
    case 'knowledge-base':
      return await knowledgeBaseRepository.getKnowledgeBaseNodeById(entityId, nodeId)
    case 'spindle':
      return await spindleRepository.getSpindleNodeById(entityId, nodeId)
    default:
      throw new Error(`Unsupported feature type: ${featureType}`)
  }
}
```

#### 4.2 Create Node Linking Use Cases
**Objective**: Implement use cases for cross-feature node linking

**Files to Create**:
```typescript
// lib/application/use-cases/node-linking-operations.ts
export const createNodeLink = async (
  sourceFeature: FeatureType,
  sourceEntityId: string,
  sourceNodeId: string,
  targetFeature: FeatureType,
  targetEntityId: string,
  targetNodeId: string,
  linkType: LinkType,
  context?: Record<string, any>
): Promise<CrossFeatureLink> => {
  // Validate link parameters
  validateNodeLink(sourceFeature, sourceEntityId, sourceNodeId, targetFeature, targetEntityId, targetNodeId, linkType)
  
  // Create the link
  const link = await crossFeatureLinkRepository.createNodeLink(
    sourceFeature,
    sourceEntityId,
    sourceNodeId,
    targetFeature,
    targetEntityId,
    targetNodeId,
    linkType,
    context
  )
  
  return link
}

export const getNodeLinks = async (
  featureType: FeatureType,
  entityId: string,
  nodeId?: string
): Promise<CrossFeatureLink[]> => {
  return await crossFeatureLinkRepository.getNodeLinks(featureType, entityId, nodeId)
}
```

### Phase 5: Cross-Feature Link Validation (Week 5)

#### 5.1 Implement Link Validation System
**Objective**: Create validation system for cross-feature links

**Files to Create**:
```typescript
// lib/domain/entities/cross-feature-link-validation.ts
export class CrossFeatureLinkValidator {
  static validateLink(source: BaseNode, target: BaseNode, linkType: LinkType): ValidationResult {
    // Validate that the link type makes sense for the node types
    const validCombinations = this.getValidLinkCombinations(source.featureType, target.featureType)
    
    if (!validCombinations.includes(linkType)) {
      return {
        isValid: false,
        errors: [`Link type '${linkType}' is not valid between ${source.featureType} and ${target.featureType} nodes`]
      }
    }
    
    return { isValid: true, errors: [] }
  }
  
  private static getValidLinkCombinations(sourceType: FeatureType, targetType: FeatureType): LinkType[] {
    const combinations: Record<string, LinkType[]> = {
      'function-model-knowledge-base': ['documents', 'references', 'implements'],
      'function-model-spindle': ['triggers', 'consumes', 'produces'],
      'knowledge-base-function-model': ['documents', 'references'],
      'knowledge-base-spindle': ['documents', 'references'],
      'spindle-function-model': ['implements', 'supports'],
      'spindle-knowledge-base': ['consumes', 'produces']
    }
    
    const key = `${sourceType}-${targetType}`
    return combinations[key] || ['references']
  }
}
```

### Phase 6: UI Component Updates (Week 6)

#### 6.1 Update Function Process Dashboard
**Objective**: Update dashboard to use new node architecture

**Dashboard Updates**:
```typescript
// app/(private)/dashboard/function-model/components/function-process-dashboard.tsx
export function FunctionProcessDashboard({
  functionModel: initialModel = sampleFunctionModel,
}: FunctionProcessDashboardProps) {
  // ... existing state
  
  // NEW: Node-level operations
  const { createNode, updateNode, deleteNode, getNodeLinks } = useNodeOperations()
  const { createNodeLink, getNodeLinks: getLinks } = useNodeLinking()
  
  // NEW: Load nodes with proper architecture
  const loadNodes = useCallback(async () => {
    if (functionModel.modelId) {
      const nodes = await getFunctionModelNodes(functionModel.modelId)
      setFlow(prev => ({
        ...prev,
        nodes: nodes.map(node => mapToReactFlowNode(node))
      }))
    }
  }, [functionModel.modelId])
  
  // NEW: Save nodes with proper architecture
  const saveNodes = useCallback(async () => {
    if (functionModel.modelId) {
      const nodes = flow.nodes.map(node => mapFromReactFlowNode(node))
      await updateFunctionModelNodes(functionModel.modelId, nodes)
    }
  }, [functionModel.modelId, flow.nodes])
}
```

#### 6.2 Create Node-Level Linking UI
**Objective**: Add node-level linking to existing UI

**UI Component Updates**:
```typescript
// components/composites/function-model/node-linking-panel.tsx
export function NodeLinkingPanel({ 
  modelId, 
  nodeId, 
  nodeType 
}: NodeLinkingPanelProps) {
  const { links, loading, createNodeLink } = useNodeLinking(modelId, nodeId)
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Node Links</h3>
        <Button onClick={() => setCreateLinkDialogOpen(true)}>
          Add Link
        </Button>
      </div>
      
      {links.map(link => (
        <LinkCard key={link.linkId} link={link} />
      ))}
      
      <CreateNodeLinkDialog
        open={createLinkDialogOpen}
        onOpenChange={setCreateLinkDialogOpen}
        onCreateLink={createNodeLink}
        nodeType={nodeType}
        nodeId={nodeId}
      />
    </div>
  )
}
```

## Success Metrics

### Functional Metrics
- **Node Architecture Compliance**: 100% alignment with architecture design
- **Cross-Feature Linking**: Support for 1000+ cross-feature relationships
- **Node-Level Operations**: Individual node CRUD operations working
- **Link Validation**: 100% validation of cross-feature links
- **Performance**: <500ms response time for node operations

### Technical Metrics
- **Type Safety**: 100% type consistency with BaseNode interface
- **Database Schema**: Proper node-level tracking alongside JSONB
- **Repository Pattern**: Clean separation of concerns
- **Validation System**: Comprehensive link validation
- **UI Integration**: Seamless integration with existing UI

## Risk Mitigation

### Technical Risks
1. **Data Migration**: Preserve existing JSONB data while adding node-level tracking
2. **Type Conflicts**: Ensure smooth transition from current types to BaseNode
3. **Performance Issues**: Optimize node-level queries and operations
4. **Backward Compatibility**: Maintain existing functionality during transition

### User Experience Risks
1. **Feature Regression**: Ensure all existing features continue to work
2. **UI Changes**: Minimize visible changes to existing UI
3. **Data Loss**: Comprehensive backup and migration strategy
4. **Learning Curve**: Provide clear documentation for new node architecture

## Timeline and Milestones

### Week 1: Core Node Architecture Foundation
- [ ] Create `BaseNode` interface and supporting types
- [ ] Create `FunctionModelNode` extension
- [ ] Implement `NodeBehavior` system
- [ ] Create `NodeBehaviorFactory`

### Week 2: Database Schema Enhancement
- [ ] Create `function_model_nodes` table
- [ ] Create `node_metadata` table
- [ ] Create `node_links` table
- [ ] Update `cross_feature_links` table
- [ ] Add proper indexes and constraints

### Week 3: Repository Pattern Enhancement
- [ ] Create `UnifiedNodeOperations` interface
- [ ] Enhance `FunctionModelRepository` with node operations
- [ ] Implement node linking operations
- [ ] Add validation and error handling

### Week 4: Application Layer Enhancement
- [ ] Create node operations use cases
- [ ] Create node linking use cases
- [ ] Implement node behavior use cases
- [ ] Add comprehensive testing

### Week 5: Cross-Feature Link Validation
- [ ] Implement `CrossFeatureLinkValidator`
- [ ] Add link type validation logic
- [ ] Create link combination rules
- [ ] Add validation to link creation

### Week 6: UI Component Updates
- [ ] Update `FunctionProcessDashboard` to use new architecture
- [ ] Create node-level linking UI components
- [ ] Add visual indicators for linked nodes
- [ ] Comprehensive testing and validation

## Conclusion

This refactoring plan will transform the Function Model feature to properly implement the node-based architecture design while maintaining all existing functionality. The key benefits are:

1. **Unified Node Interface**: All features will use the same `BaseNode` interface
2. **Feature-Specific Extensions**: Each feature can extend `BaseNode` with specific properties
3. **Cross-Feature Connectivity**: Proper node-level linking between different features
4. **Scalable Architecture**: Foundation for future feature additions
5. **Clean Separation**: Maintains feature separation while enabling connectivity

The implementation preserves all existing functionality while adding the architectural foundation needed for the node-based system described in the architecture design document. 