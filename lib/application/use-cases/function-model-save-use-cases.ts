// Function Model Save Use Cases - Application Layer
// This file implements use cases for function model save operations with proper orchestration
// Following Clean Architecture principles: Application → Domain ← Infrastructure

import { FunctionModelNode } from '../../domain/entities/function-model-node-types'
import { FunctionModel, FunctionModelEdge, EdgeRepository } from '../../domain/entities/function-model-types'
import { FunctionModelSaveService, SaveOperation } from '../../domain/services/function-model-save-service'
import { FunctionModelRepository } from '../../infrastructure/repositories/function-model-repository'
import { FunctionModelVersionRepository } from '../../infrastructure/repositories/function-model-version-repository'
import { TransactionManagementService } from '../../infrastructure/services/transaction-management-service'
import { AuditService } from '../../infrastructure/services/audit-service'
import { 
  ApplicationException
} from '../exceptions/application-exceptions'

export interface SaveFunctionModelRequest {
  modelId: string
  nodes: FunctionModelNode[]
  edges: any[]
  metadata: {
    changeSummary: string
    author: string
    isPublished: boolean
  }
  options: {
    validateBeforeSave: boolean
    createBackup: boolean
    updateVersion: boolean
    createNewVersion: boolean
  }
}

export interface SaveFunctionModelResponse {
  success: boolean
  modelId: string
  version?: string
  savedNodes: number
  savedEdges: number
  warnings: string[]
  errors: string[]
  auditId?: string
  transactionId?: string
  duration: number
}

export interface LoadFunctionModelRequest {
  modelId: string
  version?: string
  options: {
    validateData: boolean
    restoreFromVersion: boolean
  }
}

export interface LoadFunctionModelResponse {
  success: boolean
  model: FunctionModel | null
  nodes: FunctionModelNode[]
  edges: any[]
  version?: string
  warnings: string[]
  errors: string[]
  auditId?: string
  duration: number
}

export class FunctionModelSaveUseCases {
  private saveService: FunctionModelSaveService
  private functionModelRepository: FunctionModelRepository
  private edgeRepository: EdgeRepository
  private versionRepository: FunctionModelVersionRepository
  private transactionService: TransactionManagementService
  private auditService: AuditService

  constructor(
    functionModelRepository: FunctionModelRepository,
    edgeRepository: EdgeRepository,
    versionRepository: FunctionModelVersionRepository,
    transactionService: TransactionManagementService,
    auditService: AuditService
  ) {
    this.saveService = new FunctionModelSaveService()
    this.functionModelRepository = functionModelRepository
    this.edgeRepository = edgeRepository
    this.versionRepository = versionRepository
    this.transactionService = transactionService
    this.auditService = auditService
  }

  /**
   * Saves a function model with comprehensive orchestration
   */
  async saveFunctionModel(request: SaveFunctionModelRequest): Promise<SaveFunctionModelResponse> {
    const startTime = Date.now()
    let auditId: string | undefined
    let transactionId: string | undefined

    try {
      // Step 1: Create save operation
      const saveOperation: SaveOperation = {
        type: request.options.createNewVersion ? 'version' : 'update',
        modelId: request.modelId,
        nodes: request.nodes,
        edges: request.edges,
        metadata: {
          changeSummary: request.metadata.changeSummary,
          author: request.metadata.author,
          timestamp: new Date(),
          isPublished: request.metadata.isPublished
        },
        options: {
          validateBeforeSave: request.options.validateBeforeSave,
          createBackup: request.options.createBackup,
          updateVersion: request.options.updateVersion
        }
      }

      // Step 2: Validate save operation using Domain layer
      if (request.options.validateBeforeSave) {
        const validationResult = this.saveService.validateSaveOperation(saveOperation)
        if (!validationResult.isValid) {
          return {
            success: false,
            modelId: request.modelId,
            savedNodes: 0,
            savedEdges: 0,
            warnings: validationResult.warnings,
            errors: validationResult.errors,
            duration: Date.now() - startTime
          }
        }
      }

      // Step 3: Determine save strategy using Domain layer
      const strategyResult = this.saveService.determineSaveStrategy(saveOperation)

      // Step 4: Execute save operation with transaction management
      const transactionResult = await this.transactionService.executeInTransaction(
        async (transaction) => {
          // Get current model
          const currentModel = await this.functionModelRepository.getFunctionModelById(request.modelId)
          if (!currentModel) {
            throw new ApplicationException(`Function model not found: ${request.modelId}`, 'MODEL_NOT_FOUND', 404, { modelId: request.modelId })
          }

          // Update model metadata
          const updatedModel = await this.functionModelRepository.updateFunctionModel(
            request.modelId,
            {
              name: currentModel.name,
              description: currentModel.description,
              lastSavedAt: new Date()
            }
          )

          // Save nodes
          const savedNodes = await this.saveNodes(request.modelId, request.nodes, transaction)

          // Save edges
          const savedEdges = await this.saveEdges(request.modelId, request.edges, transaction)

          // Create version if requested
          let version: string | undefined
          if (request.options.createNewVersion || strategyResult.strategy === 'version') {
            version = await this.createVersion(request.modelId, request.nodes, request.edges, saveOperation)
          }

          return {
            model: updatedModel,
            savedNodes,
            savedEdges,
            version
          }
        }
      )

      transactionId = transactionResult.transactionId

      // Step 5: Log audit entry
      auditId = await this.auditService.logFunctionModelSave(
        request.modelId,
        saveOperation.type,
        {
          success: transactionResult.success,
          nodesCount: request.nodes.length,
          edgesCount: request.edges.length,
          strategy: strategyResult.strategy,
          duration: transactionResult.duration,
          error: transactionResult.error
        },
        request.metadata.author
      )

      const duration = Date.now() - startTime

      return {
        success: transactionResult.success,
        modelId: request.modelId,
        version: transactionResult.data?.version,
        savedNodes: transactionResult.data?.savedNodes || 0,
        savedEdges: transactionResult.data?.savedEdges || 0,
        warnings: [],
        errors: transactionResult.error ? [transactionResult.error] : [],
        auditId,
        transactionId,
        duration
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Log audit entry for failed operation
      try {
        auditId = await this.auditService.logFunctionModelSave(
          request.modelId,
          'save-failed',
          {
            success: false,
            nodesCount: request.nodes.length,
            edgesCount: request.edges.length,
            duration,
            error: errorMessage
          },
          request.metadata.author
        )
      } catch (auditError) {
        console.error('Failed to log audit entry:', auditError)
      }

      return {
        success: false,
        modelId: request.modelId,
        savedNodes: 0,
        savedEdges: 0,
        warnings: [],
        errors: [errorMessage],
        auditId,
        transactionId,
        duration
      }
    }
  }

  /**
   * Loads a function model with comprehensive orchestration
   */
  async loadFunctionModel(request: LoadFunctionModelRequest): Promise<LoadFunctionModelResponse> {
    const startTime = Date.now()
    let auditId: string | undefined

    try {
      // Step 1: Load model metadata
      const model = await this.functionModelRepository.getFunctionModelById(request.modelId)
      if (!model) {
        return {
          success: false,
          model: null,
          nodes: [],
          edges: [],
          warnings: [],
          errors: [`Function model not found: ${request.modelId}`],
          duration: Date.now() - startTime
        }
      }

      // Step 2: Load nodes and edges
      const [nodes, edges] = await Promise.all([
        this.functionModelRepository.getFunctionModelNodes(request.modelId),
        this.loadEdges(request.modelId)
      ])

      // Step 2.5: Validate edges before returning
      const validatedEdges = this.validateEdges(edges)
      if (validatedEdges.length !== edges.length) {
        console.warn(`Edge validation removed ${edges.length - validatedEdges.length} invalid edges`)
      }

      // Step 3: Load specific version if requested
      let version = request.version
      if (request.options.restoreFromVersion && version) {
        const versionResult = await this.loadVersion(request.modelId, version)
        if (versionResult.success) {
          return {
            success: true,
            model,
            nodes: versionResult.nodes,
            edges: versionResult.edges,
            version,
            warnings: versionResult.warnings,
            errors: versionResult.errors,
            duration: Date.now() - startTime
          }
        } else {
          return {
            success: false,
            model,
            nodes: [],
            edges: [],
            version,
            warnings: versionResult.warnings,
            errors: versionResult.errors,
            duration: Date.now() - startTime
          }
        }
      }

      // Step 4: Validate loaded data if requested
      let warnings: string[] = []
      if (request.options.validateData) {
        const validationResult = this.saveService.validateSaveOperation({
          type: 'update',
          modelId: request.modelId,
          nodes,
          edges,
          metadata: {
            changeSummary: 'Data validation',
            author: 'system',
            timestamp: new Date(),
            isPublished: false
          },
          options: {
            validateBeforeSave: false,
            createBackup: false,
            updateVersion: false
          }
        })
        warnings = validationResult.warnings
      }

      // Step 5: Log audit entry
      auditId = await this.auditService.logFunctionModelSave(
        request.modelId,
        'load',
        {
          success: true,
          nodesCount: nodes.length,
          edgesCount: edges.length,
          version,
          duration: Date.now() - startTime
        }
      )

      return {
        success: true,
        model,
        nodes,
        edges: validatedEdges, // Use validated edges instead of original edges
        version,
        warnings,
        errors: [],
        auditId,
        duration: Date.now() - startTime
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Log audit entry for failed operation
      try {
        auditId = await this.auditService.logFunctionModelSave(
          request.modelId,
          'load-failed',
          {
            success: false,
            duration,
            error: errorMessage
          }
        )
      } catch (auditError) {
        console.error('Failed to log audit entry:', auditError)
      }

      return {
        success: false,
        model: null,
        nodes: [],
        edges: [],
        warnings: [],
        errors: [errorMessage],
        auditId,
        duration
      }
    }
  }

  /**
   * Creates a new version of a function model
   */
  async createFunctionModelVersion(
    modelId: string,
    nodes: FunctionModelNode[],
    edges: any[],
    changeSummary: string,
    author: string
  ): Promise<{ success: boolean; version: string; error?: string }> {
    try {
      const saveOperation: SaveOperation = {
        type: 'version',
        modelId,
        nodes,
        edges,
        metadata: {
          changeSummary,
          author,
          timestamp: new Date(),
          isPublished: false
        },
        options: {
          validateBeforeSave: true,
          createBackup: false,
          updateVersion: true
        }
      }

      // Validate operation
      const validationResult = this.saveService.validateSaveOperation(saveOperation)
      if (!validationResult.isValid) {
        return {
          success: false,
          version: '',
          error: validationResult.errors.join(', ')
        }
      }

      // Create version
      const version = await this.createVersion(modelId, nodes, edges, saveOperation)

      // Log audit entry
      await this.auditService.logFunctionModelVersion(
        modelId,
        version,
        'create',
        {
          success: true,
          nodesCount: nodes.length,
          edgesCount: edges.length,
          changeSummary
        },
        author
      )

      return {
        success: true,
        version
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Log audit entry for failed operation
      try {
        await this.auditService.logFunctionModelVersion(
          modelId,
          'unknown',
          'create',
          {
            success: false,
            error: errorMessage
          },
          author
        )
      } catch (auditError) {
        console.error('Failed to log audit entry:', auditError)
      }

      return {
        success: false,
        version: '',
        error: errorMessage
      }
    }
  }

  /**
   * Updates function model metadata (name, description, etc.)
   */
  async updateFunctionModelMetadata(
    modelId: string,
    updates: { name?: string; description?: string },
    author: string
  ): Promise<{ success: boolean; model?: FunctionModel; error?: string }> {
    try {
      // Get current model
      const currentModel = await this.functionModelRepository.getFunctionModelById(modelId)
      if (!currentModel) {
        return { success: false, error: 'Model not found' }
      }

      // Update model metadata
      const updatedModel = await this.functionModelRepository.updateFunctionModel(modelId, updates)
      
      // Log the update
      await this.auditService.logFunctionModelSave(
        modelId,
        'update_metadata',
        { updates, author },
        author
      )

      return { success: true, model: updatedModel }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update model metadata'
      
      // Log the error
      await this.auditService.logFunctionModelSave(
        modelId,
        'update_metadata',
        { updates, author, error: errorMessage },
        author
      )
      
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Gets the version history for a function model
   */
  async getFunctionModelVersions(modelId: string): Promise<{
    success: boolean
    versions: Array<{
      version: string
      createdAt: Date
      createdBy: string
      changeSummary: string
      modelId: string
    }>
    error?: string
  }> {
    try {
      const versions = await this.versionRepository.getVersions(modelId)
      
      return {
        success: true,
        versions: versions.map(version => ({
          version: version.version,
          createdAt: version.createdAt,
          createdBy: version.createdBy || 'Unknown',
          changeSummary: version.changeSummary,
          modelId: version.modelId
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get versions'
      
      // Log the error
      await this.auditService.logSystemOperation(
        'get_function_model_versions',
        'function-model',
        modelId,
        { error: errorMessage }
      )
      
      return {
        success: false,
        versions: [],
        error: errorMessage
      }
    }
  }

  /**
   * Restores a function model from a specific version
   */
  async restoreFunctionModelFromVersion(
    modelId: string,
    version: string,
    author: string
  ): Promise<{ success: boolean; restoredNodes: number; restoredEdges: number; error?: string }> {
    try {
      const result = await this.loadVersion(modelId, version)
      
      if (!result.success) {
        return {
          success: false,
          restoredNodes: 0,
          restoredEdges: 0,
          error: result.errors.join(', ')
        }
      }

      // Save the restored data
      const saveResult = await this.saveFunctionModel({
        modelId,
        nodes: result.nodes,
        edges: result.edges,
        metadata: {
          changeSummary: `Restored from version ${version}`,
          author,
          isPublished: false
        },
        options: {
          validateBeforeSave: true,
          createBackup: true,
          updateVersion: true,
          createNewVersion: true
        }
      })

      // Log audit entry
      await this.auditService.logFunctionModelVersion(
        modelId,
        version,
        'restore',
        {
          success: saveResult.success,
          restoredNodes: result.nodes.length,
          restoredEdges: result.edges.length
        },
        author
      )

      return {
        success: saveResult.success,
        restoredNodes: result.nodes.length,
        restoredEdges: result.edges.length,
        error: saveResult.errors.join(', ')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Log audit entry for failed operation
      try {
        await this.auditService.logFunctionModelVersion(
          modelId,
          version,
          'restore',
          {
            success: false,
            error: errorMessage
          },
          author
        )
      } catch (auditError) {
        console.error('Failed to log audit entry:', auditError)
      }

      return {
        success: false,
        restoredNodes: 0,
        restoredEdges: 0,
        error: errorMessage
      }
    }
  }

  /**
   * Saves nodes within a transaction
   */
  private async saveNodes(modelId: string, nodes: FunctionModelNode[], transaction: any): Promise<number> {
    let savedCount = 0

    for (const node of nodes) {
      try {
        // Check if node exists
        const existingNode = await this.functionModelRepository.getFunctionModelNodes(modelId)
          .then(nodes => nodes.find(n => n.nodeId === node.nodeId))

        if (existingNode) {
          // Update existing node
          await this.functionModelRepository.updateNodeInFunctionModel(modelId, node.nodeId, node)
        } else {
          // Create new node
          await this.functionModelRepository.addNodeToFunctionModel(modelId, node)
        }

        savedCount++

        // Log node operation
        await this.auditService.logNodeOperation(
          modelId,
          node.nodeId,
          existingNode ? 'update' : 'create',
          {
            success: true,
            nodeType: node.nodeType,
            nodeName: node.name
          }
        )

      } catch (error) {
        console.error(`Failed to save node ${node.nodeId}:`, error)
        
        // Log failed node operation
        await this.auditService.logNodeOperation(
          modelId,
          node.nodeId,
          'update',
          {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        )
      }
    }

    return savedCount
  }

  /**
   * Saves edges within a transaction using Domain abstraction
   */
  private async saveEdges(modelId: string, edges: FunctionModelEdge[], transaction: any): Promise<number> {
    try {
      // DIP: Application layer depends on Domain abstraction
      await this.edgeRepository.saveEdgesForModel(modelId, edges)
      return edges.length
    } catch (error) {
      console.error('Failed to save edges:', error)
      throw new ApplicationException(
        `Failed to save edges: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EDGE_SAVE_ERROR'
      )
    }
  }

  /**
   * Loads edges for a model using Domain abstraction
   */
  private async loadEdges(modelId: string): Promise<FunctionModelEdge[]> {
    try {
      // DIP: Application layer depends on Domain abstraction, not Infrastructure details
      return await this.edgeRepository.getEdgesForModel(modelId)
    } catch (error) {
      console.error('Failed to load edges:', error)
      // Return empty array as fallback, but log the error
      return []
    }
  }

  /**
   * Validates edges to ensure they are in a valid format.
   * Filters out edges with missing required fields or invalid data.
   */
  private validateEdges(edges: FunctionModelEdge[]): FunctionModelEdge[] {
    const validEdges: FunctionModelEdge[] = []
    const invalidEdges: FunctionModelEdge[] = []

    for (const edge of edges) {
      try {
        // Check for required fields
        if (!edge.id || typeof edge.id !== 'string') {
          console.warn('Invalid edge: missing or invalid id', edge)
          invalidEdges.push(edge)
          continue
        }

        if (!edge.sourceNodeId || typeof edge.sourceNodeId !== 'string') {
          console.warn('Invalid edge: missing or invalid sourceNodeId', edge)
          invalidEdges.push(edge)
          continue
        }

        if (!edge.targetNodeId || typeof edge.targetNodeId !== 'string') {
          console.warn('Invalid edge: missing or invalid targetNodeId', edge)
          invalidEdges.push(edge)
          continue
        }

        // Check for self-loops
        if (edge.sourceNodeId === edge.targetNodeId) {
          console.warn('Invalid edge: self-loop detected', edge)
          invalidEdges.push(edge)
          continue
        }

        // Ensure optional fields have proper types
        if (edge.sourceHandle && typeof edge.sourceHandle !== 'string') {
          console.warn('Invalid edge: sourceHandle must be string', edge)
          invalidEdges.push(edge)
          continue
        }

        if (edge.targetHandle && typeof edge.targetHandle !== 'string') {
          console.warn('Invalid edge: targetHandle must be string', edge)
          invalidEdges.push(edge)
          continue
        }

        if (edge.type && typeof edge.type !== 'string') {
          console.warn('Invalid edge: type must be string', edge)
          invalidEdges.push(edge)
          continue
        }

        // Ensure metadata is an object
        if (edge.metadata && typeof edge.metadata !== 'object') {
          console.warn('Invalid edge: metadata must be object', edge)
          invalidEdges.push(edge)
          continue
        }

        validEdges.push(edge)
      } catch (error) {
        console.error('Error validating edge:', edge, error)
        invalidEdges.push(edge)
      }
    }

    if (invalidEdges.length > 0) {
      console.warn(`Edge validation found ${invalidEdges.length} invalid edges:`, invalidEdges)
    }

    return validEdges
  }

  /**
   * Creates a new version
   */
  private async createVersion(
    modelId: string,
    nodes: FunctionModelNode[],
    edges: any[],
    saveOperation: SaveOperation
  ): Promise<string> {
    // Get existing versions to calculate next version number
    const existingVersions = await this.versionRepository.getVersions(modelId)
    const versionNumbers = existingVersions.map(v => v.version)

    // Calculate next version using Domain layer
    const currentModel = await this.functionModelRepository.getFunctionModelById(modelId)
    const currentVersion = currentModel?.version || '1.0.0'
    
    const versionCalculation = this.saveService.calculateNextVersion(
      currentVersion,
      saveOperation,
      versionNumbers
    )

    // Create version using Infrastructure layer
    await this.versionRepository.create({
      modelId,
      version: versionCalculation.newVersion,
      nodes: nodes.map(node => ({
        nodeId: node.nodeId,
        data: node,
        timestamp: new Date()
      })),
      edges: edges.map(edge => ({
        edgeId: edge.id,
        data: edge,
        timestamp: new Date()
      })),
      changeSummary: saveOperation.metadata.changeSummary,
      createdAt: new Date(),
      createdBy: saveOperation.metadata.author
    })

    return versionCalculation.newVersion
  }

  /**
   * Loads a specific version
   */
  private async loadVersion(modelId: string, version: string): Promise<{
    success: boolean
    nodes: FunctionModelNode[]
    edges: any[]
    warnings: string[]
    errors: string[]
  }> {
    try {
      const versionData = await this.versionRepository.getByVersion(modelId, version)
      
      if (!versionData) {
        return {
          success: false,
          nodes: [],
          edges: [],
          warnings: [],
          errors: [`Version ${version} not found`]
        }
      }

      return {
        success: true,
        nodes: versionData.nodes.map(n => n.data),
        edges: versionData.edges.map(e => e.data),
        warnings: [],
        errors: []
      }

    } catch (error) {
      return {
        success: false,
        nodes: [],
        edges: [],
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }
}
