# Function Model Node Architecture Migration Plan

## Overview

This plan outlines the migration of the Function Model feature from the current unified node system to the new node-based architecture that uses separate tables for each feature while maintaining cross-feature node connectivity. The migration will preserve all existing functionality while enabling enhanced scalability, AI integration, and cross-feature linking.

## Current State Analysis

### ✅ **Existing Strengths**
- **Clean Architecture**: Perfect implementation of Clean Architecture principles
- **Dedicated Table**: Already using separate `function_models` table (not unified nodes)
- **Rich Metadata**: Comprehensive function model specific fields and metadata
- **Version Control**: Built-in versioning system with `function_model_versions`
- **Cross-Feature Links**: Separate `cross_feature_links` table for relationships
- **Node-Level Linking**: Individual nodes can link to other features via `node_context`
- **Complete UI**: Save/load panels, version dialogs, cross-feature linking

### 🔄 **Migration Requirements**
- **Node Extraction**: Extract nodes from `nodes_data` JSONB to individual `function_model_nodes` table
- **Node Metadata Separation**: Create dedicated `node_metadata` table for AI and search
- **Enhanced Cross-Feature Links**: Upgrade to new `node_links` table with type-specific context
- **AI Integration**: Add `ai_agents` table for node-level AI capabilities
- **Behavior Abstraction**: Implement node behavior patterns for different node types

## Migration Strategy

### Phase 1: Database Schema Enhancement (Week 1)

#### 1.1 Create New Node Tables
**Objective**: Create dedicated tables for function model nodes and metadata

**Database Schema Updates**:
```sql
-- Enhanced Function Model Nodes (Process/Workflow)
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

-- Node Metadata Table (for shared node properties)
CREATE TABLE node_metadata (
  metadata_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity reference
  feature_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  node_id VARCHAR(255), -- Optional: specific node within entity
  
  -- Node properties
  node_type VARCHAR(50) NOT NULL,
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  
  -- AI and search
  vector_embedding VECTOR(1536),
  search_keywords TEXT[] DEFAULT '{}',
  ai_agent_config JSONB,
  
  -- Visual properties
  visual_properties JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_feature_type CHECK (
    feature_type IN ('function-model', 'knowledge-base', 'event-storm', 'spindle')
  )
);

-- Enhanced Node Links with Type-Specific Context
CREATE TABLE node_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source node
  source_feature VARCHAR(50) NOT NULL,
  source_entity_id UUID NOT NULL,
  source_node_id VARCHAR(255),
  
  -- Target node
  target_feature VARCHAR(50) NOT NULL,
  target_entity_id UUID NOT NULL,
  target_node_id VARCHAR(255),
  
  -- Link properties
  link_type VARCHAR(50) NOT NULL,
  link_strength DECIMAL(3,2) DEFAULT 1.0,
  link_context JSONB NOT NULL DEFAULT '{}',
  
  -- Type-specific context (based on source and target types)
  process_context JSONB, -- For function model links
  content_context JSONB, -- For knowledge base links
  integration_context JSONB, -- For spindle links
  domain_context JSONB, -- For event storm links
  
  -- Visual properties
  visual_properties JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT no_self_link CHECK (
    NOT (source_feature = target_feature AND source_entity_id = target_entity_id AND source_node_id = target_node_id)
  ),
  CONSTRAINT valid_features CHECK (
    source_feature IN ('function-model', 'knowledge-base', 'event-storm', 'spindle') AND
    target_feature IN ('function-model', 'knowledge-base', 'event-storm', 'spindle')
  )
);

-- AI Agents Table (for node-level AI integration)
CREATE TABLE ai_agents (
  agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Node reference
  feature_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  node_id VARCHAR(255),
  
  -- Agent configuration
  name VARCHAR(255) NOT NULL,
  instructions TEXT,
  tools JSONB NOT NULL DEFAULT '[]',
  capabilities JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Status
  is_enabled BOOLEAN DEFAULT true,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 1.2 Data Migration Script
**Objective**: Migrate existing function model nodes to new structure

**Migration Strategy**:
```typescript
// lib/infrastructure/migrations/function-model-node-migration.ts

export async function migrateFunctionModelNodes() {
  const { functionModelRepository } = await import('@/lib/infrastructure/repositories/function-model-repository')
  const { createFunctionModelNode, createNodeMetadata } = await import('@/lib/application/use-cases/node-operations')
  
  // Get all function models
  const models = await functionModelRepository.getAll()
  
  for (const model of models) {
    console.log(`Migrating nodes for model: ${model.name}`)
    
    // Extract nodes from nodes_data JSONB
    const nodes = model.nodesData || []
    
    for (const node of nodes) {
      try {
        // Create individual node record
        const nodeData = {
          modelId: model.modelId,
          nodeType: node.type,
          name: node.data?.label || `Node ${node.id}`,
          description: node.data?.description,
          positionX: node.position?.x || 0,
          positionY: node.position?.y || 0,
          
          // Extract feature-specific data
          stageData: node.data?.stageData,
          actionData: node.data?.actionData,
          ioData: node.data?.portData,
          containerData: node.data?.containerData,
          
          // Process-specific properties
          executionType: 'sequential',
          dependencies: [],
          timeout: 30,
          retryPolicy: { maxRetries: 3, backoff: 'exponential' },
          
          // Business logic properties
          raciMatrix: node.data?.stageData?.raci || {},
          sla: { responseTime: 24, availability: 99.9 },
          kpis: [],
          
          metadata: {
            ...node.data,
            originalNodeId: node.id,
            migratedAt: new Date().toISOString()
          }
        }
        
        const createdNode = await createFunctionModelNode(nodeData)
        
        // Create node metadata
        const metadataData = {
          featureType: 'function-model',
          entityId: model.modelId,
          nodeId: createdNode.nodeId,
          nodeType: node.type,
          positionX: node.position?.x || 0,
          positionY: node.position?.y || 0,
          searchKeywords: extractSearchKeywords(node),
          visualProperties: {
            color: getNodeColor(node.type),
            icon: getNodeIcon(node.type),
            size: 'medium'
          }
        }
        
        await createNodeMetadata(metadataData)
        
        console.log(`✓ Migrated node: ${node.id} -> ${createdNode.nodeId}`)
        
      } catch (error) {
        console.error(`✗ Failed to migrate node ${node.id}:`, error)
      }
    }
  }
  
  console.log('Node migration completed')
}

// Helper functions
function extractSearchKeywords(node: any): string[] {
  const keywords: string[] = []
  
  if (node.data?.label) keywords.push(node.data.label)
  if (node.data?.description) keywords.push(node.data.description)
  if (node.data?.stageData?.name) keywords.push(node.data.stageData.name)
  if (node.data?.actionData?.name) keywords.push(node.data.actionData.name)
  
  return keywords
}

function getNodeColor(nodeType: string): string {
  const colors = {
    stageNode: '#10b981',
    actionTableNode: '#3b82f6',
    ioNode: '#f59e0b',
    functionModelContainer: '#8b5cf6'
  }
  return colors[nodeType] || '#6b7280'
}

function getNodeIcon(nodeType: string): string {
  const icons = {
    stageNode: 'layers',
    actionTableNode: 'table',
    ioNode: 'arrow-left-right',
    functionModelContainer: 'git-branch'
  }
  return icons[nodeType] || 'circle'
}
```

### Phase 2: Domain Layer Updates (Week 2)

#### 2.1 Enhanced Function Model Node Types
**Objective**: Update domain entities to support new node architecture

**Updated Function Model Node Types**:
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
    dependencies: string[] // IDs of dependent nodes
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

// Node behavior abstraction
export interface ProcessNodeBehavior extends NodeBehavior {
  execute(): Promise<ExecutionResult>
  rollback(): Promise<void>
  getExecutionPath(): string[]
  validateDependencies(): ValidationResult
}

export class ProcessNodeBehaviorImpl implements ProcessNodeBehavior {
  constructor(private node: FunctionModelNode) {}
  
  async execute(): Promise<ExecutionResult> {
    switch (this.node.nodeType) {
      case 'stageNode':
        return await this.executeStage()
      case 'actionTableNode':
        return await this.executeAction()
      case 'ioNode':
        return await this.executeIO()
      case 'functionModelContainer':
        return await this.executeContainer()
      default:
        throw new Error(`Unknown node type: ${this.node.nodeType}`)
    }
  }
  
  async rollback(): Promise<void> {
    // Implement rollback logic for process nodes
  }
  
  getExecutionPath(): string[] {
    return this.node.processBehavior?.dependencies || []
  }
  
  validateDependencies(): ValidationResult {
    const errors: string[] = []
    
    // Validate that all dependencies exist
    for (const depId of this.node.processBehavior?.dependencies || []) {
      // Check if dependency exists
      if (!this.dependencyExists(depId)) {
        errors.push(`Dependency not found: ${depId}`)
      }
    }
    
    return { isValid: errors.length === 0, errors }
  }
  
  private async executeStage(): Promise<ExecutionResult> {
    const stage = this.node.functionModelData.stage
    if (!stage) throw new Error('Stage data not found')
    
    // Execute stage logic
    return {
      success: true,
      output: stage.actions,
      executionTime: Date.now()
    }
  }
  
  private async executeAction(): Promise<ExecutionResult> {
    const action = this.node.functionModelData.action
    if (!action) throw new Error('Action data not found')
    
    // Execute action logic
    return {
      success: true,
      output: action,
      executionTime: Date.now()
    }
  }
  
  private async executeIO(): Promise<ExecutionResult> {
    const io = this.node.functionModelData.io
    if (!io) throw new Error('IO data not found')
    
    // Execute IO logic
    return {
      success: true,
      output: io,
      executionTime: Date.now()
    }
  }
  
  private async executeContainer(): Promise<ExecutionResult> {
    const container = this.node.functionModelData.container
    if (!container) throw new Error('Container data not found')
    
    // Execute container logic
    return {
      success: true,
      output: container,
      executionTime: Date.now()
    }
  }
  
  private dependencyExists(depId: string): boolean {
    // Implementation to check if dependency exists
    return true // Placeholder
  }
}
```

#### 2.2 Node Behavior Factory
**Objective**: Create factory for handling different node types

**Node Behavior Factory**:
```typescript
// lib/domain/entities/node-behavior-factory.ts

export class NodeBehaviorFactory {
  static createBehavior(node: BaseNode): NodeBehavior {
    switch (node.featureType) {
      case 'function-model':
        return new ProcessNodeBehaviorImpl(node as FunctionModelNode)
      case 'knowledge-base':
        return new ContentNodeBehavior(node as KnowledgeBaseNode)
      case 'spindle':
        return new IntegrationNodeBehavior(node as SpindleNode)
      case 'event-storm':
        return new DomainNodeBehavior(node as EventStormNode)
      default:
        throw new Error(`Unknown feature type: ${node.featureType}`)
    }
  }
}

// Unified node operations interface
export interface UnifiedNodeOperations {
  // Universal node operations (work across all node types)
  createNode<T extends BaseNode>(node: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>
  getNode<T extends BaseNode>(featureType: FeatureType, entityId: string, nodeId?: string): Promise<T | null>
  updateNode<T extends BaseNode>(featureType: FeatureType, entityId: string, nodeId: string, updates: Partial<T>): Promise<T>
  deleteNode(featureType: FeatureType, entityId: string, nodeId: string): Promise<void>
  
  // Cross-feature operations
  createNodeLink(link: Omit<NodeLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<NodeLink>
  getNodeLinks(featureType: FeatureType, entityId: string, nodeId?: string): Promise<NodeLink[]>
  getConnectedNodes(featureType: FeatureType, entityId: string, nodeId?: string): Promise<BaseNode[]>
  
  // Feature-specific operations (delegated to appropriate handlers)
  executeNode(featureType: FeatureType, entityId: string, nodeId: string, context?: any): Promise<any>
  validateNode(featureType: FeatureType, entityId: string, nodeId: string): Promise<ValidationResult>
  getNodeBehavior(featureType: FeatureType, entityId: string, nodeId: string): Promise<NodeBehavior>
}
```

### Phase 3: Infrastructure Layer Updates (Week 3)

#### 3.1 Enhanced Function Model Repository
**Objective**: Update repository to work with new node structure

**Enhanced Repository Methods**:
```typescript
// lib/infrastructure/repositories/function-model-repository.ts

export class FunctionModelRepository {
  // ... existing methods ...
  
  // NEW: Node-specific operations
  async createFunctionModelNode(nodeData: Omit<FunctionModelNode, 'nodeId' | 'createdAt' | 'updatedAt'>): Promise<FunctionModelNode> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .insert({
        model_id: nodeData.modelId,
        node_type: nodeData.nodeType,
        name: nodeData.name,
        description: nodeData.description,
        position_x: nodeData.positionX,
        position_y: nodeData.positionY,
        execution_type: nodeData.processBehavior?.executionType,
        dependencies: nodeData.processBehavior?.dependencies,
        timeout: nodeData.processBehavior?.timeout,
        retry_policy: nodeData.processBehavior?.retryPolicy,
        raci_matrix: nodeData.businessLogic?.raciMatrix,
        sla: nodeData.businessLogic?.sla,
        kpis: nodeData.businessLogic?.kpis,
        stage_data: nodeData.functionModelData?.stage,
        action_data: nodeData.functionModelData?.action,
        io_data: nodeData.functionModelData?.io,
        container_data: nodeData.functionModelData?.container,
        metadata: nodeData.metadata
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create function model node: ${error.message}`)
    }

    return this.mapDatabaseToFunctionModelNode(data)
  }

  async getFunctionModelNodes(modelId: string): Promise<FunctionModelNode[]> {
    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to get function model nodes: ${error.message}`)
    }

    return data.map(this.mapDatabaseToFunctionModelNode)
  }

  async updateFunctionModelNode(nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode> {
    const updateData: any = {}
    
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.positionX !== undefined) updateData.position_x = updates.positionX
    if (updates.positionY !== undefined) updateData.position_y = updates.positionY
    if (updates.processBehavior !== undefined) {
      updateData.execution_type = updates.processBehavior.executionType
      updateData.dependencies = updates.processBehavior.dependencies
      updateData.timeout = updates.processBehavior.timeout
      updateData.retry_policy = updates.processBehavior.retryPolicy
    }
    if (updates.businessLogic !== undefined) {
      updateData.raci_matrix = updates.businessLogic.raciMatrix
      updateData.sla = updates.businessLogic.sla
      updateData.kpis = updates.businessLogic.kpis
    }
    if (updates.functionModelData !== undefined) {
      updateData.stage_data = updates.functionModelData.stage
      updateData.action_data = updates.functionModelData.action
      updateData.io_data = updates.functionModelData.io
      updateData.container_data = updates.functionModelData.container
    }
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await this.supabase
      .from('function_model_nodes')
      .update(updateData)
      .eq('node_id', nodeId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update function model node: ${error.message}`)
    }

    return this.mapDatabaseToFunctionModelNode(data)
  }

  async deleteFunctionModelNode(nodeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('function_model_nodes')
      .delete()
      .eq('node_id', nodeId)

    if (error) {
      throw new Error(`Failed to delete function model node: ${error.message}`)
    }
  }

  // Helper method to map database row to entity
  private mapDatabaseToFunctionModelNode(row: any): FunctionModelNode {
    return {
      nodeId: row.node_id,
      modelId: row.model_id,
      featureType: 'function-model',
      nodeType: row.node_type,
      name: row.name,
      description: row.description,
      positionX: row.position_x,
      positionY: row.position_y,
      processBehavior: {
        executionType: row.execution_type,
        dependencies: row.dependencies || [],
        timeout: row.timeout,
        retryPolicy: row.retry_policy
      },
      businessLogic: {
        raciMatrix: row.raci_matrix,
        sla: row.sla,
        kpis: row.kpis
      },
      functionModelData: {
        stage: row.stage_data,
        action: row.action_data,
        io: row.io_data,
        container: row.container_data
      },
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}
```

#### 3.2 Node Metadata Repository
**Objective**: Create repository for node metadata operations

**Node Metadata Repository**:
```typescript
// lib/infrastructure/repositories/node-metadata-repository.ts

export class NodeMetadataRepository {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async createNodeMetadata(metadata: Omit<NodeMetadata, 'metadataId' | 'createdAt' | 'updatedAt'>): Promise<NodeMetadata> {
    const { data, error } = await this.supabase
      .from('node_metadata')
      .insert({
        feature_type: metadata.featureType,
        entity_id: metadata.entityId,
        node_id: metadata.nodeId,
        node_type: metadata.nodeType,
        position_x: metadata.positionX,
        position_y: metadata.positionY,
        vector_embedding: metadata.vectorEmbedding,
        search_keywords: metadata.searchKeywords,
        ai_agent_config: metadata.aiAgentConfig,
        visual_properties: metadata.visualProperties
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create node metadata: ${error.message}`)
    }

    return this.mapDatabaseToNodeMetadata(data)
  }

  async getNodeMetadata(featureType: FeatureType, entityId: string, nodeId?: string): Promise<NodeMetadata | null> {
    let query = this.supabase
      .from('node_metadata')
      .select('*')
      .eq('feature_type', featureType)
      .eq('entity_id', entityId)

    if (nodeId) {
      query = query.eq('node_id', nodeId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get node metadata: ${error.message}`)
    }

    return this.mapDatabaseToNodeMetadata(data)
  }

  async updateNodeMetadata(metadataId: string, updates: Partial<NodeMetadata>): Promise<NodeMetadata> {
    const updateData: any = {}
    
    if (updates.positionX !== undefined) updateData.position_x = updates.positionX
    if (updates.positionY !== undefined) updateData.position_y = updates.positionY
    if (updates.vectorEmbedding !== undefined) updateData.vector_embedding = updates.vectorEmbedding
    if (updates.searchKeywords !== undefined) updateData.search_keywords = updates.searchKeywords
    if (updates.aiAgentConfig !== undefined) updateData.ai_agent_config = updates.aiAgentConfig
    if (updates.visualProperties !== undefined) updateData.visual_properties = updates.visualProperties

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await this.supabase
      .from('node_metadata')
      .update(updateData)
      .eq('metadata_id', metadataId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update node metadata: ${error.message}`)
    }

    return this.mapDatabaseToNodeMetadata(data)
  }

  private mapDatabaseToNodeMetadata(row: any): NodeMetadata {
    return {
      metadataId: row.metadata_id,
      featureType: row.feature_type,
      entityId: row.entity_id,
      nodeId: row.node_id,
      nodeType: row.node_type,
      positionX: row.position_x,
      positionY: row.position_y,
      vectorEmbedding: row.vector_embedding,
      searchKeywords: row.search_keywords || [],
      aiAgentConfig: row.ai_agent_config,
      visualProperties: row.visual_properties,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }
}
```

### Phase 4: Application Layer Updates (Week 4)

#### 4.1 Enhanced Use Cases
**Objective**: Update use cases to work with new node structure

**Enhanced Function Model Use Cases**:
```typescript
// lib/application/use-cases/function-model-node-operations.ts

export async function createFunctionModelNode(
  modelId: string,
  nodeData: Omit<FunctionModelNode, 'nodeId' | 'modelId' | 'createdAt' | 'updatedAt'>
): Promise<FunctionModelNode> {
  // Validate node data
  validateFunctionModelNode(nodeData)
  
  // Create node in dedicated table
  const node = await functionModelRepository.createFunctionModelNode({
    ...nodeData,
    modelId
  })
  
  // Create node metadata
  await nodeMetadataRepository.createNodeMetadata({
    featureType: 'function-model',
    entityId: modelId,
    nodeId: node.nodeId,
    nodeType: node.nodeType,
    positionX: node.positionX,
    positionY: node.positionY,
    searchKeywords: extractSearchKeywords(node),
    visualProperties: {
      color: getNodeColor(node.nodeType),
      icon: getNodeIcon(node.nodeType),
      size: 'medium'
    }
  })
  
  return node
}

export async function getFunctionModelNodes(modelId: string): Promise<FunctionModelNode[]> {
  return await functionModelRepository.getFunctionModelNodes(modelId)
}

export async function updateFunctionModelNode(
  nodeId: string,
  updates: Partial<FunctionModelNode>
): Promise<FunctionModelNode> {
  // Update node
  const updatedNode = await functionModelRepository.updateFunctionModelNode(nodeId, updates)
  
  // Update metadata if position changed
  if (updates.positionX !== undefined || updates.positionY !== undefined) {
    await nodeMetadataRepository.updateNodeMetadata(nodeId, {
      positionX: updatedNode.positionX,
      positionY: updatedNode.positionY
    })
  }
  
  return updatedNode
}

export async function deleteFunctionModelNode(nodeId: string): Promise<void> {
  // Delete node metadata first
  await nodeMetadataRepository.deleteNodeMetadata(nodeId)
  
  // Delete node
  await functionModelRepository.deleteFunctionModelNode(nodeId)
}

export async function executeFunctionModelNode(
  nodeId: string,
  context?: any
): Promise<ExecutionResult> {
  const node = await functionModelRepository.getFunctionModelNodeById(nodeId)
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`)
  }
  
  const behavior = NodeBehaviorFactory.createBehavior(node)
  return await behavior.execute()
}

export async function validateFunctionModelNode(nodeId: string): Promise<ValidationResult> {
  const node = await functionModelRepository.getFunctionModelNodeById(nodeId)
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`)
  }
  
  const behavior = NodeBehaviorFactory.createBehavior(node)
  return await behavior.validate()
}
```

#### 4.2 Enhanced Hooks
**Objective**: Update hooks to work with new node structure

**Enhanced Function Model Hooks**:
```typescript
// lib/application/hooks/use-function-model-nodes.ts

export function useFunctionModelNodes(modelId: string) {
  const [nodes, setNodes] = useState<FunctionModelNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNodes = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const modelNodes = await getFunctionModelNodes(modelId)
      setNodes(modelNodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load nodes')
    } finally {
      setLoading(false)
    }
  }, [modelId])

  const createNode = useCallback(async (nodeData: Omit<FunctionModelNode, 'nodeId' | 'modelId' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true)
    setError(null)
    
    try {
      const newNode = await createFunctionModelNode(modelId, nodeData)
      setNodes(prev => [...prev, newNode])
      return newNode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node')
      throw err
    } finally {
      setLoading(false)
    }
  }, [modelId])

  const updateNode = useCallback(async (nodeId: string, updates: Partial<FunctionModelNode>) => {
    setLoading(true)
    setError(null)
    
    try {
      const updatedNode = await updateFunctionModelNode(nodeId, updates)
      setNodes(prev => prev.map(node => node.nodeId === nodeId ? updatedNode : node))
      return updatedNode
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update node')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteNode = useCallback(async (nodeId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      await deleteFunctionModelNode(nodeId)
      setNodes(prev => prev.filter(node => node.nodeId !== nodeId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete node')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const executeNode = useCallback(async (nodeId: string, context?: any) => {
    try {
      return await executeFunctionModelNode(nodeId, context)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute node')
      throw err
    }
  }, [])

  const validateNode = useCallback(async (nodeId: string) => {
    try {
      return await validateFunctionModelNode(nodeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate node')
      throw err
    }
  }, [])

  return {
    nodes,
    loading,
    error,
    loadNodes,
    createNode,
    updateNode,
    deleteNode,
    executeNode,
    validateNode
  }
}
```

### Phase 5: Presentation Layer Updates (Week 5)

#### 5.1 Enhanced Node Components
**Objective**: Update UI components to work with new node structure

**Enhanced Flow Nodes**:
```typescript
// app/(private)/dashboard/function-model/components/flow-nodes.tsx

export function StageNode(props: NodeProps) {
  const { id, data, isConnectable } = props
  const { updateNode, executeNode, validateNode } = useFunctionModelNodes(data.modelId)
  const { links } = useNodeLinking(data.modelId, id)
  
  const handleExecute = useCallback(async () => {
    try {
      const result = await executeNode(id)
      console.log('Node execution result:', result)
    } catch (error) {
      console.error('Node execution failed:', error)
    }
  }, [executeNode, id])

  const handleValidate = useCallback(async () => {
    try {
      const result = await validateNode(id)
      if (!result.isValid) {
        console.error('Node validation failed:', result.errors)
      }
    } catch (error) {
      console.error('Node validation failed:', error)
    }
  }, [validateNode, id])

  return (
    <div className="relative group">
      {/* Existing node content */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">{data.label}</h3>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleExecute}
              title="Execute node"
            >
              <Play className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleValidate}
              title="Validate node"
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {data.description && (
          <p className="text-sm text-gray-600 mb-2">{data.description}</p>
        )}
        
        {/* Node type indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <NodeTypeIndicator type={data.type} size="sm" />
          <span>{data.type}</span>
        </div>
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

#### 5.2 Enhanced Node Modals
**Objective**: Update node modals to work with new node structure

**Enhanced Stage Node Modal**:
```typescript
// components/composites/stage-node-modal.tsx

export function StageNodeModal({ 
  isOpen, 
  onClose, 
  stage,
  modelId,
  nodeId
}: StageNodeModalProps) {
  const { updateNode } = useFunctionModelNodes(modelId)
  const { links, createNodeLink } = useNodeLinking(modelId, nodeId)
  
  const handleSave = useCallback(async (updatedStage: Stage) => {
    try {
      await updateNode(nodeId, {
        functionModelData: {
          stage: updatedStage
        }
      })
      onClose()
    } catch (error) {
      console.error('Failed to save stage:', error)
    }
  }, [updateNode, nodeId, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 border-r p-4">
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="links">Links</TabsTrigger>
                <TabsTrigger value="execution">Execution</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="mt-4">
                <StageDetailsTab stage={stage} onSave={handleSave} />
              </TabsContent>
              
              <TabsContent value="links" className="mt-4">
                <NodeLinkingTab
                  links={links}
                  onCreateLink={createNodeLink}
                  nodeType="stageNode"
                  nodeId={nodeId}
                />
              </TabsContent>
              
              <TabsContent value="execution" className="mt-4">
                <NodeExecutionTab nodeId={nodeId} />
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 p-6">
            {/* Stage content */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Phase 6: Testing and Validation (Week 6)

#### 6.1 Comprehensive Testing
**Objective**: Ensure all functionality works correctly with new architecture

**Test Scenarios**:
1. **Node Migration Tests**:
   - Migrate existing function models to new structure
   - Verify all nodes are properly extracted
   - Validate metadata is correctly created
   
2. **Node Operations Tests**:
   - Create new nodes in dedicated table
   - Update node properties and metadata
   - Delete nodes and associated metadata
   - Execute nodes with behavior patterns
   
3. **Cross-Feature Linking Tests**:
   - Create links between function model nodes and other features
   - Validate link types and context
   - Test link visualization and indicators
   
4. **Performance Tests**:
   - Load large function models with many nodes
   - Test node search and filtering
   - Validate execution performance
   
5. **Integration Tests**:
   - Test UI components with new node structure
   - Validate modal interactions
   - Test save/load functionality

#### 6.2 Performance Optimization
**Objective**: Ensure optimal performance with new architecture

**Optimization Strategies**:
1. **Indexing**: Add proper indexes for node queries
2. **Caching**: Cache frequently accessed node data
3. **Lazy Loading**: Load node metadata on demand
4. **Batch Operations**: Optimize bulk node operations

## Success Metrics

### Functional Metrics
- **Node Migration**: 100% successful migration of existing nodes
- **Performance**: <500ms response time for node operations
- **Cross-Feature Linking**: Support for 1000+ cross-feature relationships
- **AI Integration**: Ready for node-level AI agents
- **Scalability**: Support for 10,000+ nodes per function model

### Technical Metrics
- **Data Integrity**: 100% data consistency across node tables
- **Storage Efficiency**: <30% storage overhead for new structure
- **Query Performance**: <100ms for node-specific queries
- **Migration Success**: 100% successful data migration
- **Backward Compatibility**: Maintain all existing functionality

## Risk Mitigation

### Technical Risks
1. **Migration Complexity**: Implement comprehensive testing and rollback procedures
2. **Data Loss**: Create backup strategy and validation checks
3. **Performance Issues**: Monitor and optimize query performance
4. **Schema Changes**: Use migration scripts with proper versioning

### User Experience Risks
1. **Feature Regression**: Maintain all existing functionality
2. **Performance Degradation**: Optimize for large datasets
3. **UI Changes**: Ensure smooth transition for users
4. **Data Migration**: Provide clear progress indicators

## Timeline and Milestones

### Week 1: Database Schema Enhancement
- [ ] Create function_model_nodes table
- [ ] Create node_metadata table
- [ ] Create enhanced node_links table
- [ ] Create ai_agents table
- [ ] Implement data migration script

### Week 2: Domain Layer Updates
- [ ] Update function model node types
- [ ] Implement node behavior patterns
- [ ] Create node behavior factory
- [ ] Update cross-feature link types

### Week 3: Infrastructure Layer Updates
- [ ] Enhance function model repository
- [ ] Create node metadata repository
- [ ] Update cross-feature link repository
- [ ] Implement AI agent repository

### Week 4: Application Layer Updates
- [ ] Create enhanced use cases
- [ ] Update application hooks
- [ ] Implement node operations
- [ ] Add validation and execution logic

### Week 5: Presentation Layer Updates
- [ ] Update flow node components
- [ ] Enhance node modals
- [ ] Add node execution UI
- [ ] Implement link visualization

### Week 6: Testing and Validation
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] User acceptance testing

## Conclusion

This migration plan provides a comprehensive approach to transitioning the Function Model feature from the current unified node system to the new node-based architecture. The plan maintains all existing functionality while enabling enhanced scalability, AI integration, and cross-feature connectivity.

The phased approach ensures minimal disruption to users while providing a solid foundation for future growth and advanced features. The new architecture will support the application's evolution into microservices and provide the foundation for sophisticated AI integration.

## Current Implementation Status

### ✅ **READY FOR MIGRATION**
- ✅ **Clean Architecture**: Perfect foundation for migration
- ✅ **Dedicated Table**: Already using separate function_models table
- ✅ **Rich Metadata**: Comprehensive function model specific fields
- ✅ **Version Control**: Built-in versioning system
- ✅ **Cross-Feature Links**: Existing cross-feature linking infrastructure
- ✅ **Complete UI**: All UI components ready for enhancement

### 🚧 **MIGRATION READY**
- **Database Schema**: Phase 1 implementation
- **Domain Layer**: Phase 2 planning
- **Infrastructure Layer**: Phase 3 preparation
- **Application Layer**: Phase 4 preparation
- **Presentation Layer**: Phase 5 preparation
- **Testing**: Phase 6 planning 