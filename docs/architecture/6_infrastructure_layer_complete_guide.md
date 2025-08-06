# Infrastructure Layer Complete Guide

## Overview
This document contains **EVERYTHING** you need to build the Infrastructure Layer consistently. Feed this as ONE context and I'll follow it exactly. This guide is **generic and feature-agnostic** while strictly following the **node-based architecture design** principles.

## Core Principles
- **Data access layer** - repositories, database connections, external APIs
- **External service integration** - AI services, vector databases, MCP servers
- **Database schema management** - migrations, indexing, optimization
- **Cross-feature data consistency** - unified node operations across features
- **Performance optimization** - caching, query optimization, connection pooling

## 1. Repository Pattern Implementation (WHAT + HOW)

### Base Repository Interface
```typescript
// lib/infrastructure/repositories/base-node-repository.ts

export interface BaseNodeRepository {
  // Universal node operations (work across all node types)
  createNode<T extends BaseNode>(node: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>
  getNode<T extends BaseNode>(featureType: FeatureType, entityId: string, nodeId?: string): Promise<T | null>
  updateNode<T extends BaseNode>(featureType: FeatureType, entityId: string, nodeId: string, updates: Partial<T>): Promise<T>
  deleteNode(featureType: FeatureType, entityId: string, nodeId: string): Promise<void>
  
  // Cross-feature operations
  createNodeLink(link: Omit<NodeLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<NodeLink>
  getNodeLinks(featureType: FeatureType, entityId: string, nodeId?: string): Promise<NodeLink[]>
  getConnectedNodes(featureType: FeatureType, entityId: string, nodeId?: string): Promise<BaseNode[]>
  
  // AI Integration
  createAIAgent(featureType: FeatureType, entityId: string, nodeId: string, config: AIAgentConfig): Promise<void>
  getAIAgent(featureType: FeatureType, entityId: string, nodeId: string): Promise<AIAgentConfig | null>
  updateAIAgent(featureType: FeatureType, entityId: string, nodeId: string, config: Partial<AIAgentConfig>): Promise<void>
  deleteAIAgent(featureType: FeatureType, entityId: string, nodeId: string): Promise<void>
}
```

### HOW-to Guidelines for Base Repository:
- **Database Mapping**: Always implement `mapDbToNode()` and `mapNodeToDb()` functions
- **Error Handling**: Use consistent error types and logging
- **Connection Management**: Use connection pooling and proper cleanup
- **Transaction Support**: Implement atomic operations for cross-feature links
- **Performance**: Use prepared statements and proper indexing

### Feature-Specific Repositories
```typescript
// lib/infrastructure/repositories/function-model-repository.ts

export interface FunctionModelRepository extends BaseNodeRepository {
  // Function Model specific operations
  createFunctionModel(model: Omit<FunctionModel, 'modelId' | 'createdAt' | 'updatedAt'>): Promise<FunctionModel>
  getFunctionModel(modelId: string): Promise<FunctionModel | null>
  updateFunctionModel(modelId: string, updates: Partial<FunctionModel>): Promise<FunctionModel>
  deleteFunctionModel(modelId: string): Promise<void>
  
  // Node operations within Function Model
  addNodeToFunctionModel(modelId: string, node: FunctionModelNode): Promise<FunctionModelNode>
  updateNodeInFunctionModel(modelId: string, nodeId: string, updates: Partial<FunctionModelNode>): Promise<FunctionModelNode>
  removeNodeFromFunctionModel(modelId: string, nodeId: string): Promise<void>
  
  // Process-specific operations
  getFunctionModelNodes(modelId: string): Promise<FunctionModelNode[]>
  getFunctionModelWithNodes(modelId: string): Promise<FunctionModel & { nodes: FunctionModelNode[] }>
  executeFunctionModel(modelId: string, context?: any): Promise<ExecutionResult>
}

// lib/infrastructure/repositories/knowledge-base-repository.ts

export interface KnowledgeBaseRepository extends BaseNodeRepository {
  // Knowledge Base specific operations
  createSOP(sop: Omit<SOP, 'id' | 'createdAt' | 'updatedAt'>): Promise<SOP>
  getSOP(sopId: string): Promise<SOP | null>
  updateSOP(sopId: string, updates: Partial<SOP>): Promise<SOP>
  deleteSOP(sopId: string): Promise<void>
  
  // Node operations within Knowledge Base
  addNodeToKnowledgeBase(sopId: string, node: KnowledgeBaseNode): Promise<KnowledgeBaseNode>
  updateNodeInKnowledgeBase(sopId: string, nodeId: string, updates: Partial<KnowledgeBaseNode>): Promise<KnowledgeBaseNode>
  removeNodeFromKnowledgeBase(sopId: string, nodeId: string): Promise<void>
  
  // Content-specific operations
  searchSOPs(query: string): Promise<SOP[]>
  getSOPsByCategory(category: string): Promise<SOP[]>
  updateVectorEmbedding(sopId: string, embedding: number[]): Promise<void>
}

// lib/infrastructure/repositories/spindle-repository.ts

export interface SpindleRepository extends BaseNodeRepository {
  // Spindle specific operations
  createSpindle(spindle: Omit<Spindle, 'spindleId' | 'createdAt' | 'updatedAt'>): Promise<Spindle>
  getSpindle(spindleId: string): Promise<Spindle | null>
  updateSpindle(spindleId: string, updates: Partial<Spindle>): Promise<Spindle>
  deleteSpindle(spindleId: string): Promise<void>
  
  // Integration-specific operations
  executeSpindle(spindleId: string, context?: any): Promise<IntegrationResult>
  getSpindleExecutionHistory(spindleId: string): Promise<ExecutionHistory[]>
  updateSpindleStatus(spindleId: string, status: 'active' | 'inactive' | 'error'): Promise<void>
}

// lib/infrastructure/repositories/event-storm-repository.ts

export interface EventStormRepository extends BaseNodeRepository {
  // Event Storm specific operations
  createEventStorm(storm: Omit<EventStorm, 'stormId' | 'createdAt' | 'updatedAt'>): Promise<EventStorm>
  getEventStorm(stormId: string): Promise<EventStorm | null>
  updateEventStorm(stormId: string, updates: Partial<EventStorm>): Promise<EventStorm>
  deleteEventStorm(stormId: string): Promise<void>
  
  // Domain-specific operations
  getEventStormByDomain(domain: string): Promise<EventStorm[]>
  getEventStormEvents(stormId: string): Promise<Event[]>
  updateEventStormAggregates(stormId: string, aggregates: Aggregate[]): Promise<void>
}
```

### HOW-to Guidelines for Feature Repositories:
- **Type Safety**: Use strict TypeScript types for all operations
- **Validation**: Implement input validation before database operations
- **Error Handling**: Use domain-specific error types
- **Performance**: Optimize queries for feature-specific patterns
- **Consistency**: Follow the same patterns across all feature repositories

## 2. Database Schema Management (WHAT + HOW)

### Feature-Specific Tables
```sql
-- Function Model Feature
CREATE TABLE function_models (
  model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  
  -- Node data (React Flow)
  nodes_data JSONB NOT NULL DEFAULT '[]',
  edges_data JSONB NOT NULL DEFAULT '[]',
  viewport_data JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
  
  -- Function Model specific
  process_type VARCHAR(100),
  complexity_level VARCHAR(20),
  estimated_duration INTEGER,
  tags TEXT[] DEFAULT '{}',
  
  -- Metadata and permissions
  metadata JSONB NOT NULL DEFAULT '{}',
  permissions JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Knowledge Base Feature
CREATE TABLE knowledge_base_sops (
  sop_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(100),
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  
  -- Node data (for visual representation)
  node_position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}',
  node_metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Knowledge Base specific
  author VARCHAR(255),
  read_time INTEGER,
  search_keywords TEXT[] DEFAULT '{}',
  vector_embedding VECTOR(1536), -- For AI search
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Event Storm Feature
CREATE TABLE event_storms (
  storm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  
  -- Node data (React Flow)
  nodes_data JSONB NOT NULL DEFAULT '[]',
  edges_data JSONB NOT NULL DEFAULT '[]',
  viewport_data JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
  
  -- Event Storm specific
  domain_context TEXT,
  time_horizon VARCHAR(50),
  tags TEXT[] DEFAULT '{}',
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Spindle Feature
CREATE TABLE spindles (
  spindle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  
  -- Node data (React Flow)
  nodes_data JSONB NOT NULL DEFAULT '[]',
  edges_data JSONB NOT NULL DEFAULT '[]',
  viewport_data JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
  
  -- Spindle specific
  spindle_type VARCHAR(50),
  complexity_level VARCHAR(20),
  tags TEXT[] DEFAULT '{}',
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id)
);
```

### Cross-Feature Node Connectivity
```sql
-- Universal Node Links Table
CREATE TABLE node_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source node (from any feature)
  source_feature VARCHAR(50) NOT NULL,
  source_entity_id UUID NOT NULL,
  source_node_id VARCHAR(255), -- Optional: specific node within entity
  
  -- Target node (to any feature)
  target_feature VARCHAR(50) NOT NULL,
  target_entity_id UUID NOT NULL,
  target_node_id VARCHAR(255), -- Optional: specific node within entity
  
  -- Link properties
  link_type VARCHAR(50) NOT NULL, -- 'references', 'implements', 'documents', 'supports', 'nested'
  link_strength DECIMAL(3,2) DEFAULT 1.0,
  link_context JSONB NOT NULL DEFAULT '{}',
  
  -- Visual properties
  visual_properties JSONB NOT NULL DEFAULT '{}', -- Color, style, etc.
  
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

-- Node Link Types Table (for categorization)
CREATE TABLE node_link_types (
  type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7), -- Hex color
  icon VARCHAR(50),
  is_bidirectional BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default link types
INSERT INTO node_link_types (type_name, description, color, icon, is_bidirectional) VALUES
('references', 'One entity references another', '#3B82F6', 'link', true),
('implements', 'One entity implements another', '#10B981', 'check-circle', false),
('documents', 'One entity documents another', '#F59E0B', 'file-text', false),
('supports', 'One entity supports another', '#8B5CF6', 'shield', false),
('nested', 'One entity is nested within another', '#EF4444', 'layers', false);
```

### Node Metadata and AI Integration
```sql
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

### HOW-to Guidelines for Database Schema:
- **Naming Conventions**: Use snake_case for database, camelCase for TypeScript
- **Indexing**: Create indexes on frequently queried columns
- **Constraints**: Use proper foreign key and check constraints
- **JSONB Usage**: Use JSONB for flexible metadata storage
- **Vector Support**: Enable pgvector extension for AI embeddings
- **Soft Deletes**: Implement soft delete pattern with deleted_at columns

## 3. External Service Integration (WHAT + HOW)

### AI Service Integration
```typescript
// lib/infrastructure/services/ai-service.ts

export interface AIService {
  // Vector search operations
  createEmbedding(text: string): Promise<number[]>
  searchSimilar(content: string, limit?: number): Promise<SearchResult[]>
  updateVectorEmbedding(entityId: string, embedding: number[]): Promise<void>
  
  // AI Agent operations
  createAgent(config: AIAgentConfig): Promise<string>
  executeAgent(agentId: string, input: any): Promise<ExecutionResult>
  updateAgent(agentId: string, config: Partial<AIAgentConfig>): Promise<void>
  deleteAgent(agentId: string): Promise<void>
  
  // Content processing
  summarizeContent(content: string): Promise<string>
  extractKeywords(content: string): Promise<string[]>
  classifyContent(content: string): Promise<string>
}

export class OpenAIEmbeddingService implements AIService {
  constructor(private apiKey: string, private model: string = 'text-embedding-ada-002') {}
  
  async createEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: this.model
      })
    })
    
    const data = await response.json()
    return data.data[0].embedding
  }
  
  async searchSimilar(content: string, limit: number = 10): Promise<SearchResult[]> {
    const embedding = await this.createEmbedding(content)
    
    // Use pgvector for similarity search
    const query = `
      SELECT entity_id, feature_type, content, 
             1 - (vector_embedding <=> $1) as similarity
      FROM node_metadata 
      WHERE vector_embedding IS NOT NULL
      ORDER BY vector_embedding <=> $1
      LIMIT $2
    `
    
    const results = await this.db.query(query, [embedding, limit])
    return results.rows.map(row => ({
      entityId: row.entity_id,
      featureType: row.feature_type,
      content: row.content,
      similarity: row.similarity
    }))
  }
}
```

### MCP Server Integration
```typescript
// lib/infrastructure/services/mcp-service.ts

export interface MCPService {
  // MCP server operations
  connectToServer(serverUrl: string, config: MCPConfig): Promise<void>
  executeTool(toolName: string, params: any): Promise<any>
  listAvailableTools(): Promise<MCPTool[]>
  getServerStatus(): Promise<MCPStatus>
}

export class SupabaseMCPService implements MCPService {
  constructor(private supabaseUrl: string, private supabaseKey: string) {}
  
  async connectToServer(serverUrl: string, config: MCPConfig): Promise<void> {
    // Initialize MCP connection
    this.connection = await this.initializeConnection(serverUrl, config)
  }
  
  async executeTool(toolName: string, params: any): Promise<any> {
    // Execute MCP tool
    const result = await this.connection.executeTool(toolName, params)
    return result
  }
  
  async listAvailableTools(): Promise<MCPTool[]> {
    // List available MCP tools
    const tools = await this.connection.listTools()
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }))
  }
}
```

### Vector Database Integration
```typescript
// lib/infrastructure/services/vector-database.ts

export interface VectorDatabase {
  // Vector operations
  insertVector(id: string, vector: number[], metadata?: any): Promise<void>
  searchVectors(queryVector: number[], limit?: number): Promise<VectorSearchResult[]>
  updateVector(id: string, vector: number[]): Promise<void>
  deleteVector(id: string): Promise<void>
  
  // Batch operations
  batchInsert(vectors: Array<{ id: string; vector: number[]; metadata?: any }>): Promise<void>
  batchSearch(queries: number[][]): Promise<VectorSearchResult[][]>
}

export class PGVectorService implements VectorDatabase {
  constructor(private db: Database) {}
  
  async insertVector(id: string, vector: number[], metadata?: any): Promise<void> {
    const query = `
      INSERT INTO node_metadata (entity_id, vector_embedding, metadata)
      VALUES ($1, $2, $3)
      ON CONFLICT (entity_id) 
      DO UPDATE SET vector_embedding = $2, metadata = $3
    `
    await this.db.query(query, [id, vector, metadata])
  }
  
  async searchVectors(queryVector: number[], limit: number = 10): Promise<VectorSearchResult[]> {
    const query = `
      SELECT entity_id, metadata, 1 - (vector_embedding <=> $1) as similarity
      FROM node_metadata 
      WHERE vector_embedding IS NOT NULL
      ORDER BY vector_embedding <=> $1
      LIMIT $2
    `
    const result = await this.db.query(query, [queryVector, limit])
    return result.rows.map(row => ({
      id: row.entity_id,
      metadata: row.metadata,
      similarity: row.similarity
    }))
  }
}
```

### HOW-to Guidelines for External Services:
- **Error Handling**: Implement retry logic and circuit breakers
- **Rate Limiting**: Respect API rate limits
- **Caching**: Cache expensive operations
- **Monitoring**: Log all external service calls
- **Fallbacks**: Provide fallback mechanisms for service failures

## 4. Cross-Feature Data Consistency (WHAT + HOW)

### Unified Node Operations
```typescript
// lib/infrastructure/services/unified-node-service.ts

export interface UnifiedNodeService {
  // Cross-feature node operations
  createNode<T extends BaseNode>(node: T): Promise<T>
  getNode<T extends BaseNode>(featureType: FeatureType, entityId: string): Promise<T | null>
  updateNode<T extends BaseNode>(featureType: FeatureType, entityId: string, updates: Partial<T>): Promise<T>
  deleteNode(featureType: FeatureType, entityId: string): Promise<void>
  
  // Cross-feature linking
  createLink(source: NodeReference, target: NodeReference, linkType: LinkType): Promise<NodeLink>
  getConnectedNodes(featureType: FeatureType, entityId: string): Promise<BaseNode[]>
  removeLink(linkId: string): Promise<void>
  
  // Batch operations
  batchCreateNodes(nodes: BaseNode[]): Promise<BaseNode[]>
  batchUpdateNodes(updates: Array<{ featureType: FeatureType; entityId: string; updates: Partial<BaseNode> }>): Promise<BaseNode[]>
  batchDeleteNodes(nodes: Array<{ featureType: FeatureType; entityId: string }>): Promise<void>
}

export class UnifiedNodeServiceImpl implements UnifiedNodeService {
  constructor(
    private repositories: Map<FeatureType, BaseNodeRepository>,
    private db: Database
  ) {}
  
  async createNode<T extends BaseNode>(node: T): Promise<T> {
    const repository = this.repositories.get(node.featureType)
    if (!repository) {
      throw new Error(`No repository found for feature type: ${node.featureType}`)
    }
    
    return await repository.createNode(node)
  }
  
  async createLink(source: NodeReference, target: NodeReference, linkType: LinkType): Promise<NodeLink> {
    const link: Omit<NodeLink, 'linkId' | 'createdAt' | 'updatedAt'> = {
      sourceFeature: source.featureType,
      sourceEntityId: source.entityId,
      sourceNodeId: source.nodeId,
      targetFeature: target.featureType,
      targetEntityId: target.entityId,
      targetNodeId: target.nodeId,
      linkType,
      linkStrength: 1.0,
      linkContext: {},
      visualProperties: {
        color: this.getLinkTypeColor(linkType),
        style: {}
      },
      createdBy: 'current-user-id' // Get from auth context
    }
    
    // Use transaction to ensure consistency
    return await this.db.transaction(async (trx) => {
      const createdLink = await this.createNodeLink(link)
      
      // Update metadata for both nodes
      await this.updateNodeMetadata(source, { hasOutgoingLinks: true })
      await this.updateNodeMetadata(target, { hasIncomingLinks: true })
      
      return createdLink
    })
  }
}
```

### Data Consistency Patterns
```typescript
// lib/infrastructure/patterns/consistency-patterns.ts

export class ConsistencyPatterns {
  // Event sourcing for node changes
  static async recordNodeEvent(event: NodeEvent): Promise<void> {
    const eventRecord = {
      eventId: generateUUID(),
      eventType: event.type,
      featureType: event.featureType,
      entityId: event.entityId,
      data: event.data,
      timestamp: new Date(),
      userId: event.userId
    }
    
    await this.db.query(`
      INSERT INTO node_events (event_id, event_type, feature_type, entity_id, data, timestamp, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [eventRecord.eventId, eventRecord.eventType, eventRecord.featureType, 
        eventRecord.entityId, eventRecord.data, eventRecord.timestamp, eventRecord.userId])
  }
  
  // Optimistic locking for concurrent updates
  static async updateWithOptimisticLock<T extends BaseNode>(
    featureType: FeatureType,
    entityId: string,
    updates: Partial<T>,
    expectedVersion: number
  ): Promise<T> {
    const result = await this.db.query(`
      UPDATE ${this.getTableName(featureType)}
      SET data = data || $1, version = version + 1, updated_at = NOW()
      WHERE entity_id = $2 AND version = $3
      RETURNING *
    `, [JSON.stringify(updates), entityId, expectedVersion])
    
    if (result.rows.length === 0) {
      throw new Error('Concurrent update detected')
    }
    
    return this.mapDbToNode(result.rows[0])
  }
  
  // Saga pattern for cross-feature operations
  static async executeSaga<T>(saga: Saga<T>): Promise<T> {
    const sagaId = generateUUID()
    const compensations: Compensation[] = []
    
    try {
      for (const step of saga.steps) {
        const result = await step.execute()
        compensations.unshift(step.compensate)
      }
      
      await this.recordSagaSuccess(sagaId, saga)
      return saga.result
    } catch (error) {
      // Execute compensations in reverse order
      for (const compensate of compensations) {
        try {
          await compensate()
        } catch (compError) {
          console.error('Compensation failed:', compError)
        }
      }
      
      await this.recordSagaFailure(sagaId, saga, error)
      throw error
    }
  }
}
```

### HOW-to Guidelines for Data Consistency:
- **Transactions**: Use database transactions for multi-step operations
- **Event Sourcing**: Record all node changes as events
- **Optimistic Locking**: Prevent concurrent update conflicts
- **Saga Pattern**: Handle distributed transactions across features
- **CQRS**: Separate read and write operations for better performance

## 5. Performance Optimization (WHAT + HOW)

### Database Optimization
```typescript
// lib/infrastructure/optimization/database-optimization.ts

export class DatabaseOptimization {
  // Index management
  static async createIndexes(): Promise<void> {
    const indexes = [
      // Node metadata indexes
      'CREATE INDEX IF NOT EXISTS idx_node_metadata_feature_type ON node_metadata(feature_type)',
      'CREATE INDEX IF NOT EXISTS idx_node_metadata_entity_id ON node_metadata(entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_node_metadata_vector ON node_metadata USING ivfflat (vector_embedding vector_cosine_ops)',
      
      // Node links indexes
      'CREATE INDEX IF NOT EXISTS idx_node_links_source ON node_links(source_feature, source_entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_node_links_target ON node_links(target_feature, target_entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_node_links_type ON node_links(link_type)',
      
      // Feature-specific indexes
      'CREATE INDEX IF NOT EXISTS idx_function_models_status ON function_models(status)',
      'CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base_sops(category)',
      'CREATE INDEX IF NOT EXISTS idx_event_storms_domain ON event_storms(domain_context)',
      'CREATE INDEX IF NOT EXISTS idx_spindles_type ON spindles(spindle_type)'
    ]
    
    for (const index of indexes) {
      await this.db.query(index)
    }
  }
  
  // Query optimization
  static async optimizeQueries(): Promise<void> {
    // Enable query plan caching
    await this.db.query('SET plan_cache_mode = auto')
    
    // Set work memory for complex queries
    await this.db.query('SET work_mem = 256MB')
    
    // Enable parallel query execution
    await this.db.query('SET max_parallel_workers_per_gather = 4')
  }
}
```

### Caching Strategy
```typescript
// lib/infrastructure/caching/node-cache.ts

export interface NodeCache {
  // Cache operations
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  
  // Batch operations
  mget<T>(keys: string[]): Promise<(T | null)[]>
  mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void>
}

export class RedisNodeCache implements NodeCache {
  constructor(private redis: Redis) {}
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key)
    return value ? JSON.parse(value) : null
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value)
    if (ttl) {
      await this.redis.setex(key, ttl, serialized)
    } else {
      await this.redis.set(key, serialized)
    }
  }
  
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.redis.mget(keys)
    return values.map(value => value ? JSON.parse(value) : null)
  }
}
```

### Connection Pooling
```typescript
// lib/infrastructure/connection/connection-pool.ts

export class DatabaseConnectionPool {
  private pool: Pool
  
  constructor(config: PoolConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.maxConnections || 20,
      idleTimeoutMillis: config.idleTimeout || 30000,
      connectionTimeoutMillis: config.connectionTimeout || 2000
    })
    
    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
    })
  }
  
  async getConnection(): Promise<PoolClient> {
    return await this.pool.connect()
  }
  
  async query(text: string, params?: any[]): Promise<QueryResult> {
    const client = await this.getConnection()
    try {
      return await client.query(text, params)
    } finally {
      client.release()
    }
  }
  
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getConnection()
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}
```

### HOW-to Guidelines for Performance:
- **Indexing**: Create indexes on frequently queried columns
- **Caching**: Cache expensive operations and frequently accessed data
- **Connection Pooling**: Use connection pools for database connections
- **Query Optimization**: Use prepared statements and optimize queries
- **Batch Operations**: Batch multiple operations together
- **Monitoring**: Monitor performance metrics and optimize bottlenecks

## 6. Infrastructure Exceptions (WHAT + HOW)

### Infrastructure Error Types
```typescript
// lib/infrastructure/exceptions/infrastructure-exceptions.ts

export class InfrastructureException extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'InfrastructureException'
  }
}

export class DatabaseConnectionException extends InfrastructureException {
  constructor(message: string, details?: any) {
    super(message, 'DB_CONNECTION_ERROR', 503, details)
    this.name = 'DatabaseConnectionException'
  }
}

export class ExternalServiceException extends InfrastructureException {
  constructor(
    message: string,
    public service: string,
    public endpoint: string,
    details?: any
  ) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, details)
    this.name = 'ExternalServiceException'
  }
}

export class DataConsistencyException extends InfrastructureException {
  constructor(message: string, public entityId: string, details?: any) {
    super(message, 'DATA_CONSISTENCY_ERROR', 409, details)
    this.name = 'DataConsistencyException'
  }
}

export class PerformanceException extends InfrastructureException {
  constructor(message: string, public metric: string, details?: any) {
    super(message, 'PERFORMANCE_ERROR', 503, details)
    this.name = 'PerformanceException'
  }
}
```

### Error Handling Patterns
```typescript
// lib/infrastructure/error-handling/error-handler.ts

export class InfrastructureErrorHandler {
  // Retry pattern for transient failures
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error
        }
        
        await this.delay(delay * attempt)
      }
    }
    
    throw lastError!
  }
  
  // Circuit breaker pattern
  static createCircuitBreaker<T>(
    operation: () => Promise<T>,
    failureThreshold: number = 5,
    timeout: number = 30000
  ): () => Promise<T> {
    let failureCount = 0
    let lastFailureTime = 0
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
    
    return async () => {
      if (state === 'OPEN') {
        if (Date.now() - lastFailureTime > timeout) {
          state = 'HALF_OPEN'
        } else {
          throw new InfrastructureException('Circuit breaker is open', 'CIRCUIT_BREAKER_OPEN')
        }
      }
      
      try {
        const result = await operation()
        if (state === 'HALF_OPEN') {
          state = 'CLOSED'
          failureCount = 0
        }
        return result
      } catch (error) {
        failureCount++
        lastFailureTime = Date.now()
        
        if (failureCount >= failureThreshold) {
          state = 'OPEN'
        }
        
        throw error
      }
    }
  }
  
  private static isRetryableError(error: any): boolean {
    return error instanceof DatabaseConnectionException ||
           error instanceof ExternalServiceException ||
           error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT'
  }
  
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### HOW-to Guidelines for Error Handling:
- **Specific Exceptions**: Use specific exception types for different error scenarios
- **Retry Logic**: Implement retry patterns for transient failures
- **Circuit Breakers**: Use circuit breakers for external service calls
- **Logging**: Log all errors with appropriate context
- **Monitoring**: Monitor error rates and patterns
- **Graceful Degradation**: Provide fallback mechanisms for critical failures

## Implementation Checklist

### Repository Pattern
- [ ] Implement BaseNodeRepository interface
- [ ] Create feature-specific repositories
- [ ] Add database mapping functions
- [ ] Implement error handling and logging
- [ ] Add transaction support
- [ ] Create connection pooling

### Database Schema
- [ ] Create feature-specific tables
- [ ] Implement cross-feature linking tables
- [ ] Add node metadata table
- [ ] Create AI integration tables
- [ ] Add proper indexes
- [ ] Implement constraints and validations

### External Services
- [ ] Implement AI service integration
- [ ] Add MCP server integration
- [ ] Create vector database service
- [ ] Add caching layer
- [ ] Implement rate limiting
- [ ] Add monitoring and logging

### Data Consistency
- [ ] Implement unified node operations
- [ ] Add cross-feature linking
- [ ] Create event sourcing
- [ ] Add optimistic locking
- [ ] Implement saga pattern
- [ ] Add CQRS separation

### Performance Optimization
- [ ] Create database indexes
- [ ] Implement caching strategy
- [ ] Add connection pooling
- [ ] Optimize queries
- [ ] Add batch operations
- [ ] Implement monitoring

### Error Handling
- [ ] Create infrastructure exceptions
- [ ] Implement retry patterns
- [ ] Add circuit breakers
- [ ] Create error logging
- [ ] Add monitoring
- [ ] Implement fallbacks

### Testing and Validation
- [ ] Write unit tests for repositories
- [ ] Create integration tests
- [ ] Test external service integration
- [ ] Validate data consistency
- [ ] Performance testing
- [ ] Error scenario testing

### Documentation and Monitoring
- [ ] Document all repository interfaces
- [ ] Create database schema documentation
- [ ] Document external service integration
- [ ] Set up performance monitoring
- [ ] Create troubleshooting guides
- [ ] Add operational runbooks 