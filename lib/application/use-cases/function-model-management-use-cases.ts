// Function Model Management Use Cases - Application Layer
// This file implements use cases for function model management operations
// Following Clean Architecture principles: Application → Domain ← Infrastructure

import { FunctionModel } from '../../domain/entities/function-model-types'
import { FunctionModelRepository } from '../../infrastructure/repositories/function-model-repository'
import { AuditService } from '../../infrastructure/services/audit-service'
import { ApplicationException } from '../exceptions/application-exceptions'

export interface FunctionModelCreateOptions {
  name: string
  description?: string
  version?: string
  status?: string
  aiAgentConfig?: Record<string, any>
  metadata?: Record<string, any>
  permissions?: Record<string, any>
}

export interface FunctionModelUpdateOptions {
  name?: string
  description?: string
  version?: string
  status?: string
  aiAgentConfig?: Record<string, any>
  metadata?: Record<string, any>
  permissions?: Record<string, any>
}

export class FunctionModelManagementUseCases {
  private functionModelRepository: FunctionModelRepository
  private auditService: AuditService

  constructor(
    functionModelRepository: FunctionModelRepository,
    auditService: AuditService
  ) {
    this.functionModelRepository = functionModelRepository
    this.auditService = auditService
  }

  async getAllFunctionModels(): Promise<FunctionModel[]> {
    try {
      return await this.functionModelRepository.getAllFunctionModels()
    } catch (error) {
      if (error instanceof ApplicationException) throw error
      throw new ApplicationException(
        `Failed to get all function models: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async getAllFunctionModelsWithNodeStats(): Promise<(FunctionModel & { nodeStats: { totalNodes: number; nodesByType: Record<string, number>; totalConnections: number } })[]> {
    try {
      return await this.functionModelRepository.getAllFunctionModelsWithNodeStats()
    } catch (error) {
      if (error instanceof ApplicationException) throw error
      throw new ApplicationException(
        `Failed to get all function models with node stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async getFunctionModelById(modelId: string): Promise<FunctionModel | null> {
    try {
      return await this.functionModelRepository.getFunctionModelById(modelId)
    } catch (error) {
      if (error instanceof ApplicationException) throw error
      throw new ApplicationException(
        `Failed to get function model by ID: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async createFunctionModel(options: FunctionModelCreateOptions): Promise<FunctionModel> {
    try {
      const model = await this.functionModelRepository.createFunctionModel({
        name: options.name,
        description: options.description || '',
        version: options.version || '1.0.0',
        status: (options.status as 'draft' | 'published' | 'archived') || 'draft',
        currentVersion: options.version || '1.0.0',
        versionCount: 1,
        lastSavedAt: new Date(),
        aiAgentConfig: options.aiAgentConfig || {},
        metadata: options.metadata || {},
        permissions: options.permissions || {}
      })

      try {
        await this.auditService.logFunctionModelSave(
          model.modelId,
          'create',
          { options }
        )
      } catch (auditError) {
        // Log audit failure but don't break the main operation
        console.warn('Audit logging failed:', auditError)
      }

      return model
    } catch (error) {
      if (error instanceof ApplicationException) throw error
      throw new ApplicationException(
        `Failed to create function model: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async updateFunctionModel(modelId: string, updates: FunctionModelUpdateOptions): Promise<FunctionModel> {
    try {
      // Convert FunctionModelUpdateOptions to Partial<FunctionModel> with proper type casting
      const modelUpdates: Partial<FunctionModel> = {
        ...updates,
        status: updates.status as 'draft' | 'published' | 'archived' | undefined
      }
      
      const model = await this.functionModelRepository.updateFunctionModel(modelId, modelUpdates)
      
      try {
        await this.auditService.logFunctionModelSave(
          modelId,
          'update',
          { updates }
        )
      } catch (auditError) {
        // Log audit failure but don't break the main operation
        console.warn('Audit logging failed:', auditError)
      }

      return model
    } catch (error) {
      if (error instanceof ApplicationException) throw error
      throw new ApplicationException(
        `Failed to update function model: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async deleteFunctionModel(modelId: string): Promise<void> {
    try {
      await this.functionModelRepository.deleteFunctionModel(modelId)
      
      try {
        await this.auditService.logFunctionModelSave(
          modelId,
          'delete',
          {}
        )
      } catch (auditError) {
        // Log audit failure but don't break the main operation
        console.warn('Audit logging failed:', auditError)
      }
    } catch (error) {
      if (error instanceof ApplicationException) throw error
      throw new ApplicationException(
        `Failed to delete function model: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async duplicateFunctionModel(modelId: string, newName: string): Promise<FunctionModel> {
    try {
      const model = await this.functionModelRepository.duplicateFunctionModel(modelId, newName)
      
      try {
        await this.auditService.logFunctionModelSave(
          model.modelId,
          'duplicate',
          { originalModelId: modelId, newName }
        )
      } catch (auditError) {
        // Log audit failure but don't break the main operation
        console.warn('Audit logging failed:', auditError)
      }

      return model
    } catch (error) {
      if (error instanceof ApplicationException) throw error
      throw new ApplicationException(
        `Failed to duplicate function model: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async deleteFunctionModelWithConfirmation(modelId: string): Promise<void> {
    try {
      await this.functionModelRepository.deleteFunctionModel(modelId)
      
      try {
        await this.auditService.logFunctionModelSave(
          modelId,
          'delete_with_confirmation',
          {}
        )
      } catch (auditError) {
        // Log audit failure but don't break the main operation
        console.warn('Audit logging failed:', auditError)
      }
    } catch (error) {
      if (error instanceof ApplicationException) throw error
      throw new ApplicationException(
        `Failed to delete function model with confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_FUNCTION_MODEL_ERROR',
        500
      )
    }
  }

  async duplicateFunctionModelWithName(modelId: string): Promise<FunctionModel> {
    try {
      const originalModel = await this.functionModelRepository.getFunctionModelById(modelId)
      if (!originalModel) {
        throw new ApplicationException('Original function model not found')
      }
      
      const newName = `${originalModel.name} (Copy)`
      const model = await this.functionModelRepository.duplicateFunctionModel(modelId, newName)
      
      try {
        await this.auditService.logFunctionModelSave(
          model.modelId,
          'duplicate_with_name',
          { originalModelId: modelId, newName }
        )
      } catch (auditError) {
        // Log audit failure but don't break the main operation
        console.warn('Audit logging failed:', auditError)
      }

      return model
    } catch (error) {
      if (error instanceof ApplicationException) throw error
      throw new ApplicationException(
        `Failed to duplicate function model with name: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

// Legacy export for backward compatibility (deprecated - use FunctionModelManagementUseCases class instead)
export const getAllFunctionModelsWithNodeStats = async (): Promise<(FunctionModel & { nodeStats: { totalNodes: number; nodesByType: Record<string, number>; totalConnections: number } })[]> => {
  const { getGlobalServiceLocator } = await import('../di/function-model-dependency-container')
  const serviceLocator = getGlobalServiceLocator()
  const useCases = serviceLocator.getFunctionModelManagementUseCases()
  return useCases.getAllFunctionModelsWithNodeStats()
}

export const createFunctionModel = async (options: FunctionModelCreateOptions): Promise<FunctionModel> => {
  const { getGlobalServiceLocator } = await import('../di/function-model-dependency-container')
  const serviceLocator = getGlobalServiceLocator()
  const useCases = serviceLocator.getFunctionModelManagementUseCases()
  return useCases.createFunctionModel(options)
}

export const deleteFunctionModelWithConfirmation = async (modelId: string): Promise<void> => {
  const { getGlobalServiceLocator } = await import('../di/function-model-dependency-container')
  const serviceLocator = getGlobalServiceLocator()
  const useCases = serviceLocator.getFunctionModelManagementUseCases()
  return useCases.deleteFunctionModelWithConfirmation(modelId)
}

export const duplicateFunctionModelWithName = async (modelId: string): Promise<FunctionModel> => {
  const { getGlobalServiceLocator } = await import('../di/function-model-dependency-container')
  const serviceLocator = getGlobalServiceLocator()
  const useCases = serviceLocator.getFunctionModelManagementUseCases()
  return useCases.duplicateFunctionModelWithName(modelId)
}
