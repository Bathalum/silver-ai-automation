# Function Model - Infrastructure Repository Layer

**Version**: 1.0  
**Created**: September 1, 2025  
**Status**: Draft

This document defines the comprehensive repository layer implementation for the Function Model feature within the Silver AI Automation platform, following Clean Architecture principles and implementing all domain-defined repository interfaces.

## Table of Contents
1. [Repository Layer Overview](#repository-layer-overview)
2. [Base Repository Infrastructure](#base-repository-infrastructure)
3. [Aggregate-Specific Repositories](#aggregate-specific-repositories)
4. [Repository Integration Patterns](#repository-integration-patterns)
5. [Error Handling and Result Pattern](#error-handling-and-result-pattern)
6. [Transaction Management](#transaction-management)
7. [Performance Optimization](#performance-optimization)
8. [Testing Strategies](#testing-strategies)
9. [Implementation Guidelines](#implementation-guidelines)

## Repository Layer Overview

The repository layer serves as the boundary between the application layer and the data persistence infrastructure, implementing all repository interfaces defined in the domain layer while maintaining strict adherence to Clean Architecture principles.

**Core Responsibilities**:
- Implement domain-defined repository interfaces
- Translate between domain entities and data storage representations
- Manage database connections and transaction boundaries
- Ensure data consistency and integrity
- Handle infrastructure-specific errors and convert to domain-appropriate results
- Provide optimized queries for complex domain scenarios

**Architectural Principles**:
- **Dependency Inversion**: Repositories implement domain interfaces, not infrastructure contracts
- **Single Responsibility**: Each repository manages one aggregate root
- **Result Pattern Consistency**: All operations return `Result<T>` for uniform error handling
- **Transaction Boundaries**: Respect aggregate boundaries for atomicity
- **Performance Awareness**: Optimize for domain use case patterns

## Base Repository Infrastructure

### BaseSupabaseRepository<TEntity, TId>

**Purpose**: Generic foundation for all Supabase-based repository implementations.

**Core Responsibilities**:
```typescript
abstract class BaseSupabaseRepository<TEntity, TId> {
  protected readonly client: SupabaseClient
  protected readonly tableName: string
  protected readonly eventBus: IDomainEventBus
  
  // Core CRUD Operations
  abstract save(entity: TEntity): Promise<Result<void>>
  abstract findById(id: TId): Promise<Result<TEntity | null>>
  abstract delete(id: TId): Promise<Result<void>>
  
  // Infrastructure Utilities
  protected handleDatabaseError(error: any): Result<never>
  protected mapToEntity(row: any): TEntity
  protected mapFromEntity(entity: TEntity): any
  protected createAuditEntry(operation: string, entity: TEntity): void
}
```

**Key Features**:
- **Connection Management**: Efficient Supabase client lifecycle management
- **Error Translation**: Database errors translated to domain-appropriate failures
- **Audit Integration**: Automatic audit trail generation for all operations
- **Entity Mapping**: Bidirectional transformation between entities and database rows
- **Result Pattern**: Consistent error handling and success indication

**Error Handling Patterns**:
```typescript
protected handleDatabaseError(error: any): Result<never> {
  if (error.code === '23505') { // Unique constraint violation
    return Result.failure('Entity already exists')
  }
  if (error.code === '23503') { // Foreign key constraint violation
    return Result.failure('Referenced entity not found')
  }
  if (error.code === '23514') { // Check constraint violation
    return Result.failure('Invalid entity state')
  }
  return Result.failure(`Database operation failed: ${error.message}`)
}
```

### BaseAggregateRepository<TAggregate, TId>

**Purpose**: Specialized base for aggregate root repositories with complex relationship management.

**Enhanced Capabilities**:
```typescript
abstract class BaseAggregateRepository<TAggregate, TId> 
  extends BaseSupabaseRepository<TAggregate, TId> {
  
  // Aggregate Boundary Operations
  protected saveWithRelations(aggregate: TAggregate): Promise<Result<void>>
  protected loadWithRelations(id: TId): Promise<Result<TAggregate | null>>
  protected validateAggregateIntegrity(aggregate: TAggregate): Result<void>
  
  // Complex Query Support
  protected buildComplexQuery(): QueryBuilder
  protected applyFilters(query: QueryBuilder, filters: any): QueryBuilder
  protected applySorting(query: QueryBuilder, sort: any): QueryBuilder
  protected applyPagination(query: QueryBuilder, page: any): QueryBuilder
}
```

**Aggregate Boundary Enforcement**:
- **Atomic Operations**: All aggregate changes occur within single transaction
- **Relationship Loading**: Lazy and eager loading strategies for aggregate relationships
- **Integrity Validation**: Business rule validation before persistence
- **Event Coordination**: Domain events published after successful persistence

### BaseVersionedRepository<TVersioned, TId>

**Purpose**: Manages versioned entities with immutable version snapshots.

**Version Management Features**:
```typescript
abstract class BaseVersionedRepository<TVersioned, TId> 
  extends BaseAggregateRepository<TVersioned, TId> {
  
  // Version Operations
  createVersion(entity: TVersioned, versionData: any): Promise<Result<string>>
  findVersionById(versionId: string): Promise<Result<TVersioned | null>>
  findVersionsByEntity(entityId: TId): Promise<Result<TVersioned[]>>
  compareVersions(v1: string, v2: string): Result<VersionComparison>
  
  // Version Integrity
  protected validateVersionCreation(entity: TVersioned): Result<void>
  protected createImmutableSnapshot(entity: TVersioned): any
  protected restoreFromSnapshot(snapshot: any): Result<TVersioned>
}
```

**Version Storage Strategy**:
- **Immutable Snapshots**: Complete entity state preserved for each version
- **Semantic Versioning**: Version comparison using semver principles
- **Version Metadata**: Creation timestamps, authors, and change descriptions
- **Rollback Support**: Ability to restore entity state from any version

### BaseAuditableRepository<TAuditable, TId>

**Purpose**: Provides comprehensive audit trail and soft deletion capabilities.

**Audit Features**:
```typescript
abstract class BaseAuditableRepository<TAuditable, TId> 
  extends BaseAggregateRepository<TAuditable, TId> {
  
  // Soft Deletion
  softDelete(id: TId, userId: string, reason?: string): Promise<Result<void>>
  restore(id: TId, userId: string): Promise<Result<void>>
  findIncludingDeleted(id: TId): Promise<Result<TAuditable | null>>
  
  // Audit Trail
  getAuditHistory(id: TId): Promise<Result<AuditEntry[]>>
  findByAuditCriteria(criteria: AuditCriteria): Promise<Result<TAuditable[]>>
  
  // Change Tracking
  protected trackChanges(old: TAuditable, new: TAuditable): ChangeSet
  protected createAuditEntry(operation: string, entity: TAuditable): AuditEntry
}
```

## Aggregate-Specific Repositories

### SupabaseFunctionModelRepository

**Purpose**: Implements `IFunctionModelRepository` for complete function model persistence.

**Interface Implementation**:
```typescript
class SupabaseFunctionModelRepository 
  extends BaseVersionedRepository<FunctionModel, string>
  implements IFunctionModelRepository {
  
  // Core Operations
  save(model: FunctionModel): Promise<Result<void>>
  findById(id: string): Promise<Result<FunctionModel | null>>
  findByUserId(userId: string): Promise<Result<FunctionModel[]>>
  delete(id: string): Promise<Result<void>>
  
  // Complex Domain Queries
  findByStatus(status: ModelStatus): Promise<Result<FunctionModel[]>>
  searchByName(query: string): Promise<Result<FunctionModel[]>>
  findWithDependencies(id: string): Promise<Result<FunctionModel>>
  findPublishedModels(): Promise<Result<FunctionModel[]>>
  
  // Version-Specific Operations
  createVersion(model: FunctionModel): Promise<Result<string>>
  findVersions(modelId: string): Promise<Result<FunctionModelVersion[]>>
  publishVersion(modelId: string, versionId: string): Promise<Result<void>>
}
```

**Complex Query Implementations**:
```typescript
// Full-text search with PostgreSQL
async searchByName(query: string): Promise<Result<FunctionModel[]>> {
  try {
    const { data, error } = await this.client
      .from('function_models')
      .select('*')
      .textSearch('name_desc_fts', query, {
        type: 'websearch',
        config: 'english'
      })
      .not('deleted_at', 'is', null)
      .order('name')
    
    if (error) return this.handleDatabaseError(error)
    
    const models = data.map(row => this.mapToEntity(row))
    return Result.success(models)
  } catch (error) {
    return this.handleDatabaseError(error)
  }
}

// Complex joins for dependency loading
async findWithDependencies(id: string): Promise<Result<FunctionModel>> {
  try {
    const { data, error } = await this.client
      .from('function_models')
      .select(`
        *,
        nodes:function_model_nodes(*),
        actions:action_nodes(*),
        versions:function_model_versions(*)
      `)
      .eq('model_id', id)
      .single()
    
    if (error) return this.handleDatabaseError(error)
    if (!data) return Result.success(null)
    
    const model = this.mapComplexEntity(data)
    return Result.success(model)
  } catch (error) {
    return this.handleDatabaseError(error)
  }
}
```

**Entity Mapping Strategies**:
```typescript
protected mapToEntity(row: any): FunctionModel {
  const modelName = ModelName.create(row.name).getValueOrThrow()
  const version = Version.create(row.version).getValueOrThrow()
  
  return FunctionModel.create({
    modelId: row.model_id,
    name: modelName,
    description: row.description,
    version: version,
    status: row.status as ModelStatus,
    currentVersion: row.current_version,
    versionCount: row.version_count,
    nodes: this.parseNodes(row.nodes),
    actionNodes: this.parseActionNodes(row.action_nodes),
    aiAgentConfig: row.ai_agent_config,
    metadata: row.metadata,
    permissions: row.permissions,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastSavedAt: new Date(row.last_saved_at),
    userId: row.user_id,
    organizationId: row.organization_id,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    deletedBy: row.deleted_by
  }).getValueOrThrow()
}

protected mapFromEntity(model: FunctionModel): any {
  return {
    model_id: model.modelId,
    name: model.name.value,
    description: model.description,
    version: model.version.value,
    status: model.status,
    current_version: model.currentVersion,
    version_count: model.versionCount,
    nodes: JSON.stringify(model.nodes),
    action_nodes: JSON.stringify(model.actionNodes),
    ai_agent_config: model.aiAgentConfig,
    metadata: model.metadata,
    permissions: model.permissions,
    created_at: model.createdAt.toISOString(),
    updated_at: model.updatedAt.toISOString(),
    last_saved_at: model.lastSavedAt.toISOString(),
    user_id: model.userId,
    organization_id: model.organizationId,
    deleted_at: model.deletedAt?.toISOString() || null,
    deleted_by: model.deletedBy
  }
}
```

### SupabaseNodeLinkRepository

**Purpose**: Manages cross-feature relationships and node-level links.

**Interface Implementation**:
```typescript
class SupabaseNodeLinkRepository 
  extends BaseAggregateRepository<NodeLink, string>
  implements INodeLinkRepository {
  
  // Link Management
  createLink(link: NodeLink): Promise<Result<void>>
  findLinksBySource(sourceId: string): Promise<Result<NodeLink[]>>
  findLinksByTarget(targetId: string): Promise<Result<NodeLink[]>>
  findLinksByType(linkType: LinkType): Promise<Result<NodeLink[]>>
  
  // Relationship Analysis
  calculateLinkStrength(linkId: string): Promise<Result<number>>
  findStrongestLinks(threshold: number): Promise<Result<NodeLink[]>>
  
  // Cycle Detection
  detectCycles(): Promise<Result<NodeLink[][]>>
  validateLinkCreation(link: NodeLink): Promise<Result<void>>
  
  // Bulk Operations
  createBulkLinks(links: NodeLink[]): Promise<Result<void>>
  updateLinkStrengths(updates: Map<string, number>): Promise<Result<void>>
}
```

**Specialized Query Implementations**:
```typescript
// Recursive cycle detection using Common Table Expressions (CTE)
async detectCycles(): Promise<Result<NodeLink[][]>> {
  try {
    const query = `
      WITH RECURSIVE link_path AS (
        -- Base case: start with all links
        SELECT source_entity_id, target_entity_id, 
               ARRAY[source_entity_id] AS path,
               1 AS depth
        FROM node_links
        
        UNION ALL
        
        -- Recursive case: extend paths
        SELECT nl.source_entity_id, nl.target_entity_id,
               lp.path || nl.target_entity_id,
               lp.depth + 1
        FROM node_links nl
        INNER JOIN link_path lp ON nl.source_entity_id = lp.target_entity_id
        WHERE nl.target_entity_id != ALL(lp.path) -- Prevent infinite loops
          AND lp.depth < 10 -- Limit depth
      )
      SELECT DISTINCT path
      FROM link_path
      WHERE source_entity_id = ANY(path[2:])
        AND array_length(path, 1) > 2
    `
    
    const { data, error } = await this.client.rpc('detect_cycles', { query })
    if (error) return this.handleDatabaseError(error)
    
    const cycles = this.processCycleData(data)
    return Result.success(cycles)
  } catch (error) {
    return this.handleDatabaseError(error)
  }
}

// Link strength calculation with multiple factors
async calculateLinkStrength(linkId: string): Promise<Result<number>> {
  try {
    // Get link interaction data
    const { data: linkData, error: linkError } = await this.client
      .from('node_links')
      .select('*, interaction_count, created_at, updated_at')
      .eq('link_id', linkId)
      .single()
    
    if (linkError) return this.handleDatabaseError(linkError)
    
    // Calculate frequency score (0.0 - 0.2)
    const daysSinceCreation = Math.max(1, 
      Math.floor((Date.now() - new Date(linkData.created_at).getTime()) / (1000 * 60 * 60 * 24))
    )
    const interactionFrequency = (linkData.interaction_count || 0) / daysSinceCreation
    const frequencyScore = Math.min(0.2, interactionFrequency * 0.1)
    
    // Calculate recency score (0.0 - 0.3)
    const daysSinceUpdate = Math.max(1,
      Math.floor((Date.now() - new Date(linkData.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    )
    const recencyScore = Math.min(0.3, Math.max(0, 0.3 - (daysSinceUpdate * 0.01)))
    
    // Context relevance score (0.0 - 0.2)
    const contextScore = this.calculateContextRelevance(linkData.link_context)
    
    // Base strength from link type (0.3 - 0.5)
    const baseScore = this.getLinkTypeBaseScore(linkData.link_type)
    
    const totalStrength = Math.min(1.0, 
      baseScore + frequencyScore + recencyScore + contextScore
    )
    
    return Result.success(totalStrength)
  } catch (error) {
    return this.handleDatabaseError(error)
  }
}
```

### SupabaseAIAgentRepository

**Purpose**: Manages AI agent registration, capability tracking, and performance metrics.

**Interface Implementation**:
```typescript
class SupabaseAIAgentRepository 
  extends BaseAggregateRepository<AIAgent, string>
  implements IAIAgentRepository {
  
  // Agent Lifecycle
  registerAgent(agent: AIAgent): Promise<Result<void>>
  findByCapability(capability: string): Promise<Result<AIAgent[]>>
  findByFeature(feature: string): Promise<Result<AIAgent[]>>
  updatePerformanceMetrics(agentId: string, metrics: any): Promise<Result<void>>
  
  // Capability Matching
  searchByCapabilities(requirements: string[]): Promise<Result<AgentMatch[]>>
  findSuitableAgents(task: AgentTask): Promise<Result<AIAgent[]>>
  
  // Performance Tracking
  recordExecution(agentId: string, execution: AgentExecution): Promise<Result<void>>
  getPerformanceHistory(agentId: string): Promise<Result<PerformanceMetric[]>>
  
  // Agent Discovery
  semanticSearch(query: string): Promise<Result<AIAgent[]>>
  findByFeatureAndEntity(feature: string, entityId: string): Promise<Result<AIAgent[]>>
}
```

**Capability Matching Implementation**:
```typescript
async searchByCapabilities(requirements: string[]): Promise<Result<AgentMatch[]>> {
  try {
    const { data, error } = await this.client
      .from('ai_agents')
      .select('*, capabilities')
      .eq('is_enabled', true)
    
    if (error) return this.handleDatabaseError(error)
    
    const matches: AgentMatch[] = []
    
    for (const agent of data) {
      const agentCapabilities = agent.capabilities || {}
      let matchScore = 0
      const matchedCapabilities = []
      
      for (const requirement of requirements) {
        if (this.hasCapability(agentCapabilities, requirement)) {
          const capability = this.getCapabilityDetails(agentCapabilities, requirement)
          matchScore += capability.proficiency || 0.5
          matchedCapabilities.push(requirement)
        }
      }
      
      if (matchedCapabilities.length > 0) {
        const finalScore = (matchScore / requirements.length) * 
                          (matchedCapabilities.length / requirements.length)
        
        matches.push({
          agent: this.mapToEntity(agent),
          matchScore: Math.min(1.0, finalScore),
          matchedCapabilities,
          missingCapabilities: requirements.filter(r => !matchedCapabilities.includes(r))
        })
      }
    }
    
    // Sort by match score descending
    matches.sort((a, b) => b.matchScore - a.matchScore)
    
    return Result.success(matches)
  } catch (error) {
    return this.handleDatabaseError(error)
  }
}
```

## Repository Integration Patterns

### Event Integration

**Automatic Event Publishing**:
```typescript
abstract class EventPublishingRepository<TEntity, TId> 
  extends BaseAggregateRepository<TEntity, TId> {
  
  protected async publishEvents(entity: TEntity, operation: string): Promise<void> {
    const events = this.extractDomainEvents(entity)
    
    for (const event of events) {
      await this.eventBus.publish(event)
    }
    
    // Clear events after publishing
    this.clearDomainEvents(entity)
  }
  
  async save(entity: TEntity): Promise<Result<void>> {
    const result = await super.save(entity)
    
    if (result.isSuccess) {
      await this.publishEvents(entity, 'save')
    }
    
    return result
  }
}
```

### Cross-Repository Coordination

**Repository Unit of Work Pattern**:
```typescript
class RepositoryUnitOfWork {
  constructor(
    private readonly modelRepo: IFunctionModelRepository,
    private readonly linkRepo: INodeLinkRepository,
    private readonly agentRepo: IAIAgentRepository,
    private readonly transaction: SupabaseTransaction
  ) {}
  
  async executeTransaction<T>(work: (uow: RepositoryUnitOfWork) => Promise<Result<T>>): Promise<Result<T>> {
    try {
      await this.transaction.begin()
      
      const result = await work(this)
      
      if (result.isSuccess) {
        await this.transaction.commit()
        return result
      } else {
        await this.transaction.rollback()
        return result
      }
    } catch (error) {
      await this.transaction.rollback()
      return Result.failure(`Transaction failed: ${error.message}`)
    }
  }
}
```

## Error Handling and Result Pattern

### Repository Error Categories

**Database Error Mapping**:
```typescript
enum RepositoryErrorCode {
  CONNECTION_FAILED = 'REPO_CONNECTION_FAILED',
  UNIQUE_CONSTRAINT = 'REPO_UNIQUE_CONSTRAINT',
  FOREIGN_KEY_VIOLATION = 'REPO_FOREIGN_KEY_VIOLATION',
  CHECK_CONSTRAINT = 'REPO_CHECK_CONSTRAINT',
  NOT_FOUND = 'REPO_NOT_FOUND',
  CONCURRENT_MODIFICATION = 'REPO_CONCURRENT_MODIFICATION',
  TRANSACTION_FAILED = 'REPO_TRANSACTION_FAILED',
  SERIALIZATION_ERROR = 'REPO_SERIALIZATION_ERROR',
  TIMEOUT = 'REPO_TIMEOUT',
  PERMISSION_DENIED = 'REPO_PERMISSION_DENIED'
}

class RepositoryError extends Error {
  constructor(
    public readonly code: RepositoryErrorCode,
    message: string,
    public readonly cause?: Error,
    public readonly context?: any
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}
```

**Error Translation Strategy**:
```typescript
protected translateDatabaseError(error: any): RepositoryError {
  // PostgreSQL error codes
  switch (error.code) {
    case '23505': // unique_violation
      return new RepositoryError(
        RepositoryErrorCode.UNIQUE_CONSTRAINT,
        'Entity with these values already exists',
        error
      )
    
    case '23503': // foreign_key_violation
      return new RepositoryError(
        RepositoryErrorCode.FOREIGN_KEY_VIOLATION,
        'Referenced entity does not exist',
        error
      )
    
    case '23514': // check_violation
      return new RepositoryError(
        RepositoryErrorCode.CHECK_CONSTRAINT,
        'Entity data violates business constraints',
        error
      )
    
    case '40001': // serialization_failure
      return new RepositoryError(
        RepositoryErrorCode.CONCURRENT_MODIFICATION,
        'Concurrent modification detected',
        error
      )
    
    default:
      return new RepositoryError(
        RepositoryErrorCode.CONNECTION_FAILED,
        `Database operation failed: ${error.message}`,
        error
      )
  }
}
```

## Transaction Management

### Transaction Boundary Strategy

**Aggregate Boundary Transactions**:
```typescript
class TransactionManager {
  constructor(private readonly client: SupabaseClient) {}
  
  async executeInTransaction<T>(
    work: (client: SupabaseClient) => Promise<Result<T>>
  ): Promise<Result<T>> {
    const transaction = this.client.from('_transactions').begin()
    
    try {
      const result = await work(transaction)
      
      if (result.isSuccess) {
        await transaction.commit()
        return result
      } else {
        await transaction.rollback()
        return result
      }
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }
  
  // Support for distributed transactions across multiple repositories
  async executeDistributedTransaction<T>(
    repositories: BaseRepository[],
    work: (repos: BaseRepository[]) => Promise<Result<T>>
  ): Promise<Result<T>> {
    // Implementation depends on distributed transaction coordinator
    // Could use Saga pattern for cross-service transactions
    return this.executeSaga(repositories, work)
  }
}
```

### Optimistic Concurrency Control

**Version-Based Concurrency**:
```typescript
abstract class OptimisticRepository<TEntity, TId> 
  extends BaseAggregateRepository<TEntity, TId> {
  
  async save(entity: TEntity): Promise<Result<void>> {
    const currentVersion = this.getEntityVersion(entity)
    
    const { error } = await this.client
      .from(this.tableName)
      .update(this.mapFromEntity(entity))
      .eq('id', this.getEntityId(entity))
      .eq('version', currentVersion) // Optimistic lock check
    
    if (error) {
      if (error.code === '40001') {
        return Result.failure('Entity was modified by another user')
      }
      return this.handleDatabaseError(error)
    }
    
    // Increment version after successful update
    this.incrementEntityVersion(entity)
    return Result.success(undefined)
  }
}
```

## Performance Optimization

### Query Optimization Strategies

**Connection Pooling**:
```typescript
class SupabaseConnectionManager {
  private readonly pools: Map<string, SupabaseClient> = new Map()
  
  getConnection(config: ConnectionConfig): SupabaseClient {
    const key = this.generatePoolKey(config)
    
    if (!this.pools.has(key)) {
      const client = createClient(config.url, config.key, {
        db: {
          schema: config.schema || 'public',
          poolSize: config.poolSize || 10,
          idleTimeoutMillis: config.idleTimeout || 30000,
          connectionTimeoutMillis: config.connectionTimeout || 5000
        }
      })
      
      this.pools.set(key, client)
    }
    
    return this.pools.get(key)!
  }
}
```

**Caching Integration**:
```typescript
class CachedRepository<TEntity, TId> extends BaseAggregateRepository<TEntity, TId> {
  constructor(
    client: SupabaseClient,
    private readonly cache: ICacheService,
    private readonly ttl: number = 300 // 5 minutes default
  ) {
    super(client)
  }
  
  async findById(id: TId): Promise<Result<TEntity | null>> {
    const cacheKey = this.getCacheKey(id)
    
    // Try cache first
    const cached = await this.cache.get<TEntity>(cacheKey)
    if (cached.isSuccess && cached.value !== null) {
      return Result.success(cached.value)
    }
    
    // Cache miss - fetch from database
    const result = await super.findById(id)
    
    if (result.isSuccess && result.value !== null) {
      // Cache the result
      await this.cache.set(cacheKey, result.value, this.ttl)
    }
    
    return result
  }
  
  async save(entity: TEntity): Promise<Result<void>> {
    const result = await super.save(entity)
    
    if (result.isSuccess) {
      // Invalidate cache
      const cacheKey = this.getCacheKey(this.getEntityId(entity))
      await this.cache.delete(cacheKey)
    }
    
    return result
  }
}
```

### Query Performance Monitoring

**Performance Metrics Collection**:
```typescript
class PerformanceMonitoringRepository<TEntity, TId> 
  extends BaseAggregateRepository<TEntity, TId> {
  
  constructor(
    client: SupabaseClient,
    private readonly metrics: IMetricsCollector
  ) {
    super(client)
  }
  
  protected async executeWithMetrics<T>(
    operation: string,
    query: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await query()
      
      this.metrics.recordQueryDuration(
        operation,
        this.tableName,
        Date.now() - startTime,
        'success'
      )
      
      return result
    } catch (error) {
      this.metrics.recordQueryDuration(
        operation,
        this.tableName,
        Date.now() - startTime,
        'error'
      )
      
      throw error
    }
  }
  
  async findById(id: TId): Promise<Result<TEntity | null>> {
    return this.executeWithMetrics(`findById`, async () => {
      return super.findById(id)
    })
  }
}
```

## Testing Strategies

### Repository Contract Tests

**Interface Compliance Testing**:
```typescript
// Generic contract test for all repositories
export function createRepositoryContractTests<TEntity, TId>(
  repositoryFactory: () => IRepository<TEntity, TId>,
  entityFactory: () => TEntity,
  idExtractor: (entity: TEntity) => TId
) {
  describe('Repository Contract Tests', () => {
    let repository: IRepository<TEntity, TId>
    let testEntity: TEntity
    
    beforeEach(() => {
      repository = repositoryFactory()
      testEntity = entityFactory()
    })
    
    it('should save and retrieve entity', async () => {
      // Save entity
      const saveResult = await repository.save(testEntity)
      expect(saveResult.isSuccess).toBe(true)
      
      // Retrieve entity
      const id = idExtractor(testEntity)
      const findResult = await repository.findById(id)
      
      expect(findResult.isSuccess).toBe(true)
      expect(findResult.value).toEqual(testEntity)
    })
    
    it('should return null for non-existent entity', async () => {
      const result = await repository.findById('non-existent' as TId)
      
      expect(result.isSuccess).toBe(true)
      expect(result.value).toBeNull()
    })
    
    it('should handle concurrent modifications', async () => {
      // Implementation specific to optimistic concurrency
    })
  })
}
```

### Integration Tests

**Database Integration Testing**:
```typescript
describe('SupabaseFunctionModelRepository Integration', () => {
  let repository: SupabaseFunctionModelRepository
  let testDatabase: TestDatabase
  
  beforeAll(async () => {
    testDatabase = await TestDatabase.create()
    repository = new SupabaseFunctionModelRepository(
      testDatabase.getClient(),
      new InMemoryEventBus()
    )
  })
  
  afterAll(async () => {
    await testDatabase.cleanup()
  })
  
  beforeEach(async () => {
    await testDatabase.clearTables(['function_models'])
  })
  
  it('should handle complex queries with joins', async () => {
    // Create test data with relationships
    const model = FunctionModelFactory.createWithNodes()
    await repository.save(model)
    
    // Test complex query
    const result = await repository.findWithDependencies(model.modelId)
    
    expect(result.isSuccess).toBe(true)
    expect(result.value.nodes).toHaveLength(2)
    expect(result.value.actionNodes).toHaveLength(3)
  })
  
  it('should maintain transaction integrity', async () => {
    const model = FunctionModelFactory.create()
    
    // Simulate transaction failure
    jest.spyOn(repository, 'mapFromEntity').mockImplementation(() => {
      throw new Error('Serialization error')
    })
    
    const result = await repository.save(model)
    
    expect(result.isFailure).toBe(true)
    
    // Verify no partial data was saved
    const findResult = await repository.findById(model.modelId)
    expect(findResult.value).toBeNull()
  })
})
```

## Implementation Guidelines

### Repository Implementation Checklist

**Essential Implementation Steps**:
1. **Interface Compliance**: Implement all methods defined in domain interfaces
2. **Result Pattern**: Return `Result<T>` from all operations
3. **Error Handling**: Translate database errors to domain-appropriate messages
4. **Transaction Boundaries**: Respect aggregate boundaries for atomicity
5. **Event Integration**: Publish domain events after successful operations
6. **Performance**: Optimize queries for expected usage patterns
7. **Caching**: Implement caching for frequently accessed data
8. **Testing**: Create comprehensive unit and integration tests

### Code Quality Guidelines

**Implementation Standards**:
- **Clean Code**: Follow SOLID principles and clean code practices
- **Testability**: Design for easy unit testing and mocking
- **Documentation**: Document complex queries and business logic
- **Logging**: Add appropriate logging for debugging and monitoring
- **Error Handling**: Provide detailed error messages for troubleshooting
- **Performance**: Monitor query performance and optimize bottlenecks

### Integration Points

**Cross-Layer Dependencies**:
- **Domain Layer**: Implement interfaces defined in domain
- **Application Layer**: Support use case coordination patterns
- **Infrastructure Layer**: Integrate with event bus and caching services
- **Presentation Layer**: Provide data for UI and API responses

**External Dependencies**:
- **Supabase Client**: Database connectivity and querying
- **Event Bus**: Domain event publishing
- **Cache Service**: Performance optimization
- **Metrics Collector**: Performance monitoring
- **Logger**: Operational visibility

## Event Infrastructure

### SupabaseDomainEventBus

**Purpose**: Implements domain event publishing and subscription infrastructure using Supabase as the event store.

**Interface Implementation**:
```typescript
class SupabaseDomainEventBus implements IDomainEventBus {
  constructor(
    private readonly client: SupabaseClient,
    private readonly eventStore: EventStore,
    private readonly handlers: Map<string, EventHandler[]> = new Map()
  ) {}
  
  // Core Event Publishing
  async publish<T extends DomainEvent>(event: T): Promise<Result<void>>
  async publishBatch(events: DomainEvent[]): Promise<Result<void>>
  
  // Event Subscription Management
  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): Result<void>
  unsubscribe(eventType: string, handler: EventHandler): Result<void>
  
  // Event Replay and Recovery
  async replayEvents(fromTimestamp: Date): Promise<Result<DomainEvent[]>>
  async getEventHistory(aggregateId: string): Promise<Result<DomainEvent[]>>
}
```

**Event Publishing Implementation**:
```typescript
async publish<T extends DomainEvent>(event: T): Promise<Result<void>> {
  try {
    // Store event in event store
    const storeResult = await this.eventStore.saveEvent(event)
    if (storeResult.isFailure) {
      return storeResult
    }
    
    // Publish to Supabase Realtime for immediate subscribers
    const { error: realtimeError } = await this.client
      .channel('domain-events')
      .send({
        type: 'broadcast',
        event: event.eventType,
        payload: {
          eventId: event.eventId,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          occurredAt: event.occurredAt,
          data: event.data,
          version: event.version
        }
      })
    
    if (realtimeError) {
      // Log error but don't fail - stored events can be replayed
      console.warn('Realtime publishing failed:', realtimeError)
    }
    
    // Execute registered handlers
    await this.executeHandlers(event)
    
    return Result.success(undefined)
  } catch (error) {
    return Result.failure(`Event publishing failed: ${error.message}`)
  }
}
```

**Event Handler Registration**:
```typescript
subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): Result<void> {
  try {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    
    const handlers = this.handlers.get(eventType)!
    handlers.push(handler)
    
    // Set up Supabase Realtime subscription
    this.client
      .channel('domain-events')
      .on('broadcast', { event: eventType }, async (payload) => {
        const event = this.deserializeEvent(payload.payload)
        await this.safeExecuteHandler(handler, event)
      })
      .subscribe()
    
    return Result.success(undefined)
  } catch (error) {
    return Result.failure(`Handler registration failed: ${error.message}`)
  }
}
```

### EventStore

**Purpose**: Provides durable event storage and retrieval capabilities.

**Core Functionality**:
```typescript
class EventStore {
  constructor(private readonly client: SupabaseClient) {}
  
  // Event Persistence
  async saveEvent(event: DomainEvent): Promise<Result<void>> {
    try {
      const { error } = await this.client
        .from('domain_events')
        .insert({
          event_id: event.eventId,
          event_type: event.eventType,
          aggregate_id: event.aggregateId,
          aggregate_type: event.aggregateType,
          event_data: event.data,
          event_version: event.version,
          occurred_at: event.occurredAt.toISOString(),
          correlation_id: event.correlationId,
          causation_id: event.causationId
        })
      
      if (error) {
        return Result.failure(`Event storage failed: ${error.message}`)
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Event storage error: ${error.message}`)
    }
  }
  
  // Event Retrieval
  async getEvents(aggregateId: string): Promise<Result<DomainEvent[]>> {
    try {
      const { data, error } = await this.client
        .from('domain_events')
        .select('*')
        .eq('aggregate_id', aggregateId)
        .order('occurred_at', { ascending: true })
      
      if (error) {
        return Result.failure(`Event retrieval failed: ${error.message}`)
      }
      
      const events = data.map(row => this.deserializeEvent(row))
      return Result.success(events)
    } catch (error) {
      return Result.failure(`Event retrieval error: ${error.message}`)
    }
  }
  
  async getEventsByType(eventType: string): Promise<Result<DomainEvent[]>> {
    try {
      const { data, error } = await this.client
        .from('domain_events')
        .select('*')
        .eq('event_type', eventType)
        .order('occurred_at', { ascending: true })
      
      if (error) {
        return Result.failure(`Event type query failed: ${error.message}`)
      }
      
      const events = data.map(row => this.deserializeEvent(row))
      return Result.success(events)
    } catch (error) {
      return Result.failure(`Event type query error: ${error.message}`)
    }
  }
  
  // Event Schema Management
  async validateEventSchema(event: DomainEvent): Result<void> {
    // Implement event schema validation
    // This could use JSON Schema or similar validation
    return Result.success(undefined)
  }
  
  async migrateEventVersion(oldVersion: string, newVersion: string): Promise<Result<void>> {
    // Implement event version migration logic
    return Result.success(undefined)
  }
}
```

### Domain Event Handlers

**Purpose**: Implement specific handlers for different types of domain events.

#### AuditLogEventHandler

**Audit Trail Management**:
```typescript
class AuditLogEventHandler implements IEventHandler<DomainEvent> {
  constructor(private readonly client: SupabaseClient) {}
  
  async handle(event: FunctionModelCreated): Promise<Result<void>> {
    try {
      const auditEntry = {
        audit_id: generateId(),
        table_name: 'function_models',
        operation: 'CREATE',
        record_id: event.aggregateId,
        new_data: event.data,
        old_data: null,
        changed_by: event.data.userId,
        changed_at: event.occurredAt.toISOString(),
        event_type: event.eventType,
        event_data: event.data,
        model_id: event.aggregateId
      }
      
      const { error } = await this.client
        .from('audit_logs')
        .insert(auditEntry)
      
      if (error) {
        return Result.failure(`Audit log creation failed: ${error.message}`)
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Audit handler error: ${error.message}`)
    }
  }
  
  async handle(event: FunctionModelPublished): Promise<Result<void>> {
    try {
      const auditEntry = {
        audit_id: generateId(),
        table_name: 'function_models',
        operation: 'PUBLISH',
        record_id: event.aggregateId,
        new_data: { status: 'published', publishedAt: event.occurredAt },
        old_data: { status: 'draft' },
        changed_by: event.data.publishedBy,
        changed_at: event.occurredAt.toISOString(),
        event_type: event.eventType,
        event_data: event.data,
        model_id: event.aggregateId
      }
      
      await this.client.from('audit_logs').insert(auditEntry)
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Audit handler error: ${error.message}`)
    }
  }
}
```

#### CrossFeatureEventHandler

**Cross-Feature Integration Events**:
```typescript
class CrossFeatureEventHandler implements IEventHandler<DomainEvent> {
  constructor(
    private readonly client: SupabaseClient,
    private readonly knowledgeBaseService: IKnowledgeBaseService,
    private readonly spindleService: ISpindleService
  ) {}
  
  async handle(event: NodeLinkCreated): Promise<Result<void>> {
    try {
      // Update link strength calculations
      await this.updateLinkMetrics(event.data.linkId)
      
      // Notify related features about new connection
      await this.notifyFeatureIntegration(event.data)
      
      // Update search indexes for discoverability
      await this.updateSearchIndexes(event.data)
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Cross-feature handler error: ${error.message}`)
    }
  }
  
  async handle(event: AIAgentExecutionCompleted): Promise<Result<void>> {
    try {
      // Update agent performance metrics
      const performanceUpdate = {
        last_executed_at: event.occurredAt.toISOString(),
        execution_count: event.data.executionCount,
        success_rate: event.data.successRate,
        average_duration: event.data.averageDuration
      }
      
      const { error } = await this.client
        .from('ai_agents')
        .update({ performance_metrics: performanceUpdate })
        .eq('agent_id', event.data.agentId)
      
      if (error) {
        return Result.failure(`Agent metrics update failed: ${error.message}`)
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Agent execution handler error: ${error.message}`)
    }
  }
}
```

#### NotificationEventHandler

**User Notification Management**:
```typescript
class NotificationEventHandler implements IEventHandler<DomainEvent> {
  constructor(
    private readonly emailService: INotificationService,
    private readonly realtimeService: IRealtimeService
  ) {}
  
  async handle(event: WorkflowExecutionFailed): Promise<Result<void>> {
    try {
      // Send email notification
      await this.emailService.sendExecutionFailed(
        event.data.userId,
        event.data.executionId
      )
      
      // Send real-time notification
      await this.realtimeService.publishToUser(
        event.data.userId,
        {
          type: 'workflow_execution_failed',
          modelId: event.aggregateId,
          executionId: event.data.executionId,
          error: event.data.error,
          timestamp: event.occurredAt
        }
      )
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Notification handler error: ${error.message}`)
    }
  }
  
  async handle(event: ModelPublished): Promise<Result<void>> {
    try {
      // Notify model owner
      await this.emailService.sendModelPublished(
        event.data.userId,
        event.aggregateId
      )
      
      // Notify team members if applicable
      if (event.data.teamMembers?.length > 0) {
        for (const memberId of event.data.teamMembers) {
          await this.realtimeService.publishToUser(
            memberId,
            {
              type: 'model_published',
              modelId: event.aggregateId,
              publishedBy: event.data.userId,
              timestamp: event.occurredAt
            }
          )
        }
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Model publish notification error: ${error.message}`)
    }
  }
}
```

## External Service Adapters

### Cross-Feature Integration Adapters

#### KnowledgeBaseServiceAdapter

**Purpose**: Integrates Function Models with the Knowledge Base feature.

**Interface Implementation**:
```typescript
class KnowledgeBaseServiceAdapter implements IKnowledgeBaseService {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: KnowledgeBaseConfig
  ) {}
  
  async findContentById(id: string): Promise<Result<KnowledgeContent>> {
    try {
      const response = await this.httpClient.get(
        `${this.config.baseUrl}/content/${id}`,
        {
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
          timeout: 5000
        }
      )
      
      if (!response.ok) {
        return Result.failure(`Knowledge Base content not found: ${id}`)
      }
      
      const content = this.mapToKnowledgeContent(response.data)
      return Result.success(content)
    } catch (error) {
      return Result.failure(`Knowledge Base service error: ${error.message}`)
    }
  }
  
  async searchContent(query: string): Promise<Result<KnowledgeContent[]>> {
    try {
      const response = await this.httpClient.post(
        `${this.config.baseUrl}/search`,
        { 
          query,
          filters: { type: 'function_model_related' },
          limit: 50
        },
        {
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
          timeout: 10000
        }
      )
      
      if (!response.ok) {
        return Result.failure('Knowledge Base search failed')
      }
      
      const contents = response.data.results.map(item => 
        this.mapToKnowledgeContent(item)
      )
      
      return Result.success(contents)
    } catch (error) {
      return Result.failure(`Knowledge Base search error: ${error.message}`)
    }
  }
  
  async linkToFunctionModel(kbId: string, modelId: string): Promise<Result<void>> {
    try {
      const response = await this.httpClient.post(
        `${this.config.baseUrl}/links`,
        {
          sourceType: 'knowledge_content',
          sourceId: kbId,
          targetType: 'function_model',
          targetId: modelId,
          linkType: 'reference'
        },
        {
          headers: { Authorization: `Bearer ${this.config.apiKey}` }
        }
      )
      
      if (!response.ok) {
        return Result.failure('Failed to create knowledge base link')
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Link creation error: ${error.message}`)
    }
  }
}
```

#### SpindleWorkflowServiceAdapter

**Purpose**: Integrates Function Models with Spindle workflow execution.

**Interface Implementation**:
```typescript
class SpindleWorkflowServiceAdapter implements ISpindleService {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: SpindleConfig
  ) {}
  
  async executeWorkflow(workflowId: string, params: any): Promise<Result<ExecutionResult>> {
    try {
      const response = await this.httpClient.post(
        `${this.config.baseUrl}/workflows/${workflowId}/execute`,
        {
          parameters: params,
          context: {
            source: 'function_model',
            executedAt: new Date().toISOString()
          }
        },
        {
          headers: { 
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )
      
      if (!response.ok) {
        return Result.failure(`Workflow execution failed: ${response.statusText}`)
      }
      
      const result: ExecutionResult = {
        executionId: response.data.executionId,
        status: response.data.status,
        startedAt: new Date(response.data.startedAt),
        result: response.data.result
      }
      
      return Result.success(result)
    } catch (error) {
      return Result.failure(`Spindle execution error: ${error.message}`)
    }
  }
  
  async getWorkflowStatus(executionId: string): Promise<Result<WorkflowStatus>> {
    try {
      const response = await this.httpClient.get(
        `${this.config.baseUrl}/executions/${executionId}/status`,
        {
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
          timeout: 5000
        }
      )
      
      if (!response.ok) {
        return Result.failure(`Status check failed: ${response.statusText}`)
      }
      
      const status: WorkflowStatus = {
        executionId: response.data.executionId,
        status: response.data.status,
        progress: response.data.progress,
        startedAt: new Date(response.data.startedAt),
        completedAt: response.data.completedAt ? new Date(response.data.completedAt) : null,
        error: response.data.error
      }
      
      return Result.success(status)
    } catch (error) {
      return Result.failure(`Status check error: ${error.message}`)
    }
  }
  
  async stopExecution(executionId: string): Promise<Result<void>> {
    try {
      const response = await this.httpClient.post(
        `${this.config.baseUrl}/executions/${executionId}/stop`,
        {},
        {
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
          timeout: 10000
        }
      )
      
      if (!response.ok) {
        return Result.failure(`Execution stop failed: ${response.statusText}`)
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Execution stop error: ${error.message}`)
    }
  }
}
```

#### AIAgentServiceAdapter

**Purpose**: Integrates with AI Agent services for intelligent automation.

**Interface Implementation**:
```typescript
class AIAgentServiceAdapter implements IAIAgentService {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: AIAgentConfig
  ) {}
  
  async executeAgent(agentId: string, task: any): Promise<Result<AgentResult>> {
    try {
      const response = await this.httpClient.post(
        `${this.config.baseUrl}/agents/${agentId}/execute`,
        {
          task,
          context: {
            source: 'function_model',
            timestamp: new Date().toISOString()
          }
        },
        {
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
          timeout: 60000 // AI agents may take longer
        }
      )
      
      if (!response.ok) {
        return Result.failure(`Agent execution failed: ${response.statusText}`)
      }
      
      const result: AgentResult = {
        executionId: response.data.executionId,
        agentId: agentId,
        result: response.data.result,
        confidence: response.data.confidence,
        duration: response.data.duration,
        tokensUsed: response.data.tokensUsed
      }
      
      return Result.success(result)
    } catch (error) {
      return Result.failure(`Agent execution error: ${error.message}`)
    }
  }
  
  async discoverCapableAgents(requirements: string[]): Promise<Result<AIAgent[]>> {
    try {
      const response = await this.httpClient.post(
        `${this.config.baseUrl}/agents/discover`,
        {
          requirements,
          context: 'function_model'
        },
        {
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
          timeout: 10000
        }
      )
      
      if (!response.ok) {
        return Result.failure(`Agent discovery failed: ${response.statusText}`)
      }
      
      const agents = response.data.agents.map(agent => 
        this.mapToAIAgent(agent)
      )
      
      return Result.success(agents)
    } catch (error) {
      return Result.failure(`Agent discovery error: ${error.message}`)
    }
  }
  
  async registerAgentPerformance(agentId: string, metrics: any): Promise<Result<void>> {
    try {
      const response = await this.httpClient.post(
        `${this.config.baseUrl}/agents/${agentId}/performance`,
        metrics,
        {
          headers: { Authorization: `Bearer ${this.config.apiKey}` }
        }
      )
      
      if (!response.ok) {
        return Result.failure(`Performance registration failed: ${response.statusText}`)
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Performance registration error: ${error.message}`)
    }
  }
}
```

### Communication Service Adapters

#### EmailNotificationServiceAdapter

**Purpose**: Handles email notifications for Function Model events.

**Interface Implementation**:
```typescript
class EmailNotificationServiceAdapter implements INotificationService {
  constructor(
    private readonly emailClient: EmailClient,
    private readonly templateService: ITemplateService
  ) {}
  
  async sendWorkflowCompleted(userId: string, modelId: string): Promise<Result<void>> {
    try {
      const user = await this.getUserDetails(userId)
      const model = await this.getModelDetails(modelId)
      
      const template = await this.templateService.getTemplate('workflow_completed')
      const htmlContent = template.render({
        userName: user.name,
        modelName: model.name,
        completedAt: new Date(),
        modelUrl: `${this.config.appUrl}/function-model/${modelId}`
      })
      
      const result = await this.emailClient.send({
        to: user.email,
        subject: `Workflow Complete: ${model.name}`,
        html: htmlContent,
        tags: ['workflow', 'completion', 'function-model']
      })
      
      if (!result.success) {
        return Result.failure(`Email send failed: ${result.error}`)
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Email notification error: ${error.message}`)
    }
  }
  
  async sendExecutionFailed(userId: string, executionId: string): Promise<Result<void>> {
    try {
      const user = await this.getUserDetails(userId)
      const execution = await this.getExecutionDetails(executionId)
      
      const template = await this.templateService.getTemplate('execution_failed')
      const htmlContent = template.render({
        userName: user.name,
        modelName: execution.modelName,
        executionId: executionId,
        error: execution.error,
        failedAt: execution.failedAt,
        retryUrl: `${this.config.appUrl}/function-model/${execution.modelId}/execute`
      })
      
      const result = await this.emailClient.send({
        to: user.email,
        subject: `Execution Failed: ${execution.modelName}`,
        html: htmlContent,
        priority: 'high',
        tags: ['workflow', 'failure', 'function-model']
      })
      
      if (!result.success) {
        return Result.failure(`Email send failed: ${result.error}`)
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Email notification error: ${error.message}`)
    }
  }
  
  async sendModelPublished(userId: string, modelId: string): Promise<Result<void>> {
    try {
      const user = await this.getUserDetails(userId)
      const model = await this.getModelDetails(modelId)
      
      const template = await this.templateService.getTemplate('model_published')
      const htmlContent = template.render({
        userName: user.name,
        modelName: model.name,
        publishedAt: new Date(),
        modelUrl: `${this.config.appUrl}/function-model/${modelId}`,
        shareUrl: `${this.config.appUrl}/published/${modelId}`
      })
      
      const result = await this.emailClient.send({
        to: user.email,
        subject: `Published: ${model.name}`,
        html: htmlContent,
        tags: ['publication', 'function-model']
      })
      
      if (!result.success) {
        return Result.failure(`Email send failed: ${result.error}`)
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Email notification error: ${error.message}`)
    }
  }
}
```

#### RealtimeNotificationServiceAdapter

**Purpose**: Provides real-time notifications using Supabase Realtime.

**Interface Implementation**:
```typescript
class RealtimeNotificationServiceAdapter implements IRealtimeService {
  constructor(private readonly client: SupabaseClient) {}
  
  async publishToUser(userId: string, message: any): Promise<Result<void>> {
    try {
      const channel = this.client.channel(`user:${userId}`)
      
      const { error } = await channel.send({
        type: 'broadcast',
        event: 'user_notification',
        payload: {
          ...message,
          userId: userId,
          timestamp: new Date().toISOString()
        }
      })
      
      if (error) {
        return Result.failure(`Realtime publish failed: ${error.message}`)
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Realtime service error: ${error.message}`)
    }
  }
  
  async publishToChannel(channel: string, message: any): Promise<Result<void>> {
    try {
      const realtimeChannel = this.client.channel(channel)
      
      const { error } = await realtimeChannel.send({
        type: 'broadcast',
        event: 'channel_message',
        payload: {
          ...message,
          channel: channel,
          timestamp: new Date().toISOString()
        }
      })
      
      if (error) {
        return Result.failure(`Channel publish failed: ${error.message}`)
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Channel service error: ${error.message}`)
    }
  }
  
  async subscribeToModelUpdates(modelId: string): Promise<Result<Subscription>> {
    try {
      const channel = this.client
        .channel(`model:${modelId}`)
        .on('broadcast', { event: 'model_update' }, (payload) => {
          // Handle model update events
          this.handleModelUpdate(payload)
        })
        .on('broadcast', { event: 'execution_status' }, (payload) => {
          // Handle execution status updates
          this.handleExecutionUpdate(payload)
        })
        .subscribe()
      
      const subscription: Subscription = {
        channel: channel,
        modelId: modelId,
        unsubscribe: () => channel.unsubscribe()
      }
      
      return Result.success(subscription)
    } catch (error) {
      return Result.failure(`Subscription error: ${error.message}`)
    }
  }
}
```

## Background Processing Services

### WorkflowExecutionService

**Purpose**: Handles asynchronous workflow execution and monitoring.

**Interface Implementation**:
```typescript
class WorkflowExecutionService implements IBackgroundService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly orchestrationService: WorkflowOrchestrationService,
    private readonly eventBus: IDomainEventBus
  ) {}
  
  async executeWorkflowAsync(modelId: string, context: any): Promise<Result<string>> {
    try {
      const executionId = generateId()
      
      // Create execution record
      const { error: insertError } = await this.client
        .from('workflow_executions')
        .insert({
          execution_id: executionId,
          model_id: modelId,
          status: 'queued',
          context: context,
          created_at: new Date().toISOString()
        })
      
      if (insertError) {
        return Result.failure(`Execution record creation failed: ${insertError.message}`)
      }
      
      // Queue the execution for background processing
      await this.queueExecution(executionId, modelId, context)
      
      return Result.success(executionId)
    } catch (error) {
      return Result.failure(`Workflow execution queuing error: ${error.message}`)
    }
  }
  
  async getExecutionStatus(executionId: string): Promise<Result<ExecutionStatus>> {
    try {
      const { data, error } = await this.client
        .from('workflow_executions')
        .select('*')
        .eq('execution_id', executionId)
        .single()
      
      if (error) {
        return Result.failure(`Execution status query failed: ${error.message}`)
      }
      
      const status: ExecutionStatus = {
        executionId: data.execution_id,
        modelId: data.model_id,
        status: data.status,
        progress: data.progress,
        startedAt: data.started_at ? new Date(data.started_at) : null,
        completedAt: data.completed_at ? new Date(data.completed_at) : null,
        error: data.error,
        result: data.result
      }
      
      return Result.success(status)
    } catch (error) {
      return Result.failure(`Execution status error: ${error.message}`)
    }
  }
  
  async cancelExecution(executionId: string): Promise<Result<void>> {
    try {
      // Update execution status to cancelled
      const { error: updateError } = await this.client
        .from('workflow_executions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          error: 'Execution cancelled by user'
        })
        .eq('execution_id', executionId)
      
      if (updateError) {
        return Result.failure(`Execution cancellation failed: ${updateError.message}`)
      }
      
      // Publish cancellation event
      await this.eventBus.publish(new WorkflowExecutionCancelled(
        executionId,
        new Date()
      ))
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Execution cancellation error: ${error.message}`)
    }
  }
  
  private async queueExecution(executionId: string, modelId: string, context: any): Promise<void> {
    // Implementation would use a job queue (Redis, Bull, etc.)
    // For now, simulate with setTimeout for background processing
    setTimeout(async () => {
      await this.processExecution(executionId, modelId, context)
    }, 1000)
  }
  
  private async processExecution(executionId: string, modelId: string, context: any): Promise<void> {
    try {
      // Update status to running
      await this.client
        .from('workflow_executions')
        .update({
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('execution_id', executionId)
      
      // Execute the workflow using orchestration service
      const result = await this.orchestrationService.executeWorkflow(modelId, context)
      
      if (result.isSuccess) {
        // Update status to completed
        await this.client
          .from('workflow_executions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result: result.value
          })
          .eq('execution_id', executionId)
        
        // Publish success event
        await this.eventBus.publish(new WorkflowExecutionCompleted(
          executionId,
          modelId,
          result.value,
          new Date()
        ))
      } else {
        // Update status to failed
        await this.client
          .from('workflow_executions')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error: result.error
          })
          .eq('execution_id', executionId)
        
        // Publish failure event
        await this.eventBus.publish(new WorkflowExecutionFailed(
          executionId,
          modelId,
          result.error,
          new Date()
        ))
      }
    } catch (error) {
      // Handle processing error
      await this.client
        .from('workflow_executions')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          error: error.message
        })
        .eq('execution_id', executionId)
    }
  }
}
```

### AuditLogProcessingService

**Purpose**: Processes audit logs for compliance and reporting.

**Interface Implementation**:
```typescript
class AuditLogProcessingService implements IBackgroundService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly storageService: IFileStorageService
  ) {}
  
  async processAuditLogs(): Promise<Result<void>> {
    try {
      // Process unprocessed audit logs
      const { data: unprocessedLogs, error } = await this.client
        .from('audit_logs')
        .select('*')
        .is('processed_at', null)
        .order('changed_at', { ascending: true })
        .limit(1000)
      
      if (error) {
        return Result.failure(`Audit log query failed: ${error.message}`)
      }
      
      for (const log of unprocessedLogs) {
        await this.processAuditLog(log)
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Audit log processing error: ${error.message}`)
    }
  }
  
  async generateAuditReports(): Promise<Result<void>> {
    try {
      const today = new Date()
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      
      // Generate monthly audit report
      const { data: auditData, error } = await this.client
        .from('audit_logs')
        .select('*')
        .gte('changed_at', lastMonth.toISOString())
        .lt('changed_at', today.toISOString())
        .order('changed_at', { ascending: true })
      
      if (error) {
        return Result.failure(`Audit data query failed: ${error.message}`)
      }
      
      // Generate report content
      const report = this.generateReportContent(auditData, lastMonth)
      
      // Save report to storage
      const reportId = `audit_report_${lastMonth.getFullYear()}_${lastMonth.getMonth() + 1}`
      await this.storageService.uploadModelExport(reportId, report)
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Audit report generation error: ${error.message}`)
    }
  }
  
  async cleanupOldAuditLogs(): Promise<Result<void>> {
    try {
      const retentionDate = new Date()
      retentionDate.setMonth(retentionDate.getMonth() - 12) // Keep 12 months
      
      const { error } = await this.client
        .from('audit_logs')
        .delete()
        .lt('changed_at', retentionDate.toISOString())
      
      if (error) {
        return Result.failure(`Audit log cleanup failed: ${error.message}`)
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Audit log cleanup error: ${error.message}`)
    }
  }
  
  private async processAuditLog(log: any): Promise<void> {
    // Implement audit log processing logic
    // This could include data enrichment, classification, etc.
    
    await this.client
      .from('audit_logs')
      .update({ processed_at: new Date().toISOString() })
      .eq('audit_id', log.audit_id)
  }
  
  private generateReportContent(auditData: any[], period: Date): any {
    // Implement audit report generation logic
    return {
      period: period.toISOString(),
      totalOperations: auditData.length,
      operationsByType: this.groupByOperation(auditData),
      userActivity: this.groupByUser(auditData),
      modelActivity: this.groupByModel(auditData),
      generatedAt: new Date().toISOString()
    }
  }
}
```

## File Storage Services

### SupabaseStorageService

**Purpose**: Manages file storage for model exports and attachments using Supabase Storage.

**Interface Implementation**:
```typescript
class SupabaseStorageService implements IFileStorageService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly bucketName: string = 'function-model-exports'
  ) {}
  
  async uploadModelExport(modelId: string, data: any): Promise<Result<string>> {
    try {
      const exportId = generateId()
      const fileName = `${modelId}/${exportId}.json`
      
      // Convert data to JSON string
      const fileContent = JSON.stringify(data, null, 2)
      const file = new File([fileContent], fileName, { type: 'application/json' })
      
      // Upload to Supabase Storage
      const { data: uploadData, error } = await this.client.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        return Result.failure(`File upload failed: ${error.message}`)
      }
      
      // Create export record
      const { error: recordError } = await this.client
        .from('model_exports')
        .insert({
          export_id: exportId,
          model_id: modelId,
          file_path: uploadData.path,
          file_size: file.size,
          content_type: 'application/json',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
      
      if (recordError) {
        // Clean up uploaded file if record creation fails
        await this.client.storage
          .from(this.bucketName)
          .remove([fileName])
        
        return Result.failure(`Export record creation failed: ${recordError.message}`)
      }
      
      return Result.success(exportId)
    } catch (error) {
      return Result.failure(`Export upload error: ${error.message}`)
    }
  }
  
  async downloadModelExport(exportId: string): Promise<Result<any>> {
    try {
      // Get export record
      const { data: exportRecord, error: recordError } = await this.client
        .from('model_exports')
        .select('*')
        .eq('export_id', exportId)
        .single()
      
      if (recordError) {
        return Result.failure(`Export record not found: ${recordError.message}`)
      }
      
      // Check if export has expired
      if (new Date(exportRecord.expires_at) < new Date()) {
        return Result.failure('Export has expired')
      }
      
      // Download file from storage
      const { data: fileData, error: downloadError } = await this.client.storage
        .from(this.bucketName)
        .download(exportRecord.file_path)
      
      if (downloadError) {
        return Result.failure(`File download failed: ${downloadError.message}`)
      }
      
      // Convert blob to JSON
      const text = await fileData.text()
      const data = JSON.parse(text)
      
      return Result.success(data)
    } catch (error) {
      return Result.failure(`Export download error: ${error.message}`)
    }
  }
  
  async deleteExpiredExports(): Promise<Result<void>> {
    try {
      // Find expired exports
      const { data: expiredExports, error: queryError } = await this.client
        .from('model_exports')
        .select('export_id, file_path')
        .lt('expires_at', new Date().toISOString())
      
      if (queryError) {
        return Result.failure(`Expired exports query failed: ${queryError.message}`)
      }
      
      // Delete files from storage
      const filePaths = expiredExports.map(export => export.file_path)
      if (filePaths.length > 0) {
        const { error: deleteError } = await this.client.storage
          .from(this.bucketName)
          .remove(filePaths)
        
        if (deleteError) {
          console.warn('Some files could not be deleted from storage:', deleteError)
        }
      }
      
      // Delete export records
      const exportIds = expiredExports.map(export => export.export_id)
      if (exportIds.length > 0) {
        const { error: recordDeleteError } = await this.client
          .from('model_exports')
          .delete()
          .in('export_id', exportIds)
        
        if (recordDeleteError) {
          return Result.failure(`Export record deletion failed: ${recordDeleteError.message}`)
        }
      }
      
      return Result.success(undefined)
    } catch (error) {
      return Result.failure(`Expired exports cleanup error: ${error.message}`)
    }
  }
  
  async getExportInfo(exportId: string): Promise<Result<ExportInfo>> {
    try {
      const { data, error } = await this.client
        .from('model_exports')
        .select('*')
        .eq('export_id', exportId)
        .single()
      
      if (error) {
        return Result.failure(`Export info query failed: ${error.message}`)
      }
      
      const info: ExportInfo = {
        exportId: data.export_id,
        modelId: data.model_id,
        fileSize: data.file_size,
        contentType: data.content_type,
        createdAt: new Date(data.created_at),
        expiresAt: new Date(data.expires_at),
        isExpired: new Date(data.expires_at) < new Date()
      }
      
      return Result.success(info)
    } catch (error) {
      return Result.failure(`Export info error: ${error.message}`)
    }
  }
}
```

## Conclusion

The repository layer provides the critical bridge between domain logic and data persistence, ensuring that all database operations align with business requirements while maintaining optimal performance and reliability. The comprehensive base classes and specialized implementations support the full range of Function Model domain operations while preserving Clean Architecture principles.

This expanded infrastructure documentation now includes:

**Event Infrastructure**:
- **SupabaseDomainEventBus**: Complete event publishing and subscription system
- **EventStore**: Durable event persistence and retrieval
- **Event Handlers**: AuditLogEventHandler, CrossFeatureEventHandler, NotificationEventHandler

**External Service Adapters**:
- **KnowledgeBaseServiceAdapter**: Integration with Knowledge Base feature
- **SpindleWorkflowServiceAdapter**: Integration with Spindle workflow execution
- **AIAgentServiceAdapter**: Integration with AI Agent services
- **Communication Adapters**: Email and realtime notification services

**Background Processing Services**:
- **WorkflowExecutionService**: Asynchronous workflow execution and monitoring
- **AuditLogProcessingService**: Audit log processing for compliance and reporting

**File Storage Services**:
- **SupabaseStorageService**: Complete file storage management with export capabilities

Key architectural decisions include:
- **Result Pattern Consistency**: Uniform error handling across all infrastructure components
- **Aggregate Boundary Respect**: Transactions align with domain boundaries
- **Event-Driven Integration**: Comprehensive event handling for cross-feature coordination
- **Performance Optimization**: Caching, connection pooling, and query optimization built-in
- **Comprehensive Testing**: Contract tests ensure interface compliance
- **Resilient External Integration**: Circuit breakers, retries, and fallback strategies

This infrastructure foundation enables the application layer to focus on business logic coordination while ensuring robust, scalable, and maintainable data persistence operations across all Silver AI Automation platform features.