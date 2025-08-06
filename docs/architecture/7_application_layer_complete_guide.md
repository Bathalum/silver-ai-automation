# Application Layer Complete Guide

## Overview
This document contains **EVERYTHING** you need to build the Application Layer consistently. This is a **general, reusable guide** that can be applied to any project, not specific to any particular business domain. The guide follows a **node-based architecture** where all domain concepts are represented as nodes with cross-feature connectivity.

## Core Principles
- **Orchestrate domain objects** to perform application-specific operations
- **Define use cases** that represent what the application does
- **Handle application-specific business logic** that doesn't belong in domain
- **Coordinate between repositories** and domain services
- **Manage application state** and workflows
- **Handle node heterogeneity** across different node types
- **Support cross-feature connectivity** for unified operations

## 1. Unified Node Operations (WHAT + HOW)

### WHAT: Unified Node Operations Interface
```typescript
// lib/application/use-cases/unified-node-operations.ts

export interface UnifiedNodeOperations {
  // Universal node operations (work across all node types)
  createNode<T extends BaseNode>(node: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>
  getNode<T extends BaseNode>(nodeType: string, nodeId: string): Promise<T | null>
  updateNode<T extends BaseNode>(nodeType: string, nodeId: string, updates: Partial<T>): Promise<T>
  deleteNode(nodeType: string, nodeId: string): Promise<void>
  
  // Cross-feature operations
  createNodeLink(link: Omit<CrossFeatureLink, 'linkId' | 'createdAt' | 'updatedAt'>): Promise<CrossFeatureLink>
  getNodeLinks(nodeType: string, nodeId?: string): Promise<CrossFeatureLink[]>
  getConnectedNodes(nodeType: string, nodeId?: string): Promise<BaseNode[]>
  
  // Node-specific operations (delegated to appropriate handlers)
  executeNode(nodeType: string, nodeId: string, context?: any): Promise<any>
  validateNode(nodeType: string, nodeId: string): Promise<ValidationResult>
  getNodeBehavior(nodeType: string, nodeId: string): Promise<NodeBehavior>
}
```

### HOW: Implementation with Node Heterogeneity
```typescript
// lib/application/use-cases/unified-node-operations-impl.ts

export class UnifiedNodeOperationsImpl implements UnifiedNodeOperations {
  constructor(
    private readonly nodeRepository: NodeRepository,
    private readonly nodeLinkRepository: NodeLinkRepository
  ) {}

  async executeNode(nodeType: string, nodeId: string, context?: any): Promise<any> {
    const node = await this.getNode(nodeType, nodeId)
    if (!node) throw new ApplicationError('Node not found')
    
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
        throw new ApplicationError(`Unsupported domain type: ${domainType}`)
    }
  }
  
  async validateNode(nodeType: string, nodeId: string): Promise<ValidationResult> {
    const node = await this.getNode(nodeType, nodeId)
    if (!node) throw new ApplicationError('Node not found')
    
    const behavior = NodeBehaviorFactory.createBehavior(node)
    return await behavior.validate()
  }
}
```

### HOW: Always follow these patterns
- ✅ **Use dependency injection** for repositories
- ✅ **Delegate to domain services** for business logic
- ✅ **Handle node heterogeneity** with factory patterns
- ✅ **Throw application errors** for application-level issues
- ✅ **Use async/await** for all operations
- ✅ **Support any node type** through domain type detection

## 2. Domain-Specific Node Operations (WHAT + HOW)

### WHAT: Process Node Operations
```typescript
// lib/application/use-cases/process-node-operations.ts

export interface ProcessNodeOperations {
  // Process Node CRUD
  createProcessNode(node: Omit<ProcessNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProcessNode>
  getProcessNode(nodeId: string): Promise<ProcessNode | null>
  updateProcessNode(nodeId: string, updates: Partial<ProcessNode>): Promise<ProcessNode>
  deleteProcessNode(nodeId: string): Promise<void>
  
  // Process-specific operations
  executeProcess(nodeId: string, context?: any): Promise<ExecutionResult>
  rollbackProcess(nodeId: string): Promise<void>
  getProcessState(nodeId: string): Promise<ProcessState>
  getExecutionPath(nodeId: string): Promise<string[]>
  
  // Cross-feature linking
  linkProcessToContent(nodeId: string, contentNodeId: string, linkType: LinkType): Promise<CrossFeatureLink>
  linkProcessToIntegration(nodeId: string, integrationNodeId: string, linkType: LinkType): Promise<CrossFeatureLink>
  linkProcessToDomain(nodeId: string, domainNodeId: string, linkType: LinkType): Promise<CrossFeatureLink>
}
```

### WHAT: Content Node Operations
```typescript
// lib/application/use-cases/content-node-operations.ts

export interface ContentNodeOperations {
  // Content Node CRUD
  createContentNode(node: Omit<ContentNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentNode>
  getContentNode(nodeId: string): Promise<ContentNode | null>
  updateContentNode(nodeId: string, updates: Partial<ContentNode>): Promise<ContentNode>
  deleteContentNode(nodeId: string): Promise<void>
  
  // Content-specific operations
  renderContent(nodeId: string): Promise<string>
  searchContent(nodeId: string, query: string): Promise<SearchResult[]>
  versionContent(nodeId: string): Promise<VersionInfo>
  getContentState(nodeId: string): Promise<ContentState>
  
  // Cross-feature linking
  linkContentToProcess(nodeId: string, processNodeId: string, linkType: LinkType): Promise<CrossFeatureLink>
  linkContentToIntegration(nodeId: string, integrationNodeId: string, linkType: LinkType): Promise<CrossFeatureLink>
  linkContentToDomain(nodeId: string, domainNodeId: string, linkType: LinkType): Promise<CrossFeatureLink>
}
```

### WHAT: Integration Node Operations
```typescript
// lib/application/use-cases/integration-node-operations.ts

export interface IntegrationNodeOperations {
  // Integration Node CRUD
  createIntegrationNode(node: Omit<IntegrationNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntegrationNode>
  getIntegrationNode(nodeId: string): Promise<IntegrationNode | null>
  updateIntegrationNode(nodeId: string, updates: Partial<IntegrationNode>): Promise<IntegrationNode>
  deleteIntegrationNode(nodeId: string): Promise<void>
  
  // Integration-specific operations
  connectIntegration(nodeId: string): Promise<ConnectionResult>
  transformData(nodeId: string, data: any): Promise<any>
  handleError(nodeId: string, error: Error): Promise<ErrorHandlingResult>
  getIntegrationState(nodeId: string): Promise<IntegrationState>
  
  // Cross-feature linking
  linkIntegrationToProcess(nodeId: string, processNodeId: string, linkType: LinkType): Promise<CrossFeatureLink>
  linkIntegrationToContent(nodeId: string, contentNodeId: string, linkType: LinkType): Promise<CrossFeatureLink>
  linkIntegrationToDomain(nodeId: string, domainNodeId: string, linkType: LinkType): Promise<CrossFeatureLink>
}
```

### WHAT: Domain Node Operations
```typescript
// lib/application/use-cases/domain-node-operations.ts

export interface DomainNodeOperations {
  // Domain Node CRUD
  createDomainNode(node: Omit<DomainNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<DomainNode>
  getDomainNode(nodeId: string): Promise<DomainNode | null>
  updateDomainNode(nodeId: string, updates: Partial<DomainNode>): Promise<DomainNode>
  deleteDomainNode(nodeId: string): Promise<void>
  
  // Domain-specific operations
  handleCommand(nodeId: string, command: any): Promise<Event[]>
  applyEvent(nodeId: string, event: any): Promise<void>
  getState(nodeId: string): Promise<any>
  getDomainState(nodeId: string): Promise<DomainState>
  
  // Cross-feature linking
  linkDomainToProcess(nodeId: string, processNodeId: string, linkType: LinkType): Promise<CrossFeatureLink>
  linkDomainToContent(nodeId: string, contentNodeId: string, linkType: LinkType): Promise<CrossFeatureLink>
  linkDomainToIntegration(nodeId: string, integrationNodeId: string, linkType: LinkType): Promise<CrossFeatureLink>
}
```

### HOW: Always follow these patterns for domain operations
- ✅ **Use dependency injection** for repositories
- ✅ **Include CRUD operations** for all node types
- ✅ **Include domain-specific operations** for each node type
- ✅ **Include cross-feature linking** methods
- ✅ **Use proper error handling** with application errors
- ✅ **Support any domain type** through generic interfaces

## 3. AI Integration Operations (WHAT + HOW)

### WHAT: AI Integration Operations
```typescript
// lib/application/use-cases/ai-integration-operations.ts

export interface AIIntegrationOperations {
  // AI Agent Management
  createAIAgent(nodeType: string, nodeId: string, config: AIAgentConfig): Promise<AIAgentConfig>
  getAIAgent(nodeType: string, nodeId: string): Promise<AIAgentConfig | null>
  updateAIAgent(nodeType: string, nodeId: string, config: Partial<AIAgentConfig>): Promise<AIAgentConfig>
  deleteAIAgent(nodeType: string, nodeId: string): Promise<void>
  
  // AI Agent Execution
  executeAIAgent(nodeType: string, nodeId: string, input: any): Promise<any>
  validateAIAgent(nodeType: string, nodeId: string): Promise<ValidationResult>
  
  // Vector Search Operations
  createVectorEmbedding(nodeType: string, nodeId: string, content: string): Promise<VectorEmbedding>
  searchSimilarNodes(nodeType: string, query: string, limit: number): Promise<BaseNode[]>
  
  // Cross-Node AI Operations
  executeCrossNodeAIAgent(sourceNodeType: string, sourceNodeId: string, targetNodeType: string, targetNodeId: string): Promise<any>
  validateCrossNodeLink(source: BaseNode, target: BaseNode, linkType: LinkType): Promise<ValidationResult>
}
```

### HOW: Always follow these patterns for AI operations
- ✅ **Use node-type-specific** AI agent management
- ✅ **Include execution methods** for AI agents
- ✅ **Include vector search** operations
- ✅ **Include cross-node** AI operations
- ✅ **Use proper validation** for AI configurations

## 4. Application Services (WHAT + HOW)

### WHAT: Node Execution Service
```typescript
// lib/application/services/node-execution-service.ts

export class NodeExecutionService {
  constructor(
    private readonly unifiedNodeOperations: UnifiedNodeOperations,
    private readonly aiIntegrationOperations: AIIntegrationOperations
  ) {}

  async executeNodeWithAI(nodeType: string, nodeId: string, context?: any): Promise<any> {
    // Get node behavior
    const behavior = await this.unifiedNodeOperations.getNodeBehavior(nodeType, nodeId)
    
    // Execute node
    const result = await this.unifiedNodeOperations.executeNode(nodeType, nodeId, context)
    
    // Execute AI agent if configured
    const aiAgent = await this.aiIntegrationOperations.getAIAgent(nodeType, nodeId)
    if (aiAgent && aiAgent.enabled) {
      const aiResult = await this.aiIntegrationOperations.executeAIAgent(nodeType, nodeId, result)
      return { nodeResult: result, aiResult }
    }
    
    return result
  }
  
  async executeCrossNodeWorkflow(sourceNodeType: string, sourceNodeId: string, targetNodeType: string, targetNodeId: string): Promise<any> {
    // Execute source node
    const sourceResult = await this.executeNodeWithAI(sourceNodeType, sourceNodeId)
    
    // Execute target node with source result
    const targetResult = await this.executeNodeWithAI(targetNodeType, targetNodeId, sourceResult)
    
    return { sourceResult, targetResult }
  }
}
```

### WHAT: Cross-Node Graph Service
```typescript
// lib/application/services/cross-node-graph-service.ts

export class CrossNodeGraphService {
  constructor(
    private readonly unifiedNodeOperations: UnifiedNodeOperations
  ) {}

  async getCrossNodeGraph(nodeTypes: string[]): Promise<{ nodes: BaseNode[], links: CrossFeatureLink[] }> {
    const nodes: BaseNode[] = []
    const links: CrossFeatureLink[] = []
    
    for (const nodeType of nodeTypes) {
      // Get all nodes for this node type
      const typeNodes = await this.getAllNodesForType(nodeType)
      nodes.push(...typeNodes)
      
      // Get all links for this node type
      const typeLinks = await this.getAllLinksForType(nodeType)
      links.push(...typeLinks)
    }
    
    return { nodes, links }
  }
  
  async getConnectedSubgraph(startNodeId: string, maxDepth: number = 3): Promise<{ nodes: BaseNode[], links: CrossFeatureLink[] }> {
    const visited = new Set<string>()
    const nodes: BaseNode[] = []
    const links: CrossFeatureLink[] = []
    
    await this.traverseGraph(startNodeId, visited, nodes, links, 0, maxDepth)
    
    return { nodes, links }
  }
  
  private async traverseGraph(
    nodeId: string, 
    visited: Set<string>, 
    nodes: BaseNode[], 
    links: CrossFeatureLink[], 
    depth: number, 
    maxDepth: number
  ): Promise<void> {
    if (visited.has(nodeId) || depth > maxDepth) return
    
    visited.add(nodeId)
    
    // Get node
    const node = await this.getNodeById(nodeId)
    if (node) {
      nodes.push(node)
      
      // Get connected links
      const connectedLinks = await this.getLinksForNode(nodeId)
      for (const link of connectedLinks) {
        if (!visited.has(link.targetNodeId)) {
          links.push(link)
          await this.traverseGraph(link.targetNodeId, visited, nodes, links, depth + 1, maxDepth)
        }
      }
    }
  }
}
```

### HOW: Always follow these patterns for application services
- ✅ **Use dependency injection** for use cases
- ✅ **Orchestrate multiple operations** for complex workflows
- ✅ **Handle cross-node** operations
- ✅ **Include proper error handling**
- ✅ **Use async/await** for all operations

## 5. Application Events (WHAT + HOW)

### WHAT: Node Lifecycle Events
```typescript
// lib/application/events/node-lifecycle-events.ts

export interface NodeCreatedApplicationEvent {
  nodeId: string
  nodeType: string
  name: string
  createdBy: string
  createdAt: Date
  metadata: Record<string, any>
}

export interface NodeUpdatedApplicationEvent {
  nodeId: string
  nodeType: string
  changes: Record<string, any>
  updatedBy: string
  updatedAt: Date
}

export interface NodeDeletedApplicationEvent {
  nodeId: string
  nodeType: string
  deletedBy: string
  deletedAt: Date
}

export interface NodeExecutedApplicationEvent {
  nodeId: string
  nodeType: string
  executionResult: any
  executedBy: string
  executedAt: Date
  duration: number
  success: boolean
}
```

### WHAT: Cross-Node Events
```typescript
// lib/application/events/cross-node-events.ts

export interface CrossNodeLinkCreatedEvent {
  linkId: string
  sourceNodeType: string
  sourceNodeId: string
  targetNodeType: string
  targetNodeId: string
  linkType: LinkType
  createdBy: string
  createdAt: Date
}

export interface CrossNodeWorkflowExecutedEvent {
  workflowId: string
  sourceNodeType: string
  sourceNodeId: string
  targetNodeType: string
  targetNodeId: string
  executionResult: any
  executedBy: string
  executedAt: Date
  duration: number
  success: boolean
}
```

### HOW: Always follow these patterns for application events
- ✅ **Include user context** (createdBy, updatedBy, etc.)
- ✅ **Include execution context** (success, duration, etc.)
- ✅ **Use descriptive names** ending with 'Event'
- ✅ **Include relevant IDs** for event handling
- ✅ **Include timestamps** for all events

## 6. Application Exceptions (WHAT + HOW)

### WHAT: Application Exceptions
```typescript
// lib/application/exceptions/application-exceptions.ts

export class ApplicationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'ApplicationError'
  }
}

export class NodeExecutionError extends ApplicationError {
  constructor(message: string, public readonly nodeId: string, public readonly nodeType: string) {
    super(message)
    this.name = 'NodeExecutionError'
  }
}

export class CrossNodeLinkError extends ApplicationError {
  constructor(message: string, public readonly sourceNodeType: string, public readonly targetNodeType: string) {
    super(message)
    this.name = 'CrossNodeLinkError'
  }
}

export class AIAgentExecutionError extends ApplicationError {
  constructor(message: string, public readonly agentId: string, public readonly nodeId: string) {
    super(message)
    this.name = 'AIAgentExecutionError'
  }
}

export class WorkflowExecutionError extends ApplicationError {
  constructor(message: string, public readonly workflowId: string) {
    super(message)
    this.name = 'WorkflowExecutionError'
  }
}
```

### HOW: Always follow these patterns for application exceptions
- ✅ **Extend ApplicationError** for all application exceptions
- ✅ **Include relevant context** in constructor
- ✅ **Set proper name** for error type
- ✅ **Use descriptive messages**
- ✅ **Include IDs** for debugging

## Implementation Checklist

When implementing the Application Layer, always:

1. ✅ **Use dependency injection** for repositories and services
2. ✅ **Orchestrate domain objects** for application operations
3. ✅ **Handle node heterogeneity** with factory patterns
4. ✅ **Include proper error handling** with application errors
5. ✅ **Use async/await** for all operations
6. ✅ **Include cross-node** operations
7. ✅ **Use application events** for state changes
8. ✅ **Include user context** in operations
9. ✅ **Validate inputs** before processing
10. ✅ **Handle complex workflows** with proper orchestration
11. ✅ **Support any node type** through generic interfaces
12. ✅ **Follow node-based architecture** consistently

This document contains **EVERYTHING** you need to build the Application Layer consistently. This is a **general, reusable guide** that can be applied to any project, not specific to any particular business domain. The guide follows a **node-based architecture** where all domain concepts are represented as nodes with cross-feature connectivity. 