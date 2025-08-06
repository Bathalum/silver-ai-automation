# Domain Layer Complete Guide

## Overview
This document contains **EVERYTHING** you need to build a robust Domain Layer following Clean Architecture principles. This is a **general, reusable guide** that can be applied to any project, not specific to any particular business domain. The guide follows a **node-based architecture** where all domain concepts are represented as nodes with cross-feature connectivity.

## Core Principles
- **Pure business logic** - no external dependencies
- **Immutable nodes** where possible
- **Value objects** for domain concepts
- **Domain services** for complex business logic
- **Domain events** for state changes
- **Business rules** as domain logic
- **Type safety** throughout the domain layer
- **Consistent patterns** across all domain components
- **Node heterogeneity** handling for different node types
- **Cross-feature connectivity** for unified visualization

## Naming Conventions

### Database Schema (Snake Case)
- **Tables**: `process_nodes`, `content_nodes`, `integration_nodes`, `domain_nodes`, `node_links`
- **Columns**: `node_id`, `node_type`, `source_node_id`, `target_node_id`, `created_at`
- **Foreign Keys**: `node_id`, `created_by`, `deleted_by`
- **Constraints**: `unique_node_version`, `valid_node_types`

### TypeScript/JavaScript (Camel Case)
- **Interfaces**: `ProcessNode`, `ContentNode`, `IntegrationNode`, `DomainNode`, `CrossFeatureLink`
- **Properties**: `nodeId`, `nodeType`, `sourceNodeId`, `targetNodeId`, `createdAt`
- **Functions**: `getProcessNodes`, `createNodeLink`, `updateNode`
- **Types**: `NodeType`, `NodeStatus`, `LinkType`

### API Endpoints (Kebab Case)
- **Routes**: `/process-nodes`, `/content-nodes`, `/node-links`, `/api/nodes/{id}`
- **Query Parameters**: `node-type`, `domain-type`, `created-after`

### Cross-Reference Mapping
| Database (Snake) | TypeScript (Camel) | API (Kebab) |
|------------------|-------------------|-------------|
| `node_id` | `nodeId` | `node-id` |
| `node_type` | `nodeType` | `node-type` |
| `source_node_id` | `sourceNodeId` | `source-node-id` |
| `created_at` | `createdAt` | `created-at` |
| `process_nodes` | `ProcessNode[]` | `process-nodes` |

### Repository Mapping Functions
All repository classes must implement consistent mapping functions:
```typescript
// Database to TypeScript
private mapDbToNode(row: any): BaseNode
private mapDbToNodeLink(row: any): CrossFeatureLink

// TypeScript to Database
private mapNodeToDb(node: Partial<BaseNode>): any
private mapNodeLinkToDb(link: Partial<CrossFeatureLink>): any
```

## Node Heterogeneity Analysis

### Critical Architectural Challenge

The nodes across different features are **fundamentally different** in nature, purpose, and behavior, but we need a **unified interface** for cross-feature connectivity and visualization. This is a core architectural challenge that must be addressed.

#### Node Type Characteristics

**1. Process Nodes (Workflow/Business Process)**
- **Nature**: High-level process mapping and workflow design
- **Purpose**: Represent stages, actions, decision points in business processes
- **Behavior**: 
  - Hierarchical relationships (parent-child)
  - Sequential flow (stage → stage)
  - Process-oriented (input → process → output)
  - Static structure with dynamic execution paths
- **Examples**: Stage nodes, action nodes, decision nodes, container nodes
- **Complexity**: High - complex business logic, multiple relationships
- **Lifecycle**: Long-term process definitions

**2. Content Nodes (Document/Knowledge Management)**
- **Nature**: Content management and documentation
- **Purpose**: Store, organize, and link knowledge artifacts
- **Behavior**:
  - Content-centric (SOPs, procedures, guidelines)
  - Reference-based relationships
  - Version-controlled content
  - Searchable and taggable
- **Examples**: SOP nodes, category nodes, template nodes
- **Complexity**: Medium - content management, versioning
- **Lifecycle**: Content evolution and updates

**3. Integration Nodes (Automation/System Integration)**
- **Nature**: Integration and automation workflows
- **Purpose**: Connect systems, automate processes, handle data transformation
- **Behavior**:
  - Integration-focused (API calls, data transformation)
  - Event-driven (triggers and actions)
  - Real-time execution
  - Error handling and retry logic
- **Examples**: API nodes, trigger nodes, action nodes, data transformation nodes
- **Complexity**: High - integration logic, error handling, real-time execution
- **Lifecycle**: Dynamic execution and monitoring

**4. Domain Nodes (Business Domain Modeling)**
- **Nature**: Domain modeling and event-driven architecture
- **Purpose**: Model business domains and event flows
- **Behavior**:
  - Domain-centric (business domains, bounded contexts)
  - Event-driven (event sourcing patterns)
  - Temporal relationships (before/after events)
  - Aggregate-based modeling
- **Examples**: Domain nodes, event nodes, aggregate nodes
- **Complexity**: High - domain modeling, event sourcing
- **Lifecycle**: Domain evolution and event history

### Abstraction Strategy

To handle this heterogeneity while maintaining a unified interface, we need a **multi-layered abstraction approach**:

#### 1. Base Node Interface (Common Properties)

```typescript
// lib/domain/entities/base-entity-types.ts

export interface BaseNode {
  // Universal properties (all nodes share these)
  id: string
  nodeType: NodeType
  name: string
  description?: string
  
  // Visual representation (for unified visualization)
  position?: Position
  visualProperties?: VisualProperties
  
  // Metadata and connectivity
  metadata: NodeMetadata
  
  // Universal lifecycle
  createdAt: Date
  updatedAt: Date
  status: NodeStatus
  deletedAt?: Date
  deletedBy?: string
}

export interface Position {
  x: number
  y: number
}

export interface VisualProperties {
  color?: string
  icon?: string
  size?: 'small' | 'medium' | 'large'
  style?: Record<string, any>
  entitySpecific?: Record<string, any>
}

export interface NodeMetadata {
  tags: string[]
  aiAgent?: AIAgentConfig
  vectorEmbedding?: number[]
  searchKeywords: string[]
  crossFeatureLinks?: CrossFeatureLinkMetadata[]
  customFields?: Record<string, any>
}

export type NodeStatus = 'active' | 'inactive' | 'draft' | 'archived' | 'error'
export type NodeType = string // Flexible for any node type
```

#### 2. Domain-Specific Node Interfaces

```typescript
// lib/domain/entities/domain-entity-types.ts

export interface DomainNode extends BaseNode {
  nodeType: string // Your specific domain node type
  domainType: DomainType
  
  // Domain-specific properties
  domainData: {
    [key: string]: any // Flexible for any domain data
  }
  
  // Behavior-specific properties
  behavior: {
    executionType?: 'sequential' | 'parallel' | 'conditional' | 'async'
    dependencies?: string[] // IDs of dependent nodes
    timeout?: number
    retryPolicy?: RetryPolicy
  }
  
  // Business logic properties
  businessLogic: {
    [key: string]: any // Flexible for any business logic
  }
}

export type DomainType = 'process' | 'content' | 'integration' | 'domain' | 'custom'
```

#### 3. Node Behavior Abstraction

```typescript
// lib/domain/entities/entity-behavior-types.ts

// Abstract behavior interfaces for different node types
export interface NodeBehavior {
  canExecute(): boolean
  getDependencies(): string[]
  getOutputs(): any[]
  validate(): ValidationResult
  getBehaviorType(): string
  getBehaviorConfig(): Record<string, any>
}

export interface ProcessNodeBehavior extends NodeBehavior {
  execute(): Promise<ExecutionResult>
  rollback(): Promise<void>
  getExecutionPath(): string[]
  getProcessState(): ProcessState
}

export interface ContentNodeBehavior extends NodeBehavior {
  render(): string
  search(query: string): SearchResult[]
  version(): VersionInfo
  getContentState(): ContentState
}

export interface IntegrationNodeBehavior extends NodeBehavior {
  connect(): Promise<ConnectionResult>
  transform(data: any): Promise<any>
  handleError(error: Error): Promise<ErrorHandlingResult>
  getIntegrationState(): IntegrationState
}

export interface DomainNodeBehavior extends NodeBehavior {
  handleCommand(command: any): Promise<Event[]>
  applyEvent(event: any): void
  getState(): any
  getDomainState(): DomainState
}

// Factory for creating appropriate behavior based on node type
export class NodeBehaviorFactory {
  static createBehavior(node: BaseNode): NodeBehavior {
    const domainType = (node as DomainNode).domainType
    
    switch (domainType) {
      case 'process':
        return new ProcessNodeBehavior(node as ProcessNode)
      case 'content':
        return new ContentNodeBehavior(node as ContentNode)
      case 'integration':
        return new IntegrationNodeBehavior(node as IntegrationNode)
      case 'domain':
        return new DomainNodeBehavior(node as DomainNode)
      default:
        throw new Error(`Unknown domain type: ${domainType}`)
    }
  }
}
```

#### 4. Cross-Feature Link Abstraction

```typescript
// lib/domain/entities/cross-entity-link-types.ts

export interface CrossFeatureLink {
  linkId: string
  sourceNodeType: string
  sourceNodeId: string
  sourceNodeNodeId?: string
  targetNodeType: string
  targetNodeId: string
  targetNodeNodeId?: string
  linkType: LinkType
  linkStrength: number
  linkContext: Record<string, any>
  visualProperties: VisualProperties
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// Link types that make sense across different node types
export type LinkType = 
  | 'references'      // One node references another
  | 'implements'      // One node implements another
  | 'documents'       // One node documents another
  | 'supports'        // One node supports another
  | 'nested'          // One node is nested within another
  | 'triggers'        // One node triggers another
  | 'consumes'        // One node consumes events from another
  | 'produces'        // One node produces events for another
  | 'custom'          // Custom link type

// Link validation based on node types
export class CrossFeatureLinkValidator {
  static validateLink(source: BaseNode, target: BaseNode, linkType: LinkType): ValidationResult {
    // Validate that the link type makes sense for the node types
    const validCombinations = this.getValidLinkCombinations(source.nodeType, target.nodeType)
    
    if (!validCombinations.includes(linkType)) {
      return {
        isValid: false,
        errors: [`Link type '${linkType}' is not valid between ${source.nodeType} and ${target.nodeType} nodes`]
      }
    }
    
    return { isValid: true, errors: [] }
  }
  
  private static getValidLinkCombinations(sourceType: string, targetType: string): LinkType[] {
    // Default combinations - can be customized per project
    const combinations: Record<string, LinkType[]> = {
      'process-content': ['documents', 'references', 'implements'],
      'process-integration': ['triggers', 'consumes', 'produces'],
      'process-domain': ['implements', 'references'],
      'content-process': ['documents', 'references'],
      'content-integration': ['documents', 'references'],
      'content-domain': ['documents', 'references'],
      'integration-process': ['implements', 'supports'],
      'integration-content': ['consumes', 'produces'],
      'integration-domain': ['consumes', 'produces'],
      'domain-process': ['triggers', 'supports'],
      'domain-content': ['triggers', 'supports'],
      'domain-integration': ['triggers', 'supports']
    }
    
    const key = `${sourceType}-${targetType}`
    return combinations[key] || ['references']
  }
}
```

#### 5. Unified Node Operations Interface

```typescript
// lib/use-cases/unified-node-operations.ts

export interface UnifiedNodeOperations {
  // Universal node operations (work across all node types)
  createNode<T extends BaseNode>(node: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>
  getNode<T extends BaseNode>(nodeType: string, nodeId: string, nodeNodeId?: string): Promise<T | null>
  updateNode<T extends BaseNode>(nodeType: string, nodeId: string, nodeNodeId: string, updates: Partial<T>): Promise<T>
  deleteNode(nodeType: string, nodeId: string, nodeNodeId: string): Promise<void>
  
  // Cross-node operations
  createNodeLink(link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<CrossFeatureLink>
  getNodeLinks(nodeType: string, nodeId: string, nodeNodeId?: string): Promise<CrossFeatureLink[]>
  getConnectedNodes(nodeType: string, nodeId: string, nodeNodeId?: string): Promise<BaseNode[]>
  
  // Node-specific operations (delegated to appropriate handlers)
  executeNode(nodeType: string, nodeId: string, nodeNodeId: string, context?: any): Promise<any>
  validateNode(nodeType: string, nodeId: string, nodeNodeId: string): Promise<ValidationResult>
  getNodeBehavior(nodeType: string, nodeId: string, nodeNodeId: string): Promise<NodeBehavior>
}

// Implementation that handles node heterogeneity
export class UnifiedNodeOperationsImpl implements UnifiedNodeOperations {
  async executeNode(nodeType: string, nodeId: string, nodeNodeId: string, context?: any): Promise<any> {
    const node = await this.getNode(nodeType, nodeId, nodeNodeId)
    if (!node) throw new Error('Node not found')
    
    const behavior = NodeBehaviorFactory.createBehavior(node)
    
    // Execute based on node type
    const domainType = (node as DomainNode).domainType
    switch (domainType) {
      case 'process':
        return await (behavior as ProcessNodeBehavior).execute()
      case 'integration':
        return await (behavior as IntegrationNodeBehavior).connect()
      case 'content':
        return await (behavior as ContentNodeBehavior).render()
      case 'domain':
        return await (behavior as DomainNodeBehavior).getState()
      default:
        throw new Error(`Unsupported domain type: ${domainType}`)
    }
  }
  
  async validateNode(nodeType: string, nodeId: string, nodeNodeId: string): Promise<ValidationResult> {
    const node = await this.getNode(nodeType, nodeId, nodeNodeId)
    if (!node) throw new Error('Node not found')
    
    const behavior = NodeBehaviorFactory.createBehavior(node)
    return await behavior.validate()
  }
}
```

## 1. Base Node Types (WHAT + HOW)

### WHAT: Base Node Interface
```typescript
// lib/domain/entities/base-entity-types.ts

export interface BaseNode {
  // Universal properties (all nodes share these)
  id: string
  nodeType: NodeType
  name: string
  description?: string
  
  // Visual representation (for unified visualization)
  position?: Position
  visualProperties?: VisualProperties
  
  // Metadata and connectivity
  metadata: NodeMetadata
  
  // Universal lifecycle
  createdAt: Date
  updatedAt: Date
  status: NodeStatus
  deletedAt?: Date
  deletedBy?: string
}

export interface Position {
  x: number
  y: number
}

export interface VisualProperties {
  color?: string
  icon?: string
  size?: 'small' | 'medium' | 'large'
  style?: Record<string, any>
  entitySpecific?: Record<string, any>
}

export interface NodeMetadata {
  tags: string[]
  aiAgent?: AIAgentConfig
  vectorEmbedding?: number[]
  searchKeywords: string[]
  crossFeatureLinks?: CrossFeatureLinkMetadata[]
  customFields?: Record<string, any>
}

export type NodeStatus = 'active' | 'inactive' | 'draft' | 'archived' | 'error'
export type NodeType = string // Flexible for any node type
```

### HOW: Always follow these patterns for base nodes
- ✅ **Use camelCase** for all TypeScript properties
- ✅ **Make interfaces immutable** (readonly where possible)
- ✅ **Use union types** for status and node types
- ✅ **Include visual properties** for unified visualization
- ✅ **Include metadata** for extensibility
- ✅ **Use optional properties** for flexibility
- ✅ **Include soft delete** support

## 2. Domain-Specific Node Types (WHAT + HOW)

### WHAT: Domain Node Pattern
```typescript
// lib/domain/entities/domain-entity-types.ts

export interface DomainNode extends BaseNode {
  nodeType: string // Your specific domain node type
  domainType: DomainType
  
  // Domain-specific properties
  domainData: {
    [key: string]: any // Flexible for any domain data
  }
  
  // Behavior-specific properties
  behavior: {
    executionType?: 'sequential' | 'parallel' | 'conditional' | 'async'
    dependencies?: string[] // IDs of dependent nodes
    timeout?: number
    retryPolicy?: RetryPolicy
  }
  
  // Business logic properties
  businessLogic: {
    [key: string]: any // Flexible for any business logic
  }
}

export type DomainType = 'process' | 'content' | 'integration' | 'domain' | 'custom'
```

### WHAT: Process Node Example
```typescript
// lib/domain/entities/process-entity-types.ts

export interface ProcessNode extends BaseNode {
  nodeType: 'process'
  domainType: 'process'
  
  // Process-specific properties
  domainData: {
    stage?: Stage
    action?: ActionItem
    input?: DataPort
    output?: DataPort
    container?: Container
  }
  
  // Process-specific behavior
  behavior: {
    executionType: 'sequential' | 'parallel' | 'conditional'
    dependencies: string[]
    timeout?: number
    retryPolicy?: RetryPolicy
  }
  
  // Process business logic
  businessLogic: {
    raciMatrix?: RACIMatrix
    sla?: ServiceLevelAgreement
    kpis?: KeyPerformanceIndicator[]
  }
}
```

### WHAT: Content Node Example
```typescript
// lib/domain/entities/content-entity-types.ts

export interface ContentNode extends BaseNode {
  nodeType: 'content'
  domainType: 'content'
  
  // Content-specific properties
  domainData: {
    content?: Content
    category?: Category
    template?: Template
  }
  
  // Content-specific behavior
  behavior: {
    contentType: 'document' | 'procedure' | 'template' | 'reference'
    versioning: VersioningPolicy
    approvalWorkflow?: ApprovalWorkflow
    searchable: boolean
  }
  
  // Content business logic
  businessLogic: {
    readTime: number
    complexity: 'simple' | 'moderate' | 'complex'
    targetAudience: string[]
    prerequisites: string[]
  }
}
```

### WHAT: Integration Node Example
```typescript
// lib/domain/entities/integration-entity-types.ts

export interface IntegrationNode extends BaseNode {
  nodeType: 'integration'
  domainType: 'integration'
  
  // Integration-specific properties
  domainData: {
    connector?: ConnectorConfig
    transformation?: TransformationConfig
    trigger?: TriggerConfig
  }
  
  // Integration-specific behavior
  behavior: {
    executionMode: 'synchronous' | 'asynchronous' | 'batch'
    rateLimit?: RateLimit
    timeout: number
    retryPolicy: RetryPolicy
    errorHandling: ErrorHandlingStrategy
  }
  
  // Integration business logic
  businessLogic: {
    apiEndpoint?: string
    authentication?: AuthenticationConfig
    dataMapping?: DataMappingConfig
    monitoring?: MonitoringConfig
  }
}
```

### HOW: Always follow these patterns for domain nodes
- ✅ **Extend BaseNode** for all domain nodes
- ✅ **Use nodeType literal** to ensure type safety
- ✅ **Group related properties** in nested objects
- ✅ **Use value objects** for complex domain concepts
- ✅ **Make value objects immutable** with readonly properties
- ✅ **Include behavior properties** for node-specific logic
- ✅ **Use flexible domainData** for extensibility

## 3. Cross-Feature Link Types (WHAT + HOW)

### WHAT: Cross-Feature Links
```typescript
// lib/domain/entities/cross-entity-link-types.ts

export interface CrossFeatureLink {
  linkId: string
  sourceNodeType: string
  sourceNodeId: string
  sourceNodeNodeId?: string
  targetNodeType: string
  targetNodeId: string
  targetNodeNodeId?: string
  linkType: LinkType
  linkStrength: number
  linkContext: Record<string, any>
  visualProperties: VisualProperties
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type LinkType = 
  | 'references'      // One node references another
  | 'implements'      // One node implements another
  | 'documents'       // One node documents another
  | 'supports'        // One node supports another
  | 'nested'          // One node is nested within another
  | 'triggers'        // One node triggers another
  | 'consumes'        // One node consumes events from another
  | 'produces'        // One node produces events for another
  | 'custom'          // Custom link type

export interface LinkTypeDefinition {
  typeId: string
  typeName: string
  description: string
  color: string
  icon: string
  isBidirectional: boolean
  allowedSourceTypes?: string[]
  allowedTargetTypes?: string[]
}
```

### HOW: Always follow these patterns for links
- ✅ **Use camelCase** for all properties
- ✅ **Include source and target** with node types
- ✅ **Use union types** for link types
- ✅ **Include visual properties** for UI rendering
- ✅ **Include context** for link-specific data
- ✅ **Support custom link types** for flexibility

## 4. AI Integration Types (WHAT + HOW)

### WHAT: AI Agent Configuration
```typescript
// lib/domain/entities/ai-integration-types.ts

export interface AIAgentConfig {
  enabled: boolean
  instructions: string
  tools: AITool[]
  capabilities: {
    reasoning: boolean
    toolUse: boolean
    memory: boolean
    learning: boolean
    custom?: Record<string, boolean>
  }
  metadata: {
    model: string
    temperature: number
    maxTokens: number
    contextWindow: number
    custom?: Record<string, any>
  }
}

export interface AITool {
  name: string
  description: string
  parameters: Record<string, any>
  mcpServer?: string
  custom?: Record<string, any>
}

export interface VectorEmbedding {
  vector: number[]
  model: string
  dimensions: number
  metadata: Record<string, any>
}

export interface AIAgentExecutionResult {
  success: boolean
  output?: any
  error?: string
  executionTime: number
  tokensUsed: number
  metadata?: Record<string, any>
}

export interface AIAgentValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata?: Record<string, any>
}
```

### HOW: Always follow these patterns for AI integration
- ✅ **Use boolean flags** for capabilities
- ✅ **Include metadata** for configuration
- ✅ **Use arrays** for tools and vectors
- ✅ **Include model information** for traceability
- ✅ **Support custom fields** for extensibility
- ✅ **Include execution results** for monitoring

## 5. Node Behavior Abstraction (WHAT + HOW)

### WHAT: Node Behavior Interfaces
```typescript
// lib/domain/entities/entity-behavior-types.ts

export interface NodeBehavior {
  canExecute(): boolean
  getDependencies(): string[]
  getOutputs(): any[]
  validate(): ValidationResult
  getBehaviorType(): string
  getBehaviorConfig(): Record<string, any>
}

export interface ProcessNodeBehavior extends NodeBehavior {
  execute(): Promise<ExecutionResult>
  rollback(): Promise<void>
  getExecutionPath(): string[]
  getProcessState(): ProcessState
}

export interface ContentNodeBehavior extends NodeBehavior {
  render(): string
  search(query: string): SearchResult[]
  version(): VersionInfo
  getContentState(): ContentState
}

export interface IntegrationNodeBehavior extends NodeBehavior {
  connect(): Promise<ConnectionResult>
  transform(data: any): Promise<any>
  handleError(error: Error): Promise<ErrorHandlingResult>
  getIntegrationState(): IntegrationState
}

export interface DomainNodeBehavior extends NodeBehavior {
  handleCommand(command: any): Promise<Event[]>
  applyEvent(event: any): void
  getState(): any
  getDomainState(): DomainState
}

// Factory for creating appropriate behavior based on node type
export class NodeBehaviorFactory {
  static createBehavior(node: BaseNode): NodeBehavior {
    const domainType = (node as DomainNode).domainType
    
    switch (domainType) {
      case 'process':
        return new ProcessNodeBehavior(node as ProcessNode)
      case 'content':
        return new ContentNodeBehavior(node as ContentNode)
      case 'integration':
        return new IntegrationNodeBehavior(node as IntegrationNode)
      case 'domain':
        return new DomainNodeBehavior(node as DomainNode)
      default:
        throw new Error(`Unknown domain type: ${domainType}`)
    }
  }
}

// Supporting interfaces
export interface SearchResult {
  nodeId: string
  relevance: number
  content: string
  metadata: Record<string, any>
}

export interface VersionInfo {
  version: string
  createdAt: Date
  createdBy: string
  changes: string[]
}

export interface ConnectionResult {
  success: boolean
  connectionId?: string
  error?: string
  metadata?: Record<string, any>
}

export interface ErrorHandlingResult {
  handled: boolean
  retryCount: number
  nextRetry?: Date
  error: Error
}

export interface ProcessState {
  status: 'idle' | 'running' | 'completed' | 'failed'
  progress: number
  currentStep?: string
  errors: string[]
}

export interface ContentState {
  status: 'draft' | 'published' | 'archived'
  version: string
  lastModified: Date
  readCount: number
}

export interface IntegrationState {
  status: 'disconnected' | 'connected' | 'error'
  lastSync: Date
  errorCount: number
  performance: Record<string, number>
}

export interface DomainState {
  status: 'active' | 'inactive'
  lastEvent: Date
  eventCount: number
  aggregateVersion: number
}
```

### HOW: Always follow these patterns for behavior
- ✅ **Use interfaces** for behavior contracts
- ✅ **Extend base behavior** for specific types
- ✅ **Use factory pattern** for creation
- ✅ **Include validation** in all behaviors
- ✅ **Use async methods** for external operations
- ✅ **Include state management** for monitoring

## 6. Domain Services (WHAT + HOW)

### WHAT: Cross-Feature Link Validator
```typescript
// lib/domain/services/cross-entity-link-validator.ts

export class CrossFeatureLinkValidator {
  static validateLink(source: BaseNode, target: BaseNode, linkType: LinkType): ValidationResult {
    // Validate that the link type makes sense for the node types
    const validCombinations = this.getValidLinkCombinations(source.nodeType, target.nodeType)
    
    if (!validCombinations.includes(linkType)) {
      return {
        isValid: false,
        errors: [`Link type '${linkType}' is not valid between ${source.nodeType} and ${target.nodeType} nodes`]
      }
    }
    
    return { isValid: true, errors: [] }
  }
  
  private static getValidLinkCombinations(sourceType: string, targetType: string): LinkType[] {
    // Default combinations - can be customized per project
    const combinations: Record<string, LinkType[]> = {
      'process-content': ['documents', 'references', 'implements'],
      'process-integration': ['triggers', 'consumes', 'produces'],
      'process-domain': ['implements', 'references'],
      'content-process': ['documents', 'references'],
      'content-integration': ['documents', 'references'],
      'content-domain': ['documents', 'references'],
      'integration-process': ['implements', 'supports'],
      'integration-content': ['consumes', 'produces'],
      'integration-domain': ['consumes', 'produces'],
      'domain-process': ['triggers', 'supports'],
      'domain-content': ['triggers', 'supports'],
      'domain-integration': ['triggers', 'supports']
    }
    
    const key = `${sourceType}-${targetType}`
    return combinations[key] || ['references']
  }
}
```

### WHAT: AI Agent Service
```typescript
// lib/domain/services/ai-agent-service.ts

export class AIAgentService {
  static createAgent(node: BaseNode, config: AIAgentConfig): AIAgentConfig {
    // Validate agent configuration
    if (!config.instructions.trim()) {
      throw new DomainError('AI agent must have instructions')
    }
    
    if (config.tools.length === 0) {
      throw new DomainError('AI agent must have at least one tool')
    }
    
    return {
      ...config,
      enabled: true,
      metadata: {
        ...config.metadata,
        createdAt: new Date(),
        nodeId: node.id,
        nodeType: node.nodeType
      }
    }
  }
  
  static validateAgent(agent: AIAgentConfig): AIAgentValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Instructions validation
    if (!agent.instructions.trim()) {
      errors.push('Agent must have instructions')
    }
    
    if (agent.instructions.length > 10000) {
      errors.push('Agent instructions cannot exceed 10,000 characters')
    }
    
    // Tools validation
    if (agent.tools.length === 0) {
      errors.push('Agent must have at least one tool')
    }
    
    if (agent.tools.length > 50) {
      errors.push('Agent cannot have more than 50 tools')
    }
    
    // Metadata validation
    if (agent.metadata.temperature < 0 || agent.metadata.temperature > 2) {
      errors.push('Temperature must be between 0 and 2')
    }
    
    if (agent.metadata.maxTokens < 1 || agent.metadata.maxTokens > 100000) {
      errors.push('Max tokens must be between 1 and 100,000')
    }
    
    if (agent.metadata.contextWindow < 1 || agent.metadata.contextWindow > 1000000) {
      errors.push('Context window must be between 1 and 1,000,000')
    }
    
    // Capabilities validation
    if (!agent.capabilities.reasoning && !agent.capabilities.toolUse) {
      warnings.push('Agent has no reasoning or tool use capabilities')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        validationTimestamp: new Date()
      }
    }
  }
  
  static updateAgent(agent: AIAgentConfig, updates: Partial<AIAgentConfig>): AIAgentConfig {
    const updatedAgent = {
      ...agent,
      ...updates,
      metadata: {
        ...agent.metadata,
        ...updates.metadata,
        updatedAt: new Date()
      }
    }
    
    const validation = this.validateAgent(updatedAgent)
    if (!validation.isValid) {
      throw new AIAgentError(
        `Agent validation failed: ${validation.errors.join(', ')}`,
        agent.metadata?.entityId || 'unknown'
      )
    }
    
    return updatedAgent
  }
  
  static enableAgent(agent: AIAgentConfig): AIAgentConfig {
    return {
      ...agent,
      enabled: true,
      metadata: {
        ...agent.metadata,
        enabledAt: new Date()
      }
    }
  }
  
  static disableAgent(agent: AIAgentConfig): AIAgentConfig {
    return {
      ...agent,
      enabled: false,
      metadata: {
        ...agent.metadata,
        disabledAt: new Date()
      }
    }
  }
  
  static addTool(agent: AIAgentConfig, tool: AITool): AIAgentConfig {
    const updatedTools = [...agent.tools, tool]
    
    return {
      ...agent,
      tools: updatedTools,
      metadata: {
        ...agent.metadata,
        toolsUpdatedAt: new Date()
      }
    }
  }
  
  static removeTool(agent: AIAgentConfig, toolName: string): AIAgentConfig {
    const updatedTools = agent.tools.filter(tool => tool.name !== toolName)
    
    if (updatedTools.length === 0) {
      throw new AIAgentError('Cannot remove the last tool from agent', agent.metadata?.entityId || 'unknown')
    }
    
    return {
      ...agent,
      tools: updatedTools,
      metadata: {
        ...agent.metadata,
        toolsUpdatedAt: new Date()
      }
    }
  }
}
```

### HOW: Always follow these patterns for domain services
- ✅ **Use static methods** for stateless operations
- ✅ **Include validation** in all services
- ✅ **Throw domain errors** for business rule violations
- ✅ **Return validation results** with errors array
- ✅ **Use descriptive method names**
- ✅ **Include user context** where appropriate

## 7. Value Objects (WHAT + HOW)

### WHAT: Common Value Objects
```typescript
// lib/domain/value-objects/common-value-objects.ts

export class VersionNumber {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new DomainError('Invalid version number format')
    }
  }

  private isValid(value: string): boolean {
    return /^v\d+\.\d+\.\d+$/.test(value)
  }

  getValue(): string {
    return this.value
  }

  toString(): string {
    return this.value
  }
}

export class Position {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {
    if (x < 0 || y < 0) {
      throw new DomainError('Position coordinates must be non-negative')
    }
  }

  distanceTo(other: Position): number {
    return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2))
  }
}

export class LinkStrength {
  constructor(private readonly value: number) {
    if (value < 0 || value > 1) {
      throw new DomainError('Link strength must be between 0 and 1')
    }
  }

  getValue(): number {
    return this.value
  }
}

export class Email {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new DomainError('Invalid email format')
    }
  }

  private isValid(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  getValue(): string {
    return this.value
  }

  getDomain(): string {
    return this.value.split('@')[1]
  }
}

export class PhoneNumber {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new DomainError('Invalid phone number format')
    }
  }

  private isValid(value: string): boolean {
    return /^\+?[\d\s\-\(\)]+$/.test(value)
  }

  getValue(): string {
    return this.value
  }

  getCountryCode(): string {
    return this.value.startsWith('+') ? this.value.split(' ')[0] : ''
  }
}
```

### WHAT: Domain-Specific Value Objects
```typescript
// lib/domain/value-objects/domain-value-objects.ts

export class ExecutionType {
  constructor(private readonly value: 'sequential' | 'parallel' | 'conditional' | 'async') {}

  getValue(): string {
    return this.value
  }

  isSequential(): boolean {
    return this.value === 'sequential'
  }

  isParallel(): boolean {
    return this.value === 'parallel'
  }

  isConditional(): boolean {
    return this.value === 'conditional'
  }

  isAsync(): boolean {
    return this.value === 'async'
  }
}

export class RetryPolicy {
  constructor(
    public readonly maxRetries: number,
    public readonly backoff: 'linear' | 'exponential' | 'constant',
    public readonly initialDelay: number,
    public readonly maxDelay: number
  ) {
    if (maxRetries < 0) {
      throw new DomainError('Max retries must be non-negative')
    }
    if (initialDelay < 0 || maxDelay < 0) {
      throw new DomainError('Delays must be non-negative')
    }
    if (initialDelay > maxDelay) {
      throw new DomainError('Initial delay cannot be greater than max delay')
    }
  }

  toString(): string {
    return `RetryPolicy(maxRetries:${this.maxRetries}, backoff:${this.backoff})`
  }
}

export class RACIMatrix {
  constructor(
    public readonly responsible: string[],
    public readonly accountable: string[],
    public readonly consulted: string[],
    public readonly informed: string[]
  ) {
    if (responsible.length === 0 && accountable.length === 0) {
      throw new DomainError('At least one responsible or accountable person is required')
    }
  }

  hasResponsible(): boolean {
    return this.responsible.length > 0
  }

  hasAccountable(): boolean {
    return this.accountable.length > 0
  }

  toString(): string {
    return `RACIMatrix(R:${this.responsible.length}, A:${this.accountable.length}, C:${this.consulted.length}, I:${this.informed.length})`
  }
}

export class ServiceLevelAgreement {
  constructor(
    public readonly responseTime: number,
    public readonly availability: number,
    public readonly uptime: number
  ) {
    if (responseTime < 0) {
      throw new DomainError('Response time must be non-negative')
    }
    if (availability < 0 || availability > 100) {
      throw new DomainError('Availability must be between 0 and 100')
    }
    if (uptime < 0 || uptime > 100) {
      throw new DomainError('Uptime must be between 0 and 100')
    }
  }

  isMet(responseTime: number, availability: number, uptime: number): boolean {
    return responseTime <= this.responseTime && 
           availability >= this.availability && 
           uptime >= this.uptime
  }
}
```

### HOW: Always follow these patterns for value objects
- ✅ **Make constructors validate** input data
- ✅ **Use readonly properties** for immutability
- ✅ **Throw domain errors** for invalid values
- ✅ **Include getter methods** for controlled access
- ✅ **Override toString()** for debugging
- ✅ **Include business logic methods** when appropriate
- ✅ **Use descriptive names** for clarity

## 8. Domain Events (WHAT + HOW)

### WHAT: Node Events
```typescript
// lib/domain/events/entity-events.ts

export interface NodeCreatedEvent {
  nodeId: string
  nodeType: string
  name: string
  createdAt: Date
  metadata: Record<string, any>
}

export interface NodeUpdatedEvent {
  nodeId: string
  nodeType: string
  changes: Record<string, any>
  updatedAt: Date
}

export interface NodeDeletedEvent {
  nodeId: string
  nodeType: string
  deletedAt: Date
}

export interface NodeExecutedEvent {
  nodeId: string
  nodeType: string
  executionResult: any
  executedAt: Date
  duration: number
}
```

### WHAT: Cross-Feature Link Events
```typescript
// lib/domain/events/cross-entity-link-events.ts

export interface LinkCreatedEvent {
  linkId: string
  sourceNodeType: string
  sourceNodeId: string
  sourceNodeNodeId?: string
  targetNodeType: string
  targetNodeId: string
  targetNodeNodeId?: string
  linkType: LinkType
  createdAt: Date
}

export interface LinkUpdatedEvent {
  linkId: string
  changes: Record<string, any>
  updatedAt: Date
}

export interface LinkDeletedEvent {
  linkId: string
  deletedAt: Date
}
```

### WHAT: AI Agent Events
```typescript
// lib/domain/events/ai-agent-events.ts

export interface AgentCreatedEvent {
  agentId: string
  entityId: string
  entityType: string
  config: AIAgentConfig
  createdAt: Date
}

export interface AgentExecutedEvent {
  agentId: string
  entityId: string
  entityType: string
  result: AIAgentExecutionResult
  executedAt: Date
}

export interface AgentUpdatedEvent {
  agentId: string
  entityId: string
  entityType: string
  changes: Partial<AIAgentConfig>
  updatedAt: Date
}
```

### HOW: Always follow these patterns for domain events
- ✅ **Use interfaces** for event contracts
- ✅ **Include timestamps** for all events
- ✅ **Include relevant IDs** for event handling
- ✅ **Use descriptive names** ending with 'Event'
- ✅ **Include metadata** for extensibility
- ✅ **Group events by domain** for organization

## 9. Business Rules (WHAT + HOW)

### WHAT: Node Validation Rules
```typescript
// lib/domain/rules/entity-validation-rules.ts

export class NodeValidationRules {
  static validateNode(node: BaseNode): ValidationResult {
    const errors: string[] = []
    
    // Name validation
    if (!node.name.trim()) {
      errors.push('Node must have a name')
    }
    
    if (node.name.length > 255) {
      errors.push('Node name cannot exceed 255 characters')
    }
    
    // Position validation
    if (node.position && (node.position.x < 0 || node.position.y < 0)) {
      errors.push('Node position must be non-negative')
    }
    
    // Status validation
    if (!['active', 'inactive', 'draft', 'archived', 'error'].includes(node.status)) {
      errors.push('Invalid node status')
    }
    
    // Metadata validation
    if (node.metadata.tags && node.metadata.tags.length > 50) {
      errors.push('Node cannot have more than 50 tags')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  static validateDomainNode(node: DomainNode): ValidationResult {
    const baseValidation = this.validateNode(node)
    if (!baseValidation.isValid) {
      return baseValidation
    }
    
    const errors: string[] = []
    
    // Domain-specific validation
    if (node.behavior.timeout && node.behavior.timeout < 0) {
      errors.push('Timeout must be non-negative')
    }
    
    if (node.behavior.dependencies && node.behavior.dependencies.length > 100) {
      errors.push('Node cannot have more than 100 dependencies')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
```

### WHAT: AI Agent Rules
```typescript
// lib/domain/rules/ai-agent-rules.ts

export class AIAgentRules {
  static validateAgent(agent: AIAgentConfig): ValidationResult {
    const errors: string[] = []
    
    // Instructions validation
    if (!agent.instructions.trim()) {
      errors.push('Agent must have instructions')
    }
    
    if (agent.instructions.length > 10000) {
      errors.push('Agent instructions cannot exceed 10,000 characters')
    }
    
    // Tools validation
    if (agent.tools.length === 0) {
      errors.push('Agent must have at least one tool')
    }
    
    if (agent.tools.length > 50) {
      errors.push('Agent cannot have more than 50 tools')
    }
    
    // Metadata validation
    if (agent.metadata.temperature < 0 || agent.metadata.temperature > 2) {
      errors.push('Temperature must be between 0 and 2')
    }
    
    if (agent.metadata.maxTokens < 1 || agent.metadata.maxTokens > 100000) {
      errors.push('Max tokens must be between 1 and 100,000')
    }
    
    if (agent.metadata.contextWindow < 1 || agent.metadata.contextWindow > 1000000) {
      errors.push('Context window must be between 1 and 1,000,000')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
```

### WHAT: Link Validation Rules
```typescript
// lib/domain/rules/link-validation-rules.ts

export class LinkValidationRules {
  static validateLink(link: CrossFeatureLink): ValidationResult {
    const errors: string[] = []
    
    // Basic validation
    if (!link.linkId.trim()) {
      errors.push('Link must have an ID')
    }
    
    if (!link.sourceNodeType.trim()) {
      errors.push('Source node type is required')
    }
    
    if (!link.targetNodeType.trim()) {
      errors.push('Target node type is required')
    }
    
    if (!link.sourceNodeId.trim()) {
      errors.push('Source node ID is required')
    }
    
    if (!link.targetNodeId.trim()) {
      errors.push('Target node ID is required')
    }
    
    // Link type validation
    if (!['references', 'implements', 'documents', 'supports', 'nested', 'triggers', 'consumes', 'produces', 'custom'].includes(link.linkType)) {
      errors.push('Invalid link type')
    }
    
    // Link strength validation
    if (link.linkStrength < 0 || link.linkStrength > 1) {
      errors.push('Link strength must be between 0 and 1')
    }
    
    // Self-link prevention
    if (link.sourceNodeType === link.targetNodeType && 
        link.sourceNodeId === link.targetNodeId && 
        link.sourceNodeNodeId === link.targetNodeNodeId) {
      errors.push('Cannot link node to itself')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
```

### HOW: Always follow these patterns for business rules
- ✅ **Use static methods** for stateless validation
- ✅ **Return ValidationResult** with errors array
- ✅ **Validate base rules first** then specific rules
- ✅ **Use descriptive error messages**
- ✅ **Include reasonable limits** for all fields
- ✅ **Group rules by domain** for organization

## 10. Domain Exceptions (WHAT + HOW)

### WHAT: Domain Exceptions
```typescript
// lib/domain/exceptions/domain-exceptions.ts

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

export class NodeValidationError extends DomainError {
  constructor(message: string, public readonly nodeId: string) {
    super(message)
    this.name = 'NodeValidationError'
  }
}

export class LinkValidationError extends DomainError {
  constructor(message: string, public readonly linkId: string) {
    super(message)
    this.name = 'LinkValidationError'
  }
}

export class AIAgentError extends DomainError {
  constructor(message: string, public readonly agentId: string) {
    super(message)
    this.name = 'AIAgentError'
  }
}

export class CrossFeatureLinkError extends DomainError {
  constructor(message: string, public readonly sourceNodeType: string, public readonly targetNodeType: string) {
    super(message)
    this.name = 'CrossFeatureLinkError'
  }
}

export class ValueObjectError extends DomainError {
  constructor(message: string, public readonly valueObjectType: string) {
    super(message)
    this.name = 'ValueObjectError'
  }
}

export class BusinessRuleError extends DomainError {
  constructor(message: string, public readonly ruleName: string) {
    super(message)
    this.name = 'BusinessRuleError'
  }
}

export class NodeNotFoundError extends DomainError {
  constructor(message: string, public readonly nodeId: string) {
    super(message)
    this.name = 'NodeNotFoundError'
  }
}

export class InvalidOperationError extends DomainError {
  constructor(message: string, public readonly operation: string) {
    super(message)
    this.name = 'InvalidOperationError'
  }
}
```

### HOW: Always follow these patterns for domain exceptions
- ✅ **Extend DomainError** for all domain exceptions
- ✅ **Include relevant context** in constructor
- ✅ **Set proper name** for error type
- ✅ **Use descriptive messages**
- ✅ **Include IDs** for debugging
- ✅ **Group exceptions by domain** for organization

## Implementation Checklist

When implementing the Domain Layer, always:

1. ✅ **Use camelCase** for all TypeScript properties
2. ✅ **Make entities immutable** where possible
3. ✅ **Use value objects** for domain concepts
4. ✅ **Include validation** in constructors
5. ✅ **Throw domain errors** for business rule violations
6. ✅ **Use interfaces** for contracts
7. ✅ **Include timestamps** for all entities
8. ✅ **Use union types** for status and types
9. ✅ **Include visual properties** for UI
10. ✅ **Use factory patterns** for complex creation
11. ✅ **Follow naming conventions** consistently
12. ✅ **Include proper error handling** throughout
13. ✅ **Use type safety** everywhere
14. ✅ **Document complex logic** with comments
15. ✅ **Test all validation paths** thoroughly

## Project Customization Guide

### 1. Define Your Node Types
```typescript
// Customize for your project
export type YourNodeType = 'user' | 'order' | 'product' | 'category'
export type YourDomainType = 'business' | 'technical' | 'operational'
```

### 2. Define Your Value Objects
```typescript
// Add project-specific value objects
export class OrderNumber {
  constructor(private readonly value: string) {
    if (!/^ORD-\d{6}$/.test(value)) {
      throw new DomainError('Invalid order number format')
    }
  }
  
  getValue(): string {
    return this.value
  }
}
```

### 3. Define Your Business Rules
```typescript
// Add project-specific validation rules
export class OrderValidationRules {
  static validateOrder(order: OrderEntity): ValidationResult {
    const errors: string[] = []
    
    if (order.total < 0) {
      errors.push('Order total cannot be negative')
    }
    
    if (order.items.length === 0) {
      errors.push('Order must have at least one item')
    }
    
    return { isValid: errors.length === 0, errors }
  }
}
```

### 4. Define Your Domain Events
```typescript
// Add project-specific events
export interface OrderCreatedEvent {
  orderId: string
  customerId: string
  total: number
  createdAt: Date
}
```

## Database Schema Considerations

### 1. Node-Specific Tables

```sql
-- Enhanced Process Nodes (Workflow/Business Process)
CREATE TABLE process_nodes (
  node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES process_models(model_id),
  
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
  
  -- Node data (domain-specific)
  stage_data JSONB,
  action_data JSONB,
  io_data JSONB,
  container_data JSONB,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Content Nodes (Document/Knowledge Management)
CREATE TABLE content_nodes (
  node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id UUID NOT NULL REFERENCES content_sops(sop_id),
  
  -- Base node properties
  node_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  
  -- Content-specific properties
  content_type VARCHAR(20) DEFAULT 'document',
  versioning_policy JSONB,
  approval_workflow JSONB,
  searchable BOOLEAN DEFAULT true,
  
  -- Content properties
  read_time INTEGER,
  complexity VARCHAR(20) DEFAULT 'moderate',
  target_audience TEXT[] DEFAULT '{}',
  prerequisites TEXT[] DEFAULT '{}',
  
  -- Node data (domain-specific)
  sop_data JSONB,
  category_data JSONB,
  template_data JSONB,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Integration Nodes (Automation/System Integration)
CREATE TABLE integration_nodes (
  node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(integration_id),
  
  -- Base node properties
  node_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  
  -- Integration-specific properties
  integration_type VARCHAR(20) DEFAULT 'api',
  execution_mode VARCHAR(20) DEFAULT 'synchronous',
  rate_limit JSONB,
  timeout INTEGER DEFAULT 30,
  retry_policy JSONB,
  error_handling JSONB,
  
  -- Technical properties
  api_endpoint VARCHAR(500),
  authentication JSONB,
  data_mapping JSONB,
  monitoring JSONB,
  
  -- Node data (domain-specific)
  trigger_data JSONB,
  action_data JSONB,
  transformation_data JSONB,
  condition_data JSONB,
  error_handler_data JSONB,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Domain Nodes (Business Domain Modeling)
CREATE TABLE domain_nodes (
  node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES domains(domain_id),
  
  -- Base node properties
  node_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  
  -- Domain-specific properties
  bounded_context VARCHAR(255),
  aggregate_root VARCHAR(255),
  event_sourcing BOOLEAN DEFAULT false,
  cqrs BOOLEAN DEFAULT false,
  
  -- Event properties
  event_type VARCHAR(20) DEFAULT 'event',
  event_version INTEGER DEFAULT 1,
  event_schema JSONB,
  event_handlers TEXT[] DEFAULT '{}',
  
  -- Node data (domain-specific)
  domain_data JSONB,
  event_data JSONB,
  aggregate_data JSONB,
  policy_data JSONB,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Enhanced Cross-Feature Links

```sql
-- Enhanced Node Links with Type-Specific Context
CREATE TABLE node_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source node
  source_node_type VARCHAR(50) NOT NULL,
  source_node_id UUID NOT NULL,
  source_node_node_id VARCHAR(255),
  
  -- Target node
  target_node_type VARCHAR(50) NOT NULL,
  target_node_id UUID NOT NULL,
  target_node_node_id VARCHAR(255),
  
  -- Link properties
  link_type VARCHAR(50) NOT NULL,
  link_strength DECIMAL(3,2) DEFAULT 1.0,
  link_context JSONB NOT NULL DEFAULT '{}',
  
  -- Type-specific context (based on source and target types)
  process_context JSONB, -- For process node links
  content_context JSONB, -- For content node links
  integration_context JSONB, -- For integration node links
  domain_context JSONB, -- For domain node links
  
  -- Visual properties
  visual_properties JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT no_self_link CHECK (
    NOT (source_node_type = target_node_type AND source_node_id = target_node_id AND source_node_node_id = target_node_node_id)
  ),
  CONSTRAINT valid_node_types CHECK (
    source_node_type IN ('process', 'content', 'integration', 'domain') AND
    target_node_type IN ('process', 'content', 'integration', 'domain')
  )
);
```

## Microservices Architecture Considerations

### 1. Service Boundaries

```typescript
// Service boundaries based on node types
export interface ServiceBoundaries {
  processService: {
    domain: 'process'
    responsibilities: ['process-design', 'workflow-execution', 'business-logic']
    dataOwnership: ['process_models', 'process_nodes']
  }
  
  contentService: {
    domain: 'content'
    responsibilities: ['content-management', 'document-processing', 'search']
    dataOwnership: ['content_sops', 'content_nodes']
  }
  
  integrationService: {
    domain: 'integration'
    responsibilities: ['integration-execution', 'api-management', 'automation']
    dataOwnership: ['integrations', 'integration_nodes']
  }
  
  domainService: {
    domain: 'domain'
    responsibilities: ['domain-modeling', 'event-sourcing', 'cqrs']
    dataOwnership: ['domains', 'domain_nodes']
  }
  
  nodeLinkService: {
    domain: 'cross-feature-linking'
    responsibilities: ['link-management', 'cross-service-communication']
    dataOwnership: ['node_links', 'node_metadata']
  }
}
```

### 2. Cross-Service Communication

```typescript
// Event-driven communication between services
export interface CrossServiceEvents {
  nodeCreated: {
    service: string
    nodeId: string
    nodeType: string
    nodeType: string
    metadata: Record<string, any>
  }
  
  nodeUpdated: {
    service: string
    nodeId: string
    changes: Record<string, any>
  }
  
  nodeDeleted: {
    service: string
    nodeId: string
  }
  
  linkCreated: {
    sourceService: string
    targetService: string
    linkId: string
    linkType: LinkType
  }
}

// Service communication patterns
export interface ServiceCommunication {
  // Synchronous communication for immediate operations
  syncOperations: {
    getNode: (nodeId: string, nodeType: string) => Promise<BaseNode>
    validateLink: (source: BaseNode, target: BaseNode, linkType: LinkType) => Promise<ValidationResult>
  }
  
  // Asynchronous communication for long-running operations
  asyncOperations: {
    executeNode: (nodeId: string, nodeType: string) => Promise<ExecutionResult>
    processCrossFeatureLink: (linkId: string) => Promise<void>
  }
  
  // Event-driven communication for state changes
  events: {
    publishNodeEvent: (event: CrossServiceEvents[keyof CrossServiceEvents]) => Promise<void>
    subscribeToNodeEvents: (eventType: string, handler: Function) => void
  }
}
```

## Implementation Guidelines for Node Heterogeneity

### 1. Development Approach

```typescript
// Factory pattern for creating appropriate node handlers
export class NodeHandlerFactory {
  static createHandler(node: BaseNode): NodeHandler {
    const domainType = (node as DomainNode).domainType
    
    switch (domainType) {
      case 'process':
        return new ProcessNodeHandler(node as ProcessNode)
      case 'content':
        return new ContentNodeHandler(node as ContentNode)
      case 'integration':
        return new IntegrationNodeHandler(node as IntegrationNode)
      case 'domain':
        return new DomainNodeHandler(node as DomainNode)
      default:
        throw new Error(`Unknown domain type: ${domainType}`)
    }
  }
}

// Base handler interface
export interface NodeHandler {
  validate(): Promise<ValidationResult>
  execute(context?: any): Promise<any>
  getDependencies(): string[]
  getOutputs(): any[]
}

// Domain-specific handlers
export class ProcessNodeHandler implements NodeHandler {
  constructor(private node: ProcessNode) {}
  
  async validate(): Promise<ValidationResult> {
    // Validate process-specific logic
    const errors: string[] = []
    
    if (this.node.domainData.stage) {
      if (!this.node.domainData.stage.actions.length) {
        errors.push('Stage must have at least one action')
      }
    }
    
    return { isValid: errors.length === 0, errors }
  }
  
  async execute(context?: any): Promise<any> {
    // Execute process-specific logic
    const behavior = NodeBehaviorFactory.createBehavior(this.node) as ProcessNodeBehavior
    return await behavior.execute()
  }
  
  getDependencies(): string[] {
    return this.node.behavior?.dependencies || []
  }
  
  getOutputs(): any[] {
    // Return process outputs based on node type
    return []
  }
}

export class IntegrationNodeHandler implements NodeHandler {
  constructor(private node: IntegrationNode) {}
  
  async validate(): Promise<ValidationResult> {
    // Validate integration-specific logic
    const errors: string[] = []
    
    if (this.node.domainData.integrationType === 'api' && !this.node.businessLogic.apiEndpoint) {
      errors.push('API nodes must have an endpoint')
    }
    
    return { isValid: errors.length === 0, errors }
  }
  
  async execute(context?: any): Promise<any> {
    // Execute integration-specific logic
    const behavior = NodeBehaviorFactory.createBehavior(this.node) as IntegrationNodeBehavior
    return await behavior.connect()
  }
  
  getDependencies(): string[] {
    // Return integration dependencies
    return []
  }
  
  getOutputs(): any[] {
    // Return integration outputs
    return []
  }
}
```

### 2. Testing Strategy

```typescript
// Test utilities for different node types
export class NodeTestUtils {
  static createTestProcessNode(): ProcessNode {
    return {
      id: 'test-process-node',
      nodeType: 'process',
      domainType: 'process',
      name: 'Test Stage',
      description: 'Test stage for unit testing',
      position: { x: 0, y: 0 },
      visualProperties: { color: '#3B82F6' },
      metadata: { tags: ['test'] },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      domainData: {
        stage: {
          id: 'test-stage',
          name: 'Test Stage',
          description: 'Test stage',
          position: { x: 0, y: 0 },
          actions: [],
          dataChange: [],
          boundaryCriteria: [],
          raci: { inform: [], consult: [], accountable: [], responsible: [] }
        }
      },
      behavior: {
        executionType: 'sequential',
        dependencies: [],
        timeout: 30,
        retryPolicy: { maxRetries: 3, backoff: 'exponential' }
      },
      businessLogic: {
        raciMatrix: { inform: [], consult: [], accountable: [], responsible: [] },
        sla: { responseTime: 24, availability: 99.9 },
        kpis: []
      }
    }
  }
  
  static createTestIntegrationNode(): IntegrationNode {
    return {
      id: 'test-integration-node',
      nodeType: 'integration',
      domainType: 'integration',
      name: 'Test Trigger',
      description: 'Test trigger for unit testing',
      position: { x: 0, y: 0 },
      visualProperties: { color: '#10B981' },
      metadata: { tags: ['test'] },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      domainData: {
        integrationType: 'api',
        connector: { type: 'rest', method: 'GET' },
        transformation: { type: 'json', mapping: {} }
      },
      behavior: {
        executionMode: 'synchronous',
        timeout: 30,
        retryPolicy: { maxRetries: 3, backoff: 'exponential' },
        errorHandling: { strategy: 'retry', fallback: 'skip' }
      },
      businessLogic: {
        apiEndpoint: 'https://api.example.com/test',
        authentication: { type: 'bearer', token: 'test-token' },
        dataMapping: { input: {}, output: {} },
        monitoring: { enabled: true, metrics: ['response-time', 'error-rate'] }
      }
    }
  }
}
```

## Migration Strategy

### Phase 1: Database Schema Migration

1. **Create New Tables**: Implement separate node tables
2. **Data Migration**: Migrate existing unified node data to domain-specific tables
3. **Link Migration**: Migrate existing relationships to new node_links table
4. **Validation**: Ensure data integrity and consistency

### Phase 2: Domain Layer Migration

1. **Update Types**: Implement new base node and domain-specific types
2. **Repository Updates**: Update repositories to use new schema
3. **Use Case Updates**: Update use cases to work with new structure
4. **Validation**: Ensure business logic remains intact

### Phase 3: Application Layer Migration

1. **Hook Updates**: Update custom hooks to work with new structure
2. **State Management**: Update state management for new node structure
3. **Cross-Feature Integration**: Implement new cross-feature linking
4. **Testing**: Comprehensive testing of all features

### Phase 4: Presentation Layer Migration

1. **Component Updates**: Update components to use new node structure
2. **Visual Integration**: Implement unified node visualization
3. **Cross-Feature Navigation**: Update navigation between features
4. **User Experience**: Ensure seamless user experience

## Performance and Security Considerations

### 1. Performance Considerations

- **Indexing**: Proper indexing on all tables for optimal performance
- **Query Optimization**: Optimize queries for domain-specific operations
- **Caching**: Implement caching for frequently accessed data
- **Connection Pooling**: Use connection pooling for database connections
- **Load Balancing**: Implement load balancing for high-traffic scenarios

### 2. Security Considerations

- **Row Level Security**: Implement RLS on all tables
- **Access Control**: Domain-specific access control
- **Audit Logging**: Comprehensive audit logging for all operations
- **Input Validation**: Validate all inputs at the domain layer
- **Encryption**: Encrypt sensitive data at rest and in transit

### 3. Monitoring and Maintenance

- **Performance Monitoring**: Monitor query performance and optimize
- **Data Integrity**: Regular checks for data consistency
- **Backup Strategy**: Comprehensive backup and recovery strategy
- **Health Checks**: Implement health checks for all services
- **Alerting**: Set up alerting for critical issues

## Benefits of This Architecture

### 1. Scalability
- **Separate Tables**: Each domain can scale independently
- **Optimized Queries**: Domain-specific queries are more efficient
- **Independent Development**: Domains can evolve independently

### 2. Maintainability
- **Clear Separation**: Each domain has its own domain and infrastructure
- **Reduced Complexity**: No single table managing all node types
- **Easier Debugging**: Issues are isolated to specific domains

### 3. Flexibility
- **Domain-Specific Logic**: Each domain can implement its own business logic
- **Custom Fields**: Domains can have their own specific fields
- **Independent Evolution**: Domains can add new capabilities without affecting others

### 4. Cross-Feature Connectivity
- **Unified Links**: Single table manages all cross-feature relationships
- **Visual Mapping**: Nodes can be visualized in a unified graph
- **Consistent Interface**: All domains use the same node linking interface

### 5. Future-Proofing
- **AI Integration**: Built-in support for AI agents at the node level
- **Vector Search**: Support for semantic search across all domains
- **Extensibility**: Easy to add new domains or node types 