# Infrastructure Layer Implementation Plan

## Clarifying Questions

1. **What is the exact feature or change being implemented?**
   - Complete the infrastructure layer implementation for the node-based architecture
   - Fix repository implementations to work with existing database tables
   - Ensure proper data flow between domain, application, and infrastructure layers
   - Align repository methods with actual database schema and data

2. **What user actions or triggers will interact with this feature?**
   - Users creating, editing, and deleting function model nodes
   - Users connecting nodes with relationships/edges
   - Users saving and loading function models
   - Users performing cross-feature linking operations
   - Users managing node metadata and AI configurations

3. **What is the expected behavior of the new feature?**
   - Seamless CRUD operations for function model nodes
   - Proper relationship management between nodes
   - Cross-feature linking with node-level support
   - Metadata management for AI and search capabilities
   - Performance optimization for large node sets

4. **What is the current system architecture (frontend, backend, database)?**
   - **Frontend**: React with TypeScript, React Flow for node visualization
   - **Backend**: Next.js API routes with Supabase client
   - **Database**: PostgreSQL via Supabase with existing tables (function_models, function_model_nodes, cross_feature_links, node_metadata, node_links)
   - **Architecture**: Clean Architecture with Domain, Application, Infrastructure layers

5. **What is the existing data flow or execution path for related functionality?**
   - **Node Creation**: UI → Application Hook → Use Case → Repository → Database
   - **Node Loading**: Database → Repository → Use Case → Application Hook → UI
   - **Relationship Management**: UI → Application Hook → Use Case → Repository → Database
   - **Cross-Feature Linking**: UI → Application Hook → Use Case → Repository → Database

6. **Are there specific performance or scalability requirements?**
   - Support for 1000+ nodes per function model
   - <500ms response time for node operations
   - Efficient querying with proper indexing
   - Batch operations for bulk updates

7. **What dependencies (e.g., libraries, APIs, services) are involved?**
   - Supabase client for database operations
   - React Flow for node visualization
   - TypeScript for type safety
   - Existing domain entities and use cases

8. **Are there recent changes that might affect this implementation?**
   - Database tables already exist with data (5 nodes, 1 model, 9 versions)
   - Repository implementations partially exist but need alignment
   - Use cases exist but need repository integration

9. **What is the impact on existing users or other system modules?**
   - Preserve existing data and functionality
   - Maintain backward compatibility
   - Ensure no data loss during implementation
   - Support existing UI components

10. **Are there any compliance, security, or data integrity requirements?**
   - Row Level Security (RLS) enabled on cross_feature_links
   - Data validation and constraints
   - Audit trail for changes
   - Proper error handling and logging

## Current Flow Analysis

### **Existing Data Flow Analysis**

1. **Database Schema Reality Check**:
   - **`function_models`**: ✅ EXISTS with 1 model, contains basic model metadata
   - **`function_model_nodes`**: ✅ EXISTS with 5 nodes, stores individual node data
   - **`cross_feature_links`**: ✅ EXISTS with RLS enabled, supports node-level linking
   - **`node_metadata`**: ✅ EXISTS (empty), for AI and search capabilities
   - **`node_links`**: ✅ EXISTS (empty), for cross-feature relationships
   - **`function_model_versions`**: ✅ EXISTS with 9 versions, version control system

2. **Repository Implementation Analysis**:
   - **`FunctionModelRepository`**: ❌ **MISALIGNED** - Uses both old and new approaches
     - Creates nodes in `function_model_nodes` table (correct)
     - But also tries to use JSONB fields in `function_models` (conflicting)
     - Has conversion functions that don't match actual database schema
   - **`NodeRelationshipRepository`**: ✅ **WORKING** - Properly implemented
     - Uses `node_links` table correctly
     - Has proper mapping functions
     - Handles CRUD operations correctly

3. **Use Case Analysis**:
   - **`function-model-use-cases.ts`**: ❌ **MISALIGNED** - Uses wrong repository
     - Imports `FunctionModelNodeRepository` (doesn't exist)
     - Should use `FunctionModelRepository` for node operations
     - Has proper validation logic but wrong repository integration

4. **Application Hook Analysis**:
   - **`use-function-model-nodes.ts`**: ❌ **MISALIGNED** - Uses wrong use cases
     - Calls use cases that don't exist or are misaligned
     - Should integrate with correct repository methods
     - Has proper state management but wrong data flow

5. **Legacy Components Analysis**:
   - **`FunctionProcessDashboard`**: ❌ **STILL ACTIVE** - Uses old `FunctionModel` interface
     - File: `app/(private)/dashboard/function-model/components/function-process-dashboard.tsx`
     - Should use node-based `FunctionModelNode` interface
     - Still being imported and used in component hierarchy
   - **`FunctionModelDashboard`**: ❌ **STILL ACTIVE** - Uses old `FunctionModel` interface
     - File: `components/composites/function-model/function-model-dashboard.tsx`
     - Should use node-based `FunctionModelNode` interface
     - Still being imported and used in component hierarchy
   - **`NodeCanvas`**: ❌ **STILL ACTIVE** - Uses old `FunctionModel` interface
     - File: `components/composites/function-model/node-canvas.tsx`
     - Should use node-based `FunctionModelNode` interface
     - Still being imported and used in component hierarchy
   - **`FunctionModel` interface**: ❌ **STILL EXISTS** - Legacy type still being imported
     - File: `lib/domain/entities/function-model-types.ts`
     - Should be replaced with node-based `FunctionModelNode` interface
     - Still being imported by legacy components
   - **`function-model-persistence-use-cases.ts`**: ❌ **STILL EXISTS** - Legacy use cases
     - File: `lib/application/use-cases/function-model-persistence-use-cases.ts`
     - Should be replaced with node-based use cases
     - Still being imported by legacy components

### **Critical Dependencies and Integration Points**

1. **Repository Layer Dependencies**:
   - `FunctionModelRepository` depends on Supabase client
   - `NodeRelationshipRepository` depends on Supabase client
   - Both repositories need proper error handling and logging

2. **Use Case Layer Dependencies**:
   - Use cases depend on repository interfaces
   - Validation logic depends on domain entities
   - Business rules depend on connection validation

3. **Application Hook Dependencies**:
   - Hooks depend on use cases for business logic
   - State management depends on repository responses
   - UI updates depend on hook state changes

### **Second-Order Effects**

1. **Performance Impact**:
   - Misaligned repositories cause unnecessary database queries
   - Wrong table usage leads to data inconsistency
   - Missing indexes affect query performance

2. **Data Integrity Impact**:
   - Conflicting data structures cause data loss
   - Wrong repository methods create orphaned records
   - Missing validation leads to invalid data

3. **User Experience Impact**:
   - Failed operations due to repository misalignment
   - Inconsistent data display due to wrong queries
   - Performance degradation affects user productivity

4. **Maintainability Impact**:
   - Conflicting implementations make debugging difficult
   - Wrong abstractions make future changes complex
   - Missing error handling makes issues hard to trace

## Implementation Summary

Complete the infrastructure layer implementation by aligning repository methods with the actual database schema, fixing use case integrations, and ensuring proper data flow between all layers while preserving existing functionality and data.

## Implementation Plan

### **Phase 1: Repository Layer Alignment (Week 1)**

#### **Step 1: Fix FunctionModelRepository Implementation**
**Objective**: Align repository with actual database schema and remove conflicting approaches

**Files to Modify**:
- `lib/infrastructure/repositories/function-model-repository.ts`

**Changes Required**:
```typescript
// REMOVE conflicting JSONB approach
// REMOVE: async create(model: Omit<FunctionModel, 'modelId' | 'createdAt' | 'updatedAt' | 'lastSavedAt'>): Promise<FunctionModel>

// ADD proper node-based approach
async createFunctionModelNode(node: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<FunctionModelNode> {
  const { data, error } = await this.supabase
    .from('function_model_nodes')
    .insert({
      model_id: node.modelId,
      node_type: node.nodeType,
      name: node.name,
      description: node.description,
      position_x: node.position.x,
      position_y: node.position.y,
      execution_type: node.processBehavior.executionType,
      dependencies: node.processBehavior.dependencies,
      sla: node.businessLogic.sla,
      kpis: node.businessLogic.kpis,
      stage_data: node.functionModelData.stage || null,
      action_data: node.functionModelData.action || null,
      io_data: node.functionModelData.io || null,
      container_data: node.functionModelData.container || null,
      metadata: node.metadata
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create function model node:', error)
    throw new Error(`Failed to create function model node: ${error.message}`)
  }

  return this.mapDbToFunctionModelNode(data)
}

async getFunctionModelNodes(modelId: string): Promise<FunctionModelNode[]> {
  const { data, error } = await this.supabase
    .from('function_model_nodes')
    .select('*')
    .eq('model_id', modelId)

  if (error) {
    console.error('Failed to get function model nodes:', error)
    throw new Error(`Failed to get function model nodes: ${error.message}`)
  }

  return data.map(this.mapDbToFunctionModelNode)
}

async updateFunctionModelNode(nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode> {
  const updateData = this.mapFunctionModelNodeToDb(updates)
  
  const { data, error } = await this.supabase
    .from('function_model_nodes')
    .update(updateData)
    .eq('node_id', nodeId)
    .select()
    .single()

  if (error) {
    console.error('Failed to update function model node:', error)
    throw new Error(`Failed to update function model node: ${error.message}`)
  }

  return this.mapDbToFunctionModelNode(data)
}

async deleteFunctionModelNode(nodeId: string): Promise<void> {
  const { error } = await this.supabase
    .from('function_model_nodes')
    .delete()
    .eq('node_id', nodeId)

  if (error) {
    console.error('Failed to delete function model node:', error)
    throw new Error(`Failed to delete function model node: ${error.message}`)
  }
}

// FIX mapping functions to match actual database schema
private mapFunctionModelNodeToDb(node: Partial<FunctionModelNode>): any {
  return {
    model_id: node.modelId,
    node_type: node.nodeType,
    name: node.name,
    description: node.description,
    position_x: node.position?.x,
    position_y: node.position?.y,
    execution_type: node.processBehavior?.executionType,
    dependencies: node.processBehavior?.dependencies,
    sla: node.businessLogic?.sla,
    kpis: node.businessLogic?.kpis,
    stage_data: node.functionModelData?.stage,
    action_data: node.functionModelData?.action,
    io_data: node.functionModelData?.io,
    container_data: node.functionModelData?.container,
    metadata: node.metadata
  }
}

private mapDbToFunctionModelNode(row: any): FunctionModelNode {
  return {
    nodeId: row.node_id,
    modelId: row.model_id,
    type: 'function-model',
    nodeType: row.node_type,
    name: row.name,
    description: row.description,
    position: { x: row.position_x, y: row.position_y },
    metadata: row.metadata,
    functionModelData: {
      stage: row.stage_data,
      action: row.action_data,
      io: row.io_data,
      container: row.container_data
    },
    businessLogic: {
      sla: row.sla,
      kpis: row.kpis,
      complexity: 'simple',
      estimatedDuration: 0
    },
    processBehavior: {
      executionType: row.execution_type,
      dependencies: row.dependencies || [],
      triggers: []
    },
    reactFlowData: {
      draggable: true,
      selectable: true,
      deletable: true
    },
    relationships: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
```

#### **Step 2: Enhance NodeRelationshipRepository**
**Objective**: Add missing methods and improve error handling

**Files to Modify**:
- `lib/infrastructure/repositories/node-relationship-repository.ts`

**Changes Required**:
```typescript
// ADD missing methods for function model relationships
async getByModelId(modelId: string): Promise<NodeRelationship[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('node_links')
    .select('*')
    .eq('source_entity_id', modelId)
    .eq('source_feature', 'function-model')
  
  if (error) {
    console.error('Failed to get relationships by model ID:', error)
    throw new Error(`Failed to get relationships by model ID: ${error.message}`)
  }
  
  return data.map(this.mapToNodeRelationship)
}

async createFunctionModelRelationship(
  sourceNodeId: string,
  targetNodeId: string,
  sourceHandle: string,
  targetHandle: string,
  modelId: string
): Promise<NodeRelationship> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('node_links')
    .insert({
      source_feature: 'function-model',
      source_entity_id: modelId,
      source_node_id: sourceNodeId,
      target_feature: 'function-model',
      target_entity_id: modelId,
      target_node_id: targetNodeId,
      link_type: 'default',
      link_strength: 1.0,
      link_context: {
        sourceHandle,
        targetHandle
      }
    })
    .select()
    .single()
  
  if (error) {
    console.error('Failed to create function model relationship:', error)
    throw new Error(`Failed to create function model relationship: ${error.message}`)
  }
  
  return this.mapToNodeRelationship(data)
}

// IMPROVE error handling and logging
private mapToNodeRelationship(data: any): NodeRelationship {
  return {
    id: data.link_id,
    sourceNodeId: data.source_node_id,
    targetNodeId: data.target_node_id,
    sourceHandle: data.link_context?.sourceHandle || '',
    targetHandle: data.link_context?.targetHandle || '',
    type: data.link_type,
    sourceNodeType: 'function-model',
    targetNodeType: 'function-model',
    metadata: data.link_context || {},
    createdAt: data.created_at
  }
}
```

### **Phase 2: Use Case Layer Integration (Week 2)**

#### **Step 3: Fix Function Model Use Cases**
**Objective**: Align use cases with correct repository methods

**Files to Modify**:
- `lib/application/use-cases/function-model-use-cases.ts`

**Changes Required**:
```typescript
// FIX imports to use correct repositories
import { FunctionModelRepository } from '../../infrastructure/repositories/function-model-repository'
import { SupabaseNodeRelationshipRepository } from '../../infrastructure/repositories/node-relationship-repository'

// Initialize correct repositories
const functionModelRepository = new FunctionModelRepository()
const nodeRelationshipRepository = new SupabaseNodeRelationshipRepository()

// FIX createFunctionModelNode to use correct repository
export const createFunctionModelNode = async (
  nodeType: FunctionModelNode['nodeType'],
  name: string,
  position: { x: number; y: number },
  modelId: string, // ADD modelId parameter
  options: FunctionModelNodeOptions = {}
): Promise<FunctionModelNode> => {
  // Preserve ALL existing validation
  if (!name.trim()) throw new Error('Node name is required')
  if (!nodeType) throw new Error('Node type is required')
  if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
    throw new Error('Valid position is required')
  }
  
  // Create node with ALL existing data structures
  const node: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'> = {
    modelId, // ADD modelId
    type: 'function-model',
    nodeType,
    name: name.trim(),
    description: options.description || '',
    position,
    metadata: {
      feature: 'function-model',
      version: '1.0',
      tags: options.metadata?.tags || [nodeType, 'function-model'],
      searchKeywords: options.metadata?.searchKeywords || [name, nodeType],
      crossFeatureLinks: options.metadata?.crossFeatureLinks || [],
      aiAgent: options.metadata?.aiAgent,
      vectorEmbedding: options.metadata?.vectorEmbedding
    },
    functionModelData: {},
    businessLogic: {
      complexity: 'simple',
      estimatedDuration: 0,
      ...options.businessLogic
    },
    processBehavior: {
      executionType: 'sequential',
      dependencies: [],
      triggers: [],
      ...options.processBehavior
    },
    reactFlowData: {
      draggable: true,
      selectable: true,
      deletable: true,
      ...options.reactFlowData
    },
    relationships: []
  }

  return await functionModelRepository.createFunctionModelNode(node)
}

// FIX createNodeRelationship to use correct repository
export const createNodeRelationship = async (
  sourceNodeId: string,
  targetNodeId: string,
  sourceHandle: string,
  targetHandle: string,
  modelId: string // ADD modelId parameter
): Promise<FunctionModelNode['relationships'][0]> => {
  // Preserve connection validation
  const sourceNode = await functionModelRepository.getFunctionModelNodeById(modelId, sourceNodeId)
  const targetNode = await functionModelRepository.getFunctionModelNodeById(modelId, targetNodeId)
  
  if (!sourceNode) {
    throw new Error(`Source node not found: ${sourceNodeId}`)
  }
  
  if (!targetNode) {
    throw new Error(`Target node not found: ${targetNodeId}`)
  }
  
  if (!validateConnection(sourceNode, targetNode, sourceHandle, targetHandle)) {
    const errorMessage = getConnectionValidationMessage(sourceNode, targetNode, sourceHandle, targetHandle)
    throw new Error(errorMessage || 'Invalid connection')
  }
  
  const relationship = await nodeRelationshipRepository.createFunctionModelRelationship(
    sourceNodeId,
    targetNodeId,
    sourceHandle,
    targetHandle,
    modelId
  )
  
  return {
    id: relationship.id,
    sourceNodeId: relationship.sourceNodeId,
    targetNodeId: relationship.targetNodeId,
    sourceHandle: relationship.sourceHandle,
    targetHandle: relationship.targetHandle,
    type: relationship.type,
    metadata: relationship.metadata
  }
}

// FIX getFunctionModelNodes to use correct repository
export const getFunctionModelNodes = async (modelId: string): Promise<FunctionModelNode[]> => {
  return await functionModelRepository.getFunctionModelNodes(modelId)
}

// FIX getNodeRelationships to use correct repository
export const getNodeRelationships = async (modelId: string): Promise<FunctionModelNode['relationships']> => {
  const relationships = await nodeRelationshipRepository.getByModelId(modelId)
  return relationships.map(rel => ({
    id: rel.id,
    sourceNodeId: rel.sourceNodeId,
    targetNodeId: rel.targetNodeId,
    sourceHandle: rel.sourceHandle,
    targetHandle: rel.targetHandle,
    type: rel.type,
    metadata: rel.metadata
  }))
}
```

### **Phase 3: Application Hook Integration (Week 3)**

#### **Step 4: Fix Application Hooks**
**Objective**: Align hooks with corrected use cases

**Files to Modify**:
- `lib/application/hooks/use-function-model-nodes.ts`

**Changes Required**:
```typescript
// FIX imports to use correct use cases
import {
  createFunctionModelNode,
  updateFunctionModelNode,
  createNodeRelationship,
  deleteNodeRelationship,
  getFunctionModelNodes,
  getNodeRelationships,
  deleteFunctionModelNode,
  getNodeById,
  searchFunctionModelNodes,
  getNodesByType,
  getConnectedNodes
} from '../use-cases/function-model-use-cases'

export function useFunctionModelNodes(modelId: string) {
  const [nodes, setNodes] = useState<FunctionModelNode[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // FIX createNode to pass modelId
  const createNode = useCallback(async (
    nodeType: FunctionModelNode['nodeType'],
    name: string,
    position: { x: number; y: number },
    options: FunctionModelNodeOptions = {}
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      const newNode = await createFunctionModelNode(nodeType, name, position, modelId, options)
      setNodes(prev => [...prev, newNode])
      return newNode
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create node'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [modelId])

  // FIX createConnection to pass modelId
  const createConnection = useCallback(async (
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle: string,
    targetHandle: string
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      const relationship = await createNodeRelationship(sourceNodeId, targetNodeId, sourceHandle, targetHandle, modelId)
      
      // Convert to React Flow edge
      const newEdge: Edge = {
        id: relationship.id,
        source: sourceNodeId,
        target: targetNodeId,
        sourceHandle,
        targetHandle,
        type: 'default'
      }
      
      setEdges(prev => [...prev, newEdge])
      return relationship
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create connection'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [modelId])

  // FIX loadNodes to use correct use case
  const loadNodes = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [loadedNodes, loadedRelationships] = await Promise.all([
        getFunctionModelNodes(modelId),
        getNodeRelationships(modelId)
      ])
      
      setNodes(loadedNodes)
      
      // Convert relationships to React Flow edges
      const reactFlowEdges: Edge[] = loadedRelationships.map(rel => ({
        id: rel.id,
        source: rel.sourceNodeId,
        target: rel.targetNodeId,
        sourceHandle: rel.sourceHandle,
        targetHandle: rel.targetHandle,
        type: 'default'
      }))
      
      setEdges(reactFlowEdges)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load nodes'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [modelId])

  // Load nodes on mount
  useEffect(() => {
    loadNodes()
  }, [loadNodes])

  return {
    nodes,
    edges,
    loading,
    error,
    createNode,
    updateNode: updateFunctionModelNode,
    createConnection,
    deleteConnection: deleteNodeRelationship,
    deleteNode: deleteFunctionModelNode,
    loadNodes,
    clearError: () => setError(null)
  }
}
```

### **Phase 4: Cross-Feature Linking Enhancement (Week 4)**

#### **Step 5: Enhance Cross-Feature Linking**
**Objective**: Ensure cross-feature linking works with node-level support

**Files to Modify**:
- `lib/infrastructure/repositories/function-model-repository.ts`

**Changes Required**:
```typescript
// ENHANCE cross-feature linking methods
async createCrossFeatureLink(
  sourceFeature: string,
  sourceId: string,
  sourceNodeId: string | null,
  targetFeature: string,
  targetId: string,
  targetNodeId: string | null,
  linkType: string,
  context?: Record<string, any>
): Promise<any> {
  const { data, error } = await this.supabase
    .from('cross_feature_links')
    .insert({
      source_feature: sourceFeature,
      source_id: sourceId,
      source_node_id: sourceNodeId,
      target_feature: targetFeature,
      target_id: targetId,
      target_node_id: targetNodeId,
      link_type: linkType,
      link_context: context || {},
      link_strength: 1.0,
      node_context: sourceNodeId ? { nodeId: sourceNodeId } : {}
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create cross-feature link:', error)
    throw new Error(`Failed to create cross-feature link: ${error.message}`)
  }

  return data
}

async getCrossFeatureLinks(sourceId: string, sourceFeature: string): Promise<any[]> {
  const { data, error } = await this.supabase
    .from('cross_feature_links')
    .select('*')
    .eq('source_id', sourceId)
    .eq('source_feature', sourceFeature)

  if (error) {
    console.error('Failed to get cross-feature links:', error)
    throw new Error(`Failed to get cross-feature links: ${error.message}`)
  }

  return data
}

// ADD node-level linking methods
async getNodeLinks(modelId: string, nodeId: string): Promise<any[]> {
  const { data, error } = await this.supabase
    .from('cross_feature_links')
    .select('*')
    .eq('source_id', modelId)
    .eq('source_feature', 'function-model')
    .eq('source_node_id', nodeId)

  if (error) {
    console.error('Failed to get node links:', error)
    throw new Error(`Failed to get node links: ${error.message}`)
  }

  return data
}
```

### **Phase 5: Performance Optimization (Week 5)**

#### **Step 6: Add Database Indexes**
**Objective**: Optimize query performance for large datasets

**Database Changes**:
```sql
-- Add indexes for function_model_nodes table
CREATE INDEX CONCURRENTLY idx_function_model_nodes_model_id 
ON function_model_nodes(model_id);

CREATE INDEX CONCURRENTLY idx_function_model_nodes_node_type 
ON function_model_nodes(node_type);

CREATE INDEX CONCURRENTLY idx_function_model_nodes_position 
ON function_model_nodes(position_x, position_y);

-- Add indexes for cross_feature_links table
CREATE INDEX CONCURRENTLY idx_cross_feature_links_source 
ON cross_feature_links(source_id, source_feature);

CREATE INDEX CONCURRENTLY idx_cross_feature_links_node 
ON cross_feature_links(source_node_id) WHERE source_node_id IS NOT NULL;

-- Add indexes for node_links table
CREATE INDEX CONCURRENTLY idx_node_links_source 
ON node_links(source_entity_id, source_feature);

CREATE INDEX CONCURRENTLY idx_node_links_target 
ON node_links(target_entity_id, target_feature);
```

#### **Step 7: Add Batch Operations**
**Objective**: Support efficient bulk operations

**Files to Add**:
- `lib/infrastructure/repositories/function-model-repository.ts`

**Changes Required**:
```typescript
// ADD batch operations
async bulkCreateNodes(nodes: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>[]): Promise<FunctionModelNode[]> {
  const { data, error } = await this.supabase
    .from('function_model_nodes')
    .insert(nodes.map(node => this.mapFunctionModelNodeToDb(node)))
    .select()

  if (error) {
    console.error('Failed to bulk create nodes:', error)
    throw new Error(`Failed to bulk create nodes: ${error.message}`)
  }

  return data.map(this.mapDbToFunctionModelNode)
}

async bulkUpdateNodes(updates: Array<{ nodeId: string; updates: Partial<FunctionModelNode> }>): Promise<void> {
  const updatePromises = updates.map(({ nodeId, updates }) => 
    this.updateFunctionModelNode(nodeId, updates)
  )
  
  await Promise.all(updatePromises)
}

async bulkDeleteNodes(nodeIds: string[]): Promise<void> {
  const { error } = await this.supabase
    .from('function_model_nodes')
    .delete()
    .in('node_id', nodeIds)

  if (error) {
    console.error('Failed to bulk delete nodes:', error)
    throw new Error(`Failed to bulk delete nodes: ${error.message}`)
  }
}
```

### **Phase 6: Legacy Component Cleanup (Week 6)**

#### **Step 8: Replace Legacy Presentation Components**
**Objective**: Replace legacy components with node-based equivalents

**Files to Modify**:
- `app/(private)/dashboard/function-model/components/function-process-dashboard.tsx`
- `components/composites/function-model/function-model-dashboard.tsx`
- `components/composites/function-model/node-canvas.tsx`

**Changes Required**:
```typescript
// REPLACE legacy FunctionModel interface usage with FunctionModelNode
// UPDATE all imports to use node-based types
// REPLACE old data structures with node-based equivalents
// UPDATE component props to use FunctionModelNode instead of FunctionModel
// REPLACE old state management with node-based state
// UPDATE all event handlers to work with node-based data
```

#### **Step 9: Remove Unused Legacy Types**
**Objective**: Clean up legacy domain types and interfaces

**Files to Modify**:
- `lib/domain/entities/function-model-types.ts`

**Changes Required**:
```typescript
// REMOVE legacy FunctionModel interface
// REMOVE legacy FunctionModelData interface
// REMOVE legacy FunctionModelOptions interface
// REMOVE legacy FunctionModelValidation interface
// KEEP only node-based types and interfaces
// UPDATE all imports to use FunctionModelNode types
```

#### **Step 10: Update All Imports**
**Objective**: Ensure all components use node-based architecture

**Files to Modify**:
- All files importing legacy types and components

**Changes Required**:
```typescript
// UPDATE all imports to use node-based components
// REPLACE legacy use case imports with node-based use cases
// UPDATE component imports to use new node-based components
// REMOVE unused legacy imports
// VERIFY all imports are using correct node-based types
```

### **Phase 7: Legacy Code Removal (Week 7)**

#### **Step 11: Remove Unused Legacy Repository Methods**
**Objective**: Clean up legacy repository methods

**Files to Modify**:
- `lib/infrastructure/repositories/function-model-repository.ts`

**Changes Required**:
```typescript
// REMOVE legacy CRUD methods (create, getById, getAll, update, delete, search)
// REMOVE legacy JSONB approach methods
// REMOVE legacy mapping functions that don't match database schema
// KEEP only node-based methods (createFunctionModelNode, getFunctionModelNodes, etc.)
// VERIFY all methods align with actual database schema
```

#### **Step 12: Delete Legacy Use Cases**
**Objective**: Remove legacy use cases and persistence logic

**Files to Delete**:
- `lib/application/use-cases/function-model-persistence-use-cases.ts`

**Changes Required**:
```typescript
// DELETE entire legacy use case file
// REMOVE all imports of legacy use cases
// VERIFY no components are importing legacy use cases
// UPDATE any remaining references to use node-based use cases
```

#### **Step 13: Clean Up Unused Dependencies**
**Objective**: Remove unused imports and dependencies

**Files to Modify**:
- All files with legacy imports

**Changes Required**:
```typescript
// REMOVE unused legacy type imports
// REMOVE unused legacy component imports
// REMOVE unused legacy use case imports
// REMOVE unused legacy repository imports
// VERIFY all imports are necessary and correct
// RUN linting to identify any remaining unused imports
```

## Compatibility Assurance

### **Data Preservation Measures**
1. **Existing Data Protection**: All existing data in `function_model_nodes` (5 nodes) and `function_models` (1 model) will be preserved
2. **Backward Compatibility**: Repository interfaces maintain the same method signatures
3. **Error Handling**: Comprehensive error handling prevents data loss during operations
4. **Transaction Safety**: All operations use proper database transactions

### **Integration Compatibility**
1. **Use Case Compatibility**: All use cases maintain the same interface
2. **Hook Compatibility**: Application hooks maintain the same state management patterns
3. **UI Compatibility**: React components continue to work with updated data flow
4. **Type Safety**: All TypeScript types remain consistent

### **Performance Compatibility**
1. **Query Optimization**: New indexes improve performance without breaking existing queries
2. **Batch Operations**: Bulk operations improve performance for large datasets
3. **Caching Strategy**: Maintain existing caching patterns
4. **Error Recovery**: Robust error handling prevents cascading failures

## Implementation Considerations

### **Technical Considerations**
1. **Database Migration**: No schema changes required - only repository alignment
2. **Performance Impact**: Improved performance through proper indexing and batch operations
3. **Scalability**: Support for 1000+ nodes per function model
4. **Maintainability**: Cleaner code structure with proper separation of concerns

### **Risk Mitigation**
1. **Data Loss Risk**: Comprehensive testing with existing data before deployment
2. **Performance Risk**: Monitor query performance and add indexes as needed
3. **Integration Risk**: Gradual rollout with feature flags
4. **User Experience Risk**: Maintain existing UI patterns and error messages

### **Long-term Implications**
1. **Scalability**: Infrastructure can support growing node counts
2. **Extensibility**: Easy to add new node types and features
3. **Maintainability**: Clear separation between layers makes future changes easier
4. **Performance**: Optimized queries and batch operations support future growth

## Success Metrics

### **Functional Metrics**
- **Node Operations**: 100% successful CRUD operations
- **Relationship Management**: 100% successful edge creation/deletion
- **Cross-Feature Linking**: Support for 1000+ cross-feature relationships
- **Performance**: <500ms response time for all operations
- **Data Integrity**: 100% data consistency across all operations

### **Technical Metrics**
- **Code Quality**: 100% TypeScript type safety
- **Error Handling**: Comprehensive error messages and recovery
- **Database Performance**: Optimized queries with proper indexing
- **Scalability**: Support for 10,000+ nodes per function model
- **Maintainability**: Clear separation between layers

## Timeline and Milestones

### **Week 1: Repository Layer Alignment**
- [ ] Fix FunctionModelRepository implementation
- [ ] Enhance NodeRelationshipRepository
- [ ] Add proper mapping functions
- [ ] Test with existing data

### **Week 2: Use Case Layer Integration**
- [ ] Fix function model use cases
- [ ] Update repository imports
- [ ] Add proper error handling
- [ ] Test use case integration

### **Week 3: Application Hook Integration**
- [ ] Fix application hooks
- [ ] Update use case imports
- [ ] Add proper state management
- [ ] Test hook integration

### **Week 4: Cross-Feature Linking Enhancement**
- [ ] Enhance cross-feature linking
- [ ] Add node-level support
- [ ] Test linking functionality
- [ ] Verify data consistency

### **Week 5: Performance Optimization**
- [ ] Add database indexes
- [ ] Implement batch operations
- [ ] Performance testing
- [ ] Documentation updates

### **Week 6: Legacy Component Cleanup**
- [ ] Replace legacy presentation components with node-based equivalents
- [ ] Remove unused legacy types and interfaces
- [ ] Update all imports to use node-based components
- [ ] Test complete migration to node-based architecture

### **Week 7: Legacy Code Removal**
- [ ] Remove unused legacy repository methods
- [ ] Delete legacy domain types and interfaces
- [ ] Remove legacy use cases and persistence logic
- [ ] Clean up unused imports and dependencies

## Detailed Implementation Steps for Cleanup

### **Phase 6: Legacy Component Cleanup (Week 6)**

#### **Step 8: Replace Legacy Presentation Components**
**Objective**: Replace legacy components with node-based equivalents

**Files to Modify**:
- `app/(private)/dashboard/function-model/components/function-process-dashboard.tsx`
- `components/composites/function-model/function-model-dashboard.tsx`
- `components/composites/function-model/node-canvas.tsx`

**Changes Required**:
```typescript
// REPLACE legacy FunctionModel interface usage with FunctionModelNode
// UPDATE all imports to use node-based types
// REPLACE old data structures with node-based equivalents
// UPDATE component props to use FunctionModelNode instead of FunctionModel
// REPLACE old state management with node-based state
// UPDATE all event handlers to work with node-based data
```

#### **Step 9: Remove Unused Legacy Types**
**Objective**: Clean up legacy domain types and interfaces

**Files to Modify**:
- `lib/domain/entities/function-model-types.ts`

**Changes Required**:
```typescript
// REMOVE legacy FunctionModel interface
// REMOVE legacy FunctionModelData interface
// REMOVE legacy FunctionModelOptions interface
// REMOVE legacy FunctionModelValidation interface
// KEEP only node-based types and interfaces
// UPDATE all imports to use FunctionModelNode types
```

#### **Step 10: Update All Imports**
**Objective**: Ensure all components use node-based architecture

**Files to Modify**:
- All files importing legacy types and components

**Changes Required**:
```typescript
// UPDATE all imports to use node-based components
// REPLACE legacy use case imports with node-based use cases
// UPDATE component imports to use new node-based components
// REMOVE unused legacy imports
// VERIFY all imports are using correct node-based types
```

### **Phase 7: Legacy Code Removal (Week 7)**

#### **Step 11: Remove Unused Legacy Repository Methods**
**Objective**: Clean up legacy repository methods

**Files to Modify**:
- `lib/infrastructure/repositories/function-model-repository.ts`

**Changes Required**:
```typescript
// REMOVE legacy CRUD methods (create, getById, getAll, update, delete, search)
// REMOVE legacy JSONB approach methods
// REMOVE legacy mapping functions that don't match database schema
// KEEP only node-based methods (createFunctionModelNode, getFunctionModelNodes, etc.)
// VERIFY all methods align with actual database schema
```

#### **Step 12: Delete Legacy Use Cases**
**Objective**: Remove legacy use cases and persistence logic

**Files to Delete**:
- `lib/application/use-cases/function-model-persistence-use-cases.ts`

**Changes Required**:
```typescript
// DELETE entire legacy use case file
// REMOVE all imports of legacy use cases
// VERIFY no components are importing legacy use cases
// UPDATE any remaining references to use node-based use cases
```

#### **Step 13: Clean Up Unused Dependencies**
**Objective**: Remove unused imports and dependencies

**Files to Modify**:
- All files with legacy imports

**Changes Required**:
```typescript
// REMOVE unused legacy type imports
// REMOVE unused legacy component imports
// REMOVE unused legacy use case imports
// REMOVE unused legacy repository imports
// VERIFY all imports are necessary and correct
// RUN linting to identify any remaining unused imports
```

## Conclusion

This infrastructure layer implementation plan provides a comprehensive approach to aligning the repository layer with the actual database schema while preserving all existing functionality and data. The phased approach ensures minimal disruption while providing significant improvements in performance, maintainability, and scalability.

The plan addresses the core issues identified in the current flow analysis:
1. **Repository Misalignment**: Fixed by aligning with actual database schema
2. **Use Case Integration**: Fixed by using correct repository methods
3. **Application Hook Issues**: Fixed by updating data flow
4. **Performance Problems**: Fixed by adding indexes and batch operations

The implementation maintains backward compatibility while providing a solid foundation for future enhancements and growth. 