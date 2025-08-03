import { UnifiedNodeOperations } from '@/lib/infrastructure/services/unified-node-operations'
import { FunctionModelNode, NodeLink, ExecutionResult, ValidationResult } from '@/lib/domain/entities/function-model-node-types'

export interface CreateNodeRequest {
  modelId: string
  nodeType: 'stageNode' | 'actionTableNode' | 'ioNode' | 'functionModelContainer'
  name: string
  description?: string
  positionX: number
  positionY: number
  functionModelData?: {
    stage?: any
    action?: any
    io?: any
    container?: any
  }
  processBehavior?: {
    executionType?: 'sequential' | 'parallel' | 'conditional'
    dependencies?: string[]
    timeout?: number
    retryPolicy?: any
  }
  businessLogic?: {
    raciMatrix?: any
    sla?: any
    kpis?: any[]
  }
}

export interface UpdateNodeRequest {
  nodeId: string
  updates: Partial<FunctionModelNode>
}

export interface CreateLinkRequest {
  sourceFeature: 'function-model' | 'knowledge-base' | 'event-storm' | 'spindle'
  sourceEntityId: string
  sourceNodeId?: string
  targetFeature: 'function-model' | 'knowledge-base' | 'event-storm' | 'spindle'
  targetEntityId: string
  targetNodeId?: string
  linkType: NodeLink['linkType']
  context?: Record<string, any>
}

export interface NodeExecutionRequest {
  nodeId: string
  context?: any
  options?: {
    validateBeforeExecute?: boolean
    timeout?: number
    retryOnFailure?: boolean
  }
}

export interface NodeSearchRequest {
  query: string
  filters?: {
    nodeType?: string
    modelId?: string
    positionRange?: { x: number; y: number; width: number; height: number }
  }
  options?: {
    limit?: number
    includeMetadata?: boolean
  }
}

export class FunctionModelNodeUseCases {
  private nodeOperations: UnifiedNodeOperations

  constructor() {
    this.nodeOperations = new UnifiedNodeOperations()
  }

  // Create a new node with validation and business rules
  async createNode(request: CreateNodeRequest): Promise<FunctionModelNode> {
    // Validate the request
    this.validateCreateNodeRequest(request)

    // Apply business rules
    const enrichedData = this.applyBusinessRules(request)

    // Create the node
    const newNode = await this.nodeOperations.createNode({
      modelId: request.modelId,
      featureType: 'function-model',
      nodeType: request.nodeType,
      name: request.name,
      description: request.description,
      positionX: request.positionX,
      positionY: request.positionY,
      functionModelData: request.functionModelData || {},
      processBehavior: request.processBehavior || {
        executionType: 'sequential',
        dependencies: [],
        timeout: 30
      },
      businessLogic: request.businessLogic || {},
      metadata: {
        createdBy: 'system', // Would come from auth context
        version: '1.0.0'
      }
    })

    // Post-creation actions
    await this.performPostCreationActions(newNode)

    return newNode
  }

  // Update a node with validation
  async updateNode(request: UpdateNodeRequest): Promise<FunctionModelNode> {
    // Validate the request
    this.validateUpdateNodeRequest(request)

    // Check if node exists
    const existingNode = await this.nodeOperations.getNode(request.nodeId, request.nodeId)
    if (!existingNode) {
      throw new Error(`Node not found: ${request.nodeId}`)
    }

    // Apply update business rules
    const validatedUpdates = this.applyUpdateBusinessRules(existingNode, request.updates)

    // Update the node
    const updatedNode = await this.nodeOperations.updateNode(request.nodeId, validatedUpdates)

    // Post-update actions
    await this.performPostUpdateActions(updatedNode)

    return updatedNode
  }

  // Delete a node with cleanup
  async deleteNode(nodeId: string): Promise<void> {
    // Check if node exists
    const existingNode = await this.nodeOperations.getNode(nodeId, nodeId)
    if (!existingNode) {
      throw new Error(`Node not found: ${nodeId}`)
    }

    // Perform pre-deletion checks
    await this.performPreDeletionChecks(existingNode)

    // Delete the node
    await this.nodeOperations.deleteNode(nodeId)

    // Post-deletion cleanup
    await this.performPostDeletionCleanup(nodeId)
  }

  // Execute a node with full context
  async executeNode(request: NodeExecutionRequest): Promise<ExecutionResult> {
    const { nodeId, context, options = {} } = request

    // Validate the node exists
    const node = await this.nodeOperations.getNode(nodeId, nodeId)
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`)
    }

    // Validate before execution if requested
    if (options.validateBeforeExecute) {
      const validation = await this.nodeOperations.validateNode(nodeId)
      if (!validation.isValid) {
        throw new Error(`Node validation failed: ${validation.errors.join(', ')}`)
      }
    }

    // Prepare execution context
    const executionContext = this.prepareExecutionContext(node, context)

    // Execute the node
    const result = await this.nodeOperations.executeNode(nodeId, executionContext)

    // Post-execution actions
    await this.performPostExecutionActions(node, result)

    return result
  }

  // Create a cross-feature link with validation
  async createCrossFeatureLink(request: CreateLinkRequest): Promise<NodeLink> {
    // Validate the link request
    this.validateCreateLinkRequest(request)

    // Check if link already exists
    const existingLinks = await this.nodeOperations.getNodeLinks(request.sourceEntityId, request.sourceNodeId)
    const linkExists = existingLinks.some(link => 
      link.targetFeature === request.targetFeature &&
      link.targetEntityId === request.targetEntityId &&
      link.targetNodeId === request.targetNodeId
    )

    if (linkExists) {
      throw new Error('Link already exists between these nodes')
    }

    // Create the link
    const newLink = await this.nodeOperations.createNodeLink({
      sourceFeature: request.sourceFeature,
      sourceEntityId: request.sourceEntityId,
      sourceNodeId: request.sourceNodeId,
      targetFeature: request.targetFeature,
      targetEntityId: request.targetEntityId,
      targetNodeId: request.targetNodeId,
      linkType: request.linkType,
      linkStrength: 1.0,
      linkContext: request.context || {},
      visualProperties: {
        color: this.getLinkColor(request.linkType),
        style: 'solid',
        width: 2
      }
    })

    // Post-link creation actions
    await this.performPostLinkCreationActions(newLink)

    return newLink
  }

  // Search nodes with advanced filtering
  async searchNodes(request: NodeSearchRequest): Promise<FunctionModelNode[]> {
    const { query, filters, options = {} } = request

    // Validate search request
    this.validateSearchRequest(request)

    // Perform the search
    const results = await this.nodeOperations.searchNodes(query, filters)

    // Apply post-search processing
    const processedResults = this.processSearchResults(results, options)

    return processedResults
  }

  // Get node statistics and analytics
  async getNodeAnalytics(modelId: string): Promise<{
    totalNodes: number
    nodesByType: Record<string, number>
    executionStats: {
      totalExecutions: number
      successfulExecutions: number
      failedExecutions: number
      averageExecutionTime: number
    }
    linkStats: {
      totalLinks: number
      linksByType: Record<string, number>
      crossFeatureLinks: number
    }
  }> {
    const nodes = await this.nodeOperations.getNodesByModel(modelId)
    const links = await this.nodeOperations.getNodeLinks(modelId)

    // Calculate node statistics
    const nodesByType: Record<string, number> = {}
    nodes.forEach(node => {
      nodesByType[node.nodeType] = (nodesByType[node.nodeType] || 0) + 1
    })

    // Calculate link statistics
    const linksByType: Record<string, number> = {}
    const crossFeatureLinks = links.filter(link => link.targetFeature !== 'function-model').length
    links.forEach(link => {
      linksByType[link.linkType] = (linksByType[link.linkType] || 0) + 1
    })

    return {
      totalNodes: nodes.length,
      nodesByType,
      executionStats: {
        totalExecutions: 0, // Would come from execution logs
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0
      },
      linkStats: {
        totalLinks: links.length,
        linksByType,
        crossFeatureLinks
      }
    }
  }

  // Private helper methods
  private validateCreateNodeRequest(request: CreateNodeRequest): void {
    if (!request.modelId) throw new Error('Model ID is required')
    if (!request.name) throw new Error('Node name is required')
    if (request.positionX < 0 || request.positionY < 0) {
      throw new Error('Position coordinates must be non-negative')
    }
  }

  private validateUpdateNodeRequest(request: UpdateNodeRequest): void {
    if (!request.nodeId) throw new Error('Node ID is required')
    if (Object.keys(request.updates).length === 0) {
      throw new Error('At least one update field is required')
    }
  }

  private validateCreateLinkRequest(request: CreateLinkRequest): void {
    if (!request.sourceEntityId || !request.targetEntityId) {
      throw new Error('Source and target entity IDs are required')
    }
    if (!request.linkType) throw new Error('Link type is required')
  }

  private validateSearchRequest(request: NodeSearchRequest): void {
    if (!request.query && !request.filters) {
      throw new Error('Either query or filters must be provided')
    }
  }

  private applyBusinessRules(request: CreateNodeRequest): CreateNodeRequest {
    // Apply default values and business rules
    const enrichedRequest = { ...request }

    // Set default execution type if not provided
    if (!enrichedRequest.processBehavior?.executionType) {
      enrichedRequest.processBehavior = {
        ...enrichedRequest.processBehavior,
        executionType: 'sequential'
      }
    }

    // Set default timeout if not provided
    if (!enrichedRequest.processBehavior?.timeout) {
      enrichedRequest.processBehavior = {
        ...enrichedRequest.processBehavior,
        timeout: 30
      }
    }

    return enrichedRequest
  }

  private applyUpdateBusinessRules(existingNode: FunctionModelNode, updates: Partial<FunctionModelNode>): Partial<FunctionModelNode> {
    const validatedUpdates = { ...updates }

    // Ensure critical fields are not removed
    if (validatedUpdates.name === '') {
      throw new Error('Node name cannot be empty')
    }

    // Validate position updates
    if (validatedUpdates.positionX !== undefined && validatedUpdates.positionX < 0) {
      throw new Error('Position X must be non-negative')
    }
    if (validatedUpdates.positionY !== undefined && validatedUpdates.positionY < 0) {
      throw new Error('Position Y must be non-negative')
    }

    return validatedUpdates
  }

  private async performPostCreationActions(node: FunctionModelNode): Promise<void> {
    // Log node creation
    console.log(`Node created: ${node.nodeId} (${node.name})`)

    // Could include:
    // - Send notifications
    // - Update analytics
    // - Trigger workflows
    // - Update search index
  }

  private async performPostUpdateActions(node: FunctionModelNode): Promise<void> {
    // Log node update
    console.log(`Node updated: ${node.nodeId} (${node.name})`)

    // Could include:
    // - Update dependent nodes
    // - Refresh cache
    // - Update search index
  }

  private async performPreDeletionChecks(node: FunctionModelNode): Promise<void> {
    // Check for dependent nodes
    const connectedNodes = await this.nodeOperations.getConnectedNodes(node.modelId, node.nodeId)
    if (connectedNodes.length > 0) {
      throw new Error(`Cannot delete node: ${connectedNodes.length} nodes depend on this node`)
    }
  }

  private async performPostDeletionCleanup(nodeId: string): Promise<void> {
    // Log node deletion
    console.log(`Node deleted: ${nodeId}`)

    // Could include:
    // - Clean up orphaned data
    // - Update analytics
    // - Remove from search index
  }

  private prepareExecutionContext(node: FunctionModelNode, context?: any): any {
    return {
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      modelId: node.modelId,
      timestamp: new Date().toISOString(),
      user: 'system', // Would come from auth context
      ...context
    }
  }

  private async performPostExecutionActions(node: FunctionModelNode, result: ExecutionResult): Promise<void> {
    // Log execution
    console.log(`Node executed: ${node.nodeId} (${node.name}) - Success: ${result.success}`)

    // Could include:
    // - Update execution history
    // - Send notifications
    // - Update analytics
    // - Trigger dependent nodes
  }

  private async performPostLinkCreationActions(link: NodeLink): Promise<void> {
    // Log link creation
    console.log(`Link created: ${link.sourceFeature} -> ${link.targetFeature}`)

    // Could include:
    // - Update link analytics
    // - Send notifications
    // - Update search index
  }

  private processSearchResults(results: FunctionModelNode[], options: any): FunctionModelNode[] {
    let processedResults = results

    // Apply limit if specified
    if (options.limit) {
      processedResults = processedResults.slice(0, options.limit)
    }

    // Sort by relevance (could be enhanced with AI scoring)
    processedResults.sort((a, b) => {
      // Simple relevance scoring based on name match
      const aScore = a.name.toLowerCase().includes('test') ? 1 : 0
      const bScore = b.name.toLowerCase().includes('test') ? 1 : 0
      return bScore - aScore
    })

    return processedResults
  }

  private getLinkColor(linkType: string): string {
    const colors: Record<string, string> = {
      documents: '#10b981',
      implements: '#3b82f6',
      references: '#f59e0b',
      supports: '#8b5cf6',
      nested: '#ef4444'
    }
    return colors[linkType] || '#6b7280'
  }
} 